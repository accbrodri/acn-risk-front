import type { Accion, ActionRow, Estado, Nivel, Risk } from "./types"

export const NIVELES: Nivel[] = ["Crítico", "Alto", "Medio", "Bajo"]
export const COL: Record<Nivel, string> = {
  Bajo: "#2f9e44",
  Medio: "#f2c200",
  Alto: "#f76707",
  "Crítico": "#e03131",
}
export const ESTADOS: Estado[] = ["Abierto", "En mitigación", "Monitoreo", "Cerrado"]
export const AEST = ["Pendiente", "En curso", "Completada"] as const
export const PRIOS = ["Alta", "Media", "Baja"] as const
export const CATS = [
  "Técnico",
  "Proveedor/Terceros",
  "Recursos",
  "Cronograma",
  "Presupuesto",
  "Seguridad",
  "Regulatorio",
  "Alcance",
] as const
export const ESC: Record<number, string> = { 1: "Muy baja", 2: "Baja", 3: "Media", 4: "Alta", 5: "Muy alta" }
export const SC = [1, 2, 3, 4, 5]

export const addD = (n: number, d: Date = new Date()): string => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x.toLocaleDateString("sv")
}
export const today = () => addD(0)
export const uid = () => Math.random().toString(36).slice(2, 9)

export const sev = (r: Pick<Risk, "prob" | "imp">) => r.prob * r.imp
export const lvl = (s: number): Nivel => (s >= 17 ? "Crítico" : s >= 10 ? "Alto" : s >= 5 ? "Medio" : "Bajo")
export const isOpen = (r: Risk) => r.estado !== "Cerrado"
export const isOverdue = (r: Risk) => isOpen(r) && r.fechaObj < today()
export const isLate = (a: Accion) => a.estado !== "Completada" && a.fecha < today()

export const snap = (r: Risk, d: string) => {
  let s: Risk["historial"][number] | null = null
  for (const h of r.historial) if (h.f <= d) s = h
  return s
}
/** Cambio de severidad en 30 días frente al snapshot más cercano. */
export const delta30 = (r: Risk) => {
  const s = snap(r, addD(-30)) ?? r.historial[0]
  return s ? sev(r) - s.p * s.i : 0
}
export const trend = (r: Risk) => {
  const d = delta30(r)
  return d > 0 ? `▲ +${d}` : d < 0 ? `▼ ${d}` : "= estable"
}

export const allActions = (risks: Risk[]): ActionRow[] => risks.flatMap((r) => r.acciones.map((a) => ({ ...a, r })))
export const projectsOf = (risks: Risk[]) => [...new Set(risks.map((r) => r.proyecto))].sort()
export const peopleOf = (risks: Risk[]) =>
  [...new Set(risks.flatMap((r) => [r.responsable, ...r.acciones.map((a) => a.responsable)]))].filter(Boolean).sort()
export const prioOf = (r: Risk) => (sev(r) >= 17 ? "Alta" : sev(r) >= 10 ? "Media" : "Baja")

export const fmt = (d: string) =>
  d ? new Date(d + "T00:00").toLocaleDateString("es-CO", { day: "2-digit", month: "short" }) : ""

export const norm = (s: string) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
