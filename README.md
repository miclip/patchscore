# Patchscore

You own a synth or a drum machine. The manual tells you what every control does and nothing about
what to set it to; the videos assume experience you do not have yet. Patchscore takes the gear you
own and a musical direction and gives back a build guide: song structure, which voice plays which
part on which of your boxes, step patterns, sound design with real parameter values, and how to
cable and clock the rig.

**No LLM, anywhere.** The resolver is a pure function. The same rig, the same direction and the
same seed produce a byte-identical guide on any platform. Variety comes from combinatorics and
seeded selection.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run verify     # tsc --noEmit && vitest run, the gate
```

## Architecture

**Neither side ever names the other.** A template never mentions a device, a voice or a recipe; a
device never mentions a genre. What makes that possible is a closed, deliberately small shared
vocabulary: `Role`, `Character`, `MoodAxis` and `PatternSlot`. Nothing else crosses the
boundary. It is small on purpose, because every addition multiplies the authoring surface.

The payoff is that the two halves can be worked on at the same time. The templates and
inspirations in this repo were authored in a parallel git worktree while device work went on in
`main`, and nothing under `lib/devices/` was touched.

Adding a device is one folder under `lib/devices/`, then `npm run gen:registry`. Nothing outside
that folder is hand-edited, and `lib/devices/registry.generated.ts` is machine-written. CI runs
manifest validation and `npm run check:registry`, so a hand-edited or stale registry fails the
build rather than shipping.

[`DESIGN.md`](DESIGN.md) is the specification and the authority. Section references like `§7.1`
throughout the code point into it.

## Values and provenance

Every resolved value is either cited to a source or recorded as provisional. A citation is a
manual page, or an observation from the hardware with the firmware it was made on. Nothing is
presented as verified unless it is.

**Where you can see that is a device page**, which tells you how much of a box is checked: how many
of its values and ranges are cited, which documents they are cited to, and what it has not
established about its own clock, audio or voices.

**A guide gives you one line of it per box.** It is read standing at a machine with both hands
busy, where a page number beside a value is a line you step over on the way to the number — so
every instruction is the value, its unit and its range, and the documents behind them are named
once, above the box they belong to:

> *This block draws on the TR-6S Parameter Guide eng02, pp.7-10 and the TR-6S Owner's Manual
> eng02, p.17; its values are starting points.*

The honest limit: no page on this site prints the manual page behind one individual value. The
sentence tells you which book and roughly where; which page backs one number lives in the device's
source file, and the counts on the device page are what keep it from drifting.

The manuals themselves are gitignored. They are large, and redistributing vendor PDFs is not
ours to do. [`manuals/README.md`](manuals/README.md) is the tracked index: what each
document is, and where to fetch it.

## Found a wrong number?

That is the most useful thing you can report:
[report a wrong value](https://github.com/miclip/patchscore/issues/new?template=wrong-value.yml).
Bring the source, normally a manual and page. A correction can only be marked verified if it
carries one; without a source it goes in as provisional.
