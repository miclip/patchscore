import type { SampleTarget } from '../core/sample'

/**
 * §3.8/#520. **Texture and transitions** — the three roles whose files are measured in bars rather
 * than in milliseconds.
 *
 * `texture` is a bed that runs under a section; `riser` and `sweep` are §4.2's transitional roles,
 * which exist for a few bars aimed at a change. All three are the case #520 says this section
 * dissolves: a reader who **makes** the file chooses its length, so *how long does this need to
 * be* stops being a question answered by shopping. Length, tempo and where the file is cut are
 * exactly what no recipe can answer, which is why these three have the most to say.
 */

export const texture: SampleTarget = {
  id: 'texture-bed',
  name: 'Texture bed',
  role: 'texture',
  character: 'dark',
  technique: [
    'Thirty seconds, in one uninterrupted take. Length is the feature here: a bed long enough that ' +
      'it never audibly comes round.',
    'Do not cut it to a bar. A texture that lines up with the grid stops reading as a bed.',
  ],
}

export const riser: SampleTarget = {
  id: 'riser',
  name: 'Riser',
  role: 'riser',
  character: 'bright',
  technique: [
    'Decide the length before you record. Four bars is the common one. Write down the tempo.',
    'Record a moment past the crest, then cut the file so its last sample is the peak.',
    'A second take at a different length, where the length is yours to choose.',
  ],
}

export const sweep: SampleTarget = {
  id: 'sweep',
  name: 'Sweep',
  role: 'sweep',
  character: 'dark',
  technique: [
    'Record the whole travel, start to finish, and write down which way it goes. Reversing the file ' +
      'gives you the other direction, so one take covers a move into a section and a move out of one.',
    'Two bars, plus a third you can cut. Where it ends is set by the bar it has to land on.',
    'Write down the tempo, as for a riser. Where a transition lands is set by the bar and not by ' +
      'the file.',
  ],
}

export const TEXTURE_SAMPLES: readonly SampleTarget[] = [texture, riser, sweep]
