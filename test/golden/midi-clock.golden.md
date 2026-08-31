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

```
            Intro  Build  Drop           Breakdown Peak           Outro
            16b    16b    32b            16b       32b            16b
energy      0.15   0.45   0.9            0.3       1              0.2

kick        ██████ ██████ ██████████████ █████████ ██████████████ ██████
sub         ██████ ██████ ██████████████ █████████ ██████████████ ██████
bass-mid    ██████ ██████ ██████████████ █████████ ██████████████ ██████
clap        ██████ ██████ ██████████████ █████████ ██████████████ ██████
closed-hat  ██████ ██████ ██████████████ █████████ ██████████████ ██████
open-hat    ██████ ██████ ██████████████ █████████ ██████████████ ██████
stab        ██████ ██████ ██████████████ █████████ ██████████████ ██████
impact      ······ ······ ██████████████ ········· ██████████████ ······
pad         ██████ ██████ ██████████████ █████████ ██████████████ ██████
```

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
- **`stab`** → Tracker Mini · Track 2, Track 3 and Track 4 — *Single-note sample struck short, one note per track*
  - p3 · exact `hard` · 3 notes stacked one per voice · every section
- **`impact`** → TR-1000 · CC — *Crash marking the top of a section*
  - p4 · exact `hard` · Drop, Peak
- **`pad`** → Tracker Mini · Track 5, Track 6 and Track 7 — *Slow detuned pad, long swell*
  - p4 · substituted — asked `dark`, authored `soft` · 3 notes stacked one per voice · every section

### Gaps

None.

### Waiting on us

Your rig can make these. Nobody has written the recipe yet, so they are not in the guide below — that is our backlog, not a limit of your boxes.

- `metallic` `dark` (p3) — Tracker Mini (16 voices), TR-1000 RS/CC/RC could carry it, dial it by ear

### Not needed for this direction

Industrial Techno is finished without these.

- `riser` `bright` (p4) — a part already playing can lift the eight bars into a drop
- `noise` `dirty` (p5) — grit is a bonus, and the drums already bring some

## 3. Rig integration

**Clock source** — Tracker Mini over `midi-din`, carrying 8 parts. Sync everything else to it.

- Why this box — its manual says leading a rig is its job · manual
  - ↳ cite: claim manual — Polyend Tracker Mini Manual 2.2.1b, p.283

- On the Tracker Mini, set `Config > MIDI > Clock Out` to `MIDI Out jack` · manual
  - ↳ note: Off, USB, MIDI Out jack, USB + MIDI Out jack — clock leaves only by the routing set here
  - ↳ cite: value manual — Polyend Tracker Mini Manual 2.2.1b, p.54

- **Tracker Mini** — groovebox · 8 parts
  - clock: sends clock · midi-din/usb
  - MIDI Out, MIDI In: 3.5mm TRS — use the supplied Type B adapter for 5-pin MIDI (p.13, p.284) · manual
    - ↳ cite: value manual — Polyend Tracker Mini Manual 2.2.1b, p.13
  - audio: stereo main out · USB audio · audio in
  - mixer: 8 parts, no individual outs: one stereo channel for all
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

No note-length field on this box — a note runs until the next note on the same voice, and `OFF` is how you stop one sooner. The rows below are what you enter, in the order you enter them. · manual
- ↳ cite: claim manual — Polyend Tracker Mini Manual 2.2.1b, p.105

- bar 1 · step 1 · `F1` · root · MIDI 29
- bar 1 · step 4 · `OFF`
- bar 1 · step 7 · `F1` · root · MIDI 29
- bar 1 · step 9 · `OFF`
- bar 1 · step 11 · `Bb1` (`A#1`) · 4th · MIDI 34
- bar 1 · step 14 · `OFF`
- bar 1 · step 15 · `F1` · root · MIDI 29
- bar 2 · step 17 · `F1` · root · MIDI 29
- bar 2 · step 20 · `OFF`
- bar 2 · step 23 · `Db2` (`C#2`) · 6th · MIDI 37
- bar 2 · step 25 · `OFF`
- bar 2 · step 27 · `C2` · 5th · MIDI 36
- bar 2 · step 31 · `OFF`

### `pad` — Tracker Mini · Track 5, Track 6 and Track 7

**Slow detuned pad, long swell** — settings in Sound design

8 bars in F minor.

No note-length field on this box — a note runs until the next note on the same voice, and `OFF` is how you stop one sooner. The rows below are what you enter, in the order you enter them. · manual
- ↳ cite: claim manual — Polyend Tracker Mini Manual 2.2.1b, p.105

