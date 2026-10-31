import { z } from "zod";

/**
 * Validates Egyptian mobile phone numbers:
 * Accepts formats: 01012345678, +201012345678, 00201012345678, 1012345678
 * Networks: 010 (Vodafone), 011 (Etisalat), 012 (Orange), 015 (WE)
 */
export const egyptianPhoneRegex = /^(?:\+20|0020|0)?1[0125][0-9]{8}$/;

/**
 * Validates Egyptian 14-digit National ID:
 * Starts with 2 (born 1900-1999) or 3 (born 2000-2099) followed by 13 digits.
 */
export const egyptianNationalIdRegex = /^[23][0-9]{13}$/;

export const commonEmployeeFieldsSchema = z.object({
  employee_number: z
    .string()
    .trim()
    .min(1, "الرقم الثابت مطلوب")
    .max(50, "الرقم الثابت طويل جداً"),
  employee_name: z
    .string()
    .trim()
    .min(3, "الاسم بالكامل يجب ألا يقل عن 3 أحرف")
    .max(150, "الاسم طويل جداً"),
  phone_number: z
    .string()
    .trim()
    .min(10, "رقم الموبايل غير صحيح")
    .regex(
      egyptianPhoneRegex,
      "يرجى إدخال رقم موبايل مصري صحيح (مثال: 01012345678 أو 01123456789)"
    ),
});

/**
 * Normalizes Egyptian phone number to standard format 01XXXXXXXXX
 */
export function normalizeEgyptianPhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.startsWith("201") && digits.length === 12) {
    return "0" + digits.slice(2);
  }
  if (digits.startsWith("00201") && digits.length === 14) {
    return "0" + digits.slice(4);
  }
  if (digits.startsWith("1") && digits.length === 10) {
    return "0" + digits;
  }
  return digits;
}

/**
 * Formats a currency amount in Egyptian Pounds (EGP) with Arabic locale.
 */
export function formatEGP(amount: number): string {
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formats a date using Africa/Cairo timezone and Arabic locale.
 */
export function formatCairoDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("ar-EG", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/**
 * Format bytes to readable Arabic file size string.
 */
export function formatBytesArabic(bytes: number): string {
  if (bytes === 0) return "0 بايت";
  const k = 1024;
  const sizes = ["بايت", "كيلوبايت", "ميجابايت", "جيجابايت"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Arabic status labels and badge colors.
 */
export const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending: {
    label: "في الانتظار",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
  },
  in_progress: {
    label: "قيد التنفيذ",
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
  },
  awaiting_employee: {
    label: "بانتظار استكمال بيانات",
    color: "text-purple-700",
    bg: "bg-purple-50 border-purple-200",
  },
  completed: {
    label: "مكتمل",
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
  },
  rejected: {
    label: "مرفوض",
    color: "text-rose-700",
    bg: "bg-rose-50 border-rose-200",
  },
};
