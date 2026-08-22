# Patchscore — Design Review

Subject: `DESIGN.md`, 639-line pre-revision form (untracked working tree, 2026-08-22).
Scope: type-level soundness ahead of build step 1. No implementation was written or reviewed —
there is none.

---

## Verdict

**Build step 1 — Types, schemas, vocabulary: `NO-GO`.** This applies to the reviewed form of
`DESIGN.md` *and to the revised form*. The revision discharged the corrections in §§1–3; it did
not clear the verdict.

The objection is narrow and mechanical rather than a matter of taste. Step 1 exists to freeze
the type surface that steps 2–5 are then written against. Five of the corrections below change
the *shape* of types step 1 names explicitly — `Assignable`, the recipe, `Param`, the role
request, the cost function's return. Freezing the reviewed shapes would have meant rewriting
the registry, the TR-1000 manifest, the resolver and the first template after step 5, at the
exact point where §11 promises that step 4 "proves no engine changes were needed". A type-level
error found at step 1 costs an hour; the same error found at step 4 invalidates the one
experiment the build order is designed around.

The corrections are now incorporated into `DESIGN.md`, including the §3 type-level follow-up in
3.4 below, which was the last of them to land.

**What the `NO-GO` is still blocking on.** Two of the four items carried forward in §4 are not
deferrable questions about behaviour. They are undecided questions about the *shape* of types
step 1 exists to freeze, and they fail step 1 on exactly the grounds the original objection
named:

- **§4 item 1 — section-transition patterns.** If fills are in v1, `Pattern` needs a
  representation for a bar offset (or a within-section variant sequence): a variant is no longer
  "one pattern per request per section" but something addressed by position inside the section.
  That is a change to `Pattern` itself, to §4.3's authoring shape, and to what §7 step 5 selects
  and returns. It cannot be added later as an optional field without invalidating every template
  authored against the flat shape — and templates are step 5, one step after step 4 is supposed
  to prove that no engine changes were needed.
- **§4 item 2 — two requests, one role, one device.** Both candidate fixes are step-1 surface. A
  same-role spread preference is a **new key in the `Score` vector**, and `Score` is a
  lexicographic tuple: inserting a key changes the ordering of every key below it, so it is not
  an append. An explicit `distinct: true` is a **new field on the role request**, which is the
  type templates are authored against. Either way the frozen shape is wrong if the choice is
  made afterwards.

Items 3 (`comfortableVoices` for large pools) and 4 (fixture authority) are genuinely
deferrable: item 3 is a value inside an existing field, item 4 is a question about test
authority, and neither moves a type.

**Step 1 therefore remains blocked until items 1 and 2 are resolved.** Resolving them does not
mean building them. A decision either way settles the shape — "fills are out of v1, `Pattern`
stays flat" is a resolution, and so is "requests carry `distinct`" — and step 1 can proceed the
moment the choice is recorded. What step 1 cannot do is freeze a type surface while two of its
members are still open questions, because the cost of being wrong lands at step 4, on the one
experiment the build order exists to run.

Re-verdict belongs to the reviewer, not to the implementer who applied the corrections.

---

## 1. Resolutions to §12

### 12.1 — `sub` vs `bass-mid`: **two roles, kept separate**

Not one role with a register modifier. Three reasons, in order of weight:

1. **They take different recipes on the same voice.** A sub is a filtered sine with the
   harmonic content deliberately removed; a bass-mid carries the harmonic and is the part that
   actually answers the `bright`/`dark` axis. Under one role they collapse to one
   `(role, character)` key and one of the two sounds becomes unauthorable.
2. **A register modifier is a fifth lookup key.** Recipe lookup is `(role, character, device)`
   plus the `poolId ?? voiceId` collapse. Adding register makes it four dimensions of authoring
   surface — precisely the combinatorial growth §1's "keep it closed and small" exists to bound.
3. **Templates request them independently.** Industrial techno wants a sub and no bass-mid;
   reggae wants a bass-mid and no sub. That is a difference in *what is requested*, which is
   what a role is, not a difference in how one request is voiced.

Cost accepted: many small rigs will fill one and leave the other as an honest gap (§7.3). That
is the correct outcome and better than a rig silently claiming to cover both with one voice.

### 12.2 — Bars-per-pattern: **authored variants in templates, selected by density**

