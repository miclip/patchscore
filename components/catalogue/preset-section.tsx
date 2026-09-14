import Link from 'next/link'
import { shippedPatchKey } from '@/lib/core'
import { presetsHref, riffHref } from '@/lib/studio/catalogue'
import type { PresetEntry, PresetSession } from '@/lib/studio/preset-session'
import {
  PRESET_FIGURE,
  PRESET_HEADING,
  PRESET_LEAD,
  PRESET_RECIPE,
  factoryPatchClaim,
} from '@/lib/studio/preset-text'

/**
 * §2.6/#593. **The factory patches a box ships, what each is for, and the figure written for
 * it.**
 *
 * A preset belongs to one box and a riff is rig-agnostic, and six issues came out of pushing
 * the first through the second. On a device page it is no exception to anything: a Muse page
 * listing Muse patches is a box describing itself, which is what a device page is for. The link
 * runs from here to the riff and never back — the riff carries nothing about a box (invariant 3).
 *
 * **Rendered from `presetSession` and nothing else.** The session is `undefined` on every box
 * that has not declared both the patch list and what each is for, and this renders nothing for
 * it: no panel, no heading, no claim (the kit's rule, §3.7). A folder that declares both gets
 * the panel and the page at `presetsHref` with no UI edit (invariant 2).
 *
 * **The order is the folder's.** No maker prints a patch list, so there is no order to follow,
 * and the folder that authored the list has said which patches a reader would compare and put
 * them together. Nothing here sorts.
 *
 * **Nothing about the patches it does not list.** The Muse ships 224 and declares twelve; the
 * panel lists the twelve and says nothing about the rest, by operator decision (#593).
 */

/** The name as the box prints it, with its bank where one was read. */
function PatchName({ entry }: { entry: PresetEntry }) {
  return (
    <>
      <span className="preset-name">{entry.patch.name}</span>
      {entry.patch.bank === undefined ? null : (
        <span className="preset-bank mono">{entry.patch.bank}</span>
      )}
    </>
  )
}

/**
 * What is inside one patch: the recipe that reaches it and the figure written for it. Shared by
 * the folded panel and the open page, on `KitBody`'s pattern (§3.7): one React reading of an
 * entry, so a reader moving between the two never finds the same fact described two ways.
 */
export function PresetBody({ entry }: { entry: PresetEntry }) {
  return (
    <>
      {entry.recipes.map((recipe) => (
        <p key={recipe.id} className="quiet preset-recipe">
          {PRESET_RECIPE}
          <strong>{recipe.title}</strong>,{' '}
          <span className="mono">{`${recipe.role} · ${recipe.character}`}</span>.{' '}
          {factoryPatchClaim(entry.patch)}
        </p>
      ))}
      {entry.riff === undefined ? null : (
        <p className="preset-figure">
          {PRESET_FIGURE}
          <Link href={riffHref(entry.riff)}>{entry.riff.name}</Link>
        </p>
      )}
    </>
  )
}

/**
 * One patch in the panel: closed, it is the name and what it is for; open, it is where the
 * library reaches it.
 *
 * **A native `<details>`, closed by default, on every entry** — the shape #593 specifies, for
 * the kit's reason (§3.7/#478): twelve of these open is a page nobody skims, and native means
 * the page keeps its zero client boundaries and a crawler receives every link already written
 * out. The summary is a grid inside the `<summary>` and draws its own marker, because a
 * `<summary>` lays the native one on the first line box of its content, which a grid child is
 * not — `.kit-summary` measured this and this row is the same shape.
 */
function PresetRow({ entry }: { entry: PresetEntry }) {
  return (
    <li>
      <details className="disclosure preset-entry">
        <summary>
          <span className="preset-summary">
            <span className="preset-marker" aria-hidden="true" />
            <PatchName entry={entry} />
            <span className="preset-use">{entry.use}</span>
          </span>
        </summary>
        <div className="disclosure-body">
          <PresetBody entry={entry} />
        </div>
      </details>
    </li>
  )
}

/**
 * The panel. Renders nothing at all without a session, which is every box but one today: no
 * heading over an empty list, no note saying there is nothing, because the absence of a claim
 * is not a claim (invariant 5).
 */
export function PresetSection({ session }: { session: PresetSession | undefined }) {
  if (session === undefined) return null
  return (
    <section className="panel span-2 preset-section">
      <header>
        <h2>{PRESET_HEADING}</h2>
        <p className="note">{PRESET_LEAD}</p>
      </header>
      <ul className="preset-list">
        {session.entries.map((entry) => (
          <PresetRow key={shippedPatchKey(entry.patch)} entry={entry} />
        ))}
      </ul>
      {/*
        §2.6/#593. **The same list, laid open, on a page of its own** — `kitHref`'s argument,
        one section over. Somebody who has decided to work through the patches wants every
        figure link in front of them on one address they can send to a phone.
      */}
      <p className="preset-open">
        <Link href={presetsHref(session.device)}>Open every patch, with the figure for each</Link>
      </p>
    </section>
  )
}
