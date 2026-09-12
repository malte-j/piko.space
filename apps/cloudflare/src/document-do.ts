import { DurableObject } from "cloudflare:workers";
import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import * as awarenessProtocol from "y-protocols/awareness";
import * as syncProtocol from "y-protocols/sync";
import * as Y from "yjs";
import {
  COMPACT_AFTER_BYTES,
  COMPACT_AFTER_UPDATES,
  MAX_AWARENESS_ATTACHMENT_BYTES,
  MAX_SQLITE_BLOB_BYTES,
  MAX_WEBSOCKET_MESSAGE_BYTES,
  sha256Hex,
  toArrayBuffer,
} from "./shared";

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

interface ConnectionAttachment {
  controlledIds: number[];
  awarenessUpdate?: ArrayBuffer;
}

interface SnapshotRow {
  [key: string]: ArrayBuffer | string | number | null;
  state: ArrayBuffer;
  last_update_seq: number;
}

interface UpdateRow {
  [key: string]: ArrayBuffer | string | number | null;
  seq: number;
  update_blob: ArrayBuffer;
}

interface UpdateStats {
  [key: string]: ArrayBuffer | string | number | null;
  update_count: number;
  update_bytes: number;
}

export interface MigrationState {
  checksum: string;
  stateVector: ArrayBuffer;
  updateCount: number;
  updateBytes: number;
}

