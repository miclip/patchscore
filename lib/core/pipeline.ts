import type { AssignableKey, Occupancy } from './occupancy'
import type { DeviceId, HookId, RecipeId, RequestId, SectionName } from './ids'
import type { Score } from './objective'
import { moodState, type Character, type MoodState, type Role } from './vocabulary'
import {
  canFollow,
  compatibleJackSignals,
  evidenceFor,
  patternEntryNotice,
  realisationOf,
  sendTransports,
} from './device'
import type {
  Assignable,
  CapabilityEvidence,
  Device,
  WarmUp,
  JackSignalKind,
  JackSpec,
  QuickTune,
  Realisation,
} from './device'
import type { RoleRequest, Template } from './template'
import type { ResolvedParam } from './params'
import {
  assignableKey,
  bandFor,
  bindArticulation,
  compareCodeUnits,
  resolveParams,
  resolvePatch,
  resolveSourceAudio,
  selectPatterns,
  type BoundArticulation,
  type PatternSelection,
  type ResolvedPatchEntry,
  type ResolvedSourceAudio,
} from './resolver'
import {
  assign,
  type Placement,
  type PlacementReport,
  type SearchReport,
  type Shortfall,
} from './search'
import { chooseHook, chooseKey, parseKey, resolvePitch, type HookChoice } from './harmony'
import type { InspirationDiagnostic } from './inspiration'

/**
 * §7. The resolver, composed end to end. Pure functions, no React, and nothing imported from
 * `lib/devices/`.
 *
 * **The input is an *effective* template and *effective* devices.** A device reaching here is
 * already the shared definition composed with the user's rig overlay (#16); a template reaching
 * here is already the base template composed with its inspiration patches (§5). The caller does
 * both compositions — `applyInspirations(template, inspirations) -> Template` is a separate pure
 * function, specified in §5 and built at step 7 — so the resolver receives objects rather than
 * ids and rather than patch instructions. Doing one composition here and not the other would be
 * inconsistent for no reason.
 *
 * Pipeline, per §7, with step 1 (inspiration patching) performed by the caller before this runs:
 *
 *  2. Emit role requests, sorted by ascending priority (§4.4) — inside `assign`
 *  3. Expand all selected devices to `Assignable[]` (§2.2) — inside `assign`
 *  4. Resolve character per request (§6.2) — inside `assign`
 *  5. Select a pattern variant per request and section (§6.3) — **here, before assignment**
 *  6. Search assignments against the lexicographic objective (§7.1) — `assign`
 *  7. Resolve recipes, with fallback (§3.5) — inside `assign`
 *  8. Bind each recipe's articulation to the selected pattern's slots (§4.3) — here
 *  9. Resolve inherited citations, apply mood, stamp provenance (§3.1, §3.2) — here
 *
 * 10. Choose the key and one hook per role by seed, and resolve degrees to notes (§4.1) — here
 *
 * Step 10 was deferred at build step 5.5, which built `harmony.ts`'s arithmetic but left the
 * *choice* — which of `template.keys`, which of several authored hooks — unwired. It lands here
 * rather than in the renderer because it is a musical decision driven by the seed, and a
 * decision made during rendering would mean two renderers of one result could disagree about
 * what key the track is in. The renderer (§8, build step 6) renders; it decides nothing.
 */

// ---------------------------------------------------------------------------
// §7.4 Clock source
// ---------------------------------------------------------------------------

/** §7.4, in order. Anything a device declares beyond these ranks below both. */
export const TRANSPORT_PREFERENCE = ['midi-din', 'usb'] as const

export type ClockSource = {
  deviceId: DeviceId
  deviceName: string
  /** The most-preferred transport this device actually declares. */
  transport: string
  /**
   * §12.4: assignables occupied in at least one section.
   *
   * **Rendered, never ranked.** This is here so the guide can say "carrying 5 parts" beside the
   * clock source; it has no part in choosing that source. See `selectClockSource`.
   */
  occupiedAssignables: number
  /**
   * §7.4/#121. **How many eligible boxes claimed `clock.preferredSource`** — 0, 1, or more.
   *
   * Carried rather than re-derived, for the reason the renderer decides nothing (§8): "why this
   * box" is a fact about the ranking that produced the answer, and a renderer that recomputed it
   * would be a second copy of §7.4's key list, free to drift from the sort three lines above.
   * Rendered, never ranked — like `occupiedAssignables`, and for the same reason.
   */
  claims: number
  /**
   * §7.4/#200. **True when the reader picked this box rather than the ranking.**
   *
   * Rendered, never ranked, like the two fields above: by the time this is set the choice has
   * already been made, and it is carried so the guide can say *why* this box is in charge
   * without a renderer re-deriving §7.4's keys.
   */
  chosen: boolean
  /**
   * §7.4/#144. **How many boxes were eligible at all** — how many declare `canSendClock`.
   *
   * `claims` says what the ranking's one semantic key found; this says whether there was
   * anything to rank. The two are different questions and only the second one can be zero-sum:
   * with one eligible box the sort ran over a list of one, nothing was compared, and "transport,
   * then name, settled it" names two tie-breaks that never fired. That sentence is #144's shape
   * — a statement whose subject (the boxes it was ranked against) has no referents in this rig.
   *
   * Carried rather than re-derived for the reason `claims` is: the renderer decides nothing, and
   * a renderer recomputing `canSendClock` over the rig would be a second copy of the eligibility
   * filter three lines below, free to drift from it.
   */
  eligible: number
}

/**
 * §7.4/#121. What the answer above **rests on**, which is not the same question as what it is.
 *
 *  - `claimed` — one box said driving a rig is its job, and it is this one. A judgement, and a
 *    person's.
 *  - `contested` — more than one said so. §7.4 has no basis to rank two honest claims and does
 *    not pretend to: the transport and the name settled it, and the guide says which.
 *  - `tie-break` — nobody claimed it. The answer is deterministic and it is not a judgement, and
 *    printing it as though it were is the failure #121 named: an alphabetical fallback wearing
 *    the clothes of advice.
 *
 * Derived here rather than stored as a fourth field, so there is exactly one place the three
 * words are decided and no way for `claims` and a `basis` string to disagree.
 */
export type ClockSourceBasis = 'chosen' | 'claimed' | 'contested' | 'tie-break'

export function clockSourceBasis(source: ClockSource): ClockSourceBasis {
  // #200 first: a reader who picked a box does not need to be told how the ranking would have
  // gone. The other three answer "why this one" only when nobody answered it for us.
  if (source.chosen) return 'chosen'
  if (source.claims === 0) return 'tie-break'
  return source.claims === 1 ? 'claimed' : 'contested'
}

/**
 * §7.4/#200/#33. **The evidence to print beside the basis, or nothing when the reader decided.**
 *
 * `clockSourceBasis` already says that a chosen box needs no justification, and both renderers
 * already say "you chose it" and stop. What neither stopped doing was printing the box's
 * `clock.preferredSource` evidence underneath it, which produced this:
 *
 *     Why this box — you chose it · undocumented
 *       ↳ cite: undocumented — the guidebook never states what this box is for; p.253 hedges
 *         to "can be a controller for external MIDI devices" ...
 *
 * The reader put that box in charge, and the guide answered by explaining at length that its
 * manual never says the box is for that. It reads as the guide arguing with a decision it was
 * told to take, and the paragraph is doing it in the most authoritative voice the document has.
 *
 * The evidence is not wrong and it is not useless — it is the honest answer to *"why did the
 * guide pick this box"*, and every other basis still prints it. It is only the wrong answer to a
 * question nobody asked. So the decision lives here, once, and each renderer keeps its own words
 * (#33): ask for the evidence and render whatever comes back.
 *
 * A device page is where somebody who wants to know what this box's manual says about leading a
 * rig should find it, and it says so there whether or not any guide chose the box.
 */
/**
 * §10/#263. **Which boxes in *this* rig need warming up, in registry order.**
 *
 * The decision, once, so both renderers can write their own sentence around it (#33).
 *
 * This is the half no manual can do. Every one of these boxes says so somewhere in its own first
 * pages, and a reader with five machines in front of them would have to have read five manuals and
 * remembered which three mattered. The rig is the thing that knows.
 *
 * Order is the registry's, which is the order every other list in the guide uses, so a reader
 * comparing two lists is comparing them in the same order rather than re-sorting in their head.
 */
export function warmUpNotices(devices: readonly Device[]): { device: Device; warmUp: WarmUp }[] {
  const out: { device: Device; warmUp: WarmUp }[] = []
  for (const device of devices) {
    if (device.warmUp !== undefined) out.push({ device, warmUp: device.warmUp })
  }
  return out
}

/**
 * §10/#263. **Which boxes in this rig have a tuning routine the player runs.**
 *
 * Sits beside `warmUpNotices` because it belongs to the same moment: you switch the analog boxes
 * on, patch while they settle, and touch up the ones that can be touched up once they are warm.
 * A calibration is not here and never will be — that is service work and it stays on the device
 * page.
 */
export function quickTuneNotices(
  devices: readonly Device[],
): { device: Device; quickTune: QuickTune }[] {
  const out: { device: Device; quickTune: QuickTune }[] = []
  for (const device of devices) {
    if (device.quickTune !== undefined) out.push({ device, quickTune: device.quickTune })
  }
  return out
}

export function clockBasisEvidence(
  source: ClockSource | undefined,
  device: Device | undefined,
): CapabilityEvidence | undefined {
  // Both are optional because both renderers reach this with a rig that may have no clock source
  // at all, and neither should have to spell that case out twice.
  if (source === undefined || device === undefined) return undefined
  if (clockSourceBasis(source) === 'chosen') return undefined
  return evidenceFor(device, 'clock.preferredSource')
}

