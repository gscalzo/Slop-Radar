# ADR 0012 — Keep the cheap model; move red to 0.6

## Status

Accepted. Calibrates [ADR 0005](./0005-model-primary-analysis.md) with evidence.

## Context

The default model and the tier boundaries were both invented. `npm run eval`
now measures them against 104 posts: 60 human, timestamped by third parties
between 2013 and 2019, and 44 AI written by a model from a different family than
the judges, so nothing grades its own output.

| model | AUC | mean(ai) | mean(human) | cost (in/out per 1M) |
| --- | --- | --- | --- | --- |
| `gpt-5.6-luna` | **0.870** | 0.44 | 0.12 | $1.00 / $6.00 |
| `gpt-5.6-terra` | 0.857 | 0.33 | 0.09 | $2.50 / $15.00 |

Split by difficulty, the same corpus says something more useful:

| | luna | terra |
| --- | --- | --- |
| obvious patterning vs human | 0.973 | 0.955 |
| AI written without surface tells vs human | 0.707 | 0.702 |

## Decision

**Keep `gpt-5.6-luna` as the default.** Terra costs 2.5× and scores no better;
its 0.013 AUC deficit is well inside the noise of a 44×60 comparison. There is
no evidence for the upgrade, which is what the question deserved.

**Move red from 0.7 to 0.6.** The highest-scoring human sample in the corpus
reached 0.58, so 0.6 costs no human a red border while moving a third more of
the obviously-patterned posts out of yellow, where they were understating what
they are.

**Leave yellow at 0.35.** Every boundary between 0.125 and 0.30 produced the
same total error, trading fewer misses for more humans flagged. That trade is
not neutral: telling someone their own writing reads as machine-made is the
expensive mistake, so the boundary stays where false positives are rarest.

## Consequences

- **The judge measures patterning, not authorship, and now we can prove it.**
  AI prose with concrete specifics and no surface tells scores 0.14 on average —
  indistinguishable from human writing. Those are not bugs to fix; a post with
  no AI-typical patterning *should* read green, which is exactly what ADR 0001
  claims this tool does. The eval labels them "ai" because a machine wrote them,
  and that mismatch is a property of the labels, not a failure of the judge.
- The one human sample luna scored above 0.35 is a 2013 Stack Exchange answer
  that opens "This is a really good question" and continues in imperative
  bullets. It reads formulaic because it is formulaic. The badge says "AI tells:
  medium", not "this person used AI" — so this is the tool working.
- The corpus is small enough that a 0.01 AUC difference means nothing. Re-run
  after adding samples before treating any close comparison as a result.
- The AI half was written in a single session by one model, so it carries one
  stylistic fingerprint. Generating a third voice with `SLOP_RADAR_GEN_MODEL`
  and re-running is the check on that.
