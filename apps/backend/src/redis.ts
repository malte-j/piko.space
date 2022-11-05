import Redis from "ioredis";
import CONFIG from "./config";

export const redis = createRedisConnection();

export function createRedisConnection() {
  return new Redis({
    family: 6,
    host: CONFIG.redisHost,
    password: CONFIG.redisPassword,
    port: CONFIG.redisPort,
  });
}
