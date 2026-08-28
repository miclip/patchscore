import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import {
  GENERATED_BASENAME,
  RegistryError,
  compareCodeUnits,
  listDeviceFolders,
  renderRegistry,
} from '../scripts/gen-registry'
import { DEVICES } from '../lib/devices/registry.generated'
import { device } from './fixtures'

/**
 * §9's guards, exercised through the real CLI rather than through the module, because "a bad
 * manifest fails the build" is a claim about an exit code. The pure render/sort helpers are
 * called directly where a subprocess would only add latency.
 */

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '../..')
const TSX = join(REPO_ROOT, 'node_modules', '.bin', 'tsx')
const SCRIPT = join(REPO_ROOT, 'scripts', 'gen-registry.ts')
const REAL_DEVICES_ROOT = join(REPO_ROOT, 'lib', 'devices')

const scratch: string[] = []

afterEach(() => {
  for (const dir of scratch.splice(0)) rmSync(dir, { recursive: true, force: true })
})

function tempRoot(): string {
  const dir = mkdtempSync(join(tmpdir(), 'patchscore-registry-'))
  scratch.push(dir)
  return dir
}

function runGen(args: string[]): { status: number; stdout: string; stderr: string } {
  const r = spawnSync(TSX, [SCRIPT, ...args], { encoding: 'utf8', cwd: REPO_ROOT })
  return { status: r.status ?? -1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' }
}

/** A manifest with no imports: the codegen validates the *value*, so types add nothing here. */
function writeManifest(root: string, folder: string, over: Record<string, unknown> = {}): void {
  mkdirSync(join(root, folder), { recursive: true })
  const manifest = { ...device({ id: folder }), ...over }
  writeFileSync(
    join(root, folder, 'index.ts'),
    `export const device = ${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  )
}

describe('staleness (§9: the only thing enforcing "never hand-edited")', () => {
  it('finds the committed registry up to date', () => {
    const r = runGen(['--check'])
    expect(r.stderr).toBe('')
    expect(r.status).toBe(0)
  })

  it('fails --check when the generated file has been hand-edited', () => {
    const root = tempRoot()
    writeManifest(root, 'aa-device')
    expect(runGen(['--root', root]).status).toBe(0)

    const out = join(root, GENERATED_BASENAME)
    writeFileSync(out, `${readFileSync(out, 'utf8')}// hand-edited\n`, 'utf8')

    const r = runGen(['--root', root, '--check'])
    expect(r.status).toBe(1)
    expect(r.stderr).toContain('stale or hand-edited')
  })

  it('fails --check when a device was added but the registry was not regenerated', () => {
    const root = tempRoot()
    writeManifest(root, 'aa-device')
    expect(runGen(['--root', root]).status).toBe(0)

    writeManifest(root, 'bb-device')

    const r = runGen(['--root', root, '--check'])
    expect(r.status).toBe(1)
    expect(r.stderr).toContain('stale or hand-edited')
  })

  it('fails --check when the generated file is missing entirely', () => {
    const root = tempRoot()
    writeManifest(root, 'aa-device')

    const r = runGen(['--root', root, '--check'])
    expect(r.status).toBe(1)
    expect(r.stderr).toContain('missing')
  })

  it('writes byte-identical output on a second run', () => {
    const root = tempRoot()
    writeManifest(root, 'aa-device')
    writeManifest(root, 'bb-device')

    runGen(['--root', root])
    const first = readFileSync(join(root, GENERATED_BASENAME), 'utf8')
    runGen(['--root', root])
    expect(readFileSync(join(root, GENERATED_BASENAME), 'utf8')).toBe(first)
  })
})

describe('ordering is by UTF-16 code unit, never by locale', () => {
  it('sorts capitals before lowercase, which ICU collation would not', () => {
    // 'Zeta' < 'alpha' by code unit; every common locale collates them the other way round.
    expect(compareCodeUnits('Zeta', 'alpha')).toBe(-1)
    expect(renderRegistry(['alpha', 'Zeta']).indexOf('Zeta')).toBeLessThan(
      renderRegistry(['alpha', 'Zeta']).indexOf('alpha'),
    )
  })

  it('emits imports and array entries in the same order regardless of readdir order', () => {
    const root = tempRoot()
    for (const folder of ['tr-1000', 'Zeta', 'alpha', 'deluge']) writeManifest(root, folder)

    expect(listDeviceFolders(root)).toEqual(['Zeta', 'alpha', 'deluge', 'tr-1000'])

    expect(runGen(['--root', root]).status).toBe(0)
    const generated = readFileSync(join(root, GENERATED_BASENAME), 'utf8')

    const importOrder = [...generated.matchAll(/from '\.\/(.+?)\/index'/g)].map((m) => m[1])
    expect(importOrder).toEqual(['Zeta', 'alpha', 'deluge', 'tr-1000'])

    const arrayOrder = [...generated.matchAll(/^ {2}device_(.+),$/gm)].map((m) => m[1])
    expect(arrayOrder).toEqual(['Zeta', 'alpha', 'deluge', 'tr_1000'])
  })

  it('has no ignore list — every directory is a device directory', () => {
    const root = tempRoot()
    writeManifest(root, 'aa-device')
    mkdirSync(join(root, '.cache'))
    mkdirSync(join(root, '_scratch'))

    // Skipping these would mean a device could go missing from the registry in silence, which
    // is the one outcome this script exists to prevent. They fail the build instead.
    expect(listDeviceFolders(root)).toEqual(['.cache', '_scratch', 'aa-device'])

    const r = runGen(['--root', root])
    expect(r.status).toBe(1)
    expect(r.stderr).toContain('.cache')
    expect(r.stderr).toContain('_scratch')
    expect(r.stderr).toContain('no index.ts')
  })

  it('refuses two folders that would collide on one import identifier', () => {
    expect(() => renderRegistry(['a-b', 'a_b'])).toThrow(RegistryError)
  })
})

