# Word Builder Kanji Chain Redesign

## Purpose
Word Builder now targets a six-kanji puzzle where every character is meaningfully linked through real vocabulary. The current production implementation is tuned for picking small kanji clusters (2–4 characters) that co-exist inside a **single** word. This document explains why that approach cannot scale past three kanji, and proposes a new kanji-chain strategy that keeps the experience interesting by expanding outward from one seed kanji through a sequence of real words.

---

## Why the Existing Approach Always Tops Out at ~3 Kanji
The legacy algorithm in `getSmartKanji()` builds `kanji_groups` by grouping every kanji that appears together **within the same word**. While that guaranteed at least one valid word, it introduces hard limits:

1. **Word length constraint:** the SQL explicitly filters `WHERE LENGTH(w.kanji) BETWEEN 2 AND 4` and `HAVING COUNT(DISTINCT ir.to_id) BETWEEN 2 AND 5`. Japanese words that meet those filters overwhelmingly contain only two kanji; three-kanji compounds already become rare, and four-kanji idioms are scarcer. The query therefore almost always surfaces 2-kanji pairs and occasionally 3-kanji triples.
2. **Group = word:** `kanji_ids` is literally the kanji array belonging to a single word_id. The follow-up `unnest(kg.kanji_ids[1:5])` simply splays that exact word into standalone kanji. No combination beyond the characters that already coexist in that word can ever be returned, so six-kanji sets are impossible by design.
3. **Ordering bias:** because `ORDER BY array_length(kanji_ids, 1) DESC` is evaluated before `RANDOM()`, the database keeps feeding the same high-frequency 2-kanji pairs. Even if a 4-kanji idiom exists it is quickly exhausted, so the fallback to random selection reintroduces non-cohesive kanji.
4. **No expansion logic:** the system never attempts to chain related words. Once the initial group is fetched there is no mechanism to bring in fresh kanji that still remain semantically connected to the previously selected ones.

Given those structural limitations the current game can never offer six connected kanji. At best it surfaces a 3-kanji trio, but most of the time players see only two characters with a shallow valid-word pool. The design goal (continuous exploration) is therefore unattainable without replacing the selection logic.

---

## Target Experience & Requirements
To support a richer puzzle we need the following behaviour:

- **Exactly six kanji per round.** They should be unique within the round and belong to the requested JLPT band (with minor flexibility for NULL JLPT entries).
- **Chainability.** Starting from a random seed kanji, each additional kanji must be reachable via a real word that contains both the previous kanji and the newly added one.
- **Dynamic traversal.** After choosing a word for the current kanji, select one of the other kanji in that word and continue the search using the new kanji as the anchor. Repeat until six kanji are collected or a dead end is reached.
- **Connectivity validation.** Every kanji in the final set must participate in at least one word with at least one other kanji from the set so that the valid-words computation still works (all characters should appear in at least one word combination with some subset of the six).
- **Variety without randomness chaos.** Seeding the chain randomly keeps the decks fresh, but each hop must respect JLPT, frequency, and “available future moves” so we do not get stuck after the third character.

---

## Proposed Six-Kanji Chain Flow
```
1. User starts session (JLPT level, time limit)
2. Build kanji adjacency map (off cache)
3. Run buildKanjiChain(level, target=6)
4. Compute valid words for those kanji (existing pipeline)
5. Return kanji + valid words + chain metadata
```

This approach keeps the validated `ComputeValidWords()` implementation intact; we only change how the input kanji set is produced.

---

## Step 1: Build a Kanji → Word → Kanji adjacency map
We need a quick way to answer “given kanji X, which words contain it and which other kanji do those words introduce?”. A single materialized view or cached query can power all hops:

```sql
WITH kanji_words AS (
    SELECT
        ir.to_id                        AS kanji_id,
        ir.from_id                      AS word_id,
        array_agg(DISTINCT ir2.to_id)   AS neighbor_kanji_ids
    FROM item_relations ir
    JOIN item_relations ir2
      ON ir2.from_id = ir.from_id
     AND ir2.rel_type = 'USES_KANJI'
     AND ir2.to_type = 'kanji'
    JOIN words w ON w.id = ir.from_id
    JOIN kanji k ON k.id = ir2.to_id
    WHERE ir.rel_type = 'USES_KANJI'
      AND ir.to_type = 'kanji'
      AND w.kanji ~ '^[\u4E00-\u9FFF]+'
      AND LENGTH(w.kanji) BETWEEN 2 AND 4
      AND coalesce(k.jlpt, ir_jlpt(k.id)) BETWEEN $1 AND $2
    GROUP BY ir.to_id, ir.from_id
)
SELECT * FROM kanji_words;
```

- Each record captures a (kanji_id, word_id) pairing plus all other kanji that word exposes.
- This can be cached per JLPT level (or band) to avoid recomputing on every request.
- We purposely keep the 2–4 character filter because longer idioms are rare; the chain logic—not the word itself—delivers six-kanji breadth.

---

## Step 2: Chain Construction Logic
Pseudocode for `buildKanjiChain(level, targetCount=6)`:

