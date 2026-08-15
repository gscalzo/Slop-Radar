#!/usr/bin/env node
/*
 * Adds fetched human samples to the evaluation corpus (eval/corpus, committed;
 * pass --out eval/local to keep them out of git).
 *
 *   node scripts/fetch-corpus.mjs                    # 40 human, no API key needed
 *   node scripts/fetch-corpus.mjs --human 60 --ai 30 # --ai needs SLOP_RADAR_API_KEY
 *
 * HUMAN samples are fetched from public APIs and hard-filtered to items created
 * before 2020-01-01. That cutoff is the whole point: ChatGPT shipped at the end
 * of 2022, so text timestamped by a third party before 2020 cannot have been
 * machine-written. A hand-written "human" sample proves nothing — whoever wrote
 * it was imitating the thing being measured.
 *
 *   workplace.stackexchange.com answers  — career and workplace advice, the
 *     closest public register to a LinkedIn post (CC BY-SA, attributed in
 *     manifest.json)
 *   Hacker News comments — professionals writing opinions in prose
 *
 * AI samples are optional here. The committed ai-*.txt were written by a
 * different model family from the judges under test, deliberately: generating
 * them with gpt-5.6-* would have the judge grading its own output. Use --ai
 * only to add more, and set SLOP_RADAR_GEN_MODEL to something you are not
 * evaluating.
 *
 * Every file gets an entry in manifest.json with its source URL,
 * author and timestamp, so any sample can be traced back and re-verified.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadEnv } from "./env.mjs";

loadEnv();

const CUTOFF = Math.floor(Date.parse("2020-01-01T00:00:00Z") / 1000);
const outFlag = process.argv.indexOf("--out");
const OUT = outFlag === -1 ? "eval/corpus" : process.argv[outFlag + 1];
const MIN_WORDS = 60;
const MAX_WORDS = 260;

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : Number(process.argv[i + 1]);
}

const WANT_HUMAN = arg("human", 40);
const WANT_AI = arg("ai", 0);

// ---------------------------------------------------------------- text utils

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'", nbsp: " " };

function stripHtml(html) {
  return html
    .replace(/<pre[\s\S]*?<\/pre>/gi, " ")
    .replace(/<blockquote[\s\S]*?<\/blockquote>/gi, " ")
    .replace(/<\/(p|div|li)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(#?\w+);/g, (m, e) => ENTITIES[e] ?? m)
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const words = (text) => text.split(/\s+/).filter(Boolean).length;

function usable(text) {
  if (words(text) < MIN_WORDS || words(text) > MAX_WORDS) return false;
  if ((text.match(/https?:\/\//g) ?? []).length > 2) return false;
  if (/[{};]\s*$/m.test(text)) return false; // leftover code
  const letters = text.match(/\p{L}/gu) ?? [];
  const latin = text.match(/\p{Script=Latin}/gu) ?? [];
  return letters.length > 0 && latin.length / letters.length > 0.9;
}

// ------------------------------------------------------------------- sources

async function fetchJson(url) {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`${url} → HTTP ${response.status}`);
  return response.json();
}

/*
 * Both sources are queried newest-first below a cutoff, so a single query
 * returns one narrow slice of time — 40 answers all written the same week, on
 * whatever the forum was arguing about that week. Sampling instead across
 * quarterly windows from 2013 to 2019 spreads topic, register and house style,
 * which is what makes the human class a fair comparison rather than a mood.
 */
function windows() {
  const stamps = [];
  for (let year = 2013; year <= 2019; year += 1) {
    for (const month of ["04", "07", "10", "12"]) {
      stamps.push(Math.floor(Date.parse(`${year}-${month}-28T00:00:00Z`) / 1000));
    }
  }
  return stamps.reverse();
}

/** At most two samples per author, so no one voice dominates the class. */
function capAuthors(samples, perAuthor = 2) {
  const seen = new Map();
  return samples.filter((s) => {
    const count = seen.get(s.author) ?? 0;
    seen.set(s.author, count + 1);
    return count < perAuthor;
  });
}

/** Workplace Stack Exchange answers. CC BY-SA, attributed in manifest.json. */
async function stackExchangeAt(before, take) {
  const url =
    `https://api.stackexchange.com/2.3/answers?site=workplace&order=desc&sort=creation` +
    `&todate=${before}&pagesize=100&filter=withbody`;
  const data = await fetchJson(url);
  const out = [];
  for (const item of data.items ?? []) {
    if (item.creation_date >= CUTOFF) continue; // belt and braces
    const text = stripHtml(item.body ?? "");
    if (!usable(text)) continue;
    out.push({
      name: `human-se-${item.answer_id}`,
      text,
      source: "workplace.stackexchange.com",
      url: `https://workplace.stackexchange.com/a/${item.answer_id}`,
      author: item.owner?.display_name ?? "unknown",
      created: new Date(item.creation_date * 1000).toISOString(),
      licence: "CC BY-SA",
    });
    if (out.length >= take) break;
  }
  return out;
}

