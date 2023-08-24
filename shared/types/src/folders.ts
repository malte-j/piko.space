import Y from "yjs";

export class Team {
  ydoc: Y.Doc;

  constructor(ydoc?: Y.Doc) {
    this.ydoc = ydoc ?? new Y.Doc();
  }

  /* array of files in folder, e.g. ["<foldername>/<fileid>", ...]*/
  get docs() {
    return this.ydoc.getArray<Y.Map<string>>("docs");
  }
}
