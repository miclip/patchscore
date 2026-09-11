# Hard Techno

Values are starting points — dial them to taste. Where a mood knob or the key moved one you see
the move (`52 → 45`). Every value carries its range — `38 (0…100)` — so you can tell at a glance
whether the screen in front of you is the one the line is about.

## 1. Song

- **BPM** 150 (template range 145…160)
- **Key** D minor (a reroll may pick F minor, G minor)
- **Harmonic cycle** 4 bars

| Degree | Bars |
| --- | ---: |
| i | 4 |

**Arrangement** — 120 bars total

```
            Intro   Build Drop            Breakdown Rebuild Peak            Outro
            16b     8b    32b             8b        8b      32b             16b
energy      0.2     0.6   0.85            0.35      0.6     1               0.15

kick        ███████ █████ ███████████████ █████████ ███████ ███████████████ ███████
sub         ███████ █████ ███████████████ █████████ ███████ ███████████████ ███████
closed-hat  ███████ █████ ███████████████ █████████ ███████ ███████████████ ███████
lead        ███████ █████ ███████████████ █████████ ███████ ███████████████ ███████
snare       ███████ █████ ███████████████ █████████ ███████ ███████████████ ███████
tom         ███████ █████ ███████████████ █████████ ███████ ███████████████ ███████
open-hat    ███████ █████ ███████████████ █████████ ███████ ███████████████ ███████
ride        ███████ █████ ███████████████ █████████ ███████ ███████████████ ███████
impact      ······· ····· ███████████████ ········· ······· ███████████████ ·······
riser       ······· █████ ··············· ········· ███████ ··············· ·······
```

## 2. Voice assignment

- **`kick`** → Deluge · Track 1 — *Synth kick on a kit row — sine, fast pitch drop, decimated*
  - p1 · exact `hard` · every section
- **`sub`** → Deluge · Track 2 — *Sine sub with the top end cut away*
  - p1 · exact `dark` · every section
- **`closed-hat`** → Deluge · Track 3 — *Closed hat with the bass rolled off*
  - p2 · substituted — asked `bright`, authored `clean` · every section
- **`lead`** → Deluge · Track 4 — *Analog saw lead, treble up, delay trailing behind*
  - p2 · substituted — asked `dirty`, authored `bright` · every section
- **`snare`** → Deluge · Track 5 — *Snare with the treble lifted, rolling on the fill*
  - p3 · substituted — asked `hard`, authored `bright` · every section
- **`tom`** → Deluge · Track 6 — *Synth tom on a kit row — triangle with the pitch falling into the body*
  - p3 · substituted — asked `hard`, authored `dark` · every section
- **`open-hat`** → Deluge · Track 7 — *Open hat filtered down, decaying into the bar*
  - p4 · substituted — asked `dirty`, authored `dark` · every section
- **`ride`** → Deluge · Track 8 — *Analog square let ring, flanged so the partials beat against each other*
  - p4 · exact `bright` · every section
- **`impact`** → Deluge · Track 9 — *Downbeat impact, decimated, long reverb send*
  - p5 · exact `hard` · Drop, Peak
- **`riser`** → Deluge · Track 10 — *Saw riser, ENV 2 opening the filter, thrown into the reverb*
  - p5 · exact `bright` · Build, Rebuild

### Gaps

None.

## 3. Rig integration

**Clock source** — Deluge over `midi-din`, carrying 10 parts. Nothing else is here to sync to it.

- Why this box — it is the only box here that can send clock

- **Deluge** — groovebox · 10 parts
  - clock: sends clock · midi-din/usb/analog-clock
  - audio: stereo main out · audio in
  - mixer: 10 parts, no individual outs: one stereo channel for all

## 4. Hook

Steps are sixteenths, counted from the start of the hook: 16 to a bar, so step 33 is bar 3.
Notes sharing a step are one chord and share a line.

Names are spelled for the key, so F minor gets `Eb`; a name in brackets is the same pitch as
a sharps-only box shows it, and appears only where it differs. Octaves put middle C at C4,
which not every maker agrees with — the MIDI number is the form nothing disagrees about.

Where a role has more than one hook authored, rerolling the seed picks a different one.

