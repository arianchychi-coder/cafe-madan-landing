/* رابط داده‌ها مستقل از UI است؛ در نسخه فعلی فقط حالت نمایشی فعال است. */
(function () {
  'use strict';
  const CFG=window.APP_CONFIG, DEMO=CFG.mode==='demo';
  const STORAGE_KEY='control_demo_users_v1';
  const SESSION_KEY='control_demo_session_v1';
  const seeded=window.DEMO_SEED;
  const delay=()=>new Promise(resolve=>setTimeout(resolve,125));
  const normalized=s=>String(s??'').toLowerCase().replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/[۰-۹]/g,c=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).replace(/[٠-٩]/g,c=>'٠١٢٣٤٥٦٧٨٩'.indexOf(c)).trim();
  const readUsers=()=>{
    try {const v=JSON.parse(localStorage.getItem(STORAGE_KEY));if(Array.isArray(v)&&v.length)return v;} catch(_){}
    return seeded.users.map(u=>({...u}));
  };
  const writeUsers=users=>localStorage.setItem(STORAGE_KEY,JSON.stringify(users));
  async function request(route,options={}) {
     const r = await fetch(route,{
      credentials:'same-origin',
      headers:{'Content-Type':'application/json',...(options.headers||{})},
      ...options
    });
    let data=null;
    try {data=await r.json();} catch(_) {}
    if(!r.ok)throw new Error(data?.error||`خطای ارتباط با سرور (${r.status})`);
    return data;
  }
  function matchesDate(iso,range) {
    if(!range||range==='all')return true;
    const age=Date.now()-new Date(iso).getTime();
    if(range==='today') {
      const a=new Date(iso),b=new Date();
      return a.toLocaleDateString('en-CA',{timeZone:CFG.timezone})===b.toLocaleDateString('en-CA',{timeZone:CFG.timezone});
    }
    return age>=0&&age<=(range==='7d'?7:30)*86400000;
  }
  function filterUsers(all,{search='',status='all',dateRange='all'}={}) {
    const q=normalized(search);
    return all.filter(u=>{
      const matchSearch=!q||normalized(u.fullName).includes(q)||normalized(u.mobile).includes(q)||normalized(u.id).includes(q);
      return matchSearch&&(status==='all'||u.paymentStatus===status)&&matchesDate(u.registeredAt,dateRange);
    }).sort((a,b)=>new Date(b.registeredAt)-new Date(a.registeredAt));
  }
  async function login(username,password){
    if(!DEMO)return request('/auth/login',{method:'POST',body:JSON.stringify({username,password})});
    await delay();
    if(username==='admin'&&password==='admin1234'){
      sessionStorage.setItem(SESSION_KEY,'demo-only-session');
      return {user:{username:'admin',role:'admin'},demo:true};
    }
    throw new Error('نام کاربری یا رمز عبور صحیح نیست.');
  }
  async function me(){
    if(!DEMO){try{return await request('/auth/me');}catch(err){if(/ورود لازم است|نشست شما معتبر نیست/.test(err.message))return null;throw err;}}
    return sessionStorage.getItem(SESSION_KEY)==='demo-only-session'?{user:{username:'admin',role:'admin'}}:null;
  }
  async function logout(){
    if(!DEMO)return request('/auth/logout',{method:'POST',body:'{}'});
    sessionStorage.removeItem(SESSION_KEY);
    return {ok:true};
  }
  async function stats() {
    return request('/dashboard/stats');
}
 async function visits(period = '7d') {
    return request(
        '/analytics/visits?period=' + encodeURIComponent(period)
    );
}
  async function users({
  page = 1,
  limit = 8,
  search = '',
  status = 'all',
  dateRange = 'all'
} = {}) {

  const data = await request('/admin');

  const records = Array.isArray(data) ? data : [];

  let filtered = records.map(u => ({
    id: u.id || u._id,
    fullName: u.name || '',
    mobile: u.phone || '',
    registeredAt: u.createdAt || null,
    paymentStatus: u.paymentStatus || 'pending',
    amount: u.amount || 0
  }));

  const q = normalized(search);

  filtered = filtered.filter(u => {
    const matchSearch =
      !q ||
      normalized(u.fullName).includes(q) ||
      normalized(u.mobile).includes(q) ||
      normalized(u.id).includes(q);

    return matchSearch;
  });

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.min(page, pages);

  return {
    items: filtered.slice(
      (currentPage - 1) * limit,
      currentPage * limit
    ),
    total,
    page: currentPage,
    pages
  };
}
  async function userById(id){
    if(!DEMO)return request('/users/'+encodeURIComponent(id));
    return readUsers().find(u=>u.id===id)||null;
  }
  async function setPaymentStatus(id,paymentStatus){
    if(!['paid','unpaid','pending'].includes(paymentStatus))throw new Error('وضعیت نامعتبر است.');
    if(!DEMO)return request('/users/'+encodeURIComponent(id)+'/payment',{method:'PATCH',body:JSON.stringify({paymentStatus})});
    const all=readUsers(),item=all.find(u=>u.id===id);
    if(!item)throw new Error('کاربر پیدا نشد.');
    item.paymentStatus=paymentStatus;
    if(paymentStatus!=='paid')item.amount=0;
    else if(!item.amount)item.amount=1690000;
    writeUsers(all);await delay();return {user:item};
  }
  window.AdminAPI={login,me,logout,stats,visits,users,userById,setPaymentStatus,filterUsers,isDemo:DEMO};
})();
