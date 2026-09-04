'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  Device,
  DeviceId,
  GuideLayout,
  GuidePhase,
  RequestId,
  ResolveResult,
  SequencerGroup,
} from '@/lib/core'
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
import { DEFAULT_GUIDE_LAYOUT, GUIDE_LAYOUT_KEY, readGuideLayout } from '@/lib/studio/preferences'
import { templateHref } from '@/lib/studio/catalogue'
import { downloadGuideMarkdown, printGuide } from '@/lib/studio/export'
import { occupiedCounts, voicesLabel } from './format'
import { GuideNavContext, currentSection, phaseAnchor } from './nav'
import type { GuideNav, GuideSection } from './nav'
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
 * §8/#341. The DOM id of one part's Hook or Sound design heading under the sequencer layout.
 *
 * Keyed on the **request** id rather than the role, for the reason `Occupancy` is: a template may
 * request the same role twice, and two headings sharing an id is a link that lands on whichever
 * the browser saw first.
 */
function partAnchor(requestId: RequestId, phase: 'hook' | 'sound'): string {
  return `part-${requestId}-${phase}`
}

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
        /*
         * §8/#341. The two headings a cross-phase pointer aims at, named per part rather than
         * per phase, because under this layout there is one of each *per box*. `#phase-6` is
         * meaningless here — there is no Sound design section to land on — and before #341 it
         * resolved to whichever section happened to be sixth, which was a box.
         *
         * Both are on the page and a scroll away, which is what a pointer is for. Nothing here
         * has to be opened before it can be landed on.
         */
        const nav: GuideNav = {
          hook: one.song.hooks.length === 0 ? undefined : partAnchor(a.requestId, 'hook'),
          sound: hoist === undefined ? undefined : partAnchor(a.requestId, 'sound'),
        }
        return (
          <GuideNavContext.Provider value={nav} key={a.requestId}>
            <div className="group-part">
              <h4 className="group-phase">
                {hostId !== undefined && a.deviceId === hostId
                  ? voicesLabel(a)
                  : `${a.deviceName} · ${voicesLabel(a)}`}
                <span className="role mono"> {a.role}</span>
              </h4>
              {one.song.hooks.length === 0 ? null : (
                <>
                  <h5 className="group-sub" id={partAnchor(a.requestId, 'hook')}>
                    Hook
                  </h5>
                  <PhaseHook result={one} />
                </>
              )}
              <h5 className="group-sub">Step programming</h5>
              <PhaseSteps result={one} deviceById={deviceById} />
              {hoist === undefined ? null : (
                <>
                  <h5 className="group-sub" id={partAnchor(a.requestId, 'sound')}>
                    Sound design
                  </h5>
                  <SoundForPart a={a} hoist={hoist} deviceById={deviceById} />
                </>
              )}
            </div>
          </GuideNavContext.Provider>
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

/**
 * §8/#341. One section of the guide, and there is one kind of them.
 *
 * It briefly had a second: a `tabpanel` with `data-active`, drawn when the sequencer layout put
 * its boxes in a tab strip. The strip is gone (see `nav.ts` for why it lost) and with it the only
 * reason this component ever had a mode. Every section is on the page, labelled by its own
 * visible heading, in both layouts.
 *
 * The heading is visible again for the same reason it went `sr-only` in the first place: under
 * tabs the selected tab read `4 TRACKER MINI` and this printed it a line below, so one of the two
 * had to go. Nothing else is naming the section now, and this is the only label there is.
 */
function Panel({ section }: { section: GuideSection & { n: number } }) {
  return (
    <section className="phase" aria-labelledby={section.anchorId}>
      <h3 id={section.anchorId}>
        <span className="phase-number mono">{section.n}</span>
        {section.title}
      </h3>
      {section.body}
    </section>
  )
}

export function Guide({
  result,
  seed,
  layout: fixedLayout,
  onPlacement,
}: {
  result: ResolveResult
  seed: number
  /**
   * §7.5/#340 phase 2. Passed through to the voice assignment phase, which is where a part is
   * named on a box and therefore where moving it belongs. Absent for a caller with no session
   * behind it, and then no control is drawn.
   */
  onPlacement?: ((requestId: RequestId, deviceId: DeviceId | undefined) => void) | undefined
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
    const read = () => setLayout(readGuideLayout(() => window.localStorage))
    read()

    /**
     * §8/#230. **Reading it once on mount is not enough, and a phone is where that shows.**
     *
     * Reported as "the default open guides thing isn't applying". Both obvious flows work — a
     * fresh load, and an in-app navigation from /preferences — because each mounts this component
     * and runs the effect. Two do not:
     *
     *  - **Back-forward cache.** Safari restores a page with its DOM and JS state intact and does
     *    not remount anything, so changing the preference and tapping *back* to the studio shows
     *    the render from before the change. iOS does this aggressively, which is why it was
     *    reported from a phone and not from a desktop.
     *  - **A second tab.** The preference is per-browser, so a studio tab open beside the
     *    preferences page should follow it, and without a listener it never learns.
     *
     * `pageshow` with `persisted` is the bfcache signal — a normal load fires it too, with
     * `persisted` false, which `read()` above has already handled. `storage` fires only in *other*
     * tabs, which is exactly the case that needs it. A `null` key means the storage was cleared.
     */
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) read()
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key === GUIDE_LAYOUT_KEY || event.key === null) read()
    }
    window.addEventListener('pageshow', onShow)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('pageshow', onShow)
      window.removeEventListener('storage', onStorage)
    }
  }, [fixedLayout])
  const layout = fixedLayout ?? chosen
  const [exported, setExported] = useState<{ ok: boolean; message: string } | undefined>(undefined)

  /**
   * §8/#341. **Where the reader is, for the jump-nav to mark.**
   *
   * `undefined` until something has been measured or pressed, and read through `currentSection`'s
   * own rule below — the first section. That is not a placeholder: a reader at the top of the
   * guide *is* in Song, and it is also the only value the server can know, so the first client
   * render matches its markup without measuring anything (#12).
   *
   * View state, and it stays view state: §8.2 puts inputs in the permalink and nothing else, and
   * where somebody had scrolled to ninety seconds ago is not a fact about how they read guides.
   */
  const [reading, setReading] = useState<string | undefined>(undefined)
  const jumpRef = useRef<HTMLElement | null>(null)
  const jumpLinks = useRef(new Map<string, HTMLAnchorElement>())

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
    'Voice assignment': (
      <PhaseVoices result={result} deviceById={deviceById} onPlacement={onPlacement} />
    ),
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
  const sections: GuideSection[] =
    layout === 'phase'
      ? GUIDE_PHASES.map((phase) => ({
          key: phase,
          title: phase,
          anchorId: phaseAnchor(phase),
          body: bodies[phase],
        }))
      : [
          {
            key: 'Song',
            title: 'Song',
            anchorId: phaseAnchor('Song'),
            body: bodies.Song,
          },
          {
            key: 'Voice assignment',
            title: 'Voice assignment',
            anchorId: phaseAnchor('Voice assignment'),
            body: bodies['Voice assignment'],
          },
          {
            key: 'Rig integration',
            title: 'Rig integration',
            anchorId: phaseAnchor('Rig integration'),
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
                  anchorId: 'section-nothing-assigned',
                  // Invariant 5. With no groups these two phases have nothing to build from and
                  // would simply be absent — a vanished section reads as a direction that never
                  // asked for one. See `LAYOUT_PREAMBLE.nothingAssigned`.
                  body: <p className="quiet">{LAYOUT_PREAMBLE.nothingAssigned.join(' ')}</p>,
                },
              ]),
          ...groups.map((group) => {
            const key = group.kind === 'sequencer' ? `group-${group.deviceId}` : 'group-undriven'
            return {
              key,
              title:
                group.kind === 'undriven'
                  ? 'Nothing in this rig can drive these'
                  : group.drivesOnly
                    ? `${group.deviceName} — drives these, sounds none of them`
                    : group.deviceName,
              anchorId: `section-${key}`,
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
            }
          }),
          ...(orphanHooks.length === 0
            ? []
            : [
                {
                  key: 'orphan-hooks',
                  title: 'Hooks with nothing to play them',
                  anchorId: 'section-orphan-hooks',
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
          {
            key: 'Finishing',
            title: 'Finishing',
            anchorId: phaseAnchor('Finishing'),
            body: bodies.Finishing,
          },
        ]

  /**
   * §8/#341. **One number per section, counted over the whole guide.**
   *
   * The nav entry and the heading it points at carry the same number, in both layouts, because
   * they are built from the same list. Under the sequencer layout that list is Song, Voice
   * assignment, Rig integration, a section per box, and Finishing; under the phase layout it is
   * §8's seven. Nothing below this line asks which.
   */
  const numbered = sections.map((section, i) => ({ ...section, n: i + 1 }))
  /** The section the jump-nav marks. The first until something says otherwise; see `nav.ts`. */
  const here =
    reading !== undefined && sections.some((s) => s.key === reading) ? reading : sections[0]?.key

  /*
   * The latest sections, for the measuring effect below — which must *not* re-run on every
   * render. `sections` is rebuilt each time, so depending on it directly would restart the
   * listeners every time the hints checkbox moved. Written in an effect rather than during
   * render, and declared above the effect that reads it so it is current before that one runs.
   */
  const sectionsRef = useRef<GuideSection[]>(sections)
  useEffect(() => {
    sectionsRef.current = sections
  })

  /**
   * §8/#341. **The jump-nav says where you are, not just where you could go.**
   *
   * A sticky bar that never changes is a list of links; what makes it worth the 44px it costs on
   * a phone is that it answers "which of the seven am I in" while you are two metres down with
   * your hands on a box. The line it measures against is the bar's **own bottom edge**, so the
   * marked phase is the one whose content is under the reader's eye rather than the one nearest
   * the top of the document.
   *
   * Measured on scroll rather than watched with an `IntersectionObserver`, and the reason is the
   * 28px between one section and the next: an observer aimed at a one-pixel band below the bar
   * sees *nothing* while a gap crosses it, so the answer has to be held rather than read, and a
   * held answer is a second state to keep right. Reading the tops outright has one answer at every
   * scroll position and no gap case at all. It is throttled to a frame, which is as often as a
   * result could be drawn anyway.
   *
   * Both layouts. It ran for the phase layout alone while the sequencer layout had tabs, on the
   * argument that a selected tab already says where you are; the sections it marks now are the
   * boxes, and the rule does not care which they are.
   */
  useEffect(() => {
    let frame = 0
    const measure = () => {
      frame = 0
      const nav = jumpRef.current
      if (nav === null) return
      const heads: { key: string; top: number }[] = []
      /*
       * **The line is where a jumped-to heading comes to rest**, and that is `scroll-margin-top`
       * rather than the bar's bottom edge. Measuring against the bar alone is off by the
       * difference between the two, and the way it shows is the worst one available: press
       * "5 Step programming", land on it, and the bar marks 4 — the reader is looking straight
       * at the heading it is disagreeing with. Read from the element rather than written as 60
       * here, so the two cannot drift apart when the rule in the stylesheet changes, and so the
       * two layouts need no separate answer.
       *
       * Still at least the bar's own bottom, because a heading scrolled up behind the bar has
       * gone past whatever the stylesheet says about landing.
       */
      let rest = 0
      for (const section of sectionsRef.current) {
        const el = window.document.getElementById(section.anchorId)
        if (el === null) continue
        heads.push({ key: section.key, top: el.getBoundingClientRect().top })
        if (rest === 0) rest = parseFloat(window.getComputedStyle(el).scrollMarginTop) || 0
      }
      /*
       * Two pixels of slack on the end test, because `scrollHeight` is an integer and the sum on
       * its left is fractional on any display that is not at 1x — an exact comparison never fires
       * on a retina screen, which is most of them.
       */
      const doc = window.document.documentElement
      const atEnd = window.scrollY + window.innerHeight >= doc.scrollHeight - 2
      const next = currentSection(
        heads,
        Math.max(nav.getBoundingClientRect().bottom, rest),
        atEnd,
      )
      if (next !== undefined) setReading(next)
    }
    const onScroll = () => {
      if (frame === 0) frame = window.requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      if (frame !== 0) window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [layout])

  /**
   * §8/#341/#21. **The marked link is brought into the nav's own scroll, never the page's.**
   *
   * Seven phases do not fit 390px, so by phase 5 the mark is off the right-hand end of a bar the
   * reader can see — which is worse than not marking it, because the bar now looks like it has
   * stopped tracking. A rig of boxes is longer still and the section names are longer than the
   * phase names, so the sequencer layout needs this more than the phase layout does, not less.
   * `scrollLeft` on the nav and nothing else: `scrollIntoView` would be entitled to scroll the
   * page as well, and moving the page under somebody who is reading it is the one thing this must
   * not do.
   */
  useEffect(() => {
    if (here === undefined) return
    const nav = jumpRef.current
    const link = jumpLinks.current.get(here)
    if (nav === null || link === undefined) return
    const left = link.offsetLeft
    const right = left + link.offsetWidth
    if (left < nav.scrollLeft) nav.scrollLeft = left
    else if (right > nav.scrollLeft + nav.clientWidth) nav.scrollLeft = right - nav.clientWidth
  }, [here, layout])

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
    <article className="guide" data-hints={hints ? 'on' : 'off'} data-layout={layout}>
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

      {/*
        §8/#341. **The jump-nav, and it is the whole answer for both layouts.**

        The complaint was one — there is a lot of scrolling — and for a while the answer was two,
        a jump-nav here and a tab strip for the sequencer layout. `nav.ts` records why that lost.
        What is left is the control that never had to hide anything: it says where you are in the
        guide and what is next, and every section stays on the page underneath it.

        The sections it lists are whatever the layout drew. §8 orders the seven phases
        deliberately — Hook before Sound design, because you write the line and then design the
        sound that plays it — and forbids reordering; a rig is worked through a box at a time in
        the order the guide sets out. Both are a sequence, which is what this marks.

        Sticky, so it is still there after two metres of scroll, and it scrolls inside itself
        (#21) because neither seven phases nor a rack of boxes fits 390px and the page body never
        scrolls sideways.
      */}
      <nav className="guide-jump" aria-label="Sections" ref={jumpRef}>
        <ol>
          {numbered.map((section) => (
            <li key={section.key}>
              <a
                href={`#${section.anchorId}`}
                /*
                  `step`, not `page` or `true`: these are the steps of one process in a fixed
                  order, which is exactly what §8 says the phases are and what a rig worked
                  through a box at a time is. It is also the whole accessible half of the mark —
                  the underline below is the visible half, and neither is allowed to be the only
                  one.
                */
                aria-current={section.key === here ? 'step' : undefined}
                ref={(el) => {
                  if (el === null) jumpLinks.current.delete(section.key)
                  else jumpLinks.current.set(section.key, el)
                }}
                /*
                  Marked on press, before anything has scrolled. Smooth scrolling takes the best
                  part of a second on a long guide, and a bar that waits for it looks broken at
                  the moment the reader is looking straight at it. No `preventDefault`: the hash
                  still lands in the URL and the browser still does the scrolling, and the
                  measurement above confirms the same answer when it settles.
                */
                onClick={() => setReading(section.key)}
              >
                <span className="jump-number mono">{section.n}</span>
                <span className="jump-title">{section.title}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* Every section, in order, all of them on the page. Both layouts, no exceptions. */}
      {numbered.map((section) => (
        <Panel key={section.key} section={section} />
      ))}
    </article>
  )
}
