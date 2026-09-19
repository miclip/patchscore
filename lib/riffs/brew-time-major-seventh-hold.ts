import type { Riff } from '../core/riff'

/**
 * §5A. **The #brew time three-against-the-bar hold**: four voicings held for the arpeggiator,
 * two bars each, and the two in the middle hold three notes where the others hold four. A
 * four-note pass at sixteenths is one beat long and lands in the same place in every beat; a
 * three-note pass is three sixteenths, does not divide the bar, and drifts through it until a
 * four-note voicing at the end locks it back.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #618). The patch is the
 * arpeggiated program; the voicings are this library's own, and the entry names no device
 * (invariant 3). Nobody here has heard the patch. What the figure takes from it is that it
 * arpeggiates, and the manual of the box that ships it prints the two settings the lesson
 * rests on: an arpeggiator step of `16th` (p.40, `Rate`) and an ascending type (p.18, the
 * voice-mode table).
 *
 * ## The lesson, which is arithmetic the arpeggiator does for you
 *
 * A bar is sixteen sixteenths. Hold four notes and the arpeggiator plays a pass in four
 * sixteenths, which is a beat, so the bottom note falls on every beat and the pattern sits on
 * the grid. Hold three and a pass is three sixteenths. Sixteen is not a multiple of three, so
 * five passes and one note fill a bar, and the next bar's head catches the pass one note
 * further along than the last one did: whatever the first downbeat of a three-note hold lands
 * on, the next lands on the note after it, and the one after that on the note after that.
 * The same held chord arrives in a different place in every bar, and nothing was played to
 * make it move. Go back to four notes and, whichever note the downbeat catches, that note
 * comes round on every beat from then on. That is the lock, and it is why the last voicing
 * has four notes and the first does too: the figure starts on the grid, leaves it for four
 * bars, and comes back.
 *
 * The first published version held four notes on every chord and taught that the hand holds
 * while the box strikes, which `cloud-level-shared-top-drift` teaches on the same box with a
 * move of its own on top. This entry's move is the count.
 *
 * ## A pad, because the hand holds and the box strikes
 *
 * The program is printed ARP, so the reader's part is to hold a voicing and change it on the
 * bar; the rhythm is the arpeggiator's, and a grid here would be a second authority over it.
 * That is the held shape (§5A.2, #608): a hook and no `pattern`. **Four notes at most in any
 * voicing**, because four keys held is what an arpeggiator on a four-voice program has to work
 * with, and `test/korg-minilogue-xd.test.ts` counts the peak at four: the two four-note
 * voicings are the ones that supply it.
 *
 * ## Why the fourth is forbidden over the I
 *
 * C major's fourth is `F`, a semitone over the major third the voicing is built on, and an
 * arpeggiator plays every held note in turn: an F in the voicing is an F on every pass. One
 * rule, as data, over the chord the figure opens on. The `F3` in the last voicing is over the
 * `V`, where it is the chord's seventh, and the rule does not reach it.
 */
export const brewTimeMajorSeventhHold: Riff = {
  id: 'brew-time-major-seventh-hold',
  name: 'The #brew time three-against-the-bar hold',
  reference: { kind: 'patch', name: '#brew time' },
  bpm: { min: 80, max: 96, default: 88 },
  key: 'C major',
  /**
   * §12.4/#645. The voicing is held and the arpeggiator sounds it one note at a time, so
   * it costs one voice rather than four. True before this field existed; it went unsaid
   * because this box has four voices and nothing refused it.
   */
  arpeggiatedHold: true,
  technique: [
    'Set the arpeggiator to sixteenths, rising, and hold. Four chords, two bars each: C major ' +
      'seventh, A minor, F major, G seventh. The first and last are four notes; the two in the ' +
      'middle are three, and the count is the whole figure.',
    'Four notes at sixteenths is one pass a beat. The bottom note lands on every beat, and the ' +
      'pattern sits on the grid where you can stop hearing it.',
    'Three notes is a pass every three sixteenths, and three does not go into sixteen. ' +
      'Whatever note the bar head catches, the next bar head catches the note after it, and ' +
      'the one after that the note after that. The same held chord arrives somewhere ' +
      'different in every bar, and you played nothing to move it.',
    'Hold C, E, G and B for two bars, on the grid. Then lift the G and the B and put A under ' +
      'the C and E: three notes, and listen to the pass slide off the beat over the next four ' +
      'bars. For the F, raise only the E to F and keep the other two.',
    'On the G seventh go back to four: G, B, D, F. Whichever note the downbeat catches now ' +
      'comes round on every beat after it, and the pattern is back on the grid. That is what ' +
      'the fourth note is for.',
    'Never hold F while the first chord is sounding. It sits a semitone over the E, and the ' +
      'arpeggiator will play that clash on every pass.',
  ],
  request: {
    id: 'brew-time-major-seventh-hold',
    role: 'pad',
    priority: 1,
    character: 'soft',
    sustain: 'continuous',
    // §12.4/#645. One voice: the arpeggiator sounds the held voicing a note at a time. The
    // widest voicing is four, on the first chord and the last.
    polyphony: 1,
  },
  /**
   * §5A/#554. The fourth over the `I` as data.
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'I',
        degree: 4,
        reason: 'it sits a semitone over the major third and the arpeggiator plays it on every pass',
      },
    ],
  },
  harmony: {
    cycleBars: 8,
    progression: [
      { degree: 'I', bars: 2 },
      { degree: 'vi', bars: 2 },
      { degree: 'IV', bars: 2 },
      { degree: 'V', bars: 2 },
    ],
  },
  /**
   * Eight bars, four voicings, each held for its two bars: four notes, three, three, four.
   * `baseOctave: 3` puts `C3` at degree 1, an octave below middle C, so the voicings sit from
   * `G2` to `B3` and the arpeggiator has room above them. Within a step the notes are authored
   * bottom to top, and that order is the voicing (`resolveHook` keeps it).
   */
  hook: {
    id: 'brew-time-major-seventh-hold-hook',
    forRole: 'pad',
    bars: 8,
    baseOctave: 3,
    notes: [
      // `I`: C3 E3 G3 B3. Four notes, one pass a beat.
      { step: 1, degree: 1, octave: 0, len: 32 },
      { step: 1, degree: 3, octave: 0, len: 32 },
      { step: 1, degree: 5, octave: 0, len: 32 },
      { step: 1, degree: 7, octave: 0, len: 32 },
      // `vi`: A2 C3 E3. Three notes, and the pass leaves the beat.
      { step: 33, degree: 6, octave: -1, len: 32 },
      { step: 33, degree: 1, octave: 0, len: 32 },
      { step: 33, degree: 3, octave: 0, len: 32 },
      // `IV`: A2 C3 F3. Three notes still; only the top moved.
      { step: 65, degree: 6, octave: -1, len: 32 },
      { step: 65, degree: 1, octave: 0, len: 32 },
      { step: 65, degree: 4, octave: 0, len: 32 },
      // `V`: G2 B2 D3 F3. Four notes again, and the pass is back on the beat.
      { step: 97, degree: 5, octave: -1, len: 32 },
      { step: 97, degree: 7, octave: -1, len: 32 },
      { step: 97, degree: 2, octave: 0, len: 32 },
      { step: 97, degree: 4, octave: 0, len: 32 },
    ],
  },
}
