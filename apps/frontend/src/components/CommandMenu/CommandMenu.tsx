import * as Dialog from "@radix-ui/react-dialog";
import Fuse from "fuse.js";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCommandMenuStore } from "../../state/CommandMenuStore";
import { useUser } from "../../state/UserProvider";
import { auth } from "../../utils/auth";
import { trpc } from "../../utils/trpc";
import AuthState from "../AuthState/AuthState";
import s from "./CommandMenu.module.scss";

export default function CommandMenu() {
  const [open, setOpen] = useCommandMenuStore((state) => [
    state.navOpen,
    state.setOpen,
  ]);
  const { user } = useUser();
  const [search, setSearch] = useState("");

  const filesForUser = trpc.userRecentFiles.useQuery(undefined, {
    enabled: auth.currentUser != null,
  });

  const fuse = useMemo(() => {
    return new Fuse(filesForUser.data || [], {
      keys: ["title"],
    });
  }, [filesForUser]);

  const searchResult = useMemo(() => {
    if (search === "") return filesForUser.data || [];
    return fuse.search(search).map((res) => res.item);
  }, [fuse, search]);

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
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="suche..."
              className={s.searchBar}
            />
            <div className={s.files}>
              <ul>
                {searchResult.map((file) => (
                  <li key={file.id}>
                    <Link
                      to={"/edit/" + file.id}
                      onClick={() => setOpen(false)}
                    >
                      {file.title}
                    </Link>
                    <span className={s.date}>
                      {new Date(file.lastEdited * 1000).toLocaleDateString(
                        "de",
                        {
                          day: "2-digit",
                          month: "2-digit",
                          year: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
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
