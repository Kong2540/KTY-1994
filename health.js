/* =====================================================================
   สิทธิ์การรักษาพยาบาล (แอดมิน/ผู้บริหาร) · กติการูปถ่ายรวมทุกงาน (แอดมิน)
   ===================================================================== */
const HS_DEF=[{key:'sso',name:'ประกันสังคม',color:'#0E7C86',sso:true},{key:'gold',name:'บัตรทอง',color:'#C9A227',sso:false},{key:'gov',name:'ข้าราชการ/รัฐวิสาหกิจ',color:'#7C3AED',sso:false},{key:'other',name:'อื่น ๆ',color:'#64748B',sso:false}];
const hsList=()=>{ const v=S.settings.health_schemes; return Array.isArray(v)&&v.length?v:HS_DEF; };
const hsOf=k=>hsList().find(s=>s.key===k);
const hsTag=k=>{ const s=hsOf(k); return s?`<span class="tag" style="height:22px;background:${s.color};color:#fff">${esc(s.name)}</span>`:'<span class="tag" style="height:22px">ยังไม่ระบุ</span>'; };
let HS_F={f:'',q:''};
async function pageHealth(){
  if(!isManager()){ location.replace('#home'); return; }
  setPage(head('สิทธิ์การรักษาพยาบาล','ตั้งทีละคนหรือหลายคนพร้อมกัน',{dActions:isAdmin()?'<button class="btn" data-hsopt>แก้ตัวเลือกสิทธิ์</button>':''})+'<div id="hsb"><div class="loading"><div class="spin"></div></div></div>');
  const {data,error}=await sb.from('employees').select('id,emp_code,first_name,last_name,nickname,position_id,health_scheme,sso_enabled,sso_hospital,status,sort_order').neq('status','resigned').order('sort_order',{nullsFirst:false}).order('emp_code');
  if(error){ $('#hsb').outerHTML=`<div class="note n-bad">${esc(errText(error))}</div>`; return; }
  const emps=data||[], sel=new Set(), host=document.createElement('div'); host.className='col'; host.style.cssText='gap:12px;max-width:980px'; $('#hsb').replaceWith(host);
  const op=$('[data-hsopt]'); if(op) op.onclick=()=>hsOptions(()=>pageHealth());
  const draw=()=>{ const L=emps.filter(e=>(!HS_F.f||(HS_F.f==='none'?!e.health_scheme:e.health_scheme===HS_F.f))&&(!HS_F.q||`${e.emp_code} ${e.first_name} ${e.last_name} ${e.nickname||''}`.includes(HS_F.q)));
    const cnt=k=>emps.filter(e=>k==='none'?!e.health_scheme:e.health_scheme===k).length, none=cnt('none');
    host.innerHTML=`<div class="statg" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr))">${hsList().map(s=>`<div class="stat"><b class="num" style="font-size:22px;color:${s.color}">${cnt(s.key)}</b><span class="sm muted">${esc(s.name)}</span></div>`).join('')}<div class="stat"><b class="num" style="font-size:22px;color:${none?'var(--bad)':'inherit'}">${none}</b><span class="sm muted">ยังไม่ระบุ</span></div></div>
      ${none?`<div class="note n-warn">${IC.info}<span>ยังไม่ระบุ ${none} คน · ระหว่างนี้การหักประกันสังคมใช้ค่าเดิมของแต่ละคนไปก่อน จนกว่าจะเลือกสิทธิ์</span></div>`:''}
      <div class="chips"><button class="chip ${!HS_F.f?'on':''}" data-hf="">ทั้งหมด ${emps.length}</button><button class="chip ${HS_F.f==='none'?'on':''}" data-hf="none">ยังไม่ระบุ ${none}</button>${hsList().map(s=>`<button class="chip ${HS_F.f===s.key?'on':''}" data-hf="${s.key}">${esc(s.name)} ${cnt(s.key)}</button>`).join('')}</div>
      <div class="row" style="gap:8px"><input class="in grow" id="hsq" placeholder="ค้นหาชื่อ / รหัส" value="${esc(HS_F.q)}"><button class="btn btn-sm" data-hsall>${L.length&&L.every(e=>sel.has(e.id))?'ยกเลิกเลือกทั้งหมด':'เลือกทั้งหมด'}</button></div>
      <div class="card card-l">${L.map(e=>`<div class="li" style="gap:10px"><button class="chk ${sel.has(e.id)?'on':''}" data-hse="${e.id}" aria-label="เลือก">${sel.has(e.id)?svg('<path d="M5 12l5 5 9-10"/>'):''}</button><div class="grow" style="min-width:0"><b class="sm">${esc(e.first_name)} ${esc(e.last_name||'')}${e.nickname?` (${esc(e.nickname)})`:''}</b><div class="xs muted">${esc(e.emp_code||'')} · ${esc(posName(e.position_id)||'')}${e.sso_hospital?` · ${esc(e.sso_hospital)}`:''}</div></div>${hsTag(e.health_scheme)}<span class="xs" style="width:62px;text-align:right">${e.sso_enabled?'หัก 5%':'<span class="muted">ไม่หัก</span>'}</span></div>`).join('')||'<div class="empty"><b>ไม่มีรายชื่อ</b></div>'}</div>
      <div style="height:70px"></div>
      ${sel.size?`<div class="hsbar"><b class="sm">เลือก ${sel.size} คน · ตั้งเป็น</b>${hsList().map(s=>`<button class="btn btn-sm" data-hset="${s.key}" style="background:${s.color};color:#fff;border:0">${esc(s.name)}</button>`).join('')}<button class="btn btn-sm" data-hset="">ยังไม่ระบุ</button><button class="linkbtn" data-hclr>ล้าง</button></div>`:''}`;
    $$('[data-hf]',host).forEach(b=>b.onclick=()=>{ HS_F.f=b.dataset.hf; draw(); });
    const q=$('#hsq',host); q.oninput=()=>{ HS_F.q=q.value.trim(); const p=q.selectionStart; draw(); const n=$('#hsq',host); n.focus(); n.setSelectionRange(p,p); };
    $('[data-hsall]',host).onclick=()=>{ const all=L.every(e=>sel.has(e.id)); L.forEach(e=>all?sel.delete(e.id):sel.add(e.id)); draw(); };
    $$('[data-hse]',host).forEach(b=>b.onclick=()=>{ const id=b.dataset.hse; sel.has(id)?sel.delete(id):sel.add(id); draw(); });
    const cl=$('[data-hclr]',host); if(cl) cl.onclick=()=>{ sel.clear(); draw(); };
    $$('[data-hset]',host).forEach(b=>b.onclick=async()=>{ const k=b.dataset.hset, ids=[...sel];
      const {error}=await sb.rpc('set_health_scheme',{p_ids:ids,p_scheme:k||null}); if(error) return toast(/set_health_scheme/.test(error.message)?'ยังไม่ได้รันไฟล์ 23_health_photos.sql':errText(error),true);
      const s=hsOf(k); emps.forEach(e=>{ if(sel.has(e.id)){ e.health_scheme=k||null; if(s) e.sso_enabled=!!s.sso; } }); toast(`ตั้งสิทธิ์ ${ids.length} คนแล้ว${s?` (${s.sso?'หักประกันสังคม':'ไม่หักประกันสังคม'})`:''}`); sel.clear(); draw(); });
  };
  draw();
}
function hsOptions(done){
  const L=JSON.parse(JSON.stringify(hsList()));
  const ov=overlay(`<div class="sheet" role="dialog" aria-modal="true" aria-label="ตัวเลือกสิทธิ์การรักษา"></div>`,false,false), sh=$('.sheet',ov.el);
  const draw=()=>{ sh.innerHTML=`<header class="appbar stripe"><button class="ibtn" data-x aria-label="ปิด">${IC.close}</button><h1>ตัวเลือกสิทธิ์การรักษา<small>ชื่อ สี และการหักประกันสังคม</small></h1></header>
    <div class="sheet-body">${L.map((s,i)=>`<div class="card col" style="gap:8px"><div class="advrow"><input type="color" data-c="${i}" value="${s.color}" aria-label="สี"><input class="in" data-n="${i}" value="${esc(s.name)}"><button class="ibtn" data-del="${i}" aria-label="ลบ" ${L.length>1?'':'disabled'}>${IC.close}</button></div><label class="row sm" style="gap:8px"><input type="checkbox" data-s="${i}" ${s.sso?'checked':''}> หักเงินสมทบประกันสังคมอัตโนมัติ</label></div>`).join('')}
      <button class="btn" data-add>+ เพิ่มสิทธิ์</button></div>
    <div class="sheet-foot"><button class="btn btn-p grow" data-save>บันทึก</button></div>`;
    $('[data-x]',sh).onclick=ov.close;
    $$('[data-n]',sh).forEach(i=>i.oninput=()=>{ L[+i.dataset.n].name=i.value; });
    $$('[data-c]',sh).forEach(i=>i.oninput=()=>{ L[+i.dataset.c].color=i.value; });
    $$('[data-s]',sh).forEach(i=>i.onchange=()=>{ L[+i.dataset.s].sso=i.checked; });
    $$('[data-del]',sh).forEach(b=>b.onclick=()=>{ L.splice(+b.dataset.del,1); draw(); });
    $('[data-add]',sh).onclick=()=>{ L.push({key:'s'+Date.now().toString(36),name:'สิทธิ์ใหม่',color:'#0284C7',sso:false}); draw(); };
    $('[data-save]',sh).onclick=async ev=>{ if(L.some(s=>!s.name.trim())) return toast('ตั้งชื่อทุกสิทธิ์',true); busy(ev.target,true); try{ await saveSetting('health_schemes',L); S.settings.health_schemes=L; ov.close(); toast('บันทึกแล้ว (คนที่ตั้งสิทธิ์ไว้แล้ว ให้กดตั้งซ้ำหากเปลี่ยนการหักประกันสังคม)'); done(); }catch(e){ busy(ev.target,false); toast(e.message,true); } };
  };
  draw();
}

