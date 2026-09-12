import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";
import {
  compareRecentFiles,
  expectJson,
  migrationHeaders,
  type MigrationManifest,
  type MigrationRecentFile,
} from "./manifest";

const manifestPath = process.argv[2];
const baseUrl = process.argv[3]?.replace(/\/$/, "");
const token = process.env.MIGRATION_TOKEN;
if (!manifestPath || !baseUrl || !token) {
  throw new Error("Usage: MIGRATION_TOKEN=... pnpm migrate:verify <manifest.json> <worker-url>");
}
const targetBaseUrl = baseUrl;
const migrationToken = token;

const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as MigrationManifest;

async function verifyThroughWebSocket(document: MigrationManifest["documents"][number]): Promise<void> {
  const websocketUrl = new URL(targetBaseUrl);
  websocketUrl.protocol = websocketUrl.protocol === "https:" ? "wss:" : "ws:";
  websocketUrl.pathname = "/ws";
  const yDocument = new Y.Doc();
  const provider = new WebsocketProvider(
    websocketUrl.toString().replace(/\/$/, ""),
    document.fileId,
    yDocument,
    { WebSocketPolyfill: globalThis.WebSocket },
  );
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error(`WebSocket sync timed out: ${document.fileId}`)),
        15_000,
      );
      provider.on("sync", (synced: boolean) => {
        if (!synced) return;
        clearTimeout(timeout);
        resolve();
      });
      provider.on("connection-error", (error: unknown) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
    const state = Y.encodeStateAsUpdate(yDocument);
    const checksum = createHash("sha256").update(state).digest("hex");
    const stateVector = Buffer.from(Y.encodeStateVector(yDocument)).toString("base64");
    if (checksum !== document.checksum || stateVector !== document.stateVector) {
      throw new Error(`Real y-websocket verification failed: ${document.fileId}`);
    }
  } finally {
    provider.destroy();
    yDocument.destroy();
  }
}

async function fetchPages<T>(path: string): Promise<T[]> {
  const rows: T[] = [];
  let offset: number | null = 0;
  while (offset !== null) {
    const page: { rows: T[]; nextOffset: number | null } = await expectJson(await fetch(
      `${targetBaseUrl}${path}?limit=500&offset=${offset}`,
      { headers: migrationHeaders(migrationToken) },
    ));
    rows.push(...page.rows);
    offset = page.nextOffset;
  }
  return rows;
}

const summary = await expectJson<MigrationManifest["counts"]>(await fetch(
  `${baseUrl}/api/migration/summary`,
  { headers: migrationHeaders(token) },
));
for (const key of Object.keys(manifest.counts) as Array<keyof MigrationManifest["counts"]>) {
  if (summary[key] !== manifest.counts[key]) {
    throw new Error(`Count mismatch for ${key}: expected ${manifest.counts[key]}, got ${summary[key]}`);
  }
}

for (const [index, document] of manifest.documents.entries()) {
  const state = await expectJson<{ checksum: string; stateVector: string }>(await fetch(
    `${baseUrl}/api/migration/documents/${encodeURIComponent(document.fileId)}`,
    { headers: migrationHeaders(token) },
  ));
  if (state.checksum !== document.checksum || state.stateVector !== document.stateVector) {
    throw new Error(`Document verification failed: ${document.fileId}`);
  }
  if ((index + 1) % 100 === 0 || index + 1 === manifest.documents.length) {
    console.log(JSON.stringify({ message: "documents verified", current: index + 1, total: manifest.documents.length }));
  }
}

const destinationDocuments = await fetchPages<{
  fileId: string;
  title: string | null;
  createdAt: number;
  updatedAt: number;
}>("/api/migration/document-metadata");
const expectedDocuments = manifest.documents.map(({ fileId, title, createdAt, updatedAt }) => ({
  fileId,
  title,
  createdAt,
  updatedAt,
}));
if (JSON.stringify(destinationDocuments) !== JSON.stringify(expectedDocuments)) {
  throw new Error("Document metadata, titles, or timestamps differ from the Redis manifest");
}

const destinationRecentFiles = await fetchPages<MigrationRecentFile>(
  "/api/migration/recent-files",
);
const expectedRecentFiles = [...manifest.recentFiles].sort(compareRecentFiles);
destinationRecentFiles.sort(compareRecentFiles);
if (JSON.stringify(destinationRecentFiles) !== JSON.stringify(expectedRecentFiles)) {
  const mismatchIndex = expectedRecentFiles.findIndex((expected, index) =>
    JSON.stringify(expected) !== JSON.stringify(destinationRecentFiles[index])
  );
  throw new Error(
    "Recent-file users, ordering, or timestamps differ from the Redis manifest at " +
    `index ${mismatchIndex}: expected ${JSON.stringify(expectedRecentFiles[mismatchIndex])}, ` +
    `received ${JSON.stringify(destinationRecentFiles[mismatchIndex])}`,
  );
}

for (const document of manifest.documents.slice(0, 5)) {
  await verifyThroughWebSocket(document);
}

console.log(JSON.stringify({ message: "migration verification complete", ...summary }));
