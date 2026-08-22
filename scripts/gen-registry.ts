/**
 * §9. `lib/devices/*` cannot be globbed at runtime in a bundled app, so the registry is
 * generated: one folder per device on disk becomes one static import in
 * `lib/devices/registry.generated.ts`.
 *
 * Two of §9's three guards live in this file:
 *  - every manifest is Zod-validated *here*, so a bad manifest fails the build, not a request
 *  - the generated text is a pure function of the folder list, so `--check` can prove the
 *    committed file is not stale and was not hand-edited (invariant 2's second half)
 *
 * The third guard is the staleness test, which drives this script through `--check`.
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { DeviceSchema, type Device } from '../lib/core/index'

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '../..')
export const DEFAULT_DEVICES_ROOT = join(REPO_ROOT, 'lib', 'devices')
export const GENERATED_BASENAME = 'registry.generated.ts'

/**
 * Invariant: no locale-dependent comparison. ICU collation varies by platform and by ambient
 * locale, so `localeCompare` here would reorder the imports on CI and silently break byte
 * identity (invariant 6).
 */
export function compareCodeUnits(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/** A manifest that failed to load or validate. Collected, not thrown one at a time. */
export type ManifestProblem = { folder: string; path: string; message: string }

export class RegistryError extends Error {
  constructor(readonly problems: ManifestProblem[]) {
    super(
      `${problems.length} manifest problem${problems.length === 1 ? '' : 's'}:\n` +
        problems.map(formatProblem).join('\n'),
    )
    this.name = 'RegistryError'
  }
}

export function formatProblem(p: ManifestProblem): string {
  return `  ${p.folder}${p.path ? ` (${p.path})` : ''}: ${p.message}`
}

/**
 * Device folder names, ordered by UTF-16 code unit.
 *
 * *Every* directory counts. There is no ignore list: a directory under `lib/devices/` that
 * the codegen skipped would be a device silently missing from the registry, which is the one
 * failure this script exists to make impossible. A directory that is not a manifest fails the
 * build loudly instead, and anything that is not a device belongs outside this tree.
 */
export function listDeviceFolders(devicesRoot: string): string[] {
  let entries
  try {
    entries = readdirSync(devicesRoot, { withFileTypes: true })
  } catch {
    // No device folders yet is a legal state: the registry is simply empty.
    return []
  }
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort(compareCodeUnits)
}

export type LoadedDevice = { folder: string; device: Device }

/**
 * Import and validate every manifest. The loader reads the *folders*, never the generated
 * file, so a stale or hand-edited registry cannot influence what validation sees.
 */
export async function loadDevices(devicesRoot: string): Promise<LoadedDevice[]> {
  const problems: ManifestProblem[] = []
  const loaded: LoadedDevice[] = []

  for (const folder of listDeviceFolders(devicesRoot)) {
    const entry = join(devicesRoot, folder, 'index.ts')
    try {
      statSync(entry)
    } catch {
      problems.push({ folder, path: '', message: 'no index.ts in this device folder' })
      continue
    }

    let mod: Record<string, unknown>
    try {
      mod = (await import(/* @vite-ignore */ pathToFileURL(entry).href)) as Record<string, unknown>
    } catch (err) {
      problems.push({ folder, path: '', message: `failed to import: ${String(err)}` })
      continue
    }

    if (!('device' in mod)) {
      problems.push({ folder, path: '', message: "index.ts must export `device`" })
      continue
    }

    const parsed = DeviceSchema.safeParse(mod['device'])
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        problems.push({ folder, path: issue.path.join('.'), message: issue.message })
      }
      continue
    }

    // The folder name is the import path and the sort key; letting it drift from the id would
    // make the registry's order and the audit's labels disagree about the same device.
    if (parsed.data.id !== folder) {
      problems.push({
        folder,
        path: 'id',
        message: `device id '${parsed.data.id}' must match its folder name`,
      })
      continue
    }

    loaded.push({ folder, device: parsed.data as Device })
  }

  // Device ids need no separate uniqueness pass: folder names are unique on a filesystem and
  // every id is checked to equal its folder above, so uniqueness comes for free.
  if (problems.length > 0) throw new RegistryError(problems)
  return loaded
}

/** `tr-1000` → `tr_1000`. Checked for collisions by the caller, not assumed unique. */
export function importIdentifier(folder: string): string {
  return `device_${folder.replace(/[^A-Za-z0-9_$]/g, '_')}`
}

