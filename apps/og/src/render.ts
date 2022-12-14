import {
  Canvas,
  FontLibrary,
  loadImage,
  CanvasRenderingContext2D,
} from "skia-canvas/lib";
import * as path from "path";
import * as fs from "fs/promises";
import CONFIG from "./config";

// 🚨 DANGER! Don't load these on each render, because it WILL cause a memory leak!
FontLibrary.use("Inter", [__dirname + "/fonts/Inter/*.otf"]);
FontLibrary.use(
  "Emoji",
  __dirname + "/fonts/NotoEmoji/NotoColorEmoji-Regular.ttf"
);
const imgLoader = loadImage(__dirname + "/assets/og_bg.png");


export async function renderOGImage(
  title: string,
  filename: string
): Promise<{
  file: Buffer;
}> {
  let canvas = new Canvas(600, 315),
    { width, height } = canvas,
    ctx = canvas.getContext("2d");

  const img =   await imgLoader;
  // background image
  ctx.drawImage(img, 0, 0, width, height);

  console.log(`This process is pid ${process.pid}`); 


  ctx.font = "500 28px Inter, Emoji";
  ctx.fillStyle = "#2C0140";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(generateWidthConstrainedString(ctx, title, 430), width / 2, 183);

  const fileBuffer = await canvas.toBuffer("png", { density: 2 });

  try {
    fs.writeFile(path.join(CONFIG.cacheDirectory, filename), fileBuffer);
  } catch (e) {
    console.log("Error writing file: ", e);
  }

  return {
    file: fileBuffer,
  };
}

/**
 * Generate a string that fits width, and adds ellipses if needed
 * @param c Rendering context
 * @param str string to render
 * @param maxWidth max width of string in pixels
 * @returns
 */
function generateWidthConstrainedString(
  c: CanvasRenderingContext2D,
  str: string,
  maxWidth: number
) {
  var width = c.measureText(str).width;
  var ellipsis = "…";
  var ellipsisWidth = c.measureText(ellipsis).width;
  if (width <= maxWidth || width <= ellipsisWidth) {
    return str;
  } else {
    var len = str.length;
    while (width >= maxWidth - ellipsisWidth && len-- > 0) {
      str = str.substring(0, len);
      width = c.measureText(str).width;
    }
    return str + ellipsis;
  }
}
