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
 */

export type SeedFieldProps = {
  seed: number
  onChange: (seed: number) => void
}

export function SeedField({ seed, onChange }: SeedFieldProps) {
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
    <section className="panel">
      <header>
        <h2>Seed</h2>
        <p className="note">Same inputs, same seed, same guide (invariant 6)</p>
      </header>

      <div className="seed-row">
        <label className="knob-label" htmlFor="seed">
          value
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
      <p className="knob-hint" style={{ textAlign: 'left', marginTop: '8px' }}>
        Rerolling re-picks the key, the hooks and how parts land on your boxes. The clock
        source does not change.
      </p>
    </section>
  )
}
