import type { Riff } from '../core/riff'

/**
 * §5A. **The Muse Runner floating-arrival lead**: four passes over a six-chord cycle in F#
 * minor, each pass in a higher register and thinner than the last, the fourth working as an
 * ending. Every note arrives after the pad has already moved and sounds until the next chord is
 * under it.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #566). The reference is a
 * preset a box ships under that name, and it is the name a reader looks the technique up by. On
 * a rig that has the box, the patch supplies the sound, and the page says to load it, because
 * `patchAffinities` names it (§5A.5, #585); the hook supplies the notes, and every one of them
 * is this library's own. The reference is not the box: the entry names no device (invariant 3),
 * and the title carries the patch's name because that is where §5A.5 puts every reference.
 *
 * ## Four loops over one cycle (#623)
 *
 * The line is the operator's, played on this patch over `i VI iv I IV v` in F# minor, two bars a
 * chord, twelve bars a pass. The first published version was three notes over four bars of a
 * different cycle, cut down because its docstring believed a riff's grid capped the figure at
 * four bars (#603). Then it was the first pass alone, thirteen notes over twelve bars (#603).
 * Now it is the four the operator wrote, forty notes over forty-eight bars, and the harmony
 * repeats under it: `cycleBars` stays 12 and `chordOccurrenceAt` takes the bar modulo the cycle
 * (§5A.2), so the fourth `I` is the same chord as the first and is checked as its own entry.
 *
 * **Loop 1** is the figure that shipped, note for note: one late entry per chord and a contour
 * inside each. **Loop 2** is an octave up with the contour inverted, the widest of the four,
 * and it carries the two notes that look wrong and are not (below). **Loop 3** is one note a
 * chord, just above the pad's voicings, each held through its two bars. **Loop 4** is the
 * highest and the thinnest: the first chord is silent, the second is entered alone and very
 * late, and the last note leaps to `C#6` and rings past the end.
 *
 * ## Why there is no grid
 *
 * A grid under a longer figure repeats, and §5A.2 lets it mark only what recurs on the same
 * step of every pass. The first pass alone admitted exactly two such steps, the entry two beats
 * into each chord. Loop 4's silent first chord removes the first, and its very-late second entry
 * removes the other, so across the twelve passes a 64-step grid would make, nothing recurs. The
 * figure is through-composed, and the entry says so: `reArticulatesHook: false` and no
 * `pattern` (§5A.2, #623). The hook is the whole rhythm, every note played once at its step.
 *
 * ## Where the entries sit
 *
 * `onsetOffset.minSteps: 8`. Every ordinary entry lands eight steps into its chord, half a bar
 * after the pad has changed. Two entries the operator marked *very late* land twenty-four steps
 * in, a bar and a half: the `A#4` of Loop 3's `I` and the `A5` of Loop 4's `VI`. The moves within
 * a chord are not entries and the offset does not apply to them. Loop 4's `i` has no entry at
 * all; the `G#4` closing Loop 3 releases two steps into it, as every last note of a chord does,
 * and then the chord is silent.
 *
 * ## The two `D#5`s over the C# minor, which are correct
 *
 * Loop 2 closes on `E5 D#5 C#5` over the `v`. `D#` is the raised sixth of F# minor, which the
 * key does not own, and it is the second of C# minor, which the chord does. It is a stepwise
 * descent inside the chord and not a borrowing, so it is authored as `6/0 alter 1` beside the
 * `D#5` over the `IV` one chord earlier, which is the borrowed chord's own third. The rule that
 * forbids degree 6 names it *unaltered* over the `IV`, so neither note reaches it. A future
 * editor who reads the D# over C# minor as a mistake and lowers it to D would put the key's
 * sixth a semitone under the chord's third; the operator's line does not do that.
 *
 * ## The raised notes, and where the line clears before them
 *
 * `I` and `IV` are the pair F# minor does not own, and the melody goes with them in every loop:
 * the raised third over the F# major, the raised sixth over the B. Both are the key's own degree
 * with `alter: 1` (§4.1), and the natural spelling of each is forbidden as data over its chord.
 * Each chord's last note hangs two steps over the change except the one before the `I`: in every
 * loop the note closing the `iv` clears on the bar line, so the raised third arrives on air.
 *
 * ## The last note runs past the end, and that is sustain rather than a fifth loop
 *
 * The `C#6` at step 745 is 32 steps long and the hook is 768, so it sounds eight steps past the
 * last step of the figure. That is authored sustain: the note is held past the point where the
 * pad's cycle would come round, and a player lets it ring rather than cutting it on the bar
 * line. Nothing follows it. Loop 1's `E4` runs two steps past the end of its own pass into Loop
 * 2's `i` for the same reason every last note of a chord does. The other ending, `G#5` in place
 * of the `C#6`, hands the line back to Loop 1, and it is prose in `technique` because a hook
 * holds one figure and the reader makes that choice at the machine.
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
    'Six chords, twelve bars, and the line goes round them four times, each pass higher and ' +
      'thinner than the last. Three minor chords, then the pair the key does not own, then the ' +
      'minor fifth to take it back. The first pass is the line; the other three are the same ' +
      'line moving up and away until there is almost nothing left of it.',
    'One late entry per chord. Let the pad move first, then arrive: an entry lands two beats ' +
      'after the chord has changed under it, and the wait is what makes the note sound placed ' +
      'rather than programmed. Two entries come later still, a bar and a half in: the A# over ' +
      'the F# major in the third pass and the A that opens the fourth pass alone. Wait for ' +
      'those until it feels too late, then play them.',
    'First pass, the full line. C# held over the F# minor, dropping to A late in the second ' +
      'bar. F# an octave up over the D, stepping down through E to D. D over the B minor, its ' +
      'neighbour C# and back. A# late over the F# major, hanging. D# over the B, lifting to F#. ' +
      'G# over the C# minor, resolving down to E.',
    'Second pass, an octave up and the contour turned over. A falling to F# over the F# minor ' +
      'and left to sit. A with its upper neighbour B and back over the D. B stepping down ' +
      'through A to F# over the B minor. C# rising late to A# over the F# major. F# down to ' +
      'D# and back over the B. E stepping down through D# to C# over the C# minor. That D# ' +
      'over the C# minor is right: it is the second of the chord, not the sixth of the key, ' +
      'so play it and do not soften it to D.',
    'Third pass, one note a chord, held for the two bars, sitting just above the pad. F#, A, ' +
      'F#, then A# arriving very late over the F# major, then F#, then G# over the C# minor ' +
      'with no resolution. Let each one sit and move nothing.',
    'Fourth pass, the ending. Nothing over the F# minor. A alone over the D, very late. F# ' +
      'held over the B minor. A# held over the F# major, and keep the vibrato off it until the ' +
      'chord is nearly over. F# held over the B. Then the leap up to C# over the C# minor, and ' +
      'let it ring past the end.',
    'The moves inside a chord are slurred, not struck. Each is played off the held note ' +
      'without a new attack, so a chord gets one arrival and the line keeps moving; the entries ' +
      'are the only attacks in the whole figure.',
    'The fourth and fifth chords are where the key turns major, and the line goes with it in ' +
      'every pass: A# over the F# major and D# over the B, each a semitone above what the key ' +
      'gives you. Play the natural note and the turn disappears.',
    'Hold each chord’s last note until the next chord is already sounding, then release, ' +
      'except into the F# major. There the note closing the B minor clears on the bar line, in ' +
      'every pass, so the raised third arrives on air.',
    'The last note is C#, high, held past the point where the pad would come round again, ' +
      'and nothing follows it. If you would rather the line cycle than close, end on G# ' +
      'instead and it hands back to the first pass; leaving the line on the G# unresolved is ' +
      'how the first pass ends when it is not the last time through.',
    'Wide vibrato, arriving after the note has settled. The note should be still for a moment ' +
      'before it starts to move.',
  ],
  /**
   * §5A.2/#623. A struck role with no grid: the figure is through-composed, and the flag says
   * so. See the docstring for why no 64-step grid has anything to mark across its twelve passes.
   */
  request: {
    id: 'muse-runner-floating-arrival-lead',
    role: 'lead',
    priority: 1,
    character: 'bright',
    sustain: 'continuous',
    reArticulatesHook: false,
  },
  /**
   * §5A/§4.1. The whole cycle, and the figure starts where it does: bar 1 of twelve. Explicit
   * rather than defaulted so the alignment reads as a decision beside the cycle it aligns with.
   * The figure is four cycles long and the cycle repeats under it (§5A.2, #623).
   */
  figureStartsAtBar: 1,

  /**
   * §5A/#554. The rules as data. The two forbidden notes are the natural spellings of the two
   * raised ones: the key's third over the borrowed `I`, the key's sixth over the borrowed `IV`.
   * Both reach every occurrence of their chord across the four loops.
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
   * Forty-eight bars, forty notes, four loops of twelve. `baseOctave: 4` puts the line above
   * middle C: `1/0` is F#4 and `1/+1` is F#5.
   *
   * Each chord holds 32 steps and each loop 192: within a loop `i` 1–32, `VI` 33–64, `iv` 65–96,
   * `I` 97–128, `IV` 129–160, `v` 161–192, and each later loop adds 192. An ordinary entry is
   * eight steps into its chord; the two very late ones are twenty-four. The last note of a
   * chord runs two steps past the change, except the note before the `I`, which stops on the
   * bar line. Loop 1 is the thirteen notes that shipped, unchanged.
   */
  hook: {
    id: 'muse-runner-floating-arrival-lead-hook',
    forRole: 'lead',
    bars: 48,
    baseOctave: 4,
    notes: [
      // Loop 1, steps 1–192. The line as it shipped.
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

      // Loop 2, steps 193–384. An octave up, the contour turned over.
      // `i`. The third an octave up, falling to the tonic and left to sit.
      { step: 201, degree: 3, octave: 1, len: 12 },
      { step: 213, degree: 1, octave: 1, len: 14 },
      // `VI`. The third, its upper neighbour, and back.
      { step: 233, degree: 3, octave: 1, len: 12 },
      { step: 245, degree: 4, octave: 1, len: 4 },
      { step: 249, degree: 3, octave: 1, len: 10 },
      // `iv`. The fourth stepping down through the third to the tonic. Stops at the bar line.
      { step: 265, degree: 4, octave: 1, len: 12 },
      { step: 277, degree: 3, octave: 1, len: 4 },
      { step: 281, degree: 1, octave: 1, len: 8 },
      // `I`. The fifth, rising late to the raised third an octave up and hanging.
      { step: 297, degree: 5, octave: 0, len: 12 },
      { step: 309, degree: 3, octave: 1, len: 14, alter: 1 },
      // `IV`. The tonic, the raised sixth below it, and back up.
      { step: 329, degree: 1, octave: 1, len: 12 },
      { step: 341, degree: 6, octave: 0, len: 4, alter: 1 },
      { step: 345, degree: 1, octave: 1, len: 10 },
      // `v`. The seventh stepping down through the raised sixth to the fifth: `D#5` is the
      // second of C# minor, and the docstring says why it is not lowered to D.
      { step: 361, degree: 7, octave: 0, len: 12 },
      { step: 373, degree: 6, octave: 0, len: 4, alter: 1 },
      { step: 377, degree: 5, octave: 0, len: 10 },

      // Loop 3, steps 385–576. One note a chord, held, just above the pad.
      { step: 393, degree: 1, octave: 0, len: 26 },
      { step: 425, degree: 3, octave: 0, len: 26 },
      // `iv`. Stops at the bar line before the `I`.
      { step: 457, degree: 1, octave: 0, len: 24 },
      // `I`. The raised third, very late: twenty-four steps in.
      { step: 505, degree: 3, octave: 0, len: 10, alter: 1 },
      { step: 521, degree: 1, octave: 0, len: 26 },
      // `v`. The second, held, and no resolution this time.
      { step: 553, degree: 2, octave: 0, len: 26 },

      // Loop 4, steps 577–768. Highest and thinnest; the `i` at 577–608 is silent.
      // `VI`. The third an octave up, entered alone and very late: twenty-four steps in.
      { step: 633, degree: 3, octave: 1, len: 10 },
      // `iv`. Stops at the bar line before the `I`.
      { step: 649, degree: 1, octave: 1, len: 24 },
      // `I`. The raised third an octave up, held.
      { step: 681, degree: 3, octave: 1, len: 26, alter: 1 },
      { step: 713, degree: 1, octave: 1, len: 26 },
      // `v`. The leap up to the fifth an octave up, sustained eight steps past the end of the
      // figure. Authored sustain, not another loop: nothing follows it.
      { step: 745, degree: 5, octave: 1, len: 32 },
    ],
  },
}
