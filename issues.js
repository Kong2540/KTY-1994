/* =====================================================================
   แจ้งปัญหา — ทุกเรื่อง ส่งตรงถึงผู้บริหาร (ฟอร์มแก้ได้ที่ ตัวสร้างฟอร์ม > แจ้งปัญหา)
   ===================================================================== */
const ISS_CATS_DEF=['หน้างาน/ความปลอดภัย','เครื่องจักร/อุปกรณ์','วัสดุ','คนงาน/แรงงาน','เงินเดือน/สวัสดิการ','ลูกค้า/ผู้รับเหมา','ข้อเสนอแนะ','อื่น ๆ'];
const ISS_URG={normal:['ปกติ','#64748B'],urgent:['ด่วน','#D97706'],critical:['ด่วนมาก/อันตราย','#DC2626']};
const ISS_ST={new:['ใหม่','t-bad'],acknowledged:['รับเรื่อง','t-acc'],in_progress:['กำลังแก้ไข','t-warn'],resolved:['แก้แล้ว รอยืนยัน','t-ok'],closed:['ปิดเรื่อง','']};
const issCats=()=>{ const l=S.settings.daily_lists?.issue_cats; return l&&l.length?l:ISS_CATS_DEF; };
let ISS_PREFILL=null, ISS_F={st:'open',cat:'',site:'',mine:false}, ISS_SEL=null;
const issPhotoUrls=async paths=>{ if(!paths?.length) return {}; const {data}=await sb.storage.from('issue-photos').createSignedUrls(paths,3600); const o={}; (data||[]).forEach(x=>{ if(x.signedUrl) o[x.path]=x.signedUrl; }); return o; };

async function pageIss(a,b){
  if(a==='new') return issueForm();
  if(a&&/^\d+$/.test(a)) return issueDetailPage(+a);
  return issueList();
}

