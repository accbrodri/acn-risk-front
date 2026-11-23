import { isLate, isOpen, isOverdue, lvl, norm, sev, delta30 } from "./model"
import type { ActionRow, Risk } from "./types"

export type Special = "abiertos" | "criticos" | "vencidos" | "subieron" | "bajaron"

export interface Filters {
  q?: string
  proyecto?: string
  nivel?: string
  estado?: string
  resp?: string
  p?: number
  i?: number
  special?: Special
  owner?: string
  aest?: string
  late?: boolean
}

export const SPECIAL: Record<Special, { label: string; test: (r: Risk) => boolean }> = {
  abiertos: { label: "Abiertos", test: isOpen },
  criticos: { label: "Críticos", test: (r) => isOpen(r) && sev(r) >= 17 },
  vencidos: { label: "Vencidos", test: isOverdue },
  subieron: { label: "Aumentaron severidad (30d)", test: (r) => isOpen(r) && delta30(r) > 0 },
  bajaron: { label: "Disminuyeron severidad (30d)", test: (r) => delta30(r) < 0 },
}

export function filterRisks(risks: Risk[], f: Filters): Risk[] {
  const q = norm(f.q ?? "")
  return risks
    .filter(
      (r) =>
        (!f.proyecto || r.proyecto === f.proyecto) &&
        (!f.nivel || lvl(sev(r)) === f.nivel) &&
        (!f.estado || r.estado === f.estado) &&
        (!f.resp || r.responsable === f.resp) &&
        (!q || norm(`${r.nombre} ${r.descripcion} ${r.proyecto} ${r.responsable}`).includes(q)) &&
        (!f.p || (r.prob === f.p && r.imp === f.i)) &&
        (!f.special || SPECIAL[f.special].test(r)),
    )
    .sort((a, b) => sev(b) - sev(a))
}

export function filterActions(actions: ActionRow[], f: Filters) {
  return actions
    .filter(
      (a) =>
        (!f.owner || a.responsable === f.owner) &&
        (!f.aest || a.estado === f.aest) &&
        (!f.proyecto || a.r.proyecto === f.proyecto) &&
        (!f.late || isLate(a)),
    )
    .sort((a, b) => Number(isLate(b)) - Number(isLate(a)) || a.fecha.localeCompare(b.fecha))
}
