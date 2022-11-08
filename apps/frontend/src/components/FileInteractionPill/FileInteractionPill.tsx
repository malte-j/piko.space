import { Link2Icon } from "@radix-ui/react-icons";
import { useEffect, useState } from "react";
import { trpc } from "../../utils/trpc";
import data from "@emoji-mart/data";
// import Picker from "@emoji-mart/react";
import s from "./FileInteractionPill.module.scss";
import EmojiMart from "../EmojiMart/EmojiMart";

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

  useEffect(() => {
    const emojiRegex = /^\p{Emoji} /u;

    if (emojiRegex.test(title)) {
      const emojiAndText = title.match(/(.*?) (.*)/);
      setEmoji(emojiAndText![1]);
      setT(emojiAndText![2]);
    } else {
      setT(title);
      setEmoji("");
    }
  }, [title]);
  const utils = trpc.useContext();

  const mutSetTitle = trpc.setFileTitle.useMutation({
    onSuccess(input) {
      utils.userRecentFiles.invalidate();
    },
  });

  /**
   * Mutate the title if emoji or title text change
   */
  useEffect(() => {
    mutSetTitle.mutate({
      fileId: id,
      title: emoji !== "" ? emoji + " " + t : t,
    });
  }, [t, emoji]);

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
            }}
            previewPosition="none"
          />
        )}
      </div>

      <span>{t}</span>
      <input type="text" value={t} onChange={(e) => setT(e.target.value)} />

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
