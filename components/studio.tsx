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
import type { Role } from '@/lib/core'
import { rolesLeftUnfilled } from '@/lib/studio/picker'
import { DEVICES } from '@/lib/devices/registry.generated'
import { INSPIRATIONS } from '@/lib/inspirations'
import { browserEnv } from '@/lib/studio/browser-env'
import {
  CATALOGUE,
  bootstrapStudio,
  composeTemplate,
  songOverrides,
  withBpm,
  withClockSource,
  withKey,
  copyStudioLink,
  createStudioSync,
  effectiveMood,
  moodFromDirection,
  withAxis,
  withDevice,
  withRig,
  withInspiration,
  withSeed,
  withTemplate,
} from '@/lib/studio/session'
import type { Bootstrap, StudioNotice, SyncReport, SyncScheduler } from '@/lib/studio/session'
import { DevicePicker } from './device-picker'
import { PatchChain } from './patch-chain'
import { Footer } from './footer'
import { GenrePicker } from './genre-picker'
import { GuideArea } from './guide-area'
import { InspirationPicker } from './inspiration-picker'
import { MoodPanel } from './mood-panel'
import { SongPanel } from './song-panel'

/**
 * Build step 8 (#10) and build step 10 (#12). The whole input surface, the single place
 * `resolve` is called, and the only component that owns state.
 *
 * **One atomic `GuideInputsV1`, not five fields.** That is the shape a permalink carries and the
 * shape the store round-trips, so holding it as five independent `useState`s would mean five
 * places to remember to re-encode and five chances for the URL to describe a guide that is not
 * the one on screen. One object changes once, and one effect writes it everywhere.
 *
 * **The first frame is a pure function of `initialInputs`.** No `window`, no URL, no storage in
 * render or in a state initializer — the server decodes the query (#99, `lib/studio/entry.ts`)
 * and hands the result down as a prop, so both sides render the same bytes from the same value,
 * and *storage* is the only thing left that gets its say in an effect afterwards. That is why
 * the bootstrap is not a lazy `useState` initializer, which is where this would otherwise
 * obviously go.
 *
 * The prop is the URL's contribution and nothing else. This component still reads no `window`
 * during render, which is the invariant `test/studio-render.test.ts` guards with a hostile
 * global: the URL reaching the first frame as data is exactly what makes reading it here
 * unnecessary rather than merely discouraged.
 *
 * `resolve` is pure and takes single-digit milliseconds for a three-device rig, so it runs
 * synchronously on every change rather than behind a "generate" button. There is nothing to wait
 * for and no request to make (invariant 1).
 */
export type StudioProps = {
  /**
   * The guide to open on, decoded from the query by `lib/studio/entry.ts`. **Required, with no
   * default here on purpose**: `DEFAULT_INPUTS` is the answer to "there was no valid permalink",
   * which is a question the server has already asked and answered. A default on this prop would
   * be a second place that decides the fallback, and two of those is how a page comes to open on
   * a guide neither of them chose.
   *
   * It is the server's answer, not the last word: the bootstrap effect below may still find a
   * saved studio, and a link always beats both.
   */
  initialInputs: GuideInputsV1
}

