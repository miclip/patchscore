import { Studio } from '@/components/studio'

/**
 * Build step 8 (#10) — the input surface: device picker, genre picker, seed, mood.
 *
 * A server component wrapping one client island. The inputs are all client state and
 * `resolve` is pure and fast enough to run on every change (single-digit ms for a
 * three-device rig), so there is no server work to do and nothing to fetch.
 */
export default function Page() {
  return <Studio />
}
