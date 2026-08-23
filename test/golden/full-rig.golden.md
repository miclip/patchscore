# Industrial Techno

Values are starting points — dial them to taste. Where a number came straight off the manual
or off a unit it says which, and where a mood knob moved it you see the move (`52 → 45`) and
the knob that did it. Every value carries its range — `38 (0…100)` — so you can tell at a
glance whether the screen in front of you is the one the line is about.

## 1. Song

- **BPM** 134 (template range 130…142)
- **Key** F minor (a reroll may pick A minor, C minor)
- **Harmonic cycle** 8 bars

| Degree | Bars |
| --- | ---: |
| i | 4 |
| VI | 2 |
| VII | 2 |

**Arrangement** — 128 bars total

| Section | Bars | Energy |
| --- | ---: | --- |
| Intro | 16 | `██········` 0.15 |
| Build | 16 | `█████·····` 0.45 |
| Drop | 32 | `█████████·` 0.9 |
| Breakdown | 16 | `███·······` 0.3 |
| Peak | 32 | `██████████` 1 |
| Outro | 16 | `██········` 0.2 |

## 2. Voice assignment

- **`kick`** → Tracker Mini · Track 1 — *Tight one-shot kick, tuned down, no tail*
  - p1 · exact `hard` · every section
- **`sub`** → Deluge · Track 1 — *Sine sub with the top end cut away*
  - p1 · exact `dark` · every section
- **`bass-mid`** → Deluge · Track 2 — *Analog saw bass through the drive filter, crushed*
  - p2 · exact `dirty` · every section
- **`clap`** → TR-1000 · HC — *Wide clap sitting on top of the snare*
  - p2 · exact `bright` · every section
- **`closed-hat`** → TR-1000 · CH — *Grainy CR-78 hat with a metallic edge*
  - p2 · exact `dirty` · every section
- **`open-hat`** → TR-1000 · OH — *Dull open hat, more air than sizzle*
  - p3 · exact `dark` · every section
- **`stab`** → Deluge · Track 3 — *Square stab through a fast phaser*
  - p3 · exact `hard` · every section
- **`impact`** → TR-1000 · CC — *Crash marking the top of a section*
  - p4 · exact `hard` · Drop, Peak
- **`pad`** → Deluge · Track 4 — *Wavetable pad, slow chorus, wide reverb send*
  - p4 · substituted — asked `dark`, authored `soft` · every section
- **`riser`** → Deluge · Track 5 — *Saw riser, top end open, thrown into the reverb*
  - p4 · exact `bright` · Build, Breakdown
- **`noise`** → Deluge · Track 6 — *Crushed noise wash under the drums*
  - p5, optional · exact `dirty` · every section

### Gaps

These parts are **not** in the guide below. Nothing was invented to fill them.

- `metallic` `dark` (p3) — capable but unauthored — Tracker Mini (16 voices), TR-1000 RS/CC/RC, Deluge (24 voices) could carry it, dial it by ear

## 3. Rig integration

**Clock source** — Deluge over `midi-din`, carrying 6 parts. Sync everything else to it.

- **Tracker Mini** — groovebox · 1 part
  - clock: sends clock · midi-din/usb
  - audio: stereo main out · USB audio · audio in
  - mixer: 1 part, no individual outs: one stereo channel for all
- **TR-1000** — drum-machine · 4 parts
  - clock: sends clock · midi-din/din-sync/usb/analog-clock/trigger
  - audio: stereo main out · 10 individual outs · USB audio · audio in
  - mixer: 4 parts, 10 individual outs: one channel each
- **Deluge** — groovebox · 6 parts
  - clock: sends clock · midi-din/usb/analog-clock
  - audio: stereo main out · audio in
  - mixer: 6 parts, no individual outs: one stereo channel for all

## 4. Hook

Each note is one line: **step, length, degree, note, MIDI**. The note is spelled correctly
for the key, so F minor gets `Eb` and E major gets `D#`; a name in brackets after it is the
same pitch as a sharps-only box shows it, and appears only where it differs. Octaves are
scientific pitch notation — middle C is C4 — which not every maker agrees with. The MIDI
number is the one form nothing disagrees about: check that if the screen says something else.

