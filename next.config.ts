import type { NextConfig } from 'next'

/**
 * Deliberately almost empty. §9's build story is the registry codegen (`prebuild`), not
 * bundler configuration — `lib/devices/*` is reached through static imports in
 * `registry.generated.ts`, so nothing here needs to know that devices exist.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  /**
   * `next dev` otherwise appends a generated block to CLAUDE.md on every run. CLAUDE.md is
   * hand-authored here and says so; a file that a dev server rewrites is a file nobody can
   * trust to still say what its author wrote. Invariant 2's rule about generated files being
   * machine-written and never hand-edited cuts the other way too.
   */
  agentRules: false,
}

export default nextConfig
