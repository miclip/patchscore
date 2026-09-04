import type { CapabilityEvidence, Device, JackSignalKind, JackSpec, Recipe } from '../../core/device'
import { jackFact } from '../../core/device'
import type { AuthoredParam, Cite, Verified } from '../../core/params'
import { device as liveIII } from '../akai-mpc-live-iii/index'
import { MPC_ONE_G2_PANEL, MPC_ONE_G2_PANEL_SPAN_MM } from './panel'

/**
 * Akai Professional MPC One G2 (§2.3). The smallest of the standalone boxes running MPC 3, and
 * the third member of this library's MPC family after the Live III and the XL.
 *
 * ## One engine, three chassis — but not one document
 *
 * The Live III and the XL share a manual, and the XL manifest is written as a thin hardware
 * delta over the Live III's because of it. **This box breaks that arrangement in exactly one
 * place, and the whole file is shaped by it: the One G2 is not in that manual.** Its document is
 * the `MPC Standalone OS User Guide v3.9`, which covers the standalone MPC range — One G2, Key
 * 37 G2, Live II, X and the rest — and mentions the XL once, in passing.
 *
 * So the claim here is the XL's claim with one extra clause:
 *
 * > **The three boxes share the MPC engine and every recipe value. They differ in chassis,
 * > control surface, I/O, processor, storage, wireless and USB audio. And the page every shared
 * > value is printed on is different, because it is a different document.**
 *
 * That last clause is the reason this manifest cannot simply write `recipes: liveIII.recipes`
 * the way `akai-mpc-xl` does. A recipe carries citations, and a citation naming a page of a
 * manual that does not describe this box is worth nothing — worse than nothing, because it looks
 * exactly like a citation that was checked. **So every recipe is taken from the sibling and
 * every citation inside one is rewritten, recursively, to the page of the v3.9 guide that was
 * opened and read.** `retargetRecipe` below does it; `PAGES` is the table of readings.
 *
 * ## What was actually checked, and what it turned up
 *
 * Each entry in `PAGES` is a page of the v3.7 guide set beside the v3.9 page carrying the same
 * text, line for line. In both documents the printed folio equals the PDF page index, checked
 * against five footers in v3.9 and thirteen in v3.7. Twenty-four pages of parameter tables and operation prose came
 * across unchanged apart from the folio. **Four did not, and every one of them is a value or an
 * option list this box would otherwise have inherited wrongly:**
 *
 *  - **The delay/reverb `Options:` list lost `AIR Reverb Pro`** (v3.7 p.392 -> v3.9 p.388). The
 *    other twenty-four entries are identical and in the same order.
 *  - **The harmonic `Options:` list lost `AIR Utility`** (v3.7 p.412 -> v3.9 p.406), again with
 *    the rest unchanged.
 *  - **The bundled plugin set is eight, not eighteen** (v3.7 pp.428-521 -> v3.9 pp.422-454).
 *    `Fabric`, `Fabric XL`, `Fabric Select`, `Fabric Electric Piano`, `Fabric Piano`, `OPx-4`,
 *    `Organ`, `Stage EP`, `Stage Piano` and `Studio Strings` are not in this document's `Plugins`
 *    chapter at all; the three `Fabric` entries appear only under `Addenda > MPC Pro Pack > Pro
 *    Pack Plugins` (p.510), which is a paid add-on and not what "included with your MPC
 *    purchase" (p.422) means. So the `Plugin` enum here offers eight options, and the three the
 *    recipes reach for — DrumSynth, Bassline, TubeSynth — are all among them.
 *  - **One v3.7 page became two.** v3.7 p.212 carries `Layer Play`, `Sample Play`, `Pad
 *    Polyphony` and `Mute Group`; v3.9 splits them across p.193 and p.194. `MOVED` below carries
 *    the three that landed on the second page. The same split hit p.211, whose `Global` tab is on
 *    v3.9 p.193 while the `Flatten Pad` paragraph beside it is on p.192.
 *
 * A page map with no per-parameter escape would have got the last one wrong and looked right.
 *
 * ## No trigger note, read on this document rather than inherited (§2.1/#334)
 *
 * #334 counts the parts whose grid says which steps to hit and never what to write on them. This
 * box has 246 of them, and the answer is that there is nothing to write. **The reading is this
 * file's own**, because the pages that answer it are not the sibling's pages and one of them does
 * not exist here at all.
 *
 * **A `pad` part is addressed by pad.** p.181, the step sequencer: *"Use the `Pad -/+` buttons at
 * the bottom of the screen to select the pad whose steps you want to enter or delete. The current
 * pad number is shown in the upper-left corner."* Then, third: *"Press the pads of your MPC
 * hardware... Each pad corresponds to a step in the bar."* The pad is chosen before any step is,
 * the pads *are* the steps on this chassis (p.179, and see `hints`), and no note is named
 * anywhere in the procedure. p.186's List Edit says the same in the box's own columns —
 * *"`Pad/Note`: This is the pad and/or corresponding MIDI note number. For drum tracks, you will
 * see the pad number. For keygroup tracks, plugin tracks, and midi tracks, you will see the
 * note"* — and p.167's Grid View draws it: a drum track gets *"all available pads in a vertical
 * view"*, where a keygroup, plugin, MIDI or CV track gets *"a vertical 'piano roll' keyboard"*.
 * Three pages, one distinction, and it is the same line the three pools are drawn on.
 *
 * **The number behind a pad is the reader's.** p.128's `Edit Pad Note Map` *"lets you assign
 * specific MIDI notes to your MPC hardware pads"*, with three preset layouts — `Chromatic C1`,
 * `Chromatic C-2` and `Classic MPC` — and no page saying which is loaded. A note authored on
 * `pad` would be wrong under two of the three and unverifiable under the third.
 *
 * **A plugin-track part has a note and this document never states it.** The piano roll on p.167
 * is where it lives, so the note is a musical decision — supplied as `RequestPitch` (#340) where
 * a direction has one, which is the 24 `sub` parts. Where a direction has none, nothing here
 * fills the gap: **DrumSynth is the plugin most of these percussion parts load and it is named on
 * three pages, pp.441-443**, which print `Model`, `One-Shot`, `Velocity`, `Velocity 2`, `Gain`,
 * the eight parameter knobs, Trans/Dist, EQ/Comp and the Multi's Send FX, and **no note
 * parameter, no key range and no default note**. `capabilityEvidence.voices` already records
 * those same three pages answering nothing about polyphony; they answer nothing about addressing
 * either. p.441's `One-Shot` — *"Allows the drum sound to play entirely when triggered"* — says a
 * note triggers the sound without saying which.
 *
 * **The page the sibling leans on does not exist in this document.** v3.7 p.197 is a `Note
 * Sequencing` mode whose instruction is *"play a MIDI note from the pads, an external instrument,
 * or other source"*; v3.9 has no such section, because this document's step sequencer is the
 * pad-per-step one on p.181. So the plugin-track half of the reading rests on p.167 and p.186
 * here, and copying the sibling's citation across would have named a page this manual does not
 * have. That is `PAGES` and `pageInV39`'s whole reason, arriving at a fact rather than a value.
 *
 * ## Why this could not have been left to the sibling
 *
 * `voices` is `liveIII.voices` — the same objects, not copies — so a `triggerNote` authored on
 * the Live III's pools would appear on this box automatically. **And it would arrive carrying a
 * citation to a manual that does not describe this box**, because `retargetRecipe` rewrites
 * citations inside *recipes* and nothing rewrites a field on a shared voice: `pageInV39` would
 * never see it, and the guard that exists precisely to stop a v3.7 page number reaching a One G2
 * reader would be looking the other way. The test file asserts the sharing for that reason, and
 * asserts nothing about what the siblings should carry.
 *
 * ## The octave convention, read and recorded rather than used
 *
 * Recorded because a note authored against this box without it would be an octave out, silently.
 * p.334, a pad's MIDI parameters: *"`Note`: This is the MIDI note number the pad will send to the
 * software when you press it (0-127 or C-2 to G8)."* Zero is `C-2`, so on this box's numbering
 * **middle C is `C3` and 60 is `C3`**, not the `C4` scientific pitch notation would give — the
 * Tracker Mini's trap (#352) on a third manual. p.519 agrees where it prints a sample layer's
 * `Key Low` and `Key High` as `C-2 - G8`. **No value is authored from any of it**: the convention
 * says how to write a note, and this document never supplies which note to write.
 *
 * ## The differences that are hardware, and what each costs
 *
 * **A bare `p.NNN` anywhere in this file is a page of the v3.9 guide.** The siblings' figures are
 * in the other document, so where one is quoted for comparison the guide is named with it.
 *
 *  - **Chassis.** 272 x 272 x 53 mm (p.478), against 436 x 256 x 67 for the Live III and
 *    543 x 488 x 94 for the XL (v3.7 pp.530, 533). Square, and by a wide margin the smallest.
 *  - **Control surface.** Four Q-Link knobs and 31 buttons behind a 7.0" display (p.477),
 *    against the Live III's four Q-Links, 60 buttons and 6.9" display and the XL's seventeen
 *    Q-Links, 105 buttons and 10.1" display (v3.7 pp.530, 532). **There is no row of dedicated
 *    Step buttons**, and that one costs a hint — see `hints` below.
 *  - **I/O** (p.366, p.478). One stereo input pair and one stereo output pair, one headphone
 *    output, one MIDI In and one MIDI Out, four CV/Gate sockets carrying eight signals. Against
 *    the Live III's six outputs, four inputs, two MIDI Ins and two MIDI Outs. `individualOuts` is
 *    therefore **0**: every part leaves by the main pair.
 *  - **Processor and storage** (p.478). A `G2 eight-core processor`, 4 GB of RAM and 64 GB of
 *    internal storage, against the Live III's quad-core, 8 GB and 128 GB (v3.7 p.530). p.455's
 *    SATA chapter names the X, Live, Live II and Key 61 as the boxes a drive can be added to,
 *    and not this one.
 *  - **Wireless** (p.478). Dual-band Wi-Fi and Bluetooth 5 HID. This is what carries Ableton
 *    Link, so it is not decorative to the clock story below.
 *  - **USB audio** (p.366). The USB-C port *"send/receive MIDI and audio data to/from your
 *    computer"*, so `usbAudio` is true on the same footing as the sibling's.
 *
 * None of the six reaches a recipe. The engine underneath them is the same engine, and that is
 * the claim the retargeting was done to keep honest.
 */

