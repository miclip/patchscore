import { describe, expect, it } from 'vitest'
import {
  MODES,
  chooseHook,
  chooseKey,
  enharmonicAlternative,
  parseKey,
  resolveHook,
  resolveHooksForRole,
  sharpSpelling,
  type Hook,
  HookNoteSchema,
} from '../lib/core/index'
import { TEMPLATES, industrialTechno } from '../lib/templates/index'
import { degreeName } from '../components/guide/format'
import { degreeLabel } from '../lib/studio/riff-text'

/**
 * §4.1. Scale degrees against a key produce concrete notes, in scientific pitch notation with
 * middle C at C4. Every expectation here is a note name, not a semitone count: the note name is
 * what the guide prints and what a reader plays.
 */

function hook(over: Partial<Hook> = {}): Hook {
  return {
    id: 'h',
    forRole: 'lead',
    bars: 1,
    baseOctave: 4,
    notes: [{ step: 1, degree: 1, octave: 0, len: 1 }],
    ...over,
  }
}

/** The note names a hook produces, in authored order. Fails loudly if it did not resolve. */
function notesOf(h: Hook, key: string): string[] {
  const result = resolveHook(h, key)
  if (result.outcome !== 'resolved') throw new Error(`${result.reason}: ${result.detail}`)
  return result.hook.notes.map((n) => n.note)
}

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------

describe('parseKey (§4.1)', () => {
  it('reads a tonic, an accidental and a mode', () => {
    expect(parseKey('F minor')).toEqual({
      source: 'F minor',
      letter: 'F',
      accidental: 0,
      mode: 'minor',
    })
    expect(parseKey('A# major')?.accidental).toBe(1)
    expect(parseKey('Bb minor')?.accidental).toBe(-1)
    expect(parseKey('Cbb major')?.accidental).toBe(-2)
  })

  it('knows every diatonic mode, because Template.keys is an open string (§4)', () => {
    // `F dorian` is legal authoring today (test/template.test.ts asserts it parses), so a
    // resolver that only knew major and minor would refuse data the schema accepts.
    for (const mode of MODES) expect(parseKey(`D ${mode}`)?.mode).toBe(mode)
  })

  it('returns undefined rather than guessing at anything else', () => {
    for (const key of ['F', 'minor', 'H minor', 'F Minor', 'F  minor', 'F blues', 'F# ']) {
      expect(parseKey(key), key).toBeUndefined()
    }
  })

  it('parses every key every registered template offers', () => {
    for (const template of TEMPLATES) {
      for (const key of template.keys) {
        expect(parseKey(key), `${template.id} offers an unparseable key '${key}'`).toBeDefined()
      }
    }
  })
})

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

