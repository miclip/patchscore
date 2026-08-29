'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { Device, DeviceId, GuideLayout, GuidePhase, ResolveResult, SequencerGroup } from '@/lib/core'
import type { ReactNode } from 'react'
import {
  GUIDE_PHASES,
  LAYOUT_PREAMBLE,
  contentNotice,
  hoistedParams,
  devicesInGroup,
  devicesOutsideGroups,
  narrowToGroup,
  sequencerGroups,
  unplayedHooks,
} from '@/lib/core'
import { browserEnv } from '@/lib/studio/browser-env'
import { DEFAULT_GUIDE_LAYOUT, readGuideLayout } from '@/lib/studio/preferences'
import { templateHref } from '@/lib/studio/catalogue'
import { downloadGuideMarkdown, printGuide } from '@/lib/studio/export'
import { occupiedCounts, voicesLabel } from './format'
import { PhaseFinishing } from './phase-finishing'
import { PhaseHook } from './phase-hook'
import { PhaseRig } from './phase-rig'
import { PhaseSong } from './phase-song'
import { PhaseSound, SoundForPart, SoundShared } from './phase-sound'
import { PhaseSteps } from './phase-steps'
import { PhaseVoices } from './phase-voices'

/**
 * #33. `ResolveResult` rendered as a web page — the sibling of `lib/core/render.ts`, never a
 * conversion of its output. Markdown flattens the three things this view exists to keep: §8.1's
 * reserved hint column, §3.2's provenance rendered visually rather than as text, and #21's
 * tables that scroll inside themselves instead of stretching the page.
 *
 * **The view decides nothing** (§8's rule for its Markdown sibling, and the reason there can be
 * two of them). Every musical choice is already settled in `ResolveResult`, and anything derived
 * from it that is a musical claim rather than a layout choice — §6.3's band trajectory, in
 * `lib/core/arrangement.ts` — is derived once and read by both. What this file decides is ink:
 * what is loud, what is quiet, and what is reserved-but-invisible.
 *
 * Seven phases, always, in §8's order — not "the phases that had content". A guide whose hook
 * section vanishes is indistinguishable from a genre with no hook, so an empty phase says what
 * is missing instead of disappearing (invariant 5). `GUIDE_PHASES` is imported rather than
 * restated: one list, read by the Markdown renderer, this view, and the tests.
 */
/**
 * §8/#230. One box's parts, through §8's three performing phases in §8's order.
 *
 * The order inside here is the one §8 argues for and this layout does not touch: the hook before
 * sound design, so a part is not shaped by whatever preset turned up. What changes is the outer
 * loop, which is now the box you are standing at.
 */
