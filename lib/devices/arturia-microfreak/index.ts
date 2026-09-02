import { MICROFREAK_PANEL } from './panel'
import type {
  ArticulationEntry,
  CapabilityEvidence,
  Device,
  JackSignalKind,
  JackSpec,
  Recipe,
} from '../../core/device'
import { clockSourceSetupFact, jackFact } from '../../core/device'
import type { AuthoredEnumParam, AuthoredNumericParam, AuthoredParam, Cite } from '../../core/params'
import type { Role } from '../../core/vocabulary'

/**
 * Arturia MicroFreak (§2.3) — **one digital oscillator with eighteen models, one 12 dB analog
 * filter, one ADS envelope, one cycling envelope, one LFO and a 5×7 modulation matrix**, played
 * from a 25-key touch-capacitive keyboard as one voice or as four paraphonic ones.
 *
 * **Source**: `manuals/MicroFreak_Manual_4_0_3_EN.pdf`, 137 PDF pages, product version 4.0.1,
 * revision date 9 September 2022. **The printed page number is the PDF page number minus five**,
 * checked against the footers on PDF pp.10, 20, 50, 70, 100, 119, 121, 133 and 137 rather than
 * assumed. Every `p.N` below is the *printed* folio.
 *
 * That offset needs the check more than most, because `pdftotext` puts a stray `122` at the foot
 * of PDF p.120 — a cell of Appendix A's speech table, not a folio. Reading it as one would have
 * shifted every Appendix citation by seven pages.
 *
 * ---------------------------------------------------------------------------------------------
 * ## Paraphony: four notes, one filter, and a button that turns it off
 *
 * p.10 is the whole claim in one paragraph: *"The MicroFreak is a paraphonic four-voice
 * synthesizer. You can trigger the voices independently when this knob is lit. Their sound will
 * be similar as they all share the same analog filter."* p.3 says the same of the sequencers —
 * *"they can record and play back up to four voices, sharing the same filter, simultaneously"* —
 * and p.102 restates it at the panel: *"The MicroFreak has four oscillators. In standard
 * Paraphonic mode, you can play them as chords on the keyboard."*
 *
 * So this box has **four notes of pitch independence and one of everything that shapes them**.
 * That is modelled as **one assignable with `polyphony: 4`**, on the Matriarch's reading of the
 * same shape (§12.4/#40): a pool of four at `polyphony: 1` would be four *independent parts*, and
 * these four cannot carry four different roles when one filter, one envelope and one oscillator
 * model serve all of them. p.35 draws that line exactly where the model needs it — *"In
 * Paraphonic mode all voices will change to the same Type unlike Wave, Timbre and Shape
 * modulations that are on a per-voice basis."* One `Type` is one instrument.
 *
 * **This box's paraphony is not the textbook kind, and the difference does not change the
 * model.** p.10 again: *"The amplitude (volume) of each voice can be different on the MicroFreak,
 * which is not possible on most paraphonic synthesizers … internal, invisible VCA envelopes that
 * shape the volume of the individual voices together with the Main Envelope."* Arturia calls that
 * *"a form of extended paraphony"*. Those VCAs are invisible — no panel control addresses one,
 * and nothing in a rig can send a part to one — so they are capacity inside a part, which is what
 * `polyphony: 4` on a single assignable already says.
 *
 * ## Where `patchPolyphony` earns its place here, and where it would have been wrong
 *
 * `Recipe.patchPolyphony` (§12.4/#85) is supply-side: *this patch* sounds fewer notes than the
 * box can. It is **not** how paraphony is expressed — that is `VoiceSpec.polyphony`, above — and
 * using it for paraphony would have said the opposite of the truth. On this box three separate
 * printed facts each cap a patch at one note, and every recipe that hits one carries
 * `patchPolyphony: 1`:
 *
 *  1. **`Paraphonic` is a button, not a standing state.** p.10: the voices trigger independently
 *     *"when this knob is lit"*. Off, the box is monophonic. So every recipe below carries a
 *     `Paraphonic` param, exactly as the Matriarch carries `VOICE MODE`, and the ones that set it
 *     `Off` carry `patchPolyphony: 1`. A test asserts the pair can never come apart, and asserts
 *     that any role a shipped template requests with more than one note has `Paraphonic  On`.
 *  2. **Unison spends all four voices on one note.** p.102: *"In unison mode, all four oscillators
 *     will play together but tuned slightly apart thus generating a very fat sound."* That is the
 *     minilogue xd's UNISON case verbatim, and `mf-lead-soft` is it.
 *  3. **The `Chords` oscillator model turns paraphony off by itself.** p.42: *"Paraphony
 *     deactivates in this mode; the last key pressed is the root note, and only one chord can be
 *     playing."* A `Chords` recipe claiming four notes would be a lie the manual prints the
 *     refutation of, so `mf-stab-clean` sets `Paraphonic  Off` and `patchPolyphony: 1` — and
 *     sounds a chord anyway, which is what the model is for.
 *
 * Nothing here needed a field the model does not have.
 *
 * ## The knobs read 0–100, and that is a cited claim rather than a convenient one
 *
 * `Wave`, `Timbre` and `Shape` are 360° encoders with no printed scale on the panel, so the
 * temptation is percent-of-travel. It is not necessary: **Appendix A, p.113, prints the knob
 * value and the CC value in adjacent columns** for the Speech model — `Timbre` `0,0` / `50,0` /
 * `100,0` against `CC 12` `0` / `64` / `127`, and `Shape` `0,0 - 100,0` against `CC 13` `0 - 127`
 * — which pins the display domain at 0.0–100.0 and rules out 0–127 and 0–1023. The decimal comma
 * is Arturia's own typography.
 *
 * p.45 corroborates it independently on a different model, and that matters, because p.113 is a
 * Speech page and reading one model's table as every model's is the failure CLAUDE.md records for
 * the TR-8S's INST table. The Noise model's `Shape` is stated as *"from '0' to '100'"* with the
 * crossfade points at *"0%, … 33%, … 66% … and … 100%"*; p.37 has *"no effect when Wave is at 50
 * (sawtooth)"*; p.42 has *"At position ten you will hear the first inversion"*; p.47 states the
 * Vocoder `Wave` in percent throughout. The domain belongs to the knob, not to the model.
 *
 * **`Cutoff` and `Resonance` get no such page and so get no such range.** p.50 gives the cutoff
 * extremes as *"approximately 30Hz"* and *"exceeds 15kHz"* — hedged at both ends, so not bounds —
 * and the only instruction the manual ever gives for either knob is p.55's *"set the Cutoff to
 * minimum and Resonance to maximum"*. Both are `travel()`, provisional on the point and mood-inert
 * on the range, on the Minitaur's precedent for `RES`. Extending p.113's 0–100 to the filter
 * because the same box displays both would be exactly the cited-wrong-range error.
 *
 * ## The re-read of the filter and envelope ranges, and what it settled
 *
 * pp.50, 55, 56 and 58 were read again in full, on the question of whether any of the uncited
 * ranges below could be cited after all. None of them can, and the reasons differ by page.
 *
 * **`Cutoff` stays uncited.** p.50's two figures fail a `NumericRange` in two different ways.
 * The counter-clockwise end is *"approximately 30Hz"*, which is a figure with an admitted error
 * bar and no stated size, so it does not fix a minimum. The clockwise end *"exceeds 15kHz"*,
 * which is a floor on the maximum and not the maximum. A range is exact and closed at both ends;
 * writing `{ min: 30, max: 15_000 }` against p.50 would print a precision the page refuses to
 * claim, at both ends, in opposite directions. `Resonance` has no figures at all.
 *
 * **p.56 bounds two of the four envelope knobs and only two.** §9.3.1 gives Attack *"from 0 ms to
 * 10 seconds"* and §9.3.2 gives Decay/Release *"again from 0ms to 13 seconds"*. §9.3.3 on Sustain
 * describes what the stage does and prints no figure anywhere on the page. §9.4 on Filter Amount
 * says what it controls and closes with *"Filter amount is a bipolar control"*, which fixes the
 * sign and neither limit. So `cite(56)` sits on `Attack` and `Decay / Rel`, and putting it on the
 * other two would cite a page for something it does not say.
 *
 * **p.58's cycling-envelope figures are one worked example.** They appear inside a walkthrough
 * that opens *"To get a feel for the effect of changes you make to the stages of the envelope,
 * connect it to the pitch of the Digital Oscillator"* and then instructs *"set Rise to about 200
 * ms, hold to 0, fall to 0ms and amount to 50%"*. Every figure there is one setting the reader is
 * asked to dial, the first of them approximate. Four points on a knob are not that knob's bounds.
 *
 * ## What the manual documents about on-screen values
 *
 * Printed pp.11, 35 and 53 were rendered and read as images rather than taken from the text dump.
 *
 * p.35 documents current-value feedback at the oscillator. Changing `Type` shows *"a graphic
 * representation of that Type and its current values in the display"*, and of the three parameter
 * knobs it says *"turn a parameter knob, and the display will tell you what is being changed"*.
 * p.53 documents the LFO rate: *"If Sync is 'off' the values in the OLED window will be displayed
 * in Hz"*, and under sync *"the values are displayed as division values"*. p.11 says only that the
 * display *"will display valuable information about the knobs you turn and the buttons you push"*,
 * which names no form for that information.
 *
 * The images add no value claim the text had not already carried: p.11's photograph is the OLED
 * showing a preset name, p.35's is the four `DIGITAL OSCILLATOR` knobs with no display in the
 * frame, and p.53 carries no screen photograph. The ranges above rest on pp.50 and 56 and on
 * none of this.
 *
 * ## One knob, eighteen meanings — the oscillator models
 *
 * p.35 states the convention this manifest has to survive: *"For each Oscillator Type, we selected
 * three parameters that you can use to modify the basic sound: Wave, Timbre, and Shape. What these
 * parameters do will depend very much on the oscillator type … In the overview below we refer to
 * the display names."* So `Wave  60` means nothing until `Osc Type` is beside it, and `OSC_MODELS`
 * below is the table that keeps them together: `osc()` emits the model and its three knobs as one
 * unit and there is no way to author one without the others.
 *
 * **Two of the eighteen are deliberately unused.** `V.Analog` (p.40) prints its three display
 * names in the order `Detune`, `Shape`, `Wave`, and `SawX` (p.46) prints `Saw Mod`, `Shape`,
 * `Noise`. Under p.35's order-is-the-mapping convention the *Timbre* knob on both is displayed
 * `Shape`, and on `V.Analog` the *Shape* knob is displayed `Wave` — a collision with two other
 * knob names, on pages that never state the mapping outright. Guessing which knob a reader should
 * turn is inventing an assignment (invariant 5), so neither model appears in a recipe. They stay
 * in the table because `Osc Type`'s option list is a claim about what the box offers, not about
 * what this manifest uses.
 *
 * `explicitKnob` on every other entry records which half of the mapping the manual actually said:
 * `true` where a page names the physical knob (*"The Wave knob enables you to select a wave from
 * the 16 waves stored in the table"*, p.37), `false` where only p.35's print order establishes it.
 * The distinction is rendered into each knob's `note` rather than smoothed away.
 *
 * ## Three places the manual contradicts itself
 *
 * Recorded rather than reconciled, because a manual that disagrees with itself is evidence about
 * the manual:
 *
 *  - **LFO rate.** p.17 says *"(0.05Hz up to 100Hz)"*; p.53 says *"(0.06Hz up to 100Hz)"* and then
 *    *"the LFO ranges from 0.06Hz to 100Hz"* again in the same section. The authored range follows
 *    p.53 — the chapter devoted to the LFO, stating it twice, against one parenthesis in the panel
 *    tour — and the `note` on `LFO Rate` says so.
 *  - **Pressure output range.** p.63 says *"The selectable range is 0V to 10V"*; the Utility table
 *    on p.89 prints `Pressure range [1V … 10V]`. Recorded on the `CV / GATE OUT · Pressure` jack;
 *    no recipe depends on it.
 *  - **Gate output format.** p.106 lists *"(S-Trig, V-Trig 5V, V-Trig 10V)"*; p.89 and p.92 both
 *    print `V-Trig 12V`. Two pages against one, and still not resolvable from this document, so
 *    the jack note carries both readings.
 *
 * A fourth sits inside one model: the Vocoder `Wave` description is printed twice, and p.47's
 * *"at knob position 90% you reach a duty cycle of 99%"* becomes *"97%"* at p.118. No recipe uses
 * the Vocoder model, so nothing here depends on either figure.
 *
 * ## The panel is drawn, and half of it is measured
 *
 * This shipped undrawn, on the finding that §10 wants one complete, unobstructed, fully-labelled
 * figure and this manual has none. **That finding still stands.** The front-panel chapter draws the
 * instrument as three separately-cropped photographs — *"Top Row"* (p.9), *"Middle Row"* (p.13),
 * *"Bottom Row"* (p.15) — none showing the outer border, none including the keyboard, and there is
 * no specifications page anywhere in the 137 pages.
 *
 * What was wrong was the conclusion: *"estimating coordinates off a cropped photograph would
 * produce a drawing indistinguishable from the measured ones, which is worse than none."* They are
 * not indistinguishable. `PanelLayout.verified` is `Cite | false`, and the rack legend prints the
 * three states apart — *"panel not drawn yet"*, *"panel drawn, uncited"*, *"drawn from <cite>"*.
 * The choice was never measured-or-nothing.
 *
 * And the strips give more than they first appear to. **Each spans the instrument's full width**,
 * corner to corner, against a cited 311 mm — so every horizontal position and every diameter in
 * `panel.ts` is measured, as is each row's own height. What is inferred is how the three rows stack
 * vertically, and the citation's own text says so rather than leaving it to be discovered.
 *
 * ## `synth`, not `semi-modular`
 *
 * p.1 calls it *"a compact, versatile, semi-modular synthesizer … It enables you to experiment
 * with modular sound construction without the hassle of patch cords."* That last clause is the
 * reason the manifest says `synth`. §2.3's `semi-modular` means a normalised instrument a reader
 * re-routes with cables; the Matrix is internal, and the only voltages on the back — `CV`, `Gate`,
 * `Pressure` — are **outputs**, for driving something else (p.20). Nothing on this box can be
 * patched to anything else on this box, which is the Minitaur's reading of the same distinction.
 */

