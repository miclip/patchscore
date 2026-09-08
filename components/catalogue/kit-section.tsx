import { Fragment } from 'react'
import type { AuthoredParam, Device, ParamScope, PatchEntry, Recipe } from '@/lib/core'
import { groupedParams, num, paramLabel } from '@/lib/core'
import { hintText } from '@/components/guide/format'

/**
 * §3.2/#478. **The drum sounds a box makes from scratch, as patches to build and record.**
 *
 * The issue is somebody with a mono synth and a recorder being told, by every guide they
 * generate, that they have no kick. They do have one — twenty-four boxes in this library author
 * drum sounds that need nothing loaded — and until this section there was no surface that said
 * so without inventing a song first.
 *
 * **A selection rendered, not a guide.** `kitRecipes` picks and orders; nothing here resolves,
 * and no template is imported. That is what lets the section exist on a page a reader reaches
 * with no rig, no direction and no seed — and it is also the limit: there is no mood here, no
 * arrangement, and no step pattern, because all three are properties of a song this reader has
 * not asked for.
 *
 * **No destination is named, deliberately.** *Where* to record it is a fact about the other box
 * in the rig, and #478 puts that with the rig-derived prose rather than here. This surface knows
 * one device.
 *
 * **Its own markup, sharing the guide's two settled decisions.** §10's monospace value treatment
 * and #385's module boxes are how a parameter reads everywhere in this product, and a reader
 * arriving from a guide must not have to learn a second convention. Everything else is written
 * for this page: the guide's `Instruction` reserves a hint column that §8.1's toggle controls,
 * and there is no toggle here, so a hint rendered into that column would be invisible.
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
 * One sound: closed, it is an ordinal, a title and what the sound is for; open, it is the patch.
 *
 * **A native `<details>`, closed by default, and both halves of that matter.** A box here reaches
 * twenty-two sounds and forty-three parameters on one of them, so an expanded list is a page
 * nobody skims — the same argument `Parameter sources` settled at #410, reached again. Native,
 * because the page is a server component with no client boundary anywhere on it: the markup a
 * crawler and a reader with no JavaScript receive contains every value, already written out,
 * whether or not anything can open it.
 *
 * Order is content rather than decoration, so the ordinal is read out rather than hidden: the
 * copy above tells a reader to work down the list, and *3* is how they find their place again.
 */
function KitEntry({ recipe, device, at }: { recipe: Recipe; device: Device; at: number }) {
  return (
    <li>
      <details className="disclosure kit-entry">
        <summary>
          {/*
            The grid is a span *inside* the summary rather than the summary itself, and it draws
            its own triangle. A `<summary>` shows the native one only while it is a `list-item`,
            and lays it on the first line box of its content — which a grid child is not, so the
            native marker ended up on a line above the row. The state it indicates is still the
            element's own, so this is decoration and is hidden from a screen reader.
          */}
          <span className="kit-summary">
            <span className="kit-marker" aria-hidden="true" />
            <span className="kit-ordinal mono">{num(at)}</span>
            <span className="kit-title">{recipe.title}</span>
            <span className="kit-meta mono">{`${recipe.role} · ${recipe.character}`}</span>
          </span>
        </summary>
        <div className="disclosure-body">
          {/* Routing first, in the guide's words: it is what the settings below are settings of. */}
          {recipe.routing === undefined ? null : (
            <p className="quiet">Routing — {recipe.routing}</p>
          )}
          {recipe.patch === undefined ? null : <KitPatch entries={recipe.patch} />}
          <KitParams recipe={recipe} device={device} />
        </div>
      </details>
    </li>
  )
}

/**
 * The panel. Renders nothing when the box makes fewer than four of these — `kitRecipes` returns
 * an empty list and the claim is withheld with it (invariant 5: a kit nobody can build is not a
 * kit reported as a gap, it is a claim this page declines to make).
 */
export function KitSection({ device, kit }: { device: Device; kit: readonly Recipe[] }) {
  if (kit.length === 0) return null
  return (
    <section className="panel span-2 kit-section">
      <header>
        <h2>Build a kit</h2>
        <p className="note">Every one of these is this box on its own. Nothing is loaded.</p>
      </header>
      <p className="kit-lead">
        {kit.length} drum sounds this box makes from scratch, in the order to build them. Work
        down the list: open one, patch it, set the values, then record a single hit before moving
        to the next.
      </p>
      <ol className="kit-list">
        {kit.map((recipe, i) => (
          <KitEntry key={recipe.id} recipe={recipe} device={device} at={i + 1} />
        ))}
      </ol>
      <p className="note kit-foot">
        The page behind any of these values is in Parameter sources below, under the name it is
        printed with here.
      </p>
    </section>
  )
}
