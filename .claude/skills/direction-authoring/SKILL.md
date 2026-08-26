---
name: direction-authoring
description: Author or revise a musical direction (a template) under lib/templates/ — role requests, structure, harmony, hooks, band variants, and checking the fit against real rigs. Use when adding a direction, changing an existing one's requests or sections, or deciding whether a role is optional or inessential.
---

# Authoring a direction

A direction is a `Template` in `lib/templates/`. `CLAUDE.md` has the repo-wide rules and `DESIGN.md`
§4 is the specification — §4.1 harmony and hooks, §4.2 section scoping and occupancy, §4.3
template-owned step patterns, §4.4 priority. This file is the tacit part (#147), and it starts with
a trap because the trap is live.

---

## 0. Read this first: a hook silences its own band variants

**A role with a resolved hook does not play its step variants.** #100 made the hook the sole
authority wherever one resolves, and that was right — two phases were describing incompatible music
for one part with nothing saying which to play. But `chooseHook(hooks, role, key, seed)`
(`lib/core/harmony.ts:327`) **takes no band**, and `Hook` has no `band` field. So for that role:

- every band variant you author becomes unreachable in the rendered guide;
- the density knob changes nothing a listener would hear;
- the section energy arc renders and does not play.

Precisely what happens, because the halves matter:

| where | what |
|---|---|
| `lib/core/pipeline.ts:895`, stamped at `:929` | a **resolved** hook puts `hookAuthority` on the assignment |
| `lib/core/render.ts:1722` and `components/guide/phase-steps.tsx:152` | phase 5 prints `**The hook is the pattern**` **instead of** the grid, the band line and the device articulation |
| `lib/core/arrangement.ts:62` and `:75` | the band *number* still drives phase 7's arrangement grouping and trajectory — selection deliberately still runs |
| `lib/core/arrangement.ts:203` | #105's chaining unit becomes the hook's bars, not the variant's |

So the variant's **hits are dead and its band is not**. An unresolved hook takes no authority — the
map at `lib/core/pipeline.ts:895` keeps only `outcome === 'resolved'`, and
`test/hook-authority.test.ts:95` pins it — so this only bites where the hook actually resolves.

**Writing a hook and a band arc for one role today is writing one of them for nothing, and nothing
tells you.** Drone Study is the proof: a template built around *"one strike in four bars at band 0,
seven at band 3"* and a `0 1 2 3 2 1 0` arc called *"the only symmetric band vector in the
registry"* — all of it inert, because the same part also has a hook. It is a one-part template, so
that is the whole guide.

**And you must author the dead variants anyway.** `test/templates.test.ts:203` (*"authors all four
bands for every role that has any pattern at all"*) and `:288` (*"gets busier as the band rises, and
never by editing hits"*) apply to every patterned role, hooked or not. There is no exemption for
hook-authority roles.

So, until #143 is fixed, decide per role:

- **hook, no variants** — legitimate. `lib/templates/ambient-dub.ts` declines to pattern `pad`,
  `texture` and `sweep`, and invariant 5 does the rest: nothing authored, nothing invented. Say in
  the file that you meant it.
- **variants, no hook** — the density knob works. This is what every percussion role does.
- **both** — you are writing one of them for nothing. If you do it anyway, say in the file which
  half is currently inert and why, so the next reader does not spend an afternoon on it.

When #143 lands, this section becomes the rule that replaces it rather than a warning.

---

## 1. The layering, which is invariant 3

A template names **no device, no manifest field, no content library.** `Role`, `Character`,
`MoodAxis` and `PatternSlot` are the entire shared vocabulary; a fifth is an architecture change,
not a convenience. This is enforced, not merely asked, by three tests in `test/templates.test.ts`:
`:159` *"uses no word that comes from a device folder"*, `:171` *"contains no device id or folder
name as a substring"*, and `:185` *"imports nothing from lib/devices"*.

**Directions are the user's intent. They are never generated or filtered from what a rig can do.**
Operator direction, recorded on #81 so it is not re-litigated: *"someone who wants techno gets
techno."* What the library needs is *more* songs, and songs aligned to what a rig can actually do —
not techno narrowed to fit a groovebox.

---

## 2. Three fields that look alike and are not (§4.4, #128)

All three sit on a `RoleRequest` (`lib/core/template.ts:45`), and confusing them is the mistake
PR #128 was written to end.

**`priority: int ≥ 1`, ascending, 1 is most important. It is a cost, not a musical claim.**

> p4 on a riser and p4 on a second tom are the same cost and opposite statements.

**`optional: true` is an instruction to the search**, not a statement about the music — it removes
the request from the miss objective. It **requires** an `inessential` alongside it
(`lib/core/template.ts:129`): `an optional request is one the direction can do without: say so,
with a reason (§4.4)`.

**`inessential: { reason }` is the direction saying it is still itself without this part**, in a
producer's words. It is **reporting only** — no `Score` key, no candidate filtering, nothing about
an assignment moves. That restraint is what makes it safe; a template that could quietly change
assignments by declaring a role inessential would be dangerous.

The `reason` is **mandatory** — `lib/core/template.ts:97`, `a request the direction can do without
needs a reason saying why (§4.4)` — because the guide prints it verbatim under `### Not needed for
this direction`. A bare flag is an author shrugging in a field that reads like a judgement.

**A direction declaring nothing inessential claims it needs every role**, which for most genres is
false — and is exactly what makes a capable rig look full of holes. An MC-101 handed eight parts of
a finished techno track was reported as having four gaps: one an unauthored recipe, three of them
garnish the direction never wanted (#81). Follow the convention the library already has:
`lib/templates/ambient-dub.ts`, `industrial-techno.ts` and `major-key-electro.ts` adopted it in
PR #128; `weave.ts` declares six and `lydian-house.ts` four.

The three headings a reader sees are the payoff, and they are three different actions
(`lib/core/render.ts:539`, `:557`, `:570`): `### Gaps` (the box cannot), `### Waiting on us` (our
backlog), `### Not needed for this direction` (your `inessential.reason`).

---

## 3. Structure, harmony, hooks

**Fields.** `structure: Section[]` where `Section = { name, bars, energy }` (energy 0..1);
`harmony: { cycleBars, progression: { degree, bars }[] }`; `hooks: Hook[]` where
`Hook = { id, forRole, bars, baseOctave, notes }`; `patterns: Pattern[]` where
`Pattern = { id, forRole, band, sections?, length, hits }` and `length` is 16, 32 or 64 steps at
`STEPS_PER_BAR = 16`.

**The band vector is derived, never authored.** There is no field holding it. `Section.energy`
chooses the band (`energyBand = min(3, floor(energy * 4))`, `lib/core/resolver.ts:250`) and the
density knob leans it by ±1 (`densityShift`, `:259`) around the three detents 12 / 50 / 87
(`DENSITY_DETENTS`, `:272`); `patternBand` at `:280` clamps the sum and `bandFor` at `:292` is what
callers use. Drone Study's palindrome comes out of energies
`0.05 / 0.28 / 0.55 / 0.78 / 0.6 / 0.33 / 0.1`. Write the resulting vector into the file's doc
comment the way the existing templates do — it is the only place a reader can see it.

**Section lengths need not divide the pattern or the harmonic cycle, and deliberate non-division is
a real technique.** Drone Study's out-of-phase boundaries are *"what stops 132 bars of one note
reading as a loop"*, and #105 did not touch the lengths. But the other half of that decision is
binding: **if they do not divide, the guide must say how to build the remainder, and the template
must document the intent** — otherwise it reads as an arithmetic bug, which is how #105 was filed.

`chainPlan` (`lib/core/arrangement.ts:200`) derives it once per section for both renderers, and the
guide prints the rule conditionally — `lib/templates/industrial-techno.ts` divides everywhere and
prints none of it:

> chain full copies and cut the final one short: 9 bars of a 4-bar pattern is 4 + 4 + 1

A section shorter than one copy is **one copy stopped early, never "0 copies"** — that is a repeat
count no box can be given.

**Hooks are chord tones of the progression** (§4.1). Where a role has more than one, they should be
**different pieces rather than variations**: Drone Study's two are a pedal that states the root and
an upper line that never does. `HookNote.len` is sustain in sixteenth steps from its own `step` —
not distance to the next note, and not a gate percentage.

---

## 4. Fit, which is the point of the exercise

**Check what a single box achieves, not just a full rack.** #81 was filed because a complete
eight-part techno track on an MC-101 was reported as four holes. `lib/templates/relay.ts` answers
the single *monophonic* box by making every part take turns (two `transient` requests with disjoint
section sets share one voice under §4.2's `(assignable, section)` occupancy); `weave.ts` and
`lydian-house.ts` answer the single *pool* box. Position a new direction against those rather than
rediscovering them.

Render it and read it — that is what #145 built the CLI for:

```bash
npm run guide -- --devices roland-mc-101 --template <your-direction>
npm run guide -- --devices polyend-tracker-mini,roland-tr-1000 --template ambient-dub --seed 7
npm run guide -- --devices synthstrom-deluge --template drone-study --mood density=87
```

stdout is the guide and nothing else, so it diffs and greps; the seed and rig go to stderr. Device
order does not matter and the default seed matches the browser's. The fit numbers you want are in
phase 2 — the three shortfall headings above.

**Report the number in the commit** — *"MC-101 alone: 8/8"*. A direction nobody can finish on the
gear they own is the failure mode this library already had five times over.

---

## 5. Mechanics

**Wiring.** `lib/templates/index.ts` is hand-written, not generated. Add the import and the entry in
id order; that is the only wiring a new direction needs.

**Models to copy:**

| file | why |
|---|---|
| `lib/templates/industrial-techno.ts` | the reference for every template after it — 12 requests, 6 sections, full rack |
| `lib/templates/drone-study.ts` | one voice, hooks with authority, sections that divide by nothing |
| `lib/templates/ambient-dub.ts` | proves the engine is not shaped like four-to-the-floor, and shows how to decline to author variants |
| `lib/templates/relay.ts` / `weave.ts` / `lydian-house.ts` | the three small-rig shapes |

**What the schema rejects**, in messages you will actually hit (`TemplateSchema`,
`lib/core/template.ts:344`; `z.strictObject` throughout, so an unknown key is an error):

- `a transient request must list the sections it occupies (§4.2)`
- `a continuous request occupies every section and must not list any (§4.2)`
- `section names must be unique - Occupancy keys on them (§4.2)`
- `request ids must be unique - Occupancy stores them (§4.2)`
- `request names section '<x>', which is not in structure`
- `step <n> is outside a <len>-step pattern`

**What the suite rejects on top of that** — these are the ones that actually fail `npm test`, and
none of them are in the schema:

- all four bands for every patterned role, no fallback at any of `[0,24,25,49,50,74,75,100]`
- each band strictly busier than the last: `'<role>' band <i> is not busier than band <i-1>`
- hits in step order, no step hit twice, at most one `accent` per variant
- `ghost` velocity `≤ 64` and defined; `accent` velocity `≥ 100` and defined
- the invariant-3 device-word and device-import scans (§1 above)

**Determinism is binding** (invariant 6), so golden fixtures move:

```bash
npm run gen:guides      # the markdown guides — this is the one a template change moves
npm run gen:golden      # resolve.golden.json; a synthetic scenario, so usually NOT needed here
npm run verify          # the gate
```

Changing `lib/templates/industrial-techno.ts` moves `full-rig`, `tr-1000` and `midi-clock`;
changing `drone-study.ts` moves `deluge-drone-study`. **Adding** a direction moves no golden, but
does move the hardcoded id lists in `test/template-directions.test.ts`,
`test/small-rig-directions.test.ts`, `test/simultaneous-directions.test.ts` and
`test/site-metadata.test.ts`. If you add one and nothing goes red, one of those lists was missed.

Every direction authored also adds a column to `test/search-symmetry.test.ts`'s cap sweep, which is
the same signal the node cap gives — see the device-authoring skill if it starts running long.

---

## Not in scope for a direction

**Hints are a device concern.** `Device.hints` is keyed from recipes and articulation; nothing in
`lib/templates/` authors one, and §8.1's "under ~8 words" rule is a device-authoring rule. If a
direction seems to need a hint, what it actually needs is prose in the template's doc comment or a
recipe on the device.

---

## Done when

- [ ] No role has both a resolved hook and band variants you expect a listener to hear — or the file
      says which half is inert and why.
- [ ] Every patterned role has four bands, strictly busier each step.
- [ ] The direction declares what it is still itself without, each with a reason a producer would say.
- [ ] Section lengths that do not divide are deliberate and the file says so.
- [ ] Rendered against at least one **single box** with `npm run guide`, and the fit is in the commit.
- [ ] Goldens regenerated with `npm run gen:guides`; `npm run verify` passes.
