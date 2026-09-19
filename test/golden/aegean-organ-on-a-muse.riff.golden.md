# The Aegean Organ Phrygian figure

`lead` · `bright` · 76 BPM (68–88) · D phrygian · 8 bars · 64 steps

## The technique

Four chords, eight bars, two bars each: D minor, E flat major, D minor, C minor. The right hand enters on the beat with every chord. An organ has no attack shape, so each note speaks the instant the key goes down, and the phrasing is all in length and release.

Left hand, root and fifth only, no thirds: D and A, then Eb and Bb, then D and A, then C and G. Open fifths are what make an organ sound modal instead of churchy.

Over the first D minor: F, then fall to Eb in the second bar. Cut the F short before the drop and the fall has weight; hold it too long and the two notes blur into one sound.

Over the Eb major: G, held for both bars. Over the return to D minor: D, up to Eb, back to D. Over the C minor: Eb, falling to D at the end.

One rule, and it is the whole piece: never play E natural. The Eb is the flat second, what makes this Phrygian instead of ordinary D minor, and it is in three of the four chords. Play an E natural once and the modal sound is gone.

Since nothing swells, practise releasing. A move inside a chord is played off the held note; the hand strikes on the entry into each chord, and the release is what shapes everything else.

## The rules

- Never the raised 2nd, on any chord — over i, the raised second destroys the flat second the mode rests on.

## The chords

4 chords over 8 bars, in D phrygian.

| Degree | Chord | Notes | Bars | Under the figure |
| --- | --- | --- | ---: | :---: |
| i | Dm | D · F · A | 1–2 | ● |
| II | Eb | Eb · G · Bb | 3–4 | ● |
| i | Dm | D · F · A | 5–6 | ● |
| vii | Cm | C · Eb · G | 7–8 | ● |

The figure is played over these chords; supply them separately if your rig allows.

## The notes

8 bars in D phrygian. Each note is in force across the steps shown.

- steps 1–12 · over i Dm · `F5` · degree 3 · MIDI 77
- steps 17–32 · over i Dm · `Eb5` · degree 2 · MIDI 75
- steps 33–64 · over II Eb · `G5` · degree 4 · MIDI 79
- steps 65–72 · over i Dm · `D5` · degree 1 · MIDI 74
- steps 73–80 · over i Dm · `Eb5` · degree 2 · MIDI 75
- steps 81–96 · over i Dm · `D5` · degree 1 · MIDI 74
- steps 97–120 · over vii Cm · `Eb5` · degree 2 · MIDI 75
- steps 121–128 · over vii Cm · `D5` · degree 1 · MIDI 74

## The grid

Every step below strikes the note in force at that point. The grid is where the figure is played.

The grid is 4 bars and the figure is 8: play it round 2 times.

```
 1 x··· ···· ···· ····
17 ···· ···· ···· ····
33 x··· ···· ···· ····
49 ···· ···· ···· ····
```
- `accent` · 1, 65
- `downbeat` · 33, 97

## Where it plays

**Muse · Timbre 1**

Mono sawtooth with the filter tracking the keyboard one to one

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
