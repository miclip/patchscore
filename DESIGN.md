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

  clock: { canSendClock: true, canReceiveClock: true, transport: ['midi-din', 'usb'] },

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
  realisation: 'polyphonic-voice',  // §12.4. Omitted means this. See below.
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
- One recipe per `(role, character, voice, realisation)`, where `voice` is the recipe's target —
  the `poolId ?? voiceId` the lookup keys on (§2.2) — and `realisation` is the effective one, so
  an omitted field counts as `polyphonic-voice`. The key was written `(role, character, device)`
  before any device had two pools, and it did not match the lookup: it rejected authoring
  `tom + dark` for both LT and MT, and rejected a tonal recipe appearing on each pool of a
  two-pool device. `realisation` joined it later, for a different reason: two recipes can
  describe the *same* sound on the same voice and still be two different jobs — a triad played
  on a polyphonic voice and the same triad loaded as one sample — and the three-key form forced
  a device to give one of them a character it did not have in order to exist at all. That is an
  invented value, which is the thing §3.1 exists to refuse. The pair is unambiguous: at a given
  note count and voice polyphony either only one of them is usable, or §7.1's realisation
  ranking decides on a stated principle rather than on which id sorts first. Two recipes
  agreeing on all four keys are the same recipe written twice and are still refused. Roughly
  15–20 recipes covers a device well.
- `realisation` says how this recipe makes the notes the request asked for (§12.4), and it is
  the recipe's business rather than the device's: `polyphonic-voice` (the default — the voice
  sounds every note itself, so it needs at least that much polyphony) or `sampled-chord` (the
  notes are already inside one sample, one wavetable, one preset stab, so one voice is enough
  however many are heard). Mark `sampled-chord` only when the chord really is baked in; it is
  what lets a one-voice sampler carry a triad, and claiming it falsely produces a guide that says
  three notes and sounds one.
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
| `authored` | the point value was read off the manual or the hardware, and `cite.kind` says which | `TUNE 52 · manual` |
| `derived` | mood moved a verified point inside its verified range | `TUNE 52 → 45 · manual · moved by darkness` |
| `provisional` | the point is unverified (`verified: false`, inherited or explicit) | `TUNE 52`, unmarked |

**The rendering marks the positive claim.** An unmarked value is a starting point — that is what
a patch sheet has always been and what this guide is, so it needs no annotation. What earns a
mark is *this number came off the manual*, because that is the fact that changes what a reader
does with it. A mood move names its knob whether or not the point underneath was cited, since
the move is a fact about the value rather than a claim about its authority.

This replaced an earlier scheme that marked the common case instead: a warning glyph on nine
values in ten, under a legend that opened by telling the reader nobody had checked any of it. A
mark that appears on almost everything carries no information, and leading with an apology tells
a reader the tool does not know what it is talking about before they have seen a single value.

What the inversion costs is real and is accepted: skimming to a single line, a reader can no
longer tell *unmarked because it is a starting point* from *unmarked because nobody got to it
yet*. That is tolerable only because the convention is stated once at the top of every guide and
because the audit script (§9) still counts provisional points, unverified ranges and mood-inert
params separately — the debt stays visible to the project even where it is no longer ink on the
page. Invariant 4 is untouched by any of this: `ResolvedParam.provenance` is non-optional, which
is a type guarantee and not a rendering convention.

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
it gains no citation mark and `Provenance.from` still records the move. The alternative, refusing to apply
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

`polyphony` on a request is a **minimum note count**. It is a number, not a device name, so it
does not breach invariant 3. It is *not* matched against the assignable's `polyphony` directly:
the note count is the musical requirement, and how many voices that costs is the recipe's answer
(§3, §12.4). A `polyphonic-voice` recipe needs the assignable's own polyphony to be **at least**
the note count, because the voice sounds every note itself; a `sampled-chord` recipe needs
polyphony 1 however many notes are heard. Both are floors, not equalities — a request for three
notes is served perfectly well by an eight-voice track, and nothing is gained by refusing it.

Either way the request is served by **one** assignable: the requirement is simultaneous-note
capacity inside a single voice, never a number of voices to gather up. If no assignable in the
rig can reach the count by either route, the request becomes a gap (§7.3) rather than a silently
monophonic pad.

