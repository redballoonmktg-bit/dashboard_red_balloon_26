import { NextResponse } from "next/server";
import {
  UNIT_SHEETS,
  CYCLE_SHEETS,
  fetchAllUnitsCurrentCycle,
  fetchAllUnitsForCycle
} from "@/lib/sheets";
import {
  computeFunnelCounts,
  computeGargalo,
  isForaDoPerfil,
  isMatricula,
  classificarCanal,
  isCanalOnline
} from "@/lib/businessRules";
import { parseBrDate, monthKey, monthLabel } from "@/lib/dates";

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

    const allRows = await fetchAllUnitsCurrentCycle();

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
        conversaoPct: pct(funnel.Matrícula, validos.length),
        funnel,
        gargaloPct: computeGargalo(rows)
      };
    });

    // ---------- Agregado (todas as unidades, ciclo atual) ----------
    const validosGeral = currentRows.filter((r) => !isForaDoPerfil(r));
    const foraPerfilGeral = currentRows.length - validosGeral.length;
    const matriculasGeral = currentRows.filter(isMatricula).length;

    const aggregate = {
      totalLeads: currentRows.length,
      matriculas: matriculasGeral,
      conversaoGeralPct: pct(matriculasGeral, validosGeral.length),
      foraDoPerfilPct: pct(foraPerfilGeral, currentRows.length)
    };

    // ---------- Temperatura ----------
    const temperature = { Quente: 0, Morno: 0, Frio: 0, "Fora do Perfil": 0 } as Record<
      string,
      number
    >;
    for (const row of currentRows) {
      const t = row.temperatura.trim();
      if (t === "Quente" || t === "Morno" || t === "Frio" || t === "Fora do Perfil") {
        temperature[t] += 1;
      }
    }

    // ---------- Canais ----------
    const channelMap = new Map<string, { leads: number; matriculas: number; online: boolean }>();
    for (const row of currentRows) {
      const canal = classificarCanal(row.origem);
      const entry = channelMap.get(canal) ?? { leads: 0, matriculas: 0, online: isCanalOnline(canal) };
      entry.leads += 1;
      if (isMatricula(row)) entry.matriculas += 1;
      channelMap.set(canal, entry);
    }
    const channels = Array.from(channelMap.entries())
      .map(([canal, v]) => ({ canal, ...v }))
      .sort((a, b) => b.leads - a.leads);

    const onlineLeads = channels.filter((c) => c.online).reduce((s, c) => s + c.leads, 0);
    const outrasLeads = channels.filter((c) => !c.online).reduce((s, c) => s + c.leads, 0);

    // ---------- Evolução mensal ----------
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

    // ---------- Ciclos (Alta 25-26, Alta 26-27, Baixa 2026, Baixa 2027) ----------
    const cycles = await Promise.all(
      CYCLE_SHEETS.map(async (c) => {
        // O ciclo atual já foi lido acima; reaproveita para não duplicar chamadas.
        const rows =
          c.id === "baixa-2026" ? currentRows : await fetchAllUnitsForCycle(c.sheetSuffix);
        const funnel = computeFunnelCounts(rows);
        return {
          id: c.id,
          label: c.label,
          leads: rows.length,
          matriculas: funnel.Matrícula
        };
      })
    );

    return NextResponse.json({
      updatedAt: new Date().toISOString(),
      units,
      aggregate,
      temperature,
      channels,
      onlineVsOutras: { onlineLeads, outrasLeads },
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
