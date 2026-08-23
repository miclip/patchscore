import { describe, expect, it } from 'vitest'
import {
  DENSITY_DETENTS,
  MOOD_AXES,
  MOOD_ORDER_V1,
  NEUTRAL_MOOD,
  PERMALINK_ID,
  RESOLVER_VERSION,
  FORMAT_VERSION,
  GuideInputsError,
  SEED_MAX,
  decodeGuideInputs,
  encodeGuideInputs,
  moodState,
  renderGuide,
  resolve,
} from '../lib/core/index'
import type { MoodState, Catalogue, GuideInputsV1 } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES, templateById } from '../lib/templates/index'
import { GOLDEN_DEVICES, GOLDEN_SEED, GOLDEN_TEMPLATE } from './golden/scenario'

/**
 * §8.2. The permalink layer, before any of it is wired to React.
 *
 * The load-bearing test in this file is the last one: encode -> decode -> resolve -> `renderGuide`
 * must produce the same bytes as resolving the state directly. Everything above it checks that
 * the codec is strict and canonical; that one checks it is *lossless about the things the guide
 * depends on*, which is the only property a permalink actually promises.
 */

/** The real rig, in registry order. */
const REGISTRY: Catalogue = {
  devices: DEVICES.map((d) => d.id),
  templates: TEMPLATES.map((t) => t.id),
  inspirations: [],
}

/**
 * The golden fixture rig. Its ids (`A-cascade`, `B-tracker`, `a-drum`) are the §7.2 locale trap,
 * which makes it the better catalogue for the ordering tests: a device order derived by any
 * route other than the catalogue index shows up here.
 */
const GOLDEN: Catalogue = {
  devices: GOLDEN_DEVICES.map((d) => d.id),
  templates: [GOLDEN_TEMPLATE.id],
  inspirations: [],
}

function goldenInputs(over: Partial<GuideInputsV1> = {}): GuideInputsV1 {
  return {
    version: FORMAT_VERSION,
    devices: GOLDEN.devices,
    templateId: GOLDEN_TEMPLATE.id,
    inspirations: [],
    mood: NEUTRAL_MOOD,
    seed: GOLDEN_SEED,
    ...over,
  }
}

// ---------------------------------------------------------------------------

describe('the v1 wire format', () => {
  it('names every value, in a fixed order, whatever the state', () => {
    const encoded = encodeGuideInputs(goldenInputs({ seed: 1, mood: NEUTRAL_MOOD }), GOLDEN)
    expect(encoded).toBe(
      'format=1&resolver=1&device=A-cascade&device=B-tracker&device=a-drum&template=golden-techno&darkness=50&density=50&grit=50&swing=50&space=50&seed=1',
    )
  })

  it('is readable: whole words, no packing, no base64', () => {
    const encoded = encodeGuideInputs(goldenInputs(), GOLDEN)
    // Someone should be able to change one number in the address bar and see what happens.
    for (const key of ['format', 'resolver', 'device', 'template', 'seed', 'darkness', 'space']) {
      expect(encoded).toContain(`${key}=`)
    }
    // Every value is either an id or a decimal integer — nothing is encoded into anything.
    for (const pair of encoded.split('&')) {
      const value = pair.slice(pair.indexOf('=') + 1)
      expect(value === '' || /^[A-Za-z0-9-]+$/.test(value)).toBe(true)
    }
  })

  it('stamps both versions: what encoding this is, and which engine made it', () => {
    const encoded = encodeGuideInputs(goldenInputs(), GOLDEN)
    expect(encoded.startsWith(`format=${FORMAT_VERSION}&resolver=${RESOLVER_VERSION}&`)).toBe(true)
  })

  it('writes a list as one parameter per element, so nothing needs a separator', () => {
    const encoded = encodeGuideInputs(goldenInputs(), GOLDEN)
    expect(encoded.match(/(^|&)device=/g)?.length).toBe(GOLDEN.devices.length)
  })

  it('writes an empty rig as no device parameters at all', () => {
    const encoded = encodeGuideInputs(goldenInputs({ devices: [] }), GOLDEN)
    expect(encoded).not.toContain('device=')
    const back = decodeGuideInputs(encoded, GOLDEN)
    expect(back.ok).toBe(true)
    if (back.ok) expect(back.inputs.devices).toEqual([])
  })

  it('stays far inside the safe URL budget for a full rig', () => {
    const encoded = encodeGuideInputs(goldenInputs(), GOLDEN)
    // ~2000 characters is the safe ceiling. A full rig costs a fraction of it, which is the
    // headroom that pays for whole-word keys.
    expect(encoded.length).toBeLessThan(400)
  })
})

