# The Aegean Organ Phrygian figure

`lead` · `bright` · 76 BPM (68–88) · D phrygian · 4 bars · 64 steps

## The technique

Bars 5 to 8 of the cycle, over the return to the D minor chord and the C minor after it. The first half of the cycle is the same mode with less motion.

One forbidden pitch class across the whole piece, which makes this the easiest of the set to internalise: never play E natural. The Eb is the mode, on every chord, and one E collapses it into ordinary D minor.

Over the D minor chord, touch the Eb and come back: D, up a semitone, down again. That neighbour is the sound of the mode, and it is the only ornament the line has.

Over the C minor chord, fall from Eb to D, a semitone again. The Eb is the chord’s third and the D is its ninth, so the fall lands on a tension and stays there.

Enter late, a beat or more into each chord. The organ has no attack to speak of, so the entry is heard as the note arriving, and it should arrive after the chord has.

Over the first half of the cycle, do the same kind of thing with the same notes: F falling to Eb over the opening D minor, then a held G over the Eb major. Every move is a step or a semitone.

## The rules

- Over i, never the raised 2nd — the raised second destroys the flat second the mode rests on.
- Over II, never the raised 2nd — the same pitch class, a direct semitone against the chord’s root.
- Over vii, never the raised 2nd — the mode has no E, and the chord on its seventh degree is minor for that reason.
- Enter each chord at least 4 steps after it lands — the organ has no attack and the note should arrive after the chord has.

## The chords

4 chords over 8 bars, in D phrygian. The figure is bars 5–8.

| Degree | Bars | Under the figure |
| --- | ---: | :---: |
| i | 1–2 |  |
| II | 3–4 |  |
| i | 5–6 | ● |
| vii | 7–8 | ● |

The figure is played over these chords; supply them separately if your rig allows.

## The notes

4 bars in D phrygian.

- step 9 · `D5` · degree 1 · MIDI 74 · in force 8 steps
- step 17 · `Eb5` · degree 2 · MIDI 75 · in force 8 steps
- step 25 · `D5` · degree 1 · MIDI 74 · in force 16 steps
- step 41 · `Eb5` · degree 2 · MIDI 75 · in force 12 steps
- step 53 · `D5` · degree 1 · MIDI 74 · in force 12 steps

## The grid

Every step below strikes the note in force at that point. The grid is where the figure is played.

```
 1 ···· ···· x··· ····
17 x··· ···· x··· ····
33 ···· ···· x··· ····
49 ···· x··· ···· ····
```
- `accent` · 9
- `downbeat` · 17, 25, 41, 53

## Where it plays

**Muse · Timbre 1**

Mono sawtooth with the filter tracking the keyboard one to one

Factory patch — **Muse Runner**

- Load it and the settings below are already dialled. They build the same sound by hand.

**Settings**

- **● VOICE CONTROL**
  - **UNISON** `OFF`
    - ↳ note: Stacks every unused voice onto the first note held, so the timbre plays one note at a time
  - **MONO** `ON`
  - **DETUNE** `20` % (0…100 %) · MIDI CC 92
    - ↳ note: Between voices when poly, between stacked voices under UNISON, between the two oscillators under MONO
  - **TIMBRE A VOICE COUNT** `8` (0…8)
    - ↳ note: The counts always sum to eight, so setting this sets the other — TIMBRE B gets the rest
    - ↳ hint: VOICE CONTROL, then MORE
  - **DYNAMIC VOICE ALLOCATION** `OFF`
    - ↳ note: Its printed default. On, a busy timbre steals from the other and the count above stops holding
    - ↳ hint: VOICE CONTROL, then MORE
  - **MULTI MODE** `ON`
    - ↳ note: Its printed default, and what makes the two timbres separately playable
    - ↳ hint: PROGRAMMER, MENU, MIDI
