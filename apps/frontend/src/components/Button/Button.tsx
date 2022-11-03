import { ButtonHTMLAttributes, DetailedHTMLProps, ReactPropTypes } from "react";
import s from "./Button.module.scss";

export default function Button(props: DetailedHTMLProps<ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>) {
  return (
    <button className={s.button} {...props}>
      {props.children}
    </button>
  );
}
