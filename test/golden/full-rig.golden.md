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

- **`kick`** → Subharmonicon · Voice — *The ladder filter self-oscillating, opened by a sequencer clock*
  - p1 · exact `hard` · every section
- **`sub`** → MC-101 · TONE Track 1 — *Sine sub, one note at a time, nothing above the fundamental*
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
- **`stab`** → minilogue xd · Voice — *Four-voice stab with the filter snapping shut behind the chord*
  - p3 · exact `hard` · 3 notes at once on one polyphonic voice · every section
- **`impact`** → TR-1000 · CC — *Crash marking the top of a section*
  - p4 · exact `hard` · Drop, Peak
- **`pad`** → Muse · Timbre 1 — *Both filters low and serial, sixteen-foot underneath, no top at all*
  - p4 · exact `dark` · 3 notes at once on one polyphonic voice · every section
- **`riser`** → TR-8S · CC — *A sample played backwards into the change*
  - p4 · exact `bright` · Build, Breakdown
- **`noise`** → CRAVE · Voice — *Raw noise through the filter, oscillator out of the mix*
  - p5, optional · exact `dirty` · every section

### Gaps

None.

## 3. Rig integration

**Clock source** — Hapax over `midi-din`, carrying 0 parts. Sync everything else to it, except Zoom LiveTrak L-8, which cannot receive clock and runs free, and Model 2400, which cannot receive clock — a DAW drives its transport over HUI/MCU, and without one it runs free, and Metropolix and DFAM, which have no `midi-din` input and run free.

- Why this box — 4 boxes here claim that job, so transport, then name, settled it · manual
  - ↳ cite: claim manual — Hapax Manual (22 June 2026), p.130

- On the Hapax, set `settings > sync output > MIDI A` to `CLOCK+TRANSPORT` · manual
  - ↳ note: MIDI B, C and D have the same row and the same four options; set the one the cable is in.
  - ↳ cite: value manual — Hapax Manual (22 June 2026), p.132

**Voice control** — Hapax sends the notes, 6 cables in all. Patch each pair before you play anything:

- pitch: Hapax `Cv out 2` → CRAVE `IN · OSC CV`
- gate: Hapax `gate out 2` → CRAVE `IN · ENV GATE`
- pitch: Hapax `Cv out 3` → Cascadia `EXT IN · PITCH`
- gate: Hapax `gate out 3` → Cascadia `EXT IN · GATE`
- pitch: Hapax `Cv out 4` → Subharmonicon `IN · VCO 1`
- gate: Hapax `gate out 4` → Subharmonicon `IN · PLAY`

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
- **Minitaur** — synth · 0 parts
  - clock: receives clock only · midi-din/usb
  - audio: mono main out · audio in
  - mixer: no parts assigned; nothing to patch
- **Mother-32** — semi-modular · 0 parts
  - clock: sends clock · out: analog-clock · in: midi-din/analog-clock
  - MIDI IN: The only MIDI connector on the box: input only, 5-pin DIN, on the front panel · manual
    - ↳ cite: value manual — Moog Mother-32 User Manual (Version 2), p.54
  - audio: mono main out · audio in
  - mixer: no parts assigned; nothing to patch
- **Muse** — synth · 1 part
  - clock: sends clock · out: midi-din/analog-clock · in: midi-din/usb/analog-clock
  - audio: stereo main out
  - mixer: 1 part, no individual outs: one stereo channel for all
- **Subharmonicon** — semi-modular · 1 part
  - clock: sends clock · out: analog-clock · in: midi-din/analog-clock
  - IN · MIDI IN: A 3.5 mm socket fed by the supplied five-pin DIN adapter (MIDI Type A). Takes clock, note data and CCs. MIDI clock overrides the internal clock *and* anything at IN · CLOCK · manual
    - ↳ cite: value manual — Moog Subharmonicon Manual, p.37
  - audio: mono main out
  - mixer: 1 part, no individual outs: one mono channel for all
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
- **SP-404MK2** — sampler · 0 parts
  - clock: sends clock · out: midi-din · in: midi-din/usb
  - MIDI OUT, MIDI IN: 3.5mm stereo-mini, not 5-pin — Roland’s TRS/MIDI cable is the BMIDI-5-35 (p.14) · manual
    - ↳ cite: value manual — SP-404MK2 Reference Manual v4.00, p.14
  - audio: stereo main out · USB audio · audio in
  - mixer: no parts assigned; nothing to patch
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
- **EP–133 K.O. II** — sampler · 0 parts
  - clock: sends clock · midi-din/usb/sync
  - midi out: 3.5 mm TRS type A, MMA compliant pinout, 3.3 V. Clock leaves here only while mid > clk is set to out, which is also what stops it arriving · manual
    - ↳ cite: value manual — EP–133 K.O. II guide, /ep-133/tech-specs 16, mirrored 2026-08-28
  - midi in: 3.5 mm TRS type A, MMA compliant pinout, opto-coupled. Clock arrives here only while mid > clk is set to in — it ships off · manual
    - ↳ cite: value manual — EP–133 K.O. II guide, /ep-133/tech-specs 16, mirrored 2026-08-28
  - audio: stereo main out · USB audio · audio in
  - mixer: no parts assigned; nothing to patch
