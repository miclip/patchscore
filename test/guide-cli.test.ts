import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { MOOD_AXES, moodState, renderGuide, resolve } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { droneStudy, industrialTechno } from '../lib/templates/index'
import { derivedSeed } from '../lib/studio/session'
import { runGuide } from '../scripts/guide'

/**
 * `npm run guide` has exactly two obligations and they are the two tested here.
 *
 * **Its stdout is the guide, byte for byte.** Invariant 6 is about the resolver, but a CLI that
 * prefixed a banner, appended a newline or echoed the seed onto stdout would break every use the
 * command exists for — diffing two seeds, piping to a file, comparing against `test/golden/*.md`
 * — without breaking a single resolver test. So the assertions compare against
 * `renderGuide(resolve(...))` directly rather than against a stored string: a rendering change
 * moves both sides, a *plumbing* change moves only one.
 *
 * **Every bad id is loud.** Invariant 5's honesty rule is about gaps in a guide, not about
 * silence in a tool, and the failure mode being guarded is the quiet one: a mistyped device id
 * resolving a smaller rig and printing a guide full of gaps that the reader takes for the truth
 * about the boxes they own. Nonzero exit, nothing on stdout, and the known ids listed.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(HERE, '..')
const TSX = join(REPO_ROOT, 'node_modules', '.bin', 'tsx')
const CLI = join(REPO_ROOT, 'scripts', 'guide.ts')

const NPM = process.platform === 'win32' ? 'npm.cmd' : 'npm'

const RIG = ['polyend-tracker-mini', 'roland-tr-1000'] as const
const TEMPLATE = 'industrial-techno'

/** The same rig, resolved the way the site resolves it. Neutral unless a test says otherwise. */
function expected(seed: number, mood = moodState()): string {
  const devices = DEVICES.filter((d) => (RIG as readonly string[]).includes(d.id))
  return renderGuide(resolve({ devices, template: industrialTechno, mood, seed }))
}

describe('stdout is the guide and nothing else', () => {
  it('renders the same bytes the pipeline renders for the same seed', () => {
    const run = runGuide(['--devices', RIG.join(','), '--template', TEMPLATE, '--seed', '18'])
    expect(run.code).toBe(0)
    expect(run.stdout).toBe(expected(18))
  })

  it('defaults the seed to derivedSeed, so the CLI and a permalink agree on one guide', () => {
    const derived = derivedSeed([...RIG], TEMPLATE)
    const withDefault = runGuide(['--devices', RIG.join(','), '--template', TEMPLATE])
    const withExplicit = runGuide([
      '--devices',
      RIG.join(','),
      '--template',
      TEMPLATE,
      '--seed',
      String(derived),
    ])
    expect(withDefault.stdout).toBe(expected(derived))
    expect(withDefault.stdout).toBe(withExplicit.stdout)
    // And the derived default is not a constant that happens to match: a different rig moves it.
    expect(runGuide(['--devices', 'roland-tr-1000', '--template', TEMPLATE]).stdout).not.toBe(
      withDefault.stdout,
    )
  })

  it('is byte-identical across two runs of the same arguments', () => {
    const argv = ['--devices', RIG.join(','), '--template', TEMPLATE]
    expect(runGuide(argv).stdout).toBe(runGuide(argv).stdout)
  })

  it('treats the rig as a set: typed order and repeats change nothing', () => {
    const straight = runGuide(['--devices', RIG.join(','), '--template', TEMPLATE])
    const reversed = runGuide(['--devices', [...RIG].reverse().join(','), '--template', TEMPLATE])
    const repeated = runGuide([`--devices=${RIG[0]},${RIG[1]},${RIG[0]}`, `--template=${TEMPLATE}`])
    expect(reversed.stdout).toBe(straight.stdout)
    expect(repeated.stdout).toBe(straight.stdout)
  })

  it('keeps the seed note off stdout', () => {
    const run = runGuide(['--devices', RIG.join(','), '--template', TEMPLATE, '--seed', '18'])
    expect(run.stderr).toContain('seed 18')
    expect(run.stdout).not.toContain('seed 18')
    // No wrapper bytes at either end: exactly what `renderGuide` produced.
    expect(run.stdout.startsWith('# ')).toBe(true)
    expect(run.stdout.endsWith('\n')).toBe(true)
    expect(run.stdout.endsWith('\n\n')).toBe(false)
  })

  it('survives npm: the literal documented command puts no banner in front of the guide', () => {
    // npm writes its own `> patchscore@0.1.0 guide` line to **stdout**, not stderr, so before
    // the project `.npmrc` set `loglevel=silent` the documented command produced a file with two
    // lines of npm ahead of §8's first heading. Nothing in `runGuide` can see that — the bytes
    // are added outside the process — so the only test that catches a regression here is one
    // that goes through npm exactly as the usage line tells a reader to.
    const devices = DEVICES.filter((d) => d.id === 'synthstrom-deluge')
    const seed = derivedSeed(['synthstrom-deluge'], 'drone-study')
    const guide = renderGuide(
      resolve({ devices, template: droneStudy, mood: moodState(), seed }),
    )
    const child = spawnSync(
      NPM,
      ['run', 'guide', '--', '--devices', 'synthstrom-deluge', '--template', 'drone-study'],
      { encoding: 'utf8', cwd: REPO_ROOT },
    )
    expect(child.error).toBeUndefined()
    expect(child.status, child.stderr).toBe(0)
    expect(child.stdout.startsWith('# Drone Study')).toBe(true)
    expect(child.stdout).toBe(guide)
  })

  it('writes those bytes through the real process, not only through runGuide', () => {
    // The one subprocess here: `runGuide` being pure is what makes the rest of this file fast,
    // and it is also what would let a broken `main` guard — a missing write, an added newline,
    // a swallowed exit code — pass every test above.
    const child = spawnSync(TSX, [CLI, '--devices', RIG.join(','), '--template', TEMPLATE], {
      encoding: 'utf8',
      cwd: REPO_ROOT,
    })
    expect(child.error).toBeUndefined()
    expect(child.status, child.stderr).toBe(0)
    expect(child.stdout).toBe(expected(derivedSeed([...RIG], TEMPLATE)))
  })
})

