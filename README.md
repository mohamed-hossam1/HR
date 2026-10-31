# بوابة خدمات العاملين — Employee Services Portal

نظام متكامل، آمن، وعالي الأداء لتقديم وإدارة طلبات وشكاوى العاملين إلكترونيًا باللغة العربية، مصمم ليعمل بكفاءة عالية على البنية التحتية المجانية (Supabase Free PostgreSQL, Backblaze B2, Netlify Free).

---

## 🌟 نظرة عامة على النظام

يخدم النظام فئتين رئيسيتين:

1. **الموظف / مقدم المعاملة (بدون الحاجة لإنشاء حساب أو كلمة مرور):**
   - تقديم طلبات جديدة (مفردات مرتب، بدل فاقد فيزا، مذكرات العلاج، منح الزواج، السلف المالية...).
   - تقديم شكاوى وتظلمات رسمية (زيادة المرتب، تأخر الفيزا، الترقية...).
   - استعلام ومتابعة المعاملة بالرقم الثابت وكود المتابعة السري المشفر.
   - الوصول التلقائي للمعاملات السابقة من نفس الجهاز الموثوق عبر كوكي آمن (`es_device_token`).
   - استلام وتحميل المستندات والشهادات الرسمية الصادرة من الموارد البشرية بروابط مشفرة مؤقتة.
   - التواصل والمراسلة مع إدارة الموارد البشرية وإرفاق مستندات إضافية.
   - إمكانية إزالة المعاملات المحفوظة من الجهاز في أي وقت بضغطة زر.

2. **مدير الموارد البشرية (HR Manager):**
   - لوحة إحصائيات متقدمة تعتمد على تجميعات SQL فورية ورسوم بيانية (Recharts).
   - إدارة وفرز وبحث الطلبات والشكاوى مع دعم تصفية الحالات ومؤشرات المعاملات غير المقروءة.
   - منشئ نماذج ديناميكي (Form Builder) يتيح إضافة وتعديل وترتيب حقول النماذج دون كتابة سطر كود واحد.
   - حماية تاريخية للمشاركات السابقة بحفظ نسخة مجمدة (Snapshot) من هيكل النموذج وقت التقديم.
   - فك تشفير البيانات الحساسة (مثل بطاقات الرقم القومي) المشفرة بـ AES-256-GCM.
   - إصدار ورفع مستندات الرد الرسمية (PDF, Word, Excel, صور حتى 5 ميجابايت).
   - تدوين ملاحظات داخلية سرية بملف المعاملة لا يراها الموظف.
   - تأشيرة تحقق يدوي من هوية الموظف قبل تسليم المستندات.
   - تصدير تقارير إكسل حقيقية (.xlsx) مع حماية ضد هجمات Formula Injection وتنسيق أرقام الهواتف والأرقام الثابتة كنصوص.
   - مراقبة السعة التخزينية وسقف الاستهلاك المجاني لـ Backblaze B2.

---

## 🛠️ البنية التقنية (Technology Stack)

- **Frontend & Fullstack:** Next.js (App Router) + TypeScript Strict Mode + React 19 + Tailwind CSS + Lucide Icons.
- **UI & RTL:** تصميم عربي أصيل يدعم اتجاه اليمين لليسار (`dir="rtl"`) مع خط Cairo الرسمي.
- **Database:** PostgreSQL عبر Drizzle ORM + Drizzle Kit للمهاجرات + `pg` connection pool.
- **Authentication:** Better Auth بحساب المدير الإداري مع جلسات مشفرة وتعطيل التسجيل العام.
- **Object Storage:** Backblaze B2 (S3-Compatible API) مع معمارية قابلة للاستبدال (`StorageProvider`)، ودعم الرفع المباشر عبر Presigned PUT، ومزود محلي تلقائي لبيئة التطوير.
- **Image Optimization:** ضغط ومعالجة الصور في المتصفح قبل الرفع عبر HTML5 Canvas للحفاظ على وضوح المستندات وتوفير مساحة التخزين.
- **Reporting:** ExcelJS لتوليد ملفات `.xlsx` حقيقية.
- **Testing:** Vitest لاختبارات الوحدات والتكامل.

---

## 🚀 التشغيل المحلي السريع (Local Development)

### 1. المتطلبات الأساسية
- Node.js (v20 أو أحدث)
- npm أو pnpm
- خادم PostgreSQL (محلي أو حاوية Docker أو مشروع Supabase مجاني)

### 2. تثبيت الحزم
```bash
npm install
```

### 3. إعداد متغيرات البيئة
انسخ ملف `.env.example` إلى `.env.local`:
```bash
cp .env.example .env.local
```

### 4. تطبيق مهاجرات قاعدة البيانات
```bash
npm run db:push
```

### 5. تهيئة الفئات الافتراضية
قم بزراعة فئات الطلبات والشكاوى الافتراضية (13 فئة معدة مسبقاً):
```bash
npm run seed:categories
```

