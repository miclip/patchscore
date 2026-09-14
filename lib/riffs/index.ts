import type { RiffId } from '../core/ids'
import type { Riff } from '../core/riff'
import { threeOscBassLoveRootOctaveFigure } from './3-osc-bass-love-root-octave-figure'
import { seventiesElectroPnoRhodesTurnaround } from './70s-electro-pno-rhodes-turnaround'
import { acidTracksLine } from './acid-tracks-line'
import { aegeanOrganPhrygianFigure } from './aegean-organ-phrygian-figure'
import { bellbounceSparseBellPattern } from './bellbounce-sparse-bell-pattern'
import { bladeRunnerBluesLead } from './blade-runner-blues-lead'
import { blueMondayBass } from './blue-monday-bass'
import { detroitFunkAeolianMachineLoop } from './detroit-funk-aeolian-machine-loop'
import { hamamatsuTinesBalladFigure } from './hamamatsu-tines-ballad-figure'
import { moog55StringsSuspensionWriting } from './moog-55-strings-suspension-writing'
import { moogProSoloGlideLead } from './moog-pro-solo-glide-lead'
import { museRunnerFloatingArrivalLead } from './muse-runner-floating-arrival-lead'
import { polyphonicPowerBrassStabCycle } from './polyphonic-power-brass-stab-cycle'
import { showMeLoveOrganStab } from './show-me-love-organ-stab'
import { softOrchestraSlowChanges } from './soft-orchestra-slow-changes'
import { thrillerSynthRiff } from './thriller-synth-riff'
import { voxHumanaRigidColdPopLine } from './vox-humana-rigid-cold-pop-line'

/**
 * The riff registry (§5A). Hand-written and static, for the reason the template and inspiration
 * registries are: invariant 2's drop-in promise is about *devices*, and a riff is an authored
 * figure maintained here.
 *
 * Ordered by id in UTF-16 code unit order (§7.2), matching both other registries. Insertion order
 * would make the list depend on the order of the imports above. Two ids open with a digit, and a
 * digit sorts before every letter, so `3-osc-bass-love-root-octave-figure` and
 * `70s-electro-pno-rhodes-turnaround` come first.
 *
 * ## Every entry names what it is found by, and none of them carries its notes
 *
 * §5A.5, and it is the rule that shapes this whole folder. A technique is found by the recording
 * it is famous from or the factory patch it is heard on, so the reference is in the title *and*
 * in the slug — `Riff.reference` is the one field both are checked against, and an entry that
 * named one reference and filed itself under another cannot parse. Five entries are `record`
 * references and twelve are `patch` references, and the kind decides where an entry surfaces
 * (#598): the five are `/riffs`, and each of the twelve is a page under the box that ships its
 * patch. See `RECORD_RIFFS`.
 *
 * **The figures are ours.** Every hook below was written for this library to teach the technique
 * the reference stands for. A reader who wants the record should go and listen to the record.
 *
 * ## The five records, which is not five of the same thing
 *
 * `blue-monday-bass` and `acid-tracks-line` are both monophonic sixteenth lines and are the pair
 * that proves the difference between two such parts is *which sixteenths are silent* rather than
 * anything about the notes. `thriller-synth-riff` is the melodic one, and the entry where
 * `reArticulatesHook` is least obvious and therefore most worth having written down.
 * `show-me-love-organ-stab` is the chord riff with no chord table: its `polyphony: 3` is what
 * gives §7.3's `no-capable-voice` something to report on a rig of mono boxes, and what gives
 * §12.4's stacking something to spread across a pool of them.
 *
 * `blade-runner-blues-lead` is the one record with chords of its own: a figure over a
 * *progression*, and the entry `Riff.harmony` and `HookNote.alter` exist for. A melody whose
 * thirds are raised because the chord under them is borrowed, where printing the degree alone
 * would say `3rd` over two different pitches.
 *
 * ## The twelve patches (§5A.5, #566, #569)
 *
 * `muse-runner-floating-arrival-lead` was the first named after a factory patch, and the other
 * eleven followed it in #569 from one set of definitions. Every one of them carries a chord
 * table, because every one was written as a line over a progression, and most carry a rule as
 * data (#554). What they add to the library is range: two more chord riffs that also carry a
 * table, because the stab plays the top of the chord and leaves the root to the bass
 * (`detroit-funk-aeolian-machine-loop`, `polyphonic-power-brass-stab-cycle`); the first `arp`
 * (`bellbounce-sparse-bell-pattern`); a second bass, in octaves where the first was in
 * sixteenths; a line in a mode that is neither major nor minor (`aegean-organ-phrygian-figure`);
 * and the first two `pad`s, the top voice of a string ensemble over slow changes, each a hook
 * with no grid (`moog-55-strings-suspension-writing`, `soft-orchestra-slow-changes`). Both
 * were filed as `lead` while `RiffSchema` refused a held role; #608 removed that rule and put
 * them on the role their definitions named (§5A.2).
 *
 * ## Two entries name the patch their sound is (§5A.5, #585)
 *
 * A riff reaches a recipe by role and character, and a recipe may name a factory patch. That
 * pairing is not the riff's: `thriller-synth-riff` and `blade-runner-blues-lead` reach the same
 * `lead / bright` recipe on one box, and only one of them is that patch's sound. So the page
 * prints a patch only where the riff authors `patchAffinities` naming it, and exactly two do:
 * `blade-runner-blues-lead` names *Muse Runner*, a CS-80 line on a CS-80 lead, and
 * `muse-runner-floating-arrival-lead` names the patch it is named after. No other entry carries
 * one, a patch-named reference included: being named after a patch is how a reader finds the
 * technique (§5A.5) and is not a judgement that the figure is that sound, so it earns no
 * affinity by itself. `test/riff.test.ts` pins the set at those two ids.
 *
 * Six of the seventeen are `lead`, which is under the strict majority `test/riff.test.ts`
 * allows one role, and they are six different lessons: a line that floats late, the six
 * arrivals of that line on their own, a line that marches on the grid, a line in a mode, a
 * line with no overlaps because the patch glides, and a synth riff struck on every note.
 * `test/riff.test.ts` pins the count per role.
 */
