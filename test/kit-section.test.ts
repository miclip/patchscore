import { describe, expect, it } from 'vitest'
import { ROLES } from '../lib/core/index'
import type { Device, Role } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { KIT_MINIMUM, KIT_ROLES, devicePage, kitRecipes } from '../lib/studio/device-page'
import { renderToStaticMarkup } from 'react-dom/server'
import DevicePageRoute from '../app/devices/[id]/page'

/**
 * #478. **The drum sounds a box makes from scratch**, selected off the device page.
 *
 * The selection is the whole feature — no recipe was written for it and no renderer exists yet —
 * so what is worth pinning is which recipes come back, in what order, and which boxes are not
 * allowed to make the claim at all.
 */

const byId = (id: string): Device => {
  const device = DEVICES.find((d) => d.id === id)
  if (device === undefined) throw new Error(`no device ${id}`)
  return device
}

const CASCADIA = byId('intellijel-cascadia')

describe('kit roles', () => {
  it('names twelve roles, each of them a role, none of them twice', () => {
    expect(KIT_ROLES.length).toBe(12)
    expect(new Set(KIT_ROLES).size).toBe(12)
    for (const role of KIT_ROLES) expect(ROLES).toContain(role)
  })

  it('leaves out the parts a kit plays under rather than consists of', () => {
    // The tonal roles, the two low roles a kick sits on top of, `texture`, and the two §4.2
    // transitions that last bars rather than one shot. `impact` is the transitional role that
    // stays, because a one-shot is what it already is.
    for (const role of ['sub', 'bass-mid', 'texture', 'pad', 'lead', 'stab', 'arp', 'acid',
      'vox-chop', 'riser', 'sweep'] as const) {
      expect(KIT_ROLES).not.toContain(role)
    }
    expect(KIT_ROLES).toContain('impact')
  })

  it('is not ROLES order, and differs where somebody at the machine works differently', () => {
    // Filed by register, `tom` sits under `body` after the metal and `ghost-perc` sits up in the
    // backbeat. Somebody sampling a kit lays the skins down first and reaches for the fills last.
    const filed = ROLES.filter((role) => KIT_ROLES.includes(role))
    expect(KIT_ROLES).not.toEqual(filed)
    expect(KIT_ROLES.indexOf('tom')).toBeLessThan(KIT_ROLES.indexOf('closed-hat'))
    expect(KIT_ROLES.indexOf('ghost-perc')).toBeGreaterThan(KIT_ROLES.indexOf('metallic'))
  })
})

describe('kit selection', () => {
  it('is what the device page carries', () => {
    for (const device of DEVICES) {
      expect(devicePage(device).kit, device.id).toEqual(kitRecipes(device))
    }
  })

  it('offers a kit on 24 boxes, 266 recipes between them', () => {
    // Measured against the library as it stands. A device landing with four kit sounds moves both
    // numbers, and this is the line that says so out loud rather than letting the total drift.
    const offering = DEVICES.filter((device) => kitRecipes(device).length > 0)
    expect(offering.length).toBe(24)
    expect(offering.reduce((n, device) => n + kitRecipes(device).length, 0)).toBe(266)
  })

  it('returns only kit roles, in kit order, on every box in the library', () => {
    for (const device of DEVICES) {
      const kit = kitRecipes(device)
      const positions = kit.map((recipe) => KIT_ROLES.indexOf(recipe.role))
      expect(positions.every((at) => at >= 0), device.id).toBe(true)
      expect(positions, device.id).toEqual(positions.slice().sort((a, b) => a - b))
    }
  })

  it('keeps manifest order inside a role, so two kicks stay two kicks', () => {
    for (const device of DEVICES) {
      const kit = kitRecipes(device)
      for (const role of KIT_ROLES) {
        const authored = device.recipes.filter(
          (recipe) => recipe.role === role && recipe.sourceAudio === undefined,
        )
        const selected = kit.filter((recipe) => recipe.role === role)
        if (kit.length === 0) continue
        expect(selected.map((r) => r.id), `${device.id} ${role}`).toEqual(authored.map((r) => r.id))
      }
    }
  })
})

