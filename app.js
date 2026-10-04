import * as S from './store.js';
import { storage } from './storage.js';
import { t, getLang, setLang } from './i18n.js';

const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = n => Math.round(Number(n||0)).toLocaleString('en-US')+' '+S.get().settings.currency;
const dt = d => d ? d.split('-').reverse().join('/') : '—';
const NAV=['dashboard','projects','payments','clients','top','debts','expenses','settings'];
const STAT=['New','Pending','In Progress','Review','Waiting for Client','Completed','Cancelled'];
const PRI=['Low','Medium','High','Urgent'];
const METH=['Vodafone Cash','Etisalat Cash','InstaPay','Bank','Cash','Other'];
const REQ=['name','amount','price','projectId','clientId'];
const FORMS={
  clients:[['name','text'],['phone','text'],['whatsapp','text'],['facebook','text'],['email','email'],['subject','text'],['school','text'],['location','text'],['rating','sel',['5','4','3','2','1']],['tags','text'],['notes','text']],
  projects:[['name','text'],['clientId','client'],['type','text'],['price','number'],['deadline','date'],['status','sel',STAT],['priority','sel',PRI]],
  payments:[['projectId','project'],['amount','number'],['date','date'],['method','sel',METH],['notes','text']],
  expenses:[['name','text'],['category','text'],['amount','number'],['date','date']]
};
const DEFAULTS={rating:'5',date:S.iso(),status:'New',priority:'Medium',method:'Cash'};
let page=location.hash.slice(1)||'dashboard', q='';

const toast=m=>{const e=$('#toast');e.textContent=m;e.classList.add('on');setTimeout(()=>e.classList.remove('on'),2200)};
const fail=e=>{console.error(e);toast(e?.message||'Operation failed')};

const P={
 dashboard:'<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
 projects:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
 payments:'<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20M6 15h4"/>',
 clients:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5c2 .7 3.5 2.6 3.5 5.5"/>',
 debts:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 expenses:'<path d="M3 7l6 6 4-4 8 8M21 11v6h-6"/>',
 settings:'<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
 top:'<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
 revenue:'<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
 profit:'<circle cx="12" cy="12" r="9"/><path d="M14.5 9.2c-.5-.8-1.5-1.2-2.5-1.2-1.4 0-2.5.8-2.5 2s1 1.6 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2c-1 0-2-.4-2.5-1.2M12 6v2M12 16v2"/>',
 completed:'<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
 overdue:'<path d="M12 3l10 18H2z"/><path d="M12 10v5"/>',
 month:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
 active:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
 moon:'<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
 edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/>',dup:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
 del:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'
};
const ic=(n,s=18)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${P[n]||''}</svg>`;
const opts=(list,sel)=>list.map(([v,l])=>`<option value="${esc(v)}"${v==sel?' selected':''}>${esc(l)}</option>`).join('');
const canWrite=()=>['admin','designer'].includes(S.get().profile?.role);
const act=(col,id)=>canWrite()?['edit','dup','del'].map(a=>`<button class="ib ${a}" title="${t(a)}" data-act="${a}:${col}:${id}">${ic(a,15)}</button>`).join(''):'';
const stars=r=>r?`<span style="color:var(--warn)">${'★'.repeat(+r)}</span>`:'—';
const match=s=>!q||String(s??'').toLowerCase().includes(q);

function table(heads,rows,col,addCol){
  if(!rows.length)return `<div class="empty">${t('empty')}${canWrite()&&addCol?`<br><button class="pri" data-act="add:${addCol}">${t('add')}</button>`:''}</div>`;
  return `<div class="tw"><table><thead><tr>${heads.map(h=>`<th>${t(h)}</th>`).join('')}<th></th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r.c.join('</td><td>')}</td><td class="act">${col?act(col,r.id):''}</td></tr>`).join('')}</tbody></table></div>`;
}
const head=col=>`<div class="ph"><h1>${ic(page,24)} ${t(page)}</h1>${canWrite()&&col?`<button class="pri" data-act="add:${col}">${ic('plus',16)} ${t('add')}</button>`:''}</div>`;

