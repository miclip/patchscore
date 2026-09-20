import type { Riff } from '../core/riff'

/**
 * §5A. **The Tears in Rain held second**: two notes a semitone apart, held at the top of the
 * register for eight bars, and the lower one leaves before the upper one does.
 *
 * **Named after a record, with the figure authored here** (§5A.5). The notes are this library's
 * own and nothing is transcribed: what the entry takes from the record is a register and an
 * intention, which is what every record-named entry here takes.
 *
 * ## The second Blade Runner entry, and it is not the first one's lesson
 *
 * `blade-runner-blues-lead` is a lead: six chords, a borrowed pair the key does not own, entries
 * that land late, and a rule about the third. It is a figure with a line in it. This is the other
 * half of that film's sound and it has no line at all — two pitches, three events, eight bars.
 * A reader who plays both learns two different things from one record, which is the only reason
 * to name it twice.
 *
 * ## What it teaches: where a semitone is a texture rather than a mistake
 *
 * `C#5` and `D5` together are a minor second, and in the middle of a keyboard that is a clash
 * nobody would hold for eight bars. At the top of the register, quietly, with a slow attack, it
 * is a shimmer — the beating between the two is the sound, and it is the thing the figure is for.
 * The lesson is testable in one move: play the same pair two octaves down and it stops working,
 * which is the whole of what register does to an interval.
 *
 * Over the `i` the pair is the ninth and the third of B minor, which is the consonant reading.
 * Over the `iv` the same two notes are the seventh and the sixth of E minor, which is the modal
 * one, and **nothing in the hand moves to make that happen**: the chord underneath does it. A
 * player used to resolving a suspension by moving the voice has to sit still here and let the
 * harmony arrive.
 *
 * ## The entries are staggered, and the release is the ending
 *
 * `D5` alone for two bars first. The ear accepts one note and stops listening to it, and *then*
 * the `C#5` arrives underneath and the whole thing lights up. Entering both together is the same
 * two pitches and a different piece: a cluster struck is a chord, a cluster arrived at is a
 * texture.
 *
 * At bar seven the `D5` releases and the `C#5` is left alone over the `iv`, where it is the sixth
 * and perfectly consonant. **The dissonance outlives the note it was leaning on.** That is the
 * ending, and it is why the figure does not simply stop on both.
 *
 * ## Through-composed, so no grid (§5A.2, #623)
 *
 * `texture` is a struck role, so the schema requires `reArticulatesHook` and refuses silence on
 * it. Three events in eight bars recur on no step of any repeating pass, so `false` is the honest
 * answer and the hook is the whole rhythm.
 *
 * ## The raised seventh is forbidden
 *
 * `A#` is in no chord here and it is the note that would pull eight bars of held colour toward a
 * cadence. This figure does not cadence; it stops. `A` natural is the key's own and the rule does
 * not touch it.
 */
export const tearsInRainHeldSecond: Riff = {
  id: 'tears-in-rain-held-second',
  name: 'The Tears in Rain held second',
  reference: { kind: 'record', name: 'Tears in Rain' },
  bpm: { min: 56, max: 76, default: 64 },
  key: 'B minor',
  technique: [
    'Two notes for the whole figure: D and the C sharp a semitone below it, both well above middle ' +
      'C. Nothing else is played and nothing moves.',
    'Bring the D in first and hold it alone for two bars. Then bring the C sharp in underneath and ' +
      'leave both down. Pressing them together is the same two pitches and a different piece: a ' +
      'cluster struck is a chord, a cluster arrived at is a texture.',
    'Play both as quietly as the patch lets you and give it the slowest attack it has. A ' +
      'semitone this close is only a shimmer while it is quiet; loud, it is two wrong notes.',
    'Keep them up there. The same pair two octaves down is a clash and always will be, which ' +
      'is worth playing once so the register does the explaining.',
    'The chord changes under you at the halfway point and you do nothing. Over the first chord ' +
      'the pair is the ninth and the third; over the second it is the seventh and the sixth. The ' +
      'harmony resolves the tension and the hand never does.',
    'Two bars from the end, let the D go and leave the C sharp alone. It is the sixth of the chord ' +
      'underneath by then, and the note that was the dissonance is the one left standing.',
    'Never play A sharp. It is the raised seventh, and one of them turns eight bars of held ' +
      'colour into something that wants to end.',
  ],
  request: {
    id: 'tears-in-rain-held-second',
    role: 'texture',
    priority: 1,
    character: 'soft',
    sustain: 'continuous',
    // §12.4. Two notes, and they are the figure.
    polyphony: 2,
    // §5A.2/#623. Three events in eight bars: the hook is the whole rhythm.
    reArticulatesHook: false,
  },
  /**
   * §5A/#554. The raised seventh, as data. `C#` is a tone of neither chord, so the rule
   * contradicts nothing it is checked against (#605).
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'i',
        degree: 7,
        alter: 1,
        reason: 'a raised seventh turns held colour into a cadence, and this figure stops rather than ending',
      },
    ],
  },
  harmony: {
    cycleBars: 8,
    progression: [
      { degree: 'i', bars: 4 },
      { degree: 'iv', bars: 4 },
    ],
  },
  /**
   * §5A/§4.1. From bar 1. `baseOctave: 4` puts `B4` at degree 1, so the pair is `C#5` and `D5`:
   * one semitone, high enough for the beating to read as shimmer, which is the whole subject.
   */
  figureStartsAtBar: 1,
  /**
   * Eight bars, two notes, three events. `D5` from step 1 for six bars; `C#5` from step 33 for
   * six bars, so it outlasts the `D` by two and ends the figure alone.
   */
  hook: {
    id: 'tears-in-rain-held-second-hook',
    forRole: 'texture',
    bars: 8,
    baseOctave: 4,
    notes: [
      { step: 1, degree: 3, octave: 0, len: 96 },
      { step: 33, degree: 2, octave: 0, len: 96 },
    ],
  },
}
