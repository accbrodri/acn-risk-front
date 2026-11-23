import type { ReactNode } from "react"
import { COL, lvl } from "@/domain/model"

export const inputCls =
  "h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"

export function Pill({ v }: { v: number }) {
  const l = lvl(v)
  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap"
      style={{ background: COL[l], color: l === "Medio" ? "#222" : "#fff" }}
    >
      {v} · {l}
    </span>
  )
}

export function Tag({ children }: { children: ReactNode }) {
  return <span className="inline-block rounded bg-zinc-100 px-1.5 py-0.5 text-xs">{children}</span>
}

export function Bar({ pct, color }: { pct: number; color?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded bg-zinc-200">
      <div className="h-full" style={{ width: `${pct}%`, background: color ?? "var(--primary)" }} />
    </div>
  )
}

export function Field({ label, span, children }: { label: string; span?: boolean; children: ReactNode }) {
  return (
    <div className={span ? "col-span-2" : undefined}>
      <label className="mb-1 block text-xs text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}

export function Kpi({ n, label, color, onClick }: { n: number; label: string; color?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border bg-card p-4 text-left shadow-sm transition hover:border-primary"
    >
      <b className="block text-2xl" style={{ color }}>
        {n}
      </b>
      <span className="text-sm text-muted-foreground">{label}</span>
    </button>
  )
}

export function Chip({ children }: { children: ReactNode }) {
  return <span className="rounded-full border px-2 py-0.5 text-xs">{children}</span>
}
