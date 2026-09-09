import { writeFileSync } from 'node:fs'
import { dirname, join, resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Device, SampleTarget } from '@/lib/core'
import { resolveSample } from '@/lib/core'
import { DEVICES } from '@/lib/devices/registry.generated'
import { sampleTargetById } from '@/lib/samples'
import { renderSample } from '@/lib/studio/sample-markdown'

/**
 * §3.8/#520. The committed bytes for a sound page.
 *
 * **Three fixtures, and each is a rendering branch the other two do not reach.** The brief asked
 * for one; #511's lesson, recorded in `riffs.ts` beside this file, is that a shape with no
 * committed bytes is one a renderer change can quietly lose, and `sample-markdown.ts` holds its
 * own copy of the parameter writer rather than sharing the riff's.
 *
 *  - `texture-on-a-neutron` — the whole of a `made` page: a routing sentence, two cables, #385's
 *    module boxes, thirty-six resolved values with notes and jogs under them, §3.5's substitution
 *    disclosure, the citation sentence, and the recording block that ends every one of these
 *    documents.
 *  - `wobble-on-a-mother-32` — the **modulation** branch (#511). It is drawn as an assignment
 *    rather than as a knob, and no other sample fixture lands on a recipe carrying one.
 *  - `vocal-chop-on-a-sampler` — the gap, in bytes: the `loads-audio` sentence, the `Content` line
 *    saying what that box actually ships (§2.6/#111), and **nothing after it**. A gap ends the
 *    document, so the shortest fixture here is the one that pins the absence of a recording block.
 *
 * The other three gap arms are pinned as *outcomes* by `test/sample-session.test.ts` and as
 * *sentences* by `test/sample-golden.test.ts`: a gap is one line, and a golden per line would be
 * files whose diffs say nothing a `toContain` does not.
 *
 * **Never regenerate a golden to make a test pass.** The diff is the review.
 */

const rig = (...ids: string[]): readonly Device[] =>
  ids.map((id) => {
    const device = DEVICES.find((d) => d.id === id)
    if (device === undefined) throw new Error(`no device ${id}`)
    return device
  })

const target = (id: string): SampleTarget => {
  const found = sampleTargetById(id)
  if (found === undefined) throw new Error(`no sample target ${id}`)
  return found
}

export const SAMPLE_NAMES = [
  'texture-on-a-neutron',
  'wobble-on-a-mother-32',
  'vocal-chop-on-a-sampler',
] as const
export type SampleName = (typeof SAMPLE_NAMES)[number]

const FIXTURES: Record<SampleName, () => { target: SampleTarget; devices: readonly Device[] }> = {
  // A semi-modular with the fullest `made` page in the library: a routing sentence, two cables,
  // module boxes, and notes and jogs under thirty-six values. It also carries §3.5's substitution
  // in bytes — the target asks for a dark texture and this box authors a soft one — which is the
  // disclosure a reader would otherwise never see.
  'texture-on-a-neutron': () => ({
    target: target('texture-bed'),
    devices: rig('behringer-neutron'),
  }),
  // #511. The one sample fixture that renders a **modulation**, which is drawn as an assignment
  // rather than as a knob. The Mother-32 is where the shape lives, as it is for the riff goldens.
  'wobble-on-a-mother-32': () => ({
    target: target('wobble-bass'),
    devices: rig('moog-mother-32'),
  }),
  // A sampler alone, and the sound no synthesiser makes. `loads-audio`, with §2.6/#111's content
  // sentence under it saying what the box actually ships, and the document ending there.
  'vocal-chop-on-a-sampler': () => ({
    target: target('vocal-chop'),
    devices: rig('elektron-digitakt'),
  }),
}

/** The rendered document for one fixture name. Pure — the same bytes on every call. */
export function sampleText(name: SampleName): string {
  const { target: entry, devices } = FIXTURES[name]()
  return renderSample(resolveSample(entry, devices))
}

const THIS_FILE = fileURLToPath(import.meta.url)
const HERE = dirname(THIS_FILE)

export function samplePath(name: SampleName): string {
  return join(HERE, `${name}.sample.golden.md`)
}

if (process.argv[1] !== undefined && resolvePath(process.argv[1]) === THIS_FILE) {
  const argv = process.argv.slice(2)
  if (argv.includes('--write')) {
    for (const name of SAMPLE_NAMES) {
      const path = samplePath(name)
      writeFileSync(path, sampleText(name))
      process.stderr.write(`wrote ${path}\n`)
    }
  } else {
    const wanted = SAMPLE_NAMES.find((name) => argv.includes(name))
    if (wanted === undefined) {
      process.stderr.write(`usage: samples.ts --write | ${SAMPLE_NAMES.join(' | ')}\n`)
      process.exit(2)
    }
    process.stdout.write(sampleText(wanted))
  }
}
