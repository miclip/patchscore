import type {
  Device,
  DeviceId,
  ResolveResult,
  ResolvedAssignment,
  ResolvedParam,
  ResolvedPatchEntry,
  ResolvedSourceAudio,
} from '@/lib/core'
import { citationSentence } from '@/lib/core'
import { contentNotice, dominantRangeCite, hoistedParams } from '@/lib/core'
import type { CapabilityEvidence, ContentNotice, ParamScope, ScopedParams } from '@/lib/core'
import { citeLines, citeText, count, hintText, isStacked, num, voicesLabel } from './format'
import { EvidenceMark, Instruction, ParamLine, ProvenanceMark, evidenceLines } from './instruction'

/**
 * §12.4, and an instruction rather than a note: the two realisations are two different things to
 * do at the box, and doing the wrong one produces the wrong number of sounds. A chord you load
 * is not a chord you play. Anything device-specific about the trade — which slot it spends,
 * which it does not — is the recipe's `routing` line, because this view knows nothing about any
 * box.
 *
 * Hand-written to match the Markdown renderer word for word. The two share no code path, so the
 * only thing keeping them in step is that someone wrote the same sentence twice on purpose.
 */
function realisationInstruction(a: ResolvedAssignment): string {
  if (a.notes <= 1) return ''
  const notes = count(a.notes, 'note')
  const n = num(a.notes)
  if (isStacked(a)) {
    return (
      `Polyphony — ${notes}, one on each of ${n} voices. Every voice takes these same settings: ` +
      `it is one sound played ${n} times over, not ${n} sounds, and a difference between them is ` +
      `a difference you will hear inside the chord. Which voice takes which note is in Hook.`
    )
  }
  if (a.recipe.realisation === 'sampled-chord') {
    return (
      `Polyphony — ${notes}, already inside the sample. Load the chord sample(s) onto this one ` +
      `voice rather than spreading the notes across ${n}. One sample covers its chord shape at ` +
      `any root; a different shape needs its own — see Hook.`
    )
  }
  return (
    `Polyphony — ${notes} sounding at once on this one voice. It needs a genuinely polyphonic ` +
    `voice, not ${n} separate ones.`
  )
}

/**
 * §3/#101. What to load, before any of the knobs below mean anything — the sibling of
 * `sourceLines` in `lib/core/render.ts`, and hand-written to match it the way
 * `realisationInstruction` above is.
 *
 * First in the part, ahead of routing and ahead of every parameter, because that is the order it
 * happens at the machine. The need is a plain line with **no provenance mark**: the choice of
 * recording is nobody's documented claim, and badging it provisional would read as an unchecked
 * guess where there is nothing to check. The procedure below it is the manual's and carries one.
 */
function Source({ source, owner }: { source: ResolvedSourceAudio; owner: Device | undefined }) {
  const hint = source.hint === undefined ? undefined : hintText(owner, source.hint)
  return (
    <>
      {source.prep === undefined ? (
        // Nothing documented to do, so the need itself takes the reserved hint column (#21).
        <Instruction {...(hint === undefined ? {} : { hint })}>
          <span className="quiet">Source — {source.need}</span>
        </Instruction>
      ) : (
        <>
          <p className="quiet">Source — {source.need}</p>
          <Instruction
            cites={citeLines(source.prep.provenance, undefined)}
            {...(hint === undefined ? {} : { hint })}
          >
            <span>{source.prep.text}</span>
            <ProvenanceMark provenance={source.prep.provenance} />
          </Instruction>
        </>
      )}
    </>
  )
}

function Patch({ entries }: { entries: readonly ResolvedPatchEntry[] }) {
  return (
    <ul className="patch">
      {entries.map((entry) => (
        <li key={`${entry.from}->${entry.to}`}>
          <Instruction
            cites={citeLines(entry.provenance, undefined)}
            {...(entry.note === undefined ? {} : { note: entry.note })}
          >
            <span className="mono">{entry.from}</span>
            <span className="arrow" aria-hidden="true">
              →
            </span>
            <span className="mono">{entry.to}</span>
            <ProvenanceMark provenance={entry.provenance} />
          </Instruction>
        </li>
      ))}
    </ul>
  )
}

/**
 * A recipe whose parameters all come off one manual page printed that page under every line.
 * The shared citation is stated once under the heading; a parameter citing a different page —
 * or one whose range is unverified, which is a different claim entirely — keeps its own.
 */
function Params({
  params,
  owner,
}: {
  params: readonly ResolvedParam[]
  owner: Device | undefined
}) {
  const hoisted = dominantRangeCite(params)
  return (
    <>
      {hoisted === undefined ? null : (
        <p className="quiet">Ranges cite {citeText(hoisted)}.</p>
      )}
      <div className="params">
        {params.map((param) => {
          const hint = param.hint === undefined ? undefined : hintText(owner, param.hint)
          return (
            <ParamLine
              key={param.name}
              param={param}
              {...(hint === undefined ? {} : { hint })}
              {...(hoisted === undefined ? {} : { hoisted })}
            />
          )
        })}
      </div>
    </>
  )
}

