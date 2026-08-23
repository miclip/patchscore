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

These parts are not in the guide below.

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

Steps are sixteenths, counted from the start of the hook: 16 to a bar, so step 33 is bar 3.
Notes sharing a step are one chord and share a line.

Names are spelled for the key, so F minor gets `Eb`; a name in brackets is the same pitch as
a sharps-only box shows it, and appears only where it differs. Octaves put middle C at C4,
which not every maker agrees with — the MIDI number is the form nothing disagrees about.

Where a role has more than one hook authored, rerolling the seed picks a different one.

### `bass-mid` — Deluge · Track 2

**Analog saw bass through the drive filter, crushed** — settings in Sound design

2 bars in F minor.

- bar 1 · step 1 · len 3 · `F1` · root · MIDI 29
- bar 1 · step 7 · len 2 · `F1` · root · MIDI 29
- bar 1 · step 11 · len 3 · `Bb1` (`A#1`) · 4th · MIDI 34
- bar 1 · step 15 · len 2 · `F1` · root · MIDI 29
- bar 2 · step 17 · len 3 · `F1` · root · MIDI 29
- bar 2 · step 23 · len 2 · `Db2` (`C#2`) · 6th · MIDI 37
- bar 2 · step 27 · len 4 · `C2` · 5th · MIDI 36

### `pad` — Deluge · Track 4

**Wavetable pad, slow chorus, wide reverb send** — settings in Sound design

8 bars in F minor.

- bar 1 · step 1 · len 64 · `F3` `Ab3` (`G#3`) `C4` · root 3rd 5th · MIDI 53 56 60
- bar 5 · step 65 · len 32 · `Db4` (`C#4`) `F4` `Ab4` (`G#4`) · 6th root 3rd · MIDI 61 65 68
- bar 7 · step 97 · len 32 · `Eb4` (`D#4`) `G4` `Bb4` (`A#4`) · 7th 2nd 4th · MIDI 63 67 70

### `stab` — Deluge · Track 3

**Square stab through a fast phaser** — settings in Sound design

4 bars in F minor.

- bar 1 · step 1 · len 2 · `F3` `Ab3` (`G#3`) `C4` · root 3rd 5th · MIDI 53 56 60
- bar 1 · step 11 · len 1 · `F3` `Ab3` (`G#3`) `C4` · root 3rd 5th · MIDI 53 56 60
- bar 3 · step 33 · len 2 · `F3` `Ab3` (`G#3`) `C4` · root 3rd 5th · MIDI 53 56 60
- bar 4 · step 49 · len 3 · `C4` `Eb4` (`D#4`) `G4` · 5th 7th 2nd · MIDI 60 63 67

## 5. Step programming

### `kick` — Tracker Mini · Track 1

**Tight one-shot kick, tuned down, no tail** — settings in Sound design

**Intro, Outro** — 16 steps, band 0

```
 1 x··· ···· x··· ····
```
- `downbeat` — 1, 9

**Build, Breakdown** — 16 steps, band 1

```
 1 x··· x··· x··· x···
```
- `downbeat` — 1, 5, 9, 13

**Drop, Peak** — 16 steps, band 3

```
 1 x··· x··x x··· x··x
```
- `downbeat` — 1, 5, 13
- `ghost` — 8 (vel 50), 16 (vel 60)
- `accent` — 9 (vel 112)

**On this box** — Tracker Mini

- `accent` → `volume` 100 on step 9
  - ↳ hint: Hold [FX1], press (Up)/(Down)

### `sub` — Deluge · Track 1

**Sine sub with the top end cut away** — settings in Sound design

**Intro, Outro** — 16 steps, band 0

```
 1 x··· ···· ···· ····
```
- `downbeat` — 1

**On this box** — Deluge

- `downbeat` → `velocity` 112 on step 1

**Build, Breakdown** — 16 steps, band 1