describe('the Cascadia, which is the box the issue was reported about', () => {
  it('makes eight kit sounds across five roles', () => {
    const kit = kitRecipes(CASCADIA)
    expect(kit.length).toBe(8)
    expect([...new Set(kit.map((r) => r.role))]).toEqual(['kick', 'tom', 'metallic', 'noise', 'impact'])
  })

  it('sequences them skins first, and keeps both of each doubled sound', () => {
    // `tom` is authored after both `metallic` recipes in the manifest and comes out before them;
    // the two kicks, the two `metallic` and the two `noise` recipes each keep manifest order.
    expect(kitRecipes(CASCADIA).map((r) => r.id)).toEqual([
      'cascadia-kick-hard',
      'cascadia-kick-dirty',
      'cascadia-tom-hard',
      'cascadia-metallic-dark',
      'cascadia-metallic-hard',
      'cascadia-noise-dirty',
      'cascadia-noise-dark',
      'cascadia-impact-hard',
    ])
  })
})

describe('a recipe that loads audio is not a sound the box makes', () => {
  it('never returns one, anywhere in the library', () => {
    for (const device of DEVICES) {
      for (const recipe of kitRecipes(device)) {
        expect(recipe.sourceAudio, `${device.id} ${recipe.id}`).toBeUndefined()
      }
    }
  })

  it('offers no kit on a sampler that authors a full drum-role set', () => {
    const digitakt = byId('elektron-digitakt')
    const drumRole = digitakt.recipes.filter((r) => KIT_ROLES.includes(r.role))
    expect(drumRole.length).toBe(16)
    expect(drumRole.every((r) => r.sourceAudio !== undefined)).toBe(true)
    expect(kitRecipes(digitakt)).toEqual([])
  })

  it('splits a box that does both, per recipe rather than per device', () => {
    // The MPCs sample and synthesise. Eight of their thirteen drum-role recipes are patches for
    // the box's own engines; the other five tell the reader to go and load something.
    const mpc = byId('akai-mpc-live-iii')
    const drumRole = mpc.recipes.filter((r) => KIT_ROLES.includes(r.role))
    expect(drumRole.length).toBe(13)
    expect(kitRecipes(mpc).length).toBe(8)
  })
})

describe('below the threshold the claim is withheld, not the content', () => {
  it('says nothing on a box with fewer than four kit sounds', () => {
    // One voice at a couple of characters is not a kit. Each of these authors kit-role recipes
    // and each returns nothing.
    for (const [id, authored] of [
      ['arturia-microfreak', 2],
      ['moog-minitaur', 2],
      ['teenage-engineering-op-xy', 1],
    ] as const) {
      const device = byId(id)
      const qualifying = device.recipes.filter(
        (r) => r.sourceAudio === undefined && KIT_ROLES.includes(r.role),
      )
      expect(qualifying.length, id).toBe(authored)
      expect(qualifying.length, id).toBeLessThan(KIT_MINIMUM)
      expect(kitRecipes(device), id).toEqual([])
    }
  })

  it('offers one at exactly four', () => {
    const modelD = byId('behringer-model-d')
    expect(kitRecipes(modelD).length).toBe(KIT_MINIMUM)
    expect(kitRecipes(modelD).map((r) => r.role)).toEqual<Role[]>([
      'kick',
      'metallic',
      'noise',
      'impact',
    ])
  })
})

// ---------------------------------------------------------------------------
// The rendered section (#478). Prerendered markup, because that is what a reader receives:
// the page is a server component with no client boundary, so every value below is in the HTML
// whether or not anything on the machine can open a `<details>`.
// ---------------------------------------------------------------------------

async function markupFor(id: string): Promise<string> {
  return renderToStaticMarkup(await DevicePageRoute({ params: Promise.resolve({ id }) }))
}

