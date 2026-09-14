import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The Muse Runner floating-arrival lead**: a six-chord line in F# minor, one late entry
 * per chord and a contour inside each, arriving after the pad has already moved and sounding
 * until the next chord is under it.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #566). The reference is a
 * preset a box ships under that name, and it is the name a reader looks the technique up by. On
 * a rig that has the box, the patch supplies the sound, and the page says to load it, because
 * `patchAffinities` names it (§5A.5, #585); the hook supplies the notes, and every one of them
 * is this library's own. The reference is not the box:
 * the entry names no device (invariant 3), and the title carries the patch's name because that
 * is where §5A.5 puts every reference.
 *
 * ## The whole cycle, and why the first version carried a third of one (#603)
 *
 * The line is the operator's, played on this patch over `i VI iv I IV v` in F# minor, two bars a
 * chord: thirteen notes over twelve bars. The first published version was three notes over four
 * bars of a different cycle, cut down because its docstring believed a riff's grid capped the
 * figure at four bars. It does not. `PATTERN_LENGTHS` caps the **grid** at 64 steps; a hook runs
 * as long as it needs to, and `drone-study` already holds one for sixteen bars. §5A.2 says how
 * the two lengths meet: the grid repeats beneath the line, so what it marks has to be something
 * that recurs on the same step of every repetition. Here that is the arrival, two beats into each
 * chord, at steps 9 and 41 of a four-bar grid that covers two chords a pass.
 *
 * ## What the grid strikes, and what it does not
 *
 * Six strikes, one per chord, and nothing between them. Every other note in the line is a move
 * *inside* a chord the pad is still holding: the drop to `A4` late in the first, the step down
 * through `E5` to `D5` in the second, the neighbour `C#5` and back in the third, the lift to
 * `F#5` in the fifth, the resolution to `E4` in the sixth. They are slurred off the held entry,
 * which is why they are in the hook and not on the grid — a strike on each would turn a line
 * into a sequence.
 *
 * ## The two raised notes, and where the line clears before them
 *
 * `I` and `IV` are the pair F# minor does not own, and the melody goes with them: `A#4` over the
 * F# major, `D#5` over the B. Both are the key's own degree with `alter: 1` (§4.1), and the
 * natural spelling of each is forbidden as data over its chord, because a natural third against
 * the raised one is the turn collapsing. Each chord's last note hangs over the change into the
 * next chord except the one before the `I`: the `D5` closing the `iv` clears before the bar
 * line, so the raised third arrives on air rather than a semitone above a note still sounding.
 *
 * ## Why the entries sit two beats in
 *
 * `onsetOffset.minSteps: 8`. Every entry lands half a bar after the chord it is over, so the pad
 * has already changed when the note arrives. The moves within a chord are not entries and the
 * offset does not apply to them.
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
  key: 'F# minor',
  technique: [
    'Six chords, twelve bars, and the line covers all of them. Three minor chords, then the ' +
      'pair the key does not own, then the minor fifth to take it back.',
    'One late entry per chord. Let the pad move first, then arrive: every entry lands two beats ' +
      'after the chord has changed under it, and the wait is what makes the note sound placed ' +
      'rather than programmed.',
    'The moves inside a chord are slurred, not struck. The drop to A late in the first chord, ' +
      'the step down through E to D in the second, the neighbour C# and back in the third, the ' +
      'lift to F# in the fifth: each is played off the held note without a new attack, so the ' +
      'chord gets one arrival and the line keeps moving.',
    'The fourth and fifth chords are where the key turns major, and the line goes with it: A# ' +
      'over the F# major and D# over the B, each a semitone above what the key gives you. Play ' +
      'the natural note and the turn disappears.',
    'Hold each chord’s last note until the next chord is already sounding, then release, ' +
      'except into the F# major. There the D closing the third chord clears before the bar ' +
      'line, so the raised third arrives on air.',
    'The last chord resolves down: G# held, then E a major third below it, still ringing when ' +
      'the cycle comes round. Leaving the line on the G# unresolved is the other ending, and ' +
      'it works when the pad is going round again; take the E when it is the last time through.',
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
   * §5A/§4.1. The whole cycle, and the figure starts where it does: bar 1 of twelve. Explicit
   * rather than defaulted so the alignment reads as a decision beside the cycle it aligns with.
   */
  figureStartsAtBar: 1,

  /**
   * §5A/#554. The rules as data. The two forbidden notes are the natural spellings of the two
   * raised ones: the key's third over the borrowed `I`, the key's sixth over the borrowed `IV`.
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
      minSteps: 8,
      reason: 'the pad moves first and the note arrives after it; an entry on the change pins it',
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
   * Twelve bars, thirteen notes. `baseOctave: 4` puts the line above middle C.
   *
   * Each chord holds 32 steps: `i` 1–32, `VI` 33–64, `iv` 65–96, `I` 97–128, `IV` 129–160, `v`
   * 161–192. The entry is eight steps into each. The last note of a chord runs two steps past
   * the change, except the `D5` before the `I`, which stops at the bar line — the fifth
   * paragraph above, as data. The `E4` runs past step 192 into the next pass's `i`.
   */
  hook: {
    id: 'muse-runner-floating-arrival-lead-hook',
    forRole: 'lead',
    bars: 12,
    baseOctave: 4,
    notes: [
      // `i`. The fifth, held; the third late in the second bar.
      { step: 9, degree: 5, octave: 0, len: 16 },
      { step: 25, degree: 3, octave: 0, len: 10 },
      // `VI`. The tonic an octave up, stepping down through the seventh to the sixth.
      { step: 41, degree: 1, octave: 1, len: 12 },
      { step: 53, degree: 7, octave: 0, len: 4 },
      { step: 57, degree: 6, octave: 0, len: 10 },
      // `iv`. The sixth held, its lower neighbour, and back. Stops at the bar line.
      { step: 73, degree: 6, octave: 0, len: 12 },
      { step: 85, degree: 5, octave: 0, len: 4 },
      { step: 89, degree: 6, octave: 0, len: 8 },
      // `I`. The raised third, arriving late and left hanging over the change.
      { step: 105, degree: 3, octave: 0, len: 26, alter: 1 },
      // `IV`. The raised sixth, lifting to the tonic an octave up.
      { step: 137, degree: 6, octave: 0, len: 12, alter: 1 },
      { step: 149, degree: 1, octave: 1, len: 14 },
      // `v`. The second, resolving down to the seventh below the tonic: `octave: -1`, because
      // degree 7 at octave 0 is `E5`, above the tonic rather than a major third below the `G#`.
      { step: 169, degree: 2, octave: 0, len: 16 },
      { step: 185, degree: 7, octave: -1, len: 10 },
    ],
  },
  /**
   * §5A.2. A four-bar grid under a twelve-bar line, so it repeats three times, and it marks only
   * what recurs on the same step of every pass: the entry two beats into each chord, at 9 and
   * 41. Across the three passes that is steps 9, 41, 73, 105, 137 and 169 of the cycle, the six
   * onsets the hook enters a chord on, and nothing a held note is slurred through.
   */
  pattern: variant(
    'muse-runner-floating-arrival-lead-grid',
    'lead',
    0,
    64,
    at('accent', 84, 9),
    on('downbeat', 41),
  ),
}
