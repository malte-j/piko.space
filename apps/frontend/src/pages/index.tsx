import { EnterIcon, FileTextIcon } from "@radix-ui/react-icons";
import { nanoid } from "nanoid";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUser } from "../state/UserProvider";
import s from "./index.module.scss";

// firebase auth
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { googleAuthProvider } from "../utils/auth";

const auth = getAuth();

export default function Index() {
  const { login } = useUser();
  const [username, setUsername] = useState("");
  let navigate = useNavigate();

  // useEffect(() => {
  //   if (user) {
  //     navigate("/edit/" + nanoid(11), { replace: true });
  //   }
  // }, [user]);

  return (
    <div className={s.wrapper}>
      <div className={s.logo}>
        <FileTextIcon />
        crdtedit
      </div>

      <button onClick={
        () => {
          signInWithPopup(auth, googleAuthProvider).then((result) => {
            const credential = GoogleAuthProvider.credentialFromResult(result);
            const token = credential?.accessToken;
            const user = result.user;
            console.log(token, user);
            login(user?.displayName || "Anonymous");
            navigate("/edit/" + nanoid(11), { replace: true });
          })
        }
      }>
        Sign in.
      </button>

      <label>
        name
        <input
          type="text"
          title="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              login(username);
              navigate("/edit");
            }
          }}
        />
        {username.length > 0 && (
          <a
            onClick={() => {
              login(username);
              navigate("/edit");
            }}
            className="continue"
          >
            <EnterIcon />
          </a>
        )}
      </label>
    </div>
  );
}
