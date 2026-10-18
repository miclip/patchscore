import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The Chameleon bass**: a funk line of short notes whose rests are placed, and whose
 * longest rest is the two beats before the figure comes round again.
 *
 * **Named after a recording, and not transcribed from one** (§5A.5). Every note below is this
 * library's own. What the record is the reference for is a way of playing a bass part: notes cut
 * short on purpose, so the silences between them are as fixed as the notes, and a gap before the
 * repeat that the line falls back into. A reader who wants the record should go and listen to
 * the record.
 *
 * **Names no device** (invariant 3). It says `bass-mid`, `dirty`, and a grid.
 *
 * ## What it teaches, against the shelf
 *
 * The other record basses fill their bars: `blue-monday-bass` strikes all sixteen sixteenths and
 * `acid-tracks-line` strikes eleven of every sixteen. On the boxes this pair reaches, the bass
 * figures teach weight (`brash-b-ss-…`, ghosts on a held root), the octave (`3-osc-bass-love-…`),
 * fifths before the root (`5th-in-line-…`), a repeated sixteenth bar (`hypno-acid-…`), an inverted
 * answer (`mirroredbass-…`) and a phrygian cadence (`terror-bass-…`). None of them is built on
 * where the line stops. This one is: thirty notes in four bars, none longer than an eighth, a rest
 * in every beat of the first three bars, and then bar four stops after its fourth note and leaves
 * two beats empty. One sixteenth before the top of the figure, a single pickup a tone under the
 * root is what pulls the loop back in.
 *
 * Without that rest the line is a busy bass part. With it, the bar head of the next pass is
 * something the listener is waiting for.
 *
 * ## The harmony is context, and the borrowed IV is its colour
 *
 * `i IV i IV` in G minor, one bar a chord. The `IV` is major, so its third is the key's sixth
 * raised: the line plays that note over the `IV` and nowhere else, which is what keeps the `i`
 * minor while the `IV` borrows the brighter chord. Bars one to three open alike, on the chord's
 * root and then its octave, and bar four climbs the `IV`'s triad instead before it stops.
 *
 * ## Struck as written
 *
 * Every note in the hook is short and has a grid strike on its onset, and every grid strike falls
 * on a note's onset. So the grid and the hook say the same thing, and a step with no note in
 * force is a step the grid leaves alone. One note at a time throughout; `request.polyphony` is
 * the default of one.
 */
