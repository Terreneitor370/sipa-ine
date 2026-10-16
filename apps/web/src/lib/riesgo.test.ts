import { describe, expect, it } from "vitest";
import { nivelDesdeAbstencion, UMBRALES_V1 } from "./riesgo";

describe("nivelDesdeAbstencion", () => {
  it("asigna MUY_ALTO en el umbral p90 y arriba", () => {
    expect(nivelDesdeAbstencion(UMBRALES_V1.MUY_ALTO.min!)).toBe("MUY_ALTO");
    expect(nivelDesdeAbstencion(0.9)).toBe("MUY_ALTO");
  });

  it("asigna ALTO entre p75 y p90", () => {
    expect(nivelDesdeAbstencion(UMBRALES_V1.ALTO.min!)).toBe("ALTO");
    expect(nivelDesdeAbstencion(0.53)).toBe("ALTO");
  });

  it("asigna MEDIO entre p50 y p75", () => {
    expect(nivelDesdeAbstencion(UMBRALES_V1.MEDIO.min!)).toBe("MEDIO");
    expect(nivelDesdeAbstencion(0.5)).toBe("MEDIO");
  });

  it("asigna BAJO por debajo de p50", () => {
    expect(nivelDesdeAbstencion(0.3)).toBe("BAJO");
  });
});