### `bass-mid` — `it-hook-bass-2` (2 authored for this role; the seed picked this one)

Deluge · Track 2

2 bars in F minor.

- step 1 · len 3 · degree 1 · `F1` · MIDI 29
- step 7 · len 2 · degree 1 · `F1` · MIDI 29
- step 11 · len 3 · degree 4 · `Bb1` (`A#1`) · MIDI 34
- step 15 · len 2 · degree 1 · `F1` · MIDI 29
- step 17 · len 3 · degree 1 · `F1` · MIDI 29
- step 23 · len 2 · degree 6 · `Db2` (`C#2`) · MIDI 37
- step 27 · len 4 · degree 5 · `C2` · MIDI 36

### `pad` — `it-hook-pad-1`

Deluge · Track 4

8 bars in F minor.

- step 1 · len 64 · degree 1 · `F3` · MIDI 53
- step 1 · len 64 · degree 3 · `Ab3` (`G#3`) · MIDI 56
- step 1 · len 64 · degree 5 · `C4` · MIDI 60
- step 65 · len 32 · degree 6 · `Db4` (`C#4`) · MIDI 61
- step 65 · len 32 · degree 1 · `F4` · MIDI 65
- step 65 · len 32 · degree 3 · `Ab4` (`G#4`) · MIDI 68
- step 97 · len 32 · degree 7 · `Eb4` (`D#4`) · MIDI 63
- step 97 · len 32 · degree 2 · `G4` · MIDI 67
- step 97 · len 32 · degree 4 · `Bb4` (`A#4`) · MIDI 70

### `stab` — `it-hook-stab-1`

Deluge · Track 3

4 bars in F minor.

- step 1 · len 2 · degree 1 · `F3` · MIDI 53
- step 1 · len 2 · degree 3 · `Ab3` (`G#3`) · MIDI 56
- step 1 · len 2 · degree 5 · `C4` · MIDI 60
- step 11 · len 1 · degree 1 · `F3` · MIDI 53
- step 11 · len 1 · degree 3 · `Ab3` (`G#3`) · MIDI 56
- step 11 · len 1 · degree 5 · `C4` · MIDI 60
- step 33 · len 2 · degree 1 · `F3` · MIDI 53
- step 33 · len 2 · degree 3 · `Ab3` (`G#3`) · MIDI 56
- step 33 · len 2 · degree 5 · `C4` · MIDI 60
- step 49 · len 3 · degree 5 · `C4` · MIDI 60
- step 49 · len 3 · degree 7 · `Eb4` (`D#4`) · MIDI 63
- step 49 · len 3 · degree 2 · `G4` · MIDI 67

## 5. Step programming

### `kick` — Tracker Mini · Track 1

**Intro, Build, Drop, Breakdown, Peak, Outro** — `it-kick-b2`, 16 steps, band 2

```
 1 x··· x··· x··· x··x
```
- `downbeat` — 1, 5, 9, 13
- `ghost` — 16 (vel 55)

### `sub` — Deluge · Track 1

**Intro, Build, Drop, Breakdown, Peak, Outro** — `it-sub-b2`, 16 steps, band 2

```
 1 x··· ··x· ··x· ··x·
```
- `downbeat` — 1
- `offbeat` — 7, 11, 15

**On this box** — Deluge

- `downbeat` → `velocity` 112 on step 1

### `bass-mid` — Deluge · Track 2

**Intro, Build, Drop, Breakdown, Peak, Outro** — `it-bass-mid-b2`, 32 steps, band 2

```
 1 x··· ··x· x··· ····
17 x··· ··x· x··· ····
```
- `downbeat` — 1, 9, 17, 25
- `offbeat` — 7, 23

**On this box** — Deluge

- `offbeat` → `probability` 90 on steps 7, 23
  - ↳ hint: Hold pad, turn (SELECT) anticlockwise

### `clap` — TR-1000 · HC

