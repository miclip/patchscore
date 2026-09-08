import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve as resolvePath } from 'node:path'
import { DEVICES } from '../../lib/devices/registry.generated'
import { kitSession } from '../../lib/studio/kit-session'
import { renderKitSession } from '../../lib/studio/kit-markdown'

/**
 * §3.7/#478. **A kit session's Markdown, pinned as bytes against the real device library.**
 *
 * The guide goldens beside this one need a rig, a direction, a mood and a seed; this needs a
 * device, and that is the whole difference the surface exists to make. What it catches is what
 * they catch — a renderer change that drops a cable, loses a note, reorders a slot or quietly
 * starts printing a provenance mark — on the one surface none of them cover.
 *
 * **The Cascadia, because it is the box the section was argued from.** A mono semi-modular with
 * eight kit sounds, two of them duplicated roles, a patch list on every one of them, and six of
 * the nine core kit roles absent: the ordered slots, the cables, the numbered duplicates and the
 * gap sentence are all real here rather than constructed. It is also the box whose recipes are
 * played by a front-panel button, which is what makes a kit session on it a thing somebody can
 * actually do with nothing else in the room.
 *
 * Regenerate with **`npm run gen:kits`** and read the diff. Never regenerate to make a test
 * pass — the diff is the review.
 */

export const KIT_NAMES = ['cascadia'] as const
export type KitName = (typeof KIT_NAMES)[number]

const DEVICE_IDS: Record<KitName, string> = {
  cascadia: 'intellijel-cascadia',
}

/** The rendered session for one fixture name. Pure — the same bytes on every call. */
export function kitText(name: KitName): string {
  const id = DEVICE_IDS[name]
  const device = DEVICES.find((d) => d.id === id)
  if (device === undefined) throw new Error(`no device ${id}`)
  const session = kitSession(device)
  // A fixture on a box that stopped offering a kit is a fixture testing nothing, and it must
  // fail loudly rather than write an empty file.
  if (session === undefined) throw new Error(`${id} offers no kit`)
  return renderKitSession(session)
}

const THIS_FILE = fileURLToPath(import.meta.url)
const HERE = dirname(THIS_FILE)

export function kitPath(name: KitName): string {
  return join(HERE, `${name}.kit.golden.md`)
}

/**
 * `npm run gen:kits` writes every file in `KIT_NAMES`. Named alone
 * (`tsx test/golden/kits.ts cascadia`) it prints one to stdout and writes nothing, which is how
 * the cross-locale test captures another locale's answer without touching the repo — the same
 * shape `generate.ts` and `guides.ts` use.
 */
if (process.argv[1] !== undefined && resolvePath(process.argv[1]) === THIS_FILE) {
  const argv = process.argv.slice(2)
  if (argv.includes('--write')) {
    for (const name of KIT_NAMES) {
      const path = kitPath(name)
      writeFileSync(path, kitText(name))
      process.stderr.write(`wrote ${path}\n`)
    }
  } else {
    const wanted = KIT_NAMES.find((name) => argv.includes(name))
    if (wanted === undefined) {
      process.stderr.write(`usage: kits.ts --write | ${KIT_NAMES.join(' | ')}\n`)
      process.exit(2)
    }
    process.stdout.write(kitText(wanted))
  }
}
