/**
 * Paleta e tokens da identidade visual Red Balloon (Guia de Marca, Seção 2.0 Cores).
 * Usar sempre estes valores — não introduzir cores fora da paleta oficial.
 */
export const brand = {
  azulEscuro: "#3737b4",
  vermelho: "#f03c3c",
  verde: "#2d9164",
  amarelo: "#fabe2d",
  azulClaro: "#a0d2fa",
  rosa: "#faaadc",
  branco: "#ffffff"
} as const;

/** Cor fixa por unidade, consistente em todos os gráficos (briefing, Requisitos de Estética). */
export const unitColor: Record<"am" | "li" | "pi" | "ta", string> = {
  am: brand.azulClaro, // Americana
  li: brand.verde, // Limeira
  pi: brand.rosa, // Piracicaba
  ta: brand.amarelo // Taquaral
};

export const unitLabel: Record<"am" | "li" | "pi" | "ta", string> = {
  am: "Americana",
  li: "Limeira",
  pi: "Piracicaba",
  ta: "Taquaral"
};

/** Vermelho reservado para alertas/gargalos; azul-escuro para estrutura/texto primário. */
export const semantic = {
  positivo: brand.verde,
  alerta: brand.vermelho,
  primario: brand.azulEscuro
} as const;

export const textMuted = (alpha: number) => `rgba(55,55,180,${alpha})`;
export const border = "rgba(55,55,180,.16)";
