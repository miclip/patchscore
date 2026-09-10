/**
 * §3.9/#519. The reference sample generator: fourteen one-shots, synthesised here, with no audio
 * dependency and no committed bytes.
 *
 * **The barrel reaches the synthesis, so nothing in a client bundle may import it.** A surface that
 * only needs to know whether a sound has a reference file imports `./catalogue` directly —
 * `sample-text.ts` does, and `test/reference-download.test.ts` walks the sound page's import graph
 * to hold it. The route handler and the tests are what import this.
 */
export { REFERENCE_SAMPLES, referenceSampleFor } from './catalogue'
export type { ReferenceSample } from './catalogue'
export { referenceWav, renderReference } from './reference'
export { BIT_DEPTH, CHANNELS, SAMPLE_RATE, writeWav } from './wav'
