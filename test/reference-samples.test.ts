import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  cosTurns,
  exp2,
  expNeg,
  noiseSource,
  normalisePeak,
  sinTurns,
} from '../lib/audio/dsp'
import { REFERENCE_SAMPLES, referenceWav, renderReference } from '../lib/audio/index'
import { ROLES } from '../lib/core/vocabulary'
import type { Role } from '../lib/core/vocabulary'
import { DEVICES } from '../lib/devices/registry.generated'

/**
 * §3.9/#519. **The fourteen reference one-shots: their bytes, their container, and the claims
 * their own documentation makes about them.**
 *
 * Nobody working on this can listen to them. That is the whole reason this file is as long as it
 * is: a hash proves a file has not changed and says nothing at all about whether a kick sounds
 * like a kick, so every sentence in `reference.ts` that describes a sound is measured here
 * instead. A kick is asserted to be low, a hat to be high, a riser to open and a sweep to close;
 * `npm run samples:wav` is how somebody with ears settles the rest.
 *
 * Four groups, and they fail for different reasons:
 *
 *  - **The hashes** move when the generator moves. That is a golden and it should be visible.
 *  - **The container** is parsed here by hand rather than through `writeWav`'s own reader, because
 *    a writer verified by its inverse agrees with itself about a format it has got wrong.
 *  - **The envelopes and spectra** are the part a hash cannot see.
 *  - **The arithmetic** is `dsp.ts`'s claim that it needs no platform maths library, and the two
 *    error figures written in its comments.
 */

// ---------------------------------------------------------------------------
// A small independent reader, and a small FFT
// ---------------------------------------------------------------------------

/** What a RIFF/WAVE header says, read out of the bytes without asking `wav.ts` anything. */
type WavHeader = {
  riff: string
  waveId: string
  fmtId: string
  fmtSize: number
  format: number
  channels: number
  rate: number
  byteRate: number
  blockAlign: number
  bits: number
  dataId: string
  dataBytes: number
  declaredRiffSize: number
}

function ascii(bytes: Uint8Array, at: number, length: number): string {
  let s = ''
  for (let i = 0; i < length; i += 1) s += String.fromCharCode(bytes[at + i] as number)
  return s
}

function header(bytes: Uint8Array): WavHeader {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return {
    riff: ascii(bytes, 0, 4),
    declaredRiffSize: v.getUint32(4, true),
    waveId: ascii(bytes, 8, 4),
    fmtId: ascii(bytes, 12, 4),
    fmtSize: v.getUint32(16, true),
    format: v.getUint16(20, true),
    channels: v.getUint16(22, true),
    rate: v.getUint32(24, true),
    byteRate: v.getUint32(28, true),
    blockAlign: v.getUint16(32, true),
    bits: v.getUint16(34, true),
    dataId: ascii(bytes, 36, 4),
    dataBytes: v.getUint32(40, true),
  }
}

/** The 16-bit samples out of a `.wav`, as integers. */
function pcm(bytes: Uint8Array): Int16Array {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const n = v.getUint32(40, true) / 2
  const out = new Int16Array(n)
  for (let i = 0; i < n; i += 1) out[i] = v.getInt16(44 + i * 2, true)
  return out
}

/**
 * An iterative radix-2 FFT, in place.
 *
 * Written out here rather than reached for, because the repo has no audio dependency and this test
 * is not the place to introduce the first one. It uses `Math.cos`/`Math.sin` freely: nothing here
 * is hashed, so the determinism argument `dsp.ts` makes does not apply to a measurement.
 */
function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1
    for (; (j & bit) !== 0; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      const tr = re[i] as number
      re[i] = re[j] as number
      re[j] = tr
      const ti = im[i] as number
      im[i] = im[j] as number
      im[j] = ti
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < len / 2; k += 1) {
        const wr = Math.cos(ang * k)
        const wi = Math.sin(ang * k)
        const ur = re[i + k] as number
        const ui = im[i + k] as number
        const xr = re[i + k + len / 2] as number
        const xi = im[i + k + len / 2] as number
        const vr = xr * wr - xi * wi
        const vi = xr * wi + xi * wr
        re[i + k] = ur + vr
        im[i + k] = ui + vi
        re[i + k + len / 2] = ur - vr
        im[i + k + len / 2] = ui - vi
      }
    }
  }
}

const FRAME = 2048

