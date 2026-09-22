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
      /**
       * §8. **Legacy permalinks to the studio**, from when the studio was the front door.
       *
       * `/` is an orientation page now and must serve as one, so this cannot key on the path: it
       * keys on the query, which is the thing that distinguishes a shared guide from somebody
       * typing the domain. Next ANDs the entries inside one `has`, so three rules are three
       * alternatives rather than a conjunction, and the query string is carried to the
       * destination automatically.
       *
       * `format` is written first on every link `encodeGuideInputs` produces, so it alone covers
       * every permalink this app has ever emitted. `device` and `template` are there for a
       * hand-edited one that dropped it — `encodeGuideInputs` never omits `format`, but a reader
       * trimming a URL in an address bar does not know that.
       *
       * A `/` carrying none of the three falls through to the orientation page, which is right:
       * `studioEntry` would have served the defaults for such a query anyway, so there is no
       * guide being lost, only a query nobody can read.
       *
       * Middleware would catch any non-empty query in one rule. It is not worth an edge runtime
       * in front of an otherwise static site to cover the case these three do not.
       *
       * **The addresses below are literals and have to be**, which is the one place on this site
       * where a path is spelt twice on purpose. Next transpiles this file on its own, outside the
       * app's module graph and without the `@/` alias, so importing `STUDIO_PATH` from
       * `lib/studio/entry` type-checks, passes every test and then fails the build with
       * `Cannot find module './lib/core'`. `test/redirects.test.ts` holds these strings against
       * the constants instead, which is the guard an import would have been.
       */
      {
        source: '/',
        has: [{ type: 'query' as const, key: 'format' }],
        destination: '/studio',
        permanent: true,
      },
      {
        source: '/',
        has: [{ type: 'query' as const, key: 'device' }],
        destination: '/studio',
        permanent: true,
      },
      {
        source: '/',
        has: [{ type: 'query' as const, key: 'template' }],
        destination: '/studio',
        permanent: true,
      },
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
