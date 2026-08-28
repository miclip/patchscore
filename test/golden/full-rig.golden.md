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

- **`kick`** → OP-XY · Track 1 — *Drum sampler kick, tight and forward*
  - p1 · exact `hard` · every section
- **`sub`** → Minitaur · Voice — *One oscillator under the filter, nothing above it*
  - p1 · exact `dark` · every section
- **`bass-mid`** → Subsequent 37 · Voice — *Mixer pushed past unity with feedback under it and MultiDrive on top*
  - p2 · exact `dirty` · every section
- **`clap`** → TR-8S · HC — *Hand clap with a short room*
  - p2 · exact `bright` · every section
- **`closed-hat`** → TR-6S · CH — *Closed hat bit-crushed into a tick*
  - p2 · exact `dirty` · every section
- **`metallic`** → Cascadia · Voice — *Ring modulator fed a square, notched rather than filtered*
  - p3 · exact `dark` · every section
- **`open-hat`** → TR-1000 · OH — *Dull open hat, more air than sizzle*
  - p3 · exact `dark` · every section
- **`stab`** → MC-101 · TONE Track 1 — *Short chord stab, played on the track*
  - p3 · exact `hard` · 3 notes at once on one polyphonic voice · every section
- **`impact`** → TR-1000 · CC — *Crash marking the top of a section*
  - p4 · exact `hard` · Drop, Peak
- **`pad`** → minilogue xd · Voice — *Low pad with the filter shut down over the top of it*
  - p4 · exact `dark` · 3 notes at once on one polyphonic voice · every section
- **`riser`** → TR-8S · CC — *A sample played backwards into the change*
  - p4 · exact `bright` · Build, Breakdown
- **`noise`** → CRAVE · Voice — *Raw noise through the filter, oscillator out of the mix*
  - p5, optional · exact `dirty` · every section

### Gaps

None.

## 3. Rig integration

**Clock source** — Hapax over `midi-din`, carrying 0 parts. Sync everything else to it, except Model 2400 and Zoom LiveTrak L-8, which cannot receive clock and run free, and Metropolix and DFAM, which have no `midi-din` input and run free.

- Why this box — 3 boxes here claim that job, so transport, then name, settled it · manual
  - ↳ cite: claim manual — Hapax Manual (22 June 2026), p.130

- On the Hapax, set `settings > sync output > MIDI A` to `CLOCK+TRANSPORT` · manual
  - ↳ note: MIDI B, C and D have the same row and the same four options; set the one the cable is in.
  - ↳ cite: value manual — Hapax Manual (22 June 2026), p.132

**Voice control** — Hapax sends the notes, 6 cables in all. Patch each pair before you play anything:

- pitch: Hapax `Cv out 2` → CRAVE `IN · OSC CV`
- gate: Hapax `gate out 2` → CRAVE `IN · ENV GATE`
- pitch: Hapax `Cv out 3` → Cascadia `EXT IN · PITCH`
- gate: Hapax `gate out 3` → Cascadia `EXT IN · GATE`
- pitch: Hapax `Cv out 4` → Minitaur `CONTROLLER INPUTS · PITCH CV`
- gate: Hapax `gate out 4` → Minitaur `CONTROLLER INPUTS · GATE`

- Why this box sends them — it is already the clock source, so the cables run from where the tempo does

- **MPC Live III** — groovebox · 0 parts
  - clock: sends clock · out: midi-din/usb · in: midi-din/usb/ableton-link
  - audio: stereo main out · 4 individual outs · USB audio · audio in
  - mixer: no parts assigned; nothing to patch
- **MPC One G2** — groovebox · 0 parts
  - clock: sends clock · out: midi-din/usb · in: midi-din/usb/ableton-link
  - audio: stereo main out · USB audio · audio in
  - mixer: no parts assigned; nothing to patch
- **MPC XL** — groovebox · 0 parts
  - clock: sends clock · out: midi-din/usb · in: midi-din/usb/ableton-link
  - audio: stereo main out · 6 individual outs · USB audio · audio in
  - mixer: no parts assigned; nothing to patch
- **CRAVE** — semi-modular · 1 part
  - clock: receives clock only · midi-din/usb
  - audio: mono main out · audio in
  - mixer: 1 part, no individual outs: one mono channel for all
- **Digitakt II** — sampler · 0 parts
  - clock: sends clock · midi-din/usb
  - audio: stereo main out · USB audio · audio in
  - mixer: no parts assigned; nothing to patch
- **ZOIA Euroburo** — fx-processor · 0 parts
  - clock: receives clock only · analog-clock/midi-din
  - audio: stereo main out · audio in
  - mixer: no parts assigned; nothing to patch
- **Cascadia** — semi-modular · 1 part
  - clock: sends clock · midi-din/usb/analog-clock
  - audio: mono main out · audio in
  - mixer: 1 part, no individual outs: one mono channel for all
- **Metropolix** — sequencer · 0 parts
  - clock: sends clock · usb/analog-clock
  - audio: no audio I/O
  - mixer: no parts assigned; nothing to patch
- **minilogue xd** — synth · 1 part
  - clock: sends clock · midi-din/usb/sync
  - audio: stereo main out
  - mixer: 1 part, no individual outs: one stereo channel for all
- **DFAM** — semi-modular · 0 parts
  - clock: sends clock · analog-clock
  - audio: mono main out · audio in
  - mixer: no parts assigned; nothing to patch
