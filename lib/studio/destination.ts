/**
 * §3.7/§3.8. **Where the sounds go, and the only answer this product has evidence for.**
 *
 * `reader-supplied` means *the reader's own recorder, sampler or DAW — whatever they have*.
 *
 * **Lifted out of `kit-session.ts` rather than copied** (#520). It was `KitDestination`, and the
 * sound page needs the same single-member union with the same argument behind it, so a second copy
 * would have been two places for one decision and a `kind` discriminant that could grow an arm on
 * one of them.
 *
 * ## Why it is not a device, on either surface
 *
 * §3.6 refused to print a destination and was right to. What it refused was an **in-rig** one —
 * "record it into the Digitakt" — because that is a claim about a second box a page reached with
 * no rig has never been told about. Naming the reader's own recorder makes no claim about any box
 * at all: it says who owns the far end of the cable, which is true on every rig.
 *
 * **A sound page knows the rig, and that changes nothing here.** Knowing which boxes somebody owns
 * is not the same as knowing which of them records, and no manifest states it. Whether a box
 * can sample is a fact about that box, `capabilityEvidence` is where such a fact would have to
 * live, and deriving one — "it has an audio input, so it records" — is invariant 5's failure in a
 * new place. So the surface that finally has a rig still answers `reader-supplied`, and it does so
 * on the evidence rather than on the shape of the page.
 *
 * `kind` stays a single-member union on purpose. An in-rig destination is a real possibility once
 * a device folder states the capability, and the discriminant is what lets that land without every
 * reader of the type having to guess whether a missing field meant *the reader's own* or *nobody
 * has looked*.
 */
export type RecordingDestination = { kind: 'reader-supplied' }

/**
 * The one destination there is. Frozen and shared, so a session cannot be handed one a caller
 * has since mutated — `NEUTRAL_MOOD`'s reason, on a value with the same "there is only one of
 * these" shape.
 */
export const READER_SUPPLIED: RecordingDestination = Object.freeze({ kind: 'reader-supplied' })
