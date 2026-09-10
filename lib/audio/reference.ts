import type { Role } from '../core/vocabulary'
import { referenceSampleFor } from './catalogue'
import {
  decayPerSample,
  exp2,
  expNeg,
  fadeOut,
  highPass,
  lowPass,
  noiseSource,
  normalisePeak,
  sinTurns,
  sweptLowPass,
} from './dsp'
import { SAMPLE_RATE, writeWav } from './wav'

/**
 * §3.9/#519. **How the fourteen reference one-shots are made.**
 *
 * `catalogue.ts` says which fourteen and why those; this file is the synthesis and nothing else.
 * The two are separate because the catalogue is browser-safe data and this is not — a page that
 * only needs to know *whether a download exists* must not pull a filter bank into its bundle.
 *
 * ## Generated, and that is the licence
 *
 * Every byte comes out of this file. There is no sample pack behind it, nothing scraped, no vendor
 * audio anywhere near it — `manuals/` is gitignored precisely so nothing of that kind is ever
 * redistributed, and these files have no such problem to manage. *Generated here* is checkable
 * rather than asserted: run the generator and hash the output, which is what
 * `test/reference-samples.test.ts` does on every commit.
 *
 * The files are **not committed**. This repo has no binary story and #519's body says so; a
 * generator removes the need for one, because the bytes are a pure function of this file. The
 * download route runs this fourteen times during `next build` and Next stores the responses under
 * `.next/`, which is ignored, so a checkout still has no WAV in it. `npm run samples:wav` writes
 * them to an ignored directory for anybody who wants to listen, and is part of no build.
 *
 * ## What is the same across all fourteen
 *
 * Peak-normalised to the same level and faded to exact zero at the end. A reader auditioning the
 * set in a row is then comparing timbre rather than gain staging, and no file clicks when a pad
 * retriggers it. `ghost-perc` is the one where that reads oddly — a ghost note is a quiet note —
 * and it is still normalised, because level is the reader's to set and a file delivered quiet is a
 * file somebody has to fix before it is useful.
 */

/**
 * Everything here lands on the same peak. `0.891` is -1.0 dBFS, which leaves a sample's own
 * gain staging somewhere to go and keeps a converter out of the last dB on the way back in.
 */
const TARGET_PEAK = 0.891

/** The fade that guarantees a last sample of exactly zero. Short enough to shorten nothing. */
const TAIL_FADE_SECONDS = 0.005

/**
 * A per-role noise seed.
 *
 * Fixed, distinct, and arbitrary: what matters is that two roles built from the same noise recipe
 * do not come out of the same sequence, so a hat and a shaker are not the same burst filtered
 * twice. Same seed every run, so the bytes are the same every run (invariant 6).
 *
 * **The two hats are the deliberate exception and are not in here**: they share `HAT_SEED`, so the
 * only thing separating them is the envelope. See `hatSource`.
 */
const SEEDS: Readonly<Record<string, number>> = {
  kick: 0x1a2b3c4d,
  snare: 0x2b3c4d5e,
  clap: 0x3c4d5e6f,
  rim: 0x4d5e6f71,
  tom: 0x5e6f7182,
  ride: 0x8293a4b5,
  metallic: 0x93a4b5c6,
  'ghost-perc': 0xa4b5c6d7,
  noise: 0xb5c6d7e8,
  impact: 0xc6d7e8f9,
  riser: 0xd7e8f901,
  sweep: 0xe8f90112,
}

// ---------------------------------------------------------------------------
// Small shared shapes
// ---------------------------------------------------------------------------

/** A buffer of `seconds`, at the one rate. */
function buffer(seconds: number): Float64Array {
  return new Float64Array(Math.round(seconds * SAMPLE_RATE))
}

/**
 * The attack every one-shot starts with, as a gain in `[0, 1]` at sample `i`.
 *
 * A percussive sound wants no attack at all, and a buffer whose first sample is not zero clicks.
 * A ramp of a millisecond or two is inaudible as a softening and audible as the absence of a
 * click, which is the whole of what it is for.
 */
