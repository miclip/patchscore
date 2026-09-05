# Industrial Techno

Values are starting points — dial them to taste. Where a mood knob moved one you see the move
(`52 → 45`). Every value carries its range — `38 (0…100)` — so you can tell at a glance whether
the screen in front of you is the one the line is about.

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
metallic    ██████ ██████ ██████████████ █████████ ██████████████ ██████
open-hat    ██████ ██████ ██████████████ █████████ ██████████████ ██████
stab        ██████ ██████ ██████████████ █████████ ██████████████ ██████
impact      ······ ······ ██████████████ ········· ██████████████ ······
pad         ██████ ██████ ██████████████ █████████ ██████████████ ██████
riser       ······ ██████ ·············· █████████ ·············· ······
noise       ██████ ██████ ██████████████ █████████ ██████████████ ██████
```

## 2. Voice assignment

- **`kick`** → Tracker Mini · Track 1 — *Tight one-shot kick, tuned down, no tail*
  - p1 · exact `hard` · every section
- **`sub`** → TR-1000 · BD — *Kick tuned down into a sustained sub*
  - p1 · exact `dark` · every section
- **`bass-mid`** → TR-1000 · LT — *FM bass with the modulator up*
  - p2 · exact `dirty` · every section
- **`clap`** → TR-1000 · HC — *Wide clap sitting on top of the snare*
  - p2 · exact `bright` · every section
- **`closed-hat`** → TR-1000 · CH — *Grainy CR-78 hat with a metallic edge*
  - p2 · exact `dirty` · every section
- **`metallic`** → TR-1000 · RC — *CR-78 metal ringing across the bar line*
  - p3 · substituted — asked `dark`, authored `dirty` · every section
- **`open-hat`** → Tracker Mini · Track 2 — *Half-open hat, gated short*
  - p3 · exact `dark` · every section
- **`stab`** → Tracker Mini · Track 3, Track 4 and Track 5 — *Single-note sample struck short, one note per track*
  - p3 · exact `hard` · 3 notes stacked one per voice · every section
- **`impact`** → TR-1000 · CC — *Crash marking the top of a section*
  - p4 · exact `hard` · Drop, Peak
- **`pad`** → Tracker Mini · Synth Track 1, Synth Track 2 and Synth Track 3 — *Slow detuned pad, long swell*
  - p4 · substituted — asked `dark`, authored `soft` · 3 notes stacked one per voice · every section
- **`riser`** → Tracker Mini · Track 6 — *Sample played backwards, the envelope swelling it into the change*
  - p4 · exact `bright` · Build, Breakdown
- **`noise`** → TR-1000 · OH — *White noise burst on the open-hat track, up where the hats sit*
  - p5, optional · exact `dirty` · every section

### Gaps

None.

## 3. Rig integration

**Clock source** — Tracker Mini over `midi-din`, carrying 9 parts. Sync everything else to it.

- Why this box — its manual says leading a rig is its job

- On the Tracker Mini, set `Config > MIDI > Clock Out` to `MIDI Out jack`
  - ↳ note: Off, USB, MIDI Out jack, USB + MIDI Out jack — clock leaves only by the routing set here

- **Tracker Mini** — groovebox · 9 parts
  - clock: sends clock · midi-din/usb
  - MIDI Out, MIDI In: 3.5mm TRS — use the supplied Type B adapter for 5-pin MIDI (p.13, p.284)
  - audio: stereo main out · USB audio · audio in
  - mixer: 9 parts, no individual outs: one stereo channel for all
- **TR-1000** — drum-machine · 7 parts
  - clock: sends clock · midi-din/din-sync/usb/analog-clock/trigger
  - audio: stereo main out · 10 individual outs · USB audio · audio in
  - mixer: 7 parts, 10 individual outs: one channel each

## 4. Hook

Steps are sixteenths, counted from the start of the hook: 16 to a bar, so step 33 is bar 3.
Notes sharing a step are one chord and share a line.

Names are spelled for the key, so F minor gets `Eb`; a name in brackets is the same pitch as
a sharps-only box shows it, and appears only where it differs. Octaves put middle C at C4,
which not every maker agrees with — the MIDI number is the form nothing disagrees about.

Where a role has more than one hook authored, rerolling the seed picks a different one.

### `bass-mid` — TR-1000 · LT

**FM bass with the modulator up** — settings in Sound design

2 bars in F minor.

A step is a trigger, not a note with a length: the instrument's own envelope ends it, and `DECAY` is what sets that.

- bar 1 · step 1 · `F2` · root · MIDI 41
- bar 1 · step 7 · `F2` · root · MIDI 41
- bar 1 · step 11 · `Bb2` (`A#2`) · 4th · MIDI 46
- bar 1 · step 15 · `F2` · root · MIDI 41
- bar 2 · step 17 · `F2` · root · MIDI 41
- bar 2 · step 23 · `Db3` (`C#3`) · 6th · MIDI 49
- bar 2 · step 27 · `C3` · 5th · MIDI 48

