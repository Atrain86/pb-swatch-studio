/* ColorShare app: colour engine, scan studio, palettes, library and settings. */
const $=id=>document.getElementById(id);
const rnd=(a,b)=>a+Math.random()*(b-a);const pick=a=>a[Math.floor(Math.random()*a.length)];
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
const toHex=(r,g,b)=>'#'+[r,g,b].map(v=>Math.max(0,Math.min(255,Math.round(v*255))).toString(16).padStart(2,'0')).join('').toUpperCase();
const hexRgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255);
const rgba=(h,a)=>{const[r,g,b]=hexRgb(h).map(v=>Math.round(v*255));return`rgba(${r},${g},${b},${a})`};
const lin=c=>c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4);
const gam=c=>c<=0.0031308?12.92*c:1.055*Math.pow(c,1/2.4)-0.055;
function linOk(r,g,b){const l=Math.cbrt(0.4122214708*r+0.5363325363*g+0.0514459929*b),m=Math.cbrt(0.2119034982*r+0.6806995451*g+0.1073969566*b),s=Math.cbrt(0.0883024619*r+0.2817188376*g+0.6299787005*b);return[0.2104542553*l+0.793617785*m-0.0040720468*s,1.9779984951*l-2.428592205*m+0.4505937099*s,0.0259040371*l+0.7827717662*m-0.808675766*s]}
const rgbOk=(r,g,b)=>linOk(lin(r),lin(g),lin(b));const hexOk=h=>rgbOk(...hexRgb(h));
function okLin(L,a,b){const l=(L+0.3963377774*a+0.2158037573*b)**3,m=(L-0.1055613458*a-0.0638541728*b)**3,s=(L-0.0894841775*a-1.291485548*b)**3;return[4.0767416621*l-3.3077115913*m+0.2309699292*s,-1.2684380046*l+2.6097574011*m-0.3413193965*s,-0.0041960863*l-0.7034186147*m+1.707614701*s]}
const okHex=o=>toHex(...okLin(...o).map(x=>gam(Math.max(0,Math.min(1,x)))));
function lchHex(L,C,h){L=clamp(L,0.06,0.98);const hr=h*Math.PI/180;const ok=c=>okLin(L,c*Math.cos(hr),c*Math.sin(hr)).every(x=>x>=-0.0005&&x<=1.0005);let lo=0,hi=Math.max(0,C);if(!ok(hi)){for(let i=0;i<18;i++){const m=(lo+hi)/2;if(ok(m))lo=m;else hi=m}hi=lo}return okHex([L,hi*Math.cos(hr),hi*Math.sin(hr)])}
function hexLch(h){const[L,a,b]=hexOk(h);return[L,Math.hypot(a,b),(Math.atan2(b,a)*180/Math.PI+360)%360]}
const dist=(p,q)=>Math.hypot(p[0]-q[0],p[1]-q[1],p[2]-q[2])*100;
const Lof=h=>hexOk(h)[0];
function hslHex(h,s,l){h=(((h%360)+360)%360)/360;const q=l<0.5?l*(1+s):l+s-l*s,p=2*l-q;const f=t=>{if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p};return toHex(f(h+1/3),f(h),f(h-1/3))}
function hexHsl(x){const[r,g,b]=hexRgb(x);const mx=Math.max(r,g,b),mn=Math.min(r,g,b);let h=0,s=0;const l=(mx+mn)/2;if(mx!==mn){const d=mx-mn;s=l>0.5?d/(2-mx-mn):d/(mx+mn);h=(mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4)*60}return[h,s,l]}
function toneOne(h,l,b){if(!l&&!b)return h;let[L,C,H]=hexLch(h);if(l>0)L=L+(0.97-L)*l*0.7;else if(l<0)L=L+(L-0.1)*l*0.7;if(b)C=Math.max(0,C*(1+b*0.85));return lchHex(L,C,H)}
const tone=(cols,l,b)=>cols.map(h=>toneOne(h,l,b));
const readable=h=>{const[L,C,H]=hexLch(h);return L<0.68?lchHex(0.72,Math.max(C,0.06),H):h};

const HUE={red:[355,380],orange:[20,47],yellow:[47,74],green:[74,168],cyan:[168,201],blue:[201,251],violet:[251,280],magenta:[280,355]};
const SAT={neutral:[0.1,0.2],pale:[0.2,0.4],muted:[0.4,0.7],rich:[0.7,1]};const LUM={dark:[0.2,0.4],midtone:[0.4,0.7],light:[0.7,0.9]};
const DIST={hue:{red:3,orange:3,yellow:3,green:3,cyan:3,blue:3,violet:3,magenta:3},sat:{rich:8,muted:8,pale:5,neutral:3},lum:{light:6,midtone:12,dark:6}};
const WORDS={red:[['Oxblood','Garnet'],['Brick','Cardinal'],['Blush','Coral']],orange:[['Rust','Ember'],['Clay','Tangerine'],['Sand','Apricot']],yellow:[['Olive','Mustard'],['Straw','Marigold'],['Cream','Lemon']],green:[['Moss','Forest'],['Sage','Fern'],['Celadon','Mint']],cyan:[['Spruce','Teal'],['Patina','Lagoon'],['Seafoam','Aqua']],blue:[['Slate','Navy'],['Denim','Cobalt'],['Mist','Sky']],violet:[['Plum','Indigo'],['Heather','Iris'],['Lilac','Lavender']],magenta:[['Mulberry','Berry'],['Mauve','Orchid'],['Petal','Pink']]};
const deck=o=>shuffle(Object.entries(o).flatMap(([k,n])=>Array(n).fill(k)));
const cap=s=>s[0].toUpperCase()+s.slice(1);
function hueName(h){const hh=h<20?h+360:h;let hn='red';for(const k in HUE)if(hh>=HUE[k][0]&&hh<HUE[k][1])hn=k;return hn}
function label(x){const[h,s,l]=hexHsl(x);const lu=l<0.4?'dark':l<0.7?'midtone':'light';if(s<0.1)return cap(lu)+' gray';const sn=s<0.2?'neutral':s<0.4?'pale':s<0.7?'muted':'rich';return cap(sn)+' '+lu+' '+hueName(h)}
function word(x){const[h,s,l]=hexHsl(x);const lu=l<0.38?0:l<0.68?1:2;if(s<0.12)return['Charcoal','Stone','Fog'][lu];return WORDS[hueName(h)][lu][s<0.55?0:1]}
function baseName(cols){if(!cols.length)return'';const ch=cols.map(hexLch),oks=cols.map(hexOk);let a=0;ch.forEach((c,i)=>{if(c[1]>ch[a][1])a=i});const wa=word(cols[a]);if(cols.length===1)return wa+' study';let b=-1,bd=-1;cols.forEach((c,i)=>{if(i===a)return;const w=word(c);if(w===wa)return;const d=dist(oks[i],oks[a]);if(d>bd){bd=d;b=i}});return b<0?wa+' tones':wa+' and '+word(cols[b]).toLowerCase()}
function altNames(cols){const ws=[...new Set(cols.map(word))];const out=[];for(let i=0;i<ws.length;i++)for(let j=0;j<ws.length;j++)if(i!==j)out.push(ws[i]+' and '+ws[j].toLowerCase());return out}
function uniqueName(n,skipId){n=(n||'Untitled').trim()||'Untitled';const has=new Set(S.saved.filter(p=>p.id!==skipId).map(p=>p.name));if(!has.has(n))return n;for(const r of['II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'])if(!has.has(n+' '+r))return n+' '+r;return n+' '+(has.size+1)}

const ICON={
check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
discover:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/></svg>',
palettes:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3.5" y="4" width="17" height="6.5" rx="2"/><rect x="3.5" y="13.5" width="17" height="6.5" rx="2"/><path d="M9 4v6.5M14.5 4v6.5M9 13.5V20M14.5 13.5V20"/></svg>',
scan:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V6.5A2.5 2.5 0 0 1 6.5 4H9M15 4h2.5A2.5 2.5 0 0 1 20 6.5V9M20 15v2.5a2.5 2.5 0 0 1-2.5 2.5H15M9 20H6.5A2.5 2.5 0 0 1 4 17.5V15"/><path d="M8 12h8"/></svg>',
library:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="9.5" r="1.7"/><path d="M4 17l5-4.5 3.5 3 3-2.5 4.5 4"/></svg>',
settings:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2.2"/><circle cx="8" cy="17" r="2.2"/></svg>',
camera:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 8.5h3l1.8-2.5h6.4L17 8.5h3v10.5H4z"/><circle cx="12" cy="13.5" r="3.6"/></svg>',
back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
close:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
chev:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
spark:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1-5.1-1.9 5.1-1.9z"/><path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/></svg>',
share:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7.5 8.5L12 4l4.5 4.5"/><path d="M6 12.5v6.5h12v-6.5"/></svg>',
reset:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4h4"/></svg>',
copy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5V6A1.5 1.5 0 0 0 14 4.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/></svg>'
};
const THEMES=[{name:'ColorShare',cols:['#8CABFF','#5FD3A8','#FF8FB8','#FFCC00','#471396','#78B9B5','#1F2A5C','#E9E4F5']},{name:'Ember',cols:['#FF7A59','#FFD166','#FF9EC4','#8FD6E0','#B12C00','#EB5B00','#5A1A00','#FFF1D6']},{name:'Lagoon',cols:['#5BB8E8','#7FD1A3','#F2E8CF','#C3A6FF','#003049','#006494','#0096C7','#E0F7FA']},{name:'Orchid',cols:['#E08AE0','#7FA8FF','#FFC2A1','#8FE6C4','#1A0030','#6A0DAD','#C060C0','#F7E6FF']},{name:'Meadow',cols:['#7FD6A8','#F5C35E','#F09A9A','#9FB2FF','#2D4739','#4E8B6B','#A8C5A0','#F3EED9']}];

