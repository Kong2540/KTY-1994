/* =====================================================================
   เงินเดือน (งวด 1–15 จ่าย 16 / 16–สิ้นเดือน จ่าย 1)
   ===================================================================== */
const PCOLS = {
  code:{t:'รหัส',f:d=>d.emp_code||''}, name:{t:'ชื่อ-นามสกุล',f:d=>d.name,req:1}, position:{t:'ตำแหน่ง',f:d=>d.position||''},
  type:{t:'ประเภทค่าจ้าง',f:d=>d.wage_type==='monthly'?`รายเดือน ${fmtN(d.rate)}`:`รายวัน ${fmtN(d.rate)}`},
  days:{t:'วันทำงาน',f:d=>fmtN(d.days),n:1}, leave:{t:'ลา (ได้ค่าจ้าง)',f:d=>fmtN(d.paid_leave),n:1}, holiday:{t:'วันหยุด (ได้ค่าจ้าง)',f:d=>fmtN(d.hol_paid||0),n:1},
  absent:{t:'ขาด / สาย',f:d=>`${fmtN(d.absent)} / ${fmtN(d.late)}`,n:1}, ot_hours:{t:'OT ชม.',f:d=>fmtN(d.ot_hours),n:1},
  wage:{t:'ค่าแรง / เงินเดือน',f:d=>fmtN(d.wage),n:1,m:1}, ot:{t:'ค่า OT',f:d=>fmtN(d.ot),n:1,m:1}, adds:{t:'รายการเพิ่ม',f:d=>fmtN(d.adds),n:1,m:1},
  gross:{t:'รวมก่อนหัก',f:d=>fmtN(d.gross),n:1,m:1}, sso:{t:'ประกันสังคม',f:d=>fmtN(d.sso),n:1,m:1,neg:1}, inst:{t:'สินค้า/ผ่อน',f:d=>fmtN(d.inst_sum),n:1,m:1,neg:1},
  advance:{t:'เบิกล่วงหน้า',f:d=>fmtN(d.advance),n:1,m:1,neg:1}, deducts:{t:'หักอื่น ๆ',f:d=>fmtN(d.deducts),n:1,m:1,neg:1},
  carry:{t:'ยกยอดไปงวดหน้า',f:d=>fmtN(d.carry_out),n:1,m:1}, bank:{t:'บัญชีธนาคาร',f:d=>d.bank||''}, net:{t:'สุทธิ',f:d=>fmtN(d.net),n:1,m:1,req:1}
};
const DEF_PCOLS=['code','name','position','days','ot_hours','wage','ot','adds','sso','inst','net'];
const payCols = () => { const c=(S.settings.payroll_columns?.period||DEF_PCOLS).filter(k=>PCOLS[k]); if(!c.includes('name')) c.unshift('name'); if(!c.includes('net')) c.push('net'); return c; };
const otherDed = d => (+d.inst_sum||0)+(+d.advance||0)+(+d.deducts||0);
const TH_MON_S=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const periodLabel = p => { const a=parseISO(p.start_date), b=parseISO(p.end_date); return `${a.d}–${b.d} ${TH_MON_S[b.m-1]} ${b.y+543}`; };
let payPid=null, payTab='period';

async function pagePay(a,b){
  if(a==='s') return paySlipView(+b);
  if(a==='shop') return payShop();
  if(!isManager()) return payMine();
  if(a==='p'&&b) payPid=+b;
  setPage(head('เงินเดือน','',{dActions:'<a href="#pay/shop" class="btn">สินค้าบริษัท</a>'})+'<div id="pyb"><div class="loading"><div class="spin"></div></div></div>');
  const e=await sb.rpc('ensure_period',{p_date:localISO()});
  if(e.error){ $('#pyb').outerHTML=/ensure_period/.test(e.error.message)?'<div class="card empty"><b>ยังไม่ได้อัปเดตฐานข้อมูล</b>รันไฟล์ 13_payroll.sql ใน Supabase</div>':`<div class="note n-bad">${esc(errText(e.error))}</div>`; return; }
  const [ps,od]=await Promise.all([ sb.from('pay_periods').select('*').order('start_date',{ascending:false}).limit(36), sb.from('emp_orders').select('id').eq('status','pending') ]);
  const periods=ps.data||[]; if(!payPid||!periods.some(p=>p.id===payPid)){ const cur=periods.find(p=>p.id===e.data); const prevDraft=periods.find(p=>p.status==='draft'&&p.start_date<cur.start_date); payPid=(prevDraft||cur).id; }
  const host=$('#pyb'); host.outerHTML='<div id="pyb" class="col" style="gap:12px"></div>';
  const H=$('#pyb');
  H.innerHTML=`<div class="chips scroll" style="margin:0 -16px">${[['period','งวดเงินเดือน'],['inst','ผ่อน / เบิกล่วงหน้า'],['orders',`คำสั่งซื้อสินค้า${(od.data||[]).length?` <b>${od.data.length}</b>`:''}`]].map(([k,t])=>`<button class="chip ${payTab===k?'on':''}" data-pt="${k}">${t}</button>`).join('')}</div><div id="pyc" class="col" style="gap:12px"></div>`;
  $$('[data-pt]',H).forEach(b=>b.onclick=()=>{ payTab=b.dataset.pt; pagePay(); });
  ({period:()=>payPeriod(periods),inst:payInst,orders:payOrders})[payTab]();
}

