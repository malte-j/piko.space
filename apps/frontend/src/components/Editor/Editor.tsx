import Bold from "@tiptap/extension-bold";
import BulletList from "@tiptap/extension-bullet-list";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import Document from "@tiptap/extension-document";
import HardBreak from "@tiptap/extension-hard-break";
import Heading from "@tiptap/extension-heading";
import Italic from "@tiptap/extension-italic";
import Link from "@tiptap/extension-link";
import ListItem from "@tiptap/extension-list-item";
import OrderedList from "@tiptap/extension-ordered-list";
import Paragraph from "@tiptap/extension-paragraph";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Text from "@tiptap/extension-text";
import { EditorContent, useEditor } from "@tiptap/react";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";
import { useUser } from "../../state/UserProvider";
import { getRandomColor } from "../../utils";
import { isOSX } from "../../utils/getPlatform";
import customLowlight from "./customLowlight";
import "./Editor.scss";

interface EditorProps {
  doc: Y.Doc;
  provider: WebsocketProvider;
}

export default ({ doc, provider }: EditorProps) => {
  const { user } = useUser();

  const editor = useEditor(
    {
      extensions: [
        Document,
        Paragraph,
        HardBreak,
        Text,
        Bold,
        Italic,
        ListItem,
        BulletList,
        OrderedList,
        Heading.configure({
          levels: [1, 2, 3, 4],
        }),
        Link.configure({
          openOnClick: false,
        }),
        TaskList,
        TaskItem.configure({
          nested: true,
        }),
        CodeBlockLowlight.configure({
          lowlight: customLowlight,
          HTMLAttributes: {
            autocomplete: "off",
            spellcheck: false,
            autocorrect: "off",
            autocapiatlize: "off",
          },
        }),
        Collaboration.configure({
          document: doc,
        }),
        CollaborationCursor.configure({
          provider,
          user: {
            name: user!.name,
            color: getRandomColor(),
          },
        }),
        Placeholder.configure({
          placeholder: `Write something or press ${
            isOSX ? "⌘+k" : "ctrl+k"
          } to open menu`,
        }),
      ],
    },
    [doc, user, provider]
  );

  return <EditorContent editor={editor} />;
};
