/**
 * §3.3/#511. **The mark that says a line is a routing rather than a control.**
 *
 * `CableMark`'s sibling, and the same argument one layer in. #500 found a patch entry and a
 * parameter drawn identically — two different physical actions reading as one kind of line — and
 * #501 marked the cable. A modulation and a setting were still drawn alike: `ENV 2 → PITCH DEPTH
 * 13 (-50…50)` beside `EQ BASS AMOUNT 33`, same column, same shape, and only an arrow buried in a
 * name to tell a reader which of the two they turn and which they assign.
 *
 * **It is a signal arriving at a control, not a lead between two sockets.** A cable is symmetrical
 * — two plugs joined, and `CableMark` says only *this is a patch*. A modulation is not: something
 * upstream reaches a destination and moves it by an amount. So this is a wave running into a
 * ring: the source on the left as a shape that carries movement, the destination on the right as
 * the control it lands on. Nobody who has seen the cable will mistake one for the other, which is
 * the whole requirement — two marks that read alike would be worse than one mark and no second.
 *
 * **The geometry carries it, not the colour**, exactly as the cable's does. A wave meeting a ring
 * is the same object in monochrome print and to a reader who cannot separate the accent from the
 * text; `globals.css` says of the rack cable that *"Colour is not load-bearing here, and it must
 * not become so"*, and this inherits that rule rather than restating it.
 *
 * **`aria-hidden`, where `CableMark` carries `role="img"` and a label — and the difference is not
 * an oversight.** Both marks obey the same rule: `innerText` must say exactly what the Markdown
 * sibling says, or the parity test is comparing two documents that differ in words. The cable's
 * Markdown line carries no word at all, so its label is the only thing a screen reader has. This
 * line's does: §8's printed reader has no SVG, so `Modulation — ` has to be *ink* for them, and
 * once the word is real text on both sides a label here would announce it twice. Real text beats
 * an `aria-label` wherever it can be had, and here it can.
 */
export function ModulationMark() {
  return (
    <svg
      className="modulation-mark"
      viewBox="0 0 24 10"
      aria-hidden="true"
      focusable="false"
    >
      <path className="modulation-mark-wave" d="M2 5 Q5 1 8 5 T14 5" />
      <path className="modulation-mark-arrow" d="M14 5 H18" />
      <circle className="modulation-mark-target" cx="20" cy="5" r="2.4" />
    </svg>
  )
}