/**
 * The average magnitude spectrum over `[from, to)`, in contiguous half-overlapping frames.
 *
 * Contiguous matters more than it looks. Sampling every nth value to fit a long file into one
 * frame is decimation without a filter, which aliases the top of the band down over the bottom of
 * it and reports a closed hat and a kick as much the same sound. The first cut of this test did
 * exactly that.
 */
function spectrum(samples: Float64Array, from: number, to: number): Float64Array {
  const acc = new Float64Array(FRAME / 2)
  let frames = 0
  for (let start = from; start + FRAME <= to; start += FRAME / 2) {
    const re = new Float64Array(FRAME)
    const im = new Float64Array(FRAME)
    for (let i = 0; i < FRAME; i += 1) {
      const hann = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / FRAME)
      re[i] = (samples[start + i] as number) * hann
    }
    fft(re, im)
    for (let k = 0; k < FRAME / 2; k += 1) {
      acc[k] = (acc[k] as number) + Math.hypot(re[k] as number, im[k] as number)
    }
    frames += 1
  }
  expect(frames, 'a window too short for one frame').toBeGreaterThan(0)
  for (let k = 0; k < FRAME / 2; k += 1) acc[k] = (acc[k] as number) / frames
  return acc
}

/** The magnitude-weighted mean frequency: one number for *how bright is this*. */
function centroid(spec: Float64Array): number {
  let num = 0
  let den = 0
  for (let k = 1; k < spec.length; k += 1) {
    num += (spec[k] as number) * ((k * 44100) / FRAME)
    den += spec[k] as number
  }
  return den === 0 ? 0 : num / den
}

/** The share of the total energy sitting between two frequencies. */
function bandShare(spec: Float64Array, lo: number, hi: number): number {
  let inside = 0
  let total = 0
  for (let k = 1; k < spec.length; k += 1) {
    const power = (spec[k] as number) * (spec[k] as number)
    const hz = (k * 44100) / FRAME
    total += power
    if (hz >= lo && hz < hi) inside += power
  }
  return total === 0 ? 0 : inside / total
}

function rms(samples: Float64Array, from: number, to: number): number {
  let total = 0
  for (let i = from; i < to; i += 1) total += (samples[i] as number) * (samples[i] as number)
  return Math.sqrt(total / (to - from))
}

function peakIndex(samples: Float64Array): number {
  let peak = -1
  let at = 0
  for (let i = 0; i < samples.length; i += 1) {
    const v = samples[i] as number
    const a = v < 0 ? -v : v
    if (a > peak) {
      peak = a
      at = i
    }
  }
  return at
}

/** Every role, rendered once. Fourteen renders is cheap; fourteen per assertion is not. */
const RENDERED: ReadonlyMap<Role, Float64Array> = new Map(
  REFERENCE_SAMPLES.map((s) => [s.role, renderReference(s.role) as Float64Array]),
)

function floats(role: Role): Float64Array {
  const s = RENDERED.get(role)
  if (s === undefined) throw new Error(`${role} is not a reference sample`)
  return s
}

function spectrumOf(role: Role): Float64Array {
  const s = floats(role)
  return spectrum(s, 0, s.length)
}

// ---------------------------------------------------------------------------
// The bytes
// ---------------------------------------------------------------------------

/**
 * **The golden.** `sha256` of the whole file, header included.
 *
 * A change here is a change to what somebody downloads, and it should never be a surprise. Regenerate
 * deliberately — `npm run samples:wav` and re-hash — and say in the commit which sound moved and why.
 */
