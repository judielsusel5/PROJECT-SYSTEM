/* Flower shop - shared scripts
   window.PRODUCTS is printed by index.php from the MySQL products table. */

/* ---- Store (products, orders, tracking) ---- */
window.Store=(()=>{const P="annroe_products",O="annroe_orders";
const rd=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}};
const wr=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const seed=[{id:1,n:"1 Dozen Imported Red Roses with Heart Pillow",p:2900,o:3000,e:"🌹",c:"#ecd5bd",t:"Sale"},
{id:2,n:"1 Dozen Pink and White Roses with Baby's Breath",p:2300,e:"🌸",c:"#efe0c6",t:"Sold out",so:1},
{id:3,n:"1 Dozen Pink Roses Round Bouquet",p:2300,e:"💐",c:"#e8d6c0",t:"Sold out",so:1},
{id:4,n:"1 Dozen White Roses in Kraft Wrap",p:2300,e:"🌼",c:"#e2e0c4"}];
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

/* ---- Landing page: best-sellers grid (runs only where #grid exists) ---- */
if (document.getElementById("grid")) {
const items=Store.products();
const f=v=>"₱"+Number(v).toLocaleString("en-PH",{minimumFractionDigits:2});
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
document.getElementById("grid").innerHTML=items.map(i=>`<div class="p"><div class="img" style="background:${esc(i.c||"#ecd5bd")}"><span class="e">${esc(i.e)}</span>${i.t?`<span class="tag ${i.so?"so":""}">${esc(i.t)}</span>`:""}</div><h3>${esc(i.n)}</h3><div class="price">${i.o?`<s>${f(i.o)}</s>`:""}${f(i.p)}</div>${i.so?`<button class="add" disabled>Sold out</button>`:`<a class="add" href="#contact">Inquire now</a>`}</div>`).join("");
try{if(!sessionStorage.getItem("v")){Store.track("visits");sessionStorage.setItem("v",1)}}catch(e){}
}

/* ---- Dropdown menus ---- */
(() => {
const menus=[...document.querySelectorAll(".dd")];
const close=except=>menus.forEach(m=>{if(m!==except){m.classList.remove("open");m.firstElementChild.setAttribute("aria-expanded","false")}});
menus.forEach(m=>{const t=m.firstElementChild;
t.addEventListener("click",e=>{e.preventDefault();const o=!m.classList.contains("open");close(m);m.classList.toggle("open",o);t.setAttribute("aria-expanded",o)})});
document.addEventListener("click",e=>{if(!e.target.closest(".dd"))close()});
document.addEventListener("keydown",e=>{if(e.key==="Escape")close()});
})();

/* ---- Expanding navbar search ---- */
(() => {
const box=document.getElementById("nsearch"); if(!box) return;
const btn=box.querySelector(".ns-btn"),form=box.querySelector(".ns-form"),inp=form.querySelector("input"),x=box.querySelector(".ns-x");
const grid=document.getElementById("grid");
const setOpen=o=>{box.classList.toggle("open",o);btn.setAttribute("aria-expanded",o);btn.setAttribute("aria-label",o?"Search":"Open search");inp.tabIndex=x.tabIndex=o?0:-1;if(o)setTimeout(()=>inp.focus(),150)};
const filter=q=>{if(!grid)return;q=q.trim().toLowerCase();let n=0;
 grid.querySelectorAll(".p").forEach(c=>{const m=!q||c.querySelector("h3").textContent.toLowerCase().includes(q);c.style.display=m?"":"none";if(m)n++});
 let msg=document.getElementById("noRes");
 if(!n&&q){if(!msg){msg=document.createElement("p");msg.id="noRes";msg.className="no-res";grid.appendChild(msg)}msg.textContent='No flowers found for "'+q+'". Try "rose" or "pink".'}else if(msg)msg.remove()};
const toBest=()=>{const b=document.getElementById("best");if(b)b.scrollIntoView({behavior:"smooth"})};
btn.addEventListener("click",()=>{
 if(!box.classList.contains("open"))setOpen(true);
 else if(inp.value.trim())form.dispatchEvent(new Event("submit",{cancelable:true}));
 else setOpen(false)});
x.addEventListener("click",()=>{inp.value="";filter("");setOpen(false);btn.focus()});
inp.addEventListener("input",()=>filter(inp.value));
form.addEventListener("submit",e=>{e.preventDefault();const q=inp.value.trim();if(!q)return;
 if(grid){filter(q);toBest()}else location.href="index.php?q="+encodeURIComponent(q)});
document.addEventListener("keydown",e=>{
 const typing=/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
 if((e.key.toLowerCase()==="k"&&(e.ctrlKey||e.metaKey))||(e.key==="/"&&!typing)){e.preventDefault();setOpen(true);inp.select()}
 else if(e.key==="Escape"&&box.classList.contains("open"))x.click()});
document.addEventListener("click",e=>{if(!box.contains(e.target)&&box.classList.contains("open")&&!inp.value.trim())setOpen(false)});
const q0=new URLSearchParams(location.search).get("q");
if(q0){inp.value=q0;setOpen(true);filter(q0);setTimeout(toBest,300)}
})();