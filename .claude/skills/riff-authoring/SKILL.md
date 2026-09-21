---
name: riff-authoring
description: Author, rewrite or review a figure under lib/riffs/ — the record-named entries at /riffs and the Explore figures named for a factory patch, with their rules-as-data, their three grid shapes, the counts that break, and the bar a figure is judged against. Use when adding a figure, fixing one, reviewing a box's Explore set, or writing a patch list or a use line.
---

# Authoring a figure

A figure is a `Riff` in `lib/riffs/`, one file, registered by hand in `lib/riffs/index.ts`.
`CLAUDE.md` has the repo-wide rules and `DESIGN.md` §5A is the specification. This file is the
part that is not written down anywhere else: what six figures and one review cost to learn.

**Two kinds, one schema.** `reference.kind: 'record'` surfaces at `/riffs/<id>`;
`reference.kind: 'patch'` surfaces only at `/devices/<box>/presets/<patch>`, because a preset
belongs to exactly one box (#598). `RECORD_RIFFS` in `lib/riffs/index.ts` is the single filter
that decides, so the catalogue, the static routes, the search and the sitemap cannot disagree.

---

## 1. The bar, and how to judge against it

The operator set it, and these are his words:

> I think explore should be something interesting to learn using the presets, vox-humana riff end
> thing and the blade runner thing are good examples.

Two exemplars, both in the library. `blade-runner-blues-lead`: a borrowed major chord inside a
minor key, entries that land late on every chord, one rule whose breach collapses the sound.
`vox-humana-four-part-voice-leading`: four voices, no voice moving more than a whole step, and
the lesson is how little has to move for a chord to change its name. That entry is a **rewrite**
of one the operator called boring, so it is the standard rather than the complaint.

Four questions, and a figure has to pass all four:

1. **Is there one thing a player could name after playing it once?** A move, not a description of
   a sound: the borrowed third, the common tone, the late entry, the withheld resolution.
2. **Is that thing distinct from every other figure on the same box?**
3. **Is there something to play?** A pad holding four notes for eight bars can pass this. A figure
   where the reader holds one note while the preset works probably does not, and the test is
   whether the *holding* is the lesson.
4. **Does the technique say why, or only what?** *"Enter on beat two"* is an instruction. *"Enter
   on beat two, so the tine comes in behind the bass"* is a lesson.

**Question 2 is the one that gets missed, and it is missed by reading well.** A review of
twenty-five figures passed all twenty-five reading each entry on its own. A second reader failed
two of them: `Hamamatsu Tines` was `'70s Electro Pno`'s lesson on the same box in the same role
and character, down to the same avoid-note rule, and `#brew time` was `Cloud Level`'s frame with
`Cloud Level`'s move removed. Neither is bad in isolation and that is exactly why it survives.
**Read the figure against its shelf, not on its own.** Distinctness is a property of a box's whole
set.

A review that fails twenty of twenty-five is describing a taste, not applying a bar.

---

## 2. The id carries the patch, and the slug is not the pretty name

`referenceSlug` (`lib/core/riff.ts`) lowercases and strips, so `BRASH B@SS` becomes
`brash-b-ss`, and `RiffSchema` **requires the id to open with it**:

```
the id must open with 'brash-b-ss', so the address carries the patch too (§5A.5)
```

The readable filename is the wrong filename. Get the slug first:

```bash
./node_modules/.bin/tsx -e "import { referenceSlug } from './lib/core'; console.log(referenceSlug('BRASH B@SS'))"
```

---

## 3. A rule is data, and it may not forbid a chord tone

`constraints.forbiddenDegrees` is checked by the schema against the progression (#605), and the
check refuses a rule naming a pitch the chord it applies to is built on. Two rules written in one
sitting hit this:

- *"never the root of this chord"* on `5TH IN LINE`, whose whole lesson is withholding roots;
- *"never the third"* over a minor tonic on `UBER_SUB`.

Both were refused, and the refusal is right. **A figure may decline to play a chord tone; a rule
may not call one wrong.** Declining is a decision and belongs in the technique, where decisions
live. What is data is the pitch that would break the figure wherever it appears: the raised
seventh over the chord that would otherwise cadence, the natural third against a borrowed major,
the second ringing against a root two bars old.

Two reaches, and they are not the same claim:

- **unaltered** — the rule applies over the one chord it names and nowhere else. `blade-runner`
  forbids the natural third over its borrowed `I` while its `i` is built on that third.
- **`alter` present** — the rule reaches every chord (#605), because a pitch the key does not own
  is forbidden everywhere or nowhere.

`onsetOffset` is the other constraint: how long after a chord arrives its first note may enter. It
applies to an entry, never to a continuation.

---

## 4. Three shapes, and the role picks which

`pad` is the whole of `NON_PATTERN_BEARING_ROLES`. Everything else is struck.

| shape | `reArticulatesHook` | `pattern` | when |
|---|---|---|---|
| held | absent | absent | a `pad`, or any role with `arpeggiatedHold` |
| struck, repeating | `true` | required | the common case: the grid says where the hook is struck again |
| struck, through-composed | `false` | absent | #623: no step of a repeating pass recurs, so the hook is the whole rhythm |

Each shape refuses the others', so an entry cannot half-change role or carry a grid it has
disowned. `false` is legal here and nowhere else in the product. Three entries use it:
`muse-runner-floating-arrival-lead` (a silent chord in the last of four loops), and
`synth-gong-decay-spaced-strikes` and `mirror-interior-two-hand-split`.

**`arpeggiatedHold` is held on any role** (#645). The hand holds four keys, the box's arpeggiator
sounds one at a time, so `request.polyphony` is **1** while the hook's peak is four. The two
numbers are different questions and the tests count them separately.

---

## 5. What the box has to spend

- `request.polyphony` is what must sound at once. On a two-note box the figure is a line, and the
  harmony is context it sits over.
- A device recipe carrying `patchPolyphony: 1` (#632) is the box refusing a second note. The
  Subsequent 37 has seventeen such recipes, and the ones that omit it are the `stab`, `pad` and
  one `lead` where DUO MODE plus KB CTRL spends the second note. Landing a two-note figure on a
  mono recipe is a figure that cannot be played, and `test/moog-subsequent-37.test.ts` reads the
  resolved settings rather than the role to say so.
- **Keyboard reach** (#659): a box that declares `keyboardReach` has its **preset** figures
  checked by `presetSession`, which throws for one the keyboard cannot hold. Span first, placement
  second: a figure wider than the board fits nowhere, and one inside the span still has to sit
  where some octave or transpose setting reaches. Riffs resolved onto a reader's rig and guide
  recipes are **not** checked, because a keyboard binds hands and not MIDI.

**Count who authors the `(role, character)` pair before you choose it.** `pad / hard` and
`pad / dirty` are each authored by exactly one device in the library, so a figure asking for
either resolves on that box and nowhere else. A preset figure has somewhere to land by
definition, which is what makes this easy to miss; `test/riff-session.test.ts` catches it, by
resolving every entry against a four-box rig and comparing with `assign`.

```bash
./node_modules/.bin/tsx -e "
import { DEVICES } from './lib/devices/registry.generated'
const who = (role, ch) => DEVICES.filter((d) => (d.recipes ?? []).some((r) => r.role === role && r.character === ch))
console.log(who('pad', 'hard').length, who('pad', 'soft').length)"
```

One is a warning, not a refusal: the pair may be exactly right and the figure may be worth it.
But pick it deliberately, because the alternative is a reader whose rig can never play the page.

---

## 5a. The device manifest can decide the figure's shape

A folder under `lib/devices/` holds facts that settle questions the author would otherwise answer
by taste, and two of them changed a figure the day this section was written.

- **A printed mode.** `korg-minilogue-xd`'s `FACTORY_PROGRAMS` carries each program's mode off
  the manual: `CHORD`, `UNISON`, `POLY`, `ARP`. `Cluster 5th` is `ARP`, so a figure for it is an
  **arpeggiated hold** and not a struck chord — the hand holds, the box sounds one note at a time,
  and `request.polyphony` is 1 while the hook's peak is the width of the voicing. Writing it as a
  stab would have been writing against the only documented fact anybody here has about the patch.
  `test/korg-minilogue-xd.test.ts` holds every figure to its printed mode, including that a
  `CHORD` or `UNISON` program never gets a figure with two notes at once.
- **The roles a box's voice actually takes.** The same box authors no `arp` voice: its one voice
  serves `pad`, `stab`, `lead`, `bass-mid`, `sub` and `texture`. An `arp` request therefore does
  not resolve on the box that ships the patch, and `presetSession` throws. Both existing
  arpeggiated holds there sit on `pad` for that reason.

**Read the manifest before choosing the role, the character and the shape**, not after the schema
refuses one. Neither of these is in `DESIGN.md`; both are in the folder.

---

## 6. Read the pitches, never work them out

`baseOctave` plus `degree` plus `octave` is arithmetic, and it is wrong often enough that two
separate readers mis-stated a figure in one week. Both were caught the same way:

```bash
./node_modules/.bin/tsx -e "
import { RIFFS } from './lib/riffs'
import { resolveHook } from './lib/core'
const r = RIFFS.find(x => x.id === '<id>')!
const h = resolveHook(r.hook, r.key)
if (h.outcome !== 'resolved') throw new Error('unresolved')
const byStep = new Map<number, string[]>()
for (const n of h.hook.notes) byStep.set(n.step, [...(byStep.get(n.step) ?? []), n.note + '(' + n.midi + ')'])
for (const [s, ns] of [...byStep].sort((a, b) => a[0] - b[0])) console.log(s, ns.join(' + '))
"
```

`replicant-xd-inner-voice-pad` claimed one note held at the bottom for six bars while the notes
put a different pitch under it from bar three, and called a rise a drop. `hypno-acid-sixteenth-loop`
claimed two notes changed between its bars and three did. **No test catches either**: both files
parsed, resolved and rendered. Prose and notes can disagree indefinitely, so the only defence is
running the resolver and reading what comes back before writing the paragraph about it.

**And print the interval, not only the note.** A figure whose subject is a *distance* — stacked
fifths, a semitone cluster, parallel sixths, an octave — is not checked by reading note names,
because the names look right while the arithmetic is wrong. `cluster-5th-parallel-fifths-stack`
was authored as four stacks of two perfect fifths; two of the four came back `7,-5`, with the top
note below the middle one, and the note names `F4 C5 G4` read perfectly well. Add the subtraction
to the loop:

```bash
  const m = ns.map((x) => x.midi)
  console.log(s, ns.map((x) => x.note).join(' '), 'intervals', m.slice(1).map((v, i) => v - m[i]).join(','))
```

---

## 7. The counts, which are the thing that breaks

A new or removed figure moves assertions in five files, and there is no way to derive the list:

| file | what it counts |
|---|---|
| `test/riff.test.ts` | the total, the record/patch split, the role histogram, the pad list and the `#605` sweep length — **three tests, several assertions each** |
| `test/preset-figure-page.test.ts` | prerendered params, all boxes |
| `test/preset-section.test.ts` | patch-named riffs linked from a section |
| `test/riff-page.test.ts` | patch-named ids that 404 at `/riffs` |
| `test/site-metadata.test.ts` | figures in the sitemap |

A figure on a box with an Explore section also moves its device test
(`test/moog-subsequent-37.test.ts`, `test/korg-minilogue-xd.test.ts`, `test/moog-muse.test.ts`):
the use list, the count of entries, the per-role list, and the grid-shape sweep.

Then regenerate **three** golden sets, not one:

```bash
npm run gen:riffs && npm run gen:golden && npm run gen:guides
git status --short        # a figure with no golden file moves nothing, and that is normal
```

---

## 8. Prose

The technique array is what the reader plays from, and the suite enforces the repo's copy rules on
it. Beyond those:

- **Say why.** The difference between an instruction and a lesson is one clause.
- **Never describe the preset.** Nobody authoring these has heard the patches. The name gives the
  register and the part; the figure is written for those. *"A gong has a long tail"* is a guess
  about a sound; *"strike, wait for it to go, strike again"* is a figure.
- **Do not claim what the notes do not do.** See §6.
- **No process talk**: no issue numbers, no backlog, nothing about the build, in rendered copy.

---

## 9. Explore: the patch list and the use line

Three fields on the device, joined by `presetSession`:

- **`factoryPatches`** — names as the box prints them, off a manual page or a reading at the unit
  (#617). `slot` is where it sat and is never identity; `bank` is half the key. The list is as wide
  as its reading and no wider.
- **`patchUses`** — what a patch is *for*, one line, in the order a reader should meet them. The
  order is editorial and nothing downstream sorts it.
- **the figure**, where one exists. A patch may carry a use and no figure, which is the shape #617
  built and #624 argued for.

**A use written from a name alone is a claim about a patch nobody has heard.** Four Subsequent 37
presets were deliberately left with no use at all rather than given a guess, until each got a
figure. Prefer a bare name to an invented sentence.

The subset rule — a box may describe some of what it declares — is exercised by the minilogue xd,
twelve uses against two hundred names. The Subsequent 37 no longer exercises it, because its
twenty are all described.

---

## Done when

- The figure passes the four questions **against its shelf**.
- Its pitches were read from `resolveHook`, and the technique says what they do.
- Its shape is one of the three, and the role agrees.
- The counts move together, the three generators have run, and `npm run verify` is green.
- The PR says what changed, what to look at, and what was verified — and says plainly that the
  figure has not been played, because nobody here has an instrument.
