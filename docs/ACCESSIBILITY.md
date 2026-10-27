# Accessibility pass (T24)

Target from PRD §6: Lighthouse accessibility ≥ 90 on the main workspace page.

## Lighthouse

Lighthouse 13.5.0, accessibility category only, production build (`npm run build && npx next start`), Chrome headless, mock mode, run 2026-10-27.

| Page | Mobile | Desktop |
| --- | --- | --- |
| `/workspace` | 100 | 100 |
| `/history` | 100 | 100 |
| `/` | 100 | 100 |

The first run scored `/workspace` at 97. Its one failure was `aria-hidden-focus`: xterm's hidden helper textarea could take focus inside the `aria-hidden` terminal. It is now removed from the tab order. Screen readers read the visually hidden `role="log"` mirror instead.

These scores are for the empty workspace, because no demo scenarios exist yet (T05 and T07). Re-run once sc_01–sc_05 land:

```bash
cd web && npm run build && npx next start -p 3123
npx lighthouse http://localhost:3123/workspace --only-categories=accessibility --view
```

## Manual checks

Checked in Chrome with the test-fixture scenarios staged locally:

| Check | How it is met |
| --- | --- |
| Keyboard reachable | Skip link to `#main`. Every control is a native button, link, select or input. The workspace tabs (below 1024px) use roving focus with ← → Home End. |
| Visible focus | 3px ring in the accent colour on every interactive element, including the file input (shown on the dropzone) and code toggles. |
| Labels on inputs | Dataset select, question box and file input all have `<label>`s. Number buttons in the summary have `aria-label="<n>, show source"`. |
| Colour never the only signal | Step status, verified badge, data issues, upload state, terminal errors and the highlighted source all carry an icon and/or text ("Done", "Retrying", "Issue:", "Error:", "Source"). |
| Charts | Each chart is `role="img"` with a label and has a "View chart data" table. The colourway passed the colour-blind separation check in light and dark. |
| Live updates | Query status, upload status, run output log and the selected-source message are `aria-live="polite"`. |
| Reduced motion | Spinners and the skeleton stop animating under `prefers-reduced-motion`. Scrolling to a source is instant. |
| Dark mode | Class strategy with its own tokens (not an automatic invert), applied before first paint, toggle has `aria-pressed`. |
| Small screens | At 390px the panels become tabs with no horizontal page scroll. |

Not yet checked: a full screen-reader pass with NVDA. Do this before Pre-Demo Day.