- **Grandmother** — semi-modular · 0 parts
  - clock: sends clock · midi-din/usb/analog-clock
  - MIDI IN: MIDI Clock and Start/Stop are followed or ignored per the Global Settings (p.37) · manual
    - ↳ cite: value manual — Moog Grandmother User’s Manual (Version 2), p.36
  - MIDI OUT: Everything originating on this box, MIDI Clock included when the Global Setting sends it (p.37) · manual
    - ↳ cite: value manual — Moog Grandmother User’s Manual (Version 2), p.36
  - audio: mono main out · audio in
  - mixer: no parts assigned; nothing to patch
- **Matriarch** — semi-modular · 0 parts
  - clock: sends clock · midi-din/usb/analog-clock
  - MIDI IN: MIDI Clock and Start/Stop are followed or ignored per Global Setting 1.5 (p.64) · manual
    - ↳ cite: value manual — Moog Matriarch Manual (012023), p.59
  - MIDI OUT: Everything originating here, MIDI Clock included — on by default per Global Setting 1.6 (p.64) · manual
    - ↳ cite: value manual — Moog Matriarch Manual (012023), p.59
  - audio: stereo main out · audio in
  - mixer: no parts assigned; nothing to patch
- **Minitaur** — synth · 1 part
  - clock: receives clock only · midi-din/usb
  - audio: mono main out · audio in
  - mixer: 1 part, no individual outs: one mono channel for all
- **Mother-32** — semi-modular · 0 parts
  - clock: sends clock · out: analog-clock · in: midi-din/analog-clock
  - MIDI IN: The only MIDI connector on the box: input only, 5-pin DIN, on the front panel · manual
    - ↳ cite: value manual — Moog Mother-32 User Manual (Version 2), p.54
  - audio: mono main out · audio in
  - mixer: no parts assigned; nothing to patch
- **Subharmonicon** — semi-modular · 0 parts
  - clock: sends clock · out: analog-clock · in: midi-din/analog-clock
  - IN · MIDI IN: A 3.5 mm socket fed by the supplied five-pin DIN adapter (MIDI Type A). Takes clock, note data and CCs. MIDI clock overrides the internal clock *and* anything at IN · CLOCK · manual
    - ↳ cite: value manual — Moog Subharmonicon Manual, p.37
  - audio: mono main out
  - mixer: no parts assigned; nothing to patch
- **Subsequent 37** — synth · 1 part
  - clock: sends clock · midi-din/usb
  - audio: mono main out · audio in
  - mixer: 1 part, no individual outs: one mono channel for all
- **Tracker Mini** — groovebox · 0 parts
  - clock: sends clock · midi-din/usb
  - MIDI Out, MIDI In: 3.5mm TRS — use the supplied Type B adapter for 5-pin MIDI (p.13, p.284) · manual
    - ↳ cite: value manual — Polyend Tracker Mini Manual 2.2.1b, p.13
  - audio: stereo main out · USB audio · audio in
  - mixer: no parts assigned; nothing to patch
- **MC-101** — groovebox · 1 part
  - clock: sends clock · midi-din/usb
  - audio: stereo main out · USB audio
  - mixer: 1 part, no individual outs: one stereo channel for all
- **TR-1000** — drum-machine · 2 parts
  - clock: sends clock · midi-din/din-sync/usb/analog-clock/trigger
  - audio: stereo main out · 10 individual outs · USB audio · audio in
  - mixer: 2 parts, 10 individual outs: one channel each
- **TR-6S** — drum-machine · 1 part
  - clock: sends clock · midi-din/usb
  - audio: stereo main out · USB audio
  - mixer: 1 part, no individual outs: one stereo channel for all
- **TR-8S** — drum-machine · 2 parts
  - clock: sends clock · midi-din/usb/trigger
  - audio: stereo main out · 6 individual outs · USB audio · audio in
  - mixer: 2 parts, 6 individual outs: one channel each
- **Hapax** — sequencer · 0 parts
  - clock: sends clock · midi-din/usb/analog-clock
  - midi in A: CLOCK SOURCE = MIDI IN A makes this the sync input; MIDI IN B is the other choice (p.130). · manual
    - ↳ cite: value manual — Hapax Manual (22 June 2026), p.27
  - midi out A: Sync output must be set to CLOCK+TRANSPORT for the port the cable is in; B, C and D send the same clock (p.132). · manual
    - ↳ cite: value manual — Hapax Manual (22 June 2026), p.28
  - audio: no audio I/O
  - mixer: no parts assigned; nothing to patch
- **Deluge** — groovebox · 0 parts
  - clock: sends clock · midi-din/usb/analog-clock
  - audio: stereo main out · audio in
  - mixer: no parts assigned; nothing to patch
- **Model 2400** — mixer-recorder · 0 parts
  - clock: sends clock, cannot receive · midi-din/usb
  - audio: stereo main out · 8 individual outs · USB audio · audio in
  - mixer: no parts assigned; nothing to patch
- **OP-XY** — groovebox · 1 part
  - clock: sends clock · out: midi-din/usb/sync · in: midi-din/usb
  - midi in: 3.5 mm TRS. The manual does not state which TRS type this input is — it names type A only for the multi-out (p.111). Clock arrives here per p.88, which says midi clock is sent and received without saying the transport follows it. · manual
    - ↳ cite: value manual — OP-XY full guide v1.1.15, p.3
  - audio: stereo main out · USB audio · audio in
  - mixer: 1 part, no individual outs: one stereo channel for all
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

