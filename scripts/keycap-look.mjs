// Reads a keycap set's look (mood and drawing palette) from facts only: the retailer's product name
// and the colours measured in its product photo (tone, see image-check.mjs). Nothing is guessed.

const MOODS=['dark','light','colorful','retro'];
// Stems with an open end ("Blackberry" reads dark) or closed words where a longer word means something else.
const WORDS={
  dark:/\b(?:black|dark|midnight|shadow|charcoal|carbon|obsidian|onyx|noir|graphite|nights?|WoB|ink)(?:\b|(?<=\b(?:black|dark|midnight|shadow|charcoal|carbon|obsidian|onyx|noir|graphite))\w*)/i,
  light:/\b(?:white|snow|milk|ivory|pearl|frost|cloud|BoW|light)(?:\b|(?<=\b(?:white|snow|milk|ivory|pearl|frost|cloud))\w*)/i,
  retro:/\b(?:retro|beige|vintage|classic|9009|terminal|dolch|olivetti|typewriter)/i,
  colorful:/\b(?:rainbow|pastel|candy|neon|laser|sakura)|\b(?:pink|red|blue|green|purple|yellow|orange|teal|cyan|mint|lavender|lilac|coral|peach)(?:ish)?\b/i,
};

// Moods drawn only from dark, light, colorful and retro: name keywords count on their own, and so do
// the photo's measured pixels. A set can have several; no evidence gives [].
export function keycapMood(name,tone){
  const n=String(name||''), m=new Set();
  for(const k of MOODS) if(WORDS[k].test(n)) m.add(k);
  if(tone){
    if(tone.dark>=45||tone.lum<30) m.add('dark');
    if(tone.light>=45||tone.lum>72) m.add('light');
    if(tone.colorful>=22||(tone.sat>=35&&tone.colorful>=12)) m.add('colorful');
    if(tone.beige>=30) m.add('retro');
  }
  return MOODS.filter(k=>m.has(k));
}

const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const lin=v=>{v/=255;return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4};
const relLum=h=>{const [r,g,b]=rgb(h).map(lin);return 0.2126*r+0.7152*g+0.0722*b};
const chroma=h=>{const c=rgb(h);return (Math.max(...c)-Math.min(...c))/255};
const LEG_DARK='#202124', LEG_LIGHT='#ECECEA';
// Near-black legends on light caps, near-white on dark ones, whichever contrasts more.
const legend=h=>{const l=relLum(h);return (l+0.05)/(relLum(LEG_DARK)+0.05)>=(relLum(LEG_LIGHT)+0.05)/(l+0.05)?LEG_DARK:LEG_LIGHT};
const differs=(a,b)=>Math.max(...rgb(a).map((v,i)=>Math.abs(v-rgb(b)[i])))>=40;

// Drawing palette from the photo's dominant colours; null without a photo summary.
export function keycapPalette(tone){
  const sw=tone?.swatches;
  if(!Array.isArray(sw)||!sw.length) return null;
  const alpha=sw[0].hex;
  const mod=sw[1]&&differs(alpha,sw[1].hex)?sw[1].hex:alpha;
  // Most saturated swatch (HSL saturation times how far the lightness is from black/white = chroma);
  // a photo with only greys has no accent, so the modifier colour stands in.
  const top=[...sw].sort((a,b)=>chroma(b.hex)-chroma(a.hex))[0].hex;
  const accent=chroma(top)>=0.12?top:mod;
  return {alpha,mod,accent,leg:legend(alpha),modleg:legend(mod),accleg:legend(accent)};
}