const HASHES: ReadonlyArray<readonly [Role, string]> = [
  ['kick', '45bc3029c32ed9e5ffe567600a2a11e9aa09b31503c4095caabcf489100226bd'],
  ['snare', 'f34f25e501933d86c1fe654ff60d563c93b6ca7d10e8c1b1d9eb7109358862d5'],
  ['clap', '72d35b26c84c5d07ca84e178f249fe6e77652a7180db827509748e9ff42204d9'],
  ['rim', '334eae2f9eabb2889246bbe70a29da356967014f88b7046c034e9045c183403e'],
  ['tom', '0fb01abc6e46776352f0b9507601702feb294503e70f987a58a5675ed6a035c9'],
  ['closed-hat', '7b2cbb6f71566f39f0d2a1d78da3eb8e357b30cb40a57b6ac02f2c064c211f29'],
  ['open-hat', '84e5a93165f8dcb36a7bc45606f31f79c7a086047aab073ee2d466a7d83f9c3a'],
  ['ride', 'c079a6a4cf75ed831fddb39e00e1561b0a27691dc0a3acd38834b589fe1ac17a'],
  ['metallic', 'f08a5049dfc7f1a4bafed22530b111a9a8103f2bf1b177e1b67a23fe0faec385'],
  ['ghost-perc', 'ac9067eaf257608a561042ead2a2e4b290b82dce1b19e21c7901fad83bc9f2f9'],
  ['noise', '26a53583ab52a3b94e8f96a2fac094fcf35dad8bde3c84652d3cd15e935dd8bc'],
  ['impact', '2502d26f30f35f31a5dea6fb023593b4344da4ac84b8ceebb4adcd1434afc81a'],
  ['riser', 'bd2854006dd1efae42073816df6e89df6fb6642a1a201bfa54a549556cc3a0ca'],
  ['sweep', '0ead0c6b373be47930a11c681a8f08566436a74eda45b3d5a64b7afa9317797c'],
]

describe('reference samples: the bytes', () => {
  it('pins every file', () => {
    const got = REFERENCE_SAMPLES.map((s) => {
      const bytes = referenceWav(s.role) as Uint8Array
      return [s.role, createHash('sha256').update(bytes).digest('hex')] as const
    })
    expect(got).toEqual(HASHES)
  })

  it('renders the same bytes twice in one process', () => {
    for (const s of REFERENCE_SAMPLES) {
      const a = referenceWav(s.role) as Uint8Array
      const b = referenceWav(s.role) as Uint8Array
      expect(Array.from(a)).toEqual(Array.from(b))
    }
  })

  /**
   * The generator holds no state between roles, so the order they are asked for cannot matter.
   * It would matter the moment a noise source were shared, which is the mistake this catches.
   */
  it('renders the same bytes in reverse order', () => {
    const forward = REFERENCE_SAMPLES.map((s) => createHash('sha256').update(referenceWav(s.role) as Uint8Array).digest('hex'))
    const backward = [...REFERENCE_SAMPLES].reverse().map((s) => createHash('sha256').update(referenceWav(s.role) as Uint8Array).digest('hex'))
    expect(backward.reverse()).toEqual(forward)
  })
})

// ---------------------------------------------------------------------------
// The container
// ---------------------------------------------------------------------------

describe('reference samples: the WAV container', () => {
  it('writes a canonical mono 44.1 kHz 16-bit PCM header', () => {
    for (const s of REFERENCE_SAMPLES) {
      const bytes = referenceWav(s.role) as Uint8Array
      const h = header(bytes)
      expect(h, s.role).toMatchObject({
        riff: 'RIFF',
        waveId: 'WAVE',
        fmtId: 'fmt ',
        fmtSize: 16,
        format: 1,
        channels: 1,
        rate: 44100,
        byteRate: 88200,
        blockAlign: 2,
        bits: 16,
        dataId: 'data',
      })
    }
  })

  it('declares chunk sizes that match the file it wrote', () => {
    for (const s of REFERENCE_SAMPLES) {
      const bytes = referenceWav(s.role) as Uint8Array
      const h = header(bytes)
      // A reader that trusts `data` and a reader that trusts `RIFF` must land in the same place.
      expect(h.dataBytes, s.role).toBe(bytes.length - 44)
      expect(h.declaredRiffSize, s.role).toBe(bytes.length - 8)
      expect(h.dataBytes % h.blockAlign, s.role).toBe(0)
    }
  })

  it('is the declared length, and within both devices constraints', () => {
    for (const s of REFERENCE_SAMPLES) {
      const bytes = referenceWav(s.role) as Uint8Array
      const seconds = pcm(bytes).length / 44100
      expect(seconds, s.role).toBeCloseTo(s.seconds, 6)
      // #507: the Deluge's wavetable engine wants a wavetable over 20 ms. #517: the SP-404 caps a
      // pad at ten seconds. Checked rather than assumed to be clear of both. Neither is a floor on
      // how short a file may be, and five of these are under half a second.
      expect(seconds, `${s.role} is under the Deluge's 20 ms floor`).toBeGreaterThan(0.02)
      expect(seconds, `${s.role} is over the SP-404's 10 s cap`).toBeLessThanOrEqual(10)
    }
  })
})

