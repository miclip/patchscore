import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The PD BoilerBass rising bubble line**: an acid line that simmers on the root, bubbles
 * up to the third more often each bar, and boils over an octave in the fourth.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #624). The patch is the
 * acid bass; the notes are this library's own, and the entry names no device (invariant 3).
 *
 * ## What the name gives the figure, and what it does not
 *
 * Nobody writing this had heard the preset. What its name says is *boiler*, and the figure takes
 * that at its word visibly: a pot comes to the boil by degrees, so the line has one bubble in
 * bar one, two in bar two, three in bar three, and in bar four it boils over and the chord goes
 * with it. The pass then starts again cold. The prose says what to play and nothing about what
 * the preset sounds like, because the name is the whole of the evidence (§3.7).
 *
 * ## One note at a time, by construction
 *
 * No two notes share a step: every root that leads into a bubble ends the step before the third
 * begins, so the peak is one and `test/riff.test.ts` counts it. The slide is a fingering, said
 * in the prose and conditional on the sound gliding at all, and not a second sounding note.
 *
 * ## The harmony is context, and the boil-over moves with it
 *
 * `i` for three bars and `VII` for the fourth, in D minor. The line sits on `D2` for three bars,
 * and where the chord moves to C major the line moves to `C2` and jumps its octave: the same
 * gesture as a bubble, wider, on a new root. Every note in the fourth bar is a chord tone of the
 * C.
 *
 * ## Why the raised third is forbidden
 *
 * D minor's third is `F`, and every bubble goes to it. Raise it to `F#` and the bubble is a blues
 * lick over a major chord. `F#` is not in the key, so the rule reaches the whole piece (§5A.8),
 * and neither chord of the cycle carries it.
 */
