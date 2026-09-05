# Industrial Techno

Values are starting points — dial them to taste. Where a mood knob moved one you see the move
(`52 → 45`). Every value carries its range — `38 (0…100)` — so you can tell at a glance whether
the screen in front of you is the one the line is about.

## 1. Song

- **BPM** 134 (template range 130…142)
- **Key** F minor (a reroll may pick A minor, C minor)
- **Harmonic cycle** 8 bars

| Degree | Bars |
| --- | ---: |
| i | 4 |
| VI | 2 |
| VII | 2 |

**Arrangement** — 128 bars total

```
            Intro  Build  Drop           Breakdown Peak           Outro
            16b    16b    32b            16b       32b            16b
energy      0.15   0.45   0.9            0.3       1              0.2

sub         ██████ ██████ ██████████████ █████████ ██████████████ ██████
bass-mid    ██████ ██████ ██████████████ █████████ ██████████████ ██████
```

Every part plays throughout. The movement is in the patterns and the energy.

## 2. Voice assignment

- **`sub`** → Muse · Timbre 1 — *Mono sixteen-foot triangle, one ladder, nothing else in the mixer*
  - p1 · exact `dark` · every section
- **`bass-mid`** → Muse · Timbre 2 — *Mono, overload up and the ring modulator sitting under the note*
  - p2 · exact `dirty` · every section

### Gaps

This rig cannot make these parts. They are not in the guide below.

- `kick` `hard` (p1) — nothing in your rig plays this part
- `clap` `bright` (p2) — nothing in your rig plays this part
- `closed-hat` `dirty` (p2) — nothing in your rig plays this part
- `metallic` `dark` (p3) — nothing in your rig plays this part
- `open-hat` `dark` (p3) — nothing in your rig plays this part
- `stab` `hard` (p3) — no room (contended) — the Muse Timbre 1 is carrying sub
- `impact` `hard` (p4) — nothing in your rig plays this part

### Not needed for this direction

Industrial Techno is finished without these.

- `pad` `dark` (p4) — the hats and the room carry the air here; a held pad is extra
- `riser` `bright` (p4) — a part already playing can lift the eight bars into a drop
- `noise` `dirty` (p5) — grit is a bonus, and the drums already bring some

## 3. Rig integration

**Once warm** — run Muse's quick tune: `PROGRAMMER > TUNING > START QUICK TUNE`. Touches up tuning for the current temperature; takes a few seconds.

**Clock source** — Muse over `midi-din`, carrying 2 parts. Nothing else is here to sync to it.

- Why this box — it is the only box here that can send clock

- On the Muse, set `CLOCK MORE > MIDI CLOCK OUT` to `ON`
  - ↳ note: Defaults to OFF, so nothing leaves the MIDI OUT until this is set

- **Muse** — synth · 2 parts
  - clock: sends clock · out: midi-din/analog-clock · in: midi-din/usb/analog-clock
  - audio: stereo main out
  - mixer: 2 parts, no individual outs: one stereo channel for all

## 4. Hook

Steps are sixteenths, counted from the start of the hook: 16 to a bar, so step 33 is bar 3.
Notes sharing a step are one chord and share a line.

Names are spelled for the key, so F minor gets `Eb`; a name in brackets is the same pitch as
a sharps-only box shows it, and appears only where it differs. Octaves put middle C at C4,
which not every maker agrees with — the MIDI number is the form nothing disagrees about.

Where a role has more than one hook authored, rerolling the seed picks a different one.

### `bass-mid` — Muse · Timbre 2

**Mono, overload up and the ring modulator sitting under the note** — settings in Sound design

2 bars in F minor.

Note length is set per note here — `GATE`.

- bar 1 · step 1 · sounds for 3 steps · `F2` · root · MIDI 41
- bar 1 · step 7 · sounds for 2 steps · `F2` · root · MIDI 41
- bar 1 · step 11 · sounds for 3 steps · `Bb2` (`A#2`) · 4th · MIDI 46
- bar 1 · step 15 · sounds for 2 steps · `F2` · root · MIDI 41
- bar 2 · step 17 · sounds for 3 steps · `F2` · root · MIDI 41
- bar 2 · step 23 · sounds for 2 steps · `Db3` (`C#3`) · 6th · MIDI 49
- bar 2 · step 27 · sounds for 4 steps · `C3` · 5th · MIDI 48

