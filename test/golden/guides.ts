import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve as resolvePath } from 'node:path'
import { moodState, renderGuide, resolve, type Device, type Template } from '../../lib/core/index'
import { DEVICES } from '../../lib/devices/registry.generated'
import { droneStudy, industrialTechno, weave } from '../../lib/templates/index'

/**
 * §8's output, pinned as bytes against the **real** device library and the real template.
 *
 * `resolve.golden.json` already pins what the resolver decides; these pin what a reader
 * actually holds. The two catch different regressions: a renderer change that reorders a phase,
 * loses a provenance badge or drops a gap moves not one byte of the resolver golden.
 *
 * Real content, not a fixture rig, because the failure modes that matter here only appear at
 * real scale — forty-odd capable assignables in one gap line, six sections programming
 * identically, a device whose every point is provisional. A hand-built rig small enough to read
 * is a rig too small to show any of that.
 *
 * Eight fixtures, chosen to differ in the thing §8 is worst at. Five are Industrial Techno on five
 * rigs; the last three change template, for the reasons given under them:
 *
 *  - **full-rig** — every registry device, the rig that fills most parts and exercises pool
 *    voices, merged section blocks, a resolved hook and — since #49 — a real patch list.
 *  - **tr-1000** — one drum machine, which cannot carry a tonal part at all. Most of the
 *    template becomes gaps, so this is the fixture that proves invariant 5 renders honestly at
 *    scale rather than only in the one-gap case.
 *  - **rd-9** — another drum machine, and the only fixture here that renders all three of §7.3's
 *    shortfall headings at once. `tr-1000` did until its LT took `bass-mid`, then `tr-6s` did
 *    until #443 gave that box an `open-hat`; the full argument is beside `RD_9` below, because it
 *    is a claim about which absences a guide has to keep showing rather than about the renderer.
 *  - **midi-clock** — Tracker Mini + TR-1000, added with #103/#104 as the one rig here that
 *    resolved onto `midi-din`. `tr-1000` still cannot reach the phase-3 material those issues
 *    added, being a source whose manual prints neither a clock-output menu nor a note on its MIDI
 *    jacks — which was the state these fixtures exist to prevent, since a renderer change that
 *    drops either moves not one byte of the other file.
 *  - **muse** — the Muse alone, added at #414 as the only fixture in which a MIDI CC reaches a
 *    reader. It is the one box in the library that declares `midiCc`, and it renders no parameter
 *    at all in `full-rig`, so before this file the CC suffix was pinned by no committed bytes
 *    anywhere. It carries both shapes that must stay apart — a bare CC with no note, and prose
 *    plus a CC on two different lines. The full argument is beside `MUSE` below.
 *  - **deluge-drone-study** — the Deluge alone, against Drone Study rather than Industrial
 *    Techno, for three things and no others:
 *
 *      1. **One box that fills the direction.** `tr-1000` is the small rig that cannot carry the
 *         direction; this is the small rig that can, and between them they pin §7.3's two answers
 *         at the same scale. Neither half of that is new alone — `full-rig` also renders `### Gaps`
 *         followed by `None.`, and `tr-1000` is also told there is nothing else to sync its clock
 *         to — but no other fixture pairs them, and the pairing is what a one-box owner actually
 *         holds: every part placed, on the only box in the room.
 *      2. **Sections that do not divide the pattern.** Drone Study's sections run 9, 15, 21, 33,
 *         18, 24 and 12 bars against a 16-bar harmonic cycle, so phase 5 opens with "Not every
 *         section is a whole number of repeats, and that is deliberate" and every section line
 *         has to say where the copy is cut — `21 bars — 1 copy of 16 bars, then one cut to 5
 *         bars`. Industrial Techno's sections divide, so all four files above render that
 *         arithmetic's easy case and none of them renders the sentence at all. This is the one
 *         reason that is true nowhere else in this directory.
 *      3. **A deferred part that still has a grid (§4.3).** `texture` resolves to
 *         `drone-hook-upper`, so the hook owns the notes — and Drone Study declares
 *         `reArticulatesHook`, so phase 5 prints the strike map under the pointer rather than
 *         instead of it. That shape exists nowhere else in this directory: `full-rig` and
 *         `midi-clock` pin three plain deferrals each and the two one-box techno guides one
 *         each, where the pointer *replaces* the grid.
 *
 *         It was the opposite claim until §4.3's flag landed — this file pinned the deferral as
 *         the *whole* of the phase, which is what #100 made it and what left the density knob
 *         with nothing to move here. `tracker-mini-drone-study` now pins the same shape on a box
 *         whose envelope has something to say about it.
 *
 *    Nothing else about this fixture is load-bearing. Its key is not F minor, which is a
 *    consequence of running a second template on the shared seed rather than a reason to keep the
 *    file: §4's enharmonic reading is pinned by the four techno guides and by `harmony.test.ts`,
 *    and a fixture that also claimed it would be a claim on bytes nobody would think to check
 *    when this file changed for one of the three reasons above.
 *
 *  - **tracker-mini-drone-study** — the same direction on a box whose envelope has something to
 *    say about the grid the third reason above describes. Its argument is beside `TRACKER_MINI`
 *    below, for the same reason the TR-6S's is beside its own rig: it is one claim about one
 *    device, and it reads where the rig is built.
 *  - **weave-tracker-mini** — §4.1/#339, and the only committed bytes anywhere in which a drum is
 *    tuned to the song's key. The Muse fixture's argument, on a different field: nothing in the
 *    five techno guides can show this, because Industrial Techno's kick is the direction that
 *    deliberately *does not* follow, and Drone Study has no drums at all. Weave on the Mini shows
 *    both halves of the decision on one box and in one file — the tom's `TUNE` moved by the key
 *    with the move printed (`-5 → -1`), the kick's left exactly where its author put it — which is
 *    the distinction #339 is, and a change that started tuning both or neither would move these
 *    bytes and no others in this directory.
 *
 * **`full-rig` used to be the third case and #80 changed that**, which is worth recording because
 * it looks like a fixture losing its purpose. It resolved onto `usb`, because the Metropolix was
 * the library's only `preferredSource` and declares no MIDI DIN. #80 authored the Tracker Mini's
 * claim on p.283, so the full rig now holds two authored preferences, falls through to transport,
 * and lands on `midi-din` — carrying the setup line and the Type B jack note with it. The USB
 * path keeps its unit tests in `render.test.ts` and `guide-view.test.ts`, which construct the rig
 * that no longer occurs in the registry; what the committed bytes cover moved, and grew.
 *
 * Neutral mood on purpose: mood is `resolve.golden.json`'s subject and it is off-centre there.
 * Holding every knob at 50 here means a diff in these files is a *rendering* diff, not §6.1
 * arithmetic reaching the page through a second door.
 *
 * Seed 18 because it resolves `F minor` — the key whose third is `Eb`, so #32's enharmonic
 * reading (`Eb2` beside `D#2`) is exercised by the committed bytes and not by a unit test alone.
 * One seed across all of them, so no fixture has a seed of its own to explain; what it resolves to
 * under a second template is a consequence of that and not a thing this directory pins — the two
 * Drone Study files land on `A phrygian` and neither claims anything by doing so.
 */

