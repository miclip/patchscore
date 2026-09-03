import type { HookId, TemplateId } from './ids'
import type { Hook, HookNote, RequestPitch } from './template'
import type { Role } from './vocabulary'
import { compareCodeUnits } from './resolver'
import { saltSeed, seededPick } from './seed'

/**
 * §4.1. Scale degrees resolved against a key produce concrete notes. Deterministic, authored,
 * no generation — the degrees and the key both come from the template, and this module only
 * does the arithmetic between them.
 *
 * **Middle C is C4.** Scientific pitch notation throughout: C4 is MIDI 60, the octave number
 * changes at C rather than at the tonic, and a hook's `baseOctave` is read in the same
 * notation. §4.1 states the convention and the hardware caveat that goes with it.
 *
 * **Nothing here clamps or transposes.** We do not model what a voice can physically reach, and
 * inventing a limit at the template layer would be device knowledge leaking across the boundary
 * invariant 3 draws. A hook states musical intent; a voice that cannot play it is a fact for a
 * later layer to surface, not something to quietly fix by moving the notes.
 *
 * No locale anywhere (§7.2): the note names are built from fixed ASCII tables, never formatted.
 */

// ---------------------------------------------------------------------------
// The key
// ---------------------------------------------------------------------------

/** Letter names in scientific pitch order, and the pitch class each names with no accidental. */
const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const
const NATURAL_PITCH_CLASS = [0, 2, 4, 5, 7, 9, 11] as const

/**
 * The seven diatonic modes, as semitones above the tonic. `major`/`minor` are the names
 * DESIGN.md's templates use; the modal names are their synonyms and the four other rotations.
 *
 * All seven are here because `Template.keys` is deliberately an open string (§4) — `F dorian`
 * is legal authoring, and a resolver that only knew major and minor would refuse legal data.
 */
