/* =====================================================================
   ขออนุมัติงาน (ตรวจเหล็ก / เทคอนกรีต / ประเภทที่แอดมินเพิ่ม)
   ===================================================================== */
const WA_ELEMENTS_DEF=['ฐานราก','ตอม่อ','เสา','คาน','พื้น','บันได','ผนัง','หลังคา'];
const WA_TYPES_DEF=[
  {key:'rebar',name:'ตรวจเหล็กเสริม',icon:'🔩',prefix:'RB',active:true,doc_title:'แบบขออนุมัติตรวจสอบเหล็กเสริม',doc_title_en:'REQUEST FOR REBAR INSPECTION',checklist:['ขนาดและจำนวนเหล็กยืนตามแบบ','ระยะเรียงเหล็กปลอก','ระยะทาบ/การต่อเหล็ก','ระยะหุ้มคอนกรีต (ลูกปูน)','ความสะอาด ไม่มีสนิมขุม/คราบน้ำมัน'],signers:[{label:'ผู้ขอ',who:'requester'},{label:'ผู้ตรวจสอบ',who:'checker'},{label:'ผู้อนุมัติ',who:'manager'}],requires:[]},
  {key:'concrete',name:'เทคอนกรีต',icon:'🏗️',prefix:'CP',active:true,doc_title:'แบบขออนุมัติเทคอนกรีต',doc_title_en:'REQUEST FOR CONCRETE POURING',checklist:['ตรวจเหล็กเสริมผ่านแล้ว','แบบหล่อ/ค้ำยันแข็งแรง ได้ระดับ','ทำความสะอาดภายในแบบ','เตรียมเครื่องจี้/ไฟสำรอง/แผนรับฝน','เตรียมเก็บตัวอย่างคอนกรีต (ก้อนตัวอย่าง/slump)'],signers:[{label:'ผู้ขอ',who:'requester'},{label:'ผู้ตรวจสอบ',who:'checker'},{label:'ผู้อนุมัติ',who:'manager'}],requires:['rebar']}];
const WA_WHO={requester:'ผู้ขอ (อัตโนมัติ)',checker:'ผู้ตรวจ (ผู้ได้รับสิทธิ์)',manager:'ผู้บริหาร',paper:'เซ็นบนกระดาษ'};
const WA_ST={submitted:['รอตรวจ','t-warn'],in_review:['รออนุมัติ','t-acc'],approved:['อนุมัติแล้ว','t-ok'],rejected:['ไม่ผ่าน','t-bad'],cancelled:['ยกเลิก','']};
const WA_RES={pass:['ผ่าน','#16A34A'],conditional:['ผ่านแบบมีเงื่อนไข','#D97706'],fail:['ไม่ผ่าน','#DC2626']};
const waTypes=()=>{ const t=S.settings.wa_types; return t&&t.length?t:WA_TYPES_DEF; };
const waType=k=>waTypes().find(t=>t.key===k);
const waElements=()=>{ const l=S.settings.daily_lists?.wa_elements; return l&&l.length?l:WA_ELEMENTS_DEF; };
const waCanSign=(w,t)=>{ const s=t?.signers?.[w.step]; if(!s||!['submitted','in_review'].includes(w.status)) return false; return s.who==='checker'?(isManager()||hasMod('wa',['checker'])):s.who==='manager'?isManager():s.who==='requester'?w.requester===S.profile.id:false; };
let WA_SITE=null, WA_TAB='list', WA_PRE=null;

/* ฟอร์มของแต่ละประเภท (แก้ได้ในตัวสร้างฟอร์ม) */
function waSyncForms(){
  if(typeof FORM_DEFS==='undefined') return;
  FTYPES.checklist=FTYPES.checklist||['รายการตรวจ','☑']; FTYPES.datetime=FTYPES.datetime||['วันเวลา','🕘'];
  waTypes().forEach(t=>{ const k='wa_'+t.key; if(FORM_DEFS[k]) { FORM_DEFS[k].name='ขออนุมัติ: '+t.name; return; }
    const base=[{key:'site_id',type:'single',label:'ไซต์',core:1,required:1,locked:1},{key:'floor',type:'text',label:'ชั้น/โซน',core:1,required:1},
      {key:'element',type:'single',label:'ชิ้นส่วนโครงสร้าง',core:1,required:1,list:'wa_elements'},{key:'element_code',type:'text',label:'ตำแหน่ง/รหัสชิ้นส่วน',core:1,required:1,locked:1,help:'เช่น C1–C8, B1–B12, F1–F6'},
      {key:'drawing_ref',type:'text',label:'แบบอ้างอิง',core:1,help:'เช่น S-05, S-12'},{key:'request_at',type:'datetime',label:t.key==='concrete'?'วันเวลาที่จะเท':'ขอตรวจวันเวลา',core:1,required:1}];
    const extra=t.key==='concrete'?[{key:'c_strength',type:'text',label:'กำลังอัดคอนกรีต',help:'เช่น 280 ksc (Cylinder)',show_pdf:1},{key:'c_volume',type:'number',label:'ปริมาณ',unit:'ลบ.ม.',show_pdf:1},
      {key:'c_method',type:'single',label:'วิธีเท',options:['รถปั๊ม','ราง/สาลี่','ทาวเวอร์เครน'],show_pdf:1},{key:'c_supplier',type:'text',label:'ผู้จำหน่ายคอนกรีต',show_pdf:1},{key:'c_samples',type:'text',label:'การเก็บตัวอย่าง',help:'เช่น 6 ก้อน · slump 10±2 ซม.',show_pdf:1}]:[];
    FORM_DEFS[k]={name:'ขออนุมัติ: '+t.name,fields:[...base,...extra,{key:'checklist',type:'checklist',label:'รายการตรวจ (ตรวจเองก่อนส่ง)',core:1,locked:1},{key:'photos',type:'photos',label:'รูปถ่าย',core:1,locked:1}]}; });
}