**Intro, Build, Drop, Breakdown, Peak, Outro** — `it-clap-b2`, 16 steps, band 2

```
 1 ···· x··· ···· x··x
```
- `backbeat` — 5, 13
- `ghost` — 16 (vel 50)

**On this box** — TR-1000

- `backbeat` → `accent` true on steps 5, 13
  - ↳ hint: ACCENT [STEP], then step keys

### `closed-hat` — TR-1000 · CH

**Intro, Build, Drop, Breakdown, Peak, Outro** — `it-closed-hat-b2`, 16 steps, band 2

```
 1 ·xx· ·xx· ·xx· ·xx·
```
- `ghost` — 2 (vel 45), 6 (vel 45), 10 (vel 45), 14 (vel 45)
- `offbeat` — 3, 7, 11, 15

**On this box** — TR-1000

- `offbeat` → `weak` true on steps 3, 7, 11, 15
  - ↳ hint: Hold [SHIFT], press step keys

### `open-hat` — TR-1000 · OH

**Intro, Build, Drop, Breakdown, Peak, Outro** — `it-open-hat-b2`, 16 steps, band 2

```
 1 ··x· ··x· ··x· ··x·
```
- `offbeat` — 3, 7, 11, 15

**On this box** — TR-1000

- `offbeat` → `weak` true on steps 3, 7, 11, 15
  - ↳ hint: Hold [SHIFT], press step keys

### `stab` — Deluge · Track 3

**Intro, Build, Drop, Breakdown, Peak, Outro** — `it-stab-b2`, 32 steps, band 2

```
 1 x··· ···· ··x· ····
17 x··· ···· ···· ····
```
- `downbeat` — 1, 17
- `offbeat` — 11

### `impact` — TR-1000 · CC

**Drop, Peak** — `it-impact-b2`, 64 steps, band 2

```
 1 x··· ···· ···· ····
17 x··· ···· ···· ····
33 x··· ···· ···· ····
49 x··· ···· ···· ····
```
- `first-hit` — 1
- `downbeat` — 17, 33, 49

**On this box** — TR-1000

- `first-hit` → `accent` true on step 1
  - ↳ hint: ACCENT [STEP], then step keys

### `pad` — Deluge · Track 4

**Intro, Build, Drop, Breakdown, Peak, Outro** — no pattern authored for `pad` at any band (asked for band 2). Nothing is programmed here.

### `riser` — Deluge · Track 5

**Build, Breakdown** — no pattern authored for `riser` at any band (asked for band 2). Nothing is programmed here.

### `noise` — Deluge · Track 6

**Intro, Build, Drop, Breakdown, Peak, Outro** — `it-noise-b2`, 32 steps, band 2

```
 1 x··· ···· ··x· ····
17 x··· ···· ··x· ····
```
- `downbeat` — 1, 17
- `offbeat` — 11, 27

## 6. Sound design

### Tracker Mini

*Values below cite Polyend Tracker Mini Manual, 2.2.1b.*

#### Track 1 — `kick`: Tight one-shot kick, tuned down, no tail

- **PLAY MODE** `1-Shot`
- **FILTER TYPE** `Low-pass`
- **TUNE** `-3` St (-24…24 St)
  - ↳ cite: range manual — Polyend Tracker Mini Manual 2.2.1b, p.116
- **CUTOFF** `74` % (0…100 %)
  - ↳ cite: range manual — Polyend Tracker Mini Manual 2.2.1b, p.117
- **OVERDRIVE** `18` % (0…100 %)
  - ↳ cite: range manual — Polyend Tracker Mini Manual 2.2.1b, p.120
- **ENV DECAY** `0.28` Sec (0…10 Sec)
  - ↳ cite: range manual — Polyend Tracker Mini Manual 2.2.1b, p.126

### TR-1000

*Values below cite TR-1000 Owner’s Manual, eng02.*

#### HC — `clap`: Wide clap sitting on top of the snare

- **GEN** `9X Hand Clap`
  - ↳ hint: Hold [SHIFT]+[GEN], select with [C6]
