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
      'zoom-livetrak-l-8',
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
      'roland-tr-8s',
      'roland-tr-1000',
      // The three keyboards, and the widest things in the library that are not mixers. The
      // Subsequent 37 and the Model 2400 are within a millimetre of each other and are not a
      // tie: 680 against 680.5, so the order is decided by the numbers rather than by folder
      // order, and a re-measurement of either could legitimately swap them.
      'korg-minilogue-xd',
      // 584.2 mm, and the only span in this list taken from a manufacturer's *imperial* figure
      // over the metric one printed beside it: p.54's DIMS line reads `23" (54.82cm)`, and 23"
      // is 58.42 cm. See `moog-grandmother/panel.ts` for the drawing that settles it. The
      // Subsequent 37 has the mirror-image defect and resolves the other way, which is why this
      // list is worth reading beside those two files rather than on its own.
      'moog-grandmother',
      'moog-subsequent-37',
      'tascam-model-2400',
      // 812.8 mm, and the widest thing in the library — a 49-key synthesiser is wider than a
      // 24-channel mixer desk. The only Moog dimension line here whose imperial and metric
      // figures both convert cleanly, which is why it needed no tie-break at all.
      'moog-matriarch',
    ])
  })
})
