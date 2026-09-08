# Intellijel Cascadia: build a kit

8 drum sounds this box makes on its own, in the order to build them.

Record each hit with the sampler, recorder, or DAW you use.

*This block draws on the Intellijel Cascadia Manual v1.4, pp.22-58; its values are starting points.*

## 1. `KICK 1` — Sine kick: Envelope B dropped into VCO A pitch, filter bypassed to the amp

`kick` · `hard`

Routing — played from MIDI IN or EXT IN PITCH/GATE, or by holding the front panel MANUAL GATE button, which gates any envelope whose own GATE input is empty (p.54) — Cascadia has no sequencer of its own. Envelope B does the pitch drop, Envelope A the body

**Patch**

- `ENVELOPE B · ENV B` → `VCO A · FM 1`
  - ↳ note: FM 1 has no normal, so this cable is the whole pitch drop
- `VCF · LP4` → `VCA A · IN`
  - ↳ note: breaks the VCF OUT normal — LP4 is always live whatever MODE says (p.49)

**Settings**

- **VCO A · TZFM/EXP** `EXP`
- **VCO A · AC/DC** `DC`
- **VCO A · OCTAVE** `1` (0…7)
- **VCO A · PITCH** `0` st (-6…6 st)
- **VCO A · FM 1** `22` % travel (0…100 % travel)
  - ↳ note: how far the pitch falls
- **ENVELOPE B · MODE** `ENV`
- **ENVELOPE B · TYPE** `AD`
- **ENVELOPE B · RISE** `0` % travel (0…100 % travel)
- **ENVELOPE B · FALL** `12` % travel (0…100 % travel)
  - ↳ note: the drop; longer is a boomier kick
- **ENVELOPE A · SPEED** `FAST`
- **ENVELOPE A · HOLD POSITION** `X`
- **ENVELOPE A · ATTACK** `1` ms (0.2…1500 ms)
- **ENVELOPE A · DECAY** `190` ms (0.6…2500 ms)
- **ENVELOPE A · SUSTAIN** `0` V (0…5 V)
- **MIXER · SUB** `58` % travel (0…100 % travel)
- **MIXER · SUB TYPE** `SUB -1`
- **MIXER · SOFT CLIP** `ON`

Record one hit with your recorder as `KICK 1`.

## 2. `KICK 2` — Folded kick: the wave folder back into the mixer, soft clip engaged

`kick` · `dirty`

Routing — played from MIDI IN or EXT IN PITCH/GATE, or by holding the front panel MANUAL GATE button, which gates any envelope whose own GATE input is empty (p.54) — Cascadia has no sequencer of its own. The folder replaces the ring modulator on mixer channel 1

**Patch**

- `OUTPUT CONTROL · FOLD` → `MIXER · IN 1`
  - ↳ note: breaks the RING MOD normal on IN 1; FOLD is the folder’s only output (p.74)
- `ENVELOPE A · ENV A` → `WAVE FOLDER · FOLD`
  - ↳ note: FOLD MOD has no normal — the fold count now follows the amp envelope

**Settings**

- **VCO A · OCTAVE** `1` (0…7)
- **WAVE FOLDER · FOLD** `64` % travel (0…100 % travel)
  - ↳ note: more folds, more upper harmonics
- **WAVE FOLDER · MOD** `30` % travel (0…100 % travel)
- **MIXER · IN 1** `52` % travel (0…100 % travel)
- **MIXER · SUB** `66` % travel (0…100 % travel)
- **MIXER · SUB TYPE** `SUB -1`
- **MIXER · SOFT CLIP** `ON`
- **ENVELOPE A · SPEED** `FAST`
- **ENVELOPE A · ATTACK** `1` ms (0.2…1500 ms)
- **ENVELOPE A · DECAY** `210` ms (0.6…2500 ms)
- **ENVELOPE A · SUSTAIN** `0` V (0…5 V)
- **VCO A · PW** `62` % (50…95 %)

Record one hit with your recorder as `KICK 2`.

## 3. `TOM 1` — Tuned tom: sine with a short pitch fall, no sub under it

`tom` · `hard`

Routing — played from MIDI IN or EXT IN PITCH/GATE, or by holding the front panel MANUAL GATE button, which gates any envelope whose own GATE input is empty (p.54) — Cascadia has no sequencer of its own. Same pitch-drop idea as the kick, tuned up and shortened

**Patch**

- `ENVELOPE B · ENV B` → `VCO A · FM 1`
  - ↳ note: FM 1 has no normal; this is the fall

**Settings**

