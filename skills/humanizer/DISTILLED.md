---
name: humanizer-distilled
description: |
  Detection-only distillation of the humanizer skill (blader/humanizer v2.9.1,
  commit 523374d): the signals catalogue without the rewriting machinery.
  Regenerate whenever SKILL.md is re-vendored, or at runtime via
  Options → Update skill from GitHub (which re-distills with a model).
---

# Signs of AI writing — detection rubric

## Content signals

1. **Significance inflation** — puffing up importance and legacy. Watch: stands/serves as, testament/reminder, vital/crucial/pivotal role or moment, underscores/highlights its importance, reflects broader, symbolizing its enduring/lasting, setting the stage for, marks a shift, key turning point, evolving landscape, focal point, indelible mark, deeply rooted.
2. **Notability drum-beating** — listing media citations or follower counts without context. Watch: independent coverage, national media outlets, leading expert, active social media presence.
3. **Superficial "-ing" analyses** — participle phrases tacked on for fake depth. Watch: highlighting…, underscoring…, ensuring…, reflecting…, symbolizing…, fostering…, encompassing…, showcasing….
4. **Promotional tone** — ad copy where neutral description belongs. Watch: boasts a, vibrant, rich (figurative), profound, exemplifies, commitment to, nestled, in the heart of, groundbreaking, renowned, breathtaking, must-visit, stunning.
5. **Vague attributions / weasel words** — opinions assigned to unnamed authorities. Watch: industry reports, observers have cited, experts argue, some critics argue, several publications.
6. **Formulaic "challenges" framing** — outline-style sections and pivots. Watch: despite its… faces several challenges…, despite these challenges, future outlook.

## Language signals

7. **AI vocabulary** — words over-represented in post-2023 text, especially co-occurring: actually, additionally, align with, crucial, delve, emphasizing, enduring, enhance, fostering, garner, highlight (verb), interplay, intricate, key (adjective), landscape (abstract), pivotal, showcase, tapestry, testament, underscore (verb), valuable, vibrant.
8. **Copula avoidance** — elaborate verbs replacing plain is/are/has. Watch: serves as, stands as, marks, represents a, boasts, features, offers.
9. **Negative parallelisms** — "not only… but…", "it's not just X, it's Y", and clipped tailing negations ("no guessing", "no wasted motion").
10. **Rule of three** — ideas forced into tidy triads of adjectives, clauses, or bullets.
11. **Elegant variation** — synonym cycling for the same referent (the protagonist / the main character / the central figure / the hero).
12. **False ranges** — "from X to Y" where X and Y aren't on a real scale.
13. **Passive voice / subjectless fragments** — hidden actors and dropped subjects ("No configuration file needed.").

## Style signals

14. **Em dashes and en dashes** — one of the most reliable tells, including spaced dashes and double hyphens used as dashes. (Only meaningful in combination — see clusters rule.)
15. **Mechanical boldface** — emphasis sprinkled on phrase after phrase.
16. **Inline-header lists** — bullets shaped "**Header:** sentence restating the header".
17. **Title Case Headings** — every main word capitalized.
18. **Emoji decoration** — emojis fronting headings or bullet lines.
19. **Curly quotes** — only when stacked with other tells (editors auto-curl).

## Communication signals

20. **Chatbot artifacts** — correspondence pasted as content: I hope this helps, Certainly!, You're absolutely right!, Would you like…, let me know, here is a….
21. **Cutoff disclaimers & speculative gap-filling** — as of [date], up to my last training update, while specific details are limited, based on available information, maintains a low profile, keeps personal details private, likely grew up/studied….
22. **Sycophantic tone** — great question!, excellent point, people-pleasing throughout.

## Filler and rhythm signals

23. **Filler phrases** — in order to, due to the fact that, at this point in time, in the event that, has the ability to, it is important to note that.
24. **Excessive hedging** — could potentially possibly, might have some effect.
25. **Generic positive conclusions** — the future looks bright, exciting times lie ahead, a major step in the right direction.
26. **Uniform hyphenated pairs** — high-quality, data-driven, end-to-end, real-time hyphenated even in predicate position.
27. **Persuasive authority tropes** — the real question is, at its core, what really matters, the heart of the matter.
28. **Signposting** — let's dive in, let's break this down, here's what you need to know, without further ado.
29. **Fragmented headers** — a heading followed by a one-liner restating the heading.
30. **Diff-anchored writing** — prose narrating a change ("was added to replace…") instead of describing the thing.
31. **Manufactured punchlines / staccato drama** — runs of short declarative fragments engineered to land ("It had no preference for symmetry. No aesthetic prior. No nostalgia.").
32. **Aphorism formulas** — X is the Y of Z, X becomes a trap, the language/currency/architecture of.
33. **Fake-candid openers** — Honestly?, Look, Here's the thing, Real talk as theatrical pause-and-reveal hooks.

## What NOT to flag (false positives)

Not reliable on their own: perfect grammar and polish; mixed registers; bland-but-tell-free dryness; formal vocabulary outside the §7 list; letter-style openings/closings; isolated transition words; curly quotes alone; em dashes alone (editors and journalists use them); one short emphatic sentence; "honestly"/"look" mid-sentence; unsourced claims; clean complex formatting; watched phrases inside quotations, titles, or examples.

## Signs of human writing (weigh against)

Specific hard-to-fabricate detail; mixed feelings and unresolved tension; dated, era-bound references; defensible first-person editorial choices; varied sentence length; genuine asides and self-corrections; text predating November 30, 2022.

## The clusters rule

Judge **clusters, not isolated tells**. A single em dash means nothing; em dashes plus rule-of-three plus "vibrant tapestry" plus a generic conclusion is a confession. Weigh density and combination, and be conservative when human signals are present.
