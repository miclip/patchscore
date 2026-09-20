import type { Riff } from '../core/riff'

/**
 * §5A. **The Harp xd rolled chord**: four notes a sixteenth apart, bottom to top, all left down.
 * The roll starts before the bar line so the top note lands on the beat.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5). The notes are this
 * library's own and the entry names no device (invariant 3).
 *
 * ## What it teaches, and how it differs from the other staggered entry on this box
 *
 * `swollen-pad-staggered-stack` also enters a chord a note at a time from the bottom, and the two
 * are not the same lesson. There the notes arrive one per beat *through* the first bar, so the
 * chord is heard growing and the bar head is where it starts. Here the four notes are two
 * sixteenths apart and the whole roll is placed **before** the bar line, so what lands on the
 * beat is the top note and the chord is already complete when the bar begins.
 *
 * That is the difference between a chord that grows and a chord that arrives, and it is a
 * decision about where you put the same gesture rather than about which notes are in it.
 *
 * ## Why it is not an arpeggiator
 *
 * The two arpeggiated entries on this box, `#brew time` and `cloud-level-shared-top-drift`, hold
 * a chord and let the machine sound it one note at a time, forever, at a rate the box sets. A
 * roll is the hand doing it once, at a speed the hand chooses, and then **everything stays
 * down**. The notes that have already arrived are still sounding when the top one lands, which is
 * what makes it one chord rather than four notes in a row.
 *
 * ## The first roll is the exception, and it says so
 *
 * A roll that lands on the downbeat has to begin before it, and bar one has nothing before it. So
 * the first chord is rolled from the bar head and the three after it are rolled into their bar
 * heads. A reader hears the difference immediately, which is the cheapest way to teach what the
 * anticipation is doing.
 *
 * ## A `pad`, so a hook and nothing else
 *
 * `pad` is in `NON_PATTERN_BEARING_ROLES`, so the entry is its hook alone (§5A.2, #608): no
 * `pattern` and no `reArticulatesHook`. The roll lives in the note steps, which is where it
 * belongs — a grid would be a second claim about rhythm on a figure whose rhythm is the hook.
 *
 * **`soft` rather than `hard`, and the reason is the library rather than the sound.** `pad / hard`
 * is authored by exactly one device anywhere, which would make this the one figure in the library
 * that can resolve on a single box and nowhere else. A roll wants a slow attack in any case, and
 * `soft` is authored by twenty-eight devices, so a reader with almost any rig can play it. It is
 * the character `#brew time` also asks for, and the two are not the same figure: one is held for
 * an arpeggiator, this one is rolled by hand.
 */
export const harpXdRolledChord: Riff = {
  id: 'harp-xd-rolled-chord',
  name: 'The Harp xd rolled chord',
  reference: { kind: 'patch', name: 'Harp xd' },
  bpm: { min: 68, max: 92, default: 80 },
  key: 'Bb major',
  technique: [
    'Four notes a chord, rolled bottom to top, two sixteenths apart, and every one stays down. ' +
      'The chord is not struck and it is not arpeggiated: it arrives.',
    'Start the roll before the bar line so the top note lands on the beat. Three sixteenths ' +
      'early for a four-note roll at this spacing. What the ear hears on the downbeat is the top ' +
      'of a chord that is already complete.',
    'The first chord is the exception and you can hear why: there is nothing before bar one to ' +
      'roll from, so it is rolled from the bar head instead. Play the figure twice round and the ' +
      'first chord is the one that sounds late.',
    'Keep the hand down. A roll where the early notes have already released is four notes in a ' +
      'row, which is a different thing and a worse one here.',
    'The chords are a major seventh, a minor seventh, another major seventh and a dominant. Roll ' +
      'all of them at the same speed; changing the speed makes the roll the subject, and it is ' +
      'the placement that is the subject.',
    'Never play B flat while the last chord is sounding. It is the key’s own root and a ' +
      'suspension over that chord, and this figure has nothing after it to resolve one.',
  ],
  request: {
    id: 'harp-xd-rolled-chord',
    role: 'pad',
    priority: 1,
    character: 'soft',
    sustain: 'continuous',
    // §12.4. Four notes held together, which is the whole of this box's polyphony.
    polyphony: 4,
  },
  /**
   * §5A/#554. The tonic over the `V`, as data: a suspension this figure never resolves, because
   * there is no bar after it. `Bb` is not a tone of `F`, so the rule contradicts nothing (#605).
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'V',
        degree: 1,
        reason: 'the tonic over the dominant is a suspension, and this figure has no bar left to resolve it in',
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
   * §5A/§4.1. From bar 1. `baseOctave: 3` puts `Bb3` at degree 1. Each chord is a seventh built
   * in thirds from its own root, and every note holds until the next roll begins.
   */
  figureStartsAtBar: 1,
  /**
   * Eight bars, sixteen notes: four rolls of four. The first is struck from step 1; the others
   * begin at steps 27, 59 and 91 so their top notes land on 33, 65 and 97.
   */
  hook: {
    id: 'harp-xd-rolled-chord-hook',
    forRole: 'pad',
    bars: 8,
    baseOctave: 3,
    notes: [
      // `I`, Bb major seventh: Bb3 D4 F4 A4, rolled from the bar head.
      { step: 1, degree: 1, octave: 0, len: 26 },
      { step: 3, degree: 3, octave: 0, len: 24 },
      { step: 5, degree: 5, octave: 0, len: 22 },
      { step: 7, degree: 7, octave: 0, len: 20 },
      // `vi`, G minor seventh: G3 Bb3 D4 F4, rolled into bar 3.
      { step: 27, degree: 6, octave: -1, len: 32 },
      { step: 29, degree: 1, octave: 0, len: 30 },
      { step: 31, degree: 3, octave: 0, len: 28 },
      { step: 33, degree: 5, octave: 0, len: 26 },
      // `IV`, Eb major seventh: Eb4 G4 Bb4 D5, rolled into bar 5.
      { step: 59, degree: 4, octave: 0, len: 32 },
      { step: 61, degree: 6, octave: 0, len: 30 },
      { step: 63, degree: 1, octave: 1, len: 28 },
      { step: 65, degree: 3, octave: 1, len: 26 },
      // `V`, F dominant seventh: F4 A4 C5 Eb5, rolled into bar 7.
      { step: 91, degree: 5, octave: 0, len: 38 },
      { step: 93, degree: 7, octave: 0, len: 36 },
      { step: 95, degree: 2, octave: 1, len: 34 },
      { step: 97, degree: 4, octave: 1, len: 32 },
    ],
  },
}
