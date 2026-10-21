import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {matchVideo,switchKey,parseVideosFile,videosFileText} from '../scripts/sound-videos.mjs';

const hit=(id,title,channel='Someone')=>({id:{videoId:id},snippet:{title,channelTitle:channel}});

test('a video must name the exact switch and be a sound test or review', () => {
  const p={brand:'Gateron',name:'KS-3X1 Milky Pro Purple Silent'};
  assert.equal(matchVideo(p,[hit('aaaaaaaaaaa','Gateron KS-3X1 Milky Pro Purple SILENT Switch Sound Test','Ch')]).video,'aaaaaaaaaaa');
  assert.equal(matchVideo(p,[hit('bbbbbbbbbbb','Gateron KS-3X1 Milky Pro Purple Sound Test')]),null,'missing Silent');
  assert.equal(matchVideo(p,[hit('ccccccccccc','Gateron KS-3X1 Milky Pro Purple Silent unboxing')]),null,'not a sound test');
  assert.equal(matchVideo(p,[hit('short','Gateron KS-3X1 Milky Pro Purple Silent sound test')]),null,'bad id');
});

test('a one-word switch name also needs its brand in the title', () => {
  const p={brand:'Gateron',name:'Melodic'};
  assert.equal(matchVideo(p,[hit('aaaaaaaaaaa','Melodic keycaps sound test')]),null);
  assert.equal(matchVideo(p,[hit('bbbbbbbbbbb','Gateron Melodic switch review')]).video,'bbbbbbbbbbb');
});

test('the switch key matches index.html and ignores store wording', async () => {
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  assert.ok(html.includes(String.raw`const sameKey=p=>(p.brand+' '+p.name).toLowerCase().replace(/\b(switch(es)?|keycaps?( set)?)\b|[^a-z0-9]/g,'')`));
  assert.equal(switchKey({brand:'Gateron',name:'Oil King Switches'}),switchKey({brand:'Gateron',name:'Oil-King'}));
});

test('the videos file round-trips and the site never embeds or hosts YouTube audio', async () => {
  const map={b:{video:'bbbbbbbbbbb',title:'B'},a:{video:'aaaaaaaaaaa',title:'A',start:5}};
  assert.deepEqual(parseVideosFile(videosFileText(map)),map);
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  assert.ok(!/youtube(-nocookie)?\.com\/embed|<iframe/i.test(html));
});