### 4.1 Harmony and hooks are authored, not generated

Scale degrees resolved against the chosen key produce concrete notes. Deterministic,
no generation. The seed picks among multiple authored hooks.

**If no hook is authored for the assigned role, the guide omits the hook section rather than
inventing one.** This is invariant 5 applied to melody.

**A hook is authored as notes; how those notes are *delivered* is the recipe's business
(§12.4), and the two can disagree.** A hook is degrees and steps — it says nothing about
polyphony and must not, because the same hook is legal on any box that can carry the part. But a
part assigned to a `sampled-chord` recipe is not played note by note: it triggers a recording,
and a recording is a fixed set of intervals that moves as a block.

What that costs is narrower than it first looks, and stating it too broadly is its own error.
Transposition **preserves the interval structure**, so one recording covers its chord shape at
every root — a major triad moved up a tone is still a major triad. What transposition cannot do
is change the shape, and shape is where quality and inversion live. The industrial-techno pad
hook is `i - VI - VII`: `0-3-7` then `0-4-7` twice, so it needs **two** recordings, not three
and not one. The minor triad is its own sample; the two major ones are one sample and a `+2 st`
trigger.

That reconciliation belongs to the renderer, not to this layer: §8 phase 4 groups a sampled
part's hook by shape, lists one sample per shape, and prints the transposition on every trigger.
Nothing here changes, and nothing about a hook is authored twice — which is the point. A
template that had to know how each device makes a chord would be naming devices, and that is
invariant 3.

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

**Nothing mutates `hits`.** Selection picks which authored variant is in play (§6.3). A knob that
adds and removes steps emits patterns nobody authored and nobody can defend musically — that is
generative behaviour, the thing this design exists to avoid, smuggled in through a slider. It
would also create rhythm with no provenance at all, which is invariant 4's problem in a second
medium.

**The band comes from the section's `energy`, not from the density knob** (§6.3). Energy is
already authored per section, and it is the thing that says a Drop is busier than an Intro. When
density alone chose the band, every section of a guide got the same variant — the Intro as busy as
the Drop — and the four authored bands per role bought nothing but a knob. Authoring four bands is
only worth the effort if the arrangement moves through them, and the arrangement is what `energy`
describes.

Density is then a **lean over that**: one band sparser, as authored, or one band busier (§6.3). It
can shift the whole arrangement but never flatten it, so the shape the template authored across
its sections survives every setting of the knob.

The consequence, stated plainly: **both controls are quantised.** Four bands, not a continuum, and
three density zones rather than four. The UI should show three detents on density — *sparser · as
authored · busier* — rather than pretending to a 0–100 sweep, so nobody hunts for an effect between
26 and 49 that does not exist.

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
| `density`  | Leans the section's energy band by at most one (§4.3, §6.3), and offsets probability params. Never edits hits |
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

### 6.3 Band selection: energy chooses, density leans

The band is a property of **the section**, not of the knob. Selection therefore happens once per
request *per section* (§7 step 4), and two sections of one guide routinely play different bands.

```ts
const energyBand = Math.min(3, Math.floor(section.energy * 4))   // energy is 0–1
const shift      = density < 25 ? -1 : density < 75 ? 0 : 1      // density is 0–100
const band       = clamp(energyBand + shift, 0, 3)
```

`Math.min(3, …)` catches `energy === 1`, which would otherwise floor to a fourth band that does
not exist. The outer clamp catches the same thing after the lean: energy 1 leaned up is 4, energy 0
leaned down is −1, and neither is a band anyone can author. Both are load-bearing rather than
belt-and-braces — without them the resolver asks for a band outside the union, and §6.3's fallback
then reports, in the guide, that nothing was authored at a band that could never have existed.

Density is **one band of lean, not four bands of authority**. Three zones, so the middle zone is
"play it as authored" and the two ends are "sparser" and "busier". A knob that could pick any band
outright would erase the arrangement — every section identical — which is exactly the failure this
shape exists to prevent.

**The clamp makes the knob locally inert at the edges, and that is not a bug.** A section already
at band 3 cannot get busier, and one at band 0 cannot get sparser. Industrial techno's six
sections, at the three detents:

