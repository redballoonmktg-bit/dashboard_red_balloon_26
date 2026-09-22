"use client";

import { useState } from "react";
import { PageShell, Kpi, LoadingState, ErrorState } from "@/components/PageShell";
import { MonthFilter } from "@/components/MonthFilter";
import { useDashboardData } from "@/components/useDashboardData";
import { brand, textMuted } from "@/lib/theme";

export default function CanaisPage() {
  const [month, setMonth] = useState("all");
  const { data, error, loading, reload } = useDashboardData(month);
  const maxLeads = data ? Math.max(...data.channels.map((c) => c.leads), 1) : 1;
  const totalOnlineOutras = data
    ? Math.max(1, data.onlineVsOutras.onlineLeads + data.onlineVsOutras.outrasLeads)
    : 1;

  return (
    <PageShell title="Canais de Origem" subtitle="Leads e matrículas por canal, ciclo Baixa 2026">
      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && (
        <>
          <MonthFilter
            availableMonths={data.monthlyEvolution.map((m) => ({ key: m.key, label: m.label }))}
            value={month}
            onChange={setMonth}
          />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
            <Kpi
              label="Leads via Canais Online"
              value={`${((data.onlineVsOutras.onlineLeads / totalOnlineOutras) * 100).toFixed(0)}%`}
              hint={`${data.onlineVsOutras.onlineLeads.toLocaleString("pt-BR")} leads · Meta, Google, Tráfego Pago, Whatsapp Direto, Link na Bio, Ligação na Unidade`}
              color={brand.azulEscuro}
            />
            <Kpi
              label="Leads via Outras Ações"
              value={`${((data.onlineVsOutras.outrasLeads / totalOnlineOutras) * 100).toFixed(0)}%`}
              hint={`${data.onlineVsOutras.outrasLeads.toLocaleString("pt-BR")} leads · Indicação, MGM, Hubspot e demais`}
            />
          </div>

          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid rgba(55,55,180,.16)",
              borderRadius: 14,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 14
            }}
          >
            <div className="font-display" style={{ fontSize: 15, fontWeight: 700 }}>
              Leads e Matrículas por Canal
            </div>
            {data.channels.map((c) => (
              <div key={c.canal} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ fontWeight: 700 }}>
                    {c.canal}{" "}
                    <span style={{ fontSize: 10, fontWeight: 800, color: textMuted(0.45) }}>
                      {c.online ? "· ONLINE" : "· OUTRAS AÇÕES"}
                    </span>
                  </span>
                  <span style={{ color: textMuted(0.6) }}>
                    {c.leads.toLocaleString("pt-BR")} leads · {c.matriculas.toLocaleString("pt-BR")} matrículas
                  </span>
                </div>
                <div style={{ height: 10, background: "rgba(55,55,180,.06)", borderRadius: 999 }}>
                  <div
                    style={{
                      width: `${(c.leads / maxLeads) * 100}%`,
                      height: 10,
                      borderRadius: 999,
                      background: c.online ? brand.azulClaro : brand.rosa
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </PageShell>
  );
}
