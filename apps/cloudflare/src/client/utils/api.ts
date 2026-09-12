import { hc } from "hono/client";
import type { AppType } from "../../worker";
import { auth } from "./auth";

const api = hc<AppType>(`${window.location.origin}/api`);

export interface RecentFile {
  id: string;
  title: string | null;
  lastEdited: number;
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Authentication required");
  return { Authorization: `Bearer ${token}` };
}

async function expectOk(response: {
  ok: boolean;
  status: number;
  statusText: string;
  text(): Promise<string>;
}): Promise<void> {
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API request failed (${response.status}): ${body}`);
  }
}

export async function getFileTitle(fileId: string): Promise<string | null> {
  const response = await api.files[":fileId"].title.$get({ param: { fileId } });
  await expectOk(response);
  return (await response.json() as { title: string | null }).title;
}

export async function getRecentFiles(): Promise<RecentFile[]> {
  const response = await api.files.recent.$get({}, { headers: await authHeaders() });
  await expectOk(response);
  return (await response.json() as { files: RecentFile[] }).files;
}

export async function registerFileOpen(fileId: string): Promise<void> {
  const response = await api.files[":fileId"].open.$post(
    { param: { fileId } },
    { headers: await authHeaders() },
  );
  await expectOk(response);
}

export async function setFileTitle(fileId: string, title: string): Promise<string> {
  const response = await api.files[":fileId"].title.$put(
    { param: { fileId }, json: { title } },
    { headers: await authHeaders() },
  );
  await expectOk(response);
  return (await response.json() as { title: string }).title;
}

export async function removeRecentFile(fileId: string): Promise<void> {
  const response = await api.files[":fileId"].recent.$delete(
    { param: { fileId } },
    { headers: await authHeaders() },
  );
  await expectOk(response);
}

export function websocketBaseUrl(): string {
  const url = new URL(window.location.origin);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/ws";
  return url.toString().replace(/\/$/, "");
}
