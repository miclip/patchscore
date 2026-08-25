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
        notes: a.notes,
        deviceId: a.deviceId,
        deviceName: a.deviceName,
        // #40: plural, and the whole list — a stacked chord is several voices.
        assignables: a.assignables,
        recipe: a.recipe,
        params: a.params,
        patch: a.patch,
        sections: a.sections,
        // #100. A seeded decision like the key and the hook choice: which part defers to its
        // hook is exactly the kind of drift this file exists to catch.
        hookAuthority: a.hookAuthority ?? null,
        patterns: a.patterns.map((p) => ({
          section: p.section,
          selection: p.selection,
          articulation: p.articulation,
        })),
      })),
      shortfalls: result.shortfalls.map((g) => ({
        requestId: g.requestId,
        // #81. What the absence *means*, above the search's reason for it. Pinned because the
        // three used to be one word: a kind quietly changing is exactly the drift that would
        // otherwise show up only as a reader being told the wrong thing.
        kind: g.kind,
        // Authored on the one kind that has one (§4.4). `null` elsewhere rather than absent, so
        // the field is in the bytes and a variant that grows one shows as a diff.
        rationale: g.kind === 'not-needed' ? g.rationale : null,
        role: g.role,
        character: g.character,
        priority: g.priority,
        optional: g.optional,
        reason: g.reason,
        // `because` is on two variants now and means a different taxonomy on each (§7.3), so
        // it is pinned per variant rather than as one loose field.
        because: g.reason === 'no-recipe' ? null : g.because,
        detail: g.reason === 'no-room' ? g.detail : null,
        notes: g.reason === 'no-capable-voice' ? g.notes : null,
        roleVoices: g.reason === 'no-capable-voice' ? g.roleVoices : null,
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