/** p.N is the printed folio; the module header records that it is the PDF page minus five. */
const cite = (page: number): Cite => ({ kind: 'manual', source: `MicroFreak User Manual 4.0.3 p.${page}` })

/**
 * #191. Arturia's own published figure, because the manual prints no dimension at all — see the
 * header for the pages checked. Not `provisional`: somebody has checked this, and anyone with the
 * link can check it again.
 */
const MAKER_SIZE: Cite = {
  kind: 'maker',
  source: 'Arturia MicroFreak product page, arturia.com/products/hardware-synths/microfreak/details (55 x 311 x 233 mm)',
}

// ---------------------------------------------------------------------------
// §3.1 Parameter helpers
// ---------------------------------------------------------------------------

/**
 * A numeric with a **cited range and an uncited point** — the ordinary shape here (§3.1).
 *
 * The range is legality and comes off a page; where in it this recipe sits is taste, and a
 * citation on the point would claim the manual chose the value. The cited range is also what lets
 * mood move the number at all, which on this box is most of what mood has to work with, since the
 * two filter knobs have no page and cannot participate.
 */
function num(
  name: string,
  value: number,
  bounds: { min: number; max: number },
  where: Cite,
  extra: Partial<AuthoredNumericParam> = {},
): AuthoredNumericParam {
  return {
    kind: 'numeric',
    name,
    value,
    range: { ...bounds, verified: where },
    verified: false,
    ...extra,
  }
}

/**
 * A knob position on a control with **no printed scale**, as percent of travel.
 *
 * Two on this box, `Cutoff` and `Resonance`, and the header says why p.113's 0–100 does not reach
 * them. Both claims are unverified and both render that way: the point is uncited so the guide
 * marks it provisional (§3.2), and `range.verified` is `false` so mood may not move a figure
 * nobody checked. `% travel` is a fact about a knob anyone can see; it is not a claim that the
 * display reads 0–100.
 */
function travel(
  name: string,
  value: number,
  extra: Partial<AuthoredNumericParam> = {},
): AuthoredNumericParam {
  return {
    kind: 'numeric',
    name,
    value,
    unit: '% travel',
    range: { min: 0, max: 100, verified: false },
    verified: false,
    ...extra,
  }
}

/** §3.2: the option set is legality and is cited; the selection is authority and is taste. */
function pick(
  name: string,
  value: string,
  options: readonly string[],
  where: Cite,
  extra: Partial<AuthoredEnumParam> = {},
): AuthoredEnumParam {
  return {
    kind: 'enum',
    name,
    value,
    options: { values: [...options], verified: where },
    verified: false,
    ...extra,
  }
}

// ---------------------------------------------------------------------------
// §3 The digital oscillator: eighteen models, three knobs, one table
// ---------------------------------------------------------------------------

/**
 * One oscillator model, and **what its three knobs are displayed as**.
 *
 * `explicitKnob` is the honest half of p.35's convention. `true` means the model's own page names
 * the physical knob beside the display name; `false` means only p.35's print order — *"we refer
 * to the display names"*, listed in `Wave`, `Timbre`, `Shape` order — establishes which knob is
 * which. Both are rendered into the knob's `note`, so a reader is never told the manual said
 * something it only implied.
 */
