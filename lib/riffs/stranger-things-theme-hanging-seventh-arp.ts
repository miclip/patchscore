import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The Stranger Things theme arp**: a major-seventh arpeggio in eighths that climbs to the
 * chord's seventh and stops there. The octave above it is a semitone away and is never played,
 * so every pass ends hanging on the note that wants to move.
 *
 * **Named after a recording, and not transcribed from one** (§5A.5). Every note below is this
 * library's own. What the record is the reference for is a way of writing a sequenced figure:
 * an arpeggio whose top note is a leading tone with nowhere to go, repeated until the
 * unresolved note is the mood. A reader who wants the record should go and listen to the record.
 *
 * **Names no device** (invariant 3). `arp`, `bright`, a grid, and four chords.
 *
 * ## The move, and how the cycle keeps it worth hearing
 *
 * `VI III VI III` in D# minor, two bars a chord. The two are the minor key's only major-seventh
 * chords, so the arpeggio keeps its shape on both: root, third, fifth, seventh, with the
 * seventh always the highest note in the chord's two bars and the root's octave never sounded
 * above it. In each pair of bars the first is eight eighths and the second climbs or turns in
 * three and hangs the seventh for the last five eighths.
 *
 * Three things change across the eight bars and the seventh does not:
 *
 * - **Direction.** The `VI` arpeggios climb; the `III`s open on the seventh and fall. Bar four
 *   falls to the root and leaps a major seventh straight back up to hang, and bar eight climbs
 *   from the low root instead.
 * - **Voicing.** Bars one to four are close, inside an octave. Bars five to eight open each
 *   chord to root, fifth, tenth and seventh, about two octaves, with the root dropped an octave.
 * - **Harmony.** The `VI` carries the tonic triad above its root, so the first chord already
 *   sounds like the key; the `III` moves the whole shape to the key's relative major.
 *
 * ## Why this is not the other arps
 *
 * `i-feel-love-one-shape-arp` is root, octave and fifth, with no third and no seventh; its
 * octave is the frame, and here the octave is the one note withheld. `bellbounce-sparse-bell-
 * pattern` is two strikes a bar left to ring; `mirror-interior-two-hand-split` holds a triad over
 * a walking bass in contrary motion; `love-on-a-real-train-one-step-sequence` changes one step
 * a pass over a single chord. `brew-time-major-seventh-hold` holds major sevenths too, but it is
 * a pad for an arpeggiator and its lesson is a three-note count against the bar. None of them is
 * built on a top note that does not resolve.
 *
 * ## A grid, because the rhythm repeats every two bars
 *
 * Every pair of bars is struck the same way: eight eighths, then three eighths and the held
 * seventh on the offbeat of beat two. So a 32-step grid recurs four times and marks every onset
 * in the hook (§5A.2); what changes is pitch and register, which the hook carries. The figure is
 * not through-composed, so `reArticulatesHook: false` would be untrue. One note at a time.
 */
