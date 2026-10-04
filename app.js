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
const LOGO='<svg width="34" height="34" viewBox="0 0 34 34" aria-label="ColorShare logo" role="img"><rect x=".5" y=".5" width="33" height="33" rx="9" fill="#0E0E12" stroke="rgba(255,255,255,.14)"/><rect x="6.5" y="6.5" width="9.5" height="9.5" rx="2.8" fill="#471396"/><rect x="18" y="6.5" width="9.5" height="9.5" rx="2.8" fill="#8CABFF"/><rect x="6.5" y="18" width="9.5" height="9.5" rx="2.8" fill="#78B9B5"/><rect x="18" y="18" width="9.5" height="9.5" rx="2.8" fill="#FFCC00"/></svg>';
const THEMES=[{name:'ColorShare',cols:['#8CABFF','#78B9B5','#B48CFF','#FFCC00']},{name:'Ember',cols:['#F78D60','#FFCC44','#FF9A76','#F0A8D0']},{name:'Lagoon',cols:['#90E0EF','#7FD1C3','#5BB8E8','#B9D9A8']},{name:'Orchid',cols:['#D58BD5','#F0A8D0','#B48CFF','#8CABFF']},{name:'Meadow',cols:['#A8C5A0','#E9D8A6','#8FD3B5','#F2C57C']}];

