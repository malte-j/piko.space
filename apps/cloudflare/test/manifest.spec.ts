import { describe, expect, it } from "vitest";
import {
  compareRecentFiles,
  normalizeLegacyDocumentName,
  parseSortedSetWithScores,
  partitionYjsUpdates,
} from "../scripts/manifest";

describe("Redis migration manifest helpers", () => {
  it("parses RESP2 sorted-set responses", () => {
    expect(parseSortedSetWithScores(["document-a", "1700000000", "document-b", "1700000001"]))
      .toEqual([
        { member: "document-a", score: 1700000000 },
        { member: "document-b", score: 1700000001 },
      ]);
  });

  it("parses RESP3 sorted-set responses", () => {
    expect(parseSortedSetWithScores([
      ["document-a", 1700000000],
      ["document-b", "1700000001"],
    ])).toEqual([
      { member: "document-a", score: 1700000000 },
      { member: "document-b", score: 1700000001 },
    ]);
  });

  it("normalizes the legacy WebSocket pathname stored in Redis", () => {
    expect(normalizeLegacyDocumentName("ws/document-a")).toBe("document-a");
    expect(normalizeLegacyDocumentName("document-a")).toBe("document-a");
  });

  it("partitions updates below a storage-row byte limit", () => {
    const updates = [new Uint8Array(30), new Uint8Array(30), new Uint8Array(20)];
    const merge = (values: Uint8Array[]) => new Uint8Array(
      values.reduce((total, value) => total + value.byteLength, 0),
    );
    expect(partitionYjsUpdates(updates, merge, 50).map((part) => part.byteLength))
      .toEqual([30, 50]);
  });

  it("sorts recent files using SQLite-compatible binary ordering", () => {
    const rows = [
      { userId: "a-user", fileId: "b", lastEdited: 1 },
      { userId: "A-user", fileId: "a", lastEdited: 1 },
      { userId: "A-user", fileId: "b", lastEdited: 2 },
    ];
    expect(rows.sort(compareRecentFiles)).toEqual([
      { userId: "A-user", fileId: "b", lastEdited: 2 },
      { userId: "A-user", fileId: "a", lastEdited: 1 },
      { userId: "a-user", fileId: "b", lastEdited: 1 },
    ]);
  });
});
