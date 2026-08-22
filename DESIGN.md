# Patchscore — Design

A deterministic (no LLM) web app that turns *the gear you own* + *a musical direction*
into a phased, at-the-machine production guide with real parameter values.

Next.js App Router on Vercel. No backend, no database in v1.

---

## 0. Premises

The user picks the hardware they own, picks a genre, nudges a few mood controls, and gets
back a build guide: song structure, voice assignments across their actual devices, step
patterns, sound design with concrete parameter values, and rig integration notes.

Everything is authored data plus a resolver. Variety comes from combinatorics and seeded
selection, not from a model.

**The engine is small. The content library is the product.** The engine is a few days of
work; a well-covered device is a day of reading a 200-page PDF and typing verified numbers.
Build the engine so that adding content requires touching exactly one folder.

### Invariants

These are load-bearing. If one stops being true, stop and fix the architecture.

1. No LLM calls anywhere. Deterministic by design.
2. Adding a device = adding one folder under `lib/devices/`, plus **regenerating** the registry.
   No *authored* edit outside that folder: no engine, UI, or switch-statement edits, and
   `registry.generated.ts` (§9) is machine-written and never hand-edited.
3. Templates never reference device IDs. Devices never reference genres. The shared vocabulary is
   a closed set of controlled unions — `Role`, `Character`, `MoodAxis`, `PatternSlot` — and
   nothing else. Neither side ever names the other.
4. Every rendered parameter value carries explicit provenance: `authored` (manual-verified point),
   `derived` (a verified point moved inside a manual-verified range, §3.2), or `provisional`
   (the point is unverified, whether or not mood moved it). Nothing is presented as
   manual-verified unless it is, and the type system makes provenance non-optional (§3.1).
5. Gaps are shown honestly. Never invent an assignment to fill a hole.
6. Same inputs + same seed + same resolver version → byte-identical guide **on any platform**.
   `Math.random()` appears nowhere in the resolver, and neither does any locale-dependent
   comparison or formatting (§7.2).
7. Hints are jogs, not documentation. If a hint needs a paragraph, it should be a manual reference.

Invariants 2, 3, 4 and 6 are the **repaired** forms. Each one contradicted the body of this
document as first written; `DESIGN-REVIEW.md` records the conflicts and why each repair is a
scoping fix rather than a weakening. An invariant that is quietly false is worse than a narrow
one, because the rule above says to stop and fix the architecture when one stops being true.

### Non-goals for v1

User-authored devices, community recipe sharing, SysEx / project-file generation,
multiple arrangement variations per guide, accounts.

---

## 1. Layer 0 — Roles

A closed, controlled vocabulary, and the primary contract between templates and devices.
Templates request roles; devices declare which roles their voices can serve.
Neither side ever names the other. (`Role` is not the *only* shared vocabulary — `Character`
§3.4, `MoodAxis` §6 and `PatternSlot` §4.3 cross the same boundary. See invariant 3.)

```ts
type Role =
  // low
  | 'kick' | 'sub' | 'bass-mid'
  // backbeat
  | 'snare' | 'clap' | 'rim' | 'ghost-perc'
  // metal
  | 'closed-hat' | 'open-hat' | 'ride' | 'metallic'
  // body
  | 'tom' | 'noise' | 'texture'
  // tonal
  | 'pad' | 'lead' | 'stab' | 'arp' | 'acid' | 'vox-chop'
  // transitional — see §4.2, these are section-scoped, not permanent parts
  | 'riser' | 'impact' | 'sweep'
```

Keep it closed and small. Every addition multiplies the recipe surface
(roles x characters x devices).

**Resolved (§12.1): two roles, kept separate.** Not one role plus a register modifier. They take
different recipes on the same voice — a sub is a filtered sine with the harmonic content
deliberately removed, a bass-mid carries the harmonic and is the part that actually answers the
`bright`/`dark` axis — so collapsing them makes one of the two sounds unauthorable. A register
modifier would also become a fourth recipe-lookup dimension, which is the combinatorial growth
this closed union exists to bound. Templates request them independently. Many small rigs will
fill one and leave the other as an honest gap; that is the correct outcome.

---

## 2. Layer 1 — Devices

One self-contained module per device. Devices know their own capabilities and their own
recipes. They know nothing about genres, templates, or other devices.

### 2.1 Two authored shapes

Some devices have fixed, named voices (TR-1000: BD, SD, LT...). Others have fungible
capacity (Tracker Mini: 16 tracks in two pools — 1-8 sample, synth or MIDI, 9-16 synth or MIDI
only; Deluge: as many synth and kit tracks as CPU allows). Modelling only the first shape does not
survive contact with the second. A device may declare *several* pools of differing capability;
that needed no change here, because a pool is a voice like any other.

**`count` bounds what the resolver may consider, not what the hardware has.** The two are
different numbers and must not be conflated. The resolver can never occupy more assignables than
the template has role requests, and templates ask for roughly five to fifteen. `expand()`
materialises `count` assignables and the §7.1 search ranges over all of them, so a device with no
hard track limit takes a *finite* number with headroom above any template's demand: above that
headroom the extra members are unreachable, and no guide exists that a larger count could produce
and a smaller one could not. Whether the box is *happy* at a given load is a separate question and
belongs to `comfortableVoices` (§12.4) — the crowding key, not the capacity one.

```ts
type VoiceSpec =
  | { kind: 'fixed'; id: string; label: string; roles: Role[]; polyphony: number }
  | { kind: 'pool';  id: string; label: string; count: number;
      roles: Role[]; polyphony: number }
```

### 2.2 One resolved shape

The registry flattens both before the resolver ever runs. The resolver knows only this:

```ts
type Assignable = {
  deviceId: DeviceId
  voiceId:  string      // 'bd'   |  'track-3'
  poolId?:  string      // undefined | 'track'
  label:    string      // 'BD'   |  'Track 3'
  ordinal?: number      // 1..count, for pool members
  roles:    Role[]
  polyphony: number
}

function expand(device: Device): Assignable[]
```

**`polyphony` means notes, never roles (§12.4).** It is how many simultaneous *notes* one
assignable can sound while serving *one* role — 3 for a triad pad, 1 for a monophonic bass. It
never means "this voice can carry two roles at once". Multitimbrality is already modelled without
it: a device that hosts several independent parts declares a `pool` with `count > 1` and each
member is its own assignable. Overloading polyphony to mean this too would give a Deluge synth
track and a Deluge track pool two encodings of the same fact.

**Load-bearing detail:** recipe lookup keys on `poolId ?? voiceId`. You author one Tracker
Mini recipe for `track` and it applies to whichever ordinal wins. Without this, pools just
move the 8x duplication from the voice list to the recipe list.

### 2.3 Device manifest

```ts
export const device: Device = {
  id: 'roland-tr-1000',
  name: 'Roland TR-1000',
  maker: 'Roland',
  kind: 'drum-machine',   // | 'groovebox' | 'sampler' | 'synth' | 'semi-modular'
                          // | 'mixer-recorder' | 'fx-processor'

  clock: { canMaster: true, canSlave: true, transport: ['midi-din', 'usb'] },

  io: { main: 'stereo', individualOuts: 8, audioIn: false, usbAudio: true },

  voices: [
    { kind: 'fixed', id: 'bd', label: 'BD', roles: ['kick'], polyphony: 1 },
    { kind: 'fixed', id: 'sd', label: 'SD', roles: ['snare', 'clap'], polyphony: 1 },
    { kind: 'fixed', id: 'lt', label: 'LT', roles: ['sub', 'bass-mid', 'tom'], polyphony: 1 },
    { kind: 'fixed', id: 'ch', label: 'CH', roles: ['closed-hat'], polyphony: 1 },
  ],

  // How many *occupied assignables* this device is comfortable carrying before it feels
  // over-subscribed (§12.4). An assignable counts once if it is occupied in at least one
  // section — regardless of how many notes its role plays, or how many sections it spans.
  // Defaults to the assignable count. Cascadia declares 1.
  comfortableVoices: 8,

  features: {
    perStep: ['velocity', 'probability', 'substep', 'cycle', 'start-timing'],
    sidechain: { internal: true, fromExternalAudio: false },
    lfo: { count: 1, syncable: true, destinations: ['filter', 'pitch', 'amp'] },
  },

  hints: {
    'apply-cycle':     'Hold STEP, MENU, C5 knob',
    'set-probability': 'Hold STEP, MENU, C3 knob',
    'set-substep':     'Hold STEP, SUB',
    'open-inst':       'Select instrument, press INST',
    'open-comp':       'INST, PAGE > twice',
    'fine-adjust':     'Hold SHIFT while turning',
  },

  manual: { title: 'TR-1000 Owner\'s Manual', edition: 'eng02' },

  recipes: [ /* §3 */ ],
}
```

