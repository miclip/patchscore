import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { NEUTRAL_MOOD, renderGuide, resolve } from '../lib/core/index'
import type { Device, ResolveResult, Template } from '../lib/core/index'
import { Guide } from '../components/guide/guide'
import { Rack } from '../components/rack/rack'
import { rackModel } from '../components/rack/model'
import { device as cascadia } from '../lib/devices/intellijel-cascadia/index'
import { device as crave } from '../lib/devices/behringer-crave/index'
import { device as metropolix } from '../lib/devices/intellijel-metropolix/index'
import { device as trackerMini } from '../lib/devices/polyend-tracker-mini/index'
import { TEMPLATES } from '../lib/templates/index'

/**
 * §3.3 reaching a reader: the rack drawing, the Markdown guide, and the page.
 *
 * The pass decides; these three render. So what is pinned here is not "did it route" — that is
 * `inter-device-patch.test.ts` — but that **all three say the same thing about the same rig**, and
 * that each of them says it in a form somebody at a rack can act on. The standing rule in these
 * renderers is one right answer and two hand-written vocabularies (#33), so the assertions below
 * check the *facts* in each rendering rather than expecting one sentence in three places.
 *
 * The gap cases carry as much weight as the routed one, and for the reason invariant 5 exists: a
 * drawing that omits the sockets of a box nothing can drive looks like a box that does not take
 * pitch and gate. Drawn and dead is the honest picture, and there is a test for it below.
 */

const FIRST = TEMPLATES[0]
if (FIRST === undefined) throw new Error('no templates')
const TEMPLATE: Template = FIRST

function run(devices: Device[]): ResolveResult {
  return resolve({ devices, template: TEMPLATE, mood: NEUTRAL_MOOD, seed: 1 })
}

function rackHtml(result: ResolveResult): string {
  return renderToStaticMarkup(createElement(Rack, { result }))
}

function guideHtml(result: ResolveResult): string {
  return renderToStaticMarkup(createElement(Guide, { result, seed: 1 }))
}

/** Tags out, entities back, so a jack id with a `·` in it can be matched as a reader sees it. */
function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
}

const CASCADIA_CRAVE = run([cascadia, crave])

