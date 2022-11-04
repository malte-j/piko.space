import { useEffect, useState } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import Editor from "../../components/Editor/Editor";
import { useParams } from "react-router-dom";
import { Link2Icon, RulerHorizontalIcon } from "@radix-ui/react-icons";
import s from "./file.module.scss";
import CopyToClipboard from "../../components/CopyToClipboard/CopyToClipboard";
import { IndexeddbPersistence } from "y-indexeddb";

export default function File() {
  const [online, setOnline] = useState(false);
  const [ydoc, setYDoc] = useState<Y.Doc>();
  const [provider, setProvider] = useState<WebsocketProvider>();
  const [onlineUsers, setOnlineUsers] = useState<
    { color: string; name: string }[]
  >([]);

  const { file: filename } = useParams();

  useEffect(() => {
    const doc = new Y.Doc();
    setYDoc(doc);

    new IndexeddbPersistence("ydoc_" + filename!, doc);

    const wsProvider = new WebsocketProvider(
      import.meta.env.WS_BACKEND_URL,
      filename!,
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
  }, [filename]);

  return (
    <>
      <div className={s.metadata}>
        <span className={s.circle} data-online={online}></span>
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
        <CopyToClipboard
          title={filename || ""}
          copyText={"https://" + location.hostname + "/edit/" + filename}
        />
      </div>
      {ydoc && provider && <Editor provider={provider} doc={ydoc} />}
    </>
  );
}
