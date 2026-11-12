/* =====================================================================
   ตั้งค่าระบบ (Admin Studio) — แอดมินแก้ได้ทุกอย่างโดยไม่ต้องแก้โค้ด
   ===================================================================== */
const STUDIO_SECS = [
  ['brand','🎨','แบรนด์และโลโก้','ชื่อแอป บริษัท โลโก้ สี'],
  ['labels','✏️','ข้อความและหัวข้อ','แก้ชื่อเมนูและหัวข้อทุกหน้า'],
  ['forms','📋','ตัวสร้างฟอร์ม','รายงานประจำวัน · ลากจัดลำดับ เพิ่มช่องเอง'],
  ['lists','🗂️','รายการตัวเลือก','สภาพอากาศ เครื่องจักร ประเภทช่าง'],
  ['access','🔐','สิทธิ์เมนูและหน้า','บทบาทไหนเห็นเมนูไหน'],
  ['rules','📷','กติการายงาน','จำนวนรูปขั้นต่ำ'],
  ['holidays','📅','วันหยุดบริษัท','ประเภท ตัวย่อ ปฏิทินวันหยุด'],
  ['payroll','💰','กติกาเงินเดือน','การลา ประกันสังคม การผ่อน'],
  ['wa','✅','ประเภทการขออนุมัติ','ตรวจเหล็ก เทคอนกรีต รายการตรวจ ช่องลงนาม'],
  ['adv','⚙️','ตั้งค่าขั้นสูง','สถานะ สี ตัวย่อเลขที่ ข้อความเอกสาร ไทล์หน้าหลัก']
];
async function saveSetting(key, value){
  const {error}=await sb.from('app_settings').upsert({key,value,updated_at:new Date().toISOString()});
  if(error) throw new Error(/row-level/.test(error.message)?'ไม่มีสิทธิ์: ต้องรันไฟล์ 11b และ 12 และต้องเป็นแอดมิน':errText(error));
  S.settings[key]=value; if(key==='brand'){ S.brand=value; applyBrand(); }
}
function pageStudio(sec){
  if(!isAdmin()) return setPage(head('ตั้งค่าระบบ')+'<div class="card empty"><b>เฉพาะแอดมิน</b></div>');
  const cur=STUDIO_SECS.find(s=>s[0]===sec)?sec:null, wide=matchMedia('(min-width:900px)').matches, isForm=cur==='forms', show=cur||(wide?'brand':null);
  setPage(head(cur?STUDIO_SECS.find(s=>s[0]===cur)[2]:'ตั้งค่าระบบ', cur?'ตั้งค่าระบบ':'แอดมินเท่านั้น',{back:cur&&!wide?'#studio':null}) +
    `<div class="studio ${isForm?'studio-wide':''}">${(wide&&!isForm)||!cur?`<nav class="studio-nav card card-l">${STUDIO_SECS.map(([k,e,t,d])=>`<a href="#studio/${k}" class="li ${show===k?'on':''}" style="text-decoration:none"><span class="se">${e}</span><div class="grow"><b>${t}</b><span class="xs muted">${d}</span></div>${IC.chev}</a>`).join('')}
      <a href="#manage" class="li" style="text-decoration:none"><span class="se">⚙️</span><div class="grow"><b>จัดการข้อมูลอื่น</b><span class="xs muted">ผู้ใช้ สิทธิ์รายระบบ ไซต์ ตำแหน่ง วัสดุ</span></div>${IC.chev}</a></nav>`:''}
      ${show?'<section class="studio-body col" id="sb" style="gap:14px"></section>':''}</div>`);
  if(show) ({brand:stBrand,labels:stLabels,forms:stForms,lists:stLists,access:stAccess,rules:stRules,holidays:stHolidays,payroll:stPayroll,wa:stWa,adv:stAdv})[show]($('#sb'));
}