### `bass-mid` — Subsequent 37 · Voice

**Mixer pushed past unity with feedback under it and MultiDrive on top** — settings in Sound design

2 bars in F minor.

A step is one note long and nothing here sets a length: `TIE` joins a note to the next step, and stacking those is how anything longer is entered. · manual
- ↳ cite: claim manual — Subsequent 37 User's Manual, p.17

- bar 1 · step 1 · sounds for 3 steps · `F1` · root · MIDI 29
- bar 1 · step 7 · sounds for 2 steps · `F1` · root · MIDI 29
- bar 1 · step 11 · sounds for 3 steps · `Bb1` (`A#1`) · 4th · MIDI 34
- bar 1 · step 15 · sounds for 2 steps · `F1` · root · MIDI 29
- bar 2 · step 17 · sounds for 3 steps · `F1` · root · MIDI 29
- bar 2 · step 23 · sounds for 2 steps · `Db2` (`C#2`) · 6th · MIDI 37
- bar 2 · step 27 · sounds for 4 steps · `C2` · 5th · MIDI 36

### `pad` — minilogue xd · Voice

**Low pad with the filter shut down over the top of it** — settings in Sound design

8 bars in F minor.

How this box sets a note’s length is not established here, so the durations below are the part rather than a field to fill in. · unread
- ↳ cite: unread — the minilogue xd manual is not in `manuals/`; no document here was opened for it

- bar 1 · step 1 · sounds for 64 steps (4 bars) · `F3` `Ab3` (`G#3`) `C4` · root 3rd 5th · MIDI 53 56 60
- bar 5 · step 65 · sounds for 32 steps (2 bars) · `Db4` (`C#4`) `F4` `Ab4` (`G#4`) · 6th root 3rd · MIDI 61 65 68
- bar 7 · step 97 · sounds for 32 steps (2 bars) · `Eb4` (`D#4`) `G4` `Bb4` (`A#4`) · 7th 2nd 4th · MIDI 63 67 70

### `stab` — MC-101 · TONE Track 1

**Short chord stab, played on the track** — settings in Sound design

4 bars in F minor.

Note length is set per note here — `LEN`. · manual
- ↳ cite: claim manual — MC-101 Reference Manual eng01, p.22

- bar 1 · step 1 · sounds for 2 steps · `F3` `Ab3` (`G#3`) `C4` · root 3rd 5th · MIDI 53 56 60
- bar 1 · step 11 · sounds for 1 step · `F3` `Ab3` (`G#3`) `C4` · root 3rd 5th · MIDI 53 56 60
- bar 3 · step 33 · sounds for 2 steps · `F3` `Ab3` (`G#3`) `C4` · root 3rd 5th · MIDI 53 56 60
- bar 4 · step 49 · sounds for 3 steps · `C4` `Eb4` (`D#4`) `G4` · 5th 7th 2nd · MIDI 60 63 67

## 5. Step programming

### `kick` — OP-XY · Track 1

**Drum sampler kick, tight and forward** — settings in Sound design

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

**On this box** — OP-XY

- `accent` → `velocity` 127 on step 9 · manual
  - ↳ cite: value manual — OP-XY full guide v1.1.15, p.31
  - ↳ hint: Hold [shift], velocity key, then a sharp
- `ghost` → `velocity` 32 on steps 8, 16 · manual
  - ↳ cite: value manual — OP-XY full guide v1.1.15, p.31
  - ↳ hint: Hold [shift], velocity key, then a sharp

### `sub` — Minitaur · Voice

**One oscillator under the filter, nothing above it** — settings in Sound design

**Not programmed here** — it has no sequencer, keyboard or arpeggiator, so every note arrives over MIDI or as a gate and a pitch voltage. Enter this figure on whatever is driving it; the rig diagram shows what that is.

**Intro, Outro** — 16 steps, band 0

```
 1 x··· ···· ···· ····
```
- `downbeat` — 1

**Build, Breakdown** — 16 steps, band 1

```
 1 x··· ···· x··· ··x·
```
- `downbeat` — 1, 9
- `offbeat` — 15

**Drop, Peak** — 16 steps, band 3

```
 1 x·x· ··x· ··x· ··x·
```
- `downbeat` — 1
- `offbeat` — 3, 7, 11, 15

### `bass-mid` — Subsequent 37 · Voice

**Mixer pushed past unity with feedback under it and MultiDrive on top** — settings in Sound design

**The hook is the pattern** — see Hook above for its steps and what each one carries. Nothing separate to program here.

### `clap` — TR-8S · HC

**Hand clap with a short room** — settings in Sound design

**Intro, Outro** — 16 steps, band 0

```
 1 ···· ···· ···· x···
```
- `backbeat` — 13

**On this box** — TR-8S

- `backbeat` → `accent` true on step 13
  - ↳ hint: ACCENT [STEP], then pads

**Build, Breakdown** — 16 steps, band 1

```
 1 ···· x··· ···· x···
```
- `backbeat` — 5, 13

**On this box** — TR-8S

- `backbeat` → `accent` true on steps 5, 13
  - ↳ hint: ACCENT [STEP], then pads