function attack(i: number, seconds: number): number {
  const n = seconds * SAMPLE_RATE
  return i >= n ? 1 : i / n
}

/**
 * A sum of inharmonic partials, evaluated at one instant.
 *
 * What makes a cymbal or a bell metallic rather than pitched: the ratios are not whole numbers, so
 * nothing in the sum reinforces a fundamental and the ear hears a clang instead of a note. The
 * phases advance in turns, so `phases` is the accumulator and this mutates it.
 */
function partialSum(
  phases: Float64Array,
  ratios: readonly number[],
  fundamental: number,
  rate: number,
): number {
  let out = 0
  for (let p = 0; p < ratios.length; p += 1) {
    const next = (phases[p] as number) + ((ratios[p] as number) * fundamental) / rate
    phases[p] = next - Math.floor(next)
    out += sinTurns(phases[p] as number)
  }
  return out / ratios.length
}

// ---------------------------------------------------------------------------
// The fourteen
// ---------------------------------------------------------------------------

/**
 * **Kick.** A sine whose pitch falls from 145 Hz to 48 Hz in about thirty milliseconds, with a
 * two-millisecond noise tick on top of the front.
 *
 * The pitch drop is the whole sound. A steady 48 Hz sine is a test tone; the fall is what the ear
 * reads as a beater hitting a head, and how fast it falls is the difference between a kick and a
 * tom. The tick is what survives a small speaker, where none of the fundamental does.
 */
function kick(): Float64Array {
  const out = buffer(0.6)
  const rate = SAMPLE_RATE
  const noise = noiseSource(SEEDS['kick'] as number)
  const tick = highPass(rate, 1800)
  const amp = decayPerSample(0.45, rate)
  let gain = 1
  let phase = 0

  for (let i = 0; i < out.length; i += 1) {
    const t = i / rate
    const hz = 48 + 97 * expNeg(t / 0.03)
    phase += hz / rate
    phase -= Math.floor(phase)
    const body = sinTurns(phase) * gain
    const click = tick(noise()) * expNeg(t / 0.002) * 0.35
    out[i] = (body + click) * attack(i, 0.0008)
    gain *= amp
  }

  normalisePeak(out, TARGET_PEAK)
  fadeOut(out, TAIL_FADE_SECONDS, rate)
  return out
}

/**
 * **Snare.** Two body tones at 185 Hz and 330 Hz under a band of noise from 1.2 kHz up.
 *
 * The two tones are the drum and the noise is the snare wires, and they decay at different rates
 * because they do on a real one: the shell rings for about a tenth of a second and the wires
 * carry on rattling for twice that.
 */
function snare(): Float64Array {
  const out = buffer(0.35)
  const rate = SAMPLE_RATE
  const noise = noiseSource(SEEDS['snare'] as number)
  const wires = highPass(rate, 1200)
  // Two poles down from 8.5 kHz. Without a top the noise stays flat to Nyquist and the drum reads
  // as a burst of white rather than as wires: measured, it moves the centroid from 11 kHz to 6.
  const air1 = lowPass(rate, 8500)
  const air2 = lowPass(rate, 8500)
  let low = 0
  let high = 0

  for (let i = 0; i < out.length; i += 1) {
    const t = i / rate
    low += 185 / rate
    low -= Math.floor(low)
    high += 330 / rate
    high -= Math.floor(high)
    const body = (sinTurns(low) + sinTurns(high) * 0.7) * expNeg(t / 0.12) * 0.55
    const rattle = air2(air1(wires(noise()))) * expNeg(t / 0.25) * 0.85
    out[i] = (body + rattle) * attack(i, 0.0005)
  }

  normalisePeak(out, TARGET_PEAK)
  fadeOut(out, TAIL_FADE_SECONDS, rate)
  return out
}

/**
 * **Clap.** Three short bursts eleven milliseconds apart, then a longer tail.
 *
 * A clap is several hands not quite together, and that is not a texture you can filter your way to
 * — it is the spacing. Three bursts and a tail is the arrangement every drum machine uses, and it
 * is why a clap reads as wider than a snare made of the same noise.
 */
