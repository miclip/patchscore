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
- **`sub`** → TR-1000 · BD — *Kick tuned down into a sustained sub*
  - p1 · exact `dark` · every section
- **`bass-mid`** → Tracker Mini · Synth Track 1 — *Wide detuned reese, filter well down*
  - p2 · substituted — asked `dirty`, authored `dark` · every section
- **`clap`** → TR-1000 · HC — *Wide clap sitting on top of the snare*
  - p2 · exact `bright` · every section
- **`closed-hat`** → TR-1000 · CH — *Grainy CR-78 hat with a metallic edge*
  - p2 · exact `dirty` · every section
- **`open-hat`** → TR-1000 · OH — *Dull open hat, more air than sizzle*
  - p3 · exact `dark` · every section
- **`stab`** → Tracker Mini · Track 2 — *Rendered chord sample, struck short and filtered hard*
  - p3 · exact `hard` · 3 notes from one sampled chord · every section
- **`impact`** → TR-1000 · CC — *Crash marking the top of a section*
  - p4 · exact `hard` · Drop, Peak
- **`pad`** → Tracker Mini · Track 3 — *Rendered chord sample, filtered back and swelled*
  - p4 · substituted — asked `dark`, authored `soft` · 3 notes from one sampled chord · every section

### Gaps

These parts are not in the guide below.

- `metallic` `dark` (p3) — capable but unauthored — Tracker Mini (16 voices), TR-1000 RS/CC/RC could carry it, dial it by ear
- `riser` `bright` (p4) — capable but unauthored — Tracker Mini (16 voices) could carry it, dial it by ear
- `noise` `dirty` (p5) *(optional)* — capable but unauthored — Tracker Mini (16 voices), TR-1000 OH/CC could carry it, dial it by ear

## 3. Rig integration

**Clock source** — Tracker Mini over `midi-din`, carrying 4 parts. Sync everything else to it.

- On the Tracker Mini, set `Config > MIDI > Clock Out` to `MIDI Out jack` · manual
  - ↳ note: Off, USB, MIDI Out jack, USB + MIDI Out jack — clock leaves only by the routing set here
  - ↳ cite: value manual — Polyend Tracker Mini Manual 2.2.1b, p.54

- **Tracker Mini** — groovebox · 4 parts
  - clock: sends clock · midi-din/usb
  - MIDI Out, MIDI In: 3.5mm TRS — use the supplied Type B adapter for 5-pin MIDI (p.13, p.284) · manual
    - ↳ cite: value manual — Polyend Tracker Mini Manual 2.2.1b, p.13
  - audio: stereo main out · USB audio · audio in
  - mixer: 4 parts, no individual outs: one stereo channel for all
- **TR-1000** — drum-machine · 5 parts
  - clock: sends clock · midi-din/din-sync/usb/analog-clock/trigger
  - audio: stereo main out · 10 individual outs · USB audio · audio in
  - mixer: 5 parts, 10 individual outs: one channel each

## 4. Hook

Steps are sixteenths, counted from the start of the hook: 16 to a bar, so step 33 is bar 3.
Notes sharing a step are one chord and share a line.

Names are spelled for the key, so F minor gets `Eb`; a name in brackets is the same pitch as
a sharps-only box shows it, and appears only where it differs. Octaves put middle C at C4,
which not every maker agrees with — the MIDI number is the form nothing disagrees about.

Where a role has more than one hook authored, rerolling the seed picks a different one.

### `bass-mid` — Tracker Mini · Synth Track 1

**Wide detuned reese, filter well down** — settings in Sound design

2 bars in F minor.

- bar 1 · step 1 · len 3 · `F1` · root · MIDI 29
- bar 1 · step 7 · len 2 · `F1` · root · MIDI 29
- bar 1 · step 11 · len 3 · `Bb1` (`A#1`) · 4th · MIDI 34
- bar 1 · step 15 · len 2 · `F1` · root · MIDI 29
- bar 2 · step 17 · len 3 · `F1` · root · MIDI 29
- bar 2 · step 23 · len 2 · `Db2` (`C#2`) · 6th · MIDI 37
- bar 2 · step 27 · len 4 · `C2` · 5th · MIDI 36