**Drop, Peak** — 16 steps, band 3

```
 1 ···· x··· ···· xxxx
```
- `backbeat` — 5
- `accent` — 13 (vel 112)
- `fill` — 14, 15, 16

**On this box** — TR-8S

- `backbeat` → `accent` true on step 5
  - ↳ hint: ACCENT [STEP], then pads

### `closed-hat` — TR-6S · CH

**Closed hat bit-crushed into a tick** — settings in Sound design

**Intro, Outro** — 16 steps, band 0

```
 1 ··x· ··x· ··x· ··x·
```
- `offbeat` — 3, 7, 11, 15

**On this box** — TR-6S

- `offbeat` → `substep` 1/4 on steps 3, 7, 11, 15
  - ↳ hint: Press [SUB], then a pad

**Build, Breakdown** — 16 steps, band 1

```
 1 ·xx· ··x· ·xx· ··x·
```
- `ghost` — 2, 10 (all vel 45)
- `offbeat` — 3, 7, 11, 15

**On this box** — TR-6S

- `offbeat` → `substep` 1/4 on steps 3, 7, 11, 15
  - ↳ hint: Press [SUB], then a pad

**Drop, Peak** — 16 steps, band 3

```
 1 xxxx xxxx xxxx xxxx
```
- `downbeat` — 1, 5, 9, 13
- `ghost` — 2, 4, 6, 8, 10, 12, 14, 16 (all vel 42)
- `offbeat` — 3, 7, 11
- `accent` — 15 (vel 108)

**On this box** — TR-6S

- `offbeat` → `substep` 1/4 on steps 3, 7, 11
  - ↳ hint: Press [SUB], then a pad

### `metallic` — Cascadia · Voice

**Ring modulator fed a square, notched rather than filtered** — settings in Sound design

**Not programmed here** — it has no sequencer, so it is played from whichever controller or sequencer is driving the rig. Enter this figure on whatever is driving it; the rig diagram shows what that is.

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

### `stab` — MC-101 · TONE Track 1

**Short chord stab, played on the track** — settings in Sound design

**The hook is the pattern** — see Hook above for its steps and what each one carries. Nothing separate to program here.

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

### `pad` — minilogue xd · Voice

**Low pad with the filter shut down over the top of it** — settings in Sound design

**The hook is the pattern** — see Hook above for its steps and what each one carries. Nothing separate to program here.

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

*Values below cite CRAVE Quick Start Guide BE_0718-AAJ_WW.*

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

*Values below cite Intellijel Cascadia Manual v1.1.*

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

### minilogue xd

*Values below cite minilogue xd Owner's Manual E 9.*

#### Voice — `pad`: Low pad with the filter shut down over the top of it

Polyphony — 3 notes sounding at once on this one voice. It needs a genuinely polyphonic voice, not 3 separate ones.

*Ranges cite manual — minilogue xd Owner's Manual E 9, p.24.*

- **PORTAMENTO** `20` (0…127)
  - ↳ cite: range manual — minilogue xd Owner's Manual E 9, p.17
- **SWING** `0` % (-75…75 %)
  - ↳ cite: range manual — minilogue xd Owner's Manual E 9, p.41
  - ↳ note: 0 is straight; the arpeggiator uses the same value
  - ↳ hint: EDIT MODE, PROGRAM EDIT, button 7
- **VOICE MODE TYPE** `POLY`
- **VOICE MODE DEPTH** `0` (0…1023)
  - ↳ cite: range manual — minilogue xd Owner's Manual E 9, p.17
  - ↳ note: Left at 0 — turning right crosses into DUO, which spends two voices on every key
- **VCO 1 · WAVE** `SAW`
- **VCO 1 · OCTAVE** `16'`
- **VCO 1 · PITCH** `0` c (-1200…1200 c)
  - ↳ cite: range manual — minilogue xd Owner's Manual E 9, p.18
- **VCO 1 · SHAPE** `380` (0…1023)
  - ↳ cite: range manual — minilogue xd Owner's Manual E 9, p.18
  - ↳ note: Shape, complexity, or duty cycle of the selected wave
- **VCO 2 · WAVE** `TRI`
- **VCO 2 · OCTAVE** `8'`
- **VCO 2 · PITCH** `-9` c (-1200…1200 c)
  - ↳ cite: range manual — minilogue xd Owner's Manual E 9, p.18
- **VCO 2 · SHAPE** `200` (0…1023)
  - ↳ cite: range manual — minilogue xd Owner's Manual E 9, p.18
- **VCO 2 · SYNC** `OFF`
  - ↳ note: Locks oscillator 2 to the phase of oscillator 1
- **VCO 2 · RING** `OFF`
  - ↳ note: Oscillator 1 ring-modulates oscillator 2
- **CROSS MOD DEPTH** `0` (0…1023)
  - ↳ cite: range manual — minilogue xd Owner's Manual E 9, p.19
  - ↳ note: Oscillator 1 modulating the pitch of oscillator 2
- **MULTI ENGINE · NOISE/VPM/USR** `NOISE`
- **MULTI ENGINE · TYPE** `Low`
- **MULTI ENGINE · SHAPE** `400` Hz (10…21000 Hz)
  - ↳ cite: range manual — minilogue xd Owner's Manual E 9, p.20
  - ↳ note: CUTOFF — the low-pass filter on the noise
