/* =====================================================================
   PDF แบบเวกเตอร์ (ตัวอักษรคมชัดทุกขนาด) — pdfmake + ฟอนต์ Sarabun
   ===================================================================== */
const PDFLIB = { make:'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.10/pdfmake.min.js',
  pdfjs:'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', worker:'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js' };
const PT = 2.8346; // 1 มม. = 2.8346 pt
const C_DARK='#1F3540', C_GOLD='#C9A227', C_LAB='#5B6B73', C_LINE='#C9D1D4', C_BAND='#F1F3F2';
let PDF_READY=null, LOGO_DATA;
async function pdfReady(){
  if(PDF_READY) return PDF_READY;
  PDF_READY=(async()=>{
    await loadScript(PDFLIB.make);
    const b64=async u=>{ const r=await fetch(u); if(!r.ok) throw new Error('โหลดฟอนต์ไม่สำเร็จ ('+u+') ตรวจว่าอัปโฟลเดอร์ fonts ขึ้น GitHub แล้ว'); const buf=new Uint8Array(await r.arrayBuffer()); let s=''; for(let i=0;i<buf.length;i+=0x8000) s+=String.fromCharCode.apply(null,buf.subarray(i,i+0x8000)); return btoa(s); };
    const [r,b,sb]=await Promise.all(['Regular','Bold','SemiBold'].map(w=>b64(`fonts/Sarabun-${w}.ttf`)));
    pdfMake.vfs={'Sarabun-Regular.ttf':r,'Sarabun-Bold.ttf':b,'Sarabun-SemiBold.ttf':sb};
    pdfMake.fonts={Sarabun:{normal:'Sarabun-Regular.ttf',bold:'Sarabun-Bold.ttf',italics:'Sarabun-SemiBold.ttf',bolditalics:'Sarabun-Bold.ttf'}};
  })();
  try{ await PDF_READY; }catch(e){ PDF_READY=null; throw e; }
  return PDF_READY;
}
let LOGO_SVG=null, LOGO_URL;
async function logoData(){ // โลโก้บริษัทที่ใช้ในหัวกระดาษ — โหลดใหม่ทุกครั้งที่แอดมินเปลี่ยนโลโก้ (SVG/WebP แปลงให้ pdfmake ใช้ได้)
  const u=BR().logo||'';
  if(LOGO_URL===u&&LOGO_DATA!==undefined) return LOGO_DATA;
  LOGO_URL=u; LOGO_DATA=null; LOGO_SVG=null;
  if(u){ try{ const r=await fetch(u,{cache:'no-cache'}); if(!r.ok) throw 0; const bl=await r.blob();
      if(/svg/i.test(bl.type)||/\.svg(\?|$)/i.test(u)){ LOGO_SVG=await bl.text(); return LOGO_DATA; }
      const url=URL.createObjectURL(bl); try{ const im=await new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=url; });
        const k=Math.min(1,600/Math.max(im.naturalWidth,im.naturalHeight)), c=document.createElement('canvas'); c.width=Math.round(im.naturalWidth*k)||1; c.height=Math.round(im.naturalHeight*k)||1;
        c.getContext('2d').drawImage(im,0,0,c.width,c.height); LOGO_DATA=c.toDataURL('image/png'); } finally{ URL.revokeObjectURL(url); } }catch(_){ LOGO_DATA=null; LOGO_SVG=null; } }
  return LOGO_DATA;
}
/* หัวกระดาษซ้ำทุกหน้า: ส่วนหัวของหน้า 1 (โลโก้ ชื่อบริษัท ชื่อเอกสาร) จะแสดงเหมือนกันทุกหน้า เมื่อรายการยาวเกิน 1 หน้า
   - เอกสารที่ขึ้นต้นด้วย docHead() ใช้อัตโนมัติ · เอกสารอื่นกำหนด dd._rh = จำนวนชิ้นส่วนหัวกระดาษที่อยู่ต้น content */
async function prepDoc(dd){
  if(!dd||dd.header||!Array.isArray(dd.content)) return dd;
  const n=dd._rh||(dd.content[0]&&dd.content[0]._dh?2:0); delete dd._rh; if(!n) return dd;
  const json=JSON.stringify(dd.content.splice(0,n)), mk=()=>JSON.parse(json);
  const pm=Array.isArray(dd.pageMargins)?(dd.pageMargins.length===2?[dd.pageMargins[0],dd.pageMargins[1],dd.pageMargins[0],dd.pageMargins[1]]:dd.pageMargins):Array(4).fill(dd.pageMargins??40);
  const [l,t,r,b]=pm; let top=null;
  const md={pageSize:dd.pageSize,pageOrientation:dd.pageOrientation,pageMargins:[l,t,r,b],defaultStyle:dd.defaultStyle,styles:dd.styles,
    content:[...mk(),{text:' ',id:'__rh_end'}], pageBreakBefore:node=>{ if(node.id==='__rh_end') top=node.startPosition.top; return false; }};
  await new Promise(res=>pdfMake.createPdf(md).getBuffer(res));
  const h=Math.max(0,(top??t)-t);
  dd.header=()=>({stack:mk(),margin:[l,t,r,0]}); dd.pageMargins=[l,t+h,r,b];
  return dd;
}
const pdfBlob = async dd => { await prepDoc(dd); return new Promise(res=>pdfMake.createPdf(dd).getBlob(res)); };
const pdfB64  = async dd => { await prepDoc(dd); return new Promise(res=>pdfMake.createPdf(dd).getBase64(res)); };
async function pdfToPngs(blob, scale=3){ // ภาพ PNG ความละเอียดสูงจาก PDF (ไว้เก็บใน Drive)
  await loadScript(PDFLIB.pdfjs); pdfjsLib.GlobalWorkerOptions.workerSrc=PDFLIB.worker;
  const doc=await pdfjsLib.getDocument({data:new Uint8Array(await blob.arrayBuffer())}).promise; const out=[];
  for(let i=1;i<=doc.numPages;i++){ const pg=await doc.getPage(i), vp=pg.getViewport({scale}); const c=document.createElement('canvas'); c.width=vp.width; c.height=vp.height;
    const ctx=c.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,c.width,c.height); await pg.render({canvasContext:ctx,viewport:vp}).promise; out.push(c.toDataURL('image/png').split(',')[1]); }
  return out;
}
const markBox = (size) => ({ table:{widths:[size],heights:[size],body:[[{text:BR().mark,bold:true,color:'#F2B705',fontSize:size*.3,alignment:'center',margin:[0,size*.3,0,0]}]]}, layout:{fillColor:()=>C_DARK,hLineWidth:()=>0,vLineWidth:()=>0,paddingLeft:()=>0,paddingRight:()=>0,paddingTop:()=>0,paddingBottom:()=>0} });
const KTY_MARK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 452.2 493.2"><polygon points="18.0,127.8 224.9,18.0 434.2,125.1 228.2,266.9" fill="#3A5866"/><polygon points="18.0,127.8 228.2,266.9 228.8,475.2 49.2,333.8" fill="#22394A"/><polygon points="228.2,266.9 434.2,125.1 404.6,330.9 228.8,475.2" fill="#162830"/><polygon points="158.9,93.3 206.9,93.3 206.9,139.0 251.7,93.3 306.1,93.3 245.3,148.7 309.3,213.7 254.9,213.7 206.9,165.5 206.9,213.7 158.9,213.7" fill="#9C7400"/><polygon points="158.9,91.1 206.9,91.1 206.9,136.8 251.7,91.1 306.1,91.1 245.3,146.5 309.3,211.5 254.9,211.5 206.9,163.3 206.9,211.5 158.9,211.5" fill="#9C7400"/><polygon points="158.9,88.9 206.9,88.9 206.9,134.6 251.7,88.9 306.1,88.9 245.3,144.3 309.3,209.3 254.9,209.3 206.9,161.1 206.9,209.3 158.9,209.3" fill="#9C7400"/><polygon points="158.9,86.7 206.9,86.7 206.9,132.4 251.7,86.7 306.1,86.7 245.3,142.1 309.3,207.1 254.9,207.1 206.9,158.9 206.9,207.1 158.9,207.1" fill="#9C7400"/><polygon points="158.9,84.5 206.9,84.5 206.9,130.2 251.7,84.5 306.1,84.5 245.3,139.9 309.3,204.9 254.9,204.9 206.9,156.7 206.9,204.9 158.9,204.9" fill="#9C7400"/><polygon points="158.9,82.3 206.9,82.3 206.9,128.0 251.7,82.3 306.1,82.3 245.3,137.7 309.3,202.7 254.9,202.7 206.9,154.5 206.9,202.7 158.9,202.7" fill="#F2B705"/><polygon points="68.2,187.1 201.4,275.2 207.6,316.0 161.8,285.7 175.4,375.4 133.8,347.9 120.2,258.1 74.4,227.9" fill="#9C7400"/><polygon points="66.7,188.1 199.9,276.2 206.1,317.0 160.3,286.7 173.9,376.4 132.3,348.9 118.7,259.1 72.9,228.9" fill="#9C7400"/><polygon points="65.2,189.1 198.4,277.2 204.6,318.0 158.8,287.7 172.4,377.4 130.8,349.9 117.2,260.1 71.4,229.9" fill="#9C7400"/><polygon points="63.7,190.1 196.9,278.2 203.1,319.0 157.3,288.7 170.9,378.4 129.3,350.9 115.7,261.1 69.9,230.9" fill="#9C7400"/><polygon points="62.2,191.1 195.4,279.2 201.6,320.0 155.8,289.7 169.4,379.4 127.8,351.9 114.2,262.1 68.4,231.9" fill="#F2B705"/><polygon points="257.3,277.0 302.2,246.1 325.4,272.8 348.4,214.3 393.3,183.4 345.9,290.4 346.1,348.1 305.3,376.2 305.1,318.5" fill="#9C7400"/><polygon points="258.8,278.0 303.7,247.1 326.9,273.8 349.9,215.3 394.8,184.4 347.4,291.4 347.6,349.1 306.8,377.2 306.6,319.5" fill="#9C7400"/><polygon points="260.3,279.0 305.2,248.1 328.4,274.8 351.4,216.3 396.3,185.4 348.9,292.4 349.1,350.1 308.3,378.2 308.1,320.5" fill="#9C7400"/><polygon points="261.8,280.0 306.7,249.1 329.9,275.8 352.9,217.3 397.8,186.4 350.4,293.4 350.6,351.1 309.8,379.2 309.6,321.5" fill="#9C7400"/><polygon points="263.3,281.0 308.2,250.1 331.4,276.8 354.4,218.3 399.3,187.4 351.9,294.4 352.1,352.1 311.3,380.2 311.1,322.5" fill="#F2B705"/><path d="M18,127.84 L224.88,18 L434.2,125.14 L404.6,330.94 L228.8,475.24 L49.2,333.84 Z M228.2,266.94 L18,127.84 M228.2,266.94 L434.2,125.14 M228.2,266.94 L228.8,475.24" fill="none" stroke="#FFFFFF" stroke-opacity="0.18" stroke-width="3" stroke-linejoin="round"/></svg>';
const logoNode = (size) => LOGO_SVG?{svg:LOGO_SVG,fit:[size,size]}:LOGO_DATA?{image:LOGO_DATA,fit:[size,size]}:{svg:KTY_MARK_SVG,width:size*0.92,height:size};
const periodText = p => `งวดวันที่ ${periodLabel(p)}`;
const ruleLine = (w) => ({ canvas:[{type:'line',x1:0,y1:0,x2:w,y2:0,lineWidth:1.6,lineColor:C_DARK},{type:'line',x1:0,y1:2.6,x2:w,y2:2.6,lineWidth:.7,lineColor:C_GOLD}], margin:[0,4,0,8] });
const num = v => fmtN(v);