### `pad` — Tracker Mini · Track 3

**Rendered chord sample, filtered back and swelled** — settings in Sound design

8 bars in F minor.

Sampled chord — you trigger a sample, you do not play these notes.

2 chord shapes, so 2 samples. A sample transposes as a block, keeping its shape, so one recording covers that shape at every root. A separate sample is needed only where the shape changes — a different quality, or a different inversion.

**Samples to obtain or render** — 2 chord shapes

- sample A · `F3` `Ab3` (`G#3`) `C4` · root 3rd 5th · MIDI 53 56 60 · shape 0-3-7
- sample B · `Db4` (`C#4`) `F4` `Ab4` (`G#4`) · 6th root 3rd · MIDI 61 65 68 · shape 0-4-7

**Trigger** — one step event per chord, and the sample sounds all of it

- bar 1 · step 1 · len 64 · sample A · as recorded · `F3` `Ab3` (`G#3`) `C4`
- bar 5 · step 65 · len 32 · sample B · as recorded · `Db4` (`C#4`) `F4` `Ab4` (`G#4`)
- bar 7 · step 97 · len 32 · sample B · +2 st · `Eb4` (`D#4`) `G4` `Bb4` (`A#4`)

### `stab` — Tracker Mini · Track 2

**Rendered chord sample, struck short and filtered hard** — settings in Sound design

4 bars in F minor.

Sampled chord — you trigger a sample, you do not play these notes.

One chord shape throughout, so one sample, transposed where the chord moves.

**Samples to obtain or render** — 1 chord shape

- sample A · `F3` `Ab3` (`G#3`) `C4` · root 3rd 5th · MIDI 53 56 60 · shape 0-3-7

**Trigger** — one step event per chord, and the sample sounds all of it

- bar 1 · step 1 · len 2 · sample A · as recorded · `F3` `Ab3` (`G#3`) `C4`
- bar 1 · step 11 · len 1 · sample A · as recorded · `F3` `Ab3` (`G#3`) `C4`
- bar 3 · step 33 · len 2 · sample A · as recorded · `F3` `Ab3` (`G#3`) `C4`
- bar 4 · step 49 · len 3 · sample A · +7 st · `C4` `Eb4` (`D#4`) `G4`

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

### `sub` — TR-1000 · BD

**Kick tuned down into a sustained sub** — settings in Sound design

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

### `bass-mid` — Tracker Mini · Synth Track 1

**Wide detuned reese, filter well down** — settings in Sound design

**The hook is the pattern** — see Hook above for its steps and note lengths. Nothing separate to program here.

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

### `stab` — Tracker Mini · Track 2

**Rendered chord sample, struck short and filtered hard** — settings in Sound design

**The hook is the pattern** — see Hook above for its steps and note lengths. Nothing separate to program here.

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

### `pad` — Tracker Mini · Track 3

**Rendered chord sample, filtered back and swelled** — settings in Sound design

**The hook is the pattern** — see Hook above for its steps and note lengths. Nothing separate to program here.

## 6. Sound design

### Tracker Mini

*Values below cite Polyend Tracker Mini Manual 2.2.1b.*

**Pattern-wide**

One setting for the whole pattern — set it once, not once per part below.

- **SWING** `50` % (25…75 %)
  - ↳ cite: range manual — Polyend Tracker Mini Manual 2.2.1b, p.185
  - ↳ note: 50% is no swing; set once, it applies across the whole pattern
  - ↳ hint: Hold [FX1], press (Up)/(Down)

#### Track 1 — `kick`: Tight one-shot kick, tuned down, no tail

Source — A dry kick one-shot under 400 ms, attack intact and no room printed on it

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

#### Synth Track 1 — `bass-mid`: Wide detuned reese, filter well down

Routing — Synth Track n is panel track n+8 — costs one of the three project synth slots

