"use client";

import { useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { PageShell, LoadingState, ErrorState } from "@/components/PageShell";
import { MonthFilter } from "@/components/MonthFilter";
import { useDashboardData } from "@/components/useDashboardData";
import { brand, unitColor, unitLabel, textMuted } from "@/lib/theme";

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

function TempDonut({
  title,
  dotColor,
  temp,
  size = 108
}: {
  title: string;
  dotColor: string;
  temp: Record<string, number>;
  size?: number;
}) {
  const total = Object.values(temp).reduce((a, b) => a + b, 0) || 1;
  let acc = 0;
  const gradientStops = Object.entries(temp)
    .map(([k, v]) => {
      const start = (acc / total) * 360;
      acc += v;
      const end = (acc / total) * 360;
      return `${TEMP_COLORS[k] ?? "#ccc"} ${start}deg ${end}deg`;
    })
    .join(", ");
  const inner = Math.round(size * 0.62);
  const offset = Math.round((size - inner) / 2);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 800 }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: dotColor }} />
        {title}
      </div>
      <div style={{ position: "relative", width: size, height: size }}>
        <div style={{ width: size, height: size, borderRadius: 999, background: `conic-gradient(${gradientStops})` }} />
        <div
          style={{
            position: "absolute",
            top: offset,
            left: offset,
            width: inner,
            height: inner,
            borderRadius: 999,
            background: "#FFFFFF",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <div className="font-display" style={{ fontSize: 15, fontWeight: 800 }}>
            {total.toLocaleString("pt-BR")}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CiclosPage() {
  const [month, setMonth] = useState("all");
  const { data, error, loading, reload } = useDashboardData(month);

  return (
    <PageShell title="Ciclos e Perfil" subtitle="Leads 4 Escolas · comparação entre ciclos comerciais">
      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && (
        <>
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid rgba(55,55,180,.16)",
              borderRadius: 14,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              minHeight: 320
            }}
          >
            <div className="font-display" style={{ fontSize: 15, fontWeight: 700 }}>
              Leads e Matrículas por Ciclo Comercial
            </div>
            <div style={{ fontSize: 12, color: textMuted(0.55) }}>
              Comparação entre os 4 ciclos da planilha — não é afetada pelo filtro de mês abaixo.
            </div>
            <div style={{ flex: 1, minHeight: 220 }}>
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
              background: "#FFFFFF",
              border: "1px solid rgba(55,55,180,.16)",
              borderRadius: 14,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 16
            }}
          >
            <div>
              <div className="font-display" style={{ fontSize: 15, fontWeight: 700 }}>
                Distribuição de Temperatura por Unidade
              </div>
              <div style={{ fontSize: 12, color: textMuted(0.55) }}>Ciclo Baixa 2026</div>
            </div>

            <MonthFilter
              availableMonths={data.monthlyEvolution.map((m) => ({ key: m.key, label: m.label }))}
              value={month}
              onChange={setMonth}
            />

            <div style={{ display: "flex", gap: 28, alignItems: "flex-start", flexWrap: "wrap", paddingTop: 4 }}>
              <TempDonut title="Geral" dotColor={brand.azulEscuro} temp={data.temperature} size={128} />
              <TempDonut title={unitLabel.am} dotColor={unitColor.am} temp={data.temperatureByUnit.am} />
              <TempDonut title={unitLabel.li} dotColor={unitColor.li} temp={data.temperatureByUnit.li} />
              <TempDonut title={unitLabel.pi} dotColor={unitColor.pi} temp={data.temperatureByUnit.pi} />
              <TempDonut title={unitLabel.ta} dotColor={unitColor.ta} temp={data.temperatureByUnit.ta} />

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginLeft: 8 }}>
                {Object.keys(TEMP_COLORS).map((k) => (
                  <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: TEMP_COLORS[k] }} />
                    {k}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </PageShell>
  );
}
