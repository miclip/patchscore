import type {
  CapabilityEvidence,
  Device,
  JackSignalKind,
  JackSpec,
  PatchEntry,
  Recipe,
} from '../../core/device'
import { jackFact } from '../../core/device'
import type { AuthoredEnumParam, AuthoredNumericParam, AuthoredParam, Cite } from '../../core/params'
import type { Role } from '../../core/vocabulary'
import { MATRIARCH_PANEL } from './panel'

/**
 * Moog Matriarch (§2.3) — **four oscillators, two ladder filters, two envelopes, a stereo analog
 * delay and a 49-note keyboard**, played as one monophonic voice or as two or four paraphonic
 * ones, with **90 patch points: 49 inputs, 33 outputs and two 4-jack mults** (printed p.90).
 *
 * **Source**: `manuals/Matriarch_Manual_012023.pdf`, 92 PDF pages. **The printed page number is
 * the PDF page number**, checked against the footer on pp.10, 20, 40, 60, 80, 88 and 92 rather
 * than assumed — the same as the Grandmother and the DFAM, unlike the Mother-32.
 *
 * ---------------------------------------------------------------------------------------------
 * ## Paraphony: the first device here whose polyphony is a switch position
 *
 * p.90 opens `POLYPHONY: One-Note Monophonic, Two-Note Paraphonic, Four-Note Paraphonic`, and
 * p.50 says what that means: paraphony allows "the pitch of each oscillator to be played
 * independently, but with all oscillators then sharing a common signal path **from the Mixer
 * section and beyond** (VCF, VCA, etc.), just as on a monophonic synthesizer."
 *
 * So this box has **four notes of pitch independence and one of everything else**. That is
 * modelled as **one assignable with `polyphony: 4`**, and the alternative — a pool of four with
 * `polyphony: 1` — would be wrong in the way that matters: four pool members are four
 * *independent parts*, and these four oscillators cannot carry four different roles because they
 * share one filter, one amplifier and one pair of envelopes. One assignable that can sound four
 * notes is the honest reading, and it is what lets a four-note `pad` request be filled outright
 * where the Grandmother and the Mother-32 can only report a shortfall (§12.4/#40).
 *
 * **`polyphony: 4` is only true in one of the three switch positions, and that is the problem
 * this manifest has to solve.** p.51: VOICE MODE `1` plays "all four oscillators … from a single
 * key"; `2` gives the first key Oscillators 1 and 2 and the second key Oscillators 3 and 4; `4`
 * means "each key will play only one oscillator". The device-level field cannot say "4 notes, but
 * only when the switch is at 4" — so **every recipe below carries `VOICE MODE`**, and a test
 * asserts the rule the field cannot: any recipe for a role that a shipped template ever requests
 * with more than one note must sit in a mode that delivers at least that many notes. Today that
 * is `pad` (3 and 4 notes) and `stab` (3); the test reads the templates rather than hard-coding
 * them, so a future template asking for a three-note lead fails loudly instead of quietly
 * printing a chord next to `VOICE MODE 1`.
 *
 * **Only modes 1 and 4 are authored, and mode 2 is left alone deliberately.** In mode 4 each
 * oscillator is a different note of the chord, so its FREQUENCY knob — a detune against
 * Oscillator 1 (p.14) — has to sit at zero or the chord is out of tune; the recipes do that and
 * the same test checks it. Mode 2 is the one where the manual does not say what happens: it pairs
 * 1+2 against 3+4, and nothing on p.51 or p.14 states whether Oscillator 3's FREQUENCY then
 * detunes it from Oscillator 1 (making the second note sharp) or from its own key. Guessing would
 * be inventing an assignment, so there is no mode-2 recipe and this paragraph is the reason.
 *
 * **A sequencer step holds as many notes as the mode does**, which is the other half of the same
 * claim: p.46, "The number of notes that can be entered simultaneously per-step is determined by
 * the VOICE MODE switch."
 *
 * ## `FREQUENCY` is the Grandmother's trap three times over, gated by two switches
 *
 * p.14 gives Oscillators 2, 3 and 4 a FREQUENCY knob that "detunes each oscillator from the pitch
 * of Oscillator 1 over a range of +/- 7 semitones (or a musical 5th)", and then withdraws it
 * twice, exactly as the Grandmother's does:
 *
 *  - Each of pp.14-15 says of its own oscillator that "the range of the FREQUENCY knob is also
 *    greatly increased while the oscillator is sync'd", with no figure for the increase. And sync
 *    here needs **two** switches: the main `SYNC ENABLE` button plus that oscillator's own sync
 *    button, and p.15 is explicit — "the main red SYNC button must be On (lit) for the individual
 *    Oscillator Sync functions to work."
 *  - "NOTE: The range of the FREQUENCY knobs can be specified in the Global Settings."
 *
 * **And here the Global Settings chapter actually prints it**, which the Grandmother's does not.
 * Setting 0.6, p.64: "The range of the Oscillator 2, 3, and 4 FREQUENCY knobs can be limited or
 * expanded to a specific number of semitones, from zero to 24. … **The Default is 7 semitones (a
 * musical Perfect Fifth).**" So on this box the ±7 is a *documented default* rather than a figure
 * the manual promises to explain and never does. That is worth recording in both directions: it
 * is why the range below is authored with more confidence than the Grandmother's, and it is
 * evidence that the Grandmother's dangling NOTE refers to a real setting rather than to a
 * documentation slip. It does **not** license copying this number into that manifest.
 *
 * The fix is CLAUDE.md's, and `osc()` below is where it lives: the octave, the waveform, the
 * individual sync state and FREQUENCY are emitted by one helper that will not let them separate,
 * and FREQUENCY's *kind* switches on the pair of sync conditions — a cited ±7 semitones when the
 * oscillator is not sync'd, and percent of travel when it is, because "greatly increased" is not
 * a number.
 *
 * ## What needs a cable on this box, and what the panel already reaches
 *
 * The modulation section reaches pitch, cutoff and pulse width from the panel, with a `PITCH MOD
 * ASSIGN` switch choosing `1 & 3`, `ALL` or `2 & 4` (p.36) — which is the switch p.51's TIP
 * recommends for paraphonic work, since it can deepen the sync effect on 2 and 4 without moving
 * the pitch of 1 and 3. As on the Grandmother the AMT knobs do nothing on their own: the MOD
 * slider gates them, so every recipe that sets one carries `MOD`.
 *
 * What needs a cable is the envelope onto anything but the filter, the sample-and-hold (which has
 * no internal routing at all), and the second filter's cutoff independently of the first. The
 * cables below say which and why.
 *
 * ## Jack ids are qualified by **module**, and the manual numbers the two it repeats
 *
 * §3.3 requires section-qualified ids, and this panel needs it more than any box in the library:
 * `PITCH IN`, `WAVE OUT`, `PWM IN` and `LIN FM IN` appear four times each, `INPUT`/`OUTPUT`/`CV
 * IN` three times, `MULT` twice as a set of four, `SYNC IN` twice, and there are **two modules
 * both silkscreened `UTILITIES`**. The manual's own table of contents settles that last one by
 * printing `UTILITIES (1)` at p.40 and `UTILITIES (2)` at p.42, so the ids follow it.
 *
 * **This box forms two output bundles and no input bundle**, and all three facts are load-bearing:
 *
 *  - `ARP/SEQ · CV OUT` pairs with `ARP/SEQ · GATE OUT`, and `KEYBOARD · KB CV OUT` pairs with
 *    `KEYBOARD · KB GATE OUT`. **Two independent pitch-and-gate pairs**, which is what p.9 means
 *    by "a powerful keyboard front-end for expanding a DFAM, Mother-32, Grandmother, or Eurorack
 *    modular system" — the sequenced line out of one and what you play out of the other. Only the
 *    Metropolix offers two as well, and it does it with two tracks rather than a keyboard and a
 *    sequencer.
 *  - There is **no pitch-and-gate pair to play into**, for the Grandmother's reason and more
 *    strongly: the pitch inputs are `OSCILLATORS · 1-4 PITCH IN`, one per oscillator, each summed
 *    with the keyboard note (p.16), so a single pitch cable moves *one* of four oscillators. p.16's
 *    own TIP turns that into a technique — "By connecting a modulation source to the Oscillator 1
 *    PITCH IN jack, and a 'dead patch' to the Oscillator 2 PITCH IN jack, only Oscillator 1 will
 *    receive the modulation signal" — which is a fact about normalling, and the opposite of a note
 *    input. A two-cable bundle into this box would be wrong on the hardware.
 *
 * **The eight MULT points are declared `out`**, as on the Grandmother, and the cost is the same
 * and is again not hidden: p.40 says they work either way, `JackSpec.direction` has one value, and
 * so no recipe below patches *into* a mult. Unlike the Grandmother there is no p.7-style bucketing
 * to break the tie — p.90 lists them as a third category, `8 (4x2) Parallel-Wired Unbuffered
 * Mults`, and refuses to classify them. `out` is carried over for consistency with the sibling
 * box rather than because this document chose it, and that is the honest description of the
 * decision.
 *
 * **`STEREO DELAY · SYNC IN` carries clock and claims no transport**, which is deliberate. p.56:
 * with the SYNC button lit "the Stereo Delay Time will sync to the rising edges of a clock or
 * control signal received here" — so it genuinely takes a clock, but it clocks the *delay*, not
 * the sequencer. `ARP/SEQ CV · CLOCK IN` is the rig's clock input, and two jacks claiming
 * `analog-clock` in one direction would leave the rack choosing between them (§10/#103).
 *
 * ## Numbers: what this manual prints
 *
 *  - `CUTOFF` — **the panel's silkscreen and nothing else.** p.21 draws `20Hz`, `200Hz`, `2kHz`
 *    and `20kHz` around the knob and the prose gives no figure anywhere, which is the *opposite*
 *    provenance to the Grandmother, whose prose says 10 Hz to 20 kHz while its silkscreen starts
 *    at 20. Here there is one printed scale, so that is the range.
 *  - `MODULATION RATE` — p.36: "can be set from .07 Hz to 1.3 kHz using the RATE knob."
 *  - `LFO RATE` — p.43: ".07 Hz to 520 Hz using the RATE knob", and the same page adds that a CV
 *    at `RATE IN` lets it "exceed the maximum 520 Hz available via the LFO RATE knob, and reach
 *    frequencies of up to approximately 620 Hz". 520 is the knob's travel and stays correct when
 *    something is patched; the 620 is recorded because it is the figure that looks like the
 *    parameter's maximum and is not — the Mother-32's `LFO RATE` note, on a second box.
 *  - `OSCILLATOR 2/3/4 FREQUENCY` — ±7 semitones, p.14, defaulted by Global Setting 0.6 (p.64).
 *    See above; this is the conditional one.
 *
 * `ARP / SEQ RATE / DIV`'s 20-280 BPM (p.45) is **authored nowhere**, on the Mother-32's and the
 * Grandmother's reasoning: the template owns tempo, and the same page says that once synced the
 * knob "selects timing values that are clock divisions of the external tempo" — a different
 * parameter wearing the same knob. `FINE TUNE`'s ±1 semitone (p.54) is a rear-panel global tuning
 * trim, not a per-recipe value, and is authored nowhere for the same reason.
 *
 * Everything else is a knob with a tick ring and no numbers — the five mixer levels, both
 * RESONANCEs, both SPACINGs, `ENVELOPE AMT`, `KB TRACKING`, all eight envelope stages, `MAIN
 * VOLUME`, the four delay knobs, the three modulation AMT knobs, the three attenuators and
 * `GLIDE` — so those are `travel()`, provisional on both claims and deaf to mood.
 *
 * ## Per-step: rest, tie and **ratchet**, and no accent
 *
 * p.46 names three lanes and gives each a coloured button: "Notes, Rests, Ties, and Ratchets can
 * be entered into the current sequence", with `REST`, `TIE` and `RATCHET` on the panel. **There is
 * no accent lane**, which is the clean difference from the Grandmother — that box has
 * `rest`/`tie`/`accent` and no ratchet, this one has `rest`/`tie`/`ratchet` and no accent. So the
 * Grandmother's rule that an accent needs a cable to be audible has no analogue here, and nothing
 * in this file inherits it.
 */

