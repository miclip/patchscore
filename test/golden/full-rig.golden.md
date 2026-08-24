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
- **`sub`** → MC-101 · TONE Track 1 — *Sine sub, one note at a time, nothing above the fundamental*
  - p1 · exact `dark` · every section
- **`bass-mid`** → Deluge · Track 1 — *Analog saw bass through the drive filter, crushed*
  - p2 · exact `dirty` · every section
- **`clap`** → TR-1000 · HC — *Wide clap sitting on top of the snare*
  - p2 · exact `bright` · every section
- **`closed-hat`** → TR-8S · CH — *Hat pushed into the compressor*
  - p2 · exact `dirty` · every section
- **`metallic`** → Cascadia · Voice — *Ring modulator fed a square, notched rather than filtered*
  - p3 · exact `dark` · every section
- **`open-hat`** → TR-8S · OH — *Open hat with the top rolled off*
  - p3 · exact `dark` · every section
- **`stab`** → MC-101 · TONE Track 2 — *Short chord stab, played on the track*
  - p3 · exact `hard` · 3 notes at once on one polyphonic voice · every section
- **`impact`** → TR-1000 · CC — *Crash marking the top of a section*
  - p4 · exact `hard` · Drop, Peak
- **`pad`** → MC-101 · TONE Track 3 — *Slow polyphonic pad, opening under the drums*
  - p4 · substituted — asked `dark`, authored `soft` · 3 notes at once on one polyphonic voice · every section
- **`riser`** → TR-8S · CC — *A sample played backwards into the change*
  - p4 · exact `bright` · Build, Breakdown
- **`noise`** → CRAVE · Voice — *Raw noise through the filter, oscillator out of the mix*
  - p5, optional · exact `dirty` · every section

### Gaps

None.

## 3. Rig integration

**Clock source** — Model 2400 over `midi-din`, carrying 0 parts. Sync everything else to it, except Zoom LiveTrak L-8, which cannot receive clock and runs free.

- **CRAVE** — semi-modular · 1 part
  - clock: receives clock only · midi-din/usb
  - audio: mono main out · audio in
  - mixer: 1 part, no individual outs: one mono channel for all
- **ZOIA Euroburo** — fx-processor · 0 parts
  - clock: receives clock only · analog-clock/midi-din
  - audio: stereo main out · audio in
  - mixer: no parts assigned; nothing to patch
- **Cascadia** — semi-modular · 1 part
  - clock: sends clock · midi-din/usb/analog-clock
  - audio: mono main out · audio in
  - mixer: 1 part, no individual outs: one mono channel for all
- **Tracker Mini** — groovebox · 1 part
  - clock: sends clock · midi-din/usb
  - audio: stereo main out · USB audio · audio in
  - mixer: 1 part, no individual outs: one stereo channel for all
- **MC-101** — groovebox · 3 parts
  - clock: sends clock · midi-din/usb
  - audio: stereo main out · USB audio
  - mixer: 3 parts, no individual outs: one stereo channel for all
- **TR-1000** — drum-machine · 2 parts
  - clock: sends clock · midi-din/din-sync/usb/analog-clock/trigger
  - audio: stereo main out · 10 individual outs · USB audio · audio in
  - mixer: 2 parts, 10 individual outs: one channel each
- **TR-8S** — drum-machine · 3 parts
  - clock: sends clock · midi-din/usb/trigger
  - audio: stereo main out · 6 individual outs · USB audio · audio in
  - mixer: 3 parts, 6 individual outs: one channel each
- **Deluge** — groovebox · 1 part
  - clock: sends clock · midi-din/usb/analog-clock
  - audio: stereo main out · audio in
  - mixer: 1 part, no individual outs: one stereo channel for all
- **Model 2400** — mixer-recorder · 0 parts
  - clock: sends clock, cannot receive · midi-din/usb
  - audio: stereo main out · 8 individual outs · USB audio · audio in
  - mixer: no parts assigned; nothing to patch
- **Zoom LiveTrak L-8** — mixer-recorder · 0 parts
  - clock: no clock in or out
  - audio: stereo main out · USB audio · audio in
  - mixer: no parts assigned; nothing to patch

## 4. Hook

Steps are sixteenths, counted from the start of the hook: 16 to a bar, so step 33 is bar 3.
Notes sharing a step are one chord and share a line.

Names are spelled for the key, so F minor gets `Eb`; a name in brackets is the same pitch as
a sharps-only box shows it, and appears only where it differs. Octaves put middle C at C4,
which not every maker agrees with — the MIDI number is the form nothing disagrees about.

