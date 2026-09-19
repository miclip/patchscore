---
name: inspiration-authoring
description: Author or revise an inspiration under lib/inspirations/ — the technique influences that patch a template, their (role, band) claims, the conflicts those create, the composition table that has to be re-derived by hand, and the two invariant-3 word checks that want opposite answers. Use when adding an influence, changing what one claims, or working out why one refuses to combine.
---

# Authoring an inspiration

An inspiration is an `Inspiration` in `lib/inspirations/`, one file, registered by hand in
`lib/inspirations/index.ts`. `DESIGN.md` §5 is the specification and `lib/core/inspiration.ts`'s
header argues the design at length — read that first, because it settles *why* replacement works
the way it does and this file does not repeat it.

This is the part that is not written down anywhere else: what the seventh influence cost to add.

---

## 1. Claim the slot your influence needs, including the contested one

Replacement is keyed on `(role, band)`, and an inspiration that claims a slot **takes** it: the
template's variants there are removed. Purely additive would be a lottery, because which variant
you heard would depend on which id sorted first.

The temptation when adding an influence is to dodge a slot another influence already claims, so
the composition table stays clean. **Do not.** `half-time` needs the kick — a half-time backbeat
over a four-to-the-floor kick is not half time — and `reggae` and `dancehall` both claim it. The
right outcome is a third member of a mutually exclusive set, not a weaker influence that composes
with everything and is reliably audible nowhere.

What *is* worth leaving alone is a slot your influence does not need. Two tests:

- **Does taking it make the influence more audible or less?** `half-time` leaves `closed-hat`
  because hats at the original rate over a halved kit are the sound; halving them too just makes
  a slow track.
- **Would taking it force a decision that belongs to the player?** `half-time` leaves everything
  pitched alone. A bass that halves with the drums is an arrangement choice; taking `sub` would
  impose it on all fourteen directions and make the influence a genre.

See the free slots before choosing:

```bash
./node_modules/.bin/tsx -e "
import { INSPIRATIONS } from './lib/inspirations/index'
for (const i of INSPIRATIONS) {
  const claims = (i.patch.replacePatterns ?? []).map((p) => p.forRole + '@' + p.band).join(' ')
  console.log(i.id.padEnd(11), claims)
}"
```

---

## 2. The composition table is re-derived by hand, and it is the point of the exercise

`test/inspirations.test.ts` pins two lists: the pairs that compose and the pairs that refuse.
Nothing computes them for you, and that is deliberate — adding an influence **has to be looked at
rather than merely absorbed**.

`half-time` took refusing pairs from four to six and composing pairs from eleven to fourteen. Both
lists are written out in full, in id order, with the reasoning beside them. Update both, and say
in the comment *why* the new refusals are right rather than only that they exist.

The registry docstring in `lib/inspirations/index.ts` carries the same argument in prose, one
paragraph per influence, explaining what shape it exists for. Add yours there too. It is the only
place a reader can see why the library holds seven rather than six of the same thing.

---

## 3. Two word checks, and they want opposite answers

Invariant 3 one layer up: an inspiration must not name a template, and must not name a device.
Two checks enforce it and they are not the same check.

**Template words → reword.** Every token from every template's id, name, keys, section names,
role ids, pattern ids and hook ids is forbidden in your identifiers *and your notes*. Ordinary
English collides: `second` is a template word because Breakbeat has a `Second Drop`, `back`
because Hip Hop has a `Pulled Back`. There is a `NON_IDENTIFYING_ENGLISH` exemption set holding
exactly one word, `and`, which is there because Drum and Bass's name contains it and a
conjunction identifies nothing.

**Reword rather than add to that set.** An exemption is permanent and a sentence is not, and the
list is worth reading only while everything on it was unavoidable.

The substring check is blunter still — it tests every template id, name, section and pattern id
against your whole file as a substring, case-insensitively. `returns` contains `Turn`. Expect to
reword twice. Check before you run the suite:

```bash
./node_modules/.bin/tsx -e "
import { TEMPLATES } from './lib/templates/index'
import { yourInspiration } from './lib/inspirations/your-file'
const needles = TEMPLATES.flatMap((t) => [t.id, t.name, ...t.keys,
  ...t.structure.map((s) => s.name), ...t.roles.map((r) => r.id),
  ...t.patterns.map((p) => p.id), ...t.hooks.map((h) => h.id)])
const hay = JSON.stringify(yourInspiration).toLowerCase()
console.log([...new Set(needles.filter((n) => hay.includes(n.toLowerCase())))])"
```

**Device words → exempt, if the word is genuinely generic.** Identifiers get a full token check
against every device id, name, maker, kind, voice label, recipe id and parameter name. `time`
reaches that set from `DELAY TIME`, `DECAY TIME` and a dozen other knobs. A `MUSICAL_TERMS` set
exists for this case and holds `shuffle` and `time`: musical words a box happens to silkscreen,
which the influence is not reaching for. Prose is checked differently — by substring, and only
against device *names* — because the device vocabulary contains `in` and `of`, and token-checking
prose against it would forbid English.

The asymmetry is what makes the exemption safe: a device's *name* stays forbidden everywhere, so
nothing can borrow a box's identity through an id.

---

## 4. What the schema will refuse

- **Ids not prefixed with your inspiration's id.** `half-time-kick-b0`, never `kick-b0`. One rule
  gives two properties: you cannot collide with a template's ids without claiming to be that
  template, and a reader of a rendered guide can see which part came from where.
- **`sections` on any pattern, and a `transient` added role.** Both name sections, sections are
  authored per template, and there is no template-agnostic way to say "the Drop". Added roles are
  `continuous` only.
- **Fewer than four bands for any role you touch.** If you claim a role, author 0, 1, 2 and 3.

---

## 5. A tempo shift is a claim, and so is refusing one

`reggae` shifts −40 and `dancehall` −30, because a one-drop at 134 is not a one-drop. `half-time`
shifts nothing, and that refusal *is* its idea: half time at the original tempo is half time, and
shifted it is a slower track that a tempo knob could have produced.

Shifts compose, so two influences can both pull down; `MIN_EFFECTIVE_BPM` is 20 and a clamp is
reported rather than silent. Write a shift as a shift, never a target — a target would have to
know which genre it landed on.

---

## 6. Check it against a template that has none of your roles

A replacement aimed at a `(role, band)` a template does not author is reported, never dropped. Run
your influence against a direction with no drums and read the diagnostics; if they are empty when
they should not be, your claim is not landing where you think:

```bash
./node_modules/.bin/tsx -e "
import { applyInspirations } from './lib/core/inspiration'
import { TEMPLATES } from './lib/templates/index'
import { yourInspiration } from './lib/inspirations/your-file'
for (const id of ['hard-techno', 'drone-study']) {
  const r = applyInspirations(TEMPLATES.find((t) => t.id === id)!, [yourInspiration])
  console.log(id, r.outcome, JSON.stringify(r.diagnostics?.map((d) => d.detail) ?? []))
}"
```

`drone-study` authors one `texture` and nothing else, so it is the honest worst case: every slot
you claim should come back as a named `no-such-target`, in the maker's own words.

---

## Done when

- The influence claims what it needs, including a contested slot, and leaves alone what it does
  not — with both decisions argued in the file.
- Both pinned lists in `test/inspirations.test.ts` are updated, and the new refusals have a reason
  written beside them.
- `lib/inspirations/index.ts` carries a paragraph saying what shape this one exists for.
- All four bands for every role touched; ids prefixed; no sections anywhere.
- The word checks pass by rewording where the word was a template's and by exemption only where it
  was genuinely generic.
- `npm run verify` green.
