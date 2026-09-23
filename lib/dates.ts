export const MONTH_LABELS_PT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez"
];

/**
 * Interpreta uma data vinda do Google Sheets (dateTimeRenderOption
 * FORMATTED_STRING).
 *
 * IMPORTANTE: a planilha real usa formato mês/dia/ano (ex.: "9/21/2026" =
 * 21 de setembro), não dia/mês/ano — confirmado direto na tela do Sheets.
 * Também aceitamos "aaaa-mm-dd" como fallback, sem essa ambiguidade.
 *
 * Datas fora de um intervalo plausível (2020–2035), ou com mês/dia fora do
 * intervalo válido, são tratadas como inválidas — evita que um erro de
 * digitação na planilha vire um "mês fantasma" no filtro de Evolução Mensal.
 */
export function parseBrDate(value: string): Date | null {
  const v = value.trim();
  if (!v) return null;

  const us = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (us) {
    const [, mo, d, y] = us;
    const month = Number(mo);
    const day = Number(d);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const year = y.length === 2 ? Number(`20${y}`) : Number(y);
    const date = new Date(year, month - 1, day);
    return isPlausible(date) ? date : null;
  }

  const iso = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const [, y, m, d] = iso;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return isPlausible(date) ? date : null;
  }

  return null;
}

function isPlausible(date: Date): boolean {
  if (Number.isNaN(date.getTime())) return false;
  const year = date.getFullYear();
  return year >= 2020 && year <= 2035;
}

/** Chave "AAAA-MM" para agrupar por mês. */
export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Rótulo com ano (ex.: "Abr/26") — evita ambiguidade quando os dados cobrem mais de um ano. */
export function monthLabel(date: Date): string {
  const yy = String(date.getFullYear()).slice(-2);
  return `${MONTH_LABELS_PT[date.getMonth()]}/${yy}`;
}
