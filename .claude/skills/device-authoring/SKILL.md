---
name: device-authoring
description: Author or revise a device under lib/devices/ — reading its manual, citing provenance, writing recipes, drawing its panel, and checking what it costs the search. Use when adding a new box to the library, fixing a device's values or citations, resolving a provisional or unread capability fact, or drawing a panel.
---

# Authoring a device

`CLAUDE.md` has the repo-wide rules and `DESIGN.md` is the specification — §2 (devices), §2.6
(capability provenance), §3 (recipes), §3.1/§3.2 (params and provenance), §10 (UI direction, which
is where the panel rules live). This file is the part that is not written down anywhere else: what
four authoring runs had to rediscover, and what it cost them (#146).

Read it before opening a manual, not after.

---

## 1. Get the right document first

`manuals/README.md` is the index and the recovery instructions, and it is the **only tracked file
under `manuals/`** — `.gitignore` excludes the PDFs for size and because redistributing vendor
manuals is not ours to do. So a fresh clone, a CI checkout, or a git worktree (which does not
inherit ignored files) has that README and no documents. Check before you start, and fetch from the
links in it if the PDF you need is not there. Do not author from memory, and do not cite a document
you have not opened.

Four traps, all of which have cost time here.

**`pdftotext` is not evidence a manual is silent.** It scrambles the columns of a specifications
table and extracts *nothing at all* from text inside a drawing. A grep over the text dump proving
nothing is there proves nothing. Render the page and look at it:

```bash
pdftoppm -f <page> -l <page> -r 120 -png manuals/<file>.pdf /tmp/pg   # then Read the PNG
```

This caught the operator out twice in one session — once concluding the Tracker Mini ships no
factory content, when printed p.34 says it ships fifty packs, in a callout inside a drawing. That
reading is now recorded the other way round in `lib/core/device.ts`'s `DeviceContent` doc comment.

**Printed page number and PDF page number differ per manual, and per manual from the same maker.**
The DFAM and the Grandmother match; the Mother-32 is offset by one; `manuals/README.md` records the
Metropolix as printed folio = PDF page − 1. **Check three footers before citing anything.**

**Roland ships split manuals.** The Owner's Manual names the controls; a second document has the
ranges. **Authoring from the Owner's Manual alone produces a device whose every value is
provisional and whose mood knobs are inert** — #18 records that happening to the TR-1000. Assume
the trap on every Roland box and go looking for the second document before you write a value.

The TR-6S is the clearest illustration: its Owner's Manual is 41pp and documents no parameter
ranges at all, while `manuals/TR-6S_Parameter_eng02_W.pdf` is 13pp of `Parameter | Value |
Explanation` tables and is where its values have to come from.

**Roland names that second document three different ways**, so the name is not derivable from a
sibling product:

| device | the ranges live in |
|---|---|
| TR-1000 | `manuals/TR-1000_reference_eng02_W.pdf` — lowercase `reference` |
| TR-8S | `manuals/TR-8S_Reference_eng01_W.pdf` — capital `Reference` |
| MC-101 | `manuals/MC-101_Reference_eng01_W.pdf` — capital `Reference` |
| TR-6S | `manuals/TR-6S_Parameter_eng02_W.pdf` — a different word entirely |

The Owner's Manuals vary too: the TR-1000's and TR-8S's carry no such segment
(`TR-1000_eng02_W.pdf`), and the TR-6S's is `TR-6S_Manual_eng01_W.pdf`. Roland returns **403, not
404**, for a filename that does not exist, so a wrong guess looks like a permissions problem
rather than a typo.

More generally: **neither Moog nor Roland has a filename convention, so search rather than guess.**
Twelve guesses at those patterns produced one file; a web search produced the rest at once.

**A cited range can still be the wrong range.** Where a manual prints more than one scale for a
control, the citation beside the value proves nothing on its own — the value has to come from the
scale actually in force. Two devices have hit this: the TR-8S's `SNAPPY` exists only for ACB tones
of the SD category, and the minilogue xd's `SHAPE` has four separate printed ranges in three units
under NOISE. Both solve it the same way: **the recipe carries the switch or the tone as a param**,
so the pairing cannot come apart. A value read off the wrong one of two printed scales is made up,
however carefully the range beside it is cited.

---

## 2. Provenance: three systems, and they are not interchangeable

### Parameter values — `Verified` (§3.1, §3.2)

`Verified = Cite | false`, where `Cite` is `{ kind: 'manual' | 'observed'; source: string }`
(`lib/core/params.ts:27`). `manual` is a page; `observed` is somebody who turned the knob and read
the limits, with the firmware version in the source string; `false` is nobody checked.

**There is no `page` field** — `source` is free text (`'TR-1000 Reference Manual p.42'`,
`'TR-1000 unit, firmware 1.11'`). Fourteen of the eighteen manifests define a local `cite(page)`
helper that builds the string from a page number; the four that do not
(`empress-zoia-euroburo`, `roland-mc-101`, `tascam-model-2400`, `zoom-livetrak-l-8`) write the
citations out. Copy whichever the neighbouring device does rather than inventing a third format.

`verified` is **two independent claims**, and this is the one that gets conflated:

- on the **point**, it decides authority — `authored` vs `provisional`;
- on the **range**, it decides legality — whether mood may move the value at all.

A verified range does not verify the point inside it. An enum is the clean shape: the TR-1000's
`GEN` cites the options list (the legality claim, with the page) and leaves `verified: false` on the
selection (which generator this recipe reaches for is taste).

### Capability facts — `capabilityEvidence` (§2.6, #22, #120)

`clock`, `io`, `voices` and `features` are read off a manual exactly as a parameter range is.
**Their citations go in `device.capabilityEvidence`, a map keyed by field path — never in a
comment.** Page numbers in comments is what #22 existed to end: `npm run audit` cannot see them and
neither can a reader of the device page. The TR-1000 carried nine of them that way.

The paths are a **closed list** (`CAPABILITY_FACTS`, `lib/core/device.ts:636`) plus two keyed
families built by `jackFact(id)` → `jacks[<id>]` and `clockSourceSetupFact(t)` →
`clock.sourceSetup[<transport>]` — keyed by id and transport, **never by index**, because an array
position moves when a jack is inserted and a citation would silently re-point at the neighbouring
socket. `physical` and `panel` are deliberately absent: both carry a required `verified` of their
own. `comfortableVoices` is absent for the opposite reason — no page states it.

Three things `DeviceSchema` will fail the build on, and all three are easy to hit:

- an unrecognised path — `capabilityEvidence names '<path>', which is not a capability fact (§2.6)`
- a jack key for a jack this device does not declare
- **a declared jack or clock setup with no entry** — `jack '<id>' has no capabilityEvidence entry at
  'jacks[<id>]' (§2.6)`. Every declared member of both keyed families needs one.
  `lib/devices/moog-dfam/index.ts` handles this by generating the keys inside its own `jack()`
  helper rather than writing them out.

`CapabilityEvidence` is a superset of `Verified` — `manual`, `observed`, `false` — plus three
states for a fact somebody went looking for and did not come back with a claim from. **Every one
of the three requires a `reason`, and that is the point of them:**

| state | means | the work is |
|---|---|---|
| `unknown` | read it, and the document does not say | **finished** — do not redo it |
| `unread` | the document could not be opened; name *which* one and why | blocked on a file, not on an afternoon |
| `cited-against` | read it, and it answers **no**. Carries a full `Cite` | finished, and the only one with a page |

The bars are not interchangeable. `unread` needs a **specific named document** nobody here can
open; `unknown` is documents opened and the reading running out; `cited-against` is a document
answering no. *"Documented somewhere else"* names no document and is a reading that stopped.

A bare state is an author giving up in a field that reads like diligence (#117, quoted in #120).
The reason is what makes the difference visible.

`npm run audit` splits these into two lines by one question — is there a document behind this entry?

```
caps   <n> total  <n> manual  <n> observed  <n> cited-against
gaps   <n> unchecked  <n> undocumented  <n> unread
```

Note the two renames on the way out: an `unknown` fact prints as **`undocumented`**, and `false`
prints as **`unchecked`** (`evidenceKind`, `lib/studio/provenance.ts`).

**The `caps` line must not regress.** Nothing enforces that — the audit is *"a report, not a gate"*
and always exits 0, because provisional values are legal and shown honestly (invariant 5). So it is
on the author: run it before and after, and put both in the commit (§4 below).

### Content — `Device.content`, not `sourceAudio` (§2.6, #111)

Two different fields, and they are easy to confuse:

- **`Device.content?: DeviceContent`** (`lib/core/device.ts:466`) is the three-state claim below.
- **`Recipe.sourceAudio?: { need; prep?; hint? }`** (`lib/core/device.ts:1173`) is per-recipe prose
  saying what audio to load. `need` is prose and stays prose — a closed vocabulary of source kinds
  would be a fifth shared vocabulary (invariant 3).

`DeviceContent` is whether the box ships usable audio at all. Three declarable kinds, and the fourth
state is the *absence* of the field:

- **`enumerable`** — a document prints a named list, so a recipe **references** an entry from it
  rather than describing what to load, the way `GEN` does. A recipe on such a box **may not carry
  `sourceAudio`**; `DeviceSchema` refuses the pair.
- **`shipped-library`** — factory content exists and no document enumerates it. `library` is what a
  reader recognises, `location` is where they go on the box, `reason` says why a recipe still
  describes its audio in prose.
- **`user-supplied`** — the box ships nothing usable for these parts. **No device in the library is
  in this state.** It means proving an absence, which is the expensive direction.
- **not declared** = unknown. `'unknown'` is deliberately *not* a `DeviceContent` kind — a claim of
  not-knowing is still a field somebody has to remember to write, which is how the state stayed
  invisible. Absence is the default, and `contentNotice()` turns it into a sentence the reader sees,
  so the guide never silently says "bring your own" on no evidence.

Where somebody did the work and came back empty, the reason goes in `capabilityEvidence` at the
`content` path as `unknown` / `unread` / `cited-against` — the same slot and the same three states.
Any device with a recipe carrying `sourceAudio` **must** have a `content` entry there, and it may
not be `false`.

---

## 3. Recipes

- **Roughly 15–20 recipes covers a device well.** There is no expectation of filling 23 roles × 6
  characters, and no credit for padding toward it.
- **Actual values only.** `DECAY 38`, never "short decay". Anything not manual-verified is flagged
  provisional and surfaces as such in the UI (invariant 4, invariant 5).
- Recipe lookup keys on `poolId ?? voiceId`, so **one pool recipe serves every ordinal**. Writing
  one per ordinal just relocates the duplication.
- A device declines a mood axis by **having no param that declares it**. There is no capability
  check for this and there must not be one.
- Devices contribute `articulation` addressed by `PatternSlot`, never by absolute step index —
  the step pattern belongs to the template and the device must survive whichever variant it gets.

---

## 4. Mechanics

**One folder under `lib/devices/`, and nothing hand-edited outside it** (invariant 2). A device
folder is two files:

| file | what |
|---|---|
| `<folder>/index.ts` | **required.** The manifest. Must export `device`; that is the only name the generator reads, and `device.id` must equal the folder name. |
| `<folder>/panel.ts` | optional. §10's original panel drawing (below). Imported by `index.ts` itself, so its export name is a device-local convention. |

Nothing else goes in the folder — every one of the eighteen is exactly these two files, and there is
no ignore list, so a stray directory under `lib/devices/` fails the build.

Seventeen of the eighteen also have a test file under `test/`, but the naming is not a convention
you can derive: some match the folder (`test/roland-tr-8s.test.ts`), some drop the maker
(`test/deluge.test.ts`, `test/cascadia.test.ts`, `test/mc-101.test.ts`, `test/tr-1000.test.ts`,
`test/tracker-mini.test.ts`), and `moog-dfam` has none. The generator requires no test; look for the
neighbouring device's before assuming a name.

`lib/devices/registry.generated.ts` is written by `npm run gen:registry` (run automatically as
`prebuild`) and is never hand-edited. `npm run check:registry` fails if it is stale. Every manifest
is Zod-validated in the generator, so a bad manifest fails the build rather than a request.

**Check what the device costs the search before you call it done.** `DEFAULT_NODE_CAP` is `150_000`
(`lib/core/search.ts:293`), and §7.1's documented behaviour on a capped search is to degrade to
greedy — the guide still renders, it just quietly stops being optimal. #78 is the standing issue:
the DFAM took `industrial-techno`'s worst seed from 108,608 nodes to **195,951** and capped every
seed, on a device *smaller* than the TR-1000. `liveFloor` fixed the bound rather than the cap.

**The suite does catch capping** — `test/search-symmetry.test.ts:1095`, *"leaves every shipped
template inside the shipped cap"*, sweeps every template × seed over the whole registry and asserts
`capped === false` and `method === 'exhaustive'`. So `npm run verify` goes red rather than the guide
going quietly greedy. What it does **not** give you is the number, and the number is what tells you
how much headroom the next device has. Nothing surfaces `capped` in the rendered guide either, so
measure it directly — run this on `main` and again with the device added:

```bash
npx tsx -e "
import { resolve, moodState } from './lib/core/index'
import { DEVICES } from './lib/devices/registry.generated'
import { TEMPLATES } from './lib/templates/index'
let worst = { n: -1, t: '', s: 0 }; let capped = 0
for (const t of TEMPLATES) for (let s = 1; s <= 24; s++) {
  const r = resolve({ devices: DEVICES, template: t, mood: moodState({}), seed: s })
  if (r.search.capped) capped++
  if (r.search.nodes > worst.n) worst = { n: r.search.nodes, t: t.id, s }
}
console.log('devices', DEVICES.length, 'capped', capped, 'worst', worst.n, worst.t, 'seed', worst.s)
"
```

`npm run bench:search` is the complementary instrument — it isolates pool size and prints the real
registry before/after symmetry breaking — but its rig list is hardcoded, so it will not see a device
you just added.

**Report both numbers in the commit**, the way the `DEFAULT_NODE_CAP` docstring does. If the sweep
comes back `capped > 0`, that is #78 firing, not a number to tune — the cap has been raised twice
and #78's argument that raising it treats the symptom has been right both times.

The growth curve is **recipes × supported roles, not folder count**: a twelve-device rig measured
33,142 nodes worst case, and one device adding 19 recipes over 6 tonal roles took the same template
to 86,722. Size against that, not against how many folders are in `lib/devices/`.

The docstring's headline figures — 66,155 worst case at sixteen devices, 58,869 for the `full-rig`
fixture — are from the `liveFloor` work. At **eighteen** devices the same sweep measures **132,615**
(`industrial-techno`, seed 9), nothing capped: about 12% headroom left.

**And run the audit**, before and after:

```bash
npm run audit                 # per-device points / ranges / units / caps / gaps, and a TOTAL
npm run audit -- --verbose    # every finding, so you can see which fact is unclaimed
npm run verify                # tsc --noEmit && vitest run — the gate, must pass before any commit
```

---

## 5. Panels

§10: **panel artwork is reference, never asset.** Read the diagrams for proportion and control
clusters, then draw our own panel. Never extract, embed, trace pixel-for-pixel, or ship vendor
artwork — patchscore.app is public and `manuals/` is gitignored precisely so none of it is
redistributed. Wanting a device image to make a panel work means the panel design is underweight;
raise that rather than reaching for the manual.

**Coordinates are measured, not estimated.** The standard, from a run that stopped rather than break
it:

> a panel with estimated coordinates or jacks cited to pages I skimmed would be worse than no
> device — it would look exactly like the two that were done properly.

`lib/devices/moog-dfam/panel.ts` is the worked example and its header documents the method:

1. Find the one complete, unobstructed, fully-labelled panel figure in the document (for the DFAM,
   the blank patch sheet on printed p.38 — not the perspective illustration on p.2).
2. Render it high — 200 dpi, not 120 — and locate the panel's outer border in pixels.
3. Take control positions as **centroids of the drawing's own dark components**, not by eye.
4. Scale px → mm against the cited dimensions, and **check the aspect before believing either
   number** (§2.3): `panelSpanMm / panelRiseMm` must match the drawn aspect. The DFAM's measured
   box is 2.358, which picks 319.3 × 133 mm out of the specification line and rejects the 106.9 mm
   depth that a careless reading would have used.

Two things that reading catches and a skim does not: the Subsequent 37's manual has **no top-down
panel view at all** (`lib/devices/moog-subsequent-37/panel.ts` cites the Quickstart poster
instead), and manuals contradict themselves — that manual does so in six places, all recorded in
the device folder rather than smoothed over.

Mechanics worth knowing before you start placing features:

- `PanelLayout` is `{ panelRiseMm, verified, features }`; the horizontal bound comes from
  `physical.panelSpanMm`, which every device declares. `verified` is **required** here.
- Coordinates are **panel-local millimetres, origin top-left**, in normal playing orientation, and
  `x`/`y` are the **top-left of the bounding box, not the centre** — for a knob too, where `d` is
  the diameter because that is what you measure off a drawing. Every panel in the library defines a
  local `knob()`/`button()` helper that takes a centre and converts, because centres are what a
  measurement gives you.
- Seven feature kinds: `screen`, `knob`, `button`, `grid`, `voices`, `label`, `group`. At most one
  `voices` field per panel, and every feature must fall inside the span × rise box or the build
  fails: `panel feature falls outside the <span> x <rise> mm panel`.
- `PanelFeature` has no jack, so a patchbay is drawn as a `grid` and the layout carries no named
  jack positions — the answer the Cascadia, the Mother-32 and the DFAM all reached independently.
- `panel` is optional. Without one the rack falls back to a generated panel built from the jacks
  and voices the manifest declares, which is a legitimate place to stop if no usable figure exists.

---

## 6. When the box does not fit the model

**That is a finding, not a failure** (#57). Authoring the Mother-32 exposed that `ClockSpec` was
undirected, which had the guide telling readers to sync a box over a socket it does not have —
fixed in #148/#149, and worth more than the device was.

If a change to make the device fit would break an invariant, stop and raise it. The rule from
`CLAUDE.md` applies: fix the architecture instead, and update `DESIGN.md` in the same commit.

---

## Done when

- [ ] Every value comes from a document you opened, at a page you verified against three footers.
- [ ] Every value on a control with more than one printed scale has the switch or tone as a param.
- [ ] Capability citations are in `capabilityEvidence`, not comments; every `unknown` / `unread` /
      `cited-against` names a reason, and `unread` names its document.
- [ ] `content` is declared, or its absence is explained at the `content` path.
- [ ] The panel's coordinates were measured and its aspect checked; nothing vendor-drawn shipped.
- [ ] `npm run audit` `caps` line did not regress; the numbers are in the commit message.
- [ ] The node sweep is not capped, and both figures are in the commit message.
- [ ] `npm run verify` passes.
