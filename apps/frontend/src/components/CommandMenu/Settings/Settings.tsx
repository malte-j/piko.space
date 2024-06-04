import { Checkbox } from "@/components/Checkbox/Checkbox";
import s from "./Settings.module.scss";
import { useState } from "react";
import { isOSX } from "@/utils/getPlatform";
import { useUser } from "@/state/UserProvider";
import { InlineTextEdit } from "@/components/InlineTextEdit/InlineTextEdit";

export function Settings() {
  const [autoGenerateTitles, setAutoGenerateTitles] = useState(false);
  const { firebaseUser, user } = useUser();

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
          <InlineTextEdit setValue={() => {}} value={user?.name || ""} />
          {firebaseUser?.email && <p>{firebaseUser.email}</p>}
        </div>
      </section>

      <section>
        <Checkbox onChange={setAutoGenerateTitles} value={autoGenerateTitles}>
          Automatically generate titles when opening the {isOSX ? "⌘" : "Ctrl"}{" "}
          + k menu
        </Checkbox>
      </section>
    </div>
  );
}