*Ranges cite manual — Polyend Tracker Mini Manual 2.2.1b, p.156.*

- **MODEL** `FAT`
- **FILTER TYPE** `Low Pass OB 24dB`
- **FATNESS** `78` (0…100)
  - ↳ hint: Press [Edit Patch] screen button
- **BRIGHTNESS** `22` (0…100)
- **TIMBRE** `40` (0…100)
- **FILTER CUTOFF** `620` Hz (20…20000 Hz)
- **FILTER RESONANCE** `18` % (0…100 %)
- **AMP ENV RELEASE** `0.35` Sec (0…10 Sec)

#### Track 2 — `stab`: Rendered chord sample, struck short and filtered hard

Polyphony — 3 notes, already inside the sample. Load the chord sample(s) onto this one voice rather than spreading the notes across 3. One sample covers its chord shape at any root; a different shape needs its own — see Hook.

Source — Chord sample(s) — yours, or rendered to audio here; one per chord shape the hook plays

- Manual p.104, Rendering Tracks To Audio Chords: place the notes of one chord on separate tracks, Shift + D-Pad to select that range, [More] -> [Render Selection], name it, then [Render & Load]. Replace the instrument on one track with the rendered chord and free the others. One sample covers every chord of the same shape: p.128, the step note sets the playback pitch, so placing a higher note transposes the whole chord. Transposition keeps the recorded voicing — it cannot invert or re-voice the chord, so a changed shape is a second sample. The Hook phase lists which samples this part needs and the semitone offset to place on each trigger. · manual
  - ↳ cite: value manual — Polyend Tracker Mini Manual 2.2.1b, p.104

Routing — Tracks 1-8 — costs no synth slot: the chord is in the sample, not in an engine

*Ranges cite manual — Polyend Tracker Mini Manual 2.2.1b, p.126.*

- **PLAY MODE** `1-Shot`
- **FILTER TYPE** `Low-pass`
- **CUTOFF** `68` % (0…100 %)
  - ↳ cite: range manual — Polyend Tracker Mini Manual 2.2.1b, p.117
- **RESONANCE** `34` % (0…100 %)
  - ↳ cite: range manual — Polyend Tracker Mini Manual 2.2.1b, p.117
- **TUNE** `0` St (-24…24 St)
  - ↳ cite: range manual — Polyend Tracker Mini Manual 2.2.1b, p.116
- **ENV ATTACK** `0` Sec (0…10 Sec)
- **ENV DECAY** `0.32` Sec (0…10 Sec)
- **ENV SUSTAIN** `0` % (0…100 %)
- **ENV RELEASE** `0.24` Sec (0…10 Sec)
- **OVERDRIVE** `18` % (0…100 %)
  - ↳ cite: range manual — Polyend Tracker Mini Manual 2.2.1b, p.120

#### Track 3 — `pad`: Rendered chord sample, filtered back and swelled

Polyphony — 3 notes, already inside the sample. Load the chord sample(s) onto this one voice rather than spreading the notes across 3. One sample covers its chord shape at any root; a different shape needs its own — see Hook.

Source — Chord sample(s) — yours, or rendered to audio here; one per chord shape the hook plays

- Manual p.104, Rendering Tracks To Audio Chords: place the notes of one chord on separate tracks, Shift + D-Pad to select that range, [More] -> [Render Selection], name it, then [Render & Load]. Replace the instrument on one track with the rendered chord and free the others. One sample covers every chord of the same shape: p.128, the step note sets the playback pitch, so placing a higher note transposes the whole chord. Repeat only where the shape changes — the Hook phase lists which samples this part needs and what to transpose each trigger by. · manual
  - ↳ cite: value manual — Polyend Tracker Mini Manual 2.2.1b, p.104

Routing — Tracks 1-8 — costs no synth slot: the chord is in the sample, not in an engine

*Ranges cite manual — Polyend Tracker Mini Manual 2.2.1b, p.126.*