describe('resolveHook (§4.1)', () => {
  it('puts middle C at C4', () => {
    expect(notesOf(hook({ baseOctave: 4 }), 'C major')).toEqual(['C4'])
    expect(notesOf(hook({ baseOctave: 4 }), 'C minor')).toEqual(['C4'])
    expect(notesOf(hook({ baseOctave: 3 }), 'C major')).toEqual(['C3'])
  })

  it('reads baseOctave as the origin and HookNote.octave as an offset from it', () => {
    const degrees = (baseOctave: number, octave: number) =>
      notesOf(hook({ baseOctave, notes: [{ step: 1, degree: 1, octave, len: 1 }] }), 'F minor')

    expect(degrees(4, 0)).toEqual(['F4'])
    expect(degrees(4, 1)).toEqual(['F5'])
    expect(degrees(4, -1)).toEqual(['F3'])
    // The same note reached two ways: the origin moves, the offset moves, the pitch is one pitch.
    expect(degrees(1, 3)).toEqual(degrees(4, 0))
  })

  it('crosses into the next octave at C, not at the tonic', () => {
    // The trap scientific pitch notation sets: in F minor the fifth above F4 is C5, so the
    // octave number changes inside a single degree run that never left `octave: 0`.
    const scale = hook({
      baseOctave: 4,
      notes: [1, 2, 3, 4, 5, 6, 7, 8].map((degree) => ({
        step: degree,
        degree,
        octave: 0,
        len: 1,
      })),
    })
    expect(notesOf(scale, 'F minor')).toEqual([
      'F4', 'G4', 'Ab4', 'Bb4', 'C5', 'Db5', 'Eb5', 'F5',
    ])
  })

  it('wraps a degree past the seventh into the octave above', () => {
    const ninth = hook({ baseOctave: 4, notes: [{ step: 1, degree: 9, octave: 0, len: 1 }] })
    expect(notesOf(ninth, 'F minor')).toEqual(['G5'])

    // A ninth is a second an octave up, whichever way it was authored.
    const second = hook({ baseOctave: 4, notes: [{ step: 1, degree: 2, octave: 1, len: 1 }] })
    expect(notesOf(second, 'F minor')).toEqual(notesOf(ninth, 'F minor'))
  })

  it('spells by letter, so a minor third is a flat and never a sharp', () => {
    const third = hook({ baseOctave: 4, notes: [{ step: 1, degree: 3, octave: 0, len: 1 }] })
    expect(notesOf(third, 'F minor')).toEqual(['Ab4'])
    expect(notesOf(third, 'F major')).toEqual(['A4'])
    expect(notesOf(third, 'A minor')).toEqual(['C5'])
    expect(notesOf(third, 'C minor')).toEqual(['Eb4'])
    // Every letter appears exactly once in a diatonic scale, which is what makes this work.
    const scale = hook({
      baseOctave: 4,
      notes: [1, 2, 3, 4, 5, 6, 7].map((degree) => ({ step: degree, degree, octave: 0, len: 1 })),
    })
    for (const key of ['F minor', 'C minor', 'A minor', 'Bb minor', 'A# major', 'F dorian']) {
      const letters = notesOf(scale, key).map((n) => n[0] as string)
      expect(new Set(letters).size, `${key} spells two degrees on one letter`).toBe(7)
    }
  })

  it('reaches a double sharp rather than mis-spelling it', () => {
    // A# major's seventh is G##. Renaming it A4 would be the wrong letter for the degree.
    const seventh = hook({ baseOctave: 4, notes: [{ step: 1, degree: 7, octave: 0, len: 1 }] })
    expect(notesOf(seventh, 'A# major')).toEqual(['G##5'])
  })

  it('carries timing through untouched', () => {
    const h = hook({
      baseOctave: 2,
      notes: [
        { step: 1, degree: 1, octave: 0, len: 6 },
        { step: 11, degree: 5, octave: 0, len: 4 },
      ],
    })
    const result = resolveHook(h, 'F minor')
    if (result.outcome !== 'resolved') throw new Error(result.detail)
    expect(result.hook.notes.map((n) => [n.step, n.len])).toEqual([
      [1, 6],
      [11, 4],
    ])
    // The authored degree and offset survive too, so the guide can show its working.
    expect(result.hook.notes.map((n) => [n.degree, n.octave])).toEqual([
      [1, 0],
      [5, 0],
    ])
    expect(result.hook.key).toBe('F minor')
    expect(result.hook.hookId).toBe('h')
    expect(result.hook.forRole).toBe('lead')
    expect(result.hook.bars).toBe(1)
  })

  it('keeps authored order, so a chord voicing survives', () => {
    const triad = hook({
      baseOctave: 3,
      notes: [
        { step: 1, degree: 5, octave: 0, len: 2 },
        { step: 1, degree: 1, octave: 1, len: 2 },
        { step: 1, degree: 3, octave: 1, len: 2 },
      ],
    })
    expect(notesOf(triad, 'F minor')).toEqual(['C4', 'F4', 'Ab4'])
  })

  it('never clamps or transposes to fit a device (§4.1)', () => {
    // We do not model note range, and inventing one here would be device knowledge leaking
    // across invariant 3's boundary. A hook that asks for a note nothing can play still says so.
    expect(notesOf(hook({ baseOctave: -1 }), 'C major')).toEqual(['C-1'])
    const ceiling = hook({ baseOctave: 9, notes: [{ step: 1, degree: 7, octave: 2, len: 1 }] })
    expect(notesOf(ceiling, 'C major')).toEqual(['B11'])
  })

  it('reports an unparseable key rather than inventing one (invariant 5)', () => {
    const result = resolveHook(hook(), 'F blues')
    expect(result.outcome).toBe('unresolved')
    if (result.outcome !== 'unresolved') throw new Error('unreachable')
    expect(result.reason).toBe('unparsed-key')
    expect(result.detail).toContain('F blues')
  })
})

// ---------------------------------------------------------------------------
// The real template
// ---------------------------------------------------------------------------

