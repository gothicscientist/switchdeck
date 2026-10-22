/* Search and link-preview text for each view. The deploy writes these into each staged page's head
   (scripts/stage-site.mjs), and the page updates its title and description when it changes view in place. */
globalThis.THOCK_VIEW_META = Object.freeze({
  finder: {
    path: '',
    title: 'Thock: find and build a custom mechanical keyboard',
    description: 'Answer eight questions about size, feel, sound and budget, and Thock builds complete custom mechanical keyboards from thousands of real parts, with live prices from 16 stores.',
  },
  build: {
    path: 'build',
    title: 'Custom keyboard builder with compatibility checks | Thock',
    description: 'Pick a case, PCB, plate, switches, stabilizers and keycaps for a custom mechanical keyboard. Thock checks switch family and fit, totals the price and links every part to a real store.',
  },
  saved: {
    path: 'saved',
    title: 'Saved builds | Thock',
    description: 'Your saved custom mechanical keyboard builds, kept in this browser. Open one again or load a build code.',
    noindex: true,
  },
  directory: {
    path: 'directory',
    title: 'Mechanical keyboard parts directory: switches, keycaps, cases, PCBs | Thock',
    description: 'Search thousands of mechanical keyboard parts from 16 stores: switches, keycap sets, cases and kits, PCBs, plates, stabilizers and mods, with published specs, prices and stock checked daily.',
  },
});
