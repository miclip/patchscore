import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  FORMAT_VERSION,
  IMPLICIT_RIG_ID,
  IMPLICIT_RIG_NAME,
  SEED_MAX,
  STUDIO_DOC_VERSION,
  STUDIO_STORAGE_KEY,
  decodeGuideInputs,
  encodeGuideInputs,
  guideInputsFrom,
  implicitRig,
  loadStudio,
  moodState,
  saveStudio,
  studioDoc,
} from '../lib/core/index'
import type {
  Catalogue,
  GuideInputsV1,
  StorageLike,
  StudioDocV1,
} from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES } from '../lib/templates/index'

/**
 * §8.2's `localStorage` half, and #16's model of what is being stored.
 *
 * The thing under test is mostly *failure*. `localStorage` is absent under SSR, throws on mere
 * access when site data is blocked, throws on write when the quota is gone, and holds whatever a
 * user or another script last put in the key. None of that may reach a caller as an exception,
 * because a studio that refuses to load is a worse bug than one that starts empty.
 */

const CATALOGUE: Catalogue = {
  devices: DEVICES.map((d) => d.id),
  templates: TEMPLATES.map((t) => t.id),
  inspirations: [],
}

const TEMPLATE_ID = CATALOGUE.templates[0] as string

function inputs(over: Partial<GuideInputsV1> = {}): GuideInputsV1 {
  return {
    version: FORMAT_VERSION,
    devices: CATALOGUE.devices,
    templateId: TEMPLATE_ID,
    inspirations: [],
    mood: moodState({ density: 87, grit: 30 }),
    seed: 4242,
    ...over,
  }
}

/** A `localStorage` in four lines, with the failure modes switchable. */
function fakeStorage(initial?: string): StorageLike & { value: string | null } {
  return {
    value: initial ?? null,
    getItem(key: string) {
      return key === STUDIO_STORAGE_KEY ? this.value : null
    },
    setItem(key: string, next: string) {
      if (key === STUDIO_STORAGE_KEY) this.value = next
    },
  }
}

const NO_STORAGE = () => undefined

function stored(json: string) {
  return () => fakeStorage(json)
}

// ---------------------------------------------------------------------------

describe('the stored document keeps #16’s rig/score split', () => {
  it('puts devices in the rig and everything else in the score inputs', () => {
    const doc = studioDoc(inputs())
    expect(doc.rig.devices.map((m) => m.deviceId)).toEqual([...CATALOGUE.devices])
    expect(Object.keys(doc.inputs).sort()).toEqual(['inspirations', 'mood', 'seed', 'templateId'])
    // A rig cannot acquire a seed: the score half is a separate object, not a few more keys.
    expect(doc.rig).not.toHaveProperty('seed')
    expect(doc.rig).not.toHaveProperty('templateId')
  })

  it('stores each device as a row that already carries its (empty) settings', () => {
    // Not `{ deviceId }`. A row without `settings` would need reshaping when #16's overlay
    // lands, which is the migration this shape exists to avoid.
    for (const member of implicitRig(CATALOGUE.devices).devices) {
      expect(Object.keys(member).sort()).toEqual(['deviceId', 'settings'])
      expect(member.settings).toEqual({})
    }
  })

  it('gives every row its own settings object, not one shared between them', () => {
    const rig = implicitRig(CATALOGUE.devices)
    const [first, second] = rig.devices
    expect(first).toBeDefined()
    expect(second).toBeDefined()
    expect(first?.settings).not.toBe(second?.settings)
  })

  it('stays valid against a schema that has since grown optional overlay fields', () => {
    // The promotion claim, tested rather than asserted in a comment: this is what #16's v2
    // schema looks like once disabled voices and routing notes arrive. A document written
    // today must parse under it untouched — no migration, no reshaping.
    const futureSettings = z.strictObject({
      disabledVoices: z.array(z.string()).optional(),
      comfortableVoices: z.number().int().optional(),
      routingNote: z.string().optional(),
    })
    const futureMember = z.strictObject({
      deviceId: z.string(),
      settings: futureSettings,
    })

    const storedToday = JSON.parse(JSON.stringify(studioDoc(inputs()))) as StudioDocV1
    for (const member of storedToday.rig.devices) {
      expect(futureMember.safeParse(member).success).toBe(true)
    }
  })

  it('gives the implicit rig a stable id, so promoting it later is a copy', () => {
    expect(implicitRig([]).id).toBe(IMPLICIT_RIG_ID)
    expect(implicitRig([]).name).toBe(IMPLICIT_RIG_NAME)
    // Twice from the same devices is the same rig, not two rigs.
    expect(implicitRig(CATALOGUE.devices)).toEqual(implicitRig(CATALOGUE.devices))
  })

  it('reconstructs permalink inputs from the two parts', () => {
    const original = inputs()
    const rebuilt = guideInputsFrom(studioDoc(original))
    expect(rebuilt).toEqual(original)
    expect(encodeGuideInputs(rebuilt, CATALOGUE)).toBe(encodeGuideInputs(original, CATALOGUE))
  })

  it('keeps a stored studio and its permalink saying the same thing', () => {
    const doc = studioDoc(inputs({ seed: 7, devices: [CATALOGUE.devices[1] as string] }))
    const link = encodeGuideInputs(guideInputsFrom(doc), CATALOGUE)
    const decoded = decodeGuideInputs(link, CATALOGUE)
    expect(decoded.ok).toBe(true)
    if (decoded.ok) expect(studioDoc(decoded.inputs)).toEqual(doc)
  })

  it('copies rather than aliases, so editing state cannot rewrite the stored doc', () => {
    const mood = moodState({ grit: 10 })
    const doc = studioDoc(inputs({ mood }))
    mood.grit = 99
    expect(doc.inputs.mood.grit).toBe(10)
  })
})