const LSx={get(k){try{const v=localStorage.getItem(k);return v==null?undefined:JSON.parse(v)}catch(e){return undefined}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
function load(k,d){let v=LSx.get('cs4_'+k);if(v===undefined)v=LSx.get('cs3_'+k);return v===undefined?d:v}
const SAMPLE=[{name:'Fire and ember',colors:['#B12C00','#EB5B00','#F78D60','#FFCC44'],src:'Color Hunt'},{name:'Orchid night',colors:['#1A0030','#6A0DAD','#C060C0','#F0A8D0'],src:'Color Hunt'},{name:'Ocean drift',colors:['#003049','#006494','#0096C7','#90E0EF'],src:'Color Hunt'},{name:'Sage morning',colors:['#2D4739','#4E8B6B','#A8C5A0','#D8E8D0'],src:'Generated'}];
const IMPORTED=['Color Hunt','Pasted','Khroma','Coolors','Adobe Color'];
const isMine=p=>!!p.mine;
const AUTO_TAGS=['Custom','Discover','Generated','Created','Scanned','Pasted','Color Hunt'];
function srcFromUrl(v){try{const u=new URL(v.trim());const h=u.hostname.replace(/^www\./,'');if(h.includes('colorhunt'))return'Color Hunt';if(h.includes('khroma'))return'Khroma';if(h.includes('coolors'))return'Coolors';if(h.includes('adobe'))return'Adobe Color';return h}catch(e){return'Pasted'}}
const MEM=new Map(),IMG=new Map();
const DB={db:null,
open(){return new Promise(res=>{try{const r=indexedDB.open('colorshare_proto',1);r.onupgradeneeded=()=>{r.result.createObjectStore('photos',{keyPath:'id'})};r.onsuccess=()=>{DB.db=r.result;res(true)};r.onerror=()=>res(false);r.onblocked=()=>res(false)}catch(e){res(false)}})},
st(m){return DB.db.transaction('photos',m).objectStore('photos')},
put(o){MEM.set(o.id,o);if(!DB.db)return Promise.resolve(false);return new Promise(res=>{try{const q=DB.st('readwrite').put(o);q.onsuccess=()=>res(true);q.onerror=()=>res(false)}catch(e){res(false)}})},
all(){if(!DB.db)return Promise.resolve([]);return new Promise(res=>{try{const q=DB.st('readonly').getAll();q.onsuccess=()=>res(q.result||[]);q.onerror=()=>res([])}catch(e){res([])}})},
clear(){MEM.clear();IMG.clear();if(DB.db)try{DB.st('readwrite').clear()}catch(e){}}};
function photoImg(id){if(IMG.has(id))return IMG.get(id);const p=MEM.get(id);if(!p)return Promise.resolve(null);const pr=new Promise(res=>{const im=new Image();im.onload=()=>res(im);im.onerror=()=>res(null);im.src=p.data});IMG.set(id,pr);return pr}
/* Spacing: before showing a colour, compare it with what's already on screen and
   redraw from the same slot if it's a near twin (keeps the balanced mix, stops repeats). */
const GAP=9;
function spaced(make,seen){let best=null,bd=-1;for(let t=0;t<40;t++){const x=make();const o=hexOk(x);let m=99;for(const s of seen){const d=dist(o,s);if(d<m){m=d;if(m<bd)break}}if(m>bd){bd=m;best=[x,o]}if(m>=GAP)break}seen.push(best[1]);return best[0]}
/* Start here: Khroma's balanced deck (every batch gets a fair share of each hue,
   strong to soft, light to dark), with spacing against everything already shown */
function setupBatch(prev){const seen=(prev||S.pool).map(hexOk);const H=deck(DIST.hue),Sa=deck(DIST.sat),Lu=deck(DIST.lum);return H.map((h,i)=>{const r=HUE[h];return spaced(()=>hslHex(rnd(r[0],r[1]),rnd(...SAT[Sa[i]]),rnd(...LUM[Lu[i]])),seen)})}
function fillPool(){S.pool=[];S.pool.push(...setupBatch());S.pool.push(...setupBatch())}
/* Your taste: the 50 picks, plus every colour in palettes you've saved (yours, and any
   favourite). A heart counts as much as a pick; a palette marked "doesn't teach" is skipped. */
let TP=null;const tasteDirty=()=>{TP=null};
function tastePts(){if(TP)return TP;const pts=[];const add=(h,w)=>{const o=hexOk(h);for(const q of pts)if(dist(o,q.o)<3){if(w>q.w)q.w=w;return}pts.push({o,w})};
S.likes.forEach(o=>pts.push({o,w:1}));S.saved.forEach(p=>{if(!(p.mine||p.fav))return;p.colors.forEach(h=>add(h,p.fav?1:0.8))});TP=pts.slice(0,600);return TP}
function taste(o){const P=tastePts();if(!P.length)return 1;let b=0;for(const l of P){const v=l.w*Math.exp(-((dist(o,l.o)/11)**2));if(v>b)b=v}return b}
const HARM=[180,150,210,120,240,30,330];
function onePal(anc,f,N){const n=Math.max(N,anc.length);const lo=rnd(0.22,0.34),hi=rnd(0.86,0.95);const Ls=Array.from({length:n},(_,i)=>lo+(hi-lo)*i/(n-1));const A=anc.map(h=>({hex:h,c:hexLch(h)})).sort((x,y)=>x.c[0]-y.c[0]);const slot=new Array(n).fill(null);
for(const a of A){let bi=0,bd=9;Ls.forEach((L,i)=>{if(slot[i])return;const d=Math.abs(L-a.c[0]);if(d<bd){bd=d;bi=i}});slot[bi]=a;Ls[bi]=a.c[0]}
const hF=pick(A).c[2]+pick(HARM)+rnd(-12,12);
const out=Ls.map((L,i)=>{if(slot[i])return{hex:slot[i].hex,g:false};let na=A[0];A.forEach(a=>{if(Math.abs(a.c[0]-L)<Math.abs(na.c[0]-L))na=a});const src=Math.random()<0.6?na.c:pick(A).c;const C0=src[1],h0=src[2],neu=C0<0.03;let best=null,bs=-1;
for(let t=0;t<4;t++){const far=Math.random()<f*0.85;const h=far?hF+rnd(-10,10):h0+rnd(-1,1)*(6+24*f);const base=neu?0.015+0.07*f*Math.random():C0;const k=L>0.8?rnd(0.3,0.65):L<0.4?rnd(0.55,0.95):rnd(0.75,1.2);const hex=lchHex(L,Math.max(0.008,base*k),h);const sc=taste(hexOk(hex))+Math.random()*0.15;if(sc>bs){bs=sc;best=hex}}return{hex:best,g:true}});
return out.sort((a,b)=>Lof(a.hex)-Lof(b.hex))}
function buildSugg(){const anchors=S.anchors,f=S.far/100;const cs=[];for(let i=0;i<90;i++){let anc=anchors;if(anchors.length>=5)anc=shuffle([...anchors]).slice(0,3+Math.floor(Math.random()*3));const q=onePal(anc,f,5);const oks=q.map(c=>hexOk(c.hex));let md=99;for(let a=0;a<q.length;a++)for(let b=a+1;b<q.length;b++){if(!q[a].g&&!q[b].g)continue;md=Math.min(md,dist(oks[a],oks[b]))}if(md<7)continue;cs.push({p:q.map(c=>c.hex),oks,sc:oks.reduce((s,o)=>s+taste(o),0)/q.length+md/100+Math.random()*0.05})}
cs.sort((a,b)=>b.sc-a.sc);const ch=[];for(const c of cs){if(ch.every(x=>x.p.join()!==c.p.join()&&x.oks.reduce((s,o,i)=>s+dist(o,c.oks[i]),0)/5>9))ch.push(c);if(ch.length===4)break}for(const c of cs){if(ch.length>=4)break;if(!ch.some(x=>x.p.join()===c.p.join()))ch.push(c)}
const used=new Set();S.sugg=ch.map(c=>{let n=baseName(c.p);if(used.has(n)){const alt=altNames(c.p).find(a=>!used.has(a));n=alt||n+' '+['II','III','IV','V'][used.size%4]}used.add(n);return{colors:c.p,name:n}})}
let tT;function toast(m,ms){const t=$('toast');t.textContent=m;t.classList.add('show');clearTimeout(tT);tT=setTimeout(()=>t.classList.remove('show'),ms||2200)}
function fallback(t,cb){const a=document.createElement('textarea');a.value=t;a.setAttribute('readonly','');a.style.position='absolute';a.style.left='-9999px';document.body.appendChild(a);a.select();a.setSelectionRange(0,t.length);let ok=false;try{ok=document.execCommand('copy')}catch(e){}a.remove();cb(ok)}
function copy(t,msg){const d=ok=>toast(ok===false?'Copy blocked here':(msg||(t.length<=7?'Copied '+t:'Copied')));try{if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(()=>d(true),()=>fallback(t,d));return}}catch(e){}fallback(t,d)}
const cssOf=(name,c)=>`/* ${name} · ColorShare */\n:root {\n${c.map((h,i)=>`  --color-${i+1}: ${h};`).join('\n')}\n}`;
/* ---------- share card: the palette drawn as one image (photo, swatches, codes, name) ---------- */
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
function fitText(c,t,max){if(c.measureText(t).width<=max)return t;while(t.length>1&&c.measureText(t+'…').width>max)t=t.slice(0,-1);return t+'…'}
async function makeCard(o){try{await document.fonts.load('700 64px "Bricolage Grotesque"')}catch(e){}
const W=1080,P=60,IN=W-2*P,n=o.colors.length,ph=!!o.img,barH=ph?200:380,codes=!!o.codes,hexSz=codes?Math.round(Math.min(28,IN/n/4.3)):0;
const H=P+(ph?IN+36:0)+barH+(codes?18+hexSz+44:44)+70+20+34+56+34+P;
const cv=document.createElement('canvas');cv.width=W;cv.height=H;const c=cv.getContext('2d');c.fillStyle='#0E0E12';c.fillRect(0,0,W,H);let y=P;
if(ph){c.save();rr(c,P,y,IN,IN,36);c.clip();c.drawImage(o.img,o.crop.x,o.crop.y,o.crop.side,o.crop.side,P,y,IN,IN);c.restore();y+=IN+36}
c.save();rr(c,P,y,IN,barH,32);c.clip();const sw=IN/n;o.colors.forEach((h,i)=>{c.fillStyle=h;c.fillRect(P+i*sw-0.5,y,sw+1,barH)});c.restore();c.textBaseline='top';
if(codes){y+=barH+18;c.textAlign='center';c.fillStyle='#A9A9B6';c.font=`600 ${hexSz}px ui-monospace, SFMono-Regular, Menlo, monospace`;o.colors.forEach((h,i)=>c.fillText(h.slice(1),P+sw*(i+.5),y));y+=hexSz+44}else y+=barH+44;
c.textAlign='left';c.fillStyle='#F3F3F6';c.font='700 64px "Bricolage Grotesque", -apple-system, system-ui, sans-serif';c.fillText(fitText(c,o.name,IN),P,y);y+=70+20;
c.font='700 30px -apple-system, system-ui, sans-serif';c.fillStyle='#D8D8E0';c.fillText(fitText(c,o.src,IN),P,y);y+=34+56;
[['#471396',0,0],['#8CABFF',1,0],['#78B9B5',0,1],['#FFCC00',1,1]].forEach(([col,a,b])=>{c.fillStyle=col;rr(c,P+a*17,y+b*17,15,15,4);c.fill()});
c.fillStyle='#8A8A96';c.font='600 26px -apple-system, system-ui, sans-serif';c.fillText('Made with ColorShare',P+46,y+2);
return new Promise(res=>cv.toBlob(b=>res(b),'image/png'))}
const shareText=(name,cols)=>`${name}\n${cols.join(' ')}\nMade with ColorShare`;
async function openShare(o){o.codes=!!S.shareCodes;toast('Making your card…',1200);const blob=await makeCard(o);if(!blob){sharePal(o.name,o.colors);return}
const file=new File([blob],(o.name||'palette').replace(/[^\w\- ]+/g,'').trim().replace(/\s+/g,'-')+'.png',{type:'image/png'});if(S.shareCard)URL.revokeObjectURL(S.shareCard.url);
S.shareCard={file,url:URL.createObjectURL(blob),text:shareText(o.name,o.colors),name:o.name,src:o};renderSheet2();$('toast').classList.remove('show')}
async function shareSaved(p){let img=null,crop=null;if(p.photoId&&MEM.has(p.photoId)){const im=await photoImg(p.photoId);if(im){const sc=p.scan||{z:1,cx:.5,cy:.5};const iw=im.naturalWidth,ih=im.naturalHeight;const side=Math.min(iw,ih)/(sc.z||1);crop={side,x:clamp(sc.cx*iw,side/2,iw-side/2)-side/2,y:clamp(sc.cy*ih,side/2,ih-side/2)-side/2};img=im}}
openShare({name:p.name,colors:p.colors,src:srcLine(p),img,crop})}
function sharePal(name,cols){const text=`${name}\n${cols.join('  ')}\nMade with ColorShare`;const fb=()=>copy(text,'Copied, ready to paste and share');try{if(navigator.share){navigator.share({title:name,text}).catch(e=>{if(!e||e.name!=='AbortError')fb()});return}}catch(e){}fb()}
function arm(key){if(S.armed===key){S.armed=null;return true}S.armed=key;setTimeout(()=>{if(S.armed===key){S.armed=null;if(S.view==='pal'||S.view==='settings')renderMain()}},3000);return false}

/* ---------- prototype 8: state, sources, theme ---------- */
const LOGO='<svg width="30" height="30" viewBox="0 0 34 34" aria-label="ColorShare logo" role="img"><rect x=".5" y=".5" width="33" height="33" rx="9" fill="#0E0E12" stroke="rgba(255,255,255,.14)"/><rect x="6.5" y="6.5" width="9.5" height="9.5" rx="2.8" fill="#471396"/><rect x="18" y="6.5" width="9.5" height="9.5" rx="2.8" fill="#8CABFF"/><rect x="6.5" y="18" width="9.5" height="9.5" rx="2.8" fill="#78B9B5"/><rect x="18" y="18" width="9.5" height="9.5" rx="2.8" fill="#FFCC00"/></svg>';
const HEART_D='M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z';
Object.assign(ICON,{
heart:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="${HEART_D}"/></svg>`,
shuffle:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h3.5c3 0 4.5 10 8 10H20M4 17h3.5c1.4 0 2.4-2 3.2-4.3M13.3 11.3c.8-2.3 1.8-4.3 3.2-4.3H20"/><path d="M17.5 4.5L20 7l-2.5 2.5M17.5 14.5L20 17l-2.5 2.5"/></svg>',
bars:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 19V13M10 19V9M15 19V6M20 19V3"/></svg>',
match:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.4" fill="currentColor"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/></svg>',
dots:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="7" cy="8" r="2.6"/><circle cx="16" cy="6.5" r="2.6"/><circle cx="10" cy="16" r="2.6"/><circle cx="17.5" cy="15.5" r="2.6"/></svg>',
full:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
undo:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>',
redo:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14l5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/></svg>',
info:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><circle cx="12" cy="7.8" r=".6" fill="currentColor"/></svg>',
heartOn:`<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="${HEART_D}"/></svg>`
});
/* hue families for the Discover filter (HSL hue ranges, neutral = almost no saturation) */
const FAM=[['red','Red',[-20,15],'#E5484D'],['orange','Orange',[15,45],'#F27A2E'],['yellow','Yellow',[45,70],'#F2C230'],['green','Green',[70,170],'#4CAF6A'],['blue','Blue',[170,255],'#3D7BF2'],['purple','Purple',[255,340],'#9B5BE8'],['neutral','Neutrals',null,'#9A9AA5']];
function famOf(h){const[hh,s,l]=hexHsl(h);if(s<0.1||l<0.07||l>0.96)return 6;const x=hh>=340?hh-360:hh;for(let i=0;i<6;i++){const r=FAM[i][2];if(x>=r[0]&&x<r[1])return i}return 0}

const norm=arr=>arr.map(p=>{const q={...p,id:p.id||uid(),created:p.created||Date.now()};if(q.mine===undefined)q.mine=!q.imported&&!IMPORTED.includes(q.src);if(q.mine)q.source=null;else if(!q.source)q.source=q.src||'Imported';q.tags=(q.tags||[]).filter(t=>!AUTO_TAGS.includes(t)&&t!==q.src&&t!==q.source);return q});
/* One source name per phone. Older versions let each palette carry its own, so
   take the most common one as the name if none is set yet. */
const RAW=load('saved',SAMPLE);
function firstCreator(){const c=load('creator','');if(c)return c;const n=new Map(),spell=new Map();RAW.forEach(p=>{const mine=p.mine!==undefined?p.mine:!p.imported&&!IMPORTED.includes(p.src);if(mine&&p.source){const k=p.source.trim().toLowerCase();n.set(k,(n.get(k)||0)+1);if(!spell.has(k))spell.set(k,p.source.trim())}});let best='',bn=0;n.forEach((v,k)=>{if(v>bn){bn=v;best=spell.get(k)}});return best||'A-Frame'}
const kindOf=p=>p.src==='Matched'?'Matched':p.photoId?'Scanned':'Custom';
const srcOf=p=>p.mine?S.creator:(p.source||p.src||'Imported');
const srcLine=p=>p.mine?`${S.creator.toUpperCase()} · ${kindOf(p)}`:srcOf(p);
const srcTagRow=(srcText,tags,ctx)=>`<div class="row" style="margin-top:12px"><span class="srcl sp" style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(srcText)}</span><input type="text" class="taginput" id="${ctx}tag" list="taglist" placeholder="+ Add tag" aria-label="Add tag" enterkeyhint="done" autocomplete="off"></div>${tags.length?`<div class="tagrow" style="margin-top:8px">${tags.map((t,i)=>`<span class="tagc">${esc(t)}<button class="x" data-a="tagdel" data-v="${ctx}:${i}" aria-label="Remove tag ${esc(t)}">${ICON.close}</button></span>`).join('')}</div>`:''}`;

const S={view:'discover',prev:'discover',setupOpen:false,likeHex:load('likes',[]),likes:[],pool:[],stream:[],zoom:load('zoom',5),variety:load('variety',40),hues:new Set(load('hues',[]).filter(k=>FAM.some(f=>f[0]===k))),sl:load('sl',0),sb:load('sb',0),moreOpen:false,dd:null,tasteHinted:load('tasteHinted',false),shareCodes:load('shareCodes',false),fill:load('fill',100),palF:load('palF','all'),helpOn:load('helpOn',true),scanDots:load('scanDots',true),toneOpen:false,pendingSingle:false,gen:null,namer:null,sort:load('sort','random'),draft:null,far:35,sugg:[],anchors:[],saved:norm(RAW),openPh:new Set(load('openph',[])),closedGroups:new Set(load('groups',[])),studio:null,confirm:null,chooser:false,mo:null,theme:load('theme',THEMES[0]),navTheme:load('navTheme','match'),navPick:false,creator:firstCreator(),names:load('names',[]),armed:null,menu:null,q:'',viewer:null,libF:'all',palMode:load('v12',false)?load('palMode','grid'):'grid',cols:load('cols',2),renaming:null,editSrc:false,themeOpen:new Set(['cur','ncur'])};
S.likes=S.likeHex.map(hexOk);
/* imported palettes that carry your own name become yours; drop tags that just repeat your name */
S.saved.forEach(p=>{const me=S.creator.toLowerCase();if(!p.mine&&p.source&&p.source.trim().toLowerCase()===me){p.mine=true;p.source=null}p.tags=p.tags.filter(t=>t.trim().toLowerCase()!==me)});
function persist(){tasteDirty();LSx.set('cs4_v12',true);const ok=LSx.set('cs4_saved',S.saved);const o={likes:S.likeHex,openph:[...S.openPh],groups:[...S.closedGroups],theme:S.theme,navTheme:S.navTheme,creator:S.creator,names:S.names,hues:[...S.hues],sort:S.sort,palMode:S.palMode,cols:S.cols,zoom:S.zoom,variety:S.variety,sl:S.sl,sb:S.sb,tasteHinted:S.tasteHinted,shareCodes:S.shareCodes,palF:S.palF,helpOn:S.helpOn,scanDots:S.scanDots,fill:S.fill};for(const k in o)LSx.set('cs4_'+k,o[k]);return ok}

/* Theme colours: the four most different readable colours in a palette, nudged apart
   if two still look alike, so every bottom bar icon gets its own colour. */
function pickDiverse(cols,n){cols=[...new Set(cols.filter(Boolean))];if(!cols.length)cols=['#8CABFF'];const ok=cols.map(hexOk),ch=cols.map(h=>hexLch(h)[1]);const sel=[ch.indexOf(Math.max(...ch))];while(sel.length<Math.min(n,cols.length)){let bi=-1,bd=-1;cols.forEach((_,i)=>{if(sel.includes(i))return;const d=Math.min(...sel.map(j=>dist(ok[i],ok[j])))+ch[i]*40;if(d>bd){bd=d;bi=i}});sel.push(bi)}return sel.map(i=>cols[i])}
function previewCols(cols){const u=[...new Set((cols||[]).map(h=>h.toUpperCase()))];if(u.length<=6)return u;const keep=new Set(pickDiverse(u,6));return u.filter(h=>keep.has(h))}
function themeCols(cols){const cur=THEMES.find(t=>t.cols.join()===(cols||[]).join());if(cur)return cur.cols.slice(0,4).map(readable);const pv=previewCols(cols);const ok=pv.filter(h=>Lof(h)>=0.62);const base=ok.length>=4?ok:[...ok,...pv.filter(h=>!ok.includes(h)).map(readable)];const c=pickDiverse(base,4);while(c.length<4){const[L,C,h]=hexLch(c[c.length-1]);c.push(readable(lchHex(L,Math.max(C,0.1),h+90)))}
const md=(x,prev)=>Math.min(...prev.map(y=>dist(hexOk(x),hexOk(y))));
/* if a colour is too close to one already chosen, swap in the nearest hue that stands apart */
for(let i=1;i<4;i++){const prev=c.slice(0,i);if(md(c[i],prev)>=14)continue;const[L,C,h]=hexLch(c[i]);let best=c[i],bd=md(c[i],prev);for(let k=1;k<12;k++)for(const LL of[0.76,0.86]){const cand=lchHex(LL,Math.max(C,0.12),h+k*30);const d=md(cand,prev)-k*0.4;if(d>bd){bd=d;best=cand}}c[i]=best}return c}
/* Button fill: filled buttons fade toward black while their outline keeps the full colour */
function applyFill(){const r=document.documentElement.style;const f=clamp(S.fill,0,100)/100;const acc=themeCols(S.theme.cols)[0];const[R,G,B]=hexRgb(acc);const mixed=toHex(R*f,G*f,B*f);r.setProperty('--prifill',mixed);r.setProperty('--priink',Lof(mixed)>0.62?'#0E0E12':'#FFFFFF')}
function applyTheme(){applyFillSoon();const c=themeCols(S.theme.cols);const r=document.documentElement.style;['--c1','--c2','--c3','--c4'].forEach((k,i)=>r.setProperty(k,c[i]));r.setProperty('--acc',c[0]);r.setProperty('--edge',rgba(c[0],.3));r.setProperty('--glow',rgba(c[0],.3));
const nt=S.navTheme;const n=nt==='white'?['#FFFFFF','#FFFFFF','#FFFFFF','#FFFFFF']:(nt&&nt.cols?themeCols(nt.cols):c);['--n1','--n2','--n3','--n4'].forEach((k,i)=>r.setProperty(k,n[i]))}

/* Discover stream: taste-weighted random colours, optionally limited to hue families */
/* one colour from a balanced slot, honouring the hue filter */
function slotHex(hk,sk,lk){const f=[...S.hues];if(f.length){const k=famBy(pick(f));if(!k[2])return hslHex(rnd(0,360),rnd(0,0.09),rnd(0.12,0.95));return hslHex(rnd(k[2][0]+1,k[2][1]-1),rnd(...(sk==='neutral'?SAT.pale:SAT[sk])),rnd(...LUM[lk]))}const r=HUE[hk];return hslHex(rnd(r[0],r[1]),rnd(...SAT[sk]),rnd(...LUM[lk]))}
const sortCols=a=>S.sort==='hue'?a.map(h=>({h,k:famOf(h)*10+Lof(h)})).sort((x,y)=>x.k-y.k).map(x=>x.h):shuffle(a);
/* Discover stream: the same balanced deck. My taste ↔ Variety sets the mix:
   at the middle about 60% of slots go to the colour you'd most likely love (out of
   a dozen tries), the rest are free exploration. Spacing stops repeats. */
function streamBatch(n,prev){const seen=(prev||[]).slice(-300).map(hexOk);const out=[];const tasteShare=tastePts().length?clamp((100-S.variety)/100*1.0,0,0.95):0;
while(out.length<n){const H=deck(DIST.hue),Sa=deck(DIST.sat),Lu=deck(DIST.lum);for(let i=0;i<H.length&&out.length<n;i++){
if(Math.random()<tasteShare){let best=null,bs=-1,far=null,fd=-1;for(let t=0;t<60;t++){const x=slotHex(pick(Object.keys(HUE)),pick(Object.keys(SAT)),pick(Object.keys(LUM)));const o=hexOk(x);let m=99;for(const q of seen){const d=dist(o,q);if(d<m)m=d}if(m>=6){const sc=taste(o);if(sc>bs){bs=sc;best=[x,o]}}else if(m>fd){fd=m;far=[x,o]}}const w=best||far;seen.push(w[1]);out.push(w[0])}
else out.push(spaced(()=>slotHex(H[i],Sa[i],Lu[i]),seen))}}
return sortCols(out)}

function renameCreator(v){v=(v||'').trim();if(!v){toast('Your source name can’t be empty');renderMain();return false}const old=S.creator;if(v===old)return true;if(old&&!S.names.includes(old))S.names.unshift(old);S.names=S.names.filter(n=>n!==v).slice(0,8);S.creator=v;const me=v.toLowerCase();S.saved.forEach(p=>{if(!p.mine&&p.source&&p.source.trim().toLowerCase()===me){p.mine=true;p.source=null}});persist();renderHeader();toast('Your palettes now show '+v);return true}
const srcDatalist=()=>`<datalist id="srclist">${[...new Set([S.creator,...S.names])].map(n=>`<option value="${esc(n)}"></option>`).join('')}</datalist>`;
function allTags(){const c=new Map();S.saved.forEach(p=>(p.tags||[]).forEach(t=>c.set(t,(c.get(t)||0)+1)));return[...c.entries()].sort((a,b)=>b[1]-a[1]).map(e=>e[0])}
function fillTaglist(){const d=$('taglist');if(d)d.innerHTML=allTags().map(t=>`<option value="${esc(t)}"></option>`).join('')}

/* ---------- search and paste (the bar above the bottom nav) ---------- */
function matchQ(p,q){const hay=[p.name,srcOf(p),srcLine(p),kindOf(p),p.src||'',...(p.tags||[]),...p.colors].join(' ').toLowerCase();return q.toLowerCase().split(/\s+/).filter(Boolean).every(w=>hay.includes(w.replace(/^#/,'')))}
const qList=()=>{const q=S.q.trim();return q?S.saved.filter(p=>matchQ(p,q)):[]};
function parsePaste(v){v=(v||'').trim();if(!v)return null;const isUrl=/^https?:\/\//i.test(v);let raw;if(isUrl)raw=(v.includes('/palette/')?(v.split('/palette/')[1]||''):v.replace(/^https?:\/\/[^/]+/i,'')).match(/[0-9a-fA-F]{6}/g);else raw=v.match(/(?:#|\b)[0-9a-fA-F]{6}\b/g);
const cols=[...new Set((raw||[]).map(h=>'#'+h.replace('#','').toUpperCase()))].slice(0,12);if(isUrl&&cols.length<2)return{err:'No colors found in that link. Try copying the hex codes instead.'};if(!isUrl&&!(cols.length>=2||(cols.length===1&&v.startsWith('#'))))return null;return{cols,url:isUrl?v:null,src:isUrl?srcFromUrl(v):null}}
const rrow=p=>`<button class="rrow" data-a="view" data-v="${p.id}" data-ctx="q"><span class="rmini">${p.colors.map(h=>`<div style="background:${h}"></div>`).join('')}</span><span style="min-width:0;flex:1"><span style="display:block;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.name)}</span><span style="display:block;font-size:11px;font-weight:600;letter-spacing:.03em;color:var(--fg2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(srcLine(p))}${(p.tags||[]).length?' · '+p.tags.map(esc).join(', '):''}</span></span></button>`;
function renderResults(){const q=S.q.trim();const box=$('results');const pp=parsePaste(q);
$('sact').innerHTML=(!q?`<button class="btn sm" data-a="pasteq">${ICON.copy}Paste</button>`:'')+(pp&&pp.cols?`<button class="btn sm pri" data-a="addpaste">Add</button>`:'')+(q?`<button class="btn sm ghost icon" data-a="qclear" aria-label="Clear search">${ICON.close}</button>`:'');
if(!q){box.hidden=true;return}const list=qList();box.hidden=false;
const head=pp?(pp.err?`<div class="lbl" style="color:var(--danger);padding:6px 4px 10px">${esc(pp.err)}</div>`:`<div class="rrow" style="cursor:default"><span class="rmini">${pp.cols.map(h=>`<div style="background:${h}"></div>`).join('')}</span><span class="lbl" style="flex:1">Tap <b style="color:var(--fg)">Add</b> to save ${pp.cols.length} color${pp.cols.length===1?'':'s'} as a palette${pp.src?' from '+esc(pp.src):''}</span></div>`):'';
$('resin').innerHTML=head+(list.length?`<div class="lbl" style="padding:4px 4px 2px">${list.length} palette${list.length===1?'':'s'}</div>`+list.map(rrow).join(''):(pp?'':'<div class="lbl" style="padding:10px 4px">No palettes match. Search by name, source, tag or hex code.</div>'))}
function clearSearch(){S.q='';const i=$('q');if(i)i.value='';renderResults()}

/* ---------- slide bars ----------
   trk: a value bar. Touch anywhere and slide; the knob jumps to your finger.
   rel: a nudge bar for fine colour changes. Slide from wherever you touch. */
const TRK={
tl:{get:()=>(S.draft.light+1)/2,set:f=>{S.draft.light=2*f-1;repaintStrip()}},
tb:{get:()=>(S.draft.bold+1)/2,set:f=>{S.draft.bold=2*f-1;repaintStrip()}},
stl:{get:()=>(S.studio.light+1)/2,set:f=>{S.studio.light=2*f-1;repaintStudioTones()}},
stb:{get:()=>(S.studio.bold+1)/2,set:f=>{S.studio.bold=2*f-1;repaintStudioTones()}},
stk:{get:()=>{const m=stMax();return m<=1?1:(Math.min(S.studio.k,m)-1)/(m-1)},set:(f,pad)=>{const m=stMax();const k=Math.round(1+f*(m-1));if(k!==S.studio.k){S.studio.k=k;S.studio.sel=null;renderStChips();drawVP()}}},
sl:{get:()=>(S.sl+1)/2,set:f=>{S.sl=2*f-1;toneStream()},end:()=>persist()},
sb:{get:()=>(S.sb+1)/2,set:f=>{S.sb=2*f-1;toneStream()},end:()=>persist()},
variety:{get:()=>S.variety/100,set:f=>{S.variety=Math.round(f*100)},end:()=>{persist();S.stream=streamBatch(60);paintStream()}},
zoom:{get:()=>(9-S.zoom)/6,set:f=>{const z=Math.round(9-6*f);if(z!==S.zoom){S.zoom=z;const g=$('sgrid');if(g)g.style.gridTemplateColumns=`repeat(${z},minmax(0,1fr))`}},end:()=>persist()},
fill:{get:()=>S.fill/100,set:(f,pad)=>{S.fill=Math.round(f*100);const n=pad.querySelector('.pnum');if(n)n.textContent=S.fill;applyFill()},end:()=>persist()},
far:{get:()=>S.far/100,set:f=>{S.far=Math.round(f*100)},end:()=>{buildSugg();renderMain()}}
};
const applyFillSoon=()=>setTimeout(applyFill,0);
const trk=(id,left,right,o={})=>{const f=clamp(TRK[id].get(),0,1);return`<div class="pad trk${o.slim?' slim':''}" data-trk="${id}" role="slider" aria-label="${esc(left)} or ${esc(right)}"><span>${left}</span>${o.mid?'<span class="pmid"></span>':''}${o.num!=null?`<span class="pnum">${o.num}</span>`:''}<span class="knob" style="left:calc(14px + ${f.toFixed(4)} * (100% - 28px))"></span><span>${right}</span></div>`};
const relPad=(g,k,left,right)=>`<div class="pad rel" data-rel="${g}:${k}" role="slider" aria-label="${left} or ${right}"><span>${left}</span><span class="knob"></span><span>${right}</span></div>`;
const relPads=g=>relPad(g,'L','Darker','Lighter')+relPad(g,'W','Cooler','Warmer')+relPad(g,'C','Less color','More color');
function relAdj(k,b,dx){let L=b.L,C=b.C,h=b.h;
if(k==='L')L=clamp(b.L+dx*0.0008,0.06,0.98);
if(k==='W'){const steps=dx*0.12;const t=steps>0?60:250;const d=((t-b.h+540)%360)-180;h=b.h+Math.sign(d)*Math.min(Math.abs(d),Math.abs(steps));C=b.C<0.02?b.C+Math.min(0.03,Math.abs(dx)*0.0002):b.C}
if(k==='C')C=Math.max(0,b.C+dx*0.0004);return{L,C,h}}
const curMatch=()=>(S.studio&&S.studio.match)||(S.mo&&S.mo.m)||null;
const REL={
m:{get:()=>curMatch(),set:v=>{Object.assign(curMatch(),v);paintMatch()}},
a:{get:()=>{const d=S.draft;if(!d||d.sel==null||!d.base[d.sel])return null;const[L,C,h]=hexLch(d.base[d.sel]);return{L,C,h}},set:v=>{const d=S.draft;d.base[d.sel]=lchHex(v.L,v.C,v.h);repaintStrip()}}
};
let PD=null,lastTouch=0;
function padDown(x,el){const pad=el&&el.closest&&el.closest('.pad');if(!pad)return false;const r=pad.getBoundingClientRect();
if(pad.dataset.trk){const T=TRK[pad.dataset.trk];if(!T)return false;if(['stk','stl','stb'].includes(pad.dataset.trk))stPush();if(pad.dataset.trk==='variety'&&S.likeHex.length<50&&!S.tasteHinted){S.tasteHinted=true;persist();toast('For the best results, keep picking colors in Start here first',3500)}PD={pad,r,trk:T}}
else if(pad.dataset.rel){const[g,k]=pad.dataset.rel.split(':');const R=REL[g];const o=R&&R.get();if(!o)return false;PD={pad,r,rel:R,k,x0:x,base:{L:o.L,C:o.C,h:o.h}}}else return false;
pad.classList.add('act');padMove(x);return true}
function padMove(x){if(!PD)return;const{pad,r}=PD;const kn=pad.querySelector('.knob');
if(PD.trk){const f=clamp((x-r.left-14)/(r.width-28),0,1);if(kn)kn.style.left=`calc(14px + ${f.toFixed(4)} * (100% - 28px))`;PD.trk.set(f,pad)}
else{if(kn)kn.style.left=clamp(x-r.left,8,r.width-8)+'px';PD.rel.set(relAdj(PD.k,PD.base,x-PD.x0))}}
function padUp(){if(!PD)return;const p=PD;PD=null;p.pad.classList.remove('act');if(p.trk&&p.trk.end)p.trk.end()}

/* Match to surface: a compact preview bar, tap the chevron for a big swatch */
const ink=h=>Lof(h)>0.66?'#111':'#fff';
function matchPrev(m){const adj=lchHex(m.L,m.C,m.h);return`<div id="msw" class="mbar${m.big?' big':''}" style="background:${adj}"><span class="mfrom" style="background:${m.orig}" title="Starting color"></span><span class="mono" id="mhex" style="color:${ink(adj)};font-size:13px">${adj}</span><span class="sp"></span>${m.big?`<button class="mchev" data-a="mfull" aria-label="Full screen" style="margin-right:6px">${ICON.full}</button>`:''}<button class="mchev" data-a="mbig" aria-label="${m.big?'Smaller':'Bigger'} preview" aria-expanded="${!!m.big}"><span style="display:inline-flex;transform:rotate(${m.big?180:0}deg)">${ICON.chev}</span></button></div>`}
function paintMatch(){const m=curMatch();if(!m)return;const adj=lchHex(m.L,m.C,m.h);{const f=document.querySelector('#fullc .fcc');if(f)f.style.background=adj;const fh=$('fchex');if(fh)fh.textContent=adj}paintLive();const el=$('msw');if(el)el.style.background=adj;const t=$('mhex');if(t){t.textContent=adj;t.style.color=ink(adj)}}

/* ---------- draft: one editor used everywhere ---------- */
const draftCols=()=>S.draft?tone(S.draft.base,S.draft.light,S.draft.bold):[];
const autoName=()=>baseName(draftCols());
const draftName=()=>{const el=$('dname');const typed=el?el.value.trim():(S.draft.named?S.draft.name:'');return typed||autoName()};
function snapDraft(){S.draft.orig=JSON.stringify({base:S.draft.base,light:S.draft.light,bold:S.draft.bold,name:S.draft.name,named:S.draft.named,tags:S.draft.tags})}
const teachRow=(on,ctx)=>`<button class="teach${on?' on':''}" data-a="teach" data-v="${ctx}" aria-pressed="${on}"><span class="tbox">${on?ICON.check:''}</span><span><b>Teaches my taste</b><span class="lbl" style="display:block">${on?'Discover learns from these colors':'Not used for your taste, like a client’s colors'}</span></span></button>`;
function newDraft(src){S.draft={id:null,base:[],light:0,bold:0,name:'',named:false,src:src||'Created',tags:[],source:null,mine:true,sel:null};snapDraft()}
function addToDraft(hex){if(!S.draft)newDraft('Discover');const b=S.draft.base;const i=b.indexOf(hex);if(i>=0){b.splice(i,1);S.draft.sel=null;return refreshDraft()}if(b.length>=12){toast('A palette holds up to 12 colors');return}const L=Lof(hex);let j=b.findIndex(c=>Lof(c)>L);if(j<0)j=b.length;b.splice(j,0,hex);S.draft.sel=null;refreshDraft()}
const draftSrc=d=>d.mine!==false?`${S.creator.toUpperCase()} · Custom`:(d.source||'Imported');
/* Discover create panel: everything stays locked at the top while the colours scroll below */
const chevI=open=>`<span class="dch" style="transform:rotate(${open?180:0}deg)">${ICON.chev}</span>`;
const famBy=k=>FAM.find(f=>f[0]===k);
function hueBtn(c){const s=[...S.hues];const dots=s.length?s.slice(0,3).map(k=>`<i class="hd" style="background:${famBy(k)[3]}"></i>`).join(''):'<i class="hd rb"></i>';const txt=c?'':(s.length?(s.length===1?famBy(s[0])[1]:s.length+' hues'):'All hues');return`<button class="btn ${c?'ddc':''}${S.dd==='hues'?' open':''}" data-a="dd" data-v="hues" aria-expanded="${S.dd==='hues'}" aria-label="Filter by hue">${dots}${txt}${chevI(S.dd==='hues')}</button>`}
function sortBtn(c){const h=S.sort==='hue';return`<button class="btn ${c?'ddc':''}${S.dd==='sort'?' open':''}" data-a="dd" data-v="sort" aria-expanded="${S.dd==='sort'}" aria-label="Sort colors">${c?ICON[h?'bars':'shuffle']:(h?'By hue':'Random')}${chevI(S.dd==='sort')}</button>`}
function ddPanel(){if(S.dd==='hues')return`<div class="ddpanel"><div class="tagrow"><button class="tagc${S.hues.size?'':' on'}" data-a="hue" data-v="all">All hues</button>${FAM.map(f=>`<button class="tagc hue${S.hues.has(f[0])?' on':''}" data-a="hue" data-v="${f[0]}" aria-pressed="${S.hues.has(f[0])}"><i style="background:${f[3]}"></i>${f[1]}</button>`).join('')}</div><div class="lbl" style="margin-top:8px">Pick one or more. Tap All hues to see everything.</div></div>`;
if(S.dd==='sort')return`<div class="ddpanel"><div class="seg"><button class="${S.sort==='random'?'on':''}" data-a="sort" data-v="random">${ICON.shuffle}Random</button><button class="${S.sort==='hue'?'on':''}" data-a="sort" data-v="hue">${ICON.bars}By hue, dark to light</button></div></div>`;return''}
function discDraftHTML(){const d=S.draft,cols=draftCols(),n=cols.length;const armed=S.armed==='clear';
const chips=n?cols.map((h,i)=>`<div class="chip" data-chip="${i}" style="background:${h}"></div>`).join(''):`<div class="empty">Tap colors below to add them</div>`;
return`<div class="row" style="gap:6px;margin-bottom:8px">${trk('sl','Darker','Lighter',{mid:1,slim:1})}${trk('sb','Softer','Bolder',{mid:1,slim:1})}</div>
<div class="row" style="gap:6px"><button class="btn icon" data-a="cancel" aria-label="Cancel" title="Cancel">${ICON.close}</button><button class="btn pri bigsave" data-a="${d.id?'done':'savenew'}">${d.id?'Done':'Save palette'}</button><button class="btn${armed?' warn':''}" data-a="clearall" style="padding:0 11px">${armed?'Sure?':'Clear'}</button>${hueBtn(true)}${sortBtn(true)}</div>${ddPanel()}
<div class="strip" id="strip" style="margin-top:10px">${chips}</div><div class="row" style="margin-top:5px;min-height:15px"><span class="lbl sp" style="font-size:11.5px">${d.id?'Editing '+esc(d.name)+' · ':''}${n?'Tap to remove · hold and drag to reorder':''}</span><span class="lbl" style="font-size:11.5px">${n}/12</span></div>`}
function draftHTML(mode){if(mode==='disc')return discDraftHTML();const d=S.draft,cols=draftCols(),n=cols.length,editing=!!d.id;if(d.sel!=null&&d.sel>=n)d.sel=null;
const chips=n?cols.map((h,i)=>`<div class="chip${d.sel===i?' sel':''}" data-chip="${i}" style="background:${h}"></div>`).join(''):`<div class="empty">Add colors from Discover</div>`;
const adj=d.sel!=null?`<div class="adj"><div class="row" style="margin-bottom:8px"><span class="lbl">Adjust this color</span><span class="mono sp" id="selhex" style="color:var(--fg)">${cols[d.sel]}</span><button class="btn sm warn" data-a="chipdel">Remove</button><button class="btn sm" data-a="chipdone">Done</button></div>${relPads('a')}<button class="btn sm" data-a="genfrom" style="margin:4px 0 8px">${ICON.spark}Make palettes from this color</button></div>`:'';
return `<div class="row" style="margin-bottom:8px"><span class="lbl sp">${editing?'Editing':'New palette'}</span>${editing?`<button class="btn sm icon round" data-a="resetdraft" aria-label="Undo all changes" title="Undo all changes">${ICON.reset}</button>`:''}<button class="btn sm icon round" data-a="sharedraft" aria-label="Share palette">${ICON.share}</button></div>
<div class="strip" id="strip" style="margin-top:8px">${chips}</div><div class="row" style="margin-top:6px;min-height:16px"><span class="lbl sp">${n?(d.sel!=null?'Slide the bars to change this color':'Tap a color to adjust it · hold and drag to reorder'):''}</span><span class="lbl">${n}/12</span></div><div style="margin-top:10px"><div class="row"><div class="nmwrap"><input type="text" class="name" id="dname" value="${esc(d.named?d.name:'')}" placeholder="${esc(n?autoName():'Name your palette')}" aria-label="Palette name" autocomplete="off"><button class="nmsug" data-a="autoname" title="Suggest another name">Suggest</button></div><button class="btn sm ghost" data-a="clearall" style="padding:0 4px;color:${S.armed==='clear'?'var(--danger)':'var(--fg2)'}">${S.armed==='clear'?'Tap again':'Clear all'}</button></div></div>${adj}
<div style="margin-top:12px">${trk('tl','Darker','Lighter',{mid:1})}${trk('tb','Softer','Bolder',{mid:1})}</div>${srcTagRow(draftSrc(d),d.tags||[],'d')}
<div class="row" style="margin-top:14px"><span class="btn big ghost" aria-hidden="true" style="visibility:hidden">Cancel</span><div class="sp row center"><button class="btn sm" data-a="adddisc">${ICON.plus}Add colors from Discover</button></div></div>
<div class="row" style="margin-top:10px"><button class="btn big ghost" data-a="cancel">Cancel</button><button class="btn big pri" style="flex:1" data-a="${editing?'done':'savenew'}">${editing?'Done':'Save palette'}</button></div>`}
function refreshDraft(){const hosts=document.querySelectorAll('[data-host=draft]');if(!S.draft||!hosts.length){renderMain();return}const nm=$('dname');const typed=nm?nm.value:'';if(nm&&typed.trim()){S.draft.name=typed;S.draft.named=true}hosts.forEach(h=>h.innerHTML=draftHTML(h.dataset.mode));if(S.view==='discover'&&!S.setupOpen)updateChecks()}
function repaintStrip(){const st=$('strip');if(!st||!S.draft)return;const cols=draftCols();[...st.children].forEach((c,i)=>{if(cols[i])c.style.background=cols[i]});const nm=$('dname');if(nm)nm.placeholder=autoName()||'Name your palette';const sh=$('selhex');if(sh&&S.draft.sel!=null)sh.textContent=cols[S.draft.sel]}
function updateChecks(){const set=new Set(S.draft?S.draft.base:[]);document.querySelectorAll('#sgrid .sw').forEach(el=>{const on=set.has(el.dataset.v);if(on&&!el.firstChild)el.innerHTML=`<span class="ck">${ICON.check}</span>`;else if(!on&&el.firstChild)el.innerHTML=''})}

/* ---------- header, nav, main ---------- */
function titleFor(){return{discover:'Discover',pal:'Palettes',match:'Match',settings:'Settings'}[S.view]||''}
function renderHeader(){const h=$('hdr');const logo=`<div class="hlogo">${LOGO}<small>prototype 12</small></div>`;
if(S.view==='build'||S.view==='gen'){h.innerHTML=`<button class="btn sm ghost icon" data-a="back" aria-label="Back" style="margin-left:-8px">${ICON.back}</button><span class="htitle">${S.view==='gen'?'From one color':'Build palettes'}</span>${logo}`;return}
const share=S.view==='discover'&&S.draft?`<button class="btn sm ghost icon" data-a="sharedraft" aria-label="Share palette" style="margin-right:2px">${ICON.share}</button>`:'';
h.innerHTML=`<span class="htitle">${esc(titleFor())}</span>`+share+logo}
function navButtons(v,preview){const nb=(k,icon,label,c)=>`<${preview?'span':'button'} class="nb${v===k?' on':''}" style="--tc:${c}" ${preview?'':`data-a="go" data-v="${k}" aria-label="${label}"`}>${ICON[icon]}<span>${label}</span></${preview?'span':'button'}>`;
return nb('discover','discover','Discover','var(--n1)')+nb('pal','palettes','Palettes','var(--n2)')+(preview?`<span class="scanbtn" style="width:44px;height:44px">${ICON.scan}</span>`:`<button class="scanbtn" data-a="scan" aria-label="Scan a photo">${ICON.scan}</button>`)+nb('match','match','Match','var(--n4)')+nb('settings','settings','Settings','#fff')}
function renderNav(){$('nav').innerHTML=navButtons(S.view==='build'||S.view==='gen'?S.prev:S.view,false)}
let io=null;
function renderMain(){const m=$('main');if(io){io.disconnect();io=null}const v=S.view;renderHeader();
m.innerHTML=v==='discover'?(S.setupOpen?setupHTML():streamHTML()):v==='pal'?palHTML():v==='match'?matchHTML():v==='gen'?genHTML():v==='settings'?settingsHTML():v==='build'?buildHTML():'';
if(v==='discover')watchSentinel();if(v==='pal')hydrateThumbs();fillTaglist()}
function render(){renderHeader();renderNav();renderMain()}
function go(v){if(v!=='build'&&v!=='gen')S.prev=v;S.view=v;S.menu=null;S.renaming=null;S.editSrc=false;clearSearch();render();window.scrollTo(0,0)}

/* ---------- Discover ---------- */
function setupBarHTML(){const n=S.likeHex.length;const picks=[...S.likeHex].sort((a,b)=>Lof(a)-Lof(b));return`<div class="row"><div class="sp"><div class="h2">Pick 50 colors you love</div><div class="lbl" style="margin-top:2px"><b style="color:var(--fg)">${n} of 50</b> · mix hues, darks and lights</div></div><button class="btn ${n>=50?'pri':'out'}" data-a="done50">Done</button></div><div style="display:flex;gap:3px;overflow-x:auto;margin-top:10px;min-height:20px;scrollbar-width:none">${picks.map(h=>`<div role="button" aria-label="Remove ${h}" data-a="like" data-v="${h}" style="flex:0 0 20px;height:20px;border-radius:5px;background:${h}"></div>`).join('')}</div>`}
const setupItem=h=>`<div><div class="sw${S.likeHex.includes(h)?' sel':''}" role="button" aria-label="${label(h)}" data-a="like" data-v="${h}" style="background:${h}"></div><div class="tiny">${label(h)}</div></div>`;
function setupHTML(){return`<div class="sticky" id="sbar">${setupBarHTML()}</div><div class="lbl" style="margin-bottom:14px">Your picks teach Discover what you like, so it shows you more colors you'll love. Tap Done whenever you want a break and finish later.</div><div id="setgrid" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px 9px">${S.pool.map(setupItem).join('')}</div><div id="sent" style="height:40px"></div>`}
const shown=h=>toneOne(h,S.sl,S.sb);
const swc=h=>{const v=shown(h);return`<div class="sw" role="button" aria-label="${v}" data-a="pick" data-b="${h}" data-v="${v}" style="background:${v}">${S.draft&&S.draft.base.includes(v)?`<span class="ck">${ICON.check}</span>`:''}</div>`};
let tsRaf=0;function toneStream(){if(tsRaf)return;tsRaf=requestAnimationFrame(()=>{tsRaf=0;document.querySelectorAll('#sgrid .sw').forEach(el=>{const v=shown(el.dataset.b);el.style.background=v;el.dataset.v=v;el.setAttribute('aria-label',v)});if(S.draft)updateChecks()})}
function discControls(){const n=S.likeHex.length;let s='';
if(n<50)s+=`<button class="btn pri start" data-a="starthere">Start here${n?`<span class="badge">${n}</span>`:''}</button><div class="lbl" style="text-align:center;margin:8px 0 16px">${n?`${n} of 50 picked. Keep going any time to finish setting up your color profile.`:'Pick 50 colors you love so Discover learns your taste.'}</div>`;
s+=`${trk('sl','Darker','Lighter',{mid:1})}${trk('sb','Softer','Bolder',{mid:1})}<button class="btn sm ghost" data-a="more" aria-expanded="${S.moreOpen}" style="padding:0 2px;gap:4px">${chevSpan(S.moreOpen,-90)}Taste and swatch size</button>${S.moreOpen?`<div style="margin-top:8px">${trk('variety','My taste','Variety')}${trk('zoom','Smaller','Bigger')}</div>`:''}`;
s+=`<div class="row center" style="margin:16px 0 18px"><button class="btn big pri" data-a="create" style="min-width:240px">${ICON.plus}Create palette</button></div>`;
s+=`<div class="row" style="margin-bottom:${S.dd?8:14}px">${hueBtn(false)}<span class="sp"></span>${sortBtn(false)}</div>${S.dd?`<div style="margin-bottom:14px">${ddPanel()}</div>`:''}`;return s}
function streamHTML(){const top=S.draft?`<div class="sticky" data-host="draft" data-mode="disc">${draftHTML('disc')}</div>`:discControls();
return top+`<div id="sgrid" style="display:grid;grid-template-columns:repeat(${S.zoom},minmax(0,1fr));gap:5px">${S.stream.map(swc).join('')}</div><div id="sent" style="height:60px;display:flex;align-items:center;justify-content:center" class="lbl">Loading more colors…</div>`}
function paintStream(){const g=$('sgrid');if(g)g.innerHTML=S.stream.map(swc).join('')}
let loading=false;
function watchSentinel(){const s=$('sent');if(!s||!('IntersectionObserver' in window))return;io=new IntersectionObserver(es=>{if(es[0].isIntersecting)loadMore()},{rootMargin:'700px 0px'});io.observe(s)}
function loadMore(){if(loading)return;loading=true;setTimeout(()=>{if(S.view==='discover'){if(S.setupOpen){const b=setupBatch();S.pool.push(...b);const g=$('setgrid');if(g)g.insertAdjacentHTML('beforeend',b.map(setupItem).join(''))}else{const b=streamBatch(40,S.stream);S.stream.push(...b);const g=$('sgrid');if(g)g.insertAdjacentHTML('beforeend',b.map(swc).join(''))}}loading=false},30)}

/* ---------- Palettes ---------- */
function groupsFor(list){const mine=list.filter(isMine),other=list.filter(p=>!isMine(p));const keys=[...new Set([...mine.map(srcOf),...other.map(srcOf)])];return keys.map(k=>({key:'src:'+k,title:k,items:list.filter(p=>srcOf(p)===k)})).filter(g=>g.items.length)}
const palOrder=()=>groupsFor(S.saved).flatMap(g=>g.items);
const swatchRow=(p,act)=>`<div class="pal">${p.colors.map(h=>`<div data-a="${act}" data-v="${act==='copy'?h:p.id}" style="background:${h}" role="button" aria-label="${act==='copy'?'Copy '+h:'Edit '+esc(p.name)}"></div>`).join('')}</div><div class="hexrow mono">${p.colors.map(h=>`<span>${h.slice(1)}</span>`).join('')}</div>`;
const chevSpan=(open,closedDeg)=>`<span style="display:inline-flex;transform:rotate(${open?(closedDeg===-90?0:180):(closedDeg===-90?-90:0)}deg);transition:transform .15s">${ICON.chev}</span>`;
function palCard(p){if(S.draft&&S.draft.id===p.id)return`<div class="card ed" data-host="draft" data-mode="pal">${draftHTML('pal')}</div>`;
const photo=p.photoId&&MEM.has(p.photoId);const open=S.openPh.has(p.id);const armed=S.armed==='del'+p.id;const menu=S.menu===p.id;
const name=S.renaming===p.id?`<input type="text" class="name" id="rn" data-id="${p.id}" value="${esc(p.name)}" aria-label="Rename palette" enterkeyhint="done" autocomplete="off">`:`<button class="nmbtn" data-a="rename" data-v="${p.id}" aria-label="Rename ${esc(p.name)}">${esc(p.name)}</button>`;
return`<div class="card"><div class="row" style="align-items:flex-start">${name}${heartBtn(p)}<button class="btn sm ghost icon" data-a="share" data-v="${p.id}" aria-label="Share ${esc(p.name)}" style="margin:-5px -8px 0 0">${ICON.share}</button></div><div class="srcl" style="margin:2px 0 10px">${esc(srcLine(p))}</div>${swatchRow(p,'copy')}
<div class="row"><button class="btn sm" data-a="menu" data-v="${p.id}" aria-expanded="${menu}">${ICON.copy}Copy${chevSpan(menu,0)}</button><span class="sp"></span><button class="btn sm" data-a="match" data-v="${p.id}">Match</button><button class="btn sm out" data-a="edit" data-v="${p.id}">Edit</button><button class="btn sm ${armed?'warn':'ghost'}" data-a="del" data-v="${p.id}">${armed?'Tap again':'Delete'}</button></div>${menu?copyMenu(p.id):''}
${photo?`<button class="btn sm ghost" data-a="togglephoto" data-v="${p.id}" aria-expanded="${open}" style="padding:0 2px;gap:4px;margin-top:8px">${chevSpan(open,-90)}${open?'Hide photo':'Photo'}</button>${open?`<div class="ph"><canvas data-thumb="${p.id}"></canvas></div>`:''}`:''}</div>`}
/* preview tile: photo on top, a thin dark gap, then the colours (like the full-screen view) */
function tileImg(p){const ph=p.photoId&&MEM.get(p.photoId);const sw=p.colors.map(h=>`<div style="background:${h}"></div>`).join('');return ph?`<div class="img tp"><img src="${ph.thumb}" alt=""><div class="tsw">${sw}</div></div>`:`<div class="img">${sw}</div>`}
const tile=p=>`<div class="lcard" role="button" tabindex="0" data-a="view" data-v="${p.id}" data-ctx="${S.view==='match'?'match':'pal'}">${tileImg(p)}<div class="meta"><div class="nm">${esc(p.name)}</div><div class="row" style="gap:2px;margin-top:2px"><span class="srcl sp" style="font-size:10.5px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(srcLine(p))}</span>${heartBtn(p)}</div></div></div>`;
function palViews(){const v=[['all','All'],['scanned','Scanned'],['custom','Custom']];if(S.saved.some(p=>p.src==='Matched'))v.push(['matched','Matched']);v.push(['fav','Favorites']);[...new Set(S.saved.filter(p=>!isMine(p)).map(srcOf))].forEach(x=>v.push(['src:'+x,x]));return v}
function palList(){const f=S.palF||'all';const l=S.saved;if(f==='custom')return l.filter(p=>p.mine&&!p.photoId);if(f==='scanned')return l.filter(p=>p.mine&&p.photoId&&p.src!=='Matched');if(f==='matched')return l.filter(p=>p.src==='Matched');if(f==='fav')return l.filter(p=>p.fav);if(f.startsWith('src:'))return l.filter(p=>!isMine(p)&&srcOf(p)===f.slice(4));return l}
const palVisible=()=>S.palF==='all'?groupsFor(S.saved).flatMap(g=>g.items):palList();
const gridOf=items=>`<div class="hgrid" style="grid-template-columns:repeat(${S.cols},minmax(0,1fr));margin-bottom:12px">${items.map(tile).join('')}</div>`;
function palHTML(){if(!palViews().some(v=>v[0]===S.palF))S.palF='all';
const top=S.draft&&(!S.draft.id||S.palMode==='grid')?`<div class="card ed" data-host="draft" data-mode="pal">${draftHTML('pal')}</div>`:`<div class="row center" style="margin-bottom:16px"><button class="btn big pri" data-a="createp" style="min-width:230px">${ICON.plus}New palette</button></div>`;
const ctrl=`<div class="row" style="margin-bottom:8px"><div class="seg"><button class="${S.palMode==='list'?'on':''}" data-a="palmode" data-v="list">List</button><button class="${S.palMode==='grid'?'on':''}" data-a="palmode" data-v="grid">Grid</button></div><span class="sp"></span>${S.palMode==='grid'?`<span class="lbl">Columns</span><div class="seg">${[2,3,4].map(n=>`<button class="${S.cols===n?'on':''}" data-a="cols" data-v="${n}" aria-label="${n} columns">${n}</button>`).join('')}</div>`:''}</div>
<div class="row" style="margin-bottom:12px;gap:8px"><span class="lbl" style="flex-shrink:0">View</span><div class="tagscroll" style="margin:0;padding:2px 0 4px;flex:1">${palViews().map(([k,t])=>`<button class="tagc${S.palF===k?' on':''}" data-a="palf" data-v="${esc(k)}">${k==='fav'?ICON.heart:''}${esc(t)}</button>`).join('')}</div></div>`;
let body;if(S.palF==='all'){body=groupsFor(S.saved).map(g=>{const closed=S.closedGroups.has(g.key);return`<button class="grp" data-a="group" data-v="${esc(g.key)}" aria-expanded="${!closed}"><span class="h2 sp" style="text-align:left">${esc(g.title)}</span><span class="lbl">${g.items.length}</span><span class="chev" style="transform:rotate(${closed?-90:0}deg)">${ICON.chev}</span></button>${closed?'':S.palMode==='grid'?gridOf(g.items):g.items.map(palCard).join('')}`}).join('')||'<div class="card"><div class="h2">Your palettes live here</div><div class="lbl" style="margin-top:4px">Scan a photo or tap colors in Discover to make your first one.</div></div>'}
else{const l=palList();body=l.length?(S.palMode==='grid'?gridOf(l):l.map(palCard).join('')):`<div class="card"><div class="h2">${S.palF==='fav'?'No favorites yet':'Nothing here yet'}</div><div class="lbl" style="margin-top:4px">${S.palF==='fav'?'Tap the heart on any palette to keep it here.':'Palettes you make show up here.'}</div></div>`}
return top+ctrl+`<div id="plist">${body}</div><div class="pastebox" id="pastebox" contenteditable="true" role="textbox" aria-label="Paste a screenshot" style="margin-top:20px">Copied a screenshot? Tap here, then Paste</div>`}

async function drawCrop(cv,p){const im=await photoImg(p.photoId);if(!im)return;const dpr=window.devicePixelRatio||1;const W=cv.clientWidth,H=cv.clientHeight||W;if(!W)return;cv.width=W*dpr;cv.height=H*dpr;const sc=p.scan||{z:1,cx:.5,cy:.5};const iw=im.naturalWidth,ih=im.naturalHeight;const side=Math.min(iw,ih)/sc.z;const cx=clamp(sc.cx*iw,side/2,iw-side/2),cy=clamp(sc.cy*ih,side/2,ih-side/2);const ar=W/H;cv.getContext('2d').drawImage(im,cx-side/2,cy-side/ar/2,side,side/ar,0,0,cv.width,cv.height)}
function hydrateThumbs(){document.querySelectorAll('canvas[data-thumb]').forEach(cv=>{const p=S.saved.find(x=>x.id===cv.dataset.thumb);if(p)drawCrop(cv,p)})}

const heartBtn=p=>`<button class="heart${p.fav?' on':''}" data-a="fav" data-v="${p.id}" aria-pressed="${!!p.fav}" aria-label="${p.fav?'Remove from':'Add to'} favorites">${p.fav?ICON.heartOn:ICON.heart}</button>`;
function renderViewer(){const v=S.viewer;const o=$('ov');if(!v){if(!S.studio)o.innerHTML='';lockScroll();return}const p=S.saved.find(x=>x.id===v.ids[v.i]);if(!p){S.viewer=null;renderViewer();return}const ph=p.photoId&&MEM.has(p.photoId);const menu=S.menu==='fs'+p.id;
o.innerHTML=`<div class="fs" id="fs"><div class="fs-top"><button class="btn sm ghost icon" data-a="vclose" aria-label="Close">${ICON.close}</button><span class="lbl sp" style="text-align:center">${v.i+1} of ${v.ids.length}</span><button class="btn sm ghost icon" data-a="share" data-v="${p.id}" aria-label="Share">${ICON.share}</button></div>
<div class="fs-body" id="fsb">${ph?`<div class="fs-ph" data-a="vedit" data-v="${p.id}" role="button" aria-label="Edit this palette" style="margin-bottom:6px"><canvas data-fsthumb="${p.id}"></canvas></div>`:''}<div class="lbl" style="text-align:center;margin:0 0 8px">Tap the ${ph?'photo or ':''}colors to edit</div><div class="pal" style="height:${ph?72:160}px;border-radius:14px">${p.colors.map(h=>`<div data-a="vedit" data-v="${p.id}" style="background:${h}" role="button" aria-label="Edit ${h}"></div>`).join('')}</div><div class="hexrow mono" style="font-size:12px;margin:6px 2px 8px">${p.colors.map(h=>`<span>${h.slice(1)}</span>`).join('')}</div>
<div class="row" style="align-items:center"><h2 class="h1 sp" style="font-size:22px">${esc(p.name)}</h2>${heartBtn(p)}</div><div class="srcl" style="margin-top:2px">${esc(srcLine(p))}</div>${(p.tags||[]).length?`<div class="tagrow" style="margin-top:10px">${p.tags.map(t=>`<span class="tagc">${esc(t)}</span>`).join('')}</div>`:''}<div style="height:12px"></div>
<div class="row"><button class="btn" data-a="menu" data-v="fs${p.id}" aria-expanded="${menu}">${ICON.copy}Copy${chevSpan(menu,0)}</button><span class="sp"></span><button class="btn" data-a="vmatch" data-v="${p.id}">Match</button><button class="btn pri" data-a="vedit" data-v="${p.id}">Edit</button></div>${menu?copyMenu(p.id):''}</div>
<div class="fs-bot"><button class="btn" style="flex:1;height:44px" data-a="vprev">${ICON.back}Previous</button><button class="btn" style="flex:1;height:44px" data-a="vnext">Next<span style="display:inline-flex;transform:rotate(180deg)">${ICON.back}</span></button></div></div>`;
lockScroll();const cv=o.querySelector('canvas[data-fsthumb]');if(cv)drawCrop(cv,p);bindSwipe()}
function bindSwipe(){const el=$('fsb');if(!el)return;let x0=null,y0=null;el.addEventListener('touchstart',e=>{x0=e.touches[0].clientX;y0=e.touches[0].clientY},{passive:true});el.addEventListener('touchend',e=>{if(x0==null)return;const dx=e.changedTouches[0].clientX-x0,dy=e.changedTouches[0].clientY-y0;x0=null;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5)A[dx<0?'vnext':'vprev']()},{passive:true})}
const copyMenu=id=>`<div class="menu"><button data-a="copyhex" data-v="${id}"><div class="t">Copy hex codes</div><div class="d">The codes, ready to paste anywhere</div></button><button data-a="copycss" data-v="${id}"><div class="t">Copy for websites</div><div class="d">Code a web designer pastes in so a site uses these exact colors</div></button><button data-a="paintsoon" class="soon"><div class="t">Match to paint colors</div><div class="d">Coming soon: the nearest paint chips for each color</div></button></div>`;

/* ---------- Settings ---------- */
function themeGroups(kind){const g=[{key:'cur',title:'ColorShare curated',items:THEMES.map((t,i)=>({t,v:`${kind}c:${i}`}))}];const pals=S.saved.filter(p=>p.colors.length>=3);const asT=p=>({t:{name:p.name,cols:[...p.colors]},v:`${kind}p:${p.id}`});
const mine=pals.filter(isMine);if(mine.length)g.push({key:'mine',title:'My palettes',items:mine.map(asT)});
[...new Set(pals.filter(p=>!isMine(p)).map(srcOf))].forEach(s=>g.push({key:'s:'+s,title:s,items:pals.filter(p=>!isMine(p)&&srcOf(p)===s).map(asT)}));return g}
function themeRow(t,v,cur){const on=!!(cur&&cur.cols&&cur.name===t.name&&cur.cols.join()===t.cols.join());return`<button class="theme${on?' on':''}" data-a="theme" data-v="${esc(v)}"><span class="dots8">${previewCols(t.cols).map(c=>`<i style="background:${c}"></i>`).join('')}</span><span class="sp" style="font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.name)}</span>${on?`<span style="color:var(--acc);display:inline-flex">${ICON.check}</span>`:''}</button>`}
function themeList(kind,cur){return themeGroups(kind).map(g=>{const k=kind+g.key;const open=S.themeOpen.has(k);return`<button class="grp" data-a="tgroup" data-v="${esc(k)}" aria-expanded="${open}" style="margin:0 0 8px"><span class="sp" style="text-align:left;font-weight:600">${esc(g.title)}</span><span class="lbl">${g.items.length}</span><span class="chev" style="transform:rotate(${open?0:-90}deg)">${ICON.chev}</span></button>${open?g.items.map(x=>themeRow(x.t,x.v,cur)).join(''):''}`}).join('')}
function settingsHTML(){const n=S.saved.length,m=MEM.size;const armed=S.armed==='reset';const nt=S.navTheme;const lk=S.likeHex.length;
return`<div class="sect"><div class="h2" style="margin-bottom:4px">Your source name</div><div class="lbl" style="margin-bottom:10px">Added to everything you scan, paste or create, the way Color Hunt shows on theirs. Changing it updates all your palettes.</div><input type="text" id="creator" list="srclist" value="${esc(S.creator)}" placeholder="Your name or business, like A-Frame" aria-label="Your source name" autocomplete="off" enterkeyhint="done">${srcDatalist()}</div>
<div class="sect"><div class="h2" style="margin-bottom:4px">Theme</div><div class="lbl" style="margin-bottom:12px">Each row shows that palette's colors. Your buttons and bottom bar icons use four of them, all different.</div>${themeList('',S.theme)}</div>
<div class="sect"><div class="h2" style="margin-bottom:4px">Button fill</div><div class="lbl" style="margin-bottom:10px">Fade the color inside filled buttons. The outline always stays bright. Slide left for black.</div>${trk('fill','Black','Full',{num:S.fill})}<div class="row center" style="margin-top:4px"><span class="btn pri" style="min-width:200px;pointer-events:none">Save palette</span><span class="tagc on" style="pointer-events:none">Selected</span></div></div>
<div class="sect"><div class="h2" style="margin-bottom:4px">Bottom bar icons</div><div class="lbl" style="margin-bottom:10px">Labels stay white. Each icon takes its own color.</div><div class="navprev" aria-hidden="true">${navButtons('',true)}</div><div class="seg"><button class="${nt==='match'&&!S.navPick?'on':''}" data-a="navtheme" data-v="match">Match theme</button><button class="${nt==='white'&&!S.navPick?'on':''}" data-a="navtheme" data-v="white">White</button><button class="${(nt&&nt.cols)||S.navPick?'on':''}" data-a="navtheme" data-v="pick">Own colors</button></div>${(nt&&nt.cols)||S.navPick?`<div style="margin-top:12px">${themeList('n',nt)}</div>`:''}</div>
<div class="sect"><div class="h2" style="margin-bottom:6px">Your taste</div><div class="lbl" style="margin-bottom:10px">${lk} of 50 colors picked${S.saved.filter(p=>p.mine||p.fav).length?`, plus what it learns from your ${S.saved.filter(p=>p.mine||p.fav).length} saved palettes`:''}. Discover uses these to show you colors you'll love. Hearted palettes count extra.</div><button class="btn" data-a="retake">${lk<50?'Continue picking':'Review your picks'}</button></div>
<div class="sect card"><div class="row"><span style="width:10px;height:10px;border-radius:50%;background:#6EC98A;flex-shrink:0"></span><span class="h2">Saved on this phone</span></div><div class="lbl" style="margin-top:6px">${n} palette${n===1?'':'s'} · ${m} photo${m===1?'':'s'}${DB.db?'':' · photos last until you close this page'}</div><div class="lbl" style="margin-top:8px">For now, back up with <b style="color:var(--fg)">Copy my palettes</b> below and paste it into a note. Google Drive backup is next on the list.</div></div>
<div class="sect"><div class="h2" style="margin-bottom:4px">Move or back up your palettes</div><div class="lbl" style="margin-bottom:10px">Copies your palettes and your taste picks. Paste them into a note to keep a backup, or into ColorShare on another device. Photos stay on this device.</div><button class="btn" data-a="exportp">${ICON.copy}Copy my palettes</button><textarea id="impjson" placeholder="Paste copied palettes here" aria-label="Paste palettes to import" style="display:block;height:80px;margin-top:10px;padding:10px 12px;resize:vertical"></textarea><button class="btn" data-a="importp" style="margin-top:8px">Import pasted palettes</button></div>
<div class="sect"><button class="btn ${armed?'warn':''}" data-a="reset">${armed?'Tap again to erase everything':'Reset prototype data'}</button></div>`}

/* ---------- Build ---------- */
function buildHTML(){return`<div class="card"><div class="lbl" style="margin-bottom:8px">From your ${S.anchors.length} color${S.anchors.length===1?'':'s'}${S.anchors.length>5?' · best combinations of them':' · kept in every suggestion'}</div><div class="row" style="gap:3px">${S.anchors.map(h=>`<div style="flex:1;height:30px;border-radius:7px;background:${h}"></div>`).join('')}</div></div>
<div style="margin:8px 0 6px">${trk('far','Close hues','Far hues')}</div><div class="lbl" style="margin-bottom:16px">Close keeps your hues. Far brings in contrasting ones. Moving it makes a fresh set.</div>
${S.sugg.map((p,i)=>`<div class="card"><div class="h2" style="margin-bottom:10px">${esc(p.name)}</div><div class="pal">${p.colors.map(h=>`<div data-a="copy" data-v="${h}" style="background:${h}"></div>`).join('')}</div><div class="hexrow mono">${p.colors.map(h=>`<span>${h.slice(1)}</span>`).join('')}</div><div class="row"><button class="btn pri" data-a="usesugg" data-v="${i}">Use this</button><button class="btn" data-a="savesugg" data-v="${i}">Save as new</button><span class="sp"></span><button class="btn icon" data-a="sharesugg" data-v="${i}" aria-label="Share">${ICON.share}</button></div></div>`).join('')||'<div class="lbl">Add a color or two first.</div>'}
<button class="btn" style="width:100%" data-a="moresugg">More palettes</button>`}

/* ---------- sheets ---------- */
function moHTML(){const mo=S.mo;return`<div class="sheet-bg"><div class="sheet"><div class="handle"></div><div class="row" style="margin-bottom:4px"><span class="h2 sp" style="font-size:20px">Match to surface</span><button class="btn sm ghost icon" data-a="moclose" aria-label="Close">${ICON.close}</button></div><div class="lbl" style="margin-bottom:10px">Tap the color to match. Hold your phone next to the real surface and slide each bar until they look the same.</div><div style="display:flex;gap:3px;margin-bottom:10px">${mo.colors.map((h,i)=>`<div class="stchip${i===mo.ti?' tgt':''}" style="background:${h};height:42px" data-a="moti" data-v="${i}" role="button" aria-label="Match ${h}"></div>`).join('')}</div>${matchPrev(mo.m)}<div style="margin-top:10px">${relPads('m')}</div><div class="row" style="margin-top:2px"><button class="btn big ghost" data-a="mreset">Reset</button><button class="btn big" style="flex:1" data-a="muse">Use this color</button></div><div class="row" style="margin-top:8px"><button class="btn big ghost" data-a="moclose">Cancel</button><button class="btn big pri" style="flex:1" data-a="modone">Done</button></div></div></div>`}
/* ---------- Match tab ---------- */
async function matchSave(what){const st=S.studio;if(!st||!st.match)return;const m=st.match;const adj=lchHex(m.L,m.C,m.h);let colors,name,tags=[];if(what==='palette'){const g=st.live||livePal(adj);if(!g)return;colors=[...g.colors];name=g.name;if(g.roles)tags=['House scheme']}else{colors=[adj];name=`${word(adj)} match`}
const pid=await storePhoto(st);const old=st.editId&&findP(st.editId);const rec={name:old?old.name:name,colors,src:'Matched',matchHex:adj,tags:old?[...(old.tags||[])]:tags,mine:true,source:null,photoId:pid,fav:old?old.fav:undefined,scan:{z:st.z,cx:st.cx,cy:st.cy,k:1,added:[{hex:m.orig,x:m.x??.5,y:m.y??.5}],off:[],light:0,bold:0}};
if(old){rec.newName=name;S.confirm={kind:'match',orig:old.name,colors,rec};renderSheet2();return}matchDone(savePalette(rec,null))}
function matchDone(r){closeStudio();S.confirm=null;renderSheet2();go(S.view==='pal'?'pal':'match');toast('Saved '+r.name)}
function matchHTML(){const ms=S.saved.filter(p=>p.src==='Matched');
return`<div class="card" style="text-align:center;padding:22px 16px 18px"><div style="color:var(--n4);display:flex;justify-content:center;margin-bottom:8px"><span style="width:44px;height:44px;display:inline-flex">${ICON.match}</span></div><div class="h2" style="font-size:20px">Match one exact color</div><div class="lbl" style="margin:6px 0 16px">Photograph a wall, a boat, a fabric. Pick the spot, then fine-tune on a large preview held next to the real thing.</div><button class="btn big pri" style="width:100%;margin-bottom:8px" data-a="matchcam">${ICON.camera}Take photo</button><button class="btn big" style="width:100%" data-a="matchlib">${ICON.library}Choose photo</button></div>
${ms.length?`<div class="row" style="margin:18px 0 10px"><span class="h2 sp">Your matches</span><span class="lbl">${ms.length}</span></div>${gridOf(ms)}`:''}`}
/* ---------- Palettes from one colour: classic colour-harmony rules in OKLCH, ranked by your taste ---------- */
const GEN=[['house','House scheme','Body, trim, accent and door for a building'],['tonal','Tonal','One hue, light to dark'],['analog','Analogous','Neighbouring hues, calm and natural'],['comp','Complementary','One contrasting accent'],['split','Split complementary','Two contrasting accents'],['earthy','Earthy','Softened and weathered']];
const J=a=>rnd(-a,a);const LC=(L,C,h)=>lchHex(clamp(L,.08,.97),Math.max(0,C),((h%360)+360)%360);
function genOne(t,hex){const[L,C,h]=hexLch(hex);const c=Math.max(C,0.02);const byL=a=>a.sort((x,y)=>Lof(x)-Lof(y));
if(t==='house'){const v=pick(['classic','bold','natural']);const strong=C>0.13||L<0.38||L>0.93;const body=strong?LC(clamp(L,.55,.8),C*.5,h):hex;const accent=strong?hex:LC(Math.max(.3,L-.3),Math.min(C*1.15,.13),h+J(6));
const trim=v==='bold'?LC(.27+J(.03),.025,h):LC(.94+J(.02),.012,h+J(10));const door=v==='natural'?LC(.42+J(.05),.07,pick([45,140])+J(15)):LC(v==='bold'?.5:.4,Math.max(Math.min(C,.12),.08),h+180+J(20));
return{colors:[body,trim,accent,door],roles:['Body','Trim','Accent','Door'],variant:v}}
if(t==='tonal'){const Ls=[.26,.42,.6,.76,.92].map(x=>x+J(.03));let k=0,bd=9;Ls.forEach((x,i)=>{if(Math.abs(x-L)<bd){bd=Math.abs(x-L);k=i}});return{colors:Ls.map((x,i)=>i===k?hex:LC(x,c*(x>.85?.45:x<.35?.8:rnd(.85,1.1)),h+J(5)))}}
if(t==='analog'){const Ls=shuffle([.3,.48,.7,.88]);let k=0;return{colors:[-36,-18,0,18,36].map(d=>d===0?hex:LC(Ls[k++]+J(.03),Math.max(c*rnd(.7,1.1),.03),h+d+J(5)))}}
if(t==='comp'){const hc=h+180+J(12);const lt=L>.8;return{colors:byL([LC(lt?L-.45:L-.24,c*.9+(lt?.03:0),h),hex,LC(lt?L-.22:Math.min(.95,L+.22),c*.45+(lt?.02:0),h),LC(.55+J(.08),Math.max(c,.08)*rnd(.8,1.1),hc),LC(lt?.7:.86,.04,hc)])}}
if(t==='split')return{colors:byL([hex,LC(.6+J(.08),Math.max(c,.07),h+150+J(8)),LC(.45+J(.08),Math.max(c,.07),h+210+J(8)),LC(L>.82?.74:.93,L>.82?.03:.015,h),LC(.24,.03,h)])};
return{colors:byL([hex,LC(L>.55?L-.2:L+.2,c*.45,h+J(8)),LC(.86+J(.04),.03,70+J(15)),LC(L>.45&&L<.65?.36:.52+J(.05),.06,55+J(20)),LC(.24,.035,h+J(20))])}}
function genOptions(t,hex){const cs=[];for(let i=0;i<30;i++){const g=genOne(t,hex);const oks=g.colors.map(hexOk);let md=99;for(let a=0;a<oks.length;a++)for(let b=a+1;b<oks.length;b++)md=Math.min(md,dist(oks[a],oks[b]));if(md<(i<20?5:2.5))continue;g.sc=oks.reduce((s,o)=>s+taste(o),0)/oks.length+Math.random()*.15;cs.push(g)}cs.sort((a,b)=>b.sc-a.sc);const out=[];for(const g of cs){if(out.every(o=>o.colors.join()!==g.colors.join()&&(t!=='house'||o.variant!==g.variant)))out.push(g);if(out.length===2)break}
out.forEach(g=>{g.name=t==='house'?`${word(g.colors[0])} house · ${g.variant[0].toUpperCase()+g.variant.slice(1)}`:baseName(g.colors)});return out}
function openGen(hex){S.gen={hex,sets:{}};GEN.forEach(([k])=>S.gen.sets[k]=genOptions(k,hex));go('gen')}
function genHTML(){const G=S.gen;if(!G)return'';return`<div class="card" style="display:flex;gap:14px;align-items:center"><div style="width:64px;height:64px;border-radius:14px;background:${G.hex};flex-shrink:0"></div><div><div class="h2">${esc(word(G.hex))}</div><div class="mono" style="font-size:13px;color:var(--fg);margin-top:2px">${G.hex}</div><div class="lbl" style="margin-top:4px">Every suggestion keeps this color. Ranked by your taste.</div></div></div>
${GEN.map(([k,t,d])=>`<div class="row" style="margin:20px 0 8px"><div class="sp"><div class="h2">${t}</div><div class="lbl">${d}</div></div><button class="btn sm" data-a="gmore" data-v="${k}">More</button></div>${G.sets[k].map((g,i)=>`<div class="card"><div class="h2" style="font-size:15px;margin-bottom:8px">${esc(g.name)}</div><div class="pal" style="height:64px">${g.colors.map(h=>`<div data-a="copy" data-v="${h}" style="background:${h}" role="button" aria-label="Copy ${h}"></div>`).join('')}</div>${g.roles?`<div class="hexrow" style="margin:6px 2px 2px;font-size:11.5px;color:var(--fg)">${g.roles.map(r=>`<span>${r}</span>`).join('')}</div>`:''}<div class="hexrow mono">${g.colors.map(h=>`<span>${h.slice(1)}</span>`).join('')}</div><div class="row"><button class="btn sm pri" data-a="gsave" data-v="${k}:${i}">Save</button><button class="btn sm" data-a="gedit" data-v="${k}:${i}">Edit</button><span class="sp"></span><button class="btn sm icon round" data-a="gshare" data-v="${k}:${i}" aria-label="Share">${ICON.share}</button></div></div>`).join('')}`).join('')}`}
function withSeed(seed,fn){const r=Math.random;let a=seed>>>0;Math.random=()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};try{return fn()}finally{Math.random=r}}
const LIVE=[['best','Best for you'],['tonal','Tonal'],['analog','Analogous'],['comp','Complementary'],['split','Split'],['earthy','Earthy'],['house','House']];
function livePal(hex){const t=S.mt||'best',seed=S.mseed||1;return withSeed(seed,()=>{if(t!=='best')return genOptions(t,hex)[0];let best=null;['tonal','analog','comp','split','earthy'].forEach(k=>{const o=genOptions(k,hex)[0];if(o&&(!best||o.sc>best.sc))best=o});return best})}
const liveStrip=(g,id,h)=>`<div class="pal livepal" id="${id}" style="height:${h}px">${g.colors.map(c=>`<div style="background:${c}"></div>`).join('')}</div>`;
let lvRaf=0;function paintLive(){if(lvRaf)return;lvRaf=requestAnimationFrame(()=>{lvRaf=0;const m=curMatch();if(!m||!(S.studio&&S.studio.single))return;const g=livePal(lchHex(m.L,m.C,m.h));if(!g)return;S.studio.live=g;['livepal','fcpal'].forEach(id=>{const el=$(id);if(!el)return;if(el.children.length!==g.colors.length)el.innerHTML=g.colors.map(c=>`<div style="background:${c}"></div>`).join('');[...el.children].forEach((d,i)=>d.style.background=g.colors[i])});const n=$('livename');if(n)n.textContent=g.name+(g.roles?' · '+g.roles.join(', '):'')})}
function fullColor(hex){const old=$('fullc');if(old)old.remove();const d=document.createElement('div');d.className='fullc'+(S.fsplit?' split':'');d.id='fullc';const live=!!curMatch();const g=live&&S.studio&&S.studio.single?(S.studio.live||livePal(hex)):null;
d.innerHTML=`<div class="fcc" style="background:${hex}"><button class="fcx" data-a="fullclose" aria-label="Close full screen">${ICON.close}</button></div>${S.fsplit&&g?`<div class="fcpal" id="fcpal">${g.colors.map(c=>`<div style="background:${c}"></div>`).join('')}</div>`:''}<div class="fcpanel"><div class="row" style="margin-bottom:8px"><span class="mono sp" id="fchex" style="font-size:14px;color:#fff">${hex}</span>${g?`<button class="btn sm${S.fsplit?' pri':''}" data-a="fsplit">${S.fsplit?'Split on':'Split'}</button>`:''}${live?'<button class="btn sm ghost" data-a="mreset" style="color:#fff">Reset</button>':''}</div>${live?relPads('m'):''}</div>`;document.body.appendChild(d)}
async function storePhoto(st){let pid=st.photoId;if(pid)return pid;pid=uid();let q=0.82,data=st.src.toDataURL('image/jpeg',q);while(data.length>150000&&q>0.5){q-=0.08;data=st.src.toDataURL('image/jpeg',q)}const t=document.createElement('canvas');t.width=t.height=240;const side=Math.min(st.iw,st.ih);t.getContext('2d').drawImage(st.src,(st.iw-side)/2,(st.ih-side)/2,side,side,0,0,240,240);const ok=await DB.put({id:pid,data,thumb:t.toDataURL('image/jpeg',0.8),created:Date.now()});if(!ok&&!DB.db)toast('Photo kept for this visit only',2500);return pid}
function renderSheet2(){const o=$('ov2');
if(S.chooser){o.innerHTML=`<div class="sheet-bg" data-a="chooseclose"><div class="sheet"><div class="handle"></div><div class="h2" style="font-size:20px;margin-bottom:14px">Scan colors</div><button class="choice" data-a="takephoto">${ICON.camera}<span><span class="h2" style="display:block">Take photo</span><span class="lbl">Opens your camera</span></span></button><button class="choice" data-a="chooselib">${ICON.library}<span><span class="h2" style="display:block">Photo library</span><span class="lbl">Photos and screenshots you already have</span></span></button><button class="btn big ghost" style="width:100%" data-a="chooseclose">Cancel</button></div></div>`;lockScroll();return}
if(S.confirm){const c=S.confirm;o.innerHTML=`<div class="sheet-bg" data-a="cconfirm"><div class="sheet"><div class="handle"></div><div class="h2" style="font-size:20px">Save changes to ${esc(c.orig)}?</div><div class="lbl" style="margin:4px 0 14px">Overwrite replaces the original. Save as new keeps both.</div><div class="pal" style="height:46px;margin-bottom:18px">${c.colors.map(h=>`<div style="background:${h};cursor:default"></div>`).join('')}</div><button class="btn big pri" style="width:100%;margin-bottom:10px" data-a="overwrite">Overwrite</button><button class="btn big" style="width:100%;margin-bottom:6px" data-a="saveasnew">Save as new</button><button class="btn big ghost" style="width:100%" data-a="cconfirm">Cancel</button></div></div>`;lockScroll();return}
if(S.shareCard){const sc=S.shareCard;o.innerHTML=`<div class="sheet-bg" data-a="shareclose" style="z-index:60"><div class="sheet"><div class="handle"></div><div class="row" style="margin-bottom:10px"><span class="h2 sp" style="font-size:20px">Share ${esc(sc.name)}</span><button class="btn sm ghost icon" data-a="shareclose" aria-label="Close">${ICON.close}</button></div><img class="sharecard" src="${sc.url}" alt="${esc(sc.name)} palette card"><button class="teach${S.shareCodes?' on':''}" data-a="sharecodestoggle" aria-pressed="${!!S.shareCodes}" style="margin:10px 0 12px"><span class="tbox">${S.shareCodes?ICON.check:''}</span><span><b>Include hex codes</b><span class="lbl" style="display:block">${S.shareCodes?'Printed on the card and sent as text you can copy':'A clean card with just the photo and colors'}</span></span></button><button class="btn big pri" style="width:100%;margin-bottom:8px" data-a="sharego">${ICON.share}Share card</button><button class="btn big" style="width:100%" data-a="sharecodes">${ICON.copy}Copy hex codes</button></div></div>`;lockScroll();return}
if(S.namer){const nm=S.namer;o.innerHTML=`<div class="sheet-bg" data-a="namecancel"><div class="sheet"><div class="handle"></div><div class="h2" style="font-size:20px;margin-bottom:12px">Name your palette</div><div class="pal" style="height:46px;margin-bottom:14px">${nm.colors.map(h=>`<div style="background:${h};cursor:default"></div>`).join('')}</div><div class="row"><input type="text" class="name" id="nmin" value="${esc(nm.name)}" aria-label="Palette name" autocomplete="off" enterkeyhint="done"><button class="btn sm" data-a="namealt">Suggest</button></div><div class="lbl" style="margin:6px 0 16px">Keep this name, type your own, or tap Suggest for another.</div><div class="row"><button class="btn big ghost" data-a="namecancel">Back</button><button class="btn big pri" style="flex:1" data-a="namesave">Save palette</button></div></div></div>`;lockScroll();return}
if(S.mo){o.innerHTML=moHTML();lockScroll();return}
o.innerHTML='';lockScroll()}
function lockScroll(){document.body.style.overflow=(S.studio||S.confirm||S.chooser||S.viewer||S.mo||S.namer||S.shareCard)?'hidden':''}
function savePalette(rec,overwriteId){if(overwriteId){const i=S.saved.findIndex(p=>p.id===overwriteId);rec.name=uniqueName(rec.name,overwriteId);rec.id=overwriteId;rec.created=S.saved[i].created;if(rec.fav===undefined)rec.fav=S.saved[i].fav;S.saved[i]=rec}else{rec.name=uniqueName(rec.name);rec.id=uid();rec.created=Date.now();S.saved.unshift(rec)}if(!persist())toast('Storage is full. Delete a few palettes or photos.',3500);return rec}
function openFile(f){const single=S.pendingSingle;S.pendingSingle=false;const url=URL.createObjectURL(f);const im=new Image();im.onload=()=>{openStudio({img:im,single});URL.revokeObjectURL(url)};im.onerror=()=>{toast('That image could not be opened. Try a JPEG or PNG.');URL.revokeObjectURL(url)};im.src=url}
function region(){const st=S.studio;const side=Math.min(st.iw,st.ih)/st.z;const cx=clamp(st.cx*st.iw,side/2,st.iw-side/2),cy=clamp(st.cy*st.ih,side/2,st.ih-side/2);st.cx=cx/st.iw;st.cy=cy/st.ih;return{side,x:cx-side/2,y:cy-side/2}}
function sampleImg(x,y){const st=S.studio;const r=Math.max(1,Math.round(region().side/180));const x0=clamp(Math.round(x)-r,0,st.iw-1),y0=clamp(Math.round(y)-r,0,st.ih-1);const w=Math.max(1,Math.min(st.iw-x0,2*r+1)),h=Math.max(1,Math.min(st.ih-y0,2*r+1));const d=st.sctx.getImageData(x0,y0,w,h).data;let R=0,G=0,B=0,n=0;for(let i=0;i<d.length;i+=4){R+=lin(d[i]/255);G+=lin(d[i+1]/255);B+=lin(d[i+2]/255);n++}return toHex(gam(R/n),gam(G/n),gam(B/n))}
/* Scan colours: a ranked list of candidates, so the colour slider just takes the top N.
   1) main areas: k-means in OKLab (farthest-point start) on a 120px grid
   2) accent pass: small vivid areas (bright blues, yellows…) clustered separately so they
      aren't averaged away into the big areas
   3) ranking mixes area, vividness and difference from colours already picked */
