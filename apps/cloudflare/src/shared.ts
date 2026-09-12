export const DOCUMENT_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
export const MAX_WEBSOCKET_MESSAGE_BYTES = 1024 * 1024;
export const MAX_AWARENESS_ATTACHMENT_BYTES = 12 * 1024;
export const COMPACT_AFTER_UPDATES = 256;
export const COMPACT_AFTER_BYTES = 1024 * 1024;
export const MAX_SQLITE_BLOB_BYTES = 1_900_000;

export function isValidDocumentId(value: string): boolean {
  return DOCUMENT_ID_PATTERN.test(value);
}

export function toArrayBuffer(value: Uint8Array): ArrayBuffer {
  return value.buffer.slice(
    value.byteOffset,
    value.byteOffset + value.byteLength,
  ) as ArrayBuffer;
}

export function bytesToBase64(value: Uint8Array): string {
  let binary = "";
  for (let offset = 0; offset < value.length; offset += 0x8000) {
    binary += String.fromCharCode(...value.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

export function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export async function sha256Hex(value: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", toArrayBuffer(value));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