describe('malformed manifests fail the build, not a request (§9)', () => {
  it('rejects a point value outside its own declared range', () => {
    const root = tempRoot()
    writeManifest(root, 'aa-device', {
      recipes: [
        {
          id: 'r1',
          role: 'kick',
          character: 'hard',
          voice: 'bd',
          title: 'Out of range',
          params: [{ kind: 'numeric', name: 'TUNE', value: 200, range: { min: 0, max: 100 } }],
        },
      ],
    })

    const r = runGen(['--root', root])
    expect(r.status).toBe(1)
    expect(r.stderr).toContain('aa-device')
    expect(r.stderr).toContain('recipes.0.params.0.value')
    expect(r.stderr).toContain('inside its own declared range')
  })

  it('rejects a recipe addressing a voice the device does not declare', () => {
    const root = tempRoot()
    writeManifest(root, 'aa-device', {
      recipes: [
        {
          id: 'r1',
          role: 'kick',
          character: 'hard',
          voice: 'nope',
          title: 'Ghost voice',
          params: [],
        },
      ],
    })

    const r = runGen(['--root', root])
    expect(r.status).toBe(1)
    expect(r.stderr).toContain("does not declare")
  })

  it('rejects a manifest with no `device` export', () => {
    const root = tempRoot()
    mkdirSync(join(root, 'aa-device'))
    writeFileSync(join(root, 'aa-device', 'index.ts'), 'export const nope = 1\n', 'utf8')

    const r = runGen(['--root', root])
    expect(r.status).toBe(1)
    expect(r.stderr).toContain('must export `device`')
  })

  it('rejects a device folder with no index.ts', () => {
    const root = tempRoot()
    mkdirSync(join(root, 'aa-device'))

    const r = runGen(['--root', root])
    expect(r.status).toBe(1)
    expect(r.stderr).toContain('no index.ts')
  })

  it('rejects an id that does not match its folder name', () => {
    const root = tempRoot()
    writeManifest(root, 'aa-device', { id: 'something-else' })

    const r = runGen(['--root', root])
    expect(r.status).toBe(1)
    expect(r.stderr).toContain('must match its folder name')
  })

  it('leaves the previous generated file untouched when validation fails', () => {
    const root = tempRoot()
    writeManifest(root, 'aa-device')
    runGen(['--root', root])
    const good = readFileSync(join(root, GENERATED_BASENAME), 'utf8')

    writeManifest(root, 'bb-device', { kind: 'not-a-kind' })
    expect(runGen(['--root', root]).status).toBe(1)
    expect(readFileSync(join(root, GENERATED_BASENAME), 'utf8')).toBe(good)
  })

  it('reports every bad manifest in one run, not just the first', () => {
    const root = tempRoot()
    writeManifest(root, 'aa-device', { kind: 'not-a-kind' })
    writeManifest(root, 'bb-device', { id: 'wrong' })

    const r = runGen(['--root', root])
    expect(r.status).toBe(1)
    expect(r.stderr).toContain('aa-device')
    expect(r.stderr).toContain('bb-device')
  })
})

describe('an empty device root is a legal state', () => {
  it('generates an empty registry rather than failing', () => {
    const root = tempRoot()
    expect(runGen(['--root', root]).status).toBe(0)
    const generated = readFileSync(join(root, GENERATED_BASENAME), 'utf8')
    expect(generated).toContain('export const DEVICES: readonly Device[] = []')
  })
})

