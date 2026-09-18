import type { Riff } from '../core/riff'

/**
 * §5A. **The #brew time major-seventh hold**: four voicings, two bars each, held for the
 * arpeggiator to run through.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #618). The patch is the
 * arpeggiated program; the voicings are this library's own, and the entry names no device
 * (invariant 3).
 *
 * ## A pad, because the hand holds and the box strikes
 *
 * The program is printed ARP, so the reader's part is to hold a voicing and change it on the
 * bar; the rhythm is the arpeggiator's, and a grid here would be a second authority over it.
 * That is the held shape (§5A.2, #608): a hook and no `pattern`. **Four notes at most in any
 * voicing**, because four keys held is what an arpeggiator on a four-voice program has to work
 * with, and `test/korg-minilogue-xd.test.ts` counts the peak.
 *
 * ## Why the fourth is forbidden over the I
 *
 * C major's fourth is `F`, a semitone over the major third the voicing is built on, and an
 * arpeggiator plays every held note in turn: an F in the voicing is an F on every pass. One
 * rule, as data, over the chord the figure opens on.
 */
export const brewTimeMajorSeventhHold: Riff = {
  id: 'brew-time-major-seventh-hold',
  name: 'The #brew time major-seventh hold',
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
    'Hold four notes and change them every two bars. The arpeggiator does the playing; your ' +
      'job is the voicing and the moment you move to the next one.',
    'Every voicing carries its seventh. C E G B, then A C E G, then F A C E, then G B D F. ' +
      'Four notes each, close together, and the top note is the one the arpeggiator will keep ' +
      'landing on.',
    'Change on the bar head and not before. An arpeggiator running through a voicing that ' +
      'changes mid-pass plays half of each, and the change is heard as a stumble.',
    'Keep the voicings inside an octave and a half. Spread them wider and the arpeggiator ' +
      'leaps, and a leap on every pass is a pattern nobody hears the chord in.',
    'Never hold F while the first chord is sounding. It sits a semitone over the E, and the ' +
      'arpeggiator will play that clash on every pass.',
    'Let the loop run. Four voicings in eight bars is a cycle, and this one is written to ' +
      'sit under something else rather than to arrive anywhere.',
  ],
  request: {
    id: 'brew-time-major-seventh-hold',
    role: 'pad',
    priority: 1,
    character: 'soft',
    sustain: 'continuous',
    // §12.4. Four held notes: the widest voicing, and the most an arpeggiator here has to run.
    // §12.4/#645. One voice: the arpeggiator sounds the held voicing a note at a time.
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
   * Eight bars, four voicings, each held for its two bars. `baseOctave: 3` puts `C3` at degree
   * 1, an octave below middle C, so the voicings sit from `F2` to `B3` and the arpeggiator has
   * room above them.
   */
  hook: {
    id: 'brew-time-major-seventh-hold-hook',
    forRole: 'pad',
    bars: 8,
    baseOctave: 3,
    notes: [
      // `I`: C3 E3 G3 B3.
      { step: 1, degree: 1, octave: 0, len: 32 },
      { step: 1, degree: 3, octave: 0, len: 32 },
      { step: 1, degree: 5, octave: 0, len: 32 },
      { step: 1, degree: 7, octave: 0, len: 32 },
      // `vi`: A2 C3 E3 G3.
      { step: 33, degree: 6, octave: -1, len: 32 },
      { step: 33, degree: 1, octave: 0, len: 32 },
      { step: 33, degree: 3, octave: 0, len: 32 },
      { step: 33, degree: 5, octave: 0, len: 32 },
      // `IV`: F2 A2 C3 E3.
      { step: 65, degree: 4, octave: -1, len: 32 },
      { step: 65, degree: 6, octave: -1, len: 32 },
      { step: 65, degree: 1, octave: 0, len: 32 },
      { step: 65, degree: 3, octave: 0, len: 32 },
      // `V`: G2 B2 D3 F3.
      { step: 97, degree: 5, octave: -1, len: 32 },
      { step: 97, degree: 7, octave: -1, len: 32 },
      { step: 97, degree: 2, octave: 0, len: 32 },
      { step: 97, degree: 4, octave: 0, len: 32 },
    ],
  },
}