const MODE_STEPS = {
  major: [0, 2, 4, 5, 7, 9, 11],
  ionian: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  minor: [0, 2, 3, 5, 7, 8, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
} as const satisfies Record<string, readonly number[]>

export type Mode = keyof typeof MODE_STEPS
export const MODES = Object.keys(MODE_STEPS) as Mode[]

export type ParsedKey = {
  /** Exactly as the template authored it. */
  source: string
  /** 'A'..'G'. */
  letter: string
  /** -2..2, in semitones: 'bb' is -2, '#' is +1. */
  accidental: number
  mode: Mode
}

/** `<letter><accidental?> <mode>` — one space, no case folding: `F minor`, nothing looser. */
const KEY_PATTERN = /^([A-G])(#{1,2}|b{1,2})? ([a-z]+)$/

function accidentalValue(text: string | undefined): number {
  if (text === undefined || text === '') return 0
  return text.startsWith('#') ? text.length : -text.length
}

/**
 * `undefined` rather than a throw: keys are open strings by design, so an unrecognised one is
 * data this resolver cannot handle rather than a broken program. `resolveHook` turns it into a
 * reported outcome, which is invariant 5 — say what is missing, never guess a key.
 */
export function parseKey(key: string): ParsedKey | undefined {
  const match = KEY_PATTERN.exec(key)
  if (match === null) return undefined
  const [, letter, accidental, mode] = match as unknown as [
    string,
    string,
    string | undefined,
    string,
  ]
  if (!Object.prototype.hasOwnProperty.call(MODE_STEPS, mode)) return undefined
  return { source: key, letter, accidental: accidentalValue(accidental), mode: mode as Mode }
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

/**
 * One authored `HookNote`, resolved. Timing is carried through untouched — `step` and `len` are
 * the hook's own grid and mean the same after resolution as before.
 *
 * `degree` and `octave` are kept so the guide can show its working: "the fifth, written G2".
 */
export type ResolvedNote = {
  step: number
  len: number
  /** Scientific pitch notation, middle C = C4. 'Ab2', 'F4', 'G##5'. */
  note: string
  /**
   * #32. The one representation with no convention drift in it. `Eb2`, `D#2` and — on a box
   * that puts middle C at C3 — `Eb1` are all MIDI 39, so the number is what a reader can check
   * against hardware that spells or numbers octaves differently from this guide.
   *
   * Unclamped, exactly as the spelling is: §4.1 puts range policy outside this layer, so a hook
   * written above or below the MIDI range resolves to a number outside 0-127 rather than being
   * quietly moved. It is a fact about the note, not a promise that a device can play it.
   */
  midi: number
  /** The authored degree this came from, 1-based and unwrapped: a ninth is still 9. */
  degree: number
  /** The authored offset from the hook's `baseOctave`. */
  octave: number
}

export type ResolvedHook = {
  hookId: HookId
  forRole: Role
  bars: number
  /** The key these notes were resolved against, as authored. */
  key: string
  notes: ResolvedNote[]
}

/**
 * Why a hook produced no notes. Both are content problems rather than user-facing gaps, but
 * they are reported rather than thrown for the same reason §6.3's band fallback is: a guide
 * that silently omits a hook is indistinguishable from a genre that has none.
 */
export type HookResolution =
  | { outcome: 'resolved'; hook: ResolvedHook }
  | { outcome: 'unresolved'; reason: 'unparsed-key' | 'unspellable-note'; detail: string }

function mod(value: number, n: number): number {
  return ((value % n) + n) % n
}

/** Semitones above C-1, i.e. the MIDI number of `letter``accidental``octave` in SPN. */
function absoluteSemitone(letterIndex: number, accidental: number, octave: number): number {
  return (NATURAL_PITCH_CLASS[letterIndex] as number) + accidental + 12 * (octave + 1)
}

/**
 * The one place the spelling is decided. The letter comes from counting scale steps up the
 * letter cycle from the tonic's letter, so F minor's third is some kind of A and never a G# —
 * then the accidental is whatever makes that letter land on the pitch we already computed.
 *
 * Deriving the octave from the letter rather than from the pitch is not pedantry: Cb4 and B3
 * are the same pitch and different octave numbers, and a guide that printed one as the other
 * would be wrong on the page the reader is holding.
 */
function spell(
  key: ParsedKey,
  baseOctave: number,
  note: HookNote,
): { note: string; midi: number } | { unspellable: string } {
  const steps = MODE_STEPS[key.mode]
  const tonicLetterIndex = LETTERS.indexOf(key.letter as (typeof LETTERS)[number])
  const stepsAboveTonic = note.degree - 1

  // Degrees past the seventh wrap into the next octave: a ninth is a second, one octave up.
  const withinOctave = mod(stepsAboveTonic, 7)
  const octavesUp = Math.floor(stepsAboveTonic / 7)

  const tonic = absoluteSemitone(tonicLetterIndex, key.accidental, baseOctave + note.octave)
  const semitone = tonic + (steps[withinOctave] as number) + 12 * octavesUp

  const letterIndex = mod(tonicLetterIndex + stepsAboveTonic, 7)
  const letter = LETTERS[letterIndex] as string
  const natural = NATURAL_PITCH_CLASS[letterIndex] as number

  // The accidental nearest to natural that lands on `semitone`, in -6..5.
  const accidental = mod(semitone - natural + 6, 12) - 6
  if (accidental < -2 || accidental > 2) {
    return {
      unspellable:
        `degree ${note.degree} of ${key.source} needs ` +
        `${accidental} semitones on ${letter}`,
    }
  }

  const octave = (semitone - natural - accidental) / 12 - 1
  const marks = accidental >= 0 ? '#'.repeat(accidental) : 'b'.repeat(-accidental)
  // `semitone` is already the MIDI number: `absoluteSemitone` counts from C-1, which is MIDI 0.
  return { note: `${letter}${marks}${octave}`, midi: semitone }
}

/**
 * §4.1/#334. **One note, for a part whose rhythm the step grid already owns.**
 *
 * A hook is a *figure* — notes and their own rhythm — and §4.3/#100 makes a resolved hook the
 * part's pattern, replacing the grid. That is right for a line somebody hums and wrong for a
 * `sub` holding the root under a pattern the direction already authored: authoring a hook there
 * would delete the rhythm and then need a flag to bring it back.
 *
 * So this resolves a degree and nothing else. No steps, no lengths, no authority over the grid
 * — it answers "which note", which on the twenty note-addressed devices in the library is the
 * half of the instruction that was missing (#334).
 *
 * Shares `spell` with hooks, so a `sub` on degree 1 and a hook note on degree 1 in the same key
 * are the same pitch and the same spelling. A second spelling path would be a second chance to
 * disagree with `Cb4` versus `B3`.
 */
export type PitchResolution =
  | { outcome: 'resolved'; note: string; midi: number }
  | { outcome: 'unresolved'; reason: 'unparsed-key' | 'unspellable'; detail: string }

export function resolvePitch(pitch: RequestPitch, key: string): PitchResolution {
  const parsed = parseKey(key)
  if (parsed === undefined) {
    return {
      outcome: 'unresolved',
      reason: 'unparsed-key',
      detail: `'${key}' is not '<A-G><#|b> <mode>' with a mode in ${MODES.join(', ')}`,
    }
  }
  // `step` and `len` are a hook note's business and carry no meaning here; `spell` reads neither.
  const spelt = spell(parsed, pitch.baseOctave, {
    step: 1,
    degree: pitch.degree,
    octave: 0,
    len: 1,
  })
  return 'unspellable' in spelt
    ? { outcome: 'unresolved', reason: 'unspellable', detail: spelt.unspellable }
    : { outcome: 'resolved', note: spelt.note, midi: spelt.midi }
}

/**
 * §4.1. The whole hook, resolved against one key. Pure: same hook and same key, same notes,
 * on any platform.
 *
 * Note order follows the authored order rather than being sorted, because a hook may put two
 * notes on one step to voice a chord and the authored order is the voicing.
 */
export function resolveHook(hook: Hook, key: string): HookResolution {
  const parsed = parseKey(key)
  if (parsed === undefined) {
    return {
      outcome: 'unresolved',
      reason: 'unparsed-key',
      detail: `'${key}' is not '<A-G><#|b> <mode>' with a mode in ${MODES.join(', ')}`,
    }
  }

  const notes: ResolvedNote[] = []
  for (const note of hook.notes) {
    const spelt = spell(parsed, hook.baseOctave, note)
    if ('unspellable' in spelt) {
      return { outcome: 'unresolved', reason: 'unspellable-note', detail: spelt.unspellable }
    }
    notes.push({
      step: note.step,
      len: note.len,
      note: spelt.note,
      midi: spelt.midi,
      degree: note.degree,
      octave: note.octave,
    })
  }

  return {
    outcome: 'resolved',
    hook: { hookId: hook.id, forRole: hook.forRole, bars: hook.bars, key, notes },
  }
}

/**
 * Every hook authored for one role, resolved against one key. `[]` when the template authors
 * none for that role — §4.1's rule that the guide omits the hook section rather than inventing
 * one, and the reason this returns a list rather than picking: §4.1 gives the *seed* the choice
 * among several authored hooks, and seeding belongs to §11 step 5.5, not here.
 */
export function resolveHooksForRole(
  hooks: readonly Hook[],
  role: Role,
  key: string,
): HookResolution[] {
  return hooks.filter((h) => h.forRole === role).map((h) => resolveHook(h, key))
}

// ---------------------------------------------------------------------------
// #32 — the two representations the box may disagree with
// ---------------------------------------------------------------------------

/**
 * Sharps only, which is what a great many boxes display and what nothing here ever *decides*.
 * The key-correct spelling is decided in `spell` and must not change (writing D# in F minor is
 * wrong even though the pitch is right); this is a second reading of the same pitch, offered
 * so a reader can recognise `Eb2` on a screen that calls it `D#2`.
 */
const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const

/**
 * The sharps-only name for a MIDI number, in scientific pitch notation. Total over every
 * integer, including the negatives an unclamped hook can reach (§4.1) — `mod` and a floored
 * division rather than `%` and a truncating one, which would put -1 in octave -1 twice.
 */
export function sharpSpelling(midi: number): string {
  const name = SHARP_NAMES[mod(midi, 12)] as string
  return `${name}${Math.floor(midi / 12) - 1}`
}

/**
 * #32. The sharps-only reading, **only when it differs** from the key-correct one. `undefined`
 * for `F4` or `C#3`, which spell the same either way — printing `F4 · F4` would be noise, and
 * noise on every natural note is most of them.
 *
 * Double accidentals have no sharps-only equivalent that is any clearer (`G##5` reads as `A5`),
 * and that is exactly the case where showing the alternative earns its space.
 */
export function enharmonicAlternative(note: ResolvedNote): string | undefined {
  const sharp = sharpSpelling(note.midi)
  return sharp === note.note ? undefined : sharp
}

// ---------------------------------------------------------------------------
// §4.1 — what the seed chooses
// ---------------------------------------------------------------------------

/**
 * §4.1: "The seed picks among multiple authored hooks." The same reasoning covers `keys`, which
 * §4 authors as a list and §8 renders as one key — the guide states the key you are working in,
 * not a menu to choose from at the machine.
 *
 * Salted with the template id so two templates that happen to author the same number of keys do
 * not move in lockstep on every reroll, and so the key does not track the hook choice.
 *
 * `undefined` only for an empty list. `TemplateSchema` requires at least one key, so that is
 * unreachable through validated data — but the caller receives an *effective* template (§5), so
 * this reports rather than throws, exactly as `parseKey` does.
 */
export function chooseKey(
  templateId: TemplateId,
  keys: readonly string[],
  seed: number,
): string | undefined {
  return seededPick(keys, saltSeed(seed, `key:${templateId}`))
}

/**
 * One role's hook, chosen and resolved. `candidates` is every hook authored for the role, so a
 * reader — and a later reroll UI — can see that the choice was among several rather than the
 * only one there was. It mirrors `PatternSelection.candidates` for the same reason.
 */
export type HookChoice = {
  forRole: Role
  chosen: HookResolution
  /** The chosen hook's id, available even when `chosen` did not resolve. */
  chosenId: HookId
  /** Every hook authored for this role, by id in UTF-16 code unit order (§7.2). */
  candidates: readonly HookId[]
}

/**
 * §4.1, for one role. `undefined` when the template authors no hook for it — the guide omits
 * the hook rather than inventing one, which is invariant 5 applied to melody.
 *
 * Candidates are ordered by id rather than by authored order, so which hook a given seed picks
 * does not depend on where in the file an author happened to put it (§7.2). The pick is salted
 * per role, so adding a bass hook does not reroll the pad.
 */
export function chooseHook(
  hooks: readonly Hook[],
  role: Role,
  key: string,
  seed: number,
): HookChoice | undefined {
  const forRole = hooks
    .filter((h) => h.forRole === role)
    .sort((a, b) => compareCodeUnits(a.id, b.id))
  const picked = seededPick(forRole, saltSeed(seed, `hook:${role}`))
  if (picked === undefined) return undefined
  return {
    forRole: role,
    chosen: resolveHook(picked, key),
    chosenId: picked.id,
    candidates: Object.freeze(forRole.map((h) => h.id)),
  }
}

// ---------------------------------------------------------------------------
// §4.1 / §12.4 — hook chords, and which of them are the same chord
// ---------------------------------------------------------------------------

/** One trigger point in a hook: the notes authored at one step, in authored order. */
export type HookChord = { step: number; notes: ResolvedNote[] }

/**
 * One occurrence of a voicing, and how far the sample has to move to play it.
 *
 * `semitones` is 0 at the occurrence the sample is captured from and the interval to the others.
 * It is a transposition of the whole chord, which is the only thing a sample can do — and, on a
 * tracker, the only thing it is asked to do: the note placed on the step *is* the transposition.
 */
export type ChordTrigger = { step: number; notes: ResolvedNote[]; semitones: number }

/**
 * A distinct chord **shape** in a hook, and every step it is played at.
 *
 * Distinctness is by *normalised interval structure* — the semitones of each note above the
 * lowest — because that is exactly what one recording can and cannot cover. A sample transposes
 * as a block: every pitch moves by the same interval, so the shape is preserved and one
 * recording serves that shape at any root. What it cannot do is change shape, and shape is where
 * quality and inversion live: a minor triad is `0-3-7` and a major one `0-4-7`, and no
 * transposition turns one into the other. A first-inversion major triad is `0-3-8`, distinct
 * again, which is why "inversion" needs no separate rule here — it falls out of the intervals.
 *
 * This corrects an earlier version that keyed on absolute pitch and so demanded a sample per
 * chord. That was not a conservative simplification, it was a false claim about what a sampler
 * does, and it asked readers to record chords they already had.
 *
 * Derived here rather than in either renderer. §8's two renderers share no *ink*, but a musical
 * fact computed twice is a fact that can differ between the page and the screen, which is worse
 * than the duplication it saves.
 */
export type ChordVoicing = {
  /** 'A', 'B', ... 'Z', 'AA'. A label for the guide to point at — never a filename (§3.1). */
  label: string
  /** The chord to actually record: the first occurrence of this shape, at its own pitch. */
  notes: ResolvedNote[]
  /** Semitones above the lowest note. The identity of the shape, and of the sample. */
  shape: number[]
  /** Every occurrence, in step order, each with its transposition from `notes`. */
  at: ChordTrigger[]
}

/** Notes grouped by the step they are triggered at, in step order. */
export function hookChords(hook: ResolvedHook): HookChord[] {
  const byStep = new Map<number, ResolvedNote[]>()
  for (const note of hook.notes) {
    const existing = byStep.get(note.step)
    if (existing === undefined) byStep.set(note.step, [note])
    else existing.push(note)
  }
  return [...byStep].map(([step, notes]) => ({ step, notes })).sort((a, b) => a.step - b.step)
}

/** Lowest sounding note, which every interval here is measured from. */
function rootMidi(chord: HookChord): number {
  return chord.notes.reduce((low, n) => Math.min(low, n.midi), Infinity)
}

/**
 * Semitones above the lowest note, ascending and de-duplicated.
 *
 * Sorted numerically, never as strings, and de-duplicated so a chord doubling a pitch at the
 * same octave is the same shape as one that does not — the doubling is inaudible in the sample
 * either way. Octave doublings are *not* collapsed: `0-4-7` and `0-4-7-12` are different
 * recordings and a reader can hear the difference.
 */
function shapeOf(chord: HookChord): number[] {
  const root = rootMidi(chord)
  return [...new Set(chord.notes.map((n) => n.midi - root))].sort((a, b) => a - b)
}

/** 'A'..'Z', then 'AA'. Base 26 rather than a 26-chord ceiling nobody would think to test. */
function voicingLabel(index: number): string {
  let label = ''
  let n = index
  do {
    label = String.fromCharCode(65 + (n % 26)) + label
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return label
}

/**
 * The distinct chord shapes of a hook, in first-appearance order, each carrying every step it
 * occurs at and the transposition needed there. One entry is one sample to obtain or render
 * (§12.4); the same entry played at two roots is one recording moved, not two recordings.
 */
export function chordVoicings(hook: ResolvedHook): ChordVoicing[] {
  const byShape = new Map<string, { voicing: ChordVoicing; root: number }>()
  const order: { voicing: ChordVoicing; root: number }[] = []
  for (const chord of hookChords(hook)) {
    const shape = shapeOf(chord)
    const key = shape.join(',')
    const seen = byShape.get(key)
    if (seen === undefined) {
      const entry = {
        voicing: {
          label: '',
          notes: chord.notes,
          shape,
          at: [{ ...chord, semitones: 0 }],
        },
        root: rootMidi(chord),
      }
      byShape.set(key, entry)
      order.push(entry)
    } else {
      seen.voicing.at.push({ ...chord, semitones: rootMidi(chord) - seen.root })
    }
  }
  return order.map(({ voicing }, i) => ({ ...voicing, label: voicingLabel(i) }))
}
