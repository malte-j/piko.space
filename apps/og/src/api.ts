import { redis } from "./redis";
import * as crypto from "crypto";

export async function getFileTitle(fileId: string) {
  const name = (await redis.hget("filenames", fileId)) || null;
  if (!name) return null;
  return {
    name: fileTitleToString(name),
    hash: getTitleHash(name),
  };
}

export function getTitleHash(fileTitle: string) {
  return crypto.createHash("sha256").update(fileTitle).digest("hex");
}

export function fileTitleToString(title: string) {
  return title.replace("\uE000", " ");
}