/* ---------- ใบสรุปเงินเดือน (A4 แนวนอน) ---------- */
async function summaryDoc(p, slips, cfg, cols, opt={}){
  await pdfReady(); await logoData();
  const B=BR(), m=cfg.margin, fs=cfg.font, pageW=841.89-(m.l+m.r)*PT;
  const keys=['#',...cols,...(cfg.sign?['_sign']:[])];
  const isNum=k=>k!=='#'&&k!=='_sign'&&PCOLS[k].n, title=k=>k==='#'?'#':k==='_sign'?'ลงชื่อรับเงิน':PCOLS[k].t;
  const widths=keys.map(k=>{ const w=k==='_sign'?cfg.sign_w:k==='#'?(cfg.widths['#']||9):cfg.widths[k]; return w?w*PT:(k==='name'?'*':'auto'); });
  if(!widths.includes('*')&&widths.includes('auto')) widths[widths.indexOf('auto')]='*'; // กำหนดเองครบทุกคอลัมน์ = ใช้ตามที่กำหนด
  const head=keys.map(k=>({text:title(k),bold:true,color:C_DARK,fillColor:C_BAND,alignment:isNum(k)?'right':'left'}));
  const LK=keys.find(k=>k!=='#'&&k!=='_sign'&&!PCOLS[k].n)||'#';
  const groups=opt.groups&&opt.groups.length?opt.groups:[{label:null,slips}];
  const signRow=lbl=>({columns:advList('pay_sign').map(t=>({stack:[{text:'....................................................',alignment:'center',color:C_LAB},{text:/จ่าย/.test(t)&&lbl?`${t} (${lbl})`:t,alignment:'center',fontSize:fs-1,color:C_LAB}]})),margin:[0,28,0,0],unbreakable:true});
  const tableOf=G=>{ const rows=G.map((s,i)=>keys.map(k=>k==='#'?{text:String(i+1),color:C_LAB}:k==='_sign'?{text:' '}:{text:String(PCOLS[k].f(s.data)),alignment:isNum(k)?'right':'left',bold:k==='net'}));
    const tot=keys.map(k=>({text:k===LK?`รวมทั้งสิ้น${groups.length>1||opt.place?` ${G.length} คน`:''}`:(k!=='#'&&k!=='_sign'&&PCOLS[k].m?num(G.reduce((a,s)=>a+(+String(PCOLS[k].f(s.data)).replace(/,/g,'')||0),0)):''),bold:true,alignment:k===LK?'left':'right',fillColor:C_BAND}));
    return {table:{headerRows:1,widths:[...widths],body:[JSON.parse(JSON.stringify(head)),...rows,tot],dontBreakRows:true},
      layout:{hLineWidth:()=>.5,vLineWidth:()=>.5,hLineColor:()=>C_LINE,vLineColor:()=>C_LINE,paddingLeft:()=>4,paddingRight:()=>4,paddingTop:()=>cfg.sign?5:3,paddingBottom:()=>cfg.sign?5:3}}; };
  const body=groups.flatMap((g,gi)=>[
    ...(g.label&&groups.length>1?[{table:{widths:['*'],body:[[{text:[{text:'จ่ายที่: ',color:C_LAB},{text:g.label,bold:true},{text:`  ·  ${g.slips.length} คน`,color:C_LAB}],fontSize:fs+1,margin:[6,3,6,3]}]]},layout:{fillColor:()=>'#FFF4D6',hLineWidth:()=>0,vLineWidth:(i)=>i===0?3:0,vLineColor:()=>'#F2B705'},margin:[0,0,0,6],...(gi?{pageBreak:'before'}:{})}]:[]),
    tableOf(g.slips), signRow(g.label||opt.place)]);
  const qr=`${location.origin}${location.pathname}#pay/p/${p.id}`;
  return { pageSize:'A4', pageOrientation:'landscape', _rh:2, pageMargins:[m.l*PT,m.t*PT,m.r*PT,m.b*PT+12],
    defaultStyle:{font:'Sarabun',fontSize:fs,color:'#1B262C',lineHeight:1.15},
    info:{title:`ใบสรุปเงินเดือน ${periodText(p)}`,author:B.company_th},
    footer:(c,n)=>({columns:[{text:`${B.company_short} · ใบสรุปเงินเดือน ${periodText(p)}`,fontSize:7.5,color:'#9AA6AA'},{text:`หน้า ${c}/${n}`,alignment:'right',fontSize:7.5,color:'#9AA6AA'}],margin:[m.l*PT,0,m.r*PT,0]}),
    content:[
      {columns:[{...logoNode(38),width:42},{stack:[{text:B.company_th,bold:true,fontSize:13,color:C_DARK},{text:B.company_en,fontSize:7.5,color:C_LAB,characterSpacing:.6}],margin:[6,4,0,0],width:'*'},
        {stack:[{text:'ใบสรุปเงินเดือน',bold:true,fontSize:17,color:C_DARK,alignment:'right'},{text:periodText(p),fontSize:10,color:C_LAB,alignment:'right'},...(opt.place?[{text:`จ่ายที่: ${opt.place}`,bold:true,fontSize:10,color:'#1B262C',background:'#F2B705',alignment:'right',margin:[0,2,0,0]}]:[])],width:'auto',margin:[0,2,qr?8:0,0]},
        ...(qr?[{stack:[{qr,fit:52,margin:[0,0,0,1]},{text:'สแกนดูย้อนหลัง',fontSize:6.5,color:C_LAB,alignment:'center'}],width:54}]:[])],columnGap:4},
      ruleLine(pageW),
      ...body
    ] };
}

/* ---------- สลิปรายคน 8 ใบ/A4 (ตำแหน่งตัดตรงทุกใบ) ---------- */
async function slipsDoc(p, slips, qrOf){
  await pdfReady(); await logoData();
  const B=BR(), W=595.28/2, H=841.89/4, pad=14, iw=W-pad*2, content=[];
  slips.forEach((s,i)=>{ const d=s.data, col=i%2, row=Math.floor(i/2)%4, x=col*W+pad, y=row*H+pad-2;
    if(i&&i%8===0) content.push({text:'',pageBreak:'before'});
    const node={ stack:[
      {columns:[{...logoNode(22),width:24},{stack:[{text:B.company_short,bold:true,fontSize:8.5,color:C_DARK},{text:`สลิปเงินเดือน · ${periodText(p)}`,fontSize:7,color:C_LAB}],margin:[3,1,0,0]},{qr:qrOf(s),fit:40,width:40}]},
      {canvas:[{type:'line',x1:0,y1:0,x2:iw,y2:0,lineWidth:1,lineColor:C_DARK}],margin:[0,2,0,3]},
      {text:d.name,bold:true,fontSize:11},{text:`${d.emp_code||''}${d.position?' · '+d.position:''}`,fontSize:7.5,color:C_LAB,margin:[0,0,0,3]},
      {table:{widths:['*','auto'],body:[['อัตราค่าแรง',d.wage_type==='monthly'?`${num(d.rate)} /เดือน`:`${num(d.rate)} /วัน`],['วันทำงาน · OT',`${num(d.days)} วัน · ${num(d.ot_hours)} ชม.`],
          ['รวมก่อนหัก',num(d.gross)],['หักประกันสังคม',`−${num(d.sso)}`],['หักอื่น ๆ',`−${num(otherDed(d))}`]].map(([a,v])=>[{text:a,color:C_LAB},{text:v,alignment:'right',bold:true}])},
        layout:{hLineWidth:i=>i===0?0:.6,vLineWidth:()=>0,hLineColor:()=>'#CBD3D1',hLineStyle:()=>({dash:{length:1,space:1.4}}),paddingLeft:()=>0,paddingRight:()=>0,paddingTop:()=>1.1,paddingBottom:()=>1.1},fontSize:8.6,margin:[0,0,0,1]},
      {table:{widths:['*','auto'],body:[[{text:'รับสุทธิ',color:C_LAB,fontSize:9,margin:[4,3,0,0]},{text:num(d.net),bold:true,fontSize:14,color:C_DARK,margin:[0,0,4,0]}]]},layout:{fillColor:()=>C_BAND,hLineWidth:()=>0,vLineWidth:()=>0},margin:[0,2,0,3]},
      {columns:[{text:advText('slip_note'),fontSize:6.3,color:'#8A979C'},{text:'สแกน QR ดูรายละเอียด',fontSize:6.3,color:'#8A979C',alignment:'right',width:'auto'}]}
    ] };
    content.push({table:{widths:[iw],body:[[node]]},layout:{hLineWidth:()=>0,vLineWidth:()=>0,paddingLeft:()=>0,paddingRight:()=>0,paddingTop:()=>0,paddingBottom:()=>0},absolutePosition:{x,y}}); });
  const cut={canvas:[{type:'line',x1:W,y1:0,x2:W,y2:841.89,lineWidth:.5,dash:{length:3,space:3},lineColor:'#9AA6AA'},...[1,2,3].map(r=>({type:'line',x1:0,y1:r*H,x2:595.28,y2:r*H,lineWidth:.5,dash:{length:3,space:3},lineColor:'#9AA6AA'}))]};
  return { pageSize:'A4', pageMargins:[0,0,0,0], defaultStyle:{font:'Sarabun',fontSize:9,color:'#1B262C',lineHeight:1.12},
    info:{title:`สลิปเงินเดือน ${periodText(p)}`}, background:()=>({...cut,absolutePosition:{x:0,y:0}}), content };
}