/**
 * §7.4. Ranked over the transports clock can **leave** by, which is the only list that means
 * anything here: this function exists to answer "what wire will the tempo be on", and the answer
 * is a property of the source's output.
 *
 * It read `clock.transport` — both directions at once — until the Mother-32 made the difference
 * visible. That box receives over `midi-din` and sends only over `analog-clock`, so the
 * undirected list ranked it at `midi-din` and the guide named a socket the box does not have.
 */
function transportRank(device: Device): number {
  const sends = sendTransports(device)
  for (let i = 0; i < TRANSPORT_PREFERENCE.length; i++) {
    const preferred = TRANSPORT_PREFERENCE[i] as string
    if (sends.includes(preferred)) return i
  }
  return TRANSPORT_PREFERENCE.length
}

/**
 * §7.4. `canSendClock`, then **one semantic key and two tie-breaks**:
 *
 *  1. `clock.preferredSource` — the manifest's own topology judgement (§2.3). The only key here
 *     that means anything; the two below exist to make the answer deterministic, not right.
 *  2. Transport preference (`midi-din` > `usb`).
 *  3. `deviceId` ascending by UTF-16 code unit (§7.2).
 *
 * **`kind` is not a key, and briefly was.** One revision ranked `kind: 'sequencer'` above other
 * preferred boxes, to settle the case where two manifests each honestly claim the field. It was
 * the same mistake as the paragraph below, one tier down: an inference standing in for a claim.
 * Where two boxes have each said "my job is to drive a rig", §7.4 has no basis to rank them and
 * says so — the repair is for one of them not to make the claim, not for the engine to guess
 * which claim it believes.
 *
 * **`!canReceiveClock` is deliberately not a key.** It was one for exactly one revision, on the
 * argument that a source-only box has nowhere else to sit in the topology. It does not follow:
 * such a box simply runs free, which the guide already says by name for the LiveTrak L-8, and
 * nothing about the rig's clock affects it. Worse, it would infer intent from a *capability* —
 * doing by inference the one job `preferredSource` exists to make a person do explicitly. If a
 * recorder should drive a studio, its manifest says so.
 *
 * **Load is no longer a ranking key.** It used to sit at the top, and the reasoning was that the
 * busiest box is the one you are standing at. That is a guess about the *session* dressed up as a
 * fact about the *rig*: it re-cables a studio because a template asked for one more hat, and it
 * makes the clock source a function of the assignment search, so a change to the objective moves
 * the MIDI cables. `occupiedAssignables` is still carried on the result, because "carrying 5
 * parts" is worth printing beside the source — it is now information the guide renders, never a
 * reason the guide chose.
 *
 * **No seed.** Rerolling a pattern should not re-cable the rig, so this must be stable across
 * rerolls in a way that the assignment deliberately is not — and dropping load makes that
 * strictly truer, since the assignment can no longer reach it at all.
 *
 * **It records what it ranked on** (#121). `claims` counts the eligible boxes that claimed the
 * field, which is the difference between "its manual says this is its job" and "nothing here
 * claims the job, so the name settled it". The guide printed the second as though it were the
 * first for as long as the count was not carried; the decision is unchanged and only its basis
 * is now legible.
 *
 * Returns `undefined` when nothing in the rig can send clock — a real rig, and a fact the guide has
 * to state rather than paper over by nominating a device that cannot do it.
 */
export function selectClockSource(
  devices: readonly Device[],
  occupied: Map<DeviceId, number>,
  chosenId?: DeviceId | undefined,
): ClockSource | undefined {
  const capable = devices.filter((d) => d.clock.canSendClock)
  if (capable.length === 0) return undefined
  // §7.4/#200. The reader's choice outranks every key below, and is honoured only for a box that
  // can actually send clock — a device with no clock output cannot be made one by picking it, and
  // obeying a stale link here would print a setup for a socket that does not exist. When the id
  // names nothing eligible the ranking simply proceeds, which is the same shape as #161's
  // unreadable key: the override is dropped and the derived answer stands.
  const chosen = chosenId === undefined ? undefined : capable.find((d) => d.id === chosenId)
  // #121. Counted over the *eligible* boxes, not over the rig: a manifest cannot claim the field
  // without `canSendClock` (the schema refuses it), so the two lists agree today — and counting
  // the eligible ones is what the sort below actually ranked, which is what the guide reports.
  const claims = capable.reduce((n, d) => n + Number(d.clock.preferredSource === true), 0)

  const ranked = [...capable].sort((a, b) => {
    const byPreferred = Number(b.clock.preferredSource === true) - Number(a.clock.preferredSource === true)
    if (byPreferred !== 0) return byPreferred
    // §7.4/#198. **Between two boxes that both claim the field, one with no voices is the
    // likelier brain.** Clock and sequencing are its only possible contribution, where a box
    // carrying parts is offering clock alongside another job. Three devices claim
    // `preferredSource` now — Metropolix, Tracker Mini, Hapax — and without this the winner
    // between a Hapax and a Tracker Mini fell to `compareCodeUnits` at the bottom, on `polyend-`
    // sorting before `squarp-`. A rig's clock was being chosen alphabetically.
    //
    // **Only among claimants**, and that restriction is the whole correctness of it. `voices: []`
    // does not mean "sequencer" — it means "contributes no parts", which is equally true of the
    // Model 2400 and the L-8. Applied to every eligible box this rule would put a mixing desk in
    // charge of an MPC, which is what `test/pipeline.test.ts`'s unpreferred-rig case catches. A
    // box that has not claimed the job does not get promoted into it for having no voices.
    //
    // **This is not the parts-count rule #50 removed.** That ranked by *how many* parts a device
    // carried, which is why it picked wrongly for a sequencer carrying none. This asks only
    // whether a device can carry *any* — a fact about the instrument, not about this rig — and it
    // reads `voices`, the declaration, never `occupied`, which is the outcome and has no part in
    // choosing a source (see the note above).
    if (a.clock.preferredSource === true && b.clock.preferredSource === true) {
      const byVoiceless = Number(b.voices.length === 0) - Number(a.voices.length === 0)
      if (byVoiceless !== 0) return byVoiceless
    }
    const byTransport = transportRank(a) - transportRank(b)
    if (byTransport !== 0) return byTransport
    return compareCodeUnits(a.id, b.id)
  })

  const winner = chosen ?? (ranked[0] as Device)
  const rank = transportRank(winner)
  // The fallback is the winner's own first *send* transport, for a box whose only output is a
  // transport `TRANSPORT_PREFERENCE` does not rank — `analog-clock` on the Mother-32 today. The
  // undirected list here would reintroduce the whole defect at the one line that survives the
  // ranking, so it is deliberately not reachable from this function.
  const sends = sendTransports(winner)
  return {
    deviceId: winner.id,
    deviceName: winner.name,
    transport: (TRANSPORT_PREFERENCE[rank] ?? sends[0] ?? '') as string,
    chosen: chosen !== undefined,
    occupiedAssignables: occupied.get(winner.id) ?? 0,
    claims,
    eligible: capable.length,
  }
}

// ---------------------------------------------------------------------------
// §7.4/#144 Who can actually follow the source
// ---------------------------------------------------------------------------

/**
 * §7.4/#144. **The rig split by whether it can obey "sync everything else to it".**
 *
 * The instruction has a subject — *everything else* — and both renderers were writing it without
 * ever asking whether that subject had members. At a rig of one box it has none, and the guide
 * told a reader standing in front of a single Deluge to sync a rack that is not there. The same
 * sentence fails one step less obviously at a rig where every other box is exempted: "sync
 * everything else to it, except A and B" over a rig of exactly A and B says *sync nothing*, in
 * words that read like an instruction to do something.
 *
 * So the split is computed once, here, and each renderer writes its own sentences from it — the
 * standing rule `fx.ts` and `sidechain.ts` already follow, and the reason it matters here is that
 * the two renderers previously each carried their own copy of `deaf`/`unwired` and could have
 * drifted on which boxes were exempt.
 *
 * **`followers` is not `others` minus the two exemption lists, spelled differently.** It is the
 * positive predicate, computed the same way the exemptions are, so a future third exemption
 * cannot be added to the clauses and silently left out of the count that decides which sentence
 * gets printed. The three lists partition `others` today and a test holds them to it.
 */
export type ClockFollowing = {
  /** Boxes that can take this rig's clock, on the transport this rig actually resolved. */
  followers: readonly Device[]
  /** Boxes that receive no clock on any wire, so they run free whatever the source does. */
  deaf: readonly Device[]
  /** Boxes that receive clock, but not over this rig's transport. */
  unwired: readonly Device[]
  /**
   * One box in the rig. There is no "everything else" to address, and — unlike an empty
   * `followers` with a non-empty rig — nothing to name as an exception either.
   */
  alone: boolean
}

export function clockFollowing(
  devices: readonly Device[],
  sourceId: DeviceId,
  transport: string,
): ClockFollowing {
  // The source itself is excluded throughout: it is not synced to anything, so it is neither a
  // follower nor an exception to being one.
  const others = devices.filter((d) => d.id !== sourceId)
  return {
    followers: others.filter((d) => d.clock.canReceiveClock && canFollow(d, transport)),
    deaf: others.filter((d) => !d.clock.canReceiveClock),
    // The second exemption, and it did not exist as a category until clock became directional: a
    // box that takes clock happily, but not on the wire this rig resolved. The rack's
    // `isolationReason` has always drawn this distinction; the sentence beside it used to
    // collapse both into "cannot receive clock", which is wrong about a box that receives fine
    // over another transport.
    unwired: others.filter((d) => d.clock.canReceiveClock && !canFollow(d, transport)),
    alone: others.length === 0,
  }
}

/**
 * §12.4. One per assignable occupied in at least one section, never one per section — and, since
 * #40, every voice of a stacked part, so a triad across three tracks counts three.
 */
