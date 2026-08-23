import type { DownloadFile, StudioEnv } from './session'

/**
 * The only file in the codebase that names `window`.
 *
 * Everything it hands over is a thunk, so nothing is touched until something in an effect or an
 * event handler asks for it. Calling `browserEnv()` during render would therefore be harmless,
 * but it is still never done — `components/studio.tsx` builds it inside effects, and
 * `test/studio-render.test.ts` renders in Node, where a stray `window` read throws rather than
 * producing a hydration mismatch that only shows up in someone's console.
 *
 * `localStorage` and `clipboard` are read through `?.` and inside the session module's `try`,
 * because reaching for either can throw on access alone — blocked site data for the first, an
 * insecure context for the second.
 */
export function browserEnv(): StudioEnv {
  return {
    storage: () => (typeof window === 'undefined' ? undefined : window.localStorage),
    location: () => (typeof window === 'undefined' ? undefined : window.location),
    history: () => (typeof window === 'undefined' ? undefined : window.history),
    clipboard: () => (typeof navigator === 'undefined' ? undefined : navigator.clipboard),
    download: () => (typeof document === 'undefined' ? undefined : saveFile),
    print: () => (typeof window === 'undefined' ? undefined : () => window.print()),
  }
}

/**
 * The anchor-and-blob dance, in the one place allowed to know about it. There is no browser API
 * for "save this text", so this is the standard construction: a blob URL, a synthetic click, and
 * a revoke afterwards.
 *
 * The revoke is deferred a tick rather than run inline. Revoking a blob URL in the same task as
 * the click cancels the download outright in some browsers — the URL is gone before the download
 * has read it — and the failure is silent, which is the worst kind here: the user watched a
 * button do nothing.
 */
function saveFile(file: DownloadFile): void {
  const blob = new Blob([file.text], { type: file.type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = file.name
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