/** The generated text. A pure function of the folder list — no timestamps, no environment. */
export function renderRegistry(folders: string[]): string {
  const ordered = [...folders].sort(compareCodeUnits)

  const identifiers = new Map<string, string>()
  for (const folder of ordered) {
    const ident = importIdentifier(folder)
    const clash = identifiers.get(ident)
    if (clash !== undefined) {
      throw new RegistryError([
        {
          folder,
          path: '',
          message: `import identifier '${ident}' collides with folder '${clash}'`,
        },
      ])
    }
    identifiers.set(ident, folder)
  }

  const lines: string[] = [
    '// Generated by scripts/gen-registry.ts — do not edit by hand.',
    '//',
    '// DESIGN.md §9: adding a device is one folder under lib/devices/, and this file is the',
    '// machine-written consequence. Invariant 2 holds because nothing here is authored.',
    '// Regenerate with `npm run gen:registry`; the staleness test fails if this drifts.',
    '',
    "import type { Device } from '../core/device'",
  ]

  for (const folder of ordered) {
    lines.push(`import { device as ${importIdentifier(folder)} } from './${folder}/index'`)
  }

  // House style is single quotes; JSON.stringify is the fallback for a name that needs escaping.
  const quote = (s: string): string => (/^[A-Za-z0-9._-]+$/.test(s) ? `'${s}'` : JSON.stringify(s))

  const array = (items: string[]): string[] =>
    items.length === 0 ? ['[]'] : ['[', ...items.map((item) => `  ${item},`), ']']

  const assign = (decl: string, items: string[]): string[] => {
    const body = array(items)
    return [`${decl} = ${body[0]}`, ...body.slice(1)]
  }

  lines.push(
    '',
    '/** Every device manifest, ordered by folder name (UTF-16 code unit). */',
    ...assign(
      'export const DEVICES: readonly Device[]',
      ordered.map((folder) => importIdentifier(folder)),
    ),
    '',
    '/** Folder names, in the same order. Useful for error messages that name a source. */',
    ...assign(
      'export const DEVICE_FOLDERS: readonly string[]',
      ordered.map((folder) => quote(folder)),
    ),
    '',
  )

  return lines.join('\n')
}

/** Validate every manifest, then render. Throws `RegistryError` if any manifest is bad. */
export async function generate(devicesRoot: string): Promise<string> {
  const loaded = await loadDevices(devicesRoot)
  return renderRegistry(loaded.map((l) => l.folder))
}

function readIfPresent(path: string): string | undefined {
  try {
    return readFileSync(path, 'utf8')
  } catch {
    return undefined
  }
}

export type CliOptions = { devicesRoot: string; out: string; check: boolean }

export function parseArgs(argv: string[]): CliOptions {
  let devicesRoot = DEFAULT_DEVICES_ROOT
  let out: string | undefined
  let check = false

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--check') check = true
    else if (arg === '--root') devicesRoot = resolve(argv[++i] ?? '')
    else if (arg === '--out') out = resolve(argv[++i] ?? '')
    else throw new Error(`unknown argument '${arg}'`)
  }

  return { devicesRoot, out: out ?? join(devicesRoot, GENERATED_BASENAME), check }
}

async function main(argv: string[]): Promise<number> {
  let options: CliOptions
  try {
    options = parseArgs(argv)
  } catch (err) {
    process.stderr.write(`gen-registry: ${err instanceof Error ? err.message : String(err)}\n`)
    return 2
  }

  let generated: string
  try {
    generated = await generate(options.devicesRoot)
  } catch (err) {
    if (err instanceof RegistryError) {
      process.stderr.write(`gen-registry: ${err.problems.length} manifest problem(s)\n`)
      for (const p of err.problems) process.stderr.write(`${formatProblem(p)}\n`)
    } else {
      process.stderr.write(`gen-registry: ${err instanceof Error ? err.message : String(err)}\n`)
    }
    return 1
  }

  const existing = readIfPresent(options.out)
  const rel = relative(process.cwd(), options.out)

  if (options.check) {
    if (existing === generated) {
      process.stdout.write(`gen-registry: ${rel} is up to date\n`)
      return 0
    }
    process.stderr.write(
      existing === undefined
        ? `gen-registry: ${rel} is missing; run \`npm run gen:registry\`\n`
        : `gen-registry: ${rel} is stale or hand-edited; run \`npm run gen:registry\`\n`,
    )
    return 1
  }

  if (existing === generated) {
    process.stdout.write(`gen-registry: ${rel} unchanged\n`)
    return 0
  }

  writeFileSync(options.out, generated, 'utf8')
  process.stdout.write(`gen-registry: wrote ${rel}\n`)
  return 0
}

const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href

if (invokedDirectly) process.exit(await main(process.argv.slice(2)))
