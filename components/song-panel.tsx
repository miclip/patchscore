'use client'

import { useId, useState } from 'react'
import type { ChangeEvent } from 'react'
import { BPM_MAX, BPM_MIN, parseKey } from '@/lib/core'
import {
  OTHER_KEY,
  commitKey,
  commitTempo,
  keyControl,
  keyOptions,
  tempoDraggable,
} from './song-controls'
import { SeedRow } from './seed-field'

/**
 * #161. Seed, key and tempo, in one panel, because those three are exactly what §8's phase 1
 * prints and what somebody means by "what song am I making?".
 *
 * Two of them used to be decided *for* the reader and could not be reached. The guide said so on
 * both counts — it printed the tempo's range and named the keys a reroll might land on — and the
 * only route to either was rerolling the seed, which also re-picks every hook and re-places every
 * part on every box. Someone who wanted C minor had to gamble for it and lose their arrangement
 * each time it missed.
 *
 * ## What each control is, and what it refuses to be
 *
 * **Tempo is typed first and dragged second.** The number is the control: it is the accessible
 * path, the precise one, and the only one that can express a tempo outside the direction's range
 * — which §5.6 makes legal on purpose. The slider is an *additional* affordance and appears only
 * where it can tell the truth: a range with room to move in, holding a value it can point at. A
 * slider that cannot represent the current value would either lie about where the value is or
 * silently drag it back inside, and a range §5 has clamped flat has nothing to move within at
 * all.
 *
 * **Key is a list plus `Other…`.** `template.keys` is a curated list rather than a gate (§4), so
 * the honest control is neither of the two obvious ones: a select of only the direction's keys
 * hides the fact that any parseable key resolves, and a bare text field makes the common case —
 * one of three keys the direction was written around — into a spelling exercise at the machine.
 * The list keeps the common choice one tap; `Other…` exposes the whole parseable set to anyone
 * who wants it. A direction offering a single key shows no select — a menu with one item is a
 * control that cannot do anything — and drops straight to the typed field, so `Other…` is not
 * removed there but is the whole control: the single key is that direction's taste, never a
 * limit on the engine.
 *
 * **Reset is its own control, on both.** "Follow the direction" is a state, not the absence of
 * one: unset means the authored default moved by inspirations, and once someone has typed a
 * number there is no other way back to it. It is disabled rather than hidden while nothing is
 * set, so the panel does not change shape under the hand using it.
 *
 * ## Reading this at 390px (#21)
 *
 * Every row wraps as a unit and nothing scrolls sideways. The typed inputs are the primary path
 * on touch, where the drag affordances are worst, and both they and the buttons carry a 44px
 * minimum hit target — decoupled from type size, so a compact panel is still a usable one.
 */

export type SongPanelProps = {
  seed: number
  onSeed: (seed: number) => void
  /**
   * The **effective** direction's tempo range (§5, inspirations already applied), and the keys
   * it offers. `undefined` and `[]` where no direction resolves — the panel still shows the seed
   * and still lets a tempo or a key be typed, because both are inputs in their own right.
   */
  range: { min: number; max: number; default: number } | undefined
  keys: readonly string[]
  /** The overrides as the inputs hold them. `undefined` is "follow the direction". */
  bpm: number | undefined
  songKey: string | undefined
  /**
   * What the guide actually resolved, so an unset field shows the value in force rather than an
   * empty box: the direction's default, and the seed's pick from its keys.
   */
  resolved: { bpm: number; key: string | undefined } | undefined
  onBpm: (bpm: number | undefined) => void
  onKey: (key: string | undefined) => void
}

