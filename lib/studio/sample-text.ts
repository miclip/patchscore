import type {
  ContentNotice,
  Device,
  SampleGap,
  SampleTarget,
  SampleVoicing,
} from '@/lib/core'
import { citationSentence, count, resolvedClaims } from '@/lib/core'
import type { RecordingDestination } from './destination'

/**
 * §3.8/#495/#520. **Everything a sound page says in words, in one place, because two renderings
 * say them.**
 *
 * `kit-text.ts`' and `riff-text.ts`' job for the surface beside them: the Markdown export and the
 * React page are *siblings*, and a sentence that exists twice is a sentence two people can edit
 * half of. So the prose lives here once and each renderer supplies only its own emphasis —
 * backticks on one side, `.mono` on the other.
 *
 * **Nothing here names a device from the catalogue.** A sample target names no device (invariant
 * 3); every box name on the page comes from the reader's own rig and arrives as a `Device`.
 *
 * **The content sentences are this surface's own** (#33). `contentNotice` decides which state a
 * box is in and the words are written here, exactly as `phase-sound.tsx` and `render.ts` each
 * write their own: the guide's say *the parts below name entries from it*, and there are no parts
 * here — one sound, and a reader who has just been told their box cannot make it.
 */

// ---------------------------------------------------------------------------
// Titles and the header
// ---------------------------------------------------------------------------

/** The page's title and the document's `# ` heading — one string, so a tab and a print agree. */
export function sampleTitle(target: SampleTarget): string {
  return target.name
}

/**
 * The one sentence a search result shows.
 *
 * **Two things to do, rather than a list of what the page contains.** What a reader came for is to
 * get the sound out of the gear on their desk and end up with a file that is theirs.
 *
 * Not on the index card. Twenty-four cards each saying *Make an X on the boxes you own* is one
 * sentence printed twenty-four times, which distinguishes nothing — see `sampleCardLine`.
 */
export function sampleDescription(target: SampleTarget): string {
  const name = target.name.toLowerCase()
  return `Make ${article(name)} ${name} on the boxes you own, then record it as a sample.`
}

/**
 * `a` / `an`, by the sound's own initial. Four of the twenty-four take `an` — open hat, impact,
 * arp, acid — and every one of them is the plain vowel case, so the plain vowel rule is right
 * here and there is no *a unique* to catch it out. A target whose name broke it would be a target
 * that needed a different sentence, not a longer rule.
 *
 * ASCII, so no locale folding (§7.2): target names are ASCII by construction.
 */
function article(name: string): string {
  return 'aeiou'.includes(name.slice(0, 1)) ? 'an' : 'a'
}

/**
 * §3.8. **What one card says under the name**, which is the first thing the page itself says.
 *
 * The description above says the same thing about every sound, so on a list of twenty-four it is
 * filler in twenty-three places. The first line of the prose is this sound's own: *Record one hit
 * and keep the whole tail*, *One long take, then two files cut from it*, *A wobble is movement
 * under a held note*. It is authored, so it is a sentence somebody wrote for this sound rather
 * than one generated about it.
 */
export function sampleCardLine(target: SampleTarget): string {
  return target.technique[0] ?? ''
}

/** `kick · hard`. The two vocabulary facts, and the whole of what a target is besides prose. */
export function sampleLead(target: SampleTarget): string {
  return `${target.role} · ${target.character}`
}

/**
 * §3.7/#520. **What to call the file**, derived from the target and never authored.
 *
 * `KICK`, `WOBBLE BASS`. A slot name is what a reader writes on a pad, a file or a strip of tape,
 * and `KitSlot.name`'s reasoning applies unchanged: a name a device folder could set would be a
 * device naming something outside its own capabilities. Unnumbered, unlike a kit slot, because a
 * kit is a list of sounds where one role appears twice and this page is one sound.
 *
 * ASCII upper case, never `toLocaleUpperCase`: target ids are ASCII by construction and a
 * locale-aware fold is the class of call §7.2 forbids.
 */
export function sampleFileName(target: SampleTarget): string {
  return target.id.replace(/-/g, ' ').toUpperCase()
}

// ---------------------------------------------------------------------------
// The destination, and what to do when the sound exists
// ---------------------------------------------------------------------------

/**
 * §3.7/§3.8. **The destination, once: the reader's own gear.**
 *
 * An instruction rather than a statement about what this page declines to do. This surface knows
 * the rig, and that still does not tell it which box records — see `destination.ts`, which says
 * why knowing what somebody owns is not knowing what samples.
 *
 * **A function of the typed destination rather than a bare string**, and that is what makes
 * `RecordingDestination`'s discriminant worth having on this surface. The day a device folder
 * states a recording capability and an in-rig arm exists, the compiler comes here first; a
 * constant would have let the new arm print the reader's own recorder instead.
 *
 * Its own sentence rather than `KIT_DESTINATION` imported, because the two say different things
 * about number: a kit session is twelve sounds and *each hit* is the instruction, and this is one.
 */
export function sampleDestination(destination: RecordingDestination): string {
  switch (destination.kind) {
    case 'reader-supplied':
      return 'Record it with the sampler, recorder, or DAW you use.'
  }
}

