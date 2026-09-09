# Wobble bass

`bass-mid · dirty`

## What to record

A wobble is movement under a held note, so the movement is what the take has to contain. Hold a low note and move whatever tone control the patch below gives you while it sounds.

Four bars, so there is a loop to cut. A wobble cut to one cycle stops wobbling.

Write down the tempo you recorded at, and where in the bar the movement lands.

Two takes, one moving slowly and one fast, where the speed of the movement is yours to set.

## Where to make it

**Mother-32 · Voice**

Mid bass with the pulse width moving and the LFO tracking the notes

Routing — Played from its own 32-step sequencer, from MIDI IN, or from pitch and gate at VCO 1V/OCT and GATE. p.13's TIP: the keyboard CV at LFO RATE makes the width modulation speed up as the line climbs

**Patch**

- `OUT · KB` → `IN · LFO RATE`
  - ↳ note: LFO rate follows the pitch of each note played

**Settings**

- **FREQUENCY** `0` st (-12…12 st)
- **VCO WAVE** `PULSE`
- **PULSE WIDTH** `34` % (2…98 %)
  - ↳ note: Thinner accentuates the upper harmonics; mid position is a square wave
- **MIX** `0` % travel (0…100 % travel)
  - ↳ note: Counterclockwise is the VCO, clockwise is white noise or whatever is in EXT. AUDIO
- **CUTOFF** `620` Hz (20…20000 Hz)
- **RESONANCE** `48` % travel (0…100 % travel)
  - ↳ hint: Past 3 o’clock the filter self-oscillates
- **VCF MODE** `LOW PASS`
- **VOLUME** `78` % travel (0…100 % travel)
- Modulation — **VCO MOD SOURCE** `LFO` → **VCO MOD DEST** `PULSE WIDTH` · **VCO MOD AMOUNT** `26` % travel (0…100 % travel)
  - ↳ neutral: `0` is no modulation
- Modulation — **VCF MOD SOURCE** `EG` → `the VCF cutoff` · **VCF MOD POLARITY** `+` · **VCF MOD AMOUNT** `30` % travel (0…100 % travel)
  - ↳ neutral: `0` is no modulation
- **LFO RATE** `3.2` Hz (0.1…350 Hz)
- **LFO WAVE** `TRIANGLE`
- **ATTACK** `0` % travel (0…100 % travel)
- **SUSTAIN** `ON`
  - ↳ hint: SUSTAIN ON plays legato, OFF retriggers
- **DECAY** `38` % travel (0…100 % travel)
- **VCA MODE** `EG`
- **GLIDE** `8` % travel (0…100 % travel)
  - ↳ hint: Turn GLIDE clockwise to glide a step

*This block draws on the Moog Mother-32 User Manual (Version 2), pp.11-16; its values are starting points.*

## Recording it

Record it with the sampler, recorder, or DAW you use.

Record it and name it `WOBBLE BASS`.
