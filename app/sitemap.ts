import type { MetadataRoute } from 'next'

import { SITE_ORIGIN } from '@/lib/studio/site'
import { DEVICES } from '@/lib/devices/registry.generated'
import { TEMPLATES } from '@/lib/templates'
import { kitSession } from '@/lib/studio/kit-session'
import { deviceHref, kitHref, templateHref } from '@/lib/studio/catalogue'

/**
 * The root, both catalogue indexes, one entry per device, one per direction (#84), and #174's
 * drum-machine reference. All of them
 * are derived, from the registry and from `lib/templates`, so authoring a manifest or a template
 * adds its page here without an edit (invariant 2).
 *
 * What is still absent is every permalinked guide, and that is the rule this file was written to
 * state. #44 settled that a guide is `canonical: '/'`, because a guide is a generated view of the
 * app rather than an authored page, and there is no upper bound on how many variants exist.
 * Enumerating them would tell a crawler the opposite of what the canonical tag says.
 *
 * A catalogue page is the other thing: authored content at its own address, with its own
 * canonical pointing at itself. So the test to apply to a new entry here is not "is it a URL that
 * works" but "is there a page at it whose canonical is itself". If this file ever grows a loop
 * over rigs or seeds, that is the mistake.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_ORIGIN,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${SITE_ORIGIN}/devices`,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    ...DEVICES.map((device) => ({
      url: `${SITE_ORIGIN}${deviceHref(device)}`,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    /*
     * §3.7/#478. One per box that offers a kit, and none for the rest — the same test this file
     * states above: there is a page at it whose canonical is itself. `kitSession` is what
     * `generateStaticParams` enumerates too, so a box that authors a fourth kit sound appears in
     * both without an edit, and one that does not is absent from both.
     */
    ...DEVICES.flatMap((device) =>
      kitSession(device) === undefined
        ? []
        : [
            {
              url: `${SITE_ORIGIN}${kitHref(device)}`,
              changeFrequency: 'monthly' as const,
              priority: 0.5,
            },
          ],
    ),
    {
      url: `${SITE_ORIGIN}/directions`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    ...TEMPLATES.map((template) => ({
      url: `${SITE_ORIGIN}${templateHref(template)}`,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    /*
     * #174. Listed for the reason stated above: there is a page at it whose canonical is itself.
     * Hand-written rather than derived, because it is one authored page about sounds and there is
     * no list in the repo to loop over — nothing about it turns on the registry.
     */
    {
      url: `${SITE_ORIGIN}/drum-machines`,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
  ]
}
