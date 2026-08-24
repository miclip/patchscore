import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { NEUTRAL_MOOD, renderGuide, resolve } from '../lib/core/index'
import type { ResolveResult, Template } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { industrialTechno } from '../lib/templates/index'
import { Guide } from '../components/guide/guide'

/**
 * §12.4 stacking, rendered — the fixture #40 asked for by name: "a Cascadia plus a Crave,
 * anything all-monophonic".
 *
 * A Crave and a Subsequent 37 and nothing else, asked for the industrial-techno `stab`, which
 * is a hard triad. Neither box can sound three notes; between them they can, and the guide has
 * to say which box plays which note of the chord, on which steps, with the settings under the
 * right panel and every value still carrying its provenance.
 *
 * Real manifests, deliberately. A fixture rig would prove the code paths and prove nothing
 * about whether the sentences it produces describe hardware anybody owns — and the Sub 37 being
 * *duophonic* is the detail that makes this fixture worth having: the stack is two voices
 * carrying one note and two, not three voices carrying one each, so a rendering that assumed
 * one note per voice would be visibly wrong here and invisibly wrong everywhere else.
 */

const CRAVE = 'behringer-crave'
const SUB37 = 'moog-subsequent-37'

const rig = DEVICES.filter((d) => d.id === CRAVE || d.id === SUB37)

/** industrial-techno, cut to the one request and the one hook this fixture is about. */
const stabOnly: Template = {
  ...industrialTechno,
  roles: industrialTechno.roles.filter((r) => r.id === 'r-stab'),
  hooks: industrialTechno.hooks.filter((h) => h.forRole === 'stab'),
}

const result: ResolveResult = resolve({
  devices: rig,
  template: stabOnly,
  mood: NEUTRAL_MOOD,
  seed: 1,
})

const doc = renderGuide(result)
const html = renderToStaticMarkup(createElement(Guide, { result, seed: 1 }))