function clap(): Float64Array {
  const out = buffer(0.45)
  const rate = SAMPLE_RATE
  const noise = noiseSource(SEEDS['clap'] as number)
  const top = highPass(rate, 800)
  // Two poles at 3.5 kHz. A clap is hands, and hands have no top: one pole left it at 9 kHz,
  // which is a hiss with a rhythm in it.
  const body1 = lowPass(rate, 3500)
  const body2 = lowPass(rate, 3500)
  const bursts = [0, 0.011, 0.022]

  for (let i = 0; i < out.length; i += 1) {
    const t = i / rate
    let env = 0
    for (const at of bursts) {
      if (t >= at) env += expNeg((t - at) / 0.008)
    }
    // The tail starts where the third burst does and is what gives a clap its room.
    if (t >= 0.034) env += expNeg((t - 0.034) / 0.28) * 0.55
    out[i] = body2(body1(top(noise()))) * env * attack(i, 0.0004)
  }

  normalisePeak(out, TARGET_PEAK)
  fadeOut(out, TAIL_FADE_SECONDS, rate)
  return out
}

/**
 * **Rim.** A hundred and twenty milliseconds, and most of it is over in thirty.
 *
 * Two bright tones at 1.7 kHz and 2.4 kHz with a scrape of high noise across the front. The
 * shortness is the identity: a rim shot that rings is a woodblock.
 */
function rim(): Float64Array {
  const out = buffer(0.12)
  const rate = SAMPLE_RATE
  const noise = noiseSource(SEEDS['rim'] as number)
  const scrape = highPass(rate, 3000)
  let a = 0
  let b = 0

  for (let i = 0; i < out.length; i += 1) {
    const t = i / rate
    a += 1700 / rate
    a -= Math.floor(a)
    b += 2400 / rate
    b -= Math.floor(b)
    const tone = (sinTurns(a) + sinTurns(b) * 0.8) * expNeg(t / 0.03)
    const edge = scrape(noise()) * expNeg(t / 0.012) * 0.6
    out[i] = (tone + edge) * attack(i, 0.0003)
  }

  normalisePeak(out, TARGET_PEAK)
  fadeOut(out, TAIL_FADE_SECONDS, rate)
  return out
}

/**
 * **Tom.** The kick's shape, slowed down and moved up.
 *
 * 210 Hz falling to 110 Hz over about a tenth of a second, which is four times the kick's fall and
 * is what stops it reading as one. The skin noise on the front is quieter than the kick's tick,
 * because a tom is struck with a stick on a head rather than a beater on a port.
 */
function tom(): Float64Array {
  const out = buffer(0.5)
  const rate = SAMPLE_RATE
  const noise = noiseSource(SEEDS['tom'] as number)
  const skin = highPass(rate, 900)
  let phase = 0

  for (let i = 0; i < out.length; i += 1) {
    const t = i / rate
    const hz = 110 + 100 * expNeg(t / 0.12)
    phase += hz / rate
    phase -= Math.floor(phase)
    const body = sinTurns(phase) * expNeg(t / 0.4)
    const stick = skin(noise()) * expNeg(t / 0.004) * 0.22
    out[i] = (body + stick) * attack(i, 0.0006)
  }

  normalisePeak(out, TARGET_PEAK)
  fadeOut(out, TAIL_FADE_SECONDS, rate)
  return out
}

/**
 * The source both hats are cut from: noise from 7 kHz up through two poles, with a thin cluster of
 * inharmonic partials sitting in it.
 *
 * A hat is a stack of thin metal discs, and pure filtered noise is the part of that a filter can
 * do. The partials are the rest: they are what makes a hi-hat sound like metal rather than like
 * air.
 *
 * **Both hats take the same seed, so the two files are the same sound under two envelopes.** Two
 * seeds would have been two different bursts of noise that measured alike, and *differ only in how
 * long it lasts* would then have been a claim about a spectrum rather than about the files. It is
 * one closed hat and the same hat with the pedal up, which is what the pair is for.
 */
const HAT_SEED = 0x6f718293

