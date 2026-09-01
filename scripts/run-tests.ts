/**
 * §9/#265. `vitest run`, with **one** failure forgiven and every other one passed through.
 *
 * ## What this replaces, and why the replacement is narrower
 *
 * `vitest.config.ts` carried `dangerouslyIgnoreUnhandledErrors: CI ? true : false`, which stops an
 * unhandled error failing the run — *any* unhandled error. The case made for it was that the only
 * one this suite has ever produced is birpc giving up on `onTaskUpdate`, and that was true. It is
 * a fact about history rather than a guarantee about the next commit: a genuine unhandled rejection
 * in `lib/core` would have been swallowed on CI and nowhere else, which is the worst place to lose
 * one.
 *
 * This forgives that error **by name**, and only when the run is otherwise clean. Anything else —
 * a failed assertion, a different unhandled rejection, a non-zero exit with no summary at all —
 * exits with the code vitest gave it.
 *
 * ## Why the error is forgivable at all
 *
 * It is a **reporter transport** failure, not a test result. A worker calls `onTaskUpdate` on the
 * main thread; birpc arms a 60s timer at call time; the rejection is collected and reported after
 * every file has already passed. Nothing about the tests is in doubt when it fires — the summary
 * says so on the same screen.
 *
 * Measured, over a day of trying to reproduce it deliberately:
 *
 *  - **A 70-second unyielded block in a worker does not cause it.** So it is not simply a worker
 *    too busy to answer.
 *  - **999 seconds of synthetic test CPU across 460 files does not cause it** — four times the real
 *    suite, generated as shim copies. So it is not total load either.
 *  - **The real suite under machine load average 12 causes it every time**, and the same suite on
 *    an idle machine does not.
 *
 * That points at the *main thread* being starved rather than the worker being busy, which is also
 * why it was first seen only on two-core CI runners, where the reporter and one worker share two
 * cores. `pool: 'forks'` does not avoid it — measured, and it produced more of them, not fewer.
 *
 * ## Why it is not fixable here
 *
 * The 60s deadline is birpc's default and vitest does not thread a timeout through: read
 * `createThreadsRpcOptions` in `vitest/dist/chunks/utils.*.js`, which returns `{ post, on }` and
 * nothing else, and `createRuntimeRpc` in `chunks/rpc.*.js`, which would honour a `timeout` if one
 * were passed. So there is no configuration that raises it. Verified against vitest 3.2.7 rather
 * than taken from the issue.
 *
 * **This is a mitigation and #265 stays open.** The forgiveness is announced on every run that uses
 * it, so the frequency stays visible instead of decaying into silence.
 */
import { spawn } from 'node:child_process'

/** The one error this script forgives. Matched in full: a substring would be too generous. */
const FORGIVEN = '[vitest-worker]: Timeout calling "onTaskUpdate"'

/** `Tests  3391 passed (3391)` — the summary line, which says whether anything actually failed. */
const TESTS_LINE = /^\s*Tests\s+(.*)$/m

/** `Errors  9 errors` — how many unhandled errors vitest is reporting. */
const ERRORS_LINE = /^\s*Errors\s+(\d+) error/m

export function verdict(output: string, code: number): { code: number; note?: string } {
  if (code === 0) return { code: 0 }

  // Strip SGR sequences, or a colourised summary never matches.
  const plain = output.replace(/\[[0-9;]*m/g, '')

  // A failed assertion is never forgiven, whatever else is in the output. No summary at all means
  // the run did not get far enough to have one, which is also not forgivable.
  const summary = TESTS_LINE.exec(plain)?.[1] ?? ''
  if (summary === '' || /failed/.test(summary)) return { code }

  /**
   * Every unhandled error must be the one we know about.
   *
   * Counted rather than merely detected: a second kind of error hiding among twenty of these would
   * otherwise ride through on the strength of the first one matching.
   */
  const declared = Number(ERRORS_LINE.exec(plain)?.[1] ?? '0')
  if (declared === 0) return { code }
  const matched = plain.split(FORGIVEN).length - 1
  if (matched < declared) return { code }

  return {
    code: 0,
    note:
      `#265: forgave ${String(declared)} onTaskUpdate transport timeout` +
      `${declared === 1 ? '' : 's'} on a run where ${summary.trim()} — ` +
      `see scripts/run-tests.ts. Any other failure would have exited ${String(code)}.`,
  }
}

function main(): void {
  const args = process.argv.slice(2)
  /**
   * Forwarded live **and** captured, rather than captured and echoed at the end.
   *
   * The verdict needs the summary, so the output has to be read — but a CI step that prints
   * nothing for two minutes reads as hung, and #288 deliberately put the per-test timings back on
   * CI because #265 needed them. Buffering would have thrown that away to save a few lines here.
   */
  const child = spawn('./node_modules/.bin/vitest', ['run', ...args], {
    stdio: ['inherit', 'pipe', 'pipe'],
  })

  let output = ''
  child.stdout?.on('data', (chunk: Buffer) => {
    output += chunk.toString()
    process.stdout.write(chunk)
  })
  child.stderr?.on('data', (chunk: Buffer) => {
    output += chunk.toString()
    process.stderr.write(chunk)
  })

  child.on('error', (error) => {
    process.stderr.write(`\n${String(error)}\n`)
    process.exit(1)
  })

  child.on('close', (status, signal) => {
    // A signal is not a test result. `?? 1` rather than treating it as clean, since a killed run
    // has told us nothing about the suite.
    const code = status ?? 1
    const { code: verdictCode, note } = verdict(output, code)
    if (note !== undefined) {
      // `::warning::` so a GitHub run surfaces it in the job summary rather than only in the log.
      process.stdout.write(`\n::warning::${note}\n`)
    }
    if (signal !== null && status === null) process.exit(1)
    process.exit(verdictCode)
  })
}

const invokedDirectly = process.argv[1]?.endsWith('run-tests.ts') === true
if (invokedDirectly) main()
