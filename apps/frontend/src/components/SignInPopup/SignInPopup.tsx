import {
  Root,
  Portal,
  Overlay,
  Content,
  Title,
  Action,
} from "@radix-ui/react-alert-dialog";
import { useState } from "react";
import Button from "../Button/Button";
import Logo from "../Logo/Logo";
import s from "./SignInPopup.module.scss";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { googleAuthProvider } from "../../utils/auth";
import { useUser } from "../../state/UserProvider";
import { ArrowLeftIcon, EnterIcon } from "@radix-ui/react-icons";

const auth = getAuth();

export default function SignInPopup() {
  const [screen, setScreen] = useState<"initial" | "anonymous">("initial");
  const { login, user } = useUser();
  const [username, setUsername] = useState("");

  if (user) return null;

  return (
    <Root open={true}>
      <Portal>
        <Content className={s.modal} aria-label="Sign In">
          <div className={s.inner}>
            <Logo />

            {(screen === "initial" && (
              <div className={s.aside}>
                <Button onClick={() => setScreen("anonymous")}>
                  Continue without Login
                </Button>
                <Button
                  onClick={() => {
                    signInWithPopup(auth, googleAuthProvider).then((result) => {
                      const credential =
                        GoogleAuthProvider.credentialFromResult(result);
                      const token = credential?.accessToken;
                      const user = result.user;
                      console.log(token, user);
                      login(user?.displayName || "Anonymous");
                    });
                  }}
                >
                  <img src="/GoogleIcon.svg" />
                  Sign-In with Google
                </Button>
              </div>
            )) ||
              (screen === "anonymous" && (
                <>
                  <button onClick={() => setScreen("initial")}>
                    <ArrowLeftIcon />
                  </button>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                  <Button
                    onClick={() => {
                      if (username.length === 0) return;
                      login(username);
                    }}
                  >
                    <EnterIcon />
                    Continue
                  </Button>
                </>
              ))}
          </div>
        </Content>
      </Portal>
    </Root>
  );
}
