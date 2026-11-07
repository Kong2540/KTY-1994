/* =====================================================================
   เบิกจ่ายวัสดุ
   ===================================================================== */
const MAT = { loaded:false, cats:[], items:[], price:{}, locs:[], kits:[] };
const DOC_ST = { pending:['รออนุมัติ','t-warn'], approved:['รอจ่ายของ','t-acc'], partial:['จ่ายบางส่วน','t-acc'], issued:['รอไซต์รับ','t-acc'], received:['รับครบแล้ว','t-ok'],
  review:['รอตรวจรับ','t-bad'], rejected:['ไม่อนุมัติ','t-bad'], cancelled:['ยกเลิก',''], closed:['บันทึกแล้ว','t-ok'] };
const DOC_T = { REQ:'ใบเบิก', RCV:'รับเข้า', RTN:'คืนคลัง', TRF:'โอน', ADJ:'ปรับยอด', BRW:'ใบยืม' };
const canMoney = () => isManager() || Object.keys(MAT.price).length>0;
const isMatRole = r => isManager() || hasMod('materials', r);
const fmtN = n => Number(n||0).toLocaleString('th-TH',{maximumFractionDigits:2});
const baht = n => '฿'+Number(n||0).toLocaleString('th-TH',{minimumFractionDigits:0,maximumFractionDigits:2});
const matById = id => MAT.items.find(m=>m.id===id) || {id, name:id, unit:''};
const loadScript = src => new Promise((res,rej)=>{ if([...document.scripts].some(s=>s.src===src)) return res(); const s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=()=>rej(new Error('โหลดไลบรารีไม่สำเร็จ')); document.head.appendChild(s); });
const LIB = { h2c:'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', qr:'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js', xlsx:'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js' };

async function loadMat(force){
  if(MAT.loaded&&!force) return true;
  const [c,i,p,l,k]=await Promise.all([ sb.from('mat_categories').select('*').order('sort'),
    sb.from('materials').select('id,name,category_code,spec,unit,min_stock,item_type,status,note').order('id'),
    sb.rpc('price_list'), sb.from('stock_locations').select('*').order('id'), sb.from('kits').select('*').eq('status','active').order('name') ]);
  if(i.error){ MAT.error=i.error; return false; }
  MAT.cats=c.data||[]; MAT.items=i.data||[]; MAT.price={}; (p.data||[]).forEach(x=>MAT.price[x.id]=+x.unit_price); MAT.locs=l.data||[]; MAT.kits=k.data||[]; MAT.loaded=true; MAT.error=null;
  return true;
}
const needMat = () => `<div class="card empty"><b>ยังไม่ได้อัปเดตฐานข้อมูล</b>รันไฟล์ 08_materials.sql ใน Supabase แล้วโหลดหน้านี้ใหม่</div>`;
const locName = id => MAT.locs.find(l=>l.id===id)?.name || '-';
const centralLoc = () => MAT.locs.find(l=>l.type==='central');

/* ---------------- หน้าหลักของระบบ ---------------- */
let matTab = null;
async function pageMat(a, b){
  if(a==='new') return matCart();
  if(a==='d') return matDoc(+b);
  if(a==='stock') return matStock();
  if(a==='post') return matPost(b);
  setPage(head('เบิกจ่ายวัสดุ', siteLabel(), {dActions:`<a href="#mat/stock" class="btn">สต็อก</a>${isMatRole(['store','admin'])?'<a href="#mat/post" class="btn">รับเข้า / โอน / ปรับยอด</a>':''}${isMatRole()?'<a href="#mat/new" class="btn btn-p">+ ขอเบิกวัสดุ</a>':''}`}) + `<div id="mb"><div class="loading"><div class="spin"></div></div></div>`);
  if(!await loadMat()) { $('#mb').outerHTML=needMat(); return; }
  const tabs=[];
  if(isMatRole(['approver','admin'])) tabs.push(['approve','รออนุมัติ']);
  if(isMatRole(['store','admin'])) tabs.push(['issue','รอจ่าย'],['review','รอตรวจรับ']);
  tabs.push(['receive','รอรับของ'],['mine', isManager()?'ทั้งหมด':'ใบเบิกของฉัน']);
  if(!matTab||!tabs.some(t=>t[0]===matTab)) matTab=tabs[0][0];
  const ids=S.site?[+S.site]:mySiteIds();
  const q={
    approve: ()=>sb.from('docs').select('*').eq('doc_type','REQ').eq('status','pending').order('created_at'),
    issue:   ()=>sb.from('docs').select('*').eq('doc_type','REQ').in('status',['approved','partial']).order('need_date',{ascending:true,nullsFirst:false}),
    review:  ()=>sb.from('docs').select('*').eq('status','review').order('updated_at'),
    receive: ()=>sb.from('docs').select('*').eq('doc_type','REQ').in('status',['partial','issued']).in('site_id',ids.length?ids:[0]).order('updated_at',{ascending:false}),
    mine:    ()=>{ let x=sb.from('docs').select('*').order('created_at',{ascending:false}).limit(60); if(!isManager()) x=x.eq('requester',S.profile.id); else if(S.site) x=x.eq('site_id',+S.site); return x; }
  };
  const counts=await Promise.all(tabs.map(([k])=>q[k]()));
  const host=$('#mb'); host.outerHTML=`<div class="col" id="mb" style="gap:12px;max-width:820px">
    ${isMatRole()?`<a href="#mat/new" class="btn btn-p hide-desk" style="min-height:52px">+ ขอเบิกวัสดุ</a>`:''}
    <div class="chips scroll" style="margin:0 -16px">${tabs.map(([k,t],i)=>`<button class="chip ${matTab===k?'on':''}" data-mt="${k}">${t} ${(counts[i].data||[]).length?`<b>${counts[i].data.length}</b>`:''}</button>`).join('')}</div>
    <div id="mlist"></div>
    <div class="row hide-desk" style="gap:8px"><a href="#mat/stock" class="btn grow">ดูสต็อก</a>${isMatRole(['store','admin'])?'<a href="#mat/post" class="btn grow">รับเข้า / โอน</a>':''}</div></div>`;
  const data=counts[tabs.findIndex(t=>t[0]===matTab)].data||[];
  $('#mlist').innerHTML=data.length?`<div class="card card-l">${data.map(docRow).join('')}</div>`:`<div class="card empty"><b>ไม่มีรายการ</b></div>`;
  $$('[data-mt]').forEach(b=>b.onclick=()=>{ matTab=b.dataset.mt; pageMat(); });
}
function docRow(d){
  const st=DOC_ST[d.status]||[d.status,''];
  return `<a href="#mat/d/${d.id}" class="li" style="text-decoration:none">${modIcon(d.doc_type==='REQ'?'materials':'sites',40)}<div class="grow"><b style="font-size:14.5px">${esc(d.doc_no)}</b><span class="xs muted">${DOC_T[d.doc_type]} · ${esc(S.sites.find(s=>s.id===d.site_id)?.name||locName(d.to_loc))} · ${esc(d.requester_name||'')}${d.need_date?` · ใช้ ${thaiDate(d.need_date)}`:''}</span></div><span class="tag ${st[1]}">${st[0]}</span>${IC.chev}</a>`;
}

