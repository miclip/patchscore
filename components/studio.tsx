'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { DeviceId, GuideInputsV1, MoodAxis, StoredRigV1, TemplateId } from '@/lib/core'
import { resolve } from '@/lib/core'
import { DEVICES } from '@/lib/devices/registry.generated'
import { templateById } from '@/lib/templates'
import { browserEnv } from '@/lib/studio/browser-env'
import {
  CATALOGUE,
  DEFAULT_INPUTS,
  bootstrapStudio,
  copyStudioLink,
  syncStudio,
  withAxis,
  withDevice,
  withSeed,
  withTemplate,
} from '@/lib/studio/session'
import type { StudioNotice } from '@/lib/studio/session'
import { DevicePicker } from './device-picker'
import { GenrePicker } from './genre-picker'
import { MoodPanel } from './mood-panel'
import { Guide } from './guide/guide'
import { Rack } from './rack/rack'
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
  const [copied, setCopied] = useState<{ ok: boolean; message: string } | undefined>(undefined)

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
    setPersist(boot.persist)
    setNotices(boot.notices)
    setBootstrapped(true)
  }, [])

  // The address bar and the store, kept in step with the inputs. `replaceState`, so a knob turn
  // is not a back-button entry and nothing navigates out from under someone mid-guide.
  useEffect(() => {
    if (!bootstrapped) return
    const report = syncStudio(browserEnv(), inputs, rig, { persist })
    if (report.notice === undefined) return
    setNotices((current) =>
      current.some((n) => n.kind === report.notice?.kind)
        ? current
        : [...current, report.notice as StudioNotice],
    )
  }, [bootstrapped, persist, inputs, rig])

  const template = templateById(inputs.templateId)
  const selected = useMemo(() => new Set(inputs.devices), [inputs.devices])
  // Registry order, not click order: the rig is a set, and the resolver's tie-breaks are
  // documented against a stable device order (§7.2).
  const devices = useMemo(() => DEVICES.filter((d) => selected.has(d.id)), [selected])

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

  function toggleDevice(id: DeviceId, on: boolean) {
    setInputs((current) => withDevice(current, id, on))
  }

  function selectTemplate(id: TemplateId) {
    setInputs((current) => withTemplate(current, id))
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

        <section className="panel">
          <header>
            <h2>Inspirations</h2>
            <p className="note">Not built yet</p>
          </header>
          <p className="empty">
            Reference patches that bend a template toward a specific record — build step 7 (#9).
          </p>
        </section>

        <MoodPanel mood={inputs.mood} onChange={setAxis} />

        {/*
          §10's signature element sits above the guide, not under it: the guide is seven phases
          long, and a rack drawing below all of that is a rack drawing nobody scrolls to.
        */}
        <Rack result={result} />

        {result === undefined ? (
          <section className="panel span-2">
            <header>
              <h2>Guide</h2>
            </header>
            <p className="empty">No template selected.</p>
          </section>
        ) : (
          /*
            `guide-panel` is what `@media print` keeps. Everything else on the page is chrome —
            pickers, knobs, the rack, the notices — and a printed guide with a device picker at
            the top of page 1 is a printed guide somebody has to explain.
          */
          <section className="panel span-2 guide-panel">
            <Guide result={result} seed={inputs.seed} />
          </section>
        )}
      </div>
    </main>
  )
}