/* ---------- ใบเบิกเงินสดจ่ายเงินเดือน (ธนบัตร/เหรียญที่ต้องเตรียม) ---------- */
const CASH_DEN=[[1000,'ธนบัตร','ใบ'],[500,'ธนบัตร','ใบ'],[100,'ธนบัตร','ใบ'],[50,'ธนบัตร','ใบ'],[20,'ธนบัตร','ใบ'],[10,'เหรียญ','เหรียญ'],[5,'เหรียญ','เหรียญ'],[2,'เหรียญ','เหรียญ'],[1,'เหรียญ','เหรียญ']];
/* แตกแบงก์รายคน: จ่ายได้มากที่สุดด้วยแบงก์/เหรียญที่เลือก แล้วใช้จำนวนใบน้อยที่สุด · เศษสตางค์ปัดลง */
function cashBreak(amount, dens){
  const a=Math.max(0,Math.floor(+amount||0)), ds=[...dens].sort((x,y)=>y-x), out={}; ds.forEach(d=>out[d]=0);
  if(!a||!ds.length) return {cnt:out,paid:0,rest:a};
  const big=ds[0], lim=Math.min(a, big*3+(a%big)); // ส่วนที่เกินจ่ายด้วยแบงก์ใหญ่สุดก่อน (แบงก์ไทยเป็นพหุคูณกัน) ที่เหลือคิดแบบละเอียด
  let head=Math.max(0,Math.floor((a-lim)/big)); out[big]+=head; const r=a-head*big;
  const best=new Int32Array(r+1).fill(1e9), from=new Int32Array(r+1).fill(-1); best[0]=0;
  for(let v=1;v<=r;v++) for(const d of ds) if(d<=v&&best[v-d]+1<best[v]){ best[v]=best[v-d]+1; from[v]=d; }
  let v=r; while(v>0&&best[v]>=1e9) v--; const paid=head*big+v;
  while(v>0){ const d=from[v]; out[d]++; v-=d; }
  return {cnt:out,paid,rest:a-paid};
}
/* opt: {per, perNewPage, place} · opt.groups = [{label, slips, transfer}] → หน้าภาพรวม + หน้าแต่ละจุด + ใส่ซองรายคน + รายชื่อโอน */
async function cashDoc(p, slips, dens, opt={}){
  await pdfReady(); await logoData();
  const B=BR(), M=36, W=595.28, iw=W-M*2, sel=CASH_DEN.filter(d=>dens.includes(d[0])).map(d=>d[0]);
  const N=v=>Number(v).toLocaleString('en-US'), bd={hLineWidth:(i,n)=>i===0||i===1||i===n.table.body.length?.7:.3,vLineWidth:()=>0,hLineColor:()=>C_LINE,paddingTop:()=>4,paddingBottom:()=>4,paddingLeft:()=>6,paddingRight:()=>6};
  const H=(t,r)=>({text:t,bold:true,color:C_DARK,fillColor:C_BAND,alignment:r?'right':'left'});
  const calc=L=>{ const rows=L.map(s=>({s,net:+s.data.net||0,...cashBreak(s.data.net,sel)})).filter(r=>r.net>0), tot={}; sel.forEach(d=>tot[d]=rows.reduce((a,r)=>a+r.cnt[d],0));
    const netAll=rows.reduce((a,r)=>a+r.net,0); return {rows,tot,netAll,paid:rows.reduce((a,r)=>a+r.paid,0),rest:rows.reduce((a,r)=>a+r.rest,0),satang:netAll-rows.reduce((a,r)=>a+Math.floor(r.net),0)}; };
  const band=(t,sub,brk)=>({table:{widths:['*'],body:[[{text:[{text:'จ่ายที่: ',color:C_LAB},{text:t,bold:true},...(sub?[{text:`  ·  ${sub}`,color:C_LAB}]:[])],fontSize:10.5,margin:[6,3,6,3]}]]},layout:{fillColor:()=>'#FFF4D6',hLineWidth:()=>0,vLineWidth:i=>i===0?3:0,vLineColor:()=>'#F2B705'},margin:[0,0,0,10],...(brk?{pageBreak:'before'}:{})});
  const signs=(list)=>({columns:list.map(t=>({stack:[{text:'..............................................',alignment:'center',color:'#9AA6AA'},{text:t,alignment:'center',fontSize:8.5,margin:[0,2,0,0]},{text:'วันที่ ......./......./.......',alignment:'center',fontSize:7.5,color:'#9AA6AA',margin:[0,2,0,0]}]})),margin:[0,26,0,0],unbreakable:true});
  const bigBox=(lbl,amt,info)=>({columns:[{stack:info.map(([a,b])=>({columns:[{text:a,color:C_LAB,width:80},{text:b,bold:true}],margin:[0,0,0,3]}))},
      {table:{widths:[190],body:[[{stack:[{text:lbl,fontSize:9,color:'#fff'},{text:`${N(amt)} บาท`,bold:true,fontSize:22,color:'#F2B705'}],margin:[10,6,10,6]}]]},layout:{fillColor:()=>C_DARK,hLineWidth:()=>0,vLineWidth:()=>0},width:190}],margin:[0,0,0,12]});
  const denTable=c=>({table:{headerRows:1,widths:['*',70,44,100],body:[[H('ชนิดเงิน'),H('จำนวน',1),H(''),H('เป็นเงิน (บาท)',1)],
      ...CASH_DEN.map(([v,k,u])=>sel.includes(v)?[{text:`${k} ${N(v)} บาท`,bold:true},{text:N(c.tot[v]),bold:true,alignment:'right',fontSize:12},{text:u,color:C_LAB},{text:fmtN(c.tot[v]*v),alignment:'right'}]
        :[{text:`${k} ${N(v)} บาท`,color:'#9AA6AA',decoration:'lineThrough'},{text:'งดใช้',color:'#9AA6AA',alignment:'right'},{text:''},{text:'-',color:'#9AA6AA',alignment:'right'}]),
      [{text:'รวมทั้งสิ้น',bold:true},{text:''},{text:''},{text:fmtN(c.paid),bold:true,alignment:'right',fontSize:11}]]},layout:{...bd,fillColor:(r,n)=>r===n.table.body.length-1?C_BAND:null}});
  const restNote=c=>c.rest||c.satang>0.004?[{stack:[...(c.rest?[{text:`เศษที่จ่ายด้วยชนิดเงินที่เลือกไม่ได้ รวม ${N(c.rest)} บาท (ดูช่อง "เศษ" ในตารางรายคน) — ต้องเตรียมเงินเพิ่มหรือเลือกชนิดเงินเพิ่ม`,color:'#B42318'}]:[]),
      ...(c.satang>0.004?[{text:`เศษสตางค์ที่ปัดลงทั้งหมด ${fmtN(c.satang)} บาท`,color:C_LAB}]:[])],fontSize:8.5,margin:[0,6,0,0]}]:[];
  const perTable=c=>c.rows.length?[{table:{headerRows:1,dontBreakRows:true,widths:[16,'*','auto',...sel.map(()=>'auto'),...(c.rest?['auto']:[])],
      body:[[H('#'),H('ชื่อ-นามสกุล'),H('จ่ายจริง',1),...sel.map(v=>H(N(v),1)),...(c.rest?[H('เศษ',1)]:[])],
        ...c.rows.map((r,i)=>[{text:String(i+1),color:C_LAB},{text:[r.s.data.name||'',r.s.data.__emp?.nickname?{text:` (${r.s.data.__emp.nickname})`,color:C_LAB}:''].filter(Boolean)},{text:N(r.paid),bold:true,alignment:'right'},
          ...sel.map(v=>({text:r.cnt[v]?String(r.cnt[v]):'·',alignment:'right',color:r.cnt[v]?'#1B262C':'#C9D1D4'})),...(c.rest?[{text:r.rest?N(r.rest):'',alignment:'right',color:'#B42318'}]:[])]),
        [{text:''},{text:'รวม',bold:true},{text:N(c.paid),bold:true,alignment:'right'},...sel.map(v=>({text:N(c.tot[v]),bold:true,alignment:'right'})),...(c.rest?[{text:N(c.rest),bold:true,alignment:'right',color:'#B42318'}]:[])]]},
      layout:{...bd,fillColor:(r,n)=>r===n.table.body.length-1?C_BAND:null},fontSize:8.6}]:[];
  const perTitle=(brk)=>({text:'รายละเอียดการใส่ซองรายคน',bold:true,fontSize:11,color:C_DARK,margin:[0,brk?0:16,0,6],...(brk?{pageBreak:'before'}:{})});
  let body=[];
  if(opt.groups&&opt.groups.length){
    const cashG=opt.groups.filter(g=>!g.transfer&&g.slips.length), trG=opt.groups.filter(g=>g.transfer&&g.slips.length);
    const allC=calc(cashG.flatMap(g=>g.slips)), gc=cashG.map(g=>({g,c:calc(g.slips)})), trL=trG.flatMap(g=>g.slips.map(s=>({s,pt:g.label}))).filter(x=>+x.s.data.net>0);
    body.push(bigBox('ยอดเงินสดที่ต้องเบิก (ทุกจุด)',allC.paid,[['วันที่จ่าย',thaiDate(p.pay_date)],['จุดจ่ายเงินสด',`${gc.length} จุด · ${allC.rows.length} คน`],...(trL.length?[['โอนเข้าบัญชี',`${trL.length} คน · ${fmtN(trL.reduce((a,x)=>a+(+x.s.data.net||0),0))} บาท`]]:[])]),
      {table:{headerRows:1,widths:['*',50,100],body:[[H('จุดจ่าย'),H('คน',1),H('เงินสด (บาท)',1)],...gc.map(({g,c})=>[{text:g.label},{text:String(c.rows.length),alignment:'right'},{text:fmtN(c.paid),alignment:'right',bold:true}]),
        [{text:'รวมเงินสด',bold:true},{text:String(allC.rows.length),alignment:'right',bold:true},{text:fmtN(allC.paid),alignment:'right',bold:true}]]},layout:{...bd,fillColor:(r,n)=>r===n.table.body.length-1?C_BAND:null},margin:[0,0,0,10]},
      denTable(allC),...restNote(allC),
      ...(trL.length?[{text:`ไม่รวมในเงินสด: ${trG.map(g=>g.label).join(', ')} ${trL.length} คน ${fmtN(trL.reduce((a,x)=>a+(+x.s.data.net||0),0))} บาท (ดูหน้ารายชื่อโอน)`,fontSize:8.5,color:'#0B6BCB',margin:[0,6,0,0]}]:[]),
      signs(advList('cash_sign')));
    gc.forEach(({g,c})=>{ body.push(band(g.label,`${c.rows.length} คน`,true),bigBox('แบ่งเงินสดไปจุดนี้',c.paid,[['วันที่จ่าย',thaiDate(p.pay_date)],['จำนวนพนักงาน',`${c.rows.length} คน`]]),denTable(c),...restNote(c),signs(['ผู้จัดเงิน','ผู้รับเงินไปจ่าย']));
      if(opt.per!==false&&c.rows.length) body.push(band(g.label,'ใส่ซองรายคน',true),...perTable(c)); });
    if(trL.length){ const tot=trL.reduce((a,x)=>a+(+x.s.data.net||0),0);
      body.push(band(trG.map(g=>g.label).join(', '),'รายชื่อโอนเงิน',true),{table:{headerRows:1,dontBreakRows:true,widths:[16,'*','auto','auto'],body:[[H('#'),H('ชื่อ-นามสกุล'),H('ธนาคาร / เลขบัญชี'),H('ยอดโอน (บาท)',1)],
        ...trL.map((x,i)=>{ const e=x.s.data.__emp||{}; const bank=[e.bank_name,e.bank_account_no].filter(Boolean).join(' ')||x.s.data.bank||'-';
          return [{text:String(i+1),color:C_LAB},{text:[x.s.data.name||'',e.bank_account_name&&e.bank_account_name!==x.s.data.name?{text:`\nชื่อบัญชี: ${e.bank_account_name}`,color:C_LAB,fontSize:8}:''].filter(Boolean)},{text:bank},{text:fmtN(+x.s.data.net||0),alignment:'right',bold:true}]; }),
        [{text:''},{text:'รวม',bold:true},{text:''},{text:fmtN(tot),alignment:'right',bold:true}]]},layout:{...bd,fillColor:(r,n)=>r===n.table.body.length-1?C_BAND:null},fontSize:9},signs(['ผู้ทำรายการโอน','ผู้อนุมัติ'])); }
  } else {
    const c=calc(slips);
    body.push(bigBox('ยอดเงินสดที่ต้องเบิก',c.paid,[['วันที่จ่าย',thaiDate(p.pay_date)],['จำนวนพนักงาน',`${c.rows.length} คน`],['ยอดสุทธิในระบบ',`${fmtN(c.netAll)} บาท`]]),denTable(c),...restNote(c),signs(advList('cash_sign')));
    if(opt.per!==false&&c.rows.length) body.push(perTitle(opt.perNewPage),...perTable(c));
  }
  return { pageSize:'A4', _rh:2, pageMargins:[M,32,M,44], defaultStyle:{font:'Sarabun',fontSize:9.5,color:'#1B262C',lineHeight:1.15}, info:{title:`ใบเบิกเงินสด ${periodText(p)}`,author:B.company_th},
    footer:(c,n)=>({columns:[{text:`${B.app} · คำนวณจากยอดสุทธิในระบบเงินเดือน (เศษสตางค์ปัดลง)`,fontSize:7,color:'#9AA6AA'},{text:`หน้า ${c}/${n}`,alignment:'right',fontSize:7,color:'#9AA6AA'}],margin:[M,14,M,0]}),
    content:[
      {columns:[{...logoNode(36),width:40},{stack:[{text:B.company_th,bold:true,fontSize:12.5,color:C_DARK},{text:B.company_en,fontSize:7,color:C_LAB,characterSpacing:.5}],margin:[6,4,0,0],width:'*'},
        {stack:[{text:'ใบเบิกเงินสดจ่ายเงินเดือน',bold:true,fontSize:16,color:C_DARK,alignment:'right'},{text:periodText(p),fontSize:9.5,color:C_LAB,alignment:'right'},...(opt.place?[{text:`จ่ายที่: ${opt.place}`,bold:true,fontSize:9.5,background:'#F2B705',alignment:'right',margin:[0,2,0,0]}]:opt.groups?[{text:'ทุกจุดจ่าย',bold:true,fontSize:9.5,alignment:'right',margin:[0,2,0,0]}]:[])],width:'auto'}],columnGap:4},
      ruleLine(iw), ...body ] };
}