const SEED = 18

/** Every knob centred. See above: these fixtures are about rendering, not about mood. */
const MOOD = moodState()

type Fixture = { devices: readonly Device[]; template: Template }

function guide(fixture: Fixture): string {
  const { devices, template } = fixture
  return renderGuide(resolve({ devices, template, mood: MOOD, seed: SEED }))
}

const TR_1000 = DEVICES.filter((d) => d.id === 'roland-tr-1000')

/**
 * #103/#104. Both boxes declare `midi-din`, and since #80 the Tracker Mini is the one that claims
 * `preferredSource` — its manual calls it "a perfect fit for the centre piece of a setup" (p.283).
 * So it drives over MIDI on the authored judgement rather than on `polyend-` sorting before
 * `roland-`, which is the arrangement in which the clock-output menu and the Type B adapter note
 * are both true and both rendered. The bytes did not move when the basis did; that they did not is
 * the point, since §7.4's tie-breaks were already agreeing with the claim here.
 */
const MIDI_CLOCK = DEVICES.filter(
  (d) => d.id === 'polyend-tracker-mini' || d.id === 'roland-tr-1000',
)

/** The one box that can carry a tonal part alone. See `deluge-drone-study` above. */
const DELUGE = DEVICES.filter((d) => d.id === 'synthstrom-deluge')

/**
 * §4.3/§8. The fifth fixture, and the one that pins **a band reaching the part**.
 *
 * Drone Study's `texture` carries `reArticulatesHook`, so phase 5 prints the hook pointer *and*
 * the strike map — the only shape in this directory where a deferred part still has a grid.
 * `deluge-drone-study` cannot pin it: same direction, but a golden holds one mood, and what makes
 * this shape worth bytes is that the grid is what the density knob moves. Two fixtures on the same
 * direction would pin the same three sections at the same band and neither would say so.
 *
 * The Tracker Mini rather than the Deluge for the half that is a *device* claim: `tm-texture-soft`
 * fades in over 1.8 Sec, and phase 6's note under `ENV ATTACK` — that re-strikes closer together
 * than the fade-in smear rather than articulate — is the guide-side answer to the envelope
 * question this grid raises. The note and the grid it is about are only ever on the same page
 * here, and a renderer change that dropped either would move no byte of any other file.
 */
