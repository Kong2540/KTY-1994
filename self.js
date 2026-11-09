/* =====================================================================
   QR ถาวรต่อพนักงาน · หน้า "ข้อมูลของฉัน" · ขอแก้ข้อมูล (ผู้บริหารอนุมัติ)
   ===================================================================== */
const SELF_GROUPS = [
  ['ข้อมูลส่วนตัว', [['title','คำนำหน้า','sel',['นาย','นาง','นางสาว']],['first_name','ชื่อ'],['last_name','นามสกุล'],['nickname','ชื่อเล่น'],['first_name_en','ชื่อ (อังกฤษ)'],['last_name_en','นามสกุล (อังกฤษ)'],
    ['gender','เพศ','sel',[['male','ชาย'],['female','หญิง']]],['birth_date','วันเกิด','date'],['nationality','สัญชาติ'],['marital_status','สถานภาพ','sel',[['single','โสด'],['married','สมรส'],['divorced','หย่า'],['widowed','หม้าย'],['separated','แยกกันอยู่']]],
    ['military_status','สถานะทางทหาร','sel',[['completed','ผ่านการเกณฑ์'],['exempt','ได้รับการยกเว้น'],['reserve','ทหารกองหนุน'],['pending','ยังไม่ผ่าน']]],['blood_type','กรุ๊ปเลือด','sel',['A','B','AB','O']]]],
  ['บัตรประชาชน / ประกันสังคม', [['national_id','เลขบัตรประชาชน','secret'],['id_issue_date','วันออกบัตร','date'],['id_expiry_date','วันบัตรหมดอายุ','date'],['social_security_no','เลขประกันสังคม','secret'],['sso_hospital','โรงพยาบาลประกันสังคม']]],
  ['ที่อยู่ตามบัตร', [['addr_no','บ้านเลขที่'],['addr_moo','หมู่'],['addr_soi','ซอย'],['addr_road','ถนน'],['addr_subdistrict','ตำบล'],['addr_district','อำเภอ'],['addr_province','จังหวัด'],['addr_zip','รหัสไปรษณีย์']]],
  ['ที่อยู่ปัจจุบัน', [['cur_same','ที่อยู่ปัจจุบันตรงกับบัตร','bool'],['cur_no','บ้านเลขที่'],['cur_moo','หมู่'],['cur_soi','ซอย'],['cur_road','ถนน'],['cur_subdistrict','ตำบล'],['cur_district','อำเภอ'],['cur_province','จังหวัด'],['cur_zip','รหัสไปรษณีย์']]],
  ['ติดต่อ', [['phone','โทรศัพท์'],['line_id','LINE ID'],['email','อีเมล'],['emergency_name','ผู้ติดต่อฉุกเฉิน'],['emergency_relation','ความสัมพันธ์'],['emergency_phone','โทรผู้ติดต่อฉุกเฉิน']]],
  ['บัญชีธนาคาร (แก้ไขผ่านแอดมิน)', [['bank_name','ธนาคาร','ro'],['bank_account_no','เลขบัญชี','secret-ro'],['bank_account_name','ชื่อบัญชี','ro']]],
  ['การจ้างงาน (แก้ไขผ่านแอดมิน)', [['emp_code','รหัสพนักงาน','ro'],['position_id','ตำแหน่ง','ro'],['start_date','วันเริ่มงาน','ro-date'],['wage_type','ประเภทค่าจ้าง','ro'],['wage_rate','อัตราค่าจ้าง','ro'],['ot_rate','อัตรา OT','ro']]]
];
const SELF_LABEL = Object.fromEntries(SELF_GROUPS.flatMap(g=>g[1]).map(f=>[f[0],f[1]]).concat([['photo_path','รูปถ่าย']]));
const maskId = (k,v) => { const s=String(v||''); if(!s) return '-'; if(k==='national_id'&&s.length===13) return `x-xxxx-xxxxx-${s.slice(10,12)}-${s[12]}`; return s.replace(/.(?=.{3})/g,'x'); };
let REVEAL = {}; // employee_id → true เมื่อยืนยันรหัสผ่านแล้ว (เฉพาะหน้านี้)
function selfVal(f,e){ const [k,,t,opt]=f, v=e[k];
  if(v==null||v==='') return '-';
  if(t==='bool') return v?'ใช่':'ไม่ใช่'; if(t==='date'||t==='ro-date') return thaiDate(v);
  if(k==='position_id') return posName(v)||'-'; if(k==='wage_type') return v==='monthly'?'รายเดือน':'รายวัน'; if(k==='wage_rate'||k==='ot_rate') return fmtN(v);
  if(t==='sel'&&Array.isArray(opt?.[0])) return (opt.find(o=>o[0]===v)||[,v])[1];
  if(t&&t.startsWith('secret')) return REVEAL[e.id]?(k==='national_id'&&String(v).length===13?`${v[0]}-${v.slice(1,5)}-${v.slice(5,10)}-${v.slice(10,12)}-${v[12]}`:v):maskId(k,v);
  return String(v); }