function kmeans(px,K,iters){const mean=[0,1,2].map(j=>px.reduce((s,p)=>s+p[j],0)/px.length);let md=px.map(p=>dist(p,mean));const cs=[];for(let n=0;n<K&&n<px.length;n++){let bi=0;for(let i=1;i<px.length;i++)if(md[i]>md[bi])bi=i;cs.push([...px[bi]]);for(let i=0;i<px.length;i++){const dd=dist(px[i],cs[n]);md[i]=n===0?dd:Math.min(md[i],dd)}}
const cnt=new Array(cs.length).fill(0);for(let it=0;it<iters;it++){const sum=cs.map(()=>[0,0,0,0]);for(const p of px){let b=0,bd=1e9;for(let j=0;j<cs.length;j++){const c2=cs[j];const dd=(p[0]-c2[0])**2+(p[1]-c2[1])**2+(p[2]-c2[2])**2;if(dd<bd){bd=dd;b=j}}const s=sum[b];s[0]+=p[0];s[1]+=p[1];s[2]+=p[2];s[3]++}sum.forEach((s,j)=>{if(s[3])cs[j]=[s[0]/s[3],s[1]/s[3],s[2]/s[3]];cnt[j]=s[3]})}
return cs.map((o,j)=>({o,n:cnt[j]})).filter(c=>c.n>0)}
function mergeNear(cl,th){cl.sort((a,b)=>b.n-a.n);const mg=[];for(const c of cl){const m=mg.find(z=>dist(z.o,c.o)<th);if(m){const t=m.n+c.n;m.o=m.o.map((v,j)=>(v*m.n+c.o[j]*c.n)/t);m.n=t;if(c.vivid)m.vivid=Math.max(m.vivid||0,c.vivid)}else mg.push({...c,o:[...c.o]})}return mg}
function extractCands(){const st=S.studio;const r=region();const N=120;const t=document.createElement('canvas');t.width=N;t.height=N;const x=t.getContext('2d',{willReadFrequently:true});x.drawImage(st.src,r.x,r.y,r.side,r.side,0,0,N,N);const d=x.getImageData(0,0,N,N).data;const px=[];for(let i=0;i<d.length;i+=4)px.push(rgbOk(d[i]/255,d[i+1]/255,d[i+2]/255));const T=px.length;
let cand=mergeNear(kmeans(px,14,10),7).filter(c=>c.n/T>=0.008);
const viv=px.filter(p=>Math.hypot(p[1],p[2])>=0.065);
if(viv.length>=T*0.003){const ac=mergeNear(kmeans(viv,8,8),8).filter(c=>c.n/T>=0.002);for(const a of ac){const C=Math.hypot(a.o[1],a.o[2]);let near=null,nd=99;for(const c of cand){const dd=dist(c.o,a.o);if(dd<nd){nd=dd;near=c}}
if(nd>=11)cand.push({o:a.o,n:a.n,accent:1})}}
const sc=cand.map(c=>{const C=Math.hypot(c.o[1],c.o[2]);return{...c,C,base:Math.sqrt(c.n/T)*(1+8*C)}});const out=[];
while(sc.length&&out.length<16){let bi=0,bv=-1;sc.forEach((c,i)=>{const dm=out.length?Math.min(...out.map(o=>dist(o.o,c.o))):40;const v=c.base*Math.min(1,dm/26)**2;if(v>bv){bv=v;bi=i}});out.push(sc.splice(bi,1)[0])}
return out.map(c=>{let bi=0,bd=1e9;for(let i=0;i<T;i++){const d2=(px[i][0]-c.o[0])**2+(px[i][1]-c.o[1])**2+(px[i][2]-c.o[2])**2;if(d2<bd){bd=d2;bi=i}}const u=((bi%N)+.5)/N,v=(Math.floor(bi/N)+.5)/N;return{hex:okHex(c.o),pct:Math.max(1,Math.round(c.n/T*100)),o:c.o,x:(r.x+u*r.side)/st.iw,y:(r.y+v*r.side)/st.ih}})}
/* The palette is exactly what the chips show: your picks first, then the best scan
   colours, up to the number on the slider. Colours you removed stay out even if moving
   the photo shifts their exact shade a little. */
