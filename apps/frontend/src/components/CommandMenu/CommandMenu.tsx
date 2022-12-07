import * as Dialog from "@radix-ui/react-dialog";
import { ArchiveIcon, FileIcon, Pencil2Icon } from "@radix-ui/react-icons";
import { motion } from "framer-motion";
import Fuse from "fuse.js";
import { nanoid } from "nanoid";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCommandMenuStore } from "../../state/CommandMenuStore";
import { useUser } from "../../state/UserProvider";
import { auth } from "../../utils/auth";
import { isOSX } from "../../utils/getPlatform";
import { trpc } from "../../utils/trpc";
import useMediaMatch from "../../utils/useMediaMatch";
import AuthState from "../AuthState/AuthState";
import Button from "../Button/Button";
import s from "./CommandMenu.module.scss";
import File from "./File";

export default function CommandMenu() {
  const [open, setOpen] = useCommandMenuStore((state) => [
    state.navOpen,
    state.setOpen,
  ]);
  const { user } = useUser();
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const fileListRef = useRef<HTMLDivElement>(null);

  const isTouch = useMediaMatch("(pointer: coarse)");

  const filesForUser = trpc.userRecentFiles.useQuery(undefined, {
    enabled: auth.currentUser != null,
    keepPreviousData: true,
  });

  const fuse = useMemo(() => {
    return new Fuse(filesForUser.data || [], {
      keys: ["title"],
    });
  }, [filesForUser]);

  const [currentFileList, setCurrentFileList] = useState<"recent" | "archive">(
    "recent"
  );

  const searchResult = useMemo(() => {
    if (!filesForUser.data) return [];

    if (search === "") {
      switch (currentFileList) {
        case "recent":
          return filesForUser.data.filter((file) => file.title != null);
        case "archive":
          return filesForUser.data.filter((file) => file.title == null);
      }
    }
    return fuse.search(search).map((res) => res.item);
  }, [fuse, search]);

  useEffect(() => {
    // open on command k
    document.addEventListener("keydown", (e) => {
      // open on ctrl k
      if (e.key === "k" && (isOSX ? e.metaKey : e.ctrlKey)) {
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
          <Dialog.Content
            onOpenAutoFocus={(e) => isTouch && e.preventDefault()}
            className={s.content}
            asChild
          >
            <motion.div
              layout="position"
              transition={{
                duration: 0.2,
                ease: "easeInOut",
              }}
            >
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
              <div className={s.fileListMenu}>
                <button
                  data-active={currentFileList === "recent"}
                  onClick={() => setCurrentFileList("recent")}
                >
                  <FileIcon /> <span>Recent Documents</span>
                  {currentFileList === "recent" && (
                    <motion.div
                      layoutId="navBackground"
                      className={s.navBackground}
                      transition={{ duration: 0.2 }}
                    >
                      {" "}
                    </motion.div>
                  )}
                </button>
                <button
                  data-active={currentFileList === "archive"}
                  onClick={() => setCurrentFileList("archive")}
                >
                  <ArchiveIcon /> <span>Archive</span>
                  {currentFileList === "archive" && (
                    <motion.div
                      layoutId="navBackground"
                      className={s.navBackground}
                      transition={{ duration: 0.2 }}
                    >
                      {" "}
                    </motion.div>
                  )}
                </button>
              </div>
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
                    <File
                      key={file.id}
                      file={file}
                      onClick={() => {
                        setSearch("");
                        setOpen(false);
                      }}
                    />
                  ))}
                </ul>
              </div>
              <div className={s.divider}></div>
              <details>
                <summary>Details</summary>
                <File
                  file={{
                    id: nanoid(),
                    title: "Neues Dokument",
                    lastEdited: Date.now() / 1000,
                  }}
                  onClick={() => {}}
                />
              </details>
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
            </motion.div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
