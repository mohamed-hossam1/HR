import { describe, it, expect } from "vitest";
import {
  egyptianPhoneRegex,
  egyptianNationalIdRegex,
  normalizeEgyptianPhone,
  commonEmployeeFieldsSchema,
} from "@/lib/validation";

describe("Egyptian Validation Helpers", () => {
  it("validates correct Egyptian mobile numbers", () => {
    expect(egyptianPhoneRegex.test("01012345678")).toBe(true);
    expect(egyptianPhoneRegex.test("01123456789")).toBe(true);
    expect(egyptianPhoneRegex.test("01234567890")).toBe(true);
    expect(egyptianPhoneRegex.test("01555555555")).toBe(true);
    expect(egyptianPhoneRegex.test("+201012345678")).toBe(true);
    expect(egyptianPhoneRegex.test("00201012345678")).toBe(true);

    // Invalid numbers
    expect(egyptianPhoneRegex.test("01312345678")).toBe(false); // 013 is landline
    expect(egyptianPhoneRegex.test("010123456")).toBe(false); // too short
    expect(egyptianPhoneRegex.test("0223456789")).toBe(false); // landline
  });

  it("normalizes Egyptian phone numbers to 01XXXXXXXXX", () => {
    expect(normalizeEgyptianPhone("+201012345678")).toBe("01012345678");
    expect(normalizeEgyptianPhone("00201012345678")).toBe("01012345678");
    expect(normalizeEgyptianPhone("1012345678")).toBe("01012345678");
  });

  it("validates 14-digit Egyptian National ID", () => {
    expect(egyptianNationalIdRegex.test("29501011234567")).toBe(true);
    expect(egyptianNationalIdRegex.test("30101011234567")).toBe(true);

    // Invalid IDs
    expect(egyptianNationalIdRegex.test("19501011234567")).toBe(false); // starts with 1
    expect(egyptianNationalIdRegex.test("2950101123456")).toBe(false); // 13 digits
    expect(egyptianNationalIdRegex.test("295010112345678")).toBe(false); // 15 digits
  });

  it("validates mandatory common employee fields schema", () => {
    const valid = commonEmployeeFieldsSchema.safeParse({
      employee_number: "001234",
      employee_name: "محمد أحمد",
      phone_number: "01012345678",
    });
    expect(valid.success).toBe(true);

    const invalid = commonEmployeeFieldsSchema.safeParse({
      employee_number: "",
      employee_name: "م",
      phone_number: "123",
    });
    expect(invalid.success).toBe(false);
  });
});