// ---------------------------------------------------------------------------
// Level
// ---------------------------------------------------------------------------

describe('reference samples: level', () => {
  it('peaks at -1 dBFS, the same on every file', () => {
    for (const s of REFERENCE_SAMPLES) {
      const samples = pcm(referenceWav(s.role) as Uint8Array)
      let peak = 0
      for (let i = 0; i < samples.length; i += 1) {
        const a = Math.abs(samples[i] as number)
        if (a > peak) peak = a
      }
      // round(0.891 * 32767). `ffmpeg -af volumedetect` reads this back as max_volume -1.0 dB.
      expect(peak, s.role).toBe(29195)
    }
  })

  it('is a sound rather than a header with silence behind it', () => {
    for (const s of REFERENCE_SAMPLES) {
      const f = floats(s.role)
      // -30 dBFS over the whole file, transients, tails and all. A buffer of near-zeros with one
      // spike in it would pass a peak test and fail this one.
      expect(rms(f, 0, f.length), s.role).toBeGreaterThan(0.03)
    }
  })

  it('starts and ends at exactly zero', () => {
    for (const s of REFERENCE_SAMPLES) {
      const samples = pcm(referenceWav(s.role) as Uint8Array)
      expect(samples[0], `${s.role} opens on a step`).toBe(0)
      expect(samples[samples.length - 1], `${s.role} closes on a step`).toBe(0)
    }
  })

  it('carries no offset worth speaking of', () => {
    for (const s of REFERENCE_SAMPLES) {
      const f = floats(s.role)
      let sum = 0
      for (let i = 0; i < f.length; i += 1) sum += f[i] as number
      // -60 dB of full scale. The three sounds built on a decaying sine from zero phase carry a
      // little by construction — the first half-cycle is the largest one — and it stays here.
      expect(Math.abs(sum / f.length), s.role).toBeLessThan(0.01)
    }
  })
})

// ---------------------------------------------------------------------------
// Envelopes
// ---------------------------------------------------------------------------

/** Everything except the riser, which is the one sound here that arrives at its end. */
const ONE_SHOTS: readonly Role[] = REFERENCE_SAMPLES.map((s) => s.role).filter((r) => r !== 'riser')