### `pad` — Tracker Mini · Synth Track 1, Synth Track 2 and Synth Track 3

**Slow detuned pad, long swell** — settings in Sound design

8 bars in F minor.

No note-length field on this box — a note runs until the next note on the same voice, and `OFF` is how you stop one sooner. The rows below are what you enter, in the order you enter them.

Stacked chord — 3 voices, one note each. There is no chord to play on any one of them.

Lowest note to the lowest voice: **Synth Track 1** takes the bottom of every chord and **Synth Track 3** the top. Hold that order and the voicing keeps its shape as the progression moves; cross the voices over and the chord changes character between bars with nothing here saying so.

**Synth Track 1** — lowest note

- bar 1 · step 1 · `F3` · root · MIDI 53
- bar 5 · step 65 · `Db4` (`C#4`) · 6th · MIDI 61
- bar 7 · step 97 · `Eb4` (`D#4`) · 7th · MIDI 63

**Synth Track 2** — note 2 from the bottom

- bar 1 · step 1 · `Ab3` (`G#3`) · 3rd · MIDI 56
- bar 5 · step 65 · `F4` · root · MIDI 65
- bar 7 · step 97 · `G4` · 2nd · MIDI 67

**Synth Track 3** — highest note

- bar 1 · step 1 · `C4` · 5th · MIDI 60
- bar 5 · step 65 · `Ab4` (`G#4`) · 3rd · MIDI 68
- bar 7 · step 97 · `Bb4` (`A#4`) · 4th · MIDI 70

### `stab` — Tracker Mini · Track 3, Track 4 and Track 5

**Single-note sample struck short, one note per track** — settings in Sound design

4 bars in F minor.

No note-length field on this box — a note runs until the next note on the same voice, and `OFF` is how you stop one sooner. The rows below are what you enter, in the order you enter them.

Stacked chord — 3 voices, one note each. There is no chord to play on any one of them.

Lowest note to the lowest voice: **Track 3** takes the bottom of every chord and **Track 5** the top. Hold that order and the voicing keeps its shape as the progression moves; cross the voices over and the chord changes character between bars with nothing here saying so.

**Track 3** — lowest note

- bar 1 · step 1 · `F3` · root · MIDI 53
- bar 1 · step 3 · `OFF`
- bar 1 · step 11 · `F3` · root · MIDI 53
- bar 1 · step 12 · `OFF`
- bar 3 · step 33 · `F3` · root · MIDI 53
- bar 3 · step 35 · `OFF`
- bar 4 · step 49 · `C4` · 5th · MIDI 60
- bar 4 · step 52 · `OFF`

**Track 4** — note 2 from the bottom

- bar 1 · step 1 · `Ab3` (`G#3`) · 3rd · MIDI 56
- bar 1 · step 3 · `OFF`
- bar 1 · step 11 · `Ab3` (`G#3`) · 3rd · MIDI 56
- bar 1 · step 12 · `OFF`
- bar 3 · step 33 · `Ab3` (`G#3`) · 3rd · MIDI 56
- bar 3 · step 35 · `OFF`
- bar 4 · step 49 · `Eb4` (`D#4`) · 7th · MIDI 63
- bar 4 · step 52 · `OFF`

**Track 5** — highest note

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

**Trigger note** — `C5` · MIDI 60

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

**Note** — `F1` · MIDI 29

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

### `bass-mid` — TR-1000 · LT


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

### `metallic` — TR-1000 · RC

**CR-78 metal ringing across the bar line** — settings in Sound design

**Intro, Outro** — 32 steps, band 0

```
 1 ···· ···· ···· ····
17 x··· ···· ···· ····
```
- `downbeat` — 17

**On this box** — TR-1000

- `downbeat` → `accent` true on step 17
  - ↳ hint: ACCENT [STEP], then step keys

**Build, Breakdown** — 32 steps, band 1

```
 1 x··· ···· ···· ····
17 x··· ···· ···· ····
```
- `downbeat` — 1, 17

**On this box** — TR-1000

- `downbeat` → `accent` true on steps 1, 17
  - ↳ hint: ACCENT [STEP], then step keys

**Drop, Peak** — 32 steps, band 3

