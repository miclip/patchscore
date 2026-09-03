import { describe, expect, it } from 'vitest'
import { type Catalogue, decodeGuideInputs, DENSITY_DETENTS, encodeGuideInputs, FORMAT_VERSION, type GuideInputsV1, type MoodAxis, moodState, renderGuide, resolve, RESOLVER_VERSION, TemplateSchema } from '../lib/core/index'
import { DEFAULT_INPUTS, effectiveMood, moodFromDirection, withAxis, withTemplate } from '../lib/studio/session'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES, templateById } from '../lib/templates/index'
import { template } from './fixtures'

/**
 * #310. **A direction can state the mood it opens at**, and the reader can still move every knob.
 *
 * The issue was filed from `hip-hop`, where the defining feel was one knob away and no direction
 * had a way to say so: the sampler's `SHUFFLE` declares `mood: [{ axis: 'swing', amount: 50 }]`,
 * so the mechanism was already wired, and a reader who never touched the control got the manual's
 * own "0 is straight" in a direction whose whole point is that it is not.
 *
 * The shape is a **total optional override**, and the file is mostly about the seam between the
 * two layers:
 *
 *  - `Template.mood` is a `Partial`, so a direction states only the axes it has an opinion about.
 *  - `ScoreInputsV1.mood` is all five axes or none. Absent means "open at the direction's".
 *  - The studio's first knob edit writes the whole effective state, which is the moment the mood
 *    becomes the reader's and starts travelling in their links.
 *
 * **The shape this rejected** is a per-axis merge — the reader's touched axes over the
 * direction's, everything else still following. It reads better right up to the reroll: nothing
 * in the inputs can then say whether `swing 65` is the direction's or a reader who happened to
 * land on the same number, so a direction change has to guess which axes to move. Answering that
 * honestly needs a provenance flag *per knob*, stored and encoded, beside a control whose
 * position is already on screen. Totality buys the same clarity for the price of one edit.
 */

const REGISTRY: Catalogue = {
  devices: DEVICES.map((d) => d.id),
  templates: TEMPLATES.map((t) => t.id),
  inspirations: [],
}

const SP404 = DEVICES.find((d) => d.id === 'roland-sp-404mk2')
const HIP_HOP = templateById('hip-hop')
/** A direction that states no mood, which is every direction but one. */
const TECHNO = templateById('industrial-techno')

function shuffleOf(devices: string[], templateId: string, mood?: GuideInputsV1['mood']) {
  const template = templateById(templateId)
  if (template === undefined) throw new Error(`no template '${templateId}'`)
  const result = resolve({
    devices: DEVICES.filter((d) => devices.includes(d.id)),
    template,
    seed: 1,
    ...(mood === undefined ? {} : { mood }),
  })
  for (const assignment of result.assignments) {
    const param = assignment.params.find((p) => p.name === 'SHUFFLE')
    if (param !== undefined) return param
  }
  return undefined
}

// ---------------------------------------------------------------------------
// The field
// ---------------------------------------------------------------------------