```
 1 x··· ···· x··· ··x·
```
- `downbeat` — 1, 9
- `offbeat` — 15

**On this box** — Deluge

- `downbeat` → `velocity` 112 on steps 1, 9

**Drop, Peak** — 16 steps, band 3

```
 1 x·x· ··x· ··x· ··x·
```
- `downbeat` — 1
- `offbeat` — 3, 7, 11, 15

**On this box** — Deluge

- `downbeat` → `velocity` 112 on step 1

### `bass-mid` — Deluge · Track 2

**Analog saw bass through the drive filter, crushed** — settings in Sound design

**Intro, Outro** — 32 steps, band 0

```
 1 x··· ···· ···· ····
17 x··· ···· ···· ····
```
- `downbeat` — 1, 17

**Build, Breakdown** — 32 steps, band 1

```
 1 x··· ···· x··· ····
17 x··· ···· x··· ····
```
- `downbeat` — 1, 9, 17, 25

**Drop, Peak** — 32 steps, band 3

```
 1 x··x ··x· x·x· ····
17 x··x ··x· x·x· ··x·
```
- `downbeat` — 1, 9, 17, 25
- `ghost` — 4, 20 (all vel 50)
- `offbeat` — 7, 11, 23, 27
- `accent` — 31 (vel 110)

**On this box** — Deluge

- `offbeat` → `probability` 90 on steps 7, 11, 23, 27
  - ↳ hint: Hold pad, turn (SELECT) anticlockwise

### `clap` — TR-1000 · HC

**Wide clap sitting on top of the snare** — settings in Sound design

**Intro, Outro** — 16 steps, band 0

```
 1 ···· ···· ···· x···
```
- `backbeat` — 13

**On this box** — TR-1000

- `backbeat` → `accent` true on step 13
  - ↳ hint: ACCENT [STEP], then step keys

**Build, Breakdown** — 16 steps, band 1

```
 1 ···· x··· ···· x···
```
- `backbeat` — 5, 13

**On this box** — TR-1000

- `backbeat` → `accent` true on steps 5, 13
  - ↳ hint: ACCENT [STEP], then step keys

**Drop, Peak** — 16 steps, band 3

```
 1 ···· x··· ···· xxxx
```
- `backbeat` — 5
- `accent` — 13 (vel 112)
- `fill` — 14, 15, 16

**On this box** — TR-1000

- `backbeat` → `accent` true on step 5
  - ↳ hint: ACCENT [STEP], then step keys

### `closed-hat` — TR-1000 · CH

**Grainy CR-78 hat with a metallic edge** — settings in Sound design

**Intro, Outro** — 16 steps, band 0

```
 1 ··x· ··x· ··x· ··x·
```
- `offbeat` — 3, 7, 11, 15

**On this box** — TR-1000

- `offbeat` → `weak` true on steps 3, 7, 11, 15
  - ↳ hint: Hold [SHIFT], press step keys

**Build, Breakdown** — 16 steps, band 1

```
 1 ·xx· ··x· ·xx· ··x·
```
- `ghost` — 2, 10 (all vel 45)
- `offbeat` — 3, 7, 11, 15

**On this box** — TR-1000

- `offbeat` → `weak` true on steps 3, 7, 11, 15
  - ↳ hint: Hold [SHIFT], press step keys

**Drop, Peak** — 16 steps, band 3

```
 1 xxxx xxxx xxxx xxxx
```
- `downbeat` — 1, 5, 9, 13
- `ghost` — 2, 4, 6, 8, 10, 12, 14, 16 (all vel 42)
- `offbeat` — 3, 7, 11
- `accent` — 15 (vel 108)

**On this box** — TR-1000

- `offbeat` → `weak` true on steps 3, 7, 11
  - ↳ hint: Hold [SHIFT], press step keys
- `accent` → `accent` true on step 15
  - ↳ hint: ACCENT [STEP], then step keys

### `open-hat` — TR-1000 · OH

