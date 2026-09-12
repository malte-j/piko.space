import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import type { Plugin } from "vite";

const require = createRequire(import.meta.url);
const ogPackageDirectory = path.dirname(require.resolve("@vercel/og/package.json"));
const edgeEntry = path.join(ogPackageDirectory, "dist/index.edge.js");

/**
 * @vercel/og publishes a workerd entry, but generic SSR resolution selects its
 * Node entry before the Cloudflare plugin can process it. Pin the documented
 * workerd build and inline its module-relative fallback font. The WASM module
 * imports are then compiled by the Cloudflare Vite plugin.
 */
export function cloudflareOgPlugin(): Plugin {
  return {
    name: "piko:cloudflare-vercel-og",
    enforce: "pre",
    resolveId(source) {
      return source === "@vercel/og" ? edgeEntry : null;
    },
    transform(code, id) {
      if (id !== edgeEntry) return null;

      let transformed = code;

      // yoga-layout 3 embeds raw WASM bytes and calls WebAssembly.instantiate,
      // which workerd intentionally rejects. Materialize that payload as a
      // module and supply the precompiled module through Emscripten's hook.
      const yogaData = /H = "data:application\/octet-stream;base64,([A-Za-z0-9+/]+=*)";/.exec(
        transformed,
      );
      if (yogaData) {
        fs.writeFileSync(
          path.join(path.dirname(edgeEntry), "yoga.wasm"),
          Buffer.from(yogaData[1], "base64"),
        );
        transformed = transformed.replace(yogaData[0], 'H = "";');
        transformed = transformed.replace(
          "yoga_wasm_base64_esm_default()",
          [
            "yoga_wasm_base64_esm_default({instantiateWasm:function(imports,callback){",
            "Promise.resolve(WebAssembly.instantiate(__piko_yoga_wasm,imports)).then(function(instance){callback(instance);});",
            "return {};",
            "}})",
          ].join(""),
        );
        transformed = 'import __piko_yoga_wasm from "./yoga.wasm?module";\n' + transformed;
      }

      const fontName = transformed.includes("Geist-Regular.ttf")
        ? "Geist-Regular.ttf"
        : "noto-sans-v27-latin-regular.ttf";
      const fontPath = path.join(path.dirname(edgeEntry), fontName);
      const font = fs.readFileSync(fontPath).toString("base64");
      const escapedFontName = fontName.replaceAll(".", "\\.");
      const pattern = new RegExp(
        `fetch\\(\\s*new URL\\(\"\\./${escapedFontName}\", import\\.meta\\.url\\)\\s*\\)\\.then\\(\\(res\\) => res\\.arrayBuffer\\(\\)\\)`,
      );
      const replacement = [
        "Promise.resolve((function(){",
        `var value=atob(${JSON.stringify(font)});`,
        "var bytes=new Uint8Array(value.length);",
        "for(var i=0;i<value.length;i++)bytes[i]=value.charCodeAt(i);",
        "return bytes.buffer;",
        "})())",
      ].join("");

      if (!pattern.test(transformed)) {
        throw new Error("The @vercel/og fallback-font loader changed; update cloudflareOgPlugin.");
      }

      return { code: transformed.replace(pattern, replacement), map: null };
    },
  };
}
