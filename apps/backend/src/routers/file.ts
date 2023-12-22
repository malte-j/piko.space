import { redis } from "../redis";
import { router, publicProcedure } from "../trpc";
import { z } from "zod";

export const fileRouter = router({
  userRecentFiles: publicProcedure.query(async (req) => {
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

    if (fileIds.length === 0) return [];
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
  setFileTitle: publicProcedure
    .input(z.object({ fileId: z.string(), title: z.string() }))
    .mutation(async (req) => {
      if (!req.ctx.user) return;

      await redis.hset("filenames", req.input.fileId, req.input.title);
    }),
  deleteFile: publicProcedure
    .input(z.object({ fileId: z.string() }))
    .mutation(async (req) => {
      if (req.ctx.user) {
        redis.zrem(
          "user:" + req.ctx.user.uid + ":recent_files",
          req.input.fileId
        );
      }
      redis.del("file:" + req.input.fileId + ":updates");
    }),
  getFileTitle: publicProcedure
    .input(z.object({ fileId: z.string() }))
    .query(async (req) => {
      const name = (await redis.hget("filenames", req.input.fileId)) || null;

      return name;
    }),

  registerFileOpen: publicProcedure
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
  healthz: publicProcedure.query(async (req) => {
    return "ok";
  }),
});