const LSx={get(k){try{const v=localStorage.getItem(k);return v==null?undefined:JSON.parse(v)}catch(e){return undefined}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
function load(k,d){let v=LSx.get('cs4_'+k);if(v===undefined)v=LSx.get('cs3_'+k);return v===undefined?d:v}
const SAMPLE=[{name:'Fire and ember',colors:['#B12C00','#EB5B00','#F78D60','#FFCC44'],src:'Color Hunt'},{name:'Orchid night',colors:['#1A0030','#6A0DAD','#C060C0','#F0A8D0'],src:'Color Hunt'},{name:'Ocean drift',colors:['#003049','#006494','#0096C7','#90E0EF'],src:'Color Hunt'},{name:'Sage morning',colors:['#2D4739','#4E8B6B','#A8C5A0','#D8E8D0'],src:'Generated'}];
const IMPORTED=['Color Hunt','Pasted','Khroma','Coolors','Adobe Color'];
const isMine=p=>!!p.mine;
const AUTO_TAGS=['Custom','Discover','Generated','Created','Scanned','Pasted','Color Hunt'];
const norm=arr=>{const cr=load('creator','');return arr.map(p=>{const q={...p,id:p.id||uid(),created:p.created||Date.now()};if(q.mine===undefined)q.mine=!q.imported&&!IMPORTED.includes(q.src);if(q.source===undefined)q.source=q.mine?null:(q.src||'Imported');q.tags=(q.tags||[]).filter(t=>!AUTO_TAGS.includes(t)&&t!==q.src&&t!==q.source&&t!==cr);return q})};
const mineSrc=()=>S.creator||'Custom';
const kindOf=p=>p.photoId?'Scanned':'Custom';
const srcOf=p=>p.mine?(p.source||mineSrc()):(p.source||p.src||'Imported');
const srcLine=p=>p.mine?((p.source||S.creator)?`${srcOf(p).toUpperCase()} · ${kindOf(p)}`:kindOf(p)):srcOf(p);
function srcFromUrl(v){try{const u=new URL(v.trim());const h=u.hostname.replace(/^www\./,'');if(h.includes('colorhunt'))return'Color Hunt';if(h.includes('khroma'))return'Khroma';if(h.includes('coolors'))return'Coolors';if(h.includes('adobe'))return'Adobe Color';return h}catch(e){return'Pasted'}}
function defaultTags(){return[]}
const srcField=(val,ctx,mine)=>`<div class="row" style="margin-top:12px"><span class="slab">Source</span><input type="text" id="${ctx}src" value="${esc(val||'')}" placeholder="${esc(mine?mineSrc():'Source')}" aria-label="Source name" style="height:34px;font-size:14px"></div>`;
const tagsHTML=(tags,ctx)=>`<div class="tagrow" style="margin-top:10px">${tags.map((t,i)=>`<span class="tagc">${esc(t)}<button class="x" data-a="tagdel" data-v="${ctx}:${i}" aria-label="Remove tag ${esc(t)}">${ICON.close}</button></span>`).join('')}<input type="text" class="taginput" id="${ctx}tag" placeholder="+ Add tag" aria-label="Add tag" enterkeyhint="done"></div>`;

const MEM=new Map(),IMG=new Map();
const DB={db:null,
open(){return new Promise(res=>{try{const r=indexedDB.open('colorshare_proto',1);r.onupgradeneeded=()=>{r.result.createObjectStore('photos',{keyPath:'id'})};r.onsuccess=()=>{DB.db=r.result;res(true)};r.onerror=()=>res(false);r.onblocked=()=>res(false)}catch(e){res(false)}})},
st(m){return DB.db.transaction('photos',m).objectStore('photos')},
put(o){MEM.set(o.id,o);if(!DB.db)return Promise.resolve(false);return new Promise(res=>{try{const q=DB.st('readwrite').put(o);q.onsuccess=()=>res(true);q.onerror=()=>res(false)}catch(e){res(false)}})},
all(){if(!DB.db)return Promise.resolve([]);return new Promise(res=>{try{const q=DB.st('readonly').getAll();q.onsuccess=()=>res(q.result||[]);q.onerror=()=>res([])}catch(e){res([])}})},
clear(){MEM.clear();IMG.clear();if(DB.db)try{DB.st('readwrite').clear()}catch(e){}}};
function photoImg(id){if(IMG.has(id))return IMG.get(id);const p=MEM.get(id);if(!p)return Promise.resolve(null);const pr=new Promise(res=>{const im=new Image();im.onload=()=>res(im);im.onerror=()=>res(null);im.src=p.data});IMG.set(id,pr);return pr}

const S={view:'discover',prev:'discover',setup:load('setup',true),likeHex:load('likes',[]),likes:[],pool:[],stream:[],zoom:5,variety:40,draft:null,far:35,sugg:[],anchors:[],saved:norm(load('saved',SAMPLE)),collapsed:new Set(load('collapsed',[])),closedGroups:new Set(load('groups',[])),studio:null,confirm:null,chooser:false,theme:load('theme',THEMES[0]),navTheme:load('navTheme','match'),creator:load('creator',''),armed:null,menu:null,q:'',tagF:null,viewer:null,libF:'all'};
S.likes=S.likeHex.map(hexOk);
function persist(){const ok=LSx.set('cs4_saved',S.saved);LSx.set('cs4_setup',S.setup);LSx.set('cs4_likes',S.likeHex);LSx.set('cs4_collapsed',[...S.collapsed]);LSx.set('cs4_groups',[...S.closedGroups]);LSx.set('cs4_theme',S.theme);LSx.set('cs4_navTheme',S.navTheme);LSx.set('cs4_creator',S.creator);return ok}
function applyTheme(){const c=S.theme.cols.map(readable);const r=document.documentElement.style;['--c1','--c2','--c3','--c4'].forEach((k,i)=>r.setProperty(k,c[i]||c[0]));r.setProperty('--acc',c[0]);r.setProperty('--edge',rgba(c[0],.3));r.setProperty('--glow',rgba(c[0],.35));
const nt=S.navTheme;const n=nt==='white'?['#FFFFFF','#FFFFFF','#FFFFFF','#FFFFFF']:(nt&&nt.cols?nt.cols.map(readable):c);['--n1','--n2','--n3','--n4'].forEach((k,i)=>r.setProperty(k,n[i]||n[0]))}
applyTheme();

function setupBatch(){const H=deck(DIST.hue),Sa=deck(DIST.sat),Lu=deck(DIST.lum);return H.map((h,i)=>{const r=HUE[h];return hslHex(rnd(r[0],r[1]),rnd(...SAT[Sa[i]]),rnd(...LUM[Lu[i]]))})}
function taste(o){if(!S.likes.length)return 1;let b=0;for(const l of S.likes){const v=Math.exp(-((dist(o,l)/11)**2));if(v>b)b=v}return b}
function streamBatch(n){let thr=(100-S.variety)/100*0.85;const out=[];let g=0;while(out.length<n&&g<80000){g++;if(g%1500===0)thr*=0.85;const hex=hslHex(rnd(0,360),rnd(0.1,1),rnd(0.2,0.9));const o=hexOk(hex);if(taste(o)<thr)continue;if(out.some(c=>dist(c.o,o)<5))continue;out.push({hex,o})}
return out.map(c=>{const[L,C,h]=hexLch(c.hex);return{hex:c.hex,key:(C<0.035?99:Math.floor(((h+15)%360)/30))*10+L}}).sort((a,b)=>a.key-b.key).map(c=>c.hex)}

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

function renameCreator(v){const old=S.creator;if(v===old)return;S.saved.forEach(p=>{if(p.mine&&p.source&&old&&p.source===old)p.source=null});S.creator=v;persist();toast(v?'Your palettes now show '+v:'Source name cleared')}
let tT;function toast(m,ms){const t=$('toast');t.textContent=m;t.classList.add('show');clearTimeout(tT);tT=setTimeout(()=>t.classList.remove('show'),ms||2200)}
function fallback(t,cb){const a=document.createElement('textarea');a.value=t;a.setAttribute('readonly','');a.style.position='absolute';a.style.left='-9999px';document.body.appendChild(a);a.select();a.setSelectionRange(0,t.length);let ok=false;try{ok=document.execCommand('copy')}catch(e){}a.remove();cb(ok)}
function copy(t,msg){const d=ok=>toast(ok===false?'Copy blocked here':(msg||(t.length<=7?'Copied '+t:'Copied')));try{if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(()=>d(true),()=>fallback(t,d));return}}catch(e){}fallback(t,d)}
const cssOf=(name,c)=>`/* ${name} · ColorShare */\n:root {\n${c.map((h,i)=>`  --color-${i+1}: ${h};`).join('\n')}\n}`;
function sharePal(name,cols){const text=`${name}\n${cols.join('  ')}\nMade with ColorShare`;const fb=()=>copy(text,'Copied, ready to paste and share');try{if(navigator.share){navigator.share({title:name,text}).catch(e=>{if(!e||e.name!=='AbortError')fb()});return}}catch(e){}fb()}
function arm(key){if(S.armed===key){S.armed=null;return true}S.armed=key;setTimeout(()=>{if(S.armed===key){S.armed=null;if(S.view==='pal'||S.view==='settings')renderMain()}},3000);return false}
const snapRange=(id,val,left,right,label)=>`<div class="row"><span class="slab">${left}</span><div class="rng snap"><input type="range" id="${id}" min="-100" max="100" step="1" value="${val}" aria-label="${label}"></div><span class="slab r">${right}</span></div>`;

/* ---------- draft: one editor used everywhere ---------- */
const draftCols=()=>S.draft?tone(S.draft.base,S.draft.light,S.draft.bold):[];
const autoName=()=>baseName(draftCols());
const draftName=()=>{const el=$('dname');const typed=el?el.value.trim():(S.draft.named?S.draft.name:'');return typed||autoName()};
function snapDraft(){S.draft.orig=JSON.stringify({base:S.draft.base,light:S.draft.light,bold:S.draft.bold,name:S.draft.name,named:S.draft.named,tags:S.draft.tags,source:S.draft.source})}
function newDraft(src){S.draft={id:null,base:[],light:0,bold:0,name:'',named:false,src:src||'Created',tags:[],source:null,mine:true};snapDraft()}
function addToDraft(hex){if(!S.draft)newDraft('Discover');const b=S.draft.base;const i=b.indexOf(hex);if(i>=0){b.splice(i,1);return refreshDraft()}if(b.length>=12){toast('A palette holds up to 12 colors');return}const L=Lof(hex);let j=b.findIndex(c=>Lof(c)>L);if(j<0)j=b.length;b.splice(j,0,hex);refreshDraft()}
function draftHTML(mode){const d=S.draft,cols=draftCols(),n=cols.length,editing=!!d.id;const inDisc=mode==='disc';
const chips=n?cols.map((h,i)=>`<div class="chip" data-chip="${i}" style="background:${h}"></div>`).join(''):`<div class="empty">Tap colors to add them</div>`;
const tag=editing?'Editing':(inDisc?'':'New palette');
return `${tag?`<div class="lbl" style="margin-bottom:4px">${tag}</div>`:''}<div class="row"><input type="text" class="name" id="dname" value="${esc(d.named?d.name:'')}" placeholder="${esc(n?autoName():'Name your palette')}" aria-label="Palette name"><button class="btn sm ghost" data-a="autoname" title="Use the suggested name">Auto</button><button class="btn sm ghost" data-a="clearall" style="color:${S.armed==='clear'?'var(--danger)':'var(--fg2)'}">${S.armed==='clear'?'Tap again':'Clear all'}</button></div>
<div class="strip" id="strip" style="margin-top:8px">${chips}</div><div class="row" style="margin-top:6px;min-height:16px"><span class="lbl sp">${n?'Tap to remove · hold and drag to reorder':''}</span><span class="lbl">${n}/12</span></div>
${inDisc?'':`<div style="margin-top:10px">${snapRange('tl',Math.round(d.light*100),'Darker','Lighter','Lighter or darker')}<div style="height:6px"></div>${snapRange('tb',Math.round(d.bold*100),'Softer','Bolder','Softer or bolder')}</div>${srcField(d.source,'d',d.mine!==false)}${tagsHTML(d.tags||[],'d')}`}
<div class="row" style="margin-top:12px;gap:8px;align-items:flex-end"><div class="row wrap sp center" style="gap:8px"><button class="btn sm" data-a="build">${ICON.spark}Build palettes</button>${inDisc?'':'<button class="btn sm" data-a="adddisc">Add from Discover</button>'}</div><div style="display:flex;flex-direction:column;gap:6px"><button class="btn sm icon" data-a="resetdraft" aria-label="Reset to how it was" title="Reset">${ICON.reset}</button><button class="btn sm icon" data-a="sharedraft" aria-label="Share palette">${ICON.share}</button></div></div>
<div class="row" style="margin-top:12px"><button class="btn big ghost" data-a="cancel">Cancel</button><button class="btn big pri" style="flex:1" data-a="${editing?'done':'savenew'}">${editing?'Done':'Save palette'}</button></div>`}
function refreshDraft(){const hosts=document.querySelectorAll('[data-host=draft]');if(!S.draft||!hosts.length){renderMain();return}const nm=$('dname');const typed=nm?nm.value:'';if(nm&&typed.trim()){S.draft.name=typed;S.draft.named=true}hosts.forEach(h=>h.innerHTML=draftHTML(h.dataset.mode));if(S.view==='discover'&&!S.setup)updateChecks()}
function repaintStrip(){const st=$('strip');if(!st||!S.draft)return;const cols=draftCols();[...st.children].forEach((c,i)=>{if(cols[i])c.style.background=cols[i]});const nm=$('dname');if(nm)nm.placeholder=autoName()}
function updateChecks(){const set=new Set(S.draft?S.draft.base:[]);document.querySelectorAll('#sgrid .sw').forEach(el=>{const on=set.has(el.dataset.v);if(on&&!el.firstChild)el.innerHTML=`<span class="ck">${ICON.check}</span>`;else if(!on&&el.firstChild)el.innerHTML=''})}

/* ---------- render ---------- */
function renderHeader(){const h=$('hdr');if(S.view==='build'){h.innerHTML=`<button class="btn sm ghost" data-a="back" aria-label="Back" style="padding:0 6px">${ICON.back}</button><span class="h2">Build palettes</span>`;return}h.innerHTML=`${LOGO}<span class="word">ColorShare</span><span class="sp"></span><span class="lbl">prototype 7</span>`}
function renderNav(){const v=S.view==='build'?S.prev:S.view;const nb=(k,icon,label,c)=>`<button class="nb${v===k?' on':''}" style="--tc:${c}" data-a="go" data-v="${k}" aria-label="${label}">${ICON[icon]}<span>${label}</span></button>`;$('nav').innerHTML=nb('discover','discover','Discover','var(--n1)')+nb('pal','palettes','Palettes','var(--n2)')+`<button class="scanbtn" data-a="scan" aria-label="Scan a photo">${ICON.scan}</button>`+nb('library','library','Library','var(--n4)')+nb('settings','settings','Settings','#fff')}
let io=null;
function renderMain(){const m=$('main');if(io){io.disconnect();io=null}
if(S.view==='discover')m.innerHTML=S.setup?setupHTML():streamHTML();
else if(S.view==='pal')m.innerHTML=palHTML();
else if(S.view==='library')m.innerHTML=libraryHTML();
else if(S.view==='settings')m.innerHTML=settingsHTML();
else if(S.view==='build')m.innerHTML=buildHTML();
if(S.view==='discover')watchSentinel();
if(S.view==='pal')hydrateThumbs()}
function render(){renderHeader();renderNav();renderMain()}
function go(v){if(v!=='build')S.prev=v;S.view=v;S.menu=null;render();window.scrollTo(0,0)}

/* Discover */
function setupBarHTML(){const n=S.likeHex.length;const picks=[...S.likeHex].sort((a,b)=>Lof(a)-Lof(b));return`<div class="row"><div class="sp"><div class="h2">Pick 50 colors you love</div><div class="lbl">${n} of 50 · mix hues, darks and lights</div></div><button class="btn ${n>=50?'pri':'out'}" data-a="done50">Done</button></div><div style="display:flex;gap:3px;overflow-x:auto;margin-top:10px;min-height:20px;scrollbar-width:none">${picks.map(h=>`<div role="button" aria-label="Remove ${h}" data-a="like" data-v="${h}" style="flex:0 0 20px;height:20px;border-radius:5px;background:${h}"></div>`).join('')}</div>`}
const setupItem=h=>`<div><div class="sw${S.likeHex.includes(h)?' sel':''}" role="button" aria-label="${label(h)}" data-a="like" data-v="${h}" style="background:${h}"></div><div class="tiny">${label(h)}</div></div>`;
function setupHTML(){return`<div class="sticky" id="sbar">${setupBarHTML()}</div><div id="setgrid" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px 9px">${S.pool.map(setupItem).join('')}</div><div id="sent" style="height:40px"></div><button class="btn ghost" data-a="skip" style="margin-top:8px">Skip for now</button>`}
const swc=h=>`<div class="sw" role="button" aria-label="${h}" data-a="pick" data-v="${h}" style="background:${h}">${S.draft&&S.draft.base.includes(h)?`<span class="ck">${ICON.check}</span>`:''}</div>`;
function streamHTML(){const top=S.draft?`<div class="sticky" data-host="draft" data-mode="disc">${draftHTML('disc')}</div>`:`<div class="row" style="margin-bottom:16px"><h1 class="h1 sp">Discover</h1><button class="btn pri" data-a="create">${ICON.plus}Create palette</button></div>`;
return top+`<div class="row"><span class="slab">My taste</span><div class="rng"><input type="range" id="variety" min="0" max="100" step="1" value="${S.variety}" aria-label="My taste or variety"></div><span class="slab r">Variety</span></div><div style="height:16px"></div><div class="row" style="margin-bottom:18px"><span class="slab">Smaller</span><div class="rng"><input type="range" id="zoom" min="3" max="9" step="1" value="${12-S.zoom}" aria-label="Swatch size"></div><span class="slab r">Bigger</span></div>
<div id="sgrid" style="display:grid;grid-template-columns:repeat(${S.zoom},minmax(0,1fr));gap:5px">${S.stream.map(swc).join('')}</div><div id="sent" style="height:60px;display:flex;align-items:center;justify-content:center" class="lbl">Loading more colors…</div>`}
let loading=false;
function watchSentinel(){const s=$('sent');if(!s||!('IntersectionObserver' in window))return;io=new IntersectionObserver(es=>{if(es[0].isIntersecting)loadMore()},{rootMargin:'700px 0px'});io.observe(s)}
function loadMore(){if(loading)return;loading=true;setTimeout(()=>{if(S.view==='discover'){if(S.setup){const b=setupBatch();S.pool.push(...b);const g=$('setgrid');if(g)g.insertAdjacentHTML('beforeend',b.map(setupItem).join(''))}else{const b=streamBatch(40);S.stream.push(...b);const g=$('sgrid');if(g)g.insertAdjacentHTML('beforeend',b.map(swc).join(''))}}loading=false},30)}

/* Palettes */
function groupsFor(list){const mine=list.filter(isMine),other=list.filter(p=>!isMine(p));const keys=[...new Set(mine.map(srcOf)),...new Set(other.map(srcOf))];return[...new Set(keys)].map(k=>({key:'src:'+k,title:k,items:list.filter(p=>srcOf(p)===k)})).filter(g=>g.items.length)}
const GROUPS={find:()=>null};
function matches(p){const q=S.q.trim().toLowerCase();if(S.tagF&&!(p.tags||[]).includes(S.tagF))return false;if(!q)return true;const hay=[p.name,p.src,srcLine(p),kindOf(p),...(p.tags||[]),...p.colors,...p.colors.map(h=>h.slice(1))].join(' ').toLowerCase();return q.split(/\s+/).every(w=>hay.includes(w.replace('#','')))}
function allTags(){const c=new Map();S.saved.forEach(p=>(p.tags||[]).forEach(t=>c.set(t,(c.get(t)||0)+1)));return[...c.entries()].sort((a,b)=>b[1]-a[1]).map(e=>e[0])}
function palCard(p){if(S.draft&&S.draft.id===p.id)return`<div class="card ed" data-host="draft" data-mode="pal">${draftHTML('pal')}</div>`;
const photo=p.photoId&&MEM.has(p.photoId);const col=S.collapsed.has(p.id);const armed=S.armed==='del'+p.id;const menu=S.menu===p.id;
return`<div class="card"><div class="h2" style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.name)}</div><div class="lbl" style="margin:3px 0 10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><span style="color:var(--fg);font-weight:600;letter-spacing:.02em">${esc(srcLine(p))}</span>${(p.tags||[]).length?' · '+(p.tags).map(esc).join(' · '):''}</div><div class="pal">${p.colors.map(h=>`<div data-a="copy" data-v="${h}" style="background:${h}" role="button" aria-label="Copy ${h}"></div>`).join('')}</div><div class="hexrow mono">${p.colors.map(h=>`<span>${h.slice(1)}</span>`).join('')}</div>
<div class="row"><button class="btn sm" data-a="menu" data-v="${p.id}" aria-expanded="${menu}">${ICON.copy}Copy<span style="display:inline-flex;transform:rotate(${menu?180:0}deg)">${ICON.chev}</span></button><button class="btn sm icon" data-a="share" data-v="${p.id}" aria-label="Share ${esc(p.name)}">${ICON.share}</button><span class="sp"></span><button class="btn sm out" data-a="edit" data-v="${p.id}">Edit</button><button class="btn sm ${armed?'warn':'ghost'}" data-a="del" data-v="${p.id}">${armed?'Tap again':'Delete'}</button></div>
${menu?copyMenu(p.id):''}
${photo?`<button class="btn sm ghost" data-a="togglephoto" data-v="${p.id}" style="padding:0 2px;gap:4px;margin-top:8px"><span style="display:inline-flex;transform:rotate(${col?-90:0}deg);transition:transform .15s">${ICON.chev}</span>${col?'Show photo':'Photo'}</button>${col?'':`<div class="ph"><canvas data-thumb="${p.id}"></canvas></div>`}`:''}</div>`}
function palHTML(){const newEd=S.draft&&!S.draft.id?`<div class="card ed" data-host="draft" data-mode="pal">${draftHTML('pal')}</div>`:'';const filtering=S.q.trim()||S.tagF;const list=S.saved.filter(matches);
const groups=groupsFor(list).map(g=>{const closed=!filtering&&S.closedGroups.has(g.key);return`<button class="grp" data-a="group" data-v="${esc(g.key)}" aria-expanded="${!closed}"><span class="h2 sp" style="text-align:left">${esc(g.title)}</span><span class="lbl">${g.items.length}</span><span class="chev" style="transform:rotate(${closed?-90:0}deg)">${ICON.chev}</span></button>${closed?'':g.items.map(palCard).join('')}`}).join('');
const tags=allTags();
return`<h1 class="h1" style="margin-bottom:14px">Palettes</h1><div class="row"><input type="text" id="imp" placeholder="Paste hex codes or a palette link" aria-label="Import palette"><button class="btn" data-a="import">Add</button></div><div id="imperr" style="font-size:13px;color:var(--danger);min-height:20px;margin:4px 0 2px"></div>${S.draft?'':`<div class="row center" style="margin-bottom:20px"><button class="btn big pri" data-a="createp" style="min-width:220px">${ICON.plus}New palette</button></div>`}${newEd}
<input type="text" id="q" value="${esc(S.q)}" placeholder="Search names, tags or hex codes" aria-label="Search palettes" style="margin-bottom:10px">${tags.length?`<div class="tagscroll" style="margin-bottom:6px">${tags.map(t=>`<button class="tagc${S.tagF===t?' on':''}" data-a="tagf" data-v="${esc(t)}">${esc(t)}</button>`).join('')}</div>`:''}
<div id="plist">${groups||(filtering?'<div class="card"><div class="h2">No matches</div><div class="lbl" style="margin-top:4px">Try another word, tag or hex code.</div></div>':'<div class="card"><div class="h2">Your palettes live here</div><div class="lbl" style="margin-top:4px">Scan a photo or tap colors in Discover to make your first one.</div></div>')}</div>`}
function hydrateThumbs(){document.querySelectorAll('canvas[data-thumb]').forEach(async cv=>{const p=S.saved.find(x=>x.id===cv.dataset.thumb);if(!p)return;const im=await photoImg(p.photoId);if(!im)return;const dpr=window.devicePixelRatio||1;const W=cv.clientWidth,H=cv.clientHeight;cv.width=W*dpr;cv.height=H*dpr;const sc=p.scan||{z:1,cx:.5,cy:.5};const iw=im.naturalWidth,ih=im.naturalHeight;const side=Math.min(iw,ih)/sc.z;const cx=clamp(sc.cx*iw,side/2,iw-side/2),cy=clamp(sc.cy*ih,side/2,ih-side/2);const ar=W/H;cv.getContext('2d').drawImage(im,cx-side/2,cy-side/ar/2,side,side/ar,0,0,cv.width,cv.height)})}

/* Library: a showcase of your own palettes, each opens full screen */
function libList(){let l=S.saved.filter(isMine);if(S.libF==='custom')l=l.filter(p=>!p.photoId);else if(S.libF==='scanned')l=l.filter(p=>p.photoId);return l}
function libraryHTML(){const l=libList();const who=S.creator?esc(S.creator)+"’s":'Your';
const head=S.editSrc?`<div class="row" style="margin-bottom:12px"><input type="text" id="libsrc" value="${esc(S.creator)}" placeholder="Your name or business, like A-Frame" aria-label="Your source name"><button class="btn pri" data-a="savesrc">Save</button><button class="btn ghost" data-a="cancelsrc">Cancel</button></div>`:`<div class="row" style="margin-bottom:4px"><h1 class="h1 sp" style="min-width:0">${who} Library</h1><button class="btn sm ghost" data-a="editsrc" aria-label="Edit your source name">${S.creator?'Rename':'Set name'}</button></div>`;
const chips=[['all','All'],['custom','Custom'],['scanned','Scanned']].map(([k,t])=>`<button class="tagc${S.libF===k?' on':''}" data-a="libf" data-v="${k}">${t}</button>`).join('');
return`${head}<div class="lbl" style="margin-bottom:12px">Everything you've made${S.creator?' as '+esc(S.creator):''}. Tap one to see it full screen.</div><div class="tagrow" style="margin-bottom:14px">${chips}<span class="sp"></span><span class="lbl">${l.length}</span></div>
${l.length?`<div class="lgrid">${l.map(p=>{const ph=p.photoId&&MEM.get(p.photoId);return`<button class="lcard" data-a="view" data-v="${p.id}"><div class="img">${ph?`<img src="${ph.thumb}" alt="">`:p.colors.map(h=>`<div style="background:${h}"></div>`).join('')}</div><div class="meta"><div class="nm">${esc(p.name)}</div><div class="lbl" style="font-size:11px;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(srcLine(p))}</div><div class="mini">${p.colors.map(h=>`<div style="background:${h}"></div>`).join('')}</div></div></button>`}).join('')}</div>`:'<div class="card"><div class="h2">Nothing here yet</div><div class="lbl" style="margin-top:4px">Scan a photo or make a palette in Discover and it shows up here.</div></div>'}
<div class="pastebox" id="pastebox" contenteditable="true" role="textbox" aria-label="Paste a screenshot" style="margin-top:20px">Copied a screenshot? Tap here, then Paste</div>`}
function renderViewer(){const v=S.viewer;const o=$('ov');if(!v){if(!S.studio)o.innerHTML='';lockScroll();return}const p=S.saved.find(x=>x.id===v.ids[v.i]);if(!p){S.viewer=null;renderViewer();return}const ph=p.photoId&&MEM.has(p.photoId);const menu=S.menu==='fs'+p.id;
o.innerHTML=`<div class="fs" id="fs"><div class="fs-top"><button class="btn sm ghost icon" data-a="vclose" aria-label="Close">${ICON.close}</button><span class="lbl sp" style="text-align:center">${v.i+1} of ${v.ids.length}</span><button class="btn sm ghost icon" data-a="share" data-v="${p.id}" aria-label="Share">${ICON.share}</button></div>
<div class="fs-body" id="fsb">${ph?`<div class="fs-ph"><canvas data-fsthumb="${p.id}"></canvas></div>`:''}<div class="pal" style="height:${ph?96:180}px;border-radius:16px">${p.colors.map(h=>`<div data-a="copy" data-v="${h}" style="background:${h}" role="button" aria-label="Copy ${h}"></div>`).join('')}</div><div class="hexrow mono" style="font-size:12px">${p.colors.map(h=>`<span>${h.slice(1)}</span>`).join('')}</div>
<h2 class="h1" style="font-size:24px;margin-top:4px">${esc(p.name)}</h2><div class="lbl" style="margin-top:4px;color:var(--fg);font-weight:600;letter-spacing:.02em">${esc(srcLine(p))}</div><div class="tagrow" style="margin:10px 0 16px">${(p.tags||[]).map(t=>`<span class="tagc">${esc(t)}</span>`).join('')}</div>
<div class="row"><button class="btn" data-a="menu" data-v="fs${p.id}">${ICON.copy}Copy<span style="display:inline-flex;transform:rotate(${menu?180:0}deg)">${ICON.chev}</span></button><button class="btn" data-a="share" data-v="${p.id}">${ICON.share}Share</button><span class="sp"></span><button class="btn pri" data-a="vedit" data-v="${p.id}">Edit</button></div>${menu?copyMenu(p.id):''}</div>
<div class="fs-bot"><button class="btn big" style="flex:1" data-a="vprev" ${v.i===0?'aria-disabled="true"':''}>${ICON.back}Previous</button><button class="btn big" style="flex:1" data-a="vnext">Next<span style="display:inline-flex;transform:rotate(180deg)">${ICON.back}</span></button></div></div>`;
lockScroll();const cv=o.querySelector('canvas[data-fsthumb]');if(cv)drawCrop(cv,p);bindSwipe()}
async function drawCrop(cv,p){const im=await photoImg(p.photoId);if(!im)return;const dpr=window.devicePixelRatio||1;const W=cv.clientWidth,H=cv.clientHeight||W;cv.width=W*dpr;cv.height=H*dpr;const sc=p.scan||{z:1,cx:.5,cy:.5};const iw=im.naturalWidth,ih=im.naturalHeight;const side=Math.min(iw,ih)/sc.z;const cx=clamp(sc.cx*iw,side/2,iw-side/2),cy=clamp(sc.cy*ih,side/2,ih-side/2);const ar=W/H;cv.getContext('2d').drawImage(im,cx-side/2,cy-side/ar/2,side,side/ar,0,0,cv.width,cv.height)}
function bindSwipe(){const el=$('fsb');if(!el)return;let x0=null,y0=null;el.addEventListener('touchstart',e=>{x0=e.touches[0].clientX;y0=e.touches[0].clientY},{passive:true});el.addEventListener('touchend',e=>{if(x0==null)return;const dx=e.changedTouches[0].clientX-x0,dy=e.changedTouches[0].clientY-y0;x0=null;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5)A[dx<0?'vnext':'vprev']()},{passive:true})}
const copyMenu=id=>`<div class="menu"><button data-a="copyhex" data-v="${id}"><div class="t">Copy hex codes</div><div class="d">The codes, ready to paste anywhere</div></button><button data-a="copycss" data-v="${id}"><div class="t">Copy for websites</div><div class="d">Code a web designer pastes in so a site uses these exact colors</div></button><button data-a="paintsoon" class="soon"><div class="t">Match to paint colors</div><div class="d">Coming soon: the nearest paint chips for each color</div></button></div>`;

