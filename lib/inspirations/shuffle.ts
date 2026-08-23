import { at, on, variant } from '../core/authoring'
import type { Inspiration } from '../core/inspiration'

/**
 * Shuffle (§5). The influence that touches no low end at all, and therefore composes with either
 * of the other two.
 *
 * That is the point of it being in the library. An inspiration set where every member claims the
 * kick would prove the refusal and never prove the composition, and "inspirations must compose"
 * is the half of §5 that a refusal cannot demonstrate.
 *
 * The influence in one line: the swing lives in the hat. A straight 16th grid cannot express a
 * triplet, so the lilt is written the way a drummer plays it — the beat stated, and the hit
 * before the next one held back and played quietly, which is exactly what `ghost` means (§4.3).
 */
export const shuffle: Inspiration = {
  id: 'shuffle',
  name: 'Shuffle',
  patch: {
    replacePatterns: [
      // ---- closed-hat: the lilt ----------------------------------------------------------
      // The straight-8ths hat every template authors is what this replaces. Joining it instead
      // would produce a hat that swings or does not depending on which id sorted first.
      variant('shuffle-closed-hat-b0', 'closed-hat', 0, 16, on('downbeat', 1, 9)),
      variant('shuffle-closed-hat-b1', 'closed-hat', 1, 16, on('downbeat', 1, 5, 9, 13)),
      variant(
        'shuffle-closed-hat-b2',
        'closed-hat',
        2,
        16,
        on('downbeat', 1, 5, 9, 13),
        at('ghost', 44, 4, 12),
      ),
      variant(
        'shuffle-closed-hat-b3',
        'closed-hat',
        3,
        16,
        on('downbeat', 1, 5, 9, 13),
        at('ghost', 44, 4, 8, 12, 16),
      ),
    ],

    addRoles: [
      {
        id: 'shuffle-r-shaker',
        role: 'ghost-perc',
        priority: 4,
        character: 'soft',
        sustain: 'continuous',
        // §4.4. Dropped without complaint on a rig with nothing left: the lilt is already in
        // the hat, and this only thickens it.
        optional: true,
      },
    ],

    addPatterns: [
      // Every hit a ghost, at every band. A shaker that asks to be heard is a different part.
      variant('shuffle-ghost-perc-b0', 'ghost-perc', 0, 16, at('ghost', 44, 4)),
      variant('shuffle-ghost-perc-b1', 'ghost-perc', 1, 16, at('ghost', 44, 4, 12)),
      variant('shuffle-ghost-perc-b2', 'ghost-perc', 2, 16, at('ghost', 44, 4, 8, 12, 16)),
      variant(
        'shuffle-ghost-perc-b3',
        'ghost-perc',
        3,
        16,
        at('ghost', 42, 4, 6, 8, 12, 14, 16),
      ),
    ],

    notes: [
      'The hat lands two thirds of the way across, never halfway. Everything else keeps its place.',
      'Shaker fills the gap the hat leaves, and stays quieter than anything around it.',
    ],
  },
}
