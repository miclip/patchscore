import type { RiffId } from '../core/ids'
import type { Riff } from '../core/riff'
import { threeOscBassLoveRootOctaveFigure } from './3-osc-bass-love-root-octave-figure'
import { seventiesElectroPnoRhodesTurnaround } from './70s-electro-pno-rhodes-turnaround'
import { acidTracksLine } from './acid-tracks-line'
import { aegeanOrganPhrygianFigure } from './aegean-organ-phrygian-figure'
import { anEndingAscentPad } from './an-ending-ascent-pad'
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
import { brewTimeMajorSeventhHold } from './brew-time-major-seventh-hold'
import { brokenToyMusicBoxStumble } from './broken-toy-music-box-stumble'
import { cloudLevelSharedTopDrift } from './cloud-level-shared-top-drift'
import { hypnoAcidSixteenthLoop } from './hypno-acid-sixteenth-loop'
import { lushM7ParallelRootLine } from './lush-m7-parallel-root-line'
import { metalfnkleadSyncopatedFunkLine } from './metalfnklead-syncopated-funk-line'
import { mirroredbassInvertedAnswerLine } from './mirroredbass-inverted-answer-line'
import { petrichorOffbeatCompingFigure } from './petrichor-offbeat-comping-figure'
import { pressureRepeatedNoteBuild } from './pressure-repeated-note-build'
import { replicantXdInnerVoicePad } from './replicant-xd-inner-voice-pad'
import { roadzBellSixthsBalladFigure } from './roadz-bell-sixths-ballad-figure'
import { swollenPadStaggeredStack } from './swollen-pad-staggered-stack'
import { acidWigglerWideningWiggleLine } from './acid-wiggler-widening-wiggle-line'
import { celestialFixedStarPad } from './celestial-fixed-star-pad'
import { droneTonicPedalUnderTheChanges } from './drone-tonic-pedal-under-the-changes'
import { duoOrgParallelThirdsComp } from './duo-org-parallel-thirds-comp'
import { duotronicMoogtronsPedalAndLinePad } from './duotronic-moogtrons-pedal-and-line-pad'
import { funkOrganPushedSixteenthStabs } from './funk-organ-pushed-sixteenth-stabs'
import { lowBassTwoStrikesRootLine } from './low-bass-two-strikes-root-line'
import { sawLeadOctaveCut } from './saw-lead-octave-cut'
import { sawteethDuoDancerCrossingStabs } from './sawteeth-duo-dancer-crossing-stabs'
import { terrorBassClosingSemitoneLine } from './terror-bass-closing-semitone-line'
import { triangleLeadRiseAndFallLine } from './triangle-lead-rise-and-fall-line'
import { triplet5thsStackedFifthsLadder } from './triplet-5ths-stacked-fifths-ladder'

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
 * named one reference and filed itself under another cannot parse. Six entries are `record`
 * references and thirty-six are `patch` references, and the kind decides where an entry
 * surfaces (#598): the six are `/riffs`, and each of the thirty-six is a page under the box
 * that ships its patch. See `RECORD_RIFFS`.
 *
 * **The figures are ours.** Every hook below was written for this library to teach the technique
 * the reference stands for. A reader who wants the record should go and listen to the record.
 *
 * ## The six records, which is not six of the same thing
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
 * `an-ending-ascent-pad` is the first record-named `pad` (#627), and the first figure with a
 * shape across the whole of it: one held note a chord over sixteen bars, climbing by step to
 * one peak and stopping there, with two fourths left unresolved. Every other record-named
 * entry is a struck part with a grid; this one is a hook alone, as every pad is (§5A.2).
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
 * Six of the first seventeen are `lead`, which is under the strict majority `test/riff.test.ts`
 * allows one role, and they are six different lessons: a line that floats late, the six
 * arrivals of that line on their own, a line that marches on the grid, a line in a mode, a
 * line with no overlaps because the patch glides, and a synth riff struck on every note.
 * `test/riff.test.ts` pins the count per role.
 *
 * ## The twelve for the minilogue xd's programs (§5A.5, #618)
 *
 * The second box with a patch list, and the first whose list is off a page: pp.61-64 of its
 * manual print all 200 programs with a Voice Mode beside each, and the mode is a constraint
 * the figures are written under. A CHORD or UNISON program sounds one key at a time however
 * many voices the box has, so the four figures on those (`mirroredbass-…`, `hypno-acid-…`,
 * `metalfnklead-…`, `lush-m7-…`) never overlap a note; an ARP program plays what the hand
 * holds, so the two on those (`brew-time-…`, `cloud-level-…`) are `pad`s of held voicings with
 * no grid, four notes at most; and every POLY figure peaks at four. What the twelve add to the
 * library is the first four-note `pad`s (the first seventeen's two pads are the top voice of an
 * ensemble), a staggered entry whose polyphony is what *sounds* rather than what *starts*
 * (`swollen-pad-…`), and a line whose every note is a chord (`lush-m7-…`).
 * `test/korg-minilogue-xd.test.ts` holds each to the printed mode.
 *
 * ## The twelve for the Subsequent 37's presets (§5A.5, #624)
 *
 * The third box with a patch list, off its own screen at firmware 1.2.0, and the first whose
 * figures are single lines because the box plays two notes. Every one of the twelve carries a
 * chord table, and on nine of them the harmony is context the line sits over rather than
 * anything the part plays: one note at a time, by construction, on the sub, the bass, the acid
 * line, the arp, both leads, one of the three stabs, one pad and the texture. The other three
 * spend the second note on purpose, and they are the three ways two voices can move —
 * `duo-org-…` parallel, `sawteeth-duo-dancer-…` contrary, `duotronic-moogtrons-…` oblique — on
 * the two roles whose recipes on that box spend it, `stab` and `pad`. What the twelve add to
 * the library is the first `sub` and the first `texture` (`low-bass-…`, `drone-…`), a second
 * through-composed struck entry (the drone, whose two onsets share no grid step across two
 * passes), and a line whose whole subject is a modal semitone (`terror-bass-…`, in phrygian).
 * `test/moog-subsequent-37.test.ts` holds each to two notes at most.
 */
export const RIFFS: readonly Riff[] = [
  threeOscBassLoveRootOctaveFigure,
  seventiesElectroPnoRhodesTurnaround,
  acidTracksLine,
  acidWigglerWideningWiggleLine,
  aegeanOrganPhrygianFigure,
  anEndingAscentPad,
  bellbounceSparseBellPattern,
  bladeRunnerBluesLead,
  blueMondayBass,
  brewTimeMajorSeventhHold,
  brokenToyMusicBoxStumble,
  celestialFixedStarPad,
  cloudLevelSharedTopDrift,
  detroitFunkAeolianMachineLoop,
  droneTonicPedalUnderTheChanges,
  duoOrgParallelThirdsComp,
  duotronicMoogtronsPedalAndLinePad,
  funkOrganPushedSixteenthStabs,
  hamamatsuTinesBalladFigure,
  hypnoAcidSixteenthLoop,
  lowBassTwoStrikesRootLine,
  lushM7ParallelRootLine,
  metalfnkleadSyncopatedFunkLine,
  mirroredbassInvertedAnswerLine,
  moog55StringsSuspensionWriting,
  moogProSoloGlideLead,
  museRunnerFloatingArrivalLead,
  petrichorOffbeatCompingFigure,
  polyphonicPowerBrassStabCycle,
  pressureRepeatedNoteBuild,
  replicantXdInnerVoicePad,
  roadzBellSixthsBalladFigure,
  sawLeadOctaveCut,
  sawteethDuoDancerCrossingStabs,
  showMeLoveOrganStab,
  softOrchestraSlowChanges,
  swollenPadStaggeredStack,
  terrorBassClosingSemitoneLine,
  thrillerSynthRiff,
  triangleLeadRiseAndFallLine,
  triplet5thsStackedFifthsLadder,
  voxHumanaRigidColdPopLine,
]

export {
  acidTracksLine,
  acidWigglerWideningWiggleLine,
  aegeanOrganPhrygianFigure,
  anEndingAscentPad,
  bellbounceSparseBellPattern,
  bladeRunnerBluesLead,
  blueMondayBass,
  brewTimeMajorSeventhHold,
  brokenToyMusicBoxStumble,
  celestialFixedStarPad,
  cloudLevelSharedTopDrift,
  detroitFunkAeolianMachineLoop,
  droneTonicPedalUnderTheChanges,
  duoOrgParallelThirdsComp,
  duotronicMoogtronsPedalAndLinePad,
  funkOrganPushedSixteenthStabs,
  hamamatsuTinesBalladFigure,
  hypnoAcidSixteenthLoop,
  lowBassTwoStrikesRootLine,
  lushM7ParallelRootLine,
  metalfnkleadSyncopatedFunkLine,
  mirroredbassInvertedAnswerLine,
  moog55StringsSuspensionWriting,
  moogProSoloGlideLead,
  museRunnerFloatingArrivalLead,
  petrichorOffbeatCompingFigure,
  polyphonicPowerBrassStabCycle,
  pressureRepeatedNoteBuild,
  replicantXdInnerVoicePad,
  roadzBellSixthsBalladFigure,
  sawLeadOctaveCut,
  sawteethDuoDancerCrossingStabs,
  seventiesElectroPnoRhodesTurnaround,
  showMeLoveOrganStab,
  softOrchestraSlowChanges,
  swollenPadStaggeredStack,
  terrorBassClosingSemitoneLine,
  threeOscBassLoveRootOctaveFigure,
  thrillerSynthRiff,
  triangleLeadRiseAndFallLine,
  triplet5thsStackedFifthsLadder,
  voxHumanaRigidColdPopLine,
}

/**
 * §5A.7/#598. **The entries `/riffs` lists: the six named for a record.** A figure named for a
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