- **MIXER · VCO 1** `700` (0…1023)
  - ↳ cite: range manual — minilogue xd Owner's Manual E 9, p.22
- **MIXER · VCO 2** `540` (0…1023)
  - ↳ cite: range manual — minilogue xd Owner's Manual E 9, p.22
- **MIXER · MULTI** `120` (0…1023)
  - ↳ cite: range manual — minilogue xd Owner's Manual E 9, p.22
- **CUTOFF** `300` (0…1023)
  - ↳ cite: range manual — minilogue xd Owner's Manual E 9, p.23
  - ↳ note: Set too low and the patch may be barely audible
- **RESONANCE** `180` (0…1023)
  - ↳ cite: range manual — minilogue xd Owner's Manual E 9, p.23
- **DRIVE** `50%`
  - ↳ note: The filter drive circuit, in three stages
- **KEYTRACK** `50%`
  - ↳ note: 100% moves the cutoff with the key, centred on C4
- **AMP EG · ATTACK** `620` (0…1023)
- **AMP EG · DECAY** `760` (0…1023)
- **AMP EG · SUSTAIN** `800` (0…1023)
- **AMP EG · RELEASE** `780` (0…1023)
- **EG · ATTACK** `500` (0…1023)
- **EG · DECAY** `700` (0…1023)
- **EG · INT** `-18` % (-100…100 %)
  - ↳ note: Negative applies the envelope downwards
- **EG · TARGET** `CUTOFF`
- **LFO · WAVE** `TRI`
- **LFO · MODE** `NORMAL`
- **LFO · RATE** `110` (0…1023)
  - ↳ cite: range manual — minilogue xd Owner's Manual E 9, p.25
- **LFO · INT** `70` (0…511)
  - ↳ cite: range manual — minilogue xd Owner's Manual E 9, p.25
  - ↳ hint: Hold SHIFT, turn INT to invert
- **LFO · TARGET** `CUTOFF`
- **EFFECTS · DEL/REV/MOD** `REV`
  - ↳ note: Selects which effect the two knobs below are setting; the other two keep their stored values
- **EFFECTS · OFF/ON/SELECT** `ON`
  - ↳ hint: Hold SHIFT, flip to SELECT
- **EFFECTS · DEPTH** `62` % (0…100 %)
  - ↳ cite: range manual — minilogue xd Owner's Manual E 9, p.26

### Minitaur

*Values below cite Moog Minitaur Manual.*

#### Voice — `sub`: One oscillator under the filter, nothing above it

Routing — One VCO only — VCO 2 is down, so there is nothing to beat against and the pitch is dead still.

*Ranges cite manual — Moog Minitaur Manual, p.29.*

- **FINE TUNE** `0` st (-1…1 st)
  - ↳ note: Centred is in tune. Adjusts both oscillators together, and neither sends nor receives MIDI (p.10)
- **OSCILLATOR 1** `Square`
  - ↳ note: The switch LED is off for Sawtooth and on for Square
- **OSCILLATOR 2** `Square`
- **VCO 2 FREQ** `0` st (-12…12 st)
  - ↳ note: Centre is unison with VCO 1; the panel marks only − and +
- **VCO 1 LVL** `100` % (0…100 %)
  - ↳ hint: Past 2 o’clock it clips the filter
- **VCO 2 LVL** `0` % (0…100 %)
  - ↳ note: The VCOs begin to clip the filter at about 2 o’clock, which is where grit pushes them
- **CUTOFF** `80` Hz (20…20000 Hz)
  - ↳ note: The one knob on this panel with a printed scale: 20Hz, 80Hz, 320Hz, 1.2KHz, 5KHz, 20KHz
- **RES** `5` % travel (0…100 % travel)
  - ↳ cite: range unverified — mood leaves this value alone
  - ↳ note: p.29 gives this range as "0 to Self-Oscillation" — a named endpoint, not a number, so this is percent of travel
- **EG AMOUNT** `0` % (-100…100 %)
  - ↳ note: How much the filter envelope adds to or subtracts from CUTOFF; centre is none
- **FILTER ATTACK** `1` ms (1…30000 ms)
  - ↳ note: 1 ms fully anticlockwise to 30 s fully clockwise; set it by ear
- **FILTER DECAY/RELEASE** `400` ms (1…30000 ms)
  - ↳ note: One knob for both segments. In Mode 1 the RELEASE switch decides whether you hear the release at all; in Mode 2 it decides which of the two the knob is editing — see `DECAY/RELEASE MODE`
- **FILTER SUSTAIN** `100` % (0…100 %)
- **AMPLIFIER ATTACK** `5` ms (1…30000 ms)
  - ↳ note: 1 ms fully anticlockwise to 30 s fully clockwise; set it by ear
- **AMPLIFIER DECAY/RELEASE** `600` ms (1…30000 ms)
  - ↳ note: One knob for both segments. In Mode 1 the RELEASE switch decides whether you hear the release at all; in Mode 2 it decides which of the two the knob is editing — see `DECAY/RELEASE MODE`
- **AMPLIFIER SUSTAIN** `100` % (0…100 %)
- **RELEASE** `Off`
  - ↳ note: In Mode 1: on, the release time equals the decay time; off, the envelope stops dead at note-off
- **DECAY/RELEASE MODE** `MODE 1`
  - ↳ note: Hold RELEASE ON/OFF for one second to toggle; remembered on power-down. Mode 1 links decay and release, which is what the times above assume
