import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The Blade Runner Blues lead** — the turn where a minor progression goes major, and the
 * melody goes with it.
 *
 * **Named after a recording, and not transcribed from one** (§5A.5). Every note below is this
 * library's own. What the record is the reference *for* is a way of writing a lead over borrowed
 * chords: one note per chord, arriving late, held until the chord changes under it.
 *
 * **Names no device** (invariant 3). `lead`, `bright`, a grid, and a progression in roman
 * numerals.
 *
 * ## Why it teaches two chords out of six
 *
 * The cycle is six chords and twelve bars, which is longer than a riff's grid can be —
 * `PATTERN_LENGTHS` tops out at 64 steps, and `RIFF_GRID_LEAD` promises that *every* step strikes
 * the note in force at that point, so a grid that repeated under a line whose gesture changes per
 * chord would be striking notes the figure holds through.
 *
 * So the figure is the **turn**: `I` then `IV`, the two chords a minor key does not own. The other
 * four are still on the page, in `harmony`, because they are what makes these two a turn rather
 * than simply a key change — and the technique below says what to do over them.
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
 */
export const bladeRunnerBluesLead: Riff = {
  id: 'blade-runner-blues-lead',
  name: 'The Blade Runner Blues lead',
  track: 'Blade Runner Blues',
  bpm: { min: 56, max: 72, default: 64 },
  key: 'F# minor',
  technique: [
    'Bars 7 to 10 of the cycle, which is the pair of chords the key does not own. The four minor ' +
      'chords either side are the setting; these two are the turn.',
    'Come in late on every chord. Both entries land a beat or more after the pad has already ' +
      'changed under them, which is what makes the line sound played rather than programmed. ' +
      'The third note is not an entry — it is the same chord, continued.',
    'The two entries are the major third of the chord beneath them, each a semitone above what ' +
      'the key gives you. That semitone is the whole sound. Play the note the key expects and ' +
      'the turn disappears.',
    'Never play the key\u2019s own third or sixth while these two chords are sounding. A natural ' +
      'third against the raised one is the move collapsing, and it is the one mistake this ' +
      'figure can make.',
    'Hold each entry until the next chord is already sounding, then release. The overlap is ' +
      'where the two chords blur into each other.',
    'Over the four minor chords either side, do the same thing with the plain third or fifth: ' +
      'one note, late, held. The shape is what repeats; only these two are raised.',
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
   * §5A/§4.1. The six-chord cycle the four bars below sit inside. `i VI iv` is ordinary F# minor;
   * `I` and `IV` are the borrowed pair this figure is about, and `v` takes it back.
   */
  figureStartsAtBar: 7,

  /**
   * §5A/#554. The two rules this figure keeps, as data. Both were prose until now, and prose is
   * what let the first published version drift: the paragraph forbidding the collision stayed
   * true while the notes stopped keeping it.
   *
   * The forbidden pair is the same rule twice — over a borrowed major chord, the key's own third
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
   * Four bars: two over `I`, two over `IV`. `baseOctave: 4` puts the line above middle C, where a
   * lead this exposed sits (§4.1).
   *
   * The lengths overrun their chords on purpose — `A#4` is still sounding when B arrives, and
   * `D#5` when `F#5` takes over. That is the fourth paragraph above, written as data.
   */
  hook: {
    id: 'blade-runner-blues-lead-hook',
    forRole: 'lead',
    bars: 4,
    baseOctave: 4,
    notes: [
      // `I` runs bars 7-8, which is figure steps 1-32. The entry is at step 9, two beats in.
      { step: 9, degree: 3, octave: 0, len: 26, alter: 1 },
      // `IV` runs bars 9-10, figure steps 33-64. Step 37 is a beat after it arrives — step 33
      // would be the bar head, which is the thing the second paragraph says this never does.
      { step: 37, degree: 6, octave: 0, len: 12, alter: 1 },
      // Not an entry: the same chord, an octave move within it.
      { step: 49, degree: 1, octave: 1, len: 16 },
    ],
  },
  pattern: variant(
    'blade-runner-blues-lead-grid',
    'lead',
    0,
    64,
    at('accent', 84, 9),
    on('offbeat', 37),
    on('downbeat', 49),
  ),
}
