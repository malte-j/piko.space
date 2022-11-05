import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { IndexeddbPersistence } from "y-indexeddb";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";
import Editor from "../../components/Editor/Editor";
import FileInteractionPill from "../../components/FileInteractionPill/FileInteractionPill";
import { auth } from "../../utils/auth";
import { client } from "../../utils/trpc";
import s from "./file.module.scss";

export default function File() {
  const [online, setOnline] = useState(false);
  const [ydoc, setYDoc] = useState<Y.Doc>();
  const [provider, setProvider] = useState<WebsocketProvider>();
  const [onlineUsers, setOnlineUsers] = useState<
    { color: string; name: string }[]
  >([]);

  const { file: fileId } = useParams();
  const [fileTitle, setFileTitle] = useState<string>();

  useEffect(() => {
    let sub = auth.onAuthStateChanged(async (user) => {
      const u = await user?.getIdToken();
      client.registerFileOpen.mutate({ fileId: fileId! });
      const title = await client.getFileTitle.query({ fileId: fileId! });
      setFileTitle(title);
    });
    return sub;
  }, [fileId]);

  useEffect(() => {
    const doc = new Y.Doc();
    setYDoc(doc);

    new IndexeddbPersistence("ydoc_" + fileId!, doc);

    const wsProvider = new WebsocketProvider(
      import.meta.env.VITE_WS_BACKEND_URL,
      fileId!,
      doc
    );

    setProvider(wsProvider);

    wsProvider.on("status", (event: any) => {
      setOnline(event.status == "connected");
    });

    wsProvider.awareness.on("change", (changes: any) => {
      setOnlineUsers(
        Array.from(wsProvider.awareness.getStates().values()).map(
          (state: any) => state.user
        )
      );
    });

    return () => {
      wsProvider.disconnect();
    };
  }, [fileId]);

  return (
    <>
      <div className={s.metadata}>
        {online ? (
          <img src="/icons/connectionStatusOnline.svg" />
        ) : (
          <img src="/icons/connectionStatusOffline.svg" />
        )}
        {/* <span className={s.circle} data-online={online}></span> */}
        <ul className={s.onlineUsers}>
          {onlineUsers.map((user) => (
            <li
              className={s.userPill}
              data-color={user.color}
              key={user.name + user.color}
              style={{
                // @ts-ignore
                "--color": user.color,
              }}
            >
              {user.name}
            </li>
          ))}
        </ul>
        <FileInteractionPill
          title={fileTitle || ""}
          id={fileId!}
          copyText={window.location.href}
        />
      </div>
      {ydoc && provider && <Editor provider={provider} doc={ydoc} />}
    </>
  );
}
