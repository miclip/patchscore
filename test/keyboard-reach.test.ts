import { describe, expect, it } from 'vitest'
import {
  CAPABILITY_FACTS,
  DeviceSchema,
  KEYBOARD_REACH_FACT,
  KEYBOARD_SHIFT_FACT,
  keyboardPlacement,
  keyboardReachRange,
  keyboardWindow,
} from '../lib/core/index'
import type { Device, KeyboardReach } from '../lib/core/index'
import { device as subsequent37 } from '../lib/devices/moog-subsequent-37/index'
import { device as muse } from '../lib/devices/moog-muse/index'
import { device as fixtureDevice, recipe } from './fixtures'

/**
 * §2.6/§4.1/#659. **What a keyboard reaches is a cited fact in two halves, and reach is not keys.**
 *
 * `TRIPLET 5THS` was authored spanning MIDI 41 to 76 on a 37-key box and nothing in the model
 * noticed, because no device said how many keys it had. These tests hold three things:
 *
 *  - the declaration is a positive claim with a citation at each of two paths, the board at
 *    `keyboardReach` and what moves it at `keyboardReach.shift`, checked in both directions the way
 *    `middleC` is, and `false` is refused at both because it says nothing the omission does not;
 *  - the **arithmetic** distinguishes the board from what the board can be moved to: a span
 *    inside the window fits somewhere whenever some placement holds both ends, which is the fact
 *    #659's first reading missed by taking the octave buttons as the only control;
 *  - the two shipped readings are what the manifests say: the Subsequent 37 declares a board
 *    derived from three pages, and the Muse records the pages read and declares nothing,
 *    because a key count is not a reach.
 */

const CITE = { kind: 'manual', source: 'A Manual, p.1' } as const
const UNIT = { kind: 'observed', source: 'A unit, the bottom key on a MIDI monitor' } as const
const READ_AND_SILENT = {
  kind: 'unknown',
  reason: 'p.116 gives 61 keys and no page says which note the lowest one plays',
} as const

/** Thirty-seven keys from MIDI 36, two octaves each way on the buttons, twelve semitones on a transpose. */
const THIRTY_SEVEN: KeyboardReach = {
  keys: 37,
  lowestMidi: 36,
  shift: { octaves: { down: 2, up: 2 }, semitones: { down: 12, up: 12 } },
}

/** A board nothing moves. */
const FIXED_BOARD: KeyboardReach = {
  keys: 25,
  lowestMidi: 48,
  shift: { octaves: { down: 0, up: 0 }, semitones: { down: 0, up: 0 } },
}

function withReach(over: Record<string, unknown> = {}): Device {
  return fixtureDevice({ recipes: [recipe()], ...over } as never)
}

/** What the shared fixture already cites, so a test adding one fact does not drop the rest. */
const evidence = withReach().capabilityEvidence ?? {}

function declared(reach: KeyboardReach | undefined, at: unknown, shiftAt: unknown): Device {
  return withReach({
    ...(reach === undefined ? {} : { keyboardReach: reach }),
    capabilityEvidence: {
      ...evidence,
      ...(at === undefined ? {} : { [KEYBOARD_REACH_FACT]: at }),
      ...(shiftAt === undefined ? {} : { [KEYBOARD_SHIFT_FACT]: shiftAt }),
    },
  })
}

function issues(parsed: ReturnType<typeof DeviceSchema.safeParse>): string {
  return JSON.stringify(parsed.success ? [] : parsed.error.issues)
}

