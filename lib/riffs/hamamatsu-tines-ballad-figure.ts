import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The Hamamatsu Tines shell-voicing figure**: two notes a chord, the third and the
 * seventh and nothing else, and the pair turns over as the progression moves so that no voice
 * has far to go.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #566). The patch is the
 * electric-piano sound; the notes below are this library's own, and the entry names no device
 * (invariant 3).
 *
 * ## The shell
 *
 * A seventh chord's quality lives in two of its four notes. The root is the bass player's, and
 * on a tine sound a root in the right hand doubles the bass and thickens nothing. The fifth is
 * in every chord of the cycle and says nothing about which one is sounding. The third and the
 * seventh are what is left, and they are enough: `G D` is the major seventh chord, `Bb Eb` the
 * minor seventh, `Ab D` the dominant. That is the shell voicing, the electric-piano move this
 * library did not have, and the figure is nothing but shells.
 *
 * ## The pair turns over, which is why the voices barely move
 *
 * Bar by bar the lower note is the third, then the seventh, then the third, then the seventh:
 * `G4 D5` over the `I`, `Bb4 Eb5` over the `vi`, `Ab4 Eb5` over the `ii`, `Ab4 D5` over the `V`.
 * Alternate which shell tone is on the bottom and each voice moves a step or holds: the top
 * goes `D Eb Eb D`, the bottom `G Bb Ab Ab`, and the widest move in the cycle is the minor third
 * from `G` to `Bb`. Play every shell with the third on the bottom instead and the hand jumps a
 * fourth at every change. `test/riff.test.ts` holds the resolved pitches and the alternation.
 *
 * The last pair, `Ab D`, is a tritone, the one interval that names a dominant on its own, and
 * it falls a semitone on one side to `G D` on the repeat. That is the whole cadence in one
 * voice.
 *
 * ## Two strikes a bar, with the bass
 *
 * The hook holds each pair from its strike to the next, and the grid strikes it on beat one and
 * beat three (`reArticulatesHook`). The pair lands with the bass rather than after it: the root
 * and the shell together are the chord, and apart they are two fragments. So there is no
 * `onsetOffset`; entries on the bar head are the point.
 *
 * ## Why the fourth is forbidden over the I
 *
 * Eb major's fourth is `Ab`, a semitone above the `G` the first shell is built on. It is the
 * avoid note, and on a sustained tine it sits there and rubs. Unaltered, so the rule reaches
 * only the chord it names (§5A.8): the same `Ab` is the third of the `ii` and the seventh of
 * the `V`, and the figure plays it over both.
 *
 * ## What the first version was
 *
 * A colour-tone line entering on beat two, which is what `70s-electro-pno-rhodes-turnaround`
 * teaches on the same box with the flat ninth as its move. Reviewed against that shelf the
 * two were one lesson twice, and the tines took the move neither box had.
 */
export const hamamatsuTinesBalladFigure: Riff = {
  id: 'hamamatsu-tines-ballad-figure',
  name: 'The Hamamatsu Tines shell-voicing figure',
  reference: { kind: 'patch', name: 'Hamamatsu Tines' },
  bpm: { min: 64, max: 84, default: 72 },
  key: 'Eb major',
  technique: [
    'Two notes a chord: the third and the seventh, and nothing else. The root is the bass ' +
      'player’s, and on a tine a root in the right hand only doubles it. The fifth is in ' +
      'every chord here and tells you nothing about which one is sounding. Those two notes ' +
      'are the chord’s quality, and they are enough.',
    'Four chords, a bar each: E flat major seventh, C minor seventh, F minor seventh, B flat ' +
      'seventh. G and D, then B flat and E flat, then A flat and E flat, then A flat and D.',
    'Turn the pair over as you go. The third is on the bottom for the first chord, the ' +
      'seventh for the second, the third for the third, the seventh for the last. Do that and ' +
      'each hand-move is a step or a hold: the top goes D, E flat, E flat, D, and the bottom ' +
      'G, B flat, A flat, A flat. Keep the third on the bottom every time and the hand jumps ' +
      'a fourth at every change.',
    'The last pair is a tritone, A flat under D. It is the one interval that says dominant ' +
      'by itself, and on the repeat the A flat falls a semitone to G and the chord is home. ' +
      'That is the whole cadence in one voice.',
    'Two strikes a bar, on one and on three, and hold each until the next. The pair lands ' +
      'with the bass, not after it: the root and the shell together are the chord, and apart ' +
      'they are two fragments.',
    'Never play A flat while the first chord is sounding. It sits a semitone above the G the ' +
      'shell is built on, and on a held tine it rubs for the whole bar. Over the next two ' +
      'chords the same A flat is the shell.',
    'Let every pair ring into the next. The sound has a long tail and the figure is written ' +
      'for it; a short release turns a ballad into a study.',
  ],
  request: {
    id: 'hamamatsu-tines-ballad-figure',
    role: 'stab',
    priority: 1,
    character: 'soft',
    sustain: 'continuous',
    // §12.4. Two simultaneous notes: every strike is a shell.
    polyphony: 2,
    reArticulatesHook: true,
  },
  /**
   * §5A/#554. The avoid note as data, over the `I` only. No offset: the shell lands with the
   * bass, and the header says why.
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'I',
        degree: 4,
        reason: 'it sits a semitone above the third the shell is built on, and a tine holds it there',
      },
    ],
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
   * Four bars, the whole cycle. `baseOctave: 4` puts `Eb4` at degree 1, so the shells sit from
   * `G4` to `Eb5`, the octave above middle C where a tine reads as a tine. Each pair is struck
   * on beat one and beat three and held eight steps to the next strike. Within a step the notes
   * are authored bottom to top, and that order is the voicing (`resolveHook` keeps it).
   */
  hook: {
    id: 'hamamatsu-tines-ballad-figure-hook',
    forRole: 'stab',
    bars: 4,
    baseOctave: 4,
    notes: [
      // `I`, Ebmaj7: G4 D5, the third under the seventh.
      { step: 1, degree: 3, octave: 0, len: 8 },
      { step: 1, degree: 7, octave: 0, len: 8 },
      { step: 9, degree: 3, octave: 0, len: 8 },
      { step: 9, degree: 7, octave: 0, len: 8 },
      // `vi`, Cm7: Bb4 Eb5, the seventh under the third.
      { step: 17, degree: 5, octave: 0, len: 8 },
      { step: 17, degree: 1, octave: 1, len: 8 },
      { step: 25, degree: 5, octave: 0, len: 8 },
      { step: 25, degree: 1, octave: 1, len: 8 },
      // `ii`, Fm7: Ab4 Eb5, the third under the seventh. The top holds.
      { step: 33, degree: 4, octave: 0, len: 8 },
      { step: 33, degree: 1, octave: 1, len: 8 },
      { step: 41, degree: 4, octave: 0, len: 8 },
      { step: 41, degree: 1, octave: 1, len: 8 },
      // `V`, Bb7: Ab4 D5, the seventh under the third. The bottom holds; the tritone.
      { step: 49, degree: 4, octave: 0, len: 8 },
      { step: 49, degree: 7, octave: 0, len: 8 },
      { step: 57, degree: 4, octave: 0, len: 8 },
      { step: 57, degree: 7, octave: 0, len: 8 },
    ],
  },
  pattern: variant(
    'hamamatsu-tines-ballad-figure-grid',
    'stab',
    0,
    64,
    at('accent', 96, 1, 17, 33, 49),
    on('downbeat', 9, 25, 41, 57),
  ),
}
