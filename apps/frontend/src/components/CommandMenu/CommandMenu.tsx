import { useCommandMenuStore } from "@/state/CommandMenuStore";
import { useUser } from "@/state/UserProvider";
import { auth } from "@/utils/auth";
import { isOSX } from "@/utils/getPlatform";
import { trpc } from "@/utils/trpc";
import useMediaMatch from "@/utils/useMediaMatch";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArchiveIcon,
  FileIcon,
  GearIcon,
  Pencil2Icon,
} from "@radix-ui/react-icons";
import { LayoutGroup, motion } from "framer-motion";
import Fuse from "fuse.js";
import { nanoid } from "nanoid";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthState from "../AuthState/AuthState";
import Button from "../Button/Button";
import s from "./CommandMenu.module.scss";
import File from "./File";
import { PillMenu } from "./PillMenu/PillMenu";
import OpenAISetup from "./VectorSearchSetup";
import { Settings } from "./Settings/Settings";

export default function CommandMenu() {
  const [open, setOpen] = useCommandMenuStore((s) => [s.navOpen, s.setOpen]);
  const { user } = useUser();
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const fileListRef = useRef<HTMLDivElement>(null);

  const isTouch = useMediaMatch("(pointer: coarse)");

  const filesForUser = trpc.file.userRecentFiles.useQuery(undefined, {
    enabled: auth.currentUser != null,
    keepPreviousData: true,
  });

  const fuse = useMemo(() => {
    return new Fuse(filesForUser.data || [], {
      keys: ["title"],
    });
  }, [filesForUser]);

  const [currentTab, setCurrentTab] = useState<
    "recent" | "archive" | "settings"
  >("recent");

  const searchResult = useMemo(() => {
    if (!filesForUser.data) return [];

    if (search === "") {
      switch (currentTab) {
        case "recent":
          return filesForUser.data.filter((file) => file.title != null);
        case "archive":
          return filesForUser.data.filter((file) => file.title == null);
      }
    }
    return fuse.search(search).map((res) => res.item);
  }, [fuse, search]);

  const hasRecentFiles = useMemo(
    () => filesForUser.data?.find((file) => file.title != null) != null,
    [filesForUser.data]
  );

  useEffect(() => {
    document.addEventListener("keydown", (e) => {
      // open on (⌘ / ctrl) + k
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
                placeholder="search..."
                className={s.searchBar}
                onKeyDown={(e) => {
                  if (searchResult.length == 0) return;
                  if (e.key != "Enter") return;
                  setOpen(false);
                  navigate(`/edit/${searchResult[0].id}`);
                  setSearch("");
                }}
              />
              <PillMenu
                activeTab={currentTab}
                setActiveTab={setCurrentTab}
                tabs={[
                  {
                    label: "Recent Documents",
                    value: "recent",
                    icon: <FileIcon />,
                  },
                  {
                    label: "Archive",
                    value: "archive",
                    icon: <ArchiveIcon />,
                  },
                  {
                    label: "",
                    value: "settings",
                    icon: <GearIcon />,
                  },
                ]}
              />
              <div
                ref={fileListRef}
                className={s.files}
                style={
                  {
                    "--height": searchHeight + "px",
                    display:
                      currentTab == "recent" || currentTab == "archive"
                        ? undefined
                        : "none",
                  } as any
                }
                data-height={searchHeight + " px"}
                data-search-active={search != ""}
              >
                {!hasRecentFiles && currentTab === "recent" && (
                  <p className={s.placeholderHint}>
                    Name a file to make it show up in "Recent Documents"
                  </p>
                )}

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
              <div
                style={
                  currentTab !== "settings" ? { display: "none" } : undefined
                }
              >
                <Settings />
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
              <OpenAISetup />
            </motion.div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
