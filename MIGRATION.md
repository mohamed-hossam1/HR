# دليل ترحيل قاعدة البيانات والتخزين (Migration Guide)

صُممت المنصة وفق معمارية مجردة (Portability Architecture) تضمن سهولة نقل النظام بعيداً عن Supabase أو Backblaze B2 دون الحاجة لإعادة كتابة منطق العمل.

---

## 1. ترحيل قاعدة البيانات من Supabase إلى أي مزود PostgreSQL آخر

يعتمد التطبيق بالكامل على **Drizzle ORM** وسائق الاتصال المعياري `pg`، ولا يستخدم أي دوال أو إضافات خاصة بـ Supabase (لا يعتمد على Supabase Auth أو Edge Functions أو Supabase Storage).

### خطوات النقل:

1. **أخذ نسخة احتياطية من قاعدة البيانات الحالية:**
```bash
pg_dump -h db.your-supabase-ref.supabase.co -U postgres -d postgres -F c -b -v -f hr_portal_backup.dump
```

2. **استعادة النسخة على خادم PostgreSQL الجديد (مثال: Neon, AWS RDS, DigitalOcean, أو سيرفر محلي):**
```bash
pg_restore -h new-postgres-host.com -U new_user -d new_db -v hr_portal_backup.dump
```

3. **تحديث متغير الاتصال:**
عدّل قيمة المتغير `DATABASE_URL` في ملف `.env.local` أو في إعدادات الاستضافة:
```env
DATABASE_URL=postgresql://new_user:new_password@new-postgres-host.com:5432/new_db
```

4. **تطبيق أي مهاجرات جديدة مستقبلاً:**
```bash
npm run db:push
```

---

## 2. ترحيل التخزين من Backblaze B2 إلى أي مزود متوافق مع S3

تعتمد المنصة على واجهة التخزين الموحدة `IStorageProvider` واستدعاءات بروتوكول S3 عبر حزمة `@aws-sdk/client-s3`.

يمكن ترحيل الملفات إلى:
- **Cloudflare R2** (بدون رسوم نقل بيانات Egress)
- **Amazon S3**
- **Wasabi Hot Cloud Storage**
- **MinIO** (تخزين محلي ذاتي الاستضافة)

### خطوات النقل:

1. **مزامنة الملفات والمجلدات عبر أداة `rclone` أو AWS CLI:**
```bash
# باستخدام أدوات مزامنة S3
rclone sync b2:your-b2-bucket r2:your-new-r2-bucket
```

2. **الحفاظ على مسارات المفاتيح:**
جميع سجلات المرفقات في قاعدة البيانات تحفظ مسار المفتاح الداخلي النسبي فقط:
(مثال: `cases/2026/10/uuid-filename.jpg`).
بمجرد نقل الملفات مع الحفاظ على نفس بنية المجلدات، ستعمل جميع الروابط الحالية بدون أي تعديل في قاعدة البيانات.

3. **تحديث متغيرات التخزين:**
في ملف المتغيرات `.env`:
```env
# مثال للنقل إلى Cloudflare R2:
B2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
B2_REGION=auto
B2_BUCKET_NAME=your-new-r2-bucket
B2_KEY_ID=your_r2_access_key_id
B2_APPLICATION_KEY=your_r2_secret_access_key
```

4. **ضبط قواعد CORS في المزود الجديد:**
تأكد من تفعيل عمليات `PUT`, `GET`, `HEAD` لمصدر موقعك لتشغيل الرفع والتحميل المباشر.
