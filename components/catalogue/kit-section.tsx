import Link from 'next/link'
import type { Device, Recipe } from '@/lib/core'
import { num } from '@/lib/core'
import { KitBody } from '@/components/catalogue/kit-parts'
import { kitHref } from '@/lib/studio/catalogue'

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
          {/* Routing, cables, settings — `KitBody`, which the standalone page lays open. */}
          <KitBody recipe={recipe} device={device} />
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
      {/*
        §3.7/#478. **The same kit, laid open, on a page of its own.**

        This panel is one section of a page about a device: every sound is folded away, because
        twenty-two of them expanded is a page nobody skims. Somebody who has decided to *build*
        the kit wants the opposite — every value open at once, on one address they can send to a
        phone, print, or save as Markdown. That is a different document rather than a different
        style of this one, and it is at `kitHref`.
      */}
      <p className="kit-open">
        <Link href={kitHref(device)}>Open the full kit, with every sound laid out</Link>
      </p>
    </section>
  )
}