**Dull open hat, more air than sizzle** — settings in Sound design

**Intro, Outro** — 16 steps, band 0

```
 1 ···· ··x· ···· ····
```
- `offbeat` — 7

**On this box** — TR-1000

- `offbeat` → `weak` true on step 7
  - ↳ hint: Hold [SHIFT], press step keys

**Build, Breakdown** — 16 steps, band 1

```
 1 ··x· ···· ··x· ····
```
- `offbeat` — 3, 11

**On this box** — TR-1000

- `offbeat` → `weak` true on steps 3, 11
  - ↳ hint: Hold [SHIFT], press step keys

**Drop, Peak** — 16 steps, band 3

```
 1 ··x· ··x· ··x· x·x·
```
- `offbeat` — 3, 7, 11
- `downbeat` — 13
- `accent` — 15 (vel 106)

**On this box** — TR-1000

- `offbeat` → `weak` true on steps 3, 7, 11
  - ↳ hint: Hold [SHIFT], press step keys

### `stab` — Deluge · Track 3

**Square stab through a fast phaser** — settings in Sound design

**Intro, Outro** — 32 steps, band 0

```
 1 x··· ···· ···· ····
17 ···· ···· ···· ····
```
- `downbeat` — 1

**Build, Breakdown** — 32 steps, band 1

```
 1 x··· ···· ···· ····
17 x··· ···· ···· ····
```
- `downbeat` — 1, 17

**Drop, Peak** — 32 steps, band 3

```
 1 x··· ··x· ··x· ····
17 x··· ··x· ···· x···
```
- `downbeat` — 1, 17
- `offbeat` — 7, 11, 23
- `accent` — 29 (vel 108)

**On this box** — Deluge

- `accent` → `velocity` 120 on step 29

### `impact` — TR-1000 · CC

**Crash marking the top of a section** — settings in Sound design

**Drop, Peak** — 64 steps, band 3

```
 1 x··· ···· ···· ····
17 x··· ···· x··· ····
33 x··· ···· ···· ····
49 x··· ···· x··· ····
```
- `first-hit` — 1
- `downbeat` — 17, 25, 49, 57
- `accent` — 33 (vel 114)

**On this box** — TR-1000

- `first-hit` → `accent` true on step 1
  - ↳ hint: ACCENT [STEP], then step keys

### `pad` — Deluge · Track 4

**Wavetable pad, slow chorus, wide reverb send** — settings in Sound design

**Intro, Outro** — no pattern authored for `pad` at any band (asked for band 0)

**Build, Breakdown** — no pattern authored for `pad` at any band (asked for band 1)

**Drop, Peak** — no pattern authored for `pad` at any band (asked for band 3)

### `riser` — Deluge · Track 5

**Saw riser, top end open, thrown into the reverb** — settings in Sound design

**Build, Breakdown** — no pattern authored for `riser` at any band (asked for band 1)

### `noise` — Deluge · Track 6

**Crushed noise wash under the drums** — settings in Sound design

**Intro, Outro** — 32 steps, band 0

```
 1 x··· ···· ···· ····
17 ···· ···· ···· ····
```
- `downbeat` — 1

**Build, Breakdown** — 32 steps, band 1

```
 1 x··· ···· ···· ····
17 x··· ···· ···· ····
```
- `downbeat` — 1, 17

**Drop, Peak** — 32 steps, band 3

```
 1 x··· ··x· ···· ··x·
17 x··· ··x· ···· ··x·
```
- `downbeat` — 1, 17
- `offbeat` — 7, 15, 23
- `accent` — 31 (vel 104)

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

*Ranges cite manual — TR-1000 Reference Manual (eng02) v1.13+, p.62.*

- **GEN** `9X Hand Clap`
  - ↳ hint: Hold [SHIFT]+[GEN], select with [C6]
- **FILTER** `35` % (-100…100 %)
  - ↳ hint: Clap brightness
