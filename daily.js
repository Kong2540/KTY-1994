/* =====================================================================
   รายงานประจำวัน (รอบเย็น)
   ===================================================================== */
let dailyDate = localISO();
const DL = () => S.settings.daily_lists || { weather:['แจ่มใส','ร้อนจัด','ฝนตกเล็กน้อย','ฝนตกหนัก'], machinery:[], tools:[], no_work_reasons:['ฝนตกหนัก','วันหยุด','อื่น ๆ'] };
const canWriteDaily = () => isManager() || S.profile.role==='foreman' || hasMod('daily',['writer']);
const lineTag = r => r.line_status==='sent'?'<span class="tag t-ok">ส่ง LINE แล้ว</span>':r.line_status==='shared'?'<span class="tag t-ok">แชร์ LINE แล้ว</span>':r.line_status==='failed'?'<span class="tag t-bad">ส่ง LINE ไม่สำเร็จ</span>':'<span class="tag">ยังไม่ส่ง LINE</span>';
const blobToB64 = b => new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(String(r.result).split(',')[1]); r.onerror=rej; r.readAsDataURL(b); });
const thumbOf = p => p.thumb || `https://drive.google.com/thumbnail?id=${p.id}&sz=w400`;
const dayLongFull = iso => { const p=parseISO(iso); const dt=new Date(p.y,p.m-1,p.d); return `วัน${TH_DAYS[dt.getDay()]} ที่ ${p.d} ${TH_MONTHS[p.m-1]} พ.ศ. ${p.y+543}`; };
const MIN_PHOTOS = 3;
const hasBridge = () => !!String(S.settings.bridge_url||'').trim();

function dailyText(r, site){
  const p=parseISO(r.report_date);
  const crew=Object.entries(r.crew||{}).filter(([,n])=>n>0).map(([k,n])=>`${k} ${n}`).join(', ');
  const work=String(r.work_items||'').split('\n').filter(Boolean).map(w=>'• '+w.replace(/^[-•]\s*/,'')).join('\n');
  return [`📋 รายงานประจำวัน`, `${site?.code?site.code+' ':''}${site?.name||''}`, `${p.d} ${TH_MONTHS[p.m-1]} ${p.y+543}${r.late?' (ส่งย้อนหลัง)':''}`,
    `อากาศ: ${r.weather||'-'}`, r.no_work?`ไม่มีการทำงาน: ${r.no_work_reason||'-'}`:`คนงาน ${r.total} คน: ${crew}`, r.no_work?'':`งานที่ทำ:\n${work}`,
    (r.machinery||[]).length?`เครื่องจักร: ${r.machinery.join(', ')}`:'', r.problems?`ปัญหา: ${r.problems}`:'',
    r.pdf_url?`PDF: ${r.pdf_url}`:'', r.photo_folder_url?`รูป ${(r.photos||[]).length} รูป: ${r.photo_folder_url}`:'', `ผู้รายงาน: ${r.submitted_name||S.profile.display_name}`].filter(Boolean).join('\n');
}

