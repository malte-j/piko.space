import { ReactPropTypes } from "react";
import s from "./Input.module.scss";

export default function Input({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  maxLength,
  onKeyUp,
}: {
  label?: string;
  placeholder?: string;
  type?: "text" | "password";
  value: string;
  maxLength?: number;
  onKeyUp?: React.KeyboardEventHandler<HTMLInputElement>;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className={s.label}>
      {label}
      <input
        placeholder={placeholder}
        type={type}
        value={value}
        onChange={onChange}
        maxLength={maxLength}
        onKeyUp={onKeyUp}
      />
    </label>
  );
}
