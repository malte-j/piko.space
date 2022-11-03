import { useEffect, useState } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import Editor from "../../components/Editor/Editor";
import { useParams } from "react-router-dom";
import { Link2Icon, RulerHorizontalIcon } from "@radix-ui/react-icons";
import s from "./file.module.scss";
import CopyToClipboard from "../../components/CopyToClipboard/CopyToClipboard";

export default function File() {
  let [online, setOnline] = useState(false);
  const [ydoc, setYDoc] = useState<Y.Doc>();
  const [provider, setProvider] = useState<WebsocketProvider>();

  const { file: filename } = useParams();

  useEffect(() => {
    const doc = new Y.Doc();
    setYDoc(doc);

    const wsProvider = new WebsocketProvider(
      `ws://${location.hostname}:5510/ws`,
      filename!,
      doc
    );

    setProvider(wsProvider);

    wsProvider.on("status", (event: any) => {
      setOnline(event.status == "connected");
    });

    wsProvider.awareness.on('change', (changes: any) => {
      // Whenever somebody updates their awareness information,
      // we log all awareness information from all users.
      // console.log(Array.from(wsProvider.awareness.getStates().values()))
      //  values is an array, array[n]-user.name gives name, .color the color, e.g. "hsl(0,0,0)"
    })

    return () => {
      wsProvider.disconnect();
    };
  }, [filename]);

  return (
    <>
      <div className={s.metadata}>
        <span>{online ? "🟢" : "🔴"}</span>
        <CopyToClipboard
          title={filename || ""}
          copyText={"https://" + location.hostname + "/edit/" + filename}
        />
      </div>
      {ydoc && provider && <Editor provider={provider} doc={ydoc} />}
    </>
  );
}