// ---------------------------------------------------------------------------
// Citations
// ---------------------------------------------------------------------------

/** The manual, by printed page — which is the PDF page on this document. */
function cite(page: number): Cite {
  return { kind: 'manual', source: `Moog Matriarch Manual (012023), p.${page}` }
}

/** §2.6/#22. Jack citations are recorded here and merged into `capabilityEvidence` below. */
const JACK_EVIDENCE: Record<string, CapabilityEvidence> = {}

/**
 * A declared patch point (§3.3). The page is the module's own PATCH POINTS section — this manual
 * documents them per module (pp.16, 19, 23, 27, 30, 34, 38, 40, 42, 48) rather than in one index
 * the way the Grandmother's does, and each entry gives the jack's voltage range.
 */
function jack<Id extends string>(
  id: Id,
  direction: JackSpec['direction'],
  signal: JackSignalKind[],
  page: number,
  extra: { note?: string; clock?: string[] } = {},
): JackSpec & { id: Id } {
  JACK_EVIDENCE[jackFact(id)] = cite(page)
  return {
    id,
    direction,
    signal,
    ...(extra.clock === undefined ? {} : { clock: extra.clock }),
    ...(extra.note === undefined ? {} : { note: extra.note }),
  }
}

/** One oscillator's four patch points, which are identical in every respect but the number. */
function oscJacks(n: 1 | 2 | 3 | 4) {
  return [
    jack(`OSCILLATORS · ${n} PITCH IN` as const, 'in', ['pitch-cv'], 16, {
      note: '-5 to +5 V on the 1 V/oct standard, summed with the keyboard note — moves this oscillator alone',
    }),
    jack(`OSCILLATORS · ${n} WAVE OUT` as const, 'out', ['audio'], 16, {
      note: 'This oscillator at its OCTAVE and WAVEFORM settings',
    }),
    jack(`OSCILLATORS · ${n} PWM IN` as const, 'in', ['cv'], 16, {
      note: 'Only reaches the oscillator when SQUARE or NARROW PULSE is selected',
    }),
    jack(`OSCILLATORS · ${n} LIN FM IN` as const, 'in', ['cv'], 16, {
      note: 'Linear FM — takes audio as readily as control voltage',
    }),
  ]
}

/** One bipolar voltage-controlled attenuator's three points. Three of these on the panel. */
function attenJacks(section: 'UTILITIES 1' | 'UTILITIES 2', label: string, page: number) {
  return [
    jack(`${section} · ${label} INPUT` as const, 'in', ['cv'], page, {
      note: 'An 8 V DC source is normalled here, so with nothing patched the OUTPUT is a bipolar DC source',
    }),
    jack(`${section} · ${label} OUTPUT` as const, 'out', ['cv'], page, {
      note: 'Centre is zero output; either way from there passes the signal, inverted below centre',
    }),
    jack(`${section} · ${label} CV IN` as const, 'in', ['cv'], page, {
      note: 'Voltage control over the attenuation — what makes this a VCA rather than a knob',
    }),
  ]
}

/** One 4-point parallel mult. Two of these on the panel; see the header on `direction`. */
function multJacks(section: 'UTILITIES 1' | 'UTILITIES 2', page: number) {
  return ([1, 2, 3, 4] as const).map((i) =>
    jack(`${section} · MULT ${i}` as const, 'out', ['audio', 'cv'], page, {
      note: 'Four points wired in parallel and unbuffered — one in, up to three out',
    }),
  )
}

/**
 * §3.3. All ninety patch points, plus the six quarter-inch jacks and the three MIDI DINs.
 *
 * The whole set is declared rather than the subset the recipes reach for, and the count is the
 * check: p.90 states `90 x 3.5mm`, `49 Inputs, 33 Outputs`, `8 (4x2) Parallel-Wired Unbuffered
 * Mults`. The list below comes to 49, 33 and 8 exactly, which is ninety directions verified
 * against the specifications rather than against my own reading of each page.
 */
