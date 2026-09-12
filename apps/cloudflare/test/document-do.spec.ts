import { env, exports } from "cloudflare:workers";
import { abortAllDurableObjects } from "cloudflare:test";
import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import { describe, expect, it } from "vitest";
import * as syncProtocol from "y-protocols/sync";
import * as Y from "yjs";
import { sha256Hex, toArrayBuffer } from "../src/shared";

function makeSnapshot(value: string): Uint8Array {
  const document = new Y.Doc();
  document.getText("content").insert(0, value);
  return Y.encodeStateAsUpdate(document);
}

describe("DocumentDurableObject", () => {
  // Cloudflare's Vitest integration currently cannot drive Durable Object
  // WebSockets with its mandatory per-file storage isolation. Keep this test
  // executable for when that harness limitation is removed; migrate:verify
  // performs the same check with real y-websocket clients today.
  it.skip("converges binary Yjs updates across two WebSocket clients", async () => {
    const connect = async (): Promise<WebSocket> => {
      const response = await exports.default.fetch("http://example.com/ws/websocket-doc", {
        headers: { Upgrade: "websocket" },
      });
      expect(response.status).toBe(101);
      const socket = response.webSocket;
      if (!socket) throw new Error("Worker did not return a WebSocket");
      socket.accept();
      return socket;
    };

    const first = await connect();
    const second = await connect();
    const destination = new Y.Doc();
    const converged = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Yjs clients did not converge")), 2_000);
      second.addEventListener("message", (event) => {
        const bytes = event.data instanceof ArrayBuffer
          ? new Uint8Array(event.data)
          : ArrayBuffer.isView(event.data)
            ? new Uint8Array(event.data.buffer, event.data.byteOffset, event.data.byteLength)
            : null;
        if (!bytes) return;
        const decoder = decoding.createDecoder(bytes);
        if (decoding.readVarUint(decoder) !== 0) return;
        const reply = encoding.createEncoder();
        encoding.writeVarUint(reply, 0);
        syncProtocol.readSyncMessage(decoder, reply, destination, second);
        if (encoding.length(reply) > 1) {
          second.send(toArrayBuffer(encoding.toUint8Array(reply)));
        }
        if (destination.getText("content").toString() === "live update") {
          clearTimeout(timeout);
          resolve();
        }
      });
    });

    const source = new Y.Doc();
    source.getText("content").insert(0, "live update");
    const message = encoding.createEncoder();
    encoding.writeVarUint(message, 0);
    syncProtocol.writeUpdate(message, Y.encodeStateAsUpdate(source));
    try {
      first.send(toArrayBuffer(encoding.toUint8Array(message)));
      await converged;
    } finally {
      first.close(1000, "test complete");
      second.close(1000, "test complete");
      source.destroy();
      destination.destroy();
    }
  }, 10_000);

  it("imports a snapshot idempotently and exposes its state vector", async () => {
    const snapshot = makeSnapshot("hello cloudflare");
    const checksum = await sha256Hex(snapshot);
    const stub = env.DOCUMENTS.getByName("document-a");

    const first = await stub.importSnapshot(toArrayBuffer(snapshot), checksum);
    const second = await stub.importSnapshot(toArrayBuffer(snapshot), checksum);

    expect(first.checksum).toBe(checksum);
    expect(new Uint8Array(second.stateVector)).toEqual(new Uint8Array(first.stateVector));
    expect(second.updateCount).toBe(0);

    await abortAllDurableObjects();
    const restored = await env.DOCUMENTS.getByName("document-a").getMigrationState();
    expect(restored.checksum).toBe(checksum);
    expect(new Uint8Array(restored.stateVector)).toEqual(new Uint8Array(first.stateVector));
  }, 15_000);

  it("isolates documents", async () => {
    const firstSnapshot = makeSnapshot("first");
    const secondSnapshot = makeSnapshot("second");
    const firstChecksum = await sha256Hex(firstSnapshot);
    const secondChecksum = await sha256Hex(secondSnapshot);
    const first = env.DOCUMENTS.getByName("document-first");
    const second = env.DOCUMENTS.getByName("document-second");

    await first.importSnapshot(toArrayBuffer(firstSnapshot), firstChecksum);
    await second.importSnapshot(toArrayBuffer(secondSnapshot), secondChecksum);

    expect((await first.getMigrationState()).checksum).toBe(firstChecksum);
    expect((await second.getMigrationState()).checksum).toBe(secondChecksum);
  });

  it("imports and replays a snapshot represented by update parts", async () => {
    const source = new Y.Doc();
    const parts: Uint8Array[] = [];
    source.on("update", (update: Uint8Array) => parts.push(update));
    source.getText("content").insert(0, "hello");
    source.getText("content").insert(5, " cloudflare");
    const snapshot = Y.encodeStateAsUpdate(source);
    const checksum = await sha256Hex(snapshot);
    const stub = env.DOCUMENTS.getByName("partitioned-document");

    const imported = await stub.importSnapshot(
      toArrayBuffer(snapshot),
      checksum,
      false,
      parts.map(toArrayBuffer),
    );
    expect(imported.checksum).toBe(checksum);
    expect(imported.updateCount).toBe(parts.length);

    await abortAllDurableObjects();
    const restored = await env.DOCUMENTS
      .getByName("partitioned-document")
      .getMigrationState();
    expect(restored.checksum).toBe(checksum);
    source.destroy();
  });
});
