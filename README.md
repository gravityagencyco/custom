# Designer Management Dashboard — Supabase Edition

نسخة خفيفة من Designer OS مبنية على Vanilla JavaScript + Vite + Supabase.

## ماذا تغير؟

- البيانات المشتركة لم تعد محفوظة في `localStorage`.
- Supabase PostgreSQL هو مصدر البيانات.
- Supabase Auth لتسجيل الدخول.
- أدوار: `admin`, `designer`, `employee`.
- Realtime للجداول الأساسية.
- LocalStorage للغة والمظهر فقط.
- GitHub Pages للنشر.
- لا يوجد `service_role` key داخل المتصفح.

## 1) إنشاء Supabase

1. أنشئ مشروعًا على Supabase.
2. افتح **SQL Editor**.
3. شغّل `supabase/schema.sql` كاملًا.
4. من Authentication أنشئ أول مستخدم بالبريد وكلمة المرور.
5. بعد إنشاء المستخدم، نفّذ في SQL Editor:

```sql
update public.profiles
set role = 'admin'
where email = 'YOUR_EMAIL_HERE';
```

لا تجعل المستخدم يحدد `role` بنفسه.

## 2) إعداد المشروع محليًا

انسخ `.env.example` إلى `.env`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

ثم:

```bash
npm install
npm run dev
```

افتح الرابط الذي يعطيه Vite.

## 3) المفاتيح

استخدم فقط **Publishable key** في الواجهة.

لا تضع:
- `service_role`
- secret keys
- database password

داخل `.env` الذي ترفعه إلى GitHub.

## 4) GitHub Pages

أضف Secrets في:

Repository → Settings → Secrets and variables → Actions

بالأسماء:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

ثم ارفع المشروع إلى فرع `main`.

الـ workflow سيبني `dist` وينشره.

إذا استخدمت GitHub Pages لأول مرة، اجعل مصدر Pages هو GitHub Actions/صفحة النشر التي ينشئها workflow حسب إعدادات مستودعك.

## 5) Real-time

تم تجهيز Realtime للجداول:

- clients
- projects
- payments
- expenses
- settings

عند تغيير البيانات من جهاز آخر، التطبيق يعيد تحميل البيانات تلقائيًا بدون Refresh.

## 6) الصلاحيات

### Admin
- كل العمليات.
- إعدادات العمل.
- تحميل Demo Data.
- Import/Reset.
- تعديل أدوار الحسابات من قاعدة البيانات.

### Designer
- إضافة/تعديل/حذف العملاء والمشاريع والمدفوعات والمصروفات.
- لا يستطيع تعديل الإعدادات أو Roles.

### Employee
- قراءة البيانات.
- لا توجد أزرار كتابة في الواجهة الحالية.

> يمكن لاحقًا إضافة صلاحيات أدق لكل مشروع أو مهمة.

## 7) ملاحظة مهمة

Supabase Auth يحتفظ بالجلسة محليًا في المتصفح، وهذا طبيعي. أما بيانات العمل نفسها فليست في localStorage.

## 8) اختبار جهازين

1. افتح الموقع على جهاز A وسجل الدخول.
2. افتحه على جهاز B وسجل الدخول بحساب آخر.
3. من A أضف Client أو Project.
4. انتظر لحظات على B.
5. ستظهر البيانات الجديدة تلقائيًا.

## الملفات

```text
designer-management-dashboard/
├── .github/workflows/deploy.yml
├── src/
│   ├── app.js
│   ├── store.js
│   ├── storage.js
│   ├── i18n.js
│   └── supabase.js
├── styles/main.css
├── supabase/schema.sql
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── vite.config.js
└── README.md
```
