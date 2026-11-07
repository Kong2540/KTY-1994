/* =====================================================================
   ยืม-คืนอุปกรณ์ (ใช้ทะเบียน/คลัง/เอกสารร่วมกับระบบเบิก)
   ===================================================================== */
const isBrwApprover = () => isManager() || hasMod('borrow',['approver']);
const canBrw = () => isManager() || hasMod('borrow') || hasMod('materials',['store','admin']);
const brwOut = d => ['partial','issued','received','review'].includes(d.status);
let brwTab = null;

async function pageBrw(a, b){
  if(a==='new') return brwCart();
  if(a==='d') return matDoc(+b);
  if(a==='where') return brwWhere();
  setPage(head('ยืม-คืนอุปกรณ์', siteLabel(), {dActions:`<a href="#brw/where" class="btn">อุปกรณ์อยู่ที่ไหน</a>${hasMod('borrow')||isManager()?'<a href="#brw/new" class="btn btn-p">+ ขอยืมอุปกรณ์</a>':''}`}) + `<div id="bb"><div class="loading"><div class="spin"></div></div></div>`);
  if(!await loadMat()) { $('#bb').outerHTML=needMat(); return; }
  const tabs=[];
  if(isBrwApprover()) tabs.push(['approve','รออนุมัติ']);
  if(isBrwApprover()||isMatRole(['store','admin'])) tabs.push(['issue','รอส่งของ']);
  tabs.push(['out','ยืมอยู่'],['mine',isManager()?'ทั้งหมด':'ใบยืมของฉัน']);
  if(!brwTab||!tabs.some(t=>t[0]===brwTab)) brwTab=tabs[0][0];
  const ids=S.site?[+S.site]:mySiteIds();
  const base=()=>sb.from('docs').select('*').eq('doc_type','BRW');
  const q={ approve:()=>base().or('status.eq.pending,ext_due.not.is.null').order('need_date'), issue:()=>base().in('status',['approved','partial']).order('need_date'),
    out:()=>{ let x=base().in('status',['partial','issued','received','review']).order('due_date'); if(!isManager()&&!isBrwApprover()) x=x.in('site_id',ids.length?ids:[0]); return x; },
    mine:()=>{ let x=base().order('created_at',{ascending:false}).limit(60); if(!isManager()) x=x.eq('requester',S.profile.id); return x; } };
  const res=await Promise.all(tabs.map(([k])=>q[k]()));
  if(res[0].error){ $('#bb').outerHTML=/due_date|returns/.test(res[0].error.message)?`<div class="card empty"><b>ยังไม่ได้อัปเดตฐานข้อมูล</b>รันไฟล์ 09_borrow.sql ใน Supabase</div>`:`<div class="note n-bad">${esc(errText(res[0].error))}</div>`; return; }
  const today=localISO();
  const row=d=>{ const st=d.status==='received'||d.status==='issued'?(d.due_date<today?['เกินกำหนด','t-bad']:d.due_date===today?['ครบกำหนดวันนี้','t-warn']:['ยืมอยู่','t-acc']):d.status==='returned'?['คืนแล้ว','t-ok']:(DOC_ST[d.status]||[d.status,'']);
    return `<a href="#brw/d/${d.id}" class="li" style="text-decoration:none">${modIcon('borrow',40)}<div class="grow"><b style="font-size:14.5px">${esc(d.doc_no)}</b><span class="xs muted">${esc(S.sites.find(s=>s.id===d.site_id)?.name||'')} · ${esc(d.requester_name||'')} · ${d.need_date?thaiDate(d.need_date):''} – ${d.due_date?thaiDate(d.due_date):''}</span>${d.ext_due?`<span class="xs" style="color:var(--warn)">ขอขยายถึง ${thaiDate(d.ext_due)}</span>`:''}</div><span class="tag ${st[1]}">${st[0]}</span>${IC.chev}</a>`; };
  const data=res[tabs.findIndex(t=>t[0]===brwTab)].data||[];
  $('#bb').outerHTML=`<div class="col" style="gap:12px;max-width:820px">
    ${hasMod('borrow')||isManager()?'<a href="#brw/new" class="btn btn-p hide-desk" style="min-height:52px">+ ขอยืมอุปกรณ์</a>':''}
    <div class="chips scroll" style="margin:0 -16px">${tabs.map(([k,t],i)=>`<button class="chip ${brwTab===k?'on':''}" data-bt="${k}">${t} ${(res[i].data||[]).length?`<b>${res[i].data.length}</b>`:''}</button>`).join('')}</div>
    ${data.length?`<div class="card card-l">${data.map(row).join('')}</div>`:'<div class="card empty"><b>ไม่มีรายการ</b></div>'}
    <a href="#brw/where" class="btn hide-desk">อุปกรณ์อยู่ที่ไหน</a></div>`;
  $$('[data-bt]').forEach(b=>b.onclick=()=>{ brwTab=b.dataset.bt; pageBrw(); });
}

