const CONFIG = {
  host: process.env.HOST || "localhost",
  port: parseInt(process.env.PORT || "1234"),
  // disable gc when using snapshots!
  gcEnabled: process.env.GC !== "false" && process.env.GC !== "0",
  redisHost: process.env.REDIS_HOST || "localhost",
  redisPort: parseInt(process.env.REDIS_PORT || "6379"),
  redisPassword: process.env.REDIS_PW || "",
  WSSharedDoc: {
    CALLBACK_DEBOUNCE_WAIT:
      parseInt(process.env.CALLBACK_DEBOUNCE_WAIT!) || 2000,
    CALLBACK_DEBOUNCE_MAXWAIT:
      parseInt(process.env.CALLBACK_DEBOUNCE_MAXWAIT!) || 10000,
  },
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5500",
};

export default CONFIG;
