"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { PageShell, Kpi, LoadingState, ErrorState } from "@/components/PageShell";
import { MonthFilter } from "@/components/MonthFilter";
import { useDashboardData } from "@/components/useDashboardData";
import { unitColor, unitLabel, textMuted } from "@/lib/theme";

export default function VisaoGeralPage() {
  const [month, setMonth] = useState("all");
  const { data, error, loading, reload } = useDashboardData(month);

  return (
    <PageShell title="Visão Geral" subtitle="Leads 4 Escolas · Ciclo Baixa 2026">
      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && (
        <>
          <MonthFilter
            availableMonths={data.monthlyEvolution.map((m) => ({ key: m.key, label: m.label }))}
            value={month}
            onChange={setMonth}
          />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            <Kpi label="Total de Leads" value={data.aggregate.totalLeads.toLocaleString("pt-BR")} hint="Todos os ciclos somados" />
            <Kpi
              label="Matrículas"
              value={data.aggregate.matriculas.toLocaleString("pt-BR")}
              hint="Fechadas no período"
              color="#2d9164"
            />
            <Kpi
              label="Conversão Geral"
              value={`${data.aggregate.conversaoGeralPct.toFixed(1)}%`}
              hint="Matrícula ÷ Total de leads"
            />
            <Kpi
              label="Fora do Perfil"
              value={`${data.aggregate.foraDoPerfilPct.toFixed(1)}%`}
              hint="Do total de leads"
              color="#f03c3c"
            />
          </div>

          <div style={{ display: "flex", gap: 16, flex: 1, minHeight: 380 }}>
            <div
              style={{
                flex: 1.4,
                background: "#FFFFFF",
                border: "1px solid rgba(55,55,180,.16)",
                borderRadius: 14,
                padding: 24,
                display: "flex",
                flexDirection: "column",
                gap: 12
              }}
            >
              <div>
                <div className="font-display" style={{ fontSize: 15, fontWeight: 700 }}>
                  Leads e Matrículas por Unidade
                </div>
                <div style={{ fontSize: 12, color: textMuted(0.55) }}>
                  Barra clara = leads recebidos · barra cheia = matrículas fechadas
                </div>
              </div>
              <div style={{ flex: 1, minHeight: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.units.map((u) => ({ ...u, name: unitLabel[u.id], color: unitColor[u.id] }))}>
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#3737b4" }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip />
                    <Bar dataKey="totalLeads" name="Leads" radius={[6, 6, 0, 0]}>
                      {data.units.map((u) => (
                        <Cell key={u.id} fill={unitColor[u.id]} fillOpacity={0.35} />
                      ))}
                    </Bar>
                    <Bar dataKey="matriculas" name="Matrículas" radius={[6, 6, 0, 0]}>
                      {data.units.map((u) => (
                        <Cell key={u.id} fill={unitColor[u.id]} />
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
              <div>
                <div className="font-display" style={{ fontSize: 15, fontWeight: 700 }}>
                  Conversão por Unidade
                </div>
                <div style={{ fontSize: 12, color: textMuted(0.55) }}>
                  Matrículas ÷ total de leads, no período selecionado
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {data.units
                  .slice()
                  .sort((a, b) => b.conversaoPct - a.conversaoPct)
                  .map((u) => (
                    <div key={u.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 800 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 999, background: unitColor[u.id] }} />
                          {unitLabel[u.id]}
                        </div>
                        <span className="font-display" style={{ fontSize: 14, fontWeight: 700 }}>
                          {u.conversaoPct.toFixed(1)}%
                        </span>
                      </div>
                      <div style={{ height: 8, background: "rgba(55,55,180,.08)", borderRadius: 999 }}>
                        <div
                          style={{
                            width: `${Math.min(100, u.conversaoPct * 5)}%`,
                            height: 8,
                            background: unitColor[u.id],
                            borderRadius: 999
                          }}
                        />
                      </div>
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