const TRACKER_MINI = DEVICES.filter((d) => d.id === 'polyend-tracker-mini')

/**
 * §3.1/#414. **The one fixture that renders a MIDI CC**, which is the whole of why it is here.
 *
 * The Muse is the only box in the library that declares `midiCc`, and until this file it took no
 * part in any committed guide — `full-rig` resolves it to `synth · 0 parts`, so every fixture here
 * rendered zero CC-bearing parameter lines and `grep "MIDI CC" test/golden/` returned nothing.
 * That left #414's whole rendering decision pinned by unit tests alone: a change that dropped the
 * suffix, moved it onto a subordinate line, or put it back inside `note` would move not one byte
 * of any file in this directory.
 *
 * **It has to be the Muse alone.** In the full rig the Muse loses every request it can serve to
 * boxes that cost the objective less, which is the correct allocation and is exactly why that
 * fixture cannot pin this. On its own it takes `sub` and `bass-mid`.
 *
 * **The counts below are rendered lines, which is the only thing a golden file pins.** They are
 * deliberately not resolved-parameter counts: those are higher, because §8 hoists a song-scoped
 * control to one line rather than repeating it per assignment, and a count of what the resolver
 * produced would not fail when the renderer stopped printing some of it.
 *
 * **141 parameter lines, 72 of them carrying a controller number**, all in phase 6. Both shapes
 * that must stay apart are in those 72, which is the pairing this fixture exists for — one file
 * where either half regressing is visible:
 *
 *  1. **A bare CC** — 41 lines. A control with nothing authored to say: the value line ends
 *     `· MIDI CC 51` and there is no `↳ note:` under it at all. This is the shape #414 was
 *     reported for: the resolver used to make that string the *whole* of `note`, so a reader got
 *     a NOTE row whose entire content was a controller number.
 *  2. **Prose and a CC together** — 31 lines, each followed by its note. The two land in
 *     different places: the suffix on the value line, the authored sentence alone on the `↳ note:`
 *     line beneath, with no separator and no part of either in the other.
 *
 * The remaining 69 parameter lines carry no CC at all, which is what stops the file agreeing with
 * itself: a renderer appending the suffix unconditionally would move them.
 *
 * Two of those CCs are on `enum` params (`DELAY · TIME - L` and `- R`, song-scoped and so hoisted
 * to one line each), the branch that had no `midiCc` field before #414 and wrote the number into
 * its note by hand. A regression narrowing the field back to numerics takes both lines off.
 *
 * Nothing else about this fixture is load-bearing, and it is deliberately not interesting in any
 * other way: it is Industrial Techno at the shared seed and the shared neutral mood, so a diff
 * here is a *rendering* diff exactly as it is in every other file.
 */
const MUSE = DEVICES.filter((d) => d.id === 'moog-muse')

/**
 * §7.3/#81. **The one fixture that renders `### Waiting on us`**, which is the whole of why it
 * is here.
 *
 * `tr-1000` pinned all three shortfall states at once — a limit of the boxes, a recipe nobody
 * has written, and a part the direction is finished without — until the TR-1000's LT took
 * `bass-mid` and closed that guide's only unauthored line. `tr-6s` took the role and held it
 * until #443 authored `open-hat hard` on the TR-6S, which gave §3.5 something to substitute for
 * the `dark` this direction asks for and closed *that* guide's only unauthored line.
 *
 * **Twice now, and both times for the same good reason**, so it is worth saying what the pattern
 * is rather than only moving the fixture again: this heading names a gap the library is actively
 * closing, so whichever box holds it is a box somebody is about to fix. Closing it is the outcome
 * `authored-rig-coverage.test.ts` pushes toward and not a regression — but the byte-level pin on
 * the middle heading goes with it each time, and `render.test.ts`'s synthetic Golden Techno rig
 * is not the same claim: what that block has to survive is a *real* guide at real scale, where
 * the line names a real track on a real box and forty-odd assignables compete for it.
 *
 * **The RD-9 is that guide, and its unauthored line is the same one both times.** Alone on
 * Industrial Techno at seed 18 it fills five requests and reports all three kinds — `open-hat`
 * unauthored, `sub` and `impact` contended out of the room it has, `bass-mid` and `stab` with no
 * voice for them at all, and `pad` and `riser` excused by the direction. `open-hat dark` is
 * authored nowhere in the library, which is #443's table one row further down; the TR-6S escaped
 * it by gaining a neighbouring character rather than that one. It also carries both `rig-limit`
 * reasons in one guide, which is a second thing `tr-1000` used to be alone in: `no-room` and
 * `no-capable-voice` print different sentences and a fixture with only one of them pins only one.
 *
 * Nothing else about it is load-bearing. It is deliberately a plain drum machine rather than an
 * interesting one: this file wants a guide with holes of every kind, and a box that runs out of
 * tracks is how you get one without inventing a rig nobody owns.
 */