```
 1 x··· ··x· ··x· ····
17 x··· ··x· ··x· ···x
```
- `accent` — 1 (vel 110)
- `offbeat` — 7, 11, 23, 27
- `downbeat` — 17
- `last-hit` — 32

**On this box** — TR-1000

- `downbeat` → `accent` true on step 17
  - ↳ hint: ACCENT [STEP], then step keys
- `offbeat` → `weak` true on steps 7, 11, 23, 27
  - ↳ hint: Hold [SHIFT], press step keys

### `open-hat` — Tracker Mini · Track 2

**Half-open hat, gated short** — settings in Sound design

**Trigger note** — `C5` · MIDI 60

**Intro, Outro** — 16 steps, band 0

```
 1 ···· ··x· ···· ····
```
- `offbeat` — 7

**On this box** — Tracker Mini

- `offbeat` → `gate-length` 45 on step 7

**Build, Breakdown** — 16 steps, band 1

```
 1 ··x· ···· ··x· ····
```
- `offbeat` — 3, 11

**On this box** — Tracker Mini

- `offbeat` → `gate-length` 45 on steps 3, 11

**Drop, Peak** — 16 steps, band 3

```
 1 ··x· ··x· ··x· x·x·
```
- `offbeat` — 3, 7, 11
- `downbeat` — 13
- `accent` — 15 (vel 106)

**On this box** — Tracker Mini

- `offbeat` → `gate-length` 45 on steps 3, 7, 11

### `stab` — Tracker Mini · Track 3, Track 4 and Track 5


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

### `pad` — Tracker Mini · Synth Track 1, Synth Track 2 and Synth Track 3


**The hook is the pattern** — see Hook above for its steps and what each one carries. Nothing separate to program here.

### `riser` — Tracker Mini · Track 6

**Sample played backwards, the envelope swelling it into the change** — settings in Sound design

**Trigger note** — `C5` · MIDI 60

**Build, Breakdown** — no pattern authored for `riser` at any band (asked for band 1)

### `noise` — TR-1000 · OH

**White noise burst on the open-hat track, up where the hats sit** — settings in Sound design

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

**On this box** — TR-1000

- `offbeat` → `accent` true on steps 7, 15, 23
  - ↳ hint: ACCENT [STEP], then step keys

## 6. Sound design

### Tracker Mini

*This block draws on the Polyend Tracker Mini Manual 2.2.1b, pp.116-185; its values are starting points.*

**Content**

- Ships 50 factory genre-based sample packs — look in /Samples/FactoryPacks on the microSD card. p.34 names the folder and the count, and no page lists what is in a pack, so the Source line below says what the part needs rather than naming a file.

**Pattern-wide**

One setting for the whole pattern — set it once, not once per part below.

- **SWING** `50` % (25…75 %)
  - ↳ note: 50% is no swing; set once, it applies across the whole pattern
  - ↳ hint: Hold [FX1], press (Up)/(Down)

#### Track 1 — `kick`: Tight one-shot kick, tuned down, no tail

Source — A dry kick one-shot under 400 ms, attack intact and no room printed on it

- **PLAY MODE** `1-Shot`
- **FILTER TYPE** `Low-pass`
- **TUNE** `-3` st (-24…24 st)
- **CUTOFF** `74` % (0…100 %)
- **OVERDRIVE** `18` % (0…100 %)
- **ENVELOPE · DECAY** `0.28` Sec (0…10 Sec)

#### Track 2 — `open-hat`: Half-open hat, gated short

Source — An open hat one-shot with a real tail — the release gates it short, so the tail has to exist

- **PLAY MODE** `1-Shot`
- **FILTER TYPE** `Low-pass`
- **CUTOFF** `58` % (0…100 %)
- **ENVELOPE · RELEASE** `0.24` Sec (0…10 Sec)
- **BIT DEPTH** `12` Bits (4…16 Bits)

#### Track 3, Track 4 and Track 5 — `stab`: Single-note sample struck short, one note per track

Polyphony — 3 notes, one on each of 3 voices. **Every voice takes these same settings**: it is one sound played 3 times over, not 3 sounds, and a difference between them is a difference you will hear inside the chord. Which voice takes which note is in Hook.

Source — A single-note tonal sample — one pitch, with a front edge. Yours, or one note rendered here; it does not need to be a chord and should not be one

- One sample covers the whole chord: manual p.128, the step note sets the playback pitch, so the same instrument placed on three tracks at three notes sounds three notes. Load it on each track of the stack and put the notes the Hook phase lists against each one. Nothing has to be re-recorded when the chord changes quality, which is the difference between this and a rendered chord.