export function Studio({ initialInputs }: StudioProps) {
  const [inputs, setInputs] = useState<GuideInputsV1>(initialInputs)
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
   * starts at `'default'` because it is the *storage* question and storage has not been read
   * yet — the server may well have opened a link (#99), and the bootstrap effect below says so
   * a commit later. `bootstrapped` — already needed by the sync effect — is what stops this
   * being *believed* until then.
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
   * commit, runs straight after) would fire holding the *stale* `initialInputs` closure: it
   * would `replaceState` those over whatever the bootstrap had just loaded, and save them over
   * the studio it had only just read. A saved studio destroyed by the act of opening
   * it, and a shared link that silently becomes somebody else's. Under React's development
   * double-invocation the second bootstrap then reads that overwritten URL and the link is gone
   * for good.
   *
   * State does not flip until the next render, which is the first render that *has* the
   * bootstrapped inputs — so the first sync writes what was loaded rather than what it replaced.
   * This was caught in a browser, not by the suite; see `test/studio-session.test.ts`.
   */
  const [bootstrapped, setBootstrapped] = useState(false)

  /**
   * #304. Rigs the visitor had before this one, read once on entry and never refreshed.
   *
   * Not kept in step with every save on purpose: the list is a shortcut back to something
   * recognisable, and a row that appears and reorders itself under the reader's cursor while
   * they are ticking boxes is worse than one that is a few edits stale. It settles on reload.
   */
  const [recent, setRecent] = useState<readonly StoredRigV1[]>([])

  useEffect(() => {
    const boot = bootstrapStudio(browserEnv())
    setInputs(boot.inputs)
    setRig(boot.rig)
    setRecent(boot.recent)
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
  /** #138's chain overlay measures against this, since the run crosses three panels. */
  const columnsRef = useRef<HTMLDivElement | null>(null)
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
        : resolve({
            devices,
            template,
            mood: inputs.mood,
            seed: inputs.seed,
            // #161/#200. A permalink, a stored studio or a control can put these here, and the
            // guide renders what the inputs say whatever wrote them.
            overrides: songOverrides(inputs),
          }),
    // **`inputs` whole, not its fields one by one.** This list used to enumerate them, and #200
    // added `clockSourceId` without adding it here: the click wrote the input and the permalink,
    // the memo did not recompute, and the guide went on naming the box the ranking had picked.
    // Every field of `inputs` is an input to `resolve` by construction — `devices` and `template`
    // are themselves derived from it — so depending on the object cannot go stale, where a list
    // of fields silently does the moment somebody adds a fifth.
    [devices, template, inputs],
  )

  /**
   * §7.3. The roles this direction asked for and did not get, for the picker's "fills a gap"
   * filter. Read off the resolve rather than re-derived: the guide's Gaps and "Waiting on us"
   * sections are this same fact, and a second route to it would let the picker disagree with the
   * page beside it (#33). `not-needed` is excluded in `rolesLeftUnfilled` — a direction that says
   * it is finished without a ride is not a rig missing one.
   */
  /**
   * #310. What the five knobs are showing: `inputs.mood` when the reader has one, and the
   * direction's own opening mood when they do not. One function with `resolve`'s own fallback
   * behind it, so the panel cannot show a mood the guide was not resolved at.
   */
  const mood = useMemo(() => effectiveMood(inputs), [inputs])
  /** #317. The axes still holding what the direction opened at, so the panel can credit it. */
  const fromDirection = useMemo(() => moodFromDirection(inputs), [inputs])

  const unfilledRoles = useMemo(
    () => (result === undefined ? new Set<Role>() : rolesLeftUnfilled(result)),
    [result],
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
   * #304. Swap the whole rig for a remembered one, in one edit rather than ten ticks.
   *
   * `withRig` replaces the device list outright instead of folding the two together, because a
   * remembered rig is a rig somebody had and not a set of suggestions — merging it into the
   * current one would produce a third rig nobody chose. It is also the only path that may exceed
   * `MAX_RIG_DEVICES`, and deliberately: the cap is a picker rule, and a rig stored before it
   * existed is still theirs (#301).
   */
  function restoreRig(stored: StoredRigV1) {
    claimAsOwn()
    setInputs((current) => withRig(current, stored))
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

  /**
   * #310. The knob's new value, on top of **the state the reader was looking at** — theirs if
   * they have one, and the direction's otherwise. So the first move takes the whole mood, and
   * from then on the four knobs they did not touch stay where they were rather than following
   * the next direction they pick.
   *
   * `effectiveMood(current)` inside the updater rather than the memo below, because `current` is
   * the inputs this edit actually applies to. It is also the cheap path after the first move —
   * an explicit mood returns without composing anything.
   */
  function setAxis(axis: MoodAxis, value: number) {
    setInputs((current) => withAxis(current, axis, value, effectiveMood(current)))
  }

  function setSeed(seed: number) {
    setInputs((current) => withSeed(current, seed))
  }

  /**
   * #161. Neither of these claims the page as the visitor's own (#61): choosing a tempo or a key
   * is taste on the example in front of them, the same as turning a knob or rerolling, where
   * changing a box or the direction is answering the question the note asks.
   */
  function setBpm(bpm: number | undefined) {
    setInputs((current) => withBpm(current, bpm))
  }

  function setKey(key: string | undefined) {
    setInputs((current) => withKey(current, key))
  }

  /**
   * §7.4/#200. Putting a box in charge of the clock, or handing the job back to §7.4's ranking.
   * An input like the tempo rather than a view setting, so it travels in the permalink and a
   * shared guide reproduces the one its sender saw.
   */
  function setClockSource(deviceId: DeviceId | undefined) {
    setInputs((current) => withClockSource(current, deviceId))
  }

  return (
    <main className="shell">
      <header className="masthead">
        {/*
          The full mark, and only here. The nav badge is the tiled drawing because it has to work
          at 28px; this one carries the cable, the knob and the stave, which need about 64px before
          they say anything. The studio is the one page with room for it.

          Its charcoal panel sits close in value to `--panel-0`, which reads as a problem and is
          not one: the off-white jacks, knob ring and stave lines carry the shape, and the panel is
          the negative space they define. Checked on the real background at 64, 96 and 128px.

          `alt=""` for the reason the nav badge has it — the `h1` beside it says the name.
        */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="masthead-mark" src="/patchscore-mark.png" width={64} height={64} alt="" />
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

      {/* #138. The chain runs `out` -> Direction -> Inspiration across three panels, so its
          overlay sits here rather than in any one of them. */}
      <div className="columns" ref={columnsRef}>
        <PatchChain areaRef={columnsRef} />
        <DevicePicker
          selected={inputs.devices}
          onToggle={toggleDevice}
          clockSourceId={inputs.clockSourceId}
          /*
           * §7.3. The roles this direction asked for and did not get, so the picker can offer the
           * boxes that would answer them. Computed from the resolve rather than re-derived — the
           * guide's "Waiting on us" and "Gaps" sections are the same fact, and two routes to it
           * would let the picker disagree with the page it sits beside (#33).
           */
          unfilled={unfilledRoles}
          recent={recent}
          onRestoreRig={restoreRig}
        />
        <GenrePicker selected={inputs.templateId} onSelect={selectTemplate} />
        {/*
          #161. The panel beside INSPIRATIONS, holding the three facts §8's phase 1 opens with.
          It reads the *effective* direction — the one inspirations produced — because that is
          the range a tempo is judged against and the key list a reader is choosing from.
        */}
        <SongPanel
          seed={inputs.seed}
          onSeed={setSeed}
          range={template?.bpm}
          keys={template?.keys ?? []}
          bpm={inputs.bpm}
          songKey={inputs.key}
          resolved={result === undefined ? undefined : { bpm: result.song.bpm, key: result.song.key }}
          onBpm={setBpm}
          onKey={setKey}
        />

        <InspirationPicker
          inspirations={INSPIRATIONS}
          selected={inputs.inspirations}
          onToggle={toggleInspiration}
          application={application}
          // #161. The resolver's findings about the song, shown in the one findings display
          // rather than in a second one of their own.
          songDiagnostics={result?.song.diagnostics ?? []}
        />

        {/* #310. The mood in force, which is the direction's until the reader moves a knob. */}
        <MoodPanel
          mood={mood}
          onChange={setAxis}
          /*
           * #317. Which knobs are still showing the direction's own opening values, and whose
           * name to put on them. Derived by comparison rather than stored — see
           * `moodFromDirection`, which explains why a flag would go stale after one twist.
           */
          fromDirection={fromDirection}
          directionName={application?.outcome === 'applied' ? application.template.name : undefined}
        />

        <GuideArea
          application={application}
          result={result}
          seed={inputs.seed}
          onClockSource={setClockSource}
        />
      </div>

      <Footer permalink={permalink} devices={devices.map((d) => `${d.maker} ${d.name}`)} />
    </main>
  )
}
