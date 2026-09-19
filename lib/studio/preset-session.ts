import type {
  Device,
  PatchUse,
  Riff,
  RiffResolution,
  RiffVoicing,
  ShippedPatch,
} from '@/lib/core'
import {
  FACTORY_PATCHES_FACT,
  isCite,
  keyboardPlacement,
  keyboardReachRange,
  keyboardWindow,
  patchUseIssues,
  resolveRiff,
  shippedPatchKey,
} from '@/lib/core'
import { RIFFS } from '@/lib/riffs'
import { presetSlug } from './catalogue'

/**
 * §2.6/#593, §3.7/#598. **A preset session: the factory patches one box ships, what each is
 * for, and the figure written for it, resolved on this box.**
 *
 * Pure, and a view model rather than a renderer, on the pattern of `kitSession` (§3.7/#478):
 * nothing here draws anything. A device folder has already declared the fact
 * (`Device.factoryPatches`, #592) and the judgement beside it (`Device.patchUses`), and this
 * adds the two joins a reader looking down that list needs and the folder does not carry:
 *
 *  - **which figure was written for it** — the riff whose `reference` is of kind `patch` and
 *    names it (§5A.5), where one was: a use may stand without a figure (#617, #643), and the
 *    entry then carries none.
 *  - **where that figure lands on this box** — `resolveRiff` against this one device (#598),
 *    which is the one thing here that resolves, and it resolves so the page at
 *    `presetFigureHref` can render the box's settings with no rig in the reader's hands.
 *
 * **No recipe join, by operator decision (#598).** `Recipe.factoryPatch` says a recipe's
 * parameters reach a sound the box also ships, and the session used to carry the recipes
 * naming each patch so the surfaces could print a line about them. Every wording of that line
 * read as an instruction to build the thing the page had just said to load, so the surfaces
 * print nothing about a recipe and the session carries none: a field nothing reads is a field
 * that comes back. The claim itself stays on the recipe and renders on a guide, which is the
 * surface it was written for.
 *
 * **The riff join points from the device to the riff and never back.** A riff names no box
 * (invariant 3) and gains no field here; it names a patch, and a box that ships a patch by that
 * name is where the figure surfaces. That is the whole architectural point of the surface
 * (#593, #598): a preset belongs to one box, and the box is where it is listed and read.
 *
 * **A figure the box cannot play is an authoring error, and it throws here** (#598). A riff
 * page resolves against whatever the reader owns and reports §7.3's gap honestly, because the
 * page cannot know the rig. This surface knows the box, since the box is the page: a figure
 * written for a patch, on the box that ships the patch, landing nowhere on it is a fact about
 * the library and not about the reader, and it is caught at the build rather than rendered as a
 * gap nobody standing at the box can act on. `PresetFigure.resolution` is therefore `played`
 * by construction, and the outcome never narrows again downstream. A figure the box's keyboard
 * cannot reach is the same class and throws in the same place (§4.1/#659); see `figureFor`.
 *
 * **What it is not**, and each is a boundary rather than an omission:
 *
 *  - **No song.** No mood, no arrangement, no rig, no direction. A preset is a sound the box
 *    ships, and this page is reached with none of those in hand.
 *  - **No entry for a patch without a use** (#617). `patchUses` may cover a subset of
 *    `factoryPatches`, and the session carries an entry per use and none for the rest: a row
 *    with a name and nothing under it is not an entry, so an undescribed patch is absent from
 *    the list rather than present and blank. What the session does carry is `named`, the count
 *    the box declares, and `reading`, whether that count came off a page or off a unit, because
 *    the two support different sentences. A page names the box's total, so the lead can say
 *    *the manual names 200* and how many are here. A unit reading is as wide as whoever read
 *    it, so the Muse's twelve are twelve and not twelve of anything; the lead for an observed
 *    reading says no count (operator decision, #593), since a denominator there would be the
 *    library's authoring state and not a fact about the box.
 *  - **No ordering.** The entries come in the order the folder authored them, and the folder
 *    says why (the Muse's `PATCH_USES`). A printed order is a slot order, so even where a
 *    maker prints one there is nothing to follow, and a sort here would overrule the one place
 *    that has thought about which patches a reader would compare.
 */