Routing — Tracks 1-8 — costs no synth slot, and one loaded sample serves every track of the stack

- **PLAY MODE** `1-Shot`
- **FILTER TYPE** `Low-pass`
- **CUTOFF** `66` % (0…100 %)
- **RESONANCE** `30` % (0…100 %)
- **TUNE** `0` st (-24…24 st)
- **ENVELOPE · ATTACK** `0` Sec (0…10 Sec)
- **ENVELOPE · DECAY** `0.3` Sec (0…10 Sec)
- **ENVELOPE · SUSTAIN** `0` % (0…100 %)
- **ENVELOPE · RELEASE** `0.2` Sec (0…10 Sec)
- **OVERDRIVE** `16` % (0…100 %)

#### Synth Track 1, Synth Track 2 and Synth Track 3 — `pad`: Slow detuned pad, long swell

Polyphony — 3 notes, one on each of 3 voices. **Every voice takes these same settings**: it is one sound played 3 times over, not 3 sounds, and a difference between them is a difference you will hear inside the chord. Which voice takes which note is in Hook.

Routing — Synth Track n is panel track n+8 — costs one of the three project synth slots

- **MODEL** `VAP`
- **FILTER TYPE** `Low Pass SVF 12dB`
- **OSC MIX** `0` % (-100…100 %)
- **SHAPE 1** `28` (0…100)
- **SHAPE 2** `34` (0…100)
- **DETUNE** `14` c (0…100 c)
- **FILTER CUTOFF** `2400` Hz (20…20000 Hz)
- **AMP ENV ATTACK** `1.2` Sec (0…10 Sec)
- **AMP ENV RELEASE** `2.4` Sec (0…10 Sec)
- **VOICE VOLUME** `86` % (0…200 %)

#### Track 6 — `riser`: Sample played backwards, the envelope swelling it into the change

Source — A sample with a long decaying tail — reversed, that tail is the rise, so the tail is the part that matters. p.196 warns a very long tail can reverse into silence, so check the end point after you turn it round

Routing — **Set `r` to `<<<` on the step that starts the rise** — the Reverse Sample step FX, p.196. The envelope below does the swell; the reverse is what makes a decay into a build. p.196 also warns that a long tail can reverse into silence, so shorten the sample end if nothing sounds

- **PLAY MODE** `1-Shot`
- **FILTER TYPE** `Low-pass`
- **CUTOFF** `78` % (0…100 %)
- **RESONANCE** `26` % (0…100 %)
- **ENVELOPE · ATTACK** `3.4` Sec (0…10 Sec)
  - ↳ note: The climb. Longer than the section start-to-change if you want it still rising
- **ENVELOPE · SUSTAIN** `100` % (0…100 %)
- **ENVELOPE · RELEASE** `0.4` Sec (0…10 Sec)
  - ↳ note: Short, so the rise stops at the change rather than hanging over it
- **REVERB SEND** `54` % (0…100 %)

### TR-1000

*This block draws on the TR-1000 Reference Manual (eng02) v1.13+, pp.26-71, the TR-1000 Preset GEN/INST List (eng02) v1.20, p.1, and the instrument at firmware 1.2.1; its values are starting points.*

**Pattern-wide**

One setting for the whole pattern — set it once, not once per part below.

- **SHUFFLE** `0` (-100…100)
  - ↳ note: Pattern-wide: one setting for every track, saved with the pattern
  - ↳ hint: Hold [SHIFT], press [PTN SELECT]

#### BD — `sub`: Kick tuned down into a sustained sub

Routing — INDIVIDUAL OUT BD so the sub stays out of the bus effects

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
  - ↳ hint: Hold [BD]-[RC], turn REVERB [LEVEL]
- **DLY SEND** `0` % (0…100 %)
  - ↳ hint: Hold [BD]-[RC], turn DELAY [LEVEL]

#### LT — `bass-mid`: FM bass with the modulator up

- **GEN** `FM Tom Model`
  - ↳ hint: Hold [SHIFT]+[GEN], select with [C6]
- **TUNE** `-38` % (-100…100 %)
  - ↳ note: The hook’s notes go in as motion on the [TUNE] knob, by ear
  - ↳ hint: MOTION [REC] lit, then move knob
- **DECAY** `76` % (0…100 %)
- **FM DEPTH** `58` % (0…100 %)
  - ↳ hint: Modulator level; this is the dirt
- **FM FBK** `30` % (0…100 %)
  - ↳ hint: Modulator feedback, on top of the depth
- **FM FREQ** `42` % (0…100 %)
  - ↳ hint: Modulator frequency, in place of FM RATIO