- **EP–40 riddim** — sampler · 0 parts
  - clock: sends clock · midi-din/usb/sync
  - midi out: 3.5 mm TRS type A, MMA compliant pinout, 3.3 V. Clock leaves here only while mid > clk is set to out, which is also what stops it arriving · manual
    - ↳ cite: value manual — EP–40 riddim guide, /ep-40/tech-specs 16, mirrored 2026-08-28
  - midi in: 3.5 mm TRS type A, MMA compliant pinout, opto-coupled. Clock arrives here only while mid > clk is set to in — it ships off · manual
    - ↳ cite: value manual — EP–40 riddim guide, /ep-40/tech-specs 16, mirrored 2026-08-28
  - audio: stereo main out · USB audio · audio in
  - mixer: no parts assigned; nothing to patch
- **OP-XY** — groovebox · 0 parts
  - clock: sends clock · out: midi-din/usb/sync · in: midi-din/usb
  - midi in: 3.5 mm TRS. The manual does not state which TRS type this input is — it names type A only for the multi-out (p.111). Clock arrives here per p.88, which says midi clock is sent and received without saying the transport follows it. · manual
    - ↳ cite: value manual — OP-XY full guide v1.1.15, p.3
  - audio: stereo main out · USB audio · audio in
  - mixer: no parts assigned; nothing to patch
- **T-1** — sequencer · 0 parts
  - clock: sends clock · midi-din/usb/analog-clock/ableton-link
  - midi · in: 3.5 mm TRS Type A — Type B adapters are incompatible. Enable Clock under T1 Config > MIDI I/O > TRS > In to follow it. · manual
    - ↳ cite: value manual — Torso T-1 docs, /t1/midi-and-analog-sync/midi-connectivity/, fetched 2026-08-28
  - midi · out: 3.5 mm TRS Type A. Clock and Start / Stop are enabled per message type under T1 Config > MIDI I/O > TRS > Out. · manual
    - ↳ cite: value manual — Torso T-1 docs, /t1/midi-and-analog-sync/midi-connectivity/, fetched 2026-08-28
  - audio: no audio I/O
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

### `pad` — Muse · Timbre 1

**Both filters low and serial, sixteen-foot underneath, no top at all** — settings in Sound design

8 bars in F minor.

Note length is set per note here — `GATE`. · manual
- ↳ cite: claim manual — Muse User's Manual v1.4.0, p.84

- bar 1 · step 1 · sounds for 64 steps (4 bars) · `F3` `Ab3` (`G#3`) `C4` · root 3rd 5th · MIDI 53 56 60
- bar 5 · step 65 · sounds for 32 steps (2 bars) · `Db4` (`C#4`) `F4` `Ab4` (`G#4`) · 6th root 3rd · MIDI 61 65 68
- bar 7 · step 97 · sounds for 32 steps (2 bars) · `Eb4` (`D#4`) `G4` `Bb4` (`A#4`) · 7th 2nd 4th · MIDI 63 67 70

### `stab` — minilogue xd · Voice

**Four-voice stab with the filter snapping shut behind the chord** — settings in Sound design

4 bars in F minor.

How this box sets a note’s length is not established here, so the durations below are the part rather than a field to fill in. · unread
- ↳ cite: unread — the minilogue xd manual is not in `manuals/`; no document here was opened for it

- bar 1 · step 1 · sounds for 2 steps · `F3` `Ab3` (`G#3`) `C4` · root 3rd 5th · MIDI 53 56 60
- bar 1 · step 11 · sounds for 1 step · `F3` `Ab3` (`G#3`) `C4` · root 3rd 5th · MIDI 53 56 60
- bar 3 · step 33 · sounds for 2 steps · `F3` `Ab3` (`G#3`) `C4` · root 3rd 5th · MIDI 53 56 60
- bar 4 · step 49 · sounds for 3 steps · `C4` `Eb4` (`D#4`) `G4` · 5th 7th 2nd · MIDI 60 63 67

## 5. Step programming

### `kick` — Subharmonicon · Voice

**The ladder filter self-oscillating, opened by a sequencer clock** — settings in Sound design

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

**Not programmed here** — it has no sequencer, so it is played from whichever controller or sequencer is driving the rig. Enter this figure on the Hapax, which drives it through `Cv out 3` and `gate out 3`.

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

### `stab` — minilogue xd · Voice

**Four-voice stab with the filter snapping shut behind the chord** — settings in Sound design

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

### `pad` — Muse · Timbre 1

**Both filters low and serial, sixteen-foot underneath, no top at all** — settings in Sound design

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

#### Voice — `stab`: Four-voice stab with the filter snapping shut behind the chord

