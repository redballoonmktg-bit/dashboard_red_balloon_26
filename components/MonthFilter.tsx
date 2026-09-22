"use client";

import { textMuted } from "@/lib/theme";

/**
 * Mostra "Geral" + os meses que já têm dado na planilha (vindos de
 * monthlyEvolution). Como a lista vem da própria planilha, ela cresce
 * sozinha conforme novas linhas são preenchidas — não é uma lista fixa
 * de 12 meses "no ar".
 */
export function MonthFilter({
  availableMonths,
  value,
  onChange
}: {
  availableMonths: Array<{ key: string; label: string }>;
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: textMuted(0.6),
          textTransform: "uppercase",
          letterSpacing: "0.05em"
        }}
      >
        Mês
      </span>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <MonthButton label="Geral" active={value === "all"} onClick={() => onChange("all")} />
        {availableMonths.map((m) => (
          <MonthButton
            key={m.key}
            label={m.label}
            active={value === m.key}
            onClick={() => onChange(m.key)}
          />
        ))}
      </div>
    </div>
  );
}

function MonthButton({
  label,
  active,
  onClick
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 12px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 800,
        border: `1px solid ${active ? "#3737b4" : "rgba(55,55,180,.18)"}`,
        cursor: "pointer",
        background: active ? "#3737b4" : "#FFFFFF",
        color: active ? "#FFFFFF" : textMuted(0.65)
      }}
    >
      {label}
    </button>
  );
}