`hints` is a flat lookup keyed by action, authored once per device and referenced by
recipes. A few words to jog you, nothing more. Every string under ~8 words.

### 2.4 Devices that are not instruments

The Tascam Model 2400 is a device with `kind: 'mixer-recorder'` — no voices, but real I/O
that participates in routing instructions. Empress ZOIA Euroburo is `kind: 'fx-processor'`.
Model them properly rather than special-casing; a device with no voices simply contributes
no assignables and still appears in rig integration.

### 2.5 Seed order

1. Roland TR-1000 (fixed voices — proves the base case)
2. Polyend Tracker Mini (pool — proves §2.1 was necessary)
3. Synthstrom Deluge (pool, larger)
4. Intellijel Cascadia (semi-modular — proves `patch`, §3.3)
5. Roland MC-101
6. Tascam Model 2400 (`mixer-recorder`)
7. Empress ZOIA Euroburo (`fx-processor`)

Manuals for all seven are in `manuals/` (gitignored — copyright and size).

---

## 3. Layer 2 — Recipes

Authored parameter sets keyed on `(role, character)`, living inside the owning device.

```ts
{
  id: 'tr1000-kick-hard',
  role: 'kick',
  character: 'hard',
  voice: 'bd',                 // matches poolId ?? voiceId
  title: 'Short, hard, forward kick',
  params: [ /* AuthoredParam[], §3.1 */ ],
  patch: [ /* §3.3, semi-modular only */ ],

  // Step *placement* is template-owned (§4.3). A recipe only says what this device does to the
  // steps it is handed, addressed by slot rather than by absolute index.
  articulation: [
    { slot: 'accent',   set: { velocity: 110 } },
    { slot: 'last-hit', set: { cycle: 2 }, hint: 'apply-cycle' },
  ],
  routing: 'Keep out of the analog FX path so the panel FILTER acts only on LT',

  // Default citation only. It is *inherited* by any param, patch entry or articulation entry
  // that does not carry its own `verified` (§3.1). It is not itself a provenance state: the
  // recipe is not the thing rendered, individual values are. `false` here means everything
  // that does not override it is provisional.
  verified: { kind: 'manual', source: 'TR-1000 manual p.42' },
}
```

**Authoring rules**

- Actual values only. "Short decay" is not acceptable — `DECAY 38` is.
- Every value verifiable against the device manual, or against the hardware. A citation names
  which: `{ kind: 'manual', source: 'TR-1000 Reference Manual p.42' }` for a document,
  `{ kind: 'observed', source: 'TR-1000 unit, firmware 1.11' }` for a reading taken off the
  instrument (§3.1). An observation is a real citation, not a hedge — but it must never be
  written as `manual`.
- If unsure, `verified: false` — on the single param if only that one is a guess, on the recipe
  if none of it is checked — and the UI surfaces those values as provisional. A range you could
  not find in the manual and did not check on the unit gets
  `range: { min, max, verified: false }`, which is a different and quieter debt: it does not make
  the point provisional, it just makes that param deaf to mood (§3.2).
- One recipe per `(role, character, voice)`, where `voice` is the recipe's target — the
  `poolId ?? voiceId` the lookup keys on (§2.2). The key was written `(role, character, device)`
  before any device had two pools, and it did not match the lookup: it rejected authoring
  `tom + dark` for both LT and MT, and rejected a tonal recipe appearing on each pool of a
  two-pool device. Roughly 15–20 recipes covers a device well.
- A recipe never authors hits, step counts or bar structure. If you catch yourself writing
  `hits: [1, 5, 9, 13]` inside a device folder, that pattern belongs to a template (§4.3) —
  four-on-the-floor is a property of the genre, not of the TR-1000.
- Articulation addresses `PatternSlot`s, never absolute step numbers. `{ step: 13 }` is only
  correct for a 16-step pattern that happens to have a hit at 13; `{ slot: 'last-hit' }` survives
  every variant the density bands can select.
- Every key in an `articulation.set` must appear in this device's `features.perStep`. Zod checks
  it inside the codegen (§9), so an articulation the box physically cannot do fails the build
  rather than a request.

### 3.1 Params are a discriminated union, and authored params are not rendered params

Strings cannot be offset, and mood control needs to move numbers within known bounds. Two further
things the union has to carry, or §3.2's three-state provenance cannot be implemented on top of
it:

- **A verification claim on the authored point, separate from the verification claim on the range
  it sits in.** §3.2 requires these independently. A single `verified` flag — at recipe level or
  at param level — cannot express "the manual gives the legal range but this point value is my
  ear, not the manual", which is the common case for anything a recipe tunes by taste.
- **A claim about *how* it was checked.** A manual page and a reading taken off a unit are both
  citations, but they are not the same claim: the first is re-checkable by anyone holding the
  document, the second only by whoever has that instrument. Left as free text they are
  indistinguishable to the type system, the audit and the UI.
- **A distinction between the authored form and the resolved form.** Provenance is a property of a
  *rendered* value, not of a manifest entry: `derived` does not exist until §7 step 9 has run, and
  a manifest cannot author it. Collapsing both into one `Param` forces the field to be optional
  everywhere, which means nothing downstream can rely on it being present — and "every rendered
  value carries provenance" is precisely the invariant-4 repair.

```ts
type Cite =
  | { kind: 'manual';   source: string }   // 'TR-1000 Reference Manual p.42'
  | { kind: 'observed'; source: string }   // 'TR-1000 unit, firmware 1.11'

type Verified = Cite | false               // false = authored, nothing checked against

// Bounds are their own claim. A range can be verified while the point inside it is not, and
// a point can be read off the manual for a parameter whose limits the manual never states.
type NumericRange = { min: number; max: number; verified?: Verified }
```

**Neither `Cite` kind is second-class, and `observed` is not a softer `provisional`.** An
observed value is often the *better* evidence — it is the actual instrument, not a document
describing one. `provisional` means nobody checked; `observed` means somebody did, on hardware.
The kinds are separated for a different reason: they are re-checkable by different people. The
audit (§9) counts them apart so "how much of this device rests on one person's ear" is
answerable, §8 renders them differently, and community recipe sharing (§13) needs the
distinction most of all — a shared recipe citing a manual is verifiable by the recipient, one
citing someone's unit is not.

Two shapes rather than one `kind` field on one shape, so the kinds can diverge later — an
observation eventually wants firmware and unit identity; a manual page wants an edition — without
a second migration across every recipe in the library.

This is not hypothetical. Manuals are incomplete in ways that only show up once you are authoring
against one: a parameter the tables omit, a range stated for one mode and left implicit for
another, behaviour that changed with a firmware revision the document predates. Those values are
worth having and are properly checked — on the instrument. What they must not be is
indistinguishable from the ones read off a page.

**Authored** — what a device folder contains, and the only shape an author ever writes:

```ts
type AuthoredParam =
  | { kind: 'numeric'; name: string; value: number; range: NumericRange
      step?: number; unit?: string
      mood?: { axis: MoodAxis; amount: number }[]
      verified?: Verified            // the *point value*; omitted → inherit the recipe's
      hint?: string; note?: string }
  | { kind: 'enum'; name: string; value: string; options: EnumOptions
      verified?: Verified            // the *selected option*; omitted → inherit the recipe's
      hint?: string; note?: string }
  | { kind: 'text'; name: string; value: string
      verified?: Verified; hint?: string; note?: string }
```

**Resolved** — what §7 step 9 emits and §8 renders. Nothing downstream of the resolver sees an
`AuthoredParam`, and nothing in a device folder can construct a `ResolvedParam`:

