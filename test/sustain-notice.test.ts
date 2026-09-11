import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Device, ResolveResult, SustainClaim, Template } from '../lib/core/index'
import { STEPS_PER_BAR, moodState, renderGuide, resolve, sustainNotice } from '../lib/core/index'
import { Guide } from '../components/guide/guide'
import { poolDevice, recipe, template } from './fixtures'

/**
 * §3/#506. **A hook that holds a note this sound's amplitude stage will not hold says so, above the
 * note.** The row still prints *held for 64 steps (4 bars)*, because that is the part (#142);
 * the sentence above it is what was missing when the guide was read at a machine that could not
 * do it.
 *
 * `sustainNotice` decides, once, in `lib/core/pipeline.ts`; the words are each renderer's own,
 * and both copies are asserted here against what a reader sees rather than against the markup.
 * It is a sentence on a rendered line and not a §7.3 shortfall: the allocation stands and the
 * search never hears of it.
 */

const MANUAL = { kind: 'manual', source: 'fixture manual p.9' } as const

const claim = (kind: SustainClaim['kind']): SustainClaim => ({
  kind,
  control: { kind: 'inherent' },
  evidence: MANUAL,
})

/**
 * A pool box whose pad recipe makes the given claim, or none. It carries a length per note, so
 * the rows below print their durations and the sentence can be read against the number it names;
 * the shared fixture is a `trigger` box, whose rows print none (#142).
 */
function rig(sustain: SustainClaim | undefined): Device {
  return poolDevice({
    noteDuration: { kind: 'per-note-value', control: 'LEN' },
    recipes: [
      recipe({ id: 'fx-track-kick-hard', voice: 'track', articulation: undefined }),
      recipe({
        id: 'fx-pad-dark',
        role: 'pad',
        character: 'dark',
        voice: 'track',
        title: 'Fixture pad',
        articulation: undefined,
        ...(sustain === undefined ? {} : { sustain }),
      }),
    ],
  })
}

/** A direction whose pad hook holds one note for `len` steps. */
function direction(len: number, over: Partial<Template> = {}): Template {
  return template({
    hooks: [
      {
        id: 'fx-hook-pad',
        forRole: 'pad',
        bars: 4,
        baseOctave: 3,
        notes: [
          { step: 1, degree: 1, octave: 0, len },
          { step: 1, degree: 5, octave: 0, len: 4 },
        ],
      },
    ],
    ...over,
  })
}

function run(device: Device, t: Template): ResolveResult {
  return resolve({ devices: [device], template: t, mood: moodState(), seed: 1 })
}

