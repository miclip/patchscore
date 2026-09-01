import { describe, expect, it } from 'vitest'
import { verdict } from '../scripts/run-tests'

/**
 * §9/#265. The gate that decides whether a non-zero `vitest run` is forgivable.
 *
 * This replaced `dangerouslyIgnoreUnhandledErrors`, which forgave *every* unhandled error on CI.
 * The whole value of the replacement is that it is narrow, so the tests that matter here are the
 * ones proving it still fails: a forgiving gate that forgives too much is worse than the blunt
 * flag it replaced, because it reads as though somebody thought about it.
 *
 * Fixtures are trimmed real output, colour codes included on one of them, because stripping SGR is
 * a step the parser has to take and a hand-written clean string would not exercise it.
 */

const CLEAN_SUMMARY = `
 Test Files  117 passed (117)
      Tests  3391 passed (3391)
   Duration  104.16s
`

const WITH_TIMEOUTS = (n: number): string => `
${'Error: [vitest-worker]: Timeout calling "onTaskUpdate"\n'.repeat(n)}
 Test Files  117 passed (117)
      Tests  3391 passed (3391)
     Errors  ${String(n)} error${n === 1 ? '' : 's'}
`

describe('what the gate forgives (#265)', () => {
  it('passes a clean run straight through', () => {
    expect(verdict(CLEAN_SUMMARY, 0)).toEqual({ code: 0 })
  })

  it('forgives a run whose only errors are the transport timeout', () => {
    const got = verdict(WITH_TIMEOUTS(9), 1)
    expect(got.code).toBe(0)
    expect(got.note).toContain('forgave 9')
    expect(got.note).toContain('3391 passed')
  })

  it('says so in the singular when there is one', () => {
    expect(verdict(WITH_TIMEOUTS(1), 1).note).toContain('forgave 1 onTaskUpdate transport timeout ')
  })

  it('reads a colourised summary, which is what a real terminal produces', () => {
    const coloured = WITH_TIMEOUTS(2).replace('3391 passed', '[32m3391 passed[39m')
    expect(verdict(coloured, 1).code).toBe(0)
  })
})

describe('what the gate refuses (#265)', () => {
  it('never forgives a failed test, even beside the forgivable error', () => {
    const failing = `
Error: [vitest-worker]: Timeout calling "onTaskUpdate"
 Test Files  1 failed | 116 passed (117)
      Tests  2 failed | 3389 passed (3391)
     Errors  1 error
`
    expect(verdict(failing, 1)).toEqual({ code: 1 })
  })

  /**
   * The one this is really for. Twenty timeouts and one genuine unhandled rejection is a run that
   * must fail, and a gate that merely *detected* the known error would let it through on the
   * strength of the first match. Counting is what makes the difference.
   */
  it('refuses when the errors are not all accounted for', () => {
    const mixed = `
Error: [vitest-worker]: Timeout calling "onTaskUpdate"
Error: Cannot read properties of undefined (reading 'role')
 Test Files  117 passed (117)
      Tests  3391 passed (3391)
     Errors  2 errors
`
    expect(verdict(mixed, 1)).toEqual({ code: 1 })
  })

  it('refuses a different unhandled error on its own', () => {
    const other = `
Error: [vitest-worker]: Timeout calling "fetch"
 Test Files  117 passed (117)
      Tests  3391 passed (3391)
     Errors  1 error
`
    expect(verdict(other, 1)).toEqual({ code: 1 })
  })

  it('refuses a non-zero exit that never produced a summary', () => {
    // A crashed or cancelled run. There is nothing to be confident about, so nothing is forgiven.
    expect(verdict('SIGKILL\n', 1)).toEqual({ code: 1 })
    expect(verdict('', 137)).toEqual({ code: 137 })
  })

  it('refuses a non-zero exit with a clean summary and no declared errors', () => {
    // Exit 1 with nothing to explain it is exactly the state that should reach a person.
    expect(verdict(CLEAN_SUMMARY, 1)).toEqual({ code: 1 })
  })

  it('passes the original exit code through rather than normalising it', () => {
    expect(verdict('Test Files  1 failed\n      Tests  1 failed (1)\n', 130).code).toBe(130)
  })
})
