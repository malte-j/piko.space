import { Link2Icon } from "@radix-ui/react-icons";
import s from "./CopyToClipboard.module.scss";

export default function CopyToClipboard({
  title,
  copyText,
}: {
  title: string;
  copyText: string;
}) {
  return (
    <div
      className={s.copyToClipboard}
      onClick={() => {
        try {
          navigator.clipboard.writeText(copyText);
        } catch (e) {
          console.log(e);
        }
      }}
    >
      <span>{title}</span>
      <Link2Icon />
    </div>
  );
}
