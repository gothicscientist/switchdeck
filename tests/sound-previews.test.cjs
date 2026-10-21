const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');

const html = fs.readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const sameKeyCode = script.match(/const sameKey=[^\n]+/)[0];
const soundCode = script.slice(script.indexOf('const SOUND_TESTS='), script.indexOf('/* =========================================================\n   WHERE TO BUY:'));
// Read the actual catalog literals, so adding a switch without a recording fails here.
const switchRows = [...script.matchAll(/S\(\{id:'([^']+)',brand:'([^']+)',name:'([^']+)'/g)];
const BYID = Object.fromEntries(switchRows.map(([,id,brand,name]) => [id,{id,brand,name}]));
assert.ok(switchRows.length >= 18, 'Catalog switch rows must be found');

function harness(videos = {}) {
  const sandbox = {BYID, SWITCHDECK_SOUND_VIDEOS: videos, build:{switches:'oilking'},
    esc: s => String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;')};
  vm.createContext(sandbox);
  vm.runInContext(sameKeyCode + '\n' + soundCode + '\nthis.api={SOUND_TESTS,soundSearchUrl,soundHref,soundLink,moreSoundTests};', sandbox);
  return sandbox.api;
}

test('the whole application parses; synthesizer has been removed', () => {
  new vm.Script(script);
  assert.doesNotMatch(script, /createOscillator|createBiquadFilter|noiseBuf|function keystroke/);
});

test('curated recordings are links with sourced metadata for a known switch', () => {
  const api = harness();
  assert.ok(Object.keys(api.SOUND_TESTS).length >= 18);
  for (const [id,r] of Object.entries(api.SOUND_TESTS)) {
    assert.ok(BYID[id], `${id}: not a catalog switch`);
    assert.match(r.video, /^[A-Za-z0-9_-]{11}$/);
    for (const key of ['title','creator']) assert.ok(r[key], `${id}: missing ${key}`);
    if (r.start !== undefined) assert.ok(r.start >= 0 && r.end > r.start);
  }
  assert.notEqual(api.SOUND_TESTS.panda.video, api.SOUND_TESTS.u4t.video);
  assert.notEqual(api.SOUND_TESTS.u4.video, api.SOUND_TESTS.u4t.video);
});

test('a switch with no video opens a YouTube search for its full name and sound test', () => {
  const api = harness();
  const u = new URL(api.soundSearchUrl({brand:'Test',name:'New model'}));
  assert.equal(u.origin, 'https://www.youtube.com');
  assert.equal(u.pathname, '/results');
  assert.equal(u.searchParams.get('search_query'), 'Test New model sound test');
  const odd = new URL(api.soundSearchUrl({brand:'A & B',name:'Test #1 + / ?'}));
  assert.equal(odd.searchParams.size, 1);
  assert.equal(odd.searchParams.get('search_query'), 'A & B Test #1 + / ? sound test');
  assert.equal(new URL(api.soundSearchUrl({brand:'Various',name:'Cherry MX Red'})).searchParams.get('search_query'), 'Cherry MX Red sound test');
  BYID.unrecorded = {id:'unrecorded',brand:'Test',name:'New model'};
  try {
    assert.equal(api.soundHref(BYID.unrecorded), api.soundSearchUrl(BYID.unrecorded));
    assert.equal(api.moreSoundTests(BYID.unrecorded), '', 'no second link when the first is already the search');
  } finally { delete BYID.unrecorded; }
});

test('a switch with a video opens it directly, at its chapter when it has one', () => {
  const api = harness();
  assert.equal(api.soundHref(BYID.oilking), 'https://www.youtube.com/watch?v=-A_M_hvjVNY&t=92');
  assert.equal(api.soundHref(BYID.milkyyp), 'https://www.youtube.com/watch?v=rAw8qIYDc5A');
  assert.match(api.moreSoundTests(BYID.oilking), /results\?search_query=Gateron\+Oil\+King\+sound\+test|results\?search_query=Gateron%20Oil%20King%20sound%20test/);
});

test('videos found for new switches apply to every store listing of the same switch', () => {
  const api = harness({gateronnewone:{video:'abcdefghijk',title:'Gateron New One sound test'}});
  const a = {id:'store-a-1',brand:'Gateron',name:'New One'}, b = {id:'store-b-9',brand:'Gateron',name:'New One Switches'};
  assert.equal(api.soundHref(a), 'https://www.youtube.com/watch?v=abcdefghijk');
  assert.equal(api.soundHref(b), 'https://www.youtube.com/watch?v=abcdefghijk');
  assert.notEqual(api.soundHref({id:'x',brand:'Gateron',name:'Other'}), 'https://www.youtube.com/watch?v=abcdefghijk');
  // A curated recording also reaches the imported listing of that switch.
  assert.match(api.soundHref({id:'cannonkeys-1',brand:BYID.oilking.brand,name:BYID.oilking.name}), /v=-A_M_hvjVNY/);
});

test('Sound test is a plain link that opens in a new tab and never embeds a player', () => {
  const api = harness();
  const html = api.soundLink(BYID.oilking);
  assert.match(html, /^<a class="listen" href="https:\/\/www\.youtube\.com\/watch\?v=-A_M_hvjVNY&amp;t=92" target="_blank" rel="noopener noreferrer"/);
  assert.match(html, />Sound test<\/a>$/);
  assert.match(html, /opens in a new tab/);
  assert.equal(api.soundLink(null), '');
  assert.doesNotMatch(script, /<iframe|youtube-nocookie|createElement\('dialog'\)|showModal|soundpreview/);
});

test('results, builder, picker and copied parts list use the direct link', () => {
  assert.match(script, /soundLink\(i\.part\)\}\$\{moreSoundTests\(i\.part\)\}/);
  assert.match(script, /soundLink\(BYID\[build\.switches\],'Hear switches'\)/);
  assert.match(script, /soundLink\(p\)\+moreSoundTests\(p\)/);
  assert.match(script, /Switch sound test: '\+soundHref\(BYID\[b\.switches\]\)/);
});
