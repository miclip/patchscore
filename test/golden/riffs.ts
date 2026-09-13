import { writeFileSync } from 'node:fs'
import { dirname, join, resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Device } from '@/lib/core'
import { resolveRiff } from '@/lib/core'
import { DEVICES } from '@/lib/devices/registry.generated'
import {
  acidTracksLine,
  aegeanOrganPhrygianFigure,
  bladeRunnerBluesLead,
  blueMondayBass,
  museRunnerFloatingArrivalLead,
  polyphonicPowerBrassStabCycle,
  showMeLoveOrganStab,
} from '@/lib/riffs'
import { renderRiff } from '@/lib/studio/riff-markdown'
import type { Riff } from '@/lib/core'

/**
 * §5A. The committed bytes for a riff page. Three fixtures, and between them they cover the
 * shapes this surface has to get right:
 *
 *  - `blue-monday-bass` on a rig that plays it — the technique, the notes, the grid, and one
 *    box's whole patch with its citation sentence.
 *  - `bass-on-a-sampler` — the same figure on a *pool* voice addressed by note, which is a
 *    materially different page: a trigger note, a source to load, and a track rather than a
 *    named voice. Neither of the other two reaches any of it.
 *  - `organ-stab-mono` on a rig that cannot — §7.3's `polyphony` gap, which is the arm a chord
 *    riff reaches and the one a reader is most likely to hit. Invariant 5 is not a thing to test
 *    only in a unit; the sentence a reader gets is bytes like any other.
 *  - `organ-stab-stacked` on a rig that plays the same chord by spreading it one note per voice
 *    across a pool (§12.4/#40). The two chord fixtures are a pair on purpose: the difference
 *    between them is *a pool*, and before #503's second fix the second of them reported the
 *    first's gap.
 *
 * **Never regenerate a golden to make a test pass.** The diff is the review.
 */

const rig = (...ids: string[]): readonly Device[] =>
  ids.map((id) => {
    const device = DEVICES.find((d) => d.id === id)
    if (device === undefined) throw new Error(`no device ${id}`)
    return device
  })

export const RIFF_NAMES = [
  'blue-monday-bass',
  'bass-on-a-sampler',
  'organ-stab-mono',
  'organ-stab-stacked',
  'acid-on-a-mother-32',
  'blade-runner-on-a-muse',
  'muse-runner-on-a-muse',
  'brass-stab-cycle-on-a-muse',
  'aegean-organ-on-a-muse',
] as const
export type RiffName = (typeof RIFF_NAMES)[number]

type Fixture = { riff: Riff; devices: readonly Device[] }