### `lead` — Deluge · Track 4

**Analog saw lead, treble up, delay trailing behind** — settings in Sound design

2 bars in D minor.

Note length is set per note here — `the note’s extent on the grid — hold its start pad and press its end pad`, in grid steps at the current zoom.

- bar 1 · step 3 · sounds for 2 steps · `D4` · root · MIDI 62
- bar 1 · step 7 · sounds for 2 steps · `D4` · root · MIDI 62
- bar 1 · step 11 · sounds for 2 steps · `A4` · 5th · MIDI 69
- bar 1 · step 15 · sounds for 2 steps · `D5` · root · MIDI 74
- bar 2 · step 19 · sounds for 2 steps · `D4` · root · MIDI 62
- bar 2 · step 23 · sounds for 2 steps · `F4` · 3rd · MIDI 65
- bar 2 · step 27 · sounds for 2 steps · `A4` · 5th · MIDI 69
- bar 2 · step 29 · sounds for 1 step · `F4` · 3rd · MIDI 65
- bar 2 · step 31 · sounds for 2 steps · `D4` · root · MIDI 62

## 5. Step programming

### `kick` — Deluge · Track 1

**Synth kick on a kit row — sine, fast pitch drop, decimated** — settings in Sound design

**Intro, Outro** — 16 steps, band 0

```
 1 x··· x··· x··· x···
```
- `downbeat` — 1, 5, 9, 13

**Build, Rebuild** — 16 steps, band 2

```
 1 x··· x··· x··x x··x
```
- `downbeat` — 1, 5, 9, 13
- `ghost` — 12, 16 (all vel 55)

**Drop, Peak** — 16 steps, band 3

```
 1 x··· x··· x··x x·xx
```
- `accent` — 1 (vel 116)
- `downbeat` — 5, 9, 13
- `ghost` — 12 (vel 55)
- `fill` — 15, 16

**On this box** — Deluge

- `accent` → `velocity` 127 on step 1
  - ↳ hint: Hold the note pad, turn (SELECT)

**Breakdown** — 16 steps, band 1

```
 1 x··· x··· x··· x··x
```
- `downbeat` — 1, 5, 9, 13
- `ghost` — 16 (vel 55)

### `sub` — Deluge · Track 2

**Sine sub with the top end cut away** — settings in Sound design

**Note** — `D1` · MIDI 26

**Intro, Outro** — 16 steps, band 0

```
 1 x··· ···· x··· ····
```
- `downbeat` — 1, 9

**On this box** — Deluge

- `downbeat` → `velocity` 112 on steps 1, 9

**Build, Rebuild** — 16 steps, band 2

```
 1 x··· x·x· x··· x·x·
```
- `downbeat` — 1, 5, 9, 13
- `offbeat` — 7, 15

**On this box** — Deluge

- `downbeat` → `velocity` 112 on steps 1, 5, 9, 13

**Drop, Peak** — 16 steps, band 3

```
 1 x·x· x·x· x·x· x·x·
```
- `downbeat` — 1, 5, 9, 13
- `offbeat` — 3, 7, 11, 15

**On this box** — Deluge

- `downbeat` → `velocity` 112 on steps 1, 5, 9, 13

**Breakdown** — 16 steps, band 1

```
 1 x··· x··· x··· x···
```
- `downbeat` — 1, 5, 9, 13

**On this box** — Deluge

- `downbeat` → `velocity` 112 on steps 1, 5, 9, 13

### `closed-hat` — Deluge · Track 3

**Closed hat with the bass rolled off** — settings in Sound design

**Intro, Outro** — 16 steps, band 0

```
 1 ··x· ··x· ··x· ··x·
```
- `offbeat` — 3, 7, 11, 15

**On this box** — Deluge

- `offbeat` → `velocity` 88 on steps 3, 7, 11, 15

**Build, Rebuild** — 16 steps, band 2

```
 1 ·xxx ·xxx ·xxx ·xxx
```
- `ghost` — 2, 4, 6, 8, 10, 12, 14, 16 (all vel 48)
- `offbeat` — 3, 7, 11, 15

**On this box** — Deluge

- `offbeat` → `velocity` 88 on steps 3, 7, 11, 15