/* ---------------- แบรนด์ ---------------- */
function stBrand(host){
  const b={...BR()}; const COLORS=['#F2B705','#1F6FEB','#16A34A','#DC2626','#7C3AED','#0F766E','#EA580C','#334155'];
  const draw=()=>{ host.innerHTML=`<div class="card col" style="gap:14px">
    <div class="row" style="gap:14px;align-items:center"><div id="lgprev">${b.logo?`<div class="mark mark-img" style="width:84px;height:84px"><img src="${esc(b.logo)}" alt=""></div>`:`<div class="mark" style="width:84px;height:84px;font-size:24px"><span>${esc(b.mark)}</span></div>`}</div>
      <div class="col" style="gap:6px"><label class="btn btn-sm">อัปโหลดโลโก้<input type="file" accept="image/*" hidden data-logo></label>${b.logo?'<button class="btn btn-sm btn-bad" data-nologo>ใช้ตัวอักษรแทนโลโก้</button>':''}<span class="xs muted">PNG พื้นใส แนะนำสี่เหลี่ยมจัตุรัส · ใช้ในเมนู หน้าเข้าสู่ระบบ ใบเบิก สลิป และไอคอนแอป</span></div></div>
    <div class="g2"><div class="field"><label>ชื่อแอป</label><input class="in" data-k="app" value="${esc(b.app)}"></div><div class="field"><label>ตัวอักษรบนโลโก้ (เมื่อไม่มีรูป)</label><input class="in" data-k="mark" maxlength="4" value="${esc(b.mark)}"></div></div>
    <div class="field"><label>คำอธิบายใต้ชื่อแอป (หน้าเข้าสู่ระบบ)</label><input class="in" data-k="tagline" value="${esc(b.tagline)}"></div>
    <div class="field"><label>ชื่อบริษัท (ไทย เต็ม) — ใช้ในเอกสาร PDF ใบเบิก สลิป</label><input class="in" data-k="company_th" value="${esc(b.company_th)}"></div>
    <div class="g2"><div class="field"><label>ชื่อบริษัท (ย่อ) — ใช้ในเมนู</label><input class="in" data-k="company_short" value="${esc(b.company_short)}"></div><div class="field"><label>ชื่อบริษัท (อังกฤษ)</label><input class="in" data-k="company_en" value="${esc(b.company_en)}"></div></div>
    <div class="field"><label>สีหลัก</label><div class="row" style="gap:8px;flex-wrap:wrap">${COLORS.map(c=>`<button class="swatch ${b.color.toLowerCase()===c.toLowerCase()?'on':''}" data-c="${c}" style="background:${c}" aria-label="สี ${c}"></button>`).join('')}<input class="in" data-k="color" value="${esc(b.color)}" style="width:110px;height:40px" aria-label="รหัสสี"></div></div>
    <div class="note n-info">${IC.info}<span>ไอคอนบนหน้าจอโฮมมือถือ: หลังเปลี่ยนโลโก้ ให้ลบแอปออกจากหน้าจอแล้วเพิ่มใหม่ (iPhone อาจจำไอคอนเดิมไว้ระยะหนึ่ง)</span></div>
    <button class="btn btn-p" data-save style="align-self:flex-start">บันทึกแบรนด์</button></div>
    <div class="card col" style="gap:10px"><b class="sm">ตัวอย่าง</b><div class="brand-prev"><div class="brand">${b.logo?`<div class="mark mark-img"><img src="${esc(b.logo)}" alt=""></div>`:`<div class="mark"><span>${esc(b.mark)}</span></div>`}<div><b>${esc(b.app)}</b><div class="xs muted">${esc(b.company_short)}</div></div></div><button class="btn btn-sm" style="background:${esc(b.color)};border-color:${esc(b.color)};color:#111">ปุ่มหลัก</button></div></div>`;
    const prev=()=>{ const pv=$('.brand-prev',host); if(pv) pv.outerHTML=`<div class="brand-prev"><div class="brand">${b.logo?`<div class="mark mark-img"><img src="${esc(b.logo)}" alt=""></div>`:`<div class="mark"><span>${esc(b.mark)}</span></div>`}<div><b>${esc(b.app)}</b><div class="xs muted">${esc(b.company_short)}</div></div></div><button class="btn btn-sm" style="background:${esc(b.color)};border-color:${esc(b.color)};color:#111">ปุ่มหลัก</button></div>`; };
    $$('[data-k]',host).forEach(i=>i.oninput=()=>{ b[i.dataset.k]=i.value; prev(); });
    $$('[data-c]',host).forEach(x=>x.onclick=()=>{ b.color=x.dataset.c; $$('[data-c]',host).forEach(y=>y.classList.toggle('on',y===x)); $('[data-k="color"]',host).value=b.color; prev(); });
    const nl=$('[data-nologo]',host); if(nl) nl.onclick=()=>{ b.logo=''; draw(); };
    $('[data-logo]',host).onchange=async e=>{ const f=e.target.files[0]; if(!f) return;
      try{ toast('กำลังอัปโหลดโลโก้...'); const blob=await logoPng(f); const path=`logo-${Date.now()}.png`;
        const {error}=await sb.storage.from('brand').upload(path,blob,{contentType:'image/png',cacheControl:'31536000'}); if(error) throw error;
        b.logo=sb.storage.from('brand').getPublicUrl(path).data.publicUrl; draw(); toast('อัปโหลดแล้ว กดบันทึกแบรนด์เพื่อใช้งาน'); }
      catch(err){ toast(/bucket|not found/i.test(err.message||'')?'ยังไม่ได้รันไฟล์ 12_studio.sql':errText(err),true); } };
    $('[data-save]',host).onclick=async ev=>{ busy(ev.target,true); try{ await saveSetting('brand',b); toast('บันทึกแบรนด์แล้ว'); route(); }catch(e){ busy(ev.target,false); toast(e.message,true); } };
  };
  draw();
}
async function logoPng(file){ // ย่อเป็น PNG ไม่เกิน 512px คงพื้นใส
  const img=await new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=URL.createObjectURL(file); });
  const k=Math.min(1,512/Math.max(img.width,img.height)), c=document.createElement('canvas'); c.width=Math.round(img.width*k); c.height=Math.round(img.height*k);
  c.getContext('2d').drawImage(img,0,0,c.width,c.height); return await new Promise(r=>c.toBlob(r,'image/png'));
}

