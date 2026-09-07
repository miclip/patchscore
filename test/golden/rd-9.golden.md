# Industrial Techno

Values are starting points — dial them to taste. Where a mood knob or the key moved one you see
the move (`52 → 45`). Every value carries its range — `38 (0…100)` — so you can tell at a glance
whether the screen in front of you is the one the line is about.

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

```
            Intro  Build  Drop           Breakdown Peak           Outro
            16b    16b    32b            16b       32b            16b
energy      0.15   0.45   0.9            0.3       1              0.2

kick        ██████ ██████ ██████████████ █████████ ██████████████ ██████
clap        ██████ ██████ ██████████████ █████████ ██████████████ ██████
closed-hat  ██████ ██████ ██████████████ █████████ ██████████████ ██████
metallic    ██████ ██████ ██████████████ █████████ ██████████████ ██████
noise       ██████ ██████ ██████████████ █████████ ██████████████ ██████
```

Every part plays throughout. The movement is in the patterns and the energy.

## 2. Voice assignment

- **`kick`** → RD-9 · BASS DRUM — *Short 909 kick with the click on the front*
  - p1 · exact `hard` · every section
- **`clap`** → RD-9 · CLAP — *Clap on the backbeat at full level*
  - p2 · substituted — asked `bright`, authored `hard` · every section
- **`closed-hat`** → RD-9 · CLOSED — *Closed hat tuned down so it sits behind the snare*
  - p2 · substituted — asked `dirty`, authored `dark` · every section
- **`metallic`** → RD-9 · CRASH — *Crash tuned down and filtered into a metallic bed*
  - p3 · exact `dark` · every section
- **`noise`** → RD-9 · OPEN — *Open hat held long and high-passed into a noise wash*
  - p5, optional · exact `dirty` · every section

### Gaps

This rig cannot make these parts. They are not in the guide below.

- `sub` `dark` (p1) — no room (contended) — the RD-9 BASS DRUM is carrying kick
- `bass-mid` `dirty` (p2) — nothing in your rig plays this part
- `stab` `hard` (p3) — nothing in your rig plays this part
- `impact` `hard` (p4) — no room (contended) — the RD-9 CRASH is carrying metallic

### Waiting on us

Your rig can make these. Nobody has written the recipe yet, so they are not in the guide below — that is our backlog, not a limit of your boxes.

- `open-hat` `dark` (p3) — RD-9 OPEN could carry it, dial it by ear

### Not needed for this direction

Industrial Techno is finished without these.

- `pad` `dark` (p4) — the hats and the room carry the air here; a held pad is extra
- `riser` `bright` (p4) — a part already playing can lift the eight bars into a drop

## 3. Rig integration

**Clock source** — RD-9 over `midi-din`, carrying 5 parts. Nothing else is here to sync to it.

- Why this box — it is the only box here that can send clock

- On the RD-9, set `Press CYCLE (with the sequencer stopped) until INT is lit` to `INT`
  - ↳ note: Clock leaves MIDI OUT and SYNC OUT together; the manual documents no switch for either

- **RD-9** — drum-machine · 5 parts
  - clock: sends clock · midi-din/usb/analog-clock
  - audio: mono main out · 10 individual outs · audio in
  - mixer: 5 parts, 10 individual outs: one channel each

## 4. Hook

Steps are sixteenths, counted from the start of the hook: 16 to a bar, so step 33 is bar 3.
Notes sharing a step are one chord and share a line.

Names are spelled for the key, so F minor gets `Eb`; a name in brackets is the same pitch as
a sharps-only box shows it, and appears only where it differs. Octaves put middle C at C4,
which not every maker agrees with — the MIDI number is the form nothing disagrees about.

Where a role has more than one hook authored, rerolling the seed picks a different one.

### `bass-mid` — unassigned

*Nothing in your rig plays this part.*

2 bars in F minor.

