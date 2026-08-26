import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  CAPABILITY_FACTS,
  DeviceSchema,
  NOTE_DURATION_FACT,
  NoteDurationSchema,
  evidenceFor,
  moodState,
  noteDurationNotice,
  noteOffSteps,
  printsNoteDuration,
  renderGuide,
  resolve,
} from '../lib/core/index'
import type { Cite, Device, Hook, ResolveResult, RoleRequest } from '../lib/core/index'
import { Guide } from '../components/guide/guide'
import { box, makeRecipe, request, withRoles } from './rigs'
import { DEVICES } from '../lib/devices/registry.generated'
import { droneStudy } from '../lib/templates/index'

/**
 * §2.6/#142. **The Hook phase did not know what device was playing the part**, and three defects
 * had grown in the hole that left.
 *
 * The reported symptom was a unit: `len 128` is eight bars, printed as arithmetic for somebody
 * standing at a rack. Underneath it were two worse ones. The word collided with a *cited*
 * parameter on the same box in the same guide — the Tracker Mini's `LENGTH 640 ms`, p.142 — so
 * the one that looked like a parameter was not and the one that was measured something else
 * entirely. And `len` described a field the Tracker Mini does not have: there is no note-length
 * column in its pattern, and what the guide printed as an instruction was a consequence of where
 * the *next* note sat.
 *
 * All three are one absence. `hookLines` consulted `recipe.realisation` and whether the part was
 * stacked, both properties of the recipe, and the model had no fact about the device at all. So
 * these tests are about the fact existing, being cited, reaching both renderers with the same
 * verdict, and changing what a reader is told to do.
 */

const CITE: Cite = { kind: 'manual', source: 'Fixture p.1' }

function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#x2019;/g, '’')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
}

function both(result: ResolveResult): string[] {
  return [renderGuide(result), text(renderToStaticMarkup(createElement(Guide, { result, seed: 1 })))]
}

/** One monophonic voice, one hook on it, and whatever note-duration answer the test is about. */
function rig(notes: Hook['notes'], over: Partial<Device> = {}, bars = 2): ResolveResult {
  const device = box('a-box', {
    voices: [{ kind: 'fixed', id: 'voice', label: 'Voice', roles: ['bass-mid'], polyphony: 1 }],
    recipes: [makeRecipe('a-bass', 'bass-mid', 'hard', 'voice')],
    // A box that prints durations by default, since most of these tests are about the number.
    // `box` otherwise hands out a drum machine's `trigger`, which correctly prints none.
    noteDuration: { kind: 'per-note-value', control: 'LEN' },
    ...over,
  })
  const roles: RoleRequest[] = [request({ id: 'r-bass', role: 'bass-mid' })]
  return resolve({
    devices: [device],
    template: withRoles(roles, {
      hooks: [{ id: 'h', forRole: 'bass-mid', bars, baseOctave: 2, notes }],
    }),
    mood: moodState(),
    seed: 1,
  })
}

function evidence(over: Partial<Device> = {}): Partial<Device> {
  return { capabilityEvidence: { [NOTE_DURATION_FACT]: CITE }, ...over }
}

// ---------------------------------------------------------------------------
// The fact itself
// ---------------------------------------------------------------------------

describe('a device says how it expresses note duration (§2.6/#142)', () => {
  it('is a capability fact, so it is cited and audited like every other one', () => {
    // Not a second provenance mechanism beside #22's — which is the whole reason the fix is a
    // device fact rather than a branch in the renderer.
    expect(CAPABILITY_FACTS).toContain(NOTE_DURATION_FACT)
  })

  it('accepts the five kinds and refuses a state with nothing behind it', () => {
    expect(NoteDurationSchema.safeParse({ kind: 'per-note-value', control: 'LEN' }).success).toBe(
      true,
    )
    expect(
      NoteDurationSchema.safeParse({ kind: 'per-note-value', control: 'LEN', unit: 'steps' })
        .success,
    ).toBe(true)
    expect(NoteDurationSchema.safeParse({ kind: 'tied-steps', control: 'TIE' }).success).toBe(true)
    expect(NoteDurationSchema.safeParse({ kind: 'until-next', noteOff: 'OFF' }).success).toBe(true)
    expect(NoteDurationSchema.safeParse({ kind: 'gate', source: 'the key you hold' }).success).toBe(
      true,
    )
    expect(NoteDurationSchema.safeParse({ kind: 'trigger', reason: 'the decay' }).success).toBe(true)

    // A control nobody can point at, a note-off with no name, a trigger with no account of what
    // decides instead: each is the shrug §2.6 refuses wearing a field name.
    expect(NoteDurationSchema.safeParse({ kind: 'per-note-value', control: '' }).success).toBe(false)
    expect(NoteDurationSchema.safeParse({ kind: 'until-next', noteOff: '' }).success).toBe(false)
    expect(NoteDurationSchema.safeParse({ kind: 'trigger', reason: '' }).success).toBe(false)
    expect(NoteDurationSchema.safeParse({ kind: 'unknown' }).success).toBe(false)
  })

  it('leaves `unit` optional, because a stated unit is a claim', () => {
    // The Crave's quick-start names the knob and ranges nothing, here or in its specifications.
    // A scale invented to fill the field would be exactly what §3.1 refuses, so the guide names
    // the control and stops.
    const parsed = NoteDurationSchema.safeParse({ kind: 'per-note-value', control: 'GATE LENGTH' })
    expect(parsed.success && parsed.data).toMatchObject({ control: 'GATE LENGTH' })
    expect(
      NoteDurationSchema.safeParse({ kind: 'per-note-value', control: 'X', unit: '' }).success,
    ).toBe(false)
  })
})

