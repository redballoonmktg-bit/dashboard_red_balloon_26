"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { PageShell, LoadingState, ErrorState } from "@/components/PageShell";
import { useDashboardData } from "@/components/useDashboardData";
import { brand, textMuted } from "@/lib/theme";

const CYCLE_COLORS: Record<string, string> = {
  "alta-25-26": brand.verde,
  "alta-26-27": brand.amarelo,
  "baixa-2026": brand.azulEscuro,
  "baixa-2027": brand.rosa
};

const TEMP_COLORS: Record<string, string> = {
  Quente: brand.vermelho,
  Morno: brand.amarelo,
  Frio: brand.azulClaro,
  "Fora do Perfil": brand.rosa
};

export default function CiclosPage() {
  const { data, error, loading, reload } = useDashboardData();

  const totalTemp = data
    ? Object.values(data.temperature).reduce((a, b) => a + b, 0) || 1
    : 1;

  let acc = 0;
  const gradientStops = data
    ? Object.entries(data.temperature)
        .map(([k, v]) => {
          const start = (acc / totalTemp) * 360;
          acc += v;
          const end = (acc / totalTemp) * 360;
          return `${TEMP_COLORS[k] ?? "#ccc"} ${start}deg ${end}deg`;
        })
        .join(", ")
    : "";

  return (
    <PageShell title="Ciclos e Perfil" subtitle="Leads 4 Escolas · comparação entre ciclos comerciais">
      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && (
        <div style={{ display: "flex", gap: 16, flex: 1, minHeight: 380 }}>
          <div
            style={{
              flex: 1.3,
              background: "#FFFFFF",
              border: "1px solid rgba(55,55,180,.16)",
              borderRadius: 14,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 12
            }}
          >
            <div className="font-display" style={{ fontSize: 15, fontWeight: 700 }}>
              Leads e Matrículas por Ciclo Comercial
            </div>
            <div style={{ flex: 1, minHeight: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.cycles}>
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#3737b4" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip />
                  <Bar dataKey="leads" name="Leads" radius={[6, 6, 0, 0]}>
                    {data.cycles.map((c) => (
                      <Cell key={c.id} fill={CYCLE_COLORS[c.id] ?? brand.azulEscuro} fillOpacity={0.3} />
                    ))}
                  </Bar>
                  <Bar dataKey="matriculas" name="Matrículas" radius={[6, 6, 0, 0]}>
                    {data.cycles.map((c) => (
                      <Cell key={c.id} fill={CYCLE_COLORS[c.id] ?? brand.azulEscuro} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div
            style={{
              flex: 1,
              background: "#FFFFFF",
              border: "1px solid rgba(55,55,180,.16)",
              borderRadius: 14,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 20
            }}
          >
            <div className="font-display" style={{ fontSize: 15, fontWeight: 700 }}>
              Distribuição de Temperatura
            </div>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 28 }}>
              <div style={{ position: "relative", width: 200, height: 200, flexShrink: 0 }}>
                <div
                  style={{
                    width: 200,
                    height: 200,
                    borderRadius: 999,
                    background: `conic-gradient(${gradientStops})`
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: 34,
                    left: 34,
                    width: 132,
                    height: 132,
                    borderRadius: 999,
                    background: "#FFFFFF",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <div className="font-display" style={{ fontSize: 24, fontWeight: 800 }}>
                    {totalTemp.toLocaleString("pt-BR")}
                  </div>
                  <div style={{ fontSize: 11, color: textMuted(0.55) }}>leads</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {Object.entries(data.temperature).map(([k, v]) => (
                  <div key={k} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 11, height: 11, borderRadius: 3, background: TEMP_COLORS[k] ?? "#ccc" }} />
                    <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{k}</span>
                    <span className="font-display" style={{ fontSize: 14, fontWeight: 700 }}>
                      {((v / totalTemp) * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
