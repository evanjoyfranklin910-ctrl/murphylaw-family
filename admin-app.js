const { createClient } = supabase;
const sb = createClient(ML_CONFIG.SUPABASE_URL, ML_CONFIG.SUPABASE_PUBLISHABLE_KEY);
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
let members = [], editing = null;

async function init(){
  const { data:{session} } = await sb.auth.getSession();
  if(session) await openDash(); else $('#login').classList.remove('hidden');
}
async function openDash(){
  const {data:{user}} = await sb.auth.getUser();
  const {data:admin,error} = await sb.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
  if(error || !admin){ await sb.auth.signOut(); $('#loginMsg').textContent='Akun ini bukan admin.'; return; }
  $('#login').classList.add('hidden'); $('#dash').classList.remove('hidden'); await refresh();
}
$('#loginBtn').onclick=async()=>{
  $('#loginMsg').textContent='';
  const {error}=await sb.auth.signInWithPassword({email:$('#email').value.trim(),password:$('#password').value});
  if(error) $('#loginMsg').textContent=error.message; else await openDash();
};
$('#logout,#logout2').onclick=async e=>{e.preventDefault();await sb.auth.signOut();location.reload()};

async function refresh(){
  const [m,p,r,e,g]=await Promise.all([
    sb.from('members').select('*').order('generation').order('name'),
    sb.from('member_parents').select('*'),
    sb.from('member_relationships').select('*').order('created_at'),
    sb.from('events').select('*').order('sort_order'),
    sb.from('gallery').select('*').order('sort_order')
  ]);
  if(m.error||p.error||r.error||e.error||g.error){
    console.error(m.error,p.error,r.error,e.error,g.error);
    alert('Gagal mengambil data. Pastikan schema-v2.sql sudah dijalankan.'); return;
  }
  members=m.data||[]; window.parents=p.data||[]; window.relationships=r.data||[];
  renderMembers(); renderRelationships(); renderEvents(e.data||[]); renderGallery(g.data||[]); fillParents(); fillRelationshipMembers();
}
function fillParents(selected=[]){
  $('#parents').innerHTML=members.map(m=>`<option value="${m.id}" ${selected.includes(m.id)?'selected':''}>${esc(m.name)}</option>`).join('');
}
function fillRelationshipMembers(){
  const opts='<option value="">Pilih anggota</option>'+members.map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join('');
  $('#relA').innerHTML=opts; $('#relB').innerHTML=opts;
}
function renderMembers(){
  const parents=window.parents||[];
  $('#memberRows').innerHTML=members.map(m=>{
    const ps=parents.filter(p=>p.member_id===m.id).map(p=>members.find(x=>x.id===p.parent_id)?.name).filter(Boolean).join(', ')||'—';
    return `<div class="row"><b>${esc(m.name)}</b><span>${esc(m.rank)}</span><span>Gen. ${m.generation}</span><span>${esc(ps)}</span><span><button class="btn-admin secondary" onclick="editMember('${m.id}')">Edit</button> <button class="btn-admin danger" onclick="deleteMember('${m.id}')">Hapus</button></span></div>`;
  }).join('')||'<p style="color:#999">Belum ada anggota.</p>';
}
function relLabel(type){return ({spouse:'Menikah / Pasangan',partner:'Pasangan',sibling:'Saudara'})[type]||type}
function renderRelationships(){
  $('#relationshipRows').innerHTML=(window.relationships||[]).map(r=>{
    const a=members.find(m=>m.id===r.member_a_id)?.name||'—', b=members.find(m=>m.id===r.member_b_id)?.name||'—';
    const dates=[r.start_date?new Date(r.start_date).toLocaleDateString('id-ID'):'',r.end_date?new Date(r.end_date).toLocaleDateString('id-ID'):''].filter(Boolean).join(' → ');
    return `<div class="row rel-row"><b>${esc(a)}</b><span>↔ ${esc(relLabel(r.relationship_type))}</span><b>${esc(b)}</b><span>${esc(r.status)}${dates?' • '+esc(dates):''}</span><button class="btn-admin danger" onclick="deleteRelationship('${r.id}')">Hapus</button></div>`;
  }).join('')||'<p style="color:#999">Belum ada hubungan pasangan/saudara.</p>';
}
window.deleteRelationship=async id=>{if(!confirm('Hapus hubungan ini?'))return;const {error}=await sb.from('member_relationships').delete().eq('id',id);if(error)alert(error.message);else refresh()};
$('#saveRelationship').onclick=async()=>{
  const a=$('#relA').value,b=$('#relB').value,type=$('#relType').value;
  if(!a||!b||a===b){alert('Pilih dua anggota yang berbeda.');return;}
  const payload={member_a_id:a,member_b_id:b,relationship_type:type,status:$('#relStatus').value,start_date:$('#relStart').value||null,end_date:$('#relEnd').value||null,notes:$('#relNotes').value.trim()};
  const {error}=await sb.from('member_relationships').insert(payload); if(error)alert(error.message); else {alert('Hubungan tersimpan.');$('#relA').value='';$('#relB').value='';$('#relStart').value='';$('#relEnd').value='';$('#relNotes').value='';await refresh()}
};