function chart(){
  const s=S.get(),now=new Date();
  const ms=[...Array(6)].map((_,i)=>{const d=new Date(now.getFullYear(),now.getMonth()-5+i,1);return S.ymd(d).slice(0,7)});
  const sum=(a,m)=>a.filter(x=>x.date?.startsWith(m)).reduce((n,x)=>n+Number(x.amount||0),0);
  const R=ms.map(m=>sum(s.payments,m)),E=ms.map(m=>sum(s.expenses,m)),mx=Math.max(1,...R,...E),h=v=>v/mx*120;
  return `<div class="card"><svg viewBox="0 0 360 160" class="chart" dir="ltr">${ms.map((m,i)=>{const x=i*58+8;return `<rect class="r" x="${x}" y="${130-h(R[i])}" width="20" height="${h(R[i])}" rx="3"/><rect class="e" x="${x+24}" y="${130-h(E[i])}" width="20" height="${h(E[i])}" rx="3"/><text x="${x+22}" y="148" text-anchor="middle">${m.slice(5)}/${m.slice(2,4)}</text>`}).join('')}</svg><small>${t('chartKey')}</small></div>`;
}

const pages={
 dashboard(){
  const k=S.totals(),c=(key,v,cls='')=>`<div class="card ${cls}"><span class="ico">${ic(key==='outstanding'?'debts':key)}</span><small>${t(key)}</small><b>${v}</b></div>`;
  const alerts=S.get().projects.filter(p=>S.isOverdue(p)||(p.deadline&&p.deadline<=S.iso(2)&&!['Completed','Cancelled'].includes(p.status))).map(p=>({id:p.id,c:[esc(p.name),esc(S.clientName(p.clientId)),dt(p.deadline),S.isOverdue(p)?`<span class="tag bad">${t('OVERDUE')}</span>`:`<span class="tag warn">${t('DUE')}</span>`]}));
  return head()+`<div class="grid">${c('revenue',money(k.revenue),'p')}${c('outstanding',money(k.outstanding),'r')}${c('expenses',money(k.expenses))}${c('profit',money(k.profit),'g')}${c('active',k.active)}${c('completed',k.completed)}${c('overdue',k.overdue,k.overdue?'r':'')}${c('month',money(k.month))}</div>${chart()}<h3>${t('upcoming')}</h3>${table(['name','clientId','deadline','status'],alerts)}`;
 },
 projects(){
  const rows=S.get().projects.filter(p=>match(p.name+S.clientName(p.clientId)+p.type)).map(p=>({id:p.id,c:[esc(p.name),esc(S.clientName(p.clientId)),canWrite()?`<select data-status="${p.id}">${opts(STAT.map(x=>[x,t(x)]),p.status)}</select>`:`<span class="tag">${t(p.status)}</span>`,`<span class="${S.isOverdue(p)?'tag bad':''}">${dt(p.deadline)}</span>`,money(p.price),money(S.paid(p.id)),money(S.remaining(p))]}));
  return head('projects')+table(['name','clientId','status','deadline','price','paid','remaining'],rows,'projects','projects');
 },
 payments(){
  const s=S.get(),pr=id=>s.projects.find(p=>p.id===id)||{};
  const rows=[...s.payments].sort((a,b)=>b.date.localeCompare(a.date)).filter(p=>match(pr(p.projectId).name+S.clientName(pr(p.projectId).clientId)+p.method)).map(p=>({id:p.id,c:[dt(p.date),esc(S.clientName(pr(p.projectId).clientId)),esc(pr(p.projectId).name),money(p.amount),esc(p.method)]}));
  return head('payments')+table(['date','clientId','projectId','amount','method'],rows,'payments','payments');
 },
 clients(){
  const s=S.get(),rows=s.clients.filter(c=>match([c.name,c.subject,c.phone,c.school,c.location,c.tags].join(' '))).map(c=>{const ps=s.projects.filter(p=>p.clientId===c.id);return{id:c.id,c:[esc(c.name),esc(c.subject),esc(c.school),esc(c.phone),stars(c.rating),ps.length,money(ps.reduce((a,p)=>a+S.paid(p.id),0)),money(ps.reduce((a,p)=>a+S.remaining(p),0))]}});
  return head('clients')+table(['name','subject','school','phone','rating','count','paid','outstanding'],rows,'clients','clients');
 },
 top(){
  const s=S.get(),medal=['🥇','🥈','🥉'];
  const rows=s.clients.map(c=>{const ps=s.projects.filter(p=>p.clientId===c.id);return{c,rev:ps.reduce((a,p)=>a+S.paid(p.id),0),n:ps.length}}).sort((a,b)=>b.rev-a.rev).map((r,i)=>({c:[medal[i]||i+1,esc(r.c.name),esc(r.c.subject),money(r.rev),r.n,stars(r.c.rating)]}));
  return head()+table(['rank','name','subject','revenue','count','rating'],rows);
 },
 debts(){
  const s=S.get(),rows=s.clients.map(c=>{const ps=s.projects.filter(p=>p.clientId===c.id&&p.status!=='Cancelled'),rem=ps.reduce((a,p)=>a+S.remaining(p),0);const late=ps.some(p=>S.remaining(p)>0&&S.isOverdue(p)),soon=ps.some(p=>S.remaining(p)>0&&p.deadline&&p.deadline<=S.iso(3));const st=!rem?['ok','SETTLED']:late?['bad','OVERDUE']:soon?['warn','DUE']:['','OK'];return{s:c.name,rem,c:[esc(c.name),money(ps.reduce((a,p)=>a+Number(p.price||0),0)),money(ps.reduce((a,p)=>a+S.paid(p.id),0)),money(rem),`<span class="tag ${st[0]}">${t(st[1])}</span>`]}}).filter(r=>r.rem>0&&match(r.s.toLowerCase()));
  return head()+table(['name','total','paid','remaining','status'],rows);
 },
 expenses(){
  const rows=S.get().expenses.filter(e=>match(e.name+e.category)).map(e=>({id:e.id,c:[esc(e.name),esc(e.category),money(e.amount),dt(e.date)]}));
  return head('expenses')+table(['name','category','amount','date'],rows,'expenses','expenses');
 },
 settings(){
  const isAdmin=S.get().profile?.role==='admin';
  return head()+`<div class="card"><p>ℹ️ ${t('note')}</p><p><b>${t('role')}:</b> ${t(S.get().profile?.role||'employee')}</p><label>${t('currency')} <input id="cur" value="${esc(S.get().settings.currency)}" style="width:100px" ${isAdmin?'':'disabled'}></label>
  <div class="set"><button class="pri" data-act="export">${ic('revenue',16)} ${t('export')}</button><button data-act="import" ${isAdmin?'':'disabled'}>${t('import')}</button><input type="file" id="file" accept=".json" hidden>
  ${isAdmin?`<button data-act="demo">${t('loadDemo')}</button><button class="neon" data-act="reset">${t('reset')}</button>`:''}
  <button data-act="resetLocal">${t('resetLocal')}</button></div></div>`;
 }
};