/* ---------- สลิปแบบละเอียด (A4 แนวตั้ง จัดสมดุลเต็มหน้า) ---------- */
async function detailDoc(p, s){
  await pdfReady(); await logoData();
  const B=BR(), d=s.data, W=595.28-2*46, totDed=(+d.sso||0)+otherDed(d);
  const L=(t)=>({text:t,fontSize:8.5,color:C_LAB}), V=(t,o={})=>({text:t,bold:true,fontSize:11,...o});
  const inc=[[ d.wage_type==='monthly'?`เงินเดือน ${num(d.rate)} ÷ 2${+d.unpaid?`\nหักขาด/ลาไม่ได้ค่าจ้าง ${num(d.unpaid)} วัน`:''}`:`ค่าแรง ${num(d.days)} วัน${+d.paid_leave?` + ลาได้ค่าจ้าง ${num(d.paid_leave)}`:''}${+d.hol_paid?` + วันหยุดได้ค่าจ้าง ${num(d.hol_paid)}`:''} × ${num(d.rate)}`, num(d.wage) ]];
  if(+d.ot_hours) inc.push([`ค่าล่วงเวลา (OT) ${num(d.ot_hours)} ชม. × ${num(d.ot_rate)}`, num(d.ot)]);
  (d.items||[]).filter(x=>x.kind==='add').forEach(x=>inc.push([x.label,num(x.amount)]));
  const ded=[]; if(+d.sso) ded.push(['ประกันสังคม',num(d.sso)]);
  (d.inst||[]).forEach(x=>ded.push([`${x.kind==='advance'?'เบิกล่วงหน้า':'สินค้าบริษัท'}: ${x.title}\nงวด ${x.no}/${x.of} · คงเหลือหลังหัก ${num(x.remain_after)}`,num(x.amount)]));
  (d.items||[]).filter(x=>x.kind==='deduct').forEach(x=>ded.push([x.label,num(x.amount)]));
  if(!ded.length) ded.push(['ไม่มีรายการหัก','0.00']);
  const money=(title,rows,total,totLabel)=>({table:{widths:['*','auto'],body:[[{text:title,bold:true,color:'#fff',fillColor:C_DARK},{text:'บาท',bold:true,color:'#fff',fillColor:C_DARK,alignment:'right'}],
      ...rows.map(r=>[{text:r[0],fontSize:9.5},{text:r[1],alignment:'right',fontSize:10}]),[{text:totLabel,bold:true,fillColor:C_BAND},{text:total,bold:true,alignment:'right',fillColor:C_BAND}]]},
    layout:{hLineWidth:(i,n)=>i===0||i===n.table.body.length?0:.5,vLineWidth:()=>0,hLineColor:()=>C_LINE,paddingTop:()=>6,paddingBottom:()=>6,paddingLeft:()=>8,paddingRight:()=>8}});
  const att=[['มาทำงาน',d.present,'วัน'],['มาสาย',d.late,'วัน'],['ครึ่งวัน',d.half,'วัน'],['ลาป่วย',d.sick,'วัน'],['ลากิจ',d.personal,'วัน'],['ลาพักร้อน',d.vacation,'วัน'],['ขาดงาน',d.absent,'วัน'],['วันหยุด',(+d.hol_paid||0)+(+d.hol_unpaid||0),'วัน'],['ล่วงเวลา',d.ot_hours,'ชม.']];
  const attCell=(a)=>({stack:[{text:a[0],fontSize:8.5,color:C_LAB,alignment:'center'},{text:num(a[1]),bold:true,fontSize:16,alignment:'center',color:+a[1]&&['มาสาย','ขาดงาน'].includes(a[0])?'#C0392B':C_DARK,margin:[0,1,0,0]},{text:a[2],fontSize:7.5,color:C_LAB,alignment:'center'}],margin:[0,6,0,6]});
  const remain=(d.inst||[]).filter(x=>+x.remain_after>0);
  return { pageSize:'A4', pageMargins:[46,40,46,50], defaultStyle:{font:'Sarabun',fontSize:10,color:'#1B262C',lineHeight:1.15},
    info:{title:`สลิปเงินเดือน ${d.name} ${periodText(p)}`,author:B.company_th},
    footer:()=>({stack:[{canvas:[{type:'line',x1:0,y1:0,x2:W,y2:0,lineWidth:.5,lineColor:C_LINE}]},{columns:[{text:advText('slip_note')+' · เอกสารนี้เป็นความลับเฉพาะบุคคล',fontSize:7.5,color:'#8A979C'},{text:`สร้างโดย ${B.app} ${new Date().toLocaleDateString('th-TH',{dateStyle:'medium'})}`,fontSize:7.5,color:'#8A979C',alignment:'right',width:'auto'}],margin:[0,4,0,0]}],margin:[46,8,46,0]}),
    content:[
      {columns:[{...logoNode(42),width:46},{stack:[{text:B.company_th,bold:true,fontSize:13,color:C_DARK},{text:B.company_en,fontSize:7.5,color:C_LAB,characterSpacing:.6}],margin:[6,5,0,0]},
        {stack:[{text:'ใบแจ้งเงินเดือน',bold:true,fontSize:18,color:C_DARK,alignment:'right'},{text:'PAYSLIP · รายละเอียด',fontSize:7.5,color:C_LAB,alignment:'right',characterSpacing:1},{text:periodText(p),fontSize:10,alignment:'right',margin:[0,2,0,0]}],width:'auto'}]},
      ruleLine(W),
      {table:{widths:['*','*','*'],body:[[{stack:[L('ชื่อ-นามสกุล'),V(d.name)]},{stack:[L('รหัสพนักงาน'),V(d.emp_code||'-')]},{stack:[L('ตำแหน่ง'),V(d.position||'-')]}],
          [{stack:[L('อัตราค่าจ้าง'),V(d.wage_type==='monthly'?`รายเดือน ${num(d.rate)} บาท`:`รายวัน ${num(d.rate)} บาท`)]},{stack:[L('บัญชีรับเงิน'),V(d.bank||'-')]},{stack:[L('วันที่จ่าย'),V(thaiDate(p.pay_date))]}]]},
        layout:{fillColor:()=>C_BAND,hLineWidth:()=>0,vLineWidth:()=>0,paddingTop:()=>8,paddingBottom:()=>8,paddingLeft:()=>12,paddingRight:()=>12},margin:[0,4,0,16]},
      {columns:[money('รายได้',inc,num(d.gross),'รวมรายได้ (ก่อนหัก)'),money('รายการหัก',ded,num(totDed),'รวมรายการหัก')],columnGap:16},
      {table:{widths:['*','auto'],body:[[{text:'รับสุทธิ',color:'#fff',fontSize:13,margin:[14,10,0,0]},{text:`${num(d.net)} บาท`,bold:true,fontSize:24,color:'#F2B705',margin:[0,2,14,2]}]]},
        layout:{fillColor:()=>C_DARK,hLineWidth:()=>0,vLineWidth:()=>0},margin:[0,18,0,4]},
      ...(+d.carry_out?[{text:`ยอดหักที่เกินรายได้ ${num(d.carry_out)} บาท ยกไปหักในงวดถัดไป`,fontSize:9,color:'#B26A00',margin:[0,2,0,0]}]:[]),
      {text:'สรุปการทำงานในงวด',bold:true,fontSize:11,color:C_DARK,margin:[0,24,0,8]},
      {table:{widths:Array(9).fill('*'),body:[att.map(attCell)]},layout:{hLineWidth:()=>.6,vLineWidth:(i,n)=>i===0||i===n.table.widths.length?.6:.4,hLineColor:()=>C_LINE,vLineColor:()=>C_LINE,fillColor:(r,n,c)=>c%2?null:'#FAFBFB'}},
      ...(remain.length?[{text:'ยอดผ่อนคงเหลือ',bold:true,fontSize:11,color:C_DARK,margin:[0,18,0,6]},{table:{widths:['*','auto'],body:remain.map(x=>[{text:x.title,fontSize:9.5},{text:`${num(x.remain_after)} บาท`,alignment:'right',fontSize:9.5}])},layout:'lightHorizontalLines'}]:[]),
      {table:{widths:[W],body:[[{columns:['ผู้จ่ายเงิน','ผู้รับเงิน'].map(t=>({stack:[{text:'..........................................................',alignment:'center',color:C_LAB},{text:t,alignment:'center',fontSize:9,color:C_LAB},{text:'วันที่ ......../......../........',alignment:'center',fontSize:8,color:'#9AA6AA',margin:[0,2,0,0]}]}))}]]},layout:'noBorders',absolutePosition:{x:46,y:841.89-50-96}}
    ] };
}

