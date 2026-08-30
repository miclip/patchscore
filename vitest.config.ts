import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

/**
 * `@/*` is `tsconfig.json`'s path alias, which Next resolves in the app and which Vitest has to
 * be told about separately. One root, declared once: the components under test import through
 * the alias exactly as they do when the page is built, so the test exercises the same module
 * graph rather than a rewritten one.
 */
const root = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: { '@': root },
  },
  test: {
    include: ['lib/**/*.test.ts', 'scripts/**/*.test.ts', 'test/**/*.test.ts'],
    // No passWithNoTests: an empty run must fail, so a broken include glob is loud.
    environment: 'node',
    restoreMocks: true,
    /**
     * **Vitest's default is 5 s, and that is a limit on *scheduling* here rather than on work.**
     *
     * This suite runs exhaustive assignment searches — the worst single case is 223,348 nodes,
     * about seven tenths of a second of solid CPU — across many files at once, and Vitest runs files in
     * parallel workers. A trivial assertion in an unrelated file is then competing for a core
     * with several of those, and on a shared CI runner it can wait longer than five seconds
     * before running at all. `test/intellijel-metropolix.test.ts`'s "contributes zero
     * assignables" is three `toEqual` calls against a frozen manifest and it has timed out; the
     * same commit passed on a rerun, which is the signature of contention rather than of a slow
     * test.
     *
     * The individually expensive tests already set their own timeouts where the work is genuinely
     * theirs — `search-symmetry`'s cap sweep asks for 120 s and says why. This raises the floor
     * for everything else, so a starved trivial test waits instead of failing. It does not hide a
     * slow test: anything that genuinely takes thirty seconds still fails, and the sweep's own
     * limit is unchanged.
     *
     * The alternative of serialising the suite traded a rare flake for a permanently slower gate,
     * and `npm run verify` runs on every commit. See `maxWorkers` below: the flake stopped being
     * rare, and the trade was re-made on measurement.
     */
    testTimeout: 30_000,

    /**
     * **One worker on CI, so the main thread keeps a core.**
     *
     * The failure this fixes is not a slow test and cannot be waited out. A worker reports
     * progress by calling `onTaskUpdate` on the main thread and awaiting the reply; when every
     * core is busy running searches, that reply arrives late, birpc gives up, and the unhandled
     * error takes the run down:
     *
     *     Test Files  99 passed (99)
     *           Tests  2675 passed (2675)
     *     Error: [vitest-worker]: Timeout calling "onTaskUpdate"
     *     Process completed with exit code 1
     *
     * Every assertion passes. There is no failing test to find, no timeout to raise, and vitest
     * exposes no setting for the RPC deadline, so the only lever is to stop starving the thread
     * that has to answer.
     *
     * The split by machine is the evidence. `ubuntu-latest` has two cores and fails; the macOS
     * runner has more and passes the same commit every time; this laptop has ten and has never
     * reproduced it in a full local run. Two cores minus two busy workers leaves nothing for the
     * coordinator.
     *
     * **It costs almost nothing, which is why the earlier trade flips.** Wall time on two cores
     * was already close to total CPU, because CPU is what this suite spends. The comment above
     * called serialising "a permanently slower gate" when the flake was rare; it is now every
     * merge, and the measured price of the cure is small.
     *
     * Left parallel off CI. A ten-core laptop has cores to spare and `npm run verify` should stay
     * quick, so this is one line of divergence rather than a slower gate for everybody.
     */
    maxWorkers: process.env['CI'] ? 1 : undefined,
  },
})
