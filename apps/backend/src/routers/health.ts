import { health } from "../services/health";
import { publicProcedure, router } from "../trpc";

export const healthRouter = router({
  healthz: publicProcedure.query(async (req) => {
    return health();
  }),
});
