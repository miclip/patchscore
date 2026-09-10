import type { Role } from '../core/vocabulary'

/**
 * §3.9/#519. **Which fourteen sounds are offered, and nothing about how one is made.**
 *
 * Split from `reference.ts` at the point the download landed (#519), and the split is not
 * cosmetic. `sample-text.ts` needs to know *whether this sound has a reference file*, and
 * `sample-text.ts` is pulled into the browser by the sound page's client island. Importing the
 * generator to answer a yes-or-no question would have put every filter, every oscillator and the
 * whole polynomial `sin` into the bundle of a page that never synthesises anything — the route
 * does that, in Node.
 *
 * So this file is fourteen objects and a lookup, and it imports one type.
 *
 * ---------------------------------------------------------------------------
 * Who the fourteen are for
 * ---------------------------------------------------------------------------
 *
 * §3.8's `/samples` answers *how do I make this sound on the box I own*, and for most rigs it is
 * the better answer. It has nothing to say to one rig. **Six of the library's devices can make no
 * sound from scratch** — the two Digitakts, the Octatrack, the Polyend Tracker, the SP-404 mk2 and
 * the EP-133, all samplers, carrying 155 recipes between them and every one of those recipes
 * asking for a file. These fourteen files cover 100 of them, 65%.
 * `test/reference-samples.test.ts` derives all three numbers off the registry rather than trusting
 * this paragraph.
 *
 * Six rather than seven since #516, and the EP-40 is the one that left. Three of its recipes reach
 * the built-in supertone engine, which is a synth: they had been carrying `sourceAudio` because it
 * was the only field that held the navigation, and they carry `soundSetup` now (§3). So the box
 * makes three sounds of its own and is no longer one that makes none. It makes no *drum* sound of
 * its own — all three are tonal — so a reader holding one is still exactly who these files are
 * for, and that is the sentence the count was standing in for.
 *
 * ---------------------------------------------------------------------------
 * A reference sample is the target, not the answer
 * ---------------------------------------------------------------------------
 *
 * Invariant 5, and it decides the copy on every surface that offers one. The recipe still says what
 * to bring and §3.8 still says how to make one; this is a sound to compare against, so somebody who
 * has never heard the difference between a rim and a closed hat has something to aim at. If a
 * page's wording lets a reader take the download to *be* the sound the guide wants, every recipe
 * pointing at it collapses to one timbre. `REFERENCE_OFFER` in `sample-text.ts` is that sentence,
 * and it is one sentence for both renderers.
 *
 * ---------------------------------------------------------------------------
 * What is deliberately out
 * ---------------------------------------------------------------------------
 *
 * The line is what can be made from noise, sines and envelopes without claiming something untrue.
 *
 *  - **`vox-chop`.** A generator cannot make a voice, and a synthesised approximation offered as a
 *    reference vocal would be a lie told to the reader least able to catch it. It is also the
 *    most-asked-for role in the library at 21 recipes. #521 is the answer: a phone records one.
 *  - **The tonal roles** — `pad`, `sub`, `lead`, `stab`, `arp`, `acid`, `bass-mid`, `texture`.
 *    Anybody with any synth is better served by §3.8, and a generated reference saw teaches nothing
 *    about what a lead should be. If a later pass adds them it should be because somebody asked.
 *
 * A target on any of those nine roles offers no download at all — no sentence, no link and no
 * route. `test/reference-download.test.ts` holds that from both ends.
 */