/* Settings */
function themeRow(t,i,kind,cur){cur=cur||S.theme;const on=!!(cur&&cur.cols&&cur.name===t.name&&cur.cols.join()===t.cols.join());return`<button class="theme${on?' on':''}" data-a="theme" data-v="${kind}:${i}"><span class="dots4">${t.cols.slice(0,4).map(c=>`<i style="background:${readable(c)}"></i>`).join('')}</span><span class="sp" style="font-weight:600">${esc(t.name)}</span>${on?`<span style="color:var(--acc);display:inline-flex">${ICON.check}</span>`:''}</button>`}
function settingsHTML(){const n=S.saved.length,m=MEM.size;const armed=S.armed==='reset';const mine=S.saved.filter(p=>p.colors.length>=2&&isMine(p)).slice(0,12);const nt=S.navTheme;
return`<h1 class="h1" style="margin-bottom:18px">Settings</h1>
<div class="sect"><div class="h2" style="margin-bottom:4px">Your source name</div><div class="lbl" style="margin-bottom:10px">Shown on everything you make, the way Color Hunt is shown on theirs. Changing it updates all your palettes.</div><input type="text" id="creator" value="${esc(S.creator)}" placeholder="Your name or business, like A-Frame" aria-label="Your source name"></div>
<div class="sect"><div class="h2" style="margin-bottom:4px">Theme</div><div class="lbl" style="margin-bottom:12px">Colors the buttons, bar edges and glow. Each bottom tab takes one color from the theme.</div>${THEMES.map((t,i)=>themeRow(t,i,'c')).join('')}${mine.length?`<div class="lbl" style="margin:14px 0 8px">From your palettes</div>${mine.map((p,i)=>themeRow({name:p.name,cols:p.colors},S.saved.indexOf(p),'p')).join('')}`:''}</div>
<div class="sect"><div class="h2" style="margin-bottom:4px">Bottom bar icons</div><div class="lbl" style="margin-bottom:10px">Labels stay white. Choose how the icons light up when tapped.</div><div class="seg" style="margin-bottom:10px"><button class="${nt==='match'?'on':''}" data-a="navtheme" data-v="match">Match theme</button><button class="${nt==='white'?'on':''}" data-a="navtheme" data-v="white">White</button><button class="${nt&&nt.cols?'on':''}" data-a="navtheme" data-v="pick">Own colors</button></div>${nt&&nt.cols||S.navPick?`${THEMES.map((t,i)=>themeRow(t,i,'nc',nt)).join('')}${mine.map(p=>themeRow({name:p.name,cols:p.colors},S.saved.indexOf(p),'np',nt)).join('')}`:''}</div>
<div class="sect"><div class="h2" style="margin-bottom:6px">Your taste</div><div class="lbl" style="margin-bottom:10px">${S.likeHex.length} colors picked. Discover uses them to show you colors you'll like.</div><button class="btn" data-a="retake">Retake taste test</button></div>
<div class="sect card"><div class="row"><span style="width:10px;height:10px;border-radius:50%;background:#6EC98A;flex-shrink:0"></span><span class="h2">Saved on this phone</span></div><div class="lbl" style="margin-top:6px">${n} palette${n===1?'':'s'} · ${m} photo${m===1?'':'s'}${DB.db?'':' · photos last until you close this page'}</div><div class="lbl" style="margin-top:8px">Add ColorShare to your Home Screen to keep your palettes safe. iPhone can clear data for web apps that aren't on the Home Screen.</div></div>
<div class="sect"><div class="h2" style="margin-bottom:4px">Move your palettes</div><div class="lbl" style="margin-bottom:10px">Copy your palettes here, then paste them into ColorShare on another device or website. Photos stay on this device.</div><button class="btn" data-a="exportp">${ICON.copy}Copy my palettes</button><textarea id="impjson" placeholder="Paste copied palettes here" aria-label="Paste palettes to import" style="display:block;width:100%;height:80px;margin-top:10px;font:inherit;font-size:14px;padding:10px 12px;border-radius:12px;border:1px solid var(--line2);background:var(--s2);color:var(--fg);resize:vertical"></textarea><button class="btn" data-a="importp" style="margin-top:8px">Import pasted palettes</button></div>
<div class="sect"><button class="btn ${armed?'warn':''}" data-a="reset">${armed?'Tap again to erase everything':'Reset prototype data'}</button></div>`}

