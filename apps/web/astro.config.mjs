import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import netlify from "@astrojs/netlify";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";

const isNetlify = process.env.NETLIFY === "true";

export default defineConfig({
  output: "server",
  adapter: isNetlify ? netlify() : node({ mode: "standalone" }),
  integrations: [react(), tailwind()],
});

