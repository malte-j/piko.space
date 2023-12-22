import { createTRPCReact, httpBatchLink } from "@trpc/react";
// import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../../../backend/src/routers/_app";
import { auth } from "./auth";

// import { getAuth } from "firebase/auth";
// import { auth } from "./auth";

export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: import.meta.env.VITE_BACKEND_URL + "/trpc",
      async headers() {
        try {
          const token = await auth.currentUser?.getIdToken();
          if (!token) return {};
          return {
            authorization: "Bearer " + token,
          };
        } catch {
          return {};
        }
      },
    }),
  ],
});

// export const client = createTRPCProxyClient<AppRouter>({
//   links: [
//     httpBatchLink({
//       url: import.meta.env.VITE_BACKEND_URL + "/trpc",
//       headers: async () => {
//         try {
//           const user = await auth.currentUser?.getIdToken();
//           if (!user) {
//             return {};
//           }
//           return {
//             authorization: `Bearer ${await getAuth().currentUser?.getIdToken()}`,
//           };
//         } catch (e) {
//           return {};
//         }
//         // wait for user
//       },
//     }),
//   ],
// });

export default "d";