function renderAuth(error=''){
  document.documentElement.dataset.theme=storage.pref('theme')||'dark';
  const a=$('#auth');a.hidden=false;
  a.innerHTML=`<div class="auth-card"><h1>${ic('dashboard',24)} Designer OS</h1><p class="auth-sub">${t('login')}</p><div id="authError" class="auth-error ${error?'on':''}">${esc(error)}</div>
  <form id="loginForm"><label>${t('email')}<input id="loginEmail" type="email" autocomplete="username" required></label><label>${t('password')}<input id="loginPassword" type="password" autocomplete="current-password" required></label><button class="pri" type="submit">${t('login')}</button></form></div>`;
  $('#loginForm').onsubmit=async e=>{e.preventDefault();const btn=e.target.querySelector('button');btn.disabled=true;try{await S.login($('#loginEmail').value,$('#loginPassword').value)}catch(err){renderAuth(err.message||t('invalidLogin'))}finally{btn.disabled=false}};
}

function render(){
  document.documentElement.lang=getLang();document.documentElement.dir=getLang()==='ar'?'rtl':'ltr';document.documentElement.dataset.theme=storage.pref('theme')||'dark';
  if(!S.get().user){$('#shell').hidden=true;renderAuth();return}
  $('#auth').hidden=true;$('#shell').hidden=false;
  const profile=S.get().profile;
  $('#userBadge').textContent=`${profile?.full_name||S.get().user.email} · ${t(profile?.role||'employee')}`;
  $('#q').placeholder=t('search');
  $('[data-act=theme]').innerHTML=ic((storage.pref('theme')||'dark')==='dark'?'sun':'moon');
  $('[data-act=lang]').innerHTML=ic('globe')+(getLang()==='ar'?'EN':'ع');
  $('[data-act=menu]').innerHTML=ic('menu');
  $('#nav').innerHTML=NAV.map(n=>`<a href="#${n}" class="${n===page?'on':''}">${ic(n)}${t(n)}</a>`).join('');
  $('#quick').innerHTML=`<option value="">${t('quick')}</option>`+(canWrite()?opts(Object.keys(FORMS).map(k=>[k,t(k)]),''):'');
  $('#main').innerHTML=(pages[page]||pages.dashboard)();
}