describe('a valid round trip', () => {
  it('saves and loads the same document', () => {
    const storage = fakeStorage()
    const source = () => storage
    const doc = studioDoc(inputs())

    expect(saveStudio(source, doc, CATALOGUE)).toEqual({ status: 'ok' })

    const loaded = loadStudio(source, CATALOGUE)
    expect(loaded.status).toBe('ok')
    if (loaded.status !== 'ok') return
    expect(loaded.doc).toEqual(doc)
    // And the guide inputs survive the storage round trip byte for byte, as a link.
    expect(encodeGuideInputs(guideInputsFrom(loaded.doc), CATALOGUE)).toBe(
      encodeGuideInputs(inputs(), CATALOGUE),
    )
  })

  it('reports an untouched storage as empty, not as a failure', () => {
    expect(loadStudio(() => fakeStorage(), CATALOGUE)).toEqual({ status: 'empty' })
  })

  it('round trips an empty rig, which is a legal thing to own', () => {
    const storage = fakeStorage()
    const source = () => storage
    saveStudio(source, studioDoc(inputs({ devices: [] })), CATALOGUE)
    const loaded = loadStudio(source, CATALOGUE)
    expect(loaded.status).toBe('ok')
    if (loaded.status === 'ok') expect(loaded.doc.rig.devices).toEqual([])
  })
})

