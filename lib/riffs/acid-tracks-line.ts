import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The Acid Tracks line** — one note, its octave, and the two steps above it.
 *
 * **Named after a recording, and not transcribed from one** (§5A.5). The four notes below are this
 * library's own. What the record is the reference for is the founding acid line: the narrowest
 * pitch material anybody has ever built a track on, with the *filter* doing all the work the notes
 * are not doing.
 *
 * **The recipe decides how it is made, and this does not.** A riff says `acid` and `dirty`; a
 * device folder says which oscillator, which filter and where the resonance sits. That split is
 * invariant 3, and it is why this entry plays on twenty-nine boxes without naming one.
 */
export const acidTracksLine: Riff = {
  id: 'acid-tracks-line',
  name: 'The Acid Tracks line',
  track: 'Acid Tracks',
  bpm: { min: 112, max: 132, default: 122 },
  key: 'C minor',
  technique: [
    'Almost the whole figure sits on the root. The octave in bar one and the two steps at the ' +
      'end of bar two are the moves a listener holds on to.',
    'Leave the rests in. The gaps let the filter close and reopen, and they give the line its ' +
      'shape.',
    'Accent two steps in two bars, both on a note that has just changed. Play the rest under ' +
      'those accents so the filter has something to answer.',
    'Sweep the filter by hand while it loops and leave everything else alone. This is a part ' +
      'you play the filter on.',
  ],
  request: {
    id: 'acid-tracks-line',
    role: 'acid',
    priority: 1,
    character: 'dirty',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  /**
   * Four notes over two bars, each in force until the next takes over — with a deliberate hole
   * at the end of bar one, where nothing is in force and the grid strikes nothing either.
   * `baseOctave: 2`, so the climb goes up out of the bass rather than down into it.
   */
  hook: {
    id: 'acid-tracks-line-hook',
    forRole: 'acid',
    bars: 2,
    baseOctave: 2,
    notes: [
      { step: 1, degree: 1, octave: 0, len: 12 },
      { step: 13, degree: 1, octave: 1, len: 8 },
      { step: 21, degree: 4, octave: 1, len: 6 },
      { step: 27, degree: 5, octave: 1, len: 6 },
    ],
  },
  pattern: variant(
    'acid-tracks-line-grid',
    'acid',
    0,
    32,
    at('accent', 118, 1, 13),
    on('downbeat', 5, 9, 17, 21, 25, 29),
    on('offbeat', 3, 11, 19, 27),
    at('ghost', 70, 8, 16, 24, 32),
  ),
}
