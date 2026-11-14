/* =====================================================================
   รายชื่อพนักงาน
   ===================================================================== */
let listFilter={q:'',pos:'',st:'active'};
async function pageEmployees(){
  setPage(head('พนักงาน','<span id="cnt">กำลังโหลด</span>',{dActions:`${isAdmin()?'<button class="btn" data-order>จัดลำดับ / รหัส</button>':''}<button class="btn btn-p" data-add>${IC.plus}เพิ่มพนักงาน</button>`, mActions:isAdmin()?'<button class="btn btn-sm btn-acc" data-order>จัดลำดับ</button>':''}) +
    `<div class="row" style="gap:10px"><label class="grow" style="position:relative;display:block"><span style="position:absolute;left:14px;top:13px;color:var(--ink2)">${IC.search}</span><input class="in" id="q" placeholder="ค้นหาชื่อ ชื่อเล่น รหัส หรือเลขบัตร" style="padding-left:46px" value="${esc(listFilter.q)}" aria-label="ค้นหา"></label>
      <select class="in" id="st" style="width:auto;flex:none" aria-label="สถานะ"><option value="active">ทำงานอยู่</option><option value="resigned">ลาออกแล้ว</option><option value="">ทั้งหมด</option></select></div>
    <div class="chips scroll" id="pc"></div><div id="rqn"></div><div id="el"><div class="loading"><div class="spin"></div></div></div>` +
    `<button class="fab" data-add>${IC.plus}เพิ่มพนักงาน</button>`);
  sb.from('emp_change_requests').select('id',{count:'exact',head:true}).eq('status','pending').then(({count})=>{ const h=$('#rqn'); if(h&&count) h.innerHTML=`<a class="note n-warn" href="#reqs" style="text-decoration:none">${IC.info}<span><b>มีคำขอแก้ไขข้อมูลส่วนตัวรออนุมัติ ${count} รายการ</b> (เช่น เปลี่ยนรูปโปรไฟล์) — แตะเพื่อตรวจและอนุมัติ</span></a>`; });
  $('#st').value=listFilter.st;
  $$('[data-add]').forEach(b=>b.onclick=()=>openWizard(null));
  $$('[data-order]').forEach(b=>b.onclick=staffOrderSheet);
  $('#q').addEventListener('input',e=>{ listFilter.q=e.target.value; drawList(); });
  $('#st').addEventListener('change',e=>{ listFilter.st=e.target.value; drawList(); });
  const {data,error}=await sb.from('employees').select('*').order('sort_order',{nullsFirst:false}).order('emp_code');
  if(error){ $('#el').innerHTML=`<div class="note n-bad">${esc(errText(error))}</div>`; return; }
  S.employees=data||[]; drawList();
}
function drawList(){
  const {q,pos,st}=listFilter; const ql=q.trim().toLowerCase();
  const base=S.employees.filter(e=>!st||e.status===st);
  const counts={}; base.forEach(e=>{ if(e.position_id) counts[e.position_id]=(counts[e.position_id]||0)+1; });
  $('#pc').innerHTML=`<button class="chip ${!pos?'on':''}" data-pos="">ทั้งหมด ${base.length}</button>`+
    Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([id,c])=>`<button class="chip ${pos==id?'on':''}" data-pos="${id}">${esc(posName(+id))} ${c}</button>`).join('');
  $$('[data-pos]').forEach(b=>b.onclick=()=>{ listFilter.pos=b.dataset.pos; drawList(); });
  const rows=base.filter(e=>(!pos||String(e.position_id)===pos)&&(!ql||[e.first_name,e.last_name,e.nickname,e.emp_code,e.national_id,e.first_name_en,e.last_name_en].some(v=>(v||'').toLowerCase().includes(ql))));
  $('#cnt').textContent=`แสดง ${rows.length} จาก ${S.employees.length} คน`;
  if(!S.employees.length){ $('#el').innerHTML=`<div class="card empty"><b>ยังไม่มีพนักงานในระบบ</b>กด "เพิ่มพนักงาน" เพื่อบันทึกคนแรก</div>`; return; }
  if(!rows.length){ $('#el').innerHTML=`<div class="card empty"><b>ไม่พบพนักงานตามเงื่อนไข</b>ลองเปลี่ยนคำค้นหรือตัวกรอง</div>`; return; }
  $('#el').innerHTML=`<div class="lgrid">${rows.map(e=>{
    const exp=daysUntil(e.id_expiry_date);
    const tags=[e.status==='resigned'?'<span class="tag t-bad">ลาออก</span>':'', e.employment_type==='probation'?'<span class="tag">ทดลองงาน</span>':'', exp!==null&&exp<=60?`<span class="tag ${exp<0?'t-bad':'t-warn'}">บัตร${exp<0?'หมดอายุ':'ใกล้หมด'}</span>`:''].join(' ');
    return `<a href="#emp/${e.id}" class="lcard">${avatar(e)}<div class="grow"><span class="ecode">${esc(e.emp_code||'')}</span><b>${esc(shortName(e))}${e.nickname?` <span class="muted" style="font-weight:400">(${esc(e.nickname)})</span>`:''}</b>
      <div class="sm muted">${esc(posName(e.position_id))}${e.birth_date?` อายุ ${diffYM(e.birth_date).y} ปี`:''}</div>${tags.trim()?`<div class="row" style="gap:6px;margin-top:4px;flex-wrap:wrap">${tags}</div>`:''}</div>${starBadge(e.stars)}</a>`; }).join('')}</div>`;
  hydratePhotos($('#el'));
}

/* =====================================================================
   บัตรพนักงาน (รายละเอียด)
   ===================================================================== */
let profTab='personal';
async function pageProfile(id, readonly=false, preload=null){
  if(!readonly) setPage(head('ข้อมูลพนักงาน','',{back:'#employees', mActions:`<button class="btn btn-sm btn-acc" data-edit>แก้ไข</button>`, dActions:`<button class="btn btn-p" data-edit>แก้ไขข้อมูล</button>`}) + `<div id="pb"><div class="loading"><div class="spin"></div></div></div>`);
  if(!readonly&&isManager()) sb.from('emp_change_requests').select('id',{count:'exact',head:true}).eq('status','pending').eq('employee_id',id).then(({count})=>{ const pb=$('#pb'); if(pb&&count) pb.insertAdjacentHTML('beforebegin',`<a class="note n-warn" href="#reqs" style="text-decoration:none;margin-bottom:10px">${IC.info}<span><b>พนักงานคนนี้มีคำขอแก้ไขข้อมูลรออนุมัติ</b> — แตะเพื่อดูค่าเดิม/ค่าใหม่ แล้วอนุมัติ</span></a>`); });
  let e=preload;
  if(!e){ const {data,error}=await sb.from('employees').select('*').eq('id',id).single(); if(error){ $('#pb').innerHTML=`<div class="card empty"><b>ไม่พบข้อมูลพนักงาน</b>${esc(errText(error))}</div>`; return; } e=data; }
  const tabs=[['personal','ส่วนตัว'],['card','บัตร'],['addr','ที่อยู่'],['contact','ติดต่อ'],['job','งาน']]; if(S.hasPhase2) tabs.push(['stars','ดาว']); if(!readonly) tabs.push(['hist','ประวัติ']);
  const kv=(a,b)=>`<div class="kv"><span>${a}</span><span>${b||'-'}</span></div>`;
  const body={
    personal:()=>kv('ชื่อ (อังกฤษ)',esc([e.first_name_en,e.last_name_en].filter(Boolean).join(' ')))+kv('ชื่อเล่น',esc(e.nickname))+kv('เพศ',GENDER[e.gender])+kv('วันเกิด',e.birth_date?thaiDate(e.birth_date,false):'')+kv('อายุ',e.birth_date?ageText(e.birth_date):'')+kv('สัญชาติ',esc(e.nationality))+kv('สถานภาพ',MARITAL[e.marital_status])+(e.gender==='male'?kv('สถานะทางทหาร',MILITARY[e.military_status]):'')+kv('หมู่เลือด',e.blood_type?`${e.blood_type} <span class="tag t-ok" style="margin-left:4px">ยินยอม ${thaiDate(localISO(new Date(e.blood_consent_at)))}</span>`:''),
    card:()=>{ const d=daysUntil(e.id_expiry_date); return kv('เลขบัตรประชาชน',`<span class="num">${esc(fmtId(e.national_id))}</span>`)+kv('วันออกบัตร',e.id_issue_date?thaiDate(e.id_issue_date):'')+kv('วันหมดอายุ',e.id_expiry_date?`${thaiDate(e.id_expiry_date)}${d!==null&&d<=60?` <span class="tag ${d<0?'t-bad':'t-warn'}">${d<0?'หมดอายุแล้ว':`อีก ${d} วัน`}</span>`:''}`:'')+kv('เลขประกันสังคม',`<span class="num">${esc(e.social_security_no&&e.social_security_no.length===13?fmtId(e.social_security_no):e.social_security_no)}</span>`)+kv('โรงพยาบาลตามสิทธิ์',esc(e.sso_hospital)); },
    addr:()=>`<div class="kv" style="flex-direction:column;gap:2px"><span>ที่อยู่ตามบัตรประชาชน</span><span style="text-align:left">${esc(addrText(e))}</span></div><div class="kv" style="flex-direction:column;gap:2px"><span>ที่อยู่ปัจจุบัน</span><span style="text-align:left">${e.cur_same?'เหมือนที่อยู่ตามบัตรประชาชน':esc(addrText(e,'cur'))}</span></div>`,
    contact:()=>kv('เบอร์มือถือ',e.phone?`<a href="tel:${digits(e.phone)}">${esc(e.phone)}</a>`:'')+kv('LINE ID',esc(e.line_id))+kv('อีเมล',esc(e.email))+kv('ธนาคาร',esc(e.bank_name))+kv('เลขบัญชี',`<span class="num">${esc(e.bank_account_no)}</span>`)+kv('ชื่อบัญชี',esc(e.bank_account_name)),
    job:()=>kv('ตำแหน่ง',esc(posName(e.position_id)))+kv('ประเภทการจ้าง',EMPTYPE[e.employment_type])+(e.pay_site_id!==undefined?kv('จุดรับเงินเดือน',(()=>{ const x=S.sites.find(t=>t.id===e.pay_site_id); return x?esc(`ไซต์ ${x.code?x.code+' ':''}${x.contract_name||x.name}`):'บริษัท'; })()):'')+kv('สถานะ',e.status==='active'?'<span class="tag t-ok">ทำงานอยู่</span>':'<span class="tag t-bad">ลาออกแล้ว</span>')+kv('วันเริ่มงาน',e.start_date?thaiDate(e.start_date):'')+kv('อายุงาน',e.start_date?serviceText(e.start_date):'')+(e.probation_end?kv('ครบทดลองงาน',thaiDate(e.probation_end)):'')+(e.status==='resigned'?kv('วันที่ลาออก',e.resign_date?thaiDate(e.resign_date):'')+kv('เหตุผล',esc(e.resign_reason)):'')+kv('ค่าแรง',`<span class="num">${money(e.wage_rate)} บาท/${e.wage_type==='daily'?'วัน':'เดือน'}</span>`)+kv('ค่า OT',`<span class="num">${money(e.ot_rate)} บาท/ชม.</span>`),
    hist:()=>'<div id="hl" style="padding:12px 0"><div class="spin"></div></div>',
    stars:()=>'<div id="sh"><div class="spin" style="margin:16px auto"></div></div>'
  };
  const stepOf={personal:0,card:1,addr:2,contact:3,job:4,hist:0,stars:4};
  const draw=()=>{
    const target = readonly ? $('#ro') : $('#pb');
    target.innerHTML=`<div class="col" style="gap:12px;max-width:760px">
      <div class="idc"><div class="row" style="justify-content:space-between;margin-bottom:12px"><span class="xs" style="color:#C2D0D3">${COMPANY}</span><span class="xs" style="background:rgba(255,255,255,.14);padding:2px 8px;border-radius:6px;font-weight:600">${esc(e.emp_code)}</span></div>
        <div class="row" style="align-items:flex-start;gap:14px"><div class="photo">${e.photo_path?`<img data-ph="${esc(e.photo_path)}" alt="รูปถ่าย ${esc(shortName(e))}">`:''}<span>ยังไม่มี<br>รูปถ่าย</span></div>
          <div class="grow"><div style="font-size:20px;font-weight:700;line-height:1.3">${esc(fullName(e))}</div>${e.first_name_en?`<div class="sm" style="color:#C9D6D9">${esc(e.first_name_en)} ${esc(e.last_name_en||'')}</div>`:''}
          <div class="sm" style="margin-top:6px">${[GENDER[e.gender],posName(e.position_id)].filter(x=>x&&x!=='-').join(' · ')}</div>
          <div class="row" style="gap:8px;margin-top:8px">${stars5(e.stars)}<b class="sm">${Number(e.stars).toFixed(1)}</b></div></div></div></div>
      <div class="chips scroll" style="margin:0">${tabs.map(([k,t])=>`<button class="chip ${profTab===k?'on':''}" data-tab="${k}">${t}</button>`).join('')}</div>
      <div class="card card-l">${(body[profTab]||body.personal)()}</div>
      ${e.emergency_name?`<div class="card row" style="padding:12px 14px"><div class="grow"><div class="xs muted">ผู้ติดต่อกรณีฉุกเฉิน</div><b>${esc(e.emergency_name)}${e.emergency_relation?` (${esc(e.emergency_relation)})`:''}</b><div class="sm muted num">${esc(e.emergency_phone||'')}</div></div>
        ${e.emergency_phone?`<a href="tel:${digits(e.emergency_phone)}" class="ibtn" style="background:var(--okBg);color:var(--ok)" aria-label="โทรหาผู้ติดต่อฉุกเฉิน">${IC.phone}</a>`:''}</div>`:''}
      ${!readonly&&isAdmin()?`<button class="btn btn-bad btn-sm" data-del style="align-self:flex-start">ลบพนักงานออกจากระบบ</button>`:''}
    </div>`;
    $$('[data-tab]',target).forEach(b=>b.onclick=()=>{ profTab=b.dataset.tab; draw(); });
    hydratePhotos(target);
    if(profTab==='hist'&&!readonly) showHistory(e.id, $('#hl'));
    if(profTab==='stars'){ const card=$('#sh',target).parentElement; if(!readonly&&isManager()){ card.insertAdjacentHTML('beforebegin',starAdjustHTML()); bindStarAdjust($('#adj',target), e.id, async()=>{ const {data}=await sb.from('employees').select('*').eq('id',e.id).single(); e=data||e; draw(); }); }
      starHistoryHTML(e.id).then(h=>{ const el=$('#sh',target); if(el) el.outerHTML=h; }); }
    const d=$('[data-del]',target); if(d) d.onclick=async()=>{
      if(!await confirmBox(`ลบ ${fullName(e)} ถาวร? ถ้าพนักงานลาออก แนะนำให้เปลี่ยนสถานะเป็น "ลาออกแล้ว" แทน เพื่อเก็บประวัติไว้`,'ลบถาวร',true)) return;
      const {error}=await sb.from('employees').delete().eq('id',e.id); if(error) return toast(errText(error),true);
      if(e.photo_path) await sb.storage.from(PHOTO_BUCKET).remove([e.photo_path]);
      toast('ลบแล้ว'); location.hash='#employees';
    };
  };
  if(!readonly) $$('[data-edit]').forEach(b=>b.onclick=()=>openWizard(e, stepOf[profTab]||0, saved=>pageProfile(saved.id)));
  draw();
}
function readOnlyCard(e){
  const m=overlay(`<div class="sheet"><header class="appbar stripe"><button class="ibtn" data-x aria-label="ปิด">${IC.close}</button><h1>บัตรพนักงานของฉัน</h1></header><div class="sheet-body" id="ro"></div></div>`, false);
  $('[data-x]',m.el).onclick=m.close; profTab='personal'; pageProfile(e.id, true, e);
}
const FIELD_TH={title:'คำนำหน้า',first_name:'ชื่อ',last_name:'นามสกุล',first_name_en:'ชื่ออังกฤษ',last_name_en:'นามสกุลอังกฤษ',nickname:'ชื่อเล่น',gender:'เพศ',birth_date:'วันเกิด',nationality:'สัญชาติ',marital_status:'สถานภาพ',military_status:'สถานะทหาร',blood_type:'หมู่เลือด',national_id:'เลขบัตร',id_issue_date:'วันออกบัตร',id_expiry_date:'วันหมดอายุบัตร',social_security_no:'เลขประกันสังคม',sso_hospital:'โรงพยาบาลประกันสังคม',addr_no:'บ้านเลขที่',addr_subdistrict:'ตำบล',addr_district:'อำเภอ',addr_province:'จังหวัด',addr_zip:'รหัสไปรษณีย์',cur_same:'ที่อยู่ปัจจุบันเหมือนบัตร',phone:'เบอร์มือถือ',line_id:'LINE ID',email:'อีเมล',emergency_name:'ผู้ติดต่อฉุกเฉิน',emergency_phone:'เบอร์ฉุกเฉิน',bank_name:'ธนาคาร',bank_account_no:'เลขบัญชี',bank_account_name:'ชื่อบัญชี',position_id:'ตำแหน่ง',employment_type:'ประเภทการจ้าง',start_date:'วันเริ่มงาน',probation_end:'ครบทดลองงาน',status:'สถานะ',resign_date:'วันลาออก',wage_type:'รูปแบบค่าจ้าง',wage_rate:'ค่าแรง',ot_rate:'อัตรา OT',stars:'ดาว',photo_path:'รูปถ่าย',health_scheme:'สิทธิ์การรักษา',sso_enabled:'หักประกันสังคม',sso_method:'วิธีหักประกันสังคม',sso_fixed:'ยอดหักประกันสังคม/งวด',id_photo_path:'รูปจากบัตรประชาชน',photo_is_id:'ใช้รูปจากบัตร',addr_moo:'หมู่',addr_soi:'ซอย',addr_road:'ถนน',cur_no:'บ้านเลขที่ (ปัจจุบัน)',cur_moo:'หมู่ (ปัจจุบัน)',cur_soi:'ซอย (ปัจจุบัน)',cur_road:'ถนน (ปัจจุบัน)',cur_subdistrict:'ตำบล (ปัจจุบัน)',cur_district:'อำเภอ (ปัจจุบัน)',cur_province:'จังหวัด (ปัจจุบัน)',cur_zip:'รหัสไปรษณีย์ (ปัจจุบัน)',emergency_relation:'ความสัมพันธ์ผู้ติดต่อฉุกเฉิน',blood_consent_at:'ยินยอมเก็บหมู่เลือด',emp_code:'รหัสพนักงาน',pay_site_id:'จุดรับเงินเดือน',sort_order:'ลำดับ',qr_token:'QR ประจำตัว',user_id:'บัญชีผู้ใช้'};
const HIST_SKIP=['updated_at','change_reason','created_at','created_by'];
async function showHistory(id, box){
  const {data,error}=await sb.from('audit_log').select('*').eq('table_name','employees').eq('record_id',id).order('changed_at',{ascending:false}).limit(40);
  if(error){ box.innerHTML=`<span class="hint bad">${esc(errText(error))}</span>`; return; }
  const blank=data.filter(a=>a.action==='UPDATE'&&!Object.keys({...(a.old_data||{}),...(a.new_data||{})}).some(k=>!HIST_SKIP.includes(k)&&JSON.stringify(a.old_data?.[k])!==JSON.stringify(a.new_data?.[k]))).map(a=>a.id);
  const adm=isAdmin(), N=data.filter(a=>a.action!=='CLEAR').length;
  const bar=adm&&N?`<div class="row" style="justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:6px"><span class="xs muted">ประวัติการแก้ไข ${N} รายการ</span><button class="btn btn-sm btn-bad" data-hclr>ล้างประวัติ</button></div><div id="hpop"></div>`:'';
  if(!data.length){ box.innerHTML='<span class="muted">ยังไม่มีประวัติ</span>'; return; }
  const fv=(k,v)=> v==null||v===''?'-': typeof v==='boolean'?(v?'ใช่':'ไม่'): k==='health_scheme'?((typeof hsOf==='function'&&hsOf(v)?.name)||v): k==='sso_method'?({actual:'ตามค่าจ้างจริง',cap:'ตามเพดานค่าแรง',fixed:'กรอกยอดเอง',none:'ไม่หัก'}[v]||v): k==='id_photo_path'||k==='qr_token'?'อัปเดต': k==='user_id'?'ผูกบัญชีแล้ว': k==='pay_site_id'?((S.sites.find(t=>t.id===+v)||{}).name||v): k==='position_id'?posName(v): k==='photo_path'?'อัปโหลดรูป': /date/.test(k)?thaiDate(v): k==='gender'?GENDER[v]: k==='employment_type'?EMPTYPE[v]: k==='marital_status'?MARITAL[v]: k==='cur_same'?(v?'ใช่':'ไม่ใช่'): v;
  box.innerHTML=bar+data.map(a=>{ const dt=new Date(a.changed_at);
    if(a.action==='CLEAR') return `<div class="note n-warn" style="margin:8px 0;font-size:13px">${IC.info}<span><b>${thaiDate(localISO(dt))} ${dt.toTimeString().slice(0,5)}</b> · ${esc(a.reason||'ล้างประวัติ')} โดย ${esc(a.changed_by_name||'-')}</span></div>`;
    const other=Object.keys({...(a.old_data||{}),...(a.new_data||{})}).filter(k=>!FIELD_TH[k]&&!HIST_SKIP.includes(k)&&JSON.stringify(a.old_data?.[k])!==JSON.stringify(a.new_data?.[k]));
    let what=a.action==='INSERT'?'เพิ่มเข้าระบบ':a.action==='DELETE'?'ลบ':(Object.keys(FIELD_TH).filter(k=>JSON.stringify(a.old_data?.[k])!==JSON.stringify(a.new_data?.[k])).map(k=>`${FIELD_TH[k]}: ${esc(fv(k,a.old_data[k]))} → ${esc(fv(k,a.new_data[k]))}`).join('<br>')||(other.length?'แก้ไข: '+esc(other.join(', ')):'บันทึกโดยไม่มีข้อมูลเปลี่ยน'));
    return `<div style="padding:10px 0;border-bottom:1px solid var(--line);font-size:13.5px"><b>${thaiDate(localISO(dt))} ${dt.toTimeString().slice(0,5)}</b> <span class="muted">โดย ${esc(a.changed_by_name||'ระบบ')}</span><div style="margin-top:2px">${what}</div>${a.reason?`<div class="muted">เหตุผล: ${esc(a.reason)}</div>`:''}</div>`; }).join('');
  const hb=$('[data-hclr]',box); if(!hb) return;
  hb.onclick=()=>{ const P=$('#hpop',box); if(P.innerHTML){ P.innerHTML=''; return; }
    P.innerHTML=`<div class="card col" style="gap:8px;margin-bottom:8px;border-color:var(--bad)"><b class="sm">ล้างประวัติของพนักงานคนนี้</b>
      <label class="row sm" style="gap:8px"><input type="radio" name="hm" value="all" checked>ล้างทั้งหมด</label>
      <label class="row sm" style="gap:8px;flex-wrap:wrap"><input type="radio" name="hm" value="before">เฉพาะก่อนวันที่ <input class="in" type="date" id="hbd" value="${localISO()}" style="height:34px;width:auto"></label>
      <label class="row sm" style="gap:8px"><input type="radio" name="hm" value="blank">เฉพาะรายการที่ไม่มีรายละเอียด (${blank.length})</label>
      <span class="xs muted">ข้อมูลพนักงานไม่เปลี่ยน ล้างเฉพาะบันทึกประวัติ · ระบบเก็บบันทึก 1 บรรทัดว่าใครล้างเมื่อไร</span>
      <div class="row" style="gap:8px"><button class="btn btn-sm btn-bad" data-hgo>ยืนยันล้าง</button><button class="btn btn-sm" data-hno>ยกเลิก</button></div></div>`;
    $('[data-hno]',P).onclick=()=>P.innerHTML='';
    $('[data-hgo]',P).onclick=async ev=>{ const m=$('input[name=hm]:checked',P).value; if(m==='blank'&&!blank.length) return toast('ไม่มีรายการที่ไม่มีรายละเอียด',true);
      busy(ev.target,true); const {data:n,error}=await sb.rpc('clear_emp_history',{p_emp:id,p_before:m==='before'?$('#hbd',P).value:null,p_ids:m==='blank'?blank:null}); busy(ev.target,false);
      if(error) return toast(/clear_emp_history|function/.test(error.message)?'ต้องรันไฟล์ 27_data_reset.sql ก่อน':errText(error),true);
      toast(`ล้างประวัติ ${n||0} รายการแล้ว`); showHistory(id,box); }; };
}

