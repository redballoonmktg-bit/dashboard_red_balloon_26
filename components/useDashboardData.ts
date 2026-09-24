"use client";

import { useEffect, useState, useCallback } from "react";

export interface DashboardData {
  updatedAt: string;
  units: Array<{
    id: "am" | "li" | "pi" | "ta";
    name: string;
    totalLeads: number;
    totalValidos: number;
    matriculas: number;
    conversaoPct: number;
    funnel: Record<string, number>;
    gargaloPct: number;
  }>;
  aggregate: {
    totalLeads: number;
    matriculas: number;
    conversaoGeralPct: number;
    foraDoPerfilPct: number;
  };
  temperature: Record<string, number>;
  temperatureByUnit: Record<string, Record<string, number>>;
  channels: Array<{ canal: string; leads: number; matriculas: number; online: boolean }>;
  onlineVsOutras: { onlineLeads: number; outrasLeads: number };
  channelsByUnit: Record<
    string,
    {
      channels: Array<{ canal: string; leads: number; matriculas: number; online: boolean }>;
      onlineVsOutras: { onlineLeads: number; outrasLeads: number };
    }
  >;
  monthlyEvolution: Array<{
    key: string;
    label: string;
    leads: number;
    matriculas: number;
    conversaoPct: number;
  }>;
  cycles: Array<{ id: string; label: string; leads: number; matriculas: number }>;
}

const REFRESH_SECONDS = Number(process.env.NEXT_PUBLIC_REFRESH_INTERVAL_SECONDS ?? "45");

export function useDashboardData(cycle: string = "all", month: string = "all") {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ cycle, month });
      const res = await fetch(`/api/dashboard?${params.toString()}`, {
        cache: "no-store"
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Falha ao carregar dados.");
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  }, [cycle, month]);

  useEffect(() => {
    setLoading(true);
    load();
    // Busca de novo sempre que a página é aberta / o ciclo ou mês mudam
    // (acima) e, opcionalmente, a cada 30–60s enquanto a tela estiver
    // aberta (requisito funcional).
    const interval = setInterval(load, REFRESH_SECONDS * 1000);
    return () => clearInterval(interval);
  }, [load]);

  return { data, error, loading, reload: load };
}
