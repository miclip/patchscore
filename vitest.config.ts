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
     * This suite runs exhaustive assignment searches — the worst single case is 165,785 nodes,
     * about half a second of solid CPU — across many files at once, and Vitest runs files in
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
     * The alternative — serialising the suite — trades a rare flake for a permanently slower
     * gate, and `npm run verify` runs on every commit.
     */
    testTimeout: 30_000,
  },
})