/**
 * §3.7/#598. **The figure written for a patch, on the box that ships it.**
 *
 * `resolution` is `resolveRiff` against this device alone and is `played` by construction; see
 * `presetSession`. `voice` is the same object as `resolution.voice`, named so a renderer does
 * not narrow a union that never widens. Nothing here says whether the recipe the figure landed
 * on names this patch: the page prints the settings because a reader may want to see or tweak
 * what the preset does, and that needs no sentence arguing for it (#598).
 */
export type PresetFigure = {
  riff: Riff
  resolution: RiffResolution & { outcome: 'played' }
  voice: RiffVoicing
}

/** §2.6/#593. One shipped patch: the fact, the judgement, and the figure written for it. */
export type PresetEntry = {
  /** The name and bank as the box prints them — `Device.factoryPatches`' own object. */
  patch: ShippedPatch
  /** `presetSlug(patch)`: the segment the figure page is addressed by. Unique per session. */
  slug: string
  /** What it is for, in the folder's words — `PatchUse.use`. */
  use: string
  /** The figure written for this patch, where a riff's `reference` names it, on this box. */
  figure?: PresetFigure
}

/** §2.6/#593. What one box offers somebody exploring the patches it ships. */
export type PresetSession = {
  device: Device
  /** `Device.patchUses` order, one entry each; a declared patch with no use has none (#617). */
  entries: readonly PresetEntry[]
  /** How many patches `Device.factoryPatches` declares, described or not. */
  named: number
  /**
   * What the declared list came off (#617). `manual`: a page prints the names, so `named` is
   * the box's total and a surface may say so. `observed`: somebody read them off a unit, so
   * `named` is how many were read and says nothing about the box's total.
   */
  reading: 'manual' | 'observed'
}

/**
 * §2.6/#593. **The riff written for a patch, by name.**
 *
 * `Riff.reference` carries a name and no bank, so the match is on the name alone, and it is a
 * name join rather than a device join: a second box shipping a patch called *Vox Humana* would
 * reach the same figure, which is right, because the figure is named for the patch and not for
 * the box. **Two riffs naming one patch is refused rather than resolved**: a link is to *the*
 * figure written for a patch, and which of two that should be is an authoring decision, so it
 * throws here and `test/preset-session.test.ts` sees it before a page does.
 */
function riffFor(patch: ShippedPatch, riffs: readonly Riff[]): Riff | undefined {
  const matches = riffs.filter(
    (riff) => riff.reference.kind === 'patch' && riff.reference.name === patch.name,
  )
  if (matches.length > 1) {
    throw new Error(
      `factory patch '${patch.name}' is the reference of ${matches.length} riffs (${matches.map((r) => r.id).join(', ')}); a preset links to one figure, so decide which`,
    )
  }
  return matches[0]
}

/**
 * §3.7/#598. **One figure, on the one box.** `resolveRiff` is reused rather than forked: the
 * candidates, the stack planning, §7.1's ranking and the parameter resolution are the same
 * code a riff page runs, handed a rig of one. What narrows is the outcome. A riff page keeps
 * both arms because the rig is the reader's; here a gap means the library wrote a figure for a
 * patch on a box that has no voice for it, and that is thrown as an authoring error so the
 * build fails rather than a page rendering §7.3's sentence at somebody who cannot act on it.
 *
 * A substitution (§3.5) is not a gap and does not throw: the box plays the figure, on the
 * nearest character it authors, and the resolver records which. The page prints no sentence
 * about it — operator decision, #598 — so the settings are the box's nearest recipe for the
 * part, said as such and no more.
 *
 * **A figure the keyboard cannot reach throws here too, and only here** (§4.1/#659). A preset
 * figure is played at the instrument it is named for, by hand, and a keyboard binds hands: a
 * box that declares `keyboardReach` has said how many keys it has and how far its octave and
 * transpose controls move them, and a figure whose span is wider than the board, or whose notes
 * sit where no setting of those controls reaches, is one nobody standing at the box can play.
 * That is the same class as a figure with no voice for it, the library's error and not the
 * reader's, and it fails the build for the same reason. `resolveRiff` against a rig the reader
 * ticked is left alone on purpose, and so is a guide: the same keyboard's oscillators track
 * notes 18 to 116 over MIDI (the Subsequent 37's p.61), a riff page cannot know whether the
 * part will be fingered or sequenced, and a recipe states values rather than pitches. A box
 * that declares no reach is checked against nothing, as with `middleC`.
 */
