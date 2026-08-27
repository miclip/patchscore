'use client'

import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { SEED_MAX, SEED_MIN } from '@/lib/core'

/**
 * The seed is an input, exactly like the devices and the mood knobs, and it is typed as well as
 * rerolled — a seed you cannot read off and write down is not a seed, it is a shuffle button.
 *
 * `Math.random` here is fine and is *not* a violation of "no `Math.random()` in the resolver":
 * that rule is about the resolver never reaching for entropy of its own. Reroll is the one
 * place a user has asked for an arbitrary number, and it is picked here, in an event handler,
 * then handed to the resolver as an ordinary integer input.
 *
 * The bounds come from `lib/core/permalink.ts` rather than being written here. A field that
 * accepts a seed a permalink would reject — or the reverse — is a disagreement with no error
 * anywhere, and it only shows up as a link that silently will not load.
 *
 * **A row, not a panel** (#161). The seed lives in `SongPanel` beside key and tempo, because
 * those three are what §8's phase 1 prints and what a person means by "what song am I making?".
 * It stays its own file because the reroll rule above is a rule about *this control* and would
 * be harder to find inside a panel that does three things.
 */

export type SeedRowProps = {
  seed: number
  onChange: (seed: number) => void
}

export function SeedRow({ seed, onChange }: SeedRowProps) {
  const [typed, setTyped] = useState<string | null>(null)

  function onFieldChange(event: ChangeEvent<HTMLInputElement>) {
    const raw = event.target.value
    setTyped(raw)
    const parsed = Number(raw)
    if (raw.trim() === '' || !Number.isFinite(parsed)) return
    const next = Math.min(SEED_MAX, Math.max(SEED_MIN, Math.round(parsed)))
    if (next !== seed) onChange(next)
  }

  return (
    <>
      <div className="seed-row song-row">
        <label className="knob-label" htmlFor="seed">
          seed
        </label>
        <input
          id="seed"
          className="seed-input mono"
          type="number"
          inputMode="numeric"
          min={SEED_MIN}
          max={SEED_MAX}
          step={1}
          value={typed ?? String(seed)}
          onChange={onFieldChange}
          onBlur={() => setTyped(null)}
        />
        <button
          type="button"
          onClick={() => {
            setTyped(null)
            onChange(Math.floor(Math.random() * (SEED_MAX + 1)))
          }}
        >
          Reroll
        </button>
      </div>
      <p className="knob-hint song-hint">
        Rerolling re-picks the hooks and how parts land on your boxes, and the key where you have
        not chosen one. The clock source does not change.
      </p>
    </>
  )
}