### `pad` — unassigned

*Nothing in your rig plays this part.*

8 bars in F minor.

- bar 1 · step 1 · held for 64 steps (4 bars) · `F3` `Ab3` (`G#3`) `C4` · root 3rd 5th · MIDI 53 56 60
- bar 5 · step 65 · held for 32 steps (2 bars) · `Db4` (`C#4`) `F4` `Ab4` (`G#4`) · 6th root 3rd · MIDI 61 65 68
- bar 7 · step 97 · held for 32 steps (2 bars) · `Eb4` (`D#4`) `G4` `Bb4` (`A#4`) · 7th 2nd 4th · MIDI 63 67 70

### `stab` — unassigned

*Nothing in your rig plays this part.*

4 bars in F minor.

- bar 1 · step 1 · sounds for 2 steps · `F3` `Ab3` (`G#3`) `C4` · root 3rd 5th · MIDI 53 56 60
- bar 1 · step 11 · sounds for 1 step · `F3` `Ab3` (`G#3`) `C4` · root 3rd 5th · MIDI 53 56 60
- bar 3 · step 33 · sounds for 2 steps · `F3` `Ab3` (`G#3`) `C4` · root 3rd 5th · MIDI 53 56 60
- bar 4 · step 49 · sounds for 3 steps · `C4` `Eb4` (`D#4`) `G4` · 5th 7th 2nd · MIDI 60 63 67

## 5. Step programming

### `sub` — Muse · Timbre 1

**Mono sixteen-foot triangle, one ladder, nothing else in the mixer** — settings in Sound design

**Note** — `F1` · MIDI 29

**Intro, Outro** — 16 steps, band 0

```
 1 x··· ···· ···· ····
```
- `downbeat` — 1

**Build, Breakdown** — 16 steps, band 1

```
 1 x··· ···· x··· ··x·
```
- `downbeat` — 1, 9
- `offbeat` — 15

**Drop, Peak** — 16 steps, band 3

```
 1 x·x· ··x· ··x· ··x·
```
- `downbeat` — 1
- `offbeat` — 3, 7, 11, 15

### `bass-mid` — Muse · Timbre 2


**The hook is the pattern** — see Hook above for its steps and what each one carries. Nothing separate to program here.

## 6. Sound design

### Muse

*This block draws on the Muse User's Manual v1.4.0, pp.27-111 and the instrument at firmware 1.4.0; its values are starting points.*

**Song-wide**

One setting for the whole song — set it once, not once per part below.

- **● VOICE CONTROL**
  - **TIMBRE A VOICE COUNT** `4` (0…8)
    - ↳ note: Four each. The counts always sum to eight, so setting this sets the other
    - ↳ hint: VOICE CONTROL, then MORE
  - **DYNAMIC VOICE ALLOCATION** `OFF`
    - ↳ note: Its printed default. On, a busy timbre steals from the other and the four-each split stops holding
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

#### Timbre 1 — `sub`: Mono sixteen-foot triangle, one ladder, nothing else in the mixer

- **● VOICE CONTROL**
  - **UNISON** `OFF`
    - ↳ note: Stacks every unused voice onto the first note held, so the timbre plays one note at a time
  - **MONO** `ON`
  - **DETUNE** `0` % (0…100 %) · MIDI CC 92
    - ↳ note: Between voices when poly, between stacked voices under UNISON, between the two oscillators under MONO
- **● OSC 1**
  - **OCTAVE** `16'`
  - **FREQUENCY** `0` st (-7…7 st)
    - ↳ note: Bipolar, in tune at noon; a perfect fifth either way
  - **TRI/SAW** `0` % (0…100 %) · MIDI CC 46
    - ↳ note: Triangle fully counter-clockwise, sawtooth fully clockwise
  - **PULSE WIDTH** `50` % (0…100 %) · MIDI CC 47
    - ↳ note: A square wave sits at noon
  - **WAVE MIX** `0` % (0…100 %) · MIDI CC 48
    - ↳ note: The slider: triangle/sawtooth on the left against the pulse wave on the right