**Drop, Peak** — 16 steps, band 3

```
 1 xxxx xxxx xxxx xxxx
```
- `downbeat` — 1, 5, 9, 13
- `ghost` — 2, 4, 6, 8, 10, 12, 14, 16 (all vel 44)
- `offbeat` — 3, 7, 11
- `accent` — 15 (vel 110)

**On this box** — Deluge

- `offbeat` → `velocity` 88 on steps 3, 7, 11

**Breakdown** — 16 steps, band 1

```
 1 ·xx· ·xx· ·xx· ·xx·
```
- `ghost` — 2, 6, 10, 14 (all vel 48)
- `offbeat` — 3, 7, 11, 15

**On this box** — Deluge

- `offbeat` → `velocity` 88 on steps 3, 7, 11, 15

### `lead` — Deluge · Track 4


**The hook is the pattern** — see Hook above for its steps and what each one carries. Nothing separate to program here.

### `snare` — Deluge · Track 5

**Snare with the treble lifted, rolling on the fill** — settings in Sound design

**Intro, Outro** — 16 steps, band 0

```
 1 ···· ···· ···· x···
```
- `backbeat` — 13

**On this box** — Deluge

- `backbeat` → `velocity` 118 on step 13

**Build, Rebuild** — 16 steps, band 2

```
 1 ···· x··· ···x x···
```
- `backbeat` — 5, 13
- `ghost` — 12 (vel 50)

**On this box** — Deluge

- `backbeat` → `velocity` 118 on steps 5, 13

**Drop, Peak** — 16 steps, band 3

```
 1 ···· x··x ···· xxxx
```
- `backbeat` — 5
- `ghost` — 8 (vel 50)
- `accent` — 13 (vel 114)
- `fill` — 14, 15, 16

**On this box** — Deluge

- `backbeat` → `velocity` 118 on step 5
- `fill` → `iteration` 2 of 4 on steps 14, 15, 16
  - ↳ hint: Hold pad, turn (SELECT) past 100%

**Breakdown** — 16 steps, band 1

```
 1 ···· x··· ···· x···
```
- `backbeat` — 5, 13

**On this box** — Deluge

- `backbeat` → `velocity` 118 on steps 5, 13

### `tom` — Deluge · Track 6

**Synth tom on a kit row — triangle with the pitch falling into the body** — settings in Sound design

**Intro, Outro** — 32 steps, band 0

```
 1 ···· ···· ···· ····
17 ···· ···· x··· ··x·
```
- `downbeat` — 25
- `offbeat` — 31

**Build, Rebuild** — 32 steps, band 2

```
 1 ···· ···· x·x· ·xx·
17 ···· ···· x·x· ·xx·
```
- `downbeat` — 9, 25
- `offbeat` — 11, 15, 27, 31
- `ghost` — 14, 30 (all vel 52)

**Drop, Peak** — 32 steps, band 3

```
 1 ···· ·xx· xxx· ·xx·
17 ···· ·xx· xxx· xxxx
```
- `ghost` — 6, 10, 14, 22, 26 (all vel 52)
- `offbeat` — 7, 11, 15, 23, 27
- `downbeat` — 9, 25
- `fill` — 29, 30, 32
- `accent` — 31 (vel 112)

**On this box** — Deluge

- `fill` → `velocity` 112 on steps 29, 30, 32
  - ↳ hint: Hold the note pad, turn (SELECT)
- `accent` → `velocity` 124 on step 31
  - ↳ hint: Hold the note pad, turn (SELECT)

**Breakdown** — 32 steps, band 1

```
 1 ···· ···· x··· ··x·
17 ···· ···· x··· ··x·
```
- `downbeat` — 9, 25
- `offbeat` — 15, 31

### `open-hat` — Deluge · Track 7

**Open hat filtered down, decaying into the bar** — settings in Sound design

**Intro, Outro** — 16 steps, band 0

```
 1 ···· ··x· ···· ··x·
```
- `offbeat` — 7, 15

**On this box** — Deluge

- `offbeat` → `velocity` 96 on steps 7, 15

**Build, Rebuild** — 16 steps, band 2

```
 1 ··x· ··x· ··x· x·x·
```
- `offbeat` — 3, 7, 11, 15
- `downbeat` — 13

