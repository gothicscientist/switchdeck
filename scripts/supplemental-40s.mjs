// Retailer-page snapshots for small vendors without a usable USD Shopify feed.
// Keep the actual review date: a daily refresh must not imply a new stock check.
import {normalize} from './catalog-lib.mjs';

export const reviewedAt='2026-10-23T07:00:00.000Z';
const entries=[
  {source:{id:'akko-direct',name:'Akko',url:'https://en.akkogear.com',currency:'USD'},id:'acr-top-40',brand:'Akko',name:'ACR TOP 40',price:89.99,url:'https://en.akkogear.com/product/acr-top-40/',image:'https://en.akkogear.com/wp-content/uploads/2023/06/ACR-top40.jpg',specs:'Layout: 40%\nCase material: Acrylic\nMount: Top mount\nConnection: Wired USB-C\nFirmware: QMK VIA\nHot-swappable',note:'Acrylic top-mount kit with RGB and hot-swap sockets. Requires switches and 40%-compatible keycaps; check the unusual modifier and split-spacebar sizes.'},
  {source:{id:'mechwild',name:'MechWild',url:'https://mechwild.com',currency:'USD'},id:'mercutio',brand:'MechWild',name:'Mercutio',price:64,url:'https://mechwild.com/product/mercutio/',image:'https://mechwild.com/wp-content/uploads/2020/12/DSC06274-e1700092839150.jpg',specs:'Layout: 40%\nFirmware: QMK VIA\nConnection: Wired\nMX-only compatibility\nSoldering required',knob:true,note:'Through-hole DIY kit with OLED and rotary encoder. Includes PCB, switch plate, bottom plate, MCU and hardware. Requires soldering, switches, keycaps and stabilizers. Vendor orders are paused.'},
  {source:{id:'mechwild',name:'MechWild',url:'https://mechwild.com',currency:'USD'},id:'clunker',brand:'MechWild',name:'Clunker',price:50,url:'https://mechwild.com/product/clunker/',image:'https://mechwild.com/wp-content/uploads/2022/04/clunker_sq-e1700090981512.png',specs:'Layout: 40%\nFirmware: QMK VIA Vial\nConnection: Wired\nSoldering required',knob:true,note:'DIY kit with a partial number row, rotary encoder and solenoid. Includes PCB, plates, Pro Micro and hardware. Requires soldering, switches, keycaps and stabilizers. Vendor orders are paused.'},
  {source:{id:'ringerkeys',name:'Ringer Keys',url:'https://ringerkeys.com',currency:'USD'},id:'static',brand:'0xCB',name:'Static',price:100,url:'https://ringerkeys.com/products/0xcb-static-keyboard-kit',image:'https://ringerkeys.com/cdn/shop/products/whitekit_1024x.jpg?v=1648825785',specs:'Layout: 40%\nFirmware: QMK VIA\nConnection: Wired USB-C\nPlate material: FR4\nSoldering required',knob:true,note:'Through-hole DIY kit with OLED, rotary encoder, FR4 switch and bottom plates, electronics and feet. Requires soldering, MX switches, keycaps and screw-in stabilizers. Acrylic enclosure is an optional add-on.'},
  {source:{id:'keebio',name:'Keebio',url:'https://keeb.io',currency:'USD'},id:'laplace',brand:'Keebio',name:'Laplace',price:29.99,url:'https://keeb.io/products/laplace-40-staggered-keyboard',image:'https://keeb.io/cdn/shop/products/laplace-swires.jpg?v=1524283952',specs:'Layout: 40%\nConnection: Wired\nPlate material: FR4\nSoldering required',note:'Discontinued staggered DIY kit with PCB, switch plate, bottom plate and hardware. Requires a separate Pro Micro controller, soldering, switches, stabilizers and keycaps.'},
];

export const supplementalSources=[...new Map(entries.map(e=>[e.source.id,e.source])).values()];
export function supplemental40s(){
  return entries.map(e=>{
    const p=normalize({id:e.id,title:e.brand+' '+e.name+' 40% Keyboard Kit',handle:e.id,vendor:e.brand,product_type:'Keyboard Kit',tags:[],body_html:e.specs.split('\n').map(t=>'<p>'+t+'</p>').join(''),images:[{src:e.image}],options:[],variants:[{id:'base-kit',title:'Base Kit',price:String(e.price),available:false}]},e.source,reviewedAt);
    p.url=e.url;p.variants.forEach(v=>{v.url=e.url});
    p.provenance={url:e.url,method:'reviewed-public-retailer-page',specs:'retailer-published; not independently measured'};
    p.builderNote=e.note;p.builderKnob=!!e.knob;
    return p;
  });
}
