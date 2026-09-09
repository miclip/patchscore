import type { SampleTarget } from '../core/sample'

/**
 * §3.8/#520. **The twelve kit sounds**, in `KIT_ROLES` order — §3.6's own, so a reader who has
 * built a kit at `/devices/<id>/kit` does not find the same twelve sounds in a different order.
 *
 * Each one is a `Role`, a `Character` and the words for recording it. The character is what the
 * recipe is scored against, and it is chosen to be a character the library actually authors for
 * the role: a target asking for the opposite of everything written would report `no-recipe` on
 * every rig, which is a hole in the catalogue wearing invariant 5's clothes.
 *
 * **The technique says what to record, and never what the signal is made of or done to.** The
 * page below already answers both: which box makes the sound is `resolveSample`'s, and how it
 * makes one is the resolved recipe's, with a manual page behind every value. `kick` is the case
 * that settles the rule — its winner on the whole catalogue is `mpc-kick-hard`, which sets a
 * distortion drive and mix, three compressor controls and a gain, all cited. A target saying
 * *nothing added, no compression* would be a second, uncited instruction contradicting the first
 * on the same page, and only one of the two carries a page reference.
 *
 * So what is left is the half no recipe can answer, because it is not about the box: how long to
 * record, what to keep of the tail, where to trim, what note or tempo to write down, and which
 * second take is worth the minute it costs. **A second take is conditional**, always — on the box
 * tuning, on the patch answering to how it is struck, on the length being the reader's to set.
 */

export const kick: SampleTarget = {
  id: 'kick',
  name: 'Kick',
  role: 'kick',
  character: 'hard',
  technique: [
    'Record one hit and keep the whole tail. Trim the file afterwards, since you cannot trim back ' +
      'what you did not record.',
    'One hit per take, with nothing else running. Whatever else is sounding goes into the file ' +
      'with it, for good.',
  ],
}

export const snare: SampleTarget = {
  id: 'snare',
  name: 'Snare',
  role: 'snare',
  character: 'hard',
  technique: [
    'Two takes, one struck hard and one soft, where the box answers to how it is played. The ' +
      'softer take is the ghost note.',
    'Let it ring out before you cut. The crack is the first few milliseconds and the character is ' +
      'the hundred after it.',
  ],
}

export const clap: SampleTarget = {
  id: 'clap',
  name: 'Clap',
  role: 'clap',
  character: 'bright',
  technique: [
    'A clap is several hits inside one sound. Record the whole spread as one file rather than ' +
      'cutting into it.',
    'Trim the front tightly, so the file starts on the transient.',
  ],
}

export const rim: SampleTarget = {
  id: 'rim',
  name: 'Rim',
  role: 'rim',
  character: 'bright',
  technique: [
    'Short. Trim close to the hit and keep only the body under it.',
    'Record a few milliseconds past where it seems to end, and cut it back in the file.',
  ],
}

export const tom: SampleTarget = {
  id: 'tom',
  name: 'Tom',
  role: 'tom',
  character: 'dark',
  technique: [
    'Three takes at three pitches where the box tunes: low, middle and high. A fill needs somewhere ' +
      'to travel, and three files give it one.',
    'Keep the whole decay in each take. Trim afterwards.',
  ],
}

export const closedHat: SampleTarget = {
  id: 'closed-hat',
  name: 'Closed hat',
  role: 'closed-hat',
  character: 'bright',
  technique: [
    'Very short. Cut it with a hard edit rather than a fade: where it stops is the sound.',
    'Two takes at slightly different lengths, where the patch lets the length vary. Alternate them ' +
      'in a hat line.',
  ],
}

export const openHat: SampleTarget = {
  id: 'open-hat',
  name: 'Open hat',
  role: 'open-hat',
  character: 'bright',
  technique: [
    'Keep the whole tail. Where it gets cut is an arrangement decision, and one to make with the ' +
      'file in front of you.',
    'Record it in the same session as the closed hat, so the pair sits together.',
  ],
}

export const ride: SampleTarget = {
  id: 'ride',
  name: 'Ride',
  role: 'ride',
  character: 'bright',
  technique: [
    'Four seconds or more. A ride is the metal sound allowed to wash, and the length is most of it.',
    'Keep the whole decay, however short the file ends up.',
  ],
}

export const metallic: SampleTarget = {
  id: 'metallic-hit',
  name: 'Metallic hit',
  role: 'metallic',
  character: 'bright',
  technique: [
    'One long take, then two files cut from it: the strike alone, and the strike with its tail. Cut ' +
      'from one take and the two sit together.',
    'Leave several seconds of decay in the take, whatever length the files end up.',
  ],
}

export const ghostPerc: SampleTarget = {
  id: 'ghost-hit',
  name: 'Ghost hit',
  role: 'ghost-perc',
  character: 'soft',
  technique: [
    'Short. A tail turns it into one of the hits it is meant to sit between.',
    'Trim tight at both ends. What a ghost hit is for is the space it leaves as much as the sound ' +
      'it puts there.',
  ],
}

export const noise: SampleTarget = {
  id: 'noise-hit',
  name: 'Noise hit',
  role: 'noise',
  character: 'bright',
  technique: [
    'One hit, trimmed tightly at the front so the file starts on the transient.',
    'Keep whatever decay the take has. What length the file ends up is an edit rather than a ' +
      'performance.',
  ],
}

export const impact: SampleTarget = {
  id: 'impact',
  name: 'Impact',
  role: 'impact',
  character: 'hard',
  technique: [
    'Several seconds, and keep the whole decay. An impact is the sound that marks a section turning ' +
      'over, so it is longer than it feels.',
    'Trim it from the front, so its first sample lands on the downbeat.',
  ],
}

export const KIT_SAMPLES: readonly SampleTarget[] = [
  kick,
  snare,
  clap,
  rim,
  tom,
  closedHat,
  openHat,
  ride,
  metallic,
  ghostPerc,
  noise,
  impact,
]