- **CLAPS** `70` % (0…100 %)
- **SPEED** `55` % (0…100 %)
- **MIX** `20` % (-100…100 %)
  - ↳ hint: Clap against tail, not layers
- **TAIL DCY** `62` % (0…100 %)

#### CH — `closed-hat`: Grainy CR-78 hat with a metallic edge

*Ranges cite manual — TR-1000 Reference Manual (eng02) v1.13+, p.62.*

- **GEN** `CR78 HiHat`
  - ↳ hint: Hold [SHIFT]+[GEN], select with [C6]
- **TUNE** `-5` % (-100…100 %)
- **DECAY** `20` % (0…100 %)
- **METALLIC** `72` % (0…100 %)
  - ↳ hint: Metal-like overtone level

#### OH — `open-hat`: Dull open hat, more air than sizzle

*Ranges cite manual — TR-1000 Reference Manual (eng02) v1.13+, p.62.*

- **GEN** `606 Open HiHat`
  - ↳ hint: Hold [SHIFT]+[GEN], select with [C6]
- **TUNE** `-18` % (-100…100 %)
- **DECAY** `64` % (0…100 %)
- **TONE** `-35` % (-100…100 %)
  - ↳ hint: Brightness of the cymbal

#### CC — `impact`: Crash marking the top of a section

*Ranges cite manual — TR-1000 Reference Manual (eng02) v1.13+, p.62.*

- **GEN** `9X Crash Cymbal`
  - ↳ hint: Hold [SHIFT]+[GEN], select with [C6]
- **TUNE** `0` % (-100…100 %)
- **DECAY** `84` % (0…100 %)

### Deluge

*Values below cite Deluge Official Guidebook, OS 4.1 (OLED) + community firmware release_1_2_1 (Chopin).*

#### Track 1 — `sub`: Sine sub with the top end cut away

*Ranges cite manual — Deluge Official Guidebook OS 4.1 (OLED), p.219.*

- **OSC TYPE** `Sine`
- **EQ TREBLE AMOUNT** `17` (0…50)
  - ↳ note: 25 is neutral; below cuts
- **EQ BASS AMOUNT** `31` (0…50)

#### Track 2 — `bass-mid`: Analog saw bass through the drive filter, crushed

*Ranges cite manual — Deluge Official Guidebook OS 4.1 (OLED), p.217.*

- **OSC TYPE** `Analog Saw`
- **LPF MODE** `DRIVE`
- **DECIMATION** `14` (0…50)
- **BITCRUSH** `9` (0…50)
- **EQ BASS AMOUNT** `29` (0…50)
  - ↳ cite: range manual — Deluge Official Guidebook OS 4.1 (OLED), p.219

#### Track 3 — `stab`: Square stab through a fast phaser

*Ranges cite manual — Deluge Official Guidebook OS 4.1 (OLED), p.229.*

- **OSC TYPE** `Analog Square`
- **MOD FX TYPE** `PHASER`
- **MOD FX RATE** `16` (0…50)
- **MOD FX FEEDBACK** `18` (0…50)
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

*Ranges cite manual — Deluge Official Guidebook OS 4.1 (OLED), p.217.*

- **OSC TYPE** `Sample`
- **REPEAT MODE** `LOOP`
- **BITCRUSH** `21` (0…50)
- **DECIMATION** `13` (0…50)
- **EQ BASS AMOUNT** `16` (0…50)
  - ↳ cite: range manual — Deluge Official Guidebook OS 4.1 (OLED), p.219

## 7. Finishing

**Sidechain**

- TR-1000 — internal, from external audio
- Deluge — internal

**Master FX**

No effects unit or mixer in this rig. The master chain is yours at the desk.

**Arrangement variations**

Sections that program identically, part for part — build one and copy it:

- **band 0** — Intro, Outro
- **band 1** — Build, Breakdown
- **band 3** — Drop, Peak

`pad` and `riser` have no pattern authored at any band, so nothing here varies for them.
