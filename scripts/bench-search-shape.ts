import { measureSearchShape } from '../lib/core/search'
import { moodState } from '../lib/core/resolver'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES } from '../lib/templates/index'

/**
 * §7.1/#159. **Where the assignment search's nodes actually go.**
 *
 * `npm run bench:search-shape`. A sibling of `scripts/bench-decomposition.ts`, and it exists for
 * the same reason: #159 proposed two ways to make this search cheaper, and both should be decided
 * by measurement rather than by argument. That script closed item 1. This one is the instrument
 * that closed item 2, and the instrument anyone attacking the real cost will want next.
 *
 * It reports two things per direction, at that direction's own worst seed:
 *
 *  - **How the nodes divide** — abandoned by `lowerBound` on arrival, expanded, or a complete
 *    assignment. This is the finding.
 *  - **How often a canonical state is reached twice** — the question #159 item 2 was opened on.
 *
 * The cap is lifted so a worst case is a cost rather than a report of the cap, exactly as
 * `bench-decomposition.ts` section C does it. The worst seed is found by sweeping rather than
 * listed, so the table cannot go stale when a device or a direction lands.
 */

const SEEDS = Array.from({ length: 24 }, (_, i) => i)
const LIFTED_CAP = 20_000_000

const pct = (part: number, whole: number): string =>
  whole === 0 ? '0.0%' : `${((part / whole) * 100).toFixed(1)}%`
const num = (n: number): string => n.toLocaleString('en-US')

function worstSeed(templateId: string): { seed: number; nodes: number } {
  const template = TEMPLATES.find((t) => t.id === templateId)
  if (template === undefined) throw new Error(`no direction ${templateId}`)
  let worst = { seed: 0, nodes: -1 }
  for (const seed of SEEDS) {
    const shape = measureSearchShape({
      devices: DEVICES,
      template,
      mood: moodState({}),
      seed,
      nodeCap: LIFTED_CAP,
    })
    if (shape.visited > worst.nodes) worst = { seed, nodes: shape.visited }
  }
  return worst
}

const started = Date.now()

console.log('SEARCH SHAPE')
console.log(
  `   ${String(DEVICES.length)} devices, ${String(TEMPLATES.length)} directions, ` +
    `seeds 0..23, cap lifted to ${num(LIFTED_CAP)}\n`,
)

const rows = TEMPLATES.map((template) => {
  const { seed } = worstSeed(template.id)
  const shape = measureSearchShape({
    devices: DEVICES,
    template,
    mood: moodState({}),
    seed,
    nodeCap: LIFTED_CAP,
  })
  // `visited` is taken at the same statement that increments `nodes`, so a mismatch means the
  // probe has drifted from the traversal it is measuring rather than that a number is off.
  if (shape.visited !== shape.search.nodes) {
    throw new Error(
      `probe visited ${num(shape.visited)} but the search reported ${num(shape.search.nodes)}`,
    )
  }
  if (shape.search.capped) throw new Error(`${template.id} capped even at the lifted cap`)
  return { id: template.id, seed, shape }
}).sort((a, b) => b.shape.visited - a.shape.visited)

console.log('A. WHERE THE NODES GO')
console.log('   direction              seed       nodes      bounded     expanded   leaves')
for (const { id, seed, shape } of rows) {
  console.log(
    `     ${id.padEnd(20)} ${String(seed).padStart(4)} ${num(shape.visited).padStart(11)}` +
      ` ${num(shape.bounded).padStart(9)} ${pct(shape.bounded, shape.visited).padStart(7)}` +
      ` ${num(shape.expanded).padStart(9)} ${num(shape.leaves).padStart(8)}`,
  )
}

console.log('\nB. HOW OFTEN A STATE IS REACHED TWICE')
console.log('   direction              seed       nodes       unique      repeats')
for (const { id, seed, shape } of rows) {
  console.log(
    `     ${id.padEnd(20)} ${String(seed).padStart(4)} ${num(shape.visited).padStart(11)}` +
      ` ${num(shape.unique).padStart(12)} ${num(shape.repeats).padStart(12)}` +
      ` ${pct(shape.repeats, shape.visited).padStart(7)}`,
  )
}

const worst = rows[0]
if (worst !== undefined) {
  const { shape } = worst
  console.log(
    `\n   The worst case is ${worst.id} seed ${String(worst.seed)}: ` +
      `${pct(shape.bounded, shape.visited)} of its ${num(shape.visited)} nodes are abandoned by ` +
      `lowerBound on arrival, and it reaches ${num(shape.leaves)} complete ` +
      `assignment${shape.leaves === 1 ? '' : 's'}.`,
  )
  console.log(
    '   So the repeats in B are repeated arrivals at pruned states rather than at solved',
  )
  console.log(
    '   sub-problems, and the cost sits in lowerBound at nodes that never expand. See #159.',
  )
}

console.log(`\n   measured in ${num(Date.now() - started)} ms`)