/* =====================================================================
   เอกสารทั่วไปแบบเวกเตอร์ (A5 แนวตั้ง) — ใบเบิก/ยืม · ใบคืน · ใบสรุปคนงานหน้าไซต์
   ===================================================================== */
const A5W = 419.53, A5H = 595.28, A5M = 28;
function docHead(title, en, iw){
  const B=BR();
  return [{_dh:true,columns:[{...logoNode(30),width:32},{stack:[{text:B.company_th,bold:true,fontSize:9.6,color:C_DARK},{text:B.company_en,fontSize:6,color:C_LAB,characterSpacing:.4}],margin:[5,2,0,0]},
    {stack:[{text:title,bold:true,fontSize:13.5,color:C_DARK,alignment:'right'},{text:en,fontSize:6.2,color:C_LAB,alignment:'right',characterSpacing:1}],width:'auto'}]}, ruleLine(iw)];
}
const infoGrid = (rows, qr) => ({ columns:[{stack:rows.map(([a,b])=>({columns:[{text:a,color:C_LAB,width:62},{text:b||'-',bold:true}],fontSize:8.8,margin:[0,0,0,3]}))}, ...(qr?[{stack:[{qr,fit:62,alignment:'center'},{text:`สแกนเปิดใน ${BR().app}`,fontSize:6,color:C_LAB,alignment:'center',margin:[0,2,0,0]}],width:70}]:[])], margin:[0,0,0,6] });
const lineTable = (head, rows, widths) => ({ table:{headerRows:1, widths, body:[head.map((h,i)=>({text:h,bold:true,fontSize:8,color:C_DARK,alignment:i&&i>=head.length-2?'right':'left'})), ...rows]},
  layout:{fillColor:r=>r===0?C_BAND:null, hLineWidth:(i,n)=>i===0||i===1||i===n.table.body.length?.6:.3, vLineWidth:()=>0, hLineColor:()=>C_LINE, paddingTop:()=>3.5, paddingBottom:()=>3.5, paddingLeft:()=>5, paddingRight:()=>5}, fontSize:8.6 });
/* แถบขั้นตอนแบบวงกลมเชื่อมเส้น: ผ่านแล้ว = วงกลมทึบ+เครื่องหมายถูก · ขั้นปัจจุบัน = วงแหวนสีทอง · ขั้นถัดไป = วงกลมเส้นเทา */
const stepsBar = (names, cur, iw) => { const n=names.length, cw=iw/n, r=9, cx=cw/2, cy=r+4, GREY='#C9D1D4';
  const cells=names.map((t,i)=>{ const done=i<cur, now=i===cur, seg=(x1,x2,on)=>({type:'line',x1,y1:cy,x2,y2:cy,lineWidth:on?2:1,lineColor:on?C_DARK:GREY,...(on?{}:{dash:{length:2.5,space:2}})});
    const cv=[...(i>0?[seg(0,cx-r-2,i<=cur)]:[]),...(i<n-1?[seg(cx+r+2,cw,i+1<=cur)]:[]),
      {type:'ellipse',x:cx,y:cy,r1:r+3,r2:r+3,color:now?'#FFF4D6':'#FFFFFF'},
      {type:'ellipse',x:cx,y:cy,r1:r,r2:r,color:done?C_DARK:now?'#FFFFFF':'#FFFFFF',lineWidth:done?0:now?1.8:1,lineColor:done?C_DARK:now?C_GOLD:GREY},
      ...(done?[{type:'polyline',lineWidth:1.6,lineColor:'#FFFFFF',points:[{x:cx-4,y:cy+.2},{x:cx-1.2,y:cy+3},{x:cx+4.2,y:cy-3.2}]}]:[])];
    return {stack:[{canvas:cv,width:cw},{text:done?' ':String(i+1),bold:true,fontSize:8.5,color:now?C_GOLD:'#9AA6AA',alignment:'center',margin:[0,-(r+8),0,0]},
      {text:t,fontSize:7.2,bold:done||now,color:done?C_DARK:now?'#1B262C':C_LAB,alignment:'center',margin:[0,r+1,0,0]},
      ...(now?[{text:'ขั้นปัจจุบัน',fontSize:6,color:'#B07F00',alignment:'center'}]:[])],width:cw}; });
  return {columns:cells,columnGap:0,margin:[0,10,0,0]}; };
const signRow = (a,b) => ({ columns:[a,b].map(([name,role])=>({stack:[{canvas:[{type:'line',x1:0,y1:0,x2:150,y2:0,lineWidth:.5,lineColor:C_LINE}]},{text:name||' ',bold:true,fontSize:8.5,margin:[0,3,0,0]},{text:role,fontSize:7,color:C_LAB}],alignment:'center'})), columnGap:20, margin:[0,14,0,0] });
const footNote = (left,right) => ({ columns:[{text:left,fontSize:6.2,color:'#8A979C'},{text:right,fontSize:6.2,color:'#8A979C',alignment:'right',width:'auto'}] });
const a5 = (title, content, footer) => ({ pageSize:'A5', pageMargins:[A5M,A5M,A5M,A5M+12], defaultStyle:{font:'Sarabun',fontSize:9,color:'#1B262C',lineHeight:1.14}, info:{title}, content,
  footer:footer?(()=>{ const fj=JSON.stringify(footer); return (cp,pc)=>({...JSON.parse(fj),margin:[A5M,0,A5M,0]}); })():undefined }); // สร้างท้ายกระดาษใหม่ทุกหน้า (ใช้ object ซ้ำทำให้ตำแหน่งเพี้ยนตั้งแต่หน้า 2)

