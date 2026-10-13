/* ---- Bouquet customizer (products.php) ----
   Full-screen builder: live bouquet preview, categories on the left (Flowers, Greenery, Wrappers,
   Ribbons, Vase, Card), options on the right, selected items + total at the bottom.
   Flower prices come from the products table (stem rates from each flower's size options).
   Needs script.js (Store) and shop.js (Shop.addItem) first. */
(() => {
if(!window.Store)return;
const NS="http://www.w3.org/2000/svg";
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const peso=v=>"₱"+Number(v).toLocaleString("en-PH");

/* ---- shop settings (edit freely) ---- */
const COLORS=[["Red","red","#c62f3e"],["Pink","pink","#f08ab0"],["Orange","orange","#f08a3c"],["Yellow","yellow","#f2c744"],["White","white","#ffffff"],["Violet","violet|purple|lavender","#8a63c7"],["Blue","blue","#4a7fd1"]];
const GREEN=[["Eucalyptus","#7fa58f","leaf",30],["Ruscus","#4f7d4a","leaf",25],["Dusty miller","#b6c4ac","leaf",30],["Baby's breath","#ffffff","dots",35]];   // [name, color, style, price per sprig]
const WRAPS=[["Kraft paper","#c8a77a",0],["Korean white","#f5f1e8",50],["Classic black","#2e2a28",50],["Blush pink","#f2b6c6",50]];   // [name, color, extra price]
const RIBBONS=[["Red","#c62f3e"],["Pink","#f08ab0"],["Gold","#c9a24b"],["White","#ffffff"],["Violet","#8a63c7"]];
const VASES=[["No vase","",0],["Glass vase","glass",250],["Ceramic vase","ceramic",350]];   // [name, style, price]
const MONEY=[["₱20","#e8884a",20],["₱50","#c8454a",50],["₱100","#7b5aa6",100],["₱200","#5d9b5a",200],["₱500","#e8c840",500],["₱1,000","#4a7fc0",1000]];   // [label, color, face value] - the shop prepares the cash
const MONEY_FEE=10,MONEY_BASE=100;   // folding fee per bill + one-time arrangement fee when money is used
const TABS=[["flowers","Flowers"],["money","Money"],["leaves","Greenery"],["wrappers","Wrappers"],["ribbons","Ribbons"],["vase","Vase"],["card","Card"]];
const MAX_QTY=99,MSG_MAX=150,MAX_DRAW=200;
const SIZES=[["Small",7,3,24,.55],["Medium",15,6,48,.8],["Large",30,10,90,.97],["Big",50,16,150,1.15]];   // [name, max flowers, max greenery, max bills, wrapper flare]
const RMAX=[58,77,90,103],domeY=r=>214-r*r/420;   // how far from the middle a flower may sit for each size, and the height of the flower dome there
/* ---- real flower photos (cut out, transparent background). Put them in assets/image/ ---- */
const IMGDATA=window.__FLOWER_IMGS||{};
const imgSrc=f=>IMGDATA[f]||("assets/image/"+f+".webp");
/* greenery photos: save them as assets/image/eucalyptus.webp, ruscus.webp, dusty-miller.webp (transparent background, stem at the bottom). Missing files fall back to the drawn sprigs. */
const GPHOTO=["eucalyptus","ruscus","dusty-miller"],GOK={};
GPHOTO.forEach(f=>{const im=new Image();im.onload=()=>{GOK[f]=1};im.src=imgSrc(f)});
const PHOTO={   // shape -> [[color, file, base hue, base saturation]]. Other colors are made by tinting the nearest photo.
 rose:[["Red","rose-red",343,.96]],
 carn:[["Pink","carnation-pink",350,.25],["Yellow","carnation-yellow",51,.49]],
 gerb:[["Pink","gerbera-pink",346,.59],["Yellow","gerbera-yellow",56,.28]],
 lisi:[["Violet","lisianthus-violet",285,.3]]};
const FILES=["rose-red","carnation-pink","carnation-yellow","gerbera-pink","gerbera-yellow","lisianthus-violet","babys-breath","bill-20","bill-50","bill-100","bill-200","bill-500","bill-1000"];
const billKey=i=>"bill-"+MONEY[i][0].replace(/\D/g,"");
const HUE={Red:352,Pink:345,Orange:26,Yellow:52,Violet:280,Blue:215},SAT={Red:.9,Pink:.45,Orange:.8,Yellow:.55,Violet:.4,Blue:.6};
const nameOfHex=h=>(COLORS.find(c=>c[2].toLowerCase()===String(h).toLowerCase())||[])[0];
function photoFor(shape,hex){
 const list=PHOTO[shape];if(!list)return null;
 const name=nameOfHex(hex);if(!name)return null;
 const exact=list.find(p=>p[0]===name);if(exact)return {id:exact[1],f:""};
 if(name==="White"){const b=list[list.length-1];return {id:b[1],f:"saturate(.05) brightness(1.2) contrast(.95)"}}
 const base=name==="Yellow"?list[list.length-1]:list[0],rot=((HUE[name]-base[2]+540)%360)-180;
 const sat=Math.max(.6,Math.min(4,SAT[name]/base[3])),br=name==="Red"?.78:name==="Pink"?1.08:1;
 return {id:base[1],f:`hue-rotate(${rot}deg) saturate(${sat.toFixed(2)}) brightness(${br})`}}
const photoDefs=()=>{
 const bills=MONEY.map((m,i)=>`<linearGradient id="bf${i}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(m[1],.28)}"/><stop offset=".5" stop-color="${m[1]}"/><stop offset="1" stop-color="${shade(m[1],-.22)}"/></linearGradient>`).join("");
 return `<svg class="cz-defs" width="0" height="0" aria-hidden="true"><defs>${FILES.map(f=>f.startsWith("bill-")?`<image id="ph-${f}" href="${imgSrc(f)}" x="-50" y="-22" width="100" height="44" preserveAspectRatio="none"/>`:`<image id="ph-${f}" href="${imgSrc(f)}" x="-50" y="-50" width="100" height="100"/>`).join("")}<clipPath id="czPlc"><rect x="-4.7" y="-23" width="9.4" height="32" rx="1.4"/></clipPath>${bills}
  <linearGradient id="czPl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".22"/><stop offset=".5" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></linearGradient>
  <linearGradient id="czEu" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b3cbb9"/><stop offset="1" stop-color="#6d917f"/></linearGradient>
  <linearGradient id="czRu" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5d9a5c"/><stop offset="1" stop-color="#2c5933"/></linearGradient>
  <linearGradient id="czDm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#eef2e8"/><stop offset="1" stop-color="#a3b3a0"/></linearGradient></defs></svg>`};


/* ---- flower data from the products table ---- */
const hexOf=n=>(COLORS.find(c=>c[0]===n)||[])[2]||"#e8a0b4";
const colorsOf=p=>{const t=(p.n+" "+(p.d||"")).toLowerCase();return COLORS.filter(c=>new RegExp("\\b("+c[1]+")").test(t)).map(c=>c[0])};
const shortOf=p=>p.n.replace(/\s*\([^)]*\)/g,"").replace(/\s*bouquet\s*/i," ").replace(/^imported\s+/i,"").trim();
const shapeOf=n=>{n=n.toLowerCase();return /rose/.test(n)?"rose":/carnation/.test(n)?"carn":/tulip/.test(n)?"tulip":/lisianthus/.test(n)?"lisi":/gerbera/.test(n)?"gerb":"round"};
const stemsOf=l=>{const m=/(\d+)/.exec(l);return m?+m[1]:/double/i.test(l)?2:1};
function flowers(){return Store.products().filter(p=>!p.so).map(p=>{
 const opts=(p.v&&p.v.length?p.v:[["Single",p.p]]).map(o=>({s:stemsOf(o[0]),p:Number(o[1])})).sort((a,b)=>a.s-b.s);
 const cols=colorsOf(p),sur={},name=shortOf(p);
 cols.forEach(n=>{const c=COLORS.find(x=>x[0]===n),m=new RegExp("("+c[1]+")[^+.]*\\+\\s*₱?\\s*(\\d+)","i").exec(p.d||"");if(m)sur[n]=+m[2]});
 return {id:p.id,name,shape:shapeOf(p.n),opts,cols,sur}})}
/* price for q stems of one flower: per-stem rate of the biggest size option that fits (12 roses = the 12-stem price) */
const priceOf=(f,q)=>{if(q<1)return 0;let o=f.opts[0];f.opts.forEach(x=>{if(x.s<=q)o=x});return Math.round(o.p/o.s*q)};

/* ---- drawing ---- */
const ST="rgba(59,42,32,.32)";
const shade=(h,a)=>{const n=parseInt(h.slice(1),16),t=a<0?0:255,p=Math.abs(a),m=v=>Math.round(v+(t-v)*p);return "#"+((1<<24)+(m(n>>16)<<16)+(m(n>>8&255)<<8)+m(n&255)).toString(16).slice(1)};
const pt=(a,d)=>`${(Math.cos(a)*d).toFixed(1)}`,pv=(a,d)=>`${(Math.sin(a)*d).toFixed(1)}`;
function head(shape,c,seed){   // a flower head centred on 0,0 with radius ~14 (shaded petals: darker outside, lighter inside)
 const D=shade(c,-.24),M=c,L=shade(c,.3),S=`stroke="${ST}" stroke-width=".7"`;
 const sh='<ellipse cx="1.2" cy="3" rx="14" ry="13" fill="rgba(40,26,16,.2)"/>';
 const ph=photoFor(shape,c);
 if(ph){const sd=seed||3;return `${sh}<use href="#ph-${ph.id}" transform="rotate(${(sd*67)%360}) scale(${(.3+((sd*37)%10)/220).toFixed(3)})"${ph.f?` style="filter:${ph.f}"`:""}/>`}
 const ring=(n,d,r,fill,off)=>{let s="";for(let k=0;k<n;k++){const a=k*2*Math.PI/n+(off||0);s+=`<circle cx="${pt(a,d)}" cy="${pv(a,d)}" r="${r}" fill="${fill}" ${S}/>`}return s};
 if(shape==="bill"){   // one real peso bill
  const bi=Math.max(0,MONEY.findIndex(m=>m[1]===c));
  return `<rect x="-17" y="-7.5" width="34" height="15" rx="1.6" fill="rgba(40,26,16,.3)" transform="translate(1.3 2.6)"/><use href="#ph-${billKey(bi)}" transform="scale(.34)"/><rect x="-17" y="-7.5" width="34" height="15" rx="1.6" fill="none" stroke="rgba(40,26,16,.45)" stroke-width=".5"/>`}
 if(shape==="rose")return `${sh}<circle r="14" fill="${D}" ${S}/>${ring(5,8,7.8,M)}${ring(5,4.6,5.6,shade(c,.12),.63)}<circle r="4" fill="${L}" ${S}/><path d="M-2.4 .4a2.4 2.4 0 1 1 2.4 2.4a4.4 4.4 0 1 1 -4.4 -4.4" fill="none" stroke="${D}" stroke-width=".9"/><path d="M-9 -6a10 10 0 0 1 8 -6" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1.6" stroke-linecap="round"/>`;
 if(shape==="carn")return `${sh}<circle r="14" fill="${D}" ${S}/>${ring(14,10.2,4.7,M)}${ring(10,6.6,4.8,shade(c,.1),.3)}${ring(6,3.2,4,L,.5)}<circle r="2.2" fill="${D}"/>`;
 if(shape==="tulip"){const gid="tg"+c.slice(1),dk=shade(c,-.34),md=shade(c,-.1),lt=shade(c,.3),hi=shade(c,.55);   // a tulip bloom: two darker back petals, a big glossy front petal, soft veins
  return `<defs><linearGradient id="${gid}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${dk}"/><stop offset=".5" stop-color="${c}"/><stop offset="1" stop-color="${lt}"/></linearGradient><linearGradient id="${gid}b" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${shade(c,-.5)}"/><stop offset="1" stop-color="${md}"/></linearGradient><radialGradient id="${gid}h" cx=".35" cy=".25" r=".7"><stop offset="0" stop-color="${hi}" stop-opacity=".75"/><stop offset="1" stop-color="${hi}" stop-opacity="0"/></radialGradient></defs>${sh}
  <g transform="translate(0,2)"><path d="M-1 15C-13 12-16 -1-10 -13C-7 -7-3 -1-1 15Z" fill="url(#${gid}b)" ${S}/><path d="M1 15C13 12 16 -1 10 -13C7 -7 3 -1 1 15Z" fill="url(#${gid}b)" ${S}/>
  <path d="M0 16C-11 13-13 -5 -1 -18C0 -17 0 -17 1 -18C13 -5 11 13 0 16Z" fill="url(#${gid})" ${S}/><path d="M0 16C-11 13-13 -5-1 -18C0 -17 0 -17 1 -18C13 -5 11 13 0 16Z" fill="url(#${gid}h)"/>
  <path d="M0 14V-12M-4.5 11C-7 3-6 -6-2.5 -13M4.5 11C7 3 6 -6 2.5 -13" fill="none" stroke="${dk}" stroke-width=".55" opacity=".5" stroke-linecap="round"/>
  <path d="M-6.5 8C-9 0-7 -9-2 -15" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1.5" stroke-linecap="round"/></g>`}
 if(shape==="lisi"){let s="",s2="";for(let k=0;k<5;k++){s+=`<ellipse cy="-7" rx="8.6" ry="10" transform="rotate(${k*72})" fill="${M}" ${S}/>`;s2+=`<ellipse cy="-4.2" rx="5" ry="6.6" transform="rotate(${k*72+36})" fill="${L}" opacity=".75"/>`}
  let st="";for(let k=0;k<5;k++){const a=k*1.2566;st+=`<circle cx="${pt(a,2.2)}" cy="${pv(a,2.2)}" r=".9" fill="#f2c744"/>`}
  return `${sh}${s}${s2}<circle r="3.4" fill="${shade(c,-.38)}"/>${st}`}
 if(shape==="gerb"){let b="",f="";for(let k=0;k<16;k++){b+=`<ellipse cy="-9.5" rx="2.7" ry="7.5" transform="rotate(${k*22.5})" fill="${D}" ${S}/>`;f+=`<ellipse cy="-8" rx="2.5" ry="6.6" transform="rotate(${k*22.5+11.25})" fill="${M}" ${S}/>`}
  let d="";for(let k=0;k<8;k++){const a=k*Math.PI/4;d+=`<circle cx="${pt(a,3.2)}" cy="${pv(a,3.2)}" r=".9" fill="#f2c744"/>`}
  return `${sh}${b}${f}<circle r="5" fill="#4a2d1c" ${S}/>${d}<circle r="1.7" fill="#f2c744"/>`}
 let s="";for(let k=0;k<6;k++){const a=k*Math.PI/3;s+=`<circle cx="${pt(a,8)}" cy="${pv(a,8)}" r="8.6" fill="${k%2?M:L}" ${S}/>`}
 return `${sh}${s}<circle r="4.4" fill="#f2c744" ${S}/>`}
const mini=(shape,c,px)=>`<svg viewBox="-19 -19 38 38" width="${px||34}" height="${px||34}" aria-hidden="true">${head(shape,c)}</svg>`;
const LEAF='<path d="M0 -7C6 -11 6 -19 0 -24C-6 -19 -6 -11 0 -7Z" stroke="rgba(30,50,28,.5)" stroke-width=".7"/><path d="M0 -9V-21" stroke="rgba(255,255,255,.4)" stroke-width=".7" fill="none"/>';
const leaves=`<g transform="rotate(-40)" fill="url(#czLf1)">${LEAF}</g><g transform="rotate(40)" fill="url(#czLf2)">${LEAF}</g>`;

function skeleton(){return `<svg viewBox="0 0 300 330" role="img" aria-label="Preview of your bouquet">
 <defs>
  <pattern id="czNoise" width="96" height="96" patternUnits="userSpaceOnUse"><image href="data:image/png;base64,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" width="96" height="96"/></pattern>
  <filter id="czBlur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3.2"/></filter>
  <linearGradient id="czLf1" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#3f6b3a"/><stop offset="1" stop-color="#7fae6f"/></linearGradient>
  <linearGradient id="czLf2" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#4c7a45"/><stop offset="1" stop-color="#95c07f"/></linearGradient>
 </defs>
 <ellipse cx="150" cy="322" rx="74" ry="6" fill="rgba(59,42,32,.14)"/>
 <g id="czBack" style="pointer-events:none"></g><g id="czLeaf" style="pointer-events:none"></g><g id="czHeads"></g><g id="czFront" style="pointer-events:none"></g></svg>`}
function backSvg(w){   // back of the wrapper: a cone of paper that rises behind the flowers, stems fanning into it
 const L=shade(w,.2),M=shade(w,.04),D=shade(w,-.22),cone="M150 326C120 292 80 240 66 180C58 142 80 116 112 110Q150 96 188 110C220 116 242 142 234 180C220 240 180 292 150 326Z";
 return `<defs><linearGradient id="czbk" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${L}"/><stop offset=".5" stop-color="${M}"/><stop offset="1" stop-color="${D}"/></linearGradient>
  <linearGradient id="czbd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1608" stop-opacity=".04"/><stop offset=".55" stop-color="#2a1608" stop-opacity=".2"/><stop offset="1" stop-color="#2a1608" stop-opacity=".45"/></linearGradient></defs>
  <path d="${cone}" fill="url(#czbk)" stroke="rgba(59,42,32,.34)" stroke-width="1"/><path d="${cone}" fill="url(#czNoise)" opacity=".5"/><path d="${cone}" fill="url(#czbd)"/>
  <path d="M150 326L112 118M150 326L150 102M150 326L188 118M150 326L84 148M150 326L216 148" stroke="rgba(255,255,255,.22)" stroke-width="1.2" fill="none"/><path d="M150 326L128 116M150 326L172 116M150 326L98 130M150 326L202 130" stroke="rgba(40,26,16,.16)" fill="none"/>
  <path d="M66 180C58 142 80 116 112 110Q150 96 188 110C220 116 242 142 234 180" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="1.8"/>
  <g stroke="#587f4c" stroke-width="3" stroke-linecap="round" fill="none"><path d="M150 322L118 196"/><path d="M150 322L135 188"/><path d="M150 322L150 186"/><path d="M150 322L165 188"/><path d="M150 322L182 196"/></g>`}
/* ---- greenery sprigs (drawn, base at 0,0 pointing up) and PHP bill faces ---- */
function sprig(i){
 const hit='<circle cx="0" cy="-22" r="18" fill="transparent"/>';
 if(i===3)return `${hit}<use href="#ph-babys-breath" transform="translate(0 -27) scale(.66)"/>`;
 if(GOK[GPHOTO[i]])return `${hit}<image href="${imgSrc(GPHOTO[i])}" x="-50" y="-50" width="100" height="100" transform="translate(0 -28) scale(.56)"/>`;
 const stem=`<path d="M0 0C-1.5 -14 1.5 -30 0 -48" fill="none" stroke="${i===0?"#7d8f78":i===1?"#3c6a3f":"#9aaa93"}" stroke-width="1.5" stroke-linecap="round"/>`;
 let s=hit+stem;
 if(i===0){   // eucalyptus: round silver-green leaves in pairs
  [[-9,5.6],[-17,6.2],[-25,6],[-33,5.2],[-41,4.4]].forEach(([y,r],k)=>[-1,1].forEach(d=>{if(k===4&&d>0)return;s+=`<g transform="translate(${d*(r*.95)} ${y}) rotate(${d*30})"><ellipse rx="${r}" ry="${(r*1.12).toFixed(1)}" fill="url(#czEu)" stroke="rgba(45,70,58,.5)" stroke-width=".6"/><path d="M0 ${r} V${-r}" stroke="rgba(255,255,255,.5)" stroke-width=".6"/></g>`}));
  s+=`<ellipse cx="0" cy="-49" rx="3.6" ry="4.6" fill="url(#czEu)" stroke="rgba(45,70,58,.5)" stroke-width=".6"/>`}
 else if(i===1){   // ruscus: glossy pointed leaves
  [[-7,1],[-14,-1],[-21,1],[-28,-1],[-35,1],[-41,-1]].forEach(([y,d],k)=>{s+=`<g transform="translate(0 ${y}) rotate(${d*(42-k*3)})"><path d="M0 0C5 -4 5.5 -13 0 -21C-5.5 -13 -5 -4 0 0Z" fill="url(#czRu)" stroke="rgba(25,50,28,.55)" stroke-width=".6"/><path d="M0 -2V-18" stroke="rgba(255,255,255,.4)" stroke-width=".6"/></g>`});
  s+=`<path d="M0 -44C3 -47 3 -52 0 -56C-3 -52 -3 -47 0 -44Z" fill="url(#czRu)" stroke="rgba(25,50,28,.55)" stroke-width=".6"/>`}
 else{   // dusty miller: soft silvery lobed leaves
  const lf=`<path d="M0 0C-8 -3 -11 -11 -6 -15C-6 -20 -1 -22 0 -19C1 -22 6 -20 6 -15C11 -11 8 -3 0 0Z" fill="url(#czDm)" stroke="rgba(255,255,255,.85)" stroke-width=".9"/><path d="M0 -2V-17M0 -8L-5 -12M0 -8L5 -12" stroke="rgba(120,140,118,.6)" stroke-width=".5" fill="none"/>`;
  [[-8,-1,52],[-17,1,52],[-26,-1,44],[-34,1,40]].forEach(([y,d,a])=>{s+=`<g transform="translate(0 ${y}) rotate(${d*a})">${lf}</g>`});
  s+=`<g transform="translate(0 -38) scale(.9)">${lf}</g>`}
 return s}
const sprigIcon=(i,px)=>`<svg viewBox="-26 -54 52 60" width="${Math.round((px||40)*.87)}" height="${px||40}" aria-hidden="true">${sprig(i)}</svg>`;
const billSvg=i=>`<img src="${imgSrc(billKey(i))}" alt="${MONEY[i][0]} bill" draggable="false">`;

function frontSvg(w,r,v){   // front of the wrapper: two overlapping panels (low V rim), a high rear rim for the back view, satin band + bow
 const L=shade(w,.2),D=shade(w,-.2),rl=shade(r,.32),rd=shade(r,-.28),dy=v?-22:0;
 const body="M150 326C118 292 82 244 70 196Q108 184 150 224Q192 184 230 196C218 244 182 292 150 326Z",rear="M150 326C118 292 82 244 70 196C66 168 84 146 112 140Q150 128 188 140C216 146 234 168 230 196C218 244 182 292 150 326Z",rim="M70 196Q108 184 150 224Q192 184 230 196";
 let s=`<defs><linearGradient id="czf" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${L}"/><stop offset=".5" stop-color="${w}"/><stop offset="1" stop-color="${D}"/></linearGradient>
  <linearGradient id="czfd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1608" stop-opacity="0"/><stop offset="1" stop-color="#2a1608" stop-opacity=".32"/></linearGradient>
  <linearGradient id="czrb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${rd}"/><stop offset=".42" stop-color="${rl}"/><stop offset=".6" stop-color="${r}"/><stop offset="1" stop-color="${rd}"/></linearGradient>
  <radialGradient id="czbw" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="${rl}"/><stop offset=".6" stop-color="${r}"/><stop offset="1" stop-color="${rd}"/></radialGradient></defs>`;
 if(v==="glass")s+=`<g stroke="#5f8c58" stroke-width="2.4" stroke-linecap="round"><path d="M138 232 L142 300"/><path d="M150 232 L150 304"/><path d="M162 232 L158 300"/></g>`;
 s+=`<g class="cz-fcone"><path d="${rim}" fill="none" stroke="rgba(30,18,10,.5)" stroke-width="9" stroke-linecap="round" filter="url(#czBlur)"/>
  <path d="${body}" fill="url(#czf)" stroke="rgba(59,42,32,.34)" stroke-width="1"/><path d="${body}" fill="url(#czNoise)" opacity=".5"/><path d="${body}" fill="url(#czfd)"/>
  <path d="M150 326L112 216M150 326L190 216M150 326L130 232M150 326L172 232" stroke="rgba(255,255,255,.26)" stroke-width="1.3" fill="none"/><path d="M150 326L118 214M150 326L184 214" stroke="rgba(40,26,16,.18)" fill="none"/>
  <path d="${rim}" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="1.7"/></g>
  <g class="cz-rcone" style="opacity:0"><path d="${rear}" fill="url(#czf)" stroke="rgba(59,42,32,.34)" stroke-width="1"/><path d="${rear}" fill="url(#czNoise)" opacity=".5"/><path d="${rear}" fill="url(#czfd)"/>
  <path d="M150 326L116 150M150 326L150 132M150 326L184 150" stroke="rgba(255,255,255,.24)" stroke-width="1.3" fill="none"/><path d="M70 196C66 168 84 146 112 140Q150 128 188 140C216 146 234 168 230 196" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="1.7"/></g>
  <g transform="translate(0 ${dy})"><path d="M101 258Q150 272 199 258L196 272Q150 286 104 272Z" fill="url(#czrb)" stroke="rgba(59,42,32,.3)" stroke-width=".8"/><path d="M103 261Q150 275 197 261" fill="none" stroke="rgba(255,255,255,.35)"/>
  <g class="cz-fdet"><path d="M150 228L150 326" stroke="rgba(30,18,10,.3)" stroke-width="2.6" filter="url(#czBlur)"/>
   <path d="M147 277C142 291 134 299 130 309L141 302L150 310Z" fill="${r}" stroke="rgba(59,42,32,.3)" stroke-width=".8"/><path d="M153 277C158 291 166 299 170 309L159 302L150 310Z" fill="${rd}" stroke="rgba(59,42,32,.3)" stroke-width=".8"/>
   <g fill="url(#czbw)" stroke="rgba(59,42,32,.32)" stroke-width=".8"><ellipse cx="133" cy="272" rx="17" ry="8.5" transform="rotate(-22 133 272)"/><ellipse cx="167" cy="272" rx="17" ry="8.5" transform="rotate(22 167 272)"/></g>
   <g fill="rgba(0,0,0,.16)"><ellipse cx="133" cy="272" rx="9" ry="3.6" transform="rotate(-22 133 272)"/><ellipse cx="167" cy="272" rx="9" ry="3.6" transform="rotate(22 167 272)"/></g>
   <circle cx="150" cy="272" r="5.8" fill="url(#czbw)" stroke="rgba(59,42,32,.32)" stroke-width=".8"/><circle cx="148.5" cy="270.5" r="1.8" fill="rgba(255,255,255,.65)"/></g></g>`;
 if(v==="glass")s+=`<path d="M100 262 Q94 262 98 288 Q103 314 150 314 Q197 314 202 288 Q206 262 200 262 Z" fill="rgba(170,210,222,.4)" stroke="rgba(59,42,32,.35)" stroke-width="1.2"/><path d="M110 270 Q108 296 124 306" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="3" stroke-linecap="round"/>`;
 if(v==="ceramic")s+=`<path d="M104 258 Q96 258 100 288 Q105 316 150 316 Q195 316 200 288 Q204 258 196 258 Z" fill="#efe6d6" stroke="rgba(59,42,32,.4)" stroke-width="1.2"/><path d="M104 270 Q150 280 198 270" fill="none" stroke="#bfa273" stroke-width="2"/>`;
 return s}
function place(items,RM){   // items = [{uid,shape,color,pos,rot,k,z,green}] -> positions in the bouquet. Pieces without a manual position are arranged automatically; rot/k are the customer's own rotation and size.
 const use=items.slice(-MAX_DRAW),heads=use.filter(h=>!h.green&&h.shape!=="bill"),greens=use.filter(h=>h.green);
 const n=heads.length,r=Math.min(26,38/Math.pow(Math.max(n,1),.3)),s=r/14;
 const autos=heads.filter(h=>!h.pos),m=autos.length,R=Math.min(RM||84,r*Math.sqrt(Math.max(m,1))*1.1),cx=150,cy=112;
 const ai=new Map();autos.forEach((h,i)=>ai.set(h.uid,i));
 const ga=greens.filter(h=>!h.pos),gm=ga.length,gi=new Map();ga.forEach((h,i)=>gi.set(h.uid,i));
 const RG=Math.min(RM?RM+6:78,Math.max(44,R+12));
 return use.map(h=>{let x,y;const k=h.k||1,bill=h.shape==="bill";
  let dzA;if(h.pos){x=h.pos.x;y=h.pos.y}
  else if(bill){x=cx;y=cy;dzA=0}
  else if(h.green){const t=(gi.get(h.uid)+.5)/gm,a=t*2*Math.PI+.5;x=cx+Math.cos(a)*RG;dzA=Math.sin(a)*RG;y=cy+RG*RG/200+8}
  else{const sl=m-1-ai.get(h.uid),t=m>1?Math.sqrt(sl/(m-1)):0,a=sl*2.39996,rr=t*R;x=cx+Math.cos(a)*rr;dzA=Math.sin(a)*rr;y=cy+rr*rr/260}
  const out=Math.atan2(y-190,x-150)*180/Math.PI+90;
  let rot=out,urot=0;
  if(h.green||bill)rot=h.rot!=null?h.rot:(bill?((h.uid*47)%60)-30:out);else urot=h.rot||0;
  return {uid:h.uid,shape:h.shape,color:h.color,x,y,s:(h.green?.9:s)*k,rot,urot,z:h.z,green:!!h.green,dz:h.pos?h.pos.dz:dzA}})}
function headsDrawer(g){   // keeps one SVG node per piece (keyed by uid) so they glide smoothly instead of being redrawn
 const map=new Map();
 return {node:uid=>map.get(uid),update(list){
  const seen=new Set();
  list.forEach(h=>{
   seen.add(h.uid);let n=map.get(h.uid);const sig=h.shape+h.color,flower=!h.green&&h.shape!=="bill";
   if(!n||n.dataset.sig!==sig){
    const nn=document.createElementNS(NS,"g");nn.dataset.sig=sig;nn.dataset.uid=h.uid;nn.setAttribute("class","cz-fl");
    if(h.green)nn.innerHTML=`<g class="cz-lv">${sprig(+h.shape.slice(1))}</g><g></g>`;
    else if(h.shape==="bill")nn.innerHTML=`<g class="cz-lv"><g class="cz-pop">${head("bill",h.color,h.uid)}</g></g><g></g>`;
    else nn.innerHTML=`<g class="cz-lv">${leaves}</g><g class="cz-rt"><g class="cz-pop">${head(h.shape,h.color,h.uid)}</g></g>`;
    const pop=nn.querySelector(".cz-pop");if(pop)pop.addEventListener("animationend",()=>pop.classList.remove("cz-pop"));
    if(n)g.replaceChild(nn,n);else g.appendChild(nn);map.set(h.uid,nn);n=nn}
   n.style.transform=`translate(${h.x.toFixed(1)}px,${h.y.toFixed(1)}px) scale(${h.s.toFixed(3)})`;
   n.firstChild.style.transform=`rotate(${h.rot.toFixed(1)}deg)`;
   if(flower)n.lastChild.style.transform=`rotate(${h.urot.toFixed(1)}deg)`});
  map.forEach((n,uid)=>{if(!seen.has(uid)){n.remove();map.delete(uid)}});
  const sorted=list.slice().sort((a,b)=>a.z-b.z).map(h=>map.get(h.uid));
  if(sorted.some((n,i)=>g.children[i]!==n))sorted.forEach(n=>g.appendChild(n))}}}

/* ---- tab icons ---- */
const IC={
 money:'<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6.5 9.5v5M17.5 9.5v5"/>',
 flowers:'<circle cx="12" cy="6" r="3.2"/><circle cx="18" cy="11" r="3.2"/><circle cx="16" cy="18" r="3.2"/><circle cx="8" cy="18" r="3.2"/><circle cx="6" cy="11" r="3.2"/><circle cx="12" cy="12" r="2"/>',
 leaves:'<path d="M5 19C5 9 11 4 20 4c0 9-5 15-15 15z"/><path d="M5 19L14 10"/>',
 wrappers:'<path d="M12 21L4 6q8 3 16 0z"/><path d="M12 21V9"/>',
 ribbons:'<path d="M12 12c-3-6-8-6-8-2s5 4 8 2zM12 12c3-6 8-6 8-2s-5 4-8 2z"/><path d="M12 12l-3 8M12 12l3 8"/>',
 vase:'<path d="M9 3h6M10 3v3c0 2-4 3-4 8 0 4 2 7 6 7s6-3 6-7c0-5-4-6-4-8V3"/>',
 card:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 7l8.5 6 8.5-6"/>'};
const icon=k=>`<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[k]}</svg>`;

/* ---- the builder ---- */
/* ---- real 3D scene (canvas): Korean-style ruffled wrapper, flowers at their own depth, and a money-bouquet mode with bills folded into rings ---- */
function scene3d(cv){
 const ctx=cv.getContext("2d"),cache=new Map();let redraw=()=>{},world={},hits=[],cam=null;
 const spr=(id,f,dark)=>{const k=id+"|"+(f||"")+"|"+(dark?1:0);let e=cache.get(k);if(e)return e.c;
  e={c:null};cache.set(k,e);const im=new Image();
  im.onload=()=>{const c=document.createElement("canvas");c.width=im.naturalWidth;c.height=im.naturalHeight;const x=c.getContext("2d");
   if(f&&"filter" in x)x.filter=f;x.drawImage(im,0,0);if("filter" in x)x.filter="none";
   if(dark){x.globalCompositeOperation="source-atop";x.fillStyle=`rgba(30,18,10,${dark*.1})`;x.fillRect(0,0,c.width,c.height)}e.c=c;redraw()};
  im.src=id.slice(0,5)==="data:"?id:imgSrc(id);return null};
 const svgCache={},svgUri=(sh,c)=>{const k=sh+c;return svgCache[k]||(svgCache[k]="data:image/svg+xml;charset=utf-8,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="-19 -19 38 38" width="228" height="228">'+head(sh,c,3)+'</svg>'))};
 const hx=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
 const cs=(c,m,a)=>`rgba(${Math.min(255,c[0]*m|0)},${Math.min(255,c[1]*m|0)},${Math.min(255,c[2]*m|0)},${a==null?1:a})`;
 const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],crs=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const nrm=a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return [a[0]/l,a[1]/l,a[2]/l]},dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],neg=a=>[-a[0],-a[1],-a[2]];
 /* paper wrapper: a gathered handle that flares into a wavy-edged cup; the flare follows the bouquet size */
 const N=64,M=10,Hr=a=>196+30*(1-Math.cos(a))/2+7*Math.sin(7*a+1)+4*Math.sin(13*a+2),geoCache={};
 const geoFor=si=>{si=SIZES[si]?si:1;if(geoCache[si])return geoCache[si];const RS=SIZES[si][4],rad=h=>3+.18*h+76*RS*Math.pow(Math.max(0,(h-96)/104),1.7),V=[];
  for(let k=0;k<=N;k++){const a=(k%N)*2*Math.PI/N,row=[];for(let j=0;j<=M;j++){const t=j/M,h=Hr(a)*t,r=rad(h)*(1+(.05*Math.sin(9*a+1)+.025*Math.sin(15*a+2))*Math.pow(t,1.5));row.push([r*Math.sin(a),h,r*Math.cos(a)])}V.push(row)}
  const VN=V.map((row,k)=>row.map((p,j)=>{const kp=V[(k+1)%N],km=V[(k+N-1)%N],n=nrm(crs(sub(kp[j],km[j]),sub(row[Math.min(M,j+1)],row[Math.max(0,j-1)])));return (n[0]||n[1]||n[2])?n:[0,-1,0]}));
  const FN=[];for(let k=0;k<N;k++){FN.push([]);for(let j=0;j<M;j++)FN[k].push(nrm(crs(sub(V[k+1][j+1],V[k][j+1]),sub(V[k][j+1],V[k][j]))))}
  return geoCache[si]={rad,V,VN,FN}};
 const LT=nrm([-.4,.55,.73]);
 function render(o){
  const {rad,V,VN,FN}=geoFor(o.size==null?1:o.size);
  const W=cv.clientWidth||300,Hh=cv.clientHeight||330,dpr=Math.min(o.dpr||1.5,window.devicePixelRatio||1);
  if(cv.width!==Math.round(W*dpr)||cv.height!==Math.round(Hh*dpr)){cv.width=Math.round(W*dpr);cv.height=Math.round(Hh*dpr)}
  ctx.setTransform(cv.width/300,0,0,cv.height/330,0,0);ctx.clearRect(0,0,300,330);ctx.lineJoin="round";
  const th=o.yaw*Math.PI/180,cy=Math.cos(th),sy=Math.sin(th),P=o.pitch*Math.PI/180,cp=Math.cos(P),sp=Math.sin(P);
  const pr=(x,y,z)=>{const x1=x*cy+z*sy,z1=-x*sy+z*cy,ry=y-150,y2=ry*cp-z1*sp,z2=ry*sp+z1*cp,f=900/(900-z2);return [150+x1*f,176-y2*f,z2,f]};
  const prv=p=>pr(p[0],p[1],p[2]);world={};hits=[];cam={R:[cy,0,sy],U:[sp*sy,cp,-sp*cy],F:[-cp*sy,sp,cp*cy],pr,plane:(qx,qy,Yp)=>{if(sp<.1)return null;const f=pr(0,Yp,0)[3],x1=(qx-150)/f,y2=(176-qy)/f,t=(Yp-150-cp*y2)/sp;return [cy*x1+sp*sy*y2-cp*sy*t,Yp,sy*x1-sp*cy*y2+cp*cy*t]}};
  const vn=n=>{const x1=n[0]*cy+n[2]*sy,z1=-n[0]*sy+n[2]*cy;return [x1,n[1]*cp-z1*sp,n[1]*sp+z1*cp]};
  const poly=(pts,fill,stroke,lw)=>{ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw||.6;ctx.stroke()}};
  const planeM=(O,u,v,su,sv)=>{const P0=prv(O),Pu=prv([O[0]+u[0]*su,O[1]+u[1]*su,O[2]+u[2]*su]),Pv=prv([O[0]+v[0]*sv,O[1]+v[1]*sv,O[2]+v[2]*sv]);return [Pu[0]-P0[0],Pu[1]-P0[1],-(Pv[0]-P0[0]),-(Pv[1]-P0[1]),P0[0],P0[1],P0[2]]};
  const items=[];
  {const g=prv([0,-4,0]);for(let i=0;i<4;i++){ctx.beginPath();ctx.ellipse(g[0],g[1]+4,(50-i*8)*g[3],(10-i*1.6)*g[3],0,0,7);ctx.fillStyle="rgba(59,42,32,.07)";ctx.fill()}}
  const wc=hx(o.wrap),wl=wc.map(v=>v+(255-v)*.3),lin=wc.map(v=>v+(255-v)*.34),lin2=wc.map(v=>v+(255-v)*.55);
  /* paper cup: Gouraud-style shading from vertex normals */
  const PV=V.map(r=>r.map(prv)),vN=VN.map(r=>r.map(n=>vn(n)));
  for(let k=0;k<N;k++)for(let j=0;j<M;j++){
   const a=PV[k][j],b=PV[k+1][j],c=PV[k+1][j+1],d=PV[k][j+1],out=vn(FN[k][j])[2]>0,top=j===M-1;let m=0;
   for(const [kk,jj] of [[k,j],[k+1,j],[k+1,j+1],[k,j+1]]){const nv=vN[kk][jj];m+=out?.66+.5*Math.max(0,dot(nv,LT)):(.5+.45*Math.max(0,-dot(nv,LT)))*(.55+.45*jj/M)}
   const col=out?cs(wc,m/4*(1+((k*7)%5-2)*.006)):cs(lin,m/4);
   items.push({z:(a[2]+b[2]+c[2]+d[2])/4,d:()=>{poly([a,b,c,d],col,col,.8);if(top){ctx.beginPath();ctx.moveTo(c[0],c[1]);ctx.lineTo(d[0],d[1]);ctx.strokeStyle=out?"rgba(255,250,238,.8)":"rgba(255,250,238,.45)";ctx.lineWidth=1.8;ctx.stroke()}}})}
  /* ribbon band + bow on the handle */
  const rb=hx(o.rib),vs=!!o.vase,b0=vs?96:56,b1=vs?106:68,bs=vs?102:62;
  for(let k=0;k<N;k++){const a0=k*2*Math.PI/N,a1=(k+1)*2*Math.PI/N,nn=nrm([Math.sin(a0+Math.PI/N),-.21,Math.cos(a0+Math.PI/N)]),nv=vn(nn);if(nv[2]<=0)continue;
   const q=[[a0,b0],[a1,b0],[a1,b1],[a0,b1]].map(([a,h])=>{const r=rad(h)*1.04;return prv([r*Math.sin(a),h,r*Math.cos(a)])}),col=cs(rb,.62+.5*Math.max(0,dot(nv,LT)));
   items.push({z:(q[0][2]+q[2][2])/2+.5,d:()=>poly(q,col,col,.6)})}
  {const rr=rad(bs)+1.6,S=[0,bs,rr],nn=nrm([0,-.21,1]),nv=vn(nn);
   if(nv[2]>.05){const sh=.62+.5*Math.max(0,dot(nv,LT)),uu=[1,0,0],vv=[0,.98,.2],at=(x,y,l)=>{x*=.62;y*=.62;return prv([S[0]+uu[0]*x+vv[0]*y+nn[0]*(l||0),S[1]+uu[1]*x+vv[1]*y+nn[1]*(l||0),S[2]+uu[2]*x+vv[2]*y+nn[2]*(l||0)])};
    const loop=(cx,R)=>{const pts=[];for(let i=0;i<20;i++){const t=i/20*6.2832,ex=20*Math.cos(t),ey=10*Math.sin(t),c=Math.cos(R),s=Math.sin(R);pts.push(at(cx+ex*c-ey*s,ey*c+ex*s,1.5))}return pts};
    const tail=sg=>{const L=[],R=[];for(let i=0;i<=8;i++){const t=i/8,c=sg*(3+15*t+3*Math.sin(t*4)),y=-(3+34*t),w=4.4*(1-.35*t);L.push(at(c-w,y,1));R.push(at(c+w,y,1))}return L.concat(R.reverse())};
    items.push({z:at(0,0,3)[2]+3,d:()=>{poly(tail(-1),cs(rb,sh*.78),"rgba(59,42,32,.3)",.5);poly(tail(1),cs(rb,sh*.62),"rgba(59,42,32,.3)",.5);
     poly(loop(-19,-.35),cs(rb,sh*.95),"rgba(59,42,32,.35)",.6);poly(loop(19,.35),cs(rb,sh*.8),"rgba(59,42,32,.35)",.6);
     const kn=[];for(let i=0;i<14;i++){const t=i/14*6.2832;kn.push(at(5.8*Math.cos(t),5.8*Math.sin(t),3))}poly(kn,cs(rb,sh*1.05),"rgba(59,42,32,.35)",.6)}})}}
  /* vase */
  if(o.vase){const glass=o.vase==="glass";
   for(let k=0;k<N;k++){const a0=k*2*Math.PI/N,a1=(k+1)*2*Math.PI/N,rr=y=>52+4*Math.sin((y-6)/66*3.14),q=[[a0,6],[a1,6],[a1,72],[a0,72]].map(([a,y])=>prv([rr(y)*Math.sin(a),y,rr(y)*Math.cos(a)])),nn=[Math.sin(a0+Math.PI/N),0,Math.cos(a0+Math.PI/N)],nv=vn(nn),d=Math.max(0,dot(nv,LT)),front=nv[2]>0;
    const col=glass?`rgba(${170+d*60|0},${210+d*30|0},${222+d*20|0},${front?.3:.16})`:cs([239,230,214],front?.62+.45*d:.5);
    items.push({z:(q[0][2]+q[2][2])/2+(front?2:-2),d:()=>{poly(q,col,glass?null:col,.6);if(glass&&front&&d>.72){ctx.beginPath();ctx.moveTo((q[0][0]+q[1][0])/2,(q[0][1]+q[1][1])/2);ctx.lineTo((q[3][0]+q[2][0])/2,(q[3][1]+q[2][1])/2);ctx.strokeStyle="rgba(255,255,255,.55)";ctx.lineWidth=2;ctx.stroke()}}})}}
  /* contents */
  const ps=o.pl.slice().sort((a,b)=>a.z-b.z),fl=ps.filter(p=>!p.green&&p.shape!=="bill"),gl=ps.filter(p=>p.green),bills=o.pl.filter(p=>p.shape==="bill").sort((a,b)=>a.uid-b.uid),money=bills.length>0,nf=Math.max(1,fl.length-1);
  const Rc=Math.min(46,14+10*Math.sqrt(fl.length));
  const stem=(x,y,z)=>{const a=pr(x,y,z),c=prv([x*.3,150,z*.3]),j=prv([0,108,0]),e=prv([0,62,0]);items.push({z:(a[2]+j[2])/2-1,d:()=>{ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.quadraticCurveTo(c[0],c[1],j[0],j[1]);ctx.lineTo(e[0],e[1]);ctx.strokeStyle="#587f4c";ctx.lineWidth=2.6*a[3];ctx.lineCap="round";ctx.stroke()}})};
  ps.forEach(p=>{
   if(p.shape==="bill")return;
   let dx,Y,dep;
   if(money){if(p.green){const gi=gl.indexOf(p),an=gi*2*Math.PI/gl.length+.3;dx=(Rc+5)*Math.sin(an);dep=(Rc+5)*Math.cos(an);Y=198}
    else{const i=fl.indexOf(p),an=i*2.39996,rr=Rc*Math.sqrt((i+.5)/fl.length);dx=rr*Math.cos(an);dep=rr*Math.sin(an);Y=206+14-rr*rr/90}}
   else{dx=p.x-150;Y=326-p.y;const span=Math.max(8,55*Math.sqrt(Math.max(0,1-Math.pow(dx/105,2))));dep=p.dz!=null?p.dz:p.green?span*.9*Math.sin(p.uid*2.399):(fl.indexOf(p)/nf-.5)*2*span}
   if(!money){const RM=RMAX[o.size==null?1:o.size]+(p.green?6:0),rr=Math.hypot(dx,dep),r2=Math.min(rr,RM);if(rr>RM){dx*=RM/rr;dep*=RM/rr}Y=p.green?206-r2*r2/200:domeY(r2)}
   world[p.uid]={x:dx,y:Y,z:dep};
   const hn=Math.hypot(dx,dep)||1,h0=dx/hn,h1=dep/hn,al=Math.atan2(h0,h1),ca=Math.cos(al+th),rho=money&&p.green?.55:p.rot*Math.PI/180;
   if(p.green){
    const i=+p.shape.slice(1),t=Math.max(-1.2,Math.min(1.2,rho)),sT=Math.sin(t),v=nrm([sT*(money?h0:1),Math.cos(t),money?sT*h1:Math.abs(sT)*h1*.9]);
    let u=nrm(crs(v,[h0,0,h1]));const sg=(u[0]*cy+u[2]*sy)<0?-1:1;u=nrm([u[0]*sg+.5*cy,u[1]*sg,u[2]*sg+.5*sy]);
    const id=i===3?"babys-breath":GPHOTO[i],L=(i===3?66:56)*p.s,O=[dx-v[0]*(i===3?6:0)*p.s,Y-v[1]*(i===3?6:0)*p.s,dep-v[2]*(i===3?6:0)*p.s];
    stem(O[0],O[1]+1,O[2]);const m=planeM(O,u,v,L/100,L/100),mid=prv([O[0]+v[0]*L/2,O[1]+v[1]*L/2,O[2]+v[2]*L/2]);
    if(!money)hits.push({uid:p.uid,x:mid[0],y:mid[1],r:L*.4*mid[3],z:mid[2]});
    items.push({z:mid[2],d:()=>{ctx.save();ctx.transform(m[0],m[1],m[2],m[3],m[4],m[5]);
     const im=(i===3||GOK[id])?spr(id,"",0):null;
     if(im)ctx.drawImage(im,-50,-100,100,100);
     else{ctx.strokeStyle=GREEN[i][1];ctx.fillStyle=GREEN[i][1];ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-90);ctx.stroke();for(let q=0;q<6;q++){ctx.beginPath();ctx.ellipse(q%2?14:-14,-14-q*14,12,6,q%2?-.6:.6,0,7);ctx.fill()}}
     ctx.restore()}});return}
   const lv=ca<0?1:0;stem(dx,Y-3,dep);const P0=pr(dx,Y,dep),ph=photoFor(p.shape,p.color),svgIm=ph?null:svgUri(p.shape,p.color),dia=100*(.3+((p.uid*37)%10)/220)*p.s,fx=.75+.25*Math.abs(ca),rot=(p.shape==="tulip"?((p.uid*37)%50-25)+p.urot*.5:(p.uid*67)%360+p.urot)*Math.PI/180;
   if(!money)hits.push({uid:p.uid,x:P0[0],y:P0[1],r:dia/2*P0[3]*.85,z:P0[2]});
   items.push({z:P0[2],d:()=>{const S=dia/100*P0[3],im=ph?spr(ph.id,ph.f||"",lv):spr(svgIm,"",lv),K=ph?1:1.35;ctx.save();ctx.translate(P0[0],P0[1]);ctx.scale(fx,1);
    ctx.beginPath();ctx.ellipse(1.2*S,3*S,14*S,13*S,0,0,7);ctx.fillStyle="rgba(40,26,16,.2)";ctx.fill();ctx.rotate(rot);
    if(im)ctx.drawImage(im,-50*S*K,-50*S*K,100*S*K,100*S*K);else{ctx.beginPath();ctx.arc(0,0,14*S,0,7);ctx.fillStyle=p.color;ctx.fill()}ctx.restore()}})});
  /* money bouquet: bills folded into petals, ring after ring around the flowers */
  if(money){let idx=0,k=0;const R0=fl.length?Rc+13:5,capOf=s=>{let c=0,kk=0;for(;;){const rk=R0+kk*15*s;if(rk+20*s>[72,91,104,117][o.size==null?1:o.size]&&kk>0)break;c+=Math.max(6,Math.floor(2*Math.PI*rk/(11*s)));kk++}return c};let sc=.6;for(let s=1.9;s>=.6;s-=.05){if(capOf(s)>=bills.length){sc=s;break}}
   while(idx<bills.length){const rk=R0+k*15*sc,nk0=Math.max(6,Math.floor(2*Math.PI*rk/(11*sc))),nk=Math.min(nk0,bills.length-idx),tt=Math.max(20,66-k*9)*Math.PI/180,hb=190-k*3.5;
    for(let q=0;q<nk&&idx<bills.length;q++,idx++){const p=bills[idx],a=(q+(k%2)*.5)*2*Math.PI/nk+k*.37,ou=[Math.sin(a),0,Math.cos(a)],d=[ou[0]*Math.cos(tt),Math.sin(tt),ou[2]*Math.cos(tt)],Lb=40*sc,
     O=[ou[0]*rk+d[0]*Lb/2,hb+d[1]*Lb/2,ou[2]*rk+d[2]*Lb/2],tg=[Math.cos(a),0,-Math.sin(a)],m=planeM(O,d,tg,Lb/100,17*sc/44),nv=vn(nrm(crs(d,tg))),bi=Math.max(0,MONEY.findIndex(x=>x[1]===p.color)),df=Math.max(0,dot(nv,LT)),lv=nv[2]<=0?3:df>.55?0:df>.3?1:2;
     items.push({z:m[6],d:()=>{const im=spr(billKey(bi),"",lv);if(!im)return;ctx.save();ctx.transform(m[0],m[1],m[2],m[3],m[4],m[5]);
      ctx.beginPath();ctx.moveTo(-50,0);ctx.bezierCurveTo(-32,-14,-10,-25,14,-22);ctx.quadraticCurveTo(46,-15,53,0);ctx.quadraticCurveTo(46,15,14,22);ctx.bezierCurveTo(-10,25,-32,14,-50,0);ctx.closePath();
      ctx.save();ctx.clip();ctx.drawImage(im,-58,-26,116,52);
      const g=ctx.createLinearGradient(-50,0,40,0);g.addColorStop(0,"rgba(20,12,6,.62)");g.addColorStop(.55,"rgba(20,12,6,.08)");g.addColorStop(1,"rgba(255,255,240,.1)");ctx.fillStyle=g;ctx.fillRect(-60,-30,120,60);
      ctx.fillStyle="rgba(20,12,6,.2)";ctx.fillRect(-60,0,120,30);ctx.fillStyle="rgba(255,255,240,.16)";ctx.fillRect(-60,-30,120,12);ctx.restore();
      ctx.strokeStyle="rgba(255,255,240,.45)";ctx.lineWidth=1.5;ctx.stroke();ctx.beginPath();ctx.moveTo(-46,0);ctx.quadraticCurveTo(0,-3,50,0);ctx.strokeStyle="rgba(20,12,6,.35)";ctx.lineWidth=1.1;ctx.stroke();ctx.restore()}})}
    k++}}
  items.sort((a,b)=>a.z-b.z).forEach(it=>it.d());
 }
 return {render,hook:f=>{redraw=f},cam:()=>cam,world:()=>world,pick:(x,y)=>{const h=hits.filter(q=>Math.hypot(q.x-x,q.y-y)<=q.r).sort((a,b)=>b.z-a.z)[0];return h?h.uid:null}}}