/* ---------------- ตะกร้าขอเบิก ---------------- */
let CART = { site:null, cat:'', items:{} };
async function matCart(){
  setPage(head('ขอเบิกวัสดุ','เลือกวัสดุใส่ตะกร้า',{back:'#mat'}) + `<div id="cb"><div class="loading"><div class="spin"></div></div></div>`);
  if(!await loadMat()) { $('#cb').outerHTML=needMat(); return; }
  const ids=mySiteIds(); const sites=S.sites.filter(s=>ids.includes(s.id)&&s.status==='active');
  if(!sites.length){ $('#cb').outerHTML=`<div class="card empty"><b>ยังไม่มีไซต์ที่รับผิดชอบ</b></div>`; return; }
  if(!CART.site||!sites.some(s=>s.id===CART.site)) CART={ site:S.site?+S.site:sites[0].id, cat:'', items:{} };
  let boq=[], freq=[], view='all', cat='', q='';
  const loadSite=async()=>{ const [b,f]=await Promise.all([sb.rpc('boq_status',{p_site:CART.site}), sb.rpc('frequent_materials',{p_site:CART.site})]); boq=b.data||[]; freq=(f.data||[]).map(x=>x.material_id); };
  await loadSite();
  const host=$('#cb'); host.outerHTML='<div id="cb" class="col" style="gap:12px;max-width:820px"></div>';
  const cats=()=>[...new Set(boq.map(b=>b.work_category))];
  const boqOf=id=>boq.find(b=>b.material_id===id&&(!CART.cat||b.work_category===CART.cat));
  function rowHTML(m){
    const n=CART.items[m.id]||0, bq=boqOf(m.id), left=bq?bq.budget-bq.used-n:null;
    return `<div class="li"><div class="grow"><b style="font-size:14.5px">${esc(m.name)}</b><span class="xs muted">${esc([m.id,m.spec].filter(Boolean).join(' · '))}${bq?` · <span style="color:${left<0?'var(--bad)':'inherit'}">งบเหลือ ${fmtN(left)} ${esc(m.unit)}</span>`:''}</span></div>
      ${MAT.price[m.id]!==undefined?`<span class="xs muted num" style="margin-right:4px">${baht(MAT.price[m.id])}</span>`:''}
      ${n?`<button class="btn btn-sm" data-d="${m.id}" style="width:36px;padding:0" aria-label="ลด">−</button><button class="linkbtn num" data-q="${m.id}" style="width:44px;text-align:center;font-weight:700;font-size:16px;text-decoration:none">${fmtN(n)}</button>`:''}
      <button class="btn btn-sm ${n?'btn-p':''}" data-i="${m.id}" style="width:36px;padding:0" aria-label="เพิ่ม">+</button></div>`;
  }
  function draw(){
    const site=S.sites.find(s=>s.id===CART.site), cnt=Object.keys(CART.items).length;
    const total=Object.entries(CART.items).reduce((a,[id,n])=>a+(MAT.price[id]||0)*n,0);
    const consum=MAT.items.filter(m=>m.status==='active'&&m.item_type==='consumable');
    let list=view==='kits'?null:view==='freq'?freq.map(matById).filter(m=>m.name):consum.filter(m=>(!cat||m.category_code===cat)&&(!q||(m.name+m.id+(m.spec||'')).toLowerCase().includes(q)));
    host2.innerHTML=`<div class="g2"><div class="field"><label for="c_site">ไซต์</label><select class="in" id="c_site">${sites.map(s=>`<option value="${s.id}" ${s.id===CART.site?'selected':''}>${esc(s.name)}</option>`).join('')}</select></div>
        <div class="field"><label for="c_cat">หมวดงาน (ใช้เทียบงบ BOQ)</label><input class="in" id="c_cat" list="c_cats" value="${esc(CART.cat)}" placeholder="เช่น งานพื้น"><datalist id="c_cats">${cats().map(c=>`<option value="${esc(c)}">`).join('')}</datalist></div></div>
      <div class="seg"><button class="${view==='all'?'on':''}" data-v="all">รายการทั้งหมด</button><button class="${view==='kits'?'on':''}" data-v="kits">ชุดวัสดุ</button><button class="${view==='freq'?'on':''}" data-v="freq">เบิกบ่อย</button></div>
      ${view==='all'?`<input class="in" id="c_q" placeholder="ค้นหารหัส / ชื่อวัสดุ" value="${esc(q)}"><div class="chips scroll" style="margin:0 -16px"><button class="chip ${!cat?'on':''}" data-c="">ทั้งหมด</button>${MAT.cats.filter(c=>c.code!=='TL').map(c=>`<button class="chip ${cat===c.code?'on':''}" data-c="${c.code}">${esc(c.name)}</button>`).join('')}</div>`:''}
      ${view==='kits'?(MAT.kits.length?MAT.kits.map(k=>`<div class="card col" style="gap:8px"><div class="row"><div class="grow"><b>${esc(k.name)}</b><div class="xs muted">${esc(k.work_category||'')} · ${k.items.length} รายการ</div></div><button class="btn btn-sm btn-p" data-kit="${k.id}">ใส่ตะกร้า</button></div><div class="sm muted">${k.items.map(x=>`${esc(matById(x.material_id).name)} ${fmtN(x.qty)} ${esc(matById(x.material_id).unit)}`).join(' · ')}</div></div>`).join(''):'<div class="card empty"><b>ยังไม่มีชุดวัสดุ</b>แอดมินสร้างได้ที่ จัดการ > ชุดวัสดุ</div>')
        :`<div class="card card-l">${list.length?list.slice(0,150).map(rowHTML).join(''):'<div class="empty"><b>ไม่พบวัสดุ</b></div>'}</div>`}
      ${!canMoney()?`<div class="note n-info">${IC.info}<span>แสดงงบคงเหลือเป็นจำนวน ไม่แสดงราคา</span></div>`:''}
      <div class="savebar"><div class="grow"><span class="xs muted">ตะกร้า · ${esc(site?.name||'')}</span><br><b>${cnt} รายการ</b>${canMoney()&&cnt?` <span class="num muted">· ${baht(total)}</span>`:''}</div><button class="btn btn-p" data-rev ${cnt?'':'disabled'}>ตรวจสอบและส่ง</button></div>`;
    bind();
  }
  const host2=$('#cb');
  function bind(){
    $('#c_site').onchange=async e=>{ CART.site=+e.target.value; CART.items={}; await loadSite(); draw(); };
    $('#c_cat').onchange=e=>{ CART.cat=e.target.value.trim(); draw(); };
    const cq=$('#c_q'); if(cq) cq.oninput=e=>{ q=e.target.value.trim().toLowerCase(); const pos=cq.selectionStart; draw(); const n=$('#c_q'); n.focus(); n.setSelectionRange(pos,pos); };
    $$('[data-v]',host2).forEach(b=>b.onclick=()=>{ view=b.dataset.v; draw(); });
    $$('[data-c]',host2).forEach(b=>b.onclick=()=>{ cat=b.dataset.c; draw(); });
    $$('[data-i]',host2).forEach(b=>b.onclick=()=>{ CART.items[b.dataset.i]=(CART.items[b.dataset.i]||0)+1; draw(); });
    $$('[data-d]',host2).forEach(b=>b.onclick=()=>{ const v=(CART.items[b.dataset.d]||0)-1; if(v>0) CART.items[b.dataset.d]=v; else delete CART.items[b.dataset.d]; draw(); });
    $$('[data-q]',host2).forEach(b=>b.onclick=async()=>{ const m=matById(b.dataset.q); const v=await promptBox(`จำนวน ${m.name} (${m.unit})`,String(CART.items[m.id]||'')); if(v===null) return; const n=Number(v); if(n>0) CART.items[m.id]=n; else delete CART.items[m.id]; draw(); });
    $$('[data-kit]',host2).forEach(b=>b.onclick=()=>{ const k=MAT.kits.find(x=>x.id==b.dataset.kit); k.items.forEach(x=>CART.items[x.material_id]=(CART.items[x.material_id]||0)+Number(x.qty)); if(!CART.cat&&k.work_category) CART.cat=k.work_category; toast(`ใส่ "${k.name}" ลงตะกร้าแล้ว`); draw(); });
    const rv=$('[data-rev]',host2); if(rv) rv.onclick=review;
  }
  function review(){
    const ids=Object.keys(CART.items); const site=S.sites.find(s=>s.id===CART.site);
    const over=ids.filter(id=>{ const bq=boqOf(id); return bq&&bq.budget-bq.used-CART.items[id]<0; });
    const m=overlay(`<div class="sheet" role="dialog" aria-modal="true" aria-label="ตรวจสอบใบเบิก"><header class="appbar stripe"><button class="ibtn" data-x aria-label="ปิด">${IC.close}</button><h1>ตรวจสอบใบเบิก<small>${esc(site?.name||'')} · ${ids.length} รายการ</small></h1></header>
      <div class="sheet-body"><div class="card card-l">${ids.map(id=>{ const mm=matById(id); return `<div class="li"><div class="grow"><b>${esc(mm.name)}</b><span class="xs muted">${esc(mm.spec||mm.id)}</span></div><b class="num">${fmtN(CART.items[id])}</b><span class="sm muted" style="width:44px">${esc(mm.unit)}</span></div>`; }).join('')}</div>
        ${over.length?`<div class="note n-warn">${IC.info}<span>เกินงบ BOQ: ${over.map(id=>esc(matById(id).name)).join(', ')} ผู้อนุมัติจะเห็นแจ้งเตือน</span></div>`:''}
        <div class="g2"><div class="field"><label for="r_date">ต้องการใช้วันที่</label><input class="in" type="date" id="r_date" min="${localISO()}" value="${localISO()}"></div><div class="field"><label for="r_time">เวลา / หมายเหตุสั้น</label><input class="in" id="r_time" placeholder="เช่น ก่อน 13:00 น."></div></div>
        <div class="field"><label for="r_note">หมายเหตุถึงผู้อนุมัติ</label><textarea class="in" id="r_note" rows="2"></textarea></div></div>
      <div class="sheet-foot"><button class="btn" data-x2>กลับไปแก้</button><button class="btn btn-p" data-go>ส่งขอเบิก</button></div></div>`, false, false);
    $('[data-x]',m.el).onclick=m.close; $('[data-x2]',m.el).onclick=m.close;
    $('[data-go]',m.el).onclick=async ev=>{
      busy(ev.target,true,'กำลังส่ง...');
      const {data,error}=await sb.rpc('create_req',{p_site:CART.site,p_cat:CART.cat,p_need:$('#r_date',m.el).value||null,p_need_note:$('#r_time',m.el).value.trim(),p_note:$('#r_note',m.el).value.trim(),p_lines:ids.map(id=>({material_id:id,qty:CART.items[id]}))});
      if(error){ busy(ev.target,false); return toast(errText(error),true); }
      m.close(); CART.items={}; toast(`ส่งขอเบิกแล้ว ${data.doc_no}`);
      location.hash='#mat/d/'+data.id; setTimeout(()=>shareDocImage(data.id),400);
    };
  }
  draw();
}

