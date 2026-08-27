import type { Device } from '@/lib/core'
import { citeText } from '@/components/guide/format'
import { Panel } from './diagram'
import { RAIL_MM, soloPanel } from './model'

/**
 * #84. One device's panel, drawn on its own.
 *
 * The rack's own `Panel` and its own model build it, so a device page and a rig show the same
 * box: same jacks, same voice field, same silkscreen. What this adds is the `<svg>` around it,
 * because the rack's viewBox spans a whole rig and this one spans one panel plus its rail.
 *
 * §10: this is our drawing, made from dimensions cited to a manual. No vendor artwork is
 * extracted, embedded or traced, which matters more here than in the app, because these pages
 * are public.
 *
 * `idPrefix` is passed in rather than generated, so the markup is deterministic and testable.
 * SVG gradient ids are document-global and a page may hold more than one figure.
 */
export function PanelFigure({ device, idPrefix }: { device: Device; idPrefix: string }) {
  const panel = soloPanel(device)
  const width = panel.spanMm
  const height = panel.riseMm + RAIL_MM
  const titleId = `${idPrefix}-panel-title`
  const descId = `${idPrefix}-panel-desc`

  const drawn =
    panel.layout === undefined
      ? 'Nobody has drawn this panel yet, so the outline is generated from the sockets and voices the manifest declares.'
      : 'The controls are where the manifest says they sit.'
  const span =
    device.physical.verified === false
      ? `The ${width} mm panel span is provisional: nobody has checked it against a document.`
      : `The ${width} mm panel span is cited to ${citeText(device.physical.verified)}.`

  /**
   * §10/invariant 5. **The height is only a dimension when somebody measured it.**
   *
   * A drawn panel carries `panelRiseMm` from its own manifest, cited like any other value. A
   * panel nobody has drawn has no rise at all, and `soloPanel` gives it `PANEL_HEIGHT_MM` — a
   * *drawing convention*, the constant every panel would share if depth were not modelled, and
   * the model's own comment says so: "a panel's aspect ratio here is not the device's real
   * aspect ratio."
   *
   * Printing `222.3 × 170 mm` for such a box states a dimension pair the manual does not
   * contain, one half of it beside a genuine citation, which is the worst place to put an
   * invented number. So an undrawn panel reports its width and says what the height is.
   */
  const size =
    panel.layout === undefined
      ? `${width} mm wide. `
      : `${width} × ${panel.riseMm} mm. `
  const heightNote =
    panel.layout === undefined
      ? ' Its height here is the drawing convention every undrawn panel shares, not the depth of the box.'
      : ''

  return (
    <figure className="rack-figure panel-figure">
      <div className="rack-frame">
        <svg
          className="rack-svg"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-labelledby={`${titleId} ${descId}`}
        >
          <title id={titleId}>{`${device.name} front panel`}</title>
          <desc id={descId}>
            {panel.layout === undefined
              ? `Our own simplified outline of the ${device.name} front panel, ${width} mm wide. ${drawn}${heightNote} ${span}`
              : `Our own simplified drawing of the ${device.name} front panel, ${width} by ${panel.riseMm} mm. ${drawn} ${span}`}
          </desc>
          <defs>
            <linearGradient id={`${idPrefix}-anodized`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2a2e34" />
              <stop offset="45%" stopColor="#1c1f23" />
              <stop offset="100%" stopColor="#121417" />
            </linearGradient>
          </defs>
          <style>{`.rack-face { fill: url(#${idPrefix}-anodized); }`}</style>

          <Panel panel={panel} />
        </svg>
      </div>
      <figcaption className="panel-caption">
        {size}
        {span} {drawn}
        {heightNote}
      </figcaption>
    </figure>
  )
}
