/* ---- Shop: login-protected ordering ----
   "Buy now" / "Add to cart" buttons (data-act="buy|cart" data-id="PRODUCT_ID") open:
   login popup (if not logged in) -> size + quantity popup -> cart drawer -> place order.
   Needs script.js first (Store, Account). The cart is saved per account in localStorage. */
(() => {
if(!window.Store||!window.Account)return;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const peso=v=>"₱"+Number(v).toLocaleString("en-PH");
const RE=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const sess=()=>Account.session();

/* ---------- cart storage (per logged-in account) ---------- */
const CK=e=>"annroe_cart:"+e;
const readCart=()=>{const s=sess();if(!s)return[];try{return JSON.parse(localStorage.getItem(CK(s.email)))||[]}catch(e){return[]}};
const writeCart=c=>{const s=sess();if(!s)return;try{localStorage.setItem(CK(s.email),JSON.stringify(c))}catch(e){}refresh()};
const count=()=>readCart().reduce((n,x)=>n+x.qty,0);
const total=c=>c.reduce((n,x)=>n+x.price*x.qty,0);
function refresh(){document.querySelectorAll(".cartn").forEach(b=>{const n=count();b.textContent=n>99?"99+":n;b.hidden=!n})}

/* ---------- toast ---------- */
let toastT=null;
function toast(msg,action){
 let t=document.getElementById("toast");
 if(!t){t=document.createElement("div");t.id="toast";t.className="toast";t.setAttribute("role","status");document.body.appendChild(t)}
 t.innerHTML=`<span>${esc(msg)}</span>${action?`<button type="button">${esc(action[0])}</button>`:""}`;
 if(action)t.querySelector("button").onclick=()=>{t.classList.remove("on");action[1]()};
 void t.offsetWidth;t.classList.add("on");clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove("on"),3200)}

/* ---------- modal / drawer shell ---------- */
let layer=null,lastFocus=null;
function openModal(html,cls,side){
 closeModal(true);
 lastFocus=document.activeElement;
 layer=document.createElement("div");layer.className="mdl"+(side?" side":"");
 layer.innerHTML=`<div class="mdl-box ${cls||""}" role="dialog" aria-modal="true">${html}<button type="button" class="mdl-x" aria-label="Close">&times;</button></div>`;
 document.body.appendChild(layer);document.body.classList.add("is-loading");
 requestAnimationFrame(()=>layer&&layer.classList.add("on"));
 layer.addEventListener("mousedown",e=>{if(e.target===layer)closeModal()});
 layer.querySelector(".mdl-x").addEventListener("click",()=>closeModal());
 return layer.querySelector(".mdl-box")}
function closeModal(instant){
 if(!layer)return;const l=layer;layer=null;document.body.classList.remove("is-loading");
 if(instant){l.remove();return}
 l.classList.remove("on");setTimeout(()=>l.remove(),260);
 if(lastFocus&&lastFocus.focus)try{lastFocus.focus()}catch(e){}}
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&layer)closeModal()});

