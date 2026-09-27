import { describe, expect, it } from 'vitest'
import { resolveHook, transposableKeys, type Hook } from '@/lib/core'
import type { Riff } from '@/lib/core/riff'
import { RIFFS } from '@/lib/riffs'

/**
 * #694. **Technique holds in any key the reader picks.** The key control on a figure page
 * (`components/riff/riff-in-key.tsx`) re-resolves the notes and the chord table and leaves the
 * technique as written, so a paragraph that names a pitch contradicts the rows under it the
 * moment the key changes. Technique names degrees, numerals, intervals and relative register
 * instead (riff-authoring skill §8).
 *
 * The detector looks for an explicit absolute pitch: a letter with an octave (`C3`, `E flat 4`),
 * a letter with an accidental (`F#`, `Bb`, `C sharp`, `A natural`), a chord named by letter
 * (`F# major`, `Cm7`), a bare letter used as a note (`the D`, `E, C, B`), and `middle C`. A
 * capital `A` opening a sentence is the article, so `A` counts only mid-sentence, where the
 * article would be lower case.
 *
 * A regex is not proof a paragraph is clean, only that it spells nothing absolute. What a
 * paragraph *claims* about degrees and intervals is checked by reading `resolveHook`, and that
 * is the author's job, not this file's.
 */

type Part = 'technique' | 'companion'

type Hit = { kind: string; match: string }

/** Letters B to G anywhere; `A` only where it cannot be the article opening a sentence. */
const LETTER = String.raw`(?:[B-G]|(?<![.!?:;"“]\s)(?<!^)A)`

const PATTERNS: readonly { kind: string; re: RegExp }[] = [
  { kind: 'middle C', re: /\bmiddle C\b/g },
  {
    kind: 'pitch and octave',
    re: new RegExp(String.raw`\b${LETTER}(?:[#b♯♭]|\s?(?:flat|sharp))?\s?-?\d\b`, 'g'),
  },
  { kind: 'accidental', re: new RegExp(String.raw`\b${LETTER}[#b♯♭](?![\w#♯♭])`, 'g') },
  { kind: 'spelled accidental', re: new RegExp(String.raw`\b${LETTER} (?:flat|sharp|natural)\b`, 'g') },
  { kind: 'chord by letter', re: new RegExp(String.raw`\b${LETTER}[#b♯♭]? (?:major|minor)\b`, 'g') },
  { kind: 'chord symbol', re: new RegExp(String.raw`\b${LETTER}[#b♯♭]?(?:m|maj|min|dim|aug|sus)\d*\b`, 'g') },
  { kind: 'bare letter', re: new RegExp(String.raw`\b${LETTER}\b(?![#♯♭'’])`, 'g') },
]

function absolutePitches(paragraph: string): Hit[] {
  const hits: Hit[] = []
  for (const { kind, re } of PATTERNS) {
    for (const m of paragraph.matchAll(re)) hits.push({ kind, match: m[0] })
  }
  return hits
}

/**
 * A paragraph allowed to keep an absolute anchor, and why. `holds` is the reason made
 * checkable: it is asked of the part's resolved MIDI notes in every key the key control
 * offers, so a retained landmark that stops being true in one of them fails here by name.
 */
type Exception = {
  riff: string
  part: Part
  paragraph: number
  /** The one anchor this paragraph may keep. Anything else in it is still a failure. */
  anchor: 'middle C'
  reason: string
  holds: (midi: readonly number[]) => boolean
}

const MIDDLE_C = 60

const EXCEPTIONS: readonly Exception[] = [
  {
    riff: '3-osc-bass-love-root-octave-figure',
    part: 'technique',
    paragraph: 3,
    anchor: 'middle C',
    reason:
      'a ceiling for the patch rather than a pitch in the key: the highest note in any of the ' +
      'twelve keys is B2, so nothing reaches the octave below middle C wherever the reader puts it',
    holds: (midi) => Math.max(...midi) < MIDDLE_C - 12,
  },
  {
    riff: 'broken-toy-music-box-stumble',
    part: 'technique',
    paragraph: 0,
    anchor: 'middle C',
    reason:
      'a floor for the register rather than a pitch in the key: the lowest note in any of the ' +
      'twelve keys is G4, so the tune is above middle C wherever the reader puts it',
    holds: (midi) => Math.min(...midi) > MIDDLE_C,
  },
  {
    riff: 'tears-in-rain-held-second',
    part: 'technique',
    paragraph: 0,
    anchor: 'middle C',
    reason:
      'a floor for the register rather than a pitch in the key: the lower of the two notes is ' +
      'D4 in the lowest key, so the pair is above middle C wherever the reader puts it',
    holds: (midi) => Math.min(...midi) > MIDDLE_C,
  },
]

