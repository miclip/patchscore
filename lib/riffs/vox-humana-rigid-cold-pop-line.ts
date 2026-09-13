import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The Vox Humana rigid cold-pop line**: one note per chord on the grid, marching with the
 * harmony, and a single semitone of motion in the last bar.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #566). The patch supplies
 * the sound on a rig that ships it; the notes are this library's own, and the entry names no
 * device (invariant 3).
 *
 * ## The opposite discipline to the floating-arrival entries
 *
 * `blade-runner-blues-lead` and `muse-runner-floating-arrival-lead` enter late and hold past the
 * change. This one does neither: every note lands on a beat, the first of each bar on the bar
 * head, and nothing sustains across a chord. The `onsetOffset` those two carry is therefore
 * absent here on purpose. An offset of zero is not a rule the schema can state (`minSteps` is at
 * least 1), and the technique says it in words instead.
 *
 * ## Why the natural seventh is forbidden over the V
 *
 * A minor's seventh is `G`. The `V` is E major, whose third is `G#`, and the figure plays it as
 * `alter: 1` on degree 7. A natural `G` sounding over that chord flattens the one major-dominant
 * lift the loop has, so it is forbidden as data. The `G#` itself is the raised spelling of the
 * same degree, which the rule does not touch.
 */
export const voxHumanaRigidColdPopLine: Riff = {
  id: 'vox-humana-rigid-cold-pop-line',
  name: 'The Vox Humana rigid cold-pop line',
  reference: { kind: 'patch', name: 'Vox Humana' },
  bpm: { min: 108, max: 126, default: 116 },
  key: 'A minor',
  technique: [
    'Everything lands exactly on the grid. No swing, no late entries, no notes pushed ahead of ' +
      'the beat. The line marches with the harmony instead of floating over it.',
    'One note per chord, on the bar head, held until the chord moves. Over the second chord the ' +
      'E steps down to D on beat three, and that is the only motion in the first three bars.',
    'The G# in the last bar is the single moment of motion, so it has to be dead on time. It is ' +
      'the third of the E major chord under it, and the line touches A and comes straight back.',
    'Never play G natural while the fourth chord is sounding. It is the seventh of the key, and ' +
      'against the E major it flattens the only lift the loop has.',
    'Play it with no vibrato and no glide. The sound is cold because nothing about it moves ' +
      'except where the notes say it does.',
  ],
  request: {
    id: 'vox-humana-rigid-cold-pop-line',
    role: 'lead',
    priority: 1,
    character: 'clean',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  /**
   * §5A/#554. One rule, as data: the natural seventh over the `V`. The `G#` the figure plays is
   * the same degree with `alter: 1`, so it passes; a `G` over that bar does not parse.
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'V',
        degree: 7,
        reason: 'the natural seventh of the key flattens the only major-V lift in the loop',
      },
    ],
  },
  harmony: {
    cycleBars: 4,
    progression: [
      { degree: 'i', bars: 1 },
      { degree: 'VI', bars: 1 },
      { degree: 'iv', bars: 1 },
      { degree: 'V', bars: 1 },
    ],
  },
  /**
   * Four bars, the whole cycle. `baseOctave: 4` puts `A4` at degree 1, so the held E is `E5`.
   * Every note stops before the next chord arrives: the lengths abut the bar lines and never
   * cross them, which is the first paragraph as data.
   */
  hook: {
    id: 'vox-humana-rigid-cold-pop-line-hook',
    forRole: 'lead',
    bars: 4,
    baseOctave: 4,
    notes: [
      // `i`: E5 held for the bar.
      { step: 1, degree: 5, octave: 0, len: 16 },
      // `VI`: E5, then down to D5 on beat three.
      { step: 17, degree: 5, octave: 0, len: 8 },
      { step: 25, degree: 4, octave: 0, len: 8 },
      // `iv`: D5 held for the bar.
      { step: 33, degree: 4, octave: 0, len: 16 },
      // `V`: G#4, up to A4 on beat three, back to G#4 on beat four. The raised seventh is the
      // chord's third; the natural one is forbidden above.
      { step: 49, degree: 7, octave: -1, len: 8, alter: 1 },
      { step: 57, degree: 1, octave: 0, len: 4 },
      { step: 61, degree: 7, octave: -1, len: 4, alter: 1 },
    ],
  },
  pattern: variant(
    'vox-humana-rigid-cold-pop-line-grid',
    'lead',
    0,
    64,
    at('accent', 100, 49),
    on('downbeat', 1, 17, 25, 33, 57, 61),
  ),
}
