# Thock: keyboard builder and parts directory

A static keyboard builder with a sourced, searchable retailer directory. Open the [site](https://thock.cc/) and choose **Parts directory**, or **Browse all parts** from the builder.

## Catalog

The initial import contains 4,076 retailer listings and 25,591 product variants from CannonKeys, Divinikey, NovelKeys, KBDfans, Keychron, KeebsForAll, and Mode Designs. It covers keyboards/kits, cases, PCBs, plates, switches, keycaps, stabilizers, mods/tools/cables, and deskmats. Counts are listing counts, not claims of unique models or market-wide completeness. Separate listings are retained because revisions, kit contents, and pack sizes can differ across stores.

Every published record has real retailer image URLs, a direct product URL, variant URLs, USD prices, stock snapshots, option values, source timestamps, and provenance. Technical specs are extracted only when published; missing fields remain explicit. A listing's starting price can refer to an add-on rather than a complete kit. Exact variants and their prices are visible in the detail dialog. Prices exclude shipping and tax; store stock and prices can change after import.

The directory loads only when opened. Its lightweight index is separate from detail shards of 80 listings, so the finder does not download the full catalog. Product images are lazy loaded from retailer CDNs and link back to their stores; image ownership remains with the source owners. No copied marketing descriptions or generated product photos are used.

## Refresh efficiently

Requires Node 22 or newer; no dependencies, paid API, or API key is required.

```sh
npm run catalog:sync
npm run catalog:check
npm test
```

The importer checks robots.txt, paginates public Shopify product feeds, retries rate limits, limits concurrency to three stores, and requests each store's pages serially. Raw last-good snapshots stay in ignored `.cache/`. A source failure, repeated pagination, an unexpectedly small result, or a catalog shrink greater than 20% fails the refresh before changing published data. A cache-only rebuild is available with `npm run catalog:sync -- --offline`. Review source changes and run checks before committing generated `data/` files. Add stores to `SOURCES` in `scripts/catalog-lib.mjs`.

The **Refresh keyboard catalog** GitHub Actions workflow is manual. It imports, validates, tests, commits changed catalog files, and triggers the existing Pages deployment through `workflow_run`. There is no scheduled crawl.

## Builder compatibility

The original curated components keep their IDs, so existing saved builds still work. Imported standard-MX switches enter the builder only when the retailer explicitly publishes their switch system, pin count, actuation force, total travel, and an unambiguous pack quantity, and there is exactly one available variant. Hall effect, optical, low-profile, ambiguous and incomplete switch listings remain browsable but are never treated as ordinary MX switches. Switch purchases round up to whole retailer packs. Tools, lubricants and cables can also be added as exact named retailer variants; fit-dependent foam and components are not automatically admitted.

Imported parts do not invent sound measurements, physical fit, keycap kitting, or preview colors. Sound-ranked finder recommendations continue to use the curated catalog. Imported switch preview colors and the existing builder sound estimator are illustrative. Case/PCB/plate mounting patterns and keycap coverage need a reviewed adapter before those imported categories can safely enter compatibility recommendations. All categories can already be searched, inspected, and purchased through the directory.

`data/catalog-manifest.json` contains per-source freshness, category counts, shard paths and a content fingerprint. The validator checks every listing and variant, HTTPS/source links, unique IDs, prices, images, spec ranges, builder admission and counts. Unit tests cover tolerance parsing, force terminology, switch systems, pack pricing, unknown specs, unrelated products, script compilation and saved-build recovery.

## Local preview

Serve this folder with any static HTTP server (for example `python -m http.server 4173`) rather than opening `index.html` as a `file:` URL. The directory uses same-origin JSON requests. GitHub Pages publishes the repository root.

## Part display names

`assets/part-names.js` is the shared naming policy for every category in the builder, finder, and directory. Display names keep the model/colourway and selected variant, removing retailer SEO, stock badges, compatibility lists, pack counts, and specifications already shown separately. Brand is displayed separately. Original retailer titles remain in `name` on source listings and `sourceName` on builder parts for searching and technical extraction; never parse compatibility from the shortened display name. The importer writes `displayName` for new listings and normalizes generated builder names automatically. The browser applies the same rule to existing data and curated parts, so refreshing the catalog cannot reintroduce long titles. Model revisions and variant choices must remain identifiable. Run `npm test` when changing these rules.