const MANUAL = 'MPC Standalone OS User Guide v3.9'

/** The document the sibling manifest cites, and the only one `retargetCite` will accept. */
const SIBLING_MANUAL = 'MPC Live III / MPC XL User Guide v3.7'

function cite(page: number): Cite {
  return { kind: 'manual', source: `${MANUAL}, p.${page}` }
}

function cites(pages: string): Cite {
  return { kind: 'manual', source: `${MANUAL}, ${pages}` }
}

// ---------------------------------------------------------------------------
// Retargeting the sibling's recipes at this box's document (see the head note).
// ---------------------------------------------------------------------------

/**
 * v3.7 page -> v3.9 page, one entry per page the sibling's recipes cite, and **every one of them
 * was opened in both documents and compared**. There is no arithmetic offset to lean on: the
 * operation chapters run about one page later in v3.9 and the plugin appendix about eighty
 * earlier, and within the plugin appendix the order of the instruments changed.
 */
const PAGES: Record<number, number> = {
  44: 45, //   Track types — the six, and "up to 128 tracks"
  75: 76, //   Timing Correct: "the amount of swing from 50% to 75%"
  87: 88, //   Insert effects: four slots per pad, keygroup, track, submix or output
  192: 181, // Step Sequencer: "Each pad corresponds to a step in the bar"
  205: 186, // List Edit: Length in ticks, Prob, Velocity
  211: 193, // Drum pad Global tab: Global Semi, Global Fine, Global Poly
  212: 193, // Layer Play (Sample Play, Pad Polyphony and Mute Group moved on — see MOVED)
  217: 199, // Layer Semi, and the Warp note that explains what it costs
  219: 203, // Vel Start / Vel End
  227: 211, // Articulations (Speed, Dynamics, Stereo) and the fourteen Drum FX
  304: 285, // Sample Edit > Chop: convert or assign slices
  392: 388, // Delay/Reverb category Options list, and AIR Delay's table
  396: 390, // AIR Reverb
  412: 406, // Harmonic category Options list
  413: 407, // AIR Distortion
  414: 408, // AIR Lo-Fi
  428: 422, // Bassline: Osc / Filter / Envelope
  429: 423, // Bassline: Velocity / Global / Chorus
  431: 441, // DrumSynth: Drum Sound tab, and the eight drum types
  432: 442, // DrumSynth: Trans/Dist and EQ/Comp tabs
  515: 434, // TubeSynth: Oscillator tab
  516: 435, // TubeSynth: Mixer / Filter tab
  517: 436, // TubeSynth: Envelope tab
  518: 437, // TubeSynth: LFO tab
}

