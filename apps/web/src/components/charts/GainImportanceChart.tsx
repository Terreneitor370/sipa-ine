import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function GainImportanceChart({
  importancia,
}: {
  importancia: { variable: string; gain: number }[];
}) {
  const datos = [...importancia].sort((a, b) => a.gain - b.gain);
  return (
    <div className="h-72 w-full" data-testid="gain-chart">
      <ResponsiveContainer>
        <BarChart data={datos} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
          <CartesianGrid stroke="#E5E7EB" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: "#6B7280" }} />
          <YAxis
            type="category"
            dataKey="variable"
            width={170}
            tick={{ fontSize: 11, fill: "#6B7280" }}
          />
          <Tooltip formatter={(value: number) => [value.toFixed(2), "Gain"]} />
          <Bar dataKey="gain" fill="#950054" isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