type OscModel = {
  /** The name the display shows, from the section heading's parentheses. */
  readonly screen: string
  /** Where §6.3 describes this model. */
  readonly page: number
  /** Display name of the `Wave` knob for this model. */
  readonly wave: string
  /** Display name of the `Timbre` knob for this model. */
  readonly timbre: string
  /** Display name of the `Shape` knob for this model. */
  readonly shape: string
  readonly explicitKnob: boolean
  /** Why this model is not authored, where it is not. */
  readonly unusable?: string
}

/**
 * §6.3.1–6.3.18, printed pp.36–47, in the manual's own subsection order. p.1 states the count:
 * *"As of version 4.0 it has a total of 18 personalities"*.
 *
 * The list is the `Osc Type` option set — a claim about what the box offers, cited — so the two
 * models no recipe can use honestly are still in it, carrying the reason in `unusable`.
 */
const OSC_MODELS = [
  { screen: 'BasicWaves', page: 37, wave: 'Morph', timbre: 'Sym', shape: 'Sub', explicitKnob: false },
  { screen: 'SuperWave', page: 37, wave: 'Wave', timbre: 'Detune', shape: 'Volume', explicitKnob: false },
  { screen: 'Wavetable', page: 37, wave: 'Table', timbre: 'Position', shape: 'Chorus', explicitKnob: true },
  { screen: 'Harmo', page: 38, wave: 'Content', timbre: 'Sculpting', shape: 'Chorus', explicitKnob: true },
  { screen: 'KarplusStr', page: 39, wave: 'Bow', timbre: 'Position', shape: 'Decay', explicitKnob: false },
  {
    screen: 'V.Analog',
    page: 40,
    wave: 'Detune',
    timbre: 'Shape',
    shape: 'Wave',
    explicitKnob: false,
    unusable:
      'p.40 prints the display names in the order Detune, Shape, Wave, so p.35’s convention puts "Wave" on the Shape knob and "Shape" on the Timbre knob — a collision with two other knob names that the page never resolves outright',
  },
  { screen: 'Waveshaper', page: 40, wave: 'Wave', timbre: 'Amount', shape: 'Asym', explicitKnob: false },
  { screen: 'Two Op. FM', page: 41, wave: 'Ratio', timbre: 'Amount', shape: 'Shape', explicitKnob: false },
  { screen: 'Formant', page: 41, wave: 'Interval', timbre: 'Formant', shape: 'Shape', explicitKnob: false },
  { screen: 'Chords', page: 42, wave: 'Type', timbre: 'Inv/Transp', shape: 'Waveform', explicitKnob: true },
  { screen: 'Speech', page: 43, wave: 'Type', timbre: 'Timbre', shape: 'Word', explicitKnob: true },
  { screen: 'Modal', page: 44, wave: 'Inharm', timbre: 'Timbre', shape: 'Decay', explicitKnob: false },
  { screen: 'Noise', page: 45, wave: 'Wave', timbre: 'Timbre', shape: 'Shape', explicitKnob: true },
  { screen: 'Bass', page: 45, wave: 'Saturate', timbre: 'Fold', shape: 'Noise', explicitKnob: false },
  {
    screen: 'SawX',
    page: 46,
    wave: 'Saw Mod',
    timbre: 'Shape',
    shape: 'Noise',
    explicitKnob: false,
    unusable:
      'p.46 prints the display names in the order Saw Mod, Shape, Noise, so p.35’s convention puts "Shape" on the Timbre knob — the same unresolved collision as V.Analog',
  },
  { screen: 'Harm', page: 46, wave: 'Spread', timbre: 'Rectification', shape: 'Noise', explicitKnob: false },
  { screen: 'WaveUser', page: 46, wave: 'Table', timbre: 'Position', shape: 'Bitdepth', explicitKnob: true },
  { screen: 'Vocoder', page: 47, wave: 'Wave', timbre: 'Timbre', shape: 'Shape', explicitKnob: true },
] as const satisfies readonly OscModel[]

type OscScreen = (typeof OSC_MODELS)[number]['screen']

const OSC_NAMES = OSC_MODELS.map((m) => m.screen)

const modelOf = (screen: OscScreen): OscModel => {
  const found = OSC_MODELS.find((m) => m.screen === screen)
  /* c8 ignore next */
  if (found === undefined) throw new Error(`no oscillator model '${screen}'`)
  return found
}

/**
 * §3.1/§3.2. **The oscillator section, emitted as one unit so the model and its three knobs
 * cannot come apart.**
 *
 * This is CLAUDE.md's rule about a control with more than one printed scale, and this box is the
 * strongest case in the library: the same three knobs mean eighteen different things, and `Timbre
 * 40` beside `Speech` is a formant shift while `Timbre 40` beside `Bass` is a wavefold. A recipe
 * that set the knobs without the model would be a value read off the wrong scale, however
 * carefully the range beside it was cited.
 *
 * The range on all three is p.113's, once, because it is the knob's domain rather than the
 * model's — see the header for why that reading is safe and what corroborates it.
 */
function osc(
  screen: OscScreen,
  wave: number,
  timbre: number,
  shape: number,
): AuthoredParam[] {
  const m = modelOf(screen)
  const how = m.explicitKnob
    ? `p.${m.page} names the knob`
    : `knob from p.35’s Wave/Timbre/Shape print order; p.${m.page} names only the display`
  const knob = (name: string, display: string, value: number): AuthoredNumericParam =>
    num(name, value, { min: 0, max: 100 }, cite(113), {
      note: `Displays as "${display}" under ${m.screen} (${how}). Range is the knob’s own 0,0–100,0, printed against CC 0–127 on p.113`,
    })
  return [
    pick('Osc Type', m.screen, OSC_NAMES, cite(36), {
      note: 'The eighteen models are printed on pp.36–47; p.1 states the count. Wave, Timbre and Shape mean something different under each, so this is set first',
      hint: 'osc-model',
    }),
    knob('Wave', m.wave, wave),
    knob('Timbre', m.timbre, timbre),
    knob('Shape', m.shape, shape),
  ]
}

// ---------------------------------------------------------------------------
// §3.1 The rest of the panel
// ---------------------------------------------------------------------------

/** p.48: *"The Type button enables you to switch between the three filter types."* */
const FILTER_TYPES = ['LPF', 'BPF', 'HPF'] as const

/**
 * The analog filter. Named `Filter Type` rather than `Type` because the panel silkscreens `Type`
 * twice — once in `DIGITAL OSCILLATOR` and once in `ANALOG FILTER` (p.13) — and a recipe is a flat
 * list of parameters where a reader would have no way to tell which knob was meant.
 *
 * `Cutoff` and `Resonance` are percent of travel; the header has the reasoning and the pages.
 * p.50 was read again and still cannot be cited: *"approximately"* leaves the minimum with an
 * error bar of unstated size and *"exceeds"* gives a floor on the maximum instead of the maximum.
 */
function filter(type: (typeof FILTER_TYPES)[number], cutoff: number, resonance: number): AuthoredParam[] {
  return [
    pick('Filter Type', type, FILTER_TYPES, cite(48), {
      note: 'Silkscreened `Type` inside ANALOG FILTER (p.13); qualified here because the oscillator’s knob carries the same word',
      hint: 'filter-type',
    }),
    travel('Cutoff', cutoff, {
      note: 'No printed scale. p.50 gives the extremes as "approximately 30Hz" fully counter-clockwise and "exceeds 15kHz" fully clockwise — hedged at both ends, so not a range',
    }),
    travel('Resonance', resonance, {
      note: 'No printed scale. p.49 says the clockwise extreme self-oscillates and "will block all sound from the Digital Oscillator" in BPF',
    }),
  ]
}

/**
 * The main envelope. p.56: *"The Envelope Generator of MicroFreak has three stages: Attack,
 * Decay/Release and Sustain. Technically speaking it is an ADS envelope."*
 *
 * `Attack` and `Decay / Rel` carry real cited millisecond bounds and are where most of this box's
 * mood movement lives. `Sustain` does not: the manual prints one figure for it anywhere — p.55's
 * worked example *"sustain to 90%"* — which fixes the unit and says nothing about the bounds, so
 * the range is unverified and mood may not move it. `Filter Amt` is the same shape, with p.56's
 * *"Filter amount is a bipolar control"* fixing the sign and p.55's *"filter amount to 70"* the
 * only number printed.
 *
 * p.56 was read again in full to check that split. It bounds Attack in §9.3.1 and Decay/Release
 * in §9.3.2, and its Sustain and Filter Amount sections print no figure at all, so two of these
 * four carry `cite(56)` and two cannot. The header has the reading.
 */
