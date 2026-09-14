'use client'

import { VoiceBuild } from '@/components/riff/riff-voice'
import { DEVICES } from '@/lib/devices/registry.generated'
import { presetSession } from '@/lib/studio/preset-session'
import { presetBoxHeading, presetByHand } from '@/lib/studio/preset-text'
import { voiceHeading } from '@/lib/studio/riff-text'

/**
 * §3.7/#598. **The box's block on a preset figure page: which voice, which recipe, and
 * everything needed to build it there.**
 *
 * **A client island, for the build's reason and not the reader's.** `VoiceBuild` draws the
 * settings through `resolved-body.tsx`, whose `Value` reaches `components/guide/nav.ts`, and
 * that uses `createContext`, which a React Server Component may not import (`patch-list.tsx`
 * records the same trap). The riff page and the sample page both render this block inside
 * their rig islands and never hit it; this page has no rig island, so the block gets one of its
 * own. Nothing here is interactive, nothing reads storage, and there is no picker: the boundary
 * exists so the page builds, and `npm run build` rather than the suite is what proves it, since
 * `renderToStaticMarkup` has no server/client boundary in it.
 *
 * **Ids in, on `RiffRig`'s pattern.** A `RiffVoicing` carries the whole `Device`, and a prop
 * to a client component is serialised into the page; the box's id and the patch's slug are
 * two strings, and `presetSession` is pure, so the client derives the same figure the server
 * did and the payload stays the size of the address. The server has already 404'd on anything
 * that would not resolve, and thrown on a figure the box cannot play (#598), so the `null`
 * branches below are unreachable rather than gaps.
 */
export function PresetVoice({ deviceId, patch }: { deviceId: string; patch: string }) {
  const device = DEVICES.find((d) => d.id === deviceId)
  const session = device === undefined ? undefined : presetSession(device)
  const entry = session?.entries.find((e) => e.slug === patch)
  const figure = entry?.figure
  if (entry === undefined || figure === undefined) return null
  const { voice } = figure
  return (
    <section className="panel riff-panel riff-where-panel">
      <header>
        <h2>{presetBoxHeading(voice.device)}</h2>
      </header>
      <p className="riff-where">
        <span className="riff-box">{voiceHeading(voice)}</span>
        <span className="riff-recipe">{voice.recipe.title}</span>
      </p>
      <VoiceBuild
        voice={voice}
        patchLine={figure.byHand ? <p className="quiet">{presetByHand(entry.patch)}</p> : null}
      />
    </section>
  )
}
