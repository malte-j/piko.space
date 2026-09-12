import { Checkbox } from "@/components/Checkbox/Checkbox";
import s from "./Settings.module.scss";
import { useState } from "react";
import { isOSX } from "@/utils/getPlatform";
import { useUser } from "@/state/UserProvider";
import { InlineTextEdit } from "@/components/InlineTextEdit/InlineTextEdit";
import { ApiKeyInput } from "@/components/ApiKeyInput/ApiKeyInput";

export function Settings() {
  const { firebaseUser, user, settings, setUsername } = useUser();
  const {
    autoGenerateTitle,
    setAutoGenerateTitle,
    openAIKey,
    openAIKeyError,
    setOpenAIKey,
  } = settings;

  return (
    <div className={s.settings}>
      <section className={s.userSettings}>
        {user?.name && firebaseUser?.photoURL ? (
          <img
            src={firebaseUser.photoURL}
            referrerPolicy="no-referrer"
            className={s.avatar}
          />
        ) : (
          <div className={s.icon}>{user?.name.at(0)?.toUpperCase()}</div>
        )}

        <div>
          <InlineTextEdit setValue={setUsername} value={user?.name || ""} />
          {firebaseUser?.email && <p>{firebaseUser.email}</p>}
        </div>
      </section>

      <section>
        <ApiKeyInput
          value={openAIKey || ""}
          onChange={setOpenAIKey}
          showNCharacters={3}
          error={openAIKeyError}
          placeholder="Enter your OpenAI API Key"
        />
        <br />

        <Checkbox onChange={setAutoGenerateTitle} value={autoGenerateTitle}>
          Automatically generate titles when opening the {isOSX ? "⌘" : "Ctrl"}{" "}
          + k menu
        </Checkbox>
      </section>
    </div>
  );
}
