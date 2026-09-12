import { useYjsDoc } from "@/hooks/useYjsDoc";
import { listModels } from "@/utils/openAI";
import { useEffect, useState } from "react";

export interface UserSettings {
  setOpenAIKey: (key: string) => void;
  openAIKey: string | null;
  openAIKeyError: string | null;

  autoGenerateTitle: boolean;
  setAutoGenerateTitle: (value: boolean) => void;
}

export function useUserSettings(firebaseUserId?: string): UserSettings {
  // 🛠️ Settings
  const settingsDoc = useYjsDoc(`settings_${firebaseUserId ?? "signed_out"}`, {
    disabled: !firebaseUserId,
  });

  // 🤖 OpenAI
  const [openAIKey, _setOpenAIKey] = useState<string | null>(
    localStorage?.getItem("openai-key") || null
  );
  const [openAIKeyError, _setOpenAIKeyError] = useState<string | null>(null);

  const setOpenAIKey = async (key: string) => {
    if (key == "") {
      localStorage?.removeItem("openai-key");
      _setOpenAIKey(null);
      _setOpenAIKeyError(null);
      return;
    }

    try {
      await listModels({ apiKey: key }).then(console.log);
      localStorage?.setItem("openai-key", key);
      _setOpenAIKey(key);
      _setOpenAIKeyError(null);
    } catch (e: any) {
      _setOpenAIKeyError(e.message);
    }
  };

  const [autoGenerateTitle, _setAutoGenerateTitle] = useState(true);

  useEffect(() => {
    if (!settingsDoc) return;

    const onUpdate = () => {
      const autoGenerateTitle = settingsDoc
        .getMap("settings")
        .get("autoGenerateTitle") as boolean;
      _setAutoGenerateTitle(autoGenerateTitle);
    };

    settingsDoc.on("update", onUpdate);

    return () => settingsDoc.off("update", onUpdate);
  }, [settingsDoc]);

  const setAutoGenerateTitle = (value: boolean) => {
    if (!settingsDoc) return;
    settingsDoc.getMap("settings").set("autoGenerateTitle", value);
  };

  return {
    openAIKey,
    setOpenAIKey,
    openAIKeyError,
    autoGenerateTitle,
    setAutoGenerateTitle,
  };
}