describe('a declaration is a positive claim and carries a page (§2.6/#142)', () => {
  function parseable(over: Partial<Device> = {}): Device {
    return box('a-box', {
      voices: [{ kind: 'fixed', id: 'v', label: 'V', roles: ['bass-mid'], polyphony: 1 }],
      recipes: [makeRecipe('a-bass', 'bass-mid', 'hard', 'v')],
      ...over,
    })
  }

  function parse(over: Partial<Device>) {
    return DeviceSchema.safeParse(parseable(over))
  }

  it('refuses a declaration with no citation', () => {
    // A raw object rather than the fixture, which pairs the two for you (§2.6/#142): the pairing
    // is the thing under test here, so it has to be possible to break it.
    const unpaired = {
      ...parseable(),
      noteDuration: { kind: 'until-next', noteOff: 'OFF' },
      capabilityEvidence: { 'io.main': CITE },
    }
    expect(DeviceSchema.safeParse(unpaired).success).toBe(false)
    expect(
      parse({
        noteDuration: { kind: 'until-next', noteOff: 'OFF' },
        capabilityEvidence: { [NOTE_DURATION_FACT]: CITE },
      }).success,
    ).toBe(true)
  })

  it('refuses a citation with no declaration, because it supports no claim', () => {
    // The Cascadia's lesson at `clock.preferredSource`, one field over (#120): a `Cite` at a path
    // whose field is absent reads as evidence *for* a claim nobody made.
    expect(
      parse({ noteDuration: undefined, capabilityEvidence: { [NOTE_DURATION_FACT]: CITE } }).success,
    ).toBe(false)
  })

  it('refuses `false`, which says nothing the omission does not', () => {
    expect(
      parse({ noteDuration: undefined, capabilityEvidence: { [NOTE_DURATION_FACT]: false } })
        .success,
    ).toBe(false)
  })

  it('accepts a reasoned non-claim with no declaration', () => {
    // #120's three states, and the minilogue xd is really in one of them: its manual is not in
    // `manuals/` at all, so nobody here has opened the document that would answer.
    for (const state of [
      { kind: 'unknown', reason: 'read, and the manual does not say' },
      { kind: 'unread', reason: 'the manual is not in `manuals/`' },
      { kind: 'cited-against', reason: 'it answers no', cite: CITE },
    ] as const) {
      expect(
        parse({ noteDuration: undefined, capabilityEvidence: { [NOTE_DURATION_FACT]: state } })
          .success,
        state.kind,
      ).toBe(true)
    }
  })

  it('refuses silence from a box that carries parts', () => {
    // The `sourceAudio` rule in another key (§2.6/#111): a box a guide can ask to play something
    // has to have been asked how it ends a note, and a schema cannot see a guide, so any recipe
    // at all is the trigger.
    expect(parse({ noteDuration: undefined, capabilityEvidence: undefined }).success).toBe(false)
    // A box with no recipes carries no part and owes nothing — the mixers, and the ZOIA.
    expect(
      DeviceSchema.safeParse(box('a-mixer', { noteDuration: undefined, capabilityEvidence: undefined }))
        .success,
    ).toBe(true)
  })

  it('is answered by every device in the library', () => {
    // The point of the schema rule, asserted over the real manifests: no box a guide can assign
    // reaches a reader with the question unasked.
    for (const device of DEVICES) {
      if (device.recipes.length === 0) continue
      expect(evidenceFor(device, NOTE_DURATION_FACT), device.id).toBeDefined()
    }
  })
})

// ---------------------------------------------------------------------------
// One decision, two renderers
// ---------------------------------------------------------------------------

