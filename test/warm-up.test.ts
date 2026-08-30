import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  DeviceSchema,
  moodState,
  quickTuneNotices,
  renderGuide,
  resolve,
  warmUpNotices,
} from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES } from '../lib/templates/index'
import { Guide } from '../components/guide/guide'

/**
 * §10/#263. **What a box needs before it holds pitch.**
 *
 * The half of the tuning question that is a property of the instrument rather than of the music.
 * What a part should be tuned *to* changes with the direction and is #264's; this is true every
 * session and comes off the manual.
 *
 * The value is in the rig rather than in any one entry: every one of these boxes says so in its
 * own first pages, and a reader with five machines in front of them would have to have read five
 * manuals and remembered which three mattered.
 */

const industrial = TEMPLATES.find((t) => t.id === 'industrial-techno')!
const rigOf = (...ids: string[]) => DEVICES.filter((d) => ids.includes(d.id))
const guide = (ids: string[]) =>
  renderGuide(resolve({ devices: rigOf(...ids), template: industrial, mood: moodState({}), seed: 3 }))

describe('warm-up is authored from the manual, in the shape the manual used', () => {
  /**
   * **The three shapes, and why `minutes` is optional.** This is the assertion that stops the next
   * author flattening them: a printed range, a floor with no ceiling, and a manual that declines
   * to give a number at all.
   */
  it('keeps a printed range as a range', () => {
    for (const id of ['moog-matriarch', 'moog-grandmother']) {
      const w = DEVICES.find((d) => d.id === id)?.warmUp
      expect(w?.minutes, id).toEqual({ min: 10, max: 15 })
    }
  })

  it('keeps a floor with no ceiling open', () => {
    // "15 minutes or more" (MODEL D p.12) and "about 15 minutes" (Minitaur p.4). Neither states a
    // ceiling, so neither invents one.
    for (const id of ['behringer-model-d', 'moog-minitaur']) {
      const w = DEVICES.find((d) => d.id === id)?.warmUp
      expect(w?.minutes?.min, id).toBe(15)
      expect(w?.minutes?.max, id).toBeUndefined()
    }
  })

  it('gives "a few minutes" no number at all', () => {
    // Invariant 5. The Subharmonicon and the Mother-32 both print "a few minutes"; turning that
    // into 5 would be a figure with no source behind it, and it would look exactly like the ones
    // that are real.
    for (const id of ['moog-subharmonicon', 'moog-mother-32']) {
      const w = DEVICES.find((d) => d.id === id)?.warmUp
      expect(w, id).toBeDefined()
      expect(w?.minutes, id).toBeUndefined()
      expect(w?.note.toLowerCase(), id).toContain('a few minutes')
    }
  })

  it('cites every entry, and refuses a ceiling under its floor', () => {
    for (const device of DEVICES) {
      if (device.warmUp === undefined) continue
      expect(device.warmUp.verified, device.id).not.toBe(false)
    }
    const bad = {
      ...DEVICES.find((d) => d.id === 'moog-matriarch')!,
      warmUp: { note: 'x', minutes: { min: 15, max: 10 }, verified: { kind: 'manual', source: 'x' } },
    }
    expect(DeviceSchema.safeParse(bad).success).toBe(false)
  })

  it('says nothing for the boxes whose manuals say nothing', () => {
    // Most of the library is digital and needs no warm-up. Silence is the honest rendering.
    const silent = DEVICES.filter((d) => d.warmUp === undefined)
    expect(silent.length).toBeGreaterThan(DEVICES.length / 2)
  })
})

describe('the rig is what makes it worth saying (§8)', () => {
  it('names the boxes in this rig that need it, and no others', () => {
    const rig = rigOf('moog-matriarch', 'moog-mother-32', 'roland-tr-1000', 'elektron-digitakt-ii')
    // Registry order, which is the order every other list in the guide uses — so a reader
    // comparing two lists compares them in the same order rather than re-sorting in their head.
    expect(warmUpNotices(rig).map((n) => n.device.id)).toEqual(['moog-matriarch', 'moog-mother-32'])
  })

  it('prints nothing at all when no box in the rig needs it', () => {
    const md = guide(['elektron-digitakt-ii', 'roland-tr-1000', 'akai-mpc-xl'])
    expect(md).not.toContain('Power on first')
  })

  it('reads as one box or several, rather than "2 boxs"', () => {
    expect(guide(['moog-minitaur', 'elektron-digitakt-ii', 'roland-tr-1000'])).toContain(
      '1 box here needs time before it holds pitch',
    )
    expect(guide(['moog-matriarch', 'moog-mother-32', 'roland-tr-1000'])).toContain(
      '2 boxes here need time before they hold pitch',
    )
  })

  it('comes before the cabling, because the time runs while you patch', () => {
    const md = guide(['moog-matriarch', 'roland-tr-1000'])
    expect(md.indexOf('Power on first')).toBeLessThan(md.indexOf('Clock source'))
  })

  it('carries the page, like any other authored claim', () => {
    expect(guide(['moog-matriarch', 'roland-tr-1000'])).toContain('Moog Matriarch Manual (012023), p.8')
  })

  it('says it in both renderers (#33)', () => {
    const result = resolve({
      devices: rigOf('moog-matriarch', 'roland-tr-1000'),
      template: industrial,
      mood: moodState({}),
      seed: 3,
    })
    const html = renderToStaticMarkup(createElement(Guide, { result, seed: 3 }))
    expect(html).toContain('Power on first')
    expect(html).toContain('10 to 15 minutes from cold')
  })
})