/* ---------------- ข้อความและหัวข้อ ---------------- */
const LABEL_GROUPS = {
  'เมนูและระบบ': () => Object.values(MOD).map(m=>m.t).concat(['ภาพรวม','ระบบงาน','ตั้งค่า','งานของฉัน','ของฉัน','งานที่รอ','เช็คชื่อแบบติ๊ก','ตารางรายเดือน','คนงานหน้างาน','เช็คชื่อหน้าไซต์งาน','ขอเบิกวัสดุ','ขอยืมอุปกรณ์','รายงานปัญหาหน้างาน','จัดการ']),
  'หัวข้อหน้า': () => ['รายงานประจำวัน','ขอเบิกวัสดุ','เอกสารคลัง','สต็อกวัสดุ','บันทึกเอกสารคลัง','ขอยืมอุปกรณ์','อุปกรณ์อยู่ที่ไหน','ใบยืมอุปกรณ์','พนักงาน','จัดการ','ตั้งค่าระบบ','คนงานหน้างาน']
};
function stLabels(host){
  const L={...(S.settings.labels||{})}; let grp=Object.keys(LABEL_GROUPS)[0], q='';
  const draw=()=>{ const keys=[...new Set(LABEL_GROUPS[grp]())].filter(k=>!q||k.includes(q)||(L[k]||'').includes(q)); const n=Object.values(L).filter(Boolean).length;
    host.innerHTML=`<div class="card col" style="gap:12px"><div class="row" style="gap:8px;flex-wrap:wrap"><div class="chips grow">${Object.keys(LABEL_GROUPS).map(g=>`<button class="chip ${g===grp?'on':''}" data-g="${g}">${g}</button>`).join('')}</div><input class="in" id="lq" placeholder="ค้นหาข้อความ" value="${esc(q)}" style="width:200px;height:40px"></div>
      <div class="lbl-grid"><span class="xs muted">ค่าเดิม</span><span class="xs muted">ข้อความใหม่ (ว่าง = ใช้ค่าเดิม)</span>${keys.map(k=>`<span class="sm">${esc(k)}</span><input class="in ${L[k]?'chg':''}" data-l="${esc(k)}" value="${esc(L[k]||'')}" placeholder="${esc(k)}">`).join('')}</div>
      <div class="row" style="gap:8px"><span class="xs muted grow">แก้แล้ว ${n} ข้อความ · มีผลกับเมนู ไทล์หน้าหลัก และหัวข้อหน้า</span><button class="btn btn-sm" data-reset>ล้างทั้งหมด</button><button class="btn btn-p btn-sm" data-save>บันทึก</button></div></div>`;
    $$('[data-g]',host).forEach(b=>b.onclick=()=>{ grp=b.dataset.g; draw(); });
    const lq=$('#lq'); lq.oninput=e=>{ q=e.target.value.trim(); const p=lq.selectionStart; draw(); const x=$('#lq'); x.focus(); x.setSelectionRange(p,p); };
    $$('[data-l]',host).forEach(i=>i.oninput=()=>{ const v=i.value.trim(); if(v) L[i.dataset.l]=v; else delete L[i.dataset.l]; i.classList.toggle('chg',!!v); });
    $('[data-reset]',host).onclick=async()=>{ if(!await confirmBox('ล้างข้อความที่แก้ทั้งหมด กลับไปใช้ค่าเดิม?','ล้าง',true)) return; Object.keys(L).forEach(k=>delete L[k]); draw(); };
    $('[data-save]',host).onclick=async ev=>{ busy(ev.target,true); try{ await saveSetting('labels',L); toast('บันทึกข้อความแล้ว'); route(); }catch(e){ busy(ev.target,false); toast(e.message,true); } };
  };
  draw();
}

