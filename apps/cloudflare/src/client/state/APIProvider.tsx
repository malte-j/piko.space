import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import React, { useMemo } from "react";

export function APIProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useMemo(
    () => new QueryClient({
      defaultOptions: {
        queries: { cacheTime: Infinity },
      },
    }),
    [],
  );
  const persister = useMemo(
    () => createSyncStoragePersister({ storage: window.localStorage }),
    [],
  );
  return (
    <PersistQueryClientProvider
      persistOptions={{ persister }}
      client={queryClient}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
