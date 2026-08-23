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

Actual values only: `DECAY 38`, never "short decay". Anything not manual-verified is flagged
provisional and surfaced as such in the UI. Roughly 15–20 recipes covers a device well; there is
no expectation of filling all 23 roles × 6 characters.

## Conclave

Multi-agent build sessions run through the `conclave` CLI (Codex advising, Claude implementing).
Registrations live in `.claude/settings.json` and `.codex/hooks.json`, both machine-local and
listed in `.git/info/exclude` — do not commit or hand-edit them. `.conclave/config.json` sets
`permissions: bypass` for this project, so seats run commands without prompting.

`conclave guard` exits non-zero while participant sessions are live; do not commit a tree while a
session is running, since it is still moving.