/* ---------------- งวดเงินเดือน ---------------- */
async function payPeriod(periods){
  const C=$('#pyc'), p=periods.find(x=>x.id===payPid), i=periods.indexOf(p);
  let {data:slips}=await sb.from('pay_slips').select('*').eq('period_id',p.id);
  if(p.status==='draft'&&!(slips||[]).length){ const r=await sb.rpc('calc_period',{p_period:p.id}); if(r.error) return C.innerHTML=`<div class="note n-bad">${esc(errText(r.error))}</div>`; ({data:slips}=await sb.from('pay_slips').select('*').eq('period_id',p.id)); }
  slips=(slips||[]).sort((a,b)=>(a.data.sort_order??1e9)-(b.data.sort_order??1e9)||String(a.data.emp_code).localeCompare(String(b.data.emp_code)));
  const cols=payCols(), sum=k=>slips.reduce((a,s)=>a+(+s.data[k]||0),0), closed=p.status==='closed';
  C.innerHTML=`<div class="card col" style="gap:8px"><div class="row" style="gap:8px;flex-wrap:wrap">
      <button class="ibtn" data-pp="${periods[i+1]?.id||''}" ${periods[i+1]?'':'disabled'} aria-label="งวดก่อน">${IC.back}</button>
      <div class="grow"><b style="font-size:18px">งวด ${periodLabel(p)}</b> <span class="tag ${closed?'t-ok':'t-warn'}">${closed?'ปิดงวดแล้ว':'ร่าง'}</span><div class="xs muted">จ่ายวันที่ ${thaiDate(p.pay_date)}${p.calc_at?` · คำนวณล่าสุด ${new Date(p.calc_at).toLocaleString('th-TH',{dateStyle:'short',timeStyle:'short'})}`:''}${closed?` · ปิดโดย ${esc(p.closed_by_name||'')}`:''}</div></div>
      <button class="ibtn" data-pp="${periods[i-1]?.id||''}" ${periods[i-1]?'':'disabled'} aria-label="งวดถัดไป">${IC.chev}</button></div>
    <div class="row" style="gap:8px;flex-wrap:wrap">${closed?'':'<button class="btn btn-sm" data-recalc>คำนวณใหม่จากการเช็คชื่อ</button>'}${isAdmin()?'<button class="btn btn-sm" data-cols>ตั้งค่าคอลัมน์</button>':''}<button class="btn btn-sm" data-prev>ใบสรุปเงินเดือน (PDF)</button><button class="btn btn-sm" data-slips>สลิปรายคน (PDF)</button><button class="btn btn-sm" data-sheet>ส่งออก Google Sheet</button>
      <span class="grow"></span>${closed?(isAdmin()?'<button class="btn btn-sm" data-reopen>เปิดงวดเพื่อแก้</button>':''):'<button class="btn btn-sm btn-p" data-close>ตรวจแล้ว ปิดงวด</button>'}</div></div>
    <div class="statg" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))"><div class="stat"><b class="num" style="font-size:22px">${baht(sum('net'))}</b><span class="sm muted">จ่ายสุทธิ ${slips.length} คน</span></div><div class="stat"><b class="num" style="font-size:22px">${baht(sum('gross'))}</b><span class="sm muted">รวมก่อนหัก</span></div><div class="stat"><b class="num" style="font-size:22px">${baht(sum('ot'))}</b><span class="sm muted">OT ${fmtN(sum('ot_hours'))} ชม.</span></div><div class="stat"><b class="num" style="font-size:22px;color:var(--bad)">${baht(sum('sso'))}</b><span class="sm muted">ประกันสังคม</span></div><div class="stat"><b class="num" style="font-size:22px;color:var(--bad)">${baht(sum('inst_sum')+sum('advance')+sum('deducts'))}</b><span class="sm muted">หักอื่น ๆ</span></div></div>
    <div class="card" style="padding:0;overflow-x:auto"><table class="tbl paytbl"><thead><tr><th>#</th>${cols.map(k=>`<th class="${PCOLS[k].n?'num':''}">${PCOLS[k].t}</th>`).join('')}</tr></thead><tbody>
      ${slips.map((s,ix)=>`<tr data-slip="${s.id}" style="cursor:pointer"><td class="muted">${ix+1}</td>${cols.map(k=>`<td class="${PCOLS[k].n?'num':''}" style="${PCOLS[k].neg&&+PCOLS[k].f(s.data).replace(/,/g,'')>0?'color:var(--bad)':''}">${k==='net'||k==='name'?`<b>${esc(PCOLS[k].f(s.data))}</b>`:esc(PCOLS[k].f(s.data))}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${cols.length+1}"><div class="empty"><b>ยังไม่มีพนักงานในงวดนี้</b></div></td></tr>`}
      ${slips.length?`<tr class="tot"><td></td>${cols.map(k=>`<td class="num"><b>${PCOLS[k].m?fmtN(slips.reduce((a,s)=>a+(+String(PCOLS[k].f(s.data)).replace(/,/g,'')||0),0)):k==='name'?'รวม':''}</b></td>`).join('')}</tr>`:''}</tbody></table></div>
    <span class="xs muted">แตะชื่อเพื่อดูรายละเอียด เพิ่ม/หักรายการ (คำนวณใหม่ทันที) · ยอดหักที่เกินรายได้ยกไปงวดถัดไปอัตโนมัติ</span>`;
  $$('[data-pp]',C).forEach(b=>b.onclick=()=>{ if(b.dataset.pp){ payPid=+b.dataset.pp; pagePay(); } });
  const rc=$('[data-recalc]',C); if(rc) rc.onclick=async ev=>{ busy(ev.target,true,'กำลังคำนวณ...'); const r=await sb.rpc('calc_period',{p_period:p.id}); if(r.error){ busy(ev.target,false); return toast(errText(r.error),true); } toast(`คำนวณแล้ว ${r.data} คน`); pagePay(); };
  const cl=$('[data-close]',C); if(cl) cl.onclick=async()=>{ if(!await confirmBox(`ปิดงวด ${periodLabel(p)}? ระบบจะคำนวณใหม่ครั้งสุดท้าย ตัดยอดผ่อน และพนักงานจะเห็นสลิปในแอป`,'ปิดงวด')) return; const r=await sb.rpc('close_period',{p_period:p.id}); if(r.error) return toast(errText(r.error),true); toast('ปิดงวดแล้ว'); pagePay(); };
  const ro=$('[data-reopen]',C); if(ro) ro.onclick=async()=>{ const why=await promptBox('เหตุผลที่เปิดงวด (บันทึกในประวัติ)',''); if(!why) return; const r=await sb.rpc('reopen_period',{p_period:p.id,p_reason:why}); if(r.error) return toast(errText(r.error),true); toast('เปิดงวดแล้ว'); pagePay(); };
  const co=$('[data-cols]',C); if(co) co.onclick=()=>payColsSheet(()=>pagePay());
  $('[data-prev]',C).onclick=()=>paySummaryPreview(p,slips);
  $('[data-slips]',C).onclick=()=>paySlipsPreview(p,slips);
  $('[data-sheet]',C).onclick=ev=>paySheetExport(p,slips,ev.target);
  $$('[data-slip]',C).forEach(r=>r.onclick=()=>payDetail(p,slips.find(s=>s.id==r.dataset.slip),()=>pagePay()));
}
function payColsSheet(done){
  let cur=payCols(); const all=Object.keys(PCOLS);
  const ov=overlay(`<div class="sheet" role="dialog" aria-modal="true" aria-label="ตั้งค่าคอลัมน์"></div>`,false,false); const sh=$('.sheet',ov.el);
  const draw=()=>{ const order=[...cur,...all.filter(k=>!cur.includes(k))];
    sh.innerHTML=`<header class="appbar stripe"><button class="ibtn" data-x aria-label="ปิด">${IC.close}</button><h1>ตั้งค่าคอลัมน์<small>ตารางงวดและการส่งออก Google Sheet</small></h1></header>
      <div class="sheet-body"><div class="row" style="gap:6px;flex-wrap:wrap"><span class="xs muted">ชุดสำเร็จรูป:</span><button class="chip" data-pre="std">มาตรฐาน</button><button class="chip" data-pre="full">ละเอียด</button><button class="chip" data-pre="bank">สำหรับโอนเงิน</button></div>
      <div class="card card-l">${order.map(k=>{ const on=cur.includes(k), i=cur.indexOf(k); return `<div class="li" style="gap:8px"><button class="chk ${on?'on':''}" data-tg="${k}" ${PCOLS[k].req?'disabled':''} aria-label="แสดง ${PCOLS[k].t}">${on?svg('<path d="M5 12l5 5 9-10"/>'):''}</button><span class="grow" style="${on?'':'color:var(--ink2)'}">${PCOLS[k].t}</span>${PCOLS[k].req?'<span class="tag" style="height:20px;font-size:10.5px">บังคับ</span>':''}${on?`<button class="ibtn" data-u="${i}" ${i?'':'disabled'} aria-label="ขึ้น">${svg('<path d="M6 15l6-6 6 6"/>')}</button><button class="ibtn" data-d="${i}" ${i<cur.length-1?'':'disabled'} aria-label="ลง">${svg('<path d="M6 9l6 6 6-6"/>')}</button>`:''}</div>`; }).join('')}</div></div>
      <div class="sheet-foot"><button class="btn" data-def>คืนค่าเริ่มต้น</button><button class="btn btn-p" data-save>บันทึก</button></div>`;
    $('[data-x]',sh).onclick=ov.close;
    $$('[data-tg]',sh).forEach(b=>b.onclick=()=>{ const k=b.dataset.tg; cur=cur.includes(k)?cur.filter(x=>x!==k):[...cur.slice(0,-1),k,cur.at(-1)]; draw(); });
    $$('[data-u]',sh).forEach(b=>b.onclick=()=>{ const i=+b.dataset.u; [cur[i-1],cur[i]]=[cur[i],cur[i-1]]; draw(); });
    $$('[data-d]',sh).forEach(b=>b.onclick=()=>{ const i=+b.dataset.d; [cur[i+1],cur[i]]=[cur[i],cur[i+1]]; draw(); });
    $$('[data-pre]',sh).forEach(b=>b.onclick=()=>{ cur={std:DEF_PCOLS,full:['code','name','position','type','days','leave','holiday','absent','ot_hours','wage','ot','adds','gross','sso','inst','advance','deducts','carry','net'],bank:['code','name','bank','net']}[b.dataset.pre].slice(); draw(); });
    $('[data-def]',sh).onclick=()=>{ cur=DEF_PCOLS.slice(); draw(); };
    $('[data-save]',sh).onclick=async ev=>{ busy(ev.target,true); try{ await saveSetting('payroll_columns',{...(S.settings.payroll_columns||{}),period:cur}); ov.close(); toast('บันทึกคอลัมน์แล้ว'); done(); }catch(e){ busy(ev.target,false); toast(e.message,true); } };
  };
  draw();
}
function payBreak(d){
  const L=[]; const add=(t,v,c='')=>L.push(`<div class="kv"><span>${t}</span><span class="num" style="${c}">${v}</span></div>`);
  if(d.wage_type==='monthly') add(`เงินเดือน ${fmtN(d.rate)} ÷ 2${+d.unpaid?` หักขาด/ลาไม่ได้ค่าจ้าง ${fmtN(d.unpaid)} วัน`:''}`,fmtN(d.wage));
  else add(`ค่าแรง ${fmtN(d.days)} วัน${+d.paid_leave?` + ลาได้ค่าจ้าง ${fmtN(d.paid_leave)}`:''}${+d.hol_paid?` + วันหยุดได้ค่าจ้าง ${fmtN(d.hol_paid)}`:''} × ${fmtN(d.rate)}`,fmtN(d.wage));
  if(+d.ot_hours) add(`OT ${fmtN(d.ot_hours)} ชม. × ${fmtN(d.ot_rate)}`,fmtN(d.ot));
  (d.items||[]).filter(x=>x.kind==='add').forEach(x=>add(`+ ${esc(x.label)}`,fmtN(x.amount)));
  add('<b>รวมรายได้ (ก่อนหัก)</b>',`<b>${fmtN(d.gross)}</b>`);
  if(+d.sso) add('ประกันสังคม',`−${fmtN(d.sso)}`,'color:var(--bad)');
  (d.inst||[]).forEach(x=>add(`${x.kind==='advance'?'เบิกล่วงหน้า':'สินค้า'}: ${esc(x.title)} (งวด ${x.no}/${x.of})`,`−${fmtN(x.amount)}`,'color:var(--bad)'));
  (d.items||[]).filter(x=>x.kind==='deduct').forEach(x=>add(`− ${esc(x.label)}`,`−${fmtN(x.amount)}`,'color:var(--bad)'));
  add('<b>รับสุทธิ</b>',`<b style="font-size:18px">${fmtN(d.net)}</b>`);
  if(+d.carry_out) add('ยอดหักที่ยกไปงวดถัดไป',fmtN(d.carry_out),'color:var(--warn)');
  return `<div class="card" style="padding:4px 16px">${L.join('')}</div><span class="xs muted">มา ${fmtN(d.present)} · สาย ${fmtN(d.late)} · ครึ่งวัน ${fmtN(d.half)} · ลาป่วย ${fmtN(d.sick)} · ลากิจ ${fmtN(d.personal)} · พักร้อน ${fmtN(d.vacation)} · ขาด ${fmtN(d.absent)}${+d.hol_paid||+d.hol_unpaid?` · วันหยุด ${fmtN((+d.hol_paid||0)+(+d.hol_unpaid||0))}`:''}</span>`;
}
function payDetail(p, s, done){
  const d=s.data, closed=p.status==='closed';
  const ov=overlay(`<div class="sheet" role="dialog" aria-modal="true" aria-label="รายละเอียดเงินเดือน"><header class="appbar stripe"><button class="ibtn" data-x aria-label="ปิด">${IC.close}</button><h1>${esc(d.name)}<small>${esc(d.emp_code||'')} · งวด ${periodLabel(p)}</small></h1></header>
    <div class="sheet-body">${payBreak(d)}
      ${closed?'':`<div class="card col" style="gap:8px"><b class="sm">เพิ่มรายการงวดนี้</b><div class="seg"><button class="on" data-k="add">เพิ่มเงิน</button><button data-k="deduct">หักเงิน</button></div><input class="in" id="pi_l" placeholder="เช่น เบี้ยขยัน / ค่าเสียหาย"><div class="row" style="gap:8px"><input class="in num" id="pi_a" type="number" inputmode="decimal" placeholder="จำนวนเงิน" style="max-width:160px"><button class="btn btn-p" data-addi>เพิ่ม</button></div></div>
      ${(d.items||[]).filter(x=>x.source==='manual').length?`<div class="card card-l">${d.items.filter(x=>x.source==='manual').map(x=>`<div class="li"><span class="grow">${x.kind==='add'?'+':'−'} ${esc(x.label)}</span><b class="num">${fmtN(x.amount)}</b><button class="ibtn" data-deli="${x.id}" aria-label="ลบ">${IC.close}</button></div>`).join('')}</div>`:''}`}</div>
    <div class="sheet-foot"><a class="btn" href="#pay/s/${s.id}">หน้าสลิปเต็ม</a><button class="btn btn-p" data-x2>ปิด</button></div></div>`,false,false);
  let kind='add';
  const close=()=>{ ov.close(); done(); };
  $('[data-x]',ov.el).onclick=close; $('[data-x2]',ov.el).onclick=close;
  $$('[data-k]',ov.el).forEach(b=>b.onclick=()=>{ kind=b.dataset.k; $$('[data-k]',ov.el).forEach(x=>x.classList.toggle('on',x===b)); });
  const recalc=async()=>{ const r=await sb.rpc('calc_period',{p_period:p.id}); if(r.error) throw r.error; const n=await sb.from('pay_slips').select('*').eq('period_id',p.id).eq('employee_id',s.employee_id).single(); ov.close(); payDetail(p,n.data,done); };
  const ad=$('[data-addi]',ov.el); if(ad) ad.onclick=async ev=>{ const l=$('#pi_l',ov.el).value.trim(), a=Number($('#pi_a',ov.el).value); if(!l||!(a>0)) return toast('ใส่ชื่อรายการและจำนวนเงิน',true);
    busy(ev.target,true); const {error}=await sb.from('pay_items').insert({period_id:p.id,employee_id:s.employee_id,kind,label:l,amount:a}); if(error){ busy(ev.target,false); return toast(errText(error),true); }
    try{ await recalc(); toast('เพิ่มแล้ว คำนวณใหม่แล้ว'); }catch(e){ toast(errText(e),true); } };
  $$('[data-deli]',ov.el).forEach(b=>b.onclick=async()=>{ if(!await confirmBox('ลบรายการนี้?','ลบ',true)) return; const {error}=await sb.from('pay_items').delete().eq('id',+b.dataset.deli); if(error) return toast(errText(error),true); try{ await recalc(); }catch(e){ toast(errText(e),true); } });
}

/* ---------------- ตัวอย่างก่อนพิมพ์ ---------------- */
const MM=3.7795;
const PPRINT_DEF={margin:{t:12,r:10,b:12,l:10},font:11,sign:true,sign_w:34,widths:{}};
const pprint = () => { const s=S.settings.payroll_print||{}; return {...PPRINT_DEF,...s,margin:{...PPRINT_DEF.margin,...(s.margin||{})},widths:{...(s.widths||{})}}; };
function pgHead(p,t){ const B=BR(); return `<div class="pg-head">${B.logo?`<img src="${B.logo}" crossorigin="anonymous" alt="">`:`<span class="pg-mark">${esc(B.mark)}</span>`}<div class="grow"><b>${esc(B.company_th)}</b><span>${esc(B.company_en)}</span></div><div class="pg-ti"><b>${t}</b><span>งวด ${periodLabel(p)} · จ่ายวันที่ ${thaiDate(p.pay_date)}</span></div></div>`; }
async function pdfFromPages(els, orient, name){
  await Promise.all([loadScript(LIB.h2c),loadScript(LIB.pdf)]); await document.fonts?.ready;
  const L=orient==='l', pdf=new jspdf.jsPDF({unit:'mm',format:'a4',orientation:L?'landscape':'portrait'});
  for(let i=0;i<els.length;i++){ const clone=els[i].cloneNode(true); clone.classList.add('a4-render'); clone.style.zoom='1'; document.body.appendChild(clone);
    const cv=await html2canvas(clone,{scale:2,backgroundColor:'#ffffff',useCORS:true,logging:false}); clone.remove();
    if(i) pdf.addPage('a4',L?'landscape':'portrait'); pdf.addImage(cv.toDataURL('image/jpeg',.92),'JPEG',0,0,L?297:210,L?210:297); }
  pdf.save(name);
}
/* ใบสรุปเงินเดือน: A4 แนวนอน ปรับขอบ ขนาดตัวอักษร ความกว้างคอลัมน์ และช่องลงชื่อรับเงิน */
function paySummaryPreview(p, slips){
  const cfg=pprint(), cols=payCols(), admin=isAdmin();
  const ov=overlay(`<div class="sheet sheet-wide" role="dialog" aria-modal="true" aria-label="ใบสรุปเงินเดือน"><header class="appbar stripe"><button class="ibtn" data-x aria-label="ปิด">${IC.close}</button><h1>ใบสรุปเงินเดือน<small>A4 แนวนอน · งวด ${periodLabel(p)}</small></h1></header>
    <div class="sheet-body"><div class="prt-ctl card col" style="gap:10px">
      <div class="row" style="gap:10px;flex-wrap:wrap;align-items:flex-end"><b class="sm" style="width:100%">ระยะขอบกระดาษ (มม.)</b>${[['t','บน'],['r','ขวา'],['b','ล่าง'],['l','ซ้าย']].map(([k,t])=>`<label class="field" style="width:78px"><span class="xs muted">${t}</span><input class="in num" type="number" min="0" max="40" data-m="${k}" value="${cfg.margin[k]}" style="height:38px"></label>`).join('')}
        <label class="field" style="width:150px"><span class="xs muted">ขนาดตัวอักษร: <b data-fv>${cfg.font}</b> pt</span><input type="range" min="8" max="16" step="0.5" data-font value="${cfg.font}"></label>
        <label class="row sm" style="gap:6px"><input type="checkbox" data-sign ${cfg.sign?'checked':''}>ช่องลงชื่อรับเงิน</label></div>
      <details><summary class="sm" style="cursor:pointer"><b>ความกว้างคอลัมน์ (มม. · ว่าง = อัตโนมัติ)</b></summary><div class="row" style="gap:8px;flex-wrap:wrap;margin-top:8px">${['#',...cols,...(cfg.sign?['_sign']:[])].map(k=>`<label class="field" style="width:118px"><span class="xs muted">${k==='#'?'ลำดับ':k==='_sign'?'ลงชื่อรับเงิน':PCOLS[k].t}</span><input class="in num" type="number" min="5" max="120" data-w="${k}" value="${k==='_sign'?cfg.sign_w:(cfg.widths[k]??'')}" placeholder="อัตโนมัติ" style="height:36px"></label>`).join('')}</div></details>
      ${admin?'<div class="row" style="gap:8px"><button class="btn btn-sm" data-def>คืนค่าเริ่มต้น</button><button class="btn btn-sm" data-savecfg>บันทึกเป็นค่าเริ่มต้นของบริษัท</button></div>':''}</div>
      <div class="pg-wrap" id="pgw"></div></div>
    <div class="sheet-foot" style="flex-wrap:wrap"><span class="sm muted grow" id="pgn"></span><button class="btn btn-p" data-pdf>ดาวน์โหลด PDF ใบสรุป</button></div></div>`,false,false);
  const W=$('#pgw',ov.el);
  const render=()=>{
    const m=cfg.margin, colsAll=['#',...cols,...(cfg.sign?['_sign']:[])];
    const th=k=>k==='#'?'#':k==='_sign'?'ลงชื่อรับเงิน':PCOLS[k].t, num=k=>k!=='#'&&k!=='_sign'&&PCOLS[k].n;
    const wcss=k=>{ const w=k==='_sign'?cfg.sign_w:cfg.widths[k]; return w?`width:${w}mm`:''; };
    const page=()=>{ const d=document.createElement('div'); d.className='a4 a4l'; d.style.padding=`${m.t}mm ${m.r}mm ${m.b}mm ${m.l}mm`; d.style.fontSize=cfg.font+'pt';
      d.innerHTML=`${pgHead(p,'ใบสรุปเงินเดือน')}<table class="pg-tbl" style="font-size:${cfg.font}pt"><colgroup>${colsAll.map(k=>`<col style="${wcss(k)}">`).join('')}</colgroup><thead><tr>${colsAll.map(k=>`<th class="${num(k)?'r':''}">${th(k)}</th>`).join('')}</tr></thead><tbody></tbody></table><div class="pg-foot"></div>`; W.appendChild(d); return d; };
    W.innerHTML=''; let pg=page(), body=$('tbody',pg); const pages=[pg];
    const avail=()=>pg.clientHeight-m.b*MM-14;
    const rowHTML=(s,i)=>`<tr>${colsAll.map(k=>k==='#'?`<td>${i+1}</td>`:k==='_sign'?'<td class="sgn"></td>':`<td class="${num(k)?'r':''}">${esc(PCOLS[k].f(s.data))}</td>`).join('')}</tr>`;
    slips.forEach((s,i)=>{ body.insertAdjacentHTML('beforeend',rowHTML(s,i)); const tb=$('table',pg); if(tb.offsetTop+tb.offsetHeight>avail()&&body.rows.length>1){ body.lastElementChild.remove(); pg=page(); pages.push(pg); body=$('tbody',pg); body.insertAdjacentHTML('beforeend',rowHTML(s,i)); } });
    const tot=`<tr class="tt">${colsAll.map(k=>`<td class="r">${k!=='#'&&k!=='_sign'&&PCOLS[k].m?fmtN(slips.reduce((a,s)=>a+(+String(PCOLS[k].f(s.data)).replace(/,/g,'')||0),0)):k==='name'?'รวมทั้งสิ้น':''}</td>`).join('')}</tr>`;
    const sign=`<div class="pg-sign"><div>ผู้จัดทำ ..............................</div><div>ผู้ตรวจสอบ ..............................</div><div>ผู้อนุมัติ ..............................</div></div>`;
    body.insertAdjacentHTML('beforeend',tot); pg.insertAdjacentHTML('beforeend',sign);
    const over=()=>{ const sg=$('.pg-sign',pg); return sg.offsetTop+sg.offsetHeight>avail(); };
    if(over()){ body.lastElementChild.remove(); $('.pg-sign',pg).remove(); pg=page(); pages.push(pg); body=$('tbody',pg); body.insertAdjacentHTML('beforeend',tot); pg.insertAdjacentHTML('beforeend',sign); }
    pages.forEach((x,i)=>{ $('.pg-foot',x).textContent=`${BR().app} · หน้า ${i+1}/${pages.length}`; $('.pg-foot',x).style.right=m.r+'mm'; $('.pg-foot',x).style.bottom=Math.max(3,m.b/2)+'mm'; });
    $('#pgn',ov.el).textContent=`${pages.length} หน้า · ${slips.length} คน`;
  };
  render();
  $('[data-x]',ov.el).onclick=ov.close;
  $$('[data-m]',ov.el).forEach(i=>i.oninput=()=>{ cfg.margin[i.dataset.m]=Math.max(0,Math.min(40,+i.value||0)); render(); });
  $('[data-font]',ov.el).oninput=e=>{ cfg.font=+e.target.value; $('[data-fv]',ov.el).textContent=cfg.font; render(); };
  $('[data-sign]',ov.el).onchange=e=>{ cfg.sign=e.target.checked; render(); };
  $$('[data-w]',ov.el).forEach(i=>i.oninput=()=>{ const k=i.dataset.w, v=i.value===''?null:Math.max(5,Math.min(120,+i.value)); if(k==='_sign') cfg.sign_w=v||34; else if(v) cfg.widths[k]=v; else delete cfg.widths[k]; render(); });
  const df=$('[data-def]',ov.el); if(df) df.onclick=()=>{ ov.close(); S.settings.payroll_print_tmp=null; const keep=S.settings.payroll_print; S.settings.payroll_print=null; paySummaryPreview(p,slips); S.settings.payroll_print=keep; };
  const sc=$('[data-savecfg]',ov.el); if(sc) sc.onclick=async ev=>{ busy(ev.target,true); try{ await saveSetting('payroll_print',cfg); busy(ev.target,false); toast('บันทึกการตั้งค่าหน้ากระดาษแล้ว'); }catch(e){ busy(ev.target,false); toast(e.message,true); } };
  $('[data-pdf]',ov.el).onclick=async ev=>{ busy(ev.target,true,'กำลังสร้าง PDF...'); try{ await pdfFromPages($$('.a4',W),'l',`ใบสรุปเงินเดือน_${p.start_date}_${p.end_date}.pdf`); busy(ev.target,false); toast('ดาวน์โหลดแล้ว'); }catch(e){ busy(ev.target,false); toast(errText(e),true); } };
}
/* สลิปรายคน: 8 ใบ/A4 แนวตั้ง พร้อม QR */
async function paySlipsPreview(p, slips){
  try{ await loadScript(LIB.qr); }catch(e){ return toast(errText(e),true); }
  const B=BR(), logo=B.logo, pages=[];
  const qrSvg=t=>{ const q=qrcode(0,'M'); q.addData(t); q.make(); return q.createSvgTag({cellSize:2,margin:0,scalable:true}); };
  const base=`${location.origin}${location.pathname}#pay/s/`;
  for(let i=0;i<slips.length;i+=8){ const chunk=slips.slice(i,i+8);
    pages.push(`<div class="a4 a4slips">${chunk.map(s=>{ const d=s.data; return `<div class="slip"><div class="sl-h">${logo?`<img src="${logo}" crossorigin="anonymous" alt="">`:`<span class="pg-mark sm">${esc(B.mark)}</span>`}<div class="grow"><b>${esc(B.company_short)}</b><span>สลิปเงินเดือน · งวด ${periodLabel(p)}</span></div><div class="sl-qr">${qrSvg(base+s.id)}</div></div>
      <div class="sl-n"><b>${esc(d.name)}</b><span>${esc(d.emp_code||'')}${d.position?' · '+esc(d.position):''}</span></div>
      <div class="sl-r"><span>อัตราค่าแรง</span><b>${d.wage_type==='monthly'?`${fmtN(d.rate)} /เดือน`:`${fmtN(d.rate)} /วัน`}</b></div>
      <div class="sl-r"><span>วันทำงาน · OT</span><b>${fmtN(d.days)} วัน · ${fmtN(d.ot_hours)} ชม.</b></div>
      <div class="sl-r"><span>รวมก่อนหัก</span><b>${fmtN(d.gross)}</b></div>
      <div class="sl-r"><span>หักประกันสังคม</span><b>−${fmtN(d.sso)}</b></div>
      <div class="sl-r"><span>หักอื่น ๆ</span><b>−${fmtN(otherDed(d))}</b></div>
      <div class="sl-net"><span>รับสุทธิ</span><b>${fmtN(d.net)}</b></div>
      <div class="sl-f"><span>โปรดตรวจสอบจำนวนเงินให้เรียบร้อยก่อนออกจากบริษัทฯ</span><span>สแกน QR ดูรายละเอียด</span></div></div>`; }).join('')}</div>`); }
  const ov=overlay(`<div class="sheet sheet-wide" role="dialog" aria-modal="true" aria-label="สลิปรายคน"><header class="appbar stripe"><button class="ibtn" data-x aria-label="ปิด">${IC.close}</button><h1>สลิปรายคน<small>${slips.length} ใบ · ${pages.length} หน้า A4 (8 ใบ/หน้า ตัดตามเส้นประ)</small></h1></header>
    <div class="sheet-body"><div class="pg-wrap">${pages.join('')||'<div class="card empty"><b>ยังไม่มีสลิป</b></div>'}</div></div>
    <div class="sheet-foot"><button class="btn btn-p" data-pdf ${slips.length?'':'disabled'}>ดาวน์โหลด PDF สลิป</button></div></div>`,false,false);
  $('[data-x]',ov.el).onclick=ov.close;
  $('[data-pdf]',ov.el).onclick=async ev=>{ busy(ev.target,true,'กำลังสร้าง PDF...'); try{ await pdfFromPages($$('.a4',ov.el),'p',`สลิปเงินเดือน_${p.start_date}_${p.end_date}.pdf`); busy(ev.target,false); toast('ดาวน์โหลดแล้ว'); }catch(e){ busy(ev.target,false); toast(errText(e),true); } };
}
async function paySheetExport(p, slips, btn){
  if(!hasBridge()) return toast('ต้องติดตั้ง Bridge ก่อน',true);
  const cols=payCols(); busy(btn,true,'กำลังสร้างชีต...');
  try{
    const r=await bridge('pay_sheet',{title:`เงินเดือน งวด ${periodLabel(p)} (จ่าย ${thaiDate(p.pay_date)})`, company:BR().company_th,
      summary:{headers:['#',...cols.map(k=>PCOLS[k].t),'ลงชื่อรับเงิน'], rows:slips.map((s,i)=>[i+1,...cols.map(k=>PCOLS[k].m||PCOLS[k].n?Number(String(PCOLS[k].f(s.data)).replace(/,/g,''))||0:PCOLS[k].f(s.data)),''])},
      slips:{headers:['รหัส','ชื่อ-นามสกุล','ตำแหน่ง','อัตราค่าแรง','วันทำงาน','OT ชม.','รวมก่อนหัก','หักประกันสังคม','หักอื่น ๆ','รับสุทธิ','ลิงก์รายละเอียด'],
        rows:slips.map(s=>{ const d=s.data; return [d.emp_code||'',d.name,d.position||'',`${fmtN(d.rate)} /${d.wage_type==='monthly'?'เดือน':'วัน'}`,+d.days,+d.ot_hours,+d.gross,+d.sso,otherDed(d),+d.net,`${location.origin}${location.pathname}#pay/s/${s.id}`]; })}});
    busy(btn,false); window.open(r.url,'_blank'); toast('สร้าง Google Sheet แล้ว');
  }catch(e){ busy(btn,false); toast(errText(e),true); }
}

/* ---------------- สลิป (QR / พนักงานดูของตัวเอง) ---------------- */
async function paySlipView(id){
  setPage(head('สลิปเงินเดือน','',{back:isManager()?'#pay':'#pay'})+'<div id="psv"><div class="loading"><div class="spin"></div></div></div>');
  const {data:s,error}=await sb.from('pay_slips').select('*, pay_periods(*)').eq('id',id).maybeSingle();
  if(error||!s){ $('#psv').outerHTML='<div class="card empty"><b>ไม่พบสลิป หรือไม่มีสิทธิ์ดู</b>พนักงานเห็นเฉพาะสลิปของตัวเองหลังปิดงวด</div>'; return; }
  const p=s.pay_periods, d=s.data;
  $('#psv').outerHTML=`<div class="col" style="gap:12px;max-width:640px"><div class="card col" style="gap:4px"><b style="font-size:18px">${esc(d.name)}</b><span class="sm muted">${esc(d.emp_code||'')}${d.position?' · '+esc(d.position):''} · งวด ${periodLabel(p)} · จ่าย ${thaiDate(p.pay_date)}</span>${p.status==='closed'?'':'<span class="tag t-warn" style="align-self:flex-start">ร่าง (ยังไม่ปิดงวด)</span>'}</div>${payBreak(d)}</div>`;
}
async function payMine(){
  setPage(head('สลิปเงินเดือนของฉัน','',{dActions:'<a href="#pay/shop" class="btn">สินค้าบริษัท</a>'})+'<div id="pm"><div class="loading"><div class="spin"></div></div></div>');
  const [sl,ins,od]=await Promise.all([ sb.from('pay_slips').select('id,net,data,pay_periods(start_date,end_date,pay_date,status)').order('id',{ascending:false}).limit(24),
    sb.from('installments').select('*').eq('status','active'), sb.from('emp_orders').select('*').order('created_at',{ascending:false}).limit(10) ]);
  if(sl.error){ $('#pm').outerHTML='<div class="card empty"><b>ระบบเงินเดือนยังไม่เปิดใช้งาน</b></div>'; return; }
  const slips=(sl.data||[]).filter(s=>s.pay_periods?.status==='closed').sort((a,b)=>b.pay_periods.start_date.localeCompare(a.pay_periods.start_date));
  $('#pm').outerHTML=`<div class="col" style="gap:12px;max-width:640px"><a href="#pay/shop" class="btn hide-desk">สินค้าบริษัท (หักเงินเดือน)</a>
    ${slips.length?`<div class="card card-l">${slips.map(s=>`<a href="#pay/s/${s.id}" class="li" style="text-decoration:none">${modIcon('payroll',40)}<div class="grow"><b>งวด ${periodLabel(s.pay_periods)}</b><span class="xs muted">จ่าย ${thaiDate(s.pay_periods.pay_date)}</span></div><b class="num">${baht(s.net)}</b>${IC.chev}</a>`).join('')}</div>`:'<div class="card empty"><b>ยังไม่มีสลิป</b>สลิปจะแสดงหลังผู้บริหารปิดงวด</div>'}
    ${(ins.data||[]).length?`<h3 class="h2">ยอดผ่อนคงเหลือ</h3><div class="card card-l">${ins.data.map(i=>`<div class="li"><div class="grow"><b>${esc(i.title)}</b><span class="xs muted">${i.kind==='advance'?'เบิกล่วงหน้า':'สินค้าบริษัท'} · งวดละ ${baht(i.per_period)}</span></div><b class="num">${baht(i.total-i.paid)}</b></div>`).join('')}</div>`:''}
    ${(od.data||[]).length?`<h3 class="h2">คำสั่งซื้อของฉัน</h3><div class="card card-l">${od.data.map(o=>`<div class="li"><div class="grow"><b>${esc(o.items.map(x=>x.name+' ×'+x.qty).join(', '))}</b><span class="xs muted">${baht(o.total)} · ผ่อน ${o.n_periods} งวด</span></div><span class="tag ${o.status==='approved'?'t-ok':o.status==='pending'?'t-warn':'t-bad'}">${{pending:'รออนุมัติ',approved:'อนุมัติแล้ว',rejected:'ไม่อนุมัติ',cancelled:'ยกเลิก'}[o.status]}</span></div>`).join('')}</div>`:''}</div>`;
}

/* ---------------- สินค้าบริษัท ---------------- */
async function payShop(){
  setPage(head('สินค้าบริษัท','สั่งแล้วหักเงินเดือน',{back:'#pay'})+'<div id="psh"><div class="loading"><div class="spin"></div></div></div>');
  const {data:items,error}=await sb.rpc('shop_items');
  if(error){ $('#psh').outerHTML='<div class="card empty"><b>ยังไม่ได้อัปเดตฐานข้อมูล</b>รันไฟล์ 13_payroll.sql</div>'; return; }
  const mx=Number(S.settings.payroll_rules?.max_installments||6), cart={}; let n=1, emp=S.profile.employee_id||'';
  const pick=isManager()||S.profile.role==='foreman';
  const emps=pick?(S.employees||[]).filter(e=>e.status!=='resigned'):[];
  if(pick&&!emps.length&&isManager()){ const {data}=await sb.from('employees').select('id,emp_code,first_name,last_name,nickname,status').neq('status','resigned').order('sort_order',{nullsFirst:false}); emps.push(...(data||[])); }
  const H=$('#psh'); H.outerHTML='<div id="psh" class="col" style="gap:12px;max-width:720px"></div>'; const host=$('#psh');
  const draw=()=>{ const tot=Object.entries(cart).reduce((a,[id,q])=>a+q*(items.find(x=>x.id===id)?.price||0),0);
    host.innerHTML=`${pick&&emps.length?`<div class="field"><label for="sh_e">สั่งให้</label><select class="in" id="sh_e"><option value="">— เลือกพนักงาน —</option>${emps.map(e=>`<option value="${e.id}" ${e.id===emp?'selected':''}>${esc((e.emp_code?e.emp_code+' · ':'')+e.first_name+' '+e.last_name)}</option>`).join('')}</select></div>`:''}
      <div class="card card-l">${(items||[]).map(it=>{ const q=cart[it.id]||0; return `<div class="li">${it.image_url?`<img class="mthumb" src="${esc(it.image_url)}" alt="">`:`<div class="av" style="width:44px;height:44px">${esc(it.name.slice(0,1))}</div>`}<div class="grow"><b>${esc(it.name)}</b><span class="xs muted">${esc(it.spec||'')} · คงเหลือ ${fmtN(it.stock)} ${esc(it.unit)}</span></div><b class="num sm">${baht(it.price)}</b>${q?`<button class="btn btn-sm" data-d="${it.id}" style="width:36px;padding:0">−</button><b class="num" style="width:26px;text-align:center">${q}</b>`:''}<button class="btn btn-sm ${q?'btn-p':''}" data-i="${it.id}" ${it.stock>q?'':'disabled'} style="width:36px;padding:0">+</button></div>`; }).join('')||'<div class="empty"><b>ยังไม่มีสินค้า</b>แอดมินเพิ่มได้ที่ จัดการ > วัสดุ (ประเภท "สินค้าขายพนักงาน")</div>'}</div>
      <div class="card col" style="gap:8px"><b class="sm">การหักเงิน</b><div class="chips">${Array.from({length:mx},(_,i)=>i+1).map(k=>`<button class="chip ${k===n?'on':''}" data-n="${k}">${k===1?'หักงวดถัดไป':`ผ่อน ${k} งวด`}</button>`).join('')}</div>${tot?`<span class="xs muted">งวดละ ${baht(Math.ceil(tot/n))} · เริ่มหักงวดถัดไป</span>`:''}</div>
      <div class="savebar"><div class="grow"><span class="xs muted">รวม</span><br><b>${baht(tot)}</b></div><button class="btn btn-p" data-go ${tot?'':'disabled'}>ส่งคำสั่งซื้อ</button></div>`;
    $$('[data-i]',host).forEach(b=>b.onclick=()=>{ cart[b.dataset.i]=(cart[b.dataset.i]||0)+1; draw(); });
    $$('[data-d]',host).forEach(b=>b.onclick=()=>{ const v=(cart[b.dataset.d]||0)-1; if(v>0) cart[b.dataset.d]=v; else delete cart[b.dataset.d]; draw(); });
    $$('[data-n]',host).forEach(b=>b.onclick=()=>{ n=+b.dataset.n; draw(); });
    const se=$('#sh_e'); if(se) se.onchange=()=>{ emp=se.value; };
    const go=$('[data-go]',host); if(go) go.onclick=async ev=>{ if(!emp) return toast('เลือกพนักงานที่จะหักเงิน',true); busy(ev.target,true);
      const {error}=await sb.rpc('create_emp_order',{p_emp:emp,p_items:Object.entries(cart).map(([material_id,qty])=>({material_id,qty})),p_n:n,p_note:null});
      if(error){ busy(ev.target,false); return toast(errText(error),true); } toast('ส่งคำสั่งซื้อแล้ว รอผู้บริหารอนุมัติ'); location.hash=isManager()?'#pay':'#pay'; };
  };
  draw();
}
async function payOrders(){
  const C=$('#pyc'); const {data}=await sb.from('emp_orders').select('*, employees(emp_code,first_name,last_name)').order('created_at',{ascending:false}).limit(60);
  const list=data||[];
  C.innerHTML=list.length?`<div class="card card-l">${list.map(o=>`<div class="li" style="align-items:flex-start"><div class="grow"><b>${esc(o.employees?`${o.employees.first_name} ${o.employees.last_name}`:'')}</b><span class="xs muted">${esc(o.items.map(x=>x.name+' ×'+x.qty).join(', '))} · ${baht(o.total)} · ผ่อน ${o.n_periods} งวด · สั่งโดย ${esc(o.requested_name||'')}</span></div>
    ${o.status==='pending'?`<div class="row" style="gap:6px"><button class="btn btn-sm btn-bad" data-no="${o.id}">ไม่อนุมัติ</button><button class="btn btn-sm btn-p" data-ok="${o.id}">อนุมัติ</button></div>`:`<span class="tag ${o.status==='approved'?'t-ok':'t-bad'}">${{approved:'อนุมัติแล้ว',rejected:'ไม่อนุมัติ',cancelled:'ยกเลิก'}[o.status]}</span>`}</div>`).join('')}</div>`:'<div class="card empty"><b>ยังไม่มีคำสั่งซื้อ</b></div>';
  $$('[data-ok]',C).forEach(b=>b.onclick=async()=>{ const {error}=await sb.rpc('decide_emp_order',{p_id:+b.dataset.ok,p_ok:true,p_reason:null}); if(error) return toast(errText(error),true); toast('อนุมัติแล้ว ตัดสต็อกและตั้งยอดผ่อนแล้ว'); pagePay(); });
  $$('[data-no]',C).forEach(b=>b.onclick=async()=>{ const r=await promptBox('เหตุผลที่ไม่อนุมัติ',''); if(r===null) return; const {error}=await sb.rpc('decide_emp_order',{p_id:+b.dataset.no,p_ok:false,p_reason:r}); if(error) return toast(errText(error),true); pagePay(); });
}
async function payInst(){
  const C=$('#pyc'); const [ins,em]=await Promise.all([ sb.from('installments').select('*, employees(emp_code,first_name,last_name)').order('created_at',{ascending:false}).limit(100), sb.from('employees').select('id,emp_code,first_name,last_name,status').neq('status','resigned').order('sort_order',{nullsFirst:false}) ]);
  const list=ins.data||[], emps=em.data||[], mx=Number(S.settings.payroll_rules?.max_installments||6);
  C.innerHTML=`<form class="card col" id="adv" style="gap:8px"><b class="sm">บันทึกเบิกเงินล่วงหน้า</b><select class="in" name="e" required><option value="">— เลือกพนักงาน —</option>${emps.map(e=>`<option value="${e.id}">${esc((e.emp_code?e.emp_code+' · ':'')+e.first_name+' '+e.last_name)}</option>`).join('')}</select>
      <div class="g2"><input class="in num" name="a" type="number" inputmode="decimal" placeholder="จำนวนเงิน" required><select class="in" name="n">${Array.from({length:mx},(_,i)=>`<option value="${i+1}">${i?`ผ่อน ${i+1} งวด`:'หักงวดถัดไป'}</option>`).join('')}</select></div><input class="in" name="t" placeholder="หมายเหตุ เช่น เบิกค่ารักษาพยาบาล"><button class="btn btn-p btn-sm" style="align-self:flex-start">บันทึก</button></form>
    <div class="card card-l">${list.map(i=>`<div class="li"><div class="grow"><b>${esc(i.employees?`${i.employees.first_name} ${i.employees.last_name}`:'')}</b><span class="xs muted">${i.kind==='advance'?'เบิกล่วงหน้า':'สินค้า'} · ${esc(i.title)} · ${baht(i.total)} / ${i.n_periods} งวด · เริ่ม ${thaiDate(i.start_date)}</span></div><b class="num sm">${baht(i.total-i.paid)}</b><span class="tag ${i.status==='active'?'t-acc':i.status==='done'?'t-ok':''}">${{active:'กำลังหัก',done:'ครบแล้ว',cancelled:'ยกเลิก'}[i.status]}</span>${i.status==='active'&&!+i.paid?`<button class="ibtn" data-cx="${i.id}" aria-label="ยกเลิก">${IC.close}</button>`:''}</div>`).join('')||'<div class="empty"><b>ยังไม่มีรายการผ่อน</b></div>'}</div>`;
  $('#adv').onsubmit=async e=>{ e.preventDefault(); const f=e.target; const {error}=await sb.rpc('add_advance',{p_emp:f.e.value,p_amount:Number(f.a.value),p_n:Number(f.n.value),p_title:f.t.value.trim()||null}); if(error) return toast(errText(error),true); toast('บันทึกแล้ว เริ่มหักงวดถัดไป'); pagePay(); };
  $$('[data-cx]',C).forEach(b=>b.onclick=async()=>{ if(!await confirmBox('ยกเลิกรายการผ่อนนี้?','ยกเลิก',true)) return; const {error}=await sb.from('installments').update({status:'cancelled'}).eq('id',+b.dataset.cx); if(error) return toast(errText(error),true); pagePay(); });
}

/* ---------------- ตั้งค่าระบบ: กติกาเงินเดือน + วันหยุดบริษัท ---------------- */
function stPayroll(host){
  const r={leave_paid:{sick:true,personal:false,vacation:true},late_full_day:true,monthly_divisor:30,sso_rate:0.05,sso_floor:1650,sso_ceiling:17500,max_installments:6,carry_negative:true,...(S.settings.payroll_rules||{})};
  const tg=(k,t,on)=>`<div class="li" style="padding:6px 0"><span class="grow">${t}</span><button class="sw ${on?'on':''}" data-t="${k}" role="switch" aria-label="${t}"></button></div>`;
  host.innerHTML=`<div class="card col" style="gap:10px"><b>การลาที่ได้ค่าจ้าง (พนักงานรายวัน)</b>${tg('sick','ลาป่วย',r.leave_paid.sick)}${tg('personal','ลากิจ',r.leave_paid.personal)}${tg('vacation','ลาพักร้อน',r.leave_paid.vacation)}${tg('late','มาสายนับเต็มวัน (ปิด = นับครึ่งวัน)',r.late_full_day)}${tg('carry','หักไม่หมด ยกยอดไปงวดถัดไป',r.carry_negative)}</div>
    <div class="card col" style="gap:10px"><b>ตัวเลข</b><div class="g2"><div class="field"><label>ประกันสังคม (%)</label><input class="in num" data-n="sso_rate" value="${r.sso_rate*100}"></div><div class="field"><label>ฐานขั้นต่ำ (บาท/เดือน)</label><input class="in num" data-n="sso_floor" value="${r.sso_floor}"></div></div>
      <div class="g2"><div class="field"><label>เพดานฐาน (บาท/เดือน)</label><input class="in num" data-n="sso_ceiling" value="${r.sso_ceiling}"></div><div class="field"><label>รายเดือน หักวันละ เงินเดือน ÷</label><input class="in num" data-n="monthly_divisor" value="${r.monthly_divisor}"></div></div>
      <div class="field"><label>ผ่อนสินค้า/เบิกล่วงหน้าได้สูงสุด (งวด)</label><input class="in num" data-n="max_installments" value="${r.max_installments}" style="max-width:120px"></div>
      <span class="hint">ประกันสังคมหักสูงสุด ${fmtN(r.sso_ceiling*r.sso_rate)} บาท/เดือน (รวม 2 งวด)</span></div>
    <button class="btn btn-p" data-save style="align-self:flex-start">บันทึกกติกาเงินเดือน</button>`;
  $$('[data-t]',host).forEach(b=>b.onclick=()=>b.classList.toggle('on'));
  $('[data-save]',host).onclick=async ev=>{ const on=k=>$(`[data-t="${k}"]`,host).classList.contains('on'), nv=k=>Number($(`[data-n="${k}"]`,host).value);
    const v={...r,leave_paid:{sick:on('sick'),personal:on('personal'),vacation:on('vacation')},late_full_day:on('late'),carry_negative:on('carry'),sso_rate:nv('sso_rate')/100,sso_floor:nv('sso_floor'),sso_ceiling:nv('sso_ceiling'),monthly_divisor:nv('monthly_divisor')||30,max_installments:Math.max(1,Math.min(24,nv('max_installments')||6))};
    busy(ev.target,true); try{ await saveSetting('payroll_rules',v); toast('บันทึกแล้ว มีผลเมื่อกด "คำนวณใหม่" ในงวดที่ยังไม่ปิด'); stPayroll(host); }catch(e){ busy(ev.target,false); toast(e.message,true); } };
}
let holMonth=localISO().slice(0,7);
async function stHolidays(host){
  const types=JSON.parse(JSON.stringify(S.settings.holiday_types||[{key:'off',name:'วันหยุดบริษัทฯ',abbr:'O',color:'#64748B',paid:false}]));
  const [y,mo]=holMonth.split('-').map(Number), m0=`${holMonth}-01`, m1=localISO(new Date(y,mo,0));
  const {data,error}=await sb.from('holidays').select('*').gte('day',m0).lte('day',m1);
  if(error){ host.innerHTML='<div class="card empty"><b>ยังไม่ได้อัปเดตฐานข้อมูล</b>รันไฟล์ 13_payroll.sql</div>'; return; }
  const hol={}; (data||[]).forEach(h=>hol[h.day]=h); let pick=types[0]?.key;
  const draw=()=>{ const first=new Date(y,mo-1,1).getDay(), n=new Date(y,mo,0).getDate();
    host.innerHTML=`<div class="card col" style="gap:10px"><b>ประเภทวันหยุด</b><div class="card card-l" style="box-shadow:none">${types.map((t,i)=>`<div class="li" style="gap:6px;flex-wrap:wrap"><input class="in" data-tn="${i}" value="${esc(t.name)}" style="height:38px;flex:1;min-width:140px" aria-label="ชื่อ"><input class="in" data-ta="${i}" value="${esc(t.abbr)}" maxlength="3" style="height:38px;width:56px;text-align:center;font-weight:700" aria-label="ตัวย่อ"><input type="color" data-tc="${i}" value="${t.color||'#64748B'}" style="width:40px;height:38px;border:0;background:none" aria-label="สี"><label class="row xs" style="gap:4px"><input type="checkbox" data-tp="${i}" ${t.paid?'checked':''}>ได้ค่าจ้าง</label><button class="ibtn" data-tx="${i}" aria-label="ลบ">${IC.close}</button></div>`).join('')}</div>
      <div class="row" style="gap:8px"><button class="btn btn-sm" data-tadd>+ เพิ่มประเภท</button><button class="btn btn-sm btn-p" data-tsave>บันทึกประเภท</button></div><span class="xs muted">"ได้ค่าจ้าง" ใช้กับพนักงานรายวันที่ไม่ได้มาทำงานในวันนั้น · รายเดือนไม่ถูกหักในวันหยุด</span></div>
    <div class="card col" style="gap:10px"><div class="row"><button class="ibtn" data-mp="-1" aria-label="เดือนก่อน">${IC.back}</button><b class="grow" style="text-align:center">${TH_MONTHS[mo-1]} ${y+543}</b><button class="ibtn" data-mp="1" aria-label="เดือนถัดไป">${IC.chev}</button></div>
      <div class="chips">${types.map(t=>`<button class="chip ${pick===t.key?'on':''}" data-pk="${t.key}"><b style="color:${t.color}">${esc(t.abbr)}</b> ${esc(t.name)}</button>`).join('')}<button class="chip ${pick===''?'on':''}" data-pk="">ล้างวันหยุด</button></div>
      <div class="hcal">${['อา','จ','อ','พ','พฤ','ศ','ส'].map(d=>`<span class="hd">${d}</span>`).join('')}${Array.from({length:first},()=>'<span></span>').join('')}${Array.from({length:n},(_,i)=>{ const d=`${holMonth}-${String(i+1).padStart(2,'0')}`, h=hol[d], t=h&&types.find(x=>x.key===h.type_key); return `<button class="hday ${h?'on':''}" data-day="${d}" style="${t?`background:${t.color};color:#fff`:''}"><b>${i+1}</b>${t?`<small>${esc(t.abbr)}</small>`:''}</button>`; }).join('')}</div>
      <span class="xs muted">เลือกประเภทด้านบน แล้วแตะวันที่ · บันทึกทันที</span></div>`;
    $$('[data-tn]',host).forEach(i=>i.oninput=()=>{ types[+i.dataset.tn].name=i.value; });
    $$('[data-ta]',host).forEach(i=>i.oninput=()=>{ types[+i.dataset.ta].abbr=i.value.toUpperCase(); });
    $$('[data-tc]',host).forEach(i=>i.oninput=()=>{ types[+i.dataset.tc].color=i.value; });
    $$('[data-tp]',host).forEach(i=>i.onchange=()=>{ types[+i.dataset.tp].paid=i.checked; });
    $$('[data-tx]',host).forEach(b=>b.onclick=()=>{ types.splice(+b.dataset.tx,1); draw(); });
    $('[data-tadd]',host).onclick=()=>{ types.push({key:'h'+Date.now().toString(36),name:'วันหยุดใหม่',abbr:'X',color:'#0F766E',paid:false}); draw(); };
    $('[data-tsave]',host).onclick=async ev=>{ if(types.some(t=>!t.name.trim()||!t.abbr.trim())) return toast('ใส่ชื่อและตัวย่อให้ครบ',true); busy(ev.target,true); try{ await saveSetting('holiday_types',types); toast('บันทึกประเภทวันหยุดแล้ว'); draw(); }catch(e){ busy(ev.target,false); toast(e.message,true); } };
    $$('[data-pk]',host).forEach(b=>b.onclick=()=>{ pick=b.dataset.pk; draw(); });
    $$('[data-mp]',host).forEach(b=>b.onclick=()=>{ const d=new Date(y,mo-1+ +b.dataset.mp,1); holMonth=localISO(d).slice(0,7); stHolidays(host); });
    $$('[data-day]',host).forEach(b=>b.onclick=async()=>{ const d=b.dataset.day;
      const r=pick?await sb.from('holidays').upsert({day:d,type_key:pick}):await sb.from('holidays').delete().eq('day',d);
      if(r.error) return toast(errText(r.error),true); if(pick) hol[d]={day:d,type_key:pick}; else delete hol[d]; draw(); });
  };
  draw();
}