/* ---------------- ตะกร้าขอยืม ---------------- */
const BCART = { site:null, items:{}, from:null, due:null, purpose:'' };
async function brwCart(){
  setPage(head('ขอยืมอุปกรณ์','เลือกอุปกรณ์และระยะเวลา',{back:'#brw'}) + `<div id="bc"><div class="loading"><div class="spin"></div></div></div>`);
  if(!await loadMat()) { $('#bc').outerHTML=needMat(); return; }
  const ids=mySiteIds(); const sites=S.sites.filter(s=>ids.includes(s.id)&&s.status==='active');
  if(!sites.length){ $('#bc').outerHTML=`<div class="card empty"><b>ยังไม่มีไซต์ที่รับผิดชอบ</b></div>`; return; }
  if(!BCART.site||!sites.some(s=>s.id===BCART.site)) Object.assign(BCART,{site:S.site?+S.site:sites[0].id,items:{}});
  BCART.from=BCART.from||localISO(); BCART.due=BCART.due||addDays(localISO(),4);
  const [ts,ob]=await Promise.all([sb.rpc('tool_status'), sb.rpc('open_borrows')]);
  const central=centralLoc()?.id, avail={}, where={};
  (ts.data||[]).forEach(x=>{ if(x.location_id===central) avail[x.material_id]=+x.qty; });
  (ob.data||[]).forEach(x=>{ (where[x.material_id]=where[x.material_id]||[]).push(x); });
  const tools=MAT.items.filter(m=>m.item_type==='tool'&&m.status==='active');
  let q='';
  const H=$('#bc'); H.outerHTML='<div id="bc" class="col" style="gap:12px;max-width:820px"></div>'; const host=$('#bc');
  function draw(){
    const list=tools.filter(m=>!q||(m.name+m.id).toLowerCase().includes(q)); const cnt=Object.keys(BCART.items).length;
    const days=Math.max(1,Math.round((new Date(BCART.due)-new Date(BCART.from))/86400000)+1);
    host.innerHTML=`<div class="field"><label for="b_site">ไซต์</label><select class="in" id="b_site">${sites.map(s=>`<option value="${s.id}" ${s.id===BCART.site?'selected':''}>${esc(s.name)}</option>`).join('')}</select></div>
      <div class="g2"><div class="field"><label for="b_from">วันที่ต้องการ</label><input class="in" type="date" id="b_from" min="${localISO()}" value="${BCART.from}"></div><div class="field"><label for="b_due">กำหนดคืน</label><input class="in" type="date" id="b_due" min="${BCART.from}" value="${BCART.due}"><span class="hint">ยืม ${days} วัน</span></div></div>
      <input class="in" id="b_q" placeholder="ค้นหาอุปกรณ์" value="${esc(q)}">
      <div class="card card-l">${list.map(m=>{ const n=BCART.items[m.id]||0, a=avail[m.id]||0, w=where[m.id]||[];
        const sub=a>0?`ว่าง ${fmtN(a)} ${esc(m.unit)} ที่คลังกลาง`:`ไม่ว่าง${w[0]?` · อยู่ที่ ${esc(S.sites.find(s=>s.id===w[0].site_id)?.name||'')} ถึง ${thaiDate(w[0].due_date)}`:''}`;
        return `<div class="li"><div class="av" style="width:42px;height:42px">${svg(MOD.borrow.i)}</div><div class="grow"><b style="font-size:14.5px">${esc(m.name)}</b><span class="xs" style="color:${a>0?'var(--ink2)':'var(--warn)'}">${sub}</span></div>
          ${n?`<button class="btn btn-sm" data-d="${m.id}" style="width:36px;padding:0" aria-label="ลด">−</button><b class="num" style="width:32px;text-align:center">${fmtN(n)}</b>`:''}<button class="btn btn-sm ${n?'btn-p':''}" data-i="${m.id}" ${a>n?'':'disabled'} style="width:36px;padding:0" aria-label="เพิ่ม">+</button></div>`; }).join('')||'<div class="empty"><b>ยังไม่มีอุปกรณ์ในทะเบียน</b>ตั้งประเภทวัสดุเป็น "อุปกรณ์" ที่ จัดการ > วัสดุ</div>'}</div>
      <div class="field"><label for="b_p">ใช้สำหรับงาน</label><input class="in" id="b_p" value="${esc(BCART.purpose)}" placeholder="เช่น บดอัดทรายรองพื้น"></div>
      <div class="savebar"><div class="grow"><span class="xs muted">ตะกร้ายืม</span><br><b>${cnt?Object.entries(BCART.items).map(([id,n])=>`${esc(matById(id).name)} ${fmtN(n)}`).join(' · '):'ยังไม่ได้เลือก'}</b></div><button class="btn btn-p" data-go ${cnt?'':'disabled'}>ส่งขอยืม</button></div>`;
    $('#b_site').onchange=e=>{ BCART.site=+e.target.value; };
    $('#b_from').onchange=e=>{ BCART.from=e.target.value||localISO(); if(BCART.due<BCART.from) BCART.due=BCART.from; draw(); };
    $('#b_due').onchange=e=>{ BCART.due=e.target.value||BCART.from; draw(); };
    $('#b_p').oninput=e=>{ BCART.purpose=e.target.value; };
    const bq=$('#b_q'); bq.oninput=e=>{ q=e.target.value.trim().toLowerCase(); const p=bq.selectionStart; draw(); const n=$('#b_q'); n.focus(); n.setSelectionRange(p,p); };
    $$('[data-i]',host).forEach(b=>b.onclick=()=>{ BCART.items[b.dataset.i]=(BCART.items[b.dataset.i]||0)+1; draw(); });
    $$('[data-d]',host).forEach(b=>b.onclick=()=>{ const v=(BCART.items[b.dataset.d]||0)-1; if(v>0) BCART.items[b.dataset.d]=v; else delete BCART.items[b.dataset.d]; draw(); });
    const go=$('[data-go]',host); if(go) go.onclick=async ev=>{
      if(!BCART.purpose.trim()) return toast('ระบุว่าใช้สำหรับงานอะไร',true);
      busy(ev.target,true,'กำลังส่ง...');
      const {data,error}=await sb.rpc('create_brw',{p_site:BCART.site,p_from:BCART.from,p_due:BCART.due,p_purpose:BCART.purpose.trim(),p_lines:Object.entries(BCART.items).map(([material_id,qty])=>({material_id,qty}))});
      if(error){ busy(ev.target,false); return toast(errText(error),true); }
      Object.assign(BCART,{items:{},purpose:'',from:null,due:null}); toast(`ส่งขอยืมแล้ว ${data.doc_no}`);
      location.hash='#brw/d/'+data.id; setTimeout(()=>shareDocImage(data.id),400);
    };
  }
  draw();
}