Stacked chord — 3 voices, one note each. There is no chord to play on any one of them.

Lowest note to the lowest voice: **Track 5** takes the bottom of every chord and **Track 7** the top. Hold that order and the voicing keeps its shape as the progression moves; cross the voices over and the chord changes character between bars with nothing here saying so.

**Track 5** — lowest note

- bar 1 · step 1 · `F3` · root · MIDI 53
- bar 5 · step 65 · `Db4` (`C#4`) · 6th · MIDI 61
- bar 7 · step 97 · `Eb4` (`D#4`) · 7th · MIDI 63

**Track 6** — note 2 from the bottom

- bar 1 · step 1 · `Ab3` (`G#3`) · 3rd · MIDI 56
- bar 5 · step 65 · `F4` · root · MIDI 65
- bar 7 · step 97 · `G4` · 2nd · MIDI 67

**Track 7** — highest note

- bar 1 · step 1 · `C4` · 5th · MIDI 60
- bar 5 · step 65 · `Ab4` (`G#4`) · 3rd · MIDI 68
- bar 7 · step 97 · `Bb4` (`A#4`) · 4th · MIDI 70

### `stab` — Tracker Mini · Track 2, Track 3 and Track 4

**Single-note sample struck short, one note per track** — settings in Sound design

4 bars in F minor.

No note-length field on this box — a note runs until the next note on the same voice, and `OFF` is how you stop one sooner. The rows below are what you enter, in the order you enter them. · manual
- ↳ cite: claim manual — Polyend Tracker Mini Manual 2.2.1b, p.105

Stacked chord — 3 voices, one note each. There is no chord to play on any one of them.

Lowest note to the lowest voice: **Track 2** takes the bottom of every chord and **Track 4** the top. Hold that order and the voicing keeps its shape as the progression moves; cross the voices over and the chord changes character between bars with nothing here saying so.

**Track 2** — lowest note

- bar 1 · step 1 · `F3` · root · MIDI 53
- bar 1 · step 3 · `OFF`
- bar 1 · step 11 · `F3` · root · MIDI 53
- bar 1 · step 12 · `OFF`
- bar 3 · step 33 · `F3` · root · MIDI 53
- bar 3 · step 35 · `OFF`
- bar 4 · step 49 · `C4` · 5th · MIDI 60
- bar 4 · step 52 · `OFF`

**Track 3** — note 2 from the bottom

- bar 1 · step 1 · `Ab3` (`G#3`) · 3rd · MIDI 56
- bar 1 · step 3 · `OFF`
- bar 1 · step 11 · `Ab3` (`G#3`) · 3rd · MIDI 56
- bar 1 · step 12 · `OFF`
- bar 3 · step 33 · `Ab3` (`G#3`) · 3rd · MIDI 56
- bar 3 · step 35 · `OFF`
- bar 4 · step 49 · `Eb4` (`D#4`) · 7th · MIDI 63
- bar 4 · step 52 · `OFF`

**Track 4** — highest note

- bar 1 · step 1 · `C4` · 5th · MIDI 60
- bar 1 · step 3 · `OFF`
- bar 1 · step 11 · `C4` · 5th · MIDI 60
- bar 1 · step 12 · `OFF`
- bar 3 · step 33 · `C4` · 5th · MIDI 60
- bar 3 · step 35 · `OFF`
- bar 4 · step 49 · `G4` · 2nd · MIDI 67
- bar 4 · step 52 · `OFF`

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

**The hook is the pattern** — see Hook above for its steps and what each one carries. Nothing separate to program here.

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

### `stab` — Tracker Mini · Track 2, Track 3 and Track 4

**Single-note sample struck short, one note per track** — settings in Sound design

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

### `pad` — Tracker Mini · Track 5, Track 6 and Track 7

**Slow detuned pad, long swell** — settings in Sound design

**The hook is the pattern** — see Hook above for its steps and what each one carries. Nothing separate to program here.

## 6. Sound design

### Tracker Mini

*Values below cite Polyend Tracker Mini Manual 2.2.1b.*

**Content**

- Ships 50 factory genre-based sample packs — look in /Samples/FactoryPacks on the microSD card. p.34 names the folder and the count, and no page lists what is in a pack, so the Source line below says what the part needs rather than naming a file. · manual
  - ↳ cite: claim manual — Polyend Tracker Mini Manual 2.2.1b, p.34

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
- **TUNE** `-3` st (-24…24 st)
  - ↳ cite: range manual — Polyend Tracker Mini Manual 2.2.1b, p.116
