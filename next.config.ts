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

  /**
   * §2.6/§3.7. **The Explore move, paid for in two rules.**
   *
   * The preset session and its figures were addressed under the device they belong to while they
   * were a view of a device page. They are a section now, at `/explore`, and these carry the old
   * addresses across — 51 of them today, which is the number of *pages* affected and not the
   * number of rules, because a dynamic segment covers the whole shape.
   *
   * `permanent`, so an index that has the old address replaces it rather than keeping both. The
   * pair is ordered longest-first because the two-segment shape must not be caught by the rule
   * for the one-segment one.
   *
   * These stay. A redirect is cheap and an address somebody saved is not ours to break, so
   * nothing here has an expiry — the cost of keeping them is two lines, and the cost of dropping
   * them lands on a reader who bookmarked a figure.
   */
  async redirects() {
    return [
      {
        source: '/devices/:id/presets/:patch',
        destination: '/explore/:id/:patch',
        permanent: true,
      },
      {
        source: '/devices/:id/presets',
        destination: '/explore/:id',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