/* ---------- กติการูปถ่ายรวม ---------- */
const PR_SYS=[['receive','📦','รับของตามใบเบิก','รูปของที่รับ',0,6],['return','↩️','คืน วัสดุ/อุปกรณ์','รูปของที่คืน',0,6],['issue_comment','💬','แจ้งปัญหา: การพูดคุย','รูปต่อ 1 ข้อความ',0,4]];
const prRule=(k)=>{ const d=PR_SYS.find(x=>x[0]===k)||[k,'','','',0,6]; const r=(S.settings.photo_rules||{})[k]||{}; return {min:r.min??d[4],max:r.max??d[5],help:r.help||'',dmg_min:r.dmg_min??0}; };
function stPhotos(host){
  if(typeof waSyncForms==='function') waSyncForms();
  const forms=JSON.parse(JSON.stringify(S.settings.forms||{})), rules=JSON.parse(JSON.stringify(S.settings.photo_rules||{}));
  const fieldsOf=k=>forms[k]?.published?forms[k].published:JSON.parse(JSON.stringify(FORM_DEFS[k].fields));
  const work={}; Object.keys(FORM_DEFS).forEach(k=>work[k]=fieldsOf(k));
  const icon=k=>k==='daily'?'📄':k==='issue'?'⚠️':(typeof waType==='function'&&waType(k.slice(3))?.icon)||'✅';
  const draw=()=>{
    const fcard=k=>{ const ph=work[k].filter(f=>f.type==='photos'&&!f.hidden);
      return `<div class="card col" style="gap:4px"><div class="row" style="gap:8px"><span style="font-size:20px">${icon(k)}</span><b class="grow">${esc(FORM_DEFS[k].name)}</b><button class="btn btn-sm" data-addp="${k}">+ หัวข้อรูป</button></div>
        ${ph.map(f=>`<div class="prrow"><div class="grow" style="min-width:0"><input class="in" data-pl="${k}|${f.key}" value="${esc(f.label)}" ${f.core?'readonly':''} style="height:36px"><input class="in xs" data-ph="${k}|${f.key}" value="${esc(f.help||'')}" placeholder="คำแนะนำ เช่น ถ่ายให้เห็นระยะหุ้ม" style="height:32px;margin-top:4px"></div>
          <label class="field"><span class="xs muted">ขั้นต่ำ</span><input class="in num" type="number" min="0" max="30" data-pmin="${k}|${f.key}" value="${esc(f.min??(k==='daily'&&f.core?minPhotos():0))}" style="height:36px;width:70px"></label>
          <label class="field"><span class="xs muted">สูงสุด</span><input class="in num" type="number" min="1" max="30" data-pmax="${k}|${f.key}" value="${esc(f.max??(k==='daily'?30:k==='issue'?6:9))}" style="height:36px;width:70px"></label>
          ${f.core?'<span class="tag" style="height:18px;font-size:10px">หลัก</span>':`<button class="ibtn" data-pdel="${k}|${f.key}" aria-label="ลบหัวข้อรูป">${IC.close}</button>`}</div>`).join('')||'<span class="xs muted">ไม่มีช่องรูป</span>'}</div>`; };
    const scard=([k,e,t,lbl])=>{ const r={...prRule(k),...(rules[k]||{})};
      return `<div class="card col" style="gap:4px"><div class="row" style="gap:8px"><span style="font-size:20px">${e}</span><b class="grow">${t}</b><span class="xs muted">ระบบ</span></div><div class="prrow"><div class="grow"><b class="sm">${lbl}</b><input class="in xs" data-sh="${k}" value="${esc(r.help)}" placeholder="คำแนะนำ" style="height:32px;margin-top:4px"></div>
        <label class="field"><span class="xs muted">ขั้นต่ำ</span><input class="in num" type="number" min="0" max="30" data-smin="${k}" value="${r.min}" style="height:36px;width:70px"></label><label class="field"><span class="xs muted">สูงสุด</span><input class="in num" type="number" min="1" max="30" data-smax="${k}" value="${r.max}" style="height:36px;width:70px"></label></div>
        ${k==='return'?`<label class="row sm" style="gap:8px">เมื่อมีของชำรุด/สูญหาย บังคับอย่างน้อย <input class="in num" type="number" min="0" max="10" data-sdmg value="${r.dmg_min}" style="height:34px;width:64px"> รูป</label>`:''}</div>`; };
    host.innerHTML=`<div class="col" style="gap:12px"><div class="note n-info">${IC.info}<span>ขั้นต่ำ 0 = ไม่บังคับ · "+ หัวข้อรูป" เพิ่มชุดรูปในฟอร์มนั้นทันที · ค่าตรงกับตัวสร้างฟอร์มเสมอ</span></div>
      <div class="prgrid">${Object.keys(FORM_DEFS).map(fcard).join('')}${PR_SYS.map(scard).join('')}</div>
      <button class="btn btn-p" data-save style="align-self:flex-start">บันทึกกติการูปถ่าย</button></div>`;
    const fld=(s)=>{ const [k,key]=s.split('|'); return work[k].find(f=>f.key===key); };
    $$('[data-pl]',host).forEach(i=>i.oninput=()=>{ fld(i.dataset.pl).label=i.value; });
    $$('[data-ph]',host).forEach(i=>i.oninput=()=>{ fld(i.dataset.ph).help=i.value; });
    $$('[data-pmin]',host).forEach(i=>i.oninput=()=>{ fld(i.dataset.pmin).min=i.value===''?'':Math.max(0,+i.value); });
    $$('[data-pmax]',host).forEach(i=>i.oninput=()=>{ fld(i.dataset.pmax).max=i.value===''?'':Math.max(1,+i.value); });
    $$('[data-pdel]',host).forEach(b=>b.onclick=()=>{ const [k,key]=b.dataset.pdel.split('|'); work[k]=work[k].filter(f=>f.key!==key); draw(); });
    $$('[data-addp]',host).forEach(b=>b.onclick=()=>{ const k=b.dataset.addp, f={key:'cf_'+Date.now().toString(36),type:'photos',label:'ชุดรูปใหม่',min:1,max:6,show_pdf:1}; const ci=work[k].findIndex(x=>x.key==='photos'); work[k].splice(ci>=0?ci+1:work[k].length,0,f); draw(); });
    const sv=(a,f)=>$$(`[${a}]`,host).forEach(i=>i.oninput=()=>f(i));
    sv('data-smin',i=>{ const k=i.dataset.smin; rules[k]={...(rules[k]||{}),min:Math.max(0,+i.value||0)}; });
    sv('data-smax',i=>{ const k=i.dataset.smax; rules[k]={...(rules[k]||{}),max:Math.max(1,+i.value||1)}; });
    sv('data-sh',i=>{ const k=i.dataset.sh; rules[k]={...(rules[k]||{}),help:i.value}; });
    const dm=$('[data-sdmg]',host); if(dm) dm.oninput=()=>{ rules.return={...(rules.return||{}),dmg_min:Math.max(0,+dm.value||0)}; };
    $('[data-save]',host).onclick=async ev=>{
      for(const k of Object.keys(work)) for(const f of work[k].filter(f=>f.type==='photos')){ if(f.min!==''&&f.max!==''&&+f.min>+f.max) return toast(`"${f.label}" ขั้นต่ำมากกว่าสูงสุด`,true); if(!String(f.label).trim()) return toast('ตั้งชื่อหัวข้อรูปทุกช่อง',true); }
      busy(ev.target,true);
      try{ const nf={...(S.settings.forms||{})}; Object.keys(work).forEach(k=>{ const old=nf[k]||{}; nf[k]={...old,published:work[k],version:(old.version||0)+(JSON.stringify(old.published||FORM_DEFS[k].fields)===JSON.stringify(work[k])?0:1)}; delete nf[k].draft; });
        await saveSetting('forms',nf); S.settings.forms=nf; await saveSetting('photo_rules',rules); S.settings.photo_rules=rules; busy(ev.target,false); toast('บันทึกกติการูปถ่ายแล้ว'); }
      catch(e){ busy(ev.target,false); toast(/row-level|ไม่มีสิทธิ์/.test(e.message)?'ต้องรันไฟล์ 23_health_photos.sql และต้องเป็นแอดมิน':e.message,true); } };
  };
  draw();
}