/* ---------- login popup ---------- */
function openLogin(next,tab){
 const box=openModal(`
 <div class="am-head"><span class="am-eyebrow">Members only</span><h3>Log in to order</h3><p class="am-note">Please log in or create an account first to buy flowers or add them to your cart.</p></div>
 <div class="am-tabs" role="tablist"><button type="button" role="tab" data-tab="login">Log in</button><button type="button" role="tab" data-tab="register">Create account</button></div>
 <form class="am-form" data-form="login" novalidate>
  <label>Email address<input type="email" name="email" autocomplete="email"></label><span class="am-err" data-e="email"></span>
  <label>Password<span class="am-pw"><input type="password" name="pw" autocomplete="current-password"><button type="button" data-show>Show</button></span></label><span class="am-err" data-e="pw"></span>
  <button class="am-btn solid" type="submit">Log in</button><p class="am-msg" role="alert"></p>
 </form>
 <form class="am-form" data-form="register" novalidate hidden>
  <label>Full name<input type="text" name="name" autocomplete="name"></label><span class="am-err" data-e="name"></span>
  <label>Email address<input type="email" name="email" autocomplete="email"></label><span class="am-err" data-e="email"></span>
  <label>Password <small>(at least 6 characters)</small><span class="am-pw"><input type="password" name="pw" autocomplete="new-password"><button type="button" data-show>Show</button></span></label><span class="am-err" data-e="pw"></span>
  <label>Confirm password<input type="password" name="pw2" autocomplete="new-password"></label><span class="am-err" data-e="pw2"></span>
  <button class="am-btn solid" type="submit">Create account</button><p class="am-msg" role="alert"></p>
 </form>`,"am-auth");
 const forms={login:box.querySelector('[data-form="login"]'),register:box.querySelector('[data-form="register"]')};
 const tabs=[...box.querySelectorAll(".am-tabs button")];
 const show=t=>{tabs.forEach(b=>{const on=b.dataset.tab===t;b.classList.toggle("on",on);b.setAttribute("aria-selected",on)});
  forms.login.hidden=t!=="login";forms.register.hidden=t!=="register";
  box.querySelector("h3").textContent=t==="login"?"Log in to order":"Create your account";
  const f=forms[t];setTimeout(()=>{const i=f.querySelector("input");i&&i.focus()},60)};
 tabs.forEach(b=>b.addEventListener("click",()=>show(b.dataset.tab)));
 box.querySelectorAll("[data-show]").forEach(b=>b.addEventListener("click",()=>{const i=b.previousElementSibling,h=i.type==="password";i.type=h?"text":"password";b.textContent=h?"Hide":"Show"}));
 const bad=(f,k,msg)=>{const er=f.querySelector(`[data-e="${k}"]`),i=f.elements[k];er.textContent=msg;i&&i.classList.add("bad");f.classList.remove("shake");void f.offsetWidth;f.classList.add("shake");return false};
 const clear=f=>{f.querySelectorAll(".am-err,.am-msg").forEach(x=>x.textContent="");f.querySelectorAll(".bad").forEach(x=>x.classList.remove("bad"))};
 const busy=(b,t)=>{b.disabled=true;b.dataset.l=b.textContent;b.innerHTML='<span class="am-spin"></span>'+t};
 const idle=b=>{b.disabled=false;b.textContent=b.dataset.l};
 const finish=()=>{Account.updateHeader();refresh();closeModal();const s=sess();toast("Welcome, "+s.name.split(" ")[0]+"!");if(next)setTimeout(next,280)};
 forms.login.addEventListener("submit",async e=>{e.preventDefault();const f=e.target;clear(f);
  const em=f.elements.email.value.trim(),pw=f.elements.pw.value;let ok=true;
  if(!RE.test(em))ok=bad(f,"email","Please enter a valid email address.");
  if(!pw)ok=bad(f,"pw","Please enter your password.");
  if(!ok)return;const btn=f.querySelector(".am-btn");busy(btn,"Logging in…");
  const r=await Account.login(em,pw);
  if(r.error){idle(btn);if(r.error==="nouser")return bad(f,"email","We couldn't find an account with that email.");if(r.error==="badpw")return bad(f,"pw","Incorrect password. Please try again.");f.querySelector(".am-msg").textContent="Something went wrong. Please try again.";return}
  finish()});
 forms.register.addEventListener("submit",async e=>{e.preventDefault();const f=e.target;clear(f);
  const n=f.elements.name.value.trim(),em=f.elements.email.value.trim(),pw=f.elements.pw.value,c=f.elements.pw2.value;let ok=true;
  if(n.length<2)ok=bad(f,"name","Please enter your full name.");
  if(!RE.test(em))ok=bad(f,"email","Please enter a valid email address.");
  if(pw.length<6)ok=bad(f,"pw","Password must be at least 6 characters.");
  if(c!==pw)ok=bad(f,"pw2","Passwords do not match.");
  if(!ok)return;const btn=f.querySelector(".am-btn");busy(btn,"Creating account…");
  const r=await Account.register(n,em,pw);
  if(r.error){idle(btn);if(r.error==="exists")return bad(f,"email","An account with this email already exists.");f.querySelector(".am-msg").textContent="We couldn't save your account. Please make sure browser storage is enabled.";return}
  await Account.login(em,pw);finish()});
 show(tab||"login")}

