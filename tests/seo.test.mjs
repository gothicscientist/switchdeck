import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

// Stages the site once and checks what search engines, AI crawlers and link previews read from it.
const root=fileURLToPath(new URL('../',import.meta.url));
execFileSync(process.execPath,['scripts/stage-site.mjs'],{cwd:root,stdio:'ignore'});
const read=f=>readFile(root+'dist/'+f,'utf8');
const tag=(h,re)=>(h.match(re)||[])[1];

test('every view has its own title, description, canonical and preview tags', async()=>{
  const seen=new Set();
  for(const [file,path] of [['index.html',''],['build.html','build'],['saved.html','saved'],['directory.html','directory'],['about.html','about']]){
    const h=await read(file), title=tag(h,/<title>([^<]+)<\/title>/);
    assert.ok(title&&!seen.has(title),file+' title'); seen.add(title);
    assert.equal(tag(h,/<link rel="canonical" href="([^"]+)">/),'https://thock.cc/'+path,file);
    assert.equal(tag(h,/<meta property="og:url" content="([^"]+)">/),'https://thock.cc/'+path,file);
    const d=tag(h,/<meta name="description" content="([^"]+)">/); assert.ok(d.length>=70&&d.length<=200,file+' description length '+d.length);
    assert.equal(tag(h,/<meta property="og:image" content="([^"]+)">/),'https://thock.cc/assets/og.png');
    assert.equal(tag(h,/<meta name="twitter:card" content="([^"]+)">/),'summary_large_image');
    assert.doesNotMatch(h,/\{\{\w+\}\}/,file+' has an unfilled placeholder');
    for(const m of h.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g))JSON.parse(m[1]);
    assert.equal(/noindex/.test(tag(h,/<meta name="robots" content="([^"]+)">/)),path==='saved',file+' robots');
  }
});

test('the preview image is 1200x630 and the crawl files point at real pages', async()=>{
  const png=await readFile(root+'assets/og.png');
  assert.deepEqual([png.readUInt32BE(16),png.readUInt32BE(20)],[1200,630]);
  const sitemap=await read('sitemap.xml'), robots=await read('robots.txt'), llms=await read('llms.txt');
  assert.deepEqual([...sitemap.matchAll(/<loc>https:\/\/thock\.cc\/([^<]*)<\/loc>/g)].map(m=>m[1]),['','directory','build','about']);
  assert.match(robots,/User-agent: \*\nAllow: \//); assert.match(robots,/User-agent: GPTBot/); assert.match(robots,/User-agent: ClaudeBot/);
  assert.doesNotMatch(robots,/Disallow: \/\S/);
  assert.match(robots,/Sitemap: https:\/\/thock\.cc\/sitemap\.xml/);
  assert.match(llms,/^# Thock\n\n> /); assert.doesNotMatch(llms,/\{\{/);
});

test('crawlers without scripts can follow the nav and read the directory', async()=>{
  const h=await read('index.html'), d=await read('directory.html');
  for(const p of ['build','saved','directory'])assert.match(h,new RegExp(`<a href="${p}" data-go="${p}"`));
  assert.match(d,/id="directory-root"><header class="directory-head"><h1>Parts directory<\/h1>/);
});