function occupiedCounts(assignments: readonly ResolvedAssignment[]): Map<DeviceId, number> {
  const byDevice = new Map<DeviceId, Set<AssignableKey>>()
  for (const a of assignments) {
    const set = byDevice.get(a.deviceId) ?? new Set<AssignableKey>()
    for (const assignable of a.assignables) set.add(assignableKey(assignable))
    byDevice.set(a.deviceId, set)
  }
  return new Map([...byDevice].map(([id, set]) => [id, set.size]))
}

// ---------------------------------------------------------------------------
// §3.3 Inter-device patching — the rig's voice-control source
// ---------------------------------------------------------------------------

/**
 * §3.3. One proposed cable between two boxes: what it carries, and both ends by id, name and
 * silkscreen.
 *
 * Both device ids **and** both device names, which looks redundant and is not. The id is what a
 * later pass or a permalink matches on; the name is what the guide prints and what the reader is
 * looking at on the box in front of them. `ResolvedAssignment` carries the same pair for the same
 * reason, and a renderer that looked a name up from the id would be a second place the rig can be
 * got wrong (§8: the renderer decides nothing).
 */
export type PatchCable = {
  /** The kind actually being carried, which is the output's, not the input's. */
  signal: JackSignalKind
  fromDeviceId: DeviceId
  fromDeviceName: string
  fromJack: string
  toDeviceId: DeviceId
  toDeviceName: string
  toJack: string
}

/**
 * §3.3/§7.4. What the choice of source rested on, in the shape `ClockSourceBasis` established:
 *
 *  - `clock-source` — the rig's clock already runs from this box, so the topology points here
 *    before anything else does. Not a judgement about the box; a judgement about the rig, already
 *    made, and not worth contradicting with a second cable out of somewhere else.
 *  - `claimed` — one eligible box said driving a rig is its job (`clock.preferredSource`).
 *  - `contested` — more than one said so, and §7.4's reasoning holds here too: there is no basis
 *    to rank two honest claims, so the ids settled it and the guide says so.
 *  - `tie-break` — nobody claimed anything. Deterministic, and not advice.
 *
 * Stored rather than derived, unlike `ClockSourceBasis` — and the difference is the point. There,
 * the word is a pure function of a count the result already carries, so disagreement is
 * impossible. Here it names *which of four keys actually decided*, which no count on this type can
 * recover; deriving it would mean a second copy of the sort, free to drift.
 */
export type VoiceControlBasis = 'clock-source' | 'claimed' | 'contested' | 'tie-break'

/**
 * §3.3. **A section's pitch-and-gate pair** — the unit this pass allocates.
 *
 * Paired by the section its ids are qualified with (§3.3: `VCO A · FM 1`, the part before the
 * separator), because a note and the gate that sounds it leave a box together or not at all. The
 * Metropolix is the case that makes this concrete: its four outputs are two tracks, and `TRK 1`'s
 * pitch belongs with `TRK 1`'s gate. Pairing on kind alone would have produced the cross product —
 * four pairings of two tracks, two of them splicing one track's pitch to the other's gate, which
 * is not a thing anybody patches.
 *
 * **One bundle per section**, taking the first of each kind by code unit where a section declares
 * more than one. A section is a functional block on a panel; two gate jacks inside one are
 * alternatives, not two independent voices.
 *
 * A jack whose id carries no separator declares no section, so it is its own section and pairs
 * with nothing. That is the honest reading of §3.3 — ids *are* section-qualified — and it means an
 * unqualified fixture forms no bundles rather than forming accidental ones.
 */
type Bundle = { section: string; pitch: JackSpec; gate: JackSpec }

/** The part before the first ` · `; the whole id when there is no separator. */
function jackSection(id: string): string {
  const at = id.indexOf(' · ')
  return at < 0 ? id : id.slice(0, at)
}

/**
 * §3.3. **A socket whose only declared job is this kind.**
 *
 * The exactly-one-kind rule is what makes "primary voice-control" a definition rather than a hope,
 * and it is doing real work on the boxes in `lib/devices/`. The Cascadia declares five gate
 * outputs; three of them are `['gate', 'trigger']` end-of-stage outputs whose page says they are
 * triggers by default and gates only if a global setting is changed. Ranked on membership alone,
 * `ENVELOPE A · EOA` sorts first and the guide tells a reader to play a synth from an
 * end-of-attack pulse.
 *
 * A single-purpose socket is also how this pass **stays out of the clock's way** without a special
 * case for it: a hole that carries clock as well as gate carries more than one kind, so it is
 * never a bundle member, and the cable §7.4 already decided is never restated here.
 */
function soleKind(jacks: readonly JackSpec[], direction: 'in' | 'out', kind: JackSignalKind) {
  return jacks
    .filter((j) => j.direction === direction && carriesOnly(j, kind))
    .sort((a, b) => compareCodeUnits(a.id, b.id))
}

/**
 * §3.3/#213. Whether this socket's job is `kind` — either because it declares nothing else, or
 * because the manual says how to set it to that and the manifest cites the setting.
 *
 * **The second clause is not a relaxation of the first.** A multi-kind socket still fails unless
 * it carries a `setup`, and a `setup` can only be authored from a printed menu path and option
 * (`JackSetup`). So the Cascadia's `ENVELOPE A · EOA` — `['gate','trigger']`, a trigger by default
 * and a gate only if a global setting changes — still fails, because its manual hedges and there
 * is no instruction to cite. The Torso T-1's `cv · a` passes, because a per-socket Function
 * setting chooses and the page says to pick Pitch.
 *
 * That is the whole distinction: **a socket that can be set to a kind is not one that is
 * ambiguous about it**, and the evidence for which is whether an instruction exists.
 */
function carriesOnly(jack: JackSpec, kind: JackSignalKind): boolean {
  if (jack.signal.length === 1) return jack.signal[0] === kind
  return (jack.setup ?? []).some((step) => step.signal === kind)
}

/** Every section on this box that declares both a note socket and a gate socket, section-ordered. */
function bundles(device: Device, direction: 'in' | 'out'): Bundle[] {
  const jacks = device.jacks ?? []
  const pitches = soleKind(jacks, direction, 'pitch-cv')
  const gates = soleKind(jacks, direction, 'gate')
  const sections = [...new Set(pitches.map((p) => jackSection(p.id)))].sort(compareCodeUnits)

  const bySection = sections.flatMap((section) => {
    const pitch = pitches.find((p) => jackSection(p.id) === section)
    const gate = gates.find((g) => jackSection(g.id) === section)
    return pitch === undefined || gate === undefined ? [] : [{ section, pitch, gate }]
  })
  if (bySection.length > 0) return bySection

  // §3.3/#201. **The second shape: two numbered groups, paired by ordinal.**
  //
  // The section rule above is right for a box that puts its pitch and gate sockets under one
  // legend — the Minitaur's `CONTROLLER INPUTS · PITCH CV` and `· GATE`, where the panel itself
  // says they belong together. A multitrack CV sequencer does not lay out that way: the Hapax
  // labels `Cv out 1`-`Cv out 4` and `gate out 1`-`gate out 4` as two groups addressed by number,
  // and CV out 1 goes with gate out 1. Under the section rule alone each of its sockets is its own
  // section, no pair is ever found, and the engine reported that a Hapax cannot play a Minitaur.
  //
  // **A fallback, never an override.** A box whose panel groups them has answered the question,
  // and this must not second-guess it — so this runs only where the section rule found nothing,
  // which makes the change a pure addition for every device authored before it.
  //
  // The ordinal is read from the id rather than declared because it is already authored intent:
  // the Hapax manifest records that its jack ids carry "the figures' words plus the routing menu's
  // ordinal", precisely because p.90 addresses `CV 1` to `CV 4` one at a time where the drawing
  // labels only the group. A jack with no trailing number takes no part.
  const byOrdinal: Bundle[] = []
  for (const pitch of pitches) {
    const n = trailingOrdinal(pitch.id)
    if (n === undefined) continue
    const gate = gates.find((g) => trailingOrdinal(g.id) === n)
    if (gate === undefined) continue
    byOrdinal.push({ section: String(n), pitch, gate })
  }
  return byOrdinal.sort((a, b) => compareCodeUnits(a.pitch.id, b.pitch.id))
}

/**
 * §3.3/#201. The number a socket's id ends with, or `undefined` when it ends with anything else.
 *
 * Deliberately anchored to the end. A jack called `Cv out 1` pairs on `1`; one called
 * `1 · SOMETHING` does not pair on `1`, because a leading number is part of a name rather than an
 * ordinal, and pairing on it would invent a correspondence the panel does not make.
 */
function trailingOrdinal(id: string): string | undefined {
  // A number, or a **single** letter. The Hapax labels its sockets `Cv out 1`; the Torso T-1
  // labels its `cv · a` and `gate · a`, and #201 shipped reading digits only, so that box paired
  // nothing and the engine reported it could drive no synth — a sequencer whose entire purpose is
  // driving synths.
  //
  // **One letter, never a word.** `ENVELOPE A · EOA` ends in a letter too, and `EOA` is a name
  // rather than an ordinal; pairing on it is how a reader gets told to play a synth from an
  // end-of-attack pulse, which is the failure `soleKind` was written to prevent. Anchored to the
  // end for the same reason #201 was: a leading token is part of a name.
  //
  // Returned as a string so `1` and `a` compare by one rule. Lower-cased because a panel may
  // print `CV A` and `Gate a`, and a pairing that depends on the case of a silkscreen is not a
  // pairing.
  const match = /(?:\s|·)\s*([0-9]+|[A-Za-z])$/.exec(id)
  const token = match?.[1]
  if (token === undefined) return undefined
  return token.toLowerCase()
}

