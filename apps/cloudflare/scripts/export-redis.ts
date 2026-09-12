import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import Redis from "ioredis";
import * as Y from "yjs";
import {
  compareRecentFiles,
  normalizeLegacyDocumentName,
  partitionYjsUpdates,
  parseSortedSetWithScores,
  type MigrationManifest,
  type MigrationRecentFile,
} from "./manifest";

const DOCUMENT_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const APPROVED_EXCLUDED_ID_CHECKSUMS = new Set([
  "7196edd037316ff266ae71f3360cc5111c69761890286aeee67a99a23fdef4d0",
  "5ff526f63ce9304b249584fe93726a0fffaec72e70ff0c7a599fcdf2a3aa0f61",
]);
const outputPath = process.argv[2] ?? "migration-manifest.json";
const excludeKnownInvalid = process.argv.includes("--exclude-known-invalid");

const redis = new Redis({
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT ?? "6379"),
  password: process.env.REDIS_PW || undefined,
  family: Number(process.env.REDIS_FAMILY ?? "0"),
  lazyConnect: true,
});

async function scan(pattern: string): Promise<string[]> {
  const keys: string[] = [];
  let cursor = "0";
  do {
    const [nextCursor, page] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 500);
    cursor = nextCursor;
    keys.push(...page);
  } while (cursor !== "0");
  return keys.sort();
}

