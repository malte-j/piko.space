import { FilePlusIcon, PlusCircledIcon, PlusIcon } from "@radix-ui/react-icons";
import { nanoid } from "nanoid";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import s from "./AddFileInteraction.module.scss";

export default function AddFileInteration() {
  const [filename, setFilename] = useState("");
  let navigate = useNavigate();

  const createFile = () => {
    setFilename("");
    navigate("/edit/" + nanoid(11));
  };

  return (
    <div className={s.addFileInteraction} data-empty={filename.length == 0}>
      <input
        type="text"
        placeholder=" "
        value={filename}
        onChange={(e) => setFilename(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            createFile();
          } else if (e.key === "Escape") {
            setFilename("");
            e.target.blur();
          }
        }}
      />
      {filename.length > 0 && (
        <button onClick={createFile}>
          <PlusCircledIcon />
        </button>
      )}
    </div>
  );
}
