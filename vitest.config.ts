import { readFileSync } from "node:fs";
import { defineConfig, type Plugin } from "vitest/config";

// Mirror esbuild's `loader: { ".md": "text" }` so tests can import the skill.
const mdAsText: Plugin = {
  name: "md-as-text",
  enforce: "pre",
  load(id) {
    if (!id.endsWith(".md")) return null;
    return `export default ${JSON.stringify(readFileSync(id, "utf8"))};`;
  },
};

export default defineConfig({
  plugins: [mdAsText],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        // Browser glue: observers, chrome.* wiring, form handling. The logic
        // they orchestrate lives in tested pure modules.
        "src/content/index.ts",
        "src/background/index.ts",
        "src/options/options.ts",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
