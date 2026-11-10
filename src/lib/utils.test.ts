import { describe, expect, it } from "vitest";
import { formatDate, formatPyg } from "./utils";

describe("Paraguay formatting", () => {
  it("formats PYG without decimals", () =>
    expect(formatPyg(1250000)).toBe("Gs. 1.250.000"));
  it("formats business dates as DD/MM/YYYY", () =>
    expect(formatDate("2026-11-09")).toBe("09/11/2026"));
});
