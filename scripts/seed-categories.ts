import { db, pool } from "@/db";
import { categories, type FormFieldDefinition } from "@/db/schema";
import { eq } from "drizzle-orm";

const defaultCategories = [
  // --- Request Categories ---
  {
    type: "request" as const,
    slug: "salary-certificate",
    name_ar: "طلب مفردات مرتب",
    description_ar: "استخراج شهادة رسمية بمفردات المرتب موجهة لجهة محددة",
    icon: "Banknote",
    display_order: 1,
    field_schema: [
      {
        id: "profession",
        label_ar: "المهنة / المسمى الوظيفي",
        type: "text",
        required: true,
        placeholder_ar: "مثال: محاسب، مهندس موقع، إداري",
        order: 1,
      },
      {
        id: "project_name",
        label_ar: "اسم المشروع / الإدارة",
        type: "text",
        required: true,
        placeholder_ar: "اسم الموقع أو الفرع الحالي",
        order: 2,
      },
      {
        id: "purpose",
        label_ar: "الغرض من الطلب",
        type: "textarea",
        required: true,
        placeholder_ar: "اذكر سبب طلب شهادة مفردات المرتب",
        order: 3,
      },
      {
        id: "bank_name",
        label_ar: "البنك أو الجهة الموجه إليها الطلب",
        type: "text",
        required: true,
        placeholder_ar: "مثال: البنك الأهلي المصري، بنك مصر، سفارة...",
        order: 4,
      },
    ] as FormFieldDefinition[],
  },
  {
    type: "request" as const,
    slug: "lost-atm-card",
    name_ar: "بدل فاقد فيزا",
    description_ar: "إعادة إصدار بطاقة المرتبات البنكية في حال الفقد أو التلف",
    icon: "CreditCard",
    display_order: 2,
    field_schema: [
      {
        id: "national_id",
        label_ar: "الرقم القومي (14 رقم)",
        type: "text",
        required: true,
        is_sensitive: true,
        placeholder_ar: "أدخل الـ 14 رقماً للبطاقة القومية",
        order: 1,
      },
      {
        id: "bank_name",
        label_ar: "اسم البنك الصادر منه البطاقة",
        type: "text",
        required: true,
        placeholder_ar: "مثال: بنك مصر، البنك التجاري الدولي CIB",
        order: 2,
      },
      {
        id: "national_id_card_image",
        label_ar: "صورة بطاقة الرقم القومي (سارية)",
        type: "image",
        required: true,
        description_ar: "صورة واضحة للوجه أو الوجهين للبطاقة",
        max_images: 2,
        order: 3,
      },
    ] as FormFieldDefinition[],
  },
  {
    type: "request" as const,
    slug: "special-missions",
    name_ar: "طلب المأموريات الخاصة الموجودة طرفنا",
    description_ar: "تقديم طلب رسمي بخصوص مأموريات العمل والمهام الخارجية",
    icon: "Briefcase",
    display_order: 3,
    field_schema: [
      {
        id: "notes",
        label_ar: "تفاصيل وبيانات المأمورية",
        type: "textarea",
        required: false,
        placeholder_ar: "أي تفاصيل أو ملاحظات إضافية تخص المأمورية",
        order: 1,
      },
    ] as FormFieldDefinition[],
  },
  {
    type: "request" as const,
    slug: "service-termination-memo",
    name_ar: "مذكرة إنهاءات الخدمة",
    description_ar: "متابعة إجراءات ومستحقات إنهاء الخدمة وإخلاء الطرف",
    icon: "FileSpreadsheet",
    display_order: 4,
    field_schema: [
      {
        id: "notes",
        label_ar: "ملاحظات وتفاصيل إضافية",
        type: "textarea",
        required: false,
        placeholder_ar: "اذكر تاريخ آخر يوم عمل أو أي بيانات خاصة بإنهاء الخدمة",
        order: 1,
      },
    ] as FormFieldDefinition[],
  },
  {
    type: "request" as const,
    slug: "unavailable-medicine-memo",
    name_ar: "مذكرة العلاج غير المتوفر",
    description_ar: "طلب صرف أو استرداد تكلفة أدوية غير متوفرة في التأمين الطبي",
    icon: "Pill",
    display_order: 5,
    field_schema: [
      {
        id: "medicine_name",
        label_ar: "اسم العلاج أو الدواء",
        type: "text",
        required: true,
        placeholder_ar: "اكتب الاسم التجاري أو العلمي للعلاج",
        order: 1,
      },
      {
        id: "medicine_amount",
        label_ar: "قيمة مبلغ العلاج غير المتوفر (بالجنيه المصري)",
        type: "currency",
        required: true,
        placeholder_ar: "المبلغ الإجمالي بالفاتورة",
        order: 2,
      },
      {
        id: "prescription_image",
        label_ar: "صورة الروشتة أو فاتورة الشراء",
        type: "image",
        required: false,
        description_ar: "صورة الروشتة الطبية أو إيصال الصيدلية",
        max_images: 3,
        order: 3,
      },
    ] as FormFieldDefinition[],
  },
  {
    type: "request" as const,
    slug: "marriage-grant",
    name_ar: "طلب منحة الزواج",
    description_ar: "صرف منحة الزواج المقررة وفقاً للوائح الشركة",
    icon: "HeartHandshake",
    display_order: 6,
    field_schema: [
      {
        id: "marriage_certificate_image",
        label_ar: "صورة قسيمة الزواج الرسمية",
        type: "image",
        required: true,
        description_ar: "صورة واضحة لقسيمة الزواج",
        max_images: 2,
        order: 1,
      },
      {
        id: "applicant_id_image",
        label_ar: "صورة بطاقة الرقم القومي لمقدم الطلب",
        type: "image",
        required: true,
        max_images: 1,
        order: 2,
      },
      {
        id: "daughter_id_image",
        label_ar: "صورة بطاقة الرقم القومي للابنة",
        type: "image",
        required: true,
        max_images: 1,
        order: 3,
      },
      {
        id: "daughter_single_declaration_image",
        label_ar: "صورة إقرار عدم زواج الابنة من قبل",
        type: "image",
        required: true,
        description_ar: "الإقرار المعتمد بعدم زواج الابنة مسبقاً",
        max_images: 1,
        order: 4,
      },
    ] as FormFieldDefinition[],
  },
  {
    type: "request" as const,
    slug: "salary-advance",
    name_ar: "طلب سلفة",
    description_ar: "طلب سلفة مالية من الراتب وفق الضوابط المعتمدة",
    icon: "Coins",
    display_order: 7,
    field_schema: [
      {
        id: "advance_amount",
        label_ar: "قيمة مبلغ السلفة المطلوب (جنيه مصري)",
        type: "currency",
        required: true,
        placeholder_ar: "أدخل المبلغ بالأرقام",
        order: 1,
      },
      {
        id: "applicant_id_image",
        label_ar: "صورة بطاقة الرقم القومي لمقدم الطلب",
        type: "image",
        required: true,
        max_images: 1,
        order: 2,
      },
      {
        id: "guarantor_id_image",
        label_ar: "صورة بطاقة الرقم القومي للضامن",
        type: "image",
        required: true,
        max_images: 1,
        order: 3,
      },
      {
        id: "reason",
        label_ar: "سبب طلب السلفة",
        type: "textarea",
        required: false,
        placeholder_ar: "اختياري: توضيح ظروف طلب السلفة",
        order: 4,
      },
    ] as FormFieldDefinition[],
  },
  {
    type: "request" as const,
    slug: "commodity-downpayment",
    name_ar: "مقدم لشراء سلعة",
    description_ar: "تمويل مقدم شراء سلعة بالتقسيط للعاملين",
    icon: "ShoppingCart",
    display_order: 8,
    field_schema: [
      {
        id: "commodity_name",
        label_ar: "اسم السلعة / المعرض أو الجهة البائعة",
        type: "text",
        required: true,
        placeholder_ar: "مثال: أجهزة كهربائية من معرض...",
        order: 1,
      },
      {
        id: "downpayment_amount",
        label_ar: "قيمة المبلغ المطلوب (جنيه مصري)",
        type: "currency",
        required: true,
        placeholder_ar: "أدخل قيمة المقدم المطلوب",
        order: 2,
      },
      {
        id: "applicant_id_image",
        label_ar: "صورة بطاقة الرقم القومي لمقدم الطلب",
        type: "image",
        required: true,
        max_images: 1,
        order: 3,
      },
      {
        id: "guarantor_id_image",
        label_ar: "صورة بطاقة الرقم القومي للضامن",
        type: "image",
        required: true,
        max_images: 1,
        order: 4,
      },
    ] as FormFieldDefinition[],
  },
  {
    type: "request" as const,
    slug: "social-status-statement",
    name_ar: "بيان حالة اجتماعية",
    description_ar: "استخراج إفادة أو بيان رسمي بالحالة الاجتماعية للموظف",
    icon: "Users",
    display_order: 9,
    field_schema: [
      {
        id: "notes",
        label_ar: "ملاحظات أو تفاصيل إضافية",
        type: "textarea",
        required: false,
        placeholder_ar: "أي بيانات ترغب في توضيحها للموارد البشرية",
        order: 1,
      },
    ] as FormFieldDefinition[],
  },

  // --- Complaint Categories ---
  {
    type: "complaint" as const,
    slug: "salary-increase",
    name_ar: "زيادة المرتب",
    description_ar: "تقديم تظلم أو شكوى بشأن مراجعة واستحقاق زيادة الراتب",
    icon: "TrendingUp",
    display_order: 1,
    field_schema: [
      {
        id: "profession",
        label_ar: "المهنة / المسمى الوظيفي",
        type: "text",
        required: true,
        placeholder_ar: "المسمى الوظيفي الحالي",
        order: 1,
      },
      {
        id: "complaint_details",
        label_ar: "تفاصيل ووصف الشكوى",
        type: "textarea",
        required: true,
        placeholder_ar: "اشرح موضوع الشكوى بالتفصيل والأسباب والمبررات",
        order: 2,
      },
      {
        id: "supporting_images",
        label_ar: "مستندات أو صور داعمة (اختياري)",
        type: "image",
        required: false,
        description_ar: "يمكن إرفاق صور لأي خطابات أو مستندات تؤيد الشكوى",
        max_images: 5,
        order: 3,
      },
    ] as FormFieldDefinition[],
  },
  {
    type: "complaint" as const,
    slug: "visa-issuance-delay",
    name_ar: "عدم صدور الفيزا",
    description_ar: "شكوى بخصوص تأخر استلام أو تفعيل بطاقة المرتبات البنكية",
    icon: "AlertCircle",
    display_order: 2,
    field_schema: [
      {
        id: "profession",
        label_ar: "المهنة / المسمى الوظيفي",
        type: "text",
        required: true,
        placeholder_ar: "المسمى الوظيفي الحالي",
        order: 1,
      },
      {
        id: "complaint_details",
        label_ar: "تفاصيل الشكوى والبنك المعني",
        type: "textarea",
        required: true,
        placeholder_ar: "اسم البنك وتاريخ تقديم طلب استخراج الفيزا سابقاً",
        order: 2,
      },
      {
        id: "supporting_images",
        label_ar: "صور داعمة (اختياري)",
        type: "image",
        required: false,
        max_images: 3,
        order: 3,
      },
    ] as FormFieldDefinition[],
  },
  {
    type: "complaint" as const,
    slug: "promotion",
    name_ar: "الترقية",
    description_ar: "تظلم أو طلب مراجعة استحقاق الترقية والمستوى الوظيفي",
    icon: "Award",
    display_order: 3,
    field_schema: [
      {
        id: "profession",
        label_ar: "المهنة / المسمى الوظيفي الحالي",
        type: "text",
        required: true,
        placeholder_ar: "المسمى الوظيفي الحالي",
        order: 1,
      },
      {
        id: "complaint_details",
        label_ar: "تفاصيل ومسوغات طلب الترقية",
        type: "textarea",
        required: true,
        placeholder_ar: "سنوات الخدمة، تقييمات الأداء، ومبررات استحقاق الترقية",
        order: 2,
      },
      {
        id: "supporting_images",
        label_ar: "شهادات أو مستندات داعمة (اختياري)",
        type: "image",
        required: false,
        max_images: 5,
        order: 3,
      },
    ] as FormFieldDefinition[],
  },
  {
    type: "complaint" as const,
    slug: "other-complaint",
    name_ar: "أخرى",
    description_ar: "أي شكوى أو تظلم آخر غير مدرج في الفئات السابقة",
    icon: "HelpCircle",
    display_order: 4,
    field_schema: [
      {
        id: "custom_subject",
        label_ar: "موضوع الشكوى",
        type: "text",
        required: true,
        placeholder_ar: "عنوان مختصر يوضح موضوع الشكوى",
        order: 1,
      },
      {
        id: "profession",
        label_ar: "المهنة / المسمى الوظيفي",
        type: "text",
        required: true,
        placeholder_ar: "المسمى الوظيفي الحالي",
        order: 2,
      },
      {
        id: "complaint_details",
        label_ar: "تفاصيل الشكوى كاملة",
        type: "textarea",
        required: true,
        placeholder_ar: "اكتب وصفاً مفصلاً للمشكلة والحل المقترح إن وجد",
        order: 3,
      },
      {
        id: "supporting_images",
        label_ar: "مستندات أو صور داعمة (اختياري)",
        type: "image",
        required: false,
        max_images: 5,
        order: 4,
      },
    ] as FormFieldDefinition[],
  },
];

async function seedCategories() {
  console.log("Seeding default categories...");
  try {
    for (const cat of defaultCategories) {
      const existing = await db
        .select()
        .from(categories)
        .where(eq(categories.slug, cat.slug))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(categories).values({
          type: cat.type,
          slug: cat.slug,
          name_ar: cat.name_ar,
          description_ar: cat.description_ar,
          icon: cat.icon,
          display_order: cat.display_order,
          field_schema: cat.field_schema,
          form_version: 1,
          is_active: true,
        });
        console.log(`+ Added category: ${cat.name_ar} (${cat.slug})`);
      } else {
        console.log(`• Category already exists: ${cat.name_ar} (${cat.slug})`);
      }
    }
    console.log("✅ All default categories verified!");
  } catch (error) {
    console.error("❌ Failed to seed categories:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedCategories();