describe('canonical encoding', () => {
  it('writes devices in registry order, not the order they were picked', () => {
    const clicked = encodeGuideInputs(
      goldenInputs({ devices: ['a-drum', 'A-cascade', 'B-tracker'] }),
      GOLDEN,
    )
    const registryOrder = encodeGuideInputs(goldenInputs({ devices: GOLDEN.devices }), GOLDEN)
    expect(clicked).toBe(registryOrder)
    expect(clicked).toContain('device=A-cascade&device=B-tracker&device=a-drum')
  })

  it('is a fixed point: decoding a link and re-encoding it changes nothing', () => {
    const encoded = encodeGuideInputs(goldenInputs({ mood: moodState({ grit: 80 }) }), GOLDEN)
    const back = decodeGuideInputs(encoded, GOLDEN)
    expect(back.ok).toBe(true)
    if (back.ok) expect(encodeGuideInputs(back.inputs, GOLDEN)).toBe(encoded)
  })

  it('normalises a hand-written link to the canonical form', () => {
    // Fields out of order and devices out of registry order — legal input, one canonical output.
    const messy =
      'seed=7&space=50&swing=50&grit=50&density=50&darkness=50&template=golden-techno' +
      '&device=a-drum&device=A-cascade&resolver=1&format=1'
    const back = decodeGuideInputs(messy, GOLDEN)
    expect(back.ok).toBe(true)
    if (!back.ok) return
    expect(encodeGuideInputs(back.inputs, GOLDEN)).toBe(
      'format=1&resolver=1&device=A-cascade&device=a-drum&template=golden-techno' +
        '&darkness=50&density=50&grit=50&swing=50&space=50&seed=7',
    )
  })

  it('accepts a leading ? so location.search can be passed straight in', () => {
    const encoded = encodeGuideInputs(goldenInputs(), GOLDEN)
    expect(decodeGuideInputs(`?${encoded}`, GOLDEN)).toEqual(decodeGuideInputs(encoded, GOLDEN))
  })
})

describe('the format constrains what ids may look like', () => {
  it('every id in the real registry is permalink-safe', () => {
    for (const id of [...REGISTRY.devices, ...REGISTRY.templates]) {
      expect(id, `'${id}' would need a format change to appear in a link`).toMatch(PERMALINK_ID)
    }
  })

  it("v1's mood write order covers exactly MOOD_AXES", () => {
    // Self-describing keys mean this no longer decides *meaning* — but an axis missing from it
    // would be silently absent from every link written, so it still has to be complete.
    expect([...MOOD_ORDER_V1]).toEqual([...MOOD_AXES])
  })

  it('reserves every mood axis name as a top-level key', () => {
    const encoded = encodeGuideInputs(goldenInputs(), GOLDEN)
    for (const axis of MOOD_AXES) expect(encoded).toContain(`&${axis}=`)
  })
})

