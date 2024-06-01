import { EditorContent } from "@tiptap/react";
import { useEffect } from "react";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";
import { useCommandMenuStore } from "../../state/CommandMenuStore";
import { useUser } from "../../state/UserProvider";
import { mergeFileTitle, parseFileTitle } from "../../utils/fileTitle";
import { generateFileTitle } from "../../utils/prompts";
import { trpc } from "../../utils/trpc";
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
  const setFileTitle = trpc.file.setFileTitle.useMutation();
  const editor = useFileEditor({
    doc,
    user,
    provider,
  });

  const [navOpen] = useCommandMenuStore((state) => [state.navOpen]);

  const openAIKey = useUser().openAIKey;
  const utils = trpc.useContext();

  useEffect(() => {
    if (!navOpen || !openAIKey || !editor || fileTitle !== null) return;
    const fileContent = editor.getText();
    if (fileContent.length === 0) return;

    generateFileTitle(openAIKey, fileContent).then((res) => {
      const { emoji, title } = parseFileTitle(res.choices[0].message.content);
      setFileTitle.mutate(
        {
          fileId: fileId,
          title: mergeFileTitle(emoji, title),
        },
        {
          onSuccess(_, context) {
            utils.file.userRecentFiles.invalidate();
            utils.file.getFileTitle.setData(() => context.title, {
              fileId: context.fileId,
            });
          },
        }
      );
    });
  }, [navOpen, openAIKey, editor]);

  return <EditorContent editor={editor} />;
};
