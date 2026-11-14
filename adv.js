/* =====================================================================
   ตั้งค่าขั้นสูง — แอดมินปรับได้ทุกจุดที่เคยเขียนตายตัว (แต่ละค่ามีปุ่มคืนค่าเริ่มต้น)
   ===================================================================== */
const ADV_DEF = {
  att:{present:{t:'มา',s:'ม',col:'#16A34A'},late:{t:'สาย',s:'ส',col:'#D97706'},half:{t:'ครึ่งวัน',s:'½',col:'#0284C7'},sick:{t:'ลาป่วย',s:'ป',col:'#7C3AED'},personal:{t:'ลากิจ',s:'ก',col:'#7C3AED'},vacation:{t:'พักร้อน',s:'พ',col:'#7C3AED'},absent:{t:'ขาด',s:'ข',col:'#DC2626'},off:{t:'วันหยุดบริษัท',s:'O',col:'#64748B'}},
  iss_urg:{normal:{t:'ปกติ',col:'#64748B'},urgent:{t:'ด่วน',col:'#D97706'},critical:{t:'ด่วนมาก/อันตราย',col:'#DC2626'}},
  iss_st:{new:'ใหม่',acknowledged:'รับเรื่อง',in_progress:'กำลังแก้ไข',resolved:'แก้แล้ว รอยืนยัน',closed:'ปิดเรื่อง'},
  prefix:{REQ:'REQ',BRW:'BRW',ISS:'ISS'},
  text:{slip_note:'โปรดตรวจสอบจำนวนเงินให้เรียบร้อยก่อนออกจากบริษัทฯ',pay_sign:'ผู้จัดทำ, ผู้ตรวจสอบ, ผู้อนุมัติ',dws_sign:'ผู้เช็คชื่อ, ผู้ตรวจสอบ',rep_sign:'ผู้จัดทำ, ผู้ตรวจสอบ, ผู้อนุมัติ',cash_sign:'ผู้เบิกเงิน, ผู้จ่ายเงิน, ผู้อนุมัติ'},
  thr:{rate_ok:95,rate_warn:85,store_warn:80,store_bad:90},
  tiles:{}
};
const advRaw = () => S.settings?.adv||{};
const advGet = (sec,key,def) => { const v=advRaw()[sec]?.[key]; return v==null||v===''?(def!==undefined?def:ADV_DEF[sec]?.[key]):v; };
const advText = (k) => advGet('text',k);
const advList = (k) => String(advGet('text',k)).split(',').map(x=>x.trim()).filter(Boolean);
const advNum = (k) => +advGet('thr',k);
let ATT_COL = {};
function applyAdv(){
  const A=advRaw();
  Object.keys(ADV_DEF.att).forEach(k=>{ const v={...ADV_DEF.att[k],...(A.att?.[k]||{})}; if(typeof ATT!=='undefined'&&ATT[k]){ ATT[k].t=v.t; ATT[k].s=v.s; } ATT_COL[k]=v.col; if(typeof AR_CODE!=='undefined'&&AR_CODE[k]) AR_CODE[k]=[v.s,v.col]; });
  if(typeof ISS_URG!=='undefined') Object.keys(ADV_DEF.iss_urg).forEach(k=>{ const v={...ADV_DEF.iss_urg[k],...(A.iss_urg?.[k]||{})}; ISS_URG[k]=[v.t,v.col]; });
  if(typeof ISS_ST!=='undefined') Object.keys(ADV_DEF.iss_st).forEach(k=>{ ISS_ST[k][0]=A.iss_st?.[k]||ADV_DEF.iss_st[k]; });
}
/* เรียงและซ่อนไทล์หน้าหลักตามบทบาท */
function advTiles(arr){
  const cfg=advRaw().tiles?.[S.profile?.role]; if(!cfg) return arr;
  const key=h=>(h.match(/data-tile="([^"]+)"/)||[])[1]||'';
  const hid=new Set(cfg.hidden||[]), ord=cfg.order||[];
  return arr.filter(h=>h&&!hid.has(key(h))).sort((a,b)=>{ const ia=ord.indexOf(key(a)), ib=ord.indexOf(key(b)); return (ia<0?999:ia)-(ib<0?999:ib); });
}

