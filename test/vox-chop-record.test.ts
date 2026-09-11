import { describe, expect, it } from 'vitest'
import type { Device, Recipe } from '../lib/core'
import { DEVICES } from '../lib/devices/registry.generated'

/**
 * §3/#521. **A reader with a phone and no sample library can answer a `vox-chop` recipe.**
 *
 * Twenty-one `vox-chop` recipes carry `sourceAudio`, and until #521 most of them described a
 * vocal to obtain and stopped. Every one is something a phone in a quiet room records, and the
 * silence sent a reader off to find a sample library instead.
 *
 * ## The count, and how it was got wrong twice
 *
 * The issue first reported 4 of 21 because `sing` matched inside `single syllables`, then 19
 * because `String(r.sourceAudio.prep)` yields `"[object Object]"` and no `prep.text` was ever
 * read. Reading `prep.text` off the field, the baseline was **21 with `sourceAudio`, 4 already
 * saying *record* in `need` or `prep`, 17 silent**: the Deluge pair describes the recording it
 * wants, and the two EPs' `prep` is *"hold a pad to record"*. `ALREADY_COVERED` and
 * `FORMERLY_SILENT` below are that baseline, and the first test proves the two sets are still
 * exactly the twenty-one. The OP-XY is in the silent set: *"Sample it with [sample]"* and a
 * device hint do not tell a reader that a phone can supply the vocal.
 *
 * ## What the seventeen now say, and where
 *
 * The offer went into `need`, since it is uncited advice about what to obtain and sits beside
 * the constraints a recording has to meet; `prep` stays the box's cited procedure and got no
 * uncited transfer step. It is authored in each `need` with no shared constant behind it,
 * because the seventeen split by material: an ordinary phrase to slice, several separate
 * one-shots (`ONE_SHOTS`, *one word per take*), transient-heavy material (`TRANSIENT`, *hard
 * consonants to slice on*), and two phrases that have to be at the project tempo (`TEMPO_BOUND`),
 * which a phone recording is not by itself, so those two say what to do about it. Every form is
 * direct help (*You can record …*) and states the same three constraints (`CONSTRAINTS`: one
 * voice, close to the mic so it stays dry, nothing playing behind it), and the fourth test holds
 * each form to them. Unlike
 * #496, one resolved guide carries one `vox-chop` part, so wording that recurs across recipes
 * never recurs on a page. No other role was touched, and the last test holds that: no
 * `sourceAudio` recipe outside these seventeen mentions a phone.
 */

const ALREADY_COVERED = [
  'deluge-vox-chop-clean',
  'deluge-vox-chop-dirty',
  'ep133-vox-chop-clean',
  'ep40-vox-chop-clean',
] as const

const FORMERLY_SILENT = [
  'ct-vox-chop-clean',
  'ct-vox-chop-dirty',
  'dt-vox-chop-bright',
  'dt2-vox-chop-bright',
  'mc101-vox-chop-dirty',
  'mc707-vox-chop-dirty',
  'opxy-vox-chop-clean',
  'ot-vox-chop-bright',
  'pp-vox-chop-dirty',
  'rytm-vox-chop-bright',
  'sp-vox-chop-bright',
  'tm-vox-chop-dirty',
  'tr-vox-chop-bright',
  'tr-vox-chop-dirty',
] as const

/**
 * One recipe id on three boxes: the XL imports the Live III's recipe and the One G2 retargets
 * it, so it is one authored string and three registry entries.
 */
const MPC_SIBLINGS = ['akai-mpc-live-iii', 'akai-mpc-one-g2', 'akai-mpc-xl'] as const

/** The two recipes whose constraint is the project tempo, which a phone recording is not at by itself. */
const TEMPO_BOUND = ['tr-vox-chop-bright', 'tm-vox-chop-dirty'] as const

/** The four that want several separate one-shots, one per sample slot, so the offer is one word per take. */
const ONE_SHOTS = ['ct-vox-chop-clean', 'ct-vox-chop-dirty', 'mc101-vox-chop-dirty', 'mc707-vox-chop-dirty'] as const

/** The one that slices on transients, so the offer asks for consonants hard enough to slice on. */
const TRANSIENT = ['tr-vox-chop-dirty'] as const

/** The correction comment's search, over `need` and `prep.text`: this is what put four recipes in the covered set. */
const RECORDING = /\b(record|recorded|recording|phone|microphone|voice memo)\b/i
/** The offer, as direct help: *You can record one / them / the vocal kind on a phone*. */
const PHONE = /\bYou can record (one|them|the vocal kind) on a phone\b/
/** The three constraints every form states: one voice, close and dry, nothing playing behind it. */
const CONSTRAINTS = [/\bone voice\b/, /close to the mic/, /stays dry/, /nothing playing behind it/] as const
const AT_TEMPO = /play the project through headphones and sing .* lands? at tempo/

