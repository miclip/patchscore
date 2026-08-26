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

### Who this is for

The reader owns a synth or a drum machine and can operate it. They have little keyboard technique
and little formal theory. They have the manual, which explains what every control does but not
what to set it to, and they have videos, which usually assume experience they do not have yet.

Patchscore answers two questions: what to set, and in what order. Concrete values, on the devices
they own, sequenced into passes they can work through at the front panel.

That does not make it a teaching tool. A guide carries a brief *why* only where the reason
explains this choice in this track, such as a short decay leaving room for the sub. It never
explains what a decay envelope is. General concepts are the manual's job, and invariant 7 holds:
a hint is a jog, and a why that needs a paragraph is a manual reference instead.

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
  kind: 'drum-machine',   // | 'groovebox' | 'sampler' | 'sequencer' | 'synth'
                          // | 'semi-modular' | 'mixer-recorder' | 'fx-processor'

  clock: {
    canSendClock: true, canReceiveClock: true, transport: ['midi-din', 'usb'],
    // §2.3. `transport` is every wire this box carries clock on, **in either direction**, and on
    // almost every box that is the whole answer. Where the two directions differ, two optional
    // subsets say which is which; both omitted means symmetric, which is what this box is.
    //   sendTransport: ['analog-clock'],              // the Mother-32: pulses at OUT · ASSIGN
    //   receiveTransport: ['midi-din', 'analog-clock'],  // and it takes MIDI clock as well
    // §7.4/#104. Optional, and only for a box whose clock output is behind a setting. Per
    // transport, in the box's own words, with a page. The Tracker Mini's reads
    //   { transport: 'midi-din', path: 'Config > MIDI > Clock Out',
    //     value: 'MIDI Out jack', verified: cite(54) }
    // This box needs none, so it declares none.
  },

  io: { main: 'stereo', individualOuts: 8, audioIn: false, usbAudio: true },
                          // main: 'mono' | 'stereo' | 'none'

  // §10. Front-panel horizontal span in mm, cited like any other checked value. Required: the
  // rack draws panels at realistic relative width, so a missing span would have to be invented.
  physical: {
    panelSpanMm: 486,
    verified: { kind: 'manual', source: 'TR-1000 Reference Manual eng02, p.74 (Main specifications)' },
  },

  // §10. A simplified *original* drawing of the panel, read off the manual's hardware overview.
  // Optional: a box nobody has drawn still gets a generated panel. Lives in its own file in the
  // device folder, because it is long and it is data, not logic.
  panel: {
    panelRiseMm: 311,
    verified: { kind: 'manual', source: "TR-1000 Owner's Manual eng02, p.9 (Top panel)" },
    features: [
      { kind: 'group',  x: 88,  y: 24,  w: 318, h: 40 },
      { kind: 'knob',   x: 114, y: 38,  d: 11, label: 'LEVEL' },
      { kind: 'grid',   x: 92,  y: 150, w: 312, h: 62, cols: 11, rows: 1, shape: 'fader' },
      { kind: 'voices', x: 90,  y: 218, w: 314, h: 22, label: 'INSTRUMENT' },
      { kind: 'screen', x: 411, y: 28,  w: 70,  h: 40 },
      /* ...and the rest of the clusters */
    ],
  },

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

  // §2.6. Who checked the capability facts above, keyed by field path. Optional; silence is the
  // honest default. Required for every declared jack and every declared clock setup.
  capabilityEvidence: {
    'clock.transport':  { kind: 'manual', source: "TR-1000 Owner's Manual (eng02), p.12" },
    voices:             { kind: 'manual', source: "TR-1000 Owner's Manual (eng02), p.14" },
    'features.lfo':     { kind: 'unknown', reason: 'the manual prints no target list' },
  },

  manual: { title: 'TR-1000 Owner\'s Manual', edition: 'eng02' },

  recipes: [ /* §3 */ ],
}
```

`hints` is a flat lookup keyed by action, authored once per device and referenced by
recipes. A few words to jog you, nothing more. Every string under ~8 words.

`physical.panelSpanMm` is **the front-panel horizontal span in normal playing orientation** —
how much room the box takes up in a row of panels sitting in front of a player. It is deliberately
not called `width`, because a spec sheet calls the long axis the width regardless of which way up
the box is played, and the two disagree.

They disagree in the seed set already. The Tracker Mini is portrait: Polyend's specifications call
170 mm its width, but that is the panel's *vertical* span as played, and its horizontal span is
130 mm. A rack rendering it at 170 mm across would be showing it on its side. So a manufacturer's
stated width is a *candidate* for this field and never automatically the answer — confirm the
orientation against a panel diagram before authoring, and prefer citing that diagram, since it is
the thing actually measured. The TR-1000 (486 mm) and the Deluge (305 mm) were both checked the
same way and do happen to agree with their spec sheets; the check is what establishes that, not
the convention.

The contrast this buys is information, not pedantry: in a row of landscape boxes a portrait one
should read as narrow and tall, because it is, and that is exactly what "realistic relative width"
was asking for. The alternative is a rack that looks entirely plausible and is wrong, which is the
failure mode hardest to notice later.

`physical.verified` is the **same `Verified` a numeric range carries** (§3.1), and it means the
same thing: a `Cite` names a document and page anybody can turn to, `false` says nobody checked.
A panel span is citable device data exactly like a parameter range — manufacturers publish the
dimensions and draw the panels. Note that `pdftotext` scrambles the columns of a specifications
table and extracts nothing at all from a dimension callout inside a drawing, so a grep over the
text dump is neither a safe reading of a table nor evidence that a manual is silent; the page has
to be rendered and read.

#### The panel drawing

`panel` is the same idea one level up: **a simplified original drawing of the front panel, as
data**. `panelRiseMm` is the vertical span in playing orientation, `verified` cites the drawing it
was read off, and `features` is a list of shapes in panel-local millimetres — `screen`, `knob`,
`button`, `grid`, `label`, `group`, and exactly one `voices` region.

Three rules make this safe to have.

**It is data, not a component.** Invariant 2 forbids a UI edit when a device is added, and a
`tr-1000-panel.tsx` would be precisely that. One renderer switches on `PanelFeature['kind']` — a
closed vocabulary that does not grow when a manifest does — and never on a device id. A test
asserts no device id appears anywhere under `components/rack/`.

**It is optional.** A manifest with no `panel` gets a generated one: name plate, jacks, voice
field. A fourth box works on day one and looks like itself the day somebody draws it. The rack
labels which is which rather than letting a plain panel read as a drawn one.

**The parts that make claims are still generated.** The jacks are the ones `clock` and `io`
declare, and the `voices` region is filled with one cell per *assignable* the resolver could have
used, lit where this guide occupies it. The authored geometry says where things sit; it never says
what this rig is doing.

`panelRiseMm` springs the `panelSpanMm` trap from the other side, and it is worth stating plainly.
For a desktop box lying flat, the surface you play is the top panel, so its vertical span is the
figure the manufacturer calls **depth** — the Deluge is 305 × 208 on the desk and its
specifications read "305 x 208 x 46". Read it off the drawing and check the aspect before
believing either number.

Manual artwork stays reference, never asset (§10). Look at the hardware-overview figure, measure
the clusters, draw our own in our own line weights. Two practical notes from doing it: the
Tracker Mini's figure carries its own dimension lines and is the easiest of the three, and the
Deluge's is **split across two pages with each page clipping it**, so the halves have to be
extracted separately and joined on a feature visible in both.

`false` is therefore reserved for a box whose figure genuinely is not published, and it renders
provisional like anything else unverified. It is never the place to park a guess. A fabricated
span would be the first plausible fiction in this codebase, and one honestly-provisional panel is
worth more than that.

Span only, and no depth or height: depth does not exist in a front-panel view and height only
matters if the rack ever stacks rows. A field nothing reads is a field nobody keeps accurate.

### 2.4 Devices that are not instruments

The Tascam Model 2400 is a device with `kind: 'mixer-recorder'` — no voices, but real I/O
that participates in routing instructions. Empress ZOIA Euroburo is `kind: 'fx-processor'`.
Model them properly rather than special-casing; a device with no voices simply contributes
no assignables and still appears in rig integration.

**Not every device has an audio output**, and `io.main: 'none'` is how one says so. This dropped
an assumption that had been true of every manifest until a Eurorack sequencer arrived: pitch,
gate, modulation and clock outputs, and nothing to plug into a mixer. `mono` would have made both
renderers print a main out that does not exist and made §10's rack draw a jack nobody can plug
into — invariant 5 forbids inventing an assignment to fill a hole, and a fictional output is the
same fault in different clothes.

`none` says there is no *main bus*, not that there is no audio anywhere: a box may declare
`individualOuts`, `audioIn` or `usbAudio` alongside it, and consumers handle that combination
rather than treating `none` as a synonym for silence. The rig block prints `no audio I/O` only
when nothing at all is declared.

**The cost is that "every device has an audio output" is no longer a fact anything may assume**,
and it was being assumed in three places rather than one. `ioText` and `mixerText` — which exist
twice, see below — interpolated `io.main` straight into prose, so `none` would have printed *one
none channel for all*. §10's `jacksFor` branched `main === 'stereo' ? [L, R] : [OUT]`, a two-way
test on a field that now has three values, so `none` fell to the else and drew the very jack this
change exists to prevent. That one is now a lookup keyed by the whole union, so the next value
added fails the build rather than falling through.

**`sequencer` is the third of these, and it is the one that had to be added rather than found.**
A Eurorack sequencer — pitch and gate tracks, modulation lanes, no sound engine and no audio
voice — has no kind in the original list that is merely a loose fit. Both candidates state
something false:

- `semi-modular` implies a **normalised audio instrument**. The Cascadia's defining property is
  that it makes a sound with nothing patched into it; a sequencer makes none however it is
  patched. The kind would also imply voices, assignables and recipes for a box with none of them.
- `groovebox` implies **self-contained sound generation**, which is precisely what such a box is
  defined by not doing.

**The cost is that the closed kind vocabulary and the picker's filter both got one wider.** `kind`
drives a user-visible filter, so every addition is a term someone has to scan past. A kind earns
its place only when the alternatives would make a manifest *say something false* — never when they
would merely fit loosely. That test is the whole reason this is a separate decision from the
device that motivated it, and the reason the list is otherwise unchanged since the first draft.

### 2.5 Seed order

1. Roland TR-1000 (fixed voices — proves the base case)
2. Polyend Tracker Mini (pool — proves §2.1 was necessary)
3. Synthstrom Deluge (pool, larger)
4. Intellijel Cascadia (semi-modular — proves `patch`, §3.3)
5. Roland MC-101
6. Tascam Model 2400 (`mixer-recorder`)
7. Empress ZOIA Euroburo (`fx-processor`)

Manuals live in `manuals/` (gitignored — copyright and size), and **the set is not complete and
not stable**. This said "manuals for all seven" and had stopped being true; a first repair
enumerated the three that were missing and one of them arrived during the same piece of work. So
no roster here: `ls manuals/` is the only answer that stays right, and a manifest naming its own
source file at the top (the Cascadia's does) is worth more than a list in a spec.

The rule that does not change is what a missing file means. **A citation to a document nobody can
currently open is not evidence, and the absence of the document is not evidence that the manifest
around it is wrong.** What was cited while the manual was present stays cited — those pages were
read — and *new* claims wait for the file rather than being inferred from the pages a manifest
already quotes. #80 is the worked example in both directions: one decision was written as
explicitly open for want of a document, and became a real decision within the same piece of work
once the file appeared — which is the whole reason the rule is about the file rather than about a
roster of which files there are.

---

### 2.6 Capability provenance

`clock`, `io`, `voices` and `features` are read off a manual exactly as a parameter range is, and
until #22 there was nowhere to record it. The TR-1000's manifest carried **nine Owner's Manual
page references for those facts in code comments**, where `npm run audit` could not see them and
neither could a device page. Two of the nine were wrong, and nothing was in a position to notice:
the clock comment cited p.33 for "sync settings" and p.33 is the backup procedure — p.30 is the
synchronization chapter and p.31 carries the `Tempo Sync` setting.

A device therefore declares an optional map, keyed by field path:

```ts
type UndocumentedFact   = { kind: 'unknown';       reason: string }
type UnreadFact         = { kind: 'unread';        reason: string }
type CitedAgainstFact   = { kind: 'cited-against'; reason: string; cite: Cite }
type CapabilityEvidence = Verified | UndocumentedFact | UnreadFact | CitedAgainstFact

// on the Device
capabilityEvidence?: Record<string, CapabilityEvidence>
```

```ts
capabilityEvidence: {
  'clock.canSendClock':    owner(30),   // "Synchronizing with a MIDI device"
  'clock.transport':       owner(12),   // the rear-panel connector tables
  'io.individualOuts':     owner(12),
  voices:                  owner(14),   // "each have 10 tracks (BD, SD, LT, HT, ...)"
  'features.perStep':      owner('17-18'),
  'features.lfo':          { kind: 'unknown', reason: 'p.71 gives DEST 1-3 as assignment slots…' },
  'jacks[MIDI IN]':        owner(12),
  'clock.sourceSetup[usb]': cite(54),
}

// The other two states, from the boxes that needed them (#120):
'features.sidechain.internal': { kind: 'unread', reason: 'the ZOIA module index is not in manuals/…' },
'clock.preferredSource':       { kind: 'cited-against', cite: cite(7),
                                 reason: 'p.7 calls it a stand-alone instrument…' },
