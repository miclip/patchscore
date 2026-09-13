import type { ChangeEvent } from 'react'

/**
 * #570. **One control for reading a progression in another key**, shared by every page that
 * transposes a chord table — the direction page first, the riff page after it.
 *
 * A `<select>` and a `<label>`, because that is the whole accessible answer: the label names
 * it, the value *is* the active key, arrow keys move through the list, and a screen reader
 * announces the change without anything here having to say it twice. It borrows the studio's
 * key control's own classes (`.song-row`, `.song-select`) rather than new ones, so the same
 * gesture looks the same on the two pages a reader might meet it — and it keeps that control's
 * 44px target and 16px type, which is §8's phone rule.
 *
 * **No hooks**, so it can be called as a function and its handler pulled out and exercised in
 * Node, the seam `placement-control.test.ts` set. The `id` is the caller's for that reason; a
 * `useId` here would close the seam.
 *
 * `keys` is whatever the caller offers — `transposableKeys` on a real page — and `selected` is
 * shown as the selection it is even where it is not in the list, so the control never points at
 * a key the table is not in.
 */
export function KeySelect({
  id,
  keys,
  selected,
  onChange,
}: {
  id: string
  keys: readonly string[]
  selected: string
  onChange: (key: string) => void
}) {
  const options = keys.includes(selected) ? keys : [selected, ...keys]
  return (
    <div className="song-row key-select">
      <label className="knob-label" htmlFor={id}>
        read in
      </label>
      <select
        id={id}
        className="song-select mono"
        value={selected}
        onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value)}
      >
        {options.map((key) => (
          <option key={key} value={key}>
            {key}
          </option>
        ))}
      </select>
    </div>
  )
}
