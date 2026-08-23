import { at, on, variant } from '../core/authoring'
import type { Inspiration } from '../core/inspiration'

/**
 * Reggae (§5). The influence DESIGN.md's example was written about, authored against the patch
 * language that example predates.
 *
 * **Nothing here names a template** — not an id, not a section, not a pattern of anyone else's.
 * It says `kick`, `bass-mid`, `stab` and a band number, which is the whole shared vocabulary an
 * inspiration is allowed (§5). Everything it claims, it claims by `(role, band)`, so it lands on
 * any template with a kick and honestly reports itself on one without.
 *
 * The influence in one line: the one-drop. The kick leaves the first beat of the bar completely
 * empty and answers on the third, the bass plays root and fifth underneath the hole that makes,
 * and a skank chord fills every offbeat above it.
 *
 * It **replaces** the kick and the bass rather than joining them, because a one-drop beside a
 * four-to-the-floor is not a reggae influence — it is two drummers. Replacement is what makes
 * the combination reliably audible instead of a coin toss between two variants at the same band.
 */
export const reggae: Inspiration = {
  id: 'reggae',
  name: 'Reggae',
  patch: {
    /**
     * Reggae is played a long way under any of the genres this patches: -40 puts 134 at 94,
     * 128 at 88 and 116 at 76, all of which are somewhere a one-drop actually sits. A shift
     * rather than a target, because a target would need to know which genre it landed on.
     */
    bpm: { shift: -40 },

    replacePatterns: [
      // ---- kick: the one drop ----------------------------------------------------------
      // Step 9 is the third beat, and it is the only beat this kick ever states. The empty
      // first beat is the part a listener actually identifies, so it survives every band.
      variant('reggae-kick-b0', 'kick', 0, 16, on('downbeat', 9)),
      variant('reggae-kick-b1', 'kick', 1, 16, on('downbeat', 9), at('ghost', 48, 16)),
      variant(
        'reggae-kick-b2',
        'kick',
        2,
        16,
        on('downbeat', 9),
        on('offbeat', 7),
        at('ghost', 48, 16),
      ),
      variant(
        'reggae-kick-b3',
        'kick',
        3,
        16,
        at('accent', 108, 9),
        on('offbeat', 7, 15),
        at('ghost', 46, 12, 16),
      ),

      // ---- bass-mid: root and fifth, under the hole --------------------------------------
      // Two bars, and it agrees with the kick on the third beat at every band. Where the kick
      // is silent the bass is too, which is what makes the silence sound deliberate.
      variant('reggae-bass-mid-b0', 'bass-mid', 0, 32, on('downbeat', 9)),
      variant('reggae-bass-mid-b1', 'bass-mid', 1, 32, on('downbeat', 9, 25)),
      variant(
        'reggae-bass-mid-b2',
        'bass-mid',
        2,
        32,
        on('offbeat', 3, 19),
        on('downbeat', 9, 25),
      ),
      variant(
        'reggae-bass-mid-b3',
        'bass-mid',
        3,
        32,
        on('offbeat', 3, 7, 19, 23),
        on('downbeat', 9, 25),
      ),
    ],

    /**
     * The skank. A whole part rather than a replacement, because a template that has no chord
     * on the offbeat has nothing here to take over — and one that already programs a `stab` of
     * its own keeps it, and is told so.
     */
    addRoles: [
      {
        id: 'reggae-r-skank',
        role: 'stab',
        priority: 2,
        character: 'clean',
        sustain: 'continuous',
        // §12.4. A skank is a chord, and a rig that can only sound one note of it should get an
        // honest gap rather than a bleep on the offbeat.
        polyphony: 3,
      },
    ],

    addPatterns: [
      variant('reggae-stab-b0', 'stab', 0, 16, on('offbeat', 3, 11)),
      variant('reggae-stab-b1', 'stab', 1, 16, on('offbeat', 3, 7, 11, 15)),
      variant(
        'reggae-stab-b2',
        'stab',
        2,
        16,
        on('offbeat', 3, 7, 11, 15),
        at('ghost', 50, 4, 12),
      ),
      variant(
        'reggae-stab-b3',
        'stab',
        3,
        16,
        on('offbeat', 3, 7, 11, 15),
        at('ghost', 50, 4, 8, 12),
        at('accent', 102, 16),
      ),
    ],

    notes: [
      'The first beat of the bar stays empty. The kick answers on the third and nowhere else.',
      'Bass on the root and the fifth, held long, and silent wherever the kick is silent.',
      'Skank chords on the offbeat: short, clean, and gone before the next beat arrives.',
    ],
  },
}