/* ---------- สแกน QR ---------- */
async function pageQR(token){
  setPage(head('ข้อมูลพนักงาน','')+'<div id="qrb"><div class="loading"><div class="spin"></div></div></div>');
  const {data,error}=await sb.rpc('resolve_qr',{p_token:token});
  if(error){ $('#qrb').outerHTML=`<div class="card empty"><b>${/resolve_qr/.test(error.message)?'ยังไม่ได้อัปเดตฐานข้อมูล (ไฟล์ 17)':'เปิด QR ไม่ได้'}</b>${esc(errText(error))}</div>`; return; }
  if(data.state==='own'){ location.replace('#my'); return; }
  if(data.state==='manager'){ location.replace('#my/'+data.employee_id); return; }
  const box=t=>{ $('#qrb').outerHTML=`<div class="card col" style="gap:12px;max-width:520px">${t}</div>`; };
  if(data.state==='invalid') return box('<b>QR ไม่ถูกต้องหรือถูกยกเลิกแล้ว</b><span class="muted">ติดต่อแอดมิน</span>');
  if(data.state==='other') return box('<b>QR นี้เป็นของพนักงานคนอื่น</b><span class="muted">คุณดูได้เฉพาะข้อมูลของตัวเอง</span><a class="btn" href="#my">ไปที่ข้อมูลของฉัน</a>');
  box(`<b style="font-size:17px">ผูกบัญชีกับพนักงาน</b><span>QR นี้เป็นของพนักงาน <b>${esc(data.emp_code||'')} ${esc(data.first_name||'')}</b></span>
    <span class="muted sm">บัญชีของคุณยังไม่ได้ผูกกับทะเบียนพนักงาน ถ้านี่คือคุณ กดส่งคำขอ แอดมินจะตรวจสอบแล้วอนุมัติ</span>
    ${data.pending?'<div class="note n-info">'+IC.info+'<span>ส่งคำขอแล้ว รอแอดมินอนุมัติ</span></div>':''}<button class="btn btn-p" data-req>${data.pending?'ส่งคำขออีกครั้ง':'ใช่ นี่คือฉัน ส่งคำขอผูกบัญชี'}</button>`);
  $('[data-req]').onclick=async ev=>{ busy(ev.target,true); const {error:e2}=await sb.rpc('request_link',{p_token:token}); if(e2){ busy(ev.target,false); return toast(errText(e2),true); } toast('ส่งคำขอแล้ว รอแอดมินอนุมัติ'); pageQR(token); };
}