describe('the rack model carries voice control (§3.3)', () => {
  it('draws the two Cascadia runs as cables of their own, not as clock', () => {
    const model = rackModel(CASCADIA_CRAVE)

    // Two arrays, deliberately — see `VoiceCable`. The clock count stays a length rather than
    // becoming a filter, on the one question this drawing answered first.
    expect(model.cables).toHaveLength(1)
    expect(model.cables[0]?.toDeviceId).toBe(crave.id)
    expect(model.voiceCables.map((c) => [c.signal, c.fromJack, c.toJack])).toEqual([
      ['pitch-cv', 'MIDI / CV · MIDI PITCH', 'IN · OSC CV'],
      ['gate', 'MIDI / CV · MIDI GATE', 'IN · ENV GATE'],
    ])
    expect(model.voiceCables.every((c) => c.fromDeviceId === cascadia.id)).toBe(true)
    expect(model.voiceCables.every((c) => c.toDeviceId === crave.id)).toBe(true)
  })

  it('adds a rail jack for every jack id a cable names, and marks it live', () => {
    const model = rackModel(CASCADIA_CRAVE)
    const jacksOf = (deviceId: string) =>
      model.panels.find((p) => p.deviceId === deviceId)?.jacks ?? []

    const outs = jacksOf(cascadia.id).filter((j) => j.kind === 'voice-out')
    const ins = jacksOf(crave.id).filter((j) => j.kind === 'voice-in')
    expect(outs.map((j) => j.id)).toEqual(['MIDI / CV · MIDI PITCH', 'MIDI / CV · MIDI GATE'])
    expect(ins.map((j) => j.id)).toEqual(['IN · OSC CV', 'IN · ENV GATE'])
    expect([...outs, ...ins].every((j) => j.live === true)).toBe(true)

    // The label is the silkscreen, not the id: `MIDI / CV · MIDI PITCH` is not printed on any
    // panel, and `MIDI PITCH` is.
    expect(outs.map((j) => j.label)).toEqual(['MIDI PITCH', 'MIDI GATE'])
    expect(ins.map((j) => j.label)).toEqual(['OSC CV', 'ENV GATE'])
  })

  it('keeps the qualified id as the label where the bare name repeats on one panel', () => {
    // The Metropolix silkscreens a bare `PITCH` and `GATE` under `TRK 1` / `TRK 2` column headers.
    // This rail has no column headers, so stripping the section would draw two sockets labelled
    // `PITCH` with nothing to tell a reader which is track 1.
    const model = rackModel(run([metropolix, cascadia, crave]))
    const metro = model.panels.find((p) => p.deviceId === metropolix.id)
    expect(metro?.jacks.filter((j) => j.kind === 'voice-out').map((j) => j.label)).toEqual([
      'TRK 1 · PITCH',
      'TRK 1 · GATE',
      'TRK 2 · PITCH',
      'TRK 2 · GATE',
    ])
  })

  it('lands each cable exactly on the socket it names', () => {
    // The drawing and the model must not disagree about where a hole is: a cable end floating
    // beside a socket is the same class of defect as a socket the manifest never declared.
    const model = rackModel(CASCADIA_CRAVE)
    for (const cable of model.voiceCables) {
      const from = model.panels.find((p) => p.deviceId === cable.fromDeviceId)
      const to = model.panels.find((p) => p.deviceId === cable.toDeviceId)
      const fromJack = from?.jacks.find((j) => j.id === cable.fromJack)
      const toJack = to?.jacks.find((j) => j.id === cable.toJack)
      expect(fromJack, cable.fromJack).toBeDefined()
      expect(toJack, cable.toJack).toBeDefined()
      expect(cable.from).toEqual({
        x: (from?.xMm ?? 0) + (fromJack?.at.x ?? 0),
        y: (from?.topMm ?? 0) + (fromJack?.at.y ?? 0),
      })
      expect(cable.to).toEqual({
        x: (to?.xMm ?? 0) + (toJack?.at.x ?? 0),
        y: (to?.topMm ?? 0) + (toJack?.at.y ?? 0),
      })
    }
  })

  it('never puts two sockets on one rail in the same place', () => {
    // Voice sockets are placed first and the audio row starts clear of them. This is the assertion
    // that keeps that true as spans and out counts change — a socket drawn under another socket is
    // worse than one counted in `hiddenJacks`.
    for (const devices of [
      [cascadia, crave],
      [metropolix, cascadia, crave],
      [trackerMini, cascadia, crave],
    ]) {
      for (const panel of rackModel(run(devices)).panels) {
        const seen = new Set<string>()
        for (const jack of panel.jacks) {
          const key = `${Math.round(jack.at.x)},${Math.round(jack.at.y)}`
          expect(seen.has(key), `${panel.deviceId} ${jack.id} at ${key}`).toBe(false)
          seen.add(key)
        }
      }
    }
  })

  it('keeps every voice socket inside its own panel, so the figure never widens', () => {
    /**
     * #21's standing rules for the rack: the diagram must not scroll horizontally and must not be
     * squashed to fit. Voice sockets are placed *inside* a panel's span, so they never widen a
     * panel — that is what is checked here, per socket and per cable end.
     *
     * **The figure as a whole is a weaker claim and worth stating precisely.** Same-row runs use no
     * gutter, so at the default per-row cap — every rig the library builds today — the figure's
     * width is untouched. An *inter-row* voice run does widen it, because gutters are reserved from
     * a count of runs shared with the clock: wrapped to one box per row, this rig's left gutter
     * goes 28 mm to 64 mm. That is the machinery being shared rather than duplicated, and the
     * viewBox is in millimetres either way, so a wider figure scales rather than scrolling.
     */
    for (const devices of [
      [cascadia, crave],
      [metropolix, cascadia, crave],
    ]) {
      const model = rackModel(run(devices))
      for (const panel of model.panels) {
        for (const jack of panel.jacks.filter((j) => j.kind.startsWith('voice'))) {
          expect(jack.at.x, `${panel.deviceId} ${jack.id}`).toBeGreaterThan(0)
          expect(jack.at.x, `${panel.deviceId} ${jack.id}`).toBeLessThan(panel.spanMm)
        }
      }
      for (const cable of model.voiceCables) {
        expect(cable.from.x).toBeGreaterThanOrEqual(model.leftGutterMm)
        expect(cable.to.x).toBeLessThanOrEqual(model.totalMm - model.rightGutterMm)
      }
    }
  })

  it('gates the voice cable animation on reduced motion, like the clock cable', () => {
    // #21 names the cable animation as the thing to gate, and the rule there is that the drawing
    // stays comprehensible without it. The dash pattern that makes a draw-on possible has to live
    // INSIDE the query, or a reader with reduced motion gets an invisible cable waiting for a
    // keyframe that never runs — which is why this is asserted on the stylesheet and not assumed.
    const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')
    const gate = css.indexOf('@media (prefers-reduced-motion: no-preference)')
    expect(gate).toBeGreaterThan(-1)
    const gated = css.slice(gate, css.indexOf('@keyframes rack-draw'))
    expect(gated).toContain('.rack-voice-cable-core')
    expect(gated).toContain('animation-delay')
    // Outside the gate, the voice cable is a plain solid stroke: no dash, no animation. Matched on
    // the declarations rather than the word, since the comment above the query says "animation"
    // while declaring nothing.
    const ungated = css.slice(css.indexOf('.rack-voice-cable-casing'), gate)
    expect(ungated).toContain('.rack-voice-cable-core')
    expect(ungated).not.toContain('animation:')
    expect(ungated).not.toContain('animation-delay:')
    expect(ungated).not.toContain('stroke-dasharray:')
  })

  it('keeps internal recipe patches listed and not drawn', () => {
    // §3.3's within-a-box cables are still carried and still not cabled between panels. The rack
    // grew inter-device cables in this slice; it did not grow on-panel ones, and a patch entry
    // turning into a rail cable would be the drawing inventing an endpoint.
    const model = rackModel(CASCADIA_CRAVE)
    const internal = model.panels.flatMap((p) => p.internalPatch)
    expect(internal.length).toBeGreaterThan(0)
    for (const entry of internal) {
      expect(model.voiceCables.some((c) => c.fromJack === entry.from && c.toJack === entry.to)).toBe(
        false,
      )
    }
  })
})

