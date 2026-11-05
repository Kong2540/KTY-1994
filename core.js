
/* =====================================================================
   ตั้งค่าการเชื่อมต่อ Supabase — Project Settings > API Keys
   ใส่ Project URL และ Publishable key (sb_publishable_...) เท่านั้น
   ===================================================================== */
const SUPABASE_URL = 'https://mydytzlrevzjpqusaohu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_btZKjUqx12VOyTnyMAZOGQ_jpmiLHfl';
const COMPANY = 'หจก.กิตติยาก่อสร้าง 1994';
const APP_VERSION = 'Hub 1.0';
const PHOTO_BUCKET = 'employee-photos';

/* ---------- ค่าคงที่ ---------- */
const ROLES = { pending:'รออนุมัติ', employee:'พนักงาน', foreman:'โฟร์แมน/วิศวกร', executive:'ผู้บริหาร', admin:'แอดมิน' };
const TITLES = ['นาย','นาง','นางสาว','อื่น ๆ'];
const MARITAL = { single:'โสด', married:'สมรส', divorced:'หย่าร้าง', widowed:'หม้าย', separated:'แยกกันอยู่' };
const MILITARY = { completed:'ผ่านการเกณฑ์แล้ว', exempt:'ได้รับการยกเว้น', reserve:'เรียน รด. ครบ', pending:'ยังไม่ผ่านการเกณฑ์' };
const EMPTYPE = { permanent:'ประจำ', probation:'ทดลองงาน', daily:'รายวัน', temporary:'ชั่วคราว' };
const GENDER = { male:'ชาย', female:'หญิง' };
const RELATIONS = ['บิดา/มารดา','คู่สมรส','พี่น้อง','บุตร','ญาติ','อื่น ๆ'];
const BANKS = ['กรุงเทพ','กสิกรไทย','กรุงไทย','ไทยพาณิชย์','กรุงศรีอยุธยา','ทหารไทยธนชาต (ttb)','ออมสิน','ธ.ก.ส.','อาคารสงเคราะห์','ซีไอเอ็มบี ไทย','ยูโอบี','เกียรตินาคินภัทร','แลนด์ แอนด์ เฮ้าส์','อิสลามแห่งประเทศไทย','อื่น ๆ'];
const TH_MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const TH_MONTHS_S = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const TH_DAYS = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];
const STEPS = ['ส่วนตัว','บัตร','ที่อยู่','ติดต่อ','งาน'];
const svg = (d, extra='') => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" ${extra}>${d}</svg>`;
const IC = {
  home: svg('<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'),
  people: svg('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M16 14.6c2.7-.2 4.8 1.5 5.5 4.4"/>'),
  key: svg('<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>'),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>'),
  me: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.2 4.2-6.5 8-6.5s7 2.3 8 6.5"/>'),
  back: svg('<path d="M15 6l-6 6 6 6"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'),
  chev: svg('<path d="M9 6l6 6-6 6"/>'),
  check: svg('<path d="M5 12l5 5 9-10"/>'),
  eye: svg('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  lock: svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
  clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  camera: svg('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'),
  phone: svg('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>'),
  site: svg('<path d="M3 21h18M5 21V10l7-5 7 5v11M10 21v-5h4v5"/>'),
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 8h.01"/>'),
  userplus: svg('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5"/><path d="M17 13v6M14 16h6"/>'),
  sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  cal: svg('<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4M16 3v4M4 10h16M9 15l2 2 4-4"/>'),
  history: svg('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>')
};
const STAR_PATH = '<path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z"/>';

/* ---------- state ---------- */
const S = { session:null, profile:null, positions:[], sites:[], employees:[], photoUrl:{} };
let sb, ADDR=null;

/* ---------- utils ---------- */
const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = n => Number(n||0).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2});
const localISO = (d=new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const parseISO = iso => { if(!iso) return null; const [y,m,d]=String(iso).slice(0,10).split('-').map(Number); return {y,m,d}; };
function thaiDate(iso, short=true){ const p=parseISO(iso); if(!p) return '-'; return `${p.d} ${(short?TH_MONTHS_S:TH_MONTHS)[p.m-1]} ${p.y+543}`; }
function todayLong(){ const d=new Date(); return `วัน${TH_DAYS[d.getDay()]}ที่ ${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${d.getFullYear()+543}`; }
function diffYM(iso, ref=new Date()){ const p=parseISO(iso); if(!p) return null; let y=ref.getFullYear()-p.y, m=(ref.getMonth()+1)-p.m; if(ref.getDate()<p.d) m--; if(m<0){y--;m+=12;} return {y,m}; }
const ageText = iso => { const a=diffYM(iso); return a ? `${a.y} ปี${a.m?` ${a.m} เดือน`:''}` : '-'; };
const serviceText = iso => { const a=diffYM(iso); if(!a) return '-'; if(a.y<0) return 'ยังไม่เริ่มงาน'; return a.y?`${a.y} ปี ${a.m} เดือน`:`${a.m} เดือน`; };
function daysUntil(iso){ const p=parseISO(iso); if(!p) return null; const t=new Date(); t.setHours(0,0,0,0); return Math.round((new Date(p.y,p.m-1,p.d)-t)/86400000); }
function untilText(iso){ const p=parseISO(iso); if(!p) return ''; const a=diffYM(localISO(), new Date(p.y,p.m-1,p.d)); if(!a||a.y<0) return ''; return a.y?`${a.y} ปี ${a.m} เดือน`:(a.m?`${a.m} เดือน`:`${daysUntil(iso)} วัน`); }
function validThaiId(id){ if(!/^\d{13}$/.test(id)) return false; let s=0; for(let i=0;i<12;i++) s+=Number(id[i])*(13-i); return (11-s%11)%10===Number(id[12]); }
const digits = v => String(v||'').replace(/\D/g,'');
function fmtId(v){ const d=digits(v).slice(0,13); const parts=[d.slice(0,1),d.slice(1,5),d.slice(5,10),d.slice(10,12),d.slice(12,13)]; return parts.filter(Boolean).join('-'); }
function fmtPhone(v){ const d=digits(v).slice(0,10); if(d.length<=3) return d; if(d.startsWith('02')&&d.length<=9) return d.length>5?`${d.slice(0,2)}-${d.slice(2,5)}-${d.slice(5)}`:`${d.slice(0,2)}-${d.slice(2)}`; return d.length>6?`${d.slice(0,3)}-${d.slice(3,6)}-${d.slice(6)}`:`${d.slice(0,3)}-${d.slice(3)}`; }
const fullName = e => `${e.title==='อื่น ๆ'?'':(e.title||'')}${e.first_name||''} ${e.last_name||''}`.trim();
const shortName = e => `${e.first_name||''} ${e.last_name||''}`.trim();
const initial = e => (e.nickname||e.first_name||'?').trim().charAt(0);
const posName = id => S.positions.find(p=>p.id===id)?.name || '-';
function starBadge(v){ v=Number(v); return `<span class="star ${v<=3?'low':''}"><svg viewBox="0 0 24 24" aria-hidden="true">${STAR_PATH}</svg>${v.toFixed(1)}</span>`; }
function stars5(v){ v=Number(v); let h=`<span class="stars5" role="img" aria-label="${v} จาก 5 ดาว">`; for(let i=1;i<=5;i++){ const f=v>=i?100:(v>=i-0.5?50:0); const id='s'+Math.random().toString(36).slice(2,8); h+=`<svg viewBox="0 0 24 24"><defs><linearGradient id="${id}"><stop offset="${f}%" stop-color="#F2B705"/><stop offset="${f}%" stop-color="rgba(255,255,255,.28)"/></linearGradient></defs><path fill="url(#${id})" d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z"/></svg>`; } return h+'</span>'; }
function addrText(e, pre='addr'){
  const g=k=>e[`${pre}_${k}`]; const bkk=(g('province')||'').includes('กรุงเทพ');
  return [g('no'), g('moo')&&`หมู่ ${g('moo')}`, g('soi')&&`ซ.${g('soi')}`, g('road')&&`ถ.${g('road')}`,
    g('subdistrict')&&`${bkk?'แขวง':'ต.'}${g('subdistrict')}`, g('district')&&`${bkk?'เขต':'อ.'}${g('district')}`,
    g('province')&&(bkk?g('province'):`จ.${g('province')}`), g('zip')].filter(Boolean).join(' ') || '-';
}
function toast(msg, bad=false){ const t=document.createElement('div'); t.className='toast'+(bad?' bad':''); t.setAttribute('role','status'); t.textContent=msg; document.body.appendChild(t); setTimeout(()=>t.remove(), bad?5200:2600); }
const errText = e => {
  const m=(e&&(e.message||e.error_description))||String(e);
  const map={'Invalid login credentials':'อีเมลหรือรหัสผ่านไม่ถูกต้อง','User already registered':'อีเมลนี้สมัครไว้แล้ว ลองเข้าสู่ระบบ หรือกดลืมรหัสผ่าน','Email not confirmed':'ยังไม่ได้ยืนยันอีเมล กรุณาเปิดลิงก์ยืนยันในอีเมลก่อน','Password should be at least 6 characters.':'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'};
  if(map[m]) return map[m];
  if(/duplicate key.*national_id/.test(m)) return 'เลขบัตรประชาชนนี้มีในระบบแล้ว';
  if(/blood_needs_consent/.test(m)) return 'บันทึกหมู่เลือดได้เมื่อพนักงานยินยอมแล้วเท่านั้น';
  if(/Failed to fetch|NetworkError|Load failed/i.test(m)) return 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจสอบอินเทอร์เน็ต';
  if(/relation .*(attendance|site_reports|star_events|app_settings).* does not exist|Could not find the table/.test(m)) return 'ฐานข้อมูลยังไม่ได้อัปเดตช่วงที่ 2 กรุณารันไฟล์ 03_attendance.sql ใน Supabase';
  if(/row-level security/.test(m)) return 'ไม่มีสิทธิ์ทำรายการนี้ (โฟร์แมนแก้รายงานได้เฉพาะของวันนี้)';
  if(/column .* does not exist/.test(m)) return 'ฐานข้อมูลยังไม่ได้อัปเดต กรุณารันไฟล์ 02_profile_update.sql ใน Supabase';
  return m;
};
function busy(btn,on,label){ if(!btn) return; if(on){ btn.dataset.l=btn.innerHTML; btn.disabled=true; btn.textContent=label||'กำลังบันทึก...'; } else { btn.disabled=false; if(btn.dataset.l) btn.innerHTML=btn.dataset.l; } }

/* ---------- photos ---------- */
function avatar(e, cls='', style=''){ return `<div class="av ${cls}" ${style?`style="${style}"`:''}>${e.photo_path?`<img data-ph="${esc(e.photo_path)}" alt="">`:''}<span>${esc(initial(e))}</span></div>`; }
async function hydratePhotos(root=document){
  const imgs=$$('img[data-ph]',root); if(!imgs.length) return;
  const need=[...new Set(imgs.map(i=>i.dataset.ph).filter(p=>!S.photoUrl[p]))];
  if(need.length){
    const {data}=await sb.storage.from(PHOTO_BUCKET).createSignedUrls(need, 3600);
    (data||[]).forEach(r=>{ if(r.signedUrl) S.photoUrl[r.path]=r.signedUrl; });
  }
  imgs.forEach(i=>{ const u=S.photoUrl[i.dataset.ph]; if(u){ i.onload=()=>i.parentElement.classList.add('has-img'); i.src=u; } });
}
async function resizeImage(file, max=720){
  const url=URL.createObjectURL(file);
  const img=await new Promise((res,rej)=>{ const im=new Image(); im.onload=()=>res(im); im.onerror=rej; im.src=url; });
  const r=Math.min(1, max/Math.max(img.width,img.height));
  const c=document.createElement('canvas'); c.width=Math.round(img.width*r); c.height=Math.round(img.height*r);
  c.getContext('2d').drawImage(img,0,0,c.width,c.height); URL.revokeObjectURL(url);
  return await new Promise(res=>c.toBlob(res,'image/jpeg',0.85));
}

/* ---------- date field: วัน / เดือน / ปี พ.ศ. ---------- */
function dateParts(F, key){ if(F._dp?.[key]) return F._dp[key]; const p=parseISO(F[key]); return p?{d:p.d,m:p.m,y:p.y+543}:{d:'',m:'',y:''}; }
function dateField(F, key, label, hint=''){
  const p=dateParts(F,key);
  let days='<option value="">วัน</option>'; for(let i=1;i<=31;i++) days+=`<option ${+p.d===i?'selected':''}>${i}</option>`;
  let mons='<option value="">เดือน</option>'; TH_MONTHS.forEach((m,i)=>mons+=`<option value="${i+1}" ${+p.m===i+1?'selected':''}>${m}</option>`);
  return `<div class="field"><label>${label}</label><div class="g3" data-date="${key}">
    <select class="in" data-p="d" aria-label="${label} วัน">${days}</select>
    <select class="in" data-p="m" aria-label="${label} เดือน">${mons}</select>
    <input class="in num" type="number" inputmode="numeric" data-p="y" placeholder="พ.ศ." value="${esc(p.y)}" aria-label="${label} ปี พ.ศ."></div>
    <span class="hint" data-hint="${key}">${hint}</span></div>`;
}
function readParts(p){
  const d=+p.d, m=+p.m, yb=+p.y;
  if(!d && !m && !yb) return {ok:true,value:null};
  if(!d||!m||!yb) return {ok:false,msg:'กรอกวัน เดือน และปี พ.ศ. ให้ครบ'};
  const y=yb-543, dt=new Date(y,m-1,d);
  if(dt.getMonth()!==m-1 || y<1900 || y>2200) return {ok:false,msg:'วันที่ไม่ถูกต้อง (ตรวจปี พ.ศ.)'};
  return {ok:true,value:`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`};
}

/* ---------- overlay helpers ---------- */
function overlay(html, center=true, dismiss=true){
  const bg=document.createElement('div'); bg.className='sheet-bg'+(center?' center':''); bg.innerHTML=html; document.body.appendChild(bg);
  document.body.style.overflow='hidden';
  const close=()=>{ bg.remove(); if(!$('.sheet-bg')) document.body.style.overflow=''; document.removeEventListener('keydown',k); };
  const k=e=>{ if(e.key==='Escape'&&dismiss&&bg===[...document.querySelectorAll('.sheet-bg')].pop()) close(); }; document.addEventListener('keydown',k);
  if(dismiss) bg.addEventListener('click',e=>{ if(e.target===bg) close(); });
  return {el:bg, close};
}
function confirmBox(msg, ok='ยืนยัน', danger=false){
  return new Promise(res=>{
    const m=overlay(`<div class="modal" role="dialog" aria-modal="true"><h3 class="h2" style="font-size:18px">ยืนยัน</h3><p style="margin:0">${esc(msg)}</p>
      <div class="row"><button class="btn grow" data-x>ยกเลิก</button><button class="btn grow ${danger?'btn-bad':'btn-p'}" data-ok>${esc(ok)}</button></div></div>`);
    $('[data-x]',m.el).onclick=()=>{m.close();res(false);}; $('[data-ok]',m.el).onclick=()=>{m.close();res(true);};
  });
}
function promptBox(title, value='', ok='บันทึก'){
  return new Promise(res=>{
    const m=overlay(`<div class="modal" role="dialog" aria-modal="true"><h3 class="h2" style="font-size:18px">${esc(title)}</h3><input class="in" value="${esc(value)}">
      <div class="row"><button class="btn grow" data-x>ยกเลิก</button><button class="btn grow btn-p" data-ok>${esc(ok)}</button></div></div>`);
    const i=$('input',m.el); setTimeout(()=>i.focus(),50);
    $('[data-x]',m.el).onclick=()=>{m.close();res(null);}; $('[data-ok]',m.el).onclick=()=>{m.close();res(i.value.trim());};
  });
}

/* =====================================================================
   เริ่มระบบ
   ===================================================================== */
function applyTheme(v){
  try{ if(v==='light'||v==='dark'){ localStorage.setItem('kty-theme',v); document.documentElement.dataset.theme=v; } else { localStorage.removeItem('kty-theme'); delete document.documentElement.dataset.theme; } }catch(e){}
  const dark = document.documentElement.dataset.theme==='dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
  $('meta[name=theme-color]').content = dark ? '#1A2227' : '#22313A';
}
const curTheme = () => { try{ return localStorage.getItem('kty-theme')||'auto'; }catch(e){ return 'auto'; } };
function watchOnline(){ const u=()=>$('#offline').classList.toggle('hidden',navigator.onLine); addEventListener('online',u); addEventListener('offline',u); u(); }

async function boot(){
  applyTheme(curTheme()); watchOnline();
  if(SUPABASE_URL.includes('YOUR-PROJECT')){
    $('#app').innerHTML=`<div class="auth"><div class="auth-top"><div class="brand"><div class="mark"><span>KTY</span></div><b style="font-size:20px">KTY1994</b></div></div>
      <div class="card auth-card"><h3 class="h2">ยังไม่ได้ตั้งค่าการเชื่อมต่อ</h3><p class="muted" style="margin:0">เปิดไฟล์ index.html แล้วใส่ SUPABASE_URL และ SUPABASE_ANON_KEY ตามคู่มือติดตั้ง</p></div></div>`;
    return;
  }
  sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  sb.auth.onAuthStateChange((ev, session)=>{
    if(ev==='PASSWORD_RECOVERY'){ S.session=session; renderNewPassword(); }
    if(ev==='SIGNED_OUT'){ S.session=null; S.profile=null; renderAuth(); }
  });
  const {data}=await sb.auth.getSession(); S.session=data.session;
  if(location.hash.includes('type=recovery')) return;
  if(S.session) await enter(); else renderAuth();
}
async function enter(){
  if(/access_token|type=/.test(location.hash)) history.replaceState(null,'',location.pathname);
  const {data,error}=await sb.from('profiles').select('*').eq('id',S.session.user.id).single();
  if(error){ toast(errText(error),true); renderAuth(); return; }
  S.profile=data;
  if(data.role==='pending'||!data.is_active){ renderPending(); return; }
  await loadRefs(); await loadUserCtx();
  window.onhashchange=route; route();
}
async function loadRefs(){
  const [p,s,st]=await Promise.all([ sb.from('positions').select('*').order('sort_order').order('name'), sb.from('sites').select('*').order('status').order('name'), sb.from('app_settings').select('*') ]);
  S.positions=p.data||[]; S.sites=s.data||[];
  S.settings={ star_rules:{absent:1,late_count:3,late_penalty:0.5,no_notice:0.5}, site_trades:['ช่างปูน','ช่างไฟ','ช่างเหล็ก','ช่างไม้','ช่างประปา','ช่างสี','คนงานทั่วไป'] };
  (st.data||[]).forEach(r=>{ S.settings[r.key]=r.value; });
  S.hasPhase2 = !st.error;
}
const isAdmin=()=>S.profile?.role==='admin';
const isManager=()=>['admin','executive'].includes(S.profile?.role);

/* =====================================================================
   เข้าสู่ระบบ / สมัคร / รอนุมัติ / ตั้งรหัสผ่าน
   ===================================================================== */
function authTop(title, sub, lead=''){ return `<div class="auth-top"><div><div class="brand"><div class="mark" style="width:58px;height:58px;font-size:17px"><span>KTY</span></div><div><div style="font-size:24px;font-weight:700;line-height:1.2">${title}</div><div style="color:var(--barInk2);font-size:14px">${sub}</div></div></div>${lead?`<p>${lead}</p>`:''}</div></div>`; }
function pwField(id, auto){ return `<div class="inwrap"><input class="in" id="${id}" type="password" autocomplete="${auto}" minlength="6"><button type="button" class="eye" aria-label="แสดงรหัสผ่าน" data-eye="${id}">${IC.eye}</button></div>`; }
function bindEyes(root){ $$('[data-eye]',root).forEach(b=>b.onclick=()=>{ const i=$('#'+b.dataset.eye); i.type=i.type==='password'?'text':'password'; }); }

function renderAuth(mode='login'){
  const login=mode==='login';
  $('#app').innerHTML=`<div class="auth">${authTop('KTY1994','ระบบเช็คชื่อพนักงาน', login?'ยินดีต้อนรับกลับ<br>เข้าสู่ระบบเพื่อเริ่มงานวันนี้':'สมัครใช้งานสำหรับพนักงาน<br>หจก.กิตติยาก่อสร้าง 1994')}
    <form class="card auth-card" id="af" novalidate>
      <div class="seg" role="tablist"><button type="button" class="${login?'on':''}" data-m="login">เข้าสู่ระบบ</button><button type="button" class="${login?'':'on'}" data-m="signup">สมัครใช้งาน</button></div>
      ${login?'':`<div class="field"><label for="dn">ชื่อ-นามสกุล</label><input class="in" id="dn" autocomplete="name"></div>
      <div class="field"><label for="ph">เบอร์มือถือ</label><input class="in num" id="ph" type="tel" inputmode="tel" autocomplete="tel" placeholder="08x-xxx-xxxx"></div>`}
      <div class="field"><label for="em">อีเมล</label><input class="in" id="em" type="email" autocomplete="email" inputmode="email"></div>
      <div class="field"><label for="pw">${login?'รหัสผ่าน':'ตั้งรหัสผ่าน'}</label>${pwField('pw', login?'current-password':'new-password')}${login?'':'<span class="hint" id="pwh">อย่างน้อย 6 ตัวอักษร</span>'}</div>
      ${login?'':`<div class="note n-info">${IC.lock}<span>หลังสมัคร แอดมินจะตรวจสอบและกำหนดสิทธิ์ให้ก่อนใช้งาน ข้อมูลใช้เพื่อการบริหารงานบุคคลของบริษัทเท่านั้น</span></div>`}
      <button class="btn btn-p btn-block" id="ab" style="min-height:54px;font-size:16px">${login?'เข้าสู่ระบบ':'สมัครใช้งาน'}</button>
      ${login?'<button type="button" class="linkbtn" id="forgot" style="align-self:center">ลืมรหัสผ่าน</button>':''}
    </form>
    <div class="auth-foot xs muted">${COMPANY}<br>ใช้งานได้เฉพาะเมื่อเชื่อมต่ออินเทอร์เน็ต</div></div>`;
  $$('[data-m]').forEach(b=>b.onclick=()=>renderAuth(b.dataset.m));
  bindEyes($('#app'));
  const ph=$('#ph'); if(ph) ph.addEventListener('input',()=>{ ph.value=fmtPhone(ph.value); });
  const pwh=$('#pwh'); if(pwh) $('#pw').addEventListener('input',e=>{ const v=e.target.value; const sc=(v.length>=6)+(v.length>=10)+(/\d/.test(v)&&/[a-zA-Zก-๙]/.test(v)); pwh.className='hint '+(sc>=2?'ok':''); pwh.textContent=v.length<6?'อย่างน้อย 6 ตัวอักษร':['ใช้ได้','ค่อนข้างแข็งแรง','แข็งแรง'][sc-1]||'ใช้ได้'; });
  $('#af').onsubmit=async ev=>{
    ev.preventDefault();
    const email=$('#em').value.trim(), password=$('#pw').value, btn=$('#ab');
    if(!email||!password) return toast('กรอกอีเมลและรหัสผ่าน',true);
    busy(btn,true,'กำลังดำเนินการ...');
    try{
      if(login){ const {data,error}=await sb.auth.signInWithPassword({email,password}); if(error) throw error; S.session=data.session; await enter(); }
      else{
        const display_name=$('#dn').value.trim(); if(!display_name){ busy(btn,false); return toast('กรอกชื่อ-นามสกุล',true); }
        const {data,error}=await sb.auth.signUp({email,password,options:{data:{display_name,phone:$('#ph').value.trim()}}}); if(error) throw error;
        if(data.session){ S.session=data.session; await enter(); } else { renderAuth('login'); toast('สมัครแล้ว กรุณายืนยันอีเมลจากกล่องจดหมาย แล้วเข้าสู่ระบบ'); }
      }
    }catch(e){ toast(errText(e),true); busy(btn,false); }
  };
  const f=$('#forgot'); if(f) f.onclick=async()=>{
    const email=$('#em').value.trim(); if(!email) return toast('กรอกอีเมลก่อน แล้วกดลืมรหัสผ่าน',true);
    const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
    if(error) return toast(errText(error),true); toast('ส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่อีเมลแล้ว');
  };
}
function renderNewPassword(){
  $('#app').innerHTML=`<div class="auth">${authTop('ตั้งรหัสผ่านใหม่','KTY1994')}<div class="card auth-card">
    <div class="field"><label for="np">รหัสผ่านใหม่</label>${pwField('np','new-password')}</div><button class="btn btn-p btn-block" id="nb">บันทึกรหัสผ่าน</button></div></div>`;
  bindEyes($('#app'));
  $('#nb').onclick=async()=>{ const password=$('#np').value; if(password.length<6) return toast('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร',true);
    const {error}=await sb.auth.updateUser({password}); if(error) return toast(errText(error),true);
    history.replaceState(null,'',location.pathname); toast('บันทึกรหัสผ่านแล้ว'); await enter(); };
}
function renderPending(){
  const p=S.profile, blocked=!p.is_active;
  $('#app').innerHTML=`<div class="auth"><div style="padding:48px 24px 24px;display:flex;flex-direction:column;gap:22px;max-width:460px;margin:0 auto;width:100%;flex:1">
    <div class="brand"><div class="mark"><span>KTY</span></div><div><b>KTY1994</b><div class="sm muted">ระบบเช็คชื่อพนักงาน</div></div></div>
    <div style="width:96px;height:96px;border-radius:28px;background:${blocked?'var(--badBg)':'var(--warnBg)'};color:${blocked?'var(--bad)':'var(--warn)'};display:grid;place-items:center;margin-top:12px">${blocked?svg('<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>','style="width:46px;height:46px"'):svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>','style="width:46px;height:46px"')}</div>
    <div><h2 style="margin:0;font-size:26px;line-height:1.3">${blocked?'บัญชีนี้ถูกระงับ':'รอแอดมินอนุมัติ'}</h2><p class="muted" style="margin:8px 0 0">${blocked?'ติดต่อแอดมินของบริษัทเพื่อเปิดใช้งานอีกครั้ง':'สมัครเรียบร้อยแล้ว เมื่อแอดมินกำหนดสิทธิ์ให้ คุณจะเข้าใช้งานได้ทันที'}</p></div>
    ${blocked?'':`<div class="card timeline" style="padding:18px 18px 2px">
      <div class="row"><span class="dot done">${svg('<path d="M5 12l5 5 9-10"/>','style="width:14px;height:14px;stroke-width:3"')}</span><div><b>สมัครใช้งาน</b><div class="sm muted">${thaiDate(localISO(new Date(p.created_at)))}</div></div></div>
      <div class="row"><span class="dot now"></span><div><b>แอดมินตรวจสอบและกำหนดสิทธิ์</b><div class="sm muted">กำลังรอ</div></div></div>
      <div class="row" style="opacity:.6"><span class="dot"></span><div><b>เริ่มใช้งาน</b><div class="sm muted">ตามสิทธิ์ที่ได้รับ</div></div></div></div>`}
    <div class="note n-info"><span>บัญชี <b style="color:var(--ink)">${esc(p.display_name)}</b><br>${esc(p.email)}</span></div>
    <div style="margin-top:auto;display:flex;flex-direction:column;gap:10px"><button class="btn btn-p" id="rf">ตรวจสอบอีกครั้ง</button><button class="btn" id="lo">ออกจากระบบ</button></div>
  </div></div>`;
  $('#rf').onclick=enter; $('#lo').onclick=()=>sb.auth.signOut();
}

