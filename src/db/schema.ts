import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  uuid,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ==========================================
// 1. Better Auth Tables
// ==========================================

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// ==========================================
// 2. Types for Dynamic Form Builder
// ==========================================

export type FormFieldType =
  | "text"
  | "textarea"
  | "number"
  | "currency"
  | "date"
  | "select"
  | "image";

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface FormFieldDefinition {
  id: string; // e.g. "national_id", "bank_name"
  label_ar: string;
  type: FormFieldType;
  required: boolean;
  description_ar?: string;
  placeholder_ar?: string;
  options?: FormFieldOption[];
  is_sensitive?: boolean; // sensitive data is stored encrypted in case_sensitive_data
  min_value?: number;
  max_value?: number;
  max_images?: number;
  order: number;
}

// ==========================================
// 3. Application Tables
// ==========================================

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: text("type").notNull(), // 'request' | 'complaint'
    slug: text("slug").notNull().unique(),
    name_ar: text("name_ar").notNull(),
    description_ar: text("description_ar"),
    icon: text("icon").default("FileText"),
    is_active: boolean("is_active").notNull().default(true),
    display_order: integer("display_order").notNull().default(0),
    field_schema: jsonb("field_schema").$type<FormFieldDefinition[]>().notNull().default([]),
    form_version: integer("form_version").notNull().default(1),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("categories_type_idx").on(table.type),
    index("categories_slug_idx").on(table.slug),
    index("categories_active_order_idx").on(table.is_active, table.display_order),
  ]
);

export const cases = pgTable(
  "cases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reference: text("reference").notNull().unique(), // e.g. REQ-2026-000001
    case_type: text("case_type").notNull(), // 'request' | 'complaint'
    category_id: uuid("category_id").references(() => categories.id),
    category_name_ar: text("category_name_ar").notNull(),
    category_schema_snapshot: jsonb("category_schema_snapshot")
      .$type<FormFieldDefinition[]>()
      .notNull(),
    employee_number: text("employee_number").notNull(), // preserved string with leading zeros
    employee_name: text("employee_name").notNull(),
    phone_number: text("phone_number").notNull(),
    profession: text("profession"),
    status: text("status").notNull().default("pending"), // 'pending' | 'in_progress' | 'awaiting_employee' | 'completed' | 'rejected'
    is_unread: boolean("is_unread").notNull().default(true),
    first_opened_at: timestamp("first_opened_at", { withTimezone: true }),
    submission_date: timestamp("submission_date", { withTimezone: true }).notNull().defaultNow(),
    last_updated_at: timestamp("last_updated_at", { withTimezone: true }).notNull().defaultNow(),
    completion_date: timestamp("completion_date", { withTimezone: true }),
    tracking_code_hash: text("tracking_code_hash").notNull(), // HMAC-SHA256 with pepper
    answers: jsonb("answers").$type<Record<string, unknown>>().notNull().default({}),
    is_identity_verified: boolean("is_identity_verified").notNull().default(false),
  },
  (table) => [
    uniqueIndex("cases_reference_idx").on(table.reference),
    index("cases_employee_number_idx").on(table.employee_number),
    index("cases_status_idx").on(table.status),
    index("cases_case_type_idx").on(table.case_type),
    index("cases_category_id_idx").on(table.category_id),
    index("cases_is_unread_idx").on(table.is_unread),
    index("cases_submission_date_idx").on(table.submission_date),
  ]
);

export const case_sensitive_data = pgTable(
  "case_sensitive_data",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    case_id: uuid("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    field_name: text("field_name").notNull(), // e.g. 'national_id'
    encrypted_value: text("encrypted_value").notNull(), // AES-256-GCM iv:authTag:ciphertext
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("case_sensitive_case_field_idx").on(table.case_id, table.field_name)]
);

export const attachments = pgTable(
  "attachments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    case_id: uuid("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    message_id: uuid("message_id"),
    original_filename: text("original_filename").notNull(),
    storage_key: text("storage_key").notNull().unique(),
    file_type: text("file_type").notNull(), // MIME
    file_size: integer("file_size").notNull(), // bytes
    uploader_type: text("uploader_type").notNull(), // 'employee' | 'hr'
    field_name: text("field_name"), // dynamic form field ID if applicable
    is_verified: boolean("is_verified").notNull().default(true),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("attachments_case_id_idx").on(table.case_id),
    index("attachments_uploader_type_idx").on(table.uploader_type),
  ]
);

export const case_messages = pgTable(
  "case_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    case_id: uuid("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    sender_type: text("sender_type").notNull(), // 'employee' | 'hr'
    sender_name: text("sender_name").notNull(),
    message_body: text("message_body").notNull(),
    is_internal: boolean("is_internal").notNull().default(false), // true for manager-only notes
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("case_messages_case_id_idx").on(table.case_id),
    index("case_messages_created_at_idx").on(table.created_at),
  ]
);

export const case_status_history = pgTable(
  "case_status_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    case_id: uuid("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    previous_status: text("previous_status"),
    new_status: text("new_status").notNull(),
    actor: text("actor").notNull(), // 'employee' | 'hr' | 'system'
    note: text("note"),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("case_status_history_case_id_idx").on(table.case_id)]
);

export const case_audit_logs = pgTable(
  "case_audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    case_id: uuid("case_id"),
    action: text("action").notNull(),
    actor: text("actor").notNull(),
    details: jsonb("details").$type<Record<string, unknown>>().default({}),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("case_audit_logs_case_id_idx").on(table.case_id),
    index("case_audit_logs_action_idx").on(table.action),
  ]
);

export const trusted_devices = pgTable(
  "trusted_devices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    device_token_hash: text("device_token_hash").notNull().unique(), // SHA-256 of opaque token
    user_agent: text("user_agent"),
    ip_address: text("ip_address"),
    expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
    last_used_at: timestamp("last_used_at", { withTimezone: true }).notNull().defaultNow(),
    is_revoked: boolean("is_revoked").notNull().default(false),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("trusted_devices_token_hash_idx").on(table.device_token_hash)]
);

export const trusted_device_cases = pgTable(
  "trusted_device_cases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    device_id: uuid("device_id")
      .notNull()
      .references(() => trusted_devices.id, { onDelete: "cascade" }),
    case_id: uuid("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("trusted_device_cases_unique_idx").on(table.device_id, table.case_id),
    index("trusted_device_cases_device_id_idx").on(table.device_id),
    index("trusted_device_cases_case_id_idx").on(table.case_id),
  ]
);

export const upload_tickets = pgTable(
  "upload_tickets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ticket_token: text("ticket_token").notNull().unique(),
    case_id: uuid("case_id"),
    storage_key: text("storage_key").notNull().unique(),
    expected_mime: text("expected_mime").notNull(),
    max_size: integer("max_size").notNull(),
    expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
    is_used: boolean("is_used").notNull().default(false),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("upload_tickets_token_idx").on(table.ticket_token),
    index("upload_tickets_expires_at_idx").on(table.expires_at),
  ]
);

export const rate_limits = pgTable(
  "rate_limits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: text("key").notNull().unique(),
    points: integer("points").notNull().default(1),
    expire_at: timestamp("expire_at", { withTimezone: true }).notNull(),
  },
  (table) => [uniqueIndex("rate_limits_key_idx").on(table.key)]
);

export const case_sequences = pgTable("case_sequences", {
  name: text("name").primaryKey(), // e.g. "REQ_2026", "CMP_2026"
  last_value: integer("last_value").notNull().default(0),
});
