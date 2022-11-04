import s from "./CommandMenu.module.scss";
import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";
import AuthState from "../AuthState/AuthState";
import { useUser } from "../../state/UserProvider";

export default function CommandMenu() {
  const [open, setOpen] = useState(false);
  const { user } = useUser();
  const [files, setFiles] = useState([
    {
      id: "ada9js0",
      title: "test",
      lastEdited: new Date("2021-08-01T00:00:00.000Z"),
    },
    {
      id: "ad21f",
      title: "test2",
      lastEdited: new Date("2021-08-01T00:00:00.000Z"),
    },
  ]);

  useEffect(() => {
    // open on command k
    document.addEventListener("keydown", (e) => {
      // open on ctrl k
      if (e.key === "k" && e.ctrlKey) {
        e.preventDefault();
        setOpen(true);
      }
    });
  }, []);

  return (
    <Dialog.Root
      open={open && !user?.isAnonymous}
      onOpenChange={(open: boolean) => setOpen(open)}
    >
      <Dialog.Portal>
        <Dialog.Overlay className={s.overlay}>
          <Dialog.Content className={s.content}>
            <input placeholder="suche..." className={s.searchBar} />
            <div className={s.files}>
              <ul>
                {files.map((file) => (
                  <li key={file.id}>
                    <span>{file.title}</span>
                    <span className={s.date}>
                      {file.lastEdited.toLocaleDateString("de", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className={s.divider}></div>
            <AuthState />
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