describe('noteDurationNotice decides the state once, for both renderers (§2.6/#142)', () => {
  it('falls to unknown for an undeclared box, and for a part nothing carries', () => {
    expect(noteDurationNotice(undefined)).toEqual({ state: 'unknown', evidence: undefined })
    const silent = box('a-box', { noteDuration: undefined })
    expect(noteDurationNotice(silent).state).toBe('unknown')
  })

  it('prints a duration wherever there is something to do with it', () => {
    // `until-next` and `trigger` are the two where a number would be an instruction to enter
    // something into a field that does not exist.
    expect(printsNoteDuration({ state: 'per-note-value', control: 'LEN', unit: undefined, evidence: CITE })).toBe(true)
    expect(printsNoteDuration({ state: 'tied-steps', control: 'TIE', evidence: CITE })).toBe(true)
    expect(printsNoteDuration({ state: 'gate', source: 'a key', evidence: CITE })).toBe(true)
    expect(printsNoteDuration({ state: 'until-next', noteOff: 'OFF', evidence: CITE })).toBe(false)
    expect(printsNoteDuration({ state: 'trigger', reason: 'decay', evidence: CITE })).toBe(false)
    // Unknown prints, and that is the one that looks wrong and is not: the duration is a musical
    // fact about the hook (§4.1), and withholding it over a gap in *our* knowledge would drop
    // authored content — invariant 5 backwards.
    expect(printsNoteDuration({ state: 'unknown', evidence: undefined })).toBe(true)
  })

  it('says the same thing in the guide and on the page', () => {
    const notes = [{ step: 1, degree: 1, octave: 0, len: 4 }]
    for (const [over, sentence] of [
      [
        { noteDuration: { kind: 'per-note-value', control: 'LEN', unit: 'steps' } },
        'Note length is set per note here',
      ],
      [{ noteDuration: { kind: 'tied-steps', control: 'TIE' } }, 'A step is one note long'],
      [{ noteDuration: { kind: 'until-next', noteOff: 'OFF' } }, 'No note-length field on this box'],
      [{ noteDuration: { kind: 'gate', source: 'the key you hold' } }, 'Length here is a gate'],
      [{ noteDuration: { kind: 'trigger', reason: 'the decay ends it' } }, 'A step is a trigger'],
    ] as [Partial<Device>, string][]) {
      for (const doc of both(rig(notes, evidence(over)))) {
        expect(doc, sentence).toContain(sentence)
      }
    }
  })

  it('says nothing about a box for a part no box carries', () => {
    // Every sentence the notice has says *this box*, and an unassigned part has none — the guide
    // has already said so in the line above.
    const orphan = resolve({
      devices: [],
      template: withRoles([request({ id: 'r-bass', role: 'bass-mid' })], {
        hooks: [
          { id: 'h', forRole: 'bass-mid', bars: 1, baseOctave: 2, notes: [{ step: 1, degree: 1, octave: 0, len: 4 }] },
        ],
      }),
      mood: moodState(),
      seed: 1,
    })
    for (const doc of both(orphan)) {
      expect(doc).toContain('Nothing in your rig plays this part')
      expect(doc).not.toContain('not established here')
      // The notes are still the part, so they still print.
      expect(doc).toContain('sounds for 4 steps')
    }
  })
})

// ---------------------------------------------------------------------------
// The unit, which is what #142 reported
// ---------------------------------------------------------------------------

describe('a duration reads at a glance and never divides (#142)', () => {
  const cases: [number, string][] = [
    [1, 'sounds for 1 step'],
    [6, 'sounds for 6 steps'],
    [15, 'sounds for 15 steps'],
    [16, 'sounds for 16 steps (1 bar)'],
    [24, 'sounds for 24 steps (1 bar 8 steps)'],
    [33, 'sounds for 33 steps (2 bars 1 step)'],
    [128, 'sounds for 128 steps (8 bars)'],
  ]

  for (const [len, expected] of cases) {
    it(`renders ${len} as "${expected}"`, () => {
      const result = rig([{ step: 1, degree: 1, octave: 0, len }], evidence({}), 16)
      for (const doc of both(result)) expect(doc).toContain(expected)
    })
  }

  it('never reaches for a fraction, which is what a sub-bar length would have become', () => {
    for (const [, expected] of cases) expect(expected).not.toMatch(/\d\.\d/)
  })

  it('lists each length when a chord disagrees, rather than splitting the chord', () => {
    const chord = rig(
      [
        { step: 1, degree: 1, octave: 0, len: 4 },
        { step: 1, degree: 3, octave: 0, len: 32 },
      ],
      evidence({
        voices: [{ kind: 'fixed', id: 'voice', label: 'Voice', roles: ['bass-mid'], polyphony: 2 }],
      }),
      4,
    )
    for (const doc of both(chord)) {
      expect(doc).toContain('sounds for 4 steps / 32 steps (2 bars)')
    }
  })
})

