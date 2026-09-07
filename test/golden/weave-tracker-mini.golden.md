# Weave

Values are starting points — dial them to taste. Where a mood knob or the key moved one you see
the move (`52 → 45`). Every value carries its range — `38 (0…100)` — so you can tell at a glance
whether the screen in front of you is the one the line is about.

## 1. Song

- **BPM** 132 (template range 126…140)
- **Key** E aeolian (a reroll may pick G aeolian, B aeolian)
- **Harmonic cycle** 8 bars

| Degree | Bars |
| --- | ---: |
| i | 5 |
| VI | 2 |
| v | 1 |

**Arrangement** — 120 bars total

```
            Thread Pull     Knot   Slack Twist      Fray  Turn       Unwind
            9b     18b      14b    11b   23b        13b   22b        10b
energy      0.12   0.38     0.85   0.55  0.95       0.42  0.68       0.08

kick        ██████ ████████ ██████ █████ ██████████ █████ ██████████ ██████
sub         ██████ ████████ ██████ █████ ██████████ █████ ██████████ ██████
closed-hat  ██████ ████████ ██████ █████ ██████████ █████ ██████████ ██████
ghost-perc  ██████ ████████ ██████ █████ ██████████ █████ ██████████ ██████
tom         ██████ ████████ ██████ █████ ██████████ █████ ██████████ ██████
open-hat    ██████ ████████ ██████ █████ ██████████ █████ ██████████ ██████
rim         ██████ ████████ ██████ █████ ██████████ █████ ██████████ ██████
metallic    ██████ ████████ ██████ █████ ██████████ █████ ██████████ ██████
```

Every part plays throughout. The movement is in the patterns and the energy.

## 2. Voice assignment

- **`kick`** → Tracker Mini · Track 1 — *Tight one-shot kick, tuned down, no tail*
  - p1 · exact `hard` · every section
- **`sub`** → Tracker Mini · Track 2 — *Low tone at the direction’s own pitch, everything above it filtered off*
  - p1 · exact `dark` · every section
- **`closed-hat`** → Tracker Mini · Track 3 — *Short closed hat, nudged off the grid*
  - p2 · exact `clean` · every section
- **`ghost-perc`** → Tracker Mini · Track 4 — *Quiet shaker filling the gaps*
  - p2 · exact `soft` · every section
- **`tom`** → Tracker Mini · Track 5 — *Low tom, rolls into the fill*
  - p2 · exact `dark` · every section
- **`open-hat`** → Tracker Mini · Track 6 — *Half-open hat, gated short*
  - p3 · substituted — asked `hard`, authored `dark` · every section
- **`rim`** → Tracker Mini · Track 7 — *Dry rim, dropped in and out*
  - p3 · exact `clean` · every section
- **`metallic`** → Tracker Mini · Track 8 — *Struck metal hit, band-passed and driven into the resonance*
  - p4, optional · exact `dirty` · every section

### Gaps

None.

## 3. Rig integration

**Clock source** — Tracker Mini over `midi-din`, carrying 8 parts. Nothing else is here to sync to it.

- Why this box — its manual says leading a rig is its job

- On the Tracker Mini, set `Config > MIDI > Clock Out` to `MIDI Out jack`
  - ↳ note: Off, USB, MIDI Out jack, USB + MIDI Out jack — clock leaves only by the routing set here

- **Tracker Mini** — groovebox · 8 parts
  - clock: sends clock · midi-din/usb
  - MIDI Out, MIDI In: 3.5mm TRS — use the supplied Type B adapter for 5-pin MIDI (p.13, p.284)
  - audio: stereo main out · USB audio · audio in
  - mixer: 8 parts, no individual outs: one stereo channel for all

## 4. Hook

Steps are sixteenths, counted from the start of the hook: 16 to a bar, so step 33 is bar 3.
Notes sharing a step are one chord and share a line.

Names are spelled for the key, so F minor gets `Eb`; a name in brackets is the same pitch as
a sharps-only box shows it, and appears only where it differs. Octaves put middle C at C4,
which not every maker agrees with — the MIDI number is the form nothing disagrees about.

Where a role has more than one hook authored, rerolling the seed picks a different one.

### `sub` — Tracker Mini · Track 2

**Low tone at the direction’s own pitch, everything above it filtered off** — settings in Sound design

8 bars in E aeolian.