**On this box** — Deluge

- `offbeat` → `velocity` 96 on steps 3, 7, 11, 15

**Drop, Peak** — 16 steps, band 3

```
 1 ··x· x·x· ··x· x·xx
```
- `offbeat` — 3, 7, 11
- `downbeat` — 5, 13
- `accent` — 15 (vel 108)
- `ghost` — 16 (vel 46)

**On this box** — Deluge

- `offbeat` → `velocity` 96 on steps 3, 7, 11

**Breakdown** — 16 steps, band 1

```
 1 ··x· ··x· ··x· ··x·
```
- `offbeat` — 3, 7, 11, 15

**On this box** — Deluge

- `offbeat` → `velocity` 96 on steps 3, 7, 11, 15

### `ride` — Deluge · Track 8

**Analog square let ring, flanged so the partials beat against each other** — settings in Sound design

**Intro, Outro** — 16 steps, band 0

```
 1 x··· ···· x··· ····
```
- `downbeat` — 1, 9

**Build, Rebuild** — 16 steps, band 2

```
 1 x·x· x·x· x·x· x·x·
```
- `downbeat` — 1, 5, 9, 13
- `offbeat` — 3, 7, 11, 15

**On this box** — Deluge

- `offbeat` → `velocity` 92 on steps 3, 7, 11, 15
  - ↳ hint: Hold the note pad, turn (SELECT)

**Drop, Peak** — 16 steps, band 3

```
 1 xxx· xxx· xxx· xxx·
```
- `downbeat` — 1, 5, 9, 13
- `ghost` — 2, 6, 10, 14 (all vel 46)
- `offbeat` — 3, 7, 11
- `accent` — 15 (vel 108)

**On this box** — Deluge

- `offbeat` → `velocity` 92 on steps 3, 7, 11
  - ↳ hint: Hold the note pad, turn (SELECT)
- `accent` → `velocity` 116 on step 15
  - ↳ hint: Hold the note pad, turn (SELECT)

**Breakdown** — 16 steps, band 1

```
 1 x··· x··· x··· x···
```
- `downbeat` — 1, 5, 9, 13

### `impact` — Deluge · Track 9

**Downbeat impact, decimated, long reverb send** — settings in Sound design

**Drop, Peak** — 64 steps, band 3

```
 1 x··· ···· ···· ····
17 x··· ···· x··· ····
33 x··· ···· ···· ····
49 x··· ···· x··· ····
```
- `first-hit` — 1
- `downbeat` — 17, 25, 49, 57
- `accent` — 33 (vel 116)

**On this box** — Deluge

- `first-hit` → `velocity` 127 on step 1

### `riser` — Deluge · Track 10

**Saw riser, ENV 2 opening the filter, thrown into the reverb** — settings in Sound design

**One trig, not a figure** — the direction authors no grid for this part. Place its single trig so the gesture arrives at the change.

## 6. Sound design

### Deluge

*This block draws on the Deluge Official Guidebook OS 4.1 (OLED), pp.18-225 and the Deluge community firmware release_1_2_1; its values are starting points.*

**Content**

- Ships a factory library on the supplied SD card — look in SAMPLES/ARTISTS and SAMPLES/DRUMS. p.12 marks both folders as supplied samples and never names one of them, so the Source line below says what the part needs rather than naming a file.

**Song-wide**

One setting for the whole song — set it once, not once per part below.

- **SWING** `50` % (1…99 %)
  - ↳ note: 50 is off, above is late, below is early — song-wide, not per clip
  - ↳ hint: Hold [SHIFT], turn (TEMPO)

#### Track 1 — `kick`: Synth kick on a kit row — sine, fast pitch drop, decimated

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

#### Track 2 — `sub`: Sine sub with the top end cut away

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

#### Track 3 — `closed-hat`: Closed hat with the bass rolled off

Source — An 808-style closed hat — a short metallic tick under 150 ms, dry

- **CLIP TYPE** `Kit`
  - ↳ hint: From clip view: [SHIFT] + [KIT] or [SYNTH]