```ts
type Provenance =
  | { state: 'authored';    cite: Cite }
  | { state: 'derived';     cite: Cite; rangeCite: Cite
      from: number; axes: MoodAxis[] }          // 52 → 45, and which knobs did it
  | { state: 'provisional'; from?: number; axes?: MoodAxis[] }

type ResolvedParam = {
  name: string
  value: number | string
  unit?: string
  provenance: Provenance        // required, not optional — this is the invariant-4 repair
  hint?: string; note?: string
}
```

`ResolvedParam.provenance` being non-optional is the whole point of the split. It is a type error
to render a value whose provenance nobody decided, so invariant 4 is enforced by the compiler
rather than by remembering. A cited state carries the whole `Cite` and not a bare source string,
for the same reason: the resolver cannot stamp a source without also saying how it was checked,
and §8 cannot render a manual page differently from an observation if the kind was dropped on the
way through. A `derived` value carries two citations that may be of different kinds — a documented
range with a point checked on the unit, or the reverse — because the point and the range are two
independent claims (§3.2) and nothing requires them to have been checked the same way.

**Inheritance.** `verified` omitted on a param means "inherit the recipe's `verified`"; the same
for `range.verified`. A citation written on the param overrides an inherited one, and an explicit
`false` on the param overrides an inherited citation too — more specific always wins, in both
directions. Resolution happens once, in the resolver, before any provenance is stamped; the
inherited value is never re-read downstream.

Only `numeric` params respond to mood, and only those that declare a `mood` entry.
`amount` is authored in device units: "at full darkness this moves 12".

**A device declines a mood axis by simply having no param that declares it.** No capability
check, no special-casing. A device with no drive stage ignores Grit for free.

`NumericRange` and `EnumOptions` are the same shape in different clothes: each carries the set of
values the point may legally take, plus its own `verified`. An enum's option set is a claim about
the *box* — "`909 Bass Drum` appears in the GEN list under BD_E" — and is checkable by anyone
holding the document; the selected option is a claim about *this recipe*, and is taste. They are
separate fields because they are separate claims.

```ts
type NumericRange = { min: number; max: number; verified?: Verified }
type EnumOptions  = { values: string[];         verified?: Verified }
```

Zod checks in the codegen (§9): `range.min < range.max`, `range.min <= value <= range.max` for
numerics, and `options.values.includes(value)` for enums. A param whose authored point sits
outside its own declared range fails the build — that is an authoring typo, not a provenance
question.

### 3.2 Provenance is three-state, because a legal value is not a verified value

Invariant 4 originally read "no parameter value that isn't manual-verified or explicitly flagged
provisional", and §6 then generates values by offsetting authored ones. Verifying the *bounds*
does not repair that. A verified range proves `45` is a **legal** value for the parameter; it does
not prove anyone checked that `45` is the right value for this sound. Legality and verification
are different claims, and collapsing them lets the guide present engine arithmetic with the same
authority as a manual page.

So provenance is three-state, and always rendered:

| provenance | means | rendered |
|---|---|---|
| `authored` | the point value was read off the manual or the hardware, and `cite.kind` says which | `TUNE 52` |
| `derived` | mood moved a verified point inside its verified range | `TUNE 52 → 45` |
| `provisional` | the point is unverified (`verified: false`, inherited or explicit) | `TUNE 52` + provisional badge |

`cite.kind` is orthogonal to the three states. It does not add a fourth: an observed point is
`authored`, exactly like a manual one, and carries the same authority in the resolver. What it
changes is what §8 can say about the value, and what the audit can count.

`verified` therefore attaches to two things independently, which is why §3.1 gives the range its
own `verified` rather than one flag per param:

- **The range is the legality gate.** A `derived` value needs a verified *range* to be legal at
  all. If the range is unverified, mood must not move that parameter — the engine leaves it alone
  rather than generating inside bounds nobody checked. This holds even when the point itself is
  impeccably cited.
- **The point is the authority gate.** It decides `authored` vs `provisional`, and nothing else.

**The same split governs enums, and `options` is where their legality claim lives.** An option set
read off the manual says what the box offers; it says nothing about which option suits this sound,
so a cited `options` leaves the selected value provisional unless someone checked *that*. The
parallel is exact:

| | legality gate (cited independently) | authority gate (provisional when it is taste) |
|---|---|---|
| numeric | `range` | `value` |
| enum | `options` | `value` |

This was got wrong once. `options` was a bare `string[]` with nowhere to hang a citation, so
citations for option sets landed on the param — asserting that the *choice* was manual-verified
while intending only that the option exists. That is the identical defect the step 1 review found
in numerics, where `range` was a bare tuple and the legality gate had no representation at all.
Repairing it for numerics and not for enums is what let it recur.

The two gates are orthogonal, so all four combinations occur and the state function is total:

| point | range | mood declared | state |
|---|---|---|---|
| verified | verified | yes, and moved | `derived` |
| verified | verified | no, or mood at 50 | `authored` |
| verified | unverified | — (mood inhibited) | `authored` |
| unverified | verified | yes, and moved | `provisional`, still rendered `52 → 45` |
| unverified | either | no | `provisional` |

**`provisional` dominates `derived`.** Moving an unverified point inside a verified range is
legal — the result is in-bounds — but it inherits no authority the starting point never had, so
the badge stays and `Provenance.from` still records the move. The alternative, refusing to apply
mood to provisional params, would make a device with an unverified recipe silently ignore the
knobs, which reads as a bug and hides the debt instead of showing it.

`patch` entries (§3.3) and `articulation` values (§3) carry the recipe's citation on the same
inheritance rules and are `authored` or `provisional` only — mood never touches them, so `derived`
cannot arise there.

The audit script (§9) counts three things separately, because they are different debts:
provisional points, unverified ranges, and **mood-inert params** — those that declare a `mood`
entry but sit in an unverified range, so the axis they advertise does nothing.

It then splits the *cited* remainder by `cite.kind`, reporting manual and observed counts on
their own columns for points and for ranges. Those are not debts and are never findings; they
answer a different question, which is how much of a device is documented versus how much rests
on one person's unit. Each half is total — every param is exactly one of manual / observed /
provisional on its point, and every numeric exactly one of manual / observed / unverified on its
range — so a case that stops adding up is a case that was added without a home.

### 3.3 Semi-modular recipes

A patchable device's recipe is a patch list plus knob positions, not knob positions alone.

```ts
patch?: { from: string; to: string; note?: string }[]   // 'OSC1 SUB' → 'FILTER IN'
```

Jack names come from the manual, so they are verifiable on the same terms as parameter
values. The rack UI (§8) needs this data to draw cables, so it has two consumers.

### 3.4 Character is a vector

The six characters are three opposed pairs. Representing them as a vector gives a distance
function for free, which is what recipe fallback and mood-driven character selection both need.

```ts
type Character = 'hard' | 'soft' | 'bright' | 'dark' | 'clean' | 'dirty'

const CHAR = {
  hard:   { force:  1, tone:  0, grit:  0 },
  soft:   { force: -1, tone:  0, grit:  0 },
  bright: { force:  0, tone:  1, grit:  0 },
  dark:   { force:  0, tone: -1, grit:  0 },
  clean:  { force:  0, tone:  0, grit: -1 },
  dirty:  { force:  0, tone:  0, grit:  1 },
}
```

`hard → dark` is sqrt(2) (orthogonal, acceptable substitution).
`hard → soft` is 2 (direct opposite, refuse).

**`Character` is a shared vocabulary, not a device-private detail.** Templates author it per role
request (§4), devices key recipes on it (§3), `CHAR` defines the geometry both sides rely on, and
mood resolves it (§6.2). It crosses the template/device boundary exactly as `Role` does — which is
why invariant 3's original "roles are the only shared vocabulary" was false from the moment §3 was
written. `Character` is now governed on the same terms as `Role`: closed, small, and never
extended for one device's convenience.

### 3.5 Recipe selection has three outcomes

23 roles x 6 characters = 138 slots per device; you author 15–20. Exact match fails
constantly, and "no recipe → gap" is wrong: the device *can* do it, you just have not
authored that flavour yet.