describe('keyboardReach is a positive claim in two halves, checked in both directions (§4.1/#659)', () => {
  it('is two capability facts on the closed list', () => {
    expect(CAPABILITY_FACTS).toContain(KEYBOARD_REACH_FACT)
    expect(CAPABILITY_FACTS).toContain(KEYBOARD_SHIFT_FACT)
  })

  it('accepts a declaration behind a citation at each path, from a page or a unit', () => {
    expect(issues(DeviceSchema.safeParse(declared(THIRTY_SEVEN, UNIT, CITE)))).toBe('[]')
    expect(issues(DeviceSchema.safeParse(declared(FIXED_BOARD, CITE, CITE)))).toBe('[]')
  })

  it('refuses a declaration with no citation for the board', () => {
    const parsed = DeviceSchema.safeParse(declared(THIRTY_SEVEN, undefined, CITE))
    expect(parsed.success).toBe(false)
    expect(issues(parsed)).toContain(`no citation at '${KEYBOARD_REACH_FACT}'`)
  })

  it('refuses a declaration with no citation for what moves it, because half a reach is cited', () => {
    const parsed = DeviceSchema.safeParse(declared(THIRTY_SEVEN, UNIT, undefined))
    expect(parsed.success).toBe(false)
    expect(issues(parsed)).toContain(`no citation at '${KEYBOARD_SHIFT_FACT}'`)
  })

  it('refuses a declaration behind an unknown, which is a reading that supports no claim', () => {
    const parsed = DeviceSchema.safeParse(declared(THIRTY_SEVEN, READ_AND_SILENT, CITE))
    expect(parsed.success).toBe(false)
    expect(issues(parsed)).toContain(`no citation at '${KEYBOARD_REACH_FACT}'`)
  })

  it('refuses a citation with no declaration behind it, at either path', () => {
    const board = DeviceSchema.safeParse(declared(undefined, CITE, undefined))
    expect(board.success).toBe(false)
    expect(issues(board)).toContain('no keyboardReach is declared')
    const shift = DeviceSchema.safeParse(declared(undefined, undefined, CITE))
    expect(shift.success).toBe(false)
    expect(issues(shift)).toContain(`'${KEYBOARD_SHIFT_FACT}' carries a finding but no keyboardReach`)
  })

  it('refuses `false` at either path, which says nothing the omission does not', () => {
    const board = DeviceSchema.safeParse(declared(undefined, false, undefined))
    expect(issues(board)).toContain(`'${KEYBOARD_REACH_FACT}' is 'false'`)
    const shift = DeviceSchema.safeParse(declared(THIRTY_SEVEN, UNIT, false))
    expect(issues(shift)).toContain(`'${KEYBOARD_SHIFT_FACT}' is 'false'`)
  })

  it('accepts an unknown with a reason and no declaration, which is the finished reading', () => {
    expect(issues(DeviceSchema.safeParse(declared(undefined, READ_AND_SILENT, undefined)))).toBe('[]')
  })

  it('refuses a board that runs off the top of MIDI, and a count or a shift that is not one', () => {
    const past = DeviceSchema.safeParse(
      declared({ ...THIRTY_SEVEN, lowestMidi: 100 }, UNIT, CITE),
    )
    expect(issues(past)).toContain('past the top of MIDI')
    expect(DeviceSchema.safeParse(declared({ ...THIRTY_SEVEN, keys: 0 }, UNIT, CITE)).success).toBe(false)
    expect(
      DeviceSchema.safeParse(
        declared({ ...THIRTY_SEVEN, shift: { ...THIRTY_SEVEN.shift, octaves: { down: -1, up: 2 } } }, UNIT, CITE),
      ).success,
    ).toBe(false)
    // A MIDI number written where an octave count was meant.
    expect(
      DeviceSchema.safeParse(
        declared({ ...THIRTY_SEVEN, shift: { ...THIRTY_SEVEN.shift, octaves: { down: 60, up: 2 } } }, UNIT, CITE),
      ).success,
    ).toBe(false)
  })
})

/**
 * The arithmetic, stated on its own: the window is the board with nothing lit, the reach is every
 * placement of it, and a figure fits when its span is inside the window and some placement holds
 * both ends. The second condition is where #659's first reading went wrong.
 */