describe('the rack draws and states voice control (§3.3)', () => {
  it('draws every voice cable, distinguishably from the clock cable', () => {
    const model = rackModel(CASCADIA_CRAVE)
    const html = rackHtml(CASCADIA_CRAVE)

    expect((html.match(/class="rack-voice-cable"/g) ?? []).length).toBe(model.voiceCables.length)
    // The clock count is unchanged by the new cables: `rack-cable` still matches exactly the runs
    // §7.4 decided, which is why the two are separate classes rather than one with a modifier.
    expect((html.match(/class="rack-cable"/g) ?? []).length).toBe(model.cables.length)
    for (const cable of model.voiceCables) expect(html).toContain(cable.d)
    expect(html).toContain('data-signal="pitch-cv"')
    expect(html).toContain('data-signal="gate"')
  })

  it('marks the voice sockets live in the markup', () => {
    const html = rackHtml(CASCADIA_CRAVE)
    expect(html).toContain('data-kind="voice-out"')
    expect(html).toContain('data-kind="voice-in"')
    expect(html).not.toContain('data-kind="voice-in" data-live="no"')
  })

  it('names both boxes and both jacks beside the drawing', () => {
    const body = text(rackHtml(CASCADIA_CRAVE))
    expect(body).toContain('Voice control')
    expect(body).toContain('Cascadia')
    expect(body).toContain('MIDI / CV · MIDI PITCH')
    expect(body).toContain('MIDI / CV · MIDI GATE')
    expect(body).toContain('IN · OSC CV')
    expect(body).toContain('IN · ENV GATE')
    // The caption stops claiming the figure is clock-only once it is not.
    expect(body).toContain('Clock and voice-control routing')
  })

  it('says the omission is audio, now that it is no longer clock-only', () => {
    const body = text(rackHtml(CASCADIA_CRAVE))
    expect(body).toContain('Clock and voice control only')
    expect(body).toContain('Audio paths are not drawn')
  })
})

describe('both rig renderers instruct the reader (§3.3)', () => {
  it('names both devices and both jack ids in the Markdown', () => {
    const md = renderGuide(CASCADIA_CRAVE)
    expect(md).toContain('**Voice control** — Cascadia sends the notes')
    expect(md).toContain('- pitch: Cascadia `MIDI / CV · MIDI PITCH` → CRAVE `IN · OSC CV`')
    expect(md).toContain('- gate: Cascadia `MIDI / CV · MIDI GATE` → CRAVE `IN · ENV GATE`')
  })

  it('says why that box, in words that cannot be read as advice', () => {
    // #121's lesson, applied to a second decision: a deterministic tie-break and somebody's
    // judgement must not reach a reader identically. Cascadia is the clock source here, so the
    // first ranking key is what chose it, and the guide says exactly that.
    const md = renderGuide(CASCADIA_CRAVE)
    expect(md).toContain('Why this box sends them — it is already the clock source')
    // And not the clock block's own opening, which asks a different question. Two lines starting
    // the same way on one page is the readability problem #35 is about.
    expect(md.match(/Why this box —/g) ?? []).toHaveLength(1)
  })

  it('says the same facts on the page, in the page’s own words', () => {
    const body = text(guideHtml(CASCADIA_CRAVE))
    expect(body).toContain('Voice control')
    expect(body).toContain('Cascadia sends the notes')
    expect(body).toContain('MIDI / CV · MIDI PITCH')
    expect(body).toContain('IN · ENV GATE')
    expect(body).toContain('Why this box sends them')
  })
})