function envelope(
  attack: number,
  decay: number,
  sustain: number,
  filterAmt: number,
  ampMod: 'On' | 'Off',
): AuthoredParam[] {
  return [
    num('Attack', attack, { min: 0, max: 10_000 }, cite(56), {
      unit: 'ms',
      note: 'p.56: "Attack sets the time, from 0 ms to 10 seconds, the envelope takes to reach its initial level"',
      mood: [{ axis: 'density', amount: -180 }],
    }),
    num('Decay / Rel', decay, { min: 0, max: 13_000 }, cite(56), {
      unit: 'ms',
      note: 'p.56: "Decay/Release adjusts the time, again from 0ms to 13 seconds"',
      mood: [
        { axis: 'space', amount: 900 },
        { axis: 'density', amount: -320 },
      ],
    }),
    {
      kind: 'numeric',
      name: 'Sustain',
      value: sustain,
      unit: '%',
      range: { min: 0, max: 100, verified: false },
      verified: false,
      note: 'p.55’s worked example is the only figure the manual prints for this knob — "sustain to 90%" — which fixes the unit and not the bounds, so mood may not move it',
    },
    {
      kind: 'numeric',
      name: 'Filter Amt',
      value: filterAmt,
      range: { min: -100, max: 100, verified: false },
      verified: false,
      note: 'p.56: "Filter amount is a bipolar control", and p.55’s example sets it to 70. Neither states a limit, so the bounds are unverified and mood-inert',
    },
    pick('Amp Mod', ampMod, ['On', 'Off'], cite(57), {
      note: 'p.57: lit, the envelope shapes loudness as well as cutoff; unlit, the gate drives the VCA directly and the envelope still reaches the filter',
    }),
  ]
}

/** p.52 and p.17 both list the six, in the same order. */
const LFO_SHAPES = ['Sine', 'Triangle', 'Rising saw', 'Square', 'Random stepped', 'Random gliding'] as const

/**
 * The LFO. Free-running rather than synced in every recipe here, because `Rate` is one knob with
 * two printed scales — Hz when Sync is off, clock divisions when it is on (p.53) — so the `Sync`
 * param travels with the figure, and the recipes that want a tempo-locked wobble say so with a
 * division instead of a frequency.
 */
function lfoFree(shape: (typeof LFO_SHAPES)[number], hz: number): AuthoredParam[] {
  return [
    pick('LFO Shape', shape, LFO_SHAPES, cite(52), {
      note: 'p.52: "sine, triangle, rising sawtooth, rectangle (square), random (sample & hold) and random gliding"',
    }),
    pick('LFO Sync', 'Off', ['Off', 'On'], cite(53), {
      note: 'Press the Rate encoder to toggle. Off, Rate reads in Hz; on, it reads in clock divisions — the same knob, two scales',
      hint: 'lfo-sync',
    }),
    num('LFO Rate', hz, { min: 0.06, max: 100 }, cite(53), {
      unit: 'Hz',
      note: 'p.53 twice: "0.06Hz up to 100Hz" and "the LFO ranges from 0.06Hz to 100Hz". p.17 says 0.05Hz for the same knob; the LFO chapter is followed here',
      mood: [{ axis: 'density', amount: 1.4 }],
    }),
  ]
}

/** The synced half of the same knob. p.53 lists the divisions; the header explains the pairing. */
const LFO_DIVISIONS = [
  '8/1', '4/1', '2/1', '1/1', '1/2', '1/2t', '1/4', '1/4t', '1/8', '1/8t', '1/16', '1/16t', '1/32',
] as const

function lfoSynced(
  shape: (typeof LFO_SHAPES)[number],
  division: (typeof LFO_DIVISIONS)[number],
): AuthoredParam[] {
  return [
    pick('LFO Shape', shape, LFO_SHAPES, cite(52)),
    pick('LFO Sync', 'On', ['Off', 'On'], cite(53), {
      note: 'Press the Rate encoder. Synced, Rate reads divisions rather than Hz',
      hint: 'lfo-sync',
    }),
    pick('LFO Rate', division, LFO_DIVISIONS, cite(53), {
      note: 'p.53: "ranging from 8/1 all the way up to 1/32, with in-between values of 4/1, 2/1, 1/1, 1/2, 1/2t, 1/4, 1/4t, 1/8, 1/8t, 1/16 and 1/16t"',
    }),
  ]
}

/** p.58: *"The Mode button enables you to select one of three modes: Env …, Run, and Loop."* */
const CYC_MODES = ['Env', 'Run', 'Loop'] as const

/**
 * The cycling envelope — the second modulator, and in `Run` or `Loop` a complex LFO (p.57).
 *
 * Its three time knobs get no printed bounds anywhere. p.58 and p.103 between them give five
 * worked figures — rise 200 ms and 2.5 s, fall 0 ms and 150 ms, hold 0 ms — which establish the
 * unit and nothing else, so the ranges are unverified. `Amount` is the attenuator, stated in
 * percent by p.58's *"amount to 50%"*.
 *
 * p.58's four figures were re-read in place. They sit inside the walkthrough that begins *"To get
 * a feel for the effect of changes you make to the stages of the envelope"*, which asks the reader
 * to set one value on each knob, the first of them *"about 200 ms"*. p.103's rise 2.5 s, fall
 * 150 ms and hold 0 ms are the same shape, a numbered *"To create this effect"* list for
 * modulating Unison spread. Example settings, so they stay out of the ranges.
 */
function cyclingEnv(
  mode: (typeof CYC_MODES)[number],
  rise: number,
  fall: number,
  hold: number,
  amount: number,
): AuthoredParam[] {
  const time = (name: string, value: number): AuthoredNumericParam => ({
    kind: 'numeric',
    name,
    value,
    unit: 'ms',
    range: { min: 0, max: 10_000, verified: false },
    verified: false,
    note: 'The manual prints no bounds for this knob; p.58 and p.103 give worked settings in ms and seconds, which fix the unit only',
  })
  return [
    pick('Cyc Mode', mode, CYC_MODES, cite(58), {
      note: 'p.58: Env cycles once; Run free-runs and resets on MIDI start; Loop retriggers from the keyboard, sequencer or arpeggiator',
    }),
    time('Rise', rise),
    time('Fall', fall),
    time('Hold', hold),
    {
      kind: 'numeric',
      name: 'Amount',
      value: amount,
      unit: '%',
      range: { min: 0, max: 100, verified: false },
      verified: false,
      note: 'p.59 calls it an attenuator; p.58’s worked example is "amount to 50%", the only figure printed for it',
    },
  ]
}

/**
 * A modulation matrix routing, as one parameter (§3.1).
 *
 * The Matrix is internal, so this is not a `patch` — nothing here is a cable. p.28 gives the
 * amount its range outright: *"using the Matrix encoder you can dial-in any amount from -100% to
 * +100%"*, which is a properly cited range and therefore something mood may move, unlike either
 * filter knob.
 *
 * Sources and destinations are the manual's own names, from the two tables on pp.30–31.
 */
const MATRIX_SOURCES = ['CycEnv', 'ENV', 'LFO', 'PRESSURE', 'KEY / ARP'] as const

function matrix(
  source: (typeof MATRIX_SOURCES)[number],
  destination: string,
  amount: number,
  mood?: AuthoredNumericParam['mood'],
): AuthoredNumericParam {
  return num(`Matrix  ${source} > ${destination}`, amount, { min: -100, max: 100 }, cite(28), {
    unit: '%',
    note: 'p.30: five sources, seven destinations, 35 points. Pitch, Wave, Timbre and Cutoff are hardwired; Assign 1–3 are whatever knob you assign them to (p.31)',
    hint: 'matrix-amount',
    ...(mood === undefined ? {} : { mood }),
  })
}

/**
 * §12.4. **The button that decides whether this is a four-note instrument or a one-note one.**
 *
 * Every recipe carries it. p.10: the voices trigger independently *"when this knob is lit"* — so
 * a recipe that left it out would be printing four-note parameter values beside a box that might
 * be in mono, which is the Matriarch's `VOICE MODE` problem exactly. `mf-paraphony.test.ts`
 * asserts the pairing with `patchPolyphony` and against every shipped template's note counts.
 */
function paraphonic(on: boolean): AuthoredEnumParam {
  return pick('Paraphonic', on ? 'On' : 'Off', ['On', 'Off'], cite(10), {
    note: on
      ? 'p.10: lit, the four voices trigger independently and share the one analog filter'
      : 'p.10: unlit, the box plays one note at a time — which is why this recipe declares patchPolyphony 1',
    hint: on ? 'paraphonic-on' : 'paraphonic-off',
  })
}

/**
 * `Glide` is the third control on this box whose scale a setting elsewhere replaces, so the mode
 * travels with the value exactly as `Osc Type` travels with the oscillator knobs.
 *
 * p.63: in `Time` it *"can vary from zero to 10 seconds"*; in `Sync` the value is a division from
 * `1/32T` to `1/1`; in `Rate` it is *"how fast Glide will rise or fall within an octave"*. Only
 * `Time` is authored, and its bound is p.63's — hedged as *"about 10 seconds"*, which the note
 * records.
 */
