import type { AssignableKey, Occupancy } from './occupancy'
import type { DeviceId, HookId, RecipeId, RequestId, SectionName } from './ids'
import type { Score } from './objective'
import type { Character, Role } from './vocabulary'
import { canFollow, compatibleJackSignals, realisationOf, sendTransports } from './device'
import type { Assignable, Device, JackSignalKind, JackSpec, Realisation } from './device'
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
  type MoodState,
  type PatternSelection,
  type ResolvedPatchEntry,
  type ResolvedSourceAudio,
} from './resolver'
import { assign, type SearchReport, type Shortfall } from './search'
import { chooseHook, chooseKey, type HookChoice } from './harmony'

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
export type ClockSourceBasis = 'claimed' | 'contested' | 'tie-break'

export function clockSourceBasis(source: ClockSource): ClockSourceBasis {
  if (source.claims === 0) return 'tie-break'
  return source.claims === 1 ? 'claimed' : 'contested'
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
): ClockSource | undefined {
  const capable = devices.filter((d) => d.clock.canSendClock)
  if (capable.length === 0) return undefined
  // #121. Counted over the *eligible* boxes, not over the rig: a manifest cannot claim the field
  // without `canSendClock` (the schema refuses it), so the two lists agree today — and counting
  // the eligible ones is what the sort below actually ranked, which is what the guide reports.
  const claims = capable.reduce((n, d) => n + Number(d.clock.preferredSource === true), 0)

  const ranked = [...capable].sort((a, b) => {
    const byPreferred = Number(b.clock.preferredSource === true) - Number(a.clock.preferredSource === true)
    if (byPreferred !== 0) return byPreferred
    const byTransport = transportRank(a) - transportRank(b)
    if (byTransport !== 0) return byTransport
    return compareCodeUnits(a.id, b.id)
  })

  const winner = ranked[0] as Device
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
    .filter((j) => j.direction === direction && j.signal.length === 1 && j.signal[0] === kind)
    .sort((a, b) => compareCodeUnits(a.id, b.id))
}

/** Every section on this box that declares both a note socket and a gate socket, section-ordered. */
function bundles(device: Device, direction: 'in' | 'out'): Bundle[] {
  const jacks = device.jacks ?? []
  const pitches = soleKind(jacks, direction, 'pitch-cv')
  const gates = soleKind(jacks, direction, 'gate')
  const sections = [...new Set(pitches.map((p) => jackSection(p.id)))].sort(compareCodeUnits)

  return sections.flatMap((section) => {
    const pitch = pitches.find((p) => jackSection(p.id) === section)
    const gate = gates.find((g) => jackSection(g.id) === section)
    return pitch === undefined || gate === undefined ? [] : [{ section, pitch, gate }]
  })
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
 * It lives beside `ResolveInput` because that is the contract it versions. `permalink.ts`
 * stamps it; nothing in the resolver reads it, and nothing may branch on it — a resolver that
 * behaved differently per version would be two resolvers wearing one name.
 */
export const RESOLVER_VERSION = 5

export type ResolveInput = {
  /** Effective devices: shared definition composed with the user's overlay (#16). */
  devices: readonly Device[]
  /** Effective template: base composed with inspiration patches (§5), done by the caller. */
  template: Template
  mood: MoodState
  seed: number
}

/**
 * §7 step 10 / §4.1, and §8's opening phase. What the seed settled about the song itself,
 * before any of it reaches a device.
 */
export type ResolvedSong = {
  /** `bpm.default`. Nothing in the design gives the seed a tempo to pick, so it does not. */
  bpm: number
  /**
   * The key everything else resolved against. `undefined` only for a template authoring no
   * keys at all, which validation forbids and an effective template could still reach (§5) —
   * reported rather than guessed (invariant 5).
   */
  key: string | undefined
  /** Every key the template offers, so the alternatives a reroll could reach are visible. */
  keys: readonly string[]
  /**
   * One entry per role the template authors a hook for, by role in UTF-16 code unit order
   * (§7.2). A role with no authored hook has no entry — §4.1's rule that the guide omits the
   * hook rather than inventing one — and whether the role was *assigned* is a separate question
   * the renderer answers from `assignments`.
   */
  hooks: HookChoice[]
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

export function resolve(input: ResolveInput): ResolveResult {
  const { devices, template, mood, seed } = input
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
  const allocation = assign({ devices, template, mood, seed })

  // Step 10, hoisted above steps 8 and 9 because #100 made them depend on it: whether a part
  // defers to its hook is a fact about the *song*, and it has to be known before the part is
  // built. The key is still a function of template and seed alone, so a rig change never moves
  // it, and every pick here is salted per role rather than drawn from a stream — evaluation
  // order carries no information, so hoisting moves no byte (invariant 6).
  const key = chooseKey(template.id, template.keys, seed)
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

  const clockSource = selectClockSource(devices, occupiedCounts(assignments))

  return {
    template,
    devices,
    song: { bpm: template.bpm.default, key, keys: template.keys, hooks },
    assignments,
    shortfalls: allocation.shortfalls,
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