const JACKS = [
  // -- ARP / SEQ, front (p.48) -------------------------------------------------------
  jack('ARP/SEQ · RATE / DIV IN', 'in', ['cv'], 48, {
    note: 'Sets the arpeggiator or sequencer rate, or its clock division once the box is synced',
  }),
  jack('ARP/SEQ · CV OUT', 'out', ['pitch-cv'], 48, {
    note: 'The note the arpeggiator or sequencer is playing; range on Global Setting 3.4 (p.66)',
  }),
  jack('ARP/SEQ · VEL OUT', 'out', ['cv'], 48, {
    note: 'Velocity of the arpeggiated or sequenced note; range on Global Setting 3.6 (p.66)',
  }),
  jack('ARP/SEQ · GATE OUT', 'out', ['gate'], 48, {
    note: 'A gate per step; range on Global Setting 3.10 (p.66)',
  }),

  // -- MODULATION (p.38) -------------------------------------------------------------
  jack('MODULATION · RATE IN', 'in', ['cv'], 38, {
    note: '-5 to +5 V on the 1 V/oct standard, so the modulation oscillator can be played',
  }),
  jack('MODULATION · NOISE OUT', 'out', ['audio'], 38, {
    note: 'White noise, from the same generator the mixer’s NOISE channel carries',
  }),
  jack('MODULATION · SYNC IN', 'in', ['trigger'], 38, {
    note: 'A rising signal over 2.5 V resets the modulation oscillator to the start of its cycle',
  }),
  jack('MODULATION · S / H OUT', 'out', ['cv'], 38, {
    note: 'Sample and hold off the noise source; nothing routes it internally, so it needs a cable',
  }),
  jack('MODULATION · WAVE OUT', 'out', ['cv'], 38, {
    note: 'The selected waveform at the current rate',
  }),

  // -- UTILITIES (1) (pp.40-41) ------------------------------------------------------
  ...multJacks('UTILITIES 1', 40),
  ...attenJacks('UTILITIES 1', 'ATTENUATOR 1', 40),
  ...attenJacks('UTILITIES 1', 'ATTENUATOR 2', 40),

  // -- OSCILLATORS (p.16) ------------------------------------------------------------
  ...oscJacks(1),
  ...oscJacks(2),
  ...oscJacks(3),
  ...oscJacks(4),

  // -- MIXER (p.19) ------------------------------------------------------------------
  jack('MIXER · OSC 1 IN', 'in', ['audio', 'cv'], 19, {
    note: 'Replaces Oscillator 1 at the mixer; the OSCILLATOR 1 knob then sets this level',
  }),
  jack('MIXER · OSC 2 IN', 'in', ['audio', 'cv'], 19, {
    note: 'Replaces Oscillator 2 at the mixer; the OSCILLATOR 2 knob then sets this level',
  }),
  jack('MIXER · OSC 3 IN', 'in', ['audio', 'cv'], 19, {
    note: 'Replaces Oscillator 3 at the mixer; the OSCILLATOR 3 knob then sets this level',
  }),
  jack('MIXER · OSC 4 IN', 'in', ['audio', 'cv'], 19, {
    note: 'Replaces Oscillator 4 at the mixer; the OSCILLATOR 4 knob then sets this level',
  }),
  jack('MIXER · NOISE IN', 'in', ['audio', 'cv'], 19, {
    note: 'Replaces the noise generator at the mixer; the NOISE knob then sets this level',
  }),
  jack('MIXER · OUTPUT', 'out', ['audio'], 19, {
    note: 'All five channels summed, before the filters. DC coupled, so it sums control voltages too',
  }),

  // -- FILTERS (p.23) ----------------------------------------------------------------
  jack('FILTERS · VCF 1 IN', 'in', ['audio'], 23, {
    note: 'Replaces the normalled mixer feed into ladder filter 1',
  }),
  jack('FILTERS · VCF 2 IN', 'in', ['audio'], 23, {
    note: 'Replaces the normalled feed into ladder filter 2',
  }),
  jack('FILTERS · VCF 1 OUT', 'out', ['audio'], 23, { note: 'Ladder filter 1, -24 dB/oct' }),
  jack('FILTERS · VCF 2 OUT', 'out', ['audio'], 23, { note: 'Ladder filter 2, -24 dB/oct' }),
  jack('FILTERS · CUTOFF 1 IN', 'in', ['cv'], 23, { note: 'Summed into filter 1 only' }),
  jack('FILTERS · CUTOFF 2 IN', 'in', ['cv'], 23, { note: 'Summed into filter 2 only' }),
  jack('FILTERS · ENV AMT IN', 'in', ['cv'], 23, { note: 'Summed with the ENVELOPE AMT knob' }),

  // -- UTILITIES (2) (pp.42-43) ------------------------------------------------------
  ...multJacks('UTILITIES 2', 42),
  ...attenJacks('UTILITIES 2', 'ATTENUATOR', 42),
  jack('UTILITIES 2 · LFO RATE IN', 'in', ['cv'], 42, {
    note: 'A CV here takes the LFO past the knob’s 520 Hz to about 620 Hz (p.43)',
  }),
  jack('UTILITIES 2 · LFO TRI OUT', 'out', ['cv'], 42, { note: 'The LFO’s triangle, at the current rate' }),
  jack('UTILITIES 2 · LFO SQUARE OUT', 'out', ['cv'], 42, {
    note: 'The LFO’s square; its polarity is Global Setting 0.7 (p.64)',
  }),

  // -- ENVELOPE GENERATORS (p.27) ----------------------------------------------------
  jack('ENVELOPE GENERATORS · FILTER TRIGGER IN', 'in', ['gate', 'trigger'], 27, {
    note: 'A gate or CV over 2.3 V retriggers the filter envelope, replacing the normalled keyboard gate',
  }),
  jack('ENVELOPE GENERATORS · FILTER ENV OUT', 'out', ['cv'], 27, {
    note: 'The filter envelope’s shape — the only way it reaches anything but the filters',
  }),
  jack('ENVELOPE GENERATORS · FILTER ENV END OUT', 'out', ['trigger'], 27, {
    note: 'A pulse when the filter envelope finishes its release',
  }),
  jack('ENVELOPE GENERATORS · AMPLITUDE TRIGGER IN', 'in', ['gate', 'trigger'], 28, {
    note: 'A gate or CV over 2.3 V retriggers the amplitude envelope',
  }),
  jack('ENVELOPE GENERATORS · AMPLITUDE ENV OUT', 'out', ['cv'], 28, {
    note: 'The amplitude envelope’s shape, available as a modulation source',
  }),
  jack('ENVELOPE GENERATORS · AMPLITUDE ENV END OUT', 'out', ['trigger'], 28, {
    note: 'A pulse when the amplitude envelope finishes its release',
  }),

  // -- STEREO DELAY, front (p.34) ----------------------------------------------------
  jack('STEREO DELAY · INPUT 1', 'in', ['audio'], 34, { note: 'Audio into delay 1 alone' }),
  jack('STEREO DELAY · INPUT 2', 'in', ['audio'], 34, { note: 'Audio into delay 2 alone' }),
  jack('STEREO DELAY · FB CV IN', 'in', ['cv'], 34, {
    note: 'Summed with the FEEDBACK knob; on its own it moves both delays, and the rear FB 2 CV IN splits them (p.56)',
  }),
  jack('STEREO DELAY · MIX IN', 'in', ['cv'], 34, { note: 'Voltage control over the wet/dry balance' }),
  jack('STEREO DELAY · TIME 1 IN', 'in', ['cv'], 34, { note: 'Bends delay 1’s time' }),
  jack('STEREO DELAY · TIME 2 IN', 'in', ['cv'], 34, { note: 'Bends delay 2’s time' }),

  // -- OUTPUT (p.30) -----------------------------------------------------------------
  jack('OUTPUT · VCA 1 IN', 'in', ['audio'], 30, { note: 'Audio into amplifier 1, replacing the filter feed' }),
  jack('OUTPUT · VCA 2 IN', 'in', ['audio'], 30, { note: 'Audio into amplifier 2, replacing the filter feed' }),
  jack('OUTPUT · VCA 1 CV IN', 'in', ['cv'], 30, { note: 'Voltage control over amplifier 1’s gain' }),
  jack('OUTPUT · VCA 2 CV IN', 'in', ['cv'], 30, { note: 'Voltage control over amplifier 2’s gain' }),

  // -- REAR: AUDIO (pp.54-55) --------------------------------------------------------
  jack('AUDIO · EURO OUT (L)', 'out', ['audio'], 54, {
    note: 'Eurorack level, and unaffected by MAIN VOLUME (p.90)',
  }),
  jack('AUDIO · EURO OUT (R)', 'out', ['audio'], 54, {
    note: 'Eurorack level, and unaffected by MAIN VOLUME (p.90)',
  }),
  jack('AUDIO · MAIN OUT (L / MONO)', 'out', ['audio'], 54, {
    note: '1/4" TRS impedance-balanced at +4 dBu; the left jack alone is the mono sum',
  }),
  jack('AUDIO · MAIN OUT (R)', 'out', ['audio'], 54, { note: '1/4" TRS impedance-balanced at +4 dBu' }),
  jack('AUDIO · INSTRUMENT IN', 'in', ['audio'], 54, {
    note: '1/4" TS — the external input p.9 calls out as this box’s other job',
  }),
  jack('AUDIO · HEADPHONES', 'out', ['audio'], 54, { note: '1/4" TRS with its own HEADPHONE LEVEL knob' }),

  // -- REAR: STEREO DELAY (p.56) -----------------------------------------------------
  jack('STEREO DELAY CV · DELAY OUT (L)', 'out', ['audio'], 56, {
    note: '100% wet, delay 1 alone, at Eurorack level',
  }),
  jack('STEREO DELAY CV · DELAY OUT (R)', 'out', ['audio'], 56, {
    note: '100% wet, delay 2 alone, at Eurorack level',
  }),
  jack('STEREO DELAY CV · SYNC IN', 'in', ['clock', 'trigger'], 56, {
    note: 'With SYNC lit the delay time follows the rising edges here — the delay’s clock, not the sequencer’s',
  }),
  jack('STEREO DELAY CV · DELAY FB 2 CV IN', 'in', ['cv'], 56, {
    note: 'Feedback for delay 2 alone, so the two delays can be modulated apart',
  }),

  // -- REAR: KEYBOARD (pp.57-58) -----------------------------------------------------
  jack('KEYBOARD · SUS PEDAL IN', 'in', ['gate'], 57, {
    note: '1/4" TS — a normally-open pedal shorts tip to ground and holds the envelopes at sustain',
  }),
  jack('KEYBOARD · EXP PEDAL IN', 'in', ['cv'], 57, {
    note: '1/4" TRS with +5 V on the ring, for an expression pedal such as the Moog EP-3',
  }),
  jack('KEYBOARD · EXP CV OUT', 'out', ['cv'], 57, {
    note: 'The expression pedal, buffered — 0 to +8 V, so it can drive anything',
  }),
  jack('KEYBOARD · KB VEL OUT', 'out', ['cv'], 57, {
    note: 'Key velocity, 0 to +5 V; Global Setting 3.5 switches it to 0 to +10 V (p.66)',
  }),
  jack('KEYBOARD · KB AT OUT', 'out', ['cv'], 57, {
    note: 'Aftertouch, 0 to +5 V; there is no hardwired route for it, so it needs a cable (p.90)',
  }),
  jack('KEYBOARD · MOD WHL OUT', 'out', ['cv'], 58, { note: 'The MOD slider’s position, 0 to +5 V' }),
  jack('KEYBOARD · KB CV OUT', 'out', ['pitch-cv'], 58, {
    note: 'The note played, -5 to +5 V; Global Setting 3.3 switches it to 0 to +10 V (p.66)',
  }),
  jack('KEYBOARD · KB GATE OUT', 'out', ['gate'], 58, {
    note: '+5 V while a key is held; Global Setting 3.9 switches it to +10 V (p.66)',
  }),

  // -- REAR: ARP / SEQ CV (pp.58-59) -------------------------------------------------
  jack('ARP/SEQ CV · CLOCK IN', 'in', ['clock', 'trigger'], 58, {
    clock: ['analog-clock'],
    note: 'CLOCK or STEP-ADVANCE per Global Setting 2.1; incoming PPQN on 3.1, four from the factory (p.66)',
  }),
  jack('ARP/SEQ CV · ON / OFF IN', 'in', ['gate'], 59, {
    note: 'Over 3.6 V starts the arpeggiator or sequencer, under 1 V stops it',
  }),
  jack('ARP/SEQ CV · RESET IN', 'in', ['trigger'], 59, {
    note: 'Over 2.5 V returns to the first step without stopping',
  }),
  jack('ARP/SEQ CV · CLOCK OUT', 'out', ['clock'], 59, {
    clock: ['analog-clock'],
    note: '0 to 10 V at the ARP / SEQ tempo and the Global CLOCK OUTPUT PPQN — but only while playing, from the factory',
  }),

  // -- REAR: MIDI (p.59) -------------------------------------------------------------
  /**
   * `['midi', 'clock']` on the two that carry tempo, and the second member is the schema's own
   * implication. `MIDI THRU` passes its input along and originates nothing, so it claims no
   * transport — and must not, since two jacks claiming `midi-din` in one direction would leave
   * the rack choosing.
   */
  jack('MIDI IN', 'in', ['midi', 'clock'], 59, {
    clock: ['midi-din'],
    note: 'MIDI Clock and Start/Stop are followed or ignored per Global Setting 1.5 (p.64)',
  }),
  jack('MIDI OUT', 'out', ['midi', 'clock'], 59, {
    clock: ['midi-din'],
    note: 'Everything originating here, MIDI Clock included — on by default per Global Setting 1.6 (p.64)',
  }),
  jack('MIDI THRU', 'out', ['midi'], 59, { note: 'The MIDI IN signal passed along unchanged' }),
]

/** Every declared jack id, as a union of literals, so `cable()` catches a typo at compile time. */
export type MatriarchJack = (typeof JACKS)[number]['id']

// ---------------------------------------------------------------------------
// Parameter helpers
// ---------------------------------------------------------------------------

/** A numeric whose **range** the manual prints. The point inside it is taste and says so. */
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
 * A knob position on a control with **no printed scale**, as percent of travel. Both claims are
 * unverified and both render as such; mood is not allowed to move it.
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

/** A cable: two declared jacks, what it does, and whether *the connection itself* is cited. */
function cable(
  from: MatriarchJack,
  to: MatriarchJack,
  note: string,
  instructedOn?: number,
): PatchEntry {
  return { from, to, note, verified: instructedOn === undefined ? false : cite(instructedOn) }
}

// ---------------------------------------------------------------------------
// Option sets, as the manual enumerates them
// ---------------------------------------------------------------------------

/** p.13 and the panel: every oscillator has the same four feet. */
const OSC_OCTAVE = ["16'", "8'", "4'", "2'"] as const

/** p.15: "The choices are Triangle, Sawtooth, Square, and Narrow Pulse." */
const OSC_WAVE = ['TRIANGLE', 'SAWTOOTH', 'SQUARE', 'NARROW PULSE'] as const

/** The main SYNC ENABLE button, and each oscillator's own. p.15 needs both for either to do anything. */
const SYNC = ['OFF', 'ON'] as const

/** p.90's MOD SOURCES row, in its order. Seven shapes on one knob. */
const MOD_WAVE = ['SINE', 'SAWTOOTH', 'RAMP', 'SQUARE', 'STAIRCASE', 'SMOOTH RANDOM', 'S / H'] as const

/** The panel's three positions. p.51's TIP is why this switch matters in paraphonic modes. */
const PITCH_MOD_ASSIGN = ['1 & 3', 'ALL', '2 & 4'] as const

/**
 * p.90, and the panel prints the same three pairs.
 *
 * **`SERIES` and `PARALLEL` really do carry the same filter types**, and it reads like a typo
 * twice: p.90's `VCF FILTERS` row gives "Series = (VCF 1 High Pass/VCF 2 Low Pass) … Parallel =
 * (VCF 1 High Pass/VCF 2 Low Pass)", and the panel silkscreens `SERIES HP / LP` and `PARALLEL
 * HP / LP` beside each other. Two independent printings of the same pair is not a typo: the two
 * modes differ in how the filters are *wired* — one after the other against side by side — not in
 * what each filter is. The option strings keep the panel's own words so the distinction survives.
 */
const FILTER_MODE = ['SERIES HP / LP', 'STEREO LP / LP', 'PARALLEL HP / LP'] as const

/** p.29's three amplifier modes, as the panel prints them. */
const VCA_MODE = ['AMP ENV', 'SPLIT', 'DRONE'] as const

