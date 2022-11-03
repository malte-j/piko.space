import {
  Cross1Icon,
  FilePlusIcon,
  HamburgerMenuIcon,
} from "@radix-ui/react-icons";
import { NavLink, Outlet } from "react-router-dom";
import AddFileInteration from "../../components/AddFileInteraction/AddFileInteraction";
import AuthState from "../../components/AuthState/AuthState";
import CommandMenu from "../../components/CommandMenu/CommandMenu";
import { useNavStore } from "../../state/NavOpen";
import s from "./edit.module.scss";

export default function Overview() {
  const navState = useNavStore();

  return (
    <div className={s.edit}>
      <CommandMenu/>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