- **FILTER** `35` % (-100…100 %)
  - ↳ cite: range manual — TR-1000 Reference Manual (eng02) v1.13+, p.62
  - ↳ hint: Clap brightness
- **CLAPS** `70` % (0…100 %)
  - ↳ cite: range manual — TR-1000 Reference Manual (eng02) v1.13+, p.62
- **SPEED** `55` % (0…100 %)
  - ↳ cite: range manual — TR-1000 Reference Manual (eng02) v1.13+, p.62
- **MIX** `20` % (-100…100 %)
  - ↳ cite: range manual — TR-1000 Reference Manual (eng02) v1.13+, p.62
  - ↳ hint: Clap against tail, not layers
- **TAIL DCY** `62` % (0…100 %)
  - ↳ cite: range manual — TR-1000 Reference Manual (eng02) v1.13+, p.62

#### CH — `closed-hat`: Grainy CR-78 hat with a metallic edge

- **GEN** `CR78 HiHat`
  - ↳ hint: Hold [SHIFT]+[GEN], select with [C6]
- **TUNE** `-5` % (-100…100 %)
  - ↳ cite: range manual — TR-1000 Reference Manual (eng02) v1.13+, p.62
- **DECAY** `20` % (0…100 %)
  - ↳ cite: range manual — TR-1000 Reference Manual (eng02) v1.13+, p.62
- **METALLIC** `72` % (0…100 %)
  - ↳ cite: range manual — TR-1000 Reference Manual (eng02) v1.13+, p.62
  - ↳ hint: Metal-like overtone level

#### OH — `open-hat`: Dull open hat, more air than sizzle

- **GEN** `606 Open HiHat`
  - ↳ hint: Hold [SHIFT]+[GEN], select with [C6]
- **TUNE** `-18` % (-100…100 %)
  - ↳ cite: range manual — TR-1000 Reference Manual (eng02) v1.13+, p.62
- **DECAY** `64` % (0…100 %)
  - ↳ cite: range manual — TR-1000 Reference Manual (eng02) v1.13+, p.62
- **TONE** `-35` % (-100…100 %)
  - ↳ cite: range manual — TR-1000 Reference Manual (eng02) v1.13+, p.62
  - ↳ hint: Brightness of the cymbal

#### CC — `impact`: Crash marking the top of a section

- **GEN** `9X Crash Cymbal`
  - ↳ hint: Hold [SHIFT]+[GEN], select with [C6]
- **TUNE** `0` % (-100…100 %)
  - ↳ cite: range manual — TR-1000 Reference Manual (eng02) v1.13+, p.62
- **DECAY** `84` % (0…100 %)
  - ↳ cite: range manual — TR-1000 Reference Manual (eng02) v1.13+, p.62

### Deluge

*Values below cite Deluge Official Guidebook, OS 4.1 (OLED) + community firmware release_1_2_1 (Chopin).*

#### Track 1 — `sub`: Sine sub with the top end cut away

- **OSC TYPE** `Sine`
- **EQ TREBLE AMOUNT** `17` (0…50)
  - ↳ cite: range manual — Deluge Official Guidebook OS 4.1 (OLED), p.219
  - ↳ note: 25 is neutral; below cuts
- **EQ BASS AMOUNT** `31` (0…50)
  - ↳ cite: range manual — Deluge Official Guidebook OS 4.1 (OLED), p.219

#### Track 2 — `bass-mid`: Analog saw bass through the drive filter, crushed

- **OSC TYPE** `Analog Saw`
- **LPF MODE** `DRIVE`
- **DECIMATION** `14` (0…50)
  - ↳ cite: range manual — Deluge Official Guidebook OS 4.1 (OLED), p.217
- **BITCRUSH** `9` (0…50)
  - ↳ cite: range manual — Deluge Official Guidebook OS 4.1 (OLED), p.217
- **EQ BASS AMOUNT** `29` (0…50)
  - ↳ cite: range manual — Deluge Official Guidebook OS 4.1 (OLED), p.219

#### Track 3 — `stab`: Square stab through a fast phaser

