import { db } from "@/db";
import {
  cases,
  categories,
  case_sensitive_data,
  attachments,
  case_status_history,
  case_messages,
  upload_tickets,
  trusted_devices,
  trusted_device_cases,
} from "@/db/schema";
import {
  generateTrackingCode,
  hashTrackingCode,
  hashDeviceToken,
  verifyTrackingCode,
  encryptSensitiveData,
  decryptSensitiveData,
} from "../crypto";
import { generateNextCaseReference } from "../case-reference";
import {
  commonEmployeeFieldsSchema,
  normalizeEgyptianPhone,
  formatStatusHistoryNote,
} from "../validation";
import { validateDynamicFormAnswers } from "../dynamic-form";
import { linkCaseToDevice, isDeviceAuthorizedForCase } from "../device-token";
import { getStorageProvider } from "../storage";
import { eq, and, desc, gt } from "drizzle-orm";

export interface SubmitCaseInput {
  caseType: "request" | "complaint";
  categorySlug: string;
  employee_number: string;
  employee_name: string;
  phone_number: string;
  profession?: string;
  answers: Record<string, unknown>;
  uploadedAttachments: Array<{
    ticketToken: string;
    fieldId: string;
    storageKey: string;
    filename: string;
    fileSize: number;
    mimeType: string;
  }>;
  deviceId?: string;
}

export interface SubmitCaseResult {
  caseId: string;
  reference: string;
  trackingCode: string;
  categoryNameAr: string;
  caseType: "request" | "complaint";
  submissionDate: string;
}

