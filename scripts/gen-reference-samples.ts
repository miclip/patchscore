/**
 * §3.9/#519. Write the fourteen reference samples to disk, so somebody can listen to them.
 *
 * **The files are not committed and this script is not part of any build.** The bytes are a pure
 * function of `lib/audio/reference.ts`, `test/reference-samples.test.ts` pins every one of them by
 * hash, and a repo with no binary story does not need one for output it can regenerate in a second.
 * This exists because the one thing a hash cannot tell anybody is whether a kick sounds like a
 * kick, and that question is answered with ears.
 *
 *   npm run samples:wav              # writes to tmp/reference-samples/
 *   npm run samples:wav -- <dir>     # somewhere else
 *
 * `tmp/` is gitignored.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { REFERENCE_SAMPLES, referenceWav } from '../lib/audio/index'

const dir = process.argv[2] ?? 'tmp/reference-samples'
mkdirSync(dir, { recursive: true })

for (const sample of REFERENCE_SAMPLES) {
  const bytes = referenceWav(sample.role)
  if (bytes === undefined) throw new Error(`no reference recipe for ${sample.role}`)
  writeFileSync(join(dir, sample.file), bytes)
  // Padded so the durations line up in a column, which is the thing anybody scans this list for.
  console.log(`${sample.file.padEnd(16)} ${sample.seconds.toFixed(2)}s  ${sample.note}`)
}

console.log(`\n${REFERENCE_SAMPLES.length} files in ${dir}`)