/**
 * §3.3. One assigned box this pass routes voice control into.
 *
 * `outcome` is explicit rather than inferable from `cables.length`, because the three ways a
 * target can come away empty-handed are three different things to a reader (§7.3):
 *
 *  - `routed` — it got its two cables.
 *  - `no-compatible-source` — nothing in this rig offers a note-and-gate pair at all. Buy a
 *    sequencer.
 *  - `source-exhausted` — something does, and the box driving the rig ran out of them. A
 *    Metropolix has two tracks and a third synth is one track short. That is a fact about supply,
 *    and telling somebody "nothing here can drive this" instead would send them shopping for the
 *    thing they already own.
 */
/**
 * §8/#65. **What phase 5 should say about where a pattern is entered, for a box that cannot hold
 * one.**
 *
 * `patternEntry` shipped the first half: a box with no sequencer says so instead of being handed
 * a grid. This is the half that was left — naming *which* box drives it, and saying plainly when
 * nothing in the rig can.
 *
 * One decision in one place, the arrangement `contentNotice`, `noteDurationNotice` and
 * `patternEntryNotice` already sit in (#33). Two hand-written vocabularies around one verdict is
 * how the Markdown guide and the page come to disagree about the rig a reader is standing in.
 *
 * The four states are four different things to a reader, and collapsing any two would be advice
 * rather than fact:
 *
 *  - `driven` — a box is driving it, and here are the two sockets. The best case, and the one the
 *    old wording could not express.
 *  - `nothing-drives` — the rig has no box that can send a note and a gate. That is a purchase,
 *    not a patching mistake, and the guide should not imply otherwise.
 *  - `source-exhausted` — something can, and it ran out of pairs. A cable count, not a capability.
 *  - `unrouted` — this pass reached no verdict for the box. The pre-#65 wording stands: point at
 *    the rig diagram rather than invent a driver.
 */
/**
 * §8/#230. **The box a reader stands at to enter a part, which is not always the box it sounds on.**
 *
 * The guide is phase-major: seven phases, each covering every part in the rig. A session is not.
 * People work a track at a time — pick the sound source, shape it a little, move on — and
 * phase-major sends the reader back to the same box three separate times, once per phase.
 *
 * This is the grouping the other layout needs, and the rule is **the sequencer, not the device**.
 * Those are the same thing for almost every rig, which is why device-major looks adequate until it
 * is not: measured over 84 sampled five-device guides the two groupings were identical in every
 * one. They come apart only for a box that cannot hold a pattern (§8/#65), where the reader's
 * hands are on whatever drives it — a Minitaur's part is entered on the Hapax, and a layout that
 * files it under the Minitaur sends the reader to the wrong panel.
 *
 * So this keys on `patternDriver`, which already answers exactly that question, rather than on
 * `deviceId`. Grouping by device would need a special case for those boxes; grouping by driver
 * needs none, and gets the ordinary case right for the same reason.
 *
 * **A part nothing can drive keeps its own group** rather than being dropped or filed under a box
 * the reader will not touch. Invariant 5: that is a gap in the rig, the guide already says so in
 * as many words ("Nothing in this rig can drive it"), and a layout that made it disappear would
 * be hiding the one thing a reader most needs to know. It sorts last, because it is the group
 * with nothing to stand at.
 *
 * Order is first appearance in `assignments`, so it inherits the resolver's own ordering and is
 * as deterministic as the allocation is (invariant 6). Nothing here sorts by name.
 */
export type SequencerGroup =
  | {
      kind: 'sequencer'
      deviceId: DeviceId
      deviceName: string
      assignments: readonly ResolvedAssignment[]
      /**
       * Every part in this group sounds somewhere else. True for a Hapax driving a Minitaur and
       * carrying nothing of its own — the reader stands here, but no sound is made here, and a
       * renderer that says "on the Hapax" without saying so would be misleading.
       */
      drivesOnly: boolean
    }
  | { kind: 'undriven'; assignments: readonly ResolvedAssignment[] }

/**
 * §8/#230/#33. **The parts and hooks one sequencer's section covers**, decided once for both
 * renderers.
 *
 * The standing rule is that a decision lives in `lib/core` and each renderer says it in its own
 * voice. This is a decision: *which* of the guide's parts and hooks belong under a given box. The
 * Markdown and React guides then render that subset in their own vocabularies, and neither owns it.
 *
 * **Narrowing `assignments` alone is not enough, and that is the whole reason this exists.** The
 * hook phase is driven by `song.hooks` and looks each hook's role up among the assignments, so a
 * result narrowed only by assignment reports every *other* box's hook as unassigned — printing
 * one box's parts as gaps under every other box in the rig. Both renderers would have made that
 * mistake independently; the Markdown one did, once.
 *
 * Everything else is carried through untouched. `song`, `devices` and `interDevicePatch` are
 * context a subset cannot change, and `shortfalls` is deliberately left whole because no phase
 * rendered per-section reads it — were one to start, this is where the repeat would have to be
 * dealt with.
 */
/**
 * §8/#230/#240. **The boxes a sequencer's section covers**, for the rig detail that belongs beside
 * the work rather than four sections above it.
 *
 * #240's second question: a reader is told the Deluge's MIDI channel and audio out in phase 3, then
 * asked to touch the Deluge again two sections later. The fix is to put each box's own clock, jacks,
 * audio and mixer lines in the section where its parts are worked — and that means deciding which
 * boxes a section is *about*, which is not simply its host.
 *
 * Two, in order:
 *
 *  - **The host**, the box the reader is standing at.
 *  - **Every box the section's parts sound on**, which for an ordinary group is the host again and
 *    for a driven part is somewhere else. Entering the Minitaur's line on the Hapax, the reader
 *    needs the Hapax's sockets to patch from *and* the Minitaur's audio and mixer channel to hear
 *    it. Naming only the host would move half the answer and leave the other half in phase 3.
 *
 * Deduplicated, host first, then first appearance — no sort, so the order is the resolver's and
 * stays deterministic (invariant 6).
 *
 * **What this does not do is decide where an uncovered box goes.** A mixer or an fx-processor
 * carries no parts (§2.4), belongs to no group, and still has to be patched; `devicesOutsideGroups`
 * is the other half, and between them every device in the rig is named exactly once.
 */
export function devicesInGroup(group: SequencerGroup): readonly DeviceId[] {
  const out: DeviceId[] = []
  if (group.kind === 'sequencer') out.push(group.deviceId)
  for (const a of group.assignments) if (!out.includes(a.deviceId)) out.push(a.deviceId)
  return out
}

/**
 * §8/#240. The boxes no sequencer section covers, which phase 3 keeps.
 *
 * A mixer-recorder and an fx-processor contribute zero assignables by design (§2.4) and appear in
 * rig integration precisely because a reader still has to patch them. Under a layout built from
 * groups they belong to none, and a section that simply stopped mentioning them would be the
 * invariant 5 failure the empty-rig case already taught once: a box that vanishes reads as a box
 * with nothing to do.
 */
export function devicesOutsideGroups(result: ResolveResult): readonly Device[] {
  const covered = new Set(sequencerGroups(result).flatMap((g) => devicesInGroup(g)))
  return result.devices.filter((d) => !covered.has(d.id))
}

export function narrowToGroup(
  result: ResolveResult,
  assignments: readonly ResolvedAssignment[],
): ResolveResult {
  const carried = new Set(assignments.map((a) => a.role))
  return {
    ...result,
    assignments: [...assignments],
    song: { ...result.song, hooks: result.song.hooks.filter((h) => carried.has(h.forRole)) },
  }
}

/**
 * §8/#230. The hooks this direction asks for that no box in the rig carries.
 *
 * The other half of `narrowToGroup`: those hooks belong to no section, so a layout built from
 * groups alone would drop them. Invariant 5 — a gap shown nowhere and a gap shown once per box
 * are both wrong, and this is what lets a renderer show them exactly once.
 */
export function unplayedHooks(result: ResolveResult) {
  const played = new Set(result.assignments.map((a) => a.role))
  return result.song.hooks.filter((h) => !played.has(h.forRole))
}

export function sequencerGroups(result: ResolveResult): readonly SequencerGroup[] {
  const byId = new Map(result.devices.map((d) => [d.id, d]))

  /** The box whose panel this part is entered on, or `undefined` when nothing can drive it. */
  const hostOf = (a: ResolvedAssignment): DeviceId | undefined => {
    // A box that sequences itself hosts its own parts. `patternEntryNotice` answers only for the
    // boxes that declare they cannot, so the common case never consults the patch at all.
    if (patternEntryNotice(byId.get(a.deviceId)) === undefined) return a.deviceId
    const driver = patternDriver(result.interDevicePatch, a.deviceId)
    return driver.state === 'driven' ? driver.deviceId : undefined
  }

  const order: (DeviceId | undefined)[] = []
  const grouped = new Map<DeviceId | undefined, ResolvedAssignment[]>()
  for (const a of result.assignments) {
    const host = hostOf(a)
    let bucket = grouped.get(host)
    if (bucket === undefined) {
      bucket = []
      grouped.set(host, bucket)
      order.push(host)
    }
    bucket.push(a)
  }

  const groups: SequencerGroup[] = []
  for (const host of order) {
    const assignments = grouped.get(host) as ResolvedAssignment[]
    if (host === undefined) continue // appended last, below
    groups.push({
      kind: 'sequencer',
      deviceId: host,
      deviceName: byId.get(host)?.name ?? host,
      assignments,
      drivesOnly: assignments.every((a) => a.deviceId !== host),
    })
  }
  const undriven = grouped.get(undefined)
  if (undriven !== undefined) groups.push({ kind: 'undriven', assignments: undriven })
  return groups
}

export type PatternDriver =
  /**
   * `deviceId` beside `deviceName` since #230. Phase 5 only ever needed the name, because it
   * prints a sentence; `sequencerGroups` needs to *group* by the driving box, and grouping on a
   * display string would fuse two devices that happen to share a name and split one that gets
   * renamed. The id is already in the cable — `PatchCable.fromDeviceId` — so this exposes what
   * was there rather than deriving it a second way, which is the drift this file warns about
   * three lines down.
   */
  | { state: 'driven'; deviceId: DeviceId; deviceName: string; pitchJack: string; gateJack: string }
  | { state: 'nothing-drives' }
  | { state: 'source-exhausted'; deviceName: string }
  | { state: 'unrouted' }

