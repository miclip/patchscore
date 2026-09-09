import type { SampleTarget } from '../core/sample'

/**
 * §3.8/#520. **The low end** — the two roles a kit plays *under*, plus the one target in the
 * catalogue that is not simply a role.
 *
 * `wobble-bass` is `bass-mid`, `dirty`, and four lines about what to record, and that is the shape
 * the human's ruling settled: the vocabulary says what part of the spectrum the sound occupies and
 * the prose says what the take has to contain. A `wobble` role would be a genre naming itself in
 * the shared vocabulary (invariant 3).
 *
 * **It says to record movement, and does not say what to move.** A wobble is a tone changing under
 * a held note; which control changes it is the resolved recipe's answer on the reader's own box,
 * and naming a filter or an LFO here would be this file guessing at a panel it cannot see. The
 * pair with `bass-note` is the whole distinction — one take holds still and one does not — and it
 * survives on any box that has a control to move at all.
 *
 * It is also why targets are **not** one per role. Every role has at least one, and a role may
 * have more where what you record is what separates them.
 */

export const sub: SampleTarget = {
  id: 'sub',
  name: 'Sub',
  role: 'sub',
  character: 'dark',
  technique: [
    'Hold one note for a second or two and record the whole of it.',
    'Record it at a note you write down. A low C is the usual choice.',
    'Check the file on something that reproduces the bottom, so a click or an offset at the loop ' +
      'point does not survive into the folder.',
  ],
}

export const bassMid: SampleTarget = {
  id: 'bass-note',
  name: 'Bass note',
  role: 'bass-mid',
  character: 'clean',
  technique: [
    'One note, held, with nothing touched while it sounds. This is the file a whole line gets ' +
      'played with, so anything that moves in the take happens again on every note of the line.',
    'Two or three takes an octave apart where the box tunes.',
    'Let go of the note at the same point in every take, so the files end alike. The length it ' +
      'plays at is set by the part.',
  ],
}

export const wobbleBass: SampleTarget = {
  id: 'wobble-bass',
  name: 'Wobble bass',
  role: 'bass-mid',
  character: 'dirty',
  technique: [
    'A wobble is movement under a held note, so the movement is what the take has to contain. Hold ' +
      'a low note and move whatever tone control the patch below gives you while it sounds.',
    'Four bars, so there is a loop to cut. A wobble cut to one cycle stops wobbling.',
    'Write down the tempo you recorded at, and where in the bar the movement lands.',
    'Two takes, one moving slowly and one fast, where the speed of the movement is yours to set.',
  ],
}

export const LOW_SAMPLES: readonly SampleTarget[] = [sub, bassMid, wobbleBass]
