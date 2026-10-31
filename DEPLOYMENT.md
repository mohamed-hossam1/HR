# دليل النشر على البنية التحتية المجانية (Free-Tier Deployment Guide)

دليل خطوة بخطوة لنشر منصة **بوابة خدمات العاملين** بالكامل على المنصات المجانية دون الحاجة لبطاقة ائتمانية.

---

## 📋 نظرة عامة على الخدمات المستهدفة

| الخدمة | الغرض | الباقة المجانية المتاحة |
|---|---|---|
| **Supabase** | قاعدة بيانات PostgreSQL مُدارة | 500 ميجابايت تخزين، اتصالات مجمعة Pooling |
| **Backblaze B2** | تخزين المرفقات والمستندات (S3) | 10 جيجابايت تخزين مجاني دائم |
| **Netlify** | استضافة الواجهة وخوادم Next.js | 100 جيجابايت نقل بيانات، 300 دقيقة بناء شهرياً |

---

## 1. إعداد قاعدة البيانات على Supabase Free

1. افتح حساباً جديداً على [Supabase](https://supabase.com).
2. أنشئ مشروعاً جديداً:
   - اختر اسماً للمشروع (مثال: `hr-services-db`).
   - أنشئ كلمة مرور قوية لقاعدة البيانات واحفظها.
   - اختر المنطقة الجغرافية الأقرب (مثال: `Central Europe / Frankfurt`).
3. توجه إلى **Project Settings -> Database**:
   - انسخ رابط الاتصال المعنون بـ **Transaction Pooler** (يستخدم المنفذ 6543 لتوفير الاتصالات في بيئات Serverless).
   - استبدل `[YOUR-PASSWORD]` بكلمة المرور التي أنشأتها.
   - هذا الرابط هو قيمة متغير `DATABASE_URL`.

---

## 2. إعداد التخزين السحابي على Backblaze B2

1. افتح حساباً مجانياً على [Backblaze](https://www.backblaze.com).
2. أنشئ حاوية تخزين جديدة (Bucket):
   - حدد اسماً فريداً (مثال: `hr-portal-docs-prod-01`).
   - اختر نوع الحاوية: **Private**.
3. توجه إلى **Bucket Settings -> CORS Rules**:
   - أضف الإعداد التالي (استبدل `your-domain.netlify.app` بنطاقك على Netlify):
```json
[
  {
    "corsRuleName": "AllowPortalUploads",
    "allowedOrigins": [
      "https://*.netlify.app",
      "https://your-custom-domain.com",
      "http://localhost:3000"
    ],
    "allowedOperations": ["s3_put", "s3_get", "s3_head"],
    "allowedHeaders": ["*"],
    "exposeHeaders": ["ETag"],
    "maxAgeSeconds": 3600
  }
]
```
4. توجه إلى **App Keys**:
   - أنشئ مفتاحاً جديداً (Application Key) وحدد صلاحيته على الحاوية المنشأة فقط.
   - انسخ `keyID` و `applicationKey`.

---

## 3. النشر على Netlify

1. اربط حسابك على [Netlify](https://www.netlify.com) بمستودع GitHub الخاص بالمشروع.
2. اضغط على **Add new site -> Import an existing project**.
3. اضبط إعدادات البناء:
   - **Framework:** Next.js
   - **Build Command:** `npm run build`
   - **Publish directory:** `.next`
4. أضف متغيرات البيئة في **Site Configuration -> Environment variables**:

| المتغير | القيمة المطلوبة |
|---|---|
| `DATABASE_URL` | رابط Transaction Pooler من Supabase |
| `BETTER_AUTH_SECRET` | سلسلة عشوائية بطول 32 حرفاً أو بايت hex |
| `BETTER_AUTH_URL` | رابط الموقع على Netlify (مثال: `https://your-site.netlify.app`) |
| `NEXT_PUBLIC_APP_URL` | نفس رابط الموقع على Netlify |
| `TRACKING_SECRET_PEPPER` | قيمة سرية قوية لتجزئة أكواد المتابعة |
| `SENSITIVE_DATA_ENCRYPTION_KEY` | مفتاح 64 حرف hex لتشفير الأرقام القومية بـ AES-256 |
| `B2_ENDPOINT` | رابط نقطة النهاية S3 من Backblaze |
| `B2_REGION` | كود المنطقة الجغرافية في Backblaze |
| `B2_BUCKET_NAME` | اسم الحاوية الخاصة |
| `B2_KEY_ID` | معرّف المفتاح |
| `B2_APPLICATION_KEY` | المفتاح السري للحاوية |
| `B2_SOFT_STORAGE_LIMIT_MB` | `8000` (سقف التخزين 8 جيجابايت لتفادي تجاوز الباقة المجانية) |

5. اضغط **Deploy Site**.

---

## 4. تهيئة قاعدة البيانات لأول مرة بعد النشر

من جهازك المحلي (مع ضبط `DATABASE_URL` برابط Supabase مؤقتاً في ملف `.env.local`):

1. **تطبيق جداول قاعدة البيانات:**
```bash
npm run db:push
```

2. **زراعة فئات الطلبات والشكاوى:**
```bash
npm run seed:categories
```

3. **إنشاء حساب المدير الإداري الأول:**
```bash
npm run seed:admin
```

الآن أصبح موقعك جاهزاً بالكامل لاستقبال طلبات الموظفين ومتابعتها!