Where a role has more than one hook authored, rerolling the seed picks a different one.

### `bass-mid` — Deluge · Track 1

**Analog saw bass through the drive filter, crushed** — settings in Sound design

2 bars in F minor.

- bar 1 · step 1 · len 3 · `F1` · root · MIDI 29
- bar 1 · step 7 · len 2 · `F1` · root · MIDI 29
- bar 1 · step 11 · len 3 · `Bb1` (`A#1`) · 4th · MIDI 34
- bar 1 · step 15 · len 2 · `F1` · root · MIDI 29
- bar 2 · step 17 · len 3 · `F1` · root · MIDI 29
- bar 2 · step 23 · len 2 · `Db2` (`C#2`) · 6th · MIDI 37
- bar 2 · step 27 · len 4 · `C2` · 5th · MIDI 36

### `pad` — MC-101 · TONE Track 3

**Slow polyphonic pad, opening under the drums** — settings in Sound design

8 bars in F minor.

- bar 1 · step 1 · len 64 · `F3` `Ab3` (`G#3`) `C4` · root 3rd 5th · MIDI 53 56 60
- bar 5 · step 65 · len 32 · `Db4` (`C#4`) `F4` `Ab4` (`G#4`) · 6th root 3rd · MIDI 61 65 68
- bar 7 · step 97 · len 32 · `Eb4` (`D#4`) `G4` `Bb4` (`A#4`) · 7th 2nd 4th · MIDI 63 67 70

### `stab` — MC-101 · TONE Track 2

**Short chord stab, played on the track** — settings in Sound design

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

### `sub` — MC-101 · TONE Track 1

**Sine sub, one note at a time, nothing above the fundamental** — settings in Sound design

**Intro, Outro** — 16 steps, band 0

```
 1 x··· ···· ···· ····
```
- `downbeat` — 1

**On this box** — MC-101

- `downbeat` → `note-length` 12 on step 1
  - ↳ hint: SEQ mode: hold [SHIFT], press the pad

**Build, Breakdown** — 16 steps, band 1

```
 1 x··· ···· x··· ··x·
```
- `downbeat` — 1, 9
- `offbeat` — 15

**On this box** — MC-101

- `downbeat` → `note-length` 12 on steps 1, 9
  - ↳ hint: SEQ mode: hold [SHIFT], press the pad

**Drop, Peak** — 16 steps, band 3

```
 1 x·x· ··x· ··x· ··x·
```
- `downbeat` — 1
- `offbeat` — 3, 7, 11, 15

**On this box** — MC-101

- `downbeat` → `note-length` 12 on step 1
  - ↳ hint: SEQ mode: hold [SHIFT], press the pad

### `bass-mid` — Deluge · Track 1

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

### `closed-hat` — TR-8S · CH

**Hat pushed into the compressor** — settings in Sound design

**Intro, Outro** — 16 steps, band 0

```
 1 ··x· ··x· ··x· ··x·
```
- `offbeat` — 3, 7, 11, 15

**On this box** — TR-8S

- `offbeat` → `alt-inst` true on steps 3, 7, 11, 15
  - ↳ hint: Hold [BD]-[RC], press a pad

**Build, Breakdown** — 16 steps, band 1

```
 1 ·xx· ··x· ·xx· ··x·
```
- `ghost` — 2, 10 (all vel 45)
- `offbeat` — 3, 7, 11, 15

**On this box** — TR-8S

- `offbeat` → `alt-inst` true on steps 3, 7, 11, 15
  - ↳ hint: Hold [BD]-[RC], press a pad
- `ghost` → `weak` true on steps 2, 10
  - ↳ hint: Hold [SHIFT], press a pad

**Drop, Peak** — 16 steps, band 3

```
 1 xxxx xxxx xxxx xxxx
```
- `downbeat` — 1, 5, 9, 13
- `ghost` — 2, 4, 6, 8, 10, 12, 14, 16 (all vel 42)
- `offbeat` — 3, 7, 11
- `accent` — 15 (vel 108)

**On this box** — TR-8S

- `offbeat` → `alt-inst` true on steps 3, 7, 11
  - ↳ hint: Hold [BD]-[RC], press a pad
- `ghost` → `weak` true on steps 2, 4, 6, 8, 10, 12, 14, 16
  - ↳ hint: Hold [SHIFT], press a pad

### `metallic` — Cascadia · Voice

**Ring modulator fed a square, notched rather than filtered** — settings in Sound design

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

