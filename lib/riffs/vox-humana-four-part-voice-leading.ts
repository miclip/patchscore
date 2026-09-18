import type { Riff } from '../core/riff'

/**
 * §5A. **The Vox Humana four-part voice leading**: four held voices over four chords, two bars a
 * chord, and no voice ever leaps. Every move between one chord and the next is a semitone or a
 * whole step, and the ear follows the voices rather than the chords.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5). A Vox Humana is a vocal
 * stop, and the figure is four parts moving as four voices. The notes are this library's own,
 * and the entry names no device (invariant 3).
 *
 * ## The one claim
 *
 * Bass, tenor, alto, soprano: `A3 C4 E4 A4` over the A minor, `A3 C4 F4 A4` over the F, `G3 C4
 * E4 G4` over the C, `G#3 B3 E4 G#4` over the E. Sixteen voice transitions across the loop, the
 * wrap from the E back to the A minor included. Six of them hold. Ten move, and of those eight
 * are semitones and two are whole steps, the bass and the soprano both falling a tone from the
 * F to the C. Nothing is wider, and a revoicing of one chord that kept every note in key could
 * still break that, so it is held as a property of the resolved pitches rather than of the notes.
 *
 * ## What this lesson is, set against the other two pads on the same box
 *
 * `moog-55-strings-suspension-writing` is suspension and resolution: a top line that withholds
 * a chord's third for a bar and then gives it. `soft-orchestra-slow-changes` is a pedal tone:
 * one note held while the harmony moves under it. Neither is this. Here all four voices are the
 * subject, no single line is the tune, and the point is how little each one has to move for the
 * chord to change its name. Am to F moves one voice a semitone and three hold. That is the
 * whole first change.
 *
 * ## Why the natural seventh is forbidden over the V
 *
 * A minor's seventh is `G`. The `V` is E major, whose third is `G#`, and the figure plays it in
 * two voices as `alter: 1` on degree 7. It is the one pitch the key does not own and it is what
 * turns the loop: `G#` resolves up to `A` at both ends of the voicing on the repeat. A natural
 * `G` sounding over that chord collapses the lift, so it is forbidden as data over the `V`, the
 * same shape as `blade-runner-blues-lead`'s rule. The `G#` itself is the raised spelling of the
 * same degree, which the rule does not touch, and the `G` two bars earlier is over the `III`,
 * where it is the chord's fifth and the rule does not reach.
 *
 * ## A `pad`, so a hook and nothing else
 *
 * `pad` is in `NON_PATTERN_BEARING_ROLES`, so a riff on it is its hook alone (§5A.2, #608): no
 * `pattern`, and no `reArticulatesHook` in either spelling. The articulation is the note lengths,
 * and every note runs its chord's full 32 steps.
 *
 * ## Four notes, which is the timbre's whole polyphony
 *
 * `polyphony: 4` (§12.4). The box that ships the patch gives one timbre four voices, so the
 * figure fills it exactly and asks for nothing more.
 */