/** p.51's three voice modes. This is the switch `polyphony: 4` depends on — see the header. */
const VOICE_MODE = ['1', '2', '4'] as const

/** p.45-46's ARP / SEQ switches. Twelve sequences are OCT / BANK times SEQUENCE (p.90). */
const ARP_MODE = ['ARP', 'SEQ', 'REC'] as const
const DIRECTION = ['ORD', 'FW / BW', 'RND'] as const
const OCT_BANK = ['1', '2', '3'] as const
const SEQUENCE = ['1', '2', '3', '4'] as const

// ---------------------------------------------------------------------------
// Ranges the manual prints
// ---------------------------------------------------------------------------

/** p.21's silkscreen — `20Hz`, `200Hz`, `2kHz`, `20kHz` — and the prose prints no figure at all. */
const CUTOFF_HZ = { min: 20, max: 20000 }

/** p.36: "can be set from .07 Hz to 1.3 kHz using the RATE knob." */
const MOD_HZ = { min: 0.07, max: 1300 }

/** p.43: ".07 Hz to 520 Hz using the RATE knob". A CV reaches ~620; see the header. */
const LFO_HZ = { min: 0.07, max: 520 }

/** p.14, defaulted to seven semitones by Global Setting 0.6 (p.64). Sync widens it — see `osc()`. */
const DETUNE_ST = { min: -7, max: 7 }

// ---------------------------------------------------------------------------
// Parameter blocks
// ---------------------------------------------------------------------------

/** The switch everything else in a recipe depends on. See the header. */
function voiceMode(mode: (typeof VOICE_MODE)[number]): AuthoredParam {
  return pick('VOICE MODE', mode, VOICE_MODE, cite(51), {
    hint: mode === '4' ? 'paraphonic-4' : 'mono-stack',
    note:
      mode === '4'
        ? 'Each key plays one oscillator, so the four detunes sit at zero and the chord is in tune'
        : 'All four oscillators play from one key, which is what makes the detunes a unison',
  })
}

/**
 * One oscillator, and **the helper that stops two values coming apart.**
 *
 * `SYNC` and `FREQUENCY` are emitted together, always, and the sync state decides which kind of
 * parameter `FREQUENCY` is: unsync'd it is a detune in semitones inside p.14's cited ±7, and
 * sync'd p.14 says only that the range "is greatly increased", so it becomes percent of travel.
 * A `FREQUENCY 4 st` printed beside a lit sync button would be a number read off a scale that is
 * not in force (CLAUDE.md), and on this box that scale needs *two* switches to be in force — the
 * module's `SYNC ENABLE` and the oscillator's own.
 *
 * Oscillator 1 has neither a sync button nor a FREQUENCY knob: it is the pitch the other three
 * are tuned against, and the panel gives it only OCTAVE and WAVEFORM.
 */
function osc(
  n: 1 | 2 | 3 | 4,
  opts: {
    octave: (typeof OSC_OCTAVE)[number]
    wave: (typeof OSC_WAVE)[number]
    /** This oscillator's own sync button. Ignored for oscillator 1, which has none. */
    sync?: boolean
    /** Whether the module's main SYNC ENABLE is lit; both are needed for sync to bite (p.15). */
    mainSync?: boolean
    /** Semitones when this oscillator is not sync'd, percent of travel when it is. */
    frequency?: number
    detuneGrit?: number
  },
): AuthoredParam[] {
  const out: AuthoredParam[] = [
    pick(`OSCILLATOR ${n} OCTAVE`, opts.octave, OSC_OCTAVE, cite(13)),
    pick(`OSCILLATOR ${n} WAVEFORM`, opts.wave, OSC_WAVE, cite(15)),
  ]
  if (n === 1) return out
  const sync = opts.sync === true
  const live = sync && opts.mainSync === true
  out.push(
    pick(`OSCILLATOR ${n} SYNC`, sync ? 'ON' : 'OFF', SYNC, cite(15), {
      ...(sync && opts.mainSync !== true
        ? { note: 'Lit, but SYNC ENABLE is off, so nothing is sync’d and FREQUENCY keeps its printed range (p.15)' }
        : {}),
    }),
  )
  const freq = opts.frequency ?? 0
  out.push(
    live
      ? travel(`OSCILLATOR ${n} FREQUENCY`, freq, {
          note: 'Sync’d, so this sets the sync timbre over a range p.14 does not print',
        })
      : num(`OSCILLATOR ${n} FREQUENCY`, freq, DETUNE_ST, cite(14), {
          unit: 'st',
          hint: 'detune-centre',
          ...(opts.detuneGrit === undefined
            ? {}
            : { mood: [{ axis: 'grit', amount: opts.detuneGrit }] }),
        }),
  )
  return out
}

/** The main sync button, emitted once where any oscillator uses sync. */
function syncEnable(on: boolean): AuthoredParam {
  return pick('SYNC ENABLE', on ? 'ON' : 'OFF', SYNC, cite(14), {
    note: on ? 'Must be lit for any individual oscillator SYNC button to do anything (p.15)' : undefined,
  })
}

/** The five mixer levels. Only the channels a recipe actually uses are emitted. */
function mixer(levels: { o1: number; o2?: number; o3?: number; o4?: number; noise?: number }): AuthoredParam[] {
  const out: AuthoredParam[] = [travel('OSCILLATOR 1', levels.o1, { hint: 'mixer-drive' })]
  if (levels.o2 !== undefined) out.push(travel('OSCILLATOR 2', levels.o2))
  if (levels.o3 !== undefined) out.push(travel('OSCILLATOR 3', levels.o3))
  if (levels.o4 !== undefined) out.push(travel('OSCILLATOR 4', levels.o4))
  if (levels.noise !== undefined) out.push(travel('NOISE', levels.noise))
  return out
}

/** Both ladder filters. `CUTOFF` is the one control on this panel mood may move. */
function filters(opts: {
  cutoff: number
  darkness: number
  res1: number
  res2: number
  spacing: number
  envAmt: number
  kbTrack: number
  mode: (typeof FILTER_MODE)[number]
}): AuthoredParam[] {
  return [
    num('CUTOFF', opts.cutoff, CUTOFF_HZ, cite(21), {
      unit: 'Hz',
      mood: [{ axis: 'darkness', amount: opts.darkness }],
      note: 'One knob for both filters; SPACING offsets filter 1 against it (p.20)',
    }),
    pick('FILTER MODE', opts.mode, FILTER_MODE, cite(20)),
    travel('RESONANCE 1', opts.res1, { hint: 'self-oscillate' }),
    travel('RESONANCE 2', opts.res2),
    travel('SPACING', opts.spacing, { hint: 'bipolar-centre' }),
    travel('ENVELOPE AMT', opts.envAmt, { hint: 'bipolar-centre' }),
    travel('KB TRACKING', opts.kbTrack, { hint: 'kb-track-full' }),
  ]
}

/**
 * One of the two four-stage envelopes. `FILTER` drives the cutoff from the panel; `AMPLITUDE`
 * drives the amplifier. p.25 gives both the same four stages and SUSTAIN is the level, which is
 * why the panel draws it as a slider and the other three as knobs.
 */
function env(
  which: 'FILTER' | 'AMPLITUDE',
  a: number,
  d: number,
  s: number,
  r: number,
): AuthoredParam[] {
  return [
    travel(`${which} ATTACK`, a),
    travel(`${which} DECAY`, d),
    travel(`${which} SUSTAIN`, s),
    travel(`${which} RELEASE`, r),
  ]
}

/** The output stage. */
function output(volume: number, vca: (typeof VCA_MODE)[number]): AuthoredParam[] {
  return [
    pick('VCA MODE', vca, VCA_MODE, cite(29), {
      ...(vca === 'DRONE' ? { note: 'Holds the amplifiers open, so the part sounds without a key held' } : {}),
    }),
    travel('MAIN VOLUME', volume),
  ]
}

/** The stereo analog delay, emitted only where a recipe actually uses it. */
function delay(opts: {
  time: number
  spacing: number
  feedback: number
  mix: number
  pingPong?: boolean
}): AuthoredParam[] {
  return [
    travel('DELAY TIME', opts.time),
    travel('DELAY SPACING', opts.spacing, {
      hint: 'bipolar-centre',
      note: 'Offsets delay 2 against delay 1, which is what makes the repeats stereo',
    }),
    travel('DELAY FEEDBACK', opts.feedback),
    travel('DELAY MIX', opts.mix),
    ...(opts.pingPong === undefined
      ? []
      : [pick('PING PONG', opts.pingPong ? 'ON' : 'OFF', SYNC, cite(33))]),
  ]
}

/**
 * The modulation section. **`MOD` is not optional here** — p.36's AMT knobs set a maximum depth
 * that the MOD slider scales, so a block that set an amount and left the slider unstated would
 * print a value with no effect. The Grandmother's p.23 makes the same point about the same
 * controls.
 */
function mod(opts: {
  rate: number
  wave: (typeof MOD_WAVE)[number]
  assign?: (typeof PITCH_MOD_ASSIGN)[number]
  pitchAmt?: number
  cutoffAmt?: number
  pulseWidthAmt?: number
  wheel: number
}): AuthoredParam[] {
  return [
    num('MODULATION RATE', opts.rate, MOD_HZ, cite(36), { unit: 'Hz' }),
    pick('MODULATION WAVEFORM', opts.wave, MOD_WAVE, cite(36)),
    ...(opts.assign === undefined
      ? []
      : [pick('PITCH MOD ASSIGN', opts.assign, PITCH_MOD_ASSIGN, cite(36))]),
    ...(opts.pitchAmt === undefined ? [] : [travel('PITCH AMT', opts.pitchAmt)]),
    ...(opts.cutoffAmt === undefined ? [] : [travel('CUTOFF AMT', opts.cutoffAmt)]),
    ...(opts.pulseWidthAmt === undefined
      ? []
      : [
          travel('PULSE WIDTH AMT', opts.pulseWidthAmt, {
            note: 'Only reaches an oscillator whose WAVEFORM is SQUARE or NARROW PULSE (p.37)',
          }),
        ]),
    travel('MOD', opts.wheel, { hint: 'mod-gate' }),
  ]
}

/** The second LFO, in UTILITIES (2). Patchable only — nothing routes it internally. */
function lfo(rate: number): AuthoredParam {
  return num('LFO RATE', rate, LFO_HZ, cite(43), {
    unit: 'Hz',
    note: 'A CV at LFO RATE IN takes it past the knob’s 520 Hz to about 620 (p.43)',
  })
}

/** The arpeggiator's switches, for the recipes that are about the arpeggiator. */
function arp(
  direction: (typeof DIRECTION)[number],
  octBank: (typeof OCT_BANK)[number],
): AuthoredParam[] {
  return [
    pick('MODE', 'ARP', ARP_MODE, cite(45)),
    pick('DIRECTION', direction, DIRECTION, cite(46)),
    pick('OCT / BANK', octBank, OCT_BANK, cite(46), {
      note: 'In ARP this is the octave span; in SEQ it selects the sequence bank (p.46)',
    }),
  ]
}