describe('the committed registry', () => {
  it('lists exactly the device folders on disk, in order', () => {
    const generated = readFileSync(join(REAL_DEVICES_ROOT, GENERATED_BASENAME), 'utf8')
    const listed = [...generated.matchAll(/from '\.\/(.+?)\/index'/g)].map((m) => m[1])
    expect(listed).toEqual(listDeviceFolders(REAL_DEVICES_ROOT))
  })

  // §10. The schema already requires a span; what it cannot require is that somebody looked it
  // up, in the right orientation. This is the sweep that catches a device added with a
  // plausible-looking guess.
  it('gives every device a cited panel span in a believable range (§10)', () => {
    for (const device of DEVICES) {
      expect(Number.isFinite(device.physical.panelSpanMm), device.id).toBe(true)
      // Narrower than a 2 HP blank, or wider than a large mixing desk, means somebody typed
      // inches, or centimetres, or nothing at all.
      //
      // **The ceiling was 600 until the Model 2400 landed, and 600 was a 19-inch rack plus
      // headroom.** That reference stopped bounding the library the moment it took a device that
      // is not a rack unit: the 2400 is a 22-channel desk and measures 680.5 mm across its side
      // panels, cited to a dimensioned plan view and cross-checked against the drawn aspect. The
      // bound is a slip detector, not a claim about how big hardware gets, so it moves to 1000 —
      // which still catches the order-of-magnitude typo this exists for, and the two directions
      // that produced the original number (inches read as mm, cm read as mm) are caught by the
      // floor and by a reader, not by this line.
      expect(device.physical.panelSpanMm, device.id).toBeGreaterThan(10)
      expect(device.physical.panelSpanMm, device.id).toBeLessThan(1000)
      // Provenance is mandatory and `false` is a legal, meaningful answer — but a cited width
      // must actually name something.
      const { verified } = device.physical
      if (verified !== false) expect(verified.source.trim().length, device.id).toBeGreaterThan(0)
    }
  })

  it('keeps the seed set in the span order the rack will draw them (§10)', () => {
    // A relative-width claim is only meaningful against the other panels, so assert the ordering
    // rather than only the numbers themselves: this survives a re-measurement that moves every span
    // slightly, and fails if one device is ever authored in the wrong units.
    //
    // It does *not* catch the Tracker Mini being reset to Polyend's 170 mm — that still sorts
    // below the Deluge. The per-device test in tracker-mini.test.ts is what guards the
    // orientation, and it asserts `not.toBe(170)` for exactly this reason.
    const byWidth = [...DEVICES]
      .sort((a, b) => a.physical.panelSpanMm - b.physical.panelSpanMm)
      .map((d) => d.id)
    expect(byWidth).toEqual([
      'polyend-tracker-mini',
      // Two devices at exactly 172.7 mm — both are 34 HP Eurorack. `Array.prototype.sort` is
      // stable, so the tie keeps registry order, which is folder order.
      'empress-zoia-euroburo',
      'intellijel-metropolix',
      'roland-mc-101',
      'elektron-digitakt-ii',
      // 222.3 mm — p.30's `8.75"`, the smallest of the Moogs by some way.
      'moog-minitaur',
      // 224 mm, and the closest pair in the list that is not a tie: one and seven tenths of a
      // millimetre above the Minitaur. Both are cited to their makers' own specification tables,
      // so the order is decided by the numbers.
      'roland-tr-6s',
      'zoom-livetrak-l-8',
      // 272 mm, and the only square panel in the library — p.478's `272 x 272 x 53 mm`. That is
      // why its span says less about it than most: the ordering here is by width, and this box
      // is as deep as it is wide, so it draws far taller in the rack than the four narrower
      // panels above it.
      'akai-mpc-one-g2',
      // **288 mm, and the only span in this list not cited to a page.** The OP-XY's guide
      // publishes no dimension anywhere in 135 pages, so this is teenage engineering's own
      // published figure from their product page rather than from the manual — and `Cite` has no
      // kind for a product page, only `manual` and `observed`, so `physical.verified` is `false`
      // and the rack draws it provisional. `test/rack.test.ts` names it as the one such box.
      // It is not a guess: `panel.ts` measures the p.5 drawing at 3049 x 1091 px, an aspect of
      // 2.7947 against the published 288/102's 2.8235, so the two sources agree to 1.02%.
      'teenage-engineering-op-xy',
      // 304 mm, and the closest pair in the whole list: one millimetre under the Deluge.
      // Both are cited — the T-1's to the specifications page of its documentation mirror,
      // the Deluge's to its guidebook — so the order is decided by the numbers, and the
      // T-1's is the one figure here corroborated by a drawing measured off the same page's
      // panel figure: 2.6661 against 304/114's 2.6667.
      'torso-t1',
      'synthstrom-deluge',
      // **A real tie, and the first one in this list that is not a coincidence.** The DFAM, the
      // Mother-32 and the Subharmonicon are the same 60 HP Moog enclosure — p.7 of the DFAM
      // manual calls it "an addition to the Mother-32 family", and p.9 of the Subharmonicon's
      // says "As with Mother-32 and DFAM, Subharmonicon conforms to the 60HP Eurorack format" —
      // and their three manuals print the same width in two units, 12.57 inches twice against
      // 31.93 cm. All three round to 319.3 mm, so `Array.sort`'s stability keeps registry order,
      // which is folder order.
      'moog-dfam',
      'moog-mother-32',
      'moog-subharmonicon',
      // 319.3 against the CRAVE's 320: not a tie, and seven tenths of a millimetre apart. All
      // four are cited — the three Moogs to Moog's own tables, the CRAVE's to Behringer's — so
      // the order here is decided by the numbers, and a re-measurement could swap them without
      // any citation becoming wrong.
      'behringer-crave',
      'intellijel-cascadia',
      // **358 mm, and the second span in this list with no page behind it.** Neither the Hapax
      // manual nor its Quickstart prints a dimension anywhere, so this is Squarp's own published
      // figure by way of a retailer, and `physical.verified` is `false` like the OP-XY's. Two
      // retailers disagree — 385 against 358 — and the inch conversion printed beside the second
      // settles it: 358 mm is 14.09", where 385 mm would be 15.16".
      'squarp-hapax',
      'roland-tr-8s',
      // 436 mm — p.530's `436 x 256 x 67 mm`, with the axis order printed in the row header.
      'akai-mpc-live-iii',
      'roland-tr-1000',
      // The three keyboards, and the widest things in the library that are not mixers. The
      // Subsequent 37 and the Model 2400 are within a millimetre of each other and are not a
      // tie: 680 against 680.5, so the order is decided by the numbers rather than by folder
      // order, and a re-measurement of either could legitimately swap them.
      'korg-minilogue-xd',
      // 543 mm — p.533's `543 x 488 x 94 mm`, 107 mm wider than the Live III on the row above.
      // The two MPCs are the library's clearest illustration of what this ordering is for: one
      // operating system in two chassis, and the rack shows the difference as width.
      'akai-mpc-xl',
      // 584.2 mm, and the only span in this list taken from a manufacturer's *imperial* figure
      // over the metric one printed beside it: p.54's DIMS line reads `23" (54.82cm)`, and 23"
      // is 58.42 cm. See `moog-grandmother/panel.ts` for the drawing that settles it. The
      // Subsequent 37 has the mirror-image defect and resolves the other way, which is why this
      // list is worth reading beside those two files rather than on its own.
      'moog-grandmother',
      'moog-subsequent-37',
      'tascam-model-2400',
      // 812.8 mm — a 49-key synthesiser is wider than a 24-channel mixer desk. The only Moog
      // dimension line here whose imperial and metric figures both convert cleanly, which is why
      // it needed no tie-break at all.
      'moog-matriarch',
      // 990 mm, and the widest thing in the library by 177 mm: 61 full-size keys against the
      // Matriarch's 49. From p.118's `(W x D x H): 99 x 42 x 11 (cm)`, the metric column — the
      // imperial one beside it rounds 42 cm to 17 inches, which is 43.2, so it is a conversion
      // rather than a second measurement and cannot corroborate anything. This is also the one
      // span in the list a drawing checks independently: `moog-muse/panel.ts` measures the
      // keyboard at 23.07 mm per white key across 36 of them, which is a full-size key and could
      // only come out right if 99 cm is the width.
      'moog-muse',
    ])
  })
})

