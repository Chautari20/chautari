# For You feed ranking

How the **For You** tab orders posts after [source composition](./FEED_COMPOSITION.md) (80% joined / 20% discovery). **Following** and circle feeds are unchanged (reverse-chronological).

## Modes

| Mode | Default | Ordering |
|------|---------|----------|
| **Hot** | Yes | Decayed engagement score (see below), snapshotted per session |
| **New** | No | Strict `createdAt DESC`, `id DESC` tiebreak |

The Hot/New choice is remembered **within a session** only. Cold launch resets to **Hot**.

## Engagement (trust guardrail)

Only these signals count toward ranking:

- Upvotes on the post
- Number of **answers** (top-level only — not replies)
- Whether the post has at least one **verified expert** answer (non-anonymous)

**Do not** use views, reply count, downvotes, last-activity time, or join-circle boosts in the score.

## Hot score formula

Constants live in `src/feed/rankingConfig.js` (single source of truth).

```
engagement = base
           + upvotes × upvoteWeight
           + answers × answerWeight
           + (hasExpertAnswer ? expertAnswerBonus : 0)

hours = hoursBetween(referenceTime, post.createdAt)

score = engagement / (hours + AGE_OFFSET_HOURS) ^ GRAVITY
```

Default constants:

| Constant | Value |
|----------|-------|
| `GRAVITY` | 1.5 |
| `AGE_OFFSET_HOURS` | 2 |
| `WEIGHTS.base` | 1 |
| `WEIGHTS.upvote` | 1 |
| `WEIGHTS.answer` | 2 |
| `WEIGHTS.expertAnswerBonus` | 8 |

## Snapshot-per-session (Hot)

To keep pages stable while scrolling:

1. When For You opens in **Hot**, or the user **pull-to-refreshes**, capture `referenceTime = Date.now()` **once**.
2. Score every candidate post against that fixed `referenceTime`.
3. Sort by `(score DESC, id DESC)`.
4. Paginate keyset-style on `(score, id)` within that fixed ordering.

**Do not** recompute `referenceTime` per page — that causes rank drift mid-scroll.

## New ordering

Sort all candidates by `(createdAt DESC, id DESC)`. Paginate keyset-style on `(createdAt, id)`.

## Pagination

Both modes use the same page size (`PAGE_SIZE` in config). The client holds the full sorted snapshot in memory (prototype); production can swap in SQL keyset cursors without changing the formula.

## Future upgrade (not implemented)

A materialized `feed_score` column and background recompute job are **out of scope**. The snapshot API is designed so a server can pre-rank with the same function later.

## Code map

| File | Role |
|------|------|
| `src/feed/rankingConfig.js` | Named constants + `score()` |
| `src/feed/feedRanking.js` | Snapshot build, sort, keyset page helpers |
| `src/hooks/useForYouFeed.js` | Session state, snapshot refresh, infinite scroll |
