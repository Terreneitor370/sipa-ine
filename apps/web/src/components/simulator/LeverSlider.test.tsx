import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LeverSlider } from "./LeverSlider";

describe("LeverSlider", () => {
  it("renderiza la etiqueta y el valor actual", () => {
    render(
      <LeverSlider
        etiqueta="Más casillas"
        valor={10}
        min={0}
        max={40}
        step={1}
        sufijo="%"
        onChange={() => undefined}
      />,
    );

    expect(screen.getByLabelText("Más casillas")).toHaveValue("10");
    expect(screen.getByText("10%")).toBeInTheDocument();
  });

  it("notifica el valor numérico al mover la palanca", () => {
    const onChange = vi.fn();
    render(
      <LeverSlider
        etiqueta="Más casillas"
        valor={10}
        min={0}
        max={40}
        step={1}
        sufijo="%"
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("Más casillas"), { target: { value: "25" } });
    expect(onChange).toHaveBeenCalledWith(25);
  });
});