- bar 1 · step 1 · sounds for 3 steps · `F2` · root · MIDI 41
- bar 1 · step 7 · sounds for 2 steps · `F2` · root · MIDI 41
- bar 1 · step 11 · sounds for 3 steps · `Bb2` (`A#2`) · 4th · MIDI 46
- bar 1 · step 15 · sounds for 2 steps · `F2` · root · MIDI 41
- bar 2 · step 17 · sounds for 3 steps · `F2` · root · MIDI 41
- bar 2 · step 23 · sounds for 2 steps · `Db3` (`C#3`) · 6th · MIDI 49
- bar 2 · step 27 · sounds for 4 steps · `C3` · 5th · MIDI 48

### `pad` — unassigned

*Nothing in your rig plays this part.*

8 bars in F minor.

- bar 1 · step 1 · held for 64 steps (4 bars) · `F3` `Ab3` (`G#3`) `C4` · root 3rd 5th · MIDI 53 56 60
- bar 5 · step 65 · held for 32 steps (2 bars) · `Db4` (`C#4`) `F4` `Ab4` (`G#4`) · 6th root 3rd · MIDI 61 65 68
- bar 7 · step 97 · held for 32 steps (2 bars) · `Eb4` (`D#4`) `G4` `Bb4` (`A#4`) · 7th 2nd 4th · MIDI 63 67 70

### `stab` — unassigned

*Nothing in your rig plays this part.*

4 bars in F minor.

- bar 1 · step 1 · sounds for 2 steps · `F3` `Ab3` (`G#3`) `C4` · root 3rd 5th · MIDI 53 56 60
- bar 1 · step 11 · sounds for 1 step · `F3` `Ab3` (`G#3`) `C4` · root 3rd 5th · MIDI 53 56 60
- bar 3 · step 33 · sounds for 2 steps · `F3` `Ab3` (`G#3`) `C4` · root 3rd 5th · MIDI 53 56 60
- bar 4 · step 49 · sounds for 3 steps · `C4` `Eb4` (`D#4`) `G4` · 5th 7th 2nd · MIDI 60 63 67

## 5. Step programming

### `kick` — RD-9 · BASS DRUM

**Short 909 kick with the click on the front** — settings in Sound design

**Intro, Outro** — 16 steps, band 0

```
 1 x··· ···· x··· ····
```
- `downbeat` — 1, 9

**On this box** — RD-9

- `downbeat` → `accent` true on steps 1, 9
  - ↳ hint: Press the step twice for a fixed accent

**Build, Breakdown** — 16 steps, band 1

```
 1 x··· x··· x··· x···
```
- `downbeat` — 1, 5, 9, 13

**On this box** — RD-9

- `downbeat` → `accent` true on steps 1, 5, 9, 13
  - ↳ hint: Press the step twice for a fixed accent

**Drop, Peak** — 16 steps, band 3

```
 1 x··· x··x x··· x··x
```
- `downbeat` — 1, 5, 13
- `ghost` — 8 (vel 50), 16 (vel 60)
- `accent` — 9 (vel 112)

**On this box** — RD-9

- `downbeat` → `accent` true on steps 1, 5, 13
  - ↳ hint: Press the step twice for a fixed accent

### `clap` — RD-9 · CLAP

**Clap on the backbeat at full level** — settings in Sound design

**Intro, Outro** — 16 steps, band 0

```
 1 ···· ···· ···· x···
```
- `backbeat` — 13

**On this box** — RD-9

- `backbeat` → `accent` true on step 13
  - ↳ hint: Press the step twice for a fixed accent

**Build, Breakdown** — 16 steps, band 1

```
 1 ···· x··· ···· x···
```
- `backbeat` — 5, 13

**On this box** — RD-9

- `backbeat` → `accent` true on steps 5, 13
  - ↳ hint: Press the step twice for a fixed accent

**Drop, Peak** — 16 steps, band 3

```
 1 ···· x··· ···· xxxx
```
- `backbeat` — 5
- `accent` — 13 (vel 112)
- `fill` — 14, 15, 16

**On this box** — RD-9

