import * as Y from "yjs";
import * as mutex from "lib0/mutex";
import { Observable } from "lib0/observable";
import * as promise from "lib0/promise";
import * as error from "lib0/error";
import * as logging from "lib0/logging";
import Redis, { Cluster, ClusterNode, RedisOptions } from "ioredis";

const logger = logging.createModuleLogger("y-redis");

/**
 * Handles persistence of a single doc.
 */
export class PersistenceDoc {
  rp: RedisPersistence;
  name: string;
  doc: Y.Doc;
  private mux: mutex.mutex;
  /**
   * Next expected index / len of the list of updates
   */
  _clock: number;
  _fetchingClock: number;
  updateHandler: (update: Uint8Array) => void;
  synced: Promise<PersistenceDoc>;

  constructor(rp: RedisPersistence, name: string, doc: Y.Doc) {
    this.rp = rp;
    this.name = name;
    this.doc = doc;
    this.mux = mutex.createMutex();
    this._clock = 0;
    this._fetchingClock = 0;

    this.updateHandler = (update: Uint8Array) => {
      // mux: only store update in redis if this document update does not originate from redis
      // console.log(Y.encodeStateAsUpdate(doc).byteLength);

      // rp.redis.hset(getItemKey(this.name), [
      //   console.log(this.doc);
      // ]);
      this.mux(() => {
        rp.redis
          // @WARNING: changed from rpushBuffer
          .rpush(getItemUpdateKey(name), Buffer.from(update))
          .then((len) => {
            if (len === this._clock + 1) {
              this._clock++;
              if (this._fetchingClock < this._clock) {
                this._fetchingClock = this._clock;
              }
            }

            rp.redis.publish(this.name, len.toString());
          });
      });
    };

    if (doc.store.clients.size > 0) {
      this.updateHandler(Y.encodeStateAsUpdate(doc));
    }
    doc.on("update", this.updateHandler);
    this.synced = rp.sub.subscribe(name).then(() => this.getUpdates());
  }

  destroy(): Promise<any> {
    this.doc.off("update", this.updateHandler);
    this.rp.docs.delete(this.name);
    return this.rp.sub.unsubscribe(this.name);
  }

  /**
   * Get all new updates from redis and increase clock if necessary.
   */
  getUpdates(): Promise<PersistenceDoc> {
    const startClock = this._clock;
    return this.rp.redis
      .lrangeBuffer(getItemUpdateKey(this.name), startClock, -1)
      .then((updates) => {
        logger(
          "Fetched ",
          logging.BOLD,
          logging.PURPLE,
          updates.length.toString().padEnd(2),
          logging.UNBOLD,
          logging.UNCOLOR,
          " updates"
        );
        this.mux(() => {
          this.doc.transact(() => {
            updates.forEach((update) => {
              Y.applyUpdate(this.doc, update);
            });
            const nextClock = startClock + updates.length;
            if (this._clock < nextClock) {
              this._clock = nextClock;
            }
            if (this._fetchingClock < this._clock) {
              this._fetchingClock = this._clock;
            }
          });
        });
        if (this._fetchingClock <= this._clock) {
          return this;
        } else {
          // there is still something missing. new updates came in. fetch again.
          if (updates.length === 0) {
            // Calling getUpdates recursively has the potential to be an infinite fetch-call.
            // In case no new updates came in, reset _fetching clock (in case the pubsub lied / send an invalid message).
            // Being overly protective here..
            this._fetchingClock = this._clock;
          }
          return this.getUpdates();
        }
      });
  }
}

export class RedisPersistence extends Observable<string> {
  redis: Redis | Cluster;
  sub: Redis | Cluster;
  docs: Map<string, PersistenceDoc>;

  constructor({ redis, sub }: { redis: Redis; sub: Redis }) {
    super();
    this.redis = redis;
    this.sub = sub;

    this.docs = new Map();
    this.sub.on("message", (channel, sclock) => {
      // console.log('message', channel, sclock)
      const pdoc = this.docs.get(channel);
      if (pdoc) {
        const clock = Number(sclock) || Number.POSITIVE_INFINITY; // case of null
        if (pdoc._fetchingClock < clock) {
          // do not query doc updates if this document is currently already fetching
          const isCurrentlyFetching = pdoc._fetchingClock !== pdoc._clock;
          if (pdoc._fetchingClock < clock) {
            pdoc._fetchingClock = clock;
          }
          if (!isCurrentlyFetching) {
            pdoc.getUpdates();
          }
        }
      } else {
        this.sub.unsubscribe(channel);
      }
    });
  }

  bindState(name: string, ydoc: Y.Doc): PersistenceDoc {
    if (this.docs.has(name)) {
      throw error.create(
        `"${name}" is already bound to this RedisPersistence instance`
      );
    }
    const pd = new PersistenceDoc(this, name, ydoc);
    this.docs.set(name, pd);
    return pd;
  }

  destroy() {
    const docs = this.docs;
    this.docs = new Map();
    return promise
      .all(Array.from(docs.values()).map((doc) => doc.destroy()))
      .then(() => {
        this.redis.quit();
        this.sub.quit();
        // @ts-ignore
        this.redis = null;
        // @ts-ignore
        this.sub = null;
      });
  }

  closeDoc(name: string) {
    const doc = this.docs.get(name);
    if (doc) {
      return doc.destroy();
    }
  }

  clearDocument(name: string): Promise<any> {
    const doc = this.docs.get(name);
    if (doc) {
      doc.destroy();
    }
    return this.redis.del(getItemUpdateKey(name));
  }

  /**
   * Destroys this instance and removes all known documents from the database.
   * After that this Persistence instance is destroyed.
   */
  clearAllDocuments() {
    return promise
      .all(
        Array.from(this.docs.keys()).map((name) =>
          this.redis.del(getItemUpdateKey(name))
        )
      )
      .then(() => {
        this.destroy();
      });
  }
}

function getItemUpdateKey(name: string) {
  return "file:" + name + ":updates";
}
