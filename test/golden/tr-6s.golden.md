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
bass-mid    ██████ ██████ ██████████████ █████████ ██████████████ ██████
clap        ██████ ██████ ██████████████ █████████ ██████████████ ██████
closed-hat  ██████ ██████ ██████████████ █████████ ██████████████ ██████
noise       ██████ ██████ ██████████████ █████████ ██████████████ ██████
```

Every part plays throughout. The movement is in the patterns and the energy.

## 2. Voice assignment

- **`kick`** → TR-6S · BD — *Short, front-loaded kick*
  - p1 · exact `hard` · every section
- **`bass-mid`** → TR-6S · LT — *FM bass note held on the tom slot*
  - p2 · substituted — asked `dirty`, authored `dark` · every section
- **`clap`** → TR-6S · HC — *Hand clap with a short room*
  - p2 · exact `bright` · every section
- **`closed-hat`** → TR-6S · CH — *Closed hat bit-crushed into a tick*
  - p2 · exact `dirty` · every section
- **`noise`** → TR-6S · OH — *Open hat opened out into a wash*
  - p5, optional · substituted — asked `dirty`, authored `soft` · every section

### Gaps

This rig cannot make these parts. They are not in the guide below.

- `sub` `dark` (p1) — no room (contended) — the TR-6S BD is carrying kick
- `metallic` `dark` (p3) — no room (contended) — the TR-6S CH is carrying closed-hat
- `stab` `hard` (p3) — nothing in your rig plays this part
- `impact` `hard` (p4) — no room (contended) — the TR-6S LT is carrying bass-mid

### Waiting on us

Your rig can make these. Nobody has written the recipe yet, so they are not in the guide below — that is our backlog, not a limit of your boxes.

- `open-hat` `dark` (p3) — TR-6S OH could carry it, dial it by ear

### Not needed for this direction

Industrial Techno is finished without these.

- `pad` `dark` (p4) — the hats and the room carry the air here; a held pad is extra
- `riser` `bright` (p4) — a part already playing can lift the eight bars into a drop

## 3. Rig integration

**Clock source** — TR-6S over `midi-din`, carrying 5 parts. Nothing else is here to sync to it.

- Why this box — it is the only box here that can send clock

- On the TR-6S, set `UTILITY > SYNC/TEMPO > Sync Out` to `ON`
  - ↳ note: Sends clock, start and stop together — there is no setting that sends one without the others

- **TR-6S** — drum-machine · 5 parts
  - clock: sends clock · midi-din/usb
  - audio: stereo main out · USB audio
  - mixer: 5 parts, no individual outs: one stereo channel for all

## 4. Hook

Steps are sixteenths, counted from the start of the hook: 16 to a bar, so step 33 is bar 3.
Notes sharing a step are one chord and share a line.

Names are spelled for the key, so F minor gets `Eb`; a name in brackets is the same pitch as
a sharps-only box shows it, and appears only where it differs. Octaves put middle C at C4,
which not every maker agrees with — the MIDI number is the form nothing disagrees about.

Where a role has more than one hook authored, rerolling the seed picks a different one.

### `bass-mid` — TR-6S · LT

**FM bass note held on the tom slot** — settings in Sound design

2 bars in F minor.

A step is a trigger, not a note with a length: the instrument's own envelope ends it, and `DECAY` is what sets that.

- bar 1 · step 1 · `F2` · root · MIDI 41
- bar 1 · step 7 · `F2` · root · MIDI 41
- bar 1 · step 11 · `Bb2` (`A#2`) · 4th · MIDI 46
- bar 1 · step 15 · `F2` · root · MIDI 41
- bar 2 · step 17 · `F2` · root · MIDI 41
- bar 2 · step 23 · `Db3` (`C#3`) · 6th · MIDI 49
- bar 2 · step 27 · `C3` · 5th · MIDI 48

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

### `kick` — TR-6S · BD

**Short, front-loaded kick** — settings in Sound design

**Intro, Outro** — 16 steps, band 0

```
 1 x··· ···· x··· ····
```
- `downbeat` — 1, 9

**On this box** — TR-6S

- `downbeat` → `accent` true on steps 1, 9
  - ↳ hint: Hold [BD], press [SD], then pads

**Build, Breakdown** — 16 steps, band 1

```
 1 x··· x··· x··· x···
```
- `downbeat` — 1, 5, 9, 13

**On this box** — TR-6S

- `downbeat` → `accent` true on steps 1, 5, 9, 13
  - ↳ hint: Hold [BD], press [SD], then pads

**Drop, Peak** — 16 steps, band 3

```
 1 x··· x··x x··· x··x
```
- `downbeat` — 1, 5, 13
- `ghost` — 8 (vel 50), 16 (vel 60)
- `accent` — 9 (vel 112)

**On this box** — TR-6S

- `downbeat` → `accent` true on steps 1, 5, 13
  - ↳ hint: Hold [BD], press [SD], then pads

### `bass-mid` — TR-6S · LT


**The hook is the pattern** — see Hook above for its steps and what each one carries. Nothing separate to program here.

### `clap` — TR-6S · HC

**Hand clap with a short room** — settings in Sound design

**Intro, Outro** — 16 steps, band 0

```
 1 ···· ···· ···· x···
```
- `backbeat` — 13

**On this box** — TR-6S

- `backbeat` → `accent` true on step 13
  - ↳ hint: Hold [BD], press [SD], then pads

**Build, Breakdown** — 16 steps, band 1