const keyOf = (e: { riff: string; part: Part; paragraph: number }) =>
  `${e.riff} ${e.part}[${String(e.paragraph)}]`

function partsOf(riff: Riff): { part: Part; technique: readonly string[]; hook: Hook }[] {
  const parts: { part: Part; technique: readonly string[]; hook: Hook }[] = [
    { part: 'technique', technique: riff.technique, hook: riff.hook },
  ]
  if (riff.companion !== undefined) {
    parts.push({ part: 'companion', technique: riff.companion.technique, hook: riff.companion.hook })
  }
  return parts
}

describe('the detector (#694)', () => {
  it('catches every way the library has spelled an absolute pitch', () => {
    for (const line of [
      'Keep it around C3 to C4.',
      'the E flat 4 on top',
      'Never play F sharp.',
      'going into the F# major',
      'the Ab over the Eb minor',
      'over the Bb7 it is the tritone',
      'Hold the low E for two bars.',
      'The bass falls a step at every chord, E, C, B, A.',
      'Never play A sharp.',
      'the A over the D',
      'with the Gb on top',
      'Am then Cm7',
      'two octaves above middle C',
    ]) {
      expect(absolutePitches(line), line).not.toEqual([])
    }
  })

  it('leaves the article, numerals, degrees and panel words alone', () => {
    for (const line of [
      'A natural third against the raised one is the move collapsing.',
      'A tight voicing is what makes it read as a stab.',
      'i, II, i, vii. A minor chord, the major chord a semitone above it.',
      'Over the bII it is a tritone, and over the IV7 a seventh.',
      'the key’s flattened seventh, then the raised sixth',
      'Two buttons have to be lit, not one: GLIDE and LEGATO.',
      'ORDR where a panel abbreviates it.',
      'Play it long. A gong has a tail.',
    ]) {
      expect(absolutePitches(line), line).toEqual([])
    }
  })
})

describe('technique holds in any key the reader picks (#694)', () => {
  const byKey = new Map(EXCEPTIONS.map((e) => [keyOf(e), e]))

  it('names degrees, numerals and intervals rather than pitches, in every host and companion part', () => {
    const offenders: string[] = []
    for (const riff of RIFFS) {
      for (const { part, technique } of partsOf(riff)) {
        technique.forEach((paragraph, i) => {
          const exception = byKey.get(keyOf({ riff: riff.id, part, paragraph: i }))
          const ink = exception === undefined ? paragraph : paragraph.split(exception.anchor).join('')
          const hits = absolutePitches(ink)
          if (hits.length > 0) {
            offenders.push(
              `${keyOf({ riff: riff.id, part, paragraph: i })}: ${hits.map((h) => `${h.kind} '${h.match}'`).join(', ')}`,
            )
          }
        })
      }
    }
    expect(offenders).toEqual([])
  })

  it('gives every exception a reason', () => {
    for (const e of EXCEPTIONS) expect(e.reason.trim().length, keyOf(e)).toBeGreaterThan(40)
    expect(byKey.size).toBe(EXCEPTIONS.length)
  })

  it('uses every exception: each names a paragraph that still carries its anchor', () => {
    const unused: string[] = []
    for (const e of EXCEPTIONS) {
      const riff = RIFFS.find((r) => r.id === e.riff)
      const part = riff === undefined ? undefined : partsOf(riff).find((p) => p.part === e.part)
      const paragraph = part?.technique[e.paragraph]
      if (paragraph === undefined || !paragraph.includes(e.anchor)) unused.push(keyOf(e))
    }
    expect(unused).toEqual([])
  })

  it('keeps each retained landmark true in all twelve keys the key control offers', () => {
    for (const e of EXCEPTIONS) {
      const riff = RIFFS.find((r) => r.id === e.riff)
      if (riff === undefined) throw new Error(`no figure '${e.riff}'`)
      const part = partsOf(riff).find((p) => p.part === e.part)
      if (part === undefined) throw new Error(`${keyOf(e)}: no such part`)
      const keys = transposableKeys(riff.key)
      expect(keys.length, keyOf(e)).toBe(12)
      for (const key of keys) {
        const resolved = resolveHook(part.hook, key)
        if (resolved.outcome !== 'resolved') throw new Error(`${keyOf(e)} does not resolve in ${key}`)
        expect(e.holds(resolved.hook.notes.map((n) => n.midi)), `${keyOf(e)} in ${key}`).toBe(true)
      }
    }
  })
})