/* =====================================================================
   ทะเบียนประวัติ 5 ขั้น (เพิ่ม/แก้ไข)
   ===================================================================== */
const EMP_FIELDS=['title','first_name','last_name','first_name_en','last_name_en','nickname','gender','birth_date','nationality','marital_status','military_status','blood_type','blood_consent_at',
  'national_id','id_issue_date','id_expiry_date','social_security_no','sso_hospital','sso_method','sso_fixed',
  'addr_no','addr_moo','addr_soi','addr_road','addr_subdistrict','addr_district','addr_province','addr_zip',
  'cur_same','cur_no','cur_moo','cur_soi','cur_road','cur_subdistrict','cur_district','cur_province','cur_zip',
  'phone','line_id','email','emergency_name','emergency_relation','emergency_phone','bank_name','bank_account_no','bank_account_name',
  'position_id','employment_type','start_date','probation_end','status','resign_date','resign_reason','wage_type','wage_rate','ot_rate','photo_path','pay_site_id'];

async function loadAddr(){
  if(ADDR) return ADDR;
  const r=await fetch('thai-address.json'); const j=await r.json();
  ADDR=j.d.map(([d,ai,z])=>({d, a:j.a[ai][0], p:j.p[j.a[ai][1]], z:String(z)}));
  return ADDR;
}
function searchAddr(q){
  q=q.trim(); if(!q||!ADDR) return [];
  if(/^\d{3,5}$/.test(q)) return ADDR.filter(x=>x.z.startsWith(q)).slice(0,8);
  const a=ADDR.filter(x=>x.d.startsWith(q)), b=ADDR.filter(x=>!x.d.startsWith(q)&&x.d.includes(q));
  return [...a,...b].slice(0,8);
}