describe('mood is optional, and neutral when it is not asked for (§6)', () => {
  const neutral = ['--devices', RIG.join(','), '--template', TEMPLATE, '--seed', '18']

  it('renders exactly the neutral bytes when the flag is absent', () => {
    // The compatibility guarantee: adding the flag moved nothing for anyone not using it, and
    // `test/golden/*.md` are rendered at neutral too.
    expect(runGuide(neutral).stdout).toBe(expected(18))
  })

  it('treats every axis spelled out at 50 as the same thing as no flag at all', () => {
    const spelled = MOOD_AXES.map((axis) => `${axis}=50`).join(',')
    expect(runGuide([...neutral, '--mood', spelled]).stdout).toBe(runGuide(neutral).stdout)
  })

  it('leaves the axes it was not given at neutral', () => {
    // The property that makes a partial flag safe: `--mood grit=65` must equal a full state with
    // grit at 65 and everything else at 50, not a state where the absent four are anything else.
    const partial = runGuide([...neutral, '--mood', 'grit=65'])
    expect(partial.code).toBe(0)
    expect(partial.stdout).toBe(expected(18, moodState({ grit: 65 })))
  })

  it('actually moves values, or the flag is doing nothing', () => {
    // A guard against the flag being parsed and then dropped: §6.1's offset has to reach §8, and
    // `derived by`/`52 → 45` is the only way it shows up in the rendered page.
    const moved = runGuide([...neutral, '--mood', 'darkness=10,grit=90'])
    expect(moved.stdout).not.toBe(expected(18))
    expect(moved.stdout).toContain('moved by')
  })

  it('does not let mood move which guide it is (§7.2, lib/studio/session.ts)', () => {
    // Mood is deliberately absent from `derivedSeed`: a knob must not reroll the guide under the
    // hand turning it. Same rig, same template, no --seed — same key, same assignments.
    const plain = runGuide(['--devices', RIG.join(','), '--template', TEMPLATE])
    const moody = runGuide(['--devices', RIG.join(','), '--template', TEMPLATE, '--mood', 'space=90'])
    const keyOf = (doc: string) => doc.split('\n').find((l) => l.startsWith('- **Key**'))
    expect(keyOf(moody.stdout)).toBe(keyOf(plain.stdout))
    expect(keyOf(plain.stdout)).toBeDefined()
  })

  it('reports only the axes that moved, and nothing when none did', () => {
    expect(runGuide(neutral).stderr).not.toContain('mood')
    expect(runGuide([...neutral, '--mood', 'grit=65']).stderr).toContain('mood grit=65')
    // Not the four it was not given: a note listing five axes for a flag that named one is a
    // note nobody can scan.
    expect(runGuide([...neutral, '--mood', 'grit=65']).stderr).not.toContain('darkness')
  })
})

