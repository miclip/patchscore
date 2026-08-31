import type { CapabilityEvidence, Device, JackSignalKind, JackSpec, Recipe } from '../../core/device'
import { jackFact } from '../../core/device'
import type { AuthoredParam, Cite, Verified } from '../../core/params'
import type { Role } from '../../core/vocabulary'
import { device as mc101 } from '../roland-mc-101/index'
import { MC_707_PANEL } from './panel'

/**
 * Roland MC-707 (§2.3). The eight-track GROOVEBOX the MC-101 is the four-track pocket edition of,
 * and the second Roland box in this library authored as a guarded reference to a sibling (#196).
 *
 * ## One engine, two chassis — and two documents that are not the same document
 *
 * The MC-101 and the MC-707 run the same ZEN-Core sound engine and share, parameter for
 * parameter, the tables this manifest cares about: the part offsets, the drum pad layer, the 91
 * MFX types and the tone partial editor. What they do not share is a manual. Roland ships each
 * box its own Reference Manual, and the pages do not line up anywhere:
 *
 * | table | MC-101 Reference | MC-707 Reference |
 * |---|---|---|
 * | Part Parameter (KNOB CTRL) | p.45 | pp.64-65 |
 * | PAD CTRL / PAD EQ | p.47 | p.75 |
 * | MFX type list | p.52 | p.84 |
 * | Low Boost, Super Filter | p.54 | p.86 |
 * | Overdrive | p.63 | p.95 |
 * | Bit Crusher | p.70 | p.102 |
 *
 * So this manifest cannot write `recipes: mc101.recipes` the way `akai-mpc-xl` writes the Live
 * III's. A citation naming a page of a manual that does not describe this box is worth less than
 * no citation, because it looks exactly like one that was checked. **Every recipe is taken from
 * the sibling and everything inside one that names the sibling is rewritten — citation, parameter
 * name, articulation lane and prose — against pages of `MC-707_Reference_eng02_W.pdf` that were
 * opened and read.** `retargetRecipe` does it; the tables below are the record of the readings,
 * and every one of them throws rather than passing something through unmapped.
 *
 * `akai-mpc-one-g2` is the pattern. This box needs three things that one did not:
 *
 *  - **Names, not just pages.** The MC-101 is a two-line display and abbreviates hard: `Cutoff
 *    Ofst`, `Mute Grp`, `Reso Ofst`. The MC-707 has a wide screen and prints `TVC Cutoff Offset`,
 *    `Mute Group`, `TVF Resonance OffSet`. A guide read at the machine (§8) that told an MC-707
 *    owner to find `MUTE GRP` would be naming a control this box does not have. `NAMES` maps
 *    every one and throws on a name it has not been given.
 *  - **Prose.** Three of the sibling's `routing` lines open *"Ver.1.80 or later"* — the MC-101 got
 *    its partial editor in a firmware update, and this box shipped with it, so those sentences are
 *    false here and not merely differently paged. `PROSE` is keyed by the sibling's verbatim
 *    string, so a sentence the MC-101 changes later fails this build instead of quietly arriving
 *    unretargeted.
 *  - **One value.** See `POINTS`.
 *
 * ## What the reading turned up
 *
 * Every borrowed range and option list was set beside the MC-707's printing of the same table.
 * **In this document the printed folio equals the PDF page**, checked against six footers (pp.5,
 * 22, 40, 61, 84, 121). The ranges came across unchanged without exception — `Level 0-127`,
 * `Pan L64-0-63R`, the offsets at `-64-+63` and the pad offsets at `-100-+100`, `Boost Gain
 * 0-+12 [dB]`, `Filter Resonance 0-100`, `Bit Down 0-20`, the partial's `0-1023` — and the MFX
 * type list is identical for all 91 entries, in the same order under the same six headings.
 *
 * **Five things did not come across, and each is a value or an option this box would otherwise
 * have inherited wrongly:**
 *
 *  - **One page became two.** The sibling's whole Part Parameter table is p.45. Here it runs
 *    pp.64-65, breaking after `Release`: `Oct Shift`, `Vib Rate` and `Vib Depth` open p.65.
 *    `MOVED` carries the three.
 *  - **There is no fourth motion knob.** The MC-101 records motion on `SND`, `FLT`, `MOD` and
 *    `FX`; this box has `[FILTER] [MOD] [FX]` and no `SND` (pp.29, 30, 34, 57). So `motion-sound`
 *    is dropped rather than remapped — see `LANES`.
 *  - **There is a fifth drum step lane.** The EDIT STEP screen's `NOTE (2/2)` tab carries `END`,
 *    *"Specifies the end timing of the end note"* (p.30), which the MC-101's step editor has no
 *    equivalent of.
 *  - **The LFO rate is two scales, and the sibling set the wrong one.** p.70: `Rate 0-1023` is
 *    *"effective if Rate Sync is OFF"* and `Rate Note 1/64T-4` *"if Rate Sync is ON"*.
 *    `mc101-riser-bright` sets its sync switch ON and a rate of 512, which is the 0-1023 scale
 *    read under the condition that replaces it. `POINTS` corrects it here.
 *  - **The partial editor is not an update.** Everything the sibling cites to `MC-101 Update
 *    eng08 (Ver.1.80)` is in this box's shipping Reference Manual, on the TONE EDIT screen
 *    (pp.41-43) and in the Parameter List (pp.61, 65, 70). `UPD_PAGES` is the second page table
 *    that exists because of it, and the three *"Ver.1.80 or later"* routing lines go with it.
 *
 * ## The trap this box sets twice, and how the recipes stay clear of it
 *
 * CLAUDE.md's rule — *a cited range can still be the wrong range* — applies here as sharply as it
 * does to the TR-8S's `SNAPPY`, because **the MC-707 prints two scales for the same-sounding
 * control in two places:**
 *
 *  - A pad's release is `RELEASE 0-1023` on the KIT EDIT simple screen (p.45) and `TVA Release
 *    Time Offset -100-+100` in the PAD CTRL table (p.75). One is absolute, one is an offset
 *    against the loaded instrument.
 *  - A tone's cutoff is `Cutoff (Cutoff Offset) -64-+63` at the part layer (p.64) and `CUTOFF
 *    (Cutoff) 0-1023` at the partial layer (p.43).
 *
 * The sibling's rule that the two layers are never mixed inside one recipe is inherited and
 * holds. On top of it, **the offset parameters take the manual's own parenthesised full names** —
 * `CUTOFF OFFSET`, `TVA DECAY TIME OFFSET` — so the name on the page of the guide cannot be read
 * off the wrong screen even by a reader who has forgotten which one they are on. That is why
 * `NAMES` is longer than a simple abbreviation map: several of its entries exist to disambiguate
 * rather than to translate.
 *
 * ## Why one drum track and seven tone tracks
 *
 * The box has eight tracks and four types to build them from — TONE, DRUM, DRUM + COMP, LOOPER
 * (p.20). The pools are the two granularities it actually has, the same two the MC-101 manifest
 * argues for and for the same reason: a DRUM track is a kit of sixteen pads with their own level,
 * pan, tuning, filter offsets, sends and EQ (`PAD CTRL` / `PAD EQ`, p.75), not one part.
 *
 *  - `drum-pad`, **8** — the pads of one DRUM track.
 *  - `tone-track`, **7** — the seven tracks left over, as TONE tracks.
 *
 * 8 + 7 is one configuration of eight tracks, not the only one, and the model cannot say that.
 * Four TONE tracks and two drum kits is equally legal; so is spending three on LOOPERs. The
 * honest cost is recorded rather than fudged, exactly as the sibling records it at four tracks:
 * **this device is authored as one drum kit plus seven tone parts**, and a rig wanting a second
 * drum kit on an MC-707 gets an honest gap.
 *
 * The kit has sixteen pads and the pool declares eight for §2.1's headroom reason — the busiest
 * template asks for seven percussive parts, so pads 9-16 could never be occupied.
 *
 * ## What is not modelled
 *
 *  - **LOOPER tracks** play audio you recorded, which is not a role request. Up to eight of them,
 *    or five if the project uses the DRUM + COMP track (p.20).
 *  - **DRUM + COMP** is a drum track with six compressors (`DRUM COMP1-6`, p.75), maximum one
 *    track, not a fifth kind of part. A pad's `Output Assign` already names `COMP1-6`.
 *  - **SCATTER** (pp.24, 38-40) is a performance effect on the master, not a part.
 *  - **Step counts and clip length.** `STEP LEN 1-128` and `SCALE` (p.50) are real parameters and
 *    deliberately unauthored: §3's rule is that a recipe never authors step counts or bar
 *    structure.
 *
 * ## Manual defects, quoted rather than repaired
 *
 * p.75 prints `Reveb Send Level` and `TVC Cutoff Offset`; the first is a plain misspelling and
 * the second is a `TVF` with a slipped letter — every neighbouring row in the same table, and the
 * same parameter on p.43, reads `TVF`. p.70 names the LFO's sync switch `Tempo Sync Sw` and then
 * describes its own effect in terms of *"Rate Sync"*, two names for one switch three rows apart.
 * The names used below are the corrected ones, and this paragraph is why they differ from a
 * literal transcription.
 *
 * The sibling's manual carries the opposite defect and it is worth naming from this side: two
 * places in the MC-101 Reference are uncorrected MC-707 text — *"Up to eight track types can be
 * freely combined in each track"* and *"TRACK 1-8"*. Both sentences are simply true here, and
 * p.20 and p.53 are where this box states them for itself.
 *
 * ## Citation regime
 *
 * §3.2's split, inherited whole: **legality is cited, authority is not.** Every range and option
 * set carries the page that prints it; every point stays `verified: false`, because no page says
 * which value suits a dark kick. `retargetParam` refuses outright to move a cited point value, so
 * the sibling cannot start claiming authority for one without this file failing to build.
 */

