import { Link2Icon } from "@radix-ui/react-icons";
import { useEffect, useState } from "react";
import { trpc } from "../../utils/trpc";
import s from "./FileInteractionPill.module.scss";

export default function FileInteractionPill({
  id,
  title,
  copyText,
}: {
  id: string;
  title: string;
  copyText: string;
}) {
  const [t, setT] = useState(title);

  useEffect(() => {
    setT(title);
  }, [title]);

  const mutSetTitle = trpc.setFileTitle.useMutation();

  return (
    <div className={s.copyToClipboard}>
      <span>{t}</span>
      <input
        type="text"
        value={t}
        onChange={(e) => {
          setT(e.target.value);
          mutSetTitle.mutate({
            fileId: id,
            title: e.target.value,
          });
        }}
      />

      <Link2Icon
        className={s.linkIcon}
        onClick={() => {
          try {
            navigator.clipboard.writeText(copyText);
          } catch (e) {
            console.log(e);
          }
        }}
      />
    </div>
  );
}
