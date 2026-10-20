# Product purchase links

Every purchase surface (finder results, builder, picker, directory and copied list) uses `assets/product-links.js`. It accepts HTTPS product detail pages and Amazon `/dp/ASIN` URLs. It rejects homepages, store/category pages, search results, redirects, credentials and asset/feed URLs. Amazon links sort first; other sources are retained without a four-store cap. A source's exact Shopify variant query is preserved. Unknown availability is not reported as in stock.

`npm run catalog:sync` continues importing direct `/products/<handle>?variant=<id>` URLs from each public store feed, then runs the purchase-link builder automatically. It never constructs retailer searches or guesses Amazon ASINs.

`npm run catalog:links` rebuilds `data/product-links.js` from all published catalog shards, existing reviewed matches, and `scripts/product-link-overrides.json`. It retains multiple stores only for an identical brand, category and full product name, including revision words. Different pack sizes, revisions and variant names are not fuzzy-matched. `scripts/curated-parts.json` records the older hand-authored part identities, including generic parts that may have no real matching listing.

To add a newly researched Amazon or other retailer product, add an entry under the exact part ID in `scripts/product-link-overrides.json`:

```json
{
  "exact-part-id": {
    "links": [{
      "name": "Amazon",
      "url": "https://www.amazon.com/dp/CONFIRMED_ASIN",
      "title": "Actual listing title including model/revision/pack",
      "evidenceUrl": "https://www.amazon.com/dp/CONFIRMED_ASIN",
      "checkedAt": "2026-10-20T08:00:00Z"
    }]
  }
}
```

Find Amazon first; accept a result only after confirming model, revision and the appropriate kit/pack. Search URLs are discovery aids, never saved purchase links. Keep other confirmed product pages as alternatives. Only reviewed catalog IDs in `scripts/curated-matches.json` inherit a curated model's additional stores; builder variant URLs remain intact. Alternate stores may sell different pack quantities or colors: their prices are not substituted for the original listing price.

Run `npm run catalog:links`, `npm run catalog:check` and `npm test`. The refresh workflow does this automatically and commits the generated files. `data/product-link-report.json` records coverage and unresolved identities. Older generic/historical entries without a confirmed exact listing are excluded from new finder and picker choices. Existing saved builds can still resolve those IDs: a missing match displays “Exact product link not confirmed yet” and stays safe in copied lists. Some historic parts are sold out; their exact pages remain available and are labeled when stock is known.

Amazon URLs are canonical and have no affiliate tag today. A future affiliate layer can decorate these confirmed product URLs centrally, without changing product identity or introducing search redirects.
