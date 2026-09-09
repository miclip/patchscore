import { writeFileSync } from 'node:fs'
import { dirname, join, resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Device } from '@/lib/core'
import { resolveRiff } from '@/lib/core'
import { DEVICES } from '@/lib/devices/registry.generated'
import { blueMondayBass, showMeLoveOrganStab } from '@/lib/riffs'
import { renderRiff } from '@/lib/studio/riff-markdown'
import type { Riff } from '@/lib/core'

/**
 * §5A. The committed bytes for a riff page. Three fixtures, and between them they cover the
 * shapes this surface has to get right:
 *
 *  - `blue-monday-bass` on a rig that plays it — the technique, the notes, the grid, and one
 *    box's whole patch with its citation sentence.
 *  - `bass-on-a-sampler` — the same figure on a *pool* voice addressed by note, which is a
 *    materially different page: a trigger note, a source to load, and a track rather than a
 *    named voice. Neither of the other two reaches any of it.
 *  - `organ-stab-mono` on a rig that cannot — §7.3's `polyphony` gap, which is the arm a chord
 *    riff reaches and the one a reader is most likely to hit. Invariant 5 is not a thing to test
 *    only in a unit; the sentence a reader gets is bytes like any other.
 *  - `organ-stab-stacked` on a rig that plays the same chord by spreading it one note per voice
 *    across a pool (§12.4/#40). The two chord fixtures are a pair on purpose: the difference
 *    between them is *a pool*, and before #503's second fix the second of them reported the
 *    first's gap.
 *
 * **Never regenerate a golden to make a test pass.** The diff is the review.
 */

const rig = (...ids: string[]): readonly Device[] =>
  ids.map((id) => {
    const device = DEVICES.find((d) => d.id === id)
    if (device === undefined) throw new Error(`no device ${id}`)
    return device
  })

export const RIFF_NAMES = [
  'blue-monday-bass',
  'bass-on-a-sampler',
  'organ-stab-mono',
  'organ-stab-stacked',
] as const
export type RiffName = (typeof RIFF_NAMES)[number]

type Fixture = { riff: Riff; devices: readonly Device[] }

const FIXTURES: Record<RiffName, () => Fixture> = {
  // A small studio rig: a mono synth that authors a hard bass, a tracker, and a drum machine.
  'blue-monday-bass': () => ({
    riff: blueMondayBass,
    devices: rig('moog-subsequent-37', 'polyend-tracker-mini', 'roland-tr-8s'),
  }),
  // A sampler alone. `blue-monday-bass` lands on a track rather than on a named voice, so this
  // is the fixture that carries the trigger note — the bridge between the figure's scientific
  // pitch notation and a box that puts middle C somewhere else (#32).
  'bass-on-a-sampler': () => ({
    riff: blueMondayBass,
    devices: rig('elektron-digitakt-ii'),
  }),
  // Two monosynths. Both play `stab`; neither sounds three notes at once, and there are only two
  // voices between them — so the sentence is the one that says there is nothing to spread it
  // across, rather than the one that tells a reader to stack it by hand.
  'organ-stab-mono': () => ({
    riff: showMeLoveOrganStab,
    devices: rig('behringer-crave', 'moog-mother-32'),
  }),
  // §12.4/#40. Eight interchangeable tracks. No one of them sounds three notes, and the pool
  // spreads the chord across three — which is a *played* page with a stack, not a gap.
  'organ-stab-stacked': () => ({
    riff: showMeLoveOrganStab,
    devices: rig('polyend-tracker-mini'),
  }),
}

/** The rendered page for one fixture name. Pure — the same bytes on every call. */
export function riffText(name: RiffName): string {
  const { riff, devices } = FIXTURES[name]()
  return renderRiff(resolveRiff(riff, devices))
}

const THIS_FILE = fileURLToPath(import.meta.url)
const HERE = dirname(THIS_FILE)

export function riffPath(name: RiffName): string {
  return join(HERE, `${name}.riff.golden.md`)
}

if (process.argv[1] !== undefined && resolvePath(process.argv[1]) === THIS_FILE) {
  const argv = process.argv.slice(2)
  if (argv.includes('--write')) {
    for (const name of RIFF_NAMES) {
      const path = riffPath(name)
      writeFileSync(path, riffText(name))
      process.stderr.write(`wrote ${path}\n`)
    }
  } else {
    const wanted = RIFF_NAMES.find((name) => argv.includes(name))
    if (wanted === undefined) {
      process.stderr.write(`usage: riffs.ts --write | ${RIFF_NAMES.join(' | ')}\n`)
      process.exit(2)
    }
    process.stdout.write(riffText(wanted))
  }
}
