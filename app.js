const { createClient } = window.supabase;
const sb = createClient(window.ML_CONFIG.SUPABASE_URL, window.ML_CONFIG.SUPABASE_PUBLISHABLE_KEY);
const state = { members: [], parents: [], relationships: [], events: [], gallery: [], scale: 1 };
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const photo = (m, cls='') => m?.photo_path ? `${window.ML_CONFIG.SUPABASE_URL}/storage/v1/object/public/family-photos/${m.photo_path}` : `assets/${m?.generation === 1 ? 'founder.svg' : 'member-2.svg'}`;
const fmtDate = d => d ? new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'long',year:'numeric'}).format(new Date(d+'T00:00:00')) : '';

async function load(){
  const [m,p,r,e,g] = await Promise.all([
    sb.from('members').select('*').order('generation').order('name'),
    sb.from('member_parents').select('*'),
    sb.from('member_relationships').select('*').order('start_date'),
    sb.from('events').select('*').order('event_date'),
    sb.from('gallery').select('*').order('created_at',{ascending:false})
  ]);
  if(m.error){ console.error(m.error); $('#treeLoading').textContent='Supabase belum terhubung. Periksa config.js.'; return; }
  state.members=m.data||[]; state.parents=p.data||[]; state.relationships=r.data||[]; state.events=e.data||[]; state.gallery=g.data||[];
  renderStats(); renderTree(); renderMembers(); renderHistory(); renderGallery();
}
function renderStats(){
  $('#heroMembers').textContent=state.members.length;
  $('#heroGenerations').textContent=state.members.length?Math.max(...state.members.map(x=>x.generation||1)):0;
  $('#heroRelations').textContent=state.relationships.length+state.parents.length;
}
function relFor(id){ return state.relationships.filter(r=>r.member_a_id===id||r.member_b_id===id); }
function partnerOf(id){ return relFor(id).filter(r=>['spouse','partner'].includes(r.relationship_type)).map(r=>state.members.find(m=>m.id===(r.member_a_id===id?r.member_b_id:r.member_a_id))).filter(Boolean); }
function childrenOf(id){ return state.parents.filter(x=>x.parent_id===id).map(x=>state.members.find(m=>m.id===x.member_id)).filter(Boolean); }
function parentsOf(id){ return state.parents.filter(x=>x.member_id===id).map(x=>state.members.find(m=>m.id===x.parent_id)).filter(Boolean); }
function siblingsOf(id){ const ps=parentsOf(id).map(x=>x.id); return state.members.filter(m=>m.id!==id && state.parents.some(x=>x.member_id===m.id && ps.includes(x.parent_id))); }
function initials(n){ return (n||'ML').split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase(); }
function card(m, compact=false){
  const p=partnerOf(m.id)[0];
  return `<button class="person ${compact?'compact':''}" data-id="${m.id}"><div class="person-photo"><img src="${esc(photo(m))}" alt="${esc(m.name)}"><span>${initials(m.name)}</span></div><div class="person-info"><small>GEN ${esc(m.generation||'—')}</small><strong>${esc(m.name)}</strong>${m.nickname?`<em>“${esc(m.nickname)}”</em>`:''}<label>${p?'💍 '+esc(p.name):esc(m.rank||m.status||'Family Member')}</label></div></button>`;
}
function renderTree(){
  const canvas=$('#treeCanvas'); canvas.innerHTML='';
  const roots=state.members.filter(m=>!state.parents.some(p=>p.member_id===m.id));
  const start=roots.length?roots:state.members.filter(m=>(m.generation||1)===1);
  if(!start.length){canvas.innerHTML='<div class="empty">Belum ada anggota keluarga.</div>';return;}
  const used=new Set(); const forest=document.createElement('div'); forest.className='forest';
  start.forEach(r=>{ const node=buildNode(r,0,used); if(node) forest.appendChild(node); });
  state.members.filter(m=>!used.has(m.id)).forEach(m=>forest.appendChild(buildNode(m,0,used)));
  canvas.appendChild(forest); applyScale();
}
function buildNode(m,depth,used){
  if(used.has(m.id)) return null; used.add(m.id);
  const partners=partnerOf(m.id); const people=[m,...partners.filter(p=>!used.has(p.id))]; partners.forEach(p=>used.add(p.id));
  const couple=document.createElement('div'); couple.className='family-node';
  const cards=document.createElement('div'); cards.className='couple'; people.forEach(x=>cards.insertAdjacentHTML('beforeend',card(x,true))); couple.appendChild(cards);
  const kids=[...new Set(people.flatMap(x=>childrenOf(x.id).map(k=>k.id)))].map(id=>state.members.find(x=>x.id===id)).filter(Boolean).filter(k=>!used.has(k.id));
  if(kids.length){ const line=document.createElement('div'); line.className='down-line'; couple.appendChild(line); const row=document.createElement('div'); row.className='children'; kids.forEach(k=>{const child=buildNode(k,depth+1,used); if(child)row.appendChild(child)}); couple.appendChild(row); }
  return couple;
}
function applyScale(){ $('#treeCanvas').style.setProperty('--tree-scale',state.scale); $('#zoomReset').textContent=Math.round(state.scale*100)+'%'; }
$('#zoomIn').onclick=()=>{state.scale=Math.min(1.35,state.scale+.1);applyScale()}; $('#zoomOut').onclick=()=>{state.scale=Math.max(.55,state.scale-.1);applyScale()}; $('#zoomReset').onclick=()=>{state.scale=1;applyScale()}; $('#treeFit').onclick=()=>{state.scale=.75;applyScale()};
function renderMembers(){
  const q=($('#memberSearch')?.value||'').toLowerCase(); const list=state.members.filter(m=>(m.name+' '+m.nickname+' '+m.rank).toLowerCase().includes(q));
  $('#membersGrid').innerHTML=list.map(m=>card(m)).join('')||'<div class="empty">Member tidak ditemukan.</div>';
}
$('#memberSearch').addEventListener('input',renderMembers);
function renderHistory(){
  const fallback=[...state.members].filter(m=>m.joined_date||m.birth_date).sort((a,b)=>new Date(a.joined_date||a.birth_date)-new Date(b.joined_date||b.birth_date));
  const data=state.events.length?state.events:fallback.map(m=>({event_date:m.joined_date||m.birth_date,title:m.name,description:m.bio||'A chapter in the MurphyLaw family story.'}));
  $('#historyGrid').innerHTML=data.map((e,i)=>`<article class="timeline-item"><span>${fmtDate(e.event_date)||'MURPHYLAW'}</span><div><i>${String(i+1).padStart(2,'0')}</i><h3>${esc(e.title||e.name||'Family Event')}</h3><p>${esc(e.description||e.details||'')}</p></div></article>`).join('')||'<div class="empty">Belum ada sejarah keluarga.</div>';
}
function renderGallery(){
  $('#galleryGrid').innerHTML=state.gallery.map(g=>`<figure><img src="${esc(g.image_url||g.photo_path||'assets/gallery-1.svg')}" alt="${esc(g.title||'MurphyLaw memory')}"><figcaption><strong>${esc(g.title||'Family Memory')}</strong><span>${esc(g.description||'')}</span></figcaption></figure>`).join('')||['gallery-1.svg','gallery-2.svg','gallery-3.svg'].map((x,i)=>`<figure><img src="assets/${x}"><figcaption><strong>MurphyLaw Archive ${i+1}</strong><span>Family memory</span></figcaption></figure>`).join('');
}
function openProfile(id){
 const m=state.members.find(x=>x.id===id); if(!m)return; const partners=partnerOf(id), ps=parentsOf(id), kids=childrenOf(id), sib=siblingsOf(id), rs=relFor(id);
 $('#profileContent').innerHTML=`<div class="profile-hero"><img src="${esc(photo(m))}"><div><span>GENERATION ${esc(m.generation||'—')}</span><h2>${esc(m.name)}</h2>${m.nickname?`<p class="nickname">“${esc(m.nickname)}”</p>`:''}<p>${esc(m.rank||m.status||'MurphyLaw Family')}</p></div></div>
 <div class="profile-grid"><div><small>ABOUT</small><p>${esc(m.bio||'Belum ada biografi untuk anggota ini.')}</p></div><div><small>DETAILS</small><p>${m.birth_date?'Born '+fmtDate(m.birth_date):''}${m.joined_date?' · Joined '+fmtDate(m.joined_date):''}</p></div></div>
 <div class="profile-links"><section><h4>💍 Spouse / Partner</h4>${partners.length?partners.map(x=>`<button data-id="${x.id}">${esc(x.name)}</button>`).join(''): '<p>—</p>'}</section><section><h4>Parents</h4>${ps.length?ps.map(x=>`<button data-id="${x.id}">${esc(x.name)}</button>`).join(''):'<p>—</p>'}</section><section><h4>Children</h4>${kids.length?kids.map(x=>`<button data-id="${x.id}">${esc(x.name)}</button>`).join(''):'<p>—</p>'}</section><section><h4>Siblings</h4>${sib.length?sib.map(x=>`<button data-id="${x.id}">${esc(x.name)}</button>`).join(''):'<p>—</p>'}</section></div>
 <div class="relation-history"><h4>Relationship History</h4>${rs.length?rs.map(r=>{const other=state.members.find(x=>x.id===(r.member_a_id===id?r.member_b_id:r.member_a_id));return `<p><b>${esc(r.relationship_type)}</b> · ${esc(other?.name||'Unknown')} · ${esc(r.status)}${r.start_date?' · '+fmtDate(r.start_date):''}${r.end_date?' — '+fmtDate(r.end_date):''}</p>`}).join(''):'<p>No relationship history recorded.</p>'}</div>`;
 $('#profileModal').classList.remove('hidden');
}
document.addEventListener('click',e=>{const el=e.target.closest('[data-id]');if(el && !e.target.closest('a'))openProfile(el.dataset.id);if(e.target.matches('[data-close]')||e.target.closest('[data-close]'))$('#profileModal').classList.add('hidden')});
document.addEventListener('keydown',e=>{if(e.key==='Escape')$('#profileModal').classList.add('hidden')});
$('#year').textContent=new Date().getFullYear(); load();
