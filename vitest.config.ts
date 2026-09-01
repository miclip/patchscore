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
     * runner has more and passes the same commit every time. Two cores minus two busy workers
     * leaves nothing for the coordinator.
     *
     * **This laptop has ten cores and reproduces it too, once they are busy** — which is the
     * confirmation rather than a contradiction. This line used to say it never had. Sixteen
     * spinners alongside the suite turns zero errors into fifty-six on the same commit, with every
     * test passing both times. Core count is not the property that matters; a free core for the
     * thread answering the RPC is.
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

    /**
     * **The dot reporter on CI, because the main thread's other job is writing to a pipe.**
     *
     * With one worker, the thread that has to answer `onTaskUpdate` inside 60s is also the one
     * rendering the reporter. The default reporter prints a line per file and per slow test, and
     * on Actions stdout is a pipe whose reader is not always prompt; a blocked write is main-thread
     * time that the RPC deadline is meanwhile spending. Dot output is a fraction of the bytes.
     *
     * Nothing is lost from a failure: `dot` still prints the full diff and stack for every failing
     * test, and the run is deterministic (invariant 6), so a red run can be reproduced locally
     * with the default reporter. What goes is the per-file chatter of a green run.
     */
    /**
     * **The default reporter on CI, because it prints per-test durations and `dot` does not.**
     *
     * `dot` went in on the theory that the main thread was blocking on stdout writes while it also
     * had 60s to answer a worker's `onTaskUpdate`. The errors persisted with it, so it bought
     * nothing — and it cost the one diagnostic that matters for #265, which is which tests run
     * long *on the runner that fails*. Local timings do not transfer: CI takes 598s against ~350s
     * here, and the question is whether anything crosses birpc's 60s deadline under that handicap.
     *
     * Restored deliberately rather than reverted quietly. If output volume ever does turn out to
     * matter, this is the line to change back, and there will be a measurement behind it.
     */
    reporters: ['default'],

    /**
     * **Share the module graph across files, because collection was the thing on the clock.**
     *
     * The red this fixes reported every test passing and exited 1, on a `[vitest-worker]: Timeout
     * calling "onTaskUpdate"`. birpc gives a reply 60 seconds. The number that mattered was in
     * every failing log and took four attempts to look at:
     *
     *     collect 59.85s     first attempt
     *     collect 59.79s     the retry, which failed identically
     *
     * Collection, not tests. It sat a fraction under the deadline on the two-core ubuntu runners
     * and at 26s on a ten-core laptop, which is why this reproduced on one platform and nowhere
     * else, why it was perfectly deterministic rather than flaky, and why splitting long tests and
     * capping workers did nothing for it.
     *
     * With isolation on, every test file re-executes its own copy of the module graph, and 64 of
     * 99 files import the whole generated registry. Sharing it takes collect to 17.8s locally and
     * `prepare` from 1.97s to 0.04s.
     *
     * **What this gives up.** Test files no longer get a fresh module registry, so module-level
     * state is shared between them and file order could matter. Two things make that acceptable
     * here rather than merely convenient: the engine is pure by construction — invariant 6 says
     * the same inputs and seed produce byte-identical output, and there is no mutable module state
     * for a resolve to leak — and `restoreMocks` already resets the mocks that do exist. If a test
     * ever does need isolation, `isolate: true` can be set on that file's own config rather than
     * for all 99.
     */
    isolate: false,

    /**
     * §9/#265. **What this setting used to be, and which of its arguments turned out to be wrong.**
     *
     * It was `CI ? true : false` — an unhandled error did not fail the run — and the case made for
     * it here ran to thirty lines. Most of that case was sound and is not repeated: the error has
     * never once accompanied a failing assertion, and four earlier fixes were each worth keeping
     * on their own terms (unyielded blocks removed, a core kept for the main thread, two over-long
     * sweeps split, the module graph shared, local test CPU 1025s to 350s across them).
     *
     * **Three of its conclusions were wrong, and they are corrected here rather than deleted**,
     * because each was a reasonable reading of the evidence available and the next person will
     * reach for the same ones.
     *
     *  - *"A suite that has outgrown its runner's transport."* Suite size is not the variable. A
     *    deliberate sweep found 999s of test CPU across 460 files on an idle machine producing no
     *    errors at all, while the real suite — a third the size — produces them reliably under
     *    load. A two-core runner with other work on it will do this to a much smaller suite.
     *  - *"Under real memory pressure."* It is CPU contention, not memory. The controlled version:
     *    same commit, same suite, sixteen spinners on a ten-core box, and nothing else changed.
     *    Load ~3-8 gives zero errors; load ~26 gives fifty-six, with all 3401 tests passing both
     *    times.
     *  - *"The real answer is a smaller gate, not a bigger deadline."* Neither. The deadline is
     *    birpc's 60s default and no configuration reaches it — `createThreadsRpcOptions` passes
     *    `{ post, on }` and nothing else, verified in vitest 3.2.7 rather than assumed. The answer
     *    was a mask narrow enough to be honest.
     *
     * **`maxWorkers` above was right all along**, and its reasoning is the one to trust: *"the only
     * lever is to stop starving the thread"*. That is exactly the mechanism, now measured.
     */
    /**
     * #265. **Off, and the mask moved to `scripts/run-tests.ts` where it can be narrow.**
     *
     * This was `CI ? true : false`, which stops *any* unhandled error failing the run. The case
     * for it was that the only one this suite has ever produced is birpc giving up on
     * `onTaskUpdate` — true, and a fact about history rather than a guarantee. A genuine unhandled
     * rejection in `lib/core` would have been swallowed on CI and nowhere else, which is the worst
     * place to lose one.
     *
     * `npm test` now forgives that error by name, only when no test failed, and only when every
     * declared unhandled error is that one. It also announces what it forgave, so the frequency
     * stays visible rather than decaying into silence — and it works locally, where the old mask
     * did not and where the failure has become reproducible under machine load.
     */
    dangerouslyIgnoreUnhandledErrors: false,
  },
})
