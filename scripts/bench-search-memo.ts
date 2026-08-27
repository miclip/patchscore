/**
 * #159's memoisation probe: does §7.1's search re-solve the same sub-problem, and how often?
 *
 * This is #159's item 2, and it stands or falls on its own. Item 1 — decomposition — was
 * measured by `scripts/bench-decomposition.ts` and found not to hold: the whole 19-device rig
 * is one branching component at every mood setting, so there is nothing to split. That result
 * neither predicts nor refutes this one. Decomposition asks whether the problem falls into
 * independent halves; memoisation asks whether one indivisible problem is being walked over
 * more than once.
 *
 * **Nothing here re-implements the search.** `measureStateRepeats` in `lib/core/search.ts` runs
 * the shipped DFS with a probe attached, so the canonical key is written where the state it
 * canonicalises lives, next to `keyIsFree`, `violatesDistinct` and `crowdOverflow` — and moves
 * when they move. This script chooses the cases, prints the tallies, and does the arithmetic
 * that would put a float inside `lib/core`.
 *
 * What the key is and why is documented on `measureStateRepeats`. In one line: `(index,
 * occupancy keyed by assignable and section, the set of prior same-role `distinct` device
 * choices)`, with per-device occupied counts *derived* from the occupancy rather than carried,
 * and checked against the live map at every node.
 *
 * **What a repeat is not.** It is not a measured speed-up. A memo changes which nodes get
 * visited at all — a hit at depth 3 removes its whole subtree, so the nodes below it stop being
 * visited and stop being counted — and it interacts with incumbent pruning, since a subtree
 * skipped by a memo never improves the incumbent that would have pruned its neighbours. What is
 * measured here is the narrower and prior question: **on the traversal we run today, how much of
 * it is a state already solved.** If that were near zero there would be nothing to implement.
 *
 * Sections:
 *
 *   A  `industrial-techno` seed 9 on all 19 shipped devices, cap lifted — §7.1's worst case and
 *      the same 165,785-node run the decomposition probe's section C reports. Full per-depth
 *      table.
 *   B  every other shipped direction at its own worst seed over 0..23, cap lifted. The seed is
 *      found by sweeping rather than pinned, so the case list cannot go stale as the library
 *      grows.
 *   C  the memo actually built, before against after, on those same cases: node counts both
 *      ways, what the cache held and served, and wall clock. This is the section that answers
 *      whether item 2 is worth doing, and on the shipped library the answer is no.
 *
 *   npm run bench:search-memo
 */

import {
  DEFAULT_NODE_CAP,
  assign,
  measureMemoSearch,
  measureStateRepeats,
  moodState,
  type MemoComparison,
  type StateRepeatReport,
  type Template,
} from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES, industrialTechno } from '../lib/templates/index'

// ---------------------------------------------------------------------------
// Formatting. No `toLocaleString` anywhere (invariant 6 / §7.2).
// ---------------------------------------------------------------------------

