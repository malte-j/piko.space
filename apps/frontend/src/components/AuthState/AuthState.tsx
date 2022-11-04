import { ExitIcon } from "@radix-ui/react-icons";
import { useUser } from "../../state/UserProvider";
import s from "./AuthState.module.scss";
import { client, trpc } from "../../utils/trpc";

export default function AuthState() {
  const { user, signOut } = useUser();

  return (
    <div className={s.authState}>
      {user?.name ? (
        <div className={s.wrapper}>
          <div className={s.name}>
            <div className={s.icon}>{user.name.at(0)?.toUpperCase()}</div>
            <p>{user.name}</p>
          </div>
          <button
            onClick={() => {
              signOut();
            }}
          >
            <ExitIcon /> Sign-Out
          </button>
        </div>
      ) : (
        <h1>Not logged in</h1>
      )}
    </div>
  );
}