- **OSC TYPE** `Analog Square`
- **MOD FX TYPE** `PHASER`
- **MOD FX RATE** `16` (0…50)
  - ↳ cite: range manual — Deluge Official Guidebook OS 4.1 (OLED), p.229
- **MOD FX FEEDBACK** `18` (0…50)
  - ↳ cite: range manual — Deluge Official Guidebook OS 4.1 (OLED), p.229
  - ↳ note: Flanger and phaser types only
- **EQ TREBLE AMOUNT** `29` (0…50)
  - ↳ cite: range manual — Deluge Official Guidebook OS 4.1 (OLED), p.219

#### Track 4 — `pad`: Wavetable pad, slow chorus, wide reverb send

- **OSC TYPE** `Wavetable`
- **MOD FX TYPE** `CHORUS`
- **MOD FX RATE** `9` (0…50)
  - ↳ cite: range manual — Deluge Official Guidebook OS 4.1 (OLED), p.229
- **REVERB AMOUNT** `27` (0…50)
  - ↳ cite: range manual — Deluge Official Guidebook OS 4.1 (OLED), p.225
- **EQ TREBLE AMOUNT** `27` (0…50)
  - ↳ cite: range manual — Deluge Official Guidebook OS 4.1 (OLED), p.219

#### Track 5 — `riser`: Saw riser, top end open, thrown into the reverb

- **OSC TYPE** `Saw`
- **EQ TREBLE AMOUNT** `35` (0…50)
  - ↳ cite: range manual — Deluge Official Guidebook OS 4.1 (OLED), p.219
- **REVERB AMOUNT** `23` (0…50)
  - ↳ cite: range manual — Deluge Official Guidebook OS 4.1 (OLED), p.225
- **DELAY AMOUNT** `16` (0…50)
  - ↳ cite: range manual — Deluge Official Guidebook OS 4.1 (OLED), p.222

#### Track 6 — `noise`: Crushed noise wash under the drums

- **OSC TYPE** `Sample`
- **REPEAT MODE** `LOOP`
- **BITCRUSH** `21` (0…50)
  - ↳ cite: range manual — Deluge Official Guidebook OS 4.1 (OLED), p.217
- **DECIMATION** `13` (0…50)
  - ↳ cite: range manual — Deluge Official Guidebook OS 4.1 (OLED), p.217
- **EQ BASS AMOUNT** `16` (0…50)
  - ↳ cite: range manual — Deluge Official Guidebook OS 4.1 (OLED), p.219

## 7. Finishing

**Sidechain**

- TR-1000 — internal, from external audio
- Deluge — internal

**Master FX**

Nothing in this rig is an fx-processor or a mixer-recorder, and per-device master
chains are not modelled — so this is yours to decide at the desk.

**Arrangement variations**

Parts live on Tracker Mini, TR-1000, Deluge. Section by section:

- **Intro** (16 bars, energy 0.15) — `kick`, `sub`, `bass-mid`, `clap`, `closed-hat`, `open-hat`, `stab`, `pad`, `noise`
- **Build** (16 bars, energy 0.45) — `kick`, `sub`, `bass-mid`, `clap`, `closed-hat`, `open-hat`, `stab`, `pad`, `riser`, `noise`
- **Drop** (32 bars, energy 0.9) — `kick`, `sub`, `bass-mid`, `clap`, `closed-hat`, `open-hat`, `stab`, `impact`, `pad`, `noise`
- **Breakdown** (16 bars, energy 0.3) — `kick`, `sub`, `bass-mid`, `clap`, `closed-hat`, `open-hat`, `stab`, `pad`, `riser`, `noise`
- **Peak** (32 bars, energy 1) — `kick`, `sub`, `bass-mid`, `clap`, `closed-hat`, `open-hat`, `stab`, `impact`, `pad`, `noise`
- **Outro** (16 bars, energy 0.2) — `kick`, `sub`, `bass-mid`, `clap`, `closed-hat`, `open-hat`, `stab`, `pad`, `noise`

Parts that come and go, which is where the arrangement actually moves:
- `impact` — Drop, Peak only
- `riser` — Build, Breakdown only