/**
 * The parameters whose fact landed on a *different* v3.9 page from the rest of its v3.7 page,
 * keyed `<v3.7 page>:<parameter name>`. v3.9 breaks v3.7 p.212 in the middle of the drum pad's
 * Global tab: `Layer Play` finishes p.193 and these three open p.194.
 */
const MOVED: Record<string, number> = {
  '212:Sample Play': 194,
  '212:Pad Polyphony': 194,
  '212:Mute Group': 194,
}

/**
 * `Appendix > Plugins`, pp.422-454 — **eight, where the sibling's document has eighteen**. The
 * chapter's own order, which is not alphabetical. p.422 opens *"Plugins included with your MPC
 * purchase are described below"*; p.455 starts the next chapter, which is what fixes the far end
 * of the span.
 */
const PLUGINS = [
  'Bassline', 'Electric', 'Hype', 'TubeSynth', 'DrumSynth', 'Mellotron', 'Solina',
  'WayOutWare Odyssey',
] as const

/**
 * Option sets the sibling cites to one page whose v3.9 printing differs, keyed by the v3.7 page
 * the sibling cites. Values are dropped, never added: an entry missing from this document is one
 * this manifest may not offer, and `AuthoredEnumParamSchema` fails the build if a recipe was
 * reaching for one.
 */
