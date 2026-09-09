import type { RiffId } from '../core/ids'
import type { Riff } from '../core/riff'
import { acidTracksLine } from './acid-tracks-line'
import { blueMondayBass } from './blue-monday-bass'
import { showMeLoveOrganStab } from './show-me-love-organ-stab'
import { thrillerSynthRiff } from './thriller-synth-riff'

/**
 * The riff registry (§5A). Hand-written and static, for the reason the template and inspiration
 * registries are: invariant 2's drop-in promise is about *devices*, and a riff is an authored
 * figure maintained here.
 *
 * Ordered by id in UTF-16 code unit order (§7.2), matching both other registries. Insertion order
 * would make the list depend on the order of the imports above.
 *
 * ## Every entry names the record it is found by, and none of them carries its notes
 *
 * §5A.5, and it is the rule that shapes this whole folder. A technique is found by the recording
 * it is famous from, so the reference is in the title *and* in the slug — `Riff.track` is the one
 * field both are checked against, and an entry that named one record and filed itself under
 * another cannot parse.
 *
 * **The figures are ours.** Every hook below was written for this library to teach the technique
 * the record is the reference for. A reader who wants the record should go and listen to the
 * record.
 *
 * ## What the four are for, which is not four of the same thing
 *
 * Four roles, and four shapes of part. `blue-monday-bass` and `acid-tracks-line` are both
 * monophonic sixteenth lines and are the pair that proves the difference between two such parts is
 * *which sixteenths are silent* rather than anything about the notes. `thriller-synth-riff` is the
 * melodic one, and the entry where `reArticulatesHook` is least obvious and therefore most worth
 * having written down. `show-me-love-organ-stab` is the only one that asks for a chord, and its
 * `polyphony: 3` is what gives §7.3's `no-capable-voice` something to report on a rig of mono
 * boxes — and what gives §12.4's stacking something to spread across a pool of them.
 */
export const RIFFS: readonly Riff[] = [
  acidTracksLine,
  blueMondayBass,
  showMeLoveOrganStab,
  thrillerSynthRiff,
]

export { acidTracksLine, blueMondayBass, showMeLoveOrganStab, thrillerSynthRiff }

const BY_ID: ReadonlyMap<RiffId, Riff> = new Map(RIFFS.map((r) => [r.id, r]))

/** `undefined` for an unknown id — a caller with a stale link is not an exception. */
export function riffById(id: RiffId): Riff | undefined {
  return BY_ID.get(id)
}