function openWizard(e, startStep=0, onSaved){
  const isNew=!e;
  const F = isNew ? {title:'นาย',gender:'male',nationality:'ไทย',cur_same:true,employment_type:'permanent',status:'active',wage_type:'daily',wage_rate:0,ot_rate:0,_dp:{}} : {...e,_dp:{}};
  const orig=e?{...e}:null;
  let step=startStep, photoBlob=null, photoPreview=null, idPhotoBlob=null;
  const m=overlay(`<div class="sheet" role="dialog" aria-modal="true" aria-label="${isNew?'เพิ่มพนักงาน':'แก้ไขข้อมูลพนักงาน'}"></div>`, false, false);
  const sheet=$('.sheet',m.el);
  const wageChanged=()=>!isNew&&(Number(F.wage_rate)!==Number(orig.wage_rate)||Number(F.ot_rate)!==Number(orig.ot_rate)||F.wage_type!==orig.wage_type);
  const v=k=>esc(F[k]??'');
  const inp=(k,label,o={})=>`<div class="field ${o.cls||''}"><label for="f_${k}">${label}</label><input class="in ${o.num?'num':''}" id="f_${k}" data-f="${k}" ${o.fmt?`data-fmt="${o.fmt}"`:''} type="${o.type||'text'}" ${o.mode?`inputmode="${o.mode}"`:''} value="${o.val!==undefined?esc(o.val):v(k)}" ${o.ph?`placeholder="${o.ph}"`:''} ${o.ro?'readonly':''} ${o.auto?`autocomplete="${o.auto}"`:'autocomplete="off"'}>${o.hint!==undefined?`<span class="hint ${o.hcls||''}" data-h="${k}">${o.hint}</span>`:''}</div>`;
  const sel=(k,label,opts,o={})=>`<div class="field"><label for="f_${k}">${label}</label><select class="in" id="f_${k}" data-f="${k}" ${o.re?'data-re':''}><option value="">${o.empty||'เลือก'}</option>${opts.map(([val,t])=>`<option value="${esc(val)}" ${String(F[k]??'')===String(val)?'selected':''}>${esc(t)}</option>`).join('')}</select></div>`;
  const seg=(k,opts)=>`<div class="seg" role="radiogroup">${opts.map(([val,t])=>`<button type="button" role="radio" aria-checked="${F[k]===val}" class="${F[k]===val?'on':''}" data-seg="${k}" data-v="${esc(val)}">${t}</button>`).join('')}</div>`;
  const addrBlock=(pre)=>`<div class="g2">${inp(pre+'_no','บ้านเลขที่')}${inp(pre+'_moo','หมู่ที่',{mode:'numeric'})}</div>
    <div class="g2">${inp(pre+'_soi','ซอย',{ph:'ไม่มี'})}${inp(pre+'_road','ถนน',{ph:'ไม่มี'})}</div>
    <div class="field" style="position:relative"><label for="f_${pre}_subdistrict">ตำบล/แขวง (พิมพ์แล้วเลือก หรือพิมพ์รหัสไปรษณีย์)</label><input class="in" id="f_${pre}_subdistrict" data-f="${pre}_subdistrict" data-addr="${pre}" value="${v(pre+'_subdistrict')}" autocomplete="off"><div data-dd="${pre}"></div></div>
    <div class="g2">${inp(pre+'_district','อำเภอ/เขต')}${inp(pre+'_province','จังหวัด')}</div>
    <div class="g2">${inp(pre+'_zip','รหัสไปรษณีย์',{num:true,mode:'numeric'})}<div class="hint" style="align-self:end;padding-bottom:14px">เลือกตำบลแล้วเติมให้อัตโนมัติ</div></div>`;

  const stepsHTML=[
    ()=>`${typeof idCardBox==='function'&&isManager()?idCardBox():''}<div class="photo-pick"><div class="pv">${photoPreview?`<img src="${photoPreview}" alt="">`:(F.photo_path?`<img data-ph="${esc(F.photo_path)}" alt="" style="display:block">`:svg('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>','style="width:30px;height:30px"'))}</div>
        <div class="col" style="gap:8px"><b>รูปถ่ายพนักงาน</b><div class="row" style="gap:8px;flex-wrap:wrap"><label class="btn btn-sm">${IC.camera}ถ่ายรูป<input type="file" accept="image/*" capture="user" data-photo hidden></label><label class="btn btn-sm">เลือกรูป<input type="file" accept="image/*" data-photo hidden></label></div></div></div>
      <div class="field"><label>คำนำหน้า</label>${seg('title',TITLES.map(t=>[t,t]))}</div>
      <div class="g2">${inp('first_name','ชื่อ *',{auto:'given-name'})}${inp('last_name','นามสกุล *',{auto:'family-name'})}</div>
      <div class="g2">${inp('first_name_en','ชื่อ (อังกฤษ)',{ph:'ไม่บังคับ'})}${inp('last_name_en','นามสกุล (อังกฤษ)',{ph:'ไม่บังคับ'})}</div>
      <div class="g2">${inp('nickname','ชื่อเล่น')}<div class="field"><label>เพศ</label>${seg('gender',[['male','ชาย'],['female','หญิง']])}</div></div>
      ${dateField(F,'birth_date','วันเกิด', F.birth_date?`อายุ ${ageText(F.birth_date)}`:'อายุคำนวณอัตโนมัติ')}
      <div class="g2">${inp('nationality','สัญชาติ')}${sel('marital_status','สถานภาพ',Object.entries(MARITAL))}</div>
      <div class="g2">${F.gender==='male'?sel('military_status','สถานะทางทหาร',Object.entries(MILITARY)):'<div></div>'}<div class="field"><label for="f_blood_type">หมู่เลือด</label><select class="in" id="f_blood_type" data-f="blood_type" ${F.blood_consent_at?'':'disabled'}><option value="">ไม่ระบุ</option>${['A','B','AB','O'].map(b=>`<option ${F.blood_type===b?'selected':''}>${b}</option>`).join('')}</select></div></div>
      <label class="chk"><input type="checkbox" data-consent ${F.blood_consent_at?'checked':''}><span>พนักงานยินยอมให้เก็บหมู่เลือด เพื่อใช้กรณีเกิดอุบัติเหตุ <span class="muted">(บันทึกวันที่ยินยอมอัตโนมัติ ยกเลิกได้ทุกเมื่อ)</span></span></label>`,
    ()=>{ const id=digits(F.national_id); const d=daysUntil(F.id_expiry_date);
      return `<div class="note n-info" style="align-items:center">${IC.lock}<span>ข้อมูลส่วนนี้เห็นได้เฉพาะผู้บริหารและแอดมิน</span></div>
      <div class="sec">บัตรประจำตัวประชาชน</div>
      ${inp('national_id','เลขบัตรประชาชน 13 หลัก',{num:true,mode:'numeric',fmt:'id',val:fmtId(id),ph:'x-xxxx-xxxxx-xx-x',hint:id?(validThaiId(id)?'ตรวจสอบเลขบัตรถูกต้อง':(id.length<13?`กรอกแล้ว ${id.length} จาก 13 หลัก`:'เลขบัตรไม่ถูกต้อง')):'',hcls:id&&validThaiId(id)?'ok':(id.length===13?'bad':'')})}
      <div class="g2d">${dateField(F,'id_issue_date','วันออกบัตร')}${dateField(F,'id_expiry_date','วันหมดอายุ', d===null?'':(d<0?'บัตรหมดอายุแล้ว':(d<=60?`หมดอายุในอีก ${d} วัน`:`ใช้ได้อีก ${untilText(F.id_expiry_date)}`)))}</div>
      <div class="sec">ประกันสังคม</div>
      ${inp('social_security_no','เลขประกันสังคม',{num:true,mode:'numeric'})}
      <div><button type="button" class="chip ${F.social_security_no&&digits(F.social_security_no)===id&&id?'on':''}" data-sameid>${IC.check}ใช้เลขเดียวกับบัตรประชาชน</button></div>
      ${inp('sso_hospital','โรงพยาบาลตามสิทธิ์ประกันสังคม',{ph:'เช่น โรงพยาบาลสิงห์บุรี'})}
      <div class="g2">${sel('sso_method','วิธีหักประกันสังคม',[['actual','ตามค่าจ้างจริง'],['cap','ตามเพดานค่าแรงต่อวัน'],['fixed','กรอกยอดเอง (บาท/งวด)'],['none','ไม่หักประกันสังคม']],{empty:'ตามค่าเริ่มต้นของบริษัท'})}${inp('sso_fixed','ยอดหักต่องวด (บาท) · ใช้เมื่อเลือกกรอกเอง',{num:true,mode:'decimal'})}</div>
      <span class="hint">หักประกันสังคมเฉพาะพนักงานที่สิทธิ์การรักษาเป็น "ประกันสังคม" (ตั้งที่เมนูสิทธิ์การรักษา) · ยังไม่ระบุสิทธิ์ = ไม่หัก</span>`; },
    ()=>`<div class="sec">ที่อยู่ตามบัตรประชาชน</div>${addrBlock('addr')}
      <div class="card row" style="padding:14px"><div class="grow"><b>ที่อยู่ปัจจุบัน</b><div class="sm muted">เหมือนที่อยู่ตามบัตรประชาชน</div></div><button type="button" class="sw ${F.cur_same?'on':''}" data-cursame role="switch" aria-checked="${!!F.cur_same}" aria-label="ที่อยู่ปัจจุบันเหมือนที่อยู่ตามบัตร"></button></div>
      ${F.cur_same?'':`<div class="sec">ที่อยู่ปัจจุบัน</div>${addrBlock('cur')}`}`,
    ()=>`<div class="sec">ช่องทางติดต่อ</div>
      <div class="g2">${inp('phone','เบอร์มือถือ',{num:true,type:'tel',mode:'tel',fmt:'phone',ph:'08x-xxx-xxxx'})}${inp('line_id','LINE ID')}</div>
      ${inp('email','อีเมล',{type:'email',mode:'email'})}
      <div class="sec">ผู้ติดต่อกรณีฉุกเฉิน</div>
      ${inp('emergency_name','ชื่อ-นามสกุล')}
      <div class="field"><label>ความสัมพันธ์</label><div class="chips">${RELATIONS.map(r=>`<button type="button" class="chip ${F.emergency_relation===r?'on':''}" data-seg="emergency_relation" data-v="${r}">${r}</button>`).join('')}</div></div>
      ${inp('emergency_phone','เบอร์โทร',{num:true,type:'tel',mode:'tel',fmt:'phone'})}
      <div class="sec">บัญชีรับเงินเดือน</div>
      ${sel('bank_name','ธนาคาร',BANKS.map(b=>[b,b]))}
      <div class="g2">${inp('bank_account_no','เลขบัญชี',{num:true,mode:'numeric'})}${inp('bank_account_name','ชื่อบัญชี')}</div>`,
    ()=>{ const pd=daysUntil(F.probation_end);
      return `<div class="g2">${sel('position_id','ตำแหน่ง',S.positions.map(p=>[p.id,p.name]),{empty:'ไม่ระบุ'})}<div class="field"><label for="f_status">สถานะ</label><select class="in" id="f_status" data-f="status" data-re><option value="active" ${F.status==='active'?'selected':''}>ทำงานอยู่</option><option value="resigned" ${F.status==='resigned'?'selected':''}>ลาออกแล้ว</option></select></div></div>
      ${F.status==='resigned'?`<div class="g2d">${dateField(F,'resign_date','วันที่ลาออก')}${inp('resign_reason','เหตุผลที่ลาออก')}</div>`:''}
      <div class="field"><label>ประเภทการจ้าง</label>${seg('employment_type',Object.entries(EMPTYPE))}</div>
      <div class="g2d">${dateField(F,'start_date','วันเริ่มงาน',F.start_date?`อายุงาน ${serviceText(F.start_date)}`:'')}${dateField(F,'probation_end','ครบทดลองงาน',pd===null?'':(pd<0?'ผ่านแล้ว':`อีก ${pd} วัน`))}</div>
      <div class="sec">ค่าจ้าง</div>
      ${seg('wage_type',[['daily','รายวัน'],['monthly','รายเดือน']])}
      ${sel('pay_site_id','จุดรับเงินเดือน',S.sites.filter(x=>x.status==='active'||x.id===+F.pay_site_id).map(x=>[x.id,`ไซต์ ${x.code?x.code+' ':''}${x.contract_name||x.name}`]),{empty:'บริษัท'})}
      <div class="g2">${inp('wage_rate',`ค่าแรง (บาท/${F.wage_type==='monthly'?'เดือน':'วัน'})`,{num:true,type:'number',mode:'decimal',hint:!isNew&&Number(F.wage_rate)!==Number(orig.wage_rate)?`เดิม ${money(orig.wage_rate)}`:'',hcls:'warn'})}${inp('ot_rate','ค่า OT (บาท/ชม.)',{num:true,type:'number',mode:'decimal',hint:!isNew&&Number(F.ot_rate)!==Number(orig.ot_rate)?`เดิม ${money(orig.ot_rate)}`:'',hcls:'warn'})}</div>
      <div class="note n-warn ${wageChanged()?'':'hidden'}" data-reason style="flex-direction:column;gap:8px"><label for="f_change_reason"><b class="sm">เหตุผลที่แก้ไขค่าแรง/OT *</b></label><input class="in" id="f_change_reason" data-f="change_reason" value="${esc(F.change_reason||'')}" placeholder="เช่น ปรับค่าแรงประจำปี" style="background:var(--surface)"><span class="xs muted">บันทึกลงประวัติการแก้ไข พร้อมชื่อผู้แก้และเวลา</span></div>`; }
  ];

  function validate(s){
    if(s===0){ if(!String(F.first_name||'').trim()||!String(F.last_name||'').trim()) return 'กรอกชื่อและนามสกุล'; }
    const dateKeys=[['birth_date','วันเกิด'],['id_issue_date','วันออกบัตร'],['id_expiry_date','วันหมดอายุบัตร'],['start_date','วันเริ่มงาน'],['probation_end','วันครบทดลองงาน'],['resign_date','วันที่ลาออก']];
    for(const [k,t] of dateKeys){ if(F._dp[k]){ const r=readParts(F._dp[k]); if(!r.ok) return `${t}: ${r.msg}`; } }
    if(s===1){ const id=digits(F.national_id); if(id&&!validThaiId(id)) return 'เลขบัตรประชาชนไม่ถูกต้อง'; }
    if(s===4){ if(Number(F.wage_rate)<0||Number(F.ot_rate)<0) return 'ค่าแรงต้องไม่ติดลบ'; if(wageChanged()&&!String(F.change_reason||'').trim()) return 'ระบุเหตุผลที่แก้ไขค่าแรง/OT'; }
    return '';
  }

  function render(){
    const scroll=$('.sheet-body',sheet)?.scrollTop||0, keepScroll=render._same;
    sheet.innerHTML=`<header class="appbar stripe"><button class="ibtn" data-x aria-label="ปิด">${IC.close}</button><h1>${isNew?'เพิ่มพนักงาน':'แก้ไขข้อมูล '+esc(orig.first_name)}<small>ขั้นที่ ${step+1} จาก 5 ${STEPS[step]}</small></h1></header>
      <nav class="sheet-steps" aria-label="ขั้นตอน">${STEPS.map((t,i)=>`<button type="button" class="sstep ${i<step?'done':''} ${i===step?'on':''}" data-step="${i}" aria-current="${i===step?'step':'false'}"><i></i><span>${t}</span></button>`).join('')}</nav>
      <div class="sheet-body">${stepsHTML[step]()}</div>
      <div class="sheet-foot"><button class="btn" data-prev ${step===0?'disabled':''}>ย้อนกลับ</button>${step<4?'<button class="btn btn-p" data-next>ถัดไป</button>':`<button class="btn btn-p" data-save>${isNew?'บันทึกพนักงาน':'บันทึกการแก้ไข'}</button>`}</div>`;
    if(keepScroll) $('.sheet-body',sheet).scrollTop=scroll;
    render._same=false;
    bind(); hydratePhotos(sheet);
  }
  const rerender=()=>{ render._same=true; render(); };
  const go=n=>{ const err=validate(step); if(err&&n>step) return toast(err,true); step=n; render(); };

  function bind(){
    $('[data-x]',sheet).onclick=async()=>{ if(await confirmBox('ปิดโดยไม่บันทึก? ข้อมูลที่กรอกจะหายไป','ปิด',true)) m.close(); };
    $$('[data-step]',sheet).forEach(b=>b.onclick=()=>go(+b.dataset.step));
    const pv=$('[data-prev]',sheet); if(pv) pv.onclick=()=>{ step--; render(); };
    const nx=$('[data-next]',sheet); if(nx) nx.onclick=()=>go(step+1);
    const sv=$('[data-save]',sheet); if(sv) sv.onclick=()=>save(sv);
    $$('[data-f]',sheet).forEach(el=>{
      const k=el.dataset.f;
      el.addEventListener(el.tagName==='SELECT'?'change':'input',()=>{
        if(el.dataset.fmt==='id'){ const p=el.selectionStart, before=el.value.length; el.value=fmtId(el.value); F[k]=digits(el.value); try{ el.setSelectionRange(p+(el.value.length-before),p+(el.value.length-before)); }catch(_){} const id=F[k]; const h=$('[data-h="national_id"]',sheet); h.className='hint '+(id&&validThaiId(id)?'ok':(id.length===13?'bad':'')); h.textContent=id?(validThaiId(id)?'ตรวจสอบเลขบัตรถูกต้อง':(id.length<13?`กรอกแล้ว ${id.length} จาก 13 หลัก`:'เลขบัตรไม่ถูกต้อง')):''; return; }
        if(el.dataset.fmt==='phone'){ el.value=fmtPhone(el.value); }
        F[k]=el.value;
        if(k==='position_id') F[k]=el.value?Number(el.value):null;
        if(el.hasAttribute('data-re')) rerender();
        if(['wage_rate','ot_rate'].includes(k)){ const r=$('[data-reason]',sheet); if(r) r.classList.toggle('hidden',!wageChanged()); const h=$(`[data-h="${k}"]`,sheet); if(h) h.textContent=Number(F[k])!==Number(orig?.[k])&&!isNew?`เดิม ${money(orig[k])}`:''; }
      });
    });
    $$('[data-seg]',sheet).forEach(b=>b.onclick=()=>{ const k=b.dataset.seg; F[k]=(k==='emergency_relation'&&F[k]===b.dataset.v)?null:b.dataset.v; if(k==='gender'&&F.gender!=='male') F.military_status=null; rerender(); });
    $$('[data-date]',sheet).forEach(w=>{ const k=w.dataset.date; w.addEventListener('input',()=>{
      const p={d:$('[data-p=d]',w).value,m:$('[data-p=m]',w).value,y:$('[data-p=y]',w).value}; F._dp[k]=p; const r=readParts(p);
      const h=$(`[data-hint="${k}"]`,sheet);
      if(r.ok){ F[k]=r.value; if(h){ h.className='hint ok';
        h.textContent = !r.value?'': k==='birth_date'?`อายุ ${ageText(r.value)}`: k==='start_date'?`อายุงาน ${serviceText(r.value)}`: k==='id_expiry_date'?(daysUntil(r.value)<0?'บัตรหมดอายุแล้ว':`ใช้ได้อีก ${untilText(r.value)||daysUntil(r.value)+' วัน'}`): k==='probation_end'?(daysUntil(r.value)<0?'ผ่านแล้ว':`อีก ${daysUntil(r.value)} วัน`):''; if(k==='id_expiry_date'&&daysUntil(r.value)<=60) h.className='hint warn'; } }
      else if(h){ h.className='hint bad'; h.textContent=r.msg; }
    }); });
    if(typeof bindIdCard==='function') bindIdCard(sheet,(out,ph)=>{ Object.assign(F,out); if(ph){ idPhotoBlob=ph; if(!photoBlob&&(!orig?.photo_path||orig?.photo_is_id)){ if(photoPreview) URL.revokeObjectURL(photoPreview); photoPreview=URL.createObjectURL(ph); } } rerender(); });
    $$('[data-photo]',sheet).forEach(inpEl=>inpEl.onchange=async()=>{ const f=inpEl.files[0]; if(!f) return; try{ photoBlob=await resizeImage(f); if(photoPreview) URL.revokeObjectURL(photoPreview); photoPreview=URL.createObjectURL(photoBlob); rerender(); }catch(_){ toast('อ่านไฟล์รูปไม่ได้ ลองเลือกรูปอื่น',true); } });
    const cs=$('[data-consent]',sheet); if(cs) cs.onchange=()=>{ if(cs.checked) F.blood_consent_at=orig?.blood_consent_at||new Date().toISOString(); else { F.blood_consent_at=null; F.blood_type=null; } rerender(); };
    const si=$('[data-sameid]',sheet); if(si) si.onclick=()=>{ const id=digits(F.national_id); if(!id) return toast('กรอกเลขบัตรประชาชนก่อน',true); F.social_security_no=id; rerender(); };
    const cu=$('[data-cursame]',sheet); if(cu) cu.onclick=()=>{ F.cur_same=!F.cur_same; rerender(); };
    $$('[data-addr]',sheet).forEach(el=>{ const pre=el.dataset.addr, box=$(`[data-dd="${pre}"]`,sheet);
      el.addEventListener('input',async()=>{ F[pre+'_subdistrict']=el.value; if(!ADDR){ box.innerHTML='<div class="hint">กำลังโหลดรายชื่อตำบล...</div>'; try{ await loadAddr(); }catch(_){ box.innerHTML='<div class="hint bad">โหลดรายชื่อตำบลไม่ได้ กรอกเองได้</div>'; return; } }
        const res=searchAddr(el.value);
        box.innerHTML=res.length?`<div class="dd" role="listbox">${res.map((x,i)=>`<button type="button" role="option" data-pick="${i}"><b>${esc(x.d)}</b> <span class="muted">› ${esc(x.a)} › ${esc(x.p)} ${x.z}</span></button>`).join('')}</div>`:'';
        $$('[data-pick]',box).forEach(b=>b.onclick=()=>{ const x=res[+b.dataset.pick]; F[pre+'_subdistrict']=x.d; F[pre+'_district']=x.a; F[pre+'_province']=x.p; F[pre+'_zip']=x.z; rerender(); });
      });
      el.addEventListener('focus',()=>{ loadAddr().catch(()=>{}); });
    });
  }

  async function save(btn){
    for(let s=0;s<5;s++){ const err=validate(s); if(err){ step=s; render(); return toast(err,true); } }
    const row={}; EMP_FIELDS.forEach(k=>{ let x=F[k]; if(typeof x==='string'){ x=x.trim(); if(x==='') x=null; } row[k]=x===undefined?null:x; });
    ['sso_method','sso_fixed','pay_site_id'].forEach(k=>{ if(F[k]===undefined) delete row[k]; }); // ยังไม่รัน 26_sso_cap.sql = ไม่ส่งช่องใหม่
    row.title=row.title||'นาย'; row.wage_rate=Number(F.wage_rate||0); row.ot_rate=Number(F.ot_rate||0); row.cur_same=!!F.cur_same;
    row.employment_type=row.employment_type||'permanent'; row.status=row.status||'active'; row.wage_type=row.wage_type||'daily';
    row.national_id=digits(F.national_id)||null;
    if(row.gender!=='male') row.military_status=null;
    if(!row.blood_consent_at) row.blood_type=null;
    if(row.status!=='resigned'){ row.resign_date=null; row.resign_reason=null; }
    if(row.cur_same) ['no','moo','soi','road','subdistrict','district','province','zip'].forEach(k=>row['cur_'+k]=null);
    row.id_address = row.addr_no ? addrText(row,'addr') : null;
    row.change_reason = isNew ? 'เพิ่มพนักงานใหม่' : (wageChanged() ? String(F.change_reason).trim() : null);
    busy(btn,true);
    try{
      const id = isNew ? (crypto.randomUUID ? crypto.randomUUID() : null) : orig.id;
      if(idPhotoBlob&&id){ const ip=`idc/${id}.jpg`; const u2=await sb.storage.from(PHOTO_BUCKET).upload(ip, idPhotoBlob, {upsert:true, contentType:'image/jpeg'}); if(!u2.error){ row.id_photo_path=ip; delete S.photoUrl[ip]; } }
      if(photoBlob){
        if(!id) throw new Error('อุปกรณ์นี้ไม่รองรับการอัปโหลดรูป');
        const path=`emp/${id}.jpg`;
        const up=await sb.storage.from(PHOTO_BUCKET).upload(path, photoBlob, {upsert:true, contentType:'image/jpeg'});
        if(up.error) throw up.error;
        row.photo_path=path; delete S.photoUrl[path];
        if(!isNew&&orig.photo_path===path&&!row.change_reason) row.change_reason='อัปเดตรูปถ่าย';
      }
      let res;
      if(isNew){ if(id) row.id=id; res=await sb.from('employees').insert(row).select('*').single(); }
      else res=await sb.from('employees').update(row).eq('id',orig.id).select('*').single();
      if(res.error) throw res.error;
      if(photoPreview) URL.revokeObjectURL(photoPreview);
      m.close(); toast(isNew?'บันทึกพนักงานแล้ว':'บันทึกการแก้ไขแล้ว');
      if(onSaved) onSaved(res.data); else if(location.hash.startsWith('#employees')) pageEmployees(); else location.hash='#emp/'+res.data.id;
    }catch(err){ busy(btn,false); toast(errText(err),true); }
  }
  render();
}

/* =====================================================================
   ช่วงที่ 2: ค่าคงที่การเช็คชื่อ
   ===================================================================== */
