import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Legend } from "./Legend";
import { UMBRALES_V1 } from "../../lib/riesgo";

describe("Legend", () => {
  it("muestra los 4 niveles de riesgo con su rango", () => {
    render(<Legend umbrales={UMBRALES_V1} />);

    expect(screen.getByText("Muy Alto")).toBeInTheDocument();
    expect(screen.getByText("Alto")).toBeInTheDocument();
    expect(screen.getByText("Medio")).toBeInTheDocument();
    expect(screen.getByText("Bajo")).toBeInTheDocument();
    expect(screen.getByText("≥ 55.9%")).toBeInTheDocument();
    expect(screen.getByText("< 48.5%")).toBeInTheDocument();
  });
});