/**
 * §2.6/#111. **What this box plays, said once above its parts**, in this view's own words — the
 * sibling of `contentText`/`unsettledText` in `lib/core/render.ts`, hand-written to match them
 * the way `realisationInstruction` above is. `contentNotice` decides which state the box is in;
 * the sentences are each renderer's own, and `test/device-content.test.ts` asserts them in both.
 *
 * The unsettled state says four different things because #120's states are four different
 * findings: "nobody here has checked" is a lie about every one of them, since each is somebody
 * who did check. The mark beside the line says which state; this says what to do about it.
 *
 * A box that ships content nobody has listed is **not** one of those findings — it declares
 * `shipped-library` above, and gets the place to look rather than a doubt.
 *
 * All of them belong on the box rather than on the part. `Source — <need>` is true — it says what
 * the part needs — and what was never true is what a reader inferred from it in the silence
 * above: that the box ships nothing, so the file is theirs to go and find.
 */
function contentText(notice: ContentNotice): string {
  switch (notice.state) {
    case 'enumerable':
      return (
        `Ships ${notice.library}. The parts below name entries from it, so there is nothing ` +
        'here to go and find.'
      )
    case 'shipped-library':
      return (
        `Ships ${notice.library} — look in ${notice.location}. ${notice.reason}, so the ` +
        'Source line below says what the part needs rather than naming a file.'
      )
    case 'user-supplied':
      return (
        'You supply it. This box ships no factory content for these parts, so each Source ' +
        'line below names what to load.'
      )
    default:
      return unsettledText(notice.evidence)
  }
}

function unsettledText(evidence: CapabilityEvidence | undefined): string {
  if (evidence !== undefined && evidence !== false) {
    switch (evidence.kind) {
      case 'cited-against':
        return (
          'Not established — a document here answers against it, and the reading is below. ' +
          'A Source line says what a part needs, not that you have to supply it.'
        )
      case 'unread':
        return (
          'Not established — the document that would say is not in `manuals/`. A Source line ' +
          'below says what a part needs, not that you have to supply it.'
        )
      case 'unknown':
        return (
          'Not established — the manual was read and does not say. A Source line below says ' +
          'what a part needs, not that you have to supply it.'
        )
    }
  }
  return (
    'Not established. Nobody here has checked whether this box ships usable content, so a ' +
    'Source line below says what a part needs — not that you have to supply it.'
  )
}

function ContentBlock({ notice }: { notice: ContentNotice }) {
  return (
    <div className="callout">
      <p>
        <strong>Content</strong> — {contentText(notice)}{' '}
        {notice.evidence === undefined ? null : <EvidenceMark evidence={notice.evidence} />}
      </p>
      {/*
        Visible, not only in the mark's title attribute: a reader on a phone at the rack has no
        hover, and a printed guide has no attributes at all. `claim`, not `value` — what a box
        ships is a fact about the box and nobody dials it.
      */}
      {notice.evidence === undefined
        ? null
        : evidenceLines(notice.evidence, 'claim').map((cite) => (
            <p className="subordinate cite" key={cite}>
              {cite}
            </p>
          ))}
    </div>
  )
}

/**
 * #107's heading and its reason, hand-written to match the Markdown renderer word for word — the
 * same arrangement `realisationInstruction` above already lives under. The two renderers share no
 * code path by design (#33), so importing the sentence from `lib/core/render.ts` would make this
 * view a dependent of the Markdown guide rather than its sibling. `hoistedParams` decides *which*
 * settings belong to the device; the words are each renderer's own.
 *
 * `test/guide-view.test.ts` asserts both scopes' words in both renderers, because two copies of a
 * sentence is exactly the thing that drifts.
 */
function scopeHeading(scope: ParamScope): string {
  return scope === 'pattern' ? 'Pattern-wide' : 'Song-wide'
}

function scopeSentence(scope: ParamScope): string {
  return scope === 'pattern'
    ? 'One setting for the whole pattern — set it once, not once per part below.'
    : 'One setting for the whole song — set it once, not once per part below.'
}

/**
 * #107. The settings this device sets once, above the parts that used to repeat them.
 *
 * No shared-citation sentence over the block: a device-level line prints its own evidence in
 * full, so `hoisted` is deliberately not threaded in (§3.2).
 */
function ScopedBlock({ group, owner }: { group: ScopedParams; owner: Device | undefined }) {
  return (
    <div className="scoped">
      <h5>{scopeHeading(group.scope)}</h5>
      <p className="quiet">{scopeSentence(group.scope)}</p>
      <div className="params">
        {group.params.map((param) => {
          const hint = param.hint === undefined ? undefined : hintText(owner, param.hint)
          return (
            <ParamLine key={param.name} param={param} {...(hint === undefined ? {} : { hint })} />
          )
        })}
      </div>
    </div>
  )
}

