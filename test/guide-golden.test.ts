import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { GUIDE_NAMES, TECHNO_GUIDE_NAMES, guidePath, guideText } from './golden/guides'

/**
 * §8's rendered output, pinned as bytes against the real device library.
 *
 * Invariant 6 says "same inputs + same seed + same resolver version → byte-identical guide, on
 * any platform" — *guide*, not resolver result. `resolve.golden.json` proves the first half of
 * that sentence; these files prove the half a reader actually holds, and a renderer regression
 * moves not one byte of the resolver golden.
 *
 * Regenerate with **`npm run gen:guides`**, then read the diff. Never regenerate to make a test
 * pass: the diff *is* the review, and it is the only place a lost provenance badge or a dropped
 * gap becomes visible before a person is standing at a machine holding the page.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(HERE, '..')
const TSX = join(REPO_ROOT, 'node_modules', '.bin', 'tsx')
const GENERATOR = join(HERE, 'golden', 'guides.ts')

// The same ICU trap `determinism.test.ts` uses: Node reads LANG/LC_ALL to pick its default
// locale, so a `localeCompare` that reached the renderer would answer differently under it.
const HOSTILE_LOCALE = 'tr_TR.UTF-8'

/** §8 phase 6's body: where rendered parameter values live, and nothing else does. */
function soundDesign(doc: string): string[] {
  const lines = doc.split('\n')
  const start = lines.findIndex((l) => l.startsWith('## 6. '))
  expect(start).toBeGreaterThan(-1)
  const rest = lines.slice(start + 1)
  const end = rest.findIndex((l) => l.startsWith('## '))
  return end === -1 ? rest : rest.slice(0, end)
}