function sha256(value: Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function isUpstashRequestSizeError(error: unknown): boolean {
  return String(error).toLowerCase().includes("max request size exceeded");
}

async function applyUpdateRange(
  updateKey: string,
  start: number,
  end: number,
  document: Y.Doc,
  collected: Uint8Array[],
): Promise<void> {
  try {
    const updates = await redis.lrangeBuffer(updateKey, start, end);
    for (const update of updates) {
      Y.applyUpdate(document, update);
      collected.push(update);
    }
  } catch (error) {
    if (!isUpstashRequestSizeError(error)) throw error;
    if (start === end) {
      throw new Error(
        `A single Redis update exceeds the Upstash response limit: ${updateKey} at index ${start}`,
        { cause: error },
      );
    }
    const middle = Math.floor((start + end) / 2);
    await applyUpdateRange(updateKey, start, middle, document, collected);
    await applyUpdateRange(updateKey, middle + 1, end, document, collected);
  }
}

async function applyStoredUpdates(updateKey: string, document: Y.Doc): Promise<Uint8Array[]> {
  const length = await redis.llen(updateKey);
  const pageSize = 128;
  const collected: Uint8Array[] = [];
  for (let start = 0; start < length; start += pageSize) {
    await applyUpdateRange(
      updateKey,
      start,
      Math.min(start + pageSize - 1, length - 1),
      document,
      collected,
    );
  }
  return collected;
}

async function main(): Promise<void> {
  await redis.connect();
  const [updateKeys, recentKeys, titles] = await Promise.all([
    scan("file:*:updates"),
    scan("user:*:recent_files"),
    redis.hgetall("filenames"),
  ]);

  const updateKeysByFile = new Map<string, string[]>();
  for (const key of updateKeys) {
    const storedName = key.slice("file:".length, -":updates".length);
    const fileId = normalizeLegacyDocumentName(storedName);
    const keys = updateKeysByFile.get(fileId) ?? [];
    keys.push(key);
    updateKeysByFile.set(fileId, keys);
  }

  const recentFiles: MigrationRecentFile[] = [];
  const latestEditByFile = new Map<string, number>();
  for (const key of recentKeys) {
    const userId = key.slice("user:".length, -":recent_files".length);
    const values = parseSortedSetWithScores(
      await redis.call("ZRANGE", key, "0", "-1", "WITHSCORES"),
    );
    for (const value of values) {
      const recent = {
        userId,
        fileId: value.member,
        lastEdited: Math.floor(value.score),
      };
      recentFiles.push(recent);
      latestEditByFile.set(
        recent.fileId,
        Math.max(latestEditByFile.get(recent.fileId) ?? 0, recent.lastEdited),
      );
    }
  }

  const fileIds = new Set([
    ...updateKeysByFile.keys(),
    ...Object.keys(titles),
    ...recentFiles.map((recent) => recent.fileId),
  ]);
  const invalidIds = [...fileIds].filter((fileId) => !DOCUMENT_ID_PATTERN.test(fileId)).sort();
  const invalidDocuments = invalidIds.map((fileId) => ({
    fileId,
    idChecksum: sha256(new TextEncoder().encode(fileId)),
    length: fileId.length,
    hasUpdates: updateKeysByFile.has(fileId),
    hasTitle: Object.prototype.hasOwnProperty.call(titles, fileId),
    recentUsers: recentFiles
      .filter((recent) => recent.fileId === fileId)
      .map((recent) => recent.userId)
      .sort(),
  }));
  if (invalidIds.length > 0) {
    const unapproved = invalidDocuments.filter(
      (document) => !APPROVED_EXCLUDED_ID_CHECKSUMS.has(document.idChecksum),
    );
    if (!excludeKnownInvalid || unapproved.length > 0) {
      console.error(JSON.stringify({
        error: "incompatible_document_ids",
        documents: invalidDocuments,
      }, null, 2));
      throw new Error(
        `${invalidIds.length} incompatible document ID(s) must be remapped or excluded before export`,
      );
    }
    console.warn(JSON.stringify({
      message: "excluding reviewed incompatible document IDs",
      documents: invalidDocuments.map((document) => ({
        idChecksum: document.idChecksum,
        length: document.length,
        hadUpdates: document.hasUpdates,
        hadTitle: document.hasTitle,
        recentUserCount: document.recentUsers.length,
      })),
    }));
  }

  const documents = [];
  const excludedIds = new Set(invalidIds);
  for (const fileId of [...fileIds].filter((value) => !excludedIds.has(value)).sort()) {
    const document = new Y.Doc();
    const sourceUpdates: Uint8Array[] = [];
    for (const updateKey of updateKeysByFile.get(fileId) ?? []) {
      sourceUpdates.push(...await applyStoredUpdates(updateKey, document));
    }
    const initialState = Y.encodeStateAsUpdate(document);
    const canonicalDocument = new Y.Doc();
    Y.applyUpdate(canonicalDocument, initialState);
    const state = Y.encodeStateAsUpdate(canonicalDocument);
    const stateVector = Y.encodeStateVector(canonicalDocument);
    const updatedAt = latestEditByFile.get(fileId) ?? 0;
    documents.push({
      fileId,
      title: titles[fileId] ?? null,
      createdAt: 0,
      updatedAt,
      state: Buffer.from(state).toString("base64"),
      stateParts: state.byteLength >= 1_900_000
        ? partitionYjsUpdates(sourceUpdates, Y.mergeUpdates)
          .map((part) => Buffer.from(part).toString("base64"))
        : undefined,
      stateVector: Buffer.from(stateVector).toString("base64"),
      checksum: sha256(state),
    });
    canonicalDocument.destroy();
    document.destroy();
  }

  const exportedRecentFiles = recentFiles.filter((recent) => !excludedIds.has(recent.fileId));
  exportedRecentFiles.sort(compareRecentFiles);
  const manifest: MigrationManifest = {
    version: 1,
    exportedAt: new Date().toISOString(),
    source: "redis",
    documents,
    recentFiles: exportedRecentFiles,
    excludedDocuments: invalidDocuments.map((document) => ({
      idChecksum: document.idChecksum,
      length: document.length,
      hadUpdates: document.hasUpdates,
      hadTitle: document.hasTitle,
      recentUserCount: document.recentUsers.length,
      reason: "incompatible_document_id" as const,
    })),
    counts: {
      documents: documents.length,
      titledDocuments: documents.filter((document) => document.title !== null).length,
      recentFiles: exportedRecentFiles.length,
      users: new Set(exportedRecentFiles.map((recent) => recent.userId)).size,
    },
  };
  await writeFile(outputPath, `${JSON.stringify(manifest)}\n`, { flag: "wx" });
  console.log(JSON.stringify({ message: "migration manifest exported", outputPath, ...manifest.counts }));
}

try {
  await main();
} finally {
  await redis.quit();
}
