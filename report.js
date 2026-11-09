/* =====================================================================
   รายงานการมาทำงานรายเดือน (ส่งออก PDF เวกเตอร์ / PNG)
   ตัวอย่างแสดงจากไฟล์ PDF จริง จึงตรงกับไฟล์ที่ส่งออกทุกจุด
   ===================================================================== */
const AR_CNT = { present:'มา', late:'สาย', half:'ครึ่งวัน', sick:'ลาป่วย', personal:'ลากิจ', vacation:'ลาพักร้อน', absent:'ขาด', holiday:'วันหยุด', leave:'ลารวม', ot:'OT (ชม.)', work:'วันทำงานรวม' };
const AR_MONEY = { wage:'ค่าแรง', otpay:'ค่า OT', adds:'รายการเพิ่ม', gross:'รวมก่อนหัก', sso:'ประกันสังคม', ded:'หักอื่น ๆ', net:'รับสุทธิ' };
const AR_CODE = { present:['ม','#16A34A'], late:['ส','#D97706'], half:['½','#0284C7'], sick:['ป','#7C3AED'], personal:['ก','#7C3AED'], vacation:['พ','#7C3AED'], absent:['ข','#DC2626'] };
const AR_PRESETS = {
  main: { name:'ตารางมาทำงาน + เงิน', emp:['code','name_nick','position'], grid:true, cnt:['work','absent','leave','ot'], money:['net'], font:7.5, margin:{t:10,r:8,b:10,l:8}, legend:true, sign:true },
  days: { name:'สรุปวัน', emp:['code','name_nick','position'], grid:false, cnt:['present','late','half','sick','personal','vacation','absent','holiday','ot','work'], money:[], font:11, margin:{t:12,r:12,b:12,l:12}, legend:false, sign:true },
  full: { name:'ตรวจสอบละเอียด', emp:['code','name_nick','position'], grid:true, cnt:['present','late','half','sick','personal','vacation','absent','holiday','ot','work'], money:['wage','otpay','adds','gross','sso','ded','net'], font:6.5, margin:{t:8,r:6,b:8,l:6}, legend:true, sign:true }
};
const AR_EMP_BASE = [['code','รหัส',e=>e.emp_code||''],['name','ชื่อ-นามสกุล',e=>[e.first_name,e.last_name].filter(Boolean).join(' ')],['name_nick','ชื่อ (ชื่อเล่น)',e=>[e.first_name,e.last_name].filter(Boolean).join(' ')+(e.nickname?` (${e.nickname})`:'')],['position','ตำแหน่ง',e=>posName(e.position_id)||'']];
const arEmpFields = () => [...AR_EMP_BASE, ...PAY_EMP_FIELDS.filter(f=>!['first_name','last_name'].includes(f[0])||true).map(([k,t,fn])=>['e_'+k,t,e=>{ const v=fn?fn(e):e[k]; return v==null?'':String(v); }])];
const arSets = () => { const s=S.settings.att_report_sets; return s&&Object.keys(s).length?s:JSON.parse(JSON.stringify(AR_PRESETS)); };