describe('reference samples: envelopes', () => {
  it('puts a one-shot transient in the first thirty milliseconds', () => {
    for (const role of ONE_SHOTS) {
      const f = floats(role)
      expect(peakIndex(f) / 44100, role).toBeLessThan(0.03)
    }
  })

  it('decays: a one-shot is quieter at its end than at its start', () => {
    for (const role of ONE_SHOTS) {
      const f = floats(role)
      const quarter = Math.floor(f.length / 4)
      const head = rms(f, 0, quarter)
      const tail = rms(f, f.length - quarter, f.length)
      // Two to one at the very least, measured. The kick is a thousand to one and the rim twenty;
      // the tom, the impact and the plain noise all sit near 2.6, which is what sets the floor.
      expect(head / tail, `${role} barely decays`).toBeGreaterThan(2)
    }
  })

  it('rises: the riser arrives at its end', () => {
    const f = floats('riser')
    const quarter = Math.floor(f.length / 4)
    expect(rms(f, f.length - quarter, f.length)).toBeGreaterThan(rms(f, 0, quarter) * 10)
    // Its peak is in the last tenth, which is what "hands over to the next downbeat" means.
    expect(peakIndex(f) / f.length).toBeGreaterThan(0.9)
  })

  it('separates the two hats by decay and not by timbre', () => {
    const closed = floats('closed-hat')
    const open = floats('open-hat')
    const decayed = (f: Float64Array, seconds: number): number => {
      const at = Math.floor(seconds * 44100)
      return rms(f, at, at + 1024) / rms(f, 0, 1024)
    }
    // At 150 ms the closed hat is down to 8% of where it started and the open one is still at 48%.
    // Six to one, which is the separation a reader hears as the pedal coming up.
    expect(decayed(closed, 0.15)).toBeLessThan(0.12)
    expect(decayed(open, 0.15)).toBeGreaterThan(0.35)
    expect(decayed(open, 0.15) / decayed(closed, 0.15)).toBeGreaterThan(4)
    // Same brightness, because it is the same noise. 13,278 Hz against 13,224.
    expect(Math.abs(centroid(spectrumOf('closed-hat')) - centroid(spectrumOf('open-hat')))).toBeLessThan(100)
  })

  /**
   * The two hats come off one `hatSource` with one seed, so they are the same sound under two
   * envelopes rather than two bursts of noise that measure alike.
   *
   * Proved by division. If the source is bit-identical then `closed[i] / open[i]` is the ratio of
   * the two envelopes and nothing else — a smooth curve, whatever the noise underneath is doing.
   * Two seeds would put the noise back in the quotient and adjacent ratios would jump by orders of
   * magnitude instead of by hundredths of a percent. A spectral comparison cannot tell those two
   * cases apart, which is why this is not one.
   */
  it('cuts both hats from one burst of noise', () => {
    const closed = floats('closed-hat')
    const open = floats('open-hat')
    // Up to the closed hat's own tail fade, which the open hat does not have at that point and
    // which would otherwise show up here as the one real discontinuity. It is at sample 7937.
    const until = closed.length - Math.floor(0.005 * 44100)
    let worst = 0
    let compared = 0
    let previous = Number.NaN
    for (let i = 0; i < until; i += 1) {
      if (Math.abs(open[i] as number) < 1e-6) continue
      const ratio = (closed[i] as number) / (open[i] as number)
      if (!Number.isNaN(previous)) {
        worst = Math.max(worst, Math.abs(ratio - previous) / Math.abs(previous))
        compared += 1
      }
      previous = ratio
    }
    expect(compared).toBeGreaterThan(7000)
    expect(worst, 'the two hats are not the same noise').toBeLessThan(1e-3)
  })

  it('separates the kick and the tom by how fast the pitch falls', () => {
    // Both are a sine dropping to a floor. The kick is there in about thirty milliseconds and the
    // tom takes four times as long, which is the only thing stopping the tom reading as a kick.
    const fundamental = (role: Role, from: number, to: number): number => {
      const spec = spectrum(floats(role), from, to)
      let best = 0
      let at = 0
      for (let k = 1; k < spec.length; k += 1) {
        if ((spec[k] as number) > best) {
          best = spec[k] as number
          at = k
        }
      }
      return (at * 44100) / FRAME
    }
    const kickEarly = fundamental('kick', 0, 2048)
    const kickLate = fundamental('kick', 4410, 6458)
    const tomEarly = fundamental('tom', 0, 2048)
    const tomLate = fundamental('tom', 4410, 6458)
    expect(kickEarly).toBeGreaterThan(kickLate)
    expect(tomEarly).toBeGreaterThan(tomLate)
    // The tom lives above the kick throughout, early and late.
    expect(tomLate).toBeGreaterThan(kickLate)
  })
})

// ---------------------------------------------------------------------------
// Spectra
// ---------------------------------------------------------------------------

