import { z } from "zod";

const configType = z.object({
  host: z.string(),
  port: z.number(),
  firebase: z.object({
    projectId: z.string(),
    clientEmail: z.string(),
    privateKey: z.string(),
  }),
  gcEnabled: z.boolean(),
  redis: z.object({
    host: z.string(),
    port: z.number(),
    password: z.string(),
  }),
  frontendUrl: z.string(),
  WSSharedDoc: z.object({
    CALLBACK_DEBOUNCE_WAIT: z.number(),
    CALLBACK_DEBOUNCE_MAXWAIT: z.number(),
  }),
  ogImageUrl: z.string(),
});

const CONFIG2 = configType.parse({
  host: process.env.HOST || "localhost",
  port: parseInt(process.env.PORT || "1234"),
  gcEnabled: process.env.GC !== "false" && process.env.GC !== "0",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5500",
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    // replace `\` and `n` character pairs w/ single `\n` character
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PW || "",
  },
  WSSharedDoc: {
    CALLBACK_DEBOUNCE_WAIT:
      parseInt(process.env.CALLBACK_DEBOUNCE_WAIT!) || 2000,
    CALLBACK_DEBOUNCE_MAXWAIT:
      parseInt(process.env.CALLBACK_DEBOUNCE_MAXWAIT!) || 10000,
  },
  ogImageUrl: process.env.OG_IMAGE_URL,
});

// const CONFIG = {
//   host: process.env.HOST || "localhost",
//   port: parseInt(process.env.PORT || "1234"),
//   // disable gc when using snapshots!
//   gcEnabled: process.env.GC !== "false" && process.env.GC !== "0",
//   redisHost: process.env.REDIS_HOST || "localhost",
//   redisPort: parseInt(process.env.REDIS_PORT || "6379"),
//   redisPassword: process.env.REDIS_PW || "",
//   WSSharedDoc: {
//     CALLBACK_DEBOUNCE_WAIT:
//       parseInt(process.env.CALLBACK_DEBOUNCE_WAIT!) || 2000,
//     CALLBACK_DEBOUNCE_MAXWAIT:
//       parseInt(process.env.CALLBACK_DEBOUNCE_MAXWAIT!) || 10000,
//   },
//   FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5500",
// };

export default CONFIG2;