async function docSlipDoc(doc, lines, site){
  await pdfReady(); await logoData();
  const iw=A5W-A5M*2, brw=doc.doc_type==='BRW', mixed=!brw&&!!doc.due_date, B=BR();
  const title=brw?'ใบขอยืมอุปกรณ์':mixed?'ใบเบิก วัสดุ/อุปกรณ์':'ใบขอเบิกวัสดุ', en=brw?'EQUIPMENT BORROW SLIP':mixed?'MATERIAL & EQUIPMENT REQUISITION':'MATERIAL REQUISITION';
  const t=new Date(doc.created_at), sn=(site?.code?site.code+' ':'')+(site?.name||'');
  const info=brw?[['โครงการ',sn],['ผู้ขอยืม',doc.requester_name],['ระยะเวลายืม',`${thaiDate(doc.need_date)} – ${thaiDate(doc.due_date)}`],['ใช้สำหรับ',doc.need_note||'-']]
    :[['โครงการ',sn],['หมวดงาน',doc.work_category||'-'],['ผู้ขอเบิก',doc.requester_name],['ต้องการใช้',doc.need_date?`${thaiDate(doc.need_date)} ${doc.need_note||''}`:(doc.need_note||'-')],...(mixed?[['กำหนดคืน',`${thaiDate(doc.due_date)} (อุปกรณ์)`]]:[])];
  const rows=lines.map((x,i)=>{ const m=matById(x.material_id); return [{text:String(i+1),color:C_LAB},{stack:[{text:m.name,bold:true},...(m.spec?[{text:m.spec,fontSize:7,color:C_LAB}]:[]),...(m.item_type==='tool'?[{text:'อุปกรณ์ (ต้องคืน)',fontSize:6.8,color:'#B26A00'}]:[])]},{text:fmtN(x.qty_approved??x.qty_req),bold:true,alignment:'right'},{text:m.unit,color:C_LAB,alignment:'right'}]; });
  const stepI=(brw?{pending:1,approved:2,partial:2,issued:2,received:3,review:3,returned:4}:{pending:1,approved:2,partial:2,issued:3,received:4,review:3,returned:4})[doc.status]??1;
  const content=[...docHead(title,en,iw),
    {columns:[{text:['เลขที่ ',{text:doc.doc_no,bold:true}],fontSize:8.6},{text:`${thaiDate(localISO(t))} · ${t.toTimeString().slice(0,5)} น.`,fontSize:8,color:C_LAB,alignment:'right'}],margin:[0,0,0,6]},
    infoGrid(info, `${location.origin}${location.pathname}#${brw?'brw':'mat'}/d/${doc.id}`),
    lineTable(['ที่','รายการ','จำนวน','หน่วย'], rows, [14,'*',46,34]),
    {text:`รวม ${lines.length} รายการ`,fontSize:7.6,color:C_LAB,alignment:'right',margin:[0,3,0,0]},
    ...(brw||mixed?[{text:'ผู้ยืมรับผิดชอบดูแลอุปกรณ์จนกว่าจะคืน หากชำรุดหรือสูญหายต้องแจ้งทันที',fontSize:7.4,color:C_LAB,margin:[0,6,0,0]}]:[]),
    ...(doc.note?[{text:doc.note,fontSize:7.6,color:C_LAB,margin:[0,4,0,0]}]:[]),
    {unbreakable:true,stack:[stepsBar(brw?['ขอยืม','อนุมัติ','รับของ','คืนแล้ว']:mixed?['ขอเบิก','อนุมัติ','จ่ายของ','รับของ','คืนอุปกรณ์']:['ขอเบิก','อนุมัติ','จ่ายของ','รับของ'], stepI, iw),
    signRow([doc.requester_name,`${brw?'ผู้ขอยืม':'ผู้ขอเบิก'} · ส่งในระบบ ${t.toTimeString().slice(0,5)} น.`],[doc.approver_name||(doc.status==='rejected'?'ไม่อนุมัติ':'รออนุมัติ'),`ผู้อนุมัติ${doc.approved_at?' · '+new Date(doc.approved_at).toTimeString().slice(0,5)+' น.':''}`])]}]; // แถบขั้นตอน+ลายเซ็นไม่แยกหน้า
  return {...a5(`${title} ${doc.doc_no}`, content, footNote(`สร้างโดย ${B.app}`,'ไม่แสดงราคา · เอกสารอ้างอิงในระบบ')), _rh:4 }; // หัวกระดาษ + เลขที่ + ข้อมูลโครงการ/QR ซ้ำทุกหน้า
}
async function returnSlipDoc(doc, ret, site){
  await pdfReady(); await logoData();
  const iw=A5W-A5M*2, B=BR(), t=new Date(ret.returned_at||Date.now()), sn=(site?.code?site.code+' ':'')+(site?.name||'');
  const cond=l=>[l.ok?`ปกติ ${fmtN(l.ok)}`:'',l.damaged?`ชำรุด ${fmtN(l.damaged)}`:'',l.lost?`สูญหาย ${fmtN(l.lost)}`:''].filter(Boolean).join(' · ');
  const rows=(ret.lines||[]).map((l,i)=>{ const m=matById(l.material_id); return [{text:String(i+1),color:C_LAB},{stack:[{text:m.name,bold:true},{text:m.item_type==='tool'?'อุปกรณ์':'วัสดุเหลือใช้ คืนเข้าคลัง',fontSize:6.8,color:C_LAB}]},{text:cond(l),alignment:'right',color:(l.damaged||l.lost)?'#B42318':'#1B262C'},{text:m.unit,color:C_LAB,alignment:'right'}]; });
  const content=[...docHead('ใบคืน วัสดุ/อุปกรณ์','RETURN SLIP',iw),
    {columns:[{text:['อ้างอิง ',{text:doc.doc_no,bold:true}],fontSize:8.6},{text:`${thaiDate(localISO(t))} · ${t.toTimeString().slice(0,5)} น.`,fontSize:8,color:C_LAB,alignment:'right'}],margin:[0,0,0,6]},
    infoGrid([['โครงการ',sn],['ผู้คืน',ret.returned_name],['ผู้ขอเบิกเดิม',doc.requester_name]], `${location.origin}${location.pathname}#mat/d/${doc.id}`),
    lineTable(['ที่','รายการ','จำนวน / สภาพ','หน่วย'], rows, [14,'*',100,34]),
    ...(ret.note?[{text:`หมายเหตุ: ${ret.note}`,fontSize:7.8,color:C_LAB,margin:[0,6,0,0]}]:[]),
    {columns:[{stack:[...(ret.signature?[{image:ret.signature,fit:[150,46],alignment:'center'}]:[{text:' ',margin:[0,20,0,0]}]),{canvas:[{type:'line',x1:0,y1:0,x2:150,y2:0,lineWidth:.5,lineColor:C_LINE}]},{text:ret.returned_name||'',bold:true,fontSize:8.5,margin:[0,3,0,0]},{text:'ผู้คืน (ลงชื่อในระบบ)',fontSize:7,color:C_LAB}],alignment:'center'},
      {stack:[{text:' ',margin:[0,46,0,0]},{canvas:[{type:'line',x1:0,y1:0,x2:150,y2:0,lineWidth:.5,lineColor:C_LINE}]},{text:' ',fontSize:8.5,margin:[0,3,0,0]},{text:'ผู้รับคืน (สโตร์)',fontSize:7,color:C_LAB}],alignment:'center'}],columnGap:20,margin:[0,14,0,0]}];
  return {...a5(`ใบคืน ${doc.doc_no}`, content, footNote(`สร้างโดย ${B.app}`,'อุปกรณ์ชำรุดย้ายไปคลังส่งซ่อม')), _rh:4 }; // หัวกระดาษ + เลขที่ + ข้อมูลโครงการ/QR ซ้ำทุกหน้า
}
async function crewSlipDoc(rep, site, docNo){
  await pdfReady(); await logoData();
  const iw=A5W-A5M*2, B=BR(), t=new Date(rep.updated_at||Date.now()), rows=Object.entries(rep.counts||{}).filter(([,n])=>n>0);
  const content=[...docHead('ใบสรุปคนงานหน้าไซต์','SITE MANPOWER REPORT',iw),
    {columns:[{text:['เลขที่ ',{text:docNo,bold:true}],fontSize:8.6},{text:`${dayLong(rep.report_date)} · ${t.toTimeString().slice(0,5)} น.`,fontSize:8,color:C_LAB,alignment:'right'}],margin:[0,0,0,6]},
    {columns:[{stack:[['โครงการ',(site?.code?site.code+' ':'')+(site?.contract_name||site?.name||'')],['สถานที่',site?.location||'-'],['ผู้รายงาน',rep.submitted_name||S.profile.display_name]].map(([a,b])=>({columns:[{text:a,color:C_LAB,width:56},{text:b||'-',bold:true}],fontSize:8.8,margin:[0,0,0,3]}))},
      {table:{widths:[78],body:[[{stack:[{text:String(rep.total||0),bold:true,fontSize:28,color:C_DARK,alignment:'center'},{text:'คนงานรวม (คน)',fontSize:7,color:C_LAB,alignment:'center'}],margin:[0,4,0,4]}]]},layout:{hLineWidth:()=>.6,vLineWidth:()=>.6,hLineColor:()=>C_LINE,vLineColor:()=>C_LINE},width:80}],margin:[0,0,0,8]},
    lineTable(['ที่','ประเภทช่าง / ตำแหน่ง','จำนวน (คน)'], [...rows.map(([k,n],i)=>[{text:String(i+1),color:C_LAB},{text:k,bold:true},{text:String(n),bold:true,alignment:'right'}]),
      [{text:''},{text:'รวมทั้งสิ้น',bold:true,alignment:'right'},{text:String(rep.total||0),bold:true,alignment:'right'}]], [14,'*',70]),
    ...(rep.note?[{text:`หมายเหตุ: ${rep.note}`,fontSize:7.8,color:C_LAB,margin:[0,6,0,0]}]:[]),
    signRow([rep.submitted_name||S.profile.display_name,`ผู้รายงาน · ส่งในระบบ ${t.toTimeString().slice(0,5)} น.`],['','ผู้ตรวจสอบ'])];
  return a5(`ใบสรุปคนงาน ${docNo}`, content, footNote(`สร้างโดย ${B.app}`,'ข้อมูล ณ เวลาที่ส่ง'));
}
/* หน้าดูตัวอย่าง = ภาพจาก PDF ตัวจริง (ตรงกับไฟล์ที่ส่งออกทุกจุด) + บันทึกรูป/แชร์/PDF ครบทุกหน้า */
const b64Blob = async b64 => (await fetch('data:image/png;base64,'+b64)).blob();
const pngName = (name,i,n) => n>1?`${name}_หน้า${i+1}.png`:`${name}.png`;
async function savePngs(pngs, name){ for(let i=0;i<pngs.length;i++) await saveOrShare(await b64Blob(pngs[i]), pngName(name,i,pngs.length)); }
async function vectorPreview(dd, name, title, extraHTML='', onReady){
  const prog=overlay(`<div class="modal" role="dialog" aria-modal="true"><div class="row" style="gap:10px"><span class="spin" style="margin:0"></span><b>กำลังสร้างเอกสาร</b></div></div>`,true,false);
  try{
    const blob=await pdfBlob(dd), pngs=await pdfToPngs(blob,3), png64=pngs[0], blobs=await Promise.all(pngs.map(b64Blob)), urls=blobs.map(b=>URL.createObjectURL(b)), pngBlob=blobs[0], url=urls[0], purl=URL.createObjectURL(blob);
    prog.close();
    const m=overlay(`<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}"><header class="appbar stripe"><button class="ibtn" data-x aria-label="ปิด">${IC.close}</button><h1>${esc(title)}<small>${esc(name)}${urls.length>1?` · ${urls.length} หน้า`:''}</small></h1></header>
      <div class="sheet-body">${urls.map((u,i)=>`<img src="${u}" alt="${esc(title)} หน้า ${i+1}" style="width:100%;max-width:520px;border-radius:10px;box-shadow:var(--shadow);align-self:center">`).join('')}${extraHTML}</div>
      <div class="sheet-foot" style="flex-wrap:wrap"><button class="btn" data-save>บันทึกรูป${urls.length>1?` (${urls.length})`:''}</button><button class="btn" data-pdf>PDF</button><button class="btn btn-p" data-share style="background:#06C755;border-color:#06C755;color:#fff">แชร์รูปเข้า LINE</button></div></div>`, false, false);
    $('[data-x]',m.el).onclick=()=>{ urls.forEach(u=>URL.revokeObjectURL(u)); URL.revokeObjectURL(purl); m.close(); };
    $('[data-save]',m.el).onclick=()=>savePngs(pngs,name);
    $('[data-pdf]',m.el).onclick=async()=>{ const f=new File([blob],name+'.pdf',{type:'application/pdf'}); try{ if(navigator.canShare&&navigator.canShare({files:[f]})) await navigator.share({files:[f],title}); else dl(purl,name+'.pdf'); }catch(e){ if(e.name!=='AbortError') dl(purl,name+'.pdf'); } };
    $('[data-share]',m.el).onclick=async()=>{ const fs=blobs.map((b,i)=>new File([b],pngName(name,i,blobs.length),{type:'image/png'})); try{ if(navigator.canShare&&navigator.canShare({files:fs})) await navigator.share({files:fs,title}); else { urls.forEach((u,i)=>dl(u,pngName(name,i,urls.length))); toast('อุปกรณ์นี้แชร์ไฟล์ไม่ได้ บันทึกรูปให้แล้ว'); } }catch(e){ if(e.name!=='AbortError') toast(errText(e),true); } };
    onReady&&onReady({m,blob,png64,pngs});
  }catch(e){ prog.close(); toast(errText(e),true); }
}
/* ตัวอย่างสด: สร้าง PDF จริงแล้วแสดงเป็นภาพทุกหน้า — ปรับค่าแล้ววาดใหม่ (หน่วงเล็กน้อย) */
function livePdf(host, build, onDone){
  let timer=null, running=false, again=false; const st={blob:null,pages:0};
  async function run(){ if(running){ again=true; return; } running=true; host.classList.add('pv-busy');
    try{ const dd=await build(); const blob=await pdfBlob(dd); const pngs=await pdfToPngs(blob,1.6);
      host.innerHTML=pngs.map((b,i)=>`<img src="data:image/png;base64,${b}" alt="ตัวอย่างหน้า ${i+1}" class="arimg">`).join(''); st.blob=blob; st.pages=pngs.length; onDone&&onDone(st); }
    catch(e){ host.innerHTML=`<div class="note n-bad">${esc(errText(e))}</div>`; st.blob=null; }
    host.classList.remove('pv-busy'); running=false; if(again){ again=false; run(); } }
  st.render=(now)=>{ clearTimeout(timer); if(now) run(); else timer=setTimeout(run,450); };
  return st;
}
/* ---------- ใบสรุปคนงานประจำวัน (A4 แนวตั้ง จัดกลุ่มตามหน้างาน) ---------- */
async function dailySummaryDoc(date, rows){
  await pdfReady(); await logoData();
  const W=595.28, M=34, iw=W-M*2, B=BR();
  const COL={present:'#16A34A',late:'#D97706',half:'#0284C7',sick:'#7C3AED',personal:'#7C3AED',vacation:'#7C3AED',absent:'#DC2626',off:'#64748B',...ATT_COL};
  const LBL=Object.fromEntries(Object.keys(ATT).map(k=>[k,ATT[k].t]));
  const work=rows.filter(r=>['present','late','half'].includes(r.status)), other=rows.filter(r=>!['present','late','half'].includes(r.status));
  const sort=(a,b)=>(a.e.sort_order??1e9)-(b.e.sort_order??1e9)||String(a.e.emp_code).localeCompare(String(b.e.emp_code));
  const groups={}; work.forEach(r=>{ const k=r.site_id||0; (groups[k]=groups[k]||[]).push(r); });
  const siteKeys=Object.keys(groups).sort((a,b)=>groups[b].length-groups[a].length);
  const cnt=k=>rows.filter(r=>k.includes(r.status)).length;
  const p=parseISO(date), docNo=`DWS-${String(p.y+543).slice(-2)}${String(p.m).padStart(2,'0')}${String(p.d).padStart(2,'0')}`;
  const stat=(t,v,c)=>({stack:[{text:String(v),bold:true,fontSize:17,color:c,alignment:'center'},{text:t,fontSize:7.5,color:C_LAB,alignment:'center'}],margin:[0,3,0,3]});
  let n=0;
  const sections=siteKeys.map(k=>{ const site=S.sites.find(s=>s.id===+k), list=groups[k].sort(sort);
    return {stack:[
      {table:{widths:['*','auto'],body:[[{text:site?`${site.name}${site.code?` (${site.code})`:''}`:'ไม่ระบุไซต์',bold:true,color:'#fff',fontSize:10},{text:[`${list.length} คน`],bold:true,color:'#F2B705',fontSize:10,alignment:'right'}]]},layout:{hLineWidth:()=>0,vLineWidth:()=>0,fillColor:()=>C_DARK,paddingLeft:()=>8,paddingRight:()=>8,paddingTop:()=>4,paddingBottom:()=>4}},
      {table:{widths:[18,'*',100,58,30],headerRows:0,body:list.map(r=>{ n++; return [{text:String(n),color:C_LAB},{text:[{text:`${r.e.first_name} ${r.e.last_name||''}`.trim(),bold:true},r.e.nickname?` (${r.e.nickname})`:'']},{text:r.e.position||'-',color:C_LAB},{text:LBL[r.status],bold:true,color:COL[r.status],alignment:'center'},{text:+r.ot_hours?`OT ${num(r.ot_hours)}`:'',fontSize:7.5,color:C_LAB,alignment:'right'}]; })},
        layout:{hLineWidth:(i,node)=>i===node.table.body.length?.6:.3,vLineWidth:(i,node)=>i===0||i===node.table.widths.length?.6:0,hLineColor:()=>C_LINE,vLineColor:()=>C_LINE,paddingLeft:()=>6,paddingRight:()=>6,paddingTop:()=>3.5,paddingBottom:()=>3.5},fontSize:9}
    ],margin:[0,0,0,9],unbreakable:list.length<=18}; });
  const box=(t,c,list)=>({stack:[{text:`${t} (${list.length})`,bold:true,color:c,fontSize:9},{text:list.length?list.sort(sort).map(r=>`${r.e.first_name}${r.e.nickname?` (${r.e.nickname})`:''}${r.status==='sick'?' ป':r.status==='personal'?' ก':r.status==='vacation'?' พ':''}`).join(', '):'-',fontSize:8,color:C_LAB,margin:[0,2,0,0]}],margin:[6,5,6,5]});
  const boxes={table:{widths:['*','*','*'],body:[[box('ลา','#7C3AED',other.filter(r=>['sick','personal','vacation'].includes(r.status))),box('ขาด','#DC2626',other.filter(r=>r.status==='absent')),box('วันหยุดบริษัท','#64748B',other.filter(r=>r.status==='off'))]]},layout:{hLineWidth:()=>.6,vLineWidth:()=>.6,hLineColor:()=>C_LINE,vLineColor:()=>C_LINE},margin:[0,4,0,0],unbreakable:true};
  return { pageSize:'A4', pageMargins:[M,M,M,M+10], defaultStyle:{font:'Sarabun',fontSize:9,color:'#1B262C',lineHeight:1.12}, info:{title:`ใบสรุปคนงานประจำวัน ${date}`,author:B.company_th},
    footer:(c,t)=>({columns:[{text:`${B.app} · เอกสารนี้สร้างจากการเช็คชื่อในระบบ`,fontSize:6.5,color:'#9AA6AA'},{text:`หน้า ${c}/${t}`,alignment:'right',fontSize:6.5,color:'#9AA6AA'}],margin:[M,0,M,0]}),
    content:[...docHead('ใบสรุปคนงานประจำวัน','DAILY WORKFORCE SUMMARY',iw),
      {columns:[{text:dayLong(date),fontSize:10,bold:true},{text:['เลขที่ ',{text:docNo,bold:true}],fontSize:9,alignment:'right'}],margin:[0,0,0,6]},
      {table:{widths:['*','*','*','*','*','*'],body:[[stat('มาทำงานรวม',work.length,C_DARK),stat('มา',cnt(['present']),'#16A34A'),stat('มาสาย',cnt(['late']),'#D97706'),stat('ลา',cnt(['sick','personal','vacation']),'#7C3AED'),stat('ขาด',cnt(['absent']),'#DC2626'),stat('วันหยุด',cnt(['off']),'#64748B')]]},layout:{hLineWidth:()=>.6,vLineWidth:()=>.6,hLineColor:()=>C_LINE,vLineColor:()=>C_LINE},margin:[0,0,0,10]},
      ...(sections.length?sections:[{text:'วันนี้ไม่มีผู้มาทำงาน',color:C_LAB,margin:[0,10,0,10]}]),
      boxes,
      {columns:advList('dws_sign').map(t=>({stack:[{text:'..............................................',alignment:'center',color:'#9AA6AA'},{text:t,alignment:'center',fontSize:8.5,margin:[0,2,0,0]}]})),margin:[0,26,0,0],unbreakable:true}
    ] };
}

