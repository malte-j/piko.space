import { inferAsyncReturnType, initTRPC } from "@trpc/server";
import * as trpcExpress from "@trpc/server/adapters/express";
import { DecodedIdToken, getAuth } from "firebase-admin/auth";
import withTimeout from "./utils/withTimeout";

export async function createContext({
  req,
  res,
}: trpcExpress.CreateExpressContextOptions) {
  let user: DecodedIdToken | null = null;
  let token;

  if (!req.headers.authorization) return { user };

  try {
    token = req.headers.authorization.split(" ")[1];
  } catch {
    return { user };
  }

  user = await withTimeout(
    2000,
    getAuth()
      .verifyIdToken(token)
      .catch((e) => {
        return null;
      })
  );

  return {
    user,
  };
}

type Context = inferAsyncReturnType<typeof createContext>;

const t = initTRPC.context<Context>().create();
export const middleware = t.middleware;
export const router = t.router;
export const publicProcedure = t.procedure;
