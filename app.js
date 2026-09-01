const {createClient}=supabase;
const client=createClient(ML_CONFIG.SUPABASE_URL,ML_CONFIG.SUPABASE_PUBLISHABLE_KEY);
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
function publicUrl(path){if(!path)return "";if(/^https?:\/\//.test(path))return path;return client.storage.from("family-photos").getPublicUrl(path).data.publicUrl}
function img(path,alt=""){const src=publicUrl(path);return `<img class="portrait" src="${src||'assets/founder.svg'}" onerror="this.src='assets/founder.svg'" alt="${esc(alt)}">`}
let members=[],parents=[],events=[],gallery=[];
async function load(){
 const [m,p,e,g]=await Promise.all([
  client.from("members").select("*").order("generation").order("name"),
  client.from("member_parents").select("*"),
  client.from("events").select("*").order("sort_order").order("created_at"),
  client.from("gallery").select("*").order("sort_order").order("created_at")
 ]);
 if(m.error||p.error||e.error||g.error){console.error(m.error,p.error,e.error,g.error);alert("Database belum terhubung. Cek config.js dan SQL Supabase.");return}
 members=m.data||[];parents=p.data||[];events=e.data||[];gallery=g.data||[];
 render();
}
function card(m,tree=false){return `<article class="${tree?'tree-card':'member-card'}" data-id="${m.id}">${img(m.photo_path,m.name)}<h3>${esc(m.name)}</h3><div class="rank">${esc(m.rank)}</div>${tree?'':`<p>${esc(m.bio)}</p>`}</article>`}
function renderTree(){const gens=[...new Set(members.map(m=>m.generation))].sort((a,b)=>a-b);$("#treeRoot").innerHTML=gens.map((g,i)=>`${i?'<div class="connector"></div>':''}<div class="generation">${members.filter(m=>m.generation===g).map(m=>card(m,true)).join("")}</div>`).join("")||"<p>Belum ada anggota.</p>"}
function renderMembers(){const q=$("#search").value.toLowerCase(),r=$("#rankFilter").value;const list=members.filter(m=>(m.name.toLowerCase().includes(q)||m.rank.toLowerCase().includes(q))&&(!r||m.rank===r));$("#memberGrid").innerHTML=list.map(m=>card(m)).join("")||"<p>Tidak ditemukan.</p>"}
function renderHistory(){$("#timeline").innerHTML=events.map(e=>`<article class="event"><div class="year">${esc(e.year)}</div><h3>${esc(e.title)}</h3><p>${esc(e.body)}</p></article>`).join("")||"<p>Belum ada history.</p>"}
function renderGallery(){$("#galleryGrid").innerHTML=gallery.map(g=>`<figure><img src="${publicUrl(g.image_path)}" onerror="this.src='assets/gallery-1.svg'" alt="${esc(g.title)}"><figcaption>${esc(g.title)}</figcaption></figure>`).join("")||"<p>Belum ada foto.</p>"}
function render(){
 $("#memberCount").textContent=members.length;$("#generationCount").textContent=new Set(members.map(m=>m.generation)).size;$("#eventCount").textContent=events.length;
 $("#rankFilter").innerHTML='<option value="">Semua jabatan</option>'+[...new Set(members.map(m=>m.rank))].sort().map(r=>`<option>${esc(r)}</option>`).join("");
 renderTree();renderMembers();renderHistory();renderGallery();
}
function profile(id){const m=members.find(x=>x.id===id);if(!m)return;const ps=parents.filter(p=>p.member_id===id).map(p=>members.find(x=>x.id===p.parent_id)?.name).filter(Boolean).join(", ")||"—";$("#modalBody").innerHTML=`<div class="profile">${img(m.photo_path,m.name)}<div><p class="eyebrow">${esc(m.rank)}</p><h2>${esc(m.name)}</h2><p class="bio">${esc(m.bio)}</p><dl><dt>Status</dt><dd>${esc(m.status)}</dd><dt>Generasi</dt><dd>${m.generation}</dd><dt>Asal</dt><dd>${esc(m.origin)}</dd><dt>Orang Tua</dt><dd>${esc(ps)}</dd><dt>Hubungan</dt><dd>${esc(m.relation)}</dd></dl></div></div>`;$("#modal").classList.add("open")}
document.addEventListener("click",e=>{const c=e.target.closest("[data-id]");if(c)profile(c.dataset.id)});
$("#closeModal").onclick=()=>$("#modal").classList.remove("open");$("#modal").onclick=e=>{if(e.target===$("#modal"))$("#modal").classList.remove("open")};
$("#search").oninput=renderMembers;$("#rankFilter").onchange=renderMembers;
load();
