import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The Muse Runner floating-arrival lead**: one late entry per chord, arriving after the
 * pad has already moved, held until the next chord is under it.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #566). The reference is a
 * preset a box ships under that name, and it is the name a reader looks the technique up by. On
 * a rig that has the box, the patch supplies the sound, and the page says to load it, because
 * `patchAffinities` names it (§5A.5, #585); the hook supplies the notes, and every one of them
 * is this library's own. The reference is not the box:
 * the entry names no device (invariant 3), and the title carries the patch's name because that
 * is where §5A.5 puts every reference.
 *
 * ## Why the figure is four bars of an eight-bar cycle
 *
 * The cycle is four chords at two bars each, and a riff's grid tops out at 64 steps
 * (`PATTERN_LENGTHS`). The figure is the middle pair, `VI` then `III`, because those are the two
 * chords that carry the tension notes: the raised sixth over `III` is the whole sound, and the
 * second over `VI` is what sets it up. The `i` and the `iv` either side are on the page in
 * `harmony`, and the technique says what to do over them: the same gesture with a consonant note.
 *
 * ## Why the raised sixth, and why the natural one is forbidden
 *
 * The sixth of D minor is `Bb`. Over the `III` this figure wants `B`, the raised eleventh of the
 * chord, and `alter: 1` is how a hook spells that (§4.1). The natural sixth is the note the chord
 * cannot have under it, so `constraints` forbids it as data. The same rule one chord earlier
 * forbids the lowered second over the `VI`, where `Eb` is that chord's natural fourth, a
 * semitone above its third. Both were prose in the original definition; here they are checked.
 *
 * ## Why the entries sit two beats in
 *
 * `onsetOffset.minSteps: 8`. Every entry lands half a bar after the chord it is over, so the pad
 * has already changed when the note arrives. The third note continues the `III`, so it is no
 * entry and the offset does not apply to it.
 */
export const museRunnerFloatingArrivalLead: Riff = {
  id: 'muse-runner-floating-arrival-lead',
  name: 'The Muse Runner floating-arrival lead',
  reference: { kind: 'patch', name: 'Muse Runner' },
  /**
   * §5A.5/#585. Named after the patch and written on it, so the affinity is the reference said
   * again: the page prints the patch where the rig has it, and the reference alone would not.
   */
  patchAffinities: [
    {
      name: 'Muse Runner',
      reason:
        'the figure was written on this patch: the late arrival and the vibrato after the note settles are its sound',
    },
  ],
  /** The definition's own `bpm: 66` and `range: [58, 78]`, which is the tempo window (#569). */
  bpm: { min: 58, max: 78, default: 66 },
  key: 'D minor',
  technique: [
    'Bars 3 to 6 of the cycle, over the second and third chords. The chords either side are ' +
      'the setting; these two are where the line leans.',
    'One late entry per chord. Let the pad move first, then arrive: every entry lands two beats after ' +
      'the chord has changed under it, and the wait is what makes the note sound placed rather ' +
      'than programmed.',
    'The two entries are the tension notes. The E over the second chord and the B over the ' +
      'third are each the raised eleventh of the chord under them. Everything else in the figure ' +
      'is consonant and exists to make those two land.',
    'The third note continues the chord. The B lifts to C while the same chord is still ' +
      'sounding, so it is a step within the held line and the chord gets no second arrival.',
    'Hold each entry until the next chord is already sounding, then release. The E is still ' +
      'ringing when the third chord arrives, and the C is still ringing when the fourth does.',
    'Never play Bb while the third chord is sounding, and never Eb while the second is. Each is ' +
      'the natural fourth of its chord, a semitone above the third, and either one cancels the ' +
      'raised fourth the line is built on.',
    'Over the first and fourth chords, do the same thing with a chord tone: one note, two beats ' +
      'late, held past the change. The A over the first chord and the A falling to G over the ' +
      'fourth are the plain version of the gesture.',
    'Wide vibrato, arriving after the note has settled. The note should be still for a moment ' +
      'before it starts to move.',
  ],
  request: {
    id: 'muse-runner-floating-arrival-lead',
    role: 'lead',
    priority: 1,
    character: 'bright',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  /**
   * §5A/§4.1. The four-chord cycle the four bars below sit inside. The extensions the original
   * definition wrote, an added ninth on the `i`, a major seventh on the `VI` and the `III`, and a
   * raised eleventh on the `III`, are not expressible as degrees; the technique names the two
   * that matter, and the hook's spelling carries the raised eleventh (§5A.5).
   */
  figureStartsAtBar: 3,

  /**
   * §5A/#554. The two forbidden notes, as data. The original definition wrote them as pitch
   * classes; a degree holds in any key this is played in, and `alter` says which spelling of the
   * degree is the wrong one.
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'VI',
        degree: 2,
        alter: -1,
        reason: 'the chord’s natural fourth sits a semitone above its third and cancels the raised one the line plays',
      },
      {
        chord: 'III',
        degree: 6,
        reason: 'the chord’s natural fourth cancels the raised one it exists for',
      },
    ],
    onsetOffset: {
      minSteps: 8,
      reason: 'the pad moves first and the note arrives after it; an entry on the change pins it',
    },
  },
  harmony: {
    cycleBars: 8,
    progression: [
      { degree: 'i', bars: 2 },
      { degree: 'VI', bars: 2 },
      { degree: 'III', bars: 2 },
      { degree: 'iv', bars: 2 },
    ],
  },
  /**
   * Four bars: two over `VI`, two over `III`. `baseOctave: 4` puts the line above middle C.
   *
   * The lengths overrun their chords on purpose. `E5` is still sounding when the `III` arrives at
   * step 33, and `C5` runs past step 64 into the `iv`. That is the fifth paragraph above, as data.
   */
  hook: {
    id: 'muse-runner-floating-arrival-lead-hook',
    forRole: 'lead',
    bars: 4,
    baseOctave: 4,
    notes: [
      // `VI` runs bars 3-4, figure steps 1-32. Step 9 is two beats in.
      { step: 9, degree: 2, octave: 1, len: 26 },
      // `III` runs bars 5-6, figure steps 33-64. Step 41 is two beats after it arrives.
      { step: 41, degree: 6, octave: 0, len: 12, alter: 1 },
      // Not an entry: the same chord, the rise off the held B. Runs past the figure into the `iv`.
      { step: 53, degree: 7, octave: 0, len: 20 },
    ],
  },
  pattern: variant(
    'muse-runner-floating-arrival-lead-grid',
    'lead',
    0,
    64,
    at('accent', 84, 9),
    on('downbeat', 41, 53),
  ),
}