- **● OSC 2**
  - **OCTAVE** `16'`
  - **FREQUENCY** `0` st (-7…7 st)
  - **TRI/SAW** `0` % (0…100 %) · MIDI CC 51
  - **PULSE WIDTH** `50` % (0…100 %) · MIDI CC 52
  - **WAVE MIX** `0` % (0…100 %) · MIDI CC 53
  - **SYNC 2▸1** `OFF`
    - ↳ note: Locks oscillator 2 to the phase of oscillator 1
- **● MOD OSC**
  - **AUDIO** `OFF`
    - ↳ note: Sub-audio: eight per-voice LFOs, one for each voice
  - **WAVEFORM** `SINE`
  - **FREQUENCY** `10` % (0…100 %) · MIDI CC 25
    - ↳ note: The range of this knob differs with the AUDIO button above
  - **PITCH AMOUNT** `0` % (0…100 %) · MIDI CC 31
  - **PITCH ▸ OSC 1** `OFF`
  - **PITCH ▸ OSC 2** `OFF`
  - **FILTER AMOUNT** `0` % (0…100 %) · MIDI CC 39
  - **FILTER ▸ 1** `OFF`
  - **FILTER ▸ 2** `OFF`
- **● MIXER**
  - **OSC 1** `95` % (0…100 %) · MIDI CC 58
  - **RING MOD** `0` % (0…100 %) · MIDI CC 60
    - ↳ note: Sum and difference tones of the two oscillators — inharmonic as they detune
  - **OSC 2** `0` % (0…100 %) · MIDI CC 59
  - **MOD OSC** `0` % (0…100 %) · MIDI CC 61
  - **NOISE** `0` % (0…100 %) · MIDI CC 62
    - ↳ note: White noise
  - **OVERLOAD** `0` % (0…100 %)
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
  - **CUTOFF** `160` Hz (20…20000 Hz) · MIDI CC 67
  - **RESONANCE** `0` % (0…100 %) · MIDI CC 68
    - ↳ note: Self-oscillates into a sine fully clockwise
  - **ENVELOPE AMOUNT** `0` (-100…100) · MIDI CC 69
    - ↳ note: Bipolar, no modulation at noon
  - **KB TRACKING** `1:2`
- **● FILTER 2**
  - **CUTOFF** `130` Hz (20…20000 Hz) · MIDI CC 72
  - **RESONANCE** `0` % (0…100 %) · MIDI CC 73
  - **ENVELOPE AMOUNT** `0` (-100…100) · MIDI CC 75
    - ↳ note: Bipolar, no modulation at noon
  - **KB TRACKING** `OFF`
- **● FILTER ENV**
  - **ATTACK** `0` s (0…10 s) · MIDI CC 79
  - **DECAY** `0.8` s (0…10 s) · MIDI CC 80
  - **SUSTAIN** `50` % (0…100 %) · MIDI CC 81
  - **RELEASE** `0.6` s (0…10 s) · MIDI CC 82
  - **LOOP** `OFF`
    - ↳ note: Looping, the envelope runs like an LFO
- **● VCA ENV**
  - **ATTACK** `0` s (0…10 s) · MIDI CC 86
  - **DECAY** `1.2` s (0…10 s) · MIDI CC 87
  - **SUSTAIN** `95` % (0…100 %) · MIDI CC 88
  - **RELEASE** `0.6` s (0…10 s) · MIDI CC 89
  - **VELOCITY** `OFF`
- **● VCA**
  - **LEVEL** `95` % (0…100 %) · MIDI CC 7
    - ↳ hint: Light TIMBRE A or B first
  - **PAN** `0` (0…100) · MIDI CC 10
    - ↳ note: Bipolar, centred at noon — the screen reads 100L through 0 to 100R
  - **PAN SPREAD** `0` % (0…100 %) · MIDI CC 9
    - ↳ note: All voices sit at the PAN position fully counter-clockwise
  - **PAN SPRD MODE** `L/R`
    - ↳ hint: Press MORE in that section
- **● DELAY**
  - **TIMBRE A / TIMBRE B** `OFF`
    - ↳ note: Two separate buttons, one per timbre — engage the one for the timbre this part is on. Disengaged, this part bypasses the delay on a fully analog path
