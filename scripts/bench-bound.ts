/**
 * §7.1/#159. What the per-node work in `lowerBound` and `scoreOf` costs, on the worst case.
 *
 *   npm run bench:bound
 *
 * `industrial-techno` seed 9 over the whole registry, the cap lifted clear so the walk is the
 * true 165,785 nodes rather than whatever the cap would have stopped at. Three warmups discard
 * the JIT's first look at the search, then best-of-seven, because the quantity wanted is how
 * fast this machine *can* run it and a slower sample is only ever something else on the box.
 *
 * Node count is not a measurement here — it is a precondition. Anything that changes it has
 * changed the traversal and is a different search, which `test/search-bound.test.ts` is what
 * actually catches; this script asserts it so a timing can never be reported for a walk that
 * silently stopped being the same one.
 *
 * ## Recorded
 *
 * Caching `crowdOverflow` and `idleDevices` as scalars on `State`, maintained in `apply`/`undo`,
 * against recomputing both by a whole-rig scan at every node:
 *
 *     before   best 462.9 ms   median 464.9 ms
 *     after    best 393.4 ms   median 399.0 ms
 *
 * A 15% cut on the median, measured interleaved on one machine rather than across a change of
 * context. The bound returns the same values at the same nodes, so all 168 exact counts in
 * `test/search-bound.test.ts` are untouched and both golden sets regenerate byte-identically.
 */

import { assign, moodState } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { industrialTechno } from '../lib/templates/index'

const WARMUPS = 3
const RUNS = 7
const LIFTED = 20_000_000
const EXPECTED_NODES = 165_785

function once(): { ms: number; nodes: number } {
  const started = performance.now()
  const result = assign({
    devices: [...DEVICES],
    template: industrialTechno,
    mood: moodState({}),
    seed: 9,
    nodeCap: LIFTED,
  })
  const ms = performance.now() - started
  if (result.search.capped) throw new Error('capped, so this is not the worst case')
  return { ms, nodes: result.search.nodes }
}

for (let i = 0; i < WARMUPS; i++) once()

const times: number[] = []
let nodes = 0
for (let i = 0; i < RUNS; i++) {
  const run = once()
  times.push(run.ms)
  nodes = run.nodes
}

if (nodes !== EXPECTED_NODES) {
  throw new Error(`the walk moved: ${String(nodes)} nodes, expected ${String(EXPECTED_NODES)}`)
}

const sorted = [...times].sort((a, b) => a - b)
const best = sorted[0] as number
const median = sorted[(RUNS - 1) / 2] as number

console.log(`industrial-techno seed 9, ${String(nodes)} nodes, ${String(DEVICES.length)} devices`)
console.log(`runs    ${times.map((t) => t.toFixed(1)).join(', ')}`)
console.log(`best    ${best.toFixed(1)} ms`)
console.log(`median  ${median.toFixed(1)} ms`)
