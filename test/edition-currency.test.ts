import { describe, expect, it } from 'vitest'
import { DeviceSchema, ManualRefSchema } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { auditDevice, editionCurrency, formatAudit } from '../scripts/audit-verified'
import { device } from './fixtures'

/**
 * §2.3/#480. An edition says which copy was read. It does not say whether the maker has published
 * a newer one, which is how the Cascadia cited v1.1 for months against a published v1.4. The date
 * is that check, recorded by hand, and these tests hold the two halves of it: the schema will not
 * take a date that is about nothing, and the audit says how much of the library is unchecked.
 */
describe('the schema (§2.3)', () => {
  it('takes an ISO date beside an edition', () => {
    const parsed = ManualRefSchema.safeParse({
      title: 'Fixture Manual',
      edition: 'v1.4',
      currentEditionConfirmedOn: '2026-09-08',
    })
    expect(parsed.success).toBe(true)
  })

  it('refuses the date on a manual naming no edition, because it confirms an edition', () => {
    const parsed = ManualRefSchema.safeParse({
      title: 'Fixture Manual',
      currentEditionConfirmedOn: '2026-09-08',
    })
    expect(parsed.success).toBe(false)
    expect(parsed.error?.issues[0]?.path).toEqual(['currentEditionConfirmedOn'])
  })

  it('leaves both halves optional, so an unchecked manual stays legal', () => {
    expect(ManualRefSchema.safeParse({ title: 'Fixture Manual' }).success).toBe(true)
    expect(ManualRefSchema.safeParse({ title: 'Fixture Manual', edition: 'v1.4' }).success).toBe(
      true,
    )
  })

  it('takes calendar dates only, in one format', () => {
    // A date read back off this field is compared and reported. Two formats would be two
    // meanings, and '2026-02-30' is not a day anybody checked anything on.
    for (const bad of [
      '2026-9-8',
      '2026/09/08',
      '08-09-2026',
      '2026-02-30',
      '2026-13-01',
      '2026-09-08T00:00:00Z',
      'September 2026',
      '',
    ]) {
      const parsed = ManualRefSchema.safeParse({
        title: 'Fixture Manual',
        edition: 'v1.4',
        currentEditionConfirmedOn: bad,
      })
      expect(parsed.success, bad).toBe(false)
    }
    expect(
      ManualRefSchema.safeParse({
        title: 'Fixture Manual',
        edition: 'v1.4',
        currentEditionConfirmedOn: '2024-02-29',
      }).success,
    ).toBe(true)
  })

  it('reaches a whole manifest, not just the ref on its own', () => {
    const ok = device({
      manual: { title: 'Fixture Manual', edition: 'eng02', currentEditionConfirmedOn: '2026-09-08' },
    })
    expect(DeviceSchema.safeParse(ok).success).toBe(true)

    const bad = device({
      manual: { title: 'Fixture Manual', currentEditionConfirmedOn: '2026-09-08' },
    })
    expect(DeviceSchema.safeParse(bad).success).toBe(false)
  })
})

describe('the audit counts three states apart (§9/#480)', () => {
  it('splits dated, open and a manual with no edition to check', () => {
    const found = editionCurrency([
      device({
        id: 'b-dated',
        manual: { title: 'B', edition: 'v2', currentEditionConfirmedOn: '2026-09-08' },
      }),
      device({ id: 'c-open', manual: { title: 'C', edition: 'v3' } }),
      device({ id: 'd-absent', manual: { title: 'D' } }),
    ])
    expect(found.dated).toEqual([{ deviceId: 'b-dated', on: '2026-09-08' }])
    expect(found.open).toEqual(['c-open'])
    expect(found.absent).toEqual(['d-absent'])
  })

  it('counts every manifest exactly once, so no state can hide a device', () => {
    const found = editionCurrency(DEVICES)
    expect(found.dated.length + found.open.length + found.absent.length).toBe(DEVICES.length)
    const named = [...found.dated.map((d) => d.deviceId), ...found.open, ...found.absent]
    expect(new Set(named).size).toBe(DEVICES.length)
  })

  it('orders by code unit, not by registry order or by locale', () => {
    const found = editionCurrency([
      device({ id: 'Zed', manual: { title: 'Z', edition: 'v1' } }),
      device({ id: 'apple', manual: { title: 'A', edition: 'v1' } }),
      device({ id: 'Apple', manual: { title: 'A', edition: 'v1' } }),
    ])
    // Capitals sort before lower case by code unit. A locale collation would interleave them.
    expect(found.open).toEqual(['Apple', 'Zed', 'apple'])
  })
})

describe('what the library says today', () => {
  it('has the two Intellijel boxes confirmed current, and nothing else', () => {
    const { dated } = editionCurrency(DEVICES)
    expect(dated).toEqual([
      { deviceId: 'intellijel-cascadia', on: '2026-09-08' },
      { deviceId: 'intellijel-metropolix', on: '2026-09-08' },
    ])
  })

  it('names the one manifest whose manual carries no edition at all', () => {
    expect(editionCurrency(DEVICES).absent).toEqual(['moog-subsequent-37'])
  })

  it('names every unchecked manifest in the report, uncapped', () => {
    const { dated, open, absent } = editionCurrency(DEVICES)
    const out = formatAudit(
      DEVICES.map((d) => auditDevice(d)),
      false,
    )
    const block = out.slice(out.indexOf('  EDITIONS'), out.indexOf('  INERT'))
    expect(block).not.toBe('')
    expect(block).toContain(
      `    dated  ${String(dated.length).padStart(5)} of ${String(dated.length + open.length)} cited editions`,
    )
    // Every one of them, uncapped, on both lists: a reader asking whether their box was checked
    // is asking about the one name a `… and 30 more` would hide.
    for (const id of [...open, ...absent]) expect(block, id).toContain(id)
    expect(block).not.toContain('more')
    expect(block).toContain('no cited edition to confirm')
  })
})
