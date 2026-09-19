# Drum and Bass

Values are starting points — dial them to taste. Where a mood knob or the key moved one you see
the move (`52 → 45`). Every value carries its range — `38 (0…100)` — so you can tell at a glance
whether the screen in front of you is the one the line is about.

## 1. Song

- **BPM** 172 (template range 168…176)
- **Key** G minor (a reroll may pick F minor, C minor)
- **Harmonic cycle** 8 bars

| Degree | Chord | Notes | Bars |
| --- | --- | --- | ---: |
| i | Gm | G · Bb · D | 4 |
| VI | Eb | Eb · G · Bb | 4 |

**Arrangement** — 128 bars total

```
            Intro  Build  Drop           Breakdown Return         Outro
            16b    16b    32b            16b       32b            16b
energy      0.15   0.45   0.7            0.2       0.95           0.2

sub         ██████ ██████ ██████████████ █████████ ██████████████ ██████
kick        ······ ██████ ██████████████ ········· ██████████████ ██████
snare       ······ ······ ██████████████ ········· ██████████████ ······
closed-hat  ██████ ██████ ██████████████ ········· ██████████████ ██████
ghost-perc  ······ ······ ██████████████ ········· ██████████████ ······
open-hat    ······ ······ ██████████████ ········· ██████████████ ······
pad         ██████ ██████ ██████████████ █████████ ██████████████ ██████
```

## 2. Voice assignment

- **`sub`** → Deluge · Track 1 — *Sine sub with the top end cut away*
  - p1 · exact `dark` · every section
- **`kick`** → Deluge · Track 2 — *Synth kick on a kit row — sine, fast pitch drop, decimated*
  - p2 · exact `hard` · Build, Drop, Return, Outro
- **`snare`** → Deluge · Track 3 — *Snare with the treble lifted, rolling on the fill*
  - p2 · substituted — asked `hard`, authored `bright` · Drop, Return
- **`closed-hat`** → Deluge · Track 4 — *Closed hat with the bass rolled off*
  - p3 · substituted — asked `bright`, authored `clean` · Intro, Build, Drop, Return, Outro
- **`ghost-perc`** → Deluge · Track 5 — *Quiet percussion filling the gaps*
  - p4 · exact `soft` · Drop, Return
- **`open-hat`** → Deluge · Track 6 — *Open hat filtered down, decaying into the bar*
  - p4 · substituted — asked `dirty`, authored `dark` · Drop, Return
- **`pad`** → Deluge · Track 7 — *Analog saw pad, slow chorus, wide reverb send*
  - p5 · substituted — asked `dark`, authored `soft` · 3 notes at once on one polyphonic voice · every section

### Gaps

None.

## 3. Rig integration

**Clock source** — Deluge over `midi-din`, carrying 7 parts. Nothing else is here to sync to it.

- Why this box — it is the only box here that can send clock

- **Deluge** — groovebox · 7 parts
  - clock: sends clock · midi-din/usb/analog-clock
  - audio: stereo main out · audio in
  - mixer: 7 parts, no individual outs: one stereo channel for all

## 4. Hook

Steps are sixteenths, counted from the start of the hook: 16 to a bar, so step 33 is bar 3.
Notes sharing a step are one chord and share a line.

Names are spelled for the key, so F minor gets `Eb`; a name in brackets is the same pitch as
a sharps-only box shows it, and appears only where it differs. Octaves put middle C at C4,
which not every maker agrees with — the MIDI number is the form nothing disagrees about.

Where a role has more than one hook authored, rerolling the seed picks a different one.

### `pad` — Deluge · Track 7

**Analog saw pad, slow chorus, wide reverb send** — settings in Sound design

8 bars in G minor.

Note length is set per note here — `the note’s extent on the grid — hold its start pad and press its end pad`, in grid steps at the current zoom.

- bar 1 · step 1 · held for 64 steps (4 bars) · `G3` `Bb3` (`A#3`) `D4` · root 3rd 5th · MIDI 55 58 62
- bar 5 · step 65 · held for 64 steps (4 bars) · `Eb4` (`D#4`) `G4` `Bb4` (`A#4`) · 6th 8th 10th · MIDI 63 67 70

### `sub` — Deluge · Track 1

**Sine sub with the top end cut away** — settings in Sound design

8 bars in G minor.

Note length is set per note here — `the note’s extent on the grid — hold its start pad and press its end pad`, in grid steps at the current zoom.

