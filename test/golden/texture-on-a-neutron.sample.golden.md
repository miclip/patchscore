# Texture bed

`texture · dark`

## What to record

Thirty seconds, in one uninterrupted take. Length is the feature here: a bed long enough that it never audibly comes round.

Do not cut it to a bar. A texture that lines up with the grid stops reading as a bed.

## Where to make it

**NEUTRON · Voice**

Sample-and-hold gliding the cutoff, delay long

This asks for a dark texture and the nearest this box authors is soft.

Routing — Two of the manual’s own patches at once — p.21’s tip 1 and p.24’s Quantum Loop — with GLIDE smoothing the steps

**Patch**

- `OUT · OSC Mix` → `IN · S&H IN`
  - ↳ note: the manual’s Quantum Loop patch: replaces the NOISE normalled into the sample & hold, so the steps track the oscillators rather than hiss
- `OUT · S&H` → `IN · FREQ MOD`
  - ↳ note: the manual’s tip 1, and the second half of Quantum Loop: replaces the LFO normalled to FREQ MOD with a random stepped voltage

**Settings**

- **PARAPHONIC** `off`
  - ↳ note: Both oscillators follow one note
- **OSC SYNC** `off`
  - ↳ note: OSC 1 restarts the period of OSC 2, so both share a base frequency (p.7)
- **OSC 1 RANGE** `16'`
  - ↳ note: One octave LED lit — this is the ±1 octave scale TUNE is read against
- **OSC 1 TUNE** `0` st (-12…12 st)
  - ↳ note: p.25 gives the 8'/16'/32' scale as +1/-1 octave
- **● OSC 1**
  - **OSC 1 SHAPE** `Triangular`
    - ↳ hint: Hold that OSC’s RANGE, press PARAPHONIC
  - **OSC 1 WIDTH** `50` % (0…100 %)
- **OSC 2 RANGE** `16'`
  - ↳ note: One octave LED lit — this is the ±1 octave scale TUNE is read against
- **OSC 2 TUNE** `0` st (-12…12 st)
  - ↳ note: p.25 gives the 8'/16'/32' scale as +1/-1 octave
- **● OSC 2**
  - **OSC 2 SHAPE** `Sine`
    - ↳ hint: Hold that OSC’s RANGE, press PARAPHONIC
  - **OSC 2 WIDTH** `50` % (0…100 %)
- **OSC MIX** `40` % travel (0…100 % travel)
  - ↳ note: p.25 gives this only as a linear blend between OSC 1 and 2, with no scale
- **NOISE** `20` % (0…100 %)
  - ↳ note: White noise injected into the filter (p.7)
- **VCA BIAS** `25` % (0…100 %)
  - ↳ note: Opens the VCA without a note — turn it down for a gated part (p.10)
- **● OUTPUT**
  - **VOLUME** `68` % (0…100 %)
- **● VCF**
  - **VCF MODE** `low pass`
  - **VCF FREQ** `1400` Hz (10…15000 Hz)
  - **VCF RESO** `4` (0…10)
    - ↳ note: Self-resonates at or near maximum, and plays in tune with KEY TRK on (p.11)
  - **VCF KEY TRK** `off`
    - ↳ note: Cutoff follows the last MIDI note received (p.11)
  - **VCF MOD DEPTH** `50` % (0…100 %)
    - ↳ note: Depth of the LFO normalled to FREQ MOD; p.11 and p.21 call this knob FILTER DEPTH
  - **VCF ENV DEPTH** `20` % (0…100 %)
    - ↳ note: Depth of ENVELOPE 2, which is normalled to the filter (p.12)
- **● ENVELOPE 1**
  - **ENV 1 A** `700` ms (0.3…5000 ms)
    - ↳ note: 300 µs to 5 s, linear attack
  - **ENV 1 D** `2200` ms (2.4…10000 ms)
    - ↳ note: 2.4 ms to 10 s, exponential decay
  - **ENV 1 S** `6` V (0…9 V)
    - ↳ note: A level, given as a voltage
  - **ENV 1 R** `2000` ms (1.5…6000 ms)
    - ↳ note: 1.5 ms to 6 s, exponential release
- **● ENVELOPE 2**
  - **ENV 2 A** `900` ms (0.3…5000 ms)
    - ↳ note: 300 µs to 5 s, linear attack
  - **ENV 2 D** `2400` ms (2.4…10000 ms)
    - ↳ note: 2.4 ms to 10 s, exponential decay
  - **ENV 2 S** `3` V (0…9 V)
    - ↳ note: A level, given as a voltage
  - **ENV 2 R** `1600` ms (1.5…6000 ms)
    - ↳ note: 1.5 ms to 6 s, exponential release
- **● OVERDRIVE**
  - **OD DRIVE** `0` (0…11)
  - **OD TONE** `5` (0…10)
    - ↳ note: Left boosts the lows, right thins them and lifts the highs (p.7)
  - **OD LEVEL** `72` % travel (0…100 % travel)
    - ↳ note: p.25 gives this as "0 dB to -∞" — a named endpoint, so percent of travel
- **● DELAY**
  - **DELAY TIME** `600` ms (25…640 ms)
    - ↳ note: p.12 gives the low end as 24 ms; the specifications say 25 ms
  - **DELAY REPEATS** `55` % (0…100 %)
    - ↳ note: Fully right with MIX right, repeats build without end (p.7)
  - **DELAY MIX** `45` % (0…100 %)
- **● SAMPLE & HOLD**
  - **S&H RATE** `4.5` Hz (0.26…28 Hz)
    - ↳ note: The knob, or IN · S&H CLOCK if something else is clocking it
  - **S&H GLIDE** `260` ms (0.5…1000 ms)
    - ↳ note: Limits the rate of change between samples, so the steps become a glide (p.12)

*This block draws on the Neutron User Manual, p.25; its values are starting points.*

## Recording it

Record it with the sampler, recorder, or DAW you use.

Record it and name it `TEXTURE BED`.
