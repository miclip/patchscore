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
```

Every part plays throughout. The movement is in the patterns and the energy.

## 2. Voice assignment

- **`kick`** → Mother-32 · Voice — *Kick from the normalled envelope: no cables, the pitch drop is two switches*
  - p1 · exact `hard` · every section

### Gaps

This rig cannot make these parts. They are not in the guide below.

- `sub` `dark` (p1) — no room (contended) — the Mother-32 Voice is carrying kick
- `bass-mid` `dirty` (p2) — no room (contended) — the Mother-32 Voice is carrying kick
- `clap` `bright` (p2) — nothing in your rig plays this part
- `closed-hat` `dirty` (p2) — nothing in your rig plays this part
- `metallic` `dark` (p3) — no room (contended) — the Mother-32 Voice is carrying kick
- `open-hat` `dark` (p3) — nothing in your rig plays this part
- `stab` `hard` (p3) — needs 3 notes at once; every voice here is monophonic, and only one voice here plays it at all — nothing here to spread it across
- `impact` `hard` (p4) — no room (contended) — the Mother-32 Voice is carrying kick

### Not needed for this direction

Industrial Techno is finished without these.

- `pad` `dark` (p4) — the hats and the room carry the air here; a held pad is extra
- `riser` `bright` (p4) — a part already playing can lift the eight bars into a drop
- `noise` `dirty` (p5) — grit is a bonus, and the drums already bring some

## 3. Rig integration

**Power on first** — 1 box here needs time before it holds pitch. Switch it on now and patch while it settles.
- **Mother-32** — a few minutes from cold before it holds pitch

**Clock source** — Mother-32 over `analog-clock`, carrying 1 part. Nothing else is here to sync to it.

- Why this box — it is the only box here that can send clock

- On the Mother-32, set `SETUP > PAGE 1: ASSIGNABLE OUTPUT JACK` to `2: Sequencer Clock (Default)`
  - ↳ note: Setup mode opens on (SHIFT) + RESET + SET END + STEP 8. Page 5 sets the outgoing PPQN; the factory value is 4, a sixteenth note

- **Mother-32** — semi-modular · 1 part
  - clock: sends clock · out: analog-clock · in: midi-din/analog-clock
  - OUT · ASSIGN: Sixteen sources, chosen in Setup page 1; the factory default is the sequencer clock, one pulse per step
  - IN · TEMPO: Four modes in Setup page 3; the default is Single Clock Advance, one step per rising edge
  - audio: mono main out · audio in
  - mixer: 1 part, no individual outs: one mono channel for all

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

### `kick` — Mother-32 · Voice

**Kick from the normalled envelope: no cables, the pitch drop is two switches** — settings in Sound design

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

**On this box** — Mother-32

- `accent` → `accent` true on step 9
  - ↳ hint: RESET / ACCENT accents the step being edited

## 6. Sound design

### Mother-32

*This block draws on the Moog Mother-32 User Manual (Version 2), pp.11-16; its values are starting points.*

#### Voice — `kick`: Kick from the normalled envelope: no cables, the pitch drop is two switches

Routing — Played from its own 32-step sequencer, from MIDI IN, or from pitch and gate at VCO 1V/OCT and GATE. No patch cable: the EG is already normalled to the up position of VCO MOD SOURCE (p.49), so VCO MOD DEST at FREQUENCY is the whole pitch drop

- **FREQUENCY** `0` st (-12…12 st)
- **VCO WAVE** `SAW`
- **MIX** `0` % travel (0…100 % travel)
  - ↳ note: Counterclockwise is the VCO, clockwise is white noise or whatever is in EXT. AUDIO
- **CUTOFF** `110` Hz (20…20000 Hz)
- **RESONANCE** `28` % travel (0…100 % travel)
  - ↳ hint: Past 3 o’clock the filter self-oscillates
- **VCF MODE** `LOW PASS`
- **VOLUME** `78` % travel (0…100 % travel)
- Modulation — **VCO MOD SOURCE** `EG / VCO MOD` → **VCO MOD DEST** `FREQUENCY` · **VCO MOD AMOUNT** `34` % travel (0…100 % travel)
  - ↳ neutral: `0` is no modulation
  - ↳ note: The EG is normalled here — a cable in VCO MOD replaces it
- Modulation — **VCF MOD SOURCE** `EG` → `the VCF cutoff` · **VCF MOD POLARITY** `+` · **VCF MOD AMOUNT** `40` % travel (0…100 % travel)
  - ↳ neutral: `0` is no modulation
- **ATTACK** `0` % travel (0…100 % travel)
- **SUSTAIN** `OFF`
  - ↳ hint: SUSTAIN ON plays legato, OFF retriggers
- **DECAY** `16` % travel (0…100 % travel)
- **VCA MODE** `EG`
- **GLIDE** `0` % travel (0…100 % travel)
  - ↳ hint: Turn GLIDE clockwise to glide a step

## 7. Finishing

**Sidechain**

No box in this rig has a sidechain.

**Master FX**

Nothing in this rig processes audio. The master chain is yours at the desk.

**Arrangement variations**

Sections that program identically, part for part — build one and copy it:

- **band 0** — Intro, Outro · 1 part, 2 strikes
- **band 1** — Build, Breakdown · 1 part, 4 strikes
- **band 3** — Drop, Peak · 1 part, 6 strikes