/** The sequencer's file selector, for the recipes that are about the sequencer. */
function seq(bank: (typeof OCT_BANK)[number], file: (typeof SEQUENCE)[number]): AuthoredParam[] {
  return [
    pick('MODE', 'SEQ', ARP_MODE, cite(45)),
    pick('OCT / BANK', bank, OCT_BANK, cite(46)),
    pick('SEQUENCE', file, SEQUENCE, cite(46), { note: 'Bank times sequence is p.90’s twelve files' }),
  ]
}

/** GLIDE, one knob for the whole instrument. p.12 prints no time range for it. */
function glide(value: number): AuthoredParam {
  return travel('GLIDE', value)
}

// ---------------------------------------------------------------------------
// Recipes (§3)
// ---------------------------------------------------------------------------

/**
 * How this box is driven, said once per recipe. Two output bundles mean it drives other gear as
 * readily as it plays itself, which is p.9's own description of it.
 */
const PLAYED =
  'Played from its own 49-note keyboard, from the arpeggiator or the 256-step sequencer, or over MIDI IN'

/**
 * `verified: false` on every recipe, explicitly rather than by omission. §3.1 makes the recipe
 * citation the default a param inherits when it carries none, and nothing here cites a *recipe* —
 * the blank preset sheets on pp.84-89 are blank, so unlike the Grandmother this manual ships no
 * factory patches at all to read names or cables off. The chain has to terminate, and saying so is
 * what stops an omitted citation from quietly meaning something one day.
 */
