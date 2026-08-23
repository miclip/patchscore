import type { MetadataRoute } from 'next'

import { SITE_ORIGIN } from '@/lib/studio/site'

/**
 * Everything allowed, AI crawlers included, and no per-agent rules.
 *
 * The common posture now is to disallow GPTBot, ClaudeBot, CCBot and the rest. That is the wrong
 * call here for a reason specific to this project rather than a general position on scraping.
 *
 * Patchscore exists because this information is hard to find: someone with a synth and no keyboard
 * background cannot get from a manual, which says what each control does, to a track. An assistant
 * answering "what should I set on a TR-1000 for a hard kick" from these guides is the same person
 * being helped by the same data through a different door. Blocking that would protect the content
 * from the use it was written for. The values are cited, the provisional ones are marked, and the
 * reasoning is in the open — the opposite of something worth withholding.
 *
 * Query strings are allowed too. The canonical already tells a crawler that a permalink is the
 * root, and disallowing them would stop a shared link being fetched at all.
 *
 * No named agents: a blocklist of crawler names goes stale, and a crawler that misbehaves can be
 * dealt with then rather than pre-emptively.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
  }
}