- **LFO RATE** `0.5` Hz (0.01…100 Hz)
- **VCO LFO AMT** `0` % (0…100 %)
  - ↳ note: Up to ±1 octave of pitch at full travel (p.16)
- **VCF LFO AMT** `0` % (0…100 %)
  - ↳ note: Up to ±5 octaves of cutoff at full travel (p.16)
- **GLIDE** `Off`
- **GLIDE RATE** `0` % (0…100 %)
  - ↳ note: Instantaneous fully anticlockwise to extremely long fully clockwise (p.11)
- **VOLUME** `70` % travel (0…100 % travel)
  - ↳ cite: range unverified — mood leaves this value alone
  - ↳ note: Panelled `VOLUME` beside a headphone pictogram — one knob sets the output and the headphones together (p.17)

### Subsequent 37

*Values below cite Subsequent 37 User's Manual.*

#### Voice — `bass-mid`: Mixer pushed past unity with feedback under it and MultiDrive on top

*Ranges cite manual — Subsequent 37 User's Manual, p.27.*

- **SWING** `50` % (0…100 %)
  - ↳ cite: range manual — Subsequent 37 User's Manual, p.40
  - ↳ note: 50 is straight; it swings the onboard arpeggiator and sequencer, nothing played from elsewhere
  - ↳ hint: PRESET EDIT, ARPEGGIATOR, SWING
- **GLIDE · ON** `OFF`
  - ↳ note: Must be lit for any glide at all
- **GLIDE · TYPE** `LCR`
  - ↳ note: LCR is constant rate, LCT constant time, EXP fast then slowing
- **GLIDE · OSC** `BOTH`
- **GLIDE · TIME** `0` (0…10)
  - ↳ cite: range manual — Subsequent 37 User's Manual, p.21
  - ↳ note: The panel calibration; this manual prints no glide time in seconds
- **GLIDE · GATED** `OFF`
  - ↳ note: On, the pitch only glides while a key is held
- **GLIDE · LEGATO** `OFF`
  - ↳ note: On, glide happens only between overlapping notes
- **OSC 1 · OCTAVE** `16'`
- **OSC 1 · WAVE** `SAWTOOTH`
  - ↳ note: The knob is continuous; these are its four named points
- **OSC 2 · OCTAVE** `16'`
- **OSC 2 · WAVE** `NARROW PULSE`
  - ↳ note: The knob is continuous; these are its four named points
- **OSC · HARD SYNC** `OFF`
  - ↳ note: Keep OSC 2 at or above OSC 1 or it barely sounds
- **OSC · KB RESET** `OFF`
  - ↳ note: A defined leading edge, at the cost of a click on hard attacks
- **OSC · DUO MODE** `OFF`
  - ↳ note: Off: one note at a time, both oscillators on the same key
- **OSC · KB CTRL** `HI`
  - ↳ note: Inert while DUO MODE is off; set so FREQUENCY keeps its semitone scale
- **OSC 2 · FREQUENCY** `-0.5` st (-7…7 st)
  - ↳ cite: range manual — Subsequent 37 User's Manual, p.26
  - ↳ note: Centre is unison with OSC 1; fully clockwise is a fifth
- **OSC 2 · BEAT FREQ** `1` Hz (-3.5…3.5 Hz)
  - ↳ cite: range manual — Subsequent 37 User's Manual, p.26
  - ↳ note: A constant beat rate at every pitch, unlike FREQUENCY
- **MIXER · OSC 1** `8.5` (0…10)
- **MIXER · SUB 1** `7.5` (0…10)
  - ↳ note: Always a square, always an octave below OSC 1
- **MIXER · OSC 2** `8` (0…10)
- **MIXER · NOISE** `1.5` (0…10)
  - ↳ note: Pink, not white
- **MIXER · FDBK / EXT IN** `3` (0…10)
  - ↳ note: With nothing in EXT IN this feeds the mixer output back into itself
- **CUTOFF** `260` Hz (20…20000 Hz)
  - ↳ cite: range manual — Subsequent 37 User's Manual, p.28
  - ↳ note: Fully down closes the filter completely
- **RESONANCE** `6.5` (0…10)
  - ↳ cite: range manual — Subsequent 37 User's Manual, p.28
  - ↳ hint: Above 7 the filter sings by itself
- **MULTIDRIVE** `7.5` (0…10)
  - ↳ cite: range manual — Subsequent 37 User's Manual, p.28
  - ↳ note: Tube-like warmth at the bottom, hard clipping at the top
- **FILTER · SLOPE** `24`
  - ↳ note: dB per octave: one, two, three or four poles
- **FILTER · EG AMT** `2.5` (-5…5)
  - ↳ cite: range manual — Subsequent 37 User's Manual, p.28
  - ↳ note: Bipolar: below centre the envelope pulls the cutoff down
- **FILTER · KB TRACK** `0.5` (0…2)
  - ↳ cite: range manual — Subsequent 37 User's Manual, p.29
  - ↳ note: 1.0 is 1:1 tracking centred on C3; 2.0 is 2:1
- **ENV · KNOB SHIFT** `OFF`
  - ↳ note: Unlit, or the eight knobs below are DELAY, HOLD, VEL AMT and KB TRACK instead
- **FILTER EG · ATTACK** `2` ms (1…10000 ms)
  - ↳ cite: range manual — Subsequent 37 User's Manual, p.30
