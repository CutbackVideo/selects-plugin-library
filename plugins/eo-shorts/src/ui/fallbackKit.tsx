import React from "react";
import type { Kit } from "./kit.ts";

const muted = { color: "var(--panel-muted-fg, #888)" };

export const fallbackKit: Kit = {
  Section: ({ title, actions, children }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
        <span>{title}</span>
        {actions}
      </div>
      {children}
    </div>
  ),
  Stack: ({ gap = 8, children }) => <div style={{ display: "flex", flexDirection: "column", gap }}>{children}</div>,
  Row: ({ gap = 8, align = "center", children }) => (
    <div style={{ display: "flex", gap, alignItems: align === "start" ? "flex-start" : align === "end" ? "flex-end" : "center", flexWrap: "wrap" }}>{children}</div>
  ),
  Actions: ({ children }) => <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>,
  Segmented: ({ label, value, onChange, options, disabled }) => (
    <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <span>{label}</span>
      <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value as typeof value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  ),
  Toggle: ({ label, value, onChange, disabled }) => (
    <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <input type="checkbox" checked={value} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  ),
  Button: ({ busy, busyLabel, disabled, onClick, children, variant }) => (
    <button onClick={onClick} disabled={disabled || busy} style={{ padding: "8px 12px", fontWeight: variant === "primary" ? 600 : 400 }}>
      {busy && busyLabel ? busyLabel : children}
    </button>
  ),
  Icon: ({ name }) => <span style={{ width: 14, display: "inline-block", textAlign: "center" }}>{({ check: "✓", loading: "…", error: "!", close: "×", info: "i", clock: "·", warning: "!" } as Record<string, string>)[name] ?? "·"}</span>,
  Message: ({ tone, children }) => <div style={tone === "error" ? { color: "var(--panel-destructive-fg, #e5484d)" } : tone === "success" ? {} : muted}>{children}</div>,
};