const RECIPES: Recipe[] = [
  // ---- low --------------------------------------------------------------------------
  {
    id: 'mat-kick-hard',
    role: 'kick',
    character: 'hard',
    voice: 'voice',
    title: 'Kick with the filter envelope cabled onto Oscillator 1’s pitch',
    routing: `${PLAYED}, VOICE MODE 1 so all four oscillators sound one note. One cable: FILTER ENV OUT to OSCILLATORS 1 PITCH IN — the envelope reaches the filters from the panel and everything else only through that jack (p.27)`,
    params: [
      voiceMode('1'),
      ...osc(1, { octave: "16'", wave: 'TRIANGLE' }),
      ...osc(2, { octave: "16'", wave: 'TRIANGLE', frequency: 0 }),
      ...mixer({ o1: 84, o2: 60 }),
      ...filters({ cutoff: 120, darkness: -40, res1: 32, res2: 18, spacing: 50, envAmt: 68, kbTrack: 0, mode: 'STEREO LP / LP' }),
      ...env('FILTER', 0, 14, 0, 12),
      ...env('AMPLITUDE', 0, 16, 0, 14),
      ...output(78, 'AMP ENV'),
      glide(0),
    ],
    patch: [
      cable(
        'ENVELOPE GENERATORS · FILTER ENV OUT',
        'OSCILLATORS · 1 PITCH IN',
        'The pitch drop — a short DECAY makes it a click, a longer one a boom',
      ),
    ],
    verified: false,
  },
  {
    id: 'mat-sub-dark',
    role: 'sub',
    character: 'dark',
    voice: 'voice',
    title: 'Sub from all four triangles stacked on one key',
    routing: `${PLAYED}, VOICE MODE 1. No cable — the mixer, both filters and both amplifiers are normalled`,
    params: [
      voiceMode('1'),
      ...osc(1, { octave: "16'", wave: 'TRIANGLE' }),
      ...osc(2, { octave: "16'", wave: 'TRIANGLE', frequency: 0 }),
      ...osc(3, { octave: "8'", wave: 'TRIANGLE', frequency: 0 }),
      ...osc(4, { octave: "8'", wave: 'TRIANGLE', frequency: 0 }),
      ...mixer({ o1: 72, o2: 66, o3: 44, o4: 40 }),
      ...filters({ cutoff: 180, darkness: -55, res1: 12, res2: 10, spacing: 50, envAmt: 0, kbTrack: 0, mode: 'STEREO LP / LP' }),
      ...env('FILTER', 6, 30, 90, 24),
      ...env('AMPLITUDE', 4, 30, 92, 22),
      ...output(74, 'AMP ENV'),
      glide(0),
    ],
    articulation: [{ slot: 'offbeat', set: { tie: true }, hint: 'tie-step' }],
    verified: false,
  },
  {
    id: 'mat-bass-mid-dirty',
    role: 'bass-mid',
    character: 'dirty',
    voice: 'voice',
    title: 'Four saws spread across seven semitones into an overdriven mixer',
    routing: `${PLAYED}, VOICE MODE 1 — this is the sound the mono mode exists for. No cable`,
    params: [
      voiceMode('1'),
      ...osc(1, { octave: "16'", wave: 'SAWTOOTH' }),
      ...osc(2, { octave: "16'", wave: 'SAWTOOTH', frequency: 3, detuneGrit: 3 }),
      ...osc(3, { octave: "8'", wave: 'SAWTOOTH', frequency: -2, detuneGrit: -2 }),
      ...osc(4, { octave: "8'", wave: 'SAWTOOTH', frequency: 5, detuneGrit: 2 }),
      ...mixer({ o1: 90, o2: 88, o3: 74, o4: 70 }),
      ...filters({ cutoff: 900, darkness: -30, res1: 34, res2: 26, spacing: 58, envAmt: 40, kbTrack: 30, mode: 'SERIES HP / LP' }),
      ...env('FILTER', 0, 40, 40, 26),
      ...env('AMPLITUDE', 0, 44, 48, 24),
      ...output(70, 'AMP ENV'),
      glide(6),
    ],
    articulation: [{ slot: 'accent', set: { ratchet: 2 }, hint: 'ratchet-step' }],
    verified: false,
  },
  {
    id: 'mat-acid-bright',
    role: 'acid',
    character: 'bright',
    voice: 'voice',
    title: 'Acid line: one saw, resonance near self-oscillation, cutoff tracking the keyboard',
    routing: `${PLAYED}, VOICE MODE 1. No cable — ENVELOPE AMT reaches the cutoff from the panel`,
    params: [
      voiceMode('1'),
      ...osc(1, { octave: "8'", wave: 'SAWTOOTH' }),
      ...mixer({ o1: 86 }),
      ...filters({ cutoff: 1200, darkness: -35, res1: 78, res2: 30, spacing: 50, envAmt: 74, kbTrack: 100, mode: 'STEREO LP / LP' }),
      ...env('FILTER', 0, 20, 6, 16),
      ...env('AMPLITUDE', 0, 24, 10, 18),
      ...output(70, 'AMP ENV'),
      glide(18),
    ],
    articulation: [{ slot: 'accent', set: { ratchet: 3 }, hint: 'ratchet-step' }],
    verified: false,
  },

  // ---- backbeat ---------------------------------------------------------------------
  {
    id: 'mat-snare-hard',
    role: 'snare',
    character: 'hard',
    voice: 'voice',
    title: 'Snare: noise over two short mid tones, both filters open',
    routing: `${PLAYED}, VOICE MODE 1. No cable — noise is one of the five normalled mixer channels`,
    params: [
      voiceMode('1'),
      ...osc(1, { octave: "8'", wave: 'TRIANGLE' }),
      ...osc(2, { octave: "4'", wave: 'SQUARE', frequency: 5 }),
      ...mixer({ o1: 44, o2: 30, noise: 88 }),
      ...filters({ cutoff: 2400, darkness: -25, res1: 44, res2: 30, spacing: 62, envAmt: 30, kbTrack: 0, mode: 'SERIES HP / LP' }),
      ...env('FILTER', 0, 15, 0, 12),
      ...env('AMPLITUDE', 0, 17, 0, 14),
      ...output(74, 'AMP ENV'),
      glide(0),
    ],
    articulation: [{ slot: 'fill', set: { ratchet: 4 }, hint: 'ratchet-step' }],
    verified: false,
  },

  // ---- metal ------------------------------------------------------------------------
  {
    id: 'mat-metallic-bright',
    role: 'metallic',
    character: 'bright',
    voice: 'voice',
    title: 'Three oscillators hard-sync’d down the chain, FREQUENCY as timbre',
    routing: `${PLAYED}, VOICE MODE 1. No cable. p.15's sync chain is 2 to 1, 3 to 2 and 4 to 3, and SYNC ENABLE has to be lit for any of them`,
    params: [
      voiceMode('1'),
      syncEnable(true),
      ...osc(1, { octave: "8'", wave: 'SAWTOOTH' }),
      ...osc(2, { octave: "8'", wave: 'SAWTOOTH', sync: true, mainSync: true, frequency: 64 }),
      ...osc(3, { octave: "4'", wave: 'SAWTOOTH', sync: true, mainSync: true, frequency: 58 }),
      ...mixer({ o1: 26, o2: 88, o3: 70 }),
      ...filters({ cutoff: 4800, darkness: -20, res1: 22, res2: 18, spacing: 50, envAmt: 34, kbTrack: 100, mode: 'STEREO LP / LP' }),
      ...env('FILTER', 0, 26, 18, 20),
      ...env('AMPLITUDE', 0, 28, 22, 22),
      ...output(70, 'AMP ENV'),
      glide(0),
    ],
    verified: false,
  },
  {
    id: 'mat-metallic-dirty',
    role: 'metallic',
    character: 'dirty',
    voice: 'voice',
    title: 'Linear FM: Oscillator 1 into Oscillator 2’s LIN FM input',
    routing: `${PLAYED}, VOICE MODE 1. One cable: OSCILLATORS 1 WAVE OUT to OSCILLATORS 2 LIN FM IN. Oscillator 1's mixer level is down because it is the modulator, not a voice`,
    params: [
      voiceMode('1'),
      ...osc(1, { octave: "8'", wave: 'TRIANGLE' }),
      ...osc(2, { octave: "4'", wave: 'TRIANGLE', frequency: -5, detuneGrit: 4 }),
      ...mixer({ o1: 0, o2: 90 }),
      ...filters({ cutoff: 3200, darkness: -25, res1: 30, res2: 22, spacing: 50, envAmt: 28, kbTrack: 100, mode: 'STEREO LP / LP' }),
      ...env('FILTER', 2, 34, 10, 26),
      ...env('AMPLITUDE', 2, 36, 14, 28),
      ...output(68, 'AMP ENV'),
      ...delay({ time: 22, spacing: 60, feedback: 34, mix: 26, pingPong: false }),
      glide(0),
    ],
    patch: [
      cable(
        'OSCILLATORS · 1 WAVE OUT',
        'OSCILLATORS · 2 LIN FM IN',
        'Linear FM — p.13 calls this "brash, metallic, or bell-like"',
      ),
    ],
    articulation: [{ slot: 'last-hit', set: { tie: true }, hint: 'tie-step' }],
    verified: false,
  },

  // ---- body -------------------------------------------------------------------------
  {
    id: 'mat-tom-hard',
    role: 'tom',
    character: 'hard',
    voice: 'voice',
    title: 'Tom: two triangles, envelope onto pitch, a little noise for the skin',
    routing: `${PLAYED}, VOICE MODE 1. One cable: FILTER ENV OUT to OSCILLATORS 1 PITCH IN, shorter and shallower than the kick’s`,
    params: [
      voiceMode('1'),
      ...osc(1, { octave: "16'", wave: 'TRIANGLE' }),
      ...osc(2, { octave: "8'", wave: 'TRIANGLE', frequency: 2 }),
      ...mixer({ o1: 80, o2: 26, noise: 18 }),
      ...filters({ cutoff: 700, darkness: -30, res1: 38, res2: 24, spacing: 50, envAmt: 32, kbTrack: 0, mode: 'STEREO LP / LP' }),
      ...env('FILTER', 0, 24, 0, 18),
      ...env('AMPLITUDE', 0, 26, 0, 20),
      ...output(74, 'AMP ENV'),
      glide(0),
    ],
    patch: [
      cable('ENVELOPE GENERATORS · FILTER ENV OUT', 'OSCILLATORS · 1 PITCH IN', 'The pitch fall that makes it a tom and not a click'),
    ],
    verified: false,
  },
  {
    id: 'mat-noise-dirty',
    role: 'noise',
    character: 'dirty',
    voice: 'voice',
    title: 'Noise alone, through both filters in series',
    routing: `${PLAYED}, VOICE MODE 1. No cable — SERIES puts the high pass in front of the low pass on the panel (p.20)`,
    params: [
      voiceMode('1'),
      ...osc(1, { octave: "8'", wave: 'SAWTOOTH' }),
      ...mixer({ o1: 0, noise: 96 }),
      ...filters({ cutoff: 3600, darkness: -30, res1: 56, res2: 44, spacing: 66, envAmt: 24, kbTrack: 0, mode: 'SERIES HP / LP' }),
      ...env('FILTER', 0, 30, 24, 26),
      ...env('AMPLITUDE', 0, 32, 26, 28),
      ...output(66, 'AMP ENV'),
      glide(0),
    ],
    verified: false,
  },
  {
    id: 'mat-texture-soft',
    role: 'texture',
    character: 'soft',
    voice: 'voice',
    title: 'Sample and hold stepping filter 2 alone, into the stereo delay',
    routing: `${PLAYED}, VOICE MODE 1. One cable: S / H OUT to CUTOFF 2 IN. p.38 is explicit that nothing routes the sample-and-hold internally, and CUTOFF 2 IN reaches only the second filter, so filter 1 stays still while filter 2 steps`,
    params: [
      voiceMode('1'),
      ...osc(1, { octave: "16'", wave: 'TRIANGLE' }),
      ...osc(2, { octave: "8'", wave: 'TRIANGLE', frequency: 4, detuneGrit: 2 }),
      ...mixer({ o1: 62, o2: 58, noise: 12 }),
      ...filters({ cutoff: 1400, darkness: -30, res1: 46, res2: 52, spacing: 56, envAmt: 0, kbTrack: 20, mode: 'PARALLEL HP / LP' }),
      ...env('FILTER', 56, 60, 88, 82),
      ...env('AMPLITUDE', 54, 60, 90, 84),
      ...output(62, 'DRONE'),
      ...delay({ time: 44, spacing: 66, feedback: 58, mix: 52, pingPong: true }),
      ...mod({ rate: 2.2, wave: 'S / H', wheel: 0 }),
      glide(40),
    ],
    patch: [
      cable(
        'MODULATION · S / H OUT',
        'FILTERS · CUTOFF 2 IN',
        'Random steps on filter 2 only; nothing routes S / H internally',
      ),
    ],
    verified: false,
  },

  // ---- tonal ------------------------------------------------------------------------
  {
    id: 'mat-pad-soft',
    role: 'pad',
    character: 'soft',
    voice: 'voice',
    title: 'Four-note pad: one oscillator per key, all four detunes at zero',
    routing: `${PLAYED}, **VOICE MODE 4** — each key plays one oscillator (p.51), so this is a real four-note chord rather than a stack. Every FREQUENCY sits at zero because a detune here would put a chord note out of tune. No cable`,
    params: [
      voiceMode('4'),
      ...osc(1, { octave: "8'", wave: 'TRIANGLE' }),
      ...osc(2, { octave: "8'", wave: 'TRIANGLE', frequency: 0 }),
      ...osc(3, { octave: "8'", wave: 'TRIANGLE', frequency: 0 }),
      ...osc(4, { octave: "8'", wave: 'TRIANGLE', frequency: 0 }),
      ...mixer({ o1: 64, o2: 64, o3: 64, o4: 64 }),
      ...filters({ cutoff: 1600, darkness: -35, res1: 20, res2: 16, spacing: 54, envAmt: 22, kbTrack: 40, mode: 'STEREO LP / LP' }),
      ...env('FILTER', 62, 50, 88, 78),
      ...env('AMPLITUDE', 60, 52, 90, 82),
      ...output(66, 'AMP ENV'),
      ...delay({ time: 52, spacing: 68, feedback: 44, mix: 42, pingPong: true }),
      ...mod({ rate: 0.4, wave: 'SINE', assign: 'ALL', cutoffAmt: 30, wheel: 45 }),
      glide(0),
    ],
    verified: false,
  },
  {
    id: 'mat-pad-dark',
    role: 'pad',
    character: 'dark',
    voice: 'voice',
    title: 'Four-note pad an octave down, saws, cutoff low and still',
    routing: `${PLAYED}, **VOICE MODE 4**. No cable`,
    params: [
      voiceMode('4'),
      ...osc(1, { octave: "16'", wave: 'SAWTOOTH' }),
      ...osc(2, { octave: "16'", wave: 'SAWTOOTH', frequency: 0 }),
      ...osc(3, { octave: "16'", wave: 'SAWTOOTH', frequency: 0 }),
      ...osc(4, { octave: "16'", wave: 'SAWTOOTH', frequency: 0 }),
      ...mixer({ o1: 68, o2: 68, o3: 68, o4: 68 }),
      ...filters({ cutoff: 620, darkness: -45, res1: 26, res2: 20, spacing: 50, envAmt: 14, kbTrack: 30, mode: 'STEREO LP / LP' }),
      ...env('FILTER', 48, 56, 86, 84),
      ...env('AMPLITUDE', 46, 58, 88, 86),
      ...output(66, 'AMP ENV'),
      ...delay({ time: 60, spacing: 58, feedback: 36, mix: 34, pingPong: false }),
      glide(0),
    ],
    verified: false,
  },
  {
    id: 'mat-stab-hard',
    role: 'stab',
    character: 'hard',
    voice: 'voice',
    title: 'Chord stab, four notes, everything short',
    routing: `${PLAYED}, **VOICE MODE 4**. No cable. MULTI TRIG matters here — with it lit the envelopes retrigger on every new key (p.51)`,
    params: [
      voiceMode('4'),
      ...osc(1, { octave: "8'", wave: 'SQUARE' }),
      ...osc(2, { octave: "8'", wave: 'SQUARE', frequency: 0 }),
      ...osc(3, { octave: "8'", wave: 'SAWTOOTH', frequency: 0 }),
      ...osc(4, { octave: "8'", wave: 'SAWTOOTH', frequency: 0 }),
      ...mixer({ o1: 78, o2: 78, o3: 70, o4: 70 }),
      ...filters({ cutoff: 2200, darkness: -30, res1: 40, res2: 30, spacing: 56, envAmt: 46, kbTrack: 40, mode: 'STEREO LP / LP' }),
      ...env('FILTER', 0, 18, 40, 14),
      ...env('AMPLITUDE', 0, 20, 44, 16),
      ...output(74, 'AMP ENV'),
      ...delay({ time: 18, spacing: 62, feedback: 26, mix: 22, pingPong: true }),
      glide(0),
    ],
    verified: false,
  },
  {
    id: 'mat-stab-clean',
    role: 'stab',
    character: 'clean',
    voice: 'voice',
    title: 'Clean chord stab, triangles, no delay',
    routing: `${PLAYED}, **VOICE MODE 4**. No cable`,
    params: [
      voiceMode('4'),
      ...osc(1, { octave: "8'", wave: 'TRIANGLE' }),
      ...osc(2, { octave: "8'", wave: 'TRIANGLE', frequency: 0 }),
      ...osc(3, { octave: "8'", wave: 'TRIANGLE', frequency: 0 }),
      ...osc(4, { octave: "8'", wave: 'TRIANGLE', frequency: 0 }),
      ...mixer({ o1: 72, o2: 72, o3: 72, o4: 72 }),
      ...filters({ cutoff: 3000, darkness: -20, res1: 14, res2: 12, spacing: 50, envAmt: 24, kbTrack: 50, mode: 'STEREO LP / LP' }),
      ...env('FILTER', 2, 22, 46, 18),
      ...env('AMPLITUDE', 2, 24, 50, 20),
      ...output(70, 'AMP ENV'),
      glide(0),
    ],
    verified: false,
  },
  {
    id: 'mat-lead-bright',
    role: 'lead',
    character: 'bright',
    voice: 'voice',
    title: 'Lead: narrow pulse over a saw, glide on, vibrato on the mod slider',
    routing: `${PLAYED}, VOICE MODE 1. No cable — PITCH MOD ASSIGN at ALL reaches every oscillator from the panel`,
    params: [
      voiceMode('1'),
      ...osc(1, { octave: "8'", wave: 'NARROW PULSE' }),
      ...osc(2, { octave: "8'", wave: 'SAWTOOTH', frequency: 2 }),
      ...mixer({ o1: 76, o2: 58 }),
      ...filters({ cutoff: 3800, darkness: -25, res1: 32, res2: 24, spacing: 50, envAmt: 30, kbTrack: 100, mode: 'STEREO LP / LP' }),
      ...env('FILTER', 6, 36, 66, 32),
      ...env('AMPLITUDE', 6, 38, 70, 34),
      ...output(72, 'AMP ENV'),
      ...delay({ time: 30, spacing: 64, feedback: 32, mix: 24, pingPong: true }),
      ...mod({ rate: 5.2, wave: 'SINE', assign: 'ALL', pitchAmt: 18, pulseWidthAmt: 24, wheel: 30 }),
      glide(34),
    ],
    verified: false,
  },
  {
    id: 'mat-arp-bright',
    role: 'arp',
    character: 'bright',
    voice: 'voice',
    title: 'Arpeggio over two octaves, in the order the notes were held',
    routing: `${PLAYED}, VOICE MODE 1 with MODE on ARP. Hold the notes and press PLAY; HOLD keeps the pattern running once your hand is off (p.49)`,
    params: [
      voiceMode('1'),
      ...arp('ORD', '2'),
      ...osc(1, { octave: "8'", wave: 'SQUARE' }),
      ...osc(2, { octave: "8'", wave: 'SAWTOOTH', frequency: 2 }),
      ...mixer({ o1: 74, o2: 54 }),
      ...filters({ cutoff: 3000, darkness: -25, res1: 34, res2: 26, spacing: 50, envAmt: 38, kbTrack: 100, mode: 'STEREO LP / LP' }),
      ...env('FILTER', 0, 26, 28, 22),
      ...env('AMPLITUDE', 0, 28, 32, 24),
      ...output(70, 'AMP ENV'),
      ...delay({ time: 26, spacing: 66, feedback: 40, mix: 30, pingPong: true }),
      glide(0),
    ],
    articulation: [{ slot: 'ghost', set: { ratchet: 2 }, hint: 'ratchet-step' }],
    verified: false,
  },
  {
    id: 'mat-arp-clean',
    role: 'arp',
    character: 'clean',
    voice: 'voice',
    title: 'Arpeggio, one octave, forward and back, triangles only',
    routing: `${PLAYED}, VOICE MODE 1 with MODE on ARP and DIRECTION on FW / BW`,
    params: [
      voiceMode('1'),
      ...arp('FW / BW', '1'),
      ...osc(1, { octave: "8'", wave: 'TRIANGLE' }),
      ...osc(2, { octave: "8'", wave: 'TRIANGLE', frequency: 0 }),
      ...mixer({ o1: 70, o2: 52 }),
      ...filters({ cutoff: 2600, darkness: -20, res1: 14, res2: 12, spacing: 50, envAmt: 20, kbTrack: 100, mode: 'STEREO LP / LP' }),
      ...env('FILTER', 4, 30, 26, 26),
      ...env('AMPLITUDE', 4, 32, 30, 28),
      ...output(68, 'AMP ENV'),
      glide(0),
    ],
    verified: false,
  },

  // ---- transitional (§4.2) ----------------------------------------------------------
  {
    id: 'mat-riser-bright',
    role: 'riser',
    character: 'bright',
    voice: 'voice',
    title: 'Riser: the modulation oscillator on every oscillator’s pitch, under your hand',
    routing: `${PLAYED}, VOICE MODE 1. No cable — PITCH MOD ASSIGN at ALL is the panel route. Raise MOD as the section builds; p.36 is explicit that the AMT knobs do nothing until it is off its minimum`,
    params: [
      voiceMode('1'),
      ...osc(1, { octave: "8'", wave: 'SAWTOOTH' }),
      ...osc(2, { octave: "8'", wave: 'SAWTOOTH', frequency: 4, detuneGrit: 3 }),
      ...osc(3, { octave: "4'", wave: 'SAWTOOTH', frequency: -3, detuneGrit: -2 }),
      ...mixer({ o1: 76, o2: 70, o3: 60, noise: 12 }),
      ...filters({ cutoff: 5200, darkness: -20, res1: 50, res2: 40, spacing: 64, envAmt: 0, kbTrack: 0, mode: 'SERIES HP / LP' }),
      ...env('FILTER', 70, 40, 94, 60),
      ...env('AMPLITUDE', 68, 42, 96, 62),
      ...output(64, 'DRONE'),
      ...delay({ time: 36, spacing: 70, feedback: 62, mix: 46, pingPong: true }),
      ...mod({ rate: 8.5, wave: 'SAWTOOTH', assign: 'ALL', pitchAmt: 62, cutoffAmt: 44, wheel: 70 }),
      glide(0),
    ],
    verified: false,
  },
  {
    id: 'mat-impact-hard',
    role: 'impact',
    character: 'hard',
    voice: 'voice',
    title: 'Impact: everything at once into a long ping-pong delay',
    routing: `${PLAYED}, VOICE MODE 1. No cable. The delay is what makes it an impact rather than a hit`,
    params: [
      voiceMode('1'),
      ...osc(1, { octave: "16'", wave: 'SAWTOOTH' }),
      ...osc(2, { octave: "16'", wave: 'NARROW PULSE', frequency: -6, detuneGrit: 4 }),
      ...osc(3, { octave: "8'", wave: 'SAWTOOTH', frequency: 6, detuneGrit: 3 }),
      ...osc(4, { octave: "8'", wave: 'SQUARE', frequency: -4, detuneGrit: -3 }),
      ...mixer({ o1: 88, o2: 84, o3: 80, o4: 76, noise: 76 }),
      ...filters({ cutoff: 1800, darkness: -35, res1: 48, res2: 38, spacing: 60, envAmt: 52, kbTrack: 0, mode: 'PARALLEL HP / LP' }),
      ...env('FILTER', 0, 46, 0, 70),
      ...env('AMPLITUDE', 0, 48, 0, 74),
      ...output(78, 'AMP ENV'),
      ...delay({ time: 66, spacing: 74, feedback: 70, mix: 62, pingPong: true }),
      glide(0),
    ],
    verified: false,
  },
  {
    id: 'mat-sweep-dark',
    role: 'sweep',
    character: 'dark',
    voice: 'voice',
    title: 'Sweep: both filters in series, SPACING closing the gap between them',
    routing: `${PLAYED}, VOICE MODE 1. One cable: the second LFO's triangle into CUTOFF 1 IN, which moves the high pass alone — the panel has no internal route for this LFO at all (p.42)`,
    params: [
      voiceMode('1'),
      ...osc(1, { octave: "16'", wave: 'SAWTOOTH' }),
      ...osc(2, { octave: "8'", wave: 'SAWTOOTH', frequency: 5, detuneGrit: 3 }),
      ...mixer({ o1: 72, o2: 68, noise: 30 }),
      ...filters({ cutoff: 900, darkness: -50, res1: 42, res2: 34, spacing: 30, envAmt: 0, kbTrack: 0, mode: 'SERIES HP / LP' }),
      ...env('FILTER', 64, 50, 92, 76),
      ...env('AMPLITUDE', 62, 52, 94, 78),
      ...output(64, 'DRONE'),
      ...delay({ time: 58, spacing: 72, feedback: 56, mix: 50, pingPong: true }),
      lfo(0.2),
      glide(0),
    ],
    patch: [
      cable(
        'UTILITIES 2 · LFO TRI OUT',
        'FILTERS · CUTOFF 1 IN',
        'Moves the high pass alone, so the band narrows and widens rather than sliding',
      ),
    ],
    verified: false,
  },
]

