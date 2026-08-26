import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { NEUTRAL_MOOD, clockSourceBasis, renderGuide, resolve } from '../lib/core/index'
import type { Device, ResolveResult } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { industrialTechno } from '../lib/templates/index'
import { Guide } from '../components/guide/guide'
import { capabilityGaps, devicePage } from '../lib/studio/device-page'
import { auditDevice } from '../lib/studio/provenance'

/**
 * §7.4/#121. **The rig phase named a box and never said what the answer rested on.**
 *
 * Two entirely different claims reached a reader in identical words: "the Tracker Mini's manual
 * calls it the centre piece of a setup" and "nothing in this rig claims that job, so `polyend-`
 * sorted before `roland-`". The first is a person's judgement; the second is a tie-break that
 * exists to make the answer deterministic and explicitly not to make it right (§7.4). Printing
 * the second in the voice of the first is invariant 5's failure — a confidence the guide does
 * not have — and it is the case #121 named as the minimum this issue had to make visible.
 *
 * The three bases are asserted **against each other**, not one at a time. A single test that
 * "the claimed rig says its manual claims the job" passes just as well against a renderer that
 * prints that sentence unconditionally, which is precisely the bug.
 */

function guide(devices: readonly Device[]): string {
  return renderGuide(
    resolve({ devices, template: industrialTechno, mood: NEUTRAL_MOOD, seed: 18 }),
  )
}

function result(devices: readonly Device[]): ResolveResult {
  return resolve({ devices, template: industrialTechno, mood: NEUTRAL_MOOD, seed: 18 })
}

/** The page's ink, with tags stripped — the same reading `guide-view.test.ts` does. */
function text(devices: readonly Device[]): string {
  const html = renderToStaticMarkup(
    createElement(Guide, { result: result(devices), seed: 18 }),
  )
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
}

function occurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1
}

const pick = (...ids: string[]) => DEVICES.filter((d) => ids.includes(d.id))

/**
 * One authored claim in the rig. The Tracker Mini's MIDI chapter calls it "a perfect fit for the
 * centre piece of a setup" (p.283) and the TR-1000 makes no claim, so §7.4's one semantic key
 * decides and the two tie-breaks never run.
 */
const CLAIMED = pick('polyend-tracker-mini', 'roland-tr-1000')

/**
 * No claim anywhere, and **two boxes eligible**, which is what makes it a tie-break at all.
 *
 * It was one box until #144, and the comment beside it said so — "one box, and it is the source
 * because it is the only candidate". That is the defect stated in the fixture's own words: with a
 * single candidate the sort ran over a list of one, and the sentence this rig was pinning claimed
 * that transport and then name had settled something. Both boxes send over `midi-din`, so the
 * transport key ties and the name key genuinely decides — `roland-tr-1000` before `roland-tr-8s`.
 */
const TIE_BREAK = pick('roland-tr-1000', 'roland-tr-8s')

/** #144. The one-box rig the fixture above used to be, kept as its own case rather than lost. */
const SOLE = pick('roland-tr-1000')

/**
 * Two honest claims — the Metropolix and the Tracker Mini, the library's only two. §7.4 has no
 * basis to rank them and says so; transport settles it, since the Metropolix declares no MIDI DIN.
 */
const CONTESTED = pick('polyend-tracker-mini', 'intellijel-metropolix')