/* ---------- ฟอร์มแจ้งปัญหา ---------- */
function issueForm(){
  const FIELDS=formOf('issue'), pre=ISS_PREFILL||{}; ISS_PREFILL=null;
  const pMin=photoMin(formOf('issue'),'photos',0), pMax=photoMax(formOf('issue'),'photos',6);
  const F={category:pre.category||'',urgency:pre.urgency||'normal',site_id:pre.site_id||(S.site?+S.site:''),title:pre.title||'',detail:pre.detail||'',extra:{},photos:[],source_daily:pre.source_daily||null}, FX={};
  setPage(head('แจ้งปัญหา','ส่งตรงถึงผู้บริหาร',{back:'#iss'})+'<div id="isf" class="col" style="gap:14px;max-width:720px"></div><div class="savebar" id="isbar"></div>');
  const mgr=isManager(), simple=!mgr&&S.profile.role!=='foreman';   // พนักงาน: พิมพ์ข้อความ + รูปเท่านั้น
  const host=$('#isf'), sites=S.sites.filter(s=>s.status==='active'&&(mgr||mySiteIds().includes(s.id)));
  if(!mgr&&!simple){ if(F.site_id&&!sites.some(s=>s.id===+F.site_id)) F.site_id=''; if(!F.site_id&&sites.length===1) F.site_id=sites[0].id; }
  const projName=s=>s.contract_name||s.name, siteSub=s=>[s.code,s.location].filter(Boolean).join(' · ');
  const req=f=>f.required?' <span style="color:var(--bad)">*</span>':'', hlp=f=>f.help?`<span class="hint">${esc(f.help)}</span>`:'';
  const B={
    category:f=>`<div class="field"><label>${esc(f.label)}${req(f)}</label><div class="chips">${issCats().map(c=>`<button type="button" class="chip ${F.category===c?'on':''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div>${hlp(f)}</div>`,
    urgency:f=>`<div class="field"><label>${esc(f.label)}${req(f)}</label><div class="seg">${Object.entries(ISS_URG).map(([k,[t,c]])=>`<button type="button" class="${F.urgency===k?'on':''}" data-urg="${k}" style="${k!=='normal'?`color:${c}`:''}">${t}</button>`).join('')}</div>${hlp(f)}</div>`,
    site_id:f=>mgr?`<div class="field"><label for="is_site">${esc(f.label)}${req(f)}</label><select class="in" id="is_site"><option value="">— ไม่ระบุ —</option>${sites.map(s=>`<option value="${s.id}" ${+F.site_id===s.id?'selected':''}>${esc(projName(s))}${siteSub(s)?` · ${esc(siteSub(s))}`:''}</option>`).join('')}</select>${hlp(f)}</div>`
      :`<div class="field"><label>โครงการ / ไซต์งาน${req(f)}</label>${sites.length?`<div class="iss-sites">${sites.map(s=>`<button type="button" class="iss-site ${+F.site_id===s.id?'on':''}" data-site="${s.id}"><b>${esc(projName(s))}</b>${siteSub(s)?`<span class="xs muted">${esc(siteSub(s))}</span>`:''}</button>`).join('')}</div><span class="hint">แสดงเฉพาะไซต์ที่คุณดูแล (${sites.length} ไซต์)</span>`:'<span class="hint">ยังไม่ได้รับสิทธิ์ดูแลไซต์ใด · ส่งได้โดยไม่ระบุไซต์</span>'}${hlp(f)}</div>`,
    title:f=>`<div class="field"><label for="is_t">${esc(f.label)}${req(f)}</label><input class="in" id="is_t" maxlength="140" value="${esc(F.title)}" placeholder="สรุปปัญหาสั้น ๆ">${hlp(f)}</div>`,
    detail:f=>`<div class="field"><label for="is_d">${esc(f.label)}${req(f)}</label><textarea class="in" id="is_d" rows="5" placeholder="เกิดอะไรขึ้น ที่ไหน กระทบงานอย่างไร">${esc(F.detail)}</textarea>${hlp(f)}</div>`,
    photos:f=>`<div class="field"><label>${esc(f.label)}${pMin?' <span style="color:var(--bad)">*</span>':''} <span class="muted" style="${F.photos.length<pMin?'color:var(--bad)':''}">${F.photos.length}${pMin?` / ขั้นต่ำ ${pMin}`:` / ${pMax}`}</span></label><div class="pgrid">${F.photos.map((p,i)=>`<div class="pthumb"><img src="${p.url}" alt=""><button type="button" data-delp="${i}" aria-label="ลบรูป">×</button></div>`).join('')}${F.photos.length<pMax?`<label class="pthumb padd">${IC.camera}<span class="xs">เพิ่มรูป</span><input type="file" accept="image/*" multiple hidden data-ph></label>`:''}</div>${hlp(f)}</div>`
  };
  const keep=()=>{ const t=$('#is_t'), d=$('#is_d'), s=$('#is_site'); if(t) F.title=t.value; if(d) F.detail=d.value; if(s) F.site_id=s.value; };
  const SIMPLE_KEYS=['detail','photos'];
  const draw=()=>{ host.innerHTML=(simple?`<div class="note n-info">${IC.lock||IC.info}<span><b>เห็นเฉพาะผู้บริหารและผู้ที่แอดมินกำหนด</b> · เพื่อนร่วมงานและหัวหน้างานไม่เห็นเรื่องนี้</span></div><div class="field"><label for="is_d">เรื่องที่ต้องการแจ้ง <span style="color:var(--bad)">*</span></label><textarea class="in" id="is_d" rows="9" placeholder="พิมพ์เล่าได้เต็มที่ เกิดอะไรขึ้น ที่ไหน เมื่อไร">${esc(F.detail)}</textarea></div>`+FIELDS.filter(f=>f.key==='photos').map(f=>B.photos(f)).join('')
      :FIELDS.filter(f=>!(simple&&!SIMPLE_KEYS.includes(f.key))).map(f=>B[f.key]?B[f.key](f):cfHTML(f,F.extra[f.key])).join(''))+(simple?'':`<span class="xs muted">ผู้บริหารได้รับแจ้งเตือนในแอปทันที · ส่งแล้วแชร์ใบแจ้งปัญหาเข้า LINE ได้</span>`);
    $$('[data-cat]',host).forEach(b=>b.onclick=()=>{ keep(); F.category=b.dataset.cat; draw(); });
    $$('[data-site]',host).forEach(b=>b.onclick=()=>{ keep(); F.site_id=+F.site_id===+b.dataset.site?'':+b.dataset.site; draw(); });
    $$('[data-urg]',host).forEach(b=>b.onclick=()=>{ keep(); F.urgency=b.dataset.urg; draw(); });
    $$('[data-delp]',host).forEach(b=>b.onclick=()=>{ keep(); F.photos.splice(+b.dataset.delp,1); draw(); });
    const ph=$('[data-ph]',host); if(ph) ph.onchange=async()=>{ keep(); for(const f of [...ph.files].slice(0,pMax-F.photos.length)){ const bl=await resizeImage(f,1600); F.photos.push({blob:bl,url:URL.createObjectURL(bl)}); } draw(); };
    cfBind(host,F.extra,()=>{ keep(); draw(); },FX); };
  draw();
  $('#isbar').innerHTML=`<span class="sm muted grow">${simple?'ส่งเข้าระบบ ไม่ส่งเข้า LINE':`แจ้งในนาม ${esc(S.profile.display_name)}`}</span><button class="btn btn-p" id="isgo">ส่งถึงผู้บริหาร</button>`;
  $('#isgo').onclick=async ev=>{ keep(); cfCollectSignatures(F.extra);
    const fd=k=>FIELDS.find(x=>x.key===k);
    if(simple){ if(!F.detail.trim()) return toast('พิมพ์เรื่องที่ต้องการแจ้ง',true);
      const first=F.detail.trim().split('\n')[0].trim(); F.title=first.length>80?first.slice(0,78)+'…':first; F.category='จากพนักงาน'; F.urgency='normal'; F.site_id=''; }
    if(!simple&&fd('category')?.required!==0&&!F.category) return toast('เลือกหมวด',true);
    if(!F.title.trim()) return toast('กรอกหัวข้อ',true);
    if(fd('detail')?.required&&!F.detail.trim()) return toast('กรอกรายละเอียด',true);
    if(fd('site_id')?.required&&!F.site_id) return toast('เลือกไซต์',true);
    if(F.photos.length<pMin) return toast(`ต้องแนบรูปอย่างน้อย ${pMin} รูป`,true);
    const cv=simple?null:cfValidate(FIELDS,F.extra); if(cv) return toast(cv,true);
    busy(ev.target,true,'กำลังส่ง...');
    try{
      const {data,error}=await sb.rpc('create_issue',{p:{category:F.category||'อื่น ๆ',urgency:F.urgency,site_id:F.site_id||null,title:F.title.trim(),detail:F.detail.trim(),extra:simple?{}:cfStrip(F.extra),source_daily:F.source_daily}});
      if(error) throw error;
      const paths=[]; for(let i=0;i<F.photos.length;i++){ const path=`${data.id}/${Date.now()}_${i+1}.jpg`; const {error:e2}=await sb.storage.from('issue-photos').upload(path,F.photos[i].blob,{contentType:'image/jpeg'}); if(!e2) paths.push(path); }
      if(paths.length) await sb.rpc('set_issue_photos',{p_id:data.id,p_photos:paths});
      if(!simple&&FIELDS.some(f=>!f.core&&f.type==='photos'&&(F.extra[f.key]||[]).length)){ await cfUploadPhotoSets(FIELDS,F.extra,async(bl,f,i)=>{ const path=`${data.id}/${f.key}_${Date.now()}_${i+1}.jpg`; const {error:e3}=await sb.storage.from('issue-photos').upload(path,bl,{contentType:'image/jpeg'}); return e3?null:{path}; }); await sb.rpc('issue_merge_extra',{p_id:data.id,p:cfStrip(F.extra)}); }
      toast(`ส่งเรื่อง ${data.issue_no} ถึงผู้บริหารแล้ว`); location.hash='#iss/'+data.id; if(!simple) setTimeout(()=>issueShare(data.id),500);
    }catch(e){ busy(ev.target,false); toast(/create_issue/.test(e.message||'')?'ยังไม่ได้รันไฟล์ 20_issues.sql':errText(e),true); }
  };
}

