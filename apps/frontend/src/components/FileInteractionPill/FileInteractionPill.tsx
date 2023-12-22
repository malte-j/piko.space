import { Link2Icon } from "@radix-ui/react-icons";
import React from "react";
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
  const [t, setT] = useState("");
  const [typeCounter, setTypeCount] = useState(0);
  const debounceType = useDebounce<typeof typeCounter>(typeCounter, 500);

  const [emoji, setEmoji] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [lastOpened, setLastOpened] = useState(0);

  const utils = trpc.useContext();

  const mutSetTitle = trpc.file.setFileTitle.useMutation({
    onMutate(variables) {
      console.log("mutating", variables);

      utils.file.getFileTitle.setData(() => variables.title, {
        fileId: id,
      });
    },
    onSuccess(_, context) {
      utils.file.userRecentFiles.invalidate();
      // utils.getFileTitle.setData(() => t, {
      //   fileId: id,
      // });
      // utils.getFileTitle.invalidate({
      //   fileId: id,
      // });
    },
  });

  /**
   * Mutate the title if emoji or title text change
   */
  const saveTitle = (newEmoji?: string) =>
    mutSetTitle.mutate({
      fileId: id,
      title: mergeFileTitle(newEmoji ?? emoji, t),
    });

  /**
   * debounce typing
   */
  useEffect(() => {
    if (debounceType == 0) return;
    console.log("debounce");
    saveTitle();
  }, [debounceType]);

  /**
   * Load emoji and title from title string
   */
  useEffect(() => {
    // if we haven't gotten a network response, return
    if (title === undefined) return;
    if (title === null) {
      setT(id);
      setEmoji("");
      return;
    }

    const { title: titleText, emoji, oldFormat } = parseFileTitle(title);

    if (oldFormat) {
      console.log("old format");
      saveTitle(emoji);
      return;
    }
    setT(titleText);
    setEmoji(emoji);
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
              setEmoji("");
              saveTitle("");
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
                setEmoji(selection.native);
                saveTitle(selection.native);
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