describe('the gap cases are rendered, not omitted (§3.3)', () => {
  /**
   * A box that takes pitch and gate, in a rig where nothing sends them.
   *
   * **No rig of real manifests can reach this state today, and that is worth saying rather than
   * working around.** The two boxes in the library with an input bundle — the Cascadia and the
   * CRAVE — each have an output bundle as well, so any rig containing a target also contains a
   * source. A Tracker Mini and a CRAVE, which looks like the case, is `no-target`: the CRAVE is
   * the only box offering a pair, so it becomes the source and a source is excluded from its own
   * target list. Correct, and not the case under test.
   *
   * So the fixture is the CRAVE with one field changed: `OUT · KB CV` carries plain `cv` instead
   * of `pitch-cv`. Every id and every recipe is the real manifest's; what changes is that its
   * keyboard output is no longer documented as a note, which is a state a manifest can honestly be
   * in. It also exercises the relation from the other side — a `cv` output is not accepted at a
   * `pitch-cv` input, which is the refusal the member was split out to make.
   */
  const unpitched: Device = {
    ...crave,
    jacks: (crave.jacks ?? []).map((jack) =>
      jack.id === 'OUT · KB CV' ? { ...jack, signal: ['cv'] as const } : jack,
    ),
  }
  const orphaned = run([trackerMini, unpitched])

  it('reports no-compatible-pair rather than an empty list', () => {
    expect(orphaned.interDevicePatch.outcome).toBe('no-compatible-pair')
    expect(orphaned.interDevicePatch.source).toBeUndefined()
    expect(orphaned.interDevicePatch.targets.map((t) => t.outcome)).toEqual([
      'no-compatible-source',
    ])
  })

  it('draws the sockets dead rather than leaving them off', () => {
    // The whole argument for this case existing in the model. Omitting the sockets would draw a
    // CRAVE that does not take a note and a gate, which is not what the manifest says.
    const model = rackModel(orphaned)
    expect(model.voiceCables).toEqual([])

    const panel = model.panels.find((p) => p.deviceId === crave.id)
    const voice = panel?.jacks.filter((j) => j.kind === 'voice-in') ?? []
    expect(voice.map((j) => j.id)).toEqual(['IN · OSC CV', 'IN · ENV GATE'])
    expect(voice.every((j) => j.live === false)).toBe(true)

    const html = rackHtml(orphaned)
    expect(html).toContain('data-kind="voice-in" data-live="no"')
    expect(html).not.toContain('class="rack-voice-cable"')
    // A figure with no voice cables says so where it says the rest of what it is not drawing.
    expect(text(html)).toContain('No voice-control cables')
    expect(text(html)).toContain('nothing in this rig sends one')
  })

  it('tells the reader what to do about it, in both renderers', () => {
    const md = renderGuide(orphaned)
    expect(md).toContain('**No voice control** — nothing in this rig sends a note and a gate')
    expect(md).toContain('- CRAVE `IN · OSC CV` and `IN · ENV GATE`')
    expect(md).toContain('play it from its own keyboard or sequencer')

    const body = text(guideHtml(orphaned))
    expect(body).toContain('No voice control')
    expect(body).toContain('IN · OSC CV')
    expect(body).toContain('or add a box that can drive it')
  })

  it('says nothing at all when no box in the rig takes pitch and gate', () => {
    // A rig of grooveboxes is not missing a cable, and `no-target` is how that differs from the
    // case above. Silence is the correct rendering, and it is asserted rather than assumed.
    const grooveboxes = run([trackerMini])
    expect(grooveboxes.interDevicePatch.outcome).toBe('no-target')
    expect(renderGuide(grooveboxes)).not.toContain('Voice control')
    expect(renderGuide(grooveboxes)).not.toContain('No voice control')
    expect(text(rackHtml(grooveboxes))).not.toContain('Voice control')
  })
})
