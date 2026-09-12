import { useEffect, useRef, useState } from "react";
import s from "./InlineTextEdit.module.scss";
import { CheckIcon, Cross2Icon, Pencil1Icon } from "@radix-ui/react-icons";

interface InlineTextEditProps {
  value: string;
  setValue: (value: string) => void;
}

export const InlineTextEdit = (props: InlineTextEditProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing, inputRef.current]);

  const [localValue, setLocalValue] = useState(props.value);
  useEffect(() => setLocalValue(props.value), [props.value]);

  return (
    <div className={s.inlineTextEdit}>
      {isEditing ? (
        <>
          <input
            ref={inputRef}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
          />
          <button
            onClick={() => {
              setIsEditing(false);
              setLocalValue(props.value);
            }}
          >
            <Cross2Icon />
          </button>
          <button
            onClick={() => {
              setIsEditing(false);
              props.setValue(localValue);
            }}
          >
            <CheckIcon />
          </button>
        </>
      ) : (
        <>
          <p>{props.value}</p>
          <button onClick={async () => setIsEditing(true)}>
            <Pencil1Icon />
          </button>
        </>
      )}
    </div>
  );
};