async function monthReport(month){
  const mgr=isManager(), sets=JSON.parse(JSON.stringify(arSets())); let sid=Object.keys(sets)[0], range='1', mon=month||localISO().slice(0,7), timer=null, busyR=false, data=null;
  const ov=overlay(`<div class="sheet sheet-wide" role="dialog" aria-modal="true" aria-label="ส่งออกรายงานการมาทำงาน"><header class="appbar stripe"><button class="ibtn" data-x aria-label="ปิด">${IC.close}</button><h1>รายงานการมาทำงาน<small>A4 แนวนอน · PDF เวกเตอร์ / PNG</small></h1></header>
    <div class="sheet-body"><div class="arwrap"><div class="arctl col" id="arc" style="gap:10px"></div><div class="arprev" id="arp"><div class="loading"><div class="spin"></div></div></div></div></div>
    <div class="sheet-foot" style="flex-wrap:wrap"><span class="sm muted grow" id="arn"></span><button class="btn" data-png>PNG</button><button class="btn btn-p" data-pdf>ดาวน์โหลด PDF</button></div></div>`,false,false);
  $('[data-x]',ov.el).onclick=ov.close;
  const C=$('#arc',ov.el), P=$('#arp',ov.el);
  const bounds=()=>{ const [y,m]=mon.split('-').map(Number), last=new Date(y,m,0).getDate(); return range==='1'?[`${mon}-01`,`${mon}-15`]:range==='2'?[`${mon}-16`,`${mon}-${String(last).padStart(2,'0')}`]:[`${mon}-01`,`${mon}-${String(last).padStart(2,'0')}`]; };
  async function load(){
    const [a,b]=bounds(), key=a+b;
    if(data&&data.key===key) return data;
    const [em,at,hd]=await Promise.all([ sb.from('employees').select('*').order('sort_order',{nullsFirst:false}).order('emp_code'),
      sb.from('attendance').select('employee_id,work_date,status,ot_hours').gte('work_date',a).lte('work_date',b), sb.from('holidays').select('*').gte('day',a).lte('day',b) ]);
    if(em.error) throw em.error;
    const emps=(em.data||[]).filter(e=>(!e.start_date||e.start_date<=b)&&(e.status!=='resigned'||(e.resign_date&&e.resign_date>=a)));
    const att={}; (at.data||[]).forEach(r=>att[r.employee_id+'|'+r.work_date]=r);
    const HT=S.settings.holiday_types||[], hol={}; (hd.data||[]).forEach(h=>{ const t=HT.find(x=>x.key===h.type_key); if(t) hol[h.day]=t; });
    let pay={};
    if(mgr){ // ตัวเลขเงินจากระบบเงินเดือน (คำนวณงวดที่ยังไม่ปิดให้ก่อน)
      const starts=range==='1'?[`${mon}-01`]:range==='2'?[`${mon}-16`]:[`${mon}-01`,`${mon}-16`];
      for(const s of starts){ await sb.rpc('ensure_period',{p_date:s}); }
      const {data:ps}=await sb.from('pay_periods').select('id,start_date,status').in('start_date',starts);
      for(const p of (ps||[])) if(p.status==='draft') await sb.rpc('calc_period',{p_period:p.id});
      const ids=(ps||[]).map(p=>p.id);
      if(ids.length){ const {data:sl}=await sb.from('pay_slips').select('employee_id,data,net,gross').in('period_id',ids);
        (sl||[]).forEach(s=>{ const d=s.data, o=pay[s.employee_id]||(pay[s.employee_id]={wage:0,otpay:0,adds:0,gross:0,sso:0,ded:0,net:0});
          o.wage+=+d.wage||0; o.otpay+=+d.ot||0; o.adds+=+d.adds||0; o.gross+=+s.gross||0; o.sso+=+d.sso||0; o.ded+=(+d.inst_sum||0)+(+d.advance||0)+(+d.deducts||0); o.net+=+s.net||0; }); }
    }
    const days=[]; for(let d=a; d<=b; d=addDays(d,1)) days.push(d);
    data={key,a,b,emps,att,hol,pay,days}; return data;
  }
  function counts(D,e){ const c={present:0,late:0,half:0,sick:0,personal:0,vacation:0,absent:0,holiday:0,ot:0};
    D.days.forEach(d=>{ const r=D.att[e.id+'|'+d]; if(r){ c[r.status]++; c.ot+=+r.ot_hours||0; } else if(D.hol[d]) c.holiday++; });
    c.leave=c.sick+c.personal+c.vacation; c.work=c.present+c.late+c.half*0.5; return c; }
  function buildDoc(D,cfg){
    const B=BR(), m=cfg.margin, pageW=841.89-(m.l+m.r)*PT, EF=arEmpFields();
    const eCols=cfg.emp.map(k=>EF.find(f=>f[0]===k)).filter(Boolean), money=mgr?cfg.money:[];
    const head=[{text:'#',style:'th'},...eCols.map(f=>({text:f[1],style:'th'})),
      ...(cfg.grid?D.days.map(d=>{ const h=D.hol[d], p=parseISO(d); return {text:String(p.d),style:'th',alignment:'center',...(h?{fillColor:h.color,color:'#fff'}:{})}; }):[]),
      ...cfg.cnt.map(k=>({text:AR_CNT[k],style:'th',alignment:'center'})), ...money.map(k=>({text:AR_MONEY[k],style:'th',alignment:'right'}))];
    const tot={}; const body=D.emps.map((e,i)=>{ const c=counts(D,e), py=D.pay[e.id]||{};
      cfg.cnt.forEach(k=>tot[k]=(tot[k]||0)+(+c[k]||0)); money.forEach(k=>tot['$'+k]=(tot['$'+k]||0)+(+py[k]||0));
      return [{text:String(i+1),color:C_LAB}, ...eCols.map(f=>({text:f[2](e),noWrap:f[0]!=='e_id_address'&&f[0]!=='e_cur_address'})),
        ...(cfg.grid?D.days.map(d=>{ const r=D.att[e.id+'|'+d]; if(r){ const [t,col]=AR_CODE[r.status]||['?','#000']; return {text:t+(+r.ot_hours>0?'+':''),color:col,bold:true,alignment:'center'}; } const h=D.hol[d]; return h?{text:h.abbr,color:h.color,bold:true,alignment:'center'}:{text:''}; }):[]),
        ...cfg.cnt.map(k=>({text:num(c[k]),alignment:'center',bold:k==='work',color:k==='absent'&&c[k]?'#DC2626':undefined})),
        ...money.map(k=>({text:num(py[k]||0),alignment:'right',bold:k==='net'}))]; });
    const totRow=[{text:''},{text:`รวม ${D.emps.length} คน`,bold:true,colSpan:Math.max(1,eCols.length)},...Array(Math.max(0,eCols.length-1)).fill({}),
      ...(cfg.grid?D.days.map(()=>({text:''})):[]), ...cfg.cnt.map(k=>({text:num(tot[k]||0),alignment:'center',bold:true})), ...money.map(k=>({text:num(tot['$'+k]||0),alignment:'right',bold:true}))];
    if(!eCols.length){ totRow.splice(1,1,{text:'รวม',bold:true}); }
    const gw=Math.max(9,cfg.font*1.55);
    const widths=['auto',...eCols.map(f=>f[0]==='name_nick'||f[0]==='name'||f[0]==='e_full_name'?'*':'auto'),...(cfg.grid?D.days.map(()=>gw):[]),...cfg.cnt.map(()=>'auto'),...money.map(()=>'auto')];
    if(!widths.includes('*')) widths[0]='*';
    const legend=[...Object.entries(AR_CODE).map(([k,[t,col]])=>[{text:t,color:col,bold:true},` ${ATT[k]?.t||k}   `]),...Object.values(S.settings.holiday_types||[]).map(h=>[{text:h.abbr,color:h.color,bold:true},` ${h.name}   `]),[{text:'+',bold:true},' มี OT']].flat();
    const [y,mo]=mon.split('-').map(Number), rLabel=`${range==='3'?'ประจำเดือน':'งวดวันที่ '+parseISO(D.a).d+'–'+parseISO(D.b).d} ${TH_MON_S[mo-1]} ${y+543}`;
    return { pageSize:'A4', pageOrientation:'landscape', pageMargins:[m.l*PT,m.t*PT,m.r*PT,m.b*PT+12], defaultStyle:{font:'Sarabun',fontSize:cfg.font,color:'#1B262C',lineHeight:1.1},
      styles:{th:{bold:true,color:C_DARK,fillColor:C_BAND}}, info:{title:`รายงานการมาทำงาน ${rLabel}`,author:B.company_th},
      footer:(c,n)=>({columns:[{text:`${B.app} · ข้อมูลจากการเช็คชื่อ${mgr&&money.length?'และระบบเงินเดือน':''}`,fontSize:6.5,color:'#9AA6AA'},{text:`หน้า ${c}/${n}`,alignment:'right',fontSize:6.5,color:'#9AA6AA'}],margin:[m.l*PT,0,m.r*PT,0]}),
      content:[
        {columns:[{...logoNode(30),width:34},{stack:[{text:B.company_th,bold:true,fontSize:11.5,color:C_DARK},{text:B.company_en,fontSize:6.5,color:C_LAB,characterSpacing:.5}],margin:[5,2,0,0],width:'*'},
          {stack:[{text:'รายงานการมาทำงาน',bold:true,fontSize:15,color:C_DARK,alignment:'right'},{text:rLabel,fontSize:9,color:C_LAB,alignment:'right'}],width:'auto'}],columnGap:4},
        ruleLine(pageW),
        {table:{headerRows:1,widths,body:[head,...body,totRow],dontBreakRows:true},layout:{hLineWidth:()=>.4,vLineWidth:()=>.4,hLineColor:()=>C_LINE,vLineColor:()=>C_LINE,paddingLeft:()=>2.5,paddingRight:()=>2.5,paddingTop:()=>2,paddingBottom:()=>2,fillColor:(r)=>r>0&&r%2===0?'#FAFBFA':null}},
        ...(cfg.legend?[{text:['ตัวย่อ: ',...legend],fontSize:Math.max(6,cfg.font-1),color:C_LAB,margin:[0,6,0,0]}]:[]),
        ...(cfg.sign?[{columns:['ผู้จัดทำ','ผู้ตรวจสอบ','ผู้อนุมัติ'].map(t=>({stack:[{text:'..............................................',alignment:'center',color:'#9AA6AA'},{text:t,alignment:'center',fontSize:8.5,margin:[0,2,0,0]}]})),margin:[0,22,0,0],unbreakable:true}]:[])
      ] };
  }
  async function render(){
    if(busyR){ clearTimeout(timer); timer=setTimeout(render,300); return; } busyR=true;
    try{ const D=await load(); await pdfReady(); await logoData(); const dd=buildDoc(D,sets[sid]); const blob=await pdfBlob(dd); const pngs=await pdfToPngs(blob,1.6);
      P.innerHTML=pngs.map(b=>`<img src="data:image/png;base64,${b}" alt="ตัวอย่างหน้า" class="arimg">`).join(''); $('#arn',ov.el).textContent=`${pngs.length} หน้า · ${D.emps.length} คน · ${D.days.length} วัน`; ov.blob=blob; }
    catch(e){ P.innerHTML=`<div class="note n-bad">${esc(errText(e))}</div>`; }
    busyR=false;
  }
  const later=()=>{ clearTimeout(timer); timer=setTimeout(render,450); };
  function drawCtl(){ const st=sets[sid], EF=arEmpFields();
    const chk=(grp,k,t,on)=>`<label class="archk"><input type="checkbox" data-g="${grp}" data-k="${k}" ${on?'checked':''}><span>${esc(t)}</span></label>`;
    C.innerHTML=`<div class="g2"><label class="field"><span class="xs muted">เดือน</span><input class="in" type="month" id="armon" value="${mon}"></label><div class="field"><span class="xs muted">ช่วงวันที่</span><div class="seg">${[['1','1–15'],['2','16–สิ้นเดือน'],['3','ทั้งเดือน']].map(([k,t])=>`<button class="${range===k?'on':''}" data-r="${k}">${t}</button>`).join('')}</div></div></div>
      <div class="field"><span class="xs muted">ชุดรูปแบบ</span><div class="chips">${Object.entries(sets).map(([k,v])=>`<button class="chip ${k===sid?'on':''}" data-sid="${k}">${esc(v.name)}</button>`).join('')}${mgr?'<button class="chip" data-new>+ ชุดใหม่</button>':''}</div></div>
      ${mgr?`<label class="field"><span class="xs muted">ชื่อชุด</span><input class="in" id="arname" value="${esc(st.name)}" style="height:38px"></label>`:''}
      <div class="card col" style="gap:4px;box-shadow:none"><b class="xs muted">ส่วนที่แสดง</b>${chk('opt','grid','ตารางการมาทำงานรายวัน',st.grid)}${chk('opt','legend','คำอธิบายตัวย่อ',st.legend)}${chk('opt','sign','ช่องลงชื่อผู้จัดทำ/ผู้ตรวจสอบ/ผู้อนุมัติ',st.sign)}</div>
      <details class="card" style="box-shadow:none" open><summary class="sm"><b>สรุปจำนวนวัน</b></summary><div class="archips">${Object.entries(AR_CNT).map(([k,t])=>chk('cnt',k,t,st.cnt.includes(k))).join('')}</div></details>
      ${mgr?`<details class="card" style="box-shadow:none"><summary class="sm"><b>ตัวเลขเงิน (จากระบบเงินเดือน)</b></summary><div class="archips">${Object.entries(AR_MONEY).map(([k,t])=>chk('money',k,t,st.money.includes(k))).join('')}</div></details>`:''}
      <details class="card" style="box-shadow:none"><summary class="sm"><b>ข้อมูลพนักงาน (${st.emp.length} ช่อง)</b></summary><div class="archips">${EF.map(([k,t])=>chk('emp',k,t,st.emp.includes(k))).join('')}</div></details>
      <div class="card col" style="gap:8px;box-shadow:none"><b class="xs muted">หน้ากระดาษ (A4 แนวนอน)</b><label class="row sm" style="gap:8px">ตัวอักษร <input type="range" min="5.5" max="14" step="0.5" id="arfont" value="${st.font}" style="flex:1"><b id="arfv">${st.font}</b> pt</label>
        <div class="row" style="gap:6px">${[['t','บน'],['r','ขวา'],['b','ล่าง'],['l','ซ้าย']].map(([k,t])=>`<label class="field" style="flex:1"><span class="xs muted">${t} (มม.)</span><input class="in num" type="number" min="0" max="30" data-m="${k}" value="${st.margin[k]}" style="height:36px"></label>`).join('')}</div></div>
      ${mgr?`<div class="row" style="gap:8px"><button class="btn btn-sm grow" data-save>บันทึกชุด</button>${Object.keys(sets).length>1?'<button class="btn btn-sm btn-bad" data-del>ลบชุด</button>':''}<button class="btn btn-sm" data-reset>คืนค่าเริ่มต้น</button></div>`:''}`;
    $('#armon',C).onchange=e=>{ if(e.target.value){ mon=e.target.value; data=null; later(); } };
    $$('[data-r]',C).forEach(b=>b.onclick=()=>{ range=b.dataset.r; data=null; drawCtl(); later(); });
    $$('[data-sid]',C).forEach(b=>b.onclick=()=>{ sid=b.dataset.sid; drawCtl(); later(); });
    const nw=$('[data-new]',C); if(nw) nw.onclick=()=>{ const k='r'+Date.now().toString(36); sets[k]={...JSON.parse(JSON.stringify(st)),name:'ชุดใหม่'}; sid=k; drawCtl(); later(); };
    const nm=$('#arname',C); if(nm) nm.oninput=e=>{ st.name=e.target.value; };
    $$('input[data-g]',C).forEach(i=>i.onchange=()=>{ const g=i.dataset.g, k=i.dataset.k; if(g==='opt') st[k]=i.checked; else { const arr=st[g]; if(i.checked&&!arr.includes(k)) arr.push(k); if(!i.checked) st[g]=arr.filter(x=>x!==k); } later(); });
    $('#arfont',C).oninput=e=>{ st.font=+e.target.value; $('#arfv',C).textContent=st.font; later(); };
    $$('[data-m]',C).forEach(i=>i.oninput=()=>{ st.margin[i.dataset.m]=Math.max(0,Math.min(30,+i.value||0)); later(); });
    const sv=$('[data-save]',C); if(sv) sv.onclick=async ev=>{ busy(ev.target,true); try{ await saveSetting('att_report_sets',sets); busy(ev.target,false); toast('บันทึกชุดรูปแบบแล้ว'); }catch(e){ busy(ev.target,false); toast(e.message,true); } };
    const dl=$('[data-del]',C); if(dl) dl.onclick=async()=>{ if(!await confirmBox(`ลบชุด "${st.name}"?`,'ลบ',true)) return; delete sets[sid]; sid=Object.keys(sets)[0]; drawCtl(); later(); };
    const rs=$('[data-reset]',C); if(rs) rs.onclick=()=>{ Object.keys(sets).forEach(k=>delete sets[k]); Object.assign(sets,JSON.parse(JSON.stringify(AR_PRESETS))); sid='main'; drawCtl(); later(); };
  }
  drawCtl(); render();
  const fname=ext=>{ const [a,b]=bounds(); return `รายงานการมาทำงาน_${a}_${b}.${ext}`; };
  $('[data-pdf]',ov.el).onclick=async ev=>{ if(!ov.blob) return; const a=document.createElement('a'); a.href=URL.createObjectURL(ov.blob); a.download=fname('pdf'); a.click(); };
  $('[data-png]',ov.el).onclick=async ev=>{ if(!ov.blob) return; busy(ev.target,true,'กำลังสร้าง...'); try{ const pngs=await pdfToPngs(ov.blob,3);
      pngs.forEach((b,i)=>{ const a=document.createElement('a'); a.href='data:image/png;base64,'+b; a.download=fname('png').replace('.png',pngs.length>1?`_หน้า${i+1}.png`:'.png'); a.click(); }); }catch(e){ toast(errText(e),true); } busy(ev.target,false); };
}
