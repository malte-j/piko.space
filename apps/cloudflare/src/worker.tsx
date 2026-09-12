import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { migrationRequestIsAuthorized, requireFirebaseAuth, type AuthVariables } from "./auth";
import { DocumentDurableObject } from "./document-do";
import { OPEN_GRAPH_IMAGE_VERSION, renderOpenGraphImage } from "./og";
import { base64ToBytes, bytesToBase64, isValidDocumentId, sha256Hex, toArrayBuffer } from "./shared";

export { DocumentDurableObject };

type AppBindings = {
  Bindings: Env;
  Variables: AuthVariables;
};

const fileIdSchema = z.object({ fileId: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/) });
const titleSchema = z.object({ title: z.string().max(500) });
const migrationDocumentSchema = z.object({
  state: z.string().min(1),
  stateParts: z.array(z.string().min(1)).max(256).optional(),
  checksum: z.string().regex(/^[a-f0-9]{64}$/),
  force: z.boolean().optional(),
});
const migrationMetadataSchema = z.object({
  documents: z.array(z.object({
    fileId: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),
    title: z.string().nullable(),
    createdAt: z.number().int().nonnegative(),
    updatedAt: z.number().int().nonnegative(),
  })).max(100),
  recentFiles: z.array(z.object({
    userId: z.string().min(1).max(256),
    fileId: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),
    lastEdited: z.number().int().nonnegative(),
  })).max(500),
});

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

async function titleVersion(title: string): Promise<string> {
  return sha256Hex(new TextEncoder().encode(title));
}

function migrationEnabled(env: Env): boolean {
  return String(env.MIGRATION_ENABLED) === "true";
}

const api = new Hono<AppBindings>()
  .get("/health", (context) => context.json({ status: "ok" as const }, 200))
  .get(
    "/files/:fileId/title",
    zValidator("param", fileIdSchema),
    async (context) => {
      const { fileId } = context.req.valid("param");
      const row = await context.env.DB.prepare(
        "SELECT title FROM documents WHERE file_id = ?",
      ).bind(fileId).first<{ title: string | null }>();
      return context.json({ title: row?.title ?? null }, 200);
    },
  )
  .get("/files/recent", requireFirebaseAuth(), async (context) => {
    const result = await context.env.DB.prepare(
      `SELECT recent.file_id AS id, documents.title AS title, recent.last_edited AS lastEdited
       FROM user_recent_files AS recent
       LEFT JOIN documents ON documents.file_id = recent.file_id
       WHERE recent.user_id = ?
       ORDER BY recent.last_edited DESC`,
    ).bind(context.get("userId")).all<{ id: string; title: string | null; lastEdited: number }>();
    return context.json({ files: result.results }, 200);
  })
  .post(
    "/files/:fileId/open",
    requireFirebaseAuth(),
    zValidator("param", fileIdSchema),
    async (context) => {
      const { fileId } = context.req.valid("param");
      const timestamp = nowSeconds();
      await context.env.DB.batch([
        context.env.DB.prepare(
          `INSERT INTO documents(file_id, title, title_version, created_at, updated_at)
           VALUES (?, NULL, NULL, ?, ?)
           ON CONFLICT(file_id) DO UPDATE SET updated_at = excluded.updated_at`,
        ).bind(fileId, timestamp, timestamp),
        context.env.DB.prepare(
          `INSERT INTO user_recent_files(user_id, file_id, last_edited)
           VALUES (?, ?, ?)
           ON CONFLICT(user_id, file_id) DO UPDATE SET last_edited = excluded.last_edited`,
        ).bind(context.get("userId"), fileId, timestamp),
      ]);
      return context.json({ ok: true as const }, 200);
    },
  )
  .put(
    "/files/:fileId/title",
    requireFirebaseAuth(),
    zValidator("param", fileIdSchema),
    zValidator("json", titleSchema),
    async (context) => {
      const { fileId } = context.req.valid("param");
      const { title } = context.req.valid("json");
      const timestamp = nowSeconds();
      const version = await titleVersion(title);
      await context.env.DB.prepare(
        `INSERT INTO documents(file_id, title, title_version, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(file_id) DO UPDATE SET title = excluded.title,
           title_version = excluded.title_version, updated_at = excluded.updated_at`,
      ).bind(fileId, title, version, timestamp, timestamp).run();
      return context.json({ title, titleVersion: version }, 200);
    },
  )
  .delete(
    "/files/:fileId/recent",
    requireFirebaseAuth(),
    zValidator("param", fileIdSchema),
    async (context) => {
      const { fileId } = context.req.valid("param");
      await context.env.DB.prepare(
        "DELETE FROM user_recent_files WHERE user_id = ? AND file_id = ?",
      ).bind(context.get("userId"), fileId).run();
      return context.json({ ok: true as const }, 200);
    },
  );

