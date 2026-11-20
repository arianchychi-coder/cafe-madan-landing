/* Sample-only, entirely fictional registration and traffic data. */
(function (root) {
  const records = [
    ['آرمان رضایی','09120000031','paid',2450000,.02],
    ['سارا محمدی','09350000042','paid',1690000,.14],
    ['محمد امینی','09190000053','pending',0,.32],
    ['نگار احمدی','09120000064','unpaid',0,.8],
    ['امیرحسین کریمی','09900000075','paid',1890000,1.2],
    ['فاطمه حسینی','09130000086','paid',2450000,1.8],
    ['علی اکبری','09360000097','unpaid',0,2.3],
    ['مریم شریفی','09100000108','paid',1290000,3.1],
    ['پارسا مرادی','09210000119','pending',0,4.2],
    ['الهام کریمی','09380000120','paid',2450000,5.5],
    ['رضا قاسمی','09120000131','paid',1890000,6.2],
    ['مهسا جعفری','09910000142','unpaid',0,8.1],
    ['محمدرضا نوری','09140000153','paid',2190000,9.4],
    ['زهرا موسوی','09300000164','paid',1690000,11.2],
    ['سامان کاظمی','09130000175','pending',0,13.4],
    ['نسترن توکلی','09150000186','unpaid',0,15.1],
    ['حسین صالحی','09350000197','paid',1890000,17.9],
    ['پرنیا رستمی','09220000208','paid',2450000,19.5],
    ['کیان یوسفی','09120000219','unpaid',0,22.3],
    ['حانیه رحیمی','09370000220','paid',1290000,24.8],
    ['آریا حیدری','09190000231','paid',2190000,27.2],
    ['سمیرا عباسی','09900000242','pending',0,29.1],
    ['محمد افشار','09120000253','paid',1690000,32.8],
    ['هستی زمانی','09360000264','unpaid',0,35.2],
    ['محسن ملک‌زاده','09140000275','paid',1890000,39.6],
    ['رعنا فتحی','09100000286','paid',2190000,43.2],
    ['دانیال رحمانی','09210000297','pending',0,49.7],
    ['شقایق رسولی','09350000308','paid',2450000,54.3]
  ];
  const now = Date.now();
  const users = records.map((r,i)=>({
    id: `USR-${String(i+1001)}`,
    fullName:r[0], mobile:r[1], paymentStatus:r[2],
    amount:r[3], registeredAt:new Date(now-r[4]*86400000).toISOString()
  }));
  const dailyVisits = Array.from({length:30},(_,i)=>{
    const date = new Date(now - (29-i)*86400000);
    const base = 105+Math.floor(i*.82)+Math.round(Math.sin(i*1.73)*25)+((i*37)%31);
    return {date: date.toISOString(), visits:Math.max(48,base)};
  });
  const sample = {users,dailyVisits,totalVisits:12840,visitsGrowth:12.8};
  if(typeof window!=='undefined')window.DEMO_SEED=sample;
  if(typeof module!=='undefined'&&module.exports)module.exports=sample;
})(typeof globalThis!=='undefined'?globalThis:this);



