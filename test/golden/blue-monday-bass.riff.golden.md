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

**Subsequent 37 · Voice**

Square and sub, four poles, the filter envelope doing the punch

**Settings**

- **SWING** `50` % (0…100 %)
  - ↳ note: 50 is straight; it swings the onboard arpeggiator and sequencer, nothing played from elsewhere
  - ↳ hint: PRESET EDIT, ARPEGGIATOR, SWING
- **● GLIDE**
  - **ON** `OFF`
    - ↳ note: Must be lit for any glide at all
- **● OSCILLATORS**
  - **OSC 1 · OCTAVE** `16'`
  - **OSC 1 · WAVE** `SQUARE`
    - ↳ note: The knob is continuous; these are its four named points
  - **OSC 2 · OCTAVE** `8'`
  - **OSC 2 · WAVE** `SAWTOOTH`
    - ↳ note: The knob is continuous; these are its four named points
  - **OSC · HARD SYNC** `OFF`
    - ↳ note: Keep OSC 2 at or above OSC 1 or it barely sounds
  - **OSC · KB RESET** `ON`
    - ↳ note: A defined leading edge, at the cost of a click on hard attacks
  - **OSC · DUO MODE** `OFF`
    - ↳ note: Off: one note at a time, both oscillators on the same key
  - **OSC · KB CTRL** `HI`
    - ↳ note: Inert while DUO MODE is off; set so FREQUENCY keeps its semitone scale
  - **OSC 2 · FREQUENCY** `0` st (-7…7 st)
    - ↳ note: Centre is unison with OSC 1; fully clockwise is a fifth
  - **OSC 2 · BEAT FREQ** `0` Hz (-3.5…3.5 Hz)
    - ↳ note: A constant beat rate at every pitch, unlike FREQUENCY
- **● MIXER**
  - **OSC 1** `6.5` (0…10)
  - **SUB 1** `7` (0…10)
    - ↳ note: Always a square, always an octave below OSC 1
  - **OSC 2** `4` (0…10)
  - **NOISE** `0` (0…10)
    - ↳ note: Pink, not white
  - **FDBK / EXT IN** `0` (0…10)
    - ↳ note: With nothing in EXT IN this feeds the mixer output back into itself
- **● FILTER**
  - **CUTOFF** `320` Hz (20…20000 Hz)
    - ↳ note: Fully down closes the filter completely
  - **RESONANCE** `4.5` (0…10)
    - ↳ hint: Above 7 the filter sings by itself
  - **MULTIDRIVE** `3` (0…10)
    - ↳ note: Tube-like warmth at the bottom, hard clipping at the top
  - **SLOPE** `24`
    - ↳ note: dB per octave: one, two, three or four poles
  - **EG AMT** `3` (-5…5)
    - ↳ note: Bipolar: below centre the envelope pulls the cutoff down
  - **KB TRACK** `0.5` (0…2)
    - ↳ note: 1.0 is 1:1 tracking centred on C3; 2.0 is 2:1
- **● ENVELOPE GENERATORS**
  - **ENV · KNOB SHIFT** `OFF`
    - ↳ note: Unlit, or the eight knobs below are DELAY, HOLD, VEL AMT and KB TRACK instead
  - **FILTER EG · ATTACK** `2` ms (0.1…10000 ms)
  - **FILTER EG · DECAY** `180` ms (0.1…10000 ms)
  - **FILTER EG · SUSTAIN** `1.5` (0…10)
    - ↳ note: 0 to 100%, calibrated 1 to 10
  - **FILTER EG · RELEASE** `120` ms (0.1…10000 ms)
  - **FILTER EG · LOOP** `OFF`
    - ↳ note: On, the envelope repeats for as long as a note is held — a multistage LFO
  - **AMP EG · ATTACK** `2` ms (0.1…10000 ms)
  - **AMP EG · DECAY** `400` ms (0.1…10000 ms)
  - **AMP EG · SUSTAIN** `6` (0…10)
    - ↳ note: 0 to 100%, calibrated 1 to 10
  - **AMP EG · RELEASE** `120` ms (0.1…10000 ms)
  - **AMP EG · MULTI TRIG** `ON`
    - ↳ note: On, every note re-attacks even when you play legato
  - **AMP EG · LOOP** `OFF`
    - ↳ note: Off on everything but a bed: looping the amplitude re-articulates a held note
- **● MOD 1**
  - **SOURCE** `Triangle`
  - **HI RANGE** `OFF`
    - ↳ note: On, the LFO runs ten times faster
  - **SYNC** `OFF`
    - ↳ note: Off, so RATE is in hertz rather than clock divisions
  - **LFO RATE** `4.5` Hz (0.1…100 Hz)
  - **KB RESET** `OFF`
    - ↳ note: On, the LFO restarts at zero on every note
  - **PITCH AMT** `0` (-5…5)
  - **OSC** `BOTH`
    - ↳ note: Which oscillator PITCH AMT reaches
  - **FILTER AMT** `0` (-5…5)
  - **DEST** `VCA LEVEL`
  - **MOD AMT** `0` (-5…5)

*This block draws on the Subsequent 37 User's Manual, pp.21-61; its values are starting points.*
