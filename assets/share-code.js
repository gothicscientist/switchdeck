/* Shareable build links. A build and the finder answers travel in the URL fragment, so a link works on any static
   host (GitHub Pages included) with no server, account or storage, and the fragment never reaches a server log.

   Version 1:  #b=1.<case>.<color>.<pcb>.<plate>.<switches>.<stabs>.<keycaps>.<extras>.<answers>
   - Parts use the catalog's stable IDs. A store listing ID ("store-<product>" or "store-<product>~<variant>") is
     shortened to the store's letter plus base-36 numbers; any other ID is written as it is. Extras are joined with "_".
   - Empty fields stay blank and trailing blanks are dropped. Color 0 is blank.
   - Answers: one character per finder question in QUESTIONS order (the option's index in base 36, "-" unanswered),
     then "_" and the budget ("n" for no limit, or whole dollars), then "~" and the shuffle seed in base 36.
   STORES is append-only: changing or reordering a letter breaks every link already shared. Changing the option
   order of a finder question also changes what old links mean, so it needs a new version (tests/share.test.mjs). */
(function(){
  const VERSION='1';
  const STORES=['cannonkeys','dangkeebs','divinikey','epomaker','kbdfans','keebsforall','keychron','kprepublic',
    'mechanicalkeyboards','meletrix','mode','novelkeys','qwertykeys','wobkey'];
  const LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const LISTING=/^([a-z]+)-([1-9]\d{5,})(?:~([1-9]\d{5,}))?$/;
  const RAW=/^[a-z0-9][a-z0-9~-]*$/;
  const SLOTS=['case','color','pcb','plate','switches','stabs','keycaps','extras','answers'];

  const toB36=digits=>BigInt(digits).toString(36);
  function fromB36(s){
    if(!/^[1-9a-z][0-9a-z]*$/.test(s)||s.length>16) throw Error('Bad number in build link');
    let n=0n; for(const ch of s) n=n*36n+BigInt(parseInt(ch,36)); return n.toString();
  }
  function packId(id){
    if(id==null||id==='') return '';
    id=String(id);
    const m=id.match(LISTING), i=m?STORES.indexOf(m[1]):-1;
    if(i>=0) return LETTERS[i]+toB36(m[2])+(m[3]?'~'+toB36(m[3]):'');
    if(!RAW.test(id)) throw Error('Part ID cannot be shared: '+id);
    return id;
  }
  function unpackId(t){
    if(!t) return null;
    const i=LETTERS.indexOf(t[0]);
    if(i<0){ if(!RAW.test(t)) throw Error('Bad part in build link'); return t }
    if(i>=STORES.length) throw Error('Unknown store in build link');
    const parts=t.slice(1).split('~'); if(parts.length>2) throw Error('Bad part in build link');
    return STORES[i]+'-'+fromB36(parts[0])+(parts.length>1?'~'+fromB36(parts[1]):'');
  }
  function packAnswers(ans,questions){
    let s='', budget='';
    for(const q of questions){
      const v=ans&&ans[q.key];
      if(q.budget){ budget=v==='any'?'n':Number.isFinite(v)?String(Math.round(v)):''; continue }
      const i=q.opts.findIndex(o=>o.v===v); s+=i<0?'-':i.toString(36);
    }
    s=s.replace(/-+$/,'');
    if(budget) s+='_'+budget;
    if(ans&&Number.isFinite(ans.seed)&&ans.seed>=0) s+='~'+Math.floor(ans.seed).toString(36);
    return s;
  }
  function unpackAnswers(s,questions){
    const ans={};
    if(!s) return ans;
    const m=s.match(/^([0-9a-z-]*)(?:_(n|\d{1,5}))?(?:~([0-9a-z]{1,8}))?$/);
    if(!m) throw Error('Bad answers in build link');
    const picks=questions.filter(q=>!q.budget), budgetQ=questions.find(q=>q.budget);
    [...m[1]].forEach((ch,n)=>{ const q=picks[n]; if(!q||ch==='-') return; const o=q.opts[parseInt(ch,36)]; if(o) ans[q.key]=o.v });
    if(m[2]&&budgetQ) ans[budgetQ.key]=m[2]==='n'?'any':Number(m[2]);
    if(m[3]) ans.seed=parseInt(m[3],36);
    return ans;
  }
  function encode(b,ans,questions){
    const f=[packId(b.case),b.color?String(b.color):'',packId(b.pcb),packId(b.plate),packId(b.switches),packId(b.stabs),
      packId(b.keycaps),(b.extras||[]).map(packId).join('_'),packAnswers(ans,questions)];
    while(f.length&&f[f.length-1]==='') f.pop();
    return VERSION+'.'+f.join('.');
  }
  // Returns the part IDs and answers exactly as the link names them. Throws on anything malformed; whether each
  // part still exists in the catalog is for the app to check.
  function decode(code,questions){
    code=String(code||'').trim();
    try{ code=decodeURIComponent(code) }catch(e){ throw Error('Bad build link') }
    if(code.length>1500) throw Error('Build link too long');
    const f=code.split('.');
    if(f[0]!==VERSION) throw Error('Unsupported build link');
    if(f.length<2||f.length>SLOTS.length+1) throw Error('Bad build link');
    const v=Object.fromEntries(SLOTS.map((k,i)=>[k,f[i+1]||'']));
    if(!v.case) throw Error('Build link has no keyboard');
    if(v.color&&!/^\d{1,2}$/.test(v.color)) throw Error('Bad color in build link');
    return {
      b:{case:unpackId(v.case),color:v.color?Number(v.color):0,pcb:unpackId(v.pcb),plate:unpackId(v.plate),
        switches:unpackId(v.switches),stabs:unpackId(v.stabs),keycaps:unpackId(v.keycaps),
        extras:v.extras?v.extras.split('_').map(unpackId):[]},
      ans:unpackAnswers(v.answers,questions)
    };
  }
  globalThis.SwitchdeckShare={encode,decode,packId,unpackId,STORES};
})();
