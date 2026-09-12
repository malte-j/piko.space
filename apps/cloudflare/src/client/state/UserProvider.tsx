import { User as FirebaseUser, getAuth } from "firebase/auth";
import React, { createContext, useContext, useEffect, useState } from "react";
import { UserSettings, useUserSettings } from "./useUserSettings";

export interface User {
  name: string;
  isAnonymous: boolean;
}

interface UserData {
  user: User | null;
  setUsername: (newName: string) => void;
  firebaseUser: FirebaseUser | null;
  signIn: (username: string, isAnonymous?: boolean) => void;
  signOut: () => void;
  settings: UserSettings;
}

// @ts-ignore
const UserContext = createContext<UserData>();

export function UserProvider({
  children,
}: {
  children: React.ReactNode[] | React.ReactNode;
}) {
  const [user, _setUser] = useState<User | null>(() => {
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

  // 🔥 Firebase Auth
  const auth = getAuth();
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  useEffect(() => auth.onAuthStateChanged(setFirebaseUser), [auth]);

  function login(username: string, isAnonymous = false) {
    if (localStorage) localStorage.setItem("username", username);
    _setUser({
      name: username,
      isAnonymous: false,
    });
  }

  function signOut() {
    if (localStorage) localStorage.removeItem("username");
    auth.signOut();
    _setUser({
      name: "anonymous",
      isAnonymous: true,
    });
  }

  function setUsername(newName: string) {
    localStorage.setItem("username", newName);
    _setUser((u) =>
      u
        ? {
            ...u,
            name: newName,
          }
        : null
    );
  }

  // 🛠️ Settings
  const settings = useUserSettings(firebaseUser?.uid);

  return (
    <UserContext.Provider
      value={{
        user,
        setUsername,
        firebaseUser,
        signIn: login,
        signOut,
        settings,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => {
  if (!UserContext)
    throw new Error("useUser must be used within a UserProvider");
  return useContext(UserContext);
};