type Entry = { device: Device; recipe: Recipe; need: string; prep: string; hint: string }

/** Every `sourceAudio` recipe, with the three strings a reader sees read off the right fields. */
function sourced(): Entry[] {
  const out: Entry[] = []
  for (const device of DEVICES) {
    for (const recipe of device.recipes) {
      const s = recipe.sourceAudio
      if (s === undefined) continue
      out.push({
        device,
        recipe,
        need: s.need,
        // `prep` is an object; `String(prep)` is "[object Object]", which is the issue's second wrong count.
        prep: s.prep?.text ?? '',
        hint: s.hint === undefined ? '' : (device.hints?.[s.hint] ?? ''),
      })
    }
  }
  return out
}

const voxChop = () => sourced().filter((e) => e.recipe.role === 'vox-chop')

describe('vox-chop recipes offer a phone recording (§3/#521)', () => {
  it('the baseline sets partition the twenty-one vox-chop recipes that carry sourceAudio', () => {
    const entries = voxChop()
    expect(entries).toHaveLength(21)
    const ids = entries.map((e) => e.recipe.id)
    expect(ids.filter((id) => id === 'mpc-vox-chop-bright')).toHaveLength(MPC_SIBLINGS.length)
    expect(
      entries.filter((e) => e.recipe.id === 'mpc-vox-chop-bright').map((e) => e.device.id).sort(),
    ).toEqual([...MPC_SIBLINGS])
    const covered = new Set<string>(ALREADY_COVERED)
    const silent = new Set<string>([...FORMERLY_SILENT, 'mpc-vox-chop-bright'])
    for (const id of ids) expect(covered.has(id) || silent.has(id), id).toBe(true)
    expect(entries.filter((e) => covered.has(e.recipe.id))).toHaveLength(4)
    expect(entries.filter((e) => silent.has(e.recipe.id))).toHaveLength(17)
  })

  it('the four already-covered recipes say record in need or prep.text, and were left alone', () => {
    for (const e of voxChop().filter((e) => (ALREADY_COVERED as readonly string[]).includes(e.recipe.id))) {
      expect(RECORDING.test(`${e.need} ${e.prep}`), e.recipe.id).toBe(true)
      expect(PHONE.test(e.need), e.recipe.id).toBe(false)
    }
  })

  it('every formerly silent recipe now offers a phone recording in need, with its constraints kept', () => {
    const silent = new Set<string>([...FORMERLY_SILENT, 'mpc-vox-chop-bright'])
    const entries = voxChop().filter((e) => silent.has(e.recipe.id))
    expect(entries).toHaveLength(17)
    for (const e of entries) {
      expect(PHONE.test(e.need), e.recipe.id).toBe(true)
      // The offer is in `need`, never smuggled into the cited procedure.
      expect(PHONE.test(e.prep), e.recipe.id).toBe(false)
      // The sentence carries all three constraints a phone recording has to meet.
      for (const c of CONSTRAINTS) expect(c.test(e.need), `${e.recipe.id} ${c}`).toBe(true)
      // What the recipe asked for before is still asked for.
      expect(/\bvocal\b|\bsung or spoken\b/i.test(e.need), e.recipe.id).toBe(true)
    }
  })

  it('every offer states the common recording constraints, in the form its material needs', () => {
    const entries = voxChop().filter((e) => PHONE.test(e.need))
    expect(entries).toHaveLength(17)
    const tempo = new Set<string>(TEMPO_BOUND)
    const oneShots = new Set<string>(ONE_SHOTS)
    const transient = new Set<string>(TRANSIENT)
    for (const e of entries) {
      const id = e.recipe.id
      for (const c of CONSTRAINTS) expect(c.test(e.need), `${id} ${c}`).toBe(true)
      if (tempo.has(id)) {
        // At tempo: the project in headphones, so the bar lands and the phone still hears one voice.
        expect(AT_TEMPO.test(e.need), id).toBe(true)
        expect(/hears one voice with nothing playing behind it/.test(e.need), id).toBe(true)
        continue
      }
      expect(AT_TEMPO.test(e.need), id).toBe(false)
      expect(/one voice, close to the mic so it stays dry, nothing playing behind it/.test(e.need), id).toBe(true)
      expect(/one word per take/.test(e.need), id).toBe(oneShots.has(id))
      expect(/hard consonants to slice on/.test(e.need), id).toBe(transient.has(id))
    }
  })

  it('no other role was touched: the phone offer appears on exactly these seventeen and nowhere else', () => {
    const withPhone = sourced().filter((e) => /\bphone\b/i.test(`${e.need} ${e.prep} ${e.hint}`))
    expect(withPhone).toHaveLength(17)
    for (const e of withPhone) expect(e.recipe.role, `${e.device.id}/${e.recipe.id}`).toBe('vox-chop')
  })
})
