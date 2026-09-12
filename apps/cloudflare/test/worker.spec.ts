import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

describe("Hono Worker", () => {
  it("serves health and validates document IDs", async () => {
    const health = await exports.default.fetch("http://example.com/api/health");
    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ status: "ok" });

    const invalid = await exports.default.fetch("http://example.com/api/files/bad.id/title");
    expect(invalid.status).toBe(400);
  });

  it("reads public titles from D1", async () => {
    await env.DB.prepare(
      "INSERT INTO documents(file_id, title, title_version, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    ).bind("public-doc", "Public title", "version", 1, 1).run();

    const response = await exports.default.fetch(
      "http://example.com/api/files/public-doc/title",
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ title: "Public title" });
  });

  it("renders versioned Open Graph PNGs", async () => {
    const title = "Cloudflare document";
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(title));
    const version = [...new Uint8Array(digest)]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    await env.DB.prepare(
      "INSERT INTO documents(file_id, title, title_version, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    ).bind("og-doc", title, version, 1, 1).run();

    const response = await exports.default.fetch(
      `http://example.com/og/og-doc/${version}-v2.png`,
    );
    if (response.status !== 200) {
      throw new Error(`OG render failed (${response.status}): ${await response.text()}`);
    }
    expect(response.headers.get("content-type")).toBe("image/png");
    const png = new Uint8Array(await response.arrayBuffer());
    expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
    expect(view.getUint32(16)).toBe(1200);
    expect(view.getUint32(20)).toBe(630);

    const stale = await exports.default.fetch(
      `http://example.com/og/og-doc/${"0".repeat(64)}-v2.png`,
    );
    expect(stale.status).toBe(404);
  });

  it("requires auth for user-specific metadata", async () => {
    const recent = await exports.default.fetch("http://example.com/api/files/recent");
    expect(recent.status).toBe(401);
    const open = await exports.default.fetch("http://example.com/api/files/test-doc/open", {
      method: "POST",
    });
    expect(open.status).toBe(401);
  });

  it("keeps migration routes disabled by default", async () => {
    const response = await exports.default.fetch(
      "http://example.com/api/migration/summary",
      { headers: { Authorization: "Bearer test" } },
    );
    expect(response.status).toBe(404);
  });

  it("requires a WebSocket upgrade", async () => {
    const response = await exports.default.fetch("http://example.com/ws/test-doc");
    expect(response.status).toBe(426);
  });
});