/* ---------- ข้อมูลของฉัน ---------- */
let MY_TAB='pay';
async function pageMy(empId, tab){
  if(tab) MY_TAB=tab;
  const own=!empId||empId===S.profile.employee_id, eid=empId||S.profile.employee_id;
  if(!own&&!isManager()){ location.replace('#my'); return; }
  setPage(head(own?'ข้อมูลของฉัน':'ข้อมูลพนักงาน',own?'เงินเดือน · ข้อมูลส่วนตัว · ดาว':'มุมมองผู้บริหาร',{back:own?null:'#employees'})+
    `<div class="seg" style="max-width:520px">${[['pay','เงินเดือน'],['profile','ข้อมูลส่วนตัว'],['stars','ดาว']].map(([k,t])=>`<button class="${MY_TAB===k?'on':''}" data-mt="${k}">${t}</button>`).join('')}</div><div id="myb"><div class="loading"><div class="spin"></div></div></div>`);
  $$('[data-mt]').forEach(b=>b.onclick=()=>{ MY_TAB=b.dataset.mt; pageMy(empId); });
  if(!eid){ $('#myb').outerHTML='<div class="card empty"><b>บัญชีนี้ยังไม่ได้ผูกกับทะเบียนพนักงาน</b>สแกน QR บนสลิปเงินเดือนของคุณ แล้วกด "ส่งคำขอผูกบัญชี" หรือแจ้งแอดมิน</div>'; return; }
  const host=document.createElement('div'); $('#myb').replaceWith(host);
  if(MY_TAB==='pay') return payFinance(host, eid, null);
  if(MY_TAB==='stars'){ host.innerHTML=`<div class="card col" style="gap:10px;max-width:520px"><b>ดาว</b><span class="muted sm">ดูคะแนนดาวและประวัติการหัก/คืนดาว</span><a class="btn btn-p" href="${own?'#me/stars':'#emp/'+eid}">เปิดหน้าดาว</a></div>`; return; }
  return myProfile(host, eid, own);
}
async function myProfile(host, eid, own){
  const [em,rq]=await Promise.all([ sb.from('employees').select('*').eq('id',eid).maybeSingle(), sb.from('emp_change_requests').select('*').eq('employee_id',eid).order('created_at',{ascending:false}).limit(6) ]);
  if(em.error||!em.data){ host.innerHTML=`<div class="card empty"><b>ไม่พบข้อมูล หรือไม่มีสิทธิ์ดู</b></div>`; return; }
  const e=em.data, reqs=rq.error?[]:(rq.data||[]), pend=reqs.find(r=>r.status==='pending');
  const hasSecret=SELF_GROUPS.some(g=>g[1].some(f=>f[2]?.startsWith?.('secret')&&e[f[0]]));
  host.innerHTML=`<div class="col" style="gap:12px;max-width:760px">
    <div class="card row" style="gap:14px">${avatar(e)}<div class="grow"><b style="font-size:18px">${esc([e.title,e.first_name,e.last_name].filter(Boolean).join(' '))}${e.nickname?` (${esc(e.nickname)})`:''}</b><div class="sm muted">${esc(e.emp_code||'')} · ${esc(posName(e.position_id)||'')}</div></div>
      ${own?`<button class="btn btn-sm btn-p" data-edit ${pend?'':''}>ขอแก้ไขข้อมูล</button>`:`<a class="btn btn-sm" href="#emp/${e.id}">แก้ในทะเบียน</a>`}</div>
    ${pend?`<div class="note n-warn">${IC.info}<span>มีคำขอแก้ไขรออนุมัติ (${Object.keys(pend.changes).map(k=>esc(SELF_LABEL[k]||k)).join(', ')}) ส่งเมื่อ ${new Date(pend.created_at).toLocaleString('th-TH',{dateStyle:'medium',timeStyle:'short'})}</span></div>`:''}
    ${hasSecret?`<div class="row" style="gap:8px"><span class="xs muted grow">${REVEAL[e.id]?'แสดงข้อมูลสำคัญแบบเต็มแล้ว (เฉพาะหน้านี้)':'เลขบัตร/เลขประกันสังคม/เลขบัญชี ถูกปิดบังไว้เพื่อความปลอดภัย'}</span>${REVEAL[e.id]?'<button class="btn btn-sm" data-hide>ซ่อน</button>':'<button class="btn btn-sm" data-reveal>แสดงแบบเต็ม (ใส่รหัสผ่าน)</button>'}</div>`:''}
    ${SELF_GROUPS.map(([g,fs])=>`<div class="card" style="padding:4px 16px"><div class="sm" style="font-weight:700;padding:10px 0 4px">${g}</div>${fs.map(f=>`<div class="kv"><span>${f[1]}</span><span style="text-align:right">${esc(selfVal(f,e))}</span></div>`).join('')}</div>`).join('')}
    ${reqs.filter(r=>r.status!=='pending').length?`<h3 class="h2">ประวัติคำขอแก้ไข</h3><div class="card card-l">${reqs.filter(r=>r.status!=='pending').map(r=>`<div class="li"><div class="grow"><b class="sm">${Object.keys(r.changes).map(k=>esc(SELF_LABEL[k]||k)).join(', ')}</b><span class="xs muted">${new Date(r.created_at).toLocaleString('th-TH',{dateStyle:'medium'})}${r.reviewer_name?` · ${esc(r.reviewer_name)}`:''}${r.note?` · ${esc(r.note)}`:''}</span></div><span class="tag ${r.status==='approved'?'t-ok':r.status==='rejected'?'t-bad':''}">${{approved:'อนุมัติแล้ว',rejected:'ไม่อนุมัติ',superseded:'แทนที่ด้วยคำขอใหม่'}[r.status]}</span></div>`).join('')}</div>`:''}</div>`;
  const rv=$('[data-reveal]',host); if(rv) rv.onclick=()=>revealSheet(e,()=>myProfile(host,eid,own));
  const hd=$('[data-hide]',host); if(hd) hd.onclick=()=>{ delete REVEAL[e.id]; myProfile(host,eid,own); };
  const ed=$('[data-edit]',host); if(ed) ed.onclick=()=>editRequestSheet(e,()=>myProfile(host,eid,own));
}
function revealSheet(e, done){
  const ov=overlay(`<div class="modal" role="dialog" aria-modal="true"><h3 class="h2" style="font-size:18px">ยืนยันตัวตน</h3><span class="sm muted">ใส่รหัสผ่านของบัญชี ${esc(S.session?.user?.email||'')} เพื่อดูข้อมูลสำคัญแบบเต็ม (ระบบบันทึกการดูไว้)</span>
    <input class="in" type="password" id="rvp" autocomplete="current-password" placeholder="รหัสผ่าน"><div class="row" style="gap:8px;justify-content:flex-end"><button class="btn" data-x>ยกเลิก</button><button class="btn btn-p" data-ok>ยืนยัน</button></div></div>`);
  $('[data-x]',ov.el).onclick=ov.close; setTimeout(()=>$('#rvp',ov.el).focus(),50);
  const go=async ev=>{ const pw=$('#rvp',ov.el).value; if(!pw) return; busy(ev.target,true);
    const {error}=await sb.auth.signInWithPassword({email:S.session.user.email,password:pw});
    if(error){ busy(ev.target,false); return toast('รหัสผ่านไม่ถูกต้อง',true); }
    try{ await sb.rpc('log_reveal',{p_employee:e.id,p_what:'national_id/social_security_no/bank_account_no'}); }catch(_){}
    REVEAL[e.id]=true; ov.close(); done(); setTimeout(()=>{ delete REVEAL[e.id]; },5*60000); };
  $('[data-ok]',ov.el).onclick=go; $('#rvp',ov.el).onkeydown=ev=>{ if(ev.key==='Enter') go({target:$('[data-ok]',ov.el)}); };
}
function editRequestSheet(e, done){
  const F={}; let photo=null;
  const editable=SELF_GROUPS.slice(0,5);
  const field=f=>{ const [k,l,t,opt]=f, v=e[k]??'';
    if(t==='bool') return `<label class="row sm" style="gap:8px;min-height:40px"><input type="checkbox" data-f="${k}" ${v?'checked':''}> ${l}</label>`;
    if(t==='sel') return `<label class="field"><span class="xs muted">${l}</span><select class="in" data-f="${k}"><option value="">-</option>${opt.map(o=>Array.isArray(o)?o:[o,o]).map(([a,b])=>`<option value="${a}" ${v===a?'selected':''}>${b}</option>`).join('')}</select></label>`;
    return `<label class="field"><span class="xs muted">${l}</span><input class="in" data-f="${k}" ${t==='date'?'type="date"':''} ${k==='national_id'?'inputmode="numeric" maxlength="13"':''} value="${esc(v)}"></label>`; };
  const ov=overlay(`<div class="sheet" role="dialog" aria-modal="true" aria-label="ขอแก้ไขข้อมูล"><header class="appbar stripe"><button class="ibtn" data-x aria-label="ปิด">${IC.close}</button><h1>ขอแก้ไขข้อมูล<small>ส่งให้ผู้บริหารตรวจสอบก่อนเปลี่ยนจริง</small></h1></header>
    <div class="sheet-body"><div class="card row" style="gap:12px">${avatar(e)}<div class="grow"><b class="sm">รูปถ่าย</b><div class="xs muted" id="phn">ถ้าต้องการเปลี่ยน เลือกรูปใหม่</div></div><label class="btn btn-sm">เลือกรูป<input type="file" accept="image/*" hidden data-photo></label></div>
      ${editable.map(([g,fs])=>`<div class="card col" style="gap:8px"><b class="sm">${g}</b><div class="g2">${fs.map(field).join('')}</div></div>`).join('')}
      <div class="note n-info">${IC.info}<span>บัญชีธนาคาร ตำแหน่ง ค่าจ้าง แก้ไขผ่านแอดมินเท่านั้น</span></div></div>
    <div class="sheet-foot"><span class="xs muted grow" id="chn">ยังไม่มีการแก้ไข</span><button class="btn" data-x2>ยกเลิก</button><button class="btn btn-p" data-go>ส่งคำขอแก้ไข</button></div></div>`,false,false);
  const collect=()=>{ Object.keys(F).forEach(k=>delete F[k]); $$('[data-f]',ov.el).forEach(i=>{ const k=i.dataset.f; let v=i.type==='checkbox'?i.checked:i.value.trim(); if(v==='') v=null; const old=e[k]??null;
      if(String(old??'')!==String(v??'')) F[k]=v; }); const n=Object.keys(F).length+(photo?1:0); $('#chn',ov.el).textContent=n?`แก้ไข ${n} ช่อง`:'ยังไม่มีการแก้ไข'; };
  $$('[data-f]',ov.el).forEach(i=>i.addEventListener(i.tagName==='SELECT'||i.type==='checkbox'?'change':'input',collect));
  $('[data-photo]',ov.el).onchange=async ev=>{ const f=ev.target.files[0]; if(!f) return; photo=await resizeImage(f,800); $('#phn',ov.el).textContent='เลือกรูปใหม่แล้ว (รออนุมัติ)'; collect(); };
  $('[data-x]',ov.el).onclick=ov.close; $('[data-x2]',ov.el).onclick=ov.close;
  $('[data-go]',ov.el).onclick=async ev=>{ collect(); if(!Object.keys(F).length&&!photo) return toast('ยังไม่มีการแก้ไข',true);
    if(F.national_id&&!/^\d{13}$/.test(F.national_id)) return toast('เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก',true);
    busy(ev.target,true,'กำลังส่ง...');
    try{ if(photo){ const path=`req/${e.id}-${Date.now()}.jpg`; const {error}=await sb.storage.from(PHOTO_BUCKET).upload(path,photo,{contentType:'image/jpeg'}); if(error) throw error; F.photo_path=path; }
      const {error}=await sb.rpc('submit_profile_change',{p_changes:F}); if(error) throw error;
      ov.close(); toast('ส่งคำขอแล้ว รอผู้บริหารอนุมัติ'); done(); }
    catch(err){ busy(ev.target,false); toast(errText(err),true); } };
}