Polyphony — 3 notes sounding at once on this one voice. It needs a genuinely polyphonic voice, not 3 separate ones.

*Ranges cite manual — minilogue xd Owner's Manual E 9, p.24.*

- **PORTAMENTO** `0` (0…127)
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
- **VCO 1 · OCTAVE** `8'`
- **VCO 1 · PITCH** `0` c (-1200…1200 c)
  - ↳ cite: range manual — minilogue xd Owner's Manual E 9, p.18
- **VCO 1 · SHAPE** `480` (0…1023)
  - ↳ cite: range manual — minilogue xd Owner's Manual E 9, p.18
  - ↳ note: Shape, complexity, or duty cycle of the selected wave
- **VCO 2 · WAVE** `SAW`
- **VCO 2 · OCTAVE** `8'`
- **VCO 2 · PITCH** `9` c (-1200…1200 c)
  - ↳ cite: range manual — minilogue xd Owner's Manual E 9, p.18
- **VCO 2 · SHAPE** `460` (0…1023)
  - ↳ cite: range manual — minilogue xd Owner's Manual E 9, p.18
- **VCO 2 · SYNC** `OFF`
  - ↳ note: Locks oscillator 2 to the phase of oscillator 1
- **VCO 2 · RING** `OFF`
  - ↳ note: Oscillator 1 ring-modulates oscillator 2
- **CROSS MOD DEPTH** `0` (0…1023)
  - ↳ cite: range manual — minilogue xd Owner's Manual E 9, p.19
  - ↳ note: Oscillator 1 modulating the pitch of oscillator 2
- **MULTI ENGINE · NOISE/VPM/USR** `NOISE`
- **MULTI ENGINE · TYPE** `Peak`
- **MULTI ENGINE · SHAPE** `500` Hz (110…880 Hz)
  - ↳ cite: range manual — minilogue xd Owner's Manual E 9, p.20
  - ↳ note: BANDWIDTH — the peak filter width
- **MIXER · VCO 1** `780` (0…1023)
  - ↳ cite: range manual — minilogue xd Owner's Manual E 9, p.22
- **MIXER · VCO 2** `620` (0…1023)
  - ↳ cite: range manual — minilogue xd Owner's Manual E 9, p.22
- **MIXER · MULTI** `180` (0…1023)
  - ↳ cite: range manual — minilogue xd Owner's Manual E 9, p.22
- **CUTOFF** `560` (0…1023)
  - ↳ cite: range manual — minilogue xd Owner's Manual E 9, p.23
  - ↳ note: Set too low and the patch may be barely audible
- **RESONANCE** `520` (0…1023)
  - ↳ cite: range manual — minilogue xd Owner's Manual E 9, p.23
- **DRIVE** `50%`
  - ↳ note: The filter drive circuit, in three stages
- **KEYTRACK** `50%`
  - ↳ note: 100% moves the cutoff with the key, centred on C4
- **AMP EG · ATTACK** `0` (0…1023)
- **AMP EG · DECAY** `300` (0…1023)
- **AMP EG · SUSTAIN** `0` (0…1023)
- **AMP EG · RELEASE** `240` (0…1023)
- **EG · ATTACK** `0` (0…1023)
- **EG · DECAY** `260` (0…1023)
- **EG · INT** `62` % (-100…100 %)
  - ↳ note: Negative applies the envelope downwards
- **EG · TARGET** `CUTOFF`
- **LFO · WAVE** `TRI`
- **LFO · MODE** `NORMAL`
- **LFO · RATE** `200` (0…1023)
  - ↳ cite: range manual — minilogue xd Owner's Manual E 9, p.25
- **LFO · INT** `0` (0…511)
  - ↳ cite: range manual — minilogue xd Owner's Manual E 9, p.25
  - ↳ hint: Hold SHIFT, turn INT to invert
- **LFO · TARGET** `CUTOFF`
- **EFFECTS · DEL/REV/MOD** `DEL`
  - ↳ note: Selects which effect the two knobs below are setting; the other two keep their stored values
- **EFFECTS · OFF/ON/SELECT** `ON`
  - ↳ hint: Hold SHIFT, flip to SELECT
- **EFFECTS · DEPTH** `28` % (0…100 %)
  - ↳ cite: range manual — minilogue xd Owner's Manual E 9, p.26

### Muse

*Values below cite Muse User's Manual v1.4.0 Appendix A (MIDI CC) and Muse User's Manual v1.4.0.*

**Song-wide**

One setting for the whole song — set it once, not once per part below.

- **DELAY · CHARACTER** `64` (0…127)
  - ↳ cite: range manual — Muse User's Manual v1.4.0 Appendix A (MIDI CC), p.122
  - ↳ note: Noon, where the default DJ-style filter on the repeats is doing nothing · Send MIDI CC 104 = 64. The knob carries no scale and no page maps its position to a CC value, so there is no printed setting for it by hand
- **DELAY · CLOCK SYNC** `ON`
  - ↳ note: Both TIME knobs jump between divisions of the global TEMPO
