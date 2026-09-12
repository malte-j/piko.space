import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";
import { cloudflareOgPlugin } from "./og-vite-plugin.ts";

const migrations = await readD1Migrations("./migrations");

export default defineConfig({
  resolve: {
    conditions: ["workerd", "worker", "browser"],
  },
  plugins: [
    cloudflareOgPlugin(),
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        bindings: { TEST_MIGRATIONS: migrations },
        assets: {
          directory: "./public",
          binding: "ASSETS",
          run_worker_first: true,
        },
      },
    }),
  ],
  test: {
    setupFiles: ["./test/setup.ts"],
  },
});