export function patternDriver(
  patch: InterDevicePatch | undefined,
  deviceId: DeviceId,
): PatternDriver {
  const target = patch?.targets.find((t) => t.deviceId === deviceId)
  if (target === undefined) return { state: 'unrouted' }
  switch (target.outcome) {
    case 'routed': {
      // **The source's sockets, not the target's.** `target.pitchJack` and `target.gateJack` are
      // the inputs on the box being played; a reader told to "enter this on the Hapax through
      // CONTROLLER INPUTS · PITCH CV" is being handed the Minitaur's own socket names and sent to
      // the wrong panel. What phase 5 needs is which output of the driving box carries this part,
      // which is the cable's `fromJack`. Matched on `toJack` rather than taken by index, so the
      // pair cannot come apart if the cable order ever changes.
      const pitch = target.cables.find((c) => c.toJack === target.pitchJack)
      const gate = target.cables.find((c) => c.toJack === target.gateJack)
      if (pitch === undefined || gate === undefined) return { state: 'unrouted' }
      return {
        state: 'driven',
        deviceId: pitch.fromDeviceId,
        deviceName: pitch.fromDeviceName,
        pitchJack: pitch.fromJack,
        gateJack: gate.fromJack,
      }
    }
    case 'no-compatible-source':
      return { state: 'nothing-drives' }
    case 'source-exhausted':
      return { state: 'source-exhausted', deviceName: patch?.source?.deviceName ?? '' }
  }
}

export type VoiceControlTarget = {
  deviceId: DeviceId
  deviceName: string
  /** The sockets this pass routes *to*, chosen before any source was looked at. */
  pitchJack: string
  gateJack: string
  outcome: 'routed' | 'no-compatible-source' | 'source-exhausted'
  /** Two cables when routed — pitch then gate — and none otherwise. */
  cables: PatchCable[]
}

/**
 * §3.3. **One box drives voice control for the whole rig**, and this is which.
 *
 * One rather than a best source per target, and that repair is why this type exists. Choosing per
 * target let two boxes that each take pitch and gate be proposed as each other's source: every
 * cable individually true, the pair a rig nobody builds. A rig has one sequencer in the sense that
 * matters here, so the pass picks it once and allocates outward.
 */
export type VoiceControlSource = {
  deviceId: DeviceId
  deviceName: string
  basis: VoiceControlBasis
  /**
   * §7.4/#121's count, one tier deeper: how many *eligible source boxes* claimed
   * `clock.preferredSource`. Carried rather than re-derived, for the reason the renderer decides
   * nothing (§8) — "2 boxes here claim that job" is a fact about the ranking that produced this
   * answer, and a renderer recomputing it would be a second copy of the key list.
   */
  claims: number
  /** The section pairs this box offers — the supply the allocation draws on. */
  candidates: number
  /** Eligible bundles ranked across the whole rig, this box's included. Rendered, never ranked. */
  ranked: number
}

/**
 * §3.3. The pass's whole answer.
 *
 * Three outcomes rather than a list that may be empty, because the two empty cases mean opposite
 * things to a reader and §7.3's discipline is that a gap says what its absence *means*:
 *
 *  - `no-target` — nothing assigned in this rig takes external pitch and gate, the source box
 *    aside. A rig of grooveboxes, and nothing is missing.
 *  - `no-compatible-pair` — something does, and nothing here can drive it. That is a gap, and a
 *    reader can act on it.
 *  - `routed` — at least one target got its two cables.
 */
export type InterDevicePatch = {
  outcome: 'routed' | 'no-compatible-pair' | 'no-target'
  /** `undefined` when nothing in the rig offers a note-and-gate pair. */
  source: VoiceControlSource | undefined
  /** By `deviceId`, UTF-16 code unit (§7.2). */
  targets: VoiceControlTarget[]
}

function cable(from: Device, fromJack: JackSpec, to: Device, toJack: JackSpec): PatchCable {
  return {
    // The output's kind. A `['cv']` input fed by a `['pitch-cv']` output is carrying pitch, and
    // saying `cv` because that is what the socket asked for would lose exactly the thing the
    // one-way relation was built to keep.
    signal: fromJack.signal[0] as JackSignalKind,
    fromDeviceId: from.id,
    fromDeviceName: from.name,
    fromJack: fromJack.id,
    toDeviceId: to.id,
    toDeviceName: to.name,
    toJack: toJack.id,
  }
}

/**
 * §3.3. **The rig's voice-control cables: one source box, allocated outward.**
 *
 * Scope, deliberately narrow: pitch and gate, between boxes declaring single-purpose sockets for
 * both in one section. Audio is not here — §8 already tells the reader where the outputs go, and
 * `io` rather than `jacks` is what says so. Clock is not here either, and cannot be: §7.4 decides
 * one clock cable for the whole rig and a multi-kind socket is not a bundle member.
 *
 * **Four steps, in this order:**
 *
 *  1. Build every box's section-paired output bundles and rank them all together.
 *  2. The winner's *device* is the rig's voice-control source. One box, not one per target.
 *  3. Targets are the assigned boxes with a section-paired input bundle, **minus the source** — a
 *     box does not patch into itself, and the exclusion is also what stops the mutual proposal
 *     that made choosing per target wrong.
 *  4. Allocate the source's bundles, in ranked order, to targets in `deviceId` order, one bundle
 *     each and none reused. Two tracks drive two synths; the third synth is told the source ran
 *     out rather than told nothing can drive it.
 *
 * **Ranking, in order** — the first key is the rig's own topology, the second is the only key that
 * means anything, and the rest exist to make the answer deterministic rather than right:
 *
 *  1. the resolved clock source, because the box already driving the rig is the box the reader is
 *     standing at, and proposing notes out of a different box than the tempo is a rig nobody built;
 *  2. `clock.preferredSource` — §2.3's manifest judgement, reused rather than duplicated, since
 *     "my job is to drive a rig" is the same claim whether the cable carries tempo or notes;
 *  3. `deviceId`, then the pitch jack, then the gate jack, by UTF-16 code unit (§7.2). The jack
 *     keys are what order one box's own sections, so `TRK 1` is allocated before `TRK 2`.
 *
 * **What depends on the assignment, and what must not.** The *target* list does: a voice-control
 * cable into a box carrying no part is a cable to nowhere, so the pass reads `assignments`. The
 * *source* choice and the ranking do not, and that is §7.4's rule ("rerolling a pattern should not
 * re-cable the rig") kept as far as it can be kept — no load, no seed, no occupancy anywhere below.
 * A reroll can still change this result by moving a part onto a different box, which is a real
 * change to the rig and not a re-cabling of an unchanged one.
 *
 * **A source need not be assigned.** A sequencer that took no part is the most ordinary thing in
 * the world to drive another box with, and requiring an assignment would refuse the obvious rig
 * while accepting stranger ones.
 *
 * Pure: devices, assignments and the clock source in, no seed, no mood, no `Math.random`.
 */
export function routeVoiceControl(
  devices: readonly Device[],
  assignments: readonly ResolvedAssignment[],
  clockSource: ClockSource | undefined,
): InterDevicePatch {
  const eligible = devices.flatMap((device) =>
    bundles(device, 'out').map((bundle) => ({ device, ...bundle })),
  )
  // #121's key list, one tier deeper. Counted over the *eligible* boxes, as §7.4 counts over the
  // boxes that could send clock, so the number reports what was actually ranked.
  const claims = new Set(
    eligible.filter((b) => b.device.clock.preferredSource === true).map((b) => b.device.id),
  ).size

  const ranked = [...eligible].sort((a, b) => {
    const byClock =
      Number(b.device.id === clockSource?.deviceId) - Number(a.device.id === clockSource?.deviceId)
    if (byClock !== 0) return byClock
    const byPreferred =
      Number(b.device.clock.preferredSource === true) -
      Number(a.device.clock.preferredSource === true)
    if (byPreferred !== 0) return byPreferred
    const byDevice = compareCodeUnits(a.device.id, b.device.id)
    if (byDevice !== 0) return byDevice
    const byPitch = compareCodeUnits(a.pitch.id, b.pitch.id)
    return byPitch !== 0 ? byPitch : compareCodeUnits(a.gate.id, b.gate.id)
  })

  const winner = ranked[0]
  const sourceDevice = winner?.device
  const supply = ranked.filter((b) => b.device.id === sourceDevice?.id)

  const assigned = new Set<DeviceId>(assignments.map((a) => a.deviceId))
  const targets: VoiceControlTarget[] = []
  let next = 0

  for (const device of [...devices].sort((a, b) => compareCodeUnits(a.id, b.id))) {
    if (!assigned.has(device.id) || device.id === sourceDevice?.id) continue
    const into = bundles(device, 'in')[0]
    if (into === undefined) continue

    /**
     * Allocation, in target order: the next unused bundle, if this box can take it.
     *
     * **`compatibleJackSignals` is the criterion, not `===`**, and this is the one place the pass
     * asks the question the relation exists to answer. Both ends are single-purpose sockets today,
     * so a `pitch-cv` output against a `pitch-cv` input is the only pairing that arises and the
     * check passes on every manifest in the library — the same standing as the schema's
     * clock-transport check, which no current device fails either.
     *
     * **Being straight about its reach:** target selection still requires a single-purpose
     * `pitch-cv` input (see `bundles`), so the relation's one interesting arm — a `pitch-cv` output
     * accepted at a `cv` input — is not reachable from here today, and this is equivalent to
     * equality. It is written as the relation anyway because this is the place that has to ask, and
     * an equality test here would be the *wrong question* silently: the day a target whose note
     * socket is documented only as `CV IN` is admitted, equality refuses a cable that belongs and
     * nothing fails. The refusal that is live right now is the other direction, and it is enforced
     * a step earlier by `soleKind` rather than here.
     *
     * A bundle that does not fit is **not consumed**. The target says nothing can drive it, which
     * is true of this source's pairs, and the next target gets the pair rather than inheriting a
     * hole.
     */
    const offered = sourceDevice === undefined ? undefined : supply[next]
    const usable =
      offered !== undefined &&
      compatibleJackSignals(offered.pitch.signal, into.pitch.signal) &&
      compatibleJackSignals(offered.gate.signal, into.gate.signal)
    const bundle = usable ? offered : undefined
    if (bundle !== undefined) next++

    targets.push({
      deviceId: device.id,
      deviceName: device.name,
      pitchJack: into.pitch.id,
      gateJack: into.gate.id,
      outcome:
        bundle !== undefined
          ? 'routed'
          : // Nothing offered a pair at all, or one was offered and this box cannot take it —
            // both are "nothing here can drive this". `source-exhausted` is reserved for the
            // supply running out, which is a different sentence to a reader.
            sourceDevice === undefined || offered !== undefined
              ? 'no-compatible-source'
              : 'source-exhausted',
      cables:
        bundle === undefined || sourceDevice === undefined
          ? []
          : [
              cable(sourceDevice, bundle.pitch, device, into.pitch),
              cable(sourceDevice, bundle.gate, device, into.gate),
            ],
    })
  }

  return {
    outcome:
      targets.length === 0
        ? 'no-target'
        : targets.some((t) => t.outcome === 'routed')
          ? 'routed'
          : 'no-compatible-pair',
    // Reported whenever the rig has one, targets or not: "this box would drive the rig and nothing
    // here takes pitch and gate" is a more useful thing to hand a renderer than silence.
    source:
      sourceDevice === undefined
        ? undefined
        : {
            deviceId: sourceDevice.id,
            deviceName: sourceDevice.name,
            basis:
              sourceDevice.id === clockSource?.deviceId
                ? 'clock-source'
                : sourceDevice.clock.preferredSource !== true
                  ? 'tie-break'
                  : claims > 1
                    ? 'contested'
                    : 'claimed',
            claims,
            candidates: supply.length,
            ranked: ranked.length,
          },
    targets,
  }
}


// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

/** What §8 renders for one part in one section. */
export type ResolvedSectionPattern = {
  section: SectionName
  /** Carries the band asked for and the band used, so §6.3's fallback is reported, not silent. */
  selection: PatternSelection
  /**
   * §7 step 8. Empty when the selection is 'none' — and empty is also correct when the device
   * simply had nothing to say about the slots this variant contains.
   */
  articulation: BoundArticulation[]
}

/**
 * Deliberately *not* the whole `Recipe`. §3.1: nothing downstream of the resolver sees an
 * `AuthoredParam`, and handing the renderer a `Recipe` would hand it `recipe.params` — authored
 * values with no provenance on them — one property access away from the resolved ones. Invariant
 * 4 is easier to keep when the unresolved form is simply not reachable.
 */
export type ResolvedRecipeRef = {
  id: RecipeId
  title: string
  /** The character actually authored, which for 'substituted' is not the one asked for. */
  character: Character
  outcome: 'exact' | 'substituted'
  /**
   * §12.4. How this recipe makes the notes. Resolved rather than optional — the renderer has to
   * tell the reader which of the two they got, and an optional field would leave it applying a
   * default it has no business knowing.
   */
  realisation: Realisation
  /**
   * §3/#101. What audio this recipe plays, when the voice does not make its own. Absent for
   * every recipe whose voice generates its own sound, and absent — honestly — for a sample
   * recipe nobody has authored it on yet.
   */
  sourceAudio?: ResolvedSourceAudio
  routing?: string
}

export type ResolvedAssignment = {
  requestId: RequestId
  role: Role
  /** The character asked for, after §6.2 resolved the template pinning against mood. */
  character: Character
  priority: number
  optional: boolean
  /**
   * §12.4. Simultaneous notes this part needs — the request's own count, defaulted to 1. Carried
   * because the guide cannot explain the realisation without it: "one sampled chord" is only
   * worth saying when there is more than one note in the chord.
   */
  notes: number
  /**
   * §4.2/§12.4/#40. The voices carrying this part, in the order the reader should enter them —
   * lowest note to the lowest voice. One for most parts; `notes` of them, all from one pool on
   * one device, for a chord stacked one note per voice.
   *
   * Plural even where it is one, so a renderer cannot print a third of a stacked part and look
   * finished. Both renderers branch on `length > 1`; nothing else needs to know.
   */
  assignables: readonly Assignable[]
  deviceId: DeviceId
  deviceName: string
  recipe: ResolvedRecipeRef
  /** §7 step 9. Every one carries provenance — the type makes it unskippable (§3.1). */
  params: ResolvedParam[]
  patch: ResolvedPatchEntry[]
  sections: SectionName[]
  /**
   * #100. The hook that **is** this part's rhythm, or `undefined` when nothing authored one for
   * its role.
   *
   * One authority per part. A hook states steps, lengths and pitches; a variant states steps of
   * its own, and the two disagreed on the page with nothing saying which to play — Drone Study's
   * `texture` was three sustained notes in phase 4 and seven retriggers in phase 5, against an
   * envelope with a 1.8 second attack. Where a hook resolved, it wins, and phase 5 points at it
   * rather than programming a second, contradictory pattern.
   *
   * **By hook existence, not by role group.** The obvious rule — the hook wins for tonal or
   * sustained roles — fixes neither reported case: `texture` is a `body` role and `bass-mid` a
   * `low` one, and neither is `tonal`. What both share is an authored hook, which is also the
   * only discriminator that needs no fifth shared vocabulary (invariant 3).
   *
   * Only a *resolved* hook takes authority. An unresolved one (§4.1's `unparsed-key` and
   * `unspellable-note`) has no notes to play, so deferring to it would leave the part with no
   * rhythm stated anywhere — invariant 5 in the other direction.
   *
   * Resolved rather than optional, for the same reason `recipe.realisation` is: both renderers
   * have to branch on it, and an optional field is one a renderer can forget to read.
   */
  /**
   * §4.1/#334. **Which note to place**, where the direction said so and the step grid keeps the
   * rhythm. Resolved against the song's key, so it transposes with everything else.
   *
   * Absent means the direction authored no pitch for this part — which stays honest rather than
   * defaulting to the tonic: right most of the time, invisible when wrong, and a musical
   * decision belongs in the template (§4.1), not in a fallback here.
   *
   * Independent of `hookAuthority`. A hook already carries notes, so a part with one needs
   * nothing from this; a part with neither is a part the guide cannot fully instruct, and
   * saying so is invariant 5.
   */
  pitch: { note: string; midi: number } | undefined
  hookAuthority: HookId | undefined
  /**
   * §4.3/§8. **The direction's answer to what this part's variants mean against its hook**, from
   * the request (`RoleRequest.reArticulatesHook`), which is where the musical fact is authored.
   *
   * Only meaningful together with `hookAuthority`: it says the variant places the strikes *inside*
   * the hook's held notes, so phase 5 may print both without printing a contradiction. Where it
   * is false — every part in the library but two — #100 stands unchanged and the grid is not
   * rendered at all.
   *
   * Carried on the assignment rather than left for a renderer to look up on `result.template`,
   * for the reason `hookAuthority` is: both renderers have to branch on it, and a fact one of
   * them derives for itself is a fact the two can come to disagree about.
   */
  reArticulatesHook: boolean
  /**
   * One entry per section this part occupies, in structure order.
   *
   * Kept, and unchanged, when `hookAuthority` is set: pattern selection is a pure function of
   * template and mood (§7 step 5) and the *band* it carries is still true — §8's arrangement
   * phase groups sections by it, and dropping it would leave a single-part template like Drone
   * Study with no energy map at all.
   *
   * Whether the **grid** is rendered for a deferred part is then decided by `reArticulatesHook`:
   * without it the grid would be a second rhythm competing with the hook and is not rendered
   * (#100); with it the grid is where the hook's held note is struck again, and printing it is
   * the only way the band reaches the part at all. Both renderers read the two fields together
   * before they touch this.
   */
  patterns: ResolvedSectionPattern[]
}

