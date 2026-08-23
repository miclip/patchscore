import type { MetadataRoute } from 'next'

import { SITE_ORIGIN } from '@/lib/studio/site'

/**
 * One URL, and that is not an oversight.
 *
 * #44 settled that a permalinked guide is `canonical: '/'` — a guide is a view of the app rather
 * than a page of its own, because the guides are generated from inputs rather than authored.
 * Enumerating permalink variants here would tell a crawler the opposite of what the canonical tag
 * says about the same page, and there is no upper bound on how many variants exist.
 *
 * So: the root, and nothing else. If this file ever grows a loop over rigs or templates, that is
 * the mistake, not the fix.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_ORIGIN,
      changeFrequency: 'weekly',
      priority: 1,
    },
  ]
}
