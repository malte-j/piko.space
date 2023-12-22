import { redis } from "../redis";

/**
 * Throws an error
 * @returns null
 */
export async function health() {
  const redisStatus = await redis.echo("ok");
  if (redisStatus !== "ok") throw new Error("Redis not responding");

  return "ok";
}
