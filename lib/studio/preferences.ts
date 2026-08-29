import type { GuideLayout, StorageLike, StorageSource } from '@/lib/core'
import { GUIDE_LAYOUTS } from '@/lib/core'

/**
 * #138. How the picker draws its controls, as a per-browser preference.
 *
 * Patch cables are the point of the picker and they are also a strong opinion. Someone who finds
 * a socket less legible than a tick box should be able to say so, and get a plain checkbox back
 * — the control underneath is the same either way, which is exactly why this can be a preference
 * rather than a fork.
 *
 * ## It is not an input
 *
 * **Nothing here reaches `GuideInputsV1`.** This is the same rule the picker's search and kind
 * filter already keep (#53): a question about how the page looks is not a change to the rig, so
 * it cannot touch the permalink, cannot change a byte of the guide, and cannot make two people
 * opening one link see different scores. Invariant 6 is about inputs and seed; a stylesheet is
 * neither.
 *
 * That is why it is stored under its own key rather than inside the studio document. The studio
 * is what you built; this is how you like looking at it, and a permalink should carry the first
 * and not the second.
 *
 * ## Nothing here throws
 *
 * The same discipline `studio-store` sets out: `localStorage` is absent under SSR, throws
 * `SecurityError` on mere access when site data is blocked, and can hold whatever a user or
 * another script left in the key. Every one of those is an ordinary outcome — a preference that
 * cannot be read is simply the default, because a page that refuses to render over a stylesheet
 * choice would be a far worse bug.
 */

export const JACK_STYLE_KEY = 'patchscore:jacks'

export const JACK_STYLES = ['cables', 'plain'] as const
export type JackStyle = (typeof JACK_STYLES)[number]

/** Cables are the default: it is what the picker is for, and #138 is the reason it exists. */
export const DEFAULT_JACK_STYLE: JackStyle = 'cables'

function isJackStyle(value: string | null): value is JackStyle {
  return value !== null && (JACK_STYLES as readonly string[]).includes(value)
}

/** Anything unreadable, unrecognised or absent is the default. There is no error state. */
export function readJackStyle(source: StorageSource): JackStyle {
  try {
    const storage: StorageLike | null | undefined = source()
    if (storage === null || storage === undefined) return DEFAULT_JACK_STYLE
    const raw = storage.getItem(JACK_STYLE_KEY)
    return isJackStyle(raw) ? raw : DEFAULT_JACK_STYLE
  } catch {
    return DEFAULT_JACK_STYLE
  }
}

/** Reports whether it stuck, so a caller may say so; never throws. */
export function writeJackStyle(source: StorageSource, style: JackStyle): boolean {
  try {
    const storage = source()
    if (storage === null || storage === undefined) return false
    storage.setItem(JACK_STYLE_KEY, style)
    return true
  } catch {
    return false
  }
}

/**
 * The attribute the stylesheet keys on, set on `<html>`.
 *
 * A **CSS** switch rather than a React one, and deliberately: the preference is read by an inline
 * script before first paint, so a reader who chose plain checkboxes never sees a socket flash
 * into one. Reading it during render instead would either mismatch hydration — the server cannot
 * know it — or require a second paint, which is the flash.
 */
export const JACK_STYLE_ATTR = 'data-jacks'

/**
 * The inline script, as a string, for the document head.
 *
 * Kept here beside the key it reads so the two cannot drift, and written defensively because it
 * runs before anything else on the page: a throw here would take the document with it.
 */
export const JACK_STYLE_SCRIPT = `try{var s=localStorage.getItem('${JACK_STYLE_KEY}');if(s==='plain'||s==='cables'){document.documentElement.setAttribute('${JACK_STYLE_ATTR}',s)}}catch(e){}`

/**
 * §8/#230. **Which way the guide opens**, as a per-browser preference.
 *
 * The same shape as the jack style above and for the same reasons, but the split between this and
 * the studio's own control is worth stating, because there are two things here and only one of
 * them is a preference.
 *
 * - **This is the default**, set on the Preferences page and stored. It is what a guide opens as.
 * - **The studio's `Read:` control is a per-visit override.** It starts from this and changes only
 *   what is on screen now. It deliberately does *not* write back: trying one layout on one guide
 *   is a thing a reader does mid-session, and silently making it the new default would mean the
 *   setting drifts every time somebody looks at the other one.
 *
 * That is the difference between "how I read guides" and "how I want to read this one", and the
 * two live in different places on purpose — the second is not a smaller version of the first.
 *
 * Nothing here reaches `GuideInputsV1`, so it cannot enter a permalink and cannot change a byte of
 * a guide. Layout is a rearrangement: `guide-layout.test.ts` holds the two renderings to the same
 * content, so this is a question about the page and not about the score.
 */
export const GUIDE_LAYOUT_KEY = 'patchscore:guide-layout'

/**
 * §8's order is the default, and stays it until somebody has read a session's worth of the other
 * one at a rack. #240 is where that decision is recorded.
 */
export const DEFAULT_GUIDE_LAYOUT: GuideLayout = 'phase'

function isGuideLayout(value: string | null): value is GuideLayout {
  return value !== null && (GUIDE_LAYOUTS as readonly string[]).includes(value)
}

/** Anything unreadable, unrecognised or absent is the default. There is no error state. */
export function readGuideLayout(source: StorageSource): GuideLayout {
  try {
    const storage: StorageLike | null | undefined = source()
    if (storage === null || storage === undefined) return DEFAULT_GUIDE_LAYOUT
    const raw = storage.getItem(GUIDE_LAYOUT_KEY)
    return isGuideLayout(raw) ? raw : DEFAULT_GUIDE_LAYOUT
  } catch {
    return DEFAULT_GUIDE_LAYOUT
  }
}

/** Reports whether it stuck, so a caller may say so; never throws. */
export function writeGuideLayout(source: StorageSource, layout: GuideLayout): boolean {
  try {
    const storage = source()
    if (storage === null || storage === undefined) return false
    storage.setItem(GUIDE_LAYOUT_KEY, layout)
    return true
  } catch {
    return false
  }
}