/* ---------- size + quantity popup ---------- */
function pick(id,mode,color){
 const p=Store.products().find(x=>String(x.id)===String(id));if(!p)return;
 const opts=p.v&&p.v.length?p.v:[["Standard",p.p]];
 const buy=mode==="buy";
 const box=openModal(`
 <div class="am-head"><span class="am-eyebrow">${buy?"Buy now":"Add to cart"}</span><h3>${esc(p.n)}</h3>${p.d?`<p class="am-note">${esc(p.d)}</p>`:""}${color?`<p class="am-note">Color: <b>${esc(color)}</b></p>`:""}</div>
 <fieldset class="am-sizes"><legend>Choose a size</legend>
  ${opts.map((o,k)=>`<label class="am-size"><input type="radio" name="size" value="${k}"${k===0?" checked":""}><span class="am-dot"></span><span class="am-lab">${esc(o[0])}</span><b>${peso(o[1])}</b></label>`).join("")}
 </fieldset>
 <div class="am-row"><span>Quantity</span><div class="am-qty"><button type="button" data-d="-1" aria-label="Decrease">&minus;</button><output>1</output><button type="button" data-d="1" aria-label="Increase">+</button></div></div>
 <div class="am-row am-total"><span>Total</span><b id="amTotal"></b></div>
 <button type="button" class="am-btn solid" data-go>${buy?"Continue to checkout":"Add to cart"}</button>`,"am-pick");
 let qty=1;const out=box.querySelector("output"),tot=box.querySelector("#amTotal");
 const cur=()=>opts[+box.querySelector('input[name="size"]:checked').value];
 const upd=()=>{out.textContent=qty;tot.textContent=peso(cur()[1]*qty)};
 box.addEventListener("change",upd);
 box.querySelectorAll("[data-d]").forEach(b=>b.addEventListener("click",()=>{qty=Math.max(1,Math.min(99,qty+ +b.dataset.d));upd()}));
 upd();
 box.querySelector("[data-go]").addEventListener("click",()=>{
  const o=cur(),lab=o[0]+(color?" · "+color:""),c=readCart(),f=c.find(x=>String(x.id)===String(p.id)&&x.size===lab);
  if(f)f.qty=Math.min(99,f.qty+qty);else c.push({id:p.id,name:p.n,size:lab,price:Number(o[1]),qty});
  writeCart(c);
  if(buy){openCart()}else{closeModal();toast(esc2(p.n)+" added to your cart",["View cart",openCart])}});
 setTimeout(()=>{const i=box.querySelector("input");i&&i.focus()},80)}
const esc2=s=>String(s).replace(/\s*\([^)]*\)/g,"").trim();

/* ---------- checkout form (delivery details) ---------- */
const INFO=e=>"annroe_info:"+e;
const readInfo=()=>{const s=sess();if(!s)return{};try{return JSON.parse(localStorage.getItem(INFO(s.email)))||{}}catch(e){return{}}};
const saveInfo=i=>{const s=sess();if(!s)return;try{localStorage.setItem(INFO(s.email),JSON.stringify(i))}catch(e){}};
const PHONE=/^(09|\+639)\d{9}$/,cleanPhone=v=>String(v).replace(/[\s-]/g,"");
const SLOTS=["Morning (8 AM – 12 NN)","Afternoon (12 NN – 5 PM)","Evening (5 PM – 8 PM)"];
const PAYS=[["Cash on delivery / pickup","Pay when you receive your flowers"],["GCash","We will message you the GCash details"],["Bank transfer","We will message you the bank details"]];
const todayStr=()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)};
const niceDate=s=>{try{return new Date(s+"T00:00:00").toLocaleDateString("en-PH",{weekday:"short",month:"long",day:"numeric",year:"numeric"})}catch(e){return s}};
const fld=(label,name,attrs,extra)=>`<div class="co-f"><label>${label}<input type="${attrs&&attrs.type||"text"}" name="${name}" ${attrs&&attrs.v?`value="${esc(attrs.v)}"`:""} ${attrs&&attrs.ph?`placeholder="${esc(attrs.ph)}"`:""} ${attrs&&attrs.ac?`autocomplete="${attrs.ac}"`:""} ${attrs&&attrs.min?`min="${attrs.min}"`:""}>${extra||""}</label><span class="am-err" data-e="${name}"></span></div>`;

