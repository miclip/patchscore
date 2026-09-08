/**
 * §3.3/#500. **The mark that says a line is a cable rather than a control.**
 *
 * A patch entry and a parameter sit in the same column and were drawn the same way: two
 * monospace names with an arrow between them, against a name and a value. Two different physical
 * actions — find two sockets and plug a lead between them, against find a control and set it —
 * reading as one kind of line.
 *
 * **It is the rack diagram's cable, shortened.** Same three strokes in the same order as
 * `components/rack/diagram.tsx` draws into the rig: a dark casing, an accent core over it, and a
 * plug at each end. A reader who picked their rig in the studio has already seen this object, so
 * the mark is recognition rather than a new symbol to learn.
 *
 * **The geometry carries it, not the colour.** Two plugs joined by a lead is a cable in monochrome
 * print and to a reader who cannot separate the accent from the text. `globals.css` says the same
 * of the rack cable — *"Colour is not load-bearing here, and it must not become so"* — and this
 * inherits that rule rather than restating it.
 *
 * **The arrow stays.** It carries direction, out to in, and this bar is symmetrical: it says what
 * kind of line this is and nothing about which end is which.
 *
 * `role="img"` with a label rather than a visually hidden span, so a screen reader announces the
 * line as a patch while `innerText` keeps saying exactly what the Markdown says (the kit page's
 * parity test reads that text, and a hidden word would be a difference between the two renderers
 * that neither is wrong about).
 */
export function CableMark() {
  return (
    <svg className="cable-mark" viewBox="0 0 24 10" role="img" aria-label="Patch" focusable="false">
      <path className="cable-mark-casing" d="M4 5 H20" />
      <path className="cable-mark-core" d="M4 5 H20" />
      <circle className="cable-mark-end" cx="4" cy="5" r="2.4" />
      <circle className="cable-mark-end" cx="20" cy="5" r="2.4" />
    </svg>
  )
}
