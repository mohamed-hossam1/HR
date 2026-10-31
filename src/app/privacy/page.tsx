import React from "react";
import { ShieldCheck, Lock, EyeOff, Server, HelpCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto py-6 space-y-8">
      <div className="border-b border-slate-200 pb-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>سياسة الخصوصية وحماية البيانات</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900">
          إشعار الخصوصية وسرية المعاملات
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          توضيح لكيفية التعامل مع بيانات ومستندات العاملين والإجراءات الأمنية المتبعة
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-blue-900 font-bold text-base">
              <Lock className="w-5 h-5" />
              <span>تشفير البيانات الحساسة</span>
            </div>
          </CardHeader>
          <CardContent className="text-xs text-slate-600 leading-relaxed space-y-2">
            <p>
              يتم تشفير البيانات ذات الطابع الحساس، مثل <strong>أرقام بطاقات الرقم القومي</strong>،
              تشفيرًا كاملًا على مستوى التطبيق باستخدام خوارزمية التشفير المتطورة (AES-256-GCM).
            </p>
            <p>
              لا يتم تخزين أرقام الهوية القومية كنصوص واضحة في قواعد البيانات أو في ملفات التصدير
              العادية، ولا يمكن فك تشفيرها إلا من قبل مدير الموارد البشرية المصرح له.
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-blue-900 font-bold text-base">
              <EyeOff className="w-5 h-5" />
              <span>أمان أكواد المتابعة</span>
            </div>
          </CardHeader>
          <CardContent className="text-xs text-slate-600 leading-relaxed space-y-2">
            <p>
              أكواد المتابعة السرية تُعامل ككلمات مرور ولا يتم تخزين النص الصريح لها في قاعدة
              البيانات مطلقًا.
            </p>
            <p>
              يتم حفظ ملخص مشفر (HMAC-SHA256) مع مفتاح سري على الخادم، مما يمنع إمكانية تخمين أو
              استرجاع الكود في حال حدوث أي تسريب خارجي.
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-blue-900 font-bold text-base">
              <Server className="w-5 h-5" />
              <span>حماية وتخزين المرفقات</span>
            </div>
          </CardHeader>
          <CardContent className="text-xs text-slate-600 leading-relaxed space-y-2">
            <p>
              يتم تخزين جميع الصور والمستندات في حاويات تخزين سحابية خاصة غير معلنة ولا يمكن الوصول
              إليها بروابط عامة.
            </p>
            <p>
              يتم إصدار روابط تحميل مؤقتة ومحددة الصلاحية (تنتهي خلال دقائق) خصيصًا لكل عملية استعراض
              أو تحميل بعد التأكد التام من صلاحية الجهاز أو المستخدم.
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-blue-900 font-bold text-base">
              <HelpCircle className="w-5 h-5" />
              <span>التحقق من الهوية الواقعية</span>
            </div>
          </CardHeader>
          <CardContent className="text-xs text-slate-600 leading-relaxed space-y-2">
            <p>
              تقديم الرقم الثابت ورقم الهاتف وكود المتابعة لا يُعد إثباتًا قانونيًا قاطعًا لهوية مقدم
              الطلب.
            </p>
            <p>
              تظل إدارة الموارد البشرية مسؤولة عن المطابقة والمراجعة اليدوية للهوية والتأكد من صحة
              البيانات قبل تسليم أو اعتماد أي مستندات سرية أو مالية خاصة بالعاملين.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-xs text-slate-600 leading-relaxed space-y-3">
        <h3 className="font-bold text-slate-800 text-sm">سياسة حفظ وتدوير البيانات:</h3>
        <p>
          يتم الاحتفاظ ببيانات وسجلات الطلبات والشكاوى طوال فترة خدمة الموظف أو طبقًا للمدد القانونية
          المحددة للوائح العمل الداخلية. يمكن للموظف إزالة ارتباط جهازه الحالي في أي وقت عبر زر "إزالة
          الطلبات المحفوظة من هذا الجهاز" المتاح في الصفحة الرئيسية وصفحة الاستعلام.
        </p>
      </div>
    </div>
  );
}
