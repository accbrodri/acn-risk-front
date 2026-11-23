import { suggest } from "./ai"
import type { Detected } from "./ai"
import { CATS, ESC, addD, prioOf, sev, today, uid } from "./model"
import type { Accion, Estado, Historial, Prioridad, Risk } from "./types"

export type Result = { risks: Risk[] } | { error: string }

export interface RiskForm {
  proyecto: string
  nombre: string
  descripcion: string
  categoria: string
  prob: number
  imp: number
  estado: Estado
  fechaId: string
  responsable: string
  fechaObj: string
}

export interface UpdateForm {
  fecha: string
  nota: string
  prob: string
  imp: string
  estado: string
}

type Val = Pick<Risk, "prob" | "imp" | "estado">

export function changeNote(a: Val, b: Val): string {
  const p: string[] = []
  if (a.prob !== b.prob) p.push(`Probabilidad ${b.prob > a.prob ? "aumenta" : "disminuye"} de ${ESC[a.prob]} a ${ESC[b.prob]}.`)
  if (a.imp !== b.imp) p.push(`Impacto ${b.imp > a.imp ? "aumenta" : "disminuye"} de ${ESC[a.imp]} a ${ESC[b.imp]}.`)
  if (a.estado !== b.estado) p.push(`Estado: ${a.estado} → ${b.estado}.`)
  return p.join(" ")
}

export const blankRisk = (id: string, proyecto: string): Risk => ({
  id,
  proyecto,
  nombre: "",
  descripcion: "",
  categoria: CATS[0],
  prob: 3,
  imp: 3,
  estado: "Abierto",
  fechaId: today(),
  responsable: "",
  fechaObj: addD(30),
  acciones: [],
  historial: [],
})

export const newAction = (
  accion: string,
  responsable: string,
  fecha: string,
  prioridad: Prioridad,
  comentario = "",
): Accion => ({
  id: uid(),
  accion,
  responsable,
  fecha,
  estado: "Pendiente",
  prioridad,
  avance: 0,
  comentario,
  actualizado: today(),
})

export function saveRisk(risks: Risk[], id: string, isNew: boolean, form: RiskForm): Result {
  const nv = { ...form, fechaId: form.fechaId || today() }
  if (!nv.proyecto || !nv.nombre || !nv.responsable) return { error: "Proyecto, nombre y responsable son obligatorios." }
  if (isNew) {
    const r: Risk = {
      ...blankRisk(id, nv.proyecto),
      ...nv,
      historial: [{ f: nv.fechaId, nota: "Riesgo identificado.", p: nv.prob, i: nv.imp, e: nv.estado }],
    }
    return { risks: [...risks, r] }
  }
  const cur = risks.find((x) => x.id === id)
  if (!cur) return { error: "El riesgo ya no existe." }
  const nota = changeNote(cur, nv)
  const r: Risk = {
    ...cur,
    ...nv,
    historial: nota ? [...cur.historial, { f: today(), nota, p: nv.prob, i: nv.imp, e: nv.estado }] : cur.historial,
  }
  return { risks: risks.map((x) => (x.id === id ? r : x)) }
}

export function addUpdate(risks: Risk[], id: string, u: UpdateForm): Result {
  const cur = risks.find((x) => x.id === id)
  if (!cur) return { error: "El riesgo ya no existe." }
  const nv = { prob: +u.prob || cur.prob, imp: +u.imp || cur.imp, estado: (u.estado as Estado) || cur.estado }
  const cn = changeNote(cur, nv)
  const nota = u.nota.trim()
  if (!nota && !cn) return { error: "Escribe una nota o cambia la valoración." }
  const entry: Historial = { f: u.fecha || today(), nota: [nota, cn].filter(Boolean).join(" "), p: nv.prob, i: nv.imp, e: nv.estado }
  const historial = [...cur.historial, entry].sort((a, b) => a.f.localeCompare(b.f))
  return { risks: risks.map((x) => (x.id === id ? { ...cur, ...nv, historial } : x)) }
}

/** Campos editables de un plan de acción; avance y estado se sincronizan. */
export function actionPatch(a: Accion, key: keyof Accion, value: string): Partial<Accion> {
  const actualizado = today()
  if (key === "avance") {
    const v = Math.min(100, Math.max(0, +value || 0))
    if (v === 100) return { avance: v, estado: "Completada", actualizado }
    if (v > 0 && a.estado === "Pendiente") return { avance: v, estado: "En curso", actualizado }
    return { avance: v, actualizado }
  }
  if (key === "estado" && value === "Completada") return { estado: "Completada", avance: 100, actualizado }
  return { [key]: value, actualizado } as Partial<Accion>
}

export function updateAction(risks: Risk[], riskId: string, actionId: string, key: keyof Accion, value: string): Risk[] {
  return risks.map((r) => {
    if (r.id !== riskId) return r
    return {
      ...r,
      acciones: r.acciones.map((a) => (a.id === actionId ? { ...a, ...actionPatch(a, key, value) } : a)),
    }
  })
}

export function deleteAction(risks: Risk[], riskId: string, actionId: string): Risk[] {
  return risks.map((r) => (r.id === riskId ? { ...r, acciones: r.acciones.filter((a) => a.id !== actionId) } : r))
}

export function addAction(risks: Risk[], riskId: string, accion: string, resp: string, fecha: string, prio: Prioridad): Result {
  const cur = risks.find((x) => x.id === riskId)
  if (!cur) return { error: "El riesgo ya no existe." }
  if (!accion.trim()) return { error: "Describe la acción." }
  const a = newAction(accion.trim(), resp || cur.responsable, fecha || addD(14), prio)
  return { risks: risks.map((r) => (r.id === riskId ? { ...r, acciones: [...r.acciones, a] } : r)) }
}

export function addSuggested(risks: Risk[], riskId: string, s: { accion: string; src: string }): Risk[] {
  const cur = risks.find((x) => x.id === riskId)
  if (!cur) return risks
  const a = newAction(s.accion, cur.responsable, addD(sev(cur) >= 17 ? 7 : 14), prioOf(cur), "Sugerida por IA: " + s.src)
  return risks.map((r) => (r.id === riskId ? { ...r, acciones: [...r.acciones, a] } : r))
}

export function deleteRisk(risks: Risk[], id: string): Risk[] {
  return risks.filter((r) => r.id !== id)
}

/** Crea los riesgos detectados seleccionados, cada uno con dos acciones sugeridas. */
export function createDetected(risks: Risk[], items: Detected[], proyecto: string, responsable: string): Risk[] {
  const created = items.map((d) => {
    const r: Risk = {
      ...blankRisk(uid(), proyecto),
      nombre: d.nombre,
      descripcion: d.descripcion,
      categoria: d.categoria,
      prob: d.prob,
      imp: d.imp,
      responsable,
      fechaObj: addD(d.prob * d.imp >= 17 ? 14 : 30),
      historial: [{ f: today(), nota: "Detectado automáticamente desde notas de reunión.", p: d.prob, i: d.imp, e: "Abierto" }],
    }
    r.acciones = suggest(risks, r)
      .slice(0, 2)
      .map((s, i) => newAction(s.accion, responsable, addD(7 * (i + 1)), prioOf(r), "Sugerida por IA: " + s.src))
    return r
  })
  return [...risks, ...created]
}
