// @filename: server.ts
import { inferAsyncReturnType, initTRPC } from "@trpc/server";
import * as trpcExpress from "@trpc/server/adapters/express";
import * as cors from "cors";
import * as express from "express";
import { credential } from "firebase-admin";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import * as path from "path";
import { z } from "zod";
import CONFIG from "./config";
import { redis } from "./redis";

initializeApp({
  credential: credential.cert({
    projectId: CONFIG.firebase.projectId,
    clientEmail: CONFIG.firebase.clientEmail,
    privateKey: CONFIG.firebase.privateKey,
  }),
});

const t = initTRPC.context<Context>().create();
const appRouter = t.router({
  userRecentFiles: t.procedure.query(async (req) => {
    if (!req.ctx.user) return null;
    const rawFileIds = await redis.zrevrange(
      "user:" + req.ctx.user.uid + ":recent_files",
      0,
      -1,
      "WITHSCORES"
    );

    const fileIds: [string, number][] = [];
    for (let i = 0; i < rawFileIds.length; i += 2) {
      fileIds.push([rawFileIds[i], parseFloat(rawFileIds[i + 1])]);
    }

    const filenames = await redis.hmget(
      "filenames",
      ...fileIds.map((f) => f[0])
    );

    const files: {
      id: string;
      title: string | null;
      lastEdited: number;
    }[] = [];

    for (let i = 0; i < filenames.length; i++) {
      files.push({
        id: fileIds[i][0],
        title: filenames[i] || null,
        lastEdited: fileIds[i][1],
      });
    }

    return files;
  }),
  setFileTitle: t.procedure
    .input(z.object({ fileId: z.string(), title: z.string() }))
    .mutation(async (req) => {
      if (!req.ctx.user) return;

      await redis.hset("filenames", req.input.fileId, req.input.title);
    }),
  getFileTitle: t.procedure
    .input(z.object({ fileId: z.string() }))
    .query(async (req) => {
      const name = (await redis.hget("filenames", req.input.fileId)) || null;

      return name;
    }),
  registerFileOpen: t.procedure
    .input(
      z.object({
        fileId: z.string(),
      })
    )
    .mutation(async (req) => {
      if (!req.ctx.user) return null;

      redis.zadd(
        "user:" + req.ctx.user.uid + ":recent_files",
        Math.floor(Date.now() / 1000),
        req.input.fileId
      );
    }),
});

// create file -> registerFileOpen
// recentFiles - All Files
// files without title -> archive
// file with title -> recentFiles
// delete file
// navigate to different file -> remove file:<file_id>:updates

//

export async function createContext({
  req,
  res,
}: trpcExpress.CreateExpressContextOptions) {
  async function getUserFromHeader() {
    if (!req.headers.authorization) return;

    try {
      const token = req.headers.authorization.split(" ")[1];
      const decodedToken = await getAuth().verifyIdToken(token);
      return decodedToken;
    } catch (e) {
      console.log(e);

      return;
    }
  }

  const user = await getUserFromHeader();

  return {
    user,
  };
}

type Context = inferAsyncReturnType<typeof createContext>;

export type AppRouter = typeof appRouter;

export const app = express();

app.disable("x-powered-by");
app.use(
  cors({
    origin: CONFIG.frontendUrl,
  })
);

app.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// serve static assets normally
app.use(express.static(__dirname + "/dist"));
// console.log("dirname: " + __dirname);

// handle every other route with index.html, which will contain
// a script tag to your application's JavaScript file(s).
app.get("/*", function (request, response) {
  response.sendFile(path.resolve(__dirname, "dist/index.html"));
});
