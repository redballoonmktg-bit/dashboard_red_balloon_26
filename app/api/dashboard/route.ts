import { NextResponse } from "next/server";
import { UNIT_SHEETS, CYCLE_SHEETS, fetchAllUnitsForCycle } from "@/lib/sheets";
import {
  computeFunnelCounts,
  computeGargalo,
  isForaDoPerfil,
  isMatricula,
  classificarCanal,
  isCanalOnline
} from "@/lib/businessRules";
import { parseBrDate, monthKey, monthLabel } from "@/lib/dates";
import type { RawLeadRow } from "@/lib/sheets";

// Sempre dinâmica: lê a planilha a cada request, nunca pré-renderiza em build.
export const dynamic = "force-dynamic";
export const revalidate = 30;

function pct(n: number, d: number): number {
  return d > 0 ? (n / d) * 100 : 0;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const monthFilter = searchParams.get("month"); // "YYYY-MM" ou null/"all"
    const cycleFilter = searchParams.get("cycle") ?? "all"; // "all" | "alta-25-26" | "baixa-2026" | ...

    // Busca os 4 ciclos UMA vez só (em paralelo) e reaproveita esse
    // resultado tanto pra comparação entre ciclos quanto pro escopo
    // selecionado (Geral ou um ciclo específico) — antes isso buscava os
    // mesmos dados duas vezes, o que deixava a página lenta e arriscava
    // estourar o tempo limite da função na Vercel.
    const rowsByCycle = await Promise.all(
      CYCLE_SHEETS.map(async (c) => ({
        id: c.id,
        label: c.label,
        rows: await fetchAllUnitsForCycle(c.sheetSuffix)
      }))
    );

    const cycles = rowsByCycle.map((c) => {
      const funnel = computeFunnelCounts(c.rows);
      return { id: c.id, label: c.label, leads: c.rows.length, matriculas: funnel.Matrícula };
    });

    // allRows = todas as linhas do ciclo (ou dos 4 ciclos) selecionado, sem
    // filtro de mês — usado pra montar a lista de meses disponíveis.
    const allRows: RawLeadRow[] =
      cycleFilter === "all"
        ? rowsByCycle.flatMap((c) => c.rows)
        : rowsByCycle.find((c) => c.id === cycleFilter)?.rows ?? rowsByCycle.flatMap((c) => c.rows);

    // Filtro de mês: aplica-se aos dados por unidade, ao agregado, à
    // temperatura e aos canais — mas não à lista de meses disponíveis
    // (monthlyEvolution) nem à comparação de ciclos, que continuam
    // mostrando o quadro completo para dar contexto.
    const currentRows =
      monthFilter && monthFilter !== "all"
        ? allRows.filter((r) => {
            const d = parseBrDate(r.dataLead);
            return d ? monthKey(d) === monthFilter : false;
          })
        : allRows;

    // ---------- Por unidade ----------
    const units = UNIT_SHEETS.map((u) => {
      const rows = currentRows.filter((r) => r.unidadeId === u.id);
      const validos = rows.filter((r) => !isForaDoPerfil(r));
      const funnel = computeFunnelCounts(rows);
      return {
        id: u.id,
        name: u.name,
        totalLeads: rows.length,
        totalValidos: validos.length,
        matriculas: funnel.Matrícula,
        conversaoPct: pct(funnel.Matrícula, rows.length),
        funnel,
        gargaloPct: computeGargalo(rows)
      };
    });

    // ---------- Agregado (unidades somadas, no escopo de ciclo/mês selecionado) ----------
    const validosGeral = currentRows.filter((r) => !isForaDoPerfil(r));
    const foraPerfilGeral = currentRows.length - validosGeral.length;
    const matriculasGeral = currentRows.filter(isMatricula).length;

    const aggregate = {
      totalLeads: currentRows.length,
      matriculas: matriculasGeral,
      conversaoGeralPct: pct(matriculasGeral, currentRows.length),
      foraDoPerfilPct: pct(foraPerfilGeral, currentRows.length)
    };

    // ---------- Temperatura (geral + por unidade) ----------
    const TEMP_LABELS = ["Quente", "Morno", "Frio", "Fora do Perfil"] as const;
    function emptyTempBucket(): Record<string, number> {
      return { Quente: 0, Morno: 0, Frio: 0, "Fora do Perfil": 0 };
    }
    // Mapa normalizado (minúsculo, sem espaço nas pontas) -> rótulo canônico.
    // A planilha real tem algumas linhas com "morno" em minúsculo, por
    // exemplo — sem essa normalização, essas linhas ficavam de fora da
    // contagem (conferido contra a aba CONSOLIDADO).
    const TEMP_NORM: Record<string, (typeof TEMP_LABELS)[number]> = {};
    for (const label of TEMP_LABELS) TEMP_NORM[label.toLowerCase()] = label;

    const temperature = emptyTempBucket();
    const temperatureByUnit: Record<string, Record<string, number>> = {
      am: emptyTempBucket(),
      li: emptyTempBucket(),
      pi: emptyTempBucket(),
      ta: emptyTempBucket()
    };
    for (const row of currentRows) {
      const canonical = TEMP_NORM[row.temperatura.trim().toLowerCase()];
      if (canonical) {
        temperature[canonical] += 1;
        if (temperatureByUnit[row.unidadeId]) {
          temperatureByUnit[row.unidadeId][canonical] += 1;
        }
      }
    }

    // ---------- Canais (geral + por unidade, pro filtro de unidade na tela) ----------
    function buildChannels(rows: RawLeadRow[]) {
      const map = new Map<string, { leads: number; matriculas: number; online: boolean }>();
      for (const row of rows) {
        const canal = classificarCanal(row.origem);
        const entry = map.get(canal) ?? { leads: 0, matriculas: 0, online: isCanalOnline(canal) };
        entry.leads += 1;
        if (isMatricula(row)) entry.matriculas += 1;
        map.set(canal, entry);
      }
      const list = Array.from(map.entries())
        .map(([canal, v]) => ({ canal, ...v }))
        .sort((a, b) => b.leads - a.leads);
      const onlineLeads = list.filter((c) => c.online).reduce((s, c) => s + c.leads, 0);
      const outrasLeads = list.filter((c) => !c.online).reduce((s, c) => s + c.leads, 0);
      return { channels: list, onlineVsOutras: { onlineLeads, outrasLeads } };
    }

    const channelsGeral = buildChannels(currentRows);
    const channelsByUnit: Record<string, ReturnType<typeof buildChannels>> = {
      am: buildChannels(currentRows.filter((r) => r.unidadeId === "am")),
      li: buildChannels(currentRows.filter((r) => r.unidadeId === "li")),
      pi: buildChannels(currentRows.filter((r) => r.unidadeId === "pi")),
      ta: buildChannels(currentRows.filter((r) => r.unidadeId === "ta"))
    };

    // ---------- Evolução mensal (lista de meses disponíveis no escopo selecionado) ----------
    type MonthBucket = { leads: number; matriculas: number };
    const monthly = new Map<string, MonthBucket>();

    for (const row of allRows) {
      const date = parseBrDate(row.dataLead);
      if (!date) continue;
      const key = monthKey(date);
      const bucket = monthly.get(key) ?? { leads: 0, matriculas: 0 };
      bucket.leads += 1;
      if (isMatricula(row)) bucket.matriculas += 1;
      monthly.set(key, bucket);
    }

    const monthlyEvolution = Array.from(monthly.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => {
        const [y, m] = key.split("-");
        const date = new Date(Number(y), Number(m) - 1, 1);
        return {
          key,
          label: monthLabel(date),
          leads: v.leads,
          matriculas: v.matriculas,
          conversaoPct: pct(v.matriculas, v.leads)
        };
      });

    return NextResponse.json({
      updatedAt: new Date().toISOString(),
      units,
      aggregate,
      temperature,
      temperatureByUnit,
      channels: channelsGeral.channels,
      onlineVsOutras: channelsGeral.onlineVsOutras,
      channelsByUnit,
      monthlyEvolution,
      cycles
    });
  } catch (err) {
    console.error("Erro ao montar dados do dashboard:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Erro desconhecido ao ler a planilha. Verifique as credenciais em .env.local."
      },
      { status: 500 }
    );
  }
}
