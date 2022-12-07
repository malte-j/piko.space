import React, { createContext, useContext, useEffect, useState } from "react";
import { trpc } from "../utils/trpc";
import { getAuth, User as FirebaseUser } from "firebase/auth";

interface User {
  name: string;
  isAnonymous: boolean;
}

interface UserData {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  login: (username: string, isAnonymous?: boolean) => void;
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
      : {
          name: "Anonymous",
          isAnonymous: true,
        };
  });

  const auth = getAuth();

  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);

  useEffect(() => {
    auth.onAuthStateChanged((user) => {
      setFirebaseUser(user);
    });
  });

  function login(username: string, isAnonymous = false) {
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

  return { user, login, signOut, firebaseUser };
}