/**
 * Invariant 6, in full: *same inputs + same seed + **same resolver version** -> byte-identical
 * guide*. The version is the third term, and it exists because §8.2 permalinks carry inputs
 * only. A link made last month re-resolves under whatever engine is deployed today, so without
 * a stamp the drift is real and undetectable; with one it is real and *announced*.
 *
 * Bump this on any change that can alter resolved output — the objective, a tie-break, mood
 * arithmetic, pattern selection, harmony. Do not bump it for a renderer-only change: the
 * renderer decides nothing (§7 step 10), and a version that moves for reasons the guide's
 * content cannot see would cry drift at links that did not drift.
 *
 * **2** — #100. `hookAuthority` is a new resolver decision: where a hook resolved for a part's
 * role, that hook is the part's rhythm and phase 5 no longer programs a variant against it. No
 * *value* moved — the objective, the tie-breaks and every selection are byte-identical — but a
 * link shared before this renders a materially different guide after it, which is precisely the
 * drift the stamp exists to announce. The "renderer-only" exemption does not apply: the guide's
 * content can see this one.
 *
 * **3** — #40. A request of more than one note may now be filled by **stacking** several
 * monophonic voices of one pool, one note each, and `Score` gained a `stackedChords` key to rank
 * that below a voice that sounds the whole chord itself. This is a change to what the resolver
 * *decides*: a Tracker-Mini-only rig that was handed a chord sample for its pad is now handed
 * three tracks, and a rig that had an honest `polyphony` gap may now have a part. Values moved,
 * assignments moved, and a permalink shared before this would replay the old answer under a
 * stamp that claimed it was current.
 *
 * **5** — §4.3/§8. `reArticulatesHook` is the second half of #100. That change gave every hooked
 * part's rhythm to its hook, which was right where the two competed and wrong where the variant
 * was never a rhythm — a map of where a held note is struck again. A direction may now say which
 * of the two its variants are, and phase 5 prints the strikes for the parts that say so. No value
 * moved and no assignment moved; what moved is that on those parts the density knob now changes
 * what the guide tells a reader to play, where before it changed only a band label in the
 * arrangement phase. A permalink shared before this replays as a materially different guide, so
 * the stamp announces it — the same reading that bumped this to 2, for the same field.
 *
 * **6** — §2.3/#25. A device may declare a **global resource** its recipes consume, and the
 * resolver refuses an allocation that would exceed one. The Tracker Mini's three synth slots are
 * the first, so a rig containing that box can now be handed a *different* allocation for
 * identical permalink inputs: a fourth distinct synth patch that used to be assigned is now a
 * `no-room` shortfall naming the slots, and the parts that do land may sit on different voices
 * because the search reached a different optimum. Two things did **not** move, and stating them
 * is the point of the entry. `Score` is untouched — no key was added, none re-ordered — because
 * this excludes allocations rather than ranking them; and the suffix bound is untouched, because
 * it stays deliberately optimistic about resources and so remains admissible. A permalink shared
 * before this replays an allocation the box cannot hold, under a stamp that would have claimed it
 * was current, which is exactly the drift this constant announces.
 *
 * **#310 did not move it, and the reading is #161's.** A direction may now open at a mood, and
 * `ResolveInput.mood` became optional to let it. A link carrying a mood — which is every link
 * any build before #310 ever wrote — resolves byte for byte as it did, because an explicit mood
 * is used exactly as it was. What changed is that there is now an input state there was no way
 * to write down before, so the stamp that moves is `FORMAT_VERSION`. Asserted rather than
 * assumed, in `test/template-mood.test.ts`.
 *
 * It lives beside `ResolveInput` because that is the contract it versions. `permalink.ts`
 * stamps it; nothing in the resolver reads it, and nothing may branch on it — a resolver that
 * behaved differently per version would be two resolvers wearing one name.
 */
export const RESOLVER_VERSION = 6

/**
 * #161. The two decisions the user may take back off the direction: tempo and key. Both
 * absolute, both sticky, both `undefined` for "follow the direction" — which is not a default
 * standing in for a missing value but the state every guide was in before this existed.
 *
 * **This does not move `RESOLVER_VERSION`.** §7's rule is that the stamp tracks the engine: a
 * bump says a link's *own* inputs now resolve to different bytes. These widen the input set
 * instead. A link carrying neither override resolves exactly as it did — that is asserted, not
 * assumed (`test/pipeline.test.ts`) — and a link carrying one could not have been written by a
 * build that had no field to write it in. `FORMAT_VERSION` is the stamp that moves, because
 * what changed is which fields exist.
 */
export type SongOverrides = {
  /**
   * Absolute BPM. Used as given, including outside the template's range, which is reported
   * rather than blocked — see `bpm-outside-range`.
   */
  bpm?: number | undefined
  /**
   * Any key `parseKey` accepts, including one `template.keys` does not list. Hooks resolve
   * against it like any other key; an unreadable one is reported and the seed's pick stands.
   */
  key?: string | undefined
  /**
   * §7.4/#200. **The box the reader put in charge**, overriding §7.4's ranking.
   *
   * Here rather than in a UI state hook because it changes the guide: which box is named, which
   * setup is printed, and which boxes are told to run free. Invariant 6 says the same inputs
   * reproduce the same bytes, so a chosen clock source is an *input* — a shared link carries it
   * and reproduces the guide the sender saw.
   *
   * A device that cannot send clock is refused rather than obeyed: the ranking stands and
   * `ClockSource.chosen` stays false, so the guide never claims a box is the source when it has
   * no socket to be one. That case reaches here only from a stale link, since the rack offers
   * the choice on eligible panels alone.
   */
  clockSourceId?: DeviceId | undefined
  /**
   * §7.5/#340. **The boxes the reader moved parts onto**, overriding §7.1's ranking for those
   * requests and only those.
   *
   * Here for the same reason `clockSourceId` is: it changes the guide rather than the view, so
   * invariant 6 makes it an *input* — a shared link carries it and reproduces the guide the
   * sender saw. It is never an edit of a resolved guide, which is what §8.2 refused when it
   * refused to encode output into a permalink.
   *
   * A placement the rig cannot honour is refused rather than obeyed, and every refusal is
   * reported in `ResolveResult.placements` (§7.5). **Order is not information**: the resolver
   * sorts before it decides anything, so two links carrying the same set resolve byte for byte
   * alike.
   */
  placements?: readonly Placement[] | undefined
}

export type ResolveInput = {
  /** Effective devices: shared definition composed with the user's overlay (#16). */
  devices: readonly Device[]
  /** Effective template: base composed with inspiration patches (§5), done by the caller. */
  template: Template
  /**
   * #310. **The reader's mood, or `undefined` to open at the direction's** — the effective state
   * is `mood ?? moodState(template.mood)`, and a direction stating none of it opens neutral,
   * which is what every guide did before the field existed.
   *
   * **Total, never merged per axis.** A reader's mood replaces the direction's whole state
   * rather than layering over the axes they touched. The alternative — merge, and let an
   * untouched axis keep following the direction — reads well until a reroll or a direction
   * change has to decide which axes are the reader's, and answering that needs a per-axis
   * provenance flag beside a knob whose position is already on screen. The studio pays for
   * totality where the cost belongs: the first knob edit writes the whole effective state, so
   * what the reader sees is what they now own.
   *
   * `undefined` is a real state, not a missing one, exactly as #161's two overrides are.
   */
  mood?: MoodState | undefined
  seed: number
  /**
   * #161's fourth layer, applied on top of the effective template. Omitted or all-`undefined`
   * is the pre-#161 behaviour byte for byte.
   */
  overrides?: SongOverrides | undefined
}

/**
 * Where a song value came from (#161). `'template'` covers both "the direction's default" and
 * "the seed's pick from the direction's keys" — they are the same thing to a reader, and both
 * move on a reroll. `'user'` means they set it, and a reroll will not touch it.
 *
 * The renderers need this rather than deriving it: "a reroll may pick F minor" is *false* under
 * a user-set key, and a renderer comparing the key against `keys` cannot tell a user who chose
 * the key the seed would have picked from a seed that picked it.
 */
export type SongValueSource = 'template' | 'user'

/**
 * §7 step 10 / §4.1, and §8's opening phase. What the seed settled about the song itself,
 * before any of it reaches a device.
 */
export type ResolvedSong = {
  /**
   * The user's tempo where they set one, and `bpm.default` otherwise. Nothing in the design
   * gives the *seed* a tempo to pick, so it still does not — a reroll never moves this.
   */
  bpm: number
  /** #161. Whether the tempo above is the direction's or the user's. */
  bpmSource: SongValueSource
  /**
   * The key everything else resolved against. `undefined` only for a template authoring no
   * keys at all, which validation forbids and an effective template could still reach (§5) —
   * reported rather than guessed (invariant 5).
   */
  key: string | undefined
  /**
   * #161. Whether the key above is the user's. A key that could not be read leaves this
   * `'template'` — the seed's pick is what resolved, and saying otherwise would describe a guide
   * that was not rendered.
   */
  keySource: SongValueSource
  /** Every key the template offers, so the alternatives a reroll could reach are visible. */
  keys: readonly string[]
  /**
   * One entry per role the template authors a hook for, by role in UTF-16 code unit order
   * (§7.2). A role with no authored hook has no entry — §4.1's rule that the guide omits the
   * hook rather than inventing one — and whether the role was *assigned* is a separate question
   * the renderer answers from `assignments`.
   */
  hooks: HookChoice[]
  /**
   * #161. What the overrides did that their face value does not say: a tempo outside the
   * effective range, a key the direction does not offer, a key that could not be read. Empty
   * for a guide that set neither, which is every guide before #161.
   *
   * Beside the values rather than at the top of `ResolveResult` because they are statements
   * *about these two fields*, and typed as `InspirationDiagnostic` so the one findings display
   * (#158) can show them next to §5's without a second shape to reconcile.
   */
  diagnostics: readonly InspirationDiagnostic[]
}

/**
 * #161's findings, split by the value each one is about, so both §8 phase-1 renderers attach a
 * finding to the fact it qualifies rather than to a list at the bottom of the phase.
 *
 * Here rather than in either renderer for the reason `bandTrajectory` is in `lib/core`: the two
 * guides share no *ink*, but a derived fact written twice is a fact one of the copies can be
 * wrong about. Which value a diagnostic is about is engine knowledge — it follows from the kind
 * — so the engine says it once.
 */
export function songFindings(song: ResolvedSong): { bpm: string[]; key: string[] } {
  const bpm: string[] = []
  const key: string[] = []
  for (const finding of song.diagnostics) {
    if (finding.kind === 'bpm-outside-range') bpm.push(finding.detail)
    else if (finding.kind === 'key-not-offered' || finding.kind === 'key-unreadable') {
      key.push(finding.detail)
    }
  }
  return { bpm, key }
}

