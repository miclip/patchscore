import type { StorageLike, StorageSource } from '@/lib/core'

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
