import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The Aegean Organ Phrygian figure**: a line in D phrygian whose whole discipline is one
 * pitch class it never plays.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #566). The patch is the
 * organ; the notes are this library's own, and the entry names no device (invariant 3).
 *
 * ## The one forbidden note
 *
 * D phrygian's second is `Eb`, and the mode rests on it. `E` natural is the raised second,
 * `degree: 2, alter: 1`, and one of them collapses the mode into D minor. A raised degree is a
 * pitch the key does not have, so the rule reaches the whole piece, every chord of the cycle and
 * every note over any of them (#605). The operator's words are *one rule, and it's the whole
 * piece*, so it is one rule, named on the `i` for the reason a reader sees; a second copy on the
 * `II` said the same thing twice on the page and checked nothing the first did not (#604).
 *
 * The chord on the flat second is written `II`, the mode's own second, unaltered (#569). A `b`
 * in front of it would be measuring the chord against a major scale the piece is not in, and
 * the rule's `alter: 1` is then the one accidental on the page, on the note it forbids.
 *
 * ## Why the last chord is C minor
 *
 * The definition first wrote the fourth chord as C major, whose third is the E the same entry
 * forbids, and the operator corrected it to C minor (#605): `vii`, `C · Eb · G`, the chord the
 * mode builds on its seventh degree. The line over it is Eb falling to D.
 *
 * ## The whole cycle, from the operator, entering on the beat
 *
 * The first published version carried bars 5 to 8, entered a beat late, and said the grid capped
 * the figure at four bars. The grid is capped; the hook is not (§5A.2, #603), and the operator
 * then supplied the figure whole (#604): eight bars, two a chord, the right hand entering on the
 * beat with each chord. An organ has no attack shape, so every note speaks the instant the key
 * goes down and the phrasing is all length and release. That inverts the old `onsetOffset`,
 * which is gone rather than turned round: the definition fixes the entries on the beat and the
 * hook says so, and an offset of zero is no rule at all.
 *
 * The lengths are derived. The operator fixes one: the F is cut short before its fall so the
 * fall has weight. Every other note runs to the next note's step, and the last to the end of the
 * cycle, which is what a held organ line is.
 *
 * ## The grid marks the entries
 *
 * A four-bar grid repeats under the eight-bar line and marks only the entry into each chord, at
 * 1 and 33 (§5A.2). Every move inside a chord is played off the held note and lives in the hook
 * alone, the Eb after the released F included: the grid is the recurring articulation, and the
 * release before that Eb is the hook's, in the F's length, where the reader sees it.
 *
 * ## The left hand is prose
 *
 * The operator's left hand is root and fifth only, `D–A, Eb–Bb, D–A, C–G`, and open fifths are
 * what make an organ sound modal. `harmony` carries chord identity, `i II i vii`, and the chord
 * table renders each chord's tones; it does not carry a voicing, and adding one would be a
 * fifth shared vocabulary (invariant 3). So the fifths are technique, where the reader at the
 * keyboard finds them.
 */
export const aegeanOrganPhrygianFigure: Riff = {
  id: 'aegean-organ-phrygian-figure',
  name: 'The Aegean Organ Phrygian figure',
  reference: { kind: 'patch', name: 'Aegean Organ' },
  bpm: { min: 68, max: 88, default: 76 },
  key: 'D phrygian',
  technique: [
    'Four chords, eight bars, two bars each: D minor, E flat major, D minor, C minor. The right ' +
      'hand enters on the beat with every chord. An organ has no attack shape, so each note ' +
      'speaks the instant the key goes down, and the phrasing is all in length and release.',
    'Left hand, root and fifth only, no thirds: D and A, then Eb and Bb, then D and A, then C ' +
      'and G. Open fifths are what make an organ sound modal instead of churchy.',
    'Over the first D minor: F, then fall to Eb in the second bar. Cut the F short before the ' +
      'drop and the fall has weight; hold it too long and the two notes blur into one sound.',
    'Over the Eb major: G, held for both bars. Over the return to D minor: D, up to Eb, back to ' +
      'D. Over the C minor: Eb, falling to D at the end.',
    'One rule, and it is the whole piece: never play E natural. The Eb is the flat second, what ' +
      'makes this Phrygian instead of ordinary D minor, and it is in three of the four chords. ' +
      'Play an E natural once and the modal sound is gone.',
    'Since nothing swells, practise releasing. A move inside a chord is played off the held ' +
      'note; the hand strikes on the entry into each chord, and the release is what shapes ' +
      'everything else.',
  ],
  request: {
    id: 'aegean-organ-phrygian-figure',
    role: 'lead',
    priority: 1,
    character: 'bright',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  figureStartsAtBar: 1,
  /**
   * §5A/#554. E natural is degree 2 raised. A raised degree is forbidden across the piece
   * (#605), and the `i` is the chord the reason is about. No `onsetOffset`: the entries are on
   * the beat, which is the hook's to say. See the header.
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'i',
        degree: 2,
        alter: 1,
        reason: 'the raised second destroys the flat second the mode rests on',
      },
    ],
  },
  harmony: {
    cycleBars: 8,
    progression: [
      { degree: 'i', bars: 2 },
      { degree: 'II', bars: 2 },
      { degree: 'i', bars: 2 },
      { degree: 'vii', bars: 2 },
    ],
  },
  /**
   * Eight bars, eight notes. `baseOctave: 4` puts `D4` at degree 1, so the line is `D5` and its
   * neighbours up to `G5`. Each chord holds 32 steps: `i` 1–32, `II` 33–64, `i` 65–96, `vii`
   * 97–128, and each is entered on its first step.
   */
  hook: {
    id: 'aegean-organ-phrygian-figure-hook',
    forRole: 'lead',
    bars: 8,
    baseOctave: 4,
    notes: [
      // `i`: F5 on the beat, cut short a beat before the fall; Eb5 on the second bar's head.
      { step: 1, degree: 3, octave: 1, len: 12 },
      { step: 17, degree: 2, octave: 1, len: 16 },
      // `II`: G5, held both bars.
      { step: 33, degree: 4, octave: 1, len: 32 },
      // `i` again: D5, up to Eb5, back to D5, the neighbour and return.
      { step: 65, degree: 1, octave: 1, len: 8 },
      { step: 73, degree: 2, octave: 1, len: 8 },
      { step: 81, degree: 1, octave: 1, len: 16 },
      // `vii`: Eb5, the chord's third, falling to D5 at the end of the cycle.
      { step: 97, degree: 2, octave: 1, len: 24 },
      { step: 121, degree: 1, octave: 1, len: 8 },
    ],
  },
  /**
   * §5A.2. A four-bar grid under an eight-bar line, two passes, marking the entry into each
   * chord at 1 and 33, which is 1, 33, 65 and 97 across the cycle. Every move inside a chord is
   * slurred and unstruck.
   */
  pattern: variant(
    'aegean-organ-phrygian-figure-grid',
    'lead',
    0,
    64,
    at('accent', 88, 1),
    on('downbeat', 33),
  ),
}
