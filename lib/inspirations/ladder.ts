import { at, on, variant } from '../core/authoring'
import type { Inspiration } from '../core/inspiration'

/**
 * Ladder (§5). The other technique influence, and the only one in the library that claims the
 * melodic line as well as the bass under it.
 *
 * **Nothing here names a direction.** `bass-mid`, `lead`, a band number and a step (§5).
 *
 * The influence in one line: no part holds a note. Every hit is the next tone of the chord above
 * the last one, so a chord is climbed a rung at a time instead of being stated, and the two parts
 * climb the same ladder at different speeds.
 *
 * ## Where the arpeggio actually lives
 *
 * Half of it lives in the notes, and that is not a shortcut. A `Pattern` is rhythm and slot; it
 * carries no pitch, because pitch belongs to harmony and hooks (§4.1) and a step pattern that
 * named notes would be a second, weaker harmony language. So the steps here say *when* a rung is
 * struck — evenly, at a rate that doubles with the band — and the prose says what a rung is. A
 * reader gets both halves on one page, which is the only place they need to meet.
 *
 * ## The gap in every beat
 *
 * At the two busiest bands the line runs in sixteenths, but the *fourth* sixteenth of each beat
 * is left empty at every band. Three struck and one silent is what separates a climb from a
 * texture: the ear regroups on the gap, hears the rungs in threes, and can still find the beat.
 * Filling it would give a perfectly even sixteenth run, which is a wall rather than a figure.
 *
 * ## Why the bass moves at half the speed
 *
 * Two parts climbing at the same rate are one part played twice. Halving the bass means the two
 * agree on the bar and disagree everywhere else, which is what makes the pair sound like a
 * mechanism rather than a doubling — and it leaves the low end legible at the bands where the
 * line above has gone to sixteenths.
 *
 * ## Why it replaces rather than adds
 *
 * A held bass note beside a climbing one is not an arpeggiated influence, it is two bass parts.
 * Replacement at `(role, band)` is what makes the influence reliably audible instead of a coin
 * toss between two variants at the same slot (§5), so Ladder takes both roles at all four bands
 * or reports that the direction had nothing there to take.
 *
 * No tempo shift, for the same reason Echo carries none: this is a way of playing a chord, not a
 * speed at which to play it.
 */
export const ladder: Inspiration = {
  id: 'ladder',
  name: 'Ladder',
  patch: {
    replacePatterns: [
      // ---- lead: the climb, doubling in rate with each band ------------------------------
      // 32 steps — two bars — so the ladder is long enough to be a figure and short enough to
      // come round twice inside a four-bar phrase. Band 0 is a rung every half bar; band 1 a
      // rung a beat; band 2 eighths; band 3 sixteenths minus the fourth of every beat.
      variant('ladder-lead-b0', 'lead', 0, 32, on('downbeat', 1, 9, 17, 25)),
      variant('ladder-lead-b1', 'lead', 1, 32, on('downbeat', 1, 5, 9, 13, 17, 21, 25, 29)),
      variant(
        'ladder-lead-b2',
        'lead',
        2,
        32,
        on('downbeat', 1, 5, 9, 13, 17, 21, 25, 29),
        on('offbeat', 3, 7, 11, 15, 19, 23, 27, 31),
      ),
      // The accent replaces the downbeat on step 1 rather than joining it — the bottom rung is
      // where the climb restarts, and it is the only hit here that is not simply the next one.
      variant(
        'ladder-lead-b3',
        'lead',
        3,
        32,
        at('accent', 104, 1),
        on('downbeat', 5, 9, 13, 17, 21, 25, 29),
        on('offbeat', 3, 7, 11, 15, 19, 23, 27, 31),
        at('ghost', 46, 2, 6, 10, 14, 18, 22, 26, 30),
      ),

      // ---- bass-mid: the same ladder, half the rate --------------------------------------
      // Every band is exactly one step behind the line above it: a rung a bar, then a rung a
      // half bar, then quarters with a pickup offbeat into each one, then every offbeat filled.
      variant('ladder-bass-mid-b0', 'bass-mid', 0, 32, on('downbeat', 1, 17)),
      variant('ladder-bass-mid-b1', 'bass-mid', 1, 32, on('downbeat', 1, 9, 17, 25)),
      variant(
        'ladder-bass-mid-b2',
        'bass-mid',
        2,
        32,
        on('downbeat', 1, 9, 17, 25),
        on('offbeat', 7, 15, 23, 31),
      ),
      variant(
        'ladder-bass-mid-b3',
        'bass-mid',
        3,
        32,
        at('accent', 102, 1),
        on('downbeat', 9, 17, 25),
        on('offbeat', 3, 7, 11, 15, 19, 23, 27, 31),
      ),
    ],

    notes: [
      'Every hit is the next chord tone above the last. When the chord runs out, begin again an octave higher.',
      'The bass climbs at half the speed of the line above it, so the two meet on the bar.',
      'The last sixteenth of every beat stays empty. That gap is what keeps the climb from becoming a wall.',
    ],
  },
}