/* ---------------- ใบเบิก (ดู / อนุมัติ / จ่าย / รับ) ---------------- */
async function matDoc(id){
  const bk=location.hash.startsWith('#brw')?'#brw':'#mat';
  setPage(head(bk==='#brw'?'ใบยืมอุปกรณ์':'เอกสารคลัง','',{back:bk}) + `<div id="db2"><div class="loading"><div class="spin"></div></div></div>`);
  if(!await loadMat()) { $('#db2').outerHTML=needMat(); return; }
  const [d,l,v,val,rt]=await Promise.all([ sb.from('docs').select('*').eq('id',id).single(), sb.from('doc_lines').select('*').eq('doc_id',id).order('id'), sb.from('deliveries').select('*').eq('doc_id',id).order('round'), sb.rpc('doc_value',{p_doc:id}), sb.from('returns').select('*').eq('doc_id',id).order('returned_at') ]);
  if(d.error||!d.data){ $('#db2').outerHTML=`<div class="card empty"><b>ไม่พบเอกสาร หรือไม่มีสิทธิ์ดู</b></div>`; return; }
  const doc=d.data, lines=l.data||[], dlv=v.data||[], st=DOC_ST[doc.status]||[doc.status,''];
  const site=S.sites.find(s=>s.id===doc.site_id), req=['REQ','BRW'].includes(doc.doc_type), brw=doc.doc_type==='BRW', rets=rt.error?[]:(rt.data||[]);
  const canApprove=brw?isBrwApprover():isMatRole(['approver','admin']), canIssue=brw?(isBrwApprover()||isMatRole(['store','admin'])):isMatRole(['store','admin']);
  const mine=doc.requester===S.profile.id, siteUser=mine||isManager()||(S.mySites||[]).includes(doc.site_id);
  const acts=[];
  if(req&&doc.status==='pending'&&(mine||isManager())) acts.push(`<button class="btn btn-bad" data-act="cancel">ยกเลิก${brw?'ใบยืม':'ใบเบิก'}</button>`);
  if(req&&doc.status==='pending'&&canApprove) acts.push('<button class="btn btn-bad" data-act="reject">ไม่อนุมัติ</button>','<button class="btn btn-p" data-act="approve">อนุมัติ</button>');
  if(req&&['approved','partial'].includes(doc.status)&&canIssue) acts.push(`<button class="btn btn-p" data-act="issue">${brw?'ส่งอุปกรณ์':'จ่ายของ'}</button>`);
  if(brw&&brwOut(doc)&&(siteUser||canIssue)) acts.push('<button class="btn btn-p" data-act="return">คืนอุปกรณ์</button>');
  if(brw&&['approved','partial','issued','received'].includes(doc.status)&&siteUser&&!doc.ext_due) acts.push('<button class="btn" data-act="ext">ขอขยายเวลา</button>');
  if(brw&&doc.ext_due&&canApprove) acts.push('<button class="btn" data-act="extno">ไม่ขยาย</button>','<button class="btn btn-p" data-act="extok">อนุมัติขยายเวลา</button>');
  const kv=(a,b)=>`<div class="kv"><span>${a}</span><span>${b||'-'}</span></div>`;
  $('#db2').outerHTML=`<div class="col" style="gap:12px;max-width:820px">
    <div class="card col" style="gap:4px"><div class="row"><b class="grow" style="font-size:17px">${esc(doc.doc_no)}</b><span class="tag ${st[1]}">${st[0]}</span></div><span class="sm muted">${DOC_T[doc.doc_type]} · ${dayLong(localISO(new Date(doc.created_at)))}</span></div>
    <div class="card card-l">${kv('ไซต์ / คลัง',esc(site?.name||locName(doc.to_loc)))}${req&&!brw?kv('หมวดงาน',esc(doc.work_category)):''}${doc.from_loc&&!req?kv('จาก',esc(locName(doc.from_loc))):''}${kv(brw?'ผู้ขอยืม':req?'ผู้ขอเบิก':'ผู้บันทึก',esc(doc.requester_name))}
      ${brw?kv('ระยะเวลายืม',`${thaiDate(doc.need_date)} – <b style="color:${doc.due_date<localISO()&&brwOut(doc)?'var(--bad)':'inherit'}">${thaiDate(doc.due_date)}</b>`)+kv('ใช้สำหรับ',esc(doc.need_note))+(doc.ext_due?kv('ขอขยายถึง',`<span style="color:var(--warn)">${thaiDate(doc.ext_due)} · ${esc(doc.ext_reason||'')}</span>`):''):req?kv('ต้องการใช้',doc.need_date?`${thaiDate(doc.need_date)} ${esc(doc.need_note||'')}`:esc(doc.need_note)):''}${doc.supplier?kv('ผู้ขาย',esc(doc.supplier)):''}${doc.approver_name&&req?kv('ผู้อนุมัติ',`${esc(doc.approver_name)} · ${new Date(doc.approved_at).toLocaleString('th-TH',{dateStyle:'short',timeStyle:'short'})}`):''}
      ${val.data!=null?kv('มูลค่า',`<b class="num">${baht(val.data)}</b>`):''}${doc.reject_reason?kv('เหตุผลไม่อนุมัติ',`<span style="color:var(--bad)">${esc(doc.reject_reason)}</span>`):''}${doc.note?kv('หมายเหตุ',esc(doc.note).replace(/\n/g,'<br>')):''}</div>
    <div class="card" style="padding:0;overflow-x:auto"><table class="tbl"><thead><tr><th>รายการ</th><th class="num">ขอ</th>${req?`<th class="num">อนุมัติ</th><th class="num">${brw?'ส่งแล้ว':'จ่ายแล้ว'}</th><th class="num">รับแล้ว</th>${brw?'<th class="num">คืนแล้ว</th>':''}`:''}</tr></thead><tbody>
      ${lines.map(x=>{ const m=matById(x.material_id); return `<tr><td><b>${esc(m.name)}</b><div class="xs muted">${esc(m.id)} · ${esc(m.unit)}</div></td><td class="num">${fmtN(x.qty_req)}</td>${req?`<td class="num">${x.qty_approved==null?'-':fmtN(x.qty_approved)}</td><td class="num">${fmtN(x.qty_issued)}</td><td class="num">${fmtN(x.qty_received)}</td>${brw?`<td class="num">${fmtN(x.qty_returned+x.qty_damaged+x.qty_lost)}${x.qty_damaged||x.qty_lost?`<div class="xs" style="color:var(--bad)">ชำรุด ${fmtN(x.qty_damaged)} หาย ${fmtN(x.qty_lost)}</div>`:''}</td>`:''}`:''}</tr>`; }).join('')}</tbody></table></div>
    ${dlv.map(x=>`<div class="card col" style="gap:8px"><div class="row"><b class="grow">จ่ายรอบที่ ${x.round}</b><span class="tag ${x.status==='review'?'t-bad':x.status==='sent'?'t-acc':'t-ok'}">${{sent:'รอไซต์รับ',received:'รับครบ',review:'รับไม่ตรง รอตรวจ',closed:'ปิดแล้ว'}[x.status]}</span></div>
      <span class="sm muted">จ่ายโดย ${esc(x.issued_name||'')} · ${new Date(x.issued_at).toLocaleString('th-TH',{dateStyle:'short',timeStyle:'short'})}${x.received_name?` · รับโดย ${esc(x.received_name)} · ${new Date(x.received_at).toLocaleString('th-TH',{dateStyle:'short',timeStyle:'short'})}`:''}</span>
      <div class="sm">${x.lines.map(y=>{ const got=(x.received_lines||[]).find(z=>z.line_id===y.line_id); return `${esc(matById(y.material_id).name)} ${fmtN(y.qty)}${got&&+got.qty!==+y.qty?` <span style="color:var(--bad)">(รับ ${fmtN(got.qty)})</span>`:''}`; }).join(' · ')}</div>
      ${x.signature?`<img src="${x.signature}" alt="ลายเซ็นผู้รับ" style="max-width:220px;height:70px;object-fit:contain;background:#fff;border:1px solid var(--line);border-radius:8px">`:''}
      ${(x.photos||[]).length?`<div class="pgrid">${x.photos.map(p=>`<a class="pthumb" href="${esc(p.url)}" target="_blank" rel="noopener"><img src="${esc(p.thumb)}" alt="" loading="lazy"></a>`).join('')}</div>`:''}
      ${x.resolve_note?`<span class="xs muted">ผลตรวจ: ${esc(x.resolve_note)}</span>`:''}
      <div class="row" style="gap:8px">${x.status==='sent'&&siteUser?`<button class="btn btn-p" data-recv="${x.id}">ยืนยันรับของรอบนี้</button>`:''}${x.status==='review'&&isMatRole(['store','admin'])?`<button class="btn" data-res="${x.id}|resend">ส่งขาด: จ่ายใหม่</button><button class="btn btn-bad" data-res="${x.id}|writeoff">ตัดเป็นสูญหาย</button>`:''}</div></div>`).join('')}
    ${rets.map(r=>`<div class="card col" style="gap:6px"><div class="row"><b class="grow">คืนอุปกรณ์</b><span class="xs muted">${esc(r.returned_name||'')} · ${new Date(r.returned_at).toLocaleString('th-TH',{dateStyle:'short',timeStyle:'short'})}</span></div><div class="sm">${r.lines.map(y=>`${esc(matById(y.material_id).name)} ปกติ ${fmtN(y.ok)}${y.damaged?` · <span style="color:var(--warn)">ชำรุด ${fmtN(y.damaged)}</span>`:''}${y.lost?` · <span style="color:var(--bad)">หาย ${fmtN(y.lost)}</span>`:''}`).join('<br>')}</div>${r.note?`<span class="xs muted">${esc(r.note)}</span>`:''}${r.signature?`<img src="${r.signature}" alt="ลายเซ็นผู้คืน" style="max-width:220px;height:70px;object-fit:contain;background:#fff;border:1px solid var(--line);border-radius:8px">`:''}</div>`).join('')}
    <div class="row" style="gap:8px;flex-wrap:wrap">${req?`<button class="btn" data-act="share">แชร์รูป${brw?'ใบยืม':'ใบเบิก'}</button>`:''}${acts.join('')}</div></div>`;
  const reload=()=>matDoc(id);
  $$('[data-act]').forEach(b=>b.onclick=async()=>{ const a=b.dataset.act;
    if(a==='share') return shareDocImage(id);
    if(a==='return') return returnSheet(doc,lines,reload);
    if(a==='ext'){ const ov=overlay(`<div class="modal" role="dialog" aria-modal="true"><h3 class="h2" style="font-size:18px">ขอขยายเวลาคืน</h3><div class="field"><label>กำหนดคืนใหม่</label><input class="in" type="date" id="ex_d" min="${addDays(doc.due_date||localISO(),1)}" value="${addDays(doc.due_date||localISO(),3)}"></div><div class="field"><label>เหตุผล</label><input class="in" id="ex_r"></div><div class="row" style="gap:8px;justify-content:flex-end"><button class="btn" data-x>ยกเลิก</button><button class="btn btn-p" data-ok>ส่งคำขอ</button></div></div>`);
      $('[data-x]',ov.el).onclick=ov.close; $('[data-ok]',ov.el).onclick=async()=>{ const {error}=await sb.rpc('request_ext',{p_doc:id,p_due:$('#ex_d',ov.el).value,p_reason:$('#ex_r',ov.el).value.trim()||null}); if(error) return toast(errText(error),true); ov.close(); toast('ส่งคำขอขยายเวลาแล้ว'); reload(); }; return; }
    if(a==='extok'||a==='extno'){ const {error}=await sb.rpc('decide_ext',{p_doc:id,p_ok:a==='extok'}); if(error) return toast(errText(error),true); toast(a==='extok'?'ขยายกำหนดคืนแล้ว':'ไม่อนุมัติขยายเวลา'); return reload(); }
    if(a==='cancel'){ if(!await confirmBox(`ยกเลิก${brw?'ใบยืม':'ใบเบิก'}นี้?`,'ยกเลิก',true)) return; const {error}=await sb.rpc('cancel_doc',{p_doc:id}); if(error) return toast(errText(error),true); toast('ยกเลิกแล้ว'); return reload(); }
    if(a==='reject'){ const r=await promptBox('เหตุผลที่ไม่อนุมัติ',''); if(!r) return; const {error}=await sb.rpc('reject_req',{p_doc:id,p_reason:r}); if(error) return toast(errText(error),true); toast('ไม่อนุมัติแล้ว'); return reload(); }
    if(a==='approve') return qtySheet('อนุมัติใบเบิก','จำนวนที่อนุมัติ (แก้ได้)',lines.map(x=>({id:x.id,m:x.material_id,max:null,def:x.qty_req,sub:`ขอ ${fmtN(x.qty_req)}`})),'อนุมัติ',async(vals,note)=>{ const {error}=await sb.rpc('approve_req',{p_doc:id,p_lines:vals.map(x=>({line_id:x.id,qty:x.v})),p_note:note||null}); if(error) throw error; toast('อนุมัติแล้ว'); reload(); },true);
    if(a==='issue'){ const c=centralLoc(); const {data:stk}=await sb.rpc('stock_view',{p_loc:c.id}); const s={}; (stk||[]).forEach(x=>s[x.material_id]=+x.qty);
      return qtySheet(brw?'ส่งอุปกรณ์':'จ่ายของ',`จ่ายจาก ${c.name} (ค้างจ่าย / คงคลัง)`,lines.filter(x=>x.qty_approved-x.qty_issued>0).map(x=>{ const rem=x.qty_approved-x.qty_issued, have=s[x.material_id]||0; return {id:x.id,m:x.material_id,max:Math.min(rem,have),def:Math.min(rem,have),sub:`ค้างจ่าย ${fmtN(rem)} · คงคลัง ${fmtN(have)}`,warn:have<rem}; }),'ยืนยันจ่ายรอบนี้',async vals=>{ const {error}=await sb.rpc('issue_req',{p_doc:id,p_lines:vals.map(x=>({line_id:x.id,qty:x.v}))}); if(error) throw error; toast('บันทึกการจ่ายแล้ว'); reload(); }); }
  });
  $$('[data-recv]').forEach(b=>b.onclick=()=>receiveSheet(dlv.find(x=>x.id==b.dataset.recv),doc,reload));
  $$('[data-res]').forEach(b=>b.onclick=async()=>{ const [did,act]=b.dataset.res.split('|'); const note=await promptBox(act==='resend'?'หมายเหตุ (ส่งขาด จะคืนยอดเข้าคลังกลางและจ่ายใหม่ได้)':'หมายเหตุ (ตัดเป็นสูญหาย)',''); if(note===null) return;
    const {error}=await sb.rpc('resolve_delivery',{p_dlv:+did,p_action:act,p_note:note}); if(error) return toast(errText(error),true); toast('บันทึกผลตรวจแล้ว'); reload(); });
}
function qtySheet(title, sub, rows, okText, onOk, withNote){
  const m=overlay(`<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}"><header class="appbar stripe"><button class="ibtn" data-x aria-label="ปิด">${IC.close}</button><h1>${esc(title)}<small>${esc(sub)}</small></h1></header>
    <div class="sheet-body"><div class="card card-l">${rows.map(r=>{ const mm=matById(r.m); return `<div class="li"><div class="grow"><b>${esc(mm.name)}</b><span class="xs" style="color:${r.warn?'var(--warn)':'var(--ink2)'}">${esc(r.sub)}</span></div><input class="in num" type="number" inputmode="decimal" min="0" ${r.max!=null?`max="${r.max}"`:''} step="any" value="${r.def}" data-row="${r.id}" style="width:96px;text-align:right" aria-label="จำนวน ${esc(mm.name)}"><span class="sm muted" style="width:40px">${esc(mm.unit)}</span></div>`; }).join('')||'<div class="empty"><b>ไม่มีรายการที่จ่ายได้</b>สต็อกคลังกลางอาจไม่พอ</div>'}</div>
      ${withNote?'<div class="field"><label for="qs_note">หมายเหตุ</label><input class="in" id="qs_note"></div>':''}</div>
    <div class="sheet-foot"><button class="btn" data-x2>ยกเลิก</button><button class="btn btn-p" data-ok ${rows.length?'':'disabled'}>${esc(okText)}</button></div></div>`, false, false);
  $('[data-x]',m.el).onclick=m.close; $('[data-x2]',m.el).onclick=m.close;
  $('[data-ok]',m.el).onclick=async ev=>{ const vals=$$('[data-row]',m.el).map(i=>({id:+i.dataset.row,v:Number(i.value)||0}));
    const bad=vals.find((x,i)=>x.v<0||(rows[i].max!=null&&x.v>rows[i].max)); if(bad) return toast('จำนวนเกินที่จ่ายได้',true);
    busy(ev.target,true); try{ await onOk(vals,withNote?$('#qs_note',m.el).value.trim():null); m.close(); }catch(e){ busy(ev.target,false); toast(errText(e),true); } };
}
function signaturePad(host){
  host.innerHTML=`<div class="sigwrap"><canvas class="sigpad" aria-label="ช่องลงลายเซ็น"></canvas><button type="button" class="linkbtn" data-clr style="position:absolute;right:10px;top:6px">ล้าง</button><span class="xs muted sighint">เซ็นชื่อในกรอบนี้</span></div>`;
  const c=$('canvas',host), ctx=c.getContext('2d'); let draw=false, has=false;
  const fit=()=>{ const r=c.getBoundingClientRect(), dpr=window.devicePixelRatio||1; c.width=r.width*dpr; c.height=r.height*dpr; ctx.scale(dpr,dpr); ctx.lineWidth=2.4; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.strokeStyle='#14202A'; };
  setTimeout(fit,30);
  const pos=e=>{ const r=c.getBoundingClientRect(), t=e.touches?e.touches[0]:e; return [t.clientX-r.left,t.clientY-r.top]; };
  const start=e=>{ e.preventDefault(); draw=true; has=true; $('.sighint',host).style.opacity=0; const [x,y]=pos(e); ctx.beginPath(); ctx.moveTo(x,y); };
  const move=e=>{ if(!draw) return; e.preventDefault(); const [x,y]=pos(e); ctx.lineTo(x,y); ctx.stroke(); };
  c.addEventListener('pointerdown',start); c.addEventListener('pointermove',move); window.addEventListener('pointerup',()=>draw=false);
  $('[data-clr]',host).onclick=()=>{ ctx.clearRect(0,0,c.width,c.height); has=false; $('.sighint',host).style.opacity=1; };
  return { empty:()=>!has, data:()=>{ const o=document.createElement('canvas'); o.width=480; o.height=Math.round(480*c.height/c.width); const x=o.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,o.width,o.height); x.drawImage(c,0,0,o.width,o.height); return o.toDataURL('image/jpeg',.7); } };
}
function receiveSheet(dv, doc, done){
  const photos=[];
  const m=overlay(`<div class="sheet" role="dialog" aria-modal="true" aria-label="ยืนยันรับของ"><header class="appbar stripe"><button class="ibtn" data-x aria-label="ปิด">${IC.close}</button><h1>ยืนยันรับของ<small>${esc(doc.doc_no)} · รอบที่ ${dv.round}</small></h1></header>
    <div class="sheet-body"><div class="card card-l">${dv.lines.map(y=>{ const mm=matById(y.material_id); return `<div class="li"><div class="grow"><b>${esc(mm.name)}</b><span class="xs muted">ส่งมา ${fmtN(y.qty)} ${esc(mm.unit)}</span></div><input class="in num" type="number" inputmode="decimal" min="0" max="${y.qty}" step="any" value="${y.qty}" data-ln="${y.line_id}" style="width:96px;text-align:right" aria-label="จำนวนที่นับได้"><span class="sm muted" style="width:40px">${esc(mm.unit)}</span></div>`; }).join('')}</div>
      <span class="hint">นับของจริงก่อนเซ็น ถ้าจำนวนไม่ตรง ระบบจะส่งให้สโตร์/แอดมินตรวจ</span>
      <div class="field"><label>รูปถ่ายของที่ได้รับ (ไม่บังคับ)</label><div class="pgrid" id="rph"></div></div>
      <div class="field"><label>ลายเซ็นผู้รับ *</label><div id="sig"></div><span class="hint">${esc(S.profile.display_name)} · ${new Date().toLocaleString('th-TH',{dateStyle:'medium',timeStyle:'short'})}</span></div></div>
    <div class="sheet-foot"><button class="btn" data-x2>ยกเลิก</button><button class="btn btn-p" data-ok>ยืนยันรับของ</button></div></div>`, false, false);
  const pad=signaturePad($('#sig',m.el));
  const drawPh=()=>{ $('#rph',m.el).innerHTML=photos.map((p,i)=>`<div class="pthumb"><img src="${p.url}" alt=""><button type="button" data-dp="${i}" aria-label="ลบรูป">×</button></div>`).join('')+(photos.length<6&&hasBridge()?`<label class="pthumb padd">${IC.camera}<span class="xs">เพิ่มรูป</span><input type="file" accept="image/*" multiple hidden data-ph></label>`:'');
    $$('[data-dp]',m.el).forEach(b=>b.onclick=()=>{ photos.splice(+b.dataset.dp,1); drawPh(); });
    const ph=$('[data-ph]',m.el); if(ph) ph.onchange=async()=>{ for(const f of [...ph.files].slice(0,6-photos.length)){ const bl=await resizeImage(f,1600); photos.push({blob:bl,url:URL.createObjectURL(bl)}); } drawPh(); }; };
  drawPh();
  $('[data-x]',m.el).onclick=m.close; $('[data-x2]',m.el).onclick=m.close;
  $('[data-ok]',m.el).onclick=async ev=>{
    if(pad.empty()) return toast('ลงลายเซ็นผู้รับก่อน',true);
    const lines=$$('[data-ln]',m.el).map(i=>({line_id:+i.dataset.ln,qty:Number(i.value)||0}));
    busy(ev.target,true,'กำลังบันทึก...');
    try{
      const up=[]; for(const p of photos){ const r=await bridge('upload_photo',{site_id:doc.site_id,date:localISO(),name:`${doc.doc_no}_R${dv.round}_${up.length+1}.jpg`,data:await blobToB64(p.blob)}); up.push({id:r.id,url:r.url,thumb:r.thumb}); }
      const {data,error}=await sb.rpc('receive_delivery',{p_dlv:dv.id,p_lines:lines,p_signature:pad.data(),p_photos:up}); if(error) throw error;
      m.close(); toast(data==='review'?'บันทึกแล้ว จำนวนไม่ตรง ส่งให้สโตร์ตรวจ':'ยืนยันรับของแล้ว'); done();
    }catch(e){ busy(ev.target,false); toast(errText(e),true); }
  };
}