- **DELAY · FEEDBACK** `54` (0…127)
  - ↳ cite: range manual — Muse User's Manual v1.4.0 Appendix A (MIDI CC), p.122
  - ↳ note: Single repeat through to infinite · Send MIDI CC 103 = 54. The knob carries no scale and no page maps its position to a CC value, so there is no printed setting for it by hand
- **DELAY · LINK DELAYS** `OFF`
  - ↳ note: Off, so TIME-L is the left delay time rather than an offset against the right
- **DELAY · MIX** `38` (0…127)
  - ↳ cite: range manual — Muse User's Manual v1.4.0 Appendix A (MIDI CC), p.122
  - ↳ note: Send MIDI CC 105 = 38. The knob carries no scale and no page maps its position to a CC value, so there is no printed setting for it by hand
- **DELAY · SYNC TYPE** `COMBO`
  - ↳ note: Its printed default — every division rather than only straight, triplet or dotted ones
  - ↳ hint: Press MORE in that section
- **DELAY · TIME - L** `48` (0…127)
  - ↳ cite: range manual — Muse User's Manual v1.4.0 Appendix A (MIDI CC), p.122
  - ↳ note: Send MIDI CC 93 = 48. The knob carries no scale and no page maps its position to a CC value, so there is no printed setting for it by hand
- **DELAY · TIME - R** `72` (0…127)
  - ↳ cite: range manual — Muse User's Manual v1.4.0 Appendix A (MIDI CC), p.122
  - ↳ note: Send MIDI CC 94 = 72. The knob carries no scale and no page maps its position to a CC value, so there is no printed setting for it by hand
- **DYNAMIC VOICE ALLOCATION** `OFF`
  - ↳ note: Its printed default. On, a busy timbre steals from the other and the four-each split stops holding
  - ↳ hint: PROGRAMMER, VOICE CONTROL, MORE
- **MIDI IN CHANNEL** `1`
  - ↳ note: TIMBRE A listens here
  - ↳ hint: PROGRAMMER, MENU, MIDI
- **MULTI IN B CHANNEL** `2`
  - ↳ note: TIMBRE B listens here. Both default to 1, so this must be changed or the two timbres double on one channel
  - ↳ hint: PROGRAMMER, MENU, MIDI
- **MULTI MODE** `ON`
  - ↳ note: Its printed default, and what makes the two timbres separately playable
  - ↳ hint: PROGRAMMER, MENU, MIDI
- **RECIEVE CC** `ON`
  - ↳ note: Defaults to OFF, so the box ignores CC until this is set. The manual's spelling
  - ↳ hint: PROGRAMMER, MENU, MIDI
- **TIMBRE A VOICE COUNT** `4` (0…8)
  - ↳ cite: range unverified — mood leaves this value alone
  - ↳ note: Four each. The counts always sum to eight, so setting this sets the other
  - ↳ hint: PROGRAMMER, VOICE CONTROL, MORE

#### Timbre 1 — `pad`: Both filters low and serial, sixteen-foot underneath, no top at all

Polyphony — 3 notes sounding at once on this one voice. It needs a genuinely polyphonic voice, not 3 separate ones.

*Ranges cite manual — Muse User's Manual v1.4.0 Appendix A (MIDI CC), p.121.*

- **VOICE CONTROL · UNISON** `OFF`
  - ↳ note: Stacks any currently unused voices onto the active ones — thickness varies with how many notes are held
- **VOICE CONTROL · MONO** `OFF`
- **VOICE CONTROL · DETUNE** `22` (0…127)
  - ↳ cite: range manual — Muse User's Manual v1.4.0 Appendix A (MIDI CC), p.122
  - ↳ note: Between voices when poly, between stacked voices under UNISON, between the two oscillators under MONO · Send MIDI CC 92 = 22. The knob carries no scale and no page maps its position to a CC value, so there is no printed setting for it by hand
- **OSC 1 · OCTAVE** `16'`
- **OSC 1 · FREQUENCY** `0` st (-7…7 st)
  - ↳ cite: range manual — Muse User's Manual v1.4.0, p.27
  - ↳ note: Bipolar, in tune at noon; a perfect fifth either way
- **OSC 1 · TRI/SAW** `30` (0…127)
  - ↳ note: Triangle fully counter-clockwise, sawtooth fully clockwise · Send MIDI CC 46 = 30. The knob carries no scale and no page maps its position to a CC value, so there is no printed setting for it by hand
- **OSC 1 · PULSE WIDTH** `58` (0…127)
  - ↳ note: A square wave sits at noon · Send MIDI CC 47 = 58. The knob carries no scale and no page maps its position to a CC value, so there is no printed setting for it by hand
- **OSC 1 · WAVE MIX** `42` (0…127)
  - ↳ note: The slider: triangle/sawtooth on the left against the pulse wave on the right · Send MIDI CC 48 = 42. The knob carries no scale and no page maps its position to a CC value, so there is no printed setting for it by hand
