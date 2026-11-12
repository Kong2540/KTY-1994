/* =====================================================================
   ตัวสร้างฟอร์ม (Form Builder) — แอดมินออกแบบฟอร์มเอง
   ===================================================================== */
const FTYPES = { text:['ข้อความ','T'], longtext:['ข้อความยาว','¶'], number:['ตัวเลข','#'], single:['ตัวเลือกเดียว','◉'], multi:['หลายตัวเลือก','☑'],
  date:['วันที่','📅'], time:['เวลา','🕘'], switch:['สวิตช์','⊘'], photo:['รูปถ่าย','▣'], signature:['ลายเซ็น','✍'], crew:['คนงาน','👷'], photos:['รูปถ่ายหลายรูป','▣'] };
const FORM_DEFS = {
  daily: { name:'รายงานประจำวัน (รอบเย็น)', fields:[
    {key:'weather',   type:'single',   label:'สภาพอากาศ',            core:1, required:1, list:'weather', show_pdf:1, show_line:1},
    {key:'no_work',   type:'switch',   label:'วันนี้ไม่มีการทำงาน',    core:1, help:'เช่น ฝนตกหนักทั้งวัน หรือวันหยุด'},
    {key:'crew',      type:'crew',     label:'คนงานหน้างาน',          core:1, locked:1, show_pdf:1, show_line:1},
    {key:'work_items',type:'longtext', label:'งานที่ทำวันนี้',          core:1, locked:1, required:1, help:'บรรทัดละ 1 รายการ', show_pdf:1, show_line:1},
    {key:'machinery', type:'multi',    label:'เครื่องจักร',            core:1, list:'machinery', show_pdf:1, show_line:1},
    {key:'tools',     type:'multi',    label:'เครื่องมือ',             core:1, list:'tools', show_pdf:1, show_line:1},
    {key:'problems',  type:'longtext', label:'ปัญหา / อุปสรรค',        core:1, help:'ไม่มี เว้นว่างได้', show_pdf:1, show_line:1},
    {key:'photos',    type:'photos',   label:'รูปถ่าย',               core:1, locked:1, show_pdf:1}
  ]}
};
FORM_DEFS.issue = { name:'แจ้งปัญหา', fields:[
  {key:'category', type:'single',   label:'หมวด',               core:1, required:1, list:'issue_cats'},
  {key:'urgency',  type:'single',   label:'ความเร่งด่วน',        core:1, required:1, locked:1},
  {key:'site_id',  type:'single',   label:'ไซต์ที่เกี่ยวข้อง',     core:1},
  {key:'title',    type:'text',     label:'หัวข้อ',              core:1, required:1, locked:1},
  {key:'detail',   type:'longtext', label:'รายละเอียด',          core:1, required:1},
  {key:'photos',   type:'photos',   label:'รูปถ่าย (สูงสุด 6)',   core:1, locked:1}
]};
const ROLE_OPTS = [['foreman','โฟร์แมน'],['executive','ผู้บริหาร'],['writer','ผู้มีสิทธิ์เขียนรายงาน']];
function formOf(name){ const f=S.settings.forms?.[name]?.published; return (f&&f.length?f:FORM_DEFS[name].fields).filter(x=>!x.hidden); }
function formAll(name, draft){ const s=S.settings.forms?.[name]||{}; const f=(draft&&s.draft)||s.published; return JSON.parse(JSON.stringify(f&&f.length?f:FORM_DEFS[name].fields)); }
const fieldCanFill = f => !f.roles||!f.roles.length||isManager()||f.roles.includes(S.profile.role)||(f.roles.includes('writer')&&hasMod('daily',['writer']));