/** The Markdown, and the app's visible text with its markup stripped. */
function views(result: ResolveResult): [string, string] {
  const html = renderToStaticMarkup(createElement(Guide, { result, seed: 1, layout: 'phase' }))
  return [renderGuide(result), html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')]
}

const SENTENCE =
  'The longest note here is held for 64 steps (4 bars), and this sound cannot hold it: ' +
  'its amplitude stage decays instead of holding a level.'

/** The chord row those hooks print: two lengths, so the neutral verb, and the longer one glossed. */
const ROW = 'sounds for 64 steps (4 bars) / 4 steps'

function padHook(result: ResolveResult) {
  return result.song.hooks.find((h) => h.forRole === 'pad')
}

describe('the verdict (§3/#506)', () => {
  const held = { notes: [{ len: 4 }, { len: 64 }, { len: 16 }] }

  it('names the longest hold on a recipe that decays', () => {
    expect(sustainNotice({ sustain: 'decays' }, held)).toEqual({ longest: 64 })
  })

  it('draws the line at one bar, where `held for` begins', () => {
    expect(sustainNotice({ sustain: 'decays' }, { notes: [{ len: STEPS_PER_BAR }] })).toEqual({
      longest: STEPS_PER_BAR,
    })
    expect(sustainNotice({ sustain: 'decays' }, { notes: [{ len: STEPS_PER_BAR - 1 }] })).toBeUndefined()
    expect(sustainNotice({ sustain: 'decays' }, { notes: [] })).toBeUndefined()
  })

  it('says nothing for a recipe that sustains or that made no claim', () => {
    expect(sustainNotice({ sustain: 'sustains' }, held)).toBeUndefined()
    expect(sustainNotice({}, held)).toBeUndefined()
  })
})

describe('the resolved recipe carries the state and not the claim', () => {
  it('carries the kind where the recipe declares one, and nothing where it does not', () => {
    const decays = run(rig(claim('decays')), direction(64))
    const silent = run(rig(undefined), direction(64))
    const pad = (r: ResolveResult) => r.assignments.find((a) => a.role === 'pad')?.recipe
    expect(pad(decays)?.sustain).toBe('decays')
    expect(pad(silent)).toBeDefined()
    expect(pad(silent)).not.toHaveProperty('sustain')
    // §8 prints no provenance: the page and the control stay with the author and the audit.
    expect(JSON.stringify(pad(decays))).not.toContain('fixture manual p.9')
  })
})

describe('both renderers (§8)', () => {
  it('print the sentence under the note-duration line, above the held row, on a `decays` recipe', () => {
    const result = run(rig(claim('decays')), direction(64))
    expect(padHook(result)?.chosen.outcome).toBe('resolved')
    const [md, web] = views(result)
    for (const text of [md, web]) {
      expect(text).toContain(SENTENCE)
      // The row is untouched: the part is still the part. Two lengths, so the row takes the
      // neutral verb (#142) and the sentence names the longer one.
      expect(text).toContain(ROW)
    }
    // Markdown order: the box's sentence, then the sound's, then the rows it governs.
    const box = md.indexOf('Note length is set per note here')
    const sound = md.indexOf(SENTENCE)
    const row = md.indexOf(ROW)
    expect(box).toBeGreaterThan(-1)
    expect(sound).toBeGreaterThan(box)
    expect(row).toBeGreaterThan(sound)
    // Once, not once per row or per renderer pass.
    expect(md.split(SENTENCE).length - 1).toBe(1)
  })

  it('spell the duration as the row does, whatever the length', () => {
    const [md, web] = views(run(rig(claim('decays')), direction(24)))
    for (const text of [md, web]) {
      expect(text).toContain('The longest note here is held for 24 steps (1 bar 8 steps), and this sound cannot hold it')
    }
  })

  it('stay silent on a `sustains` recipe', () => {
    for (const text of views(run(rig(claim('sustains')), direction(64)))) {
      expect(text).toContain(ROW)
      expect(text).not.toContain('amplitude stage decays')
    }
  })

  it('stay silent where the recipe made no claim', () => {
    for (const text of views(run(rig(undefined), direction(64)))) {
      expect(text).toContain(ROW)
      expect(text).not.toContain('amplitude stage decays')
    }
  })

  it('stay silent on a hook under a bar, which is a hit and not a hold', () => {
    const result = run(rig(claim('decays')), direction(8))
    expect(padHook(result)?.chosen.outcome).toBe('resolved')
    for (const text of views(result)) {
      expect(text).toContain('sounds for 8 steps / 4 steps')
      expect(text).not.toContain('amplitude stage decays')
    }
  })

  /**
   * A `trigger` box prints no duration on its rows (#142): a step fires the sound and its own
   * decay is the length. The sentence still prints there, and it is the one place it says
   * something the rows do not — the hook asked for a hold, the box has no field for it, and the
   * sound decays. All three are true and the reader is told all three. The RD-8 and RD-9 subs are
   * this shape in the shipped library.
   */
  it('print the sentence on a `trigger` box too, where the rows carry no duration', () => {
    const struck = poolDevice({
      noteDuration: { kind: 'trigger', reason: 'the voice’s own circuit ends it' },
      recipes: rig(claim('decays')).recipes,
    })
    const result = run(struck, direction(64))
    expect(padHook(result)?.chosen.outcome).toBe('resolved')
    const [md, web] = views(result)
    for (const text of [md, web]) {
      expect(text).toContain('A step is a trigger, not a note with a length')
      expect(text).toContain(SENTENCE)
      expect(text).not.toContain(ROW)
      expect(text).not.toContain('sounds for')
    }
    const box = md.indexOf('A step is a trigger, not a note with a length')
    expect(md.indexOf(SENTENCE)).toBeGreaterThan(box)
  })

  it('stay silent on a hook that did not resolve', () => {
    const result = run(rig(claim('decays')), direction(64, { keys: ['Zz minor'] }))
    expect(padHook(result)?.chosen.outcome).toBe('unresolved')
    for (const text of views(result)) {
      expect(text).toContain('Not resolved:')
      expect(text).not.toContain('amplitude stage decays')
    }
  })

  it('stay silent on a part nothing in the rig carries', () => {
    // A held hook for a role the rig has no recipe for: no sound, so no claim about one.
    const result = run(
      rig(claim('decays')),
      direction(64, {
        hooks: [
          {
            id: 'fx-hook-tex',
            forRole: 'texture',
            bars: 4,
            baseOctave: 3,
            notes: [{ step: 1, degree: 1, octave: 0, len: 64 }],
          },
        ],
      }),
    )
    const tex = result.song.hooks.find((h) => h.forRole === 'texture')
    expect(tex?.chosen.outcome).toBe('resolved')
    expect(result.assignments.some((a) => a.role === 'texture')).toBe(false)
    for (const text of views(result)) {
      expect(text).toContain('Nothing in your rig plays this part')
      expect(text).not.toContain('amplitude stage decays')
    }
  })
})
