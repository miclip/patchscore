import type { Riff } from '../core/riff'

/**
 * §5A. **The An Ending (Ascent) pad**: one held note per chord, sixteen bars, the line climbing
 * by step across the whole figure to a single peak, and then it stops.
 *
 * **Named after a recording, and not transcribed from one** (§5A.5). Every note below is this
 * library's own: the figure was played on the box before it was written down, and what is here
 * is what survived that. Nothing is lifted from the record. What the record is the reference
 * *for* is a way of writing: a slow vocal-synth line that rises and does not resolve, the harmony
 * turning over while almost nothing moves, and a title that names the shape.
 *
 * **Names no device** (invariant 3). `pad`, `soft`, a key, and a progression in roman numerals,
 * and no factory patch either; the last section says why not.
 *
 * ## The first record-named `pad`, and the first figure with a shape across the whole of it
 *
 * Every record-named entry before this one is `acid`, `lead`, `bass-mid` or `stab`. The two slow
 * pads the library had, `moog-55-strings-suspension-writing` and `soft-orchestra-slow-changes`,
 * are both eight-bar loops: the line comes back round. This one does not. Seven steps up, one
 * leap of a minor third to the peak, and the figure ends there. If the leap does not feel like an
 * arrival, the seven steps before it were too eventful.
 *
 * ## Two fourths that never resolve, and why no rule resolves them
 *
 * The Ab over the Ebm and the closing Gb over the Db are each a fourth above the chord's root,
 * not in the chord, and left hanging. That is the deliberate difference from the Moog 55 Strings
 * entry, whose whole lesson is *resolving each suspension in the second bar of its chord and
 * never the first*. Here the suspension is the sound, and the second one is the last thing the
 * figure says. So there is no `forbiddenDegrees` and no rule of any kind that would resolve them:
 * a `ForbiddenDegree` holds for the whole of a chord, and the notes it would refuse are the two
 * this figure exists to leave open. `test/riff.test.ts` asserts the two fourths are there and
 * that nothing follows the last one.
 *
 * ## The harmony turns over while almost nothing moves
 *
 * Bb and Db are in four of the five chords. Voiced as inversions, chords 1→2, 2→3 and 6→7 each
 * move one note by a step while the chord changes name, and the line above them moves by a step
 * too. The chord table is root-only numerals (#569); the voicing is the technique's.
 *
 * ## Everything lands on the bar head
 *
 * The opposite of the floating figures. `blade-runner-blues-lead` and
 * `muse-runner-floating-arrival-lead` enter late and carry an `onsetOffset` saying so; here every
 * note enters on its chord's first step and holds all thirty-two. There is no `onsetOffset`,
 * because an offset of zero is not a rule the schema can state (`minSteps` is at least 1), which
 * is what `vox-humana-rigid-cold-pop-line` records, and the technique says it in words.
 *
 * ## A `pad`, so a hook and nothing else
 *
 * `pad` is in `NON_PATTERN_BEARING_ROLES`, so a riff on it is its hook alone (§5A.2, #608): no
 * `pattern`, and no `reArticulatesHook` in either spelling. The articulation is the note
 * lengths, and the notes carry them.
 *
 * ## Written for a vox humana sound, and carrying no affinity for the patch of that name
 *
 * The figure was played with a vox humana in mind: a vocal stop, an organ voice imitating the
 * singing voice, and a line that is sung rather than struck. The one box in this library that
 * ships a patch called *Vox Humana* has no recipe that builds that sound. Its folder weighed the
 * pairing and declined it, because none of its recipes makes a formant, and a pairing that is
 * merely the nearest recipe would send a reader to load a sound the guide then contradicts.
 * `affinePatch` reads the *recipe's* patch, so an affinity here would fail
 * `test/riff.test.ts`'s check that every affinity names a patch some recipe authors, and would
 * render nothing even if it passed. That is why there is no `patchAffinities` on this entry: not
 * an omission, and not `blade-runner-blues-lead`'s shape, which works only because a recipe on
 * that box carries *Muse Runner*. The next person who reaches for the pairing should find the
 * answer here. A judgement made at the box beats a convenience a riff wants.
 *
 * ## Not the Vox Humana Explore figure either
 *
 * `presetSession` links a factory patch to exactly one figure and throws on a second. *Vox
 * Humana* already has `vox-humana-rigid-cold-pop-line`, and all twelve Muse patches have figures,
 * so there is no free slot. That entry must not be displaced: it is the only figure in the
 * library that lands everything dead on the grid, authored as the deliberate opposite of the
 * floating-arrival figures, and this pad is not a replacement for that lesson. So this entry is
 * `reference: { kind: 'record' }`, found by the record and nowhere under the box, and the next
 * person should not try to make it the Explore entry.
 */
