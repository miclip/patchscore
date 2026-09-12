# The Blue Monday bass

`bass-mid` · `hard` · 128 BPM (118–134) · F minor · 2 bars · 32 steps

## The technique

Play all sixteen sixteenths, dead even, with the sequencer holding the pulse. Turn swing off and leave every velocity flat except the one on step 1.

Hold one note for most of the phrase and move once, near the end, by a single step. The shape comes from how long the note stays put.

Keep each note short so a gap opens between them. That gap is what a listener hears as the pulse.

Let it repeat unchanged. When a fill starts to suggest itself, cut to a different section.

## The notes

2 bars in F minor.

- step 1 · `F2` · degree 1 · MIDI 41 · in force 16 steps
- step 17 · `Ab2` · degree 3 · MIDI 44 · in force 8 steps
- step 25 · `G2` · degree 2 · MIDI 43 · in force 8 steps

## The grid

Every step below strikes the note in force at that point. The grid is where the figure is played.

```
 1 xxxx xxxx xxxx xxxx
17 xxxx xxxx xxxx xxxx
```
- `accent` · 1
- `ghost` · 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32
- `offbeat` · 3, 7, 11, 15, 19, 23, 27, 31
- `downbeat` · 5, 9, 13, 17, 21, 25, 29

## Where it plays

**Digitakt II · Track 1**

Repitched bass with the multi-mode filter opened by the envelope

This riff asks for a hard bass-mid and the nearest this box authors is dirty.

Source — A short bass note with harmonics above the fundamental; a filtered sine repitches into nothing to bite on

**Trigger note** — `C5` · MIDI 60

**Settings**

- **SRC MACHINE** `REPITCH`
- **PLAY** `FORWARD`
- **FLTR MACHINE** `MULTI-MODE`
- **AMP MODE** `ADSR`
  - ↳ note: AHD has HOLD and no SUS or REL; ADSR has SUS and REL and no HOLD
- **LFO MODE** `TRG`
- **FADE** `-20` (-64…63)

**Articulation**

- `downbeat` → `velocity` 112, `note-length` 12 on steps 5, 9, 13, 17, 21, 25, 29
  - ↳ hint: Hold a [TRIG] key, turn DATA ENTRY

*This block draws on the Digitakt II User Manual OS 1.15A, pp.56-104; its values are starting points.*
