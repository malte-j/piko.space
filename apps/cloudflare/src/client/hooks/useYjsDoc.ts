import { useEffect, useState } from "react";
import { IndexeddbPersistence } from "y-indexeddb";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";
import { websocketBaseUrl } from "../utils/api";

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
    if (settings?.disabled) {
      setYDoc(null);
      return;
    }

    const doc = new Y.Doc();
    setYDoc(doc);

    const indexeddbProvider = new IndexeddbPersistence("ydoc_" + documentName, doc);

    const wsProvider = new WebsocketProvider(
      websocketBaseUrl(),
      documentName,
      doc
    );

    return () => {
      wsProvider.destroy();
      indexeddbProvider.destroy();
      doc.destroy();
    };
  }, [documentName, settings?.disabled]);

  return yDoc;
}