const FIXTURES: Record<RiffName, () => Fixture> = {
  // A small studio rig: a mono synth that authors a hard bass, a tracker, and a drum machine.
  'blue-monday-bass': () => ({
    riff: blueMondayBass,
    devices: rig('moog-subsequent-37', 'polyend-tracker-mini', 'roland-tr-8s'),
  }),
  // A sampler alone. `blue-monday-bass` lands on a track rather than on a named voice, so this
  // is the fixture that carries the trigger note — the bridge between the figure's scientific
  // pitch notation and a box that puts middle C somewhere else (#32).
  'bass-on-a-sampler': () => ({
    riff: blueMondayBass,
    devices: rig('elektron-digitakt-ii'),
  }),
  // Two monosynths. Both play `stab`; neither sounds three notes at once, and there are only two
  // voices between them — so the sentence is the one that says there is nothing to spread it
  // across, rather than the one that tells a reader to stack it by hand.
  'organ-stab-mono': () => ({
    riff: showMeLoveOrganStab,
    devices: rig('behringer-crave', 'moog-mother-32'),
  }),
  // §12.4/#40. Eight interchangeable tracks. No one of them sounds three notes, and the pool
  // spreads the chord across three — which is a *played* page with a stack, not a gap.
  'organ-stab-stacked': () => ({
    riff: showMeLoveOrganStab,
    devices: rig('polyend-tracker-mini'),
  }),
  /*
   * §5A/#511. **The one riff fixture that renders a routing**, and it had to be added rather than
   * found: none of the four above lands on a recipe carrying one, so this page's modulation branch
   * was pinned by no committed bytes anywhere. A shape with no golden is a shape a renderer change
   * can quietly lose, which is what these files exist to catch.
   *
   * The Mother-32 because it is the only box whose riff-role recipes carry one, and because it
   * renders the shape whole: two switches on the VCO block, and on the VCF block a source switch,
   * a sign switch and a destination the panel gives no say in. A reader is told which control to
   * set at every one of them, which is what this fixture is really pinning — the three parameters
   * the typed shape replaced each named their control, and collapsing them must not cost that.
   */
  'acid-on-a-mother-32': () => ({
    riff: acidTracksLine,
    devices: rig('moog-mother-32'),
  }),
  /*
   * §5A/§4.1. **The one riff fixture with chords and with altered degrees**, and the two go
   * together: the notes print `degree #3` and `degree #6`, and the chord table is the only thing
   * on the page that says why they are raised. Neither shape existed in committed bytes before
   * this entry, so both were a renderer change away from being lost silently.
   *
   * The Muse because it authors `lead` at `bright` exactly — the figure lands rather than
   * substituting, which keeps the fixture about the chords and the spelling rather than about
   * §3.5. It is also the sparsest page here by a distance: three notes in four bars.
   */
  'blade-runner-on-a-muse': () => ({
    riff: bladeRunnerBluesLead,
    devices: rig('moog-muse'),
  }),
  /*
   * §5A.5/#566. **The one riff fixture named after a factory patch.** The title and the card
   * line carry a preset's name where every other fixture carries a record's, and the build
   * sentence reads the same over both, which is the claim §5A.5 makes and these bytes pin.
   *
   * On the Muse because it is the box that ships the patch, and because its `lead / bright`
   * recipe names the same patch as `factoryPatch`: the page therefore shows both facts at once,
   * the riff's reference in its title and the recipe's patch on its settings, and the fixture is
   * what says the two are rendered as different things.
   */
  'muse-runner-on-a-muse': () => ({
    riff: museRunnerFloatingArrivalLead,
    devices: rig('moog-muse'),
  }),
  /*
   * §5A.5/#569. **A chord riff that also carries a chord table**, on one polyphonic voice. The
   * two chord fixtures above spread a chord across a pool or report a gap; neither lands a
   * two-note voicing on a single voice that can sound it, and neither prints a chord table
   * beside notes that share a step. This page does both, and it is the fixture where the
   * `RIFF_CHORDS_SUPPLIED` sentence sits under a table whose chords the stab plays the top of.
   *
   * On the Muse because it is the box that ships the patch, and the page does *not* land on
   * it: the `stab / hard` recipe that names `Polyphonic Power` is a unison stack the box plays
   * one note at a time (#383, `patchPolyphony: 1`), so a two-note stab cannot take it and §3.5
   * substitutes the polyphonic `bright` one. The bytes therefore pin three things at once: the
   * substitution sentence, a settings block naming a *different* factory patch from the one in
   * the title, and both read beside each other without contradiction, because the title is the
   * idiom and the settings are the sound.
   */
  'brass-stab-cycle-on-a-muse': () => ({
    riff: polyphonicPowerBrassStabCycle,
    devices: rig('moog-muse'),
  }),
  /*
   * §5A.5/#569. **The one riff in a mode that is neither major nor minor.** `D phrygian` reaches
   * the page in the lead line, the notes sentence and the chord summary, and the figure's three
   * rules print `raised 2nd` over three chords, one of them `II`. No other fixture carries a
   * modal key or a rule that repeats across the whole progression.
   *
   * On the Muse because it authors `lead / bright` exactly, so the page is about the mode and
   * not about §3.5. That recipe names `Muse Runner` as its factory patch, so this page too
   * carries one patch in its title and another on its settings, which is the shape
   * `muse-runner-on-a-muse` pins from the other side: there the two are the same name.
   */
  'aegean-organ-on-a-muse': () => ({
    riff: aegeanOrganPhrygianFigure,
    devices: rig('moog-muse'),
  }),
}

/** The rendered page for one fixture name. Pure — the same bytes on every call. */
export function riffText(name: RiffName): string {
  const { riff, devices } = FIXTURES[name]()
  return renderRiff(resolveRiff(riff, devices))
}

const THIS_FILE = fileURLToPath(import.meta.url)
const HERE = dirname(THIS_FILE)

export function riffPath(name: RiffName): string {
  return join(HERE, `${name}.riff.golden.md`)
}

if (process.argv[1] !== undefined && resolvePath(process.argv[1]) === THIS_FILE) {
  const argv = process.argv.slice(2)
  if (argv.includes('--write')) {
    for (const name of RIFF_NAMES) {
      const path = riffPath(name)
      writeFileSync(path, riffText(name))
      process.stderr.write(`wrote ${path}\n`)
    }
  } else {
    const wanted = RIFF_NAMES.find((name) => argv.includes(name))
    if (wanted === undefined) {
      process.stderr.write(`usage: riffs.ts --write | ${RIFF_NAMES.join(' | ')}\n`)
      process.exit(2)
    }
    process.stdout.write(riffText(wanted))
  }
}
