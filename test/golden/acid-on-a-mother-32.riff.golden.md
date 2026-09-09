# The Acid Tracks line

`acid` · `dirty` · 122 BPM (112–132) · C minor · 2 bars · 32 steps

## The technique

Almost the whole figure sits on the root. The octave in bar one and the two steps at the end of bar two are the moves a listener holds on to.

Leave the rests in. The gaps let the filter close and reopen, and they give the line its shape.

Accent two steps in two bars, both on a note that has just changed. Play the rest under those accents so the filter has something to answer.

Sweep the filter by hand while it loops and leave everything else alone. This is a part you play the filter on.

## The notes

2 bars in C minor.

- step 1 · `C2` · degree 1 · MIDI 36 · in force 12 steps
- step 13 · `C3` · degree 1 · MIDI 48 · in force 8 steps
- step 21 · `F3` · degree 4 · MIDI 53 · in force 6 steps
- step 27 · `G3` · degree 5 · MIDI 55 · in force 6 steps

## The grid

Every step below strikes the note in force at that point. The grid is where the figure is played.

```
 1 x·x· x··x x·x· x··x
17 x·x· x··x x·x· x··x
```
- `accent` · 1, 13
- `offbeat` · 3, 11, 19, 27
- `downbeat` · 5, 9, 17, 21, 25, 29
- `ghost` · 8, 16, 24, 32

## Where it plays

**Mother-32 · Voice**

Resonant line with accented steps opening the filter

Routing — Played from its own 32-step sequencer, from MIDI IN, or from pitch and gate at VCO 1V/OCT and GATE. ASSIGN is set to Accent, so only the steps marked with RESET / ACCENT push the cutoff

**Patch**

- `OUT · ASSIGN` → `IN · VCF CUTOFF`
  - ↳ note: Accented steps add to the cutoff; nothing is displaced, this input only sums (p.48)

**Settings**

- **FREQUENCY** `0` st (-12…12 st)
- **VCO WAVE** `SAW`
- **MIX** `0` % travel (0…100 % travel)
  - ↳ note: Counterclockwise is the VCO, clockwise is white noise or whatever is in EXT. AUDIO
- **CUTOFF** `240` Hz (20…20000 Hz)
- **RESONANCE** `78` % travel (0…100 % travel)
  - ↳ hint: Past 3 o’clock the filter self-oscillates
- **VCF MODE** `LOW PASS`
- **VOLUME** `76` % travel (0…100 % travel)
- Modulation — **VCO MOD SOURCE** `EG / VCO MOD` → **VCO MOD DEST** `FREQUENCY` · **VCO MOD AMOUNT** `0` % travel (0…100 % travel)
  - ↳ neutral: `0` is no modulation
  - ↳ note: The EG is normalled here — a cable in VCO MOD replaces it
- Modulation — **VCF MOD SOURCE** `EG` → `the VCF cutoff` · **VCF MOD POLARITY** `+` · **VCF MOD AMOUNT** `52` % travel (0…100 % travel)
  - ↳ neutral: `0` is no modulation
- **ATTACK** `0` % travel (0…100 % travel)
- **SUSTAIN** `OFF`
  - ↳ hint: SUSTAIN ON plays legato, OFF retriggers
- **DECAY** `24` % travel (0…100 % travel)
- **VCA MODE** `EG`
- **GLIDE** `22` % travel (0…100 % travel)
  - ↳ hint: Turn GLIDE clockwise to glide a step
- **ASSIGN OUTPUT** `Accent`
  - ↳ hint: Setup page 1 chooses the ASSIGN source

**Articulation**

- `accent` → `accent` true on steps 1, 13
  - ↳ hint: RESET / ACCENT accents the step being edited
- `offbeat` → `glide` true on steps 3, 11, 19, 27
  - ↳ hint: Turn GLIDE clockwise to glide a step

*This block draws on the Moog Mother-32 User Manual (Version 2), pp.11-59; its values are starting points.*