- **NOISE** `14` % (0…100 %)
- **LPF FREQ** `46` % (0…100 %)
- **HPF FREQ** `0` % (0…100 %)
  - ↳ hint: Nothing off the bottom
- **P. AMOUNT** `0` % (0…100 %)
  - ↳ hint: Flat: no pitch envelope on a bass note
- **RVB SEND** `0` % (0…100 %)
  - ↳ hint: Hold [BD]-[RC], turn REVERB [LEVEL]
- **DLY SEND** `0` % (0…100 %)
  - ↳ hint: Hold [BD]-[RC], turn DELAY [LEVEL]

#### HC — `clap`: Wide clap sitting on top of the snare

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
  - ↳ note: Which of the three assignment slots this uses
- **MOD CATEGORY** `FLT`
- **MOD TARGET** `CUTOFF`
- **MOD AMOUNT** `22` % (-100…100 %)
- **RVB SEND** `30` % (0…100 %)
  - ↳ hint: Hold [BD]-[RC], turn REVERB [LEVEL]
- **DLY SEND** `14` % (0…100 %)
  - ↳ hint: Hold [BD]-[RC], turn DELAY [LEVEL]

#### CH — `closed-hat`: Grainy CR-78 hat with a metallic edge

- **GEN** `CR78 HiHat`
  - ↳ hint: Hold [SHIFT]+[GEN], select with [C6]
- **TUNE** `-5` % (-100…100 %)
- **DECAY** `20` % (0…100 %)
- **METALLIC** `72` % (0…100 %)
  - ↳ hint: Metal-like overtone level
- **RVB SEND** `10` % (0…100 %)
  - ↳ hint: Hold [BD]-[RC], turn REVERB [LEVEL]
- **DLY SEND** `8` % (0…100 %)
  - ↳ hint: Hold [BD]-[RC], turn DELAY [LEVEL]

#### RC — `metallic`: CR-78 metal ringing across the bar line

- **GEN** `CR78 Cymbal`
  - ↳ hint: Hold [SHIFT]+[GEN], select with [C6]
- **TUNE** `18` % (-100…100 %)
- **DECAY** `46` % (0…100 %)
- **METALLIC** `88` % (0…100 %)
  - ↳ hint: Metal-like overtone level
- **RVB SEND** `20` % (0…100 %)
  - ↳ hint: Hold [BD]-[RC], turn REVERB [LEVEL]
- **DLY SEND** `14` % (0…100 %)
  - ↳ hint: Hold [BD]-[RC], turn DELAY [LEVEL]

#### CC — `impact`: Crash marking the top of a section

- **GEN** `9X Crash Cymbal`
  - ↳ hint: Hold [SHIFT]+[GEN], select with [C6]
- **TUNE** `0` % (-100…100 %)
- **DECAY** `84` % (0…100 %)
- **RVB SEND** `42` % (0…100 %)
  - ↳ hint: Hold [BD]-[RC], turn REVERB [LEVEL]
- **DLY SEND** `18` % (0…100 %)
  - ↳ hint: Hold [BD]-[RC], turn DELAY [LEVEL]

#### OH — `noise`: White noise burst on the open-hat track, up where the hats sit

- **GEN** `VA Noise`
  - ↳ hint: Hold [SHIFT]+[GEN], select with [C6]
- **TONE** `40` % (-100…100 %)
  - ↳ hint: Noise frequency
- **COLOR** `18` % (0…100 %)
  - ↳ hint: White at one end, pink at the other
- **DECAY** `30` % (0…100 %)
- **RVB SEND** `20` % (0…100 %)
  - ↳ hint: Hold [BD]-[RC], turn REVERB [LEVEL]
- **DLY SEND** `0` % (0…100 %)
  - ↳ hint: Hold [BD]-[RC], turn DELAY [LEVEL]

## 7. Finishing

**Sidechain**

The TR-1000 ducks from its own parts.

Nothing here ducks to another box, so a rig-wide pump is built box by box.

**Master FX**

What processes audio in this rig:

- Tracker Mini — carries REVERB SEND in its recipes
- TR-1000 — carries REVERB, DELAY, MASTER FX and ANALOG FX on the panel, and DLY SEND and RVB SEND in its recipes

**Arrangement variations**

Sections that program identically, part for part — build one and copy it:

- **band 0** — Intro, Outro · 9 parts, 14 strikes
- **band 1** — Build, Breakdown · 9 parts, 27 strikes
- **band 3** — Drop, Peak · 10 parts, 73 strikes

`riser` has no pattern authored at any band, so nothing here varies for it.

`pad` is held rather than struck, so there is no grid here to vary.