function hatSource(rate: number): () => number {
  const noise = noiseSource(HAT_SEED)
  const hp1 = highPass(rate, 7000)
  const hp2 = highPass(rate, 7000)
  const phases = new Float64Array(6)
  const ratios = [1, 1.34, 1.79, 2.37, 3.11, 4.02]

  return () => hp2(hp1(noise())) + partialSum(phases, ratios, 3150, rate) * 0.35
}

/** **Closed hat.** The source, cut off in sixty milliseconds. The pedal is down. */
function closedHat(): Float64Array {
  const out = buffer(0.18)
  const rate = SAMPLE_RATE
  const source = hatSource(rate)

  for (let i = 0; i < out.length; i += 1) {
    const t = i / rate
    out[i] = source() * expNeg(t / 0.06) * attack(i, 0.0003)
  }

  normalisePeak(out, TARGET_PEAK)
  fadeOut(out, TAIL_FADE_SECONDS, rate)
  return out
}

/**
 * **Open hat.** The same source over seven times the decay, with a slower second stage under it.
 *
 * Two decays rather than one because an open hat does not fade evenly: the first rush of air goes
 * quickly and the discs carry on ringing behind it.
 */
function openHat(): Float64Array {
  const out = buffer(0.7)
  const rate = SAMPLE_RATE
  const source = hatSource(rate)

  for (let i = 0; i < out.length; i += 1) {
    const t = i / rate
    const env = expNeg(t / 0.09) * 0.6 + expNeg(t / 0.45) * 0.75
    out[i] = source() * env * attack(i, 0.0003)
  }

  normalisePeak(out, TARGET_PEAK)
  fadeOut(out, TAIL_FADE_SECONDS, rate)
  return out
}

/**
 * **Ride.** A ping on the front and a wash behind it that takes a second and a half to go.
 *
 * Eight partials off a 480 Hz fundamental, none of them a whole-number multiple, plus a band of
 * high noise that decays more slowly than any of them. The ping is a short bright burst on the
 * first fifteen milliseconds: a ride you strike on the bow has an attack, and without one this is
 * a cymbal swell.
 */
function ride(): Float64Array {
  const out = buffer(1.6)
  const rate = SAMPLE_RATE
  const noise = noiseSource(SEEDS['ride'] as number)
  const wash = highPass(rate, 5000)
  const phases = new Float64Array(8)
  const ratios = [1, 1.41, 1.87, 2.34, 2.98, 3.63, 4.51, 5.42]

  for (let i = 0; i < out.length; i += 1) {
    const t = i / rate
    const metal = partialSum(phases, ratios, 480, rate) * (expNeg(t / 0.9) * 0.8 + 0.05)
    const air = wash(noise()) * expNeg(t / 1.1) * 0.5
    const ping = wash(noise()) * expNeg(t / 0.015) * 0.7
    out[i] = (metal + air + ping) * attack(i, 0.0004)
  }

  normalisePeak(out, TARGET_PEAK)
  fadeOut(out, TAIL_FADE_SECONDS, rate)
  return out
}

/**
 * **Metallic.** A struck bar rather than a struck cymbal, and the difference is that it has no
 * noise in it at all.
 *
 * Six partials off 320 Hz, spread further apart than the ride's and decaying at different rates —
 * the high ones first, which is what every real piece of struck metal does and what makes the
 * sound dull as it falls rather than simply get quieter. Its pitch drifts down a fraction over the
 * length, so it reads as a physical thing losing energy.
 */
function metallic(): Float64Array {
  const out = buffer(0.8)
  const rate = SAMPLE_RATE
  const phases = new Float64Array(6)
  const ratios = [1, 1.73, 2.61, 3.86, 5.19, 7.04]

  for (let i = 0; i < out.length; i += 1) {
    const t = i / rate
    const fundamental = 320 * (1 - 0.02 * (1 - expNeg(t / 0.3)))
    let sum = 0
    for (let p = 0; p < ratios.length; p += 1) {
      const next = (phases[p] as number) + ((ratios[p] as number) * fundamental) / rate
      phases[p] = next - Math.floor(next)
      // The higher the partial, the faster it goes. 0.42 s at the bottom, 0.12 s at the top.
      const life = 0.42 / (1 + p * 0.55)
      sum += sinTurns(phases[p] as number) * expNeg(t / life)
    }
    out[i] = (sum / ratios.length) * attack(i, 0.0004)
  }

  normalisePeak(out, TARGET_PEAK)
  fadeOut(out, TAIL_FADE_SECONDS, rate)
  return out
}

