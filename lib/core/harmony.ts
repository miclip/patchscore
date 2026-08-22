import type { HookId } from './ids'
import type { Hook, HookNote } from './template'
import type { Role } from './vocabulary'

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
): { note: string } | { unspellable: string } {
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
  return { note: `${letter}${marks}${octave}` }
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
