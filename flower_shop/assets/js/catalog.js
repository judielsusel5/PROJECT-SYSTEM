/* ---- All-flowers catalog (products.php) ----
   Category tabs, color / price filters, search and sorting. Needs script.js first (Store, flowerPic). */
(() => {
const root=document.getElementById("catalog"),home=document.getElementById("grid");
if(!window.Store||(!root&&!home))return;
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const peso=v=>"₱"+Number(v).toLocaleString("en-PH");

/* ---- data ---- */
const CATS=[["Roses","rose"],["Carnations","carnation"],["Tulips","tulip"],["Lisianthus","lisianthus"],["Gerbera","gerbera"]];
const COLORS=[["Red","red","#c62f3e"],["Pink","pink","#f08ab0"],["Orange","orange","#f08a3c"],["Yellow","yellow","#f2c744"],["White","white","#ffffff"],["Violet","violet|purple|lavender","#8a63c7"],["Blue","blue","#4a7fd1"]];
const BUCKETS=[["lt500","Under ₱500",p=>p<500],["500","₱500 – ₱999",p=>p>=500&&p<1000],["1000","₱1,000 & up",p=>p>=1000]];
const catOf=i=>i.k||(CATS.find(c=>i.n.toLowerCase().includes(c[1]))||["Other bouquets"])[0];
const colorsOf=i=>{const t=(i.n+" "+(i.d||"")).toLowerCase();return COLORS.filter(c=>new RegExp("\\b("+c[1]+")").test(t)).map(c=>c[0])};
const titleOf=i=>i.n.replace(/\s*\([^)]*\)/g,"").trim();
/* occasions: set per product with the optional `occasion` column (e.g. "Birthday, Anniversary"); otherwise a default by category */
const OCCS=[["Valentines","valentines"],["Anniversary","anniversary"],["Mother's Day","mothers-day"],["Father's Day","fathers-day"],["Birthday","birthday"],["Funeral","funeral"],["Inaugural","inaugural"],["Get Well Soon","get-well-soon"],["Memorial / All Souls / All Saints","memorial"],["Congratulations","congratulations"]];
const OCC_DEFAULT={"Roses":["valentines","anniversary","birthday","congratulations","inaugural"],"Carnations":["mothers-day","birthday","get-well-soon","funeral","memorial"],"Tulips":["anniversary","mothers-day","birthday","congratulations","get-well-soon"],"Lisianthus":["anniversary","mothers-day","get-well-soon","funeral","memorial","inaugural"],"Gerbera":["birthday","fathers-day","get-well-soon","congratulations"],"Other bouquets":["birthday","congratulations"]};
const norm=s=>String(s||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const occOf=(i,k)=>{const raw=i.oc?(Array.isArray(i.oc)?i.oc:String(i.oc).split(",")):null;
 if(!raw)return OCC_DEFAULT[k]||[];
 return raw.map(x=>(OCCS.find(o=>o[1]===norm(x)||norm(o[0])===norm(x))||[])[1]).filter(Boolean)};
const occLabel=s=>(OCCS.find(o=>o[1]===s)||[])[0]||s;
const data=Store.products().map((i,idx)=>Object.assign({},i,{_k:catOf(i),_c:colorsOf(i),_t:titleOf(i),_idx:idx,_o:occOf(i,catOf(i))}));
const hex=n=>(COLORS.find(c=>c[0]===n)||[])[2]||"#ccc";

/* ---- state (can be preset from the URL: ?cat=roses&q=pink&color=Pink) ---- */
const qs=new URLSearchParams(location.search);
const catParam=(qs.get("cat")||"").toLowerCase();
const state={
 cat:(data.find(i=>i._k.toLowerCase()===catParam)||{})._k||"",
 color:(COLORS.find(c=>c[0].toLowerCase()===(qs.get("color")||"").toLowerCase())||[])[0]||"",
 price:"",occ:(OCCS.find(o=>o[1]===norm(qs.get("occasion")))||[])[1]||"",sort:"featured",q:(qs.get("q")||"").trim().toLowerCase()
};

/* ---- compact card: live 3D bouquet (drag to turn), tappable colors, opens a detail view ---- */
const labelStems=l=>{const m=/(\d+)/.exec(l);if(m)return +m[1];l=String(l).toLowerCase();return /dozen/.test(l)?12:/double|two/.test(l)?2:/three/.test(l)?3:/four/.test(l)?4:/five/.test(l)?5:/six/.test(l)?6:1};
const SIZE_OF=n=>n<=7?0:n<=15?1:n<=30?2:3;
const defStems=i=>{const s=(i.v||[]).map(o=>labelStems(o[0])).filter(n=>n>=3&&n<=8).sort((a,b)=>b-a);return s[0]||5};
const defCol=i=>i._c[0]||"";
const sur=(i,col)=>{const c=COLORS.find(x=>x[0]===col);if(!c)return 0;const m=new RegExp("("+c[1]+")[^+.]*?(?:\\+|add)\\s*₱?\\s*(\\d+)","i").exec(i.d||"");return m?+m[2]:0};
const byId=id=>data.find(i=>String(i.id)===String(id));
const card=(i,k)=>{
 const col=defCol(i),can=!i.so,badge=i.so?'<span class="pc-badge so">Sold out</span>':i.b?'<span class="pc-badge">Best seller</span>':"";
 const dots=i._c.length?`<div class="pc2-dots" role="group" aria-label="Colors">${i._c.map(c=>i._c.length>1?`<button type="button" class="pc2-dot${c===col?" on":""}" data-col="${c}" style="--c:${hex(c)}" aria-label="${c}" aria-pressed="${c===col}" title="${c}"></button>`:`<span class="pc2-dot on" style="--c:${hex(c)}" title="${c}"></span>`).join("")}</div>`:"";
 const btns=can?`<button type="button" class="pc-btn" data-act="buy" data-id="${esc(i.id)}" data-color="${esc(col)}">Buy now</button><button type="button" class="pc-btn ghost ic" data-act="cart" data-id="${esc(i.id)}" data-color="${esc(col)}" aria-label="Add ${esc(i._t)} to cart"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 8h14l-1.2 11.2a1.5 1.5 0 0 1-1.5 1.3H7.7a1.5 1.5 0 0 1-1.5-1.3L5 8z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg></button>`:'<span class="pc-btn off">Unavailable</span>';
 return `<article class="pcard pc2${i.so?" is-so":""}" data-id="${esc(i.id)}" data-col="${esc(col)}" style="--d:${Math.min(k,12)*55}ms">
 <div class="pc2-view" style="--tint:${esc(i.c||"#ecd5bd")}"><div class="pc2-fb">${flowerPic(i,i._t)}</div><canvas class="pc2-cv" aria-hidden="true"></canvas><span class="pc-cat">${esc(i._k)}</span>${badge}<span class="pc2-360" aria-hidden="true">&#8635; 360&deg;</span>${dots}<button type="button" class="pc2-arr l" data-turn="-50" aria-label="Turn the bouquet left">&lsaquo;</button><button type="button" class="pc2-arr r" data-turn="50" aria-label="Turn the bouquet right">&rsaquo;</button></div>
 <div class="pc2-body"><h3><button type="button" class="pc2-title">${esc(i._t)}</button></h3><p class="pc2-sub">${esc(i.d||i._k+" bouquet")}</p>
  <div class="pc2-foot"><div class="pc-price"><small>From</small><b>${peso(i.p)}</b></div><div class="pc2-btns">${btns}</div></div></div></article>`};

/* 3D preview of one product: n stems in the chosen colour, wrapped in kraft paper */
function bouquet(i,col,n){const Z=window.CZ3D,shape=Z.shapeOf(i.n),hexc=Z.hexOf(col||""),it=[];
 for(let k=0;k<n;k++)it.push({uid:k+1,shape,color:hexc,pos:null,rot:null,k:1,z:k+1});
 if(n>=4)it.push({uid:900,shape:"g1",color:"",pos:null,rot:null,k:1,z:-1e6,green:true},{uid:901,shape:"g0",color:"",pos:null,rot:null,k:1,z:-1e6,green:true});
 const sz=SIZE_OF(n);return {pl:Z.place(it,Z.RMAX[sz]),size:sz}}
function Prev(cv,i,col,n,o){const Z=window.CZ3D;this.cv=cv;this.i=i;this.v3=Z.scene3d(cv);this.dpr=(o&&o.dpr)||1.25;this.yaw=(o&&o.yaw)||-25;this.pitch=(o&&o.pitch)||22;this.v3.hook(()=>this.draw());this.set(col,n)}
Prev.prototype={
 set(col,n){this.col=col;this.n=n;const b=bouquet(this.i,col,n);this.pl=b.pl;this.size=b.size;this.draw()},
 draw(){if(this.q||!this.cv.isConnected)return;this.q=requestAnimationFrame(()=>{this.q=0;const Z=window.CZ3D;this.v3.render({pl:this.pl,yaw:this.yaw,pitch:this.pitch,wrap:Z.WRAPS[0][1],rib:Z.RIBBONS[0][1],vase:"",size:this.size,dpr:this.dpr});if(this.onYaw)this.onYaw(this.yaw)})},
 spin(on){cancelAnimationFrame(this.r);this.spinning=on;if(!on)return;let t0=performance.now();const f=t=>{if(!this.cv.isConnected||!this.spinning)return;const dt=Math.min(50,t-t0);t0=t;this.yaw=(this.yaw+dt*.04)%360;this.draw();this.r=requestAnimationFrame(f)};this.r=requestAnimationFrame(f)},
 go(p){cancelAnimationFrame(this.g);const from=this.pitch,t0=performance.now(),f=t=>{const k=Math.min(1,(t-t0)/350),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;this.pitch=from+(p-from)*e;this.draw();if(k<1)this.g=requestAnimationFrame(f)};this.g=requestAnimationFrame(f)},
 turn(d){cancelAnimationFrame(this.tr);this.spin(false);const from=this.yaw,t0=performance.now(),f=t=>{const k=Math.min(1,(t-t0)/380),e=1-Math.pow(1-k,3);this.yaw=from+d*e;this.draw();if(k<1)this.tr=requestAnimationFrame(f);else this.yaw=((this.yaw%360)+360)%360};this.tr=requestAnimationFrame(f)},
 drag(el,moved,end){let d=null;el.addEventListener("pointerdown",e=>{if(e.button>0)return;this.spin(false);this.hold=Date.now()+4000;d={x:e.clientX,y:e.clientY,yaw:this.yaw,p:this.pitch,m:false};el.setPointerCapture(e.pointerId)});
  el.addEventListener("pointermove",e=>{if(!d)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;if(Math.abs(dx)+Math.abs(dy)>5){d.m=true;if(moved)moved()}if(d.m){this.hold=Date.now()+4000;this.yaw=d.yaw+dx*.7;this.pitch=Math.max(6,Math.min(62,d.p-dy*.25));this.draw()}});
  const up=()=>{if(d&&end)end(d.m);d=null};el.addEventListener("pointerup",up);el.addEventListener("pointercancel",up)}};
const io="IntersectionObserver" in window?new IntersectionObserver(es=>es.forEach(e=>{const c=e.target;if(e.isIntersecting){io.unobserve(c);mount(c)}}),{rootMargin:"60px"}):null;
function mount(c){if(!window.CZ3D||c._p||!c.isConnected)return;const i=byId(c.dataset.id);if(!i)return;
 const v=c.querySelector(".pc2-view"),cv=c.querySelector(".pc2-cv"),p=new Prev(cv,i,c.dataset.col,defStems(i));c._p=p;v.classList.add("live");
 p.drag(cv,()=>{root._drag=Date.now()});
 c.querySelectorAll("[data-turn]").forEach(b=>b.addEventListener("click",e=>{e.stopPropagation();root._drag=Date.now();p.turn(+b.dataset.turn)}))}
function hydrate(){if(!window.CZ3D){window.addEventListener("load",hydrate,{once:true});return}root.querySelectorAll(".pc2").forEach(c=>{if(io)io.observe(c);else mount(c)})}

/* product detail: big 360 preview, colors, sizes, add to cart */
function openDetail(id,col0){const i=byId(id);if(!i||document.querySelector(".pd"))return;
 const opts=i.v&&i.v.length?i.v:[["Standard",i.p]],last=document.activeElement;let col=col0||defCol(i),oi=0,qty=1;
 const nFor=k=>opts.length>1||labelStems(opts[k][0])>1?Math.max(1,Math.min(50,labelStems(opts[k][0]))):defStems(i);
 const unit=k=>Number(opts[k][1])+sur(i,col)*labelStems(opts[k][0]);
 const el=document.createElement("div");el.className="pd";
 el.innerHTML=`<div class="pd-box" role="dialog" aria-modal="true" aria-labelledby="pdT"><button type="button" class="pd-x" aria-label="Close">&times;</button>
  <div class="pd-view" style="--tint:${esc(i.c||"#ecd5bd")}"><canvas class="pd-cv" tabindex="0" aria-label="Rotatable preview of ${esc(i._t)}. Use the left and right arrow keys to turn it."></canvas><button type="button" class="pd-arr l" data-turn="-50" aria-label="Turn left">&lsaquo;</button><button type="button" class="pd-arr r" data-turn="50" aria-label="Turn right">&rsaquo;</button><input class="pd-rot" type="range" min="0" max="359" value="335" aria-label="Turn the bouquet"><div class="pd-ctl"><span>Drag, scroll or use the slider</span><button type="button" data-pd="spin">Auto-rotate</button><button type="button" data-pd="top">Top view</button></div></div>
  <div class="pd-info"><span class="pd-eyebrow">${esc(i._k)}${i.b?" · Best seller":""}</span><h2 id="pdT">${esc(i._t)}</h2>${i.d?`<p class="pd-note">${esc(i.d)}</p>`:""}
   ${i._c.length?`<h4>Color <b id="pdCn">${esc(col)}</b></h4><div class="pd-cols" role="group" aria-label="Color">${i._c.map(c=>`<button type="button" class="pd-col${c===col?" on":""}" data-col="${c}" style="--c:${hex(c)}" aria-label="${c}" aria-pressed="${c===col}" title="${c}${sur(i,c)?" (+"+peso(sur(i,c))+" per stem)":""}"></button>`).join("")}</div>`:""}
   <h4>Size</h4><div class="pd-sizes" role="group" aria-label="Size">${opts.map((o,k)=>`<button type="button" class="pd-sz${k===0?" on":""}" data-k="${k}" aria-pressed="${k===0}"><span>${esc(o[0])}</span><b data-p="${k}">${peso(unit(k))}</b></button>`).join("")}</div>
   <div class="pd-row"><div class="pd-qty"><button type="button" data-d="-1" aria-label="Fewer">&minus;</button><output>1</output><button type="button" data-d="1" aria-label="More">+</button></div><div class="pd-total"><span>Total</span><b id="pdTot"></b></div></div>
   <div class="pd-btns">${i.so?'<span class="pc-btn off">Currently unavailable</span>':'<button type="button" class="pc-btn" data-pd="buy">Buy now</button><button type="button" class="pc-btn ghost" data-pd="cart">Add to cart</button>'}</div>
   <p class="pd-fine">Tulips, roses and more are arranged by hand and wrapped in kraft paper. <a href="#" data-customize>Make it your own</a></p></div></div>`;
 document.body.appendChild(el);document.documentElement.style.overflow="hidden";requestAnimationFrame(()=>el.classList.add("on"));
 const q=s=>el.querySelector(s),cv=q(".pd-cv");let prev=null;
 const upd=()=>{q("#pdTot").textContent=peso(unit(oi)*qty);q("output").textContent=qty;el.querySelectorAll("[data-p]").forEach(b=>b.textContent=peso(unit(+b.dataset.p)))};
 if(window.CZ3D){prev=new Prev(cv,i,col,nFor(0),{yaw:-25,pitch:24,dpr:1.5});
  const sb=q('[data-pd="spin"]'),rot=q(".pd-rot"),stopped=()=>{if(sb)sb.textContent="Auto-rotate"};
  prev.drag(cv,stopped);prev.onYaw=y=>{rot.value=Math.round(((y%360)+360)%360)};
  rot.addEventListener("input",()=>{prev.spin(false);stopped();prev.yaw=+rot.value;prev.draw()});
  q(".pd-view").addEventListener("wheel",e=>{e.preventDefault();prev.spin(false);stopped();prev.yaw=(prev.yaw+(e.deltaY+e.deltaX)*.35+360)%360;prev.draw()},{passive:false});
  cv.addEventListener("keydown",e=>{if(e.key==="ArrowLeft"||e.key==="ArrowRight"){e.preventDefault();prev.spin(false);stopped();prev.yaw=(prev.yaw+(e.key==="ArrowLeft"?-12:12)+360)%360;prev.draw()}})}else{cv.hidden=true;q(".pd-rot").hidden=true}
 const close=()=>{prev&&prev.spin(false);el.classList.remove("on");document.documentElement.style.overflow="";document.removeEventListener("keydown",onKey);setTimeout(()=>el.remove(),260);if(last&&last.focus)try{last.focus()}catch(e){}};
 const onKey=e=>{if(e.key==="Escape"&&!document.querySelector(".mdl"))close()};document.addEventListener("keydown",onKey);
 el.addEventListener("mousedown",e=>{if(e.target===el)close()});
 el.addEventListener("click",e=>{const b=e.target.closest("button,a");if(!b)return;
  if(b.classList.contains("pd-x"))return close();
  if(b.matches("[data-customize]")){close();return}
  if(b.classList.contains("pd-col")){col=b.dataset.col;el.querySelectorAll(".pd-col").forEach(x=>{const on=x===b;x.classList.toggle("on",on);x.setAttribute("aria-pressed",on)});q("#pdCn").textContent=col;prev&&prev.set(col,prev.n);upd();return}
  if(b.classList.contains("pd-sz")){oi=+b.dataset.k;el.querySelectorAll(".pd-sz").forEach(x=>{const on=x===b;x.classList.toggle("on",on);x.setAttribute("aria-pressed",on)});prev&&prev.set(col,nFor(oi));upd();return}
  if(b.dataset.turn){if(prev){prev.turn(+b.dataset.turn);const sb=q('[data-pd="spin"]');if(sb)sb.textContent="Auto-rotate"}return}
  if(b.dataset.d){qty=Math.max(1,Math.min(99,qty+ +b.dataset.d));upd();return}
  const a=b.dataset.pd;if(!a)return;
  if(a==="spin"){const on=!prev.spinning;prev.spin(on);b.textContent=on?"Stop":"Auto-rotate";return}
  if(a==="top"){const t=prev.pitch>45?24:58;prev.go(t);b.textContent=t>45?"Side view":"Top view";return}
  if((a==="buy"||a==="cart")&&window.Shop&&Shop.addItem){const o=opts[oi];Shop.addItem({id:i.id,name:i.n,size:o[0]+(col?" · "+col:""),price:unit(oi),qty},a==="buy",close)}});
 upd();setTimeout(()=>{const x=q(".pd-x");x&&x.focus({preventScroll:true})},120)}

/* ---- catalog page only ---- */
if(root){
/* ---- filter bar pieces ---- */
const catList=[...new Set(data.map(i=>i._k))];
const tabs=$("cTabs");
tabs.innerHTML=`<button type="button" class="ctab" data-cat="">All flowers <b>${data.length}</b></button>`+
 catList.map(k=>`<button type="button" class="ctab" data-cat="${esc(k)}">${esc(k)} <b>${data.filter(i=>i._k===k).length}</b></button>`).join("");
const colorsPresent=COLORS.filter(c=>data.some(i=>i._c.includes(c[0])));
$("cColors").innerHTML=`<button type="button" class="copt" data-color=""><i class="sw all"></i>All colors</button>`+
 colorsPresent.map(c=>`<button type="button" class="copt" data-color="${c[0]}"><i class="sw" style="background:${c[2]}"></i>${c[0]}</button>`).join("");
const bucketsPresent=BUCKETS.filter(b=>data.some(i=>b[2](i.p)));
$("cPrice").innerHTML=`<button type="button" class="copt" data-price="">Any price</button>`+
 bucketsPresent.map(b=>`<button type="button" class="copt" data-price="${b[0]}">${b[1]}</button>`).join("");
$("cSearch").value=qs.get("q")||"";
$("cOcc").innerHTML='<option value="">All occasions</option>'+OCCS.filter(o=>data.some(i=>i._o.includes(o[1]))).map(o=>`<option value="${o[1]}">${esc(o[0])} (${data.filter(i=>i._o.includes(o[1])).length})</option>`).join("");

/* ---- card ---- */


/* ---- render ---- */
const sorters={featured:(a,b)=>(b.b?1:0)-(a.b?1:0)||a._idx-b._idx,low:(a,b)=>a.p-b.p,high:(a,b)=>b.p-a.p,name:(a,b)=>a._t.localeCompare(b._t)};
function render(){
 const bucket=BUCKETS.find(b=>b[0]===state.price);
 const list=data.filter(i=>(!state.cat||i._k===state.cat)&&(!state.color||i._c.includes(state.color))&&(!bucket||bucket[2](i.p))&&(!state.occ||i._o.includes(state.occ))&&(!state.q||(i._t+" "+i._k+" "+(i.d||"")).toLowerCase().includes(state.q))).sort(sorters[state.sort]);
 root.innerHTML=list.map(card).join("");hydrate();
 $("cEmpty").hidden=list.length>0;
 $("cCount").innerHTML=`Showing <b>${list.length}</b> of ${data.length} flowers`;
 tabs.querySelectorAll(".ctab").forEach(b=>b.classList.toggle("on",b.dataset.cat===state.cat));
 $("cColors").querySelectorAll(".copt").forEach(b=>b.classList.toggle("on",b.dataset.color===state.color));
 $("cPrice").querySelectorAll(".copt").forEach(b=>b.classList.toggle("on",b.dataset.price===state.price));
 $("cOcc").value=state.occ;
 const chips=[];
 if(state.cat)chips.push(["cat",state.cat]);
 if(state.color)chips.push(["color",state.color]);
 if(state.occ)chips.push(["occ",occLabel(state.occ)]);
 if(bucket)chips.push(["price",bucket[1]]);
 if(state.q)chips.push(["q",'"'+state.q+'"']);
 $("cActive").innerHTML=chips.length?chips.map(c=>`<button type="button" class="achip" data-clear="${c[0]}">${esc(c[1])} <span aria-hidden="true">&times;</span><span class="sr">remove filter</span></button>`).join("")+'<button type="button" class="alink" data-clear="all">Clear all</button>':"";
 $("cReset").hidden=!chips.length;
 window.__flt.q=state.q;
}
const set=(k,v)=>{state[k]=v;render()};
const resetAll=()=>{state.cat=state.color=state.price=state.occ=state.q="";$("cSearch").value="";const ni=$("nsq");if(ni)ni.value="";render()};

tabs.addEventListener("click",e=>{const b=e.target.closest(".ctab");if(b)set("cat",b.dataset.cat)});
$("cColors").addEventListener("click",e=>{const b=e.target.closest(".copt");if(b)set("color",b.dataset.color)});
$("cPrice").addEventListener("click",e=>{const b=e.target.closest(".copt");if(b)set("price",b.dataset.price)});
$("cSort").addEventListener("change",e=>set("sort",e.target.value));
$("cOcc").addEventListener("change",e=>set("occ",e.target.value));
$("cSearch").addEventListener("input",e=>set("q",e.target.value.trim().toLowerCase()));
$("cActive").addEventListener("click",e=>{const b=e.target.closest("[data-clear]");if(!b)return;
 if(b.dataset.clear==="all")return resetAll();
 if(b.dataset.clear==="q")$("cSearch").value="";
 set(b.dataset.clear,"")});
$("cReset").addEventListener("click",resetAll);
$("cEmptyReset").addEventListener("click",resetAll);
root.addEventListener("click",e=>{
 const dot=e.target.closest(".pc2-dot[data-col]");
 if(dot){e.stopPropagation();const c=dot.closest(".pc2");c.dataset.col=dot.dataset.col;c.querySelectorAll(".pc2-dot").forEach(d=>{const on=d===dot;d.classList.toggle("on",on);d.setAttribute("aria-pressed",on)});c.querySelectorAll("[data-act]").forEach(b=>b.dataset.color=dot.dataset.col);if(c._p)c._p.set(dot.dataset.col,c._p.n);return}
 if(e.target.closest("[data-act],a,.pc2-arr"))return;
 const c=e.target.closest(".pc2");if(!c||Date.now()-(root._drag||0)<400)return;openDetail(c.dataset.id,c.dataset.col)});
$("cFilterBtn").addEventListener("click",()=>{const s=$("cSide"),o=s.classList.toggle("open");$("cFilterBtn").setAttribute("aria-expanded",o)});

/* the navbar search box (script.js) filters this page live */
window.__flt={q:state.q};
window.__applyFlt=()=>{state.q=window.__flt.q;$("cSearch").value=state.q;render()};
render();
}

/* ---- homepage "Our best sellers": a picture of the bouquet; tap a card to open the 360 preview ---- */
if(home){
 const wire=()=>{home.querySelectorAll(".p").forEach(c=>{if(c._hm)return;const b=c.querySelector("[data-id]");if(!b)return;const i=byId(b.dataset.id);if(!i)return;const img=c.querySelector(".img");if(!img)return;c._hm=1;
  c.classList.add("hm-card");img.setAttribute("tabindex","0");img.setAttribute("role","button");img.setAttribute("aria-label","View "+i._t+" in 360 degrees");
  if(window.CZ3D&&!i.m){const cv=document.createElement("canvas");cv.className="hm-cv";cv.setAttribute("aria-hidden","true");img.appendChild(cv);img.classList.add("hm-live");c._p=new Prev(cv,i,defCol(i),defStems(i))}
  img.insertAdjacentHTML("beforeend",'<span class="hm-360" aria-hidden="true">&#8635; 360&deg;</span>');
  const open=()=>openDetail(i.id,defCol(i));
  c.addEventListener("click",e=>{if(e.target.closest("[data-act],a"))return;open()});
  img.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();open()}})})};
 if(window.CZ3D)wire();else window.addEventListener("load",wire,{once:true});
}
})();