describe('malformed and stale data never throws', () => {
  const valid = JSON.stringify(studioDoc(inputs()))

  const bad: ReadonlyArray<readonly [string, string]> = [
    ['not JSON at all', 'not json {'],
    ['JSON that is not an object', '"a string"'],
    ['null', 'null'],
    ['an array', '[]'],
    ['an empty object', '{}'],
    ['a document with no rig', JSON.stringify({ version: 1, inputs: studioDoc(inputs()).inputs })],
    ['a document with no inputs', JSON.stringify({ version: 1, rig: implicitRig([]) })],
    ['an extra top-level key', valid.replace('{"version"', '{"extra":1,"version"')],
    ['an extra key inside the rig', valid.replace('"id":"local"', '"id":"local","colour":"red"')],
    ['an extra key on a device row', valid.replace('{"deviceId"', '{"colour":"red","deviceId"')],
    ['a device row with no settings', valid.replace(',"settings":{}', '')],
    ['settings that are not an object', valid.replace('"settings":{}', '"settings":"none"')],
    ['settings carrying a field this build does not know', valid.replace('"settings":{}', '"settings":{"disabledVoices":["sd"]}')],
    ['a rig with no name', valid.replace(`"name":"${IMPLICIT_RIG_NAME}"`, '"name":""')],
    ['a device row that is a bare string', valid.replace(/\{"deviceId":"[^"]+","settings":\{\}\}/, '"a-device"')],
    ['a mood axis missing', valid.replace(/"swing":\d+,?/, '')],
    ['a mood axis out of range', valid.replace(/"grit":\d+/, '"grit":900')],
    ['a fractional mood value', valid.replace(/"grit":\d+/, '"grit":30.5')],
    ['a seed past the maximum', valid.replace('"seed":4242', `"seed":${SEED_MAX + 1}`)],
    ['a negative seed', valid.replace('"seed":4242', '"seed":-1')],
    ['a seed that is a string', valid.replace('"seed":4242', '"seed":"4242"')],
  ]

  for (const [what, json] of bad) {
    it(`rejects ${what}`, () => {
      const result = loadStudio(stored(json), CATALOGUE)
      expect(result.status).toBe('invalid')
      if (result.status !== 'invalid') return
      expect(result.detail.length).toBeGreaterThan(0)
      expect(result).not.toHaveProperty('doc')
    })
  }

  it('names a stale version rather than calling it corruption', () => {
    const result = loadStudio(stored(valid.replace('"version":1', '"version":2')), CATALOGUE)
    expect(result.status).toBe('invalid')
    if (result.status !== 'invalid') return
    expect(result.stored).toBe(2)
    expect(result.detail).toContain(`v${STUDIO_DOC_VERSION}`)
  })

  it('has no version to report when the document is simply corrupt', () => {
    const result = loadStudio(stored('{{{'), CATALOGUE)
    expect(result.status).toBe('invalid')
    if (result.status === 'invalid') expect(result.stored).toBeUndefined()
  })
})

describe('unknown ids are corruption, not something to quietly drop', () => {
  const valid = JSON.stringify(studioDoc(inputs()))
  const firstDevice = CATALOGUE.devices[0] as string

  it('refuses a rig naming a device this build does not ship', () => {
    const json = valid.replace(`"deviceId":"${firstDevice}"`, '"deviceId":"aphex-widget"')
    const result = loadStudio(stored(json), CATALOGUE)
    expect(result.status).toBe('invalid')
    // Never "here is your rig, minus the box you actually own".
    expect(result).not.toHaveProperty('doc')
  })

  it('refuses a template this build does not ship', () => {
    const json = valid.replace(`"templateId":"${TEMPLATE_ID}"`, '"templateId":"gabber"')
    expect(loadStudio(stored(json), CATALOGUE).status).toBe('invalid')
  })

  it('refuses an inspiration, which no build has yet', () => {
    const json = valid.replace('"inspirations":[]', '"inspirations":["blue-monday"]')
    expect(loadStudio(stored(json), CATALOGUE).status).toBe('invalid')
  })

  it('refuses a duplicated device row', () => {
    const json = valid.replace(
      `{"deviceId":"${firstDevice}","settings":{}}`,
      `{"deviceId":"${firstDevice}","settings":{}},{"deviceId":"${firstDevice}","settings":{}}`,
    )
    expect(loadStudio(stored(json), CATALOGUE).status).toBe('invalid')
  })

  it('refuses to save what it would refuse to load', () => {
    const doc = studioDoc(inputs({ devices: ['aphex-widget'] }))
    const result = saveStudio(() => fakeStorage(), doc, CATALOGUE)
    expect(result.status).toBe('invalid')
    if (result.status === 'invalid') expect(result.detail).toContain('aphex-widget')
  })

  it('writes nothing when it refuses to save', () => {
    const storage = fakeStorage()
    saveStudio(() => storage, studioDoc(inputs({ seed: -5 })), CATALOGUE)
    expect(storage.value).toBeNull()
  })
})

describe('storage that is missing or hostile', () => {
  it('reports unavailable when there is no storage at all', () => {
    expect(loadStudio(NO_STORAGE, CATALOGUE).status).toBe('unavailable')
    expect(saveStudio(NO_STORAGE, studioDoc(inputs()), CATALOGUE).status).toBe('unavailable')
  })

  it('reports unavailable when reaching storage throws', () => {
    // Safari with site data blocked throws a SecurityError on the property access itself, which
    // is why the source is a thunk: the throw happens inside this file's try, not the caller's.
    const hostile = () => {
      throw new DOMException('The operation is insecure.', 'SecurityError')
    }
    const load = loadStudio(hostile, CATALOGUE)
    expect(load.status).toBe('unavailable')
    if (load.status === 'unavailable') expect(load.detail).toContain('insecure')
    expect(saveStudio(hostile, studioDoc(inputs()), CATALOGUE).status).toBe('unavailable')
  })

  it('reports unavailable when getItem throws', () => {
    const source = () => ({
      getItem(): string | null {
        throw new Error('read blocked')
      },
      setItem(): void {},
    })
    expect(loadStudio(source, CATALOGUE)).toEqual({
      status: 'unavailable',
      detail: 'storage could not be read: read blocked',
    })
  })

  it('reports unavailable when setItem throws the quota error', () => {
    const source = () => ({
      getItem(): string | null {
        return null
      },
      setItem(): void {
        throw new DOMException('quota exceeded', 'QuotaExceededError')
      },
    })
    const result = saveStudio(source, studioDoc(inputs()), CATALOGUE)
    expect(result.status).toBe('unavailable')
    if (result.status === 'unavailable') expect(result.detail).toContain('quota')
  })

  it('survives a thrown value that is not an Error', () => {
    const source = () => {
      throw 'nope'
    }
    const result = loadStudio(source, CATALOGUE)
    expect(result.status).toBe('unavailable')
    if (result.status === 'unavailable') expect(result.detail).toContain('unknown error')
  })

  it('never throws, whatever the storage does', () => {
    const hostile: Array<() => StorageLike | undefined> = [
      NO_STORAGE,
      () => {
        throw new Error('boom')
      },
      () => fakeStorage('{{{'),
      () => fakeStorage('null'),
      () => fakeStorage(JSON.stringify({ version: 99 })),
    ]
    const doc: StudioDocV1 = studioDoc(inputs())
    for (const source of hostile) {
      expect(() => loadStudio(source, CATALOGUE)).not.toThrow()
      expect(() => saveStudio(source, doc, CATALOGUE)).not.toThrow()
    }
  })
})
