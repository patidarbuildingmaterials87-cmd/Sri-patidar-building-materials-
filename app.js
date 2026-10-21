const C=window.CONFIG,$=s=>document.querySelector(s),DRIVE='https://www.googleapis.com/drive/v3/files',UP='https://www.googleapis.com/upload/drive/v3/files';
let tok,tc,wait,fileId,tab,cur={lines:[]},rev=[],st,db={items:[],bills:[],seq:1,pw:null,salt:null};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const inr=n=>'₹'+(+n||0).toLocaleString('en-IN',{maximumFractionDigits:2});
const uid=()=>Math.random().toString(36).slice(2,9);
const sha=async t=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(t)))].map(b=>b.toString(16).padStart(2,'0')).join('');
const f=(id,l,v,t='text')=>`<label class=mut>${l}</label><input id=${id} type=${t} value="${esc(v)}">`;

/* ---------- Google sign-in + Drive ---------- */
const getTc=()=>tc||(tc=google.accounts.oauth2.initTokenClient({client_id:C.GOOGLE_CLIENT_ID,scope:'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email',callback:onTok}));
const refresh=()=>new Promise(r=>{wait=r;getTc().requestAccessToken({prompt:''})});
function onTok(r){if(r.error)return start('Sign-in failed. Try again.');tok=r.access_token;localStorage.setItem('tk',JSON.stringify({t:tok,e:Date.now()+3.4e6}));if(wait){wait();wait=0}else boot()}
async function api(u,o={}){o.headers={...o.headers,Authorization:'Bearer '+tok};let r=await fetch(u,o);if(r.status==401){await refresh();o.headers.Authorization='Bearer '+tok;r=await fetch(u,o)}if(!r.ok)throw new Error(r.status);return r}
async function boot(){try{
 const me=await(await api('https://www.googleapis.com/oauth2/v3/userinfo')).json();
 if(!C.ALLOWED_EMAILS.map(e=>e.toLowerCase()).includes(me.email.toLowerCase())){localStorage.removeItem('tk');return start('Access denied for '+esc(me.email))}
 const q=encodeURIComponent("name='spbm-data.json' and trashed=false");
 const l=await(await api(`${DRIVE}?q=${q}&fields=files(id)`)).json();
 if(l.files.length){fileId=l.files[0].id;db={...db,...await(await api(`${DRIVE}/${fileId}?alt=media`)).json()}}else await save(true);
 pwScreen()}catch(e){start('Could not reach Google Drive. Sign in again.')}}
function save(now){clearTimeout(st);const go=async()=>{try{const b=JSON.stringify(db);
 if(fileId)await api(`${UP}/${fileId}?uploadType=media`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:b});
 else{const r=await api(`${UP}?uploadType=multipart`,{method:'POST',headers:{'Content-Type':'multipart/related; boundary=bd'},body:'--bd\r\nContent-Type: application/json\r\n\r\n{"name":"spbm-data.json"}\r\n--bd\r\nContent-Type: application/json\r\n\r\n'+b+'\r\n--bd--'});fileId=(await r.json()).id}
 const s=$('#sync');if(s)s.textContent='Saved to Google Drive ✓'}catch(e){const s=$('#sync');if(s)s.textContent='Not saved. Check internet ⚠'}};
 return now?go():(st=setTimeout(go,700))}

/* ---------- Screens ---------- */
function start(msg){$('#app').innerHTML=`<div id=login><div style=font-size:54px>🏗️</div><h1>${esc(C.STORE)}</h1><p class=mut>Billing and stock manager</p><button class=w onclick=login()>Sign in with Google</button><p class=mut>${msg||''}</p></div>`}
function login(){if(C.GOOGLE_CLIENT_ID.startsWith('PASTE'))return start('Add your Google Client ID in config.js');getTc().requestAccessToken()}
function pwScreen(){const n=!db.pw;$('#app').innerHTML=`<div id=login><h2>${n?'Create your password':'Enter password'}</h2><input id=pw type=password placeholder=Password><button class=w onclick=checkPw()>${n?'Save and continue':'Unlock'}</button><p class=mut id=err></p></div>`}
async function checkPw(){const p=$('#pw').value,n=!db.pw;if(p.length<4)return $('#err').textContent='Use at least 4 characters';
 if(n){db.salt=uid();db.pw=await sha(db.salt+p);save(true);return shell()}
 if(await sha(db.salt+p)===db.pw)shell();else $('#err').textContent='Wrong password'}
