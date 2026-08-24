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
 * Three rigs, chosen to differ in the thing §8 is worst at:
 *
 *  - **full-rig** — every registry device, the rig that fills most parts and exercises pool
 *    voices, merged section blocks, a resolved hook and — since #49 — a real patch list.
 *  - **tr-1000** — one drum machine, which cannot carry a tonal part at all. Most of the
 *    template becomes gaps, so this is the fixture that proves invariant 5 renders honestly at
 *    scale rather than only in the one-gap case.
 *  - **midi-clock** — Tracker Mini + TR-1000, added with #103/#104 as the one rig here that
 *    resolved onto `midi-din`. `tr-1000` still cannot reach the phase-3 material those issues
 *    added, being a source whose manual prints neither a clock-output menu nor a note on its MIDI
 *    jacks — which was the state these fixtures exist to prevent, since a renderer change that
 *    drops either moves not one byte of the other file.
 *
 * **`full-rig` used to be the third case and #80 changed that**, which is worth recording because
 * it looks like a fixture losing its purpose. It resolved onto `usb`, because the Metropolix was
 * the library's only `preferredSource` and declares no MIDI DIN. #80 authored the Tracker Mini's
 * claim on p.283, so the full rig now holds two authored preferences, falls through to transport,
 * and lands on `midi-din` — carrying the setup line and the Type B jack note with it. The USB
 * path keeps its unit tests in `render.test.ts` and `guide-view.test.ts`, which construct the rig
 * that no longer occurs in the registry; what the committed bytes cover moved, and grew.
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

/**
 * #103/#104. Both boxes declare `midi-din`, and since #80 the Tracker Mini is the one that claims
 * `preferredSource` — its manual calls it "a perfect fit for the centre piece of a setup" (p.283).
 * So it drives over MIDI on the authored judgement rather than on `polyend-` sorting before
 * `roland-`, which is the arrangement in which the clock-output menu and the Type B adapter note
 * are both true and both rendered. The bytes did not move when the basis did; that they did not is
 * the point, since §7.4's tie-breaks were already agreeing with the claim here.
 */
const MIDI_CLOCK = DEVICES.filter(
  (d) => d.id === 'polyend-tracker-mini' || d.id === 'roland-tr-1000',
)

export const GUIDE_NAMES = ['full-rig', 'tr-1000', 'midi-clock'] as const
export type GuideName = (typeof GUIDE_NAMES)[number]

/** The rendered guide for one fixture name. Pure — the same bytes on every call. */
const RIGS: Record<GuideName, readonly Device[]> = {
  'full-rig': DEVICES,
  'tr-1000': TR_1000,
  'midi-clock': MIDI_CLOCK,
}

export function guideText(name: GuideName): string {
  return guide(RIGS[name])
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
