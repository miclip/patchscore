import { Fragment } from 'react'
import { CableMark } from '@/components/cable-mark'
import { ModulationMark } from '@/components/modulation-mark'
import { Value } from '@/components/guide/instruction'
import { hintText } from '@/components/guide/format'
import type {
  BoundArticulation,
  Device,
  PatchEntry,
  ResolvedModulationEnd,
  ResolvedParam,
  Riff,
  RiffVoicing,
} from '@/lib/core'
import { groupedParams, modulationEndParts, num, paramLabel, recipeRouting } from '@/lib/core'
import { riffCitation, riffStack, riffSubstitution, voiceHeading } from '@/lib/studio/riff-text'

/**
 * §5A. **The one voice a rig has for the figure, and everything needed to build it there.**
 *
 * Its own markup, sharing the guide's settled decisions rather than restating them: §10's value
 * treatment is `Value`, #385's module boxes are `groupedParams`, `paramLabel` trims a module's own
 * prefix, `recipeRouting` composes the routing sentence, and a cable is `CableMark` with the
 * arrow shape every patch line in this product uses. A reader arriving from a guide must not have
 * to learn a second convention for the same fact.
 *
 * **The guide's `Instruction` is deliberately not used**, for the reason `kit-parts.tsx` gives:
 * it reserves a hint column that §8.1's toggle controls, and there is no toggle here, so a hint
 * rendered into that column would be invisible. Notes and hints are both printed and both
 * visible — this reader is deciding whether to build the patch at all, and a jog is worth more
 * to them than the line it costs.
 *
 * **Every sentence is `riff-text.ts`'**, shared with the Markdown export (#495).
 */

/** §3.3. The cables inside the box, in the arrow shape every patch line in this product uses. */
function RiffPatch({ entries }: { entries: readonly PatchEntry[] }) {
  return (
    <ul className="patch riff-patch">
      {entries.map((entry) => (
        <li key={`${entry.from}->${entry.to}`}>
          <CableMark />
          <span className="mono">{entry.from}</span>
          <span className="arrow" aria-hidden="true">
            {' → '}
          </span>
          <span className="mono">{entry.to}</span>
          {entry.note === undefined ? null : <p className="subordinate note">{entry.note}</p>}
        </li>
      ))}
    </ul>
  )
}

/**
 * One parameter: the name, the value, and whatever the author wrote under it.
 *
 * §3.2/invariant 4: **no provenance mark and no page beside the value.** The evidence is on every
 * `ResolvedParam` and none of it is rendered here — one sentence for the block, below, is the
 * whole of this page's ink about where the numbers came from.
 */
function RiffParam({ param, device }: { param: ResolvedParam; device: Device }) {
  const hint = param.hint === undefined ? undefined : hintText(device, param.hint)
  const m = param.modulation
  return (
    <li className="riff-param">
      <span className="riff-param-line">
        {/*
          §5A/#511. A routing reads as an assignment on this page too, in the same shape §8 draws
          and beside the same mark — `ModulationMark` here for the reason `CableMark` is already
          here, so a reader arriving from a guide meets one convention rather than two.
        */}
        {m === undefined ? null : (
          <>
            <ModulationMark />
            <span className="param-kind">Modulation — </span>
            <RiffModulationEnd end={m.source} />
            <span className="arrow" aria-hidden="true">
              {' → '}
            </span>
            <RiffModulationEnd end={m.destination} />
            {m.polarity === undefined ? null : (
              <>
                <span className="param-sep" aria-hidden="true">
                  {' · '}
                </span>
                <RiffModulationEnd end={m.polarity} />
              </>
            )}
            <span className="param-sep" aria-hidden="true">
              {' · '}
            </span>
          </>
        )}
        <span className="param-name">{m?.amountControl ?? paramLabel(param)}</span>
        <Value param={param} />
      </span>
      {m === undefined ? null : (
        <p className="subordinate neutral">{`${num(m.neutral)} is no modulation`}</p>
      )}
      {param.note === undefined ? null : <p className="subordinate note">{param.note}</p>}
      {hint === undefined ? null : <p className="riff-hint">{hint}</p>}
    </li>
  )
}

/** #511. One end of a routing: the control to set, and what to set it to. See `ParamLine`'s. */
function RiffModulationEnd({ end }: { end: ResolvedModulationEnd }) {
  const parts = modulationEndParts(end)
  return (
    <>
      {parts.control === undefined ? null : (
        <span className="param-name">{parts.control}</span>
      )}
      <span className="mono">{parts.value}</span>
    </>
  )
}

/**
 * #385's module box. `groupedParams` decides the cut, shared rather than restated, so this page
 * and the guide box the same controls together. A group naming no module renders as bare lines,
 * so a box that names no panel blocks produces a plain list and no empty frames.
 */