describe('Template.mood is schema-valid data, not a convention (#310)', () => {
  it('accepts a direction that states one axis, and one that states none', () => {
    expect(TemplateSchema.safeParse(template({ mood: { swing: 65 } })).success).toBe(true)
    expect(TemplateSchema.safeParse(template()).success).toBe(true)
  })

  it('accepts every axis at once, and the bounds the knobs have', () => {
    // Density is a detent rather than a bound — see the test below.
    const full = { darkness: 0, density: 87, grit: 50, swing: 1, space: 99 }
    expect(TemplateSchema.safeParse(template({ mood: full })).success).toBe(true)
  })

  it('refuses a value off the knob, so a direction cannot open somewhere unreachable', () => {
    for (const swing of [-1, 101]) {
      expect(TemplateSchema.safeParse(template({ mood: { swing } })).success).toBe(false)
    }
  })

  /**
   * §6.3/#317. The same rule as the test above, on the one axis where "off the knob" is not
   * about bounds.
   *
   * `densityShift` reads density as three zones and `DENSITY_DETENTS` is, in its own words, the
   * three values the UI is allowed to produce. The control renders whichever zone a value falls
   * in and writes that zone's centre back — so a direction opening at `density: 60` displays as
   * the middle zone and becomes 50 the moment anybody touches it, with no way back to 60. In
   * range, displayable, and unreachable, which is worse than out of range because nothing looks
   * wrong until the knob moves.
   */
  it('accepts only the three densities the control can produce', () => {
    for (const density of DENSITY_DETENTS) {
      expect(TemplateSchema.safeParse(template({ mood: { density } })).success, String(density)).toBe(
        true,
      )
    }
    // In range and off the detents: legal for a reader's own mood, not for a direction's opening.
    for (const density of [0, 11, 60, 88, 100]) {
      expect(
        TemplateSchema.safeParse(template({ mood: { density } })).success,
        String(density),
      ).toBe(false)
    }
  })

  it('refuses an axis that is not one, because a typo would open neutral in silence', () => {
    // Strict, like every schema here. `swung` parses as "no opinion about anything" otherwise,
    // and the direction reads as if it had stated a feel it never got.
    // Beside a *valid* axis, so this fails on strictness alone rather than on the refine below.
    const parsed = TemplateSchema.safeParse(template({ mood: { swing: 65, swung: 20 } } as never))
    expect(parsed.success).toBe(false)
  })

  it('refuses an empty mood, which is absence wearing a second spelling', () => {
    expect(TemplateSchema.safeParse(template({ mood: {} })).success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// What it was for
// ---------------------------------------------------------------------------

describe('hip-hop opens with the swing up, on the box that documents a shuffle (#310)', () => {
  it('states swing and nothing else', () => {
    expect(HIP_HOP?.mood).toEqual({ swing: 65 })
  })

  it('reaches SHUFFLE +15, which is inside the range the manual itself steers to', () => {
    // §6.1: `((65 - 50) / 50) * 50` is 15, on a control the manual describes as pleasant between
    // +10 and +16. The point is uncited (0 is the authored value, not a manual claim), so the
    // provenance stays provisional and carries the knob that moved it — invariant 4 either way.
    const param = shuffleOf(['roland-sp-404mk2'], 'hip-hop')
    expect(param?.value).toBe(15)
    expect(param?.provenance).toMatchObject({ from: 0, axes: ['swing'] })
  })

  it('is what the reader gets without touching anything, which is the whole issue', () => {
    // The pre-#310 answer, kept as the contrast: the same rig and direction, resolved at the
    // mood the studio used to open at, prints the manual's own "0 is straight".
    expect(shuffleOf(['roland-sp-404mk2'], 'hip-hop', moodState())?.value).toBe(0)
  })

  it('leaves a box that declines the axis alone', () => {
    // §6.1 declines by silence, not by a flag, so a direction opening at swing 65 changes
    // nothing on a box with no parameter that declares the axis. Nothing to assert on the
    // SHUFFLE itself here — there is none — so this is the guide, byte for byte.
    if (TECHNO === undefined || HIP_HOP === undefined) throw new Error('missing direction')
    const devices = DEVICES.filter((d) => d.id === 'moog-mother-32')
    // Not a vacuous comparison of two empty guides: the box does get a part here.
    expect(resolve({ devices, template: HIP_HOP, seed: 3 }).assignments.length).toBeGreaterThan(0)
    const swung = renderGuide(resolve({ devices, template: HIP_HOP, seed: 3 }))
    const straight = renderGuide(
      resolve({ devices, template: HIP_HOP, seed: 3, mood: moodState() }),
    )
    expect(swung).toBe(straight)
  })
})

// ---------------------------------------------------------------------------
// The two layers, and which one wins
// ---------------------------------------------------------------------------

describe('a mood on the link beats the direction, always (#310, #304)', () => {
  it('resolves a shared straight hip-hop straight', () => {
    // #304's rule for the clock source, applied to the same seam: a link carries the guide its
    // sender saw, so a direction's opening mood must not reach past one.
    expect(shuffleOf(['roland-sp-404mk2'], 'hip-hop', moodState())?.value).toBe(0)
    expect(shuffleOf(['roland-sp-404mk2'], 'hip-hop', moodState({ swing: 20 }))?.value).toBe(-30)
  })

  it('survives the round trip, so the link is what carries it', () => {
    const inputs: GuideInputsV1 = {
      version: FORMAT_VERSION,
      devices: ['roland-sp-404mk2'],
      templateId: 'hip-hop',
      inspirations: [],
      mood: moodState(),
      seed: 1,
    }
    const decoded = decodeGuideInputs(encodeGuideInputs(inputs, REGISTRY), REGISTRY)
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return
    expect(decoded.inputs.mood).toEqual(moodState())
    expect(shuffleOf(['roland-sp-404mk2'], 'hip-hop', decoded.inputs.mood)?.value).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// The wire
// ---------------------------------------------------------------------------

describe('the format carries an absent mood, and older links keep theirs (#310)', () => {
  const base: GuideInputsV1 = {
    version: FORMAT_VERSION,
    devices: ['roland-sp-404mk2'],
    templateId: 'hip-hop',
    inspirations: [],
    seed: 1,
  }

  it('bumped the format and not the engine', () => {
    /**
     * Named rather than asserted against a variable, so a bump is a decision somebody wrote down
     * rather than a number that drifted. #310 took this to 3 for the optional mood; §7.5/#340
     * took it to 4 for `placement`, which is the same kind of change again — a field that exists
     * now and did not before, whose absence an older link must be read as a state rather than as
     * corruption.
     */
    expect(FORMAT_VERSION).toBe(4)
    /**
     * The engine went 5 to 6 for §2.3/#25's device-global resources, which is a change to what
     * the resolver *decides* and carries its own entry in `RESOLVER_VERSION`'s history. What this
     * test is about is that widening the input set is not that kind of change — the reading
     * beside `SongOverrides`, applied to #161's two fields, then #200's, then #340's.
     */
    expect(RESOLVER_VERSION).toBe(6)
  })

  it('writes no axis at all when the reader has set no mood', () => {
    const query = encodeGuideInputs(base, REGISTRY)
    for (const axis of ['darkness', 'density', 'grit', 'swing', 'space']) {
      expect(query).not.toContain(`${axis}=`)
    }
    expect(query).toContain('template=hip-hop')
  })

  it('reads it back as unset rather than as neutral, and re-encodes to the same bytes', () => {
    const query = encodeGuideInputs(base, REGISTRY)
    const decoded = decodeGuideInputs(query, REGISTRY)
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return
    // The distinction the whole field rests on. Neutral would resolve straight; unset resolves
    // at the direction's mood.
    expect(decoded.inputs.mood).toBeUndefined()
    expect(encodeGuideInputs(decoded.inputs, REGISTRY)).toBe(query)
    expect(shuffleOf(['roland-sp-404mk2'], 'hip-hop', decoded.inputs.mood)?.value).toBe(15)
  })

  it('refuses a partial mood, because an override is total', () => {
    const partial = `format=${FORMAT_VERSION}&resolver=${RESOLVER_VERSION}&template=hip-hop&swing=70&seed=1`
    const decoded = decodeGuideInputs(partial, REGISTRY)
    expect(decoded.ok).toBe(false)
    if (decoded.ok) return
    expect(decoded.reason).toBe('malformed')
  })

  it('still requires all five axes of a v1 or v2 link', () => {
    // Every build before this one wrote the reader's mood as the only mood there was, so silence
    // in an older link is corruption rather than "follow the direction".
    for (const version of [1, 2]) {
      const query = `format=${version}&resolver=${RESOLVER_VERSION}&template=hip-hop&seed=1`
      const decoded = decodeGuideInputs(query, REGISTRY)
      expect(decoded.ok).toBe(false)
    }
  })

  it('reads a v2 link as the explicit mood it carries, and keeps its other fields', () => {
    // The regression this bump could have caused: `bpm`, `key` and `clock` arrived in v2, and
    // the drop rule used to be "older than current", which would now throw them away.
    const query =
      `format=2&resolver=${RESOLVER_VERSION}&device=roland-sp-404mk2&template=hip-hop` +
      `&darkness=50&density=50&grit=50&swing=50&space=50&bpm=88&seed=1`
    const decoded = decodeGuideInputs(query, REGISTRY)
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return
    expect(decoded.inputs.mood).toEqual(moodState())
    expect(decoded.inputs.bpm).toBe(88)
    expect(decoded.dropped).toEqual([])
    // Sticky: re-encoded at v3 it still carries the mood its sender saw, not the direction's.
    expect(encodeGuideInputs(decoded.inputs, REGISTRY)).toContain('swing=50')
  })

  it('still drops what a v1 link never had', () => {
    const query =
      `format=1&resolver=${RESOLVER_VERSION}&template=hip-hop` +
      `&darkness=50&density=50&grit=50&swing=50&space=50&bpm=88&seed=1`
    const decoded = decodeGuideInputs(query, REGISTRY)
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return
    expect(decoded.inputs.bpm).toBeUndefined()
    expect(decoded.dropped).toEqual(['bpm'])
  })
})

// ---------------------------------------------------------------------------
// The studio
// ---------------------------------------------------------------------------

describe('the studio shows the mood in force, and takes it on the first edit (#310)', () => {
  it('opens at the direction, not at neutral', () => {
    const onHipHop = withTemplate(DEFAULT_INPUTS, 'hip-hop')
    expect(onHipHop.mood).toBeUndefined()
    expect(effectiveMood(onHipHop).swing).toBe(65)
  })

  it('follows a direction change while nothing is set', () => {
    const swung = withTemplate(DEFAULT_INPUTS, 'hip-hop')
    const back = withTemplate(swung, 'industrial-techno')
    expect(effectiveMood(back)).toEqual(moodState())
    expect(effectiveMood(withTemplate(back, 'hip-hop')).swing).toBe(65)
  })

  it('takes the whole effective state on the first knob edit', () => {
    // Not `{ grit: 30 }` over an absent mood: all five axes, read off what was on screen. That
    // is what makes the override total, and what makes the next direction change leave it alone.
    const onHipHop = withTemplate(DEFAULT_INPUTS, 'hip-hop')
    const edited = withAxis(onHipHop, 'grit', 30, effectiveMood(onHipHop))
    expect(edited.mood).toEqual(moodState({ swing: 65, grit: 30 }))
  })

  it('stops following the direction once the reader has touched a knob', () => {
    const onHipHop = withTemplate(DEFAULT_INPUTS, 'hip-hop')
    const edited = withAxis(onHipHop, 'grit', 30, effectiveMood(onHipHop))
    const moved = withTemplate(edited, 'industrial-techno')
    // Sticky, exactly as #161's tempo is: changing direction leaves the knobs where the reader
    // put them, including the swing they inherited from the direction they were on.
    expect(effectiveMood(moved)).toEqual(moodState({ swing: 65, grit: 30 }))
  })

  it('shows neutral when there is no direction to open at', () => {
    // An unknown id composes to nothing, and the panel still draws five knobs. Drawing them at
    // the mood of a direction that is not being resolved would be the one dishonest answer.
    expect(effectiveMood(withTemplate(DEFAULT_INPUTS, 'no-such-direction'))).toEqual(moodState())
  })

  it('is what the resolver used, so the knobs cannot disagree with the guide', () => {
    // Two routes to one fact is the failure mode this asserts against (#33): `effectiveMood`
    // answers the panel and `resolve` answers the guide, and they must not be able to differ.
    if (HIP_HOP === undefined) throw new Error('missing direction')
    const onHipHop = withTemplate(DEFAULT_INPUTS, 'hip-hop')
    const shown = effectiveMood(onHipHop)
    const devices = DEVICES.filter((d) => d.id === 'roland-sp-404mk2')
    expect(renderGuide(resolve({ devices, template: HIP_HOP, seed: 1 }))).toBe(
      renderGuide(resolve({ devices, template: HIP_HOP, seed: 1, mood: shown })),
    )
  })

  it('opens the landing page exactly where it used to', () => {
    // `DEFAULT_INPUTS` carried `{ ...NEUTRAL_MOOD, density: DENSITY_DETENTS[1] }` before this,
    // and dropping it is only safe because the middle detent *is* neutral. If a detent moves,
    // this fails rather than the landing page quietly opening somewhere else.
    expect(DENSITY_DETENTS[1]).toBe(50)
    expect(effectiveMood(DEFAULT_INPUTS)).toEqual(moodState())
    expect(DEFAULT_INPUTS.mood).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// What did not move
// ---------------------------------------------------------------------------

describe('a direction that states no mood resolves as it always did (#310)', () => {
  it('is byte-identical with the mood absent and with it neutral', () => {
    // Why `RESOLVER_VERSION` did not move. Every guide ever shared carried an explicit mood, and
    // every direction but one states none — so the field widened the input set without moving a
    // single byte of what the old inputs produce. Asserted, not assumed (#161's own reading).
    if (TECHNO === undefined) throw new Error('missing direction')
    const devices = DEVICES.filter((d) =>
      ['roland-tr-1000', 'polyend-tracker-mini', 'roland-sp-404mk2'].includes(d.id),
    )
    for (const seed of [1, 7, 15]) {
      const absent = resolve({ devices, template: TECHNO, seed })
      const neutral = resolve({ devices, template: TECHNO, seed, mood: moodState() })
      expect(renderGuide(absent)).toBe(renderGuide(neutral))
      expect(absent).toEqual(neutral)
    }
  })

  it('holds for every direction in the library that states no mood', () => {
    const devices = DEVICES.filter((d) => d.id === 'roland-sp-404mk2')
    const moodless = TEMPLATES.filter((t) => t.mood === undefined)
    // A guard on the guard: if every direction grew a mood this test would pass by being empty.
    expect(moodless.length).toBeGreaterThan(1)
    for (const t of moodless) {
      expect(renderGuide(resolve({ devices, template: t, seed: 4 }))).toBe(
        renderGuide(resolve({ devices, template: t, seed: 4, mood: moodState() })),
      )
    }
  })

  it('resolves hip-hop differently from neutral, or none of the above proves anything', () => {
    if (HIP_HOP === undefined || SP404 === undefined) throw new Error('missing fixture')
    const devices = [SP404]
    expect(renderGuide(resolve({ devices, template: HIP_HOP, seed: 4 }))).not.toBe(
      renderGuide(resolve({ devices, template: HIP_HOP, seed: 4, mood: moodState() })),
    )
  })
})

/**
 * §6/#317. Which axes the panel credits to the direction.
 *
 * The gap this closes: the panel showed swing at 65 on Hip-hop with nothing saying where 65 came
 * from, while #161's song panel has distinguished `template` from `user` for tempo and key since
 * it landed. Mood became the third template-owned value in #310 and was the only one that stayed
 * silent about its source.
 */
describe('crediting the direction for a mood the reader did not set (#317)', () => {
  const hipHop = TEMPLATES.find((t) => t.id === 'hip-hop')
  const opening = hipHop?.mood ?? {}

  const inputsFor = (over: Partial<GuideInputsV1> = {}): GuideInputsV1 => ({
    version: FORMAT_VERSION,
    devices: [],
    templateId: 'hip-hop',
    inspirations: [],
    seed: 1,
    ...over,
  })

  it('credits every axis the direction states, before anyone touches a knob', () => {
    expect(Object.keys(opening).length).toBeGreaterThan(0)
    expect(moodFromDirection(inputsFor())).toEqual(opening)
  })

  /**
   * The reason this is derived rather than stored, and the assertion that would have caught the
   * stored version. `withAxis` writes the whole effective mood back on the first twist, so after
   * one move the inputs carry all five axes — and a flag set at selection time would call every
   * one of them the reader's, including the ones still sitting where the direction put them.
   */
  it('keeps crediting the untouched axes after the reader moves a different one', () => {
    const showing = effectiveMood(inputsFor())
    const moved = withAxis(inputsFor(), 'space', 90, showing)
    expect(moved.mood?.space).toBe(90)
    // Swing is untouched and still the direction's, so it is still credited.
    expect(moodFromDirection(moved)).toEqual(opening)
  })

  it('stops crediting an axis the reader moves off the direction’s value', () => {
    const axis = Object.keys(opening)[0] as MoodAxis
    const stated = opening[axis] as number
    const showing = effectiveMood(inputsFor())
    const moved = withAxis(inputsFor(), axis, stated === 0 ? 1 : stated - 1, showing)
    expect(moodFromDirection(moved)[axis]).toBeUndefined()
  })

  it('credits nothing for a direction that states no mood', () => {
    const plain = TEMPLATES.find((t) => t.mood === undefined)
    expect(plain).toBeDefined()
    expect(moodFromDirection(inputsFor({ templateId: (plain as { id: string }).id }))).toEqual({})
  })

  /**
   * Honest about its one false positive rather than hiding it: a reader who dials an axis to
   * exactly what the direction asked for is told the direction set it. The value *is* what the
   * direction wanted, so nothing a reader could act on is misreported — and the alternative is
   * the stale flag the test above rules out.
   */
  it('cannot tell a reader who set the direction’s own value apart from the direction', () => {
    const axis = Object.keys(opening)[0] as MoodAxis
    const stated = opening[axis] as number
    const showing = effectiveMood(inputsFor())
    const same = withAxis(inputsFor(), axis, stated, showing)
    expect(moodFromDirection(same)[axis]).toBe(stated)
  })
})
