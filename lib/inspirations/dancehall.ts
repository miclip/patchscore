import { at, on, variant } from '../core/authoring'
import type { Inspiration } from '../core/inspiration'

/**
 * Dancehall (§5). The other side of the same island, and deliberately the inspiration that
 * **cannot** be combined with Reggae.
 *
 * That is not an accident of authoring — it is the honest answer. Both influences are a claim
 * about what the kick does, and they make opposite claims: the one-drop empties the first beat,
 * the digital riddim states every one of them. Composing them would mean picking a winner, and
 * a winner picked by id order is a musical decision made by the alphabet. So the pair is refused
 * by name, and a person picks one (§5).
 *
 * **Nothing here names a template.** `kick` at a band, `rim` as a part, and prose.
 */
export const dancehall: Inspiration = {
  id: 'dancehall',
  name: 'Dancehall',
  patch: {
    /** Less far down than reggae: -30 puts 134 at 104 and 128 at 98, which is the tempo. */
    bpm: { shift: -30 },

    replacePatterns: [
      // ---- kick: every beat, leaning on the fourth ---------------------------------------
      // The opposite claim to the one-drop, and the reason the two refuse to combine. The lean
      // arrives at band 2 as a pickup and at band 3 as the accent itself.
      variant('dancehall-kick-b0', 'kick', 0, 16, on('downbeat', 1)),
      variant('dancehall-kick-b1', 'kick', 1, 16, on('downbeat', 1, 9)),
      variant(
        'dancehall-kick-b2',
        'kick',
        2,
        16,
        on('downbeat', 1, 9, 13),
        on('offbeat', 15),
      ),
      variant(
        'dancehall-kick-b3',
        'kick',
        3,
        16,
        on('downbeat', 1, 5, 9),
        at('accent', 110, 13),
        on('offbeat', 15),
        at('ghost', 48, 12),
      ),
    ],

    /**
     * The sidestick, added rather than replaced: it is a part a template either has or does not,
     * and where it already has one that template keeps it and is told why.
     */
    addRoles: [
      {
        id: 'dancehall-r-sidestick',
        role: 'rim',
        priority: 2,
        character: 'clean',
        sustain: 'continuous',
      },
    ],

    addPatterns: [
      // Step 9 is the third beat. It takes `downbeat` and not `backbeat`: the convention gives
      // that slot to beats 2 and 4 of the part stating them, and this part is stating neither.
      variant('dancehall-rim-b0', 'rim', 0, 16, on('downbeat', 9)),
      variant('dancehall-rim-b1', 'rim', 1, 16, on('downbeat', 9), at('ghost', 44, 12)),
      variant(
        'dancehall-rim-b2',
        'rim',
        2,
        16,
        on('downbeat', 9),
        at('ghost', 44, 4, 12),
      ),
      variant(
        'dancehall-rim-b3',
        'rim',
        3,
        16,
        at('accent', 104, 9),
        on('offbeat', 15),
        at('ghost', 44, 4, 12, 16),
      ),
    ],

    notes: [
      'The kick states all four beats and leans hard on the fourth.',
      'Sidestick on the third beat, dry and close, where another genre would put a backbeat.',
    ],
  },
}
