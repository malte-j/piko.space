import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import { mutex, map, logging } from "lib0";
import { debounce } from "lodash";
import { callbackHandler, isCallbackSet } from "./callback";
import * as http from "http";
import * as WebSocket from "ws";
import { RedisPersistence } from "./RedisPersistence";
import CONFIG from "../config";

const logger = logging.createModuleLogger("y-server");

// ###############
// # PERSISTENCE #
// ###############

let persistence: {
  bindState: (docName: string, ydoc: WSSharedDoc) => void;
  writeState: (docName: string, ydoc: WSSharedDoc) => Promise<any>;
  provider: RedisPersistence;
} | null = null;

if (CONFIG.redisUrl) {
  logger(CONFIG.redisUrl);
  // console.info('Persisting documents to "' + persistenceDir + '"');
  // @ts-ignore
  // const LeveldbPersistence = require("y-leveldb").LeveldbPersistence;
  // const ldb = new LeveldbPersistence(persistenceDir);

  const redisPersistence = new RedisPersistence({
    redisOpts: CONFIG.redisUrl,
  });
  persistence = {
    provider: redisPersistence,
    bindState: async (docName, ydoc) => {
      const persistedYdoc = await redisPersistence.bindState(docName, ydoc);

      // const persistedYdoc = await ldb.getYDoc(docName);
      // const newUpdates = Y.encodeStateAsUpdate(ydoc);
      // ldb.storeUpdate(docName, newUpdates);

      // TODO: check if this is needed
      Y.applyUpdate(ydoc, Y.encodeStateAsUpdate(persistedYdoc.doc));

      // ydoc.on("update", (update) => {
      //   ldb.storeUpdate(docName, update);
      // });
    },
    writeState: async (docName, ydoc) => {},
  };
}

// let rPersistence = new RedisPersistence();

// persistence = {
//   provider: rPersistence,
//   bindState: rPersistence.bindState,
//   writeState: async (docName, ydoc) => {},
// };
// TODO: does this need to be exported?
// export const setPersistence = (persistence_: typeof persistence) => {
//   persistence = persistence_;
// };

// TODO: remove bind state from export?
/**
 * @return {null|{bindState: function(string,WSSharedDoc):void,
 * writeState:function(string,WSSharedDoc):Promise<any>}|null} used persistence layer
 */
export const getPersistence = () => persistence;

// exporting docs so that others can use it
export const docs = new Map<string, WSSharedDoc>();

const messageSync = 0;
const messageAwareness = 1;
// const messageAuth = 2

export class WSSharedDoc extends Y.Doc {
  name: string;
  mux: mutex.mutex;
  conns: Map<WebSocket, Set<number>>;
  awareness: awarenessProtocol.Awareness;

  constructor(name: string) {
    super({ gc: CONFIG.gcEnabled });
    this.name = name;
    this.mux = mutex.createMutex();
    /**
     * Maps from conn to set of controlled user ids. Delete all user ids from awareness when this conn is closed
     */
    this.conns = new Map();

    this.awareness = new awarenessProtocol.Awareness(this);
    this.awareness.setLocalState(null);
    this.awareness.on("update", this.awarenessChangeHandler.bind(this));
    this.on("update", this.updateHandler.bind(this));
    if (isCallbackSet) {
      this.on(
        "update",
        debounce(callbackHandler, CONFIG.WSSharedDoc.CALLBACK_DEBOUNCE_WAIT, {
          maxWait: CONFIG.WSSharedDoc.CALLBACK_DEBOUNCE_MAXWAIT,
        })
      );
    }
  }

  private updateHandler(update: Uint8Array, origin: any, doc: WSSharedDoc) {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeUpdate(encoder, update);
    const message = encoding.toUint8Array(encoder);
    doc.conns.forEach((_, conn) => send(doc, conn, message));
  }

  /**
   *
   * @param param0
   * @param conn Origin is the connection that made the change
   */
  private awarenessChangeHandler(
    {
      added,
      updated,
      removed,
    }: {
      added: Array<number>;
      updated: Array<number>;
      removed: Array<number>;
    },
    conn: WebSocket | null
  ) {
    const changedClients = added.concat(updated, removed);
    if (conn !== null) {
      const connControlledIDs = this.conns.get(conn);
      if (connControlledIDs !== undefined) {
        added.forEach((clientID) => {
          connControlledIDs.add(clientID);
        });
        removed.forEach((clientID) => {
          connControlledIDs.delete(clientID);
        });
      }
    }
    // broadcast awareness update
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageAwareness);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients)
    );
    const buff = encoding.toUint8Array(encoder);
    this.conns.forEach((_, c) => {
      send(this, c, buff);
    });
  }
}

