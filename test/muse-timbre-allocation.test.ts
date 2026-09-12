import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { moodState, renderGuide, resolve } from '../lib/core/index'
import type { ResolveResult, Template } from '../lib/core/index'
import { Guide } from '../components/guide/guide'
import { DEVICES } from '../lib/devices/registry.generated'
import { device as muse } from '../lib/devices/moog-muse/index'
import { TEMPLATES, industrialTechno } from '../lib/templates/index'

/**
 * #424. **A guide tells a single-part reader to split the box in half, and forbids it reclaiming
 * the rest.** Reported from the machine: the Muse was left carrying one part and the guide still
 * said `TIMBRE A VOICE COUNT 4`, so a pad that wanted headroom got four voices and the setting
 * beside it stopped the box handing back the other four.
 *
 * These tests are written before the fix and **most of them fail**. Which ones fail, and which do
 * not, is the answer this file exists to record — because the issue leaves the question open for
 * all four settings and the manual only moves one of them.
 *
 * ## What the manual actually says about the four, read off rendered pages
 *
 * `TIMBRE A VOICE COUNT` is arithmetic and it moves. p.106: *"The Voice Count settings for TIMBRE
 * A and B will move with respect to each other and always sum to eight to avoid voice stealing
 * conflicts"*, and the field itself *"restricts a certain number of voices to TIMBRE A so that
 * TIMBRE B cannot steal voices from TIMBRE A."* One part on the box wants all eight of them.
 *
 * **The other three do not move, and two of them for reasons the issue did not have in front of
 * it.** They read as split-support settings and they are not:
 *
 *  - **`MULTI MODE` stays `ON`.** p.110 gives the OFF branch in full — *"If OFF, Muse will handle
 *    incoming MIDI messages as if the local keyboard were being used"* — and the NOTE under it
 *    adds *"In MULTI MODE the STACK and SPLIT buttons in VOICE CONTROL are ignored."* So this is
 *    not a setting that exists to address timbre B. It is what pins the incoming channel to
 *    TIMBRE A **and nothing else**, whatever STACK and SPLIT happen to be doing. Turn it off and
 *    those two panel buttons go live; no recipe here sets either, and p.105 says engaging STACK
 *    *"reduces available polyphony by half (or more)"* — which would take back the eight voices
 *    this issue is trying to win. Of the four, it is the one whose removal can make the reported
 *    symptom worse.
 *  - **`MULTI IN B CHANNEL` stays `2`.** p.110: `MIDI IN CHANNEL (OMNI, 1-16. DEFAULT: 1)` and
 *    `MULTI IN B CHANNEL (OMNI, 1-16. DEFAULT: 1)`. **Both default to one.** Left alone, the idle
 *    timbre receives the same notes as the used one on the same channel. Whether a timbre holding
 *    zero voices sounds anything is stated on neither p.106 nor p.110, so "harmless because B is
 *    unused" is an inference from a fact nobody has read. One line closes it.
 *  - **`DYNAMIC VOICE ALLOCATION` stays `OFF`.** p.106 defines it purely as stealing *between*
 *    timbres, so at eight-and-zero with one part it is genuinely inert in both states — which is
 *    an argument for leaving the box's own printed default (`DEFAULT: OFF`) stated rather than
 *    for dropping it. It is also what makes the count above hold rather than drift.
 *
 * So the fix is **one number**, not four settings, and the three pins below are as load-bearing as
 * the failing assertions: they say what a fix is not allowed to take away.
 *
 * ## `DETUNE` is deliberately not asserted to move
 *
 * #424 asks what `VOICE CONTROL · DETUNE` should be at eight voices and answers *"needs an ear,
 * not a rule"*. p.105 gives it three jobs and no scale — *"When used polyphonically, DETUNE adds
 * subtle pitch offsets to each voice"* — so there is no page to read the eight-voice value off.
 * The pins below hold it exactly where each recipe authors it, and they are pins rather than
 * claims: if an operator plays the eight-voice pad and wants a different spread, these are the
 * tests that say so out loud instead of the value moving under a fix that was about a count.
 *
 * ## Three rigs, and each of them is here for a different reason
 *
 * The two one-box rigs reach the defect deterministically at every seed and are what the sweeps
 * count. The four-box rig at the bottom is **#424 as reported** — a TR-1000, a Deluge, the Muse
 * and a Subsequent 37 — where the Muse ends up with one part because three other boxes took the
 * rest rather than because the direction had nothing else to give it. Same defect, and the only
 * one of the three a reader actually walked into.
 */

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8] as const

