import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve as resolvePath } from 'node:path'
import { resolve, type ResolveResult } from '../../lib/core/index'
import { GOLDEN_DEVICES, GOLDEN_MOOD, GOLDEN_SEED, GOLDEN_TEMPLATE } from './scenario'

/**
 * Serialise the complete meaningful result of one resolve into stable, comparable bytes.
 *
 * Invariant 6 is a claim about *bytes*, so this is deliberately explicit rather than a
 * `JSON.stringify` of the raw result. Two reasons:
 *
 *  - `Map` stringifies to `{}`. `Occupancy` and the pattern selections are Maps, and silently
 *    serialising them as empty objects would make the golden file pass while testing nothing.
 *    They are written out as **ordered entry arrays**, so insertion order is compared too — and
 *    insertion order here is section order and request order, both of which are load-bearing.
 *  - Listing the fields by hand means a new field is *absent* from the golden until someone adds
 *    it here, rather than appearing as an unreviewed diff.
 *
 * No `toLocaleString`, no `Intl`, no locale-dependent anything (§7.2) — the whole point is that
 * these bytes are identical on a developer's Mac and on CI under a Turkish locale.
 */
export function serialise(result: ResolveResult): string {
  return `${JSON.stringify(
    {
      template: {
        id: result.template.id,
        name: result.template.name,
        bpm: result.template.bpm,
        keys: result.template.keys,
        structure: result.template.structure,
        harmony: result.template.harmony,
        hooks: result.template.hooks,
      },
      // §7 step 10's seeded choices. Listed because the key and the hook are decisions the
      // seed makes, and an undetected drift in either is exactly the invariant-6 failure this
      // file exists to catch.
      song: result.song,
      score: result.score,
      search: result.search,
      clockSource: result.clockSource ?? null,
      assignments: result.assignments.map((a) => ({
        requestId: a.requestId,
        role: a.role,
        character: a.character,
        priority: a.priority,
        optional: a.optional,
        deviceId: a.deviceId,
        deviceName: a.deviceName,
        assignable: a.assignable,
        recipe: a.recipe,
        params: a.params,
        patch: a.patch,
        sections: a.sections,
        patterns: a.patterns.map((p) => ({
          section: p.section,
          selection: p.selection,
          articulation: p.articulation,
        })),
      })),
      gaps: result.gaps.map((g) => ({
        requestId: g.requestId,
        role: g.role,
        character: g.character,
        priority: g.priority,
        optional: g.optional,
        reason: g.reason,
        because: g.reason === 'no-room' ? g.because : null,
        detail: g.reason === 'no-room' ? g.detail : null,
        capable: g.capable,
      })),
      // Maps, as ordered entries.
      occupancy: [...result.occupancy].map(([key, bySection]) => [key, [...bySection]]),
      patterns: [...result.patterns].map(([requestId, bySection]) => [requestId, [...bySection]]),
    },
    null,
    2,
  )}\n`
}

export function goldenText(): string {
  return serialise(
    resolve({
      devices: GOLDEN_DEVICES,
      template: GOLDEN_TEMPLATE,
      mood: GOLDEN_MOOD,
      seed: GOLDEN_SEED,
    }),
  )
}

const THIS_FILE = fileURLToPath(import.meta.url)

export const GOLDEN_PATH = join(dirname(THIS_FILE), 'resolve.golden.json')

// `npm run gen:golden` writes the file; bare invocation prints it, which is how the
// cross-locale test captures another locale's answer without touching the repo.
if (process.argv[1] !== undefined && resolvePath(process.argv[1]) === THIS_FILE) {
  const text = goldenText()
  if (process.argv.includes('--write')) {
    writeFileSync(GOLDEN_PATH, text)
    process.stderr.write(`wrote ${GOLDEN_PATH}\n`)
  } else {
    process.stdout.write(text)
  }
}
