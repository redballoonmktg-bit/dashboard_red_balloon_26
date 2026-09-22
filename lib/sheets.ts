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
const RANGE_COLUMNS = "B:S";
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

/**
 * Lê uma aba de leads (uma unidade, um ciclo) e devolve as linhas já
 * mapeadas para os campos que o dashboard usa. Linhas sem "Nome do Lead"
 * (coluna E) são descartadas aqui mesmo — é a regra de "lead válido"
 * (Seção 4 da especificação).
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

  const range = `'${sheetName}'!${RANGE_COLUMNS}${DATA_START_ROW}:${RANGE_COLUMNS.split(":")[1]}`;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueRenderOption: "UNFORMATTED_VALUE",
    dateTimeRenderOption: "FORMATTED_STRING"
  });

  const rows = res.data.values ?? [];

  return rows
    .map((row): RawLeadRow => ({
      dataLead: String(row[COLUMN_INDEX.B] ?? ""),
      nomeLead: String(row[COLUMN_INDEX.E] ?? ""),
      origem: String(row[COLUMN_INDEX.L] ?? ""),
      temperatura: String(row[COLUMN_INDEX.N] ?? ""),
      etapaFunil: String(row[COLUMN_INDEX.O] ?? ""),
      aulaExperimental: String(row[COLUMN_INDEX.P] ?? ""),
      dataAulaVisita: String(row[COLUMN_INDEX.Q] ?? ""),
      matriculaFlag: String(row[COLUMN_INDEX.R] ?? ""),
      dataMatricula: String(row[COLUMN_INDEX.S] ?? ""),
      unidadeId: unitId
    }))
    // Regra "lead válido": precisa ter Nome do Lead preenchido.
    .filter((r) => r.nomeLead.trim().length > 0);
}

/** Busca as 4 unidades do ciclo atual (Baixa 2026) em paralelo. */
export async function fetchAllUnitsCurrentCycle(): Promise<RawLeadRow[]> {
  const results = await Promise.all(
    UNIT_SHEETS.map((u) => fetchUnitSheet(u.sheet, u.id))
  );
  return results.flat();
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
 * Busca as 4 unidades para um ciclo arbitrário (ex.: "Alta 25-26").
 * Resiliente: se a aba de uma unidade não existir para aquele ciclo,
 * essa unidade simplesmente entra com 0 leads em vez de derrubar a página.
 */
export async function fetchAllUnitsForCycle(cycleSuffix: string): Promise<RawLeadRow[]> {
  const results = await Promise.all(
    UNIT_SHEETS.map((u) =>
      fetchUnitCycle(UNIT_PREFIX[u.id], cycleSuffix, u.id).catch(() => [] as RawLeadRow[])
    )
  );
  return results.flat();
}
