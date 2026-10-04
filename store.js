import { supabase } from './supabase.js';

const empty = () => ({
  settings: { id: 1, currency: 'EGP' },
  clients: [], projects: [], payments: [], expenses: [],
  user: null, profile: null
});

let state = null;
const subs = new Set();
let realtimeChannel = null;

const pad = n => String(n).padStart(2, '0');
export const ymd = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
export const iso = (n=0) => { const d=new Date(); d.setDate(d.getDate()+n); return ymd(d); };

const emit = () => subs.forEach(fn => { try { fn(state); } catch (e) { console.error(e); } });
export const subscribe = fn => { subs.add(fn); return () => subs.delete(fn); };
export const get = () => state || empty();
export const hasData = () => !!state;

const tableMap = {
  clients: 'clients',
  projects: 'projects',
  payments: 'payments',
  expenses: 'expenses'
};

function assertReady() {
  if (!state) throw new Error('The application is not initialized yet.');
}

async function queryAll() {
  const [clients, projects, payments, expenses, settings] = await Promise.all([
    supabase.from('clients').select('*').order('created_at', { ascending:false }),
    supabase.from('projects').select('*').order('created_at', { ascending:false }),
    supabase.from('payments').select('*').order('payment_date', { ascending:false }),
    supabase.from('expenses').select('*').order('date', { ascending:false }),
    supabase.from('settings').select('*').eq('id', 1).maybeSingle()
  ]);
  const failed = [clients, projects, payments, expenses, settings].find(x => x.error);
  if (failed?.error) throw failed.error;
  return {
    settings: settings.data || { id:1, currency:'EGP' },
    clients: clients.data || [],
    projects: (projects.data || []).map(p => ({...p, clientId:p.client_id})),
    payments: (payments.data || []).map(p => ({...p, projectId:p.project_id})),
    expenses: expenses.data || []
  };
}

export async function reload() {
  if (!state?.user) return;
  const data = await queryAll();
  state = { ...state, ...data };
  emit();
}

export async function init() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!session) { state = null; emit(); return null; }

  const { data: profile, error: profileError } = await supabase
    .from('profiles').select('*').eq('id', session.user.id).single();
  if (profileError) throw profileError;

  state = { ...empty(), user: session.user, profile, ...(await queryAll()) };
  await subscribeRealtime();
  emit();
  return state;
}

export function onAuthChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    Promise.resolve(callback(event, session)).catch(console.error);
  }).data.subscription;
}

async function subscribeRealtime() {
  if (realtimeChannel) await supabase.removeChannel(realtimeChannel);
  realtimeChannel = supabase.channel('designer-os-db-changes');
  for (const table of ['clients','projects','payments','expenses','settings']) {
    realtimeChannel = realtimeChannel.on('postgres_changes', {
      event:'*', schema:'public', table
    }, () => { reload().catch(err => console.error('Realtime reload failed:', err)); });
  }
  realtimeChannel.subscribe(status => {
    if (status === 'CHANNEL_ERROR') console.error('Supabase Realtime channel error.');
  });
}

export async function login(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email:email.trim(), password });
  if (error) throw error;
}

export async function logout() {
  if (realtimeChannel) { await supabase.removeChannel(realtimeChannel); realtimeChannel = null; }
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  state = null;
  emit();
}

function toDb(col, o) {
  if (col === 'projects') {
    const { clientId, ...rest } = o;
    return { ...rest, client_id: clientId || null };
  }
  if (col === 'payments') {
    const { projectId, ...rest } = o;
    return { ...rest, project_id: projectId || null };
  }
  return o;
}

function fromDb(col, row) {
  if (col === 'projects') return {...row, clientId:row.client_id};
  if (col === 'payments') return {...row, projectId:row.project_id};
  return row;
}

export async function add(col, o) {
  assertReady();
  if (!tableMap[col]) throw new Error('Unsupported table: '+col);
  const { data, error } = await supabase.from(tableMap[col]).insert(toDb(col, o)).select().single();
  if (error) throw error;
  const item = fromDb(col, data);
  state[col] = [item, ...state[col]];
  emit();
  return item;
}

export async function update(col, id, patch) {
  assertReady();
  if (!tableMap[col]) throw new Error('Unsupported table: '+col);
  const { data, error } = await supabase.from(tableMap[col]).update(toDb(col, patch)).eq('id', id).select().single();
  if (error) throw error;
  const item = fromDb(col, data);
  state[col] = state[col].map(x => x.id === id ? item : x);
  emit();
  return item;
}

export async function remove(col, id) {
  assertReady();
  if (!tableMap[col]) throw new Error('Unsupported table: '+col);
  const { error } = await supabase.from(tableMap[col]).delete().eq('id', id);
  if (error) throw error;
  state[col] = state[col].filter(x => x.id !== id);
  emit();
}

export function paid(pid) {
  return get().payments.filter(p=>p.projectId===pid).reduce((a,p)=>a+Number(p.amount||0),0);
}
export function remaining(p) { return Math.max(0, Number(p.price||0)-paid(p.id)); }
export function isOverdue(p) { return !['Completed','Cancelled'].includes(p.status) && p.deadline && p.deadline < iso(); }
export function clientName(id) { return (get().clients.find(c=>c.id===id)||{}).name || '—'; }

export function totals() {
  const s=get(), live=s.projects.filter(p=>p.status!=='Cancelled'), month=iso().slice(0,7);
  const revenue=s.payments.reduce((a,p)=>a+Number(p.amount||0),0);
  const expenses=s.expenses.reduce((a,e)=>a+Number(e.amount||0),0);
  return {
    revenue, expenses, profit:revenue-expenses,
    outstanding:live.reduce((a,p)=>a+remaining(p),0),
    active:live.filter(p=>p.status!=='Completed').length,
    completed:live.filter(p=>p.status==='Completed').length,
    overdue:live.filter(isOverdue).length,
    month:s.payments.filter(p=>p.date?.startsWith(month)).reduce((a,p)=>a+Number(p.amount||0),0)
  };
}