function glideTime(ms: number): AuthoredParam[] {
  return [
    pick('Glide mode', 'Time', ['Time', 'Sync', 'Rate'], cite(88), {
      note: 'Utility > Preset > Glide mode. The Glide knob reads seconds in Time, clock divisions in Sync and a rate in Rate — three scales on one knob (p.63)',
      hint: 'glide-mode',
    }),
    num('Glide', ms, { min: 0, max: 10_000 }, cite(63), {
      unit: 'ms',
      note: 'p.63: "The glide time is variable from \\"off\\" to about 10 seconds" — the manual hedges the upper end and prints no other figure',
      mood: [{ axis: 'swing', amount: 120 }],
    }),
  ]
}

// ---------------------------------------------------------------------------
// §3.3 Jacks
// ---------------------------------------------------------------------------

/** §2.6/#22. Jack citations are collected here and merged into `capabilityEvidence` below. */
const JACK_EVIDENCE: Record<string, CapabilityEvidence> = {}

/**
 * A socket on the back panel (§3.3), qualified with the panel's own bracket legends — p.19's
 * figure prints `CV / GATE OUT` over three sockets and `CLOCK` and `MIDI` each over an `In` and an
 * `Out`, and without the qualifier this box would declare two jacks called `In`.
 *
 * **`USB` and the headphone socket are deliberately absent**, on the Minitaur's convention. The
 * headphone jack is silkscreened as a pictogram with no text to qualify an id with, and `USB` is
 * bidirectional where `JackSpec.direction` is one of `in` or `out`; `clock.transport` already
 * carries USB, and `io` already carries both audio paths.
 */
function jack(
  id: string,
  direction: 'in' | 'out',
  signal: JackSignalKind[],
  page: number,
  extra: Partial<JackSpec> = {},
): JackSpec {
  JACK_EVIDENCE[jackFact(id)] = cite(page)
  return { id, direction, signal, ...extra }
}

/** The back panel, left to right as p.19's figure draws it. */
const JACKS: readonly JackSpec[] = [
  jack('OUTPUT', 'out', ['audio'], 19, {
    note: 'p.19: 6.35 mm (1/4") mono, "symmetrical/balanced type output" — a TRS cable "will improve the signal-to-noise ratio"',
  }),
  jack('CV / GATE OUT · CV', 'out', ['pitch-cv'], 20, {
    note: 'Output only — this box drives a modular, it takes no voltage in. 1V/Oct by default; Hz/V and 1.2V/Oct in Utility > CV/Gate > Pitch format (p.105, p.107)',
  }),
  jack('CV / GATE OUT · Gate', 'out', ['gate'], 20, {
    note: 'Format in Utility > CV/Gate > Gate format. p.89 and p.92 print S-Trig, V-Trig 5V, V-Trig 12V; p.106 prints V-Trig 10V for the third. The manual disagrees with itself and this document cannot settle it',
  }),
  jack('CV / GATE OUT · Pressure', 'out', ['cv'], 20, {
    note: 'Carries pressure or velocity, per Utility > Preset > Press mode (p.20). p.89 gives the range as 1V–10V and p.63 as 0V–10V; the manual disagrees with itself',
  }),
  jack('CLOCK · In', 'in', ['clock'], 20, {
    clock: ['analog-clock'],
    note: 'p.20: "The use of a TRS jack provides both clock and start signals. A TS jack provides only clock signals." Rate is set in Utility > Sync > Clock',
  }),
  jack('CLOCK · Out', 'out', ['clock'], 20, {
    clock: ['analog-clock'],
    note: 'p.20: a TRS cable carries start as well as clock; TS carries clock alone. p.77: the pulses leave whenever the box is playing',
  }),
  jack('MIDI · In', 'in', ['midi', 'clock'], 20, {
    clock: ['midi-din'],
    note: '1/8" TRS, not 5-pin — p.20 and p.7 both direct the reader to "the included MIDI adapters (1/8" TRS jack to 5-pin DIN, gray)"',
  }),
  jack('MIDI · Out', 'out', ['midi', 'clock'], 20, {
    clock: ['midi-din'],
    note: '1/8" TRS with the same included adapter. There is no MIDI Thru socket; Utility > MIDI > Thru echoes In to Out in software instead (p.89)',
  }),
]

// ---------------------------------------------------------------------------
// §3 Recipes
// ---------------------------------------------------------------------------

/**
 * Twenty-two recipes over nine roles. Roughly the density the skill asks for, and every one of
 * them carries `Paraphonic` and an `Osc Type`, because neither of those can be left to a default
 * without the numbers beside them meaning something else.
 */
/**
 * §4.3. **What an accented step does on this box**, addressed by `PatternSlot` so it survives
 * whichever pattern variant the template hands over.
 *
 * The lane is p.82's, and it is the sequencer's signature: *"modulation tracks record knob
 * positions … As there are four tracks you can store the values of four knobs, up to 64 values
 * for each knob."* One track holding a raised `Cutoff` on the accented steps is the plainest
 * useful thing to do with it, and it is a per-step claim rather than a patch-wide one.
 *
 * `velocity` is deliberately not used here even though p.82 records it per step, because whether
 * the keyboard sends velocity at all depends on `Utility > Preset > Press mode` (p.62) — the same
 * two-scales-on-one-control trap as `Glide` and the oscillator knobs, and not one worth opening
 * for an accent when the modulation track needs no such setting.
 */
function modTrackLift(slot: 'accent' | 'downbeat'): ArticulationEntry[] {
  return [{ slot, set: { modulation: 'Cutoff up' }, hint: 'mod-track', verified: cite(82) }]
}

