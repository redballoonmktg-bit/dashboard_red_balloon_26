import { JWT } from "google-auth-library";
import { google } from "googleapis";

/**
 * Camada de acesso à planilha "Leads 4 Escolas — Ata Baixa".
 *
 * Autentica via conta de serviço (Service Account), conforme o requisito
 * técnico do briefing: sem login manual da equipe.
 *
 * A planilha precisa ser compartilhada (permissão de Leitor) com o e-mail
 * da conta de serviço configurada em GOOGLE_SERVICE_ACCOUNT_EMAIL.
 */

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const SERVICE_ACCOUNT_PRIVATE_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

function getAuth() {
  if (!SERVICE_ACCOUNT_EMAIL || !SERVICE_ACCOUNT_PRIVATE_KEY) {
    throw new Error(
      "Credenciais da conta de serviço ausentes. Configure GOOGLE_SERVICE_ACCOUNT_EMAIL e " +
        "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY em .env.local (veja .env.example)."
    );
  }

  return new JWT({
    email: SERVICE_ACCOUNT_EMAIL,
    // As chaves privadas costumam vir com "\n" literais quando coladas em .env;
    // aqui elas são convertidas de volta para quebras de linha reais.
    key: SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
  });
}

/** Abas de leads por unidade, ciclo Baixa 2026 (as 4 usadas pelo dashboard hoje). */
export const UNIT_SHEETS = [
  { id: "am", name: "Americana", sheet: "AM | Baixa 2026" },
  { id: "li", name: "Limeira", sheet: "LI | Baixa 2026" },
  { id: "pi", name: "Piracicaba", sheet: "PI | Baixa 2026" },
  { id: "ta", name: "Taquaral", sheet: "TA | Baixa 2026" }
] as const;

/** Outras abas de ciclo disponíveis (histórico / futuro), para a página de Ciclos. */
export const CYCLE_SHEETS = [
  { id: "alta-25-26", label: "Alta 25-26", sheetSuffix: "Alta 25-26" },
  { id: "alta-26-27", label: "Alta 26-27", sheetSuffix: "Alta 26-27" },
  { id: "baixa-2026", label: "Baixa 2026", sheetSuffix: "Baixa 2026" },
  { id: "baixa-2027", label: "Baixa 2027", sheetSuffix: "Baixa 2027" }
] as const;

/** Colunas relevantes (ver Seção 3 da especificação técnica). Linha 2 = cabeçalho, dados a partir da linha 3. */
const DATA_START_ROW = 3;

export interface RawLeadRow {
  dataLead: string; // coluna B
  nomeLead: string; // coluna E
  origem: string; // coluna L
  temperatura: string; // coluna N
  etapaFunil: string; // coluna O
  aulaExperimental: string; // coluna P
  dataAulaVisita: string; // coluna Q
  matriculaFlag: string; // coluna R ("Matrícula?" — Sim/Não)
  dataMatricula: string; // coluna S
  unidadeId: string; // adicionado por nós, não existe na planilha
}

/**
 * Índices dentro do intervalo B:S (0 = coluna B). Confirmados contra a
 * planilha real enviada — cada letra de coluna, menos a própria B, fica em
 * "posição na coluna − posição da coluna B" (B=1, C=2, ... na numeração de
 * colunas do Excel/Sheets, A=0).
 */
const COLUMN_INDEX = {
  B: 0,
  E: 3,
  L: 10,
  N: 12,
  O: 13,
  P: 14,
  Q: 15,
  R: 16,
  S: 17
} as const;

function cleanField(raw: unknown): string {
  const s = String(raw ?? "").trim();
  // A planilha usa "-" como placeholder visual em várias colunas de data —
  // isso não é um valor real preenchido.
  if (s === "-" || s === "--") return "";
  return s;
}

function mapRow(row: unknown[], unitId: string): RawLeadRow | null {
  const nomeLead = cleanField(row[COLUMN_INDEX.E]);
  const dataLead = cleanField(row[COLUMN_INDEX.B]);
  const origem = cleanField(row[COLUMN_INDEX.L]);

  // Regra "lead válido": a linha precisa ter Nome do Lead, Data do Lead ou
  // Origem preenchidos (pelo menos um). Algumas linhas reais ficam sem nome
  // registrado, mas têm data e origem — usar só o Nome descartava leads
  // válidos de verdade (conferido contra a aba CONSOLIDADO da planilha).
  // Linhas totalmente vazias (só com um ID de preenchimento automático,
  // sem nenhum dado real) continuam sendo descartadas aqui.
  if (!nomeLead && !dataLead && !origem) return null;

  return {
    dataLead,
    nomeLead,
    origem,
    temperatura: cleanField(row[COLUMN_INDEX.N]),
    etapaFunil: cleanField(row[COLUMN_INDEX.O]),
    aulaExperimental: cleanField(row[COLUMN_INDEX.P]),
    dataAulaVisita: cleanField(row[COLUMN_INDEX.Q]),
    matriculaFlag: cleanField(row[COLUMN_INDEX.R]),
    dataMatricula: cleanField(row[COLUMN_INDEX.S]),
    unidadeId: unitId
  };
}