```ts
const scored = recipesForRole
  .map(r => ({ r, d: dist(CHAR[r.character], CHAR[want]) }))
  .filter(x => x.d < 2)                                        // never substitute an opposite
  // tie-break by UTF-16 code unit, never localeCompare — see §7.2
  .sort((a, b) => a.d - b.d || (a.r.id < b.r.id ? -1 : a.r.id > b.r.id ? 1 : 0))
```

| outcome | meaning | guide renders |
|---|---|---|
| `exact` | authored for this `(role, character)` | normally |
| `substituted` | nearest neighbour within distance < 2 | "using the dirty variant; nothing dark authored here" |
| `unvoiced` | assignable exists, no usable recipe | a gap — but the fix is authoring, not buying |

`unvoiced` and "your rig cannot do this" are different failures and the UI must distinguish
them, because they imply different actions from the user.

**`unvoiced` is a gap reason, not an assignment.** It does not fill the request and does not
occupy the assignable — it surfaces as the `no-recipe` gap of §7.3, which names the voice that
could have carried the part. The distinction this section draws is a *reporting* distinction and
is recovered there, never in the objective.

---

## 4. Layer 3 — Templates

Genre definitions. Device-agnostic — they emit role requests, structure and harmony,
and nothing else.

```ts
{
  id: 'industrial-techno',
  name: 'Industrial Techno',
  bpm: { min: 130, max: 142, default: 134 },
  keys: ['F minor', 'A minor', 'C minor'],

  structure: [
    { name: 'Intro', bars: 16, energy: 0.2 },
    { name: 'Build', bars: 16, energy: 0.5 },
    { name: 'Drop',  bars: 32, energy: 0.9 },
  ],

  harmony: {
    cycleBars: 8,
    progression: [
      { degree: 'i',   bars: 4 },
      { degree: 'VI',  bars: 2 },
      { degree: 'VII', bars: 2 },
    ],
  },

  hooks: [
    { id: 'it-hook-1', forRole: 'lead', bars: 2,
      notes: [{ step: 1, degree: 5, octave: 0, len: 2 }] },
  ],

  // priority 1 = most important, ascending. See §4.4.
  roles: [
    { id: 'r-kick',  role: 'kick',       priority: 1, character: 'hard',  sustain: 'continuous' },
    { id: 'r-sub',   role: 'sub',        priority: 1, character: 'dark',  sustain: 'continuous' },
    { id: 'r-ch',    role: 'closed-hat', priority: 2, character: 'dirty', sustain: 'continuous' },
    { id: 'r-metal', role: 'metallic',   priority: 3, character: 'dark',  sustain: 'continuous' },
    { id: 'r-pad',   role: 'pad',        priority: 3, character: 'dark',  sustain: 'continuous',
      polyphony: 3 },                    // minimum simultaneous notes, §12.4
    { id: 'r-tex',   role: 'texture',    priority: 4, character: 'dark',  sustain: 'continuous',
      optional: true },
    { id: 'r-riser', role: 'riser',      priority: 4, character: 'bright',
      sustain: 'transient', sections: ['Build'] },
  ],

  patterns: [ /* §4.3 */ ],
}
```

Every request carries a stable `id`. Occupancy (§4.2) and the rendered guide both key on it,
because a template may legitimately request the same role twice — two toms, two stabs — so `role`
is not an identity.

`polyphony` on a request is a **minimum note count**, matched against the assignable's
`polyphony`. It is a number, not a device name, so it does not breach invariant 3. An assignable
that cannot meet it is not a candidate; if nothing in the rig can, the request becomes a gap
(§7.3) rather than a silently monophonic pad.

### 4.1 Harmony and hooks are authored, not generated

Scale degrees resolved against the chosen key produce concrete notes. Deterministic,
no generation. The seed picks among multiple authored hooks.

**If no hook is authored for the assigned role, the guide omits the hook section rather than
inventing one.** This is invariant 5 applied to melody.

#### Middle C is C4

Scientific pitch notation, stated rather than implied: **middle C is C4**, C4 is MIDI 60, and the
octave number changes at C rather than at the tonic. So in F minor the fifth above F4 is C5, and a
resolver that numbered octaves from the tonic would print C4 and be wrong on the page.

Every hook carries a required `baseOctave` in that notation, and `HookNote.octave` is an offset
from it — `degree: 5, octave: 0` on a hook with `baseOctave: 2` is a fifth in octave 2, and
`octave: 1` is the same degree an octave up.

**The origin is per hook, not one global constant.** A bass hook and a lead hook in the same genre
sit two or three octaves apart, so a single constant would be wrong for one of them, and the
person authoring the hook is the one who knows which it is. It is a purely musical fact and names
no device, so it does not touch invariant 3.

**Resolution emits concrete notes, not pitch classes plus offsets.** The guide is read standing at
the machine. `degree 5, octave offset 0` is something to work out; `G2` is something to play, and
§8 exists to be actionable at the box.

#### The convention is not universal on hardware, and we are not fixing that here

Scientific pitch notation is a convention, not a fact about instruments. Roland and most makers put
middle C at C4; Yamaha puts it at C3; some boxes display note *numbers* and no names at all. A guide
that says `G2` can therefore read an octave off on some hardware.

Fixing that needs per-device note-naming data, which this design does not model — and bolting it on
carelessly is device knowledge leaking toward the template, which is what invariant 3 exists to
stop. So: the convention is named here, the risk is recorded here, and `Device` gains no
note-naming field.

**Resolution never clamps or transposes to fit what a voice can reach.** `Assignable` carries no
note range, and inventing one at the template layer would be the same leak. A hook states musical
intent; a voice that cannot reach it is a limitation to surface later, never something to silently
move the notes for.

### 4.2 Section scoping, and who owns occupancy

`riser`, `impact` and `sweep` are transitional events that exist for four bars, not parts
that own a voice for a whole track. Burning a voice on one is a bad use of a small rig.

Continuous requests occupy every section; transient requests occupy only their listed ones.
Conflict = same section, same assignable.

A transient request **must** list its sections, and a continuous request **must not**. The second
half is not symmetry for its own sake: a continuous request occupies everything by definition, so
a `sections` list on one is silently discarded, and an author who writes it has written something
that does nothing. Schema-level rejection, not tolerance.

**Occupancy is resolver output and lives there.** The original design hung a
`Map<sectionName, roleId>` on each `Assignable`. That is wrong twice over. `Assignable` is derived
purely from device data (§2.2) and is identical for every guide ever resolved, so per-guide state
on it makes `expand()` impure and unshareable — two guides open in two tabs would fight over the
same objects, and the expand-once-and-cache step in §7 stops being sound. And `roleId` is not an
identity, since a template may request the same role twice. What must be stored is a *request* id:

```ts
type AssignableKey = string     // `${deviceId}/${voiceId}`, pool ordinal already folded in
type Occupancy = Map<AssignableKey, Map<SectionName, RequestId>>
```

`Assignable` stays a pure function of the device. `Occupancy` is built by the search (§7.1), read
by the crowding key of the objective, and consumed by the renderer.

Beyond solving the riser problem, this lets the step-programming section render
"LT enters at Build, out through Breakdown" from data rather than hand-written prose per template.

Assignment remains **static** in v1 — one request per assignable per section, decided once. An
assignable occupied in *any* section counts as one occupied assignable for `comfortableVoices`
(§12.4): the physical voice is committed for the whole build even if its part only plays in Build.

### 4.3 Step patterns are template-owned, and density selects among them

Step placement was originally authored inside device recipes (`steps.hits`). That was the wrong
owner. A four-on-the-floor kick is a property of the genre, not of the TR-1000, and authoring it
per device means re-authoring the same musical idea once per box — the identical duplication that
§2.2's `poolId ?? voiceId` key exists to eliminate one layer down. It is also the wrong shape for
pools, where one recipe serves eight tracks all playing different parts.

Patterns live in the template, addressed by role, with **authored variants per density band**:

```ts
type PatternSlot = 'downbeat' | 'backbeat' | 'offbeat' | 'accent'
                 | 'first-hit' | 'last-hit' | 'fill' | 'ghost'

type Pattern = {
  id: string
  forRole: Role                  // matched against the request's role
  band: 0 | 1 | 2 | 3            // density band this variant is authored for
  sections?: SectionName[]       // omitted = eligible in every section
  length: 16 | 32 | 64
  hits: { step: number; slot: PatternSlot; velocity?: number }[]
}
```

