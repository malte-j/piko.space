import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "script",
      devOptions: {
        enabled: true,
      },
      manifest: {
        name: "piko.space",
        short_name: "piko.space",
        description:
          "Write down quick notes and collaborate seamlessly with your friends.",
        theme_color: "#e5e5e5",
        background_color: "#e5e5e5",
        display: "standalone",
        orientation: "portrait",
        icons: [
          {
            src: "/metadata/android-chrome-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/metadata/android-chrome-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
});