describe('§7.4/#121 the guide says what the clock source rests on', () => {
  it('separates the three bases at the resolver, before any ink', () => {
    expect(result(CLAIMED).clockSource?.claims).toBe(1)
    expect(result(TIE_BREAK).clockSource?.claims).toBe(0)
    expect(result(CONTESTED).clockSource?.claims).toBe(2)

    expect(clockSourceBasis(result(CLAIMED).clockSource!)).toBe('claimed')
    expect(clockSourceBasis(result(TIE_BREAK).clockSource!)).toBe('tie-break')
    expect(clockSourceBasis(result(CONTESTED).clockSource!)).toBe('contested')
  })

  /**
   * The core assertion of #121, and the reason it is one `it` rather than three: the tie-break
   * rig must not be able to say the claimed rig's sentence, and vice versa. A renderer that lost
   * the distinction would still contain both strings somewhere and fail only here.
   */
  it('renders a claim as a claim and a tie-break as a tie-break (Markdown)', () => {
    const claimed = guide(CLAIMED)
    const tieBreak = guide(TIE_BREAK)

    expect(claimed).toContain('Why this box — its manual says leading a rig is its job')
    expect(claimed).not.toContain('nothing here claims that job')

    expect(tieBreak).toContain(
      'Why this box — nothing here claims that job, so transport, then name, settled it',
    )
    expect(tieBreak).not.toContain('its manual says leading a rig is its job')
  })

  /**
   * #144. **A tie-break needs something to break a tie against.**
   *
   * "Nothing here claims that job, so transport, then name, settled it" is three facts, and at a
   * rig with one box that can send clock the last two are false: nothing was compared, because
   * there was nothing to compare it with. The reader is holding the whole rack and can see that,
   * which is what makes the sentence worse than merely redundant — it describes a deliberation
   * over boxes they do not own.
   *
   * Asserted in both renderers, and asserted as an absence as well as a presence: a renderer that
   * simply appended a new sentence would still contain the old one and pass on `toContain` alone.
   */
  it('says a sole candidate was the only candidate, not that a tie-break settled it (#144)', () => {
    expect(result(SOLE).clockSource?.eligible).toBe(1)
    expect(result(TIE_BREAK).clockSource?.eligible).toBe(2)

    for (const doc of [guide(SOLE), text(SOLE)]) {
      expect(doc).toContain('Why this box — it is the only box here that can send clock')
      expect(doc).not.toContain('settled it')
      // And the evidence still lands: the basis changed, not the box's own reading of itself.
      expect(doc).toContain('no page states that leading a rig is its job')
    }
  })

  /**
   * #144's boundary, and the reason the rule is about *comparison* rather than about rig size. A
   * sole candidate that claims the job keeps the claimed sentence unchanged: "its manual says
   * leading a rig is its job" is a fact about the box, true whether it was ranked against ten
   * others or against none. Only a sentence saying something was *settled* needs candidates to
   * have settled it against — so this rig, one box and eligible of one, is left exactly alone.
   */
  it('leaves a sole candidate’s claim alone, because a claim asserts no comparison (#144)', () => {
    const sole = pick('polyend-tracker-mini')
    expect(result(sole).clockSource).toMatchObject({ eligible: 1, claims: 1 })
    for (const doc of [guide(sole), text(sole)]) {
      expect(doc).toContain('Why this box — its manual says leading a rig is its job')
      expect(doc).not.toContain('settled it')
      expect(doc).not.toContain('only box here that can send clock')
    }
  })

  it('names two claims as two claims rather than ranking them (Markdown)', () => {
    const contested = guide(CONTESTED)
    // §7.4 refuses to rank two honest claims. The guide has to say which keys did decide, or the
    // line reads as a judgement between manifests that nobody made.
    expect(contested).toContain(
      'Why this box — 2 boxes here claim that job, so transport, then name, settled it',
    )
    // And never as a plural of "box" that English does not have. `count()` would say "2 boxs".
    expect(contested).not.toContain('boxs')
  })

  /**
   * Invariant 4 reaching a reader. The claimed rig carries the page it was read off; the
   * tie-break rig carries the reasoned non-claim, which is the finding #121 argued is the part a
   * reader most needs — "no page states that leading a rig is its job" is information.
   */
  it('carries the chosen box’s own evidence, in its own state’s words (Markdown)', () => {
    expect(guide(CLAIMED)).toContain(
      '↳ cite: claim manual — Polyend Tracker Mini Manual 2.2.1b, p.283',
    )
    // `claim`, not `value`: nobody dials `clock.preferredSource`.
    expect(guide(CLAIMED)).not.toContain('cite: value manual — Polyend Tracker Mini Manual 2.2.1b, p.283')

    const tieBreak = guide(TIE_BREAK)
    expect(tieBreak).toContain('Why this box — nothing here claims that job')
    expect(tieBreak).toContain('· undocumented')
    expect(tieBreak).toContain('no page states that leading a rig is its job')
  })

  /**
   * #35, #107. The cautionary case: the provisional warning repeated on 92% of values and became
   * 14% of the guide. This is hoisted per rig — one line, whatever the rig's size — and the eight
   * boxes that were asked and declined are the device pages' business, not this phase's.
   */
  it('prints the basis once per guide, not once per candidate (#35)', () => {
    const full = guide(DEVICES)
    expect(occurrences(full, 'Why this box —')).toBe(1)
    // Eleven boxes can send clock in the full library, so a per-candidate rendering would be
    // unmistakable here.
    expect(DEVICES.filter((d) => d.clock.canSendClock).length).toBeGreaterThan(5)
  })

  /**
   * #33's rule: the page and the Markdown are siblings reading one result, and they share the
   * lookup and not the sentence. §8 says the guide is read at the machine, so the page is the
   * renderer that matters most for this — a fact that reaches only the Markdown reaches nobody
   * standing at a rack.
   */
  it('says the same three things on the page, in the page’s own words', () => {
    const claimed = text(CLAIMED)
    expect(claimed).toContain('Why this box — its manual says leading a rig is its job')
    expect(claimed).toContain('claim manual — Polyend Tracker Mini Manual 2.2.1b, p.283')

    const tieBreak = text(TIE_BREAK)
    expect(tieBreak).toContain('Why this box — nothing here claims that job')
    expect(tieBreak).not.toContain('its manual says leading a rig is its job')
    // The reasoned non-claim, visible rather than only in a title attribute: a reader on a phone
    // at the rack has no hover.
    expect(tieBreak).toContain('no page states that leading a rig is its job')

    expect(text(CONTESTED)).toContain('Why this box — 2 boxes here claim that job')
  })

  /**
   * A rig with no clock source at all has no basis to state. Naming one would be the invention
   * invariant 5 forbids, and the "nothing in this rig can send clock" sentence is the whole
   * answer.
   */
  it('says nothing about a basis when nothing can send clock', () => {
    const deaf = pick('empress-zoia-euroburo', 'zoom-livetrak-l-8')
    expect(result(deaf).clockSource).toBeUndefined()
    expect(guide(deaf)).not.toContain('Why this box')
    expect(text(deaf)).not.toContain('Why this box')
  })
})

