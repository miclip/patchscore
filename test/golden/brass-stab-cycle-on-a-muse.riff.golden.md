# The Polyphonic Power brass stab cycle

`stab` · `hard` · 108 BPM (100–120) · F minor · 4 bars · 64 steps

## The technique

Three bars of short offbeat stabs, then the fourth bar lands on the downbeat and holds. The change in placement is the arrangement; the notes barely matter.

In the first three bars, nothing lands on a beat. The first stab of each bar is the "and" of one, half a beat in, and the rest follow on the "and"s. Bar three leaves the last "and" empty, so there is a breath before the fourth bar hits.

Two notes per stab, and never the root. Over the F minor it is Ab and C; over the Bb7 it is D and Ab, the tritone; over the Eb major seventh it is D and G. The bass has the root and the stab has the colour.

The fourth bar is one note, Eb, on the bar head, held for the whole bar. Play it louder than any stab before it.

Never play A natural while the Bb7 is sounding. It is the major seventh against the dominant seventh that drives the move to Eb.

Keep the stabs short and the release fast. The brass should stop before the next beat, and the held note in bar four is the only thing on this page with a tail.

## The rules

- Over IV7, never the raised 3rd — the major seventh cancels the dominant seventh driving the move to Eb.

## The chords

4 chords over 4 bars, in F minor.

| Degree | Bars | Under the figure |
| --- | ---: | :---: |
| i | 1–1 | ● |
| IV7 | 2–2 | ● |
| VII | 3–3 | ● |
| v | 4–4 | ● |

The figure is played over these chords; supply them separately if your rig allows.

## The notes

4 bars in F minor.

- step 3 · `Ab4 C5` · degrees 3 5 · MIDI 68 72 · in force 14 steps
- step 19 · `D5 Ab5` · degrees #6 3 · MIDI 74 80 · in force 14 steps
- step 35 · `D5 G5` · degrees #6 2 · MIDI 74 79 · in force 14 steps
- step 49 · `Eb5` · degree 7 · MIDI 75 · in force 16 steps

## The grid

Every step below strikes the note in force at that point. The grid is where the figure is played.

```
 1 ··x· ··x· ··x· ··x·
17 ··x· ··x· ··x· ··x·
33 ··x· ··x· ··x· ····
49 x··· ···· ···· ····
```
- `accent` · 3, 19, 35, 49
- `offbeat` · 7, 11, 15, 23, 27, 31, 39, 43

## Where it plays

**Muse · Timbre 1**

Pulse-width pair four feet up, highpass parallel, a hard clip on the tail

This riff asks for a hard stab and the nearest this box authors is bright.

Factory patch — **Detroit Funk**

- Load it and the settings below are already dialled. They build the same sound by hand.

**Settings**

- **● VOICE CONTROL**
  - **UNISON** `OFF`
    - ↳ note: Stacks every unused voice onto the first note held, so the timbre plays one note at a time
  - **MONO** `OFF`
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
  - **OCTAVE** `4'`
  - **FREQUENCY** `0` st (-7…7 st)
    - ↳ note: Bipolar, in tune at noon; a perfect fifth either way
  - **TRI/SAW** `0` % (0…100 %) · MIDI CC 46
    - ↳ note: Triangle fully counter-clockwise, sawtooth fully clockwise
  - **PULSE WIDTH** `30` % (0…100 %) · MIDI CC 47
    - ↳ note: A square wave sits at noon
  - **WAVE MIX** `100` % (0…100 %) · MIDI CC 48
    - ↳ note: The slider: triangle/sawtooth on the left against the pulse wave on the right
- **● OSC 2**
  - **OCTAVE** `4'`
  - **FREQUENCY** `0` st (-7…7 st)
  - **TRI/SAW** `0` % (0…100 %) · MIDI CC 51
  - **PULSE WIDTH** `35` % (0…100 %) · MIDI CC 52
  - **WAVE MIX** `100` % (0…100 %) · MIDI CC 53
  - **SYNC 2▸1** `OFF`
    - ↳ note: Locks oscillator 2 to the phase of oscillator 1
