/* Flower shop - shared scripts
   window.PRODUCTS is printed by index.php / products.php from the MySQL products table. */

/* ---- Product picture: real photo if products.image is set, otherwise an empty "picture goes here" placeholder ---- */
window.flowerPic=(i,alt)=>{
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 if(i&&i.m)return `<img class="pic" src="${esc(i.m)}" alt="${esc(alt||i.n||"")}" loading="lazy">`;
 return '<span class="ph" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="M3.5 17l5-4.5 3.5 3 3-2.5 5.5 4.5"/></svg></span>'};

/* ---- Store (products, orders, tracking) ---- */
window.Store=(()=>{const P="annroe_products",O="annroe_orders";
const rd=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}};
const wr=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const seed=[{"id":1,"n":"Imported Rose Bouquet (red)","p":500,"e":"🌹","c":"#ecd5bd","d":"Imported red roses","b":1,"v":[["Single",500],["3 stems",1000],["6 stems",2000],["12 stems",3500]]},{"id":2,"n":"Carnation Bouquet (pink)","p":250,"e":"🌸","c":"#efe0c6","d":"Pink carnations","b":1,"v":[["Single",250],["3 stems",600],["6 stems",1200],["8 stems",1600],["10 stems",1800],["12 stems",2200]]},{"id":3,"n":"Tulips Bouquet (pink)","p":500,"e":"🌷","c":"#e8d6c0","d":"Blue tulips: add ₱100 per stem","b":1,"v":[["Single",500],["Double",900],["Three's",1300],["6's",2400],["12's",4800],["24's",8000]]},{"id":4,"n":"Lisianthus Bouquet (pink or violet)","p":600,"e":"💐","c":"#e2dcc8","d":"Available in pink or violet","b":1,"v":[["2 stems",600],["3 stems",800],["6 stems",1500],["12 stems",2500]]},{"id":5,"n":"Gerbera Bouquet (pink, yellow, white)","p":250,"e":"🌼","c":"#e2e0c4","d":"Choose pink, yellow or white","v":[["Single",250],["3's",600],["4's",750],["6's",1200],["12's",2400]]}];
const demo=[{id:"A1001",date:"2026-10-01",name:"Maria Santos",email:"maria@mail.com",items:["1 Dozen Pink Roses Round Bouquet"],total:2300,status:"Delivered"},
{id:"A1002",date:"2026-10-04",name:"Jun Dela Cruz",email:"jun@mail.com",items:["1 Dozen Imported Red Roses with Heart Pillow"],total:2900,status:"Preparing"}];
const EV="annroe_events",day=n=>new Date(Date.now()-n*864e5).toISOString().slice(0,10);
const demoEv=()=>{const e={};for(let i=0;i<7;i++)e[day(i)]={visits:40+(i*7)%23,carts:8+(i*3)%9};return e};
const api={days:()=>[6,5,4,3,2,1,0].map(day),events:()=>rd(EV,null)||demoEv(),
track(t){const e=api.events(),k=day(0);e[k]=e[k]||{visits:0,carts:0};e[k][t]++;wr(EV,e)},products:()=>rd(P,(window.PRODUCTS&&window.PRODUCTS.length)?window.PRODUCTS:seed),saveProducts:v=>wr(P,v),orders:()=>rd(O,demo),saveOrders:v=>wr(O,v),
addOrder(u,cart){const o=api.orders();o.unshift({id:"A"+(1001+o.length),date:new Date().toISOString().slice(0,10),name:u.name,email:u.email,items:cart.map(x=>x.n),total:cart.reduce((s,x)=>s+x.p,0),status:"Pending"});wr(O,o)}};
return api})();