describe('a bad id fails loudly', () => {
  const cases = [
    { what: 'an unknown device id', argv: ['--devices', 'roland-tr-9000', '--template', TEMPLATE] },
    {
      what: 'one unknown device among known ones',
      argv: ['--devices', `${RIG[0]},nope`, '--template', TEMPLATE],
    },
    { what: 'an empty device list', argv: ['--devices', '', '--template', TEMPLATE] },
    { what: 'an unknown template id', argv: ['--devices', RIG[0], '--template', 'gabber'] },
    { what: 'a missing --devices', argv: ['--template', TEMPLATE] },
    { what: 'a missing --template', argv: ['--devices', RIG[0]] },
    { what: 'a --devices with no value', argv: ['--devices', '--template', TEMPLATE] },
    { what: 'an unknown flag', argv: ['--devices', RIG[0], '--template', TEMPLATE, '--vibe', '80'] },
    {
      what: 'an unknown mood axis',
      argv: ['--devices', RIG[0], '--template', TEMPLATE, '--mood', 'gloom=40'],
    },
    {
      what: 'a mood axis set twice',
      argv: ['--devices', RIG[0], '--template', TEMPLATE, '--mood', 'grit=20,grit=80'],
    },
    {
      what: 'a mood value above 100',
      argv: ['--devices', RIG[0], '--template', TEMPLATE, '--mood', 'grit=101'],
    },
    {
      what: 'a fractional mood value',
      argv: ['--devices', RIG[0], '--template', TEMPLATE, '--mood', 'grit=62.5'],
    },
    {
      what: 'a negative mood value',
      argv: ['--devices', RIG[0], '--template', TEMPLATE, '--mood', 'grit=-1'],
    },
    { what: 'a mood pair with no =', argv: ['--devices', RIG[0], '--template', TEMPLATE, '--mood', 'grit'] },
    {
      what: 'a mood pair with no value',
      argv: ['--devices', RIG[0], '--template', TEMPLATE, '--mood', 'grit='],
    },
    { what: 'an empty --mood', argv: ['--devices', RIG[0], '--template', TEMPLATE, '--mood', ''] },
    { what: 'a stray positional', argv: ['industrial-techno'] },
    { what: 'a non-numeric seed', argv: ['--devices', RIG[0], '--template', TEMPLATE, '--seed', 'x'] },
    {
      what: 'a seed outside the permalink domain',
      argv: ['--devices', RIG[0], '--template', TEMPLATE, '--seed', '1000000000'],
    },
    { what: 'a negative seed', argv: ['--devices', RIG[0], '--template', TEMPLATE, '--seed', '-1'] },
  ] as const

  for (const { what, argv } of cases) {
    it(`exits nonzero and prints nothing on stdout for ${what}`, () => {
      const run = runGuide([...argv])
      expect(run.code).not.toBe(0)
      expect(run.stdout).toBe('')
      expect(run.stderr).toMatch(/^guide: /)
    })
  }

  it('names the offending id and lists what it could have been', () => {
    const run = runGuide(['--devices', 'roland-tr-9000', '--template', TEMPLATE])
    expect(run.stderr).toContain('"roland-tr-9000"')
    expect(run.stderr).toContain('roland-tr-1000')
    expect(run.stderr).toContain('known templates:')
    expect(run.stderr).toContain(TEMPLATE)
  })

  it('lists the mood axes too, whatever the failure was about', () => {
    // A reader who mistyped one flag is about to type the next one, so every failure carries
    // every name the CLI accepts rather than only the list the failing flag was about.
    for (const argv of [
      ['--devices', 'roland-tr-9000', '--template', TEMPLATE],
      ['--devices', RIG[0], '--template', TEMPLATE, '--mood', 'gloom=40'],
    ]) {
      const run = runGuide(argv)
      expect(run.stderr).toContain('mood axes:')
      for (const axis of MOOD_AXES) expect(run.stderr).toContain(axis)
    }
  })

  it('lists every unknown id, so a second run is not a second guess', () => {
    const run = runGuide(['--devices', 'aaa,bbb', '--template', TEMPLATE])
    expect(run.stderr).toContain('"aaa"')
    expect(run.stderr).toContain('"bbb"')
  })

  it('carries the nonzero status out of the real process', () => {
    const child = spawnSync(TSX, [CLI, '--devices', 'roland-tr-9000', '--template', TEMPLATE], {
      encoding: 'utf8',
      cwd: REPO_ROOT,
    })
    expect(child.error).toBeUndefined()
    expect(child.status).not.toBe(0)
    expect(child.stdout).toBe('')
    expect(child.stderr).toContain('unknown device id')
  })
})