function stLists(){const st=S.studio;const offO=st.off.map(hexOk);const inc=[];const has=o=>inc.some(c=>dist(hexOk(c.hex),o)<4);
for(const a of st.added){if(inc.length>=st.k)break;if(!inc.some(c=>c.hex===a.hex))inc.push({hex:a.hex,man:true,x:a.x,y:a.y})}
for(const c of st.auto){if(inc.length>=st.k)break;const o=hexOk(c.hex);if(offO.some(q=>dist(q,o)<6)||has(o))continue;inc.push({hex:c.hex,man:false,x:c.x,y:c.y})}
inc.sort((x,y)=>Lof(x.hex)-Lof(y.hex));return{all:inc,inc,incSet:new Set(inc.map(c=>c.hex))}}
/* how many colours the slider can reach: your picks plus every distinct scan colour */
function stMax(){const st=S.studio;const offO=st.off.map(hexOk);const seen=[];st.added.forEach(a=>seen.push(hexOk(a.hex)));let n=seen.length;for(const c of st.auto){const o=hexOk(c.hex);if(offO.some(q=>dist(q,o)<6)||seen.some(q=>dist(q,o)<4))continue;seen.push(o);n++}return clamp(n,1,12)}
const stFinal=()=>{const st=S.studio;return tone(stLists().inc.map(c=>c.hex),st.light,st.bold)};
function stNameInput(){const el=$('stn');if(el)S.studio.name=el.value;return S.studio.name.trim()}
/* photo gestures: touch events on phones (most reliable on iPhone), mouse on desktop */
function bindVP(){const vp=$('vp');if(!vp)return;let g=null;const lp=$('lp'),lpt=$('lpt'),lpc=$('lpc');
const W=()=>vp.clientWidth;const toImg=(px,py)=>{const r=region();return[r.x+px/W()*r.side,r.y+py/W()*r.side]};
const hideHint=()=>{};
const rel=(x,y)=>{const r=vp.getBoundingClientRect();return[x-r.left,y-r.top]};
const hideLoupe=()=>{lp.style.display='none';lpt.style.display='none';const rt=$('ret');if(rt)rt.style.display='none'};
/* Magnifier like a real one: your finger is the handle, the glass floats just above it, and the
   colour is read at the exact centre of the glass, over the spot it is showing on the photo. */
const LS=118,LIFT=LS/2+30;
function loupeAt(px,py){const st=S.studio;const Wd=W();const sx=clamp(px,0,Wd-1),sy=clamp(py-LIFT,0,Wd-1);const[ix,iy]=toImg(sx,sy);const hex=sampleImg(ix,iy);g.hex=hex;g.ix=ix;g.iy=iy;const dpr=window.devicePixelRatio||1;
lp.style.display='block';lpt.style.display='none';lp.style.left=(sx-LS/2)+'px';lp.style.top=(sy-LS/2)+'px';lp.style.boxShadow=`0 0 0 5px ${hex}, 0 10px 26px rgba(0,0,0,.55)`;
lpc.width=LS*dpr;lpc.height=LS*dpr;const c=lpc.getContext('2d');c.imageSmoothingEnabled=false;c.fillStyle='#000';c.fillRect(0,0,lpc.width,lpc.height);
const rs=region().side*(LS/Wd)/3;const s0x=ix-rs/2,s0y=iy-rs/2;const cx0=Math.max(0,s0x),cy0=Math.max(0,s0y),cx1=Math.min(st.iw,s0x+rs),cy1=Math.min(st.ih,s0y+rs);const k=lpc.width/rs;
if(cx1>cx0&&cy1>cy0)c.drawImage(st.src,cx0,cy0,cx1-cx0,cy1-cy0,(cx0-s0x)*k,(cy0-s0y)*k,(cx1-cx0)*k,(cy1-cy0)*k);
const m=lpc.width/2;c.lineWidth=2*dpr;c.strokeStyle='rgba(0,0,0,.6)';c.beginPath();c.arc(m,m,8*dpr,0,Math.PI*2);c.stroke();c.strokeStyle='#fff';c.lineWidth=1.2*dpr;c.beginPath();c.arc(m,m,6.5*dpr,0,Math.PI*2);c.stroke()}
function down(pts){const st=S.studio;if(!st)return;hideHint();
if(pts.length===1){const[x,y]=pts[0];if(g&&g.t)clearTimeout(g.t);g={mode:'pend',sx:x,sy:y,lx:x,ly:y,cx:st.cx,cy:st.cy,t:setTimeout(()=>{if(g&&g.mode==='pend'){g.mode='loupe';loupeAt(g.lx,g.ly);if(navigator.vibrate)try{navigator.vibrate(8)}catch(_){}}},280)}}
else if(pts.length>=2){if(g&&g.t)clearTimeout(g.t);hideLoupe();const[a,b]=pts;g={mode:'pinch',d0:Math.hypot(a[0]-b[0],a[1]-b[1])||1,z0:st.z,m0:[(a[0]+b[0])/2,(a[1]+b[1])/2],cx:st.cx,cy:st.cy}}}
function move(pts){const st=S.studio;if(!g||!st)return;
if(pts.length>=2&&g.mode!=='pinch'){down(pts);return}
if(g.mode==='pinch'&&pts.length>=2){const[a,b]=pts;const d=Math.hypot(a[0]-b[0],a[1]-b[1]);st.z=clamp(g.z0*d/g.d0,1,10);const side=Math.min(st.iw,st.ih)/st.z;const mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];st.cx=g.cx-(mid[0]-g.m0[0])/W()*side/st.iw;st.cy=g.cy-(mid[1]-g.m0[1])/W()*side/st.ih;drawVP();runExtract(160);return}
const[x,y]=pts[0];if(g.mode==='pend'){g.lx=x;g.ly=y;if(Math.hypot(x-g.sx,y-g.sy)>8){clearTimeout(g.t);g.mode='pan'}}
if(g.mode==='pan'){const side=region().side;st.cx=g.cx-(x-g.sx)/W()*side/st.iw;st.cy=g.cy-(y-g.sy)/W()*side/st.ih;drawVP();runExtract(140)}
else if(g.mode==='loupe'){g.lx=x;g.ly=y;loupeAt(x,y)}}
function up(remaining,cancelled){const st=S.studio;if(!g||!st)return;if(g.t)clearTimeout(g.t);
if(g.mode==='loupe'){hideLoupe();if(!cancelled&&st.match){const[L,C,h]=hexLch(g.hex);Object.assign(st.match,{orig:g.hex,L,C,h,x:g.ix/st.iw,y:g.iy/st.ih});renderStudio()}else if(!cancelled){const L=stLists();if(L.inc.length>=12&&!st.added.some(a=>a.hex===g.hex))toast('This palette is full at 12 colors');else if(!st.added.some(a=>a.hex===g.hex)){stPush();const n0=L.inc.length;st.added.push({hex:g.hex,x:g.ix/st.iw,y:g.iy/st.ih});st.k=Math.min(12,n0+1);st.sel=g.hex;drawVP();renderStudio()}}g=null;return}
if(g.mode==='pinch'){if(remaining.length===1){g={mode:'idle'}}else{g=null;runExtract(0)}return}
if(g.mode==='pend'&&!cancelled&&!st.hinted){st.hinted=true;toast('Press and hold to pick a color')}
if(g.mode==='pan')runExtract(0);if(!remaining.length)g=null}
/* Pointer events: the browser gives each finger's position relative to the photo itself
   (offsetX/Y), the same point it uses to decide what you touched, so the magnifier sits
   exactly under your finger even inside the Claude app on iPhone. */