const T=[['home','🏠','Home'],['stock','📦','Stock'],['bill','🧾','Bill'],['bills','📚','Bills'],['imp','📄','Import']];
function shell(){$('#app').innerHTML=`<header><h1>${esc(C.STORE)}</h1><small id=sync>Connected to Google Drive</small></header><main id=m></main><nav>${T.map(t=>`<a id=t_${t[0]} onclick="go('${t[0]}')"><i>${t[1]}</i>${t[2]}</a>`).join('')}</nav>`;go('home')}
function go(t){tab=t;T.forEach(x=>$('#t_'+x[0]).className=x[0]==t?'on':'');V[t]()}
function sheet(h){const s=document.createElement('div');s.className='sheet';s.innerHTML='<div>'+h+'</div>';s.onclick=e=>{if(e.target==s)s.remove()};document.body.append(s)}
const close=()=>document.querySelector('.sheet')?.remove();

const V={
home(){const d=new Date().toDateString(),td=db.bills.filter(b=>new Date(b.date).toDateString()==d),low=db.items.filter(i=>i.qty<=i.min);
 $('#m').innerHTML=`<div class=grid><div class="card stat"><span>Sales today</span><b>${inr(td.reduce((s,b)=>s+b.total,0))}</b></div><div class="card stat"><span>Bills today</span><b>${td.length}</b></div><div class="card stat"><span>Stock value</span><b>${inr(db.items.reduce((s,i)=>s+i.qty*i.cost,0))}</b></div><div class="card stat"><span>Pending dues</span><b>${inr(db.bills.reduce((s,b)=>s+b.total-b.paid,0))}</b></div></div><div class=card><b>Low stock</b>${low.map(i=>`<div class=row><span>${esc(i.name)}</span><span class=tag>${i.qty} ${esc(i.unit)} left</span></div>`).join('')||'<p class=mut>All items are above their alert level.</p>'}</div>`},
stock(){$('#m').innerHTML=`<div class=row><input placeholder="Search items" oninput="lst(this.value)"><button onclick="edit()" style=margin-bottom:4px>Add item</button></div><div id=sl></div>`;lst('')},
bill(){$('#m').innerHTML=`<div class=card>${f('cn','Customer name',cur.cn||'').replace('<input','<input oninput="cur.cn=this.value"')}${f('cp','Phone (for WhatsApp)',cur.cp||'','tel').replace('<input','<input oninput="cur.cp=this.value"')}</div><div class=card><input id=ip list=dl placeholder="Search item to add"><datalist id=dl>${db.items.map(i=>`<option value="${esc(i.name)}">`).join('')}</datalist><button class=w onclick=addLine()>Add to bill</button></div><div id=bl></div>`;bl()},
bills(){$('#m').innerHTML=db.bills.map(b=>`<div class=card onclick="show('${b.id}')"><div class=row><b>#${b.no} ${esc(b.cn)}</b><b>${inr(b.total)}</b></div><div class=row><span class=mut>${new Date(b.date).toLocaleDateString('en-IN')}</span>${b.total>b.paid?`<span class=tag>Due ${inr(b.total-b.paid)}</span>`:''}</div></div>`).join('')||'<p class=mut>No bills yet. Create one from the Bill tab.</p>'},
imp(){$('#m').innerHTML=`<div class=card><b>Supplier invoice to stock</b><p class=mut>Upload a text-based PDF invoice. Check the items found, then add them to stock.</p><input id=pf type=file accept=application/pdf onchange=readPdf(this.files[0])></div><div id=rv></div>`;rev=[];rv()}};