function figureFor(device: Device, patch: ShippedPatch, riff: Riff): PresetFigure {
  const resolution = resolveRiff(riff, [device])
  if (resolution.outcome !== 'played') {
    throw new Error(
      `${device.id}: '${riff.id}' is written for factory patch '${patch.name}' and the box cannot play it (${resolution.gap.reason}); a preset figure has to land on the box that ships the patch`,
    )
  }
  const reach = device.keyboardReach
  if (reach !== undefined && resolution.notes.outcome === 'resolved') {
    const midi = resolution.notes.hook.notes.map((n) => n.midi)
    if (midi.length > 0) {
      const lo = Math.min(...midi)
      const hi = Math.max(...midi)
      if (keyboardPlacement(reach, lo, hi) === undefined) {
        const window = keyboardWindow(reach)
        const range = keyboardReachRange(reach)
        const why =
          hi - lo > window.hi - window.lo
            ? `spans ${String(hi - lo)} semitones on a board of ${String(reach.keys)} keys, which moves but does not widen`
            : `sits at MIDI ${String(lo)}-${String(hi)}, and no octave or transpose setting puts both ends on the keys (the board reaches ${String(range.lo)}-${String(range.hi)})`
        throw new Error(
          `${device.id}: '${riff.id}' is written for factory patch '${patch.name}' and the keyboard cannot reach it: it ${why}; a preset figure is played by hand at the box that ships the patch (§4.1/#659)`,
        )
      }
    }
  }
  return { riff, resolution, voice: resolution.voice }
}

/**
 * §2.6/#593. **The session for one box, or `undefined` where the box has not declared both
 * halves.**
 *
 * `undefined` rather than an empty session, for the kit's reason (§3.7): a page that says *here
 * are the patches worth knowing* over nothing is a claim made in the negative. The same answer
 * for a box with the fact and no judgement — `factoryPatches` and no `patchUses` — because a
 * list of names with nothing under them is a list a reader can already get off the box.
 *
 * Throws where the two declarations disagree. `DeviceSchema` refuses that at authoring time, so
 * a device built past it is the only way to reach the throw, and the throw is what keeps a
 * mismatched list from rendering with a row missing.
 */
export function presetSession(
  device: Device,
  riffs: readonly Riff[] = RIFFS,
): PresetSession | undefined {
  const shipped = device.factoryPatches
  const uses = device.patchUses
  if (shipped === undefined || uses === undefined) return undefined

  const issues = patchUseIssues(shipped, uses)
  if (issues.length > 0) {
    throw new Error(`${device.id}: ${issues.map((issue) => issue.message).join('; ')}`)
  }

  // §2.6/#592, #617. `DeviceSchema` admits `manual` and `observed` here and nothing else, so a
  // device built past it is the only way to reach the throw.
  const evidence = device.capabilityEvidence?.[FACTORY_PATCHES_FACT]
  if (evidence === undefined || !isCite(evidence) || evidence.kind === 'maker') {
    throw new Error(
      `${device.id}: factoryPatches is cited '${evidence === undefined || evidence === false ? String(evidence) : evidence.kind}'; a preset session needs a 'manual' page or an 'observed' unit behind the list (§2.6/#617)`,
    )
  }
  const reading = evidence.kind

  const byKey = new Map(shipped.map((patch) => [shippedPatchKey(patch), patch]))
  const entries = uses.map((use: PatchUse): PresetEntry => {
    const key = shippedPatchKey(use)
    // `patchUseIssues` has already refused a key with no patch behind it.
    const patch = byKey.get(key) as ShippedPatch
    const riff = riffFor(patch, riffs)
    const figure = riff === undefined ? undefined : figureFor(device, patch, riff)
    return {
      patch,
      slug: presetSlug(patch),
      use: use.use,
      ...(figure === undefined ? {} : { figure }),
    }
  })

  /*
   * §3.7/#598. Two patches slugging to one address would be one page over two entries, and
   * which of them it showed would be whichever came first in the folder. The slug is the name
   * alone (`presetSlug`), so this is the check that keeps it so, and it throws for the reason
   * the riff-count check above does: before a page does.
   */
  const slugs = new Map<string, string>()
  for (const entry of entries) {
    const other = slugs.get(entry.slug)
    if (other !== undefined) {
      throw new Error(
        `${device.id}: factory patches '${other}' and '${entry.patch.name}' share the address '${entry.slug}'`,
      )
    }
    slugs.set(entry.slug, entry.patch.name)
  }

  return { device, entries, named: shipped.length, reading }
}
