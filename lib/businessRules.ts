import type { RawLeadRow } from "./sheets";

/**
 * Regras de negócio (Seção 4 da especificação técnica).
 * Calculadas em código — nunca replicando fórmulas da planilha original,
 * que continha inconsistências já identificadas e corrigidas aqui.
 */

export const FUNNEL_STAGES = [
  "1º Contato",
  "Follow-up",
  "Visita Agendada",
  "Visita Realizada",
  "Em Negociação",
  "Matrícula"
] as const;

export type FunnelStage = (typeof FUNNEL_STAGES)[number];

function norm(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Matrícula: Etapa do Funil = "Matrícula" OU Data Matrícula preenchida OU
 * a coluna "Matrícula?" = "Sim" (campo confirmado na planilha real, um
 * terceiro sinal redundante que deixa a regra mais robusta a atualização
 * manual incompleta de qualquer um dos outros dois campos).
 */
export function isMatricula(row: RawLeadRow): boolean {
  return (
    norm(row.etapaFunil) === "matrícula" ||
    row.dataMatricula.trim().length > 0 ||
    norm(row.matriculaFlag) === "sim"
  );
}

/** Visita agendada: Data Aula/Visita preenchida OU Aula Experimental? = "Sim". */
export function isVisitaAgendada(row: RawLeadRow): boolean {
  return row.dataAulaVisita.trim().length > 0 || norm(row.aulaExperimental) === "sim";
}

/** Visita realizada: Aula Experimental? = "Sim". */
export function isVisitaRealizada(row: RawLeadRow): boolean {
  return norm(row.aulaExperimental) === "sim";
}

/** Fora do perfil: Temperatura ou Etapa marcadas como "Fora do Perfil". */
export function isForaDoPerfil(row: RawLeadRow): boolean {
  return norm(row.temperatura) === "fora do perfil" || norm(row.etapaFunil) === "fora do perfil";
}

export function isPerdido(row: RawLeadRow): boolean {
  return norm(row.etapaFunil) === "perdido";
}

/**
 * Contagem de leads por etapa do funil (para os funis agregados/por unidade).
 * Cada lead conta uma vez, na sua etapa "mais avançada" alcançada — não é a
 * etapa atual isolada, é o funil cumulativo (quantos leads já passaram por
 * 1º Contato, quantos já tiveram Visita Agendada, etc.), que é o que o
 * briefing pede para visualizar como funil clássico.
 */
export function computeFunnelCounts(rows: RawLeadRow[]) {
  const counts: Record<FunnelStage, number> = {
    "1º Contato": 0,
    "Follow-up": 0,
    "Visita Agendada": 0,
    "Visita Realizada": 0,
    "Em Negociação": 0,
    Matrícula: 0
  };

  for (const row of rows) {
    if (isForaDoPerfil(row)) continue; // fora de perfil não entra no funil comercial

    // 1º Contato: todo lead válido, não fora de perfil, passou por aqui.
    counts["1º Contato"] += 1;

    const etapa = norm(row.etapaFunil);
    const passouFollowUp =
      etapa !== "1º contato" || isVisitaAgendada(row) || isMatricula(row);
    if (passouFollowUp) counts["Follow-up"] += 1;

    if (isVisitaAgendada(row)) counts["Visita Agendada"] += 1;
    if (isVisitaRealizada(row)) counts["Visita Realizada"] += 1;

    if (etapa === "em negociação" || isMatricula(row)) counts["Em Negociação"] += 1;
    if (isMatricula(row)) counts["Matrícula"] += 1;
  }

  return counts;
}

/** % travado no 1º Contato = 1º Contato ÷ (Total de leads − Fora de Perfil). */
export function computeGargalo(rows: RawLeadRow[]): number {
  const totalValido = rows.filter((r) => !isForaDoPerfil(r)).length;
  if (totalValido === 0) return 0;
  const counts = computeFunnelCounts(rows);
  // "Travado" = ficou só no 1º contato, não avançou para follow-up.
  const travado = counts["1º Contato"] - counts["Follow-up"];
  return (travado / totalValido) * 100;
}

/**
 * % Visita → Matrícula: conta matrícula apenas entre quem tem
 * Aula Experimental = "Sim" — nunca dividir o total de matrículas pelo
 * total de visitas agendadas (gera números acima de 100%, erro que já
 * existia na planilha original).
 */
export function computeVisitaParaMatricula(rows: RawLeadRow[]): number {
  const comAulaExperimental = rows.filter(isVisitaRealizada);
  if (comAulaExperimental.length === 0) return 0;
  const matriculados = comAulaExperimental.filter(isMatricula).length;
  return (matriculados / comAulaExperimental.length) * 100;
}

// ---------------------------------------------------------------------------
// Classificação de canal (Seção 5 da especificação técnica)
// ---------------------------------------------------------------------------

export type CanalOrigem =
  | "Meta (Facebook + Instagram)"
  | "Google"
  | "Whatsapp Direto"
  | "Tráfego Pago (geral)"
  | "Indicação"
  | "MGM"
  | "Hubspot"
  | "Lead Antigo"
  | "Ação Comercial/Evento"
  | "Visita Espontânea"
  | "Ligação na Unidade"
  | "Link na Bio"
  | "Não Informado"
  | "Outros";

const CANAL_RULES: Array<{ test: (s: string) => boolean; canal: CanalOrigem }> = [
  { test: (s) => /meta|facebook|instagram/.test(s), canal: "Meta (Facebook + Instagram)" },
  { test: (s) => /google/.test(s), canal: "Google" },
  { test: (s) => /whatsapp direto/.test(s), canal: "Whatsapp Direto" },
  { test: (s) => /trafego pago|tráfego pago/.test(s), canal: "Tráfego Pago (geral)" },
  { test: (s) => /indica/.test(s), canal: "Indicação" },
  { test: (s) => /mgm/.test(s), canal: "MGM" },
  { test: (s) => /hubspot/.test(s), canal: "Hubspot" },
  { test: (s) => /lead antigo/.test(s), canal: "Lead Antigo" },
  { test: (s) => /coml|comercial/.test(s), canal: "Ação Comercial/Evento" },
  { test: (s) => /espont/.test(s), canal: "Visita Espontânea" },
  { test: (s) => /liga/.test(s), canal: "Ligação na Unidade" },
  { test: (s) => /link na bio/.test(s), canal: "Link na Bio" }
];

const ONLINE_CANAIS: CanalOrigem[] = [
  "Meta (Facebook + Instagram)",
  "Google",
  "Tráfego Pago (geral)",
  "Whatsapp Direto",
  "Link na Bio",
  "Ligação na Unidade"
];

export function classificarCanal(origemTexto: string): CanalOrigem {
  const texto = norm(origemTexto);
  if (texto.length === 0) return "Não Informado";
  for (const rule of CANAL_RULES) {
    if (rule.test(texto)) return rule.canal;
  }
  return "Outros";
}

export function isCanalOnline(canal: CanalOrigem): boolean {
  return ONLINE_CANAIS.includes(canal);
}

// ---------------------------------------------------------------------------
// Marketing digital (Seção 6): CPC, CPL, CAC
// ---------------------------------------------------------------------------

export interface CampanhaMarketing {
  canal: "Meta" | "Google";
  campanha: string;
  investido: number;
  cliques: number;
  leads: number;
}

export function cpc(c: Pick<CampanhaMarketing, "investido" | "cliques">): number {
  return c.cliques > 0 ? c.investido / c.cliques : 0;
}

export function cpl(c: Pick<CampanhaMarketing, "investido" | "leads">): number {
  return c.leads > 0 ? c.investido / c.leads : 0;
}

export function cac(investidoTotal: number, matriculas: number): number {
  return matriculas > 0 ? investidoTotal / matriculas : 0;
}
