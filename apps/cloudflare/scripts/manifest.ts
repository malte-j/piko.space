export interface MigrationDocument {
  fileId: string;
  title: string | null;
  createdAt: number;
  updatedAt: number;
  state: string;
  stateParts?: string[];
  stateVector: string;
  checksum: string;
}

export interface MigrationRecentFile {
  userId: string;
  fileId: string;
  lastEdited: number;
}

function compareBinary(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function compareRecentFiles(
  left: MigrationRecentFile,
  right: MigrationRecentFile,
): number {
  return compareBinary(left.userId, right.userId) ||
    right.lastEdited - left.lastEdited ||
    compareBinary(left.fileId, right.fileId);
}

export interface MigrationManifest {
  version: 1;
  exportedAt: string;
  source: "redis";
  documents: MigrationDocument[];
  recentFiles: MigrationRecentFile[];
  excludedDocuments?: Array<{
    idChecksum: string;
    length: number;
    hadUpdates: boolean;
    hadTitle: boolean;
    recentUserCount: number;
    reason: "incompatible_document_id";
  }>;
  counts: {
    documents: number;
    titledDocuments: number;
    recentFiles: number;
    users: number;
  };
}

export interface SortedSetEntry {
  member: string;
  score: number;
}

function redisString(value: unknown, label: string): string {
  if (typeof value === "string") return value;
  if (value instanceof Uint8Array) return new TextDecoder().decode(value);
  throw new Error(`Invalid Redis ${label} value`);
}

function sortedSetEntry(memberValue: unknown, scoreValue: unknown): SortedSetEntry {
  const member = redisString(memberValue, "sorted-set member");
  const scoreText = typeof scoreValue === "number"
    ? String(scoreValue)
    : redisString(scoreValue, "sorted-set score");
  const score = Number(scoreText);
  if (!Number.isFinite(score)) {
    throw new Error(`Invalid Redis sorted-set score for ${member}`);
  }
  return { member, score };
}

export function parseSortedSetWithScores(reply: unknown): SortedSetEntry[] {
  if (!Array.isArray(reply)) throw new Error("Invalid Redis sorted-set response");
  if (reply.length === 0) return [];

  if (Array.isArray(reply[0])) {
    return reply.map((value) => {
      if (!Array.isArray(value) || value.length !== 2) {
        throw new Error("Invalid Redis RESP3 sorted-set entry");
      }
      return sortedSetEntry(value[0], value[1]);
    });
  }

  if (reply.length % 2 !== 0) {
    throw new Error("Invalid Redis RESP2 sorted-set response");
  }
  const entries: SortedSetEntry[] = [];
  for (let index = 0; index < reply.length; index += 2) {
    entries.push(sortedSetEntry(reply[index], reply[index + 1]));
  }
  return entries;
}

export function normalizeLegacyDocumentName(documentName: string): string {
  return documentName.startsWith("ws/") ? documentName.slice("ws/".length) : documentName;
}

export function partitionYjsUpdates(
  updates: Uint8Array[],
  merge: (updates: Uint8Array[]) => Uint8Array,
  maximumBytes = 1_000_000,
): Uint8Array[] {
  const parts: Uint8Array[] = [];
  let pending: Uint8Array[] = [];
  for (const update of updates) {
    if (update.byteLength > maximumBytes) {
      throw new Error(`A single Yjs update exceeds ${maximumBytes} bytes`);
    }
    const candidate = merge([...pending, update]);
    if (candidate.byteLength > maximumBytes && pending.length > 0) {
      parts.push(merge(pending));
      pending = [update];
    } else {
      pending.push(update);
    }
  }
  if (pending.length > 0) parts.push(merge(pending));
  return parts;
}

export function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export function migrationHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function expectJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);
  }
  return response.json() as Promise<T>;
}
