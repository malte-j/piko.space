// @filename: server.ts
import { inferAsyncReturnType, initTRPC } from "@trpc/server";
import { z } from "zod";
import * as trpcExpress from "@trpc/server/adapters/express";
import * as express from "express";
import * as cors from "cors";
import CONFIG from "./config";
import * as path from "path";

interface User {
  id: string;
  name: string;
}

const userList: User[] = [
  {
    id: "1",
    name: "KATT",
  },
];

const t = initTRPC.context<Context>().create();
const appRouter = t.router({
  userById: t.procedure
    .input(z.string()) // user id
    .query((req) => {
      const { input } = req;
      const user = userList.find((u) => u.id === input);

      return user;
    }),
  login: t.procedure.input(z.string()).query(async (req) => {

    throw new Error("Not implemented");
  }),
  userCreate: t.procedure
    .input(z.object({ name: z.string() }))
    .mutation((req) => {
      const id = `${Math.random()}`;
      const user: User = {
        id,
        name: req.input.name,
      };
      userList.push(user);
      return user;
    }),
});

export async function createContext({
  req,
  res,
}: trpcExpress.CreateExpressContextOptions) {
  // Create your context based on the request object
  // Will be available as `ctx` in all your resolvers
  // This is just an example of something you'd might want to do in your ctx fn
  async function getUserFromHeader() {
    if (req.headers.authorization) {
      const token = req.headers.authorization.split(" ")[1];

      try {
      } catch {
        return null;
      }
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
    origin: CONFIG.FRONTEND_URL,
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
console.log("dirname: " + __dirname);


// handle every other route with index.html, which will contain
// a script tag to your application's JavaScript file(s).
app.get("/*", function (request, response) {
  response.sendFile(path.resolve(__dirname, "dist/index.html"));
});