- `backbeat` → `accent` true on step 5
  - ↳ hint: Press the step twice for a fixed accent

### `closed-hat` — RD-9 · CLOSED

**Closed hat tuned down so it sits behind the snare** — settings in Sound design

**Intro, Outro** — 16 steps, band 0

```
 1 ··x· ··x· ··x· ··x·
```
- `offbeat` — 3, 7, 11, 15

**Build, Breakdown** — 16 steps, band 1

```
 1 ·xx· ··x· ·xx· ··x·
```
- `ghost` — 2, 10 (all vel 45)
- `offbeat` — 3, 7, 11, 15

**Drop, Peak** — 16 steps, band 3

```
 1 xxxx xxxx xxxx xxxx
```
- `downbeat` — 1, 5, 9, 13
- `ghost` — 2, 4, 6, 8, 10, 12, 14, 16 (all vel 42)
- `offbeat` — 3, 7, 11
- `accent` — 15 (vel 108)

### `metallic` — RD-9 · CRASH

**Crash tuned down and filtered into a metallic bed** — settings in Sound design

**Intro, Outro** — 32 steps, band 0

```
 1 ···· ···· ···· ····
17 x··· ···· ···· ····
```
- `downbeat` — 17

**Build, Breakdown** — 32 steps, band 1

```
 1 x··· ···· ···· ····
17 x··· ···· ···· ····
```
- `downbeat` — 1, 17

**Drop, Peak** — 32 steps, band 3

```
 1 x··· ··x· ··x· ····
17 x··· ··x· ··x· ···x
```
- `accent` — 1 (vel 110)
- `offbeat` — 7, 11, 23, 27
- `downbeat` — 17
- `last-hit` — 32

### `noise` — RD-9 · OPEN

**Open hat held long and high-passed into a noise wash** — settings in Sound design

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

### RD-9

*This block draws on the RD-9 User Manual V 1.0, pp.17-33; its values are starting points.*

**Pattern-wide**

One setting for the whole pattern — set it once, not once per part below.

- **FILTER** `On`
  - ↳ note: The ON button engages the filter into the circuit (p.6)
- **PROB** `90` % (0…100 %)
  - ↳ note: Only steps switched on in the PROB menu are affected (p.18)
  - ↳ hint: SETTINGS > PROB, pick a voice, then steps
- **PROB PREFERENCE** `Pattern`
  - ↳ note: p.18 adds that the steps are stored per pattern while the amount is one number
  - ↳ hint: SETTINGS > CLOCK, TAP/HOLD to page
- **STEP SIZE** `1/16`
  - ↳ note: One step is 1/16 of a bar, so sixteen steps make one bar (p.19)
  - ↳ hint: SETTINGS, then the step-size key
- **STEP SIZE PREFERENCE** `Pattern`
  - ↳ hint: SETTINGS > CLOCK, TAP/HOLD to page
- **SWING** `50` % (25…75 %)
  - ↳ note: 50 is straight; below it swings negative, above it shuffles (p.20)
  - ↳ hint: Press DATA MODE, then turn DATA
- **SWING PREFERENCE** `Pattern`
  - ↳ note: Chooses which stored Swing is used — and with it which printed range applies
  - ↳ hint: SETTINGS > CLOCK, TAP/HOLD to page

#### BASS DRUM — `kick`: Short 909 kick with the click on the front

- **TUNE** `30` % travel (0…100 % travel)
  - ↳ note: Pitch envelope depth; CW raises the pitch of the hit (p.10)
- **ATTACK** `80` % travel (0…100 % travel)
  - ↳ note: CW increases the attack click (p.10)
- **DECAY** `34` % travel (0…100 % travel)
  - ↳ note: How long the drum rings; CW for longer (p.10)
- **LEVEL** `78` % travel (0…100 % travel)
  - ↳ note: Level against the other voices (p.10)

#### CLAP — `clap`: Clap on the backbeat at full level

Routing — CLAP has its own trigger output (TRIGGER OUT 2) as well as its audio jack, so it can fire something outside the box on the same step (p.9)

