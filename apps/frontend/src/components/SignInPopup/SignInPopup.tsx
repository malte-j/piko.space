import { Content, Portal, Root } from "@radix-ui/react-alert-dialog";
import { ArrowRightIcon } from "@radix-ui/react-icons";
import {
  getAuth,
  GoogleAuthProvider,
  signInAnonymously,
  signInWithPopup,
} from "firebase/auth";
import { useState } from "react";
import { useUser } from "../../state/UserProvider";
import { googleAuthProvider } from "../../utils/auth";
import Button from "../Button/Button";
import Input from "../Input/Input";
import Logo from "../Logo/Logo";
import s from "./SignInPopup.module.scss";

const auth = getAuth();

export default function SignInPopup() {
  const { login, user } = useUser();
  const [username, setUsername] = useState("");

  if (!user?.isAnonymous) return null;

  return (
    <Root open={true}>
      <Portal>
        <Content className={s.modal} aria-label="Sign In">
          <div className={s.inner}>
            <Logo
              style={{
                width: "100%",
              }}
            />

            <div className={s.spacer}></div>

            <div className={s.aside}>
              <div className={s.group}>
                <Input
                  label=""
                  onChange={(e) => setUsername(e.target.value)}
                  value={username}
                  maxLength={30}
                  placeholder="What's your name?"
                  onKeyUp={(e) => {
                    console.log(e);

                    if (e.key == "Enter" && username.length > 0) {
                      signInAnonymously(auth);
                      login(username, true);
                    }
                  }}
                />
                <Button
                  onClick={() => {
                    if (username.length === 0) return;

                    signInAnonymously(auth);
                    login(username, true);
                  }}
                >
                  <ArrowRightIcon />
                  Enter
                </Button>
              </div>

              <p className={s.orDivider}>or</p>

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
          </div>
        </Content>
      </Portal>
    </Root>
  );
}
