"use client";

import { useEffect, useRef, useState } from "react";
import { textMuted } from "@/lib/theme";

const CYCLE_OPTIONS = [
  { key: "all", label: "Geral (todos os ciclos)" },
  { key: "alta-25-26", label: "Alta 25-26" },
  { key: "baixa-2026", label: "Baixa 2026" },
  { key: "alta-26-27", label: "Alta 26-27" },
  { key: "baixa-2027", label: "Baixa 2027" }
];

/** Menu suspenso pra escolher o ciclo comercial (ou "Geral", todos combinados). */
export function CycleFilter({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = CYCLE_OPTIONS.find((o) => o.key === value) ?? CYCLE_OPTIONS[0];

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: textMuted(0.6),
          textTransform: "uppercase",
          letterSpacing: "0.05em"
        }}
      >
        Ciclo
      </span>

      <div ref={rootRef} style={{ position: "relative" }}>
        <button
          onClick={() => setOpen((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 800,
            border: "1px solid rgba(55,55,180,.22)",
            cursor: "pointer",
            background: "#FFFFFF",
            color: "#3737b4",
            minWidth: 190,
            justifyContent: "space-between"
          }}
        >
          {selected.label}
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#3737b4"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {open && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              zIndex: 20,
              background: "#FFFFFF",
              border: "1px solid rgba(55,55,180,.16)",
              borderRadius: 12,
              boxShadow: "0 12px 28px rgba(55,55,180,.16)",
              padding: 6,
              minWidth: 200,
              display: "flex",
              flexDirection: "column",
              gap: 2
            }}
          >
            {CYCLE_OPTIONS.map((o) => {
              const isSelected = o.key === value;
              return (
                <button
                  key={o.key}
                  onClick={() => {
                    onChange(o.key);
                    setOpen(false);
                  }}
                  style={{
                    textAlign: "left",
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "none",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: isSelected ? 800 : 600,
                    background: isSelected ? "rgba(55,55,180,.08)" : "transparent",
                    color: isSelected ? "#3737b4" : textMuted(0.75)
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = "rgba(55,55,180,.04)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = "transparent";
                  }}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
