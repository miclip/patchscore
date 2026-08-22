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
| `Deluge-Guidebook-4p0-edits-only.pdf` | Community guidebook, 42pp. **Suspect:** "edits-only" suggests a diff against a prior edition, not the whole book. | [product](https://synthstrom.com/product/deluge/) |
| `Polyend-Tracker-Mini-Manual-2v2v1b.pdf` | Manual, 344pp. Appears complete. | polyend.com (downloads page blocks automated fetch) |
| `cascadia_manual_v1.1_2023.04.18.pdf` | Manual v1.1, 2023-04-18. | intellijel.com |
| `model-2400_om_e_vc.pdf` | Owner's Manual. | [docs](https://tascam.com/us/product/model_2400/docs) |
| `ZEBU_Manual_Rrev2_Web_ENG.pdf` | ZOIA Euroburo manual, rev2. | empresseffects.com |

## Known gaps

- **MC-101 Reference Manual** — the Owner's Manual points at one, and it is not here. Download it
  before authoring the MC-101, or its values will be as unverifiable as the TR-1000's were. See #18.
- **Deluge guidebook** — confirm the 42-page "edits-only" file is the full reference before
  starting #5. That step exists to prove the engine needs no changes, and it cannot do that
  honestly on a partial document.

## Notes for whoever refreshes these

- Roland returns **403, not 404**, for a PDF that does not exist. A 403 means the filename or
  edition is wrong, not that access was denied.
- Direct PDF URLs carry the edition (`eng01`, `eng02`) and change when the document is revised.
  The support pages are stable; prefer them when a direct link stops resolving.
- Editions matter for citations: parameter ranges can change across firmware. The TR-1000
  Owner's Manual here is v1.11 while its Reference Manual is v1.13, so a citation should record
  which document and which edition it came from.
