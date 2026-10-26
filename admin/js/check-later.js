(function(){
  "use strict";
  const supabaseClient=window.supabase.createClient(window.SUPABASE_CONFIG.url,window.SUPABASE_CONFIG.anonKey);
  const INSTAGRAM_CATEGORIES=["Instagram","Instagram DM"];
  const OTHER_CATEGORIES=["WhatsApp","Google Maps","YouTube","Google Meet","Friend","Referral","Website","Phone","Email","Other"];
  const allDefaultCategories=[...INSTAGRAM_CATEGORIES,...OTHER_CATEGORIES];
  let entries=[],selectedCategory=null,score=5;
  const $=id=>document.getElementById(id);
  const escapeHtml=v=>String(v??"").replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  function scoreClass(n){return n>=8?'score-high':n>=6?'score-good':n>=4?'score-mid':'score-low';}
  function scoreLabel(n){return n>=8?'High potential':n>=6?'Good potential':n>=4?'Moderate':'Low potential';}
  function categoryList(){return [...new Set([...allDefaultCategories,...entries.map(e=>e.source_category).filter(Boolean)])];}
  function averageScore(list){if(!list.length)return 0;return (list.reduce((a,e)=>a+Number(e.potential_score||0),0)/list.length).toFixed(1);}
  function renderStats(){
    const total=entries.length,high=entries.filter(e=>e.potential_score>=8).length,avg=averageScore(entries);
    $('checkLaterStats').innerHTML=`<div class="stat"><span class="num">${total}</span><span class="lbl">Saved people</span></div><div class="stat"><span class="num">${high}</span><span class="lbl">High potential</span></div><div class="stat"><span class="num">${avg||'—'}</span><span class="lbl">Average potential</span></div>`;
  }
  function categoryCard(cat){
    const list=entries.filter(e=>e.source_category===cat),avg=averageScore(list);
    return `<button class="category-card" type="button" data-category="${escapeHtml(cat)}"><div class="cat-name">${escapeHtml(cat)}</div><div class="cat-count">${list.length}</div><div class="cat-meta">${list.length===1?'person':'people'}${avg?` · avg ${avg}/10`:''}</div>${avg?`<span class="cat-score ${scoreClass(Math.round(Number(avg)))}">${scoreLabel(Math.round(Number(avg)))}</span>`:''}</button>`;
  }
  function renderCategories(){
    const custom=categoryList().filter(c=>!allDefaultCategories.includes(c));
    $('instagramCategories').innerHTML=INSTAGRAM_CATEGORIES.map(categoryCard).join('');
    $('otherCategories').innerHTML=[...OTHER_CATEGORIES,...custom].filter((v,i,a)=>a.indexOf(v)===i).map(categoryCard).join('');
    document.querySelectorAll('.category-card').forEach(btn=>btn.addEventListener('click',()=>openCategory(btn.dataset.category)));
  }
  function renderCategoryEntries(){
    if(!selectedCategory)return;
    const q=$('checkLaterSearch').value.trim().toLowerCase();
    const list=entries.filter(e=>e.source_category===selectedCategory && (!q || [e.name,e.note,e.contact,e.source_category].some(v=>(v||'').toLowerCase().includes(q))));
    $('panelTitle').textContent=selectedCategory;
    $('panelSummary').textContent=`${list.length} ${list.length===1?'person':'people'} saved here${list.length?' · Average potential '+averageScore(list)+'/10':''}`;
    $('categoryEntries').innerHTML=list.length?`<div class="lead-list">${list.map(leadCard).join('')}</div>`:`<div class="empty-category">No saved people in this category${q?' matching your search':''}.</div>`;
    $('categoryEntries').querySelectorAll('[data-delete]').forEach(b=>b.addEventListener('click',()=>deleteEntry(b.dataset.delete)));
    $('categoryEntries').querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>editEntry(b.dataset.edit)));
  }
  function leadCard(e){
    const score=Number(e.potential_score||5), url=(e.profile_url||'').trim();
    return `<article class="lead-card"><div class="lead-main"><div class="lead-name">${escapeHtml(e.name)}</div><div class="lead-note">${escapeHtml(e.note||'No note added.')}</div><div class="lead-meta"><span class="lead-tag">${escapeHtml(e.source_category)}</span>${e.contact?`<span class="lead-tag">${escapeHtml(e.contact)}</span>`:''}<span class="lead-tag">Added ${new Date(e.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span></div><div class="lead-actions">${url?`<a href="${escapeHtml(url)}" target="_blank" rel="noopener">Open profile</a>`:''}<button type="button" data-edit="${e.id}">Edit</button><button type="button" class="danger" data-delete="${e.id}">Delete</button></div></div><span class="lead-score ${scoreClass(score)}">${score}/10 · ${scoreLabel(score)}</span></article>`;
  }
  function openCategory(cat){selectedCategory=cat;$('categoryPanel').hidden=false;renderCategoryEntries();$('categoryPanel').scrollIntoView({behavior:'smooth',block:'start'});}
  function closeCategory(){selectedCategory=null;$('categoryPanel').hidden=true;}
  function populateCategorySelect(selected){
    const categories=categoryList();
    $('entryCategory').innerHTML=categories.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    if(selected && categories.includes(selected))$('entryCategory').value=selected;
  }
  function setScore(n){score=n;$('scoreValue').textContent=n+'/10';document.querySelectorAll('.score-btn').forEach(b=>b.classList.toggle('selected',Number(b.dataset.score)===n));}
  function buildScorePicker(){$('scorePicker').innerHTML=Array.from({length:10},(_,i)=>`<button type="button" class="score-btn" data-score="${i+1}">${i+1}</button>`).join('');document.querySelectorAll('.score-btn').forEach(b=>b.addEventListener('click',()=>setScore(Number(b.dataset.score))));setScore(5);}
  function openModal(prefill){
    $('entryModal').hidden=false;$('formError').textContent='';populateCategorySelect(prefill?.source_category||selectedCategory||'Instagram');buildScorePicker();
    $('entryName').value=prefill?.name||'';$('entryUrl').value=prefill?.profile_url||'';$('entryContact').value=prefill?.contact||'';$('entryNote').value=prefill?.note||'';setScore(Number(prefill?.potential_score||5));
    $('entryForm').dataset.editId=prefill?.id||'';document.body.style.overflow='hidden';setTimeout(()=>$('entryName').focus(),50);
  }
  function closeModal(){$('entryModal').hidden=true;$('entryForm').reset();$('entryForm').dataset.editId='';document.body.style.overflow='';setScore(5);}
  async function saveEntry(ev){
    ev.preventDefault();$('formError').textContent='';
    const payload={name:$('entryName').value.trim(),source_category:$('entryCategory').value,profile_url:$('entryUrl').value.trim()||null,contact:$('entryContact').value.trim()||null,note:$('entryNote').value.trim()||null,potential_score:score};
    if(!payload.name){$('formError').textContent='Name is required.';return;}
    const id=$('entryForm').dataset.editId;
    const {error}=id?await supabaseClient.from('check_later_entries').update(payload).eq('id',id):await supabaseClient.from('check_later_entries').insert(payload);
    if(error){$('formError').textContent='Could not save this person: '+error.message;return;}
    closeModal();await load();if(selectedCategory)renderCategoryEntries();
  }
  async function deleteEntry(id){
    const person=entries.find(e=>e.id===id);if(!person)return;
    if(!confirm(`Remove ${person.name} from Check Later?`))return;
    const {error}=await supabaseClient.from('check_later_entries').delete().eq('id',id);if(error){alert('Could not delete this entry: '+error.message);return;}await load();if(selectedCategory)renderCategoryEntries();
  }
  function editEntry(id){const e=entries.find(x=>x.id===id);if(e)openModal(e);}
  async function load(){
    const {data,error}=await supabaseClient.from('check_later_entries').select('*').order('created_at',{ascending:false});
    if(error){$('categoryEntries').innerHTML=`<div class="empty-category">Could not load Check Later: ${escapeHtml(error.message)}</div>`;return;}
    entries=data||[];renderStats();renderCategories();if(selectedCategory)renderCategoryEntries();
  }
  $('logoutBtn').addEventListener('click',()=>window.AdminAuth.logout());
  $('addCheckLaterBtn').addEventListener('click',()=>openModal());
  $('closeModalBtn').addEventListener('click',closeModal);
  $('closePanelBtn').addEventListener('click',closeCategory);
  $('entryForm').addEventListener('submit',saveEntry);
  document.querySelectorAll('[data-close-modal]').forEach(el=>el.addEventListener('click',closeModal));
  $('addCategoryBtn').addEventListener('click',()=>{
    const name=prompt('Name your new Check Later category:');
    const clean=(name||'').trim();if(!clean)return;
    populateCategorySelect(clean);openModal();$('entryCategory').value=clean;
  });
  $('checkLaterSearch').addEventListener('input',()=>{if(selectedCategory)renderCategoryEntries();});
  window.AdminAuth.requireSession().then(load).catch(()=>{});
})();
