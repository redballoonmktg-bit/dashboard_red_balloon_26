"use client";

import { useState } from "react";
import { PageShell, LoadingState, ErrorState } from "@/components/PageShell";
import { MonthFilter } from "@/components/MonthFilter";
import { CycleFilter } from "@/components/CycleFilter";
import { useDashboardData } from "@/components/useDashboardData";
import { brand, unitColor, unitLabel, textMuted } from "@/lib/theme";

const CYCLE_LABELS: Record<string, string> = {
  all: "Todos os ciclos",
  "alta-25-26": "Alta 25-26",
  "baixa-2026": "Baixa 2026",
  "alta-26-27": "Alta 26-27",
  "baixa-2027": "Baixa 2027"
};

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

/**
 * Gráfico de barras por ciclo, feito só com divs (sem lib de gráfico) —
 * mais simples e não depende de medição de layout assíncrona, que em
 * alguns navegadores fazia o gráfico de barras não aparecer.
 */
function CyclesBarChart({ cycles }: { cycles: Array<{ id: string; label: string; leads: number; matriculas: number }> }) {
  const maxLeads = Math.max(...cycles.map((c) => c.leads), 1);
  const maxHeight = 200;

  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-around", height: maxHeight + 40, padding: "0 8px" }}>
      {cycles.map((c) => {
        const color = CYCLE_COLORS[c.id] ?? brand.azulEscuro;
        const leadsH = Math.max(2, Math.round((c.leads / maxLeads) * maxHeight));
        const matH = Math.max(2, Math.round((c.matriculas / maxLeads) * maxHeight));
        return (
          <div key={c.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: maxHeight }}>
              <div
                title={`Leads: ${c.leads.toLocaleString("pt-BR")}`}
                style={{ width: 34, height: leadsH, background: color, opacity: 0.3, borderRadius: "6px 6px 0 0" }}
              />
              <div
                title={`Matrículas: ${c.matriculas.toLocaleString("pt-BR")}`}
                style={{ width: 34, height: matH, background: color, borderRadius: "6px 6px 0 0" }}
              />
            </div>
            <div style={{ fontSize: 12, fontWeight: 800, textAlign: "center" }}>{c.label}</div>
            <div style={{ fontSize: 11, color: textMuted(0.55) }}>
              {c.leads.toLocaleString("pt-BR")} · {c.matriculas.toLocaleString("pt-BR")}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Converte um ângulo (a partir do topo, sentido horário) em ponto x,y num raio r ao redor do centro cx,cy. */
function polarPoint(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** Caminho SVG de uma fatia de rosquinha (donut), do ângulo start ao end, entre raio interno e externo. */
function donutSlicePath(cx: number, cy: number, outerR: number, innerR: number, startDeg: number, endDeg: number) {
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  const p1 = polarPoint(cx, cy, outerR, startDeg);
  const p2 = polarPoint(cx, cy, outerR, endDeg);
  const p3 = polarPoint(cx, cy, innerR, endDeg);
  const p4 = polarPoint(cx, cy, innerR, startDeg);
  return [
    `M ${p1.x} ${p1.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${p4.x} ${p4.y}`,
    "Z"
  ].join(" ");
}

/**
 * Rosquinha de temperatura em SVG de verdade (não CSS gradient) — cada
 * fatia é um <path> com um <title>, que o navegador mostra como tooltip
 * nativo ao passar o mouse, com a quantidade de leads daquela temperatura.
 */
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
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2;
  const innerR = size * 0.31;

  let acc = 0;
  const slices = Object.entries(temp).map(([k, v]) => {
    const start = (acc / total) * 360;
    acc += v;
    const end = (acc / total) * 360;
    const pct = total > 0 ? ((v / total) * 100).toFixed(0) : "0";
    return { key: k, start, end, value: v, pct, color: TEMP_COLORS[k] ?? "#ccc" };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 800 }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: dotColor }} />
        {title}
      </div>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {slices.map(
            (s) =>
              s.value > 0 && (
                <path key={s.key} d={donutSlicePath(cx, cy, outerR, innerR, s.start, s.end)} fill={s.color}>
                  <title>
                    {s.key}: {s.value.toLocaleString("pt-BR")} leads ({s.pct}%)
                  </title>
                </path>
              )
          )}
        </svg>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: size,
            height: size,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none"
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
  const [cycle, setCycle] = useState("all");
  const [month, setMonth] = useState("all");
  const { data, error, loading, reload } = useDashboardData(cycle, month);

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
              gap: 12
            }}
          >
            <div className="font-display" style={{ fontSize: 15, fontWeight: 700 }}>
              Leads e Matrículas por Ciclo Comercial
            </div>
            <div style={{ fontSize: 12, color: textMuted(0.55) }}>
              Barra clara = leads · barra cheia = matrículas. Comparação entre os 4 ciclos da planilha — não é
              afetada pelos filtros abaixo.
            </div>
            <CyclesBarChart cycles={data.cycles} />
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
              <div style={{ fontSize: 12, color: textMuted(0.55) }}>
                {CYCLE_LABELS[cycle]} · passe o mouse sobre as fatias pra ver a quantidade de leads
              </div>
            </div>

            <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
              <CycleFilter value={cycle} onChange={setCycle} />
              <MonthFilter
                availableMonths={data.monthlyEvolution.map((m) => ({ key: m.key, label: m.label }))}
                value={month}
                onChange={setMonth}
              />
            </div>

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
