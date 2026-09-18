# The Blade Runner Blues lead

`lead` · `bright` · 64 BPM (56–72) · F# minor · 12 bars · 64 steps

## The technique

Six chords, twelve bars, one note each. Three minor chords, then the pair the key does not own, then the minor fifth to take it back. The line is the arrival on each chord and nothing between.

Come in late on every chord. The entries alternate: a beat after the first chord of each pair, two beats after the second, so the line never lands on the change itself. That is what makes it sound played rather than programmed.

The two entries over the borrowed chords are the major third of the chord beneath them, each a semitone above what the key gives you. That semitone is the whole sound. Play the note the key expects and the turn disappears.

Never play the key’s own third or sixth while these two chords are sounding. A natural third against the raised one is the move collapsing, and it is the one mistake this figure can make.

Hold each entry until the next chord is already sounding, then release. The overlap is where the two chords blur into each other. The one exception is going into the F# major: the D over the third chord stops at the bar line, so the raised third arrives on air.

Over the four minor chords the note is a chord tone, held: the fifth of the first chord, the third of the second and of the third, the fifth of the last. The shape is what repeats; only the two over the turn are raised.

## The rules

- Over I, never the 3rd — the natural third against the raised one is the turn collapsing.
- Over IV, never the 6th — the same move one chord later, and the natural sixth cancels the chord.
- Enter each chord at least 4 steps after it lands — the lead floats free of the harmonic grid; entering on the bar head pins it to one.

## The chords

6 chords over 12 bars, in F# minor.

| Degree | Notes | Bars | Under the figure |
| --- | --- | ---: | :---: |
| i | F# · A · C# | 1–2 | ● |
| VI | D · F# · A | 3–4 | ● |
| iv | B · D · F# | 5–6 | ● |
| I | F# · A# · C# | 7–8 | ● |
| IV | B · D# · F# | 9–10 | ● |
| v | C# · E · G# | 11–12 | ● |

The figure is played over these chords; supply them separately if your rig allows.

## The notes

12 bars in F# minor. Each note is in force across the steps shown.

- steps 5–34 · over i · `C#5` · degree 5 · MIDI 73
- steps 41–66 · over VI · `F#5` · degree 1 · MIDI 78
- steps 69–96 · over iv · `D5` · degree 6 · MIDI 74
- steps 105–130 · over I · `A#4` · degree #3 · MIDI 70
- steps 133–162 · over IV · `D#5` · degree #6 · MIDI 75
- steps 169–194 · over v · `G#4` · degree 2 · MIDI 68

## The grid

Every step below strikes the note in force at that point. The grid is where the figure is played.

The grid is 4 bars and the figure is 12: play it round 3 times.

```
 1 ···· x··· ···· ····
17 ···· ···· ···· ····
33 ···· ···· x··· ····
49 ···· ···· ···· ····
```
- `downbeat` · 5, 69, 133
- `accent` · 41, 105, 169

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
- **● PROGRAMMER**
  - **MIDI IN CHANNEL** `1`
    - ↳ note: TIMBRE A listens here
    - ↳ hint: PROGRAMMER, MENU, MIDI
  - **MULTI IN B CHANNEL** `2`
    - ↳ note: TIMBRE B listens here under MULTI MODE. Both default to 1, so this must differ or the two timbres double on one channel
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
