import {
  Extension,
  generateText,
  getHTMLFromFragment,
  getNodeAttributes,
  getTextBetween,
  getTextContentFromNodes,
  Mark,
  mergeAttributes,
  NodeConfig,
  nodePasteRule,
  RawCommands,
} from "@tiptap/core";
import { NodeRange, Node } from "prosemirror-model";

export const MyExtension = Extension.create({
  name: "MyExtension",

  addKeyboardShortcuts() {
    return {
      Tab: () => {
        // console.log(this.editor.commands.insertContent(

        // ));

        const selelectionTo = this.editor.state.selection.to;

        // get all content until selelectionTo

        const nodesBeforeSelection: Node[] = [];

        this.editor.state.doc.content.nodesBetween(
          0,
          selelectionTo,
          (node, start, parent, index) => {
            if (node.isTextblock) nodesBeforeSelection.push(node);
          }
        );

        const textBeforeSelection = nodesBeforeSelection
          .filter((n) => n.textContent)
          .map((n) => n.textContent)
          .join("\n");

        // const markdownBeforeSeletion = getTextContentFromNodes(
        //   nodesBeforeSelection

        console.log(nodesBeforeSelection, textBeforeSelection);

        // insert text

        

        // getTextBetween(
        //   this.editor.state.doc,
        //   0,
        //   selelectionTo,
        //   (node, start, parent, index) => {
        //     console.log(node, start, parent, index);
        //     return true;
        //   }
        // );

        return this.editor.commands.insertContent("\t");
      },
    };
  },
  // do your stuff here
});

// const mark = Mark.create({
//   name: "aiMark",
//   addOptions() {
//     return {
//       HTMLAttributes: {
//         class: "tiptap-ai-insertion",
//       },
//     };
//   },
//   parseHTML() {
//     return [
//       {
//         tag: "span",
//         getAttrs: (e) => e.classList.contains("tiptap-ai-insertion") && null,
//       },
//     ];
//   },
//   renderHTML({ HTMLAttributes: e }) {
//     return ["span", mergeAttributes(this.options.HTMLAttributes, e), 0];
//   },
//   addCommands() {
//     return {
//       setAiMark:
//         () =>
//         ({ commands: e }: { commands: RawCommands }) =>
//           e.setMark(this.name),
//       toggleAiMark:
//         () =>
//         ({ commands: e }: { commands: RawCommands }) =>
//           e.toggleMark(this.name),
//       unsetAiMark:
//         () =>
//         ({ commands: e }: { commands: RawCommands }) =>
//           e.unsetMark(this.name),
//     };
//   },
// });