```

**The paths are a closed vocabulary.** The scalar facts are enumerated in `CAPABILITY_FACTS`; the
two keyed families — `jacks[<id>]` and `clock.sourceSetup[<transport>]` — are checked against the
collections they index. An unrecognised path fails the build (§9). A citation on `jacks[MIDI 1N]`
reads exactly like diligence and cites nothing at all, and a free-text key set makes that silent —
the same class of mistake as a patch entry naming a jack the device does not declare, which §3.3
has refused since it existed. Keyed by id and transport, never by index: an array position is an
authoring accident, and a citation that silently re-points at the neighbouring socket is precisely
what this exists to prevent.

**Silence is the default and is not a debt.** Invariant 4 is scoped to parameter values and #22
deliberately did not widen it: capability facts are ten or fifteen per box rather than eighty-five,
and a wrong `individualOuts` produces one obviously bad routing line where a wrong `DECAY` hides
among eighty-four plausible siblings. So an author cites what they checked, and the audit counts
the claims that were actually made. A denominator of "every fact every device could cite" would be
a debt this project never took on and would make fourteen honest manifests look delinquent.

**Two facts are required, and they are the two that were fields.** Every declared jack (#103) and
every declared clock setup (#104) has an entry, checked in `DeviceSchema` because that is where the
map is in scope. Both are rendered at the machine — a reader patches the one and dials the other —
and neither may go uncited. The check moved from the type to the schema; the discipline did not
change.

#### The three states past `Verified`

`Verified` has two and neither is "somebody went and looked". `false` is *authored, nothing checked
against* — nobody opened the book. What follows is what happens once somebody does, and it is three
states rather than one because #120 caught one word doing three jobs: eight of the first nine real
entries were `unknown` and they did not mean the same thing.

- **`unknown` — read, and the document does not say.** Finished work: it does not need doing again,
  and it is the strongest evidence there is that the box's own documentation is silent. Collapsing
  it into `false` loses the distinction in the direction that costs most, because the unchecked pile
  is the one an author works through.
- **`unread` — the document could not be read.** Unfinished, and not the same unfinished work as
  `false`: nobody has to open the book, somebody has to *find* it. Thirteen manuals are absent from
  `manuals/` and three of those have no automatable URL at all (#119), so for a new box this is the
  normal state rather than the exception, and it is the one state on this list nobody can clear by
  reading harder. It arrived with its own incident — during #118 an `unknown` was written whose
  reason was "the manual is not in `manuals/`", by an author citing that manual's p.110 in the same
  file. Written as `unknown`, a missing document renders as finished research, which is the failure
  `unknown` exists to prevent one level up.
- **`cited-against` — read, and it answers no.** The document does not fail to answer the question;
  it answers it in the other direction. That is a positive finding and the only one of the three
  with a page to cite, so it is the only one carrying a `Cite`. Where that citation goes is the
  point: `capabilityEvidence` is keyed by field path and the field it describes is deliberately
  *absent*, so a reasoned non-claim had no provenance slot at all and its pages lived in prose
  comments — the page-numbers-in-comments that §2.6 exists to end.

`reason` is required on all three, so no state can be a shrug — "the manual never says what KNOB
ASSIGN can target" is a finding; a bare state is giving up in a field that reads like diligence.

The TR-1000's `features.lfo` is the case. The MOD block is documented well enough to author a
recipe from, and `LfoSpec`'s `{ count, syncable, destinations[] }` still cannot hold it: `DEST 1-3`
is three assignment slots for one LFO rather than three LFOs, and `TARGET`'s Value column is
literally `-`. `features.*` paths are accepted whether or not the feature is declared, which is the
point rather than a hole in the checking — evidence *about an absence* is what invariant 5 asks
for.

No state borrows another's words. In the guide each is marked — `manual`, `unchecked`,
`undocumented`, `unread`, `cited-against` — which is §8's mark-the-exception rule applied rather
than overridden: a parameter goes unmarked when provisional because nine values in ten are, while a
rig prints a handful of capability facts and nearly all of them are cited, so the quiet states *are*
the exceptions. `npm run audit` splits the same total across two lines, `caps` for the three states
with a document behind them and `gaps` for the three without (§9), and `undocumented` stays out of
`unchecked` because reporting finished research as a backlog invites somebody to do it twice.

**What a reader is shown is a separate question and #120 did not answer it.** The states above are a
model, a schema and an audit; the guide marks them because a mark that named the wrong state would
be worse than the model not existing, and that floor is all it is. The device page still speaks
about the three states it spoke about before, and neither surface has a considered *place* for
capability evidence yet. That is #121, and building it here would have been rendering a distinction
before the distinction was settled.

#### What was rejected

**One `verified` on `Device`**, meaning "the structural facts were checked against this document"
(#22's own first suggestion, and the cheapest). One field, no migration, and false in practice the
moment it is written: the TR-1000's transports come off p.30, its jack list off p.12, its tracks off
p.14 and its per-step gestures off pp.17-18. A single citation names one of those four and implies
the other three — the recipe-level `verified` mistake of §3.1 with a wider blast radius.

**Per-field `Verified`** on `clock`, `io`, `voices` and `features`. The most precise shape, and it
roughly doubles the device schema surface for facts that almost never change. Worse, it makes every
device answer for every field: `io.usbAudio` on a Eurorack module would need a slot filled in with
`false` on fourteen manifests to say nothing at all. The map buys the same per-fact precision for
one optional field, and lets silence stay silent.

**`physical` and `panel` are deliberately not in the map.** Both already carry a required
`verified` of their own (§10), because both are *drawn* rather than merely stated and neither is
optional for the rack; moving them here would make a required claim optional.
`comfortableVoices` is out for the opposite reason: it is a musical judgement about a box (§12.4),
no page states it, and a slot to cite it in is an invitation to cite p.14 — which says ten, where
the field says eight.

**`clock.preferredSource` is in, and it is a judgement too**, so the rule is not "judgements stay
out" — the question is whether a page can be asked. Nothing prints "this box is comfortable at
eight voices". A manual does say what a box is *for*: Metropolix's opens by calling it a musical
sequencer, and that sentence is the whole basis of one of the library's two `preferredSource: true`
claims (§7.4). The other is the Tracker Mini's, cited to the sentence calling it "a perfect fit for
the centre piece of a setup" — and the two pages that *look* like that evidence and are not are
recorded in the manifest beside it, which is the map earning its keep. The states past `Verified`
are the half that was missing, and they are worth more here than the
citation — the Model 2400 held the claim for two commits on a manual proving the desk can
generate clock and cannot receive it, a capability rather than a job, and when the claim came out
there was nowhere to say the manual had been read and had not answered. That is finished work,
and it read as silence. The path is accepted whether or not the field is declared, exactly as
`features.*` is and for the same reason: omitting `preferredSource` is what most manifests do,
and it is the omission that wants accounting for. **A `canSendClock` page is not evidence here** —
it proves the capability, and this field exists precisely because a capability is not a job.

**The limit #80 found here is what #120 repaired.** `unknown` was defined as "the document was read
and does not state the fact", and the library used it for two findings that are not the same: the
Deluge's guidebook never says what the box is for, while the Cascadia's says plainly what it is for
and it is not this. The stronger result was recorded in the weaker state, because the obvious
alternative was worse — a plain `Cite` on this path reads as evidence *for* a field that is absent,
and would make a non-claim count and render identically to a claim. `cited-against` is that
citation hung off its own state instead, so the page is visible and the count stays apart. The
worry about inventing a state for a single device stands and was answered by waiting: two states
arrived together, both from real data, and the second one — `unread` — is the normal state of every
box whose manual nobody here can open.

**What a reader sees of all this** (#121). Storing evidence and auditing it is not the same as
showing it, and the gap between the two was wide enough to be worth a rule.

- **The device page names the facts, not only the count.** Its `Provenance` section reported
  *how many* facts were unchecked, unstated, unread or cited against, and never *which* — so a
  reader learned that three facts on this box are unstated and could not tell whether one of them
  is the clock topology they are about to rely on. The paths are printed verbatim
  (`clock.preferredSource`), grouped by state, in the manifest's own vocabulary: a friendlier
  rewrite would be the page inventing a second name for a field that already has one. The
  *reasons* stay off this page — each is a paragraph, and four stacked is #35's failure moved to
  a new surface — and reach a reader in the guide, once, where the fact is being acted on.
- **The states are drawn apart.** #120 added `unread` and `cited-against` and deliberately left
  them wearing `undocumented`'s ink, because inventing an identity for them there would have been
  a rendering decision made by a type error. They have their own now: `cited-against` is drawn
  solid and struck through, in `.prov-cited`'s family because it is the only non-claim with a
  page, and `unread` is the dimmest of the five because it is the only one where nobody has read
  anything and the block is a missing *file*.
- **The counted states are all spoken.** The page's capability sentence counted five states and
  named three, so a box with three `unread` facts reported "0 of 5 cited" and accounted for two of
  the five. A report whose numbers do not add up is worse than no report.

**`content` is the first field whose *absence* is a rendered state** (#111). §3's `sourceAudio`
answers "what audio does this recipe play" in prose, which is right for a box whose content is
genuinely the reader's and wrong for one that ships a named library — and nothing in the model
decided which case a box was in, so a recipe on a box nobody here owns asserted *bring your own*
on no evidence. That is #101's own failure mode one level up, except the hole is in **our
knowledge** rather than in the rig, and it is the default for every device the #57 backlog adds.

```ts
content?:
  | { kind: 'enumerable'; library: string }    // 'the GEN generator list' — a printed list
  | { kind: 'shipped-library'; library: string; location: string; reason: string }
  | { kind: 'user-supplied' }                  // the box ships nothing usable for these parts