/* ---------------- รายการตัวเลือก ---------------- */
const LIST_DEFS = [
  ['weather','สภาพอากาศ','daily_lists'],['machinery','เครื่องจักร','daily_lists'],['tools','เครื่องมือ','daily_lists'],
  ['no_work_reasons','เหตุผลที่ไม่มีการทำงาน','daily_lists'],['issue_cats','หมวดแจ้งปัญหา','daily_lists'],['wa_elements','ชิ้นส่วนโครงสร้าง (ขออนุมัติงาน)','daily_lists'],['site_trades','ประเภทช่าง (คนงานหน้างาน)','site_trades']
];
function stLists(host){
  let cur=LIST_DEFS[0][0];
  const get=k=>{ const d=LIST_DEFS.find(x=>x[0]===k); if(d[2]==='site_trades') return [...(S.settings.site_trades||[])]; const v=(S.settings.daily_lists||DL())[k]; return [...(v&&v.length?v:(k==='issue_cats'&&typeof ISS_CATS_DEF!=='undefined'?ISS_CATS_DEF:k==='wa_elements'&&typeof WA_ELEMENTS_DEF!=='undefined'?WA_ELEMENTS_DEF:[]))]; };
  let items=get(cur);
  const draw=()=>{ host.innerHTML=`<div class="card col" style="gap:12px"><div class="chips">${LIST_DEFS.map(([k,t])=>`<button class="chip ${k===cur?'on':''}" data-t="${k}">${t}</button>`).join('')}</div>
    <div class="card card-l" style="box-shadow:none">${items.map((v,i)=>`<div class="li" style="gap:6px"><span class="muted" style="width:22px;text-align:right">${i+1}</span><input class="in grow" data-e="${i}" value="${esc(v)}" style="height:40px"><button class="ibtn" data-u="${i}" ${i?'':'disabled'} aria-label="ขึ้น">${svg('<path d="M6 15l6-6 6 6"/>')}</button><button class="ibtn" data-d="${i}" ${i<items.length-1?'':'disabled'} aria-label="ลง">${svg('<path d="M6 9l6 6 6-6"/>')}</button><button class="ibtn" data-x="${i}" aria-label="ลบ">${IC.close}</button></div>`).join('')||'<div class="empty"><b>ยังไม่มีตัวเลือก</b></div>'}</div>
    <div class="row" style="gap:8px"><input class="in grow" id="ln" placeholder="เพิ่มตัวเลือกใหม่"><button class="btn" data-add>เพิ่ม</button></div>
    <span class="xs muted">รายงานเก่าที่เคยเลือกค่าที่ถูกลบหรือเปลี่ยนชื่อ ยังแสดงค่าเดิมได้ตามปกติ</span>
    <button class="btn btn-p" data-save style="align-self:flex-start">บันทึกรายการ</button></div>`;
    const mv=(i,j)=>{ const [x]=items.splice(i,1); items.splice(j,0,x); draw(); };
    $$('[data-t]',host).forEach(b=>b.onclick=()=>{ cur=b.dataset.t; items=get(cur); draw(); });
    $$('[data-e]',host).forEach(i=>i.oninput=()=>{ items[+i.dataset.e]=i.value; });
    $$('[data-u]',host).forEach(b=>b.onclick=()=>mv(+b.dataset.u,+b.dataset.u-1));
    $$('[data-d]',host).forEach(b=>b.onclick=()=>mv(+b.dataset.d,+b.dataset.d+1));
    $$('[data-x]',host).forEach(b=>b.onclick=()=>{ items.splice(+b.dataset.x,1); draw(); });
    const add=()=>{ const v=$('#ln').value.trim(); if(!v) return; if(items.includes(v)) return toast('มีตัวเลือกนี้แล้ว',true); items.push(v); draw(); $('#ln').focus(); };
    $('[data-add]',host).onclick=add; $('#ln').onkeydown=e=>{ if(e.key==='Enter') add(); };
    $('[data-save]',host).onclick=async ev=>{ const clean=[...new Set(items.map(x=>String(x).trim()).filter(Boolean))]; busy(ev.target,true);
      try{ const d=LIST_DEFS.find(x=>x[0]===cur); if(d[2]==='site_trades') await saveSetting('site_trades',clean); else await saveSetting('daily_lists',{...(S.settings.daily_lists||DL()),[cur]:clean}); items=clean; toast('บันทึกรายการแล้ว'); draw(); }
      catch(e){ busy(ev.target,false); toast(e.message,true); } };
  };
  draw();
}

