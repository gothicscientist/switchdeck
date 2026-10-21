# Thock design notes

Read this before a design pass so each pass starts from the same decisions.

## Brief

A custom mechanical keyboard builder modelled on shapefinder.cc's look, flow and motion: a calm floating field of boards, one question at a time, then a build you can buy part by part. The bar is premium, Apple-level polish. Nothing should read as a generic template. Take no source, logo, copy or branding from shapefinder.

## Principles

- The products are the colour. Keyboards, keycaps and switch stems carry all the colour on the page, so the interface stays in stone and ink.
- One memorable moment: the floating field of boards on the finder. Everything around it stays quiet.
- Motion answers the person: boards drift in once on load, the field reshuffles after an answer, and results animate when a build is picked. Nothing loops for decoration. Respect reduced motion.
- Bharat iterates on sizes a lot, so change one thing at a time.

## Colour

| Token | Hex | Use |
| --- | --- | --- |
| `--bg` | `#F5F5F4` | Page |
| `--surface` | `#FFFFFF` | Cards, modals |
| `--ink` | `#292524` | Text, form controls (`accent-color`) |
| `--dark` / `--accent` | `#44403C` | Primary buttons, slider fills, focus rings |
| `--muted` / `--faint` | `#78716C` / `#A8A29E` | Secondary text |
| `--line` | `#E7E5E4` | Hairlines |
| `--ok` `--warn` `--fail` `--info` | `#2A8A4E` `#B7791F` `#C2443A` `#3D6FB6` | Status, match tones |

There is no brand blue. Status colours are muted so they sit next to product photos without competing.

## Type

- Host Grotesk (Google Fonts, 400 to 800) for everything: UI, headings, prices and the drawn keycap legends. It keeps Inter's neutral, legible shape with a little more character in the curves and terminals.
- Prices and counts use tabular figures. Monospace only appears where the text is literally code (the build code box).
- Sentence case everywhere. No all-caps labels and no eyebrow labels above headings.

## Things we removed and don't bring back

- Tailwind-default blue accents and native blue checkboxes or sliders.
- All-caps tracked labels ("CASE OR KIT", "THE PARTS DIRECTORY").
- Meta strings joined with middle dots ("75% · kit"). Use commas in plain language, or separate elements with spacing.
- Marketing slogans as headings ("Find your next piece."). Name the page plainly.
- Decorative carousels, segmented meters and glow effects in the results view. The sound and feel scales are hairlines. Match, sound and feel sit in one open row split by hairline dividers, with Match set larger; no tiles behind them.

## Image rule

Every part image is a clean, front-on product photo cropped to its frame (keyboards top-down) or a drawn icon. Nothing overflows its frame. See `scripts/image-check.mjs`.

## Results: share and swap

- Share copies a link; the only confirmation is the button's label lifting into "Copied". No modal, no share sheet.
- Swap is a quiet text action under each part's price. Alternatives open in place under that part, show only the change in price and match, and keep the panel open so several can be tried. Undo and Reset sit as text links under the total.
- Fit wording never overclaims: "Fits" appears only where store data confirms it, anything unverified says "Check fit", and the build line says "No fit issues found in the store listings", never "compatible".