### `open-hat` — TR-8S · OH

**Open hat with the top rolled off** — settings in Sound design

**Intro, Outro** — 16 steps, band 0

```
 1 ···· ··x· ···· ····
```
- `offbeat` — 7

**Build, Breakdown** — 16 steps, band 1

```
 1 ··x· ···· ··x· ····
```
- `offbeat` — 3, 11

**Drop, Peak** — 16 steps, band 3

```
 1 ··x· ··x· ··x· x·x·
```
- `offbeat` — 3, 7, 11
- `downbeat` — 13
- `accent` — 15 (vel 106)

### `stab` — MC-101 · TONE Track 2

**Short chord stab, played on the track** — settings in Sound design

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

**On this box** — MC-101

- `accent` → `velocity` 116, `note-length` 3 on step 29
  - ↳ hint: SEQ mode: hold [SHIFT], press the pad

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

### `pad` — MC-101 · TONE Track 3

**Slow polyphonic pad, opening under the drums** — settings in Sound design

**Intro, Outro** — no pattern authored for `pad` at any band (asked for band 0)

**Build, Breakdown** — no pattern authored for `pad` at any band (asked for band 1)

**Drop, Peak** — no pattern authored for `pad` at any band (asked for band 3)

### `riser` — TR-8S · CC

**A sample played backwards into the change** — settings in Sound design

**Build, Breakdown** — no pattern authored for `riser` at any band (asked for band 1)

### `noise` — CRAVE · Voice

**Raw noise through the filter, oscillator out of the mix** — settings in Sound design

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

### CRAVE

*Values below cite CRAVE Quick Start Guide, BE_0718-AAJ_WW.*

#### Voice — `noise`: Raw noise through the filter, oscillator out of the mix

*Ranges cite manual — CRAVE Quick Start Guide BE_0718-AAJ_WW, p.70.*

- **FREQUENCY** `0` (-5…5)
- **PULSE WIDTH** `50` % (5…95 %)
- **OSC MOD** `0` (0…10)
- **MIX** `5` (-5…5)
  - ↳ note: Negative is oscillator, positive is noise or external audio
- **CUTOFF** `6` (0…10)
  - ↳ note: 20 Hz to 20 kHz across the travel
- **RESONANCE** `4` (0…10)
- **VCF MOD** `0` (0…10)
- **VOLUME** `7` (0…10)
- **VCO SHAPE** `pulse`
- **VCO MOD SOURCE** `env/osc mod`
- **VCO MOD DEST** `width`
- **VCF MODE** `low pass`
- **VCF MOD SOURCE** `env`
- **VCF MOD POLARITY** `positive`
- **VCA MODE** `envelope`
- **ATTACK** `0` (0…10)
  - ↳ note: 2 ms to 3 s across the travel
- **DECAY** `2` (0…10)
  - ↳ note: 2 ms to 5 s across the travel
- **SUSTAIN** `0` (0…10)
  - ↳ note: 0 to 8 V across the travel
- **SUSTAIN SWITCH** `off`
  - ↳ note: Off: the level decays after the attack

**Patch**

- `OUT · ENV` → `IN · VCF CUTOFF`
  - ↳ note: The filter closing across each hit

### Cascadia

*Values below cite Intellijel Cascadia Manual, v1.1 (2023.04.18).*

#### Voice — `metallic`: Ring modulator fed a square, notched rather than filtered

Routing — played from MIDI IN or EXT IN PITCH/GATE — Cascadia has no sequencer of its own. RING MOD is already on mixer channel 1 (p.43); this changes what it eats

- **VCF · MODE** `NT2`
- **VCF · FREQ** `38` % travel (0…100 % travel)
  - ↳ cite: range unverified — mood leaves this value alone
- **VCF · Q** `54` % travel (0…100 % travel)
  - ↳ cite: range unverified — mood leaves this value alone
- **MIXER · IN 1** `82` % travel (0…100 % travel)
  - ↳ cite: range unverified — mood leaves this value alone
- **MIXER · IN 2** `0` % travel (0…100 % travel)
  - ↳ cite: range unverified — mood leaves this value alone
  - ↳ note: VCO A’s sine off, so only the ring output is heard
- **VCO B · OCTAVE** `4` (0…7)
  - ↳ cite: range manual — Intellijel Cascadia Manual v1.1, p.26
- **VCO B · PITCH** `3` st (-6…6 st)
  - ↳ cite: range manual — Intellijel Cascadia Manual v1.1, p.26
  - ↳ note: detune from VCO A is what makes it clang