| detent | Intro `0.15` | Build `0.45` | Drop `0.9` | Breakdown `0.3` | Peak `1` | Outro `0.2` |
|---|---|---|---|---|---|---|
| sparser | 0 | 0 | 2 | 0 | 2 | 0 |
| as authored | 0 | 1 | 3 | 1 | 3 | 0 |
| busier | 1 | 2 | 3 | 2 | 3 | 1 |

Read across the Drop: turning the knob from centre to busier does nothing to it. Read across the
whole row and the three vectors are all different — the arrangement changed, the Drop just was not
the part that changed. **The effect is on the arrangement, never promised per section**, and the
guide must not say "turn this up and the Drop gets busier" — the one section a listener is most
likely to be watching is the one most likely to be pinned. This is pinned as an acceptance test
rather than left as a property, because the vectors are the specification: three detents, three
distinct guides.

Eligible variants are those matching `(request.role, band)` and eligible in the section. If a band
has no authored variant, fall back to the nearest lower band, then the nearest higher. If a role
has no pattern at all, the guide omits the pattern for that part and says so — invariant 5 applied
to rhythm, exactly as §4.1 applies it to melody.

Band fallback is **reported**, not silent: "no band-3 kick authored for this template; using band
2". A knob that visibly does nothing is a bug report waiting to happen.