let open=null;
function openBuilder(tab){
 if(open)return;
 const F=flowers();
 const st={size:1,sel:null,tab:TABS.some(t=>t[0]===tab)?tab:"flowers",heads:[],wrap:0,rib:0,vase:0,msg:"",uid:1,z:1,cur:F[0]?F[0].id:null,col:F[0]?(F[0].cols[0]||""):""};
 const byId=id=>F.find(f=>String(f.id)===String(id));
 const mk=(kind,id,col,pos)=>({uid:st.uid++,kind,id,col:col||"",pos:pos||null,rot:null,k:1,z:st.z++});
 const last=document.activeElement;
 const el=document.createElement("div");el.className="cz";
 el.innerHTML=`<div class="cz-box" role="dialog" aria-modal="true" aria-labelledby="czT">
  <button type="button" class="cz-x" aria-label="Close">&times;</button>
  <div class="cz-rail" role="tablist" aria-label="Bouquet parts">${TABS.map(t=>`<button type="button" role="tab" class="cz-tab" data-tab="${t[0]}"><i>${icon(t[0])}</i><span>${t[1]}</span></button>`).join("")}</div>
  <div class="cz-stage" id="czStage"><div class="cz-title"><span class="cz-eyebrow">Make it yours</span><h2 id="czT">Design your bouquet</h2></div><div class="cz-wm" aria-hidden="true">Annroe's</div><div class="cz-art" id="czArt"></div>
   <div class="cz-ov" id="czOv" hidden><i class="cz-ring"></i><button type="button" class="cz-h cz-hr" data-h="rot" aria-label="Rotate" title="Rotate">&#8635;</button><button type="button" class="cz-h cz-hs" data-h="scl" aria-label="Resize" title="Resize">&#10530;</button><button type="button" class="cz-h cz-hd" data-h="del" aria-label="Remove" title="Remove">&times;</button></div>
   <div class="cz-bar"><span class="cz-tip" id="czTip">Drag onto the bouquet &middot; tap a piece to rotate or resize it &middot; drag out to remove</span><span class="cz-btnrow"><button type="button" class="cz-auto" data-auto>Auto-arrange</button><button type="button" class="cz-auto" data-v360>Auto-rotate</button></span></div>
   <div class="cz-size" id="czSize" role="group" aria-label="Bouquet size">${SIZES.map((s,i)=>`<button type="button" data-size="${i}">${s[0]}</button>`).join("")}</div><div class="cz-cap" id="czCap"></div><div class="cz-note" id="czNote" role="status" aria-live="polite"></div>
   <div class="cz-360" id="czSpin" hidden><button type="button" data-spin="play" aria-label="Pause">&#10074;&#10074;</button><input type="range" id="czYaw" min="0" max="359" value="0" aria-label="Turn the bouquet"><button type="button" data-spin="top">Top</button><button type="button" data-spin="front">Front</button></div></div>
  <div class="cz-selwrap"><div class="cz-selhead"><b id="czSelN">Selected items (0)</b><span id="czExtra"></span></div>
   <div class="cz-sel"><button type="button" class="cz-arr" data-arr="-1" aria-label="Scroll left">&lsaquo;</button><div class="cz-strip" id="czStrip"></div><button type="button" class="cz-arr" data-arr="1" aria-label="Scroll right">&rsaquo;</button></div></div>
  <div class="cz-panel" id="czPanel" role="tabpanel"></div>
  <div class="cz-foot"><small>Custom Bouquet</small><div class="cz-tot"><span>Total Price</span><b id="czTot">${peso(0)}</b></div>
   <div class="cz-btns"><button type="button" class="cz-add" data-cz="cart">Add to cart</button><button type="button" class="cz-buy" data-cz="buy">Buy now</button></div>
   <p class="cz-hint" id="czHint">Add at least one flower or bill to continue.</p></div></div>`;
 document.body.appendChild(el);document.documentElement.style.overflow="hidden";open=el;
 requestAnimationFrame(()=>el.classList.add("on"));
 const $=s=>el.querySelector(s);
 $("#czArt").innerHTML=skeleton();
 el.insertAdjacentHTML("afterbegin",photoDefs());
 let paperKey="";
 const gB=$("#czBack"),gL=$("#czLeaf"),gF=$("#czFront"),drawer=headsDrawer($("#czHeads")),stage=$("#czStage");

 /* state helpers */
 const fl=()=>st.heads.filter(h=>h.kind==="f"),bl=()=>st.heads.filter(h=>h.kind==="m");
 const qtyOf=(id,c)=>fl().filter(x=>String(x.id)===String(id)&&x.col===c).length;
 const tq=id=>fl().filter(x=>String(x.id)===String(id)).length;
 const bq=i=>bl().filter(x=>x.id===i).length;
 const linePrice=(f,c)=>{const q=qtyOf(f.id,c),t=tq(f.id);return t?Math.round(priceOf(f,t)*q/t)+(f.sur[c]||0)*q:0};
 const flowerCount=()=>fl().length,billCount=()=>bl().length,greenCount=()=>st.heads.filter(h=>h.kind==="g").length,gq=i=>st.heads.filter(h=>h.kind==="g"&&h.id===i).length;
 const cash=()=>MONEY.reduce((n,m,i)=>n+bq(i)*m[2],0);
 const total=()=>F.reduce((n,f)=>n+priceOf(f,tq(f.id))+Object.keys(f.sur).reduce((a,c)=>a+f.sur[c]*qtyOf(f.id,c),0),0)
  +GREEN.reduce((n,g,i)=>n+gq(i)*g[3],0)+cash()+billCount()*MONEY_FEE+(billCount()?MONEY_BASE:0)+WRAPS[st.wrap][2]+VASES[st.vase][2];
 const lines=()=>{const out=[];
  F.forEach(f=>{const seen=[];fl().forEach(x=>{if(String(x.id)===String(f.id)&&!seen.includes(x.col)){seen.push(x.col);out.push({k:"f",f,col:x.col,q:qtyOf(f.id,x.col)})}})});
  GREEN.forEach((g,i)=>{if(gq(i))out.push({k:"g",i,g,q:gq(i)})});
  MONEY.forEach((m,i)=>{if(bq(i))out.push({k:"m",i,m,q:bq(i)})});return out};
 const summary=()=>{const p=lines().map(l=>l.k==="f"?`${l.q} ${l.f.name}${l.col?" ("+l.col.toLowerCase()+")":""}`:l.k==="m"?`${l.q} ${l.m[0]} bill${l.q>1?"s":""} (folded)`:`${l.q} ${l.g[0]}`);
  return p.join(", ")+" · "+WRAPS[st.wrap][0]+" wrap · "+RIBBONS[st.rib][0]+" ribbon"+(st.vase?" · "+VASES[st.vase][0]:"")+(st.msg.trim()?" · Card: “"+st.msg.trim()+"”":"")};
 const removeLast=(kind,id,col)=>{for(let i=st.heads.length-1;i>=0;i--){const h=st.heads[i];if(h.kind===kind&&String(h.id)===String(id)&&(kind!=="f"||h.col===col)){st.heads.splice(i,1);return}}};

 /* options panel (right side) */
 const stepper=(attr,q,label)=>`<div class="cz-qty"><button type="button" ${attr}="-1" data-fk="${attr}m" aria-label="Fewer ${esc(label)}">&minus;</button><output>${q}</output><button type="button" ${attr}="1" data-fk="${attr}p" aria-label="More ${esc(label)}">+</button></div>`;
 function panel(){
  const P=$("#czPanel"),a=document.activeElement,fk=a&&el.contains(a)&&a.dataset.fk;
  let h="";
  if(st.tab==="flowers"){
   if(!F.length)h='<p class="cz-empty">No flowers are available right now.</p>';
   else{const f=byId(st.cur),q=qtyOf(f.id,st.col);
    h=`<h3 class="cz-ph">Type</h3><p class="cz-dragnote">Tap + or drag a flower onto the bouquet.</p><div class="cz-types">${F.map(x=>`<button type="button" class="cz-type${x.id===f.id?" on":""}" data-t="${esc(x.id)}" data-drag="f:${esc(x.id)}" data-fk="t${esc(x.id)}">${mini(x.shape,hexOf(x.cols[0]),38)}<span>${esc(x.name)}</span></button>`).join("")}</div>
    <h3 class="cz-ph">Available color</h3>${f.cols.length?`<div class="cz-swatches" role="group" aria-label="Color">${f.cols.map(c=>`<button type="button" class="cz-sw${c===st.col?" on":""}" data-c="${c}" data-fk="c${c}" title="${c}${f.sur[c]?" (+"+peso(f.sur[c])+" per stem)":""}" aria-label="${c}" aria-pressed="${c===st.col}" style="--c:${hexOf(c)}"></button>`).join("")}<span class="cz-cn">${st.col}${f.sur[st.col]?` · +${peso(f.sur[st.col])}/stem`:""}</span></div>`:'<p class="cz-note">Assorted colors, chosen by our florists.</p>'}
    <h3 class="cz-ph">Quantity <small>(stems)</small></h3>${stepper("data-q",q,f.name)}
    <div class="cz-stems">${Array.from({length:Math.min(q,12)},()=>mini(f.shape,hexOf(st.col),22)).join("")}${q>12?`<em>+${q-12}</em>`:""}</div>
    <p class="cz-note">From ${peso(Math.round(f.opts[0].p/f.opts[0].s))} per stem. Bigger bunches cost less per stem.${q?` This line: <b>${peso(linePrice(f,st.col))}</b>`:""}</p>`}}
  else if(st.tab==="money"){
   const bc=billCount();
   h=`<h3 class="cz-ph">Money bouquet</h3><p class="cz-note" style="margin-top:0">Choose the bills for your bouquet. Each bill is ${peso(MONEY_FEE)} extra for folding. Our florists arrange them by hand, and you can mix them with flowers. Drag a row onto the bouquet to place a bill.</p><div class="cz-list" style="margin-top:14px">${MONEY.map((m,i)=>`<div class="cz-li${bq(i)?" has":""}" data-drag="m:${i}"><span class="cz-bill">${billSvg(i)}</span><div><b>${m[0]} bill</b><small>${peso(m[2]+MONEY_FEE)} each</small></div>${stepper("data-m"+i,bq(i),m[0]+" bill")}</div>`).join("")}</div>${bc?`<p class="cz-note">Cash value <b>${peso(cash())}</b> · folding ${peso(bc*MONEY_FEE)} · arrangement ${peso(MONEY_BASE)}</p>`:""}`}
  else if(st.tab==="leaves"){
   h=`<h3 class="cz-ph">Greenery &amp; fillers</h3><p class="cz-dragnote">Tap + or drag a row onto the bouquet.</p><div class="cz-list">${GREEN.map((g,i)=>`<div class="cz-li cz-gr${gq(i)?" has":""}" style="--i:${i};--gc:${g[1]}" data-drag="g:${i}"><span class="cz-spr">${sprigIcon(i,54)}</span><div><b>${esc(g[0])}</b><small>${peso(g[3])} per sprig</small></div>${stepper("data-g"+i,gq(i),g[0])}</div>`).join("")}</div>`}
  else if(st.tab==="wrappers"){
   h=`<h3 class="cz-ph">Wrapper</h3><div class="cz-opts">${WRAPS.map((w,i)=>`<button type="button" class="cz-opt${i===st.wrap?" on":""}" data-w="${i}" data-fk="w${i}"><i class="cz-dot" style="background:${w[1]}"></i><span>${w[0]}</span><small>${w[2]?"+"+peso(w[2]):"Free"}</small></button>`).join("")}</div>`}
  else if(st.tab==="ribbons"){
   h=`<h3 class="cz-ph">Ribbon</h3><div class="cz-opts">${RIBBONS.map((w,i)=>`<button type="button" class="cz-opt${i===st.rib?" on":""}" data-r="${i}" data-fk="r${i}"><i class="cz-dot" style="background:${w[1]}"></i><span>${w[0]}</span><small>Free</small></button>`).join("")}</div>`}
  else if(st.tab==="vase"){
   h=`<h3 class="cz-ph">Vase</h3><div class="cz-opts">${VASES.map((w,i)=>`<button type="button" class="cz-opt${i===st.vase?" on":""}" data-v="${i}" data-fk="v${i}"><i class="cz-vi">${w[1]?`<svg viewBox="0 0 24 24" width="22" height="22" fill="${w[1]==="glass"?"rgba(170,210,222,.5)":"#efe6d6"}" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M9 3h6l-1 4c3 2 4 5 4 8 0 4-2 6-6 6s-6-2-6-6c0-3 1-6 4-8z"/></svg>`:`<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="8"/><path d="M6 6l12 12"/></svg>`}</i><span>${w[0]}</span><small>${w[2]?"+"+peso(w[2]):"Free"}</small></button>`).join("")}</div><p class="cz-note">The bouquet comes arranged in the vase.</p>`}
  else{
   h=`<h3 class="cz-ph">Card message <small>(optional)</small></h3><textarea id="czMsg" maxlength="${MSG_MAX}" rows="5" placeholder="Write the message for the card…">${esc(st.msg)}</textarea><span class="cz-count" id="czCnt">${st.msg.length} / ${MSG_MAX}</span><p class="cz-note">We will hand-write it on a small card and tuck it in with the flowers.</p>`}
  P.innerHTML=`<div class="cz-pin">${h}</div>`;
  if(fk){const n=P.querySelector(`[data-fk="${CSS.escape(fk)}"]`);n&&n.focus({preventScroll:true})}}

 /* preview, selected strip, total, tabs */
 let placed=new Map(),basePl=[],v3=null;st.yaw=0;st.pitch=20;st.mny=false;let tw=null;
 let pq=0;const paint=()=>{const mny=basePl.some(p=>p.shape==="bill");if(mny!==st.mny){st.mny=mny;if(tw)tw(mny?62:20)}if(v3&&el.classList.contains("cz-spinning")){if(!pq)pq=requestAnimationFrame(()=>{pq=0;if(v3)v3.render({pl:basePl,yaw:st.yaw,pitch:st.pitch,wrap:WRAPS[st.wrap][1],rib:RIBBONS[st.rib][1],vase:VASES[st.vase][1],size:st.size})});return}let v=basePl;const th=st.yaw*Math.PI/180,c=Math.cos(th),s=Math.sin(th);
  if(st.yaw){const zs=basePl.map(p=>p.z).sort((a,b)=>a-b),n=Math.max(1,zs.length-1);
   v=basePl.map(p=>{const r=zs.indexOf(p.z)/n,dx=p.x-150,dep=(r-.5)*80+(p.green?-6:0),X=150+dx*c+dep*s,D=-dx*s+dep*c,a0=Math.atan2(p.y-190,dx),a1=Math.atan2(p.y-190,X-150);
    return Object.assign({},p,{x:X,z:D,D,s:p.s*(1+D/450),rot:p.rot+(a1-a0)*180/Math.PI})})}
  drawer.update(v);v.forEach(p=>{const n=drawer.node(p.uid);if(n)n.style.filter=st.yaw?`brightness(${(1+Math.min(0,p.D)/240).toFixed(3)})`:""});
  const fc=gF.querySelector(".cz-fcone"),rc=gF.querySelector(".cz-rcone"),fd=gF.querySelector(".cz-fdet"),cl=x=>Math.max(0,Math.min(1,x));
  if(fc){fc.style.opacity=st.yaw?cl(1+c*4):1;rc.style.opacity=st.yaw?cl(.5-c*2):0;fd.style.opacity=st.yaw?cl(1+c*4):1;fd.style.transformOrigin="150px 0px";fd.style.transform=st.yaw?`translateX(${(s*48).toFixed(1)}px) scaleX(${(.5+.5*Math.abs(c)).toFixed(3)})`:""}};
 function update(){sizeUi();
  el.querySelectorAll(".cz-tab").forEach(b=>{const on=b.dataset.tab===st.tab;b.classList.toggle("on",on);b.setAttribute("aria-selected",on)});
  const items=st.heads.map(h=>h.kind==="m"?{uid:h.uid,shape:"bill",color:MONEY[h.id][1],pos:h.pos,rot:h.rot,k:h.k,z:h.z}:h.kind==="g"?{uid:h.uid,shape:"g"+h.id,color:"",pos:h.pos,rot:h.rot,k:h.k,z:h.z-1e6,green:true}:{uid:h.uid,shape:byId(h.id).shape,color:hexOf(h.col),pos:h.pos,rot:h.rot,k:h.k,z:h.z});
  const pl=place(items,RMAX[st.size]);placed=new Map(pl.map(p=>[p.uid,p]));
  const pk=st.wrap+"|"+st.rib+"|"+st.vase;if(pk!==paperKey){paperKey=pk;gB.innerHTML=backSvg(WRAPS[st.wrap][1]);gF.innerHTML=frontSvg(WRAPS[st.wrap][1],RIBBONS[st.rib][1],VASES[st.vase][1])}
  gL.innerHTML="";
  basePl=pl;paint();
  const ls=lines(),n=flowerCount()+greenCount()+billCount();
  $("#czSelN").textContent="Selected items ("+n+")";
  $("#czExtra").textContent=WRAPS[st.wrap][0]+" · "+RIBBONS[st.rib][0]+" ribbon"+(st.vase?" · "+VASES[st.vase][0]:"");
  $("#czStrip").innerHTML=ls.length?ls.map((l,i)=>l.k==="f"
   ?`<div class="cz-card${l.f.id===st.cur&&l.col===st.col&&st.tab==="flowers"?" on":""}" data-line="${i}"><button type="button" class="cz-pick" data-line="${i}" aria-label="Edit ${esc(l.f.name)}">${mini(l.f.shape,hexOf(l.col),40)}<span><b>${esc(l.f.name)}</b><small>Qty | ${l.q}</small><strong>${peso(linePrice(l.f,l.col))}</strong></span></button><button type="button" class="cz-rm" data-rm="${i}" aria-label="Remove ${esc(l.f.name)}">&times;</button></div>`
   :l.k==="m"?`<div class="cz-card" data-line="${i}"><button type="button" class="cz-pick" data-line="${i}" aria-label="Edit ${esc(l.m[0])} bills"><span class="cz-bill sm">${billSvg(l.i)}</span><span><b>${esc(l.m[0])} bills</b><small>Qty | ${l.q}</small><strong>${peso(l.q*(l.m[2]+MONEY_FEE))}</strong></span></button><button type="button" class="cz-rm" data-rm="${i}" aria-label="Remove ${esc(l.m[0])} bills">&times;</button></div>`
   :`<div class="cz-card" data-line="${i}"><button type="button" class="cz-pick" data-line="${i}" aria-label="Edit ${esc(l.g[0])}"><span class="cz-spr">${sprigIcon(l.i,42)}</span><span><b>${esc(l.g[0])}</b><small>Qty | ${l.q}</small><strong>${peso(l.q*l.g[3])}</strong></span></button><button type="button" class="cz-rm" data-rm="${i}" aria-label="Remove ${esc(l.g[0])}">&times;</button></div>`).join("")
   :'<p class="cz-none">Your selected flowers and bills will appear here.</p>';
  $("#czTot").textContent=peso(total());
  const ok=flowerCount()+billCount()>0;$("#czHint").hidden=ok;$(".cz-foot small").textContent=flowerCount()===0&&billCount()>0?"Money Bouquet":"Custom Bouquet";
  el.querySelectorAll("[data-cz]").forEach(b=>b.disabled=!ok);
  stage.classList.toggle("has",st.heads.length>0);showSel()}
 const refresh=()=>{update();panel()};
 const cnt=k=>st.heads.filter(h=>h.kind===k).length,note=t=>{const n=$("#czNote");if(!n)return;n.textContent=t;n.classList.add("on");clearTimeout(n._t);n._t=setTimeout(()=>n.classList.remove("on"),3400)};
 const full=k=>{const i=k==="f"?1:k==="g"?2:3,S=SIZES[st.size];if(cnt(k)>=S[i]){note(S[0]+" bouquet holds up to "+S[i]+" "+["","flowers","greenery","bills"][i]+". Choose a bigger size to add more.");return true}return false};
 const sizeUi=()=>{el.querySelectorAll("[data-size]").forEach(b=>{const on=+b.dataset.size===st.size;b.classList.toggle("on",on);b.setAttribute("aria-pressed",on)});const S=SIZES[st.size],c=$("#czCap");if(c)c.textContent="Flowers "+cnt("f")+"/"+S[1]+" · Greenery "+cnt("g")+"/"+S[2]+" · Bills "+cnt("m")+"/"+S[3]};
 el.addEventListener("click",e=>{const b=e.target.closest("[data-size]");if(!b)return;const i=+b.dataset.size,S=SIZES[i];if(cnt("f")>S[1]||cnt("g")>S[2]||cnt("m")>S[3]){note(S[0]+" holds up to "+S[1]+" flowers, "+S[2]+" greenery and "+S[3]+" bills. Remove a few first to choose it.");return}st.size=i;refresh()});
 const spinning=()=>el.classList.contains("cz-spinning");
 let raf=0,playing=false,lastT=0;const tip=$("#czTip"),tipTxt=tip.textContent,pb=$("[data-spin=play]");
 const setYaw=v=>{st.yaw=((v%360)+360)%360;$("#czYaw").value=Math.round(st.yaw);paint()};
 const tweenPitch=to=>{const from=st.pitch,t0=performance.now(),s=t=>{const k=Math.min(1,(t-t0)/450),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;st.pitch=from+(to-from)*e;paint();if(k<1)requestAnimationFrame(s)};requestAnimationFrame(s)};tw=tweenPitch;
 const tick=t=>{if(!playing||open!==el)return;const dt=Math.min(50,t-lastT);lastT=t;setYaw(st.yaw+dt*.035);raf=requestAnimationFrame(tick)};
 const play=on=>{playing=on;pb.innerHTML=on?"&#10074;&#10074;":"&#9654;";pb.setAttribute("aria-label",on?"Pause":"Play");cancelAnimationFrame(raf);if(on){lastT=performance.now();raf=requestAnimationFrame(tick)}};
 const spinOn=()=>{st.sel=null;const cv=document.createElement("canvas");cv.className="cz-3d";$("#czArt").appendChild(cv);v3=scene3d(cv);v3.hook(()=>{if(v3)paint()});if(window.ResizeObserver)new ResizeObserver(()=>{if(v3)paint()}).observe(cv);el.classList.add("cz-spinning");$("#czSpin").hidden=false;tip.textContent="Drag a flower to move it · drag empty space to turn · drag out to remove";update()};
 const spinOff=()=>{play(false);el.classList.remove("cz-spinning");const c3=$(".cz-3d");if(c3)c3.remove();v3=null;$("#czSpin").hidden=true;tip.textContent=tipTxt;$("[data-v360]").innerHTML="360&deg; view";st.yaw=0;$("#czYaw").value=0;update()};
 el.addEventListener("click",e=>{if(e.target.closest("[data-v360]")){const on=!playing;play(on);$("[data-v360]").innerHTML=on?"Stop":"Auto-rotate";return}const b=e.target.closest("[data-spin]");if(!b)return;if(b.dataset.spin==="play")play(!playing);else if(b.dataset.spin==="top"){play(false);const to=st.pitch>75?(st.mny?62:20):88;b.textContent=to>75?"Side":"Top";tweenPitch(to)}else{play(false);const tb=$("[data-spin=top]");if(tb)tb.textContent="Top";tweenPitch(st.mny?62:20);setYaw(0)}});
 $("#czYaw").addEventListener("input",e=>{play(false);setYaw(+e.target.value)});
 let tr=null,vel=0,pd=null;const coast=()=>{if(playing||tr||open!==el)return;if(Math.abs(vel)<.03){vel=0;return}setYaw(st.yaw+vel);vel*=.94;raf=requestAnimationFrame(coast)};
 const tEnd=e=>{if(pd){const d=pd;pd=null;stage.classList.remove("moving","drop-out");const i=st.heads.findIndex(x=>x.uid===d.uid);
   if(i>=0&&d.moved){if(!overStage(e.clientX,e.clientY)){st.heads.splice(i,1);st.sel=null}else{const h=st.heads[i],p=basePl.find(q=>q.uid===d.uid);if(p){h.pos={x:p.x,y:p.y,dz:p.dz};h.z=st.z++;if((p.green||p.shape==="bill")&&h.rot==null)h.rot=p.rot}}refresh()}return}
  const was=tr;tr=null;stage.classList.remove("turning");if(was&&Math.abs(vel)>.5){cancelAnimationFrame(raf);raf=requestAnimationFrame(coast)}};
 stage.addEventListener("pointerdown",e=>{if(!spinning()||e.button>0||e.target.closest("#czSpin,.cz-bar,.cz-x,.cz-size,.cz-note"))return;play(false);vel=0;
  const r=$(".cz-3d").getBoundingClientRect(),uid=v3.pick((e.clientX-r.left)*300/r.width,(e.clientY-r.top)*330/r.height),w=uid!=null&&v3.world()[uid];
  if(w){pd={uid,x0:e.clientX,y0:e.clientY,w:{x:w.x,y:w.y,z:w.z,f:v3.cam().pr(w.x,w.y,w.z)[3]},moved:false,out:false,off:(()=>{const c=v3.cam(),pp=basePl.find(q=>q.uid===uid),q=c.plane((e.clientX-r.left)*300/r.width,(e.clientY-r.top)*330/r.height,pp&&pp.green?198:212);return q?[q[0]-w.x,0,q[2]-w.z]:[0,0,0]})()};stage.setPointerCapture(e.pointerId);stage.classList.add("moving");return}
  tr={x:e.clientX,y:st.yaw,cy:e.clientY,p:st.pitch,lx:e.clientX};stage.setPointerCapture(e.pointerId);stage.classList.add("turning")});
 stage.addEventListener("pointermove",e=>{
  if(pd){const c=v3.cam(),r=$(".cz-3d").getBoundingClientRect(),ddx=(e.clientX-pd.x0)*300/r.width/pd.w.f,ddy=-(e.clientY-pd.y0)*330/r.height/pd.w.f,cl=(v,a,b)=>Math.max(a,Math.min(b,v));
   if(Math.hypot(e.clientX-pd.x0,e.clientY-pd.y0)>3)pd.moved=true;if(!pd.moved)return;
   const p=basePl.find(q=>q.uid===pd.uid);if(p){const RM=RMAX[st.size]+(p.green?6:0),W=c.plane((e.clientX-r.left)*300/r.width,(e.clientY-r.top)*330/r.height,p.green?198:212);let nx,nz;if(W){nx=W[0]-pd.off[0];nz=W[2]-pd.off[2]}else{nx=cl(pd.w.x+c.R[0]*ddx+c.U[0]*ddy,-105,105);nz=cl(pd.w.z+c.R[2]*ddx+c.U[2]*ddy,-85,85)}const rr=Math.hypot(nx,nz),r2=Math.min(rr,RM);if(rr>RM){nx*=RM/rr;nz*=RM/rr}p.x=150+nx;p.dz=nz;p.y=326-(p.green?206-r2*r2/200:domeY(r2));pd.out=!overStage(e.clientX,e.clientY);stage.classList.toggle("drop-out",pd.out);paint()}return}
  if(!tr)return;vel=(e.clientX-tr.lx)*.7;tr.lx=e.clientX;st.pitch=Math.max(2,Math.min(90,tr.p-(e.clientY-tr.cy)*.25));setYaw(tr.y+(e.clientX-tr.x)*.7)});stage.addEventListener("pointerup",tEnd);stage.addEventListener("pointercancel",tEnd);
 const setTab=t=>{st.tab=t;update();const P=$("#czPanel");P.classList.remove("swap");void P.offsetWidth;P.classList.add("swap");panel()};

 /* ---- drag & drop: drag from the options onto the bouquet, drag a flower to move it, drag it out to remove it ---- */
 const toSvg=(cx,cy)=>{const s=$("#czArt svg"),p=s.createSVGPoint();p.x=cx;p.y=cy;const q=p.matrixTransform(s.getScreenCTM().inverse());return {x:Math.max(24,Math.min(276,q.x)),y:Math.max(34,Math.min(262,q.y))}};
 const overStage=(x,y)=>{const r=stage.getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom};
 const gb=p=>{const dx=150-p.x,dy=200-p.y,d=Math.hypot(dx,dy)||1;return {x:p.x+dx/d*23,y:p.y+dy/d*23,dz:p.dz}};
 const to3d=(cx,cy,green)=>{const r=$(".cz-3d").getBoundingClientRect(),c=v3.cam(),W=c.plane((cx-r.left)*300/r.width,(cy-r.top)*330/r.height,green?198:212)||[0,0,0],RM=RMAX[st.size]+(green?6:0);let nx=W[0],nz=W[2];const rr=Math.hypot(nx,nz),r2=Math.min(rr,RM);if(rr>RM){nx*=RM/rr;nz*=RM/rr}return {x:150+nx,y:326-(green?206-r2*r2/200:domeY(r2)),dz:nz}};
 let drag=null,ghost=null,noClick=0;
 const ghostFor=src=>{const [k,v]=src.dataset.drag.split(":");
  if(k==="f"){const f=byId(v),c=f.id===st.cur?st.col:(f.cols[0]||"");return mini(f.shape,hexOf(c),54)}
  if(k==="m")return mini("bill",MONEY[+v][1],54);
  if(k==="g")return sprigIcon(+v,58);
  return `<svg viewBox="-19 -19 38 38" width="46" height="46"><ellipse cy="-4" rx="8" ry="15" fill="${GREEN[+v][1]}" stroke="rgba(59,42,32,.4)"/></svg>`};
 const endDrag=()=>{if(!drag)return;clearTimeout(drag.timer);if(ghost){ghost.remove();ghost=null}
  el.classList.remove("cz-dragging");stage.classList.remove("drop-ok","drop-out");
  if(drag.node)drag.node.classList.remove("cz-drag","cz-out");
  document.removeEventListener("pointermove",onMove);document.removeEventListener("pointerup",onUp);document.removeEventListener("pointercancel",onCancel);drag=null};
 const activate=()=>{drag.active=true;el.classList.add("cz-dragging");
  if(drag.mode==="new"){ghost=document.createElement("div");ghost.className="cz-ghost";ghost.innerHTML=ghostFor(drag.src);el.appendChild(ghost)}
  else drag.node.classList.add("cz-drag")};
 const onMove=e=>{if(!drag||e.pointerId!==drag.pid)return;
  drag.lx=e.clientX;drag.ly=e.clientY;const d=Math.hypot(e.clientX-drag.x0,e.clientY-drag.y0);
  if(!drag.active){if(drag.touch&&drag.mode==="new"){if(d>8){endDrag()}return}if(d<4)return;activate()}
  e.preventDefault();
  const over=overStage(e.clientX,e.clientY);
  if(drag.mode==="new"){ghost.style.transform=`translate(${e.clientX}px,${e.clientY}px)`;stage.classList.toggle("drop-ok",over)}
  else{const p0=toSvg(e.clientX,e.clientY),pl=placed.get(drag.uid),p=pl.green?gb(p0):p0;
   drag.node.style.transform=`translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px) scale(${pl.s.toFixed(3)})`;
   const frz=pl.green||pl.shape==="bill";drag.node.firstChild.style.transform=`rotate(${(frz?pl.rot:Math.atan2(p.y-190,p.x-150)*180/Math.PI+90).toFixed(1)}deg)`;
   drag.node.classList.toggle("cz-out",!over);stage.classList.toggle("drop-out",!over)}};
 const onUp=e=>{if(!drag||e.pointerId!==drag.pid)return;
  const d=drag,was=d.active,over=overStage(e.clientX,e.clientY);
  endDrag();
  if(!was){if(d.mode==="move"){const h=st.heads.find(x=>x.uid===d.uid);if(h){h.z=st.z++;st.sel=h.uid;update()}}return}
  noClick=Date.now();
  if(d.mode==="new"){if(!over)return;
   const [k,v]=d.src.dataset.drag.split(":"),p=spinning()?to3d(e.clientX,e.clientY,k==="g"):toSvg(e.clientX,e.clientY);
   if(k==="f"){const f=byId(v);if(f.id!==st.cur){st.cur=f.id;st.col=f.cols[0]||""}if(tq(f.id)>=MAX_QTY||full("f"))return;st.heads.push(mk("f",f.id,st.col,p))}
   else if(k==="m"){if(bq(+v)>=MAX_QTY||full("m"))return;st.heads.push(mk("m",+v,"",p))}
   else{if(gq(+v)>=MAX_QTY||full("g"))return;st.heads.push(mk("g",+v,"",gb(p)))}
   st.sel=st.heads[st.heads.length-1].uid;refresh()}
  else{const i=st.heads.findIndex(x=>x.uid===d.uid);if(i<0)return;
   if(over){const h=st.heads[i],pl=placed.get(d.uid);h.pos=toSvg(e.clientX,e.clientY);if(h.kind==="g")h.pos=gb(h.pos);h.z=st.z++;if(pl&&(pl.green||pl.shape==="bill")&&h.rot==null)h.rot=pl.rot;st.sel=h.uid}else{st.heads.splice(i,1);st.sel=null}
   refresh()}};
 const onCancel=()=>{if(drag&&drag.active){endDrag();update()}else endDrag()};
 el.addEventListener("pointerdown",e=>{
  if(e.button>0||drag)return;
  if(e.target.closest("#czOv"))return;
  if(spinning()&&stage.contains(e.target))return;
  if(st.sel&&stage.contains(e.target)&&!e.target.closest(".cz-fl,.cz-bar,.cz-title")){st.sel=null;showSel()}
  const node=e.target.closest(".cz-fl");
  if(node&&stage.contains(node)){drag={mode:"move",uid:+node.dataset.uid,node,x0:e.clientX,y0:e.clientY,pid:e.pointerId,active:false,touch:false};e.preventDefault()}
  else{const src=e.target.closest("[data-drag]");if(!src||e.target.closest(".cz-qty"))return;
   drag={mode:"new",src,x0:e.clientX,y0:e.clientY,pid:e.pointerId,active:false,touch:e.pointerType==="touch"};
   if(drag.touch)drag.timer=setTimeout(()=>{if(drag&&!drag.active){activate();ghost.style.transform=`translate(${drag.lx||drag.x0}px,${drag.ly||drag.y0}px)`;stage.classList.toggle("drop-ok",false)}},300)}
  document.addEventListener("pointermove",onMove,{passive:false});document.addEventListener("pointerup",onUp);document.addEventListener("pointercancel",onCancel)});
 const noScroll=e=>{if(drag&&drag.active)e.preventDefault()};
 document.addEventListener("touchmove",noScroll,{passive:false});
 el.addEventListener("contextmenu",e=>{if(e.target.closest("[data-drag]"))e.preventDefault()});
 el.addEventListener("click",e=>{if(Date.now()-noClick<350){e.stopPropagation();e.preventDefault()}},true);


 /* ---- selection: tap a piece, then rotate / resize / remove it with the handles ---- */
 let ovGeom={px:0,py:0,rp:20};
 function showSel(){
  const ov=$("#czOv");
  if(st.sel&&!st.heads.some(x=>x.uid===st.sel))st.sel=null;
  const p=st.sel&&placed.get(st.sel);
  if(!p){ov.hidden=true;return}
  const svg=$("#czArt svg"),m=svg.getScreenCTM(),sr=stage.getBoundingClientRect();
  let cx=p.x,cy=p.y,rad=15*p.s;
  if(p.green){const a=p.rot*Math.PI/180;cx=p.x+Math.sin(a)*24*p.s;cy=p.y-Math.cos(a)*24*p.s;rad=30*p.s}
  else if(p.shape==="bill")rad=20*p.s;
  const px=m.a*cx+m.e-sr.left,py=m.d*cy+m.f-sr.top,rp=Math.max(22,rad*m.a+8);
  ovGeom={px,py,rp};
  Object.assign(ov.style,{left:px+"px",top:py+"px",width:2*rp+"px",height:2*rp+"px",marginLeft:-rp+"px",marginTop:-rp+"px"});
  ov.hidden=false}
 $("#czOv").addEventListener("pointerdown",e=>{
  const hd=e.target.closest("[data-h]");if(!hd)return;
  e.preventDefault();e.stopPropagation();
  const h=st.heads.find(x=>x.uid===st.sel),p=h&&placed.get(h.uid);if(!h||!p)return;
  const mode=hd.dataset.h;
  if(mode==="del"){st.heads=st.heads.filter(x=>x!==h);st.sel=null;return refresh()}
  const sr=stage.getBoundingClientRect(),c={x:sr.left+ovGeom.px,y:sr.top+ovGeom.py};
  const a0=Math.atan2(e.clientY-c.y,e.clientX-c.x),r0=Math.max(10,Math.hypot(e.clientX-c.x,e.clientY-c.y));
  const flower=!p.green&&p.shape!=="bill",rot0=flower?(h.rot||0):p.rot,k0=h.k||1,s0=p.s/k0,node=drawer.node(h.uid);
  node.classList.add("cz-drag");hd.setPointerCapture(e.pointerId);
  const mv=ev=>{
   if(mode==="rot"){const r=rot0+(Math.atan2(ev.clientY-c.y,ev.clientX-c.x)-a0)*180/Math.PI;h.rot=r;
    if(flower)node.lastChild.style.transform=`rotate(${r.toFixed(1)}deg)`;else{node.firstChild.style.transform=`rotate(${r.toFixed(1)}deg)`;p.rot=r}}
   else{const k=Math.max(.4,Math.min(3.2,k0*Math.hypot(ev.clientX-c.x,ev.clientY-c.y)/r0));h.k=k;p.s=s0*k;node.style.transform=`translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px) scale(${p.s.toFixed(3)})`}
   showSel()};
  const up=()=>{hd.removeEventListener("pointermove",mv);hd.removeEventListener("pointerup",up);hd.removeEventListener("pointercancel",up);node.classList.remove("cz-drag");refresh()};
  hd.addEventListener("pointermove",mv);hd.addEventListener("pointerup",up);hd.addEventListener("pointercancel",up)});

 const close=()=>{if(open!==el)return;endDrag();open=null;el.classList.remove("on");document.documentElement.style.overflow="";document.removeEventListener("keydown",onKey);document.removeEventListener("touchmove",noScroll);window.removeEventListener("resize",onResize);setTimeout(()=>el.remove(),280);if(last&&last.focus)try{last.focus()}catch(e){}};
 const onKey=e=>{if(e.key==="Escape"&&!document.querySelector(".mdl")){if(st.sel){st.sel=null;showSel()}else close()}
  else if((e.key==="Delete"||e.key==="Backspace")&&st.sel&&!/INPUT|TEXTAREA|SELECT/.test((document.activeElement||{}).tagName||"")){st.heads=st.heads.filter(x=>x.uid!==st.sel);st.sel=null;refresh()}};
 const onResize=()=>showSel();window.addEventListener("resize",onResize);
 document.addEventListener("keydown",onKey);
 el.addEventListener("mousedown",e=>{if(e.target===el)close()});
 $(".cz-x").addEventListener("click",close);
 el.addEventListener("input",e=>{if(e.target.id==="czMsg"){st.msg=e.target.value;$("#czCnt").textContent=st.msg.length+" / "+MSG_MAX}});
 el.addEventListener("click",e=>{
  const T=s=>e.target.closest(s);
  let b;
  if(b=T(".cz-tab"))return setTab(b.dataset.tab);
  if(b=T("[data-auto]")){st.heads.forEach(h=>h.pos=null);return refresh()}
  if(b=T("[data-arr]"))return $("#czStrip").scrollBy({left:240*+b.dataset.arr,behavior:"smooth"});
  if(b=T("[data-cz]")){if(b.disabled||!window.Shop||!Shop.addItem)return;
   return Shop.addItem({id:"custom-"+Date.now(),name:flowerCount()===0&&billCount()>0?"Money Bouquet":"Custom Bouquet",size:summary(),price:total(),qty:1},b.dataset.cz==="buy",close)}
  if(b=T(".cz-type")){const f=byId(b.dataset.t);st.cur=f.id;if(!f.cols.includes(st.col))st.col=f.cols[0]||"";return refresh()}
  if(b=T(".cz-sw")){if(b.dataset.c!==undefined){st.col=b.dataset.c;return refresh()}}
  if(b=T("[data-q]")){const f=byId(st.cur),d=+b.dataset.q;
   if(d>0){if(qtyOf(f.id,st.col)<MAX_QTY&&!full("f"))st.heads.push(mk("f",f.id,st.col))}else removeLast("f",f.id,st.col);
   return refresh()}
  const g=[...GREEN.keys()].find(i=>T(`[data-g${i}]`));
  if(g!==undefined){const d=+T(`[data-g${g}]`).getAttribute("data-g"+g);if(d>0){if(gq(g)<MAX_QTY&&!full("g"))st.heads.push(mk("g",g))}else removeLast("g",g);return refresh()}
  const mi=[...MONEY.keys()].find(i=>T(`[data-m${i}]`));
  if(mi!==undefined){const d=+T(`[data-m${mi}]`).getAttribute("data-m"+mi);if(d>0){if(bq(mi)<MAX_QTY&&!full("m"))st.heads.push(mk("m",mi))}else removeLast("m",mi);return refresh()}
  if(b=T("[data-w]")){st.wrap=+b.dataset.w;return refresh()}
  if(b=T("[data-r]")){st.rib=+b.dataset.r;return refresh()}
  if(b=T("[data-v]")){st.vase=+b.dataset.v;return refresh()}
  if(b=T(".cz-rm")){const l=lines()[+b.dataset.rm];if(!l)return;
   if(l.k==="f")st.heads=st.heads.filter(x=>!(x.kind==="f"&&String(x.id)===String(l.f.id)&&x.col===l.col));else if(l.k==="m")st.heads=st.heads.filter(x=>!(x.kind==="m"&&x.id===l.i));else st.heads=st.heads.filter(x=>!(x.kind==="g"&&x.id===l.i));return refresh()}
  if(b=T(".cz-pick")){const l=lines()[+b.dataset.line];if(!l)return;
   if(l.k==="f"){st.cur=l.f.id;st.col=l.col;setTab("flowers")}else setTab(l.k==="m"?"money":"leaves")}});
 update();panel();spinOn();
 $("#czPanel").classList.add("swap");
 setTimeout(()=>{const t=$(".cz-tab");t&&t.focus({preventScroll:true})},140)}

document.addEventListener("click",e=>{const b=e.target.closest("[data-customize]");if(b){e.preventDefault();openBuilder(b.dataset.customize)}});
{const c=new URLSearchParams(location.search).get("customize");if(c)setTimeout(()=>openBuilder(c),350)}
window.CZ3D={scene3d,place,photoFor,hexOf,shapeOf,WRAPS,RIBBONS,SIZES,RMAX};
window.Customize={open:openBuilder};
})();