```
 1 ···· x··· ···· x···
```
- `backbeat` — 5, 13

**On this box** — TR-6S

- `backbeat` → `accent` true on steps 5, 13
  - ↳ hint: Hold [BD], press [SD], then pads

**Drop, Peak** — 16 steps, band 3

```
 1 ···· x··· ···· xxxx
```
- `backbeat` — 5
- `accent` — 13 (vel 112)
- `fill` — 14, 15, 16

**On this box** — TR-6S

- `backbeat` → `accent` true on step 5
  - ↳ hint: Hold [BD], press [SD], then pads

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

### `noise` — TR-6S · OH

**Open hat opened out into a wash** — settings in Sound design

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

**On this box** — TR-6S

- `accent` → `substep` 1/4 on step 31
  - ↳ hint: Press [SUB], then a pad

## 6. Sound design

### TR-6S

*This block draws on the TR-6S Parameter Guide eng02, pp.7-10 and the TR-6S Owner's Manual eng02, p.17; its values are starting points.*

**Pattern-wide**

One setting for the whole pattern — set it once, not once per part below.

- **SHUFFLE** `0` (-128…127)
  - ↳ note: Pattern-wide: one setting for the whole pattern, not per instrument
  - ↳ hint: Hold [SHIFT], press [PTN SELECT]

#### BD — `kick`: Short, front-loaded kick

- **TONE** `BD category, ACB`
  - ↳ note: ATTACK below exists only for ACB tones of the BD category (p.7)
- **TUNE** `4` (-128…127)
  - ↳ hint: Hold [SHIFT], press [INST]
- **DECAY** `92` (0…255)
- **ATTACK** `178` (0…255)
  - ↳ note: Attack strength of the bass drum
- **INST FX TYPE** `TRANSIENT`
  - ↳ hint: Hold [SHIFT], press [INST]
- **TRANSIENT ATTACK** `48` (-128…127)
- **REVERB SEND** `0` (0…255)
  - ↳ hint: INST Edit > ReverbSend
- **DELAY SEND** `0` (0…255)
  - ↳ hint: INST Edit > DelaySend

#### LT — `bass-mid`: FM bass note held on the tom slot

- **TONE** `FM tone, BASS category`
  - ↳ note: MORPH needs an FM tone; FM COARSE additionally needs one of the FX/HIT–OTHERS categories (p.7)
- **TUNE** `-20` (-128…127)
  - ↳ hint: Hold [SHIFT], press [INST]
- **FM COARSE** `-12` st (-24…24 st)
  - ↳ note: Pitch in semitone steps
- **DECAY** `148` (0…255)
- **MORPH** `-40` (-128…128)
  - ↳ note: Printed as -128–0–128, asymmetric where every other bipolar here stops at +127
- **INST FX TYPE** `LPF`
  - ↳ hint: Hold [SHIFT], press [INST]
- **LPF DEPTH** `120` (0…255)
- **REVERB SEND** `8` (0…255)
  - ↳ hint: INST Edit > ReverbSend
- **DELAY SEND** `16` (0…255)
  - ↳ hint: INST Edit > DelaySend

#### HC — `clap`: Hand clap with a short room

- **TONE** `HC category`
- **TUNE** `24` (-128…127)
  - ↳ hint: Hold [SHIFT], press [INST]
- **DECAY** `112` (0…255)
- **INST FX TYPE** `H BOOST`
  - ↳ hint: Hold [SHIFT], press [INST]
- **H BOOST** `96` (0…255)
- **REVERB SEND** `96` (0…255)
  - ↳ hint: INST Edit > ReverbSend
- **DELAY SEND** `36` (0…255)
  - ↳ hint: INST Edit > DelaySend

#### CH — `closed-hat`: Closed hat bit-crushed into a tick

- **TONE** `CH/OH category`
- **TUNE** `44` (-128…127)
- **DECAY** `36` (0…255)
- **INST FX TYPE** `CRUSHER`
  - ↳ hint: Hold [SHIFT], press [INST]
- **CRUSHER BALANCE** `220` (1…255)
- **SAMPLERATE** `128` (0…255)
- **REVERB SEND** `12` (0…255)
  - ↳ hint: INST Edit > ReverbSend
- **DELAY SEND** `40` (0…255)
  - ↳ hint: INST Edit > DelaySend

#### OH — `noise`: Open hat opened out into a wash

- **TONE** `CH/OH category`
- **TUNE** `-40` (-128…127)
- **DECAY** `220` (0…255)
- **LEVEL** `110` (0…255)
- **INST FX TYPE** `LPF`
  - ↳ hint: Hold [SHIFT], press [INST]
- **LPF DEPTH** `130` (0…255)
- **REVERB SEND** `140` (0…255)
  - ↳ hint: INST Edit > ReverbSend
- **DELAY SEND** `88` (0…255)
  - ↳ hint: INST Edit > DelaySend

## 7. Finishing

**Sidechain**

The TR-6S ducks from its own parts, and it is the only box here.

**Master FX**

The TR-6S carries MASTER FX on the panel, and DELAY SEND, INST FX TYPE and REVERB SEND in its recipes; it is the only box here, so that is the whole master chain.

**Arrangement variations**

Sections that program identically, part for part — build one and copy it:

- **band 0** — Intro, Outro · 5 parts, 10 strikes
- **band 1** — Build, Breakdown · 5 parts, 18 strikes
- **band 3** — Drop, Peak · 5 parts, 44 strikes
