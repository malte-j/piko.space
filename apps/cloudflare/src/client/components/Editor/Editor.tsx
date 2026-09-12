import { EditorContent } from "@tiptap/react";
import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";
import { useCommandMenuStore } from "../../state/CommandMenuStore";
import { useUser } from "../../state/UserProvider";
import { mergeFileTitle, parseFileTitle } from "../../utils/fileTitle";
import { generateFileTitle } from "../../utils/prompts";
import { setFileTitle } from "../../utils/api";
import "./Editor.scss";
import { useFileEditor } from "./useFileEditor";

interface EditorProps {
  doc: Y.Doc;
  provider: WebsocketProvider;
  fileTitle: string | null | undefined;
  fileId: string;
}

export default ({ doc, provider, fileTitle, fileId }: EditorProps) => {
  const { user } = useUser();
  const saveFileTitle = useMutation(
    (variables: { fileId: string; title: string }) =>
      setFileTitle(variables.fileId, variables.title),
  );
  const editor = useFileEditor({
    doc,
    user,
    provider,
  });

  const [navOpen] = useCommandMenuStore((state) => [state.navOpen]);

  const { openAIKey, autoGenerateTitle } = useUser().settings;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (
      !navOpen ||
      !openAIKey ||
      !editor ||
      fileTitle !== null ||
      !autoGenerateTitle
    )
      return;
    const fileContent = editor.getText();
    if (fileContent.length === 0) return;

    generateFileTitle(openAIKey, fileContent).then((res) => {
      const { emoji, title } = parseFileTitle(res.choices[0].message.content);
      saveFileTitle.mutate(
        {
          fileId: fileId,
          title: mergeFileTitle(emoji, title),
        },
        {
          onSuccess(_, context) {
            queryClient.invalidateQueries(["recentFiles"]);
            queryClient.setQueryData(
              ["fileTitle", context.fileId],
              context.title,
            );
          },
        }
      );
    });
  }, [navOpen, openAIKey, editor]);

  return <EditorContent editor={editor} />;
};