export const RIFFS: readonly Riff[] = [
  threeOscBassLoveRootOctaveFigure,
  seventiesElectroPnoRhodesTurnaround,
  acidTracksLine,
  aegeanOrganPhrygianFigure,
  bellbounceSparseBellPattern,
  bladeRunnerBluesLead,
  blueMondayBass,
  detroitFunkAeolianMachineLoop,
  hamamatsuTinesBalladFigure,
  moog55StringsSuspensionWriting,
  moogProSoloGlideLead,
  museRunnerFloatingArrivalLead,
  polyphonicPowerBrassStabCycle,
  showMeLoveOrganStab,
  softOrchestraSlowChanges,
  thrillerSynthRiff,
  voxHumanaRigidColdPopLine,
]

export {
  acidTracksLine,
  aegeanOrganPhrygianFigure,
  bellbounceSparseBellPattern,
  bladeRunnerBluesLead,
  blueMondayBass,
  detroitFunkAeolianMachineLoop,
  hamamatsuTinesBalladFigure,
  moog55StringsSuspensionWriting,
  moogProSoloGlideLead,
  museRunnerFloatingArrivalLead,
  polyphonicPowerBrassStabCycle,
  seventiesElectroPnoRhodesTurnaround,
  showMeLoveOrganStab,
  softOrchestraSlowChanges,
  threeOscBassLoveRootOctaveFigure,
  thrillerSynthRiff,
  voxHumanaRigidColdPopLine,
}

/**
 * §5A.7/#598. **The entries `/riffs` lists: the five named for a record.** A figure named for a
 * factory patch surfaces on the box that ships the patch, at `/devices/<id>/presets/<patch>`,
 * and nowhere else — `/riffs/<its id>` is a 404. One filter on `reference.kind`, here, so the
 * catalogue, its static routes, the search and the sitemap cannot disagree about which twelve
 * left. Not a second content type: the twelve stay in this folder, under the same schema and
 * the same tests, and `presetSession` finds each by the patch its `reference` names.
 */
export const RECORD_RIFFS: readonly Riff[] = RIFFS.filter((r) => r.reference.kind === 'record')

const BY_ID: ReadonlyMap<RiffId, Riff> = new Map(RIFFS.map((r) => [r.id, r]))

/** `undefined` for an unknown id — a caller with a stale link is not an exception. */
export function riffById(id: RiffId): Riff | undefined {
  return BY_ID.get(id)
}
