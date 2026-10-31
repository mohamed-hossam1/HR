import { FormFieldDefinition } from "@/db/schema";
import { egyptianNationalIdRegex } from "./validation";

export interface DynamicFormValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  cleanAnswers: Record<string, unknown>;
  sensitiveFields: Record<string, string>; // fieldId -> plaintext value (to be encrypted)
  attachmentStorageKeys: string[];
}

/**
 * Validates dynamic form submissions based on category field schema.
 * Enforces the strict 10-image maximum across the entire submission.
 */
export function validateDynamicFormAnswers(
  fields: FormFieldDefinition[],
  rawAnswers: Record<string, unknown>,
  uploadedAttachments: Array<{ fieldId: string; storageKey: string; filename: string }>
): DynamicFormValidationResult {
  const errors: Record<string, string> = {};
  const cleanAnswers: Record<string, unknown> = {};
  const sensitiveFields: Record<string, string> = {};
  const attachmentStorageKeys: string[] = [];

  // 1. Enforce overall 10-image limit
  if (uploadedAttachments.length > 10) {
    errors["_global"] = "الحد الأقصى للصور المرفقة في الطلب الواحد هو 10 صور فقط.";
  }

  // 2. Validate individual fields
  for (const field of fields) {
    const value = rawAnswers[field.id];

    if (field.type === "image") {
      const fieldAttachments = uploadedAttachments.filter((a) => a.fieldId === field.id);
      if (field.required && fieldAttachments.length === 0) {
        errors[field.id] = `حقل "${field.label_ar}" مطلوب. يرجى إرفاق الصورة المطلوبة.`;
      }
      if (field.max_images && fieldAttachments.length > field.max_images) {
        errors[field.id] = `لا يمكن إرفاق أكثر من ${field.max_images} صور في حقل "${field.label_ar}".`;
      }
      fieldAttachments.forEach((a) => attachmentStorageKeys.push(a.storageKey));
      cleanAnswers[field.id] = fieldAttachments.map((a) => ({
        storageKey: a.storageKey,
        filename: a.filename,
      }));
      continue;
    }

    // Required check for text/select/etc.
    const isValueEmpty =
      value === undefined ||
      value === null ||
      (typeof value === "string" && value.trim() === "");

    if (field.required && isValueEmpty) {
      errors[field.id] = `حقل "${field.label_ar}" مطلوب`;
      continue;
    }

    if (isValueEmpty) {
      cleanAnswers[field.id] = null;
      continue;
    }

    // Specific type checks
    if (field.type === "number" || field.type === "currency") {
      const num = Number(value);
      if (isNaN(num)) {
        errors[field.id] = `يجب إدخال قيمة رقمية صحيحة في "${field.label_ar}"`;
      } else if (field.min_value !== undefined && num < field.min_value) {
        errors[field.id] = `القيمة يجب ألا تقل عن ${field.min_value}`;
      } else if (field.max_value !== undefined && num > field.max_value) {
        errors[field.id] = `القيمة يجب ألا تزيد عن ${field.max_value}`;
      } else {
        cleanAnswers[field.id] = num;
      }
      continue;
    }

    // String / textarea / select checks
    const strVal = String(value).trim();

    if (field.is_sensitive) {
      if (field.id === "national_id" && !egyptianNationalIdRegex.test(strVal)) {
        errors[field.id] = "الرقم القومي يجب أن يتكون من 14 رقماً ويبدأ بـ 2 أو 3";
      } else {
        sensitiveFields[field.id] = strVal;
        cleanAnswers[field.id] = "******"; // Mask in general JSONB answers!
      }
      continue;
    }

    cleanAnswers[field.id] = strVal;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    cleanAnswers,
    sensitiveFields,
    attachmentStorageKeys,
  };
}
