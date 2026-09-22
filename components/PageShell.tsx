"use client";

import { Header, Nav } from "./Nav";
import { textMuted } from "@/lib/theme";

export function PageShell({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FFFFFF",
        color: "#3737b4",
        padding: "40px 48px",
        display: "flex",
        flexDirection: "column",
        gap: 20
      }}
    >
      <Header title={title} subtitle={subtitle} />
      <Nav />
      {children}
      <div style={{ fontSize: 11, color: textMuted(0.4), fontStyle: "italic" }}>
        Fonte: planilha &quot;Leads 4 Escolas — Ata Baixa&quot; · atualização automática a cada{" "}
        {process.env.NEXT_PUBLIC_REFRESH_INTERVAL_SECONDS ?? "45"}s.
      </div>
    </div>
  );
}

export function Kpi({
  label,
  value,
  hint,
  color = "#3737b4"
}: {
  label: string;
  value: string;
  hint?: string;
  color?: string;
}) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(55,55,180,.16)",
        borderRadius: 14,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 6
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: textMuted(0.6)
        }}
      >
        {label}
      </div>
      <div className="font-display" style={{ fontSize: 32, fontWeight: 800, color }}>
        {value}
      </div>
      {hint && <div style={{ fontSize: 12, color: textMuted(0.55) }}>{hint}</div>}
    </div>
  );
}

export function LoadingState() {
  return (
    <div style={{ padding: 48, textAlign: "center", color: textMuted(0.55) }}>
      Carregando dados da planilha…
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      style={{
        padding: 24,
        background: "rgba(240,60,60,.06)",
        border: "1px solid rgba(240,60,60,.25)",
        borderRadius: 14,
        color: "#f03c3c",
        display: "flex",
        flexDirection: "column",
        gap: 10
      }}
    >
      <div style={{ fontWeight: 800 }}>Não foi possível carregar os dados</div>
      <div style={{ fontSize: 13 }}>{message}</div>
      <button
        onClick={onRetry}
        style={{
          alignSelf: "flex-start",
          padding: "8px 16px",
          borderRadius: 999,
          border: "1px solid #f03c3c",
          background: "#FFFFFF",
          color: "#f03c3c",
          fontWeight: 700,
          cursor: "pointer"
        }}
      >
        Tentar de novo
      </button>
    </div>
  );
}
