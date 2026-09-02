# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run verify              # tsc --noEmit && vitest run — the gate. Must pass before any commit.
npm run typecheck           # tsc --noEmit alone
npm run test                # vitest run alone

npx vitest run test/template.test.ts        # one file
npx vitest run -t "rejects sections"        # one test by name
npx vitest                                  # watch mode
```

`vitest.config.ts` deliberately omits `passWithNoTests`, so an empty run fails loudly rather than
reporting green on a broken include glob.

## What this is

A deterministic generator: hardware you own + a musical direction → a phased, at-the-machine
production guide with real parameter values. **No LLM calls anywhere.** Variety comes from
combinatorics and seeded selection. The engine is small; the authored content library is the
product.

`DESIGN.md` is the specification and the authority. `DESIGN-REVIEW.md` is the record of the review
that produced its current shape — read it when a decision looks arbitrary, because it usually
records why the obvious alternative was rejected. Section references like `§7.1` appear throughout
the code and point into `DESIGN.md`.

## Invariants

These are load-bearing. If a change would break one, stop and fix the architecture instead — and
update `DESIGN.md` in the same commit.

1. No LLM calls. Deterministic by design.
2. Adding a device = adding one folder under `lib/devices/`. No *hand-edited* file outside it;
   `lib/devices/registry.generated.ts` is machine-written by `prebuild` and never hand-edited.
   **A folder may import a sibling** (#196) — three MPCs share one manual, and copying twenty
   recipes to avoid the import would be three copies drifting apart with one of them corrected.
   The importer owns the risk and must make a break loud: `akai-mpc-xl` routes shared facts
   through a `shared()` helper that throws when the sibling stops carrying one, and
   `akai-mpc-one-g2` through `pageInV39`, which throws on a citation it has not mapped to its own
   manual. An import without such a guard is the thing this forbids, not the import.
3. **`Role`, `Character`, `MoodAxis` and `PatternSlot` are the entire shared vocabulary.**
   Templates never name a device; devices never name a genre. Adding a fifth shared vocabulary is
   an architecture change, not a convenience.
4. Every rendered value carries provenance — `authored`, `derived`, or `provisional`. Enforced by
   the type system: `ResolvedParam.provenance` is non-optional.
5. Gaps are shown honestly. Never invent an assignment to fill a hole.
6. Same inputs + same seed + same resolver version → byte-identical guide, **on any platform**.
7. Hints are jogs (under ~8 words), not documentation.

### Terminology

Clock roles are **`canSendClock` / `canReceiveClock`**, and the guide says **clock source** and
**sync to it**. Never master/slave — not in identifiers, not in prose, not in comments.

"Master FX" and "master bus" stay. That is the master-copy sense, universal in music production
and not half of a pair.

### Two rules that are easy to break silently

- **No locale-dependent comparison or formatting.** No `localeCompare`, no `toLocaleString`, no
  `Intl.*`. ICU collation varies by platform and ambient locale, so a tie-break using it produces
  different bytes on a laptop and on CI with no error anywhere. Compare by code unit:
  `a < b ? -1 : a > b ? 1 : 0`.
- **No `Math.random()` in the resolver.** A numeric seed drives every tie-break. The seed permutes
  only among *exactly equal* costs; everything else sorts deterministically.

## Architecture

Layers with a strict contract between them. Roles are the join.

- **Devices** (`lib/core/device.ts`) know their own capabilities and recipes, nothing else. Two
  authored voice shapes — `fixed` (named voices: TR-1000's BD, SD, LT) and `pool` (fungible
  capacity: Tracker Mini's 8 tracks) — both flattened by the registry into one `Assignable` before
  the resolver runs. Recipe lookup keys on `poolId ?? voiceId`, so one pool recipe serves every
  ordinal; without that, pools just relocate the duplication.
- **`Assignable` is a pure function of device data.** It is identical for every guide ever
  resolved, carries no per-guide state, and is safe to expand once and cache. Per-guide state lives
  in `Occupancy` (`Map<AssignableKey, Map<SectionName, RequestId>>`) — keyed by *request* id, not
  role id, because a template may request the same role twice.
- **Templates** (`lib/core/template.ts`) are device-agnostic: role requests, structure, harmony,
  hooks, and step patterns. Step patterns live here, not in device recipes — a four-on-the-floor
  kick is a property of the genre, not of the box. Devices contribute `articulation`, addressed by
  `PatternSlot` rather than absolute step index, so it survives any variant selected.
- **Params split by audience** (`lib/core/params.ts`). `AuthoredParam` is what a device folder
  contains; `ResolvedParam` is what the renderer sees. Only the resolver crosses that line.
  `verified` is two independent claims: on the *point* it decides authority (`authored` vs
  `provisional`); on the *range* it decides legality (whether mood may move the value at all).
  A verified range does not verify the point inside it.
- **Mood** applies offsets after recipe resolution. A device declines an axis simply by having no
  param that declares it — there is no capability check and must not be one.
- **The objective** (`lib/core/objective.ts`) is a lexicographic `Score` vector, never a weighted
  sum. There is no exchange rate between "the kick is missing" and "the Deluge is idle", so scalar
  weights would be unfalsifiable. Every component is an integer — no float summation, hence no
  cross-platform drift. Fixtures assert *relative* outcomes ("the sub goes to the Deluge"), never
  cost numbers, so they survive a re-ordering of the lower keys.

## Rigs are capped at ten devices, so search cost is settled (#301)

**`MAX_RIG_DEVICES` is 10.** `withDevice` refuses the eleventh tick and `checkGuideInputs` rejects
a permalink that names more, so a rig larger than ten cannot be reached through the picker or
through a hand-edited URL. There is no "select all" and there must not be one.

**Measured on the worst rig the product can build, with `npm run measure:search`:**

```
rig limit      10 devices  (MAX_RIG_DEVICES)
worst rig      46,609 nodes   (weave seed 15)
cap         2,000,000
headroom             43x  —  2.33% of the cap
```

It got *cheaper* at #25, from 83,874 nodes, and the direction of that is worth keeping: a
feasibility constraint prunes the tree rather than complicating it. An infeasible partial
assignment is cut, where an expensive one still has to be explored.

**This section used to be an argument. It is now a fact, and the difference is the point.** The
argument kept losing: the whole-catalogue sweep reports a worst case near the cap, and that figure
has been read as a limit the product is approaching **three separate times** — it blocked a device
from landing (#248), blocked a test (#293), and nearly blocked a ten-recipe percussion change
(#300). Each time the repair was to re-explain that nobody owns 46 boxes. #301 stopped explaining
and made it unreachable instead.

So:

- **`measure:search` gates on the legal rig and reports the catalogue figure beside it, labelled.**
  Read the first number. The second is a benchmark and says nothing about anyone's guide.
- **Cost is not monotonic in device count**, so "N devices" is never the unit to reason in. Eight
  devices can cost more than twelve; it depends on which boxes collide on crowded roles.
- **Do not open the search for performance.** At 4% of the cap there is nothing to win, and a
  cross-device dominance rule would return a *different* optimum at equal score, need a
  `RESOLVER_VERSION` bump, and fail silently by handing back a worse allocation (#228).
- **Before adding a request to a direction**, run `measure:search` and read the legal-rig line.
  A part added to a crowded direction is the one thing that moves it, and it moves the catalogue
  figure far more than the real one — #300 saw 728k → 1.7M on the catalogue and **+3 ms** on an
  eight-box rig.

## Build order

`DESIGN.md §11` is the sequence and the reasoning for it. **Status lives in GitHub issues, not
in the repo** — each step is one issue labelled `build-step` under the `v1` milestone, carrying
its own detail, watch-outs and done-when. Do not add progress markers to `DESIGN.md` or here;
check and close the issue instead.

```bash
gh issue list --label build-step --milestone v1        # what is left, in order
gh issue view <n>                                      # detail and done-when for one step
```

Step 4 (adding Tracker Mini and Deluge) exists to *prove no engine changes were needed*. That is
the experiment the whole ordering is built around — if adding a device requires touching the
engine, the abstraction is wrong and the fix belongs before step 4, not after.

Do not start UI work before the resolver passes its tests.

## Content authoring

Device manuals are in `manuals/` — gitignored for size and copyright, and they are the source of
truth for every parameter value.

Two things about reading them:

- **`pdftotext` is not enough.** It scrambles the columns of a specifications table and extracts
  nothing at all from a dimension callout inside a drawing. A grep over the text dump is not
  evidence a manual is silent. Render the page and look at it:
  `pdftoppm -f <page> -l <page> -r 120 -png <pdf> <prefix>`, then Read the PNG.
- **Panel artwork is reference, never asset** (`DESIGN.md §10`). Look at the diagrams to get
  proportions and control clusters right, then draw our own panel. Never extract, embed, trace
  pixel-for-pixel, or ship vendor artwork — patchscore.app is public and `manuals/` is gitignored
  precisely so none of it is redistributed. Wanting a device image to make a panel work means the
  panel design is underweight; raise it rather than reaching for the manual.

**A cited range can still be the wrong range.** Where a manual prints more than one scale for a
control, the citation beside a value proves nothing on its own — the value has to come from the
scale that is actually in force. Two devices have hit this: the TR-8S's INST table splits by
loaded tone, so `SNAPPY` only exists for ACB tones of the SD category; and the minilogue xd has
four knobs whose scale a switch elsewhere replaces, including `SHAPE`, which under NOISE has four
separate printed ranges in three different units. Both solve it the same way — the recipe carries
the switch or tone as a param, so the pairing cannot come apart. A value read off the wrong one of
two printed scales is made up, however carefully the range beside it is cited.

Actual values only: `DECAY 38`, never "short decay". Anything not manual-verified is flagged
provisional and surfaced as such in the UI. Roughly 15–20 recipes covers a device well; there is
no expectation of filling all 23 roles × 6 characters.

## Reading on a phone (#21)

§8 says the guide is read *at the machine* — standing at a rack, hands busy, often in poor light.
That is a phone or a tablet propped against something far more often than a laptop, so narrow
viewports are a primary context and not a fallback. Standing rules, all settled in #21:

- **The rack diagram** must not be squashed to fit (relative width was the point), must not scroll
  horizontally (cables get cut by the viewport edge, which is exactly what the diagram exists to
  show), and must not be hidden on mobile. `prefers-reduced-motion` gates the cable animation, and
  the diagram stays comprehensible without it.
- **Knobs**: `touch-action: none` on the knob itself and nothing wider, or the page locks up when
  someone tries to scroll past a control. Hit target and visual size are decoupled — a knob drawn
  to look right on a panel is smaller than a 44px target.
- **Typed input is the accessible path and the precise one**, so it matters more on a phone, not
  less. It must never be a hidden fallback behind a drag gesture. Shift-for-fine-adjustment has no
  touch equivalent; typed-only fine adjustment on touch is a legitimate answer if stated.
- **Parameter values stay monospace and legible at arm's length.** Wrap or scroll; do not shrink
  type to fit.
- **Anything wide** — tables, code blocks, long rows — scrolls inside its own `overflow-x: auto`
  container. The page body never scrolls horizontally.
- **Hints** (§8.1) keep their reserved space at every width, so toggling changes only
  `visibility` and nothing reflows. Verify at 390px.

## Conclave

**Use it for substantial work. Do not build these inline.**

A conclave session is Codex advising and Claude implementing, and it exists because the expensive
mistakes here are ones a second reader catches early: a device authored from the wrong Roland
document, a direction that re-litigates a decision its spec already settled, a change that
re-derives a ruling `CLAUDE.md` already made. Reach for it when the work is:

- **a device** — a folder under `lib/devices/`, from a manual
- **a direction** — a template under `lib/templates/`
- **an issue with a written spec**, where the issue is the authority and the job is to execute it
- **anything that will touch `lib/core`**, where an advisor is the cheapest guard against a change
  that breaks an invariant

Do it inline when the work is small, local and already understood: a fixture update, a copy
change, a bug with a known cause, a measurement. The test is whether somebody could disagree with
your *approach* rather than your typing — if yes, seat an advisor.

```bash
conclave --version                  # names a commit; verify against the installed build
conclave guard                      # non-zero while participant sessions are live
conclave sessions                   # what has run, and what state it ended in
.conclave/queue/launch-next.sh      # the worked invocation, including the setsid dance
```

`launch-next.sh` is the reference for **how** to start one, not just for the queue: conclave must
not share a process group with the caller, or a monitor exiting takes the run down with it, and
that cost a 45-minute turn once already. Read it before hand-rolling an invocation.

Multi-agent build sessions run through the `conclave` CLI (Codex advising, Claude implementing).
Registrations live in `.claude/settings.json` and `.codex/hooks.json`, both machine-local and
listed in `.git/info/exclude` — do not commit or hand-edit them. `.conclave/config.json` sets
`permissions: bypass` for this project, so seats run commands without prompting.

`conclave guard` exits non-zero while participant sessions are live; do not commit a tree while a
session is running, since it is still moving. That rule is for the **operator**. A seat committing
its own work is expected to see a red guard for its whole run — the condition never clears while it
is seated — so it should enumerate the dirty paths, confirm they are all its own, and commit.

**Send an operator message to whichever seat it is for.** `>advisor`, `>implementer` and `>both`
are all fine, and a one-seat message is a restriction worth keeping when you mean it.

This used to say the opposite, and the reason is worth keeping because the rule outlived it. A
message withheld from a seat once armed conclave's `authority_conflict` detector against every
later instruction touching the files that message mentioned — one informational note cost four
false-positive pauses in a single run, the last matching on `DESIGN.md` alone, which every engine
commit touches. So this file said to broadcast everything.

**That was fixed upstream in conclave#171**, in `0b6bbe7`, an ancestor of v0.5.9 and everything
since. Handing the withheld message over in full to the seat that never saw it now moves the
record, and only the record: the routing log still says what it said, so `/audit` and `asymmetryAt`
still answer the historical question. That handover *is* the repair the pause asks for.

So the pause this rule was avoiding is cheap and scoped — it stops only the workstream carrying
that instruction, and it is the **operator's** to answer rather than the advisor's, structurally,
since the advisor is the seat the message was kept from. Broadcasting to dodge it throws away a
restriction you had judged worth making.

**The general lesson is the one this paragraph is an instance of: check that a remembered issue
number is still open before reasoning from it.** Verify against the installed build — `conclave
--version` names a commit, and the source tree answers `git merge-base --is-ancestor` — rather than
against what this file last recorded.

Operator-facing behaviour also moved in v0.5.11, all four verified in the source tree rather than
taken on report: a `/command` given a bare `<<TAG` is refused and its body swallowed rather than
leaked line by line (#173); a bypassed seat reports a permission as taken rather than as one to
answer (#177); **a run checks for room before starting and stops deliberately when it runs out
(#180)**, which is the failure that cost most of one night here before anyone suspected the disk;
and `invariant_violated` is a new non-zero outcome, so an invariant the orchestrator broke no
longer reports as a transport failure (#74).
