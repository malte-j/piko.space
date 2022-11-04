import { FileTextIcon } from "@radix-ui/react-icons";
import { ButtonHTMLAttributes, DetailedHTMLProps } from "react";
import { Link, LinkProps } from "react-router-dom";
import s from "./Logo.module.scss";

export default function Logo(props: React.HTMLAttributes<HTMLAnchorElement>) {
  return (
    <Link className={s.logo} {...props} to="/">
      <img src="/LogoV2.svg" alt="Logo" />
    </Link>
  );
}