/* Build */
function buildHTML(){return`<div class="card"><div class="lbl" style="margin-bottom:8px">From your ${S.anchors.length} color${S.anchors.length===1?'':'s'}${S.anchors.length>5?' · best combinations of them':' · kept in every suggestion'}</div><div class="row" style="gap:3px">${S.anchors.map(h=>`<div style="flex:1;height:30px;border-radius:7px;background:${h}"></div>`).join('')}</div></div>
<div class="row" style="margin:8px 0 6px"><span class="slab">Close</span><div class="rng"><input type="range" id="far" min="0" max="100" step="1" value="${S.far}" aria-label="Close or far hues"></div><span class="slab r">Far</span></div><div class="lbl" style="margin-bottom:16px">Close keeps your hues. Far brings in contrasting ones. Moving it makes a fresh set.</div>
${S.sugg.map((p,i)=>`<div class="card"><div class="h2" style="margin-bottom:10px">${esc(p.name)}</div><div class="pal">${p.colors.map(h=>`<div data-a="copy" data-v="${h}" style="background:${h}"></div>`).join('')}</div><div class="hexrow mono">${p.colors.map(h=>`<span>${h.slice(1)}</span>`).join('')}</div><div class="row"><button class="btn pri" data-a="usesugg" data-v="${i}">Use this</button><button class="btn" data-a="savesugg" data-v="${i}">Save as new</button><span class="sp"></span><button class="btn icon" data-a="sharesugg" data-v="${i}" aria-label="Share">${ICON.share}</button></div></div>`).join('')||'<div class="lbl">Add a color or two first.</div>'}
<button class="btn" style="width:100%" data-a="moresugg">More palettes</button>`}

/* ---------- sheets ---------- */
function renderSheet2(){const o=$('ov2');
if(S.chooser){o.innerHTML=`<div class="sheet-bg" data-a="chooseclose"><div class="sheet"><div class="handle"></div><div class="h2" style="font-size:20px;margin-bottom:14px">Scan colors</div><button class="choice" data-a="takephoto">${ICON.camera}<span><span class="h2" style="display:block">Take photo</span><span class="lbl">Opens your camera</span></span></button><button class="choice" data-a="chooselib">${ICON.library}<span><span class="h2" style="display:block">Photo library</span><span class="lbl">Photos and screenshots you already have</span></span></button><button class="btn big ghost" style="width:100%" data-a="chooseclose">Cancel</button></div></div>`;lockScroll();return}
if(S.confirm){const c=S.confirm;o.innerHTML=`<div class="sheet-bg" data-a="cconfirm"><div class="sheet"><div class="handle"></div><div class="h2" style="font-size:20px">Save changes to ${esc(c.orig)}?</div><div class="lbl" style="margin:4px 0 14px">Overwrite replaces the original. Save as new keeps both.</div><div class="pal" style="height:46px;margin-bottom:18px">${c.colors.map(h=>`<div style="background:${h};cursor:default"></div>`).join('')}</div><button class="btn big pri" style="width:100%;margin-bottom:10px" data-a="overwrite">Overwrite</button><button class="btn big" style="width:100%;margin-bottom:6px" data-a="saveasnew">Save as new</button><button class="btn big ghost" style="width:100%" data-a="cconfirm">Cancel</button></div></div>`;lockScroll();return}
o.innerHTML='';lockScroll()}
function lockScroll(){document.body.style.overflow=(S.studio||S.confirm||S.chooser||S.viewer)?'hidden':''}
function savePalette(rec,overwriteId){if(overwriteId){const i=S.saved.findIndex(p=>p.id===overwriteId);rec.name=uniqueName(rec.name,overwriteId);rec.id=overwriteId;rec.created=S.saved[i].created;S.saved[i]=rec}else{rec.name=uniqueName(rec.name);rec.id=uid();rec.created=Date.now();S.saved.unshift(rec)}if(!persist())toast('Storage is full. Delete a few palettes or photos.',3500);return rec}

