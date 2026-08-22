import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { GUIDE_NAMES, guidePath, guideText } from './golden/guides'

/**
 * §8's rendered output, pinned as bytes against the real device library.
 *
 * Invariant 6 says "same inputs + same seed + same resolver version → byte-identical guide, on
 * any platform" — *guide*, not resolver result. `resolve.golden.json` proves the first half of
 * that sentence; these files prove the half a reader actually holds, and a renderer regression
 * moves not one byte of the resolver golden.
 *
 * Regenerate with **`npm run gen:guides`**, then read the diff. Never regenerate to make a test
 * pass: the diff *is* the review, and it is the only place a lost provenance badge or a dropped
 * gap becomes visible before a person is standing at a machine holding the page.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(HERE, '..')
const TSX = join(REPO_ROOT, 'node_modules', '.bin', 'tsx')
const GENERATOR = join(HERE, 'golden', 'guides.ts')

// The same ICU trap `determinism.test.ts` uses: Node reads LANG/LC_ALL to pick its default
// locale, so a `localeCompare` that reached the renderer would answer differently under it.
const HOSTILE_LOCALE = 'tr_TR.UTF-8'

/** §8 phase 6's body: where rendered parameter values live, and nothing else does. */
function soundDesign(doc: string): string[] {
  const lines = doc.split('\n')
  const start = lines.findIndex((l) => l.startsWith('## 6. '))
  expect(start).toBeGreaterThan(-1)
  const rest = lines.slice(start + 1)
  const end = rest.findIndex((l) => l.startsWith('## '))
  return end === -1 ? rest : rest.slice(0, end)
}

describe('rendered guide fixtures (§8, invariant 6)', () => {
  for (const name of GUIDE_NAMES) {
    describe(name, () => {
      it('matches the committed bytes exactly', () => {
        expect(guideText(name)).toBe(readFileSync(guidePath(name), 'utf8'))
      })

      it('renders the same bytes twice in one process', () => {
        expect(guideText(name)).toBe(guideText(name))
      })

      it('is byte-identical under a non-C LANG', () => {
        const child = spawnSync(TSX, [GENERATOR, name], {
          encoding: 'utf8',
          cwd: REPO_ROOT,
          env: { ...process.env, LANG: HOSTILE_LOCALE, LC_ALL: HOSTILE_LOCALE },
        })
        expect(child.error).toBeUndefined()
        expect(child.status, child.stderr).toBe(0)
        expect(child.stdout).toBe(readFileSync(guidePath(name), 'utf8'))
      })
    })
  }

  it('covers a rig that fills most parts and one that cannot fill them', () => {
    // Not decoration: the two fixtures earn their place by disagreeing. If a later edit made
    // them similar, most of what the tr-1000 file exists to pin would stop being pinned.
    const full = guideText('full-rig')
    const one = guideText('tr-1000')
    const gapsIn = (doc: string) => doc.split('\n').filter((l) => l.includes(' — no ')).length
    expect(gapsIn(one)).toBeGreaterThan(gapsIn(full))
    expect(full).toContain('Deluge')
    expect(one).not.toContain('Deluge')
  })

  it('pins all three gap reasons, which only a rig too small ever shows at once (§7.3)', () => {
    const one = guideText('tr-1000')
    expect(one).toContain('needs another box')
    expect(one).toContain('capable but unauthored')
    expect(one).toContain('no room')
  })

  it('renders nothing as derived, because the fixtures hold every knob centred (§6.1)', () => {
    // The guarantee `NEUTRAL_MOOD` makes: a centred knob changes nothing. This caught a real
    // bug — an authored `0.28 Sec` with no declared step was being rounded to `0` by a mood
    // that had moved it not at all, and the fixture is where it became visible.
    //
    // Scoped to the sound-design phase because the legend above it *illustrates* the derived
    // form (`52 → 45`) and must keep doing so; what must not appear is a rendered value in it.
    for (const name of GUIDE_NAMES) {
      const body = soundDesign(guideText(name))
      expect(body.filter((l) => l.includes('derived by')), name).toEqual([])
      expect(body.filter((l) => /`[^`]+ → [^`]+`/.test(l)), name).toEqual([])
    }
  })

  it('still renders every value it has, rather than passing by rendering nothing', () => {
    // The obvious way to make the test above pass by accident.
    for (const name of GUIDE_NAMES) {
      const values = soundDesign(guideText(name)).filter((l) => l.startsWith('- **'))
      expect(values.length, name).toBeGreaterThan(10)
    }
  })

  it('pins a flat key, so #32s enharmonic reading is covered by real bytes', () => {
    // Seed 18 resolves F minor. If a later change to the seeded pick moved the key, this fails
    // loudly rather than the fixtures quietly ceasing to cover the enharmonic at all.
    for (const name of GUIDE_NAMES) {
      const doc = guideText(name)
      expect(doc, name).toContain('**Key** F minor')
      expect(doc, name).toMatch(/`[A-G]b\d` \(`[A-G]#\d`\)/)
    }
  })
})