/**
 * §8 phase 6. Parameter values, device by device in rig order, each carrying its provenance.
 *
 * A device carrying nothing has nothing to dial and is covered by rig integration above.
 */
/**
 * §8/#230/#107. **What a box's parts share**, split from what any one of them sets.
 *
 * Its Markdown sibling is `soundShared`, and the split has the same cause: the sequencer layout is
 * track-major, so rendering these per track repeats them once per track — and one of #107's own
 * lines reads *"set it once, not once per part"*, which under a six-track Deluge printed five
 * times is the guide contradicting itself in its own words.
 *
 * The phase layout renders it exactly where it always inlined it, so nothing there moves.
 */
export function SoundShared({
  device,
  content,
  hoist,
  deviceById,
}: {
  device: Device
  content: ReturnType<typeof contentNotice>
  hoist: ReturnType<typeof hoistedParams>
  deviceById: Map<DeviceId, Device>
}) {
  return (
    <>
      {/* The markdown renderer's own sentence, so the two cannot say different things. */}
      {citationSentence(device) === undefined ? null : (
        <p className="quiet">{citationSentence(device)}</p>
      )}

      {/* §2.6/#111, before the settings: whether there is anything to load is the box's
          question, and a cutoff on a box with nothing loaded is a setting with no subject. */}
      {content === undefined ? null : <ContentBlock notice={content} />}

      {/* #107, above the parts: the order it is done at the box — set the one control the
          pattern shares, then work through the voices. */}
      {hoist.groups.map((group) => (
        <ScopedBlock key={group.scope} group={group} owner={deviceById.get(device.id)} />
      ))}
    </>
  )
}

/**
 * §8/#230. **One part's own settings**, split from what its box shares (`SoundShared`).
 *
 * Its Markdown sibling is `soundForPart`. `hoist` is the set #107 lifted to the device, filtered
 * out here so a control serving every part is not printed again under each one.
 */
export function SoundForPart({
  a,
  hoist,
  deviceById,
}: {
  a: ResolvedAssignment
  hoist: ReturnType<typeof hoistedParams>
  deviceById: Map<DeviceId, Device>
}) {
  const owner: Device | undefined = deviceById.get(a.deviceId)
  const own = a.params.filter((p) => !hoist.names.has(p.name))
  return (
    <div className="recipe">
      <h5>
        <span>{voicesLabel(a)}</span>
        <span className="role mono">{a.role}</span>
        <span className="recipe-title">{a.recipe.title}</span>
      </h5>

      {realisationInstruction(a) === '' ? null : (
        <p className="quiet">{realisationInstruction(a)}</p>
      )}

      {a.recipe.sourceAudio === undefined ? null : (
        <Source source={a.recipe.sourceAudio} owner={owner} />
      )}

      {a.recipe.routing === undefined ? null : (
        <p className="quiet">Routing — {a.recipe.routing}</p>
      )}

      {a.params.length === 0 ? (
        <p className="quiet">No settings authored for this recipe.</p>
      ) : own.length === 0 ? (
        /* Every setting this recipe has is device-level. "No settings authored" would be false —
           they are authored, and they are above. */
        <p className="quiet">Nothing to set for this part alone; every setting it has is above.</p>
      ) : (
        <Params params={own} owner={owner} />
      )}

      {a.patch.length === 0 ? null : (
        <>
          <h6>Patch</h6>
          <Patch entries={a.patch} />
        </>
      )}
    </div>
  )
}

export function PhaseSound({
  result,
  deviceById,
}: {
  result: ResolveResult
  deviceById: Map<DeviceId, Device>
}) {
  if (result.assignments.length === 0) {
    return <p className="quiet">No parts assigned.</p>
  }

  const carrying = result.devices
    .map((device) => {
      const mine = result.assignments.filter((a) => a.deviceId === device.id)
      // Once per device, not once per part: #107's answer is a fact about the device, and
      // recomputing it inside the part loop would ask the same question five times.
      return {
        device,
        mine,
        hoist: hoistedParams(mine.map((a) => a.params)),
        content: contentNotice(
          device,
          mine.map((a) => a.recipe),
        ),
      }
    })
    .filter((entry) => entry.mine.length > 0)

  return (
    <>
      {carrying.map(({ device, mine, hoist, content }) => (
        <section className="device" key={device.id}>
          <h4>{device.name}</h4>
          <SoundShared device={device} content={content} hoist={hoist} deviceById={deviceById} />

          {mine.map((a) => (
            <SoundForPart key={a.requestId} a={a} hoist={hoist} deviceById={deviceById} />
          ))}
        </section>
      ))}
    </>
  )
}