/**
 * §4.1. **A line that follows a chord the key does not contain.** `degree` reaches the seven notes
 * of the mode and no more, which is enough until a minor progression borrows a major chord — and
 * then the melody wants the major third over the `I` and the minor third over the `i`, which are
 * the same degree.
 */
describe('an altered degree (§4.1)', () => {
  const one = (degree: number, alter: number | undefined, key: string) =>
    notesOf(hook({ notes: [{ step: 1, degree, octave: 0, len: 1, ...(alter === undefined ? {} : { alter }) }] }), key)

  it('raises and lowers a degree without moving its letter', () => {
    // The point of an offset on a degree rather than a semitone field: the letter still comes
    // from the degree, so the third of F# minor raised is `A#` — the spelling the F# major chord
    // it belongs to uses — and never `Bb`.
    expect(one(3, undefined, 'F# minor')).toEqual(['A4'])
    expect(one(3, 1, 'F# minor')).toEqual(['A#4'])
    expect(one(6, undefined, 'F# minor')).toEqual(['D5'])
    expect(one(6, 1, 'F# minor')).toEqual(['D#5'])
    expect(one(7, -1, 'C major')).toEqual(['Bb4'])
  })

  it('is absent by default and identical to omitting it when zero', () => {
    expect(one(3, undefined, 'F# minor')).toEqual(one(3, 0, 'F# minor'))
    const plain = resolveHook(hook(), 'F minor')
    if (plain.outcome !== 'resolved') throw new Error('unresolved')
    // Not merely undefined — absent, so an unaltered note serialises exactly as it always did.
    expect('alter' in plain.hook.notes[0]!).toBe(false)
  })

  it('carries the alteration onto the resolved note, so a surface can say which degree it is', () => {
    const r = resolveHook(
      hook({ notes: [{ step: 1, degree: 3, octave: 0, len: 1, alter: 1 }] }),
      'F# minor',
    )
    if (r.outcome !== 'resolved') throw new Error('unresolved')
    expect(r.hook.notes[0]?.degree).toBe(3)
    expect(r.hook.notes[0]?.alter).toBe(1)
  })

  it('spells a double alteration, and refuses one the letter cannot carry', () => {
    // Two is spellable and is spelt, because `spell`'s guard is about what a note *name* can
    // say rather than about how far the alteration went: C major's third doubly lowered is a
    // kind of E, so it is `Ebb`.
    expect(one(3, -2, 'C major')).toEqual(['Ebb4'])
    expect(one(3, 2, 'C major')).toEqual(['E##4'])

    // Past that the guard still fires, and an alteration reaches it from a key that already
    // spends its accidentals: Cb major's root doubly lowered is a C needing three flats.
    const r = resolveHook(
      hook({ notes: [{ step: 1, degree: 1, octave: 0, len: 1, alter: -2 }] }),
      'Cb major',
    )
    expect(r.outcome).toBe('unresolved')
    expect(r.outcome === 'unresolved' ? r.reason : undefined).toBe('unspellable-note')
  })

  it('is bounded by the schema at a double accidental, where the spelling runs out', () => {
    const parse = (alter: number) =>
      HookNoteSchema.safeParse({ step: 1, degree: 3, octave: 0, len: 1, alter }).success
    expect(parse(-2)).toBe(true)
    expect(parse(2)).toBe(true)
    expect(parse(-3)).toBe(false)
    expect(parse(3)).toBe(false)
  })

  it('resolves the whole of a six-chord minor line that borrows two major chords', () => {
    // F#m D Bm F# B C#m: the melody takes the minor third over the i and the major third over
    // the I, and the natural sixth over the iv and the raised one over the IV. Eight pitch
    // classes, which is one more than any mode has — the case `alter` exists for.
    const notes = notesOf(
      hook({
        bars: 6,
        baseOctave: 4,
        notes: [
          { step: 1, degree: 5, octave: 0, len: 8 },
          { step: 9, degree: 3, octave: 0, len: 4 },
          { step: 17, degree: 1, octave: 1, len: 8 },
          { step: 25, degree: 7, octave: 0, len: 4 },
          { step: 29, degree: 6, octave: 0, len: 4 },
          { step: 33, degree: 3, octave: 0, len: 4, alter: 1 },
          { step: 41, degree: 6, octave: 0, len: 4, alter: 1 },
          { step: 49, degree: 2, octave: 0, len: 4 },
          { step: 57, degree: 7, octave: -1, len: 4 },
        ],
      }),
      'F# minor',
    )
    expect(notes).toEqual(['C#5', 'A4', 'F#5', 'E5', 'D5', 'A#4', 'D#5', 'G#4', 'E4'])
  })
})

