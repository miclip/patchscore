/**
 * §3.9/#519. The reference sample generator: fourteen one-shots, synthesised here, with no audio
 * dependency and no committed bytes. `reference.ts` carries the argument for what is in and what
 * is deliberately out.
 */
export { REFERENCE_SAMPLES, referenceWav, renderReference } from './reference'
export type { ReferenceSample } from './reference'
export { BIT_DEPTH, CHANNELS, SAMPLE_RATE, writeWav } from './wav'