export const pdBoilerbassRisingBubbleLine: Riff = {
  id: 'pd-boilerbass-rising-bubble-line',
  name: 'The PD BoilerBass rising bubble line',
  reference: { kind: 'patch', name: 'PD BoilerBass' },
  bpm: { min: 124, max: 140, default: 132 },
  key: 'D minor',
  technique: [
    'Simmer on the root. Every eighth is a D, one sixteenth long, with a sixteenth of silence ' +
      'after it. That is the pot before it boils, and most of the figure is this.',
    'A bubble is the root held for an eighth and the minor third above it for the next. One ' +
      'bubble at the end of bar one, two in bar two, three in bar three, the last of them ' +
      'rising to the fifth instead.',
    'If the sound glides, keep the root down until the third is struck, so the glide carries ' +
      'the bubble up. Lift before the next root, so it starts clean. If the sound does not ' +
      'glide, the third is a plain step and the figure still bubbles.',
    'Bar four boils over. The chord moves to C, the line moves to a low C and jumps its ' +
      'octave, drops to the G between, climbs back, falls the octave, and stops a beat before ' +
      'the bar line.',
    'The pass starts again cold. Come back to the low D on the bar head with a fresh attack, ' +
      'and leave the last beat of bar four silent so that attack has something to land on.',
    'Never play F sharp. It is the raised third of D minor, and one F sharp turns a bubble ' +
      'into a blues lick over a chord this line does not have.',
    'The accents are the roots that slide. Play the bar heads loudest, the root under each ' +
      'bubble next, and every plain eighth beneath those, so the ear counts the bubbles.',
  ],
  request: {
    id: 'pd-boilerbass-rising-bubble-line',
    role: 'acid',
    priority: 1,
    character: 'dirty',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  /**
   * §5A/#554. The raised third as data, over the `i`, and reaching the whole piece because the
   * key does not have it. Every entry is on the bar head, so there is no offset to state.
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'i',
        degree: 3,
        alter: 1,
        reason: 'the raised third turns a bubble into a blues lick over a chord this line does not have',
      },
    ],
  },
  harmony: {
    cycleBars: 4,
    progression: [
      { degree: 'i', bars: 3 },
      { degree: 'VII', bars: 1 },
    ],
  },
  /**
   * §5A/§4.1. The whole cycle, from bar 1. `baseOctave: 2` puts `D2` at degree 1; the bubbles
   * reach `F2` and `A2`, and the boil-over reaches `C3`.
   */
  figureStartsAtBar: 1,
  /**
   * Four bars. A plain eighth is one step long; a root that leads into a bubble is two, and the
   * third after it is two, so the pair fills the eighth and the one after with no gap for the
   * glide to lose.
   */
  hook: {
    id: 'pd-boilerbass-rising-bubble-line-hook',
    forRole: 'acid',
    bars: 4,
    baseOctave: 2,
    notes: [
      // Bar 1: six plain eighths, then the first bubble on beat four.
      { step: 1, degree: 1, octave: 0, len: 1 },
      { step: 3, degree: 1, octave: 0, len: 1 },
      { step: 5, degree: 1, octave: 0, len: 1 },
      { step: 7, degree: 1, octave: 0, len: 1 },
      { step: 9, degree: 1, octave: 0, len: 1 },
      { step: 11, degree: 1, octave: 0, len: 1 },
      { step: 13, degree: 1, octave: 0, len: 2 },
      { step: 15, degree: 3, octave: 0, len: 2 },
      // Bar 2: two bubbles, on beats two and four.
      { step: 17, degree: 1, octave: 0, len: 1 },
      { step: 19, degree: 1, octave: 0, len: 1 },
      { step: 21, degree: 1, octave: 0, len: 2 },
      { step: 23, degree: 3, octave: 0, len: 2 },
      { step: 25, degree: 1, octave: 0, len: 1 },
      { step: 27, degree: 1, octave: 0, len: 1 },
      { step: 29, degree: 1, octave: 0, len: 2 },
      { step: 31, degree: 3, octave: 0, len: 2 },
      // Bar 3: three bubbles, on beats one, two and four, the last rising to the fifth.
      { step: 33, degree: 1, octave: 0, len: 2 },
      { step: 35, degree: 3, octave: 0, len: 2 },
      { step: 37, degree: 1, octave: 0, len: 2 },
      { step: 39, degree: 3, octave: 0, len: 2 },
      { step: 41, degree: 1, octave: 0, len: 1 },
      { step: 43, degree: 1, octave: 0, len: 1 },
      { step: 45, degree: 1, octave: 0, len: 2 },
      { step: 47, degree: 5, octave: 0, len: 2 },
      // Bar 4, over the `VII`: C2 up to C3, down to G2, back to C3, down to C2, and a beat of
      // silence before the pass.
      { step: 49, degree: 7, octave: -1, len: 2 },
      { step: 51, degree: 7, octave: 0, len: 2 },
      { step: 53, degree: 4, octave: 0, len: 2 },
      { step: 55, degree: 7, octave: 0, len: 2 },
      { step: 57, degree: 7, octave: -1, len: 1 },
      { step: 59, degree: 7, octave: -1, len: 1 },
    ],
  },
  /**
   * §5A.2. One pass. Struck: every root the line returns to after lifting, which is every D and
   * the two C2s the fourth bar begins and ends on. Unstruck: every note that follows a held
   * note, so the thirds, the fifth and the whole of the boil-over between 51 and 57 arrive off
   * the note before them, which is what a bubble is. Bar heads at 118, the root under each
   * bubble at 110, the other beats as downbeats and the plain "and"s as offbeats. Steps 60 to
   * 64 are the silence, and nothing strikes them.
   */
  pattern: variant(
    'pd-boilerbass-rising-bubble-line-grid',
    'acid',
    0,
    64,
    at('accent', 118, 1, 17, 33, 49),
    at('accent', 110, 13, 21, 29, 37, 45),
    on('downbeat', 5, 9, 25, 41),
    on('offbeat', 3, 7, 11, 19, 27, 43, 59),
  ),
}