No note-length field on this box — a note runs until the next note on the same voice, and `OFF` is how you stop one sooner. The rows below are what you enter, in the order you enter them.

- bar 1 · step 1 · `B1` · 5th · MIDI 35
- bar 6 · step 81 · `G1` · 3rd · MIDI 31
- bar 8 · step 113 · `D2` · 7th · MIDI 38

## 5. Step programming

**Not every section is a whole number of repeats, and that is deliberate.** The template
puts section boundaries out of phase with the pattern and the harmonic cycle on purpose, so
the guide prints the lengths it was given and rounds nothing. In Song mode, chain full copies
and cut the final one short: 9 bars of a 4-bar pattern is 4 + 4 + 1.

### `kick` — Tracker Mini · Track 1

**Tight one-shot kick, tuned down, no tail** — settings in Sound design

**Thread, Unwind** — 16 steps, band 0

```
 1 x··· ···· ···· ····
```
- `downbeat` — 1

**Pull, Fray** — 16 steps, band 1

```
 1 x··· ···· x··· ····
```
- `downbeat` — 1, 9

**Knot, Twist** — 16 steps, band 3

```
 1 x··x ··x· x··· ··x·
```
- `downbeat` — 1, 9
- `ghost` — 4 (vel 44)
- `offbeat` — 7, 15

**Slack, Turn** — 16 steps, band 2

```
 1 x··· ··x· x··· ····
```
- `downbeat` — 1, 9
- `offbeat` — 7

### `sub` — Tracker Mini · Track 2


**The hook is the notes; the steps below are where they are struck again** — see Hook above for what to play and how long each note is held. This map is 2 bars long and repeats inside the hook; the chain lengths below are counted in the hook.

**Thread, Unwind** — 32 steps, band 0

```
 1 x··· ···· ···· ····
17 ···· ···· ···· ····
```
- `downbeat` — 1

**On this box** — Tracker Mini

- `downbeat` → `gate-length` 90 on step 1

**Pull, Fray** — 32 steps, band 1

```
 1 x··· ···· ···· ····
17 x··· ···· ···· ····
```
- `downbeat` — 1, 17
- tightest re-strike — `1.82` Sec · derived from 16 steps at 132 BPM

**On this box** — Tracker Mini

- `downbeat` → `gate-length` 90 on steps 1, 17

**Knot, Twist** — 32 steps, band 3

```
 1 x··· ···· x·x· ····
17 x··· ···· x·x· ····
```
- `downbeat` — 1, 9, 17, 25
- `offbeat` — 11, 27
- tightest re-strike — `0.23` Sec · derived from 2 steps at 132 BPM

**On this box** — Tracker Mini

- `downbeat` → `gate-length` 90 on steps 1, 9, 17, 25

**Slack, Turn** — 32 steps, band 2

```
 1 x··· ···· ··x· ····
17 x··· ···· ··x· ····
```
- `downbeat` — 1, 17
- `offbeat` — 11, 27
- tightest re-strike — `0.68` Sec · derived from 6 steps at 132 BPM

**On this box** — Tracker Mini

- `downbeat` → `gate-length` 90 on steps 1, 17

- **Thread** · 9 bars — 1 copy of 8 bars, then one cut to 1 bar
- **Pull** · 18 bars — 2 copies of 8 bars, then one cut to 2 bars
- **Knot** · 14 bars — 1 copy of 8 bars, then one cut to 6 bars
- **Slack** · 11 bars — 1 copy of 8 bars, then one cut to 3 bars
- **Twist** · 23 bars — 2 copies of 8 bars, then one cut to 7 bars
- **Fray** · 13 bars — 1 copy of 8 bars, then one cut to 5 bars
- **Turn** · 22 bars — 2 copies of 8 bars, then one cut to 6 bars
- **Unwind** · 10 bars — 1 copy of 8 bars, then one cut to 2 bars

### `closed-hat` — Tracker Mini · Track 3

**Short closed hat, nudged off the grid** — settings in Sound design

**Trigger note** — `C5` · MIDI 60

**Thread, Unwind** — 16 steps, band 0

```
 1 ··x· ···· ··x· ····
```
- `offbeat` — 3, 11

**On this box** — Tracker Mini

- `offbeat` → `micro-move` 25 on steps 3, 11
  - ↳ hint: Hold [FX1], press (Up)/(Down)

**Pull, Fray** — 16 steps, band 1

