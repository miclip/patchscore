# The Muse Runner floating-arrival lead

`lead` · `bright` · 66 BPM (58–74) · D minor · 4 bars · 64 steps

## The technique

Bars 3 to 6 of the cycle, over the second and third chords. The chords either side are the setting; these two are where the line leans.

One late entry per chord. Let the pad move first, then arrive: every entry lands two beats after the chord has changed under it, and the wait is what makes the note sound placed rather than programmed.

The two entries are the tension notes. The E over the second chord and the B over the third are each the raised eleventh of the chord under them. Everything else in the figure is consonant and exists to make those two land.

The third note continues the chord. The B lifts to C while the same chord is still sounding, so it is a step within the held line and the chord gets no second arrival.

Hold each entry until the next chord is already sounding, then release. The E is still ringing when the third chord arrives, and the C is still ringing when the fourth does.

Never play Bb while the third chord is sounding, and never Eb while the second is. Each is the natural fourth of its chord, a semitone above the third, and either one cancels the raised fourth the line is built on.

Over the first and fourth chords, do the same thing with a chord tone: one note, two beats late, held past the change. The A over the first chord and the A falling to G over the fourth are the plain version of the gesture.

Wide vibrato, arriving after the note has settled. The note should be still for a moment before it starts to move.

## The rules

- Over VI, never the lowered 2nd — the chord’s natural fourth sits a semitone above its third and cancels the raised one the line plays.
- Over III, never the 6th — the chord’s natural fourth cancels the raised one it exists for.
- Enter each chord at least 8 steps after it lands — the pad moves first and the note arrives after it; an entry on the change pins it.

## The chords

4 chords over 8 bars, in D minor. The figure is bars 3–6.

| Degree | Bars | Under the figure |
| --- | ---: | :---: |
| i | 1–2 |  |
| VI | 3–4 | ● |
| III | 5–6 | ● |
| iv | 7–8 |  |

The figure is played over these chords; supply them separately if your rig allows.

## The notes

4 bars in D minor.

- step 9 · `E5` · degree 2 · MIDI 76 · in force 26 steps
- step 41 · `B4` · degree #6 · MIDI 71 · in force 12 steps
- step 53 · `C5` · degree 7 · MIDI 72 · in force 20 steps

## The grid

Every step below strikes the note in force at that point. The grid is where the figure is played.

```
 1 ···· ···· x··· ····
17 ···· ···· ···· ····
33 ···· ···· x··· ····
49 ···· x··· ···· ····
```
- `accent` · 9
- `downbeat` · 41, 53

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