const DROPPED_OPTIONS: Record<number, readonly string[]> = {
  392: ['AIR Reverb Pro'],
  412: ['AIR Utility'],
}

/** Sibling citations that name a span rather than a page. */
const SPANS: Record<string, { ref: string; values?: readonly string[] }> = {
  'pp.428-521': { ref: 'pp.422-454', values: PLUGINS },
}

function pageInV39(page: number): number {
  const to = PAGES[page]
  if (to === undefined) {
    throw new Error(
      `the MPC Live III manifest cites ${SIBLING_MANUAL} p.${page}, which nothing in ${MANUAL} has been checked against`,
    )
  }
  return to
}

/** The page or span a sibling citation names, or `undefined` if there is no citation at all. */
function refOf(v: Verified | undefined): string | undefined {
  if (v === undefined || v === false) return undefined
  if (v.kind !== 'manual') {
    throw new Error(`the MPC Live III manifest carries a non-manual citation this cannot retarget: ${v.source}`)
  }
  const prefix = `${SIBLING_MANUAL}, `
  if (!v.source.startsWith(prefix)) {
    throw new Error(`expected a citation to ${SIBLING_MANUAL}, got: ${v.source}`)
  }
  return v.source.slice(prefix.length)
}

/** Prose carries page numbers too, and a note naming the wrong page is the same defect. */
function retargetNote(note: string, own?: { from: number; to: number }): string {
  return note.replace(/\bp\.(\d+)\b/g, (_, digits: string) => {
    const from = Number(digits)
    return `p.${own !== undefined && own.from === from ? own.to : pageInV39(from)}`
  })
}

/**
 * One parameter, with its cited range or option list moved onto this box's document — and its
 * option list narrowed where v3.9 prints fewer entries than v3.7 did.
 */