const ATT = {
  present:{t:'มา',c:'t-ok',s:''}, late:{t:'สาย',c:'t-warn',s:'ส'}, half:{t:'ครึ่งวัน',c:'',s:'½'},
  sick:{t:'ลาป่วย',c:'t-leave',s:'ป'}, personal:{t:'ลากิจ',c:'t-leave',s:'ก'}, vacation:{t:'ลาพักร้อน',c:'t-leave',s:'พ'}, absent:{t:'ขาด',c:'t-bad',s:'ข'},
  off:{t:'วันหยุดบริษัท',c:'t-off',s:'O'}
};
const ATT_ORDER=['present','late','half','absent','sick','personal','vacation','off'];
const addDays=(iso,n)=>{ const p=parseISO(iso); return localISO(new Date(p.y,p.m-1,p.d+n)); };
const monthRange=iso=>{ const p=parseISO(iso); return [localISO(new Date(p.y,p.m-1,1)), localISO(new Date(p.y,p.m,0))]; };
const dayLong=iso=>{ const p=parseISO(iso); const d=new Date(p.y,p.m-1,p.d); return `วัน${TH_DAYS[d.getDay()]}ที่ ${p.d} ${TH_MONTHS_S[p.m-1]} ${p.y+543}`; };
const siteName=id=>S.sites.find(s=>s.id===id)?.name||'';
const need03=()=>`<div class="card empty"><b>ยังไม่ได้อัปเดตฐานข้อมูลช่วงที่ 2</b>รันไฟล์ 03_attendance.sql ใน Supabase SQL Editor แล้วโหลดหน้านี้ใหม่</div>`;
const workValue=st=>st==='present'||st==='late'?1:st==='half'?0.5:0;

/* =====================================================================
   เช็คชื่อ (ผู้บริหาร/แอดมิน): รายวัน / รายเดือน / หน้างาน
   ===================================================================== */
let attTab='day', attDate=localISO(), attMonth=localISO().slice(0,7);
async function pageAtt(){
  const tabs=[['day','พนักงานประจำ'],['month','รายเดือน'],['site','คนงานหน้างาน']];
  const isDay=attTab!=='month';
  const title=isDay?dayLong(attDate):`${TH_MONTHS[+attMonth.slice(5)-1]} ${+attMonth.slice(0,4)+543}`;
  const nextDisabled=isDay?attDate>=localISO():attMonth>=localISO().slice(0,7);
  setPage(head('เช็คชื่อ',title,{
      lead:`<button class="ibtn" data-nav="-1" aria-label="ก่อนหน้า">${IC.back}</button>`,
      mActions:`<button class="ibtn" data-nav="1" aria-label="ถัดไป" ${nextDisabled?'disabled style="opacity:.35"':''}>${IC.chev}</button>`,
      dActions:`<button class="btn btn-sm" data-nav="-1" aria-label="ก่อนหน้า">‹</button><input class="in" type="${isDay?'date':'month'}" id="attPick" value="${isDay?attDate:attMonth}" max="${isDay?localISO():localISO().slice(0,7)}" style="width:auto"><button class="btn btn-sm" data-nav="1" aria-label="ถัดไป" ${nextDisabled?'disabled':''}>›</button>`}) +
    `<div class="seg">${tabs.map(([k,t])=>`<button class="${attTab===k?'on':''}" data-at="${k}">${t}</button>`).join('')}</div><div id="ab"><div class="loading"><div class="spin"></div></div></div>`);
  $$('[data-at]').forEach(b=>b.onclick=()=>{ attTab=b.dataset.at; pageAtt(); });
  $$('[data-nav]').forEach(b=>b.onclick=()=>{ if(b.disabled) return; const n=+b.dataset.nav;
    if(isDay){ const d=addDays(attDate,n); if(d<=localISO()) attDate=d; }
    else { const p=parseISO(attMonth+'-01'); const d=localISO(new Date(p.y,p.m-1+n,1)).slice(0,7); if(d<=localISO().slice(0,7)) attMonth=d; }
    pageAtt(); });
  const pk=$('#attPick'); if(pk) pk.onchange=()=>{ if(!pk.value) return; if(isDay) attDate=pk.value>localISO()?localISO():pk.value; else attMonth=pk.value; pageAtt(); };
  if(!S.hasPhase2){ $('#ab').outerHTML=need03(); return; }
  if(attTab==='day') attDay(); else if(attTab==='month') attMonthView(); else attSites();
}

async function loadAttBase(from, to){
  const [e,a]=await Promise.all([
    sb.from('employees').select('id,emp_code,first_name,last_name,nickname,photo_path,position_id,status,resign_date,start_date').order('sort_order',{nullsFirst:false}).order('emp_code'),
    sb.from('attendance').select('*').gte('work_date',from).lte('work_date',to)
  ]);
  if(e.error||a.error) throw (e.error||a.error);
  const att=a.data||[];
  const has=new Set(att.map(x=>x.employee_id));
  const emps=(e.data||[]).filter(x=>(x.status==='active'&&(!x.start_date||x.start_date<=to))||has.has(x.id)||(x.resign_date&&x.resign_date>=from));
  return {emps, att};
}

async function attDay(){
  const date=attDate, [m0,m1]=monthRange(date);
  let base, yday;
  try{ base=await loadAttBase(m0, m1); }catch(err){ $('#ab').outerHTML=`<div class="note n-bad">${esc(errText(err))}</div>`; return; }
  const emps=base.emps.filter(x=>base.att.some(a=>a.employee_id===x.id&&a.work_date===date)||(x.status==='active'&&(!x.start_date||x.start_date<=date)));
  const rec={}; base.att.filter(a=>a.work_date===date).forEach(a=>rec[a.employee_id]=a);
  const L={};
  const val=id=>L[id]||rec[id]||{status:'present',ot_hours:0,site_id:null,no_notice:false,note:null};
  const lateCount=(id)=>base.att.filter(a=>a.employee_id===id&&a.status==='late'&&a.work_date!==date&&a.work_date<date).length;
  const host=document.createElement('div'); host.className='col'; host.style.gap='12px'; $('#ab').replaceWith(host);
  function draw(){
    const cnt={ok:0,late:0,leave:0,absent:0};
    emps.forEach(e=>{ const s=val(e.id).status; if(s==='present'||s==='half') cnt.ok++; else if(s==='late') cnt.late++; else if(s==='absent') cnt.absent++; else cnt.leave++; });
    const dirty=emps.filter(e=>L[e.id]||!rec[e.id]).length;
    host.innerHTML=`
      <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px">
        <div class="stat" style="padding:10px;align-items:center"><b style="font-size:22px;color:var(--ok)">${cnt.ok}</b><span class="xs muted">มา</span></div>
        <div class="stat" style="padding:10px;align-items:center"><b style="font-size:22px;color:var(--warn)">${cnt.late}</b><span class="xs muted">สาย</span></div>
        <div class="stat" style="padding:10px;align-items:center"><b style="font-size:22px">${cnt.leave}</b><span class="xs muted">ลา</span></div>
        <div class="stat" style="padding:10px;align-items:center"><b style="font-size:22px;color:var(--bad)">${cnt.absent}</b><span class="xs muted">ขาด</span></div></div>
      <div class="row" style="gap:8px;flex-wrap:wrap">${date===localISO()?`<a href="#roll" class="chip" style="text-decoration:none;background:var(--accent);color:var(--accentInk);border-color:var(--accent);font-weight:700">${IC.check}เช็คชื่อแบบติ๊ก</a>`:''}<button class="chip" data-allin>${IC.check}ทุกคนมา</button><button class="chip" data-ysite>ไซต์ตามเมื่อวาน</button><span class="grow"></span><span class="xs muted">${emps.length} คน</span></div>
      ${emps.length?`<div class="card card-l">${emps.map(e=>{ const v=val(e.id), a=ATT[v.status]; const unsaved=!rec[e.id]&&!L[e.id];
        return `<button class="li" data-emp="${e.id}">${avatar(e,'','width:42px;height:42px')}<div class="grow"><b>${esc(shortName(e))}${e.nickname?` <span class="muted" style="font-weight:400">(${esc(e.nickname)})</span>`:''}</b><span class="xs muted">${unsaved?'ยังไม่บันทึก':(esc(siteName(v.site_id))||esc(v.note||''))}</span></div>
          <span class="tag ${unsaved?'':a.c}" ${unsaved?'style="border:1px dashed var(--ink2);background:transparent"':''}>${a.t}</span>${Number(v.ot_hours)>0?`<span class="tag t-acc">OT ${Number(v.ot_hours)}</span>`:''}${L[e.id]?'<span class="dotmark" title="ยังไม่บันทึก"></span>':''}</button>`; }).join('')}</div>`
        :`<div class="card empty"><b>ไม่มีพนักงานที่ต้องเช็คชื่อวันนี้</b>เพิ่มพนักงานได้ที่เมนูพนักงาน</div>`}
      <div class="savebar"><div class="grow"><b class="sm">${dirty?`รอบันทึก ${dirty} คน`:'บันทึกครบแล้ว'}</b><div class="xs muted">แตะชื่อเพื่อเปลี่ยนสถานะหรือใส่ OT</div></div><button class="btn btn-p" data-save ${dirty?'':'disabled'}>บันทึก</button></div>`;
    hydratePhotos(host);
    $$('[data-emp]',host).forEach(b=>b.onclick=()=>{ const e=emps.find(x=>x.id===b.dataset.emp);
      statusSheet(e, date, val(e.id), lateCount(e.id), v=>{ L[e.id]=v; draw(); }); });
    $('[data-allin]',host).onclick=()=>{ emps.forEach(e=>{ L[e.id]={...val(e.id),status:'present',no_notice:false}; }); draw(); };
    $('[data-ysite]',host).onclick=async()=>{
      if(!yday){ const {data}=await sb.from('attendance').select('employee_id,site_id').eq('work_date',addDays(date,-1)); yday=data||[]; }
      let n=0; yday.forEach(y=>{ if(y.site_id&&emps.some(e=>e.id===y.employee_id)){ L[y.employee_id]={...val(y.employee_id),site_id:y.site_id}; n++; } });
      toast(n?`คัดลอกไซต์ของ ${n} คนจากเมื่อวาน`:'เมื่อวานยังไม่มีการบันทึกไซต์'); draw(); };
    const sv=$('[data-save]',host); if(sv) sv.onclick=async()=>{
      const rows=emps.filter(e=>L[e.id]||!rec[e.id]).map(e=>{ const v=val(e.id); return {employee_id:e.id,work_date:date,status:v.status,ot_hours:Number(v.ot_hours)||0,site_id:v.site_id||null,no_notice:!!v.no_notice,note:v.note||null}; });
      busy(sv,true);
      const {error}=await sb.from('attendance').upsert(rows,{onConflict:'employee_id,work_date'});
      if(error){ busy(sv,false); return toast(errText(error),true); }
      toast(`บันทึกการเช็คชื่อ ${rows.length} คนแล้ว`); pageAtt();
    };
  }
  draw();
}