function group(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/**
 * Repeats as a percentage of nodes visited, to one decimal place. Float arithmetic is fine
 * *here* and nowhere near the resolver: this number is printed and then thrown away, and no
 * comparison, tie-break or byte of a guide depends on it.
 */
function percent(part: number, whole: number): string {
  if (whole === 0) return '0.0%'
  return `${((part / whole) * 100).toFixed(1)}%`
}

/** Seeds 0..23, as `bench-search.ts` and `bench-decomposition.ts` both sweep. */
const SWEEP_SEEDS = Array.from({ length: 24 }, (_, i) => i)

/** High enough that nothing caps, so a worst case is a worst case and not a report of the cap. */
const LIFTED_CAP = 20_000_000

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

function headline(report: StateRepeatReport): string {
  return (
    `visited ${group(report.visited)}   unique ${group(report.unique)}` +
    `   repeats ${group(report.repeats)}   hit rate ${percent(report.repeats, report.visited)}`
  )
}

/**
 * The per-depth table. Depth is the request index a node was about to decide, so the last row
 * is the leaves — a complete assignment, where a repeat means two different orders of decisions
 * landed on the same occupancy.
 *
 * Depths with no nodes are printed rather than skipped: a depth the search never reached is
 * itself a finding about where the pruning bites, and a table with holes in it invites the
 * reader to assume a copy-paste error instead.
 */
function perDepth(report: StateRepeatReport): void {
  console.log('     depth    visited     unique    repeats   hit rate')
  for (const row of report.byDepth) {
    const leaf = row.depth === report.byDepth.length - 1 ? '  (leaves)' : ''
    console.log(
      `     ${String(row.depth).padStart(5)}` +
        `  ${group(row.visited).padStart(9)}` +
        `  ${group(row.unique).padStart(9)}` +
        `  ${group(row.repeats).padStart(9)}` +
        `  ${percent(row.repeats, row.visited).padStart(9)}` +
        leaf,
    )
  }
}

/**
 * One measured case. The uninstrumented `assign` runs first and its node count is compared
 * against the probe's: the probe is meant to observe the search, not to perturb it, and if the
 * two ever disagree every number below is a report on some other search.
 */
function measure(template: Template, seed: number): StateRepeatReport {
  const plain = assign({
    devices: DEVICES,
    template,
    mood: moodState(),
    seed,
    nodeCap: LIFTED_CAP,
  })
  const started = process.hrtime.bigint()
  const report = measureStateRepeats({
    devices: DEVICES,
    template,
    mood: moodState(),
    seed,
    nodeCap: LIFTED_CAP,
  })
  const ms = Number((process.hrtime.bigint() - started) / 1_000_000n)

  if (report.visited !== plain.search.nodes) {
    throw new Error(
      `the probe perturbed the search: ${template.id} seed ${seed} visits` +
        ` ${report.visited} nodes measured and ${plain.search.nodes} unmeasured.`,
    )
  }
  if (report.unique + report.repeats !== report.visited) {
    throw new Error(
      `unique + repeats != visited at ${template.id} seed ${seed}:` +
        ` ${report.unique} + ${report.repeats} != ${report.visited}`,
    )
  }
  if (report.checks !== report.visited) {
    throw new Error(
      `the per-device derivation was checked at ${report.checks} of ${report.visited} nodes`,
    )
  }
  if (report.search.capped) {
    throw new Error(`${template.id} seed ${seed} hit the lifted cap of ${group(LIFTED_CAP)}`)
  }
  console.log(`     ${headline(report)}   ${group(ms)} ms instrumented`)
  return report
}

// ---------------------------------------------------------------------------
// A. The worst case
// ---------------------------------------------------------------------------

function sectionA(): StateRepeatReport {
  console.log('A. WORST CASE, cap lifted')
  console.log(
    `   ${DEVICES.length} devices, ${industrialTechno.id} seed 9,` +
      ` cap ${group(LIFTED_CAP)} (shipped cap ${group(DEFAULT_NODE_CAP)})`,
  )
  const report = measure(industrialTechno, 9)
  console.log(
    `     occupiedByDevice confirmed derivable from occupancy at all` +
      ` ${group(report.checks)} nodes`,
  )
  console.log()
  perDepth(report)
  return report
}

// ---------------------------------------------------------------------------
// B. Every other shipped direction, at its own worst seed
// ---------------------------------------------------------------------------

/**
 * The heaviest seed in 0..23 for this direction, by node count with the cap lifted. Swept with
 * the plain `assign` — the probe adds a per-node string build and would make this several times
 * slower for an answer that does not depend on it.
 */
function worstSeed(template: Template): { seed: number; nodes: number } {
  let out = { seed: -1, nodes: -1 }
  for (const seed of SWEEP_SEEDS) {
    const result = assign({
      devices: DEVICES,
      template,
      mood: moodState(),
      seed,
      nodeCap: LIFTED_CAP,
    })
    // Strictly greater, so ties keep the lowest seed and the case list is stable (§7.2).
    if (result.search.nodes > out.nodes) out = { seed, nodes: result.search.nodes }
  }
  return out
}

function sectionB(worstCase: StateRepeatReport): { id: string; seed: number }[] {
  console.log('\nB. EVERY OTHER SHIPPED DIRECTION, at its worst seed over 0..23, cap lifted')
  const others = TEMPLATES.filter((t) => t.id !== industrialTechno.id)
  const rows: { id: string; seed: number; report: StateRepeatReport }[] = []
  for (const template of others) {
    const { seed, nodes } = worstSeed(template)
    console.log(`\n   ${template.id}   seed ${seed}   ${group(nodes)} nodes`)
    rows.push({ id: template.id, seed, report: measure(template, seed) })
  }

  // The per-depth table only earns its space where there is a tree to describe. A direction the
  // search finishes in tens of nodes is reported as a line, and the threshold is stated rather
  // than left as a silent cut (§7.1's rule about not truncating quietly).
  console.log('\n   per-depth tables, for the cases over 1,000 nodes')
  for (const row of rows) {
    if (row.report.visited <= 1_000) {
      console.log(`\n     ${row.id} seed ${row.seed}: ${group(row.report.visited)} nodes, omitted`)
      continue
    }
    console.log(`\n   ${row.id} seed ${row.seed}`)
    perDepth(row.report)
  }

  // Section A's run is reused rather than re-measured: it is the expensive one, and measuring
  // it twice would put two different timings in one report for the same case.
  console.log('\n   summary, this section and section A')
  const all = [{ id: industrialTechno.id, seed: 9, report: worstCase }, ...rows].sort(
    (a, b) =>
      b.report.visited - a.report.visited ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  )
  for (const row of all) {
    console.log(
      `     ${row.id.padEnd(20)} seed ${String(row.seed).padStart(2)}` +
        `  ${group(row.report.visited).padStart(9)} visited` +
        `  ${group(row.report.unique).padStart(9)} unique` +
        `  ${group(row.report.repeats).padStart(9)} repeats` +
        `  ${percent(row.report.repeats, row.report.visited).padStart(6)}`,
    )
  }

  // Handed to section C so the memo is measured on exactly the cases just characterised, and
  // the worst-seed sweep is paid for once.
  return all.map(({ id, seed }) => ({ id, seed }))
}

// ---------------------------------------------------------------------------
// C. The memo, before against after
// ---------------------------------------------------------------------------

/**
 * Wall clock for one `assign`, averaged, with a warm run discarded so the first pass through
 * `buildCtx` and the JIT is not charged to the memo. Heavy cases get fewer repetitions than
 * light ones for the obvious reason.
 */
function millis(template: Template, seed: number, memo: boolean, nodes: number): number {
  const args = { devices: DEVICES, template, mood: moodState(), seed, nodeCap: LIFTED_CAP, memo }
  assign(args)
  const reps = nodes > 50_000 ? 3 : nodes > 2_000 ? 10 : 40
  const started = process.hrtime.bigint()
  for (let i = 0; i < reps; i++) assign(args)
  return Number((process.hrtime.bigint() - started) / 1_000_000n) / reps
}

function sectionC(cases: { id: string; seed: number }[]): void {
  console.log('\nC. THE MEMO, BEFORE AGAINST AFTER, cap lifted')
  console.log(
    '   two rules: `strict` caches only a subtree with no prune anywhere inside it;' +
      ' `guarded` also\n   caches one whose best clears every incumbent its prunes were taken' +
      ' against. See `Outcome`\n   in lib/core/search.ts for why the first is sound and inert' +
      ' and the second is sound and thin.',
  )

  const rows: {
    id: string
    seed: number
    comparison: MemoComparison
    msOff: number
    msOn: number
  }[] = []
  for (const { id, seed } of cases) {
    const template = TEMPLATES.find((t) => t.id === id) as Template
    const comparison = measureMemoSearch({
      devices: DEVICES,
      template,
      mood: moodState(),
      seed,
      nodeCap: LIFTED_CAP,
    })
    // The memo is meant to change the node count and nothing else. If a run ever disagreed with
    // the traversal it replaced, every number in this section would be a report on a different
    // search, so this stops rather than printing it.
    for (const [name, run] of [
      ['strict', comparison.strict],
      ['guarded', comparison.guarded],
    ] as const) {
      if (!run.sameScore || !run.sameChoices) {
        throw new Error(
          `${id} seed ${seed}: the ${name} memo returned a different` +
            `${run.sameScore ? ' assignment at the same score' : ' score'}`,
        )
      }
    }
    const nodes = comparison.off.search.nodes
    rows.push({
      id,
      seed,
      comparison,
      msOff: millis(template, seed, false, nodes),
      msOn: millis(template, seed, true, nodes),
    })
  }

  console.log('\n   nodes visited')
  console.log(
    '     direction            seed        off     strict    guarded    saved' +
      '     cached    hits',
  )
  for (const row of rows) {
    const { off, strict, guarded, memo } = {
      off: row.comparison.off.search.nodes,
      strict: row.comparison.strict.search.nodes,
      guarded: row.comparison.guarded.search.nodes,
      memo: row.comparison.guarded.memo,
    }
    console.log(
      `     ${row.id.padEnd(20)} ${String(row.seed).padStart(4)}` +
        `  ${group(off).padStart(9)}` +
        `  ${group(strict).padStart(9)}` +
        `  ${group(guarded).padStart(9)}` +
        `  ${percent(off - guarded, off).padStart(7)}` +
        `  ${group(memo.cached).padStart(9)}  ${group(memo.hits).padStart(6)}`,
    )
  }

  console.log('\n   what the traversal is actually made of, memo off')
  console.log('     direction            seed      nodes    bounded   expanded     leaves')
  for (const row of rows) {
    const nodes = row.comparison.off.search.nodes
    const { bounded, leaves } = row.comparison.off.memo
    console.log(
      `     ${row.id.padEnd(20)} ${String(row.seed).padStart(4)}` +
        `  ${group(nodes).padStart(9)}` +
        `  ${group(bounded).padStart(9)} ${percent(bounded, nodes).padStart(6)}` +
        `  ${group(nodes - bounded - leaves).padStart(9)}` +
        `  ${group(leaves).padStart(9)}`,
    )
  }

  console.log('\n   wall clock, whole `assign`')
  console.log('     direction            seed         off          on     change')
  for (const row of rows) {
    const change =
      row.msOff === 0 ? 'n/a' : `${(row.msOn / row.msOff).toFixed(2)}x`
    console.log(
      `     ${row.id.padEnd(20)} ${String(row.seed).padStart(4)}` +
        `  ${row.msOff.toFixed(1).padStart(9)} ms` +
        `  ${row.msOn.toFixed(1).padStart(9)} ms` +
        `  ${change.padStart(9)}`,
    )
  }

  const totalOff = rows.reduce((n, r) => n + r.comparison.off.search.nodes, 0)
  const totalOn = rows.reduce((n, r) => n + r.comparison.guarded.search.nodes, 0)
  const strictCached = rows.reduce((n, r) => n + r.comparison.strict.memo.cached, 0)
  console.log(
    `\n   over these ${rows.length} cases: ${group(totalOff)} nodes becomes ${group(totalOn)},` +
      ` ${percent(totalOff - totalOn, totalOff)} saved.`,
  )
  console.log(
    `   the strict rule cached ${group(strictCached)} states in total, which is why it saves` +
      ` nothing at all.`,
  )
}

// ---------------------------------------------------------------------------

const cases = sectionB(sectionA())
sectionC(cases)
console.log()