- **OSC 1 TYPE** `Sample`
- **REPEAT MODE** `CUT`
- **EQ TREBLE AMOUNT** `32` (0…50)
- **EQ BASS AMOUNT** `18` (0…50)

#### Track 4 — `lead`: Analog saw lead, treble up, delay trailing behind

- **CLIP TYPE** `Synth`
  - ↳ hint: From clip view: [SHIFT] + [KIT] or [SYNTH]
- **OSC 1 TYPE** `Analog Saw`
- **LPF MODE** `12dB/Octave`
- **LPF FREQ** `36` (0…49)
  - ↳ hint: Hold [SHIFT], press the FREQUENCY pad
- **ENV 1 ATTACK** `3` (0…50)
  - ↳ note: the menus recommend at least 1; 0 is likely to click
  - ↳ hint: Press (SELECT), ENV 1, then ATTACK / DECAY
- **ENV 1 DECAY** `22` (0…50)
- **ENV 1 SUSTAIN** `38` (0…50)
  - ↳ note: 0 decays away to nothing; 50 does not decay at all
- **ENV 1 RELEASE** `14` (0…50)
- **EQ TREBLE AMOUNT** `33` (0…50)
- **DELAY AMOUNT** `14` (0…50)
- **DELAY RATE** `24` (0…50)

#### Track 5 — `snare`: Snare with the treble lifted, rolling on the fill

Source — A 909-style snare — noise and crack over a short body, dry

- **CLIP TYPE** `Kit`
  - ↳ hint: From clip view: [SHIFT] + [KIT] or [SYNTH]
- **OSC 1 TYPE** `Sample`
- **EQ TREBLE AMOUNT** `34` (0…50)
- **EQ TREBLE FREQUENCY** `30` (0…50)
- **REVERB AMOUNT** `8` (0…50)

#### Track 6 — `tom`: Synth tom on a kit row — triangle with the pitch falling into the body

- **CLIP TYPE** `Kit`
  - ↳ hint: From clip view: [SHIFT] + [KIT] or [SYNTH]
- **OSC 1 TYPE** `Triangle`
  - ↳ hint: [AUDITION] + [SYNTH] makes a synth row
- **ENV 1 ATTACK** `1` (0…50)
  - ↳ note: the menus recommend at least 1; 0 is likely to click
- **ENV 1 DECAY** `28` (0…50)
- **ENV 1 SUSTAIN** `0` (0…50)
  - ↳ note: 0 decays away to nothing, which is what a drum does
- **ENV 1 RELEASE** `9` (0…50)
- **ENV 2 ATTACK** `1` (0…50)
- **ENV 2 DECAY** `13` (0…50)
  - ↳ note: twice the kick’s, so the pitch falls into the body rather than through it
- **ENV 2 SUSTAIN** `25` (0…50)
  - ↳ note: p.125: on a pitch destination 25 is the note itself, so the tom settles where it was played
- Modulation — `ENV 2` → `Pitch / Transpose: Overall` · **DEPTH** `11` (-50…50)
  - ↳ neutral: `0` is no modulation
  - ↳ note: Half the kick’s lift, since a tom falls a tone or two, not an octave
  - ↳ hint: In PITCH, pick ENV 2
- **EQ BASS AMOUNT** `31` (0…50)
  - ↳ note: 25 is neutral; above boosts
- **EQ TREBLE AMOUNT** `20` (0…50)
- **REVERB AMOUNT** `8` (0…50)

#### Track 7 — `open-hat`: Open hat filtered down, decaying into the bar

Source — A 909-style open hat — a real sampled tail to gate

- **CLIP TYPE** `Kit`
  - ↳ hint: From clip view: [SHIFT] + [KIT] or [SYNTH]
- **OSC 1 TYPE** `Sample`
- **LPF MODE** `24dB/Octave`
- **EQ TREBLE AMOUNT** `20` (0…50)
- **REVERB AMOUNT** `10` (0…50)

#### Track 8 — `ride`: Analog square let ring, flanged so the partials beat against each other

- **CLIP TYPE** `Kit`
  - ↳ hint: From clip view: [SHIFT] + [KIT] or [SYNTH]
- **OSC 1 TYPE** `Analog Square`
  - ↳ hint: [AUDITION] + [SYNTH] makes a synth row
