"use client";

import { useState } from "react";
import { PageShell, LoadingState, ErrorState } from "@/components/PageShell";
import { MonthFilter } from "@/components/MonthFilter";
import { CycleFilter } from "@/components/CycleFilter";
import { useDashboardData } from "@/components/useDashboardData";
import { unitColor, unitLabel, textMuted } from "@/lib/theme";
import { FUNNEL_STAGES } from "@/lib/businessRules";

export default function FunilPorUnidadePage() {
  const [cycle, setCycle] = useState("all");
  const [month, setMonth] = useState("all");
  const { data, error, loading, reload } = useDashboardData(cycle, month);

  const worstUnitId = data
    ? data.units.reduce((worst, u) => (u.gargaloPct > worst.gargaloPct ? u : worst), data.units[0]).id
    : null;

  return (
    <PageShell title="Funil por Unidade" subtitle="Funil comercial por unidade">
      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && (
        <>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
            <CycleFilter value={cycle} onChange={setCycle} />
            <MonthFilter
              availableMonths={data.monthlyEvolution.map((m) => ({ key: m.key, label: m.label }))}
              value={month}
              onChange={setMonth}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            {data.units.map((u) => {
              const isWorst = u.id === worstUnitId;
              const primeiroContato = u.funnel[FUNNEL_STAGES[0]] || 0;
              const stage0 = primeiroContato || 1; // evita divisão por zero só no cálculo da barra
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
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 800 }}>
                      <span style={{ width: 9, height: 9, borderRadius: 999, background: unitColor[u.id] }} />
                      {unitLabel[u.id]}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, color: textMuted(0.55) }}>{primeiroContato} no funil</div>
                      {u.totalLeads - primeiroContato > 0 && (
                        <div style={{ fontSize: 10, color: textMuted(0.4) }}>
                          + {u.totalLeads - primeiroContato} fora do perfil
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {FUNNEL_STAGES.map((stage, i) => {
                      const value = u.funnel[stage] || 0;
                      const pct = Math.max(0.06, value / stage0);
                      return (
                        <div key={stage} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div
                            style={{
                              width: 78,
                              flexShrink: 0,
                              fontSize: 10,
                              fontWeight: 700,
                              color: textMuted(0.65),
                              textAlign: "right",
                              lineHeight: 1.2
                            }}
                          >
                            {stage}
                          </div>
                          <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
                            <div
                              style={{
                                width: `${pct * 100}%`,
                                minWidth: 6,
                                height: 20,
                                background: unitColor[u.id],
                                borderRadius: 4
                              }}
                            />
                          </div>
                          <div style={{ width: 28, flexShrink: 0, fontSize: 12, fontWeight: 800, color: "#3737b4" }}>
                            {value}
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
