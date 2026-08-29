# Manuals

Device manuals are the source of truth for every parameter value in `lib/devices/`. The
`verified` discipline (DESIGN.md §3.2, invariant 4) depends on them entirely: a value is either
cited to one of these documents or explicitly flagged provisional.

**The PDFs are not tracked.** `.gitignore` excludes `manuals/*` for size (~38MB) and because
redistributing vendor manuals is not ours to do. This file is the exception, and it exists so the
set can be reassembled from scratch — by a new clone, by CI, or by a Conclave seat working in its
own git worktree, which does not inherit ignored files.

If you are authoring or checking device values and `manuals/` is empty, fetch from the links
below before writing anything. Do not author from memory, and do not cite a document you have not
opened.

## Present

| File | Document | Source |
|---|---|---|
| `TR-1000_eng02_W.pdf` | Owner's Manual, v1.11+. Structure, I/O, clock. **No parameter ranges.** | [direct](https://static.roland.com/assets/media/pdf/TR-1000_eng02_W.pdf) · [support](https://www.roland.com/global/support/by_product/tr-1000/owners_manuals/) |
| `TR-1000_reference_eng02_W.pdf` | **Reference Manual, v1.13+.** Parameter tables with ranges. The one that matters for values. | [direct](https://static.roland.com/assets/media/pdf/TR-1000_reference_eng02_W.pdf) · [support](https://www.roland.com/global/support/by_product/tr-1000/owners_manuals/) |
| `TR1000_GEN_INST_List_eng02_W.pdf` | Preset GEN/INST list. ~1,700 generators with names and categories (`BD_E`, `SD_E`, `HIHAT_E`…). | Roland; exact URL unconfirmed — see [support](https://www.roland.com/global/support/by_product/tr-1000/owners_manuals/) |
| `MC-101_eng02_W.pdf` | Owner's Manual. Documents no parameter ranges; defers to the Reference Manual below, which is now here. | [direct](https://static.roland.com/assets/media/pdf/MC-101_eng02_W.pdf) · [support](https://www.roland.com/global/support/by_product/mc-101/owners_manuals/) |
| ~~`Deluge-Guidebook-4p0-edits-only.pdf`~~ | **Excerpt — do not author from this.** 42pp / 53k chars / 7 ranges. Confirmed a partial: the real guidebook is 284pp. Kept only so nobody re-downloads it by mistake. | — |
| `Deluge-Guidebook-4p1-OLED.pdf` | **Official Guidebook, OS 4.1, OLED edition.** 390k chars, 75 ranges. The parameter source for the Deluge. | [direct](https://synthstrom-audible-deluge.s3.us-east-2.amazonaws.com/Deluge-Guidebook-4p1-OLED.pdf) |
| `Deluge-Guidebook-4p0.pdf` | Official Guidebook, OS 4.0, numeric display. 391k chars, 82 ranges. Kept for cases the OLED edition words differently. | [direct](https://synthstrom-audible-deluge.s3.us-east-2.amazonaws.com/Deluge-Guidebook-4p0.pdf) |
| `deluge-community/` | **Community firmware docs, pinned to `release_1_2_1` (Chopin).** 23 menu docs + 10 feature docs, 222k chars. See below. | [repo](https://github.com/SynthstromAudible/DelugeFirmware) |
| `Polyend-Tracker-Mini-Manual-2v2v1b.pdf` | Manual, 344pp. Appears complete. | polyend.com (downloads page blocks automated fetch) |
| `cascadia_manual_v1.1_2023.04.18.pdf` | Manual v1.1, 2023-04-18. | [direct](https://intellijel.com/downloads/manuals/cascadia_manual_v1.1_2023.04.18.pdf), confirmed 2026-08-25 |
| `model-2400_om_e_vc.pdf` | Owner's Manual. | [docs](https://tascam.com/us/product/model_2400/docs) |
| `ZEBU_Manual_Rrev2_Web_ENG.pdf` | ZOIA Euroburo manual, rev2. | empresseffects.com |
| `Muse_Manual-1.4.0.pdf` | **Moog Muse**, 124pp / 196k chars / 18 ranges. Denser than the TR-1000 Reference, and the library's first 8-voice polysynth. | [direct](https://cdn.inmusicbrands.com/Moog/Muse/Muse_Manual-1.4.0.pdf), confirmed 2026-08-28 |
| `LABYRINTH-MANUAL_1.pdf` | **Moog Labyrinth**, 62pp / 68k chars / 1 range. Enum-dominated, as #184 predicts for this family. Note the space in the CDN filename — `LABYRINTH-MANUAL%201.pdf`, which is why guessing the path failed for a year. | [direct](https://cdn.inmusicbrands.com/Moog/Labyrinth/LABYRINTH-MANUAL%201.pdf), confirmed 2026-08-28 |
| `Messenger_Manual.pdf` | **Moog Messenger**, 38pp / 66k chars / 4 ranges. Fetched alongside the other two; not in any backlog yet. | [direct](https://cdn.inmusicbrands.com/Moog/Messenger/Messenger_Manual.pdf), confirmed 2026-08-28 |
| `Spectravox_Quickstart_Guide_v1.0.pdf` | **Do not author from this.** 2pp and **2 characters of extractable text** — an image-only PDF. Kept so nobody re-downloads it expecting a manual. See the note below. | [direct](https://cdn.inmusicbrands.com/Moog/Spectravox/Spectravox%20-%20Quickstart%20Guide%20-%20v1.0.pdf) |
| `SP-404MK2_v4_reference_eng02_W.pdf` | **Roland SP-404MKII Reference Manual, v4.00.** 274pp / 279k chars / **275 ranges** — Roland prints them bare (`0–127`, `40.0–200.0`, `1/4–7/4`) with an en dash and no unit, so a unit-bearing grep reports zero. | [direct](https://static.roland.com/assets/media/pdf/SP-404MK2_v4_reference_eng02_W.pdf), confirmed 2026-08-28 |
| `te-ep-133/` | **teenage engineering EP–133 K.O. II guide mirror**, 19 pages / 105k chars / 36 ranges. No PDF exists — see the TE note below. | [guide](https://teenage.engineering/guides/ep-133), mirrored 2026-08-28 |
| `te-ep-40/` | **teenage engineering EP–40 riddim guide mirror**, 19 pages / 107k chars / 39 ranges. No PDF exists. | [guide](https://teenage.engineering/guides/ep-40), mirrored 2026-08-28 |
| `MC-707_Reference_eng02_W.pdf` | **Roland MC-707 Reference Manual.** 121pp / 383k chars / **980 ranges** — the densest value source in the library. | [direct](https://static.roland.com/assets/media/pdf/MC-707_Reference_eng02_W.pdf), confirmed 2026-08-28 |
| `MC-707_eng02_W.pdf` | Owner's Manual, 12pp / 8 ranges. Roland's split-manual pattern again (#18) — thin by design; the Reference above is the value source. | [direct](https://static.roland.com/assets/media/pdf/MC-707_eng02_W.pdf), confirmed 2026-08-28 |
| `MicroFreak_Manual_4_0_3_EN.pdf` | **Arturia MicroFreak**, 137pp / 287k chars / 28 ranges. First Arturia. **Paraphonic**, said 45 times. | [direct](https://dl.arturia.net/products/microfreak/manual/microfreak_Manual_4_0_3_EN.pdf), confirmed 2026-08-28 |
| `circuit_tracks_user_guide_v3_en.pdf` | **Novation Circuit Tracks**, 109pp / 194k chars / 76 ranges. First Novation. Two 6-voice synth tracks, four drum tracks, **two MIDI tracks that drive other boxes**. | [direct](https://fael-downloads-prod.focusrite.com/customer/prod/downloads/circuit_tracks_user_guide_v3_en.pdf), confirmed 2026-08-28 |
| `torso-t1/` | **Torso T-1 documentation mirror**, 77 pages / 273k chars / 67 printed ranges. No PDF exists; see the note below and `torso-t1/VERSION`. | [docs](https://docs.torsoelectronics.com/t1/), mirrored 2026-08-28 |

## The Deluge runs community firmware

The user's Deluge is on **community firmware, not stock**. Author it that way. Community adds whole views and synth engines that do not exist on stock — Performance View, Automation View, the DX synth, the chord keyboard — so a guide written against stock would tell this user to use features their box does not have, and vice versa.

Three sources, and they do different jobs:

| Source | Answers | Cite as |
|---|---|---|
| `Deluge-Guidebook-4p1-OLED.pdf` | parameter ranges | `manual` |
| `deluge-community/` @ `release_1_2_1` | which features exist and how they are reached | `manual`, with the tag in the source string |
| the unit | anything community adds that nothing ranges | `observed`, with the firmware version |

The community docs are a **moving target**, unlike a PDF — `manuals/deluge-community/VERSION` records the tag and fetch date, and a citation to them must name the tag or it means nothing. Note also that the `menus/` docs are prose about what a parameter *does* and still carry `TODO` markers; they state no numeric ranges. That is exactly the gap `observed` citations exist for (§3.1).


## Added for the device queue

| File | Device | Notes |
|---|---|---|
| `MC-101_Reference_eng01_W.pdf` | Roland MC-101 | **The Reference Manual**, 260k chars. The Owner's Manual alone documents no ranges — same trap as the TR-1000 (#18). Note the capital `R` in the filename. [direct](https://static.roland.com/assets/media/pdf/MC-101_Reference_eng01_W.pdf), confirmed 2026-08-24. |
| `MC-101_update_eng08_W.pdf` | Roland MC-101 | Later firmware features |
| `TR-8S_eng03_W.pdf` | Roland TR-8S | Owner's Manual. Refers to a Reference Manual **8 times** — do not author from this alone. |
| `TR-8S_Reference_eng01_W.pdf` | Roland TR-8S | The Reference Manual, 140k chars. Capital `R` again. |
| `metropolix_manual_v1.6_2025.09.24.pdf` | Intellijel Metropolix | 205pp, 339k chars, v1.6. Printed folio = PDF page − 1. Front panel figure printed 17, OUTPUTS printed 18, INPUTS printed 19 — and the **silkscreen jack names exist only in the figure**, which `pdftotext` drops entirely; render printed 17 to read them. [direct](https://intellijel.com/downloads/manuals/metropolix_manual_v1.6_2025.09.24.pdf), confirmed 2026-08-25 |
| `Zoom_LiveTrak_L-8_E_02.pdf` | Zoom LiveTrak L-8 | 91k chars, English edition |
| `Digitakt-II_User_Manual_ENG_OS1.15A.pdf` | Elektron Digitakt II | 292k chars |
| `Digitakt_User_Manual_ENG_OS1.51.pdf` | Elektron Digitakt | 242k chars, the original |
| `CRAVE_QSG_BE_0718-AAJ_WW.pdf` | Behringer Crave | Quick-start, **multilingual worldwide edition** — only a fraction of its 275k chars is English. Documents the patchbay properly (jack names, directions, internal normals) but is not a parameter reference, so expect cited jacks and provisional knob values. The MusicTribe CDN link that was circulating now returns 500; the copy in use came from the [Internet Archive mirror](https://archive.org/download/Behringer_Crave_quick_start_guide/Behringer_Crave_quick_start_guide.pdf) (26pp). **Caveat:** that copy puts the patchbay list on PDF page 9, while this repo's Crave jacks cite p.21 and p.70 — the content matches, the pagination does not, so somebody should establish which edition the existing page numbers refer to before trusting them. |
| `minilogue_xd_OM_E9.pdf` | Korg minilogue xd | 68pp, and it covers **both** the keyboard and the `xd module` — one document, two devices, so every dimension line names which. Korg publishes **no separate Parameter Guide**, which is the TR-1000 trap and is *not* one here: the Owner's Manual carries 109 bracketed ranges and every front-panel sound knob has one, `[0...1023]` for the continuous controls. Specifications is p.66, not p.65: 4-voice, 500 x 300 x 85 mm for the keyboard and 500 x 179 x 85 mm for the module. The front-panel parameters run pp.17-26, with VOICE MODE on pp.17-18. |
| `Subsequent_37_Manual.pdf` | Moog Subsequent 37 | **The parameter source.** 63pp, 168k chars, from [Moog's CDN](https://cdn.inmusicbrands.com/Moog/Subsequent37/Subsequent_37_Manual_0.pdf). Printed folio equals PDF page index throughout, so a citation needs no offset. Two-note paraphonic, so it fails a triad — see #20. |
| `Minitaur_Manual.pdf` | Moog Minitaur | 19pp, from the same [Moog CDN path](https://cdn.inmusicbrands.com/Moog/Minitaur/Minitaur_Manual.pdf) as the Subsequent 37. **Specified in physical units rather than encoder counts** — cutoff `20Hz to 20KHz`, envelope stages `1 msec to 30 sec`, OSC 2 `± 12 Semitones` — which is more useful than a 0-1023 scale and rarer. Dimensions given in mm directly: 222.3 x 130.2 x 79.4. One trap: `RESONANCE: 0 to Self-Oscillation` is a named endpoint and not a number, the same shape as the CRAVE's `lo/mix 1 to hi/mix 2`. |
| `TR-6S_Manual_eng01_W.pdf` | Roland TR-6S | Owner's Manual, 39pp / 90k chars. [direct](https://static.roland.com/assets/media/pdf/TR-6S_Manual_eng01_W.pdf). **Note the `_Manual_` in the filename** — the TR-1000 and TR-8S owner's manuals are `TR-1000_eng02_W.pdf`, with no such segment, and guessing that shape here returns 403. **Documents no parameter ranges** — the Parameter Guide below is the value source, per Roland's split-manual pattern (#18). |
| `TR-6S_Manual_eng02_W.pdf` | Roland TR-6S | Edition 02 of the same, adding the system-update section. 41pp / 96k chars — the figures this table gave for `eng01` until they were re-measured. |
| `TR-6S_Parameter_eng02_W.pdf` | Roland TR-6S | **The Parameter Guide, and the value source.** 13pp / 48k chars of `Parameter` / `Value` / `Explanation` tables — the ranges the Owner's Manual does not carry. Roland titles it *Parameter Guide* and the filename says `_Parameter_`, not `_Reference_` as the TR-8S and MC-101 do nor lowercase `_reference_` as the TR-1000 does; the word is per-product. [direct](https://static.roland.com/assets/media/pdf/TR-6S_Parameter_eng02_W.pdf), confirmed 2026-08-26 — `eng01` returns 403 at the same path, so the edition is load-bearing. |
| `Mother_32_Users_Manual.pdf` | Moog Mother-32 | 73pp / 108k chars. [direct](https://cdn.inmusicbrands.com/Moog/Mother32/Mother_32_Users_Manual.pdf) |
| `DFAM_Manual.pdf` | Moog DFAM | 44pp / 58k chars. [direct](https://cdn.inmusicbrands.com/Moog/DFAM/DFAM_Manual.pdf) |
| `Matriarch_Manual_012023.pdf` | Moog Matriarch | 92pp / 143k chars. [direct](https://cdn.inmusicbrands.com/Moog/Matriarch/Matriarch_Manual_012023.pdf) |
| `Grandmother_Manual_Version_2.pdf` | Moog Grandmother | 56pp / 77k chars. [direct](https://cdn.inmusicbrands.com/Moog/Grandmother/Grandmother_Manual_Version_2.pdf) |
| `Subharmonicon_Manual.pdf` | Moog Subharmonicon | 58pp / 81k chars. [direct](https://cdn.inmusicbrands.com/Moog/Subharmonicon/Subharmonicon_Manual%20AMZ.pdf) — the source filename contains a URL-encoded space and a retailer suffix; saved here without either. |
| `Sub_37_Quickstart_Print.pdf` | Moog Subsequent 37 | **The panel drawing the manual does not have**, and the source of `panel.ts`'s geometry. A two-page poster from [Moog's CDN](https://cdn.inmusicbrands.com/Moog/Subsequent37/Sub_37_Quickstart_Print.pdf); its lower half is a flat, to-scale legend of the whole control surface. Also carries Moog's own acid recipe: *"Turn on Legato Glide, set Glide Type to EXP, and set the GLIDE TIME knob to 2."* The filename says `Sub_37` and the document says Subsequent 37 in its body, its panel artwork and its "Download the full Subsequent 37 Manual" footer — Moog reused the earlier filename. Cite it as **Subsequent 37 Quickstart Guide**. |

| `MPC_Live_III_MPC_XL_User_Guide_v3.7.pdf` | Akai MPC Live III, MPC XL | **One guide covers both boxes** — 535pp / 909k chars / 1,791 ranges, manual version v3.7, MPC 3 OS. Mirrored from [Kraft Music](https://files.kraftmusic.com/media/ownersmanual/Akai_Professional_MPC_XL_User_Guide.pdf), a retailer, because Akai's own downloads page is JS-rendered and its CDN returns 403 for every guessed path to this document. See the draft warning below before reaching for the Akai CDN copy. |
| `MPC_Standalone_OS_User_Guide_v3.9.pdf` | Akai MPC One G2 (and Key 37 G2, Live II, X) | 530pp / 933k chars. **The One G2 has no guide of its own** — it is documented here, 46 mentions against 1 for the XL, so this is the file for that box and the one above is not. [direct](https://cdn.inmusicbrands.com/Software/15JM26PSBC/MPC%20Standalone%20OS%20-%20User%20Guide%20-%20v3.9.pdf), confirmed 2026-08-27 |
| `OP-XY_full_guide_v1.1.15.pdf` | Teenage Engineering OP-XY | 135pp / 263k chars / 80 ranges, **full guide v1.1.15**. Searchable, and the right file — see the two-PDF trap below. [direct](https://assets.teenage.engineering/_img/6a452a3b31b95d1c6dbb44bb_original.pdf) via [guides](https://teenage.engineering/guides/op-xy), confirmed 2026-08-27 |
| `HAPAX_manual.pdf` | Squarp Hapax | Complete manual, 159pp / 171k chars / 18 ranges. The low range count is the shape of the device rather than a partial document — it is a sequencer, and the Metropolix reads the same way. [direct](https://squarp.net/static/HAPAX_manual-955ab84ef06fd2782cc0ee083550f72c.pdf), confirmed 2026-08-27. The filename carries a content hash that will change when Squarp revises it; the [manual page](https://squarp.net/hapax/manual/) is the stable link. |
| `HAPAX_QUICKSTART_EN.pdf` | Squarp Hapax | 16pp quickstart. Panel-shaped, so likely the source for a `panel.ts` the way the Subsequent 37's poster was. |

### Teenage engineering publishes two OP-XY PDFs, and a search finds the wrong one

The one to use is the **full guide**, v1.1.15, linked from
[teenage.engineering/guides/op-xy](https://teenage.engineering/guides/op-xy): 135pp, 599 embedded
fonts, 263k extractable characters, 80 ranges. It is searchable and entirely workable.

The other is the **printed guide**, `OP-XY_printed guide_v1.0.9-2` by its own title, an Adobe
Illustrator layout at `teenage.engineering/_img/673624c81db2feb0839f6e76_original.pdf`. It is what
a web search surfaces first. Two things are wrong with it: every glyph is converted to outlines,
so `pdffonts` reports **zero embedded fonts** and `pdftotext` extracts 114 characters from 114
pages — 114 form feeds and nothing else — and it is an **older version**, 1.0.9 against 1.1.15.

It was downloaded here first and written up as "the OP-XY manual has no text in it", which was
wrong about the device and right only about a print artifact nobody should author from. The check
that catches it costs nothing: `pdfinfo` prints the title, and this one says *printed guide* and
its version in plain words.

**One caveat on the good file.** Its Producer is `Adobe Acrobat 26 Paper Capture Plug-in`, which
is OCR — teenage engineering appears to have run recognition over the same outlined artwork to
give it a text layer. It reads cleanly in spot checks (`0-127`, `51-100`, control names at
plausible counts) and is fine for finding a page. For a *value*, prefer confirming the digits
against a rendered page, because a misread digit is exactly the failure that produces a wrong
number wearing a correct citation.

### Akai publishes a draft of the Live III guide on its own CDN

`https://cdn.inmusicbrands.com/akai/MPC%20Live%20III%20-%20User%20Guide%20-%203.6.pdf` resolves,
looks official, and its title page reads **"DRAFT DOCUMENT NOT FOR PUBLIC DISTRIBUTION"**. It is
manual version v3.6 and it covers the Live III alone. Do not cite it. The released v3.7 above
supersedes it, covers the XL as well, and carries no such marker. The draft is deliberately not
kept here — unlike the Deluge excerpt, it is trivially re-findable, so this note is the guard
instead of a 34 MB file.

**A grep trap in the same family:** `MPC Live II` is a substring of `MPC Live III`, so counting
mentions of the older box inside a Live III document returns the newer box's count and looks like
evidence of joint coverage. Match `MPC Live II([^I]|$)` or the answer is wrong.

### The Subsequent 37's "Patch Guide" is not a document

Moog's downloads page lists a **Subsequent 37 Patch Guide**, and issue #20 and the earlier note
above both took it for patch-level prose worth reading before authoring recipes. It is not. The
download behind that name is
[`All_Sounds_Subsequent_37_PD.zip`](https://cdn.inmusicbrands.com/Moog/Subsequent37/All_Sounds_Subsequent_37_PD.zip),
65 KB of **81 `.syx` preset dumps** — patch *data*, not patch *writing*. There is no PDF in it and
no prose anywhere. It is deliberately not in `manuals/`: nothing in it is citable under §3.1, since
a 756-byte SysEx blob states no range, names no page, and would have to be decoded against a byte
layout this manual never publishes.

The preset names are the only human-readable thing in the archive (`PD BoilerBass`, `PD Spaz duo`,
`PD SickSync`…), and they are not an option set either — the manual prints **no factory preset
list**, so there is nothing to cite them against.

What actually replaces it, for the "how do I make a sound" material recipes are: the **Quickstart
poster** above. It is the only Moog document for this instrument that names settings.

Two things about the manual worth knowing before authoring from it, both of which cost time here:

- **It has no top-down panel view.** p.2 is a three-quarter perspective illustration and pp.13-34
  carry nine isolated section drawings at two different scales. Butting them together produces
  proportions that are guesswork wearing a page number, which is why `panel.ts` cites the poster.
- **It contradicts itself in six places**, all recorded in the device folder rather than smoothed
  over: the p.61 Dimensions line prints a width that does not convert (26.375" vs 68 cm); the
  envelope minimum is 1 ms in the prose and `.1` ms on the silkscreen; SUSTAIN is 0-10 on the panel
  and "calibrated 1 to 10" in the prose; the LFO has three ranges by CC 76 and two by pp.22-23;
  `LFO KBTRACK` maxes at 100% on p.50 and 200% on p.52; and the NRPN `VALUE RANGE` column on p.58 is
  corrupted for a block of rows. **Do not use that NRPN column as an authority for anything** — the
  p.53-55 CC table is sound by contrast.

### Roland's split-manual pattern

Roland ships an Owner's Manual that names the controls and a separate Reference Manual that documents parameter ranges. **Authoring from the Owner's Manual alone produces a device whose values are entirely provisional and whose mood knobs are inert** — that is what happened to the TR-1000 before #23.

Filename casing is inconsistent between products: `TR-1000_reference_...` is lowercase, `MC-101_Reference_...` and `TR-8S_Reference_...` are capitalised. Roland returns **403, not 404**, for a filename that does not exist, so a wrong guess looks like a permissions problem rather than a typo.


- **Neither Moog nor Roland has a filename convention, so search rather than guess.** All five Moog
  semi-modulars live under `cdn.inmusicbrands.com/Moog/<Product>/` and every one names its file
  differently: a plain name, a date (`Matriarch_Manual_012023`), a version
  (`Grandmother_Manual_Version_2`), and a URL-encoded space with a retailer suffix
  (`Subharmonicon_Manual%20AMZ.pdf`). Roland's TR-6S breaks the shape its own TR-1000 and TR-8S
  share. Twelve guesses at these patterns produced one file; a web search produced the rest at
  once. Guessing is the slow way.

### Moog panel manuals print almost no ranges, and that is the answer to #184

Six devices carry 1,349 of the library's unverified ranges and eleven carry none. The question
#184 asked was whether the pages exist and were missed. **They do not exist.** Counted across the
whole of each PDF, printed numeric ranges for controls:

| manual | pages | printed ranges | per page |
|---|---|---|---|
| `Minitaur_Manual.pdf` | 19 | 10 | 0.53 |
| `cascadia_manual_v1.1_2023.04.18.pdf` | 110 | 12 | 0.11 |
| `Matriarch_Manual_012023.pdf` | 92 | 10 | 0.11 |
| `Mother_32_Users_Manual.pdf` | 73 | 6 | 0.08 |
| `DFAM_Manual.pdf` | 44 | 4 | 0.09 |
| `Grandmother_Manual_Version_2.pdf` | 56 | 3 | 0.05 |
| `Subharmonicon_Manual.pdf` | 58 | 3 | 0.05 |

The Minitaur is ten times the Grandmother's density, which is the whole explanation for its 11%
against their 85-88%.

**The few that are printed are already cited.** `CUTOFF` carries a citation on all five Moogs, as
do `LFO RATE`, `MODULATION RATE` and the oscillator `FREQUENCY` knobs where a range is given. The
authors found what there was to find.

What is left uncited is what the manuals describe in prose and never scale. Two checked by
rendering the page rather than grepping it:

- **Matriarch p.37** draws `CUTOFF AMT` as line art with tick marks and no numerals, and says only
  *"determines the maximum amount of modulation that will be applied to the Cutoff frequency of
  the Filter when the MOD wheel is at its maximum position"*.
- **DFAM `VCO 1/2 FREQUENCY`** appears twenty-one times in recipes and the manual's every mention
  is an instruction: *"Turn the VCO 1 FREQUENCY knob slowly to the left until you hear a nice,
  deep..."*.

The `SPECIFICATIONS` page of the Matriarch (p.90) is architectural — polyphony, patch-point
counts, dimensions, weight — and carries no control scales at all. It is not the parameter
appendix its name suggests, and neither are the others.

So a high unverified rate on these devices is the honest reading of a manual that documents by
description. It is invariant 5 working, not authoring left half-done, and re-auditing it will
return the same answer.

## Known gaps

- ~~**MC-101 Reference Manual**~~ — resolved 2026-08-24. It is here, and the direct URL above is
  confirmed working; Roland publishes it on the same `static.roland.com` path as the TR-1000 and
  TR-8S references, which the support page does not link to directly.
- ~~**Intellijel publishes no direct URL**~~ — wrong, resolved 2026-08-25. Both live under
  `https://intellijel.com/downloads/manuals/<filename>`, using exactly the filenames recorded
  above: [metropolix](https://intellijel.com/downloads/manuals/metropolix_manual_v1.6_2025.09.24.pdf)
  (200, 205pp, 339k chars — matches the count in the table) and
  [cascadia](https://intellijel.com/downloads/manuals/cascadia_manual_v1.1_2023.04.18.pdf) (200,
  8.5MB). The `/downloads/manuals/` segment is the load-bearing part; `/wp-content/uploads/…` and
  `/support/manuals/…` both return 404 as HTML.
- **polyend.com returns 403 to any automated request**, so the Tracker Mini manual has to be
  fetched by hand from a browser. This is not a nicety: #80 had to leave the Cascadia's
  `clock.preferredSource` undecided until its manual was supplied by hand, because a decision with
  no page behind it is exactly what that field exists to prevent.
- ~~**Torso T-1 publishes no PDF at all.**~~ **Resolved — mirrored to `torso-t1/`.** Still no PDF;
  the only ones are on scraper sites, which are not a citable source. So the docs are mirrored the
  way this note prescribed and `deluge-community/` already does: 77 English pages from the
  sitemap, `<article>` extracted verbatim by `curl`, pinned in `torso-t1/VERSION` and dated
  2026-08-28. Every file's first line carries the URL it came from, and a citation must name the
  fetch date or it means nothing, because the page can change under it.
  **Images are dropped**, so a value that exists only in a diagram is not in the mirror — check
  the live page before concluding the docs are silent, the same rule that applies to a dimension
  callout inside a PDF drawing.
- ~~**Moog Labyrinth**~~ — **resolved 2026-08-28.** It was on the usual CDN all along; the path has a
  **space in the filename**, `LABYRINTH-MANUAL%201.pdf`, which no amount of guessing the
  `<Product>_Manual.pdf` pattern was going to find. Searching the manufacturer's own domain found
  it in one call. Worth remembering before recording the next device as blocked: "no CDN path
  found" may mean the path is not guessable rather than not there.
- **Moog Spectravox** — still blocked, and for a sharper reason than before. The CDN has exactly
  one Spectravox document, `Spectravox - Quickstart Guide - v1.0.pdf`, and it is **2 pages with 2
  characters of extractable text** — an image with no text layer, useless as a source and only a
  quickstart in any case. Six candidate paths for a full user guide all 404, and the downloads
  page exposes no direct links. Not workable until a real manual is in hand.
- ~~**Deluge guidebook**~~ — resolved. It was an excerpt; the full 284pp guidebook and the
  community firmware docs are both here now.

### A text mirror is not evidence a document is silent

`CLAUDE.md` says `pdftotext` is not evidence a manual says nothing, because it extracts nothing
from a callout inside a drawing. **The same rule applies to the mirrors here, and harder.** They
carry the text of a page and none of its images, so anything a maker documents in a figure — a
panel layout, a control roster, a labelled diagram — is simply absent, with no gap where it was.

This has already cost something. An earlier draft of `te-ep-133` shipped **no panel at all** and
recorded two control rosters as unrecoverable, reasoning that a mirror with no images meant no
figure existed. teenage engineering publish a complete, unobstructed, fully-labelled vector front
view, linked from the very page the mirror was taken from:

    assets.teenage.engineering/_img/69787b2c965bf01b27d19664_opt.svg

440 x 511, 68 paths, no raster and no perspective — a better source than most PDFs here, and the
mirror gave no sign of it. Recovering it produced the panel, the twelve fader assignments guide
9.4 calls "printed above the pads" without ever listing them, and an orientation fix: the
published `240 mm x 176 mm x 16 mm` says nothing about which figure is the span, and the drawing's
own aspect settles it to 0.013%.

**So before recording anything as absent from a mirrored guide:** open the live page, and look for
linked image assets. A vector asset is worth more than the text was.

### teenage engineering publishes guides, not manuals

The OP-XY was the exception here, not the rule: it has a PDF, and an OCR'd one at that. **EP–133
K.O. II and EP–40 riddim have no PDF at all** — the downloads page offers a browser update utility
and links to web guides, and nothing else. Same answer as the T-1, and the same shape
`deluge-community/` set: mirror the pages, pin the date, cite the date.

Their guides are **server-rendered**, so `curl` gets the real text and no model sits between the
page and the file. 19 pages each, `<main>` extracted verbatim, first line of every file carrying
its source URL.

Both are worth noting as *sampler* shapes rather than synths, and the EP–40's library is genre-bound
(reggae, dub, dancehall) in a way nothing else here is — which is a content question before it is a
modelling one.

## Notes for whoever refreshes these

- **A file named like a manual may be an excerpt.** The Deluge "guidebook" here was 42pp of a
  284pp book and would have produced a device authored from a fraction of its documentation.
  Cheap check before trusting one: `pdftotext` it and compare character count and range-expression
  count against a manual you trust. The TR-1000 Reference Manual is 203k chars / 313 ranges; the
  Deluge excerpt was 53k / 7.
- Roland returns **403, not 404**, for a PDF that does not exist. A 403 means the filename or
  edition is wrong, not that access was denied.
- Direct PDF URLs carry the edition (`eng01`, `eng02`) and change when the document is revised.
  The support pages are stable; prefer them when a direct link stops resolving.
- Editions matter for citations: parameter ranges can change across firmware. The TR-1000
  Owner's Manual here is v1.11 while its Reference Manual is v1.13, so a citation should record
  which document and which edition it came from.
