import { HamburgerMenuIcon } from "@radix-ui/react-icons";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { useParams } from "react-router-dom";
import { IndexeddbPersistence } from "y-indexeddb";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Editor from "../../components/Editor/Editor";
import FileInteractionPill from "../../components/FileInteractionPill/FileInteractionPill";
import { useCommandMenuStore } from "../../state/CommandMenuStore";
import { auth } from "../../utils/auth";
import { getOnlineUsers, type OnlineUser } from "../../utils/awareness";
import { fileTitleToString } from "../../utils/fileTitle";
import { getFileTitle, registerFileOpen, websocketBaseUrl } from "../../utils/api";
import s from "./file.module.scss";

export default function File() {
  const [online, setOnline] = useState(false);
  const [ydoc, setYDoc] = useState<Y.Doc>();
  const [provider, setProvider] = useState<WebsocketProvider>();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [setOpen] = useCommandMenuStore((s) => [s.setOpen]);
  const { file: fileId } = useParams();
  const queryClient = useQueryClient();

  const { data: fileTitle } = useQuery(
    ["fileTitle", fileId],
    () => getFileTitle(fileId!),
    { enabled: fileId != null },
  );

  const registerOpen = useMutation(registerFileOpen, {
    onSuccess: () => queryClient.invalidateQueries(["recentFiles"]),
  });

  /**
   * Register file open
   */
  useEffect(() => {
    if (!ydoc) return;

    let registeredFileOpen = false;
    let hasToken = false;

    const sub = auth.onAuthStateChanged(async (user) => {
      hasToken = user != null;
      if (user) await user.getIdToken();
    });

    const registerUpdate = () => {
      if (hasToken && !registeredFileOpen) {
        registeredFileOpen = true;
        registerOpen.mutate(fileId!);
        console.log("registered file open");
      }
    };

    ydoc?.on("update", registerUpdate);
    return () => {
      sub();
      ydoc?.off("update", registerUpdate);
    };
  }, [fileId, ydoc]);

  /**
   * Initialize new YDoc and connect to ws provider
   */
  useEffect(() => {
    const doc = new Y.Doc();
    setYDoc(doc);

    const indexeddbProvider = new IndexeddbPersistence("ydoc_" + fileId!, doc);

    const wsProvider = new WebsocketProvider(
      websocketBaseUrl(),
      fileId!,
      doc
    );

    setProvider(wsProvider);

    wsProvider.on("status", (event: any) => {
      setOnline(event.status == "connected");
    });

    const updateOnlineUsers = () => {
      setOnlineUsers(getOnlineUsers(wsProvider.awareness.getStates()));
    };

    wsProvider.awareness.on("change", updateOnlineUsers);
    updateOnlineUsers();

    return () => {
      wsProvider.awareness.off("change", updateOnlineUsers);
      wsProvider.destroy();
      indexeddbProvider.destroy();
      doc.destroy();
    };
  }, [fileId]);

  return (
    <>
      <Helmet>
        {fileTitle ? (
          <title>{fileTitleToString(fileTitle)} | piko.space</title>
        ) : (
          <title>piko.space</title>
        )}
      </Helmet>
      <div className={s.metadata}>
        {online ? (
          <img src="/icons/connectionStatusOnline.svg" />
        ) : (
          <img src="/icons/connectionStatusOffline.svg" />
        )}

        <ul className={s.onlineUsers}>
          {onlineUsers.map((user) => (
            <li
              className={s.userPill}
              data-color={user.color}
              key={user.clientId}
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
          title={fileTitle}
          id={fileId!}
          copyText={window.location.href}
        />

        <HamburgerMenuIcon
          className={s.menuIcon}
          onClick={() => setOpen(true)}
        />
      </div>

      {ydoc && provider && (
        <Editor
          provider={provider}
          doc={ydoc}
          fileTitle={fileTitle && fileTitleToString(fileTitle)}
          fileId={fileId!}
        />
      )}
    </>
  );
}
