export interface OnlineUser {
  clientId: number;
  color: string;
  name: string;
}

export function getOnlineUsers(
  states: ReadonlyMap<number, unknown>,
): OnlineUser[] {
  const users: OnlineUser[] = [];

  for (const [clientId, state] of states) {
    if (typeof state !== "object" || state === null) continue;

    const user = (state as { user?: unknown }).user;
    if (typeof user !== "object" || user === null) continue;

    const { color, name } = user as { color?: unknown; name?: unknown };
    if (typeof color !== "string" || typeof name !== "string") continue;

    users.push({ clientId, color, name });
  }

  return users;
}
