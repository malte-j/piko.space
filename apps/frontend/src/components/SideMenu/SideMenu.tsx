import {
  GitHubLogoIcon,
  HamburgerMenuIcon,
  QuestionMarkCircledIcon,
} from "@radix-ui/react-icons";
import { useCommandMenuStore } from "../../state/CommandMenuStore";
import s from "./SideMenu.module.scss";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Logo from "../Logo/Logo";
import { useState } from "react";

export const SideMenu = () => {
  const [commandMenuOpen, setCommandMenuOpen] = useCommandMenuStore((state) => [
    state.navOpen,
    state.setOpen,
  ]);

  const [open, setOpen] = useState(false);

  return (
    <div className={s.sideMenu} data-open={open}>
      <nav className={s.inner}>
        <img src="/favicon.svg" />
        <div className={s.spacer}></div>

        <button
          className={s.button}
          onClick={() => setCommandMenuOpen(!commandMenuOpen)}
        >
          <HamburgerMenuIcon />
        </button>
        <DropdownMenu.Root onOpenChange={(o) => setOpen(o)}>
          <DropdownMenu.Trigger asChild>
            <button className={s.button}>
              <QuestionMarkCircledIcon />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className={s.dropdownContent}
              side="right"
              sideOffset={16}
              align="start"
            >
              <img src="/Logo.svg" alt="Logo" />
              <p>
                An open source CRDT-based collaborative editor by{" "}
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href="https://malts.me"
                >
                  Malte&nbsp;Janßen
                </a>
                .<br />
                Star it on{" "}
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href="https://github.com/malte-j/piko.space"
                >
                  GitHub
                </a>
                !{" "}
              </p>
              <DropdownMenu.Arrow opacity={0.7} />
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </nav>
    </div>
  );
};
