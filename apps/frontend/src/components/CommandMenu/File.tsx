import React from "react";
import { Link } from "react-router-dom";
import s from "./CommandMenu.module.scss";

export default function File({
  file,
  onClick,
}: {
  file: {
    id: string;
    title: string | null;
    lastEdited: number;
  };
  onClick: () => void;
}) {
  return (
    <li className={s.file} key={file.id} draggable="true">
      <Link to={"/edit/" + file.id} onClick={onClick} draggable="false">
        {file.title?.replace("\uE000", " ") ?? file.id}
      </Link>
      <span className={s.date}>
        {new Date(file.lastEdited * 1000).toLocaleDateString("de", {
          day: "2-digit",
          month: "2-digit",
          year: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
    </li>
  );
}
