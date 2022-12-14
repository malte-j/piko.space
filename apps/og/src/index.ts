import { renderOGImage } from "./render";
import * as express from "express";
import * as path from "path";
import CONFIG from "./config";
import { z } from "zod";
import { getFileTitle, getTitleHash } from "./api";

const app = express();

app.get("/", async (req, res) => {
  const fileIdParse = z.string().safeParse(req.query.fileId);
  if (!fileIdParse.success) return res.status(400).send("Invalid fileId");

  const fileTitle = await getFileTitle(fileIdParse.data);
  if (!fileTitle) return res.status(404).send("File not found");

  const sendFileOptions = {
    maxAge: "1y",
    root: path.join(__dirname, path.join("..", "_cache")),
    lastModified: false,
    dotfiles: "deny",
  };

  res.sendFile(fileTitle.hash + ".png", sendFileOptions, async (err) => {
    if (!err) return;
    console.log("Rendering OG image for " + fileTitle.name);

    res.set("Content-Type", "image/png");
    res.set("Cache-Control", `public, max-age=${60 * 60 * 24}`); // 1 day
    const { file } = await renderOGImage(
      fileTitle.name,
      fileTitle.hash + ".png"
    );
    res.end(file);
  });
});

app.listen(CONFIG.port, () => {
  console.log(`Example app listening at http://${CONFIG.host}:${CONFIG.port}`);
});
