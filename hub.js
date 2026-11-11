/* =====================================================================
   KTY Hub — โครงหน้า: แถบเมนูด้านข้าง / ลิ้นชักเมนูบนมือถือ / ตัวเลือกไซต์
   ===================================================================== */
const HUB_VERSION = '2.6';
const MOD = {
  att:      { t:'เช็คชื่อ',            hue:'#2E9E5B', i:'<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4M16 3v4M4 10h16M9 15l2 2 4-4"/>' },
  daily:    { t:'รายงานประจำวัน',      hue:'#2F6FDB', i:'<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>' },
  materials:{ t:'เบิก วัสดุ/อุปกรณ์',        hue:'#E07A1F', i:'<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>' },
  borrow:   { t:'คืน วัสดุ/อุปกรณ์',       hue:'#7A5AF8', i:'<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>' },
  issues:   { t:'ปัญหาหน้างาน',         hue:'#D64545', i:'<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>' },
  people:   { t:'พนักงาน',             hue:'#7A5AF8', i:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M16 14.6c2.7-.2 4.8 1.5 5.5 4.4"/>' },
  payroll:  { t:'เงินเดือน',            hue:'#14918C', i:'<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/>' },
  sites:    { t:'ไซต์งาน',             hue:'#5B6B73', i:'<path d="M3 21h18M5 21V10l7-5 7 5v11M10 21v-5h4v5"/>' },
  studio:   { t:'ตั้งค่าระบบ',          hue:'#C9A227', i:'<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>' },
  manage:   { t:'จัดการระบบ',          hue:'#5B6B73', i:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>' },
  home:     { t:'หน้าหลัก',            hue:'#5B6B73', i:'<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>' },
  tasks:    { t:'งานที่รอ',             hue:'#5B6B73', i:'<path d="M9 6h11M9 12h11M9 18h11"/><path d="M3.5 6l1 1 2-2M3.5 12l1 1 2-2M3.5 18l1 1 2-2"/>' },
  stars:    { t:'ดาวและประวัติ',         hue:'#C99400', i:'<path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z"/>' },
  me:       { t:'ข้อมูลของฉัน',          hue:'#5B6B73', i:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.2 4.2-6.5 8-6.5s7 2.3 8 6.5"/>' }
};
const SOON = { issues:'โฟร์แมนแจ้งปัญหาหน้างานพร้อมรูป ผู้บริหารได้รับแจ้งเตือนทันที' };
const modIcon = (k, size=34) => `<span class="micon" style="--h:${MOD[k].hue};width:${size}px;height:${size}px;border-radius:${Math.round(size*.3)}px">${svg(MOD[k].i,`style="width:${Math.round(size*.56)}px;height:${Math.round(size*.56)}px"`)}</span>`;

S.badges = S.badges || {};
S.site = (()=>{ try{ return localStorage.getItem('kty-site')||''; }catch(e){ return ''; } })();
const mySiteIds = () => isManager() ? S.sites.filter(s=>s.status==='active').map(s=>s.id) : (S.mySites||[]);
const siteLabel = () => S.site ? (S.sites.find(s=>String(s.id)===S.site)?.name || 'ไซต์ที่เลือก') : (isManager() ? 'ทุกไซต์' : 'ไซต์ของฉันทั้งหมด');
const hasMod = (m, roles) => isManager() || (S.modules||[]).some(r=>r.module===m && (!roles || roles.includes(r.role)));

/* โหลดข้อมูลเฉพาะผู้ใช้หลังเข้าสู่ระบบ */
async function loadUserCtx(){
  const [a,m]=await Promise.all([ sb.from('site_assignments').select('site_id').eq('user_id',S.profile.id), sb.from('module_roles').select('*').eq('user_id',S.profile.id) ]);
  S.mySites=(a.data||[]).map(x=>x.site_id); S.modules=m.error?[]:(m.data||[]); S.hasHub=!m.error;
  if(S.site && !isManager() && !S.mySites.includes(+S.site)) S.site='';
}

/* เมนูทั้งหมดตามสิทธิ์ (ใช้ทั้งแถบด้านข้าง/ลิ้นชัก) */
const ACCESS_MODS=['att','daily','materials','borrow','issues','people','payroll','sites'];
const allowed = m => isAdmin() || !ACCESS_MODS.includes(m) || (S.settings.menu_access?.[m]?.[S.profile.role]!=='hide');
const ROUTE_MOD={att:'att',roll:'att',report:'daily',ret:'materials',daily:'daily',mat:'materials',brw:'borrow',employees:'people',emp:'people',pay:'payroll'};
function navSections(){ return navSections0().map(s=>({...s,items:s.items.filter(x=>allowed(x.m))})).filter(s=>s.items.length); }
function navSections0(){
  const p=S.profile, mgr=isManager(), out=[];
  if(mgr){
    out.push({t:'ภาพรวม', items:[{k:'home',m:'home'},{k:'tasks',m:'tasks',b:'tasks'}]});
    out.push({t:'ระบบงาน', items:[
      {k:'att',m:'att',b:'att'}, {k:'roll',m:'att',t:'เช็คชื่อแบบติ๊ก',sub:1}, {k:'att/month',m:'att',t:'ตารางรายเดือน',sub:1}, {k:'att/site',m:'att',t:'คนงานหน้างาน',sub:1,b:'crew'},
      {k:'daily',m:'daily',b:'daily'}, {k:'mat',m:'materials',b:'mat'}, {k:'ret',m:'borrow',b:'brw'}, {k:'soon/issues',m:'issues'},
      {k:'employees',m:'people'}, {k:'pay',m:'payroll'} ]});
    out.push({t:'ตั้งค่า', items:[{k:'manage/sites',m:'sites'},{k:'manage',m:'manage',b:'users'},...(isAdmin()?[{k:'studio',m:'studio'}]:[])]});
  } else {
    const it=[{k:'home',m:'home'}];
    if(p.can_check) it.push({k:'roll',m:'att',t:'เช็คชื่อหน้าไซต์งาน'});
    if(p.role==='foreman'||hasMod('daily')) it.push({k:'daily',m:'daily',t:'รายงานประจำวัน',b:'daily'});
    if(hasMod('materials')) it.push({k:'mat',m:'materials',t:'เบิก วัสดุ/อุปกรณ์',b:'mat'});
    if(hasMod('borrow')||hasMod('materials')) it.push({k:'ret',m:'borrow',t:'คืน วัสดุ/อุปกรณ์',b:'brw'});
    if(hasMod('issues')) it.push({k:'soon/issues',m:'issues',t:'รายงานปัญหาหน้างาน'});
    out.push({t:'งานของฉัน', items:it});
    out.push({t:'ของฉัน', items:[{k:'my',m:'payroll',t:'ข้อมูลของฉัน'},{k:'me/stars',m:'stars'},{k:'me',m:'me'}]});
  }
  return out;
}
function bottomItems(){ return bottomItems0().filter(x=>allowed(x.m)); }
function bottomItems0(){
  const p=S.profile;
  if(isManager()) return [{k:'home',m:'home',t:'หน้าหลัก'},{k:'att',m:'att',t:'เช็คชื่อ'},{k:'tasks',m:'tasks',t:'งานที่รอ',b:'tasks'},{k:'employees',m:'people',t:'พนักงาน'},{k:'me',m:'me',t:'ฉัน'}];
  const it=[{k:'home',m:'home',t:'หน้าหลัก'}];
  if(p.can_check) it.push({k:'roll',m:'att',t:'เช็คชื่อ'});
  if(p.role==='foreman'||hasMod('daily')) it.push({k:'daily',m:'daily',t:'รายงาน',b:'daily'});
  it.push({k:'me',m:'me',t:'ฉัน'});
  return it;
}
const keyOf = h => (h||'home').replace('#','') || 'home';
function isActive(k, cur){ if(k===cur) return true; const [a]=k.split('/'), [b]=cur.split('/'); return !k.includes('/') && a===b && !['soon','manage','att','me'].includes(a) ? true : (k==='att'&&cur==='att'); }

function navItemHTML(x, cur){
  const meta=MOD[x.m]||MOD.home, t=T(x.t||meta.t), on=x.k===cur||(!x.sub&&!x.k.includes('/')&&cur.startsWith(x.k+'/')&&x.k!=='att'&&cur!=='manage/sites');
  const b=x.b?`<span class="nbadge hidden" data-badge="${x.b}"></span>`:'';
  return `<a href="#${x.k}" class="nitem ${x.sub?'sub':''} ${on?'on':''}">${x.sub?'<span class="nsp"></span>':modIcon(x.m)}<span class="grow">${t}</span>${b}</a>`;
}
function sitePickerHTML(){ return `<button class="sitepick" data-sitepick><span class="micon" style="--h:#F2B705;background:var(--bar);color:#F2B705;width:34px;height:34px;border-radius:10px">${svg(MOD.sites.i,'style="width:18px;height:18px"')}</span><span class="grow" style="text-align:left"><span class="xs muted" style="display:block">แสดงข้อมูลของ</span><b style="font-size:14.5px">${esc(siteLabel())}</b></span>${svg('<path d="M6 9l6 6 6-6"/>','style="width:18px;color:var(--ink2)"')}</button>`; }
function themeSegHTML(){ const th=curTheme(); return `<div class="seg" style="padding:3px">${[['auto','ตามเครื่อง'],['light','สว่าง'],['dark','มืด']].map(([k,t])=>`<button class="${th===k?'on':''}" data-th="${k}" style="min-height:34px">${t}</button>`).join('')}</div>`; }
function navBodyHTML(cur){
  return `${sitePickerHTML()}${navSections().map(s=>`<div class="nsec">${s.t}</div>${s.items.map(x=>navItemHTML(x,cur)).join('')}`).join('')}
    <div class="nfoot">${themeSegHTML()}<button class="linkbtn" data-logout style="color:var(--bad);text-decoration:none;font-weight:600;padding:8px 10px;text-align:left">ออกจากระบบ</button><span class="xs muted" style="padding:0 10px">${esc(BR().app)} เวอร์ชัน ${HUB_VERSION}</span></div>`;
}
function bindNav(root){
  $$('[data-sitepick]',root).forEach(b=>b.onclick=pickSite);
  $$('[data-th]',root).forEach(b=>b.onclick=()=>{ applyTheme(b.dataset.th); $$('[data-th]').forEach(x=>x.classList.toggle('on',x.dataset.th===b.dataset.th)); });
  $$('[data-logout]',root).forEach(b=>b.onclick=logout);
  paintBadges();
}
function paintBadges(){ $$('[data-badge]').forEach(el=>{ const v=S.badges[el.dataset.badge]; el.textContent=v||''; el.classList.toggle('hidden',!v); }); }

function route(){
  $$('.sheet-bg').forEach(x=>x.remove()); document.body.style.overflow='';
  const cur=keyOf(location.hash); const [k,id,id2]=cur.split('/');
  if(k==='users'){ mgTab='users'; } if(k==='settings'){ mgTab='sites'; }
  const mgr=isManager(), p=S.profile;
  const can={ home:1, tasks:1, me:1, soon:1, att:mgr, employees:mgr, emp:mgr, manage:mgr, users:mgr, settings:mgr, roll:mgr||p.can_check, report:p.role==='foreman'||mgr||hasMod('daily'), mat:mgr||hasMod('materials'), pay:1, id:1, my:1, reqs:mgr, brw:mgr||hasMod('borrow')||hasMod('materials'), ret:mgr||hasMod('borrow')||hasMod('materials'), daily:p.role==='foreman'||mgr||hasMod('daily'), studio:isAdmin() };
  if(ROUTE_MOD[k]&&!allowed(ROUTE_MOD[k])) can[k]=0;
  const key=can[k]?k:'home';
  if(key==='att'&&id&&['day','month','site'].includes(id)) attTab=id;
  if(key==='manage'&&id) mgTab=id;
  if(key==='me'&&id==='stars') profTab='stars';
  renderShell(can[k]?cur:'home');
  ({home:pageHome, tasks:pageTasks, att:pageAtt, employees:pageEmployees, emp:()=>pageProfile(id), manage:pageManage, users:pageManage, settings:pageManage, report:pageReport, mat:()=>pageMat(id,id2), pay:()=>pagePay(id,id2), id:()=>pageQR(id), my:()=>pageMy(id||null), reqs:pageReqs, brw:()=>pageBrw(id,id2), ret:pageRet, daily:()=>pageDaily(id,id2), roll:pageRoll, studio:()=>pageStudio(id), me:()=>id==='stars'?pageMyStars():pageMe(), soon:()=>pageSoon(id)})[key]();
  scrollTo(0,0);
}
function renderShell(cur){
  const bi=bottomItems();
  $('#app').innerHTML=`<div class="app">
    <aside class="side"><div class="brand" style="margin:0 6px 14px">${markHTML()}<div><b>${esc(BR().app)}</b><div class="xs muted">${esc(BR().company_short)}</div></div></div>${navBodyHTML(cur)}</aside>
    <div class="appwrap"><div id="page"><div class="loading"><div><div class="spin"></div>กำลังโหลด</div></div></div></div>
    <nav class="bnav" aria-label="เมนูหลัก">${bi.map(x=>`<a href="#${x.k}" class="${(x.k===cur||(x.k!=='home'&&cur.startsWith(x.k)))?'on':''}"><span class="pill" style="position:relative">${svg(MOD[x.m].i)}${x.b?`<span class="ndot hidden" data-badge="${x.b}"></span>`:''}</span>${x.t}</a>`).join('')}</nav></div>`;
  bindNav($('.side'));
}
function openDrawer(){
  const cur=keyOf(location.hash);
  const m=overlay(`<aside class="drawer" role="dialog" aria-modal="true" aria-label="เมนู"><div class="row" style="gap:12px;padding:4px 4px 12px"><div class="av round" style="width:46px;height:46px">${esc((S.profile.display_name||'?').charAt(0))}</div><div class="grow"><b style="font-size:16px">${esc(S.profile.display_name)}</b><div class="xs muted">${ROLES[S.profile.role]}${S.profile.can_check&&!isManager()?' · ผู้เช็คชื่อ':''}</div></div></div>${navBodyHTML(cur)}</aside>`, false);
  m.el.classList.add('drawer-bg');
  const d=$('.drawer',m.el); bindNav(d);
  $$('a',d).forEach(a=>a.addEventListener('click',()=>m.close()));
  let x0=null; d.addEventListener('touchstart',e=>{x0=e.touches[0].clientX;},{passive:true}); d.addEventListener('touchend',e=>{ if(x0!==null&&e.changedTouches[0].clientX-x0<-60) m.close(); x0=null; });
}
async function pickSite(){
  const ids=mySiteIds(); const list=S.sites.filter(s=>ids.includes(s.id));
  const opts=[['',isManager()?'ทุกไซต์':'ไซต์ของฉันทั้งหมด'],...list.map(s=>[String(s.id),s.name+(s.code?` (${s.code})`:'')])];
  const m=overlay(`<div class="modal" role="dialog" aria-modal="true"><h3 class="h2" style="font-size:18px">แสดงข้อมูลของ</h3><div class="card card-l" style="box-shadow:none">${opts.map(([v,t])=>`<button class="li" data-v="${v}">${modIcon('sites',30)}<span class="grow">${esc(t)}</span>${S.site===v?svg('<path d="M5 12l5 5 9-10"/>','style="color:var(--ok)"'):''}</button>`).join('')}</div><button class="btn" data-x>ปิด</button></div>`);
  $('[data-x]',m.el).onclick=m.close;
  $$('[data-v]',m.el).forEach(b=>b.onclick=()=>{ S.site=b.dataset.v; try{ localStorage.setItem('kty-site',S.site); }catch(_){} m.close(); $$('.drawer-bg').forEach(x=>x.remove()); document.body.style.overflow=''; route(); });
}
async function logout(){ if(await confirmBox('ออกจากระบบตอนนี้?','ออกจากระบบ')) sb.auth.signOut(); }
function head(title, sub='', o={}){
  const menuBtn=o.back?`<a href="${o.back}" class="ibtn" aria-label="ย้อนกลับ">${IC.back}</a>`:`<button class="ibtn" data-drawer aria-label="เปิดเมนู">${svg('<path d="M4 7h16M4 12h16M4 17h16"/>')}</button>`;
  title=T(title);
  return `<header class="appbar stripe">${menuBtn}${o.lead||''}<h1>${title}${sub?`<small>${sub}</small>`:''}</h1>${o.mActions||''}</header>
    <div class="main">${o.noDesk?'':`<div class="phead"><div>${o.back?`<a href="${o.back}" class="linkbtn" style="text-decoration:none">‹ ย้อนกลับ</a>`:''}<h1>${title}</h1>${sub?`<p>${sub}</p>`:''}</div><div class="row">${o.dActions||''}</div></div>`}`;
}
const setPage = html => { $('#page').innerHTML = html + '</div>'; const d=$('[data-drawer]'); if(d) d.onclick=openDrawer; };

/* =====================================================================
   งานที่รอ (รวมจากทุกระบบ) — ใช้ทั้งหน้าหลักและหน้า "งานที่รอ"
   ===================================================================== */
async function collectTasks(){
  const today=localISO(), mgr=isManager(), tasks=[];
  if(isAdmin()){ const qc=quotaCache(); if(!qc.ts||Date.now()-qc.ts>12*3600e3) quotaRefresh(true).catch(()=>{}); quotaAlerts().forEach(a=>tasks.push({m:'manage',t:`${a.t} ใช้ไป ${a.p}%`,sub:'ใกล้เต็ม ตรวจที่ จัดการ > พื้นที่และสำรอง',tag:a.p>=90?'ใกล้เต็มมาก':'ใกล้เต็ม',c:a.p>=90?'t-bad':'t-warn',href:'#manage/storage'})); }
  const siteIds=S.site?[+S.site]:mySiteIds();
  const q=[ S.hasPhase2&&siteIds.length?sb.from('site_reports').select('site_id,total,updated_at').eq('report_date',today).in('site_id',siteIds):Promise.resolve({data:[]}),
    siteIds.length?sb.from('daily_reports').select('id,site_id,total,no_work,updated_at,line_status').eq('report_date',today).in('site_id',siteIds):Promise.resolve({data:[]}) ];
  if(mgr){ q.push(isAdmin()?sb.from('profiles').select('id,role,is_active'):Promise.resolve({data:[]}), sb.from('employees').select('id,first_name,last_name,status,id_expiry_date,employment_type,probation_end'), S.hasPhase2?sb.from('attendance').select('employee_id,site_id').eq('work_date',today):Promise.resolve({data:[]})); }
  const [rep,dly,prof,emp,att]=await Promise.all(q);
  const daily={}; (dly.error?[]:(dly.data||[])).forEach(r=>daily[r.site_id]=r);
  const sent=new Set((rep.data||[]).map(r=>r.site_id));
  const missing=siteIds.filter(id=>!sent.has(id)).map(id=>S.sites.find(s=>s.id===id)).filter(Boolean);
  missing.forEach(s=>tasks.push({m:'daily',t:`${s.name} ยังไม่เช็คชื่อคนงานหน้าไซต์`,sub:mgr?'แตะเพื่อบันทึกแทน':'ส่งก่อนเริ่มงาน',tag:'ยังไม่ส่ง',c:'t-warn',href:mgr?'#att/site':'#report'}));
  if(!dly.error) siteIds.filter(id=>!daily[id]).map(id=>S.sites.find(s=>s.id===id)).filter(Boolean).forEach(s=>tasks.push({m:'daily',t:`${s.name} ยังไม่ส่งรายงานเย็น`,sub:mgr?'แตะเพื่อดูหรือเขียนแทน':'ส่งก่อนเลิกงาน',tag:'รอส่ง',c:'',href:'#daily'}));
  S.badges.daily=dly.error?0:siteIds.filter(id=>!daily[id]).length;
  if(hasMod('materials')){ try{
    const roleQ=[], push=(k,q)=>roleQ.push(q.then(r=>[k,r.data||[]]));
    if(hasMod('materials',['approver','admin'])) push('ap',sb.from('docs').select('id,doc_no,site_id,requester_name').eq('doc_type','REQ').eq('status','pending'));
    if(hasMod('materials',['store','admin'])) push('is',sb.from('docs').select('id,doc_no,site_id').eq('doc_type','REQ').in('status',['approved','partial','review']));
    push('rc',sb.from('docs').select('id,doc_no,site_id').eq('doc_type','REQ').in('status',['partial','issued']).in('site_id',siteIds.length?siteIds:[0]));
    const res=Object.fromEntries(await Promise.all(roleQ)); const sn=id=>S.sites.find(s=>s.id===id)?.name||'';
    (res.ap||[]).forEach(d=>tasks.push({m:'materials',t:`อนุมัติใบเบิก ${d.doc_no}`,sub:`${sn(d.site_id)} · ${d.requester_name||''}`,tag:'รออนุมัติ',c:'t-warn',href:`#mat/d/${d.id}`}));
    (res.is||[]).forEach(d=>tasks.push({m:'materials',t:`จ่ายของ ${d.doc_no}`,sub:sn(d.site_id),tag:'รอจ่าย',c:'t-acc',href:`#mat/d/${d.id}`}));
    (res.rc||[]).forEach(d=>tasks.push({m:'materials',t:`รับของ ${d.doc_no}`,sub:sn(d.site_id),tag:'รอรับ',c:'t-acc',href:`#mat/d/${d.id}`}));
    S.badges.mat=(res.ap||[]).length+(res.is||[]).length+(res.rc||[]).length;
  }catch(_){} }
  if(mgr){ try{ const [c1,c2]=await Promise.all([sb.from('emp_change_requests').select('id',{count:'exact',head:true}).eq('status','pending'), isAdmin()?sb.from('link_requests').select('id',{count:'exact',head:true}).eq('status','pending'):Promise.resolve({count:0})]);
    if(c1.count) tasks.push({m:'people',t:`คำขอแก้ไขข้อมูลพนักงาน ${c1.count} รายการ`,sub:'ตรวจค่าเดิม → ค่าใหม่ แล้วอนุมัติ',tag:'รออนุมัติ',c:'t-warn',href:'#reqs'});
    if(c2.count) tasks.push({m:'people',t:`คำขอผูกบัญชีกับพนักงาน ${c2.count} รายการ`,sub:'จากการสแกน QR บนสลิป',tag:'รออนุมัติ',c:'t-warn',href:'#reqs'}); }catch(_){} }
  if(mgr){ try{ const {data:eo}=await sb.from('emp_orders').select('id,total,requested_name').eq('status','pending'); (eo||[]).forEach(o=>tasks.push({m:'payroll',t:`อนุมัติคำสั่งซื้อสินค้าบริษัท ${baht(o.total)}`,sub:o.requested_name||'',tag:'รออนุมัติ',c:'t-warn',href:'#pay'})); }catch(_){} }
  if(mgr||hasMod('borrow')||hasMod('materials',['store','admin'])){ try{
    const appr=mgr||hasMod('borrow',['approver']), store=appr||hasMod('materials',['store','admin']);
    const [pb,ib,ob]=await Promise.all([ appr?sb.from('docs').select('id,doc_no,site_id,requester_name,ext_due,status').eq('doc_type','BRW').or('status.eq.pending,ext_due.not.is.null'):Promise.resolve({data:[]}),
      store?sb.from('docs').select('id,doc_no,site_id').eq('doc_type','BRW').in('status',['approved','partial']):Promise.resolve({data:[]}), sb.rpc('open_borrows') ]);
    const sn=id=>S.sites.find(s=>s.id===id)?.name||''; let n=0;
    (pb.data||[]).forEach(d=>{ n++; tasks.push({m:'borrow',t:d.status==='pending'?`อนุมัติใบยืม ${d.doc_no}`:`ขอขยายเวลา ${d.doc_no}`,sub:`${sn(d.site_id)} · ${d.requester_name||''}`,tag:'รออนุมัติ',c:'t-warn',href:`#brw/d/${d.id}`}); });
    (ib.data||[]).forEach(d=>{ n++; tasks.push({m:'borrow',t:`ส่งอุปกรณ์ ${d.doc_no}`,sub:sn(d.site_id),tag:'รอส่ง',c:'t-acc',href:`#brw/d/${d.id}`}); });
    const seen=new Set(); (ob.data||[]).filter(o=>(appr||siteIds.includes(o.site_id))&&(o.overdue_days>0||o.due_date===addDays(today,1)||o.due_date===today)).forEach(o=>{ if(seen.has(o.doc_id)) return; seen.add(o.doc_id); n++;
      tasks.unshift({m:'borrow',t:o.overdue_days>0?`ค้างคืนเกิน ${o.overdue_days} วัน ${o.doc_no}`:`ครบกำหนดคืน${o.due_date===today?'วันนี้':'พรุ่งนี้'} ${o.doc_no}`,sub:`${sn(o.site_id)} · ${o.requester_name||''}`,tag:o.overdue_days>0?'เกินกำหนด':'ใกล้ครบ',c:o.overdue_days>0?'t-bad':'t-warn',href:`#brw/d/${o.doc_id}`}); });
    S.badges.brw=n;
  }catch(_){} }
  let crew=(rep.data||[]).reduce((a,r)=>a+r.total,0);
  if(mgr){
    const pend=(prof?.data||[]).filter(x=>x.role==='pending'&&x.is_active).length;
    if(pend) tasks.unshift({m:'people',t:`ผู้สมัครใหม่รออนุมัติ ${pend} คน`,sub:'กำหนดสิทธิ์และไซต์',tag:'ใหม่',c:'t-acc',href:'#manage/users'});
    const act=(emp?.data||[]).filter(e=>e.status==='active');
    const done=new Set((att?.data||[]).map(a=>a.employee_id)); const todo=act.filter(e=>!done.has(e.id)).length;
    if(S.hasPhase2&&todo) tasks.push({m:'att',t:`เช็คชื่อวันนี้ยังไม่ครบ ${todo} คน`,sub:`บันทึกแล้ว ${done.size} จาก ${act.length} คน`,tag:'ค้าง',c:'t-warn',href:'#roll'});
    act.filter(e=>{ const d=daysUntil(e.id_expiry_date); return d!==null&&d<=60; }).forEach(e=>tasks.push({m:'people',t:`บัตรประชาชน ${shortName(e)} ${daysUntil(e.id_expiry_date)<0?'หมดอายุแล้ว':'ใกล้หมดอายุ'}`,sub:thaiDate(e.id_expiry_date),tag:'บัตร',c:'t-warn',href:`#emp/${e.id}`}));
    act.filter(e=>e.employment_type==='probation'&&daysUntil(e.probation_end)!==null&&daysUntil(e.probation_end)<=30).forEach(e=>tasks.push({m:'people',t:`${shortName(e)} ใกล้ครบทดลองงาน`,sub:thaiDate(e.probation_end),tag:'ทดลองงาน',c:'',href:`#emp/${e.id}`}));
    S.badges.users=pend||0; S.badges.att=todo||0;
    return {tasks, act:act.length, done:done.size, sent:sent.size, sites:siteIds.length, crew, pend, daily};
  }
  return {tasks, sent:sent.size, sites:siteIds.length, crew, rep:rep.data||[], daily};
}
const taskHTML = x => `<a href="${x.href}" class="li" style="text-decoration:none">${modIcon(x.m,40)}<div class="grow"><b style="font-size:14.5px">${esc(x.t)}</b><span class="xs muted">${esc(x.sub||'')}</span></div>${x.tag?`<span class="tag ${x.c}">${esc(x.tag)}</span>`:''}${svg('<path d="M9 6l6 6-6 6"/>','style="width:18px;color:var(--ink2)"')}</a>`;

function tileHTML(k, href, label, badgeKey, soon){
  if(!allowed(k)) return '';
  return `<a href="${href}" class="tile ${soon?'soon':''}">${modIcon(k,64)}${badgeKey?`<span class="tbadge hidden" data-badge="${badgeKey}"></span>`:''}<span class="tl">${T(label||MOD[k].t)}</span>${soon?'<span class="tag" style="height:18px;font-size:10.5px">เร็ว ๆ นี้</span>':''}</a>`;
}

/* =====================================================================
   หน้าหลัก Hub (แยกตามบทบาท)
   ===================================================================== */
async function pageHome(){
  const p=S.profile, mgr=isManager(), first=(p.display_name||'').split(' ')[0];
  const lead=`<div class="mark" style="width:40px;height:40px"><span>KTY</span></div>`;
  const chips = (mgr||(S.mySites||[]).length>1) ? `<div class="chips scroll" style="margin:0 -16px">${[['',mgr?'ทุกไซต์':'ทุกไซต์ของฉัน'],...S.sites.filter(s=>mySiteIds().includes(s.id)).map(s=>[String(s.id),s.name])].map(([v,t])=>`<button class="chip ${S.site===v?'on':''}" data-site="${v}">${esc(t)}</button>`).join('')}</div>` : '';
  setPage(head(`สวัสดี คุณ${esc(first)}`, `${esc(siteLabel())} · ${todayLong()}`, {mActions:`<span class="tag t-acc">${ROLES[p.role]}</span>`}) + chips + `<div id="hb"><div class="loading"><div class="spin"></div></div></div>`);
  $$('[data-site]').forEach(b=>b.onclick=()=>{ S.site=b.dataset.site; try{ localStorage.setItem('kty-site',S.site); }catch(_){} route(); });
  let tiles='';
  if(mgr){
    tiles=[tileHTML('att','#att','เช็คชื่อ','att'), tileHTML('daily','#daily',null,'daily'), tileHTML('materials','#mat',null,'mat'), tileHTML('borrow','#ret',null,'brw'), tileHTML('issues','#soon/issues',null,null,true), tileHTML('people','#employees'), tileHTML('payroll','#pay'), tileHTML('sites','#manage/sites'), tileHTML('manage','#manage','จัดการ','users'), ...(isAdmin()?[tileHTML('studio','#studio')]:[])].filter(x=>x).join('');
  } else {
    const t=[];
    if(p.can_check) t.push(tileHTML('att','#roll','เช็คชื่อหน้าไซต์งาน'));
    if(p.role==='foreman'||hasMod('daily')) t.push(tileHTML('daily','#daily','รายงานประจำวัน','daily'));
    if(hasMod('materials')) t.push(tileHTML('materials','#mat','เบิก วัสดุ/อุปกรณ์','mat'));
    if(hasMod('borrow')||hasMod('materials')) t.push(tileHTML('borrow','#ret','คืน วัสดุ/อุปกรณ์','brw'));
    if(hasMod('issues')) t.push(tileHTML('issues','#soon/issues','รายงานปัญหาหน้างาน',null,true));
    t.push(tileHTML('payroll','#my','ข้อมูลของฉัน'), tileHTML('stars','#me/stars','ดาวของฉัน'), tileHTML('me','#me','บัญชีของฉัน'));
    tiles=t.join('');
  }
  let d; try{ d=await collectTasks(); }catch(err){ $('#hb').outerHTML=`<div class="note n-bad">${esc(errText(err))}</div>`; return; }
  S.badges.tasks=d.tasks.length; S.badges.crew=Math.max(0,d.sites-d.sent);
  let top='';
  if(mgr){
    top=`<div class="card sumstrip"><div><b class="num">${d.done}<small>/${d.act}</small></b><span>เช็คชื่อวันนี้</span></div><div><b class="num">${d.sent}<small>/${d.sites}</small></b><span>ไซต์เช็คชื่อคนงานแล้ว</span></div><div><b class="num">${d.crew}</b><span>คนงานหน้างาน</span></div><div><b class="num" style="${d.tasks.length?'color:var(--warn)':''}">${d.tasks.length}</b><span>งานที่รอคุณ</span></div></div>`;
  } else if(p.role==='foreman'||hasMod('daily')){
    const sites=S.sites.filter(s=>(S.site?[+S.site]:S.mySites).includes(s.id)&&s.status==='active');
    const rep={}; (d.rep||[]).forEach(r=>rep[r.site_id]=r);
    top=sites.length?`<div class="card col" style="gap:12px"><h3 class="h2">วันนี้ที่ไซต์ของคุณ</h3><div class="timeline">${sites.map(s=>{ const r=rep[s.id]; return `<div class="row"><span class="dot ${r?'done':'now'}">${r?svg('<path d="M5 12l5 5 9-10"/>','style="width:14px;height:14px;stroke-width:3"'):''}</span><div class="grow"><b>${esc(s.name)}</b><div class="sm muted">${r?`เช็คชื่อคนงานแล้ว ${r.total} คน · ${new Date(r.updated_at).toTimeString().slice(0,5)}`:'ยังไม่เช็คชื่อคนงานหน้าไซต์'}</div></div></div>`; }).join('')}
      ${sites.map(s=>{ const r=d.daily[s.id]; return `<div class="row"><span class="dot ${r?'done':'now'}">${r?svg('<path d="M5 12l5 5 9-10"/>','style="width:14px;height:14px;stroke-width:3"'):''}</span><div class="grow"><b>รายงานเย็น ${sites.length>1?esc(s.name):''}</b><div class="sm muted">${r?`ส่งแล้ว ${new Date(r.updated_at).toTimeString().slice(0,5)}`:'ส่งก่อนเลิกงาน'}</div></div></div>`; }).join('')}</div><a href="#daily" class="btn btn-p">${d.sites>d.sent?'เช็คชื่อคนงาน / รายงานเย็น':'เขียนหรือดูรายงานประจำวัน'}</a></div>`:`<div class="card empty"><b>ยังไม่ได้กำหนดไซต์ที่รับผิดชอบ</b>ติดต่อแอดมิน</div>`;
  }
  $('#hb').outerHTML=`<div class="col" style="gap:16px">${top}<div class="tiles">${tiles}</div>
    ${!mgr&&hasMod('issues')?`<div class="note n-warn" style="align-items:center">${modIcon('issues',30)}<span>รายงานปัญหาหน้างาน จะส่งแจ้งเตือนถึงผู้บริหารทันที</span></div>`:''}
    <div class="row" style="justify-content:space-between"><h3 class="h2">${mgr?'งานที่รอคุณ':'งานของฉันวันนี้'}</h3>${d.tasks.length>4?'<a href="#tasks" class="sm" style="color:var(--ink2)">ดูทั้งหมด</a>':''}</div>
    ${d.tasks.length?`<div class="card card-l">${d.tasks.slice(0,4).map(taskHTML).join('')}</div>`:`<div class="card empty" style="padding:24px"><b>ไม่มีงานค้าง</b>เรียบร้อยดีทุกอย่าง</div>`}</div>`;
  paintBadges();
  if(S.profile.employee_id&&typeof myHomeCard==='function') myHomeCard();
  if(typeof iosInstallHint==='function') setTimeout(iosInstallHint,1500);
}
async function pageTasks(){
  setPage(head('งานที่รอ',siteLabel()) + `<div id="tb"><div class="loading"><div class="spin"></div></div></div>`);
  const d=await collectTasks(); S.badges.tasks=d.tasks.length;
  $('#tb').outerHTML=d.tasks.length?`<div class="card card-l" style="max-width:760px">${d.tasks.map(taskHTML).join('')}</div>`:`<div class="card empty"><b>ไม่มีงานค้าง</b>เรียบร้อยดีทุกอย่าง</div>`;
  paintBadges();
}
function pageSoon(k){
  const meta=MOD[k]||MOD.home;
  setPage(head(meta.t,'อยู่ระหว่างพัฒนา') + `<div class="card col" style="align-items:center;text-align:center;gap:14px;padding:36px 20px;max-width:560px">${modIcon(k in MOD?k:'home',84)}<h2 style="margin:0;font-size:22px">${meta.t}</h2><p class="muted" style="margin:0">${esc(SOON[k]||'ระบบนี้กำลังพัฒนา')}</p><span class="tag t-acc">เร็ว ๆ นี้ใน KTY Hub</span></div>`);
}
async function pageMyStars(){
  setPage(head('ดาวของฉัน','คะแนนความประพฤติ') + `<div id="ms" style="max-width:640px"><div class="loading"><div class="spin"></div></div></div>`);
  if(!S.profile.employee_id){ $('#ms').innerHTML=`<div class="note n-info">${IC.info}<span>บัญชีนี้ยังไม่ได้ผูกกับทะเบียนพนักงาน</span></div>`; return; }
  const {data:e}=await sb.from('employees').select('id,stars').eq('id',S.profile.employee_id).single();
  $('#ms').innerHTML=`<div class="idc" style="text-align:center;padding-bottom:28px"><div style="margin-bottom:6px">${stars5(e?.stars??5)}</div><b style="font-size:30px">${Number(e?.stars??5).toFixed(1)}</b> <span style="color:#C2D0D3">/ 5 ดาว</span></div><div class="card card-l" style="margin-top:14px" id="msh"><div class="spin" style="margin:16px auto"></div></div>`;
  $('#msh').innerHTML=await starHistoryHTML(S.profile.employee_id);
}

/* =====================================================================
   จัดการ: สิทธิ์รายระบบ
   ===================================================================== */
const MROLES = {
  daily:{t:'รายงานประจำวัน', o:[['','ไม่มี'],['writer','เขียน'],['viewer','ดูทั้งหมด']]},
  materials:{t:'เบิกจ่ายวัสดุ', o:[['','ไม่มี'],['requester','ผู้ขอเบิก'],['approver','ผู้อนุมัติ'],['store','สโตร์'],['admin','แอดมิน']]},
  borrow:{t:'ยืม-คืนอุปกรณ์', o:[['','ไม่มี'],['requester','ผู้ขอยืม'],['approver','ผู้อนุมัติ']]},
  issues:{t:'ปัญหาหน้างาน', o:[['','ไม่มี'],['reporter','แจ้งปัญหา'],['receiver','รับแจ้ง']]}
};
async function mgPerms(){
  const [u,r]=await Promise.all([ sb.from('profiles').select('*').eq('is_active',true).neq('role','pending').order('display_name'), sb.from('module_roles').select('*') ]);
  if(r.error){ $('#mg').innerHTML=`<div class="card empty"><b>ยังไม่ได้อัปเดตฐานข้อมูล Hub</b>รันไฟล์ 05_hub.sql ใน Supabase แล้วโหลดหน้านี้ใหม่</div>`; return; }
  const roles=r.data||[], get=(uid,m)=>roles.find(x=>x.user_id===uid&&x.module===m)?.role||'';
  const short={writer:'เขียน',viewer:'ดู',requester:'ขอ',approver:'อนุ',store:'สโตร์',admin:'แอด',reporter:'แจ้ง',receiver:'รับ'};
  $('#mg').innerHTML=`<div class="note n-info">${IC.info}<span>ผู้บริหารและแอดมินใช้ได้ทุกระบบโดยอัตโนมัติ ตั้งค่าเฉพาะผู้ใช้อื่น ส่วนรายชื่อที่ผู้เช็คชื่อเห็น ตั้งที่แท็บผู้ใช้</span></div>
    ${(u.data||[]).map(p=>{ const mgr=['admin','executive'].includes(p.role);
      return `<details class="card perm" data-u="${p.id}" ${mgr?'':''}><summary class="row" style="gap:12px;cursor:pointer;list-style:none"><div class="av round" style="width:40px;height:40px">${esc((p.display_name||'?').charAt(0))}</div><div class="grow"><b>${esc(p.display_name)}</b><div class="xs muted">${ROLES[p.role]}</div></div>
        <div class="row" style="gap:4px;flex-wrap:wrap;justify-content:flex-end">${mgr?'<span class="tag t-acc">ทุกระบบ</span>':`<span class="tag ${p.can_check?'t-ok':''}" style="height:22px;font-size:11px">${p.can_check?'เช็คชื่อ':'–'}</span>`+Object.keys(MROLES).map(m=>{ const v=get(p.id,m); return `<span class="tag ${v?'t-ok':''}" style="height:22px;font-size:11px;${v?'':'opacity:.5'}">${v?short[v]:'–'}</span>`; }).join('')}</div></summary>
        ${mgr?'<p class="sm muted" style="margin:10px 0 0">บทบาทผู้บริหาร/แอดมิน ใช้ได้ทุกระบบ</p>':`<div class="col" style="gap:0;margin-top:8px">
          <div class="prow"><div class="row" style="gap:10px">${modIcon('att',30)}<b>เช็คชื่อ</b></div><div class="chips" style="gap:6px"><button class="chip ${p.can_check?'':'on'}" data-ck="0">ไม่มี</button><button class="chip ${p.can_check?'on':''}" data-ck="1">ผู้เช็คชื่อ</button></div></div>
          ${Object.entries(MROLES).map(([m,def])=>`<div class="prow"><div class="row" style="gap:10px">${modIcon(m,30)}<b>${def.t}</b></div><div class="chips" style="gap:6px">${def.o.map(([v,t])=>`<button class="chip ${get(p.id,m)===v?'on':''}" data-m="${m}" data-v="${v}">${t}</button>`).join('')}</div></div>`).join('')}
          <div class="row" style="padding-top:12px"><span class="xs muted grow">${p.role==='foreman'?'โฟร์แมนเช็คชื่อคนงานหน้าไซต์ได้ตามไซต์ที่รับผิดชอบ':''}</span><button class="btn btn-p btn-sm" data-save>บันทึก</button></div></div>`}
      </details>`; }).join('')}`;
  $$('details.perm').forEach(card=>{
    const id=card.dataset.u;
    $$('[data-ck]',card).forEach(b=>b.onclick=()=>{ $$('[data-ck]',card).forEach(x=>x.classList.toggle('on',x===b)); });
    $$('[data-m]',card).forEach(b=>b.onclick=()=>{ $$(`[data-m="${b.dataset.m}"]`,card).forEach(x=>x.classList.toggle('on',x===b)); });
    const sv=$('[data-save]',card); if(!sv) return;
    sv.onclick=async()=>{
      busy(sv,true,'...');
      const can=$('[data-ck].on',card)?.dataset.ck==='1';
      const pr=await sb.from('profiles').update({can_check:can}).eq('id',id); if(pr.error){ busy(sv,false); return toast(errText(pr.error),true); }
      for(const m of Object.keys(MROLES)){
        const v=$(`[data-m="${m}"].on`,card)?.dataset.v||'', had=get(id,m);
        if(v===had) continue;
        const res = v ? await sb.from('module_roles').upsert({user_id:id,module:m,role:v},{onConflict:'user_id,module'}) : await sb.from('module_roles').delete().eq('user_id',id).eq('module',m);
        if(res.error){ busy(sv,false); return toast(errText(res.error),true); }
      }
      toast('บันทึกสิทธิ์แล้ว'); if(id===S.profile.id) await enter(); else mgPerms();
    };
  });
}

/* =====================================================================
   จัดการ: ข้อมูลไซต์งานฉบับรวม
   ===================================================================== */
async function siteDetail(s){
  const [pf,asg]=await Promise.all([ sb.from('profiles').select('id,display_name,role').in('role',['admin','executive','foreman']).eq('is_active',true), sb.from('site_assignments').select('user_id').eq('site_id',s.id) ]);
  const team=(pf.data||[]).filter(p=>(asg.data||[]).some(a=>a.user_id===p.id));
  const m=overlay(`<div class="sheet" role="dialog" aria-modal="true" aria-label="ข้อมูลไซต์งาน"><header class="appbar stripe"><button class="ibtn" data-x aria-label="ปิด">${IC.close}</button><h1>${esc(s.name)}<small>${esc(s.code||'ยังไม่มีรหัส')} · ${s.status==='active'?'เปิดอยู่':'ปิดแล้ว'}</small></h1></header>
    <form class="sheet-body" id="sf" novalidate>
      <div class="field"><label for="s_name">ชื่อไซต์ / โครงการ</label><input class="in" id="s_name" value="${esc(s.name)}"></div>
      <div class="g2"><div class="field"><label for="s_code">รหัสโครงการ</label><input class="in" id="s_code" value="${esc(s.code||'')}" placeholder="เช่น SB03"></div>
        <div class="field"><label for="s_mgr">ผู้จัดการโครงการ</label><select class="in" id="s_mgr"><option value="">ไม่ระบุ</option>${(pf.data||[]).filter(p=>p.role!=='foreman').map(p=>`<option value="${p.id}" ${s.manager_id===p.id?'selected':''}>${esc(p.display_name)}</option>`).join('')}</select></div></div>
      <div class="field"><label for="s_loc">ที่ตั้ง</label><input class="in" id="s_loc" value="${esc(s.location||'')}"></div>
      <div class="sec">ข้อมูลสัญญา (แสดงในรายงาน PDF)</div>
      <div class="field"><label for="s_cname">ชื่องานตามสัญญา</label><input class="in" id="s_cname" value="${esc(s.contract_name||'')}" placeholder="เช่น ก่อสร้างบ้านพักอาศัย 2 ชั้น"></div>
      <div class="g2"><div class="field"><label for="s_cno">สัญญาเลขที่</label><input class="in" id="s_cno" value="${esc(s.contract_no||'')}" placeholder="เช่น 12/2569"></div><div class="field"><label for="s_cdate">ลงวันที่</label><input class="in" type="date" id="s_cdate" value="${s.contract_date||''}"></div></div>
      <div class="g2"><div class="field"><label for="s_st">วันเริ่ม</label><input class="in" type="date" id="s_st" value="${s.start_date||''}"></div><div class="field"><label for="s_en">วันสิ้นสุด</label><input class="in" type="date" id="s_en" value="${s.end_date||''}"></div></div>
      <div class="sec">การเชื่อมต่อ</div>
      <div class="field"><label for="s_line">รหัสกลุ่ม LINE (ขึ้นต้นด้วย C)</label><input class="in" id="s_line" value="${esc(s.line_group_id||'')}" placeholder="ใช้ส่งสรุปรายงานประจำวันเข้ากลุ่ม"></div>
      <div class="field"><label for="s_drive">รหัสโฟลเดอร์ Google Drive (ไม่บังคับ)</label><input class="in" id="s_drive" value="${esc(s.drive_folder_id||'')}" placeholder="ระบบสร้างให้อัตโนมัติเมื่อส่งรายงานแรก">${s.drive_folder_id?`<a class="sm" href="https://drive.google.com/drive/folders/${esc(s.drive_folder_id)}" target="_blank" rel="noopener">เปิดโฟลเดอร์ของไซต์นี้</a>`:''}</div>
      <div class="sec">ทีมที่รับผิดชอบ</div>
      <div class="chips">${team.length?team.map(p=>`<span class="chip">${esc(p.display_name)} · ${ROLES[p.role]}</span>`).join(''):'<span class="hint">ยังไม่มี กำหนดได้ที่แท็บผู้ใช้</span>'}</div>
      <div class="field"><label for="s_note">หมายเหตุ</label><textarea class="in" id="s_note">${esc(s.note||'')}</textarea></div>
    </form>
    <div class="sheet-foot"><button class="btn" data-toggle>${s.status==='active'?'ปิดไซต์':'เปิดไซต์อีกครั้ง'}</button><button class="btn btn-p" data-save>บันทึก</button></div></div>`, false, false);
  $('[data-x]',m.el).onclick=m.close;
  const save=async(extra={})=>{
    const row={ name:$('#s_name').value.trim(), code:$('#s_code').value.trim().toUpperCase()||null, manager_id:$('#s_mgr').value||null, location:$('#s_loc').value.trim()||null,
      start_date:$('#s_st').value||null, end_date:$('#s_en').value||null, line_group_id:$('#s_line').value.trim()||null, drive_folder_id:$('#s_drive').value.trim()||null, note:$('#s_note').value.trim()||null, contract_name:$('#s_cname').value.trim()||null, contract_no:$('#s_cno').value.trim()||null, contract_date:$('#s_cdate').value||null, ...extra };
    if(!row.name) return toast('กรอกชื่อไซต์',true);
    const {error}=await sb.from('sites').update(row).eq('id',s.id);
    if(error) return toast(/sites_code_uq|duplicate/.test(error.message)?'รหัสโครงการนี้มีแล้ว':errText(error),true);
    m.close(); toast('บันทึกข้อมูลไซต์แล้ว'); await loadRefs(); pageManage();
  };
  $('[data-save]',m.el).onclick=()=>save();
  $('[data-toggle]',m.el).onclick=()=>save({status:s.status==='active'?'closed':'active'});
}

/* =====================================================================
   จัดการ: พื้นที่ใช้งานและสำรองข้อมูล
   ===================================================================== */
const fmtBytes = b => b>=1073741824?`${(b/1073741824).toFixed(2)} GB`:b>=1048576?`${(b/1048576).toFixed(1)} MB`:`${Math.round(b/1024)} KB`;
async function bridge(action, extra={}){
  const url=String(S.settings.bridge_url||'').trim(); if(!url) throw new Error('ยังไม่ได้ตั้งค่า Bridge URL');
  const call=async tok=>{ const r=await fetch(url,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,token:tok,...extra})}); return r.json(); };
  const {data}=await sb.auth.getSession();
  let j=await call(data.session?.access_token);
  if(j.error&&/session|หมดอายุ|เข้าสู่ระบบใหม่/i.test(j.error)){ // เซสชันถูกยกเลิก/หมดอายุ: ต่ออายุแล้วลองใหม่ 1 ครั้ง
    const rf=await sb.auth.refreshSession();
    if(rf.data?.session){ S.session=rf.data.session; j=await call(rf.data.session.access_token); }
    else { toast('การเข้าสู่ระบบหมดอายุ กรุณาเข้าสู่ระบบใหม่',true); setTimeout(()=>sb.auth.signOut(),1500); throw new Error('การเข้าสู่ระบบหมดอายุ'); }
  }
  if(j.error) throw new Error(j.error); return j;
}
function gaugeHTML(k,title,used,total,note){
  const pct=total?Math.min(100,Math.round(used/total*100)):0, warn=pct>=(S.settings.retention?.warn_pct||70);
  return `<div class="card col" style="gap:10px"><div class="row" style="gap:12px">${modIcon(k,40)}<div class="grow"><b>${title}</b><div class="xs muted">${note}</div></div><b class="num" style="font-size:20px;${warn?'color:var(--bad)':''}">${pct}%</b></div>
    <div class="track" style="height:12px"><i style="width:${pct}%;background:${warn?'var(--bad)':MOD[k].hue}"></i></div><div class="row xs muted" style="justify-content:space-between"><span>ใช้ไป ${fmtBytes(used)}</span><span>จาก ${fmtBytes(total)} · เตือนที่ ${S.settings.retention?.warn_pct||70}%</span></div></div>`;
}
/* ---------- พื้นที่และสำรอง: GitHub · Supabase · Google Drive (เตือนเมื่อใกล้เต็ม) ---------- */
const QUOTA={ db:500*1048576, files:1024*1048576, gh:1024*1048576 };
const ghRepo=()=>{ const host=location.hostname, seg=location.pathname.split('/').filter(Boolean)[0]; if(!/\.github\.io$/.test(host)) return null; const owner=host.split('.')[0]; return {owner, repo:seg&&!/\./.test(seg)?seg:`${owner}.github.io`}; };
const quotaCache=()=>{ try{ return JSON.parse(localStorage.getItem('kty-quota')||'{}'); }catch(_){ return {}; } };
const quotaSave=o=>{ try{ localStorage.setItem('kty-quota',JSON.stringify({...quotaCache(),...o,ts:Date.now()})); }catch(_){} };
async function quotaRefresh(withDrive){
  const out={};
  try{ const {data}=await sb.rpc('db_stats'); if(data) out.db=[data.db_bytes,QUOTA.db]; }catch(_){}
  try{ const {data}=await sb.rpc('storage_stats'); if(data&&data.total_bytes!=null) out.files=[+data.total_bytes||0,QUOTA.files]; }catch(_){}
  const g=ghRepo(); if(g){ try{ const r=await fetch(`https://api.github.com/repos/${g.owner}/${g.repo}`); if(r.ok){ const j=await r.json(); out.gh=[(j.size||0)*1024,QUOTA.gh]; out.gh_private=!!j.private; } }catch(_){} }
  if(withDrive&&hasBridge()){ try{ const j=await bridge('stats'); out.drive=[j.drive_used,j.drive_limit]; }catch(_){} }
  quotaSave(out); return out;
}
function quotaAlerts(){ const c=quotaCache(), L=[]; const chk=(k,t)=>{ const v=c[k]; if(v&&v[1]){ const p=Math.round(v[0]/v[1]*100); if(p>=80) L.push({k,t,p}); } };
  chk('db','ฐานข้อมูล Supabase'); chk('files','ไฟล์ใน Supabase (รูปพนักงาน/วัสดุ)'); chk('gh','GitHub (ไฟล์แอป)'); chk('drive','Google Drive บริษัท'); return L; }
