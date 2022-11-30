import { Outlet } from "react-router-dom";
import CommandMenu from "../../components/CommandMenu/CommandMenu";
import s from "./edit.module.scss";

export default function Overview() {
  return (
    <div className={s.edit}>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
