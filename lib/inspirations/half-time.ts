import { at, on, variant } from '../core/authoring'
import type { Inspiration } from '../core/inspiration'

/**
 * Half Time (§5). **The backbeat moves off two and four onto the third beat, and the
 * tempo does not change.** Everything above the drums keeps running at the rate it was; the kit
 * states half as many events, and the ear re-reads the bar at half speed.
 *
 * **Nothing here names a template** (invariant 3 one layer up). `kick`, `snare`, a band and a
 * step (§5).
 *
 * The influence in one line: two stated hits a bar instead of four, the snare on the third beat
 * rather than the second and fourth, and nothing else touched.
 *
 * ---------------------------------------------------------------------------
 * Why there is no `bpm` shift, which is the whole idea
 * ---------------------------------------------------------------------------
 *
 * `reggae` pulls 40 BPM out of a template and `dancehall` 30, because a one-drop at 134 is not a
 * one-drop. This does the opposite and it is deliberate: **the tempo stays exactly where the
 * template put it.** Half time is a re-reading of the same bar, not a slower one. At 140 the
 * drums state 70 and the hats still run at 140, and that gap between what the kit says and what
 * everything else is doing is the entire effect. Shift the tempo and there is no gap — the track
 * is just slower, and the influence has done nothing a tempo knob could not.
 *
 * ---------------------------------------------------------------------------
 * What it deliberately does not claim
 * ---------------------------------------------------------------------------
 *
 * **The hat.** A half-time kit under hats at the original rate is the sound; hats halved with the
 * kit is a slow track. So `closed-hat` is left with whatever the template authored, at every
 * band, and that is a musical decision rather than a gap. It happens to leave `shuffle`'s slot
 * free, so the two compose — a swung hat over a half-time backbeat is a real pairing and this
 * file is the reason it is available.
 *
 * **Everything pitched.** `sub`, `bass-mid`, `lead` and `pad` keep their variants. A bass that
 * halves with the drums is the arrangement decision a player makes at the instrument; taking the
 * slot would force it on every template and make the influence a genre.
 *
 * ---------------------------------------------------------------------------
 * What it collides with, and why that is right
 * ---------------------------------------------------------------------------
 *
 * `reggae` and `dancehall` both claim the kick at every band, so this makes a third member of a
 * mutually exclusive set, and the combination is refused by name rather than resolved (§5). That
 * is correct musically: a one-drop is already a re-reading of where the bar's weight falls, and
 * two of those at once is not a combination but an argument. The report says so in those terms.
 *
 * ---------------------------------------------------------------------------
 * The slot the snare uses, which is not `backbeat`
 * ---------------------------------------------------------------------------
 *
 * `backbeat` addresses beats 2 and 4 (`lib/core/authoring.ts`), and a half-time snare states
 * neither. It sits on beat 3, which is `downbeat` by that table, so **this influence emits no
 * `backbeat` anywhere**. A snare recipe whose articulation is addressed to `backbeat` therefore
 * has nothing to attach to while it is applied, and prints nothing. That is invariant 5 rather
 * than a bug, and it is the same reading `drum-and-bass` records for the same reason.
 *
 * ---------------------------------------------------------------------------
 * The bands, and what may never appear in one
 * ---------------------------------------------------------------------------
 *
 * Density adds ghosts and pushes around the two stated hits and never a third stated beat. The
 * moment a band puts a snare back on 5 or 13 the bar reads as 4/4 again and the influence is
 * off, so the ghosts sit at 8, 12 and 16 — before the snare and after it, never on the beats it
 * vacated.
 */
export const halfTime: Inspiration = {
  id: 'half-time',
  name: 'Half Time',
  patch: {
    replacePatterns: [
      // ---- snare: the backbeat, moved to the third beat ---------------------------------
      // Step 9 and nothing else is stated at any band. The ghosts approach it and follow it.
      variant('half-time-snare-b0', 'snare', 0, 16, on('downbeat', 9)),
      variant('half-time-snare-b1', 'snare', 1, 16, on('downbeat', 9), at('ghost', 44, 16)),
      variant('half-time-snare-b2', 'snare', 2, 16, on('downbeat', 9), at('ghost', 44, 8, 16)),
      variant(
        'half-time-snare-b3',
        'snare',
        3,
        16,
        at('accent', 112, 9),
        at('ghost', 44, 8, 12, 16),
      ),

      // ---- kick: the bar head, and a push under the snare's tail --------------------------
      // Never four to the floor while this is on: the kick states 1, and from band 1 the "and"
      // of three, which is the push that makes the long second half of the bar move.
      variant('half-time-kick-b0', 'kick', 0, 16, on('downbeat', 1)),
      variant('half-time-kick-b1', 'kick', 1, 16, on('downbeat', 1), on('offbeat', 11)),
      variant(
        'half-time-kick-b2',
        'kick',
        2,
        16,
        on('downbeat', 1),
        on('offbeat', 11),
        at('ghost', 46, 4),
      ),
      variant(
        'half-time-kick-b3',
        'kick',
        3,
        16,
        at('accent', 116, 1),
        on('offbeat', 11, 15),
        at('ghost', 46, 4, 8),
      ),
    ],

    notes: [
      'The snare moves to the third beat and states nothing on two or on four. That one move is the influence; everything else follows from it.',
      'The tempo does not change. The kit says half the speed while the hats and everything pitched keep the tempo the template set, and the gap between the two is the sound.',
      'The kick keeps the bar head and pushes on the "and" of three. Four to the floor anywhere puts the bar in 4/4 again.',
      'Hats are left exactly as the direction wrote them, so pair this with a swung hat if you want one.',
    ],
  },
}