### 6. إنشاء حساب مدير الموارد البشرية الأول
```bash
npm run seed:admin
```
بيانات الدخول الافتراضية المحددة:
- **البريد الإلكتروني:** `admin@portal.local`
- **كلمة المرور:** `AdminStrongPass2026!`

### 7. تشغيل خادم التطوير
```bash
npm run dev
```
افتح المتصفح على: `http://localhost:3000`

---

## 🗄️ إعداد Supabase Free PostgreSQL

1. افتح حساب مجاني على [Supabase](https://supabase.com).
2. أنشئ مشروعاً جديداً واختر المنطقة الأقرب (مثال: Frankfurt أو London).
3. انتقل إلى **Project Settings -> Database -> Connection string**.
4. اختر تبويب **URI** ونوع الاتصال **Transaction Pooler** (المنفذ 6543).
5. ضع الرابط في متغير `DATABASE_URL` في ملف `.env.local` أو في إعدادات النشر على Netlify.
6. شغل `npm run db:push` لإنشاء الجداول مباشرة.

*ملاحظة: مشاريع Supabase المجانية تدخل في وضع السكون (pause) بعد فترة خمول طويلة. لاستئناف المشروع، يكفي الدخول إلى لوحة تحكم Supabase والضغط على Resume.*

---

## ☁️ إعداد Backblaze B2 للتخزين السحابي

يوفر Backblaze B2 سعة 10 جيجابايت مجانية دائمة مع واجهة متوافقة تماماً مع بروتوكول S3:

1. افتح حساب مجاني على [Backblaze](https://www.backblaze.com/b2/cloud-storage.html).
2. انتقل إلى **Buckets** وأنشئ حاوية جديدة:
   - **Bucket Name:** اسم فريد (مثال: `hr-portal-docs-unique`).
   - **Files in Bucket are:** اختر **Private**.
3. انتقل إلى **Bucket Settings -> CORS Rules** واضبط القواعد للسماح برفع الملفات مباشرة من المتصفح:
```json
[
  {
    "corsRuleName": "AllowDirectUploads",
    "allowedOrigins": ["https://your-domain.netlify.app", "http://localhost:3000"],
    "allowedOperations": ["s3_put", "s3_get", "s3_head"],
    "allowedHeaders": ["*"],
    "exposeHeaders": ["ETag"],
    "maxAgeSeconds": 3600
  }
]
```
4. انتقل إلى **Application Keys** وأنشئ مفتاحاً مخصصاً للحاوية:
   - احفظ **keyID** و **applicationKey**.
5. ضع القيم في `.env`:
   - `B2_ENDPOINT`: رابط S3 endpoint الخاص بالحاوية (مثال: `https://s3.us-east-005.backblazeb2.com`).
   - `B2_REGION`: كود المنطقة (مثال: `us-east-005`).
   - `B2_BUCKET_NAME`: اسم الحاوية.
   - `B2_KEY_ID`: معرّف المفتاح.
   - `B2_APPLICATION_KEY`: المفتاح السري.

*ملاحظة هامة: في حال عدم إدخال مفاتيح B2 أثناء التطوير المحلي، يعمل التطبيق تلقائياً عبر مزود التخزين المحلي (Local Storage Provider) في المجلد `.uploads/` مع توليد روابط تحميل وتصاريح رفع آمنة وموقعة برمجياً.*

---

## 🌐 النشر على Netlify Free

1. اربط مستودع GitHub بحسابك على [Netlify](https://www.netlify.com).
2. إعدادات البناء (Build Settings):
   - **Build Command:** `npm run build`
   - **Publish directory:** `.next`
3. أضف متغيرات البيئة في **Site configuration -> Environment variables**:
   - `DATABASE_URL`
   - `BETTER_AUTH_SECRET`
   - `BETTER_AUTH_URL` (مثال: `https://your-site.netlify.app`)
   - `NEXT_PUBLIC_APP_URL` (مثال: `https://your-site.netlify.app`)
   - `TRACKING_SECRET_PEPPER`
   - `SENSITIVE_DATA_ENCRYPTION_KEY`
   - `B2_ENDPOINT`, `B2_REGION`, `B2_BUCKET_NAME`, `B2_KEY_ID`, `B2_APPLICATION_KEY`
4. اضغط **Deploy Site**.

---

## 🧪 الاختبارات الآلية (Testing)

تم بناء جناح اختبارات متكامل يغطي الوظائف الحيوية:
- توليد وتأكيد أكواد المتابعة المشفرة مع Pepper واختبار المقارنة الثابتة زمنياً (Constant-time).
- التشفير المتماثل وفك التشفير للبيانات الحساسة (AES-256-GCM).
- الحفاظ على الأصفار على يسار الرقم الثابت.
- معمارية التخزين وسقف الاستهلاك التقديري.
- معالجة طلبات الموظفين والربط بالأجهزة الموثوقة.

لتشغيل الاختبارات:
```bash
npm test
```

للتحقق من سلامة الأنماط والأنواع:
```bash
npx tsc --noEmit
```
