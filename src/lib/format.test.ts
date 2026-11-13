import { describe, expect, it } from "vitest";
import { displayNameFromEmail, normalizeKePhone } from "./format";

describe("displayNameFromEmail", () => {
  it("capitalizes the email name", () => {
    expect(displayNameFromEmail("makiwale@gmail.com")).toBe("Makiwale");
    expect(displayNameFromEmail("johnsmith@gmail.com")).toBe("Johnsmith");
    expect(displayNameFromEmail("david2026@gmail.com")).toBe("David2026");
  });
});

describe("normalizeKePhone", () => {
  it("accepts Kenyan M-Pesa formats", () => {
    expect(normalizeKePhone("0712 345 678")).toBe("254712345678");
    expect(normalizeKePhone("+254112345678")).toBe("254112345678");
    expect(normalizeKePhone("712345678")).toBe("254712345678");
  });
  it("rejects non-Kenyan or malformed numbers", () => {
    expect(normalizeKePhone("0812345678")).toBeNull();
    expect(normalizeKePhone("07123")).toBeNull();
    expect(normalizeKePhone("+255712345678")).toBeNull();
  });
});
