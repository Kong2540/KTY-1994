/* =====================================================================
   อ่านบัตรประชาชน: (1) เครื่องอ่านบัตร ผ่าน KTY Card Agent บนเครื่องนี้  (2) ถ่ายรูปบัตร → Google OCR ผ่าน Bridge
   ข้อมูลต้องตรวจและกด "ใช้ข้อมูลนี้" ก่อนเสมอ · ไม่เก็บรูปบัตร
   ===================================================================== */
const AGENT = 'http://127.0.0.1:47321';
const AGENT_EXE = 'agent/KTY-Card-Agent.exe', AGENT_APK = 'agent/KTY-Card-Agent.apk', IS_ANDROID = /Android/.test(navigator.userAgent);
async function agentCall(path, ms=8000){
  const c=new AbortController(), t=setTimeout(()=>c.abort(),ms);
  const base={headers:{'X-KTY':'1'},signal:c.signal,cache:'no-store'};
  try{
    let r;
    try{ r=await fetch(AGENT+path,{...base,targetAddressSpace:'loopback'}); }
    catch(e){ if(e.name==='AbortError') throw e; r=await fetch(AGENT+path,{...base,targetAddressSpace:'local'}).catch(()=>fetch(AGENT+path,base)); }
    if(r.status===403){ const j=await r.json().catch(()=>({})); const er=new Error('origin'); er.origin=j.origin; throw er; }
    return await r.json();
  } finally{ clearTimeout(t); }
}
const idCheck = id => { const s=String(id||'').replace(/\D/g,''); if(s.length!==13) return false; let n=0; for(let i=0;i<12;i++) n+=(+s[i])*(13-i); return (11-n%11)%10===+s[12]; };
const TH_MON_FULL=['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const TH_MON_AB=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const EN_MON=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
function thDateToISO(s){ // "12 มี.ค. 2535" / "12 มีนาคม 2535" / "12 Mar. 1992"
  const m=String(s).replace(/\s+/g,' ').match(/(\d{1,2})\s*([ก-๙a-zA-Z\.]+)\s*(\d{4})/); if(!m) return '';
  const d=+m[1], mt=m[2].replace(/\s/g,''), y=+m[3];
  let mi=TH_MON_AB.findIndex(x=>mt.startsWith(x.replace(/\./g,''))||mt===x); if(mi<0) mi=TH_MON_AB.findIndex(x=>x.replace(/\./g,'')===mt.replace(/\./g,''));
  if(mi<0) mi=TH_MON_FULL.findIndex(x=>mt.startsWith(x.slice(0,4))); if(mi<0) mi=EN_MON.findIndex(x=>mt.toLowerCase().startsWith(x));
  if(mi<0||!d) return ''; const ce=y>2400?y-543:y; if(ce<1900||ce>2100) return '';
  return `${ce}-${String(mi+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
/* แยกข้อความจาก OCR หน้าบัตร */
function parseIdText(raw){
  const t=String(raw||'').replace(/\r/g,''), flat=t.replace(/\s+/g,' '), low=new Set(), d={};
  const idm=flat.match(/(\d)[\s-]*(\d{4})[\s-]*(\d{5})[\s-]*(\d{2})[\s-]*(\d)/); if(idm) d.national_id=idm.slice(1).join('');
  if(!idCheck(d.national_id)) low.add('national_id');
  const nm=flat.match(/ชื่อตัวและชื่อสกุล\s*(นางสาว|นาง|นาย|ด\.ช\.|ด\.ญ\.|เด็กชาย|เด็กหญิง)?\s*([ก-๙]+)\s+([ก-๙]+)/);
  if(nm){ d.title=nm[1]||''; d.first_name=nm[2]; d.last_name=nm[3]; } else { low.add('first_name'); low.add('last_name'); }
  if(d.title==='เด็กชาย') d.title='ด.ช.'; if(d.title==='เด็กหญิง') d.title='ด.ญ.';
  const en=flat.match(/Name\s*(Mr\.|Mrs\.|Miss|Ms\.|Master)?\s*([A-Za-z\-]+)/); if(en){ d.title_en=en[1]||''; d.first_name_en=en[2]; }
  const ln=flat.match(/Last\s*name\s*([A-Za-z\-]+)/i); if(ln) d.last_name_en=ln[1];
  const bd=flat.match(/เกิดวันที่\s*([0-9]{1,2}\s*[ก-๙\.]+\s*[0-9]{4})/)||flat.match(/Date\s*of\s*Birth\s*([0-9]{1,2}\s*[A-Za-z\.]+\s*[0-9]{4})/i); if(bd) d.birth_date=thDateToISO(bd[1]);
  const iss=flat.match(/([0-9]{1,2}\s*[ก-๙\.]+\s*[0-9]{4})\s*วันออกบัตร/)||flat.match(/วันออกบัตร\s*([0-9]{1,2}\s*[ก-๙\.]+\s*[0-9]{4})/); if(iss) d.id_issue_date=thDateToISO(iss[1]);
  const ex=flat.match(/([0-9]{1,2}\s*[ก-๙\.]+\s*[0-9]{4})\s*วันบัตรหมดอายุ/)||flat.match(/วันบัตรหมดอายุ\s*([0-9]{1,2}\s*[ก-๙\.]+\s*[0-9]{4})/); if(ex) d.id_expiry_date=thDateToISO(ex[1]);
  const am=t.match(/ที่อยู่\s*([\s\S]{5,160}?)(?:\n\s*\n|วันออกบัตร|[0-9]{1,2}\s*[ก-๙\.]+\s*[0-9]{4}\s*วัน|$)/);
  if(am){ const a=am[1].replace(/\s+/g,' ').trim(); d.id_address=a;
    const g=(re)=>{ const x=a.match(re); return x?x[1].trim():''; };
    d.addr_no=g(/^([0-9][0-9\/\-]*)/); d.addr_moo=g(/(?:หมู่ที่|ม\.)\s*([0-9]+)/); d.addr_soi=g(/(?:ซอย|ซ\.)\s*([^\s]+)/); d.addr_road=g(/(?:ถนน|ถ\.)\s*([^\s]+)/);
    d.addr_subdistrict=g(/(?:ตำบล|แขวง|ต\.)\s*([ก-๙]+)/); d.addr_district=g(/(?:อำเภอ|เขต|อ\.)\s*([ก-๙]+)/); d.addr_province=g(/(?:จังหวัด|จ\.)\s*([ก-๙]+)/); }
  ['addr_no','addr_subdistrict','addr_district','addr_province'].forEach(k=>{ if(!d[k]) low.add(k); });
  if(d.last_name&&d.last_name.length<2) low.add('last_name');
  d.gender=d.title==='นาย'||d.title==='ด.ช.'?'male':d.title?'female':'';
  ['birth_date','id_expiry_date'].forEach(k=>{ if(!d[k]) low.add(k); });
  return {data:d, low};
}
const IDC_FIELDS=[['national_id','เลขบัตรประชาชน'],['title','คำนำหน้า'],['first_name','ชื่อ'],['last_name','นามสกุล'],['first_name_en','ชื่อ (อังกฤษ)'],['last_name_en','นามสกุล (อังกฤษ)'],
  ['birth_date','วันเกิด','date'],['gender','เพศ','sex'],['id_issue_date','วันออกบัตร','date'],['id_expiry_date','วันบัตรหมดอายุ','date']];
const IDC_ADDR=[['addr_no','บ้านเลขที่'],['addr_moo','หมู่'],['addr_soi','ซอย'],['addr_road','ถนน'],['addr_subdistrict','ตำบล/แขวง'],['addr_district','อำเภอ/เขต'],['addr_province','จังหวัด']];

/* กล่องเลือกวิธี (ใส่ไว้บนสุดของขั้นข้อมูลส่วนตัว) */
function idCardBox(){
  return `<div class="card col idcbox" style="gap:10px"><div class="row" style="gap:10px"><span style="font-size:24px">🪪</span><div class="grow"><b>กรอกจากบัตรประชาชน</b><div class="xs muted">ระบบเติมข้อมูลให้ แล้วตรวจก่อนใช้</div></div></div>
    <div class="idcgrid">${/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)?'':'<button type="button" class="btn" data-idc="reader">🖥️ อ่านจากเครื่องอ่านบัตร</button>'}<button type="button" class="btn" data-idc="photo">📷 ถ่ายรูป / เลือกรูปหน้าบัตร</button></div></div>`;
}
function bindIdCard(host, onUse){
  const r=$('[data-idc="reader"]',host), p=$('[data-idc="photo"]',host);
  if(r) r.onclick=()=>idcReader(onUse);
  if(p) p.onclick=()=>idcPhoto(onUse);
}
async function idcReader(onUse){
  const prog=overlay(`<div class="modal" role="dialog" aria-modal="true"><div class="row" style="gap:10px"><span class="spin" style="margin:0"></span><b id="idst">กำลังเชื่อมต่อเครื่องอ่านบัตร...</b></div></div>`,true,false);
  let st;
  try{ st=await agentCall('/status'); }
  catch(e){ prog.close(); if(e.message==='origin') return toast(`ตัวกลางไม่อนุญาตเว็บไซต์นี้ (${location.origin}) · เพิ่มในช่อง "เว็บไซต์ที่อนุญาต" ของแอป/โปรแกรม KTY Card Agent`,true); return agentHelp(e.name==='AbortError'?'timeout':'network'); }
  if(!st.readers||!st.readers.length){ prog.close(); return toast(IS_ANDROID?'ไม่พบเครื่องอ่านบัตร กรุณาเสียบเครื่องอ่านเข้ามือถือ (USB-C) แล้วลองใหม่':'ไม่พบเครื่องอ่านบัตร กรุณาเสียบเครื่องอ่าน (USB) แล้วลองใหม่',true); }
  if(st.reader_error&&/อนุญาต/.test(st.reader_error)){ prog.close(); return toast(st.reader_error,true); }
  $('#idst',prog.el).textContent='กำลังอ่านข้อมูลจากชิปบัตร...';
  try{ const r=await agentCall('/read?photo=1',20000); prog.close();
    if(!r.ok) return toast(r.error||'อ่านบัตรไม่สำเร็จ',true);
    const c=r.card; let photo=null; if(c.photo){ photo=await (await fetch('data:image/jpeg;base64,'+c.photo)).blob(); }
    delete c.photo; idcReview(c, new Set(c.check_digit_ok===false?['national_id']:[]), 'chip', photo, onUse);
  }catch(e){ prog.close(); toast('อ่านบัตรไม่สำเร็จ: '+errText(e),true); }
}
function agentHelp(why){
  const ov=overlay(IS_ANDROID?`<div class="modal" role="dialog" aria-modal="true" style="max-width:520px"><div class="row" style="gap:8px"><b class="grow" style="font-size:17px">ไม่พบแอป KTY Card Agent</b><span class="tag t-warn">ยังไม่เปิด</span></div>
    <span class="sm muted">การอ่านชิปบัตรบนมือถือต้องติดตั้งแอปตัวกลาง 1 ครั้ง (Android 8 ขึ้นไป · เครื่องอ่าน USB-C)</span>
    <div class="card col" style="gap:6px;box-shadow:none"><div class="sm">1. ดาวน์โหลด <b>KTY-Card-Agent.apk</b> แล้วเปิดติดตั้ง (อนุญาต "ติดตั้งแอปที่ไม่รู้จัก" ครั้งเดียว)</div><div class="sm">2. เปิดแอป · เสียบเครื่องอ่าน · กดอนุญาต และติ๊ก "ใช้เสมอ"</div><div class="sm">3. ในแอปกด "ไม่จำกัดการใช้แบตเตอรี่" แล้วกลับมากดอ่านบัตรอีกครั้ง</div></div>
    <div class="card col" style="gap:6px;box-shadow:none;background:var(--surface2)"><b class="sm">ติดตั้งแล้วแต่ยังเชื่อมไม่ได้?</b>
      <div class="sm">• Chrome อาจถามว่า <b>"อนุญาตให้เข้าถึงอุปกรณ์ในเครือข่ายท้องถิ่น"</b> ให้กด <b>อนุญาต</b> · ถ้าเคยกดไม่อนุญาต: แตะไอคอนหน้าที่อยู่เว็บ > สิทธิ์ > เปิด "เครือข่ายท้องถิ่น/อุปกรณ์ในเครือข่าย"</div>
      <div class="sm">• ทดสอบตัวกลาง: เปิด <a href="http://127.0.0.1:47321/status" target="_blank" rel="noopener">http://127.0.0.1:47321/status</a> ใน Chrome ต้องขึ้น "ตัวกลางทำงานอยู่"</div>
      <div class="sm">• ใช้ <b>Chrome</b> (Samsung Internet บางเวอร์ชันบล็อกการเชื่อมต่อในเครื่อง) และเปิดแอป KTY Card Agent ค้างไว้</div>
      ${why?`<div class="xs muted">สาเหตุ: ${why==='timeout'?'ตัวกลางตอบช้าเกินไป (ลองใหม่อีกครั้ง)':'เบราว์เซอร์เชื่อมต่อตัวกลางไม่ได้'}</div>`:''}</div>
    <div class="xs muted">ความปลอดภัย: แอปทำงานเฉพาะในเครื่องนี้ ตอบเฉพาะเว็บไซต์ของบริษัท อ่านบัตรเมื่อกดปุ่มเท่านั้น และไม่เก็บข้อมูลบัตร</div>
    <div class="row" style="gap:8px;justify-content:flex-end"><button class="btn" data-x>ปิด</button><a class="btn btn-p" href="${AGENT_APK}" download>ดาวน์โหลดแอป</a></div></div>`
  :`<div class="modal" role="dialog" aria-modal="true" style="max-width:520px"><div class="row" style="gap:8px"><b class="grow" style="font-size:17px">ไม่พบโปรแกรม KTY Card Agent</b><span class="tag t-warn">ยังไม่เปิด</span></div>
    <span class="sm muted">การอ่านชิปบัตรต้องใช้โปรแกรมตัวกลางบนคอมพิวเตอร์เครื่องนี้ (Windows 10/11) ติดตั้งครั้งเดียว</span>
    <div class="card col" style="gap:6px;box-shadow:none"><div class="sm">1. ดาวน์โหลด <b>KTY-Card-Agent.exe</b> แล้วเปิด (ถ้า Windows เตือน กด "ข้อมูลเพิ่มเติม" > "เรียกใช้ต่อไป")</div><div class="sm">2. เปิดหน้าต่างโปรแกรมทิ้งไว้ (ย่อได้) แล้วกดอ่านบัตรอีกครั้ง</div><div class="sm">3. ให้เปิดเองตอนเปิดเครื่อง: ดับเบิลคลิก <b>ติดตั้งให้เปิดเอง.cmd</b> ที่มากับโปรแกรม</div></div>
    <div class="xs muted">ความปลอดภัย: โปรแกรมทำงานเฉพาะในเครื่องนี้ ไม่ส่งข้อมูลออกอินเทอร์เน็ต ตอบเฉพาะเว็บไซต์ของบริษัท และอ่านบัตรเมื่อกดปุ่มเท่านั้น</div>
    <div class="row" style="gap:8px;justify-content:flex-end"><button class="btn" data-x>ปิด</button><a class="btn btn-p" href="${AGENT_EXE}" download>ดาวน์โหลดโปรแกรม</a></div></div>`);
  $('[data-x]',ov.el).onclick=ov.close;
}
function idcPhoto(onUse){
  if(!hasBridge()) return toast('ต้องติดตั้ง Bridge ก่อน จึงอ่านรูปบัตรได้',true);
  const i=document.createElement('input'); i.type='file'; i.accept='image/*'; i.setAttribute('capture','environment');
  i.onchange=async()=>{ const f=i.files[0]; if(!f) return;
    const prog=overlay(`<div class="modal" role="dialog" aria-modal="true" style="text-align:center"><b>กำลังอ่านตัวอักษรจากรูปบัตร...</b><div class="bar" style="margin:12px 0"><i style="width:60%"></i></div><span class="xs muted">ใช้ Google OCR ผ่าน Bridge ของบริษัท · รูปถูกลบทันทีหลังอ่าน</span></div>`,true,false);
    try{ const blob=await resizeImage(f,1800); const r=await bridge('ocr_idcard',{data:await blobToB64(blob)}); prog.close();
      const {data,low}=parseIdText(r.text||''); if(!data.national_id&&!data.first_name) return toast('อ่านข้อมูลจากรูปไม่ได้ ถ่ายใหม่ให้ชัด ไม่มีแสงสะท้อน และให้บัตรเต็มกรอบ',true);
      idcReview(data, low, 'ocr', null, onUse, URL.createObjectURL(blob)); }
    catch(e){ prog.close(); toast(/Drive API/.test(e.message||'')?e.message:'อ่านรูปไม่สำเร็จ: '+errText(e),true); } };
  i.click();
}
function idcReview(d, low, src, photo, onUse, imgUrl){
  const F={...d}, badge=k=>low.has(k)?'<span class="tag t-warn idb">ตรวจอีกครั้ง</span>':src==='chip'?'<span class="tag t-ok idb">ชิป</span>':'<span class="tag t-acc idb">อ่านจากรูป</span>';
  const fld=([k,l,t])=>`<label class="field ${low.has(k)?'idlow':''}"><span class="xs muted">${l} ${badge(k)}</span>${t==='sex'?`<select class="in" data-k="${k}"><option value="">-</option><option value="male" ${F[k]==='male'?'selected':''}>ชาย</option><option value="female" ${F[k]==='female'?'selected':''}>หญิง</option></select>`:`<input class="in" data-k="${k}" ${t==='date'?'type="date"':''} ${k==='national_id'?'inputmode="numeric" maxlength="13"':''} value="${esc(F[k]||'')}">`}</label>`;
  const ov=overlay(`<div class="sheet sheet-wide" role="dialog" aria-modal="true" aria-label="ตรวจข้อมูลจากบัตร"><header class="appbar stripe"><button class="ibtn" data-x aria-label="ปิด">${IC.close}</button><h1>ตรวจข้อมูลจากบัตร<small>${src==='chip'?'อ่านจากชิปบัตร':'อ่านจากรูปถ่าย'} · ช่องสีเหลืองควรตรวจอีกครั้ง</small></h1></header>
    <div class="sheet-body"><div class="idclay"><div class="col idcside" style="gap:10px">
      ${photo?`<div class="idcph"><img src="${URL.createObjectURL(photo)}" alt="รูปจากชิปบัตร"></div><label class="row sm" style="gap:8px"><input type="checkbox" id="usePh" checked> เก็บรูปจากบัตร (ใช้เป็นรูปเริ่มต้น ถ้ายังไม่มีรูปของตัวเอง)</label>`:''}
      ${imgUrl?`<img src="${imgUrl}" alt="รูปบัตรที่ถ่าย" class="idcimg">`:''}
      <div class="note ${idCheck(F.national_id)?'n-info':'n-bad'}" id="cdn">${idCheck(F.national_id)?'✓ เลขบัตรผ่านการตรวจหลักสุดท้าย':'✗ เลขบัตรไม่ผ่านการตรวจหลักสุดท้าย ตรวจทุกหลักอีกครั้ง'}</div>
      ${low.size?`<div class="note n-warn"><span class="xs">มี ${low.size} ช่องที่ควรตรวจ (สีเหลือง)</span></div>`:''}${src==='ocr'?'<button class="btn btn-sm" data-retake>ถ่ายใหม่</button>':''}</div>
      <div class="col" style="gap:10px"><div class="idfields">${IDC_FIELDS.map(fld).join('')}</div><b class="sm">ที่อยู่ตามบัตร</b><div class="idfields">${IDC_ADDR.map(fld).join('')}</div></div></div></div>
    <div class="sheet-foot" style="flex-wrap:wrap"><label class="row sm grow" style="gap:8px;min-width:220px"><input type="checkbox" id="pdpa"> พนักงานยินยอมให้บริษัทเก็บข้อมูลจากบัตรประชาชนเพื่อการจ้างงาน (PDPA)</label><button class="btn" data-x2>ยกเลิก</button><button class="btn btn-p" data-use>ใช้ข้อมูลนี้</button></div></div>`,false,false);
  const close=()=>ov.close();
  $('[data-x]',ov.el).onclick=close; $('[data-x2]',ov.el).onclick=close;
  const rt=$('[data-retake]',ov.el); if(rt) rt.onclick=()=>{ close(); idcPhoto(onUse); };
  $$('[data-k]',ov.el).forEach(i=>i.addEventListener(i.tagName==='SELECT'?'change':'input',()=>{ F[i.dataset.k]=i.value.trim(); if(i.dataset.k==='national_id'){ const ok=idCheck(F.national_id), n=$('#cdn',ov.el); n.className='note '+(ok?'n-info':'n-bad'); n.textContent=ok?'✓ เลขบัตรผ่านการตรวจหลักสุดท้าย':'✗ เลขบัตรไม่ผ่านการตรวจหลักสุดท้าย ตรวจทุกหลักอีกครั้ง'; } }));
  $('[data-use]',ov.el).onclick=()=>{ if(!$('#pdpa',ov.el).checked) return toast('ติ๊กความยินยอม (PDPA) ก่อน',true);
    if(F.national_id&&!idCheck(F.national_id)) return toast('เลขบัตรประชาชนไม่ถูกต้อง',true);
    const out={}; [...IDC_FIELDS,...IDC_ADDR].forEach(([k])=>{ if(F[k]) out[k]=F[k]; }); out.national_id=(out.national_id||'').replace(/\D/g,'')||undefined;
    if(out.title&&!['นาย','นาง','นางสาว'].includes(out.title)) delete out.title;
    if(F.id_address) out.id_address=F.id_address; out.cur_same=true;
    const usePh=photo&&$('#usePh',ov.el)?.checked?photo:null;
    close(); onUse(out, usePh); toast('เติมข้อมูลจากบัตรแล้ว ตรวจอีกครั้งก่อนบันทึก'); };
}
