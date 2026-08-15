import { build } from "esbuild";
import { cp } from "node:fs/promises";

await build({
  entryPoints: {
    content: "src/content/index.ts",
    background: "src/background/index.ts",
    options: "src/options/options.ts",
  },
  bundle: true,
  outdir: "dist",
  format: "iife",
  target: "chrome120",
  loader: { ".md": "text" },
  logLevel: "info",
});

await cp("manifest.json", "dist/manifest.json");
// PNGs only: the SVG sources are for editing, not for shipping in the zip.
await cp("icons", "dist/icons", {
  recursive: true,
  filter: (src) => !src.endsWith(".svg"),
});
await cp("src/options/options.html", "dist/options.html");
