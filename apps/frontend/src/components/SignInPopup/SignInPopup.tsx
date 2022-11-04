import {
  Root,
  Portal,
  Overlay,
  Content,
  Title,
  Action,
} from "@radix-ui/react-alert-dialog";
import { useEffect, useState } from "react";
import Button from "../Button/Button";
import Logo from "../Logo/Logo";
import s from "./SignInPopup.module.scss";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { googleAuthProvider } from "../../utils/auth";
import { useUser } from "../../state/UserProvider";
import { ArrowLeftIcon, EnterIcon, Pencil1Icon } from "@radix-ui/react-icons";
import Input from "../Input/Input";

const auth = getAuth();

export default function SignInPopup() {
  const [screen, setScreen] = useState<"initial" | "anonymous">("initial");
  const { login, user } = useUser();
  const [username, setUsername] = useState("");

  // useEffect(() => {

  // }, [user])

  if (!user?.isAnonymous) return null;

  return (
    <Root open={true}>
      <Portal>
        <Content className={s.modal} aria-label="Sign In">
          <div className={s.inner}>
            {(screen === "initial" && (
              <>
                <Logo
                  style={{
                    width: "100%",
                  }}
                />

                <div className={s.spacer}></div>

                <div className={s.aside}>
                  <Button onClick={() => setScreen("anonymous")}>
                    Continue without Login
                  </Button>
                  <Button
                    onClick={() => {
                      signInWithPopup(auth, googleAuthProvider).then(
                        (result) => {
                          const credential =
                            GoogleAuthProvider.credentialFromResult(result);
                          const token = credential?.accessToken;
                          const user = result.user;
                          console.log(token, user);
                          login(user?.displayName || "Anonymous");
                        }
                      );
                    }}
                  >
                    <img src="/GoogleIcon.svg" />
                    Sign-In with Google
                  </Button>
                </div>
              </>
            )) ||
              (screen === "anonymous" && (
                <>
                  <Button variant="clear" onClick={() => setScreen("initial")}>
                    <ArrowLeftIcon /> Change Sign-In method
                  </Button>

                  <div className={s.spacerSm}></div>

                  <div className={s.group}>
                    <Input
                      label="Username"
                      onChange={(e) => setUsername(e.target.value)}
                      value={username}
                      placeholder="Albert Einstein"
                    />
                    <Button
                      disabled={username.length < 1}
                      onClick={() => {
                        if (username.length === 0) return;
                        login(username);
                      }}
                    >
                      <Pencil1Icon />
                      Start Writing
                    </Button>
                  </div>
                </>
              ))}
          </div>
        </Content>
      </Portal>
    </Root>
  );
}