const MANUAL = 'MC-707 Reference Manual eng02'
const OWNERS = "MC-707 Owner's Manual eng02"

/** The two documents the sibling cites, and the only two `refOf` will accept. */
const SIBLING_REF = 'MC-101 Reference Manual eng01'
const SIBLING_UPD = 'MC-101 Update eng08'

/** The Reference Manual. Printed folio equals PDF page throughout — six footers checked. */
function ref(page: number): Cite {
  return { kind: 'manual', source: `${MANUAL}, p.${page}` }
}

// ---------------------------------------------------------------------------
// Retargeting the sibling's recipes at this box's document (see the head note).
// ---------------------------------------------------------------------------

/**
 * MC-101 Reference page -> MC-707 Reference page. One entry per page the sibling's recipes cite,
 * and **every one was opened in both documents and the tables compared row by row**. There is no
 * arithmetic offset to lean on: the operation chapters run about thirteen pages later here and
 * the MFX appendix about thirty-two, because this box's manual has more of everything in front of
 * both.
 */
const PAGES: Record<number, number> = {
  16: 20, //  Track types — TONE, DRUM, DRUM + COMP, LOOPER, and how many of each
  37: 50, //  Clip settings: SHUFFLE -50-+50, "individually for each clip"
  45: 64, //  Part Parameter (KNOB CTRL) — but see MOVED, this one becomes two pages
  47: 75, //  PAD CTRL and PAD EQ, the per-key layer of a kit
  52: 84, //  The MFX type list, 00-90
  54: 86, //  04 Low Boost and 05 Super Filter
  63: 95, //  29 Overdrive
  70: 102, // 46 Bit Crusher
}

/**
 * The sibling parameters whose fact landed on a *different* MC-707 page from the rest of its
 * page. The Part Parameter table breaks after `Release`: these three open p.65.
 */
const MOVED: Record<string, number> = {
  '45:OCT SHIFT': 65,
  '45:VIB RATE': 65,
  '45:VIB DEPTH': 65,
}

/**
 * MC-101 Update page -> MC-707 Reference page, for the tone partial editor.
 *
 * **The sibling needed a third document for this and this box did not.** Everything the MC-101
 * gained in Ver.1.80 is in the MC-707's shipping Reference Manual, which is why every citation
 * that arrives here as `MC-101 Update eng08, p.N (Ver.1.80)` leaves as an ordinary page of the
 * one manual — and why the three routing lines that warn a reader about firmware do not survive
 * `PROSE`.
 *
 * The defaults are where each Update page's *bulk* lands; `UPD_MOVED` carries the rest. The
 * spread is real rather than tidy, because this box documents the same editor twice — once as the
 * TONE EDIT screen a reader operates (pp.41-43) and once as the ZEN-Core Parameter List
 * (pp.61-71) — and each parameter is cited to whichever printing gives it a name that is not
 * ambiguous on this box. p.42's LFO table, for one, labels the waveform row `FROM`, which is a
 * column artefact of that screen's layout; p.70 names the same parameter `Waveform`, so the LFO's
 * identity parameters are cited there and only its four depth controls to p.42.
 */
const UPD_PAGES: Record<number, number> = {
  1: 65, // OSC: OSC Type, Waveform (the VA wave list) — Parameter List
  2: 43, // FILTER and AMP tabs of the TONE EDIT screen: TYPE, CUTOFF, RES, ENV DEP, KEYF, SLOPE
  3: 70, // LFO1 / LFO2: Waveform, Tempo Sync Sw, Rate
}