export type AppType = typeof api;

const app = new Hono<AppBindings>();
app.route("/api", api);

app.get("/ws/:fileId", zValidator("param", fileIdSchema), async (context) => {
  if (context.req.header("Upgrade")?.toLowerCase() !== "websocket") {
    return context.json({ error: "websocket_upgrade_required" as const }, 426);
  }
  const { fileId } = context.req.valid("param");
  return context.env.DOCUMENTS.getByName(fileId).fetch(context.req.raw);
});

app.get("/og/:fileId/:image", async (context) => {
  const fileId = context.req.param("fileId");
  const imageName = context.req.param("image");
  const imageMatch = /^([a-f0-9]{64})-(v\d+)\.png$/.exec(imageName);
  const version = imageMatch?.[1] ?? "";
  const rendererVersion = imageMatch?.[2] ?? "";
  if (!isValidDocumentId(fileId) || rendererVersion !== OPEN_GRAPH_IMAGE_VERSION) {
    return context.json({ error: "not_found" as const }, 404);
  }
  const row = await context.env.DB.prepare(
    "SELECT title, title_version FROM documents WHERE file_id = ?",
  ).bind(fileId).first<{ title: string | null; title_version: string | null }>();
  if (!row?.title || row.title_version !== version) {
    return context.json({ error: "not_found" as const }, 404);
  }

  const cache = await caches.open("piko-og");
  const cacheKey = new Request(context.req.url, { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;
  const imageResponse = await renderOpenGraphImage(context.env, context.req.url, row.title);
  context.executionCtx.waitUntil(cache.put(cacheKey, imageResponse.clone()));
  return imageResponse;
});

app.get("/edit/:fileId", zValidator("param", fileIdSchema), async (context) => {
  const { fileId } = context.req.valid("param");
  const row = await context.env.DB.prepare(
    "SELECT title, title_version FROM documents WHERE file_id = ?",
  ).bind(fileId).first<{ title: string | null; title_version: string | null }>();
  // Workers Static Assets canonicalizes `/index.html` to `/`. Fetch the root
  // document directly so a deep link keeps its `/edit/:fileId` browser URL.
  const assetRequest = new Request(new URL("/", context.req.url), context.req.raw);
  const asset = await context.env.ASSETS.fetch(assetRequest);
  if (!row?.title || !row.title_version) return asset;

  const displayTitle = row.title.replace("\uE000", " ");
  const canonicalUrl = new URL(`/edit/${fileId}`, context.req.url).toString();
  const imageUrl = new URL(
    `/og/${fileId}/${row.title_version}-${OPEN_GRAPH_IMAGE_VERSION}.png`,
    context.req.url,
  ).toString();
  return new HTMLRewriter()
    .on("head", {
      element: (element) => {
        element.append(`<link rel="canonical" href="${canonicalUrl}">`, { html: true });
      },
    })
    .on("title", { element: (element) => { element.setInnerContent(`${displayTitle} | piko.space`); } })
    .on('meta[property="og:title"]', { element: (element) => { element.setAttribute("content", displayTitle); } })
    .on('meta[property="og:image"]', { element: (element) => { element.setAttribute("content", imageUrl); } })
    .on('meta[property="og:url"]', { element: (element) => { element.setAttribute("content", canonicalUrl); } })
    .transform(asset);
});

app.use("/api/migration/*", async (context, next) => {
  const provided = context.req.header("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!migrationEnabled(context.env) || !await migrationRequestIsAuthorized(provided, context.env.MIGRATION_TOKEN)) {
    return context.json({ error: "not_found" as const }, 404);
  }
  await next();
});

app.post(
  "/api/migration/documents/:fileId",
  zValidator("param", fileIdSchema),
  zValidator("json", migrationDocumentSchema),
  async (context) => {
    const { fileId } = context.req.valid("param");
    const body = context.req.valid("json");
    try {
      const state = base64ToBytes(body.state);
      const stateParts = (body.stateParts ?? []).map(base64ToBytes);
      if (state.byteLength >= 1_900_000 && stateParts.length === 0) {
        return context.json({ error: "snapshot_too_large" as const }, 413);
      }
      if (stateParts.some((part) => part.byteLength > 1_000_000)) {
        return context.json({ error: "snapshot_part_too_large" as const }, 413);
      }
      const result = await context.env.DOCUMENTS.getByName(fileId).importSnapshot(
        toArrayBuffer(state),
        body.checksum,
        body.force ?? false,
        stateParts.map(toArrayBuffer),
      );
      return context.json({
        checksum: result.checksum,
        stateVector: bytesToBase64(new Uint8Array(result.stateVector)),
        updateCount: result.updateCount,
        updateBytes: result.updateBytes,
      }, 200);
    } catch (error) {
      const message = String(error);
      if (message.includes("checksum")) {
        return context.json({ error: "checksum_mismatch" as const }, 400);
      }
      if (message.includes("already contains") || message.includes("clients are connected")) {
        return context.json({ error: "snapshot_conflict" as const }, 409);
      }
      throw error;
    }
  },
);

app.post(
  "/api/migration/metadata",
  zValidator("json", migrationMetadataSchema),
  async (context) => {
    const body = context.req.valid("json");
    const documentStatements = await Promise.all(body.documents.map(async (document) => {
      const version = document.title ? await titleVersion(document.title) : null;
      return context.env.DB.prepare(
        `INSERT INTO documents(file_id, title, title_version, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(file_id) DO UPDATE SET title = excluded.title,
           title_version = excluded.title_version, updated_at = excluded.updated_at`,
      ).bind(document.fileId, document.title, version, document.createdAt, document.updatedAt);
    }));
    if (documentStatements.length > 0) await context.env.DB.batch(documentStatements);
    const recentStatements = body.recentFiles.map((recent) => context.env.DB.prepare(
      `INSERT INTO user_recent_files(user_id, file_id, last_edited)
       VALUES (?, ?, ?)
       ON CONFLICT(user_id, file_id) DO UPDATE SET last_edited = excluded.last_edited`,
    ).bind(recent.userId, recent.fileId, recent.lastEdited));
    if (recentStatements.length > 0) await context.env.DB.batch(recentStatements);
    return context.json({ documents: body.documents.length, recentFiles: body.recentFiles.length }, 200);
  },
);

app.get(
  "/api/migration/documents/:fileId",
  zValidator("param", fileIdSchema),
  async (context) => {
    const { fileId } = context.req.valid("param");
    const state = await context.env.DOCUMENTS.getByName(fileId).getMigrationState();
    return context.json({
      checksum: state.checksum,
      stateVector: bytesToBase64(new Uint8Array(state.stateVector)),
      updateCount: state.updateCount,
      updateBytes: state.updateBytes,
    }, 200);
  },
);

app.get("/api/migration/summary", async (context) => {
  const [documents, titledDocuments, recentFiles, users] = await context.env.DB.batch([
    context.env.DB.prepare("SELECT COUNT(*) AS count FROM documents"),
    context.env.DB.prepare("SELECT COUNT(*) AS count FROM documents WHERE title IS NOT NULL"),
    context.env.DB.prepare("SELECT COUNT(*) AS count FROM user_recent_files"),
    context.env.DB.prepare("SELECT COUNT(DISTINCT user_id) AS count FROM user_recent_files"),
  ]);
  const count = (result: D1Result) => Number((result.results[0] as { count: number }).count);
  return context.json({
    documents: count(documents),
    titledDocuments: count(titledDocuments),
    recentFiles: count(recentFiles),
    users: count(users),
  }, 200);
});

function migrationPage(context: { req: { query(name: string): string | undefined } }): {
  limit: number;
  offset: number;
} {
  const requestedLimit = Number(context.req.query("limit") ?? 500);
  const requestedOffset = Number(context.req.query("offset") ?? 0);
  return {
    limit: Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 500) : 500,
    offset: Number.isInteger(requestedOffset) ? Math.max(requestedOffset, 0) : 0,
  };
}

app.get("/api/migration/document-metadata", async (context) => {
  const { limit, offset } = migrationPage(context);
  const result = await context.env.DB.prepare(
    `SELECT file_id AS "fileId", title, created_at AS "createdAt", updated_at AS "updatedAt"
     FROM documents ORDER BY file_id LIMIT ? OFFSET ?`,
  ).bind(limit, offset).all<{
    fileId: string;
    title: string | null;
    createdAt: number;
    updatedAt: number;
  }>();
  return context.json({ rows: result.results, nextOffset: result.results.length === limit ? offset + limit : null });
});

app.get("/api/migration/recent-files", async (context) => {
  const { limit, offset } = migrationPage(context);
  const result = await context.env.DB.prepare(
    `SELECT user_id AS "userId", file_id AS "fileId", last_edited AS "lastEdited"
     FROM user_recent_files
     ORDER BY user_id, last_edited DESC, file_id
     LIMIT ? OFFSET ?`,
  ).bind(limit, offset).all<{
    userId: string;
    fileId: string;
    lastEdited: number;
  }>();
  return context.json({ rows: result.results, nextOffset: result.results.length === limit ? offset + limit : null });
});

app.notFound((context) => context.json({ error: "not_found" as const }, 404));
app.onError((error, context) => {
  console.error(JSON.stringify({ message: "request failed", path: context.req.path, error: String(error) }));
  return context.json({ error: "internal_error" as const }, 500);
});

export default app;
