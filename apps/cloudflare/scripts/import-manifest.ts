import { readFile } from "node:fs/promises";
import { chunk, expectJson, migrationHeaders, type MigrationManifest } from "./manifest";

const manifestPath = process.argv[2];
const baseUrl = process.argv[3]?.replace(/\/$/, "");
const token = process.env.MIGRATION_TOKEN;
const force = process.argv.includes("--force");
const metadataOnly = process.argv.includes("--metadata-only");
if (!manifestPath || !baseUrl || !token) {
  throw new Error(
    "Usage: MIGRATION_TOKEN=... pnpm migrate:import <manifest.json> <worker-url> [--force] [--metadata-only]",
  );
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as MigrationManifest;
if (manifest.version !== 1 || manifest.source !== "redis") throw new Error("Unsupported manifest");

for (const [index, document] of (metadataOnly ? [] : manifest.documents).entries()) {
  const response = await fetch(`${baseUrl}/api/migration/documents/${encodeURIComponent(document.fileId)}`, {
    method: "POST",
    headers: migrationHeaders(token),
    body: JSON.stringify({
      state: document.state,
      stateParts: document.stateParts,
      checksum: document.checksum,
      force,
    }),
  });
  const result = await expectJson<{ checksum: string; stateVector: string }>(response);
  if (result.checksum !== document.checksum || result.stateVector !== document.stateVector) {
    throw new Error(
      `Document verification failed during import: ${document.fileId} ` +
      `(checksum ${result.checksum === document.checksum ? "matches" : "differs"}, ` +
      `state vector ${result.stateVector === document.stateVector ? "matches" : "differs"})`,
    );
  }
  console.log(JSON.stringify({ message: "document imported", current: index + 1, total: manifest.documents.length, fileId: document.fileId }));
}

const documentBatches = chunk(manifest.documents, 100);
for (const documents of documentBatches) {
  const response = await fetch(`${baseUrl}/api/migration/metadata`, {
    method: "POST",
    headers: migrationHeaders(token),
    body: JSON.stringify({
      documents: documents.map((document) => ({
        fileId: document.fileId,
        title: document.title,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      })),
      recentFiles: [],
    }),
  });
  await expectJson(response);
}

const recentBatches = chunk(manifest.recentFiles, 100);
for (const recentFiles of recentBatches) {
  const response = await fetch(`${baseUrl}/api/migration/metadata`, {
    method: "POST",
    headers: migrationHeaders(token),
    body: JSON.stringify({ documents: [], recentFiles }),
  });
  await expectJson(response);
}
console.log(JSON.stringify({ message: "migration import complete", ...manifest.counts }));