/** Hacker News comments, via the public Algolia index. */
async function hackerNewsAt(before, take) {
  const url =
    `https://hn.algolia.com/api/v1/search_by_date?tags=comment` +
    `&numericFilters=created_at_i<${before}&hitsPerPage=100`;
  const data = await fetchJson(url);
  const out = [];
  for (const hit of data.hits ?? []) {
    if (hit.created_at_i >= CUTOFF) continue;
    const text = stripHtml(hit.comment_text ?? "");
    if (!usable(text)) continue;
    out.push({
      name: `human-hn-${hit.objectID}`,
      text,
      source: "news.ycombinator.com",
      url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
      author: hit.author ?? "unknown",
      created: hit.created_at,
      licence: "user content, quoted for evaluation",
    });
    if (out.length >= take) break;
  }
  return out;
}

/**
 * Visits every window rather than stopping once `want` is reached — filling
 * greedily from the newest end produced a corpus that claimed 2013-2019 and
 * delivered 2016-2019. Collect from the whole range, then stride through the
 * result so the samples kept are spread across it.
 */
async function spread(fetchAt, want, label) {
  const stamps = windows();
  const perWindow = Math.max(1, Math.ceil((want * 1.5) / stamps.length));
  const collected = [];
  for (const before of stamps) {
    try {
      collected.push(...(await fetchAt(before, perWindow)));
    } catch (error) {
      console.warn(`  ${label} ${new Date(before * 1000).toISOString().slice(0, 7)}: ${error.message}`);
    }
  }
  const capped = capAuthors(collected);
  if (capped.length <= want) return capped;
  const step = capped.length / want;
  return Array.from({ length: want }, (_, i) => capped[Math.floor(i * step)]);
}

// ------------------------------------------------------------ AI generation

const TOPICS = [
  "a hiring lesson", "why your morning routine matters", "leaving a job after 8 years",
  "what a junior taught me", "remote work and trust", "the future of AI in recruiting",
  "a failed product launch", "why culture beats strategy", "networking as an introvert",
  "burnout and boundaries", "asking for a promotion", "the best interview question",
  "why most meetings fail", "customer obsession", "personal branding",
  "imposter syndrome", "a mentor who changed everything", "why I stopped multitasking",
  "layoffs and empathy", "building in public",
];

const STYLES = [
  "emoji-bulleted listicle with a call to action",
  "short staccato lines building to a lesson",
  "a personal anecdote with a business moral",
  "a contrarian hot take with a contrast construction",
  "a polished paragraph-form thought-leadership piece",
];

async function generateAi(want) {
  const key = process.env.SLOP_RADAR_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!key) throw new Error("--ai needs SLOP_RADAR_API_KEY (or OPENAI_API_KEY)");
  const base = process.env.SLOP_RADAR_BASE_URL ?? "https://api.openai.com/v1";
  const model = process.env.SLOP_RADAR_GEN_MODEL ?? "gpt-5.6-luna";
  const out = [];
  for (let i = 0; i < want; i += 1) {
    const topic = TOPICS[i % TOPICS.length];
    const style = STYLES[i % STYLES.length];
    const response = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "You write LinkedIn posts. Produce the post text only — no preamble, no quotes, no hashtag block. 120-200 words.",
          },
          { role: "user", content: `Write a LinkedIn post about ${topic}. Style: ${style}.` },
        ],
      }),
    });
    if (!response.ok) throw new Error(`generation failed: HTTP ${response.status} ${await response.text()}`);
    const data = await response.json();
    const text = (data.choices?.[0]?.message?.content ?? "").trim();
    if (!text) continue;
    out.push({
      name: `ai-gen-${String(i + 1).padStart(2, "0")}`,
      text,
      source: model,
      url: "",
      author: model,
      created: "generated",
      licence: "generated for evaluation",
    });
    process.stdout.write(`\rgenerating AI samples: ${out.length}/${want}`);
  }
  process.stdout.write("\n");
  return out;
}

// ----------------------------------------------------------------- assembly

function write(samples) {
  mkdirSync(OUT, { recursive: true });
  // Merge: the directory already holds samples from earlier runs.
  const path = join(OUT, "manifest.json");
  const manifest = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
  for (const sample of samples) {
    writeFileSync(join(OUT, `${sample.name}.txt`), `${sample.text}\n`, "utf8");
    manifest[`${sample.name}.txt`] = {
      source: sample.source,
      url: sample.url,
      author: sample.author,
      created: sample.created,
      licence: sample.licence,
      words: words(sample.text),
    };
  }
  writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

const half = Math.ceil(WANT_HUMAN / 2);
console.log(`fetching human samples from 2013-2019, all before ${new Date(CUTOFF * 1000).toISOString().slice(0, 10)}`);
const se = await spread(stackExchangeAt, half, "stackexchange");
console.log(`  workplace.stackexchange.com: ${se.length}`);
const hn = await spread(hackerNewsAt, WANT_HUMAN - se.length, "hn");
console.log(`  news.ycombinator.com: ${hn.length}`);

const ai = WANT_AI > 0 ? await generateAi(WANT_AI) : [];
const all = [...se, ...hn, ...ai];
write(all);

const newest = all
  .filter((s) => s.created !== "generated")
  .map((s) => s.created)
  .sort()
  .at(-1);
console.log(`\nwrote ${all.length} files to ${OUT} (+ manifest.json)`);
console.log(`newest human sample: ${newest} — all predate ChatGPT by at least three years`);
console.log(`run: SLOP_RADAR_API_KEY=… npm run eval`);
