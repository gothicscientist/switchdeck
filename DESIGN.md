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

## Quiz photos

The "What is it for?", "How should it connect?" and "Will you solder?" options show real photos cut out to a
transparent background (assets/quiz), not drawn icons: a PS5, a multitasking professional, a coiled USB cable, a
wireless receiver, a single MX switch and a soldering iron (kept to one simple object each, since the tiles are small). Where a crop cuts through the subject,
that edge fades out. Each photo is cropped tight and fills the option's art height (slightly enlarged into the tile's top
padding, so tile sizes never change), with a soft shadow, and lifts a little on hover. Every photo's source and
licence is recorded in assets/quiz/CREDITS.md: openly licensed Commons photos, or photos the site owner supplied.

## Results: share and swap

- Share copies a link; the only confirmation is the button's label lifting into "Copied". No modal, no share sheet.
- Swap is a quiet text action under each part's price. Alternatives open in place under that part, show only the change in price and match, and keep the panel open so several can be tried. Undo and Reset sit as text links under the total.
- Every part row uses one grid: slot label; name with the price on its line; specs with the price note on their line; store links with Swap on their line; then one line of quiet text extras (Sound test, More tests, Shuffle) only where they apply. Kit rows and missing parts fill the same cells. Sold out is a warn-coloured word beside the slot label, never a chip under the specs. Store chips never wrap inside; long store names truncate on narrow phones.
- Fit wording never overclaims: "Fits" appears only where store data confirms it. Unconfirmed alternatives carry no tag and rank lower. Price changes in the swap list are whole dollars. No budget line, fit line or explanatory subtitle on the results screen (Bharat removed them).

## Parts directory

- The heading stands alone: no listing counts, dates or price notes under it (Bharat removed them). Price terms and the affiliate disclosure live in the small note at the foot of the page.
- Controls in one quiet stack: a wide search with the sort beside it, text tabs for categories (no counts), then outlined filter chips. Clear filters only appears when something is set. On phones the filter chips fold behind a Filters button and the tabs scroll sideways.
- Results are open tiles, not shadowed cards: a photo tile, then text on the page. The whole tile opens details; store links and Add to build are text links under the price.
- Tile photos come from the builder catalog's checked crops (SwitchdeckBuilder.photo), with the tile painted in the photo's own backdrop colour so nothing looks boxed in. Listings without a checked photo show a drawn part. Raw retailer photos appear only in the details dialog.

## Build page

- The heading is the build's editable name, alone. No eyebrow above it; an example build gets one plain line under it.
- The preview is always the drawn build (case colour, keycaps, layout), never a store photo, so every change shows. There is no Photo toggle. It sits on one open stage with the colour swatches, the colour's name and the layout under the board.
- Parts are open rows on the page, split by hairlines: thumbnail, slot name, part name, specs as spaced plain words, then store links as text. Price sits on the right with Change and Remove as text actions under it. Kit parts share one "Included" row. An empty slot is a single row button with a plus.
- One summary rail, one surface split by hairlines: parts subtotal, compatibility, sound and feel scales (same hairlines as results, which only sweep when a change moves them), suggested mods, then copy actions.
- Compatibility is a list of one-line items with a status dot. No verdict banner and no grey sub-notes; the detail lives in each item's tooltip. Items never claim a fit the data doesn't confirm.
- The affiliate disclosure and price terms live in the page's footer note.

## Search and link previews

- Each view's title and description live in assets/view-meta.js; the deploy writes them into each staged page's head (scripts/stage-site.mjs). /saved is noindex. Titles name the page plainly, no slogans.
- The link preview (assets/og.png, 1200x630) is drawn from the site's own boards by scripts/og-image.mjs, in the stone palette with Host Grotesk. Rerun it after a palette or wordmark change rather than editing the PNG.
- Search and AI-assistant copy stays factual. /about ("How Thock works"), llms.txt and the sitemap are filled from the catalog manifest on every deploy, so figures never go stale. The about page questions live in scripts/seo-content.mjs.
- No visible SEO clutter in the app: the only additions are a quiet "How Thock works" link in the build and directory footers. Nav icons are real links so crawlers can follow them.
