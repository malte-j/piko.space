import {
  Canvas,
  FontLibrary,
  loadImage,
  CanvasRenderingContext2D,
} from "skia-canvas/lib";
import * as crypto from "crypto";
import * as path from "path";
import * as fs from "fs/promises";

export async function renderOGImage(
  title: string,
  filename: string
): Promise<{
  file: Buffer;
}> {
  await fs.mkdir(path.join(__dirname, "..", "_cache"), { recursive: true });

  let canvas = new Canvas(600, 315),
    { width, height } = canvas,
    ctx = canvas.getContext("2d");

  // background image
  let img = await loadImage(__dirname + "/assets/og_bg.png");
  ctx.drawImage(img, 0, 0, width, height);

  FontLibrary.use("Inter", [__dirname + "/fonts/Inter/*.otf"]);
  FontLibrary.use(
    "Emoji",
    __dirname + "/fonts/NotoEmoji/NotoColorEmoji-Regular.ttf"
  );

  ctx.font = "500 28px Inter, Emoji";
  ctx.fillStyle = "#2C0140";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(generateWidthConstrainedString(ctx, title, 430), width / 2, 183);

  const fileBuffer = await canvas.toBuffer("png", { density: 2 });
  fs.writeFile(path.join("__dirname", "..", "_cache", filename), fileBuffer);

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