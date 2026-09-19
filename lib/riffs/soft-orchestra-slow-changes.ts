import type { Riff } from '../core/riff'

/**
 * §5A. **The Soft Orchestra slow changes**: a top line that stays on one note while the harmony
 * moves under it, then moves once, by step, and suspends the last chord.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #566). The patch is the
 * string ensemble; the notes are this library's own, and the entry names no device
 * (invariant 3).
 *
 * ## A `pad`, as the definition filed it, and no grid
 *
 * The definition wrote `part: pad`. It first landed as a `lead` at `soft` because `RiffSchema`
 * refused a riff on a held role, and #608 removed that rule rather than keep the workaround: a
 * pad is held rather than struck (`NON_PATTERN_BEARING_ROLES`), so a riff on one is its hook
 * alone (§5A.2). This is the figure that forced the question. Eight bars over a four-bar grid
 * run the grid twice, and the only strike the second pass shares with the first falls where the
 * D is tied — so no non-empty grid could mark the later entries without re-articulating the one
 * note the figure exists to teach. The grid was fighting the music because the role was wrong.
 *
 * ## The whole cycle, and the tie as data
 *
 * Four chords at two bars each, and the definition's first half is one note: the D over the
 * `i`, tied through the `VI` with no new attack, and still sounding over the `iv` until it steps
 * down. The first published version carried bars 5 to 8 alone, on the belief that a riff's grid
 * capped the figure at four bars, and so opened after the common tone was over — the thing the
 * technique's first paragraph is about. The hook was never capped (§5A.2, #603), so the figure
 * is the whole cycle from bar 1, and the tie is one note of 88 steps rather than three notes
 * that happen to share a pitch: a second onset on the same D would be a second attack, which is
 * exactly what *tied* forbids.
 *
 * ## The one raised note
 *
 * G minor's seventh is `F`. The suspended D chord resolves to `F#`, `alter: 1` on degree 7, and
 * the natural F sounding over that chord is a minor third against the resolution. The rule
 * forbids the natural spelling; the raised one is what the figure plays.
 */
export const softOrchestraSlowChanges: Riff = {
  id: 'soft-orchestra-slow-changes',
  name: 'The Soft Orchestra slow changes',
  reference: { kind: 'patch', name: 'Soft Orchestra' },
  bpm: { min: 56, max: 74, default: 64 },
  key: 'G minor',
  technique: [
    'The top note stays on D while the harmony moves underneath it. That common tone is the ' +
      'whole device: the pad does the work and the right hand barely moves. What changes is ' +
      'what the D is. Over the G minor it is the fifth, plain. Over the E flat it is the major ' +
      'seventh, and the same note has gone soft. Over the C minor it is the ninth, and it is ' +
      'floating. One note, three colours, and you moved nothing.',
    'The D is one note, not three. It enters with the first chord and is tied through the ' +
      'second and into the third: no new attack anywhere, however much the chords move under it.',
    'Over the C minor chord, hold the D and step down to C late, on beat three of the second ' +
      'bar. Let the C ring into the next chord, where it is the seventh.',
    'Over the suspended D, enter on G two beats in and resolve it down to F# on beat three of ' +
      'the last bar.',
    'Never play F natural while the suspended D is sounding. It is a minor third against the ' +
      'F# the suspension resolves to.',
  ],
  request: {
    id: 'soft-orchestra-slow-changes',
    role: 'pad',
    priority: 1,
    character: 'soft',
    sustain: 'continuous',
  },
  figureStartsAtBar: 1,
  /**
   * §5A/#554. The natural seventh over the suspended dominant, as data. The `F#` the figure
   * plays is the same degree with `alter: 1`. No offset: the D enters with the first chord, and
   * the definition asked for none.
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'V',
        degree: 7,
        reason: 'the natural seventh is a minor third against the raised one the suspension resolves to',
      },
    ],
  },
  harmony: {
    cycleBars: 8,
    progression: [
      { degree: 'i', bars: 2 },
      { degree: 'VI', bars: 2 },
      { degree: 'iv', bars: 2 },
      { degree: 'V', bars: 2 },
    ],
  },
  /**
   * Eight bars, four notes. `baseOctave: 4` puts `G4` at degree 1, so the held D is `D5`.
   *
   * Each chord holds 32 steps: `i` 1–32, `VI` 33–64, `iv` 65–96, `V` 97–128. **The lengths are
   * not authored; they follow from the part.** The definition gives none, and a pad over
   * two-bar chords sounds each note until the next one, so every note runs to the next note's
   * step and the last runs to the end of the cycle. Nothing in the technique says so, because a
   * length that needed a sentence would be one this library invented (#604). The one length the
   * definition does fix is the tie, and it is fixed by there being one D.
   */
  hook: {
    id: 'soft-orchestra-slow-changes-hook',
    forRole: 'pad',
    bars: 8,
    baseOctave: 4,
    notes: [
      // D5 with the `i`, tied through the `VI` and held over the `iv` until it steps down: one
      // note, 88 steps, no attack at 33 or 65.
      { step: 1, degree: 5, octave: 0, len: 88 },
      // C5 on beat three of the `iv`'s second bar, ringing into the `V` as its seventh.
      { step: 89, degree: 4, octave: 0, len: 16 },
      // `V`: G4 two beats in; F#4 on beat three of the last bar, to the end of the cycle.
      { step: 105, degree: 1, octave: 0, len: 16 },
      { step: 121, degree: 7, octave: -1, len: 8, alter: 1 },
    ],
  },
}
