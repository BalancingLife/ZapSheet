import { describe, expect, it } from "vitest";
import {
  DISPLAY_ERROR,
  evaluateFormulaStrict,
  evaluateFormulaToNumber,
  isArithmeticFormula,
  toDisplayString,
} from "./formula";

const resolveCell = (a1: string): number | null => {
  const values: Record<string, number> = {
    A1: 10,
    A2: 20,
    B1: 5,
    B2: 15,
  };
  return values[a1] ?? null;
};

describe("formula utilities", () => {
  describe("isArithmeticFormula", () => {
    it("detects formulas that start with equals after trimming", () => {
      expect(isArithmeticFormula(" =1+2")).toBe(true);
      expect(isArithmeticFormula("1+2")).toBe(false);
      expect(isArithmeticFormula(null)).toBe(false);
    });
  });

  describe("evaluateFormulaStrict", () => {
    it("evaluates arithmetic with operator precedence and parentheses", () => {
      expect(evaluateFormulaStrict("=1+2*3")).toBe(7);
      expect(evaluateFormulaStrict("=(1+2)*3")).toBe(9);
    });

    it("evaluates cell references through the resolver", () => {
      expect(evaluateFormulaStrict("=A1+B1*2", { resolveCell })).toBe(20);
    });

    it("returns null for invalid formulas or divide by zero", () => {
      expect(evaluateFormulaStrict("=1+")).toBeNull();
      expect(evaluateFormulaStrict("=1/0")).toBeNull();
      expect(evaluateFormulaStrict("=A1+Z9", { resolveCell })).toBeNull();
    });
  });

  describe("toDisplayString", () => {
    it("returns plain values unchanged", () => {
      expect(toDisplayString("hello")).toBe("hello");
      expect(toDisplayString(null)).toBe("");
    });

    it("formats arithmetic formulas for display", () => {
      expect(toDisplayString("=1+2*3")).toBe("7");
    });

    it("formats aggregate formulas for display", () => {
      expect(toDisplayString("=SUM(A1:B2)", { resolveCell })).toBe("50");
      expect(toDisplayString("=AVERAGE(A1:B2)", { resolveCell })).toBe("13");
      expect(toDisplayString("=MIN(A1:B2)", { resolveCell })).toBe("5");
      expect(toDisplayString("=MAX(A1:B2)", { resolveCell })).toBe("20");
      expect(toDisplayString("=COUNT(A1:B2)", { resolveCell })).toBe("4");
    });

    it("returns DISPLAY_ERROR for invalid formulas", () => {
      expect(toDisplayString("=1/0")).toBe(DISPLAY_ERROR);
      expect(toDisplayString("=SUM(A1:B2)")).toBe(DISPLAY_ERROR);
    });
  });

  describe("evaluateFormulaToNumber", () => {
    it("returns numbers from literals, arithmetic formulas, and aggregate formulas", () => {
      expect(evaluateFormulaToNumber("42")).toBe(42);
      expect(evaluateFormulaToNumber("=A1+B1", { resolveCell })).toBe(15);
      expect(evaluateFormulaToNumber("=PRODUCT(A1:B1)", { resolveCell })).toBe(
        50,
      );
    });

    it("returns null for empty or non-numeric values", () => {
      expect(evaluateFormulaToNumber("")).toBeNull();
      expect(evaluateFormulaToNumber("hello")).toBeNull();
    });
  });
});