function templateNamed(id: string): Template {
  const found = TEMPLATES.find((t) => t.id === id)
  if (found === undefined) throw new Error(`no template ${id}`)
  return found
}

/**
 * The Muse alone, so what lands on it is a property of the direction rather than of whichever
 * other box happened to win the role. #424's own report came off a mixed rig — the stab moved to
 * a Deluge and left the Muse holding one part — but a one-box rig reaches the same allocation
 * without depending on a second device's recipes staying where they are.
 */
function run(templateId: string, seed: number): ResolveResult {
  return resolve({ devices: [muse], template: templateNamed(templateId), mood: moodState(), seed })
}

function museParts(result: ResolveResult): ResolveResult['assignments'] {
  return result.assignments.filter((a) => a.deviceId === muse.id)
}

/** Every line the Markdown guide prints for a parameter of this name, anywhere in the guide. */
function mdLines(result: ResolveResult, name: string): string[] {
  return renderGuide(result)
    .split('\n')
    .filter((l) => l.includes(`**${name}**`))
}

/**
 * The rendered value beside a parameter name, as the Markdown guide prints it.
 *
 * **The uniqueness check is the point rather than a convenience.** A guide strips the module
 * prefix off a parameter name, so `VOICE CONTROL · DETUNE` renders as `DETUNE` — and on a rig with
 * four boxes a second device printing its own `DETUNE` would silently hand this function the wrong
 * one. Two matches fails here rather than asserting against whichever came first.
 */
