'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  DeviceId,
  GuideInputsV1,
  InspirationId,
  MoodAxis,
  StoredRigV1,
  TemplateId,
} from '@/lib/core'
import { resolve } from '@/lib/core'
import { DEVICES } from '@/lib/devices/registry.generated'
import { INSPIRATIONS } from '@/lib/inspirations'
import { browserEnv } from '@/lib/studio/browser-env'
import {
  CATALOGUE,
  DEFAULT_INPUTS,
  bootstrapStudio,
  composeTemplate,
  copyStudioLink,
  createStudioSync,
  withAxis,
  withDevice,
  withInspiration,
  withSeed,
  withTemplate,
} from '@/lib/studio/session'
import type { Bootstrap, StudioNotice, SyncReport, SyncScheduler } from '@/lib/studio/session'
import { DevicePicker } from './device-picker'
import { Footer } from './footer'
import { GenrePicker } from './genre-picker'
import { GuideArea } from './guide-area'
import { InspirationPicker } from './inspiration-picker'
import { MoodPanel } from './mood-panel'
import { SeedField } from './seed-field'

/**
 * Build step 8 (#10) and build step 10 (#12). The whole input surface, the single place
 * `resolve` is called, and the only component that owns state.
 *
 * **One atomic `GuideInputsV1`, not five fields.** That is the shape a permalink carries and the
 * shape the store round-trips, so holding it as five independent `useState`s would mean five
 * places to remember to re-encode and five chances for the URL to describe a guide that is not
 * the one on screen. One object changes once, and one effect writes it everywhere.
 *
 * **The first frame is a constant.** No `window`, no URL, no storage in render or in a state
 * initializer — the server and the client's first pass both render `DEFAULT_INPUTS`, and the
 * link and the store get their say in an effect afterwards. That is why the bootstrap is not a
 * lazy `useState` initializer, which is where this would otherwise obviously go.
 *
 * `resolve` is pure and takes single-digit milliseconds for a three-device rig, so it runs
 * synchronously on every change rather than behind a "generate" button. There is nothing to wait
 * for and no request to make (invariant 1).
 */