Both sets of edges are fixed constants, inclusive-below and exclusive-above. They are not tunable:
a moving edge would make invariant 6 depend on a config file. A section name outside `structure`
has no energy to quantise and is an error, not a default band.

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
 4. Select a pattern variant per request and section from that section's energy band, leaned by
    density (§6.3) — **before** assignment, because a variant's length and slot mix are part of
    what a recipe has to articulate, and **per section**, because the band moves with the
    arrangement
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
a cheap test to write. Section energy is template data, so reading it in step 4 does not weaken
that: the input widened from `(mood, role)` to `(mood, role, section)`, and both halves are still
on the template side of the rig boundary.

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
  sampledChords:  number,         // multi-note requests filled from a chord sample (§12.4)
  recipeDistance: number,         // sum of §3.4 distances, x1000 and rounded to an integer
  roleFitPenalty: number,         // sum of the role's index within voice.roles
  idleDevices:    number,         // devices with zero occupied assignables
]
// smaller is better; compare element by element, first difference decides
```

Read it as an order of concerns, because that is what it is: never miss a required part; then do
not over-subscribe a box; then fill the optional parts; then voice a chord for real rather than
from a sample; then prefer exact recipes over substituted ones; then prefer voices whose author
listed the role first; then avoid leaving a box switched on and unused.

Four lower-order claims are load-bearing, and are exactly what the fixtures have to confirm:

- **Crowding outranks optional requests.** A rig that fills an optional `texture` by putting a
  seventh part on a four-voice box is a worse guide than one that leaves `texture` unfilled. Under
  the original scalar cost, with `MISS[4]` above `W_CROWD`, it would have chosen the crowded rig.
- **Recipe quality outranks role fit.** A substituted recipe is visible to the user and degrades
  the actual sound; role-list order is only an authoring hint.
- **Realisation outranks recipe quality, and is outranked by everything above it.** A chord
  sample is a fill, not a gap — it is the right notes — so it must never cost a part, and it
  never does: the key sits below every miss key, below crowding and below optional fills. But
  above `recipeDistance`, because the two are not the same kind of shortfall. A substituted
  character *approximates how the part sounds*; a chord sample *limits what the part can do* —
  it transposes, so it follows the progression, but it cannot be inverted, re-voiced, or given a
  quality it was not recorded with (§4.1), so it is closer to a correctness limit than to a
  timbral one. Given both routes, take the real voice
  and accept the substitution. Requests of one note never touch this key at all — there is no
  chord to invert, so the preference would be paying a worse-sounding recipe for flexibility
  nothing will use — which is also why adding the key changed no existing guide.
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
| `no-capable-voice` | no assignable can carry this part, by role or by note count | change the rig or change the ask. Say which |
| `no-recipe` | a capable assignable exists, nothing authored within character distance 2 | nothing to buy; we owe you authoring. Name the voice that could carry it |
| `no-room` | capable and voiceable, but the objective ranked some other allocation higher | your rig cannot carry this arrangement as configured. Say what gave way |

**Three, because a reason answers "why did this part not get made" and there are three answers:**
nothing could carry it, nothing is authored for what could, or something else won the voice. The
*action* mostly follows from that and originally followed from it exactly — three reasons, three
things to do — but §12.4 broke the one-to-one, and the honest record of that is worth more than
the symmetry:

- `no-room`'s three sub-causes **share an action**: change the arrangement, or the rig's
  configuration. They are a field rather than three siblings purely so the top level stays
  three-wide and readable, which is the original argument and still holds.
- `no-capable-voice`'s two sub-causes **do not share an action** — one is buying, the other is
  authoring or asking for less. They are still a field, because a top-level reason names a
  *state* of the search ("nothing could carry this") and both of these are that state. Promoting
  `polyphony` would put a remedy in the reason vocabulary, where every other name describes what
  happened. The cost is that a reader must read the sub-cause to know what to do, which is why
  `because` is mandatory on the variant and both sentences below say the action outright.

```ts
// no-capable-voice
because: 'no-such-role' | 'polyphony'            // plus the note count that was asked for
// no-room
because: 'contended' | 'crowding' | 'distinct'   // plus a sentence naming the specific thing
```

`no-capable-voice` gained its sub-cause with §12.4. Once a recipe can reach a note count its
voice cannot, "nothing in the rig declares this role" stopped being true of half the cases, and
the two halves have opposite fixes:

| because | the sentence says | the fix |
|---|---|---|
| `no-such-role` | "nothing in your rig plays this part" | buy something |
| `polyphony` | "needs 3 notes at once and every voice here is monophonic" | author a `sampled-chord` recipe, or ask for fewer notes |

A rig full of monophonic tracks *does* play pads. Told the first sentence, its owner goes
shopping for a pad machine when what they need is one chord sample. The `polyphony` case carries
the assignables that declare the role, so the shortfall is measured off the rig rather than
assumed: where those voices are not all monophonic the sentence names the real ceiling — "the
most any voice here can sound is 4 notes" — because the monophonic wording would simply be false.

Those role-declaring voices are carried **separately from `capable`**, which means one thing at
every reason: the assignables that could have carried the part. In a `polyphony` gap they could
not, so `capable` is empty there exactly as it is for `no-such-role`, and `no-recipe`'s promise
to name a voice that can do the job stays true.

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

### 7.4 Clock source

`canSendClock`, then occupied-assignable count descending (§12.4), then transport preference
(`midi-din` > `usb`), then `deviceId` ascending by UTF-16 code unit (§7.2). **No seed** — this should be stable across
rerolls, since rerolling a pattern should not re-cable the rig.

---

## 8. Guide output

Phased, in this order. The sequence reflects how a real session unfolds at the machine.
Do not reorder.

1. **Song** — BPM, key, hook, harmonic cycle, bar-count energy map
2. **Voice assignment** — which role lives on which device and voice, and why. For a part of
   more than one note, *how* those notes are made (§12.4) is one of the facts: "3 notes at once
   on one polyphonic voice" and "3 notes from one sampled chord" are different things to do, and
   the reader has to be told which one they got. A one-note part says nothing about realisation,
   because there is nothing to say
3. **Rig integration** — clock source, MIDI routing, audio outs, mixer channels
4. **Hook** — written before sound design. A part carried by a `sampled-chord` recipe (§12.4) is
   rendered as **two lists rather than one**: the chord shapes, as content to obtain or render
   before starting, and the steps, as trigger events. The ordinary note-per-chord rendering
   would tell its reader to enter three notes on a voice that sounds one. Grouping is by
   **normalised interval shape** — semitones above the lowest note — because that is exactly
   what one recording covers: a sample transposes as a block, keeping its shape, so a separate
   sample is required **only where the shape changes**, which means a different quality or a
   different inversion. Each trigger prints its transposition (`as recorded`, `+2 st`) and the
   chord that results, so the reader can check the move rather than infer it. Samples are
   labelled `sample A`, `sample B` — a label to point at, never a filename, which we could not
   know (invariant 5). A polyphonic part's hook is unchanged
5. **Step programming** — the selected template pattern per part (§4.3), rendered per device with
   that device's slot articulation bound to it (§7 step 8)
6. **Sound design** — where the multi-note realisation becomes an *instruction* rather than a
   fact. "Load the chord sample(s) onto this one voice" is a step a reader will otherwise not
   take, and the plural is load-bearing: the instruction names no count, because the count is a
   property of the hook rather than of the recipe, so it points at phase 4 for which samples are
   needed. Then the recipe's own `routing` line, which is where anything device-specific about
   the trade lives — that a chord sample costs the Tracker Mini no synth slot is the device's
   claim, not the renderer's, which knows about no box. Then parameter values, device by device,
   each rendered per §3.2's table
   (`52`, `52 · manual`, `52 → 45 · manual · moved by darkness`). `ResolvedParam.provenance`
   is non-optional, so every value's provenance is decided before the renderer sees it — an
   unmarked value is a decision, never a case that fell through
7. **Finishing** — sidechain, master FX, and the arrangement as a **band trajectory** (§6.3):
   which sections program identically part for part, and which parts do not follow the band.
   Deliberately not a second copy of phases 1–3 — it printed the device list, a bars-and-energy
   table and every role under every section heading, and all three already exist above it

**Terminology.** Clock roles are `canSendClock` / `canReceiveClock` and the guide says *clock
source* and *sync to it*. Never master/slave. "Master FX" and "master bus" stay — that is the
master-copy sense, universal in music production, and not half of a pair.

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

**12.2 — Bars-per-pattern: authored variants, selected per section.** See §4.3 and §6.3. Step
patterns move out of device recipes and into templates, authored in four bands. The **section's
`energy`** picks the band and density leans it by one; neither mutates hits. Devices keep
`articulation`, addressed by `PatternSlot`. Accepted cost: both controls are quantised — four
bands, and density as three detents rather than a sweep.

**12.3 — Assignment weights: there are none.** See §7.1. A scalar cost needs an exchange rate
between incommensurable kinds of badness. Replaced by a lexicographic `Score` vector led by
priority-ordered required misses; the lower-order ordering (crowding > optional misses > recipe
distance > role fit > idle) is validated by a hand-authored rig fixture set that asserts relative
outcomes rather than cost numbers.

**12.4 — Polyphony: notes within one role, never role capacity.** See §2.2, §4 and §7.1. One
assignable serves exactly one request per section. `polyphony` is a minimum-note-count constraint
on candidacy. Multitimbrality is modelled by pools, not by polyphony. `comfortableVoices` counts
*occupied assignables* — one per assignable occupied in at least one section.

*Worked example, and the case that proves the demand belongs to the recipe:* the Tracker Mini
sounds one note per track — "Each track in Tracker Mini can handle one voice which can play
multiple notes, but not simultaneously... A triad would therefore need 3 tracks" (manual p.104) —
so a three-note pad was unreachable on that box under any patch. The same page documents
rendering the tracks to an audio chord and playing the result from one track, and once that
sample is loaded the chord *is* one note as far as the track is concerned. `tm-pad-soft-chord`
is that recipe. It also costs none of the box's three synth slots, a real advantage stated in
its `routing`.

The correctness this forces, and the reason it is not only a candidacy question: **a sampled
chord follows a progression by transposition, and transposition preserves shape.** The
industrial-techno pad hook is `i - VI - VII` — in F minor `0-3-7` then `0-4-7` twice — so it
needs two recordings: the minor triad, and one major triad reused a tone up. §8 phase 4
therefore groups such a hook by shape and prints the transposition per trigger.

Both of the obvious simplifications here are wrong, and the second one is the mistake this
paragraph exists to record. "One sample follows the whole progression" is wrong because no
transposition turns a minor triad into a major one. But "every chord needs its own sample" — the
first version of this feature, written as the *conservative* reading — is wrong too, and worse:
it is a false claim about what a sampler does, it made a reader record chords they already had,
and being over-cautious did not make it any less untrue. A guide is not allowed to be wrong in
the safe direction.

It sits on the **same voice, role and character** as the VAP synth pad `tm-pad-soft-sample` —
`pad`, `soft`, `track-sample` — and the two ask different things of that voice: 3 and 1. That
pair is the proof, and it is why §3's uniqueness key had to grow a fourth term. They are one
soft pad described twice, and the three-key form would have forced one of them to claim a
character it does not have simply to be authorable. Resolution is not ambiguous: on a one-note
track only the sampled one can carry a triad at all, on a track with three notes free §7.1 takes
the VAP patch, and for a *single*-note request the VAP patch wins on realisation at equal
character — without that last tie-break the choice would fall to id order, and a part asking for
one note would be handed a three-note sample. Nothing about the voice changed to allow any of
it.

*Amended:* the note count and the voice cost are two claims, and the first version conflated
them. Matching a request's note count straight against an assignable's `polyphony` says a
one-voice sampler cannot play a triad, which is false the moment someone samples a chord — and
the only ways out of it were both wrong: inflate the sampler's `polyphony` to 3 (a lie about the
box, and one that would let it carry a genuinely three-voice part) or lose the pad. So the count
stays on the request, and **how the notes are made moves to the recipe** as `realisation` (§3):
`polyphonic-voice` needs the voice's own polyphony to be at least the count, `sampled-chord`
needs polyphony 1. Both are capacity *within one assignable* — `requiredVoicePolyphony` is a
simultaneous-note figure, not a count of voices to collect — and a request is still served by
exactly one assignable. Candidacy asks the recipe, not the voice alone; `Score` gains a
`sampledChords` key, ranked **above `recipeDistance`**, so a rig holding both routes takes the
real voice even at the cost of a character substitution. `Assignable.polyphony` does not move —
it is still simultaneous notes, and a sampler playing a chord sample is still monophonic.

*Recommendation — defer multi-assignable stacking to a follow-up.* Issue #40 asked for a rig of
monophonic voices to be able to hold a pad or a stab, and observed that a tracker plays a chord
across three tracks. Stacking N assignables under one request is one way to get there. It is not
what is built above, and the recommendation is that it stays unbuilt for now, for a reason that
is about scope rather than about merit: **the reported failure is fixed without it.** A
`sampled-chord` recipe carries the pad on a one-note track, and it does so entirely inside the
existing model — one request, one assignable, occupancy untouched, `crowdOverflow` counting what
it always counted. Nothing above widens the load-bearing shape of §4.2, and that is the property
worth keeping until something genuinely needs it spent.

Stacking is still worth doing, and #40 should not be closed on the strength of the pad alone.
It is the answer for a role with **no chord sample authored** — Tracker `stab` today, which is an
honest `polyphony` gap (§7.3) precisely because nobody has recorded a stab chord and no amount of
recipe work changes that a single track sounds one note. What it needs, and none of it is
incidental:

- **A deliberate `Assignment` / `Occupancy` shape.** Occupancy is keyed per assignable per
  section and an assignment names exactly one; a stacked part names several, and every consumer
  of that shape — gap classification, the `distinct` rule (§12.6), pool symmetry breaking
  (§7.1) — has to be re-read against it rather than assumed to survive.
- **Crowding accounting.** §12.4 counts *occupied assignables*, so a stacked triad costs three.
  That is probably right and is certainly not obvious: it makes one pad on a tracker as expensive
  as three separate parts, which is a real musical claim about the box and needs to be argued,
  not defaulted.
- **Per-note track rendering.** The guide would have to say which note goes on which track, in
  both renderers, and §8 phase 5's per-part step programming currently addresses one voice.
- **Ranking fixtures.** At minimum: a genuine polyphonic voice must beat stacking. A part that
  can be played on one voice should never be spread across three, whatever else is true.

**The ordering between `sampled-chord` and stacking is deliberately not decided here.** Both
sit below a real polyphonic voice; which of the two comes next is a musical question — a chord
sample is one recording with fixed shape, a stack is three voices spent — and answering it in
advance of building either the fixtures or the mechanism would be exactly the unfalsifiable
weighting §7.1 exists to refuse. Decide it with a fixture in front of you.

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