- **VCO B · PITCH SOURCE** `PITCH B`
- **ENVELOPE A · SPEED** `FAST`
- **ENVELOPE A · ATTACK** `1` ms (0.2…1500 ms)
  - ↳ cite: range manual — Intellijel Cascadia Manual v1.1, p.31
- **ENVELOPE A · DECAY** `320` ms (0.6…2500 ms)
  - ↳ cite: range manual — Intellijel Cascadia Manual v1.1, p.31
- **ENVELOPE A · SUSTAIN** `0` V (0…5 V)
  - ↳ cite: range manual — Intellijel Cascadia Manual v1.1, p.28

**Patch**

- `VCO B · SQUARE` → `RING MOD · IN 2`
  - ↳ note: breaks the VCO B sine normal — a square through the ring modulator is harsher

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
- **SWING** `50` % (25…75 %)
  - ↳ cite: range manual — Polyend Tracker Mini Manual 2.2.1b, p.185
  - ↳ note: 50% is no swing; set once, it applies across the whole pattern
  - ↳ hint: Hold [FX1], press (Up)/(Down)

### MC-101

*Values below cite MC-101 Reference Manual, eng01.*

#### TONE Track 1 — `sub`: Sine sub, one note at a time, nothing above the fundamental

Routing — Keep the sub mono and dry — the reverb and delay sends stay at 0

*Ranges cite manual — MC-101 Reference Manual eng01, p.45.*

- **MONO/POLY** `MONO`
- **OCT SHIFT** `-1` (-3…3)
- **CUTOFF** `-34` (-64…63)
- **RESONANCE** `-18` (-64…63)
- **ATTACK** `-20` (-64…63)
- **RELEASE** `-24` (-64…63)
- **MFX TYPE** `04 Low Boost`
- **BOOST FREQUENCY** `63`
- **BOOST GAIN** `5` dB (0…12 dB)
  - ↳ cite: range manual — MC-101 Reference Manual eng01, p.54
  - ↳ hint: Hold [SHIFT], press [SOUND]
- **BOOST WIDTH** `NARROW`
- **REVERB SEND** `0` (0…127)
- **SHUFFLE** `0` (-50…50)
  - ↳ cite: range manual — MC-101 Reference Manual eng01, p.37
  - ↳ note: One setting for the whole clip, not per step
  - ↳ hint: Hold [SHIFT], press PAD [CLIP]

#### TONE Track 2 — `stab`: Short chord stab, played on the track

Polyphony — 3 notes sounding at once on this one voice. It needs a genuinely polyphonic voice, not 3 separate ones.

*Ranges cite manual — MC-101 Reference Manual eng01, p.45.*

- **MONO/POLY** `POLY`
- **ATTACK** `-40` (-64…63)
- **DECAY** `-26` (-64…63)
- **RELEASE** `-34` (-64…63)
- **CUTOFF** `20` (-64…63)
- **RESONANCE** `10` (-64…63)
- **DELAY SEND** `18` (0…127)
- **SHUFFLE** `0` (-50…50)
  - ↳ cite: range manual — MC-101 Reference Manual eng01, p.37
  - ↳ note: One setting for the whole clip, not per step
  - ↳ hint: Hold [SHIFT], press PAD [CLIP]

#### TONE Track 3 — `pad`: Slow polyphonic pad, opening under the drums

Polyphony — 3 notes sounding at once on this one voice. It needs a genuinely polyphonic voice, not 3 separate ones.

*Ranges cite manual — MC-101 Reference Manual eng01, p.45.*

- **MONO/POLY** `POLY`
- **ATTACK** `34` (-64…63)
- **RELEASE** `40` (-64…63)
- **CUTOFF** `-12` (-64…63)
- **VIB RATE** `-14` (-64…63)
- **VIB DEPTH** `8` (-64…63)
- **REVERB SEND** `68` (0…127)
- **DELAY SEND** `24` (0…127)
- **LEVEL** `92` (0…127)
- **SHUFFLE** `0` (-50…50)
  - ↳ cite: range manual — MC-101 Reference Manual eng01, p.37
  - ↳ note: One setting for the whole clip, not per step
  - ↳ hint: Hold [SHIFT], press PAD [CLIP]

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
- **MOD WAVE** `TRI`
  - ↳ hint: Hold [SHIFT], press [FILTER]
- **MOD NOTE** `1/1`
  - ↳ note: Tempo-synced rate; if the screen offers a SYNC selector, point it at NOTE