/* ---------- Stock ---------- */
function lst(q){$('#sl').innerHTML=db.items.filter(i=>i.name.toLowerCase().includes(q.toLowerCase())).map(i=>`<div class=card onclick="edit('${i.id}')"><div class=row><b>${esc(i.name)}</b><b>${inr(i.price)}</b></div><div class=row><span class=mut>Cost ${inr(i.cost)}</span><span class="${i.qty<=i.min?'tag':'mut'}">${i.qty} ${esc(i.unit)}</span></div></div>`).join('')||'<p class=mut>No items yet. Tap Add item or import a supplier invoice.</p>'}
function edit(id){const i=db.items.find(x=>x.id==id)||{name:'',unit:'Bag',qty:0,cost:0,price:0,min:5};
 sheet(`<h3>${id?'Edit item':'New item'}</h3>${f('n','Item name',i.name)}${f('u','Unit (Bag, Kg, Nos)',i.unit)}${f('q','Stock quantity',i.qty,'number')}${f('c','Cost price',i.cost,'number')}${f('p','Selling price',i.price,'number')}${f('mn','Low stock alert at',i.min,'number')}<button class=w onclick="saveItem('${id||''}')" style=margin-top:8px>Save item</button>${id?`<button class="w r" style=margin-top:8px onclick="delItem('${id}')">Delete item</button>`:''}`)}
function saveItem(id){const v=k=>$('#'+k).value,o={name:v('n').trim(),unit:v('u')||'Nos',qty:+v('q'),cost:+v('c'),price:+v('p'),min:+v('mn')};if(!o.name)return;
 if(id)Object.assign(db.items.find(x=>x.id==id),o);else db.items.push({id:uid(),...o});save();close();V.stock()}
function delItem(id){if(confirm('Delete this item?')){db.items=db.items.filter(x=>x.id!=id);save();close();V.stock()}}

/* ---------- Billing ---------- */
function addLine(){const i=db.items.find(x=>x.name==$('#ip').value);if(!i)return;const l=cur.lines.find(x=>x.id==i.id);l?l.qty++:cur.lines.push({id:i.id,name:i.name,unit:i.unit,qty:1,rate:i.price});$('#ip').value='';bl()}
const sum=()=>cur.lines.reduce((s,l)=>s+l.qty*l.rate,0);
const tot=()=>$('#tt').textContent=inr(sum());
function bl(){$('#bl').innerHTML=cur.lines.map((l,n)=>`<div class=card><div class=row><b>${esc(l.name)}</b><button class=r onclick="cur.lines.splice(${n},1);bl()">Remove</button></div><div class=grid><div><label class=mut>Quantity (${esc(l.unit)})</label><input type=number value=${l.qty} oninput="cur.lines[${n}].qty=+this.value;tot()"></div><div><label class=mut>Rate</label><input type=number value=${l.rate} oninput="cur.lines[${n}].rate=+this.value;tot()"></div></div></div>`).join('')+(cur.lines.length?`<div class=card><div class=row><b>Total</b><b id=tt>${inr(sum())}</b></div><label class=mut>Amount received (blank = full)</label><input id=pd type=number><button class=w onclick=saveBill()>Save bill</button></div>`:'')}
function saveBill(){const total=sum(),pd=$('#pd').value,b={id:uid(),no:db.seq++,date:new Date().toISOString(),cn:cur.cn||'Walk-in customer',cp:cur.cp||'',lines:cur.lines,total,paid:pd===''?total:+pd};
 b.lines.forEach(l=>{const i=db.items.find(x=>x.id==l.id);if(i)i.qty-=l.qty});db.bills.unshift(b);cur={lines:[]};save();V.bill();show(b.id)}
function show(id){const b=db.bills.find(x=>x.id==id),due=b.total-b.paid;
 sheet(`<div id=inv><h2 style=margin:0>${esc(C.STORE)}</h2><p class=mut>Invoice #${b.no}, ${new Date(b.date).toLocaleDateString('en-IN')}<br>${esc(b.cn)} ${esc(b.cp)}</p><table width=100%>${b.lines.map(l=>`<tr><td>${esc(l.name)}<br><small class=mut>${l.qty} ${esc(l.unit)} × ${inr(l.rate)}</small></td><td align=right>${inr(l.qty*l.rate)}</td></tr>`).join('')}</table><hr><div class=row><b>Total</b><b>${inr(b.total)}</b></div><div class=row><span>Paid</span><span>${inr(b.paid)}</span></div>${due>0?`<div class=row><b>Due</b><b>${inr(due)}</b></div>`:''}</div><div class=grid style=margin-top:14px><button onclick=print()>Print / Save PDF</button><button class=g onclick="wa('${b.id}')">Send on WhatsApp</button></div>`)}