/* ---------------- รายการ ---------------- */
async function pageDaily(arg, arg2){
  if(arg==='r') return dailyView(+arg2);
  if(arg==='new') return dailyForm({});
  const mgr=isManager();
  if(mgr){
    const nextDis=dailyDate>=localISO();
    setPage(head('รายงานประจำวัน',`${dayLong(dailyDate)} · ${esc(siteLabel())}`,{lead:`<button class="ibtn" data-dn="-1" aria-label="วันก่อนหน้า">${IC.back}</button>`, mActions:`<button class="ibtn" data-dn="1" aria-label="วันถัดไป" ${nextDis?'disabled style="opacity:.35"':''}>${IC.chev}</button>`,
      dActions:`<button class="btn btn-sm" data-dn="-1">‹</button><input class="in" type="date" id="dPick" value="${dailyDate}" max="${localISO()}" style="width:auto"><button class="btn btn-sm" data-dn="1" ${nextDis?'disabled':''}>›</button>`}) + `<div id="db"><div class="loading"><div class="spin"></div></div></div>`);
    $$('[data-dn]').forEach(b=>b.onclick=()=>{ if(b.disabled) return; const d=addDays(dailyDate,+b.dataset.dn); if(d<=localISO()){ dailyDate=d; pageDaily(); } });
    const pk=$('#dPick'); if(pk) pk.onchange=()=>{ if(pk.value){ dailyDate=pk.value>localISO()?localISO():pk.value; pageDaily(); } };
    const ids=S.site?[+S.site]:mySiteIds();
    const [dr,sr]=await Promise.all([ sb.from('daily_reports').select('*').eq('report_date',dailyDate).in('site_id',ids.length?ids:[0]), sb.from('site_reports').select('site_id,total').eq('report_date',dailyDate).in('site_id',ids.length?ids:[0]) ]);
    if(dr.error){ $('#db').outerHTML=/daily_reports/.test(dr.error.message)?`<div class="card empty"><b>ยังไม่ได้อัปเดตฐานข้อมูล</b>รันไฟล์ 06_daily.sql ใน Supabase</div>`:`<div class="note n-bad">${esc(errText(dr.error))}</div>`; return; }
    const rep={}; (dr.data||[]).forEach(r=>rep[r.site_id]=r); const mor={}; (sr.data||[]).forEach(r=>mor[r.site_id]=r);
    const sites=S.sites.filter(s=>ids.includes(s.id));
    $('#db').outerHTML=`<div class="col" style="gap:12px;max-width:820px">
      <div class="statg" style="grid-template-columns:repeat(3,minmax(0,1fr))"><div class="stat"><b>${Object.keys(rep).length}<small class="muted" style="font-size:15px">/${sites.length}</small></b><span class="sm muted">ส่งรายงานแล้ว</span></div><div class="stat"><b>${Object.values(rep).reduce((a,r)=>a+r.total,0)}</b><span class="sm muted">คนงานรวม (เย็น)</span></div><div class="stat"><b>${Object.values(rep).filter(r=>r.problems).length}</b><span class="sm muted">มีปัญหาหน้างาน</span></div></div>
      ${sites.length?`<div class="card card-l">${sites.map(s=>{ const r=rep[s.id];
        return r?`<a href="#daily/r/${r.id}" class="li" style="text-decoration:none">${modIcon('daily',40)}<div class="grow"><b>${esc(s.name)}</b><span class="xs muted">${esc(r.submitted_name||'')} · ${new Date(r.updated_at).toTimeString().slice(0,5)} · ${r.no_work?'ไม่มีการทำงาน':r.total+' คน'} · ${(r.photos||[]).length} รูป</span><div class="row" style="gap:6px;margin-top:4px;flex-wrap:wrap">${lineTag(r)}${r.late?'<span class="tag t-warn">ส่งย้อนหลัง</span>':''}${r.problems?'<span class="tag t-bad">มีปัญหา</span>':''}</div></div>${IC.chev}</a>`
          :`<button class="li" data-new="${s.id}">${modIcon('daily',40)}<div class="grow"><b>${esc(s.name)}</b><span class="xs muted">${mor[s.id]?`คนงานเช้า ${mor[s.id].total} คน`:'ยังไม่ส่งคนงานเช้า'}</span></div><span class="tag t-warn">ยังไม่ส่ง</span>${IC.chev}</button>`; }).join('')}</div>`:`<div class="card empty"><b>ไม่มีไซต์ที่เปิดอยู่</b></div>`}
      <span class="xs muted">แตะไซต์ที่ยังไม่ส่งเพื่อเขียนรายงานแทนโฟร์แมนได้</span></div>`;
    $$('[data-new]').forEach(b=>b.onclick=()=>dailyForm({site_id:+b.dataset.new, date:dailyDate}));
    return;
  }
  // โฟร์แมน / ผู้มีสิทธิ์
  const today=localISO(), ids=S.site?[+S.site]:(S.mySites||[]);
  setPage(head('รายงานประจำวัน',dayLong(today),{dActions:canWriteDaily()?`<button class="btn btn-p" data-back>เขียนรายงานย้อนหลัง</button>`:''}) + `<div id="db"><div class="loading"><div class="spin"></div></div></div>`);
  const [dr,sr,hist]=await Promise.all([ sb.from('daily_reports').select('*').eq('report_date',today).in('site_id',ids.length?ids:[0]), sb.from('site_reports').select('site_id,total,updated_at').eq('report_date',today).in('site_id',ids.length?ids:[0]),
    sb.from('daily_reports').select('id,site_id,report_date,total,no_work,pdf_url,line_status,late,photos').in('site_id',ids.length?ids:[0]).lt('report_date',today).order('report_date',{ascending:false}).limit(30) ]);
  if(dr.error){ $('#db').outerHTML=`<div class="note n-bad">${esc(errText(dr.error))}</div>`; return; }
  const rep={}; (dr.data||[]).forEach(r=>rep[r.site_id]=r); const mor={}; (sr.data||[]).forEach(r=>mor[r.site_id]=r);
  const sites=S.sites.filter(s=>ids.includes(s.id)&&s.status==='active');
  $('#db').outerHTML=`<div class="col" style="gap:14px;max-width:760px">
    ${sites.length?sites.map(s=>{ const r=rep[s.id], m=mor[s.id];
      return `<div class="card col" style="gap:12px"><div class="row"><div class="grow"><b style="font-size:16px">${esc(s.name)}</b><div class="xs muted">${esc(s.code||'')}</div></div></div>
        <div class="timeline"><div class="row"><span class="dot ${m?'done':'now'}">${m?svg('<path d="M5 12l5 5 9-10"/>','style="width:14px;height:14px;stroke-width:3"'):''}</span><div class="grow"><b>คนงานรอบเช้า</b><div class="sm muted">${m?`ส่งแล้ว ${m.total} คน · ${new Date(m.updated_at).toTimeString().slice(0,5)}`:'ยังไม่ส่ง'}</div></div><a href="#report" class="btn btn-sm" onclick="repSite=${s.id}">${m?'แก้ไข':'ส่ง'}</a></div>
          <div class="row"><span class="dot ${r?'done':'now'}">${r?svg('<path d="M5 12l5 5 9-10"/>','style="width:14px;height:14px;stroke-width:3"'):''}</span><div class="grow"><b>รายงานเย็น</b><div class="sm muted">${r?`ส่งแล้ว ${new Date(r.updated_at).toTimeString().slice(0,5)} · ${r.no_work?'ไม่มีการทำงาน':r.total+' คน'}`:'ส่งก่อนเลิกงาน'}</div>${r?`<div style="margin-top:4px">${lineTag(r)}</div>`:''}</div>${r?`<a href="#daily/r/${r.id}" class="btn btn-sm">ดู</a>`:`<button class="btn btn-sm btn-p" data-new="${s.id}">เขียน</button>`}</div></div></div>`; }).join(''):`<div class="card empty"><b>ยังไม่ได้กำหนดไซต์ที่รับผิดชอบ</b>ติดต่อแอดมิน</div>`}
    ${canWriteDaily()?`<button class="btn" data-back>เขียนรายงานย้อนหลัง</button>`:''}
    ${(hist.data||[]).length?`<h3 class="h2">รายงานก่อนหน้า</h3><div class="card card-l">${hist.data.map(r=>`<a href="#daily/r/${r.id}" class="li" style="text-decoration:none"><div class="grow"><b>${dayLong(r.report_date)}</b><span class="xs muted">${esc(S.sites.find(s=>s.id===r.site_id)?.name||'')} · ${r.no_work?'ไม่มีการทำงาน':r.total+' คน'} · ${(r.photos||[]).length} รูป</span></div>${r.pdf_url?'<span class="tag">PDF</span>':''}${IC.chev}</a>`).join('')}</div>`:''}</div>`;
  $$('[data-new]').forEach(b=>b.onclick=()=>dailyForm({site_id:+b.dataset.new, date:today}));
  $$('[data-back]').forEach(b=>b.onclick=()=>dailyForm({date:addDays(today,-1)}));
}