/** Update-cited parameters printed somewhere other than their page's default. */
const UPD_MOVED: Record<string, number> = {
  '1:M/P': 41, //     TONE EDIT CTRL tab, VOICE — MONO, POLY, without the part layer's TONE
  '1:PRT': 41, //     TONE EDIT CTRL tab, PORTAMENT — likewise two options, not three
  '1:LEV': 41, //     TONE EDIT, OSC (common to P2), VOL: the partial's own volume
  '1:ANL': 61, //     Analog Feel: Parameter List only, not on the simple edit screen
  '2:DET': 65, //     SuperSAW Detune sits with the OSC group in the Parameter List
  '2:T3D': 42, //     FENV, the filter envelope — the AMP envelope is on p.43
  '3:LFO1 FLT': 42, // The four LFO depth controls are the TONE EDIT screen's >CUTOFF, >PITCH,
  '3:LFO1 AMP': 42, // >AMP and >PAN; p.70 spells them out but the screen is what a reader sees
  '3:LFO1 PAN': 42,
}

/**
 * Sibling parameter name -> this box's name for the same control.
 *
 * Three kinds of entry, and the third is the one that matters most:
 *
 *  - **Expansions.** The MC-101 abbreviates for a two-line display; this box spells it out.
 *    `MUTE GRP` -> `MUTE GROUP`, `FINE OFST` -> `FINE TUNE OFFSET`.
 *  - **Different words for the same thing.** `WAV` -> `WAVEFORM`, `LEV` -> `VOL`, `KF` -> `KEYF`.
 *  - **Disambiguations.** `CUTOFF` becomes `CUTOFF OFFSET` and `RELEASE` becomes `RELEASE TIME
 *    OFFSET` because this box prints a second, absolute scale for both (see the head note), and
 *    the parenthesised full name is the manual's own way of telling them apart. Nothing is
 *    invented here: p.64 prints `Cutoff (Cutoff Offset)` and `Release (Release Time Offset)`.
 *
 * Note the pair that reads like a mistake and is not: the sibling's `PORTAMENT` is the *part*
 * switch and becomes `PORTA SW` (p.64), while its `PRT` is the *tone* switch and becomes
 * `PORTAMENT` (p.41). Two switches, two screens, and this box happens to give the second the name
 * the sibling gives the first.
 */
const NAMES: Record<string, string> = {
  // PAD CTRL and PAD EQ, p.75
  'ATTACK OFST': 'TVA ATTACK TIME OFFSET',
  'CUTOFF OFST': 'TVF CUTOFF OFFSET',
  'DECAY OFST': 'TVA DECAY TIME OFFSET',
  'EQ SWITCH': 'EQ SWITCH',
  'FINE OFST': 'FINE TUNE OFFSET',
  'KEY OFFSET': 'KEY OFFSET',
  'LOW FREQ': 'EQ LOW FREQUENCY',
  'LOW GAIN': 'EQ LOW GAIN',
  'MID GAIN': 'EQ MID GAIN',
  'MUTE GRP': 'MUTE GROUP',
  'OUT ASSIGN': 'OUTPUT ASSIGN',
  'RELEASE OFST': 'TVA RELEASE TIME OFFSET',
  'RESO OFST': 'TVF RESONANCE OFFSET',

  // Shared between the pad layer and the part layer, same word on both pages
  LEVEL: 'LEVEL',
  PAN: 'PAN',
  'DELAY SEND': 'DELAY SEND LEVEL',
  'REVERB SEND': 'REVERB SEND LEVEL',
  SHUFFLE: 'SHUFFLE',

  // Part Parameter (KNOB CTRL), pp.64-65
  ATTACK: 'ATTACK TIME OFFSET',
  'COARSE TUNE': 'COARSE TUNE',
  CUTOFF: 'CUTOFF OFFSET',
  DECAY: 'DECAY TIME OFFSET',
  'FINE TUNE': 'FINE TUNE',
  LEGATO: 'LEGATO SW',
  'MONO/POLY': 'MONO/POLY',
  'OCT SHIFT': 'OCT SHIFT',
  PORTAMENT: 'PORTA SW',
  'PORTA TIME': 'PORTA TIME',
  RELEASE: 'RELEASE TIME OFFSET',
  RESONANCE: 'RESONANCE OFFSET',
  'VIB DEPTH': 'VIB DEPTH',
  'VIB RATE': 'VIB RATE',

  // MFX, pp.84-102
  'MFX TYPE': 'MFX TYPE',
  'BOOST FREQUENCY': 'BOOST FREQUENCY',
  'BOOST GAIN': 'BOOST GAIN',
  'BOOST WIDTH': 'BOOST WIDTH',
  'FILTER CUTOFF': 'FILTER CUTOFF',
  'FILTER RESONANCE': 'FILTER RESONANCE',
  'FILTER TYPE': 'FILTER TYPE',
  DRIVE: 'DRIVE',
  TONE: 'TONE',
  'SAMPLE RATE': 'SAMPLE RATE',
  'BIT DOWN': 'BIT DOWN',

  // The tone partial editor, pp.41-43, 61, 65, 70
  ANL: 'ANALOG FEEL',
  CUT: 'CUTOFF',
  DET: 'SUPERSAW DETUNE',
  ENV: 'ENV DEP',
  KF: 'KEYF',
  LEV: 'VOL',
  'M/P': 'VOICE',
  OSC: 'OSC TYPE',
  PRT: 'PORTAMENT',
  RES: 'RES',
  SLP: 'SLOPE',
  T1A: 'AMP ATTACK (T1)',
  T3D: 'FENV DECAY (T3)',
  T4R: 'AMP RELEASE (T4)',
  'TVF/VCF': 'TYPE',
  WAV: 'WAVEFORM',
  'LFO1 AMP': 'LFO1 >AMP',
  'LFO1 FLT': 'LFO1 >CUTOFF',
  'LFO1 PAN': 'LFO1 >PAN',
  'LFO1 RAT': 'LFO1 RATE',
  'LFO1 SYN': 'LFO1 TEMPO SYNC SW',
  'LFO1 WAV': 'LFO1 WAVEFORM',
}

/**
 * Sibling names this box splits in two, keyed `<recipe id>:<name>`. Consulted before `NAMES`, and
 * the reason both of these are ambiguous is the sibling's display rather than this box's:
 *
 *  - `TYP` is the MC-101's three-letter name for **both** filter families' type lists. This box
 *    prints them as separate rows, `TVF TYPE` and `VCF TYPE` (p.43), and which one a recipe means
 *    is settled by the `TVF/VCF` switch it already carries.
 *  - `HIGH GAIN` is a pad's EQ on one recipe and the Overdrive's output EQ on another. Same three
 *    words, two tables thirty pages apart.
 *
 * Neither name appears in `NAMES`, so a third recipe reaching for either one fails the build
 * rather than silently picking whichever reading was written first.
 */