describe('reach is not keys', () => {
  it('reads the window off the board, both ends inclusive', () => {
    expect(keyboardWindow(THIRTY_SEVEN)).toEqual({ lo: 36, hi: 72 })
    expect(keyboardWindow(FIXED_BOARD)).toEqual({ lo: 48, hi: 72 })
  })

  it('reaches the window moved by every octave and every semitone, clipped to MIDI', () => {
    expect(keyboardReachRange(THIRTY_SEVEN)).toEqual({ lo: 0, hi: 108 })
    expect(keyboardReachRange({ ...THIRTY_SEVEN, lowestMidi: 48 })).toEqual({ lo: 12, hi: 120 })
    expect(keyboardReachRange(FIXED_BOARD)).toEqual({ lo: 48, hi: 72 })
  })

  it('places a figure that sits in the window as it stands with nothing moved', () => {
    expect(keyboardPlacement(THIRTY_SEVEN, 36, 72)).toEqual({ octaves: 0, semitones: 0 })
    expect(keyboardPlacement(THIRTY_SEVEN, 40, 50)).toEqual({ octaves: 0, semitones: 0 })
  })

  it('prefers the octave buttons to a transpose wherever the buttons alone will do', () => {
    // LOW BASS runs 36 to 56 and is played with the octave down one on a board from 48; the
    // transpose could reach the same place and is not the answer, because it is stored with the
    // preset and set with both hands.
    expect(keyboardPlacement({ ...THIRTY_SEVEN, lowestMidi: 48 }, 36, 56)).toEqual({ octaves: -1, semitones: 0 })
    expect(keyboardPlacement(THIRTY_SEVEN, 60, 96)).toEqual({ octaves: 2, semitones: 0 })
  })

  /**
   * The span that was said not to fit. MIDI 41 to 76 is thirty-five semitones, inside a
   * thirty-six-semitone window, and no octave setting alone holds it because every octave setting
   * opens on a C. The transpose opens the window on any note: at 40-76 or 41-77 both ends are
   * on the board, so the figure fits, on a board from 36 and on a board from 48 alike.
   */
  it('fits a span no octave setting holds, by moving the window a semitone at a time', () => {
    const onThirtySix = keyboardPlacement(THIRTY_SEVEN, 41, 76)
    expect(onThirtySix).toBeDefined()
    const onFortyEight = keyboardPlacement({ ...THIRTY_SEVEN, lowestMidi: 48 }, 41, 76)
    expect(onFortyEight).toBeDefined()
    for (const [reach, placed] of [
      [THIRTY_SEVEN, onThirtySix],
      [{ ...THIRTY_SEVEN, lowestMidi: 48 }, onFortyEight],
    ] as const) {
      if (placed === undefined) throw new Error('unreachable')
      const bottom = reach.lowestMidi + 12 * placed.octaves + placed.semitones
      expect(bottom === 40 || bottom === 41).toBe(true)
      expect(placed.semitones).not.toBe(0)
    }
    // With the transpose taken away it does not fit, which is what the first reading found.
    const buttonsOnly: KeyboardReach = {
      ...THIRTY_SEVEN,
      shift: { ...THIRTY_SEVEN.shift, semitones: { down: 0, up: 0 } },
    }
    expect(keyboardPlacement(buttonsOnly, 41, 76)).toBeUndefined()
  })

  it('places nothing wider than the board, however far it can be moved', () => {
    expect(keyboardPlacement(THIRTY_SEVEN, 36, 73)).toBeUndefined()
    expect(keyboardPlacement(THIRTY_SEVEN, 0, 37)).toBeUndefined()
    // Exactly the board's width fits, at the very bottom of the reach.
    expect(keyboardPlacement(THIRTY_SEVEN, 0, 36)).toEqual({ octaves: -2, semitones: -12 })
  })

  it('places nothing outside the reach, even inside the span', () => {
    expect(keyboardPlacement(THIRTY_SEVEN, 110, 120)).toBeUndefined()
    expect(keyboardPlacement(FIXED_BOARD, 47, 60)).toBeUndefined()
  })

  it('is deterministic: the fewest semitones, then the fewest presses', () => {
    // One note, reachable at one octave down or a transpose of -6: the button wins.
    expect(keyboardPlacement(THIRTY_SEVEN, 30, 30)).toEqual({ octaves: -1, semitones: 0 })
    // Two octaves up and no less, because one octave up ends at 84.
    expect(keyboardPlacement(THIRTY_SEVEN, 90, 90)).toEqual({ octaves: 2, semitones: 0 })
    // Thirty-six wide from 37: only bottom 37 holds it, which is one semitone up, no presses.
    expect(keyboardPlacement(THIRTY_SEVEN, 37, 73)).toEqual({ octaves: 0, semitones: 1 })
  })
})

describe('the two boxes #659 asked about', () => {
  it('the Subsequent 37 declares its board, a window of thirty-six placeable across nine octaves', () => {
    const reach = subsequent37.keyboardReach
    expect(reach).toBeDefined()
    if (reach === undefined) throw new Error('unreachable')
    expect(reach.keys).toBe(37)
    expect(keyboardWindow(reach).hi - keyboardWindow(reach).lo).toBe(36)
    expect(reach.shift).toEqual({ octaves: { down: 2, up: 2 }, semitones: { down: 12, up: 12 } })
    expect(keyboardWindow(reach)).toEqual({ lo: 36, hi: 72 })
    // Derived from three pages and the source says from which; not a unit reading.
    const board = subsequent37.capabilityEvidence?.[KEYBOARD_REACH_FACT]
    expect(board).toMatchObject({ kind: 'manual' })
    if (board === undefined || board === false || board.kind !== 'manual') throw new Error('unreachable')
    expect(board.source).toContain('pp.14, 50, 61')
    expect(subsequent37.capabilityEvidence?.[KEYBOARD_SHIFT_FACT]).toEqual({
      kind: 'manual',
      source: "Subsequent 37 User's Manual, pp.14, 61",
    })
  })

  it('the Muse records the pages read and declares nothing, because a key count is not a reach', () => {
    expect(muse.keyboardReach).toBeUndefined()
    const fact = muse.capabilityEvidence?.[KEYBOARD_REACH_FACT]
    expect(fact).toMatchObject({ kind: 'unknown' })
    if (fact === undefined || fact === false || fact.kind !== 'unknown') throw new Error('unreachable')
    expect(fact.reason).toMatch(/p\.116/)
    expect(fact.reason).toMatch(/61/)
    expect(fact.reason).toMatch(/lowest key/)
    expect(muse.capabilityEvidence?.[KEYBOARD_SHIFT_FACT]).toBeUndefined()
  })
})
