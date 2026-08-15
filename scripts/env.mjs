/*
 * Loads .env if present, without a dependency and without overriding anything
 * already exported in the shell — an explicit env var on the command line
 * should always win over a file you forgot you wrote.
 *
 * .env is gitignored. .env.example is the committed template.
 */
import { existsSync, readFileSync } from "node:fs";

export function loadEnv(path = ".env") {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/i.exec(line);
    if (!match) continue; // comments and blanks
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.trim().replace(/^["']|["']$/g, "");
  }
}