Step patterns move out of device recipes (`steps.hits`) and into templates (`Pattern`, new
§4.3), authored per role in four density bands. Density selects a variant; it **never mutates
hits**.

Why the move, independent of the density question: a four-on-the-floor kick is a property of
the genre, not of the TR-1000. Authoring `hits: [1, 5, 9, 13]` inside a device folder means
re-authoring the same musical idea once per box — the identical duplication that §2.2's
`poolId ?? voiceId` key exists to eliminate one layer down. It is also the wrong shape for
pools: one Tracker Mini recipe serves eight tracks that are all playing different parts.

Why selection rather than mutation: a density knob that adds and removes steps emits patterns
nobody authored and nobody can defend musically. That is generative behaviour — the thing this
whole design is built to avoid — smuggled in through a slider. It would also make invariant 4's
problem worse by creating rhythm with no provenance at all.

Devices keep the part that is genuinely theirs: `articulation`, addressed by `PatternSlot`
(`accent`, `last-hit`, `offbeat`…) rather than by absolute step index. Slot addressing is what
lets one authored articulation survive every variant a density band can select; `{ step: 13 }`
is only correct for a 16-step pattern that happens to have a hit at 13.

Cost accepted and stated in §4.3: **density is quantised to four bands.** The UI should render
detents, not a 0–100 sweep, so nobody hunts for an effect between 26 and 49 that does not exist.

### 12.3 — Assignment weights: **no weights; a lexicographic objective**

`W_RECIPE`, `W_CROWD`, `W_IDLE` and `MISS[]` are deleted. §7.1's scalar sum required an exchange
rate between "the kick is missing" and "the Deluge is idle", and no such rate exists — those are
not the same kind of badness, so any constants chosen are unfalsifiable numbers tuned by feel.
§12.3 as written already conceded this ("tune with a fixture set, not by feel") without noticing
that the fixtures could not adjudicate a scalar: a fixture can say *which assignment is right*,
it cannot say what `W_CROWD` should be.

Replaced with a comparison vector compared lexicographically, led by priority-ordered misses:

```
[ missesAtPriority1, missesAtPriority2, …, crowdOverflow, optionalMisses,
  recipeDistance, roleFitPenalty, idleDevices ]
```

All integers (`recipeDistance` is quantised to `round(d * 1000)`), so comparison is exact and
platform-independent — which also serves invariant 6, since float summation was a latent source
of cross-platform drift in the original cost.

Three lower-order claims are load-bearing and are what the rig fixtures validate:

- **Crowding outranks optional requests.** Filling an optional `texture` by putting a seventh
  part on a four-voice box is a worse guide than leaving it unfilled. The original scalar
  ordering, with `MISS[4]` above `W_CROWD`, would have chosen the crowded rig.
- **Recipe quality outranks role fit.** A substituted recipe is visible to the user and degrades
  the sound; role-list order is an authoring hint.
- **Idle devices rank last and are nearly cosmetic.** Spreading parts across boxes is a
  preference, never a correctness property, and must never cause a miss.

Fixtures assert *relative* outcomes ("the sub goes to the Deluge, not the LT") over hand-authored
rigs, not cost numbers, so they survive a re-ordering of the lower keys and fail loudly on a
wrong one.

One consequence the review flags rather than resolves: **branch-and-bound bounding is now per
key, and `idleDevices` is not monotone.** Misses, crowding, recipe distance and role fit only
grow as a partial assignment extends, so the partial value bounds them. Idle count *shrinks*, so
its admissible lower bound is the number of devices no remaining request can legally reach — not
the current idle count. Using the current count prunes the optimum. This is recorded in §7.1 with
a required test.

### 12.4 — Polyphony: **notes within one role, never multitimbral role capacity**

- `polyphony` on an `Assignable` is the number of simultaneous **notes** it can sound while
  serving **one** role — 3 for a triad pad, 1 for a monophonic bass.
- One assignable serves exactly one request per section. It never carries two roles at once.
- Multitimbrality is already modelled and does not need polyphony: a device that hosts several
  independent parts declares a `pool` with `count > 1`, and each member is its own assignable.
  Overloading polyphony to also mean this would have made a Deluge synth track and a Deluge
  "8 tracks" pool two different encodings of the same fact.
