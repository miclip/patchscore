'use client'

import { useId, useState } from 'react'
import type { Harmony } from '@/lib/core'
import { transposableKeys } from '@/lib/core'
import { ProgressionTable } from '@/components/guide/song-tables'
import { KeySelect } from './key-select'

/**
 * #570. **A progression table the reader can transpose.**
 *
 * The key is **view state and nothing else** (§5A.6): it starts at `initialKey`, changes when
 * the reader picks another, and is written nowhere — not to the studio, not to storage, not to
 * the URL. A direction page is somewhere a reader arrives from a search result to look at a
 * genre, and a key chosen to read one table in must not become a fact about their rig. The
 * `riff-storage` rule that no writer may enter the page's import graph holds here too, and a
 * test walks the graph to keep it so.
 *
 * Server-rendered at `initialKey`, so the HTML a crawler or a reader with no script receives
 * already carries the authored key's notes; the control adds to that and replaces nothing.
 */
export function ProgressionInKey({
  harmony,
  initialKey,
}: {
  harmony: Harmony
  initialKey: string
}) {
  const [key, setKey] = useState(initialKey)
  const id = useId()
  return (
    <ProgressionView
      harmony={harmony}
      id={id}
      initialKey={initialKey}
      selected={key}
      onChange={setKey}
    />
  )
}

/**
 * The hook-free half: the control and the table, for one key. Split out so it can be called as
 * a function in a test, its `onChange` invoked, and the result rendered again at the key it
 * asked for — which is the whole interaction, checked without a DOM.
 *
 * Offers `transposableKeys` of the *authored* key, not of the selected one: the offered list is
 * anchored on the key the page opened in and must not change under the reader as they move
 * through it.
 */
export function ProgressionView({
  harmony,
  id,
  initialKey,
  selected,
  onChange,
}: {
  harmony: Harmony
  id: string
  initialKey: string
  selected: string
  onChange: (key: string) => void
}) {
  return (
    <>
      <KeySelect
        id={id}
        keys={transposableKeys(initialKey)}
        selected={selected}
        onChange={onChange}
      />
      <ProgressionTable harmony={harmony} songKey={selected} />
    </>
  )
}