- bar 1 · step 1 · held for 48 steps (3 bars) · `G1` · root · MIDI 31
- bar 4 · step 49 · held for 16 steps (1 bar) · `D2` · 5th · MIDI 38
- bar 5 · step 65 · held for 48 steps (3 bars) · `Eb2` (`D#2`) · 6th · MIDI 39
- bar 8 · step 113 · sounds for 8 steps · `G2` · root · MIDI 43
- bar 8 · step 121 · sounds for 8 steps · `Bb2` (`A#2`) · 3rd · MIDI 46

## 5. Step programming

### `sub` — Deluge · Track 1


**The hook is the notes; the steps below are where they are struck again** — see Hook above for what to play and how long each note is held. This map is 1 bar long and repeats inside the hook; the chain lengths below are counted in the hook.

**Intro, Breakdown, Outro** — 16 steps, band 0

```
 1 x··· ···· ···· ····
```
- `downbeat` — 1

**On this box** — Deluge

- `downbeat` → `velocity` 112 on step 1

**Build** — 16 steps, band 1

```
 1 x··· ···· ··x· ····
```
- `downbeat` — 1
- `offbeat` — 11
- tightest re-strike — `0.52` Sec · derived from 6 steps at 172 BPM

**On this box** — Deluge

- `downbeat` → `velocity` 112 on step 1

**Drop** — 16 steps, band 2

```
 1 x··· ··x· ··x· ····
```
- `downbeat` — 1
- `offbeat` — 7, 11
- tightest re-strike — `0.35` Sec · derived from 4 steps at 172 BPM

**On this box** — Deluge

- `downbeat` → `velocity` 112 on step 1

**Return** — 16 steps, band 3

```
 1 x··· ··x· ··x· x·x·
```
- `downbeat` — 1, 13
- `offbeat` — 7, 11, 15
- tightest re-strike — `0.17` Sec · derived from 2 steps at 172 BPM

**On this box** — Deluge

- `downbeat` → `velocity` 112 on steps 1, 13

### `kick` — Deluge · Track 2

**Synth kick on a kit row — sine, fast pitch drop, decimated** — settings in Sound design

**Build** — 16 steps, band 1

```
 1 x··· ···· ··x· ····
```
- `downbeat` — 1
- `offbeat` — 11

**Drop** — 16 steps, band 2

```
 1 x··· ··x· ··x· ····
```
- `downbeat` — 1
- `offbeat` — 7, 11

**Return** — 16 steps, band 3

```
 1 x··x ··x· ··x· ·x··
```
- `accent` — 1 (vel 110)
- `ghost` — 4, 14 (all vel 44)
- `offbeat` — 7, 11

**On this box** — Deluge

- `accent` → `velocity` 127 on step 1
  - ↳ hint: Hold the note pad, turn (SELECT)

**Outro** — 16 steps, band 0

```
 1 x··· ···· ···· ····
```
- `downbeat` — 1

### `snare` — Deluge · Track 3

**Snare with the treble lifted, rolling on the fill** — settings in Sound design

**Drop** — 16 steps, band 2

```
 1 ···· ·x·· x··· ·x··
```
- `ghost` — 6, 14 (all vel 46)
- `downbeat` — 9

**Return** — 16 steps, band 3

```
 1 ···x ·x·· x··· ·x·x
```
- `ghost` — 4, 6, 14, 16 (all vel 44)
- `accent` — 9 (vel 108)

### `closed-hat` — Deluge · Track 4

**Closed hat with the bass rolled off** — settings in Sound design

**Intro, Outro** — 16 steps, band 0

```
 1 ··x· ··x· ··x· ··x·
```
- `offbeat` — 3, 7, 11, 15

**On this box** — Deluge

- `offbeat` → `velocity` 88 on steps 3, 7, 11, 15

**Build** — 16 steps, band 1

```
 1 ··x· x·x· ··x· x·x·
```
- `offbeat` — 3, 7, 11, 15
- `downbeat` — 5, 13

**On this box** — Deluge

- `offbeat` → `velocity` 88 on steps 3, 7, 11, 15

**Drop** — 16 steps, band 2

```
 1 x·x· x·x· x·x· x·x·
```
- `downbeat` — 1, 5, 9, 13
- `offbeat` — 3, 7, 11, 15

**On this box** — Deluge

- `offbeat` → `velocity` 88 on steps 3, 7, 11, 15

**Return** — 16 steps, band 3

```
 1 xxx· xxx· xxx· xxx·
```
- `downbeat` — 1, 5, 9, 13
- `ghost` — 2, 6, 10, 14 (all vel 40)
- `offbeat` — 3, 7, 11, 15

**On this box** — Deluge

- `offbeat` → `velocity` 88 on steps 3, 7, 11, 15

### `ghost-perc` — Deluge · Track 5

**Quiet percussion filling the gaps** — settings in Sound design

**Drop** — 16 steps, band 2