- **OSC 2 · OCTAVE** `8'`
- **OSC 2 · FREQUENCY** `-2` st (-7…7 st)
  - ↳ cite: range manual — Muse User's Manual v1.4.0, p.27
- **OSC 2 · TRI/SAW** `26` (0…127)
  - ↳ note: Send MIDI CC 51 = 26. The knob carries no scale and no page maps its position to a CC value, so there is no printed setting for it by hand
- **OSC 2 · PULSE WIDTH** `62` (0…127)
  - ↳ note: Send MIDI CC 52 = 62. The knob carries no scale and no page maps its position to a CC value, so there is no printed setting for it by hand
- **OSC 2 · WAVE MIX** `38` (0…127)
  - ↳ note: Send MIDI CC 53 = 38. The knob carries no scale and no page maps its position to a CC value, so there is no printed setting for it by hand
- **SYNC 2▸1** `OFF`
  - ↳ note: Locks oscillator 2 to the phase of oscillator 1
- **MOD OSC · AUDIO** `OFF`
  - ↳ note: Sub-audio: eight per-voice LFOs, one for each voice
- **MOD OSC · WAVEFORM** `SINE`
- **MOD OSC · FREQUENCY** `16` (0…127)
  - ↳ cite: range manual — Muse User's Manual v1.4.0 Appendix A (MIDI CC), p.120
  - ↳ note: The range of this knob differs with the AUDIO button above · Send MIDI CC 25 = 16. The knob carries no scale and no page maps its position to a CC value, so there is no printed setting for it by hand
- **MOD OSC · PITCH AMOUNT** `10` (0…127)
  - ↳ cite: range manual — Muse User's Manual v1.4.0 Appendix A (MIDI CC), p.120
  - ↳ note: Send MIDI CC 31 = 10. The knob carries no scale and no page maps its position to a CC value, so there is no printed setting for it by hand
- **MOD OSC · PITCH ▸ OSC 1** `ON`
- **MOD OSC · PITCH ▸ OSC 2** `OFF`
- **MOD OSC · FILTER AMOUNT** `12` (0…127)
  - ↳ note: Send MIDI CC 39 = 12. The knob carries no scale and no page maps its position to a CC value, so there is no printed setting for it by hand
- **MOD OSC · FILTER ▸ 1** `ON`
- **MOD OSC · FILTER ▸ 2** `OFF`
- **MIXER · OSC 1** `104` (0…127)
  - ↳ note: Send MIDI CC 58 = 104. The knob carries no scale and no page maps its position to a CC value, so there is no printed setting for it by hand
- **MIXER · RING MOD** `0` (0…127)
  - ↳ note: Sum and difference tones of the two oscillators — inharmonic as they detune · Send MIDI CC 60 = 0. The knob carries no scale and no page maps its position to a CC value, so there is no printed setting for it by hand
- **MIXER · OSC 2** `88` (0…127)
  - ↳ note: Send MIDI CC 59 = 88. The knob carries no scale and no page maps its position to a CC value, so there is no printed setting for it by hand
- **MIXER · MOD OSC** `0` (0…127)
  - ↳ note: Send MIDI CC 61 = 0. The knob carries no scale and no page maps its position to a CC value, so there is no printed setting for it by hand
- **MIXER · NOISE** `6` (0…127)
  - ↳ note: White noise · Send MIDI CC 62 = 6. The knob carries no scale and no page maps its position to a CC value, so there is no printed setting for it by hand
- **MIXER · OVERLOAD** `0` (0…127)
  - ↳ cite: range unverified — mood leaves this value alone
  - ↳ note: No page prints a scale for this fader and no CC row names it, so this number is relative within this guide rather than a position on the panel
- **OVERLOAD RANGE** `LOW`
  - ↳ note: LOW narrows the drive range for finer control
  - ↳ hint: Press MORE in that section
- **FILTER · ORDER** `SER`
  - ↳ note: SERIAL, STEREO or PARALLEL — with HIGH PASS this decides bandpass, stereo lowpass or notch
- **LINK FILTERS** `OFF`
  - ↳ note: Off, so FILTER 1 CUTOFF is an absolute cutoff rather than the spacing between the two
- **FILTER 1 · HIGH PASS** `OFF`
  - ↳ note: Lowpass
- **FILTER 1 · CUTOFF** `34` (0…127)
  - ↳ note: Send MIDI CC 67 = 34. The knob carries no scale and no page maps its position to a CC value, so there is no printed setting for it by hand
- **FILTER 1 · RESONANCE** `26` (0…127)
  - ↳ note: Self-oscillates into a sine fully clockwise · Send MIDI CC 68 = 26. The knob carries no scale and no page maps its position to a CC value, so there is no printed setting for it by hand
- **FILTER 1 · ENVELOPE AMOUNT** `30` (0…127)
  - ↳ note: Bipolar, no modulation at noon · Send MIDI CC 69 = 30. The knob carries no scale and no page maps its position to a CC value, so there is no printed setting for it by hand
