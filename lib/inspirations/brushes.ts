import { at, on, variant } from '../core/authoring'
import type { Inspiration } from '../core/inspiration'

/**
 * Brushes (§5). The influence on the cymbal, and the sixth because the five before it left one
 * shape of direction untouched: **a slow piece whose only percussion is a cymbal and a rim.**
 *
 * That is the same gap `echo` and `ladder` were authored to close, arriving from the other side.
 * Those two answered directions whose parts are *sustained or melodic*; this one answers a
 * direction whose parts are percussion the library had simply never claimed. Between the five,
 * `kick`, `closed-hat`, `bass-mid`, `texture` and `lead` were spoken for and `ride` was not, so a
 * direction built on a ride got an added shaker or nothing at all.
 *
 * ## The influence in one line
 *
 * The ride is swept rather than struck. A brush does not articulate a pulse the way a stick does
 * — it states a beat and fills the space between with something quieter and continuous — so this
 * replaces the ride's own hits with one accent and a run of ghosts, at every band.
 *
 * **Ghosts rather than a quieter downbeat**, because §4.3's `ghost` is the slot a device
 * articulates as a sixteenth between beats, and the sweep *is* what happens between beats. A
 * device that has no ghost articulation plays them as ordinary hits, which is a brush played
 * badly rather than a part that disappears.
 *
 * ## What it composes with
 *
 * Everything. `ride` is claimed by nothing else, so this adds no refusing pair to the four the
 * registry already has — the first influence since `shuffle` that costs the composition table
 * nothing. It reaches every direction that authors a ride, and on the fast ones that is a
 * deliberate softening rather than an oversight: an influence is the reader's to pick.
 *
 * **Replaces only, and adds nothing.** The shape `echo` and `ladder` established: an influence
 * that cannot quietly succeed by dropping an unrequested part onto a direction it otherwise
 * missed.
 */
export const brushes: Inspiration = {
  id: 'brushes',
  name: 'Brushes',
  patch: {
    replacePatterns: [
      // One bar, because a brush figure is a texture that repeats rather than a two-bar phrase
      // with a shape — and because every ride in the library is authored at sixteen.
      variant('brushes-ride-b0', 'ride', 0, 16, on('downbeat', 1)),
      variant('brushes-ride-b1', 'ride', 1, 16, on('downbeat', 1), at('ghost', 40, 7, 13)),
      variant(
        'brushes-ride-b2',
        'ride',
        2,
        16,
        on('downbeat', 1, 9),
        at('ghost', 42, 5, 7, 13, 15),
      ),
      variant(
        'brushes-ride-b3',
        'ride',
        3,
        16,
        on('downbeat', 1, 9),
        at('ghost', 44, 3, 5, 7, 11, 13, 15),
      ),
    ],

    notes: [
      'The cymbal is swept, not struck. One stroke states the bar and the rest is the brush moving.',
      'Keep every ghost quieter than the accent by a clear margin. A brush that matches it is a stick.',
    ],
  },
}