function statusSheet(e, date, cur, lateBefore, onDone){
  const v={status:cur.status,ot_hours:Number(cur.ot_hours)||0,site_id:cur.site_id||null,no_notice:!!cur.no_notice,note:cur.note||''};
  const R=S.settings.star_rules||{}, N=Math.max(1,+R.late_count||3);
  const m=overlay(`<div class="modal" role="dialog" aria-modal="true" aria-label="สถานะ ${esc(shortName(e))}" style="max-width:520px"></div>`);
  const box=$('.modal',m.el);
  function info(){
    if(v.status==='absent') return `<div class="note n-bad">${IC.info}<span>ขาดงานไม่แจ้ง ระบบหัก ${R.absent??1} ดาว</span></div>`;
    if(v.status==='late'){ const k=lateBefore+1; const left=N-(k%N||N); return `<div class="note n-warn">${IC.clock}<span>สายครั้งที่ ${k} ของเดือนนี้ ${k%N===0?`ครบ ${N} ครั้ง ระบบหัก ${R.late_penalty??0.5} ดาว`:`อีก ${left} ครั้งจะถูกหัก ${R.late_penalty??0.5} ดาว`}</span></div>`; }
    if((v.status==='personal'||v.status==='vacation')) return `<label class="chk"><input type="checkbox" data-nn ${v.no_notice?'checked':''}><span>ไม่ได้แจ้งล่วงหน้า <span class="muted">(ระบบหัก ${R.no_notice??0.5} ดาว)</span></span></label>`;
    return '';
  }
  function draw(){
    box.innerHTML=`<div class="row">${avatar(e)}<div class="grow"><b style="font-size:17px">${esc(shortName(e))}</b><div class="sm muted">${esc(posName(e.position_id))} · ${dayLong(date)}</div></div><button class="ibtn" data-x aria-label="ปิด" style="background:var(--surface2);color:var(--ink)">${IC.close}</button></div>
      <div class="field"><label>สถานะ</label><div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px">${ATT_ORDER.map(k=>`<button class="btn btn-sm stbtn ${v.status===k?'on '+ATT[k].c:''}" data-st="${k}" style="padding:0 4px${k==='vacation'?';grid-column:span 2':''}">${ATT[k].t}</button>`).join('')}</div></div>
      ${info()}
      <div class="g2d"><div class="field"><label>OT (ชั่วโมง)</label><div class="row" style="gap:6px"><button class="btn btn-sm" data-ot="-0.5" aria-label="ลด OT" style="width:44px;padding:0">−</button><input class="in num" data-otv value="${v.ot_hours}" inputmode="decimal" style="text-align:center;font-weight:700" aria-label="ชั่วโมง OT"><button class="btn btn-sm" data-ot="0.5" aria-label="เพิ่ม OT" style="width:44px;padding:0">+</button></div></div>
        <div class="field"><label for="ss_site">ไซต์ที่ทำงาน</label><select class="in" id="ss_site"><option value="">ไม่ระบุ</option>${S.sites.filter(s=>s.status==='active'||s.id===v.site_id).map(s=>`<option value="${s.id}" ${v.site_id===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select></div></div>
      <div class="field"><label for="ss_note">หมายเหตุ</label><input class="in" id="ss_note" value="${esc(v.note)}" placeholder="เช่น รถเสียระหว่างทาง"></div>
      <button class="btn btn-p" data-ok style="min-height:52px">ตกลง</button>`;
    hydratePhotos(box);
    $('[data-x]',box).onclick=m.close;
    $$('[data-st]',box).forEach(b=>b.onclick=()=>{ keep(); v.status=b.dataset.st; if(!['personal','vacation'].includes(v.status)) v.no_notice=false; draw(); });
    $$('[data-ot]',box).forEach(b=>b.onclick=()=>{ keep(); v.ot_hours=Math.max(0,Math.min(24,(Number(v.ot_hours)||0)+Number(b.dataset.ot))); draw(); });
    const nn=$('[data-nn]',box); if(nn) nn.onchange=()=>{ v.no_notice=nn.checked; };
    $('[data-ok]',box).onclick=()=>{ keep(); const ot=Number(v.ot_hours); if(isNaN(ot)||ot<0||ot>24||ot*2!==Math.floor(ot*2)) return toast('OT ใส่ได้ทีละ 0.5 ชั่วโมง ไม่เกิน 24',true); m.close(); onDone({...v,ot_hours:ot}); };
  }
  function keep(){ const o=$('[data-otv]',box); if(o) v.ot_hours=o.value.replace(',','.'); const s=$('#ss_site',box); if(s) v.site_id=s.value?Number(s.value):null; const n=$('#ss_note',box); if(n) v.note=n.value.trim(); }
  draw();
}

async function attMonthView(){
  const [m0,m1]=monthRange(attMonth+'-01'), today=localISO();
  let base; try{ base=await loadAttBase(m0,m1); }catch(err){ $('#ab').outerHTML=`<div class="note n-bad">${esc(errText(err))}</div>`; return; }
  const days=[]; for(let d=m0; d<=m1; d=addDays(d,1)) days.push(d);
  const map={}; base.att.forEach(a=>map[a.employee_id+'|'+a.work_date]=a);
  const HT=S.settings.holiday_types||[], hol={}; try{ const {data:hd}=await sb.from('holidays').select('*').gte('day',m0).lte('day',m1); (hd||[]).forEach(h=>{ const t=HT.find(x=>x.key===h.type_key); if(t) hol[h.day]=t; }); }catch(_){}
  const host=document.createElement('div'); host.className='col'; host.style.gap='12px'; $('#ab').replaceWith(host);
  const rb=document.createElement('div'); rb.className='row'; rb.style.cssText='gap:8px;justify-content:flex-end'; rb.innerHTML='<button class="btn btn-sm" data-arx>ส่งออกรายงาน (PDF / PNG)</button>'; host.before(rb); $('[data-arx]',rb).onclick=()=>monthReport(attMonth);
  const tot=id=>{ let w=0,ot=0,late=0,leave=0,ab=0; base.att.filter(a=>a.employee_id===id).forEach(a=>{ w+=workValue(a.status); ot+=Number(a.ot_hours)||0; if(a.status==='late') late++; if(['sick','personal','vacation'].includes(a.status)) leave++; if(a.status==='absent') ab++; }); return {w,ot,late,leave,ab}; };
  host.innerHTML=base.emps.length?`<div class="card" style="padding:0;overflow:hidden"><div class="mgrid-wrap"><table class="mgrid"><thead><tr><th class="sticky">พนักงาน</th>${days.map(d=>{ const p=parseISO(d), wd=new Date(p.y,p.m-1,p.d).getDay(); return `<th class="${wd===0?'sun':''} ${d===today?'today':''}" ${hol[d]?`style="box-shadow:inset 0 -3px 0 ${hol[d].color}" title="${esc(hol[d].name)}"`:''}>${p.d}<small>${hol[d]?esc(hol[d].abbr):TH_DAYS[wd].slice(0,2)}</small></th>`; }).join('')}<th>วัน</th><th>OT</th><th>สาย</th><th>ลา</th><th>ขาด</th></tr></thead><tbody>
    ${base.emps.map(e=>{ const t=tot(e.id); return `<tr><td class="sticky"><a href="#emp/${e.id}"><b>${esc(shortName(e))}</b></a><small>${esc(posName(e.position_id))}</small></td>${days.map(d=>{ const a=map[e.id+'|'+d]; const fut=d>today;
      return `<td><button class="mc ${a?'s-'+a.status:''} ${!a&&hol[d]?'hol':''}" style="${!a&&hol[d]?`--hc:${hol[d].color}`:''}" data-c="${e.id}|${d}" ${fut&&!hol[d]?'disabled':''} aria-label="${esc(shortName(e))} ${d} ${a?ATT[a.status].t:'ยังไม่บันทึก'}">${a?ATT[a.status].s:(hol[d]?esc(hol[d].abbr):'')}${a&&Number(a.ot_hours)>0?'<i></i>':''}</button></td>`; }).join('')}
      <td class="num tot">${t.w}</td><td class="num">${t.ot}</td><td class="num">${t.late||''}</td><td class="num">${t.leave||''}</td><td class="num">${t.ab||''}</td></tr>`; }).join('')}
    </tbody></table></div></div>
    <div class="row xs muted" style="gap:14px;flex-wrap:wrap"><span class="row" style="gap:6px"><i class="lg s-present"></i>มา</span><span><b style="color:var(--warn)">ส</b> สาย</span><span><b>½</b> ครึ่งวัน</span><span><b>ป</b> ลาป่วย</span><span><b>ก</b> ลากิจ</span><span><b>พ</b> ลาพักร้อน</span><span><b style="color:var(--bad)">ข</b> ขาด</span><span class="row" style="gap:6px"><i class="lg ot"></i>มี OT</span><span>แตะช่องเพื่อแก้ไขวันนั้น</span></div>`
    :`<div class="card empty"><b>ยังไม่มีพนักงาน</b></div>`;
  $$('[data-c]',host).forEach(b=>b.onclick=()=>{ const [id,d]=b.dataset.c.split('|'); const e=base.emps.find(x=>x.id===id); const cur=map[b.dataset.c]||{status:'present',ot_hours:0};
    const lateBefore=base.att.filter(a=>a.employee_id===id&&a.status==='late'&&a.work_date<d).length;
    statusSheet(e,d,cur,lateBefore,async v=>{ const {error}=await sb.from('attendance').upsert({employee_id:id,work_date:d,status:v.status,ot_hours:v.ot_hours,site_id:v.site_id||null,no_notice:!!v.no_notice,note:v.note||null},{onConflict:'employee_id,work_date'});
      if(error) return toast(errText(error),true); toast('บันทึกแล้ว'); pageAtt(); }); });
}

async function attSites(){
  const date=attDate;
  const {data,error}=await sb.from('site_reports').select('*').eq('report_date',date);
  if(error){ $('#ab').outerHTML=`<div class="note n-bad">${esc(errText(error))}</div>`; return; }
  const reps={}; (data||[]).forEach(r=>reps[r.site_id]=r);
  const sites=S.sites.filter(s=>s.status==='active'||reps[s.id]);
  const total=(data||[]).reduce((a,r)=>a+r.total,0);
  const host=document.createElement('div'); host.className='col'; host.style.gap='12px'; $('#ab').replaceWith(host);
  host.innerHTML=`<div class="statg" style="grid-template-columns:repeat(2,minmax(0,1fr))"><div class="stat"><b>${total}</b><span class="sm muted">คนงานหน้างาน</span></div><div class="stat"><b>${Object.keys(reps).length}<span class="muted" style="font-size:16px"> / ${sites.length}</span></b><span class="sm muted">ไซต์ที่ส่งรายงานแล้ว</span></div></div>
    ${sites.length?`<div class="lgrid">${sites.map(s=>{ const r=reps[s.id]; return `<button class="card col" data-site="${s.id}" style="gap:10px;text-align:left;${r?'':'border-color:var(--warn)'}">
      <div class="row"><div class="av" style="width:42px;height:42px;border:0;${r?'background:var(--okBg);color:var(--ok)':'background:var(--warnBg);color:var(--warn)'}">${IC.site}</div><div class="grow"><b>${esc(s.name)}</b><div class="xs muted">${r?`ส่งโดย ${esc(r.submitted_name||'')} ${new Date(r.updated_at).toTimeString().slice(0,5)}`:esc(s.location||'')}</div></div>${r?`<div style="text-align:right"><b class="num" style="font-size:20px">${r.total}</b><div class="xs muted">คน</div></div>`:'<span class="tag t-warn">ยังไม่ส่ง</span>'}</div>
      ${r&&Object.keys(r.counts||{}).length?`<div class="row" style="gap:6px;flex-wrap:wrap">${Object.entries(r.counts).filter(([,n])=>n>0).map(([k,n])=>`<span class="tag">${esc(k)} ${n}</span>`).join('')}</div>`:''}${r?.note?`<div class="sm muted">${esc(r.note)}</div>`:''}</button>`; }).join('')}</div>`
      :`<div class="card empty"><b>ยังไม่มีไซต์งานที่เปิดอยู่</b>เพิ่มไซต์ได้ที่เมนูจัดการ</div>`}
    <span class="xs muted">ผู้บริหารแตะการ์ดเพื่อบันทึกหรือแก้รายงานแทนโฟร์แมนได้</span>`;
  $$('[data-site]',host).forEach(b=>b.onclick=()=>{ const s=S.sites.find(x=>x.id==b.dataset.site);
    const m=overlay(`<div class="modal" style="max-width:520px" role="dialog" aria-modal="true"><div class="row"><div class="grow"><b style="font-size:17px">${esc(s.name)}</b><div class="sm muted">${dayLong(date)}</div></div><button class="ibtn" data-x aria-label="ปิด" style="background:var(--surface2);color:var(--ink)">${IC.close}</button></div><div id="re"></div></div>`);
    $('[data-x]',m.el).onclick=m.close;
    reportEditor($('#re',m.el), s, date, reps[s.id], ()=>{ m.close(); pageAtt(); }); });
}

/* =====================================================================
   รายงานคนงานหน้างาน (ตัวแก้ไขใช้ร่วมกัน)
   ===================================================================== */
function reportEditor(box, site, date, existing, onSaved, canEdit=true){
  const counts={}; (S.settings.site_trades||[]).forEach(t=>counts[t]=0);
  Object.entries(existing?.counts||{}).forEach(([k,n])=>counts[k]=n);
  let note=existing?.note||'';
  function draw(){
    const total=Object.values(counts).reduce((a,b)=>a+(+b||0),0);
    box.innerHTML=`${existing?`<div class="note n-info" style="margin-bottom:12px">${IC.check}<span>ส่งแล้วโดย ${esc(existing.submitted_name||'')} เวลา ${new Date(existing.updated_at).toTimeString().slice(0,5)}${canEdit?' แก้ไขได้ถึงเที่ยงคืน':''}</span></div>`:''}
      <div class="card card-l">${Object.keys(counts).map(t=>`<div class="li"><span class="grow" style="font-weight:600">${esc(t)}</span>${canEdit?`<button class="btn btn-sm" data-dec="${esc(t)}" aria-label="ลด ${esc(t)}" style="width:44px;padding:0">−</button>`:''}<b class="num" style="width:40px;text-align:center;font-size:18px;${counts[t]?'':'color:var(--ink2)'}">${counts[t]}</b>${canEdit?`<button class="btn btn-sm ${counts[t]?'btn-p':''}" data-inc="${esc(t)}" aria-label="เพิ่ม ${esc(t)}" style="width:44px;padding:0">+</button>`:''}</div>`).join('')}</div>
      ${canEdit?`<div class="field" style="margin-top:12px"><label for="rn">หมายเหตุ</label><textarea class="in" id="rn" placeholder="เช่น ทีมช่างปูนของช่างสมหมาย เทพื้นชั้น 2">${esc(note)}</textarea></div>`:(note?`<p class="sm muted">${esc(note)}</p>`:'')}
      <div class="row" style="margin-top:12px"><div class="grow"><div class="xs muted">รวมทั้งหมด</div><b class="num" style="font-size:24px;line-height:1.1">${total} คน</b></div>${canEdit?`<button class="btn btn-p" data-send style="min-width:150px">${existing?'บันทึกการแก้ไข':'ส่งรายงาน'}</button>`:''}</div>`;
    const rn=$('#rn',box); if(rn) rn.oninput=()=>{ note=rn.value; };
    $$('[data-inc]',box).forEach(b=>b.onclick=()=>{ counts[b.dataset.inc]=(+counts[b.dataset.inc]||0)+1; draw(); });
    $$('[data-dec]',box).forEach(b=>b.onclick=()=>{ counts[b.dataset.dec]=Math.max(0,(+counts[b.dataset.dec]||0)-1); draw(); });
    const sd=$('[data-send]',box); if(sd) sd.onclick=async()=>{
      const clean={}; Object.entries(counts).forEach(([k,n])=>{ if(+n>0) clean[k]=+n; });
      if(!Object.keys(clean).length&&!(await confirmBox('ยังไม่มีคนงานเลย ส่งรายงานว่าวันนี้ไม่มีคนงานใช่ไหม','ส่งรายงาน'))) return;
      busy(sd,true,'กำลังส่ง...');
      const {data,error}=await sb.from('site_reports').upsert({site_id:site.id,report_date:date,counts:clean,note:note.trim()||null},{onConflict:'site_id,report_date'}).select('*').single();
      if(error){ busy(sd,false); return toast(errText(error),true); }
      toast(existing?'บันทึกการแก้ไขแล้ว':'ส่งรายงานแล้ว'); onSaved&&onSaved(data);
    };
  }
  draw();
}

let repSite=null;
async function pageReport(){
  const today=localISO();
  setPage(head(T('เช็คชื่อคนงานหน้าไซต์งาน'),dayLong(today),{back:'#daily'}) + `<div id="rb"><div class="loading"><div class="spin"></div></div></div>`);
  if(!S.hasPhase2){ $('#rb').outerHTML=need03(); return; }
  const {data:asg}=await sb.from('site_assignments').select('site_id').eq('user_id',S.profile.id);
  const mine=(asg||[]).map(a=>S.sites.find(s=>s.id===a.site_id)).filter(s=>s&&s.status==='active'&&(!S.site||String(s.id)===S.site||true));
  if(!mine.length){ $('#rb').outerHTML=`<div class="card empty"><b>ยังไม่ได้กำหนดไซต์ที่รับผิดชอบ</b>ติดต่อแอดมินเพื่อกำหนดไซต์ให้</div>`; return; }
  if(!repSite||!mine.some(s=>s.id===repSite)) repSite=mine[0].id;
  const {data:reps}=await sb.from('site_reports').select('*').in('site_id',mine.map(s=>s.id)).gte('report_date',addDays(today,-7)).order('report_date',{ascending:false});
  const todayRep={}; (reps||[]).filter(r=>r.report_date===today).forEach(r=>todayRep[r.site_id]=r);
  const site=mine.find(s=>s.id===repSite);
  const host=document.createElement('div'); host.className='col'; host.style.cssText='gap:12px;max-width:640px'; $('#rb').replaceWith(host);
  const hist=(reps||[]).filter(r=>r.site_id===repSite&&r.report_date!==today);
  host.innerHTML=`<div class="chips">${mine.map(s=>`<button class="chip ${s.id===repSite?'on':''}" data-rs="${s.id}">${esc(s.name)}${todayRep[s.id]?' <span class="tag t-ok" style="height:20px">ส่งแล้ว</span>':''}</button>`).join('')}</div>
    <div id="re"></div>
    ${hist.length?`<h3 class="h2" style="margin-top:8px">ย้อนหลัง 7 วัน</h3><div class="card card-l">${hist.map(r=>`<div class="li"><div class="grow"><b>${dayLong(r.report_date)}</b><span class="xs muted">${Object.entries(r.counts||{}).map(([k,n])=>`${esc(k)} ${n}`).join(' · ')||'ไม่มีคนงาน'}</span></div><b class="num">${r.total} คน</b><button class="btn btn-sm" data-slip="${r.id}">ใบสรุป</button></div>`).join('')}</div>`:''}`;
  $$('[data-rs]',host).forEach(b=>b.onclick=()=>{ repSite=+b.dataset.rs; pageReport(); });
  reportEditor($('#re',host), site, today, todayRep[repSite], d=>{ pageReport(); if(d) setTimeout(()=>crewSlip(d),300); });
  if(todayRep[repSite]){ const b=document.createElement('button'); b.className='btn'; b.textContent='ดู / แชร์ใบสรุปคนงานวันนี้'; b.onclick=()=>crewSlip(todayRep[repSite]); $('#re',host).after(b); }
  $$('[data-slip]',host).forEach(b=>b.onclick=()=>crewSlip((reps||[]).find(r=>r.id==b.dataset.slip)));
}

/* =====================================================================
   ดาว: ประวัติและปรับดาว
   ===================================================================== */
async function starHistoryHTML(empId){
  const {data,error}=await sb.from('star_events').select('*').eq('employee_id',empId).order('created_at',{ascending:false}).limit(60);
  if(error) return `<span class="hint bad">${esc(errText(error))}</span>`;
  if(!data.length) return '<div class="empty" style="padding:20px"><b>ยังไม่มีประวัติดาว</b>เริ่มต้นที่ 5 ดาว</div>';
  return data.map(s=>{ const neg=Number(s.delta)<0, rs=s.source==='reset';
    return `<div class="li" style="align-items:flex-start;${s.voided_at?'opacity:.55':''}"><b class="num" style="width:48px;font-size:16px;color:${rs?'var(--ink)':neg?'var(--bad)':'var(--ok)'};${s.voided_at?'text-decoration:line-through':''}">${rs?'= 5':(neg?'':'+')+Number(s.delta)}</b>
      <div class="grow"><b style="font-size:14.5px;${s.voided_at?'text-decoration:line-through':''}">${esc(s.reason)}</b><span class="xs muted">${thaiDate(s.event_date)}${s.created_by_name?` · ${esc(s.created_by_name)}`:''}${s.voided_at?` · คืนดาวแล้ว (${esc(s.void_reason||'')})`:''}</span></div>
      <span class="tag ${s.source==='manual'?'t-acc':''}">${s.source==='auto'?'อัตโนมัติ':s.source==='reset'?'รีเซ็ต':'ผู้บริหาร'}</span></div>`; }).join('');
}
function starAdjustHTML(){
  return `<div class="card col" style="gap:12px" id="adj"><div class="seg"><button class="on" data-sg="-1">หักดาว</button><button data-sg="1">คืนดาว</button></div>
    <div class="field"><label>จำนวน</label><div class="chips">${[0.5,1,1.5,2].map((n,i)=>`<button class="chip ${i===0?'on':''}" data-amt="${n}">${n}</button>`).join('')}</div></div>
    <div class="field"><label for="adjr">เหตุผล *</label><input class="in" id="adjr" placeholder="เช่น ไม่สวมอุปกรณ์เซฟตี้หน้างาน"></div>
    <button class="btn btn-p" data-apply>หัก 0.5 ดาว</button></div>`;
}
function bindStarAdjust(root, empId, onDone){
  let sg=-1, amt=0.5; const btn=$('[data-apply]',root);
  const lab=()=>btn.textContent=`${sg<0?'หัก':'คืน'} ${amt} ดาว`;
  $$('[data-sg]',root).forEach(b=>b.onclick=()=>{ sg=+b.dataset.sg; $$('[data-sg]',root).forEach(x=>x.classList.toggle('on',x===b)); lab(); });
  $$('[data-amt]',root).forEach(b=>b.onclick=()=>{ amt=+b.dataset.amt; $$('[data-amt]',root).forEach(x=>x.classList.toggle('on',x===b)); lab(); });
  btn.onclick=async()=>{ const r=$('#adjr',root).value.trim(); if(!r) return toast('ระบุเหตุผล',true);
    busy(btn,true); const {data,error}=await sb.rpc('adjust_stars',{p_emp:empId,p_delta:sg*amt,p_reason:r});
    if(error){ busy(btn,false); return toast(errText(error),true); } toast(`ดาวปัจจุบัน ${Number(data).toFixed(1)}`); onDone(); };
}

/* =====================================================================
   จัดการ: ผู้ใช้ / ไซต์งาน / ตำแหน่ง / กติกาดาว
   ===================================================================== */
let mgTab='sites';
function pageManage(){
  const tabs=[...(isAdmin()?[['users','ผู้ใช้'],['perms','สิทธิ์รายระบบ']]:[]),['sites','ไซต์งาน'],['pos','ตำแหน่ง'],['stars','กติกาดาว'],['daily','รายงานประจำวัน'],['mat','วัสดุ'],['boq','งบ BOQ'],['kits','ชุดวัสดุ'],['money','ใครเห็นเงิน'],['storage','พื้นที่และสำรอง']];
  if(!tabs.some(t=>t[0]===mgTab)) mgTab=tabs[0][0];
  setPage(head('จัดการ','ใช้ร่วมกันทั้งระบบ') + `<div class="col" style="max-width:${['mat','boq'].includes(mgTab)?'1400px':'760px'}"><div class="chips scroll" style="margin:0">${tabs.map(([k,t])=>`<button class="chip ${mgTab===k?'on':''}" data-mg="${k}">${t}</button>`).join('')}</div><div id="mg" class="col"><div class="loading"><div class="spin"></div></div></div></div>`);
  $$('[data-mg]').forEach(b=>b.onclick=()=>{ mgTab=b.dataset.mg; history.replaceState(null,'','#manage/'+mgTab); pageManage(); });
  ({users:mgUsers,perms:mgPerms,sites:mgSites,pos:mgPos,stars:mgStars,daily:mgDaily,mat:mgMat,boq:mgBoq,kits:mgKits,money:mgMoney,storage:mgStorage})[mgTab]();
}
const mgAfter=async msg=>{ toast(msg); await loadRefs(); pageManage(); };

let userTab='pending';
async function mgUsers(){
  const [u,e,a,cs]=await Promise.all([ sb.from('profiles').select('*').order('created_at',{ascending:false}), sb.from('employees').select('id,emp_code,first_name,last_name,nickname,position_id,status').order('sort_order',{nullsFirst:false}).order('emp_code'), sb.from('site_assignments').select('*'), sb.from('checker_scope').select('*') ]);
  const has04=!cs.error, scopes=cs.data||[];
  if(u.error){ $('#mg').innerHTML=`<div class="note n-bad">${esc(errText(u.error))}</div>`; return; }
  const users=u.data||[], emps=e.data||[], assigns=a.data||[];
  const groups={ pending:users.filter(x=>x.role==='pending'&&x.is_active), active:users.filter(x=>x.role!=='pending'&&x.is_active), blocked:users.filter(x=>!x.is_active) };
  const sites=S.sites.filter(s=>s.status==='active');
  const list=groups[userTab];
  const actEmps=emps.filter(x=>x.status==='active');
  const posGroups={}; actEmps.forEach(x=>{ const k=x.position_id||0; (posGroups[k]=posGroups[k]||[]).push(x.id); });
  const ckBlock=p=>{ if(!has04) return ''; const mine=new Set(scopes.filter(x=>x.user_id===p.id).map(x=>x.employee_id));
    return `<div class="row" style="padding:12px 14px;border-radius:14px;background:var(--surface2)"><div class="grow"><b>สิทธิ์เช็คชื่อ</b><div class="xs muted">ติ๊กเช็คชื่อได้เฉพาะวันนี้ ไม่เห็นค่าแรงและข้อมูลส่วนตัว</div></div><button type="button" class="sw ${p.can_check?'on':''}" data-ck role="switch" aria-checked="${!!p.can_check}" aria-label="สิทธิ์เช็คชื่อ"></button></div>
      <div class="col ${p.can_check?'':'hidden'}" data-ckbox style="gap:8px"><span class="lab">รายชื่อที่เช็คได้ (<span data-ckn>${mine.size}</span> จาก ${actEmps.length} คน)</span>
        <div class="chips"><button type="button" class="chip" data-ckg="all">ทุกคน</button>${Object.entries(posGroups).map(([k,ids])=>`<button type="button" class="chip" data-ckg="${k}">${k==='0'?'ไม่ระบุตำแหน่ง':esc(posName(+k))} ${ids.length}</button>`).join('')}</div>
        <span class="hint">แตะตำแหน่งเพื่อเลือกทั้งกลุ่ม หรือติ๊กรายคนด้านล่าง</span>
        <div class="ckl">${actEmps.map(x=>`<label class="li chk" style="padding:9px 0"><input type="checkbox" data-cke="${x.id}" data-pos="${x.position_id||0}" ${mine.has(x.id)?'checked':''}><span class="grow">${esc(shortName(x))} <span class="xs muted">${esc(posName(x.position_id))}</span></span></label>`).join('')}</div></div>`; };
  $('#mg').innerHTML=`<div class="seg">${[['pending',`รออนุมัติ ${groups.pending.length}`],['active',`ใช้งานอยู่ ${groups.active.length}`],['blocked',`ระงับ ${groups.blocked.length}`]].map(([k,t])=>`<button class="${userTab===k?'on':''}" data-ut="${k}">${t}</button>`).join('')}</div>
    ${list.length?list.map(p=>{ const mine=assigns.filter(x=>x.user_id===p.id).map(x=>x.site_id); const me=p.id===S.profile.id; const role=p.role==='pending'?'employee':p.role;
      return `<div class="card col" data-u="${p.id}" data-role="${role}" style="${p.role==='pending'?'border-color:var(--accent)':''}">
        <div class="row"><div class="av round">${esc((p.display_name||'?').charAt(0))}</div><div class="grow"><b>${esc(p.display_name)}${me?' <span class="tag">คุณ</span>':''}</b><div class="sm muted" style="overflow-wrap:anywhere">${esc(p.email)}${p.phone?` · ${esc(p.phone)}`:''}</div><div class="xs muted">สมัคร ${thaiDate(localISO(new Date(p.created_at)))}</div></div>${p.role==='pending'?'<span class="tag t-warn">ใหม่</span>':`<span class="tag">${ROLES[p.role]}</span>`}</div>
        <div class="field"><label>สิทธิ์การใช้งาน</label><div class="chips">${['employee','foreman','executive','admin'].map(r=>`<button class="chip ${role===r?'on':''}" data-r="${r}">${ROLES[r]}</button>`).join('')}</div></div>
        <div class="field ${role==='foreman'?'':'hidden'}" data-sitesbox><label>ไซต์ที่รับผิดชอบ</label><div class="chips">${sites.length?sites.map(s=>`<button class="chip ${mine.includes(s.id)?'on':''}" data-site="${s.id}">${mine.includes(s.id)?IC.check:''}${esc(s.name)}</button>`).join(''):'<span class="hint">ยังไม่มีไซต์ เพิ่มได้ที่แท็บไซต์งาน</span>'}</div></div>
        ${ckBlock(p)}
        <div class="field"><label>ผูกกับทะเบียนพนักงาน</label><select class="in" data-emp><option value="">ไม่ผูก</option>${emps.map(x=>`<option value="${x.id}" ${p.employee_id===x.id?'selected':''}>${esc(shortName(x))}${x.nickname?` (${esc(x.nickname)})`:''} ${esc(posName(x.position_id))}</option>`).join('')}</select></div>
        <div class="row" style="gap:10px">${userTab==='pending'?`<button class="btn btn-bad grow" data-block>ปฏิเสธ</button><button class="btn btn-p" style="flex:2" data-save>อนุมัติ</button>`
          :userTab==='active'?`${me?'':'<button class="btn btn-bad grow" data-block>ระงับบัญชี</button>'}<button class="btn btn-p" style="flex:2" data-save>บันทึก</button>`
          :`<button class="btn btn-p grow" data-unblock>เปิดใช้งานอีกครั้ง</button>`}</div>
      </div>`; }).join('')
      :`<div class="card empty"><b>${userTab==='pending'?'ไม่มีผู้สมัครรออนุมัติ':userTab==='active'?'ยังไม่มีผู้ใช้':'ไม่มีบัญชีที่ถูกระงับ'}</b>${userTab==='pending'?'เมื่อมีคนสมัคร รายชื่อจะขึ้นที่นี่':''}</div>`}`;
  $$('[data-ut]').forEach(b=>b.onclick=()=>{ userTab=b.dataset.ut; mgUsers(); });
  $$('[data-u]').forEach(card=>{
    const id=card.dataset.u;
    $$('[data-r]',card).forEach(b=>b.onclick=()=>{ card.dataset.role=b.dataset.r; $$('[data-r]',card).forEach(x=>x.classList.toggle('on',x===b)); $('[data-sitesbox]',card).classList.toggle('hidden',b.dataset.r!=='foreman'); });
    const syncCk=()=>{ const boxes=$$('[data-cke]',card); const n=boxes.filter(c=>c.checked).length; const nn=$('[data-ckn]',card); if(nn) nn.textContent=n;
      $$('[data-ckg]',card).forEach(g=>{ const grp=boxes.filter(c=>g.dataset.ckg==='all'||c.dataset.pos===g.dataset.ckg); g.classList.toggle('on',grp.length>0&&grp.every(c=>c.checked)); }); };
    const ck=$('[data-ck]',card); if(ck){ ck.onclick=()=>{ ck.classList.toggle('on'); ck.setAttribute('aria-checked',ck.classList.contains('on')); $('[data-ckbox]',card).classList.toggle('hidden',!ck.classList.contains('on')); };
      $$('[data-ckg]',card).forEach(g=>g.onclick=()=>{ const grp=$$('[data-cke]',card).filter(c=>g.dataset.ckg==='all'||c.dataset.pos===g.dataset.ckg); const all=grp.every(c=>c.checked); grp.forEach(c=>c.checked=!all); syncCk(); });
      $$('[data-cke]',card).forEach(c=>c.onchange=syncCk); syncCk(); }
    $$('[data-site]',card).forEach(b=>b.onclick=()=>{ b.classList.toggle('on'); b.innerHTML=(b.classList.contains('on')?IC.check:'')+esc(S.sites.find(s=>s.id==b.dataset.site)?.name||''); });
    const upd=async(patch, btn, msg)=>{
      busy(btn,true,'...');
      const {error}=await sb.from('profiles').update(patch).eq('id',id);
      if(error){ busy(btn,false); return toast(errText(error),true); }
      if(patch.can_check!==undefined){
        const want=patch.can_check?$$('[data-cke]',card).filter(c=>c.checked).map(c=>c.dataset.cke):[];
        const had=scopes.filter(x=>x.user_id===id).map(x=>x.employee_id);
        const add=want.filter(x=>!had.includes(x)), rem=had.filter(x=>!want.includes(x));
        if(add.length){ const r=await sb.from('checker_scope').insert(add.map(employee_id=>({user_id:id,employee_id}))); if(r.error){ busy(btn,false); return toast(errText(r.error),true);} }
        if(rem.length){ const r=await sb.from('checker_scope').delete().eq('user_id',id).in('employee_id',rem); if(r.error){ busy(btn,false); return toast(errText(r.error),true);} }
      }
      if(patch.role){
        const want=patch.role==='foreman'?$$('[data-site].on',card).map(c=>+c.dataset.site):[];
        const had=assigns.filter(x=>x.user_id===id).map(x=>x.site_id);
        const add=want.filter(s=>!had.includes(s)), rem=had.filter(s=>!want.includes(s));
        if(add.length){ const r=await sb.from('site_assignments').insert(add.map(site_id=>({user_id:id,site_id}))); if(r.error){ busy(btn,false); return toast(errText(r.error),true);} }
        if(rem.length){ const r=await sb.from('site_assignments').delete().eq('user_id',id).in('site_id',rem); if(r.error){ busy(btn,false); return toast(errText(r.error),true);} }
      }
      toast(msg); if(id===S.profile.id) await enter(); else mgUsers();
    };
    const sv=$('[data-save]',card); if(sv) sv.onclick=()=>upd({role:card.dataset.role, employee_id:$('[data-emp]',card).value||null, ...(has04?{can_check:!!$('[data-ck]',card)?.classList.contains('on')}:{})}, sv, userTab==='pending'?'อนุมัติแล้ว':'บันทึกสิทธิ์แล้ว');
    const bl=$('[data-block]',card); if(bl) bl.onclick=async()=>{ if(await confirmBox(userTab==='pending'?'ปฏิเสธผู้สมัครนี้? บัญชีจะถูกย้ายไปที่ "ระงับ"':'ระงับบัญชีนี้? ผู้ใช้จะเข้าระบบไม่ได้จนกว่าจะเปิดใช้งานอีกครั้ง', userTab==='pending'?'ปฏิเสธ':'ระงับ', true)) upd({is_active:false}, bl, 'ระงับบัญชีแล้ว'); };
    const ub=$('[data-unblock]',card); if(ub) ub.onclick=()=>upd({is_active:true}, ub, 'เปิดใช้งานแล้ว');
  });
}

function mgSites(){
  const trades=[...(S.settings.site_trades||[])];
  $('#mg').innerHTML=`<form class="card col" id="as" style="gap:10px"><b>เพิ่มไซต์งานใหม่</b><input class="in" name="n" placeholder="ชื่อไซต์ เช่น บ้านคุณไพศาล" aria-label="ชื่อไซต์"><input class="in" name="l" placeholder="ที่ตั้ง (ไม่บังคับ)" aria-label="ที่ตั้ง"><button class="btn btn-p btn-sm">เพิ่มไซต์</button></form>
    <div class="card card-l">${S.sites.length?S.sites.map(s=>`<button class="li" data-sd="${s.id}" style="${s.status==='active'?'':'opacity:.65'}"><div class="av" style="${s.status==='active'?'background:var(--okBg);color:var(--ok);border:0':''}">${IC.site}</div><div class="grow"><b>${esc(s.name)}</b><span class="sm muted">${[s.code,s.location].filter(Boolean).map(esc).join(' · ')||'แตะเพื่อเพิ่มรหัสโครงการและรายละเอียด'}</span></div>${s.line_group_id?'<span class="tag t-ok">LINE</span>':''}<span class="tag ${s.status==='active'?'t-ok':''}">${s.status==='active'?'เปิดอยู่':'ปิดแล้ว'}</span>${IC.chev}</button>`).join(''):'<div class="empty"><b>ยังไม่มีไซต์งาน</b>เพิ่มไซต์แรกจากฟอร์มด้านบน</div>'}</div>
    ${S.hasPhase2?`<div class="card col" style="gap:10px"><b>ประเภทช่างในรายงานหน้างาน</b><div class="chips" id="trd">${trades.map((t,i)=>`<span class="chip">${esc(t)}<button type="button" class="linkbtn" data-rt="${i}" aria-label="ลบ ${esc(t)}" style="padding:0 0 0 4px;text-decoration:none">×</button></span>`).join('')}</div>
      <form class="row" id="at" style="gap:8px"><input class="in grow" name="t" placeholder="เพิ่มประเภทช่าง เช่น ช่างกระเบื้อง" aria-label="ประเภทช่างใหม่"><button class="btn btn-sm">เพิ่ม</button></form></div>`:''}`;
  const as=$('#as'); as.onsubmit=async ev=>{ ev.preventDefault(); const n=as.n.value.trim(); if(!n) return toast('กรอกชื่อไซต์',true);
    const {error}=await sb.from('sites').insert({name:n,location:as.l.value.trim()||null}); if(error) return toast(errText(error),true); mgAfter('เพิ่มไซต์แล้ว'); };
  $$('[data-sd]').forEach(b=>b.onclick=()=>siteDetail(S.sites.find(x=>x.id==b.dataset.sd)));
  $$('[data-ts]').forEach(b=>b.onclick=async()=>{ const s=S.sites.find(x=>x.id==b.dataset.ts);
    const {error}=await sb.from('sites').update({status:s.status==='active'?'closed':'active'}).eq('id',s.id); if(error) return toast(errText(error),true); mgAfter(s.status==='active'?'ปิดไซต์แล้ว':'เปิดไซต์แล้ว'); });
  const saveTrades=async list=>{ const {error}=await sb.from('app_settings').update({value:list,updated_at:new Date().toISOString()}).eq('key','site_trades'); if(error) return toast(errText(error),true); mgAfter('บันทึกประเภทช่างแล้ว'); };
  $$('[data-rt]').forEach(b=>b.onclick=()=>{ trades.splice(+b.dataset.rt,1); saveTrades(trades); });
  const at=$('#at'); if(at) at.onsubmit=ev=>{ ev.preventDefault(); const t=at.t.value.trim(); if(!t) return; if(trades.includes(t)) return toast('มีประเภทนี้แล้ว',true); trades.push(t); saveTrades(trades); };
}

function mgPos(){
  $('#mg').innerHTML=`<form class="card row" id="ap" style="gap:10px"><input class="in grow" name="n" placeholder="ชื่อตำแหน่งใหม่" aria-label="ชื่อตำแหน่งใหม่"><button class="btn btn-p btn-sm">เพิ่ม</button></form>
    <div class="card card-l">${S.positions.map(p=>`<div class="li"><span class="grow">${esc(p.name)}</span><button class="btn btn-sm" data-ren="${p.id}">เปลี่ยนชื่อ</button><button class="btn btn-sm btn-bad" data-delp="${p.id}" aria-label="ลบ ${esc(p.name)}">ลบ</button></div>`).join('')}</div>`;
  const ap=$('#ap'); ap.onsubmit=async ev=>{ ev.preventDefault(); const n=ap.n.value.trim(); if(!n) return;
    const {error}=await sb.from('positions').insert({name:n,sort_order:S.positions.length+1}); if(error) return toast(/duplicate/.test(error.message)?'มีตำแหน่งนี้แล้ว':errText(error),true); mgAfter('เพิ่มตำแหน่งแล้ว'); };
  $$('[data-ren]').forEach(b=>b.onclick=async()=>{ const p=S.positions.find(x=>x.id==b.dataset.ren); const n=await promptBox('ชื่อตำแหน่งใหม่',p.name); if(!n||n===p.name) return;
    const {error}=await sb.from('positions').update({name:n}).eq('id',p.id); if(error) return toast(errText(error),true); mgAfter('เปลี่ยนชื่อแล้ว'); });
  $$('[data-delp]').forEach(b=>b.onclick=async()=>{ const p=S.positions.find(x=>x.id==b.dataset.delp);
    if(!await confirmBox(`ลบตำแหน่ง "${p.name}"? พนักงานในตำแหน่งนี้จะกลายเป็น "ไม่ระบุตำแหน่ง"`,'ลบ',true)) return;
    const {error}=await sb.from('positions').delete().eq('id',p.id); if(error) return toast(errText(error),true); mgAfter('ลบตำแหน่งแล้ว'); });
}

function mgStars(){
  if(!S.hasPhase2){ $('#mg').innerHTML=need03(); return; }
  const R={...S.settings.star_rules};
  const defs=[['absent','ขาดงานไม่แจ้ง','หักดาวต่อครั้ง',0.5,0,5],['late_count','มาสาย','จำนวนครั้งต่อเดือนที่ครบแล้วหัก',1,1,10],['late_penalty','มาสายครบจำนวน','หักดาว',0.5,0,5],['no_notice','ลากิจ/พักร้อนไม่แจ้งล่วงหน้า','หักดาวต่อครั้ง',0.5,0,5]];
  function draw(){
    $('#mg').innerHTML=`<div class="card card-l">${defs.map(([k,t,s,st])=>`<div class="li"><div class="grow"><b style="font-size:14.5px">${t}</b><span class="xs muted">${s}</span></div><button class="btn btn-sm" data-dn="${k}" aria-label="ลด ${t}" style="width:40px;padding:0">−</button><b class="num" style="width:36px;text-align:center">${R[k]}</b><button class="btn btn-sm" data-up="${k}" aria-label="เพิ่ม ${t}" style="width:40px;padding:0">+</button></div>`).join('')}</div>
      <div class="note n-info">${IC.info}<span>ลาป่วย ครึ่งวัน และลาที่แจ้งล่วงหน้า ไม่ถูกหักดาว ดาวเต็ม 5 ปรับครั้งละ 0.5 ต่ำสุด 0 กติกาใหม่มีผลกับการเช็คชื่อครั้งถัดไป รายการที่หักไปแล้วไม่เปลี่ยน</span></div>
      <button class="btn btn-p" data-save>บันทึกกติกา</button>
      <div class="card col" style="gap:10px;border-color:var(--bad)"><b>เริ่มรอบใหม่</b><span class="sm muted">ตั้งดาวของพนักงานที่ทำงานอยู่ทุกคนกลับเป็น 5 ดาว ประวัติเดิมยังเก็บไว้ครบ</span><button class="btn btn-bad" data-reset>รีเซ็ตดาวทุกคนเป็น 5</button></div>`;
    defs.forEach(([k,,,st,mn,mx])=>{ $(`[data-up="${k}"]`).onclick=()=>{ R[k]=Math.min(mx,+(Number(R[k])+st).toFixed(1)); draw(); }; $(`[data-dn="${k}"]`).onclick=()=>{ R[k]=Math.max(mn,+(Number(R[k])-st).toFixed(1)); draw(); }; });
    $('[data-save]').onclick=async e=>{ busy(e.target,true); const {error}=await sb.from('app_settings').update({value:R,updated_at:new Date().toISOString()}).eq('key','star_rules'); if(error){ busy(e.target,false); return toast(errText(error),true);} mgAfter('บันทึกกติกาดาวแล้ว'); };
    $('[data-reset]').onclick=async()=>{ if(!await confirmBox('รีเซ็ตดาวพนักงานที่ทำงานอยู่ทุกคนกลับเป็น 5 ดาว?','รีเซ็ต',true)) return;
      const r=await promptBox('เหตุผล / ชื่อรอบ','เริ่มรอบใหม่ ปี '+(new Date().getFullYear()+543),'รีเซ็ตดาว'); if(r===null) return;
      const {data,error}=await sb.rpc('reset_all_stars',{p_reason:r}); if(error) return toast(errText(error),true); toast(`รีเซ็ตดาว ${data} คนแล้ว`); };
  }
  draw();
}

/* =====================================================================
   เช็คชื่อแบบติ๊กรายชื่อ (ผู้เช็คชื่อ / ผู้บริหาร)
   ===================================================================== */
let rollView=(()=>{ try{ return localStorage.getItem('kty-roll-view')||'grid'; }catch(e){ return 'grid'; } })();
let rollSize=(()=>{ try{ return localStorage.getItem('kty-roll-size')||'M'; }catch(e){ return 'M'; } })();
const QUICK=['late','half','sick','personal','vacation','absent','off'];
async function pageRoll(){
  const today=localISO(), [m0]=monthRange(today), mgr=isManager();
  setPage(head('เช็คชื่อวันนี้', dayLong(today), {back:mgr?'#att':'', mActions:`<span class="tag t-acc">${mgr?ROLES[S.profile.role]:'ผู้เช็คชื่อ'}</span>`}) + `<div id="rb"><div class="loading"><div class="spin"></div></div></div>`);
  if(!S.hasPhase2){ $('#rb').outerHTML=need03(); return; }
  const [l,a]=await Promise.all([ sb.rpc('list_checkable_employees'), sb.from('attendance').select('employee_id,work_date,status,no_notice,ot_hours,site_id,note,updated_by').gte('work_date',m0).lte('work_date',today) ]);
  if(l.error){ $('#rb').outerHTML=/list_checkable_employees/.test(l.error.message||'')?`<div class="card empty"><b>ยังไม่ได้อัปเดตฐานข้อมูล</b>รันไฟล์ 04_rollcall.sql ใน Supabase SQL Editor แล้วโหลดหน้านี้ใหม่</div>`:`<div class="note n-bad">${esc(errText(l.error))}</div>`; return; }
  const emps=l.data||[], att=a.data||[];
  const rec={}, lateB={}; att.forEach(x=>{ if(x.work_date===today) rec[x.employee_id]=x; else if(x.status==='late') lateB[x.employee_id]=(lateB[x.employee_id]||0)+1; });
  const locked=id=>rec[id]&&!mgr&&rec[id].updated_by!==S.profile.id;
  const sel=new Set(emps.filter(e=>!locked(e.id)&&rec[e.id]?.status==='present').map(e=>e.id));
  const st={}, notice={}, siteOf={}, pick=new Set(); let multi=false, bulkSite=S.site?+S.site:(S.sites.find(s=>s.status==='active')?.id||null);
  emps.forEach(e=>{ if(rec[e.id]?.site_id) siteOf[e.id]=rec[e.id].site_id; });
  emps.forEach(e=>{ const r=rec[e.id]; if(r&&!locked(e.id)&&r.status!=='present'){ st[e.id]=r.status; notice[e.id]=!r.no_notice; } });
  let q='', f='all';
  if(!emps.length){ $('#rb').outerHTML=`<div class="card empty"><b>ยังไม่มีรายชื่อที่คุณเช็คได้</b>${mgr?'เพิ่มพนักงานได้ที่เมนูพนักงาน':'ติดต่อแอดมินเพื่อกำหนดรายชื่อให้'}</div>`; return; }
  const host=document.createElement('div'); host.className='col'; host.style.gap='12px'; $('#rb').replaceWith(host);
  const pos={}; emps.forEach(e=>{ if(e.position_id) pos[e.position_id]=(pos[e.position_id]||0)+1; });
  host.innerHTML=`<div class="row" style="gap:8px"><label class="grow" style="position:relative;display:block"><span style="position:absolute;left:14px;top:13px;color:var(--ink2)">${IC.search}</span><input class="in" id="rq" placeholder="ค้นหาชื่อหรือชื่อเล่น" style="padding-left:46px" aria-label="ค้นหา"></label>
      <div class="seg rsize" style="flex:none;padding:3px" role="group" aria-label="ขนาดการ์ด">${[['S','เล็ก'],['M','กลาง'],['L','ใหญ่']].map(([k,t])=>`<button data-size="${k}" style="min-height:40px;padding:0 10px">${t}</button>`).join('')}</div>
      <div class="seg" style="flex:none;padding:3px" role="group" aria-label="มุมมอง"><button data-view="grid" aria-label="แบบการ์ด" title="แบบการ์ด" style="min-height:40px;width:44px">${svg('<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>')}</button><button data-view="list" aria-label="แบบรายการ" title="แบบรายการ" style="min-height:40px;width:44px">${svg('<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>')}</button></div></div>
    <div class="chips scroll" id="rf"></div>
    <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn btn-sm" id="rmulti">เลือกหลายคน · กำหนดสถานะ/ไซต์</button><button class="btn btn-sm" id="rsum">ใบสรุปวันนี้</button></div>
    <div class="row" style="justify-content:space-between"><span class="sm muted" id="rhint">แตะเพื่อติ๊กว่ามาแล้ว</span><button class="linkbtn" id="rall" style="font-weight:700;color:var(--ink);text-decoration:none">เลือกทั้งหมด</button></div>
    <div id="rl"></div><div class="savebar" id="rbar"></div>`;
  const shown=()=>emps.filter(e=>(!q||[e.first_name,e.last_name,e.nickname].some(v=>(v||'').toLowerCase().includes(q)))&&(f==='all'||(f==='todo'?(!sel.has(e.id)&&!locked(e.id)):String(e.position_id)===f)));
  function drawFilters(){
    const todo=emps.filter(e=>!sel.has(e.id)&&!locked(e.id)).length;
    $('#rf',host).innerHTML=`<button class="chip ${f==='all'?'on':''}" data-f="all">ทั้งหมด ${emps.length}</button><button class="chip ${f==='todo'?'on':''}" data-f="todo">ยังไม่ติ๊ก ${todo}</button>`+Object.entries(pos).map(([id,c])=>`<button class="chip ${f===id?'on':''}" data-f="${id}">${esc(posName(+id))} ${c}</button>`).join('');
    $$('[data-f]',host).forEach(b=>b.onclick=()=>{ f=b.dataset.f; drawAll(); });
    $$('[data-view]',host).forEach(b=>b.classList.toggle('on',b.dataset.view===rollView));
    $$('[data-size]',host).forEach(b=>b.classList.toggle('on',b.dataset.size===rollSize)); $('.rsize',host).classList.toggle('hidden',rollView!=='grid');
  }
  function item(e){
    const on=multi?pick.has(e.id):sel.has(e.id), lk=locked(e.id), r=rec[e.id], sn=siteOf[e.id]?S.sites.find(s=>s.id===siteOf[e.id]):null;
    const mark=`<span class="rchk ${on?'on':''}">${on?svg('<path d="M5 12l5 5 9-10"/>','style="width:16px;height:16px;stroke-width:3"'):''}</span>`;
    const sub=lk?`<span class="tag ${ATT[r.status].c}" style="height:20px">${ATT[r.status].t}</span> <span class="xs muted">บันทึกโดยผู้บริหาร</span>`:(st[e.id]&&(multi||!on)?`<span class="tag ${ATT[st[e.id]].c}" style="height:20px">${ATT[st[e.id]].t}</span>${sn?` <span class="xs muted">${esc(sn.code||sn.name)}</span>`:''}`:multi&&sel.has(e.id)?`<span class="tag t-ok" style="height:20px">มา</span>${sn?` <span class="xs muted">${esc(sn.code||sn.name)}</span>`:''}`:`<span class="xs muted">${esc(e.nickname?e.nickname+' · ':'')}${esc(e.position_name||'')}</span>`);
    if(rollView==='grid') return `<button class="rtile ${on?'on':''}" data-r="${e.id}" ${lk?'disabled':''} aria-pressed="${on}">${lk?'':mark}${avatar(e,'rav')}<div><b>${esc(shortName(e))}</b><div class="rsub" style="margin-top:2px">${sub}</div></div></button>`;
    return `<button class="li rrow ${on?'on':''}" data-r="${e.id}" ${lk?'disabled':''} aria-pressed="${on}">${avatar(e,'','width:44px;height:44px')}<div class="grow"><b>${esc(shortName(e))}</b><div>${sub}</div></div>${lk?'':mark}</button>`;
  }
  function drawList(){
    const list=shown();
    $('#rl',host).innerHTML=list.length?(rollView==='grid'?`<div class="rgrid rs-${rollSize}">${list.map(item).join('')}</div>`:`<div class="card card-l">${list.map(item).join('')}</div>`):`<div class="card empty"><b>${f==='todo'?'ติ๊กครบทุกคนแล้ว':'ไม่พบรายชื่อ'}</b></div>`;
    hydratePhotos($('#rl',host));
    $$('[data-r]',host).forEach(b=>b.onclick=()=>{ const id=b.dataset.r; if(multi){ pick.has(id)?pick.delete(id):pick.add(id); drawAll(); return; } if(sel.has(id)) sel.delete(id); else { sel.add(id); delete st[id]; } drawAll(); });
  }
  function drawBar(){
    if(multi){ const sites=S.sites.filter(s=>s.status==='active'), BTN=['present','late','half','sick','personal','vacation','absent','off'];
      $('#rbar',host).innerHTML=`<div class="col grow" style="gap:8px"><div class="row" style="gap:8px"><b class="grow">เลือกแล้ว ${pick.size} คน</b><button class="linkbtn" id="rmx">เสร็จ</button></div>
        <label class="row sm" style="gap:8px">ไปทำงานที่ <select class="in" id="rsite" style="height:38px;flex:1"><option value="">— ไม่ระบุไซต์ —</option>${sites.map(s=>`<option value="${s.id}" ${s.id===bulkSite?'selected':''}>${esc(s.name)}${s.code?` (${esc(s.code)})`:''}</option>`).join('')}</select></label>
        <div class="bulkst">${BTN.map(k=>`<button class="btn btn-sm st-${k}" data-bulk="${k}" ${pick.size?'':'disabled'}>${ATT[k].t}</button>`).join('')}</div><span class="xs muted">แตะสถานะ = ใช้กับทุกคนที่เลือก แก้รายคนได้ภายหลัง</span></div>`;
      $('#rsite',host).onchange=e=>{ bulkSite=e.target.value?+e.target.value:null; };
      $('#rmx',host).onclick=()=>{ multi=false; pick.clear(); drawAll(); };
      $$('[data-bulk]',host).forEach(b=>b.onclick=()=>{ const k=b.dataset.bulk; pick.forEach(id=>{ if(locked(id)) return; if(k==='present'){ sel.add(id); delete st[id]; } else { sel.delete(id); st[id]=k; if(notice[id]===undefined) notice[id]=true; } if(bulkSite) siteOf[id]=bulkSite; });
        toast(`กำหนด "${ATT[k].t}" ให้ ${pick.size} คนแล้ว`); pick.clear(); drawAll(); });
      return; }
    const lockedPresent=emps.filter(e=>locked(e.id)&&rec[e.id].status==='present').length;
    const n=sel.size+lockedPresent, pct=Math.round(n/emps.length*100);
    $('#rbar',host).innerHTML=`<div class="col grow" style="gap:6px"><div class="row" style="gap:10px"><div class="track grow" style="height:8px"><i class="a" style="width:${pct}%"></i></div><b class="sm num">${n} / ${emps.length}</b></div><span class="xs muted">มาแล้ว ${n} คน</span></div><button class="btn btn-p" id="rgo">ตรวจสอบและยืนยัน</button>`;
    $('#rgo',host).onclick=review;
  }
  function drawAll(){ drawFilters(); drawList(); drawBar(); }
  $('#rq',host).addEventListener('input',e=>{ q=e.target.value.trim().toLowerCase(); drawList(); });
  $$('[data-size]',host).forEach(b=>b.onclick=()=>{ rollSize=b.dataset.size; try{ localStorage.setItem('kty-roll-size',rollSize); }catch(_){} drawAll(); });
  $$('[data-view]',host).forEach(b=>b.onclick=()=>{ rollView=b.dataset.view; try{ localStorage.setItem('kty-roll-view',rollView); }catch(_){} drawAll(); });
  $('#rmulti',host).onclick=()=>{ multi=!multi; pick.clear(); $('#rmulti',host).classList.toggle('btn-p',multi); $('#rhint',host).textContent=multi?'แตะเพื่อเลือกคนที่จะกำหนดสถานะ':'แตะเพื่อติ๊กว่ามาแล้ว'; drawAll(); };
  $('#rsum',host).onclick=()=>dailySummary(today);
  $('#rall',host).onclick=()=>{ if(multi){ const list=shown().filter(e=>!locked(e.id)); const all=list.every(e=>pick.has(e.id)); list.forEach(e=>all?pick.delete(e.id):pick.add(e.id)); drawAll(); return; } const list=shown().filter(e=>!locked(e.id)); const all=list.every(e=>sel.has(e.id)); list.forEach(e=>{ if(all) sel.delete(e.id); else { sel.add(e.id); delete st[e.id]; } }); drawAll(); };
  drawAll();

  function review(){
    const R=S.settings.star_rules||{}, N=Math.max(1,+R.late_count||3);
    const m=overlay(`<div class="sheet" role="dialog" aria-modal="true" aria-label="ตรวจสอบก่อนยืนยัน"></div>`, false);
    const sh=$('.sheet',m.el);
    function info(e){ const s=st[e.id];
      if(s==='absent') return `<span class="hint bad">ระบบหัก ${R.absent??1} ดาว</span>`;
      if(s==='late'){ const k=(lateB[e.id]||0)+1; return `<span class="hint warn">สายครั้งที่ ${k} ของเดือน${k%N===0?` ครบ ${N} ครั้ง หัก ${R.late_penalty??0.5} ดาว`:''}</span>`; }
      if(s==='personal'||s==='vacation') return `<label class="chk"><input type="checkbox" data-nt="${e.id}" ${notice[e.id]!==false?'checked':''}><span>แจ้งล่วงหน้าแล้ว <span class="muted">(ถ้าไม่ได้แจ้ง ระบบหัก ${R.no_notice??0.5} ดาว)</span></span></label>`;
      return ''; }
    function draw(){
      const ticked=emps.filter(e=>sel.has(e.id)), rest=emps.filter(e=>!sel.has(e.id)&&!locked(e.id));
      const total=ticked.length+rest.filter(e=>st[e.id]).length;
      sh.innerHTML=`<header class="appbar stripe"><button class="ibtn" data-x aria-label="ย้อนกลับ">${IC.back}</button><h1>ตรวจสอบก่อนยืนยัน<small>${dayLong(today)}</small></h1></header>
        <div class="sheet-body">
          <div class="card row"><div class="row" style="gap:0">${ticked.slice(0,5).map((e,i)=>avatar(e,'round',`width:36px;height:36px;font-size:13px;margin-left:${i?'-10px':'0'};border:2px solid var(--surface)`)).join('')}</div><div class="grow"><b>มาทำงาน ${ticked.length} คน</b>${ticked.length>5?`<span class="xs muted"> และอีก ${ticked.length-5} คน</span>`:''}</div><span class="tag t-ok">มา</span></div>
          ${rest.length?`<h3 class="h2">ยังไม่ได้ติ๊ก ${rest.length} คน</h3><div class="card card-l">${rest.map(e=>`<div class="li" style="flex-direction:column;align-items:stretch;gap:10px"><div class="row">${avatar(e,'','width:40px;height:40px')}<div class="grow"><b>${esc(shortName(e))}</b><span class="xs muted">${esc(e.position_name||'')}</span></div>${st[e.id]?'':'<span class="tag" style="border:1px dashed var(--ink2);background:transparent">ยังไม่ระบุ</span>'}</div>
              <div class="chips" style="gap:6px">${QUICK.map(k=>`<button class="chip ${st[e.id]===k?'on':''}" data-q="${e.id}|${k}" style="min-height:36px">${ATT[k].t}</button>`).join('')}</div>${info(e)}</div>`).join('')}</div>
            <span class="xs muted">คนที่ยังไม่ระบุ จะยังไม่ถูกบันทึก ผู้บริหารจัดการภายหลังได้</span>`:'<div class="note n-info">'+IC.check+'<span>ติ๊กครบทุกคนแล้ว</span></div>'}
        </div>
        <div class="sheet-foot"><button class="btn btn-p" data-go style="min-height:54px;font-size:16px" ${total?'':'disabled'}>ยืนยันเช็คชื่อ ${total} คน</button></div>`;
      hydratePhotos(sh);
      $('[data-x]',sh).onclick=()=>{ m.close(); drawAll(); };
      $$('[data-q]',sh).forEach(b=>b.onclick=()=>{ const [id,k]=b.dataset.q.split('|'); st[id]=st[id]===k?undefined:k; if(!st[id]) delete st[id]; if(notice[id]===undefined) notice[id]=true; const y=$('.sheet-body',sh).scrollTop; draw(); $('.sheet-body',sh).scrollTop=y; });
      $$('[data-nt]',sh).forEach(c=>c.onchange=()=>{ notice[c.dataset.nt]=c.checked; });
      $('[data-go]',sh).onclick=async ev=>{
        const keep=id=>({ot_hours:mgr?Number(rec[id]?.ot_hours||0):0, site_id:siteOf[id]||rec[id]?.site_id||null, note:rec[id]?.note||null});
        const rows=[...ticked.filter(e=>!locked(e.id)).map(e=>({employee_id:e.id,work_date:today,status:'present',no_notice:false,...keep(e.id)})),
          ...rest.filter(e=>st[e.id]).map(e=>({employee_id:e.id,work_date:today,status:st[e.id],no_notice:['personal','vacation'].includes(st[e.id])?notice[e.id]===false:false,...keep(e.id)}))];
        busy(ev.target,true);
        const {error}=await sb.from('attendance').upsert(rows,{onConflict:'employee_id,work_date'});
        if(error){ busy(ev.target,false); return toast(errText(error),true); }
        m.close(); rollDone(rows, emps, rec, locked);
      };
    }
    draw();
  }
}
function rollDone(rows, emps, rec, locked){
  const fin={}; emps.forEach(e=>{ if(locked(e.id)) fin[e.id]=rec[e.id].status; }); rows.forEach(r=>fin[r.employee_id]=r.status);
  const c=k=>Object.values(fin).filter(s=>k.includes(s)).length, none=emps.length-Object.keys(fin).length;
  const now=new Date();
  $('#page').innerHTML=head('เช็คชื่อวันนี้',dayLong(localISO()))+`<div class="col" style="align-items:center;text-align:center;gap:18px;max-width:520px;margin:0 auto;width:100%;padding-top:20px">
    <div style="width:112px;height:112px;border-radius:56px;background:var(--okBg);color:var(--ok);display:grid;place-items:center">${svg('<path d="M5 12l5 5 9-10"/>','style="width:60px;height:60px;stroke-width:2.4"')}</div>
    <div><h2 style="margin:0;font-size:26px">บันทึกเช็คชื่อแล้ว</h2><p class="muted" style="margin:6px 0 0">${dayLong(localISO())} เวลา ${now.toTimeString().slice(0,5)}</p></div>
    <div class="card" style="width:100%;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;padding:14px 8px">
      <div class="col" style="gap:0;align-items:center"><b style="font-size:24px;color:var(--ok)">${c(['present','half'])}</b><span class="xs muted">มา</span></div>
      <div class="col" style="gap:0;align-items:center"><b style="font-size:24px;color:var(--warn)">${c(['late'])}</b><span class="xs muted">สาย</span></div>
      <div class="col" style="gap:0;align-items:center"><b style="font-size:24px">${c(['sick','personal','vacation'])}</b><span class="xs muted">ลา</span></div>
      <div class="col" style="gap:0;align-items:center"><b style="font-size:24px;color:var(--bad)">${c(['absent'])}</b><span class="xs muted">ขาด</span></div></div>
    ${c(['off'])?`<span class="sm muted">วันหยุดบริษัท ${c(['off'])} คน</span>`:''}
    ${none?`<div class="note n-warn" style="width:100%;text-align:left;align-items:center">${IC.clock}<span>ยังไม่ระบุ ${none} คน ผู้บริหารจะจัดการภายหลัง</span></div>`:''}
    <span class="sm muted">${isManager()?'แก้ไขย้อนหลังได้ที่หน้าเช็คชื่อแบบละเอียด':'แก้ไขได้ถึงเที่ยงคืนวันนี้ หลังจากนั้นแก้ได้เฉพาะผู้บริหาร'}</span>
    <div class="col" style="width:100%;gap:10px"><button class="btn btn-p" id="dsum">ดู / แชร์ใบสรุปคนงานประจำวัน</button><button class="btn" id="redo">แก้ไขการเช็คชื่อวันนี้</button><a href="#home" class="btn">กลับหน้าแรก</a></div></div></div>`;
  $('#redo').onclick=pageRoll; $('#dsum').onclick=()=>dailySummary(localISO()); scrollTo(0,0); setTimeout(()=>dailySummary(localISO()),400);
}

/* =====================================================================
   ข้อมูลของฉัน
   ===================================================================== */
async function pageMe(){
  const p=S.profile, th=curTheme();
  setPage(head('ข้อมูลของฉัน',ROLES[p.role]) + `<div class="col" style="max-width:640px">
    <div id="myEmp"></div>${p.employee_id?`<a href="#my" class="card row" style="gap:12px;text-decoration:none;color:inherit"><span style="font-size:24px">🪪</span><div class="grow"><b>ข้อมูลของฉัน</b><div class="xs muted">เงินเดือน · ข้อมูลส่วนตัวทั้งหมด · ขอแก้ไขข้อมูล</div></div>${IC.chev}</a>`:''}
    <div class="card col" style="gap:10px"><b>รูปแบบสี</b>
      <div class="seg">${[['auto','ตามเครื่อง'],['light','สว่าง'],['dark','มืด']].map(([k,t])=>`<button class="${th===k?'on':''}" data-th="${k}">${t}</button>`).join('')}</div>
      <span class="xs muted">"ตามเครื่อง" จะสลับสว่าง/มืดตามการตั้งค่าของมือถือหรือคอมพิวเตอร์อัตโนมัติ</span></div>
    <form class="card col" id="meF" style="gap:12px"><b>บัญชีผู้ใช้</b>
      <div class="field"><label>อีเมล</label><input class="in" value="${esc(p.email)}" readonly></div>
      <div class="field"><label for="dn">ชื่อที่แสดง</label><input class="in" id="dn" value="${esc(p.display_name)}"></div>
      <div class="field"><label for="mph">เบอร์โทร</label><input class="in num" id="mph" type="tel" inputmode="tel" value="${esc(p.phone)}"></div>
      <button class="btn btn-p btn-sm" style="align-self:flex-start">บันทึก</button></form>
    <form class="card col" id="pwF" style="gap:12px"><b>เปลี่ยนรหัสผ่าน</b>${pwField('npw','new-password')}<button class="btn btn-sm" style="align-self:flex-start">เปลี่ยนรหัสผ่าน</button></form>
    <button class="btn btn-bad" id="lo3">ออกจากระบบ</button></div>`);
  bindEyes($('#page'));
  $('#mph').addEventListener('input',e=>{ e.target.value=fmtPhone(e.target.value); });
  $$('[data-th]').forEach(b=>b.onclick=()=>{ applyTheme(b.dataset.th); $$('[data-th]').forEach(x=>x.classList.toggle('on',x===b)); });
  $('#lo3').onclick=logout;
  $('#meF').onsubmit=async ev=>{ ev.preventDefault(); const dn=$('#dn').value.trim(); if(!dn) return toast('กรอกชื่อที่แสดง',true);
    const {error}=await sb.from('profiles').update({display_name:dn,phone:$('#mph').value.trim()||null}).eq('id',p.id); if(error) return toast(errText(error),true);
    S.profile.display_name=dn; S.profile.phone=$('#mph').value.trim(); toast('บันทึกแล้ว'); route(); };
  $('#pwF').onsubmit=async ev=>{ ev.preventDefault(); const pw=$('#npw').value; if(pw.length<6) return toast('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร',true);
    const {error}=await sb.auth.updateUser({password:pw}); if(error) return toast(errText(error),true); $('#npw').value=''; toast('เปลี่ยนรหัสผ่านแล้ว'); };
  if(p.employee_id){
    const {data:e}=await sb.from('employees').select('*').eq('id',p.employee_id).single();
    if(e){
      $('#myEmp').innerHTML=`<div class="card col" style="gap:12px"><div class="row" style="gap:14px">${avatar(e,'','width:64px;height:64px;font-size:22px;border-radius:18px')}
        <div class="grow"><b style="font-size:17px">${esc(fullName(e))}</b><div class="sm muted">${esc(posName(e.position_id))} · ${esc(e.emp_code)}</div><div style="margin-top:4px">${starBadge(e.stars)} <span class="sm muted">จาก 5 ดาว</span></div></div></div>
        <div class="card-l" style="padding:0"><div class="kv"><span>อายุงาน</span><span>${e.start_date?serviceText(e.start_date):'-'}</span></div><div class="kv"><span>บัตรประชาชนหมดอายุ</span><span>${e.id_expiry_date?thaiDate(e.id_expiry_date):'-'}</span></div></div>
        <button class="btn btn-sm" id="seeCard" style="align-self:flex-start">ดูบัตรพนักงาน</button></div>`;
      if(S.hasPhase2) $('#myEmp').insertAdjacentHTML('beforeend',`<div class="card card-l" style="margin-top:14px"><div style="padding:12px 0 4px"><b>ประวัติดาวของฉัน</b></div><div id="msh"><div class="spin" style="margin:12px auto"></div></div></div>`);
      hydratePhotos($('#myEmp'));
      $('#seeCard').onclick=()=>readOnlyCard(e);
      if(S.hasPhase2) starHistoryHTML(e.id).then(h=>{ const el=$('#msh'); if(el) el.outerHTML=h; });
      return;
    }
  }
  $('#myEmp').innerHTML=`<div class="note n-info">${IC.info}<span>บัญชีนี้ยังไม่ได้ผูกกับทะเบียนพนักงาน แอดมินผูกให้ได้ที่หน้าผู้ใช้ระบบ</span></div>`;
}



/* =====================================================================
   จัดลำดับ / รหัสพนักงาน (แอดมินเท่านั้น)
   ===================================================================== */
function staffOrderSheet(){
  let list=[...S.employees].sort((x,y)=>(x.status==='resigned')-(y.status==='resigned')||(x.sort_order??1e9)-(y.sort_order??1e9)||String(x.emp_code).localeCompare(String(y.emp_code)));
  const codes={}; list.forEach(e=>codes[e.id]=e.emp_code||'');
  const m=overlay(`<div class="sheet" role="dialog" aria-modal="true" aria-label="จัดลำดับและรหัสพนักงาน"></div>`,false,false); const sh=$('.sheet',m.el);
  function draw(){
    sh.innerHTML=`<header class="appbar stripe"><button class="ibtn" data-x aria-label="ปิด">${IC.close}</button><h1>จัดลำดับ / รหัสพนักงาน<small>${list.length} คน · ใช้กับทุกหน้า (รายชื่อ เช็คชื่อ เงินเดือน)</small></h1></header>
      <div class="sheet-body"><div class="row" style="gap:8px;flex-wrap:wrap"><span class="sm muted grow">เรียงอัตโนมัติ:</span><button class="btn btn-sm" data-s="code">ตามรหัส</button><button class="btn btn-sm" data-s="pos">ตามตำแหน่ง</button><button class="btn btn-sm" data-s="name">ตามชื่อ</button></div>
      <div class="card" style="padding:0;overflow-x:auto"><table class="tbl"><thead><tr><th style="width:56px">ลำดับ</th><th style="min-width:118px">รหัสพนักงาน</th><th>ชื่อ</th><th style="width:84px"></th></tr></thead><tbody>
      ${list.map((e,i)=>`<tr style="${e.status==='resigned'?'opacity:.55':''}"><td><input class="in num" type="number" min="1" value="${i+1}" data-pos="${i}" style="height:38px;width:52px;padding:0 4px;text-align:center" aria-label="ลำดับ"></td>
        <td><input class="in" value="${esc(codes[e.id])}" data-code="${e.id}" style="height:38px;min-width:108px;padding:0 8px;text-transform:uppercase" aria-label="รหัสพนักงาน"></td>
        <td><b>${esc(shortName(e))}</b><div class="xs muted">${esc(posName(e.position_id))}${e.status==='resigned'?' · ลาออก':''}</div></td>
        <td><div class="row" style="gap:4px"><button class="ibtn" data-up="${i}" ${i?'':'disabled'} aria-label="เลื่อนขึ้น">${svg('<path d="M6 15l6-6 6 6"/>')}</button><button class="ibtn" data-dn="${i}" ${i<list.length-1?'':'disabled'} aria-label="เลื่อนลง">${svg('<path d="M6 9l6 6 6-6"/>')}</button></div></td></tr>`).join('')}</tbody></table></div>
      <span class="xs muted">แก้ช่อง "ลำดับ" เพื่อย้ายไปตำแหน่งนั้นทันที · รหัสห้ามซ้ำและห้ามว่าง</span></div>
      <div class="sheet-foot"><button class="btn" data-x2>ยกเลิก</button><button class="btn btn-p" data-save>บันทึกลำดับและรหัส</button></div>`;
    $('[data-x]',sh).onclick=m.close; $('[data-x2]',sh).onclick=m.close;
    const move=(i,j)=>{ if(j<0||j>=list.length) return; const [x]=list.splice(i,1); list.splice(j,0,x); const y=$('.sheet-body',sh).scrollTop; draw(); $('.sheet-body',sh).scrollTop=y; };
    $$('[data-up]',sh).forEach(b=>b.onclick=()=>move(+b.dataset.up,+b.dataset.up-1));
    $$('[data-dn]',sh).forEach(b=>b.onclick=()=>move(+b.dataset.dn,+b.dataset.dn+1));
    $$('[data-pos]',sh).forEach(inp=>inp.onchange=()=>move(+inp.dataset.pos,Math.max(1,Math.min(list.length,+inp.value||1))-1));
    $$('[data-code]',sh).forEach(inp=>inp.oninput=()=>{ codes[inp.dataset.code]=inp.value.trim().toUpperCase(); });
    $$('[data-s]',sh).forEach(b=>b.onclick=()=>{ const k=b.dataset.s; list.sort((x,y)=>(x.status==='resigned')-(y.status==='resigned')||(k==='code'?String(codes[x.id]).localeCompare(String(codes[y.id]),undefined,{numeric:true}):k==='pos'?(S.positions.find(p=>p.id===x.position_id)?.sort_order??99)-(S.positions.find(p=>p.id===y.position_id)?.sort_order??99)||shortName(x).localeCompare(shortName(y),'th'):shortName(x).localeCompare(shortName(y),'th'))); draw(); });
    $('[data-save]',sh).onclick=async ev=>{
      const vals=list.map(e=>codes[e.id]); if(vals.some(v=>!v)) return toast('รหัสพนักงานห้ามว่าง',true);
      if(new Set(vals).size!==vals.length) return toast('มีรหัสพนักงานซ้ำกัน',true);
      busy(ev.target,true,'กำลังบันทึก...');
      const {error}=await sb.rpc('save_staff_order',{p_rows:list.map((e,i)=>({id:e.id,sort_order:(i+1)*10,emp_code:codes[e.id]}))});
      if(error){ busy(ev.target,false); return toast(/save_staff_order/.test(error.message)?'ยังไม่ได้รันไฟล์ 11_staff_order.sql':errText(error),true); }
      m.close(); toast('บันทึกลำดับและรหัสแล้ว'); pageEmployees();
    };
  }
  draw();
}

/* ---------- ใบสรุปคนงานประจำวัน (PDF เวกเตอร์ + PNG) ---------- */
async function dailySummary(date){
  try{
    const mgr=isManager();
    const [at,em]=await Promise.all([ sb.from('attendance').select('employee_id,status,site_id,ot_hours,updated_by').eq('work_date',date),
      mgr?sb.from('employees').select('id,emp_code,first_name,last_name,nickname,position_id,sort_order,status').order('sort_order',{nullsFirst:false}):sb.rpc('list_checkable_employees') ]);
    if(at.error) throw at.error;
    const emps=(em.data||[]).map(e=>({...e,position:e.position_name||posName(e.position_id)||''})), byId=Object.fromEntries(emps.map(e=>[e.id,e]));
    const rows=(at.data||[]).filter(r=>byId[r.employee_id]).map(r=>({...r,e:byId[r.employee_id]}));
    if(!rows.length) return toast('วันนี้ยังไม่มีการเช็คชื่อ',true);
    const dd=await dailySummaryDoc(date,rows);
    vectorPreview(dd, `ใบสรุปคนงาน_${date}`, 'ใบสรุปคนงานประจำวัน', '');
  }catch(e){ toast(errText(e),true); }
}