```
 1 ·x·x ···x ·x·x ···x
```
- `ghost` — 2, 4, 8, 10, 12, 16 (all vel 42)

**On this box** — Deluge

- `ghost` → `probability` 45 on steps 2, 4, 8, 10, 12, 16
  - ↳ hint: Hold pad, turn (SELECT) anticlockwise

**Return** — 16 steps, band 3

```
 1 ·x·x ·x·x ·x·x ·x·x
```
- `ghost` — 2, 4, 6, 8, 10, 12, 14, 16 (all vel 40)

**On this box** — Deluge

- `ghost` → `probability` 45 on steps 2, 4, 6, 8, 10, 12, 14, 16
  - ↳ hint: Hold pad, turn (SELECT) anticlockwise

### `open-hat` — Deluge · Track 6

**Open hat filtered down, decaying into the bar** — settings in Sound design

**Drop** — 16 steps, band 2

```
 1 ··x· ··x· ···· ··x·
```
- `offbeat` — 3, 7, 15

**On this box** — Deluge

- `offbeat` → `velocity` 96 on steps 3, 7, 15

**Return** — 16 steps, band 3

```
 1 ··x· ··x· ··x· ··x·
```
- `offbeat` — 3, 7, 11, 15

**On this box** — Deluge

- `offbeat` → `velocity` 96 on steps 3, 7, 11, 15

### `pad` — Deluge · Track 7


**The hook is the pattern** — see Hook above for its steps and what each one carries. Nothing separate to program here.

## 6. Sound design

### Deluge

*This block draws on the Deluge Official Guidebook OS 4.1 (OLED), pp.18-229 and the Deluge community firmware release_1_2_1; its values are starting points.*

**Content**

- Ships a factory library on the supplied SD card — look in SAMPLES/ARTISTS and SAMPLES/DRUMS. p.12 marks both folders as supplied samples and never names one of them, so the Source line below says what the part needs rather than naming a file.

**Note names**

- Middle C is C4 here and C3 to this box, so a note printed here is an octave lower in the box's own naming: C4 here is its C3. A MIDI number, where one is printed, is the same on both.

**Song-wide**

One setting for the whole song — set it once, not once per part below.

- **SWING** `50` % (1…99 %)
  - ↳ note: 50 is off, above is late, below is early — song-wide, not per clip
  - ↳ hint: Hold [SHIFT], turn (TEMPO)

#### Track 1 — `sub`: Sine sub with the top end cut away

- **CLIP TYPE** `Synth`
  - ↳ hint: From clip view: [SHIFT] + [KIT] or [SYNTH]
- **OSC 1 TYPE** `Sine`
- **LPF FREQ** `16` (0…49)
  - ↳ hint: Hold [SHIFT], press the FREQUENCY pad
- **ENV 1 ATTACK** `1` (0…50)
  - ↳ note: the menus recommend at least 1; 0 is likely to click
  - ↳ hint: Press (SELECT), ENV 1, then ATTACK / DECAY
- **ENV 1 DECAY** `26` (0…50)
- **ENV 1 SUSTAIN** `44` (0…50)
  - ↳ note: 0 decays away to nothing; 50 does not decay at all
- **ENV 1 RELEASE** `12` (0…50)
- **EQ TREBLE AMOUNT** `17` (0…50)
  - ↳ note: 25 is neutral; below cuts
- **EQ BASS AMOUNT** `31` (0…50)

#### Track 2 — `kick`: Synth kick on a kit row — sine, fast pitch drop, decimated

- **CLIP TYPE** `Kit`
  - ↳ hint: From clip view: [SHIFT] + [KIT] or [SYNTH]
- **OSC 1 TYPE** `Sine`
  - ↳ hint: [AUDITION] + [SYNTH] makes a synth row
- **ENV 1 ATTACK** `1` (0…50)
  - ↳ note: the menus recommend at least 1; 0 is likely to click
  - ↳ hint: Press (SELECT), ENV 1, then ATTACK / DECAY
- **ENV 1 DECAY** `17` (0…50)
  - ↳ note: 0 is the shortest decay, 50 the longest
- **ENV 1 SUSTAIN** `0` (0…50)
  - ↳ note: 0 decays away to nothing, which is what a drum does
- **ENV 1 RELEASE** `5` (0…50)
- **ENV 2 ATTACK** `1` (0…50)
- **ENV 2 DECAY** `6` (0…50)
  - ↳ note: this is how fast the pitch falls
- **ENV 2 SUSTAIN** `25` (0…50)
  - ↳ note: p.125: on a pitch destination 25 is the note itself, and below 25 goes flat
