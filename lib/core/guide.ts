/**
 * §8. The shape of the guide document, independent of how it is rendered.
 *
 * §8 specifies seven phases in one order for one reason — "the sequence reflects how a real
 * session unfolds at the machine. Do not reorder." — and that is a fact about the guide, not
 * about Markdown or about React. It lived in `render.ts` while there was only one renderer;
 * once there were two, housing it there made the web view a dependent of the Markdown renderer
 * rather than its sibling (#33), which is the wrong relationship between them.
 *
 * So this module holds what both renderers must agree about and neither one owns. It imports
 * nothing, which is the test of whether something belongs here: a shared contract that needs a
 * layer beneath it is not a contract, it is logic that has not been placed yet.
 */

/**
 * The phase order, and the contract. A renderer building sections, a UI building a table of
 * contents, and a test asserting the order all read this list — never a second copy of it.
 */
export const GUIDE_PHASES = [
  'Song',
  'Voice assignment',
  'Rig integration',
  'Hook',
  'Step programming',
  'Sound design',
  'Finishing',
] as const

export type GuidePhase = (typeof GUIDE_PHASES)[number]
