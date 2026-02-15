import { describe, it, expect } from "vitest";
import { toCsvRow, toCsvString } from "@/lib/utils/csv";

describe("toCsvRow", () => {
  it("joins simple values with commas", () => {
    expect(toCsvRow(["a", "b", "c"])).toBe("a,b,c");
  });

  it("escapes values containing commas", () => {
    expect(toCsvRow(["hello, world", "test"])).toBe('"hello, world",test');
  });

  it("escapes values containing double quotes", () => {
    expect(toCsvRow(['say "hi"', "ok"])).toBe('"say ""hi""",ok');
  });

  it("escapes values containing newlines", () => {
    expect(toCsvRow(["line1\nline2", "ok"])).toBe('"line1\nline2",ok');
  });

  it("handles null and undefined as empty strings", () => {
    expect(toCsvRow([null, undefined, "test"])).toBe(",,test");
  });

  it("handles numeric values", () => {
    expect(toCsvRow([1, 2.5, 0])).toBe("1,2.5,0");
  });
});

describe("toCsvString", () => {
  it("generates header + data rows", () => {
    const csv = toCsvString(["Name", "Age"], [["Alice", 30], ["Bob", 25]]);
    expect(csv).toContain("Name,Age");
    expect(csv).toContain("Alice,30");
    expect(csv).toContain("Bob,25");
  });

  it("includes BOM character for Excel compatibility", () => {
    const csv = toCsvString(["A"], [["B"]]);
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
  });

  it("returns headers only when rows are empty", () => {
    const csv = toCsvString(["X", "Y"], []);
    expect(csv).toBe("\uFEFFX,Y");
  });

  it("uses CRLF line endings", () => {
    const csv = toCsvString(["A"], [["B"], ["C"]]);
    expect(csv).toContain("\r\n");
    // Should have exactly 2 CRLFs (header->row1, row1->row2)
    const crlfCount = (csv.match(/\r\n/g) || []).length;
    expect(crlfCount).toBe(2);
  });
});
