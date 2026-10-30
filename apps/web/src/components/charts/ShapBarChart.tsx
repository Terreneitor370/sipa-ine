import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { FactorShap } from "../../types/api";

const COLOR_AUMENTA = "#B2182B";
const COLOR_DISMINUYE = "#67A9CF";

export function ShapBarChart({ factores }: { factores: FactorShap[] }) {
  const datos = factores.map((f) => ({ ...f, etiqueta: f.descripcion }));
  return (
    <div className="h-64 w-full" data-testid="shap-chart">
      <ResponsiveContainer>
        <BarChart data={datos} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={(v: number) => `${v > 0 ? "+" : ""}${(v * 100).toFixed(0)} pp`}
            tick={{ fontSize: 11 }}
          />
          <YAxis type="category" dataKey="etiqueta" width={190} tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(value: number) => [
              `${value > 0 ? "+" : ""}${(value * 100).toFixed(1)} pp`,
              "Contribución",
            ]}
          />
          <Bar dataKey="contribucion" isAnimationActive={false}>
            {datos.map((d) => (
              <Cell key={d.variable} fill={d.contribucion >= 0 ? COLOR_AUMENTA : COLOR_DISMINUYE} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