/* ---------- scan studio ---------- */
function openFile(f){const url=URL.createObjectURL(f);const im=new Image();im.onload=()=>{openStudio({img:im});URL.revokeObjectURL(url)};im.onerror=()=>{toast('That image could not be opened. Try a JPEG or PNG.');URL.revokeObjectURL(url)};im.src=url}
function openStudio(o){const im=o.img;const iw0=im.naturalWidth||im.width,ih0=im.naturalHeight||im.height;const sc=Math.min(1,1200/Math.max(iw0,ih0));const src=document.createElement('canvas');src.width=Math.round(iw0*sc);src.height=Math.round(ih0*sc);const sctx=src.getContext('2d',{willReadFrequently:true});sctx.drawImage(im,0,0,src.width,src.height);
const s=o.scan||{};S.studio={src,sctx,iw:src.width,ih:src.height,photoId:o.photoId||null,editId:o.editId||null,z:s.z||1,cx:s.cx??.5,cy:s.cy??.5,k:s.k||6,added:(s.added||[]).map(a=>({...a})),off:[...(s.off||[])],light:s.light||0,bold:s.bold||0,name:o.name||'',tags:o.tags?[...o.tags]:[],source:o.source??null,auto:[],match:null,hinted:!!o.editId};S.studio.orig=JSON.stringify({z:S.studio.z,cx:S.studio.cx,cy:S.studio.cy,k:S.studio.k,added:S.studio.added,off:S.studio.off,light:S.studio.light,bold:S.studio.bold,name:S.studio.name,tags:S.studio.tags,source:S.studio.source});
$('ov').innerHTML=`<div class="sheet-bg"><div class="sheet" id="sheet"><div class="handle"></div><div class="row" style="margin-bottom:10px"><span class="h2 sp" style="font-size:20px">${o.editId?'Edit scan':'New scan'}</span><button class="btn sm ghost" data-a="stclose" aria-label="Close">${ICON.close}</button></div><div style="position:relative"><div class="vp" id="vp"><canvas id="vpc"></canvas><div class="vphint" id="vphint">Pinch to zoom · drag to frame · press and hold to pick a color</div></div><div class="loupe" id="lp"><canvas id="lpc"></canvas></div><div class="loupetag" id="lpt"></div></div><div id="stdyn" style="margin-top:14px"></div></div></div>`;
lockScroll();requestAnimationFrame(()=>{drawVP();runExtract();bindVP()})}
function closeStudio(){S.studio=null;$('ov').innerHTML='';lockScroll()}
function region(){const st=S.studio;const side=Math.min(st.iw,st.ih)/st.z;const cx=clamp(st.cx*st.iw,side/2,st.iw-side/2),cy=clamp(st.cy*st.ih,side/2,st.ih-side/2);st.cx=cx/st.iw;st.cy=cy/st.ih;return{side,x:cx-side/2,y:cy-side/2}}
function drawVP(){const st=S.studio;if(!st)return;const cv=$('vpc');if(!cv)return;const W=cv.clientWidth,dpr=window.devicePixelRatio||1;if(cv.width!==Math.round(W*dpr)){cv.width=Math.round(W*dpr);cv.height=Math.round(W*dpr)}const ctx=cv.getContext('2d');const r=region();ctx.drawImage(st.src,r.x,r.y,r.side,r.side,0,0,cv.width,cv.height);
st.added.forEach(a=>{const px=(a.x*st.iw-r.x)/r.side*cv.width,py=(a.y*st.ih-r.y)/r.side*cv.height;if(px<0||py<0||px>cv.width||py>cv.height)return;ctx.beginPath();ctx.arc(px,py,9*dpr,0,Math.PI*2);ctx.fillStyle=a.hex;ctx.fill();ctx.lineWidth=2.5*dpr;ctx.strokeStyle='#fff';ctx.stroke()})}
function sampleImg(x,y){const st=S.studio;const r=Math.max(1,Math.round(region().side/180));const x0=clamp(Math.round(x)-r,0,st.iw-1),y0=clamp(Math.round(y)-r,0,st.ih-1);const w=Math.max(1,Math.min(st.iw-x0,2*r+1)),h=Math.max(1,Math.min(st.ih-y0,2*r+1));const d=st.sctx.getImageData(x0,y0,w,h).data;let R=0,G=0,B=0,n=0;for(let i=0;i<d.length;i+=4){R+=lin(d[i]/255);G+=lin(d[i+1]/255);B+=lin(d[i+2]/255);n++}return toHex(gam(R/n),gam(G/n),gam(B/n))}
function extractRegion(k){const st=S.studio;const r=region();const N=96;const t=document.createElement('canvas');t.width=N;t.height=N;const x=t.getContext('2d',{willReadFrequently:true});x.drawImage(st.src,r.x,r.y,r.side,r.side,0,0,N,N);const d=x.getImageData(0,0,N,N).data;const px=[];for(let i=0;i<d.length;i+=4)px.push(rgbOk(d[i]/255,d[i+1]/255,d[i+2]/255));
const K=k+3;const mean=[0,1,2].map(j=>px.reduce((s,p)=>s+p[j],0)/px.length);let md=px.map(p=>dist(p,mean));const cs=[];for(let n=0;n<K;n++){let bi=0;for(let i=1;i<px.length;i++)if(md[i]>md[bi])bi=i;cs.push([...px[bi]]);for(let i=0;i<px.length;i++){const dd=dist(px[i],cs[n]);md[i]=n===0?dd:Math.min(md[i],dd)}}
const cnt=new Array(K).fill(0);for(let it=0;it<12;it++){const sum=cs.map(()=>[0,0,0,0]);for(const p of px){let b=0,bd=1e9;for(let j=0;j<K;j++){const c2=cs[j];const dd=(p[0]-c2[0])**2+(p[1]-c2[1])**2+(p[2]-c2[2])**2;if(dd<bd){bd=dd;b=j}}const s=sum[b];s[0]+=p[0];s[1]+=p[1];s[2]+=p[2];s[3]++}sum.forEach((s,j)=>{if(s[3])cs[j]=[s[0]/s[3],s[1]/s[3],s[2]/s[3]];cnt[j]=s[3]})}
const cl=cs.map((o,j)=>({o,n:cnt[j]})).sort((a,b)=>b.n-a.n);const mg=[];for(const c of cl){const m=mg.find(z=>dist(z.o,c.o)<6);if(m){const t2=m.n+c.n;if(t2)m.o=m.o.map((v,j)=>(v*m.n+c.o[j]*c.n)/t2);m.n=t2}else mg.push({o:[...c.o],n:c.n})}
return mg.filter(c=>c.n/px.length>=0.012).sort((a,b)=>b.n-a.n).slice(0,k).map(c=>({hex:okHex(c.o),pct:Math.round(c.n/px.length*100)}))}
let exT;function runExtract(delay){clearTimeout(exT);exT=setTimeout(()=>{if(!S.studio)return;S.studio.auto=extractRegion(S.studio.k);if(S.studio.match)return;renderStudio()},delay||0)}
function stLists(){const st=S.studio;const off=new Set(st.off);const seen=new Set();let all=[...st.added.map(a=>({hex:a.hex,man:true,pct:100})),...st.auto.map(c=>({hex:c.hex,man:false,pct:c.pct}))].filter(c=>seen.has(c.hex)?false:(seen.add(c.hex),true));let inc=all.filter(c=>!off.has(c.hex));if(inc.length>12){const man=inc.filter(c=>c.man),au=inc.filter(c=>!c.man).sort((a,b)=>b.pct-a.pct);inc=[...man,...au.slice(0,Math.max(0,12-man.length))]}const sortL=a=>a.sort((x,y)=>Lof(x.hex)-Lof(y.hex));return{all:sortL(all),inc:sortL(inc),incSet:new Set(inc.map(c=>c.hex))}}
const stFinal=()=>{const st=S.studio;return tone(stLists().inc.map(c=>c.hex),st.light,st.bold)};
function stNameInput(){const el=$('stn');if(el)S.studio.name=el.value;return S.studio.name.trim()}
function renderStudio(){const st=S.studio;if(!st)return;const host=$('stdyn');if(!host)return;stNameInput();
if(st.match){const m=st.match,adj=lchHex(m.L,m.C,m.h);host.innerHTML=`<div class="h2" style="margin-bottom:4px">Match to surface</div><div class="lbl" style="margin-bottom:12px">Hold your phone next to the real surface. Slide along each bar until they match.</div><div id="msw" style="height:190px;border-radius:14px;background:${adj}"></div><div class="row" style="margin:10px 0 14px"><div style="width:46px;height:24px;border-radius:6px;background:${m.orig}"></div><span class="lbl">From photo</span><span class="sp"></span><span class="mono" id="mhex" style="font-size:13px;color:var(--fg)">${adj}</span></div>
<div class="pad" data-pad="light"><span>Lighter</span><span class="pmid"></span><span class="knob"></span><span>Darker</span></div><div class="pad" data-pad="warm"><span>Warmer</span><span class="pmid"></span><span class="knob"></span><span>Cooler</span></div><div class="pad" data-pad="chroma"><span>More color</span><span class="pmid"></span><span class="knob"></span><span>Less color</span></div>
<div class="row" style="margin-top:6px"><button class="btn big ghost" data-a="matchback">Back</button><button class="btn big ghost" data-a="matchreset">Reset</button><button class="btn big pri" style="flex:1" data-a="matchuse">Use this color</button></div>`;bindPads();return}
const L=stLists();const fin=tone(L.inc.map(c=>c.hex),st.light,st.bold);const ti=new Map(L.inc.map((c,i)=>[c.hex,fin[i]]));const last=st.added[st.added.length-1];
host.innerHTML=`<div style="display:flex;gap:3px">${L.all.map(c=>{const on=L.incSet.has(c.hex);return`<div class="stchip${on?'':' off'}" role="button" aria-label="${on?'Leave out':'Include'} ${c.hex}" data-a="sttoggle" data-v="${c.hex}" style="background:${on?ti.get(c.hex):c.hex}">${c.man?'<span class="dot"></span>':''}</div>`}).join('')||'<div class="empty" style="height:60px">Reading colors…</div>'}</div>
<div class="row" style="margin-top:6px"><span class="lbl sp">${L.inc.length} of 12 · tap to leave out · <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#fff;margin:0 3px"></span>picked by you</span><button class="btn sm icon" data-a="streset" aria-label="Reset to how it was">${ICON.reset}</button><button class="btn sm icon" data-a="stshare" aria-label="Share palette">${ICON.share}</button></div>
${last?`<div class="row" style="margin-top:12px;padding:8px;border-radius:12px;background:var(--s2)"><div style="width:30px;height:30px;border-radius:8px;background:${last.hex};flex-shrink:0"></div><span class="mono" style="color:var(--fg)">${last.hex}</span><span class="sp"></span><button class="btn sm" data-a="matchopen">Match to surface</button><button class="btn sm ghost icon" data-a="unpick" aria-label="Remove last picked color">${ICON.close}</button></div>`:''}
<div class="row" style="margin-top:16px"><span class="slab">Colors</span><div class="rng"><input type="range" id="stk" min="3" max="12" step="1" value="${st.k}" aria-label="Number of colors"></div><span class="slab r" style="width:28px">${st.k}</span></div>
<div style="margin-top:10px">${snapRange('stl',Math.round(st.light*100),'Darker','Lighter','Lighter or darker')}<div style="height:6px"></div>${snapRange('stb',Math.round(st.bold*100),'Softer','Bolder','Softer or bolder')}</div>
<div class="row" style="margin-top:14px"><input type="text" id="stn" class="name" value="${esc(st.name)}" placeholder="${esc(baseName(fin)||'Name your palette')}" aria-label="Palette name"><button class="btn sm ghost" data-a="stauto">Auto</button></div>${srcField(st.source,'s',true)}${tagsHTML(st.tags,'s')}
<div class="row" style="margin-top:14px"><button class="btn big ghost" data-a="stclose">Cancel</button><button class="btn big pri" style="flex:1" data-a="stsave">${st.editId?'Done':'Save palette'}</button></div>`}
function repaintStudioTones(){const st=S.studio;const L=stLists();const fin=tone(L.inc.map(c=>c.hex),st.light,st.bold);const m=new Map(L.inc.map((c,i)=>[c.hex,fin[i]]));document.querySelectorAll('.stchip').forEach(el=>{if(m.has(el.dataset.v))el.style.background=m.get(el.dataset.v)});const n=$('stn');if(n)n.placeholder=baseName(fin)}
/* drag surfaces for Match to surface: slide immediately, no hold */
function bindPads(){document.querySelectorAll('.pad').forEach(pad=>{let x0=null,base=null;const key=pad.dataset.pad;const knob=pad.querySelector('.knob');
const start=x=>{const m=S.studio.match;x0=x;base={L:m.L,C:m.C,h:m.h};pad.classList.add('act');move(x)};
const move=x=>{if(x0==null)return;const m=S.studio.match;const r=pad.getBoundingClientRect();const dx=x-x0;knob.style.left=clamp(x-r.left,8,r.width-8)+'px';
if(key==='light')m.L=clamp(base.L-dx*0.0008,0.06,0.98);
if(key==='warm'){const steps=dx*0.12;m.h=base.h;const t=steps<0?60:250;const d=((t-base.h+540)%360)-180;m.h=base.h+Math.sign(d)*Math.min(Math.abs(d),Math.abs(steps));m.C=base.C<0.02?base.C+Math.min(0.03,Math.abs(dx)*0.0002):base.C}
if(key==='chroma')m.C=Math.max(0,base.C-dx*0.0004);
const adj=lchHex(m.L,m.C,m.h);$('msw').style.background=adj;$('mhex').textContent=adj};
const end=()=>{x0=null;pad.classList.remove('act')};
pad.addEventListener('touchstart',e=>{e.preventDefault();start(e.touches[0].clientX)},{passive:false});pad.addEventListener('touchmove',e=>{e.preventDefault();move(e.touches[0].clientX)},{passive:false});pad.addEventListener('touchend',end);pad.addEventListener('touchcancel',end);
pad.addEventListener('mousedown',e=>{start(e.clientX);const mm=ev=>move(ev.clientX);const mu=()=>{end();window.removeEventListener('mousemove',mm);window.removeEventListener('mouseup',mu)};window.addEventListener('mousemove',mm);window.addEventListener('mouseup',mu)})})}
/* photo gestures: touch events on phones (most reliable on iPhone), mouse on desktop */
function bindVP(){const vp=$('vp');if(!vp)return;let g=null;const lp=$('lp'),lpt=$('lpt'),lpc=$('lpc');
const W=()=>vp.clientWidth;const toImg=(px,py)=>{const r=region();return[r.x+px/W()*r.side,r.y+py/W()*r.side]};
const hideHint=()=>{const h=$('vphint');if(h)h.style.opacity=0};
const rel=(x,y)=>{const r=vp.getBoundingClientRect();return[x-r.left,y-r.top]};
const hideLoupe=()=>{lp.style.display='none';lpt.style.display='none'};
function loupeAt(px,py){const st=S.studio;const[ix,iy]=toImg(px,py);const hex=sampleImg(ix,iy);g.hex=hex;g.ix=ix;g.iy=iy;const LS=118,dpr=window.devicePixelRatio||1;lp.style.display='block';lpt.style.display='block';let lx=clamp(px-LS/2,-8,W()-LS+8),ly=py-LS-34;if(ly<-8)ly=py+34;lp.style.left=lx+'px';lp.style.top=ly+'px';lp.style.boxShadow=`0 0 0 5px ${hex}, 0 10px 26px rgba(0,0,0,.55)`;lpt.textContent=hex;lpt.style.left=(lx+LS/2-30)+'px';lpt.style.top=(ly+LS+8)+'px';
lpc.width=LS*dpr;lpc.height=LS*dpr;const c=lpc.getContext('2d');c.imageSmoothingEnabled=false;const rs=region().side*(LS/W())/4;c.drawImage(st.src,ix-rs/2,iy-rs/2,rs,rs,0,0,lpc.width,lpc.height);const m=lpc.width/2;c.lineWidth=2*dpr;c.strokeStyle='rgba(0,0,0,.6)';c.beginPath();c.arc(m,m,8*dpr,0,Math.PI*2);c.stroke();c.strokeStyle='#fff';c.lineWidth=1.2*dpr;c.beginPath();c.arc(m,m,6.5*dpr,0,Math.PI*2);c.stroke()}
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
if(g.mode==='loupe'){hideLoupe();if(!cancelled){const L=stLists();if(L.inc.length>=12&&!st.added.some(a=>a.hex===g.hex))toast('This palette is full at 12 colors');else if(!st.added.some(a=>a.hex===g.hex)){st.added.push({hex:g.hex,x:g.ix/st.iw,y:g.iy/st.ih});st.off=st.off.filter(h=>h!==g.hex);st.match=null;drawVP();renderStudio()}}g=null;return}
if(g.mode==='pinch'){if(remaining.length===1){g={mode:'idle'}}else{g=null;runExtract(0)}return}
if(g.mode==='pend'&&!cancelled&&!st.hinted){st.hinted=true;toast('Press and hold to pick a color')}
if(g.mode==='pan')runExtract(0);if(!remaining.length)g=null}
const tp=e=>[...e.touches].map(t=>rel(t.clientX,t.clientY));
vp.addEventListener('touchstart',e=>{e.preventDefault();const p=tp(e);if(g&&g.mode==='idle'&&p.length===1)return;down(p)},{passive:false});
vp.addEventListener('touchmove',e=>{e.preventDefault();if(g&&g.mode==='idle')return;move(tp(e))},{passive:false});
vp.addEventListener('touchend',e=>{e.preventDefault();const r=tp(e);if(g&&g.mode==='idle'){if(!r.length){g=null;runExtract(0)}return}up(r,false)},{passive:false});
vp.addEventListener('touchcancel',e=>{up(tp(e),true)});
vp.addEventListener('gesturestart',e=>e.preventDefault());vp.addEventListener('contextmenu',e=>e.preventDefault());
vp.addEventListener('mousedown',e=>{const p=[rel(e.clientX,e.clientY)];down(p);const mm=ev=>move([rel(ev.clientX,ev.clientY)]);const mu=()=>{up([],false);window.removeEventListener('mousemove',mm);window.removeEventListener('mouseup',mu)};window.addEventListener('mousemove',mm);window.addEventListener('mouseup',mu)});
vp.addEventListener('wheel',e=>{e.preventDefault();const st=S.studio;st.z=clamp(st.z*(e.deltaY<0?1.08:1/1.08),1,10);drawVP();runExtract(160)},{passive:false})}
document.addEventListener('gesturestart',e=>{if(S.studio)e.preventDefault()});
async function saveStudio(overwrite){const st=S.studio;const colors=stFinal();if(!colors.length){toast('Leave at least one color in');return}const typed=stNameInput();
let pid=st.photoId;if(!pid){pid=uid();let q=0.82,data=st.src.toDataURL('image/jpeg',q);while(data.length>150000&&q>0.5){q-=0.08;data=st.src.toDataURL('image/jpeg',q)}const t=document.createElement('canvas');t.width=t.height=240;const side=Math.min(st.iw,st.ih);t.getContext('2d').drawImage(st.src,(st.iw-side)/2,(st.ih-side)/2,side,side,0,0,240,240);const ok=await DB.put({id:pid,data,thumb:t.toDataURL('image/jpeg',0.8),created:Date.now()});if(!ok&&!DB.db)toast('Photo kept for this visit only',2500)}
const rec={name:typed||baseName(colors),colors,src:'Scanned',tags:[...st.tags],mine:true,source:st.source||null,photoId:pid,scan:{z:st.z,cx:st.cx,cy:st.cy,k:st.k,added:st.added,off:st.off,light:st.light,bold:st.bold}};
const saved=savePalette(rec,overwrite?st.editId:null);closeStudio();S.confirm=null;renderSheet2();go('pal');toast('Saved as '+saved.name)}
async function editScanPalette(p){const im=await photoImg(p.photoId);if(!im){toast('Photo not found on this phone. Editing colors only.');startEditDraft(p);return}openStudio({img:im,photoId:p.photoId,editId:p.id,scan:p.scan,name:p.name,tags:p.tags,source:p.source})}
function startEditDraft(p){S.draft={id:p.id,base:[...p.colors],light:0,bold:0,name:p.name,named:true,src:p.src,tags:[...(p.tags||[])],source:p.source,mine:p.mine};snapDraft();S.menu=null;S.closedGroups.delete('src:'+srcOf(p));if(S.view!=='pal')go('pal');else renderMain();setTimeout(()=>{const el=document.querySelector('[data-host=draft]');if(el)el.scrollIntoView({block:'center',behavior:'smooth'})},30)}

