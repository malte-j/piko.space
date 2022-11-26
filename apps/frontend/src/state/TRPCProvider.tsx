import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { httpBatchLink } from "@trpc/client";
import React, { useMemo, useState } from "react";
import { auth } from "../utils/auth";
import { trpc, trpcClient } from "../utils/trpc";

export function TRPCProvider({
  children,
}: {
  children: React.ReactNode[] | React.ReactNode;
}) {
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            cacheTime: Infinity,
          },
        },
      }),
    []
  );

  const persister = useMemo(
    () =>
      createSyncStoragePersister({
        storage: window.localStorage,
      }),
    []
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <PersistQueryClientProvider
        persistOptions={{ persister }}
        client={queryClient}
      >
        {children}
      </PersistQueryClientProvider>
    </trpc.Provider>
  );
}