/** Everything under one `## n. Name` heading of a rendered guide, up to the next one. */
function phaseOf(rendered: string, name: string): string {
  const lines = rendered.split('\n')
  const start = lines.findIndex((l) => /^## \d+\. /.test(l) && l.endsWith(name))
  expect(start, `no phase named ${name}`).toBeGreaterThan(-1)
  const rest = lines.slice(start + 1)
  const end = rest.findIndex((l) => /^## \d+\. /.test(l))
  return (end === -1 ? rest : rest.slice(0, end)).join('\n')
}

function phase(name: string): string {
  return phaseOf(doc, name)
}

// ---------------------------------------------------------------------------
// The stack itself
// ---------------------------------------------------------------------------

describe('a Crave and a Subsequent 37 carry one triad between them (#40, §12.4)', () => {
  it('resolves to two voices on two boxes, carrying one note and two', () => {
    expect(result.assignments.length).toBe(1)
    const stab = result.assignments[0]
    expect(stab?.role).toBe('stab')
    expect(stab?.notes).toBe(3)
    expect(stab?.members.map((m) => m.deviceId)).toEqual([CRAVE, SUB37])
    // The Sub 37 is duophonic, so the minimal stack is two voices and not three.
    expect(stab?.members.map((m) => m.notes)).toEqual([1, 2])
    expect(result.gaps).toEqual([])
  })

  it('gives each box its own recipe, resolved against its own manifest', () => {
    const members = result.assignments[0]?.members ?? []
    const ids = members.map((m) => m.recipe.id)
    expect(new Set(ids).size).toBe(2)
    expect(ids[0]?.startsWith('crave-')).toBe(true)
    expect(ids[1]?.startsWith('sub37-')).toBe(true)
  })

  it('counts both voices against their own devices, so neither box reads as idle', () => {
    // §12.4: crowding and the rig phase count assignables, and a stack occupies one on each box.
    for (const name of ['CRAVE', 'Subsequent 37']) {
      expect(phase('Rig integration')).toContain(`**${name}**`)
    }
    // "1 part" on both, not one box carrying it and one idle.
    const rigPhase = phase('Rig integration')
    expect(rigPhase.match(/· 1 part/g)?.length).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Phase 2 — every voice and its share
// ---------------------------------------------------------------------------

describe('phase 2 names every voice and its note share (§8)', () => {
  const body = phase('Voice assignment')

  it('names both boxes on the head line rather than only the first', () => {
    expect(body).toContain('**`stab`** → CRAVE · Voice + Subsequent 37 · Voice')
  })

  it('says how many notes, across how many voices', () => {
    expect(body).toContain('3 notes across 2 voices')
  })

  it('gives one line per voice, with that voice’s share and its own recipe title', () => {
    expect(body).toContain('- CRAVE · Voice — 1 note — *')
    expect(body).toContain('- Subsequent 37 · Voice — 2 notes — *')
  })

  it('does not claim a single recipe title for the whole part', () => {
    // An unstacked part reads `→ Device · Voice — *Title*`. A stacked one must not, because the
    // title it would print is one box's out of two.
    const head = body.split('\n').find((l) => l.startsWith('- **`stab`**')) as string
    expect(head).not.toContain(' — *')
  })
})

// ---------------------------------------------------------------------------
// Phase 4 — which box plays which note
// ---------------------------------------------------------------------------

/**
 * The MIDI numbers each box was handed, per chord, read back out of a rendered guide.
 *
 * Scoped to the Hook phase, because phase 2 lists the same two voices under the same prefix —
 * a parser reading the whole document counts the assignment summary as a fifth chord.
 */
function splitChords(rendered: string): { crave: number[]; sub37: number[] }[] {
  const midi = (line: string): number[] =>
    (line.split('MIDI ')[1] ?? '').trim().split(' ').map(Number)
  const out: { crave: number[]; sub37: number[] }[] = []
  for (const line of phaseOf(rendered, 'Hook').split('\n')) {
    if (line.startsWith('  - CRAVE · Voice —')) out.push({ crave: midi(line), sub37: [] })
    else if (line.startsWith('  - Subsequent 37 · Voice —')) {
      const last = out[out.length - 1]
      if (last !== undefined) last.sub37 = midi(line)
    }
  }
  return out
}

describe('phase 4 maps each chord onto the voices, lowest note first (§8, §12.4)', () => {
  const body = phase('Hook')

  it('states the rule before the chords, so the mapping is not guessed at', () => {
    expect(body).toContain('2 voices carry this part, one line of the chord each')
    expect(body).toContain('Lowest note to the first voice and upwards from there')
  })

  it('places A minor exactly: A3 on the Crave, C4 and E4 on the Sub 37', () => {
    expect(body).toContain('- bar 1 · step 1 · len 2 · `A3` `C4` `E4` · root 3rd 5th · MIDI 57 60 64')
    expect(body).toContain('  - CRAVE · Voice — `A3` · MIDI 57')
    expect(body).toContain('  - Subsequent 37 · Voice — `C4` `E4` · MIDI 60 64')
  })

  it('places the fourth chord the same way, so a voice keeps its line all the way through', () => {
    // The progression's last chord is E G B, a different shape — and the Crave still takes the
    // bottom of it. That stability is the whole reason the rule is lowest-first and fixed.
    expect(body).toContain('- bar 4 · step 49 · len 3 · `E4` `G4` `B4` · 5th 7th 2nd · MIDI 64 67 71')
    expect(body).toContain('  - CRAVE · Voice — `E4` · MIDI 64')
    expect(body).toContain('  - Subsequent 37 · Voice — `G4` `B4` · MIDI 67 71')
  })

  it('maps every chord in the hook, not only the first', () => {
    const craveLines = body.split('\n').filter((l) => l.startsWith('  - CRAVE · Voice —'))
    const sub37Lines = body.split('\n').filter((l) => l.startsWith('  - Subsequent 37 · Voice —'))
    expect(craveLines.length).toBe(4)
    expect(sub37Lines.length).toBe(4)
  })

  it('is stable across seeds: the Crave always takes the bottom of the chord', () => {
    // Asserted as the *rule* rather than as a pitch, because the seed picks the key (§7 step 10)
    // and A3 is only A3 in A minor. What must not move is which box plays the bottom line.
    for (const seed of [0, 1, 2, 3, 5, 8, 13, 21]) {
      const other = renderGuide(
        resolve({ devices: rig, template: stabOnly, mood: NEUTRAL_MOOD, seed }),
      )
      const chords = splitChords(other)
      expect(chords.length, `seed ${seed}`).toBe(4)
      for (const chord of chords) {
        expect(Math.max(...chord.crave), `seed ${seed}`).toBeLessThan(Math.min(...chord.sub37))
        // And the shares stay 1 and 2, which is what the voices can sound.
        expect(chord.crave.length, `seed ${seed}`).toBe(1)
        expect(chord.sub37.length, `seed ${seed}`).toBe(2)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// Phase 5 — one rhythm, entered twice
// ---------------------------------------------------------------------------

describe('phase 5 says to duplicate the timing across the voices (§8)', () => {
  const body = phase('Step programming')

  it('tells the reader to enter the same steps on each voice, and names them', () => {
    expect(body).toContain(
      'Enter this same timing on **each of the 2 voices** — CRAVE · Voice + Subsequent 37 · Voice.',
    )
    expect(body).toContain('only the note each voice plays differs, and that is in Hook')
  })

  it('says it before the grid, not after the reader has entered one', () => {
    const lines = body.split('\n')
    const said = lines.findIndex((l) => l.startsWith('Enter this same timing'))
    const grid = lines.findIndex((l) => l === '```')
    expect(said).toBeGreaterThan(-1)
    expect(said).toBeLessThan(grid)
  })

  it('repeats it in every merged block, because each is a separate thing to enter', () => {
    const blocks = body.split('\n').filter((l) => l.startsWith('**') && l.includes(' steps, band '))
    const said = body.split('\n').filter((l) => l.startsWith('Enter this same timing'))
    expect(blocks.length).toBeGreaterThan(1)
    expect(said.length).toBe(blocks.length)
  })

  it('heads the part with both voices', () => {
    expect(body).toContain('### `stab` — CRAVE · Voice + Subsequent 37 · Voice')
  })
})

// ---------------------------------------------------------------------------
// Phase 6 — each box's own settings, under that box
// ---------------------------------------------------------------------------

describe('phase 6 puts each voice’s settings under its actual device (§8, §12.4)', () => {
  const body = phase('Sound design')

  /** The lines under one `### Device` heading, up to the next one. */
  function underDevice(name: string): string {
    const lines = body.split('\n')
    const start = lines.indexOf(`### ${name}`)
    expect(start, `no device heading for ${name}`).toBeGreaterThan(-1)
    const rest = lines.slice(start + 1)
    const end = rest.findIndex((l) => l.startsWith('### '))
    return (end === -1 ? rest : rest.slice(0, end)).join('\n')
  }

  it('gives both boxes a heading of their own', () => {
    expect(body).toContain('### CRAVE')
    expect(body).toContain('### Subsequent 37')
  })

  it('prints the Crave recipe under the Crave and nowhere else', () => {
    const crave = underDevice('CRAVE')
    // A parameter only the Crave has, and one only the Sub 37 has.
    expect(crave).toContain('- **PULSE WIDTH**')
    expect(underDevice('Subsequent 37')).not.toContain('- **PULSE WIDTH**')
  })

  it('prints the Sub 37 recipe under the Sub 37 and nowhere else', () => {
    const sub37 = underDevice('Subsequent 37')
    expect(sub37).toContain('- **OSC 1 · WAVE**')
    expect(underDevice('CRAVE')).not.toContain('- **OSC 1 · WAVE**')
  })

  it('tells each box what share of the chord it plays and where the rest is', () => {
    expect(underDevice('CRAVE')).toContain(
      'Polyphony — 3 notes across 2 voices, and this one plays 1 of them. Same steps as the ' +
        'other voice — see Step programming — and the note this voice takes is in Hook.',
    )
    expect(underDevice('Subsequent 37')).toContain(
      'Polyphony — 3 notes across 2 voices, and this one plays 2 of them.',
    )
  })

  it('keeps provenance on every value, on both boxes (invariant 4)', () => {
    // Each device hoists its own manual, and neither hoists the other's.
    expect(underDevice('CRAVE')).toContain('CRAVE Quick Start Guide')
    expect(underDevice('Subsequent 37')).toContain("Subsequent 37 User's Manual")
    expect(underDevice('CRAVE')).not.toContain("Subsequent 37 User's Manual")
    // Provenance reaches the page rather than being dropped somewhere in the member split.
    for (const name of ['CRAVE', 'Subsequent 37']) {
      const params = underDevice(name)
        .split('\n')
        .filter((l) => l.startsWith('- **'))
      expect(params.length, name).toBeGreaterThan(4)
    }
    expect(result.assignments[0]?.members.every((m) => m.params.length > 0)).toBe(true)
    expect(
      result.assignments[0]?.members.every((m) =>
        m.params.every((p) => p.provenance.state !== undefined),
      ),
    ).toBe(true)
  })

  it('carries the Crave’s patch entry under the Crave, since the recipe that declares it is there', () => {
    const members = result.assignments[0]?.members ?? []
    const crave = members.find((m) => m.deviceId === CRAVE)
    if ((crave?.patch.length ?? 0) > 0) {
      expect(underDevice('CRAVE')).toContain('**Patch**')
    }
    // Whatever each member declares belongs to that member and to no other.
    for (const member of members) {
      for (const entry of member.patch) {
        expect(underDevice(member.deviceName)).toContain(entry.from)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// #33 — the two renderers agree about a stack
// ---------------------------------------------------------------------------

describe('both renderers say the same things about a stack (#33)', () => {
  it('phase 2: both name both voices and both shares', () => {
    expect(html).toContain('CRAVE · Voice + Subsequent 37 · Voice')
    expect(html).toContain('3 notes across 2 voices')
    // One line per voice, each with its share.
    expect(html).toContain('1 note')
    expect(html).toContain('2 notes')
  })

  it('phase 4: both place the same notes on the same boxes', () => {
    // The web view marks the note name up rather than fencing it, so the assertion is on the
    // pitch and the MIDI number, which is the pair the Markdown prints too.
    expect(html).toContain('>A3<')
    expect(html).toContain('>57<')
    expect(html).toContain('>60 64<')
    expect(html).toContain('Lowest note to the first voice and upwards from there')
  })

  it('phase 5: both tell the reader to duplicate the timing', () => {
    expect(html).toContain('Enter this same timing on')
    expect(html).toContain('each of the 2 voices')
  })

  it('phase 6: both put each recipe under its own box', () => {
    expect(html).toContain('PULSE WIDTH')
    expect(html).toContain('OSC 1 · WAVE')
    // Both recipe titles appear; neither renderer picks one to stand for the part.
    for (const member of result.assignments[0]?.members ?? []) {
      expect(html).toContain(member.recipe.title)
      expect(doc).toContain(member.recipe.title)
    }
  })

  it('phase 6: both say the same polyphony sentence, word for word', () => {
    expect(html).toContain(
      'Polyphony — 3 notes across 2 voices, and this one plays 1 of them. Same steps as the ' +
        'other voice — see Step programming — and the note this voice takes is in Hook.',
    )
  })

  it('neither renderer describes the stack as one polyphonic voice or one sample', () => {
    for (const text of [doc, html]) {
      expect(text).not.toContain('at once on one polyphonic voice')
      expect(text).not.toContain('from one sampled chord')
    }
  })
})
