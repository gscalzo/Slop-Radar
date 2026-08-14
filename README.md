# Slop Radar

A Chrome (Manifest V3) extension that flags **AI-patterned writing** in your LinkedIn
feed. Every post — and, optionally, every comment — gets a coloured border and badge:

| Border | Meaning |
| --- | --- |
| 🟩 green | little AI-typical patterning |
| 🟨 yellow | noticeable AI-typical patterning |
| 🟥 red | dense AI-typical patterning |
| (none / grey badge) | no verdict — too short or non-English |

Clicking the badge opens a report that shows the post with every detected tell
highlighted in place — em dashes, "not X, it's Y" contrast templates, stock AI
vocabulary, emoji listicles, unicode-bold headers, engagement-bait closers — plus the
model's own reasoning when model analysis is on.

> **A radar, not an authorship oracle.** Slop Radar measures how strongly text reads
> as AI-patterned. Humans — especially ghostwritten, engagement-optimised LinkedIn
> humans — write like this too. Red means "reads heavily AI-patterned", never "this
> person used AI".

## How the analysis works

**The model is the primary engine.** A fixed pattern list can only catch what it
enumerates; paraphrased and novel constructions need judgment. Verdicts therefore
come from an LLM you configure — any OpenAI-compatible `/chat/completions` endpoint —
which returns a 0–1 likelihood plus verbatim quotes of the phrases it found
suspicious. Those quotes are located back to exact offsets locally (LLMs can't be
trusted with character positions).

**The rubric is the real humanizer skill — vendored, distilled, and updatable in
one click.** The source of truth is the community-maintained
[blader/humanizer](https://github.com/blader/humanizer) skill (MIT, based on
Wikipedia's "Signs of AI writing" guide), vendored verbatim at
[`skills/humanizer/SKILL.md`](./skills/humanizer/SKILL.md) with provenance in
`UPSTREAM.json`. But it's a ~30 KB *rewriting* skill, so the per-post judge
doesn't read it directly: **Update skill from GitHub** in Options runs a
two-stage pipeline — download the latest skill, then distill it with a stronger
model (default `gpt-5.6-terra`, configurable) into a compact detection rubric of
just the signals, false-positive rules, and the clusters principle. A reviewed
distilled snapshot ([`skills/humanizer/DISTILLED.md`](./skills/humanizer/DISTILLED.md))
ships in the repo for first-run and keyless installs. Precedence: your edit >
runtime distillation > bundled snapshot; the judging preamble and JSON output
contract are code-owned so no update or edit can break parsing
([ADR 0008](./docs/adr/0008-upstream-skill-sync.md),
[ADR 0009](./docs/adr/0009-distilled-rubric.md)). The deterministic detectors
below approximate the same signals in fast local regexes.

**The local pattern engine annotates and stands in.** Deterministic detectors always
run, entirely on-device, pinpointing classic tells at exact offsets for the report.
Until you configure a model, they also supply the verdict — visibly marked as an
estimate (`≈` on the badge, "pattern-only estimate" in the report).

**Honest abstention.** Posts under 40 words (comments: 20) or mostly non-Latin text
get no verdict from anyone — too little signal for an honest read. Posts clamped
behind "…see more" are analysed on visible text only and marked partial (◐).

**Expand-all command.** To analyse clamped items in full, press **`Alt+Shift+E`**
(remap at `chrome://extensions/shortcuts`) or click the floating **"Expand N
clamped ◐"** button on the feed: the extension clicks every "…see more" toggle
you could have clicked yourself, the full text streams back through analysis, and
the ◐ markers disappear. Expansion happens **only** on your explicit command —
never automatically ([ADR 0007](./docs/adr/0007-user-triggered-expansion.md)).
Beyond that, the extension never clicks LinkedIn's UI and never calls LinkedIn's
internal APIs; it only reads the DOM you are already looking at.

Decisions and trade-offs are recorded in [docs/adr/](./docs/adr/) — start with
[ADR 0005](./docs/adr/0005-model-primary-analysis.md) (model-primary analysis) and
[ADR 0002](./docs/adr/0002-dom-only-extraction.md) (read-only DOM posture).

## Install

```bash
npm start          # build + launch Chrome with the extension loaded
```

Chrome can't side-load an unpacked extension into your everyday profile from the
command line, so `npm start` (i.e. `./scripts/install.sh`) launches a throwaway
profile in `.chrome-profile/` with the extension already loaded and LinkedIn open.
Your normal browser is untouched; you log into LinkedIn once in that window.
`--clean` resets the profile.

To install into your everyday profile instead:

```bash
./scripts/install.sh --build
```

then open `chrome://extensions`, enable *Developer mode* → *Load unpacked* → pick
the printed `dist/` folder, and visit `https://www.linkedin.com/feed/` — the
content script runs only there.

## Configure the model

Extension → *Options*:

- **API base URL** — e.g. `https://api.openai.com/v1`, an OpenRouter URL, or a local
  proxy. Chrome asks to grant access to that origin (and only that origin) on save.
- **Model** — default **`gpt-5.6-luna`**, OpenAI's fast/affordable tier built for
  high-volume classification. Alternatives (API prices per 1M tokens, August 2026):

  | Model | Price (in / out) | When |
  | --- | --- | --- |
  | `gpt-5.6-luna` | $1.00 / $6.00 | default — fast, cheap, capable |
  | `gpt-5.6-terra` | $2.50 / $15.00 | stronger judgment, moderate cost |
  | `gpt-5.4-nano` | $0.20 / $1.25 | ultra-budget, high-volume |

- **API key** — stored in extension storage on this machine only.

**Privacy:** with model analysis enabled and a key set, feed text is sent to the
endpoint you configured. Remove the key (or untick model analysis) and everything
stays on-device as pattern-only estimates. Nothing is ever sent anywhere else.

Cost stays bounded: only items that enter the viewport are analysed, and verdicts are
cached per post/comment URN.

## Quality gates

`npm run check` is the gate: ESLint (cyclomatic complexity ≤ 5 enforced), strict
TypeScript (`noUncheckedIndexedAccess`), and Vitest with 80% coverage thresholds.
It runs in CI on every push/PR (`.github/workflows/ci.yml`, which also builds the
bundle), and by hand: `npm run check`.

The model judge sits behind an interface and is faked in tests — CI needs no API key.

## Project layout

```
skills/         the humanizer skill — vendored from blader/humanizer (MIT),
                with UPSTREAM.json provenance; the judge's default rubric
src/core        detectors, density scoring, quote location — pure, fully tested
src/judge       OpenAI-compatible judge client (the primary engine)
src/adapters    SiteAdapter interface + the LinkedIn adapter — the ONLY file that
                knows LinkedIn's DOM (posts and comments, urn:li anchors)
src/content     border/badge decoration, report modal, orchestrator glue
src/background  service worker: owns the API key, caches verdicts
src/options     options page
scripts         install.sh — build and load into Chrome
```

Supporting another site with text blocks means one new `SiteAdapter` and a manifest
`matches` entry — nothing in core changes.

Development is TDD: write the failing test first.