// ---------------------------------------------------------------------------
// Voice
// ---------------------------------------------------------------------------

/**
 * **One assignable, four notes.** See the header for why this is one assignable of `polyphony: 4`
 * and not a pool of four: p.50's four oscillators share "a common signal path from the Mixer
 * section and beyond", so they are four pitches of one voice and cannot carry four different
 * parts.
 *
 * This is the first box in the library where `pad` and `stab` are declared and *can actually be
 * filled* rather than reporting a shortfall — the Mother-32 and the Grandmother declare both roles
 * on one monophonic voice precisely so that a triad request says "needs 3 notes" instead of
 * "nothing in your rig plays this part", and here the request is simply served.
 *
 * **The four percussion roles are this library's claim, as on the Grandmother.** The Matriarch's
 * manual ships no factory patches at all — pp.84-89 are *blank* preset sheets, where the
 * Grandmother's pp.45-51 are fourteen filled-in ones — so there is not even a preset name list to
 * lean on here. What is not in doubt is the hardware: four oscillators and a noise channel through
 * two ladder filters and two four-stage envelopes, with `FILTER ENV OUT` available to cable onto
 * any oscillator's pitch. That is a kick, and the recipes above build one.
 *
 * `arp` is declared on p.45's arpeggiator chapter, as on the Grandmother and unlike the Mother-32,
 * which has a sequencer and no arpeggiator.
 */
const VOICE_ROLES: Role[] = [
  'kick',
  'sub',
  'bass-mid',
  'snare',
  'tom',
  'noise',
  'metallic',
  'texture',
  'pad',
  'lead',
  'stab',
  'arp',
  'acid',
  'riser',
  'impact',
  'sweep',
]

/**
 * Roles this box is **not** offered for, since a list invites the question. `vox-chop` — no
 * sampler and no audio memory. `clap`, `rim`, `ghost-perc`, `closed-hat`, `open-hat`, `ride` —
 * four notes of *pitch* independence do not buy four independent articulations, because one pair
 * of envelopes and one filter serve all of them (p.50), so this box can no more hold a hat part
 * and a kick part at once than the Grandmother can.
 */

// ---------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------

