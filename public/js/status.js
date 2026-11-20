(function () {
  'use strict';
  const {AdminAPI:api,APP_CONFIG:config}=window;
  const $=(id)=>document.getElementById(id);
  const num=(value)=>new Intl.NumberFormat('fa-IR').format(Number(value)||0);
  const clock=new Intl.DateTimeFormat('fa-IR-u-ca-persian',{timeZone:config.timezone,hour:'2-digit',minute:'2-digit'});
  const dateOnly=new Intl.DateTimeFormat('fa-IR-u-ca-persian',{timeZone:config.timezone,year:'numeric',month:'long',day:'numeric'});
  const shortDate=new Intl.DateTimeFormat('fa-IR-u-ca-persian',{timeZone:config.timezone,year:'numeric',month:'2-digit',day:'2-digit'});
  const weekdayDate=new Intl.DateTimeFormat('fa-IR-u-ca-persian',{timeZone:config.timezone,weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const shortDay=new Intl.DateTimeFormat('fa-IR-u-ca-persian',{timeZone:config.timezone,month:'short',day:'numeric'});
  const statusText={paid:'موفق',unpaid:'ناموفق',pending:'در انتظار'};
  const navMeta={
    overview:['نمای کلی','سلام، مدیر عزیز','آخرین وضعیت کاربران و عملکرد سایت را در یک نگاه ببینید.','آخرین کاربران ثبت‌نام‌شده'],
    users:['مدیریت کاربران','مدیریت کاربران','فهرست کاربران ثبت‌نام‌شده و جزئیات هر حساب.','فهرست همه کاربران'],
    payments:['وضعیت پرداخت‌ها','مدیریت پرداخت‌ها','پرداخت‌های موفق، ناموفق و در انتظار بررسی را مدیریت کنید.','تراکنش‌ها و وضعیت پرداخت'],
    reports:['گزارش‌ها و خروجی','گزارش‌گیری و خروجی','لیست کاربران را در قالب CSV یا PDF دریافت کنید.','کاربران موجود در گزارش']
  };
  const state={view:'overview',page:1,limit:config.pageSize,search:'',status:'all',dateRange:'all',chartPeriod:'7d',total:0,pages:1,currentUsers:[],activeUserId:null,loading:false,requestSequence:0};
  const escapeHTML=(str)=>String(str??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dateStr=(iso)=>shortDate.format(new Date(iso));
  const dateTime=(iso)=>dateOnly.format(new Date(iso))+'، '+clock.format(new Date(iso));
  const fullAmount=(amount)=>amount?num(amount)+' تومان':'—';
  const statusBadge=(status)=>`<span class="payment-badge ${escapeHTML(status)}">${escapeHTML(statusText[status]||'نامشخص')}</span>`;
  const lockUI=(on)=>document.body.style.overflow=on?'hidden':'';
  function notify(message,type='ok'){
    const toast=document.createElement('div');
    toast.className='toast'+(type==='error'?' error':'');
    toast.innerHTML=`<svg class="icon"><use href="#i-${type==='error'?'info':'check'}"/></svg><span>${escapeHTML(message)}</span>`;
    $('toastRegion').appendChild(toast);
    setTimeout(()=>toast.remove(),3800);
  }
  function showLogin(){
    $('dashboardScreen').classList.add('hidden');$('loginScreen').classList.remove('hidden');
    $('password').value='';$('loginError').classList.add('hidden');
    closeSidebar();closeModal();
  }
  async function showDashboard(){
    $('loginScreen').classList.add('hidden');$('dashboardScreen').classList.remove('hidden');
    $('todayDate').textContent=weekdayDate.format(new Date());
    await changeView('overview');
  }
  async function handleLogin(event){
    event.preventDefault();
    const btn=$('loginButton'),username=$('username').value.trim(),password=$('password').value;
    if(!username||!password){$('loginError').textContent='لطفاً نام کاربری و رمز عبور را وارد کنید.';$('loginError').classList.remove('hidden');return;}
    btn.disabled=true;btn.querySelector('span').textContent='در حال بررسی...';$('loginError').classList.add('hidden');
    try{await api.login(username,password);await showDashboard();notify('با موفقیت وارد پنل مدیریت شدید.');}
    catch(err){$('loginError').textContent=err.message;$('loginError').classList.remove('hidden');}
    finally{btn.disabled=false;btn.querySelector('span').textContent='ورود به داشبورد';}
  }
  async function doLogout(){
    try{await api.logout();showLogin();notify('با موفقیت از حساب خارج شدید.');}
    catch(err){notify(err.message,'error');}
  }
  function openSidebar(){$('sidebar').classList.add('open');$('sidebarBackdrop').classList.add('active');lockUI(true);}
  function closeSidebar(){$('sidebar').classList.remove('open');$('sidebarBackdrop').classList.remove('active');lockUI(false);}
  async function changeView(view){
    if(!navMeta[view])return;
    state.view=view;
    document.querySelectorAll('[data-view]').forEach(b=>{const active=b.dataset.view===view;b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
    const [breadcrumb,title,subtitle,tableTitle]=navMeta[view];
    $('breadcrumbCurrent').textContent=breadcrumb;$('pageTitle').innerHTML=escapeHTML(title)+(view==='overview'?' <span class="wave">👋</span>':'');
    $('pageSubtitle').textContent=subtitle;$('tableTitle').textContent=tableTitle;
    $('tableSubtitle').textContent=view==='payments'?'وضعیت پرداخت و اطلاعات ثبت‌نام کاربران':'مشخصات، زمان عضویت و وضعیت پرداخت کاربران';
    $('overviewSection').classList.toggle('hidden',view!=='overview');
    $('reportsSection').classList.toggle('hidden',view!=='reports');
    $('usersSection').classList.remove('hidden');
    $('topExportCsv').classList.remove('hidden');
    if(view==='payments'&&state.status==='all'){$('statusFilter').value='all';}
    closeSidebar();
    if(view==='overview'){await Promise.all([loadStats(),loadChart()]);}
    await loadUsers();
  }
  async function loadStats(){
    try{
      const s=await api.stats();
      $('totalUsers').textContent=num(s.totalUsers);
      $('paidUsers').textContent=num(s.paidUsers);$('unpaidUsers').textContent=num(s.unpaidUsers);
      const rate=s.totalUsers?Math.round(100*s.paidUsers/s.totalUsers):0;
      $('paidRateLabel').textContent=num(rate)+'٪ کل کاربران';
      $('donutRate').textContent=num(rate)+'٪';$('paymentDonut').style.setProperty('--rate',rate+'%');
      $('legendPaid').textContent=num(s.paidUsers);$('legendUnpaid').textContent=num(s.unpaidUsers);
    }catch(err){notify('دریافت آمار: '+err.message,'error');}
  }
  async function loadChart(){
    try{
      const data=await api.visits(state.chartPeriod);
      $('periodVisits').textContent=num(data.total);$('periodGrowth').textContent=num(data.growth)+'٪';


      $('totalVisits').textContent = num(data.allTimeTotal);
$('visitsGrowth').textContent = num(data.growth) + '٪';


      const visits=data.items||[];if(!visits.length)return;
      const W=680,H=215,top=15,bottom=190,right=17,left=16;
      const max=Math.max(...visits.map(v=>v.visits),1);
      const ceiling=Math.ceil(max/50)*50;
      const step=(W-left-right)/Math.max(visits.length-1,1);
      const pts=visits.map((item,i)=>({x:W-right-i*step,y:bottom-(item.visits/ceiling)*(bottom-top)}));
      const path=pts.map((p,i)=>`${i?'L':'M'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
      const area=path+` L ${pts[pts.length-1].x.toFixed(1)} ${bottom} L ${pts[0].x.toFixed(1)} ${bottom} Z`;
      $('chartLine').setAttribute('d',path);$('chartArea').setAttribute('d',area);
      $('chartGrid').innerHTML=[0,.25,.5,.75,1].map(t=>`<line x1="${left}" y1="${top+(bottom-top)*t}" x2="${W-right}" y2="${top+(bottom-top)*t}" stroke="#edf0f7" stroke-width="1" stroke-dasharray="4 5"/>`).join('');
      $('chartYLabels').innerHTML=[1,.75,.5,.25,0].map(t=>`<span>${num(Math.round(ceiling*t))}</span>`).join('');
      $('chartDots').innerHTML=pts.filter((_,i)=>state.chartPeriod==='7d'||i%5===0||i===visits.length-1).map((p,i)=>`<circle cx="${p.x}" cy="${p.y}" r="3.7" fill="#fff" stroke="#6b5fea" stroke-width="2.3"/>`).join('');
      const labelPositions=state.chartPeriod==='7d'?[0,1,2,3,4,5,6]:[0,5,10,15,20,25,29];
      $('chartXLabels').innerHTML=labelPositions.filter(i=>visits[i]).map(i=>`<span>${escapeHTML(shortDay.format(new Date(visits[i].date)))}</span>`).join('');
    }catch(err){notify('دریافت نمودار: '+err.message,'error');}
  }
  async function loadUsers(){
    const requestSequence=++state.requestSequence;
    state.loading=true;
    $('usersTableBody').innerHTML='<tr><td colspan="6" class="loading-row">در حال دریافت اطلاعات کاربران...</td></tr>';
    try{
      const result=await api.users({page:state.page,limit:state.limit,search:state.search,status:state.status,dateRange:state.dateRange});
      if(requestSequence!==state.requestSequence)return;
      state.currentUsers=result.items;state.total=result.total;state.pages=result.pages;state.page=result.page;
      renderUsers();
    }catch(err){if(requestSequence===state.requestSequence){$('usersTableBody').innerHTML='<tr><td colspan="6" class="empty-row">دریافت اطلاعات ممکن نیست. اتصال سرور را بررسی کنید.</td></tr>';notify(err.message,'error');}}
    finally{if(requestSequence===state.requestSequence)state.loading=false;}
  }
  function renderUsers(){
    $('userCountBadge').textContent=num(state.total)+' کاربر';
    const rows=state.currentUsers.map(u=>{
      const name=escapeHTML(u.fullName),mobile=escapeHTML(u.mobile),id=escapeHTML(u.id);
      const first=name.slice(0,1),avatarColors=['#eff0ff','#e6f8f5','#fff1e9','#f2ebff','#eaf3ff'];
      const avatarText=['#7464da','#3ea78e','#de9862','#9c72d6','#609bd7'];
      const index=parseInt(u.id.replace(/\D/g,''),10)||0,c=index%5;
      return `<tr>
        <td data-label="کاربر"><div class="user-identity"><span class="user-avatar" style="background:${avatarColors[c]};color:${avatarText[c]}">${first}</span><span><strong>${name}</strong><small dir="ltr">${id}</small></span></div></td>
        <td data-label="شماره موبایل"><span class="mobile-number" dir="ltr">${mobile}</span></td>
        <td data-label="تاریخ ثبت‌نام"><span class="registration-time">${escapeHTML(dateStr(u.registeredAt))}<small>${escapeHTML(clock.format(new Date(u.registeredAt)))}</small></span></td>
        <td data-label="وضعیت پرداخت">${statusBadge(u.paymentStatus)}</td>
        <td data-label="مبلغ پرداخت"><span class="amount-cell">${u.amount?num(u.amount)+' <small>تومان</small>':'—'}</span></td>
        <td data-label="عملیات"><button class="details-button" data-user-id="${id}">مشاهده جزئیات</button></td>
      </tr>`;
    });
    $('usersTableBody').innerHTML=rows.length?rows.join(''):'<tr><td colspan="6" class="empty-row">کاربری مطابق فیلترهای انتخابی پیدا نشد.</td></tr>';
    const start=state.total?(state.page-1)*state.limit+1:0,end=Math.min(state.page*state.limit,state.total);
    $('paginationInfo').textContent=`نمایش ${num(start)} تا ${num(end)} از ${num(state.total)} کاربر`;
    renderPagination();
  }
  function renderPagination(){
    const p=state.page,total=state.pages;
    let pages=[];for(let i=Math.max(1,p-2);i<=Math.min(total,p+2);i++)pages.push(i);
    if(!pages.includes(1)&&total>0)pages.unshift(1);
    if(!pages.includes(total)&&total>1)pages.push(total);
    $('paginationControls').innerHTML=`<button class="page-btn" data-page="${p-1}" aria-label="صفحه قبل" ${p<=1?'disabled':''}><svg class="icon"><use href="#i-prev"/></svg></button>${pages.map(n=>`<button class="page-btn ${n===p?'active':''}" data-page="${n}" aria-label="صفحه ${num(n)}" ${n===p?'aria-current="page"':''}>${num(n)}</button>`).join('')}<button class="page-btn" data-page="${p+1}" aria-label="صفحه بعد" ${p>=total?'disabled':''}><svg class="icon"><use href="#i-next"/></svg></button>`;
  }
  async function openUserModal(id){
    try{
      const u=await api.userById(id);if(!u)throw new Error('کاربر موردنظر پیدا نشد.');
      state.activeUserId=id;
      $('modalTitle').textContent=u.fullName;
      const rows=[['شناسه کاربر',u.id],['نام و نام خانوادگی',u.fullName],['شماره موبایل',u.mobile],['تاریخ ثبت‌نام',dateTime(u.registeredAt)],['وضعیت پرداخت',statusText[u.paymentStatus]||'نامشخص'],['مبلغ پرداخت',fullAmount(u.amount)]];
      $('modalBody').innerHTML=rows.map(([label,value],i)=>`<div class="modal-info"><span>${escapeHTML(label)}</span><strong ${i===2?'dir="ltr"':''}>${escapeHTML(value)}</strong></div>`).join('');
      $('modalTogglePayment').textContent=u.paymentStatus==='paid'?'تغییر به پرداخت ناموفق':'تأیید پرداخت موفق';
      $('userModal').classList.remove('hidden');lockUI(true);
      $('modalClose').focus();
    }catch(err){notify(err.message,'error');}
  }
  function closeModal(){
    $('userModal').classList.add('hidden');state.activeUserId=null;
    if(!$('sidebar').classList.contains('open'))lockUI(false);
  }
  async function toggleUserPayment(){
    const id=state.activeUserId;if(!id)return;
    const u=await api.userById(id);if(!u)return;
    const next=u.paymentStatus==='paid'?'unpaid':'paid';
    if(!window.confirm(`آیا از تغییر وضعیت پرداخت «${u.fullName}» به «${statusText[next]}» مطمئن هستید؟`))return;
    const btn=$('modalTogglePayment');btn.disabled=true;
    try{
      await api.setPaymentStatus(id,next);closeModal();
      await Promise.all([loadUsers(),...(state.view==='overview'?[loadStats()]:[])]);
      notify('وضعیت پرداخت کاربر بروزرسانی شد.');
    }catch(err){notify(err.message,'error');}
    finally{btn.disabled=false;}
  }
  async function fetchAllFiltered(){
    const result=await api.users({page:1,limit:100000,search:state.search,status:state.status,dateRange:state.dateRange});
    return result.items||[];
  }
  const csvCell=(v)=>{
    const value=String(v??'');
    const safe=/^[=+@\-]/.test(value)?'\t'+value:value;
    return '"'+safe.replace(/"/g,'""')+'"';
  };
  function exportName(ext){
    const d=new Date(),stamp=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    return `site-users-${stamp}.${ext}`;
  }
  async function exportCsv(){
    try{
      const users=await fetchAllFiltered();if(!users.length){notify('کاربری برای خروجی وجود ندارد.','error');return;}
      const rows=[['شناسه','نام و نام خانوادگی','شماره موبایل','زمان ثبت نام','وضعیت پرداخت','مبلغ (تومان)'],...users.map(u=>[u.id,u.fullName,'\t'+u.mobile,dateTime(u.registeredAt),statusText[u.paymentStatus],u.amount])];
      const csv='\uFEFF'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n');
      const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));
      const link=document.createElement('a');link.href=url;link.download=exportName('csv');document.body.appendChild(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1500);notify(`فایل CSV شامل ${num(users.length)} کاربر آماده شد.`);
    }catch(err){notify('خطا در ساخت CSV: '+err.message,'error');}
  }
  async function exportPdf(){
    try{
      const users=await fetchAllFiltered();if(!users.length){notify('کاربری برای خروجی وجود ندارد.','error');return;}
      $('printArea').innerHTML=`<h1>گزارش کاربران سایت</h1><p>تاریخ گزارش: ${escapeHTML(dateTime(new Date().toISOString()))} | تعداد: ${num(users.length)} کاربر | برای ذخیره PDF گزینه «Save as PDF / ذخیره به‌صورت PDF» را در چاپ مرورگر انتخاب کنید.</p><table><thead><tr><th>ردیف</th><th>نام و نام خانوادگی</th><th>شماره موبایل</th><th>تاریخ ثبت‌نام</th><th>وضعیت پرداخت</th><th>مبلغ (تومان)</th></tr></thead><tbody>${users.map((u,i)=>`<tr><td>${num(i+1)}</td><td>${escapeHTML(u.fullName)}</td><td dir="ltr">${escapeHTML(u.mobile)}</td><td>${escapeHTML(dateTime(u.registeredAt))}</td><td>${escapeHTML(statusText[u.paymentStatus])}</td><td>${num(u.amount)}</td></tr>`).join('')}</tbody></table>`;
      notify('پنجره چاپ باز می‌شود؛ گزینه ذخیره به‌صورت PDF را انتخاب کنید.');
      window.print();
    }catch(err){notify('خطا در ساخت گزارش PDF: '+err.message,'error');}
  }
  function bindEvents(){
    $('loginForm').addEventListener('submit',handleLogin);
    $('passwordToggle').addEventListener('click',()=>{
      const p=$('password'),visible=p.type==='text';p.type=visible?'password':'text';
      $('passwordToggle').innerHTML=`<svg class="icon"><use href="#i-${visible?'eye':'eye-off'}"/></svg>`;
      $('passwordToggle').setAttribute('aria-label',visible?'نمایش رمز عبور':'پنهان کردن رمز عبور');
    });
    $('logoutButton').addEventListener('click',doLogout);
    $('mobileMenuButton').addEventListener('click',openSidebar);
    $('sidebarClose').addEventListener('click',closeSidebar);
    $('sidebarBackdrop').addEventListener('click',closeSidebar);
    document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>changeView(b.dataset.view)));
    $('refreshButton').addEventListener('click',async()=>{if(state.view==='overview')await Promise.all([loadStats(),loadChart()]);await loadUsers();notify('اطلاعات بروزرسانی شد.');});
    document.querySelectorAll('[data-chart-period]').forEach(b=>b.addEventListener('click',()=>{
      state.chartPeriod=b.dataset.chartPeriod;
      document.querySelectorAll('[data-chart-period]').forEach(t=>{const on=t===b;t.classList.toggle('active',on);t.setAttribute('aria-pressed',String(on));});
      loadChart();
    }));
    let timer;
    $('userSearch').addEventListener('input',e=>{clearTimeout(timer);timer=setTimeout(()=>{state.search=e.target.value.trim();state.page=1;loadUsers();},260);});
    $('statusFilter').addEventListener('change',e=>{state.status=e.target.value;state.page=1;loadUsers();});
    $('dateFilter').addEventListener('change',e=>{state.dateRange=e.target.value;state.page=1;loadUsers();});
    $('paginationControls').addEventListener('click',e=>{
      const b=e.target.closest('[data-page]');if(!b||b.disabled)return;
      const page=Number(b.dataset.page);if(page<1||page>state.pages||page===state.page)return;
      state.page=page;loadUsers();
    });
    $('usersTableBody').addEventListener('click',e=>{const b=e.target.closest('[data-user-id]');if(b)openUserModal(b.dataset.userId);});
    $('modalClose').addEventListener('click',closeModal);$('modalCancel').addEventListener('click',closeModal);$('modalBackdrop').addEventListener('click',closeModal);
    $('modalTogglePayment').addEventListener('click',toggleUserPayment);
    document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('userModal').classList.contains('hidden'))closeModal();else closeSidebar();}});
    ['topExportCsv','tableCsvButton','reportCsvButton'].forEach(id=>$(id).addEventListener('click',exportCsv));
    ['tablePdfButton','reportPdfButton'].forEach(id=>$(id).addEventListener('click',exportPdf));
    $('notificationButton').addEventListener('click',()=>notify('اعلان جدیدی وجود ندارد.'));
    $('dismissDemoBanner').addEventListener('click',()=>$('demoBanner').classList.add('hidden'));
  }
  async function init(){
    $('copyrightYear').textContent=new Date().getFullYear();$('footerYear').textContent=new Date().getFullYear();
    $('demoBanner').classList.toggle('hidden',!api.isDemo);
    if(!api.isDemo){$('loginModeHint').textContent='اتصال به سرویس احراز هویت فعال است.';$('sidebarModeText').textContent='حالت داده‌های واقعی';}
    bindEvents();
    try{const session=await api.me();if(session?.user)await showDashboard();else showLogin();}
    catch(err){showLogin();notify('خطا در دریافت اطلاعات: '+err.message,'error');}
  }
  init();
})();
