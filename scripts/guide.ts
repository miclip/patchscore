/**
 * `npm run guide` — §8's guide for a rig, on stdout.
 *
 * The site renders the same document through `lib/studio`; this is the same pipeline with the
 * browser taken out, for the cases a page cannot serve: diffing two seeds, piping a guide into
 * a pager or a file, and reading a rig's output without starting Next. It calls `resolve` and
 * `renderGuide` directly rather than going through `resolveEntry`, because the entry point's job
 * is decoding permalinks and applying inspirations — neither of which a `--devices`/`--template`
 * invocation has.
 *
 * Four decisions are load-bearing, and each of them fails quietly rather than loudly:
 *
 * - **stdout is the guide and nothing else.** Not one added byte: `renderGuide` already ends in a
 *   single newline, so `npm run guide -- … > guide.md` is byte-comparable with `test/golden/*.md`
 *   and with a second run of the same arguments (invariant 6). Everything a human might want to
 *   read *about* the run — the seed in particular, which is derived and otherwise invisible —
 *   goes to stderr, where a pipe never sees it. npm's own `> patchscore@… guide` banner would
 *   otherwise land on stdout in front of the first heading; the project `.npmrc` sets
 *   `loglevel=silent` so the literal command in the usage line is the one that redirects
 *   cleanly, rather than a `--silent` nobody remembers until the bytes are already wrong.
 * - **Device order on the command line does not matter.** A rig is a set — `lib/studio/session.ts`
 *   says the same thing about the permalink — so the ids are looked up in registry order and
 *   deduplicated. Otherwise `--devices a,b` and `--devices b,a` would be two rigs with two
 *   guides, for a difference nobody typed on purpose.
 * - **The default seed is `derivedSeed`.** The same rig asked for on the command line and in the
 *   browser then answers with the same guide. A hardcoded default (or worse, a clock-derived one)
 *   would make the CLI a second source of truth for "the guide for this rig".
 * - **Mood is neutral unless asked for.** `--mood` takes §6's five axes by name in one flag —
 *   `--mood darkness=40,grit=65` — and every axis left out stays at 50, so omitting the flag
 *   entirely renders exactly what it rendered before the flag existed: §6.1's offset is zero and
 *   what prints is what the recipes author. One flag rather than five, because five would be §6's
 *   interface rebuilt in argv, and a partial `MoodState` is the one thing §6 forbids — the axes
 *   are always all five, the flag only says which of them moved.
 *
 *   Mood is **not** in the default seed, deliberately, and `lib/studio/session.ts` gives the
 *   reason: a knob that rerolled the guide underneath it would be doing the reroll button's job.
 *   So `--mood` moves values within a guide and never moves which guide it is.
 *
 * `runGuide` returns the streams and the exit code instead of writing them, so the tests can
 * assert bytes and failures in-process. The `main` guard at the bottom is the only thing that
 * touches the real process.
 */

import { pathToFileURL } from 'node:url'
import {
  MOOD_AXES,
  SEED_MAX,
  SEED_MIN,
  compareCodeUnits,
  moodState,
  renderGuide,
  resolve,
  type Device,
  type MoodAxis,
  type MoodState,
  type Template,
} from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES, templateById } from '../lib/templates/index'
import { derivedSeed } from '../lib/studio/session'

const USAGE = [
  'usage: npm run guide -- --devices <id,id,…> --template <id> [--seed <n>]',
  '                        [--mood darkness=40,density=87,grit=65,swing=50,space=70]',
].join('\n')

/**
 * Every name the CLI accepts, on every failure — the registries' ids and §6's axes both, rather
 * than only the list the failing flag happens to be about. A reader who mistyped one flag is a
 * reader about to type the next one, and three lines of stderr is cheaper than a second run.
 */
function knownIds(): string {
  const devices = DEVICES.map((d) => d.id).join(', ')
  const templates = TEMPLATES.map((t) => t.id).join(', ')
  return `known devices: ${devices}\nknown templates: ${templates}\nmood axes: ${MOOD_AXES.join(', ')}`
}

export type GuideRun = {
  /** 0 on success, 2 for anything the caller typed wrong. Never 1: there is no third outcome. */
  code: number
  /** The rendered guide, verbatim, or empty on failure — a partial guide is worse than none. */
  stdout: string
  stderr: string
}

type Parsed =
  | { ok: true; devices: readonly Device[]; template: Template; seed: number; mood: MoodState }
  | { ok: false; message: string }

function fail(message: string): Parsed {
  return { ok: false, message: `guide: ${message}\n${USAGE}\n${knownIds()}\n` }
}

/**
 * `--flag value` and `--flag=value` both, because a comma-separated list is long enough that
 * people reach for the equals form, and a parser that silently accepted one and dropped the
 * other would look like an unknown-id error.
 */
function readFlags(argv: readonly string[]): { flags: Map<string, string> } | { error: string } {
  const flags = new Map<string, string>()
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i] as string
    if (!token.startsWith('--')) return { error: `unexpected argument "${token}"` }
    const eq = token.indexOf('=')
    const name = eq === -1 ? token.slice(2) : token.slice(2, eq)
    if (!['devices', 'template', 'seed', 'mood'].includes(name)) {
      return { error: `unknown flag "--${name}"` }
    }
    if (flags.has(name)) return { error: `--${name} given twice` }
    if (eq !== -1) {
      flags.set(name, token.slice(eq + 1))
      continue
    }
    const value = argv[i + 1]
    if (value === undefined || value.startsWith('--')) return { error: `--${name} needs a value` }
    flags.set(name, value)
    i++
  }
  return { flags }
}

