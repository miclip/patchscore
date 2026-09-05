# Drone Study

Values are starting points — dial them to taste. Where a mood knob moved one you see the move
(`52 → 45`). Every value carries its range — `38 (0…100)` — so you can tell at a glance whether
the screen in front of you is the one the line is about.

## 1. Song

- **BPM** 72 (template range 60…84)
- **Key** A phrygian (a reroll may pick E phrygian, C phrygian)
- **Harmonic cycle** 16 bars

| Degree | Bars |
| --- | ---: |
| i | 8 |
| bII | 4 |
| vii | 4 |

**Arrangement** — 132 bars total

```
            Settle Gather Tilt     Vast           Turn    Give      Hush
            9b     15b    21b      33b            18b     24b       12b
energy      0.05   0.28   0.55     0.78           0.6     0.33      0.1

texture     ██████ ██████ ████████ ██████████████ ███████ █████████ ████
```

Every part plays throughout. The movement is in the patterns and the energy.

## 2. Voice assignment

- **`texture`** → Tracker Mini · Track 1 — *Granular bed, slow grains, filtered back*
  - p1 · exact `soft` · every section

### Gaps

None.

## 3. Rig integration

**Clock source** — Tracker Mini over `midi-din`, carrying 1 part. Nothing else is here to sync to it.

- Why this box — its manual says leading a rig is its job

- On the Tracker Mini, set `Config > MIDI > Clock Out` to `MIDI Out jack`
  - ↳ note: Off, USB, MIDI Out jack, USB + MIDI Out jack — clock leaves only by the routing set here

- **Tracker Mini** — groovebox · 1 part
  - clock: sends clock · midi-din/usb
  - MIDI Out, MIDI In: 3.5mm TRS — use the supplied Type B adapter for 5-pin MIDI (p.13, p.284)
  - audio: stereo main out · USB audio · audio in
  - mixer: 1 part, no individual outs: one stereo channel for all

## 4. Hook

Steps are sixteenths, counted from the start of the hook: 16 to a bar, so step 33 is bar 3.
Notes sharing a step are one chord and share a line.

Names are spelled for the key, so F minor gets `Eb`; a name in brackets is the same pitch as
a sharps-only box shows it, and appears only where it differs. Octaves put middle C at C4,
which not every maker agrees with — the MIDI number is the form nothing disagrees about.

Where a role has more than one hook authored, rerolling the seed picks a different one.

### `texture` — Tracker Mini · Track 1

**Granular bed, slow grains, filtered back** — settings in Sound design

16 bars in A phrygian.

No note-length field on this box — a note runs until the next note on the same voice, and `OFF` is how you stop one sooner. The rows below are what you enter, in the order you enter them.

- bar 1 · step 1 · `E3` · 5th · MIDI 52
- bar 9 · step 129 · `D3` · 4th · MIDI 50
- bar 13 · step 193 · `Bb2` (`A#2`) · 2nd · MIDI 46

## 5. Step programming

**Not every section is a whole number of repeats, and that is deliberate.** The template
puts section boundaries out of phase with the pattern and the harmonic cycle on purpose, so
the guide prints the lengths it was given and rounds nothing. In Song mode, chain full copies
and cut the final one short: 9 bars of a 4-bar pattern is 4 + 4 + 1.

### `texture` — Tracker Mini · Track 1


**The hook is the notes; the steps below are where they are struck again** — see Hook above for what to play and how long each note is held. This map is 4 bars long and repeats inside the hook; the chain lengths below are counted in the hook.

**Settle, Hush** — 64 steps, band 0

```
 1 x··· ···· ···· ····
17 ···· ···· ···· ····
33 ···· ···· ···· ····
49 ···· ···· ···· ····
```
- `downbeat` — 1

**Gather, Give** — 64 steps, band 1

```
 1 x··· ···· ···· ····
17 ···· ···· ···· ····
33 x··· ···· ···· ····
49 ···· ···· ···· ····
```
- `downbeat` — 1, 33
- tightest re-strike — `6.67` Sec · derived from 32 steps at 72 BPM

**Tilt, Turn** — 64 steps, band 2

