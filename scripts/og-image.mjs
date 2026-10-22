// Draws the link preview image (assets/og.png, 1200x630) and the home screen icons from the site's own board
// drawings, so the preview is original art in the same stone palette as the page. Run after a design change:
//   NODE_PATH=$(npm root -g) node scripts/og-image.mjs
import {chromium} from 'playwright';
import {readFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const browser=await chromium.launch(process.env.THOCK_BROWSER_EXECUTABLE?{executablePath:process.env.THOCK_BROWSER_EXECUTABLE}:{});
const page=await browser.newPage();
await page.goto(pathToFileURL(root+'index.html').href);
await page.waitForFunction(()=>typeof boardSVG==='function');
// Three boards in the finder's spirit: one large in front, two smaller behind. Palettes are the drawn keycap sets.
const boards=await page.evaluate(()=>{
  const pal=id=>KEYCAPS.find(k=>k.id===id).pal;
  return [
    boardSVG({layout:'tkl',caseColor:'#3A3836',pal:pal('gmkolivia'),u:40}),
    boardSVG({layout:'65',caseColor:'#D9D4CB',pal:pal('devtty'),u:40}),
    boardSVG({layout:'75',caseColor:'#ECEAE6',pal:pal('bow'),u:40,knob:true}),
  ];
});
const favicon=await readFile(root+'assets/favicon.svg','utf8');
const font='<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Host+Grotesk:wght@500;700;800&display=block">';
const og=await browser.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});
await og.setContent(`<!doctype html><html><head>${font}<style>
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;overflow:hidden;background:#F5F5F4;font-family:"Host Grotesk",sans-serif;color:#292524;position:relative;-webkit-font-smoothing:antialiased}
.brand{position:absolute;left:72px;top:64px;display:flex;align-items:center;gap:12px;font-size:30px;font-weight:700;letter-spacing:-.035em}
.brand svg{width:42px;height:35px}
h1{position:absolute;left:72px;top:178px;width:520px;font-size:60px;line-height:1.02;font-weight:800;letter-spacing:-.04em}
p{position:absolute;left:72px;top:398px;width:470px;font-size:24px;line-height:1.35;color:#78716C;font-weight:500;letter-spacing:-.01em}
.url{position:absolute;left:72px;bottom:62px;font-size:22px;font-weight:600;color:#44403C;letter-spacing:-.01em}
.b{position:absolute;filter:drop-shadow(0 2px 3px rgba(41,37,36,.08)) drop-shadow(0 22px 34px rgba(41,37,36,.16))}
.b svg{display:block;width:100%;height:auto}
.b1{left:672px;top:58px;width:420px;transform:rotate(-4deg)}
.b2{left:850px;top:214px;width:330px;transform:rotate(5deg)}
.b3{left:600px;top:300px;width:470px;transform:rotate(-1deg)}
</style></head><body>
<div class="brand"><svg viewBox="0 0 34 28"><path d="M5 4h24a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M8 10h3M14 10h3M20 10h3M26 10h0M8 15h18M11 20h12" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>thock</div>
<h1>Find and build a custom mechanical keyboard</h1>
<p>Eight questions on size, feel and sound. Complete builds from real parts, with live prices from 16 stores.</p>
<div class="url">thock.cc</div>
<div class="b b1">${boards[1]}</div><div class="b b2">${boards[0]}</div><div class="b b3">${boards[2]}</div>
</body></html>`,{waitUntil:'networkidle'});
await og.evaluate(()=>document.fonts.ready);
await og.screenshot({path:root+'assets/og.png'});
// Home screen icons: the favicon on a square canvas (iOS rounds its own corners, so no rounding there).
const icon=await browser.newPage();
for(const [file,size,full] of [['apple-touch-icon.png',180,true],['icon-192.png',192,false],['icon-512.png',512,false]]){
  await icon.setViewportSize({width:size,height:size});
  const svg=full?favicon.replace('rx="16"','rx="0"'):favicon;
  await icon.setContent(`<style>*{margin:0}body{width:${size}px;height:${size}px;background:transparent}svg{width:100%;height:100%;display:block}</style>${svg}`);
  await icon.screenshot({path:root+'assets/'+file,omitBackground:true});
}
await browser.close();
console.log('Wrote assets/og.png and home screen icons');