/* ---------------- ฟอร์ม ---------------- */
async function dailyForm(o){
  const ids=isManager()?mySiteIds():(S.mySites||[]);
  const siteList=S.sites.filter(s=>ids.includes(s.id)&&(s.status==='active'||s.id===o.site_id));
  if(!siteList.length) return toast('ยังไม่มีไซต์ที่รับผิดชอบ',true);
  const F={ site_id:o.site_id||(S.site?+S.site:siteList[0].id), date:o.date||localISO(), weather:null, no_work:false, no_work_reason:null, work_items:'', machinery:[], tools:[], problems:'', crew:{}, crew_morning:null, changes:{}, photos:[], newPhotos:[], existing:null, morning:null };
  const m=overlay(`<div class="sheet" role="dialog" aria-modal="true" aria-label="รายงานประจำวัน"></div>`, false, false);
  const sh=$('.sheet',m.el);
  async function load(){
    sh.innerHTML='<div class="loading"><div class="spin"></div></div>';
    const [ex,mo]=await Promise.all([ sb.from('daily_reports').select('*').eq('site_id',F.site_id).eq('report_date',F.date).maybeSingle(), sb.from('site_reports').select('counts,total').eq('site_id',F.site_id).eq('report_date',F.date).maybeSingle() ]);
    F.existing=ex.data||null; F.morning=mo.data?.counts||null; F.newPhotos=[];
    const e=F.existing;
    if(e){ Object.assign(F,{weather:e.weather,no_work:e.no_work,no_work_reason:e.no_work_reason,work_items:e.work_items||'',machinery:e.machinery||[],tools:e.tools||[],problems:e.problems||'',crew:{...(e.crew||{})},crew_morning:e.crew_morning,photos:[...(e.photos||[])]});
      F.changes={}; (e.crew_changes||[]).forEach(c=>F.changes[c.trade]={period:c.period,reason:c.reason}); }
    else Object.assign(F,{weather:null,no_work:false,no_work_reason:null,work_items:'',machinery:[],tools:[],problems:'',crew:{},crew_morning:null,changes:{},photos:[]});
    draw();
  }
  const trades=()=>[...new Set([...(S.settings.site_trades||[]),...Object.keys(F.crew),...Object.keys(F.crew_morning||{})])];
  const changed=()=>F.crew_morning?trades().filter(t=>(+F.crew[t]||0)!==(+F.crew_morning[t]||0)):[];
  function chips(list,sel,key,multi=true){ const extra=multi?(sel||[]).filter(x=>!list.includes(x)):(sel&&!list.includes(sel)?[sel]:[]); return [...list,...extra].map(v=>`<button type="button" class="chip ${(multi?sel.includes(v):sel===v)?'on':''}" data-ck="${key}" data-v="${esc(v)}">${esc(v)}</button>`).join(''); }
  function draw(){
    const y=$('.sheet-body',sh)?.scrollTop||0; const L=DL(), e=F.existing, site=S.sites.find(s=>s.id===F.site_id);
    const total=Object.values(F.crew).reduce((a,b)=>a+(+b||0),0);
    sh.innerHTML=`<header class="appbar stripe"><button class="ibtn" data-x aria-label="ปิด">${IC.close}</button><h1>${e?'แก้ไขรายงานประจำวัน':'รายงานประจำวัน'}<small>${esc(site?.name||'')} · ${dayLong(F.date)}</small></h1></header>
      <div class="sheet-body">
        ${e?`<div class="note n-warn">${IC.info}<span>มีรายงานของวันนี้แล้ว การบันทึกจะสร้างแท็บฉบับแก้ไขใหม่ใน Google Sheet${e.sheet_tab?` (ต่อจาก ${esc(e.sheet_tab)})`:''}</span></div>`:''}
        <div class="g2"><div class="field"><label for="df_site">ไซต์</label><select class="in" id="df_site">${siteList.map(s=>`<option value="${s.id}" ${s.id===F.site_id?'selected':''}>${esc(s.name)}</option>`).join('')}</select></div>
          <div class="field"><label for="df_date">วันที่</label><input class="in" type="date" id="df_date" value="${F.date}" max="${localISO()}"><span class="hint ${F.date<localISO()?'warn':''}">${F.date<localISO()?'ส่งย้อนหลัง จะติดป้ายให้ผู้บริหารเห็น':''}</span></div></div>
        <div class="field"><label>สภาพอากาศ</label><div class="chips">${chips(L.weather,F.weather,'weather',false)}</div></div>
        <div class="card row" style="padding:12px 14px"><div class="grow"><b>วันนี้ไม่มีการทำงาน</b><div class="xs muted">เช่น ฝนตกหนักทั้งวัน หรือวันหยุด</div></div><button type="button" class="sw ${F.no_work?'on':''}" data-nowork role="switch" aria-checked="${F.no_work}" aria-label="วันนี้ไม่มีการทำงาน"></button></div>
        ${F.no_work?`<div class="field"><label>เหตุผล</label><div class="chips">${chips(L.no_work_reasons,F.no_work_reason,'reason',false)}</div></div>`:`
        <div class="row" style="justify-content:space-between"><div class="sec" style="margin:0">คนงานหน้างาน <span class="muted" style="font-weight:500">รวม ${total} คน</span></div><button type="button" class="btn btn-sm" data-pull ${F.morning?'':'disabled'}>${F.morning?'ดึงจากรอบเช้า':'ไม่มีข้อมูลรอบเช้า'}</button></div>
        <div class="card card-l">${trades().map(t=>{ const v=+F.crew[t]||0, mv=F.crew_morning?(+F.crew_morning[t]||0):null, ch=mv!==null&&v!==mv, c=F.changes[t]||{};
          return `<div class="li" style="flex-direction:column;align-items:stretch;gap:8px"><div class="row"><span class="grow" style="font-weight:600">${esc(t)} ${ch?`<span class="tag t-warn">${mv} → ${v}</span>`:''}</span><button type="button" class="btn btn-sm" data-dec="${esc(t)}" aria-label="ลด ${esc(t)}" style="width:42px;padding:0">−</button><b class="num" style="width:36px;text-align:center;font-size:17px;${v?'':'color:var(--ink2)'}">${v}</b><button type="button" class="btn btn-sm ${v?'btn-p':''}" data-inc="${esc(t)}" aria-label="เพิ่ม ${esc(t)}" style="width:42px;padding:0">+</button></div>
            ${ch?`<div class="g2" style="gap:8px"><div class="seg" style="padding:3px">${['เช้า','บ่าย','ทั้งวัน'].map(p=>`<button type="button" class="${(c.period||'บ่าย')===p?'on':''}" data-per="${esc(t)}" data-v="${p}" style="min-height:34px">${p}</button>`).join('')}</div><input class="in" data-why="${esc(t)}" value="${esc(c.reason||'')}" placeholder="เหตุผล เช่น ช่างรับเหมาหามาเพิ่ม" style="height:42px"></div>`:''}</div>`; }).join('')}
          <div class="li"><input class="in" id="df_trade" placeholder="เพิ่มประเภทช่างอื่น" style="height:40px"><button type="button" class="btn btn-sm" data-addtrade>เพิ่ม</button></div></div>
        <div class="field"><label for="df_work">งานที่ทำวันนี้ (บรรทัดละ 1 รายการ) *</label><textarea class="in" id="df_work" rows="5" placeholder="เทคานรั้ว&#10;เดินท่อไฟชั้น 1">${esc(F.work_items)}</textarea></div>
        <div class="field"><label>เครื่องจักร</label><div class="chips">${chips(L.machinery,F.machinery,'machinery')}<button type="button" class="chip" data-addeq="machinery">+ อื่น ๆ</button></div></div>
        <div class="field"><label>เครื่องมือ</label><div class="chips">${chips(L.tools,F.tools,'tools')}<button type="button" class="chip" data-addeq="tools">+ อื่น ๆ</button></div></div>`}
        <div class="field"><label for="df_prob">ปัญหา / อุปสรรค</label><textarea class="in" id="df_prob" rows="3" placeholder="ไม่มี เว้นว่างได้">${esc(F.problems)}</textarea></div>
        <div class="field"><label>รูปถ่าย ${F.no_work?'':'*'} <span style="color:${!F.no_work&&F.photos.length+F.newPhotos.length<MIN_PHOTOS?'var(--bad)':'var(--ink2)'}">${F.photos.length+F.newPhotos.length} / 30${F.no_work?'':` · อย่างน้อย ${MIN_PHOTOS} รูป`}</span></label>
          <div class="pgrid">${F.photos.map((p,i)=>`<div class="pthumb"><img src="${thumbOf(p)}" alt="" loading="lazy"><button type="button" data-delp="${i}" aria-label="ลบรูป">×</button></div>`).join('')}${F.newPhotos.map((p,i)=>`<div class="pthumb"><img src="${p.url}" alt=""><button type="button" data-delnp="${i}" aria-label="ลบรูป">×</button><span class="tag t-acc" style="position:absolute;left:4px;bottom:4px;height:18px;font-size:10px">ใหม่</span></div>`).join('')}
          ${F.photos.length+F.newPhotos.length<30?`<label class="pthumb padd">${IC.camera}<span class="xs">เพิ่มรูป</span><input type="file" accept="image/*" multiple data-photos hidden></label>`:''}</div>
          ${!hasBridge()?'<span class="hint warn">ยังไม่ได้ติดตั้ง Bridge รูปถ่ายและ PDF จะใช้ไม่ได้ (แจ้งแอดมิน)</span>':''}</div>
      </div>
      <div class="sheet-foot"><button class="btn" data-x2>ยกเลิก</button><button class="btn btn-p" data-go>บันทึกและดูตัวอย่าง</button></div>`;
    $('.sheet-body',sh).scrollTop=y; bind();
  }
  function keep(){ const w=$('#df_work',sh); if(w) F.work_items=w.value; const p=$('#df_prob',sh); if(p) F.problems=p.value; $$('[data-why]',sh).forEach(i=>{ F.changes[i.dataset.why]={...(F.changes[i.dataset.why]||{}),reason:i.value}; }); }
  function bind(){
    const close=async()=>{ if(await confirmBox('ปิดโดยไม่บันทึก?','ปิด',true)) m.close(); };
    $('[data-x]',sh).onclick=close; $('[data-x2]',sh).onclick=close;
    $('#df_site',sh).onchange=e=>{ F.site_id=+e.target.value; load(); };
    $('#df_date',sh).onchange=e=>{ const v=e.target.value; if(!v) return; F.date=v>localISO()?localISO():v; load(); };
    $$('[data-ck]',sh).forEach(b=>b.onclick=()=>{ keep(); const k=b.dataset.ck, v=b.dataset.v;
      if(k==='weather') F.weather=F.weather===v?null:v; else if(k==='reason') F.no_work_reason=v; else F[k]=F[k].includes(v)?F[k].filter(x=>x!==v):[...F[k],v]; draw(); });
    $$('[data-addeq]',sh).forEach(b=>b.onclick=async()=>{ keep(); const v=await promptBox(b.dataset.addeq==='machinery'?'เพิ่มเครื่องจักร':'เพิ่มเครื่องมือ',''); if(v&&!F[b.dataset.addeq].includes(v)){ F[b.dataset.addeq].push(v); draw(); } });
    const nw=$('[data-nowork]',sh); if(nw) nw.onclick=()=>{ keep(); F.no_work=!F.no_work; draw(); };
    const pl=$('[data-pull]',sh); if(pl) pl.onclick=()=>{ keep(); F.crew={...F.morning}; F.crew_morning={...F.morning}; F.changes={}; toast('ดึงจำนวนคนงานจากรอบเช้าแล้ว'); draw(); };
    $$('[data-inc]',sh).forEach(b=>b.onclick=()=>{ keep(); F.crew[b.dataset.inc]=(+F.crew[b.dataset.inc]||0)+1; draw(); });
    $$('[data-dec]',sh).forEach(b=>b.onclick=()=>{ keep(); F.crew[b.dataset.dec]=Math.max(0,(+F.crew[b.dataset.dec]||0)-1); draw(); });
    $$('[data-per]',sh).forEach(b=>b.onclick=()=>{ keep(); F.changes[b.dataset.per]={...(F.changes[b.dataset.per]||{}),period:b.dataset.v}; draw(); });
    const at=$('[data-addtrade]',sh); if(at) at.onclick=()=>{ keep(); const v=$('#df_trade',sh).value.trim(); if(v&&!(v in F.crew)){ F.crew[v]=0; draw(); } };
    $$('[data-delp]',sh).forEach(b=>b.onclick=()=>{ keep(); F.photos.splice(+b.dataset.delp,1); draw(); });
    $$('[data-delnp]',sh).forEach(b=>b.onclick=()=>{ keep(); URL.revokeObjectURL(F.newPhotos[+b.dataset.delnp].url); F.newPhotos.splice(+b.dataset.delnp,1); draw(); });
    const ph=$('[data-photos]',sh); if(ph) ph.onchange=async()=>{ keep(); const room=30-F.photos.length-F.newPhotos.length; const files=[...ph.files].slice(0,room);
      if(ph.files.length>room) toast(`เพิ่มได้อีก ${room} รูป (สูงสุด 30 รูป)`,true);
      for(const f of files){ try{ const b=await resizeImage(f,1600); F.newPhotos.push({blob:b,url:URL.createObjectURL(b),name:f.name}); }catch(_){ toast('อ่านไฟล์รูปไม่ได้บางรูป',true); } }
      draw(); };
    $('[data-go]',sh).onclick=()=>{ keep(); save(); };
  }
  async function save(){
    if(!F.weather) return toast('เลือกสภาพอากาศ',true);
    if(F.no_work&&!F.no_work_reason) return toast('เลือกเหตุผลที่ไม่มีการทำงาน',true);
    if(!F.no_work&&!F.work_items.trim()) return toast('กรอกงานที่ทำวันนี้',true);
    const ch=changed(); for(const t of ch){ if(!String(F.changes[t]?.reason||'').trim()) return toast(`ใส่เหตุผลที่ ${t} เปลี่ยนจากรอบเช้า`,true); }
    if(!F.no_work&&F.photos.length+F.newPhotos.length<MIN_PHOTOS) return toast(`ต้องแนบรูปอย่างน้อย ${MIN_PHOTOS} รูป (ตอนนี้มี ${F.photos.length+F.newPhotos.length} รูป)`,true);
    if(F.newPhotos.length&&!hasBridge()) return toast('ยังไม่ได้ติดตั้ง Bridge จึงอัปโหลดรูปไม่ได้',true);
    const crew={}; Object.entries(F.crew).forEach(([k,n])=>{ if(+n>0) crew[k]=+n; });
    const row={ site_id:F.site_id, report_date:F.date, weather:F.weather, no_work:F.no_work, no_work_reason:F.no_work?F.no_work_reason:null, work_items:F.no_work?null:F.work_items.trim(),
      machinery:F.no_work?[]:F.machinery, tools:F.no_work?[]:F.tools, problems:F.problems.trim()||null, crew:F.no_work?{}:crew, crew_morning:F.crew_morning,
      crew_changes:ch.map(t=>({trade:t,from:+F.crew_morning[t]||0,to:+F.crew[t]||0,period:F.changes[t]?.period||'บ่าย',reason:F.changes[t]?.reason||''})), photos:F.photos };
    const prog=overlay(`<div class="modal" role="dialog" aria-modal="true"><h3 class="h2" style="font-size:18px">กำลังบันทึกรายงาน</h3><div id="pg" class="col" style="gap:8px"></div></div>`,true,false);
    const step=(t,done)=>{ $('#pg',prog.el).insertAdjacentHTML('beforeend',`<div class="row sm" style="gap:8px">${done?svg('<path d="M5 12l5 5 9-10"/>','style="color:var(--ok);width:18px"'):'<span class="spin" style="width:16px;height:16px;margin:0;border-width:2px"></span>'}<span>${t}</span></div>`); };
    try{
      step('บันทึกข้อมูล');
      let rep;
      if(F.existing){ row.revision=F.existing.sheet_tab?(F.existing.revision||0)+1:(F.existing.revision||0); row.line_status='none';
        const r=await sb.from('daily_reports').update(row).eq('id',F.existing.id).select('*').single(); if(r.error) throw r.error; rep=r.data; }
      else { const r=await sb.from('daily_reports').insert(row).select('*').single(); if(r.error) throw r.error; rep=r.data; }
      if(F.newPhotos.length){
        const up=[...F.photos];
        for(let i=0;i<F.newPhotos.length;i++){ $('#pg',prog.el).lastElementChild.querySelector('span:last-child').textContent=`อัปโหลดรูป ${i+1} / ${F.newPhotos.length}`;
          const p=F.newPhotos[i]; const res=await bridge('upload_photo',{site_id:F.site_id,date:F.date,name:`${F.date}_${String(up.length+1).padStart(2,'0')}.jpg`,data:await blobToB64(p.blob)}); up.push({id:res.id,url:res.url,thumb:res.thumb,name:res.name}); }
        const r=await sb.from('daily_reports').update({photos:up}).eq('id',rep.id).select('*').single(); if(r.error) throw r.error; rep=r.data||{...rep,photos:up};
      }
      let pdf=null;
      if(hasBridge()){ step('สร้าง Google Sheet และ PDF'); pdf=await bridge('render',{report_id:rep.id}); const r=await sb.from('daily_reports').select('*').eq('id',rep.id).single(); rep={...rep,pdf_url:pdf.pdf_url,pdf_id:pdf.pdf_id,sheet_url:pdf.sheet_url,sheet_tab:pdf.sheet_tab,photo_folder_url:pdf.folder_url,...(r.data||{})}; }
      prog.close(); m.close(); toast('บันทึกรายงานแล้ว');
      dailyPreview(rep, pdf);
    }catch(err){ prog.close(); toast(errText(err),true); }
  }
  load();
}

