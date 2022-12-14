import React, { useEffect, useRef } from "react";
import { Picker, PickerProps } from "emoji-mart";
import data from "@emoji-mart/data";

export default function EmojiMart(
  props: PickerProps & {
    maxFrequentRows?: number;
    emojiButtonSize?: number;
    onClickOutside?: () => void;
    onEmojiSelect?: (selection: { native: string; shortcodes: string }) => void;
    previewPosition?: "top" | "bottom" | "none";
  }
) {
  const ref = useRef<Picker>();
  const instance = useRef<Picker>();

  if (instance.current) {
    // @ts-ignore
    instance.current.update(props);
  }

  useEffect(() => {
    instance.current = new Picker({ ...props, ref, data } as any);

    return () => {
      instance.current = undefined;
    };
  }, []);

  return React.createElement("div", { ref });
}
