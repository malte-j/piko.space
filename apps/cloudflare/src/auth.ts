import type { MiddlewareHandler } from "hono";
import { createRemoteJWKSet, jwtVerify } from "jose";

const firebaseKeys = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
  ),
);

export type AuthVariables = {
  userId: string;
};

export function requireFirebaseAuth(): MiddlewareHandler<{
  Bindings: Env;
  Variables: AuthVariables;
}> {
  return async (context, next) => {
    const authorization = context.req.header("Authorization");
    const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) {
      return context.json({ error: "unauthorized" as const }, 401);
    }

    try {
      const { payload } = await jwtVerify(token, firebaseKeys, {
        algorithms: ["RS256"],
        audience: context.env.FIREBASE_PROJECT_ID,
        issuer: `https://securetoken.google.com/${context.env.FIREBASE_PROJECT_ID}`,
      });
      if (!payload.sub) {
        return context.json({ error: "unauthorized" as const }, 401);
      }
      context.set("userId", payload.sub);
      await next();
    } catch (error) {
      console.warn(
        JSON.stringify({ message: "firebase token rejected", error: String(error) }),
      );
      return context.json({ error: "unauthorized" as const }, 401);
    }
  };
}

export async function migrationRequestIsAuthorized(
  provided: string | undefined,
  expected: string | undefined,
): Promise<boolean> {
  if (!provided || !expected) return false;
  const encoder = new TextEncoder();
  const left = encoder.encode(provided);
  const right = encoder.encode(expected);
  if (left.byteLength !== right.byteLength) return false;
  let difference = 0;
  for (let index = 0; index < left.byteLength; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}