describe('calibration is a pointer, never a procedure (#263)', () => {
  /**
   * Both routines in the library are service work carried out inside the instrument, under the
   * makers' own cautions. The steps are deliberately absent: printing them on a public page would
   * read as an invitation, and a reader who followed one could void a warranty or be hurt.
   */
  it('says what it adjusts and what the maker warns, and never how', () => {
    for (const id of ['behringer-model-d', 'moog-mother-32']) {
      const c = DEVICES.find((d) => d.id === id)?.calibration
      expect(c, id).toBeDefined()
      expect(c?.caution, id).toBeTruthy()
      expect(c?.verified, id).not.toBe(false)
      // No numbered steps, and none of the words a procedure is written in.
      const text = `${c?.summary} ${c?.caution}`.toLowerCase()
      for (const step of ['step 1', 'turn the trimpot', 'adjust until', 'first,', 'then,']) {
        expect(text, `${id} reads like a procedure`).not.toContain(step)
      }
    }
  })

  it('keeps the caution the maker actually printed', () => {
    const mother = DEVICES.find((d) => d.id === 'moog-mother-32')!
    expect(mother.calibration?.caution).toContain('absolutely necessary')
    const modelD = DEVICES.find((d) => d.id === 'behringer-model-d')!
    expect(modelD.calibration?.caution).toContain('service technician')
  })

  it('stays off the guide, because it is not session work', () => {
    // The guide is read at a machine mid-session. A service routine belongs on the device page,
    // where somebody goes deliberately.
    const md = guide(['moog-mother-32', 'roland-tr-1000'])
    expect(md).not.toContain('trimpot')
    expect(md).not.toContain('absolutely necessary')
  })
})

/**
 * §10/#263. **The third shape: a tuning routine a player runs.**
 *
 * `warmUp` is time you wait. `calibration` is service work behind a maker's caution. This is
 * neither — a control on the front panel, pressed mid-session, over in seconds. The Muse is the
 * only box in the library that has one, and the distinction is load-bearing because *its own
 * manual carries both on one page*: QUICK TUNE beside the full TUNING and AUTOCAL routines that
 * Moog say not to run unless something is badly wrong.
 */
describe('a quick tune is a session action, not service work (#263)', () => {
  it('is separated from the calibration printed beside it on the same page', () => {
    const muse = DEVICES.find((d) => d.id === 'moog-muse')!
    expect(muse.quickTune).toBeDefined()
    expect(muse.calibration).toBeDefined()
    // Same page, two fields, because they are two different claims about what a reader should do.
    expect(muse.quickTune?.verified).toEqual(muse.calibration?.verified)
    expect(muse.calibration?.caution).toContain('significant problem')
    expect(muse.quickTune?.note.toLowerCase()).toContain('seconds')
  })

  it('carries the control a reader presses', () => {
    const muse = DEVICES.find((d) => d.id === 'moog-muse')!
    expect(muse.quickTune?.path).toBe('PROGRAMMER > TUNING > START QUICK TUNE')
  })

  it('reaches the guide, unlike a calibration', () => {
    // The distinction, tested where it matters: one of these is a thing to do now and the other
    // is not, and a reader at a rack must be able to tell them apart without reading the manual.
    const md = guide(['moog-muse', 'moog-dfam', 'roland-tr-1000'])
    expect(md).toContain('START QUICK TUNE')
    expect(md).not.toContain('AUTOCAL')
    expect(md).not.toContain('significant problem')
  })

  it('comes after the warm-up it depends on', () => {
    // A quick tune reads the current temperature, so running it cold reads the wrong conditions.
    const md = guide(['moog-muse', 'moog-dfam', 'roland-tr-1000'])
    expect(md.indexOf('Power on first')).toBeLessThan(md.indexOf('Once warm'))
  })

  it('says nothing for the boxes that have none, which is all but one', () => {
    expect(DEVICES.filter((d) => d.quickTune !== undefined).map((d) => d.id)).toEqual(['moog-muse'])
    expect(guide(['moog-dfam', 'roland-tr-1000'])).not.toContain('Once warm')
  })

  it('names it in both renderers (#33)', () => {
    const result = resolve({
      devices: rigOf('moog-muse', 'roland-tr-1000'),
      template: industrial,
      mood: moodState({}),
      seed: 3,
    })
    expect(quickTuneNotices(result.devices).map((n) => n.device.id)).toEqual(['moog-muse'])
    const html = renderToStaticMarkup(createElement(Guide, { result, seed: 3 }))
    expect(html).toContain('Once warm')
    expect(html).toContain('START QUICK TUNE')
  })
})

describe('the DFAM joins the boxes with no printed number (#263)', () => {
  it('carries the note and no minutes', () => {
    const dfam = DEVICES.find((d) => d.id === 'moog-dfam')!
    expect(dfam.warmUp?.minutes).toBeUndefined()
    expect(dfam.warmUp?.note.toLowerCase()).toContain('a few minutes')
  })

  /**
   * **The Subsequent 37 is deliberately absent, and that is the finding.** p.8 prints a number —
   * "as long as 60 seconds" — but the sentence ends *"if you've left it outside on a cold night"*
   * and continues "although its oscillators are surprisingly stable". Moog are saying the box is
   * fast. Authoring that as a warm-up requirement would tell a reader to wait when the manual is
   * telling them they need not, which is a cited figure carrying an uncited claim.
   */
  it('leaves out the box whose number is not a warm-up requirement', () => {
    expect(DEVICES.find((d) => d.id === 'moog-subsequent-37')?.warmUp).toBeUndefined()
  })
})
