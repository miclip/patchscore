import { describe, expect, it } from 'vitest'
import {
  LAYOUT_PREAMBLE,
  devicesInGroup,
  devicesOutsideGroups,
  NOTE_CONVENTION,
  moodState,
  renderGuide,
  resolve,
  sequencerGroups,
} from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES } from '../lib/templates/index'

/**
 * §8/#230. **The two layouts are the same guide, walked in a different order.**
 *
 * This is the fixture the issue called for, and it exists because of what splitting a document
 * into sections makes possible: a part that belongs to no section is not drawn, and the result
 * reads as a shorter guide rather than as a broken one. Nothing about it looks like a failure.
 *
 * So the assertion is on **content, not structure**. Headings differ by design — that is the whole
 * change — and everything underneath them must not.
 */

const industrial = TEMPLATES.find((t) => t.id === 'industrial-techno')!
const rig = (...ids: string[]) => DEVICES.filter((d) => ids.includes(d.id))

/** Every line that carries content: no headings, no blanks. */
const body = (md: string) =>
  md.split('\n').filter((l) => l.trim() !== '' && !l.startsWith('#'))

const multiset = (lines: readonly string[]) => {
  const m = new Map<string, number>()
  for (const l of lines) m.set(l, (m.get(l) ?? 0) + 1)
  return m
}

/** Lines in `a` that `a` has more of than `b`. */
function surplus(a: readonly string[], b: readonly string[]): string[] {
  const mb = multiset(b)
  const out: string[] = []
  for (const [line, n] of multiset(a)) {
    const extra = n - (mb.get(line) ?? 0)
    for (let i = 0; i < extra; i++) out.push(line)
  }
  return out
}

/**
 * The one block that legitimately repeats: the hook renderer runs once per box carrying a hook,
 * and §8 wants the note convention beside the notes rather than four sections above them.
 */
const REPEATABLE = new Set(NOTE_CONVENTION.filter((l) => l.trim() !== ''))

/**
 * The sentences this layout adds, and the complete list of them. Both introduce a section that
 * exists only here — one with no device name on its heading, one listing figures with no part
 * under them — and neither has a counterpart in the phase layout to match against.
 *
 * Named rather than tolerated: the assertion below is "nothing invented except these", which is
 * only worth making if the list is exhaustive.
 */
const ADDED = new Set<string>([...LAYOUT_PREAMBLE.undriven, ...LAYOUT_PREAMBLE.orphanHooks])

describe('the sequencer layout is a permutation of the phase layout (§8/#230)', () => {
  const rigs: [string, ReturnType<typeof rig>][] = [
    ['two self-sequencing boxes', rig('synthstrom-deluge', 'roland-tr-1000')],
    ['a box nothing can drive', rig('moog-minitaur', 'roland-tr-8s')],
    ['a box driven by another', rig('moog-minitaur', 'squarp-hapax', 'roland-tr-8s')],
    ['the whole library', [...DEVICES]],
  ]

  for (const [name, devices] of rigs) {
    it(`loses nothing and invents nothing — ${name}`, () => {
      const result = resolve({ devices, template: industrial, mood: moodState({}), seed: 3 })
      const phase = body(renderGuide(result))
      const seq = body(renderGuide(result, { layout: 'sequencer' }))

      // Nothing in the phase layout may be missing from the sequencer layout. This is the
      // direction that catches a dropped part, and it admits no exceptions at all.
      expect(surplus(phase, seq), `${name}: content only the phase layout renders`).toEqual([])

      // The other direction admits exactly two things and names both, rather than allowing "extra
      // lines are fine": the repeated note convention, and the preambles for the two sections that
      // exist only in this layout. Anything else the regrouping invents — a duplicated part, a
      // gap sentence printed once per box — fails here.
      const invented = surplus(seq, phase).filter((l) => !REPEATABLE.has(l) && !ADDED.has(l))
      expect(invented, `${name}: content only the sequencer layout renders`).toEqual([])
    })
  }

  it('renders every part in both, on every template', () => {
    for (const template of TEMPLATES) {
      const result = resolve({ devices: [...DEVICES], template, mood: moodState({}), seed: 5 })
      const seq = renderGuide(result, { layout: 'sequencer' })
      for (const a of result.assignments) {
        // The recipe title is the part's own line and appears nowhere else by accident.
        expect(seq, `${template.id}: ${a.role} on ${a.deviceName}`).toContain(a.recipe.title)
      }
    }
  })
})