- **FILTER EG · DECAY** `260` ms (1…10000 ms)
  - ↳ cite: range manual — Subsequent 37 User's Manual, p.30
- **FILTER EG · SUSTAIN** `2` (0…10)
  - ↳ cite: range manual — Subsequent 37 User's Manual, p.31
  - ↳ note: 0 to 100%, calibrated 1 to 10
- **FILTER EG · RELEASE** `200` ms (1…10000 ms)
  - ↳ cite: range manual — Subsequent 37 User's Manual, p.31
- **FILTER EG · LOOP** `OFF`
  - ↳ note: On, the envelope repeats for as long as a note is held — a multistage LFO
- **AMP EG · ATTACK** `2` ms (1…10000 ms)
  - ↳ cite: range manual — Subsequent 37 User's Manual, p.32
- **AMP EG · DECAY** `500` ms (1…10000 ms)
  - ↳ cite: range manual — Subsequent 37 User's Manual, p.32
- **AMP EG · SUSTAIN** `6.5` (0…10)
  - ↳ cite: range manual — Subsequent 37 User's Manual, p.32
  - ↳ note: 0 to 100%, calibrated 1 to 10
- **AMP EG · RELEASE** `180` ms (1…10000 ms)
  - ↳ cite: range manual — Subsequent 37 User's Manual, p.32
- **AMP EG · MULTI TRIG** `ON`
  - ↳ note: On, every note re-attacks even when you play legato
- **AMP EG · LOOP** `OFF`
  - ↳ note: Off on everything but a bed: looping the amplitude re-articulates a held note
- **MOD 1 · SOURCE** `Saw`
- **MOD 1 · HI RANGE** `OFF`
  - ↳ note: On, the LFO runs ten times faster
- **MOD 1 · SYNC** `OFF`
  - ↳ note: Off, so RATE is in hertz rather than clock divisions
- **MOD 1 · LFO RATE** `5.5` Hz (0.1…100 Hz)
  - ↳ cite: range manual — Subsequent 37 User's Manual, p.22
- **MOD 1 · KB RESET** `OFF`
  - ↳ note: On, the LFO restarts at zero on every note
- **MOD 1 · PITCH AMT** `0` (-5…5)
  - ↳ cite: range manual — Subsequent 37 User's Manual, p.22
- **MOD 1 · OSC** `BOTH`
  - ↳ note: Which oscillator PITCH AMT reaches
- **MOD 1 · FILTER AMT** `0` (-5…5)
  - ↳ cite: range manual — Subsequent 37 User's Manual, p.22
- **MOD 1 · DEST** `OSC 2 WAVE`
- **MOD 1 · MOD AMT** `1` (-5…5)
  - ↳ cite: range manual — Subsequent 37 User's Manual, p.22

### MC-101

*Values below cite MC-101 Reference Manual eng01 and MC-101 Update eng08.*

#### TONE Track 1 — `stab`: Short chord stab, played on the track

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

### TR-1000

*Values below cite TR-1000 Reference Manual (eng02) v1.13+.*

**Pattern-wide**

One setting for the whole pattern — set it once, not once per part below.

- **SHUFFLE** `0` (-100…100)
  - ↳ cite: range manual — TR-1000 Reference Manual (eng02) v1.13+, p.26
  - ↳ note: Pattern-wide: one setting for every track, saved with the pattern
  - ↳ hint: Hold [SHIFT], press [PTN SELECT]

#### OH — `open-hat`: Dull open hat, more air than sizzle

*Ranges cite manual — TR-1000 Reference Manual (eng02) v1.13+, p.62.*

- **GEN** `606 Open HiHat`
  - ↳ hint: Hold [SHIFT]+[GEN], select with [C6]
- **TUNE** `-18` % (-100…100 %)
- **DECAY** `64` % (0…100 %)
- **TONE** `-35` % (-100…100 %)
  - ↳ hint: Brightness of the cymbal
- **RVB SEND** `14` % (0…100 %)
  - ↳ cite: range manual — TR-1000 Reference Manual (eng02) v1.13+, p.71
  - ↳ hint: Hold [BD]-[RC], turn REVERB [LEVEL]
- **DLY SEND** `12` % (0…100 %)
  - ↳ cite: range manual — TR-1000 Reference Manual (eng02) v1.13+, p.71
  - ↳ hint: Hold [BD]-[RC], turn DELAY [LEVEL]

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

### TR-6S

*Values below cite TR-6S Parameter Guide eng02 and TR-6S Owner's Manual eng02.*

**Pattern-wide**

One setting for the whole pattern — set it once, not once per part below.

- **SHUFFLE** `0` (-128…127)
  - ↳ cite: range manual — TR-6S Owner's Manual eng02, p.17
  - ↳ note: Pattern-wide: one setting for the whole pattern, not per instrument
  - ↳ hint: Hold [SHIFT], press [PTN SELECT]

#### CH — `closed-hat`: Closed hat bit-crushed into a tick

*Ranges cite manual — TR-6S Parameter Guide eng02, p.7.*

- **TONE** `CH/OH category`
- **TUNE** `44` (-128…127)
- **DECAY** `36` (0…255)
- **INST FX TYPE** `CRUSHER`
  - ↳ hint: Hold [SHIFT], press [INST]