describe('reference samples: spectra', () => {
  it('puts the low sounds low', () => {
    // A kick, a tom and an impact are the three roles a small speaker cannot reproduce, and the
    // reason each of them carries a transient on top.
    expect(bandShare(spectrumOf('kick'), 0, 300), 'kick').toBeGreaterThan(0.9)
    expect(bandShare(spectrumOf('tom'), 0, 300), 'tom').toBeGreaterThan(0.9)
    expect(bandShare(spectrumOf('impact'), 0, 300), 'impact').toBeGreaterThan(0.9)
    expect(centroid(spectrumOf('kick'))).toBeLessThan(300)
    expect(centroid(spectrumOf('tom'))).toBeLessThan(400)
  })

  it('puts the hats high', () => {
    for (const role of ['closed-hat', 'open-hat'] as const) {
      // The source is two poles up from 7 kHz, so effectively all of it is above 3 kHz.
      expect(bandShare(spectrumOf(role), 3000, 22050), role).toBeGreaterThan(0.95)
      expect(centroid(spectrumOf(role)), role).toBeGreaterThan(10000)
    }
  })

  it('keeps the ghost note off the top', () => {
    // `reference.ts` says 400 Hz to 2 kHz, and that sentence is what this checks.
    expect(centroid(spectrumOf('ghost-perc'))).toBeLessThan(3000)
    expect(bandShare(spectrumOf('ghost-perc'), 3000, 22050)).toBeLessThan(0.1)
  })

  it('makes the metallic sounds inharmonic rather than pitched', () => {
    // A pitched note puts most of its energy on multiples of one fundamental. These two put theirs
    // on ratios that are not whole numbers, so a peak search finds partials off the harmonic grid.
    for (const role of ['metallic', 'ride'] as const) {
      const spec = spectrumOf(role)
      const peaks: number[] = []
      for (let k = 2; k < spec.length - 1; k += 1) {
        const v = spec[k] as number
        if (v > (spec[k - 1] as number) && v > (spec[k + 1] as number) && v > 0.15) {
          peaks.push((k * 44100) / FRAME)
        }
      }
      expect(peaks.length, `${role} has no partials to speak of`).toBeGreaterThan(3)
      const root = peaks[0] as number
      const offGrid = peaks.filter((hz) => {
        const ratio = hz / root
        return Math.abs(ratio - Math.round(ratio)) > 0.12
      })
      expect(offGrid.length, `${role} looks like a harmonic series`).toBeGreaterThan(0)
    }
  })

  it('opens the riser and closes the sweep', () => {
    // The one property that distinguishes them, and it is a property of two halves rather than of
    // either one: a riser is brighter at its end, a sweep is brighter at its start.
    const half = (role: Role, first: boolean): number => {
      const f = floats(role)
      const mid = f.length >> 1
      return centroid(first ? spectrum(f, 0, mid) : spectrum(f, mid, f.length))
    }
    expect(half('riser', false), 'riser').toBeGreaterThan(half('riser', true) * 2)
    expect(half('sweep', true), 'sweep').toBeGreaterThan(half('sweep', false) * 2)
  })

  it('gives the snare a body the clap has not got', () => {
    // Both are shaped noise. The snare has two tuned tones under it, so it carries low energy;
    // the clap is hands and has none. This is the measurable half of what makes them different.
    expect(bandShare(spectrumOf('snare'), 0, 300)).toBeGreaterThan(0.2)
    expect(bandShare(spectrumOf('clap'), 0, 300)).toBeLessThan(0.05)
  })

  it('leaves the plain noise plain', () => {
    // Nothing shaped into it, because anything shaped in here turns up in every recipe that
    // reaches for it. Energy in all three bands, and a centroid near the top of the range.
    const spec = spectrumOf('noise')
    expect(bandShare(spec, 300, 3000)).toBeGreaterThan(0.05)
    expect(bandShare(spec, 3000, 22050)).toBeGreaterThan(0.5)
    expect(centroid(spec)).toBeGreaterThan(8000)
  })
})

// ---------------------------------------------------------------------------
// The set
// ---------------------------------------------------------------------------