/**
 * **Ghost perc.** A hundred and fifty milliseconds of band-limited noise with a softened front.
 *
 * A ghost note is a hit that is felt rather than heard, and what makes one is that it is short and
 * has no top on it: 400 Hz to 2 kHz, three milliseconds of attack, gone in fifty. It is
 * normalised like everything else here — quietness is placement, and it is the reader's fader
 * rather than this file's.
 */
function ghostPerc(): Float64Array {
  const out = buffer(0.15)
  const rate = SAMPLE_RATE
  const noise = noiseSource(SEEDS['ghost-perc'] as number)
  const top = highPass(rate, 400)
  // Three poles at 2 kHz. Two at 2.5 measured a centroid of 4.8 kHz, which is not a sound with no
  // top on it, and the description is the thing that has to be true.
  const lp1 = lowPass(rate, 2000)
  const lp2 = lowPass(rate, 2000)
  const lp3 = lowPass(rate, 2000)

  for (let i = 0; i < out.length; i += 1) {
    const t = i / rate
    out[i] = lp3(lp2(lp1(top(noise())))) * expNeg(t / 0.05) * attack(i, 0.003)
  }

  normalisePeak(out, TARGET_PEAK)
  fadeOut(out, TAIL_FADE_SECONDS, rate)
  return out
}

/**
 * **Noise.** The plain one: a full-band burst, shaped and gone in six-tenths of a second.
 *
 * Everything above 30 Hz to take the rumble and any offset out, and a gentle pole at 12 kHz to
 * tilt the hiss off the top rather than cut it. This is the file a recipe means when it asks for noise and nothing more,
 * so it deliberately has no character: anything shaped into it here would turn up in every recipe
 * that reached for it.
 */
function noiseBurst(): Float64Array {
  const out = buffer(0.8)
  const rate = SAMPLE_RATE
  const noise = noiseSource(SEEDS['noise'] as number)
  const dc = highPass(rate, 30)
  const top = lowPass(rate, 12000)

  for (let i = 0; i < out.length; i += 1) {
    const t = i / rate
    out[i] = top(dc(noise())) * expNeg(t / 0.6) * attack(i, 0.001)
  }

  normalisePeak(out, TARGET_PEAK)
  fadeOut(out, TAIL_FADE_SECONDS, rate)
  return out
}

/**
 * **Impact.** A low tone falling from 55 Hz to 38 Hz under a filtered boom, with a bright crack on
 * the front.
 *
 * A second and a half, which is long for a one-shot and is the point: an impact is a transition
 * that has to carry a bar on its own. Almost all of the energy is under 200 Hz, so the crack is
 * doing the work of telling a small speaker that anything happened.
 */
function impact(): Float64Array {
  const out = buffer(1.4)
  const rate = SAMPLE_RATE
  const noise = noiseSource(SEEDS['impact'] as number)
  const boom = lowPass(rate, 220)
  const crack = highPass(rate, 2500)
  let phase = 0

  for (let i = 0; i < out.length; i += 1) {
    const t = i / rate
    const hz = 38 + 17 * expNeg(t / 0.25)
    phase += hz / rate
    phase -= Math.floor(phase)
    const low = sinTurns(phase) * expNeg(t / 1.1)
    const rumble = boom(noise()) * expNeg(t / 0.9) * 0.8
    const snap = crack(noise()) * expNeg(t / 0.01) * 0.3
    out[i] = (low + rumble + snap) * attack(i, 0.001)
  }

  normalisePeak(out, TARGET_PEAK)
  fadeOut(out, TAIL_FADE_SECONDS, rate)
  return out
}