/* ---------------- สิทธิ์เมนู ---------------- */
function stAccess(host){
  const A=JSON.parse(JSON.stringify(S.settings.menu_access||{})); const ROLES=[['executive','ผู้บริหาร'],['foreman','โฟร์แมน'],['employee','พนักงาน']];
  const mods=ACCESS_MODS.filter(m=>MOD[m]);
  const draw=()=>{ host.innerHTML=`<div class="card col" style="gap:12px"><div class="note n-info">${IC.info}<span>ปิดเมนู = บทบาทนั้นไม่เห็นเมนู ไทล์ และเข้าหน้านั้นไม่ได้ · แอดมินเห็นทุกอย่างเสมอ · สิทธิ์ละเอียด (ผู้ขอ / ผู้อนุมัติ / สโตร์) ตั้งที่ จัดการ > สิทธิ์รายระบบ</span></div>
    <div style="overflow-x:auto"><table class="tbl acc"><thead><tr><th>เมนู</th>${ROLES.map(r=>`<th style="text-align:center">${r[1]}</th>`).join('')}</tr></thead><tbody>
    ${mods.map(m=>`<tr><td><div class="row" style="gap:10px">${modIcon(m,30)}<b>${esc(T(MOD[m].t))}</b></div></td>${ROLES.map(([r])=>{ const on=A[m]?.[r]!=='hide'; return `<td style="text-align:center"><button class="sw ${on?'on':''}" data-m="${m}" data-r="${r}" role="switch" aria-checked="${on}" aria-label="${esc(MOD[m].t)} ${r}"></button></td>`; }).join('')}</tr>`).join('')}</tbody></table></div>
    <button class="btn btn-p" data-save style="align-self:flex-start">บันทึกสิทธิ์เมนู</button></div>`;
    $$('[data-m]',host).forEach(b=>b.onclick=()=>{ const {m,r}=b.dataset; A[m]=A[m]||{}; A[m][r]=A[m][r]==='hide'?'show':'hide'; draw(); });
    $('[data-save]',host).onclick=async ev=>{ busy(ev.target,true); try{ await saveSetting('menu_access',A); toast('บันทึกสิทธิ์เมนูแล้ว มีผลเมื่อผู้ใช้เปิดแอปใหม่'); draw(); }catch(e){ busy(ev.target,false); toast(e.message,true); } };
  };
  draw();
}

/* ---------------- กติการายงาน ---------------- */
function stRules(host){
  const r={min_photos:3,...(S.settings.daily_rules||{})};
  host.innerHTML=`<div class="card col" style="gap:12px"><b>รายงานประจำวัน</b>
    <div class="field"><label for="rm">จำนวนรูปขั้นต่ำที่ต้องแนบต่อวัน (0 = ไม่บังคับ)</label><div class="row" style="gap:8px"><button class="btn btn-sm" data-m="-1" style="width:44px;padding:0">−</button><input class="in num" id="rm" type="number" min="0" max="30" value="${r.min_photos}" style="width:90px;text-align:center"><button class="btn btn-sm" data-m="1" style="width:44px;padding:0">+</button><span class="sm muted">รูป · สูงสุด 30</span></div><span class="hint">วันที่ "ไม่มีการทำงาน" ไม่บังคับรูป</span></div>
    <button class="btn btn-p btn-sm" data-save style="align-self:flex-start">บันทึก</button></div>`;
  const inp=$('#rm'); $$('[data-m]',host).forEach(b=>b.onclick=()=>{ inp.value=Math.max(0,Math.min(30,(+inp.value||0)+ +b.dataset.m)); });
  $('[data-save]',host).onclick=async ev=>{ busy(ev.target,true); try{ await saveSetting('daily_rules',{...r,min_photos:Math.max(0,Math.min(30,Math.round(+inp.value||0)))}); toast('บันทึกแล้ว'); stRules(host); }catch(e){ busy(ev.target,false); toast(e.message,true); } };
}