/* ---- Account (login session, header) ---- */
window.Account=(()=>{
const U="annroe_users",S="annroe_session";
const read=k=>{try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}};
const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}};
const hash=async(p,s)=>{try{const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s+p));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}catch(e){let h=0;for(const c of s+p)h=(h*31+c.charCodeAt(0))|0;return"x"+h}};
/* demo admin account: admin@annroes.com / admin123 */
const ready=(async()=>{const u=read(U)||{};if(!u["admin@annroes.com"]){u["admin@annroes.com"]={name:"Admin",salt:"adm",hash:await hash("admin123","adm"),role:"admin"};write(U,u)}})();
const api={
 session:()=>read(S),
 users:()=>Object.entries(read(U)||{}).map(([email,u])=>({email,name:u.name,role:u.role||"customer"})),
 async register(name,email,pw){await ready;const users=read(U)||{},k=email.toLowerCase();if(users[k])return{error:"exists"};
  const salt=Math.random().toString(36).slice(2);users[k]={name,salt,hash:await hash(pw,salt),role:"customer"};return write(U,users)?{ok:1}:{error:"storage"}},
 async login(email,pw){await ready;const u=(read(U)||{})[email.toLowerCase()];if(!u)return{error:"nouser"};
  if(await hash(pw,u.salt)!==u.hash)return{error:"badpw"};write(S,{name:u.name,email:email.toLowerCase(),role:u.role||"customer"});return{ok:1}},
 logout(){try{localStorage.removeItem(S)}catch(e){}},
 updateHeader(){const a=document.querySelector('.acct a[href="login.php"]:not(.cta)');if(!a)return;
  document.querySelectorAll(".acct .lo").forEach(x=>x.remove());const s=api.session();
  a.textContent=s?"Hi, "+s.name.split(" ")[0]:"Login / Register";if(!s)return;
  const o=document.createElement("a");o.href="#";o.className="lo";o.textContent="Logout";
  o.onclick=e=>{e.preventDefault();api.logout();location.href="login.php"};
  if(s.role==="admin"){const d=document.createElement("a");d.href="admin.php";d.className="lo";d.textContent="Dashboard";a.after(d,o)}else a.after(o)}
};
document.addEventListener("DOMContentLoaded",api.updateHeader);
return api})();

/* ---- Product grid (runs only where #grid exists) ----
   Home page (index.php): best sellers only (max 4); "View all flowers" opens products.php in a new tab.
   products.php (window.SHOW_ALL = true): every flower, all price options, and color filter chips. */
if (document.getElementById("grid")) {
const all=Store.products();
const showAll=!!window.SHOW_ALL;
const f=v=>"₱"+Number(v).toLocaleString("en-PH",{minimumFractionDigits:2});
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fo=v=>"₱"+Number(v).toLocaleString("en-PH");
const grid=document.getElementById("grid");
/* colors are detected from the product name / note, e.g. "(pink, yellow, white)" */
const COLORS=[["Red","red","#c62f3e"],["Pink","pink","#f08ab0"],["Orange","orange","#f08a3c"],["Yellow","yellow","#f2c744"],["White","white","#ffffff"],["Violet","violet|purple|lavender","#8a63c7"],["Blue","blue","#4a7fd1"]];
const colorsOf=i=>{const t=(i.n+" "+(i.d||"")).toLowerCase();return COLORS.filter(c=>new RegExp("\\b("+c[1]+")").test(t)).map(c=>c[0])};
const items=showAll?all:(()=>{const b=all.filter(i=>i.b);return(b.length?b:all).slice(0,4)})();
grid.classList.add(showAll?"full":"compact");
grid.innerHTML=items.map(i=>{const v=i.v&&i.v.length?i.v:null;
return `<div class="p" data-colors="${colorsOf(i).join(",")}"><div class="img" style="background:${esc(i.c||"#ecd5bd")}">${flowerPic(i)}${i.t?`<span class="tag ${i.so?"so":""}">${esc(i.t)}</span>`:""}</div><h3>${esc(i.n)}</h3><div class="price">${v?`<small class="from">From</small> `:""}${i.o?`<s>${f(i.o)}</s>`:""}${f(i.p)}</div>${showAll&&v?`<ul class="opts">${v.map(o=>`<li><span>${esc(o[0])}</span><b>${fo(o[1])}</b></li>`).join("")}</ul>`:""}${showAll&&i.d?`<p class="note">${esc(i.d)}</p>`:""}${i.so?`<button class="add" disabled>Sold out</button>`:`<a class="add" href="index.php#contact">Inquire now</a>`}</div>`}).join("");
if(showAll){
 /* shared filter state: color chips + navbar search */
 const flt=window.__flt={q:"",c:""};
 const box=document.getElementById("colors");
 window.__applyFlt=()=>{let n=0;
  grid.querySelectorAll(".p").forEach(c=>{
   const okQ=!flt.q||c.querySelector("h3").textContent.toLowerCase().includes(flt.q);
   const okC=!flt.c||c.dataset.colors.split(",").includes(flt.c);
   c.style.display=okQ&&okC?"":"none";if(okQ&&okC)n++});
  let msg=document.getElementById("noRes");
  if(!n){if(!msg){msg=document.createElement("p");msg.id="noRes";msg.className="no-res";grid.appendChild(msg)}
   msg.textContent="No flowers found"+(flt.c?" in "+flt.c.toLowerCase():"")+(flt.q?' for "'+flt.q+'"':"")+". Try another color or search."}
  else if(msg)msg.remove();
  const cnt=document.getElementById("count");if(cnt)cnt.textContent="Showing "+n+" of "+items.length+" flowers"};
 if(box){
  const present=COLORS.filter(c=>items.some(i=>colorsOf(i).includes(c[0])));
  box.innerHTML='<button type="button" class="chip on" data-c=""><i class="sw all"></i>All colors</button>'+present.map(c=>`<button type="button" class="chip" data-c="${c[0]}"><i class="sw" style="background:${c[2]}"></i>${c[0]}</button>`).join("");
  box.addEventListener("click",e=>{const b=e.target.closest(".chip");if(!b)return;
   box.querySelectorAll(".chip").forEach(x=>x.classList.toggle("on",x===b));flt.c=b.dataset.c;window.__applyFlt()});
 }
 window.__applyFlt();
}
try{if(!sessionStorage.getItem("v")){Store.track("visits");sessionStorage.setItem("v",1)}}catch(e){}
}

