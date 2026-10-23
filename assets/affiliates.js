/* Affiliate tags for store links. Codes are public (they appear in every tagged link), so they live here, not in
   secrets. A store with an empty code is linked untagged. Each entry either appends a query parameter to the product
   URL ({param, code}) or wraps it in a network deep link ({wrap}, with {url} replaced by the encoded product URL).
   Hosts match with or without "www.". Formats other than Amazon's tag and UpPromote's sca_ref (Epomaker, KeebsForAll)
   are placeholders: confirm each from the link the store's dashboard gives before adding its code.
   Codes apply by host when a link is shown, so every listing from these stores, including ones the daily refresh adds
   later, is tagged without any per-part data. Stores with a code also rank ahead of untagged stores (orderLinks). */
globalThis.SWITCHDECK_AFFILIATES={
  'amazon.com':{param:'tag',code:'thock-20'},
  'cannonkeys.com':{param:'ref',code:''},
  'divinikey.com':{param:'ref',code:''},
  'novelkeys.com':{param:'ref',code:''},
  'kbdfans.com':{param:'ref',code:''},
  'keychron.com':{param:'ref',code:'thock'},
  'keebsforall.com':{param:'sca_ref',code:''},
  'modedesigns.com':{param:'ref',code:''},
  'mechanicalkeyboards.com':{param:'ref',code:''},
  'kprepublic.com':{param:'ref',code:''},
  'meletrix.com':{param:'ref',code:''},
  'qwertykeys.com':{param:'ref',code:''},
  'wobkey.com':{param:'ref',code:''},
  'epomaker.com':{param:'sca_ref',code:'12591760.vF400L2Pzt'},
  'kineticlabs.com':{param:'ref',code:''},
  'dangkeebs.com':{param:'ref',code:''},
  'milktooth.com':{param:'ref',code:''},
  'ringerkeys.com':{param:'ref',code:''},
  'whatgeek.com':{param:'ref',code:''},
  'kono.store':{param:'ref',code:''},
  'keebmonkey.com':{param:'ref',code:''},
  'dixiemech.store':{param:'ref',code:''},
};