- **● LFO 1**
  - **WAVEFORM** `TRIANGLE`
  - **RATE** `0.1` Hz (0.01…40 Hz)
    - ↳ note: The default range; RATE MIN and RATE MAX in the MORE menu can widen it to 1 kHz
  - **AMPLITUDE** `0` % (0…100 %) · MIDI CC 13
    - ↳ note: An attenuator ahead of every destination
  - **SYNC** `OFF`
    - ↳ note: Off, so RATE is the free-running Hz scale rather than tempo divisions
    - ↳ hint: Press MORE in that section
  - **LFO TYPE** `GLOBAL`
    - ↳ note: PER-VOICE gives eight separate LFOs, one per voice
    - ↳ hint: Press MORE in that section

#### Timbre 2 — `bass-mid`: Mono, overload up and the ring modulator sitting under the note

- **● VOICE CONTROL**
  - **UNISON** `OFF`
    - ↳ note: Stacks every unused voice onto the first note held, so the timbre plays one note at a time
  - **MONO** `ON`
  - **DETUNE** `35` % (0…100 %) · MIDI CC 92
    - ↳ note: Between voices when poly, between stacked voices under UNISON, between the two oscillators under MONO
- **● OSC 1**
  - **OCTAVE** `8'`
  - **FREQUENCY** `0` st (-7…7 st)
    - ↳ note: Bipolar, in tune at noon; a perfect fifth either way
  - **TRI/SAW** `90` % (0…100 %) · MIDI CC 46
    - ↳ note: Triangle fully counter-clockwise, sawtooth fully clockwise
  - **PULSE WIDTH** `50` % (0…100 %) · MIDI CC 47
    - ↳ note: A square wave sits at noon
  - **WAVE MIX** `10` % (0…100 %) · MIDI CC 48
    - ↳ note: The slider: triangle/sawtooth on the left against the pulse wave on the right
- **● OSC 2**
  - **OCTAVE** `16'`
  - **FREQUENCY** `3` st (-7…7 st)
  - **TRI/SAW** `90` % (0…100 %) · MIDI CC 51
  - **PULSE WIDTH** `50` % (0…100 %) · MIDI CC 52
  - **WAVE MIX** `10` % (0…100 %) · MIDI CC 53
  - **SYNC 2▸1** `OFF`
    - ↳ note: Locks oscillator 2 to the phase of oscillator 1
- **● FM**
  - **2▸1** `ON`
    - ↳ note: Oscillator 2 modulating the frequency of oscillator 1, at audio rate
  - **1▸2** `OFF`
  - **FM AMOUNT** `45` % (0…100 %) · MIDI CC 57
    - ↳ note: Sweeps between the two limits below rather than between zero and full
  - **2>1 FM MIN AMT** `0` % (0…100 %)
    - ↳ hint: Press MORE in that section
  - **2>1 FM MAX AMT** `100` % (0…100 %)
    - ↳ hint: Press MORE in that section
- **● MOD OSC**
  - **AUDIO** `ON`
    - ↳ note: Audio rate: a third oscillator, roughly 20 Hz to 3 kHz across the knob
  - **WAVEFORM** `SQUARE`
  - **FREQUENCY** `45` % (0…100 %) · MIDI CC 25
    - ↳ note: The range of this knob differs with the AUDIO button above
  - **PITCH AMOUNT** `0` % (0…100 %) · MIDI CC 31
  - **PITCH ▸ OSC 1** `OFF`
  - **PITCH ▸ OSC 2** `OFF`
  - **FILTER AMOUNT** `20` % (0…100 %) · MIDI CC 39
  - **FILTER ▸ 1** `ON`
  - **FILTER ▸ 2** `OFF`