/* ---- Flower slideshow: every available flower with a short quote and description ----
   Quote and description come from the optional products.slideshow_quote / slideshow_description columns (item.q / item.sd); otherwise a default is chosen by flower name.
   Features: auto-play with progress bar, arrows, dots, swipe, keyboard, falling petals, staggered text animation. */
(() => {
const wrap=document.getElementById("aslides"),dots=document.getElementById("adots"),box=document.getElementById("aslider");
if(!wrap||!dots)return;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const QUOTES=[["rose","Red roses say what words sometimes can't."],["carnation","Soft, ruffled and full of gentle affection."],["tulip","Simple elegance that brings spring into any room."],["lisianthus","Graceful blooms for the moments that deserve something special."],["gerbera","Bright, cheerful faces that turn any day into a happy one."]];
const quoteOf=i=>{if(i.q)return i.q;const n=i.n.toLowerCase();const m=QUOTES.find(q=>n.includes(q[0]));return m?m[1]:"Fresh blooms, hand-arranged just for you."};
const DESCS=[["rose","Hand-arranged imported roses, a classic way to say I love you, congratulations or thank you."],["carnation","Fresh, long-lasting blooms with soft ruffled petals, a sweet and affordable gift for any occasion."],["tulip","Elegant, graceful stems arranged by hand to bring a fresh touch of spring to any home or celebration."],["lisianthus","Delicate, rose-like blooms that make a refined gift for birthdays, anniversaries and special moments."],["gerbera","Cheerful, daisy-like flowers that brighten any room and bring instant smiles."]];
const descOf=i=>{if(i.sd)return i.sd;const n=i.n.toLowerCase();const m=DESCS.find(d=>n.includes(d[0]));return m?m[1]:"Hand-arranged by our florists using fresh blooms, made just for your occasion."};
const titleOf=i=>i.n.replace(/\s*\([^)]*\)/g,"").trim();   /* "Gerbera Bouquet (pink, yellow, white)" -> "Gerbera Bouquet" */
const flowers=Store.products().filter(i=>!i.so&&i.s!==0);   /* available (not sold out) and not hidden from the slideshow */
flowers.forEach(i=>{
 const el=document.createElement("div");el.className="about aslide";
 el.innerHTML=`<div class="about-card fcard"><div class="fcircle" style="background:${esc(i.c||"#ecd5bd")}">${flowerPic(i)}</div></div><div class="about-txt"><h2 class="left">${esc(titleOf(i))}</h2><blockquote class="fq">${esc(quoteOf(i))}</blockquote><p>${esc(descOf(i))}</p><a class="btn" href="#contact">Inquire now</a></div>`;
 wrap.appendChild(el)});
const slides=[...wrap.children];
/* decoration: dashed ring + two orbiting dots around every round picture, faint flower behind the story text */
if(!slides.length){box.style.display="none";return}
slides[0].classList.add("on");
slides.forEach(sl=>{const c=sl.querySelector(".about-card");if(c)c.insertAdjacentHTML("afterbegin",'<span class="ring"></span><span class="orb o1"></span><span class="orb o2"></span>')});
if(slides.length<2){dots.style.display="none";return}

/* falling petals (decorative) */
const petals=document.createElement("div");petals.className="petals";petals.setAttribute("aria-hidden","true");
["🌸","🌷","🌼","🌸","🌺","🌼"].forEach((e,k)=>{const p=document.createElement("span");p.textContent=e;
 p.style.cssText=`left:${[3,9,88,94,6,91][k]}%;animation-duration:${11+k*2}s;animation-delay:${-k*3}s;font-size:${14+(k%3)*4}px`;petals.appendChild(p)});
box.prepend(petals);

/* arrows + dots */
const mk=(cls,label,svg)=>{const b=document.createElement("button");b.type="button";b.className="anav "+cls;b.setAttribute("aria-label",label);b.innerHTML=svg;return b};
const prev=mk("prev","Previous slide",'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>');
const next=mk("next","Next slide",'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>');
slides.forEach((sl,k)=>{sl.setAttribute("role","tabpanel");sl.setAttribute("aria-label",(k+1)+" of "+slides.length);sl.inert=k!==0;
 const d=document.createElement("button");d.type="button";d.className="adot"+(k?"":" on");d.setAttribute("role","tab");d.setAttribute("aria-label","Go to slide "+(k+1));d.setAttribute("aria-selected",k===0);
 d.addEventListener("click",()=>{go(k);restart()});dots.appendChild(d)});
dots.prepend(prev);dots.append(next);
const dotEls=()=>[...dots.querySelectorAll(".adot")];

let cur=0,timer=null;
/* side previews: the previous / next slide shown in the empty space beside the panel (wide screens only) */
const meta=flowers.map(i=>({t:titleOf(i),m:i.m,n:i.n,c:i.c||"#ecd5bd"}));
const hold=document.createElement("div");hold.className="awrap";box.parentNode.insertBefore(hold,box);hold.appendChild(box);
const mkPeek=(cls,label,arrow)=>{const b=document.createElement("button");b.type="button";b.className="apeek "+cls;hold.appendChild(b);return b};
const pPrev=mkPeek("prev"),pNext=mkPeek("next");
const peekHTML=(m,label)=>`<span class="pk-label">${label}</span><span class="pk-circle" style="background:${esc(m.c)}">${flowerPic(m,"")}</span><b class="pk-name">${esc(m.t)}</b>`;
const renderPeeks=()=>{const a=(cur-1+slides.length)%slides.length,b=(cur+1)%slides.length;
 pPrev.innerHTML=peekHTML(meta[a],"&lsaquo; Previous");pPrev.setAttribute("aria-label","Previous slide: "+meta[a].t);
 pNext.innerHTML=peekHTML(meta[b],"Next &rsaquo;");pNext.setAttribute("aria-label","Next slide: "+meta[b].t)};

const go=(n,dir)=>{n=(n+slides.length)%slides.length;if(n===cur)return;
 dir=dir||(n>cur?1:-1);box.classList.toggle("back",dir<0);
 slides.forEach(sl=>sl.classList.remove("out"));
 slides[cur].classList.add("out");
 slides.forEach((sl,k)=>{sl.classList.toggle("on",k===n);sl.inert=k!==n});
 dotEls().forEach((d,k)=>{d.classList.toggle("on",k===n);d.setAttribute("aria-selected",k===n)});cur=n;renderPeeks()};
const reduce=matchMedia("(prefers-reduced-motion:reduce)").matches;
const stop=()=>{clearInterval(timer);timer=null;box.classList.remove("playing")};
const start=()=>{if(reduce||timer)return;box.classList.add("playing");timer=setInterval(()=>go(cur+1,1),6000)};
const restart=()=>{stop();void box.offsetWidth;start()};
prev.addEventListener("click",()=>{go(cur-1,-1);restart()});
pPrev.addEventListener("click",()=>{go(cur-1,-1);restart()});pNext.addEventListener("click",()=>{go(cur+1,1);restart()});renderPeeks();
next.addEventListener("click",()=>{go(cur+1,1);restart()});
box.addEventListener("mouseenter",stop);box.addEventListener("mouseleave",start);
box.addEventListener("focusin",stop);box.addEventListener("focusout",start);
document.addEventListener("visibilitychange",()=>document.hidden?stop():start());
dots.addEventListener("keydown",e=>{if(e.key==="ArrowRight"){go(cur+1,1);dotEls()[cur].focus();restart()}else if(e.key==="ArrowLeft"){go(cur-1,-1);dotEls()[cur].focus();restart()}});
let x0=null;
box.addEventListener("touchstart",e=>{x0=e.touches[0].clientX},{passive:true});
box.addEventListener("touchend",e=>{if(x0===null)return;const dx=e.changedTouches[0].clientX-x0;x0=null;if(Math.abs(dx)>50){go(cur+(dx<0?1:-1),dx<0?1:-1);restart()}},{passive:true});
start();
})();

