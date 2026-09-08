import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { GUIDE_PHASES } from '../lib/core/index'
import type { Device } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { kitRecipes } from '../lib/studio/device-page'
import { kitSession } from '../lib/studio/kit-session'
import { renderKitSession } from '../lib/studio/kit-markdown'
import { KIT_NAMES, kitPath, kitText } from './golden/kits'

/**
 * §3.7/#478. **The kit session's Markdown**, pinned as bytes and checked for the things bytes
 * alone do not say out loud: that one destination sentence is printed and no capability behind
 * it, that every sound ends with the hit to record and the name to record it under, that the
 * citation is one sentence for the box and no mark on any value, and that nothing belonging to
 * a song reached the page.
 *
 * Regenerate the fixture with `npm run gen:kits` and read the diff.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(HERE, '..')
const TSX = join(REPO_ROOT, 'node_modules', '.bin', 'tsx')
const GENERATOR = join(HERE, 'golden', 'kits.ts')

// The ICU trap `determinism.test.ts` and `guide-golden.test.ts` both use: Node reads LANG/LC_ALL
// to pick its default locale, so a `localeCompare` or a `toLocaleUpperCase` that reached this
// renderer would genuinely answer differently under it.
const HOSTILE_LOCALE = 'tr_TR.UTF-8'

const CASCADIA = kitText('cascadia')
const RECORD_EACH = 'Record each hit with the sampler, recorder, or DAW you use.'
const LINES = CASCADIA.split('\n')

const byId = (id: string): Device => {
  const device = DEVICES.find((d) => d.id === id)
  if (device === undefined) throw new Error(`no device ${id}`)
  return device
}

/** One box's rendered session. Throws rather than casting: a box with no kit is a broken test. */
function sessionDoc(id: string): string {
  const session = kitSession(byId(id))
  if (session === undefined) throw new Error(`${id} offers no kit`)
  return renderKitSession(session)
}

/** Every device that offers a kit, rendered. The library-wide checks below all read this. */
function everySession(): { device: Device; doc: string }[] {
  return DEVICES.flatMap((device) => {
    const session = kitSession(device)
    return session === undefined ? [] : [{ device, doc: renderKitSession(session) }]
  })
}

describe('kit session fixtures (§3.7, invariant 6)', () => {
  for (const name of KIT_NAMES) {
    describe(name, () => {
      it('matches the committed bytes exactly', () => {
        expect(kitText(name)).toBe(readFileSync(kitPath(name), 'utf8'))
      })

      it('renders the same bytes twice in one process', () => {
        expect(kitText(name)).toBe(kitText(name))
      })

      it('is byte-identical under a non-C LANG', () => {
        const child = spawnSync(TSX, [GENERATOR, name], {
          encoding: 'utf8',
          cwd: REPO_ROOT,
          env: { ...process.env, LANG: HOSTILE_LOCALE, LC_ALL: HOSTILE_LOCALE },
        })
        expect(child.error).toBeUndefined()
        expect(child.status, child.stderr).toBe(0)
        expect(child.stdout).toBe(readFileSync(kitPath(name), 'utf8'))
      })
    })
  }

  it('actually runs the child in the hostile locale, or it proves nothing', () => {
    // Without this, a Node that ignored LANG would make the test above compare two runs of the
    // same locale and pass whatever the renderer did.
    const probe = spawnSync(
      process.execPath,
      ['-e', 'process.stdout.write(Intl.DateTimeFormat().resolvedOptions().locale)'],
      { encoding: 'utf8', env: { ...process.env, LANG: HOSTILE_LOCALE, LC_ALL: HOSTILE_LOCALE } },
    )
    expect(probe.stdout).toBe('tr-TR')
  })

  it('has something in it a hostile locale could break', () => {
    // The locale test is only a test if the document contains something ICU would move. Upper
    // case is the trap here — `toLocaleUpperCase` turns `i` into a dotted capital under tr-TR —
    // and every slot name is upper-cased role text.
    const names = LINES.filter((line) => line.startsWith('## ') && line.includes('`'))
    expect(names.length).toBeGreaterThan(0)
    const dotless = names.some((line) => /[İı]/.test(line))
    expect(dotless, 'a Turkish upper case reached the fixture').toBe(false)
    expect(CASCADIA).toContain('`KICK 1`')
  })
})