/**
 * Lê uma aba de leads (uma unidade, um ciclo) e devolve as linhas já
 * mapeadas para os campos que o dashboard usa. Linhas sem "Nome do Lead"
 * (coluna E) são descartadas aqui mesmo — é a regra de "lead válido"
 * (Seção 4 da especificação).
 *
 * Prefira `batchFetchUnits` quando precisar ler mais de uma aba: cada
 * chamada aqui é uma requisição separada à API do Sheets, e a cota
 * gratuita da Google é de 60 leituras por minuto por usuário.
 */
export async function fetchUnitSheet(
  sheetName: string,
  unitId: string
): Promise<RawLeadRow[]> {
  if (!SPREADSHEET_ID) {
    throw new Error(
      "GOOGLE_SHEETS_SPREADSHEET_ID não configurado. Veja .env.example."
    );
  }

  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const range = `'${sheetName}'!B${DATA_START_ROW}:S`;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueRenderOption: "UNFORMATTED_VALUE",
    dateTimeRenderOption: "FORMATTED_STRING"
  });

  const rows = res.data.values ?? [];
  return rows.map((row) => mapRow(row, unitId)).filter((r): r is RawLeadRow => r !== null);
}

/**
 * Lê várias abas em UMA ÚNICA requisição à API do Sheets (batchGet), em vez
 * de uma requisição por aba. Isso é o que mantém o dashboard bem abaixo do
 * limite de cota gratuita do Google (60 leituras/minuto/usuário) mesmo com
 * a atualização automática ligada.
 *
 * Atenção: se QUALQUER uma das abas pedidas não existir na planilha, a
 * chamada inteira falha (comportamento do batchGet) — por isso
 * `fetchAllUnitsForCycle` cai para leituras individuais nesse caso.
 */
async function batchFetchUnits(
  entries: Array<{ sheetName: string; unitId: string }>
): Promise<RawLeadRow[]> {
  if (!SPREADSHEET_ID) {
    throw new Error(
      "GOOGLE_SHEETS_SPREADSHEET_ID não configurado. Veja .env.example."
    );
  }

  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const ranges = entries.map((e) => `'${e.sheetName}'!B${DATA_START_ROW}:S`);

  const res = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: SPREADSHEET_ID,
    ranges,
    valueRenderOption: "UNFORMATTED_VALUE",
    dateTimeRenderOption: "FORMATTED_STRING"
  });

  const valueRanges = res.data.valueRanges ?? [];
  const out: RawLeadRow[] = [];

  valueRanges.forEach((vr, i) => {
    const rows = vr.values ?? [];
    const unitId = entries[i]?.unitId ?? "";
    for (const row of rows) {
      const mapped = mapRow(row, unitId);
      if (mapped) out.push(mapped);
    }
  });

  return out;
}

/**
 * Busca as 4 unidades do ciclo atual (Baixa 2026) em UMA requisição batelada.
 */
export async function fetchAllUnitsCurrentCycle(): Promise<RawLeadRow[]> {
  return batchFetchUnits(UNIT_SHEETS.map((u) => ({ sheetName: u.sheet, unitId: u.id })));
}

/** Busca uma aba de um ciclo específico, para uma unidade específica (usado na página de Ciclos). */
export async function fetchUnitCycle(
  unitPrefix: "AM" | "LI" | "PI" | "TA",
  cycleSuffix: string,
  unitId: string
): Promise<RawLeadRow[]> {
  return fetchUnitSheet(`${unitPrefix} | ${cycleSuffix}`, unitId);
}

const UNIT_PREFIX: Record<string, "AM" | "LI" | "PI" | "TA"> = {
  am: "AM",
  li: "LI",
  pi: "PI",
  ta: "TA"
};

/**
 * Busca as 4 unidades para um ciclo arbitrário (ex.: "Alta 25-26"), em UMA
 * requisição batelada. Se a aba de alguma unidade não existir para aquele
 * ciclo (o batchGet inteiro falha nesse caso), cai para leituras
 * individuais — mais lento, mas resiliente: a unidade sem aba entra com 0
 * leads em vez de derrubar a página inteira.
 */
export async function fetchAllUnitsForCycle(cycleSuffix: string): Promise<RawLeadRow[]> {
  const entries = UNIT_SHEETS.map((u) => ({
    sheetName: `${UNIT_PREFIX[u.id]} | ${cycleSuffix}`,
    unitId: u.id
  }));

  try {
    return await batchFetchUnits(entries);
  } catch {
    const results = await Promise.all(
      entries.map((e) => fetchUnitSheet(e.sheetName, e.unitId).catch(() => [] as RawLeadRow[]))
    );
    return results.flat();
  }
}