export class DocumentDurableObject extends DurableObject<Env> {
  private document = new Y.Doc();
  private awareness = new awarenessProtocol.Awareness(this.document);
  private restoring = true;
  private updateCount = 0;
  private updateBytes = 0;
  private snapshotTooLarge = false;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.initializeStorage();
      this.restoreDocument();
      this.installDocumentListeners();
      this.restoreAwareness();
      this.restoring = false;
    });
  }

  private initializeStorage(): void {
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS _sql_schema_migrations (
        id INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS document_snapshot (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        state BLOB NOT NULL,
        last_update_seq INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS document_updates (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        "update" BLOB NOT NULL,
        created_at INTEGER NOT NULL
      );
      INSERT OR IGNORE INTO _sql_schema_migrations(id) VALUES (1);
    `);
  }

  private restoreDocument(): void {
    const snapshot = this.ctx.storage.sql
      .exec<SnapshotRow>(
        "SELECT state, last_update_seq FROM document_snapshot WHERE id = 1",
      )
      .toArray()[0];
    if (snapshot) {
      Y.applyUpdate(this.document, new Uint8Array(snapshot.state));
    }

    const after = snapshot?.last_update_seq ?? 0;
    const updates = this.ctx.storage.sql
      .exec<UpdateRow>(
        `SELECT seq, "update" AS update_blob
         FROM document_updates WHERE seq > ? ORDER BY seq`,
        after,
      )
      .toArray();
    for (const row of updates) {
      Y.applyUpdate(this.document, new Uint8Array(row.update_blob));
    }

    const stats = this.ctx.storage.sql
      .exec<UpdateStats>(
        `SELECT COUNT(*) AS update_count, COALESCE(SUM(length("update")), 0) AS update_bytes
         FROM document_updates WHERE seq > ?`,
        after,
      )
      .one();
    this.updateCount = stats.update_count;
    this.updateBytes = stats.update_bytes;
    this.snapshotTooLarge = Y.encodeStateAsUpdate(this.document).byteLength >= MAX_SQLITE_BLOB_BYTES;
  }

  private installDocumentListeners(): void {
    this.document.on("update", this.onDocumentUpdate);
    this.awareness.on("update", this.onAwarenessUpdate);
  }

  private removeDocumentListeners(): void {
    this.document.off("update", this.onDocumentUpdate);
    this.awareness.off("update", this.onAwarenessUpdate);
  }

  private restoreAwareness(): void {
    for (const socket of this.ctx.getWebSockets()) {
      const attachment = this.getAttachment(socket);
      if (attachment.awarenessUpdate) {
        awarenessProtocol.applyAwarenessUpdate(
          this.awareness,
          new Uint8Array(attachment.awarenessUpdate),
          socket,
        );
      }
    }
  }

  private recoverPersistedDocument(): void {
    this.removeDocumentListeners();
    this.document.destroy();
    this.document = new Y.Doc();
    this.awareness = new awarenessProtocol.Awareness(this.document);
    this.restoring = true;
    this.restoreDocument();
    this.installDocumentListeners();
    this.restoreAwareness();
    this.restoring = false;
  }

  private readonly onDocumentUpdate = (update: Uint8Array): void => {
    if (this.restoring) return;
    this.ctx.storage.sql.exec(
      `INSERT INTO document_updates("update", created_at) VALUES (?, ?)`,
      toArrayBuffer(update),
      Date.now(),
    );
    this.updateCount += 1;
    this.updateBytes += update.byteLength;

    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeUpdate(encoder, update);
    this.broadcast(encoding.toUint8Array(encoder));

    if (!this.snapshotTooLarge && (
      this.updateCount >= COMPACT_AFTER_UPDATES ||
      this.updateBytes >= COMPACT_AFTER_BYTES
    )) {
      this.compact();
    }
  };

  private readonly onAwarenessUpdate = (
    changes: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown,
  ): void => {
    if (this.restoring) return;
    const changedClients = [
      ...changes.added,
      ...changes.updated,
      ...changes.removed,
    ];

    if (this.isSocket(origin)) {
      const attachment = this.getAttachment(origin);
      const controlledIds = new Set(attachment.controlledIds);
      for (const id of changes.added) controlledIds.add(id);
      for (const id of changes.updated) controlledIds.add(id);
      for (const id of changes.removed) controlledIds.delete(id);
      const ids = [...controlledIds];
      const currentUpdate = ids.length
        ? awarenessProtocol.encodeAwarenessUpdate(this.awareness, ids)
        : undefined;
      if (currentUpdate && currentUpdate.byteLength > MAX_AWARENESS_ATTACHMENT_BYTES) {
        origin.close(1009, "Awareness state is too large");
        return;
      }
      origin.serializeAttachment({
        controlledIds: ids,
        awarenessUpdate: currentUpdate
          ? toArrayBuffer(currentUpdate)
          : undefined,
      } satisfies ConnectionAttachment);
    }

    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients),
    );
    this.broadcast(encoding.toUint8Array(encoder));
  };

  private isSocket(value: unknown): value is WebSocket {
    return typeof value === "object" && value !== null && "send" in value;
  }

  private getAttachment(socket: WebSocket): ConnectionAttachment {
    const value = socket.deserializeAttachment() as ConnectionAttachment | null;
    return value ?? { controlledIds: [] };
  }

  private broadcast(message: Uint8Array): void {
    const payload = toArrayBuffer(message);
    for (const socket of this.ctx.getWebSockets()) {
      try {
        socket.send(payload);
      } catch (error) {
        console.error(JSON.stringify({ message: "websocket broadcast failed", error: String(error) }));
      }
    }
  }

  private compact(): void {
    const lastRow = this.ctx.storage.sql
      .exec<{ seq: number | null }>("SELECT MAX(seq) AS seq FROM document_updates")
      .one();
    if (lastRow.seq === null) return;
    const snapshot = Y.encodeStateAsUpdate(this.document);
    if (snapshot.byteLength >= MAX_SQLITE_BLOB_BYTES) {
      this.snapshotTooLarge = true;
      return;
    }
    this.ctx.storage.transactionSync(() => {
      this.ctx.storage.sql.exec(
        `INSERT INTO document_snapshot(id, state, last_update_seq, updated_at)
         VALUES (1, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           state = excluded.state,
           last_update_seq = excluded.last_update_seq,
           updated_at = excluded.updated_at`,
        toArrayBuffer(snapshot),
        lastRow.seq,
        Date.now(),
      );
      this.ctx.storage.sql.exec(
        "DELETE FROM document_updates WHERE seq <= ?",
        lastRow.seq,
      );
    });
    this.updateCount = 0;
    this.updateBytes = 0;
  }

  async fetch(request: Request): Promise<Response> {
    if (request.method !== "GET") {
      return Response.json({ error: "method_not_allowed" }, { status: 405 });
    }
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return Response.json({ error: "websocket_upgrade_required" }, { status: 426 });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ controlledIds: [] } satisfies ConnectionAttachment);

    const syncEncoder = encoding.createEncoder();
    encoding.writeVarUint(syncEncoder, MESSAGE_SYNC);
    syncProtocol.writeSyncStep1(syncEncoder, this.document);
    server.send(toArrayBuffer(encoding.toUint8Array(syncEncoder)));

    const states = [...this.awareness.getStates().keys()];
    if (states.length > 0) {
      const awarenessEncoder = encoding.createEncoder();
      encoding.writeVarUint(awarenessEncoder, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(
        awarenessEncoder,
        awarenessProtocol.encodeAwarenessUpdate(this.awareness, states),
      );
      server.send(toArrayBuffer(encoding.toUint8Array(awarenessEncoder)));
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(socket: WebSocket, message: string | ArrayBuffer): void {
    if (typeof message === "string") {
      socket.close(1003, "Binary messages are required");
      return;
    }
    if (message.byteLength > MAX_WEBSOCKET_MESSAGE_BYTES) {
      socket.close(1009, "Message is too large");
      return;
    }

    try {
      const decoder = decoding.createDecoder(new Uint8Array(message));
      const messageType = decoding.readVarUint(decoder);
      if (messageType === MESSAGE_SYNC) {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MESSAGE_SYNC);
        syncProtocol.readSyncMessage(decoder, encoder, this.document, socket);
        if (encoding.length(encoder) > 1) {
          socket.send(toArrayBuffer(encoding.toUint8Array(encoder)));
        }
        return;
      }
      if (messageType === MESSAGE_AWARENESS) {
        awarenessProtocol.applyAwarenessUpdate(
          this.awareness,
          decoding.readVarUint8Array(decoder),
          socket,
        );
        return;
      }
      socket.close(1003, "Unsupported Yjs message type");
    } catch (error) {
      console.error(JSON.stringify({ message: "websocket message failed", error: String(error) }));
      try {
        this.recoverPersistedDocument();
      } catch (recoveryError) {
        console.error(JSON.stringify({
          message: "persisted document recovery failed",
          error: String(recoveryError),
        }));
      }
      socket.close(1011, "Unable to process document update");
    }
  }

  webSocketClose(socket: WebSocket, code: number, reason: string): void {
    this.removeSocketAwareness(socket);
    socket.close(code, reason);
  }

  webSocketError(socket: WebSocket, error: unknown): void {
    console.error(JSON.stringify({ message: "websocket error", error: String(error) }));
    this.removeSocketAwareness(socket);
    socket.close(1011, "WebSocket error");
  }

  private removeSocketAwareness(socket: WebSocket): void {
    const attachment = this.getAttachment(socket);
    if (attachment.controlledIds.length > 0) {
      awarenessProtocol.removeAwarenessStates(
        this.awareness,
        attachment.controlledIds,
        null,
      );
    }
  }

  async importSnapshot(
    state: ArrayBuffer,
    expectedChecksum: string,
    force = false,
    stateParts: ArrayBuffer[] = [],
  ): Promise<MigrationState> {
    if (this.ctx.getWebSockets().length > 0) {
      throw new Error("Cannot import while document clients are connected");
    }
    const bytes = new Uint8Array(state);
    const actualChecksum = await sha256Hex(bytes);
    if (actualChecksum !== expectedChecksum) {
      throw new Error("Snapshot checksum does not match payload");
    }
    const current = await this.getMigrationState();
    if (current.checksum === expectedChecksum) return current;
    const existing = this.ctx.storage.sql.exec<{ present: number }>(
      `SELECT (
        EXISTS(SELECT 1 FROM document_snapshot WHERE id = 1)
        OR EXISTS(SELECT 1 FROM document_updates LIMIT 1)
      ) AS present`,
    ).one();
    if (existing.present && !force) {
      throw new Error("Document already contains a different snapshot");
    }

    const nextDocument = new Y.Doc();
    Y.applyUpdate(nextDocument, bytes);
    if (stateParts.length > 0) {
      const reconstructed = new Y.Doc();
      for (const part of stateParts) Y.applyUpdate(reconstructed, new Uint8Array(part));
      const reconstructedChecksum = await sha256Hex(Y.encodeStateAsUpdate(reconstructed));
      reconstructed.destroy();
      if (reconstructedChecksum !== expectedChecksum) {
        nextDocument.destroy();
        throw new Error("Snapshot parts checksum does not match payload");
      }
    }
    const emptyDocument = new Y.Doc();
    const persistedSnapshot = stateParts.length > 0
      ? Y.encodeStateAsUpdate(emptyDocument)
      : bytes;
    emptyDocument.destroy();
    this.ctx.storage.transactionSync(() => {
      this.ctx.storage.sql.exec("DELETE FROM document_updates");
      this.ctx.storage.sql.exec(
        `INSERT INTO document_snapshot(id, state, last_update_seq, updated_at)
         VALUES (1, ?, 0, ?)
         ON CONFLICT(id) DO UPDATE SET state = excluded.state, last_update_seq = 0,
           updated_at = excluded.updated_at`,
        toArrayBuffer(persistedSnapshot),
        Date.now(),
      );
      for (const part of stateParts) {
        this.ctx.storage.sql.exec(
          `INSERT INTO document_updates("update", created_at) VALUES (?, ?)`,
          part,
          Date.now(),
        );
      }
    });

    this.removeDocumentListeners();
    this.document.destroy();
    this.document = nextDocument;
    this.awareness = new awarenessProtocol.Awareness(this.document);
    this.installDocumentListeners();
    this.updateCount = stateParts.length;
    this.updateBytes = stateParts.reduce((total, part) => total + part.byteLength, 0);
    this.snapshotTooLarge = bytes.byteLength >= MAX_SQLITE_BLOB_BYTES;
    return this.getMigrationState();
  }

  async getMigrationState(): Promise<MigrationState> {
    const snapshot = Y.encodeStateAsUpdate(this.document);
    const checksum = await sha256Hex(snapshot);
    return {
      checksum,
      stateVector: toArrayBuffer(Y.encodeStateVector(this.document)),
      updateCount: this.updateCount,
      updateBytes: this.updateBytes,
    };
  }
}