- **FILTER 1 · KB TRACKING** `1:2`
- **FILTER 2 · CUTOFF** `30` (0…127)
  - ↳ note: Send MIDI CC 72 = 30. The knob carries no scale and no page maps its position to a CC value, so there is no printed setting for it by hand
- **FILTER 2 · RESONANCE** `20` (0…127)
  - ↳ note: Send MIDI CC 73 = 20. The knob carries no scale and no page maps its position to a CC value, so there is no printed setting for it by hand
- **FILTER 2 · ENVELOPE AMOUNT** `24` (0…127)
  - ↳ note: Bipolar, no modulation at noon · Send MIDI CC 75 = 24. The knob carries no scale and no page maps its position to a CC value, so there is no printed setting for it by hand
- **FILTER 2 · KB TRACKING** `1:2`
- **FILTER ENV · ATTACK** `90` (0…127)
  - ↳ cite: range manual — Muse User's Manual v1.4.0 Appendix A (MIDI CC), p.122
  - ↳ note: Send MIDI CC 79 = 90. The knob carries no scale and no page maps its position to a CC value, so there is no printed setting for it by hand
- **FILTER ENV · DECAY** `96` (0…127)
  - ↳ cite: range manual — Muse User's Manual v1.4.0 Appendix A (MIDI CC), p.122
  - ↳ note: Send MIDI CC 80 = 96. The knob carries no scale and no page maps its position to a CC value, so there is no printed setting for it by hand
- **FILTER ENV · SUSTAIN** `40` (0…127)
  - ↳ cite: range manual — Muse User's Manual v1.4.0 Appendix A (MIDI CC), p.122
  - ↳ note: Send MIDI CC 81 = 40. The knob carries no scale and no page maps its position to a CC value, so there is no printed setting for it by hand
- **FILTER ENV · RELEASE** `100` (0…127)
  - ↳ cite: range manual — Muse User's Manual v1.4.0 Appendix A (MIDI CC), p.122
  - ↳ note: Send MIDI CC 82 = 100. The knob carries no scale and no page maps its position to a CC value, so there is no printed setting for it by hand
- **FILTER ENV · LOOP** `OFF`
  - ↳ note: Looping, the envelope runs like an LFO
- **VCA ENV · ATTACK** `88` (0…127)
  - ↳ cite: range manual — Muse User's Manual v1.4.0 Appendix A (MIDI CC), p.122
  - ↳ note: Send MIDI CC 86 = 88. The knob carries no scale and no page maps its position to a CC value, so there is no printed setting for it by hand
- **VCA ENV · DECAY** `84` (0…127)
  - ↳ cite: range manual — Muse User's Manual v1.4.0 Appendix A (MIDI CC), p.122
  - ↳ note: Send MIDI CC 87 = 84. The knob carries no scale and no page maps its position to a CC value, so there is no printed setting for it by hand
- **VCA ENV · SUSTAIN** `104` (0…127)
  - ↳ cite: range manual — Muse User's Manual v1.4.0 Appendix A (MIDI CC), p.122
  - ↳ note: Send MIDI CC 88 = 104. The knob carries no scale and no page maps its position to a CC value, so there is no printed setting for it by hand
- **VCA ENV · RELEASE** `104` (0…127)
  - ↳ cite: range manual — Muse User's Manual v1.4.0 Appendix A (MIDI CC), p.122
  - ↳ note: Send MIDI CC 89 = 104. The knob carries no scale and no page maps its position to a CC value, so there is no printed setting for it by hand
- **VCA ENV · VELOCITY** `ON`
- **VCA · LEVEL** `92` (0…127)
  - ↳ cite: range manual — Muse User's Manual v1.4.0 Appendix A (MIDI CC), p.120
  - ↳ note: Send MIDI CC 7 = 92. The knob carries no scale and no page maps its position to a CC value, so there is no printed setting for it by hand
  - ↳ hint: Light TIMBRE A or B first
- **VCA · PAN** `60` (0…127)
  - ↳ cite: range manual — Muse User's Manual v1.4.0 Appendix A (MIDI CC), p.120
  - ↳ note: Bipolar, centred at noon · Send MIDI CC 10 = 60. The knob carries no scale and no page maps its position to a CC value, so there is no printed setting for it by hand
- **VCA · PAN SPREAD** `46` (0…127)
  - ↳ cite: range manual — Muse User's Manual v1.4.0 Appendix A (MIDI CC), p.120
  - ↳ note: All voices sit at the PAN position fully counter-clockwise · Send MIDI CC 9 = 46. The knob carries no scale and no page maps its position to a CC value, so there is no printed setting for it by hand
- **VCA · PAN SPRD MODE** `L/R`
  - ↳ hint: Press MORE in that section
- **DELAY · TIMBRE A / TIMBRE B** `ON`
  - ↳ note: Two separate buttons, one per timbre — engage the one for the timbre this part is on. Disengaged, this part bypasses the delay on a fully analog path
