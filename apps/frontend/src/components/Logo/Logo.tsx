import { FileTextIcon } from "@radix-ui/react-icons";
import s from "./Logo.module.scss";

export default function Logo() {
  return (
    <div className={s.logo}>
      <FileTextIcon />
      piko.space
    </div>
  );
}
