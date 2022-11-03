import { createTRPCReact } from "@trpc/react";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../../../backend/src/api";

export const trpc = createTRPCReact<AppRouter>();

export const client = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "http://localhost:5510/trpc",
    }),
  ],
});