export class CaseService {
  /**
   * Submits a new request or complaint.
   */
  static async submitCase(input: SubmitCaseInput): Promise<SubmitCaseResult> {
    // 1. Validate common mandatory employee fields
    const common = commonEmployeeFieldsSchema.parse({
      employee_number: input.employee_number,
      employee_name: input.employee_name,
      phone_number: normalizeEgyptianPhone(input.phone_number),
    });

    // 2. Fetch category
    const [category] = await db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.slug, input.categorySlug),
          eq(categories.type, input.caseType),
          eq(categories.is_active, true)
        )
      )
      .limit(1);

    if (!category) {
      throw new Error("الفئة المختارة غير موجودة أو تم تعطيلها مؤخراً");
    }

    // 3. Validate dynamic form answers
    const validation = validateDynamicFormAnswers(
      category.field_schema,
      input.answers,
      input.uploadedAttachments
    );

    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0] || "بيانات النموذج غير مكتملة";
      throw new Error(firstError);
    }

    // 4. Generate Reference & Tracking Credentials
    const reference = await generateNextCaseReference(input.caseType);
    const trackingCode = generateTrackingCode();
    const trackingCodeHash = hashTrackingCode(trackingCode);

    // 5. Create Case in Transaction
    const [newCase] = await db
      .insert(cases)
      .values({
        reference,
        case_type: input.caseType,
        category_id: category.id,
        category_name_ar: category.name_ar,
        category_schema_snapshot: category.field_schema,
        employee_number: common.employee_number,
        employee_name: common.employee_name,
        phone_number: common.phone_number,
        profession: input.profession || (input.answers["profession"] as string) || null,
        status: "pending",
        is_unread: true,
        submission_date: new Date(),
        last_updated_at: new Date(),
        tracking_code_hash: trackingCodeHash,
        answers: validation.cleanAnswers,
        is_identity_verified: false,
      })
      .returning();

    // 6. Encrypt sensitive fields (e.g. National ID)
    for (const [fieldName, plaintext] of Object.entries(validation.sensitiveFields)) {
      const encryptedValue = encryptSensitiveData(plaintext);
      await db.insert(case_sensitive_data).values({
        case_id: newCase.id,
        field_name: fieldName,
        encrypted_value: encryptedValue,
      });
    }

    // 7. Verify and record attachments concurrently
    if (input.uploadedAttachments.length > 0) {
      const storageProvider = getStorageProvider();

      await Promise.all(
        input.uploadedAttachments.map(async (att) => {
          // Verify object presence in storage
          const meta = await storageProvider.verifyUploadedObject(att.storageKey);
          if (!meta.exists) {
            console.warn(`Attachment ${att.storageKey} not found in storage during finalization`);
          }

          await db.insert(attachments).values({
            case_id: newCase.id,
            original_filename: att.filename,
            storage_key: att.storageKey,
            file_type: att.mimeType,
            file_size: meta.size || att.fileSize,
            uploader_type: "employee",
            field_name: att.fieldId,
            is_verified: meta.exists,
          });

          // Mark ticket used
          await db
            .update(upload_tickets)
            .set({ is_used: true, case_id: newCase.id })
            .where(eq(upload_tickets.storage_key, att.storageKey));
        })
      );
    }

    // 8. Insert initial status history
    await db.insert(case_status_history).values({
      case_id: newCase.id,
      previous_status: null,
      new_status: "pending",
      actor: "الموظف",
      note: "تم تقديم الطلب بنجاح",
    });

    // 9. Link to trusted device if deviceId provided
    if (input.deviceId) {
      await linkCaseToDevice(input.deviceId, newCase.id);
    }

    return {
      caseId: newCase.id,
      reference: newCase.reference,
      trackingCode,
      categoryNameAr: newCase.category_name_ar,
      caseType: newCase.case_type as "request" | "complaint",
      submissionDate: newCase.submission_date.toISOString(),
    };
  }

  /**
   * Tracks a case using Employee Number and Private Tracking Code.
   */
  static async trackCaseByCredentials(
    employeeNumber: string,
    trackingCode: string,
    deviceId?: string
  ) {
    const candidates = await db
      .select()
      .from(cases)
      .where(eq(cases.employee_number, employeeNumber.trim()));

    if (candidates.length === 0) {
      return null;
    }

    let matchedCase = null;
    for (const c of candidates) {
      if (verifyTrackingCode(trackingCode, c.tracking_code_hash)) {
        matchedCase = c;
        break;
      }
    }

    if (!matchedCase) {
      return null;
    }

    // If device session exists, remember this case
    if (deviceId) {
      await linkCaseToDevice(deviceId, matchedCase.id);
    }

    return this.buildAuthorizedCaseView(matchedCase, false);
  }

  /**
   * Retrieves case details if the device cookie authorizes access.
   */
  static async getCaseByDeviceSession(reference: string, deviceToken: string | undefined) {
    const [c] = await db
      .select()
      .from(cases)
      .where(eq(cases.reference, reference.trim()))
      .limit(1);

    if (!c) return null;

    const authorized = await isDeviceAuthorizedForCase(deviceToken, c.id);
    if (!authorized) return null;

    return this.buildAuthorizedCaseView(c, false);
  }

  /**
   * Lists all cases authorized for a trusted device session.
   */
  static async getDeviceAuthorizedCases(deviceToken: string | undefined) {
    if (!deviceToken) return [];

    const tokenHash = hashDeviceToken(deviceToken);

    return db
      .select({
        id: cases.id,
        reference: cases.reference,
        case_type: cases.case_type,
        category_name_ar: cases.category_name_ar,
        status: cases.status,
        submission_date: cases.submission_date,
        last_updated_at: cases.last_updated_at,
      })
      .from(cases)
      .innerJoin(
        trusted_device_cases,
        eq(trusted_device_cases.case_id, cases.id)
      )
      .innerJoin(
        trusted_devices,
        and(
          eq(trusted_devices.id, trusted_device_cases.device_id),
          eq(trusted_devices.device_token_hash, tokenHash),
          eq(trusted_devices.is_revoked, false),
          gt(trusted_devices.expires_at, new Date())
        )
      )
      .orderBy(desc(cases.submission_date));
  }

  /**
   * Builds the safe case view for the employee, generating short-lived authorized download URLs for HR response documents.
   */
  static async buildAuthorizedCaseView(caseRecord: typeof cases.$inferSelect, isManager: boolean = false) {
    const storageProvider = getStorageProvider();

    // 1. Get status history
    const rawHistory = await db
      .select()
      .from(case_status_history)
      .where(eq(case_status_history.case_id, caseRecord.id))
      .orderBy(desc(case_status_history.created_at));

    const history = rawHistory.map((h) => ({
      ...h,
      note: formatStatusHistoryNote(h.note),
      actor: h.actor === "employee" ? "الموظف" : h.actor,
    }));

    // 2. Get messages (filter out internal notes for employees!)
    const allMessages = await db
      .select()
      .from(case_messages)
      .where(eq(case_messages.case_id, caseRecord.id))
      .orderBy(case_messages.created_at);

    const safeMessages = isManager
      ? allMessages
      : allMessages.filter((m) => !m.is_internal);

    // 3. Get attachments and generate authorized download URLs
    const caseAttachments = await db
      .select()
      .from(attachments)
      .where(eq(attachments.case_id, caseRecord.id))
      .orderBy(attachments.created_at);

    const signedAttachments = await Promise.all(
      caseAttachments.map(async (att) => {
        const downloadUrl = await storageProvider.getAuthorizedDownloadUrl(
          att.storage_key,
          att.original_filename,
          900
        );
        return {
          id: att.id,
          messageId: att.message_id,
          filename: att.original_filename,
          fileType: att.file_type,
          fileSize: att.file_size,
          uploaderType: att.uploader_type,
          fieldName: att.field_name,
          downloadUrl,
          createdAt: att.created_at,
        };
      })
    );

    // 4. Sensitive data (only decrypted for manager)
    let sensitiveValues: Record<string, string> | undefined = undefined;
    if (isManager) {
      const sensitiveRows = await db
        .select()
        .from(case_sensitive_data)
        .where(eq(case_sensitive_data.case_id, caseRecord.id));

      sensitiveValues = {};
      for (const row of sensitiveRows) {
        try {
          sensitiveValues[row.field_name] = decryptSensitiveData(row.encrypted_value);
        } catch {
          sensitiveValues[row.field_name] = "خطأ في فك التشفير";
        }
      }
    }

    return {
      id: caseRecord.id,
      reference: caseRecord.reference,
      case_type: caseRecord.case_type,
      category_id: caseRecord.category_id,
      category_name_ar: caseRecord.category_name_ar,
      category_schema_snapshot: caseRecord.category_schema_snapshot,
      employee_number: caseRecord.employee_number,
      employee_name: caseRecord.employee_name,
      phone_number: caseRecord.phone_number,
      profession: caseRecord.profession,
      status: caseRecord.status,
      is_unread: caseRecord.is_unread,
      submission_date: caseRecord.submission_date,
      last_updated_at: caseRecord.last_updated_at,
      completion_date: caseRecord.completion_date,
      answers: caseRecord.answers,
      is_identity_verified: caseRecord.is_identity_verified,
      history,
      messages: safeMessages,
      attachments: signedAttachments,
      sensitiveValues,
    };
  }
}
