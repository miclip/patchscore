import { at, on, variant } from '../core/authoring'
import type { Inspiration } from '../core/inspiration'

/**
 * Echo (§5). The influence that is a *technique* rather than a place, and the first one in the
 * library that takes over the sustained end of a direction instead of the drums.
 *
 * **Nothing here names a direction.** `texture`, `bass-mid`, a band number and a step: the whole
 * shared vocabulary an inspiration is allowed (§5).
 *
 * The influence in one line: nothing is played twice, but everything is *heard* twice. A part
 * states its note once, the note comes back three sixteenths later and quieter, and again three
 * after that, until the tail runs under the floor.
 *
 * Three sixteenths is a dotted eighth, and it matters that it is not four: a repeat a beat later
 * doubles the pulse, while a repeat a dotted eighth later crosses it. The same figure heard
 * against its own tail therefore lands somewhere new in the bar every time it comes round.
 *
 * ## Why the repeats are `ghost` and not a second part
 *
 * §4.3 gives `ghost` to "a quiet 16th between the beats", which is exactly what a repeat is — so
 * a device that articulates `ghost` plays these correctly without ever being told what an echo
 * is. The alternative, a whole added role holding the repeats, would ask the rig for a second
 * voice to play a part that is physically the first voice sounding again. That is not what the
 * influence does, and on a small rig it would cost a voice for nothing.
 *
 * ## Why it replaces rather than adds
 *
 * The repeats only mean anything against the strikes they answer. Joining a direction's own
 * texture would leave two figures at one `(role, band)` and let selection decide by id order
 * which is heard — the lottery §5's replacement rule exists to close. So Echo *takes* both roles
 * it touches, at all four bands, or it reports that it could not.
 *
 * ## Why there is no tempo shift
 *
 * Reggae and Dancehall carry one because the tempo *is* half of what those two words mean. An
 * echo is not a tempo — it is what a part does at whatever tempo it is already at — and a shift
 * here would be an opinion smuggled in beside the technique.
 */
export const echo: Inspiration = {
  id: 'echo',
  name: 'Echo',
  patch: {
    replacePatterns: [
      // ---- texture: four bars, and the strike answered by its own tail ------------------
      // 64 steps, because a sustained part struck once and left is only expressible at the
      // longest length the vocabulary has (§4.3). The strikes stay where a slow direction
      // would put them — step 1, and step 33 two bars later — and what the bands grow is the
      // *tail*, not the number of strikes. Density here lengthens the repeat chain; it never
      // asks anyone to play more.
      variant('echo-texture-b0', 'texture', 0, 64, on('downbeat', 1), at('ghost', 52, 4)),
      variant(
        'echo-texture-b1',
        'texture',
        1,
        64,
        on('downbeat', 1, 33),
        at('ghost', 52, 4, 36),
      ),
      variant(
        'echo-texture-b2',
        'texture',
        2,
        64,
        on('downbeat', 1, 33),
        at('ghost', 52, 4, 36),
        at('ghost', 44, 7, 39),
      ),
      // The accent is the source strike, never a repeat: the one hit a variant leans on is the
      // one a hand actually plays. A tail louder than the thing it answers is a different effect.
      variant(
        'echo-texture-b3',
        'texture',
        3,
        64,
        at('accent', 104, 1),
        on('downbeat', 33),
        at('ghost', 52, 4, 36),
        at('ghost', 44, 7, 39),
        at('ghost', 38, 10, 42),
      ),

      // ---- bass-mid: one delay line, two parts through it --------------------------------
      // The same shape at half the length — 32 steps, so a bass phrase is two bars rather than
      // four — and the repeat velocities sit a little under the texture's, because a low part
      // smears where a sustained one shimmers.
      variant('echo-bass-mid-b0', 'bass-mid', 0, 32, on('downbeat', 1), at('ghost', 50, 4)),
      variant('echo-bass-mid-b1', 'bass-mid', 1, 32, on('downbeat', 1, 17), at('ghost', 50, 4, 20)),
      variant(
        'echo-bass-mid-b2',
        'bass-mid',
        2,
        32,
        on('downbeat', 1, 17),
        at('ghost', 50, 4, 20),
        at('ghost', 42, 7, 23),
      ),
      variant(
        'echo-bass-mid-b3',
        'bass-mid',
        3,
        32,
        at('accent', 102, 1),
        on('downbeat', 17),
        at('ghost', 50, 4, 20),
        at('ghost', 42, 7, 23),
        at('ghost', 36, 10, 26),
      ),
    ],

    notes: [
      'Every strike is answered by its own quieter repeats, three sixteenths apart.',
      'The repeats are not new notes: same pitch, same part, arriving late and fading.',
      'If the voice has an echo effect, a dotted-eighth time plays this for you; otherwise the repeats are written into the steps.',
    ],
  },
}