async function openForm(col,item={}){
  const s=S.get();
  if(col==='projects'&&!s.clients.length)return toast(t('needClient'));
  if(col==='payments'&&!s.projects.length)return toast(t('needProject'));
  const d=$('#dlg'),v={...DEFAULTS,...item};
  d.innerHTML=`<form method="dialog"><h3>${t(item.id?'edit':'add')} — ${t(col)}</h3>${FORMS[col].map(([k,type,list])=>{
    const sel=type==='sel'?opts(list.map(x=>[x,t(x)]),v[k]):type==='client'?opts(s.clients.map(c=>[c.id,c.name]),v[k]):type==='project'?opts(s.projects.map(p=>[p.id,p.name]),v[k]):'';
    return `<label>${t(k)}${sel?`<select name="${k}">${sel}</select>`:`<input name="${k}" type="${type}" value="${esc(v[k]??'')}" ${type==='number'?'min="0" step="any"':''} ${REQ.includes(k)?'required':''}>`}</label>`;
  }).join('')}<div class="row"><button type="button" data-act="close">${t('cancel')}</button><button class="pri">${t('save')}</button></div></form>`;
  d.querySelector('form').onsubmit=async e=>{e.preventDefault();const o=Object.fromEntries(new FormData(e.target));FORMS[col].forEach(([k,type])=>{if(type==='number')o[k]=+o[k]||0});try{item.id?await S.update(col,item.id,o):await S.add(col,o);d.close();toast(t('saved'))}catch(err){fail(err)}};
  d.showModal();
}

document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-act]');if(!b)return;
  const [a,col,id]=b.dataset.act.split(':'),s=S.get();
  try{
    if(a==='add')await openForm(col);
    else if(a==='edit')await openForm(col,s[col].find(x=>x.id===id));
    else if(a==='dup'){const{ id:_,...o}=s[col].find(x=>x.id===id);await S.add(col,o)}
    else if(a==='del'){if(confirm(t('sure')))await S.remove(col,id)}
    else if(a==='close')$('#dlg').close();
    else if(a==='theme'){storage.pref('theme',(storage.pref('theme')||'dark')==='dark'?'light':'dark');render()}
    else if(a==='lang'){setLang(getLang()==='ar'?'en':'ar');render()}
    else if(a==='menu')$('#side').classList.toggle('open');
    else if(a==='logout')await S.logout();
    else if(a==='demo'){if(confirm(t('confirmReset')))await S.seedDemo()}
    else if(a==='reset'){if(confirm(t('confirmReset')))await S.resetCloud()}
    else if(a==='resetLocal')S.resetLocalPreferences();
    else if(a==='import')$('#file').click();
    else if(a==='export'){const s2=S.get();const data={settings:s2.settings,clients:s2.clients,projects:s2.projects,payments:s2.payments,expenses:s2.expenses};const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='designer-dashboard-backup.json';a.click();URL.revokeObjectURL(url)}
  }catch(err){fail(err)}
});
document.addEventListener('change',async e=>{
  const el=e.target;
  try{
    if(el.dataset.status)await S.update('projects',el.dataset.status,{status:el.value});
    else if(el.id==='quick'&&el.value){await openForm(el.value);el.value=''}
    else if(el.id==='cur')await S.updateCurrency(el.value.trim()||'EGP');
    else if(el.id==='file'&&el.files[0]){const text=await el.files[0].text();await S.importBackup(JSON.parse(text));toast(t('saved'));el.value=''}
  }catch(err){fail(err)}
});
$('#q').addEventListener('input',e=>{q=e.target.value.toLowerCase();render()});
window.addEventListener('hashchange',()=>{page=location.hash.slice(1)||'dashboard';$('#side').classList.remove('open');render()});

S.subscribe(render);
S.onAuthChange(async(event,session)=>{
  if(session) { try{await S.init()}catch(err){console.error(err);toast(err.message)} }
  else { await S.init().catch(()=>{}); }
});

(async()=>{
  try{await S.init();render()}catch(err){console.error(err);renderAuth(err.message||'Unable to connect to Supabase.')}
})();
