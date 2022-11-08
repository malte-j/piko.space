import React, { useEffect, useRef } from "react";
import { Picker, PickerProps } from "emoji-mart";

export default function EmojiMart(
  props: PickerProps & {
    data: any;
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
    instance.current = new Picker({ ...props, ref } as any);

    return () => {
      instance.current = undefined;
    };
  }, []);

  return React.createElement("div", { ref });
}