- `comfortableVoices` counts **occupied assignables** — one count per assignable occupied in at
  least one section, regardless of note count or how many sections it spans. Section-scoped
  occupancy means two transient parts in different sections can share one assignable and still
  count once, which is correct: the physical voice is committed for the whole build either way.

Role requests gain an optional `polyphony` minimum. It is a number, not a device name, so it
does not breach invariant 3. An assignable that cannot meet it is not a candidate; if nothing in
the rig can, the request becomes a gap rather than a silently monophonic pad.

---

## 2. Invariant failures

Four of the seven invariants contradicted the body of the document. None of the repairs weakens
the intent; each scopes an over-broad claim so that it can actually be enforced. An invariant
that is quietly false is worse than one that is narrow, because §0 says "if one stops being true,
stop and fix the architecture" — and every one of these was already untrue on the day it was
written.

### Invariant 2 — "adding a device = one folder, no edits elsewhere"

**Conflicts with §9.** Adding a device changes `lib/devices/registry.generated.ts`, which is not
that device's folder. §9 is right that runtime globbing does not survive bundling, so the
generated file is not optional; the invariant as written is simply false.

**Repair:** scope it to *authored* edits. No hand-edited file outside the device folder; the
registry is machine-written by `prebuild` and never hand-edited. This makes the existing
staleness test load-bearing rather than a nicety — it is the only thing that enforces the "never
hand-edited" half.

### Invariant 3 — "roles are the only shared vocabulary"

**Conflicts with §§3–6.** `Character` crosses the template/device boundary exactly as `Role`
does: templates author it per role request (§4), devices key recipes on `(role, character)` (§3),
`CHAR` defines the shared geometry (§3.4), and mood resolves it (§6.2). It is a matching contract,
not a device-private detail — the invariant was false the moment §3 was written.

Two further shared vocabularies exist on the same terms: `MoodAxis` (declared inside device
params in §3.1, defined by the app in §6) and, after §12.2, `PatternSlot` (authored in templates,
addressed by device articulation).

**Repair:** name the full closed set — `Role`, `Character`, `MoodAxis`, `PatternSlot` — and keep
the real constraint, which was never "only roles" but "neither side ever names the other".
Practically this means `Character` is now governed like `Role`: closed, small, never extended for
one device's convenience.

### Invariant 4 — "no value that isn't manual-verified or flagged provisional"

**Conflicts with §3.2 and §6.** §3.2's reconciliation — verify the range, not the point — does
not hold. A verified range proves `45` is a **legal** value for that parameter. It does not prove
anyone checked that `45` is the right value for this sound. Legality and verification are
different claims, and a mood-derived value is neither manual-verified nor flagged provisional, so
it falls outside both branches of the invariant while being rendered with the same authority as a
manual page.

**Repair:** three-state provenance on every rendered value — `authored`, `derived`,
`provisional` — with `derived` rendered distinctly (`52 → 45`). `verified` now attaches
independently to the authored point and to the declared range; an unverified range means mood
must not move that parameter at all, and the engine leaves it alone rather than generating inside
bounds nobody checked. The §9 audit script counts provisional points, unverified ranges and
mood-inert params separately.

**Second pass (§3.4 below):** the repair was stated in prose before the types could express it.
It is now carried by the types themselves — see 3.4 for what had to change and why the prose
alone was not enough.

### Invariant 6 — "same inputs + same seed → byte-identical guide"

**Conflicts with §8.2**, which admits permalink drift outright: same inputs, same seed, different
guide after a resolver change. That is the invariant failing, not a footnote to it.

**Conflicts with §7.2 and §6.2** more quietly, and this is the more dangerous one.
§3.5 tie-breaks with `a.r.id.localeCompare(b.r.id)` and §6.2 tie-breaks "alphabetical".
`localeCompare` reads ICU collation data that varies by Node build, by platform and by ambient
locale, so two tied recipes can order differently on a developer's Mac and on Vercel — identical
inputs, identical seed, different bytes, no error anywhere. Float summation in §7.1's cost had the
same property for a different reason.