export const voxHumanaFourPartVoiceLeading: Riff = {
  id: 'vox-humana-four-part-voice-leading',
  name: 'The Vox Humana four-part voice leading',
  reference: { kind: 'patch', name: 'Vox Humana' },
  bpm: { min: 72, max: 96, default: 84 },
  key: 'A minor',
  technique: [
    'Four voices, four chords, two bars each, everything held. Each voice has its own line, ' +
      'and the line is what you are playing. The chords are what the four lines add up to.',
    'From the A minor to the F, move one voice: the E steps up a semitone to F. The other three ' +
      'stay exactly where they are. The chord changes its name and almost nothing happened.',
    'From the F to the C, three voices come down a step and the C holds. The A in the bass ' +
      'falls to G, the F falls to E, and the top A falls to G. Keep the C still and let the ' +
      'others settle around it.',
    'From the C to the E, three voices move a semitone and the E holds through. The G in the ' +
      'bass rises to G sharp, the C falls to B, and the top G rises to G sharp. This is the ' +
      'smallest change in the loop and the one that turns it.',
    'On the repeat, both G sharps rise to A and the B rises to C, with the E still holding. ' +
      'Every voice returns home by a semitone. No voice anywhere in the loop moves more than a ' +
      'whole step.',
    'Never play G natural while the E chord is sounding. The G sharp is the third of that ' +
      'chord and the one note A minor does not own; a natural G against it collapses the lift.',
    'Every voice enters on the bar head with its chord and holds until the chord moves. Slow ' +
      'attack, slow release, and let each chord still be swelling when the next arrives.',
  ],
  request: {
    id: 'vox-humana-four-part-voice-leading',
    role: 'pad',
    priority: 1,
    character: 'soft',
    sustain: 'continuous',
    // §12.4. Four voices, and the box that ships the patch has exactly four to give.
    polyphony: 4,
  },
  /**
   * §5A/#554. One rule, as data: the natural seventh over the `V`. The `G#` the figure plays is
   * the same degree with `alter: 1`, so it passes; a `G` over that chord does not parse. Every
   * entry is on a bar head, so there is no offset to state.
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'V',
        degree: 7,
        reason: 'the natural seventh of the key collapses the major V that turns the loop',
      },
    ],
  },
  /**
   * §5A/§4.1. From bar 1. `i VI III V`, two bars each, and the `V` is major: the raised seventh
   * the figure plays in two voices is its third.
   */
  figureStartsAtBar: 1,
  harmony: {
    cycleBars: 8,
    progression: [
      { degree: 'i', bars: 2 },
      { degree: 'VI', bars: 2 },
      { degree: 'III', bars: 2 },
      { degree: 'V', bars: 2 },
    ],
  },
  /**
   * Eight bars, sixteen notes: four voicings of four. `baseOctave: 3` puts `A3` at degree 1, so
   * `octave: 0` runs `A3` to `G4`, the soprano sits at `octave: 1`, and the two low `G`s of the
   * bass are degree 7 at `octave: -1`.
   *
   * Each chord holds 32 steps, chord *n* from `(n-1)*32+1` to `n*32`, and every note enters on
   * its chord's first step and holds all 32. Within a step the notes are authored bottom to top,
   * bass, tenor, alto, soprano, and that order is the voicing (`resolveHook` keeps it).
   */
  hook: {
    id: 'vox-humana-four-part-voice-leading-hook',
    forRole: 'pad',
    bars: 8,
    baseOctave: 3,
    notes: [
      // `i`, A minor: A3 C4 E4 A4.
      { step: 1, degree: 1, octave: 0, len: 32 },
      { step: 1, degree: 3, octave: 0, len: 32 },
      { step: 1, degree: 5, octave: 0, len: 32 },
      { step: 1, degree: 1, octave: 1, len: 32 },
      // `VI`, F major: A3 C4 F4 A4. One voice moved, a semitone.
      { step: 33, degree: 1, octave: 0, len: 32 },
      { step: 33, degree: 3, octave: 0, len: 32 },
      { step: 33, degree: 6, octave: 0, len: 32 },
      { step: 33, degree: 1, octave: 1, len: 32 },
      // `III`, C major: G3 C4 E4 G4. Three voices down a step, the C4 held.
      { step: 65, degree: 7, octave: -1, len: 32 },
      { step: 65, degree: 3, octave: 0, len: 32 },
      { step: 65, degree: 5, octave: 0, len: 32 },
      { step: 65, degree: 7, octave: 0, len: 32 },
      // `V`, E major: G#3 B3 E4 G#4. Three voices by a semitone, the E4 held. The raised
      // seventh is the chord's third; the natural one is forbidden above.
      { step: 97, degree: 7, octave: -1, len: 32, alter: 1 },
      { step: 97, degree: 2, octave: 0, len: 32 },
      { step: 97, degree: 5, octave: 0, len: 32 },
      { step: 97, degree: 7, octave: 0, len: 32, alter: 1 },
    ],
  },
}
