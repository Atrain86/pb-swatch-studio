# PaintBrain Swatch Studio — Complete Redesign
*Master prompt for Claude Code — includes reference implementation*

---

## How to use this document

This document contains two things:

1. **Section A — Reference UI code.** A working HTML/JavaScript implementation of the new design. Port this directly into the React/Vite app. Do not rebuild from scratch — adapt this code.

2. **Section B — Feature instructions.** Complete behavioral spec for all tabs. Use this to wire logic, connect Supabase, and implement everything the reference code doesn't yet handle.

Work through Section B phases in order after porting Section A.

**Keep the existing logo area exactly as it is.** The PaintBrain logo, wordmark, and layout in the current app header are correct and should not change. Only replace the tab system, color controls, palette builder, and library sections.

---

# SECTION A — Reference UI implementation

Port this code into the app. It represents the complete visual design for Discover, Browse, and Palettes tabs. All color math is LAB-space accurate. All interactions are working.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>PaintBrain Swatch Studio — Reference UI</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
:root{
  --bg:#0a0a0f;
  --hdr:#0d0d16;
  --card:#111118;
  --bdr:rgba(140,171,255,0.18);
  --bdr2:rgba(140,171,255,0.07);
  --tx:#e8e4f4;
  --tx2:#9188aa;
  --tx3:#504860;
  --ac:#8CABFF;
  --ac2:rgba(140,171,255,0.10);
  --ac3:rgba(140,171,255,0.06);
}
body{font-family:system-ui,sans-serif;background:#1a1a2e;display:flex;justify-content:center;padding:2rem 1rem;}
.app{background:var(--bg);border-radius:18px;border:2px solid var(--ac);overflow:hidden;width:100%;max-width:500px;}

/* Header */
.app-hdr{background:var(--hdr);padding:10px 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1.5px solid var(--ac);}
.brand{font-size:17px;font-weight:700;background:linear-gradient(90deg,#B13BFF,#EA2264,#EB5B00);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.sub{font-size:9px;color:var(--tx3);letter-spacing:.06em;margin-top:1px;}
.theme-dots{display:flex;gap:6px;align-items:center;}
.tdot{width:13px;height:13px;border-radius:50%;cursor:pointer;border:2px solid transparent;transition:transform .1s;}
.tdot:hover{transform:scale(1.2);}
.tdot.on{border-color:rgba(255,255,255,0.75);}

/* Tabs */
.tabbar{display:flex;background:var(--hdr);border-bottom:1px solid var(--bdr2);}
.tab{padding:9px 15px;font-size:12px;color:var(--tx3);cursor:pointer;border-bottom:2px solid transparent;transition:all .15s;white-space:nowrap;}
.tab:hover{color:var(--tx2);}
.tab.on{border-bottom-color:var(--ac);}
.tab.on.t-discover{color:#8CABFF;border-bottom-color:#8CABFF;}
.tab.on.t-browse{color:#78C9C5;border-bottom-color:#78C9C5;}
.tab.on.t-palettes{color:#B060C0;border-bottom-color:#B060C0;}
.tab.on.t-scanned{color:#F07858;border-bottom-color:#F07858;}
.tc{display:none;}
.tc.on{display:block;}

/* Sliders */
.sl-row{display:flex;align-items:center;gap:8px;margin-bottom:8px;}
.sl-lbl{font-size:10px;color:var(--tx2);width:56px;flex-shrink:0;}
.sl-track-wrap{flex:1;position:relative;height:11px;border-radius:6px;}
.sl-track-wrap input[type=range]{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;z-index:3;margin:0;}
.sl-knob{position:absolute;top:50%;transform:translate(-50%,-50%);width:17px;height:17px;border-radius:50%;border:2.5px solid rgba(0,0,0,0.3);pointer-events:none;z-index:2;background:#fff;transition:left .04s,background .08s;}
.sl-circle{width:26px;height:26px;border-radius:50%;flex-shrink:0;border:1.5px solid rgba(255,255,255,0.1);transition:background .1s;}
.sl-val{font-size:10px;font-family:monospace;color:var(--ac);width:58px;text-align:right;flex-shrink:0;white-space:nowrap;}

/* Discover */
.disc-ctrl{background:var(--hdr);padding:10px 14px 8px;border-bottom:1.5px solid var(--ac);}
.mtoggle{display:flex;gap:0;margin-bottom:10px;background:rgba(255,255,255,0.04);border-radius:7px;padding:2px;}
.mt{flex:1;padding:4px 0;text-align:center;font-size:11px;border-radius:5px;color:var(--tx3);cursor:pointer;transition:all .12s;}
.mt.on{background:var(--ac2);color:var(--ac);}
.hue-track{background:linear-gradient(to right,hsl(0,90%,55%),hsl(30,90%,55%),hsl(60,85%,50%),hsl(90,80%,42%),hsl(120,80%,38%),hsl(150,80%,42%),hsl(180,80%,42%),hsl(210,85%,55%),hsl(240,85%,60%),hsl(270,85%,55%),hsl(300,80%,50%),hsl(330,85%,50%),hsl(360,90%,55%));}
.bright-track{background:linear-gradient(to right,#111,#555,#aaa,#fff);}
.picks-inline{display:flex;align-items:center;gap:5px;margin-top:7px;min-height:28px;}
.picks-lbl{font-size:10px;color:var(--tx3);flex-shrink:0;}
.picks-chips{display:flex;gap:3px;flex:1;flex-wrap:wrap;align-items:center;}
.pk{width:24px;height:24px;border-radius:4px;cursor:pointer;position:relative;border:0.5px solid rgba(255,255,255,0.06);flex-shrink:0;}
.pk:hover::after{content:'×';position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:12px;background:rgba(0,0,0,0.55);color:#fff;border-radius:4px;}
.picks-hint{font-size:10px;color:var(--tx3);}
.add-lib{padding:3px 9px;border-radius:5px;border:none;background:transparent;color:var(--ac);font-size:10px;cursor:pointer;font-family:inherit;margin-left:auto;flex-shrink:0;white-space:nowrap;}
.add-lib:hover{text-decoration:underline;}
.d-grid-wrap{padding:10px 14px 12px;}
.zoom-ctrl{display:flex;align-items:center;gap:5px;margin-bottom:7px;justify-content:flex-end;}
.zoom-lbl{font-size:9px;color:var(--tx3);}
.zoom-btn{width:20px;height:20px;border-radius:4px;border:1px solid var(--bdr2);background:transparent;color:var(--tx2);font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;}
.zoom-btn:hover{border-color:var(--ac);color:var(--ac);}
.d-grid{display:grid;gap:5px;margin-bottom:8px;}
.dc{border-radius:9px;cursor:pointer;position:relative;transition:transform .07s;border:0.5px solid transparent;aspect-ratio:1;}
.dc:hover{transform:scale(1.06);z-index:2;}
.dc.sel{outline:2.5px solid rgba(255,255,255,0.9);outline-offset:1px;}
.dc-hex{position:absolute;bottom:5px;left:0;right:0;text-align:center;font-size:8px;font-family:monospace;color:rgba(255,255,255,0.8);text-shadow:0 1px 3px rgba(0,0,0,0.8);opacity:0;transition:opacity .1s;}
.dc:hover .dc-hex{opacity:1;}
.more-btn{width:100%;padding:6px;border-radius:7px;border:1px dashed var(--bdr2);background:transparent;color:var(--tx3);font-size:10px;cursor:pointer;font-family:inherit;transition:all .1s;}
.more-btn:hover{border-color:var(--bdr);color:var(--tx2);}

/* Browse */
.br-hdr{background:var(--hdr);padding:10px 14px 8px;border-bottom:1.5px solid var(--ac);}
.preview-strip{height:44px;border-radius:8px;overflow:hidden;margin-bottom:8px;display:flex;cursor:pointer;border:0.5px solid var(--bdr2);transition:all .2s;}
.ps-gradient{flex:1;transition:all .3s;}
.ps-chip{flex:1;position:relative;cursor:pointer;}
.ps-chip:hover::after{content:'×';position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:15px;background:rgba(0,0,0,0.4);color:#fff;}
.ps-hint{display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:10px;color:var(--tx3);}
.pal-acts{display:flex;gap:5px;align-items:center;margin-bottom:0;}
.nin{flex:1;background:rgba(255,255,255,0.04);border:1px solid var(--bdr2);border-radius:6px;padding:4px 9px;font-size:11px;color:var(--tx);font-family:inherit;outline:none;min-width:0;}
.nin:focus{border-color:var(--ac);}
.nin::placeholder{color:var(--tx3);}
.wbtn{padding:4px 0;background:transparent;border:none;color:var(--tx3);font-size:11px;cursor:pointer;font-family:inherit;transition:color .1s;white-space:nowrap;}
.wbtn:hover{color:var(--ac);}
.wbtn.active{color:var(--ac);}
.ctx-row{display:flex;align-items:center;gap:6px;margin-top:7px;padding-top:7px;border-top:1px solid var(--bdr2);}
.ctx-sw{width:22px;height:22px;border-radius:4px;flex-shrink:0;}
.ctx-hex{font-size:11px;font-family:monospace;color:var(--tx);}
.ctx-nm{font-size:9px;color:var(--tx2);margin-left:2px;}
.ctx-acts{display:flex;gap:4px;margin-left:auto;align-items:center;}
.gen-row{display:flex;align-items:center;gap:5px;margin-top:6px;}
.gen-strip{flex:1;height:26px;border-radius:5px;overflow:hidden;display:flex;}
.gs{flex:1;cursor:pointer;transition:opacity .1s;}
.gs:hover{opacity:.8;}
.fid-wrap{display:flex;align-items:center;gap:4px;margin-top:6px;}
.fid-lbl{font-size:9px;color:var(--tx3);flex-shrink:0;}
.fid-track{flex:1;position:relative;height:8px;border-radius:4px;background:linear-gradient(to right,rgba(140,171,255,0.2),rgba(255,107,107,0.3));}
.fid-track input[type=range]{position:absolute;inset:0;width:100%;opacity:0;cursor:pointer;z-index:2;height:100%;}
.fid-knob{position:absolute;top:50%;transform:translate(-50%,-50%);width:14px;height:14px;border-radius:50%;background:#fff;border:2px solid rgba(0,0,0,0.2);pointer-events:none;}
.br-lib{padding:10px 14px 14px;}
.lib-zoom{display:flex;align-items:center;gap:5px;margin-bottom:7px;justify-content:flex-end;}
.fam-lbl{font-size:9px;font-weight:500;letter-spacing:.07em;text-transform:uppercase;color:var(--tx3);margin-bottom:4px;margin-top:9px;}
.fam-lbl:first-child{margin-top:0;}
.b-grid{display:grid;gap:2px;margin-bottom:2px;}
.bch{border-radius:3px;cursor:pointer;position:relative;transition:transform .07s;border:0.5px solid transparent;}
.bch:hover{transform:scale(1.14);z-index:2;border-color:rgba(255,255,255,0.25);}
.bch.sel{outline:2px solid #fff;outline-offset:1px;}

/* Palettes */
.pl-hdr{background:var(--hdr);padding:10px 14px 10px;border-bottom:1.5px solid var(--ac);}
.sr{display:flex;gap:5px;margin-bottom:8px;}
.si{flex:1;background:rgba(255,255,255,0.04);border:1px solid var(--bdr2);border-radius:7px;padding:6px 10px;font-size:11px;color:var(--tx);font-family:inherit;outline:none;}
.si:focus{border-color:var(--ac);}
.si::placeholder{color:var(--tx3);}
.sb{padding:6px 11px;border-radius:7px;border:1.5px solid var(--ac);background:transparent;color:var(--ac);font-size:11px;cursor:pointer;font-family:inherit;}
.src-row{display:flex;gap:0;margin-bottom:8px;}
.src{padding:3px 0;margin-right:12px;font-size:10px;color:var(--tx3);cursor:pointer;border-bottom:1.5px solid transparent;transition:all .1s;}
.src.on{color:#B060C0;border-bottom-color:#B060C0;}
.hue-dots-row{display:flex;gap:6px;align-items:center;flex-wrap:nowrap;}
.hd{width:18px;height:18px;border-radius:50%;cursor:pointer;border:2px solid transparent;transition:all .1s;flex-shrink:0;}
.hd.on{border-color:rgba(255,255,255,0.75);transform:scale(1.15);}
.hd:hover{transform:scale(1.1);}
.pl-list{padding:10px 14px;}
.plc{background:var(--card);border-radius:11px;border:1.5px solid var(--bdr2);overflow:hidden;margin-bottom:10px;transition:border-color .15s;}
.plc:hover{border-color:var(--bdr);}
.pl-strip{height:60px;display:flex;cursor:pointer;}
.pl-seg{flex:1;transition:opacity .1s;}
.pl-seg:hover{opacity:.82;}
.pl-info{padding:7px 11px 9px;}
.pl-name{font-size:13px;font-weight:500;color:var(--tx);margin-bottom:2px;}
.pl-meta{font-size:10px;color:var(--tx3);display:flex;gap:5px;align-items:center;}
.pl-badge{font-size:8px;padding:1px 5px;border-radius:3px;background:var(--ac2);color:var(--ac);letter-spacing:.03em;}
.pl-btns{display:flex;gap:0;margin-top:5px;}
.pl-btn{padding:3px 0;margin-right:10px;background:transparent;border:none;color:var(--tx3);font-size:10px;cursor:pointer;font-family:inherit;transition:color .1s;}
.pl-btn:hover{color:var(--ac);}
.pl-btn.del{color:rgba(226,75,74,0.5);}
.pl-btn.del:hover{color:#E24B4A;}
</style>
</head>
<body>
<div class="app">

  <!-- Header — keep existing logo, replace theme dots only -->
  <div class="app-hdr">
    <div>
      <div class="brand">PaintBrain</div>
      <div class="sub">Swatch Studio</div>
    </div>
    <div class="theme-dots">
      <div class="tdot on" style="background:#8CABFF" onclick="applyTheme(0)"></div>
      <div class="tdot" style="background:#78C9C5" onclick="applyTheme(1)"></div>
      <div class="tdot" style="background:#F07858" onclick="applyTheme(2)"></div>
      <div class="tdot" style="background:#C060A8" onclick="applyTheme(3)"></div>
      <div class="tdot" style="background:#D0A020" onclick="applyTheme(4)"></div>
    </div>
  </div>

  <!-- Tab bar -->
  <div class="tabbar">
    <div class="tab on t-discover" onclick="showTab('discover',this)">Discover</div>
    <div class="tab t-browse" onclick="showTab('browse',this)">Browse</div>
    <div class="tab t-palettes" onclick="showTab('palettes',this)">Palettes</div>
    <div class="tab t-scanned" onclick="showTab('scanned',this)">Scanned</div>
  </div>

  <!-- DISCOVER -->
  <div class="tc on" id="tc-discover">
    <div class="disc-ctrl">
      <div class="mtoggle">
        <div class="mt on" id="mt-all" onclick="setMode('all')">All</div>
        <div class="mt" id="mt-custom" onclick="setMode('custom')">Custom</div>
      </div>
      <div id="custom-sliders" style="display:none;">
        <div class="sl-row">
          <span class="sl-lbl">Hue</span>
          <div class="sl-track-wrap hue-track">
            <input type="range" min="0" max="360" value="180" step="1" oninput="onHue(+this.value)">
            <div class="sl-knob" id="hue-knob" style="left:50%;background:#00CED1;"></div>
          </div>
          <div class="sl-circle" id="hue-circle" style="background:#00CED1;"></div>
          <span class="sl-val" id="hue-val">Teal · 180°</span>
        </div>
        <div class="sl-row">
          <span class="sl-lbl">Brightness</span>
          <div class="sl-track-wrap bright-track">
            <input type="range" min="0" max="100" value="50" step="1" oninput="onBright(+this.value)">
            <div class="sl-knob" id="bright-knob" style="left:50%;background:#777;"></div>
          </div>
          <div class="sl-circle" id="bright-circle" style="background:#777;"></div>
          <span class="sl-val" id="bright-val">Midtone</span>
        </div>
      </div>
      <div class="picks-inline">
        <span class="picks-lbl">Picks</span>
        <div class="picks-chips" id="d-picks"><span class="picks-hint">Tap colors below</span></div>
        <button class="add-lib" onclick="addToLibrary()">Add to library</button>
      </div>
    </div>
    <div class="d-grid-wrap">
      <div class="zoom-ctrl">
        <span class="zoom-lbl">Size</span>
        <button class="zoom-btn" onclick="zoomGrid(-1)">−</button>
        <button class="zoom-btn" onclick="zoomGrid(1)">+</button>
      </div>
      <div class="d-grid" id="d-grid"></div>
      <button class="more-btn" onclick="moreColors()">Generate more</button>
    </div>
  </div>

  <!-- BROWSE -->
  <div class="tc" id="tc-browse">
    <div class="br-hdr">
      <div class="preview-strip" id="preview-strip">
        <div class="ps-hint">Tap any color below to preview · tap + to add to palette</div>
      </div>
      <div class="pal-acts">
        <input class="nin" id="pal-name" placeholder="Palette name...">
        <button class="wbtn" onclick="autoName()">Auto</button>
        <button class="wbtn" onclick="savePal()">Save</button>
        <button class="wbtn" onclick="copyPal()">Copy</button>
        <button class="wbtn" onclick="clearPal()">Clear</button>
      </div>
      <div class="ctx-row" id="ctx-row" style="display:none;">
        <div class="ctx-sw" id="ctx-sw"></div>
        <span class="ctx-hex" id="ctx-hex"></span>
        <span class="ctx-nm" id="ctx-nm"></span>
        <div class="ctx-acts">
          <button class="wbtn" onclick="addToStrip()">+ Add</button>
          <button class="wbtn" onclick="copyCtx()">Copy</button>
          <button class="wbtn" id="gen-btn" onclick="generateScheme()">Generate ▾</button>
        </div>
      </div>
      <div class="gen-row" id="gen-row" style="display:none;">
        <div class="gen-strip" id="gen-strip"></div>
        <button class="wbtn" onclick="addGenAll()">+ All</button>
        <button class="wbtn" onclick="closeGen()">✕</button>
      </div>
      <div class="fid-wrap">
        <span class="fid-lbl">Fidelity</span>
        <div class="fid-track">
          <input type="range" min="0" max="100" value="50" step="1" id="fid-slider">
          <div class="fid-knob" id="fid-knob" style="left:50%;"></div>
        </div>
        <span class="fid-lbl">Wild</span>
      </div>
    </div>
    <div class="br-lib">
      <div class="lib-zoom">
        <span class="zoom-lbl">Density</span>
        <button class="zoom-btn" onclick="zoomLib(-1)">−</button>
        <button class="zoom-btn" onclick="zoomLib(1)">+</button>
      </div>
      <div id="b-lib"></div>
    </div>
  </div>

  <!-- PALETTES -->
  <div class="tc" id="tc-palettes">
    <div class="pl-hdr">
      <div class="sr">
        <input class="si" placeholder="Search or paste a ColorHunt URL...">
        <button class="sb">Search</button>
      </div>
      <div class="src-row">
        <div class="src on" onclick="setSrc(this)">All</div>
        <div class="src" onclick="setSrc(this)">ColorHunt</div>
        <div class="src" onclick="setSrc(this)">Custom</div>
        <div class="src" onclick="setSrc(this)">Generated</div>
      </div>
      <div class="hue-dots-row" id="hue-dots"></div>
    </div>
    <div class="pl-list" id="pl-list"></div>
  </div>

  <!-- SCANNED -->
  <div class="tc" id="tc-scanned">
    <div style="padding:20px 16px;text-align:center;">
      <div style="font-size:11px;color:var(--tx2);margin-bottom:14px;">Upload or scan a photo to extract colors</div>
      <div style="display:flex;gap:8px;justify-content:center;">
        <button class="wbtn" style="border:1.5px solid var(--ac);padding:8px 16px;border-radius:8px;color:var(--ac);">Upload photo</button>
        <button class="wbtn" style="border:1px solid var(--bdr2);padding:8px 16px;border-radius:8px;">Open camera</button>
      </div>
    </div>
  </div>

</div>

<script>
// ── LAB COLOR MATH ──
const GOLDEN=0.618033988749895
let dHue=180,dBright=50,dMode='all',dCols=3,bCols=8
let dColors=[],dPicks=[],bStrip=[],bSel=null,bGenScheme=[]
let dIdx=0,bLibColors=[]

function labToHex(L,A,B){
  L=Math.max(4,Math.min(96,L))
  const fy=(L+16)/116,fx=A/500+fy,fz=fy-B/200
  const x=0.95047*(fx>0.2069?fx**3:(fx-16/116)/7.787)
  const y=1.0*(fy>0.2069?fy**3:(fy-16/116)/7.787)
  const z=1.08883*(fz>0.2069?fz**3:(fz-16/116)/7.787)
  let r=x*3.2406+y*-1.5372+z*-0.4986
  let g=x*-0.9689+y*1.8758+z*0.0415
  let b=x*0.0557+y*-0.2040+z*1.057
  const h=v=>{const c=v>0.0031308?1.055*Math.pow(Math.max(0,v),1/2.4)-0.055:12.92*v;return Math.round(Math.max(0,Math.min(1,c))*255).toString(16).padStart(2,'0')}
  return '#'+h(r)+h(g)+h(b)
}

function hueToLab(h){
  const r=h*Math.PI/180
  return labToHex(52,55*Math.cos(r),55*Math.sin(r))
}

function hueName(h){
  h=((h%360)+360)%360
  if(h<15||h>=345)return'Red'
  if(h<45)return'Orange'
  if(h<75)return'Yellow'
  if(h<165)return'Green'
  if(h<200)return'Teal'
  if(h<260)return'Blue'
  if(h<295)return'Violet'
  return'Pink'
}

function brightName(b){
  if(b<18)return'Very dark'
  if(b<36)return'Dark'
  if(b<54)return'Midtone'
  if(b<72)return'Light'
  return'Pale'
}

// ── COLOR GENERATION ──
const HUE_RANGES={
  Red:[-15,15],Orange:[15,45],Yellow:[45,75],Green:[75,165],
  Teal:[165,200],Blue:[200,260],Violet:[260,295],Pink:[295,345]
}

function genAll(n){
  const res=[]
  for(let i=0;i<n;i++){
    const h=((dIdx*GOLDEN)%1)*360;dIdx++
    const t=i%3
    const L=t===0?18+Math.random()*14:t===1?40+Math.random()*22:65+Math.random()*20
    const ch=i%2===0?54+Math.random()*32:15+Math.random()*20
    const r=h*Math.PI/180
    res.push({hex:labToHex(L,ch*Math.cos(r),ch*Math.sin(r)),h})
  }
  return res
}

function genCustom(n){
  const name=hueName(dHue)
  const range=HUE_RANGES[name]||[-20,20]
  const span=range[1]-range[0]
  const cL=18+(dBright/100)*68
  const Lmin=Math.max(10,cL-26),Lmax=Math.min(92,cL+26)
  const cols=3,rows=Math.ceil(n/cols),res=[]
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      if(res.length>=n)break
      const L=Lmax-(r/(rows-1||1))*(Lmax-Lmin)
      const hOff=(c/(cols-1||1))*span*0.55-span*0.275
      const hA=((range[0]+span/2+dHue+hOff)%360+360)%360
      const mf=1-Math.abs((r/(rows-1||1))-0.5)*0.3
      const ch=(50+Math.random()*26)*mf
      const rad=hA*Math.PI/180
      res.push({hex:labToHex(L,ch*Math.cos(rad),ch*Math.sin(rad)),h:hA})
    }
  }
  return res
}

// ── DISCOVER RENDERING ──
function renderDGrid(){
  const g=document.getElementById('d-grid')
  g.style.gridTemplateColumns=`repeat(${dCols},1fr)`
  g.innerHTML=''
  dColors.forEach(c=>{
    const d=document.createElement('div')
    d.className='dc'+(dPicks.find(p=>p.hex===c.hex)?' sel':'')
    d.style.background=c.hex
    d.innerHTML=`<div class="dc-hex">${c.hex}</div>`
    d.onclick=()=>togglePick(c,d)
    g.appendChild(d)
  })
}

function togglePick(c,el){
  const i=dPicks.findIndex(p=>p.hex===c.hex)
  if(i>-1){dPicks.splice(i,1);el.classList.remove('sel')}
  else{dPicks.push(c);el.classList.add('sel')}
  renderDPicks()
}

function renderDPicks(){
  const row=document.getElementById('d-picks')
  if(!dPicks.length){row.innerHTML='<span class="picks-hint">Tap colors below</span>';return}
  row.innerHTML=''
  dPicks.forEach(c=>{
    const d=document.createElement('div')
    d.className='pk';d.style.background=c.hex
    d.onclick=()=>{dPicks=dPicks.filter(p=>p.hex!==c.hex);renderDPicks();renderDGrid()}
    row.appendChild(d)
  })
}

function onHue(v){
  dHue=v
  const col=hueToLab(v)
  document.getElementById('hue-knob').style.left=(v/360*100)+'%'
  document.getElementById('hue-knob').style.background=col
  document.getElementById('hue-circle').style.background=col
  document.getElementById('hue-val').textContent=hueName(v)+' · '+Math.round(v)+'°'
  dIdx=0;dColors=genCustom(18);renderDGrid()
}

function onBright(v){
  dBright=v
  const g=Math.round(v/100*215)
  const col=`rgb(${g},${g},${g})`
  document.getElementById('bright-knob').style.left=v+'%'
  document.getElementById('bright-knob').style.background=col
  document.getElementById('bright-circle').style.background=col
  document.getElementById('bright-val').textContent=brightName(v)
  dIdx=0;dColors=genCustom(18);renderDGrid()
}

function setMode(m){
  dMode=m
  document.getElementById('mt-all').classList.toggle('on',m==='all')
  document.getElementById('mt-custom').classList.toggle('on',m==='custom')
  document.getElementById('custom-sliders').style.display=m==='custom'?'block':'none'
  dIdx=0;dColors=m==='all'?genAll(18):genCustom(18);renderDGrid()
}

function moreColors(){dColors=dColors.concat(dMode==='all'?genAll(9):genCustom(9));renderDGrid()}
function zoomGrid(d){dCols=Math.max(2,Math.min(6,dCols+d));renderDGrid()}

function addToLibrary(){
  dPicks.forEach(c=>{if(!bLibColors.find(l=>l.hex===c.hex))bLibColors.push(c)})
  const n=dPicks.length
  dPicks=[];renderDPicks();renderDGrid();renderBLib()
  if(n>0)showToast(n+' color'+(n===1?'':'s')+' added to Browse')
}

// ── BROWSE ──
const BROWSE_FAMS=[
  {n:'Yellows',c:['#FFFFF0','#FFFF99','#FFFF00','#FFD700','#FFC200','#FFB300','#E6AC00','#CC9900']},
  {n:'Oranges',c:['#FFE4B5','#FFD5A8','#FFB347','#FF8C42','#FF7518','#FF6200','#E04000','#CC3300']},
  {n:'Reds',c:['#FFB3B3','#FF8080','#FF4444','#FF0000','#DC143C','#C00000','#A00000','#800000']},
  {n:'Pinks',c:['#FFD1DC','#FFB6C1','#FF69B4','#FF1493','#EA2264','#C060A1','#993556','#72243E']},
  {n:'Purples',c:['#E8D5FF','#CC99FF','#B13BFF','#8B00FF','#471396','#35155D','#26215C','#090040']},
  {n:'Blues',c:['#E6F0FF','#B3CCFF','#8CABFF','#4477CE','#1E90FF','#0066CC','#065084','#000080']},
  {n:'Teals',c:['#E0FFFF','#80DEEA','#26C6DA','#00ACC1','#0F828C','#006064','#00897B','#00695C']},
  {n:'Greens',c:['#E8F5E9','#C8E6C9','#A5D6A7','#66BB6A','#43A047','#2E7D32','#1B5E20','#8BC34A']},
  {n:'Neutrals',c:['#F5F5F5','#E0E0E0','#BDBDBD','#9E9E9E','#757575','#424242','#D2691E','#8B4513']},
]

function renderBLib(){
  const lib=document.getElementById('b-lib')
  lib.innerHTML=''
  if(bLibColors.length){
    const wrap=document.createElement('div')
    wrap.innerHTML=`<div class="fam-lbl">Your library · ${bLibColors.length}</div>`
    const g=document.createElement('div');g.className='b-grid'
    g.style.gridTemplateColumns=`repeat(${bCols},1fr)`
    bLibColors.forEach(c=>{
      const d=document.createElement('div');d.className='bch';d.style.cssText=`background:${c.hex};height:${Math.round(280/bCols)}px;`
      d.onclick=()=>selectBColor(c.hex);wrap.appendChild(d)
    })
    wrap.appendChild(g);
    bLibColors.forEach(c=>{
      const d=document.createElement('div');d.className='bch'+(bSel===c.hex?' sel':'')
      d.style.cssText=`background:${c.hex};height:${Math.round(280/bCols)}px;`
      d.onclick=()=>selectBColor(c.hex)
      g.appendChild(d)
    })
    lib.appendChild(wrap)
  }
  BROWSE_FAMS.forEach(fam=>{
    const wrap=document.createElement('div')
    wrap.innerHTML=`<div class="fam-lbl">${fam.n}</div>`
    const g=document.createElement('div');g.className='b-grid'
    g.style.gridTemplateColumns=`repeat(${bCols},1fr)`
    fam.c.forEach(hex=>{
      const d=document.createElement('div');d.className='bch'+(bSel===hex?' sel':'')
      d.style.cssText=`background:${hex};height:${Math.round(280/bCols)}px;`
      d.onclick=()=>selectBColor(hex)
      g.appendChild(d)
    })
    wrap.appendChild(g);lib.appendChild(wrap)
  })
}

function selectBColor(hex){
  bSel=hex
  const cr=document.getElementById('ctx-row')
  cr.style.display='flex'
  document.getElementById('ctx-sw').style.background=hex
  document.getElementById('ctx-hex').textContent=hex
  document.getElementById('ctx-nm').textContent='·  click generate for schemes'
  // Update preview strip gradient if no palette building yet
  if(bStrip.length===0){
    const strip=document.getElementById('preview-strip')
    strip.innerHTML=''
    const h=parseInt(hex.slice(1,3),16)/255,sv=parseInt(hex.slice(3,5),16)/255,lv=parseInt(hex.slice(5,7),16)/255
    for(let i=0;i<8;i++){
      const t=i/7,L=20+t*65,ch=60-t*20
      const seg=document.createElement('div');seg.className='ps-gradient'
      seg.style.background=labToHex(L,ch*Math.cos(Math.atan2(lv-.5,h-.5)),ch*Math.sin(Math.atan2(lv-.5,h-.5)))
      strip.appendChild(seg)
    }
  }
  renderBLib()
}

function addToStrip(){
  if(!bSel||bStrip.length>=8)return
  if(!bStrip.includes(bSel))bStrip.push(bSel)
  renderStrip()
}

function renderStrip(){
  const strip=document.getElementById('preview-strip')
  if(!bStrip.length){
    strip.innerHTML='<div class="ps-hint">Tap any color below to preview · tap + to add to palette</div>'
    return
  }
  strip.innerHTML=''
  bStrip.forEach(hex=>{
    const d=document.createElement('div');d.className='ps-chip';d.style.background=hex;d.title=hex
    d.onclick=()=>{bStrip=bStrip.filter(h=>h!==hex);renderStrip()}
    strip.appendChild(d)
  })
}

function generateScheme(){
  if(!bSel)return
  const fid=+document.getElementById('fid-slider').value
  const variance=8+(fid/100)*55
  const hex=bSel
  const r2=parseInt(hex.slice(1,3),16)/255,g2=parseInt(hex.slice(3,5),16)/255,b2=parseInt(hex.slice(5,7),16)/255
  let r=r2,g=g2,b=b2
  const f=v=>v>0.04045?Math.pow((v+0.055)/1.055,2.4):v/12.92
  r=f(r);g=f(g);b=f(b)
  const X=(r*0.4124+g*0.3576+b*0.1805)/0.95047
  const Y=(r*0.2126+g*0.7152+b*0.0722)/1.0
  const Z=(r*0.0193+g*0.1192+b*0.9505)/1.08883
  const ff=v=>v>0.008856?Math.cbrt(v):(7.787*v)+16/116
  const L=116*ff(Y)-16,A=500*(ff(X)-ff(Y)),Bv=200*(ff(Y)-ff(Z))
  bGenScheme=[]
  for(let i=0;i<5;i++){
    const t=i/4-0.5
    const nL=Math.max(15,Math.min(90,L+t*variance*0.8))
    const nA=A*(1-Math.abs(t)*0.4)+t*variance*0.3
    const nB=Bv*(1-Math.abs(t)*0.4)-t*variance*0.3
    bGenScheme.push(labToHex(nL,nA,nB))
  }
  const strip=document.getElementById('gen-strip')
  strip.innerHTML=''
  bGenScheme.forEach(h=>{
    const d=document.createElement('div');d.className='gs';d.style.background=h
    d.onclick=()=>{if(!bStrip.includes(h)&&bStrip.length<8){bStrip.push(h);renderStrip()}}
    strip.appendChild(d)
  })
  document.getElementById('gen-row').style.display='flex'
  document.getElementById('gen-btn').textContent='Regenerate ▾'
  document.getElementById('fid-slider').oninput=function(){
    document.getElementById('fid-knob').style.left=this.value+'%'
    generateScheme()
  }
}

function addGenAll(){bGenScheme.forEach(h=>{if(!bStrip.includes(h)&&bStrip.length<8)bStrip.push(h)});renderStrip()}
function closeGen(){bGenScheme=[];document.getElementById('gen-row').style.display='none';document.getElementById('gen-btn').textContent='Generate ▾'}
function copyCtx(){if(bSel)navigator.clipboard.writeText(bSel).catch(()=>{})}
function copyPal(){navigator.clipboard.writeText(bStrip.join(', ')).catch(()=>{})}
function clearPal(){bStrip=[];renderStrip();document.getElementById('pal-name').value=''}
function autoName(){document.getElementById('pal-name').value=['Coastal Drift','Ember Glow','Violet Dusk','Forest Deep','Solar Fade','Ocean Mist'][Math.floor(Math.random()*6)]}
function savePal(){showToast('Palette saved')}
function zoomLib(d){bCols=Math.max(4,Math.min(12,bCols+d));renderBLib()}

// ── PALETTES ──
const HUE_DOT_COLORS=['#888','#7B35FF','#4477CE','#0F828C','#639922','#FFCC00','#EB5B00','#E24B4A','#EA2264']
const DEMO_PALS=[
  {name:'Rustic Cabin',colors:['#5C1A1A','#8B4513','#CC3300','#FFDEAD'],source:'colorhunt',tags:'earthy · warm',date:'2026-04-05'},
  {name:'Forest Floor',colors:['#1B4D2E','#2E8B57','#3CB371','#90EE90'],source:'Atrain',tags:'natural · earthy',date:'2026-04-05'},
  {name:'Coastal Sunset',colors:['#1A5276','#1ABC9C','#F0987B','#EB5B00'],source:'colorhunt',tags:'coastal · warm',date:'2026-04-04'},
  {name:'Violet Dusk',colors:['#35155D','#471396','#8CABFF','#E8D5FF'],source:'generated',tags:'violet · cool',date:'2026-04-04'},
]

function renderHueDots(){
  const row=document.getElementById('hue-dots')
  row.innerHTML=''
  HUE_DOT_COLORS.forEach((col,i)=>{
    const d=document.createElement('div');d.className='hd'+(i===0?' on':'');d.style.background=col
    d.onclick=()=>{document.querySelectorAll('.hd').forEach(x=>x.classList.remove('on'));d.classList.add('on')}
    row.appendChild(d)
  })
}

function renderPalettes(){
  const list=document.getElementById('pl-list');list.innerHTML=''
  DEMO_PALS.forEach(p=>{
    const card=document.createElement('div');card.className='plc'
    const strip=document.createElement('div');strip.className='pl-strip'
    p.colors.forEach(hex=>{
      const seg=document.createElement('div');seg.className='pl-seg';seg.style.background=hex
      strip.appendChild(seg)
    })
    const info=document.createElement('div');info.className='pl-info'
    info.innerHTML=`<div class="pl-name">${p.name}</div><div class="pl-meta"><span class="pl-badge">${p.source}</span>${p.tags} · ${p.date}</div>`
    const btns=document.createElement('div');btns.className='pl-btns'
    btns.innerHTML=`<button class="pl-btn">Load</button><button class="pl-btn">Copy</button><button class="pl-btn">Share</button><button class="pl-btn del">Delete</button>`
    info.appendChild(btns);card.appendChild(strip);card.appendChild(info);list.appendChild(card)
  })
}

function setSrc(el){document.querySelectorAll('.src').forEach(s=>s.classList.remove('on'));el.classList.add('on')}

// ── THEME SYSTEM ──
const THEMES=[
  {a1:'#8CABFF',a2:'#78C9C5',a3:'#B060C0',a4:'#F07858'},
  {a1:'#78C9C5',a2:'#8CABFF',a3:'#9870D0',a4:'#F08860'},
  {a1:'#F07840',a2:'#F0B840',a3:'#80C870',a4:'#6090D0'},
  {a1:'#C060A8',a2:'#8060D0',a3:'#60A8C0',a4:'#D09060'},
  {a1:'#D0A020',a2:'#D06020',a3:'#6090C0',a4:'#80B060'},
]

function applyTheme(i){
  const t=THEMES[i]
  const root=document.documentElement
  root.style.setProperty('--ac',t.a1)
  root.style.setProperty('--ac2',t.a1+'1a')
  root.style.setProperty('--bdr',t.a1+'2e')
  document.querySelectorAll('.tdot').forEach((d,j)=>d.classList.toggle('on',j===i))
  document.querySelector('.app').style.borderColor=t.a1
  document.querySelectorAll('.app-hdr,.disc-ctrl,.br-hdr,.pl-hdr').forEach(el=>el.style.borderBottomColor=t.a1)
  document.querySelector('.tab.on').style.borderBottomColor=t.a1
}

// ── TABS ──
function showTab(name,el){
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('on'))
  el.classList.add('on')
  document.querySelectorAll('.tc').forEach(c=>c.classList.remove('on'))
  document.getElementById('tc-'+name).classList.add('on')
}

// ── TOAST ──
function showToast(msg){
  const t=document.createElement('div')
  t.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1a1a2e;border:1px solid rgba(140,171,255,0.3);color:#e8e4f4;padding:7px 14px;border-radius:8px;font-size:11px;z-index:999;pointer-events:none;'
  t.textContent=msg;document.body.appendChild(t)
  setTimeout(()=>t.remove(),2000)
}

// ── INIT ──
dColors=genAll(18);renderDGrid();renderBLib();renderHueDots();renderPalettes()
document.getElementById('fid-slider').oninput=function(){document.getElementById('fid-knob').style.left=this.value+'%'}
</script>
</body>
</html>
```

---

# SECTION B — Feature instructions

Work through these phases after porting Section A into the React/Vite app.

---

## PHASE 1 — Navigation wiring

Fix these before anything else:

1. **Load button in Palettes** must load palette into Browse strip and show toast "Loaded into Browse builder." User stays in Palettes tab. No navigation.
2. **Generate theme in Scanned** must run inline — no navigation to Browse.
3. Tab switching must preserve scroll position in each tab.
4. Tab switching must never clear Browse palette strip or Discover picks tray.
5. Wire all action words (Save, Copy, Clear, Auto, Generate, Load) to their correct Supabase operations.

---

## PHASE 2 — Discover tab wiring

1. **Add to library** writes picked colors to Supabase `colors` table: `{hex, source: "discovered", hue_family, hue_angle, added_at}`
2. Run `ntc.name(hex)` on each color and store result as `name` field
3. Colors appear immediately in Browse library under their correct family section
4. Daily seed for reproducible All mode generation — same session, same colors. New day, fresh batch.
5. Zoom preference stored in `localStorage` key `discover_zoom_cols`

---

## PHASE 3 — Browse tab wiring

1. **Preview strip dual purpose:**
   - Empty state: shows LAB gradient preview of last tapped color (light→dark wash of that hue family)
   - Building state: shows palette chips — tap chip shows hex popup, long-press removes it

2. **Generate / Regenerate:**
   - First tap: "Generate" runs `generateSchemes()` from `colorMath.js` using selected color as seed
   - Button text changes to "Regenerate" after first use
   - Regenerate: if palette strip has colors, compute LAB centroid of all strip colors, generate from centroid
   - Fidelity/Wild slider controls `chromaVariance` parameter passed to `generateSchemes()`

3. **Save** writes to Supabase `palettes` table: `{name, colors_cache, source: "custom", auto_named, added_at, user_id}`
4. **Auto** calls Haiku to generate palette name from colors — model: `claude-haiku-4-5-20251001`
5. **Copy** copies hex values in CSS comment format: `/* Palette Name */\n#hex1, #hex2...`

---

## PHASE 4 — Carousel system (Browse)

Build the carousel interaction on the preview strip:

- **State 1** (default): user palette chips
- **State 2**: generated scheme — horizontal swipe from State 1 reveals it
- **Double-tap strip**: enters split view — strip divides with 1px black center divider, both palettes at half width
- **Double-tap in split**: returns to single view
- **Indicator**: two small dots below strip showing active state
- **Save behavior**: saves whichever state is currently visible. Split view saves both.

---

## PHASE 5 — Theme system

Apply the 5 LAB theme presets from Section A to the live app.

CSS custom properties on `:root` control all accent colors. Switching theme updates:
- Global app border
- Tab underlines and active tab text
- Header zone bottom borders
- All interactive word-buttons (active state color)
- Divider lines

Does NOT affect:
- Color library chips
- Palette card color strips
- Generated scheme strips
- Preview strip colors

Build `applyPaletteAsTheme(colors[])` function — takes saved palette hex array, assigns colors to theme roles by LAB analysis — but do NOT expose in UI yet.

---

## PHASE 6 — Palettes tab wiring

1. Search input: natural language → Haiku interprets and filters. ColorHunt URL paste → auto-parse hex values → show chips → Add to Palettes button
2. Source filter words: All · ColorHunt · Custom · Generated — filter `palettes` table by `source` field
3. Hue dots: filter palettes by `hue_family` field — dot-only, no text labels
4. **Load**: writes palette to Browse strip, shows toast, stays in Palettes
5. **Copy**: copies all hex values as CSS comment format
6. **Share**: opens native share sheet with palette hex values and palette name
7. **Delete**: soft delete with confirmation
8. Source badge shows user's display name for custom palettes, "colorhunt" / "generated" / "scanned" for others

---

## PHASE 7 — Scanned tab fixes

1. Rename "Add to sample" → "Pick color"
2. Rename "Scheme" → "Generate"
3. Generate theme runs inline — no tab navigation
4. Date display: date only, remove time everywhere in scan library
5. Generated scheme appears below scan result within Scanned tab

---

## PHASE 8 — Verify all connections

Test each flow end to end:

1. Discover picks → Add to library → appear in Browse under correct family
2. Browse color tap → Generate → scheme appears → + All → colors in strip
3. Browse strip → Save → palette in Palettes tab under Custom
4. Palettes Load → strip updates → toast confirms → stays in Palettes
5. ColorHunt URL paste → parses → Add to Palettes → appears under ColorHunt filter
6. Scanned → Generate → inline result → Save → appears in Palettes
7. Theme dot tap → all accents update simultaneously
8. Carousel swipe → cycles states correctly
9. Double-tap → split view → double-tap → returns

---

## PHASE 9 — Polish

1. Reduce all padding by 15% for phone compaction
2. No horizontal overflow below 375px width
3. All tappable targets minimum 44px
4. All font sizes minimum 11px
5. Confirm dark mode throughout — no hardcoded light colors
6. ntc.js names display wherever hex is shown
7. Global border color updates when theme changes
8. Remove any remaining yellow button fills from old design

---

## Deferred to Sprint 2

- User-contributed public library
- Social sharing between users
- Creator search and attribution system
- Multi-palette carousel with 3+ positions
- `applyPaletteAsTheme()` exposed in UI
- Apify scraping, ColorHunt Chrome extension
- Swipe-to-copy gesture on palette cards