- **LFO 1 · WAVEFORM** `TRIANGLE`
- **LFO 1 · RATE** `0.14` Hz (0.01…40 Hz)
  - ↳ cite: range manual — Muse User's Manual v1.4.0, p.52
  - ↳ note: The default range; RATE MIN and RATE MAX in the MORE menu can widen it to 1 kHz
- **LFO 1 · AMPLITUDE** `22` (0…127)
  - ↳ cite: range manual — Muse User's Manual v1.4.0 Appendix A (MIDI CC), p.120
  - ↳ note: An attenuator ahead of every destination · Send MIDI CC 13 = 22. The knob carries no scale and no page maps its position to a CC value, so there is no printed setting for it by hand
- **LFO 1 · SYNC** `OFF`
  - ↳ note: Off, so RATE is the free-running Hz scale rather than tempo divisions
  - ↳ hint: Press MORE in that section
- **LFO 1 · LFO TYPE** `PER-VOICE`
  - ↳ note: PER-VOICE gives eight separate LFOs, one per voice
  - ↳ hint: Press MORE in that section

### Subharmonicon

*Values below cite Moog Subharmonicon Manual.*

#### Voice — `kick`: The ladder filter self-oscillating, opened by a sequencer clock

Routing — Clock it at IN · CLOCK, or over MIDI at IN · MIDI IN, which overrides both the internal clock and the analog one. Its own grid is four steps advanced by the RHYTHM dividers, so the pattern above is what to aim them at rather than something the box can play literally. This is the BATERIA patch sheet (p.47) read off its own drawing: every mixer level is fully down, RESONANCE is fully up, and what you hear is the filter's own oscillation gated by a clock. The sheet's NOTES are the tuning instruction — "Kick drum tuning is controlled via filter CUTOFF. Adjust VCF DECAY and EG AMT knobs for different kick drum flavors"

*Ranges cite manual — Moog Subharmonicon Manual, p.30.*

- **VCO 1 FREQ** `262` Hz (262…4186 Hz)
  - ↳ cite: range manual — Moog Subharmonicon Manual, p.18
  - ↳ hint: Tune to the key; QUANTIZE snaps it
- **VCO 1 WAVE** `UP`
  - ↳ hint: Square up, saw down, PWM centre
- **SUB 1 FREQ (VCO 1)** `1` (1…16)
  - ↳ cite: range manual — Moog Subharmonicon Manual, p.18
  - ↳ hint: Divides the VCO pitch by this integer
- **SUB 2 FREQ (VCO 1)** `1` (1…16)
  - ↳ cite: range manual — Moog Subharmonicon Manual, p.19
  - ↳ hint: Divides the VCO pitch by this integer
- **VCO 2 FREQ** `262` Hz (262…4186 Hz)
  - ↳ cite: range manual — Moog Subharmonicon Manual, p.19
  - ↳ hint: Tune to the key; QUANTIZE snaps it
- **VCO 2 WAVE** `UP`
  - ↳ hint: Square up, saw down, PWM centre
- **SUB 1 FREQ (VCO 2)** `1` (1…16)
  - ↳ cite: range manual — Moog Subharmonicon Manual, p.20
  - ↳ hint: Divides the VCO pitch by this integer
- **SUB 2 FREQ (VCO 2)** `1` (1…16)
  - ↳ cite: range manual — Moog Subharmonicon Manual, p.20
  - ↳ hint: Divides the VCO pitch by this integer
- **VCO 1 LEVEL** `0` % travel (0…100 % travel) · manual
  - ↳ cite: value manual — Moog Subharmonicon Manual, p.47
  - ↳ cite: range unverified — mood leaves this value alone
- **SUB 1 LEVEL (VCO 1)** `0` % travel (0…100 % travel) · manual
  - ↳ cite: value manual — Moog Subharmonicon Manual, p.47
  - ↳ cite: range unverified — mood leaves this value alone
- **SUB 2 LEVEL (VCO 1)** `0` % travel (0…100 % travel) · manual
  - ↳ cite: value manual — Moog Subharmonicon Manual, p.47
  - ↳ cite: range unverified — mood leaves this value alone
- **VCO 2 LEVEL** `0` % travel (0…100 % travel) · manual
  - ↳ cite: value manual — Moog Subharmonicon Manual, p.47
  - ↳ cite: range unverified — mood leaves this value alone
- **SUB 1 LEVEL (VCO 2)** `0` % travel (0…100 % travel) · manual
  - ↳ cite: value manual — Moog Subharmonicon Manual, p.47
  - ↳ cite: range unverified — mood leaves this value alone
- **SUB 2 LEVEL (VCO 2)** `0` % travel (0…100 % travel) · manual
  - ↳ cite: value manual — Moog Subharmonicon Manual, p.47
  - ↳ cite: range unverified — mood leaves this value alone
- **CUTOFF** `62` Hz (20…20000 Hz)
  - ↳ cite: range manual — Moog Subharmonicon Manual, p.23