/* ---------- cart drawer + place order ---------- */
function openCart(){
 if(!sess())return openLogin(openCart);
 const box=openModal('<div class="cart-wrap"></div>',"am-cart",true),wrap=box.querySelector(".cart-wrap");
 const view=()=>{
  const c=readCart();
  if(!c.length){wrap.innerHTML=`<div class="am-head"><span class="am-eyebrow">Your cart</span><h3>Your cart is empty</h3><p class="am-note">Add some flowers and they will appear here.</p></div><button type="button" class="am-btn solid" data-close>Continue shopping</button>`;return}
  wrap.innerHTML=`<div class="am-head"><span class="am-eyebrow">Your cart</span><h3>${count()} item${count()>1?"s":""}</h3></div>
  <ul class="cart-list">${c.map((x,k)=>`<li><div class="ci-info"><b>${esc(x.name)}</b><span>${esc(x.size)} · ${peso(x.price)}</span>
   <div class="am-qty sm"><button type="button" data-q="-1" data-i="${k}" aria-label="Decrease">&minus;</button><output>${x.qty}</output><button type="button" data-q="1" data-i="${k}" aria-label="Increase">+</button></div></div>
   <div class="ci-end"><b>${peso(x.price*x.qty)}</b><button type="button" class="alink" data-rm="${k}">Remove</button></div></li>`).join("")}</ul>
  <div class="am-row am-total"><span>Total</span><b>${peso(total(c))}</b></div>
  <p class="am-note">Your order will be sent to Annroe's Flower Shop and our florists will contact you to confirm the details and payment.</p>
  <button type="button" class="am-btn solid" data-place>Place order</button>
  <button type="button" class="am-btn ghost" data-close>Continue shopping</button>`};
 view();
 wrap.addEventListener("click",e=>{
  const q=e.target.closest("[data-q]"),rm=e.target.closest("[data-rm]");
  if(q){const c=readCart(),x=c[+q.dataset.i];if(x){x.qty=Math.max(1,Math.min(99,x.qty+ +q.dataset.q));writeCart(c);view()}}
  else if(rm){const c=readCart();c.splice(+rm.dataset.rm,1);writeCart(c);view()}
  else if(e.target.closest("[data-close]"))closeModal();
  else if(e.target.closest("[data-back]"))view();
  else if(e.target.closest("[data-place]"))checkout()});

 /* step 2: delivery details form */
 function checkout(){
  const c=readCart(),s=sess();if(!c.length)return view();
  const sv=readInfo(),a=sv.address||{};
  wrap.innerHTML=`<div class="am-head"><button type="button" class="co-back" data-back>&lsaquo; Back to cart</button><span class="am-eyebrow">Checkout</span><h3>Delivery details</h3><p class="am-note">Tell us where and when to send your flowers.</p></div>
  <form class="co-form" id="coForm" novalidate>
   <div class="co-scroll">
    <fieldset class="co-sec"><legend>Your details</legend>
     ${fld("Full name","name",{v:s.name,ac:"name"})}
     ${fld("Mobile number","phone",{type:"tel",v:sv.phone||"",ph:"09XX XXX XXXX",ac:"tel"})}
    </fieldset>
    <fieldset class="co-sec"><legend>Delivery</legend>
     <div class="co-seg" role="radiogroup" aria-label="Delivery method"><label><input type="radio" name="method" value="delivery" checked><span>Delivery</span></label><label><input type="radio" name="method" value="pickup"><span>Store pickup</span></label></div>
     <label class="co-check"><input type="checkbox" name="gift"><span>This is a gift for someone else</span></label>
     <div data-gift hidden>
      ${fld("Recipient's name","rname",{})}
      ${fld("Recipient's mobile number","rphone",{type:"tel",ph:"09XX XXX XXXX"})}
     </div>
     <div data-addr>
      ${fld("House no. / street / building","street",{v:a.street||"",ac:"address-line1"})}
      <div class="co-two">${fld("Barangay","barangay",{v:a.barangay||""})}${fld("City / municipality","city",{v:a.city||"",ac:"address-level2"})}</div>
      ${fld("Province","province",{v:a.province||"",ac:"address-level1"})}
     </div>
     <p class="am-note" data-pick hidden>You will pick up your flowers at Annroe's Flower Shop. Our florists will confirm the details with you.</p>
     <div class="co-two">${fld("Date","date",{type:"date",min:todayStr()})}
      <div class="co-f"><label>Time<select name="slot">${SLOTS.map(t=>`<option>${t}</option>`).join("")}</select></label><span class="am-err"></span></div></div>
     <div class="co-f"><label>Landmark / notes for the florist <small>(optional)</small><textarea name="notes" rows="2" maxlength="200" placeholder="e.g. near the church, call upon arrival"></textarea></label></div>
    </fieldset>
    <fieldset class="co-sec"><legend>Payment</legend>
     <div class="co-pays">${PAYS.map((p,k)=>`<label class="co-pay"><input type="radio" name="pay" value="${esc(p[0])}"${k===0?" checked":""}><span><b>${p[0]}</b><small>${p[1]}</small></span></label>`).join("")}</div>
    </fieldset>
   </div>
   <div class="co-foot"><div class="am-row am-total"><span>Total</span><b>${peso(total(c))}</b></div><button class="am-btn solid" type="submit">Place order</button><p class="am-msg" role="alert"></p></div>
  </form>`;
  const f=wrap.querySelector("#coForm");
  f.addEventListener("change",e=>{
   if(e.target.name==="method"){const p=e.target.value==="pickup";f.querySelector("[data-addr]").hidden=p;f.querySelector("[data-pick]").hidden=!p}
   if(e.target.name==="gift")f.querySelector("[data-gift]").hidden=!e.target.checked});
  f.addEventListener("submit",e=>{
   e.preventDefault();
   const v=n=>(f.elements[n]&&f.elements[n].value||"").trim();
   f.querySelectorAll(".am-err,.am-msg").forEach(x=>x.textContent="");f.querySelectorAll(".bad").forEach(x=>x.classList.remove("bad"));
   const method=f.elements.method.value,gift=f.elements.gift.checked;let ok=true,first=null;
   const bad=(k,msg)=>{ok=false;const er=f.querySelector(`[data-e="${k}"]`),i=f.elements[k];if(er)er.textContent=msg;if(i){i.classList.add("bad");if(!first)first=i}};
   if(v("name").length<2)bad("name","Please enter your full name.");
   if(!PHONE.test(cleanPhone(v("phone"))))bad("phone","Enter a valid mobile number, e.g. 0917 123 4567.");
   if(gift){if(v("rname").length<2)bad("rname","Please enter the recipient's name.");if(!PHONE.test(cleanPhone(v("rphone"))))bad("rphone","Enter a valid mobile number for the recipient.")}
   if(method==="delivery"){
    if(v("street").length<3)bad("street","Please enter the street address.");
    if(v("barangay").length<2)bad("barangay","Barangay is required.");
    if(v("city").length<2)bad("city","City / municipality is required.");
    if(v("province").length<2)bad("province","Province is required.")}
   if(!v("date"))bad("date","Please choose a date.");else if(v("date")<todayStr())bad("date","The date can't be in the past.");
   if(!ok){if(first)first.focus();f.classList.remove("shake");void f.offsetWidth;f.classList.add("shake");return}
   const cart=readCart();if(!cart.length)return view();
   const btn=f.querySelector(".am-btn");btn.disabled=true;btn.innerHTML='<span class="am-spin"></span>Placing order…';
   const info={phone:cleanPhone(v("phone")),method,date:v("date"),slot:v("slot"),payment:f.elements.pay.value,notes:v("notes")};
   if(gift)info.recipient={name:v("rname"),phone:cleanPhone(v("rphone"))};
   if(method==="delivery")info.address={street:v("street"),barangay:v("barangay"),city:v("city"),province:v("province")};
   setTimeout(()=>{
    const id=Store.addOrder({name:v("name"),email:s.email},cart.map(x=>({n:`${x.name} – ${x.size} × ${x.qty}`,p:x.price*x.qty})),info);
    saveInfo({phone:info.phone,address:info.address||sv.address||{}});
    const sum=total(cart);writeCart([]);
    const who=gift?` for ${esc(info.recipient.name)}`:"";
    const where=method==="delivery"?`Delivery${who} to ${esc([info.address.street,info.address.barangay,info.address.city,info.address.province].join(", "))}`:`Store pickup${who}`;
    wrap.innerHTML=`<div class="am-done"><svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24"/><path d="M14 27l8 8 16-17"/></svg><h3>Thank you, ${esc(v("name").split(" ")[0])}!</h3><p>Your order <b>${esc(id)}</b> (${peso(sum)}) was received. Our florists will contact you at <b>${esc(info.phone)}</b> to confirm it.</p>
     <ul class="co-recap"><li><span>${where}</span></li><li><span>${esc(niceDate(info.date))} · ${esc(info.slot)}</span></li><li><span>Payment: ${esc(info.payment)}</span></li></ul>
     <button type="button" class="am-btn solid" data-close>Done</button></div>`},700)})}
 }

/* ---------- wiring ---------- */
document.addEventListener("click",e=>{
 const b=e.target.closest("[data-act]");if(!b||b.disabled)return;
 e.preventDefault();
 const run=()=>pick(b.dataset.id,b.dataset.act,b.dataset.color);
 if(sess())run();else openLogin(run)});
document.addEventListener("click",e=>{if(e.target.closest("#cartBtn")){e.preventDefault();openCart()}});
refresh();
window.addEventListener("storage",refresh);
/* adds a ready-made item (e.g. a customized bouquet) to the cart; asks the customer to log in first */
function addItem(item,buy,done){
 const run=()=>{const c=readCart();c.push(item);writeCart(c);if(done)done();if(buy)openCart();else toast(String(item.id).startsWith("custom-")?"Custom bouquet added to your cart":esc2(item.name)+" added to your cart",["View cart",openCart])};
 if(sess())run();else openLogin(run)}
window.Shop={openCart,openLogin,refresh,addItem};
})();