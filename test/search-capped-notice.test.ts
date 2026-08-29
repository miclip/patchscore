import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { assign, moodState, renderGuide, resolve, searchCapNotice } from '../lib/core/index'
import type { ResolveResult } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES } from '../lib/templates/index'
import { Guide } from '../components/guide/guide'

/**
 * §7.1/#228. **A capped search returns a worse allocation and every sentence stays true.**
 *
 * That was the defect: branch-and-bound stops at the cap and returns the best arrangement it found,
 * which for a large rig is not the best one there is — and `SearchReport.capped` recorded it while
 * nothing outside the tests ever read it. A capped run rendered exactly like a complete one.
 *
 * Invariant 5 is *"gaps are shown honestly"*, and this is a gap in the **search** rather than in
 * the rig, which is why it slipped past all three of §7.3's gap headings: they answer "what could
 * this rig not do", and none of them answers "did we actually look".
 */

const industrial = TEMPLATES.find((t) => t.id === 'industrial-techno')!
const rig = (...ids: string[]) => DEVICES.filter((d) => ids.includes(d.id))

const complete = () =>
  resolve({
    devices: rig('synthstrom-deluge', 'roland-tr-1000'),
    template: industrial,
    mood: moodState({}),
    seed: 3,
  })

/**
 * A capped result, built rather than provoked. `resolve` takes no cap and nothing in the shipped
 * library comes near `DEFAULT_NODE_CAP` — which is the point of the headroom — so reaching this
 * state through the front door would mean either shipping a device that caps or a cap nobody uses.
 * The field is what the renderers read, and overriding it tests exactly that.
 */
const capped = (): ResolveResult => {
  const r = complete()
  return { ...r, search: { ...r.search, capped: true, method: 'greedy' } }
}

describe('the notice answers only when the search actually stopped early', () => {
  it('says nothing for a complete search', () => {
    expect(searchCapNotice(complete().search)).toBeUndefined()
  })

  it('says something for a capped one', () => {
    const notice = searchCapNotice(capped().search)
    expect(notice).toBeDefined()
    expect(notice?.detail.length).toBeGreaterThan(0)
  })

  /**
   * The wording is the decision here, not the plumbing, so it is worth a fixture of its own —
   * asserted as claims rather than as sentences (#46), since an author who rephrases should pass
   * and one who drops a claim should fail.
   */
  it('speaks to a reader at a rack, not about the implementation', () => {
    const notice = searchCapNotice(capped().search)!
    const all = [notice.headline, ...notice.detail].join(' ')
    for (const jargon of ['node', 'cap', 'branch', 'bound', 'greedy', 'exhaustive', 'search space']) {
      expect(all.toLowerCase(), `leaks "${jargon}"`).not.toContain(jargon)
    }
  })

  it('says what is still true, which is most of what the reader needs', () => {
    // The risk of saying anything at all is a reader distrusting values that are perfectly good.
    const all = searchCapNotice(capped().search)!.detail.join(' ')
    expect(all).toMatch(/real/)
    expect(all).toMatch(/cited/)
  })

  it('says what the reader can do about it', () => {
    // A notice with no action is an apology. Selecting fewer boxes is the one thing that works.
    expect(searchCapNotice(capped().search)!.detail.join(' ')).toMatch(/fewer boxes/)
  })
})

describe('both renderers surface it, and neither invents it (#33)', () => {
  it('the Markdown guide says it under Voice assignment, where the allocation is', () => {
    const md = renderGuide(capped())
    const notice = searchCapNotice(capped().search)!
    expect(md).toContain(notice.headline)
    // Under phase 2, not at the top: every value in this guide is as good as it always was, and a
    // banner over the whole document would read as a disclaimer about all of it.
    expect(md.indexOf(notice.headline)).toBeGreaterThan(md.indexOf('## 2. Voice assignment'))
    expect(md.indexOf(notice.headline)).toBeLessThan(md.indexOf('## 3. Rig integration'))
  })

  it('the web guide says it too', () => {
    const html = renderToStaticMarkup(createElement(Guide, { result: capped(), seed: 3 }))
    expect(html).toContain('search-capped')
    expect(html).toContain(searchCapNotice(capped().search)!.headline)
  })

  it('neither says it when the search finished', () => {
    const notice = searchCapNotice(capped().search)!
    expect(renderGuide(complete())).not.toContain(notice.headline)
    const html = renderToStaticMarkup(createElement(Guide, { result: complete(), seed: 3 }))
    expect(html).not.toContain('search-capped')
  })

  it('says it under either layout, since the cap is not a property of how you read', () => {
    const notice = searchCapNotice(capped().search)!
    expect(renderGuide(capped(), { layout: 'phase' })).toContain(notice.headline)
    expect(renderGuide(capped(), { layout: 'sequencer' })).toContain(notice.headline)
  })
})

describe('the thing the notice is about is real (§7.1)', () => {
  /**
   * Guarding the premise, not the rendering. If a cap ever stopped changing the answer this whole
   * notice would be noise, and the fixture should fail rather than keep printing it.
   */
  it('a cap really does change which boxes carry the parts', () => {
    /**
     * **Seed 1, and the seed matters.** At seed 3 a capped search happens to return the identical
     * allocation — greedy sometimes lands on the optimum, which is why "capped" is not a synonym
     * for "wrong" and why the notice says *may* rather than *is* worse. What has to be true for
     * the notice to be worth printing at all is that a cap *can* change the answer, and here it
     * does: same twelve parts, same shape, different boxes carrying them.
     */
    const devices = [...DEVICES]
    const full = assign({ devices, template: industrial, mood: moodState(), seed: 1 })
    const tight = assign({ devices, template: industrial, mood: moodState(), seed: 1, nodeCap: 2000 })

    expect(full.search.capped).toBe(false)
    expect(tight.search.capped).toBe(true)
    // The count is the same, which is what makes this invisible without being told.
    expect(tight.assignments.length).toBe(full.assignments.length)

    const where = (r: typeof full) =>
      r.assignments.map((a) => `${a.requestId}:${a.deviceId}`).sort().join('|')
    expect(where(tight), 'a capped search returned the same allocation').not.toBe(where(full))
  })
})