- **CUTOFF** `74` % (0…100 %)
  - ↳ cite: range manual — Polyend Tracker Mini Manual 2.2.1b, p.117
- **OVERDRIVE** `18` % (0…100 %)
  - ↳ cite: range manual — Polyend Tracker Mini Manual 2.2.1b, p.120
- **ENVELOPE · DECAY** `0.28` Sec (0…10 Sec)
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

#### Track 2, Track 3 and Track 4 — `stab`: Single-note sample struck short, one note per track

Polyphony — 3 notes, one on each of 3 voices. **Every voice takes these same settings**: it is one sound played 3 times over, not 3 sounds, and a difference between them is a difference you will hear inside the chord. Which voice takes which note is in Hook.

Source — A single-note tonal sample — one pitch, with a front edge. Yours, or one note rendered here; it does not need to be a chord and should not be one

- One sample covers the whole chord: manual p.128, the step note sets the playback pitch, so the same instrument placed on three tracks at three notes sounds three notes. Load it on each track of the stack and put the notes the Hook phase lists against each one. Nothing has to be re-recorded when the chord changes quality, which is the difference between this and a rendered chord. · manual
  - ↳ cite: value manual — Polyend Tracker Mini Manual 2.2.1b, p.128

Routing — Tracks 1-8 — costs no synth slot, and one loaded sample serves every track of the stack

*Ranges cite manual — Polyend Tracker Mini Manual 2.2.1b, p.126.*

- **PLAY MODE** `1-Shot`
- **FILTER TYPE** `Low-pass`
- **CUTOFF** `66` % (0…100 %)
  - ↳ cite: range manual — Polyend Tracker Mini Manual 2.2.1b, p.117
- **RESONANCE** `30` % (0…100 %)
  - ↳ cite: range manual — Polyend Tracker Mini Manual 2.2.1b, p.117
- **TUNE** `0` st (-24…24 st)
  - ↳ cite: range manual — Polyend Tracker Mini Manual 2.2.1b, p.116
- **ENVELOPE · ATTACK** `0` Sec (0…10 Sec)
- **ENVELOPE · DECAY** `0.3` Sec (0…10 Sec)
- **ENVELOPE · SUSTAIN** `0` % (0…100 %)
- **ENVELOPE · RELEASE** `0.2` Sec (0…10 Sec)
- **OVERDRIVE** `16` % (0…100 %)
  - ↳ cite: range manual — Polyend Tracker Mini Manual 2.2.1b, p.120

#### Track 5, Track 6 and Track 7 — `pad`: Slow detuned pad, long swell

Polyphony — 3 notes, one on each of 3 voices. **Every voice takes these same settings**: it is one sound played 3 times over, not 3 sounds, and a difference between them is a difference you will hear inside the chord. Which voice takes which note is in Hook.

Routing — Tracks 1-8 — costs one of the three project synth slots

*Ranges cite manual — Polyend Tracker Mini Manual 2.2.1b, p.158.*

- **MODEL** `VAP`
- **FILTER TYPE** `Low Pass SVF 12dB`
- **OSC MIX** `0` % (-100…100 %)
- **SHAPE 1** `28` (0…100)
- **SHAPE 2** `34` (0…100)
- **DETUNE** `14` c (0…100 c)
- **FILTER CUTOFF** `2400` Hz (20…20000 Hz)
- **AMP ENV ATTACK** `1.2` Sec (0…10 Sec)
  - ↳ cite: range manual — Polyend Tracker Mini Manual 2.2.1b, p.159
- **AMP ENV RELEASE** `2.4` Sec (0…10 Sec)
  - ↳ cite: range manual — Polyend Tracker Mini Manual 2.2.1b, p.159
- **VOICE VOLUME** `86` % (0…200 %)
  - ↳ cite: range manual — Polyend Tracker Mini Manual 2.2.1b, p.161

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

The TR-1000 ducks from its own parts.

Nothing here ducks to another box, so a rig-wide pump is built box by box.

**Master FX**

What processes audio in this rig:

- Tracker Mini — carries effects, though no part in this guide reaches them
- TR-1000 — carries REVERB, DELAY, MASTER FX and ANALOG FX on the panel, and DLY SEND and RVB SEND in its recipes

**Arrangement variations**

Sections that program identically, part for part — build one and copy it:

- **band 0** — Intro, Outro · 7 parts, 12 strikes
- **band 1** — Build, Breakdown · 7 parts, 23 strikes
- **band 3** — Drop, Peak · 8 parts, 60 strikes

`pad` is held rather than struck, so there is no grid here to vary.