function retargetParam(param: AuthoredParam): AuthoredParam {
  if (param.verified !== undefined && param.verified !== false) {
    throw new Error(`retargeting a cited point value is not implemented: ${param.name}`)
  }

  if (param.kind === 'numeric') {
    const ref = refOf(param.range.verified)
    const from = ref === undefined ? undefined : Number(/^p\.(\d+)$/.exec(ref)?.[1])
    if (from !== undefined && Number.isNaN(from)) {
      throw new Error(`a numeric range cited to a span cannot be retargeted: ${param.name}, ${ref}`)
    }
    const to = from === undefined ? undefined : (MOVED[`${from}:${param.name}`] ?? pageInV39(from))
    return {
      ...param,
      range: { ...param.range, ...(to === undefined ? {} : { verified: cite(to) }) },
      ...(param.note === undefined
        ? {}
        : { note: retargetNote(param.note, from === undefined || to === undefined ? undefined : { from, to }) }),
    }
  }

  if (param.kind === 'enum') {
    const ref = refOf(param.options.verified)
    if (ref === undefined) return param
    const span = SPANS[ref]
    if (span !== undefined) {
      return {
        ...param,
        options: {
          values: span.values === undefined ? param.options.values : [...span.values],
          verified: cites(span.ref),
        },
        ...(param.note === undefined ? {} : { note: retargetNote(param.note) }),
      }
    }
    const from = Number(/^p\.(\d+)$/.exec(ref)?.[1])
    if (Number.isNaN(from)) throw new Error(`unrecognised citation on ${param.name}: ${ref}`)
    const to = MOVED[`${from}:${param.name}`] ?? pageInV39(from)
    const dropped = DROPPED_OPTIONS[from] ?? []
    return {
      ...param,
      options: {
        values: param.options.values.filter((v) => !dropped.includes(v)),
        verified: cite(to),
      },
      ...(param.note === undefined ? {} : { note: retargetNote(param.note, { from, to }) }),
    }
  }

  return { ...param, ...(param.note === undefined ? {} : { note: retargetNote(param.note) }) }
}

/** One recipe, params and preparation citation and all. Nothing else in a recipe carries a page. */
function retargetRecipe(recipe: Recipe): Recipe {
  const prep = recipe.sourceAudio?.prep
  return {
    ...recipe,
    params: recipe.params.map(retargetParam),
    ...(recipe.sourceAudio === undefined
      ? {}
      : {
          sourceAudio: {
            ...recipe.sourceAudio,
            ...(prep === undefined
              ? {}
              : {
                  prep: {
                    ...prep,
                    verified: (() => {
                      const ref = refOf(prep.verified)
                      if (ref === undefined) return prep.verified
                      const from = Number(/^p\.(\d+)$/.exec(ref)?.[1])
                      if (Number.isNaN(from)) throw new Error(`unrecognised preparation citation: ${ref}`)
                      return cite(pageInV39(from))
                    })(),
                  },
                }),
          },
        }),
  }
}

const recipes: Recipe[] = liveIII.recipes.map(retargetRecipe)

// ---------------------------------------------------------------------------
// §3.3 Jacks. p.366 is the rear panel and p.365 the front; the `Connections` block on p.478
// counts the same sockets, and the two agree on every one.
// ---------------------------------------------------------------------------

const JACK_EVIDENCE: Record<string, CapabilityEvidence> = {}

function jack(
  id: string,
  direction: JackSpec['direction'],
  signal: JackSignalKind[],
  page: number,
  extra: { note?: string; clock?: string[] } = {},
): JackSpec {
  JACK_EVIDENCE[jackFact(id)] = cite(page)
  return {
    id,
    direction,
    signal,
    ...(extra.clock === undefined ? {} : { clock: extra.clock }),
    ...(extra.note === undefined ? {} : { note: extra.note }),
  }
}

/**
 * Every socket pp.365-366 number, minus the ones that carry no signal in §3.3's vocabulary: the
 * power input, the power adapter restraint, the power switch, the Kensington slot, the SD card
 * slot and the two USB receptacles. The two panel knobs (`Main Vol`, `Rec Vol`) are controls,
 * not sockets.
 *
 * **The MIDI DINs are one each**, which is the simplest this family gets: the Live III has two
 * in and two out and the XL four out, so both siblings have to name which port carries clock.
 * Here there is nothing to choose, and p.63's `Output Ports` list — where `Sync` is ticked per
 * port — has one row to tick.
 *
 * **Four CV/Gate sockets carrying eight signals.** The silkscreen numbers them `1/5` through
 * `4/8`, read off the rear-panel drawing on p.366, and the page gives the rule: *"Use standard
 * 1/8" (3.5 mm) TS cables to send a single CV/Gate signal per output, or use a stereo
 * TRS-to-dual mono TSF breakout cable... to send two CV/Gate signals per output."* Each is
 * `pitch-cv` and `gate` both. Same four as the Live III, half the XL's eight.
 *
 * **The two USB receptacles are a transport and not jacks**, following both siblings and the
 * Grandmother: `JackSpec.direction` is one value and a USB receptacle is bidirectional. p.366
 * has the USB-C port carry MIDI and audio *"to/from your computer"* in one sentence, and gives
 * the USB-A port flash drives, MIDI controllers and class-compliant audio interfaces at once.
 * `usb` is in `clock.transport` and no cable is drawn to a socket.
 */
