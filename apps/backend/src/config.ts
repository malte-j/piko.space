const CONFIG = {
  host: process.env.HOST || "localhost",
  port: parseInt(process.env.PORT || "1234"),
  // disable gc when using snapshots!
  gcEnabled: process.env.GC !== "false" && process.env.GC !== "0",
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  WSSharedDoc: {
    CALLBACK_DEBOUNCE_WAIT:
      parseInt(process.env.CALLBACK_DEBOUNCE_WAIT!) || 2000,
    CALLBACK_DEBOUNCE_MAXWAIT:
      parseInt(process.env.CALLBACK_DEBOUNCE_MAXWAIT!) || 10000,
  },
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID!,
  JWT_SECRET: process.env.JWT_SECRET!,
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5500",
};

export default CONFIG;
