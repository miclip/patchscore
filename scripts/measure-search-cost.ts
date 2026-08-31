/**
 * §7.1/#235. **What the whole library costs the search, measured rather than remembered.**
 *
 * `.claude/skills/device-authoring/SKILL.md` teaches device sizing from a table of node counts,
 * and that table went stale twice in two devices — each time because somebody hand-updated it, or
 * did not. The numbers move whenever a device lands, so they belong behind a command.
 *
 *   npx tsx scripts/measure-search-cost.ts
 *   npx tsx scripts/measure-search-cost.ts --attribute novation-circuit-tracks
 *
 * The first form prints the row the skill's table wants, and the headroom against
 * `DEFAULT_NODE_CAP`. The second answers the question the skill actually cares about — *which of
 * this device's roles is the search paying for* — by dropping each role's recipes from that one
 * manifest and re-measuring. Nothing is written to disk and no manifest is modified: the trimmed
 * devices exist for the length of one sweep.
 *
 * **Why the cap matters here rather than only in `search.ts`.** #228: a capped search silently
 * returns a worse allocation, so approaching the ceiling is a correctness problem before it is a
 * latency one. The headroom line is the early warning, and it is why this prints a multiple rather
 * than a bare count.
 */

import { DEFAULT_NODE_CAP, assign, moodState } from '../lib/core/index'
import type { Device } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { MAX_RIG_DEVICES } from '../lib/core/index'
import { TEMPLATES } from '../lib/templates/index'

/** The sweep the skill's table quotes: every direction, every seed, uncapped so nothing truncates. */
const SEEDS = Array.from({ length: 24 }, (_, i) => i)
const LIFTED = 20_000_000

type Worst = { nodes: number; where: string }

function sweep(devices: readonly Device[], templateId?: string): Worst {
  let worst: Worst = { nodes: -1, where: '' }
  for (const template of TEMPLATES) {
    if (templateId !== undefined && template.id !== templateId) continue
    for (const seed of SEEDS) {
      const result = assign({
        devices: [...devices],
        template,
        mood: moodState(),
        seed,
        nodeCap: LIFTED,
      })
      if (result.search.nodes > worst.nodes) {
        worst = { nodes: result.search.nodes, where: `${template.id} seed ${seed}` }
      }
    }
  }
  return worst
}

/**
 * Thousands separators by hand. **Not `toLocaleString`** — CLAUDE.md bans locale-dependent
 * formatting outright, and while a reporting script is not the resolver, a banned call sitting in
 * the repo is one somebody copies into something that is. Grouping digits is three lines.
 */
function n(value: number): string {
  const digits = String(value)
  let out = ''
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += ','
    out += digits[i]
  }
  return out
}

/**
 * The worst case over rigs the product can actually produce.
 *
 * Exhaustive is out — there are C(46, 10) of them — so this sweeps a deterministic sample:
 * `MAX_RIG_DEVICES` devices taken at a fixed stride from the registry, for every stride that
 * yields a full rig. Fixed rather than random, so two runs on one tree agree (invariant 6 applies
 * to measurement as much as to guides).
 *
 * A sample can miss the true worst rig, and that is acceptable here because of the margin: the
 * numbers it returns are orders of magnitude under the cap, so the question it answers is "is the
 * legal case anywhere near the ceiling" rather than "what is the exact maximum".
 */
function worstLegalRig(): Worst {
  let worst: Worst = { nodes: -1, where: '' } as Worst
  for (let stride = 1; stride <= Math.floor(DEVICES.length / MAX_RIG_DEVICES) + 1; stride++) {
    for (let offset = 0; offset < stride; offset++) {
      const rig: Device[] = []
      for (let i = offset; i < DEVICES.length && rig.length < MAX_RIG_DEVICES; i += stride) {
        const d = DEVICES[i]
        if (d !== undefined) rig.push(d)
      }
      if (rig.length < MAX_RIG_DEVICES) continue
      const got = sweep(rig)
      if (got.nodes > worst.nodes) worst = got
    }
  }
  return worst
}