function demoRows() {
  const today=iso();
  const clients=[
    {name:'Ahmed',subject:'Math',phone:'01000000001',whatsapp:'01000000001',school:'Al-Nour Academy',location:'Cairo',rating:5,tags:'teacher',notes:''},
    {name:'Mohamed',subject:'Physics',phone:'01000000002',whatsapp:'01000000002',school:'Future School',location:'Giza',rating:4,tags:'teacher',notes:''},
    {name:'Mahmoud',subject:'English',phone:'01000000003',whatsapp:'01000000003',school:'Elite Center',location:'Alexandria',rating:5,tags:'teacher',notes:''}
  ];
  return { clients, projects:[
    {name:'Poster Package',type:'Poster',price:1500,deadline:iso(1),status:'In Progress',priority:'High',_client:0},
    {name:'Course Thumbnails',type:'Thumbnail',price:900,deadline:iso(-3),status:'Review',priority:'Urgent',_client:1},
    {name:'Certificates',type:'Certificate',price:600,deadline:iso(-20),status:'Completed',priority:'Low',_client:2},
    {name:'Branding Kit',type:'Branding',price:3200,deadline:iso(14),status:'New',priority:'Medium',_client:0}
  ], payments:[
    {amount:500,date:iso(-10),method:'Vodafone Cash',_project:0},
    {amount:500,date:iso(-4),method:'InstaPay',_project:0},
    {amount:600,date:iso(-18),method:'Cash',_project:2},
    {amount:300,date:iso(-35),method:'Bank',_project:1},
    {amount:1000,date:iso(-40),method:'Bank',_project:3}
  ], expenses:[
    {name:'Adobe subscription',category:'Software',amount:700,date:iso(-8)},
    {name:'Internet',category:'Internet',amount:300,date:iso(-5)}
  ], today};
}

export async function seedDemo() {
  assertReady();
  if (state.profile?.role !== 'admin') throw new Error('Only an admin can load demo data.');
  const d=demoRows();
  const {data:clients,error:ce}=await supabase.from('clients').insert(d.clients).select();
  if(ce) throw ce;
  const projects=d.projects.map(({_client,...p})=>({...p,client_id:clients[_client].id}));
  const {data:projectsInserted,error:pe}=await supabase.from('projects').insert(projects).select();
  if(pe) throw pe;
  const payments=d.payments.map(({_project,...p})=>({...p,project_id:projectsInserted[_project].id}));
  const {error:payErr}=await supabase.from('payments').insert(payments);
  if(payErr) throw payErr;
  const {error:expErr}=await supabase.from('expenses').insert(d.expenses);
  if(expErr) throw expErr;
  await reload();
}

export async function importBackup(data) {
  assertReady();
  if (state.profile?.role !== 'admin') throw new Error('Only an admin can import data.');
  if (!Array.isArray(data.clients)||!Array.isArray(data.projects)||!Array.isArray(data.payments)||!Array.isArray(data.expenses)) throw new Error('Invalid backup');
  // Insert in dependency order. Existing UUIDs are preserved when valid.
  const oldClientToNew = new Map();
  const clients=data.clients.map(({id,...x})=>isUuid(id)?{id,...x}:x);
  const {data:ci,error:ce}=await supabase.from('clients').upsert(clients).select();
  if(ce) throw ce;
  data.clients.forEach((oldClient,i)=>oldClientToNew.set(oldClient.id,ci[i]?.id));
  const projects=data.projects.map(({id,clientId,client_id,...x})=>({
    ...(isUuid(id)?{id}:{}), ...x,
    client_id: oldClientToNew.get(clientId) || (isUuid(client_id)?client_id:null)
  }));
  const {data:pi,error:pe}=await supabase.from('projects').upsert(projects).select();
  if(pe) throw pe;
  const oldProjectToNew = new Map();
  data.projects.forEach((oldProject,i)=>oldProjectToNew.set(oldProject.id,pi[i]?.id));
  const payments=data.payments.map(({id,projectId,project_id,...x})=>({
    ...(isUuid(id)?{id}:{}), ...x,
    project_id: oldProjectToNew.get(projectId) || (isUuid(project_id)?project_id:null)
  }));
  const {error:pae}=await supabase.from('payments').upsert(payments);
  if(pae) throw pae;
  const expenses=data.expenses.map(({id,...x})=>({...x,...(isUuid(id)?{id}:{})}));
  const {error:ee}=await supabase.from('expenses').upsert(expenses);
  if(ee) throw ee;
  await reload();
}
const isUuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

export async function resetCloud() {
  assertReady();
  if(state.profile?.role!=='admin') throw new Error('Only an admin can reset cloud data.');
  for(const [table, column] of [['payments','id'],['projects','id'],['clients','id'],['expenses','id']]){
    const {error}=await supabase.from(table).delete().not(column,'is',null);
    if(error) throw error;
  }
  await reload();
}

export async function updateCurrency(currency) {
  assertReady();
  if(state.profile?.role!=='admin') throw new Error('Only an admin can change settings.');
  const {data,error}=await supabase.from('settings').upsert({id:1,currency:currency||'EGP'}).select().single();
  if(error) throw error;
  state.settings=data; emit();
}

export function resetLocalPreferences() {
  localStorage.removeItem('ddm:lang');
  localStorage.removeItem('ddm:theme');
  location.reload();
}