/**
 * Gets a Y.Doc by name, whether in memory or on disk
 *
 * @param docname - the name of the Y.Doc to find or create
 * @param gc - whether to allow gc on the doc (applies only when created)
 */
export const getYDoc = (docname: string, gc = true): WSSharedDoc =>
  map.setIfUndefined(docs, docname, () => {
    const doc = new WSSharedDoc(docname);
    doc.gc = gc;
    if (persistence !== null) {
      persistence.bindState(docname, doc);
    }
    docs.set(docname, doc);
    return doc;
  });

const messageListener = (
  conn: WebSocket,
  doc: WSSharedDoc,
  message: Uint8Array
) => {
  try {
    const encoder = encoding.createEncoder();
    const decoder = decoding.createDecoder(message);
    const messageType = decoding.readVarUint(decoder);
    switch (messageType) {
      case messageSync:
        encoding.writeVarUint(encoder, messageSync);
        syncProtocol.readSyncMessage(decoder, encoder, doc, null);
        if (encoding.length(encoder) > 1) {
          send(doc, conn, encoding.toUint8Array(encoder));
        }
        break;
      case messageAwareness: {
        awarenessProtocol.applyAwarenessUpdate(
          doc.awareness,
          decoding.readVarUint8Array(decoder),
          conn
        );
        break;
      }
    }
  } catch (err) {
    console.error(err);
    doc.emit("error", [err]);
  }
};

const closeConn = (doc: WSSharedDoc, conn: WebSocket) => {
  if (doc.conns.has(conn)) {
    const controlledIds = doc.conns.get(conn);
    doc.conns.delete(conn);
    awarenessProtocol.removeAwarenessStates(
      doc.awareness,
      Array.from(controlledIds!),
      null
    );
    if (doc.conns.size === 0 && persistence !== null) {
      // if persisted, we store state and destroy ydocument
      persistence.provider.closeDoc(doc.name);
      persistence.writeState(doc.name, doc).then(() => {
        doc.destroy();
      });
      docs.delete(doc.name);
    }
  }
  conn.close();
};

const send = (doc: WSSharedDoc, conn: WebSocket, m: Uint8Array) => {
  if (
    conn.readyState !== WebSocket.CONNECTING &&
    conn.readyState !== WebSocket.OPEN
  ) {
    closeConn(doc, conn);
  }
  try {
    conn.send(m, (err: any) => {
      err != null && closeConn(doc, conn);
    });
  } catch (e) {
    closeConn(doc, conn);
  }
};

const pingTimeout = 30000;

export const setupWSConnection = (
  conn: WebSocket,
  req: http.IncomingMessage,
  { docName = req.url!.slice(1).split("?")[0], gc = true } = {}
) => {
  logger(
    "Client accessing document: '",
    logging.PURPLE,
    logging.BOLD,
    docName,
    logging.UNCOLOR,
    logging.UNBOLD,
    "'"
  );
  conn.binaryType = "arraybuffer";
  // get doc, initialize if it does not exist yet
  const doc = getYDoc(docName, gc);
  doc.conns.set(conn, new Set());
  // listen and reply to events
  conn.on("message", (message: ArrayBuffer) =>
    messageListener(conn, doc, new Uint8Array(message))
  );

  // Check if connection is still alive
  let pongReceived = true;
  const pingInterval = setInterval(() => {
    if (!pongReceived) {
      if (doc.conns.has(conn)) {
        closeConn(doc, conn);
      }
      clearInterval(pingInterval);
    } else if (doc.conns.has(conn)) {
      pongReceived = false;
      try {
        conn.ping();
      } catch (e) {
        closeConn(doc, conn);
        clearInterval(pingInterval);
      }
    }
  }, pingTimeout);
  conn.on("close", () => {
    closeConn(doc, conn);
    clearInterval(pingInterval);
  });
  conn.on("pong", () => {
    pongReceived = true;
  });
  // put the following in a variables in a block so the interval handlers don't keep in in
  // scope
  {
    // send sync step 1
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeSyncStep1(encoder, doc);
    send(doc, conn, encoding.toUint8Array(encoder));
    const awarenessStates = doc.awareness.getStates();
    if (awarenessStates.size > 0) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(
          doc.awareness,
          Array.from(awarenessStates.keys())
        )
      );
      send(doc, conn, encoding.toUint8Array(encoder));
    }
  }
};