/* ---- "Our story" + best sellers: fade-in on scroll + year counter ---- */
(() => {
document.documentElement.classList.add("js");
const sec=document.querySelector(".duo-sec");if(!sec)return;
const counter=sec.querySelector("[data-count]");
const run=()=>{sec.classList.add("in");
 if(counter&&!matchMedia("(prefers-reduced-motion:reduce)").matches){const end=+counter.dataset.count,from=end-90,t0=performance.now();
  const tick=t=>{const k=Math.min(1,(t-t0)/1400),e=1-Math.pow(1-k,3);counter.textContent=Math.round(from+(end-from)*e);if(k<1)requestAnimationFrame(tick)};requestAnimationFrame(tick)}};
if(!("IntersectionObserver" in window)||matchMedia("(prefers-reduced-motion:reduce)").matches){sec.classList.add("in");return}
new IntersectionObserver((en,o)=>{en.forEach(x=>{if(x.isIntersecting){run();o.disconnect()}})},{threshold:.3}).observe(sec);
})();

/* ---- Dropdown menus ---- */
(() => {
const menus=[...document.querySelectorAll(".dd")];
const close=except=>menus.forEach(m=>{if(m!==except){m.classList.remove("open");m.firstElementChild.setAttribute("aria-expanded","false")}});
menus.forEach(m=>{const t=m.firstElementChild;
t.addEventListener("click",e=>{e.preventDefault();const o=!m.classList.contains("open");close(m);m.classList.toggle("open",o);t.setAttribute("aria-expanded",o)})});
document.addEventListener("click",e=>{if(!e.target.closest(".dd"))close()});
document.addEventListener("keydown",e=>{if(e.key==="Escape")close()});
})();