**Density never mutates `hits`.** It selects which authored variant is in play (§6.3). A knob that
adds and removes steps emits patterns nobody authored and nobody can defend musically — that is
generative behaviour, the thing this design exists to avoid, smuggled in through a slider. It
would also create rhythm with no provenance at all, which is invariant 4's problem in a second
medium.

The consequence, stated plainly: **density is quantised.** Four bands, not a continuum. The UI
should show four detents rather than pretending to a 0–100 sweep, so nobody hunts for an effect
between 26 and 49 that does not exist.

Devices contribute `articulation` (§3), addressed by `PatternSlot` — which is why `PatternSlot` is
named in invariant 3's shared vocabulary. Slots are how a device says "accent the accents at
velocity 110, put cycle-2 on the last hit" without knowing which variant it was handed.

### 4.4 Priority is ascending: 1 is most important

`priority: 1` on kick and `priority: 4` on texture means 1 outranks 4, and §7.1's original
"requests ordered by priority descending" plus `MISS[priority]` said the opposite. The template
data is what people author against, so it wins. Everywhere: **requests are ordered by ascending
priority number, most important first**, and one miss at priority 1 is worse than any number of
misses at priority 2 (§7.1). `optional: true` removes a request from the miss objective entirely —
filled if it fits, dropped without complaint if not.

---

## 5. Layer 4 — Inspirations

Additive modifiers, not separate genres. An inspiration patches a template.

```ts
{
  id: 'reggae',
  name: 'Reggae',
  patch: {
    bpm: { shift: -60 },
    roles: {
      add: [{ role: 'stab', priority: 2, character: 'clean', timing: 'offbeat' }],
      modify: { kick: { pattern: 'sparse-drop-one' } },
    },
    notes: ['Bass sits on root and fifth, long notes, heavy low end'],
  },
}
```

