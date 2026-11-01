"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { FormFieldDefinition, FormFieldType } from "@/db/schema";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  Save,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Loader2,
  HelpCircle,
  Layers,
  Lock,
} from "lucide-react";

interface FormBuilderProps {
  initialData?: {
    id?: string;
    type: "request" | "complaint";
    slug: string;
    name_ar: string;
    description_ar?: string | null;
    icon?: string | null;
    is_active?: boolean;
    display_order?: number;
    field_schema: FormFieldDefinition[];
  };
  isNew?: boolean;
}

export function FormBuilder({ initialData, isNew = false }: FormBuilderProps) {
  const router = useRouter();

  const [type, setType] = useState<"request" | "complaint">(initialData?.type || "request");
  const [nameAr, setNameAr] = useState(initialData?.name_ar || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [descriptionAr, setDescriptionAr] = useState(initialData?.description_ar || "");
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true);
  const [displayOrder, setDisplayOrder] = useState(initialData?.display_order || 1);
  const [fields, setFields] = useState<FormFieldDefinition[]>(initialData?.field_schema || []);

  const [isPreview, setIsPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteCategory = async () => {
    if (!initialData?.id) return;
    setIsDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/categories/${initialData.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "فشل حذف الفئة");
      }

      router.push("/admin/categories");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء محاولة حذف الفئة");
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  // Add field
  const handleAddField = () => {
    const newFieldId = `field_${Date.now()}`;
    const newField: FormFieldDefinition = {
      id: newFieldId,
      label_ar: "حقل جديد",
      type: "text",
      required: false,
      placeholder_ar: "",
      order: fields.length + 1,
    };
    setFields([...fields, newField]);
  };

  // Remove field
  const handleRemoveField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  // Move field Up/Down
  const handleMoveField = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === fields.length - 1)
    ) {
      return;
    }
    const newFields = [...fields];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const temp = newFields[index];
    newFields[index] = newFields[targetIndex];
    newFields[targetIndex] = temp;
    setFields(newFields);
  };

  // Update field property
  const handleUpdateField = (index: number, updates: Partial<FormFieldDefinition>) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], ...updates };
    setFields(updated);
  };

  // Options builder for select field
  const handleAddOption = (fieldIndex: number) => {
    const currentOptions = fields[fieldIndex].options || [];
    const newOpt = { label: `خيار ${currentOptions.length + 1}`, value: `opt_${Date.now()}` };
    handleUpdateField(fieldIndex, { options: [...currentOptions, newOpt] });
  };

  const handleUpdateOption = (
    fieldIndex: number,
    optIndex: number,
    label: string,
    value: string
  ) => {
    const currentOptions = [...(fields[fieldIndex].options || [])];
    currentOptions[optIndex] = { label, value };
    handleUpdateField(fieldIndex, { options: currentOptions });
  };

  const handleRemoveOption = (fieldIndex: number, optIndex: number) => {
    const currentOptions = [...(fields[fieldIndex].options || [])];
    currentOptions.splice(optIndex, 1);
    handleUpdateField(fieldIndex, { options: currentOptions });
  };

  // Save Category
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const payload = {
        type,
        name_ar: nameAr.trim(),
        slug: slug.trim().toLowerCase(),
        description_ar: descriptionAr.trim() || undefined,
        is_active: isActive,
        display_order: Number(displayOrder),
        field_schema: fields.map((f, i) => ({ ...f, order: i + 1 })),
      };

      const url = isNew
        ? "/api/admin/categories"
        : `/api/admin/categories/${initialData?.id}`;
      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "فشل حفظ بيانات الفئة والنموذج");
      }

      router.push("/admin/categories");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء الحفظ");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            {isNew ? "إنشاء فئة ونموذج جديد" : `تعديل نموذج: ${nameAr}`}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            صمم الحقول المطلوبة وحدد أنواع البيانات والتحقق المطلوب للعاملين
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsPreview(!isPreview)}
            className="text-xs font-semibold"
          >
            <Eye className="w-3.5 h-3.5 ml-1" />
            {isPreview ? "إغلاق المعاينة" : "معاينة النموذج"}
          </Button>

          <Button
            onClick={handleSave}
            size="sm"
            isLoading={isSaving}
            className="text-xs font-bold"
          >
            <Save className="w-3.5 h-3.5 ml-1" />
            حفظ الفئة والنموذج
          </Button>

          {!isNew && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteModal(true)}
              className="text-xs font-bold text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
            >
              <Trash2 className="w-3.5 h-3.5 ml-1 text-rose-600" />
              حذف الفئة
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Preview Mode */}
      {isPreview ? (
        <Card className="border-blue-200 bg-white shadow-md p-6 space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-blue-900">معاينة نموذج الموظف</span>
              <h2 className="text-xl font-bold text-slate-900">{nameAr || "اسم الفئة"}</h2>
              <p className="text-xs text-slate-500">{descriptionAr}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPreview(false)}
              className="text-xs"
            >
              العودة للتعديل
            </Button>
          </div>

          <div className="space-y-4">
            {/* Mandatory Shared Fields (Always included and immutable) */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <span className="text-xs font-bold text-slate-700 block">
                حقول الموظف الأساسية (تُدرج تلقائياً ولا يمكن حذفها):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">
                    الرقم الثابت *
                  </label>
                  <Input disabled placeholder="مثال: 001234" />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">
                    الاسم بالكامل *
                  </label>
                  <Input disabled placeholder="الاسم ثلاثي" />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">
                    رقم الموبايل *
                  </label>
                  <Input disabled placeholder="01012345678" />
                </div>
              </div>
            </div>

            {/* Custom Fields Preview */}
            <div className="space-y-4 pt-2">
              <span className="text-xs font-bold text-slate-700 block">الحقول المخصصة:</span>
              {fields.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  لم تقم بإضافة أي حقول مخصصة بعد.
                </p>
              ) : (
                fields.map((f) => (
                  <div key={f.id} className="space-y-1 text-xs">
                    <label className="font-semibold text-slate-800">
                      {f.label_ar} {f.required && <span className="text-rose-600">*</span>}
                    </label>
                    {f.type === "textarea" ? (
                      <Textarea disabled placeholder={f.placeholder_ar} />
                    ) : f.type === "select" ? (
                      <select disabled className="w-full h-10 border rounded-xl px-3 bg-white">
                        <option>-- اختر --</option>
                        {f.options?.map((o) => (
                          <option key={o.value}>{o.label}</option>
                        ))}
                      </select>
                    ) : f.type === "image" ? (
                      <div className="border border-dashed border-slate-300 p-4 rounded-xl text-center text-slate-400">
                        مربع رفع صورة (بحد أقصى {f.max_images || 1} صور)
                      </div>
                    ) : (
                      <Input disabled placeholder={f.placeholder_ar} />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>
      ) : (
        /* Edit Mode */
        <div className="space-y-6">
          {/* Section 1: General Category Details */}
          <Card className="border-slate-200 bg-white shadow-xs p-6 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
              1. البيانات التعريفية للفئة
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">نوع المعاملة:</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  disabled={!isNew}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-blue-600"
                >
                  <option value="request">طلب</option>
                  <option value="complaint">شكوى أو تظلم</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  الاسم بالعربية: <span className="text-rose-600">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="مثال: طلب إجازة خاصة"
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  الاسم التعريفي باللاتينية (slug): <span className="text-rose-600">*</span>
                </label>
                <Input
                  type="text"
                  dir="ltr"
                  placeholder="special-leave"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  disabled={!isNew} // Keep slug stable after creation to protect links
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">الترتيب في القائمة:</label>
                <Input
                  type="number"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10) || 1)}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">الوصف المختصر:</label>
                <Textarea
                  placeholder="شرح بسيط يوضح للعاملين الغرض من هذا الطلب..."
                  value={descriptionAr}
                  onChange={(e) => setDescriptionAr(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="sm:col-span-2 flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="cat_active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-blue-900 rounded-sm border-slate-300"
                />
                <label htmlFor="cat_active" className="font-bold text-slate-800 cursor-pointer">
                  تفعيل الفئة وإتاحتها فوراً للعاملين في الموقع
                </label>
              </div>
            </div>
          </Card>

          {/* Section 2: Shared Fields Notice */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 flex items-center gap-3">
            <Lock className="w-5 h-5 text-blue-900 shrink-0" />
            <div>
              <p className="font-bold text-slate-800">الحقول الإلزامية المشتركة:</p>
              <p className="mt-0.5">
                تتضمن كل النماذج تلقائياً <strong>الرقم الثابت للموظف</strong>،{" "}
                <strong>الاسم بالكامل</strong>، و<strong>رقم الموبايل / واتساب</strong>. لا يمكن تعطيل
                أو حذف هذه الحقول لضمان تكامل بيانات التواصل.
              </p>
            </div>
          </div>

          {/* Section 3: Dynamic Custom Fields Builder */}
          <Card className="border-slate-200 bg-white shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  2. الحقول المخصصة للنموذج ({fields.length})
                </h3>
                <p className="text-[11px] text-slate-400">
                  أضف الحقول المخصصة ورتبها بحسب أولوية الظهور في النموذج
                </p>
              </div>

              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleAddField}
                className="text-xs font-bold"
              >
                <Plus className="w-3.5 h-3.5 ml-1" />
                إضافة حقل للنموذج
              </Button>
            </div>

            <div className="space-y-4">
              {fields.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 space-y-2">
                  <p>لا توجد حقول مخصصة حتى الآن في هذا النموذج.</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddField}
                    className="text-xs"
                  >
                    <Plus className="w-3.5 h-3.5 ml-1" />
                    إضافة أول حقل
                  </Button>
                </div>
              ) : (
                fields.map((field, idx) => (
                  <div
                    key={field.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3 relative group text-xs"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                      <span className="font-bold text-blue-900">حقل رقم {idx + 1}</span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMoveField(idx, "up")}
                          disabled={idx === 0}
                          className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                          title="تحريك لأعلى"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveField(idx, "down")}
                          disabled={idx === fields.length - 1}
                          className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                          title="تحريك لأسفل"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveField(idx)}
                          className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                          title="حذف الحقل"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          عنوان الحقل بالعربية: <span className="text-rose-600">*</span>
                        </label>
                        <Input
                          type="text"
                          value={field.label_ar}
                          onChange={(e) => handleUpdateField(idx, { label_ar: e.target.value })}
                          required
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">نوع الحقل:</label>
                        <select
                          value={field.type}
                          onChange={(e) =>
                            handleUpdateField(idx, { type: e.target.value as FormFieldType })
                          }
                          className="w-full h-11 px-3 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-blue-600"
                        >
                          <option value="text">نص قصير</option>
                          <option value="textarea">نص متعدد الأسطر</option>
                          <option value="number">رقم</option>
                          <option value="currency">مبلغ مالي بالجنيه المصري</option>
                          <option value="date">تاريخ</option>
                          <option value="select">قائمة منسدلة</option>
                          <option value="image">إرفاق صورة</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          رمز الحقل (ID برمجياً):
                        </label>
                        <Input
                          type="text"
                          dir="ltr"
                          value={field.id}
                          onChange={(e) => handleUpdateField(idx, { id: e.target.value })}
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block font-semibold text-slate-700 mb-1">
                          نص الإرشاد (Placeholder):
                        </label>
                        <Input
                          type="text"
                          value={field.placeholder_ar || ""}
                          onChange={(e) =>
                            handleUpdateField(idx, { placeholder_ar: e.target.value })
                          }
                        />
                      </div>

                      <div className="flex items-center gap-4 pt-4">
                        <label className="flex items-center gap-1.5 font-bold text-slate-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) =>
                              handleUpdateField(idx, { required: e.target.checked })
                            }
                            className="w-4 h-4 text-blue-900 rounded-sm border-slate-300"
                          />
                          <span>حقل إلزامي</span>
                        </label>

                        {field.type === "text" && (
                          <label className="flex items-center gap-1.5 font-bold text-blue-900 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(field.is_sensitive)}
                              onChange={(e) =>
                                handleUpdateField(idx, { is_sensitive: e.target.checked })
                              }
                              className="w-4 h-4 text-blue-900 rounded-sm border-slate-300"
                            />
                            <span>بيان حساس (مشفر)</span>
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Image Field Specific Options */}
                    {field.type === "image" && (
                      <div className="pt-2 border-t border-slate-200">
                        <label className="block font-semibold text-slate-700 mb-1">
                          الحد الأقصى لعدد الصور في هذا الحقل:
                        </label>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={field.max_images || 1}
                          onChange={(e) =>
                            handleUpdateField(idx, {
                              max_images: parseInt(e.target.value, 10) || 1,
                            })
                          }
                          className="w-32"
                        />
                      </div>
                    )}

                    {/* Select Dropdown Options Builder */}
                    {field.type === "select" && (
                      <div className="pt-2 border-t border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-700">خيارات القائمة المنسدلة:</span>
                          <button
                            type="button"
                            onClick={() => handleAddOption(idx)}
                            className="text-xs text-blue-900 hover:underline font-bold"
                          >
                            + إضافة خيار
                          </button>
                        </div>

                        {field.options?.map((opt, optIdx) => (
                          <div key={optIdx} className="flex gap-2">
                            <Input
                              type="text"
                              placeholder="اسم الخيار بالعربية"
                              value={opt.label}
                              onChange={(e) =>
                                handleUpdateOption(idx, optIdx, e.target.value, opt.value)
                              }
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(idx, optIdx)}
                              className="p-2 text-rose-500 hover:text-rose-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Delete Category Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 text-right">
          <Card className="max-w-md w-full bg-white shadow-2xl border-rose-200 animate-in fade-in zoom-in-95">
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-base font-bold text-rose-700 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-600" />
                <span>تأكيد حذف الفئة والنموذج نهائياً</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-xs text-rose-900 leading-relaxed">
                <p className="font-bold">
                  هل أنت متأكد من رغبتك في حذف فئة &ldquo;{nameAr}&rdquo;؟
                </p>
                <div className="text-[11px] text-rose-800 font-semibold flex items-start gap-1.5 pt-1">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>
                    تحذير: سيتم حذف هذا النموذج نهائياً ولن يظهر بعد الآن في بوابة العاملين. كما سيتم حذف كافة الطلبات المقدمة تحت هذه الفئة ومرفقاتها.
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isDeleting}
                  onClick={() => setShowDeleteModal(false)}
                  className="text-xs font-semibold"
                >
                  إلغاء
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isDeleting}
                  onClick={handleDeleteCategory}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 ml-1.5 animate-spin" />
                      <span>جاري الحذف...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5 ml-1.5" />
                      <span>تأكيد حذف الفئة</span>
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