```go
func buildKanjiChain(level int, target int) ([]KanjiData, []ChainEdge, error) {
    seen := set[int]{}
    path := []KanjiData{}
    edges := []ChainEdge{}

    current := pickSeedKanji(level, seen)
    path = append(path, current)
    seen.add(current.ID)

    for len(path) < target {
        words := adjacency[current.ID]
        candidates := filterWordNeighbors(words,
            func(n Neighbor) bool { return !seen.contains(n.KanjiID) })

        if len(candidates) == 0 {
            // dead end → restart whole chain or backtrack one step
            return nil, nil, ErrDeadEnd
        }

        nextWord, nextKanji := chooseNeighborWithFuture(candidates, seen)
        path = append(path, lookupKanji(nextKanji))
        seen.add(nextKanji)
        edges = append(edges, ChainEdge{WordID: nextWord, From: current.ID, To: nextKanji})
        current = lookupKanji(nextKanji)
    }

    return path, edges, nil
}
```

Key behaviours:
- **pickSeedKanji**: choose a kanji with plenty of outgoing edges (degree threshold) and not yet used that day; include frequency bias to keep puzzles approachable.
- **chooseNeighborWithFuture**: evaluate each potential neighbor and ensure it has at least one onward word that can bring in a yet-to-be-used kanji. A simple heuristic is to count distinct unused neighbors; prefer ones with ≥2.
- **Dead-end handling**: if the search cannot find six unique kanji, restart with a new seed (bounded attempts) before falling back to a curated default set.

This chain gives us six kanji `{k1 … k6}` alongside metadata describing which words connect each hop. The metadata can later power UI affordances (highlight the word that connected K3→K4, show hints, etc.).

---

## Step 3: Ensure Mutual Word Coverage
After building the chain we must confirm that each kanji participates in at least one word whose kanji set is contained inside the final six-character pool. We can reuse an adapted version of `ComputeValidWords()`:

```sql
WITH provided AS (
    SELECT unnest($1::int[]) AS kanji_id
), candidate_words AS (
    SELECT DISTINCT ir.from_id AS word_id
    FROM item_relations ir
    JOIN provided p ON p.kanji_id = ir.to_id
    WHERE ir.rel_type = 'USES_KANJI'
)
SELECT w.id, w.kanji, w.kana, w.english
FROM candidate_words cw
JOIN words w ON w.id = cw.word_id
JOIN (
    SELECT from_id,
           array_agg(DISTINCT to_id ORDER BY to_id) AS word_kanji_ids
    FROM item_relations
    WHERE from_type = 'word' AND rel_type = 'USES_KANJI'
    GROUP BY from_id
) wk ON wk.from_id = w.id
WHERE wk.word_kanji_ids <@ $1::int[];
```

- The existing containment check guarantees that a “valid word” uses only the six kanji.
- Because the chain construction already ensured overlap between consecutive kanji, this query now surfaces multiple mini-combos (2–4 characters) sourced from within the six-character pool.

If the final pool does not yield enough words (e.g., less than a minimum threshold), the builder can backtrack and choose alternative neighbors before confirming the round.

---

## Example Chain (Seed Kanji = 日)
1. **Seed**: pick 日 because it sits in many JLPT N5 words.
2. **Word**: 「日曜」 exposes 曜; add 曜 as Kanji #2.
3. **Next hop**: from 曜 choose 「曜日」, which still only uses 日. To diversify we prefer a different word such as 「週刊」 (刊) is not connected, so we instead choose 「曜日表」 (表). Add 表 as Kanji #3.
4. **Hop 3**: 表 participates in 「表現」 → introduce 現 (#4).
5. **Hop 4**: 現 appears in 「現在」 → add 在 (#5).
6. **Hop 5**: 在 appears in 「存在感」 → add 感 (#6).

Final kanji set: {日, 曜, 表, 現, 在, 感}. Each transition is backed by a real word, so valid words now include combinations like 日曜, 曜日, 表現, 現在, 存在, 在感, etc., all derivable from the six selected characters.

---

## Comparison of Approaches
| Aspect | Legacy grouping | Chain-based selection |
| --- | --- | --- |
| Max kanji returned | 2–3 (bounded by single-word length) | 6 (bounded only by hop depth) |
| Diversity | Low – repeats same compounds | High – every hop touches a new word |
| Engagement | Users exhaust combos quickly | Users discover multiple sub-words within one set |
| Failure mode | Empty valid words or boring pairs | Detectable dead ends with restart logic |

The chain approach explicitly satisfies the requirement: “select one kanji randomly, then dynamically traverse other kanji via words until six characters are collected.”

---

## Implementation Considerations
- **Caching & warm-up:** adjacency data should be refreshed periodically (e.g., hourly) per JLPT level to avoid repeated heavy joins during gameplay.
- **Exclusion list:** continue accepting `used_kanji_ids` from refresh requests and remove them from both seed selection and neighbor candidates.
- **Frequency & pedagogy:** weight word choices by frequency bands and known difficulty so that early hops remain approachable while later hops can introduce rarer kanji.
- **Instrumentation:** log every failed attempt at building a chain to surface data gaps (e.g., kanji that only connect to already-used characters).
- **Testing:** add unit tests for the chain builder (seed with deterministic adjacency graphs) and integration tests that assert we always return six unique kanji plus at least `minValidWords` results.

---

## Next Steps
1. Implement the adjacency cache (SQL + Go struct) and expose it through an interface the builder can consume.
2. Replace `getSmartKanji()` internals with the chain algorithm while keeping the public signature untouched.
3. Update `ComputeValidWords()` call sites to accept six-kanji sets and enforce a minimum valid word count before finalising the response.
4. Extend analytics dashboards to measure average chain length retries, dead ends, and user success rate to ensure the redesign meets production KPIs.

This redesign directly addresses the shortcomings of the prior implementation, unlocks six-kanji rounds, and keeps the gameplay loop grounded in authentic vocabulary relationships.