const NAMES_BY_RECIPE: Record<string, string> = {
  'mc101-acid-dirty:TYP': 'VCF TYPE',
  'mc101-lead-bright:TYP': 'TVF TYPE',
  'mc101-open-hat-dark:HIGH GAIN': 'EQ HIGH GAIN',
  'mc101-bass-mid-dirty:HIGH GAIN': 'HIGH GAIN',
}

/**
 * Sibling articulation lane -> this box's lane, or `null` for a lane this box does not have.
 *
 * **`motion-sound` is dropped and not remapped, and that is the whole content of this table.**
 * The MC-101 records knob motion on four buttons, `SND` `FLT` `MOD` `FX`; this box has three
 * knobs, `[FILTER] [MOD] [FX]`, and says so in four places (pp.29, 30, 34, 57). Moving the
 * sibling's send-knob accent onto the filter knob would be authoring wearing retargeting's
 * clothes — it would read like a value somebody checked. So the lane goes, and with it the one
 * articulation that carried nothing else: `mc101-bass-mid-dirty`'s accent. The recipe keeps every
 * parameter and loses its accent, which is the honest outcome and is noted on the recipe.
 */
const LANES: Record<string, string | null> = {
  'motion-filter': 'motion-filter',
  'motion-fx': 'motion-fx',
  'motion-mod': 'motion-mod',
  'motion-sound': null,
  'mute-probability': 'mute-probability',
  'note-length': 'note-length',
  'start-timing': 'start-timing',
  'sub-step': 'sub-step',
  velocity: 'velocity',
}

/**
 * Every prose string the sibling's recipes carry, keyed by its verbatim text.
 *
 * A page-and-name map cannot reach inside a sentence, and three of these sentences are false on
 * this box rather than differently paged. Keying on the whole string rather than rewriting parts
 * of it is what makes the guard loud in the sense invariant 2 requires: **if the MC-101 rewords a
 * routing line, this build fails** instead of shipping the sibling's sentence with this box's
 * pages stapled to it.
 *
 * Most entries are the same sentence with a name or a page moved. The ones that are not:
 *
 *  - The three `Ver.1.80` lines. This box shipped with the partial editor, so the firmware
 *    warning is replaced by where the screen actually is: `[SHIFT]` + `[SOUND]` opens TONE EDIT
 *    and the [C1]-[C4] knobs edit it (p.41).
 *  - `LFO1 RAT`'s note. See `POINTS` — on this box the numeric rate and the sync switch are
 *    alternatives rather than one overriding the other, and the note says which one is in force.
 *  - `MTE is a *mute* probability`. The lane keeps the sibling's name, for the sibling's reason:
 *    p.30 gives it the same inverted sense — *"Adjusts the probability that a mute note will
 *    sound"* — so a reader who reads it as an ordinary probability gets it backwards. This box
 *    calls the control `MUTE`.
 */
const PROSE: Record<string, string> = {
  'OUT ASSIGN DRY keeps the kick clear of whatever the kit MFX is doing':
    'OUTPUT ASSIGN DRY keeps the kick clear of whatever the kit MFX is doing',
  'OUT ASSIGN MFX puts this pad through the kit effect; the kick stays DRY':
    'OUTPUT ASSIGN MFX puts this pad through the kit effect; the kick stays DRY',
  'Same MUTE GRP as the open hat, so one cuts the other off':
    'Same MUTE GROUP as the open hat, so one cuts the other off',
  'Same MUTE GRP as the closed hat': 'Same MUTE GROUP as the closed hat',
  'MTE is a *mute* probability: 0 sounds every time, higher drops more hits':
    'MUTE is a *mute* probability: 0 sounds every time, higher drops more hits',
  'Keep the sub mono and dry — the reverb and delay sends stay at 0':
    'Keep the sub mono and dry — the reverb and delay sends stay at 0',
  // The sibling's line grew a **Slide:** sentence with the acid audit, so this key grew with it —
  // which is the guard working as designed. The slide half is retargeted rather than copied: on
  // this box the tone switch is called `PORTAMENT` and the part-level one is `PORTA SW` (p.41,
  // p.64), which is the naming swap `NAMES` records above.
  'Ver.1.80 or later — the partial editor is SHIFT + [SOUND], then PARTIAL. **Slide:** `PRT ON` above is the tone-level portamento switch and it carries no time with it — the part-level `PORTA TIME` that the mid bass recipe uses is a different screen — so the slide here is on or off for the whole part, and none of the nine step lanes is a glide':
    'Hold [SHIFT] and press [SOUND] for TONE EDIT; the FILTER tab is where these live. **Slide:** `PORTAMENT ON` above is the tone-level portamento switch (p.41) and carries no time with it — `PORTA TIME` belongs to the part layer on p.64, which the mid bass recipe uses and this one does not — so the slide here is on or off for the whole part, and none of this box\u2019s nine step lanes is a glide',
  'Ver.1.80 or later — SuperSAW and DET live in the partial editor':
    'SuperSAW and its DETUNE are on the OSC tab of TONE EDIT',
  'Ver.1.80 or later for the LFO page; draw the sweep with MOTION DESIGNER if you prefer':
    'The LFO tab of TONE EDIT; draw the sweep with MOTION DESIGNER (p. 35) if you prefer',
  'A pitched sampler on a TONE track (p.16) — one chop per note':
    'A pitched sampler on a TONE track (p. 20) — one chop per note',
  'A vocal one-shot per note — a word or a syllable, dry, so the bit crusher is the only dirt on it':
    'A vocal one-shot per note — a word or a syllable, dry, so the bit crusher is the only dirt on it',
  'Load the chop from the SD card: Sound Browser, WAVE FILE.':
    'Load the chop from the SD card: press [SOUND], then WAVE FILE.',
  'One setting for the whole clip, not per step': 'One setting for the whole clip, not per step',
  'Shown as L64-0-63R; negative is left': 'Shown as L64-0-63R; negative is left',
  'TONE is also selectable, deferring to the tone': 'TONE is also selectable, deferring to the tone',
  'Filter envelope decay': 'Filter envelope decay',
  'Amp envelope attack': 'Amp envelope attack',
  'Amp envelope release': 'Amp envelope release',
  'RATE NOTE takes over once SYN is ON':
    'This scale is the one in force while TEMPO SYNC SW is OFF; ON replaces it with RATE NOTE',
}