export const device: Device = {
  id: 'moog-matriarch',
  name: 'Matriarch',
  maker: 'Moog',
  kind: 'semi-modular',

  /**
   * **Sends and receives on all three wires**, like the Grandmother and unlike the Mother-32, so
   * `sendTransport` and `receiveTransport` are omitted — which is what they mean when absent.
   *
   * *Receive.* p.58's `CLOCK IN` "allows Matriarch to be synchronized to an external clock source
   * such as a DFAM, Mother-32, or any other instrument that outputs clock sync", in CLOCK or
   * STEP-ADVANCE mode (Global Setting 2.1, p.65), at a PPQN set by 3.1 (p.66). The same page adds
   * "Matriarch can also receive Clock information via MIDI", and Global Setting 1.5 (p.64) chooses
   * whether MIDI Clock and Start/Stop are followed.
   *
   * *Send.* p.59's `CLOCK OUT` "allows Matriarch to transmit clock sync to other instruments while
   * the Arpeggiator or Sequencer is running", and "Matriarch can also send Clock information via
   * MIDI". Global Setting 1.6 (p.64) is the MIDI half and **defaults to sending** — which is why
   * there is no `sourceSetup` for either MIDI transport.
   *
   * `usb` is p.59's "Matriarch can also share MIDI information with a computer via USB" plus
   * 1.6's MIDI Clock — two printed sentences rather than one, exactly as on the Grandmother, and
   * said here rather than glossed.
   *
   * `preferredSource` is **not** claimed. See `capabilityEvidence` below.
   */
  clock: {
    canSendClock: true,
    canReceiveClock: true,
    transport: ['midi-din', 'usb', 'analog-clock'],
    /**
     * §7.4/#104. **The analog clock output is off unless the sequencer is running, and that is the
     * factory setting** — the mirror image of the Grandmother, where MIDI needed the switch and the
     * analog jack needed nothing.
     *
     * Global Setting 2.2, p.65: the CLOCK OUT jack "can be set to constantly send a clock pulse
     * signal, or to send clock pulse signals only when the PLAY button is lit … **The Default is
     * ONLY WHEN PLAYING.**" p.59 says the same thing from the jack's side. So a reader told to sync
     * the rig to this box over its analog clock, who has not pressed PLAY, gets nothing — and every
     * later phase of the guide depends on the transport running.
     *
     * Neither MIDI transport declares a setup, because 1.6 already defaults to sending (p.64), and
     * §7.4's rule is that a box needing no setting declares none.
     */
    sourceSetup: [
      {
        transport: 'analog-clock',
        path: 'GLOBAL SETTINGS > 2.2 Arp / Seq Clock Output',
        value: 'ALWAYS (C0)',
        note: 'Factory setting is ONLY WHEN PLAYING, so the jack is silent until PLAY is lit. Global Settings opens on SHIFT + the setting’s key; 3.2 sets the outgoing PPQN, four from the factory',
      },
    ],
  },

  /**
   * Rear panel, pp.54-56. A stereo pair of 1/4" TRS `MAIN OUT` jacks, impedance balanced at
   * +4 dBu, with the left doubling as the mono sum — so `stereo`. `INSTRUMENT IN` is the 1/4" TS
   * external input p.9 calls out as this box's other job: "an ideal processor of external sound
   * sources".
   *
   * `individualOuts: 0`, and this box is the one where that number deserves a sentence: it has
   * six audio outputs beyond the mains — `EURO OUT (L)`/`(R)` and `DELAY OUT (L)`/`(R)` — and not
   * one of them is a channel per part. The Euro pair duplicates the main mix at modular level
   * (p.90: "unaffected by MAIN VOLUME knob setting") and the delay pair is a 100% wet effect send
   * (p.56). A box that carries one part cannot have per-part outputs however many jacks it has.
   *
   * `usbAudio: false` — p.59's USB is MIDI and firmware only.
   */
  io: { main: 'stereo', individualOuts: 0, audioIn: true, usbAudio: false },

  /**
   * §10. 812.8 mm across, from p.90's DIMENSIONS row.
   *
   * **The only Moog dimension line in this library where all three figures convert cleanly** —
   * 32" is 81.28 cm, 14 1/4" is 36.20, 5 1/2" is 13.97 — so unlike the Grandmother (metric width a
   * digit transposition of the imperial) and unlike the Subsequent 37 (imperial width that does not
   * convert), there is no tie to break. p.9's plan view confirms rather than decides: it measures
   * an aspect of 2.303 against the stated 2.246, 2.5% out in the same direction and of the same
   * order as the Grandmother's 1.5%.
   *
   * The depth and height are **the Grandmother's exactly**, which is one case in two widths, and
   * the two panels' measured horizontal bands agree to a few millimetres as a result. `panel.ts`
   * carries the working, including the least-squares join of the two half-panel patch sheets.
   */
  physical: {
    panelSpanMm: 812.8,
    verified: cite(90),
  },

  /** §10. A simplified original drawing, off pp.84-85 scaled onto p.9 (see `panel.ts`). */
  panel: MATRIARCH_PANEL,

  /** §3.3. Declared once, cited once, referenced by every cable above. */
  /**
   * §10/#263. **Warm-up**, cited. p.8: *"Your Matriarch is an analog instrument and should be allowed 10-15 minutes to warm up
   * before use"*. A printed range, so both ends are real.
   *
   * The rig is what makes this worth carrying: a reader sees which of the boxes in front of them
   * need the time, and no single manual can tell them that.
   */
  warmUp: {
    note: '10 to 15 minutes from cold before it holds pitch',
    minutes: { min: 10, max: 15 },
    verified: cite(8),
  },

  jacks: JACKS,

  /**
   * §2.6/#22. Every jack above, cited on its module's own patch-points page, plus the facts that
   * are not jacks.
   *
   * **`clock.preferredSource` is `unknown`, and the sentence that looks like its evidence is the
   * Grandmother's sentence with one more box in the list.** p.9: "In addition to its standalone
   * function, Matriarch is also an ideal processor of external sound sources and a powerful
   * keyboard front-end for expanding a DFAM, Mother-32, Grandmother, or Eurorack modular system."
   *
   * It falls the same way and for the same reason: a "keyboard front-end" is about notes, and the
   * notes claim is already carried — it is why this box offers *two* pitch-and-gate bundles and
   * drives voice control. Nothing in that sentence is about tempo, and `preferredSource` is a claim
   * about tempo. The concrete clock facts all point at a socket rather than at a job: `CLOCK OUT`
   * transmits sync (p.59), Global Settings 1.6 and 2.2 switch the two outputs on (pp.64-65), 3.2
   * sets the resolution (p.66) — which is what a `canSendClock` page says and no more. There is no
   * chapter about clocking external gear and no table-of-contents entry for one.
   *
   * That this box has a 256-step sequencer with twelve files (p.90) does not change it either: the
   * field's own rule is that a dedicated sequencer or transport claims it and everything else
   * omits it, and a keyboard synthesiser with a sequencer in it is not a dedicated sequencer.
   *
   * `features.sidechain.*` is a reading rather than an answer: this box takes external audio at
   * `INSTRUMENT IN` and none of its 33 outputs is an envelope follower or a rectifier, so nothing
   * on it can derive a control voltage from an incoming signal and duck to it.
   */
  /**
   * §2.6/#142. The Grandmother's answer on a bigger panel — REST, TIE and RATCHET are the three
   * things a step can carry besides its note, and none is a length. p.48: *"Press the green TIE
   * button to enter a Tie for the current sequence step. A Tie is used to string two or more
   * individual sequence steps together as if they were played legato-style."*
   *
   * The Arp Gate Length in the MIDI CC table is a *different* control for a different thing — how
   * long the arpeggiator holds each note it plays — and citing it here would answer a question
   * about the sequencer with a fact about the arpeggiator.
   */
  noteDuration: { kind: 'tied-steps', control: 'TIE' },

  capabilityEvidence: {
    noteDuration: cite(48),
    ...JACK_EVIDENCE,
    'clock.preferredSource': {
      kind: 'unknown',
      reason:
        'p.9 calls this box "a powerful keyboard front-end for expanding a DFAM, Mother-32, Grandmother, or Eurorack modular system" — the Grandmother’s own sentence with one more box in the list, and about the notes it supplies rather than the tempo the rig runs on. Those notes are already carried as two output bundles at ARP/SEQ CV OUT + GATE OUT and KEYBOARD KB CV OUT + KB GATE OUT. Everything concrete points at a socket instead: CLOCK OUT transmits sync (p.59), Global Settings 1.6 and 2.2 switch the MIDI and analog outputs on (pp.64-65) and 3.2 sets the outgoing PPQN (p.66), and §7.4 does not admit a canSendClock page here. A 256-step sequencer with twelve files does not make a keyboard synthesiser a dedicated sequencer, and there is no chapter about clocking external gear and no table-of-contents entry for one',
    },
    'clock.sourceSetup[analog-clock]': cite(65),
    voices: cite(90),
    'features.perStep': cite(46),
    'features.lfo': cite(36),
    'features.sidechain.fromExternalAudio': {
      kind: 'unknown',
      reason:
        'the box takes external audio at INSTRUMENT IN (p.54) and none of its thirty-three outputs is an envelope follower or a rectifier, so nothing here can derive a control voltage from an incoming signal and duck to it — but no page states that either way, so this is a reading of the jack list rather than an answer the document gives',
    },
  },

  /**
   * One voice of four-note paraphony. p.90's `POLYPHONY` row and p.50-51's chapter are the basis;
   * see `VOICE_ROLES` above for what it is offered for, and the header for why `polyphony: 4`
   * needs every recipe to carry `VOICE MODE`.
   */
  voices: [{ kind: 'fixed', id: 'voice', label: 'Voice', roles: VOICE_ROLES, polyphony: 4 }],

  /**
   * One assignable exists, so one is the most that can ever be occupied (§12.4) — the number is
   * assignables, not notes, and this box's four notes all live inside the one.
   */
  comfortableVoices: 1,

  /**
   * **`perStep` is three lanes and the manual names exactly three.** p.46: "Notes, Rests, Ties,
   * and Ratchets can be entered into the current sequence", with `REST`, `TIE` and `RATCHET` as
   * three coloured buttons on the panel.
   *
   * **There is no accent lane**, and that is the clean difference from the Grandmother, which has
   * `rest`/`tie`/`accent` and no ratchet. So the Grandmother's rule — that an accent is inaudible
   * until `KB VEL OUT` is cabled to `CUTOFF IN` — has no analogue here and nothing in this file
   * inherits it. What this box has instead is `VEL OUT` in the ARP/SEQ module, which carries the
   * sequenced note's velocity as a matter of course rather than as an accent lane.
   *
   * **That absence shows up in the articulation, and it is worth naming.** §4.3's `accent` *slot*
   * is still reachable for several of these roles — the pattern emits it — but this box has no
   * accent *lane* to set on it, so where the Grandmother writes `accent: true` on that slot the
   * recipes here write `ratchet: 2` or `3`. A ratchet on the accented step is the gesture this
   * hardware has for the emphasis the pattern is asking for. The slot and the lane are two
   * different vocabularies (§4.3) and this is the first device in the library where they come
   * apart on a step the pattern actually reaches.
   *
   * Every slot used below was checked against #108's reachability walk *before* it was written and
   * three were moved as a result: a `fill` on `bass-mid` and on `arp`, and a `last-hit` on `sub`,
   * are all slots no shipped direction emits for those roles. They now sit on `accent`, `ghost`
   * and `offbeat`, which are emitted.
   *
   * **`lfo` counts two.** p.9's own feature list says "Dual, voltage-controlled analog LFOs with
   * selectable waveforms and patchable routing": the MODULATION oscillator, with seven waveshapes
   * and three panel destinations (p.36), and the UTILITIES (2) LFO, with a triangle and a square
   * output and *no* internal routing at all (p.42). `syncable` is `false` — `MODULATION · SYNC IN`
   * resets the phase on a trigger (p.38) and nothing in the document divides or multiplies the
   * clock into either one.
   *
   * The destinations are the three the panel's AMT knobs reach without a cable. `PITCH MOD ASSIGN`
   * narrows the pitch destination to `1 & 3`, `ALL` or `2 & 4` (p.36), which is a routing choice
   * within the destination rather than a fourth one.
   *
   * **`sidechain` is not declared.** See `capabilityEvidence` above.
   */
  features: {
    perStep: ['rest', 'tie', 'ratchet'],
    lfo: {
      count: 2,
      syncable: false,
      destinations: ['frequency', 'filter-cutoff', 'pulse-width'],
    },
  },

  /** Gestures off the panel. Jogs, not documentation (invariant 7). */
  hints: {
    'global-settings': 'Hold SHIFT, then the setting’s black key',
    'paraphonic-4': 'Four keys, one oscillator each',
    'mono-stack': 'All four oscillators on one key',
    'mod-gate': 'The AMT knobs do nothing until MOD is up',
    'detune-centre': '12 o’clock is unison with Oscillator 1',
    'bipolar-centre': '12 o’clock is off; either way from there',
    'kb-track-full': 'Fully clockwise tracks at 1 V/oct',
    'self-oscillate': 'Past 3 o’clock the ladder self-oscillates',
    'mixer-drive': 'Past 1 o’clock the mixer starts to overdrive',
    'multi-trig': 'MULTI TRIG retriggers on every new key',
    'rest-step': 'REC mode, then the blue REST button',
    'tie-step': 'REC mode, then the green TIE button',
    'ratchet-step': 'REC mode, then RATCHET for repeats',
    'delay-sync': 'SYNC / TAP locks the delay to the clock',
    'tap-tempo': 'Tap three times; TAP stays lit',
  },

  manual: { title: 'Matriarch Manual', edition: '012023' },

  recipes: RECIPES,
}