describe('malformed input fails safely', () => {
  const canonical = encodeGuideInputs(goldenInputs({ seed: 1 }), GOLDEN)

  const bad: ReadonlyArray<readonly [string, string, string]> = [
    ['empty string', '', 'malformed'],
    ['not a query string at all', 'hello world', 'malformed'],
    ['a bare field', 'format', 'malformed'],
    ['an empty key', '=1', 'malformed'],
    ['a duplicated scalar', `${canonical}&seed=2`, 'malformed'],
    ['a missing scalar', canonical.replace('&seed=1', ''), 'malformed'],
    ['a missing mood axis', canonical.replace('&swing=50', ''), 'malformed'],
    ['a missing format stamp', canonical.replace('format=1&', ''), 'malformed'],
    ['a missing resolver stamp', canonical.replace('resolver=1&', ''), 'malformed'],
    ['a non-numeric format version', canonical.replace('format=1', 'format=one'), 'malformed'],
    ['a non-numeric resolver version', canonical.replace('resolver=1', 'resolver=x'), 'malformed'],
    ['a fractional mood value', canonical.replace('grit=50', 'grit=50.5'), 'malformed'],
    ['a signed number', canonical.replace('seed=1', 'seed=+1'), 'malformed'],
    ['a leading zero', canonical.replace('seed=1', 'seed=01'), 'malformed'],
    ['exponent notation', canonical.replace('seed=1', 'seed=1e3'), 'malformed'],
    ['whitespace around a number', canonical.replace('seed=1', 'seed=%201'), 'malformed'],
    ['broken percent-encoding', canonical.replace('template=golden-techno', 'template=%zz'), 'malformed'],
    ['a duplicated device', `${canonical}&device=A-cascade`, 'malformed'],
    ['an unknown device', canonical.replace('device=A-cascade', 'device=nonexistent'), 'unknown-id'],
    ['an unknown template', canonical.replace('template=golden-techno', 'template=house'), 'unknown-id'],
    ['an inspiration, which no build has yet', `${canonical}&inspiration=blue-monday`, 'unknown-id'],
    // Syntax before membership: an id that could not survive a URL is malformed, not merely
    // absent from the catalogue.
    ['an id that could not survive a URL', canonical.replace('device=A-cascade', 'device=a.b'), 'malformed'],
    ['a mood value over 100', canonical.replace('darkness=50', 'darkness=101'), 'out-of-range'],
    ['a seed past the maximum', canonical.replace('seed=1', `seed=${SEED_MAX + 1}`), 'out-of-range'],
  ]

  for (const [what, input, reason] of bad) {
    it(`rejects ${what} without throwing`, () => {
      const result = decodeGuideInputs(input, GOLDEN)
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.reason).toBe(reason)
      // The detail is for a person to read, and must never echo the link back at them.
      expect(result.detail.length).toBeGreaterThan(0)
    })
  }

  it('returns no partial state to fall back on', () => {
    const result = decodeGuideInputs(canonical.replace('device=A-cascade', 'device=nope'), GOLDEN)
    expect(result).not.toHaveProperty('inputs')
  })

  it('refuses to encode state it could not decode back', () => {
    expect(() => encodeGuideInputs(goldenInputs({ devices: ['nonexistent'] }), GOLDEN)).toThrow(
      GuideInputsError,
    )
    expect(() => encodeGuideInputs(goldenInputs({ seed: -1 }), GOLDEN)).toThrow(GuideInputsError)
    expect(() => encodeGuideInputs(goldenInputs({ mood: moodState({ grit: 50.5 }) }), GOLDEN)).toThrow(
      GuideInputsError,
    )
  })
})

describe('version mismatch is preserved, never silent', () => {
  const canonical = encodeGuideInputs(goldenInputs({ seed: 1 }), GOLDEN)

  it('reports no drift for a link from this engine', () => {
    const result = decodeGuideInputs(canonical, GOLDEN)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.drift).toBe(false)
    expect(result.resolver).toEqual({ encoded: RESOLVER_VERSION, current: RESOLVER_VERSION })
  })

  it('decodes an older engine’s link and flags the drift', () => {
    // §8.2's policy: the inputs are readable, so re-resolve them under the current engine and
    // say so. A hard failure here would throw away a link that is perfectly usable.
    const result = decodeGuideInputs(canonical.replace('resolver=1', 'resolver=0'), GOLDEN)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.drift).toBe(true)
    expect(result.resolver).toEqual({ encoded: 0, current: RESOLVER_VERSION })
    // The state itself is untouched by the drift — only the report differs.
    expect(result.inputs).toEqual(goldenInputs({ seed: 1 }))
  })

  it('flags a link from a newer engine the same way, in the other direction', () => {
    const result = decodeGuideInputs(canonical.replace('resolver=1', 'resolver=99'), GOLDEN)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.drift).toBe(true)
    expect(result.resolver.encoded).toBeGreaterThan(result.resolver.current)
  })

  it('refuses a wire format it cannot read, and says which', () => {
    const result = decodeGuideInputs(canonical.replace('format=1', 'format=2'), GOLDEN)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('unsupported-version')
    expect(result.format).toEqual({ encoded: 2, current: FORMAT_VERSION })
  })
})

