import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { GUIDE_PHASES, resolveRiff } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { RIFFS, blueMondayBass } from '../lib/riffs'
import { renderRiff } from '../lib/studio/riff-markdown'
import { RIFF_NAMES, riffPath, riffText } from './golden/riffs'

/**
 * §5A. **A riff page's Markdown**, pinned as bytes and checked for the things bytes alone do not
 * say out loud: that the technique is printed as prose, that the notes and the grid are both
 * there with one sentence saying how they relate, that a rig which cannot play the figure is told
 * so rather than shown a guess, and that nothing belonging to a *song* reached the page.
 *
 * Regenerate the fixtures with `npm run gen:riffs` and read the diff. Never regenerate one to
 * make a test pass.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(HERE, '..')
const TSX = join(REPO_ROOT, 'node_modules', '.bin', 'tsx')
const GENERATOR = join(HERE, 'golden', 'riffs.ts')

// The ICU trap `determinism.test.ts`, `guide-golden.test.ts` and `kit-golden.test.ts` all use:
// Node reads LANG/LC_ALL to pick its default locale, so a `localeCompare`, a `toLocaleString` or
// a `toLocaleUpperCase` that reached this renderer would genuinely answer differently under it.
const HOSTILE_LOCALE = 'tr_TR.UTF-8'

const PLAYED = riffText('blue-monday-bass')
const SAMPLED = riffText('bass-on-a-sampler')
const GAPPED = riffText('organ-stab-mono')
const STACKED = riffText('organ-stab-stacked')
const LINES = PLAYED.split('\n')

describe('riff fixtures (§5A, invariant 6)', () => {
  for (const name of RIFF_NAMES) {
    describe(name, () => {
      it('matches the committed bytes exactly', () => {
        expect(riffText(name)).toBe(readFileSync(riffPath(name), 'utf8'))
      })

      it('renders the same bytes twice in one process', () => {
        expect(riffText(name)).toBe(riffText(name))
      })

      it('is byte-identical under a non-C LANG', () => {
        const child = spawnSync(TSX, [GENERATOR, name], {
          encoding: 'utf8',
          cwd: REPO_ROOT,
          env: { ...process.env, LANG: HOSTILE_LOCALE, LC_ALL: HOSTILE_LOCALE },
        })
        expect(child.error).toBeUndefined()
        expect(child.status, child.stderr).toBe(0)
        expect(child.stdout).toBe(readFileSync(riffPath(name), 'utf8'))
      })
    })
  }

  it('actually runs the child in the hostile locale, or it proves nothing', () => {
    // Without this, a Node that ignored LANG would make the test above compare two runs of the
    // same locale and pass whatever the renderer did.
    const probe = spawnSync(
      process.execPath,
      ['-e', 'process.stdout.write(Intl.DateTimeFormat().resolvedOptions().locale)'],
      { encoding: 'utf8', env: { ...process.env, LANG: HOSTILE_LOCALE, LC_ALL: HOSTILE_LOCALE } },
    )
    expect(probe.stdout).toBe('tr-TR')
  })

  it('has something in it a hostile locale could break', () => {
    /**
     * The locale test is only a test if the document contains something ICU would move, and this
     * page's traps are not the kit's. It upper-cases nothing, so the trap here is **grouping**:
     * `toLocaleString` on a four-digit bound writes `10.000` under tr-TR, where §7.2's `num` —
     * which is `String(value)` and nothing else — writes `10000`.
     *
     * Both halves are asserted. A fixture with no large number in it would make the byte
     * comparison above vacuous whatever the renderer did.
     */
    expect(/\b\d{4,}\b/.test(PLAYED), 'no four-digit number to group').toBe(true)
    expect(PLAYED).toContain('10000')
    expect(PLAYED).not.toMatch(/\b10[.,]000\b/)
    // And the kit's own trap, checked because it costs a line: a Turkish upper case anywhere.
    expect(
      /[İı]/.test(PLAYED + SAMPLED + GAPPED + STACKED),
      'a Turkish upper case reached the fixture',
    ).toBe(false)
  })
})

