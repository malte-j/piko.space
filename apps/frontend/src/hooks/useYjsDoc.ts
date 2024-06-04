import { useEffect, useState } from "react";
import { IndexeddbPersistence } from "y-indexeddb";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";

export function useYjsDoc(
  documentName: string,
  settings?: {
    disabled?: boolean;
  }
) {
  const [yDoc, setYDoc] = useState<Y.Doc | null>(null);

  /**
   * Initialize new YDoc and connect to ws provider
   */
  useEffect(() => {
    const doc = new Y.Doc();
    setYDoc(doc);

    new IndexeddbPersistence("ydoc_" + documentName, doc);

    const wsProvider = new WebsocketProvider(
      import.meta.env.VITE_WS_BACKEND_URL,
      documentName,
      doc
    );

    return () => {
      wsProvider.disconnect();
    };
  }, [documentName, setYDoc]);

  return yDoc;
}