async function mgStorage(){
  const host=$('#mg'); host.innerHTML='<div class="loading"><div class="spin"></div></div>';
  const [{data:st,error},{data:fs}]=await Promise.all([sb.rpc('db_stats'),sb.rpc('storage_stats').then(r=>r,()=>({data:null}))]);
  const g=ghRepo(); let gh=null; if(g){ try{ const r=await fetch(`https://api.github.com/repos/${g.owner}/${g.repo}`); if(r.ok) gh=await r.json(); }catch(_){} }
  quotaSave({...(st?{db:[st.db_bytes,QUOTA.db]}:{}),...(fs&&fs.total_bytes!=null?{files:[+fs.total_bytes||0,QUOTA.files]}:{}),...(gh?{gh:[(gh.size||0)*1024,QUOTA.gh],gh_private:!!gh.private}:{})});
  const BN={'employee-photos':'รูปพนักงาน','material-images':'รูปวัสดุ/อุปกรณ์','brand':'โลโก้'};
  let html='<div id="qsum"></div><h3 class="h2" style="margin-top:4px">Supabase (ฐานข้อมูลและไฟล์)</h3>';
  if(error||!st) html+=`<div class="card empty"><b>ยังไม่ได้อัปเดตฐานข้อมูล Hub</b>รันไฟล์ 05_hub.sql ใน Supabase</div>`;
  else html+=gaugeHTML('manage','ฐานข้อมูล Supabase',st.db_bytes,QUOTA.db,'แพ็กเกจฟรี 500 MB')+`<details class="card"><summary style="cursor:pointer"><b>ขนาดแยกตามตาราง</b></summary><div style="margin-top:8px">${(st.tables||[]).slice(0,12).map(t=>`<div class="kv"><span>${esc(t.name)} <span class="xs">(${t.rows} แถว)</span></span><span class="num">${fmtBytes(t.bytes)}</span></div>`).join('')}</div></details>`;
  html+=fs&&fs.total_bytes!=null?gaugeHTML('materials','ไฟล์ใน Supabase Storage',+fs.total_bytes||0,QUOTA.files,'แพ็กเกจฟรี 1 GB · '+((fs.buckets||[]).map(b=>`${BN[b.bucket]||b.bucket} ${fmtBytes(b.bytes)}`).join(' · ')||'ยังไม่มีไฟล์')):`<div class="note n-info">${IC.info}<span>รันไฟล์ 18_storage_stats.sql เพื่อดูพื้นที่ไฟล์ใน Supabase</span></div>`;
  html+=`<div class="note n-info">${IC.info}<span>Supabase แพ็กเกจฟรี: ถ้าไม่มีใครใช้งานระบบติดต่อกันราว 1 สัปดาห์ โปรเจกต์จะถูกพัก (ข้อมูลไม่หาย) เข้า supabase.com แล้วกด Restore ได้ · ใช้งานทุกวันจึงไม่ถูกพัก</span></div>`;
  html+='<h3 class="h2">GitHub (ไฟล์แอป)</h3>';
  html+=gh?gaugeHTML('studio',`GitHub · ${esc(g.owner)}/${esc(g.repo)}`,(gh.size||0)*1024,QUOTA.gh,'GitHub Pages ฟรี เว็บไม่เกิน 1 GB'):`<div class="note n-warn">${IC.info}<span>${g?'อ่านขนาด repo จาก GitHub ไม่ได้ (repo อาจเป็น Private)':'เปิดแอปจาก github.io จึงจะดูขนาด repo ได้'}</span></div>`;
  if(gh?.private) html+=`<div class="note n-bad">${IC.info}<span>repo เป็น Private: GitHub Pages แบบฟรีใช้ได้เฉพาะ repo แบบ Public</span></div>`;
  html+=`<div class="card col" style="gap:8px"><b class="sm">Codespaces (ไม่จำเป็นต่อ KTY Hub)</b><span class="xs muted">ระบบอ่านการใช้ Codespaces ให้ไม่ได้ ตรวจที่ GitHub: ลบ codespace ที่ค้าง และตั้งงบ $0 เพื่อไม่ให้ถูกเก็บเงิน · อัปไฟล์ด้วย Add file > Upload files ไม่ใช้ Codespaces</span>
    <div class="row" style="gap:8px;flex-wrap:wrap"><a class="btn btn-sm" href="https://github.com/codespaces" target="_blank" rel="noopener">เปิดหน้า Codespaces</a><a class="btn btn-sm" href="https://github.com/settings/billing" target="_blank" rel="noopener">ตั้งงบ / ดูการใช้งาน</a>${g?`<a class="btn btn-sm" href="https://github.com/${esc(g.owner)}/${esc(g.repo)}/upload/main" target="_blank" rel="noopener">อัปโหลดไฟล์ขึ้น repo</a>`:''}</div></div>`;
  html+='<h3 class="h2">Google Drive (รูปรายงาน PDF ไฟล์สำรอง)</h3><div id="drv"></div>';
  if(isAdmin()) html+=`<form class="card col" id="bf" style="gap:10px"><b>KTY Hub Bridge (Apps Script)</b><span class="xs muted">ใช้สำรองข้อมูลลง Google Drive อ่านพื้นที่ Drive ส่งรูปและแจ้ง LINE</span><input class="in" name="u" value="${esc(S.settings.bridge_url||'')}" placeholder="https://script.google.com/macros/s/.../exec" aria-label="Bridge URL"><button class="btn btn-sm" style="align-self:flex-start">บันทึก URL</button></form>`;
  html+=`<div class="card row" style="gap:12px;opacity:.75">${modIcon('tasks',40)}<div class="grow"><b>ปิดปีและย้ายข้อมูลเก่า</b><div class="xs muted">เก็บรายละเอียดในฐานข้อมูล ${S.settings.retention?.keep_years||2} ปี ปุ่มนี้จะเปิดใช้ก่อนสิ้นปี 2570</div></div></div>`;
  host.innerHTML=html;
  const drawSum=()=>{ const A=quotaAlerts(), el=$('#qsum'); if(!el) return; el.innerHTML=A.length?`<div class="note n-bad">${IC.info}<span><b>พื้นที่ใกล้เต็ม:</b> ${A.map(a=>`${a.t} ${a.p}%`).join(' · ')} · ลบไฟล์ที่ไม่ใช้ ลดอายุการเก็บข้อมูล หรือย้ายไฟล์เก่าออก</span></div>`:`<div class="note n-ok">${svg('<path d="M5 12l5 5 9-10"/>','style="flex:none"')}<span>พื้นที่ทุกส่วนยังเหลือเพียงพอ (เตือนเมื่อใช้เกิน 80%)</span></div>`; };
  drawSum();
  const bf=$('#bf'); if(bf) bf.onsubmit=async ev=>{ ev.preventDefault(); const v=bf.u.value.trim();
    const {error}=await sb.from('app_settings').update({value:v,updated_at:new Date().toISOString()}).eq('key','bridge_url'); if(error) return toast(errText(error),true); await loadRefs(); toast('บันทึก Bridge URL แล้ว'); mgStorage(); };
  const drv=$('#drv');
  if(!String(S.settings.bridge_url||'').trim()){ drv.innerHTML=`<div class="note n-warn">${IC.info}<span>ยังไม่ได้ติดตั้ง Bridge จึงยังไม่มีการสำรองข้อมูลอัตโนมัติ ดูวิธีติดตั้งในคู่มือ</span></div>`; return; }
  drv.innerHTML='<div class="card"><div class="spin" style="margin:8px auto"></div></div>';
  try{
    const j=await bridge('stats'); quotaSave({drive:[j.drive_used,j.drive_limit]}); drawSum();
    drv.innerHTML=gaugeHTML('daily','Google Drive บริษัท',j.drive_used,j.drive_limit,'ใช้ร่วมกับ Gmail และ Google Photos ของบัญชีเดียวกัน')+`<div class="card" style="padding:12px 16px 4px"><div class="row" style="justify-content:space-between"><b>สำรองรายสัปดาห์</b><span class="tag ${j.backups?.length?'t-ok':'t-warn'}">${j.backups?.length||0} ชุด</span></div>
      ${(j.backups||[]).map(b=>`<div class="li" style="padding:9px 0">${svg('<path d="M5 12l5 5 9-10"/>','style="color:var(--ok);width:18px"')}<span class="grow sm">${esc(b.name)}</span><span class="xs muted num">${fmtBytes(b.size)}</span></div>`).join('')||'<p class="sm muted">ยังไม่มีไฟล์สำรอง</p>'}
      <div style="padding:8px 0 10px"><button class="btn btn-sm" id="bkn">สำรองตอนนี้</button></div></div>`;
    const bk=$('#bkn'); if(bk) bk.onclick=async()=>{ busy(bk,true,'กำลังสำรอง...'); try{ const r=await bridge('backup'); toast(`สำรองแล้ว ${r.name}`); mgStorage(); }catch(e){ busy(bk,false); toast(errText(e),true); } };
  }catch(e){ drv.innerHTML=`<div class="note n-bad">${IC.info}<span>เชื่อมต่อ Bridge ไม่ได้: ${esc(e.message)}</span></div>`; }
}