function RiffParams({ voice }: { voice: RiffVoicing }) {
  return (
    <>
      {groupedParams(voice.params).map((group, i) => {
        const lines = (
          <ul className="riff-params">
            {group.params.map((param) => (
              <RiffParam key={param.name} param={param} device={voice.device} />
            ))}
          </ul>
        )
        if (group.module === undefined) return <Fragment key={`${String(i)}-`}>{lines}</Fragment>
        return (
          <div className="module-box" key={`${String(i)}-${group.module}`}>
            <p className="module-label">
              <span className="module-led" aria-hidden="true" />
              <span>{group.module}</span>
            </p>
            {lines}
          </div>
        )
      })}
    </>
  )
}

/**
 * §4.3/§7 step 8. What the box says about the slots this grid actually contains.
 *
 * A slot the variant does not strike is dropped by `bindArticulation` and renders nothing — which
 * is the whole reason articulation addresses slots rather than absolute step numbers.
 *
 * `set` holds numbers, strings *and* booleans, so the value is stringified rather than coerced:
 * `Number(value)` on a named mode renders `NaN`, silently and only on the boxes authoring one.
 */
function RiffArticulation({
  entries,
  device,
}: {
  entries: readonly BoundArticulation[]
  device: Device
}) {
  if (entries.length === 0) return null
  return (
    <>
      <h3 className="riff-sub">Articulation</h3>
      <ul className="riff-articulation">
        {entries.map((bound) => (
          <li key={bound.slot}>
            <span className="mono riff-slot-name">{bound.slot}</span>
            <span className="arrow" aria-hidden="true">
              {' → '}
            </span>
            {Object.entries(bound.set).map(([key, value], i) => (
              <Fragment key={key}>
                {i > 0 ? ', ' : null}
                <span className="mono">{key}</span> {typeof value === 'string' ? value : String(value)}
              </Fragment>
            ))}
            <span className="riff-note-fact mono">
              {bound.steps.length === 1 ? 'step' : 'steps'} {bound.steps.map(num).join(', ')}
            </span>
            {bound.hint === undefined ? null : (
              <p className="riff-hint">{hintText(device, bound.hint)}</p>
            )}
          </li>
        ))}
      </ul>
    </>
  )
}

export function RiffVoice({ riff, voice }: { riff: Riff; voice: RiffVoicing }) {
  const substituted = riffSubstitution(riff, voice)
  const routing = recipeRouting(voice.recipe)
  const cites = riffCitation(voice)
  const patch = voice.recipe.patch
  return (
    <>
      <p className="riff-where">
        <span className="riff-box">{voiceHeading(voice)}</span>
        <span className="riff-recipe">{voice.recipe.title}</span>
      </p>
      {substituted === undefined ? null : <p className="riff-substituted">{substituted}</p>}
      {riffStack(voice).map((sentence) => (
        <p className="riff-stack" key={sentence.slice(0, 24)}>
          {sentence}
        </p>
      ))}
      {voice.sourceAudio === undefined ? null : (
        <p className="quiet">Source — {voice.sourceAudio.need}</p>
      )}
      {/*
        §2.1/#32. The note that plays the sound as it is, on a voice addressed by note. It matters
        more here than almost anywhere: the figure above is written in scientific pitch notation
        with middle C at C4 (§4.1) and a great many boxes put middle C somewhere else, so this is
        the bridge between the two. Bare, and §8's wording exactly — `C5` is where the sample plays
        as recorded rather than the only note it answers to. A voice declaring none renders
        nothing, because inventing one would be a claim about the box (invariant 5).
      */}
      {voice.triggerNote === undefined ? null : (
        <p className="riff-trigger">
          <span className="riff-trigger-label">Trigger note</span>
          <span className="mono">{voice.triggerNote.note}</span>
          <span className="riff-note-fact mono">MIDI {num(voice.triggerNote.midi)}</span>
        </p>
      )}
      {routing === undefined ? null : <p className="quiet">Routing — {routing}</p>}
      {patch === undefined || patch.length === 0 ? null : <RiffPatch entries={patch} />}
      {/*
        A recipe with no settings renders no heading and no sentence saying so: an empty block is a
        reader looking for something that is not there, and a line about it would be a line about
        this library rather than about the box in front of them.
      */}
      {voice.params.length === 0 ? null : (
        <>
          <h3 className="riff-sub">Settings</h3>
          <RiffParams voice={voice} />
        </>
      )}
      <RiffArticulation entries={voice.articulation} device={voice.device} />
      {cites === undefined ? null : <p className="riff-cites">{cites}</p>}
    </>
  )
}