export const anEndingAscentPad: Riff = {
  id: 'an-ending-ascent-pad',
  name: 'The An Ending (Ascent) pad',
  reference: { kind: 'record', name: 'An Ending (Ascent)' },
  bpm: { min: 48, max: 62, default: 54 },
  key: 'Bb minor',
  technique: [
    'Eight chords, sixteen bars, one note each. The line climbs by step from the fifth of the ' +
      'first chord to the root of the seventh, then leaps a minor third to the peak over the ' +
      'last, and stops. Nothing comes back round.',
    'Every note enters on the bar head with its chord and holds until the chord moves. No late ' +
      'entries, no notes pushed ahead: the line moves exactly when the harmony does, and the ' +
      'slowness is the whole of the feel.',
    'Two notes are a fourth above the chord and stay there: the Ab over the Eb minor and the ' +
      'Gb over the last Db. Neither resolves. Leave them hanging; the second is the last thing ' +
      'the figure says.',
    'Voice the chords so that Bb and Db stay put. They are in four of the five chords, and ' +
      'going from the first to the second, the second to the third, and the sixth to the ' +
      'seventh, one note moves by a step while the chord changes name.',
    'The seven steps before the peak should be uneventful. If the leap to the Gb does not feel ' +
      'like an arrival, something before it was too busy.',
    'Slow attack, slow release, and let each note still be swelling when the next chord ' +
      'arrives under it. A little vibrato reads as breath; none at all reads as an organ.',
  ],
  request: {
    id: 'an-ending-ascent-pad',
    role: 'pad',
    priority: 1,
    character: 'soft',
    sustain: 'continuous',
  },
  /**
   * §5A/§4.1. From bar 1. `i VI iv III VII VI iv III`: five chords, the `VI iv III` turn twice,
   * and no `V` anywhere, which is why nothing pulls the line home.
   */
  figureStartsAtBar: 1,
  harmony: {
    cycleBars: 16,
    progression: [
      { degree: 'i', bars: 2 },
      { degree: 'VI', bars: 2 },
      { degree: 'iv', bars: 2 },
      { degree: 'III', bars: 2 },
      { degree: 'VII', bars: 2 },
      { degree: 'VI', bars: 2 },
      { degree: 'iv', bars: 2 },
      { degree: 'III', bars: 2 },
    ],
  },
  /**
   * Sixteen bars, eight notes. `baseOctave: 3` puts degree 1 at `Bb3`, so the opening fifth is
   * `F4` and the last four notes sit an octave up, `Bb4` to `Gb5`.
   *
   * Each chord holds 32 steps, chord *n* from `(n-1)*32+1` to `n*32`, and each note enters on
   * its chord's first step and holds all 32. **The lengths are not authored; they follow from
   * the part**, as they do on the Moog 55 Strings entry: a pad over two-bar chords sounds each
   * note until the next one.
   */
  hook: {
    id: 'an-ending-ascent-pad-hook',
    forRole: 'pad',
    bars: 16,
    baseOctave: 3,
    notes: [
      // `i`: F4, the fifth.
      { step: 1, degree: 5, octave: 0, len: 32 },
      // `VI`: Gb4, the root.
      { step: 33, degree: 6, octave: 0, len: 32 },
      // `iv`: Ab4, a fourth above the root, not in the chord, and it never resolves.
      { step: 65, degree: 7, octave: 0, len: 32 },
      // `III`: Bb4, a sixth above the root, not in the chord.
      { step: 97, degree: 1, octave: 1, len: 32 },
      // `VII`: C5, the third.
      { step: 129, degree: 2, octave: 1, len: 32 },
      // `VI`: Db5, the fifth.
      { step: 161, degree: 3, octave: 1, len: 32 },
      // `iv`: Eb5, the root.
      { step: 193, degree: 4, octave: 1, len: 32 },
      // `III`: Gb5, the peak, a fourth above the root, unresolved, and nothing follows.
      { step: 225, degree: 6, octave: 1, len: 32 },
    ],
  },
}
