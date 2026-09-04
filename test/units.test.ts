import { describe, expect, it } from 'vitest'
import { compareCodeUnits } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'

/**
 * #29, item 3. The unit vocabulary is pinned by a snapshot, **not** by a closed union.
 *
 * §2.3 left `ClockTransport` open on the grounds that "a closed union guessed here would reject
 * a legal manifest for a box with a transport nobody anticipated", and units are the same shape
 * of problem: a device measuring something in a unit nobody has met yet is legal authoring, and
 * a union would fail the build for it. What a union would buy — catching `st` where the library
 * already says `St` — a snapshot buys too, and without the refusal.
 *
 * So this fails the moment a *new* unit appears, and is repaired by one person looking at the
 * new unit and adding it. That is the review, and it happens at exactly the right moment: while
 * the recipe that introduced it is still being written.
 *
 * The **set** is pinned, never the counts. Counts move every time anyone authors a recipe, and
 * a test that fails on ordinary content work is a test people learn to regenerate without
 * reading — which is precisely the failure this one exists to avoid.
 */

/**
 * Reviewed 2026-08-22, against the three registry devices.
 * Reviewed again 2026-08-23, when the Cascadia added three.
 *
 * Two known drifts are in this list rather than fixed by it, because repairing them is content
 * work on the device folders and this file is only the tripwire:
 *
 *  - `St` and `st` are both semitones.
 *  - `Sec` and `ms` are both time, at different scales.
 *
 * #29 records both. Fixing either is expected to fail this test, which is the point: the fix
 * gets reviewed here rather than landing silently.
 *
 * The 2026-08-23 additions, and what each was weighed against:
 *
 *  - **`V`** — volts, for envelope sustain, which the Cascadia manual prints as a voltage rather
 *    than a percentage ("0 V at the bottom and 5 V at the top", p.28). No existing unit covers it.
 *  - **`°`** — degrees, for an LFO phase offset printed as "0° at the bottom, to 360° at the top"
 *    (p.36). Likewise nothing existing.
 *  - **`% travel`** — how far up a slider sits, on a control whose panel carries no scale at all.
 *    Deliberately *not* spelled `%`: a bare percent on that library's other devices means a value
 *    the box itself displays as a percentage, and this one means a physical fader position with
 *    no displayed number behind it. Two different claims should not share a spelling.
 *
 * The 2026-08-23 addition when the MC-101 landed:
 *
 *  - **`dB`** — decibels, for the gain of an EQ band, printed as such throughout that box's
 *    parameter tables (`Low Gain -24.0-+24.0 [dB]`, Reference Manual p.47). Nothing existing
 *    covers it: `%` is a proportion the box displays, `V` is a voltage. It is spelled the way
 *    every manual in `manuals/` spells it, which is the one spelling this library will keep
 *    meeting, so it introduces no drift of the `St`/`st` kind.
 *
 * Two units the Cascadia introduced and then gave up, to avoid widening the drift above:
 * `semitones` became `st`, and `% duty` became `%`. Both were the manual's own wording, and both
 * would have been a *third* spelling of something the library already spells two ways.
 */
/**
 * The 2026-08-25 addition when the DFAM landed:
 *
 *  - **`% travel from centre`** — a bipolar knob position, on a control with a detented centre and
 *    `(-)` / `(+)` printed at its ends. p.16 of that manual: "All AMOUNT knobs on DFAM are
 *    bipolar, meaning that they have both positive (+) and negative (–) modulation values
 *    available."
 *
 *    **Weighed against reusing `% travel`, and it is not the `St`/`st` drift this list warns
 *    about.** That drift is one meaning with two spellings. This is a second meaning: `% travel`
 *    runs 0-100 from an end stop, and this runs -100 to +100 from a centre. Folding them would
 *    make `VCF EG AMOUNT` read `50 % travel` at the one setting that manual flags twice as the
 *    trap — p.15 and p.19 both warn that a centred AMOUNT knob makes its DECAY knob "appear to
 *    have no function" — where `0 % travel from centre` says it outright. The alternative
 *    spelling considered and rejected was a bare `%`, which on this library's other devices means
 *    a number the box itself displays.
 */
/**
 * The 2026-09-04 addition when #381 re-read the Muse's envelope faders:
 *
 *  - **`s`** — seconds, for the six envelope time stages, which that box's screen shows as
 *    `0-10 s`. The reading is `observed` and the firmware is in the citation.
 *
 *    **This is a third spelling of time and it was weighed against the two that exist.** `ms` is
 *    ours and is the wrong scale — a 6-second texture swell reads `6000 ms`, which is a number
 *    somebody has to divide before they can set a fader. `Sec` is not ours: `test/units.vocabulary
 *    .test.ts` classifies it as *the box's own, checked against its manual*, printed 49 times in
 *    the Polyend documents, so putting it on a Moog would be borrowing one manufacturer's
 *    abbreviation for another's screen. By that file's own rule `s` is this box's spelling and
 *    belongs beside `Sec` rather than instead of it.
 *
 *    **The `Sec`/`ms` drift this list already records is now a three-way one**, and that is worth
 *    saying plainly rather than leaving for somebody to notice. Folding all three into one
 *    spelling is content work across four device folders and is not #381; it is the same shape of
 *    repair as `St`/`st`, and it gets reviewed here when somebody takes it.
 */
const REVIEWED_UNITS = [
  '%',
  '% travel',
  '% travel from centre',
  'Bits',
  'Hz',
  'Sec',
  'St',
  'V',
  'c',
  'dB',
  'ms',
  's',
  'st',
  '°',
]

function unitsInUse(): string[] {
  const seen = new Set<string>()
  for (const device of DEVICES) {
    for (const recipe of device.recipes) {
      for (const param of recipe.params) {
        if (param.kind === 'numeric' && param.unit !== undefined) seen.add(param.unit)
      }
    }
  }
  // §7.2: code unit order, so the list is the same on any platform and under any locale.
  return [...seen].sort(compareCodeUnits)
}

describe('unit vocabulary (#29)', () => {
  it('uses exactly the reviewed set of units', () => {
    expect(unitsInUse()).toEqual([...REVIEWED_UNITS].sort(compareCodeUnits))
  })

  it('would catch a new spelling of a unit already in use', () => {
    // The failure mode being guarded: `st` arriving on a fourth device beside `St`. Asserting
    // the guard works, rather than trusting that it does.
    const withDrift = [...unitsInUse(), 'ST'].sort(compareCodeUnits)
    expect(withDrift).not.toEqual([...REVIEWED_UNITS].sort(compareCodeUnits))
  })

  it('keeps the reviewed list free of duplicates, which would hide a missing unit', () => {
    expect(new Set(REVIEWED_UNITS).size).toBe(REVIEWED_UNITS.length)
  })
})
