import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The Blade Runner Blues lead**: the turn where a minor progression goes major, and the
 * melody goes with it. One note per chord, six chords, and the two over the borrowed pair raised.
 *
 * **Named after a recording, and not transcribed from one** (§5A.5). Every note below is this
 * library's own. What the record is the reference *for* is a way of writing a lead over borrowed
 * chords: one note per chord, arriving late, held until the chord changes under it.
 *
 * **Names no device** (invariant 3). `lead`, `bright`, a grid, and a progression in roman
 * numerals. It does name a factory patch its sound aligns with (§5A.5, #585), which implies a
 * box without naming one, and is the whole of the exception.
 *
 * ## Six chords, and why the first version carried two (#603)
 *
 * The cycle is `i VI iv I IV v` in F# minor, two bars a chord. The first published version was
 * three notes over the `I` and the `IV`, with a docstring saying the cycle was longer than a
 * riff's grid could be. The grid is capped at 64 steps (`PATTERN_LENGTHS`); the hook is not, and
 * §5A.2 says how a longer line meets a shorter grid: the grid repeats, and it marks what recurs
 * on the same step of every pass. So the figure is now the whole cycle, one arrival per chord,
 * and the four minor chords are on the grid rather than left to a sentence about doing the same
 * thing over them.
 *
 * ## The skeleton, and how it differs from the Muse Runner line
 *
 * `muse-runner-floating-arrival-lead` carries the same six chords with thirteen notes: the full
 * line, with a contour inside each chord. This entry is the six notes under that line, the one
 * arrival each chord gets, so what it teaches is what the harmony does to a single held note
 * and where to place it. The two lessons are on one progression on purpose. A reader who has
 * the arrivals goes to the other entry for the moves between them.
 *
 * ## Why both notes are altered, and why that is the whole lesson
 *
 * §4.1's `alter` exists for this: the third of F# minor is `A`, and over an F# *major* chord the
 * melody wants `A#`. The sixth is `D`, and over B major it wants `D#`. Same degrees, raised, and
 * the guide says `raised 3rd` beside `A#4` rather than printing `3rd` over two different pitches.
 *
 * **The spelling is the tell that these are chord tones and not chromaticism.** `A#` is the third
 * of the F# chord under it and `D#` the third of the B; a reader who sees `Bb` and `Eb` is being
 * shown passing notes, which is a different lesson. That is why `alter` displaces a degree rather
 * than replacing it with a semitone.
 *
 * ## The entries alternate one beat and two
 *
 * The grid strikes steps 5 and 41: the first chord of each pair is entered a beat in and the
 * second two beats in, so the `I` arrives two beats late and the `IV` one beat late, which is the
 * timing the first version shipped for the turn. Both clear `onsetOffset.minSteps: 4`. Entering
 * on the bar head would pin the line to the harmonic grid, and the line floats.
 */
export const bladeRunnerBluesLead: Riff = {
  id: 'blade-runner-blues-lead',
  name: 'The Blade Runner Blues lead',
  reference: { kind: 'record', name: 'Blade Runner Blues' },
  /**
   * §5A.5/#585. The one patch this line is heard on when the rig has the box that ships it. The
   * record is a CS-80 piece and the patch is a wide-vibrato CS-80 lead: the sounds align, and
   * that is the judgement this field carries, since role and character cannot.
   */
  patchAffinities: [
    {
      name: 'Muse Runner',
      reason:
        'a wide-vibrato lead with the slow arrival the record is known for; the patch is built to that line',
    },
  ],
  bpm: { min: 56, max: 72, default: 64 },
  key: 'F# minor',
  technique: [
    'Six chords, twelve bars, one note each. Three minor chords, then the pair the key does ' +
      'not own, then the minor fifth to take it back. The line is the arrival on each chord and ' +
      'nothing between.',
    'Come in late on every chord. The entries alternate: a beat after the first chord of each ' +
      'pair, two beats after the second, so the line never lands on the change itself. That is ' +
      'what makes it sound played rather than programmed.',
    'The two entries over the borrowed chords are the major third of the chord beneath them, ' +
      'each a semitone above what the key gives you. That semitone is the whole sound. Play the ' +
      'note the key expects and the turn disappears.',
    'Never play the key’s own third or sixth while these two chords are sounding. A natural ' +
      'third against the raised one is the move collapsing, and it is the one mistake this ' +
      'figure can make.',
    'Hold each entry until the next chord is already sounding, then release. The overlap is ' +
      'where the two chords blur into each other. The one exception is going into the F# major: ' +
      'the D over the third chord stops at the bar line, so the raised third arrives on air.',
    'Over the four minor chords the note is a chord tone, held: the fifth of the first chord, ' +
      'the third of the second and of the third, the fifth of the last. The shape is what ' +
      'repeats; only the two over the turn are raised.',
  ],
  request: {
    id: 'blade-runner-blues-lead',
    role: 'lead',
    priority: 1,
    character: 'bright',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  /**
   * §5A/§4.1. The whole cycle, from bar 1. `i VI iv` is ordinary F# minor; `I` and `IV` are the
   * borrowed pair this figure is about, and `v` takes it back.
   */
  figureStartsAtBar: 1,

  /**
   * §5A/#554. The two rules this figure keeps, as data. Both were prose until now, and prose is
   * what let the first published version drift: the paragraph forbidding the collision stayed
   * true while the notes stopped keeping it.
   *
   * The forbidden pair is the same rule twice: over a borrowed major chord, the key's own third
   * or sixth is the move collapsing. Written as degrees so it holds in any key this is played in,
   * and with `alter` absent because it is the *natural* spelling that is wrong; the raised one is
   * the whole point.
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'I',
        degree: 3,
        reason: 'the natural third against the raised one is the turn collapsing',
      },
      {
        chord: 'IV',
        degree: 6,
        reason: 'the same move one chord later, and the natural sixth cancels the chord',
      },
    ],
    onsetOffset: {
      minSteps: 4,
      reason: 'the lead floats free of the harmonic grid; entering on the bar head pins it to one',
    },
  },
  harmony: {
    cycleBars: 12,
    progression: [
      { degree: 'i', bars: 2 },
      { degree: 'VI', bars: 2 },
      { degree: 'iv', bars: 2 },
      { degree: 'I', bars: 2 },
      { degree: 'IV', bars: 2 },
      { degree: 'v', bars: 2 },
    ],
  },
  /**
   * Twelve bars, six notes. `baseOctave: 4` puts the line above middle C, where a lead this
   * exposed sits (§4.1).
   *
   * Each chord holds 32 steps: `i` 1–32, `VI` 33–64, `iv` 65–96, `I` 97–128, `IV` 129–160, `v`
   * 161–192. Every note runs two steps past its chord's change except the `D5` over the `iv`,
   * which stops at step 96 so the `A#4` arrives over nothing. The `G#4` runs past step 192 into
   * the next pass's `i`, where it is the ninth.
   */
  hook: {
    id: 'blade-runner-blues-lead-hook',
    forRole: 'lead',
    bars: 12,
    baseOctave: 4,
    notes: [
      // `i`, a beat in: the fifth.
      { step: 5, degree: 5, octave: 0, len: 30 },
      // `VI`, two beats in: the tonic an octave up, which is the chord's third.
      { step: 41, degree: 1, octave: 1, len: 26 },
      // `iv`, a beat in: the sixth, which is the chord's third. Stops at the bar line.
      { step: 69, degree: 6, octave: 0, len: 28 },
      // `I`, two beats in: the raised third, left hanging over the change.
      { step: 105, degree: 3, octave: 0, len: 26, alter: 1 },
      // `IV`, a beat in: the raised sixth.
      { step: 133, degree: 6, octave: 0, len: 30, alter: 1 },
      // `v`, two beats in: the second, which is the chord's fifth.
      { step: 169, degree: 2, octave: 0, len: 26 },
    ],
  },
  /**
   * §5A.2. A four-bar grid under a twelve-bar line, repeating three times, marking only what
   * recurs on the same step of every pass: a beat into the first chord of each pair and two
   * beats into the second. Across the three passes that is steps 5, 41, 69, 105, 133 and 169,
   * the six onsets and nothing else. The accent is on 41, which is the `I` on the second pass.
   */
  pattern: variant(
    'blade-runner-blues-lead-grid',
    'lead',
    0,
    64,
    on('downbeat', 5),
    at('accent', 84, 41),
  ),
}
