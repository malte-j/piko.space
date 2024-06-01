import { useState } from "react";
import Input from "../Input/Input";
import Button from "../Button/Button";
import s from "./OpenAISetup.module.scss";
import ss from "./CommandMenu.module.scss";

import { useUser } from "../../state/UserProvider";

export default function OpenAISetup() {
  const [apiKey, setApiKey] = useState("");
  const { openAIKey, setOpenAIKey, openAIKeyError } = useUser();

  if (openAIKey != null) return null;

  return (
    <>
      <div className={ss.divider}></div>

      <div className={s.root}>
        <div className={s.announcement}>
          <div className={s.pill}>
            <img
              className={s.sparkleIcon}
              src="/icons/sparkle.svg"
              alt="svg of stars"
            />{" "}
            NEW{" "}
          </div>
          <p>
            Automatically generate a title for your new documents! Enter your
            OpenAI API Key to get started, more features coming soon.
          </p>
        </div>

        <div className={s.aside}>
          <Input
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="API Key"
          />
          <Button onClick={() => setOpenAIKey(apiKey)}>Save</Button>
        </div>

        {openAIKeyError && <div className={s.error}>{openAIKeyError}</div>}
      </div>
    </>
  );
}