// ---------------------------------------------------------------------------

/**
 * The reason the format is self-describing rather than positional. A permalink written today
 * must still decode after three more fields are added, and a permalink written tomorrow must not
 * crash a decoder that predates them.
 *
 * "Tomorrow's link" is simulated the only way it can be: by adding fields this build has never
 * heard of to a link it wrote itself. That is exactly what a v1 decoder will meet when v2 ships.
 */
describe('forward compatibility: a link from a later build', () => {
  const canonical = encodeGuideInputs(goldenInputs({ seed: 3 }), GOLDEN)

  /** What a plausible v2 link looks like: overlays, hint state, and a field nobody predicted. */
  const future =
    `${canonical}&overlay=a-drum:sd-disabled&hints=off&arrangementLength=64`

  it('opens, rather than refusing', () => {
    const decoded = decodeGuideInputs(future, GOLDEN)
    expect(decoded.ok).toBe(true)
  })

  it('reads every field it does understand, unaffected by the ones it does not', () => {
    const decoded = decodeGuideInputs(future, GOLDEN)
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return
    const known = decodeGuideInputs(canonical, GOLDEN)
    expect(known.ok).toBe(true)
    if (known.ok) expect(decoded.inputs).toEqual(known.inputs)
  })

  it('reports what it dropped, by name, uniquely and in order', () => {
    const decoded = decodeGuideInputs(future, GOLDEN)
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return
    expect(decoded.dropped).toEqual(['arrangementLength', 'hints', 'overlay'])
    expect(decoded.dropped.length).toBe(3)
  })

  it('counts a repeated unknown key once', () => {
    const decoded = decodeGuideInputs(`${canonical}&overlay=one&overlay=two`, GOLDEN)
    expect(decoded.ok).toBe(true)
    if (decoded.ok) expect(decoded.dropped).toEqual(['overlay'])
  })

  it('re-encodes only the state it understood', () => {
    // The dropped fields are gone from the link this build writes back — it has no value to
    // write. That is why they are reported at decode time: the report is their only trace.
    const decoded = decodeGuideInputs(future, GOLDEN)
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return
    const rewritten = encodeGuideInputs(decoded.inputs, GOLDEN)
    expect(rewritten).toBe(canonical)
    expect(rewritten).not.toContain('overlay')
    expect(rewritten).not.toContain('hints')
  })

  it('reports nothing dropped for a link this build wrote', () => {
    const decoded = decodeGuideInputs(canonical, GOLDEN)
    expect(decoded.ok).toBe(true)
    if (decoded.ok) expect(decoded.dropped).toEqual([])
  })

  it('still refuses a format version it cannot read, unknown fields or not', () => {
    // Ignoring unknown *fields* is safe. Ignoring an unknown *format* is not: the fields we do
    // recognise may not mean what we think they mean.
    const decoded = decodeGuideInputs(future.replace('format=1', 'format=2'), GOLDEN)
    expect(decoded.ok).toBe(false)
    if (!decoded.ok) expect(decoded.reason).toBe('unsupported-version')
  })

  it('still refuses a broken known field hiding among unknown ones', () => {
    const decoded = decodeGuideInputs(future.replace('seed=3', 'seed=three'), GOLDEN)
    expect(decoded.ok).toBe(false)
  })
})