/* ---------- ช่องที่แอดมินเพิ่มเอง: แสดง / รับค่า / ตรวจ ---------- */
function cfHTML(f, v, ctx=''){
  const req=f.required?' <span style="color:var(--bad)">*</span>':'', help=f.help?`<span class="hint">${esc(f.help)}</span>`:'', id=`cf_${ctx}${f.key}`, dis=fieldCanFill(f)?'':'disabled';
  const opts=f.options||[];
  switch(f.type){
    case 'text': return `<div class="field"><label for="${id}">${esc(f.label)}${req}</label><input class="in" id="${id}" data-cf="${f.key}" value="${esc(v??'')}" ${dis}>${help}</div>`;
    case 'longtext': return `<div class="field"><label for="${id}">${esc(f.label)}${req}</label><textarea class="in" id="${id}" data-cf="${f.key}" rows="3" ${dis}>${esc(v??'')}</textarea>${help}</div>`;
    case 'number': return `<div class="field"><label for="${id}">${esc(f.label)}${req}</label><div class="row" style="gap:8px"><input class="in num" id="${id}" data-cf="${f.key}" type="number" inputmode="decimal" ${f.min!=null&&f.min!==''?`min="${f.min}"`:''} ${f.max!=null&&f.max!==''?`max="${f.max}"`:''} step="any" value="${esc(v??'')}" style="max-width:180px" ${dis}>${f.unit?`<span class="muted">${esc(f.unit)}</span>`:''}</div>${help}</div>`;
    case 'date': return `<div class="field"><label for="${id}">${esc(f.label)}${req}</label><input class="in" id="${id}" type="date" data-cf="${f.key}" value="${esc(v??'')}" ${dis}>${help}</div>`;
    case 'time': return `<div class="field"><label for="${id}">${esc(f.label)}${req}</label><input class="in" id="${id}" type="time" data-cf="${f.key}" value="${esc(v??'')}" ${dis}>${help}</div>`;
    case 'single': return `<div class="field"><label>${esc(f.label)}${req}</label><div class="chips">${opts.map(o=>`<button type="button" class="chip ${v===o?'on':''}" data-cfs="${f.key}" data-v="${esc(o)}" ${dis}>${esc(o)}</button>`).join('')}</div>${help}</div>`;
    case 'multi': { const a=Array.isArray(v)?v:[]; return `<div class="field"><label>${esc(f.label)}${req}</label><div class="chips">${opts.map(o=>`<button type="button" class="chip ${a.includes(o)?'on':''}" data-cfm="${f.key}" data-v="${esc(o)}" ${dis}>${esc(o)}</button>`).join('')}</div>${help}</div>`; }
    case 'switch': return `<div class="card row" style="padding:12px 14px"><div class="grow"><b>${esc(f.label)}</b>${f.help?`<div class="xs muted">${esc(f.help)}</div>`:''}</div><button type="button" class="sw ${v?'on':''}" data-cfw="${f.key}" role="switch" aria-checked="${!!v}" aria-label="${esc(f.label)}" ${dis}></button></div>`;
    case 'photo': return `<div class="field"><label>${esc(f.label)}${req}</label><div class="pgrid">${v&&(v.thumb||v.url)?`<div class="pthumb"><img src="${esc(v.thumb||v.url)}" alt=""><button type="button" data-cfpx="${f.key}" aria-label="ลบรูป">×</button></div>`:`<label class="pthumb padd">${IC.camera}<span class="xs">เพิ่มรูป</span><input type="file" accept="image/*" hidden data-cfp="${f.key}" ${dis}></label>`}</div>${help}</div>`;
    case 'signature': return `<div class="field"><label>${esc(f.label)}${req}</label>${v?`<div class="row" style="gap:8px"><img src="${v}" alt="ลายเซ็น" style="height:70px;background:#fff;border:1px solid var(--line);border-radius:8px"><button type="button" class="btn btn-sm" data-cfsx="${f.key}">เซ็นใหม่</button></div>`:`<div data-cfsig="${f.key}"></div>`}${help}</div>`;
  }
  return '';
}
/* bind: values อยู่ใน obj (F.extra) — onChange เรียกเมื่อต้องวาดใหม่ */
function cfBind(host, obj, onChange, files){
  $$('[data-cf]',host).forEach(i=>i.oninput=()=>{ obj[i.dataset.cf]=i.type==='number'?(i.value===''?null:Number(i.value)):i.value; });
  $$('[data-cfs]',host).forEach(b=>b.onclick=()=>{ obj[b.dataset.cfs]=obj[b.dataset.cfs]===b.dataset.v?null:b.dataset.v; onChange(); });
  $$('[data-cfm]',host).forEach(b=>b.onclick=()=>{ const k=b.dataset.cfm, a=Array.isArray(obj[k])?obj[k]:[]; obj[k]=a.includes(b.dataset.v)?a.filter(x=>x!==b.dataset.v):[...a,b.dataset.v]; onChange(); });
  $$('[data-cfw]',host).forEach(b=>b.onclick=()=>{ obj[b.dataset.cfw]=!obj[b.dataset.cfw]; onChange(); });
  $$('[data-cfp]',host).forEach(i=>i.onchange=async()=>{ const f=i.files[0]; if(!f) return; const bl=await resizeImage(f,1600); files[i.dataset.cfp]=bl; obj[i.dataset.cfp]={local:1,url:URL.createObjectURL(bl)}; onChange(); });
  $$('[data-cfpx]',host).forEach(b=>b.onclick=()=>{ delete files[b.dataset.cfpx]; obj[b.dataset.cfpx]=null; onChange(); });
  $$('[data-cfsx]',host).forEach(b=>b.onclick=()=>{ obj[b.dataset.cfsx]=null; onChange(); });
  $$('[data-cfsig]',host).forEach(d=>{ const k=d.dataset.cfsig, pad=signaturePad(d); const t=setInterval(()=>{ if(!document.body.contains(d)) return clearInterval(t); if(!pad.empty()) obj['__sig_'+k]=pad; },400); });
}
function cfCollectSignatures(obj){ Object.keys(obj).filter(k=>k.startsWith('__sig_')).forEach(k=>{ const pad=obj[k]; if(pad&&!pad.empty()) obj[k.slice(6)]=pad.data(); delete obj[k]; }); }
function cfValidate(fields, obj){
  for(const f of fields){ if(f.core||!f.required||!fieldCanFill(f)) continue; const v=obj[f.key]; const empty=v==null||v===''||(Array.isArray(v)&&!v.length)||(f.type==='switch'&&!v);
    if(empty&&!(f.type==='signature'&&obj['__sig_'+f.key])) return `กรอก "${f.label}"`;
    if(f.type==='number'&&v!=null&&v!==''){ if(f.min!==''&&f.min!=null&&v<+f.min) return `"${f.label}" ต้องไม่น้อยกว่า ${f.min}`; if(f.max!==''&&f.max!=null&&v>+f.max) return `"${f.label}" ต้องไม่เกิน ${f.max}`; } }
  return null;
}
const cfText = (f, v) => v==null||v===''?'':f.type==='multi'?(v||[]).join(', '):f.type==='switch'?(v?'ใช่':'ไม่ใช่'):f.type==='photo'?'(มีรูป)':f.type==='signature'?'(ลงชื่อแล้ว)':`${v}${f.type==='number'&&f.unit?' '+f.unit:''}`;