- **CRUSHER BALANCE** `220` (1…255)
  - ↳ cite: range manual — TR-6S Parameter Guide eng02, p.10
- **SAMPLERATE** `128` (0…255)
  - ↳ cite: range manual — TR-6S Parameter Guide eng02, p.10
- **REVERB SEND** `12` (0…255)
  - ↳ hint: INST Edit > ReverbSend
- **DELAY SEND** `40` (0…255)
  - ↳ hint: INST Edit > DelaySend

### TR-8S

*Values below cite TR-8S Reference Manual eng01.*

**Content**

- Ships preset samples supplied in the box — look in the SAMPLE screen, where preset entries are marked P and user imports U. p.38 legends the icon and shows one example name, and no page prints the list, so the Source line below says what the part needs rather than naming a file. · manual
  - ↳ cite: claim manual — TR-8S Reference Manual eng01, p.38

**Pattern-wide**

One setting for the whole pattern — set it once, not once per part below.

- **SHUFFLE** `0` (-128…127)
  - ↳ cite: range manual — TR-8S Reference Manual eng01, p.17
  - ↳ note: Pattern-wide: one setting for the whole pattern, not per instrument
  - ↳ hint: Hold [SHIFT], press [PTN SELECT]

#### HC — `clap`: Hand clap with a short room

*Ranges cite manual — TR-8S Reference Manual eng01, p.30.*

- **TONE** `HC category`
- **TUNE** `24` (-128…127)
  - ↳ hint: Hold [SHIFT], press [INST]
- **DECAY** `112` (0…255)
- **INST FX TYPE** `H BOOST`
  - ↳ hint: Hold [SHIFT], press [INST]
- **H BOOST** `96` (0…255)
  - ↳ cite: range manual — TR-8S Reference Manual eng01, p.32
- **REVERB SEND** `88` (0…255)
  - ↳ hint: INST Edit > ReverbSend
- **DELAY SEND** `24` (0…255)
  - ↳ hint: INST Edit > DelaySend

#### CC — `riser`: A sample played backwards into the change

Source — A sample with a long decaying tail loaded into the Sample tone; a negative RATE plays it backwards, so the tail becomes the rise

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

### OP-XY

*Values below cite OP-XY full guide v1.1.15.*

**Content**

- Ships factory presets for every engine and category, and a factory projects folder — look in shift + a track button for presets, shift + projects for the folder. pp.52 and 37 say both exist, and the only screens that look like inventories reuse one set of seven names across all three browsers, so the Source line below says what the part needs rather than naming a file. · manual
  - ↳ cite: claim manual — OP-XY full guide v1.1.15, p.52

#### Track 1 — `kick`: Drum sampler kick, tight and forward

Source — A short, dry kick one-shot with its weight low and no audible tail

- Press [sample] from any screen; the white knob sets the record threshold and recording starts when the input crosses it (p.79). Maximum 20 seconds. · manual
  - ↳ cite: value manual — OP-XY full guide v1.1.15, p.75
  - ↳ hint: Press [sample], hold [M1] to record

Routing — Percussion group — p.73: any percussive engine routes there automatically

- **ENGINE** `drum sampler`
  - ↳ hint: Hold [shift], press [M1]
- **SAMPLE SOURCE** `audio input`
  - ↳ hint: Press [sample], hold [M1] to record

## 7. Finishing

**Sidechain**

The MPC Live III, MPC One G2, MPC XL and Cascadia can duck to another box: patch the box you want each to follow into its audio in.

The MPC Live III, MPC One G2 and MPC XL can also duck from their own parts.

The TR-1000, TR-6S, TR-8S, Deluge and OP-XY duck from their own parts only.

**Master FX**

What processes audio in this rig:

- MPC Live III — carries effects, though no part in this guide reaches them
- MPC One G2 — carries effects, though no part in this guide reaches them
- MPC XL — carries effects, though no part in this guide reaches them
- ZOIA Euroburo — is an effects unit (stereo main out · audio in)
- Matriarch — carries effects, though no part in this guide reaches them
- Tracker Mini — carries effects, though no part in this guide reaches them
- MC-101 — carries MULTI FX, FX PRM and FX DEPTH on the panel, and DELAY SEND in its recipes
- TR-1000 — carries REVERB, DELAY, MASTER FX and ANALOG FX on the panel, and DLY SEND and RVB SEND in its recipes
- TR-6S — carries MASTER FX on the panel, and DELAY SEND, INST FX TYPE and REVERB SEND in its recipes
- TR-8S — carries REVERB, DELAY and MASTER FX on the panel, and DELAY SEND, INST FX TYPE and REVERB SEND in its recipes
- Deluge — carries effects, though no part in this guide reaches them
- Model 2400 — is a mixer and recorder (stereo main out · 8 individual outs · USB audio · audio in)
- OP-XY — carries effects, though no part in this guide reaches them
- Zoom LiveTrak L-8 — is a mixer and recorder (stereo main out · USB audio · audio in)

**Arrangement variations**

Sections that program identically, part for part — build one and copy it:

- **band 0** — Intro, Outro · 9 parts, 14 strikes
- **band 1** — Build, Breakdown · 9 parts, 27 strikes
- **band 3** — Drop, Peak · 10 parts, 73 strikes

`riser` has no pattern authored at any band, so nothing here varies for it.

`pad` is held rather than struck, so there is no grid here to vary.
