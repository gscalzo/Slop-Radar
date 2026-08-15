import { describe, expect, it } from "vitest";
import { hashText } from "./hash";

describe("hashText", () => {
  it("is stable for the same input", () => {
    expect(hashText("hello world")).toBe(hashText("hello world"));
  });

  it("differs for different input", () => {
    expect(hashText("hello world")).not.toBe(hashText("hello world!"));
  });

  it("handles empty strings", () => {
    expect(hashText("")).toMatch(/^[0-9a-f]+$/);
  });
});
