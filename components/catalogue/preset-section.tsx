import Link from 'next/link'
import type { Device } from '@/lib/core'
import { shippedPatchKey } from '@/lib/core'
import { presetFigureHref, presetsHref } from '@/lib/studio/catalogue'
import type { PresetEntry, PresetSession } from '@/lib/studio/preset-session'
import { PRESET_FIGURE, PRESET_HEADING, presetLead } from '@/lib/studio/preset-text'

/**
 * §2.6/#593. **The factory patches a box ships, what each is for, and the figure written for
 * it.** Nothing about a recipe (#598).
 *
 * A preset belongs to one box and a riff is rig-agnostic, and six issues came out of pushing
 * the first through the second. On a device page it is no exception to anything: a Muse page
 * listing Muse patches is a box describing itself, which is what a device page is for. The
 * figure is a page under this box (`presetFigureHref`, #598), and the riff behind it carries
 * nothing about the box (invariant 3): the session found it by the patch its reference names.
 *
 * **Rendered from `presetSession` and nothing else.** The session is `undefined` on every box
 * that has not declared both the patch list and what each is for, and this renders nothing for
 * it: no panel, no heading, no claim (the kit's rule, §3.7). A folder that declares both gets
 * the panel and the page at `presetsHref` with no UI edit (invariant 2).
 *
 * **The order is the folder's.** A maker's printed order is a slot order, so there is nothing
 * to follow even where one exists, and the folder that authored the list has said which patches
 * a reader would compare and put them together. Nothing here sorts.
 *
 * **One row per use, and no row for a patch without one** (#617). The session carries an entry
 * per `patchUses` line, so a declared patch nobody described is absent rather than blank. What
 * the lead says about the count depends on where the list came from (`presetLead`): the Muse's
 * twelve came off a unit and the panel says nothing about the rest, by operator decision (#593);
 * a list off a manual page states the total the manual names and how many are here.
 */

/**
 * The name as the box prints it, with its bank where one was read and where it sat where
 * somebody looked.
 *
 * **One element, not a fragment, because `.preset-summary` is a grid** (#621). A fragment put the
 * name and the bank in adjacent cells: on a phone the bank landed in the 1.1em marker gutter and
 * rendered one letter per line, and above 640px it took the column the use was declared in. The
 * minilogue xd is the first device to carry a `bank`, so nothing rendered here until it did.
 *
 * **The address is a hint beside the name, not part of it** (#629). The name is the ink a reader
 * scrolls a bank for (§3.2), and the address is how they skip the scroll: `9.11` on a Subsequent
 * 37 is BANK 9, PRESET 11, which is what those two buttons take. It sits after the bank, in the
 * value face, dim, and unbreakable, since an address split across lines is two numbers. It is
 * inside the same shrinkable cell as the name so the two travel together, and it is nothing
 * else: not in the name, not in the link, not in a key. A device that carries none renders
 * none, and nothing on the page says so.
 *
 * All three surfaces call this: the panel, the presets page and the figure page's patch line.
 * The panel and the page had the same markup written out twice and only the grid one broke,
 * which is the argument for there being one copy of it.
 */
export function PatchName({ entry }: { entry: PresetEntry }) {
  return (
    <span className="preset-title">
      <span className="preset-name">{entry.patch.name}</span>
      {entry.patch.bank === undefined ? null : (
        <span className="preset-bank mono">{entry.patch.bank}</span>
      )}
      {entry.patch.slot === undefined ? null : (
        <span className="preset-slot mono">{entry.patch.slot}</span>
      )}
    </span>
  )
}

/**
 * What is inside one patch: the figure written for it, and nothing else. Shared by the folded
 * panel and the open page, on `KitBody`'s pattern (§3.7): one React reading of an entry, so a
 * reader moving between the two never finds the same fact described two ways.
 *
 * **No line about a recipe** (#598, operator decision). One stood here twice, and both times
 * it read as an instruction to build the thing the entry had just said to load; see
 * `preset-text.ts`. A preset entry is the name, what it is for, and the figure.
 *
 * The figure link goes to the page under this box (#598), which carries the figure and this
 * box's settings for it. `device` is the session's, passed so the href is built by the one
 * function the sitemap and the page's canonical use.
 */
export function PresetBody({ device, entry }: { device: Device; entry: PresetEntry }) {
  return (
    <>
      {entry.figure === undefined ? null : (
        <p className="preset-figure">
          {PRESET_FIGURE}
          <Link href={presetFigureHref(device, entry.patch)}>{entry.figure.riff.name}</Link>
        </p>
      )}
    </>
  )
}

/**
 * One patch in the panel: closed, it is the name and what it is for; open, it is the figure
 * written for it.
 *
 * **A native `<details>`, closed by default, on every entry** — the shape #593 specifies, for
 * the kit's reason (§3.7/#478): twelve of these open is a page nobody skims, and native means
 * the page keeps its zero client boundaries and a crawler receives every link already written
 * out. The summary is a grid inside the `<summary>` and draws its own marker, because a
 * `<summary>` lays the native one on the first line box of its content, which a grid child is
 * not — `.kit-summary` measured this and this row is the same shape.
 */
function PresetRow({ device, entry }: { device: Device; entry: PresetEntry }) {
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
          <PresetBody device={device} entry={entry} />
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
        <p className="note">{presetLead(session)}</p>
      </header>
      <ul className="preset-list">
        {session.entries.map((entry) => (
          <PresetRow key={shippedPatchKey(entry.patch)} device={session.device} entry={entry} />
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
