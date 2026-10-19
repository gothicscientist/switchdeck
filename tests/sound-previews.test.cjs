const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');

const html = fs.readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const soundCode = script.slice(script.indexOf('const SOUND_TESTS='), script.indexOf('/* =========================================================\n   WHERE TO BUY:'));
// Read the actual catalog literals, so adding a switch without a recording fails here.
const switchRows = [...script.matchAll(/S\(\{id:'([^']+)',brand:'([^']+)',name:'([^']+)'/g)];
const BYID = Object.fromEntries(switchRows.map(([,id,brand,name]) => [id,{id,brand,name}]));
assert.ok(switchRows.length >= 18, 'Catalog switch rows must be found');

function harness() {
  let dialog;
  const listeners = {};
  const windowListeners = {};
  const close = { onclick: null };
  const document = {
    hidden: false,
    body: { append(d) { dialog = d; } },
    addEventListener(name, fn) { listeners[name] = fn; },
    createElement() {
      return {
        open: false, innerHTML: '', listeners: {}, attrs: {},
        setAttribute(k,v) { this.attrs[k] = v; },
        addEventListener(name, fn) { this.listeners[name] = fn; },
        querySelector() { return close; },
        showModal() { this.open = true; },
        close() { this.open = false; this.listeners.close(); },
        getBoundingClientRect() { return {left:10,top:10,right:600,bottom:500}; },
      };
    },
  };
  const sandbox = {BYID, build:{switches:'oilking'}, resList:[{b:{switches:'u4'}}],
    esc: s => String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;'),
    document, window:{addEventListener(n,fn){windowListeners[n]=fn;}}, toast(){} };
  vm.createContext(sandbox);
  vm.runInContext(soundCode + '\nthis.api={SOUND_TESTS,SOUND_EXAMPLES,soundPart,soundSearchUrl,soundSearchLink,playSnd,closeSoundPreview};', sandbox);
  return { api:sandbox.api, get dialog(){return dialog}, close, listeners, windowListeners, document };
}

test('the whole application parses; synthesizer has been removed', () => {
  new vm.Script(script);
  assert.doesNotMatch(script, /createOscillator|createBiquadFilter|noiseBuf|function keystroke/);
});

test('every catalog switch has its own sourced recording metadata', () => {
  const {api} = harness();
  assert.equal(Object.keys(api.SOUND_TESTS).length, switchRows.length);
  for (const [id,p] of Object.entries(BYID)) {
    const r = api.SOUND_TESTS[id];
    assert.ok(r, `${id}: missing real recording`);
    assert.match(r.video, /^[A-Za-z0-9_-]{11}$/);
    for (const key of ['title','creator','setup','treatment']) assert.ok(r[key], `${id}: missing ${key}`);
    if (r.start !== undefined) assert.ok(r.start >= 0 && r.end > r.start);
    assert.equal(api.soundPart('part:'+id), p);
  }
  assert.notEqual(api.SOUND_TESTS.panda.video, api.SOUND_TESTS.u4t.video);
  assert.notEqual(api.SOUND_TESTS.u4.video, api.SOUND_TESTS.u4t.video);
});

test('quiz, builder and results resolve the right switch without category substitution', () => {
  const {api} = harness();
  for (const id of Object.values(api.SOUND_EXAMPLES)) assert.ok(api.SOUND_TESTS[id]);
  assert.equal(api.soundPart('Silent').id, 'silentred');
  assert.equal(api.soundPart('Tactile').id, 'u4t');
  assert.equal(api.soundPart('Clicky').id, 'boxjade');
  assert.equal(api.soundPart('build').id, 'oilking');
  assert.equal(api.soundPart('res:0').id, 'u4');
  assert.equal(api.soundPart('res:99'), undefined);
  assert.equal(api.soundPart('part:missing'), undefined);
});

test('YouTube search uses the selected full model name and escapes query data', () => {
  const {api} = harness();
  for(const p of Object.values(BYID)) {
    const u = new URL(api.soundSearchUrl(p));
    assert.equal(u.origin, 'https://www.youtube.com');
    assert.equal(u.pathname, '/results');
    assert.equal(u.searchParams.get('search_query'), `${p.brand==='Various'?'':p.brand+' '}${p.name} switches sound test`);
  }
  const u = new URL(api.soundSearchUrl({brand:'A & B',name:'Test #1 + / ?'}));
  assert.equal(u.searchParams.size, 1);
  assert.equal(u.searchParams.get('search_query'), 'A & B Test #1 + / ? switches sound test');
  assert.equal(api.soundSearchLink(null), '');
});

test('real preview uses a visible credited player; closing destroys it', () => {
  const h = harness();
  h.api.playSnd('part:oilking');
  assert.ok(h.dialog.open);
  assert.match(h.dialog.innerHTML, /youtube-nocookie.com\/embed\/-A_M_hvjVNY/);
  assert.match(h.dialog.innerHTML, /start=92/);
  assert.match(h.dialog.innerHTML, /end=127/);
  assert.match(h.dialog.innerHTML, /Click and Thock/);
  assert.match(h.dialog.innerHTML, /FR4/);
  assert.match(h.dialog.innerHTML, /not a recording of your custom build/);
  assert.match(h.dialog.innerHTML, /Open original recording/);
  // Native dialog close events can be queued; an old event must not erase a reopened player.
  h.dialog.listeners.close();
  assert.match(h.dialog.innerHTML, /youtube-nocookie/);
  h.close.onclick();
  assert.equal(h.dialog.open, false);
  assert.equal(h.dialog.innerHTML, '');
});

test('a newly added switch never borrows another switch recording', () => {
  const h = harness();
  BYID.unrecorded = {id:'unrecorded',brand:'Test',name:'New model'};
  try {
    h.api.playSnd('part:unrecorded');
    assert.doesNotMatch(h.dialog.innerHTML, /<iframe/);
    assert.match(h.dialog.innerHTML, /No curated recording for this exact model yet/);
    assert.match(h.dialog.innerHTML, /Test%20New%20model%20switches%20sound%20test/);
  } finally { delete BYID.unrecorded; }
});

test('Escape and backgrounding stop the preview without closing underlying results', () => {
  const h = harness();
  h.api.playSnd('Tactile');
  let prevented=false,stopped=false;
  h.dialog.listeners.keydown({key:'Escape',preventDefault(){prevented=true},stopPropagation(){stopped=true}});
  assert.ok(prevented && stopped);
  assert.equal(h.dialog.open, false);
  h.api.playSnd('Silent');
  h.document.hidden=true;
  h.listeners.visibilitychange();
  assert.equal(h.dialog.innerHTML, '');
});

test('results, builder, picker and copied parts list include exact-model search links', () => {
  assert.match(script, /soundSearchLink\(s\)/);
  assert.match(script, /soundSearchLink\(i.part\)/);
  assert.match(script, /soundSearchLink\(BYID\[build.switches\]\)/);
  assert.match(script, /soundSearchLink\(p\)/);
  assert.match(script, /Switch sound tests:.*soundSearchUrl\(BYID\[b.switches\]\)/);
});