/* ---------- หน้า ตั้งค่าระบบ > ตั้งค่าขั้นสูง ---------- */
function stAdv(host){
  const A=JSON.parse(JSON.stringify(advRaw())); ['att','iss_urg','iss_st','prefix','text','thr','tiles'].forEach(k=>{ A[k]=A[k]||{}; });
  let role='employee';
  const sec=(title,desc,body,key)=>`<div class="card col" style="gap:10px"><div class="row" style="gap:8px"><div class="grow"><b>${title}</b><div class="xs muted">${desc}</div></div><button class="btn btn-sm" data-reset="${key}">คืนค่าเริ่มต้น</button></div>${body}</div>`;
  const draw=()=>{
    const att=Object.entries(ADV_DEF.att).map(([k,d])=>{ const v={...d,...(A.att[k]||{})}; return `<div class="advrow"><input type="color" data-att="${k}" data-f="col" value="${v.col}" aria-label="สี"><input class="in" data-att="${k}" data-f="t" value="${esc(v.t)}" aria-label="ชื่อสถานะ"><input class="in" data-att="${k}" data-f="s" value="${esc(v.s)}" maxlength="2" style="width:60px;text-align:center" aria-label="ตัวย่อ"><span class="xs muted">${k}</span></div>`; }).join('');
    const urg=Object.entries(ADV_DEF.iss_urg).map(([k,d])=>{ const v={...d,...(A.iss_urg[k]||{})}; return `<div class="advrow"><input type="color" data-urg="${k}" data-f="col" value="${v.col}" aria-label="สี"><input class="in" data-urg="${k}" data-f="t" value="${esc(v.t)}"><span class="xs muted">${k}</span></div>`; }).join('');
    const ist=Object.entries(ADV_DEF.iss_st).map(([k,d])=>`<div class="advrow"><input class="in" data-ist="${k}" value="${esc(A.iss_st[k]||d)}"><span class="xs muted">${k}</span></div>`).join('');
    const pre=[['REQ','ใบเบิก วัสดุ/อุปกรณ์'],['BRW','ใบยืมอุปกรณ์ (เดิม)'],['ISS','ใบแจ้งปัญหา']].map(([k,t])=>`<label class="field"><span class="xs muted">${t}</span><input class="in" data-pre="${k}" value="${esc(A.prefix[k]||k)}" maxlength="6" style="text-transform:uppercase"></label>`).join('');
    const txt=[['slip_note','ข้อความท้ายสลิปเงินเดือน'],['pay_sign','ช่องลงชื่อใบสรุปเงินเดือน (คั่นด้วย ,)'],['cash_sign','ช่องลงชื่อใบเบิกเงินสดจ่ายเงินเดือน (คั่นด้วย ,)'],['dws_sign','ช่องลงชื่อใบสรุปคนงานประจำวัน (คั่นด้วย ,)'],['rep_sign','ช่องลงชื่อรายงานการมาทำงาน (คั่นด้วย ,)']].map(([k,t])=>`<label class="field"><span class="xs muted">${t}</span><input class="in" data-txt="${k}" value="${esc(A.text[k]??ADV_DEF.text[k])}"></label>`).join('');
    const thr=[['rate_ok','อัตรามาทำงาน "ดี" ตั้งแต่ (%)'],['rate_warn','อัตรามาทำงาน "เฝ้าระวัง" ตั้งแต่ (%)'],['store_warn','เตือนพื้นที่ใกล้เต็ม เมื่อใช้ (%)'],['store_bad','เตือน "ใกล้เต็มมาก" เมื่อใช้ (%)']].map(([k,t])=>`<label class="field"><span class="xs muted">${t}</span><input class="in num" type="number" min="1" max="100" data-thr="${k}" value="${esc(A.thr[k]??ADV_DEF.thr[k])}"></label>`).join('');
    const TK=Object.keys(MOD).filter(k=>!['manage','studio','home'].includes(k)), tc=A.tiles[role]||{order:[],hidden:[]};
    const ordered=[...(tc.order||[]).filter(k=>TK.includes(k)),...TK.filter(k=>!(tc.order||[]).includes(k))];
    const tiles=`<div class="seg" style="width:auto">${[['employee','พนักงาน'],['foreman','โฟร์แมน'],['manager','ผู้บริหาร'],['admin','แอดมิน']].map(([k,t])=>`<button class="${role===k?'on':''}" data-trole="${k}">${t}</button>`).join('')}</div>
      <div class="card card-l" style="box-shadow:none">${ordered.map((k,i)=>`<div class="li" style="gap:8px">${modIcon(k,30)}<span class="grow sm">${esc(T(MOD[k].t))}</span><button class="ibtn" data-tu="${i}" ${i?'':'disabled'} aria-label="ขึ้น">${svg('<path d="M6 15l6-6 6 6"/>')}</button><button class="ibtn" data-td="${i}" ${i<ordered.length-1?'':'disabled'} aria-label="ลง">${svg('<path d="M6 9l6 6 6-6"/>')}</button><button class="sw ${(tc.hidden||[]).includes(k)?'':'on'}" data-th="${k}" role="switch" aria-label="แสดงบนหน้าหลัก"></button></div>`).join('')}</div>
      <span class="hint">ไทล์ที่บทบาทนั้นไม่มีสิทธิ์จะไม่แสดงอยู่แล้ว (ตั้งสิทธิ์ที่ "สิทธิ์เมนูและหน้า")</span>`;
    host.innerHTML=`<div class="col" style="gap:12px">
      <div class="note n-info">${IC.info}<span>ทุกค่าในหน้านี้มีผลทั้งระบบทันทีหลังบันทึก · กด "คืนค่าเริ่มต้น" ในแต่ละกล่องได้</span></div>
      ${sec('สถานะการเช็คชื่อ','ชื่อ ตัวย่อ และสี ที่แสดงในตาราง รายงาน และหน้าพนักงาน',`<div class="col" style="gap:6px">${att}</div>`,'att')}
      ${sec('แจ้งปัญหา: ความเร่งด่วน และชื่อสถานะ','ชื่อและสีของแต่ละระดับ · ชื่อแต่ละขั้น',`<div class="col" style="gap:6px">${urg}</div><b class="xs muted">ชื่อขั้นสถานะ</b><div class="col" style="gap:6px">${ist}</div>`,'iss')}
      ${sec('ตัวย่อเลขที่เอกสาร','มีผลกับเอกสารที่สร้างใหม่ (เลขเดิมไม่เปลี่ยน) · ประเภทขออนุมัติงานตั้งที่ "ประเภทการขออนุมัติ"',`<div class="advgrid">${pre}</div>`,'prefix')}
      ${sec('ข้อความในเอกสาร','ข้อความท้ายสลิป และชื่อช่องลงชื่อในเอกสารต่าง ๆ',`<div class="col" style="gap:8px">${txt}</div>`,'text')}
      ${sec('เกณฑ์และการแจ้งเตือน','สีอัตราการมาทำงาน และการเตือนพื้นที่เก็บข้อมูล',`<div class="advgrid">${thr}</div>`,'thr')}
      ${sec('ไทล์บนหน้าหลัก','เลือกบทบาท แล้วเรียงลำดับและเปิด/ปิดไทล์',tiles,'tiles')}
      <button class="btn btn-p" data-save style="align-self:flex-start">บันทึกตั้งค่าขั้นสูง</button></div>`;
    $$('[data-att]',host).forEach(i=>i.oninput=()=>{ const k=i.dataset.att; A.att[k]={...(A.att[k]||{}),[i.dataset.f]:i.value}; });
    $$('[data-urg]',host).forEach(i=>i.oninput=()=>{ const k=i.dataset.urg; A.iss_urg[k]={...(A.iss_urg[k]||{}),[i.dataset.f]:i.value}; });
    $$('[data-ist]',host).forEach(i=>i.oninput=()=>{ A.iss_st[i.dataset.ist]=i.value; });
    $$('[data-pre]',host).forEach(i=>i.oninput=()=>{ A.prefix[i.dataset.pre]=i.value.toUpperCase().replace(/[^A-Z0-9]/g,''); });
    $$('[data-txt]',host).forEach(i=>i.oninput=()=>{ A.text[i.dataset.txt]=i.value; });
    $$('[data-thr]',host).forEach(i=>i.oninput=()=>{ A.thr[i.dataset.thr]=Math.max(1,Math.min(100,+i.value||0)); });
    $$('[data-trole]',host).forEach(b=>b.onclick=()=>{ role=b.dataset.trole; draw(); });
    const setT=o=>{ A.tiles[role]={order:ordered,hidden:[...((A.tiles[role]||{}).hidden||[])],...o}; };
    $$('[data-tu]',host).forEach(b=>b.onclick=()=>{ const i=+b.dataset.tu; [ordered[i-1],ordered[i]]=[ordered[i],ordered[i-1]]; setT({order:ordered}); draw(); });
    $$('[data-td]',host).forEach(b=>b.onclick=()=>{ const i=+b.dataset.td; [ordered[i+1],ordered[i]]=[ordered[i],ordered[i+1]]; setT({order:ordered}); draw(); });
    $$('[data-th]',host).forEach(b=>b.onclick=()=>{ const k=b.dataset.th, h=new Set((A.tiles[role]||{}).hidden||[]); h.has(k)?h.delete(k):h.add(k); setT({hidden:[...h]}); draw(); });
    $$('[data-reset]',host).forEach(b=>b.onclick=()=>{ const k=b.dataset.reset; if(k==='iss'){ A.iss_urg={}; A.iss_st={}; } else if(k==='tiles') A.tiles[role]=undefined, delete A.tiles[role]; else A[k]={}; draw(); toast('คืนค่าเริ่มต้นแล้ว (กดบันทึกเพื่อใช้)'); });
    $('[data-save]',host).onclick=async ev=>{ if(+A.thr.rate_warn>=+(A.thr.rate_ok??95)) return toast('เกณฑ์ "เฝ้าระวัง" ต้องต่ำกว่าเกณฑ์ "ดี"',true);
      if(Object.values(A.prefix).some(v=>!v)) return toast('ตัวย่อเลขที่ต้องไม่ว่าง',true);
      busy(ev.target,true); try{ await saveSetting('adv',A); S.settings.adv=A; applyAdv(); busy(ev.target,false); toast('บันทึกตั้งค่าขั้นสูงแล้ว'); }catch(e){ busy(ev.target,false); toast(/row-level|ไม่มีสิทธิ์/.test(e.message)?'ต้องรันไฟล์ 22_advanced.sql และต้องเป็นแอดมิน':e.message,true); } };
  };
  draw();
}
