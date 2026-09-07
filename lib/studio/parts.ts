import type { Role } from '@/lib/core'

/**
 * The 23 roles in words, authored for a reader who has heard this music and never had to name its
 * pieces. `/parts` renders all three fields; `lib/studio/glossary.ts` takes `is` as the role half
 * of #457's definitions.
 *
 * **One copy, because the two surfaces are answering the same question.** A second set of role
 * sentences written for the modal would be the same 23 claims maintained twice, and the first one
 * corrected would leave the other saying something else about the same word.
 */
export type Part = {
  /** The one-line gloss under the name. */
  sub: string
  /** What it is. */
  is: string
  /** What it is doing in a track, which is the half a definition leaves out. */
  use: string
}

/**
 * Authored, in our words: what it is, then what it is for. Written for somebody who has heard
 * this music and never had to name its pieces.
 *
 * No history and no gear. A reader who wants to know what an 808 kick sounds like is on the
 * drum-machines page; a reader here wants to know why the guide is asking them for a `sub` as
 * well as a `bass-mid`.
 */
export const PARTS: Record<Role, Part> = {
  kick: {
    sub: 'The pulse',
    is: 'The low drum on the floor, and usually the loudest thing in the track.',
    use: 'It sets the tempo you feel rather than count. Almost everything else is placed against it.',
  },
  snare: {
    sub: 'The backbeat',
    is: 'The bright crack that answers the kick, normally on beats two and four.',
    use: 'It is what makes a rhythm walk. Move it and the whole feel of the bar changes.',
  },
  clap: {
    sub: 'The wider backbeat',
    is: 'A handclap, or a stack of them, sitting where a snare would.',
    use: 'Used instead of a snare for a softer, wider hit, or on top of one to make it broader.',
  },
  rim: {
    sub: 'The quiet click',
    is: 'A stick on the rim of a drum rather than its skin — dry, short, no body.',
    use: 'A backbeat that stays out of the way, and the usual answer when a snare is too much.',
  },
  tom: {
    sub: 'The tuned drums',
    is: 'Drums with a definite pitch, normally several at different tunings.',
    use: 'Fills and turnarounds — the thing that carries you from one section into the next.',
  },
  'closed-hat': {
    sub: 'The tick',
    is: 'A hi-hat struck shut, so it stops as soon as it starts.',
    use: 'It fills the gaps between kick and snare and is where most of a groove’s detail lives.',
  },
  'open-hat': {
    sub: 'The lift',
    is: 'A hi-hat left to ring rather than damped.',
    use: 'Usually offbeat, and what gives a straight pattern its swing and its push forward.',
  },
  ride: {
    sub: 'The steady cymbal',
    is: 'A cymbal played in a repeating pattern rather than crashed.',
    use: 'Keeps time up high, where a hat would be busier and a crash would be too much.',
  },
  'ghost-perc': {
    sub: 'The hits you feel',
    is: 'Quiet percussion that fills the grid without asking to be heard.',
    use: 'It makes a pattern breathe. Take it out and everything sounds programmed.',
  },
  metallic: {
    sub: 'Struck metal',
    is: 'Bells, cowbell, rims, anything with a ringing tone that is not really a note.',
    use: 'A repeating figure that adds movement without adding harmony, since it belongs to no key.',
  },
  impact: {
    sub: 'The marker',
    is: 'A single loud event — a crash, a hit, a slam.',
    use: 'It marks a boundary. One at the top of a section tells the ear that something changed.',
  },
  riser: {
    sub: 'The climb',
    is: 'A sound that rises over several bars, in pitch or brightness or both.',
    use: 'It exists to lead somewhere and stops mattering the moment it arrives.',
  },
  sweep: {
    sub: 'The slow move',
    is: 'A filter or a noise wash moving across a section, up or down.',
    use: 'Slower and less directed than a riser. It changes how a section feels rather than announcing the next one.',
  },
  sub: {
    sub: 'The weight',
    is: 'The lowest part, often a plain sine, felt more than heard.',
    use: 'It carries the low end on a big system and does almost nothing on a laptop speaker.',
  },
  'bass-mid': {
    sub: 'The bass you hear',
    is: 'The bass part with enough upper harmonics to survive a small speaker.',
    use: 'It carries the tune of the low end. Split from the sub so each can be placed on its own.',
  },
  acid: {
    sub: 'The 303 line',
    is: 'A monophonic bassline through a resonant filter, with slides and accents in the notes.',
    use: 'The line stays put and the filter is played by hand. The performance is the knob, not the notes.',
  },
  lead: {
    sub: 'The tune',
    is: 'A single line meant to be followed, usually the highest thing carrying a melody.',
    use: 'It is what somebody hums afterwards, and the part everything else makes room for.',
  },
  stab: {
    sub: 'The punctuation',
    is: 'A chord struck and immediately gone.',
    use: 'Rhythm made out of harmony. It marks time rather than sustaining it.',
  },
  arp: {
    sub: 'The chord, spread',
    is: 'A chord played one note at a time in a fixed order rather than struck at once.',
    use: 'It gives harmony a rhythm of its own, and fills space that a pad would only fill flatly.',
  },
  pad: {
    sub: 'The bed',
    is: 'Sustained chords underneath everything, with slow attack and long release.',
    use: 'Harmony you feel rather than follow. It sets the mood and hides the joins between sections.',
  },
  texture: {
    sub: 'The detail',
    is: 'Background material with no tune and no rhythm to speak of.',
    use: 'It fills the space between the parts you are listening to. You would notice it gone.',
  },
  noise: {
    sub: 'The wash',
    is: 'Unpitched sound — hiss, air, static — with no note in it at all.',
    use: 'A bed under the drums, or a rhythm in its own right when it is gated.',
  },
  'vox-chop': {
    sub: 'The cut-up voice',
    is: 'A vocal recording sliced up and played as an instrument rather than sung.',
    use: 'It brings a human sound in without bringing a lyric, and it is played from a keyboard or pads.',
  },
}