```

- **enumerable** is the TR-1000's `GEN` shape one level out: a document **prints the names**, the
  list is the legality claim and carries the page, and the choice within it is taste and stays
  uncited (§3.2). `library` names the list so a guide can point at it once per device rather than
  describe it once per part. A recipe on such a box **may not carry `sourceAudio`** — see the
  guard below.
- **shipped-library** is the box arriving with factory content that **no document enumerates**. A
  page establishes the content and says where it lives; no page anywhere prints the filenames.
  `library` is what a reader recognises, `location` is where they go on the box, and `reason` says
  why a recipe here still describes its audio in prose. All five sampling devices are this.
- **user-supplied** is a positive claim and no device in the library has earned it:
  `DeviceSchema` requires a `manual` or `observed` citation at `content`, and establishing that a
  box ships *nothing* usable means proving an absence. Declaring any of the three on `false`,
  `unknown`, `unread` or `cited-against` fails the build — those four support an *absence* — and so
  does a citation at `content` with no declaration behind it, which is the Cascadia's lesson in the
  other direction.
- **unknown is not a fourth `kind`, because it is a reading rather than a declaration.** It lives
  in `capabilityEvidence` at `content` as one of #120's three reasoned states — which is why #111
  waited on #22 rather than inventing a second provenance mechanism beside it. **The three are
  not interchangeable here and the first passes got each of them wrong in turn**, so the bar for
  each is worth stating:
  - `unknown` — the documents were opened and the reading ran out.
  - `unread` — a **specific named document** needed to answer cannot be opened. "Documented
    somewhere outside this book" names no document and is not this state; it is a reading that
    stopped.
  - `cited-against` — the document answers **no** to the claim the field would make, as the
    Cascadia's does about leading a rig. A manual saying the box ships fifty factory packs answers
    *yes*; that is a `shipped-library` declaration, not this and not `unknown`.

  None of the three is a place to put a box whose library is established. A finished reading that
  found a library belongs in the declaration, and the three states are for what is left over.

**`enumerable` and `shipped-library` promise different things, and `DeviceSchema` keeps them
apart.** A declaration of `enumerable` beside any recipe carrying `sourceAudio` fails the build,
reported at the recipe: prose describing audio is exactly what referencing an entry replaces, so a
box doing both is a shipped library wearing the wrong name. This is not a hypothetical rule. All
five sampling devices were declared `enumerable` for four commits while every recipe on them
described its audio in prose — the declaration promising a reader entries they could look up, the
parts below handing them a description — and nothing caught it, because both halves are
individually well-formed. The pair is checkable and nothing else is. `shipped-library` deliberately
carries no such rule: no document lists its entries, so prose is the only honest thing a recipe
there can say, and `reason` is where the manifest says so to the reader.

**A box a recipe loads audio onto cannot stay silent, and that requirement is the whole of #111.**
Representing unknown as the *absence* of a field left the state sayable but not required, so a
manifest could still reach a reader with a `sourceAudio.need` and nothing behind it — which is the
confident *bring your own* on no evidence that the field was added to end. So `DeviceSchema`
demands an entry at `content` from any device with a `sourceAudio` recipe, and refuses `false`
there: `false` is a real state everywhere else, where the field beside it is a claim somebody made,
but an entry here exists only to say something about a declaration that is absent, and one with no
reason is §2.6's shrug wearing a field name. Every unknown that reaches a reader therefore carries
a reason somebody wrote. Silence stays available, and is the ordinary case, for a box whose voices
generate their own sound: it was never asked, so it owes nothing.

The schema asks of the device's **authored** recipes, because a schema cannot see a guide; the
renderer asks the narrower question about the parts a reader was actually given. So an unused
sample recipe obliges the manifest and still prints nothing on a page that did not assign it.

`contentNotice(device, recipes)` decides which state a guide is looking at, once, for both
renderers (#33 — the decision is shared, the sentences are each renderer's own), and §8 phase 6
prints it **once per device, above that device's parts**. The unsettled state prints one sentence
per *finding* rather than one over all of them: "nobody here has checked" is true of an uncited
fixture and a lie about a box somebody read and could not finish reading. Its one silence is a device
no assigned part loads anything onto, and that silence does not depend on the manifest: a box that declares a
whole library still says nothing in a guide that asked nothing of it. The unknown sentence sits on
the box rather than on the part because `Source — <need>` is true — it says what the part needs —
and what was never true is what a reader inferred from it in the silence above.

**What the pass over the library found.** Five devices author `sourceAudio` recipes; all five ship
a library nobody has listed, and all five declare `shipped-library`:

| device | library | where a reader looks | what was read |
|---|---|---|---|
| Digitakt II | a wide array of factory samples | the write-protected FACTORY directory on the +Drive | p.70 §13.6 — the +Drive opens on FACTORY and INCOMING, "a wide array of factory samples are available in the write protected FACTORY directory"; p.84, they cannot be erased |
| Tracker Mini | 50 factory genre-based sample packs | `/Samples/FactoryPacks` on the microSD card | p.34's microSD card structure — "Tracker Mini comes with 50 factory genre-based packs installed onto the microSD card" |
| MC-101 | preset tones and drum kits, and the SD card's audio data | the Sound Browser, and WAVE FILE for a sample on the card | Owner's p.7 — the included card "contains various data (settings, sounds, samples, etc.)"; p.8's overview draws Preset Drum Kit/Tone beside SD Card Audio Data; Reference p.20's Sound Browser |
| TR-8S | preset samples supplied in the box | the SAMPLE screen, preset entries marked `P` | Reference p.38's screen legend — "P Preset: Samples originally in the TR-8S", example `Prog.Trance Bass`; p.39, preset samples cannot be deleted |
| Deluge | a factory library on the supplied SD card | `SAMPLES/ARTISTS` and `SAMPLES/DRUMS` | printed p.12 §2.1 Factory Library — "supplied with a formatted SD card loaded with the factory library"; the File Structure drawing annotates both folders as supplied samples, against `CLIPS`, `RECORD` and `RESAMPLE` marked user files or initially empty |

**A shipped library is neither `unknown` nor `enumerable`, and this pass made both mistakes** —
first `unread`, then `unknown`, then `enumerable`, each of which looked like diligence. The reading
did not run out on any of the five: it answered, and a reader can open and browse what it found.
What no *document* does is print the filenames, which is a limit on the manual rather than on what
is established about the box — and promising a list to compensate is the same error facing the
other way.

**So the guide must never print "Not established" over a box with a library, and must never print
the printed-list sentence over one either.** Both are asserted as the rendered strings in both
renderers rather than only as states — a state test would pass against a renderer printing the
wrong sentence, and the sentence is the whole of what a reader standing at the machine gets.
`test/device-content.test.ts` runs it against the **real manifests**, because a fixture cannot
catch a device folder regressing to the careful-looking answer.

The set of boxes it checks is **derived from the manifests, not hand-listed**: a literal list covers
the devices somebody remembered, and it is the wrong list the moment a sixth box declares a library.
A device can declare one without authoring a single `sourceAudio` recipe, so the source-audio
enumeration would not catch it either. The declarations expected today are asserted separately, so a
new one is loud in review rather than silently absorbed, and the render assertions run over the
subset whose parts actually load audio, since a box whose recipes never reach its library correctly
prints nothing.

A negative like that needs a control, or it would pass just as well against a renderer that had
lost the sentence entirely — and **the control is a fixture, deliberately, not a real device.**
Pointing it at the Deluge, the last box still unknown, made it a test that fails the day somebody
*settles* the Deluge: a control that punishes the work it is watching, which is how a test stops
being read. What is controlled for is a property of the renderer, so it is asserted against a
manifest the test file owns and holds in that state on purpose.

`library` is therefore named as a reader finds it **on the box** — a directory, a folder and a
count, a browser, a screen icon — and `location` is the place they go, which is the half no
`Source` line could ever carry. The `enumerable` branch of both renderers is unreachable for a
valid manifest today: the notice prints only where an assigned part loads audio, and that is
exactly what an enumerable box may not have, so the TR-1000's `GEN` list is named by each recipe's
own cited enum instead. The branch stays because the state is real in the model.

**The library still has no `user-supplied` device**, which is itself a finding: #111 named the
Tracker Mini as the one genuinely user-supplied box, and it ships fifty packs.

**Four of these five facts live where `pdftotext` cannot reach them**, which is why CLAUDE.md's
rendering rule is load-bearing rather than fussy. #111 concluded the Mini was user-supplied from
that manual, having found every `.wav` in it to be an export filename and "Sample packs located in
sub-folders" to be about organising your own content — and the FactoryPacks annotation sits one
line below that sentence, inside the drawing. The TR-8S is the same trap: its sample chapter reads
as being about the reader's own files end to end, and the sentence that says otherwise is a legend
beside a screen shot. The MC-101's p.8 is a third diagram, and the Deluge's p.12 file structure is
a fourth — the folder names extract, the annotations that give them meaning do not, and this box
stayed `unknown` on a search of a guidebook that answers on that page. Every page named above was
rendered and read.

### 2.7 How a box expresses note duration

A second device fact in the same shape, and it exists because §8's Hook phase had none. `hookLines`
consulted `recipe.realisation` and whether the part was stacked — both properties of the **recipe**
— and asked nothing about the **device**, because the model had nothing to ask. #142 reported that
absence three times over without naming it once:

- `len 128` collided with the Tracker Mini's cited `LENGTH 640 ms` in phase 6, for the same part.
  The one that looked like a parameter was not, and the one that was measured something else.
- `len` described a field the Tracker Mini does not have. Its pattern rows are note, instrument,
  volume and two FX slots; a note runs until the next note on the track. What the guide printed as
  an instruction was a consequence of where the *next* note sat.
- `len 128` is eight bars, printed as arithmetic for somebody standing at a rack with their hands
  busy — while the same line already converted the *position* into bars.

So `Device.noteDuration` says how the box in front of the reader ends a note, cited at
`noteDuration` in `capabilityEvidence` like every other capability fact (§2.6). Five kinds:

| kind | the gesture | in the library |
|---|---|---|
| `per-note-value` | a length carried on each note — `control` names what sets it, `unit` only where a manual states one | Digitakt II `LEN`, MC-101 `LEN`, Mother-32 and Crave `GATE LENGTH`, the Deluge's start pad + end pad |
| `tied-steps` | one step per note; `control` is the tie that joins it to the next | Grandmother, Matriarch, Subsequent 37 — all `TIE` |
| `until-next` | no length field; the next note ends this one, or `noteOff` does | Tracker Mini, `OFF` |
| `gate` | a gate held from somewhere that is not the pattern | Cascadia |
| `trigger` | a step fires the sound and its own envelope is the length | TR-1000, TR-8S, DFAM |

**The fifth state is the absence of the field**, exactly as `content` does it and for the same
reason: a claim of not-knowing is still a field somebody has to remember to write. The *reason*
lives in `capabilityEvidence` as one of #120's three reasoned states — the minilogue xd is `unread`,
because its manual is not in `manuals/` at all.

**A box a guide can ask to play something has to have been asked.** `DeviceSchema` demands an entry
from any device with a recipe, and refuses `false` there — the `sourceAudio` rule of §2.6 in another
key. *Any* recipe is the trigger rather than a tonal one: a schema cannot see a guide, so it cannot
know which parts get hooks, and #100 found that `texture` and `bass-mid` both carry one while
neither is `tonal`. A box with no recipes carries no part and owes nothing, which is the mixers and
the ZOIA.

`noteDurationNotice(device)` decides the state once for both renderers (#33), and
`printsNoteDuration` answers the one question they both ask of it: **does a duration printed beside
a note tell this reader to do anything?** It does under `per-note-value`, `tied-steps` and `gate` —
and under the unsettled state too, which looks wrong and is not: a duration is a musical fact about
the hook (§4.1), true whatever plays it, and withholding it over a gap in *our* knowledge would drop
authored content. What is withheld there is the claim about the box. It does not under `until-next`
or `trigger`, where a number would be a value to enter into a field that does not exist.

`until-next` renders the same fact as the gesture instead: a note whose sustain ends before the next
note starts gets a note-off row at the step it ends on, **interleaved with the notes in the order
they are typed in**, because on a tracker a note-off is entered exactly the way a note is. A note
running to or past the end of the pattern gets none — there is no step to put it on, and the
pattern ending is what stops it. Drone Study on a Tracker Mini therefore reads as three notes at
steps 1, 129 and 193 and nothing between them, which is the instruction, where before it read as a
description of a score.

**`HookNote.len` is sustain**, in sixteenth steps from the note's own step, and §4.1 says so.
It is not distance-to-the-next-note and not a gate percentage; the three would each imply a
different rendering, and the field being undefined is plausibly how all of this accumulated on it.

**The unit decomposes and never divides.** `128 steps (8 bars)`, `24 steps (1 bar 8 steps)`,
`6 steps` — steps first because that is the number a step field takes and the unit the position on
the same line is counted in, bars in brackets because past about a bar a step count stops meaning
anything. Under a bar there is no gloss at all. No length becomes `0.375 bars`.

The word is **`sounds for`**, not `len`. The collision #142 reported is not hypothetical: `LENGTH`,
`HOLD` and `SUSTAIN` are all cited parameter names in the library today, so the hook may borrow
none of them.

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
    // Like a param and like a patch entry, an articulation may carry its own citation.
    { slot: 'last-hit', set: { cycle: 2 }, hint: 'apply-cycle', verified: { /* Cite */ } },
  ],
  routing: 'Keep out of the analog FX path so the panel FILTER acts only on LT',

  // Default citation only. It is *inherited* by any param, patch entry or articulation entry
  // that does not carry its own `verified` (§3.1) — and all three of those really do carry one;
  // the two entry kinds did not until #49, which made this sentence false of two of the three
  // things it names. It is not itself a provenance state: the recipe is not the thing rendered,
  // individual values are. `false` here means everything that does not override it is
  // provisional.
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
- **`sourceAudio` says what audio the recipe plays, when the voice does not make its own.** A
  generator-based recipe answers that in a parameter — the TR-1000 has an internal generator
  selector, so `GEN 9X Bass Drum` is an enum with an options list and a manual page behind it. A
  sampler's equivalent is a file on an SD card: no controlled vocabulary, no field in the manifest
  schema, no page that says which recording suits a dark kick. So there was nowhere for the
  question to live, every parameter that *did* exist resolved, and `tm-texture-soft` set a play
  mode, a filter, a grain length, a cutoff, a reverb send and an attack without ever naming what
  was being granulated (#101). It carries two claims and keeps them apart:

  ```ts
  sourceAudio: {
    // What to load, in terms a reader can search their own library by. Taste, never cited —
    // no page states it, which is the same reason no *point* on a sample recipe is cited.
    need: 'A sustained tonal source, two seconds or longer — a held synth note, a field ' +
          'recording, a feedback loop. Pitch matters; transients do not',
    // A documented way to obtain or prepare it, when the manual prints one. `verified` is
    // required here, as on a `JackSpec`: a procedure has a page or nobody checked it.
    prep: { text: 'Manual p.104, Rendering Tracks To Audio Chords: ...', verified: cite(104) },
    hint: 'load-sample',   // a key into this device's `hints` table, checked like an articulation's
  }
  ```

  It is the same `range`/`value` and `options`/`value` split (§3.1, §3.2) arriving at a third
  shape, and it dissolves a real tension: the Tracker Mini's chord recipes carried p.104's
  procedure as the `verified` of a `text` param's *point*, because a text param has no legality
  gate and that was the only slot the shape offered — which badged the reader's choice of sample
  with the manual's page. The page now sits on the procedure, where it is true.

  **`need` is prose and stays prose.** A closed vocabulary of source kinds would be a fifth shared
  vocabulary (invariant 3) built out of the one thing we cannot enumerate — other people's sample
  libraries — and it would be the wrong shape anyway: what a reader needs is a phrase they can
  search their own folders with, not a category we invented. It names no device and no genre, and
  travels device → renderer exactly as `routing` and `note` do.

  **Whether a recipe needs one is an authoring rule, not a schema rule.** Nothing in the manifest
  says whether a voice plays a file or generates its own sound, and a pool id is not the answer —
  three of the Tracker Mini's synth recipes sit on `track-sample`, because tracks 1-8 host synths
  as readily as tracks 9-16. So each device folder states the rule in its own terms (the Tracker
  Mini keys on `PLAY MODE`, a sample-instrument parameter; the Digitakt II has no synth engine at
  all and so declares one on every recipe) and its own test enforces it, exactly as the Tracker
  Mini's three-synth-slot cap is enforced.
- A recipe never authors hits, step counts or bar structure. If you catch yourself writing
  `hits: [1, 5, 9, 13]` inside a device folder, that pattern belongs to a template (§4.3) —
  four-on-the-floor is a property of the genre, not of the TR-1000.
- Articulation addresses `PatternSlot`s, never absolute step numbers. `{ step: 13 }` is only
  correct for a 16-step pattern that happens to have a hit at 13; `{ slot: 'last-hit' }` survives
  every variant the density bands can select.
- **An articulation slot no selectable variant emits is dead authoring, and it is checked** (#108).
  Addressing by slot survives every variant; it does not guarantee that any variant *contains* the
  slot. `tm-texture-soft` authored `{ slot: 'first-hit', set: { 'low-pass': 55 } }` and the only
  direction requesting `texture` emits `downbeat`, `offbeat` and `accent` — so the entry was dead
  from the day it was written, and nothing failed, because §7 step 8 correctly drops a slot with no
  hits rather than inventing one for it. That silence is why the mistake is invisible, and the
  systemic cause was narrow: `first-hit` and `last-hit` are emitted by exactly one direction, for
  exactly one role each, and nine of the first fourteen findings were a device reaching for one of
  those two on some other role.

  The check lives in `lib/core/reachability.ts`, because reachability belongs to **neither layer**:
  a device cannot see it without naming a template (invariant 3) and a template cannot see it at
  all, so it can only be asked from outside both, by something handed both. It walks the resolver's
  own `selectPatterns` at each of §12.2's three density detents rather than restating band
  fallback, so it moves automatically if that policy does. "Reachable" therefore means *selected* —
  `selectPattern` takes `candidates[0]`, so a variant that is never first at its band contributes
  nothing, which is the whole difference between this and grepping a template for slot names.

  It separates three facts and only one of them is a device-folder bug:

  | finding | what it means | whose fix |
  |---|---|---|
  | dead slot | the role is patterned and the authored slot is not among what it emits | the device folder |
  | unpatterned role | the role is requested and no direction authors a variant for it | nobody's yet |
  | unrequested recipe | no direction asks for the role at all | a template (#81) |

  The middle one is why an empty reachable set is never a finding: there is no variant for a slot
  to be missing from, and Ambient Dub's `texture` says why a direction may honestly decline to
  author one. It produces an asymmetry worth stating rather than smoothing over — the Tracker
  Mini's chord `pad` keeps a `first-hit` entry while its chord `stab` lost one, because `stab` is
  patterned and `pad` is not. Deleting the `pad`'s would destroy authoring on the strength of a
  template nobody has written.

  Two fixes are legitimate and a third is not. Removing the gesture is always honest. Moving it to
  a reachable slot is honest when the musical claim survives the move — a flam on the hit the
  variant leans on is the same gesture as a flam on the entry, where a flam on every backbeat is a
  different part — and the TR-8S's `flam` and the Tracker Mini's `reverse-sample` moved for that
  reason, each being the library's only user of a declared per-step lane. **Adding the slot to a
  template to make the recipe right is not a fix**: a device folder does not get to author rhythm,
  which is what §4.3 already says.
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
- **What one setting of it covers, when the answer is not "this part"** (`scope`, #107). A recipe
  is authored per voice, so every parameter in it reads as per-voice, and most are. The Tracker
  Mini's `SWING` and the TR-1000's Pattern Shuffle are authored pattern-wide; the Deluge's `SWING`
  is authored `song-wide, not per clip`. Absent means per-part and stays unannotated; present lets
  §8 phase 6 state it once per device. `pattern` and `song` are kept apart because they are
  different claims, each taken from the scope its own device already committed to in that
  parameter's `note` — the vocabulary carries those claims and adds no reading to them. The
  MC-101's `SHUFFLE` has neither value: its note claims a scope against *steps* rather than
  against parts, and that manifest gives the box three separate tone tracks, so two parts on it
  can genuinely carry two settings. It is not a fifth shared vocabulary (invariant 3): nothing in
  a template names it and nothing joins on it, so it travels device → renderer exactly as `unit`
  and `note` do.

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
type ParamScope = 'pattern' | 'song'   // omitted → per-part, the ordinary case (#107)

type AuthoredParam =
  | { kind: 'numeric'; name: string; value: number; range: NumericRange
      step?: number; unit?: string
      mood?: { axis: MoodAxis; amount: number }[]
      verified?: Verified            // the *point value*; omitted → inherit the recipe's
      hint?: string; note?: string; scope?: ParamScope }
  | { kind: 'enum'; name: string; value: string; options: EnumOptions
      verified?: Verified            // the *selected option*; omitted → inherit the recipe's
      hint?: string; note?: string; scope?: ParamScope }
  | { kind: 'text'; name: string; value: string
      verified?: Verified; hint?: string; note?: string; scope?: ParamScope }
```

