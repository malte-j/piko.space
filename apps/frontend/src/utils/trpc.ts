import { createTRPCReact } from "@trpc/react";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../../../backend/src/api";
import { getAuth } from "firebase/auth";
import { auth } from "./auth";

export const trpc = createTRPCReact<AppRouter>();

export const client = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: import.meta.env.VITE_BACKEND_URL + "/trpc",
      headers: async () => {
        try {
          const user = await auth.currentUser?.getIdToken();
          if (!user) {
            return {};
          }
          return {
            authorization: `Bearer ${await getAuth().currentUser?.getIdToken()}`,
          };
        } catch (e) {
          return {};
        }
        // wait for user
      },
    }),
  ],
});