/* ---------- ใบแจ้งปัญหา (A5 แนวตั้ง) ---------- */
async function issueDoc(i, imgs){
  await pdfReady(); await logoData();
  const iw=A5W-A5M*2, U={normal:['ปกติ','#64748B'],urgent:['ด่วน','#D97706'],critical:['ด่วนมาก/อันตราย','#DC2626']}[i.urgency]||['ปกติ','#64748B'];
  const site=S.sites.find(s=>s.id===i.site_id), t=new Date(i.created_at);
  const extra=formOf('issue').filter(f=>!f.core&&i.extra&&cfText(f,i.extra[f.key])).map(f=>[f.label,cfText(f,i.extra[f.key])]);
  const pics=imgs.slice(0,4), pw=(iw-6*(Math.min(pics.length,2)-1))/Math.min(Math.max(pics.length,1),2);
  return { pageSize:{width:A5W,height:595.28}, pageMargins:[A5M,A5M,A5M,A5M+8], defaultStyle:{font:'Sarabun',fontSize:9,color:'#1B262C',lineHeight:1.15}, info:{title:`ใบแจ้งปัญหา ${i.issue_no||''}`},
    footer:()=>({text:`${BR().app} · ใบแจ้งปัญหา`,fontSize:6.5,color:'#9AA6AA',margin:[A5M,0,A5M,0]}),
    content:[...docHead('ใบแจ้งปัญหา','ISSUE REPORT',iw),
      {columns:[{text:['เลขที่ ',{text:i.issue_no||'-',bold:true}],fontSize:8.8},{table:{widths:[80],body:[[{text:U[0],bold:true,color:'#fff',fillColor:U[1],fontSize:8.5,alignment:'center',noWrap:true}]]},layout:'noBorders',width:80}],margin:[0,0,0,6]},
      {text:i.title,bold:true,fontSize:13,color:C_DARK,margin:[0,0,0,4]},
      {text:`${i.category}${site?' · '+site.name:''}`,fontSize:8.5,color:C_LAB},
      {text:`แจ้งโดย ${i.reporter_name||''}${i.reporter_position?' ('+i.reporter_position+')':''} · ${t.toLocaleString('th-TH',{dateStyle:'medium',timeStyle:'short'})}`,fontSize:8.5,color:C_LAB,margin:[0,0,0,8]},
      ...(i.detail?[{text:i.detail,fontSize:9.5,margin:[0,0,0,8]}]:[]),
      ...(extra.length?[{table:{widths:[90,'*'],body:extra.map(([a,b])=>[{text:a,color:C_LAB},{text:b,bold:true}])},layout:'lightHorizontalLines',margin:[0,0,0,8]}]:[]),
      ...(pics.length?[{columns:pics.slice(0,2).map(src=>({image:src,fit:[pw,150]})),columnGap:6,margin:[0,0,0,6]},...(pics.length>2?[{columns:pics.slice(2,4).map(src=>({image:src,fit:[pw,150]})),columnGap:6}]:[])]:[]),
      {text:`สถานะ: ${({new:'ใหม่',acknowledged:'รับเรื่อง',in_progress:'กำลังแก้ไข',resolved:'แก้แล้ว',closed:'ปิดเรื่อง'})[i.status]}${i.assignee_name?' · ผู้รับผิดชอบ '+i.assignee_name:''}`,fontSize:8,color:C_LAB,margin:[0,10,0,0]}
    ] };
}