const PT=new Map();const pts=()=>[...PT.values()];
const posOf=e=>{if(typeof e.offsetX==='number'&&(e.target===vp||e.target===vp.querySelector('canvas')))return[e.offsetX,e.offsetY];return rel(e.clientX,e.clientY)};
vp.addEventListener('pointerdown',e=>{e.preventDefault();try{vp.setPointerCapture(e.pointerId)}catch(_){}PT.set(e.pointerId,posOf(e));const p=pts();if(g&&g.mode==='idle'&&p.length===1)return;down(p)});
vp.addEventListener('pointermove',e=>{if(!PT.has(e.pointerId))return;e.preventDefault();PT.set(e.pointerId,posOf(e));if(g&&g.mode==='idle')return;move(pts())});
const pend=(e,cancel)=>{if(!PT.has(e.pointerId))return;PT.delete(e.pointerId);try{vp.releasePointerCapture(e.pointerId)}catch(_){}const r=pts();if(g&&g.mode==='idle'){if(!r.length){g=null;runExtract(0)}return}up(r,cancel)};
vp.addEventListener('pointerup',e=>pend(e,false));vp.addEventListener('pointercancel',e=>pend(e,true));
vp.addEventListener('touchstart',e=>e.preventDefault(),{passive:false});vp.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});
vp.addEventListener('gesturestart',e=>e.preventDefault());vp.addEventListener('contextmenu',e=>e.preventDefault());
vp.addEventListener('wheel',e=>{e.preventDefault();const st=S.studio;st.z=clamp(st.z*(e.deltaY<0?1.08:1/1.08),1,10);drawVP();runExtract(160)},{passive:false})}
document.addEventListener('gesturestart',e=>{if(S.studio)e.preventDefault()});
/* ---------- scan studio ---------- */
function stPush(){const st=S.studio;if(!st)return;st.hist=st.hist||[];st.hist.push(JSON.stringify(snapSt()));if(st.hist.length>60)st.hist.shift();st.fut=[]}
function stRestore(snap){const st=S.studio;Object.assign(st,JSON.parse(snap));st.sel=null;st.auto=extractCands();drawVP();renderStudio()}
const snapSt=()=>{const s=S.studio;return{z:s.z,cx:s.cx,cy:s.cy,k:s.k,added:s.added,off:s.off,light:s.light,bold:s.bold,name:s.name,tags:s.tags}};
function openStudio(o){const im=o.img;const iw0=im.naturalWidth||im.width,ih0=im.naturalHeight||im.height;const sc=Math.min(1,1200/Math.max(iw0,ih0));const src=document.createElement('canvas');src.width=Math.round(iw0*sc);src.height=Math.round(ih0*sc);const sctx=src.getContext('2d',{willReadFrequently:true});sctx.drawImage(im,0,0,src.width,src.height);
const s=o.scan||{};S.studio={src,sctx,iw:src.width,ih:src.height,photoId:o.photoId||null,editId:o.editId||null,z:s.z||1,cx:s.cx??.5,cy:s.cy??.5,k:s.k||5,added:(s.added||[]).map(a=>({...a})),off:[...(s.off||[])],light:s.light||0,bold:s.bold||0,name:o.name||'',tags:o.tags?[...o.tags]:[],auto:[],match:null,hinted:!!o.editId,wantMatch:!!o.wantMatch,single:!!o.single,matchHex:o.matchHex||null,first:true,sel:null,teach:o.teach!==false};S.studio.orig=JSON.stringify(snapSt());
$('ov').innerHTML=`<div class="sheet-bg"><div class="sheet" id="sheet"><div class="handle"></div><div class="row" style="margin-bottom:8px"><span class="h2 sp" style="font-size:20px" id="sttitle">${o.single?'Match a color':o.wantMatch?'Match to surface':o.editId?'Edit scan':'New scan'}</span><button class="btn sm ghost icon" data-a="stclose" aria-label="Close">${ICON.close}</button></div><div class="vpw${o.wantMatch||o.single?' short':''}" id="vpw"><div class="vp" id="vp"><canvas id="vpc"></canvas></div>${o.single||o.wantMatch?'':`<button class="dotsbtn${S.scanDots?' on':''}" data-a="scandots" aria-pressed="${S.scanDots}" aria-label="Show or hide scan points">${ICON.dots}</button>`}<div class="loupe" id="lp"><canvas id="lpc"></canvas></div><div class="loupetag" id="lpt"></div></div><div class="lbl phhint${S.helpOn||o.single||o.wantMatch?'':' gone'}" id="vphint">${o.single||o.wantMatch?'Press and hold, then move the magnifier over the color to match':'Press and hold the photo, then move the magnifier over a color to add it'}</div><div id="stdyn" style="margin-top:6px"><div class="empty" style="height:54px">Reading colors…</div></div></div></div>`;
lockScroll();requestAnimationFrame(()=>{drawVP();runExtract();bindVP()})}
function closeStudio(){S.studio=null;$('ov').innerHTML='';lockScroll()}
function drawVP(){const st=S.studio;if(!st)return;const cv=$('vpc');if(!cv)return;const vpw=$('vpw'),vp=$('vp');const W=Math.round(vpw?vpw.clientWidth:cv.clientWidth),dpr=window.devicePixelRatio||1;if(!W)return;if(vp&&vp.style.height!==W+'px'){vp.style.height=W+'px';cv.style.width=W+'px';cv.style.height=W+'px'}if(cv.width!==Math.round(W*dpr)){cv.width=Math.round(W*dpr);cv.height=Math.round(W*dpr)}const ctx=cv.getContext('2d');const r=region();ctx.drawImage(st.src,r.x,r.y,r.side,r.side,0,0,cv.width,cv.height);
if(S.scanDots&&!st.single)stLists().inc.forEach(c=>{if(c.x==null)return;const px=(c.x*st.iw-r.x)/r.side*cv.width,py=(c.y*st.ih-r.y)/r.side*cv.height;if(px<0||py<0||px>cv.width||py>cv.height)return;const on=st.sel===c.hex;const rad=(on?13:c.man?9:7.5)*dpr;if(on){ctx.beginPath();ctx.arc(px,py,rad+6*dpr,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,.35)';ctx.fill()}ctx.beginPath();ctx.arc(px,py,rad,0,Math.PI*2);ctx.fillStyle=c.hex;ctx.fill();ctx.lineWidth=(on?3.5:2.2)*dpr;ctx.strokeStyle='#fff';ctx.stroke()})}
let exT;function runExtract(delay){clearTimeout(exT);exT=setTimeout(()=>{const st=S.studio;if(!st)return;st.auto=extractCands();
if(st.first){st.first=false;requestAnimationFrame(drawVP);if(st.single){const r=region();const hx=st.matchHex||sampleImg(r.x+r.side/2,r.y+r.side/2);const[L,C,h]=hexLch(hx);st.match={tgt:null,orig:hx,L,C,h,big:true,x:(r.x+r.side/2)/st.iw,y:(r.y+r.side/2)/st.ih};renderStudio();return}if(st.wantMatch){st.wantMatch=false;const L=stLists();if(L.inc.length){startMatch(L.inc[0].hex);return}}renderStudio();return}
if(st.match)renderMatchChips();else renderStChips()},delay||0)}
function stChipsHTML(){const st=S.studio;const L=stLists();const fin=tone(L.inc.map(c=>c.hex),st.light,st.bold);const ti=new Map(L.inc.map((c,i)=>[c.hex,fin[i]]));
return`<div style="display:flex;gap:3px">${L.inc.map(c=>`<div class="stchip${st.sel===c.hex?' sel':''}" role="button" aria-label="${st.sel===c.hex?'Remove':'Select'} ${c.hex}" data-a="sttoggle" data-v="${c.hex}" style="background:${ti.get(c.hex)}">${st.sel===c.hex?`<span class="chx">${ICON.close}</span>`:c.man&&S.scanDots?'<span class="dot"></span>':''}</div>`).join('')||'<div class="empty" style="height:54px">No colors found</div>'}</div>
${S.helpOn?`<div class="lbl sthint">${st.sel?'Double-tap a color to remove it':'Tap a color to see where it came from · double-tap to remove'}</div>`:''}<div class="row" style="margin-top:${S.helpOn?2:8}px"><button class="btn sm icon round infobtn${S.helpOn?' on':''}" data-a="helptoggle" aria-pressed="${S.helpOn}" aria-label="${S.helpOn?'Hide':'Show'} tips">${ICON.info}</button><span class="sp"></span><button class="btn sm icon round" data-a="stundo" aria-label="Undo" ${st.hist&&st.hist.length?'':'disabled style="opacity:.35"'}>${ICON.undo}</button><button class="btn sm icon round" data-a="stredo" aria-label="Redo" ${st.fut&&st.fut.length?'':'disabled style="opacity:.35"'}>${ICON.redo}</button><button class="btn sm icon round" data-a="streset" aria-label="Reset to how it was">${ICON.reset}</button><button class="btn sm icon round" data-a="stshare" aria-label="Share palette">${ICON.share}</button></div>`}
function renderStChips(){const c=$('stc');if(c)c.innerHTML=stChipsHTML();drawVP();const pn=document.querySelector('[data-trk=stk] .pnum');if(pn&&S.studio)pn.textContent=stLists().inc.length;const n=$('stn');if(n)n.placeholder=baseName(stFinal())||'Name your palette'}
function matchChipsHTML(){const st=S.studio;return stLists().inc.map(c=>`<div class="stchip${c.hex===st.match.tgt?' tgt':''}" style="background:${c.hex};height:40px" data-a="mtgt" data-v="${c.hex}" role="button" aria-label="Match ${c.hex}"></div>`).join('')}
function renderMatchChips(){const el=$('mchips');if(el)el.innerHTML=matchChipsHTML()}
function renderStudio(){const st=S.studio;if(!st)return;const host=$('stdyn');if(!host)return;stNameInput();
const w=$('vpw');const sh=!!st.match;if(w&&w.classList.contains('short')!==sh){w.classList.toggle('short',sh);requestAnimationFrame(drawVP)}
const t=$('sttitle');if(t)t.textContent=st.single?'Match a color':st.match?'Match to surface':st.editId?'Edit scan':'New scan';
if(st.single&&st.match){const g=st.live=livePal(lchHex(st.match.L,st.match.C,st.match.h));host.innerHTML=`<div class="lbl" style="margin-bottom:8px;text-align:center">Hold screen next to the target color. Adjust sliders to match.</div>${matchPrev(st.match)}
${g?'<div style="margin-top:14px">'+liveStrip(g,'livepal',46)+'</div>':''}<div class="row" style="margin:4px 0 10px"><span class="lbl sp" id="livename" style="font-size:12px">${g?esc(g.name)+(g.roles?' · '+g.roles.join(', '):''):''}</span><button class="btn sm icon round" data-a="mshuffle" aria-label="Another palette">${ICON.shuffle}</button></div>
<div class="row" style="margin-bottom:10px"><button class="btn sm ghost" data-a="mreset">${ICON.reset}Reset</button><span class="sp"></span><button class="btn sm" data-a="msplit">${ICON.palettes}Split screen</button></div>${relPads('m')}
<div class="lbl" style="margin:12px 0 6px">Palette style</div><div class="tagscroll" style="margin-bottom:6px">${LIVE.map(([k,t])=>`<button class="tagc${(S.mt||'best')===k?' on':''}" data-a="mtype" data-v="${k}">${t}</button>`).join('')}</div><div class="row center"><button class="btn sm ghost" data-a="mgen">More palette ideas</button></div>
<div class="row stbar"><button class="btn big ghost" data-a="stclose" style="padding:0 10px">Cancel</button><button class="btn big" data-a="msave" style="padding:0 12px">Save color</button><button class="btn big pri" style="flex:1;padding:0 10px" data-a="msavepal">Save palette</button></div>`;return}
if(st.match){host.innerHTML=`<div class="lbl" style="margin-bottom:8px">Tap the color to match. Hold your phone next to the surface and slide each bar. Press and hold the photo to sample another spot.</div><div id="mchips" style="display:flex;gap:3px;margin-bottom:10px">${matchChipsHTML()}</div>${matchPrev(st.match)}<div style="margin-top:10px">${relPads('m')}</div><div class="row" style="margin-top:2px"><button class="btn big ghost" data-a="matchback">Back</button><button class="btn big ghost" data-a="mreset">Reset</button><button class="btn big pri" style="flex:1" data-a="muse">Use this color</button></div>`;return}
const fin=stFinal();
host.innerHTML=`<div id="stc">${stChipsHTML()}</div><div style="margin-top:12px">${trk('stk','Fewer','More',{num:stLists().inc.length})}</div><button class="btn sm ghost" data-a="toneopen" aria-expanded="${S.toneOpen}" style="padding:0 2px;gap:4px">${chevSpan(S.toneOpen,-90)}Darker · Lighter · Softer · Bolder${st.light||st.bold?' (changed)':''}</button>${S.toneOpen?`<div style="margin-top:8px">${trk('stl','Darker','Lighter',{mid:1})}${trk('stb','Softer','Bolder',{mid:1})}</div>`:''}
<div class="nmwrap" style="margin-top:14px"><input type="text" id="stn" class="name" value="${esc(st.name)}" placeholder="${esc(baseName(fin)||'Name your palette')}" aria-label="Palette name" autocomplete="off"><button class="nmsug" data-a="stauto" title="Suggest another name">Suggest</button></div>${srcTagRow(S.creator.toUpperCase()+' · Scanned',st.tags,'s')}
<div class="row stbar"><button class="btn big ghost" data-a="stclose">Cancel</button><button class="btn big pri" style="flex:1" data-a="stsave">${st.editId?'Done':'Save palette'}</button></div>`}
function repaintStudioTones(){const st=S.studio;const L=stLists();const fin=tone(L.inc.map(c=>c.hex),st.light,st.bold);const m=new Map(L.inc.map((c,i)=>[c.hex,fin[i]]));document.querySelectorAll('#stc .stchip').forEach(el=>{if(m.has(el.dataset.v))el.style.background=m.get(el.dataset.v)});const n=$('stn');if(n)n.placeholder=baseName(fin)||'Name your palette'}
function startMatch(hex){const st=S.studio;stNameInput();const[L,C,h]=hexLch(hex);st.match={tgt:hex,orig:hex,L,C,h,big:false};renderStudio()}
/* Use this color: replaces the colour you were matching (a picked colour changes in place,
   an automatic one is left out and the matched colour is added in its place) */
function studioUse(){const st=S.studio,m=st.match;const adj=lchHex(m.L,m.C,m.h);const a=st.added.find(x=>x.hex===m.tgt);if(a)a.hex=adj;else{if(m.tgt&&!st.off.includes(m.tgt))st.off.push(m.tgt);if(!st.added.some(x=>x.hex===adj))st.added.push({hex:adj,x:null,y:null})}st.match=null;drawVP();renderStudio();toast('Color updated')}
async function saveStudio(overwrite){const st=S.studio;const colors=stFinal();if(!colors.length){toast('Leave at least one color in');return}const typed=stNameInput();
let pid=st.photoId;if(!pid){pid=uid();let q=0.82,data=st.src.toDataURL('image/jpeg',q);while(data.length>150000&&q>0.5){q-=0.08;data=st.src.toDataURL('image/jpeg',q)}const t=document.createElement('canvas');t.width=t.height=240;const side=Math.min(st.iw,st.ih);t.getContext('2d').drawImage(st.src,(st.iw-side)/2,(st.ih-side)/2,side,side,0,0,240,240);const ok=await DB.put({id:pid,data,thumb:t.toDataURL('image/jpeg',0.8),created:Date.now()});if(!ok&&!DB.db)toast('Photo kept for this visit only',2500)}
const rec={name:typed||baseName(colors),colors,src:'Scanned',tags:[...st.tags],mine:true,source:null,teach:st.teach!==false,photoId:pid,scan:{z:st.z,cx:st.cx,cy:st.cy,k:st.k,added:st.added,off:st.off,light:st.light,bold:st.bold}};
const saved=savePalette(rec,overwrite?st.editId:null);closeStudio();S.confirm=null;renderSheet2();go('pal');toast('Saved as '+saved.name)}
async function editScanPalette(p,wantMatch){const im=await photoImg(p.photoId);if(!im){if(wantMatch)return false;toast('Photo not found on this phone. Editing colors only.');startEditDraft(p);return}openStudio({img:im,photoId:p.photoId,editId:p.id,scan:p.scan,name:p.name,tags:p.tags,teach:p.teach,wantMatch});return true}
function startEditDraft(p){S.draft={id:p.id,base:[...p.colors],light:0,bold:0,name:p.name,named:true,src:p.src,tags:[...(p.tags||[])],source:p.source,mine:p.mine,sel:null,teach:p.teach!==false};snapDraft();S.menu=null;S.closedGroups.delete('src:'+srcOf(p));if(S.view!=='pal')go('pal');else renderMain();setTimeout(()=>{const el=document.querySelector('[data-host=draft]');if(el)el.scrollIntoView({block:'center',behavior:'smooth'})},30)}

/* ---------- actions ---------- */
const findP=v=>S.saved.find(x=>x.id===v);
/* Suggest: step through other fitting names, never repeating the current one */
function nextName(cols,cur){const opts=[...new Set([baseName(cols),...altNames(cols)])].filter(Boolean);if(!opts.length)return cur;const i=opts.indexOf(cur);return opts[(i+1)%opts.length]===cur&&opts.length>1?opts[(i+2)%opts.length]:opts[(i+1)%opts.length]}
function keepDraftName(){const el=$('dname');if(el&&el.value.trim()){S.draft.name=el.value;S.draft.named=true}}
function resetMatch(m){const[L,C,h]=hexLch(m.orig);Object.assign(m,{L,C,h})}
const reMatch=()=>{if(S.studio&&S.studio.match)renderStudio();else renderSheet2()};
const A={
go:v=>{S.armed=null;go(v)},
back:()=>go(S.prev),
scan:()=>{S.pendingSingle=false;S.chooser=true;renderSheet2()},
matchcam:()=>{S.pendingSingle=true;const c=$('cam');c.value='';c.click()},
matchlib:()=>{S.pendingSingle=true;const f=$('file');f.value='';f.click()},
mfull:()=>{S.fsplit=false;const m=curMatch();if(m)fullColor(lchHex(m.L,m.C,m.h))},
mtype:v=>{S.mt=v;renderStudio()},
mshuffle:()=>{S.mseed=(S.mseed||1)+1;renderStudio()},
msplit:()=>{S.fsplit=true;const m=curMatch();if(m)fullColor(lchHex(m.L,m.C,m.h))},
fsplit:()=>{S.fsplit=!S.fsplit;const m=curMatch();if(m)fullColor(lchHex(m.L,m.C,m.h))},
msave:async()=>{matchSave('color')},
msavepal:async()=>{matchSave('palette')},
mgen:()=>{const m=curMatch();if(!m)return;const hx=lchHex(m.L,m.C,m.h);closeStudio();openGen(hx)},
gmore:v=>{S.gen.sets[v]=genOptions(v,S.gen.hex);renderMain()},
gsave:v=>{const[k,i]=v.split(':');const g=S.gen.sets[k][+i];const r=savePalette({name:g.name,colors:[...g.colors],src:'Generated',tags:g.roles?['House scheme']:[],mine:true,source:null});toast('Saved as '+r.name)},
gedit:v=>{const[k,i]=v.split(':');const g=S.gen.sets[k][+i];newDraft('Generated');S.draft.base=[...g.colors];S.draft.name=g.name;S.draft.named=true;go('pal');window.scrollTo(0,0)},
gshare:v=>{const[k,i]=v.split(':');const g=S.gen.sets[k][+i];openShare({name:g.name,colors:g.colors,src:'Made from '+S.gen.hex})},
genfrom:()=>{const d=S.draft;if(!d||d.sel==null)return;openGen(draftCols()[d.sel])},
scandots:()=>{S.scanDots=!S.scanDots;persist();const b=document.querySelector('.dotsbtn');if(b){b.classList.toggle('on',S.scanDots);b.setAttribute('aria-pressed',S.scanDots)}drawVP();renderStChips()},
helptoggle:()=>{S.helpOn=!S.helpOn;persist();const h=$('vphint');if(h&&!(S.studio&&(S.studio.single||S.studio.match)))h.classList.toggle('gone',!S.helpOn);renderStChips()},
toneopen:()=>{S.toneOpen=!S.toneOpen;renderStudio()},
chooseclose:()=>{S.chooser=false;renderSheet2()},
takephoto:()=>{S.chooser=false;renderSheet2();const c=$('cam');c.value='';c.click()},
chooselib:()=>{S.chooser=false;renderSheet2();const f=$('file');f.value='';f.click()},
/* Discover */
starthere:()=>{S.setupOpen=true;if(!S.pool.length)fillPool();renderMain();window.scrollTo(0,0)},
like:v=>{const i=S.likeHex.indexOf(v);if(i>=0)S.likeHex.splice(i,1);else S.likeHex.push(v);S.likes=S.likeHex.map(hexOk);persist();document.querySelectorAll(`#setgrid .sw[data-v="${v}"]`).forEach(el=>el.classList.toggle('sel',i<0));const b=$('sbar');if(b)b.innerHTML=setupBarHTML()},
done50:()=>{const n=S.likeHex.length;S.setupOpen=false;S.stream=streamBatch(60);renderMain();window.scrollTo(0,0);toast(n>=50?'Discover now follows your taste':n?`${n} picks saved. Carry on any time from Start here.`:'Pick colors any time from Start here')},
retake:()=>{S.setupOpen=true;if(!S.pool.length)fillPool();go('discover')},
hue:v=>{if(v==='all'){S.hues.clear();S.dd=null}else if(S.hues.has(v))S.hues.delete(v);else S.hues.add(v);persist();S.stream=streamBatch(60);renderMain()},
sort:v=>{S.sort=v;S.dd=null;persist();S.stream=sortCols([...S.stream]);renderMain()},
dd:v=>{S.dd=S.dd===v?null:v;renderMain()},
more:()=>{S.moreOpen=!S.moreOpen;renderMain()},
create:()=>{newDraft('Discover');S.dd=null;renderMain();window.scrollTo(0,0)},
createp:()=>{newDraft('Created');S.dd=null;go('discover')},
pick:v=>addToDraft(v),
/* editor */
autoname:()=>{const el=$('dname');if(!el)return;el.value=nextName(draftCols(),el.value||el.placeholder);S.draft.name=el.value;S.draft.named=true},
build:()=>{const c=draftCols();if(!c.length){toast('Add at least one color first');return}keepDraftName();S.anchors=c;buildSugg();go('build')},
adddisc:()=>{keepDraftName();S.setupOpen=false;if(!S.stream.length)S.stream=streamBatch(60);go('discover');toast('Tap colors to add them')},
sharedraft:()=>{const c=draftCols();if(!c.length){toast('Add a color first');return}openShare({name:draftName(),colors:c,src:S.draft.mine!==false?`${S.creator.toUpperCase()} · Custom`:(S.draft.source||'')})},
clearall:()=>{if(!S.draft.base.length)return;if(!arm('clear')){refreshDraft();return}S.draft.base=[];S.draft.sel=null;S.draft.light=S.draft.bold=0;refreshDraft()},
chipdel:()=>{const d=S.draft;if(!d||d.sel==null)return;d.base.splice(d.sel,1);d.sel=null;refreshDraft()},
chipdone:()=>{if(S.draft){S.draft.sel=null;refreshDraft()}},
cancel:()=>{const wasEdit=S.draft&&S.draft.id;S.draft=null;renderMain();if(wasEdit)toast('Changes discarded')},
savenew:()=>{const c=draftCols();if(!c.length){toast('Add at least one color first');return}if(!$('dname')){S.namer={colors:c,name:uniqueName(baseName(c)),alts:altNames(c),ai:0};renderSheet2();const i=$('nmin');if(i){i.focus();i.select()}return}const r=savePalette({name:draftName(),colors:c,src:S.draft.src||'Created',tags:[...(S.draft.tags||[])],mine:true,source:null});S.draft=null;go('pal');toast('Saved as '+r.name)},
done:()=>{const c=draftCols();if(!c.length){toast('A palette needs at least one color');return}S.draft.pendingName=draftName();const p=findP(S.draft.id);S.confirm={kind:'draft',orig:p?p.name:'palette',colors:c};renderSheet2()},
resetdraft:()=>{if(!S.draft||!S.draft.orig)return;Object.assign(S.draft,JSON.parse(S.draft.orig));S.draft.sel=null;const el=$('dname');if(el)el.value=S.draft.named?S.draft.name:'';refreshDraft();toast('Back to how it was')},
overwrite:()=>{const c=S.confirm;if(!c)return;if(c.kind==='studio'){saveStudio(true);return}if(c.kind==='match'){const r=c.rec;delete r.newName;matchDone(savePalette(r,S.studio.editId));return}
if(c.kind==='mo'){const p=findP(S.mo.id);const r=savePalette({...p,colors:c.colors},p.id);S.mo=null;S.confirm=null;renderSheet2();renderMain();toast('Saved '+r.name);return}
const p=findP(S.draft.id);const r=savePalette({...p,name:S.draft.pendingName,colors:c.colors,tags:[...(S.draft.tags||[])],teach:S.draft.teach!==false},S.draft.id);S.draft=null;S.confirm=null;renderSheet2();go('pal');toast('Saved as '+r.name)},
saveasnew:()=>{const c=S.confirm;if(!c)return;if(c.kind==='studio'){saveStudio(false);return}if(c.kind==='match'){const r={...c.rec,name:c.rec.newName,fav:undefined};delete r.newName;matchDone(savePalette(r,null));return}
if(c.kind==='mo'){const p=findP(S.mo.id)||{};const r=savePalette({name:p.name||baseName(c.colors),colors:c.colors,src:p.mine&&p.src?p.src:'Created',tags:[...(p.tags||[])],mine:true,source:null});S.mo=null;S.confirm=null;renderSheet2();go('pal');toast('Saved as '+r.name);return}
const p=findP(S.draft.id)||{};const r=savePalette({name:S.draft.pendingName,colors:c.colors,src:p.mine&&p.src?p.src:'Created',tags:[...(S.draft.tags||[])],mine:true,source:null,teach:S.draft.teach!==false});S.draft=null;S.confirm=null;renderSheet2();go('pal');toast('Saved as '+r.name)},
cconfirm:()=>{S.confirm=null;renderSheet2()},
teach:v=>{const o=v==='d'?S.draft:S.studio;if(!o)return;o.teach=o.teach===false;if(v==='d')refreshDraft();else renderStudio()},
namecancel:()=>{S.namer=null;renderSheet2()},
namealt:()=>{const nm=S.namer;if(!nm)return;const pool=nm.alts.filter(a=>a!==nm.name);if(!pool.length){toast('No other suggestions for these colors');return}nm.name=uniqueName(pool[nm.ai++%pool.length]);const i=$('nmin');if(i)i.value=nm.name},
namesave:()=>{const nm=S.namer;if(!nm)return;const i=$('nmin');const name=(i&&i.value.trim())||nm.name;const r=savePalette({name,colors:nm.colors,src:S.draft.src||'Discover',tags:[...(S.draft.tags||[])],mine:true,source:null});S.namer=null;S.draft=null;renderSheet2();go('pal');toast('Saved as '+r.name)},
pasteq:()=>{const q=$('q');const fail=()=>{q.focus();toast('Tap and hold in the search bar, then tap Paste',3200)};try{if(navigator.clipboard&&navigator.clipboard.readText){navigator.clipboard.readText().then(t=>{t=(t||'').trim();if(!t){fail();return}q.value=t;S.q=t;renderResults()},fail);return}}catch(e){}fail()},
/* build */
usesugg:v=>{const p=S.sugg[+v];if(!S.draft)newDraft('Generated');S.draft.base=[...p.colors];S.draft.sel=null;S.draft.light=S.draft.bold=0;go(S.prev);toast('Loaded into your palette')},
savesugg:v=>{const p=S.sugg[+v];const r=savePalette({name:p.name,colors:[...p.colors],src:'Generated',tags:[],mine:true,source:null});toast('Saved as '+r.name)},
sharesugg:v=>{const p=S.sugg[+v];sharePal(p.name,p.colors)},
moresugg:()=>{buildSugg();renderMain()},
/* palettes */
copy:v=>copy(v),
menu:v=>{S.menu=S.menu===v?null:v;if(S.viewer)renderViewer();else renderMain()},
copyhex:v=>{const p=findP(v);if(p)copy(p.colors.join(', '),'Copied hex codes');S.menu=null;S.viewer?renderViewer():renderMain()},
copycss:v=>{const p=findP(v);if(p)copy(cssOf(p.name,p.colors),'Copied website code');S.menu=null;S.viewer?renderViewer():renderMain()},
paintsoon:()=>toast('Paint matching is coming next'),
share:v=>{const p=findP(v);if(p)shareSaved(p)},
edit:v=>{const p=findP(v);if(!p)return;S.armed=null;if(p.src==='Matched'&&p.photoId){photoImg(p.photoId).then(im=>{if(im)openStudio({img:im,photoId:p.photoId,editId:p.id,scan:p.scan,name:p.name,single:true,matchHex:p.matchHex||p.colors[0]});else startEditDraft(p)});return}if(p.photoId)editScanPalette(p);else startEditDraft(p)},
del:v=>{if(!arm('del'+v)){renderMain();return}const p=findP(v);S.saved=S.saved.filter(x=>x.id!==v);if(S.draft&&S.draft.id===v)S.draft=null;persist();renderMain();toast('Deleted '+(p?p.name:''))},
togglephoto:v=>{if(S.openPh.has(v))S.openPh.delete(v);else S.openPh.add(v);persist();renderMain()},
group:v=>{if(S.closedGroups.has(v))S.closedGroups.delete(v);else S.closedGroups.add(v);persist();renderMain()},
palf:v=>{S.palF=v;persist();renderMain()},
palmode:v=>{S.palMode=v;persist();renderMain()},
cols:v=>{S.cols=+v;persist();renderMain()},
rename:v=>{S.renaming=v;S.menu=null;renderMain();const i=$('rn');if(i){i.focus();i.select()}},
fav:v=>{const p=findP(v);if(!p)return;p.fav=!p.fav;persist();if(S.viewer)renderViewer();if(S.view==='pal'||S.view==='match')renderMain();toast(p.fav?'Added to favorites':'Removed from favorites')},
/* match to surface */
match:async v=>{const p=findP(v);if(!p)return;S.menu=null;S.armed=null;if(p.photoId&&await editScanPalette(p,true))return;const[L,C,h]=hexLch(p.colors[0]);S.mo={id:p.id,colors:[...p.colors],start:p.colors.join(),ti:0,m:{tgt:p.colors[0],orig:p.colors[0],L,C,h,big:false}};renderSheet2()},
mtgt:v=>{startMatch(v)},
moti:v=>{const mo=S.mo;mo.ti=+v;const hx=mo.colors[mo.ti];const[L,C,h]=hexLch(hx);mo.m={tgt:hx,orig:hx,L,C,h,big:mo.m.big};renderSheet2()},
mbig:()=>{const m=curMatch();if(!m)return;m.big=!m.big;if(S.studio&&S.studio.match)renderStudio();else renderSheet2()},
mreset:()=>{const m=curMatch();if(!m)return;resetMatch(m);reMatch();paintMatch()},
fullclose:()=>{const f=$('fullc');if(f)f.remove()},
muse:()=>{if(S.studio&&S.studio.match){studioUse();return}const mo=S.mo;if(!mo)return;const adj=lchHex(mo.m.L,mo.m.C,mo.m.h);mo.colors[mo.ti]=adj;mo.m.orig=mo.m.tgt=adj;renderSheet2();toast('Color updated')},
matchback:()=>{S.studio.match=null;renderStudio()},
moclose:()=>{S.mo=null;renderSheet2()},
modone:()=>{const mo=S.mo;if(!mo)return;if(mo.colors.join()===mo.start){S.mo=null;renderSheet2();return}const p=findP(mo.id);S.confirm={kind:'mo',orig:p?p.name:'palette',colors:[...mo.colors]};renderSheet2()},
/* search bar */
addpaste:()=>{const pp=parsePaste(S.q);if(!pp||!pp.cols){toast('Paste hex codes or a palette link');return}const cols=pp.cols;const r=pp.url?savePalette({name:baseName(cols),colors:cols,src:pp.src,imported:true,mine:false,source:pp.src,tags:[],url:pp.url}):savePalette({name:baseName(cols),colors:cols,src:'Pasted',mine:true,source:null,tags:[]});$('q').blur();go('pal');toast('Added '+r.name)},
qclear:()=>{clearSearch();$('q').focus()},
/* library + viewer */
view:(v,el)=>{const ctx=el&&el.dataset.ctx;const list=ctx==='q'?qList():ctx==='match'?S.saved.filter(p=>p.src==='Matched'):palVisible();const ids=list.map(p=>p.id);if(!ids.includes(v))ids.unshift(v);const q=$('q');if(q)q.blur();S.viewer={ids,i:ids.indexOf(v)};S.menu=null;renderViewer()},
vclose:()=>{S.viewer=null;S.menu=null;renderViewer();if(S.view==='pal'||S.view==='match')renderMain()},
vnext:()=>{const v=S.viewer;if(!v)return;v.i=(v.i+1)%v.ids.length;S.menu=null;renderViewer()},
vprev:()=>{const v=S.viewer;if(!v)return;v.i=(v.i-1+v.ids.length)%v.ids.length;S.menu=null;renderViewer()},
vedit:v=>{S.viewer=null;S.menu=null;$('ov').innerHTML='';lockScroll();clearSearch();A.edit(v)},
vmatch:v=>{S.viewer=null;S.menu=null;$('ov').innerHTML='';lockScroll();clearSearch();A.match(v)},
openphoto:async v=>{const im=await photoImg(v);if(!im){toast('That photo is no longer on this phone');return}openStudio({img:im,photoId:v})},
/* settings */
theme:v=>{const nav=v[0]==='n';const s=nav?v.slice(1):v;const[k,id]=s.split(':');let t;if(k==='c')t=THEMES[+id];else{const p=findP(id);if(!p)return;t={name:p.name,cols:[...p.colors]}}if(!t)return;if(nav){S.navTheme=t;S.navPick=false}else S.theme=t;applyTheme();persist();render();toast((nav?'Bar icons: ':'Theme: ')+t.name)},
tgroup:v=>{if(S.themeOpen.has(v))S.themeOpen.delete(v);else S.themeOpen.add(v);renderMain()},
navtheme:v=>{if(v==='pick'){S.navPick=true;renderMain();return}S.navPick=false;S.navTheme=v;applyTheme();persist();render()},
tagdel:v=>{const[c,i]=v.split(':');const arr=c==='d'?S.draft.tags:S.studio.tags;arr.splice(+i,1);if(c==='d')refreshDraft();else renderStudio()},
exportp:()=>{const data=S.saved.map(({id,name,colors,src,source,mine,tags,created,imported,url,fav,teach})=>({id,name,colors,src,source,mine,tags,created,imported,url,fav,teach}));copy(JSON.stringify({colorshare:1,creator:S.creator,likes:S.likeHex,palettes:data}),`Copied ${data.length} palettes and ${S.likeHex.length} picks`)},
importp:()=>{const t=($('impjson').value||'').trim();let d;try{d=JSON.parse(t)}catch(e){toast('That doesn’t look like copied palettes');return}const list=(d&&d.palettes)||[];let n=0;const nl=((d&&d.likes)||[]).filter(h=>/^#[0-9A-F]{6}$/i.test(h)&&!S.likeHex.includes(h));S.likeHex.push(...nl);S.likes=S.likeHex.map(hexOk);list.forEach(p=>{if(!p||!Array.isArray(p.colors)||S.saved.some(x=>x.id===p.id))return;S.saved.push(norm([p])[0]);n++});persist();renderMain();toast(n||nl.length?`Imported ${n} palette${n===1?'':'s'}${nl.length?` and ${nl.length} picks`:''}`:'Nothing new to import')},
reset:()=>{if(!arm('reset')){renderMain();return}S.sl=0;S.sb=0;S.tasteHinted=false;S.fill=100;['saved','setup','likes','collapsed','acc','groups','theme','navTheme','creator','names','openph','hues','sort','palMode','cols','zoom','variety','sl','sb','tasteHinted','fill'].forEach(k=>{LSx.del('cs4_'+k);LSx.del('cs3_'+k)});DB.clear();S.saved=norm(SAMPLE.map(p=>({...p})));S.likeHex=[];S.likes=[];S.setupOpen=false;S.hues.clear();S.sort='random';S.draft=null;S.openPh=new Set();S.closedGroups=new Set();S.theme=THEMES[0];S.navTheme='match';S.creator='A-Frame';S.names=[];S.stream=streamBatch(60);applyTheme();persist();go('discover');toast('Prototype data erased')},
/* studio */
stclose:()=>closeStudio(),
stauto:()=>{const el=$('stn');if(!el)return;el.value=nextName(stFinal(),el.value||el.placeholder);S.studio.name=el.value},
stsave:()=>{const st=S.studio;stNameInput();if(st.editId){const p=findP(st.editId);S.confirm={kind:'studio',orig:p?p.name:'palette',colors:stFinal()};renderSheet2()}else saveStudio(false)},
sttoggle:v=>{const st=S.studio;const L=stLists();const c=L.inc.find(x=>x.hex===v);if(!c)return;const now=Date.now(),dbl=st.lastTap&&st.lastTap.v===v&&now-st.lastTap.t<450;st.lastTap={v,t:now};if(!dbl){st.sel=st.sel===v?null:v;renderStChips();drawVP();return}st.lastTap=null;stPush();st.sel=null;if(c.man){st.added=st.added.filter(a=>a.hex!==v);drawVP()}else st.off.push(v);st.k=Math.max(1,L.inc.length-1);renderStudio()},
unpick:()=>{const st=S.studio;st.added.pop();st.k=Math.max(1,stLists().inc.length-1);drawVP();renderStudio()},
stundo:()=>{const st=S.studio;if(!st||!st.hist||!st.hist.length)return;st.fut.push(JSON.stringify(snapSt()));stRestore(st.hist.pop())},
stredo:()=>{const st=S.studio;if(!st||!st.fut||!st.fut.length)return;st.hist.push(JSON.stringify(snapSt()));stRestore(st.fut.pop())},
streset:()=>{const st=S.studio;if(!st||!st.orig)return;stPush();Object.assign(st,JSON.parse(st.orig));st.match=null;drawVP();st.auto=extractCands();renderStudio();toast('Back to how it was')},
stshare:()=>{const st=S.studio;const c=stFinal();if(!c.length)return;const r=region();openShare({name:stNameInput()||baseName(c),colors:c,src:`${S.creator.toUpperCase()} · Scanned`,img:st.src,crop:{x:r.x,y:r.y,side:r.side}})},
sharego:()=>{const sc=S.shareCard;if(!sc)return;const data=S.shareCodes?{files:[sc.file],text:sc.text,title:sc.name}:{files:[sc.file],title:sc.name};try{if(navigator.canShare&&navigator.canShare({files:[sc.file]})){navigator.share(data).catch(e=>{if(!e||e.name!=='AbortError')toast('Press and hold the card to save or share it',3000)});return}}catch(e){}toast('Press and hold the card to save or share it',3000)},
sharecodes:()=>{const sc=S.shareCard;if(sc)copy(sc.text.split('\n')[1],'Copied the hex codes')},
sharecodestoggle:()=>{const sc=S.shareCard;if(!sc)return;S.shareCodes=!S.shareCodes;persist();openShare(sc.src)},
shareclose:()=>{if(S.shareCard)URL.revokeObjectURL(S.shareCard.url);S.shareCard=null;renderSheet2()}
};
document.addEventListener('click',e=>{const t=e.target.closest('[data-a]');if(!t)return;if(t.classList.contains('sheet-bg')&&e.target!==t)return;if(Date.now()-padEnded<350&&e.target.closest('.pad'))return;const f=A[t.dataset.a];if(f)f(t.dataset.v,t)});
let padEnded=0;
function commitRename(el){const id=el.dataset.id;if(S.renaming!==id)return;S.renaming=null;const p=findP(id);const v=el.value.trim();if(p&&v&&v!==p.name){p.name=uniqueName(v,id);persist();toast('Renamed '+p.name)}setTimeout(renderMain,0)}
document.addEventListener('focusout',e=>{if(e.target.id==='rn')commitRename(e.target)});
document.addEventListener('focusin',e=>{if(e.target.id==='q'&&S.q.trim())renderResults();if(e.target.id==='pastebox'){const r=document.createRange();r.selectNodeContents(e.target);const s=getSelection();s.removeAllRanges();s.addRange(r)}});
document.addEventListener('input',e=>{const el=e.target,id=el.id;
if(id==='q'){S.q=el.value;renderResults()}
else if(id==='dname'&&S.draft){S.draft.name=el.value;S.draft.named=el.value.trim().length>0}
else if(id==='stn'&&S.studio){S.studio.name=el.value}});
function addTag(id,t){t=(t||'').trim();if(!t)return;const arr=id==='dtag'?S.draft.tags:S.studio.tags;if(!arr.includes(t))arr.push(t);if(id==='dtag')refreshDraft();else renderStudio();fillTaglist();setTimeout(()=>{const i=$(id);if(i)i.focus()},0)}
document.addEventListener('change',e=>{const id=e.target.id;if(id==='creator'){renameCreator(e.target.value);return}if(id==='dtag'||id==='stag'){addTag(id,e.target.value)}});
['file','cam'].forEach(id=>$(id).addEventListener('change',e=>{const f=e.target.files&&e.target.files[0];if(f)openFile(f)}));
document.addEventListener('paste',e=>{const items=e.clipboardData&&e.clipboardData.items;let found=false;if(items)for(const it of items){if(it.type&&it.type.indexOf('image/')===0){const f=it.getAsFile();if(f){found=true;e.preventDefault();openFile(f);break}}}if(!found&&e.target&&e.target.id==='pastebox'){e.preventDefault();toast('No image on the clipboard. Copy a screenshot first.')}});
document.addEventListener('keydown',e=>{const id=e.target.id;
if(e.key==='Escape'&&id==='rn'){S.renaming=null;renderMain();return}
if(e.key!=='Enter')return;
if(id==='q'){e.preventDefault();const pp=parsePaste(S.q);if(pp&&pp.cols)A.addpaste();else e.target.blur();return}
if(id==='nmin'){e.preventDefault();A.namesave();return}
if(['dtag','stag','rn','creator'].includes(id)){e.preventDefault();e.target.blur()}});
document.addEventListener('beforeinput',e=>{if(e.target&&e.target.id==='pastebox'&&e.inputType!=='insertFromPaste')e.preventDefault()});
window.addEventListener('resize',()=>{if(S.studio)drawVP()});

/* touch: slide bars, and the palette strip (hold to drag-reorder, tap to select) */
let drag=null;
function paintDrag(){const st=$('strip');if(!st||!drag)return;const cols=tone(drag.tmp,S.draft.light,S.draft.bold);[...st.children].forEach((c,i)=>{c.style.background=cols[i];c.style.transform=i===drag.cur?'scale(1.12)':'';c.style.outline=i===drag.cur?'2px solid #fff':''})}
function dStart(x,y,el){const ch=el.closest&&el.closest('[data-chip]');if(!ch||!S.draft)return false;const i=+ch.dataset.chip;drag={i,x,y,live:false,tmp:[...S.draft.base],cur:i,timer:setTimeout(()=>{if(drag){drag.live=true;paintDrag();if(navigator.vibrate)try{navigator.vibrate(8)}catch(_){}}},320)};return true}
function dMove(x,y){if(!drag)return false;if(!drag.live){if(Math.hypot(x-drag.x,y-drag.y)>10){clearTimeout(drag.timer);drag=null}return false}const st=$('strip');if(!st)return true;const r=st.getBoundingClientRect();const n=drag.tmp.length;const t=clamp(Math.floor((x-r.left)/r.width*n),0,n-1);if(t!==drag.cur){const[c]=drag.tmp.splice(drag.cur,1);drag.tmp.splice(t,0,c);drag.cur=t;paintDrag()}return true}
function dEnd(cancel){if(!drag)return;clearTimeout(drag.timer);const d=drag;drag=null;if(!S.draft)return;if(d.live){const was=S.draft.sel!=null?S.draft.base[S.draft.sel]:null;S.draft.base=d.tmp;S.draft.sel=was?d.tmp.indexOf(was):null;if(S.draft.sel<0)S.draft.sel=null;refreshDraft()}else if(!cancel){if(S.view==='discover'){S.draft.base.splice(d.i,1);S.draft.sel=null}else S.draft.sel=S.draft.sel===d.i?null:d.i;refreshDraft()}}
document.addEventListener('touchstart',e=>{lastTouch=Date.now();if(e.touches.length!==1)return;const t=e.touches[0];if(padDown(t.clientX,e.target))return;dStart(t.clientX,t.clientY,e.target)},{passive:true});
document.addEventListener('touchmove',e=>{if(PD){e.preventDefault();padMove(e.touches[0].clientX);return}if(drag&&dMove(e.touches[0].clientX,e.touches[0].clientY))e.preventDefault()},{passive:false});
document.addEventListener('touchend',e=>{lastTouch=Date.now();if(PD){padUp();padEnded=Date.now();return}if(drag){e.preventDefault();dEnd(false)}},{passive:false});
document.addEventListener('touchcancel',()=>{padUp();dEnd(true)});
document.addEventListener('mousedown',e=>{if(Date.now()-lastTouch<800)return;if(padDown(e.clientX,e.target)){const mm=ev=>padMove(ev.clientX);const mu=()=>{padUp();padEnded=Date.now();window.removeEventListener('mousemove',mm);window.removeEventListener('mouseup',mu)};window.addEventListener('mousemove',mm);window.addEventListener('mouseup',mu);return}
if(dStart(e.clientX,e.clientY,e.target)){const mm=ev=>dMove(ev.clientX,ev.clientY);const mu=()=>{dEnd(false);window.removeEventListener('mousemove',mm);window.removeEventListener('mouseup',mu)};window.addEventListener('mousemove',mm);window.addEventListener('mouseup',mu)}});
document.addEventListener('contextmenu',e=>{if(e.target.closest('#strip')||e.target.closest('.pad'))e.preventDefault()});

/* keep the search bar above the iPhone keyboard */
if(window.visualViewport){const vv=window.visualViewport;const fit=()=>{const kb=Math.max(0,window.innerHeight-vv.height-vv.offsetTop);const on=kb>80;document.body.classList.toggle('kb',on);document.documentElement.style.setProperty('--kb',(on?kb:0)+'px')};vv.addEventListener('resize',fit);vv.addEventListener('scroll',fit)}
/* Inside the Claude app the page sits in a frame that can shrink to its content,
   which left a black band under the bottom bar on short pages. Fill the screen. */
try{if(window.self!==window.top&&screen.height)document.documentElement.style.setProperty('--minh',screen.height+'px')}catch(e){}

/* boot */
renderResults();
[['theme'],['navTheme']].forEach(([k])=>{const t=S[k];if(t&&t.cols){const m=THEMES.find(x=>x.name===t.name&&x.cols.slice(0,t.cols.length).join()===t.cols.join());if(m)S[k]=m}});
applyTheme();
fillPool();S.stream=streamBatch(60);persist();render();
DB.open().then(()=>DB.all()).then(list=>{list.forEach(p=>MEM.set(p.id,p));if(['pal','match','settings'].includes(S.view))renderMain()});

/* Clean up the old Swatch Studio service worker on phones that installed it. */
if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister())).catch(()=>{})}