const recipes: Recipe[] = [
  // ---- pad ----------------------------------------------------------------
  {
    id: 'mf-pad-soft',
    role: 'pad',
    character: 'soft',
    voice: 'voice',
    verified: false,
    title: 'Four-note SuperWave pad, detuned wide and opening slowly',
    params: [
      paraphonic(true),
      ...osc('SuperWave', 30, 62, 70),
      ...filter('LPF', 46, 22),
      ...envelope(1700, 4200, 78, 34, 'On'),
      ...cyclingEnv('Run', 2500, 1800, 400, 40),
      ...lfoFree('Sine', 0.35),
      matrix('CycEnv', 'Cutoff', 28, [{ axis: 'darkness', amount: -18 }]),
      ...glideTime(0),
    ],
  },
  {
    id: 'mf-pad-dark',
    role: 'pad',
    character: 'dark',
    voice: 'voice',
    verified: false,
    title: 'Modal resonator pad, long damping, filter kept low',
    params: [
      paraphonic(true),
      ...osc('Modal', 44, 30, 76),
      ...filter('LPF', 30, 30),
      ...envelope(2200, 6500, 66, 22, 'On'),
      ...cyclingEnv('Run', 3200, 2600, 600, 32),
      ...lfoFree('Triangle', 0.22),
      matrix('LFO', 'Timbre', 16),
      ...glideTime(0),
    ],
  },
  {
    id: 'mf-pad-bright',
    role: 'pad',
    character: 'bright',
    voice: 'voice',
    verified: false,
    title: 'Wavetable pad drifting through its cycles, chorus on',
    params: [
      paraphonic(true),
      ...osc('Wavetable', 24, 48, 72),
      ...filter('LPF', 70, 18),
      ...envelope(900, 3400, 82, 42, 'On'),
      ...cyclingEnv('Run', 1800, 1400, 200, 46),
      ...lfoSynced('Triangle', '1/1'),
      matrix('LFO', 'Timbre', 34),
      ...glideTime(0),
    ],
  },

  // ---- stab ---------------------------------------------------------------
  {
    id: 'mf-stab-hard',
    role: 'stab',
    character: 'hard',
    voice: 'voice',
    verified: false,
    title: 'Three-note BasicWaves stab, envelope straight onto the cutoff',
    articulation: modTrackLift('accent'),
    params: [
      paraphonic(true),
      ...osc('BasicWaves', 62, 40, 0),
      ...filter('LPF', 38, 58),
      ...envelope(0, 320, 12, 74, 'On'),
      ...cyclingEnv('Env', 0, 180, 0, 30),
      ...lfoFree('Square', 6),
      ...glideTime(0),
    ],
  },
  {
    id: 'mf-stab-bright',
    role: 'stab',
    character: 'bright',
    voice: 'voice',
    verified: false,
    title: 'SuperWave stab, short and wide, top end left open',
    articulation: modTrackLift('accent'),
    params: [
      paraphonic(true),
      ...osc('SuperWave', 0, 44, 62),
      ...filter('HPF', 22, 34),
      ...envelope(0, 420, 20, 56, 'On'),
      ...cyclingEnv('Env', 0, 240, 0, 36),
      ...lfoFree('Triangle', 4.5),
      ...glideTime(0),
    ],
  },
  {
    /**
     * §12.4/#85. `Chords` is the one oscillator model that takes the decision out of the reader's
     * hands: p.42, *"Paraphony deactivates in this mode; the last key pressed is the root note,
     * and only one chord can be playing."* So `Paraphonic  Off` and `patchPolyphony: 1` — and it
     * still sounds a chord, which is the whole point of the model.
     */
    id: 'mf-stab-clean',
    role: 'stab',
    character: 'clean',
    voice: 'voice',
    patchPolyphony: 1,
    verified: false,
    title: 'Chords model, minor seventh, one key one chord',
    articulation: modTrackLift('accent'),
    params: [
      paraphonic(false),
      ...osc('Chords', 42, 10, 30),
      ...filter('LPF', 62, 20),
      ...envelope(20, 640, 34, 40, 'On'),
      ...cyclingEnv('Env', 0, 300, 0, 24),
      ...lfoFree('Sine', 2.2),
      ...glideTime(0),
    ],
  },

  // ---- lead ---------------------------------------------------------------
  {
    id: 'mf-lead-bright',
    role: 'lead',
    character: 'bright',
    voice: 'voice',
    patchPolyphony: 1,
    verified: false,
    title: 'Harm lead, partials spread toward the octave',
    params: [
      paraphonic(false),
      ...osc('Harm', 68, 34, 12),
      ...filter('LPF', 74, 40),
      ...envelope(20, 900, 70, 48, 'On'),
      ...cyclingEnv('Env', 60, 420, 0, 38),
      ...lfoFree('Sine', 5.2),
      matrix('PRESSURE', 'Timbre', 42),
      ...glideTime(60),
    ],
  },
  {
    id: 'mf-lead-dirty',
    role: 'lead',
    character: 'dirty',
    voice: 'voice',
    patchPolyphony: 1,
    verified: false,
    title: 'Waveshaper lead, folded hard and asymmetric',
    params: [
      paraphonic(false),
      ...osc('Waveshaper', 36, 78, 58),
      ...filter('LPF', 58, 56),
      ...envelope(10, 700, 62, 60, 'On'),
      ...cyclingEnv('Env', 0, 380, 0, 44),
      ...lfoFree('Random gliding', 7.5),
      matrix('LFO', 'Timbre', 26, [{ axis: 'grit', amount: 22 }]),
      ...glideTime(90),
    ],
  },
  {
    id: 'mf-lead-hard',
    role: 'lead',
    character: 'hard',
    voice: 'voice',
    patchPolyphony: 1,
    verified: false,
    title: 'Two-operator FM lead, high index, feedback biting',
    params: [
      paraphonic(false),
      ...osc('Two Op. FM', 54, 72, 46),
      ...filter('LPF', 66, 34),
      ...envelope(0, 560, 48, 66, 'On'),
      ...cyclingEnv('Env', 0, 220, 0, 52),
      ...lfoFree('Square', 9),
      matrix('ENV', 'Timbre', -38),
      ...glideTime(0),
    ],
  },
  {
    /**
     * §12.4/#85. Unison, and the same claim the minilogue xd's UNISON recipes make: p.102, *"In
     * unison mode, all four oscillators will play together but tuned slightly apart"*. Four voices
     * spent on one note is `patchPolyphony: 1`, and `Unison Count` says how many were spent.
     */
    id: 'mf-lead-soft',
    role: 'lead',
    character: 'soft',
    voice: 'voice',
    patchPolyphony: 1,
    verified: false,
    title: 'Unison lead, all four voices on one note, spread just under a semitone',
    params: [
      paraphonic(false),
      pick('Unison', 'On', ['On', 'Off'], cite(102), {
        note: 'Hold Shift and press Paraphonic. p.102: "all four oscillators will play together but tuned slightly apart thus generating a very fat sound"',
        hint: 'unison',
      }),
      num('Unison Count', 4, { min: 2, max: 4 }, cite(88), {
        note: 'Utility > Preset > Unison Count. p.103: at three, "one voice remains available to play the keyboard in duo-phonic mode"',
      }),
      num('Unison Spread', 0.9, { min: 0.001, max: 12 }, cite(88), {
        unit: 'st',
        note: 'p.102: "The display will show the amount of spread in increments from 0.001 to 12.000 (an octave)"',
        mood: [{ axis: 'grit', amount: 0.6 }],
      }),
      ...osc('SuperWave', 0, 54, 66),
      ...filter('LPF', 60, 24),
      ...envelope(120, 1100, 74, 40, 'On'),
      ...cyclingEnv('Env', 200, 600, 0, 34),
      ...lfoFree('Sine', 3.4),
      ...glideTime(120),
    ],
  },

  // ---- bass-mid -----------------------------------------------------------
  {
    id: 'mf-bass-mid-dirty',
    role: 'bass-mid',
    character: 'dirty',
    voice: 'voice',
    patchPolyphony: 1,
    verified: false,
    title: 'Bass model, saturated and folded, noise between the fold stages',
    articulation: modTrackLift('accent'),
    params: [
      paraphonic(false),
      ...osc('Bass', 66, 58, 24),
      ...filter('LPF', 40, 46),
      ...envelope(0, 480, 30, 62, 'On'),
      ...cyclingEnv('Env', 0, 200, 0, 40),
      ...lfoFree('Square', 5),
      matrix('ENV', 'Cutoff', 44, [{ axis: 'darkness', amount: -20 }]),
      ...glideTime(40),
    ],
  },
  {
    id: 'mf-bass-mid-dark',
    role: 'bass-mid',
    character: 'dark',
    voice: 'voice',
    patchPolyphony: 1,
    verified: false,
    title: 'BasicWaves square bass, pulse width off centre, filter closed down',
    articulation: modTrackLift('accent'),
    params: [
      paraphonic(false),
      ...osc('BasicWaves', 20, 30, 18),
      ...filter('LPF', 26, 38),
      ...envelope(0, 620, 24, 48, 'On'),
      ...cyclingEnv('Env', 0, 260, 0, 30),
      ...lfoFree('Triangle', 2.8),
      ...glideTime(0),
    ],
  },

  // ---- sub ----------------------------------------------------------------
  {
    id: 'mf-sub-dark',
    role: 'sub',
    character: 'dark',
    voice: 'voice',
    patchPolyphony: 1,
    verified: false,
    title: 'BasicWaves with the sine sub-oscillator up, everything above it removed',
    articulation: modTrackLift('downbeat'),
    params: [
      paraphonic(false),
      ...osc('BasicWaves', 50, 0, 88),
      ...filter('LPF', 18, 8),
      ...envelope(0, 780, 68, 12, 'On'),
      ...cyclingEnv('Env', 0, 300, 0, 20),
      ...lfoFree('Sine', 0.5),
      ...glideTime(0),
    ],
  },
  {
    id: 'mf-sub-clean',
    role: 'sub',
    character: 'clean',
    voice: 'voice',
    patchPolyphony: 1,
    verified: false,
    title: 'Bass model with saturation and fold backed off to a near-sine',
    articulation: modTrackLift('downbeat'),
    params: [
      paraphonic(false),
      ...osc('Bass', 8, 6, 0),
      ...filter('LPF', 22, 6),
      ...envelope(0, 860, 72, 10, 'On'),
      ...cyclingEnv('Env', 0, 340, 0, 18),
      ...lfoFree('Sine', 0.4),
      ...glideTime(0),
    ],
  },

  // ---- arp ----------------------------------------------------------------
  {
    id: 'mf-arp-bright',
    role: 'arp',
    character: 'bright',
    voice: 'voice',
    verified: false,
    title: 'Wavetable arpeggio, cycles walking under a synced LFO',
    articulation: modTrackLift('downbeat'),
    params: [
      paraphonic(true),
      ...osc('Wavetable', 40, 30, 20),
      ...filter('LPF', 68, 36),
      ...envelope(0, 380, 18, 52, 'On'),
      ...cyclingEnv('Loop', 0, 260, 0, 42),
      ...lfoSynced('Rising saw', '1/8'),
      matrix('LFO', 'Timbre', 40),
      ...glideTime(0),
    ],
  },
  {
    id: 'mf-arp-dark',
    role: 'arp',
    character: 'dark',
    voice: 'voice',
    verified: false,
    title: 'Harmo arpeggio, sculpting toward the sine, damped',
    articulation: modTrackLift('downbeat'),
    params: [
      paraphonic(true),
      ...osc('Harmo', 28, 22, 34),
      ...filter('LPF', 34, 42),
      ...envelope(0, 440, 14, 44, 'On'),
      ...cyclingEnv('Loop', 0, 300, 0, 34),
      ...lfoSynced('Triangle', '1/4'),
      ...glideTime(0),
    ],
  },

  // ---- texture ------------------------------------------------------------
  {
    id: 'mf-texture-dark',
    role: 'texture',
    character: 'dark',
    voice: 'voice',
    verified: false,
    title: 'Modal bodies struck by the cycling envelope, inharmonic and slow',
    params: [
      paraphonic(true),
      ...osc('Modal', 74, 46, 84),
      ...filter('BPF', 36, 52),
      ...envelope(1400, 7600, 58, 30, 'On'),
      ...cyclingEnv('Run', 4200, 3600, 900, 56),
      ...lfoFree('Random gliding', 0.18),
      matrix('CycEnv', 'Timbre', 48),
      ...glideTime(0),
    ],
  },
  {
    id: 'mf-texture-soft',
    role: 'texture',
    character: 'soft',
    voice: 'voice',
    verified: false,
    title: 'Granular formant bed, formants drifting apart',
    params: [
      paraphonic(true),
      ...osc('Formant', 34, 52, 60),
      ...filter('LPF', 52, 28),
      ...envelope(2600, 8200, 74, 24, 'On'),
      ...cyclingEnv('Run', 5200, 4400, 1200, 44),
      ...lfoFree('Random gliding', 0.12),
      matrix('LFO', 'Wave', 22),
      ...glideTime(0),
    ],
  },

  // ---- noise --------------------------------------------------------------
  {
    id: 'mf-noise-dirty',
    role: 'noise',
    character: 'dirty',
    voice: 'voice',
    patchPolyphony: 1,
    verified: false,
    title: 'Noise model between particle and white, sample rate crushed',
    articulation: modTrackLift('accent'),
    params: [
      paraphonic(false),
      ...osc('Noise', 30, 72, 0),
      ...filter('BPF', 48, 44),
      ...envelope(0, 1400, 40, 36, 'On'),
      ...cyclingEnv('Run', 400, 900, 100, 50),
      ...lfoFree('Random stepped', 12),
      matrix('LFO', 'Cutoff', 34, [{ axis: 'grit', amount: 20 }]),
      ...glideTime(0),
    ],
  },
  {
    /**
     * The `Shape` value here is one of the four crossfade points p.45 prints outright — *"noise
     * only at 0%, noise + sine wave at 33%, noise + triangle wave at 66% and noise + square wave
     * at 100%"* — so `33` is a stated landmark rather than a chosen number, and the note says so.
     */
    id: 'mf-noise-hard',
    role: 'noise',
    character: 'hard',
    voice: 'voice',
    patchPolyphony: 1,
    verified: false,
    title: 'Metallic noise with a sine underneath it, filter narrow',
    articulation: modTrackLift('accent'),
    params: [
      paraphonic(false),
      ...osc('Noise', 88, 46, 33),
      ...filter('BPF', 62, 66),
      ...envelope(0, 520, 10, 54, 'On'),
      ...cyclingEnv('Env', 0, 240, 0, 46),
      ...lfoFree('Random stepped', 16),
      ...glideTime(0),
    ],
  },

  // ---- vox-chop -----------------------------------------------------------
  {
    /**
     * Both Speech recipes use the manual's **own worked examples**, which is unusual here and
     * worth flagging: p.43 prints two exact three-knob settings and names the word each produces.
     * The knob values are therefore cited on the *point* as well as the range — the one place in
     * this manifest where a value is not taste.
     */
    id: 'mf-vox-chop-clean',
    role: 'vox-chop',
    character: 'clean',
    voice: 'voice',
    patchPolyphony: 1,
    verified: false,
    title: 'Speech model saying "Filter", the manual’s own three settings',
    articulation: modTrackLift('accent'),
    params: [
      paraphonic(false),
      pick('Osc Type', 'Speech', OSC_NAMES, cite(36), {
        note: 'p.43: the Wave knob picks a category, the Shape knob a word inside it, the Timbre knob shifts the formants',
        hint: 'osc-model',
      }),
      num('Wave', 100, { min: 0, max: 100 }, cite(113), {
        verified: cite(43),
        note: 'p.43’s worked example: "Set the wave knob to maximum". Displays as "Type" under Speech. p.113 maps the category bands onto this scale',
      }),
      num('Timbre', 40, { min: 0, max: 100 }, cite(113), {
        verified: cite(43),
        note: 'p.43’s worked example: "Set the timbre knob to 40". Displays as "Timbre" under Speech, shifting the formants up or down',
      }),
      num('Shape', 30, { min: 0, max: 100 }, cite(113), {
        verified: cite(43),
        note: 'p.43’s worked example: "Set the shape knob at 30", which the page says yields the word "Filter". Displays as "Word"',
      }),
      ...filter('BPF', 58, 30),
      ...envelope(0, 460, 22, 30, 'On'),
      ...cyclingEnv('Env', 0, 220, 0, 28),
      ...lfoFree('Sine', 3),
      ...glideTime(0),
    ],
  },
  {
    id: 'mf-vox-chop-dirty',
    role: 'vox-chop',
    character: 'dirty',
    voice: 'voice',
    patchPolyphony: 1,
    verified: false,
    title: 'Speech model saying "One", pressure dragging the formants',
    articulation: modTrackLift('accent'),
    params: [
      paraphonic(false),
      pick('Osc Type', 'Speech', OSC_NAMES, cite(36), {
        note: 'p.43: the Wave knob picks a category — 54,6 upward is the numbers library per p.113',
        hint: 'osc-model',
      }),
      num('Wave', 60, { min: 0, max: 100 }, cite(113), {
        verified: cite(43),
        note: 'p.43’s worked example: "Set the wave knob to 60". p.113 puts 54,6 upward in the numbers library, which is where 60 lands',
      }),
      num('Timbre', 46, { min: 0, max: 100 }, cite(113), {
        verified: cite(43),
        note: 'p.43’s worked example: "Set the timbre knob to 46"',
      }),
      num('Shape', 17, { min: 0, max: 100 }, cite(113), {
        verified: cite(43),
        note: 'p.43’s worked example: "Set the shape knob at 17", which the page says yields "One"',
      }),
      ...filter('HPF', 30, 56),
      ...envelope(0, 300, 8, 48, 'On'),
      ...cyclingEnv('Env', 0, 180, 0, 40),
      ...lfoFree('Random stepped', 8),
      matrix('PRESSURE', 'Timbre', 56, [{ axis: 'grit', amount: 18 }]),
      ...glideTime(0),
    ],
  },
]