**Repair:** scope the invariant to "same inputs + same seed + **same resolver version**, on any
platform", stamp and surface `RESOLVER_VERSION` in the permalink, and ban locale-dependent
comparison and formatting throughout — code-unit comparison (`a < b ? -1 : a > b ? 1 : 0`), no
`localeCompare`, no `toLocaleString`/`Intl.NumberFormat` in rendered values. §7.2 now requires the
golden-file test to run on two platforms with a non-`C` `LANG` in one job, because a
locale-ordering bug is invisible to a single-machine test suite.

Freezing resolved output into the permalink was considered and rejected: it is orders of
magnitude past the 40-byte budget, and it would freeze bugs into shared links as firmly as it
freezes intent.

---

## 3. Type-level corrections beyond §12

### 3.1 Section occupancy ownership — `Assignable` was the wrong owner

§4.2 put `Map<sectionName, roleId>` on each assignable. Wrong twice:

- **Purity.** `Assignable` is derived solely from device data by `expand()` (§2.2) and is
  identical for every guide ever resolved. Hanging per-guide state on it makes expansion impure
  and unshareable — two guides open in two tabs would fight over the same objects, and the
  "expand once, cache" step in the pipeline becomes unsound.
- **Identity.** `roleId` is not an identity. A template may legitimately request the same role
  twice (two toms, two stabs), so the value stored has to be a *request* id.

**Correction:** role requests gain a stable `id`; occupancy moves to resolver output as
`Map<AssignableKey, Map<SectionName, RequestId>>`, built by §7.1, consumed by the crowding key,
read by the renderer. `Assignable` stays a pure function of the device.

### 3.2 Priority ordering — the document contradicted itself

§4 authors `priority: 1` for kick and `priority: 4` for texture, i.e. 1 is most important. §7.1
says "requests ordered by priority descending" and indexes `MISS[priority]`, both of which read
as 4 being most important. One of the two had to be wrong and the template data is the one people
will author against.

**Correction:** priority 1 is highest; requests are ordered by **ascending** priority number; the
miss objective is a vector indexed by priority rank, so a single priority-1 miss beats any number
of priority-2 misses. `optional: true` removes a request from the miss vector entirely and is
scored below crowding instead.

### 3.3 Pattern/recipe pipeline consequences

Moving patterns to templates changes §7's pipeline, not just §3's shape:

- **New step 5, before assignment:** select the pattern variant per request and section from the
  density band. It must precede assignment because a variant's length and slot mix are part of
  what a recipe has to articulate.
- **New step 8, after recipe resolution:** bind `articulation` to the selected pattern's slots. A
  slot the variant does not contain is dropped silently — that is not a gap, the device simply had
  nothing to say about a slot with no hits in it.
- **Step 5 depends only on template + mood**, so pattern selection is independent of the rig: two
  users with different boxes and the same inputs get the same rhythms. That is the correct
  behaviour and a cheap test.
- **§8's step-programming phase** now renders template pattern + device articulation rather than a
  recipe's own hits.
- **§5's inspiration patch** (`modify: { kick: { pattern: 'sparse-drop-one' } }`) already assumed
  patterns were addressable in template space — an inspiration cannot reach into a device folder
  without breaching invariant 3. §4.3 makes that assumption true rather than accidental.
- **§6's density row** is rewritten: variant selection plus probability-param offsets, never hits.
- **Band fallback is reported**, not silent: "no band-3 kick authored; using band 2". A knob that
  visibly does nothing is a bug report waiting to happen.

### 3.4 `Param` could not represent the provenance §3.2 promised

The three-state repair above was written as prose and left the types untouched, so the document
described a scheme it could not build. Two concrete gaps:

- **`verified` lived on the recipe, as one field.** §3.2 requires the authored *point* and the
  declared *range* to be verified independently — that is the whole content of "a legal value is
  not a verified value". One boolean-ish field on the enclosing recipe cannot say "the manual
  gives the legal range, the point value is my ear", which is the ordinary case for anything
  tuned by taste. Nor could it distinguish two params in the same recipe with different debts.
- **`Param.range` was `[number, number]`.** A bare tuple has nowhere to hang a citation, so the
  legality gate — mood may only move a param inside a *verified* range — had no representation at
  all. As written, the resolver could not tell an inhibited param from a movable one.
- **One `Param` served both the manifest and the renderer.** `derived` does not exist until §7
  step 9 has run and a manifest cannot author it, so provenance had to be optional on `Param` —
  which means nothing downstream could rely on it, and "every rendered value carries provenance"
  degrades to a convention. Invariant 4 was unenforceable by construction.