- **● PROGRAMMER**
  - **MIDI IN CHANNEL** `1`
    - ↳ note: TIMBRE A listens here
    - ↳ hint: PROGRAMMER, MENU, MIDI
  - **MULTI IN B CHANNEL** `2`
    - ↳ note: TIMBRE B listens here. Both default to 1, so this must be changed or the two timbres double on one channel
    - ↳ hint: PROGRAMMER, MENU, MIDI
  - **RECIEVE CC** `ON`
    - ↳ note: Defaults to OFF, so the box ignores CC until this is set. The manual's spelling
    - ↳ hint: PROGRAMMER, MENU, MIDI
- **● OSC 1**
  - **OCTAVE** `8'`
  - **FREQUENCY** `0` st (-7…7 st)
    - ↳ note: Bipolar, in tune at noon; a perfect fifth either way
  - **TRI/SAW** `100` % (0…100 %) · MIDI CC 46
    - ↳ note: Triangle fully counter-clockwise, sawtooth fully clockwise
  - **PULSE WIDTH** `50` % (0…100 %) · MIDI CC 47
    - ↳ note: A square wave sits at noon
  - **WAVE MIX** `0` % (0…100 %) · MIDI CC 48
    - ↳ note: The slider: triangle/sawtooth on the left against the pulse wave on the right
- **● OSC 2**
  - **OCTAVE** `8'`
  - **FREQUENCY** `1` st (-7…7 st)
  - **TRI/SAW** `100` % (0…100 %) · MIDI CC 51
  - **PULSE WIDTH** `50` % (0…100 %) · MIDI CC 52
  - **WAVE MIX** `0` % (0…100 %) · MIDI CC 53
  - **SYNC 2▸1** `OFF`
    - ↳ note: Locks oscillator 2 to the phase of oscillator 1
- **● MOD OSC**
  - **AUDIO** `OFF`
    - ↳ note: Sub-audio: eight per-voice LFOs, one for each voice
  - **WAVEFORM** `SINE`
  - **FREQUENCY** `20` % (0…100 %) · MIDI CC 25
    - ↳ note: The range of this knob differs with the AUDIO button above
  - **PITCH AMOUNT** `0` % (0…100 %) · MIDI CC 31
  - **PITCH ▸ OSC 1** `OFF`
  - **PITCH ▸ OSC 2** `OFF`
  - **FILTER AMOUNT** `15` % (0…100 %) · MIDI CC 39
  - **FILTER ▸ 1** `OFF`
  - **FILTER ▸ 2** `ON`
- **● MIXER**
  - **OSC 1** `75` % (0…100 %) · MIDI CC 58
  - **RING MOD** `0` % (0…100 %) · MIDI CC 60
    - ↳ note: Sum and difference tones of the two oscillators — inharmonic as they detune
  - **OSC 2** `70` % (0…100 %) · MIDI CC 59
  - **MOD OSC** `0` % (0…100 %) · MIDI CC 61
  - **NOISE** `0` % (0…100 %) · MIDI CC 62
    - ↳ note: White noise
  - **OVERLOAD** `15` % (0…100 %)
  - **OVERLOAD RANGE** `LOW`
    - ↳ note: LOW narrows the drive range for finer control
    - ↳ hint: Press MORE in that section
- **● FILTER**
  - **ORDER** `SER`
    - ↳ note: SERIAL, STEREO or PARALLEL — with HIGH PASS this decides bandpass, stereo lowpass or notch
  - **LINK FILTERS** `OFF`
    - ↳ note: Off, so FILTER 1 CUTOFF is an absolute cutoff rather than the spacing between the two
- **● FILTER 1**
  - **HIGH PASS** `OFF`
    - ↳ note: Lowpass
  - **CUTOFF** `2000` Hz (20…20000 Hz) · MIDI CC 67
  - **RESONANCE** `30` % (0…100 %) · MIDI CC 68
    - ↳ note: Self-oscillates into a sine fully clockwise
  - **ENVELOPE AMOUNT** `20` (-100…100) · MIDI CC 69
    - ↳ note: Bipolar, no modulation at noon
  - **KB TRACKING** `1:1`