describe('backward compatibility: a link from this build, read later', () => {
  it('carries every field by name, so a later decoder needs no positions', () => {
    const encoded = encodeGuideInputs(goldenInputs({ seed: 3 }), GOLDEN)
    const pairs = encoded.split('&').map((p) => p.slice(0, p.indexOf('=')))
    // Every value is addressed by a key. A later build adding a sixth mood axis reads the five
    // it finds and knows exactly which one is absent, rather than counting slots.
    expect(pairs).toEqual([
      'format',
      'resolver',
      'device',
      'device',
      'device',
      'template',
      'darkness',
      'density',
      'grit',
      'swing',
      'space',
      'seed',
    ])
  })

  it('says which format it is, so a later decoder can branch on it', () => {
    const encoded = encodeGuideInputs(goldenInputs(), GOLDEN)
    expect(encoded.startsWith('format=1&')).toBe(true)
  })
})

// ---------------------------------------------------------------------------

/** The whole point: a link is the guide, byte for byte. */
describe('encode -> decode -> resolve -> renderGuide is byte-identical', () => {
  function render(state: GuideInputsV1, devices: typeof GOLDEN_DEVICES, template: typeof GOLDEN_TEMPLATE) {
    const selected = devices.filter((d) => state.devices.includes(d.id))
    return renderGuide(resolve({ devices: selected, template, mood: state.mood, seed: state.seed }))
  }

  function roundTrip(state: GuideInputsV1, catalogue: Catalogue): GuideInputsV1 {
    const decoded = decodeGuideInputs(encodeGuideInputs(state, catalogue), catalogue)
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) throw new Error(decoded.detail)
    return decoded.inputs
  }

  // §6.3 / §12.2. The three density detents are the only values the UI can produce, and each
  // one lands in a different `densityShift` zone — so if the codec dropped or rounded density,
  // exactly this sweep is what would catch it. Imported, never restated: a sweep pinned to
  // numbers the control does not emit would pass while the app did something else.
  const DETENTS = DENSITY_DETENTS

  for (const density of DETENTS) {
    it(`survives the round trip at density ${density} (golden rig)`, () => {
      const state = goldenInputs({ mood: moodState({ darkness: 80, density, grit: 75, space: 30 }) })
      expect(render(roundTrip(state, GOLDEN), GOLDEN_DEVICES, GOLDEN_TEMPLATE)).toBe(
        render(state, GOLDEN_DEVICES, GOLDEN_TEMPLATE),
      )
    })
  }

  it('renders a different guide at each detent, so the sweep is testing something', () => {
    const guides = DETENTS.map((density) =>
      render(
        goldenInputs({ mood: moodState({ density }) }),
        GOLDEN_DEVICES,
        GOLDEN_TEMPLATE,
      ),
    )
    expect(new Set(guides).size).toBe(DETENTS.length)
  })

  it('survives the round trip on the real registry, at every detent', () => {
    const template = templateById(REGISTRY.templates[0] as string)
    expect(template).toBeDefined()
    if (template === undefined) return

    for (const density of DETENTS) {
      const state: GuideInputsV1 = {
        version: FORMAT_VERSION,
        devices: REGISTRY.devices,
        templateId: template.id,
        inspirations: [],
        mood: moodState({ density, darkness: 30, grit: 65, swing: 40, space: 55 }),
        seed: 20260823,
      }
      const decoded = roundTrip(state, REGISTRY)
      const one = renderGuide(
        resolve({ devices: DEVICES, template, mood: state.mood, seed: state.seed }),
      )
      const two = renderGuide(
        resolve({ devices: DEVICES, template, mood: decoded.mood, seed: decoded.seed }),
      )
      expect(two).toBe(one)
    }
  })

  it('carries every mood axis, not just the ones a guide happens to print', () => {
    const mood: MoodState = { darkness: 0, density: 87, grit: 100, swing: 33, space: 66 }
    const decoded = roundTrip(goldenInputs({ mood }), GOLDEN)
    expect(decoded.mood).toEqual(mood)
  })
})