/* ---- Expanding navbar search ----
   On products.php it filters the full list live; on other pages it jumps to products.php?q=... */
(() => {
const box=document.getElementById("nsearch"); if(!box) return;
const btn=box.querySelector(".ns-btn"),form=box.querySelector(".ns-form"),inp=form.querySelector("input"),x=box.querySelector(".ns-x");
const grid=document.getElementById("grid"),onAll=()=>!!window.__flt;
const setOpen=o=>{box.classList.toggle("open",o);btn.setAttribute("aria-expanded",o);btn.setAttribute("aria-label",o?"Search":"Open search");inp.tabIndex=x.tabIndex=o?0:-1;if(o)setTimeout(()=>inp.focus(),150)};
const filter=q=>{if(!onAll())return;window.__flt.q=q.trim().toLowerCase();window.__applyFlt()};
const toBest=()=>{const b=document.getElementById("best");if(b)b.scrollIntoView({behavior:"smooth"})};
btn.addEventListener("click",()=>{
 if(!box.classList.contains("open"))setOpen(true);
 else if(inp.value.trim())form.dispatchEvent(new Event("submit",{cancelable:true}));
 else setOpen(false)});
x.addEventListener("click",()=>{inp.value="";filter("");setOpen(false);btn.focus()});
inp.addEventListener("input",()=>filter(inp.value));
form.addEventListener("submit",e=>{e.preventDefault();const q=inp.value.trim();if(!q)return;
 if(onAll()){filter(q);toBest()}else location.href="products.php?q="+encodeURIComponent(q)});
document.addEventListener("keydown",e=>{
 const typing=/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
 if((e.key.toLowerCase()==="k"&&(e.ctrlKey||e.metaKey))||(e.key==="/"&&!typing)){e.preventDefault();setOpen(true);inp.select()}
 else if(e.key==="Escape"&&box.classList.contains("open"))x.click()});
document.addEventListener("click",e=>{if(!box.contains(e.target)&&box.classList.contains("open")&&!inp.value.trim())setOpen(false)});
const q0=new URLSearchParams(location.search).get("q");
if(q0&&onAll()){inp.value=q0;setOpen(true);filter(q0);setTimeout(toBest,300)}
})();