- **ENV 1 ATTACK** `1` (0…50)
- **ENV 1 DECAY** `38` (0…50)
- **ENV 1 SUSTAIN** `0` (0…50)
- **ENV 1 RELEASE** `24` (0…50)
- **DECIMATION** `21` (0…50)
- **BITCRUSH** `11` (0…50)
- **MOD FX TYPE** `FLANGER`
- **MOD FX RATE** `9` (0…50)
  - ↳ note: Slower than the part, or the flanger becomes the rhythm
- **MOD FX FEEDBACK** `22` (0…50)
- **EQ TREBLE AMOUNT** `30` (0…50)
- **REVERB AMOUNT** `16` (0…50)

#### Track 9 — `impact`: Downbeat impact, decimated, long reverb send

Source — A one-shot with a big front — a crash, a gated slam

- **CLIP TYPE** `Kit`
  - ↳ hint: From clip view: [SHIFT] + [KIT] or [SYNTH]
- **OSC 1 TYPE** `Sample`
- **DECIMATION** `20` (0…50)
- **REVERB AMOUNT** `34` (0…50)
- **EQ BASS AMOUNT** `32` (0…50)

#### Track 10 — `riser`: Saw riser, ENV 2 opening the filter, thrown into the reverb

Routing — The climb is `ENV 2` on the low-pass rather than the note: p.122 ticks `ENV 2` against "LPF / HPF Frequency / Resonance", p.120 sets the depth — *"Depth can be positive and negative values"* — and p.125 says a sustain above 25 holds a non-volume destination above its knob setting instead of falling back. **Set the clip length to the build before you play it in.** p.60: the default clip length is one bar and [SHIFT] + (SCROLL) changes it, the display showing bars : beats : 16ths. A clip loops at its length, so a one-bar riser repeats sixteen times under a sixteen-bar build; at the build’s own length it climbs once. **How long the attack is in seconds is not something any source here prints**, so dial it against that bar count rather than against a number

- **CLIP TYPE** `Synth`
  - ↳ hint: From clip view: [SHIFT] + [KIT] or [SYNTH]
- **OSC 1 TYPE** `Saw`
- **LPF FREQ** `8` (0…49)
  - ↳ hint: Hold [SHIFT], press the FREQUENCY pad
- **ENV 2 ATTACK** `42` (0…50)
  - ↳ note: The climb. 50 is the longest attack the menu offers, in no stated unit
  - ↳ hint: In LPF FREQ, pick ENV 2
- **ENV 2 DECAY** `30` (0…50)
- **ENV 2 SUSTAIN** `50` (0…50)
  - ↳ note: p.125: 25 is the knob setting untouched, so above it the filter holds open
- Modulation — `ENV 2` → `LPF: FREQUENCY` · **DEPTH** `38` (-50…50)
  - ↳ neutral: `0` is no modulation
  - ↳ note: Positive opens the filter as the envelope rises
  - ↳ hint: In LPF FREQ, pick ENV 2
- **EQ TREBLE AMOUNT** `35` (0…50)
- **REVERB AMOUNT** `23` (0…50)
- **DELAY AMOUNT** `16` (0…50)

## 7. Finishing

**Sidechain**

The Deluge ducks from its own parts, and it is the only box here.

**Master FX**

The Deluge carries BITCRUSH, DECIMATION, DELAY AMOUNT, DELAY RATE, MOD FX FEEDBACK, MOD FX RATE, MOD FX TYPE and REVERB AMOUNT in its recipes; it is the only box here, so that is the whole master chain.

**Tuning** — derived from this arrangement

Loop Peak with the Deluge's kick and sub. Sweep the kick's tuning slowly; stop where its tail adds weight instead of beating against the sub, then check the full progression in D minor before committing.

**Arrangement variations**

Sections that program identically, part for part — build one and copy it:

- **band 0** — Intro, Outro · 7 parts, 17 strikes
- **band 2** — Build, Rebuild · 7 parts, 48 strikes
- **band 3** — Drop, Peak · 8 parts, 78 strikes
- **band 1** — Breakdown · 7 parts, 31 strikes

`lead` and `riser` have no pattern authored at any band, so nothing here varies for them.