const JACKS: JackSpec[] = [
  jack('MAIN L', 'out', ['audio'], 366, { note: 'The only audio output pair on this box; there are no individual outs' }),
  jack('MAIN R', 'out', ['audio'], 366),
  jack('PHONES', 'out', ['audio'], 365, { note: 'Front panel, 1/8" (3.5 mm) stereo' }),
  jack('INPUT L', 'in', ['audio'], 366, { note: '1/4" (6.35 mm) TRS, line level; the Rec Vol knob beside it sets the level' }),
  jack('INPUT R', 'in', ['audio'], 366),
  jack('MIDI IN', 'in', ['midi', 'clock'], 366, { clock: ['midi-din'] }),
  jack('MIDI OUT', 'out', ['midi', 'clock'], 366, { clock: ['midi-din'] }),
  jack('CV/GATE 1/5', 'out', ['pitch-cv', 'gate'], 366, { note: 'One signal on a TS cable, two on a stereo TRS breakout' }),
  jack('CV/GATE 2/6', 'out', ['pitch-cv', 'gate'], 366),
  jack('CV/GATE 3/7', 'out', ['pitch-cv', 'gate'], 366),
  jack('CV/GATE 4/8', 'out', ['pitch-cv', 'gate'], 366),
]

export const device: Device = {
  id: 'akai-mpc-one-g2',
  name: 'MPC One G2',
  maker: 'Akai Professional',

  /** §2.3. The siblings' reasoning, and this document prints the same six track types (p.45). */
  kind: liveIII.kind,

  /**
   * §2.3/§7.4. Sends and receives, and **the two directions are not the same list** — the
   * sibling's finding, on this box's pages.
   *
   * p.64 prints the two settings next to each other and they differ by one option:
   *
   *     Receive   MIDI Clock, MIDI Time Code (MTC), Ableton Link, Off
   *     Send      MIDI Clock, MIDI Time Code (MTC), Off
   *
   * So `receiveTransport` carries `ableton-link` and `sendTransport` does not. p.62 makes Link a
   * property of the wireless connection and p.478 gives the box dual-band Wi-Fi, so the
   * transport is real here rather than inherited.
   *
   * **`preferredSource` is not claimed**, for the sibling's reason met on this document's own
   * pages: p.63 heads the screen *"how your MPC hardware uses and synchronizes with connected
   * USB and MIDI devices"*, p.64 prints Receive above Send as a symmetric pair, and the only
   * asymmetry stated runs the follower's way.
   */
  clock: {
    canSendClock: true,
    canReceiveClock: true,
    transport: ['midi-din', 'usb', 'ableton-link'],
    sendTransport: ['midi-din', 'usb'],
    receiveTransport: ['midi-din', 'usb', 'ableton-link'],
    sourceSetup: [
      {
        transport: 'midi-din',
        path: 'Menu > Preferences > MIDI / Sync',
        value: 'Send: MIDI Clock',
        note: 'Then tick Sync against MIDI Out in the Output Ports list on the same screen — clock leaves only by a port set there, and this box has one',
      },
      {
        transport: 'usb',
        path: 'Menu > Preferences > MIDI / Sync',
        value: 'Send: MIDI Clock',
        note: 'Then tick Sync against the USB port in the Output Ports list; the USB-C port carries MIDI and audio both',
      },
    ],
  },

  /**
   * One stereo pair out, one stereo pair in, and class-compliant USB audio.
   *
   * **`individualOuts: 0` is the sharpest difference between this box and its siblings.** p.478's
   * `Connections` block gives `(2) 1/4" (6.35 mm) TRS outputs (1 stereo pair)` and p.366 draws
   * them as `MAIN L` and `MAIN R`, with nothing else. The Live III has four individual outputs
   * beyond its main pair and the XL six; here every part in a guide comes out of the same two
   * sockets, so a rig that wanted a part on its own pair has to take it over USB or not at all.
   */
  io: { main: 'stereo', individualOuts: 0, audioIn: true, usbAudio: true },

  /**
   * §2.6/#111. **A library nobody has listed, which is `shipped-library`** — the sibling's
   * reading, re-taken on this document, where it is if anything more specific.
   *
   * p.138 names the folders outright: the `Drums` and `Samples` buttons enter
   * `Expansions/The Vault 2` on the internal drive filtered to programs and to samples, the
   * `Instruments` button enters `Expansions/Instruments`, and `Demos` enters `Demos`. That is a
   * named expansion, which v3.7 never gave.
   *
   * What no page does is list what is *inside* those folders, or say how much of p.478's 64 GB
   * they take. So a reader can browse it and cannot look anything up in it, which is exactly the
   * gap between `enumerable` and this.
   */
  content: {
    kind: 'shipped-library',
    library: 'the factory Expansions — The Vault 2 programs and samples, and the Instruments presets',
    location: 'Browser > the Drums / Instruments / Samples buttons under Content',
    reason: 'p.138 names the folders and no page names a single program or sample inside them',
  },

  /**
   * §2.6/#142. A note carries its own length, and on this box **only half of the sibling's
   * evidence survives** — which is a hardware difference showing up in a citation.
   *
   * **What the value is** comes from List Edit Mode, p.186: *"Length: This is the length of the
   * note event in ticks."* **Where it is entered** has no equivalent page. The sibling cites the
   * hardware step sequencer's gesture — hold the Step Button carrying the note, press a second
   * Step Button — and that gesture needs a row of sixteen dedicated Step buttons, which p.477's
   * `(31) dedicated function buttons` does not include. v3.9's Step Sequencer chapter
   * (pp.179-183) puts the pads in that role and documents four ways to set a step's velocity on
   * them, and no way at all to set a note's length. So the citation is one page rather than two,
   * and `hints` sends the reader to List Edit instead.
   */
  noteDuration: liveIII.noteDuration,

  /**
   * §10. p.478: `Dimensions (width x depth x height) — 10.7" x 10.7" x 2.1" / 272 x 272 x 53 mm`.
   * 272 is the span, and it is also the rise: the box is square. See `panel.ts` for the aspect
   * check, which for once cannot distinguish width from depth and does not need to.
   */
  physical: { panelSpanMm: MPC_ONE_G2_PANEL_SPAN_MM, verified: cite(478) },

  panel: MPC_ONE_G2_PANEL,

  manual: { title: 'MPC Standalone OS User Guide', edition: 'v3.9' },

  productPage: 'https://www.akaipro.com/mpc-one-g2/',

  capabilityEvidence: {
    ...JACK_EVIDENCE,

    'clock.canSendClock': cite(64),
    'clock.canReceiveClock': cite(64),
    'clock.transport': cites('p.64, p.366, p.478'),
    'clock.sourceSetup[midi-din]': cites('p.63, p.64'),
    'clock.sourceSetup[usb]': cites('p.63, p.64'),
    'clock.preferredSource': {
      kind: 'unknown',
      reason:
        'p.63 heads the section "how your MPC hardware uses and synchronizes with connected USB and MIDI devices" and p.64 prints Receive above Send as a symmetric pair; the only asymmetry stated is Ableton Link, which appears on the receiving side only, so no page says leading a rig is this box’s job',
    },

    'io.main': cites('p.366, p.478'),
    'io.individualOuts': cites('p.366, p.478'),
    'io.audioIn': cites('p.366, p.478'),
    'io.usbAudio': cite(366),

    /**
     * §2.6/#120. The sibling's `unknown`, re-checked on this document and standing for the same
     * reason. What *is* established, and would be cited if one entry could carry three pools:
     * 128 tracks of six types (p.45), 128 pads as sixteen across eight banks (p.49, and p.477's
     * `(16) velocity- and pressure-sensitive pads` with `(8) banks`), 128 keygroups (p.51), the
     * pad pool's polyphony of 1 from pads being triggered by fixed note number (pp.193, 199),
     * and `poly-track`'s 4 from TubeSynth's printed `Polyphony` (p.438).
     *
     * What is not: **DrumSynth's simultaneous-voice count.** It is named on three pages of this
     * document — p.5, p.441 and p.443 — and not one of them gives a voice count or the
     * `Polyphony` parameter its siblings carry.
     */
    voices: {
      kind: 'unknown',
      reason:
        'the counts are cited (p.45, p.49, p.51) and TubeSynth prints its polyphony (p.438), but DrumSynth is named on only three pages — p.5, p.441 and p.443 — and none gives a voice count or a Polyphony parameter, so `mono-track`’s polyphony of 1 is authored rather than read and one entry cannot cite three pools apart',
    },

    'features.perStep': cites('p.181, p.183, p.186'),
    'features.lfo': cites('p.212, p.213'),
    'features.sidechain.internal': cite(399),
    'features.sidechain.fromExternalAudio': cites('p.144, p.399'),
    content: cite(138),
    noteDuration: cite(186),
  },

  /**
   * §2.2. The siblings' three pools, unchanged, because the architecture they model is in the
   * shared operation chapters and this document prints all of it: p.45's six track types and 128
   * tracks, p.49's 128 pads as sixteen across eight banks, pp.422-454's plugins. p.477 confirms
   * this chassis has the same sixteen pads and the same eight banks.
   *
   * **No `triggerNote` on any of them, and the head note reads this document for why** rather
   * than taking the sibling's answer: p.181 selects the pad before its steps, p.128 makes the
   * pad's own note the reader's, and pp.441-443 give DrumSynth no note parameter at all. The
   * sharing is the reason it had to be read here — a cited field added to these objects would
   * reach this box wearing a v3.7 page number, which is the one thing this whole manifest exists
   * to prevent.
   */
  voices: liveIII.voices,

  /**
   * Twelve, the siblings' judgement, and deliberately not adjusted.
   *
   * p.478 gives this box a `G2 eight-core processor` with 4 GB of RAM, against the Live III's
   * quad-core and 8 GB (v3.7 p.530) — more cores and half the memory, which points two ways at once
   * and is not a voice count either way. Nothing in any of the three documents prints one (see
   * `capabilityEvidence.voices`), so moving the number would be inventing a difference the pages
   * do not support, and the three MPCs would then rank against each other on that invention.
   * Crowding is a cost in the objective and never a feasibility limit (§12.4).
   */
  comfortableVoices: liveIII.comfortableVoices,

  /**
   * The sibling's, on this document's pages: the four per-step lanes (pp.181, 183, 186), two
   * syncable program LFOs with four destinations (pp.212-213), and `Mother Ducker` reaching a
   * bus from an audio track's input (pp.144, 399). All three are in the shared operation
   * chapters and none of them names a model.
   */
  features: liveIII.features,

  jacks: JACKS,

  /**
   * §8.1. Four of the sibling's five jogs are true here word for word — `Load` is this box's own
   * button name for the Browser (p.364 item 15, and p.136 lists it per model) and `Sample Edit`
   * is on the panel (p.364 item 24).
   *
   * **`step-note-length` is the one that had to change, and it changed because of the hardware.**
   * The sibling says *"Hold the step, press a second step"*, which needs the row of sixteen Step
   * buttons the Live III and XL have and this box does not (p.477). On the One G2 the pads are
   * the step buttons (p.179), and v3.9 documents no note-length gesture on them at all, so the
   * jog points at where the number actually lives: the `Length` column of List Edit (p.186).
   */
  hints: {
    'step-velocity': 'Tap the step velocity bar, or turn its Q-Link',
    'step-note-length': 'List Edit Mode, the Length column',
    'event-probability': 'List Edit Mode, the Prob column',
    'sample-assign': 'Press Load, then tap Sample Assign',
    chop: 'Sample Edit Mode, tap Chop',
  },

  recipes,
}