/**
 * The one point value this box may not inherit, keyed `<recipe id>:<sibling name>`.
 *
 * `mc101-riser-bright` sets `LFO1 SYN` to `ON` and `LFO1 RAT` to `512`. p.70 makes those
 * mutually exclusive: `Rate 0-1023` is *"effective if Rate Sync is OFF"*, and with the switch ON
 * the rate is `Rate Note 1/64T-4`, a note value on a different scale in different units. Carrying
 * both across would be CLAUDE.md's cited-wrong-range failure exactly — a number read off one of
 * two printed scales while the other one is switched in.
 *
 * The switch goes to `OFF` rather than the rate becoming a note value, because `1/64T-4` is a
 * span rather than an enumerated list: the manual never prints the note values in between, so an
 * option set built from it would be guesswork. `0-1023` is printed whole. What the recipe loses
 * is tempo-locking, and the retargeted note says which scale is in force so a reader who wants
 * the sweep locked to the bar knows which switch to move.
 *
 * `retargetParam` refuses to move a *cited* point (there are none — §3.2 keeps authority
 * uncited), so this table is the only route by which a value changes, and it has one entry.
 */
const POINTS: Record<string, string | number> = {
  'mc101-riser-bright:LFO1 SYN': 'OFF',
}

function pageIn707(page: number, table: Record<number, number>, manual: string): number {
  const to = table[page]
  if (to === undefined) {
    throw new Error(
      `the MC-101 manifest cites ${manual} p.${page}, which nothing in ${MANUAL} has been checked against`,
    )
  }
  return to
}

/** The page a sibling citation names, plus which of its two manuals said it. */
function refOf(v: Verified | undefined): { page: number; upd: boolean } | undefined {
  if (v === undefined || v === false) return undefined
  if (v.kind !== 'manual') {
    throw new Error(`the MC-101 manifest carries a non-manual citation this cannot retarget: ${v.source}`)
  }
  for (const [prefix, upd] of [
    [`${SIBLING_REF}, `, false],
    [`${SIBLING_UPD}, `, true],
  ] as const) {
    if (!v.source.startsWith(prefix)) continue
    // The Update manual suffixes its firmware version: 'p.2 (Ver.1.80)'.
    const rest = v.source.slice(prefix.length)
    const page = /^p\.(\d+)(?: \(Ver\.[\d.]+\))?$/.exec(rest)?.[1]
    if (page === undefined) {
      throw new Error(`unrecognised citation shape on a ${MANUAL} retarget: ${v.source}`)
    }
    return { page: Number(page), upd }
  }
  throw new Error(
    `expected a citation to ${SIBLING_REF} or ${SIBLING_UPD}, got: ${v.source}`,
  )
}

/** The page a sibling parameter's fact is printed on here. */
function pageFor(name: string, cited: { page: number; upd: boolean }): number {
  const key = `${cited.page}:${name}`
  if (cited.upd) return UPD_MOVED[key] ?? pageIn707(cited.page, UPD_PAGES, SIBLING_UPD)
  return MOVED[key] ?? pageIn707(cited.page, PAGES, SIBLING_REF)
}

function nameFor(recipeId: string, name: string): string {
  const own = NAMES_BY_RECIPE[`${recipeId}:${name}`] ?? NAMES[name]
  if (own === undefined) {
    throw new Error(
      `the MC-101 manifest names a parameter '${name}' that has not been matched to a control of the MC-707`,
    )
  }
  return own
}

function proseFor(text: string): string {
  const own = PROSE[text]
  if (own === undefined) {
    throw new Error(`the MC-101 manifest carries prose this manifest has not retargeted: ${text}`)
  }
  return own
}

/** One parameter, with its name, its cited range or option list, and its note moved onto this box. */
function retargetParam(recipeId: string, param: AuthoredParam): AuthoredParam {
  if (param.verified !== undefined && param.verified !== false) {
    throw new Error(`retargeting a cited point value is not implemented: ${param.name}`)
  }

  const name = nameFor(recipeId, param.name)
  const note = param.note === undefined ? {} : { note: proseFor(param.note) }
  const override = POINTS[`${recipeId}:${param.name}`]

  if (param.kind === 'numeric') {
    if (override !== undefined && typeof override !== 'number') {
      throw new Error(`a numeric parameter cannot take the string override for ${recipeId}:${param.name}`)
    }
    const cited = refOf(param.range.verified)
    return {
      ...param,
      name,
      ...(override === undefined ? {} : { value: override }),
      range: {
        ...param.range,
        ...(cited === undefined ? {} : { verified: ref(pageFor(param.name, cited)) }),
      },
      ...note,
    }
  }

  if (param.kind === 'enum') {
    if (override !== undefined && typeof override !== 'string') {
      throw new Error(`an enum parameter cannot take the numeric override for ${recipeId}:${param.name}`)
    }
    if (override !== undefined && !param.options.values.includes(override)) {
      throw new Error(`the override '${override}' for ${recipeId}:${param.name} is not one of its options`)
    }
    const cited = refOf(param.options.verified)
    return {
      ...param,
      name,
      ...(override === undefined ? {} : { value: override }),
      options: {
        ...param.options,
        ...(cited === undefined ? {} : { verified: ref(pageFor(param.name, cited)) }),
      },
      ...note,
    }
  }

  return { ...param, name, ...note }
}

/**
 * One recipe's articulation, with each lane moved onto this box's step editor and the lanes this
 * box has no knob for dropped. An entry whose whole `set` was dropped goes with it.
 */
function retargetArticulation(articulation: Recipe['articulation']): Recipe['articulation'] {
  if (articulation === undefined) return undefined
  const kept = articulation.flatMap((a) => {
    const set: Record<string, string | number | boolean> = {}
    for (const [lane, value] of Object.entries(a.set)) {
      if (!(lane in LANES)) {
        throw new Error(`the MC-101 manifest uses a per-step lane '${lane}' this manifest has not matched`)
      }
      const own = LANES[lane] ?? null
      if (own !== null) set[own] = value
    }
    return Object.keys(set).length === 0 ? [] : [{ ...a, set }]
  })
  return kept.length === 0 ? undefined : kept
}