function mdValue(result: ResolveResult, name: string): string | undefined {
  const lines = mdLines(result, name)
  expect(lines, `${name} should be printed exactly once`).toHaveLength(1)
  return lines[0]?.match(/`([^`]+)`/)?.[1]
}

/** The same question of the page, which is a hand-written renderer of its own (#33). */
function pageText(result: ResolveResult): string {
  return renderToStaticMarkup(createElement(Guide, { result, seed: 1 }))
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
}

/**
 * `drone-study` puts a single `texture` on the Muse and `ambient-dub` puts a `pad` and a `sub` on
 * it, on this rig at every seed 1-8. Both are asserted rather than assumed, below.
 */
const ONE_PART = 'drone-study'
const TWO_PARTS = 'ambient-dub'

/**
 * **The rig the bug was reported off**, and the one `control-positions.test.ts` measures #324 on:
 * a TR-1000, a Deluge, the Muse and a Subsequent 37, running `industrial-techno` at seed 3.
 *
 * It is the case #424 describes in its first sentence — *"the stab was moved back to automatic
 * placement, which put it on the Deluge, leaving the Muse carrying one part"* — and it reaches the
 * defect by a route the one-box rigs above cannot: the Muse is left with a single part because
 * three other boxes took the rest, not because the direction had nothing else to give it. That is
 * the shape a reader actually hit, so it earns an assertion of its own rather than being folded
 * into the sweep.
 *
 * The part is `muse-pad-dark` — three-note chords on 64-step holds, which is precisely where the
 * four-voice split costs most, because the release of one chord wants to overlap the attack of the
 * next and a triad on four voices has nothing spare.
 */
const REPORTED_RIG = ['roland-tr-1000', 'synthstrom-deluge', 'moog-muse', 'moog-subsequent-37']

function reported(): ResolveResult {
  return resolve({
    devices: DEVICES.filter((d) => REPORTED_RIG.includes(d.id)),
    template: industrialTechno,
    mood: moodState(),
    seed: 3,
  })
}

describe('the Muse fixtures these tests rest on (#424)', () => {
  it('leaves exactly one part on the box in the one-part direction, at every seed', () => {
    for (const seed of SEEDS) {
      const parts = museParts(run(ONE_PART, seed))
      expect(parts.map((a) => a.role), `${ONE_PART} seed ${String(seed)}`).toEqual(['texture'])
      expect(parts[0]?.recipe?.id).toBe('muse-texture-soft')
    }
  })

  it('puts two parts on the box in the two-part direction, at every seed', () => {
    for (const seed of SEEDS) {
      const parts = museParts(run(TWO_PARTS, seed))
      expect([...parts.map((a) => a.role)].sort(), `${TWO_PARTS} seed ${String(seed)}`).toEqual([
        'pad',
        'sub',
      ])
    }
  })

  /**
   * **The one asymmetry that would invalidate the fix.** `TIMBRE A VOICE COUNT` names timbre A,
   * and a pool fills its ordinals in order, so a single part is on `Timbre 1`. If a one-part
   * allocation ever landed on `Timbre 2` instead, raising *A*'s count to eight would leave the
   * part on B holding none — the reported bug, inverted and worse. This is the guard that says so
   * rather than a fix quietly being right by luck.
   */
  it('gives a single part timbre 1, so TIMBRE A is the control that governs it', () => {
    for (const seed of SEEDS) {
      const only = museParts(run(ONE_PART, seed))[0]
      expect(only?.assignables.map((x) => x.voiceId), `seed ${String(seed)}`).toEqual(['timbre-1'])
    }
    expect(museParts(reported())[0]?.assignables.map((x) => x.voiceId)).toEqual(['timbre-1'])
  })
})

/**
 * #424 as reported, on four boxes rather than one. Everything here also holds on `drone-study`
 * above; what this block adds is that the *route* to the defect is the one somebody walked.
 */
describe('the four-box rig #424 was reported from (#424)', () => {
  it('leaves the Muse carrying muse-pad-dark and nothing else', () => {
    const parts = museParts(reported())

    expect(parts).toHaveLength(1)
    expect(parts[0]?.role).toBe('pad')
    expect(parts[0]?.recipe?.id).toBe('muse-pad-dark')
    // The three other boxes are carrying parts, or the Muse is alone by accident and this rig is
    // testing nothing the one-box fixtures do not.
    const elsewhere = reported().assignments.filter((a) => a.deviceId !== muse.id)
    expect(elsewhere.length).toBeGreaterThan(0)
  })

  /** FAILS before the fix: the reported guide prints `4`, which is what the reader was given. */
  it('gives that one pad the whole box, in both renderers', () => {
    const result = reported()

    expect(mdValue(result, 'TIMBRE A VOICE COUNT')).toBe('8')
    expect(pageText(result)).toContain('TIMBRE A VOICE COUNT 8')
  })

  /**
   * PASSES before the fix, and must keep passing through it. #424 says fifteen across eight
   * voices is a wider spread than across four and that *"whatever value is right, it is a
   * different value at a different count"* — then answers *"needs an ear, not a rule"*. p.105
   * gives `DETUNE` three jobs and no scale, so there is no page to read the eight-voice value
   * off and nothing here may invent one.
   *
   * **So this pin is deliberately holding a value nobody has verified at eight voices.** It says
   * the count fix did not silently move it. Moving it is a separate change, and it needs somebody
   * to play the pad rather than somebody to read a page.
   */
  it('leaves the authored DETUNE 15 exactly where it is, pending an ear', () => {
    expect(mdValue(reported(), 'DETUNE')).toBe('15')
  })

  /** The three the manual keeps. Same reasoning as the one-box case; see the head note. */
  it('still states MULTI MODE, MULTI IN B CHANNEL and DYNAMIC VOICE ALLOCATION', () => {
    const result = reported()

    expect(mdValue(result, 'MULTI MODE')).toBe('ON')
    expect(mdValue(result, 'MULTI IN B CHANNEL')).toBe('2')
    expect(mdValue(result, 'DYNAMIC VOICE ALLOCATION')).toBe('OFF')

    const page = pageText(result)
    expect(page).toContain('MULTI MODE ON')
    expect(page).toContain('MULTI IN B CHANNEL 2')
    expect(page).toContain('DYNAMIC VOICE ALLOCATION OFF')
  })
})

describe('a Muse carrying one part is given the whole box (#424)', () => {
  /** FAILS before the fix: the guide prints `4`, which is half the box on behalf of nobody. */
  it('prints TIMBRE A VOICE COUNT 8 in the Markdown guide', () => {
    expect(mdValue(run(ONE_PART, 1), 'TIMBRE A VOICE COUNT')).toBe('8')
  })

  /** FAILS before the fix. The page is a second hand-written renderer and gets its own assertion. */
  it('prints TIMBRE A VOICE COUNT 8 on the page', () => {
    expect(pageText(run(ONE_PART, 1))).toContain('TIMBRE A VOICE COUNT 8')
  })

  /**
   * FAILS before the fix. The count is a setting for the whole box rather than for the patch on
   * it, so it reads eight wherever one part is alone on the Muse — including the two directions
   * whose single part is a `MONO` sub that will only ever sound one of them. A mono patch using
   * one of eight voices is not a reason to tell the reader to lock the other seven away.
   */
  it('reads 8 in every direction and seed that leaves one part on the box', () => {
    let seen = 0
    for (const template of TEMPLATES) {
      for (const seed of SEEDS) {
        const result = resolve({ devices: [muse], template, mood: moodState(), seed })
        if (museParts(result).length !== 1) continue
        seen += 1
        expect(
          mdValue(result, 'TIMBRE A VOICE COUNT'),
          `${template.id} seed ${String(seed)}`,
        ).toBe('8')
      }
    }
    // Or an allocation change that stopped producing one-part guides would pass this forever.
    expect(seen).toBe(24)
  })

  /**
   * PASSES before the fix, and is a pin rather than a discovery: #424 asks whether these three
   * should drop out at one part and the manual says no. See the head note — `MULTI MODE OFF`
   * hands the box back to STACK and SPLIT (p.110's NOTE), `MULTI IN B CHANNEL` is what stops the
   * idle timbre sharing a channel with the used one (p.110, both default to 1), and `DYNAMIC
   * VOICE ALLOCATION OFF` is the box's printed default and what makes the count above hold.
   */
  it('still states the three settings that are not arithmetic, in both renderers', () => {
    const result = run(ONE_PART, 1)
    expect(mdValue(result, 'MULTI MODE')).toBe('ON')
    expect(mdValue(result, 'MULTI IN B CHANNEL')).toBe('2')
    expect(mdValue(result, 'DYNAMIC VOICE ALLOCATION')).toBe('OFF')

    const page = pageText(result)
    expect(page).toContain('MULTI MODE ON')
    expect(page).toContain('MULTI IN B CHANNEL 2')
    expect(page).toContain('DYNAMIC VOICE ALLOCATION OFF')
  })

  /**
   * PASSES before the fix. #424 names `DETUNE` as downstream of the count and leaves the value to
   * an ear; p.105 prints no scale for it. So the fix must not move it, and if somebody later
   * decides fifteen-across-four is not thirty-across-eight, this is where that decision surfaces.
   */
  it('leaves VOICE CONTROL · DETUNE exactly as the recipe authors it', () => {
    expect(mdValue(run(ONE_PART, 1), 'DETUNE')).toBe('30')
  })
})

describe('a Muse carrying two parts still splits four and four (#424)', () => {
  /**
   * PASSES before the fix, all four of them, and that is the whole point of the case: the split
   * is correct when the box is shared, and #424 is only about the allocation where it is not.
   * A fix that made the count allocation-derived and got this wrong would hand a two-part guide
   * eight voices for timbre A and none for timbre B — one part silent, which is a worse guide
   * than the one being repaired.
   */
  it('keeps all four settings at their split values in the Markdown guide', () => {
    const result = run(TWO_PARTS, 1)
    expect(mdValue(result, 'TIMBRE A VOICE COUNT')).toBe('4')
    expect(mdValue(result, 'DYNAMIC VOICE ALLOCATION')).toBe('OFF')
    expect(mdValue(result, 'MULTI MODE')).toBe('ON')
    expect(mdValue(result, 'MULTI IN B CHANNEL')).toBe('2')
  })

  it('keeps all four settings at their split values on the page', () => {
    const page = pageText(run(TWO_PARTS, 1))
    expect(page).toContain('TIMBRE A VOICE COUNT 4')
    expect(page).toContain('DYNAMIC VOICE ALLOCATION OFF')
    expect(page).toContain('MULTI MODE ON')
    expect(page).toContain('MULTI IN B CHANNEL 2')
  })

  it('reads 4 in every direction and seed that puts two parts on the box', () => {
    let seen = 0
    for (const template of TEMPLATES) {
      for (const seed of SEEDS) {
        const result = resolve({ devices: [muse], template, mood: moodState(), seed })
        if (museParts(result).length !== 2) continue
        seen += 1
        expect(
          mdValue(result, 'TIMBRE A VOICE COUNT'),
          `${template.id} seed ${String(seed)}`,
        ).toBe('4')
      }
    }
    expect(seen).toBe(80)
  })

  /**
   * The setting is `song`-scoped, so it is hoisted above the parts and printed once. That has to
   * survive the count becoming allocation-derived: hoisting lifts a parameter when every
   * occurrence agrees, and a value read off *the device's* allocation agrees on every occurrence
   * by construction — but only if the source is the device's, not the part's. A per-part source
   * would give the pad and the sub different counts, unhoist the parameter, and print it twice
   * inside two part blocks that both claim to set one box-wide field.
   */
  it('prints the count once for the whole song, not once per part', () => {
    expect(mdLines(run(TWO_PARTS, 1), 'TIMBRE A VOICE COUNT')).toHaveLength(1)
    // The per-part control that is *not* hoisted, as the contrast: two parts, two DETUNE lines.
    expect(mdLines(run(TWO_PARTS, 1), 'DETUNE')).toHaveLength(2)
  })
})
