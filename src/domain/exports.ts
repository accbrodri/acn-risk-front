import { alerts, execSummary } from "./analytics"
import { delta30, fmt, isLate, isOverdue, lvl, projectsOf, sev, today, isOpen } from "./model"
import type { Risk } from "./types"

/** Cada tabla es un arreglo de filas; la primera fila son los encabezados. */
export type Table = (string | number)[][]

const allActionsOf = (risks: Risk[]) => risks.flatMap((r) => r.acciones.map((a) => ({ ...a, r })))

export function riskTable(risks: Risk[]): Table {
  return [
    ["ID", "Proyecto", "Riesgo", "Descripción", "Categoría", "Probabilidad", "Impacto", "Severidad", "Nivel", "Estado", "Responsable", "Fecha identificación", "Fecha objetivo", "Vencido", "Tendencia 30d", "Acciones (compl./total)", "Última actualización"],
    ...risks.map((r) => [
      r.id,
      r.proyecto,
      r.nombre,
      r.descripcion,
      r.categoria,
      r.prob,
      r.imp,
      sev(r),
      lvl(sev(r)),
      r.estado,
      r.responsable,
      fmt(r.fechaId),
      fmt(r.fechaObj),
      isOverdue(r) ? "Sí" : "No",
      delta30(r),
      `${r.acciones.filter((a) => a.estado === "Completada").length}/${r.acciones.length}`,
      fmt(r.historial.at(-1)?.f ?? ""),
    ]),
  ]
}

export function actionTable(risks: Risk[]): Table {
  return [
    ["Proyecto", "Riesgo", "Acción", "Responsable", "Fecha compromiso", "Estado", "Prioridad", "Avance %", "Retrasada", "Evidencia / comentarios", "Última actualización"],
    ...allActionsOf(risks).map((a) => [
      a.r.proyecto,
      a.r.nombre,
      a.accion,
      a.responsable,
      fmt(a.fecha),
      a.estado,
      a.prioridad,
      a.avance,
      isLate(a) ? "Sí" : "No",
      a.comentario,
      fmt(a.actualizado),
    ]),
  ]
}

export function histTable(risks: Risk[]): Table {
  return [
    ["Proyecto", "Riesgo", "Fecha", "Nota", "Probabilidad", "Impacto", "Severidad", "Estado"],
    ...risks.flatMap((r) =>
      r.historial.map((h) => [r.proyecto, r.nombre, fmt(h.f), h.nota, h.p, h.i, h.p * h.i, h.e]),
    ),
  ]
}

export function projTable(risks: Risk[]): Table {
  return [
    ["Proyecto", "Riesgos abiertos", "Críticos", "Altos", "Exposición (Σ sev.)", "Vencidos", "Acciones retrasadas"],
    ...projectsOf(risks).map((p) => {
      const rs = risks.filter((r) => r.proyecto === p)
      const open = rs.filter(isOpen)
      return [
        p,
        open.length,
        open.filter((r) => sev(r) >= 17).length,
        open.filter((r) => sev(r) >= 10 && sev(r) < 17).length,
        open.reduce((s, r) => s + sev(r), 0),
        rs.filter(isOverdue).length,
        rs.reduce((s, r) => s + r.acciones.filter(isLate).length, 0),
      ]
    }),
  ]
}

export function dl(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement("a")
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Evita inyección de fórmulas en Excel/CSV. */
const safeCell = (c: string | number) => (typeof c === "string" && /^[=+\-@]/.test(c) ? "'" + c : c)

export function csv(rows: Table): string {
  return (
    "\ufeff" +
    rows
      .map((row) => row.map((c) => `"${String(safeCell(c)).replace(/"/g, '""')}"`).join(","))
      .join("\r\n")
  )
}

/** Riesgos, acciones e historial en un solo CSV, separados por título de sección. */
export function csvAll(risks: Risk[]): string {
  const secciones: [string, Table][] = [
    ["RIESGOS", riskTable(risks)],
    ["ACCIONES", actionTable(risks)],
    ["HISTORIAL", histTable(risks)],
  ]
  return csv(secciones.flatMap(([titulo, tabla]) => [[titulo], ...tabla, []]))
}

export function teamsMsg(risks: Risk[]): string {
  return `Risk Krono — ${fmt(today())}\n\n${execSummary(risks)}\n\nAlertas:\n${alerts(risks)
    .slice(0, 8)
    .map((a) => "• " + a.t)
    .join("\n")}`
}