**`text` is for a setting whose scale the manual declines to print**, and that is the whole of it
(#102). The Tracker Mini's granular `Position` has a Range column reading *"Variable"* — the scale
is the loaded sample's own length — and the LFO's `Amount` is printed with no range at all. Neither
can be a numeric without inventing bounds (invariant 5), and neither is an enum, because there is
no option set to be legal against. So they are `text`, and the absence of a legality gate is not a
loophole for citing the point: nobody checked the value, so `verified` is `false` and the guide
renders it provisional. A page belongs on a text point only where the manual really does print the
procedure the value states — and after `sourceAudio` took the one such case (§3, above), no device
does that today.

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
  scope?: ParamScope            // carried, never computed — the box's claim, not the resolver's
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

**A cable carries three claims, and they are not the same kind of claim:**

```
the `from` jack exists          documented — one page
the `to` jack exists            documented — one page
connecting them is right        taste
```

That is exactly the shape of a numeric param — `range` cited, point authored by ear (§3.1) — and
exactly the shape of the enum repair — `options` cited, selection taste (§3.2). Three unrelated
device kinds have now pushed on the same assumption, so the assumption is what was wrong.

**A jack existing is a fact about the device, not about the cable.** So the device declares its
patch points, cited once each, and a recipe references them by name:

```ts
// on the Device
jacks?: {
  id: string                   // section-qualified: 'VCO A · FM 1'
  direction: 'in' | 'out'
  signal: JackSignalKind[]     // what a cable in this socket carries. Required.
  clock?: ClockTransport[]     // §10: this is the socket clock uses, over these transports
  note?: string                // the page describing this jack lives at `jacks[<id>]` — §2.6
}[]

// on the Recipe
patch?: {
  from: string                 // a declared jack id, direction 'out'
  to: string                   // a declared jack id, direction 'in'
  note?: string                // which normal this replaces, or that there was none to replace
  verified?: Verified          // whether *this connection* is the right choice. §3.1 inheritance.
}[]
```

The alternative — three `verified` fields on the entry — was rejected: it copies one jack's
citation onto every cable that touches it (twenty-seven cables restating a handful of pages) and
makes each cable responsible for facts that belong to the box.

**Zod refuses a patch entry naming a jack the device does not declare**, and refuses a cable that
leaves an input or arrives at an output. This is the same check, at the same level and for the
same reason, as an articulation's `set` keys against `features.perStep`: the capability belongs to
the device, the recipe only references it, and a mistake fails the build rather than a request
(§9). Before it existed, a typo in a jack name rendered happily and sent a reader hunting for a
socket that is not on the box. Jack ids are unique within a device, as voice ids are.

**Ids are section-qualified because panels reuse names.** `IN` is silkscreened in five sections of
one panel in the seed set; `PITCH`, `SYNC`, `LEVEL`, `TRIG` and `FM 1` all repeat. A bare `IN`
is unresolvable standing at the machine.

**What a patch entry's own `verified` claims is now exactly one thing: that this connection is the
right choice.** Not that the jacks exist — their declarations say that. So a cable somebody
patched because it sounded good is `false` and renders provisional, which is the honest answer;
a cable the manual itself instructs — "Patch the ENV B output jack to the S&H section's TRIG
input jack" — carries the page that instructs it. Inheritance is §3.1's, unchanged: omitted
inherits the recipe's, a citation overrides it, an explicit `false` overrides an inherited one.

**`clock` is what stopped §10 inventing silkscreen** (#103). The rack drew `CLK OUT` and `CLK IN`
on every panel, derived from `canSendClock` and `canReceiveClock`. Those two booleans say a box
can sync; nothing in them says what is written beside the hole, and on the two boxes whose manuals
are in `manuals/` the derived answer was wrong both times — a Tracker Mini's bottom edge reads
`Line In / Line Out / MIDI In / MIDI Out` and has no clock jack at all, and a TR-1000 has a
`CLK OUT` but no clock input jack of any name (its minijack clock input is `TRG IN`, and only once
the project parameter `Trig In` is set to `Sync`). A renderer answering a question the data cannot
answer is invariant 5's fault in a new place.

So a jack says it carries clock, and the rack labels the socket from the jack's own id and its own
citation. **Keyed by transport, because the socket moves with it**: the TR-1000 takes clock at
`MIDI IN` over `midi-din` and at `TRG IN` over `analog-clock`, so a single socket per box would be
wrong for every rig that resolved the other. It is a *list* per jack for the mirror case — one
hole speaking two protocols, as `TRG IN` does — while two jacks claiming one transport in one
direction is refused, because that would leave the renderer choosing which socket a reader should
patch. A device that declares none gets a socket with no label, which is the honest rendering of
"this box syncs, and nobody has read its rear panel yet" — true of twelve of the fourteen.

**`signal` is the semantic cable vocabulary; `clock` stays the clock transport selector.** They
sit next to each other and answer different questions, and the split is the point:

```
signal   what is in the cable          audio, cv, pitch-cv, gate, trigger, clock, midi
clock    which wire protocol carries   'midi-din', 'din-sync', 'analog-clock', 'usb', …
```

`signal: ['clock']` says a reader plugging in here is carrying tempo. `clock: ['midi-din']` says
*over MIDI DIN*, which is what selects a socket once a rig has resolved a transport — the whole
point of #103, since the TR-1000 takes clock at `MIDI IN` over `midi-din` and at `TRG IN` over
`analog-clock`. Folding the two together would either lose the transport, putting the cable in the
wrong hole on every box that syncs two ways, or push transports into the semantic vocabulary and
reopen it. So both stay, and the schema checks the one implication that must hold: **a jack with
`clock` carries `clock` in `signal`**, because a manifest telling the rack a socket takes tempo
while telling a signal-aware consumer it does not is worse than either answer alone. The converse
is deliberately unchecked — a socket can be read as a clock output while the transport question is
still open, which is the Cascadia's `MIDI / CV · MIDI CLK` today.

**`JackSignalKind` is closed where `ClockTransport` is open, and that is not an inconsistency.** A
transport is engineering a manufacturer can invent, so a closed union guessed here would reject a
legal manifest. What a cable *means* is not like that: `audio`, `cv`, `gate`, `trigger`, `clock`,
`pitch-cv` and `midi` are the vocabulary the manuals themselves use, and a socket outside them is
a signal nobody could describe to a reader standing at the machine. If one turns up, adding a member is the
honest change, and the compiler names every place that has to think about it — which an open
`string` would have hidden.

The members are meant to be **disjoint**, so a list means "this hole really does carry two
different things" and never "the author could not choose". `gate`, `trigger` and `clock` are one
waveform electrically and three different things to the reader, and which of the three is beside
the hole is the entire question when somebody is deciding what to patch. The real plural cases
earn it: a DC-coupled input the manual itself offers for audio-rate modulation is `['cv', 'audio']`
(the Cascadia's ring modulator inputs, in its own words on p.68), a socket whose meaning a setting
chooses is `['clock', 'trigger']` (the TR-1000's `TRG IN`, where p.32's `Trig In` decides), and a
passive multiple whose manual says "any signal entered here" carries all five analog kinds and not
`midi` (the Crave's `MULTIPLE`).

**`pitch-cv` is separate from `cv`, and a pitch jack does not also carry `cv`.** Electrically they
are one thing, and this vocabulary is not electrical. What decides it is a consumer matching an
output's kinds against an input's: with a single `cv` member, an LFO output and a 1V/oct pitch
input share it, so the LFO reads as a legal thing to plug into the note socket — invariant 5's
failure in its usual shape, a plausible answer to a question the data could not answer, and worse
than the authoring cost of the split because the reader is *told* to make the patch.

The rule for authoring the split is **what the voltage means, not how it is scaled**: `pitch-cv` is
the socket a note's pitch enters or leaves by. `VCF · FM 2` on the Cascadia is the jack that tests
it — p.49 says it "accepts 1 V/oct signals" and is "ideal for tracking keyboards", and it stays
`cv`, because what arrives there is a filter cutoff however it is scaled. 1V/oct is evidence for
`pitch-cv`, not the definition of it.

**A consumer matching these must not use raw set overlap.** Disjointness fixes the false positive
above and creates the mirror false negative: a keyboard CV output is `['pitch-cv']`, a filter FM
input is `['cv']`, and patching the first into the second is a real and useful cable that no longer
shares a member. Pitch is usable wherever plain control voltage is wanted; the reverse is what must
be refused. So routing wants a **compatibility relation** — `pitch-cv` accepted by `cv`, one way —
and not an intersection. Building it on intersection would trade this section's false positives for
false negatives and look correct while doing it. The type system cannot enforce that; this
paragraph is the place it is written down.

**Required, for the reason `direction` is required.** It is a property of the hole that the page
describing the hole already states, so it costs one word beside a citation the manifest was
writing anyway — and every consumer that does not have it has to guess. §10 is the standing
lesson: the rack derived `CLK OUT` and `CLK IN` from two booleans and was wrong on both boxes
whose manuals could check it. "Is this an audio hole or a CV hole" is that same question one field
earlier. It is not separately cited, again like `direction`: the jack's one entry at `jacks[<id>]`
(§2.6) is the page that says this socket exists and what it does, and those are not two pages. So
a jack whose signal an author cannot settle from that page must not be declared with a guess here
— a wrong `audio` reads exactly like a read manual.

**This is not a fifth shared vocabulary** (invariant 3). That invariant is about the join between
templates and devices: templates never name a device, devices never name a genre, and the closed
unions that cross that line are `Role`, `Character`, `MoodAxis` and `PatternSlot`. `signal` never
crosses it. No template mentions a jack, a socket or a signal kind; it is device data, read by the
device layer and by §10's rack, on the same side of the contract as `direction` and `polyphony`.

**What reads `signal` today: the voice-control pass** (`routeVoiceControl`, §7). **A rig gets one
voice-control source**, chosen once and allocated outward — not a best source per target. Four
steps: build every box's section-paired output bundles and rank them all together; the winner's
*device* is the rig's source; targets are the *assigned* boxes with a section-paired input bundle,
minus the source; then the source's bundles are allocated to targets in `deviceId` order, one each
and none reused.

**Choosing per target was wrong, and the way it was wrong is instructive.** Two boxes that each
take pitch and gate — a Cascadia and a CRAVE — were proposed as each other's source in the same
result. Every cable was individually true and the pair was a rig nobody builds. Excluding the
chosen source from its own target list is what removes it, and it also states the obvious thing the
per-target shape never did: a box does not patch into itself.

**A bundle is a section's pitch-and-gate pair**, paired on the section its ids are qualified with,
because a note and the gate that sounds it leave a box together or not at all. Pairing on kind
alone gives the cross product: the Metropolix's four track outputs become four pairings, two of
them splicing one track's pitch to the other track's gate. It is also what puts the cable in the
right hole at the other end — `ENVELOPE A · GATE` is a single-purpose gate input on the Cascadia
and sorts *ahead* of `EXT IN · GATE`, so on kind alone a reader would be told to patch the note into
one section and its gate into another. `ENVELOPE A` has no note input, so it forms no bundle. An id
with no separator declares no section and pairs with nothing, which is the honest reading of "ids
are section-qualified" and makes an unqualified fixture form no bundles rather than accidental ones.

**Single-purpose** — exactly one declared kind — is what makes "primary" a definition rather than a
hope, and it is what keeps this pass out of §7.4's way with no special case: a socket carrying clock
as well as gate carries more than one kind, so the one clock cable §7.4 decides is never restated
here. It also matters on real hardware: the Cascadia declares five gate outputs, three of them
`['gate', 'trigger']` end-of-stage pulses, and membership alone would have told somebody to play a
synth from an end-of-attack trigger.

**Ranking** is the resolved clock source, then `clock.preferredSource`, then `deviceId` and the jack
ids by code unit (§7.2) — the first key because the box already driving the rig is the box the
reader is standing at, the second because "my job is to drive a rig" is the same claim whether the
cable carries tempo or notes, and the rest to be deterministic rather than right. The jack keys also
order one box's own sections, so `TRK 1` is allocated before `TRK 2`. Pure: no seed, no mood, no
occupancy, so a reroll re-cables nothing unless it moves a part onto a different box.

Outcomes are explicit rather than inferable from an empty list, because the empty cases mean
different things (§7.3). On the patch: `routed`, `no-compatible-pair` (something takes pitch and
gate and nothing here can drive it — a gap a reader can act on), `no-target` (a rig of grooveboxes,
missing nothing). On a target: `routed`, `no-compatible-source`, and `source-exhausted` — a
Metropolix has two tracks, so a third synth is one track short, and telling somebody nothing can
drive it would send them shopping for the thing they already own. Audio is not in scope: §8 already
says where the outputs go, and `io` rather than `jacks` is what says it.

**A position would hang on a jack declaration**, and that is a second reason to have the list.
§10's rack draws inter-device cables and cannot draw a cable between two jacks on one panel,
because `PanelFeature` has no jack and there are no coordinates to draw between. Nothing here
carries a position and adding one is its own piece of work — but it would extend this list rather
than having to invent it first.

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

**`HookNote.len` is how long the note sounds**, in sixteenth steps counted from its own `step`.
Written down because it was not: `step`, `degree` and `octave` each had a sentence and `len` had a
lower bound, and #142 found three separate defects that had accumulated on the field the guide
prints most prominently. It is **sustain**, and the two things it is not would each imply a
different rendering — not distance-to-the-next-note (a note may stop well before the next one
starts; that is a rest, authored by making `len` short), and not a gate percentage or any device's
own length value. It is musical time, true of the hook whatever plays it, and it names no device:
**how a box takes it is `Device.noteDuration`'s job** (§2.7). A template states the music; the
device states the gesture. Overlap is legal — two notes at one step are a chord, and a `len`
running past the next note's `step` is a line that overlaps itself — and whether the carrying voice
can *play* that is §7.1's question, exactly as range and polyphony are kept out of this layer.

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

**The mapping is many assignables to one request (#40).** Each `(assignable, section)` still holds
exactly one request, which is the half that makes conflict decidable and which has not moved. What
changed is the inverse: one request id may appear under *several* assignable keys, because a chord
can be stacked across several monophonic voices of one pool, one note each (§12.4). The type above
already expressed that — only the invariant read off it was narrower than the shape — so nothing
here is new syntax. What did have to change is every consumer that treated the inverse as a
function:

- **An `Assignment` names `assignables`, plural**, never one voice plus an optional rest. A
  renderer that reads `assignables[0]` and stops has written a visible bug, where one ignoring a
  `stackedWith` field beside a singular `assignable` would have printed one track of three and
  looked finished.
- **`comfortableVoices` counts three of them for a stacked triad**, which is §12.4's rule applied
  rather than excepted.
- **Gap classification, `distinct` (§12.6) and pool symmetry breaking (§7.1)** were each re-read
  against the plural shape. `distinct` compares `deviceId` and a stack is one device, so it needed
  nothing; the other two did.

Order within `assignables` is meaning, not incidental: lowest note to the lowest voice, which is
what §8 phase 4 prints and what keeps a voicing from crossing over as a progression moves.

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

**A direction says whether its variants are a rhythm or a re-articulation map**, on the request:
`reArticulatesHook?: true`. It matters only where the role also has a hook, and it decides what
§8's phase 5 prints for that part.

A hook states steps, lengths and pitches; a variant states steps of its own. #100 read that as one
contradiction and gave the part to its hook everywhere — correctly where the hook carries its own
rhythm, and wrongly where the hook is a *held note* and the variant is the map of where it is
lifted and struck again. On those parts there is one note sounding at any moment, the variant
competes with nothing, and silencing it removed the only rhythmic decision the direction contains.
It also took the density knob with it: the guide then differed between the two ends of the knob
only in the band label §8's arrangement phase prints, with nothing behind it.

**Authored, never derived.** The obvious derivation — compare the hook's note lengths against the
variant's strike gaps — was implemented, measured across the whole library, and rejected: it flips
*within one role of one direction* between two hooks the seed picks freely (Ambient Dub's
`bass-mid`), so which semantics the guide used would depend on a reroll; and it calls Major-Key
Electro's `arp` a held note being re-struck, where that template says its arp hook is "one note per
step, so it lines up with the arp's own variants hit for hit". Whether a part is a held note being
re-articulated is a musical fact about the direction, so the direction states it and the engine
derives nothing.

On the **request** rather than on each `Pattern`: all four bands of a role answer the question the
same way — a role whose band 0 was a map and whose band 3 was a grid would be incoherent — and it
belongs beside `character` and `sustain`, where a part's musical intent already lives. It is
meaningless without both a hook and variants for the role, so `TemplateSchema` requires both; a
flag that changes nothing printed is an author writing a no-op, the same discipline
`sustain`/`sections` and `optional`/`inessential` are held to.

Two requests in the library carry it — Drone Study's `texture` and Weave's `sub`, both of which
argued for it in prose before the field existed — out of the thirteen that have a hook and variants
both. `test/templates.test.ts` records the reading of all thirteen and pins the set exactly, in
both directions: a fourteenth is a musical claim nobody reviewed, and a vanished one takes the
density knob off a part silently.

### 4.4 Priority is ascending, and three claims a request makes separately

`priority: 1` on kick and `priority: 4` on texture means 1 outranks 4, and §7.1's original
"requests ordered by priority descending" plus `MISS[priority]` said the opposite. The template
data is what people author against, so it wins. Everywhere: **requests are ordered by ascending
priority number, most important first**, and one miss at priority 1 is worse than any number of
misses at priority 2 (§7.1). `optional: true` removes a request from the miss objective entirely —
filled if it fits, dropped without complaint if not.

**Three separate claims, each stated by the template itself.** They read alike and they answer
different questions, so deriving any one from another is what #81 was filed about:

| field | the claim | who reads it |
|---|---|---|
| `priority` | how much it costs to miss this, relative to the rest | the objective (§7.1) |
| `optional` | the search need not spend a voice on this | the objective (§7.1) |
| `inessential: { reason }` | the direction is still itself without this part | the guide (§7.3) |

`priority` is the one a reader kept being asked to interpret, and it cannot answer. A low number
is not a claim that the song needs the part and a high one is not a claim that it does not: p4 on
a riser and p4 on a second tom are the same cost and opposite musical statements, so a threshold
drawn over priority reports one of them wrongly whichever way it is drawn. `optional` is closer
and still not it — it is an instruction to the *search*, and a direction may reasonably try hard
for a part it is finished without ("take it if there is room") or insist on one it would survive
losing.

So the third claim is declared explicitly, and it is **reporting only**: `inessential` has no
`Score` key, filters no candidate, and moves no assignment. It changes what §7.3 *says* about an
absence and nothing else. The reason is mandatory rather than a bare flag — the same discipline
§2.6 applies to a capability fact — because "the song does not need this" is a musical judgement,
and an author who will not say why in a producer's words has not made it. The guide prints that
sentence, so a shrug would be visible to somebody standing at a machine.

One implication holds, in one direction: **`optional: true` requires `inessential`**, and the
schema rejects the pair without it. "Dropped without complaint if it does not fit" already
concedes the song survives without the part, so an optional request that will not say so asserts
both halves of a contradiction — and the guide would report its absence as a hole in the reader's
rig, on the authority of a template that knows it is not one. The converse is free: a request may
be inessential and still worth every bit of the search's effort.

---

## 5. Layer 4 — Inspirations

Modifiers, not separate genres. An inspiration patches a template, and this is what makes
"industrial techno with a reggae influence" coherent rather than two genres stapled together.

Settled at build step 7 ([#9](https://github.com/miclip/patchscore/issues/9)), against three real
templates. The example this section used to carry predated the design review and is gone: it gave
an added role request with no `id` and no `sustain`, and a `roles.modify.kick.pattern` that
assumed the obsolete pattern ownership §4.3 moved to templates.

```ts
{
  id: 'reggae',
  name: 'Reggae',
  patch: {
    bpm: { shift: -40 },
    replacePatterns: [ /* Pattern[], keyed by (forRole, band) */ ],
    addRoles:        [ /* RoleRequest[], continuous only */ ],
    addPatterns:     [ /* Pattern[], for a role the template authors none for */ ],
    notes: ['The first beat of the bar stays empty. The kick answers on the third.'],
  },
}
```

### 5.1 An inspiration never names a template

This is invariant 3 one layer up. A template must not name a device; an inspiration must not name
a template. The shared vocabulary is `Role`, `Character`, `MoodAxis` and `PatternSlot`, and an
inspiration speaks that and nothing else — no template id, no section name, no request or pattern
id belonging to anything but itself.

Two rules fall straight out of it, and the schema enforces both:

- **Every id an inspiration authors begins with its own id.** `reggae-kick-b2`, never `it-kick-b2`.
  It cannot collide with a template's ids without claiming to be that template, and a reader can
  see where each part of a guide came from.
- **No `sections`, anywhere.** Section names are authored per template (§4.2), so a pattern scoped
  to sections and a `transient` added request are both untypable here. Added requests are
  `continuous`.

### 5.2 Replacement is keyed on `(role, band)`

**"For the kick role at band 2, play this instead."** Template-agnostic, deterministic, and it
reads as musical intent. It lands on any template with a kick at band 2 and reports itself on one
without.

Keyed on a `Pattern.id` it would read "replace `it-kick-b2`" — which works on exactly one template
and makes every inspiration a per-template patch wearing a general name. That is the same mistake
invariant 3 exists to prevent, one layer up.

Replacement rather than addition, for the kick and the bass, because purely additive is a lottery.
A reggae kick that merely *joins* the pool at `(kick, 2)` is heard or not heard depending on which
id sorts first, and a reroll can change whether the track sounds like reggae at all. §5's claim is
that the combination is coherent, and coherent means reliably audible. So an inspiration that
claims `(kick, 2)` takes it: the template's variants there are removed and its own installed.

Addition stays for what addition is for — a role the template does not request, and patterns for a
role it authors none for.

### 5.3 Conflicts are refused, never resolved

Two inspirations that both claim `(kick, 2)` genuinely collide. Picking a winner by id order would
make the outcome depend on an invisible alphabetical accident, which is the class of thing §7.2's
seeding discipline exists to keep out of this design. The combination is refused, by name:

> Dancehall and Reggae both claim kick at band 0, kick at band 1, kick at band 2, kick at band 3;
> they cannot be combined. Choose one of the two, or a different pair.

Honest, actionable, and it leaves the user a different pair to pick. Same posture as a gap
(invariant 5): say what cannot be done rather than quietly doing something arbitrary. A claim is a
`(role, band)` from either `replacePatterns` or `addPatterns`, or a whole role from `addRoles` —
two inspirations adding variants for the same silent role is the same lottery by another route.

Non-conflicting inspirations compose in canonical id order, which is safe precisely because
nothing about the outcome depends on it. **Cap at two.**

### 5.4 Nothing is silent

A claim the template cannot honour is *reported*, never dropped:

| diagnostic | means |
| --- | --- |
| `no-such-target` | the template authors no such `(role, band)`; the replacement did not apply |
| `role-already-patterned` | the template programs that role itself, so added variants did not apply |
| `role-already-requested` | the template already asks for that part, so it was not added twice |
| `bpm-clamped` | the shift would have gone below `MIN_EFFECTIVE_BPM`, so it was held there |

A toggle that visibly does nothing is the failure §6.3 warns about, and an inspiration that
silently does nothing is the same bug wearing a different hat.

### 5.5 Composition

```ts
applyInspirations(template: Template, inspirations: Inspiration[]): InspirationApplication
```

Pure, and every decision is taken against the **base** template rather than the partially-composed
one — inspirations patch the template, they do not patch each other. That is what makes "compose
in canonical id order" a statement about bookkeeping rather than about outcomes.

It returns an application, not a bare `Template`, because a refusal and a diagnostic are both
things it has to be able to say:

```ts
| { outcome: 'applied';  template: Template; applied: InspirationId[]
    notes: InspirationNote[]; diagnostics: InspirationDiagnostic[] }
| { outcome: 'refused';  reason: 'too-many' | 'duplicate' | 'conflict' | 'invalid-result'
    conflicts: InspirationConflict[]; detail: string }
```

The effective template is validated against `TemplateSchema` before it is returned. §7 resolves
against a `Template`, so composition owes it a legal one — reporting `invalid-result` here keeps
the failure at the layer that caused it.

`notes` are carried out rather than into the template: `Template` is a strict object with nowhere
to put prose, and prose belongs beside the guide, not inside the genre.

**Sequencing note:** inspirations multiply the test surface across every template. Land one
template end-to-end first, then add inspirations against it.

---

## 6. Mood controls

Continuous 0–100 values applied *after* recipe resolution. They apply offsets and character
preferences; they never introduce parameter values of their own.

**All five axes are parameter offsets, `swing` included.** #62 argued that swing could not be
one — that it is a timing transform, and mood moves parameter values — and the hole in that
argument is that a SHUFFLE knob *is* a parameter whose value means timing. The boxes had already
made the abstraction: the TR-1000's pattern `SHUFFLE` (`-100–+100`, Reference p.26), the Tracker
Mini's `SWING` step FX (`25–75%`, p.185), the Deluge's song swing (`1–99`, guidebook p.39). Each
is an ordinary cited numeric declaring the axis, exactly as `TUNE` declares `darkness`, and the
engine needed nothing added. A device with no shuffle control declares no `swing` offset and the
knob does nothing on it — precisely as a device with no drive stage ignores `grit`. That is §6.1
working, not a gap; the Cascadia's manifest says so in as many words, so the silence is a
recorded finding rather than an omission.

| Axis | Effect |
|---|---|
| `darkness` | Biases character toward `dark`; offsets filter cutoff and tuning down |
| `density`  | Leans the section's energy band by at most one (§4.3, §6.3), and offsets probability params. Never edits hits |
| `grit`     | Drive, saturation, bitcrush, sample rate reduction |
| `swing`    | Shuffle, groove and swing amount — a box's own shuffle control, over its printed range |
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
output: { assignments: Assignment[], shortfalls: Shortfall[], guide: GuideDocument }
```

**The resolver takes effective objects, never ids and never patch instructions.** A `Device`
reaching it is the shared definition already composed with the user's rig overlay (#16); a
`Template` reaching it is the base template already composed with its inspiration patches. The
caller does both compositions, so anything that exists only at runtime — a user-authored device, a
row from a database — resolves without a redeploy.

Applying inspirations is therefore a **pre-step performed by the caller**, not a pipeline stage:

```ts
applyInspirations(template: Template, inspirations: Inspiration[]): InspirationApplication  // §5
```

A separate pure function, specified in §5 and built at build step 7. It returns an application
rather than a bare `Template` because a conflicting pair is refused by name and an unhonourable
claim is reported (§5.3, §5.4); a signature that could only return a template would have to
resolve conflicts silently, which is the one thing §5 says it must not do.

§11 put inspirations after a template was proven end to end because they multiply the test surface
across every template, and designing a patch language against zero real templates is the mistake
the review caught in step 1, where shapes settled in the abstract turned out wrong once there was
something concrete to check them against.

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
  stackedChords:  number,         // multi-note requests spread across a pool, one note each (#40)
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

Requests ordered by **ascending** priority (§4.4), DFS with branch-and-bound, node cap 150,000
(`DEFAULT_NODE_CAP`, and the constant carries its own history — it was ~50k for the first three
devices). If the cap is hit, fall back to the greedy result **and log it** — no silent truncation.

**Bounding is per key, and one key is not monotone.** Branch-and-bound needs a lower bound on the
final score of a partial assignment. Misses, crowding, recipe distance and role fit only grow as
the assignment extends, so the partial value bounds them. `idleDevices` *shrinks*, so the current
idle count is not a lower bound and using it prunes the optimum. Worth a dedicated test with a rig
whose best answer looks bad halfway down the tree.

**`idleDevices` has an admissible floor**, built from two facts, and **the second one is what
makes it bite**:

- A device that no remaining unassigned request could legally reach is idle now and can never
  stop being idle.
- **A request activates at most one device.** Each remaining request takes one candidate or takes
  the miss branch, so at most `min(reachableIdle, remainingRequests)` of the currently-idle
  devices can still be woken.

So the floor is `currentIdle - min(reachableIdle, remainingRequests)`, equivalently
`unreachableIdle + max(0, reachableIdle - remainingRequests)` — the form the code uses, because it
stays in non-negative integers and invariant 6 does not tolerate float summation. Reachability
alone is the special case where the second term is ignored, and on a rig of interchangeable boxes
it degenerates to zero: every box is reachable, so nothing is ever cut on idleness. The
per-request term is the half that prunes there.

The floor ignores occupancy and `distinct`, and is admissible anyway: both can only *stop* a
request from waking a device, never let one request wake two. Ignoring them can leave the bound
loose; it cannot make it exceed the true final idle count. At a leaf `remainingRequests` is zero
and the floor equals the exact idle count, so the bound stays tight where it decides the
incumbent.

**The partial value alone is a weak bound, because it charges nothing for the requests still to
come.** At depth one it has costed one request and is silent about the other eleven, so it only
ever cuts a branch that is *already* worse than the incumbent — which on a rig of nine devices is
almost never. The fix is a **relaxed suffix bound**, precomputed once per search: for each request,
drop occupancy, crowding and `distinct`, and take the cheapest thing it could possibly do. That is
the lexicographic minimum over its static candidate list of `(sampledChords, recipeDistance,
roleFitPenalty)` — or, when the list is empty, a certain miss, charged to `misses` (or
`optionalMisses`). Suffix-sum those per-request minima and add them to the partial value.

Two things make this admissible:

- Dropping occupancy, crowding and `distinct` can only *widen* a request's option set, so the
  per-request minimum can only fall. A request never prefers the miss branch here, because missing
  costs a whole point on a key that outranks everything a candidate can charge.
- Summing lexicographic minima bounds the lexicographic sum, because lexicographic order on
  non-negative integer vectors is compatible with addition: if `a ≤lex b` and `c ≤lex d` then
  `a + c ≤lex b + d`. Independent per-key minima would also be admissible — componentwise `≤`
  implies lexicographic `≤` — but weaker, because they let several candidates each donate their
  best key to a hybrid that no candidate offers.

`crowdOverflow` is left at its partial value: it is the one additive key whose per-request cost
depends on where the *other* requests land, so there is no per-request minimum to sum. It sits
between the miss keys and the rest of the vector, and mixing it in is still safe — a lower bound
only needs `B ≤lex S` for every completion `S`, the additive keys satisfy that in their own order
by the argument above, and `crowdOverflow` and `idleDevices` are each independently below their
final value, so wherever the comparison stops it stops in the bound's favour or moves on.

**What it was worth.** Measured on the nine-device registry, every knob centred:

| rig / template | before | after |
| --- | --- | --- |
| full rig, `industrial-techno`, seed 18 | 50,000 — **capped, greedy** | 33,142 — exhaustive |
| `industrial-techno`, worst of eight seeds | 382,837 (lifted cap) | 41,259 — exhaustive |
| `ambient-dub`, worst of eight seeds | 71,332 (lifted cap) | 137 — exhaustive |
| `major-key-electro`, worst of eight seeds | 15,580 | 2,298 — exhaustive |
| synthetic 12 roles, whole registry | beyond 380,000 | ~2,000 — exhaustive |

#### The floor is recomputed against live occupancy (#78)

**Precomputing it once stopped being good enough at sixteen devices, and the key it stopped
bounding was `roleFitPenalty`.** That key is the role's index within `voice.roles`; with a library
that size, almost every role sits at index 0 on *some* box, so a floor that drops occupancy lets
every remaining request take a zero at once. `industrial-techno`'s optimum is 17. A floor of 0
against an optimum of 17 prunes nothing, and the search went to 195,951 nodes against a 150,000
cap and fell back to greedy on all twenty-four of its seeds — losing `recipeDistance` 0 against
1,414, which is the difference between every part getting its exact character and one not.

So the floor is now built **per node, against the occupancy the search has actually made**, taking
each remaining request's cheapest candidate that is still free. Admissible for one reason:
occupancy only ever grows within a descent, so a candidate taken now is taken in every completion
below, and every completion must fill each remaining request from something free *now*.
Restricting a minimisation's domain can only raise the minimum, so this is `≥lex` the static floor
term by term and therefore summed — strictly better, never wrong. A request whose candidates have
all been taken is charged an outright miss, which the static floor could only do for a request
with no candidates at all.

Two deliberate optimisms remain, both the safe direction: `distinct` is not consulted, and stack
plans are costed as though their members were free, because which members a plan gets is decided
per node.

**Measured, over seven templates by twenty-four seeds at sixteen devices**: worst case 195,951 →
**66,155** nodes, capped in 24 of 168 rigs → **none**. The `full-rig` guide fixture went from
capped-and-greedy to exhaustive in 58,869. Raising the cap was measured and rejected instead: the
growth is about 1.4× per added one-voice device, so any raise that survived the five-device issue
in flight would have been ~3.3×, and trimming the device that exposed it was rejected too — with a
single role it still needed 148,372 nodes, so the smallest voice-bearing device the schema allows
had already consumed the headroom.

**Re-measured at eighteen devices for #78, and the headroom is 11.6%**: the same sweep tops out at
**132,615** nodes on `industrial-techno` seed 9 with nothing capped. One direction is the whole of
that worst case — the second-worst is `ambient-dub` at 17,877 — and
`test/search-symmetry.test.ts` now asserts the 132,615 inside a five-percent band, so a move in it
fails loudly while there is still room rather than silently at the cap.

The one thing measured about what closes the remaining 17,385 nodes is **polyphony**. The probe in
`scripts/bench-search.ts` adds a nineteenth device — one fixed voice, eleven tonal roles, no wider
than the Moog semi-modulars already shipped — and varies nothing else: at `polyphony` 1 and 2 it
caps every seed of `industrial-techno`, and at 3 and above the same device leaves a worst case of
**42,421**, a 68% cut below the baseline. `polyphony: 3+` therefore *correlates with* a large drop
rather than a rise, reproducibly — `npm run bench:search` prints the table.

**Why it behaves that way is an unproven hypothesis, recorded as one.** The plausible reading is
that a voice able to host several requests completes a strong solution early, giving `liveFloor` a
tighter incumbent to prune against, while a monophonic voice adds a branch at every level and
improves no incumbent — but that is inferred from node counts, no bound was traced to confirm it,
and invariant 5 applies to claims about the engine as much as to a rendered guide. Whoever picks up
the bound work should treat it as the first thing to confirm or refute, not as a premise. Nor does
the table license the wider readings: that a device is expensive for being wide, or that cost
tracks voice count, was not measured. Size the next device by running the probe against its actual
shape.

`test/search.test.ts` checks it against `bruteForceBest` on rigs shaped to make it bite — several
one-voice boxes contending for the same few assignables, including one where the locally-best
first choice is globally wrong and the optimum is only reachable by backtracking.

**The suffix bound replaces pool-ordinal symmetry breaking as the thing that keeps a realistic rig
out of the greedy fallback**, and the claim below has to be read in that light. The fixture that motivated
symmetry breaking — eight parts over an eight-track pool — used to hit the cap with the ordinals
left in; it now finishes in 45 nodes with them left in, because the suffix bound alone is enough.
Scaling does not bring the cap back: 24 tracks and 24 parts is 325 nodes.

What symmetry breaking still does is narrow the branching factor, and that is now its whole job: it
takes those 45 nodes to 17, and shrinks 65 of the 67 cells in
`test/search-symmetry.test.ts`'s rig × template matrix. So it stays, as a constant-factor win on
top of the bound rather than as the thing preventing a fallback. The two cells that no longer
shrink are named in that file: with a strong bound the *quality of the first incumbent* matters
more than the branching factor, and restricting a pool to its lowest free ordinal changes which
leaf the first descent reaches. Both are ordering effects and neither loses a candidate — the
optimality matrix runs those exact cells against brute force on every seed and agrees.

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

**That was true when this was written and is no longer the reason to keep it.** The relaxed suffix
bound above now carries the fallback on its own, on this fixture and on every shipped template; the
factorial blow-up is real but the bound cuts it before the cap does. What follows is retained
because it still narrows the branching factor by roughly two thirds on a full-size pool — a
constant factor on top of the bound, which is a smaller claim than the one this paragraph makes.

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

**The default seed is derived from the inputs, not a constant and not a draw** (#127).
`lib/studio/session.ts` used to hand the resolver `seed: 1` whenever nobody had chosen one, which
meant the entire library shared a single arbitrary starting point: every visitor to every rig saw
the first guide seed 1 happens to produce, and the variety this whole section exists to serve was
invisible on first contact. `derivedSeed` hashes the selected device ids and the template id —
FNV-1a over UTF-16 code units, the same `hash32` the resolver salts its own streams with — and
folds the result into `[SEED_MIN, SEED_MAX]`, the domain `lib/core/permalink.ts` and
`components/seed-field.tsx` share. Only the *default* is derived; an explicit seed from a link,
from storage, or from Reroll wins untouched.

Three properties make that safe, and each of them fails silently rather than loudly:

- **It is still deterministic** (invariant 6). The device list is copied and sorted by code unit
  before it is serialized, so ticking two boxes in either order is one rig with one seed rather
  than two identities with two permalinks; the serialization carries labels and per-id length
  prefixes, so `['ab','c']` and `['a','bc']` cannot hash alike. Nothing reads the clock, the URL,
  or storage.
- **The server and the client still render the same first frame** (§9, #99). The seed is a pure
  function of two fields of the inputs both sides hold before either renders.
- **`/` stays cacheable and its preview card stays stable.** Randomising server-side per request
  was considered and turned down: it would make a bare link render a different guide — and a
  different OG card — on every fetch, with crawlers indexing one arbitrary result, for variety the
  Reroll control already provides on demand. The accepted cost is that a given rig and direction
  still look the same to everyone, which is exactly what Reroll is for.

The mood and the inspirations are deliberately outside the hash: folding them in would reroll the
guide under the hand dragging a knob.

### 7.3 Gaps and shortfalls

Unfilled roles surface honestly, with a suggestion of what would fill them. **Two axes, and they
are not the same question.** A `Gap`'s `reason` answers *why did this part not get made*, which is
a fact about the winning allocation. A `Shortfall`'s `kind` answers *is my track missing
something, and whose job is the fix*, which is what a reader actually asked. The resolver computes
the reason, then reads it against the direction's own declaration to get the kind — so the output
field is `shortfalls`, and there is deliberately no `gaps` beside it: a list of unfilled requests
under that name is what let three meanings render as one (#81).

Every gap carries a **reason**, computed after the search, because the three are different
failures and collapsing them tells the user to do the wrong thing:

| reason | meaning | the action |
|---|---|---|
| `no-capable-voice` | no assignable can carry this part, by role or by note count | change the rig or change the ask. Say which |
| `no-recipe` | a capable assignable exists, nothing authored within character distance 2 | nothing to buy; we owe you authoring. Name the voice that could carry it |
| `no-room` | capable and voiceable, but the objective ranked some other allocation higher | your rig cannot carry this arrangement as configured. Say what gave way |

**A fourth meaning was proposed and rejected** (#101, #81). A sampler voice with no declared
source could have been reported as a gap, and it would have needed no new field: the renderer
above already has the voice for it — *could carry it — pick it by ear*. It is refused because
`gap` was at that point carrying three unrelated situations under one word and one rendering; the
kinds below are #81 pulling those apart, and a fourth tenant would have made that job harder. It
would also say something false. A resolved recipe, with resolved parameters, on a voice that can carry the part,
is not an absence: nothing is missing from the rig and nothing is missing from the library. What
is missing is a *sentence in the recipe*, which is authoring metadata and belongs on the recipe —
`sourceAudio` (§3). The test of whether something is a gap is whether a part failed to be made,
not whether the guide has less to say about one than it should.

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
| `polyphony` | "needs 3 notes at once and every voice here is monophonic — stack it by hand across 3 of the 4 voices that play it, one note each" | play it across the voices by hand, author a `sampled-chord` recipe, or ask for fewer notes |

A rig full of monophonic tracks *does* play pads. Told the first sentence, its owner goes
shopping for a pad machine when what they need is one chord sample. The `polyphony` case carries
the assignables that declare the role, so the shortfall is measured off the rig rather than
assumed: where those voices are not all monophonic the sentence names the real ceiling — "the
most any voice here can sound is 4 notes" — because the monophonic wording would simply be false.

**And it names what to do, which #40 required and #128 is the discipline for.** Since stacking
landed the resolver spreads a chord across a *pool* on its own, so a surviving `polyphony` gap is
one of two situations with different advice, told apart by counting the voices that declare the
role: enough of them, but separately authored rather than interchangeable, so the reader can play
the chord across them by hand and the sentence says so; or fewer of them than the chord has notes,
so there is nothing to spread it across and the sentence says *that* instead. Neither is "buy a
pad machine", and neither is silence.

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

#### Shortfall kinds: what the absence means

A reason is a fact about the search, and not yet an answer for somebody holding the page. The
distance between the two is what #81 was filed about: an MC-101 handed eight parts of a finished
techno track was told it had four holes — one a recipe we have not written, three of them garnish
the direction never wanted. So every unfilled request carries a `kind` as well as a reason:

| kind | what it means | whose fix |
|---|---|---|
| `rig-limit` | the rig cannot make this part — by role, by note count, or because something else won the voice | the reader's, by changing the rig or the arrangement |
| `unauthored` | a voice here could carry it and nobody has written the recipe | **ours** (§3.5, #31), and it must never read as a limit of the reader's box |
| `not-needed` | the direction declared it is still itself without this part (§4.4) | nobody's — the track is finished |

```ts
Shortfall =
  | (Gap & { kind: 'rig-limit' })
  | (Gap & { kind: 'unauthored' })
  | (Gap & { kind: 'not-needed'; rationale: string })
```

`kind` is a pure function of `(gap, request)`. Nothing about the rig enters it that reads the
other way round, so invariant 3 still holds: a template learns nothing about what a device can do.

`rationale` is on the one variant whose account is **authored** rather than computed — §4.4's
reason, carried through. The other two already carry mandatory `because`/`detail`/`roleVoices`,
and "the song does not need this" is a claim only a person can make. It sits on the variant rather
than being optional everywhere, the same discipline as `ResolvedParam.provenance` (invariant 4):
a template cannot dismiss a part with a shrug.

The rest of the mapping is minimal — `no-recipe` becomes `unauthored`, every other reason
`rig-limit` — because those two kinds are the two halves of "whose fix", and `no-room` and
`no-capable-voice` share that answer even though they do not share a sentence.

**`not-needed` wins where more than one applies**, and that precedence is the answer rather than a
shortcut. Where a direction says the song is complete without a pad, the reader's question is
settled — nothing is missing — whatever the search then found about voices. It costs nothing,
because the `Gap` fields survive underneath: a `not-needed` shortfall still records `no-recipe`
for anyone counting the authoring backlog, and `no-capable-voice` for anyone counting what the rig
cannot do. The visible consequence is that an inessential part a rig genuinely cannot make reads
as *not needed* rather than as a limit, which is the honest reading of two true statements — the
box cannot, and it does not have to.

**§8 renders the three under three headings**, never one list: `Gaps` ("This rig cannot make these
parts"), `Waiting on us`, and `Not needed for this direction`. `Gaps` prints "None." when empty,
because that is the one worth reassuring somebody about; the other two are simply absent, since an
absent heading says the same thing in less space. The per-line sentence no longer names the state
— the heading above has said it once for every line underneath — and neither does the `optional`
tag, because §4.4 makes every optional request inessential, so it could only appear under a
heading that has already said it.

### 7.4 Clock source

#### Clock is directional

`ClockSpec` carried **one** transport list for both directions, and read as "this is how clock
moves in and out of this box". That is true of almost every box and false of one: the Mother-32
receives clock over MIDI DIN and over an analog clock at `IN · TEMPO`, and sends it only as pulses
out of `OUT · ASSIGN`. It has no MIDI output of any kind. The two sets do not merely differ, they
do not intersect.

The ranking below reads a transport off the source, so with one list it read the wrong one: a rig
choosing that box printed **"Clock source — Mother-32 over `midi-din`. Sync everything else to
it."** over a socket the instrument does not have. That is invariant 5's failure in the one place
a reader cannot check it against the panel — there is no socket there to check — and it took the
box's `sourceSetup` down with it, since #104's entry is per transport and the only one authored
was for `analog-clock`. The guide named a clock source and printed no way to turn it on.

So `clock.sendTransport` and `clock.receiveTransport` (§2.3), both optional subsets of
`transport`, which keeps its meaning as **every wire the box carries clock on in either
direction**. Three rules hold them honest, all in `DeviceSchema`: a direction list requires the
capability it describes, it may only narrow `transport`, and with both declared their union must
be all of `transport` — a wire in neither carries no clock. `sourceSetup` now has to name a
**send** transport, which is a check the undirected list could not make.

**Optional, because the asymmetry is rare and stating it should be.** Every manifest that was
symmetric omits both fields and means exactly what it meant before. Read them through
`sendTransports` / `receiveTransports` and never off the fields: the defaults are rules, not data,
and a consumer that reimplements them is how the distinction gets lost again.

**It was never only about the Mother-32.** The shipped registry already had a box with no MIDI DIN
at all — the Metropolix, whose every MIDI socket is an accessory you buy — and the full rig was
telling a reader to sync it over MIDI DIN. §10's `isolationReason` had asked the narrow question
since it was written, so the rack drew that box as unreachable while the sentence above it said to
sync it. One of the two had been wrong for as long as both existed.

#### Ranking

`canSendClock`, then **one semantic key and two tie-breaks**:

1. `clock.preferredSource` (§2.3) — the manifest's own topology judgement, "this box's job in a
   rig is to drive it". A dedicated sequencer or a groovebox documented as the centre of a setup
   says so; everything else omits the field. **Not derivable from `kind`**, and the library's two
   `mixer-recorder`s show why: the Model 2400 was considered for it and declines in a reasoned
   comment of its own, while the LiveTrak L-8 cannot send clock at all. Same kind, and one of them
   is not even eligible. Nor does §2.3's `sequencer` kind make it derivable — a sequencer following
   a DAW is still a follower — and `groovebox` least of all: the library has four, and #80 found
   that one of them qualifies.
2. Transport preference (`midi-din` > `usb`), over the transports the box can **send** on.
3. `deviceId` ascending by UTF-16 code unit (§7.2).

Where a box sends only on a transport the preference list does not rank — `analog-clock` today —
the answer is that box's own first send transport. Never `transport[0]`: that is the undirected
list, and it is the line the whole defect above would come back through.

Keys 2 and 3 exist to make the answer **deterministic**, not to make it right. Only key 1 carries
a judgement, and it is a person's.

**`kind` is not a key, and briefly was.** One revision ranked `kind: 'sequencer'` above other
preferred boxes, to settle the case where two manifests each honestly claim the field. It was the
same mistake as the `!canReceiveClock` paragraph below, one tier down: an inference standing in
for a claim, and the first time a `DeviceKind` had been given meaning by the engine rather than by
the picker. Where two boxes have each said "my job is to drive a rig", §7.4 has no basis to rank
them and says so — the repair is for one of them not to make the claim, not for the engine to
guess which claim it believes.

**No seed** — this should be stable across rerolls, since rerolling a pattern should not re-cable
the rig.

#### Why this box (#121)

The phase named a box and a transport and never said what the answer rested on, so **two
different claims reached a reader in identical words**: "the Tracker Mini's manual calls it the
centre piece of a setup" and "nothing here claims that job, so `polyend-` sorted before
`roland-`". The first is a person's judgement. The second is a tie-break that exists to make the
answer deterministic and, by the paragraph above, explicitly not to make it right. Printing the
second in the voice of the first is invariant 5's failure with the sign flipped — not an invented
value, but an invented confidence.

So `ClockSource` carries `claims`: how many *eligible* boxes claimed the field. `clockSourceBasis`
turns that into the three words the guide speaks, and the renderer speaks them and derives
nothing (§8):

- **`claimed`** (one) — *its manual says leading a rig is its job.*
- **`contested`** (more than one) — *N boxes here claim that job, so transport, then name,
  settled it.* §7.4 has no basis to rank two honest claims and this is where it says so out loud;
  the repair is for one manifest to stop claiming it, and a reader cannot ask for that repair from
  a line that reads like advice.
- **`tie-break`** (none) — *nothing here claims that job, so transport, then name, settled it* —
  **except where the box was the only candidate**, which is #144 below. `ClockSource.eligible`
  carries how many boxes were eligible at all, and where that is one the line reads *it is the
  only box here that can send clock*: nothing was ranked, so nothing was settled. `claimed` and
  `contested` are untouched by that rule and the difference is the rule itself — a claim asserts
  no comparison, and `contested` cannot arise below two candidates.

Three rules on the ink, all of them #35's lesson:

- **One line per rig, never one per candidate.** The eight boxes that were asked and declined are
  the device pages' business. Hoisted the way #107 hoisted pattern-global params — the repetition
  goes, the outlier never does.
- **The evidence shown is the chosen box's own**, at `clock.preferredSource`, and only that one.
  It carries its state's mark and one `↳ cite:` line beneath, labelled `claim` rather than
  `value`, because nobody dials this field. Where a manifest recorded nothing there, the guide
  prints no mark and no citation: nobody wrote down a reading, so the guide claims none.
- **The reason is printed here and nowhere else.** This is the one place a capability fact's
  reason reaches a reader in the guide, and it earns the space because it is the finding — "no
  page states that leading a rig is its job" is information, and rendering nothing in its place
  implies a confidence the guide does not have. §8.1's eight-word rule governs *hints*; a `↳ cite:`
  has always carried pages.

Both renderers say all of this, in their own words (§8's standing rule about ink): the page is
what somebody is holding at the rack (#21), so a fact that reaches only the Markdown reaches
nobody.

**Occupied-assignable count is not a ranking key, and used to be the first one.** The reasoning
was that the busiest box is the one you are standing at, which is a guess about the *session*
presented as a fact about the *rig*. Two things were wrong with it. It re-cables a studio because
a template asked for one more hat — the physical MIDI topology of a room should not move when the
genre does. And it made the clock source a function of the assignment search, so a change to
§7.1's objective, or an extra device changing where parts land, silently moved the cables; the
"no seed" rule above was being upheld in the letter while the assignment reached the same
decision by another route.

`ClockSource.occupiedAssignables` survives as **rendered information**: "carrying 5 parts" is
worth printing beside the source, and that is now all it does.

**Choosing the source is half the job; the other half is turning it on** (#104). `canSendClock`
says a box *can* drive a rig, and on plenty of boxes that is a capability behind a switch. The rig
phase said "Tracker Mini over `midi-din`. Sync everything else to it", and a reader who did
exactly that got silence: clock output on that box is routed in a menu — `Config > MIDI > Clock
Out`, taking Off / USB / MIDI Out jack / USB + MIDI Out jack — and nothing in the guide mentioned
the menu. Every later phase assumes the transport is running, so one unstated setting stalls the
whole guide.

So a manifest may declare `clock.sourceSetup`: per transport, the menu `path` and the `value` to
select there, **in the box's own words** (`Config > MIDI > Clock Out`, not "the clock output
setting" — §8 is read at the machine and that string is on a screen), with an optional `note` and
a **required entry in `capabilityEvidence` at `clock.sourceSetup[<transport>]`** (§2.6; it was a
`verified` field until #22, and the requirement moved with it). Per transport because the setting is: the same menu takes `USB` for a USB
rig, and printing the wrong option is worse than printing neither. Both renderers share the
*lookup* — which entry matches has one right answer — and neither shares the sentence, which is
§8's standing rule about ink.

Nothing is derived. A box needing no setting declares none; a box whose manual prints none
declares none either; both render exactly as they did, because an invented menu path is invariant
5's fault wearing a different hat.

**`!canReceiveClock` is deliberately not a key**, and was one for exactly one revision. The
argument for it was that a source-only box has nowhere else to sit in the topology. It does not
follow: such a box simply runs free, which the guide already states by name for the LiveTrak L-8,
and the rig's clock does not reach it either way. The deeper objection is that it would infer
intent from a *capability*, doing by inference the one job `preferredSource` exists to make a
person do explicitly — a recorder that should drive a studio ought to say so in its manifest, and
under the inferred rule it never would.

### What this costs

Three things, all of them chosen rather than overlooked:

- **Topology is now an authored judgement or it is nothing.** No rig gets a *considered* clock
  source unless some manifest claims one, and **two devices in the library do**: Metropolix, whose
  manual's first line calls it a musical sequencer and which has no voice to be played by anything
  else, and the Tracker Mini, whose MIDI chapter calls it "a perfect fit for the centre piece of a
  setup" (p.283) and opens its typical configurations with the one where it leads (p.287). Every
  rig without either falls straight to the tie-breaks. The Model 2400 claimed the field for two
  commits too, on the strength of a manual that proves the desk can generate clock and cannot
  receive it — but neither fact says it should lead every rig it is put in, which is what the field
  means. That was capability promoted into preference: the same error as the two ranking keys this
  section has already removed, moved out of the engine and into a manifest, where it is harder to
  see. Which of the two a manifest is doing is now recordable rather than only arguable, at
  `clock.preferredSource` in `capabilityEvidence` (§2.6).

  **#80 asked the question of the whole library and the answer was mostly no**, which is the
  result worth recording rather than the two claims. Nine devices had no decision either way. One
  qualified. Five are reasoned non-claims on manuals that turned out to document capability and
  never purpose — the MC-101's one-page "Interoperation with Other Devices" draws it following a
  DAW and leading a TR-8S, one diagram each; the TR-8S's external-gear chapter opens
  receive-first; the TR-1000 is positioned as "the most complete rhythm machine ever made" and its
  only topology note puts it *in the middle* of somebody else's chain; the Digitakt II is "a
  compact drum machine and sampler" whose MIDI tracks cost you audio tracks; and the Cascadia,
  whose four clock pages are two jack lists and two settings tables while every page that
  establishes what it is for has a controller or a sequencer playing it. Two are closed by the
  hardware, the ZOIA and the LiveTrak having no clock to transmit. The Deluge is the near miss
  worth naming:
  it has a clip type per external device and a "Typical MIDI Set Up" drawing with a synth module
  hanging off it, and its guidebook still never states what the box is *for*, hedging to "can be a
  controller". A field this narrow is supposed to come back empty most of the time.
- **Several preferred sources in one rig fall through to transport and id**, exactly as several
  unpreferred ones do. The field says "this box can lead", not "this box leads over that one";
  ranking two authored preferences against each other would need an ordering nobody has a basis
  to author.
- **A rig with no preference at all is decided alphabetically.** With load gone and every
  bidirectional instrument in the library on `midi-din`, `deviceId` is what remains — so an
  instrument-only rig is clocked by whichever box sorts first, regardless of what it carries.
  That is honest determinism rather than a judgement, and the repair is to author the judgement,
  not to reinstate a proxy for it. #80 performed that repair once and it is worth seeing what it
  bought: a Deluge + Tracker Mini + TR-1000 rig resolves to the same box it always did, because
  `polyend-` already sorted first. What changed is that the answer is now a claim the Tracker
  Mini's manual supports rather than an accident of spelling, and moving the claim to the Deluge
  moves the source to the box that sorts *last*. The outcome staying put is not evidence the field
  did nothing; authoring it to move the outcome would be the same error from the other side.

---

## 8. Guide output

Phased, in this order. The sequence reflects how a real session unfolds at the machine.
Do not reorder.

1. **Song** — BPM, key, hook, harmonic cycle, bar-count energy map
2. **Voice assignment** — which role lives on which device and voice*s*, and why. For a part of
   more than one note, *how* those notes are made (§12.4) is one of the facts: "3 notes at once on
   one polyphonic voice", "3 notes from one sampled chord" and "3 notes stacked one per voice" are
   three different things to do, and the reader has to be told which one they got. A stacked part
   names every voice it takes — "Tracker Mini · Track 4, Track 5 and Track 6" — because the reader
   is going to walk to the box and touch all three, and a count is not a thing you can touch. A
   one-note part says nothing about realisation, because there is nothing to say
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
   know (invariant 5).

   A part **stacked** across several voices (#40) is rendered **by voice rather than by chord**:
   one block per voice, listing the notes that voice plays. The same data as a per-chord table and
   far more usable, because on a tracker you fill one track top to bottom and then move to the
   next — a reader following a per-chord list would enter one note, jump two columns, enter one
   note and jump back. The assignment rule is stated once and then relied on: lowest note to the
   lowest voice. That is musical rather than tidy — hold it and the voicing keeps its shape as the
   progression moves; cross the voices and the chord changes character between bars with nothing
   on the page saying so. A chord with more notes than the part has voices is reported, not
   truncated (invariant 5). A polyphonic part's hook is unchanged

   **All three renderings ask the carrying device how it ends a note** (§2.7) — the sampled one,
   the stacked one and the plain list — because it is the same question in all three, and
   answering it three times is how the first two came to disagree about a box. The device fact
   decides whether a duration prints at all, what sentence sits above the notes, and where the
   note-offs go. It is stated once per part, above the rows it governs, with the page it was read
   from. A part nothing carries gets no such sentence: every one of them says *this box*, and
   there is no box.
5. **Step programming** — the selected template pattern per part (§4.3), rendered per device with
   that device's slot articulation bound to it (§7 step 8).

   **Except where a hook resolved for that part's role, in which case the hook is the pattern**
   and this phase prints a pointer to phase 4 rather than a grid (#100). One authority per part:
   a hook states steps, lengths and pitches, a variant states steps of its own, and the two
   disagreed on the page with nothing saying which to play — Drone Study's `texture` was three
   sustained notes above and seven retriggers here, against a 1.8 second attack. The
   discriminator is **whether a hook was authored for the role**, not which group the role is in:
   `texture` is `body` and `bass-mid` is `low`, so a rule about tonal roles fixes neither case,
   and hook existence needs no fifth shared vocabulary (invariant 3). Only a *resolved* hook
   takes authority — an unresolved one has no notes, and deferring to it would leave the part
   with no rhythm stated anywhere. Selection itself still runs: it is a pure function of template
   and mood (§7 step 5) and the band it carries is what §6.3's trajectory reads, so a single-part
   template keeps its energy map. It is the grid that is not rendered, not the decision that is
   not made.

   **And except where the direction says the variants re-articulate that hook** (§4.3's
   `reArticulatesHook`), in which case the pointer comes *with* the grid rather than instead of
   it: the hook owns which note and how long, the steps own where it is lifted and struck again.
   Two authorities on one part, said in one sentence, so nothing is restated and there is nothing
   for a reader to choose between — which was #100's actual complaint. The sentence names the
   map's length in bars, because the chain plan below it is counted in the **hook's** bars: on
   Drone Study that is a 16-bar cycle over a 4-bar map, and a reader handed both with no relation
   between them would reasonably dial the wrong one. A re-articulating part whose every section
   came back `none` has no map to describe and falls back to the plain pointer rather than to a
   sentence about a grid that is not there (invariant 5).

   This is the half of #100 that had to come back. Without it the density knob moved nothing a
   reader could act on for those parts — the same three sections, the same silence, a different
   band label in phase 7 — and on a one-part direction that is the whole guide unaffected by its
   own arrangement.

   **Sections that are not a whole number of repeats are named, with the arithmetic** (#105).
   Drone Study's sections are 9, 15, 21, 33, 18, 24 and 12 bars against a 16-bar cycle, a 16-bar
   hook and 4-bar variants: nothing divides, and that is authored intent — out-of-phase
   boundaries are "what stops 132 bars of one note reading as a loop". **The lengths are never
   rounded.** What the guide owes the reader is the other half of that decision, because on a box
   where you chain patterns in Song mode a 9-bar section made of a 4-bar pattern is not playable
   as written: the phase opens by saying the lengths are deliberate and gives the rule — chain
   full copies and cut the final one short, so 9 bars of a 4-bar pattern is 4 + 4 + 1 — and each
   part lists the sections it cannot fill evenly. The unit is what that part actually repeats:
   its variant, or its hook where the hook took authority above. A section shorter than one copy
   is one copy stopped early, never "0 copies", which is a repeat count no box can be given
6. **Sound design** — opening with **what to load**, where the recipe declares a source (§3/#101).
   `Source — a sustained tonal source, two seconds or longer …` goes first in the part, ahead of
   routing and ahead of every parameter, because that is the order it happens at the machine: a
   cutoff on a sampler track holding nothing is a setting with no subject. The prefix mirrors
   `Routing —` below it, since the two are the same kind of line — an instruction about the part
   rather than a value to dial.

   **The need carries no provenance mark and the procedure below it does.** That asymmetry is the
   model's rather than the renderer's: invariant 4 governs rendered *values* — something the
   resolver could have moved, with a range behind it and a page that could confirm it — and "a
   held synth note or a field recording" is none of those. It is an instruction about content to
   obtain, exactly as `routing` is an instruction about signal flow. A provisional badge means
   *nobody checked*; putting one on a choice that is the reader's would read as an unchecked
   guess where there is nothing to check. The `prep` procedure is a different claim, is the
   manual's when it has a page, and carries the mark and the citation accordingly

   Then where the multi-note realisation becomes an *instruction* rather than a
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

   **A parameter with a `scope` is stated once per device, above the parts** (§3.1/#107). A
   recipe is authored per voice, so everything in it reads as a per-voice setting; the Tracker
   Mini's `SWING` and the TR-1000's Pattern Shuffle are not, and the landing rig printed nine of
   them — four tracks and five voices — each carrying a note explaining that the other eight were
   the same number. The hoisted line keeps its value, citation, note and hint: hoisting removes a
   repetition, never evidence. Above the parts rather than below, because that is the order it is
   done at the box. **A scope declaration alone is not enough to hoist:** every occurrence must
   render identically first, and when two recipes disagree the parameter stays in every part.
   One line under a heading claiming it covers a value it does not is an invented agreement, and
   invariant 5 forbids that more clearly than it forbids a repetition
7. **Finishing** — sidechain, master FX, and the arrangement as a **band trajectory** (§6.3):
   which sections program identically part for part, and which parts do not follow the band.
   Deliberately not a second copy of phases 1–3 — it printed the device list, a bars-and-energy
   table and every role under every section heading, and all three already exist above it.

   **Master FX names what processes audio, and nothing declares that.** There is no
   `features.fx`: the block reads three things a device already says about itself — `kind`
   (an `fx-processor` or a `mixer-recorder` *is* the processing), panel labels naming an effect
   (§10 — `MASTER FX` silkscreened on a TR-1000 is the box saying where its effects are, in the
   words you read standing at it), and effect parameters **the parts in this guide set** (a part
   asking for `REVERB SEND` will not sound as authored on a box with no reverb). Reading `kind`
   alone told a rig containing a TR-1000 and a Deluge that it had no effects at all, which is a
   false negative rather than a gap shown honestly (invariant 5). All three are name matches
   against a short, deliberately conservative effect vocabulary, and a name match is weaker than
   a declaration: a box with no panel drawing and no effect parameter goes unmentioned, and a
   knob labelled `DELAY` that is really an envelope delay would be read as an effect. Both are
   known limits of reading names rather than declarations, and both under- and over-claim quietly

   The parameter route reads `assignments`, not `device.recipes`. Scanning every authored recipe
   makes it a *capability* fact, and this section's sentences claim to describe the resolved
   guide: a Tracker Mini drone study assigning one `texture` part was told the box carries
   `DELAY SEND` and `REVERB SEND` in its recipes, when only the reverb send resolved and the
   delay send appears nowhere the reader can act on. `kind` and panel labels stay device-level,
   because what the box *is* and what is silkscreened on it are true of the hardware in front of
   you whether or not this guide gave it a part

   That narrowing cost a false negative of its own, and closing it is the rest of the rule. A box
   whose only evidence is its parameters and whose parameters this guide never reaches used to
   leave the section entirely — and where it was the only candidate the section printed *Nothing
   in this rig processes audio*, which is a claim about the **rack** and is false of a rack
   holding a Tracker Mini. Two facts were sharing one sentence. They no longer do: such a box
   stays in the list carrying `unused` evidence and reads *carries effects, though no part in
   this guide reaches them* — named, with the reason nothing is set on it, and **with no
   parameter named**, which is what keeps #106 fixed. The capability decides which sentence
   prints; it never reaches the page as a control the reader would go looking for and not find.
   `unused` is emitted only when nothing else speaks for the box, so a `MASTER FX` silkscreen is
   never followed by a weaker restatement of itself. *Nothing in this rig processes audio* now
   means what it says — no box in the rig has effects at all

#### A statement has to have referents (#144)

**A sentence may name a set only where the rig has members of it.** §8 is read *at the machine*,
and a reader standing in front of one box can see the whole rack — which is what makes this class
of defect worse than clumsy rather than merely verbose. It reached four sentences, in three
phases, and not one of them failed a test, because every assertion in the suite had been written
against a rig large enough for the sentence to be true. A Deluge alone on `drone-study` read:

- *Sync everything else to it.* — there is no everything else. And one step less obviously, *sync
  everything else to it, except A and B* over a rig of exactly A and B is an instruction to sync
  nothing, written in the grammar of an instruction to do something. §7.4 now carries
  `clockFollowing`, which splits the rig into `followers`, `deaf` and `unwired`; the sentence is
  chosen by whether `followers` has members, never printed and then qualified. The exempted boxes
  are still named in every branch — a reader wants to know *which* box runs free far more than
  they want the clause to be short
- *Why this box — nothing here claims that job, so transport, then name, settled it* — two
  tie-breaks named, over a field of one candidate, neither of which ran. See the `eligible` rule
  above, and its sibling one tier down in §3.3: *nothing here claims that job, so the names
  settled it* has the same defect where `VoiceControlSource.ranked` equals `candidates`, meaning
  no other box offered a note-and-gate pair at all
- *nothing else in this rig processes audio* — a claim about the other boxes, made to a reader who
  owns none. A one-box rig reads *it is the only box here, so that is the whole master chain*,
  which is the fact worth stating in its place rather than an absence of one
- *Deluge — internal* under Sidechain — the field printed where an answer belongs. `lib/core/
  sidechain.ts` groups the rig by *where a trigger can come from*: boxes that can duck to another
  box's audio and have a jack for it to arrive at, boxes whose only documented trigger is one of
  their own parts, and boxes that declare the feature with neither. The one-box rig gets the
  honest version of the first group rather than an instruction to patch a box that is not there,
  and a multi-box rig where nothing can duck to anything else is told a rig-wide pump is built box
  by box — which is the fact `internal` was hiding, since the same word covered a box you can
  patch a trigger into and a box you cannot. Boxes declaring no sidechain are not listed as having
  none: a missing `features.sidechain` is an absence of documentation as often as an absence of
  capability (invariant 5)

The derivations live in `lib/core/` — `clockFollowing` in `pipeline.ts`, `sidechain.ts` beside
`fx.ts` — and each renderer writes its own sentences from them, which is §8's standing rule about
ink and the reason the two cannot drift on *which* boxes a sentence covers.

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
  remainder into manual and observed so neither is read as the other — and, since #22, the
  capability facts a manifest has spoken about (§2.6), split six ways over two lines — `caps` for
  the states with a document behind them and `gaps` for the states without, because `undocumented`
  is finished work, `unchecked` is work nobody has started, and `unread` is work nobody here can
  start at all

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
width in a rack frame — from `device.physical.panelSpanMm` and `device.panel.panelRiseMm` (§2.3),
both the front-panel spans in playing orientation, authored per device and cited, never estimated
from the artwork. A portrait box therefore reads as portrait. Each panel carries its own
simplified original drawing (`device.panel.features`, §2.3), rendered by one generic renderer with
no device-id switch anywhere. Once a guide resolves, patch cables (SVG bezier curves with real
sag) connect the panels to show signal flow and clock. The cables *are* the visualisation of the
resolver's output. This is the one place to spend effort.

**The rack wraps onto rows.** A row holds at most three panels on a phone, four on a tablet and
five on a desktop — a hard cap by breakpoint, not a minimum panel width, so the wrap is checkable
by counting rather than by measuring and two rigs of the same size never wrap differently. Adding
a box therefore grows the frame instead of shrinking every panel already in it, which is how a
physical rack behaves. Rows fill in registry order, and they are **ragged**: a row of three narrow
boxes is shorter than a row of three wide ones, and a short row is never stretched to justify it,
because one millimetre has to be the same length everywhere in the figure. There is one `viewBox`
in millimetres for the whole rack, so the shared scale is structural rather than arithmetic.

Wrapping is what makes the cables real work. Every row sits over a **cable corridor**, and the
left and right of the panel band are **gutters** reserved for cables that have to leave their row:
such a cable drops out of its jack into the corridor, crosses to a gutter, runs down (or up) the
side of the frame, travels the corridor *beneath* its target row and rises into its clock input
socket. Under, always — a cable arriving from above would have to cross the target's own face to
reach a jack on its bottom rail, which is the thing the bottom rail exists to prevent. A cable
between two boxes on one row still just hangs. A gutter is only reserved when a cable uses it, so a rig that fits on
one row is laid out to the millimetre as it was before rows existed.

**The voice field is packed by cell shape, not only by cell area.** The one region a panel hands
to the resolver (`kind: 'voices'`, §2.3) is filled with one cell per assignable, and the column
count is chosen rather than fixed — the authored regions are too different for a constant cell
size, from a 314 x 22 mm instrument row to a 106 x 62 mm screen. The rule was "take the column
count with the largest cell area", and on a *shallow* region that rule fails: eleven voices in a
237.7 x 18 mm strip come out as 18.9 x 14.7 mm at eleven columns and 37.1 x 7.5 mm at six, which
are 278.1 mm2 and 278.4 mm2. Area chose two rows of slabs over one row of buttons on **0.3 mm2**,
three parts in a thousand, because area cannot see the difference between a 1.28:1 cell and a
4.95:1 one. So a candidate layout is now rejected when `cellW / cellH` exceeds `MAX_CELL_ASPECT`,
which is 3 — the same ceiling `test/rack.test.ts` has always asserted against every drawn panel,
now named once in `components/rack/model.ts` and imported by the test rather than written twice.

Two things about it, and the second is the one that would bite:

- **The constraint is a preference, never a veto.** A region so shallow that no column count
  clears the ceiling still gets the best layout that fits, squat cells and all. Drawing the voices
  badly is a cost; failing to draw them is a bug, and a strict ceiling would have shipped that bug
  on the first device authored with a shallower row than anything in the library today. The empty
  return keeps its original and much narrower meaning: nothing fits this region at all, so the
  "panel not drawn yet" sentence stays honest.
- **The cost is that a shallow region now trades a little coverage for shape.** On the 237.7 x 18
  strip, coverage moves from 0.7157 to 0.7149 — three cells short of nothing, and far above the
  0.55 floor. That is the direction the trade should go, but it is a trade: a future region could
  clear the ceiling only by giving up real area, and the packer will take that deal without
  saying so.

Adding the constraint moved exactly one panel in the nine-device library and left the other eight
byte-identical, which is the evidence that it bites only where it should. That check is worth
repeating on any future change to the packer, because both existing guards — coverage above 0.55
and aspect under 3 — can pass while a panel that was already right gets worse.

What the resolver actually produces that is spatial is **clock**: §7.4's source and the boxes that
can sync to it. Audio is not drawn, and the page says so beside the legend — the resolver assigns
parts to voices, never to a destination box or mixer channel, so there is no authored endpoint to
cable to and inventing one would be invariant 5's "never invent an assignment" wearing a different
hat. `PatchEntry` data is carried through to the panel for a future semi-modular box and rendered
as a count, never as a cable: those are patch points *inside* one box.

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

**Manual artwork is reference, never asset.** Panel diagrams in `manuals/` are the right thing
to *look at* while drawing: where the knobs and jacks actually sit, the proportions, the control
clusters. Getting those right is what makes a panel recognisable, and that is the point. What we
must not do is extract, embed, trace pixel-for-pixel, or ship any of it. patchscore.app is a
public site, the diagrams are vendor copyright, and `manuals/` is gitignored precisely so none of
it is redistributed. There is an aesthetic objection too, independent of the legal one: Roland,
Polyend and Synthstrom draw in completely different line weights and conventions, so a rack
assembled from their artwork would look like a scrapbook. This section asks for a designed
surface with silkscreen labels, not photorealism.

Wanting a device image to make a panel work is a signal that the panel design is not carrying
enough on its own. Say so and fix the design; do not reach for the manual.

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
assignable serves exactly one request per section — the direction that has never moved. The
converse *has*: since #40 one request may be served by several assignables of one pool, one note
each (see the stacking note below). `polyphony` on an assignable is still simultaneous notes within
one voice; the note count on a request is still a count of notes and not of voices. Multitimbrality
is modelled by pools, not by polyphony. `comfortableVoices` counts *occupied assignables* — one per
assignable occupied in at least one section, and every voice of a stack is one of them.

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

*Built — multi-assignable stacking, and the ordering the paragraph below used to defer.* A request
of `n` notes may be satisfied by **`n` assignables of one pool on one device**, each carrying one
note of the chord. This is the third of §12.4's three realisations, and it was the one left
unbuilt: the sampled-chord route above made the reported pad resolvable, which is not the same
thing as building the mechanism, and #40 was reopened for saying so.

**The gate is `kind: 'pool'`, and that is the argument rather than a convenience.** Pool members
are interchangeable by construction — `roles`, `polyphony` and the recipe key are all per-pool
(§2.2) — so every voice of a stack provably runs the same patch, which is what makes the result
one chord rather than three sounds. Three *fixed* voices are three separately authored timbres; a
TR-1000's LT, MT and HT handed a triad would produce three differently tuned toms. That answers
the drum-machine worry this section used to raise without a tonal-role list and without a device
declaration: fungibility is exactly the property stacking needs, `kind: 'pool'` is exactly the
claim that the voices have it, and neither is a fifth shared vocabulary (invariant 3). Two further
conditions: enough members to go round, and a `polyphonic-voice` recipe — stacking a chord sample
would put the whole chord on each of three voices. A pool whose own polyphony already reaches the
count is refused outright rather than ranked last, because stacking it is strictly dominated.

**`Score` gains `stackedChords`, ranked below `sampledChords` — so a stack is the preferred
compromise of the two.** That ordering is the musical question this section deferred, and it is
decided with the fixtures in front of it (`test/polyphony.test.ts`). The argument: a stack plays
the voicing the hook authored, follows a progression through a change of chord quality, and can be
inverted or re-voiced — none of which a chord sample can do, since transposition preserves shape.
What a stack spends is *voices*, and `crowdOverflow` prices those two keys above. So charging the
stack again below would price one cost twice, and preferring the sample would be paying for shape
it cannot deliver. Both still sit below a genuine polyphonic voice, which is the requirement #40
made binding.

The consequence is a trade the box's own documentation describes. On a Tracker-Mini-only rig with
tracks to spare, `pad` and `stab` are each played across three tracks. Tighten `comfortableVoices`
and the same box reaches for the chord samples instead — which is precisely why p.104's render
procedure ends "Remove the other track samples to free them up". Crowding outranking both
compromises is what produces that, and neither realisation had to know about the other.

**Crowding is not softened.** §12.4 counts *occupied assignables*, so a stacked triad costs three.
It makes one pad on a tracker as expensive as three separate parts, which is a true statement
about a monophonic box and is asserted rather than assumed.

**One member set per pool per node, not every combination.** Which members a stack takes is chosen
at the node, since it depends on occupancy: already-occupied members first (a member busy in
another section costs no new occupied assignable, so reuse can only help `crowdOverflow` and
leaves a fully-free member for a later request — weakly dominant), then lowest ordinal, which
among never-occupied members is `breakPoolSymmetry`'s existing argument unchanged. Enumerating the
`C(count, n)` subsets would be 56 branches per pool per request on a Tracker Mini, re-explored at
every level below. Where this is a *restriction* rather than a canonicalisation is stated in the
code and is worth repeating: two members occupied in *different* sections are distinguishable, so
choosing between them by ordinal could in principle cost a later transient request its voice. That
needs a request of more than one note that is also `transient`, which no template authors — a
continuous request occupies every section, so every member occupied anywhere is already excluded.
The brute-force oracle in `test/rigs.ts` enumerates all the subsets and is the check on this.

**The guide says which realisation the reader got, and which voice takes which note.** §8 phase 4
renders a stacked hook **by voice rather than by chord**: on a tracker you fill one track top to
bottom and then move to the next, so a per-chord table would have a reader entering one note,
jumping two columns, entering one note and jumping back. Phase 6 states the instruction that stops
three voices becoming three sounds — every voice takes the same settings. Both renderers, written
out twice per §8.

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
satisfy it, the surplus requests become ordinary shortfalls (§7.3) rather than being silently
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
