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
 * references and twelve are `patch` references.
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
 * and two lines that are the top voice of a pad, filed as `lead` because a pad has no grid to
 * riff on (`moog-55-strings-suspension-writing`, `soft-orchestra-slow-changes`).
 *
 * Seven of the seventeen are `lead`, which is under the strict majority `test/riff.test.ts`
 * allows one role, and they are seven different lessons: a line that floats late, a line that
 * marches on the grid, a line in a mode, a line with no overlaps because the patch glides, and
 * three shapes of held top voice.
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

const BY_ID: ReadonlyMap<RiffId, Riff> = new Map(RIFFS.map((r) => [r.id, r]))

/** `undefined` for an unknown id — a caller with a stale link is not an exception. */
export function riffById(id: RiffId): Riff | undefined {
  return BY_ID.get(id)
}