function PerformedHere({
  result,
  deviceById,
  rig,
  hostId,
}: {
  result: ResolveResult
  deviceById: Map<DeviceId, Device>
  /**
   * §8/#240. This section's own boxes, drawn before anything is entered on them.
   *
   * The reader is standing here now, and its clock, sockets, audio out and mixer channel are what
   * they need before a single step goes in. Under the phase layout those were read in section 3
   * and wanted again here, which is the trip this removes.
   */
  rig?: readonly Device[]
  /** The box being stood at, so a part sounding here needs no device name on its heading. */
  hostId?: DeviceId
}) {
  const byDevice = [...new Set(result.assignments.map((a) => a.deviceId))]
  const shared = byDevice
    .map((id) => {
      const device = deviceById.get(id)
      if (device === undefined) return undefined
      const mine = result.assignments.filter((a) => a.deviceId === id)
      return { device, mine, hoist: hoistedParams(mine.map((a) => a.params)) }
    })
    .filter((x): x is { device: Device; mine: typeof result.assignments; hoist: ReturnType<typeof hoistedParams> } => x !== undefined)
  const hoistFor = new Map(shared.map((x) => [x.device.id, x.hoist]))
  return (
    <>
      {rig === undefined || rig.length === 0 ? null : (
        <>
          <h4 className="group-phase">Patching</h4>
          <PhaseRig result={result} occupied={occupiedCounts(result.assignments)} detail={rig} />
        </>
      )}

      {/*
        §8/#107. What every track on this box shares, once, above them all — its citation
        sentence, whether anything is loaded, and the settings #107 hoists because one control
        serves every part. Rendered per track it would repeat once per track, and one of its own
        lines reads "set it once, not once per part".
      */}
      {shared.map(({ device, mine, hoist }) => (
        <div key={device.id}>
          <h4 className="group-phase">
            {shared.length === 1 ? 'Shared settings' : `${device.name} — shared settings`}
          </h4>
          <SoundShared
            device={device}
            content={contentNotice(
              device,
              mine.map((a) => a.recipe),
            )}
            hoist={hoist}
            deviceById={deviceById}
          />
        </div>
      ))}

      {/*
        §8/#230. **One track finished before the next is started**, which is how a session runs.
        The first version of this kept §8's three phases inside the box, so a Deluge section held
        every hook, then every pattern, then every sound — phase-major with a smaller scope, and
        the same jumping about within one machine. The loop is the part.
      */}
      {result.assignments.map((a) => {
        const one = narrowToGroup(result, [a])
        const hoist = hoistFor.get(a.deviceId)
        return (
          <div className="group-part" key={a.requestId}>
            <h4 className="group-phase">
              {hostId !== undefined && a.deviceId === hostId
                ? voicesLabel(a)
                : `${a.deviceName} · ${voicesLabel(a)}`}
              <span className="role mono"> {a.role}</span>
            </h4>
            {one.song.hooks.length === 0 ? null : (
              <>
                <h5 className="group-sub">Hook</h5>
                <PhaseHook result={one} />
              </>
            )}
            <h5 className="group-sub">Step programming</h5>
            <PhaseSteps result={one} deviceById={deviceById} />
            {hoist === undefined ? null : (
              <>
                <h5 className="group-sub">Sound design</h5>
                <SoundForPart a={a} hoist={hoist} deviceById={deviceById} />
              </>
            )}
          </div>
        )
      })}
      {/*
        Omitted rather than answered when this box carries no hook. `PhaseHook`'s empty state is a
        sentence about the *template*, and under a narrowed result it would appear beneath a drum
        machine in a direction with three hooks — true of a template, false of a box. The hooks
        are not hidden: they are under whichever box plays them, or in their own section when no
        box does (invariant 5).
      */}
    </>
  )
}