- **LEVEL** `80` % travel (0…100 % travel)
  - ↳ note: Level against the other voices (p.10)

#### CLOSED — `closed-hat`: Closed hat tuned down so it sits behind the snare

- **ENHANCED MODE** `On`
  - ↳ note: Off, PITCH, PITCH DEPTH and the hi-hat TUNE do nothing (p.10)
  - ↳ hint: SETTINGS > PREFS, TAP/HOLD to Enhanced Mode
- **TUNE** `26` % travel (0…100 % travel)
  - ↳ note: One knob for both hats (p.10)
- **CH DECAY** `34` % travel (0…100 % travel)
- **LEVEL** `44` % travel (0…100 % travel)
  - ↳ note: Level against the other voices (p.10)

#### CRASH — `metallic`: Crash tuned down and filtered into a metallic bed

Routing — Send the crash to the FX bus: press SEND, use SELECT to light CRASH pink, press SEND again (p.15)

- **CRASH TUNE** `20` % travel (0…100 % travel)
  - ↳ note: Changes the pitch of the crash voice (p.8)
- **LEVEL** `40` % travel (0…100 % travel)
  - ↳ note: Level against the other voices (p.10)
- **FILTER MODE** `LPF`
  - ↳ note: The HPF button toggles it; LPF is the default (p.6)
- **CUTOFF** `2600` Hz (10…15000 Hz)
  - ↳ note: One filter for the whole box — every voice on the FX bus shares it (p.15)
  - ↳ hint: Press SEND, SELECT the voice, SEND again
- **RESONANCE** `4` (0…10)
  - ↳ note: A peak at the cutoff point (p.15)
- **WAVE DESIGNER ATTACK** `-3` dB (-15…15 dB)
  - ↳ note: 0 dB is 12 o’clock and is bypass (p.15)
- **WAVE DESIGNER SUSTAIN** `12` dB (-24…24 dB)
  - ↳ note: Acts like a compressor upward, and shortens the tail downward (p.15)

#### OPEN — `noise`: Open hat held long and high-passed into a noise wash

Routing — Send the hi-hats to the FX bus: press SEND, use SELECT to light OPEN pink, press SEND again (p.15)

- **ENHANCED MODE** `On`
  - ↳ note: Off, PITCH, PITCH DEPTH and the hi-hat TUNE do nothing (p.10)
  - ↳ hint: SETTINGS > PREFS, TAP/HOLD to Enhanced Mode
- **TUNE** `84` % travel (0…100 % travel)
- **OH DECAY** `94` % travel (0…100 % travel)
  - ↳ note: The longest tail the voice has (p.11)
- **LEVEL** `46` % travel (0…100 % travel)
  - ↳ note: Level against the other voices (p.10)
- **FILTER MODE** `HPF`
  - ↳ note: The HPF button toggles it; LPF is the default (p.6)
- **CUTOFF** `3600` Hz (10…15000 Hz)
  - ↳ note: One filter for the whole box — every voice on the FX bus shares it (p.15)
  - ↳ hint: Press SEND, SELECT the voice, SEND again
- **RESONANCE** `7` (0…10)
  - ↳ note: A peak at the cutoff point (p.15)
- **WAVE DESIGNER ATTACK** `4` dB (-15…15 dB)
  - ↳ note: 0 dB is 12 o’clock and is bypass (p.15)
- **WAVE DESIGNER SUSTAIN** `14` dB (-24…24 dB)
  - ↳ note: Acts like a compressor upward, and shortens the tail downward (p.15)

## 7. Finishing

**Sidechain**

No box in this rig has a sidechain.

**Master FX**

The RD-9 carries FX on the panel; it is the only box here, so that is the whole master chain.

**Arrangement variations**

Sections that program identically, part for part — build one and copy it:

- **band 0** — Intro, Outro · 5 parts, 9 strikes
- **band 1** — Build, Breakdown · 5 parts, 16 strikes
- **band 3** — Drop, Peak · 5 parts, 40 strikes