describe('what the kit session prints', () => {
  it('opens with the box and what the list is', () => {
    expect(LINES[0]).toBe('# Intellijel Cascadia: build a kit')
    expect(CASCADIA).toContain('8 drum sounds this box makes on its own')
  })

  it('states the destination once, as an instruction, and asks nothing of the box for it', () => {
    // The reader's own gear. No box in the library is claimed to record, and nothing in the
    // model says whether one could (§3.7).
    expect(LINES.filter((line) => line === RECORD_EACH).length).toBe(1)
  })

  it('ends every sound with one hit and the name the model gave it', () => {
    const session = kitSession(byId('intellijel-cascadia'))
    const slots = session?.slots ?? []
    expect(slots.length).toBe(8)
    for (const [i, slot] of slots.entries()) {
      // The heading carries the model's name, and so does the last line under it.
      expect(CASCADIA).toContain(`## ${i + 1}. \`${slot.name}\` — ${slot.recipe.title}`)
      expect(CASCADIA).toContain(`Record one hit with your recorder as \`${slot.name}\`.`)
    }
    // Once per slot and nowhere else: the instruction is the end of a sound, not a refrain.
    expect(CASCADIA.split('Record one hit with your recorder as').length - 1).toBe(8)
  })

  it('closes every slot with the record line, before the next one opens', () => {
    // Not just present — *last*. A record instruction with settings under it is a reader
    // recording a sound they have not finished building.
    const starts = LINES.flatMap((line, i) => (/^## \d+\. /.test(line) ? [i] : []))
    expect(starts.length).toBe(8)
    for (const [n, start] of starts.entries()) {
      const end = starts[n + 1] ?? LINES.findIndex((line) => line === '## Not in this kit')
      const body = LINES.slice(start, end).filter((line) => line !== '')
      expect(body[body.length - 1], `slot ${n + 1}`).toMatch(
        /^Record one hit with your recorder as `[A-Z 0-9]+`\.$/,
      )
    }
  })

  it('makes MANUAL GATE sufficient on every Cascadia sound, and says so once', () => {
    // The reader this page is for has nothing plugged into the box. p.54's button is what plays
    // these patches, and `test/cascadia.test.ts` holds the same recipes to leaving both envelopes
    // under it, which is what makes the offer true rather than merely printed.
    //
    // #496: it is one fact about the box, so it is printed once, in the header, above the eight
    // sounds it is true of. It used to be printed on every one of them — 194 characters, eight
    // times, two thirds of this document's routing prose — and every test asserted it was
    // *present*, which is exactly what a repetition passes.
    const routing = LINES.filter((line) => line.startsWith('Routing — '))
    expect(routing.length).toBe(9)
    expect(routing[0]).toContain('MANUAL GATE')
    // The header sentence, and then eight lines that say only what makes each sound different.
    for (const line of routing.slice(1)) expect(line).not.toContain('MANUAL GATE')
    // Once as a routing line. The button is named a second time in a parameter note, where it is
    // how to load an alternate noise source — a different fact, on the sound that needs it.
    expect(LINES.filter((line) => line.includes('MANUAL GATE')).length).toBe(2)
  })

  it('gives each sound its authored half and nothing more', () => {
    // #496 on the fixture: one header sentence, then one line per sound that is *exactly* what
    // the device folder authored for that sound. Not a bound on how alike two of them may be —
    // that would be an authoring policy nobody decided (`test/routing-preamble.test.ts` says
    // why, and holds the same claim on all six migrated boxes).
    const session = kitSession(byId('intellijel-cascadia'))
    const slots = session?.slots ?? []
    const lines = LINES.filter((line) => line.startsWith('Routing — ')).map((line) =>
      line.slice('Routing — '.length),
    )
    expect(lines[0]).toBe(`${session?.routingPreamble ?? ''}.`)
    expect(lines.slice(1)).toEqual(slots.map((slot) => slot.recipe.routing))
  })

  it('prints the routing, the cables and the settings of each recipe, in build order', () => {
    const kick = CASCADIA.slice(CASCADIA.indexOf('## 1. '), CASCADIA.indexOf('## 2. '))
    expect(kick.indexOf('Routing — ')).toBeLessThan(kick.indexOf('**Patch**'))
    expect(kick.indexOf('**Patch**')).toBeLessThan(kick.indexOf('**Settings**'))
    // A cable in §8's own shape, with the author's note under it.
    expect(kick).toContain('- `ENVELOPE B · ENV B` → `VCO A · FM 1`')
    expect(kick).toContain('  - ↳ note: FM 1 has no normal, so this cable is the whole pitch drop')
    // An authored value: monospace, its unit, and the bounds beside it.
    expect(kick).toContain('- **ENVELOPE A · DECAY** `190` ms (0.6…2500 ms)')
  })

  it('rests the whole page on one citation sentence, with no mark on any value', () => {
    // Italics, not the bold `**Patch**` and `**Settings**` labels beside them.
    const cited = LINES.filter((line) => /^\*[^*].*[^*]\*$/.test(line))
    expect(cited).toEqual([
      '*This block draws on the Intellijel Cascadia Manual v1.4, pp.22-58; its values are starting points.*',
    ])
    // Invariant 4's ink rule. No per-value provenance word and no page hung under a value —
    // the only page numbers on this page are inside prose an author wrote.
    for (const line of LINES.filter((line) => line.startsWith('- **'))) {
      expect(line).not.toMatch(/ · (manual|observed|provisional|authored)\b/)
    }
    expect(CASCADIA).not.toContain('↳ page:')
  })

  it('counts its citation over the settings it printed, and nothing else', () => {
    // The sentence names the span pp.22-58. Every page in it comes off a parameter this
    // document rendered: a recipe that is not in the kit cannot move it. The Cascadia's other
    // thirteen recipes cite as far as p.93, and that page is nowhere in the sentence.
    const kit = new Set(kitRecipes(byId('intellijel-cascadia')))
    expect(kit.size).toBe(8)
    expect(CASCADIA).toContain('pp.22-58')
    expect(CASCADIA).not.toContain('p.93')
  })

  it('names the core sounds this box does not make, last', () => {
    expect(LINES.filter((line) => line.startsWith('## Not in this kit')).length).toBe(1)
    const at = LINES.indexOf('## Not in this kit')
    expect(at).toBeGreaterThan(LINES.lastIndexOf('`kick` · `hard`'))
    // The action, and no claim about what the box can or cannot do.
    expect(LINES[at + 2]).toBe(
      'Bring snare, clap, rim, closed hat, open hat and ride from another box or a sample library.',
    )
  })

  it('carries no phase of a guide, because there is no song here', () => {
    // §8's seven phases by name, none of them a heading here. A kit is a set of sounds; the
    // arrangement, the clock, the harmony, the hook and the step patterns are all properties of
    // a song this reader has not asked for, and none of them can be derived from one device.
    for (const [i, phase] of GUIDE_PHASES.entries()) {
      expect(LINES, phase).not.toContain(`## ${i + 1}. ${phase}`)
    }
    for (const word of ['BPM', 'Sections', 'The hook', 'clock source', 'sync to it', 'Gaps']) {
      expect(CASCADIA, word).not.toContain(word)
    }
  })

  it('moves no value, because no mood is in play', () => {
    // §8 renders `52 → 45` exactly when mood or the key moved a value. Nothing here can: the
    // model carries no mood and this renderer asks for none.
    for (const doc of everySession()) {
      expect(doc.doc, doc.device.id).not.toMatch(/`-?[\d.]+ → -?[\d.]+`/)
    }
  })
})

describe('the renderer itself', () => {
  it('reaches for no locale-dependent or random API (§7.2)', () => {
    // The subprocess above proves this document does not move under tr-TR. This says the two
    // modules behind it cannot, which is the check that still holds the day a fixture stops
    // covering a code path. Comments name these to say why they are banned, so the scan is of
    // code only — the same shape `determinism.test.ts` uses on the engine.
    for (const file of ['kit-markdown.ts', 'kit-session.ts']) {
      const source = readFileSync(join(REPO_ROOT, 'lib', 'studio', file), 'utf8')
      const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
      for (const banned of ['localeCompare', 'toLocale', 'Intl.', 'Math.random']) {
        expect(code, `${file}: ${banned}`).not.toContain(banned)
      }
    }
  })
})

describe('across every box that offers a kit', () => {
  it('renders one slot heading and one record line per slot', () => {
    for (const { device, doc } of everySession()) {
      const slots = kitRecipes(device).length
      expect(doc.split('Record one hit with your recorder as').length - 1, device.id).toBe(slots)
      expect(doc.split('\n').filter((l) => /^## \d+\. /.test(l)).length, device.id).toBe(slots)
    }
  })

  it('draws a module box where a folder authored one, and bare lines where it did not', () => {
    // The Cascadia authors no `module` on a kit parameter, so its list is flat; the Model D
    // authors one on every one of them. Both shapes are this renderer's, and neither is a
    // special case in it.
    expect(CASCADIA).not.toContain('- **● ')
    const modelD = sessionDoc('behringer-model-d')
    expect(modelD).toContain('- **● ')
    // A boxed control hangs under its module rather than beside it.
    expect(modelD).toMatch(/\n- \*\*● [^\n]+\*\*\n {2}- \*\*/)
  })

  it('prints a hint under the value it is a jog for, with no toggle to hide it', () => {
    // §8.1 hides hints behind a toggle for a reader who has outgrown them. There is no toggle
    // on this surface and no reader who has: they are deciding whether to build the patch.
    const motherThirtyTwo = sessionDoc('moog-mother-32')
    expect(motherThirtyTwo).toContain('  - ↳ hint: ')
  })

  it('marks a value one setting of which covers everything', () => {
    // §3.6's correction, kept: unmarked, a reader working down a kit sets a song-wide value
    // again for every sound and wonders why the last one won.
    const rd9 = sessionDoc('behringer-rd-9')
    expect(rd9).toMatch(/ · (song|pattern)-wide$/m)
  })

  it('says the same thing about the recorder on every box', () => {
    for (const { device, doc } of everySession()) {
      expect(doc.split(RECORD_EACH).length - 1, device.id).toBe(1)
    }
  })

  it('opens a Settings block only where the recipe has settings', () => {
    // An empty heading is a reader looking for something that is not there, and a sentence
    // saying so would be a line about this library rather than about the box.
    for (const { device, doc } of everySession()) {
      const authored = kitRecipes(device).filter((recipe) => recipe.params.length > 0).length
      expect(doc.split('**Settings**').length - 1, device.id).toBe(authored)
    }
  })
})
