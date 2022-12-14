import { z } from "zod";

const configType = z.object({
  host: z.string(),
  port: z.number(),
  redis: z.object({
    host: z.string(),
    port: z.number(),
    password: z.string(),
  }),
  frontendUrl: z.string(),
});

const CONFIG = configType.parse({
  host: process.env.HOST || "localhost",
  port: parseInt(process.env.PORT || "1234"),
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5500",
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PW || "",
  },
});

export default CONFIG;