- **MOD DEST** `1` (1…3)
  - ↳ cite: range manual — TR-1000 Reference Manual (eng02) v1.13+, p.71
  - ↳ note: Which of the three assignment slots this uses
- **MOD TARGET** `FILTER`
- **MOD AMOUNT** `22` % (-100…100 %)
  - ↳ cite: range manual — TR-1000 Reference Manual (eng02) v1.13+, p.71
- **RVB SEND** `30` % (0…100 %)
  - ↳ cite: range manual — TR-1000 Reference Manual (eng02) v1.13+, p.71
  - ↳ hint: Hold [BD]-[RC], turn REVERB [LEVEL]
- **DLY SEND** `14` % (0…100 %)
  - ↳ cite: range manual — TR-1000 Reference Manual (eng02) v1.13+, p.71
  - ↳ hint: Hold [BD]-[RC], turn DELAY [LEVEL]
- **SHUFFLE** `0` (-100…100)
  - ↳ cite: range manual — TR-1000 Reference Manual (eng02) v1.13+, p.26
  - ↳ note: Pattern-wide: one setting for every track, saved with the pattern
  - ↳ hint: Hold [SHIFT], press [PTN SELECT]

#### CC — `impact`: Crash marking the top of a section

- **GEN** `9X Crash Cymbal`
  - ↳ hint: Hold [SHIFT]+[GEN], select with [C6]
- **TUNE** `0` % (-100…100 %)
  - ↳ cite: range manual — TR-1000 Reference Manual (eng02) v1.13+, p.62
- **DECAY** `84` % (0…100 %)
  - ↳ cite: range manual — TR-1000 Reference Manual (eng02) v1.13+, p.62
- **RVB SEND** `42` % (0…100 %)
  - ↳ cite: range manual — TR-1000 Reference Manual (eng02) v1.13+, p.71
  - ↳ hint: Hold [BD]-[RC], turn REVERB [LEVEL]
- **DLY SEND** `18` % (0…100 %)
  - ↳ cite: range manual — TR-1000 Reference Manual (eng02) v1.13+, p.71
  - ↳ hint: Hold [BD]-[RC], turn DELAY [LEVEL]
- **SHUFFLE** `0` (-100…100)
  - ↳ cite: range manual — TR-1000 Reference Manual (eng02) v1.13+, p.26
  - ↳ note: Pattern-wide: one setting for every track, saved with the pattern
  - ↳ hint: Hold [SHIFT], press [PTN SELECT]

### TR-8S

*Values below cite TR-8S Reference Manual, eng01.*

#### CH — `closed-hat`: Hat pushed into the compressor

*Ranges cite manual — TR-8S Reference Manual eng01, p.30.*

- **TONE** `CH category`
- **TUNE** `40` (-128…127)
- **DECAY** `44` (0…255)
- **INST FX TYPE** `COMP+DRV`
  - ↳ hint: Hold [SHIFT], press [INST]
- **COMP+DRV BALANCE** `200` (1…255)
  - ↳ cite: range manual — TR-8S Reference Manual eng01, p.32
- **CMP BALANCE** `220` (1…255)
  - ↳ cite: range manual — TR-8S Reference Manual eng01, p.32
- **DRV BALANCE** `130` (1…255)
  - ↳ cite: range manual — TR-8S Reference Manual eng01, p.32
- **REVERB SEND** `20` (0…255)
  - ↳ hint: INST Edit > ReverbSend
- **DELAY SEND** `24` (0…255)
  - ↳ hint: INST Edit > DelaySend
- **SHUFFLE** `0` (-128…127)
  - ↳ cite: range manual — TR-8S Reference Manual eng01, p.17
  - ↳ note: Pattern-wide: one setting for the whole pattern, not per instrument
  - ↳ hint: Hold [SHIFT], press [PTN SELECT]

#### OH — `open-hat`: Open hat with the top rolled off

Routing — KIT Edit > MUTE, OH = CH so CloseHH chokes the open hat (p.27)

*Ranges cite manual — TR-8S Reference Manual eng01, p.30.*

- **TONE** `OH category`
- **TUNE** `-24` (-128…127)
- **DECAY** `176` (0…255)
- **INST FX TYPE** `LPF`
  - ↳ hint: Hold [SHIFT], press [INST]
- **LPF CUTOFF** `132` (0…255)
  - ↳ cite: range manual — TR-8S Reference Manual eng01, p.31
- **REVERB SEND** `56` (0…255)
  - ↳ hint: INST Edit > ReverbSend