```
 1 x··· ···· ···· ····
17 ··x· ···· ···· ····
33 x··· ···· ···· ····
49 ··x· ···· ···· ····
```
- `downbeat` — 1, 33
- `offbeat` — 19, 51
- tightest re-strike — `2.92` Sec · derived from 14 steps at 72 BPM

**Vast** — 64 steps, band 3

```
 1 x··· ···· ··x· ····
17 x··· ···· ··x· ····
33 x··· ···· ···· ····
49 x·x· ···· ···· ····
```
- `downbeat` — 1, 17, 33
- `offbeat` — 11, 27, 51
- `accent` — 49 (vel 104)
- tightest re-strike — `0.42` Sec · derived from 2 steps at 72 BPM

- **Settle** · 9 bars — one copy cut to 9 bars
- **Gather** · 15 bars — one copy cut to 15 bars
- **Tilt** · 21 bars — 1 copy of 16 bars, then one cut to 5 bars
- **Vast** · 33 bars — 2 copies of 16 bars, then one cut to 1 bar
- **Turn** · 18 bars — 1 copy of 16 bars, then one cut to 2 bars
- **Give** · 24 bars — 1 copy of 16 bars, then one cut to 8 bars
- **Hush** · 12 bars — one copy cut to 12 bars

## 6. Sound design

### Tracker Mini

*This block draws on the Polyend Tracker Mini Manual 2.2.1b, pp.117-185; its values are starting points.*

**Content**

- Ships 50 factory genre-based sample packs — look in /Samples/FactoryPacks on the microSD card. p.34 names the folder and the count, and no page lists what is in a pack, so the Source line below says what the part needs rather than naming a file.

**Pattern-wide**

One setting for the whole pattern — set it once, not once per part below.

- **SWING** `50` % (25…75 %)
  - ↳ note: 50% is no swing; set once, it applies across the whole pattern
  - ↳ hint: Hold [FX1], press (Up)/(Down)

#### Track 1 — `texture`: Granular bed, slow grains, filtered back

Source — A sustained tonal source, two seconds or longer — a held synth note, a field recording, a feedback loop. Pitch matters; transients do not, because Granular re-reads the file rather than playing it through

- **PLAY MODE** `Granular`
- **POSITION** `A third into the sample`
  - ↳ note: Set by proportion — the scale is the length of your sample, not a fixed time
  - ↳ hint: Hold [Preview] while turning Position
- **LENGTH** `640` ms (1…1000 ms)
- **SHAPE** `Triangle`
- **LOOP** `Forward`
- **FILTER TYPE** `Low-pass`
- **CUTOFF** `48` % (0…100 %)
- **REVERB SEND** `42` % (0…100 %)
- **POSITION AUTOMATION TYPE** `LFO`
  - ↳ note: On the Granular Position row of Instrument Automation 2/2
  - ↳ hint: Screen button 4 cycles instrument pages
- **POSITION LFO SHAPE** `Triangle`
- **POSITION LFO SPEED** `16`
  - ↳ note: In pattern steps — the screen prints it as 16 steps: one sweep per 16-step pattern
- **POSITION LFO AMOUNT** `28%`
  - ↳ note: Small amounts stay pad-like; larger ones sweep wider and glitchier
- **ENVELOPE · ATTACK** `1.8` Sec (0…10 Sec)
  - ↳ note: 1.8 Sec is deliberate — repeats run together into one continuous bed. For distinct hits, set it to the tightest re-strike Step programming prints, or shorter
- **ENVELOPE · SUSTAIN** `84` % (0…100 %)
- **ENVELOPE · RELEASE** `2.2` Sec (0…10 Sec)

## 7. Finishing

**Sidechain**

No box in this rig has a sidechain.

**Master FX**

The Tracker Mini carries REVERB SEND in its recipes; it is the only box here, so that is the whole master chain.

**Arrangement variations**

Sections that program identically, part for part — build one and copy it:

- **band 0** — Settle, Hush · 1 part, 1 strike
- **band 1** — Gather, Give · 1 part, 2 strikes
- **band 2** — Tilt, Turn · 1 part, 4 strikes
- **band 3** — Vast · 1 part, 7 strikes
