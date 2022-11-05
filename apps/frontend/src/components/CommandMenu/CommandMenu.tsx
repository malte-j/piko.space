import s from "./CommandMenu.module.scss";
import * as Dialog from "@radix-ui/react-dialog";
import { useCallback, useEffect, useMemo, useState } from "react";
import AuthState from "../AuthState/AuthState";
import { useUser } from "../../state/UserProvider";
import { useQueryClient } from "@tanstack/react-query";
import { client, trpc } from "../../utils/trpc";
import { auth } from "../../utils/auth";
import { Link } from "react-router-dom";

export default function CommandMenu() {
  const [open, setOpen] = useState(false);
  const { user } = useUser();

  const filesForUser = trpc.userRecentFiles.useQuery(undefined, {
    enabled: auth.currentUser != null,
  });

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
                {filesForUser.data?.map((file) => (
                  <li key={file.id}>
                    <Link to={"/edit/" + file.id}>{file.title}</Link>
                    <span className={s.date}>
                      {new Date(file.lastEdited).toLocaleDateString("de", {
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