export function Studio() {
  const [inputs, setInputs] = useState<GuideInputsV1>(DEFAULT_INPUTS)
  const [rig, setRig] = useState<StoredRigV1 | undefined>(undefined)
  /**
   * Whether this session owns the studio it is showing. A shared permalink does not: opening
   * somebody's link is looking at their guide, not a decision to replace your own rig, so the
   * whole session stays read-only against storage — reroll and edits included. The address bar
   * still keeps up, which is what makes that lossless: reload restores the link, and the bare
   * root brings the visitor's own studio back untouched.
   */
  const [persist, setPersist] = useState(true)
  const [notices, setNotices] = useState<readonly StudioNotice[]>([])
  /**
   * Where the inputs on screen came from, and whether they have been touched (#61). Together
   * they decide one thing: whether the page is allowed to call this rig an example. `source`
   * starts at `'default'` because that is what the first frame renders, and `bootstrapped`
   * — already needed by the sync effect — is what stops it being *believed* until the store and
   * the URL have had their say.
   */
  const [source, setSource] = useState<Bootstrap['source']>('default')
  const [edited, setEdited] = useState(false)
  const [copied, setCopied] = useState<{ ok: boolean; message: string } | undefined>(undefined)
  /**
   * The URL now in the address bar, for the footer's issue links to quote. State, not a read:
   * the first frame has no address bar (`test/studio-render.test.ts` renders it with no `window`
   * at all), and the sync effect below already knows the canonical href. It is the same string
   * Copy link hands out, so a report and a copied link can never describe different guides.
   */
  const [permalink, setPermalink] = useState<string | undefined>(undefined)

  /**
   * Nothing is written until something has been read — and this **must** be state, not a ref.
   *
   * A ref set inside the bootstrap effect flips synchronously, so the sync effect below (same
   * commit, runs straight after) would fire holding the *stale* `DEFAULT_INPUTS` closure: it
   * would `replaceState` the defaults over the link the user just opened, and save them over the
   * studio the bootstrap had only just loaded. A saved studio destroyed by the act of opening
   * it, and a shared link that silently becomes somebody else's. Under React's development
   * double-invocation the second bootstrap then reads that overwritten URL and the link is gone
   * for good.
   *
   * State does not flip until the next render, which is the first render that *has* the
   * bootstrapped inputs — so the first sync writes what was loaded rather than what it replaced.
   * This was caught in a browser, not by the suite; see `test/studio-session.test.ts`.
   */
  const [bootstrapped, setBootstrapped] = useState(false)

  useEffect(() => {
    const boot = bootstrapStudio(browserEnv())
    setInputs(boot.inputs)
    setRig(boot.rig)
    setSource(boot.source)
    setPersist(boot.persist)
    setNotices(boot.notices)
    setBootstrapped(true)
  }, [])

  const onSynced = useCallback((report: SyncReport) => {
    setPermalink(report.href)
    if (report.notice === undefined) return
    setNotices((current) =>
      current.some((n) => n.kind === report.notice?.kind)
        ? current
        : [...current, report.notice as StudioNotice],
    )
  }, [])

  /**
   * One scheduler for the life of the component, and **deliberately not recreated per change**.
   * A scheduler torn down and rebuilt whenever the inputs move would restart its timer from
   * empty each time, which is a debounce that never fires.
   *
   * Built in an effect rather than lazily in render, for the same reason the bootstrap is: this
   * component never calls `browserEnv()` outside an effect or a handler, so a render in Node
   * with no `window` stays a pure render (`test/studio-render.test.ts`).
   *
   * **Flush on unmount, never cancel.** A queued write is a write somebody's last edit is
   * waiting on, and dropping it would lose it. Nothing is queued before the bootstrap has run,
   * so this cannot write the defaults over a link either.
   */
  const sync = useRef<SyncScheduler | undefined>(undefined)
  useEffect(() => {
    const scheduler = createStudioSync(browserEnv(), onSynced)
    sync.current = scheduler
    return () => {
      scheduler.flush()
      sync.current = undefined
    }
  }, [onSynced])

  /**
   * The address bar and the store, kept in step with the inputs — on a trailing edge, 300ms
   * after the last change (`createStudioSync`). `replaceState`, so a knob turn is not a
   * back-button entry and nothing navigates out from under someone mid-guide.
   *
   * **Debounced because WebKit throws.** A knob drag changes `inputs` on every pointer move, and
   * writing the URL on each one hit Safari/iOS's `replaceState` rate limit — roughly 100 calls
   * per 30 seconds — after about two seconds of dragging, killing the page outright. The
   * `localStorage` write rides the same effect and was doing the same work for the same lack of
   * reason. `resolve` is *not* debounced: the guide tracks the knob live, which is the point of
   * the control.
   */
  useEffect(() => {
    // `bootstrapped` only becomes true on a later commit than the mount effects, so the
    // scheduler is always in place by the time there is anything to schedule. The guard is
    // there so that ordering is a fact rather than an assumption.
    if (!bootstrapped || sync.current === undefined) return
    sync.current.schedule(inputs, rig, { persist })
  }, [bootstrapped, persist, inputs, rig])

  const selected = useMemo(() => new Set(inputs.devices), [inputs.devices])
  // Registry order, not click order: the rig is a set, and the resolver's tie-breaks are
  // documented against a stable device order (§7.2).
  const devices = useMemo(() => DEVICES.filter((d) => selected.has(d.id)), [selected])

  /**
   * §7 step 1, the caller's pre-step: the direction composed with its influences. The resolver
   * takes an *effective* template and never an id or a patch instruction (§7), so this is the
   * one place the two are joined.
   */
  const application = useMemo(() => composeTemplate(inputs), [inputs])
  const template = application?.outcome === 'applied' ? application.template : undefined

  /**
   * `undefined` covers two different situations on purpose, and `GuideArea` distinguishes them:
   * no direction chosen, and a pair of influences that cannot be combined. **Neither falls back
   * to the base template.** Rendering the un-patched guide under a refused selection would be
   * showing a guide nobody asked for while the controls say otherwise.
   */
  const result = useMemo(
    () =>
      template === undefined
        ? undefined
        : resolve({ devices, template, mood: inputs.mood, seed: inputs.seed }),
    [devices, template, inputs.mood, inputs.seed],
  )

  const onCopy = useCallback(() => {
    void copyStudioLink(browserEnv()).then((outcome) => {
      setCopied(
        outcome.ok
          ? { ok: true, message: 'Link copied.' }
          : { ok: false, message: outcome.message },
      )
    })
  }, [])

  /**
   * The two edits that make the rig theirs (#61). Seed and mood do not: rerolling an example is
   * still looking at the example, where changing a box or the direction is the visitor answering
   * the question the note asks. One way only — toggling a device back off does not make the page
   * an example again, because by then they have been asked and have answered.
   */
  function claimAsOwn() {
    setEdited(true)
  }

  function toggleDevice(id: DeviceId, on: boolean) {
    claimAsOwn()
    setInputs((current) => withDevice(current, id, on))
  }

  /**
   * The influences are deliberately *kept* across a change of direction. They are keyed on
   * `(role, band)` and name no template (§5.1), so they reapply against the new one on their
   * own terms — and anything the new direction has no room for is reported rather than dropped.
   * Clearing them here would be the picker asserting a coupling the data does not have.
   */
  function selectTemplate(id: TemplateId) {
    claimAsOwn()
    setInputs((current) => withTemplate(current, id))
  }

  function toggleInspiration(id: InspirationId, on: boolean) {
    setInputs((current) => withInspiration(current, id, on))
  }

  function setAxis(axis: MoodAxis, value: number) {
    setInputs((current) => withAxis(current, axis, value))
  }

  function setSeed(seed: number) {
    setInputs((current) => withSeed(current, seed))
  }

  return (
    <main className="shell">
      <header className="masthead">
        <h1>Patchscore</h1>
        <p>Your hardware, a direction, one seed — a guide with real parameter values.</p>
        <div className="masthead-actions">
          <button type="button" className="link-button" onClick={onCopy}>
            Copy link
          </button>
          {copied === undefined ? null : (
            <span className={copied.ok ? 'copy-ok' : 'copy-failed'} role="status">
              {copied.message}
            </span>
          )}
        </div>
      </header>

      {/*
        Non-blocking by construction: the notices sit above the guide and the guide renders
        regardless. §8.2's drift warning and invariant 5's "gaps are shown honestly" are the same
        instinct — say what happened, then show the work anyway.
      */}
      {notices.length === 0 ? null : (
        <div className="notices" role="status">
          {notices.map((notice) => (
            <p className={`notice notice-${notice.kind}`} key={notice.kind}>
              {notice.message}
            </p>
          ))}
        </div>
      )}

      <div className="columns">
        <DevicePicker selected={inputs.devices} onToggle={toggleDevice} />
        <GenrePicker selected={inputs.templateId} onSelect={selectTemplate} />
        <SeedField seed={inputs.seed} onChange={setSeed} />

        <InspirationPicker
          inspirations={INSPIRATIONS}
          selected={inputs.inspirations}
          onToggle={toggleInspiration}
          application={application}
        />

        <MoodPanel mood={inputs.mood} onChange={setAxis} />

        <GuideArea application={application} result={result} seed={inputs.seed} />
      </div>

      <Footer permalink={permalink} devices={devices.map((d) => `${d.maker} ${d.name}`)} />
    </main>
  )
}