/* ---------------- อุปกรณ์อยู่ที่ไหน ---------------- */
let whereView='tool';
async function brwWhere(){
  setPage(head('อุปกรณ์อยู่ที่ไหน','',{back:'#brw'}) + `<div id="bw"><div class="loading"><div class="spin"></div></div></div>`);
  if(!await loadMat()) { $('#bw').outerHTML=needMat(); return; }
  const [ts,ob]=await Promise.all([sb.rpc('tool_status'), sb.rpc('open_borrows')]);
  if(ts.error){ $('#bw').outerHTML=`<div class="card empty"><b>ยังไม่ได้อัปเดตฐานข้อมูล</b>รันไฟล์ 09_borrow.sql</div>`; return; }
  const st=ts.data||[], open=ob.data||[], loc=id=>MAT.locs.find(l=>l.id===id)||{};
  const tools=MAT.items.filter(m=>m.item_type==='tool');
  const total=st.reduce((a,x)=>a+(+x.qty),0), over=open.filter(x=>x.overdue_days>0);
  const lineFor=(m)=>{ const rows=st.filter(x=>x.material_id===m.id); const sum=rows.reduce((a,x)=>a+(+x.qty),0); if(!sum) return '';
    return `<div class="li" style="flex-direction:column;align-items:stretch;gap:6px"><div class="row"><b class="grow" style="font-size:14.5px">${esc(m.name)}</b><span class="sm muted">รวม ${fmtN(sum)} ${esc(m.unit)}</span></div>
      <div class="chips" style="gap:6px">${rows.map(x=>{ const l=loc(x.location_id); return `<span class="tag ${l.type==='central'?'t-ok':l.type==='repair'?'t-warn':'t-acc'}" style="height:24px">${l.type==='central'?'ว่าง':l.type==='repair'?'ส่งซ่อม':esc(l.name.replace('คลังไซต์ ',''))} ${fmtN(x.qty)}</span>`; }).join('')}</div>
      ${open.filter(o=>o.material_id===m.id).map(o=>`<a href="#brw/d/${o.doc_id}" class="xs" style="color:${o.overdue_days>0?'var(--bad)':'var(--ink2)'}">${esc(o.doc_no)} · ${esc(o.requester_name||'')} · คืน ${thaiDate(o.due_date)}${o.overdue_days>0?` (เกิน ${o.overdue_days} วัน)`:''}</a>`).join('')}</div>`; };
  const bySite=()=>{ const g={}; open.forEach(o=>(g[o.site_id]=g[o.site_id]||[]).push(o)); return Object.entries(g).map(([sid,arr])=>`<div class="card col" style="gap:6px"><b>${esc(S.sites.find(s=>s.id==sid)?.name||'')}</b>${arr.map(o=>`<a href="#brw/d/${o.doc_id}" class="row sm" style="text-decoration:none;color:inherit"><span class="grow">${esc(matById(o.material_id).name)} ${fmtN(o.qty_out)} ${esc(matById(o.material_id).unit)}</span><span class="tag ${o.overdue_days>0?'t-bad':''}">คืน ${thaiDate(o.due_date)}</span></a>`).join('')}</div>`).join('')||'<div class="card empty"><b>ไม่มีอุปกรณ์ที่ยืมอยู่</b></div>'; };
  $('#bw').outerHTML=`<div class="col" style="gap:12px;max-width:820px"><div class="statg"><div class="stat"><b>${fmtN(total)}</b><span class="sm muted">อุปกรณ์ทั้งหมด (ชิ้น)</span></div><div class="stat"><b style="${over.length?'color:var(--bad)':''}">${over.length}</b><span class="sm muted">ค้างคืนเกินกำหนด</span></div></div>
    <div class="seg"><button class="${whereView==='tool'?'on':''}" data-wv="tool">ตามอุปกรณ์</button><button class="${whereView==='site'?'on':''}" data-wv="site">ตามไซต์</button><button class="${whereView==='over'?'on':''}" data-wv="over">ค้างคืน</button></div>
    ${whereView==='tool'?`<div class="card card-l">${tools.map(lineFor).join('')||'<div class="empty"><b>ยังไม่มีอุปกรณ์ในคลัง</b></div>'}</div>`
      :whereView==='site'?bySite()
      :(over.length?`<div class="card card-l">${over.map(o=>`<a href="#brw/d/${o.doc_id}" class="li" style="text-decoration:none">${modIcon('borrow',40)}<div class="grow"><b>${esc(matById(o.material_id).name)} ${fmtN(o.qty_out)}</b><span class="xs muted">${esc(S.sites.find(s=>s.id===o.site_id)?.name||'')} · ${esc(o.requester_name||'')}</span></div><span class="tag t-bad">เกิน ${o.overdue_days} วัน</span>${IC.chev}</a>`).join('')}</div>`:'<div class="card empty"><b>ไม่มีรายการค้างคืน</b>เรียบร้อยดี</div>')}</div>`;
  $$('[data-wv]').forEach(b=>b.onclick=()=>{ whereView=b.dataset.wv; brwWhere(); });
}