- **VCO A · TZFM/EXP** `EXP`
- **VCO A · AC/DC** `DC`
- **VCO A · OCTAVE** `3` (0…7)
- **VCO A · PITCH** `-2` st (-6…6 st)
- **VCO A · FM 1** `16` % travel (0…100 % travel)
- **MIXER · IN 2** `72` % travel (0…100 % travel)
  - ↳ note: IN 2 is VCO A’s sine by default (p.43)
- **MIXER · SUB** `0` % travel (0…100 % travel)
- **ENVELOPE B · MODE** `ENV`
- **ENVELOPE B · TYPE** `AD`
- **ENVELOPE B · FALL** `20` % travel (0…100 % travel)
- **ENVELOPE A · SPEED** `FAST`
- **ENVELOPE A · ATTACK** `1` ms (0.2…1500 ms)
- **ENVELOPE A · DECAY** `300` ms (0.6…2500 ms)
- **ENVELOPE A · SUSTAIN** `0` V (0…5 V)

Record one hit with your recorder as `TOM 1`.

## 4. `METALLIC 1` — Ring modulator fed a square, notched rather than filtered

`metallic` · `dark`

Routing — played from MIDI IN or EXT IN PITCH/GATE, or by holding the front panel MANUAL GATE button, which gates any envelope whose own GATE input is empty (p.54) — Cascadia has no sequencer of its own. RING MOD is already on mixer channel 1 (p.43); this changes what it eats

**Patch**

- `VCO B · SQUARE` → `RING MOD · IN 2`
  - ↳ note: breaks the VCO B sine normal — a square through the ring modulator is harsher

**Settings**

- **VCF · MODE** `NT2`
- **VCF · FREQ** `38` % travel (0…100 % travel)
- **VCF · Q** `54` % travel (0…100 % travel)
- **MIXER · IN 1** `82` % travel (0…100 % travel)
- **MIXER · IN 2** `0` % travel (0…100 % travel)
  - ↳ note: VCO A’s sine off, so only the ring output is heard
- **VCO B · OCTAVE** `4` (0…7)
- **VCO B · PITCH** `3` st (-6…6 st)
  - ↳ note: detune from VCO A is what makes it clang
- **VCO B · PITCH SOURCE** `PITCH B`
- **ENVELOPE A · SPEED** `FAST`
- **ENVELOPE A · ATTACK** `1` ms (0.2…1500 ms)
- **ENVELOPE A · DECAY** `320` ms (0.6…2500 ms)
- **ENVELOPE A · SUSTAIN** `0` V (0…5 V)

Record one hit with your recorder as `METALLIC 1`.

## 5. `METALLIC 2` — Hard-synced ring mod, high-passed to a strike

`metallic` · `hard`

Routing — played from MIDI IN or EXT IN PITCH/GATE, or by holding the front panel MANUAL GATE button, which gates any envelope whose own GATE input is empty (p.54) — Cascadia has no sequencer of its own. VCO A syncs to VCO B by default (p.25); this drives the sync harder

**Patch**

- `VCO B · SQUARE` → `VCO A · SYNC`
  - ↳ note: breaks the VCO B SAW normal — a square edge is a sharper sync trigger

**Settings**

- **VCO A · SYNC TYPE** `HARD`
- **VCF · MODE** `HP4`
- **VCF · FREQ** `54` % travel (0…100 % travel)
- **VCF · Q** `40` % travel (0…100 % travel)
- **MIXER · IN 1** `74` % travel (0…100 % travel)
- **VCO A · OCTAVE** `5` (0…7)
- **VCO B · OCTAVE** `3` (0…7)
- **VCO B · PITCH SOURCE** `PITCH B`
- **ENVELOPE A · SPEED** `FAST`
- **ENVELOPE A · ATTACK** `1` ms (0.2…1500 ms)
- **ENVELOPE A · DECAY** `160` ms (0.6…2500 ms)
- **ENVELOPE A · SUSTAIN** `0` V (0…5 V)

Record one hit with your recorder as `METALLIC 2`.

## 6. `NOISE 1` — Noise alone through the filter, cutoff sampled and held

`noise` · `dirty`

Routing — played from MIDI IN or EXT IN PITCH/GATE, or by holding the front panel MANUAL GATE button, which gates any envelope whose own GATE input is empty (p.54) — Cascadia has no sequencer of its own. S&H is clocked from MIDI CLK by default (p.56), so it moves in time

**Patch**

- `MIXER · NOISE` → `VCF · IN`
  - ↳ note: breaks the MIXER OUT normal — the oscillators drop out entirely
- `S&H · OUT` → `VCF · FM 3`
  - ↳ note: FM 3 has no normal; stepped voltages walk the cutoff

**Settings**

