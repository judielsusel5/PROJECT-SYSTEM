/* ---- All-flowers catalog (products.php) ----
   Category tabs, color / price filters, search and sorting. Needs script.js first (Store, flowerPic). */
(() => {
const root=document.getElementById("catalog");
if(!root||!window.Store)return;
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
const data=Store.products().map((i,idx)=>Object.assign({},i,{_k:catOf(i),_c:colorsOf(i),_t:titleOf(i),_idx:idx}));
const hex=n=>(COLORS.find(c=>c[0]===n)||[])[2]||"#ccc";

/* ---- state (can be preset from the URL: ?cat=roses&q=pink&color=Pink) ---- */
const qs=new URLSearchParams(location.search);
const catParam=(qs.get("cat")||"").toLowerCase();
const state={
 cat:(data.find(i=>i._k.toLowerCase()===catParam)||{})._k||"",
 color:(COLORS.find(c=>c[0].toLowerCase()===(qs.get("color")||"").toLowerCase())||[])[0]||"",
 price:"",sort:"featured",q:(qs.get("q")||"").trim().toLowerCase()
};

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

/* ---- card ---- */
const card=(i,k)=>{
 const v=i.v&&i.v.length?i.v:[];
 const rows=v.map((o,n)=>`<li class="${n>2?"x":""}"><span>${esc(o[0])}</span><b>${peso(o[1])}</b></li>`).join("");
 return `<article class="pcard${i.so?" is-so":""}" style="--d:${Math.min(k,12)*55}ms">
 <div class="pc-img" style="background:${esc(i.c||"#ecd5bd")}">${flowerPic(i,i._t)}<span class="pc-cat">${esc(i._k)}</span>${i.so?'<span class="pc-badge so">Sold out</span>':i.b?'<span class="pc-badge">Best seller</span>':""}</div>
 <div class="pc-body">
  <h3>${esc(i._t)}</h3>
  ${i._c.length?`<div class="pc-dots" aria-label="Colors: ${esc(i._c.join(", "))}">${i._c.map(c=>`<i title="${c}" style="background:${hex(c)}"></i>`).join("")}</div>`:""}
  ${i.d?`<p class="pc-note">${esc(i.d)}</p>`:""}
  <div class="pc-price"><small>From</small><b>${peso(i.p)}</b></div>
  ${rows?`<ul class="pc-opts">${rows}</ul>${v.length>3?`<button type="button" class="pc-more" data-n="${v.length}">Show all ${v.length} sizes</button>`:""}`:""}
  ${i.so?'<span class="pc-btn off">Currently unavailable</span>':'<a class="pc-btn" href="index.php#contact">Inquire now</a>'}
 </div></article>`};

/* ---- render ---- */
const sorters={featured:(a,b)=>(b.b?1:0)-(a.b?1:0)||a._idx-b._idx,low:(a,b)=>a.p-b.p,high:(a,b)=>b.p-a.p,name:(a,b)=>a._t.localeCompare(b._t)};
function render(){
 const bucket=BUCKETS.find(b=>b[0]===state.price);
 const list=data.filter(i=>(!state.cat||i._k===state.cat)&&(!state.color||i._c.includes(state.color))&&(!bucket||bucket[2](i.p))&&(!state.q||(i._t+" "+i._k+" "+(i.d||"")).toLowerCase().includes(state.q))).sort(sorters[state.sort]);
 root.innerHTML=list.map(card).join("");
 $("cEmpty").hidden=list.length>0;
 $("cCount").innerHTML=`Showing <b>${list.length}</b> of ${data.length} flowers`;
 tabs.querySelectorAll(".ctab").forEach(b=>b.classList.toggle("on",b.dataset.cat===state.cat));
 $("cColors").querySelectorAll(".copt").forEach(b=>b.classList.toggle("on",b.dataset.color===state.color));
 $("cPrice").querySelectorAll(".copt").forEach(b=>b.classList.toggle("on",b.dataset.price===state.price));
 const chips=[];
 if(state.cat)chips.push(["cat",state.cat]);
 if(state.color)chips.push(["color",state.color]);
 if(bucket)chips.push(["price",bucket[1]]);
 if(state.q)chips.push(["q",'"'+state.q+'"']);
 $("cActive").innerHTML=chips.length?chips.map(c=>`<button type="button" class="achip" data-clear="${c[0]}">${esc(c[1])} <span aria-hidden="true">&times;</span><span class="sr">remove filter</span></button>`).join("")+'<button type="button" class="alink" data-clear="all">Clear all</button>':"";
 $("cReset").hidden=!chips.length;
 window.__flt.q=state.q;
}
const set=(k,v)=>{state[k]=v;render()};
const resetAll=()=>{state.cat=state.color=state.price=state.q="";$("cSearch").value="";const ni=$("nsq");if(ni)ni.value="";render()};

tabs.addEventListener("click",e=>{const b=e.target.closest(".ctab");if(b)set("cat",b.dataset.cat)});
$("cColors").addEventListener("click",e=>{const b=e.target.closest(".copt");if(b)set("color",b.dataset.color)});
$("cPrice").addEventListener("click",e=>{const b=e.target.closest(".copt");if(b)set("price",b.dataset.price)});
$("cSort").addEventListener("change",e=>set("sort",e.target.value));
$("cSearch").addEventListener("input",e=>set("q",e.target.value.trim().toLowerCase()));
$("cActive").addEventListener("click",e=>{const b=e.target.closest("[data-clear]");if(!b)return;
 if(b.dataset.clear==="all")return resetAll();
 if(b.dataset.clear==="q")$("cSearch").value="";
 set(b.dataset.clear,"")});
$("cReset").addEventListener("click",resetAll);
$("cEmptyReset").addEventListener("click",resetAll);
root.addEventListener("click",e=>{const m=e.target.closest(".pc-more");if(!m)return;
 const c=m.closest(".pcard"),o=c.classList.toggle("open");m.textContent=o?"Show fewer sizes":"Show all "+m.dataset.n+" sizes"});
$("cFilterBtn").addEventListener("click",()=>{const s=$("cSide"),o=s.classList.toggle("open");$("cFilterBtn").setAttribute("aria-expanded",o)});

/* the navbar search box (script.js) filters this page live */
window.__flt={q:state.q};
window.__applyFlt=()=>{state.q=window.__flt.q;$("cSearch").value=state.q;render()};
render();
})();