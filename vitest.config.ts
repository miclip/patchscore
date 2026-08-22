import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['lib/**/*.test.ts', 'scripts/**/*.test.ts', 'test/**/*.test.ts'],
    // No passWithNoTests: an empty run must fail, so a broken include glob is loud.
    environment: 'node',
    restoreMocks: true,
  },
})