export function SongPanel({
  seed,
  onSeed,
  range,
  keys,
  bpm,
  songKey,
  resolved,
  onBpm,
  onKey,
}: SongPanelProps) {
  const ids = useId()
  const bpmId = `${ids}-bpm`
  const keyId = `${ids}-key`

  /** Uncommitted keystrokes. Committed values come back down as props. */
  const [typedBpm, setTypedBpm] = useState<string | null>(null)
  const [typedKey, setTypedKey] = useState<string | null>(null)
  /** Whether the key is being typed rather than chosen. Sticky until reset or list is chosen. */
  const [typing, setTyping] = useState(false)

  const shownBpm = bpm ?? resolved?.bpm ?? range?.default
  const shownKey = songKey ?? resolved?.key

  function onBpmField(event: ChangeEvent<HTMLInputElement>) {
    const raw = event.target.value
    setTypedBpm(raw)
    const next = commitTempo(raw)
    if (next !== undefined) onBpm(next)
  }

  const draggable = tempoDraggable(range, shownBpm)
  const offered = keyControl(keys, typing, songKey) === 'list'
  const typedKeyValue = typedKey ?? shownKey ?? ''
  const typedKeyReadable = typedKeyValue === '' || parseKey(typedKeyValue) !== undefined

  /**
   * The stored key is one the engine cannot read, so the guide is in the direction's own key and
   * this field is the only place that says so. Distinct from `typedKeyReadable`, which also
   * covers a half-typed key on the way to a good one — that is not yet a state anything resolved
   * against, and it has nothing to name.
   */
  const strandedKey = songKey !== undefined && parseKey(songKey) === undefined

  return (
    <section className="panel song-panel">
      <header>
        <h2>Song</h2>
        <p className="note">Tempo, key and seed — phase 1 of the guide, before you touch a box</p>
      </header>

      <SeedRow seed={seed} onChange={onSeed} />

      <div className="song-row">
        <label className="knob-label" htmlFor={keyId}>
          key
        </label>

        {offered ? (
          <select
            id={keyId}
            className="song-select mono"
            value={shownKey ?? ''}
            onChange={(event) => {
              const value = event.target.value
              if (value === OTHER_KEY) {
                setTypedKey(null)
                setTyping(true)
                return
              }
              onKey(value)
            }}
          >
            {/* A key the direction does not offer is still shown as the selection it is —
                dropping it would leave the select pointing at a key the guide is not in. */}
            {keyOptions(keys, shownKey).map((one) => (
              <option key={one} value={one}>
                {one}
              </option>
            ))}
            <option value={OTHER_KEY}>Other…</option>
          </select>
        ) : (
          <input
            id={keyId}
            className={`song-input mono${typedKeyReadable ? '' : ' out-of-range'}`}
            type="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="F minor"
            // Mirrors the border rather than the commit: what a screen reader is told and what a
            // sighted reader is shown are the same claim about the same text.
            aria-invalid={typedKeyReadable ? undefined : true}
            aria-describedby={`${keyId}-hint`}
            value={typedKeyValue}
            onChange={(event) => {
              const raw = event.target.value
              setTypedKey(raw)
              // Parse-gated: a string the engine cannot read is never committed. A link may
              // carry one (§5.6) and the guide survives it; there is no reason to make one here.
              const next = commitKey(raw)
              if (next !== undefined) onKey(next)
            }}
            onBlur={() => setTypedKey(null)}
          />
        )}

        {/* The way back to the list, and only where there is a list to go back to. A
            direction authoring one key never shows a select, so its control *is* the typed
            field — which is `Other…` already reachable, rather than `Other…` removed. */}
        {typing && keys.length > 1 ? (
          <button
            type="button"
            onClick={() => {
              setTypedKey(null)
              setTyping(false)
            }}
          >
            Use the list
          </button>
        ) : null}

        <button
          type="button"
          className="song-reset"
          disabled={songKey === undefined}
          onClick={() => {
            setTypedKey(null)
            setTyping(false)
            onKey(undefined)
          }}
        >
          Follow direction
        </button>
      </div>
      <p className="knob-hint song-hint" id={`${keyId}-hint`}>
        {strandedKey
          ? // Never silent about which key the guide is actually in: the reader set one, it did
            // not take, and the difference is invisible from the field alone (invariant 5).
            `Not a key this build can read${
              resolved?.key === undefined ? '' : `, so the guide is in ${resolved.key}`
            }. Letter, optional # or b, then a mode — or reset to follow the direction.`
          : offered
            ? 'Any key the direction offers, or Other… for anything the engine can read.'
            : 'Letter, optional # or b, then a mode: F minor, C# dorian, Bb lydian.'}
      </p>

      <div className="song-row">
        <label className="knob-label" htmlFor={bpmId}>
          bpm
        </label>
        <input
          id={bpmId}
          className="song-input mono"
          type="number"
          inputMode="numeric"
          min={BPM_MIN}
          max={BPM_MAX}
          step={1}
          aria-describedby={`${bpmId}-hint`}
          value={typedBpm ?? (shownBpm === undefined ? '' : String(shownBpm))}
          onChange={onBpmField}
          onBlur={() => setTypedBpm(null)}
        />
        {/* `draggable` already implies a range; the second half is what tells the compiler. */}
        {draggable && range !== undefined ? (
          <input
            className="song-slider"
            type="range"
            min={range.min}
            max={range.max}
            step={1}
            value={shownBpm}
            // The number field carries the label; this is the same value by another route, so it
            // is named rather than left to inherit a label that would then be spoken twice.
            aria-label={`Tempo within the direction's ${String(range.min)} to ${String(range.max)}`}
            onChange={(event) => {
              setTypedBpm(null)
              onBpm(Number(event.target.value))
            }}
          />
        ) : null}
        <button
          type="button"
          className="song-reset"
          disabled={bpm === undefined}
          onClick={() => {
            setTypedBpm(null)
            onBpm(undefined)
          }}
        >
          Follow direction
        </button>
      </div>
      <p className="knob-hint song-hint" id={`${bpmId}-hint`}>
        {range === undefined
          ? `Whole numbers ${String(BPM_MIN)}–${String(BPM_MAX)}.`
          : `The direction is written for ${String(range.min)}–${String(range.max)}. ` +
            'Outside it is allowed and said in the guide; the patterns do not follow the tempo.'}
      </p>
    </section>
  )
}
