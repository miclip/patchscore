/**
 * §10's signature element, deliberately not built yet. Build step 9 (#11) puts the selected
 * devices here as panels of realistic relative width and draws the resolver's output as patch
 * cables between them.
 *
 * A labelled hole rather than a half-rack: a sketch of the rack now would be the one
 * skeuomorphic surface in the design, built before the thing it is meant to visualise exists.
 */
export function RackPlaceholder() {
  return (
    <section className="panel span-2">
      <header>
        <h2>Rack</h2>
        <p className="note">Not built yet</p>
      </header>

      <div className="rack-placeholder">
        <span className="headline">Rack and patch cables — build step 9 (#11)</span>
        <span className="detail">
          Selected devices will appear here as panels of realistic relative width, with the
          resolver&rsquo;s signal and clock routing drawn as patch cables between them.
        </span>
      </div>
    </section>
  )
}