const RD_9 = DEVICES.filter((d) => d.id === 'behringer-rd-9')

/**
 * §3.1/#511. **The one fixture in which a reader is told to route something**, and the reason it
 * had to be added rather than found.
 *
 * When the typed modulation landed, every golden here came back byte-identical: the routings in
 * the library sit on recipes none of these rigs resolves onto, so `Modulation — ` and its neutral
 * line were rendered by no committed bytes anywhere. A shape with no golden is a shape a renderer
 * change can quietly lose, which is exactly what these files exist to catch.
 *
 * **The Mother-32, because it carries every part of the shape and no other box carries them all.**
 * Its VCO block picks a source *and* a destination off two switches, both cited; its VCF block
 * picks a source and a *polarity* and lands on a destination the panel gives no say in, so the
 * `stated` end and the sign switch are both on the page. The Deluge's four are two `stated` ends
 * and no polarity, and the Circuit Tracks' four are two `control` ends and no polarity — either
 * alone would leave half the shape unpinned.
 *
 * Industrial Techno on one semi-modular monosynth is mostly gaps, exactly as `tr-1000` is, and
 * that is not the point of the fixture: what is pinned is a routing rendered beside ordinary
 * controls on the parts it does fill.
 */
const MOTHER_32 = DEVICES.filter((d) => d.id === 'moog-mother-32')

export const GUIDE_NAMES = [
  'full-rig',
  'tr-1000',
  'rd-9',
  'mother-32',
  'midi-clock',
  'muse',
  'deluge-drone-study',
  'tracker-mini-drone-study',
  'weave-tracker-mini',
] as const
export type GuideName = (typeof GUIDE_NAMES)[number]

/**
 * The fixtures that render **Industrial Techno**, and so the ones a six-section, F-minor,
 * band-0-through-3 assertion is allowed to speak for.
 *
 * Named rather than derived, because the alternative — a test filtering `GUIDE_NAMES` by reading
 * each fixture's own template — would make the assertion agree with whatever the fixture does,
 * which is the one thing a fixture test must not do. A fixture on a fourth template leaves this
 * list alone and the techno assertions keep meaning what they meant.
 */
export const TECHNO_GUIDE_NAMES = [
  'full-rig',
  'tr-1000',
  'rd-9',
  'mother-32',
  'midi-clock',
  'muse',
] as const

/** The rendered guide for one fixture name. Pure — the same bytes on every call. */
const RIGS: Record<GuideName, Fixture> = {
  'full-rig': { devices: DEVICES, template: industrialTechno },
  'tr-1000': { devices: TR_1000, template: industrialTechno },
  'rd-9': { devices: RD_9, template: industrialTechno },
  'mother-32': { devices: MOTHER_32, template: industrialTechno },
  'midi-clock': { devices: MIDI_CLOCK, template: industrialTechno },
  'muse': { devices: MUSE, template: industrialTechno },
  'deluge-drone-study': { devices: DELUGE, template: droneStudy },
  'tracker-mini-drone-study': { devices: TRACKER_MINI, template: droneStudy },
  'weave-tracker-mini': { devices: TRACKER_MINI, template: weave },
}

export function guideText(name: GuideName): string {
  return guide(RIGS[name])
}

const THIS_FILE = fileURLToPath(import.meta.url)
const HERE = dirname(THIS_FILE)

export function guidePath(name: GuideName): string {
  return join(HERE, `${name}.golden.md`)
}

/**
 * `npm run gen:guides` writes every file in `GUIDE_NAMES`, and is the only way any of them is
 * ever regenerated. It rewrites all of them on each run, so a fixture whose bytes did not move
 * comes back byte-identical and the diff is the review.
 *
 * Named alone (`tsx test/golden/guides.ts full-rig`) it prints one guide to stdout and writes
 * nothing, which is how the cross-locale test captures another locale's answer without touching
 * the repo — the same shape `generate.ts` uses for the resolver golden.
 */
if (process.argv[1] !== undefined && resolvePath(process.argv[1]) === THIS_FILE) {
  const argv = process.argv.slice(2)
  if (argv.includes('--write')) {
    for (const name of GUIDE_NAMES) {
      const path = guidePath(name)
      writeFileSync(path, guideText(name))
      process.stderr.write(`wrote ${path}\n`)
    }
  } else {
    const wanted = GUIDE_NAMES.find((name) => argv.includes(name))
    if (wanted === undefined) {
      process.stderr.write(`usage: guides.ts --write | ${GUIDE_NAMES.join(' | ')}\n`)
      process.exit(2)
    }
    process.stdout.write(guideText(wanted))
  }
}