- Modulation — `ENV 2` → `Pitch / Transpose: Overall` · **DEPTH** `22` (-50…50)
  - ↳ neutral: `0` is no modulation
  - ↳ note: Positive lifts the attack above the note
  - ↳ hint: In PITCH, pick ENV 2
- **DECIMATION** `12` (0…50)
- **BITCRUSH** `6` (0…50)
- **EQ BASS AMOUNT** `33` (0…50)
  - ↳ note: 25 is neutral; above boosts

#### Track 3 — `snare`: Snare with the treble lifted, rolling on the fill

Source — A 909-style snare — noise and crack over a short body, dry

- **CLIP TYPE** `Kit`
  - ↳ hint: From clip view: [SHIFT] + [KIT] or [SYNTH]
- **OSC 1 TYPE** `Sample`
- **EQ TREBLE AMOUNT** `34` (0…50)
- **EQ TREBLE FREQUENCY** `30` (0…50)
- **REVERB AMOUNT** `8` (0…50)

#### Track 4 — `closed-hat`: Closed hat with the bass rolled off

Source — An 808-style closed hat — a short metallic tick under 150 ms, dry

- **CLIP TYPE** `Kit`
  - ↳ hint: From clip view: [SHIFT] + [KIT] or [SYNTH]
- **OSC 1 TYPE** `Sample`
- **REPEAT MODE** `CUT`
- **EQ TREBLE AMOUNT** `32` (0…50)
- **EQ BASS AMOUNT** `18` (0…50)

#### Track 5 — `ghost-perc`: Quiet percussion filling the gaps

Source — A 707-style shaker or tambourine — a soft tick under 100 ms

- **CLIP TYPE** `Kit`
  - ↳ hint: From clip view: [SHIFT] + [KIT] or [SYNTH]
- **OSC 1 TYPE** `Sample`
- **REVERB AMOUNT** `12` (0…50)
- **EQ BASS AMOUNT** `20` (0…50)

#### Track 6 — `open-hat`: Open hat filtered down, decaying into the bar

Source — A 909-style open hat — a real sampled tail to gate

- **CLIP TYPE** `Kit`
  - ↳ hint: From clip view: [SHIFT] + [KIT] or [SYNTH]
- **OSC 1 TYPE** `Sample`
- **LPF MODE** `24dB/Octave`
- **EQ TREBLE AMOUNT** `20` (0…50)
- **REVERB AMOUNT** `10` (0…50)

#### Track 7 — `pad`: Analog saw pad, slow chorus, wide reverb send

Chord voicing — 3 notes sounding at once on this one voice. It needs a genuinely polyphonic voice, not 3 separate ones.

- **CLIP TYPE** `Synth`
  - ↳ hint: From clip view: [SHIFT] + [KIT] or [SYNTH]
- **OSC 1 TYPE** `Analog Saw`
- **LPF FREQ** `24` (0…49)
  - ↳ hint: Hold [SHIFT], press the FREQUENCY pad
- **ENV 1 ATTACK** `20` (0…50)
  - ↳ hint: Press (SELECT), ENV 1, then ATTACK / DECAY
- **ENV 1 DECAY** `28` (0…50)
  - ↳ note: the pad arrives rather than starting
- **ENV 1 SUSTAIN** `46` (0…50)
  - ↳ note: 0 decays away to nothing; 50 does not decay at all
- **ENV 1 RELEASE** `34` (0…50)
- **MOD FX TYPE** `CHORUS`
- **MOD FX RATE** `9` (0…50)
- **REVERB AMOUNT** `27` (0…50)
- **EQ TREBLE AMOUNT** `27` (0…50)

## 7. Finishing

**Sidechain**

The Deluge ducks from its own parts, and it is the only box here.

**Master FX**

The Deluge carries BITCRUSH, DECIMATION, MOD FX RATE, MOD FX TYPE and REVERB AMOUNT in its recipes; it is the only box here, so that is the whole master chain.

**Tuning** — derived from this arrangement

Loop Return with the Deluge's kick and sub. Sweep the kick's tuning slowly; stop where its tail adds weight instead of beating against the sub, then check the full progression in G minor before committing.

**Arrangement variations**

Sections that program identically, part for part — build one and copy it:

- **band 0** — Intro · 2 parts, 5 strikes
- **band 1** — Build · 3 parts, 10 strikes
- **band 2** — Drop · 6 parts, 26 strikes
- **band 0** — Breakdown · 1 part, 1 strike · differs on `closed-hat`
- **band 3** — Return · 6 parts, 39 strikes
- **band 0** — Outro · 3 parts, 6 strikes · differs on `kick`

`pad` is held rather than struck, so there is no grid here to vary.