describe('the Build a kit panel (#478)', () => {
  it('is on a box that makes a kit, and is not on one that does not', async () => {
    const cascadia = await markupFor('intellijel-cascadia')
    expect(cascadia).toContain('Build a kit')
    expect(cascadia.match(/class="disclosure kit-entry"/g)?.length).toBe(8)
    // Three sounds is not a kit, and the page makes no claim rather than a small one.
    for (const id of ['arturia-microfreak', 'moog-minitaur', 'teenage-engineering-op-xy']) {
      expect(await markupFor(id), id).not.toContain('Build a kit')
    }
    // A sampler authors drum-role recipes and makes none of these sounds itself.
    expect(await markupFor('elektron-digitakt')).not.toContain('Build a kit')
  })

  it('sits after the orientation blocks and before the citations', async () => {
    const markup = await markupFor('roland-tr-1000')
    // A reader is told what the box is and what it is cited against, then told it can build them
    // a kit. Filed under Parameter sources it would be a build instruction behind a bibliography.
    expect(markup.indexOf('>Provenance<')).toBeLessThan(markup.indexOf('>Build a kit<'))
    expect(markup.indexOf('>Build a kit<')).toBeLessThan(markup.indexOf('>Parameter sources<'))
  })

  it('closes every entry and still ships its contents', async () => {
    const markup = await markupFor('roland-tr-1000')
    // Nothing is open: 22 sounds expanded is a page nobody skims, which is #410's finding on the
    // panel below reached again.
    expect(markup).not.toContain('kit-entry" open')
    // And nothing is withheld by being closed. The value, its unit, its bounds, its jog and the
    // routing the settings are settings *of* are all in the bytes a crawler receives.
    expect(markup).toContain('<span class="param-name">SNAPPY</span>')
    expect(markup).toContain('<span class="value-now mono">70</span>')
    expect(markup).toContain('<span class="value-unit mono">%</span>')
    expect(markup).toContain('<span class="value-range mono">(0…100 %)</span>')
    expect(markup).toContain('class="kit-hint">Hold [SHIFT]+[GEN], select with [C6]</p>')
    expect(markup).toContain('Routing — INDIVIDUAL OUT SD')
    // A pattern-wide value is marked as one, or a reader sets it again for every sound in the kit.
    expect(markup).toContain('class="kit-scope">pattern-wide</span>')
  })

  it('draws the patch and the panel modules, in the shapes the guide draws them', async () => {
    const markup = await markupFor('behringer-neutron')
    // An internal cable, jack names monospace (§10) and the note the author wrote on it.
    expect(markup).toContain('<span class="mono">OUT · ENV2</span>')
    expect(markup).toContain('<span class="mono">IN · ATT1 IN</span>')
    // #385's module box, over authored parameters rather than resolved ones.
    expect(markup).toContain('<span class="module-led" aria-hidden="true"></span><span>OSC 1</span>')
    // An enum prints its option set where a numeric prints its bounds — the same legality gate.
    expect(markup).toContain('(Tone Mod, Square, Sawtooth, Triangular, Sine)')
  })

  it('keeps two sounds in the same role as two entries', async () => {
    const markup = await markupFor('intellijel-cascadia')
    const meta = [...markup.matchAll(/class="kit-meta mono">([^<]+)</g)].map((m) => m[1])
    // Skins, then metal, then the fills — and both kicks, both metallics and both noises survive.
    expect(meta).toEqual([
      'kick · hard',
      'kick · dirty',
      'tom · hard',
      'metallic · dark',
      'metallic · hard',
      'noise · dirty',
      'noise · dark',
      'impact · hard',
    ])
    // Two entries in one role are two different patches, and the titles are how a reader tells
    // them apart. Ordinals run 1…8 unbroken, because the copy tells them to work down the list.
    expect(markup).toContain('Sine kick: Envelope B dropped into VCO A pitch, filter bypassed to the amp')
    expect(markup).toContain('Folded kick: the wave folder back into the mixer, soft clip engaged')
    const ordinals = [...markup.matchAll(/class="kit-ordinal mono">(\d+)</g)].map((m) => m[1])
    expect(ordinals).toEqual(['1', '2', '3', '4', '5', '6', '7', '8'])
  })

  it('names no box to record into', async () => {
    // #478 puts the destination with the rig-derived prose. This surface knows one device.
    const markup = await markupFor('behringer-crave')
    const section = markup.slice(markup.indexOf('kit-section'), markup.indexOf('>Parameter sources<'))
    for (const other of ['SP-404', 'Digitakt', 'sampler', 'Tracker']) {
      expect(section, other).not.toContain(other)
    }
  })
})
