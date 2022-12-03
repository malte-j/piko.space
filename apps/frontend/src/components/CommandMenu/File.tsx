import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { TrashIcon } from "@radix-ui/react-icons";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { trpc } from "../../utils/trpc";
import useMediaMatch from "../../utils/useMediaMatch";
import s from "./CommandMenu.module.scss";

export default function File({
  file,
  onClick,
}: {
  file: {
    id: string;
    title: string | null;
    lastEdited: number;
  };
  onClick: () => void;
}) {
  const showFileOpenTime = useMediaMatch("(min-width: 500px)");

  return (
    <li className={s.file} key={file.id} draggable="true">
      <Link
        to={"/edit/" + file.id}
        draggable="false"
        onClick={(e) => !e.isDefaultPrevented() && onClick()}
      >
        <div className={s.title}>
          {file.title?.replace("\uE000", " ") ?? file.id}
        </div>
        <div className={s.spacer}></div>

        <DeleteButton fileId={file.id} />

        <span className={s.date}>
          {new Date(file.lastEdited * 1000).toLocaleDateString("de", {
            day: "2-digit",
            month: "2-digit",
            year: "2-digit",
            hour: showFileOpenTime ? "2-digit" : undefined,
            minute: showFileOpenTime ? "2-digit" : undefined,
          })}
        </span>
      </Link>
    </li>
  );
}

export function DeleteButton({ fileId }: { fileId: string }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const utils = trpc.useContext();

  const deleteFileRpc = trpc.deleteFile.useMutation({
    onSuccess() {
      utils.userRecentFiles.setData((d) => {
        return d?.filter((f) => f.id !== fileId);
      });
    },
  });

  function deleteFile(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    e.preventDefault();
    if (location.pathname.includes(fileId)) {
      navigate("/");
    }
    try {
      indexedDB.deleteDatabase("ydoc_" + fileId);
    } catch {}
    deleteFileRpc.mutate({ fileId });
  }

  return (
    <DropdownMenu.Root open={open} onOpenChange={(e) => setOpen(e)}>
      <DropdownMenu.Trigger asChild onClick={(e) => e.preventDefault()}>
        <button className={s.deleteButton} data-open={open}>
          <TrashIcon />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className={s.popover}>
          <button onClick={deleteFile} type="button" className={s.primary}>
            delete
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              setOpen(false);
            }}
            type="button"
            className={s.secondary}
          >
            cancel
          </button>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