/* ---------- ผู้บริหาร: ตรวจคำขอแก้ไข / คำขอผูกบัญชี ---------- */
async function pageReqs(){
  setPage(head('คำขอจากพนักงาน','แก้ไขข้อมูลส่วนตัว · ผูกบัญชี')+'<div id="rqb"><div class="loading"><div class="spin"></div></div></div>');
  const [cr,lr]=await Promise.all([ sb.from('emp_change_requests').select('*, employees(emp_code,first_name,last_name)').eq('status','pending').order('created_at'),
    isAdmin()?sb.from('link_requests').select('*, employees(emp_code,first_name,last_name)').eq('status','pending').order('created_at'):Promise.resolve({data:[]}) ]);
  if(cr.error){ $('#rqb').outerHTML=`<div class="card empty"><b>ยังไม่ได้อัปเดตฐานข้อมูล (ไฟล์ 17)</b></div>`; return; }
  const list=cr.data||[], links=lr.data||[];
  const paths=list.map(r=>r.changes.photo_path).filter(Boolean); let urls={};
  if(paths.length){ const {data}=await sb.storage.from(PHOTO_BUCKET).createSignedUrls(paths,3600); (data||[]).forEach(x=>urls[x.path]=x.signedUrl); }
  const show=(k,v)=>k==='photo_path'?(v&&urls[v]?`<img src="${urls[v]}" alt="" style="height:70px;border-radius:8px">`:'(รูปใหม่)'):(['national_id','social_security_no'].includes(k)?esc(maskId(k,v))+' <span class="xs muted">(ปิดบัง)</span>':esc(v==null||v===''?'-':typeof v==='boolean'?(v?'ใช่':'ไม่ใช่'):String(v)));
  $('#rqb').outerHTML=`<div class="col" style="gap:12px;max-width:820px">
    ${links.length?`<h3 class="h2">คำขอผูกบัญชี (${links.length})</h3><div class="card card-l">${links.map(l=>`<div class="li"><div class="grow"><b>${esc(l.user_name||'')}</b><span class="xs muted">ขอผูกกับ ${esc(l.employees?.emp_code||'')} ${esc((l.employees?.first_name||'')+' '+(l.employees?.last_name||''))} · ${new Date(l.created_at).toLocaleString('th-TH',{dateStyle:'medium',timeStyle:'short'})}</span></div><button class="btn btn-sm btn-bad" data-lno="${l.id}">ไม่อนุมัติ</button><button class="btn btn-sm btn-p" data-lok="${l.id}">อนุมัติ</button></div>`).join('')}</div>`:''}
    <h3 class="h2">คำขอแก้ไขข้อมูล (${list.length})</h3>
    ${list.map(r=>`<div class="card col" style="gap:8px"><div class="row"><b class="grow">${esc(r.employees?.emp_code||'')} ${esc((r.employees?.first_name||'')+' '+(r.employees?.last_name||''))}</b><span class="xs muted">${new Date(r.created_at).toLocaleString('th-TH',{dateStyle:'medium',timeStyle:'short'})}</span></div>
      <table class="tbl"><thead><tr><th>ช่อง</th><th>ค่าเดิม</th><th>ค่าใหม่</th></tr></thead><tbody>${Object.keys(r.changes).map(k=>`<tr><td>${esc(SELF_LABEL[k]||k)}</td><td class="muted">${show(k,r.old_values[k])}</td><td><b>${show(k,r.changes[k])}</b></td></tr>`).join('')}</tbody></table>
      <div class="row" style="gap:8px;justify-content:flex-end"><button class="btn btn-sm btn-bad" data-cno="${r.id}">ไม่อนุมัติ</button><button class="btn btn-sm btn-p" data-cok="${r.id}">อนุมัติ และอัปเดตทะเบียน</button></div></div>`).join('')||'<div class="card empty"><b>ไม่มีคำขอรออนุมัติ</b></div>'}</div>`;
  const act=(sel,ok,fn)=>$$(sel).forEach(b=>b.onclick=async()=>{ let note=null; if(!ok){ note=await promptBox('เหตุผลที่ไม่อนุมัติ',''); if(note===null) return; }
    const {error}=await fn(+Object.values(b.dataset)[0],note); if(error) return toast(errText(error),true); toast(ok?'อนุมัติแล้ว':'บันทึกแล้ว'); pageReqs(); });
  act('[data-cok]',true,(id,n)=>sb.rpc('review_profile_change',{p_id:id,p_ok:true,p_note:n})); act('[data-cno]',false,(id,n)=>sb.rpc('review_profile_change',{p_id:id,p_ok:false,p_note:n}));
  act('[data-lok]',true,(id,n)=>sb.rpc('decide_link',{p_id:id,p_ok:true,p_note:n})); act('[data-lno]',false,(id,n)=>sb.rpc('decide_link',{p_id:id,p_ok:false,p_note:n}));
}
