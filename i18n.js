const T = {
  dashboard:['Dashboard','لوحة التحكم'],projects:['Projects','المشاريع'],payments:['Payments','المدفوعات'],clients:['Teachers / Clients','المدرسون / العملاء'],
  top:['Top Clients','أفضل العملاء'],debts:['Outstanding / Debts','الديون / المستحقات'],expenses:['Expenses','المصروفات'],settings:['Settings','الإعدادات'],
  revenue:['Total Revenue','إجمالي الإيرادات'],outstanding:['Outstanding','المستحق لي'],profit:['Net Profit','صافي الربح'],active:['Active Projects','مشاريع جارية'],
  completed:['Completed Projects','مشاريع مكتملة'],overdue:['Overdue Projects','مشاريع متأخرة'],month:['This Month Revenue','دخل هذا الشهر'],
  name:['Name','الاسم'],clientId:['Client','العميل'],projectId:['Project','المشروع'],type:['Type','النوع'],price:['Price','السعر'],deadline:['Deadline','موعد التسليم'],
  status:['Status','الحالة'],priority:['Priority','الأولوية'],paid:['Paid','المدفوع'],remaining:['Remaining','المتبقي'],amount:['Amount','المبلغ'],date:['Date','التاريخ'],
  method:['Method','طريقة الدفع'],notes:['Notes','ملاحظات'],category:['Category','التصنيف'],phone:['Phone','الهاتف'],subject:['Subject','المادة'],total:['Total','الإجمالي'],count:['Projects','المشاريع'],
  New:['New','جديد'],Pending:['Pending','معلق'],'In Progress':['In Progress','قيد التنفيذ'],Review:['Review','مراجعة'],'Waiting for Client':['Waiting for Client','بانتظار العميل'],
  Completed:['Completed','مكتمل'],Cancelled:['Cancelled','ملغي'],Low:['Low','منخفضة'],Medium:['Medium','متوسطة'],High:['High','عالية'],Urgent:['Urgent','عاجلة'],
  OVERDUE:['OVERDUE','متأخر'],DUE:['Due Soon','يقترب'],OK:['On track','سليم'],SETTLED:['Settled','مسدد'],
  add:['Add','إضافة'],edit:['Edit','تعديل'],dup:['Duplicate','نسخ'],del:['Delete','حذف'],save:['Save','حفظ'],cancel:['Cancel','إلغاء'],
  empty:['Nothing here yet','لا توجد بيانات بعد'],sure:['Are you sure you want to delete this item?','هل أنت متأكد من حذف هذا العنصر؟'],
  whatsapp:['WhatsApp','واتساب'],facebook:['Facebook','فيسبوك'],email:['Email','البريد'],school:['School / Academy','المدرسة / الأكاديمية'],location:['Location','المكان'],
  rating:['Rating','التقييم'],tags:['Tags','الوسوم'],top:['Top Clients','أفضل العملاء'],rank:['#','الترتيب'],
  search:['Search…','بحث…'],quick:['＋ Quick Add','＋ إضافة سريعة'],currency:['Currency','العملة'],export:['Export Backup','تصدير نسخة احتياطية'],
  import:['Import Backup','استيراد نسخة احتياطية'],reset:['Reset Local UI','إعادة إعدادات الواجهة'],loadDemo:['Load Demo Data','تحميل بيانات تجريبية'],resetLocal:['Reset Local UI','إعادة إعدادات الواجهة'],saved:['Saved','تم الحفظ'],
  welcome:['Welcome to Designer OS','مرحبًا في Designer OS'],demoStart:['Start with Demo Data','ابدأ ببيانات تجريبية'],blank:['Start empty','ابدأ فارغًا'],
  needClient:['Add a client first.','أضف عميلًا أولًا.'],needProject:['Add a project first.','أضف مشروعًا أولًا.'],
  confirmReset:['Delete ALL cloud data?','حذف كل البيانات السحابية؟'],badFile:['Invalid backup file','ملف نسخة احتياطية غير صالح'],
  note:['Shared data is stored securely in Supabase. Theme/language are local to this browser.','البيانات المشتركة محفوظة في Supabase بشكل مركزي. المظهر واللغة محفوظان على هذا المتصفح فقط.'],
  chartKey:['Revenue (blue) vs Expenses (green), last 6 months','الإيرادات (أزرق) مقابل المصروفات (أخضر) آخر 6 أشهر'],upcoming:['Needs attention','يحتاج انتباهك'],
  login:['Sign in','تسجيل الدخول'],email:['Email','البريد الإلكتروني'],password:['Password','كلمة المرور'],signout:['Sign out','تسجيل الخروج'],
  loading:['Loading…','جاري التحميل…'],invalidLogin:['Invalid email or password.','البريد الإلكتروني أو كلمة المرور غير صحيحة.'],
  role:['Role','الصلاحية'],admin:['Admin','مدير'],designer:['Designer','مصمم'],employee:['Employee','موظف']
};
let lang=localStorage.getItem('ddm:lang')||'ar';
export const getLang=()=>lang;
export const setLang=l=>{lang=l;localStorage.setItem('ddm:lang',l);};
export const t=k=>(T[k]||[k,k])[lang==='ar'?1:0];