// ---------------------------------------------------------------------------
// §2.3 Manifest
// ---------------------------------------------------------------------------

/**
 * The nine roles one four-note paraphonic voice with an eighteen-model oscillator can honestly
 * claim.
 *
 * `pad`, `stab` and `arp` are what the paraphony is for: four notes, one patch, a real chord.
 * `lead`, `bass-mid` and `sub` are the monophonic uses of the same voice. The last three are the
 * models nothing else in the library has — `noise` from §6.3.13, whose morph runs *"from particle
 * noise to white noise to metallic noise"* (p.45); `texture` from the Modal and Formant models,
 * which p.44 says *"can imitate many instrument bodies, from woodwinds to strings to drums"*; and
 * `vox-chop` from the Speech model, whose vocabulary Appendix A prints outright.
 *
 * **`acid` is the near miss, and it is left out on the manual's own evidence.** p.48: *"the
 * MicroFreak filter has a 12dB roll-off. This means that it is somewhat less obtrusive than its
 * 24dB cousin, which has a much steeper slope."* The squelch that defines the role is the steep
 * one, and a box whose manual volunteers that its filter is the gentler kind should not be
 * claiming it.
 *
 * The percussion roles are out for the minilogue xd's reason: one filter and one ADS envelope, so
 * a `kick` or a `snare` wanting a noise transient over an independently pitched body would be
 * claiming two voices out of one. `riser` and `sweep` are a genuine fit — `Cyc Mode  Run` into the
 * cutoff is a riser machine — and are left for a second pass rather than claimed without recipes.
 */
const VOICE_ROLES = [
  'pad',
  'stab',
  'lead',
  'bass-mid',
  'sub',
  'arp',
  'texture',
  'noise',
  'vox-chop',
] as const satisfies readonly Role[]

