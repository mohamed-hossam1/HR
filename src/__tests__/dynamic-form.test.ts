import { describe, it, expect } from "vitest";
import { validateDynamicFormAnswers } from "@/lib/dynamic-form";
import { FormFieldDefinition } from "@/db/schema";

describe("Dynamic Form Validator", () => {
  const fields: FormFieldDefinition[] = [
    {
      id: "profession",
      label_ar: "المهنة",
      type: "text",
      required: true,
      order: 1,
    },
    {
      id: "national_id",
      label_ar: "الرقم القومي",
      type: "text",
      required: true,
      is_sensitive: true,
      order: 2,
    },
    {
      id: "doc_image",
      label_ar: "صورة المستند",
      type: "image",
      required: true,
      max_images: 2,
      order: 3,
    },
  ];

  it("successfully validates when all required fields and attachments are provided", () => {
    const rawAnswers = {
      profession: "محاسب",
      national_id: "29501011234567",
    };
    const attachments = [
      {
        fieldId: "doc_image",
        storageKey: "cases/2026/10/img1.jpg",
        filename: "img1.jpg",
      },
    ];

    const result = validateDynamicFormAnswers(fields, rawAnswers, attachments);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
    expect(result.cleanAnswers["profession"]).toBe("محاسب");
    // National ID is masked in answers and isolated in sensitiveFields
    expect(result.cleanAnswers["national_id"]).toBe("******");
    expect(result.sensitiveFields["national_id"]).toBe("29501011234567");
  });

  it("fails validation when a required field is missing", () => {
    const rawAnswers = {
      profession: "",
      national_id: "29501011234567",
    };
    const attachments = [
      {
        fieldId: "doc_image",
        storageKey: "cases/2026/10/img1.jpg",
        filename: "img1.jpg",
      },
    ];

    const result = validateDynamicFormAnswers(fields, rawAnswers, attachments);
    expect(result.isValid).toBe(false);
    expect(result.errors["profession"]).toBeDefined();
  });

  it("strictly rejects submissions exceeding the 10-image maximum ceiling", () => {
    const rawAnswers = {
      profession: "مهندس",
      national_id: "29501011234567",
    };
    // 11 images
    const attachments = Array.from({ length: 11 }, (_, i) => ({
      fieldId: "doc_image",
      storageKey: `cases/2026/10/img_${i}.jpg`,
      filename: `img_${i}.jpg`,
    }));

    const result = validateDynamicFormAnswers(fields, rawAnswers, attachments);
    expect(result.isValid).toBe(false);
    expect(result.errors["_global"]).toContain("10 صور فقط");
  });
});