function wa(id){const b=db.bills.find(x=>x.id==id);let p=b.cp.replace(/\D/g,'');if(p.length==10)p='91'+p;
 const t=`${C.STORE}\nBill #${b.no}\n`+b.lines.map(l=>`${l.name}: ${l.qty} ${l.unit} x ${l.rate} = ${l.qty*l.rate}`).join('\n')+`\nTotal: ${b.total}\nDue: ${b.total-b.paid}`;
 open('https://wa.me/'+p+'?text='+encodeURIComponent(t))}

/* ---------- Supplier invoice PDF import ---------- */
const UN=['bag','bags','nos','no','pcs','pc','kg','ton','mt','sqft','ft','ltr','box','bundle','rft','cft'];
function parse(line){const tk=line.trim().split(/\s+/),N=[];tk.forEach((t,i)=>{if(/^\d[\d,]*\.?\d*$/.test(t))N.push({i,v:parseFloat(t.replace(/,/g,''))})});
 for(let n=0;n<N.length-2;n++){const[a,b,c]=[N[n],N[n+1],N[n+2]];
  if(a.v>0&&Math.abs(a.v*b.v-c.v)<=Math.max(1,c.v*.01)){let nm=tk.slice(0,a.i),u='Nos';const nx=tk[a.i+1]||'';
   if(UN.includes(nx.toLowerCase()))u=nx;else if(UN.includes((nm[nm.length-1]||'').toLowerCase()))u=nm.pop();
   if(/^\d+$/.test(nm[0]||'')&&nm.length>1)nm.shift();
   const name=nm.join(' ').trim();return name?{on:1,name,unit:u,qty:a.v,cost:b.v}:null}}return null}
async function readPdf(file){if(!file)return;$('#rv').innerHTML='<p class=mut>Reading invoice…</p>';
 pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
 try{const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;rev=[];
  for(let p=1;p<=pdf.numPages;p++){const tx=await(await pdf.getPage(p)).getTextContent(),rows={};
   tx.items.forEach(s=>{const y=Math.round(s.transform[5]/3);(rows[y]=rows[y]||[]).push(s)});
   Object.keys(rows).sort((a,b)=>b-a).forEach(y=>{const r=parse(rows[y].sort((a,b)=>a.transform[4]-b.transform[4]).map(s=>s.str).join(' '));if(r)rev.push(r)})}
  rv(rev.length?'':'No item rows found. This PDF may be a scan; add items manually in Stock.')}catch(e){rv('Could not read this PDF.')}}
function rv(msg){$('#rv').innerHTML=rev.length?rev.map((r,n)=>`<div class=card><div class=row><input type=checkbox style="width:22px;margin:0" ${r.on?'checked':''} onchange="rev[${n}].on=this.checked"><input value="${esc(r.name)}" oninput="rev[${n}].name=this.value"></div><div class=grid><div><label class=mut>Quantity (${esc(r.unit)})</label><input type=number value=${r.qty} oninput="rev[${n}].qty=+this.value"></div><div><label class=mut>Cost rate</label><input type=number value=${r.cost} oninput="rev[${n}].cost=+this.value"></div></div></div>`).join('')+'<button class=w onclick=applyRev()>Add selected to stock</button>':`<p class=mut>${msg||'Choose a PDF to begin.'}</p>`}
function applyRev(){let n=0;rev.filter(r=>r.on&&r.name.trim()).forEach(r=>{const i=db.items.find(x=>x.name.toLowerCase()==r.name.trim().toLowerCase());
 if(i){i.qty+=r.qty;i.cost=r.cost}else db.items.push({id:uid(),name:r.name.trim(),unit:r.unit,qty:r.qty,cost:r.cost,price:Math.round(r.cost*1.15),min:5});n++});
 save();rev=[];rv(n+' items added to stock. New items got a selling price of cost + 15%. Review it in Stock.')}

window.onload=()=>{const s=JSON.parse(localStorage.getItem('tk')||'null');if(s&&s.e>Date.now()){tok=s.t;boot()}else start()};