- **● FILTER 2**
  - **CUTOFF** `3200` Hz (20…20000 Hz) · MIDI CC 72
  - **RESONANCE** `20` % (0…100 %) · MIDI CC 73
  - **ENVELOPE AMOUNT** `10` (-100…100) · MIDI CC 75
    - ↳ note: Bipolar, no modulation at noon
  - **KB TRACKING** `1:1`
- **● FILTER ENV**
  - **ATTACK** `0.1` s (0…10 s) · MIDI CC 79
  - **DECAY** `0.8` s (0…10 s) · MIDI CC 80
  - **SUSTAIN** `55` % (0…100 %) · MIDI CC 81
  - **RELEASE** `0.6` s (0…10 s) · MIDI CC 82
  - **LOOP** `OFF`
    - ↳ note: Looping, the envelope runs like an LFO
- **● VCA ENV**
  - **ATTACK** `0.1` s (0…10 s) · MIDI CC 86
  - **DECAY** `0.9` s (0…10 s) · MIDI CC 87
  - **SUSTAIN** `90` % (0…100 %) · MIDI CC 88
  - **RELEASE** `0.6` s (0…10 s) · MIDI CC 89
  - **VELOCITY** `ON`
- **● VCA**
  - **LEVEL** `80` % (0…100 %) · MIDI CC 7
    - ↳ hint: Light TIMBRE A or B first
  - **PAN** `0` (0…100) · MIDI CC 10
    - ↳ note: Bipolar, centred at noon — the screen reads 100L through 0 to 100R
  - **PAN SPREAD** `0` % (0…100 %) · MIDI CC 9
    - ↳ note: All voices sit at the PAN position fully counter-clockwise
  - **PAN SPRD MODE** `L/R`
    - ↳ hint: Press MORE in that section
- **● DELAY**
  - **CLOCK SYNC** `ON`
    - ↳ note: Both TIME knobs jump between divisions of the global TEMPO
  - **SYNC TYPE** `COMBO`
    - ↳ note: Its printed default — every division rather than only straight, triplet or dotted ones
    - ↳ hint: Press MORE in that section
  - **LINK DELAYS** `OFF`
    - ↳ note: Off, so TIME-L is the left delay time rather than an offset against the right
  - **TIME - L** `1/8` · MIDI CC 93
    - ↳ note: Straight, against the dotted right
  - **TIME - R** `1/8 D` · MIDI CC 94
    - ↳ note: Dotted, so its repeat falls between the left one’s
  - **FEEDBACK** `40` % (0…100 %) · MIDI CC 103
    - ↳ note: Single repeat through to infinite
  - **CHARACTER** `50` % (0…100 %) · MIDI CC 104
    - ↳ note: Noon, where the default DJ-style filter on the repeats is doing nothing
  - **MIX** `30` % (0…100 %) · MIDI CC 105
  - **TIMBRE A / TIMBRE B** `ON`
    - ↳ note: Two separate buttons, one per timbre — engage the one for the timbre this part is on. Disengaged, this part bypasses the delay on a fully analog path
- **● PITCH LFO**
  - **RATE** `5.2` Hz (0.01…40 Hz)
  - **SHAPE** `50` % (0…100 %) · MIDI CC 19
    - ↳ note: Sawtooth fully counter-clockwise, a symmetrical triangle at noon, ramp fully clockwise
  - **AMOUNT** `60` % (0…100 %) · MIDI CC 20
    - ↳ note: Bipolar, no modulation at noon; ±2 semitones at maximum
  - **▸ OSC 1** `ON`
  - **▸ OSC 2** `ON`
  - **SYNC** `OFF`
    - ↳ hint: Press MORE in that section

*This block draws on the Muse User's Manual v1.4.0, pp.27-111 and the instrument at firmware 1.4.0; its values are starting points.*