export const chameleonPlacedRestBass: Riff = {
  id: 'chameleon-placed-rest-bass',
  name: 'The Chameleon bass',
  reference: { kind: 'record', name: 'Chameleon' },
  bpm: { min: 88, max: 108, default: 96 },
  key: 'G minor',
  technique: [
    'Cut every note short. Nothing here is longer than an eighth, and most notes are a single ' +
      'sixteenth. The rests between them are written as exactly as the notes, so play them.',
    'Bar four stops after its fourth note and leaves two whole beats empty. Do not fill them. ' +
      'That silence is what makes the top of the next pass land.',
    'The last sixteenth of the figure is a pickup a tone under the root, alone after the gap. ' +
      'Give it no accent, so the bar head after it takes the weight.',
    'Bars one to three open the same way: the chord’s root, then its octave on the last ' +
      'sixteenth of the first beat. Bar four breaks that, climbing the IV’s root, third and fifth ' +
      'instead and falling back to the third before it stops.',
    'Bar one drops to the third and climbs back to the fifth by step. Bar three keeps falling ' +
      'by step, from the fifth down to the third, and climbs from a tone under the root. Same ' +
      'opening, two answers.',
    'Over the IV, play the key’s sixth raised, because it is that chord’s third, and never the ' +
      'key’s own sixth against it. Keep the raised one off the i, which stays minor.',
    'Accent the root at the head of bars one and three and keep the rest even. The line lives ' +
      'between a tone under the root and the octave and a fourth above it.',
  ],
  request: {
    id: 'chameleon-placed-rest-bass',
    role: 'bass-mid',
    priority: 1,
    character: 'dirty',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  /**
   * §5A/#554. The key's own sixth over the `IV`, as data: that chord's third is the sixth
   * raised, and the unaltered one a semitone under it is the note that sours the borrowed
   * chord. Unaltered, so the rule reaches the `IV` alone (#605), and none of the `IV`'s tones is
   * built on it.
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'IV',
        degree: 6,
        reason: 'the IV is major, and the key’s own sixth is a semitone under its third',
      },
    ],
  },
  harmony: {
    cycleBars: 4,
    progression: [
      { degree: 'i', bars: 1 },
      { degree: 'IV', bars: 1 },
      { degree: 'i', bars: 1 },
      { degree: 'IV', bars: 1 },
    ],
  },
  figureStartsAtBar: 1,
  /**
   * Four bars, thirty notes, every one of them one or two sixteenths. `baseOctave: 2` puts the
   * root at the bottom of the bass register (§4.1, middle C is C4).
   */
  hook: {
    id: 'chameleon-placed-rest-bass-hook',
    forRole: 'bass-mid',
    bars: 4,
    baseOctave: 2,
    notes: [
      // `i`: root, octave, then down through the chord with a rest in each beat.
      { step: 1, degree: 1, octave: 0, len: 2 },
      { step: 4, degree: 1, octave: 1, len: 1 },
      { step: 6, degree: 7, octave: 0, len: 1 },
      { step: 7, degree: 5, octave: 0, len: 2 },
      { step: 11, degree: 3, octave: 0, len: 1 },
      { step: 12, degree: 4, octave: 0, len: 1 },
      { step: 13, degree: 5, octave: 0, len: 1 },
      { step: 16, degree: 2, octave: 0, len: 1 },
      // `IV`: the same root-and-octave opening on the new root, and the raised sixth.
      { step: 17, degree: 4, octave: 0, len: 2 },
      { step: 20, degree: 4, octave: 1, len: 1 },
      { step: 22, degree: 1, octave: 1, len: 1 },
      { step: 23, degree: 6, alter: 1, octave: 0, len: 2 },
      { step: 27, degree: 4, octave: 0, len: 1 },
      { step: 28, degree: 5, octave: 0, len: 1 },
      { step: 29, degree: 6, alter: 1, octave: 0, len: 1 },
      { step: 31, degree: 7, octave: 0, len: 1 },
      // `i` again: bar one's opening, then a run down where bar one rested.
      { step: 33, degree: 1, octave: 0, len: 2 },
      { step: 36, degree: 1, octave: 1, len: 1 },
      { step: 38, degree: 7, octave: 0, len: 1 },
      { step: 39, degree: 5, octave: 0, len: 1 },
      { step: 40, degree: 4, octave: 0, len: 1 },
      { step: 41, degree: 3, octave: 0, len: 2 },
      { step: 45, degree: 7, octave: -1, len: 1 },
      { step: 46, degree: 1, octave: 0, len: 1 },
      { step: 47, degree: 3, octave: 0, len: 1 },
      // `IV` again: four notes, two beats of silence, and the pickup.
      { step: 49, degree: 4, octave: 0, len: 2 },
      { step: 52, degree: 6, alter: 1, octave: 0, len: 1 },
      { step: 53, degree: 1, octave: 1, len: 2 },
      { step: 55, degree: 6, alter: 1, octave: 0, len: 1 },
      { step: 64, degree: 7, octave: -1, len: 1 },
    ],
  },
  /**
   * §5A.2. One strike on every onset and nowhere else. The two `i` bar heads are the accents;
   * on-beat onsets are `downbeat`, eighth offbeats `offbeat`, and the sixteenths between are
   * `ghost`, which here means only *between the beats* and sits a little under the rest.
   */
  pattern: variant(
    'chameleon-placed-rest-bass-grid',
    'bass-mid',
    0,
    64,
    at('accent', 116, 1, 33),
    on('downbeat', 13, 17, 29, 41, 45, 49, 53),
    on('offbeat', 7, 11, 23, 27, 31, 39, 47, 55),
    at('ghost', 84, 4, 6, 12, 16, 20, 22, 28, 36, 38, 40, 46, 52, 64),
  ),
}