describe('the layout changes presentation and nothing else (invariant 6)', () => {
  it('defaults to the phase layout, so a caller asking for nothing sees no change', () => {
    const result = resolve({
      devices: rig('synthstrom-deluge', 'roland-tr-1000'),
      template: industrial,
      mood: moodState({}),
      seed: 3,
    })
    expect(renderGuide(result)).toBe(renderGuide(result, { layout: 'phase' }))
  })

  it('is byte-identical across repeated renders of the same result', () => {
    const result = resolve({
      devices: [...DEVICES],
      template: industrial,
      mood: moodState({}),
      seed: 9,
    })
    const once = renderGuide(result, { layout: 'sequencer' })
    expect(renderGuide(result, { layout: 'sequencer' })).toBe(once)
  })

  it('honours `hints: false` under either layout', () => {
    const result = resolve({
      devices: rig('synthstrom-deluge', 'roland-tr-1000'),
      template: industrial,
      mood: moodState({}),
      seed: 3,
    })
    const bare = renderGuide(result, { layout: 'sequencer', hints: false })
    expect(bare).not.toContain('↳ hint:')
    expect(renderGuide(result, { layout: 'sequencer' })).toContain('↳ hint:')
  })
})

describe('every box is patched exactly once, wherever its block lands (§8/#240)', () => {
  /**
   * #240's second question moved each box's clock, sockets, audio and mixer lines out of phase 3
   * and into the section where its parts are worked — so the reader is not told the Deluge's MIDI
   * channel four sections before they touch the Deluge.
   *
   * That split is where a box can go missing or be drawn twice, and neither would look like a
   * bug: a duplicate reads as thoroughness, and an omission reads as a box that needs no patching.
   */
  const rigs: [string, ReturnType<typeof rig>][] = [
    ['two boxes and a mixer', rig('synthstrom-deluge', 'roland-tr-1000', 'tascam-model-2400')],
    ['a driven box', rig('moog-minitaur', 'squarp-hapax', 'roland-tr-8s')],
    ['a box nothing drives', rig('moog-minitaur', 'roland-tr-8s')],
    ['boxes that carry nothing at all', rig('tascam-model-2400', 'empress-zoia-euroburo')],
    ['the whole library', [...DEVICES]],
  ]

  for (const [name, devices] of rigs) {
    it(`names each box once across phase 3 and the sections — ${name}`, () => {
      const result = resolve({ devices, template: industrial, mood: moodState({}), seed: 3 })
      const groups = sequencerGroups(result)

      const inSections = groups.flatMap((g) => [...devicesInGroup(g)])
      const inPhaseThree = devicesOutsideGroups(result).map((d) => d.id)
      const all = [...inSections, ...inPhaseThree]

      expect(new Set(all).size, `${name}: a box is drawn twice`).toBe(all.length)
      expect([...all].sort(), `${name}: a box is missing`).toEqual(
        result.devices.map((d) => d.id).sort(),
      )
    })
  }

  it('keeps a box that carries no parts in phase 3, where it can still be patched', () => {
    // §2.4: a mixer-recorder contributes zero assignables and belongs to no group. It still has
    // to be plugged in, and a layout built from groups would otherwise stop mentioning it.
    const result = resolve({
      devices: rig('synthstrom-deluge', 'roland-tr-1000', 'tascam-model-2400'),
      template: industrial,
      mood: moodState({}),
      seed: 3,
    })
    expect(devicesOutsideGroups(result).map((d) => d.id)).toEqual(['tascam-model-2400'])
    expect(renderGuide(result, { layout: 'sequencer' })).toContain('Model 2400')
  })

  it('puts the box a driven part sounds on in the section it is entered from', () => {
    // Entering the Minitaur's line on the Hapax, a reader needs the Hapax's sockets to patch from
    // *and* the Minitaur's audio and mixer to hear it. Naming only the host would move half the
    // answer and strand the other half in phase 3.
    const result = resolve({
      devices: rig('moog-minitaur', 'squarp-hapax', 'roland-tr-8s'),
      template: industrial,
      mood: moodState({}),
      seed: 3,
    })
    const hapax = sequencerGroups(result).find(
      (g) => g.kind === 'sequencer' && g.deviceId === 'squarp-hapax',
    )
    expect(hapax).toBeDefined()
    expect([...devicesInGroup(hapax!)]).toContain('moog-minitaur')
    expect([...devicesInGroup(hapax!)][0]).toBe('squarp-hapax')
  })
})

