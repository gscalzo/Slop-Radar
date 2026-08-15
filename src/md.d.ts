// Markdown files are bundled as raw text (esbuild "text" loader; matching
// plugin in vitest.config.ts).
declare module "*.md" {
  const text: string;
  export default text;
}
