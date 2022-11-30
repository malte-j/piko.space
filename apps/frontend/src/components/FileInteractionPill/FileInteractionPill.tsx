import data from "@emoji-mart/data";
import { Link2Icon } from "@radix-ui/react-icons";
import { useEffect, useState } from "react";
import { trpc } from "../../utils/trpc";
import EmojiMart from "../EmojiMart/EmojiMart";
import s from "./FileInteractionPill.module.scss";

export default function FileInteractionPill({
  id,
  title,
  copyText,
}: {
  id: string;
  title: string;
  copyText: string;
}) {
  const [t, setT] = useState(title);
  const [emoji, setEmoji] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [lastOpened, setLastOpened] = useState(0);

  const utils = trpc.useContext();

  const mutSetTitle = trpc.setFileTitle.useMutation({
    onSuccess(_, context) {
      utils.userRecentFiles.invalidate();
      utils.getFileTitle.setData(() => context.title, {
        fileId: context.fileId,
      });
    },
  });

  /**
   * Mutate the title if emoji or title text change
   */
  const saveTitle = (emoji: string, title?: string) =>
    mutSetTitle.mutate({
      fileId: id,
      title: emoji !== "" ? emoji + "\uE000" + (title ?? t) : title ?? t,
    });

  useEffect(() => {
    // match <emoji>\uE000<title>
    // \uE000 is a private use character that is not a valid emoji
    const seperatorMatch = title.match(/^(.*)\uE000(.*)/);
    if (seperatorMatch) {
      const [_, emoji, title] = seperatorMatch;
      setEmoji(emoji);
      setT(title);
      return;
    }

    const emojiRegex = /^\p{Emoji} /u;
    if (emojiRegex.test(title)) {
      const [_, emoji, text] = title.match(/(.*?) (.*)/)!;
      setEmoji(emoji);
      setT(text);
      saveTitle(emoji, text);
    } else {
      setT(title);
      setEmoji("");
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
              setEmoji("");
              saveTitle("");
            }
          }}
        >
          {emoji}
        </div>
        {showEmojiPicker && (
          <EmojiMart
            data={data}
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
      </div>

      <span>{t}</span>
      <input
        type="text"
        value={t}
        onChange={(e) => setT(e.target.value)}
        onKeyUp={() => saveTitle(emoji)}
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
