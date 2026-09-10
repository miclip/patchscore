/**
 * §3.9/#519. **A mono 16-bit PCM WAV, written by hand.**
 *
 * Forty-four bytes of header and a block of little-endian samples. This repo carries no audio
 * dependency and #519 settled that it must not gain one for this: the cost of a library here would
 * have been larger than the thing it was being brought in to do, and a dependency is a second
 * answer to *where did these bytes come from* on files whose entire claim is that they were
 * generated in the open.
 *
 * ## The format, and why this one
 *
 * `44100 Hz`, mono, `16-bit` signed PCM. It is what every sampler in the library reads. #507
 * records that the Deluge's wavetable engine wants mono WAV or AIFF over 20 ms; the shortest file
 * here is a closed hat at 180 ms. #517 records that the SP-404 caps a pad at ten seconds; the
 * longest here is a two-second riser. Both were checked against the durations rather than assumed
 * to be clear of them. Neither is a floor on how short a file may be — the SP-404's cap is the only
 * thing #517 settles, and the Deluge's 20 ms is a wavetable rule rather than a sampler one.
 *
 * `ffmpeg` and `afconvert` are both present on a developer's machine and can make an AIFF or move
 * the rate if some box turns out to need it. **Neither becomes a build dependency**, and no
 * conversion happens here.
 *
 * ## `DataView`, not `Buffer`
 *
 * `Buffer` is Node's. These bytes are heading for a download button, which is a browser, and a
 * generator that runs in one place and is verified in another is the arrangement #519's hash test
 * exists to prevent. `DataView` with an explicit `littleEndian` argument also states the byte order
 * in the code rather than inheriting the CPU's, which is the same discipline the rest of the
 * product applies to locale.
 */

/** The one rate everything here is written at. */
export const SAMPLE_RATE = 44100

/** Bits per sample. Sixteen, and the quantiser below is the only place it is assumed. */
export const BIT_DEPTH = 16

/** Mono. A reference one-shot has nothing to put in a second channel. */
export const CHANNELS = 1

/** The canonical RIFF/WAVE header: `RIFF`, `fmt ` of 16 bytes, `data`. */
const HEADER_BYTES = 44

/** PCM. The only `wFormatTag` anything here writes. */
const FORMAT_PCM = 1

/**
 * Full scale for a 16-bit sample.
 *
 * `32767` rather than `32768`, and the rounding below is symmetric about zero, so `+1` and `-1`
 * quantise to values of equal magnitude. Scaling by `32768` gains a fraction of a dB and costs a
 * wrap to `-32768` on any sample that reaches exactly `+1`, which a peak-normalised file does.
 */
const FULL_SCALE = 32767

/**
 * One float sample to one 16-bit integer.
 *
 * Rounded away from zero on a tie in both directions. `Math.round` alone rounds a tie towards
 * `+∞`, which puts a half-LSB bias into a noise burst; it is inaudible and it is also free to
 * avoid.
 */
function quantise(v: number): number {
  const clamped = v > 1 ? 1 : v < -1 ? -1 : v
  const scaled = clamped * FULL_SCALE
  return scaled < 0 ? -Math.round(-scaled) : Math.round(scaled)
}

/**
 * Float samples in `[-1, 1]` to the bytes of a `.wav` file.
 *
 * Anything outside the range is clipped rather than rejected: a recipe that overshoots should
 * sound like it overshot, and every recipe in `reference.ts` is normalised before it gets here so
 * the clip is unreachable in practice.
 */
export function writeWav(samples: Float64Array, rate: number = SAMPLE_RATE): Uint8Array {
  const dataBytes = samples.length * 2
  const bytes = new Uint8Array(HEADER_BYTES + dataBytes)
  const view = new DataView(bytes.buffer)

  // RIFF chunk descriptor.
  ascii(bytes, 0, 'RIFF')
  view.setUint32(4, 36 + dataBytes, true)
  ascii(bytes, 8, 'WAVE')

  // `fmt ` subchunk, PCM, 16 bytes.
  ascii(bytes, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, FORMAT_PCM, true)
  view.setUint16(22, CHANNELS, true)
  view.setUint32(24, rate, true)
  view.setUint32(28, (rate * CHANNELS * BIT_DEPTH) / 8, true) // byte rate
  view.setUint16(32, (CHANNELS * BIT_DEPTH) / 8, true) // block align
  view.setUint16(34, BIT_DEPTH, true)

  // `data` subchunk.
  ascii(bytes, 36, 'data')
  view.setUint32(40, dataBytes, true)
  for (let i = 0; i < samples.length; i += 1) {
    view.setInt16(HEADER_BYTES + i * 2, quantise(samples[i] as number), true)
  }

  return bytes
}

/**
 * A four-character chunk id. ASCII by construction — every caller above passes a literal — so
 * `charCodeAt` is the whole of the encoding and no locale is consulted (§7.2).
 */
function ascii(bytes: Uint8Array, at: number, text: string): void {
  for (let i = 0; i < text.length; i += 1) {
    bytes[at + i] = text.charCodeAt(i)
  }
}
