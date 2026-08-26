# Drone Study

Values are starting points — dial them to taste. Where a number came straight off the manual
or off a unit it says which, and where a mood knob moved it you see the move (`52 → 45`) and
the knob that did it. Every value carries its range — `38 (0…100)` — so you can tell at a
glance whether the screen in front of you is the one the line is about.

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

| Section | Bars | Energy |
| --- | ---: | --- |
| Settle | 9 | `█·········` 0.05 |
| Gather | 15 | `███·······` 0.28 |
| Tilt | 21 | `██████····` 0.55 |
| Vast | 33 | `████████··` 0.78 |
| Turn | 18 | `██████····` 0.6 |
| Give | 24 | `███·······` 0.33 |
| Hush | 12 | `█·········` 0.1 |

## 2. Voice assignment

- **`texture`** → Deluge · Track 1 — *DX7 bed sent to the reverb and the delay*
  - p1 · exact `soft` · every section

### Gaps

None.

## 3. Rig integration

**Clock source** — Deluge over `midi-din`, carrying 1 part. Nothing else is here to sync to it.

- Why this box — it is the only box here that can send clock · undocumented
  - ↳ cite: undocumented — the guidebook never states what this box is for; p.253 hedges to “can be a controller for external MIDI devices”, §1.4’s architecture diagram (p.9) is entirely internal, and §§12.4-12.6 document the Deluge as the follower at equal length

- **Deluge** — groovebox · 1 part
  - clock: sends clock · midi-din/usb/analog-clock
  - audio: stereo main out · audio in
  - mixer: 1 part, no individual outs: one stereo channel for all

## 4. Hook

Steps are sixteenths, counted from the start of the hook: 16 to a bar, so step 33 is bar 3.
Notes sharing a step are one chord and share a line.

Names are spelled for the key, so F minor gets `Eb`; a name in brackets is the same pitch as
a sharps-only box shows it, and appears only where it differs. Octaves put middle C at C4,
which not every maker agrees with — the MIDI number is the form nothing disagrees about.

Where a role has more than one hook authored, rerolling the seed picks a different one.

### `texture` — Deluge · Track 1

**DX7 bed sent to the reverb and the delay** — settings in Sound design

16 bars in A phrygian.

Note length is set per note here — `the note’s extent on the grid — hold its start pad and press its end pad`, in grid steps at the current zoom. · manual
- ↳ cite: claim manual — Deluge Official Guidebook OS 4.1 (OLED), p.48

- bar 1 · step 1 · sounds for 128 steps (8 bars) · `E3` · 5th · MIDI 52
- bar 9 · step 129 · sounds for 64 steps (4 bars) · `D3` · 4th · MIDI 50
- bar 13 · step 193 · sounds for 64 steps (4 bars) · `Bb2` (`A#2`) · 2nd · MIDI 46

## 5. Step programming

**Not every section is a whole number of repeats, and that is deliberate.** The template
puts section boundaries out of phase with the pattern and the harmonic cycle on purpose, so
the guide prints the lengths it was given and rounds nothing. In Song mode, chain full copies
and cut the final one short: 9 bars of a 4-bar pattern is 4 + 4 + 1.

### `texture` — Deluge · Track 1

**DX7 bed sent to the reverb and the delay** — settings in Sound design

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

**Tilt, Turn** — 64 steps, band 2

```
 1 x··· ···· ···· ····
17 ··x· ···· ···· ····
33 x··· ···· ···· ····
49 ··x· ···· ···· ····
```
- `downbeat` — 1, 33
- `offbeat` — 19, 51

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

- **Settle** · 9 bars — one copy cut to 9 bars
- **Gather** · 15 bars — one copy cut to 15 bars
- **Tilt** · 21 bars — 1 copy of 16 bars, then one cut to 5 bars
- **Vast** · 33 bars — 2 copies of 16 bars, then one cut to 1 bar
- **Turn** · 18 bars — 1 copy of 16 bars, then one cut to 2 bars
- **Give** · 24 bars — 1 copy of 16 bars, then one cut to 8 bars
- **Hush** · 12 bars — one copy cut to 12 bars

## 6. Sound design

### Deluge

*Values below cite Deluge Official Guidebook OS 4.1 (OLED) and Deluge community firmware release_1_2_1, community_features.md.*

**Song-wide**

One setting for the whole song — set it once, not once per part below.

- **SWING** `50` % (1…99 %)
  - ↳ cite: range manual — Deluge Official Guidebook OS 4.1 (OLED), p.39
  - ↳ note: 50 is off, above is late, below is early — song-wide, not per clip
  - ↳ hint: Hold [SHIFT], turn (TEMPO)

#### Track 1 — `texture`: DX7 bed sent to the reverb and the delay

Routing — Needs the DX7 ENGINE community setting on; create with CUSTOM 1 + SYNTH. Documented as experimental.

- **OSC 1 TYPE** `DX7`
- **REVERB AMOUNT** `30` (0…50)
  - ↳ cite: range manual — Deluge Official Guidebook OS 4.1 (OLED), p.225
- **DELAY AMOUNT** `11` (0…50)
  - ↳ cite: range manual — Deluge Official Guidebook OS 4.1 (OLED), p.222
- **EQ TREBLE AMOUNT** `22` (0…50)
  - ↳ cite: range manual — Deluge Official Guidebook OS 4.1 (OLED), p.219

## 7. Finishing

**Sidechain**

The Deluge ducks from its own parts, and it is the only box here.

**Master FX**

The Deluge carries DELAY AMOUNT and REVERB AMOUNT in its recipes; it is the only box here, so that is the whole master chain.

**Arrangement variations**

Sections that program identically, part for part — build one and copy it:

- **band 0** — Settle, Hush · 1 part, 1 strike
- **band 1** — Gather, Give · 1 part, 2 strikes
- **band 2** — Tilt, Turn · 1 part, 4 strikes
- **band 3** — Vast · 1 part, 7 strikes