describe('a rig carrying nothing still says so (invariant 5)', () => {
  /**
   * **The failure this layout nearly shipped as the default.**
   *
   * Phase-major always draws seven phases, so an empty rig gets a Step programming section reading
   * "No parts assigned." Sequencer-major builds its middle from groups, and no parts means no
   * groups means those two phases were simply *absent* — which §8 names as the thing not to do: a
   * section that vanishes is indistinguishable from a direction that never asked for one.
   *
   * Caught by rendering an empty rig while making the layout the default, not by a test. This is
   * the test.
   */
  it('does not let Step programming and Sound design vanish when nothing is assigned', () => {
    const result = resolve({ devices: [], template: industrial, mood: moodState({}), seed: 1 })
    expect(sequencerGroups(result)).toHaveLength(0)

    const md = renderGuide(result, { layout: 'sequencer' })
    expect(md).toContain('Step programming')
    expect(md).toContain('Sound design')
    expect(md).toContain('nothing here to program')
  })

  it('still names every phase heading the phase layout would, for an empty rig', () => {
    const result = resolve({ devices: [], template: industrial, mood: moodState({}), seed: 1 })
    const seq = renderGuide(result, { layout: 'sequencer' })
    // Not the same headings — that is the change — but no *subject* is dropped: a reader is told
    // about hooks, about programming and about sound, whichever way they read.
    for (const subject of ['Song', 'Voice assignment', 'Rig integration', 'Finishing']) {
      expect(seq, subject).toContain(subject)
    }
    expect(seq).toContain('Hooks with nothing to play them')
  })
})

describe('the sections are the sequencer groups, and say what they are', () => {
  it('gives each group a section, in the grouping’s own order', () => {
    const result = resolve({
      devices: rig('synthstrom-deluge', 'roland-tr-1000'),
      template: industrial,
      mood: moodState({}),
      seed: 3,
    })
    const headings = renderGuide(result, { layout: 'sequencer' })
      .split('\n')
      .filter((l) => l.startsWith('## '))
    const names = sequencerGroups(result).map((g) =>
      g.kind === 'sequencer' ? g.deviceName : 'undriven',
    )
    // Song, Voice assignment, Rig integration, …groups…, Finishing.
    expect(headings).toHaveLength(names.length + 4)
    names.forEach((n, i) => expect(headings[i + 3]).toContain(n))
  })

  it('never tells a box with no hook that the template has none (invariant 5)', () => {
    // The bug this guard exists for: `phaseHook`'s empty case is a sentence about the *template*,
    // and under a narrowed result it was printed beneath a drum machine in a direction with three
    // hooks. True of a template, false of a box.
    const result = resolve({
      devices: rig('synthstrom-deluge', 'roland-tr-1000'),
      template: industrial,
      mood: moodState({}),
      seed: 3,
    })
    expect(result.song.hooks.length).toBeGreaterThan(0)
    expect(renderGuide(result, { layout: 'sequencer' })).not.toContain('This template has no hooks.')
  })

  it('says plainly when nothing in the rig can drive a part', () => {
    const result = resolve({
      devices: rig('moog-minitaur', 'roland-tr-8s'),
      template: industrial,
      mood: moodState({}),
      seed: 3,
    })
    expect(sequencerGroups(result).some((g) => g.kind === 'undriven')).toBe(true)
    expect(renderGuide(result, { layout: 'sequencer' })).toContain(
      'Nothing in this rig can drive these',
    )
  })
})