export type ResolveResult = {
  /** The effective template, passed through so §8 has structure, harmony and hooks to hand. */
  template: Template
  /**
   * The effective devices, passed through for the same reason the template is: §8's rig
   * integration phase needs clock, io and each device's `hints` table, and re-deriving that
   * from a separately held device list is how a guide comes to describe a rig it did not
   * resolve against.
   */
  devices: readonly Device[]
  /** §7 step 10. */
  song: ResolvedSong
  assignments: ResolvedAssignment[]
  /** §7.3. Unfilled requests, each tagged with what its absence means (#81). */
  shortfalls: Shortfall[]
  /**
   * §7.5/#340. What became of the reader's placements — the ones the search ran under, and the
   * ones it refused, each carrying the sentence that explains the refusal.
   *
   * Its own field rather than more `shortfalls`, because a refused placement is not usually a
   * missing part: the part is there, on the box the ranking picked. Empty lists for a guide that
   * placed nothing, which is every guide before #340.
   *
   * **Nothing renders this yet.** Phase 1 is the resolver and the permalink; the control that
   * shows it, and lets somebody make a placement without hand-editing a URL, is phase 2 (§7.5).
   * What the guide already shows is the *effect*: the part is named on the box it was placed on,
   * and anything displaced is an ordinary §7.3 shortfall.
   */
  placements: PlacementReport
  occupancy: Occupancy
  score: Score
  search: SearchReport
  /** `undefined` when nothing in the rig can send clock (§7.4). */
  clockSource: ClockSource | undefined
  /**
   * §3.3. The primary voice-control cables between boxes, with an outcome of its own rather than
   * a list that may be empty — see `InterDevicePatch`.
   *
   * Beside `clockSource` because they are the same kind of fact and answer to the same reader: the
   * rig's wiring, decided once here so §8 can render it and decide nothing.
   */
  interDevicePatch: InterDevicePatch
  /**
   * §7 step 5's output for **every** request, including the ones that became shortfalls. Pattern
   * selection depends only on template + mood, so it is meaningful whether or not the rig
   * could carry the part — and "we had a band-2 kick and nothing to play it on" is a more
   * useful gap than "no kick".
   */
  patterns: Map<RequestId, Map<SectionName, PatternSelection>>
}

// ---------------------------------------------------------------------------
// §7 The pipeline
// ---------------------------------------------------------------------------

/**
 * §7 step 10 with #161's fourth layer on top: base direction, then inspirations (§5, already
 * applied by the caller), then the user's tempo, then the user's key.
 *
 * The order matters in one direction only. Inspirations move the range and the default together
 * and leave `keys` untouched, so what the user's tempo is *compared against* is the shifted
 * range — which is why this reads `template.bpm` after composition rather than the base
 * direction's. Neither override feeds back into composition: they are read after it and change
 * nothing an inspiration decided.
 *
 * Nothing here is seeded. A tempo the user typed is not a thing to pick among, and a key they
 * chose replaces the pick rather than biasing it — so a reroll moves the key only where they
 * left it to the direction.
 */
function resolveSong(
  template: Template,
  seed: number,
  overrides: SongOverrides | undefined,
): {
  bpm: number
  bpmSource: SongValueSource
  key: string | undefined
  keySource: SongValueSource
  diagnostics: InspirationDiagnostic[]
} {
  const diagnostics: InspirationDiagnostic[] = []

  const bpm = overrides?.bpm ?? template.bpm.default
  if (overrides?.bpm !== undefined && (bpm < template.bpm.min || bpm > template.bpm.max)) {
    diagnostics.push({
      kind: 'bpm-outside-range',
      bpm,
      min: template.bpm.min,
      max: template.bpm.max,
      detail:
        `${String(bpm)} BPM is ${bpm < template.bpm.min ? 'below' : 'above'} the ` +
        `${String(template.bpm.min)}–${String(template.bpm.max)} '${template.name}' offers, and ` +
        `the patterns do not change with the tempo`,
    })
  }

  const bpmSource: SongValueSource = overrides?.bpm === undefined ? 'template' : 'user'
  const seeded = () => ({
    bpm,
    bpmSource,
    key: chooseKey(template.id, template.keys, seed),
    keySource: 'template' as const,
    diagnostics,
  })

  const wanted = overrides?.key
  if (wanted === undefined) return seeded()
  if (parseKey(wanted) === undefined) {
    diagnostics.push({
      kind: 'key-unreadable',
      key: wanted,
      detail: `'${wanted}' is not a key this build can read, so the direction's own key stands`,
    })
    return seeded()
  }
  if (!template.keys.includes(wanted)) {
    diagnostics.push({
      kind: 'key-not-offered',
      key: wanted,
      detail: `'${template.name}' does not offer ${wanted}, and the hooks were resolved in it`,
    })
  }
  return { bpm, bpmSource, key: wanted, keySource: 'user', diagnostics }
}

export function resolve(input: ResolveInput): ResolveResult {
  const { devices, template, seed } = input
  // #310. The one place the two mood layers meet, so nothing downstream sees anything but a
  // full `MoodState` — §6.1's arithmetic has no reading for an absent axis.
  const mood = input.mood ?? moodState(template.mood)
  const deviceById = new Map(devices.map((d) => [d.id, d]))
  const requestById = new Map(template.roles.map((r) => [r.id, r]))

  // Step 5. Before assignment, because a variant's length and slot mix are part of what a
  // recipe has to articulate — and independent of the rig, because this reads only template
  // and mood. Two users with different boxes and the same inputs get the same rhythms.
  const patterns = new Map<RequestId, Map<SectionName, PatternSelection>>()
  for (const request of template.roles) {
    patterns.set(request.id, selectPatterns(template, request, mood))
  }

  // Steps 2, 3, 4, 6 and 7.
  // §7.5/#340. Absent and empty are the same statement, so the pipeline does not have to know
  // which one a link wrote: `assign` takes the empty list down the path it took before #340.
  const allocation = assign({
    devices,
    template,
    mood,
    seed,
    placements: input.overrides?.placements ?? [],
  })

  // Step 10, hoisted above steps 8 and 9 because #100 made them depend on it: whether a part
  // defers to its hook is a fact about the *song*, and it has to be known before the part is
  // built. The key is still a function of template and seed alone, so a rig change never moves
  // it, and every pick here is salted per role rather than drawn from a stream — evaluation
  // order carries no information, so hoisting moves no byte (invariant 6).
  const song = resolveSong(template, seed, input.overrides)
  const key = song.key
  const hookRoles = [...new Set(template.hooks.map((h) => h.forRole))].sort(compareCodeUnits)
  const hooks =
    key === undefined
      ? []
      : hookRoles.flatMap((role) => chooseHook(template.hooks, role, key, seed) ?? [])

  // #100. Which roles have a hook that actually resolved to notes, and which hook it is. By
  // role, because that is what a hook is authored `forRole` — a template requesting one role
  // twice would point both parts at the one hook, which is already what phase 4 renders.
  const hookAuthorityByRole = new Map<Role, HookId>(
    hooks.flatMap((choice) =>
      choice.chosen.outcome === 'resolved' ? [[choice.forRole, choice.chosenId] as const] : [],
    ),
  )

  /**
   * §4.1/#334. A request's authored pitch, spelled for this song's key.
   *
   * `undefined` on three different absences, and they are all the same answer to a reader: the
   * direction authored none, the song has no key, or the degree cannot be spelled in it. The
   * last is the interesting one — it is invariant 5 again, and printing an unspellable note
   * would be worse than printing none.
   */
  const resolveRequestPitch = (
    request: RoleRequest,
    songKey: string | undefined,
  ): { note: string; midi: number } | undefined => {
    if (request.pitch === undefined || songKey === undefined) return undefined
    const resolved = resolvePitch(request.pitch, songKey)
    return resolved.outcome === 'resolved'
      ? { note: resolved.note, midi: resolved.midi }
      : undefined
  }

  // Steps 8 and 9.
  const assignments: ResolvedAssignment[] = allocation.assignments.map((a) => {
    const request = requestById.get(a.requestId) as RoleRequest
    const bySection = patterns.get(a.requestId)
    const sourceAudio = resolveSourceAudio(a.recipe)

    return {
      requestId: a.requestId,
      role: a.role,
      character: a.character,
      priority: request.priority,
      optional: request.optional === true,
      notes: request.polyphony ?? 1,
      assignables: a.assignables,
      deviceId: a.deviceId,
      deviceName: deviceById.get(a.deviceId)?.name ?? a.deviceId,
      recipe: {
        id: a.recipe.id,
        title: a.recipe.title,
        character: a.recipeCharacter,
        outcome: a.outcome,
        realisation: realisationOf(a.recipe),
        ...(sourceAudio === undefined ? {} : { sourceAudio }),
        ...(a.recipe.routing === undefined ? {} : { routing: a.recipe.routing }),
      },
      params: resolveParams(a.recipe, mood),
      patch: resolvePatch(a.recipe),
      sections: a.sections,
      pitch: resolveRequestPitch(request, key),
      hookAuthority: hookAuthorityByRole.get(a.role),
      reArticulatesHook: request.reArticulatesHook === true,
      patterns: a.sections.map((section) => {
        const selection: PatternSelection = bySection?.get(section) ?? {
          outcome: 'none',
          band: bandFor(template, section, mood),
        }
        return {
          section,
          selection,
          // A slot the variant does not contain is dropped silently (§7 step 8); a part with
          // no pattern at all has nothing to articulate against.
          articulation:
            selection.outcome === 'none' ? [] : bindArticulation(a.recipe, selection.pattern),
        }
      }),
    }
  })

  const clockSource = selectClockSource(devices, occupiedCounts(assignments), input.overrides?.clockSourceId)

  return {
    template,
    devices,
    song: {
      bpm: song.bpm,
      bpmSource: song.bpmSource,
      key,
      keySource: song.keySource,
      keys: template.keys,
      hooks,
      diagnostics: song.diagnostics,
    },
    assignments,
    shortfalls: allocation.shortfalls,
    placements: allocation.placements,
    occupancy: allocation.occupancy,
    score: allocation.score,
    search: allocation.search,
    clockSource,
    // §3.3. After the clock source, and reading it: the box already driving the rig is the first
    // ranking key, so this cannot be hoisted above the line that decides which box that is.
    interDevicePatch: routeVoiceControl(devices, assignments, clockSource),
    patterns,
  }
}