/* ---------------- ตัวอย่าง + ส่ง LINE ---------------- */
async function dailyPreview(r, pdf){
  const site=S.sites.find(s=>s.id===r.site_id); const text=dailyText(r,site);
  const crew=Object.entries(r.crew||{}).filter(([,n])=>n>0).map(([k,n])=>`${k} ${n}`).join(', ');
  const m=overlay(`<div class="sheet" role="dialog" aria-modal="true" aria-label="ดูตัวอย่างก่อนส่ง"><header class="appbar stripe"><button class="ibtn" data-x aria-label="ปิด">${IC.close}</button><h1>ดูตัวอย่างก่อนส่ง<small>${esc(site?.name||'')} · ${dayLong(r.report_date)}</small></h1></header>
    <div class="sheet-body">
      <div class="sec">การ์ดที่จะส่งเข้ากลุ่ม LINE</div>
      <div class="lcardp"><div class="lch"><b>🏗️ รายงานการปฏิบัติงานประจำวัน</b><span>หจก.กิตติยาก่อสร้าง 1994</span></div>
        <div class="lcb"><div class="lr"><span>📍 หน้างาน</span><b>${esc((site?.code?site.code+' ':'')+(site?.name||''))}</b></div><div class="lr"><span>📅 วันที่</span><span class="v">${dayLongFull(r.report_date)}</span></div><div class="lr"><span>🌤️ อากาศ</span><span class="v">${esc(r.weather||'-')}</span></div>
          ${r.late?'<div class="llate">⏱ ส่งย้อนหลัง</div>':''}<hr>
          ${r.no_work?`<b class="ls" style="color:#C0392B">⛔ ไม่มีการทำงาน</b><p>${esc(r.no_work_reason||'-')}</p>`:`<b class="ls">🔨 งานที่ปฏิบัติ</b><p>${String(r.work_items||'').split('\n').filter(Boolean).map(w=>'- '+esc(w.replace(/^[-•]\s*/,''))).join('<br>')}</p><hr>
          <div class="lr"><b class="ls">👷 กำลังคน</b><b>รวม ${r.total} คน</b></div><p class="lm">${esc(Object.entries(r.crew||{}).filter(([,n])=>n>0).map(([k,n])=>`${k} ${n} คน`).join(' · '))}</p>
          ${(r.crew_changes||[]).map(c=>`<p class="lw">↕ ${esc(c.trade)} ${c.from} → ${c.to} (${esc(c.period)}) ${esc(c.reason||'')}</p>`).join('')}<hr>
          <b class="ls">🚜 เครื่องจักร / เครื่องมือ</b><p>${esc([...(r.machinery||[]),...(r.tools||[])].join(', ')||'-')}</p>`}<hr>
          <b class="ls" style="color:#C0392B">⚠️ ปัญหา / อุปสรรค</b><p>${esc(r.problems||'-')}</p></div>
        <div class="lcf"><div class="lr"><span>ผู้รายงาน</span><span class="v">${esc(r.submitted_name||'')}</span></div><span class="lbtn p">📄 ดาวน์โหลด PDF</span>${(r.photos||[]).length?`<span class="lbtn">🖼️ ดูรูปถ่าย ${r.photos.length} รูป</span>`:''}</div></div>
      <div class="sec">ไฟล์ PDF</div>
      ${r.pdf_url?`<div class="card row" style="gap:12px">${modIcon('daily',40)}<div class="grow"><b>${esc(pdf?.pdf_name||'รายงาน.pdf')}</b><div class="xs muted">แท็บ ${esc(r.sheet_tab||'')} ใน Google Sheet</div></div><a class="btn btn-sm" href="${esc(r.pdf_url)}" target="_blank" rel="noopener">เปิด</a></div>
        <iframe class="pdfprev" src="https://drive.google.com/file/d/${esc(r.pdf_id)}/preview" title="ตัวอย่าง PDF" loading="lazy"></iframe>`:`<div class="note n-warn">${IC.info}<span>ยังไม่มี PDF (ยังไม่ได้ติดตั้ง Bridge)</span></div>`}
      <div class="sec">ส่งเข้ากลุ่ม LINE</div>
      <label class="sendopt" id="opt_bot"><input type="radio" name="sendvia" value="bot"><span class="grow"><b>ส่งผ่าน bot</b><span class="xs muted" id="botinfo" style="display:block">กำลังตรวจโควตา...</span></span></label>
      <label class="sendopt"><input type="radio" name="sendvia" value="share"><span class="grow"><b>แชร์เข้า LINE เอง</b><span class="xs muted" style="display:block">เปิดเมนูแชร์ของมือถือพร้อมไฟล์ PDF แล้วเลือกกลุ่ม ไม่ใช้โควตาของ bot</span></span></label>
    </div>
    <div class="sheet-foot"><button class="btn" data-later>ส่งภายหลัง</button><button class="btn btn-p" data-send>ส่ง</button></div></div>`, false, false);
  const done=()=>{ m.close(); location.hash='#daily/r/'+r.id; route(); };
  $('[data-x]',m.el).onclick=done; $('[data-later]',m.el).onclick=done;
  const bot=$('#opt_bot',m.el), botIn=$('input',bot), shareIn=$('input[value=share]',m.el);
  const disableBot=reason=>{ bot.classList.add('off'); botIn.disabled=true; shareIn.checked=true; $('#botinfo',m.el).textContent=reason; };
  if(!hasBridge()) disableBot('ยังไม่ได้ติดตั้ง Bridge');
  else bridge('line_quota',{site_id:r.site_id}).then(q=>{ if(q.ok){ botIn.checked=true; $('#botinfo',m.el).textContent=q.remaining===null?`ส่งเข้ากลุ่ม (${q.members} คน)`:`โควตาเหลือ ${q.remaining} · ครั้งนี้ใช้ ${q.needed}`; } else disableBot(q.reason||'ส่งผ่าน bot ไม่ได้'); }).catch(e=>disableBot(e.message));
  $('[data-send]',m.el).onclick=async ev=>{
    const via=$('input[name=sendvia]:checked',m.el)?.value; if(!via) return toast('เลือกวิธีส่ง',true);
    if(via==='bot'){ busy(ev.target,true,'กำลังส่ง...'); try{ const res=await bridge('line_send',{report_id:r.id}); if(res.ok){ toast('ส่งเข้ากลุ่ม LINE แล้ว'); done(); return; } throw new Error(res.error||'ส่งไม่สำเร็จ'); }
      catch(e){ busy(ev.target,false); disableBot(e.message); toast(`${e.message} เลือก "แชร์เข้า LINE เอง" แทนได้`,true); } return; }
    await shareDaily(r, pdf, text); done();
  };
}
async function shareDaily(r, pdf, text){
  try{
    if(pdf?.pdf_base64 && navigator.canShare){
      const bin=Uint8Array.from(atob(pdf.pdf_base64),c=>c.charCodeAt(0)); const file=new File([bin],pdf.pdf_name||'report.pdf',{type:'application/pdf'});
      if(navigator.canShare({files:[file]})){ await navigator.share({files:[file],text,title:'รายงานประจำวัน'}); await markShared(r); return; }
    }
    if(navigator.share){ await navigator.share({text,title:'รายงานประจำวัน'}); await markShared(r); return; }
    window.open('https://line.me/R/share?text='+encodeURIComponent(text),'_blank'); await markShared(r);
  }catch(e){ if(e.name!=='AbortError') toast('แชร์ไม่สำเร็จ: '+e.message,true); }
}
async function markShared(r){ await sb.from('daily_reports').update({line_status:'shared',line_sent_at:new Date().toISOString()}).eq('id',r.id); toast('บันทึกว่าแชร์เข้า LINE แล้ว'); }

