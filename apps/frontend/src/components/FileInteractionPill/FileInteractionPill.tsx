import { Link2Icon } from "@radix-ui/react-icons";
import React, { useMemo } from "react";
import { useEffect, useState } from "react";
import { mergeFileTitle, parseFileTitle } from "../../utils/fileTitle";
import { trpc } from "../../utils/trpc";
import useDebounce from "../../utils/useDebounce";
import s from "./FileInteractionPill.module.scss";

const AsyncEmojiMart = React.lazy(() => import("../EmojiMart/EmojiMart"));

export default function FileInteractionPill({
  id,
  title,
  copyText,
}: {
  id: string;
  title: string | null | undefined;
  copyText: string;
}) {
  const [typeCounter, setTypeCount] = useState(0);
  const debounceType = useDebounce<typeof typeCounter>(typeCounter, 500);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [lastOpened, setLastOpened] = useState(0);

  const { emoji, title: titleText } = useMemo(
    () => parseFileTitle(title),
    [title]
  );
  const [t, setT] = useState(titleText);
  useEffect(() => setT(parseFileTitle(title).title), [title]); // changes from parent override local state (when title changes from parent, update local state)

  const utils = trpc.useContext();

  const saveTitle = trpc.file.setFileTitle.useMutation({
    onMutate(variables) {
      utils.file.getFileTitle.setData(() => variables.title, {
        fileId: id,
      });
    },
    onSuccess() {
      utils.file.userRecentFiles.invalidate();
    },
  });

  /**
   * debounce typing
   */
  useEffect(() => {
    if (debounceType == 0) return;
    console.log("debounce");
    saveTitle.mutate({
      fileId: id,
      title: mergeFileTitle(emoji, t),
    });
  }, [debounceType]);

  /**
   * Load emoji and title from title string
   */
  useEffect(() => {
    console.log("title change", title);

    // if we haven't gotten a network response, return
    if (title === undefined) return;

    const { title: titleText, emoji, oldFormat } = parseFileTitle(title);

    if (oldFormat) {
      saveTitle.mutate({
        fileId: id,
        title: mergeFileTitle(emoji, titleText),
      });
      return;
    }
  }, [title]);

  return (
    <div className={s.copyToClipboard}>
      <div className={s.emojiPicker}>
        <div
          className={s.emojiPlaceholder}
          data-has-emoji={emoji !== ""}
          onClick={() => {
            if (emoji === "") {
              setShowEmojiPicker(true);
              setLastOpened(Date.now());
            } else {
              saveTitle.mutate({
                fileId: id,
                title: mergeFileTitle("", t),
              });
            }
          }}
        >
          {emoji}
        </div>
        <React.Suspense fallback={null}>
          {showEmojiPicker && (
            <AsyncEmojiMart
              autoFocus={true}
              emojiSize={18}
              maxFrequentRows={0}
              emojiButtonSize={26}
              onClickOutside={() => {
                if (Date.now() - lastOpened > 100) {
                  setShowEmojiPicker(false);
                }
              }}
              onEmojiSelect={(selection) => {
                setShowEmojiPicker(false);
                saveTitle.mutate({
                  fileId: id,
                  title: mergeFileTitle(selection.native, t),
                });
              }}
              previewPosition="none"
            />
          )}
        </React.Suspense>
      </div>

      <span>{t}</span>
      <input
        type="text"
        value={t}
        placeholder="set title…"
        data-empty={t === ""}
        onChange={(e) => setT(e.target.value)}
        onKeyUp={(e) => setTypeCount((t) => t + 1)}
        className={s.titleInput}
      />
      <Link2Icon
        className={s.linkIcon}
        onClick={() => {
          try {
            navigator.clipboard.writeText(copyText);
          } catch (e) {
            console.log(e);
          }
        }}
      />
    </div>
  );
}