export function Guide({
  result,
  seed,
  layout: fixedLayout,
}: {
  result: ResolveResult
  seed: number
  /**
   * §8/#230. Pins the layout, ignoring both the stored preference and the control.
   *
   * The studio passes nothing and lets the reader decide. This exists for a caller that needs a
   * particular layout regardless of whose browser it is — and for the fixtures, which have to be
   * able to assert §8's phase rendering after `DEFAULT_GUIDE_LAYOUT` became `'sequencer'`.
   */
  layout?: GuideLayout
}) {
  /** §8.1: on by default, off once you know your boxes. Print ignores it (see `@media print`). */
  const [hints, setHints] = useState(true)
  /**
   * §8/#230. **A per-visit override, not a setting.**
   *
   * It opens at whatever the Preferences page stored and changes only what is on screen now —
   * switching here writes nothing back. Trying the other layout on one guide is something a
   * reader does mid-session to compare two sections, and having that silently become their
   * default would mean the setting drifts every time they look.
   *
   * "How I read guides" is a preference and lives on `/preferences`. "How I want to read this
   * one" is this control. The second is not a smaller version of the first.
   *
   * `DEFAULT_GUIDE_LAYOUT` on the first render, always: the server cannot know what this browser
   * stored, so reading it during render would mismatch hydration — the rule the export handlers
   * below already follow (#12). The stored default arrives in an effect instead.
   */
  const [chosen, setLayout] = useState<GuideLayout>(DEFAULT_GUIDE_LAYOUT)
  useEffect(() => {
    if (fixedLayout !== undefined) return
    setLayout(readGuideLayout(() => window.localStorage))
  }, [fixedLayout])
  const layout = fixedLayout ?? chosen
  const [exported, setExported] = useState<{ ok: boolean; message: string } | undefined>(undefined)

  const deviceById = useMemo<Map<DeviceId, Device>>(
    () => new Map(result.devices.map((d) => [d.id, d])),
    [result],
  )
  const occupied = useMemo(() => occupiedCounts(result.assignments), [result])
  const groups = useMemo(() => sequencerGroups(result), [result])
  const orphanHooks = useMemo(() => unplayedHooks(result), [result])
  const uncovered = useMemo(() => devicesOutsideGroups(result), [result])
  const byId = useMemo(() => new Map(result.devices.map((d) => [d.id, d])), [result])
  const rigFor = (group: SequencerGroup): Device[] =>
    devicesInGroup(group)
      .map((id) => byId.get(id))
      .filter((d): d is Device => d !== undefined)

  /*
   * Keyed by phase name rather than by position. An array aligned to `GUIDE_PHASES` by index
   * renders a blank section if the two ever drift; `Record<GuidePhase, ReactNode>` makes a
   * missing phase — or a renamed one — a type error instead.
   */
  const bodies: Record<GuidePhase, ReactNode> = {
    Song: <PhaseSong result={result} />,
    'Voice assignment': <PhaseVoices result={result} deviceById={deviceById} />,
    'Rig integration': <PhaseRig result={result} occupied={occupied} />,
    Hook: <PhaseHook result={result} />,
    'Step programming': <PhaseSteps result={result} deviceById={deviceById} />,
    'Sound design': <PhaseSound result={result} deviceById={deviceById} />,
    Finishing: <PhaseFinishing result={result} />,
  }

  /**
   * §8/#230. The sections to draw, in order — the one place the two layouts differ.
   *
   * Both are built from the same `bodies` and the same phase components; `sequencer` only changes
   * which of them are grouped and under what heading. Nothing below this line knows which layout
   * it is drawing, which is what keeps the header, the legend, print and export identical.
   */
  const sections: { key: string; title: string; body: ReactNode }[] =
    layout === 'phase'
      ? GUIDE_PHASES.map((phase) => ({ key: phase, title: phase, body: bodies[phase] }))
      : [
          { key: 'Song', title: 'Song', body: bodies.Song },
          {
            key: 'Voice assignment',
            title: 'Voice assignment',
            body: bodies['Voice assignment'],
          },
          {
            key: 'Rig integration',
            title: 'Rig integration',
            /**
             * §8/#240. Rig-wide facts, plus a block for every box no section below covers — a
             * mixer, an fx-processor, anything carrying no parts (§2.4). `devicesOutsideGroups`
             * is what stops the two halves overlapping or leaving a box out entirely.
             */
            body: <PhaseRig result={result} occupied={occupied} detail={uncovered} />,
          },
          ...(groups.length > 0
            ? []
            : [
                {
                  key: 'nothing-assigned',
                  title: 'Step programming and Sound design',
                  // Invariant 5. With no groups these two phases have nothing to build from and
                  // would simply be absent — a vanished section reads as a direction that never
                  // asked for one. See `LAYOUT_PREAMBLE.nothingAssigned`.
                  body: <p className="quiet">{LAYOUT_PREAMBLE.nothingAssigned.join(' ')}</p>,
                },
              ]),
          ...groups.map((group) => ({
            key: group.kind === 'sequencer' ? `group-${group.deviceId}` : 'group-undriven',
            title:
              group.kind === 'undriven'
                ? 'Nothing in this rig can drive these'
                : group.drivesOnly
                  ? `${group.deviceName} — drives these, sounds none of them`
                  : group.deviceName,
            body: (
              <>
                {group.kind === 'undriven' ? (
                  <p className="quiet">{LAYOUT_PREAMBLE.undriven.join(' ')}</p>
                ) : null}
                <PerformedHere
                  result={narrowToGroup(result, group.assignments)}
                  deviceById={deviceById}
                  rig={rigFor(group)}
                  hostId={group.kind === 'sequencer' ? group.deviceId : undefined}
                />
              </>
            ),
          })),
          ...(orphanHooks.length === 0
            ? []
            : [
                {
                  key: 'orphan-hooks',
                  title: 'Hooks with nothing to play them',
                  body: (
                    <>
                      <p className="quiet">{LAYOUT_PREAMBLE.orphanHooks.join(' ')}</p>
                      <PhaseHook
                        result={{
                          ...result,
                          assignments: [],
                          song: { ...result.song, hooks: orphanHooks },
                        }}
                      />
                    </>
                  ),
                },
              ]),
          { key: 'Finishing', title: 'Finishing', body: bodies.Finishing },
        ]

  /*
   * Both handlers build the environment inside the handler, never during render (#12). Nothing
   * in this component reads `window` while React is rendering it, which is what keeps the
   * server's markup and the client's first markup the same bytes.
   */
  function onDownload() {
    const outcome = downloadGuideMarkdown(browserEnv(), result, seed, layout)
    setExported(
      outcome.ok
        ? { ok: true, message: `Saved ${outcome.name}` }
        : { ok: false, message: outcome.message },
    )
  }

  function onPrint() {
    const outcome = printGuide(browserEnv())
    // Success says nothing: the print dialog is its own feedback, and a toast underneath a modal
    // is a toast nobody sees. Only failure is worth a line.
    setExported(outcome.ok ? undefined : { ok: false, message: outcome.message })
  }

  return (
    <article className="guide" data-hints={hints ? 'on' : 'off'}>
      <header className="guide-head">
        {/*
          #112. The guide names the direction on every phase and, until now, never linked to the
          page describing it. `result.template` is the *effective* template — inspirations
          applied — and §5 composes that from the base with `...template`, so the id and the name
          are the authored ones and this href always names a page that exists.
        */}
        <h2>
          <Link href={templateHref(result.template)}>{result.template.name}</Link>
        </h2>
        <div className="guide-actions">
          <label className="hints-toggle">
            <input
              type="checkbox"
              checked={hints}
              onChange={(event) => setHints(event.target.checked)}
            />
            Show hints
          </label>
          {/*
            §8/#230. A named control rather than a checkbox, because neither option is the
            negation of the other — "not by phase" does not tell a reader what they would get.

            This one is not remembered. The default lives on `/preferences`; changing it here
            changes this guide and nothing else.
          */}
          <label className="layout-toggle">
            Read
            <select
              value={layout}
              onChange={(event) => setLayout(event.target.value as GuideLayout)}
            >
              <option value="phase">by phase</option>
              <option value="sequencer">by sequencer</option>
            </select>
          </label>
          <button type="button" className="link-button" onClick={onDownload}>
            Download Markdown
          </button>
          <button type="button" className="link-button" onClick={onPrint}>
            Print / Save PDF
          </button>
        </div>
      </header>

      {exported === undefined ? null : (
        <p className={exported.ok ? 'export-ok' : 'export-failed'} role="status">
          {exported.message}
        </p>
      )}

      {/*
        The reading convention, stated once, and it is what makes an unmarked value legible:
        the convention has to live somewhere, and once at the top is cheaper than a badge on
        every line. Said in the voice of something that knows what it is talking about — no
        apology, no warning, and nothing telling the reader to distrust the page.
      */}
      <p className="legend">
        Values are starting points — dial them to taste. Where a number came straight off the
        manual or off a unit it says which (
        <span className="prov prov-cited">manual</span>), and where a mood knob moved it you see
        the move — <span className="mono">52 → 45</span> — and{' '}
        <span className="prov prov-moved">the knob that did it</span>. Every value carries its
        range, <span className="mono">38 (0…100)</span>, so you can tell at a glance whether the
        screen in front of you is the one the line is about.
      </p>

      {sections.map((section, i) => (
        <section className="phase" key={section.key} aria-labelledby={`phase-${i + 1}`}>
          <h3 id={`phase-${i + 1}`}>
            <span className="phase-number mono">{i + 1}</span>
            {section.title}
          </h3>
          {section.body}
        </section>
      ))}
    </article>
  )
}