/* ---------------- ดูรายงาน ---------------- */
async function dailyView(id){
  setPage(head('รายงานประจำวัน','',{back:'#daily'}) + `<div id="dv"><div class="loading"><div class="spin"></div></div></div>`);
  const {data:r,error}=await sb.from('daily_reports').select('*').eq('id',id).single();
  if(error||!r){ $('#dv').outerHTML=`<div class="card empty"><b>ไม่พบรายงาน หรือไม่มีสิทธิ์ดู</b></div>`; return; }
  const site=S.sites.find(s=>s.id===r.site_id), mgr=isManager();
  const canEdit=mgr||(canWriteDaily()&&localISO(new Date(r.created_at))===localISO());
  const kv=(a,b)=>`<div class="kv"><span>${a}</span><span>${b||'-'}</span></div>`;
  $('#dv').outerHTML=`<div class="col" style="gap:12px;max-width:760px">
    <div class="card col" style="gap:4px"><b style="font-size:18px">${esc(site?.name||'')}</b><span class="muted">${dayLong(r.report_date)}</span><div class="row" style="gap:6px;flex-wrap:wrap;margin-top:6px">${lineTag(r)}${r.late?'<span class="tag t-warn">ส่งย้อนหลัง</span>':''}${r.revision?`<span class="tag">แก้ไขครั้งที่ ${r.revision}</span>`:''}</div></div>
    <div class="card card-l">${kv('ผู้รายงาน',esc(r.submitted_name))}${kv('อากาศ',esc(r.weather))}${kv('คนงาน',r.no_work?'ไม่มีการทำงาน':`${r.total} คน${r.crew_morning?` (เช้า ${Object.values(r.crew_morning).reduce((a,b)=>a+b,0)})`:''}`)}
      ${!r.no_work?kv('แยกประเภท',esc(Object.entries(r.crew||{}).map(([k,n])=>`${k} ${n}`).join(', '))):kv('เหตุผล',esc(r.no_work_reason))}${kv('เครื่องจักร',esc((r.machinery||[]).join(', ')))}${kv('เครื่องมือ',esc((r.tools||[]).join(', ')))}</div>
    ${(r.crew_changes||[]).length?`<div class="card col" style="gap:6px"><b class="sm">เปลี่ยนจากรอบเช้า</b>${r.crew_changes.map(c=>`<span class="sm" style="color:var(--warn)">${esc(c.trade)} ${c.from} → ${c.to} (${esc(c.period)}): ${esc(c.reason)}</span>`).join('')}</div>`:''}
    ${!r.no_work?`<div class="card"><b class="sm">งานที่ทำ</b><div style="margin-top:6px;white-space:pre-line">${esc(r.work_items||'')}</div></div>`:''}
    ${r.problems?`<div class="note n-bad"><span><b>ปัญหา / อุปสรรค</b><br>${esc(r.problems).replace(/\n/g,'<br>')}</span></div>`:''}
    ${(r.photos||[]).length?`<div class="card col" style="gap:8px"><div class="row" style="justify-content:space-between"><b class="sm">รูปถ่าย ${r.photos.length} รูป</b>${r.photo_folder_url?`<a href="${esc(r.photo_folder_url)}" target="_blank" rel="noopener" class="sm">เปิดโฟลเดอร์</a>`:''}</div><div class="pgrid">${r.photos.map(p=>`<a class="pthumb" href="${esc(p.url)}" target="_blank" rel="noopener"><img src="${thumbOf(p)}" alt="" loading="lazy"></a>`).join('')}</div></div>`:''}
    <div class="row" style="gap:8px;flex-wrap:wrap">${r.pdf_url?`<a class="btn" href="${esc(r.pdf_url)}" target="_blank" rel="noopener">${IC.history}เปิด PDF</a>`:''}${mgr&&r.sheet_url?`<a class="btn" href="${esc(r.sheet_url)}" target="_blank" rel="noopener">เปิด Google Sheet</a>`:''}<button class="btn" data-resend>ส่งเข้า LINE</button>${canEdit?'<button class="btn btn-p" data-edit>แก้ไขรายงาน</button>':''}</div>
    ${mgr?`<form class="card col" id="cm" style="gap:8px"><b class="sm">ความเห็นผู้บริหาร</b><textarea class="in" name="c" rows="2" placeholder="เขียนถึงโฟร์แมน">${esc(r.manager_comment||'')}</textarea><button class="btn btn-sm" style="align-self:flex-start">บันทึกความเห็น</button></form>`:(r.manager_comment?`<div class="card"><span class="xs muted">ความเห็นผู้บริหาร · ${esc(r.comment_by_name||'')}</span><br><b class="sm">${esc(r.manager_comment)}</b></div>`:'')}
  </div>`;
  const ed=$('[data-edit]'); if(ed) ed.onclick=()=>dailyForm({site_id:r.site_id,date:r.report_date});
  $('[data-resend]').onclick=()=>dailyPreview(r,null);
  const cm=$('#cm'); if(cm) cm.onsubmit=async ev=>{ ev.preventDefault(); const {error}=await sb.from('daily_reports').update({manager_comment:cm.c.value.trim()||null,comment_by_name:S.profile.display_name,comment_at:new Date().toISOString()}).eq('id',r.id); if(error) return toast(errText(error),true); toast('บันทึกความเห็นแล้ว'); };
}
