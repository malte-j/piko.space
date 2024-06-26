import { HamburgerMenuIcon } from "@radix-ui/react-icons";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { useParams } from "react-router-dom";
import { IndexeddbPersistence } from "y-indexeddb";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";
import Editor from "../../components/Editor/Editor";
import FileInteractionPill from "../../components/FileInteractionPill/FileInteractionPill";
import { useCommandMenuStore } from "../../state/CommandMenuStore";
import { auth } from "../../utils/auth";
import { fileTitleToString } from "../../utils/fileTitle";
import { trpc } from "../../utils/trpc";
import s from "./file.module.scss";

export default function File() {
  const [online, setOnline] = useState(false);
  const [ydoc, setYDoc] = useState<Y.Doc>();
  const [provider, setProvider] = useState<WebsocketProvider>();
  const [onlineUsers, setOnlineUsers] = useState<
    { color: string; name: string }[]
  >([]);
  const [setOpen] = useCommandMenuStore((s) => [s.setOpen]);
  const { file: fileId } = useParams();
  const utils = trpc.useContext();

  const { data: fileTitle } = trpc.file.getFileTitle.useQuery(
    { fileId: fileId! },
    {
      enabled: fileId != null,
      onError(e) {
        console.log("error", e);
      },
    }
  );

  const registerFileOpen = trpc.file.registerFileOpen.useMutation({
    onSuccess: () => utils.file.userRecentFiles.invalidate(),
  });

  /**
   * Register file open
   */
  useEffect(() => {
    if (!ydoc) return;

    let registeredFileOpen = false;
    let hasToken = false;

    const sub = auth.onAuthStateChanged(async (user) => {
      await user?.getIdToken();
      hasToken = true;
    });

    const registerUpdate = () => {
      if (hasToken && !registeredFileOpen) {
        registeredFileOpen = true;
        registerFileOpen.mutate({ fileId: fileId! });
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