// ---------------------------------------------------------------------------
// Nothing in phase 4 collides with a cited parameter
// ---------------------------------------------------------------------------

describe('the hook does not borrow a name a device already uses (#142)', () => {
  function hookPhase(markdown: string): string {
    const start = markdown.indexOf('## 4. Hook')
    return markdown.slice(start, markdown.indexOf('## 5.', start))
  }

  it('drops `len`, which collided with the Tracker Mini’s cited `LENGTH`', () => {
    const tracker = DEVICES.find((d) => d.id === 'polyend-tracker-mini') as Device
    const md = renderGuide(
      resolve({ devices: [tracker], template: droneStudy, mood: moodState(), seed: 18 }),
    )
    const phase = hookPhase(md)
    expect(phase).not.toMatch(/\blen \d/)
    // And the parameter it collided with is still there, in the phase it belongs to, cited.
    expect(md.slice(md.indexOf('## 6.'))).toContain('LENGTH')
  })
})

// ---------------------------------------------------------------------------
// A Tracker Mini part reads as an instruction
// ---------------------------------------------------------------------------

describe('the Drone Study on a Tracker Mini (#142)', () => {
  const tracker = DEVICES.find((d) => d.id === 'polyend-tracker-mini') as Device
  const result = resolve({
    devices: [tracker],
    template: droneStudy,
    mood: moodState(),
    seed: 18,
  })

  it('is three notes at steps 1, 129 and 193 and nothing between them', () => {
    // The instruction the guide could not give before: the box has no length field, the notes
    // abut exactly (1+128 = 129, 129+64 = 193), and the last runs to the end of a 16-bar pattern.
    // So there is nothing to enter between them — no length, and no `OFF` either.
    for (const doc of both(result)) {
      for (const step of [1, 129, 193]) expect(doc).toContain(`step ${step}`)
      expect(doc).not.toMatch(/\blen \d/)
      // No note-off either: they abut, and the last runs to the end of the pattern. Matched as a
      // row rather than as a word, because `OFF` is a legal value elsewhere in a guide.
      expect(doc).not.toMatch(/step \d+ · `?OFF/)
    }
  })

  it('says why, and cites the page that says it', () => {
    for (const doc of both(result)) {
      expect(doc).toContain('No note-length field on this box')
      expect(doc).toContain('a note runs until the next note on the same voice')
    }
    expect(renderGuide(result)).toContain('Polyend Tracker Mini Manual 2.2.1b, p.105')
  })
})

// ---------------------------------------------------------------------------
// Where a note stops short, the guide says where the note-off goes
// ---------------------------------------------------------------------------

describe('note-offs are the gesture, placed where the note actually ends (#142)', () => {
  it('places one where a note stops before the next, and none where they abut', () => {
    expect(noteOffSteps([{ step: 1, len: 4 }, { step: 9, len: 8 }], 32)).toEqual([5, 17])
    // 1 + 8 = 9, which is the next note's own step: nothing to enter between them.
    expect(noteOffSteps([{ step: 1, len: 8 }, { step: 9, len: 8 }], 32)).toEqual([17])
  })

  it('places none for a note running to or past the end of the pattern', () => {
    // There is no step to put it on, and the pattern ending is what stops the note.
    expect(noteOffSteps([{ step: 1, len: 32 }], 32)).toEqual([])
    expect(noteOffSteps([{ step: 1, len: 64 }], 32)).toEqual([])
    expect(noteOffSteps([{ step: 1, len: 31 }], 32)).toEqual([32])
  })

  it('says it once for two notes ending on the same step', () => {
    expect(noteOffSteps([{ step: 1, len: 4 }, { step: 1, len: 4 }], 32)).toEqual([5])
  })

  it('renders them interleaved, in the order they are typed in', () => {
    const result = rig(
      [
        { step: 1, degree: 1, octave: 0, len: 4 },
        { step: 9, degree: 5, octave: 0, len: 4 },
      ],
      evidence({ noteDuration: { kind: 'until-next', noteOff: 'OFF' } }),
    )
    const md = renderGuide(result)
    const rows = md
      .split('\n')
      .filter((l) => /^- (bar \d+ · )?step \d+/.test(l))
      .map((l) => l.replace(/ · `[A-G].*$/, ''))
    expect(rows).toEqual([
      '- bar 1 · step 1',
      '- bar 1 · step 5 · `OFF`',
      '- bar 1 · step 9',
      '- bar 1 · step 13 · `OFF`',
    ])
    // The page says the same, in the same order.
    expect(text(renderToStaticMarkup(createElement(Guide, { result, seed: 1 })))).toContain(
      'step 5 · OFF',
    )
  })
})
