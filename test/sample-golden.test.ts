import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { resolveSample } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { SAMPLE_TARGETS, sampleTargetById } from '../lib/samples'
import { renderSample } from '../lib/studio/sample-markdown'
import { SAMPLE_NAMES, samplePath, sampleText } from './golden/samples'

/**
 * §3.8/#520. **A sound page's Markdown**, pinned as bytes and checked for the things bytes alone
 * do not say out loud: that the technique is printed as prose, that a rig which cannot make the
 * sound is told so rather than shown a guess, that the recording block ends the document whatever
 * the rig answered, and that nothing belonging to a *song* or a *figure* reached the page.
 *
 * Regenerate with `npm run gen:samples` and read the diff. Never regenerate to make a test pass.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(HERE, '..')
const TSX = join(REPO_ROOT, 'node_modules', '.bin', 'tsx')
const GENERATOR = join(HERE, 'golden', 'samples.ts')

// The ICU trap the other golden suites use: Node reads LANG/LC_ALL to pick its default locale, so
// a `localeCompare`, a `toLocaleString` or a `toLocaleUpperCase` that reached this renderer would
// genuinely answer differently under it.
const HOSTILE_LOCALE = 'tr_TR.UTF-8'

const MADE = sampleText('texture-on-a-neutron')
const MODULATED = sampleText('wobble-on-a-mother-32')
const GAPPED = sampleText('vocal-chop-on-a-sampler')

const rig = (...ids: string[]) =>
  ids.map((id) => {
    const device = DEVICES.find((d) => d.id === id)
    if (device === undefined) throw new Error(`no device ${id}`)
    return device
  })

const target = (id: string) => {
  const found = sampleTargetById(id)
  if (found === undefined) throw new Error(`no sample target ${id}`)
  return found
}

const render = (id: string, ...deviceIds: string[]) =>
  renderSample(resolveSample(target(id), rig(...deviceIds)))

describe('sample fixtures (§3.8, invariant 6)', () => {
  for (const name of SAMPLE_NAMES) {
    describe(name, () => {
      it('matches the committed bytes exactly', () => {
        expect(sampleText(name)).toBe(readFileSync(samplePath(name), 'utf8'))
      })

      it('renders the same bytes twice in one process', () => {
        expect(sampleText(name)).toBe(sampleText(name))
      })

      it('is byte-identical under a non-C LANG', () => {
        const child = spawnSync(TSX, [GENERATOR, name], {
          encoding: 'utf8',
          cwd: REPO_ROOT,
          env: { ...process.env, LANG: HOSTILE_LOCALE, LC_ALL: HOSTILE_LOCALE },
        })
        expect(child.error).toBeUndefined()
        expect(child.status, child.stderr).toBe(0)
        expect(child.stdout).toBe(readFileSync(samplePath(name), 'utf8'))
      })
    })
  }

  it('actually runs the child in the hostile locale, or it proves nothing', () => {
    const probe = spawnSync(
      process.execPath,
      ['-e', 'process.stdout.write(Intl.DateTimeFormat().resolvedOptions().locale)'],
      { encoding: 'utf8', env: { ...process.env, LANG: HOSTILE_LOCALE, LC_ALL: HOSTILE_LOCALE } },
    )
    expect(probe.stdout).toBe('tr-TR')
  })

  it('has something in it a hostile locale could break', () => {
    // The locale test is only a test if the document contains something ICU would move. This
    // page's traps are grouping — `toLocaleString` writes `10.000` for 10000 under tr-TR, where
    // §7.2's `num` writes `10000` — and case folding, since `sampleFileName` upper-cases.
    expect(MADE).toMatch(/\d{4,}/)
    expect(MADE).toContain('`TEXTURE BED`')
  })
})

describe('what the document holds (§3.8)', () => {
  it('prints what to record as prose, above the box', () => {
    expect(MADE.indexOf('## What to record')).toBeLessThan(MADE.indexOf('## Where to make it'))
    for (const paragraph of target('texture-bed').technique) {
      expect(MADE).toContain(paragraph)
    }
  })

  it('names the box, its routing, its settings and one citation sentence', () => {
    expect(MADE).toContain('**NEUTRON · Voice**')
    expect(MADE).toContain('Routing — ')
    expect(MADE).toContain('**Settings**')
    expect((MADE.match(/\n\*This block draws on/g) ?? []).length).toBe(1)
  })

  it('draws the cables and the module boxes the guide draws', () => {
    expect(MADE).toContain('**Patch**')
    expect(MADE).toMatch(/- `[^`]+` → `[^`]+`/)
    expect(MADE).toContain('- **● ')
  })

  it('draws a modulation as an assignment rather than as a knob (#511)', () => {
    expect(MODULATED).toContain('- Modulation — ')
    expect(MODULATED).toContain('is no modulation')
  })

  it('ends with the destination and the file name, on a rig that makes it', () => {
    expect(MADE.trimEnd().endsWith('Record it and name it `TEXTURE BED`.')).toBe(true)
    expect(MADE).toContain('Record it with the sampler, recorder, or DAW you use.')
  })

  /**
   * §3.8. A gap ends the document, and this is the assertion that says so for all four arms.
   *
   * It replaces one that required the opposite — that the record action printed whatever the rig
   * answered, on the reasoning that a reader who has to bring a file still wants the same name.
   * That was wrong about the order things happen in: the name is useful once there is something to
   * record, and under *Add a box that makes kick sounds* it is an instruction for a file that does
   * not exist. On `loads-audio` the gap already says to bring a recording or make one, and how to
   * make one is #521's.
   */
  it('stops after every gap, printing no destination and no record action', () => {
    const gapped = [
      ['no-rig', render('kick')],
      ['no-capable-voice', render('kick', 'arturia-microfreak')],
      ['loads-audio', GAPPED],
      ['no-recipe', render('bass-note', 'behringer-crave')],
    ] as const
    for (const [arm, doc] of gapped) {
      expect(doc, `${arm} carries a Recording heading`).not.toContain('## Recording it')
      expect(doc, `${arm} carries the destination`).not.toContain(
        'Record it with the sampler, recorder, or DAW you use.',
      )
      expect(doc, `${arm} carries the record action`).not.toContain('Record it and name it')
      // And the last thing it says is about the gap, not about a file.
      expect(doc.indexOf('## Where to make it'), arm).toBeGreaterThan(-1)
    }
    // Every one of the four is genuinely reached, or this asserts nothing.
    expect(new Set(gapped.map(([arm]) => arm)).size).toBe(4)
  })

  it('covers all four gap arms with the four documents above', () => {
    const arms = [
      resolveSample(target('kick'), []),
      resolveSample(target('kick'), rig('arturia-microfreak')),
      resolveSample(target('vocal-chop'), rig('elektron-digitakt')),
      resolveSample(target('bass-note'), rig('behringer-crave')),
    ].map((resolution) => (resolution.outcome === 'gap' ? resolution.gap.reason : 'made'))
    expect(arms).toEqual(['no-rig', 'no-capable-voice', 'loads-audio', 'no-recipe'])
  })

  it('says what an audio-loading box ships, and only on that arm', () => {
    expect(GAPPED).toContain('plays this from a file rather than making one')
    expect(GAPPED).toContain('**Content** — Digitakt:')
    // A sound the rig makes landed on a recipe declaring no `sourceAudio`, so `contentNotice` has
    // nothing to say there — by construction rather than by choice.
    expect(MADE).not.toContain('**Content**')
  })

  it('reports the other three gaps as the actions they are', () => {
    expect(render('kick')).toContain('Pick the boxes you own.')
    expect(render('kick', 'arturia-microfreak')).toContain('Add a box that makes kick sounds.')
    expect(render('bass-note', 'behringer-crave')).toContain('could make it. Set this one up by ear.')
  })

  it('discloses a substitution rather than hiding it', () => {
    // The main fixture carries one in bytes: the target asks for a dark texture and the Neutron
    // authors a soft one, one axis away and inside §3.5's radius.
    expect(MADE).toContain('This asks for a dark texture and the nearest this box authors is soft.')
    const substituted = render('noise-hit', 'arturia-microfreak')
    expect(substituted).toContain('the nearest this box authors is dirty')
  })

  /**
   * §3.8. **The prose says what to record and never how to synthesise it.** The resolved recipe
   * below it is the authority on that, with a citation behind every value; a target naming a
   * control would be a second instruction beside the first, on a patch that may not have one.
   *
   * A word list rather than a reading, because this is a rule an author breaks by reaching for the
   * nearest word — and these are the words. `formant` and `vocal engine` are not among them: the
   * vocal chop's line is about whether a rig can produce a voice at all, which is the exception
   * this catalogue exists to state.
   */
  it('names no synthesis control in any target’s prose', () => {
    const controls = [
      'oscillator',
      'filter',
      'cutoff',
      'resonance',
      'lfo',
      'envelope',
      'detune',
      'sawtooth',
      'ring-modulate',
      'waveform',
    ]
    for (const entry of SAMPLE_TARGETS) {
      const prose = entry.technique.join(' ').toLowerCase()
      for (const control of controls) {
        expect(prose, `${entry.id} names ${control}`).not.toContain(control)
      }
    }
  })

  /**
   * §3.8/#520. **Signal processing and level belong to the resolved recipe, never to a target.**
   *
   * The rule exists because of a contradiction that shipped in the first cut: `kick`'s prose said
   * *nothing added on the way out — no reverb, no compression, no limiting*, and `kick` resolved
   * against the whole catalogue lands on `mpc-kick-hard`, which sets a distortion drive and mix,
   * three compressor controls and a gain. Two instructions on one page, disagreeing, and only one
   * of them carrying a manual page behind it.
   *
   * The test below is a **policy** over every target rather than a check on that one string. The
   * one-off would have passed the day somebody wrote *keep it dry* on the pad instead, and the
   * policy is readable: a target may say how long, where to trim, what to write down and which
   * second take to bother with — nothing about what the signal is or is done to.
   *
   * The claim above it is the anchor. Without it the policy is a word list nobody can tell is
   * load-bearing, and the day the Akai folder drops its compressor the reason to keep the rule
   * would be gone from the record.
   */
  it('the real `kick` winner sets processing the prose must not contradict', () => {
    const resolution = resolveSample(target('kick'), DEVICES)
    expect(resolution.outcome).toBe('made')
    if (resolution.outcome !== 'made') return
    expect(resolution.voice.recipe.id).toBe('mpc-kick-hard')
    const modules = new Set(resolution.voice.params.map((param) => param.module))
    expect(modules).toContain('Distortion')
    expect(modules).toContain('Compressor')
  })

  it('no target’s prose names processing, output or a recording level', () => {
    const banned = [
      'reverb',
      'compression',
      'compressor',
      'limiter',
      'limiting',
      'distortion',
      'saturation',
      'gain',
      'dry',
      'wet',
      'mono',
      'stereo',
      'level',
      'levels',
      'loudness',
      'louder',
      'quieter',
      'eq',
    ]
    for (const entry of SAMPLE_TARGETS) {
      const prose = entry.technique.join(' ').toLowerCase()
      for (const word of banned) {
        // Word boundaries: `gain` is inside `again`, and `dry` inside no word here but would be.
        expect(new RegExp(`\\b${word}\\b`).test(prose), `${entry.id} names ${word}`).toBe(false)
      }
    }
  })

  /**
   * §3.8. A second take is worth suggesting and is never a given: whether a box tunes, answers to
   * how it is struck, or lets a length or a speed vary is the patch's business. Every target that
   * asks for one says so.
   */
  it('every alternate take a target asks for is conditional on the box', () => {
    const conditional = /where the box|where the patch|yours to (?:set|choose)|where the length/
    for (const entry of SAMPLE_TARGETS) {
      for (const paragraph of entry.technique) {
        if (!/\b(?:two|three|second|several) takes?\b/i.test(paragraph)) continue
        expect(conditional.test(paragraph), `${entry.id}: ${paragraph}`).toBe(true)
      }
    }
  })

  it('carries nothing that belongs to a song or a figure', () => {
    for (const id of SAMPLE_TARGETS.map((t) => t.id)) {
      const doc = render(id, 'moog-subsequent-37', 'elektron-digitakt', 'roland-tr-8s')
      for (const absent of [
        '## The notes',
        '## The grid',
        '## Arrangement',
        '## Clock',
        'BPM',
        'Section',
        'degree ',
      ]) {
        expect(doc, `${id} carries ${absent}`).not.toContain(absent)
      }
    }
  })
})