/**
 * **Riser.** Two seconds of noise climbing from 300 Hz to 9 kHz, getting louder as it goes.
 *
 * Both halves are needed and neither is enough. A filter opening at a steady level reads as a
 * sound being uncovered; a level rising under a fixed filter reads as somebody turning it up. The
 * two together are the only thing that reads as *something arriving*. The cutoff climbs
 * exponentially rather than in a straight line, because pitch is heard that way and a linear sweep
 * spends its first second doing nothing audible.
 *
 * It ends at its loudest and then stops, which is what a riser does — it hands over to whatever
 * lands on the next downbeat.
 */
function riser(): Float64Array {
  const out = buffer(2.0)
  const rate = SAMPLE_RATE
  const noise = noiseSource(SEEDS['riser'] as number)
  const lp1 = sweptLowPass(rate)
  const lp2 = sweptLowPass(rate)
  const dc = highPass(rate, 40)
  let phase = 0

  for (let i = 0; i < out.length; i += 1) {
    const p = i / out.length
    // 300 Hz to 9 kHz, five octaves, spread evenly in octaves rather than in hertz.
    const cutoff = 300 * exp2(p * 5)
    const air = lp2(lp1(dc(noise()), cutoff), cutoff)
    const hz = 200 * exp2(p * 2.8)
    phase += hz / rate
    phase -= Math.floor(phase)
    const tone = sinTurns(phase) * 0.35
    out[i] = (air + tone) * p * p
  }

  normalisePeak(out, TARGET_PEAK)
  fadeOut(out, TAIL_FADE_SECONDS, rate)
  return out
}

/**
 * **Sweep.** The riser in reverse, and it is a different job rather than the same file backwards.
 *
 * Nine kilohertz down to 200 Hz over a second and a half, with the level falling behind it. A
 * riser points at a downbeat; a sweep is what happens after one — a crash decaying into a filter
 * closing, which is how a section is got rid of rather than announced.
 */
function sweep(): Float64Array {
  const out = buffer(1.5)
  const rate = SAMPLE_RATE
  const noise = noiseSource(SEEDS['sweep'] as number)
  const lp1 = sweptLowPass(rate)
  const lp2 = sweptLowPass(rate)
  const dc = highPass(rate, 40)

  for (let i = 0; i < out.length; i += 1) {
    const t = i / rate
    const p = i / out.length
    const cutoff = 9000 * exp2(-p * 5.5)
    out[i] = lp2(lp1(dc(noise()), cutoff), cutoff) * expNeg(t / 0.8) * attack(i, 0.002)
  }

  normalisePeak(out, TARGET_PEAK)
  fadeOut(out, TAIL_FADE_SECONDS, rate)
  return out
}

// ---------------------------------------------------------------------------
// The registry
// ---------------------------------------------------------------------------

/** Role to synthesis. The one place the fourteen are listed, in the order a kit is laid down. */
const RECIPES: Readonly<Record<string, () => Float64Array>> = {
  kick,
  snare,
  clap,
  rim,
  tom,
  'closed-hat': closedHat,
  'open-hat': openHat,
  ride,
  metallic,
  'ghost-perc': ghostPerc,
  noise: noiseBurst,
  impact,
  riser,
  sweep,
}

/**
 * The float samples for one role, or `undefined` where none is offered.
 *
 * **The catalogue decides, and this map has to agree with it.** A role reaches synthesis only when
 * `catalogue.ts` offers it *and* a recipe exists here, so a recipe added without a catalogue entry
 * is unreachable rather than half-offered, and a catalogue entry with no recipe answers
 * `undefined` rather than throwing at a reader. `test/reference-samples.test.ts` asserts the two
 * lists are equal, which is where a drift is supposed to be caught.
 */
export function renderReference(role: Role): Float64Array | undefined {
  if (referenceSampleFor(role) === undefined) return undefined
  const recipe = RECIPES[role]
  return recipe === undefined ? undefined : recipe()
}

/** The bytes of the `.wav` for one role, or `undefined` where none is offered. */
export function referenceWav(role: Role): Uint8Array | undefined {
  const samples = renderReference(role)
  return samples === undefined ? undefined : writeWav(samples)
}
