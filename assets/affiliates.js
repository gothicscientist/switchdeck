/* Affiliate tags for store links. Codes are public (they appear in every tagged link), so they live here, not in
   secrets. A store with an empty code is linked untagged. Each entry either appends a query parameter to the product
   URL ({param, code}) or wraps it in a network deep link ({wrap}, with {url} replaced by the encoded product URL).
   Hosts match with or without "www.". */
globalThis.SWITCHDECK_AFFILIATES={
  'amazon.com':{param:'tag',code:''},
  'cannonkeys.com':{param:'ref',code:''},
  'divinikey.com':{param:'ref',code:''},
  'novelkeys.com':{param:'ref',code:''},
  'kbdfans.com':{param:'ref',code:''},
  'keychron.com':{param:'ref',code:''},
  'keebsforall.com':{param:'ref',code:''},
  'modedesigns.com':{param:'ref',code:''},
  'mechanicalkeyboards.com':{param:'ref',code:''},
  'kprepublic.com':{param:'ref',code:''},
  'meletrix.com':{param:'ref',code:''},
  'qwertykeys.com':{param:'ref',code:''},
  'wobkey.com':{param:'ref',code:''},
  'epomaker.com':{param:'ref',code:''},
  'kineticlabs.com':{param:'ref',code:''},
  'dangkeebs.com':{param:'ref',code:''},
  'milktooth.com':{param:'ref',code:''},
  'ringerkeys.com':{param:'ref',code:''},
};
