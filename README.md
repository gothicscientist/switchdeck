# Thock

A static mechanical-keyboard finder, builder, saved-build library, and sourced parts directory at https://thock.cc/.

## Develop and check

Requires Node 22 or newer.

```sh
npm ci
npm test
npm run catalog:check
npm run site:stage
```

Serve the repository or `dist/` with a static HTTP server. Use HTTP rather than a file URL: the directory loads its index and detail shards on demand. The theme follows the device preference; the header toggle overrides it for the current visit. Builds are stored in the browser on the current origin. Build codes retain the SY1 format for compatibility and can move builds between devices or domains.

## Daily catalog finder

**Refresh keyboard catalog** runs daily at **09:17 UTC** and can also be run manually from GitHub Actions. It checks robots.txt, reads public retailer product feeds, retries temporary network failures, verifies USD for optional stores, checks photos, builds purchase links, validates the resulting catalog, and runs all tests before committing. A failed refresh leaves the deployed catalog intact. Its successful `workflow_run` triggers **Deploy to GitHub Pages**, including bot commits that do not trigger ordinary push workflows.

```sh
npm run catalog:sync
npm run catalog:check
npm test
```

Last-good raw snapshots and photo measurements are cached in ignored `.cache/`. `npm run catalog:sync -- --offline` rebuilds from cached feeds. Required source failures, incomplete pagination, empty feeds, and a catalog shrink greater than 20% abort publication. Optional unavailable sources are reported in the manifest and workflow summary; they are not claimed as fresh. See `data/catalog-manifest.json` for current source status, timestamps, counts, admission reasons, and fingerprint. Counts represent retailer listings, not unique products.

## Catalog and compatibility

Source records retain retailer titles, published specifications, stock, exact variant URLs, pack quantities, and provenance. Display names use `assets/part-names.js`. Missing specifications stay unknown. Individual component variants on a keyboard listing are not complete kits. A sold-out base kit is kept sold out even when add-ons remain available. Sold-out parts remain browsable and recoverable in saved builds but are excluded from finder recommendations.

The finder prices whole switch packs and the selected case, PCB, plate, stabilizers, and keycaps. PCB and plate pairings require a shared catalog family; unknown fit is shown as a check in the builder. Switch systems must match, including upgrades to assembled keyboards. Imported keycap coverage inferred from key counts still requires checking the exact kitting. Sound estimates are illustrative; recordings and exact-model sound-test links have separate source information in `docs/sound-sources.md`.

Directory additions respect the selected exact variant. Unsupported variants can still be inspected and purchased but cannot be silently replaced with another builder variant. Purchase links resolve to product pages, prioritize confirmed Amazon listings, and support optional affiliate configuration in `assets/affiliates.js`; see `docs/product-links.md`.

## Deployment

GitHub Pages deploys `dist/`, assembled by `npm run site:stage` from browser assets, catalog data, CNAME, robots.txt, and sitemap.xml. Source scripts, tests, dependencies, and importer caches are excluded. `CNAME` preserves thock.cc. Tests and catalog validation gate every deploy.
