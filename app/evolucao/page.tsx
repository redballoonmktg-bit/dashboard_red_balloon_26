"use client";

import { Bar, BarChart, Line, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageShell, LoadingState, ErrorState } from "@/components/PageShell";
import { useDashboardData } from "@/components/useDashboardData";
import { brand } from "@/lib/theme";

export default function EvolucaoPage() {
  const { data, error, loading, reload } = useDashboardData();

  return (
    <PageShell
      title="Evolução Mensal"
      subtitle="Leads, matrículas e conversão mês a mês (agrupado pela data de chegada do lead)"
    >
      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && (
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid rgba(55,55,180,.16)",
            borderRadius: 14,
            padding: 24,
            flex: 1,
            minHeight: 420
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data.monthlyEvolution}>
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#3737b4" }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" hide />
              <YAxis yAxisId="right" orientation="right" hide domain={[0, 30]} />
              <Tooltip />
              <Bar yAxisId="left" dataKey="leads" name="Leads" fill={brand.azulClaro} radius={[6, 6, 0, 0]} />
              <Bar yAxisId="left" dataKey="matriculas" name="Matrículas" fill={brand.azulEscuro} radius={[6, 6, 0, 0]} />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="conversaoPct"
                name="Conversão %"
                stroke={brand.vermelho}
                strokeWidth={3}
                dot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </PageShell>
  );
}