- **MIXER · NOISE TYPE** `ALT`
- **MIXER · ALT NOISE SOURCE** `Crunch`
  - ↳ note: not on the panel — hold MANUAL GATE and press MIDI CC to load it; a fresh source always comes up on the first of its three variations
- **MIXER · NOISE** `84` % travel (0…100 % travel)
- **VCF · MODE** `BP2`
- **VCF · FREQ** `48` % travel (0…100 % travel)
- **VCF · Q** `46` % travel (0…100 % travel)
- **VCF · FM 3** `62` % travel (0…100 % travel)
  - ↳ note: FM 3 is attenuverted, so this sets the step depth
- **ENVELOPE A · SPEED** `MED`
- **ENVELOPE A · ATTACK** `12` ms (2…10000 ms)
- **ENVELOPE A · DECAY** `600` ms (3.5…10000 ms)
- **ENVELOPE A · SUSTAIN** `3` V (0…5 V)

Record one hit with your recorder as `NOISE 1`.

## 7. `NOISE 2` — Pink noise slewed smooth, low-passed and sitting still

`noise` · `dark`

Routing — played from MIDI IN or EXT IN PITCH/GATE, or by holding the front panel MANUAL GATE button, which gates any envelope whose own GATE input is empty (p.54) — Cascadia has no sequencer of its own. Slew turns the stepped S&H into a drift (p.57)

**Patch**

- `MIXER · NOISE` → `VCF · IN`
  - ↳ note: breaks the MIXER OUT normal
- `SLEW / ENV FOLLOW · OUT` → `VCF · FM 3`
  - ↳ note: FM 3 has no normal; SLEW takes S&H by default (p.58), so this drifts

**Settings**

- **MIXER · NOISE TYPE** `PINK`
- **MIXER · NOISE** `70` % travel (0…100 % travel)
- **VCF · MODE** `LP2`
- **VCF · FREQ** `24` % travel (0…100 % travel)
- **VCF · Q** `18` % travel (0…100 % travel)
- **VCF · FM 3** `34` % travel (0…100 % travel)
- **SLEW / ENV FOLLOW · SHAPE** `EXP`
- **SLEW / ENV FOLLOW · RATE** `620` ms (0…1000 ms)
  - ↳ note: the cited maximum is the LIN figure; EXP runs to about five times it
- **ENVELOPE A · SPEED** `SLOW`
- **ENVELOPE A · ATTACK** `400` ms (9.3…60000 ms)
- **ENVELOPE A · DECAY** `2000` ms (30…60000 ms)
- **ENVELOPE A · SUSTAIN** `3` V (0…5 V)

Record one hit with your recorder as `NOISE 2`.

## 8. `IMPACT 1` — Burst of pulses into the amp, folded on the way

`impact` · `hard`

Routing — played from MIDI IN or EXT IN PITCH/GATE, or by holding the front panel MANUAL GATE button, which gates any envelope whose own GATE input is empty (p.54) — Cascadia has no sequencer of its own. Envelope B in BURST is a pulse train inside one envelope (p.35)

**Patch**

- `ENVELOPE B · ENV B` → `VCA A · LEVEL`
  - ↳ note: breaks the ENV A normal on LEVEL MOD — the burst becomes the amplitude
- `OUTPUT CONTROL · FOLD` → `MIXER · IN 1`
  - ↳ note: breaks the RING MOD normal on IN 1

**Settings**

- **ENVELOPE B · MODE** `BURST`
- **ENVELOPE B · TYPE** `AD`
- **ENVELOPE B · RATE** `70` % travel (0…100 % travel)
  - ↳ note: how fast the pulses repeat
- **ENVELOPE B · LENGTH** `34` % travel (0…100 % travel)
  - ↳ note: how long the burst lasts
- **WAVE FOLDER · FOLD** `72` % travel (0…100 % travel)
- **MIXER · IN 1** `66` % travel (0…100 % travel)
- **MIXER · SOFT CLIP** `ON`
- **VCF · MODE** `BP2`
- **VCF · FREQ** `44` % travel (0…100 % travel)
- **VCF · Q** `50` % travel (0…100 % travel)
- **VCO A · OCTAVE** `2` (0…7)
- **ENVELOPE A · SPEED** `FAST`
- **ENVELOPE A · ATTACK** `1` ms (0.2…1500 ms)
- **ENVELOPE A · DECAY** `700` ms (0.6…2500 ms)
- **ENVELOPE A · SUSTAIN** `0` V (0…5 V)

Record one hit with your recorder as `IMPACT 1`.

## Not in this kit

Bring snare, clap, rim, closed hat, open hat and ride from another box or a sample library.