/**
 * §2.6/#121. **A count is not a location.** The device page said how many facts on this box were
 * looked for and not stated, and never which — so a reader learned that three facts are unknown
 * and had no way to discover whether one of them is the clock topology they are about to rely on.
 */
describe('§2.6/#121 the device page names the facts, not only the count', () => {
  const TR = DEVICES.find((d) => d.id === 'roland-tr-1000')!
  const DELUGE = DEVICES.find((d) => d.id === 'synthstrom-deluge')!
  const ZOIA = DEVICES.find((d) => d.id === 'empress-zoia-euroburo')!

  it('names the path a reader would want to check', () => {
    const gaps = devicePage(DELUGE).capabilityGaps
    const undocumented = gaps.find((g) => g.kind === 'undocumented')
    expect(undocumented?.facts).toContain('clock.preferredSource')
  })

  it('groups by state and orders the groups by the work behind them', () => {
    // The ZOIA holds three of the four states at once, which is what makes it the fixture here.
    const kinds = devicePage(ZOIA).capabilityGaps.map((g) => g.kind)
    expect(kinds).toEqual([...kinds].sort(orderIndex))
    expect(kinds).toContain('undocumented')
    expect(kinds).toContain('unread')
  })

  /** §7.2. Paths in code unit order, never manifest key order — moving a line must move nothing. */
  it('lists paths deterministically within a state', () => {
    for (const gap of devicePage(TR).capabilityGaps) {
      expect([...gap.facts]).toEqual(
        [...gap.facts].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)),
      )
    }
  })

  /** Every non-citation finding the audit made reaches the page. None is counted and then hidden. */
  it('accounts for every non-citation finding the audit reports', () => {
    for (const device of DEVICES) {
      const findings = auditDevice(device).findings.filter((f) => 'fact' in f)
      const shown = capabilityGaps(findings).flatMap((g) => g.facts)
      expect(shown.length).toBe(findings.length)
    }
  })

  /** A box whose every stated fact is cited prints nothing rather than an empty heading. */
  it('is empty when there is nothing to name', () => {
    const clean = DEVICES.filter((d) => devicePage(d).capabilityGaps.length === 0)
    for (const device of clean) {
      const counts = devicePage(device).provenance
      expect(
        counts.uncheckedCapabilities +
          counts.undocumentedCapabilities +
          counts.unreadCapabilities +
          counts.citedAgainstCapabilities,
      ).toBe(0)
    }
  })
})

const GAP_ORDER = ['cited-against', 'undocumented', 'unread', 'unchecked']
function orderIndex(a: string, b: string): number {
  return GAP_ORDER.indexOf(a) - GAP_ORDER.indexOf(b)
}