/* ---------- เอกสาร A4 แบบราชการ: ขออนุมัติงาน (QR เปิดโฟลเดอร์ Drive ของใบ) ---------- */
/* ใบขออนุมัติงาน (ทุกประเภท) — บังคับ 1 หน้า A4: ลองขนาดปกติก่อน ถ้าเกินจะย่อระยะ/ตัวอักษร/รูป ทีละขั้นจนพอดีหน้าเดียว */
const WA_FIT=[{s:1,pc:3,ar:.72},{s:.96,pc:4,ar:.72},{s:.92,pc:4,ar:.62},{s:.88,pc:5,ar:.66},{s:.84,pc:6,ar:.66},{s:.8,pc:7,ar:.66},{s:.76,pc:8,ar:.66},{s:.72,pc:10,ar:.66}];
async function pageCount(dd){ let n=1; const f=dd.footer; dd.footer=(c,t)=>{ n=t; return typeof f==='function'?f(c,t):(f||null); }; await prepDoc(dd); await new Promise(r=>pdfMake.createPdf(dd).getBuffer(r)); return n; }
async function fitOnePage(build, levels){ for(let i=0;i<levels;i++){ if(await pageCount(await build(i))<=1) return build(i); } return build(levels-1); }
async function waDocFit(w, photos){ await pdfReady(); await logoData(); return fitOnePage(lv=>waDoc(w,photos,lv), WA_FIT.length); }
async function waDoc(w, photos, lv=0){
  await pdfReady(); await logoData();
  const F=WA_FIT[Math.min(lv,WA_FIT.length-1)], k=F.s, z=v=>+(v*k).toFixed(2);
  const t=(typeof waType==='function'&&waType(w.type_key))||{name:w.type_key,signers:[],doc_title:'แบบขออนุมัติ',doc_title_en:''};
  const B=BR(), W=595.28, M=36, iw=W-M*2, site=S.sites.find(s=>s.id===w.site_id), dt=new Date(w.created_at);
  const thDate=d=>`${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${d.getFullYear()+543}`;
  const bd={hLineWidth:()=>.7,vLineWidth:()=>.7,hLineColor:()=>'#1B262C',vLineColor:()=>'#1B262C',paddingLeft:()=>z(5),paddingRight:()=>z(5),paddingTop:()=>z(3),paddingBottom:()=>z(3)};
  const L=(t)=>({text:t,fillColor:'#F1F3F2'});
  const extra=(typeof formOf==='function'?formOf('wa_'+w.type_key):[]).filter(f=>!f.core&&f.type!=='photos'&&f.show_pdf!==0&&w.data&&cfText(f,w.data[f.key])).map(f=>[f.label,cfText(f,w.data[f.key])]);
  const info=[[L('โครงการ'),{text:site?`${site.name}${site.code?` (${site.code})`:''}`:'-',colSpan:3},{},{}],
    [L('ชิ้นส่วนโครงสร้าง'),`${w.element||''} ${w.element_code||''}`.trim()||'-',L('ชั้น/โซน'),w.floor||'-'],
    [L('แบบอ้างอิง'),w.drawing_ref||'-',L('วันเวลา'),w.request_at?new Date(w.request_at).toLocaleString('th-TH',{dateStyle:'medium',timeStyle:'short'})+' น.':'-']];
  for(let i=0;i<extra.length;i+=2){ const a=extra[i], b=extra[i+1]; info.push(b?[L(a[0]),a[1],L(b[0]),b[1]]:[L(a[0]),{text:a[1],colSpan:3},{},{}]); }
  const inspected=(w.checklist||[]).some(c=>c.result);
  const tick=(col)=>({canvas:[{type:'polyline',lineWidth:1.5,lineColor:col,closePath:false,points:[{x:1,y:4.5},{x:4,y:8},{x:10,y:1}]}],width:11,alignment:'center'});
  const cbox=(on)=>({canvas:[{type:'rect',x:0,y:1,w:9,h:9,lineWidth:.8,lineColor:'#1B262C'},...(on?[{type:'polyline',lineWidth:1.5,lineColor:'#1B262C',points:[{x:1.5,y:5.5},{x:4,y:8},{x:8.5,y:2.5}]}]:[])],width:12});
  const ck=[[{text:'ที่',bold:true,fillColor:'#F1F3F2',alignment:'center'},{text:'รายการตรวจสอบ',bold:true,fillColor:'#F1F3F2'},{text:'ผ่าน',bold:true,fillColor:'#F1F3F2',alignment:'center'},{text:'ไม่ผ่าน',bold:true,fillColor:'#F1F3F2',alignment:'center'},{text:'หมายเหตุ',bold:true,fillColor:'#F1F3F2'}],
    ...(w.checklist||[]).map((c,i)=>[{text:String(i+1),alignment:'center'},c.item,(inspected?c.result==='pass':c.self)?{columns:[{text:'',width:'*'},tick('#16A34A'),{text:'',width:'*'}]}:{text:''},c.result==='fail'?{columns:[{text:'',width:'*'},tick('#DC2626'),{text:'',width:'*'}]}:{text:''},{text:c.note||'',fontSize:z(8.5)}])];
  const opt=(on,label)=>[cbox(on),{text:label,width:'auto',noWrap:true,margin:[3,0,14,0]}];
  const res=[{columns:[{text:'ผลการตรวจสอบ',bold:true,width:'auto',noWrap:true,margin:[0,0,14,0]},...opt(w.result==='pass','ผ่าน'),...opt(w.result==='conditional','ผ่านแบบมีเงื่อนไข'),...opt(w.result==='fail','ไม่ผ่าน (แก้ไขแล้วขอตรวจใหม่)'),{text:'',width:'*'}],columnGap:0},
    ...(w.conditions?[{text:['เงื่อนไข/ข้อแก้ไข: ',{text:w.conditions,bold:true}],margin:[0,3,0,0]}]:[])];
  /* รูปทุกชุดรวมเป็นตารางเดียว จำนวนคอลัมน์ตามขั้นการย่อ */
  const pc=F.pc, gap=5, pw=(iw-gap*(pc-1))/pc;
  const cell=(src,cap)=>({stack:[{image:src,fit:[pw,pw*F.ar],alignment:'center'},{text:cap,fontSize:z(7.2),color:'#555',alignment:'center',margin:[0,1,0,0]}]});
  const grid=(cells)=>{ const rows=[]; for(let i=0;i<cells.length;i+=pc){ const r=cells.slice(i,i+pc); while(r.length<pc) r.push({text:''}); rows.push({columns:r,columnGap:gap,margin:[0,0,0,z(4)],unbreakable:true}); } return rows; };
  const picBlocks=[...((photos||[]).length?[{text:'ภาพประกอบ',bold:true,margin:[0,0,0,z(3)]},...grid(photos.map((src,i)=>cell(src,`รูปที่ ${i+1}`)))]:[]),
    ...((photos&&photos.sets)||[]).filter(st=>st.imgs&&st.imgs.length).flatMap(st=>[{text:st.label,bold:true,margin:[0,z(2),0,z(3)]},...grid(st.imgs.map((src,i)=>cell(src,`${st.label} ${i+1}`)))])];
  /* ช่องลงชื่อเรียงแถวเดียว (สูงสุด 4 ช่อง/แถว) */
  const sigCell=(s,i)=>{ const g=(w.signatures||[]).find(x=>x.idx===i);
    return {stack:[g?.sig?{image:g.sig,fit:[110,z(34)],alignment:'center'}:{text:' ',margin:[0,0,0,z(22)]},
      {text:`ลงชื่อ .................................`,alignment:'center'},{text:`(${g?.name||'.................................'})`,alignment:'center',margin:[0,1,0,0]},
      {text:[s.label,...(g?.position?[{text:' · '+g.position,color:'#555'}]:[])],alignment:'center',bold:true,fontSize:z(8.6)},
      {text:g?.at?`วันที่ ${new Date(g.at).toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric'})}`:'วันที่ ......./......./.......',alignment:'center',fontSize:z(8),color:'#555',margin:[0,1,0,0]}]}; };
  const sg=(t.signers||[]).map(sigCell), per=Math.min(4,Math.max(1,sg.length)), sgRows=[];
  for(let i=0;i<sg.length;i+=per){ const r=sg.slice(i,i+per); while(r.length<per) r.push({text:''}); sgRows.push({columns:r,columnGap:10,margin:[0,0,0,z(6)],unbreakable:true}); }
  const qr=w.drive_folder?.url||`${location.origin}${location.pathname}#wa/${w.id}`;
  return { pageSize:'A4', _rh:1, pageMargins:[M,30,M,34], defaultStyle:{font:'Sarabun',fontSize:z(10),color:'#111',lineHeight:1.12}, info:{title:`${t.doc_title} ${w.wa_no||''}`,author:B.company_th},
    footer:(c,n)=>({columns:[{text:`เอกสารจากระบบ ${B.app} · สแกน QR มุมขวาบนเพื่อเปิด${w.drive_folder?.url?'โฟลเดอร์เอกสารและไฟล์แนบ':'ในแอป'}`,fontSize:7,color:'#777'},{text:n>1?`หน้า ${c}/${n}`:'',alignment:'right',fontSize:7,color:'#777'}],margin:[M,10,M,0]}),
    content:[
      {columns:[{...logoNode(38),width:42},{stack:[{text:B.company_th,bold:true,fontSize:12.5},{text:B.company_en,fontSize:7.5,color:'#555',characterSpacing:.4}],margin:[6,4,0,0],width:'*'},
        {stack:[{text:['เลขที่ ',{text:w.wa_no||'-',bold:true}],alignment:'right',fontSize:9.5},{text:`วันที่ ${thDate(dt)}`,alignment:'right',fontSize:9.5}],width:'auto',margin:[0,5,6,0]},
        {stack:[{qr,fit:44,alignment:'right'},{text:w.drive_folder?.url?'ไฟล์แนบ':'เปิดในแอป',fontSize:5.8,color:'#777',alignment:'center'}],width:48}],columnGap:4},
      {stack:[{text:t.doc_title||t.name,bold:true,fontSize:z(16),alignment:'center'},{text:t.doc_title_en||'',fontSize:z(8.5),color:'#555',alignment:'center',characterSpacing:.5}],margin:[0,z(6),0,z(6)]},
      {table:{widths:[86,'*',64,'*'],body:info},layout:bd,margin:[0,0,0,z(7)]},
      {table:{headerRows:1,widths:[22,'*',36,38,104],body:ck},layout:bd,margin:[0,0,0,z(7)]},
      {table:{widths:['*'],body:[[{stack:res}]]},layout:bd,margin:[0,0,0,z(8)]},
      ...picBlocks,
      {text:'',margin:[0,z(8),0,0]},...sgRows
    ] };
}
