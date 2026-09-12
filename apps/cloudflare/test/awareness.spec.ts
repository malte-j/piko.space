import { describe, expect, it } from "vitest";
import { getOnlineUsers } from "../src/client/utils/awareness";
import { getRandomColor } from "../src/client/utils";

describe("getOnlineUsers", () => {
  it("ignores awareness states without a complete user payload", () => {
    const states = new Map<number, unknown>([
      [1, {}],
      [2, { user: undefined }],
      [3, { user: { name: "Missing color" } }],
      [4, { user: { color: "#663399", name: "Malte" } }],
    ]);

    expect(getOnlineUsers(states)).toEqual([
      { clientId: 4, color: "#663399", name: "Malte" },
    ]);
  });
});

describe("getRandomColor", () => {
  it("returns the six-digit RGB format required by y-prosemirror", () => {
    for (let index = 0; index < 100; index += 1) {
      expect(getRandomColor()).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});
