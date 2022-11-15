import * as Dialog from "@radix-ui/react-dialog";
import { Pencil2Icon } from "@radix-ui/react-icons";
import Fuse from "fuse.js";
import { nanoid } from "nanoid";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCommandMenuStore } from "../../state/CommandMenuStore";
import { useUser } from "../../state/UserProvider";
import { auth } from "../../utils/auth";
import { trpc } from "../../utils/trpc";
import AuthState from "../AuthState/AuthState";
import Button from "../Button/Button";
import s from "./CommandMenu.module.scss";

export default function CommandMenu() {
  const [open, setOpen] = useCommandMenuStore((state) => [
    state.navOpen,
    state.setOpen,
  ]);
  const { user } = useUser();
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const fileListRef = useRef<HTMLDivElement>(null);

  const filesForUser = trpc.userRecentFiles.useQuery(undefined, {
    enabled: auth.currentUser != null,
    keepPreviousData: true,
    onSuccess(data) {
      if (!data) return;

      window.localStorage.setItem("user:recent_files", JSON.stringify(data));
    },
    initialData: () => {
      const prevRecentFiles = window.localStorage.getItem("user:recent_files");
      if (!prevRecentFiles) return;
      try {
        return JSON.parse(prevRecentFiles);
      } catch (e) {
        return;
      }
    },
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

  const [searchHeight, setSearchHeight] = useState(0);

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
              onChange={(e) => {
                if (search == "" || e.target.value == "") {
                  setSearchHeight(fileListRef.current?.scrollHeight || 0);
                }
                setSearch(e.target.value);
              }}
              placeholder="suche..."
              className={s.searchBar}
              onKeyDown={(e) => {
                if (searchResult.length == 0) return;
                if (e.key != "Enter") return;
                setOpen(false);
                navigate(`/edit/${searchResult[0].id}`);
                setSearch("");
              }}
            />
            <div
              ref={fileListRef}
              className={s.files}
              style={
                {
                  "--height": searchHeight + "px",
                } as any
              }
              data-height={searchHeight + " px"}
              data-search-active={search != ""}
            >
              <ul>
                {searchResult.map((file) => (
                  <li key={file.id}>
                    <Link
                      to={"/edit/" + file.id}
                      onClick={() => {
                        setSearch("");
                        setOpen(false);
                      }}
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
            <div className={s.bottomBar}>
              <Button
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  navigate("/edit/" + nanoid(11));
                }}
              >
                <Pencil2Icon />
                <span>new doc</span>
              </Button>
              <AuthState />
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
