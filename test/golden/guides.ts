import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve as resolvePath } from 'node:path'
import { moodState, renderGuide, resolve, type Device } from '../../lib/core/index'
import { DEVICES } from '../../lib/devices/registry.generated'
import { industrialTechno } from '../../lib/templates/index'

/**
 * §8's output, pinned as bytes against the **real** device library and the real template.
 *
 * `resolve.golden.json` already pins what the resolver decides; these pin what a reader
 * actually holds. The two catch different regressions: a renderer change that reorders a phase,
 * loses a provenance badge or drops a gap moves not one byte of the resolver golden.
 *
 * Real content, not a fixture rig, because the failure modes that matter here only appear at
 * real scale — forty-odd capable assignables in one gap line, six sections programming
 * identically, a device whose every point is provisional. A hand-built rig small enough to read
 * is a rig too small to show any of that.
 *
 * Two rigs, chosen to differ in the thing §8 is worst at:
 *
 *  - **full-rig** — all three registry devices, the rig that fills most parts and exercises
 *    pool voices, merged section blocks and a resolved hook.
 *  - **tr-1000** — one drum machine, which cannot carry a tonal part at all. Most of the
 *    template becomes gaps, so this is the fixture that proves invariant 5 renders honestly at
 *    scale rather than only in the one-gap case.
 *
 * Neutral mood on purpose: mood is `resolve.golden.json`'s subject and it is off-centre there.
 * Holding every knob at 50 here means a diff in these files is a *rendering* diff, not §6.1
 * arithmetic reaching the page through a second door.
 *
 * Seed 18 because it resolves `F minor` — the key whose third is `Eb`, so #32's enharmonic
 * reading (`Eb2` beside `D#2`) is exercised by the committed bytes and not by a unit test alone.
 */

const SEED = 18

/** Every knob centred. See above: these fixtures are about rendering, not about mood. */
const MOOD = moodState()

function guide(devices: readonly Device[]): string {
  return renderGuide(resolve({ devices, template: industrialTechno, mood: MOOD, seed: SEED }))
}

const TR_1000 = DEVICES.filter((d) => d.id === 'roland-tr-1000')

export const GUIDE_NAMES = ['full-rig', 'tr-1000'] as const
export type GuideName = (typeof GUIDE_NAMES)[number]

/** The rendered guide for one fixture name. Pure — the same bytes on every call. */
export function guideText(name: GuideName): string {
  return name === 'full-rig' ? guide(DEVICES) : guide(TR_1000)
}

const THIS_FILE = fileURLToPath(import.meta.url)
const HERE = dirname(THIS_FILE)

export function guidePath(name: GuideName): string {
  return join(HERE, `${name}.golden.md`)
}

/**
 * `npm run gen:guides` writes both files, and is the only way they are ever regenerated.
 *
 * Named alone (`tsx test/golden/guides.ts full-rig`) it prints one guide to stdout and writes
 * nothing, which is how the cross-locale test captures another locale's answer without touching
 * the repo — the same shape `generate.ts` uses for the resolver golden.
 */
if (process.argv[1] !== undefined && resolvePath(process.argv[1]) === THIS_FILE) {
  const argv = process.argv.slice(2)
  if (argv.includes('--write')) {
    for (const name of GUIDE_NAMES) {
      const path = guidePath(name)
      writeFileSync(path, guideText(name))
      process.stderr.write(`wrote ${path}\n`)
    }
  } else {
    const wanted = GUIDE_NAMES.find((name) => argv.includes(name))
    if (wanted === undefined) {
      process.stderr.write(`usage: guides.ts --write | ${GUIDE_NAMES.join(' | ')}\n`)
      process.exit(2)
    }
    process.stdout.write(guideText(wanted))
  }
}