async function pageWa(a,b){
  waSyncForms();
  if(a==='new') return waForm(b);
  if(a&&/^\d+$/.test(a)) return waDetailPage(+a);
  return waList();
}

/* ---------- ฟอร์มขออนุมัติ ---------- */
function waForm(typeKey){
  const t=waType(typeKey); if(!t) return location.replace('#wa');
  const FIELDS=formOf('wa_'+t.key), pre=WA_PRE||{}; WA_PRE=null; const pMin=photoMin(FIELDS,'photos',0), pMax=photoMax(FIELDS,'photos',9);
  const F={site_id:pre.site_id||(S.site?+S.site:mySiteIds()[0]||''),floor:pre.floor||'',element:pre.element||'',element_code:pre.element_code||'',drawing_ref:pre.drawing_ref||'',request_at:'',extra:{...(pre.data||{})},photos:[],ref_id:pre.ref_id||null,
    checklist:t.checklist.map(it=>({item:it,self:false}))}, FX={};
  setPage(head(`ขออนุมัติ: ${t.name}`,t.doc_title,{back:'#wa'})+'<div id="waf" class="col" style="gap:14px;max-width:760px"></div><div class="savebar" id="wabar"></div>');
  const host=$('#waf'), sites=S.sites.filter(s=>s.status==='active'&&(isManager()||mySiteIds().includes(s.id)||hasMod('wa')));
  const req=f=>f.required?' <span style="color:var(--bad)">*</span>':'', hlp=f=>f.help?`<span class="hint">${esc(f.help)}</span>`:'';
  const inp=(f,k,ph='')=>`<div class="field"><label for="wa_${k}">${esc(f.label)}${req(f)}</label><input class="in" id="wa_${k}" value="${esc(F[k]||'')}" placeholder="${ph}">${hlp(f)}</div>`;
  const B={
    site_id:f=>`<div class="field"><label for="wa_site">${esc(f.label)}${req(f)}</label><select class="in" id="wa_site">${sites.map(s=>`<option value="${s.id}" ${+F.site_id===s.id?'selected':''}>${esc(s.name)}${s.code?` (${esc(s.code)})`:''}</option>`).join('')}</select></div>`,
    floor:f=>inp(f,'floor','เช่น ชั้น 2 / โซน A'), element_code:f=>inp(f,'element_code'), drawing_ref:f=>inp(f,'drawing_ref'),
    element:f=>`<div class="field"><label>${esc(f.label)}${req(f)}</label><div class="chips">${waElements().map(e=>`<button type="button" class="chip ${F.element===e?'on':''}" data-el="${esc(e)}">${esc(e)}</button>`).join('')}</div></div>`,
    request_at:f=>`<div class="field"><label for="wa_at">${esc(f.label)}${req(f)}</label><input class="in" type="datetime-local" id="wa_at" value="${esc(F.request_at)}"></div>`,
    checklist:f=>`<div class="field"><label>${esc(f.label)}</label><div class="card card-l" style="box-shadow:none">${F.checklist.map((c,i)=>`<label class="li" style="gap:10px;cursor:pointer"><input type="checkbox" data-ck="${i}" ${c.self?'checked':''} style="width:20px;height:20px;accent-color:var(--accent)"><span class="sm grow">${esc(c.item)}</span></label>`).join('')}</div><span class="hint">รายการตรวจแก้ได้ที่ ตั้งค่าระบบ > ประเภทการขออนุมัติ</span></div>`,
    photos:f=>`<div class="field"><label>${esc(f.label)}${pMin?' <span style="color:var(--bad)">*</span>':''} <span class="muted" style="${F.photos.length<pMin?'color:var(--bad)':''}">${F.photos.length}${pMin?` / ขั้นต่ำ ${pMin}`:` / ${pMax}`}</span></label><div class="pgrid">${F.photos.map((p,i)=>`<div class="pthumb"><img src="${p.url}" alt=""><button type="button" data-delp="${i}" aria-label="ลบรูป">×</button></div>`).join('')}${F.photos.length<pMax?`<label class="pthumb padd">${IC.camera}<span class="xs">เพิ่มรูป</span><input type="file" accept="image/*" multiple hidden data-ph></label>`:''}</div></div>`
  };
  const keep=()=>{ [['floor','wa_floor'],['element_code','wa_element_code'],['drawing_ref','wa_drawing_ref'],['request_at','wa_at'],['site_id','wa_site']].forEach(([k,id])=>{ const e=$('#'+id); if(e) F[k]=e.value; }); };
  const draw=()=>{ host.innerHTML=`${F.ref_id?'<div class="note n-warn"><span class="xs">ขอตรวจใหม่ อ้างอิงใบเดิมที่ไม่ผ่าน</span></div>':''}${(t.requires||[]).length?`<div class="note n-info"><span class="xs">ต้องผ่าน "${(t.requires||[]).map(r=>waType(r)?.name||r).join(', ')}" ของชิ้นส่วนเดียวกัน (ชั้นและรหัสตรงกัน) ก่อน จึงส่งได้</span></div>`:''}`+FIELDS.map(f=>B[f.key]?B[f.key](f):cfHTML(f,F.extra[f.key])).join('');
    $$('[data-el]',host).forEach(b=>b.onclick=()=>{ keep(); F.element=b.dataset.el; draw(); });
    $$('[data-ck]',host).forEach(c=>c.onchange=()=>{ F.checklist[+c.dataset.ck].self=c.checked; });
    $$('[data-delp]',host).forEach(b=>b.onclick=()=>{ keep(); F.photos.splice(+b.dataset.delp,1); draw(); });
    const ph=$('[data-ph]',host); if(ph) ph.onchange=async()=>{ keep(); for(const f of [...ph.files].slice(0,pMax-F.photos.length)){ const bl=await resizeImage(f,1600); F.photos.push({blob:bl,url:URL.createObjectURL(bl)}); } draw(); };
    cfBind(host,F.extra,()=>{ keep(); draw(); },FX); };
  draw();
  $('#wabar').innerHTML=`<span class="sm muted grow">ผู้ขอ: ${esc(S.profile.display_name)}</span><button class="btn btn-p" id="wago">ส่งขออนุมัติ</button>`;
  $('#wago').onclick=async ev=>{ keep(); cfCollectSignatures(F.extra);
    const fd=k=>FIELDS.find(x=>x.key===k);
    if(!F.site_id) return toast('เลือกไซต์',true); if(fd('floor')?.required&&!F.floor.trim()) return toast('กรอกชั้น/โซน',true);
    if(fd('element')?.required&&!F.element) return toast('เลือกชิ้นส่วนโครงสร้าง',true); if(!F.element_code.trim()) return toast('กรอกตำแหน่ง/รหัสชิ้นส่วน',true);
    if(fd('request_at')?.required&&!F.request_at) return toast('ระบุวันเวลา',true);
    if(F.photos.length<pMin) return toast(`ต้องแนบรูปอย่างน้อย ${pMin} รูป`,true);
    const cv=cfValidate(FIELDS,F.extra); if(cv) return toast(cv,true);
    signSheet('ลงชื่อผู้ขอ',async(sig)=>{
      busy(ev.target,true,'กำลังส่ง...');
      try{ const {data,error}=await sb.rpc('create_wa',{p:{type_key:t.key,site_id:F.site_id,floor:F.floor,element:F.element,element_code:F.element_code,drawing_ref:F.drawing_ref,request_at:F.request_at?new Date(F.request_at).toISOString():null,data:cfStrip(F.extra),checklist:F.checklist,ref_id:F.ref_id},p_sig:sig});
        if(error) throw error;
        const paths=[]; for(let i=0;i<F.photos.length;i++){ const p=`${data.id}/${Date.now()}_${i+1}.jpg`; const {error:e2}=await sb.storage.from('wa-photos').upload(p,F.photos[i].blob,{contentType:'image/jpeg'}); if(!e2) paths.push(p); }
        await sb.rpc('wa_set_extra',{p_id:data.id,p_photos:paths,p_folder:null});
        const setBlobs=[]; if(FIELDS.some(f=>!f.core&&f.type==='photos'&&(F.extra[f.key]||[]).length)){ await cfUploadPhotoSets(FIELDS,F.extra,async(bl,f,i)=>{ const path=`${data.id}/${f.key}_${Date.now()}_${i+1}.jpg`; const {error:e3}=await sb.storage.from('wa-photos').upload(path,bl,{contentType:'image/jpeg'}); if(!e3) setBlobs.push({blob:bl,name:`${f.label} ${i+1}.jpg`}); return e3?null:{path}; }); await sb.rpc('wa_merge_data',{p_id:data.id,p:cfStrip(F.extra)}); }
        toast(`ส่งคำขอ ${data.wa_no} แล้ว`); location.hash='#wa/'+data.id;
        waSyncDrive(data.id,[...F.photos.map((p,i)=>({blob:p.blob,name:`รูปที่ ${i+1}.jpg`})),...setBlobs]).catch(()=>{});
      }catch(e){ busy(ev.target,false); toast(/create_wa/.test(e.message||'')?'ยังไม่ได้รันไฟล์ 21_work_approvals.sql':errText(e),true); } });
  };
}
function signSheet(title, done, extraHTML='', onOpen){
  const ov=overlay(`<div class="modal" role="dialog" aria-modal="true" style="max-width:560px"><h3 class="h2" style="font-size:18px">${esc(title)}</h3>${extraHTML}<div class="field"><label>ลายเซ็น *</label><div id="sgp"></div><span class="hint">${esc(S.profile.display_name)} · ${new Date().toLocaleString('th-TH',{dateStyle:'medium',timeStyle:'short'})}</span></div>
    <div class="row" style="gap:8px;justify-content:flex-end"><button class="btn" data-x>ยกเลิก</button><button class="btn btn-p" data-ok>ยืนยันลงนาม</button></div></div>`);
  const pad=signaturePad($('#sgp',ov.el)); onOpen&&onOpen(ov.el);
  $('[data-x]',ov.el).onclick=ov.close;
  $('[data-ok]',ov.el).onclick=async()=>{ if(pad.empty()) return toast('ลงลายเซ็นก่อน',true); const r=onOpen?.validate?.(ov.el); if(r===false) return; ov.close(); await done(pad.data(),ov.el); };
}

