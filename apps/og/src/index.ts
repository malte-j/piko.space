import { renderOGImage } from "./render";
import * as express from "express";
import CONFIG from "./config";
import { z } from "zod";
import { getFileTitle } from "./api";
import * as fs from "fs/promises";

const app = express();
try {
  fs.mkdir(CONFIG.cacheDirectory, { recursive: true });
} catch (e) {
  console.log("Error creating cache directory: ", e);
}

app.get("/", async (req, res) => {
  const fileIdParse = z.string().safeParse(req.query.fileId);
  if (!fileIdParse.success) return res.status(400).send("Invalid fileId");

  const fileTitle = await getFileTitle(fileIdParse.data);
  if (!fileTitle) return res.status(404).send("File not found");

  const sendFileOptions = {
    maxAge: "1y",
    root: CONFIG.cacheDirectory,
    lastModified: false,
    dotfiles: "deny",
  };
  try {
    res.sendFile(fileTitle.hash + ".png", sendFileOptions, (err) => {
      if (!err) return;
      console.log("Rendering OG image for " + fileTitle.name);

      res.set("Content-Type", "image/png");
      res.set("Cache-Control", `public, max-age=${60 * 60 * 24}`); // 1 day
      renderOGImage(fileTitle.name, fileTitle.hash + ".png")
        .then(({ file }) => {
          res.end(file);
        })
        .catch((e) => console.log(e));
    });
  } catch (e) {
    console.log("Error: ", e);
    res.status(500).send("Internal server error");
  }
});

app.listen(CONFIG.port, () => {
  console.log(
    `piko.space OG Image Generator listening at http://${CONFIG.host}:${CONFIG.port}`
  );
  console.log(`Using cache directory: ${CONFIG.cacheDirectory}`);
});
