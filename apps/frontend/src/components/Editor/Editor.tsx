import Collaboration from "@tiptap/extension-collaboration";
import { BubbleMenu, EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import * as Y from "yjs";
import "./Editor.scss";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import { WebsocketProvider } from "y-websocket";
import {
  FontBoldIcon,
  FontItalicIcon,
  StrikethroughIcon,
} from "@radix-ui/react-icons";
import { getRandomColor } from "../../utils";
import { useUser } from "../../state/UserProvider";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";

interface EditorProps {
  doc: Y.Doc;
  provider: WebsocketProvider;
}

export default function Editor({ doc, provider }: EditorProps) {
  const { user } = useUser();

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          // The Collaboration extension comes with its own history handling
          history: false,
        }),
        // Register the document with Tiptap
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
          placeholder: "Write something …",
        }),
        TaskList,
        TaskItem.configure({
          nested: true,
        }),
        Link.configure({
          openOnClick: false,
        }),
      ],
    },
    [doc, user]
  );

  return (
    <>
      {editor && (
        <BubbleMenu
          className="bubbleMenu"
          editor={editor}
          tippyOptions={{ duration: 100, animation: "fade", offset: [0, 6] }}
        >
          <button
            data-active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <FontBoldIcon
              color={
                editor.isActive("bold")
                  ? "var(--col-active)"
                  : "var(--col-inactive)"
              }
            />
          </button>
          <button
            data-active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <FontItalicIcon
              color={
                editor.isActive("italic")
                  ? "var(--col-active)"
                  : "var(--col-inactive)"
              }
            />
          </button>
          <button
            data-active={editor.isActive("strike")}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <StrikethroughIcon
              color={
                editor.isActive("strike")
                  ? "var(--col-active)"
                  : "var(--col-inactive)"
              }
            />
          </button>
        </BubbleMenu>
      )}
      <EditorContent className="editorWrapper" editor={editor} />
    </>
  );
}