describe('rendered guide fixtures (§8, invariant 6)', () => {
  for (const name of GUIDE_NAMES) {
    describe(name, () => {
      it('matches the committed bytes exactly', () => {
        expect(guideText(name)).toBe(readFileSync(guidePath(name), 'utf8'))
      })

      it('renders the same bytes twice in one process', () => {
        expect(guideText(name)).toBe(guideText(name))
      })

      it('is byte-identical under a non-C LANG', () => {
        const child = spawnSync(TSX, [GENERATOR, name], {
          encoding: 'utf8',
          cwd: REPO_ROOT,
          env: { ...process.env, LANG: HOSTILE_LOCALE, LC_ALL: HOSTILE_LOCALE },
        })
        expect(child.error).toBeUndefined()
        expect(child.status, child.stderr).toBe(0)
        expect(child.stdout).toBe(readFileSync(guidePath(name), 'utf8'))
      })
    })
  }

  it('covers a rig that fills most parts and one that cannot fill them', () => {
    // Not decoration: the two fixtures earn their place by disagreeing. If a later edit made
    // them similar, most of what the tr-1000 file exists to pin would stop being pinned.
    const full = guideText('full-rig')
    const one = guideText('tr-1000')
    // Counted from the Gaps section itself, not by scanning the whole document for a phrase:
    // §6.3's "no pattern authored for `pad` at any band" is a *pattern* hole, not a rig gap,
    // and it reads similarly enough to have quietly inflated this count.
    const gapsIn = (doc: string) => {
      const lines = doc.split('\n')
      const start = lines.findIndex((l) => l.startsWith('### Gaps'))
      if (start === -1) return 0
      const rest = lines.slice(start + 1)
      const end = rest.findIndex((l) => l.startsWith('## '))
      return (end === -1 ? rest : rest.slice(0, end)).filter((l) => l.startsWith('- `')).length
    }
    expect(gapsIn(one)).toBeGreaterThan(gapsIn(full))
    expect(full).toContain('Deluge')
    expect(one).not.toContain('Deluge')
  })

  it('summarises the arrangement as a band trajectory, at real six-section scale (§6.3)', () => {
    // The one fact this phase owns: which sections program identically. Six sections collapse
    // to three lines, which is three patterns to program instead of six — and it is only
    // visible at real scale, where two sections happen to share a band.
    //
    // Industrial Techno's three fixtures only: the section *names* are the template's, so a
    // fixture on another template would have to be excused from this assertion one line at a
    // time, and an assertion with an exception per fixture stops being one.
    for (const name of TECHNO_GUIDE_NAMES) {
      const doc = guideText(name)
      const arrangement = doc.slice(doc.indexOf('**Arrangement variations**'))
      expect(arrangement, name).toContain('- **band 0** — Intro, Outro')
      expect(arrangement, name).toContain('- **band 1** — Build, Breakdown')
      expect(arrangement, name).toContain('- **band 3** — Drop, Peak')
    }
  })

  it('pins all three shortfall states, which only a rig too small ever shows at once (§7.3)', () => {
    // #81. The three headings are the finding, not decoration: a limit of the boxes, a recipe
    // we have not written, and a part the direction is finished without are three different
    // things to do about it. One rig shows all three at once only because it is too small for
    // the direction, which is exactly why this fixture is the one that pins them.
    const one = guideText('tr-1000')

    expect(one).toContain('### Gaps')
    expect(one).toContain('This rig cannot make these parts.')
    expect(one).toContain('nothing in your rig plays this part')
    expect(one).toContain('no room')

    expect(one).toContain('### Waiting on us')
    expect(one).toContain('Nobody has written the recipe yet')

    expect(one).toContain('### Not needed for this direction')
    expect(one).toContain('Industrial Techno is finished without these.')

    // The one word all three used to collapse into. Its absence is the regression guard: a
    // renderer that went back to one undifferentiated list would print it again.
    expect(one).not.toContain('capable but unauthored')
  })

  it('renders nothing as derived, because the fixtures hold every knob centred (§6.1)', () => {
    // The guarantee `NEUTRAL_MOOD` makes: a centred knob changes nothing. This caught a real
    // bug — an authored `0.28 Sec` with no declared step was being rounded to `0` by a mood
    // that had moved it not at all, and the fixture is where it became visible.
    //
    // Scoped to the sound-design phase because the legend above it *illustrates* the derived
    // form (`52 → 45`) and must keep doing so; what must not appear is a rendered value in it.
    for (const name of GUIDE_NAMES) {
      const body = soundDesign(guideText(name))
      expect(body.filter((l) => l.includes('derived by')), name).toEqual([])
      expect(body.filter((l) => /`[^`]+ → [^`]+`/.test(l)), name).toEqual([])
    }
  })

  it('still renders every value it has, rather than passing by rendering nothing', () => {
    // The obvious way to make the test above pass by accident.
    //
    // Ten is a *scale* floor, and only the techno fixtures are at that scale: a rig of one box
    // carrying one part has five values to render and is not failing by having them. It gets its
    // own floor below rather than a weakened shared one, which would stop discriminating for the
    // three fixtures the number was chosen for.
    for (const name of TECHNO_GUIDE_NAMES) {
      const values = soundDesign(guideText(name)).filter((l) => l.startsWith('- **'))
      expect(values.length, name).toBeGreaterThan(10)
    }
    for (const name of ['deluge-drone-study', 'tracker-mini-drone-study'] as const) {
      const one = soundDesign(guideText(name)).filter((l) => l.startsWith('- **'))
      expect(one.length, name).toBeGreaterThan(0)
    }
  })

  it('pins sections that do not divide the pattern, which no techno fixture can (§6.3)', () => {
    // Drone Study runs 9, 15, 21, 33, 18, 24 and 12 bars against a 16-bar cycle, so phase 5 has
    // to say where each copy is cut and say why the arithmetic is untidy. Industrial Techno's
    // sections divide, so all three files above render only the easy case — this sentence and
    // this shape of section line appear in no other committed guide, which is the whole reason
    // this fixture is here.
    const doc = guideText('deluge-drone-study')
    expect(doc).toContain('**Not every section is a whole number of repeats, and that is')
    expect(doc).toContain('- **Tilt** · 21 bars — 1 copy of 16 bars, then one cut to 5 bars')
    expect(doc).toContain('- **Settle** · 9 bars — one copy cut to 9 bars')
    expect(doc).toContain('- **Vast** · 33 bars — 2 copies of 16 bars, then one cut to 1 bar')

    // True of the other Drone Study fixture too — same direction, same arithmetic — and false of
    // every techno one, whose sections divide.
    expect(guideText('tracker-mini-drone-study')).toContain(
      '- **Tilt** · 21 bars — 1 copy of 16 bars, then one cut to 5 bars',
    )
    for (const name of TECHNO_GUIDE_NAMES) {
      expect(guideText(name), name).not.toContain('Not every section is a whole number')
    }
  })

  it('pins one box that fills the direction, which is a pairing no other fixture has', () => {
    // Neither half is new on its own — `full-rig` also reaches §7.3's `None.`, and `tr-1000` is
    // also a single box being told there is nothing else to sync to. The *pairing* is: one box,
    // every request filled, no shortfall of any kind. `tr-1000` is the small rig that cannot
    // carry the direction; this is the small rig that can, and between them they are §7.3's two
    // answers at the same scale.
    const doc = guideText('deluge-drone-study')
    const filled = '### Gaps\n\nNone.'
    const oneBox = 'Nothing else is here to sync to it.'

    expect(doc).toContain('Deluge')
    expect(doc).toContain(filled)
    expect(doc).toContain(oneBox)
    expect(doc).not.toContain('This rig cannot make these parts.')
    expect(doc).not.toContain('### Waiting on us')
    expect(doc).not.toContain('nothing in your rig plays this part')

    // The pairing, not either half, is what would stop being pinned if this file were dropped.
    for (const name of TECHNO_GUIDE_NAMES) {
      const other = guideText(name)
      expect(other.includes(filled) && other.includes(oneBox), name).toBe(false)
    }
  })

  it('lets the hook stand as the whole of step programming (#100)', () => {
    // Where the hook carries its own rhythm the pointer still *replaces* the grid, and these two
    // are where that is pinned — three deferred parts each, none of them claiming its variants
    // re-articulate anything (§4.3).
    //
    // `tr-1000` is excluded and is not an exception being carved out: a drum machine carries no
    // tonal part, so nothing in that guide is hooked and there is no deferral to pin. It is
    // asserted the other way below.
    for (const name of ['full-rig', 'midi-clock'] as const) {
      const doc = guideText(name)
      expect(doc, name).toContain('**The hook is the pattern**')
      expect(doc, name).toContain('Nothing separate to program here.')
      expect(doc, name).not.toContain('where they are struck again')
    }
    // The one rig here with no hooked part at all: neither sentence, and every part keeps its grid.
    const drums = guideText('tr-1000')
    expect(drums).not.toContain('**The hook is the pattern**')
    expect(drums).not.toContain('where they are struck again')
  })

  it('lets the band reach a deferred part where the direction says it should (§4.3)', () => {
    // The shape that exists in these two files and nowhere else: a part whose hook owns the notes
    // and whose variant owns where they are struck again, so phase 5 carries a pointer *and* a
    // grid. Both Drone Study fixtures, because the sentence is the renderer's and the grid under
    // it is the direction's — a change to either shows here before it shows to a reader.
    for (const name of ['deluge-drone-study', 'tracker-mini-drone-study'] as const) {
      const doc = guideText(name)
      expect(doc, name).toContain('**The hook is the notes; the steps below are where they are')
      expect(doc, name).toContain('This map is 4 bars long and repeats inside the hook')
      // The grid itself, and the band it came from: the two things #100 dropped here.
      expect(doc, name).toContain('64 steps, band 3')
      expect(doc, name).toContain('- `accent` — 49 (vel 104)')
      // And never the sentence that replaces a grid — printing both would be the guide saying
      // there is nothing to program directly above the thing to program.
      expect(doc, name).not.toContain('Nothing separate to program here.')
    }
  })

  it('pins the envelope note beside the grid it is about, which one fixture does (§3)', () => {
    // `tm-texture-soft` fades in over 1.8 Sec and the band-3 map re-strikes faster than that.
    // The recipe says so rather than the template capping the band, and this is the only guide in
    // the directory carrying both halves — the note in phase 6 and the strikes in phase 5.
    //
    // **#155 moved the arithmetic between those two halves.** The note used to quote 1.8 Sec back
    // and leave the sum to the reader; phase 5 now states the tightest re-strike against the map
    // it sits under, and the note points at it. So this pins the *pair* rather than one sentence:
    // the value in phase 6, the derived interval in phase 5, and the note joining them.
    const doc = guideText('tracker-mini-drone-study')
    expect(doc).toContain('**ENVELOPE \u00b7 ATTACK** `1.8` Sec')
    expect(doc).toContain('set it to the tightest re-strike Step programming prints, or shorter')
    expect(doc).toContain('64 steps, band 3')
    // The half the note now points at, in committed bytes: 2 steps at 72 BPM against a 1.8 Sec
    // fade-in is the conflict #155 reported, and it is the guide that answers it now.
    expect(doc).toContain('- tightest re-strike — `0.42` Sec · derived from 2 steps at 72 BPM')

    // The Deluge renders the same direction and carries no such note, so the *note* is this
    // fixture's alone: dropping it would leave it pinned by no committed bytes at all. The
    // re-strike line is not — it is the renderer's, and it appears there too, because `texture`
    // re-articulates its hook whatever box is playing it.
    expect(guideText('deluge-drone-study')).not.toContain('is deliberate — repeats run together')
    expect(guideText('deluge-drone-study')).toContain('- tightest re-strike — ')

    // And the scope, in committed bytes: the techno fixtures have no re-articulating part, so
    // none of their drum maps carries a line. This is what keeps the #155 scope from widening
    // back out unnoticed — a fixture with no line in it is the only proof the gate is real.
    for (const name of TECHNO_GUIDE_NAMES) {
      expect(guideText(name), name).not.toContain('tightest re-strike')
    }
  })

  it('pins a flat key, so #32s enharmonic reading is covered by real bytes', () => {
    // Seed 18 resolves F minor. If a later change to the seeded pick moved the key, this fails
    // loudly rather than the fixtures quietly ceasing to cover the enharmonic at all.
    for (const name of TECHNO_GUIDE_NAMES) {
      const doc = guideText(name)
      expect(doc, name).toContain('**Key** F minor')
      expect(doc, name).toMatch(/`[A-G]b\d` \(`[A-G]#\d`\)/)
    }
  })

})
