import React, { createContext, useContext, useEffect, useState } from "react";
import { getAuth, User as FirebaseUser } from "firebase/auth";
import { listModels } from "../utils/openAI";
import { useYjsDoc } from "@/hooks/useYjsDoc";

export interface User {
  name: string;
  isAnonymous: boolean;
}

interface UserData {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  openAIKey: string | null;
  login: (username: string, isAnonymous?: boolean) => void;
  signOut: () => void;
  setOpenAIKey: (key: string) => void;
  openAIKeyError: string | null;
  settings: {
    autoGenerateTitles: boolean;
  };
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

/**
 * 👤 USER CONTEXT PROVIDER
 */
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

  // 🔥 Firebase Auth
  const auth = getAuth();
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  useEffect(() => auth.onAuthStateChanged(setFirebaseUser));

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

  // 🤖 OpenAI
  const [openAIKey, _setOpenAIKey] = useState<string | null>(
    localStorage?.getItem("openai-key") || null
  );
  const [openAIKeyError, _setOpenAIKeyError] = useState<string | null>(null);

  const setOpenAIKey = async (key: string) => {
    try {
      await listModels({ apiKey: key }).then(console.log);
      localStorage?.setItem("openai-key", key);
      _setOpenAIKey(key);
      _setOpenAIKeyError(null);
    } catch (e: any) {
      _setOpenAIKeyError(e.message);
    }
  };

  // 🛠️ Settings
  const settingsDoc = useYjsDoc(firebaseUser?.uid + "/settings", {
    disabled: !firebaseUser,
  });

  return {
    user,
    login,
    signOut,
    firebaseUser,
    openAIKey,
    setOpenAIKey,
    openAIKeyError,
    
  };
}