export const device: Device = {
  id: 'arturia-microfreak',
  name: 'MicroFreak',
  maker: 'Arturia',

  /** See the header: the Matrix is internal and the only voltages on the back are outputs. */
  kind: 'synth',

  /**
   * Both directions, three transports. p.89's Utility table gives the receive half —
   * `Source [Int, USB, MIDI, Clock, Auto]` — and p.77 the send half, in one sentence covering
   * both wires: *"In 'Play' mode the MicroFreak will send MIDI clocks and analog clock signals
   * that you can use to sync an external sequencer."*
   *
   * `preferredSource` is not claimed (§7.4); the evidence entry below says why.
   */
  clock: {
    canSendClock: true,
    canReceiveClock: true,
    transport: ['midi-din', 'usb', 'analog-clock'],
    /**
     * §7.4/#104. **What a reader has to set for clock to actually leave, per wire.**
     *
     * The two MIDI transports share one setting and it is a routing rather than a switch, which
     * the notes say rather than implying an on/off the box does not have. The analog pair has no
     * enable at all — p.77 has the pulses leaving whenever the box plays — so its entry carries
     * the rate, which is the thing a reader must match at the other end.
     */
    sourceSetup: [
      {
        transport: 'midi-din',
        path: 'Utility > MIDI > Output dest',
        value: 'MIDI',
        note: 'None, USB, MIDI, BOTH — clock leaves by the routing set here. BOTH sends over the mini-jack and USB at once. p.77: it starts sending in Play',
      },
      {
        transport: 'usb',
        path: 'Utility > MIDI > Output dest',
        value: 'USB',
        note: 'None, USB, MIDI, BOTH — the same one setting as the mini-jack, so a rig taking clock over USB and a rig taking it over MIDI cannot both be served except by BOTH',
      },
      {
        transport: 'analog-clock',
        path: 'Utility > Sync > Clock',
        value: '24PPQ',
        note: 'One step, 2PPQ, 24PPQ, 48PPQ. There is no enable for CLOCK · Out — p.77 has it pulsing whenever the box plays — so this rate is the setting that has to match the far end. A TRS cable carries start as well (p.20)',
      },
    ],
  },

  /**
   * One mono output, twice stated. p.19: *"The Line output is a 6.35 mm (1/4-inch) TRS jack. Its
   * output is monaural"*, and the headphone jack *"is monaural. Connecting stereo headphones will
   * merely provide the identical sound on the left and right sides"*.
   *
   * **`audioIn` is true, and it is narrower than the field's name suggests.** p.19: *"The
   * headphone output will also accept the custom microphone that comes with the MicroFreak
   * Vocoder Edition. You can also use it as an audio input on a standard MicroFreak by using a
   * device with a TRRS plug"*, with the CTIA pinout on p.119. So the input exists, it is the
   * headphone socket doing double duty, it needs a TRRS plug, and what it feeds is the vocoder's
   * analysis path (ch.19) rather than the analog filter. Nothing in a rig should be routed into
   * it expecting the filter.
   *
   * `usbAudio` is false; see the evidence entry, which records that the reading is a silence
   * rather than a denial.
   */
  io: { main: 'mono', individualOuts: 0, audioIn: true, usbAudio: false },

  /** 311 mm across, from Arturia's published size. The header says why the manual cannot supply it. */
  physical: { panelSpanMm: 311, verified: MAKER_SIZE },

  /** Drawn from pp.9/13/15 — `panel.ts` records which half is measured and which is inferred. */
  panel: MICROFREAK_PANEL,

  jacks: [...JACKS],

  manual: { title: 'MicroFreak User Manual', edition: '4.0.3 EN, product version 4.0.1' },

  productPage: 'https://www.arturia.com/products/hardware-synths/microfreak/overview',

  capabilityEvidence: {
    ...JACK_EVIDENCE,
    [clockSourceSetupFact('midi-din')]: cite(89),
    [clockSourceSetupFact('usb')]: cite(89),
    [clockSourceSetupFact('analog-clock')]: cite(89),
    voices: cite(10),
    'io.main': cite(19),
    'io.audioIn': cite(19),
    'io.individualOuts': cite(19),
    'clock.canSendClock': cite(77),
    'clock.canReceiveClock': cite(89),
    'clock.transport': cite(89),
    'features.lfo': cite(52),
    'features.perStep': cite(82),
    noteDuration: cite(77),

    /**
     * §2.6/#120. Read and not answered. The USB port is described only ever as a MIDI path —
     * p.3's *"USB MIDI Class Compliant device"*, p.92's *"The USB port is the MicroFreak's
     * built-in MIDI interface"* — and p.7's connector table lists it as *"Standard USB type B"*
     * with no signal named at all. None of those is the document saying audio does not travel
     * over it, which is what `cited-against` would claim, so this is `unknown` and the reading is
     * finished rather than blocked. Pages read: 3, 7, 19, 20, 21, 89, 91, 92, 104.
     */
    'io.usbAudio': {
      kind: 'unknown',
      reason:
        'no page states whether USB carries audio. p.3 and p.92 describe the port as the box’s MIDI interface and p.7’s connector table names only the connector, which is silence about audio rather than a denial of it',
    },

    /**
     * §7.4/#80. Capabilities on both sides and no sentence choosing between them: p.89 lists
     * `Source [Int, USB, MIDI, Clock, Auto]` and p.77 has the box sending MIDI and analog clock
     * whenever it plays. Read-and-silent, not answers-no.
     */
    'clock.preferredSource': {
      kind: 'unknown',
      reason:
        'p.77 gives the send half and p.89 the receive half, both as capabilities. Nothing in the manual argues this box should lead a rig or follow one, and `Auto` on p.89 is the manual declining to choose as well',
    },

    /**
     * The sidechain pair, and both are the same negative from the same place. The box's own
     * summary of what it contains — p.1's oscillator, filter, envelopes, LFO and matrix, and
     * p.30's five modulation sources — has no compressor, ducker or envelope follower on it, and
     * the matrix source list is closed at five.
     */
    'features.sidechain.internal': {
      kind: 'cited-against',
      cite: cite(30),
      reason:
        'the Matrix source list is exhaustive and is CycEnv, ENV, LFO, PRESSURE and KEY / ARP — no envelope follower, and nothing anywhere in the signal path that derives a control signal from level',
    },
    'features.sidechain.fromExternalAudio': {
      kind: 'cited-against',
      cite: cite(30),
      reason:
        'the same closed source list. The one audio input this box has feeds the vocoder’s analysis bank (p.117) and appears nowhere in the Matrix, so no external signal can duck anything here',
    },
  },

  /**
   * §8/#65. The box sequences itself: two paraphonic patterns of 4–64 steps (p.76), an
   * arpeggiator (p.70) and a 25-key keyboard (p.18). A step grid is the right instruction, so
   * `patternEntry` is absent.
   */

  /**
   * §8/#65. p.77's Tie/Rest icon is the whole mechanism: *"Use during step recording to extend
   * gate time of a note or enter a silent step"*, and p.79 confirms the rest is a preset-wide
   * default rather than a per-step value — *"Gate length is saved in the sequence. You set a
   * Global gate length for each preset in Utility."*
   */
  noteDuration: { kind: 'tied-steps', control: 'Tie/Rest' },

  features: {
    /**
     * p.82 is the page: a sequence *"record notes (the pitch of a note) and velocities … ;
     * modulation tracks record knob positions"*, four tracks of them, *"up to 64 values for each
     * knob"*, and a fifth knob is refused with *"Memory full"*. `rest` and `tie` are p.77's one
     * icon, which does both.
     */
    perStep: ['pitch', 'velocity', 'rest', 'tie', 'modulation'],
    sidechain: { internal: false, fromExternalAudio: false },
    /**
     * One LFO, syncable by pressing its Rate encoder (p.53). The destinations are the Matrix's
     * seven columns (p.30–31), of which four are fixed and three are whatever knob the reader
     * assigns — so the list names the fixed four and the assignable slots as the manual does.
     */
    lfo: {
      count: 1,
      syncable: true,
      destinations: ['Pitch', 'Wave', 'Timbre', 'Cutoff', 'Assign 1', 'Assign 2', 'Assign 3'],
    },
  },

  /**
   * **One voice, four notes.** p.10: *"The MicroFreak is a paraphonic four-voice synthesizer …
   * they all share the same analog filter."* The header is the long form of why this is one
   * assignable and not a pool of four.
   */
  voices: [{ kind: 'fixed', id: 'voice', label: 'Voice', roles: [...VOICE_ROLES], polyphony: 4 }],

  /**
   * One assignable exists, so one is the most that can ever be occupied (§12.4). Written out
   * rather than left to default — which would also give 1 — so the claim is visible.
   */
  comfortableVoices: 1,

  hints: {
    'paraphonic-on': 'Press Paraphonic; it blinks slowly',
    'paraphonic-off': 'Paraphonic unlit — one note at a time',
    unison: 'Shift + Paraphonic, then the Preset encoder',
    'osc-model': 'Type knob, watch the display',
    'filter-type': 'Type button cycles LPF, BPF, HPF',
    'matrix-amount': 'Turn to the point, press, then set',
    'mod-track': 'Step record, then turn the Cutoff knob',
    'lfo-sync': 'Press the LFO Rate encoder',
    'glide-mode': 'Utility > Preset > Glide mode',
  },

  recipes,
}
