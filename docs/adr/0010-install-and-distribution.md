# ADR 0010 — Ship a zip; install unpacked, per browser

## Status

Accepted.

## Context

"Build it and load it" was a README paragraph, and it only described Chrome.
Two things forced a decision.

**Browsers disagree about command-line extension loading.** Chrome, Chromium,
Brave and Edge honour `--load-extension` when pointed at a fresh
`--user-data-dir`. Arc accepts both flags and silently ignores them: probed
against Arc 1.158 with a scratch data directory, Arc created nothing in it, kept
using its own profile, and did not register the extension. There is no error to
detect — only the absence of an effect.

**Off-store packaging is mostly a dead end.** Chrome stopped honouring local CRX
files for external installs on Windows in Chrome 33 and on macOS in Chrome 44.
On those platforms an unsigned extension can only arrive through enterprise
policy or Load unpacked. Self-hosting a CRX with an update manifest still works
on Linux. So a self-signed CRX would serve one platform and mislead on two.

## Decision

- **`scripts/install.sh` picks a strategy per browser.** Flag-honouring browsers
  get a throwaway profile in `.chrome-profile/` with the extension preloaded, so
  the everyday profile is never touched. Arc gets a guided manual install: the
  script copies the `dist/` path to the clipboard and opens the extensions page,
  leaving one Load-unpacked click. `--browser` overrides detection; `--build`
  skips the browser and prints the steps.
- **`scripts/package.sh` produces `slop-radar-<version>.zip` and nothing else.**
  That is the Chrome Web Store's input format, and a Web Store listing is the
  one artifact every Chromium browser here — Arc, Brave, Edge included — can
  install. No CRX is generated.
- **Unlisted on the Web Store is the recommended distribution**, recorded in the
  README next to the enterprise-policy and Load-unpacked alternatives so the
  trade-offs are visible when someone wants wider reach.

## Consequences

- Arc users take one manual step per machine. It persists across restarts, and
  updating is `npm run build` plus a reload click.
- The throwaway profile means a second LinkedIn login for Chrome users; the
  upside is that a half-built extension can never disturb their real browser.
- Publishing later needs a privacy disclosure: verdicts are produced by a
  user-configured remote endpoint, so review will look at where post text goes
  (ADR 0005).
- Arc's behaviour is version-observed, not documented. If a future Arc honours
  the flags, `uses_flags` is the single place to change.
