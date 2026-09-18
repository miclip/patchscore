import type { Riff } from '../core/riff'

/**
 * §5A. **The Harp C Chord arpeggiated hold**: four notes held under the arpeggiator, four
 * voicings of two bars each, the same shape moved.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #645). The patch has
 * *Chord* in its name on a box that plays two notes; the voicings are this library's own, and
 * the entry names no device (invariant 3). Nobody has played it. The name is the whole of the
 * evidence, so the prose says what to play and nothing about what the preset sounds like.
 *
 * ## An arpeggiated hold, and why that is the lesson
 *
 * `arpeggiatedHold: true` (§5A.2, §12.4): the hand holds four notes and the box's arpeggiator
 * sounds them one at a time, so the part costs one voice and the request asks for one. That is
 * what makes the figure playable at all on a box that sounds one or two notes, and it is the
 * first thing the technique teaches, since it is a fact about the instrument and not about the
 * voicing. The hook is the whole figure. There is no grid: the arpeggiator is the rhythm.
 *
 * ## Deliberately plain voicings
 *
 * Root, third, fifth, octave, every time. `C3 E3 G3 C4`, `A2 C3 E3 A3`, `F2 A2 C3 F3`,
 * `G2 B2 D3 G3`: one shape moved to four roots, so a reader hears the arpeggiator working and
 * not the voicing. `I vi IV V` in C major, two bars each, eight bars round.
 *
 * ## What the pattern setting does, which nothing else in the library teaches
 *
 * Played upward, every voicing comes out ascending and the melody is the chord. Played in the
 * order the keys went down, the same four notes give whichever line the hand chose: press the
 * G first and the line starts on the G. The chord is fixed and the tune is the player's. That
 * is the second lesson, and the ground the two arpeggiated pad entries on a four-voice box do
 * not cover, since holding four costs those nothing and their lessons are the voicing and the
 * moment of change.
 *
 * ## Not the ladder
 *
 * The other figure named for an arp preset on this box is struck: one note a step, sequenced
 * or played as written, and never held. This one is held and never struck by the hand. The two
 * sit on different characters and different shapes and must stay that way.
 */
export const harpCChordArpeggiatedHold: Riff = {
  id: 'harp-c-chord-arpeggiated-hold',
  name: 'The Harp C Chord arpeggiated hold',
  reference: { kind: 'patch', name: 'Harp C Chord' },
  bpm: { min: 100, max: 124, default: 112 },
  key: 'C major',
  technique: [
    'Hold four notes at once and switch the arpeggiator on. A box that sounds one or two notes ' +
      'cannot play four held keys as a chord; with the arpeggiator running it plays them one ' +
      'after another, and the chord is heard. On such a box this is the only way to hold four ' +
      'notes at all.',
    'C major first: C, E, G and the C above. Then A minor: the A below, C, E, A. Then F: F, A, ' +
      'C, F. Then G: G, B, D, G. Root, third, fifth and the root again on top, the same shape ' +
      'moved to each chord, two bars each.',
    'Set the pattern to play upward. Each voicing comes out from the bottom, C E G C, then ' +
      'A C E A, and so on round. The line ascends, and the melody is the chord.',
    'Now set the pattern to play the notes in the order you pressed them, ORDR where a panel ' +
      'abbreviates it. Press the same four keys with a different finger first and you get a ' +
      'different line: G, then C, E and the top C gives G C E C. Same chord, different tune, ' +
      'and the order of your fingers decides it.',
    'Under that pattern, every change of chord is also the choice of a melody. Land the first ' +
      'finger on the note you want the two bars to open on and press the other three after it.',
  ],
  request: {
    id: 'harp-c-chord-arpeggiated-hold',
    role: 'arp',
    priority: 1,
    character: 'bright',
    sustain: 'continuous',
    // §12.4. One voice: the arpeggiator sounds the four held notes one at a time.
  },
  // §5A.2/§12.4/#645. The hand holds and the box strikes, so no grid and one voice.
  arpeggiatedHold: true,
  harmony: {
    cycleBars: 8,
    progression: [
      { degree: 'I', bars: 2 },
      { degree: 'vi', bars: 2 },
      { degree: 'IV', bars: 2 },
      { degree: 'V', bars: 2 },
    ],
  },
  figureStartsAtBar: 1,
  /**
   * Eight bars, four voicings, each held for its two bars. `baseOctave: 3` puts `C3` at
   * degree 1, so the lowest note is `F2` and the highest `C4`.
   */
  hook: {
    id: 'harp-c-chord-arpeggiated-hold-hook',
    forRole: 'arp',
    bars: 8,
    baseOctave: 3,
    notes: [
      // `I`: C3 E3 G3 C4.
      { step: 1, degree: 1, octave: 0, len: 32 },
      { step: 1, degree: 3, octave: 0, len: 32 },
      { step: 1, degree: 5, octave: 0, len: 32 },
      { step: 1, degree: 1, octave: 1, len: 32 },
      // `vi`: A2 C3 E3 A3.
      { step: 33, degree: 6, octave: -1, len: 32 },
      { step: 33, degree: 1, octave: 0, len: 32 },
      { step: 33, degree: 3, octave: 0, len: 32 },
      { step: 33, degree: 6, octave: 0, len: 32 },
      // `IV`: F2 A2 C3 F3.
      { step: 65, degree: 4, octave: -1, len: 32 },
      { step: 65, degree: 6, octave: -1, len: 32 },
      { step: 65, degree: 1, octave: 0, len: 32 },
      { step: 65, degree: 4, octave: 0, len: 32 },
      // `V`: G2 B2 D3 G3.
      { step: 97, degree: 5, octave: -1, len: 32 },
      { step: 97, degree: 7, octave: -1, len: 32 },
      { step: 97, degree: 2, octave: 0, len: 32 },
      { step: 97, degree: 5, octave: 0, len: 32 },
    ],
  },
}
