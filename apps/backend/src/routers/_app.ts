import { router } from "../trpc";
import { fileRouter } from "./file";
import { healthRouter } from "./health";

export const appRouter = router({
  file: fileRouter, // put procedures under "user" namespace
  health: healthRouter,
});

// You can then access the merged route with
// http://localhost:3000/trpc/<NAMESPACE>.<PROCEDURE>
export type AppRouter = typeof appRouter;
