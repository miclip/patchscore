/**
 * Issue #27's benchmark, committed so the numbers in `DESIGN.md` §7.1 can be re-measured
 * rather than trusted.
 *
 * The original probe that produced the issue's table was written to a scratch file and thrown
 * away, so its absolute node counts cannot be reproduced — a different role list or a
 * different priority grouping moves them. What is reproduced here is the *shape* the issue
 * identified, and the shape is the finding: a rig of fixed voices stays flat as parts are
 * added, and a pool device grows factorially in its member count until it hits the node cap.
 *
 * Both columns come from this one harness, so the before/after comparison is exact even where
 * the absolute numbers differ from the issue's. The "before" column runs the same shipping
 * search over a rig whose pool has been rewritten into individually-named fixed voices
 * (`desugarPools`): with no `poolId` on an assignable there is no symmetry to break, so every
 * ordinal is explored as its own candidate, which is precisely what the search did before the
 * fix. There is deliberately no flag to turn the bug back on.
 *
 *   npx tsx scripts/bench-search.ts
 */

import {
  DEFAULT_NODE_CAP,
  assign,
  moodState,
  type Character,
  type Device,
  type Recipe,
  type Role,
  type RoleRequest,
  type Template,
} from '../lib/core/index'
import { device as tr1000 } from '../lib/devices/roland-tr-1000/index'
import { device as trackerMini } from '../lib/devices/polyend-tracker-mini/index'
import { device as deluge } from '../lib/devices/synthstrom-deluge/index'
// One implementation of the rewrite, shared with `test/search-symmetry.test.ts`, so the column
// this prints and the column the tests assert against cannot drift apart.
import { desugarPools } from '../test/rigs'

// ---------------------------------------------------------------------------
// The synthetic pool, whose only variable is how many members it has
// ---------------------------------------------------------------------------

/** Tracker Mini's shape: one fungible pool, polyphonic, serving the tonal roles. */
const POOL_ROLES: Role[] = ['kick', 'sub', 'pad', 'lead', 'texture', 'snare', 'closed-hat']

function poolRecipe(role: Role, character: Character): Recipe {
  return {
    id: `bench-${role}-${character}`,
    role,
    character,
    voice: 'track',
    title: `${character} ${role}`,
    params: [
      {
        kind: 'numeric',
        name: 'LEVEL',
        value: 64,
        range: { min: 0, max: 127, verified: { kind: 'manual', source: 'bench' } },
      },
    ],
    verified: { kind: 'manual', source: 'bench' },
  }
}

function poolDevice(count: number): Device {
  return {
    id: 'bench-tracker',
    name: `Bench Tracker (${count})`,
    maker: 'Bench',
    kind: 'groovebox',
    clock: { canSendClock: true, canReceiveClock: true, transport: ['midi-din'] },
    io: { main: 'stereo', individualOuts: 0, audioIn: false, usbAudio: true },
    voices: [
      { kind: 'pool', id: 'track', label: 'Track', count, roles: POOL_ROLES, polyphony: 4 },
    ],
    comfortableVoices: count,
    recipes: POOL_ROLES.map((role) => poolRecipe(role, 'dark')),
  }
}

// ---------------------------------------------------------------------------
// The template, whose only variable is how many parts it asks for
// ---------------------------------------------------------------------------

/**
 * Roles both boxes can plausibly carry, so the search has a real choice to make. The first
 * eight drive the pool-size table; the rest extend it to the ten- and twelve-part templates a
 * real guide asks for, and adding them cannot move the earlier columns because those take a
 * prefix of this list.
 */
const TEMPLATE_ROLES: Role[] = [
  'kick',
  'snare',
  'closed-hat',
  'sub',
  'pad',
  'lead',
  'texture',
  'open-hat',
  'clap',
  'tom',
  'arp',
  'bass-mid',
]

function bench(count: number): Template {
  const roles: RoleRequest[] = TEMPLATE_ROLES.slice(0, count).map((role, i) => ({
    id: `r-${i}-${role}`,
    role,
    priority: Math.min(4, 1 + Math.floor(i / 2)),
    character: 'dark',
    sustain: 'continuous',
  }))
  return {
    id: 'bench',
    name: 'Bench',
    bpm: { min: 128, max: 140, default: 134 },
    keys: ['A minor'],
    structure: [
      { name: 'Intro', bars: 16, energy: 0.2 },
      { name: 'Build', bars: 16, energy: 0.5 },
      { name: 'Drop', bars: 32, energy: 0.9 },
    ],
    harmony: { cycleBars: 8, progression: [{ degree: 'i', bars: 8 }] },
    hooks: [],
    roles,
    patterns: [],
  }
}

// ---------------------------------------------------------------------------

type Symmetry = 'break' | 'explore'

const ROLE_COUNTS = [4, 6, 8]
const POOL_SIZES = [1, 2, 4, 8, 16]

function measure(devices: Device[], roleCount: number, symmetry: Symmetry): string {
  const result = assign({
    devices: symmetry === 'explore' ? devices.map(desugarPools) : devices,
    template: bench(roleCount),
    mood: moodState(),
    seed: 1,
  })
  if (result.search.capped) return 'CAPPED'
  // Grouped by hand rather than with `toLocaleString`, which is banned outright (§7.2): the
  // separator it picks depends on the ambient locale.
  return String(result.search.nodes).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function table(symmetry: Symmetry): void {
  const heading =
    symmetry === 'explore' ? 'BEFORE (pools as individual fixed voices)' : 'AFTER (§7.1)'
  console.log(`\n${heading}   node cap ${DEFAULT_NODE_CAP}`)
  console.log(''.padEnd(14) + ROLE_COUNTS.map((n) => `${n} roles`.padStart(10)).join(''))
  const rows: [string, Device[]][] = [
    ['TR only', [tr1000]],
    ...POOL_SIZES.map(
      (size) => [`+ pool(${size})`, [tr1000, poolDevice(size)]] as [string, Device[]],
    ),
  ]
  for (const [label, devices] of rows) {
    const cells = ROLE_COUNTS.map((n) => measure(devices, n, symmetry).padStart(10)).join('')
    console.log(label.padEnd(14) + cells)
  }
}

// ---------------------------------------------------------------------------
// The same measurement on the rig somebody actually owns
// ---------------------------------------------------------------------------

/**
 * The synthetic table isolates pool size; this one says what it costs in practice, on the
 * real manifests and at the part counts a real template reaches (§11's ten to fifteen).
 */
function realRigs(): void {
  const rigs: [string, Device[]][] = [
    ['TR-1000', [tr1000]],
    ['+ Tracker Mini', [tr1000, trackerMini]],
    ['+ Deluge', [tr1000, deluge]],
    ['all three', [tr1000, trackerMini, deluge]],
  ]
  const counts = [6, 8, 10, 12]
  console.log('\nREAL REGISTRY   before | after')
  console.log(''.padEnd(16) + counts.map((n) => `${n} roles`.padStart(16)).join(''))
  for (const [label, devices] of rigs) {
    const cells = counts
      .map((n) => `${measure(devices, n, 'explore')} | ${measure(devices, n, 'break')}`.padStart(16))
      .join('')
    console.log(label.padEnd(16) + cells)
  }
}

table('explore')
table('break')
realRigs()
console.log()