> **Illustrative only. This example predates the design review — do not author against it.** Its
> added role request lacks `id` and `sustain`, both of which §4 requires, and
> `roles.modify.kick.pattern` assumes the obsolete pattern ownership, which §4.3 moved to
> templates as authored variants selected per request and per section. The real shape of
> `Inspiration.patch` is settled at build step 7
> ([#9](https://github.com/miclip/patchscore/issues/9)), against a template proven end to end.
> Until then there is deliberately no `Inspiration` type in the codebase.

This is what makes "industrial techno with a reggae influence" coherent rather than two
genres stapled together. Inspirations must compose; cap at two.

Note that `modify.kick.pattern` already assumed patterns were addressable in template space — an
inspiration cannot reach into a device folder without breaching invariant 3. §4.3 makes that
assumption true rather than accidental: `pattern` names a `Pattern.id`, and an inspiration may add
variants of its own (a reggae kick at band 2) rather than mutating the template's.

**Sequencing note:** inspirations multiply the test surface across every template. Land one
template end-to-end first, then add inspirations against it.

---

## 6. Mood controls

Continuous 0–100 values applied *after* recipe resolution. They apply offsets and character
preferences; they never introduce parameter values of their own.

| Axis | Effect |
|---|---|
| `darkness` | Biases character toward `dark`; offsets filter cutoff and tuning down |
| `density`  | Selects the authored pattern variant (§4.3, §6.3), and offsets probability params. Never edits hits |
| `grit`     | Drive, saturation, bitcrush, sample rate reduction |
| `swing`    | Timing offsets, substep placement |
| `space`    | Reverb and delay depth, send levels |

### 6.1 Numeric application

Applies only to a `numeric` `AuthoredParam` that declares a `mood` entry **and** whose
`range.verified` resolves to a citation (§3.2's legality gate). Anything else is copied through
untouched.

```ts
applied = round(
  clamp(base + sum(((mood[axis] - 50) / 50) * amount), range.min, range.max),
  step ?? 1
)
```

The resolver stamps provenance at the same moment it writes the value, per §3.2's table — there is
no later pass that could forget to.

### 6.2 Character resolution

Precedence between the template's character and the mood knobs falls out of §3.4's
geometry — no threshold constant to tune.

```ts
function resolveCharacter(base: Character, mood: MoodState): Character {
  const v = { ...CHAR[base] }
  v.tone += ((mood.darkness - 50) / 50) * -1
  v.grit += ((mood.grit     - 50) / 50)
  return nearestCharacter(v)      // tie-break alphabetical
}
```

Mood can push `hard` → `dirty` at high grit, but cannot flip the axis the template pinned
unless the push exceeds it. Unit-test as a table of `(base, mood) → character`.

`nearestCharacter`'s tie-break is by UTF-16 code unit, not `localeCompare` — see §7.2.

### 6.3 Density band selection

```ts
const band = density < 25 ? 0 : density < 50 ? 1 : density < 75 ? 2 : 3
```

Eligible variants are those matching `(request.role, band)` and eligible in the section. If a band
has no authored variant, fall back to the nearest lower band, then the nearest higher. If a role
has no pattern at all, the guide omits the pattern for that part and says so — invariant 5 applied
to rhythm, exactly as §4.1 applies it to melody.

Band fallback is **reported**, not silent: "no band-3 kick authored for this template; using band
2". A knob that visibly does nothing is a bug report waiting to happen.

Band edges are fixed constants, inclusive-below and exclusive-above. They are not tunable: a
moving edge would make invariant 6 depend on a config file.

---

## 7. The resolver

Pure functions, fully unit-testable, no React.

```
input:  { devices: Device[], template: Template, mood: MoodState, seed: number }
output: { assignments: Assignment[], gaps: Gap[], guide: GuideDocument }
```

**The resolver takes effective objects, never ids and never patch instructions.** A `Device`
reaching it is the shared definition already composed with the user's rig overlay (#16); a
`Template` reaching it is the base template already composed with its inspiration patches. The
caller does both compositions, so anything that exists only at runtime — a user-authored device, a
row from a database — resolves without a redeploy.

Applying inspirations is therefore a **pre-step performed by the caller**, not a pipeline stage:

```ts
applyInspirations(template: Template, inspirations: Inspiration[]): Template   // §5, step 7
```

A separate pure function, specified in §5 and built at build step 7. It is deliberately not
defined yet: §11 puts inspirations after a template is proven end to end because they multiply the
test surface across every template, and designing a patch language against zero real templates is
the mistake the review caught in step 1, where shapes settled in the abstract turned out wrong
once there was something concrete to check them against.

Pipeline:

 1. Emit role requests, sorted by **ascending** priority (§4.4)
 2. Expand all selected devices to `Assignable[]` — pure and cacheable (§2.2, §4.2)
 3. Resolve character per request (§6.2)
 4. Select a pattern variant per request and section from the density band (§6.3) — **before**
    assignment, because a variant's length and slot mix are part of what a recipe has to
    articulate
 5. Search assignments against the lexicographic objective (§7.1), producing `Occupancy`
 6. Resolve recipes, with fallback (§3.5)
 7. Bind each recipe's `articulation` to the selected pattern's slots (§4.3). A slot the variant
    does not contain is dropped silently — not a gap, the device simply had nothing to say about a
    slot with no hits in it
 8. Resolve inherited `verified` citations, apply mood offsets (§6.1), and emit
    `ResolvedParam`s with provenance stamped (§3.1, §3.2). This is the only place an
    `AuthoredParam` becomes a `ResolvedParam`
 9. Resolve harmony and hooks against the key (§4.1)
10. Render the guide

Steps 4 and 7 are the pipeline consequence of moving patterns out of recipes. Note that step 4
depends only on template + mood, so **pattern selection is independent of the rig**: two users
with different boxes and the same inputs get the same rhythms. That is the correct behaviour and
a cheap test to write.

### 7.1 Assignment is a bounded search over a lexicographic objective

Greedy highest-priority-first piles everything onto whichever device scores well per-role in
isolation — the TR-1000 wins kick, snare, hat *and* sub while the Deluge sits idle. Adding an
over-subscription penalty to a greedy pass makes it order-dependent and fragile.

The problem is tiny (<= ~20 role requests, <= ~8 devices), so search it.

**No scalar weights.** The original cost summed `MISS[priority]`, `W_RECIPE`, `W_CROWD` and
`W_IDLE` into one number, which requires an exchange rate between "the kick is missing" and "the
Deluge is idle". No such rate exists — those are not the same kind of badness — so any constants
chosen are unfalsifiable numbers tuned by feel. §12.3 already conceded that without noticing that
a fixture set cannot rescue a scalar: a fixture can say which assignment is right, it cannot say
what `W_CROWD` should be. Replace the sum with a **comparison vector, compared
lexicographically**:

```ts
type Score = [
  ...missesByPriority: number[],  // keys 0..k: unfilled *required* requests at priority 1..k
  crowdOverflow:  number,         // sum over devices of max(0, occupiedAssignables - comfortable)
  optionalMisses: number,         // unfilled requests marked optional
  recipeDistance: number,         // sum of §3.4 distances, x1000 and rounded to an integer
  roleFitPenalty: number,         // sum of the role's index within voice.roles
  idleDevices:    number,         // devices with zero occupied assignables
]
// smaller is better; compare element by element, first difference decides
```

Read it as an order of concerns, because that is what it is: never miss a required part; then do
not over-subscribe a box; then fill the optional parts; then prefer exact recipes over substituted
ones; then prefer voices whose author listed the role first; then avoid leaving a box switched on
and unused.

Three lower-order claims are load-bearing, and are exactly what the fixtures have to confirm:

- **Crowding outranks optional requests.** A rig that fills an optional `texture` by putting a
  seventh part on a four-voice box is a worse guide than one that leaves `texture` unfilled. Under
  the original scalar cost, with `MISS[4]` above `W_CROWD`, it would have chosen the crowded rig.
- **Recipe quality outranks role fit.** A substituted recipe is visible to the user and degrades
  the actual sound; role-list order is only an authoring hint.
- **Idle devices rank last and are nearly cosmetic.** Spreading parts across boxes is a preference,
  never a correctness property, and it must never cause a miss.

Every component is an integer, so comparison is exact — no float summation, and therefore no
cross-platform drift (invariant 6). `recipeDistance` is the only non-integer input and is quantised
to `round(d * 1000)` before it enters the vector.

**Fixtures, not feel.** §12.3's tuning problem changes shape rather than disappearing: instead of
four magic numbers there is one ordering of six keys, and an ordering is testable. The fixture set
is a table of `(rig, template, mood) → expected assignment`, hand-authored from real rigs —
TR-1000 alone; TR-1000 + Tracker Mini; Deluge alone; Deluge + Cascadia; everything. Each fixture
asserts a *relative* claim ("the sub goes to the Deluge, not the LT") rather than a cost number,
so the tests survive a re-ordering of the lower keys and fail loudly on a wrong one.

Requests ordered by **ascending** priority (§4.4), DFS with branch-and-bound, node cap ~50k. If
the cap is hit, fall back to the greedy result **and log it** — no silent truncation.

**Bounding is per key, and one key is not monotone.** Branch-and-bound needs a lower bound on the
final score of a partial assignment. Misses, crowding, recipe distance and role fit only grow as
the assignment extends, so the partial value bounds them. `idleDevices` *shrinks*, so its
admissible lower bound is the number of devices that no remaining unassigned request could
legally reach — not the current idle count. Using the current count prunes the optimum. Worth a
dedicated test with a rig whose best answer looks bad halfway down the tree.

**Pool ordinals are searched once, not `count` times.** A pool (§2.2) expands into `count`
assignables that differ in nothing the objective or the constraints can see: recipes key on
`poolId`, `roles` and `polyphony` come from the one authored voice, `crowdOverflow` and
`idleDevices` count assignables and devices rather than names, and `distinct` (§12.6) compares
`deviceId`. Putting the kick on Track 1 and putting it on Track 5 are therefore the same
assignment written two ways — and the search was exploring both, and re-exploring the whole
subtree under each. With the Deluge's 24 tracks and the Tracker Mini's 8 + 8, the factorial
blow-up meant **realistic rigs containing full-size pool devices hit the node cap and fell back
to greedy** — reported in `SearchReport`, per the no-silent-truncation rule above, but visible
and wrong is still wrong. The greedy answer is precisely the "pile everything onto the TR-1000"
failure this section exists to avoid.

Not *every* pooled rig: a two-track pool with eight parts finished in 116 nodes, and a TR-1000
plus a Tracker Mini still resolved exhaustively at eight. That is what made it hard to see. The
failure scaled with the thing that was growing — pool size and part count — so it was absent from
every small fixture and total on every real rig.

So the search breaks the symmetry: at each node, among the *never-occupied* members of one
`(deviceId, poolId)`, only the lowest survives as a candidate — lowest by ordinal numerically,
then `voiceId` by code unit (§7.2), because code units alone rank `track-10` below `track-2`.
Every member that already carries a part stays a candidate, because which part it carries is
exactly what makes it different from its idle siblings — and dropping it would take
section-disjoint sharing (§4.2) off the table.

This cannot change the optimum. Any solution giving a request a never-occupied member `m` has a
counterpart that gives it the lowest such member `m*`, obtained by swapping the two names
throughout the rest of the assignment: legal, because both are idle at this node and neither swap
can collide with anything already placed, and identically scored, because nothing in the vector
distinguishes them. What it does change is *which* member the winner names — always the lowest
free ordinal, so a pool fills from 1 upwards. **This argument is a premise about device data, not
a theorem.** A device shape that gave pool members their own roles, their own recipes or their own
polyphony would invalidate it, and the tests state the premise directly for that reason.

Measured by `scripts/bench-search.ts` — the real TR-1000 plus one synthetic pool device whose
member count is the only variable, against a template whose part count is the only other.

Both columns come from the same harness and the same shipping search. **There is no flag to turn
the pruning off**, and there must not be: a switch on `AssignInput` whose only purpose is to
re-enable a known-wrong search is an invitation for a caller to find it. The "before" column
instead rewrites each pool into `count` individually-named *fixed* voices carrying the same roles
and polyphony, with the pool's recipes duplicated per member. A fixed voice has no `poolId`, so
there is no symmetry to break and every ordinal is explored as its own candidate — which is
exactly what the search did before this section existed. The rewrite lives in `test/rigs.ts` and
is round-tripped against the pooled device before it is trusted to judge anything.

```
                 4 roles   6 roles   8 roles          4 roles   6 roles   8 roles
                 --- pools as fixed voices ---        --------- §7.1 ----------
TR only                9        11        14                9        11        14
+ pool(1)             22        26        30               22        26        30
+ pool(2)             45       102       116               26        55        65
+ pool(4)            209     1,017     1,464               21        69       103
+ pool(8)          3,357    CAPPED    CAPPED               21        33        41
+ pool(16)        CAPPED    CAPPED    CAPPED               21        33        41
```

Three things to read out of it. The fixed-voice TR-1000 column never moves, because it never had
the symmetry. `pool(8)` and `pool(16)` become *identical* — once the pruning is in, members beyond
the number of parts contribute nothing to search, which is the symmetry being fully collapsed
rather than merely reduced. And the pruned column is not monotone in pool size: `pool(4)` at eight
roles costs more than `pool(8)`, because four members and eight parts forces real crowding
trade-offs (§4.4) that eight members do not. That is the objective doing its job, not a residue of
the pruning.

The same script measures the rig somebody actually owns, at the part counts §11's templates
reach — before and after, on the real manifests:

```
                         6 roles         8 roles        10 roles        12 roles
TR-1000                  11 | 11         14 | 14         18 | 18         20 | 20
+ Tracker Mini        2,475 | 32      9,588 | 43     CAPPED | 71    CAPPED | 123
+ Deluge             CAPPED | 48     CAPPED | 63     CAPPED | 76     CAPPED | 94
all three           CAPPED | 167    CAPPED | 306    CAPPED | 845  CAPPED | 1,880
```

The TR-1000 row is unchanged, as it must be — it has no pool. Everything else was capped or
heading there and now finishes in the low hundreds. The node cap is a backstop against pathology
again rather than the normal outcome.

### 7.2 Seeding discipline, and no locale anywhere

Candidates sort by `(score, deviceId, voiceId)`, with `score` compared lexicographically (§7.1) —
fully deterministic. The seed only permutes among *exactly equal* scores, via a seeded shuffle.

**Two members of one pool are no longer two candidates.** §7.1's symmetry breaking canonicalises
pool ordinals before the shuffle ever sees them, so no seed moves a part from Track 2 to Track 5.
That is deliberate and is not a loss of variety: the seed exists to choose between options that
differ, and those two differ in a label. A tie the seed may still break is a tie between different
voices — two boxes that both fit, or two voices on one box.

**All string ordering is by UTF-16 code unit, never `localeCompare`.** §3.5's
`a.r.id.localeCompare(b.r.id)` and §6.2's "tie-break alphabetical" were both locale-dependent:
`localeCompare` reads ICU collation data that varies by Node build, by platform and by ambient
locale, so two tied recipes can order differently on a developer's Mac and on Vercel — identical
inputs, identical seed, different bytes, no error anywhere. That is invariant 6 failing silently in
the one place nobody thinks to test. Use `a < b ? -1 : a > b ? 1 : 0` throughout, and no
`toLocaleString` or `Intl.NumberFormat` in any rendered value.

Determinism has three axes and the tests must cover all three:
- same seed, same resolver version, same machine → byte-identical guide
- different seed → differs only where ties existed
- **different platform, same inputs → byte-identical.** Run the golden-file test on Linux and
  macOS in CI, with `LANG` deliberately set to something other than `C` in one job.

"Reroll" changes the seed. `Math.random()` appears nowhere in the resolver.

### 7.3 Gaps

Unfilled roles surface honestly, with a suggestion of what would fill them. Every gap carries a
**reason**, computed after the search, because the three are different failures and collapsing
them tells the user to do the wrong thing:

| reason | meaning | the action |
|---|---|---|
| `no-capable-voice` | nothing in the rig declares this role | buy something. Say what capability is missing |
| `no-recipe` | a capable assignable exists, nothing authored within character distance 2 | nothing to buy; we owe you authoring. Name the voice that could carry it |
| `no-room` | capable and voiceable, but the objective ranked some other allocation higher | your rig cannot carry this arrangement as configured. Say what gave way |

**Three, because there are exactly three actions.** The reasons exist to tell the user what to
*do*. A fourth top-level reason would split the third action into cases that all resolve the same
way, which is why `no-room`'s sub-cause is a field rather than a sibling:

```ts
because: 'contended' | 'crowding' | 'distinct'   // plus a sentence naming the specific thing
```

| because | the sentence says |
|---|---|
| `contended` | "the LT is carrying sub" |
| `crowding` | "your Tracker Mini is already at 8 of 8 comfortable voices" |
| `distinct` | "the second tom needs a different device and you only have one that can" |

`no-room` is the name rather than `rig-too-small` deliberately: crowding is often fixed by raising
`comfortableVoices` rather than by buying anything, and the name must not prejudge which.

A `no-recipe` gap **must name the assignable that could have carried it** — "nothing authored for
a soft kick; your TR-1000 BD can do it, dial it by ear". That hands the user the voice assignment
without pretending a recipe exists.

Reasons are computed **from the winning allocation**, not from what was reachable before the
search: the question a gap answers is "why did this part not get made", which is a fact about the
assignment that won. The sub-cause order falls out of the objective rather than taste — a
candidate free and `distinct`-legal in the finished allocation could have been taken without
displacing anyone, so the only key that can have argued against it is `crowdOverflow`; failing
that, a free but `distinct`-blocked candidate means §12.6 is binding; failing that, everything is
carrying something else.

**The three are exhaustive.** There is no fourth case where the objective declines a capable,
voiceable, uncrowded request for no reason: filling a free, `distinct`-legal candidate that adds
no crowding strictly improves the vector — `missesByPriority` for a required request,
`optionalMisses` for an optional one — with every higher key unchanged, so the search always takes
it. Note the corollary: because required misses outrank `crowdOverflow`, **`crowding` can never
explain a required miss.** A rig that falsifies either claim is a finding about §7.1's key order,
not a fourth gap reason.

**An `unvoiced` request neither fills nor occupies.** It counts as a miss in `missesByPriority`
(or in `optionalMisses` if the request is `optional`), it reserves nothing in `Occupancy`, and it
is never scored inside `recipeDistance`. Occupancy exists to stop two parts colliding on one
voice, and an unvoiced request produces no part at all — so letting it hold a voice is strictly
harmful. Consider an LT serving `sub`, `bass-mid` and `tom` where `sub` is unvoiced and
`bass-mid` is authored: if unvoiced filled, `sub` would take the LT and `bass-mid` would become
the miss, which is plainly the worse guide. Scoring it as a large finite `recipeDistance` fails
for a second reason — that key ranks below crowding and `optionalMisses`, so the search would
prefer a voice it cannot describe over one it can.

No new `Score` key for any of this. Inserting into a lexicographic tuple silently reorders every
key beneath it, which is exactly why §12.6 chose a flag on the request over a `Score` insertion.

### 7.4 Clock master

`canMaster`, then occupied-assignable count descending (§12.4), then transport preference
(`midi-din` > `usb`), then `deviceId` ascending by UTF-16 code unit (§7.2). **No seed** — this should be stable across
rerolls, since rerolling a pattern should not re-cable the rig.

---

## 8. Guide output

Phased, in this order. The sequence reflects how a real session unfolds at the machine.
Do not reorder.

1. **Song** — BPM, key, hook, harmonic cycle, bar-count energy map
2. **Voice assignment** — which role lives on which device and voice, and why
3. **Rig integration** — clock master, MIDI routing, audio outs, mixer channels
4. **Hook** — written before sound design
5. **Step programming** — the selected template pattern per part (§4.3), rendered per device with
   that device's slot articulation bound to it (§7 step 8)
6. **Sound design** — parameter values, device by device, each rendered with its provenance
   per §3.2's table (`52`, `52 → 45`, or a provisional badge). `ResolvedParam.provenance` is
   non-optional, so there is no unmarked case for this phase to fall through to
7. **Finishing** — sidechain, master FX, arrangement variations

Export as Markdown, plus a print stylesheet for PDF. A real PDF pipeline is disproportionate
work for v1.

### 8.1 Hints in the rendered guide

Global **Show hints** toggle, on by default, off once you know your boxes.

> Set **TUNE** to `52`  <sub>Select instrument, press INST</sub>
> Apply **cycle 2** to step 13  <sub>Hold STEP, MENU, C5 knob</sub>

Toggling must not reflow the page — this is read at the machine, mid-task. Inline hints
after the value *will* reflow as soon as a line wraps, so the column is reserved
structurally whether or not a hint exists:

```css
.instruction { display: grid; grid-template-columns: 1fr minmax(0, 14rem); align-items: baseline }
.hint        { visibility: hidden }
[data-hints="on"] .hint { visibility: visible }
```

On mobile the hint becomes a reserved second grid row with a fixed min-height. Toggling only
ever changes `visibility`.

Rules: a hint is a jog, under ~8 words, no full sentences. Where a hint is not enough, link
the manual page rather than expanding it. A missing hint is fine and common — render the
instruction alone, never invent one.

### 8.2 Persistence

`localStorage` plus a URL-encoded permalink. **Inputs only, never resolved output** —
devices, template, inspirations, five mood ints, seed. That packs to roughly 40 bytes.

Consequence: old links drift when the resolver changes — same inputs, same seed, different guide.
This is a real and accepted violation of invariant 6 as originally stated, and is why invariant 6
now reads "same inputs + same seed + **same resolver version**". Stamp `RESOLVER_VERSION` in the
permalink, bump it on any change that can alter output, and when a link carries an older version
say so in the UI rather than rendering a silently different guide under the old link's authority.

Encoding the resolved *output* in the permalink so old links freeze was considered and rejected:
it is orders of magnitude past the 40-byte budget, and it would freeze bugs into shared links as
firmly as it freezes intent.

---

## 9. Registry and build tooling

`lib/devices/*` cannot be globbed at runtime in a bundled Next.js app, and `require.context`
behaves differently under Turbopack and webpack. The deployable form of "adding a device is
one folder":

```
scripts/gen-registry.ts  →  lib/devices/registry.generated.ts   // static imports
package.json: "prebuild": "tsx scripts/gen-registry.ts"
```

Three guards:

- a test asserting the generated file matches a fresh generation (fails CI when stale)
- Zod validation over every manifest, run inside the codegen so a bad manifest fails the
  **build**, not a request
- a `verified` audit script reporting provisional points, unverified ranges and mood-inert
  params separately (§3.2), so none of the three quietly accumulates, and splitting the cited
  remainder into manual and observed so neither is read as the other

Authoring stays one folder; deployment stays static.

**This is the scope of invariant 2.** Adding a device *does* change a file outside that device's
folder — `registry.generated.ts` — so the invariant is false if read as "no file outside the
folder changes". It is true, and worth keeping, read as "no *authored* edit outside the folder":
the generated file is written by `prebuild` and never hand-edited. That makes the staleness test
above load-bearing rather than a nicety — it is the only thing enforcing the never-hand-edited
half. If the generated file is committed, that test is not optional.

---

## 10. UI direction

Eurorack panel, treated seriously as an interface rather than as decoration.

**Signature element: the rack.** Selected devices appear as panels of realistic relative
width in a rack frame. Once a guide resolves, patch cables (SVG bezier curves with real sag)
connect the panels to show signal flow and clock. The cables *are* the visualisation of the
resolver's output. This is the one place to spend effort.

- **Palette** — anodized black and raw aluminium, one saturated accent for live signal
  (not the obvious acid green). Silkscreen white for labels.
- **Type** — a condensed industrial face for panel labels, matching real silkscreen
  (Doepfer, Make Noise). A monospace for every parameter value. Values must be visually
  distinct from prose throughout; do not use one face for both.
- **Controls** — knobs draggable *and* accepting typed numeric input. Vertical drag, shift
  for fine adjustment. A drag-only knob fails accessibility and is annoying at precision.
- **Restraint** — the rack is skeuomorphic; everything else (device picker, genre picker,
  the guide) is flat, quiet, highly legible. The guide is read at the machine, possibly on a
  phone, possibly in a dark room. Legibility beats atmosphere there. Resist screws, LEDs and
  wood cheeks on every other surface.

Quality floor, unannounced: responsive to mobile, visible keyboard focus,
`prefers-reduced-motion` respected (the cable animation is the main thing to gate).

---

## 11. Build order

**Status lives in GitHub issues, not here.** Each step below is one issue labelled `build-step`
under the `v1` milestone, carrying its own detail, watch-outs and done-when. This section is the
*sequence and the reasoning for it*; the issues are the tracker.

| # | Step | Issue |
|---|---|---|
| 1 | Types, schemas, vocabulary | [#2](https://github.com/miclip/patchscore/issues/2) |
| 2 | Registry codegen + TR-1000 manifest | [#3](https://github.com/miclip/patchscore/issues/3) |
| 3 | Resolver + unit tests | [#4](https://github.com/miclip/patchscore/issues/4) |
| 4 | Tracker Mini + Deluge | [#5](https://github.com/miclip/patchscore/issues/5) |
| 5 | Templates | [#6](https://github.com/miclip/patchscore/issues/6) |
| 5.5 | Harmony and hooks | [#7](https://github.com/miclip/patchscore/issues/7) |
| 6 | Guide renderer → Markdown | [#8](https://github.com/miclip/patchscore/issues/8) |
| 7 | Inspirations | [#9](https://github.com/miclip/patchscore/issues/9) |
| 8 | UI: pickers and mood controls | [#10](https://github.com/miclip/patchscore/issues/10) |
| 9 | UI: the rack and patch cables | [#11](https://github.com/miclip/patchscore/issues/11) |
| 10 | Export, permalink, localStorage | [#12](https://github.com/miclip/patchscore/issues/12) |
| 11 | Deploy | [#13](https://github.com/miclip/patchscore/issues/13) |

### Why this order

Separate commits, and **do not start the UI before the resolver passes its tests.**

Step 1 freezes the type surface steps 2–5 are written against, which is why its two undecided
type shapes (§12.5, §12.6) had to be settled before it could start rather than after: a type-level
error found at step 1 costs an hour, and the same error found at step 4 invalidates the one
experiment the ordering exists to run.

**Step 4 is that experiment.** Adding Tracker Mini and Deluge exists to prove no engine changes
were needed — it is where §2.1's two-authored-shapes decision pays or fails. If adding a device
requires touching the engine, the abstraction is wrong and the fix belongs before step 4.

Step 7 (inspirations) is deliberately after a template is proven end to end, because inspirations
multiply the test surface across every template that exists.

## 12. Open questions

### Resolved

**12.1 — `sub` vs `bass-mid`: two roles.** See §1. Not one role plus a register modifier; a
register modifier becomes a fourth recipe-lookup dimension and reintroduces exactly the
combinatorics the closed union exists to bound.

**12.2 — Bars-per-pattern: authored variants, selected by density.** See §4.3 and §6.3. Step
patterns move out of device recipes and into templates, authored in four density bands. Density
*selects* a variant; it never mutates hits. Devices keep `articulation`, addressed by
`PatternSlot`. Accepted cost: density is quantised to four detents.

**12.3 — Assignment weights: there are none.** See §7.1. A scalar cost needs an exchange rate
between incommensurable kinds of badness. Replaced by a lexicographic `Score` vector led by
priority-ordered required misses; the lower-order ordering (crowding > optional misses > recipe
distance > role fit > idle) is validated by a hand-authored rig fixture set that asserts relative
outcomes rather than cost numbers.

**12.4 — Polyphony: notes within one role, never role capacity.** See §2.2, §4 and §7.1. One
assignable serves exactly one request per section. `polyphony` is a minimum-note-count constraint
on candidacy. Multitimbrality is modelled by pools, not by polyphony. `comfortableVoices` counts
*occupied assignables* — one per assignable occupied in at least one section.

**12.5 — Section-transition patterns: fills are out of v1; `Pattern` stays flat.** See §4.3.
One variant per request per section; change happens at section boundaries only. A bar offset (or
a within-section variant sequence) is the v1.1 shape, and adding it later is a change to
`Pattern` that invalidates templates authored against the flat form — so the cost of this
decision is a template re-author, not an engine rewrite, and it is paid only if fills are
adopted. Rationale for deferring: §4.3 already gives four density bands per role per template,
which is substantial unexploited authoring surface. Exhaust it before adding a second axis of
pattern addressing.

**12.6 — Two requests, one role, one device: `distinct: true` on the role request.** See §4 and
§7.1. Not a same-role spread key in the `Score` vector. A `Score` insertion silently reorders
every key beneath it, which makes the lexicographic objective fragile to exactly the kind of
late tuning §12.3 was written to eliminate; `distinct` is a local authoring statement, made by
the person who knows whether two toms are meant to be two boxes. Semantics: requests sharing a
role and carrying `distinct: true` may not be assigned to the same `deviceId`. If the rig cannot
satisfy it, the surplus requests become ordinary gaps (§7.3) rather than being silently
collapsed. Default is `false`, so templates that do not care are unaffected.

### Still open

Neither item blocks build step 1: item 1 is a value inside an existing field and item 2 is a
question about test authority. Neither moves a type. Both are tracked as issues
([#14](https://github.com/miclip/patchscore/issues/14),
[#15](https://github.com/miclip/patchscore/issues/15)) — the rationale stays here, the status
does not.

1. **`comfortableVoices` for large pools.** The Deluge's real limit is CPU, not voice count — so
   what number does it declare? Currently unmodelled, and it will distort `crowdOverflow`, the
   second-highest key in the objective.
2. **Fixture authority.** §7.1's fixtures encode musical judgement about rigs nobody has played
   yet. They need one pass by someone with the boxes on a desk before they are treated as tests
   rather than as guesses.

---

## 13. Later, not now

- User-authored devices via a JSON schema and an import UI
- Community recipe sharing
- Sync back to hardware (SysEx, project file generation)
- Multiple variations per guide (A/B/C/D arrangements)