/**
 * `darkness=40,grit=65` → a full `MoodState` with those two moved and the other three at 50.
 *
 * Every axis is validated against `MOOD_AXES` rather than against `MoodStateSchema`, because the
 * error a mistyped axis deserves names the five that exist — a schema rejection would say the
 * object is wrong without saying which word was. A repeated axis is an error rather than
 * last-one-wins: `--mood grit=20,grit=80` is a person who does not know what they asked for, and
 * silently answering one of the two is the failure this whole file is written to avoid.
 *
 * Whole numbers only. §6's knobs are 0-100 and `MoodStateSchema` would accept 62.5, but §7.2
 * bans float from the seeded stream and §6.1's arithmetic is integer throughout — a fractional
 * knob would be a value with no way to reach it from the UI and no way to say it in a permalink.
 *
 * Density is the one axis that is not continuous in effect: `densityShift` quantises it into
 * three zones, so `density=80` and `density=100` are the same guide. That is §6.3's design, not
 * a rounding here, and `DENSITY_DETENTS` (12, 50, 87) is what the UI produces for the three.
 */
function parseMood(raw: string): { mood: MoodState } | { error: string } {
  const over: Partial<MoodState> = {}
  for (const entry of raw.split(',')) {
    const eq = entry.indexOf('=')
    if (eq === -1) return { error: `--mood wants axis=value pairs, got "${entry}"` }
    const axis = entry.slice(0, eq)
    const value = entry.slice(eq + 1)
    if (!(MOOD_AXES as readonly string[]).includes(axis)) {
      return { error: `unknown mood axis "${axis}"` }
    }
    const key = axis as MoodAxis
    if (over[key] !== undefined) return { error: `--mood sets ${axis} twice` }
    if (!/^[0-9]+$/.test(value)) {
      return { error: `--mood ${axis} must be a whole number 0-100, got "${value}"` }
    }
    const n = Number(value)
    if (n > 100) return { error: `--mood ${axis} must be a whole number 0-100, got "${value}"` }
    over[key] = n
  }
  // Always all five (§6): the flag says which axes moved, never which axes exist.
  return { mood: moodState(over) }
}

function parseArgs(argv: readonly string[]): Parsed {
  const read = readFlags(argv)
  if ('error' in read) return fail(read.error)
  const { flags } = read

  const deviceList = flags.get('devices')
  const templateId = flags.get('template')
  if (deviceList === undefined) return fail('--devices is required')
  if (templateId === undefined) return fail('--template is required')

  // An empty entry is a typo — a trailing comma, or `--devices ""` — and reporting it as an
  // unknown id names the mistake better than silently resolving a smaller rig would.
  const wanted = deviceList.split(',')
  const unknown = wanted.filter((id) => !DEVICES.some((d) => d.id === id))
  if (unknown.length > 0) {
    const quoted = [...new Set(unknown)].sort(compareCodeUnits).map((id) => `"${id}"`)
    return fail(`unknown device id ${quoted.join(', ')}`)
  }
  // Registry order, deduplicated: see the header on why the typed order carries no information.
  const devices = DEVICES.filter((d) => wanted.includes(d.id))

  const template = templateById(templateId)
  if (template === undefined) return fail(`unknown template id "${templateId}"`)

  // §6's neutral is the whole state at 50, which is what `moodState()` with no argument is —
  // so an absent flag is not a special case, it is the empty set of overrides.
  const moodRaw = flags.get('mood')
  let mood = moodState()
  if (moodRaw !== undefined) {
    const parsed = parseMood(moodRaw)
    if ('error' in parsed) return fail(parsed.error)
    mood = parsed.mood
  }

  const raw = flags.get('seed')
  if (raw === undefined) {
    const seed = derivedSeed(
      devices.map((d) => d.id),
      template.id,
    )
    return { ok: true, devices, template, seed, mood }
  }
  // The seed field's domain, shared with the permalink validator (`lib/core/permalink.ts`): a
  // CLI that accepted a seed the app could not encode would mint guides with no shareable link.
  if (!/^[0-9]+$/.test(raw)) return fail(`--seed must be a whole number, got "${raw}"`)
  const seed = Number(raw)
  if (seed < SEED_MIN || seed > SEED_MAX) {
    return fail(`--seed must be ${SEED_MIN}-${SEED_MAX}, got "${raw}"`)
  }
  return { ok: true, devices, template, seed, mood }
}

export function runGuide(argv: readonly string[]): GuideRun {
  const parsed = parseArgs(argv)
  if (!parsed.ok) return { code: 2, stdout: '', stderr: parsed.message }

  const { devices, template, seed, mood } = parsed
  const result = resolve({ devices, template, mood, seed })
  // On stderr, because the derived default is otherwise invisible: a reader who wants to reroll
  // needs to know which seed produced what they are holding. Keeping it off stdout is what lets
  // the guide stay byte-comparable with a golden file.
  //
  // Only the axes that moved, and nothing at all when none did — a run that says `mood: neutral`
  // reads as a setting chosen, when it is the absence of one.
  const moved = MOOD_AXES.filter((axis) => mood[axis] !== 50).map((a) => `${a}=${mood[a]}`)
  const moodNote = moved.length === 0 ? '' : ` · mood ${moved.join(',')}`
  const note = `guide: ${template.id} · ${devices.length} device(s) · seed ${seed}${moodNote}\n`
  return { code: 0, stdout: renderGuide(result), stderr: note }
}

const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href

if (invokedDirectly) {
  const run = runGuide(process.argv.slice(2))
  if (run.stdout !== '') process.stdout.write(run.stdout)
  if (run.stderr !== '') process.stderr.write(run.stderr)
  process.exit(run.code)
}
