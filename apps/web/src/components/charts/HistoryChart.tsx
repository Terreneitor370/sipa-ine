import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PuntoHistorico } from "../../types/api";
import { formatPct } from "../../lib/format";

export function HistoryChart({ historico }: { historico: PuntoHistorico[] }) {
  const datos = historico.map((p) => ({ ...p, y: p.abstencion ?? undefined }));
  return (
    <div className="h-64 w-full" data-testid="history-chart">
      <ResponsiveContainer>
        <LineChart data={datos} margin={{ top: 8, right: 16, bottom: 0, left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="anio" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={(v: number) => `${Math.round(v * 100)}%`} tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(value: number) => [formatPct(value), "Abstención"]}
            labelFormatter={(label, payload) => {
              const tipo = payload?.[0]?.payload?.tipo;
              return `${label} · ${tipo ?? ""}`;
            }}
          />
          <ReferenceLine x={2024} stroke="#94a3b8" strokeDasharray="2 2" />
          <Line
            type="monotone"
            dataKey="y"
            stroke="#0F4C81"
            strokeWidth={1.5}
            dot={{ r: 4 }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