- **PLAY MODE** `Forward loop`
- **FILTER TYPE** `Low-pass`
- **CUTOFF** `44` % (0…100 %)
  - ↳ cite: range manual — Polyend Tracker Mini Manual 2.2.1b, p.117
- **TUNE** `-2` St (-24…24 St)
  - ↳ cite: range manual — Polyend Tracker Mini Manual 2.2.1b, p.116
- **ENV ATTACK** `1.4` Sec (0…10 Sec)
- **ENV RELEASE** `2.2` Sec (0…10 Sec)
- **ENV SUSTAIN** `84` % (0…100 %)
- **REVERB SEND** `30` % (0…100 %)
  - ↳ cite: range manual — Polyend Tracker Mini Manual 2.2.1b, p.120

### TR-1000

*Values below cite TR-1000 Reference Manual (eng02) v1.13+.*

**Pattern-wide**

One setting for the whole pattern — set it once, not once per part below.

- **SHUFFLE** `0` (-100…100)
  - ↳ cite: range manual — TR-1000 Reference Manual (eng02) v1.13+, p.26
  - ↳ note: Pattern-wide: one setting for every track, saved with the pattern
  - ↳ hint: Hold [SHIFT], press [PTN SELECT]

#### BD — `sub`: Kick tuned down into a sustained sub

Routing — INDIVIDUAL OUT BD so the sub stays out of the bus effects

*Ranges cite manual — TR-1000 Reference Manual (eng02) v1.13+, p.61.*

- **GEN** `9X Bass Drum`
  - ↳ hint: Hold [SHIFT]+[GEN], select with [C6]
- **COARSE** `-12` St (-12…12 St)
  - ↳ hint: An octave down, in semitones
- **TUNE** `-70` % (-100…100 %)
- **DECAY** `92` % (0…100 %)
- **P. AMOUNT** `12` % (0…100 %)
  - ↳ hint: Near-flat pitch envelope
- **DRIVE** `18` % (0…100 %)
- **RVB SEND** `0` % (0…100 %)
  - ↳ cite: range manual — TR-1000 Reference Manual (eng02) v1.13+, p.71
  - ↳ hint: Hold [BD]-[RC], turn REVERB [LEVEL]
- **DLY SEND** `0` % (0…100 %)
  - ↳ cite: range manual — TR-1000 Reference Manual (eng02) v1.13+, p.71
  - ↳ hint: Hold [BD]-[RC], turn DELAY [LEVEL]

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

#### CH — `closed-hat`: Grainy CR-78 hat with a metallic edge

*Ranges cite manual — TR-1000 Reference Manual (eng02) v1.13+, p.62.*

- **GEN** `CR78 HiHat`
  - ↳ hint: Hold [SHIFT]+[GEN], select with [C6]
- **TUNE** `-5` % (-100…100 %)
- **DECAY** `20` % (0…100 %)
- **METALLIC** `72` % (0…100 %)
  - ↳ hint: Metal-like overtone level
- **RVB SEND** `10` % (0…100 %)
  - ↳ cite: range manual — TR-1000 Reference Manual (eng02) v1.13+, p.71
  - ↳ hint: Hold [BD]-[RC], turn REVERB [LEVEL]
- **DLY SEND** `8` % (0…100 %)
  - ↳ cite: range manual — TR-1000 Reference Manual (eng02) v1.13+, p.71
  - ↳ hint: Hold [BD]-[RC], turn DELAY [LEVEL]

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

## 7. Finishing

**Sidechain**

- TR-1000 — internal, from external audio

**Master FX**

What processes audio in this rig:

- Tracker Mini — carries REVERB SEND in its recipes
- TR-1000 — carries REVERB, DELAY, MASTER FX and ANALOG FX on the panel, and DLY SEND and RVB SEND in its recipes

**Arrangement variations**

Sections that program identically, part for part — build one and copy it:

- **band 0** — Intro, Outro
- **band 1** — Build, Breakdown
- **band 3** — Drop, Peak

`pad` has no pattern authored at any band, so nothing here varies for them.
