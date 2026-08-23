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
  },
})