describe('what a riff page prints', () => {
  it('opens with the riff’s name and what the figure is', () => {
    expect(LINES[0]).toBe('# The Blue Monday bass')
    expect(LINES[2]).toBe('`bass-mid` · `hard` · 128 BPM (118–134) · F minor · 2 bars · 32 steps')
    // §5A.5. The lead is followed by the technique, with no subtitle between them: the record is
    // named in the title, and a line repeating it with a disclaimer attached was cut.
    expect(LINES[4]).toBe('## The technique')
    expect(PLAYED).not.toContain('not a transcription')
  })

  it('prints the technique as prose, one paragraph per authored string', () => {
    const start = LINES.indexOf('## The technique')
    expect(start).toBeGreaterThan(0)
    const body = LINES.slice(start + 2, LINES.indexOf('## The notes') - 1).filter((l) => l !== '')
    expect(body).toEqual(blueMondayBass.technique)
  })

  it('prints the notes with spelling, degree and MIDI — #32’s two representations', () => {
    expect(PLAYED).toContain('2 bars in F minor.')
    expect(PLAYED).toContain('- step 1 · `F2` · degree 1 · MIDI 41 · in force 16 steps')
  })

  it('prints the grid, and says once what it is for beside a hook (#100/§4.3)', () => {
    expect(PLAYED).toContain('## The grid')
    expect(PLAYED).toContain('strikes the note in force at that point')
    // Sixteen to a row, in groups of four, with the row's first step in the gutter.
    expect(PLAYED).toContain('\n 1 xxxx xxxx xxxx xxxx\n17 xxxx xxxx xxxx xxxx\n')
    expect(PLAYED).toContain('- `accent` · 1')
  })

  it('names the box and the voice, and ends the block with one citation sentence', () => {
    expect(PLAYED).toContain('**Subsequent 37 · Voice**')
    const cites = LINES.filter((line) => line.startsWith('*This block draws on'))
    expect(cites.length).toBe(1)
  })

  /**
   * Invariant 4 in ink. A guide renders no provenance mark and no per-value citation, and this
   * page reads beside a guide — so it renders neither either. The evidence is still on every
   * `ResolvedParam`; what is banned is printing it per line.
   */
  it('marks no value with its provenance and cites no page beside one', () => {
    const values = LINES.filter((line) => line.trimStart().startsWith('- **'))
    expect(values.length).toBeGreaterThan(0)
    for (const line of values) {
      expect(line).not.toContain(' · manual')
      expect(line).not.toContain(' · observed')
      expect(line).not.toContain(' · provisional')
      expect(line).not.toMatch(/\bpp?\.\s*\d/)
    }
  })

  /**
   * §5A. **Nothing belonging to a song reached the page.** This is the assertion that keeps a riff
   * from quietly becoming a `Template` with one request — the moment a renderer reaches for a
   * section, a phase or a clock, it needs a song to get it from, and the concept has collapsed.
   */
  it('prints no song: no phases, no sections, no arrangement, no clock, no mood', () => {
    for (const phase of GUIDE_PHASES) {
      expect(PLAYED, phase).not.toContain(`## ${phase}`)
    }
    for (const word of ['Arrangement', 'Clock source', 'Section', 'Density', 'Mood', 'seed']) {
      expect(PLAYED, word).not.toContain(word)
    }
  })

  it('tells a rig that cannot play the figure what is wrong, and names the boxes', () => {
    expect(GAPPED).toContain('## Where it plays')
    expect(GAPPED).toContain('This figure needs 3 notes at once.')
    expect(GAPPED).toContain('Every voice here that plays it sounds one note')
    // What to do about it, which is the only part of a gap a reader can act on.
    expect(GAPPED).toContain('Add a box with more voices')
    // Never the boxes' folder ids — a reader is looking at a name printed on a panel.
    expect(GAPPED).not.toContain('behringer-crave')
  })

  /**
   * The sampler fixture, which is the one that reaches four things neither of the others does.
   * Each is a *decision* rather than a byte: what a page must say when the voice is a track
   * addressed by note rather than a named voice with a written pitch.
   */
  it('on a voice addressed by note, prints the trigger note as the bridge to the figure (#32)', () => {
    expect(SAMPLED).toContain('**Trigger note** — `C5` · MIDI 60')
    // And says nothing of the kind where there is none to say.
    expect(PLAYED).not.toContain('Trigger note')
  })

  it('says what to load before the knobs mean anything (§3/#101)', () => {
    expect(SAMPLED).toMatch(/\nSource — \S/)
  })

  it('says out loud when the character it got is not the one asked for (§3.5)', () => {
    expect(SAMPLED).toContain('asks for a hard bass-mid and the nearest this box authors is')
    expect(PLAYED).not.toContain('the nearest this box authors is')
  })

  /**
   * `ArticulationEntry.set` holds numbers, strings *and* booleans, and all three are reachable
   * from a riff. A renderer that coerced the value would print `NaN` on the devices authoring a
   * named mode — silently, and only on those.
   */
  it('prints articulation values as they are, whatever type they are', () => {
    expect(SAMPLED).toContain('- `downbeat` → `velocity` 112, `note-length` 12 on steps')
    for (const doc of [PLAYED, SAMPLED, GAPPED, STACKED]) expect(doc).not.toContain('NaN')
  })

  /**
   * §12.4/#40/#503. The stacked page, which is the same figure on the same role as the gapped one
   * — the difference between them is a *pool*, and this is the pair that says so in bytes.
   */
  it('names every voice of a stack, and says what a stack is (§8/#431)', () => {
    expect(STACKED).toContain('Track 1, Track 2 and Track 3')
    expect(STACKED).toContain('Stacked chord: 3 voices, one note each.')
    expect(STACKED).toContain('build the sound once and copy it across all 3')
    expect(STACKED).toContain('Lowest note to the lowest voice: Track 1 takes the bottom')
    // And nothing of the kind on a one-voice part, where the sentence would be noise.
    expect(PLAYED).not.toContain('Stacked chord')
  })

  it('the gapped page still prints the notes: they are not the rig’s to have', () => {
    expect(GAPPED).toContain('2 bars in A minor.')
    expect(GAPPED).toContain('## The grid')
  })

  it('shows no backlog: what is unauthored is never the reader’s business', () => {
    for (const doc of [PLAYED, SAMPLED, GAPPED, STACKED]) {
      for (const phrase of ['not yet', 'nobody has', 'unauthored', 'TODO', 'coming soon']) {
        expect(doc, phrase).not.toContain(phrase)
      }
    }
  })

  it('every library riff renders against the whole catalogue without throwing', () => {
    for (const riff of RIFFS) {
      const doc = renderRiff(resolveRiff(riff, DEVICES))
      expect(doc.startsWith(`# ${riff.name}\n`), riff.id).toBe(true)
      expect(doc.endsWith('\n'), riff.id).toBe(true)
    }
  })
})

describe('the renderer itself', () => {
  it('reaches for no locale-dependent or random API (§7.2)', () => {
    // `lib/core/riff.ts` is covered by `determinism.test.ts`' own scan, which reads every module
    // the barrel exports. `lib/studio` is outside it, so this file scans its own renderer — the
    // same split `kit-golden.test.ts` makes for `kit-markdown.ts`.
    const source = readFileSync(join(REPO_ROOT, 'lib', 'studio', 'riff-markdown.ts'), 'utf8')
    // Comments *name* these to say why they are banned, so the scan is of code only.
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    for (const banned of ['localeCompare', 'toLocale', 'Intl.', 'Math.random']) {
      expect(code, banned).not.toContain(banned)
    }
  })
})
