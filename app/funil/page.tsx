"use client";

import { useState } from "react";
import { PageShell, LoadingState, ErrorState } from "@/components/PageShell";
import { MonthFilter } from "@/components/MonthFilter";
import { useDashboardData } from "@/components/useDashboardData";
import { unitColor, unitLabel, textMuted } from "@/lib/theme";
import { FUNNEL_STAGES } from "@/lib/businessRules";

export default function FunilPorUnidadePage() {
  const [month, setMonth] = useState("all");
  const { data, error, loading, reload } = useDashboardData(month);

  const worstUnitId = data
    ? data.units.reduce((worst, u) => (u.gargaloPct > worst.gargaloPct ? u : worst), data.units[0]).id
    : null;

  return (
    <PageShell title="Funil por Unidade" subtitle="Ciclo Baixa 2026 · funil comercial por unidade">
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
            {data.units.map((u) => {
              const isWorst = u.id === worstUnitId;
              const stage0 = u.funnel[FUNNEL_STAGES[0]] || 1;
              return (
                <div
                  key={u.id}
                  style={{
                    background: "#FFFFFF",
                    border: `${isWorst ? 2 : 1}px solid ${isWorst ? "#f03c3c" : "rgba(55,55,180,.16)"}`,
                    borderRadius: 14,
                    padding: 18,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 800 }}>
                      <span style={{ width: 9, height: 9, borderRadius: 999, background: unitColor[u.id] }} />
                      {unitLabel[u.id]}
                    </div>
                    <span style={{ fontSize: 11, color: textMuted(0.55) }}>{u.totalLeads} leads</span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {FUNNEL_STAGES.map((stage, i) => {
                      const value = u.funnel[stage] || 0;
                      const pct = Math.max(0.08, value / stage0);
                      const opacity = [1, 0.82, 0.68, 0.54, 0.4, 0.26][i];
                      return (
                        <div key={stage} style={{ display: "flex", justifyContent: "center" }}>
                          <div
                            style={{
                              width: `${pct * 100}%`,
                              minWidth: 40,
                              height: 30,
                              background: unitColor[u.id],
                              opacity,
                              borderRadius: 6,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#3737b4",
                              fontSize: i < 4 ? 11 : 10,
                              fontWeight: 800,
                              whiteSpace: "nowrap"
                            }}
                          >
                            {i < 4 ? `${stage} · ${value}` : value}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div
                    style={{
                      marginTop: "auto",
                      padding: "10px 12px",
                      background: isWorst ? "rgba(240,60,60,.08)" : "rgba(55,55,180,.05)",
                      borderRadius: 8
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        color: isWorst ? "#f03c3c" : "#3737b4"
                      }}
                    >
                      {isWorst ? "Maior gargalo da rede" : "Gargalo principal"}
                    </div>
                    <div style={{ fontSize: 12, color: isWorst ? "#f03c3c" : textMuted(0.7) }}>
                      {u.gargaloPct.toFixed(1)}% dos leads travam em 1º Contato
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </PageShell>
  );
}