/* ---------- actions ---------- */
const A={
go:v=>{S.armed=null;go(v)},
back:()=>go(S.prev),
scan:()=>{S.chooser=true;renderSheet2()},
chooseclose:()=>{S.chooser=false;renderSheet2()},
takephoto:()=>{S.chooser=false;renderSheet2();const c=$('cam');c.value='';c.click()},
chooselib:()=>{S.chooser=false;renderSheet2();const f=$('file');f.value='';f.click()},
like:v=>{const i=S.likeHex.indexOf(v);if(i>=0)S.likeHex.splice(i,1);else S.likeHex.push(v);S.likes=S.likeHex.map(hexOk);persist();document.querySelectorAll(`#setgrid .sw[data-v="${v}"]`).forEach(el=>el.classList.toggle('sel',i<0));const b=$('sbar');if(b)b.innerHTML=setupBarHTML()},
done50:()=>{const n=S.likeHex.length;if(n<50){toast('Pick '+(50-n)+' more');return}S.setup=false;persist();S.stream=streamBatch(60);renderMain();window.scrollTo(0,0);toast('Discover now follows your taste')},
skip:()=>{S.setup=false;persist();S.stream=streamBatch(60);renderMain();window.scrollTo(0,0)},
retake:()=>{S.setup=true;persist();if(!S.pool.length)S.pool=[...setupBatch(),...setupBatch()];go('discover')},
create:()=>{newDraft('Discover');renderMain();toast('Tap colors to add them')},
createp:()=>{newDraft('Created');renderMain()},
pick:v=>addToDraft(v),
autoname:()=>{const el=$('dname');if(el){el.value=autoName();S.draft.name=el.value;S.draft.named=true}},
build:()=>{const c=draftCols();if(!c.length){toast('Add at least one color first');return}const el=$('dname');if(el&&el.value.trim()){S.draft.name=el.value;S.draft.named=true}S.anchors=c;buildSugg();go('build')},
adddisc:()=>{const el=$('dname');if(el&&el.value.trim()){S.draft.name=el.value;S.draft.named=true}if(S.setup){S.setup=false;persist()}if(!S.stream.length)S.stream=streamBatch(60);go('discover');toast('Tap colors to add them')},
sharedraft:()=>{const c=draftCols();if(!c.length){toast('Add a color first');return}sharePal(draftName(),c)},
clearall:()=>{if(!S.draft.base.length)return;if(!arm('clear')){refreshDraft();return}S.draft.base=[];S.draft.light=S.draft.bold=0;refreshDraft()},
cancel:()=>{const wasEdit=S.draft&&S.draft.id;S.draft=null;renderMain();if(wasEdit)toast('Changes discarded')},
savenew:()=>{const c=draftCols();if(!c.length){toast('Add at least one color first');return}const r=savePalette({name:draftName(),colors:c,src:S.draft.src||'Created',tags:[...(S.draft.tags||[])],mine:true,source:S.draft.source||null});S.draft=null;go('pal');toast('Saved as '+r.name)},
done:()=>{const c=draftCols();if(!c.length){toast('A palette needs at least one color');return}S.draft.pendingName=draftName();const p=S.saved.find(x=>x.id===S.draft.id);S.confirm={kind:'draft',orig:p?p.name:'palette',colors:c};renderSheet2()},
overwrite:()=>{const c=S.confirm;if(!c)return;if(c.kind==='studio'){saveStudio(true);return}const p=S.saved.find(x=>x.id===S.draft.id);const r=savePalette({...p,name:S.draft.pendingName,colors:c.colors,tags:[...(S.draft.tags||[])],source:S.draft.source||(p.mine?null:p.source)},S.draft.id);S.draft=null;S.confirm=null;renderSheet2();go('pal');toast('Saved as '+r.name)},
saveasnew:()=>{const c=S.confirm;if(!c)return;if(c.kind==='studio'){saveStudio(false);return}const p=S.saved.find(x=>x.id===S.draft.id)||{};const r=savePalette({name:S.draft.pendingName,colors:c.colors,src:p.mine&&p.src?p.src:'Created',tags:[...(S.draft.tags||[])],mine:true,source:p.mine?(S.draft.source||null):null});S.draft=null;S.confirm=null;renderSheet2();go('pal');toast('Saved as '+r.name)},
cconfirm:()=>{S.confirm=null;renderSheet2()},
usesugg:v=>{const p=S.sugg[+v];if(!S.draft)newDraft('Generated');S.draft.base=[...p.colors];S.draft.light=S.draft.bold=0;go(S.prev);toast('Loaded into your palette')},
savesugg:v=>{const p=S.sugg[+v];const r=savePalette({name:p.name,colors:[...p.colors],src:'Generated',tags:[],mine:true,source:null});toast('Saved as '+r.name)},
sharesugg:v=>{const p=S.sugg[+v];sharePal(p.name,p.colors)},
moresugg:()=>{buildSugg();renderMain()},
copy:v=>copy(v),
menu:v=>{S.menu=S.menu===v?null:v;if(S.viewer)renderViewer();else renderMain()},
copyhex:v=>{const p=S.saved.find(x=>x.id===v);if(p)copy(p.colors.join(', '),'Copied hex codes');S.menu=null;S.viewer?renderViewer():renderMain()},
copycss:v=>{const p=S.saved.find(x=>x.id===v);if(p)copy(cssOf(p.name,p.colors),'Copied website code');S.menu=null;S.viewer?renderViewer():renderMain()},
paintsoon:()=>toast('Paint matching is coming next'),
share:v=>{const p=S.saved.find(x=>x.id===v);if(p)sharePal(p.name,p.colors)},
edit:v=>{const p=S.saved.find(x=>x.id===v);if(!p)return;S.armed=null;if(p.photoId)editScanPalette(p);else startEditDraft(p)},
del:v=>{if(!arm('del'+v)){renderMain();return}const p=S.saved.find(x=>x.id===v);S.saved=S.saved.filter(x=>x.id!==v);if(S.draft&&S.draft.id===v)S.draft=null;persist();renderMain();toast('Deleted '+(p?p.name:''))},
togglephoto:v=>{if(S.collapsed.has(v))S.collapsed.delete(v);else S.collapsed.add(v);persist();renderMain()},
group:v=>{if(S.closedGroups.has(v))S.closedGroups.delete(v);else S.closedGroups.add(v);persist();renderMain()},
import:()=>{const v=$('imp').value.trim();const raw=v.includes('/palette/')?(v.split('/palette/')[1]||'').match(/[0-9a-fA-F]{6}/g):v.match(/#?[0-9a-fA-F]{6}\b/g);const hx=(raw||[]).map(h=>'#'+h.replace('#','').toUpperCase());if(hx.length<2){$('imperr').textContent='Paste at least two hex codes';return}const cols=hx.slice(0,12);const src=/^https?:/i.test(v)?srcFromUrl(v):'Pasted';const r=savePalette({name:baseName(cols),colors:cols,src,imported:true,mine:false,source:src,tags:[],url:/^https?:/i.test(v)?v:undefined});renderMain();toast('Added as '+r.name)},
openphoto:async v=>{const im=await photoImg(v);if(!im){toast('That photo is no longer on this phone');return}openStudio({img:im,photoId:v})},
theme:v=>{const[k,i]=v.split(':');let t;if(k==='c'||k==='nc')t=THEMES[+i];else{const p=S.saved[+i];if(!p)return;const cols=[...p.colors].sort((a,b)=>hexLch(b)[1]-hexLch(a)[1]).slice(0,4);while(cols.length<4)cols.push(cols[0]);t={name:p.name,cols}}if(k[0]==='n'){S.navTheme=t;S.navPick=false}else S.theme=t;applyTheme();persist();render();toast((k[0]==='n'?'Bar icons: ':'Theme: ')+t.name)},
navtheme:v=>{if(v==='pick'){S.navPick=true;renderMain();return}S.navPick=false;S.navTheme=v;applyTheme();persist();render()},
tagdel:v=>{const[c,i]=v.split(':');const arr=c==='d'?S.draft.tags:S.studio.tags;arr.splice(+i,1);if(c==='d')refreshDraft();else renderStudio()},
tagf:v=>{S.tagF=S.tagF===v?null:v;renderMain()},
libf:v=>{S.libF=v;renderMain()},
editsrc:()=>{S.editSrc=true;renderMain();setTimeout(()=>{const i=$('libsrc');if(i)i.focus()},30)},
cancelsrc:()=>{S.editSrc=false;renderMain()},
savesrc:()=>{const v=($('libsrc').value||'').trim();renameCreator(v);S.editSrc=false;renderMain()},
resetdraft:()=>{if(!S.draft||!S.draft.orig)return;Object.assign(S.draft,JSON.parse(S.draft.orig));const el=$('dname');if(el)el.value=S.draft.named?S.draft.name:'';refreshDraft();toast('Back to how it was')},
streset:()=>{const st=S.studio;if(!st||!st.orig)return;Object.assign(st,JSON.parse(st.orig));const el=$('stn');if(el)el.value=st.name;drawVP();runExtract(0);toast('Back to how it was')},
stshare:()=>{const c=stFinal();if(!c.length)return;sharePal(stNameInput()||baseName(c),c)},
exportp:()=>{const data=S.saved.map(({id,name,colors,src,source,mine,tags,created,imported,url})=>({id,name,colors,src,source,mine,tags,created,imported,url}));copy(JSON.stringify({colorshare:1,palettes:data}),'Copied '+data.length+' palettes')},
importp:()=>{const t=($('impjson').value||'').trim();let d;try{d=JSON.parse(t)}catch(e){toast('That doesn’t look like copied palettes');return}const list=(d&&d.palettes)||[];let n=0;list.forEach(p=>{if(!p||!Array.isArray(p.colors)||S.saved.some(x=>x.id===p.id))return;S.saved.push(norm([p])[0]);n++});persist();renderMain();toast(n?'Imported '+n+' palette'+(n===1?'':'s'):'Nothing new to import')},
view:v=>{const ids=libList().map(p=>p.id);S.viewer={ids,i:Math.max(0,ids.indexOf(v))};S.menu=null;renderViewer()},
vclose:()=>{S.viewer=null;S.menu=null;renderViewer();if(S.view==='library')renderMain()},
vnext:()=>{const v=S.viewer;if(!v)return;v.i=(v.i+1)%v.ids.length;S.menu=null;renderViewer()},
vprev:()=>{const v=S.viewer;if(!v)return;v.i=(v.i-1+v.ids.length)%v.ids.length;S.menu=null;renderViewer()},
vedit:v=>{S.viewer=null;S.menu=null;$('ov').innerHTML='';lockScroll();A.edit(v)},
reset:()=>{if(!arm('reset')){renderMain();return}['saved','setup','likes','collapsed','acc','groups','theme'].forEach(k=>{LSx.del('cs4_'+k);LSx.del('cs3_'+k)});DB.clear();S.saved=norm(SAMPLE.map(p=>({...p})));S.likeHex=[];S.likes=[];S.setup=true;S.stream=[];S.draft=null;S.collapsed=new Set();S.closedGroups=new Set();S.theme=THEMES[0];applyTheme();persist();go('discover');toast('Prototype data erased')},
stclose:()=>closeStudio(),
stauto:()=>{const el=$('stn');if(el){el.value=baseName(stFinal());S.studio.name=el.value}},
stsave:()=>{const st=S.studio;stNameInput();if(st.editId){const p=S.saved.find(x=>x.id===st.editId);S.confirm={kind:'studio',orig:p?p.name:'palette',colors:stFinal()};renderSheet2()}else saveStudio(false)},
sttoggle:v=>{const st=S.studio;const L=stLists();if(L.incSet.has(v))st.off.push(v);else{if(L.inc.length>=12){toast('This palette is full at 12 colors');return}st.off=st.off.filter(h=>h!==v)}renderStudio()},
unpick:()=>{const st=S.studio;st.added.pop();drawVP();renderStudio()},
matchopen:()=>{const st=S.studio;const a=st.added[st.added.length-1];if(!a)return;stNameInput();const[L,C,h]=hexLch(a.hex);st.match={orig:a.hex,L,C,h};renderStudio()},
matchback:()=>{S.studio.match=null;renderStudio()},
matchreset:()=>{const m=S.studio.match;const[L,C,h]=hexLch(m.orig);Object.assign(m,{L,C,h});renderStudio()},
matchuse:()=>{const st=S.studio,m=st.match;const a=st.added[st.added.length-1];if(a)a.hex=lchHex(m.L,m.C,m.h);st.match=null;drawVP();renderStudio()}
};
document.addEventListener('click',e=>{const t=e.target.closest('[data-a]');if(!t)return;if(t.classList.contains('sheet-bg')&&e.target!==t)return;const f=A[t.dataset.a];if(f)f(t.dataset.v,t)});
function snapCheck(el){let v=+el.value;const w=el.parentElement;if(Math.abs(v)<=7&&v!==0){v=0;el.value=0}const was=w.classList.contains('zero');w.classList.toggle('zero',v===0);if(v===0&&!was){w.classList.remove('pop');void w.offsetWidth;w.classList.add('pop');if(navigator.vibrate)try{navigator.vibrate(6)}catch(_){}}return v}
document.addEventListener('input',e=>{const el=e.target,id=el.id;const v=el.dataset.snap?snapCheck(el):+el.value;
if(id==='zoom'){S.zoom=12-v;const g=$('sgrid');if(g)g.style.gridTemplateColumns=`repeat(${S.zoom},minmax(0,1fr))`}
else if(id==='dname'&&S.draft){S.draft.name=el.value;S.draft.named=el.value.trim().length>0}
else if(id==='tl'&&S.draft){S.draft.light=v/100;repaintStrip()}
else if(id==='tb'&&S.draft){S.draft.bold=v/100;repaintStrip()}
else if(id==='imp'){const er=$('imperr');if(er)er.textContent=''}
else if(id==='q'){S.q=el.value;const t=document.createElement('div');t.innerHTML=palHTML();const pl=$('plist');if(pl){pl.innerHTML=t.querySelector('#plist').innerHTML;hydrateThumbs()}}
else if(id==='dsrc'&&S.draft){S.draft.source=el.value.trim()||null}
else if(id==='ssrc'&&S.studio){S.studio.source=el.value.trim()||null}
else if(id==='stn'&&S.studio){S.studio.name=el.value}
else if(id==='stl'&&S.studio){S.studio.light=v/100;repaintStudioTones()}
else if(id==='stb'&&S.studio){S.studio.bold=v/100;repaintStudioTones()}
else if(id==='stk'&&S.studio){S.studio.k=v;const lab=el.parentElement.nextElementSibling;if(lab)lab.textContent=v;runExtract(120)}});
document.addEventListener('change',e=>{const id=e.target.id,v=+e.target.value;if(id==='creator'){renameCreator(e.target.value.trim());return}if(id==='dtag'||id==='stag'){const t=e.target.value.trim();if(t){const arr=id==='dtag'?S.draft.tags:S.studio.tags;if(!arr.includes(t))arr.push(t);if(id==='dtag')refreshDraft();else renderStudio()}return}if(id==='variety'){S.variety=v;S.stream=streamBatch(60);renderMain()}if(id==='far'){S.far=v;buildSugg();renderMain()}});
['file','cam'].forEach(id=>$(id).addEventListener('change',e=>{const f=e.target.files&&e.target.files[0];if(f)openFile(f)}));
document.addEventListener('paste',e=>{const items=e.clipboardData&&e.clipboardData.items;let found=false;if(items)for(const it of items){if(it.type&&it.type.indexOf('image/')===0){const f=it.getAsFile();if(f){found=true;e.preventDefault();openFile(f);break}}}if(!found&&e.target&&e.target.id==='pastebox'){e.preventDefault();toast('No image on the clipboard. Copy a screenshot first.')}});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.target.id==='dtag'||e.target.id==='stag'||e.target.id==='imp'||e.target.id==='libsrc')){e.preventDefault();if(e.target.id==='imp')A.import();else if(e.target.id==='libsrc')A.savesrc();else e.target.blur()}});
document.addEventListener('beforeinput',e=>{if(e.target&&e.target.id==='pastebox'&&e.inputType!=='insertFromPaste')e.preventDefault()});
document.addEventListener('focusin',e=>{if(e.target.id==='pastebox'){const r=document.createRange();r.selectNodeContents(e.target);const s=getSelection();s.removeAllRanges();s.addRange(r)}});
window.addEventListener('resize',()=>{if(S.studio)drawVP()});

