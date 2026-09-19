import type { Riff } from '../core/riff'

/**
 * §5A. **The DUO WAVE MOD similar-motion pad**: two held notes that rise together at every chord,
 * the top one further each time, so the interval between them opens from a third to an octave
 * without either voice ever turning round.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #664). The patch is the
 * two-note sound; the notes are this library's own, and the entry names no device (invariant 3).
 * Nobody writing this had heard the preset, and nothing here says what it sounds like.
 *
 * ## The fourth motion, and the box now teaches all four
 *
 * Two voices can move four ways, and until this entry the Subsequent 37 taught three of them:
 * `DUO ORG` is parallel, the pair locked a third apart; `SAWTEETH DUO DANCER` is contrary, the
 * pair crossing; `Duotronic Moogtrons` is oblique, one held while the other walks. `CELESTIAL` is
 * contrary again, closing an octave to a third.
 *
 * This is **similar** motion: both voices go the same way and by different amounts. It is the one
 * a player discovers last, because moving two notes the same direction by different intervals
 * takes more thought than moving them together or opposite. What it does is open the sound
 * without ever letting go of the bottom: 3, then 5, then 8, then 12 semitones apart, and the
 * bottom voice climbing the whole time.
 *
 * ## A `pad`, so a hook and nothing else
 *
 * `pad` is in `NON_PATTERN_BEARING_ROLES`, so the entry is its hook alone (§5A.2, #608): no
 * `pattern` and no `reArticulatesHook`. Every note runs its chord's full 32 steps, and the
 * articulation is in the lengths.
 *
 * ## Two notes, which is what this box gives a pad
 *
 * `polyphony: 2` (§12.4). `pad / dark` on the box that ships this patch spends the second note
 * on every recipe, so the figure fills it exactly and asks for nothing more.
 *
 * ## The harmony is context, and the roots rise with the voices
 *
 * `i VI III VII` in E minor, two bars each: Em, C, G, D. The pair sits on chord tones every time,
 * so the widening is heard as the pad opening rather than as the harmony changing shape.
 *
 * ## The raised seventh is forbidden over the tonic
 *
 * `D#` is in no chord here and it is what a hand reaches for to make a held minor chord lean
 * somewhere. This pair is opening, not cadencing, and a leading tone under it turns the whole
 * eight bars into an approach to something that never comes.
 */
export const duoWaveModSimilarMotionPad: Riff = {
  id: 'duo-wave-mod-similar-motion-pad',
  name: 'The DUO WAVE MOD similar-motion pad',
  reference: { kind: 'patch', name: 'DUO WAVE MOD' },
  bpm: { min: 64, max: 88, default: 76 },
  key: 'E minor',
  technique: [
    'Two notes held together, changed once every two bars, and both of them go up every time. ' +
      'Nothing here moves down and nothing stays still.',
    'The gap between them opens as they climb: a third over the first chord, a fourth over the ' +
      'second, a sixth over the third, an octave over the last. The bottom note rises a little ' +
      'each time and the top note rises more.',
    'The pairs are E and G, then G and C, then B and G, then D and the D above it. Press both ' +
      'together, hold them until the chord changes, then move both at once.',
    'Move the bottom note first if you cannot move them together. A top note that arrives early ' +
      'sounds like a mistake; a bottom note that arrives early sounds like the chord changing.',
    'Never play D sharp. It is the raised seventh, and under a held pair it leans the whole thing ' +
      'toward a cadence this figure never makes.',
    'Slow attack and long release. Each pair should still be swelling when you move to the next, ' +
      'so the widening is heard as one sound opening rather than four chords.',
  ],
  request: {
    id: 'duo-wave-mod-similar-motion-pad',
    role: 'pad',
    priority: 1,
    character: 'dark',
    sustain: 'continuous',
    // §12.4. Two notes, and this box gives a pad exactly two.
    polyphony: 2,
  },
  /**
   * §5A/#554. The raised seventh over the tonic, as data. `D#` is in none of the four chords, so
   * the rule contradicts nothing it is checked against (#605).
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'i',
        degree: 7,
        alter: 1,
        reason: 'a leading tone under a held pair leans on a cadence this figure never makes',
      },
    ],
  },
  harmony: {
    cycleBars: 8,
    progression: [
      { degree: 'i', bars: 2 },
      { degree: 'VI', bars: 2 },
      { degree: 'III', bars: 2 },
      { degree: 'VII', bars: 2 },
    ],
  },
  /**
   * §5A/§4.1. The whole cycle, from bar 1. `baseOctave: 2` puts `E2` at degree 1, so the figure
   * runs `E2` to `D4`, twenty-two semitones, inside the board this box declares (#659).
   */
  figureStartsAtBar: 1,
  /**
   * Eight bars, eight notes: four pairs, each entering on its chord's first step and holding all
   * 32. Within a step the lower note is authored first, and that order is the voicing.
   */
  hook: {
    id: 'duo-wave-mod-similar-motion-pad-hook',
    forRole: 'pad',
    bars: 8,
    baseOctave: 2,
    notes: [
      // `i`, E minor: E2 and G2, a minor third.
      { step: 1, degree: 1, octave: 0, len: 32 },
      { step: 1, degree: 3, octave: 0, len: 32 },
      // `VI`, C major: G2 and C3. Both up, and the gap is a fourth.
      { step: 33, degree: 3, octave: 0, len: 32 },
      { step: 33, degree: 6, octave: 0, len: 32 },
      // `III`, G major: B2 and G3. Both up again, a minor sixth.
      { step: 65, degree: 5, octave: 0, len: 32 },
      { step: 65, degree: 3, octave: 1, len: 32 },
      // `VII`, D major: D3 and D4, an octave, and both voices rose to get there.
      { step: 97, degree: 7, octave: 0, len: 32 },
      { step: 97, degree: 7, octave: 1, len: 32 },
    ],
  },
}