- **● MIXER**
  - **OSC 1** `90` % (0…100 %) · MIDI CC 58
  - **RING MOD** `40` % (0…100 %) · MIDI CC 60
    - ↳ note: Sum and difference tones of the two oscillators — inharmonic as they detune
  - **OSC 2** `90` % (0…100 %) · MIDI CC 59
  - **MOD OSC** `20` % (0…100 %) · MIDI CC 61
  - **NOISE** `10` % (0…100 %) · MIDI CC 62
    - ↳ note: White noise
  - **OVERLOAD** `90` % (0…100 %)
  - **OVERLOAD RANGE** `HIGH`
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
  - **CUTOFF** `450` Hz (20…20000 Hz) · MIDI CC 67
  - **RESONANCE** `50` % (0…100 %) · MIDI CC 68
    - ↳ note: Self-oscillates into a sine fully clockwise
  - **ENVELOPE AMOUNT** `40` (-100…100) · MIDI CC 69
    - ↳ note: Bipolar, no modulation at noon
  - **KB TRACKING** `1:2`
- **● FILTER 2**
  - **CUTOFF** `500` Hz (20…20000 Hz) · MIDI CC 72
  - **RESONANCE** `35` % (0…100 %) · MIDI CC 73
  - **ENVELOPE AMOUNT** `10` (-100…100) · MIDI CC 75
    - ↳ note: Bipolar, no modulation at noon
  - **KB TRACKING** `1:2`
- **● FILTER ENV**
  - **ATTACK** `0` s (0…10 s) · MIDI CC 79
  - **DECAY** `0.5` s (0…10 s) · MIDI CC 80
  - **SUSTAIN** `15` % (0…100 %) · MIDI CC 81
  - **RELEASE** `0.4` s (0…10 s) · MIDI CC 82
  - **LOOP** `OFF`
    - ↳ note: Looping, the envelope runs like an LFO
- **● VCA ENV**
  - **ATTACK** `0` s (0…10 s) · MIDI CC 86
  - **DECAY** `0.7` s (0…10 s) · MIDI CC 87
  - **SUSTAIN** `80` % (0…100 %) · MIDI CC 88
  - **RELEASE** `0.5` s (0…10 s) · MIDI CC 89
  - **VELOCITY** `ON`
- **● VCA**
  - **LEVEL** `85` % (0…100 %) · MIDI CC 7
    - ↳ hint: Light TIMBRE A or B first
  - **PAN** `0` (0…100) · MIDI CC 10
    - ↳ note: Bipolar, centred at noon — the screen reads 100L through 0 to 100R
  - **PAN SPREAD** `0` % (0…100 %) · MIDI CC 9
    - ↳ note: All voices sit at the PAN position fully counter-clockwise
  - **PAN SPRD MODE** `L/R`
    - ↳ hint: Press MORE in that section
- **● DELAY**
  - **TIMBRE A / TIMBRE B** `OFF`
    - ↳ note: Two separate buttons, one per timbre — engage the one for the timbre this part is on. Disengaged, this part bypasses the delay on a fully analog path
- **● LFO 1**
  - **WAVEFORM** `RANDOM`
  - **RATE** `5.5` Hz (0.01…40 Hz)
    - ↳ note: The default range; RATE MIN and RATE MAX in the MORE menu can widen it to 1 kHz
  - **AMPLITUDE** `15` % (0…100 %) · MIDI CC 13
    - ↳ note: An attenuator ahead of every destination
  - **SYNC** `OFF`
    - ↳ note: Off, so RATE is the free-running Hz scale rather than tempo divisions
    - ↳ hint: Press MORE in that section
  - **LFO TYPE** `GLOBAL`
    - ↳ note: PER-VOICE gives eight separate LFOs, one per voice
    - ↳ hint: Press MORE in that section

## 7. Finishing

**Sidechain**

No box in this rig has a sidechain.

**Master FX**

The Muse carries DELAY · CHARACTER, DELAY · CLOCK SYNC, DELAY · FEEDBACK, DELAY · LINK DELAYS, DELAY · MIX, DELAY · SYNC TYPE, DELAY · TIMBRE A / TIMBRE B, DELAY · TIME - L and DELAY · TIME - R in its recipes; it is the only box here, so that is the whole master chain.

**Arrangement variations**

Sections that program identically, part for part — build one and copy it:

- **band 0** — Intro, Outro · 2 parts, 3 strikes
- **band 1** — Build, Breakdown · 2 parts, 7 strikes
- **band 3** — Drop, Peak · 2 parts, 16 strikes
