import { ButtonHTMLAttributes, DetailedHTMLProps, ReactPropTypes } from "react";
import s from "./Button.module.scss";

export default function Button(
  props: DetailedHTMLProps<
    ButtonHTMLAttributes<HTMLButtonElement>,
    HTMLButtonElement
  > & {
    variant?: "regular" | "clear" | "outline";
  }
) {
  return (
    <button
      {...props}
      className={`${s.button} ${props.className ?? ""}`}
      data-variant={props.variant}
    >
      {props.children}
    </button>
  );
}
