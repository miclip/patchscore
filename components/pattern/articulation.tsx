import type { BoundArticulation, Device } from '@/lib/core'
import { num } from '@/lib/core'
import { hintText } from '@/components/guide/format'
import { Instruction } from '@/components/guide/instruction'
import { VocabularyTerm } from '@/components/vocabulary-term'

/**
 * §4.3/§7 step 8/#528. **What the box does to the slots this grid contains, drawn once.**
 *
 * A guide and a riff page had two treatments of one list. The guide's is this one, and it is the
 * one worth keeping: the jog sits in §8.1's reserved column, where toggling hints changes nothing
 * but `visibility`, and the slot word is a definition trigger (#457) rather than plain text.
 *
 * A slot the variant does not strike is dropped by `bindArticulation` and renders nothing — which
 * is the whole reason articulation addresses slots rather than absolute step numbers.
 *
 * `set` holds numbers, strings *and* booleans, so a value is stringified rather than coerced:
 * `Number(value)` on a named mode renders `NaN`, silently and only on the boxes authoring one.
 *
 * **Its own module, and a client one.** `Instruction` reaches `createContext` through
 * `components/guide/nav.ts`, so this file may not be imported by a server component — which is
 * why the grid and the slot list beside it are separate modules rather than exports of this one.
 */
export function Articulation({
  entries,
  device,
}: {
  entries: readonly BoundArticulation[]
  device: Device | undefined
}) {
  return (
    <ul className="articulation">
      {entries.map((entry) => {
        const hint = entry.hint === undefined ? undefined : hintText(device, entry.hint)
        return (
          <li key={`${entry.slot}-${entry.steps.join('.')}`}>
            <Instruction {...(hint === undefined ? {} : { hint })}>
              <span className="mono slot">
                <VocabularyTerm word={entry.slot} />
              </span>
              <span className="arrow" aria-hidden="true">
                →
              </span>
              {Object.entries(entry.set).map(([key, value]) => (
                <span className="set" key={key}>
                  <span className="mono param-name">{key}</span>
                  <span className="mono value-now">
                    {typeof value === 'string' ? value : String(value)}
                  </span>
                </span>
              ))}
              <span className="quiet">
                on step{entry.steps.length === 1 ? '' : 's'}{' '}
                <span className="mono">{entry.steps.map(num).join(', ')}</span>
              </span>
            </Instruction>
          </li>
        )
      })}
    </ul>
  )
}