window.editMember=async id=>{
  const m=members.find(x=>x.id===id);if(!m)return;editing=id;$('#memberTitle').textContent='Edit Anggota';
  $('#name').value=m.name;$('#nickname').value=m.nickname||'';$('#rank').value=m.rank;$('#generation').value=m.generation;$('#status').value=m.status;$('#origin').value=m.origin;$('#relation').value=m.relation;$('#birthDate').value=m.birth_date||'';$('#joinedDate').value=m.joined_date||'';$('#bio').value=m.bio;fillParents((window.parents||[]).filter(p=>p.member_id===id).map(p=>p.parent_id));$('#cancel').classList.remove('hidden');scrollTo({top:250,behavior:'smooth'});
};
window.deleteMember=async id=>{const m=members.find(x=>x.id===id);if(!confirm(`Hapus ${m.name}? Hubungan dan relasi anak juga dapat ikut terhapus.`))return;const {error}=await sb.from('members').delete().eq('id',id);if(error)alert(error.message);else refresh()};
$('#cancel').onclick=()=>{editing=null;$('#memberTitle').textContent='Tambah Anggota';['name','nickname','rank','birthDate','joinedDate','relation','bio'].forEach(id=>$('#'+id).value='');$('#generation').value=1;$('#status').value='Active';$('#origin').value='France';$('#photoFile').value='';fillParents();$('#cancel').classList.add('hidden')};
async function uploadPhoto(file){if(!file)return null;const ext=(file.name.split('.').pop()||'jpg').toLowerCase();const path=`members/${crypto.randomUUID()}.${ext}`;const {error}=await sb.storage.from('family-photos').upload(path,file,{contentType:file.type,upsert:false});if(error)throw error;return path}
$('#saveMember').onclick=async()=>{
 const name=$('#name').value.trim(),rank=$('#rank').value.trim();if(!name||!rank){alert('Nama dan jabatan wajib.');return}
 try{
  let photoPath=null;if($('#photoFile').files[0])photoPath=await uploadPhoto($('#photoFile').files[0]);
  const payload={name,nickname:$('#nickname').value.trim(),rank,generation:Number($('#generation').value)||1,status:$('#status').value.trim(),origin:$('#origin').value.trim(),relation:$('#relation').value.trim(),birth_date:$('#birthDate').value||null,joined_date:$('#joinedDate').value||null,bio:$('#bio').value.trim()};if(photoPath)payload.photo_path=photoPath;
  let id=editing;
  if(editing){const {error}=await sb.from('members').update(payload).eq('id',editing);if(error)throw error;await sb.from('member_parents').delete().eq('member_id',editing)}
  else{const {data,error}=await sb.from('members').insert(payload).select('id').single();if(error)throw error;id=data.id}
  const ps=[...$('#parents').selectedOptions].map(o=>({member_id:id,parent_id:o.value}));if(ps.length){const {error}=await sb.from('member_parents').insert(ps);if(error)throw error}
  alert('Anggota tersimpan.');$('#cancel').click();await refresh();
 }catch(e){alert(e.message)}
};
function renderEvents(list){$('#events').innerHTML=list.map(e=>`<div class="form-grid event-row" data-id="${e.id}" style="margin-bottom:15px"><div class="field"><label>Tahun</label><input class="ey" value="${esc(e.year)}"></div><div class="field"><label>Judul</label><input class="et" value="${esc(e.title)}"></div><div class="field full"><label>Cerita</label><textarea class="eb">${esc(e.body)}</textarea></div><button class="btn-admin danger remove-event">Hapus</button></div>`).join('')}
$('#addEvent').onclick=()=>{$('#events').insertAdjacentHTML('beforeend',`<div class="form-grid event-row new" style="margin-bottom:15px"><div class="field"><label>Tahun</label><input class="ey" value="2026"><label>Judul</label><input class="et"><label>Cerita</label><textarea class="eb"></textarea></div><button class="btn-admin danger remove-event">Hapus</button></div>`);bindRemove()};
function bindRemove(){document.querySelectorAll('.remove-event').forEach(b=>b.onclick=()=>b.parentElement.remove())}bindRemove();
$('#saveEvents').onclick=async()=>{try{const {data:old}=await sb.from('events').select('id');for(const id of (old||[]).map(x=>x.id))await sb.from('events').delete().eq('id',id);const rows=[...document.querySelectorAll('.event-row')];const payload=rows.map((r,i)=>({year:r.querySelector('.ey').value,title:r.querySelector('.et').value,body:r.querySelector('.eb').value,sort_order:i})).filter(x=>x.title);if(payload.length)await sb.from('events').insert(payload);alert('History tersimpan.');refresh()}catch(e){alert(e.message)}};
function renderGallery(list){$('#gallery').innerHTML=list.map(g=>`<div class="form-grid gallery-row" data-id="${g.id}" style="margin-bottom:15px"><div class="field"><label>Judul</label><input class="gt" value="${esc(g.title)}"></div><div class="field"><label>Gambar</label><input class="gf" type="file" accept="image/*"></div><div class="field"><label>Path saat ini</label><input class="gp" value="${esc(g.image_path)}"></div><button class="btn-admin danger remove-gallery">Hapus</button></div>`).join('')}
$('#addGallery').onclick=()=>{$('#gallery').insertAdjacentHTML('beforeend',`<div class="form-grid gallery-row new" style="margin-bottom:15px"><div class="field"><label>Judul</label><input class="gt"><label>Gambar</label><input class="gf" type="file" accept="image/*"><label>Path</label><input class="gp"></div><button class="btn-admin danger remove-gallery">Hapus</button></div>`);bindGalleryRemove()};
function bindGalleryRemove(){document.querySelectorAll('.remove-gallery').forEach(b=>b.onclick=()=>b.parentElement.remove())}bindGalleryRemove();
$('#saveGallery').onclick=async()=>{try{const rows=[...document.querySelectorAll('.gallery-row')];for(const r of rows){const id=r.dataset.id,file=r.querySelector('.gf').files[0];let path=r.querySelector('.gp').value.trim();if(file)path=await uploadPhoto(file);if(!path)continue;const payload={title:r.querySelector('.gt').value.trim()||'Family Moment',image_path:path,sort_order:rows.indexOf(r)};if(id)await sb.from('gallery').update(payload).eq('id',id);else await sb.from('gallery').insert(payload)}alert('Gallery tersimpan.');refresh()}catch(e){alert(e.message)}};
init();