/* ---------------- สต็อก ---------------- */
let stockLoc=null;
async function matStock(){
  setPage(head('สต็อกวัสดุ','',{back:'#mat'}) + `<div id="sb2"><div class="loading"><div class="spin"></div></div></div>`);
  if(!await loadMat()) { $('#sb2').outerHTML=needMat(); return; }
  const locs=MAT.locs.filter(l=>l.type==='central'?isMatRole(['store','admin','approver']):(isManager()||isMatRole(['store','admin','approver'])||(S.mySites||[]).includes(l.site_id)));
  if(!locs.length){ $('#sb2').outerHTML=`<div class="card empty"><b>ไม่มีคลังที่คุณดูได้</b></div>`; return; }
  if(!stockLoc||!locs.some(l=>l.id===stockLoc)) stockLoc=(S.site&&locs.find(l=>l.site_id===+S.site)?.id)||locs[0].id;
  const {data,error}=await sb.rpc('stock_view',{p_loc:stockLoc});
  if(error){ $('#sb2').outerHTML=`<div class="note n-bad">${esc(errText(error))}</div>`; return; }
  const loc=MAT.locs.find(l=>l.id===stockLoc), rows=(data||[]).map(x=>({...x,m:matById(x.material_id)})).sort((a,b)=>a.m.id.localeCompare(b.m.id));
  const total=rows.reduce((a,x)=>a+(+x.value||0),0), money=rows.some(x=>x.value!=null);
  const low=loc.type==='central'?MAT.items.filter(m=>m.status==='active'&&m.min_stock>0&&(rows.find(r=>r.material_id===m.id)?.qty||0)<m.min_stock):[];
  $('#sb2').outerHTML=`<div class="col" style="gap:12px;max-width:820px"><div class="field"><label for="st_loc">คลัง</label><select class="in" id="st_loc">${locs.map(l=>`<option value="${l.id}" ${l.id===stockLoc?'selected':''}>${esc(l.name)}</option>`).join('')}</select></div>
    <div class="statg"><div class="stat"><b>${rows.length}</b><span class="sm muted">รายการที่มีของ</span></div>${money?`<div class="stat"><b class="num" style="font-size:22px">${baht(total)}</b><span class="sm muted">มูลค่าคงคลัง</span></div>`:`<div class="stat"><b style="${low.length?'color:var(--warn)':''}">${low.length}</b><span class="sm muted">ต่ำกว่าขั้นต่ำ</span></div>`}</div>
    ${low.length?`<div class="note n-warn">${IC.info}<span>ต่ำกว่าขั้นต่ำ: ${low.slice(0,8).map(m=>esc(m.name)).join(', ')}${low.length>8?` และอีก ${low.length-8}`:''}</span></div>`:''}
    <div class="card" style="padding:0;overflow-x:auto"><table class="tbl"><thead><tr><th>วัสดุ</th><th class="num">คงเหลือ</th>${money?'<th class="num">มูลค่า</th>':''}</tr></thead><tbody>${rows.map(x=>`<tr><td><b>${esc(x.m.name)}</b><div class="xs muted">${esc(x.m.id)}${x.m.item_type==='tool'?' · อุปกรณ์':''}</div></td><td class="num">${fmtN(x.qty)} <span class="xs muted">${esc(x.m.unit)}</span></td>${money?`<td class="num">${baht(x.value)}</td>`:''}</tr>`).join('')||`<tr><td colspan="3"><div class="empty"><b>คลังนี้ยังไม่มีของ</b></div></td></tr>`}</tbody></table></div></div>`;
  $('#st_loc').onchange=e=>{ stockLoc=+e.target.value; matStock(); };
}