```
 1 ··x· ··x· ··x· ··x·
```
- `offbeat` — 3, 7, 11, 15

**On this box** — Tracker Mini

- `offbeat` → `micro-move` 25 on steps 3, 7, 11, 15
  - ↳ hint: Hold [FX1], press (Up)/(Down)

**Knot, Twist** — 16 steps, band 3

```
 1 ·xx· ·xx· ·xx· ·xx·
```
- `ghost` — 2, 6, 10, 14 (all vel 34)
- `offbeat` — 3, 7, 11, 15

**On this box** — Tracker Mini

- `offbeat` → `micro-move` 25 on steps 3, 7, 11, 15
  - ↳ hint: Hold [FX1], press (Up)/(Down)
- `ghost` → `volume` 38 on steps 2, 6, 10, 14

**Slack, Turn** — 16 steps, band 2

```
 1 ··x· ·xx· ··x· ·xx·
```
- `offbeat` — 3, 7, 11, 15
- `ghost` — 6, 14 (all vel 34)

**On this box** — Tracker Mini

- `offbeat` → `micro-move` 25 on steps 3, 7, 11, 15
  - ↳ hint: Hold [FX1], press (Up)/(Down)
- `ghost` → `volume` 38 on steps 6, 14

### `ghost-perc` — Tracker Mini · Track 4

**Quiet shaker filling the gaps** — settings in Sound design

**Trigger note** — `C5` · MIDI 60

**Thread, Unwind** — 32 steps, band 0

```
 1 ···x ···· ···· ····
17 ···x ···· ···· ····
```
- `ghost` — 4, 20 (all vel 38)

**On this box** — Tracker Mini

- `ghost` → `volume` 30 on steps 4, 20

**Pull, Fray** — 32 steps, band 1

```
 1 ···x ···· ···x ····
17 ···x ···· ···x ····
```
- `ghost` — 4, 12, 20, 28 (all vel 38)

**On this box** — Tracker Mini

- `ghost` → `volume` 30 on steps 4, 12, 20, 28

**Knot, Twist** — 32 steps, band 3

```
 1 ·x·x ·x·· ···x ·x··
17 ·x·x ·x·· ···x ·x··
```
- `ghost` — 2, 4, 6, 12, 14, 18, 20, 22, 28, 30 (all vel 38)

**On this box** — Tracker Mini

- `ghost` → `volume` 30 on steps 2, 4, 6, 12, 14, 18, 20, 22, 28, 30

**Slack, Turn** — 32 steps, band 2

```
 1 ·x·x ···· ···x ····
17 ·x·x ···· ···x ····
```
- `ghost` — 2, 4, 12, 18, 20, 28 (all vel 38)

**On this box** — Tracker Mini

- `ghost` → `volume` 30 on steps 2, 4, 12, 18, 20, 28

- **Thread** · 9 bars — 4 copies of 2 bars, then one cut to 1 bar
- **Slack** · 11 bars — 5 copies of 2 bars, then one cut to 1 bar
- **Twist** · 23 bars — 11 copies of 2 bars, then one cut to 1 bar
- **Fray** · 13 bars — 6 copies of 2 bars, then one cut to 1 bar

### `tom` — Tracker Mini · Track 5

**Low tom, rolls into the fill** — settings in Sound design

**Thread, Unwind** — 64 steps, band 0

```
 1 x··· ···· ···· ····
17 ···· ···· ···· ····
33 x··· ···· ···· ····
49 ···· ···· ···· ····
```
- `downbeat` — 1, 33

**Pull, Fray** — 64 steps, band 1

```
 1 x··· ···· ···· ····
17 ···· ···· ··x· ····
33 x··· ···· ···· ····
49 ···· ···· ··x· ····
```
- `downbeat` — 1, 33
- `offbeat` — 27, 59

**Knot, Twist** — 64 steps, band 3

```
 1 x··· ···· ··x· x···
17 ···· x··· ··x· ····
33 x··· ···· ··x· x···
49 ···· x··· ··x· xxxx
```
- `downbeat` — 1, 13, 21, 33, 45, 53
- `offbeat` — 11, 27, 43, 59
- `fill` — 61, 62, 64
- `accent` — 63 (vel 106)

**On this box** — Tracker Mini

- `fill` → `roll` 2 on steps 61, 62, 64
  - ↳ hint: Hold [FX1], press (Up)/(Down)