/* ---------- รายการ / ภาพรวมชิ้นส่วน ---------- */
async function waList(){
  const sites=S.sites.filter(s=>s.status==='active'); if(WA_SITE==null) WA_SITE=S.site?+S.site:(mySiteIds()[0]||sites[0]?.id||null);
  const types=waTypes().filter(t=>t.active!==false);
  setPage(head('ขออนุมัติงาน','ตรวจเหล็ก · เทคอนกรีต · ประเภทอื่น')+`<div class="col" style="gap:12px">
    <div class="watypes">${types.map(t=>`<a href="#wa/new/${t.key}" class="card col" style="gap:4px;align-items:center;text-align:center;text-decoration:none;color:inherit;padding:14px"><span style="font-size:26px">${esc(t.icon||'📋')}</span><b class="sm">ขอ${esc(t.name)}</b>${(t.requires||[]).length?`<span class="xs muted">ต้องผ่าน${(t.requires||[]).map(r=>waType(r)?.name||r).join(', ')}ก่อน</span>`:''}</a>`).join('')}</div>
    <div class="row" style="gap:8px;flex-wrap:wrap"><select class="in" id="wsite" style="height:40px;width:auto;flex:1;min-width:200px">${sites.map(s=>`<option value="${s.id}" ${s.id===WA_SITE?'selected':''}>${esc(s.name)}</option>`).join('')}</select><div class="seg" style="width:auto">${[['list','รายการ'],['track','ภาพรวมชิ้นส่วน']].map(([k,t])=>`<button class="${WA_TAB===k?'on':''}" data-wt="${k}">${t}</button>`).join('')}</div></div><div id="wab"><div class="loading"><div class="spin"></div></div></div></div>`);
  $('#wsite').onchange=e=>{ WA_SITE=+e.target.value; waList(); };
  $$('[data-wt]').forEach(b=>b.onclick=()=>{ WA_TAB=b.dataset.wt; waList(); });
  const {data,error}=await sb.from('work_approvals').select('id,wa_no,type_key,site_id,floor,element,element_code,status,result,step,requester,requester_name,created_at,request_at,approved_at').eq('site_id',WA_SITE).order('created_at',{ascending:false}).limit(400);
  const H=$('#wab');
  if(error){ H.outerHTML=/work_approvals/.test(error.message)?'<div class="card empty"><b>ยังไม่ได้อัปเดตฐานข้อมูล</b>รันไฟล์ 21_work_approvals.sql</div>':`<div class="note n-bad">${esc(errText(error))}</div>`; return; }
  const L=data||[];
  if(WA_TAB==='track'){
    const rows={}; L.filter(w=>w.status!=='cancelled').forEach(w=>{ const k=`${w.floor||''}|${(w.element_code||'').toUpperCase()}`; const r=rows[k]=rows[k]||{floor:w.floor,element:w.element,code:w.element_code,by:{}}; if(!r.by[w.type_key]||r.by[w.type_key].created_at<w.created_at) r.by[w.type_key]=w; });
    const R=Object.values(rows).sort((a,b)=>String(a.floor).localeCompare(String(b.floor),'th',{numeric:true})||String(a.code).localeCompare(String(b.code),'th',{numeric:true}));
    const cell=w=>{ if(!w) return '<span class="tag" style="height:22px;font-size:11px;color:var(--ink2)">ยังไม่ขอ</span>'; const [t,c]=w.status==='approved'&&w.result==='conditional'?['ผ่าน (มีเงื่อนไข)','t-acc']:WA_ST[w.status]; return `<a href="#wa/${w.id}" class="tag ${c}" style="height:22px;font-size:11px;text-decoration:none">${t}</a>`; };
    H.outerHTML=`<div class="card" style="padding:0;overflow-x:auto"><table class="tbl"><thead><tr><th>ชั้น/โซน</th><th>ชิ้นส่วนโครงสร้าง</th>${types.map(t=>`<th style="text-align:center">${esc(t.icon||'')} ${esc(t.name)}</th>`).join('')}</tr></thead><tbody>
      ${R.map(r=>`<tr><td>${esc(r.floor||'-')}</td><td><b>${esc(r.element||'')}</b> ${esc(r.code||'')}</td>${types.map(t=>`<td style="text-align:center">${cell(r.by[t.key])}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${types.length+2}"><div class="empty"><b>ยังไม่มีคำขอในไซต์นี้</b></div></td></tr>`}</tbody></table></div>`;
    return;
  }
  H.outerHTML=`<div class="card card-l">${L.map(w=>{ const t=waType(w.type_key)||{}; const [st,sc]=w.status==='approved'&&w.result==='conditional'?['ผ่าน (มีเงื่อนไข)','t-acc']:WA_ST[w.status]; const me=waCanSign(w,t);
    return `<a href="#wa/${w.id}" class="li" style="text-decoration:none;color:inherit"><span style="font-size:22px">${esc(t.icon||'📋')}</span><div class="grow"><b class="sm">${esc(t.name||w.type_key)} · ${esc(w.element||'')} ${esc(w.element_code||'')} ${esc(w.floor||'')}</b><span class="xs muted">${esc(w.wa_no||'')} · ${esc(w.requester_name||'')}${w.request_at?` · ${new Date(w.request_at).toLocaleString('th-TH',{dateStyle:'short',timeStyle:'short'})}`:''}</span></div>${me?'<span class="tag t-warn" style="height:20px;font-size:10.5px">รอคุณลงนาม</span>':''}<span class="tag ${sc}" style="height:20px;font-size:10.5px">${st}</span></a>`; }).join('')||'<div class="empty"><b>ยังไม่มีคำขอ</b>กดปุ่มด้านบนเพื่อขออนุมัติ</div>'}</div>`;
}

/* ---------- รายละเอียด / ลงนาม ---------- */
function waDetailPage(id){ setPage(head('ใบขออนุมัติ','',{back:'#wa'})+'<div id="wad" class="card" style="max-width:880px"><div class="loading"><div class="spin"></div></div></div>'); waDetail($('#wad'),id); }
async function waDetail(host,id){
  const {data:w,error}=await sb.from('work_approvals').select('*').eq('id',id).maybeSingle();
  if(error||!w){ host.innerHTML='<div class="empty"><b>ไม่พบใบขออนุมัติ หรือไม่มีสิทธิ์ดู</b></div>'; return; }
  const t=waType(w.type_key)||{name:w.type_key,signers:[],checklist:[]}, site=S.sites.find(s=>s.id===w.site_id), setF=formOf('wa_'+w.type_key).filter(f=>!f.core&&f.type==='photos'&&(w.data?.[f.key]||[]).length), urls=await waUrls([...(w.photos||[]),...setF.flatMap(f=>w.data[f.key].map(p=>p.path))]);
  const FIELDS=formOf('wa_'+w.type_key).filter(f=>!f.core&&w.data&&cfText(f,w.data[f.key])), can=waCanSign(w,t), step=t.signers?.[w.step];
  const [st,sc]=WA_ST[w.status];
  host.innerHTML=`<div class="col" style="gap:12px"><div class="row" style="gap:8px;flex-wrap:wrap"><span style="font-size:24px">${esc(t.icon||'📋')}</span><b class="grow" style="font-size:18px">${esc(t.doc_title||t.name)}</b><span class="tag ${sc}">${st}</span>${w.result?`<span class="tag" style="background:${WA_RES[w.result][1]};color:#fff">${WA_RES[w.result][0]}</span>`:''}</div>
    <span class="xs muted">${esc(w.wa_no||'')} · ${esc(site?.name||'')} · ผู้ขอ ${esc(w.requester_name||'')}${w.requester_position?` (${esc(w.requester_position)})`:''}</span>
    <div class="card" style="padding:4px 14px;box-shadow:none">${[['ชิ้นส่วน',`${w.element||''} ${w.element_code||''}`],['ชั้น/โซน',w.floor],['แบบอ้างอิง',w.drawing_ref],['วันเวลา',w.request_at?new Date(w.request_at).toLocaleString('th-TH',{dateStyle:'medium',timeStyle:'short'}):''],...FIELDS.map(f=>[f.label,cfText(f,w.data[f.key])])].filter(x=>x[1]).map(([a,b])=>`<div class="kv"><span>${esc(a)}</span><span>${esc(b)}</span></div>`).join('')}</div>
    <div class="card" style="padding:0;overflow-x:auto;box-shadow:none"><table class="tbl"><thead><tr><th>รายการตรวจ</th><th style="text-align:center">ผู้ขอ</th><th style="text-align:center">ผลตรวจ</th><th>หมายเหตุ</th></tr></thead><tbody>${(w.checklist||[]).map(c=>`<tr><td>${esc(c.item)}</td><td style="text-align:center">${c.self?'✓':''}</td><td style="text-align:center;font-weight:700;color:${c.result==='pass'?'#16A34A':c.result==='fail'?'#DC2626':'var(--ink2)'}">${c.result==='pass'?'ผ่าน':c.result==='fail'?'ไม่ผ่าน':'-'}</td><td class="xs">${esc(c.note||'')}</td></tr>`).join('')}</tbody></table></div>
    ${w.conditions?`<div class="note n-warn"><span><b>เงื่อนไข:</b> ${esc(w.conditions)}</span></div>`:''}
    ${setF.map(f=>`<b class="xs">${esc(f.label)}</b><div class="pgrid">${w.data[f.key].map(p=>urls[p.path]?`<a class="pthumb" href="${urls[p.path]}" target="_blank" rel="noopener"><img src="${urls[p.path]}" alt=""></a>`:'').join('')}</div>`).join('')}
    ${(w.photos||[]).length?`<div class="pgrid">${w.photos.map(p=>urls[p]?`<a class="pthumb" href="${urls[p]}" target="_blank" rel="noopener"><img src="${urls[p]}" alt=""></a>`:'').join('')}</div>`:''}
    <b class="sm">การลงนาม</b><div class="wasig">${(t.signers||[]).map((s,i)=>{ const g=(w.signatures||[]).find(x=>x.idx===i); return `<div class="${g?'done':i===w.step&&['submitted','in_review'].includes(w.status)?'now':''}"><span class="xs muted">${esc(s.label)}${s.who==='paper'?' · เซ็นบนกระดาษ':''}</span>${g?.sig?`<img src="${g.sig}" alt="ลายเซ็น">`:'<div class="wasig-blank"></div>'}<b class="xs">${esc(g?.name||'')}</b><span class="xs muted">${g?new Date(g.at).toLocaleString('th-TH',{dateStyle:'short',timeStyle:'short'}):s.who==='paper'?'':'รอลงนาม'}</span></div>`; }).join('')}</div>
    ${can?`<button class="btn btn-p" data-sign>ลงนาม: ${esc(step.label)}</button>`:''}
    <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn btn-sm" data-pdf>เอกสาร A4 (PDF / แชร์ LINE)</button>${w.drive_folder?.url?`<a class="btn btn-sm" href="${esc(w.drive_folder.url)}" target="_blank" rel="noopener">เปิดโฟลเดอร์ Drive (QR)</a>`:''}${hasBridge()&&(isManager()||hasMod('wa',['checker']))?'<label class="btn btn-sm">แนบไฟล์ลงโฟลเดอร์ (QR)<input type="file" hidden data-att multiple></label>':''}
      ${w.status==='rejected'&&w.requester===S.profile.id?'<button class="btn btn-sm" data-redo>ขอตรวจใหม่</button>':''}${['submitted','in_review'].includes(w.status)&&(w.requester===S.profile.id||isManager())?'<button class="btn btn-sm btn-bad" data-cancel>ยกเลิกคำขอ</button>':''}</div></div>`;
  const reload=()=>waDetail(host,id);
  const sg=$('[data-sign]',host); if(sg) sg.onclick=()=>waSignFlow(w,t,step,reload);
  $('[data-pdf]',host).onclick=()=>waShare(id);
  const at=$('[data-att]',host); if(at) at.onchange=async()=>{ try{ const folder=await waEnsureFolder(w); for(const f of at.files){ if(f.size>20*1048576){ toast(`${f.name} ใหญ่เกิน 20 MB`,true); continue; } await bridge('wa_upload',{folder_id:folder.id,name:f.name,mime:f.type||'application/octet-stream',data:await blobToB64(f),replace:false}); } toast('แนบไฟล์ลงโฟลเดอร์แล้ว'); reload(); }catch(e){ toast(errText(e),true); } };
  const rd=$('[data-redo]',host); if(rd) rd.onclick=()=>{ WA_PRE={site_id:w.site_id,floor:w.floor,element:w.element,element_code:w.element_code,drawing_ref:w.drawing_ref,data:w.data,ref_id:w.id}; location.hash='#wa/new/'+w.type_key; };
  const cx=$('[data-cancel]',host); if(cx) cx.onclick=async()=>{ if(!await confirmBox('ยกเลิกคำขอนี้?','ยกเลิกคำขอ',true)) return; const {error}=await sb.rpc('cancel_wa',{p_id:id}); if(error) return toast(errText(error),true); reload(); };
}
function waSignFlow(w,t,step,reload){
  const isChecker=step.who==='checker'&&!w.result;
  const extra=isChecker?`<div class="card card-l" style="box-shadow:none">${(w.checklist||[]).map((c,i)=>`<div class="li" style="flex-wrap:wrap;gap:6px"><span class="sm grow">${esc(c.item)}</span><div class="seg" style="width:auto;padding:2px"><button type="button" data-r="${i}" data-v="pass" style="min-height:30px">ผ่าน</button><button type="button" data-r="${i}" data-v="fail" style="min-height:30px">ไม่ผ่าน</button></div><input class="in" data-n="${i}" placeholder="หมายเหตุ" style="height:34px;width:100%"></div>`).join('')}</div>
    <div class="field"><label>สรุปผล *</label><div class="seg">${Object.entries(WA_RES).map(([k,[l,c]])=>`<button type="button" data-res="${k}" style="color:${c}">${l}</button>`).join('')}</div></div><div class="field"><label>เงื่อนไข/ข้อแก้ไข</label><textarea class="in" id="wcond" rows="2"></textarea></div>`
    :`<div class="field"><label>หมายเหตุ (ถ้ามี)</label><input class="in" id="wnote"></div>`;
  const R={}, CL=(w.checklist||[]).map(c=>({...c})); let res='';
  const onOpen=el=>{ $$('[data-r]',el).forEach(b=>b.onclick=()=>{ R[b.dataset.r]=b.dataset.v; $$(`[data-r="${b.dataset.r}"]`,el).forEach(x=>x.classList.toggle('on',x===b)); if(!res) { const anyFail=Object.values(R).includes('fail'); } });
    $$('[data-res]',el).forEach(b=>b.onclick=()=>{ res=b.dataset.res; $$('[data-res]',el).forEach(x=>x.classList.toggle('on',x===b)); }); };
  onOpen.validate=el=>{ if(!isChecker) return true; if(!res){ toast('เลือกสรุปผล',true); return false; } if((res!=='pass')&&!$('#wcond',el).value.trim()){ toast('ระบุเงื่อนไข/ข้อแก้ไข',true); return false; } return true; };
  signSheet(`ลงนาม: ${step.label}`,async(sig,el)=>{
    const p={sig}; if(isChecker){ CL.forEach((c,i)=>{ c.result=R[i]||c.result||null; c.note=$(`[data-n="${i}"]`,el)?.value.trim()||c.note||''; }); p.checklist=CL; p.result=res; p.conditions=$('#wcond',el).value.trim(); } else p.note=$('#wnote',el)?.value.trim();
    const {data,error}=await sb.rpc('sign_wa',{p_id:w.id,p}); if(error) return toast(errText(error),true);
    toast(data==='approved'?'อนุมัติครบแล้ว':data==='rejected'?'บันทึกผล: ไม่ผ่าน':'ลงนามแล้ว ส่งต่อผู้ลงนามถัดไป'); reload(); waSyncDrive(w.id).catch(()=>{});
  },extra,onOpen);
}
const waUrls=async paths=>{ if(!paths?.length) return {}; const {data}=await sb.storage.from('wa-photos').createSignedUrls(paths,3600); const o={}; (data||[]).forEach(x=>{ if(x.signedUrl) o[x.path]=x.signedUrl; }); return o; };
async function waEnsureFolder(w){
  if(w.drive_folder?.id) return w.drive_folder; if(!hasBridge()) throw new Error('ต้องติดตั้ง Bridge');
  const f=await bridge('wa_folder',{site_id:w.site_id,wa_no:w.wa_no}); await sb.rpc('wa_set_extra',{p_id:w.id,p_photos:null,p_folder:f}); w.drive_folder=f; return f;
}
/* สร้าง/อัปเดต PDF ในโฟลเดอร์ Drive ของใบ (QR บนเอกสารเปิดโฟลเดอร์นี้) */
async function waSyncDrive(id, newPhotos){
  if(!hasBridge()) return;
  const {data:w}=await sb.from('work_approvals').select('*').eq('id',id).single(); const f=await waEnsureFolder(w);
  for(let i=0;i<(newPhotos||[]).length;i++){ const x=newPhotos[i]; await bridge('wa_upload',{folder_id:f.id,name:x.name||`รูปที่ ${i+1}.jpg`,mime:'image/jpeg',data:await blobToB64(x.blob||x)}); }
  const dd=await waDocFit(w,await waPhotoData(w)); await bridge('wa_upload',{folder_id:f.id,name:`${w.wa_no}.pdf`,mime:'application/pdf',data:await pdfB64(dd)});
}
async function waPhotoData(w){
  const sets=formOf('wa_'+w.type_key).filter(f=>!f.core&&f.type==='photos'&&(w.data?.[f.key]||[]).length);
  const all=[...(w.photos||[]),...sets.flatMap(f=>w.data[f.key].map(p=>p.path))].filter(Boolean), urls=await waUrls(all);
  const dataUrl=async p=>{ if(!urls[p]) return null; try{ const bl=await (await fetch(urls[p])).blob(); const u=URL.createObjectURL(bl); try{ const im=await new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=u; }); const q=Math.min(1,1400/Math.max(im.naturalWidth,im.naturalHeight)), c=document.createElement('canvas'); c.width=Math.round(im.naturalWidth*q); c.height=Math.round(im.naturalHeight*q); c.getContext('2d').drawImage(im,0,0,c.width,c.height); return c.toDataURL('image/jpeg',.86); } finally{ URL.revokeObjectURL(u); } }catch(_){ return null; } }; // ย่อรูปเหลือ 1400px ให้สร้าง PDF เร็วขึ้น (ยังคมชัดพอพิมพ์)
  const main=[]; for(const p of (w.photos||[]).slice(0,30)){ const d=await dataUrl(p); if(d) main.push(d); }
  const out=main; out.sets=[]; for(const f of sets){ const imgs=[]; for(const p of w.data[f.key]){ const d=await dataUrl(p.path); if(d) imgs.push(d); } if(imgs.length) out.sets.push({label:f.label,imgs}); }
  return out;
}
async function waShare(id){
  try{ const {data:w,error}=await sb.from('work_approvals').select('*').eq('id',id).single(); if(error) throw error;
    if(hasBridge()&&!w.drive_folder) try{ await waEnsureFolder(w); }catch(_){}
    const dd=await waDocFit(w,await waPhotoData(w)); vectorPreview(dd,w.wa_no||'wa',(waType(w.type_key)||{}).doc_title||'ใบขออนุมัติ','');
  }catch(e){ toast(errText(e),true); }
}

/* ---------- ตั้งค่าระบบ: ประเภทการขออนุมัติ ---------- */
function stWa(host){
  const T=JSON.parse(JSON.stringify(waTypes())); let sel=0;
  const draw=()=>{ const t=T[sel];
    host.innerHTML=`<div class="card col" style="gap:10px"><div class="row"><b class="grow">ประเภทการขออนุมัติ</b><button class="btn btn-sm" data-add>+ เพิ่มประเภท</button></div>
      <div class="card card-l" style="box-shadow:none">${T.map((x,i)=>`<div class="li ${i===sel?'on':''}" data-sel="${i}" style="cursor:pointer;${i===sel?'background:color-mix(in srgb,var(--accent) 12%,transparent)':''}"><span style="font-size:20px">${esc(x.icon||'📋')}</span><div class="grow"><b class="sm">${esc(x.name)}</b><span class="xs muted">${esc(x.prefix)}-… · ตรวจ ${x.checklist.length} ข้อ · ลงนาม ${x.signers.length} ช่อง${(x.requires||[]).length?` · ต้องผ่าน ${(x.requires||[]).map(r=>T.find(y=>y.key===r)?.name||r).join(', ')}`:''}</span></div><span class="tag ${x.active!==false?'t-ok':''}">${x.active!==false?'ใช้งาน':'ปิด'}</span></div>`).join('')}</div></div>
    ${t?`<div class="card col" style="gap:10px"><b class="sm">แก้ไข: ${esc(t.name)}</b>
      <div class="g2"><label class="field"><span class="xs muted">ชื่อประเภท</span><input class="in" data-k="name" value="${esc(t.name)}"></label><div class="g2"><label class="field"><span class="xs muted">ไอคอน</span><input class="in" data-k="icon" value="${esc(t.icon||'')}" maxlength="4"></label><label class="field"><span class="xs muted">ตัวย่อเลขที่</span><input class="in" data-k="prefix" value="${esc(t.prefix)}" maxlength="4" style="text-transform:uppercase"></label></div></div>
      <label class="field"><span class="xs muted">ชื่อเอกสาร (หัวกระดาษ A4)</span><input class="in" data-k="doc_title" value="${esc(t.doc_title||'')}"></label><label class="field"><span class="xs muted">ชื่อเอกสารภาษาอังกฤษ</span><input class="in" data-k="doc_title_en" value="${esc(t.doc_title_en||'')}"></label>
      <label class="row sm" style="gap:8px"><input type="checkbox" data-act ${t.active!==false?'checked':''}> เปิดใช้งาน</label>
      <div class="field"><span class="xs muted">ต้องผ่านประเภทนี้ก่อน (ชิ้นส่วนเดียวกัน)</span><div class="chips">${T.filter(x=>x.key!==t.key).map(x=>`<button class="chip ${(t.requires||[]).includes(x.key)?'on':''}" data-req="${x.key}">${esc(x.name)}</button>`).join('')||'<span class="xs muted">-</span>'}</div></div>
      <div class="field"><span class="xs muted">รายการตรวจ</span><div class="card card-l" style="box-shadow:none">${t.checklist.map((c,i)=>`<div class="li" style="gap:6px"><input class="in grow" data-ci="${i}" value="${esc(c)}" style="height:38px"><button class="ibtn" data-cu="${i}" ${i?'':'disabled'} aria-label="ขึ้น">${svg('<path d="M6 15l6-6 6 6"/>')}</button><button class="ibtn" data-cx="${i}" aria-label="ลบ">${IC.close}</button></div>`).join('')}<div class="li"><input class="in grow" id="cnew" placeholder="เพิ่มรายการตรวจ" style="height:38px"><button class="btn btn-sm" data-cadd>เพิ่ม</button></div></div></div>
      <div class="field"><span class="xs muted">ช่องลงนาม (เรียงตามลำดับการอนุมัติ · ช่องแรกคือผู้ขอ)</span><div class="card card-l" style="box-shadow:none">${t.signers.map((s,i)=>`<div class="li" style="gap:6px;flex-wrap:wrap"><input class="in" data-sl="${i}" value="${esc(s.label)}" style="height:38px;flex:1;min-width:140px"><select class="in" data-sw="${i}" style="height:38px;width:auto" ${i===0?'disabled':''}>${Object.entries(WA_WHO).filter(([k])=>i===0?k==='requester':k!=='requester').map(([k,l])=>`<option value="${k}" ${s.who===k?'selected':''}>${l}</option>`).join('')}</select>${i>0?`<button class="ibtn" data-su="${i}" ${i>1?'':'disabled'} aria-label="ขึ้น">${svg('<path d="M6 15l6-6 6 6"/>')}</button><button class="ibtn" data-sx="${i}" aria-label="ลบ">${IC.close}</button>`:''}</div>`).join('')}<div class="li"><button class="btn btn-sm" data-sadd>+ เพิ่มผู้ตรวจสอบ/อนุมัติ</button></div></div><span class="hint">"เซ็นบนกระดาษ" = แสดงช่องในเอกสาร A4 แต่ไม่ต้องลงนามในแอป (เช่น ผู้ควบคุมงานฝั่งเจ้าของ)</span></div>
      <span class="xs muted">หัวข้อที่ต้องกรอกในฟอร์ม แก้ที่ <a href="#studio/forms">ตัวสร้างฟอร์ม</a> (เลือก "ขออนุมัติ: ${esc(t.name)}")</span>
      <button class="btn btn-p" data-save style="align-self:flex-start">บันทึกประเภทการขออนุมัติ</button></div>`:''}`;
    $$('[data-sel]',host).forEach(r=>r.onclick=()=>{ sel=+r.dataset.sel; draw(); });
    $('[data-add]',host).onclick=()=>{ T.push({key:'t'+Date.now().toString(36),name:'ประเภทใหม่',icon:'📋',prefix:'WA',active:true,doc_title:'แบบขออนุมัติ',doc_title_en:'REQUEST FOR APPROVAL',checklist:['รายการตรวจ 1'],signers:[{label:'ผู้ขอ',who:'requester'},{label:'ผู้ตรวจสอบ',who:'checker'},{label:'ผู้อนุมัติ',who:'manager'}],requires:[]}); sel=T.length-1; draw(); };
    if(!t) return;
    $$('[data-k]',host).forEach(i=>i.oninput=()=>{ t[i.dataset.k]=i.dataset.k==='prefix'?i.value.toUpperCase():i.value; });
    $('[data-act]',host).onchange=e=>{ t.active=e.target.checked; };
    $$('[data-req]',host).forEach(b=>b.onclick=()=>{ const k=b.dataset.req; t.requires=(t.requires||[]).includes(k)?t.requires.filter(x=>x!==k):[...(t.requires||[]),k]; draw(); });
    $$('[data-ci]',host).forEach(i=>i.oninput=()=>{ t.checklist[+i.dataset.ci]=i.value; });
    $$('[data-cu]',host).forEach(b=>b.onclick=()=>{ const i=+b.dataset.cu; [t.checklist[i-1],t.checklist[i]]=[t.checklist[i],t.checklist[i-1]]; draw(); });
    $$('[data-cx]',host).forEach(b=>b.onclick=()=>{ t.checklist.splice(+b.dataset.cx,1); draw(); });
    $('[data-cadd]',host).onclick=()=>{ const v=$('#cnew',host).value.trim(); if(v){ t.checklist.push(v); draw(); } };
    $$('[data-sl]',host).forEach(i=>i.oninput=()=>{ t.signers[+i.dataset.sl].label=i.value; });
    $$('[data-sw]',host).forEach(s=>s.onchange=()=>{ t.signers[+s.dataset.sw].who=s.value; });
    $$('[data-su]',host).forEach(b=>b.onclick=()=>{ const i=+b.dataset.su; [t.signers[i-1],t.signers[i]]=[t.signers[i],t.signers[i-1]]; draw(); });
    $$('[data-sx]',host).forEach(b=>b.onclick=()=>{ t.signers.splice(+b.dataset.sx,1); draw(); });
    $('[data-sadd]',host).onclick=()=>{ t.signers.push({label:'ผู้ตรวจสอบเพิ่มเติม',who:'paper'}); draw(); };
    $('[data-save]',host).onclick=async ev=>{ if(T.some(x=>!x.name.trim()||!x.prefix.trim()||!x.checklist.length)) return toast('ทุกประเภทต้องมีชื่อ ตัวย่อ และรายการตรวจอย่างน้อย 1 ข้อ',true);
      if(T.some(x=>x.signers.filter(s=>s.who!=='paper').length<2)) return toast('ต้องมีผู้ลงนามในแอปอย่างน้อย 1 ช่องนอกจากผู้ขอ',true);
      busy(ev.target,true); try{ await saveSetting('wa_types',T); toast('บันทึกแล้ว'); draw(); }catch(e){ busy(ev.target,false); toast(e.message,true); } };
  };
  draw();
}