- **DELAY SEND** `48` (0…255)
  - ↳ hint: INST Edit > DelaySend
- **SHUFFLE** `0` (-128…127)
  - ↳ cite: range manual — TR-8S Reference Manual eng01, p.17
  - ↳ note: Pattern-wide: one setting for the whole pattern, not per instrument
  - ↳ hint: Hold [SHIFT], press [PTN SELECT]

#### CC — `riser`: A sample played backwards into the change

*Ranges cite manual — TR-8S Reference Manual eng01, p.31.*

- **TONE** `Sample`
  - ↳ note: Everything below the TUNE line is in the "Sample tone only" block (p.31) and does not exist on an ACB tone
- **TUNE** `0` (-128…127)
  - ↳ cite: range manual — TR-8S Reference Manual eng01, p.30
- **COARSE TUNE** `-5` St (-24…24 St)
  - ↳ note: Pitch in semitone steps
- **RATE** `-0.7` (-1…1)
  - ↳ note: Negative plays backward; -1.00 is full speed in reverse (p.31)
- **SPREAD** `32` (-50…50)
  - ↳ note: Skews pitch L/R for a stereo image
- **BIT REDUCE** `3` (0…12)
- **INST FX TYPE** `THRU`
  - ↳ hint: Hold [SHIFT], press [INST]
- **REVERB SEND** `150` (0…255)
  - ↳ cite: range manual — TR-8S Reference Manual eng01, p.30
  - ↳ hint: INST Edit > ReverbSend
- **DELAY SEND** `90` (0…255)
  - ↳ cite: range manual — TR-8S Reference Manual eng01, p.30
  - ↳ hint: INST Edit > DelaySend
- **SHUFFLE** `0` (-128…127)
  - ↳ cite: range manual — TR-8S Reference Manual eng01, p.17
  - ↳ note: Pattern-wide: one setting for the whole pattern, not per instrument
  - ↳ hint: Hold [SHIFT], press [PTN SELECT]

### Deluge

*Values below cite Deluge Official Guidebook, OS 4.1 (OLED) + community firmware release_1_2_1 (Chopin).*

#### Track 1 — `bass-mid`: Analog saw bass through the drive filter, crushed

*Ranges cite manual — Deluge Official Guidebook OS 4.1 (OLED), p.217.*

- **OSC TYPE** `Analog Saw`
- **LPF MODE** `DRIVE`
- **DECIMATION** `14` (0…50)
- **BITCRUSH** `9` (0…50)
- **EQ BASS AMOUNT** `29` (0…50)
  - ↳ cite: range manual — Deluge Official Guidebook OS 4.1 (OLED), p.219
- **SWING** `50` % (1…99 %)
  - ↳ cite: range manual — Deluge Official Guidebook OS 4.1 (OLED), p.39
  - ↳ note: 50 is off, above is late, below is early — song-wide, not per clip
  - ↳ hint: Hold [SHIFT], turn (TEMPO)

## 7. Finishing

**Sidechain**

- Cascadia — from external audio
- TR-1000 — internal, from external audio
- TR-8S — internal
- Deluge — internal

**Master FX**

What processes audio in this rig:

- ZOIA Euroburo — is an effects unit (stereo main out · audio in)
- Tracker Mini — carries DELAY SEND and REVERB SEND in its recipes
- MC-101 — carries MULTI FX, FX PRM and FX DEPTH on the panel, and DELAY SEND and REVERB SEND in its recipes
- TR-1000 — carries REVERB, DELAY, MASTER FX and ANALOG FX on the panel, and DLY SEND and RVB SEND in its recipes
- TR-8S — carries REVERB, DELAY and MASTER FX on the panel, and DELAY SEND, INST FX TYPE and REVERB SEND in its recipes
- Deluge — carries BITCRUSH, DECIMATION, DELAY AMOUNT, DELAY RATE, MOD FX FEEDBACK, MOD FX RATE, MOD FX TYPE and REVERB AMOUNT in its recipes
- Model 2400 — is a mixer and recorder (stereo main out · 8 individual outs · USB audio · audio in)
- Zoom LiveTrak L-8 — is a mixer and recorder (stereo main out · USB audio · audio in)

**Arrangement variations**

Sections that program identically, part for part — build one and copy it:

- **band 0** — Intro, Outro
- **band 1** — Build, Breakdown
- **band 3** — Drop, Peak

`pad` and `riser` have no pattern authored at any band, so nothing here varies for them.
