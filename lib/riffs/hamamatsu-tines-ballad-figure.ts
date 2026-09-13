import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The Hamamatsu Tines ballad figure**: ninths and sixths over every chord, entering on
 * beat two, never a root.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #566). The patch is the
 * electric-piano sound; the notes below are this library's own, and the entry names no device
 * (invariant 3).
 *
 * ## Why the last bar's resolution is prose
 *
 * The original definition wanted the suspended fourth in the last bar to resolve *after* the bar
 * line, and also wanted every entry at least one beat into its chord. Those two cannot both be
 * data: a resolution after the bar line is a note on the next chord's first step, which is the
 * entry the offset forbids. The offset is the rule the checker can hold, so it is kept as
 * `onsetOffset`, and the figure ends on the suspended `Eb5` held across the bar line. Where it
 * resolves, and to what, is the fourth paragraph of the technique.
 *
 * ## Why the fourth is forbidden over the I
 *
 * Eb major's fourth is `Ab`, a semitone above the third of an Eb major seventh chord. It is the
 * avoid note, and on a sustained tine sound it sits there and rubs. As data it is one rule on
 * one chord.
 */
export const hamamatsuTinesBalladFigure: Riff = {
  id: 'hamamatsu-tines-ballad-figure',
  name: 'The Hamamatsu Tines ballad figure',
  reference: { kind: 'patch', name: 'Hamamatsu Tines' },
  bpm: { min: 64, max: 84, default: 72 },
  key: 'Eb major',
  technique: [
    'Ninths and sixths over every chord, never roots. The F over the first chord is its ninth, ' +
      'the D over the second is a ninth again, and the C and D over the third are its fifth and ' +
      'sixth. The root is the bass player’s note and the left hand’s; this line stays above ' +
      'both.',
    'Enter on beat two, every time. The chord lands, the bass lands, and then the tine comes in ' +
      'a beat behind them. Nothing in this figure is struck on a bar head.',
    'Over the second chord, step down from Eb to D late in the bar. Over the third, hold the C ' +
      'and lift to D on the last beat. Small moves, each one a step.',
    'The last bar is a suspended fourth. The Eb enters on beat three and holds across the bar ' +
      'line, and it resolves down to D on the downbeat of the next pass, under the F that ' +
      'follows. Resolve it after the bar line, never inside it.',
    'Never play Ab while the first chord is sounding. It is a semitone above the chord’s ' +
      'third, and on a held tine it rubs for the whole bar.',
    'Let every note ring into the next. The sound has a long tail and the figure is written for ' +
      'it; a short release turns a ballad into a study.',
  ],
  request: {
    id: 'hamamatsu-tines-ballad-figure',
    role: 'stab',
    priority: 1,
    character: 'soft',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  /**
   * §5A/#554. The avoid note as data, and the beat-two rule as data. Four steps is one beat.
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'I',
        degree: 4,
        reason: 'it sits a semitone above the third and is the avoid note over a major seventh chord',
      },
    ],
    onsetOffset: {
      minSteps: 4,
      reason: 'the chord and the bass land first and the tine comes in a beat behind them',
    },
  },
  harmony: {
    cycleBars: 4,
    progression: [
      { degree: 'I', bars: 1 },
      { degree: 'vi', bars: 1 },
      { degree: 'ii', bars: 1 },
      { degree: 'V', bars: 1 },
    ],
  },
  /**
   * Four bars, the whole cycle. `baseOctave: 4` puts `Eb4` at degree 1, so the figure sits in
   * the octave above middle C where a tine reads as a tine.
   *
   * The last note runs past step 64 on purpose. That is the suspension held across the bar line,
   * and the technique says where it goes.
   */
  hook: {
    id: 'hamamatsu-tines-ballad-figure-hook',
    forRole: 'stab',
    bars: 4,
    baseOctave: 4,
    notes: [
      // `I`: the ninth, F5, on beat two, held to the bar line.
      { step: 5, degree: 2, octave: 1, len: 12 },
      // `vi`: Eb5 on beat two, stepping down to D5 late in the bar.
      { step: 21, degree: 1, octave: 1, len: 6 },
      { step: 27, degree: 7, octave: 0, len: 6 },
      // `ii`: C5 on beat two, lifting to D5 on beat four.
      { step: 37, degree: 6, octave: 0, len: 8 },
      { step: 45, degree: 7, octave: 0, len: 4 },
      // `V`, suspended: the fourth, Eb5, on beat three, held across the bar line.
      { step: 57, degree: 1, octave: 1, len: 12 },
    ],
  },
  pattern: variant(
    'hamamatsu-tines-ballad-figure-grid',
    'stab',
    0,
    64,
    at('accent', 92, 5),
    on('backbeat', 21, 37, 45),
    on('offbeat', 27),
    on('downbeat', 57),
  ),
}