/** The action that ends the page, up to the file name — which each renderer sets in its own mono. */
export const SAMPLE_RECORD = 'Record it and name it '

// ---------------------------------------------------------------------------
// The voice
// ---------------------------------------------------------------------------

/** `Subsequent 37 · Voice`. The heading both renderings open the sound with. */
export function sampleVoiceHeading(voice: SampleVoicing): string {
  return `${voice.device.name} · ${voice.assignable.label}`
}

/**
 * §3.5. **The character the box actually has, said out loud where it is not the one asked for.**
 *
 * A substitution is legal and silent substitution is not: a reader told to record a dirty wobble,
 * handed a clean patch and given no sentence about it would name the file for a sound it is not.
 */
export function sampleSubstitution(
  target: SampleTarget,
  voice: SampleVoicing,
): string | undefined {
  if (!voice.substituted) return undefined
  return (
    `This asks for a ${target.character} ${target.role} and the nearest this box authors is ` +
    `${voice.character}.`
  )
}

/**
 * §3.2/invariant 4. One citation sentence for the block, over the settings this page renders and
 * no others, and no mark or page beside any value. `citationSentence` is §8's own, imported for
 * the reason it is exported: this is one sentence, not two that have to be kept in agreement.
 */
export function sampleCitation(voice: SampleVoicing): string | undefined {
  return citationSentence(resolvedClaims(voice.params))
}

// ---------------------------------------------------------------------------
// The gap
// ---------------------------------------------------------------------------

/** How boxes and their voices are named in a gap sentence. `riff-text.ts`' `voiceNames` shape. */
function voiceNames(
  assignables: readonly { deviceId: string; label: string }[],
  devices: readonly Device[],
): string {
  const nameOf = new Map(devices.map((d) => [d.id, d.name]))
  const byDevice = new Map<string, string[]>()
  for (const a of assignables) {
    const labels = byDevice.get(a.deviceId)
    if (labels === undefined) byDevice.set(a.deviceId, [a.label])
    else labels.push(a.label)
  }
  const named = [...byDevice].map(([deviceId, labels]) => {
    const name = nameOf.get(deviceId) ?? deviceId
    return labels.length > 3 ? `${name} (${count(labels.length, 'voice')})` : `${name} ${labels.join('/')}`
  })
  return andList(named)
}

/**
 * `a`, `a and b`, `a, b and c`. `device-page.ts` exports one of these and it is not imported here:
 * that module reaches the whole device registry and every template, and this file is pulled into
 * the browser by the sound page's client island. `riff-text.ts` writes its own for the same
 * reason. No `Intl.ListFormat` and no locale anywhere (§7.2).
 */
function andList(items: readonly string[]): string {
  if (items.length < 2) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1] as string}`
}

/**
 * §3.8/invariant 5. **Why this rig cannot make the sound, said as something to act on.**
 *
 * Four answers and four different actions, which is why `SampleGap` keeps them apart. None of them
 * is a statement about what this library has or has not authored — that is our backlog, and a
 * reader standing at a rack has no use for it.
 *
 * `no-rig` is four words for `riff-text.ts`' reason: *no boxes are picked yet* tells a reader what
 * they have failed to do, and what is left is the thing they can act on.
 */
export function sampleGap(
  target: SampleTarget,
  gap: SampleGap,
  devices: readonly Device[],
): string {
  switch (gap.reason) {
    case 'no-rig':
      return 'Pick the boxes you own.'
    case 'no-capable-voice':
      return `Add a box that makes ${target.role} sounds.`
    case 'loads-audio':
      return (
        `${voiceNames(gap.voices, devices)} plays this from a file rather than making one. ` +
        'Bring a recording, or record one, and load it there.'
      )
    default:
      return `${voiceNames(gap.capable, devices)} could make it. Set this one up by ear.`
  }
}

/**
 * §2.6/#111/#520. **What a box that plays this from a file actually ships**, said where the reader
 * has just been told the rig cannot make the sound.
 *
 * `contentNotice` is the shared decision and these are this surface's words (#33). The guide's
 * sentences point at *the parts below* and at a `Source` line; there are no parts here and no
 * source line, so they would be pointing at nothing.
 *
 * The unsettled state says four different things because #120's states are four different
 * findings: *nobody here has checked* is untrue of three of them.
 */
export function sampleContent(notice: ContentNotice): string {
  switch (notice.state) {
    case 'enumerable':
      return `Ships ${notice.library}, so there may already be one on the box.`
    case 'shipped-library':
      return `Ships ${notice.library} — look in ${notice.location}. ${notice.reason}.`
    case 'user-supplied':
      return 'Ships no factory content for this, so the file is one to bring or record.'
    default:
      break
  }
  const evidence = notice.evidence
  if (evidence !== undefined && evidence !== false) {
    switch (evidence.kind) {
      case 'cited-against':
        return 'Whether it ships anything usable is not established: a document here answers against it.'
      case 'unread':
        return 'Whether it ships anything usable is not established: the document that would say is not in `manuals/`.'
      case 'unknown':
        return 'Whether it ships anything usable is not established: the manual was read and does not say.'
    }
  }
  return 'Whether it ships anything usable has not been checked here.'
}

