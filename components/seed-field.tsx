'use client'

import { useState } from 'react'
import type { ChangeEvent } from 'react'

/**
 * The seed is an input, exactly like the devices and the mood knobs, and it is typed as well as
 * rerolled — a seed you cannot read off and write down is not a seed, it is a shuffle button.
 *
 * `Math.random` here is fine and is *not* a violation of "no `Math.random()` in the resolver":
 * that rule is about the resolver never reaching for entropy of its own. Reroll is the one
 * place a user has asked for an arbitrary number, and it is picked here, in an event handler,
 * then handed to the resolver as an ordinary integer input.
 */
const MAX_SEED = 999_999_999

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
    const next = Math.min(MAX_SEED, Math.max(0, Math.round(parsed)))
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
          min={0}
          max={MAX_SEED}
          step={1}
          value={typed ?? String(seed)}
          onChange={onFieldChange}
          onBlur={() => setTyped(null)}
        />
        <button
          type="button"
          onClick={() => {
            setTyped(null)
            onChange(Math.floor(Math.random() * (MAX_SEED + 1)))
          }}
        >
          Reroll
        </button>
      </div>
      <p className="knob-hint" style={{ textAlign: 'left', marginTop: '8px' }}>
        Rerolling re-picks the key, the hooks and how parts land on your boxes. It never
        re-cables the rig — the clock source is chosen without the seed (§7.4).
      </p>
    </section>
  )
}