/* ---------- ตัวสร้างฟอร์มในหน้า ตั้งค่าระบบ ---------- */
let FB = { form:'daily', sel:0, fields:null, dirty:false };
function stForms(host){
  if(!FB.fields||FB.formLoaded!==FB.form){ FB.fields=formAll(FB.form,true); FB.formLoaded=FB.form; FB.sel=Math.min(FB.sel,FB.fields.length-1); FB.dirty=!!S.settings.forms?.[FB.form]?.draft; }
  const F=FB.fields, fs=S.settings.forms?.[FB.form]||{}, wide=matchMedia('(min-width:1100px)').matches;
  const fieldRow=(f,i)=>`<div class="fbrow ${i===FB.sel?'on':''} ${f.hidden?'off':''}" draggable="true" data-i="${i}"><span class="grip" aria-hidden="true">⋮⋮</span><span class="fbt">${FTYPES[f.type]?.[1]||'?'}</span>
    <span class="grow" data-pick="${i}"><b>${esc(f.label)}</b>${f.required?' <span style="color:var(--bad)">*</span>':''}<span class="xs muted" style="display:block">${FTYPES[f.type]?.[0]||f.type}${f.hidden?' · ซ่อนอยู่':''}</span></span>
    <span class="tag ${f.core?'t-acc':'t-ok'}" style="height:20px;font-size:10.5px">${f.core?'หลัก':'เพิ่มเอง'}</span>
    <span class="fbmv"><button class="ibtn" data-up="${i}" ${i?'':'disabled'} aria-label="ขึ้น">${svg('<path d="M6 15l6-6 6 6"/>')}</button><button class="ibtn" data-dn="${i}" ${i<F.length-1?'':'disabled'} aria-label="ลง">${svg('<path d="M6 9l6 6 6-6"/>')}</button></span></div>`;
  const f=F[FB.sel];
  host.innerHTML=`<div class="card col" style="gap:10px"><div class="row" style="gap:8px;flex-wrap:wrap"><div class="grow"><span class="xs muted">ตัวสร้างฟอร์ม</span><br><span class="chips" style="display:inline-flex;margin-right:8px">${Object.entries(FORM_DEFS).map(([k,v])=>`<button class="chip ${FB.form===k?'on':''}" data-fbf="${k}">${esc(v.name)}</button>`).join('')}</span><br><b style="font-size:18px">${esc(FORM_DEFS[FB.form].name)}</b> ${FB.dirty?'<span class="tag t-warn">มีการแก้ที่ยังไม่เผยแพร่</span>':'<span class="tag t-ok">ตรงกับที่ใช้งานอยู่</span>'}${fs.version?` <span class="xs muted">เวอร์ชัน ${fs.version}</span>`:''}</div>
      <button class="btn btn-sm" data-hist ${fs.history?.length?'':'disabled'}>ประวัติ</button><button class="btn btn-sm" data-discard ${FB.dirty?'':'disabled'}>ยกเลิกที่แก้</button><button class="btn btn-sm btn-p" data-pub>เผยแพร่ฟอร์ม</button></div>
      <span class="xs muted">แก้แล้วบันทึกเป็นร่างอัตโนมัติ โฟร์แมนเห็นเมื่อกด "เผยแพร่ฟอร์ม"</span></div>
    <div class="fbgrid ${wide?'wide':''}">
      <div class="card col" style="gap:6px"><div class="row"><b class="grow sm">ช่องในฟอร์ม (${F.length})</b><button class="btn btn-sm" data-add>+ เพิ่มช่อง</button></div>
        <div class="fbrow fixed"><span class="grip"></span><span class="fbt">🏗️</span><span class="grow"><b>ไซต์ · วันที่</b><span class="xs muted" style="display:block">ช่องระบบ อยู่บนสุดเสมอ</span></span></div>
        <div id="fbl">${F.map(fieldRow).join('')}</div></div>
      <div class="card col" style="gap:12px" id="fbe">${f?fieldEditor(f):''}</div>
      ${wide?`<div class="fbprev"><span class="xs muted">ตัวอย่างสด</span><div class="phone-mini">${formPreview(F)}</div></div>`:''}
    </div>${wide?'':`<div class="card col"><b class="sm">ตัวอย่างฟอร์ม</b><div class="phone-mini">${formPreview(F)}</div></div>`}`;
  const save=async()=>{ FB.dirty=true; try{ await saveSetting('forms',{...(S.settings.forms||{}),[FB.form]:{...fs,draft:FB.fields}}); }catch(e){ toast(e.message,true); } };
  const redraw=(persist=true)=>{ if(persist) save(); const y=scrollY; stForms(host); scrollTo(0,y); };
  $$('[data-pick]',host).forEach(x=>x.onclick=()=>{ FB.sel=+x.dataset.pick; redraw(false); });
  $$('[data-fbf]',host).forEach(b=>b.onclick=()=>{ FB.form=b.dataset.fbf; FB.fields=null; FB.sel=0; stForms(host); });
  $$('[data-up]',host).forEach(b=>b.onclick=()=>{ const i=+b.dataset.up; [F[i-1],F[i]]=[F[i],F[i-1]]; if(FB.sel===i) FB.sel=i-1; redraw(); });
  $$('[data-dn]',host).forEach(b=>b.onclick=()=>{ const i=+b.dataset.dn; [F[i+1],F[i]]=[F[i],F[i+1]]; if(FB.sel===i) FB.sel=i+1; redraw(); });
  let dragI=null;
  $$('.fbrow[draggable]',host).forEach(r=>{ r.ondragstart=e=>{ dragI=+r.dataset.i; e.dataTransfer.effectAllowed='move'; r.classList.add('drag'); };
    r.ondragover=e=>{ e.preventDefault(); r.classList.add('over'); }; r.ondragleave=()=>r.classList.remove('over');
    r.ondrop=e=>{ e.preventDefault(); const to=+r.dataset.i; if(dragI==null||dragI===to) return; const [x]=F.splice(dragI,1); F.splice(to,0,x); FB.sel=to; dragI=null; redraw(); }; });
  $('[data-add]',host).onclick=()=>addFieldSheet(nf=>{ F.push(nf); FB.sel=F.length-1; redraw(); });
  $('[data-discard]',host).onclick=async()=>{ if(!await confirmBox('ทิ้งการแก้ทั้งหมด กลับไปใช้ฟอร์มที่เผยแพร่อยู่?','ทิ้งการแก้',true)) return; const n={...fs}; delete n.draft; await saveSetting('forms',{...(S.settings.forms||{}),[FB.form]:n}); FB.fields=null; FB.dirty=false; stForms(host); };
  $('[data-pub]',host).onclick=async ev=>{ const keys=F.map(x=>x.key); if(new Set(keys).size!==keys.length) return toast('มีรหัสช่องซ้ำ',true);
    if(!await confirmBox('เผยแพร่ฟอร์มนี้? โฟร์แมนจะเห็นฟอร์มใหม่เมื่อเปิดแอปครั้งถัดไป','เผยแพร่')) return; busy(ev.target,true);
    const hist=[{at:new Date().toISOString(),by:S.profile.display_name,version:fs.version||0,fields:fs.published||FORM_DEFS[FB.form].fields},...(fs.history||[])].slice(0,10);
    try{ await saveSetting('forms',{...(S.settings.forms||{}),[FB.form]:{published:F,version:(fs.version||0)+1,history:hist}}); FB.dirty=false; toast('เผยแพร่ฟอร์มแล้ว'); stForms(host); }catch(e){ busy(ev.target,false); toast(e.message,true); } };
  $('[data-hist]',host).onclick=()=>{ const ov=overlay(`<div class="modal" role="dialog" aria-modal="true"><h3 class="h2" style="font-size:18px">ประวัติการเผยแพร่</h3><div class="card card-l" style="box-shadow:none">${(fs.history||[]).map((h,i)=>`<div class="li"><div class="grow"><b>เวอร์ชัน ${h.version}</b><span class="xs muted">${new Date(h.at).toLocaleString('th-TH',{dateStyle:'medium',timeStyle:'short'})} · แทนที่โดย ${esc(h.by||'')} · ${h.fields.length} ช่อง</span></div><button class="btn btn-sm" data-rb="${i}">ใช้ฉบับนี้เป็นร่าง</button></div>`).join('')}</div><button class="btn" data-x>ปิด</button></div>`);
    $('[data-x]',ov.el).onclick=ov.close; $$('[data-rb]',ov.el).forEach(b=>b.onclick=()=>{ FB.fields=JSON.parse(JSON.stringify(fs.history[+b.dataset.rb].fields)); ov.close(); FB.sel=0; redraw(); toast('โหลดเป็นร่างแล้ว ตรวจแล้วกดเผยแพร่'); }); };
  bindEditor(host, f, redraw);
}
function fieldEditor(f){
  const opts=f.list?(DL()[f.list]||[]):(f.options||[]);
  return `<div class="row"><b class="grow" style="font-size:16px">ตั้งค่าช่อง: ${esc(f.label)}</b><span class="tag ${f.core?'t-acc':'t-ok'}">${f.core?'ช่องหลัก':'เพิ่มเอง'}</span></div>
    <div class="field"><label>ชื่อช่อง (แสดงในฟอร์ม)</label><input class="in" data-fe="label" value="${esc(f.label)}"></div>
    <div class="field"><label>ชนิด</label><div class="in" style="background:var(--surface2)">${FTYPES[f.type]?.[1]} ${FTYPES[f.type]?.[0]}${f.core?' (ช่องหลัก เปลี่ยนชนิดไม่ได้)':''}</div></div>
    ${['single','multi'].includes(f.type)?`<div class="field"><label>ตัวเลือก</label>${f.list?`<div class="note n-info">${IC.info}<span>ใช้รายการกลาง "${esc(f.list)}" (${opts.length} ตัวเลือก) แก้ได้ที่ <a href="#studio/lists">รายการตัวเลือก</a></span></div>`:
      `<div class="card card-l" style="box-shadow:none">${opts.map((o,i)=>`<div class="li" style="gap:6px"><input class="in grow" data-op="${i}" value="${esc(o)}" style="height:38px"><button class="ibtn" data-opu="${i}" ${i?'':'disabled'} aria-label="ขึ้น">${svg('<path d="M6 15l6-6 6 6"/>')}</button><button class="ibtn" data-opx="${i}" aria-label="ลบ">${IC.close}</button></div>`).join('')}<div class="li"><input class="in grow" id="opn" placeholder="เพิ่มตัวเลือก" style="height:38px"><button class="btn btn-sm" data-opa>เพิ่ม</button></div></div>`}</div>`:''}
    ${f.type==='number'?`<div class="g3" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px"><div class="field"><label>ต่ำสุด</label><input class="in num" data-fe="min" value="${esc(f.min??'')}"></div><div class="field"><label>สูงสุด</label><input class="in num" data-fe="max" value="${esc(f.max??'')}"></div><div class="field"><label>หน่วย</label><input class="in" data-fe="unit" value="${esc(f.unit??'')}"></div></div>`:''}
    <div class="field"><label>ข้อความช่วย</label><input class="in" data-fe="help" value="${esc(f.help||'')}" placeholder="แสดงใต้ช่อง"></div>
    ${f.locked?'':`<div class="li" style="padding:4px 0"><span class="grow">บังคับกรอก</span><button class="sw ${f.required?'on':''}" data-ft="required" role="switch" aria-label="บังคับกรอก"></button></div>`}
    ${f.type==='photos'?`<div class="note n-info">${IC.info}<span>จำนวนรูปขั้นต่ำตั้งที่ <a href="#studio/rules">กติการายงาน</a></span></div>`:''}
    ${f.core?'':`<div class="li" style="padding:4px 0"><span class="grow">แสดงใน PDF รายงาน</span><button class="sw ${f.show_pdf?'on':''}" data-ft="show_pdf" role="switch" aria-label="แสดงใน PDF"></button></div>
    <div class="li" style="padding:4px 0"><span class="grow">แสดงในการ์ด LINE</span><button class="sw ${f.show_line?'on':''}" data-ft="show_line" role="switch" aria-label="แสดงใน LINE"></button></div>
    <div class="field"><label>ใครกรอกได้ (ไม่เลือก = ทุกคนที่เขียนรายงานได้)</label><div class="chips">${ROLE_OPTS.map(([k,t])=>`<button class="chip ${(f.roles||[]).includes(k)?'on':''}" data-role="${k}">${t}</button>`).join('')}</div></div>`}
    <div class="row" style="gap:8px;flex-wrap:wrap">${f.locked?'<span class="xs muted grow">ช่องนี้ระบบใช้คำนวณ ซ่อนหรือลบไม่ได้</span>':`<button class="btn btn-sm" data-hide>${f.hidden?'แสดงช่องนี้':'ซ่อนช่องนี้'}</button>`}${f.core?'':'<button class="btn btn-sm btn-bad" data-del>ลบช่อง</button>'}</div>`;
}
function bindEditor(host, f, redraw){
  if(!f) return; const e=$('#fbe',host);
  $$('[data-fe]',e).forEach(i=>{ i.oninput=()=>{ f[i.dataset.fe]=i.value; }; i.onchange=()=>redraw(); });
  $$('[data-ft]',e).forEach(b=>b.onclick=()=>{ f[b.dataset.ft]=f[b.dataset.ft]?0:1; redraw(); });
  $$('[data-role]',e).forEach(b=>b.onclick=()=>{ const r=b.dataset.role; f.roles=(f.roles||[]).includes(r)?f.roles.filter(x=>x!==r):[...(f.roles||[]),r]; redraw(); });
  $$('[data-op]',e).forEach(i=>{ i.oninput=()=>{ f.options[+i.dataset.op]=i.value; }; i.onchange=()=>redraw(); });
  $$('[data-opu]',e).forEach(b=>b.onclick=()=>{ const i=+b.dataset.opu; [f.options[i-1],f.options[i]]=[f.options[i],f.options[i-1]]; redraw(); });
  $$('[data-opx]',e).forEach(b=>b.onclick=()=>{ f.options.splice(+b.dataset.opx,1); redraw(); });
  const oa=$('[data-opa]',e); if(oa) oa.onclick=()=>{ const v=$('#opn',e).value.trim(); if(!v) return; f.options=[...(f.options||[]),v]; redraw(); };
  const hd=$('[data-hide]',e); if(hd) hd.onclick=()=>{ f.hidden=f.hidden?0:1; redraw(); };
  const dl=$('[data-del]',e); if(dl) dl.onclick=async()=>{ if(!await confirmBox(`ลบช่อง "${f.label}"? รายงานเก่าที่กรอกไว้ยังเก็บข้อมูลเดิม`,'ลบช่อง',true)) return; FB.fields.splice(FB.fields.indexOf(f),1); FB.sel=Math.max(0,FB.sel-1); redraw(); };
}
function addFieldSheet(done){
  const types=['text','longtext','number','single','multi','date','time','switch','photo','signature']; let t='text';
  const ov=overlay(`<div class="modal" role="dialog" aria-modal="true" style="max-width:520px"><h3 class="h2" style="font-size:18px">เพิ่มช่องใหม่</h3>
    <div class="fbtypes">${types.map(k=>`<button class="fbtype ${k===t?'on':''}" data-t="${k}"><span class="fbt">${FTYPES[k][1]}</span><b class="sm">${FTYPES[k][0]}</b></button>`).join('')}</div>
    <div class="field"><label for="nf_l">ชื่อช่อง</label><input class="in" id="nf_l" placeholder="เช่น ความคืบหน้างาน (%)"></div>
    <div class="row" style="gap:8px;justify-content:flex-end"><button class="btn" data-x>ยกเลิก</button><button class="btn btn-p" data-ok>เพิ่มช่อง</button></div></div>`);
  $$('[data-t]',ov.el).forEach(b=>b.onclick=()=>{ t=b.dataset.t; $$('[data-t]',ov.el).forEach(x=>x.classList.toggle('on',x===b)); });
  $('[data-x]',ov.el).onclick=ov.close;
  $('[data-ok]',ov.el).onclick=()=>{ const l=$('#nf_l',ov.el).value.trim(); if(!l) return toast('ใส่ชื่อช่อง',true);
    const nf={key:'c_'+Date.now().toString(36),type:t,label:l,show_pdf:1,show_line:0}; if(['single','multi'].includes(t)) nf.options=['ตัวเลือก 1','ตัวเลือก 2']; ov.close(); done(nf); };
}
function formPreview(fields){
  const L=DL();
  const core={ weather:f=>`<div class="field"><label>${esc(f.label)}${f.required?' *':''}</label><div class="chips">${(L.weather||[]).map((w,i)=>`<span class="chip ${i?'':'on'}">${esc(w)}</span>`).join('')}</div></div>`,
    no_work:f=>`<div class="card row" style="padding:10px 12px"><b class="grow sm">${esc(f.label)}</b><span class="sw"></span></div>`,
    crew:f=>`<div class="field"><label>${esc(f.label)}</label><div class="card" style="padding:8px 12px"><div class="row sm"><span class="grow">ช่างปูน</span><b>4</b></div></div></div>`,
    work_items:f=>`<div class="field"><label>${esc(f.label)} *</label><div class="in" style="height:56px"></div></div>`,
    machinery:f=>`<div class="field"><label>${esc(f.label)}</label><div class="chips">${(L.machinery||[]).slice(0,3).map(w=>`<span class="chip">${esc(w)}</span>`).join('')}</div></div>`,
    tools:f=>`<div class="field"><label>${esc(f.label)}</label><div class="chips">${(L.tools||[]).slice(0,3).map(w=>`<span class="chip">${esc(w)}</span>`).join('')}</div></div>`,
    problems:f=>`<div class="field"><label>${esc(f.label)}</label><div class="in" style="height:44px"></div></div>`,
    category:f=>`<div class="field"><label>${esc(f.label)}${f.required?' *':''}</label><div class="chips">${((S.settings.daily_lists?.issue_cats)||['หน้างาน/ความปลอดภัย','เครื่องจักร/อุปกรณ์','วัสดุ','อื่น ๆ']).slice(0,6).map((c,i)=>`<span class="chip ${i?'':'on'}">${esc(c)}</span>`).join('')}</div></div>`,
    urgency:f=>`<div class="field"><label>${esc(f.label)} *</label><div class="seg"><button class="on">ปกติ</button><button>ด่วน</button><button>ด่วนมาก</button></div></div>`,
    site_id:f=>`<div class="field"><label>${esc(f.label)}${f.required?' *':''}</label><div class="in">— เลือกไซต์ —</div></div>`,
    title:f=>`<div class="field"><label>${esc(f.label)} *</label><div class="in"></div></div>`,
    detail:f=>`<div class="field"><label>${esc(f.label)}${f.required?' *':''}</label><div class="in" style="height:56px"></div></div>`,
    photos:f=>FB.form==='issue'?`<div class="field"><label>${esc(f.label)}</label><div class="pgrid"><div class="pthumb padd">${IC.camera}</div></div></div>`:`<div class="field"><label>${esc(f.label)} * · อย่างน้อย ${minPhotos()} รูป</label><div class="pgrid"><div class="pthumb padd">${IC.camera}</div></div></div>` };
  return `<div class="col" style="gap:10px">${fields.filter(f=>!f.hidden).map(f=>core[f.key]?core[f.key](f):cfHTML(f,null,'pv')).join('')}</div>`;
}