export type ReferenceSample = {
  /** §1. The part of a mix this sound is a reference for. One file per role. */
  role: Role
  /**
   * `closed-hat.wav`. What the download is called, and the role's own slug rather than the
   * target's: three targets are named for the hand rather than the role — `metallic-hit`,
   * `ghost-hit`, `noise-hit` — and a folder of collected files reads better by role. It is also
   * what `npm run samples:wav` writes, so the file on a reader's disk and the file a developer
   * listens to have one name.
   */
  file: string
  /**
   * Rendered length. Every one is over #507's 20 ms floor and far inside #517's ten-second cap,
   * which `test/reference-samples.test.ts` asserts against the bytes rather than against this
   * number.
   *
   * **Not reader-facing.** The page and the document print the file name and stop.
   */
  seconds: number
  /**
   * What was built, in the words somebody would use out loud.
   *
   * **Also not reader-facing**, and it was briefly the opposite. Beside a download link it makes a
   * generated example look like an authored answer carrying its own settings, which is the reading
   * invariant 5 exists to prevent — the recipe below has the settings, and this file is a thing to
   * compare against. It is here for `npm run samples:wav`, which lists the set for whoever is
   * deciding what to change, and it is the sentence `test/reference-samples.test.ts` measures.
   */
  note: string
}

/**
 * The fourteen, in `KIT_ROLES` order for the twelve that are in it, then the two transitions.
 *
 * The order is §3.6's, for §3.8's reason: somebody who has just read a kit page must not find the
 * same sounds in a different order here.
 */
export const REFERENCE_SAMPLES: readonly ReferenceSample[] = [
  { role: 'kick', file: 'kick.wav', seconds: 0.6, note: 'Sine falling 145 Hz to 48 Hz, with a noise tick.' },
  { role: 'snare', file: 'snare.wav', seconds: 0.35, note: 'Body at 185 Hz and 330 Hz under noise between 1.2 and 8.5 kHz.' },
  { role: 'clap', file: 'clap.wav', seconds: 0.45, note: 'Three bursts of 800 Hz to 3.5 kHz noise, 11 ms apart, then a tail.' },
  { role: 'rim', file: 'rim.wav', seconds: 0.12, note: 'Tones at 1.7 kHz and 2.4 kHz, gone in thirty milliseconds.' },
  { role: 'tom', file: 'tom.wav', seconds: 0.5, note: 'Sine falling 210 Hz to 110 Hz, four times slower than the kick.' },
  { role: 'closed-hat', file: 'closed-hat.wav', seconds: 0.18, note: 'Noise above 7 kHz with metal partials, cut at sixty milliseconds.' },
  { role: 'open-hat', file: 'open-hat.wav', seconds: 0.7, note: 'The closed hat over two decays, the slower one 450 ms.' },
  { role: 'ride', file: 'ride.wav', seconds: 1.6, note: 'Eight partials off 480 Hz, a high wash, and a ping.' },
  { role: 'metallic', file: 'metallic.wav', seconds: 0.8, note: 'Six partials off 320 Hz, no noise, high ones decaying first.' },
  { role: 'ghost-perc', file: 'ghost-perc.wav', seconds: 0.15, note: 'Noise between 400 Hz and 2 kHz, soft front, gone in fifty milliseconds.' },
  { role: 'noise', file: 'noise.wav', seconds: 0.8, note: 'Full band, rolled off above 12 kHz, shaped over six-tenths of a second.' },
  { role: 'impact', file: 'impact.wav', seconds: 1.4, note: 'Tone falling 55 Hz to 38 Hz under a low boom, with a crack on the front.' },
  { role: 'riser', file: 'riser.wav', seconds: 2.0, note: 'Noise climbing 300 Hz to 9 kHz over five octaves, rising in level.' },
  { role: 'sweep', file: 'sweep.wav', seconds: 1.5, note: 'Noise falling 9 kHz to 200 Hz, decaying behind it.' },
]

const BY_ROLE: ReadonlyMap<Role, ReferenceSample> = new Map(
  REFERENCE_SAMPLES.map((sample) => [sample.role, sample]),
)

/**
 * The reference file offered for a role, or `undefined` where none is.
 *
 * `undefined` rather than a throw, for the reason `sampleTargetById` answers that way: nine of the
 * twenty-three roles are deliberately not offered, so a caller asking about one is asking a
 * reasonable question and the answer is *there isn't one*, which every surface has to be able to
 * say without treating it as an error.
 */
export function referenceSampleFor(role: Role): ReferenceSample | undefined {
  return BY_ROLE.get(role)
}