**Slack, Turn** — 64 steps, band 2

```
 1 x··· ···· ··x· ····
17 ···· x··· ··x· ····
33 x··· ···· ··x· ····
49 ···· x··· ··x· ·x·x
```
- `downbeat` — 1, 21, 33, 53
- `offbeat` — 11, 27, 43, 59
- `fill` — 62, 64

**On this box** — Tracker Mini

- `fill` → `roll` 2 on steps 62, 64
  - ↳ hint: Hold [FX1], press (Up)/(Down)

- **Thread** · 9 bars — 2 copies of 4 bars, then one cut to 1 bar
- **Pull** · 18 bars — 4 copies of 4 bars, then one cut to 2 bars
- **Knot** · 14 bars — 3 copies of 4 bars, then one cut to 2 bars
- **Slack** · 11 bars — 2 copies of 4 bars, then one cut to 3 bars
- **Twist** · 23 bars — 5 copies of 4 bars, then one cut to 3 bars
- **Fray** · 13 bars — 3 copies of 4 bars, then one cut to 1 bar
- **Turn** · 22 bars — 5 copies of 4 bars, then one cut to 2 bars
- **Unwind** · 10 bars — 2 copies of 4 bars, then one cut to 2 bars

### `open-hat` — Tracker Mini · Track 6

**Half-open hat, gated short** — settings in Sound design

**Trigger note** — `C5` · MIDI 60

**Thread, Unwind** — 32 steps, band 0

```
 1 ···· ···· ···· ··x·
17 ···· ···· ···· ····
```
- `offbeat` — 15

**On this box** — Tracker Mini

- `offbeat` → `gate-length` 45 on step 15

**Pull, Fray** — 32 steps, band 1

```
 1 ···· ···· ···· ··x·
17 ···· ···· ···· ··x·
```
- `offbeat` — 15, 31

**On this box** — Tracker Mini

- `offbeat` → `gate-length` 45 on steps 15, 31

**Knot, Twist** — 32 steps, band 3

```
 1 ···· ··x· ··x· ··x·
17 ··x· ··x· ···· ··x·
```
- `offbeat` — 7, 15, 19, 23, 31
- `accent` — 11 (vel 102)

**On this box** — Tracker Mini

- `offbeat` → `gate-length` 45 on steps 7, 15, 19, 23, 31

**Slack, Turn** — 32 steps, band 2

```
 1 ···· ··x· ···· ··x·
17 ···· ··x· ···· ··x·
```
- `offbeat` — 7, 15, 23, 31

**On this box** — Tracker Mini

- `offbeat` → `gate-length` 45 on steps 7, 15, 23, 31

- **Thread** · 9 bars — 4 copies of 2 bars, then one cut to 1 bar
- **Slack** · 11 bars — 5 copies of 2 bars, then one cut to 1 bar
- **Twist** · 23 bars — 11 copies of 2 bars, then one cut to 1 bar
- **Fray** · 13 bars — 6 copies of 2 bars, then one cut to 1 bar

### `rim` — Tracker Mini · Track 7

**Dry rim, dropped in and out** — settings in Sound design

**Thread, Unwind** — 16 steps, band 0

```
 1 ···· ··x· ···· ····
```
- `offbeat` — 7

**Pull, Fray** — 16 steps, band 1

```
 1 ···· ··x· ···· x···
```
- `offbeat` — 7
- `downbeat` — 13

**Knot, Twist** — 16 steps, band 3

```
 1 ··xx ··x· ··x· xx·x
```
- `offbeat` — 3, 7, 11
- `ghost` — 4, 16 (all vel 46)
- `downbeat` — 13
- `accent` — 14 (vel 104)

**On this box** — Tracker Mini

- `ghost` → `chance` 65 on steps 4, 16
  - ↳ hint: Hold [FX1], press (Up)/(Down)

**Slack, Turn** — 16 steps, band 2

```
 1 ···x ··x· ··x· x···
```
- `ghost` — 4 (vel 46)
- `offbeat` — 7, 11
- `downbeat` — 13

**On this box** — Tracker Mini

- `ghost` → `chance` 65 on step 4
  - ↳ hint: Hold [FX1], press (Up)/(Down)

### `metallic` — Tracker Mini · Track 8

**Struck metal hit, band-passed and driven into the resonance** — settings in Sound design

