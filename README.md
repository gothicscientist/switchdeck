# Thock

**A PC-parts-picker for custom mechanical keyboards, built on real, daily-updated store data.**

**Live: [thock.cc](https://thock.cc)**

Custom keyboards are a maze: cases, PCBs, plates, switches, stabilizers and keycaps all come from different stores, and not every part fits every other. Thock walks you through a short quiz (size, feel, sound, look, budget), then assembles complete builds from parts that are actually for sale, with real prices and links.

## What it does

- **Finder.** Eight questions turn into ranked, personalized builds. A scoring engine rates every switch and keycap set in the catalog against your answers and penalizes repeats, so two people with different tastes get different boards.
- **Builder.** Pick parts yourself. Switch families (MX, magnetic, low-profile, optical) and PCB/plate pairings are checked, and anything unconfirmed is flagged as "check" instead of being guessed.
- **Swap and mod.** Swap any part in a result and watch the score update, with undo. Up to three suggested mods (foam, films, lube) are added within your remaining budget.
- **Sound.** Four quiz sound clips, plus a link to a real sound test for each switch.
- **Share and save.** Builds save in the browser and copy as a short link (`thock.cc/?b=…`) that restores the exact build.
- **Directory.** Browse every listing, sold out or not, with its source store.

## The data

Everything comes from public store product feeds, no API keys or paid data.

| | |
| --- | --- |
| Retailer listings | **8,905** from **16** stores (CannonKeys, Divinikey, NovelKeys, KBDfans, Keychron, Epomaker and more) |
| Parts usable in builds | **7,524** (2,000 switches, 1,803 keycap sets, 1,522 cases, 538 plates, 234 PCBs, 130 stabilizer sets, 1,297 mods and extras) |
| Daily refresh | 09:17 UTC via GitHub Actions |

Listings that can't be used in a build are kept out for a stated reason, counted in `data/catalog-manifest.json` (for example "not a full set", "no layout", "non-ANSI", "Topre/EC/Alps"). Specs are never invented: a missing spec stays unknown.

### The scraper

`scripts/sync-catalog.mjs` reads each store's public Shopify `/products.json` feed, after checking `robots.txt`. It retries temporary network failures, paginates fully, verifies USD pricing, and parses titles and variants into typed parts (pack sizes, switch types, layouts, stock, exact variant URLs). Required-source failures, empty feeds, incomplete pagination, or a catalog shrink above 20% abort the run, so a bad crawl never reaches the site.

### Photo checks

Product photos are screened with [sharp](https://sharp.pixelplumbing.com/) in `scripts/image-check.mjs`: clean background, product not cut off, keyboards shot top-down. Passing photos are cropped to their frame; anything else falls back to a drawn icon. A test blocks unchecked images from shipping.

## Engineering

- **No framework, no backend.** Vanilla JavaScript, one static site, hosted on GitHub Pages at a custom domain. The 8,905-listing directory loads on demand from 113 JSON shards.
- **Pipeline.** A scheduled Action syncs the catalog, validates it, runs the tests, and commits the data. A successful refresh triggers the Pages deploy. A failed one leaves the live site on the last good build.
- **Tests.** 111 unit tests (Node's built-in runner) cover catalog admission, compatibility, recommendations, part swapping, share-code round trips, product links, and sound lookups. A Playwright suite checks the real UI: keyboard navigation, history, laptop and phone sizes, reduced motion, and broken images. Both gate every deploy.
- **Performance.** The floating keyboard field lays out once per answer and animates with transforms only, with next-question boards pre-built during the button press.
- **Clean URLs.** `/build`, `/saved` and `/directory` use the History API, with a staged 404 fallback that redirects on a static host.

### Credits and sources

Quiz sound clips are CC0 recordings from Freesound, credited in `assets/sounds/CREDITS.md`. Switch sound tests link out to creators' YouTube videos (never embedded or downloaded); sources are listed in `docs/sound-sources.md`. Product names, prices and photos belong to their stores. Purchase links support optional affiliate codes (`assets/affiliates.js`), disclosed on the site once enabled.

## Run it locally

Requires Node 22+.

```sh
npm ci
npm test                          # unit tests
npx playwright install chromium
npm run test:ui                   # browser tests
npm run catalog:sync              # re-crawl the stores (--offline uses cached feeds)
npm run site:stage                # build dist/
```

Serve the repo or `dist/` over HTTP (not `file://`); the directory fetches its shards on demand. Design decisions are in [DESIGN.md](DESIGN.md).