/* strip: hold to drag-reorder, tap to remove */
let drag=null;
function paintDrag(){const st=$('strip');if(!st||!drag)return;const cols=tone(drag.tmp,S.draft.light,S.draft.bold);[...st.children].forEach((c,i)=>{c.style.background=cols[i];c.style.transform=i===drag.cur?'scale(1.12)':'';c.style.outline=i===drag.cur?'2px solid #fff':''})}
function dStart(x,y,el){const ch=el.closest&&el.closest('[data-chip]');if(!ch||!S.draft)return false;const i=+ch.dataset.chip;drag={i,x,y,live:false,tmp:[...S.draft.base],cur:i,timer:setTimeout(()=>{if(drag){drag.live=true;paintDrag();if(navigator.vibrate)try{navigator.vibrate(8)}catch(_){}}},320)};return true}
function dMove(x,y){if(!drag)return false;if(!drag.live){if(Math.hypot(x-drag.x,y-drag.y)>10){clearTimeout(drag.timer);drag=null}return false}const st=$('strip');if(!st)return true;const r=st.getBoundingClientRect();const n=drag.tmp.length;const t=clamp(Math.floor((x-r.left)/r.width*n),0,n-1);if(t!==drag.cur){const[c]=drag.tmp.splice(drag.cur,1);drag.tmp.splice(t,0,c);drag.cur=t;paintDrag()}return true}
function dEnd(cancel){if(!drag)return;clearTimeout(drag.timer);const d=drag;drag=null;if(!S.draft)return;if(d.live){S.draft.base=d.tmp;refreshDraft()}else if(!cancel){S.draft.base.splice(d.i,1);refreshDraft()}}
document.addEventListener('touchstart',e=>{if(e.touches.length===1)dStart(e.touches[0].clientX,e.touches[0].clientY,e.target)},{passive:true});
document.addEventListener('touchmove',e=>{if(drag&&dMove(e.touches[0].clientX,e.touches[0].clientY))e.preventDefault()},{passive:false});
document.addEventListener('touchend',e=>{if(drag){e.preventDefault();dEnd(false)}},{passive:false});
document.addEventListener('touchcancel',()=>dEnd(true));
document.addEventListener('mousedown',e=>{if(dStart(e.clientX,e.clientY,e.target)){const mm=ev=>dMove(ev.clientX,ev.clientY);const mu=()=>{dEnd(false);window.removeEventListener('mousemove',mm);window.removeEventListener('mouseup',mu)};window.addEventListener('mousemove',mm);window.addEventListener('mouseup',mu)}});
document.addEventListener('contextmenu',e=>{if(e.target.closest('#strip'))e.preventDefault()});

/* boot */
S.pool=[...setupBatch(),...setupBatch()];if(!S.setup)S.stream=streamBatch(60);persist();render();
DB.open().then(()=>DB.all()).then(list=>{list.forEach(p=>MEM.set(p.id,p));if(['pal','library','settings'].includes(S.view))renderMain()});

/* Clean up the old Swatch Studio service worker on phones that installed it. */
if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister())).catch(()=>{})}
