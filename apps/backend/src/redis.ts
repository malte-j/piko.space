import Redis from "ioredis";
import CONFIG from "./config";

export const redis = createRedisConnection();

export function createRedisConnection() {
  return new Redis({
    family: 6,
    host: CONFIG.redis.host,
    password: CONFIG.redis.password,
    port: CONFIG.redis.port,
    reconnectOnError: () => true,
  });
}