**Thread, Unwind** — 64 steps, band 0

```
 1 x··· ···· ···· ····
17 ···· ···· ···· ····
33 ···· ···· ···· ····
49 ···· ···· ···· ····
```
- `downbeat` — 1

**Pull, Fray** — 64 steps, band 1

```
 1 x··· ···· ···· ····
17 ···· ···· ···· ····
33 x··· ···· ···· ····
49 ···· ···· ···· ····
```
- `downbeat` — 1, 33

**Knot, Twist** — 64 steps, band 3

```
 1 x··· ···· ···· ····
17 x··· ··x· ···· ····
33 x··· ···· ···· ····
49 x··· ··x· ···· ··x·
```
- `downbeat` — 1, 17, 33, 49
- `offbeat` — 23, 55
- `accent` — 63 (vel 100)

**On this box** — Tracker Mini

- `accent` → `volume` 100 on step 63
  - ↳ hint: Hold [FX1], press (Up)/(Down)

**Slack, Turn** — 64 steps, band 2

```
 1 x··· ···· ···· ····
17 ···· ··x· ···· ····
33 x··· ···· ···· ····
49 ···· ··x· ···· ····
```
- `downbeat` — 1, 33
- `offbeat` — 23, 55

- **Thread** · 9 bars — 2 copies of 4 bars, then one cut to 1 bar
- **Pull** · 18 bars — 4 copies of 4 bars, then one cut to 2 bars
- **Knot** · 14 bars — 3 copies of 4 bars, then one cut to 2 bars
- **Slack** · 11 bars — 2 copies of 4 bars, then one cut to 3 bars
- **Twist** · 23 bars — 5 copies of 4 bars, then one cut to 3 bars
- **Fray** · 13 bars — 3 copies of 4 bars, then one cut to 1 bar
- **Turn** · 22 bars — 5 copies of 4 bars, then one cut to 2 bars
- **Unwind** · 10 bars — 2 copies of 4 bars, then one cut to 2 bars

## 6. Sound design

### Tracker Mini

*This block draws on the Polyend Tracker Mini Manual 2.2.1b, pp.116-185; its values are starting points.*

**Content**

- Ships 50 factory genre-based sample packs — look in /Samples/FactoryPacks on the microSD card. p.34 names the folder and the count, and no page lists what is in a pack, so the Source line below says what the part needs rather than naming a file.

**Pattern-wide**

One setting for the whole pattern — set it once, not once per part below.

- **SWING** `50` % (25…75 %)
  - ↳ note: 50% is no swing; put it on step 1 — one entry covers every track for the pattern
  - ↳ hint: Hold [FX1], press (Up)/(Down)

#### Track 1 — `kick`: Tight one-shot kick, tuned down, no tail

Source — A dry kick one-shot under 400 ms, attack intact and no room printed on it

- **PLAY MODE** `1-Shot`
- **FILTER TYPE** `Low-pass`
- **TUNE** `-3` st (-24…24 st)
  - ↳ note: Write C5 on the step. This TUNE moves the sample that many semitones, so C5 here is not the recorded pitch; C5 with TUNE 0 is a different, untransposed patch, and that one plays the recording as recorded (p.90, p.116).
- **CUTOFF** `74` % (0…100 %)
- **OVERDRIVE** `18` % (0…100 %)
- **ENVELOPE · DECAY** `0.28` Sec (0…10 Sec)

#### Track 2 — `sub`: Low tone at the direction’s own pitch, everything above it filtered off

Source — A clean sustained low tone with a stable, known pitch — a sine or a filtered triangle. Load it at the octave you want to hear: the recipe does not transpose it, so a source recorded high stays high

- **PLAY MODE** `Forward loop`
- **TUNE** `0` st (-24…24 st)
  - ↳ note: Zero: the direction supplies the pitch, and this would transpose underneath it
- **FINETUNE** `0` c (-100…100 c)
- **FILTER TYPE** `Low-pass`
- **CUTOFF** `22` % (0…100 %)
- **RESONANCE** `8` % (0…100 %)
- **ENVELOPE · ATTACK** `0.01` Sec (0…10 Sec)
- **ENVELOPE · SUSTAIN** `100` % (0…100 %)
- **ENVELOPE · RELEASE** `0.3` Sec (0…10 Sec)
  - ↳ note: Short, so one note clears before the next — a sub that overlaps itself is mud