/**
 * Invariant 2/#196. **Which device folders import a sibling, pinned.**
 *
 * Sibling imports are allowed — three MPCs share one manual, and three copies of twenty recipes
 * would drift with one of them corrected. What is not allowed is one appearing without anybody
 * deciding. Two sessions under time pressure each added one, and until this nothing recorded that
 * `akai-mpc-live-iii` had become load-bearing for two other devices: restructuring it breaks them,
 * and the only warning was a build error after the fact.
 *
 * The list is the record. Adding an import fails here, and whoever updates it states in the commit
 * why the sibling is the right source and what makes the break loud — `shared()` on the XL,
 * `pageInV39` on the One G2, both of which throw rather than silently drift.
 */
describe('cross-device imports are declared (invariant 2/#196)', () => {
  it('names every folder that imports another, and what it imports', async () => {
    const { readFileSync, readdirSync } = await import('node:fs')
    const root = 'lib/devices'
    const found: string[] = []
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      let text: string
      try {
        text = readFileSync(`${root}/${entry.name}/index.ts`, 'utf8')
      } catch {
        continue
      }
      for (const m of text.matchAll(/from '\.\.\/([a-z0-9-]+)\/index'/g)) {
        found.push(`${entry.name} -> ${m[1] ?? ''}`)
      }
    }
    expect(found.sort()).toEqual([
      'akai-mpc-one-g2 -> akai-mpc-live-iii',
      'akai-mpc-xl -> akai-mpc-live-iii',
    ])
  })
})