/* ---------------- รับเข้า / คืน / โอน / ปรับยอด ---------------- */
async function matPost(type){
  type=['RCV','RTN','TRF','ADJ'].includes(type)?type:'RCV';
  setPage(head('บันทึกเอกสารคลัง','',{back:'#mat'}) + `<div id="pb"><div class="loading"><div class="spin"></div></div></div>`);
  if(!await loadMat()) { $('#pb').outerHTML=needMat(); return; }
  if(!isMatRole(['store','admin'])){ $('#pb').outerHTML=`<div class="card empty"><b>เฉพาะสโตร์/แอดมินคลัง</b></div>`; return; }
  const c=centralLoc(), sites=MAT.locs.filter(l=>l.type==='site'&&S.sites.find(s=>s.id===l.site_id)?.status==='active');
  const F={from:type==='RCV'||type==='ADJ'?null:(type==='RTN'?sites[0]?.id:c.id), to:type==='RTN'?c.id:(type==='TRF'?sites[0]?.id:c.id), lines:{}};
  let q='';
  const host=$('#pb'); host.outerHTML='<div id="pb" class="col" style="gap:12px;max-width:820px"></div>'; const H=$('#pb');
  function draw(){
    const list=q?MAT.items.filter(m=>m.status==='active'&&(m.name+m.id).toLowerCase().includes(q)).slice(0,30):[];
    const locOpt=(sel,arr)=>arr.map(l=>`<option value="${l.id}" ${l.id===sel?'selected':''}>${esc(l.name)}</option>`).join('');
    H.innerHTML=`<div class="seg">${[['RCV','รับเข้า'],['TRF','โอนไปไซต์'],['RTN','คืนคลังกลาง'],['ADJ','ปรับยอด']].map(([k,t])=>`<button class="${k===type?'on':''}" data-ty="${k}">${t}</button>`).join('')}</div>
      <div class="g2">${type==='RCV'?`<div class="field"><label for="p_sup">ผู้ขาย / ที่มา</label><input class="in" id="p_sup" placeholder="เช่น ร้านวัสดุสิงห์บุรี"></div><div class="field"><label>เข้าคลัง</label><select class="in" id="p_to">${locOpt(F.to,MAT.locs)}</select></div>`
        :type==='ADJ'?`<div class="field"><label>คลังที่ปรับยอด</label><select class="in" id="p_to">${locOpt(F.to,MAT.locs)}</select></div><div class="field"><label>&nbsp;</label><span class="hint">ใส่จำนวนบวกเพื่อเพิ่ม ลบเพื่อลด</span></div>`
        :`<div class="field"><label>จาก</label><select class="in" id="p_from">${locOpt(F.from,type==='RTN'?sites:[c])}</select></div><div class="field"><label>ไป</label><select class="in" id="p_to">${locOpt(F.to,type==='RTN'?[c]:sites)}</select></div>`}</div>
      <input class="in" id="p_q" placeholder="ค้นหาวัสดุเพื่อเพิ่ม" value="${esc(q)}">
      ${list.length?`<div class="card card-l">${list.map(m=>`<button class="li" data-add="${m.id}"><div class="grow"><b>${esc(m.name)}</b><span class="xs muted">${esc(m.id)} · ${esc(m.unit)}</span></div>${IC.plus||'+'}</button>`).join('')}</div>`:''}
      <div class="card card-l">${Object.keys(F.lines).length?Object.entries(F.lines).map(([id,n])=>{ const m=matById(id); return `<div class="li"><div class="grow"><b>${esc(m.name)}</b><span class="xs muted">${esc(m.id)}</span></div><input class="in num" type="number" step="any" value="${n}" data-ln="${id}" style="width:96px;text-align:right"><span class="sm muted" style="width:40px">${esc(m.unit)}</span><button class="ibtn" data-rm="${id}" aria-label="ลบ">${IC.close}</button></div>`; }).join(''):'<div class="empty"><b>ยังไม่มีรายการ</b>ค้นหาแล้วแตะเพื่อเพิ่ม</div>'}</div>
      <div class="field"><label for="p_note">หมายเหตุ</label><input class="in" id="p_note"></div>
      <button class="btn btn-p" data-save ${Object.keys(F.lines).length?'':'disabled'}>บันทึก${{RCV:'รับเข้า',TRF:'โอน',RTN:'คืน',ADJ:'ปรับยอด'}[type]}</button>`;
    $$('[data-ty]',H).forEach(b=>b.onclick=()=>matPost(b.dataset.ty));
    const pq=$('#p_q',H); pq.oninput=e=>{ q=e.target.value.trim().toLowerCase(); const pos=pq.selectionStart; draw(); const n=$('#p_q',H); n.focus(); n.setSelectionRange(pos,pos); };
    $$('[data-add]',H).forEach(b=>b.onclick=()=>{ F.lines[b.dataset.add]=F.lines[b.dataset.add]||1; q=''; draw(); });
    $$('[data-ln]',H).forEach(i=>i.onchange=()=>{ F.lines[i.dataset.ln]=Number(i.value)||0; });
    $$('[data-rm]',H).forEach(b=>b.onclick=()=>{ delete F.lines[b.dataset.rm]; draw(); });
    const pf=$('#p_from',H); if(pf) pf.onchange=e=>F.from=+e.target.value; const pt=$('#p_to',H); if(pt) pt.onchange=e=>F.to=+e.target.value;
    const sv=$('[data-save]',H); if(sv) sv.onclick=async ev=>{
      busy(ev.target,true);
      const {data,error}=await sb.rpc('post_stock_doc',{p_type:type,p_from:F.from,p_to:F.to,p_lines:Object.entries(F.lines).map(([material_id,qty])=>({material_id,qty})),p_supplier:$('#p_sup',H)?.value||null,p_note:$('#p_note',H).value||null});
      if(error){ busy(ev.target,false); return toast(errText(error),true); }
      toast(`บันทึกแล้ว ${data.doc_no}`); location.hash='#mat/d/'+data.id;
    };
  }
  draw();
}

/* ---------------- รูปใบเบิกสำหรับแชร์ (สร้างในเครื่อง ไม่ใช้โควตา LINE) ---------------- */
async function shareDocImage(id){
  const prog=overlay(`<div class="modal" role="dialog" aria-modal="true"><div class="row" style="gap:10px"><span class="spin" style="margin:0"></span><b>กำลังสร้างรูปเอกสาร</b></div></div>`,true,false);
  try{
    await Promise.all([loadScript(LIB.h2c),loadScript(LIB.qr),loadMat()]);
    const [d,l]=await Promise.all([ sb.from('docs').select('*').eq('id',id).single(), sb.from('doc_lines').select('*').eq('doc_id',id).order('id') ]);
    const doc=d.data, lines=l.data||[], site=S.sites.find(s=>s.id===doc.site_id), brw=doc.doc_type==='BRW';
    const qr=qrcode(0,'M'); qr.addData(`${location.origin}${location.pathname}#mat/d/${id}`); qr.make();
    const stepI=(brw?{pending:1,approved:2,partial:2,issued:2,received:3,review:3,returned:4}:{pending:1,approved:2,partial:2,issued:3,received:4,review:3})[doc.status]??1;
    const steps=(brw?['ขอยืม','อนุมัติ','รับของ','คืนแล้ว']:['ขอ','อนุมัติ','จ่ายของ','รับของ']).map((t,i)=>`<div class="ds-st ${i<stepI?'done':i===stepI?'now':''}"><span>${i<stepI?'✓':i+1}</span><em>${t}</em></div>`).join('<div class="ds-ln"></div>');
    const shown=lines.slice(0,12);
    const logo=S.settings.company_logo?.drive_id;
    const el=document.createElement('div'); el.className='docslip';
    el.innerHTML=`<div class="ds-head"><div class="ds-logo">${logo?`<img src="https://drive.google.com/thumbnail?id=${logo}&sz=w200" crossorigin="anonymous" alt="">`:'KTY'}</div><div class="ds-co"><b>ห้างหุ้นส่วนจำกัด กิตติยาก่อสร้าง 1994</b><span>KITTIYA CONSTRUCTION 1994 LIMITED PARTNERSHIP</span></div><div class="ds-ti"><b>${brw?'ใบขอยืมอุปกรณ์':'ใบขอเบิกวัสดุ'}</b><span>${brw?'EQUIPMENT BORROW SLIP':'MATERIAL REQUISITION'}</span></div></div><div class="ds-rule"></div>
      <div class="ds-no"><span>เลขที่ <b>${esc(doc.doc_no)}</b></span><span>${thaiDate(localISO(new Date(doc.created_at)))} · ${new Date(doc.created_at).toTimeString().slice(0,5)} น.</span></div>
      <div class="ds-info"><div>${(brw?[['โครงการ',(site?.code?site.code+' ':'')+(site?.name||'')],['ผู้ขอยืม',doc.requester_name],['ระยะเวลายืม',`${thaiDate(doc.need_date)} – ${thaiDate(doc.due_date)}`],['ใช้สำหรับ',doc.need_note||'-']]:[['โครงการ',(site?.code?site.code+' ':'')+(site?.name||'')],['หมวดงาน',doc.work_category||'-'],['ผู้ขอเบิก',doc.requester_name],['ต้องการใช้',doc.need_date?thaiDate(doc.need_date)+' '+(doc.need_note||''):(doc.need_note||'-')]]).map(([a,b])=>`<p><span>${a}</span><b>${esc(b||'-')}</b></p>`).join('')}</div><div class="ds-qr">${qr.createSvgTag({cellSize:3,margin:0,scalable:true})}<small>สแกนเปิดใน KTY Hub</small></div></div>
      <table><tr><th>ที่</th><th>รายการ</th><th class="r">จำนวน</th><th>หน่วย</th></tr>${shown.map((x,i)=>{ const m=matById(x.material_id); return `<tr><td>${i+1}</td><td><b>${esc(m.name)}</b>${m.spec?`<i>${esc(m.spec)}</i>`:''}</td><td class="r"><b>${fmtN(x.qty_approved??x.qty_req)}</b></td><td>${esc(m.unit)}</td></tr>`; }).join('')}</table>
      <div class="ds-sum">รวม ${lines.length} รายการ${lines.length>shown.length?` (แสดง ${shown.length} รายการแรก)`:''}</div>
      ${brw?'<div class="ds-note">ผู้ยืมรับผิดชอบดูแลอุปกรณ์จนกว่าจะคืน หากชำรุดหรือสูญหายต้องแจ้งทันที</div>':''}${doc.note?`<div class="ds-note">${esc(doc.note)}</div>`:''}
      <div class="ds-steps">${steps}</div>
      <div class="ds-sign"><div><b>${esc(doc.requester_name||'')}</b><span>${brw?'ผู้ขอยืม':'ผู้ขอเบิก'} · ส่งในระบบ ${new Date(doc.created_at).toTimeString().slice(0,5)} น.</span></div><div><b>${esc(doc.approver_name||(doc.status==='rejected'?'ไม่อนุมัติ':'รออนุมัติ'))}</b><span>ผู้อนุมัติ${doc.approved_at?' · '+new Date(doc.approved_at).toTimeString().slice(0,5)+' น.':''}</span></div></div>
      <div class="ds-foot"><span>สร้างโดย KTY Hub</span><span>ไม่แสดงราคา · เอกสารอ้างอิงในระบบ</span></div>`;
    document.body.appendChild(el);
    await document.fonts?.ready; await new Promise(r=>setTimeout(r,150));
    const canvas=await html2canvas(el,{scale:1.8,backgroundColor:'#ffffff',useCORS:true,logging:false});
    el.remove();
    const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));
    const url=URL.createObjectURL(blob), name=`${doc.doc_no}.png`;
    prog.close();
    const m=overlay(`<div class="sheet" role="dialog" aria-modal="true" aria-label="ดูตัวอย่างใบเบิก"><header class="appbar stripe"><button class="ibtn" data-x aria-label="ปิด">${IC.close}</button><h1>ดูตัวอย่าง${brw?'ใบยืม':'ใบเบิก'}<small>${esc(doc.doc_no)}</small></h1></header>
      <div class="sheet-body"><img src="${url}" alt="รูปเอกสาร" style="width:100%;max-width:520px;border-radius:10px;box-shadow:var(--shadow);align-self:center"><div class="note n-info">${IC.check}<span>บันทึกในระบบแล้ว ผู้อนุมัติเห็นในแอปทันที การแชร์รูปเข้า LINE ไม่ใช้โควตาของ bot</span></div></div>
      <div class="sheet-foot" style="flex-wrap:wrap"><button class="btn" data-save>บันทึกรูป</button><button class="btn btn-p" data-share style="background:#06C755;border-color:#06C755;color:#fff">แชร์รูปเข้า LINE</button></div></div>`, false, false);
    $('[data-x]',m.el).onclick=()=>{ URL.revokeObjectURL(url); m.close(); };
    $('[data-save]',m.el).onclick=()=>{ const a=document.createElement('a'); a.href=url; a.download=name; a.click(); };
    $('[data-share]',m.el).onclick=async()=>{ const file=new File([blob],name,{type:'image/png'});
      try{ if(navigator.canShare&&navigator.canShare({files:[file]})) await navigator.share({files:[file],title:doc.doc_no}); else { const a=document.createElement('a'); a.href=url; a.download=name; a.click(); toast('อุปกรณ์นี้แชร์ไฟล์ไม่ได้ บันทึกรูปให้แล้ว ส่งเข้า LINE ได้จากอัลบั้ม'); } }
      catch(e){ if(e.name!=='AbortError') toast(errText(e),true); } };
  }catch(e){ prog.close(); toast(errText(e),true); }
}

