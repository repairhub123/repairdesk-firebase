import React, { useState } from "react";
import { THEMES, applyTheme, getStoredTheme } from "@/lib/theme";
import { Check } from "lucide-react";

export default function Settings() {
  const [current, setCurrent] = useState(getStoredTheme);

  const handleSelect = (id) => {
    applyTheme(id);
    setCurrent(id);
  };

  return (
    <div style={{ paddingBottom: 32 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Theme
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {THEMES.map((theme) => {
          const isActive = current === theme.id;
          return (
            <button
              key={theme.id}
              onClick={() => handleSelect(theme.id)}
              style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "14px 16px",
                background: isActive ? "rgba(198,255,61,0.06)" : "var(--bg-2)",
                border: `1px solid ${isActive ? "rgba(198,255,61,0.4)" : "var(--line)"}`,
                borderRadius: 14,
                cursor: "pointer", textAlign: "left",
                transition: "all 0.2s",
                width: "100%",
              }}
            >
              {/* Color preview dots */}
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                {theme.preview.map((color, i) => (
                  <div key={i} style={{
                    width: 18, height: 18, borderRadius: "50%",
                    background: color,
                    border: "1px solid rgba(255,255,255,0.1)",
                  }} />
                ))}
              </div>

              {/* Name + desc */}
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 14, fontWeight: 700,
                  color: isActive ? "var(--accent)" : "var(--text)",
                }}>
                  {theme.name}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                  {theme.desc}
                </div>
              </div>

              {/* Active check */}
              {isActive && (
                <div style={{
                  width: 22, height: 22, borderRadius: "50%",
                  background: "var(--accent)", color: "#0a0b10",
                  display: "grid", placeItems: "center", flexShrink: 0,
                }}>
                  <Check size={13} strokeWidth={3} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div style={{
        marginTop: 28, padding: "14px 16px",
        background: "var(--bg-2)", border: "1px solid var(--line)",
        borderRadius: 12, fontSize: 12, color: "var(--muted)", lineHeight: 1.6,
      }}>
        💡 Theme turant apply hota hai — page refresh ki zaroorat nahi.
      </div>

      {current !== "default" && (
        <button
          onClick={() => handleSelect("default")}
          style={{
            marginTop: 12, width: "100%",
            padding: "12px", borderRadius: 12,
            background: "transparent",
            border: "1px solid var(--line)",
            color: "var(--muted)", fontSize: 13, fontWeight: 600,
            fontFamily: "inherit", cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          ↩ Reset to Default
        </button>
      )}
    </div>
  );
}