describe('industrial-techno hooks resolve (§4.1)', () => {
  it('turns the bass hook into notes a reader can play in F minor', () => {
    const bass = industrialTechno.hooks.find((h) => h.id === 'it-hook-bass-1') as Hook
    // C2, not C1: a bass-mid tonic in the sub's octave beat against itself and stopped
    // reading as a line (#37). test/templates.test.ts holds the floor for every direction.
    expect(bass.baseOctave).toBe(2)
    // i - i - v - i - VII - i(8ve up), which is the line as authored.
    expect(notesOf(bass, 'F minor')).toEqual(['F2', 'F2', 'C3', 'F2', 'Eb3', 'F3'])
  })

  it('transposes the same hook by changing nothing but the key', () => {
    const bass = industrialTechno.hooks.find((h) => h.id === 'it-hook-bass-1') as Hook
    expect(notesOf(bass, 'A minor')).toEqual(['A2', 'A2', 'E3', 'A2', 'G3', 'A3'])
    expect(notesOf(bass, 'C minor')).toEqual(['C2', 'C2', 'G2', 'C2', 'Bb2', 'C3'])
  })

  it('voices the pad across the progression, above the bass and below the ceiling', () => {
    const pad = industrialTechno.hooks.find((h) => h.id === 'it-hook-pad-1') as Hook
    expect(notesOf(pad, 'F minor')).toEqual([
      'F3', 'Ab3', 'C4', // i
      'Db4', 'F4', 'Ab4', // VI
      'Eb4', 'G4', 'Bb4', // VII
    ])
  })

  it('resolves every hook against every key the template offers', () => {
    for (const template of TEMPLATES) {
      for (const key of template.keys) {
        for (const h of template.hooks) {
          const result = resolveHook(h, key)
          expect(
            result.outcome === 'resolved' ? 'resolved' : `${result.reason}: ${result.detail}`,
            `${template.id} ${h.id} in ${key}`,
          ).toBe('resolved')
        }
      }
    }
  })

  it('gathers hooks by role, and returns none where none are authored (§4.1)', () => {
    expect(resolveHooksForRole(industrialTechno.hooks, 'bass-mid', 'F minor')).toHaveLength(2)
    expect(resolveHooksForRole(industrialTechno.hooks, 'pad', 'F minor')).toHaveLength(1)
    // Invariant 5 applied to melody: no hook authored, no hook invented.
    expect(resolveHooksForRole(industrialTechno.hooks, 'kick', 'F minor')).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// #32 — the two representations a box may disagree with
// ---------------------------------------------------------------------------

describe('MIDI numbers and enharmonics (#32)', () => {
  it('numbers notes so that middle C is 60, matching §4.1s convention', () => {
    const middleC = hook({ baseOctave: 4, notes: [{ step: 1, degree: 1, octave: 0, len: 1 }] })
    const resolved = resolveHook(middleC, 'C major')
    expect(resolved.outcome === 'resolved' && resolved.hook.notes[0]).toMatchObject({
      note: 'C4',
      midi: 60,
    })
  })

  it('gives the same number to both spellings of one pitch', () => {
    // The issue's own example: Eb2 in F minor and D#2 in E major are both MIDI 39.
    const eFlat = hook({ baseOctave: 2, notes: [{ step: 1, degree: 7, octave: -1, len: 1 }] })
    const resolved = resolveHook(eFlat, 'F minor')
    expect(resolved.outcome === 'resolved' && resolved.hook.notes[0]).toMatchObject({
      note: 'Eb2',
      midi: 39,
    })
    expect(sharpSpelling(39)).toBe('D#2')
  })

  it('offers the sharps-only reading only where it differs', () => {
    const flat = { step: 1, len: 1, note: 'Eb2', midi: 39, degree: 7, octave: 0 }
    const natural = { step: 1, len: 1, note: 'F2', midi: 41, degree: 1, octave: 0 }
    expect(enharmonicAlternative(flat)).toBe('D#2')
    expect(enharmonicAlternative(natural)).toBeUndefined()
  })

  it('numbers below middle C without an off-by-one at the octave boundary', () => {
    expect(sharpSpelling(0)).toBe('C-1')
    expect(sharpSpelling(11)).toBe('B-1')
    expect(sharpSpelling(12)).toBe('C0')
    // §4.1 never clamps, so a hook written under the MIDI floor still resolves to a number.
    expect(sharpSpelling(-1)).toBe('B-2')
  })
})

// ---------------------------------------------------------------------------
// §4.1 — what the seed chooses
// ---------------------------------------------------------------------------

describe('seeded key and hook choice (§4.1)', () => {
  const keys = ['F minor', 'A minor', 'C minor']

  it('is a pure function of template id, list and seed', () => {
    for (let seed = 0; seed < 20; seed++) {
      expect(chooseKey('t', keys, seed)).toBe(chooseKey('t', keys, seed))
    }
  })

  it('reaches every authored key across seeds, rather than pinning one', () => {
    const seen = new Set<string>()
    for (let seed = 0; seed < 200; seed++) {
      const key = chooseKey('industrial-techno', keys, seed)
      if (key !== undefined) seen.add(key)
    }
    expect([...seen].sort()).toEqual([...keys].sort())
  })

  it('does not move the key and the hook in lockstep on a reroll', () => {
    // Both lists have three entries here, which is exactly when an unsalted seed would make
    // one choice track the other for every seed.
    const hooks: Hook[] = ['a', 'b', 'c'].map((id) => ({ ...hook(), id }))
    const pairs = new Set<string>()
    for (let seed = 0; seed < 60; seed++) {
      const key = chooseKey('t', keys, seed)
      const picked = chooseHook(hooks, 'lead', 'F minor', seed)
      pairs.add(`${key ?? ''}/${picked?.chosenId ?? ''}`)
    }
    expect(pairs.size).toBeGreaterThan(3)
  })

  it('reports no choice where no hook is authored, and never invents one', () => {
    expect(chooseHook(industrialTechno.hooks, 'kick', 'F minor', 1)).toBeUndefined()
  })

  it('exposes the candidates it chose among, by id in code unit order', () => {
    const picked = chooseHook(industrialTechno.hooks, 'bass-mid', 'F minor', 3)
    expect(picked?.candidates).toEqual(['it-hook-bass-1', 'it-hook-bass-2'])
    expect(picked?.candidates).toContain(picked?.chosenId)
  })

  it('picks independently of where in the file an author put the hook (§7.2)', () => {
    const forward: Hook[] = [
      { ...hook(), id: 'h-a' },
      { ...hook(), id: 'h-b' },
    ]
    const reversed = [...forward].reverse()
    for (let seed = 0; seed < 20; seed++) {
      expect(chooseHook(forward, 'lead', 'F minor', seed)?.chosenId).toBe(
        chooseHook(reversed, 'lead', 'F minor', seed)?.chosenId,
      )
    }
  })
})

/**
 * §4.1/#548. **An altered degree has to be said out loud on both surfaces**, or a raised third
 * and a plain third print as one label over two different pitches — the defect #548 refused in a
 * manifest, which a renderer can reintroduce just as easily.
 *
 * Both renderers are checked because #33 keeps them hand-written and sharing no ink: `degreeName`
 * exists twice on purpose, so a fix applied to one is not applied to the other.
 */
describe('naming an altered degree on both surfaces (§4.1/#548)', () => {
  it('names the alteration in the React surface, and leaves an unaltered degree alone', () => {
    expect(degreeName(3)).toBe('3rd')
    expect(degreeName(3, 0)).toBe('3rd')
    expect(degreeName(3, 1)).toBe('raised 3rd')
    expect(degreeName(6, -1)).toBe('lowered 6th')
    expect(degreeName(3, 2)).toBe('double-raised 3rd')
    // `root` survives, but only unaltered: a raised root is not the root.
    expect(degreeName(1)).toBe('root')
    expect(degreeName(1, 1)).toBe('raised 1st')
  })

  it('marks the alteration in the riff surface, where the label is the number', () => {
    const row = (alter?: number) => ({
      step: 1,
      notes: [
        {
          step: 1,
          len: 4,
          note: 'A#4',
          midi: 70,
          degree: 3,
          octave: 0,
          ...(alter === undefined ? {} : { alter }),
        },
      ],
    })
    expect(degreeLabel(row())).toBe('degree 3')
    expect(degreeLabel(row(1))).toBe('degree #3')
    expect(degreeLabel(row(-1))).toBe('degree b3')
    expect(degreeLabel(row(2))).toBe('degree ##3')
  })
})