/** One recipe, params, articulation, routing and source-audio prose and all. */
function retargetRecipe(recipe: Recipe): Recipe {
  // Pulled out of the spread rather than overwritten: when a recipe's whole articulation is
  // dropped (see `LANES`), re-spreading the sibling's would put it straight back.
  const { articulation: siblingArticulation, ...rest } = recipe
  const articulation = retargetArticulation(siblingArticulation)
  const prep = recipe.sourceAudio?.prep
  return {
    ...rest,
    id: recipe.id.replace(/^mc101-/, 'mc707-'),
    params: recipe.params.map((p) => retargetParam(recipe.id, p)),
    ...(articulation === undefined ? {} : { articulation }),
    ...(recipe.routing === undefined ? {} : { routing: proseFor(recipe.routing) }),
    ...(recipe.sourceAudio === undefined
      ? {}
      : {
          sourceAudio: {
            ...recipe.sourceAudio,
            need: proseFor(recipe.sourceAudio.need),
            ...(prep === undefined
              ? {}
              : {
                  prep: {
                    ...prep,
                    text: proseFor(prep.text),
                    verified: (() => {
                      const cited = refOf(prep.verified)
                      if (cited === undefined) return prep.verified
                      return ref(
                        cited.upd
                          ? pageIn707(cited.page, UPD_PAGES, SIBLING_UPD)
                          : pageIn707(cited.page, PAGES, SIBLING_REF),
                      )
                    })(),
                  },
                }),
          },
        }),
  }
}

const recipes: Recipe[] = mc101.recipes.map(retargetRecipe)

/**
 * The roles each pool carries, taken from the sibling's own pools rather than restated — the
 * engines are the same engine, and two copies of a role list are two lists that drift. This
 * throws if the sibling stops declaring a pool by that id, which is the `shared()` guard
 * `akai-mpc-xl` uses, in the shape this file needs.
 */
function rolesOf(poolId: string): Role[] {
  const pool = mc101.voices.find((v) => v.kind === 'pool' && v.id === poolId)
  if (pool === undefined) {
    throw new Error(`the MC-101 manifest no longer declares a '${poolId}' pool for its roles to be read from`)
  }
  return [...pool.roles]
}

// ---------------------------------------------------------------------------
// §3.3 Jacks. p.7 is the rear panel — rendered rather than extracted, because the silkscreen is
// text inside a drawing and `pdftotext` returns none of it (CLAUDE.md's standing rule). The
// labels below are what that page draws, left to right.
// ---------------------------------------------------------------------------

const JACK_EVIDENCE: Record<string, CapabilityEvidence> = {}

function jack(
  id: string,
  direction: JackSpec['direction'],
  signal: JackSignalKind[],
  page: number,
  extra: { note?: string; clock?: JackSpec['clock'] } = {},
): JackSpec {
  JACK_EVIDENCE[jackFact(id)] = ref(page)
  return {
    id,
    direction,
    signal,
    ...(extra.clock === undefined ? {} : { clock: extra.clock }),
    ...(extra.note === undefined ? {} : { note: extra.note }),
  }
}

/**
 * Every socket p.7 numbers, minus the ones carrying no signal in §3.3's vocabulary: the DC IN
 * jack, the power switch, the cord hook and the SD card slot.
 *
 * **Three MIDI DINs, and the silkscreen numbers the outs.** The drawing reads `OUT 2  OUT 1  IN`
 * under a `MIDI` bracket, and p.54's `MIDI Sync Out1` / `MIDI Sync Out2` switch clock per port —
 * so which out carries clock is a setting rather than a fact, and both are declared able to.
 * `OUT 1` is the one `clock` names, because a box with two identical outs and one cable in the
 * diagram (p.60, driving a TR-8S) should not have the rack drawing to whichever socket sorted
 * first.
 *
 * **The USB port is a transport and not a jack**, following the MC-101 and the MPCs: `JackSpec`
 * has one direction and a USB receptacle is bidirectional. p.7 has it carry *"USB MIDI and USB
 * audio data"* in one sentence. `usb` is in `clock.transport` and no cable is drawn to a socket.
 *
 * **`SEND` and `RETURN` are an effects loop, not a mix path** (p.53): they insert an external
 * unit at a position chosen from `OFF, PC, TRACK1-8, DELAY, REVERB, SCATTER, MIXOUT`. They are
 * audio in both directions and are declared as such; they are deliberately not counted in
 * `io.individualOuts`, which is about getting a part out of the box.
 */
const JACKS: JackSpec[] = [
  jack('MIDI · IN', 'in', ['midi', 'clock'], 7, { clock: ['midi-din'] }),
  jack('MIDI · OUT 1', 'out', ['midi', 'clock'], 7, { clock: ['midi-din'] }),
  jack('MIDI · OUT 2', 'out', ['midi'], 7, {
    note: 'Carries clock too, by its own MIDI Sync Out2 switch (p. 54)',
  }),
  jack('EXT IN · L/MONO', 'in', ['audio'], 7, {
    note: 'A [MIC/LINE] switch beside it sets this jack’s gain; a microphone goes here',
  }),
  jack('EXT IN · R', 'in', ['audio'], 7),
  jack('SEND · L/MONO', 'out', ['audio'], 7),
  jack('SEND · R', 'out', ['audio'], 7),
  jack('RETURN · L/MONO', 'in', ['audio'], 7),
  jack('RETURN · R', 'in', ['audio'], 7),
  jack('ASSIGNABLE OUT · L', 'out', ['audio'], 7),
  jack('ASSIGNABLE OUT · R', 'out', ['audio'], 7),
  jack('MIX OUT · L/MONO', 'out', ['audio'], 7),
  jack('MIX OUT · R', 'out', ['audio'], 7),
  jack('PHONES', 'out', ['audio'], 7),
]

// ---------------------------------------------------------------------------
// The manifest
// ---------------------------------------------------------------------------