export const strangerThingsThemeHangingSeventhArp: Riff = {
  id: 'stranger-things-theme-hanging-seventh-arp',
  name: 'The Stranger Things theme arp',
  reference: { kind: 'record', name: 'Stranger Things theme' },
  bpm: { min: 80, max: 96, default: 88 },
  key: 'D# minor',
  technique: [
    'Arpeggiate a major-seventh chord in even eighths: root, third, fifth, seventh. The seventh ' +
      'is always the top note, and the root’s octave a semitone above it is never played.',
    'End every second bar on the seventh and hold it to the bar line. It wants to rise a ' +
      'semitone to the root, and the figure never lets it. That held, unresolved note is the ' +
      'whole mood.',
    'The VI climbs. The III opens on its seventh and falls: in bar four to its root and a leap ' +
      'of a major seventh straight back up, in bar eight from the low root back up through the ' +
      'chord. Either way the pass ends hanging.',
    'Bars five to eight open each chord up: root an octave lower, then the fifth, the tenth and ' +
      'the seventh. Same chords, same top note, about twice the span.',
    'Keep the eighths dead even and let a sequencer play them if you can. The tension comes ' +
      'from the note that does not move, so nothing else should push.',
    'The VI holds the key’s own tonic triad above its root. Let that be the key; there is no ' +
      'separate i chord, and the figure does not need one.',
  ],
  request: {
    id: 'stranger-things-theme-hanging-seventh-arp',
    role: 'arp',
    priority: 1,
    character: 'bright',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  harmony: {
    cycleBars: 8,
    progression: [
      { degree: 'VI', bars: 2 },
      { degree: 'III', bars: 2 },
      { degree: 'VI', bars: 2 },
      { degree: 'III', bars: 2 },
    ],
  },
  figureStartsAtBar: 1,
  /**
   * Eight bars, forty-eight eighths. `baseOctave: 3` puts the key's root a little under middle C;
   * the close voicings sit around it and the open ones reach an octave below (§4.1, middle C is
   * C4). On the `VI` the chord tones are degrees 6, 1, 3 and 5; on the `III`, 3, 5, 7 and 2.
   */
  hook: {
    id: 'stranger-things-theme-hanging-seventh-arp-hook',
    forRole: 'arp',
    bars: 8,
    baseOctave: 3,
    notes: [
      // `VI`, close, climbing: up to the seventh, back to the third, up to the seventh again.
      { step: 1, degree: 6, octave: 0, len: 2 },
      { step: 3, degree: 1, octave: 1, len: 2 },
      { step: 5, degree: 3, octave: 1, len: 2 },
      { step: 7, degree: 5, octave: 1, len: 2 },
      { step: 9, degree: 3, octave: 1, len: 2 },
      { step: 11, degree: 1, octave: 1, len: 2 },
      { step: 13, degree: 3, octave: 1, len: 2 },
      { step: 15, degree: 5, octave: 1, len: 2 },
      { step: 17, degree: 6, octave: 0, len: 2 },
      { step: 19, degree: 1, octave: 1, len: 2 },
      { step: 21, degree: 3, octave: 1, len: 2 },
      { step: 23, degree: 5, octave: 1, len: 10 },
      // `III`, close, falling from the seventh, then down to the root and a leap back up.
      { step: 33, degree: 2, octave: 1, len: 2 },
      { step: 35, degree: 7, octave: 0, len: 2 },
      { step: 37, degree: 5, octave: 0, len: 2 },
      { step: 39, degree: 3, octave: 0, len: 2 },
      { step: 41, degree: 5, octave: 0, len: 2 },
      { step: 43, degree: 7, octave: 0, len: 2 },
      { step: 45, degree: 2, octave: 1, len: 2 },
      { step: 47, degree: 7, octave: 0, len: 2 },
      { step: 49, degree: 7, octave: 0, len: 2 },
      { step: 51, degree: 5, octave: 0, len: 2 },
      { step: 53, degree: 3, octave: 0, len: 2 },
      { step: 55, degree: 2, octave: 1, len: 10 },
      // `VI`, open: root an octave down, fifth, tenth, seventh.
      { step: 65, degree: 6, octave: -1, len: 2 },
      { step: 67, degree: 3, octave: 0, len: 2 },
      { step: 69, degree: 1, octave: 1, len: 2 },
      { step: 71, degree: 5, octave: 1, len: 2 },
      { step: 73, degree: 1, octave: 1, len: 2 },
      { step: 75, degree: 3, octave: 0, len: 2 },
      { step: 77, degree: 1, octave: 1, len: 2 },
      { step: 79, degree: 5, octave: 1, len: 2 },
      { step: 81, degree: 6, octave: -1, len: 2 },
      { step: 83, degree: 3, octave: 0, len: 2 },
      { step: 85, degree: 1, octave: 1, len: 2 },
      { step: 87, degree: 5, octave: 1, len: 10 },
      // `III`, open, falling from the seventh to the low root, then climbing back to hang.
      { step: 97, degree: 2, octave: 1, len: 2 },
      { step: 99, degree: 5, octave: 0, len: 2 },
      { step: 101, degree: 7, octave: -1, len: 2 },
      { step: 103, degree: 3, octave: -1, len: 2 },
      { step: 105, degree: 7, octave: -1, len: 2 },
      { step: 107, degree: 5, octave: 0, len: 2 },
      { step: 109, degree: 2, octave: 1, len: 2 },
      { step: 111, degree: 5, octave: 0, len: 2 },
      { step: 113, degree: 3, octave: -1, len: 2 },
      { step: 115, degree: 7, octave: -1, len: 2 },
      { step: 117, degree: 5, octave: 0, len: 2 },
      { step: 119, degree: 2, octave: 1, len: 10 },
    ],
  },
  /**
   * §5A.2. Two bars, repeated four times: eight eighths, then three and the held seventh. The
   * accent is the head of each pair; the held seventh is struck on the offbeat it starts on and
   * then left alone.
   */
  pattern: variant(
    'stranger-things-theme-hanging-seventh-arp-grid',
    'arp',
    0,
    32,
    at('accent', 110, 1),
    on('downbeat', 5, 9, 13, 17, 21),
    on('offbeat', 3, 7, 11, 15, 19, 23),
  ),
}
