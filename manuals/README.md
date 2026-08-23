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
| `MC-101_eng02_W.pdf` | Owner's Manual. Defers to a Reference Manual **not yet downloaded**. | [direct](https://static.roland.com/assets/media/pdf/MC-101_eng02_W.pdf) · [support](https://www.roland.com/global/support/by_product/mc-101/owners_manuals/) |
| ~~`Deluge-Guidebook-4p0-edits-only.pdf`~~ | **Excerpt — do not author from this.** 42pp / 53k chars / 7 ranges. Confirmed a partial: the real guidebook is 284pp. Kept only so nobody re-downloads it by mistake. | — |
| `Deluge-Guidebook-4p1-OLED.pdf` | **Official Guidebook, OS 4.1, OLED edition.** 390k chars, 75 ranges. The parameter source for the Deluge. | [direct](https://synthstrom-audible-deluge.s3.us-east-2.amazonaws.com/Deluge-Guidebook-4p1-OLED.pdf) |
| `Deluge-Guidebook-4p0.pdf` | Official Guidebook, OS 4.0, numeric display. 391k chars, 82 ranges. Kept for cases the OLED edition words differently. | [direct](https://synthstrom-audible-deluge.s3.us-east-2.amazonaws.com/Deluge-Guidebook-4p0.pdf) |
| `deluge-community/` | **Community firmware docs, pinned to `release_1_2_1` (Chopin).** 23 menu docs + 10 feature docs, 222k chars. See below. | [repo](https://github.com/SynthstromAudible/DelugeFirmware) |
| `Polyend-Tracker-Mini-Manual-2v2v1b.pdf` | Manual, 344pp. Appears complete. | polyend.com (downloads page blocks automated fetch) |
| `cascadia_manual_v1.1_2023.04.18.pdf` | Manual v1.1, 2023-04-18. | intellijel.com |
| `model-2400_om_e_vc.pdf` | Owner's Manual. | [docs](https://tascam.com/us/product/model_2400/docs) |
| `ZEBU_Manual_Rrev2_Web_ENG.pdf` | ZOIA Euroburo manual, rev2. | empresseffects.com |

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
| `MC-101_Reference_eng01_W.pdf` | Roland MC-101 | **The Reference Manual**, 260k chars. The Owner's Manual alone documents no ranges — same trap as the TR-1000 (#18). Note the capital `R` in the filename. |
| `MC-101_update_eng08_W.pdf` | Roland MC-101 | Later firmware features |
| `TR-8S_eng03_W.pdf` | Roland TR-8S | Owner's Manual. Refers to a Reference Manual **8 times** — do not author from this alone. |
| `TR-8S_Reference_eng01_W.pdf` | Roland TR-8S | The Reference Manual, 140k chars. Capital `R` again. |
| `metropolix_manual_v1.6_2025.09.24.pdf` | Intellijel Metropolix | 339k chars, v1.6 |
| `Zoom_LiveTrak_L-8_E_02.pdf` | Zoom LiveTrak L-8 | 91k chars, English edition |
| `Digitakt-II_User_Manual_ENG_OS1.15A.pdf` | Elektron Digitakt II | 292k chars |
| `Digitakt_User_Manual_ENG_OS1.51.pdf` | Elektron Digitakt | 242k chars, the original |
| `CRAVE_QSG_BE_0718-AAJ_WW.pdf` | Behringer Crave | Quick-start, **multilingual worldwide edition** — only a fraction of its 248k chars is English. Documents the patchbay properly (jack names, directions, internal normals) but is not a parameter reference, so expect cited jacks and provisional knob values. |

### Roland's split-manual pattern

Roland ships an Owner's Manual that names the controls and a separate Reference Manual that documents parameter ranges. **Authoring from the Owner's Manual alone produces a device whose values are entirely provisional and whose mood knobs are inert** — that is what happened to the TR-1000 before #23.

Filename casing is inconsistent between products: `TR-1000_reference_...` is lowercase, `MC-101_Reference_...` and `TR-8S_Reference_...` are capitalised. Roland returns **403, not 404**, for a filename that does not exist, so a wrong guess looks like a permissions problem rather than a typo.

## Known gaps

- **MC-101 Reference Manual** — the Owner's Manual points at one, and it is not here. Download it
  before authoring the MC-101, or its values will be as unverifiable as the TR-1000's were. See #18.
- ~~**Deluge guidebook**~~ — resolved. It was an excerpt; the full 284pp guidebook and the
  community firmware docs are both here now.

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