describe('reference samples: what is offered', () => {
  it('offers fourteen, one per role, each a real role', () => {
    expect(REFERENCE_SAMPLES).toHaveLength(14)
    const roles = REFERENCE_SAMPLES.map((s) => s.role)
    expect(new Set(roles).size).toBe(14)
    for (const role of roles) expect(ROLES, role).toContain(role)
  })

  it('names each file after its own role', () => {
    for (const s of REFERENCE_SAMPLES) expect(s.file).toBe(`${s.role}.wav`)
  })

  /**
   * #519, and the one assertion here that is about a decision rather than about a sound. A
   * generator cannot make a voice, and the eight tonal roles are §3.8's to answer. If a later pass
   * adds any of them it should have to come through this list deliberately.
   */
  it('offers nothing a generator cannot make', () => {
    const roles = REFERENCE_SAMPLES.map((s) => s.role)
    for (const absent of ['vox-chop', 'pad', 'sub', 'lead', 'stab', 'arp', 'acid', 'bass-mid', 'texture'] as const) {
      expect(roles, `${absent} is not a sound this should offer`).not.toContain(absent)
      expect(renderReference(absent), absent).toBeUndefined()
      expect(referenceWav(absent), absent).toBeUndefined()
    }
  })

  it('says what it built, in the note beside each file', () => {
    for (const s of REFERENCE_SAMPLES) {
      expect(s.note.length, s.role).toBeGreaterThan(20)
      expect(s.note.endsWith('.'), s.role).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// The arithmetic
// ---------------------------------------------------------------------------

describe('reference samples: the arithmetic underneath', () => {
  /**
   * `dsp.ts` implements `sin` and `2^x` rather than calling `Math`, because invariant 6 is
   * byte-identical output on *any* platform and the transcendentals are implementation-approximated.
   * These two assertions are the error figures written in that file's comments.
   */
  it('matches Math.sin to 6.6e-10', () => {
    let worst = 0
    for (let i = 0; i <= 200000; i += 1) {
      const t = -3 + (i / 200000) * 6
      worst = Math.max(worst, Math.abs(sinTurns(t) - Math.sin(2 * Math.PI * t)))
      worst = Math.max(worst, Math.abs(cosTurns(t) - Math.cos(2 * Math.PI * t)))
    }
    expect(worst).toBeLessThan(6.7e-10)
    // And far below the quantiser that follows it: one 16-bit LSB is 3.05e-5.
    expect(worst).toBeLessThan(1 / 32767 / 1000)
  })

  it('matches Math.pow(2, x) to 2.4e-10 relative', () => {
    let worst = 0
    for (let i = 0; i <= 200000; i += 1) {
      const x = -40 + (i / 200000) * 50
      const want = Math.pow(2, x)
      worst = Math.max(worst, Math.abs(exp2(x) - want) / want)
    }
    expect(worst).toBeLessThan(2.5e-10)
  })

  it('wraps the sine at every turn rather than only near zero', () => {
    // The phase accumulators run for tens of thousands of turns, so folding has to hold out there.
    for (const turns of [0, 0.25, 0.5, 0.75, 1, 12345.125, -9999.375]) {
      expect(sinTurns(turns), `sin at ${turns}`).toBeCloseTo(Math.sin(2 * Math.PI * turns), 8)
    }
  })

  it('bounds the exponential rather than looping a hundred thousand times', () => {
    // The clamp is at -1000, so the floor is 2^-1000 rather than zero: a number 296 orders of
    // magnitude below one 16-bit LSB, reached in a thousand halvings instead of a hundred thousand.
    expect(exp2(-100000)).toBe(Math.pow(2, -1000))
    expect(exp2(-100000)).toBeLessThan(1e-300)
    expect(expNeg(100000)).toBeLessThan(1e-300)
    expect(exp2(100000)).toBe(Math.pow(2, 1000))
  })

  it('gives the same noise sequence for the same seed, and a different one otherwise', () => {
    const a = noiseSource(12345)
    const b = noiseSource(12345)
    const c = noiseSource(12346)
    const first = Array.from({ length: 64 }, () => a())
    expect(Array.from({ length: 64 }, () => b())).toEqual(first)
    expect(Array.from({ length: 64 }, () => c())).not.toEqual(first)
    for (const v of first) {
      expect(v).toBeGreaterThanOrEqual(-1)
      expect(v).toBeLessThan(1)
    }
  })

  it('leaves a silent buffer alone rather than filling it with NaN', () => {
    const silent = new Float64Array(64)
    normalisePeak(silent, 0.891)
    expect(Array.from(silent).every((v) => v === 0)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Who this is for, counted off the registry
// ---------------------------------------------------------------------------

/**
 * §3.9/#519. **The measurement the whole step rests on, derived rather than quoted.**
 *
 * `DESIGN.md` §3.9 and `reference.ts` both open with three numbers: seven devices that can make no
 * sound from scratch, 179 recipes between them, and 114 of those covered by the fourteen files. A
 * number written into prose is a number that stops being true quietly — the day somebody authors a
 * synthesis recipe for the Octatrack, or adds a sampler, the paragraph still reads the same.
 *
 * So the counts are computed here from `DEVICES` and pinned. A device that gains its first
 * from-scratch recipe drops out of the list and this fails, which is the point: the argument for
 * shipping these files is *these boxes make nothing*, and when that stops being true of a box the
 * argument has moved and the prose has to move with it.
 *
 * **A device makes nothing from scratch when every recipe it authors declares `sourceAudio`** —
 * §3/#101's line, the same one `resolveSample` uses to decide its `loads-audio` gap.
 *
 * **The EP–40 came off that list at #516, and it is the mechanism above working rather than a
 * count going stale.** `sourceAudio` used to mean both *load a file* and *select a sound the box
 * already has*, and three of that box's recipes meant the second: the supertone engine is a
 * ten-preset synth, so the reader presses a pad and gets a voice. Under the split those three
 * declare `soundSetup` instead, the predicate stops matching, and the box is no longer one that
 * makes nothing — because it never was. Seven became six, 179 recipes became 155, and #519's
 * library-wide 287 became 284.
 *
 * The argument for shipping the fourteen files is untouched by it. It still makes no *drum* sound
 * on its own — all three from-scratch recipes are tonal (`acid`, `lead`, `sweep`) — so a reader
 * holding one still has nowhere to get a kick, which is what these files are for. What changed is
 * that the box no longer qualifies under a predicate about *every* recipe, and stretching the
 * predicate to keep it would be picking the number over the reading.
 */
describe('reference samples: who this is for', () => {
  /** Every device whose entire recipe library sends the reader to a file. */
  const sampleOnly = DEVICES.filter(
    (device) =>
      device.recipes.length > 0 && device.recipes.every((recipe) => recipe.sourceAudio !== undefined),
  )

  it('names the six devices that can make no sound from scratch', () => {
    expect(sampleOnly.map((device) => device.id)).toEqual([
      'elektron-digitakt',
      'elektron-digitakt-ii',
      'elektron-octatrack-mkii',
      'polyend-tracker',
      'roland-sp-404mk2',
      'te-ep-133',
    ])
  })

  /**
   * §3/#516. **The EP–40 is here from the other side**, because a box leaving this list on a
   * modelling change is the one way the list can go quietly wrong.
   *
   * It makes three sounds from scratch and no drum among them, so it drops out of a predicate
   * about every recipe while a reader holding one still has nowhere to get a kick. Pinned so that
   * the day somebody authors a fourth supertone recipe — or moves one back — this file says so.
   */
  it('drops the EP–40 on its three supertone recipes, and no more than three', () => {
    const ep40 = DEVICES.find((device) => device.id === 'te-ep-40')
    expect(ep40).toBeDefined()
    const scratch = (ep40?.recipes ?? []).filter((recipe) => recipe.sourceAudio === undefined)
    expect(scratch.map((recipe) => recipe.role)).toEqual(['acid', 'lead', 'sweep'])
    for (const recipe of scratch) expect(recipe.soundSetup, recipe.id).toBeDefined()
  })

  it('counts 155 recipes across them, and 100 covered by the fourteen', () => {
    const offered = new Set<Role>(REFERENCE_SAMPLES.map((s) => s.role))
    const recipes = sampleOnly.flatMap((device) => device.recipes)
    expect(recipes).toHaveLength(155)
    expect(recipes.filter((recipe) => offered.has(recipe.role))).toHaveLength(100)
  })

  /**
   * #519's body counts 287 recipes library-wide that tell a reader to supply audio. Reproducing it
   * is what says the reading of `sourceAudio` above is the issue's own, rather than a second
   * definition that happens to give a tidy number.
   *
   * 284 since #516, and the three that came off are exactly the EP–40 supertones — which were
   * counted as asking for a file and never asked for one. The difference is checked rather than
   * asserted, so this stays the issue's own reading rather than a new number beside it.
   *
   * 285 since #541, which is the number moving the ordinary way: `ct-tom-hard` is a new drum
   * recipe on a box that loads samples, so it asks for a file like every other drum on it. That is
   * a recipe added rather than a definition changed, and the two are worth telling apart here —
   * #516 moved this figure without a single recipe being written.
   */
  it('reproduces the library-wide figure the issue was sized against', () => {
    const asking = DEVICES.flatMap((device) => device.recipes).filter(
      (recipe) => recipe.sourceAudio !== undefined,
    )
    const selecting = DEVICES.flatMap((device) => device.recipes).filter(
      (recipe) => recipe.soundSetup !== undefined,
    )
    expect(asking).toHaveLength(285)
    expect(selecting).toHaveLength(3)
    expect(asking.length + selecting.length).toBe(288)
  })

  it('leaves the roles it declines to the surface that can answer them', () => {
    // The 55 recipes on those boxes that these files do not cover are vox-chop and the eight tonal
    // roles. Nothing else is left over, so the out-list in `reference.ts` is exhaustive rather than
    // a sample of what was skipped.
    const offered = new Set<Role>(REFERENCE_SAMPLES.map((s) => s.role))
    const uncovered = new Set(
      sampleOnly
        .flatMap((device) => device.recipes)
        .map((recipe) => recipe.role)
        .filter((role) => !offered.has(role)),
    )
    expect([...uncovered].sort()).toEqual([
      'acid',
      'arp',
      'bass-mid',
      'lead',
      'pad',
      'stab',
      'sub',
      'texture',
      'vox-chop',
    ])
  })
})