- **RESONANCE** `100` % travel (0…100 % travel) · manual
  - ↳ cite: value manual — Moog Subharmonicon Manual, p.47
  - ↳ cite: range unverified — mood leaves this value alone
  - ↳ hint: Full RESONANCE and the ladder sings
- **VCF ATTACK** `1` ms (1…10000 ms)
  - ↳ cite: range manual — Moog Subharmonicon Manual, p.24
- **VCF DECAY** `95` ms (5…10000 ms)
  - ↳ cite: range manual — Moog Subharmonicon Manual, p.24
- **VCF EG AMT** `60` % travel from centre (-100…100 % travel from centre)
  - ↳ cite: range unverified — mood leaves this value alone
- **VCA ATTACK** `1` ms (1…10000 ms)
  - ↳ cite: range manual — Moog Subharmonicon Manual, p.24
- **VCA DECAY** `130` ms (5…10000 ms)
  - ↳ cite: range manual — Moog Subharmonicon Manual, p.25
  - ↳ hint: Nothing else sets how long it rings
- **VOLUME** `100` % travel (0…100 % travel) · manual
  - ↳ cite: value manual — Moog Subharmonicon Manual, p.47
  - ↳ cite: range unverified — mood leaves this value alone
- **QUANTIZE** `12-ET`
- **SEQ OCT** `±1`
- **SEQ 1 ASSIGN · OSC 1** `UNLIT`
- **SEQ 1 ASSIGN · SUB 1** `UNLIT`
- **SEQ 1 ASSIGN · SUB 2** `UNLIT`
- **SEQ 2 ASSIGN · OSC 2** `UNLIT`
- **SEQ 2 ASSIGN · SUB 1** `UNLIT`
- **SEQ 2 ASSIGN · SUB 2** `UNLIT`
- **RHYTHM 1** `8` (1…16)
  - ↳ hint: Divides the tempo; 1 is the tempo
- **RHYTHM 1 · SEQ 1** `LIT`
- **RHYTHM 1 · SEQ 2** `UNLIT`
- **RHYTHM 2** `4` (1…16)
- **RHYTHM 2 · SEQ 1** `UNLIT`
- **RHYTHM 2 · SEQ 2** `LIT`
- **RHYTHM 3** `1` (1…16)
- **RHYTHM 3 · SEQ 1** `UNLIT`
- **RHYTHM 3 · SEQ 2** `UNLIT`
- **RHYTHM 4** `16` (1…16)
- **RHYTHM 4 · SEQ 1** `LIT`
- **RHYTHM 4 · SEQ 2** `UNLIT`

**Patch**

- `OUT · SEQ 2 CLK` → `IN · VCA` · manual
  - ↳ cite: value manual — Moog Subharmonicon Manual, p.47
  - ↳ note: Sequencer 2’s own polyrhythm opens the amplifier — this is what makes the drum, since no oscillator reaches the mixer
- `OUT · SEQ 1 CLK` → `IN · CUTOFF` · manual
  - ↳ cite: value manual — Moog Subharmonicon Manual, p.47
  - ↳ note: Sequencer 1’s clock kicks the filter, so the drum is pitched by a pulse rather than by a note
- `OUT · SEQ 1` → `IN · RHYTHM 1` · manual
  - ↳ cite: value manual — Moog Subharmonicon Manual, p.47
  - ↳ note: The sequencer sets its own divider, so the pattern walks its rate instead of repeating
- `OUT · SEQ 2` → `IN · RHYTHM 2` · manual
  - ↳ cite: value manual — Moog Subharmonicon Manual, p.47
  - ↳ note: The same feedback on the second generator, which is what keeps the two sides from locking

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

## 7. Finishing

**Sidechain**

The MPC Live III, MPC One G2, MPC XL and Cascadia can duck to another box: patch the box you want each to follow into its audio in.

The MPC Live III, MPC One G2 and MPC XL can also duck from their own parts.

The TR-1000, TR-6S, TR-8S, Deluge, EP–133 K.O. II, EP–40 riddim and OP-XY duck from their own parts only.

**Master FX**

What processes audio in this rig:

- MPC Live III — carries effects, though no part in this guide reaches them
- MPC One G2 — carries effects, though no part in this guide reaches them
- MPC XL — carries effects, though no part in this guide reaches them
- ZOIA Euroburo — is an effects unit (stereo main out · audio in)
- Matriarch — carries effects, though no part in this guide reaches them
- Muse — carries DELAY · CHARACTER, DELAY · CLOCK SYNC, DELAY · FEEDBACK, DELAY · LINK DELAYS, DELAY · MIX, DELAY · SYNC TYPE, DELAY · TIMBRE A / TIMBRE B, DELAY · TIME - L and DELAY · TIME - R in its recipes
- Tracker Mini — carries effects, though no part in this guide reaches them
- MC-101 — carries MULTI FX, FX PRM and FX DEPTH on the panel, and REVERB SEND in its recipes
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
