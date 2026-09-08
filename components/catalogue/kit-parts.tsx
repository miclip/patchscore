import { CableMark } from '@/components/cable-mark'
import { Fragment } from 'react'
import type { AuthoredParam, Device, ParamScope, PatchEntry, Recipe } from '@/lib/core'
import { groupedParams, num, paramLabel, recipeRouting } from '@/lib/core'
import { hintText } from '@/components/guide/format'

/**
 * §3.6/§3.7/#478. **One reading of a kit recipe, drawn once and used by both surfaces.**
 *
 * The device page's `Build a kit` panel folds these into a `<details>` per sound; the standalone
 * page at `/devices/<id>/kit` lays every one of them open. What is *inside* a sound — the
 * routing, the cables, the values, the notes and the jogs — is the same reading of the same
 * recipe on both, and it is here so it cannot become two.
 *
 * That was the risk the extraction removes rather than a tidy-up: a second React interpretation
 * of a parameter would let a reader who moved between the two pages find the same control
 * described two ways, and neither would be wrong enough to notice.
 *
 * **Its own markup, sharing the guide's two settled decisions.** §10's monospace value treatment
 * and #385's module boxes are how a parameter reads everywhere in this product, and a reader
 * arriving from a guide must not have to learn a second convention. `groupedParams` and
 * `paramLabel` are imported for that reason; everything else here is written for these two pages.
 */

/** The words the guide uses for the two scopes, restated (#33). */
const SCOPE_LABEL: Record<ParamScope, string> = {
  pattern: 'pattern-wide',
  song: 'song-wide',
}

/**
 * §10. The value, monospace, with the unit and the bounds beside it.
 *
 * **The authored point, not a resolved one, and no `from` half.** Nothing has moved it: mood
 * applies after recipe resolution and no mood is in play on this page, so `52 → 45` would be a
 * shape with nothing to put in it. What a reader gets is the number the device folder holds.
 *
 * An enum prints its option set where a numeric prints its bounds, because that is what the
 * legality gate is on an enum (§3.1) and it is the same question a reader asks of a range: what
 * else could this be. A `text` param has neither and prints the instruction alone.
 */
function KitValue({ param }: { param: AuthoredParam }) {
  return (
    <span className="value">
      <span className="value-now mono">
        {param.kind === 'numeric' ? num(param.value) : param.value}
      </span>
      {param.kind === 'numeric' && param.unit !== undefined ? (
        <span className="value-unit mono">{param.unit}</span>
      ) : null}
      {param.kind === 'numeric' ? (
        <span className="value-range mono">
          {`(${num(param.range.min)}…${num(param.range.max)}${
            param.unit === undefined ? '' : ` ${param.unit}`
          })`}
        </span>
      ) : null}
      {param.kind === 'enum' ? (
        <span className="value-range kit-options mono">{`(${param.options.values.join(', ')})`}</span>
      ) : null}
    </span>
  )
}

/**
 * One parameter: the name, the value, and whatever the author wrote under it.
 *
 * The note and the hint are both here and both visible. §8.1's argument for hiding a hint is
 * about a reader at the machine with a page they have outgrown; this reader is deciding whether
 * to build the patch at all, and a jog is worth more to them than the line it costs.
 *
 * **The scope word is a correction, not decoration.** A `pattern`- or `song`-scoped value is one
 * setting for everything, and roughly one parameter in ten here declares one. Unmarked, a reader
 * working down a kit would set it again for every sound and wonder why the last one won.
 */
function KitParam({ param, device }: { param: AuthoredParam; device: Device }) {
  const hint = param.hint === undefined ? undefined : hintText(device, param.hint)
  return (
    <li className="kit-param">
      <span className="kit-param-line">
        <span className="param-name">{paramLabel(param)}</span>
        <KitValue param={param} />
        {param.scope === undefined ? null : (
          <span className="kit-scope">{SCOPE_LABEL[param.scope]}</span>
        )}
      </span>
      {param.note === undefined ? null : <p className="subordinate note">{param.note}</p>}
      {hint === undefined ? null : <p className="kit-hint">{hint}</p>}
    </li>
  )
}

/**
 * #385's module box, drawn again for authored parameters.
 *
 * `groupedParams` is shared rather than restated — which lines belong together is structure, and
 * two implementations of it would let this page box a reader's controls differently from the
 * guide that sent them here. It cuts maximal *runs*, so authored order survives and a module
 * interrupted and resumed opens two boxes with one label; that is a fact about the device folder
 * and is left visible here exactly as it is in a guide.
 *
 * A group with no module renders as bare lines, so a box that names no panel blocks produces a
 * plain list and no empty frames.
 */
function KitParams({ recipe, device }: { recipe: Recipe; device: Device }) {
  return (
    <>
      {groupedParams(recipe.params).map((group, i) => {
        const lines = (
          <ul className="kit-params">
            {group.params.map((param) => (
              <KitParam key={param.name} param={param} device={device} />
            ))}
          </ul>
        )
        if (group.module === undefined) return <Fragment key={`${i}-`}>{lines}</Fragment>
        return (
          <div className="module-box" key={`${i}-${group.module}`}>
            <p className="module-label">
              <span className="module-led" aria-hidden="true" />
              <span>{group.module}</span>
            </p>
            {lines}
          </div>
        )
      })}
    </>
  )
}

/** The cables inside the box, in the guide's own arrow shape and monospace jack names (§10). */
function KitPatch({ entries }: { entries: readonly PatchEntry[] }) {
  return (
    <ul className="patch kit-patch">
      {entries.map((entry) => (
        <li key={`${entry.from}->${entry.to}`}>
          <CableMark />
          <span className="mono">{entry.from}</span>
          <span className="arrow" aria-hidden="true">
            {' → '}
          </span>
          <span className="mono">{entry.to}</span>
          {entry.note === undefined ? null : <p className="subordinate note">{entry.note}</p>}
        </li>
      ))}
    </ul>
  )
}

/**
 * §3.6/§3.7. One sound's contents: how it is driven, what to plug in, what to set.
 *
 * Routing, then cables, then settings — the order it happens at the machine. §8 prints its patch
 * last because a reader there has the box wired already and is working down a list of parts; a
 * reader here is building one patch from nothing, and the cables come before the knobs whose
 * meaning they change. The Markdown session renders the same three in the same order.
 *
 * A recipe with no authored settings renders no settings list and no sentence saying so: an
 * empty block is a reader looking for something that is not there, and a line about it would be
 * a line about this library rather than about the box in front of them.
 */
export function KitBody({
  recipe,
  device,
  hoisted = false,
}: {
  recipe: Recipe
  device: Device
  /**
   * §3.7/#496. Whether the container has already printed this recipe's `routingPreamble` in its
   * own header, in which case the sound prints only its own half.
   *
   * A container passes it only after `sharedRoutingPreamble` said every sound on the page carries
   * the same one, so `false` here — the default, and the answer on three of the nine boxes with a
   * kit — prints `recipeRouting`, which is the whole line exactly as it was before the split.
   * Hoisting is a property of laying every sound out at once, which is why it is the container's
   * call and not this component's.
   */
  hoisted?: boolean
}) {
  const routing = hoisted ? recipe.routing : recipeRouting(recipe)
  return (
    <>
      {routing === undefined ? null : <p className="quiet">Routing — {routing}</p>}
      {recipe.patch === undefined || recipe.patch.length === 0 ? null : (
        <KitPatch entries={recipe.patch} />
      )}
      {recipe.params.length === 0 ? null : <KitParams recipe={recipe} device={device} />}
    </>
  )
}
