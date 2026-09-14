import type { Riff } from '../core/riff'

/**
 * §5A. **The Moog 55 Strings suspension writing**: a top line over suspended chords, moving by
 * step, resolving each suspension in the second bar of its chord and never the first.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #566). The patch is the
 * string ensemble; the notes are this library's own, and the entry names no device
 * (invariant 3).
 *
 * ## A `pad`, as the definition filed it, and no grid
 *
 * The definition wrote `part: pad`. It first landed as a `lead` at `soft` because `RiffSchema`
 * refused a riff on a held role, and #608 removed that rule rather than keep the workaround:
 * a pad is held rather than struck (`NON_PATTERN_BEARING_ROLES`), so a riff on one is its hook
 * alone (§5A.2). The articulation of this figure is its note lengths, and the notes carry them.
 * The chords it sits on are the chord table, supplied separately.
 *
 * ## The rule that stays prose, and why
 *
 * The definition's rule was *the third must not appear until the suspension resolves*, and it
 * resolves in the second bar of each two-bar chord. That is a rule with an *until* in it, and
 * a `ForbiddenDegree` holds for the whole of a chord: written as data over the `I`, it would
 * refuse the E that resolves the suspension, which is the note the figure exists to land. A
 * first version split each chord into a suspended bar and a resolved bar so the rule could be
 * data over one and not the other; that put labels in the progression the definition did not
 * write, and #569 keeps progressions to root-only numerals with the extensions in prose, as
 * Muse Runner does. So the progression is the definition's `I IV vi V` at two bars each, the
 * withheld third is the technique's fifth paragraph, and the one rule in `constraints` is the
 * two-beat entry. What the data cannot say, `test/riff.test.ts` asserts on this entry instead:
 * each resolution lands in the second bar of its chord.
 *
 * ## The whole cycle
 *
 * The first published version carried bars 1 to 4 of the eight, the two suspensions, and left
 * the held B and C of the definition's second half as prose, on the belief that a riff's grid
 * capped the figure at four bars. The hook was never capped (§5A.2, #603), so it is the
 * definition's eight bars and all six of its notes, restored at #604. While the entry was a
 * `lead` a four-bar grid repeated beneath it, marking the entry into each chord; the grid went
 * with the role at #608, and the pitches and lengths are exactly as #604 restored them.
 */
export const moog55StringsSuspensionWriting: Riff = {
  id: 'moog-55-strings-suspension-writing',
  name: 'The Moog 55 Strings suspension writing',
  reference: { kind: 'patch', name: 'Moog 55 Strings' },
  bpm: { min: 52, max: 70, default: 60 },
  key: 'C major',
  technique: [
    'Four chords, eight bars, and the line covers all of them. The first two are suspended: ' +
      'each holds its suspension for a bar and resolves in the second, and the line does the ' +
      'same. The last two are held notes.',
    'Inside each chord, every move is a step, and it is slurred, not struck. The D over the ' +
      'first chord steps up to E; the G over the second steps up to A. Each resolution is ' +
      'played off the held note without a new attack, so a chord gets one entry and the line ' +
      'moves inside it.',
    'The suspension resolves inside the second bar of each chord, never the first. That is what ' +
      'makes eight bars feel like they are still arriving: the third is withheld for a bar and ' +
      'then given.',
    'Enter two beats late. The pad has already moved when the line comes in, and the wait is ' +
      'what makes a held string note sound placed.',
    'Never play E while the first chord is still suspended, and never A while the second is. ' +
      'Each is the third the suspension is withholding, and playing it early gives the ' +
      'resolution away.',
    'Over the last two chords, hold one note each, two beats late and a step apart: B over the ' +
      'A minor seventh, then C over the suspended G. The line barely moves and the harmony ' +
      'does the work.',
    'Slow attack, slow release. Every note should still be swelling when the next chord ' +
      'arrives under it.',
  ],
  request: {
    id: 'moog-55-strings-suspension-writing',
    role: 'pad',
    priority: 1,
    character: 'soft',
    sustain: 'continuous',
  },
  figureStartsAtBar: 1,
  /**
   * §5A/#554. The two-beat entry as data. The withheld third is prose, and the header says why.
   */
  constraints: {
    onsetOffset: {
      minSteps: 8,
      reason: 'the pad moves first and the line arrives after it',
    },
  },
  /**
   * §5A/§4.1. The definition's four chords at two bars each. The suspensions and the sixth on
   * the dominant are extensions, and extensions are prose (#569).
   */
  harmony: {
    cycleBars: 8,
    progression: [
      { degree: 'I', bars: 2 },
      { degree: 'IV', bars: 2 },
      { degree: 'vi', bars: 2 },
      { degree: 'V', bars: 2 },
    ],
  },
  /**
   * Eight bars, six notes. `baseOctave: 4` puts `C4` at degree 1, so the suspensions are the
   * octave above middle C and the two held notes sit around it.
   *
   * Each chord holds 32 steps: `I` 1–32, `IV` 33–64, `vi` 65–96, `V` 97–128. The entry is eight
   * steps into each, and each resolution lands inside its chord's second bar, which is the one
   * timing the definition fixes. **The lengths are not authored; they follow from the part.**
   * The definition gives none, and a pad over two-bar chords sounds each note until the next
   * one, so every note runs to the next note's step and the last runs to the end of the cycle.
   * Nothing in the technique says so, because a length that needed a sentence would be one this
   * library invented (#604).
   */
  hook: {
    id: 'moog-55-strings-suspension-writing-hook',
    forRole: 'pad',
    bars: 8,
    baseOctave: 4,
    notes: [
      // `I`, suspended: D5, the second, two beats in. E5, the resolution, on beat three of the
      // second bar, sounding until the G enters.
      { step: 9, degree: 2, octave: 1, len: 16 },
      { step: 25, degree: 3, octave: 1, len: 16 },
      // `IV`, suspended: G5, its second, two beats in. A5, the resolution, on beat three of the
      // second bar, sounding until the B enters.
      { step: 41, degree: 5, octave: 1, len: 16 },
      { step: 57, degree: 6, octave: 1, len: 16 },
      // `vi`: B4, the second, until the C enters. `octave: 0` is the definition's own register,
      // a seventh below the A before it.
      { step: 73, degree: 7, octave: 0, len: 32 },
      // `V`: C5, the suspended fourth, to the end of the cycle.
      { step: 105, degree: 1, octave: 1, len: 24 },
    ],
  },
}