/* ---------------- จัดการ: ทะเบียนวัสดุ / BOQ / ชุดวัสดุ / ใครเห็นเงิน ---------------- */
async function mgMat(){
  const host=$('#mg'); host.innerHTML='<div class="loading"><div class="spin"></div></div>';
  if(!await loadMat(true)){ host.innerHTML=needMat(); return; }
  let q='', cat='';
  const draw=()=>{ const list=MAT.items.filter(m=>(!cat||m.category_code===cat)&&(!q||(m.id+m.name+(m.spec||'')).toLowerCase().includes(q)));
    host.innerHTML=`<div class="row" style="gap:8px;flex-wrap:wrap"><input class="in grow" id="mq" placeholder="ค้นหารหัส / ชื่อ" value="${esc(q)}" style="min-width:180px"><button class="btn btn-sm" data-new>+ เพิ่มวัสดุ</button><button class="btn btn-sm" data-imp>นำเข้า (Google Sheet / ไฟล์)</button></div>
      <div class="chips scroll" style="margin:0 -16px"><button class="chip ${!cat?'on':''}" data-c="">ทั้งหมด ${MAT.items.length}</button>${MAT.cats.map(c=>`<button class="chip ${cat===c.code?'on':''}" data-c="${c.code}">${esc(c.name)}</button>`).join('')}</div>
      <div class="card card-l">${list.slice(0,200).map(m=>`<button class="li" data-ed="${m.id}" style="${m.status==='active'?'':'opacity:.55'}"><div class="grow"><b>${esc(m.name)}</b><span class="xs muted">${esc(m.id)} · ${esc(m.unit)}${m.spec?' · '+esc(m.spec):''}</span></div>${m.item_type==='tool'?'<span class="tag t-acc">อุปกรณ์</span>':''}${MAT.price[m.id]!==undefined?`<span class="sm num">${baht(MAT.price[m.id])}</span>`:''}${IC.chev}</button>`).join('')||'<div class="empty"><b>ไม่พบวัสดุ</b></div>'}</div>${list.length>200?`<span class="xs muted">แสดง 200 จาก ${list.length} รายการ ค้นหาเพื่อจำกัดผล</span>`:''}`;
    const mq=$('#mq'); mq.oninput=e=>{ q=e.target.value.trim().toLowerCase(); const p=mq.selectionStart; draw(); const n=$('#mq'); n.focus(); n.setSelectionRange(p,p); };
    $$('[data-c]',host).forEach(b=>b.onclick=()=>{ cat=b.dataset.c; draw(); });
    $('[data-new]',host).onclick=()=>matEdit(null);
    $$('[data-ed]',host).forEach(b=>b.onclick=()=>matEdit(MAT.items.find(m=>m.id===b.dataset.ed)));
    $('[data-imp]',host).onclick=matImportAny;
  };
  draw();
}
function matEdit(m){
  const isNew=!m; m=m||{id:'',name:'',category_code:'OT',spec:'',unit:'ชิ้น',min_stock:0,item_type:'consumable',status:'active'};
  const ov=overlay(`<div class="modal" role="dialog" aria-modal="true"><h3 class="h2" style="font-size:18px">${isNew?'เพิ่มวัสดุ':'แก้ไขวัสดุ'}</h3><form id="mf" class="col" style="gap:10px">
    <div class="g2"><div class="field"><label>รหัส</label><input class="in" name="id" value="${esc(m.id)}" ${isNew?'':'readonly'} required placeholder="เช่น CM-0001"></div><div class="field"><label>หมวด</label><select class="in" name="category_code">${MAT.cats.map(c=>`<option value="${c.code}" ${c.code===m.category_code?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div></div>
    <div class="field"><label>ชื่อ</label><input class="in" name="name" value="${esc(m.name)}" required></div><div class="field"><label>สเปก</label><input class="in" name="spec" value="${esc(m.spec||'')}"></div>
    <div class="g2"><div class="field"><label>หน่วย</label><input class="in" name="unit" value="${esc(m.unit)}" required></div><div class="field"><label>ราคาต่อหน่วย (บาท)</label><input class="in" name="unit_price" type="number" step="any" value="${MAT.price[m.id]??''}"></div></div>
    <div class="g2"><div class="field"><label>สต็อกขั้นต่ำ</label><input class="in" name="min_stock" type="number" step="any" value="${m.min_stock||0}"></div><div class="field"><label>ประเภท</label><select class="in" name="item_type"><option value="consumable" ${m.item_type==='consumable'?'selected':''}>วัสดุสิ้นเปลือง</option><option value="tool" ${m.item_type==='tool'?'selected':''}>อุปกรณ์ (ยืม-คืน)</option></select></div></div>
    <label class="chk"><input type="checkbox" name="active" ${m.status==='active'?'checked':''}><span>ใช้งานอยู่</span></label>
    <div class="row" style="gap:8px;justify-content:flex-end"><button type="button" class="btn" data-x>ยกเลิก</button><button class="btn btn-p">บันทึก</button></div></form></div>`);
  $('[data-x]',ov.el).onclick=ov.close;
  $('#mf',ov.el).onsubmit=async e=>{ e.preventDefault(); const f=e.target;
    const row={id:f.id.value.trim().toUpperCase(),name:f.name.value.trim(),category_code:f.category_code.value,spec:f.spec.value.trim()||null,unit:f.unit.value.trim(),min_stock:Number(f.min_stock.value)||0,item_type:f.item_type.value,status:f.active.checked?'active':'inactive',updated_at:new Date().toISOString()};
    if(f.unit_price.value!=='') row.unit_price=Number(f.unit_price.value)||0;
    const {error}=isNew?await sb.from('materials').insert(row):await sb.from('materials').update(row).eq('id',row.id);
    if(error) return toast(/duplicate|materials_pkey/.test(error.message)?'รหัสนี้มีแล้ว':errText(error),true);
    ov.close(); toast('บันทึกแล้ว'); mgMat(); };
}
async function matImportRows(rows){
  try{
    const pick=(r,...k)=>{ for(const x of k){ const key=Object.keys(r).find(c=>c.trim().toLowerCase()===x); if(key&&r[key]!=='') return r[key]; } return ''; };
    const cats=new Set(MAT.cats.map(c=>c.code));
    const items=rows.map(r=>{ const cat=String(pick(r,'category_code','category','หมวด')).trim().toUpperCase(); const t=String(pick(r,'item_type','ประเภท')).toLowerCase();
      return { id:String(pick(r,'mat_id','id','รหัส')).trim().toUpperCase(), name:String(pick(r,'name','ชื่อ')).trim(), category_code:cats.has(cat)?cat:'OT', spec:String(pick(r,'spec','สเปก')).trim()||null,
        unit:String(pick(r,'unit','หน่วย')).trim()||'ชิ้น', unit_price:Number(pick(r,'unit_price','price','ราคา'))||0, min_stock:Number(pick(r,'min_stock','ขั้นต่ำ'))||0,
        item_type:/tool|asset|อุปกรณ์|เครื่องมือ/.test(t)?'tool':'consumable', status:/inactive|ยกเลิก/.test(String(pick(r,'status')).toLowerCase())?'inactive':'active' }; }).filter(x=>x.id&&x.name);
    if(!items.length) return toast('ไม่พบข้อมูลในไฟล์ (ต้องมีคอลัมน์ mat_id และ name)',true);
    if(!await confirmBox(`นำเข้า ${items.length} รายการ? รหัสที่มีอยู่แล้วจะถูกอัปเดต`,'นำเข้า')) return;
    for(let i=0;i<items.length;i+=200){ const {error}=await sb.from('materials').upsert(items.slice(i,i+200),{onConflict:'id'}); if(error) throw error; }
    toast(`นำเข้าแล้ว ${items.length} รายการ`); mgMat();
  }catch(e){ toast(errText(e),true); }
}
async function mgBoq(){
  const host=$('#mg'); host.innerHTML='<div class="loading"><div class="spin"></div></div>';
  if(!await loadMat()){ host.innerHTML=needMat(); return; }
  const sites=S.sites.filter(s=>s.status==='active'); let site=S.site?+S.site:sites[0]?.id;
  const draw=async()=>{
    const {data}=await sb.rpc('boq_status',{p_site:site}); const rows=data||[];
    const total=rows.reduce((a,r)=>a+(+r.budget_value||0),0), used=rows.reduce((a,r)=>a+(+r.used_value||0),0);
    host.innerHTML=`<div class="row" style="justify-content:flex-end"><button class="btn btn-sm" data-bimp>นำเข้า BOQ (Google Sheet / ไฟล์ / ปร.4)</button></div><div class="field"><label>ไซต์</label><select class="in" id="bs">${sites.map(s=>`<option value="${s.id}" ${s.id===site?'selected':''}>${esc(s.name)}</option>`).join('')}</select></div>
      ${canMoney()&&rows.length?`<div class="statg"><div class="stat"><b class="num" style="font-size:20px">${baht(total)}</b><span class="sm muted">งบวัสดุ</span></div><div class="stat"><b class="num" style="font-size:20px">${total?Math.round(used/total*100):0}%</b><span class="sm muted">ขอเบิกแล้ว ${baht(used)}</span></div></div>`:''}
      <form class="card col" id="bf" style="gap:8px"><b class="sm">เพิ่ม/แก้งบ (ใส่รหัสวัสดุเดิมซ้ำ = แก้จำนวน)</b><div class="g2"><input class="in" name="cat" placeholder="หมวดงาน เช่น งานพื้น" required list="bcats"><datalist id="bcats">${[...new Set(rows.map(r=>r.work_category))].map(c=>`<option value="${esc(c)}">`).join('')}</datalist><input class="in" name="mat" placeholder="รหัสวัสดุ" required list="bmats"><datalist id="bmats">${MAT.items.filter(m=>m.item_type==='consumable').slice(0,500).map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join('')}</datalist></div>
        <div class="g2"><input class="in" name="qty" type="number" step="any" placeholder="จำนวนงบ" required><input class="in" name="price" type="number" step="any" placeholder="ราคาต่อหน่วยใน BOQ (ไม่บังคับ)"></div><button class="btn btn-sm" style="align-self:flex-start">บันทึก</button></form>
      <div class="card" style="padding:0;overflow-x:auto"><table class="tbl"><thead><tr><th>หมวดงาน / วัสดุ</th><th class="num">งบ</th><th class="num">ขอแล้ว</th><th></th></tr></thead><tbody>${rows.map(r=>{ const m=matById(r.material_id), p=r.budget?Math.round(r.used/r.budget*100):0; return `<tr><td><span class="xs muted">${esc(r.work_category)}</span><br><b>${esc(m.name)}</b></td><td class="num">${fmtN(r.budget)} ${esc(m.unit)}</td><td class="num" style="${p>100?'color:var(--bad)':p>80?'color:var(--warn)':''}">${fmtN(r.used)} (${p}%)</td><td><button class="ibtn" data-del="${esc(r.work_category)}|${r.material_id}" aria-label="ลบ">${IC.close}</button></td></tr>`; }).join('')||'<tr><td colspan="4"><div class="empty"><b>ยังไม่มีงบ BOQ ของไซต์นี้</b></div></td></tr>'}</tbody></table></div>`;
    $('#bs').onchange=e=>{ site=+e.target.value; draw(); };
    $('[data-bimp]').onclick=()=>boqImportAny(()=>draw());
    $('#bf').onsubmit=async e=>{ e.preventDefault(); const f=e.target; const row={site_id:site,work_category:f.cat.value.trim(),material_id:f.mat.value.trim().toUpperCase(),qty:Number(f.qty.value)||0}; if(f.price.value) row.unit_price=Number(f.price.value);
      const {error}=await sb.from('boq_budget').upsert(row,{onConflict:'site_id,work_category,material_id'}); if(error) return toast(errText(error),true); toast('บันทึกงบแล้ว'); draw(); };
    $$('[data-del]').forEach(b=>b.onclick=async()=>{ const [c,mid]=b.dataset.del.split('|'); if(!await confirmBox('ลบรายการงบนี้?','ลบ',true)) return; const {error}=await sb.from('boq_budget').delete().eq('site_id',site).eq('work_category',c).eq('material_id',mid); if(error) return toast(errText(error),true); draw(); });
  };
  draw();
}
/* ---------------- อ่านข้อมูลจากไฟล์ หรือ ลิงก์ Google Sheet ---------------- */
function pickSource(title){
  return new Promise(resolve=>{
    const ov=overlay(`<div class="modal" role="dialog" aria-modal="true"><h3 class="h2" style="font-size:18px">${esc(title)}</h3>
      <div class="card col" style="gap:8px;box-shadow:none"><b class="sm">จาก Google Sheet</b><input class="in" id="ps_url" placeholder="วางลิงก์ https://docs.google.com/spreadsheets/d/..."><span class="hint">ไฟล์ต้องเปิดได้ด้วยบัญชี Google ของบริษัท (บัญชีที่ติดตั้ง Bridge) ถ้าเป็นไฟล์ .xls ให้เปิดใน Google ชีตแล้วเลือก ไฟล์ > บันทึกเป็น Google ชีต ก่อน</span><button class="btn btn-p btn-sm" data-g ${hasBridge()?'':'disabled'} style="align-self:flex-start">อ่านจาก Google Sheet</button>${hasBridge()?'':'<span class="hint warn">ต้องติดตั้ง Bridge ก่อน</span>'}</div>
      <div class="card col" style="gap:8px;box-shadow:none"><b class="sm">หรือเลือกไฟล์ในเครื่อง</b><span class="hint">.xlsx .xls .csv (ไม่ต้องเปิดด้วย Excel ระบบอ่านไฟล์เอง)</span><label class="btn btn-sm" style="align-self:flex-start">เลือกไฟล์<input type="file" accept=".xlsx,.xls,.csv" hidden data-f></label></div>
      <button class="btn" data-x>ยกเลิก</button></div>`);
    $('[data-x]',ov.el).onclick=()=>{ ov.close(); resolve(null); };
    $('[data-g]',ov.el).onclick=async ev=>{ const url=$('#ps_url',ov.el).value.trim(); if(!url) return toast('วางลิงก์ Google Sheet',true);
      busy(ev.target,true,'กำลังอ่าน...'); try{ const r=await bridge('read_sheet',{url}); ov.close(); resolve({title:r.title,sheets:r.sheets.map(s=>({name:s.name,rows:s.values}))}); }catch(e){ busy(ev.target,false); toast(errText(e),true); } };
    $('[data-f]',ov.el).onchange=async e=>{ const f=e.target.files[0]; if(!f) return; try{ await loadScript(LIB.xlsx); const wb=XLSX.read(await f.arrayBuffer());
      ov.close(); resolve({title:f.name,sheets:wb.SheetNames.map(n=>({name:n,rows:XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,defval:''})}))}); }catch(err){ toast(errText(err),true); } };
  });
}
const rowsToObjects = rows => { const hi=rows.findIndex(r=>r.some(c=>String(c).trim())); if(hi<0) return []; const h=rows[hi].map(c=>String(c).trim()); return rows.slice(hi+1).filter(r=>r.some(c=>String(c).trim()!=='')).map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]??'']))); };
async function matImportAny(){ const src=await pickSource('นำเข้าทะเบียนวัสดุ'); if(!src) return;
  const sh=src.sheets.find(s=>/^materials$/i.test(s.name))||src.sheets.find(s=>(s.rows[0]||[]).some(c=>/mat_id/i.test(c)))||src.sheets[0];
  return matImportRows(rowsToObjects(sh.rows)); }
async function boqImportAny(done){ const src=await pickSource('นำเข้างบ BOQ'); if(!src) return;
  const tpl=src.sheets.find(s=>/^boq$/i.test(s.name))||src.sheets.find(s=>(s.rows[0]||[]).some(c=>/site_code/i.test(c)));
  if(tpl) return boqImportRows(rowsToObjects(tpl.rows),done);
  const pr4=src.sheets.map(s=>({name:s.name,items:parsePr4(s.rows)})).filter(s=>s.items.length);
  if(!pr4.length) return toast('ไม่พบแผ่น BOQ แบบแม่แบบ หรือแบบ ปร.4 ในไฟล์นี้',true);
  return pr4Mapper(src.title,pr4,done);
}
/* ---------------- อ่านแบบ ปร.4 ---------------- */
function parsePr4(rows){
  const norm=v=>String(v??'').replace(/\s+/g,' ').trim();
  let hdr=-1, cQty=-1, cUnit=-1, cPrice=-1;
  for(let i=0;i<Math.min(rows.length,60)&&hdr<0;i++){ const r=rows[i].map(norm); const q=r.findIndex(c=>c==='จำนวน'), u=r.findIndex(c=>c==='หน่วย'), p=r.findIndex(c=>/^ราคาวัสดุ/.test(c));
    if(q>=0&&u>=0&&p>=0&&r.some(c=>c==='รายการ')){ hdr=i; cQty=q; cUnit=u; cPrice=p; } }
  if(hdr<0) return [];
  const items=[]; let cat='';
  for(let i=hdr+1;i<rows.length;i++){ const r=rows[i].map(norm);
    if(r.some(c=>c==='รายการ')&&r.some(c=>c==='จำนวน')) continue;
    const txt=r.slice(0,cQty).filter(Boolean);
    const sec=txt.find(c=>/^หมวด/.test(c)); if(sec&&!r[cQty]){ cat=sec.replace(/^หมวด\s*/,'').trim(); continue; }
    const name=txt.filter(c=>!/^[-\d.]+$/.test(c)&&!/^รวม/.test(c)).pop(); const qty=Number(String(rows[i][cQty]).replace(/,/g,'')), price=Number(String(rows[i][cPrice]).replace(/,/g,''));
    if(!name||!(qty>0)||!(price>0)||/ค่าแรง/.test(name)) continue;
    items.push({cat:cat||'ทั่วไป',name,qty:Math.round(qty*100)/100,unit:r[cUnit].replace(/^ก\.ก\.$/,'กก.'),price});
  }
  return items;
}
const catGuess = n => /คอนกรีต|ปูน/.test(n)?'CM':/ทราย|หิน|ดิน|ลูกรัง/.test(n)?'AG':/เหล็ก|ลวด/.test(n)?'ST':/ไม้|เสาค้ำ/.test(n)?'WD':/อิฐ|บล็อก/.test(n)?'BR':/ท่อ|ประปา|สุขภัณฑ์|ก๊อก|ส้วม|อ่าง/.test(n)?'PL':/สายไฟ|ไฟฟ้า|โคม|สวิตช์|ปลั๊ก|เบรกเกอร์|ตู้ไฟ/.test(n)?'EL':/สี|เคมี|กันซึม/.test(n)?'PT':/หลังคา|เมทัลชีท|ครอบ/.test(n)?'RF':/ตะปู|สกรู|น็อต|พุก|แหวน/.test(n)?'HW':'OT';
function sizeKey(n){ const s=n.replace(/\s+/g,''); const d=(s.match(/(?:Ø|ø|DB|RB)(\d{1,2})/i)||[])[1]; if(!d) return null; return (/ข้ออ้อย|DB|SD/i.test(s)?'DB':/ผิวเรียบ|RB|SR/i.test(s)?'RB':'')+d; }
function bestMatch(name){
  const k=sizeKey(name), clean=s=>s.toLowerCase().replace(/[\s.()\-,/]+/g,''), a=clean(name);
  if(k){ const hit=MAT.items.find(m=>sizeKey(m.name+' '+(m.spec||''))===k); if(hit) return hit; }
  const cont=MAT.items.filter(m=>{ const c=clean(m.name); return c.length>=3&&a.includes(c)&&!sizeKey(m.name); }).sort((x,y)=>y.name.length-x.name.length)[0]; if(cont&&!k) return cont;
  const bg=s=>{ const o=new Set(); for(let i=0;i<s.length-1;i++) o.add(s.slice(i,i+2)); return o; }, A=bg(a);
  let best=null, sc=0; MAT.items.forEach(m=>{ const B=bg(clean(m.name)); let inter=0; A.forEach(x=>{ if(B.has(x)) inter++; }); const j=inter/Math.max(1,A.size+B.size-inter); if(j>sc){ sc=j; best=m; } });
  return sc>=.45?best:null;
}
function pr4Mapper(title, sheets, done){
  const sites=S.sites.filter(s=>s.status==='active'); let site=S.site?+S.site:sites[0]?.id;
  const main=[...sheets].sort((x,y)=>y.items.length-x.items.length)[0]; const sel=new Set([main.name]); const items=[]; sheets.forEach(s=>s.items.forEach(it=>items.push({...it,sheet:s.name})));
  items.forEach(it=>{ const mm=bestMatch(it.name); it.act=mm?mm.id:'new'; });
  const ov=overlay(`<div class="sheet" role="dialog" aria-modal="true" aria-label="นำเข้า BOQ จาก ปร.4"></div>`,false,false); const sh=$('.sheet',ov.el);
  const uN=u=>String(u||'').replace(/\s/g,'').replace(/^ก\.ก\.$/,'กก.');
  function draw(){
    const list=items.filter(it=>sel.has(it.sheet)), use=list.filter(it=>it.act!=='skip');
    sh.innerHTML=`<header class="appbar stripe"><button class="ibtn" data-x aria-label="ปิด">${IC.close}</button><h1>นำเข้า BOQ จาก ปร.4<small>${esc(title)} · ${list.length} รายการที่มีราคาวัสดุ</small></h1></header>
    <div class="sheet-body"><div class="field"><label>ไซต์ที่ใช้งบนี้</label><select class="in" id="pm_site">${sites.map(s=>`<option value="${s.id}" ${s.id===site?'selected':''}>${esc(s.name)}</option>`).join('')}</select></div>
      <div class="field"><label>แผ่นงานที่จะนำเข้า</label><div class="chips">${sheets.map(s=>`<button class="chip ${sel.has(s.name)?'on':''}" data-sh="${esc(s.name)}">${esc(s.name)} ${s.items.length}</button>`).join('')}</div></div>
      <div class="note n-info">${IC.info}<span>ระบบจับคู่กับทะเบียนวัสดุให้อัตโนมัติ ตรวจทีละรายการได้ "สร้างใหม่" = เพิ่มเข้าทะเบียนพร้อมราคาจาก ปร.4 · ค่าแรงถูกตัดออกแล้ว</span></div>
      <div class="card" style="padding:0;overflow-x:auto"><table class="tbl"><thead><tr><th>หมวดงาน / รายการ ปร.4</th><th class="num">จำนวน</th><th>จับคู่กับ</th></tr></thead><tbody>
      ${list.map(it=>{ const i=items.indexOf(it), mm=it.act!=='new'&&it.act!=='skip'?matById(it.act):null, warn=mm&&uN(mm.unit)!==uN(it.unit);
        return `<tr style="${it.act==='skip'?'opacity:.45':''}"><td><span class="xs muted">${esc(it.sheet)} · ${esc(it.cat)}</span><br><b>${esc(it.name)}</b><div class="xs muted">${baht(it.price)}/${esc(it.unit)}</div></td><td class="num">${fmtN(it.qty)} ${esc(it.unit)}</td>
          <td><select class="in" data-it="${i}" style="min-width:190px;height:40px;font-size:13.5px"><option value="new" ${it.act==='new'?'selected':''}>+ สร้างใหม่</option><option value="skip" ${it.act==='skip'?'selected':''}>ข้าม (ไม่ใช่วัสดุเบิก)</option>${MAT.items.filter(m=>m.item_type==='consumable').map(m=>`<option value="${m.id}" ${it.act===m.id?'selected':''}>${esc(m.id)} ${esc(m.name)}</option>`).join('')}</select>${warn?`<div class="xs" style="color:var(--warn)">หน่วยไม่ตรง (${esc(mm.unit)})</div>`:''}</td></tr>`; }).join('')}</tbody></table></div></div>
    <div class="sheet-foot"><span class="sm muted grow">นำเข้า ${use.length} รายการ · สร้างวัสดุใหม่ ${use.filter(x=>x.act==='new').length}</span><button class="btn" data-x2>ยกเลิก</button><button class="btn btn-p" data-go ${use.length?'':'disabled'}>นำเข้า</button></div>`;
    $('[data-x]',sh).onclick=ov.close; $('[data-x2]',sh).onclick=ov.close;
    $('#pm_site',sh).onchange=e=>site=+e.target.value;
    $$('[data-sh]',sh).forEach(b=>b.onclick=()=>{ sel.has(b.dataset.sh)?sel.delete(b.dataset.sh):sel.add(b.dataset.sh); draw(); });
    $$('[data-it]',sh).forEach(s=>s.onchange=()=>{ items[+s.dataset.it].act=s.value; const y=$('.sheet-body',sh).scrollTop; draw(); $('.sheet-body',sh).scrollTop=y; });
    $('[data-go]',sh).onclick=async ev=>{
      busy(ev.target,true,'กำลังนำเข้า...');
      try{
        const counters={}; MAT.items.forEach(m=>{ const p=m.id.split('-')[0]; const n=Number(m.id.split('-')[1])||0; counters[p]=Math.max(counters[p]||0,n); });
        const created={}, newMats=[];
        for(const it of use.filter(x=>x.act==='new')){ const key=it.name.trim(); if(created[key]){ it.mid=created[key]; continue; }
          const p=catGuess(it.name); counters[p]=(counters[p]||0)+1; const id=`${p}-${String(counters[p]).padStart(4,'0')}`;
          created[key]=id; it.mid=id; newMats.push({id,name:it.name.slice(0,120),category_code:p,unit:it.unit||'หน่วย',unit_price:it.price,item_type:'consumable',status:'active'}); }
        if(newMats.length){ const {error}=await sb.from('materials').insert(newMats); if(error) throw error; }
        const agg={}; use.forEach(it=>{ const mid=it.act==='new'?it.mid:it.act, k=`${it.cat}|${mid}`; if(agg[k]) agg[k].qty+=it.qty; else agg[k]={site_id:site,work_category:it.cat,material_id:mid,qty:it.qty,unit_price:it.price}; });
        const rows=Object.values(agg).map(r=>({...r,qty:Math.round(r.qty*100)/100}));
        for(let i=0;i<rows.length;i+=200){ const {error}=await sb.from('boq_budget').upsert(rows.slice(i,i+200),{onConflict:'site_id,work_category,material_id'}); if(error) throw error; }
        ov.close(); await loadMat(true); toast(`นำเข้างบ ${rows.length} รายการ · สร้างวัสดุใหม่ ${newMats.length} รายการ`); done&&done();
      }catch(e){ busy(ev.target,false); toast(errText(e),true); }
    };
  }
  draw();
}
async function boqImportRows(rows, done){
  try{
    const pick=(r,...k)=>{ for(const x of k){ const key=Object.keys(r).find(c=>c.trim().toLowerCase()===x); if(key&&r[key]!=='') return r[key]; } return ''; };
    const byCode={}; S.sites.forEach(s=>{ if(s.code) byCode[s.code.toUpperCase()]=s.id; });
    const ok=[], bad=[]; const agg={};
    rows.forEach((r,i)=>{ const code=String(pick(r,'site_code','รหัสโครงการ')).trim().toUpperCase(), cat=String(pick(r,'work_category','หมวดงาน')).trim(), mid=String(pick(r,'mat_id','รหัสวัสดุ')).trim().toUpperCase(), qty=Number(pick(r,'qty','จำนวน'));
      if(!code&&!mid) return;
      if(!byCode[code]) return bad.push(`แถว ${i+2}: ไม่พบรหัสโครงการ ${code||'(ว่าง)'}`);
      if(!MAT.items.some(m=>m.id===mid)) return bad.push(`แถว ${i+2}: ไม่พบรหัสวัสดุ ${mid||'(ว่าง)'}`);
      if(!cat||!(qty>=0)) return bad.push(`แถว ${i+2}: หมวดงานหรือจำนวนไม่ถูกต้อง`);
      const k=`${byCode[code]}|${cat}|${mid}`, price=pick(r,'unit_price','ราคา');
      if(agg[k]) agg[k].qty+=qty; else agg[k]={site_id:byCode[code],work_category:cat,material_id:mid,qty,...(price!==''?{unit_price:Number(price)}:{})}; });
    Object.values(agg).forEach(x=>ok.push(x));
    if(!ok.length) return toast(bad[0]||'ไม่พบข้อมูลในไฟล์',true);
    if(!await confirmBox(`นำเข้างบ ${ok.length} รายการ${bad.length?` (ข้ามแถวที่ผิด ${bad.length} แถว: ${bad.slice(0,3).join(' / ')}${bad.length>3?' …':''})`:''} รายการเดิมที่ซ้ำจะถูกแทนที่`,'นำเข้า')) return;
    for(let i=0;i<ok.length;i+=200){ const {error}=await sb.from('boq_budget').upsert(ok.slice(i,i+200),{onConflict:'site_id,work_category,material_id'}); if(error) throw error; }
    toast(`นำเข้างบ BOQ แล้ว ${ok.length} รายการ`); done&&done();
  }catch(e){ toast(errText(e),true); }
}
async function mgKits(){
  const host=$('#mg'); if(!await loadMat(true)){ host.innerHTML=needMat(); return; }
  host.innerHTML=`<button class="btn btn-sm" data-new style="align-self:flex-start">+ สร้างชุดวัสดุ</button>${MAT.kits.map(k=>`<div class="card col" style="gap:6px"><div class="row"><b class="grow">${esc(k.name)}</b><span class="xs muted">${esc(k.work_category||'')}</span><button class="btn btn-sm" data-ed="${k.id}">แก้ไข</button></div><span class="sm muted">${k.items.map(x=>`${esc(matById(x.material_id).name)} ${fmtN(x.qty)}`).join(' · ')}</span></div>`).join('')||'<div class="card empty"><b>ยังไม่มีชุดวัสดุ</b></div>'}`;
  const edit=k=>{ k=k||{name:'',work_category:'',items:[]}; const ov=overlay(`<div class="modal" role="dialog" aria-modal="true"><h3 class="h2" style="font-size:18px">ชุดวัสดุ</h3><form id="kf" class="col" style="gap:10px"><input class="in" name="name" placeholder="ชื่อชุด เช่น ชุดเทพื้น 1 ห้อง" value="${esc(k.name)}" required><input class="in" name="cat" placeholder="หมวดงาน" value="${esc(k.work_category||'')}">
      <div class="field"><label>รายการ (บรรทัดละ: รหัส จำนวน)</label><textarea class="in" name="items" rows="6" placeholder="CM-0001 10&#10;AG-0001 1">${esc(k.items.map(x=>`${x.material_id} ${x.qty}`).join('\n'))}</textarea></div>
      <div class="row" style="gap:8px;justify-content:flex-end">${k.id?'<button type="button" class="btn btn-bad" data-del>ลบชุด</button>':''}<button type="button" class="btn" data-x>ยกเลิก</button><button class="btn btn-p">บันทึก</button></div></form></div>`);
    $('[data-x]',ov.el).onclick=ov.close;
    const dl=$('[data-del]',ov.el); if(dl) dl.onclick=async()=>{ await sb.from('kits').update({status:'inactive'}).eq('id',k.id); ov.close(); mgKits(); };
    $('#kf',ov.el).onsubmit=async e=>{ e.preventDefault(); const f=e.target; const items=f.items.value.split('\n').map(x=>x.trim().split(/\s+/)).filter(x=>x[0]&&Number(x[1])>0).map(([a,b])=>({material_id:a.toUpperCase(),qty:Number(b)}));
      const bad=items.find(x=>!MAT.items.some(m=>m.id===x.material_id)); if(bad) return toast(`ไม่พบรหัส ${bad.material_id}`,true);
      const row={name:f.name.value.trim(),work_category:f.cat.value.trim()||null,items}; const {error}=k.id?await sb.from('kits').update(row).eq('id',k.id):await sb.from('kits').insert(row); if(error) return toast(errText(error),true); ov.close(); mgKits(); }; };
  $('[data-new]',host).onclick=()=>edit(null); $$('[data-ed]',host).forEach(b=>b.onclick=()=>edit(MAT.kits.find(k=>k.id==b.dataset.ed)));
}
async function mgMoney(){
  const host=$('#mg'); const cur=new Set((S.settings.money_positions?.position_ids)||[]);
  host.innerHTML=`<div class="card col" style="gap:10px"><b>ตำแหน่งที่เห็นยอดเงินในระบบเบิกจ่าย</b><span class="xs muted">ผู้บริหารและแอดมินเห็นเสมอ ตำแหน่งอื่นเห็นเฉพาะจำนวน</span><div class="chips">${S.positions.map(p=>`<button class="chip ${cur.has(p.id)?'on':''}" data-p="${p.id}">${esc(p.name)}</button>`).join('')}</div><button class="btn btn-p btn-sm" data-save style="align-self:flex-start">บันทึก</button></div>`;
  $$('[data-p]',host).forEach(b=>b.onclick=()=>b.classList.toggle('on'));
  $('[data-save]',host).onclick=async()=>{ const ids=$$('[data-p].on',host).map(b=>+b.dataset.p); const {error}=await sb.from('app_settings').upsert({key:'money_positions',value:{position_ids:ids},updated_at:new Date().toISOString()}); if(error) return toast(errText(error),true); await loadRefs(); toast('บันทึกแล้ว'); };
}
