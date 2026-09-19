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
import { voxHumanaFourPartVoiceLeading } from './vox-humana-four-part-voice-leading'
import { brewTimeMajorSeventhHold } from './brew-time-major-seventh-hold'
import { brokenToyMusicBoxStumble } from './broken-toy-music-box-stumble'
import { cloudLevelSharedTopDrift } from './cloud-level-shared-top-drift'
import { hypnoAcidSixteenthLoop } from './hypno-acid-sixteenth-loop'
import { lushM7ParallelRootLine } from './lush-m7-parallel-root-line'
import { metalfnkleadSyncopatedFunkLine } from './metalfnklead-syncopated-funk-line'
import { mirrorInteriorTwoHandSplit } from './mirror-interior-two-hand-split'
import { mirroredbassInvertedAnswerLine } from './mirroredbass-inverted-answer-line'
import { petrichorOffbeatCompingFigure } from './petrichor-offbeat-comping-figure'
import { pressureRepeatedNoteBuild } from './pressure-repeated-note-build'
import { replicantXdInnerVoicePad } from './replicant-xd-inner-voice-pad'
import { roadzBellSixthsBalladFigure } from './roadz-bell-sixths-ballad-figure'
import { swollenPadStaggeredStack } from './swollen-pad-staggered-stack'
import { acidWigglerSlideLine } from './acid-wiggler-slide-line'
import { celestialConvergingVoicesPad } from './celestial-converging-voices-pad'
import { duoOrgParallelThirdsComp } from './duo-org-parallel-thirds-comp'
import { duotronicMoogtronsPedalAndLinePad } from './duotronic-moogtrons-pedal-and-line-pad'
import { funkOrganEarlySixteenthStabs } from './funk-organ-early-sixteenth-stabs'
import { harpCChordArpeggiatedHold } from './harp-c-chord-arpeggiated-hold'
import { lowBassEarlyRootLine } from './low-bass-early-root-line'
import { sawLeadQuestionAndAnswerLine } from './saw-lead-question-and-answer-line'
import { sawteethDuoDancerCrossingStabs } from './sawteeth-duo-dancer-crossing-stabs'
import { terrorBassFlatTwoCadenceLine } from './terror-bass-flat-two-cadence-line'
import { triangleLeadChromaticApproachLine } from './triangle-lead-chromatic-approach-line'
import { triplet5thsStackedFifthsLadder } from './triplet-5ths-stacked-fifths-ladder'
import { iFeelLoveOneShapeArp } from './i-feel-love-one-shape-arp'
import { innerCityLifeHeldSub } from './inner-city-life-held-sub'
import { stringsOfLifeWalkingEntryStab } from './strings-of-life-walking-entry-stab'
import { brashBassGhostNoteGroove } from './brash-b-ss-ghost-note-groove'
import { fifthInLineFifthsBeforeTheRoot } from './5th-in-line-fifths-before-the-root'
import { synthGongDecaySpacedStrikes } from './synth-gong-decay-spaced-strikes'
import { uberSubOctavePumpLine } from './uber-sub-octave-pump-line'

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
 * named one reference and filed itself under another cannot parse. Nine entries are `record`
 * references and thirty-seven are `patch` references, and the kind decides where an entry
 * surfaces (#598): the nine are `/riffs`, and each of the thirty-seven is a page under the box
 * that ships its patch. See `RECORD_RIFFS`.
 *
 * **The figures are ours.** Every hook below was written for this library to teach the technique
 * the reference stands for. A reader who wants the record should go and listen to the record.
 *
 * ## The nine records, which is not nine of the same thing
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
 * The last three close the gaps the first six shared (#638): every one of the six was in a
 * minor key, none ran above 128, and `sub`, `arp` and `texture` had none.
 * `strings-of-life-walking-entry-stab` is the first in a major key, one pitch entering a
 * sixteenth later each bar and never on a beat, reheard as four chords pass under it. `inner-city-life-held-sub` is the first above
 * 128 and the first record-named `sub`, roots held for whole bars at 170, and the one entry
 * whose lesson is where a note does not move. `i-feel-love-one-shape-arp` is the first
 * record-named `arp`, one interval shape in sixteenths that never varies. All three were
 * written as tables at a desk; none is transcribed from its record, which is the whole of
 * what §5A.5 asks and all that is claimed.
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
 * The thirteenth on that box is `mirror-interior-two-hand-split` (#654), and it is the one
 * entry in the library written for a patch that loads with the keyboard split: a bass walked
 * in the left hand under a triad the right hand holds for the arpeggiator, with the two moving
 * in contrary motion. It is an `arp` with `polyphony: 4` and no grid, and it does not carry
 * `arpeggiatedHold`, because that flag says the whole figure is held under an arpeggiator and
 * only half of this one is. Four held overstates what sounds, and the entry says so; one voice
 * would understate it and claim the bass is arpeggiated, which it is not.
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
 * no grid, four notes at most, asking for four voices because the box has them and nothing
 * yet cites its arpeggiator (`features.arpeggiator`, #645); and every POLY figure peaks at
 * four. What the twelve add to the
 * library is the first four-note `pad`s (the first seventeen's two pads are the top voice of an
 * ensemble), a staggered entry whose polyphony is what *sounds* rather than what *starts*
 * (`swollen-pad-…`), and a line whose every note is a chord (`lush-m7-…`).
 * `test/korg-minilogue-xd.test.ts` holds each to the printed mode.
 *
 * ## The twelve for the Subsequent 37's presets (§5A.5, #624, #643, #645)
 *
 * The third box with a patch list, off its own screen at firmware 1.2.0, and the first whose
 * figures are lines of one or two notes because the box plays two. #624 wrote twelve, one per
 * described preset, and #643 replaced eight of them: measured across the library, the entries
 * written from a name alone had the fewest distinct pitches, and a figure has to be worth
 * sitting down with. `DRONE` lost its figure outright and keeps a use line, the second use of
 * #617's subset rule. #645 added `harp-c-chord-…`, the library's first arpeggiated hold
 * (§5A.2, §12.4): four notes held for the box's arpeggiator to sound one at a time, so the
 * hand holds four and the part costs one voice, and a two-note box plays a four-note hold on
 * a one-note recipe. That is the one figure on this box wider than two notes, and it is wider
 * only in the hand. The box now describes thirteen presets and twelve carry a figure. Five
 * spend the second note: `duo-org-…` parallel, `sawteeth-duo-dancer-…` contrary and
 * `duotronic-moogtrons-…` oblique, the three species of two-voice motion #624 wrote and #643
 * left alone; `funk-organ-…`, dyads on the sixteenth before every beat; and `celestial-…`, two
 * voices closing from an octave to a third. The six single lines are `sub`, `bass-mid`,
 * `acid`, `arp` and both leads, and each has one thing to teach: a bass that arrives an eighth
 * early, a flat-two cadence in phrygian, a 303 line where the slides are the notes, a question
 * answered upside down, a chromatic approach to every bar head, and the stacked fifths #624
 * wrote. What the twelve add to the library is the first `sub` (`low-bass-…`), the first
 * one-bar figure (`acid-wiggler-…`, sixteen steps because that is the size of an acid loop),
 * the first two-note counterpoint on a two-note box, and the first arpeggiated hold.
 * `test/moog-subsequent-37.test.ts` holds each to two notes sounding at most, and #643's seven
 * to their tables.
 */
export const RIFFS: readonly Riff[] = [
  threeOscBassLoveRootOctaveFigure,
  fifthInLineFifthsBeforeTheRoot,
  seventiesElectroPnoRhodesTurnaround,
  acidTracksLine,
  acidWigglerSlideLine,
  aegeanOrganPhrygianFigure,
  anEndingAscentPad,
  bellbounceSparseBellPattern,
  bladeRunnerBluesLead,
  blueMondayBass,
  brashBassGhostNoteGroove,
  brewTimeMajorSeventhHold,
  brokenToyMusicBoxStumble,
  celestialConvergingVoicesPad,
  cloudLevelSharedTopDrift,
  detroitFunkAeolianMachineLoop,
  duoOrgParallelThirdsComp,
  duotronicMoogtronsPedalAndLinePad,
  funkOrganEarlySixteenthStabs,
  hamamatsuTinesBalladFigure,
  harpCChordArpeggiatedHold,
  hypnoAcidSixteenthLoop,
  iFeelLoveOneShapeArp,
  innerCityLifeHeldSub,
  lowBassEarlyRootLine,
  lushM7ParallelRootLine,
  metalfnkleadSyncopatedFunkLine,
  mirrorInteriorTwoHandSplit,
  mirroredbassInvertedAnswerLine,
  moog55StringsSuspensionWriting,
  moogProSoloGlideLead,
  museRunnerFloatingArrivalLead,
  petrichorOffbeatCompingFigure,
  polyphonicPowerBrassStabCycle,
  pressureRepeatedNoteBuild,
  replicantXdInnerVoicePad,
  roadzBellSixthsBalladFigure,
  sawLeadQuestionAndAnswerLine,
  sawteethDuoDancerCrossingStabs,
  showMeLoveOrganStab,
  softOrchestraSlowChanges,
  stringsOfLifeWalkingEntryStab,
  swollenPadStaggeredStack,
  synthGongDecaySpacedStrikes,
  terrorBassFlatTwoCadenceLine,
  thrillerSynthRiff,
  triangleLeadChromaticApproachLine,
  triplet5thsStackedFifthsLadder,
  uberSubOctavePumpLine,
  voxHumanaFourPartVoiceLeading,
]

export {
  acidTracksLine,
  acidWigglerSlideLine,
  aegeanOrganPhrygianFigure,
  anEndingAscentPad,
  bellbounceSparseBellPattern,
  bladeRunnerBluesLead,
  blueMondayBass,
  brewTimeMajorSeventhHold,
  brokenToyMusicBoxStumble,
  celestialConvergingVoicesPad,
  cloudLevelSharedTopDrift,
  detroitFunkAeolianMachineLoop,
  duoOrgParallelThirdsComp,
  duotronicMoogtronsPedalAndLinePad,
  funkOrganEarlySixteenthStabs,
  hamamatsuTinesBalladFigure,
  harpCChordArpeggiatedHold,
  hypnoAcidSixteenthLoop,
  iFeelLoveOneShapeArp,
  innerCityLifeHeldSub,
  lowBassEarlyRootLine,
  lushM7ParallelRootLine,
  metalfnkleadSyncopatedFunkLine,
  mirrorInteriorTwoHandSplit,
  mirroredbassInvertedAnswerLine,
  moog55StringsSuspensionWriting,
  moogProSoloGlideLead,
  museRunnerFloatingArrivalLead,
  petrichorOffbeatCompingFigure,
  polyphonicPowerBrassStabCycle,
  pressureRepeatedNoteBuild,
  replicantXdInnerVoicePad,
  roadzBellSixthsBalladFigure,
  sawLeadQuestionAndAnswerLine,
  sawteethDuoDancerCrossingStabs,
  seventiesElectroPnoRhodesTurnaround,
  showMeLoveOrganStab,
  softOrchestraSlowChanges,
  stringsOfLifeWalkingEntryStab,
  swollenPadStaggeredStack,
  terrorBassFlatTwoCadenceLine,
  threeOscBassLoveRootOctaveFigure,
  thrillerSynthRiff,
  triangleLeadChromaticApproachLine,
  triplet5thsStackedFifthsLadder,
  voxHumanaFourPartVoiceLeading,
}

/**
 * §5A.7/#598. **The entries `/riffs` lists: the nine named for a record.** A figure named for a
 * factory patch surfaces on the box that ships the patch, at `/devices/<id>/presets/<patch>`,
 * and nowhere else — `/riffs/<its id>` is a 404. One filter on `reference.kind`, here, so the
 * catalogue, its static routes, the search and the sitemap cannot disagree about which
 * thirty-seven left. Not a second content type: the thirty-seven stay in this folder, under the
 * same schema and the same tests, and `presetSession` finds each by the patch its `reference`
 * names.
 */
export const RECORD_RIFFS: readonly Riff[] = RIFFS.filter((r) => r.reference.kind === 'record')

const BY_ID: ReadonlyMap<RiffId, Riff> = new Map(RIFFS.map((r) => [r.id, r]))

/** `undefined` for an unknown id — a caller with a stale link is not an exception. */
export function riffById(id: RiffId): Riff | undefined {
  return BY_ID.get(id)
}