**Correction (§3.1):**

- `Verified = { source: string } | false`, and `NumericRange = { min; max; verified? }` so bounds
  carry their own claim.
- `Param` splits into `AuthoredParam` (manifest-facing, `verified?` on the point, `verified?` on
  the range, both inheriting the recipe's citation when omitted) and `ResolvedParam`
  (renderer-facing, with a **non-optional** `Provenance`). §7 step 9 is the only crossing point.
  Invariant 4 becomes a compile error rather than a discipline.
- The two gates are separated explicitly: the **range** decides legality (whether mood may move
  the param at all), the **point** decides authority (`authored` vs `provisional`). All four
  combinations are enumerated in §3.2 so the state function is total.
- `provisional` dominates `derived`: an unverified point moved inside a verified range renders the
  arrow *and* keeps the badge. Refusing to move provisional params instead would make a device
  with unverified recipes silently ignore the mood knobs — a visible bug that hides an invisible
  debt.
- Consequential edits: §6.1 clamps against `range.min`/`range.max` and states the legality gate;
  §7 step 9 names the `AuthoredParam` → `ResolvedParam` crossing; §9's audit counts three debts;
  §11 step 1 names the corrected types; §8's sound-design phase renders provenance.

Two further defects reported alongside this one — a duplicate `roles` field in `Assignable` and a
duplicate "Sound design" item in §8 — **were not present** in the document as it now stands.
`Assignable` declares `roles` once (§2.2) and §8's phase list has one "Sound design" entry; the
only other occurrence of that string is prose inside the "Hook" item. Nothing was removed for
either. One adjacent nit was fixed: `VoiceSpec`'s `pool` variant was missing the separator after
`count`.

---

## 4. Carried forward, not resolved

Recorded in the revised §12 "Still open". Items 1 and 2 are marked **blocks step 1** — they are
undecided type shapes, not deferred features, and the Verdict above explains why. Items 3 and 4
do not block.

1. **Section-transition patterns — blocks step 1.** One variant per request per section means change only happens
   at boundaries. Real arrangements change *within* a section (last two bars of a 32-bar Drop).
   Either patterns get a bar offset or fills stay out of v1 — and the decision is a change to
   `Pattern`, so it comes before step 1, not before the second template.
2. **Two requests, one role, one device — blocks step 1.** Now that requests have identity, nothing stops two
   `tom` requests landing on the same one-voice device in different sections. Legal by §4.2,
   probably wrong musically. Needs a spread preference in the `Score` vector (an insertion, which
   reorders every lower key) or `distinct: true` on the request — both step-1 surface.
3. **`comfortableVoices` for large pools.** What number does a Deluge declare when its real limit
   is CPU? Currently unmodelled, and it will distort the crowding key — the second-highest key in
   the objective.
4. **Fixture authority.** The §7.1 fixtures encode musical judgement about rigs nobody has played
   yet. They need one pass by someone with the boxes on a desk before they are treated as tests
   rather than as guesses.

---

## 5. Test obligations created by this review

| # | Obligation | Source |
|---|---|---|
| 1 | Golden-file determinism run on two platforms, one with non-`C` `LANG` | invariant 6, §7.2 |
| 2 | Rig fixture table asserting relative assignment outcomes, not costs | §12.3, §7.1 |
| 3 | Branch-and-bound optimality test with a non-monotone-idle rig | §7.1 |
| 4 | Pattern selection independent of device set, same inputs | §7 step 5 |
| 5 | Provenance stamped on every rendered value; no `authored` on a derived one | invariant 4, §3.2 |
| 5a | All four point/range verification combinations map to the state §3.2's table names | §3.2, §3.4 |
| 5b | Mood leaves a param untouched when its range is unverified, however loud the knob | §3.2, §6.1 |
| 5c | Param-level `verified` overrides an inherited recipe citation, in both directions | §3.1 |
| 6 | `expand()` purity: same device object out of two resolves, no occupancy on it | §4.2 |
| 7 | Zod rejects an `articulation.set` key absent from `features.perStep` | §3, §9 |
| 8 | Registry staleness test, now load-bearing for invariant 2 | §9 |