/* ---------- รายการ / กล่องเรื่อง ---------- */
async function issueList(){
  const mgr=isManager(), wide=matchMedia('(min-width:1100px)').matches, simple=!mgr&&S.profile.role!=='foreman', mySites=mgr?S.sites:S.sites.filter(x=>mySiteIds().includes(x.id));
  if(simple){ ISS_F.cat=''; ISS_F.site=''; } else if(!mgr&&ISS_F.site&&!mySites.some(x=>String(x.id)===ISS_F.site)) ISS_F.site='';
  setPage(head('แจ้งปัญหา',mgr?'กล่องเรื่องจากทุกคน':simple?'แจ้งเรื่องถึงผู้บริหารโดยตรง':'เรื่องที่ฉันแจ้งและได้รับมอบหมาย',{dActions:'<a href="#iss/new" class="btn btn-p">+ แจ้งปัญหา</a>',mActions:'<a href="#iss/new" class="btn btn-sm btn-acc">+ แจ้ง</a>'})+'<div id="isl"><div class="loading"><div class="spin"></div></div></div>');
  const [is,rd]=await Promise.all([ sb.from('issues').select('*').order('created_at',{ascending:false}).limit(300), sb.from('issue_reads').select('issue_id,read_at') ]);
  if(is.error){ $('#isl').outerHTML=/issues/.test(is.error.message)&&/exist|relation/.test(is.error.message)?'<div class="card empty"><b>ยังไม่ได้อัปเดตฐานข้อมูล</b>รันไฟล์ 20_issues.sql</div>':`<div class="note n-bad">${esc(errText(is.error))}</div>`; return; }
  const reads={}; (rd.data||[]).forEach(r=>reads[r.issue_id]=r.read_at);
  const all=is.data||[], me=S.profile.id, unread=i=>i.last_actor&&i.last_actor!==me&&(!reads[i.id]||i.updated_at>reads[i.id]);
  const open=all.filter(i=>i.status!=='closed'), today=localISO(), month=today.slice(0,7);
  const closedM=all.filter(i=>i.closed_at&&i.closed_at.slice(0,7)===month), avg=closedM.length?(closedM.reduce((a,i)=>a+(new Date(i.closed_at)-new Date(i.created_at)),0)/closedM.length/86400000):0;
  const H=$('#isl'); H.outerHTML='<div id="isl" class="col" style="gap:12px"></div>'; const host=$('#isl');
  const urgRank={critical:0,urgent:1,normal:2};
  const draw=()=>{
    let L=all.filter(i=>(ISS_F.st==='open'?i.status!=='closed':ISS_F.st==='closed'?i.status==='closed':true)&&(!ISS_F.cat||i.category===ISS_F.cat)&&(!ISS_F.site||String(i.site_id)===ISS_F.site)&&(!ISS_F.mine||i.assignee===me||i.reporter===me));
    L.sort((a,b)=>(a.status==='closed')-(b.status==='closed')||urgRank[a.urgency]-urgRank[b.urgency]||(a.status==='new'?0:1)-(b.status==='new'?0:1)||b.created_at.localeCompare(a.created_at));
    const row=i=>{ const [ut,uc]=ISS_URG[i.urgency], [st,sc]=ISS_ST[i.status], site=S.sites.find(s=>s.id===i.site_id), over=i.due_date&&i.due_date<today&&i.status!=='closed'&&i.status!=='resolved';
      return `<a href="#iss/${i.id}" class="li isrow ${ISS_SEL===i.id?'on':''}" data-is="${i.id}" style="text-decoration:none;color:inherit;gap:10px"><span class="isbar" style="background:${uc}"></span><div class="grow" style="min-width:0"><b class="sm">${unread(i)?'<span class="isdot"></span>':''}${esc(i.title)}</b><div class="xs muted">${esc(i.issue_no||'')} · ${esc(i.category)}${site?` · ${esc(site.code||site.name)}`:''} · ${esc(i.reporter_name||'')}</div></div>
        <div style="text-align:right;flex:none"><span class="tag" style="height:20px;font-size:10.5px;background:${uc};color:#fff">${ut}</span><div class="xs" style="margin-top:3px"><span class="tag ${sc}" style="height:18px;font-size:10px">${st}</span></div>${over?'<div class="xs" style="color:var(--bad)">เกินกำหนด</div>':i.assignee_name?`<div class="xs muted">${esc(i.assignee_name)}</div>`:''}</div></a>`; };
    host.innerHTML=`${simple?`<a href="#iss/new" class="card iss-cta" style="text-decoration:none;color:inherit"><span class="iss-cta-ic">${IC.lock||'🔒'}</span><div class="grow"><b>แจ้งเรื่องถึงผู้บริหาร</b><span class="sm muted">พิมพ์เล่าได้เต็มที่ แนบรูปได้ · ผู้อื่นไม่เห็น</span></div><span class="btn btn-p btn-sm">เขียนเรื่อง</span></a><b class="sm" style="margin-top:4px">เรื่องที่ฉันแจ้ง</b>`:''}${mgr?`<div class="statg" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))">${[['ด่วนมาก ยังไม่รับ',open.filter(i=>i.urgency==='critical'&&i.status==='new').length,'var(--bad)'],['เปิดอยู่ทั้งหมด',open.length,'var(--ink)'],['เกินกำหนด',open.filter(i=>i.due_date&&i.due_date<today&&i.status!=='resolved').length,'var(--warn)'],['ปิดแล้วเดือนนี้',closedM.length,'var(--ok)'],['เวลาแก้เฉลี่ย',closedM.length?avg.toFixed(1)+' วัน':'-','var(--ink)']].map(([t,v,c])=>`<div class="stat"><b class="num" style="font-size:22px;color:${c}">${v}</b><span class="sm muted">${t}</span></div>`).join('')}</div>`:''}
      <div class="chips">${[['open',`เปิดอยู่ ${open.length}`],['closed','ปิดแล้ว'],['all','ทั้งหมด']].map(([k,t])=>`<button class="chip ${ISS_F.st===k?'on':''}" data-fs="${k}">${t}</button>`).join('')}${mgr?`<button class="chip ${ISS_F.mine?'on':''}" data-fm>ของฉัน</button>`:''}
        ${simple?'':`<select class="in" id="fcat" style="height:36px;width:auto;max-width:100%"><option value="">ทุกหมวด</option>${[...new Set([...issCats(),...all.map(i=>i.category).filter(Boolean)])].map(c=>`<option ${ISS_F.cat===c?'selected':''}>${esc(c)}</option>`).join('')}</select>
        ${mySites.length>1||mgr?`<select class="in" id="fsite" style="height:36px;width:auto;max-width:100%"><option value="">${mgr?'ทุกไซต์':'ทุกไซต์ที่ดูแล'}</option>${mySites.map(s=>`<option value="${s.id}" ${ISS_F.site===String(s.id)?'selected':''}>${esc(s.code?s.code+' '+(s.contract_name||s.name):(s.contract_name||s.name))}</option>`).join('')}</select>`:''}`}</div>
      <div class="${wide?'issplit':''}"><div class="card card-l" style="padding:4px 8px">${L.map(row).join('')||(simple?'<div class="empty"><b>ยังไม่มีเรื่องที่แจ้ง</b>กด "เขียนเรื่อง" ด้านบนเพื่อแจ้งผู้บริหาร</div>':'<div class="empty"><b>ไม่มีเรื่อง</b>กด "+ แจ้งปัญหา" เพื่อแจ้งเรื่องใหม่</div>')}</div>${wide?'<div id="isdet" class="card">'+(ISS_SEL?'<div class="loading"><div class="spin"></div></div>':'<div class="empty"><b>เลือกเรื่องทางซ้าย</b></div>')+'</div>':''}</div>`;
    $$('[data-fs]',host).forEach(b=>b.onclick=()=>{ ISS_F.st=b.dataset.fs; draw(); });
    const fm=$('[data-fm]',host); if(fm) fm.onclick=()=>{ ISS_F.mine=!ISS_F.mine; draw(); };
    const fc=$('#fcat',host); if(fc) fc.onchange=e=>{ ISS_F.cat=e.target.value; draw(); }; const fsi=$('#fsite',host); if(fsi) fsi.onchange=e=>{ ISS_F.site=e.target.value; draw(); };
    if(wide){ $$('[data-is]',host).forEach(a=>a.onclick=ev=>{ ev.preventDefault(); ISS_SEL=+a.dataset.is; draw(); }); if(ISS_SEL) issueDetail($('#isdet',host),ISS_SEL,()=>issueList()); }
  };
  draw();
}

/* ---------- รายละเอียด ---------- */
function issueDetailPage(id){
  setPage(head('รายละเอียดเรื่อง','',{back:'#iss'})+'<div id="isd" class="card" style="max-width:820px"><div class="loading"><div class="spin"></div></div></div>');
  issueDetail($('#isd'),id,()=>issueDetailPage(id));
}
async function issueDetail(host, id, reload){
  const [is,cm]=await Promise.all([ sb.from('issues').select('*').eq('id',id).maybeSingle(), sb.from('issue_comments').select('*').eq('issue_id',id).order('created_at') ]);
  if(is.error||!is.data){ host.innerHTML='<div class="empty"><b>ไม่พบเรื่อง หรือไม่มีสิทธิ์ดู</b></div>'; return; }
  sb.rpc('mark_issue_read',{p_id:id}).then(()=>{});
  const i=is.data, cms=cm.data||[], mgr=isManager(), canM=mgr||i.assignee===S.profile.id, mine=i.reporter===S.profile.id;
  const setPh=Object.values(i.extra||{}).filter(Array.isArray).flat().map(p=>p&&p.path).filter(Boolean);
  const allPh=[...(i.photos||[]),...cms.flatMap(c=>c.photos||[]),...setPh], urls=await issPhotoUrls(allPh);
  const [ut,uc]=ISS_URG[i.urgency], site=S.sites.find(s=>s.id===i.site_id), F=formOf('issue').filter(f=>!f.core&&i.extra&&cfText(f,i.extra[f.key]));
  const steps=['new','acknowledged','in_progress','resolved','closed'], si=steps.indexOf(i.status);
  const tsOf={new:i.created_at,acknowledged:i.acknowledged_at,resolved:i.resolved_at,closed:i.closed_at};
  let users=[]; if(mgr){ const {data}=await sb.from('profiles').select('id,display_name,role').eq('is_active',true).neq('role','pending').order('display_name'); users=data||[]; }
  host.innerHTML=`<div class="col" style="gap:12px"><div class="row" style="gap:8px;flex-wrap:wrap"><b class="grow" style="font-size:18px">${esc(i.title)}</b><span class="tag" style="background:${uc};color:#fff">${ut}</span><span class="tag ${ISS_ST[i.status][1]}">${ISS_ST[i.status][0]}</span></div>
    <span class="xs muted">${esc(i.issue_no||'')} · ${esc(i.category)}${site?` · ${esc(site.name)}`:''}${!isManager()&&S.profile.role!=='foreman'?'':` · แจ้งโดย ${esc(i.reporter_name||'')}${i.reporter_position?` (${esc(i.reporter_position)})`:''}`} · ${new Date(i.created_at).toLocaleString('th-TH',{dateStyle:'medium',timeStyle:'short'})}${i.reopened?` · เปิดซ้ำ ${i.reopened} ครั้ง`:''}</span>
    ${i.detail?`<div class="sm" style="white-space:pre-wrap">${esc(i.detail)}</div>`:''}
    ${F.length?`<div class="card" style="padding:4px 14px;box-shadow:none">${F.map(f=>`<div class="kv"><span>${esc(f.label)}</span><span>${esc(cfText(f,i.extra[f.key]))}</span></div>`).join('')}</div>`:''}
    ${formOf('issue').filter(f=>!f.core&&f.type==='photos'&&(i.extra?.[f.key]||[]).length).map(f=>`<b class="xs">${esc(f.label)}</b><div class="pgrid">${i.extra[f.key].map(p=>urls[p.path]?`<a class="pthumb" href="${urls[p.path]}" target="_blank" rel="noopener"><img src="${urls[p.path]}" alt=""></a>`:'').join('')}</div>`).join('')}
    ${(i.photos||[]).length?`<div class="pgrid">${i.photos.map(p=>urls[p]?`<a class="pthumb" href="${urls[p]}" target="_blank" rel="noopener"><img src="${urls[p]}" alt=""></a>`:'').join('')}</div>`:''}
    <div class="isst">${steps.map((s,k)=>`<div class="${k<=si?'on':''}"><i></i><b class="xs">${ISS_ST[s][0].replace(' รอยืนยัน','')}</b><span class="xs muted">${tsOf[s]&&k<=si?new Date(tsOf[s]).toLocaleString('th-TH',{dateStyle:'short',timeStyle:'short'}):''}</span></div>`).join('')}</div>
    ${i.assignee_name||i.due_date?`<div class="sm">ผู้รับผิดชอบ: <b>${esc(i.assignee_name||'-')}</b>${i.due_date?` · ต้องเสร็จภายใน <b style="${i.due_date<localISO()&&!['resolved','closed'].includes(i.status)?'color:var(--bad)':''}">${thaiDate(i.due_date)}</b>`:''}</div>`:''}
    ${canM&&i.status!=='closed'?`<div class="card col" style="gap:8px;box-shadow:none;background:var(--surface2)"><b class="sm">จัดการเรื่อง</b><div class="isman">
      <label class="field"><span class="xs muted">สถานะ</span><select class="in" id="ims">${steps.filter(s=>mgr||s!=='closed').map(s=>`<option value="${s}" ${i.status===s?'selected':''}>${ISS_ST[s][0]}</option>`).join('')}</select></label>
      ${mgr?`<label class="field"><span class="xs muted">ผู้รับผิดชอบ</span><select class="in" id="ima"><option value="">— ไม่ระบุ —</option>${users.map(u=>`<option value="${u.id}" ${i.assignee===u.id?'selected':''}>${esc(u.display_name)}</option>`).join('')}</select></label>
      <label class="field"><span class="xs muted">ต้องเสร็จภายใน</span><input class="in" type="date" id="imd" value="${i.due_date||''}"></label>`:''}</div>
      <div class="row" style="gap:8px;flex-wrap:wrap">${i.status==='new'?'<button class="btn btn-sm" data-qs="acknowledged">รับเรื่อง</button>':''}<button class="btn btn-sm" data-qs="resolved" style="background:#16A34A;color:#fff;border:0">แก้แล้ว</button><span class="grow"></span><button class="btn btn-sm btn-p" data-save>บันทึก</button></div></div>`:''}
    ${mine&&i.status==='resolved'?`<div class="note n-ok" style="flex-wrap:wrap;gap:8px"><span class="grow">ผู้รับผิดชอบแจ้งว่าแก้แล้ว ตรวจแล้วเรียบร้อยไหม</span><button class="btn btn-sm" data-cf="0">ยังไม่หาย</button><button class="btn btn-sm btn-p" data-cf="1">เรียบร้อย ปิดเรื่อง</button></div>`:''}
    <b class="sm">การพูดคุย (${cms.filter(c=>c.kind==='comment').length})</b>
    <div class="col" style="gap:8px">${cms.map(c=>c.kind==='comment'?`<div class="iscm ${c.author===S.profile.id?'me':''}"><b class="xs">${esc(c.author_name||'')} · ${new Date(c.created_at).toLocaleString('th-TH',{dateStyle:'short',timeStyle:'short'})}</b>${c.body?`<div class="sm" style="white-space:pre-wrap">${esc(c.body)}</div>`:''}${(c.photos||[]).length?`<div class="pgrid" style="margin-top:4px">${c.photos.map(p=>urls[p]?`<a class="pthumb" href="${urls[p]}" target="_blank" rel="noopener"><img src="${urls[p]}" alt=""></a>`:'').join('')}</div>`:''}</div>`:`<div class="xs muted" style="text-align:center">— ${esc(c.body||'')} · ${esc(c.author_name||'')} ${new Date(c.created_at).toLocaleString('th-TH',{dateStyle:'short',timeStyle:'short'})} —</div>`).join('')||'<span class="xs muted">ยังไม่มีข้อความ</span>'}</div>
    ${i.status!=='closed'?`<div class="row" style="gap:6px"><input class="in grow" id="icm" placeholder="${mgr?'ตอบกลับ / สั่งการ…':'พิมพ์ข้อความ…'}"><label class="btn btn-sm" title="แนบรูป">📷<input type="file" accept="image/*" multiple hidden id="icp"></label><button class="btn btn-sm btn-p" id="ics">ส่ง</button></div><span class="xs muted" id="icpn"></span>`:''}
    <div class="row" style="gap:8px;flex-wrap:wrap">${!isManager()&&S.profile.role!=='foreman'?'':'<button class="btn btn-sm" data-share>ใบแจ้งปัญหา (แชร์ LINE / PDF)</button>'}</div></div>`;
  hydratePhotos?.(host);
  const save=async(st)=>{ const {error}=await sb.rpc('set_issue',{p_id:id,p_status:st||$('#ims',host)?.value||i.status,p_assignee:mgr?($('#ima',host)?.value||null):i.assignee,p_due:mgr?($('#imd',host)?.value||null):i.due_date,p_note:null}); if(error) return toast(errText(error),true); toast('บันทึกแล้ว'); reload(); };
  const sv=$('[data-save]',host); if(sv) sv.onclick=()=>save();
  $$('[data-qs]',host).forEach(b=>b.onclick=()=>save(b.dataset.qs));
  $$('[data-cf]',host).forEach(b=>b.onclick=async()=>{ const ok=b.dataset.cf==='1'; let note=null; if(!ok){ note=await promptBox('ยังมีปัญหาอะไรอยู่',''); if(note===null) return; } const {error}=await sb.rpc('confirm_issue',{p_id:id,p_ok:ok,p_note:note}); if(error) return toast(errText(error),true); toast(ok?'ปิดเรื่องแล้ว ขอบคุณครับ':'เปิดเรื่องอีกครั้งแล้ว'); reload(); });
  let cph=[]; const icp=$('#icp',host); if(icp) icp.onchange=async()=>{ for(const f of [...icp.files].slice(0,Math.max(0,prRule('issue_comment').max-cph.length))) cph.push(await resizeImage(f,1600)); $('#icpn',host).textContent=`แนบรูป ${cph.length} รูป`; };
  const ics=$('#ics',host); if(ics) ics.onclick=async ev=>{ const body=$('#icm',host).value.trim(); if(!body&&!cph.length) return; busy(ev.target,true);
    try{ const paths=[]; for(let k=0;k<cph.length;k++){ const p=`${id}/c${Date.now()}_${k}.jpg`; const {error}=await sb.storage.from('issue-photos').upload(p,cph[k],{contentType:'image/jpeg'}); if(!error) paths.push(p); }
      const {error}=await sb.rpc('add_issue_comment',{p_id:id,p_body:body,p_photos:paths}); if(error) throw error; reload(); }catch(e){ busy(ev.target,false); toast(errText(e),true); } };
  const shb=$('[data-share]',host); if(shb) shb.onclick=()=>issueShare(id);
}
async function issueShare(id){
  try{ const {data:i,error}=await sb.from('issues').select('*').eq('id',id).single(); if(error) throw error;
    const urls=await issPhotoUrls(i.photos||[]); const imgs=[];
    for(const p of (i.photos||[]).slice(0,4)){ if(!urls[p]) continue; try{ const bl=await (await fetch(urls[p])).blob(); imgs.push(await new Promise(r=>{ const fr=new FileReader(); fr.onload=()=>r(fr.result); fr.readAsDataURL(bl); })); }catch(_){} }
    const dd=await issueDoc(i,imgs); vectorPreview(dd,i.issue_no||'issue','ใบแจ้งปัญหา','');
  }catch(e){ toast(errText(e),true); }
}
