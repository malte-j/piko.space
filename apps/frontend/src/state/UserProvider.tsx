import React, { createContext, useContext, useEffect, useState } from "react";
import { trpc } from "../utils/trpc";
import { getAuth } from "firebase/auth";
import { GoogleAuthProvider } from "firebase/auth";

interface User {
  name: string;
  isAnonymous: boolean;
}

interface UserData {
  user: User | null;
  login: (username: string) => void;
  signOut: () => void;
}

// @ts-ignore
const UserContext = createContext<UserData>();

export function UserProvider({
  children,
}: {
  children: React.ReactNode[] | React.ReactNode;
}) {
  const value = useUserData();

  const user = trpc.userById.useQuery("1");

  useEffect(() => console.log(user.data), [user]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export const useUser = () => {
  return useContext(UserContext);
};

function useUserData(): UserData {
  const [user, setUser] = useState<User | null>(() => {
    const username = localStorage?.getItem("username");
    return username
      ? {
          name: username,
          isAnonymous: false,
        }
      : null;
  });

  const auth = getAuth();

  function login(username: string) {
    if (localStorage) localStorage.setItem("username", username);
    setUser({
      name: username,
      isAnonymous: false,
    });
  }

  function signOut() {
    if (localStorage) localStorage.removeItem("username");
    auth.signOut();
    setUser({
      name: "anonymous",
      isAnonymous: true,
    });
  }

  return { user, login, signOut };
}