/* ---------------- คืนอุปกรณ์ ---------------- */
function returnSheet(doc, lines, done){
  const out=lines.map(x=>({...x, out:x.qty_received-x.qty_returned-x.qty_damaged-x.qty_lost})).filter(x=>x.out>0);
  const photos=[];
  const m=overlay(`<div class="sheet" role="dialog" aria-modal="true" aria-label="คืนอุปกรณ์"><header class="appbar stripe"><button class="ibtn" data-x aria-label="ปิด">${IC.close}</button><h1>คืนอุปกรณ์<small>${esc(doc.doc_no)}</small></h1></header>
    <div class="sheet-body">${out.map(x=>{ const mm=matById(x.material_id); return `<div class="card col" style="gap:10px"><div class="row"><div class="grow"><b>${esc(mm.name)}</b><div class="xs muted">ยืมอยู่ ${fmtN(x.out)} ${esc(mm.unit)}</div></div></div>
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px"><div class="field"><label>คืนปกติ</label><input class="in num" type="number" min="0" step="any" value="${x.out}" data-ok="${x.id}"></div><div class="field"><label style="color:var(--warn)">ชำรุด</label><input class="in num" type="number" min="0" step="any" value="0" data-dm="${x.id}"></div><div class="field"><label style="color:var(--bad)">สูญหาย</label><input class="in num" type="number" min="0" step="any" value="0" data-ls="${x.id}"></div></div></div>`; }).join('')||'<div class="card empty"><b>ไม่มีอุปกรณ์ค้างคืน</b></div>'}
      <span class="hint">คืนบางส่วนได้ ชิ้นที่ชำรุดจะย้ายไปคลัง "ส่งซ่อม"</span>
      <div class="field"><label for="rt_note">หมายเหตุ (ถ้าชำรุด/สูญหายต้องระบุ)</label><input class="in" id="rt_note"></div>
      <div class="field"><label>รูปถ่าย</label><div class="pgrid" id="rtph"></div></div>
      <div class="field"><label>ลายเซ็นผู้คืน *</label><div id="rtsig"></div><span class="hint">${esc(S.profile.display_name)} · ${new Date().toLocaleString('th-TH',{dateStyle:'medium',timeStyle:'short'})}</span></div></div>
    <div class="sheet-foot"><button class="btn" data-x2>ยกเลิก</button><button class="btn btn-p" data-go ${out.length?'':'disabled'}>ยืนยันคืน</button></div></div>`, false, false);
  const pad=signaturePad($('#rtsig',m.el));
  const drawPh=()=>{ $('#rtph',m.el).innerHTML=photos.map((p,i)=>`<div class="pthumb"><img src="${p.url}" alt=""><button type="button" data-dp="${i}" aria-label="ลบรูป">×</button></div>`).join('')+(photos.length<6&&hasBridge()?`<label class="pthumb padd">${IC.camera}<span class="xs">เพิ่มรูป</span><input type="file" accept="image/*" multiple hidden data-ph></label>`:'');
    $$('[data-dp]',m.el).forEach(b=>b.onclick=()=>{ photos.splice(+b.dataset.dp,1); drawPh(); });
    const ph=$('[data-ph]',m.el); if(ph) ph.onchange=async()=>{ for(const f of [...ph.files].slice(0,6-photos.length)){ const bl=await resizeImage(f,1600); photos.push({blob:bl,url:URL.createObjectURL(bl)}); } drawPh(); }; };
  drawPh();
  $('[data-x]',m.el).onclick=m.close; $('[data-x2]',m.el).onclick=m.close;
  $('[data-go]',m.el).onclick=async ev=>{
    const rows=out.map(x=>({line_id:x.id, ok:Number($(`[data-ok="${x.id}"]`,m.el).value)||0, damaged:Number($(`[data-dm="${x.id}"]`,m.el).value)||0, lost:Number($(`[data-ls="${x.id}"]`,m.el).value)||0}));
    const bad=rows.find((r,i)=>r.ok+r.damaged+r.lost>out[i].out); if(bad) return toast('จำนวนคืนเกินที่ยืมอยู่',true);
    const note=$('#rt_note',m.el).value.trim(); if(rows.some(r=>r.damaged+r.lost>0)&&!note) return toast('ระบุหมายเหตุของที่ชำรุด/สูญหาย',true);
    if(pad.empty()) return toast('ลงลายเซ็นผู้คืนก่อน',true);
    busy(ev.target,true,'กำลังบันทึก...');
    try{
      const up=[]; for(const p of photos){ const r=await bridge('upload_photo',{site_id:doc.site_id,date:localISO(),name:`${doc.doc_no}_RTN_${up.length+1}.jpg`,data:await blobToB64(p.blob)}); up.push({id:r.id,url:r.url,thumb:r.thumb}); }
      const {data,error}=await sb.rpc('return_brw',{p_doc:doc.id,p_lines:rows,p_signature:pad.data(),p_photos:up,p_note:note||null}); if(error) throw error;
      m.close(); toast(data==='returned'?'คืนครบแล้ว ปิดใบยืม':'บันทึกการคืนบางส่วนแล้ว'); done();
    }catch(e){ busy(ev.target,false); toast(errText(e),true); }
  };
}
