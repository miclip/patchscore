import type { MetadataRoute } from 'next'

import { SITE_ORIGIN } from '@/lib/studio/site'
import { DEVICES } from '@/lib/devices/registry.generated'
import { RECORD_RIFFS } from '@/lib/riffs'
import { SAMPLE_TARGETS } from '@/lib/samples'
import { TEMPLATES } from '@/lib/templates'
import { kitSession } from '@/lib/studio/kit-session'
import { presetSession } from '@/lib/studio/preset-session'
import { STUDIO_PATH } from '@/lib/studio/entry'
import {
  EXPLORE_PATH,
  deviceHref,
  kitHref,
  presetFigureHref,
  presetsHref,
  riffHref,
  sampleHref,
  templateHref,
} from '@/lib/studio/catalogue'

/**
 * The root, both catalogue indexes, one entry per device, one per direction (#84), the Explore
 * index and everything under it, and both reference pages (#174). All of them
 * are derived, from the registry and from `lib/templates`, so authoring a manifest or a template
 * adds its page here without an edit (invariant 2).
 *
 * What is still absent is every permalinked guide, and that is the rule this file was written to
 * state. #44 settled that a guide is canonical to the studio's own address, because a guide is a
 * generated view of the app rather than an authored page, and there is no upper bound on how many
 * variants exist. Enumerating them would tell a crawler the opposite of what the canonical tag
 * says.
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
    /*
     * §8. The studio, at its own address since `/` became an orientation page. Listed by the same
     * test everything here passes: there is a page at it whose canonical is itself. What is still
     * absent is every permalinked *guide*, for the reason stated above — the bare studio is a
     * page, and a guide is a view of it.
     */
    {
      url: `${SITE_ORIGIN}${STUDIO_PATH}`,
      changeFrequency: 'weekly',
      priority: 0.9,
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
    /*
     * §2.6/#593/§3.7. **Explore, as its own block rather than inside the devices one.** The
     * entries below were nested under `/devices/<id>` until the move, which is where they sat in
     * this file too; they are one section now, and this file says so in the order it lists them.
     *
     * The index first, then one per box that declares its factory patches and what each is for,
     * by the same test everything here passes: there is a page at it whose canonical is itself.
     * `presetSession` is what both routes' `generateStaticParams` enumerate, so a folder that
     * declares its patches appears in all three without an edit, and one that does not is absent
     * from all three.
     */
    {
      url: `${SITE_ORIGIN}${EXPLORE_PATH}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    ...DEVICES.flatMap((device) => {
      const session = presetSession(device)
      if (session === undefined) return []
      return [
        {
          url: `${SITE_ORIGIN}${presetsHref(device)}`,
          changeFrequency: 'monthly' as const,
          priority: 0.5,
        },
        /*
         * §3.7/#598. One per patch with a figure written for it, under the index that lists
         * it, by the same test: there is a page at it whose canonical is itself. The session's
         * entries are what the route's `generateStaticParams` walks too, so a riff whose
         * reference names a declared patch appears in both without an edit, and a patch with no
         * figure is absent from both.
         */
        ...session.entries.flatMap((entry) =>
          entry.figure === undefined
            ? []
            : [
                {
                  url: `${SITE_ORIGIN}${presetFigureHref(device, entry.patch)}`,
                  changeFrequency: 'monthly' as const,
                  priority: 0.6,
                },
              ],
        ),
      ]
    }),
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
     * §5A/#503. The third catalogue, listed by the same test this file states above: there is a
     * page at each of these whose canonical is itself. Derived from `lib/riffs`, so authoring an
     * entry adds its page here without an edit. **The record-named entries** (§5A.7/#598): a
     * patch-named figure's page is under its box, listed above with the presets, and
     * `/riffs/<its id>` is a 404 this file must not name.
     */
    {
      url: `${SITE_ORIGIN}/riffs`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    ...RECORD_RIFFS.map((riff) => ({
      url: `${SITE_ORIGIN}${riffHref(riff)}`,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    /*
     * §3.8/#520. The fourth catalogue, by the same test this file states above: there is a page at
     * each of these whose canonical is itself. Derived from `lib/samples`, so authoring a target
     * adds its page here without an edit.
     */
    {
      url: `${SITE_ORIGIN}/samples`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    ...SAMPLE_TARGETS.map((target) => ({
      url: `${SITE_ORIGIN}${sampleHref(target)}`,
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
    /*
     * Its companion, listed on the same terms and absent until now for no reason anyone recorded.
     * It passed the test stated above from the day it was written — there is a page at it whose
     * canonical is itself — and it was reachable from the nav, so nothing ever went looking for
     * it here. It left the nav, which is what made the omission matter: a page reachable from a
     * footer and a modal and named in no index is a page only a reader who already knows about it
     * can find.
     *
     * `/preferences` stays out, and the distinction is the one this file states. It is a control
     * panel for how the app draws itself, not authored content — there is nothing on it to read.
     */
    {
      url: `${SITE_ORIGIN}/parts`,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
  ]
}