- **REVERB SEND** `0` % (0…100 %)
  - ↳ note: Zero deliberately, and not a mood target — reverb on a sub is what a mix cannot undo

#### Track 3 — `closed-hat`: Short closed hat, nudged off the grid

Source — A closed hat one-shot under 150 ms, dry, nothing to trim off the end

- **PLAY MODE** `1-Shot`
- **FILTER TYPE** `High-pass`
- **CUTOFF** `34` % (0…100 %)
- **ENVELOPE · DECAY** `0.09` Sec (0…10 Sec)
- **PANNING** `-12` (-50…50)

#### Track 4 — `ghost-perc`: Quiet shaker filling the gaps

Source — A shaker, tick or brushed one-shot under 100 ms; it plays quiet, so it has to read quiet

- **PLAY MODE** `1-Shot`
- **PANNING** `-22` (-50…50)
- **FINETUNE** `-14` c (-100…100 c)
- **ENVELOPE · DECAY** `0.07` Sec (0…10 Sec)

#### Track 5 — `tom`: Low tom, rolls into the fill

Source — A low tom one-shot with an audible pitch, so tuning down leaves a note rather than a thud

- **PLAY MODE** `1-Shot`
- **FILTER TYPE** `Low-pass`
- **TUNE** `-5 → -1` st (-24…24 st)
  - ↳ note: Write C5 on the step. This TUNE moves the sample that many semitones, so C5 here is not the recorded pitch; C5 with TUNE 0 is a different, untransposed patch, and that one plays the recording as recorded (p.90, p.116).
- **CUTOFF** `52` % (0…100 %)
- **ENVELOPE · DECAY** `0.44` Sec (0…10 Sec)

#### Track 6 — `open-hat`: Half-open hat, gated short

Source — An open hat one-shot with a real tail — the release gates it short, so the tail has to exist

- **PLAY MODE** `1-Shot`
- **FILTER TYPE** `Low-pass`
- **CUTOFF** `58` % (0…100 %)
- **ENVELOPE · RELEASE** `0.24` Sec (0…10 Sec)
- **BIT DEPTH** `12` Bits (4…16 Bits)

#### Track 7 — `rim`: Dry rim, dropped in and out

Source — A rim or stick one-shot, dry and close to transient-only

- **PLAY MODE** `1-Shot`
- **TUNE** `4` st (-24…24 st)
  - ↳ note: Write C5 on the step. This TUNE moves the sample that many semitones, so C5 here is not the recorded pitch; C5 with TUNE 0 is a different, untransposed patch, and that one plays the recording as recorded (p.90, p.116).
- **PANNING** `18` (-50…50)
- **ENVELOPE · DECAY** `0.11` Sec (0…10 Sec)

#### Track 8 — `metallic`: Struck metal hit, band-passed and driven into the resonance

Source — A struck metal one-shot — bell, spring, pipe, anvil, brake drum. Inharmonic is the point, so anything with a clear single pitch is the wrong recording

- **PLAY MODE** `1-Shot`
- **TUNE** `-3` st (-24…24 st)
  - ↳ note: Write C5 on the step. This TUNE moves the sample that many semitones, so C5 here is not the recorded pitch; C5 with TUNE 0 is a different, untransposed patch, and that one plays the recording as recorded (p.90, p.116). A little down here, which lengthens the ring as well as lowering it.
- **FILTER TYPE** `Band-pass`
- **CUTOFF** `72` % (0…100 %)
- **RESONANCE** `62` % (0…100 %)
- **ENVELOPE · ATTACK** `0.01` Sec (0…10 Sec)
- **ENVELOPE · DECAY** `0.9` Sec (0…10 Sec)
- **ENVELOPE · SUSTAIN** `0` % (0…100 %)
- **REVERB SEND** `34` % (0…100 %)

## 7. Finishing

**Sidechain**

No box in this rig has a sidechain.

**Master FX**

The Tracker Mini carries REVERB SEND in its recipes; it is the only box here, so that is the whole master chain.

**Arrangement variations**

Sections that program identically, part for part — build one and copy it:

- **band 0** — Thread, Unwind · 8 parts, 11 strikes
- **band 1** — Pull, Fray · 8 parts, 22 strikes
- **band 3** — Knot, Twist · 8 parts, 63 strikes
- **band 2** — Slack, Turn · 8 parts, 41 strikes
