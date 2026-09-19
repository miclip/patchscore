---
name: sample-authoring
description: Author or revise a sample target under lib/samples/ — the one-shot sounds a reader records on their own rig — and work on the generated reference one-shots in lib/audio/. Use when adding or changing a target's technique prose, deciding whether something is a target at all, or touching the synthesised WAVs.
---

# Authoring a sample target

A `SampleTarget` is one sound with no notes, no key and no tempo: a kick, a metallic hit, a
wobble, a vocal chop. It lives in `lib/samples/`, grouped in four files, and it resolves against
the reader's whole rig so the one-shot a guide asks for is **made rather than bought**.
`DESIGN.md` §3.8 is the specification and `lib/core/sample.ts`'s header argues the boundaries.

**A warning about this file.** The other three skills were written by someone who had just done
the work. This one is assembled from the record — #520/#525, #519/#527, the core docstrings and
the tests — because nobody has authored a target recently. Everything below is sourced, and the
sources are named so you can check them; but it has not been through a fresh pair of hands, and
the first person to author a target should expect to find something this file does not know.

---

## 1. The one boundary: what to record, never how to make it

This is the whole discipline, and it is what makes a target an authored thing rather than a
`(role, character)` pair the catalogue could have generated.

**The technique prose says what the take has to contain.** How long to record, what to keep of the
tail, where to trim, what note or tempo to write down, which second take is worth the minute.

**It never says how to synthesise the sound.** That is the resolved recipe's answer, with a manual
page behind every value. `kick` is the case that settles it: its winner across the catalogue is
`mpc-kick-hard`, which sets a distortion drive and mix, three compressor controls and a gain, all
cited. A target saying *nothing added, no compression* would be a second instruction contradicting
the first on the same page — and only one of the two carries a citation, so the reader has no way
to tell which to follow.

**The one exception**, and it is narrow: a defining gesture that survives any panel. `wobble-bass`
says to record *movement of whatever tone control the patch gives you*, because that is what makes
it a wobble rather than a bass note, and it names no control at all. If you cannot phrase the
gesture without naming a knob, it belongs to the recipe.

**A second take is always conditional** — on the box tuning, on the patch answering to how it is
struck, on the length being the reader's to set. Never "record a second take", always "record a
second take *if*".

---

## 2. Check it is a target at all

Three shapes look similar and are not.

| | what it is | why not this |
|---|---|---|
| `Riff` | a figure: notes in a key, at a tempo, for as long as the hook says | a one-shot has no key, no note to strike again, no tempo. Built as a riff the schema would demand a hook nobody plays. |
| kit slot (§3.6) | a *selection*: `kitRecipes` filters one device's recipes and orders them, resolving nothing | a target starts from a sound the reader wants and has to answer *which of my boxes makes it*, which is a search question |
| `SampleTarget` | one sound, resolved rig-wide | — |

The line between a riff and a target is **not** the role and **not** the grid: a riff may be a
pad with no grid, or a through-composed lead with none. What every riff has and no target does is
the figure itself.

---

## 3. The set is complete, so a new target needs an argument

There are 24 targets covering all 23 roles, and `test/sample-session.test.ts` fails if any role is
uncovered. That was a deliberate ruling: *a curated subset means somebody authors the omissions
and then defends them, and the omissions are the sounds nobody thought of.*

So adding a target is not choosing a nice sound. It is claiming that a role needs a **second**
technique, the way `bass-mid` carries both `bass-note` and `wobble-bass`. Say what the second one
records that the first does not.

Counts that move when you add one: `test/reference-download.test.ts` (the total, and its
eligible/ineligible split), `test/sample-page.test.ts` (the index lead prints both numbers), and
`test/site-metadata.test.ts`.

---

## 4. Substitution is disclosed, and that is a content decision

`character` is scored, and a substitution inside `MAX_SUBSTITUTION_DISTANCE_SQ` is allowed and
reported through `SampleVoicing.substituted`. The reason is in the docstring and is worth keeping
in mind while choosing a character: *a reader told to record a dirty stab and handed a clean patch
has been told something untrue about the file they are about to name.*

`sourceAudio` decides candidacy, so a sampler never masquerades as a sound generator — a box that
can only play a file back is not a box that can make one.

---

## 5. The generated one-shots are a different thing with harder rules

`lib/audio/reference.ts` synthesises fourteen reference one-shots (#519/#527) so a sampler-only
rig has somewhere to start. Touching it is not authoring a target, and the constraints are
unusual:

- **No committed bytes and no audio dependency.** The files are a pure function of one source
  file; `test/reference-samples.test.ts` hashes all fourteen, and `npm run samples:wav` writes
  them to a gitignored directory to listen to.
- **No platform maths.** `dsp.ts` implements `sin` and `2^x` as polynomials in the four arithmetic
  operators, because `Math.sin` is implementation-approximated and invariant 6 demands
  byte-identical output on *any* platform. A Node-only generator would pin a hash true on one
  engine. The series agree with `Math` to 6.6e-10 against a 16-bit LSB of 3.05e-5.
- **`DataView`, not `Buffer`**, in `wav.ts`: the bytes are heading for a browser.
- **Nobody here can hear them, so every sentence describing a sound is measured.** Band shares,
  spectral centroids, decay ratios. The claim that two hats *differ only in decay* is proved by
  dividing one file by the other, not inferred from two spectra — they are cut from one seeded
  burst of noise so that the division is meaningful.

That last rule is the one to carry into any sound work here: if a sentence describes what
something sounds like, either measure it or do not write it.

Two roles are deliberately absent: `vox-chop`, because a generator cannot make a voice, and the
eight tonal roles, because §3.8 serves anybody holding a synth better than a generated saw would.

---

## Done when

- The technique says what to record and nothing about how to make it, and any gesture it names
  survives a panel that has no such control.
- A new target says what it records that the existing one on that role does not.
- Every count that moves has moved, and `npm run verify` is green.
- Nothing in the prose names a device (invariant 3) or a file to go and find. The point of the
  whole section is that the reader is making one.
