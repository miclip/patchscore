import { describe, expect, it } from 'vitest'
import {
  RiffSchema,
  chordAtStep,
  pitchClassOf,
  resolveHook,
  spellChord,
  widestHold,
  type ResolvedNote,
} from '@/lib/core'
import { uberSubDisplacedFifthRiff as riff } from '@/lib/riffs/uber-sub-displaced-fifth-riff'

/**
 * §5A.9. **The UBER_SUB pad**: four held voicings that leave out each chord's fifth, because the
 * bass lands on that fifth somewhere different in every bar. Every assertion is on the resolved
 * notes, so a degree typed wrong fails here by name.
 */

const companion = riff.companion
if (companion === undefined) throw new Error('the UBER_SUB entry has no companion')

const resolved = resolveHook(companion.hook, riff.key)
if (resolved.outcome !== 'resolved') throw new Error('the companion hook does not resolve')
const padNotes = resolved.hook.notes

const hostResolved = resolveHook(riff.hook, riff.key)
if (hostResolved.outcome !== 'resolved') throw new Error('the host hook does not resolve')
const bassNotes = hostResolved.hook.notes

const BAR_STARTS = [1, 17, 33, 49] as const

/** The notes struck at a bar's downbeat, low to high. */
function voicing(step: number): ResolvedNote[] {
  return padNotes.filter((n) => n.step === step).sort((a, b) => a.midi - b.midi)
}

/** The chord under a bar, spelt in the riff's key: root first, fifth third. */
function chordAt(step: number): { degree: string; notes: readonly string[] } {
  const degree = chordAtStep(riff, step)
  if (degree === undefined) throw new Error(`no chord at step ${String(step)}`)
  const spelt = spellChord(degree, riff.key)
  if (spelt.outcome !== 'resolved') throw new Error(`${degree} does not spell`)
  return { degree, notes: spelt.chord.notes }
}

/**
 * The tone a pitch is over a chord's root, by semitones above it. Only the intervals these four
 * voicings use are named, and any other throws, so a changed voicing cannot be relabelled quietly.
 */
/** A spelt pitch class (`Eb`, no octave) as a number, C at 0. */
function pc(name: string): number {
  const value = pitchClassOf(name)
  if (value === undefined) throw new Error(`${name} is not a pitch class`)
  return value
}

const TONE: Readonly<Record<number, string>> = { 0: '1', 2: '9', 3: '3', 4: '3', 5: '11', 9: '6', 10: '7', 11: '7' }
function toneOver(note: ResolvedNote, root: string): string {
  const semis = (note.midi - pc(root) + 120) % 12
  const tone = TONE[semis]
  if (tone === undefined) throw new Error(`${note.note} is ${String(semis)} semitones over ${root}`)
  return tone
}

describe('the UBER_SUB pad (§5A.9)', () => {
  it('parses as part of the entry', () => {
    const parsed = RiffSchema.safeParse(riff)
    expect(parsed.success, JSON.stringify(parsed.success ? '' : parsed.error.issues)).toBe(true)
  })

  it('is a held `pad / soft` of three voices, four bars, no grid and no arpeggiator', () => {
    expect(companion.request).toMatchObject({ role: 'pad', character: 'soft', polyphony: 3 })
    expect(companion.request.reArticulatesHook).toBeUndefined()
    expect(companion.pattern).toBeUndefined()
    expect(companion.arpeggiatedHold).toBeUndefined()
    expect(companion.hook.bars).toBe(4)
    expect(companion.hook.bars).toBe(riff.hook.bars)
    expect(companion.hook.baseOctave).toBe(4)
  })

  it('strikes three whole-bar notes on each downbeat and nothing else', () => {
    expect(padNotes).toHaveLength(12)
    for (const n of companion.hook.notes) {
      expect(BAR_STARTS as readonly number[]).toContain(n.step)
      expect(n.len).toBe(16)
    }
    for (const start of BAR_STARTS) expect(voicing(start)).toHaveLength(3)
  })

  it('asks for as many voices as its widest hold', () => {
    expect(widestHold(companion.hook)).toBe(3)
    expect(companion.request.polyphony).toBe(widestHold(companion.hook))
  })

  it.each([
    [1, ['Eb4', 'F4', 'Ab4'], [63, 65, 68], [2, 3]],
    [17, ['C4', 'Eb4', 'G4'], [60, 63, 67], [3, 4]],
    [33, ['C4', 'Eb4', 'F4'], [60, 63, 65], [3, 2]],
    [49, ['C4', 'Eb4', 'F4'], [60, 63, 65], [3, 2]],
  ])('resolves the voicing at step %i to %j, MIDI %j, intervals %j', (step, names, midi, gaps) => {
    const v = voicing(step)
    expect(v.map((n) => n.note)).toEqual(names)
    expect(v.map((n) => n.midi)).toEqual(midi)
    expect(v.slice(1).map((n, i) => n.midi - (v[i] as ResolvedNote).midi)).toEqual(gaps)
  })

  it.each([
    [1, 'i', '7 1 3'],
    [17, 'VII', '6 1 3'],
    [33, 'VI', '7 9 3'],
    [49, 'v', '1 3 11'],
  ])('at step %i, over %s, is %s', (step, degree, tones) => {
    const chord = chordAt(step)
    expect(chord.degree).toBe(degree)
    const root = chord.notes[0] as string
    expect(voicing(step).map((n) => toneOver(n, root)).join(' ')).toBe(tones)
  })

  it('never plays a chord’s fifth, and the bass plays each one in its bar', () => {
    const fifths: string[] = []
    for (const start of BAR_STARTS) {
      const fifth = chordAt(start).notes[2] as string
      fifths.push(fifth)
      const pad = voicing(start).map((n) => n.midi % 12)
      expect(pad, `bar at ${String(start)}`).not.toContain(pc(fifth))
      const bassBar = bassNotes.filter((n) => n.step >= start && n.step < start + 16)
      expect(
        bassBar.some((n) => n.midi % 12 === pc(fifth)),
        `the bass has no ${fifth} at ${String(start)}`,
      ).toBe(true)
    }
    expect(fifths).toEqual(['C', 'Bb', 'Ab', 'G'])
  })

  it('keeps E flat 4 in all four bars', () => {
    for (const start of BAR_STARTS) {
      expect(voicing(start).map((n) => n.note), `bar at ${String(start)}`).toContain('Eb4')
    }
  })

  it('plays the same keys in bars three and four, over two different chords', () => {
    expect(voicing(49).map((n) => n.midi)).toEqual(voicing(33).map((n) => n.midi))
    expect(chordAt(33).degree).not.toBe(chordAt(49).degree)
  })

  it('adds no forbidden-degree rule: the entry keeps the one it had', () => {
    expect(riff.constraints?.forbiddenDegrees?.map((f) => [f.chord, f.degree, f.alter])).toEqual([
      ['i', 3, 1],
    ])
  })

  it('says what the pad does, and claims no playing', () => {
    const ink = companion.technique.join('\n')
    expect(ink).toContain('never plays the chord’s fifth')
    expect(ink).toContain('lands somewhere different in every bar')
    expect(ink).toContain('Strike each chord on the downbeat')
    expect(ink).toContain('E flat 4 sounds in all four bars')
    expect(ink).toContain('Bars three and four are the same three keys')
    expect(ink).not.toMatch(/\b(played it|we played|tested on|on the unit|recorded)\b/i)
  })
})
