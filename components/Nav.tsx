"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { textMuted } from "@/lib/theme";

const TABS = [
  { href: "/", label: "Visão Geral" },
  { href: "/ciclos", label: "Ciclos e Perfil" },
  { href: "/funil", label: "Funil por Unidade" },
  { href: "/canais", label: "Canais de Origem" },
  { href: "/evolucao", label: "Evolução Mensal" }
];

export function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Image src="/red-balloon-logo.png" alt="Red Balloon" width={140} height={76} style={{ height: 44, width: "auto" }} priority />
        <div style={{ width: 1, height: 32, background: "rgba(55,55,180,.16)" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div className="font-display" style={{ fontWeight: 800, fontSize: 18 }}>
            {title}
          </div>
          <div style={{ fontSize: 12, color: textMuted(0.62) }}>{subtitle}</div>
        </div>
      </div>
      <LiveBadge />
    </div>
  );
}

function LiveBadge() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 14px",
        background: "rgba(240,60,60,.06)",
        border: "1px solid rgba(240,60,60,.2)",
        borderRadius: 999
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: 999, background: "#f03c3c", display: "inline-block" }} />
      <span style={{ fontSize: 12, fontWeight: 700, color: "#f03c3c" }}>Dados ao vivo</span>
    </div>
  );
}

export function Nav() {
  const pathname = usePathname();
  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        borderBottom: "2px solid rgba(55,55,180,.1)",
        flexWrap: "wrap"
      }}
    >
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={active ? "font-display" : undefined}
            style={{
              fontSize: 13,
              fontWeight: 700,
              padding: "9px 16px",
              borderRadius: active ? "8px 8px 0 0" : 0,
              color: active ? "#FFFFFF" : textMuted(0.6),
              background: active ? "#3737b4" : "transparent"
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