export const device: Device = {
  id: 'roland-mc-707',
  name: 'MC-707',
  maker: 'Roland',
  kind: 'groovebox',

  /**
   * Full-size 5-pin DIN `IN`, `OUT 1` and `OUT 2`, plus a USB type-B port carrying *"USB MIDI and
   * USB audio data"* (p.7). Both directions are documented and both are switchable: `MIDI Sync
   * AUTO, INT, MIDI, USB` chooses the tempo source, and `MIDI Sync Out1`, `MIDI Sync Out2` and
   * `MIDI Sync Out USB` each decide whether clock, start and stop leave by that port (p.54).
   * p.60 states the pair plainly — *"The MC-707 can transmit and receive MIDI clock (F8) to
   * synchronize its tempo."*
   *
   * **`preferredSource` is not claimed (§7.4/#80), and p.60 is the page that decides it — read
   * whole.** The sentence above opens a chapter that is **one page long** and holds exactly two
   * diagrams, one per direction. In the first a computer's `USB MIDI OUT` feeds this box's `USB
   * MIDI IN`: the DAW is the source and the MC-707 follows. In the second the MC-707's `MIDI OUT`
   * feeds a TR-8S's `MIDI IN`, and there it leads. A pair of arrangements, drawn on one page,
   * with no prose choosing between them — the sibling's p.44 in the same shape, because it is the
   * same chapter about a different box.
   *
   * Roland makes no claim about the box's job anywhere else either: neither book has a features
   * list, and the only self-description in the pair is the Owner's Manual specifications table,
   * *"Roland MC-707: GROOVEBOX"* (Owner's p.3).
   */
  clock: {
    canSendClock: true,
    canReceiveClock: true,
    transport: ['midi-din', 'usb'],
    sourceSetup: [
      {
        transport: 'midi-din',
        path: 'UTILITY > SET > MIDI',
        value: 'MIDI Sync Out1: ON',
        note: 'Two DIN outs, switched separately — Out2 has its own line on the same screen',
      },
      {
        transport: 'usb',
        path: 'UTILITY > SET > MIDI',
        value: 'MIDI Sync Out USB: ON',
        note: 'The type-B port carries MIDI and audio both, so this does not cost you the audio',
      },
    ],
  },

  /**
   * §2.6/#111. **This box ships a library nobody has listed, which is `shipped-library`.**
   *
   * p.10 names it: *"Selecting preset tones and drum kits — You can browse the preset tones and
   * drum kits, and use them."* p.26 is the procedure — press `[SOUND]`, choose `PRESET`, and the
   * browser sorts by number, alphabetically or by bank A-F. p.46 gives the drum side the same
   * three doors, `PRESET`, `PROJECT` and `WAVE FILE`, the last of which is what
   * `mc707-vox-chop-dirty` tells a reader to use. And p.7, on the SD card slot: the unit arrives
   * with the included card fitted behind a screwed-down protector, and *"The SD card contains
   * various data (settings, sounds, samples, etc.) for this unit."*
   *
   * So the reading finished: a reader is not starting from an empty card, and the browser is
   * where they look. What no document does is enumerate the content — the browser's bank filter
   * `A-F` is the closest any page comes to a count — and that is a limit on the manual rather
   * than on what is established about the box, which is exactly what `shipped-library` says.
   */
  content: {
    kind: 'shipped-library',
    library: 'preset tones and drum kits, and the audio data on the included SD card',
    location: 'the [SOUND] browser — PRESET for tones and kits, WAVE FILE for a sample on the card',
    reason: 'p.26 sorts the presets into six banks and prints no list of what is in them',
  },

  /**
   * §2.6/#142. p.29, the STEP EDIT screen's `NOTE` tab: four knobs, and the fourth is `[C4]
   * knob — LENGTH: Specifies the length of the note.` The same page warns what bounds it in
   * practice rather than numerically — *"If the same note exists at the distance to which the
   * note was extended, it cannot be extended further."*
   *
   * **`unit` is absent** because the page states none, and the sibling's screen shot showing
   * `0.80` is not this box's screen.
   *
   * One answer for both pools, as on the sibling: the tone track's STEP EDIT and the drum track's
   * EDIT STEP are the same editor reached the same way (hold `[SHIFT]`, press a step button), and
   * nothing on either page splits length by track type.
   */
  noteDuration: { kind: 'per-note-value', control: 'LENGTH' },

  capabilityEvidence: {
    ...JACK_EVIDENCE,
    'clock.canSendClock': ref(60),
    'clock.canReceiveClock': ref(60),
    'clock.transport': ref(54),
    'clock.sourceSetup[midi-din]': ref(54),
    'clock.sourceSetup[usb]': ref(54),
    'io.main': ref(7),
    'io.individualOuts': ref(53),
    'io.audioIn': ref(7),
    'io.usbAudio': ref(7),
    'features.perStep': ref(30),
    'features.lfo': ref(70),
    noteDuration: ref(29),
    content: ref(26),
    voices: ref(20),
    /**
     * §2.6. The pool *counts* are a modelling decision (see `voices`) and the page behind them is
     * p.20's track table; what has no page anywhere is the polyphony figure, and it is recorded
     * here rather than left to look like an unread field.
     */
    'clock.preferredSource': {
      kind: 'unknown',
      reason:
        'p.60’s one-page “Interoperation with Other Devices” draws this box following a DAW and leading a TR-8S, one diagram each and no prose choosing; the only self-description in either book is Owner’s p.3’s “Roland MC-707: GROOVEBOX”',
    },
  },

  /**
   * `MIX OUT (L/MONO, R)` for the mix, `ASSIGNABLE OUT (L, R)` for a track, `EXT IN (L/MONO, R)`
   * in with a `[MIC/LINE]` switch on the left jack, and USB carrying MIDI and audio both (p.7).
   *
   * **`individualOuts: 2`, and the two are one stereo destination rather than two separations.**
   * The field counts jacks, following the TR-8S — but the comparison is worth making because the
   * two boxes look alike and are not: the TR-8S's six are genuinely per-part, with each of eleven
   * instruments assigned to `MIX` or to one of `ASSIGN 1-6`. Here the choice is per *track* and
   * binary, `Output Select: MIX OUT, ASSIGN OUT` (p.20), into a single pair. Route two tracks
   * there and they sum. So a reader gets one thing out of this box separately, in stereo, and the
   * number 2 should not be read as two of them.
   *
   * `audioIn: true` is the `EXT IN` pair, which is the sharpest difference from the MC-101 — that
   * box has no analog input at all, and the looper here can record from `EXT` as well as from
   * `PC`, `TRK 1-8` and `MIXOUT` (p.53).
   */
  io: { main: 'stereo', individualOuts: 2, audioIn: true, usbAudio: true },

  /**
   * §10. 425 mm across, off the Main Specifications table: *"425(W) x 263(D) x 58(H) mm"*.
   *
   * **Cited to the Owner's Manual because the Reference Manual has no specifications section** —
   * it ends at the block diagram on p.121. The Owner's Manual is twelve pages and this table is
   * most of what it is for; printed folio equals PDF page there too, checked at pp.3, 11 and 12.
   *
   * Like the sibling and unlike the Tracker Mini, the vendor's stated width **is** the
   * playing-orientation horizontal span: this is a landscape desktop box played lying flat, so
   * the surface you play is the top panel and its horizontal span is the 425 mm W. The 263 mm the
   * sheet calls *depth* is the panel's vertical span. 425 / 263 is 1.62.
   *
   * Worth noting for whoever draws the panel: 263 x 58 is the TR-8S's depth and height exactly
   * (409 x 263 x 58), so the two are the same chassis family at two widths.
   */
  physical: {
    panelSpanMm: 425,
    verified: { kind: 'manual', source: `${OWNERS}, p.3 (Main Specifications)` },
  },

  jacks: JACKS,

  /** §10. A simplified original drawing of the top panel, measured off the manual (see `panel.ts`). */
  panel: MC_707_PANEL,

  /**
   * §2.1's two pools; the configuration argument for eight pads plus seven tone tracks is in the
   * module JSDoc.
   *
   * **`polyphony` on `tone-track` is 4, and this box's manuals state no number either.** The
   * Reference Manual has no specifications section and the Owner's Manual's table gives power,
   * dimensions and weight only. What the Reference does say is that the figure *moves*: *"If VCF
   * is selected, the simultaneous polyphony will be less than when TVF is selected"* and the same
   * for a -24 dB slope (p.43), and `VoiceAsgn FULL` sounds a repeated key *"within the limits of
   * available polyphony"* (p.65) without saying what those are.
   *
   * So 4 is the sibling's undocumented figure carried across on the sibling's reasoning — a
   * deliberately small number covering the widest chord a template authors, a triad, with one
   * note in hand. **It is the one thing in this file taken from the MC-101 that is not a citation
   * and is not dressed as one.** What *is* documented is that the part is polyphonic at all:
   * `Mono/Poly MONO, POLY, TONE` (p.64) and `VOICE MONO, POLY` (p.41).
   *
   * A drum pad is 1, and that is not a judgement: a pad holds one instrument and sounds it one
   * hit at a time, with `Assign Type SINGLE` stopping the previous sound when the next arrives
   * (p.76).
   *
   * `sampled-chord` is declined on both pools for the sibling's two reasons, and both survive the
   * move: a pad can hold a rendered chord and cannot follow a progression (`Key Offset` is per
   * pad, not per step, p.75; motion reaches `Coarse Tune` only track-wide, and a DRUM track here
   * carries all sixteen pads), and a TONE track does not need the substitute, because it can be a
   * pitched sampler (p.20) and §7.1 would never choose the baked chord over the polyphonic recipe
   * already on that voice.
   */
  voices: [
    { kind: 'pool', id: 'drum-pad', label: 'Drum Pad', count: 8, roles: rolesOf('drum-pad'), polyphony: 1 },
    { kind: 'pool', id: 'tone-track', label: 'TONE Track', count: 7, roles: rolesOf('tone-track'), polyphony: 4 },
  ],

  /**
   * A taste call, on a box whose real limit is eight tracks rather than a voice count.
   *
   * Twelve is roughly "a working kit plus most of the tone tracks": six pads carrying parts and
   * six tonal tracks in use, leaving two tracks for a looper or a second kit. The sibling sits at
   * 8 against four tracks and a two-line display; this box has sixteen pads, a wide screen and
   * per-track knobs, so it stays pleasant with more on it. Crowding is a *cost* in the objective
   * and never a feasibility limit (§12.4), so if this is wrong nothing breaks — some guides are
   * ranked differently.
   */
  comfortableVoices: 12,

  /**
   * The per-step lanes, in this device's own names, spanning **two step editors** because the box
   * spans two kinds of track:
   *
   *  - A TONE track's STEP EDIT screen (p.29) puts `EVENT (NOTE)`, `VELOCITY`, `START` and
   *    `LENGTH` on `[C1]`-`[C4]`. `note-length` is that `LENGTH`.
   *  - A DRUM track's EDIT STEP screen (p.30) puts `VEL`, `START`, `MUTE` and `SUB STEP` on the
   *    `NOTE (1/2)` tab, and `END` alone on `NOTE (2/2)`.
   *
   * **`end-timing` is this box's own and has no sibling equivalent** — *"Specifies the end timing
   * of the end note"* (p.30). It is declared because it is a real lane a reader can reach, and no
   * recipe uses it: every recipe here came from a four-track box whose step editor does not have
   * it, and inventing an articulation to fill the slot would be invariant 5's fault.
   *
   * **`mute-probability` is named for what it is, and the name is load-bearing.** p.30: *"MUTE:
   * Adjusts the probability that a mute note will sound."* It is the inverse of every other
   * probability lane in this library, so calling it `probability` would make `80` read as
   * "usually plays" and mean the opposite.
   *
   * **Three motion lanes, not the sibling's four.** MOTION (p.34) records *"Movements of the
   * [FILTER], [MOD], and [FX] knobs"*, `OFF, 0-127` per step, and there is no fourth knob. See
   * `LANES` for what that cost.
   *
   * **No printed ranges on the note lanes.** Neither step editor prints bounds for `VELOCITY`,
   * `START`, `LENGTH`, `MUTE`, `SUB STEP` or `END`. The motion lanes are the exception and the
   * only one: `OFF, 0-127` is printed on pp.29, 30 and 34.
   *
   * `lfo` is two per partial (`LFO1 / LFO2`, p.70), with a `Tempo Sync Sw` and a note-value rate
   * when it is on, and depth controls for filter, pitch, amp and pan (p.42). `sidechain` is
   * omitted for the sibling's reason: the box has no sidechain input and no sidechain compressor,
   * and what it has is MOTION, a curve you draw step by step, which `{ internal,
   * fromExternalAudio }` cannot say.
   */
  features: {
    perStep: [
      'velocity',
      'start-timing',
      'note-length',
      'end-timing',
      'mute-probability',
      'sub-step',
      'motion-filter',
      'motion-mod',
      'motion-fx',
    ],
    lfo: { count: 2, syncable: true, destinations: ['filter', 'pitch', 'amp', 'pan'] },
  },

  /**
   * Gestures off the shortcut list (pp.57-58) and the procedures the edit chapters open with.
   * Jogs, not documentation (invariant 7).
   *
   * These are where this box diverges from the sibling most visibly at the machine, and none of
   * them survived retargeting unchanged: the MC-101 drives everything from a `[VALUE]` dial and
   * four knobs, while this box has `[C1]`-`[C4]`, dedicated `[FILTER] [MOD] [FX]` knobs per track
   * and a row of sixteen step buttons.
   */
  hints: {
    'open-sound': 'Hold [SHIFT], press [SOUND]',
    'open-clip': 'Hold [SHIFT], press [CLIP] (below the [C2] knob)',
    'open-multi-fx': 'Hold [SHIFT], press [MULTI], then the MFX tab',
    'edit-step': 'Hold [SHIFT], press the step button',
    'weak-hit': 'Note mode: hold the pad, press the step button',
    'motion-step': 'On EDIT STEP, cursor [<] to the MOTION tab',
    'load-sample': 'Press [SOUND], then WAVE FILE',
    'knob-value': 'Hold [SHIFT] and turn the knob',
  },

  manual: { title: 'MC-707 Reference Manual', edition: 'eng02' },

  productPage: 'https://www.roland.com/global/products/mc-707/',

  recipes,
}