- **● MOD OSC**
  - **AUDIO** `OFF`
    - ↳ note: Sub-audio: eight per-voice LFOs, one for each voice
  - **WAVEFORM** `SINE`
  - **FREQUENCY** `30` % (0…100 %) · MIDI CC 25
    - ↳ note: The range of this knob differs with the AUDIO button above
  - **PITCH AMOUNT** `0` % (0…100 %) · MIDI CC 31
  - **PITCH ▸ OSC 1** `OFF`
  - **PITCH ▸ OSC 2** `OFF`
  - **FILTER AMOUNT** `20` % (0…100 %) · MIDI CC 39
  - **FILTER ▸ 1** `OFF`
  - **FILTER ▸ 2** `ON`
- **● MIXER**
  - **OSC 1** `85` % (0…100 %) · MIDI CC 58
  - **RING MOD** `0` % (0…100 %) · MIDI CC 60
    - ↳ note: Sum and difference tones of the two oscillators — inharmonic as they detune
  - **OSC 2** `85` % (0…100 %) · MIDI CC 59
  - **MOD OSC** `10` % (0…100 %) · MIDI CC 61
  - **NOISE** `0` % (0…100 %) · MIDI CC 62
    - ↳ note: White noise
  - **OVERLOAD** `0` % (0…100 %)
  - **OVERLOAD RANGE** `LOW`
    - ↳ note: LOW narrows the drive range for finer control
    - ↳ hint: Press MORE in that section
- **● FILTER**
  - **ORDER** `PAR`
    - ↳ note: SERIAL, STEREO or PARALLEL — with HIGH PASS this decides bandpass, stereo lowpass or notch
  - **LINK FILTERS** `OFF`
    - ↳ note: Off, so FILTER 1 CUTOFF is an absolute cutoff rather than the spacing between the two
- **● FILTER 1**
  - **HIGH PASS** `ON`
    - ↳ note: Highpass: the knob is fully open counter-clockwise, the opposite of lowpass
  - **CUTOFF** `150` Hz (20…20000 Hz) · MIDI CC 67
  - **RESONANCE** `25` % (0…100 %) · MIDI CC 68
    - ↳ note: Self-oscillates into a sine fully clockwise
  - **ENVELOPE AMOUNT** `0` (-100…100) · MIDI CC 69
    - ↳ note: Bipolar, no modulation at noon
  - **KB TRACKING** `1:1`
- **● FILTER 2**
  - **CUTOFF** `8000` Hz (20…20000 Hz) · MIDI CC 72
  - **RESONANCE** `30` % (0…100 %) · MIDI CC 73
  - **ENVELOPE AMOUNT** `50` (-100…100) · MIDI CC 75
    - ↳ note: Bipolar, no modulation at noon
  - **KB TRACKING** `1:1`
- **● FILTER ENV**
  - **ATTACK** `0` s (0…10 s) · MIDI CC 79
  - **DECAY** `0.4` s (0…10 s) · MIDI CC 80
  - **SUSTAIN** `0` % (0…100 %) · MIDI CC 81
  - **RELEASE** `0.3` s (0…10 s) · MIDI CC 82
  - **LOOP** `OFF`
    - ↳ note: Looping, the envelope runs like an LFO
- **● VCA ENV**
  - **ATTACK** `0` s (0…10 s) · MIDI CC 86
  - **DECAY** `0.4` s (0…10 s) · MIDI CC 87
  - **SUSTAIN** `0` % (0…100 %) · MIDI CC 88
  - **RELEASE** `0.2` s (0…10 s) · MIDI CC 89
  - **VELOCITY** `ON`
- **● VCA**
  - **LEVEL** `80` % (0…100 %) · MIDI CC 7
    - ↳ hint: Light TIMBRE A or B first
  - **PAN** `0` (0…100) · MIDI CC 10
    - ↳ note: Bipolar, centred at noon — the screen reads 100L through 0 to 100R
  - **PAN SPREAD** `45` % (0…100 %) · MIDI CC 9
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

*This block draws on the Muse User's Manual v1.4.0, pp.27-111 and the instrument at firmware 1.4.0; its values are starting points.*