function report(): void {
  /**
   * #301. **The legal rig is the gate; the catalogue is a benchmark.**
   *
   * This script printed one number — the whole 46-device catalogue — and that number has been
   * misread as a limit the product is approaching three separate times: it blocked a device from
   * landing (#248), blocked a test (#293), and nearly blocked a percussion recipe. Nobody can
   * select 46 devices. `MAX_RIG_DEVICES` is 10 and `withDevice` refuses the eleventh, so a rig
   * that size is not reachable through the picker or through a permalink.
   *
   * So the headroom warning below is computed against the worst **legal** rig and the catalogue
   * figure is reported beside it, labelled as what it is. The sample is deterministic — a fixed
   * stride over the registry rather than a random draw — because a benchmark that moves on its
   * own tells you nothing (invariant 6 applies to measurement as much as to guides).
   */
  const legal = worstLegalRig()
  const catalogue = sweep(DEVICES)
  const headroom = DEFAULT_NODE_CAP / legal.nodes

  console.log(`rig limit      ${MAX_RIG_DEVICES} devices  (MAX_RIG_DEVICES)`)
  console.log(`worst rig      ${n(legal.nodes)} nodes  (${legal.where})`)
  console.log(`cap            ${n(DEFAULT_NODE_CAP)}`)
  console.log(
    `headroom       ${headroom.toFixed(0)}x  —  ${((legal.nodes / DEFAULT_NODE_CAP) * 100).toFixed(2)}% of the cap`,
  )
  console.log('')
  console.log(`catalogue      ${n(catalogue.nodes)} nodes over all ${DEVICES.length} devices  (${catalogue.where})`)
  console.log(`               a benchmark, not a rig — nobody can select this many (#301)`)
  /**
   * **2x, because that is where the cap was set from.** #229 re-derived `DEFAULT_NODE_CAP` at
   * 223,348 with 2.2x headroom, so falling under 2x means most of what that bought is already
   * spent — which is a fact worth saying out loud rather than leaving in a ratio somebody has to
   * notice.
   */
  if (headroom < 2) {
    console.log('')
    console.log(`   Under 2x on a rig somebody can actually build. A capped search returns a worse`)
    console.log(`   allocation without saying so (#228), so this is a correctness margin rather`)
    console.log(`   than a speed one. Run --attribute on the last device that landed, and price`)
    console.log(`   the next one's crowded roles before authoring them.`)
  }
}

/**
 * Which of one device's roles the search is paying for.
 *
 * Ranked by what removing it saves, because that is the only question an author can act on. A
 * recipe count cannot answer it: the MicroFreak's `pad` carried its whole rise, and the Circuit
 * Tracks' seventeen recipes turned out to be two that mattered and fifteen that did not.
 */
function attribute(deviceId: string): void {
  const device = DEVICES.find((d) => d.id === deviceId)
  if (device === undefined) {
    console.error(`no such device: ${deviceId}`)
    process.exitCode = 1
    return
  }

  // The worst direction for the whole library, then hold it fixed — attribution is only
  // meaningful against one direction, and this is the one the cap is decided by.
  const base = sweep(DEVICES)
  const direction = base.where.split(' ')[0] as string
  const baseHere = sweep(DEVICES, direction)
  const without = sweep(
    DEVICES.filter((d) => d.id !== deviceId),
    direction,
  )

  console.log(`${device.name} — ${device.recipes.length} recipes, worst direction ${direction}`)
  console.log(`  with it        ${n(baseHere.nodes)}`)
  console.log(`  without it     ${n(without.nodes)}`)
  console.log(`  its cost       ${n(baseHere.nodes - without.nodes)}`)
  console.log('')

  const roles = [...new Set(device.recipes.map((r) => r.role))]
  const rows = roles.map((role) => {
    const trimmed = DEVICES.map((d) =>
      d.id === deviceId ? { ...d, recipes: d.recipes.filter((r) => r.role !== role) } : d,
    )
    return { role, nodes: sweep(trimmed, direction).nodes }
  })
  rows.sort((a, b) => a.nodes - b.nodes)

  for (const { role, nodes } of rows) {
    const saved = baseHere.nodes - nodes
    const share = (saved / Math.max(1, baseHere.nodes - without.nodes)) * 100
    console.log(
      `  drop ${role.padEnd(13)} ${n(nodes).padStart(9)}   saves ${n(saved).padStart(8)}` +
        `  ${share.toFixed(0).padStart(3)}% of what this device costs`,
    )
  }
}

const flag = process.argv.indexOf('--attribute')
if (flag === -1) report()
else attribute(process.argv[flag + 1] ?? '')
