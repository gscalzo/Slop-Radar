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
npm start                            # auto-detect a browser and install
npm start -- --browser arc           # or name one: arc|chrome|chromium|brave|edge
```

`./scripts/install.sh` builds first, then takes one of two paths, because
browsers disagree about command-line extension loading:

- **Chrome, Chromium, Brave, Edge** honour `--load-extension`, so the script
  launches a throwaway profile in `.chrome-profile/` with the extension already
  loaded and LinkedIn open. Your everyday profile, extensions and cookies are
  untouched; you log into LinkedIn once in that window. `--clean` resets it.
- **Arc** accepts those flags and silently ignores them — it always uses its own
  profile (verified against Arc 1.158). So the script copies the `dist/` path to
  your clipboard and opens Arc's extensions page: turn on *Developer mode* →
  *Load unpacked* → <kbd>⌘⇧G</kbd>, paste, *Open*. That install persists across
  restarts; after a code change run `npm run build` and hit reload on the card.

`--build` skips the browser entirely and just prints the manual steps. Either
way the content script only runs on `https://www.linkedin.com/feed/`.

## Distribution

```bash
npm run package                      # → slop-radar-<version>.zip
```

A zip of `dist/` is the only packaging format worth producing, because
[off-store CRX installs are dead outside Linux](https://developer.chrome.com/docs/extensions/how-to/distribute/install-extensions):
Chrome stopped honouring local CRX files on Windows in Chrome 33 and on macOS in
Chrome 44. On those platforms an extension can only arrive three ways:

| Route | Reach | Cost |
| --- | --- | --- |
| **Chrome Web Store** — public, or *unlisted* (link-only) | everyone, Arc/Brave/Edge included | one-time $5 developer registration; review from hours to days |
| **Enterprise policy** (`ExtensionInstallForcelist` + self-hosted update manifest) | machines you administer | needs MDM and a file server |
| **Load unpacked** (what `npm start` does) | you and anyone who clones the repo | free, but each user needs Developer mode on |

[Self-hosting a CRX](https://developer.chrome.com/docs/extensions/how-to/distribute/host-on-linux)
with your own update manifest still works on Linux, where users can install a
packed extension that the Web Store never signed.

For something like this, **unlisted on the Web Store** is the pragmatic middle:
no public listing, a stable link, and automatic updates. Worth knowing before you
submit — review will focus on the remote-code and privacy story, so the listing
has to disclose that post text is sent to a user-configured endpoint.

## Configure the model

Extension → *Options*:

- **API base URL** — e.g. `https://api.openai.com/v1`, an OpenRouter URL, or a local
  proxy. Chrome asks to grant access to that origin (and only that origin) on save.
- **Model** — default **`gpt-5.6-luna`**, OpenAI's fast/affordable tier built for
  high-volume classification. Alternatives (API prices per 1M tokens, August 2026):

  | Model | Price (in / out) | Measured AUC | When |
  | --- | --- | --- | --- |
  | `gpt-5.6-luna` | $1.00 / $6.00 | **0.870** | default — nothing tested beat it |
  | `gpt-5.6-terra` | $2.50 / $15.00 | 0.857 | 2.5x the cost, no better ([ADR 0012](./docs/adr/0012-calibration-from-measurement.md)) |
  | `gpt-5.4-nano` | $0.20 / $1.25 | untested | ultra-budget, high-volume |

- **API key** — stored in extension storage on this machine only.

**Privacy:** with model analysis enabled and a key set, feed text is sent to the
endpoint you configured. Remove the key (or untick model analysis) and everything
stays on-device as pattern-only estimates. Nothing is ever sent anywhere else.

Cost stays bounded: only items that enter the viewport are analysed, and verdicts are
cached per post/comment URN.

## What the evaluation found

The default model and the tier boundaries started as guesses. They have now been
measured. Full reasoning in [ADR 0012](./docs/adr/0012-calibration-from-measurement.md);
the short version:

**Method.** 104 posts scored through the real production path — same rubric,
same prompt, same parser. 60 human, timestamped by third parties between 2013
and 2019, three years before ChatGPT existed. 44 AI, written by a model from a
different family than the models being judged, so nothing grades its own output.
The headline metric is **AUC**: the probability that a random AI post outranks a
random human one. 1.0 is perfect, 0.5 is a coin flip. It is used instead of
accuracy because it does not depend on where the tiers sit — and the tiers were
exactly what was in question.

| Model | AUC | mean(ai) | mean(human) | Cost (in / out) | Verdict |
| --- | --- | --- | --- | --- | --- |
| **`gpt-5.6-luna`** | **0.870** | 0.44 | 0.12 | $1.00 / $6.00 | kept as default |
| `gpt-5.6-terra` | 0.857 | 0.33 | 0.09 | $2.50 / $15.00 | 2.5× the price, no better |

Terra is not an upgrade. Its 0.013 deficit is well inside the noise of a 44×60
comparison, so the honest reading is a tie — and the cheap model wins a tie.

**Split by difficulty, the same corpus says something more useful:**

| Against real human writing | luna | terra |
| --- | --- | --- |
| Posts with obvious patterning (emoji lists, staccato, stock openers) | **0.973** | 0.955 |
| AI written with concrete specifics and no surface tells | 0.707 | 0.702 |

The judge is near-perfect on formulaic writing and close to blind on careful AI,
which scores 0.14 on average — indistinguishable from human writing at 0.12.
**That is the tool working, not failing.** A post with no AI-typical patterning
*should* read green; the corpus labels those posts "ai" because a machine wrote
them, and that mismatch is a property of the labels, not the judge. Slop Radar
measures patterning, and now there is evidence rather than assertion behind the
claim.

**Where the boundaries landed.** Red moved from 0.7 to 0.6: the highest-scoring
human in the corpus reached 0.58, so 0.6 costs no human a red border while
moving a third more of the obviously-patterned posts out of yellow. Yellow
stayed at 0.35 — every boundary between 0.125 and 0.30 produced the same total
error, trading fewer misses for more humans flagged, and that trade is not
neutral when the whole posture is never to accuse.

The single human the judge scored above 0.35 is a 2013 Stack Exchange answer
opening "This is a really good question" and continuing in imperative bullets.
It reads formulaic because it *is* formulaic — written seven years before
ChatGPT. The badge says "AI tells: medium", never "this person used AI".

## Running the evaluation yourself

`npm run eval` re-runs all of the above.

```bash
cp .env.example .env      # put SLOP_RADAR_API_KEY in it; .env is gitignored
npm run eval              # 104 posts × 2 models
npm run eval -- gpt-5.6-luna,gpt-5.6-terra,gpt-5.4-nano
```

The corpus lives in `eval/corpus` — 104 posts, 60 human and 44 AI — with
`manifest.json` recording every sample's source, author, timestamp and licence.
`node scripts/fetch-corpus.mjs --human 40` adds more human samples;
`eval/local/` is gitignored if you want to keep additions private.

**Human samples are fetched, never written.** Anyone hand-writing a "human"
example is imitating the thing being measured, and an LLM asked to do it is
imitating its own output. So they come from text a third party timestamped
**before 2020** — three years before ChatGPT — pulled from
[workplace.stackexchange.com](https://workplace.stackexchange.com) answers (the
closest public register to a LinkedIn post, CC BY-SA) and Hacker News comments,
spread across quarterly windows from 2013 to 2019, capped at two per author.

**AI samples come from a different model family than the judges.** They were
written by Claude, not by `gpt-5.6-*`, so no judge is grading output from its
own family. They span obvious slop (emoji listicles, staccato, stock openers)
and deliberately hard cases — AI writing with concrete specifics and no
surface tells — because a corpus of only obvious cases measures nothing useful.
`--ai N` generates more via the API; set `SLOP_RADAR_GEN_MODEL` to something you
are not evaluating.

The report leads with **AUC** — the probability that a random AI post outranks a
random human one. It is the number to choose a model on, because it does not
depend on where the tiers sit: a model that ranks perfectly but scores in a
narrow band looks bad on accuracy and is in fact ideal, since you can just move
the boundary. A threshold sweep then shows what each candidate boundary would
cost in humans-flagged versus AI-missed, and the worst cases are listed by name
so you can read the posts the judge got most wrong.

## When something looks wrong

**No verdicts on any post.** Options → **Test connection** sends one sample post
and reports the reply, or the exact error, granting the host permission if it is
missing. That permission is the usual culprit: it is optional and only requested
when you press *Save*.

**No badges at all.** The page console always prints why. If it says
`no items — selectors: …`, LinkedIn changed its markup: the census names the
anchor that stopped matching, and `scripts/dump-feed.js` (paste into the console)
captures the whole feed as an outline to rewrite `adapters/linkedin.ts` against.
See [ADR 0011](./docs/adr/0011-sdui-anchors-and-drift.md).

**Console noise.** Only problems are printed by default. For the full trace —
every scan, every judge request and verdict — set `localStorage.slopRadarDebug =
"on"` in the page console. Everything is prefixed `[slop-radar]`, so the console
filter isolates it. The service worker logs to its own console:
`chrome://extensions` → Slop Radar → **service worker**, where the model, base
URL and each failure are recorded (never the key).

**`Extension context invalidated`.** Reloading the extension orphans the content
script in tabs that are already open. Refresh the tab; the orphan stops itself
and says so.

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
                knows LinkedIn's DOM (posts, comments, and the census that
                reports when its anchors stop matching)
src/content     border/badge decoration, report modal, orchestrator glue
src/background  service worker: owns the API key, caches verdicts
src/options     options page
scripts         install.sh (build + load into a browser), package.sh (store zip),
                dump-feed.js / probe-*.js (console probes for markup drift)
```

Supporting another site with text blocks means one new `SiteAdapter` and a manifest
`matches` entry — nothing in core changes.

Development is TDD: write the failing test first.
