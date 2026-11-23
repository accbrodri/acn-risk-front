import { addD, allActions, delta30, fmt, isLate, isOpen, isOverdue, norm, sev, snap, today } from "./model"
import type { ActionRow, Risk } from "./types"

export interface WeekPoint {
  label: string
  exp: number
  crit: number
  cnt: number
}

export function weeks(risks: Risk[], n = 6): WeekPoint[] {
  const out: WeekPoint[] = []
  for (let k = n - 1; k >= 0; k--) {
    const d = addD(-7 * k)
    let exp = 0
    let crit = 0
    let cnt = 0
    for (const r of risks) {
      const s = snap(r, d)
      if (!s || s.e === "Cerrado") continue
      const v = s.p * s.i
      exp += v
      cnt++
      if (v >= 17) crit++
    }
    out.push({ label: fmt(d), exp, crit, cnt })
  }
  return out
}

export interface ExposureRow {
  proyecto: string
  exp: number
  n: number
  crit: number
}

export function exposure(risks: Risk[]): ExposureRow[] {
  const m: Record<string, ExposureRow> = {}
  for (const r of risks.filter(isOpen)) {
    const p = (m[r.proyecto] ??= { proyecto: r.proyecto, exp: 0, n: 0, crit: 0 })
    p.exp += sev(r)
    p.n++
    if (sev(r) >= 17) p.crit++
  }
  return Object.values(m).sort((a, b) => b.exp - a.exp)
}

const STOP = new Set("para,con,del,las,los,una,por,que,sin,este,esta,como,entre,sobre,desde,muy,mas,ante,riesgo,podria,puede,tiene,cada,antes".split(","))
export const toks = (s: string) =>
  new Set(
    norm(s)
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 3 && !STOP.has(w))
      .map((w) => w.slice(0, 6)),
  )

export function simScore(r: Risk, x: Risk): number {
  const a = toks(r.nombre + " " + r.descripcion)
  const b = toks(x.nombre + " " + x.descripcion)
  const i = [...a].filter((w) => b.has(w)).length
  return i / (a.size + b.size - i || 1) + (x.categoria === r.categoria ? 0.15 : 0)
}

export function similar(risks: Risk[], r: Risk, n = 3) {
  return risks
    .filter((x) => x.id !== r.id)
    .map((x) => ({ x, s: simScore(r, x) }))
    .filter((o) => o.s > 0.25)
    .sort((p, q) => q.s - p.s)
    .slice(0, n)
}

export function simPairs(risks: Risk[]): [Risk, Risk, number][] {
  const out: [Risk, Risk, number][] = []
  const rs = risks.filter(isOpen)
  rs.forEach((a, i) =>
    rs.slice(i + 1).forEach((b) => {
      if (a.proyecto !== b.proyecto) {
        const s = simScore(a, b)
        if (s > 0.3) out.push([a, b, s])
      }
    }),
  )
  return out.sort((x, y) => y[2] - x[2])
}

export function topOwner(list: ActionRow[]): string {
  const m: Record<string, number> = {}
  list.forEach((a) => (m[a.responsable] = (m[a.responsable] || 0) + 1))
  return Object.entries(m).sort((a, b) => b[1] - a[1])[0][0]
}

export function decisions(risks: Risk[]): string[] {
  return risks
    .filter((r) => isOpen(r) && (sev(r) >= 17 || (isOverdue(r) && sev(r) >= 10)))
    .sort((a, b) => sev(b) - sev(a))
    .map((r) => {
      const late = r.acciones.filter(isLate).length
      const d = !r.acciones.some((a) => a.estado !== "Completada")
        ? "aprobar plan de mitigación y recursos"
        : late
          ? `desbloquear ${late} acción(es) retrasada(s)`
          : isOverdue(r)
            ? "redefinir fecha objetivo o escalar"
            : "confirmar estrategia (mitigar / transferir / aceptar)"
      return `${r.nombre} (${r.proyecto}, sev. ${sev(r)}): ${d} — resp. ${r.responsable}`
    })
}

export function execSummary(risks: Risk[]): string {
  const rs = risks.filter(isOpen)
  const crit = rs.filter((r) => sev(r) >= 17)
  const ex = exposure(risks)
  const w = weeks(risks)
  const late = allActions(risks).filter(isLate)
  const up = rs.filter((r) => delta30(r) > 0)
  const down = risks.filter((r) => delta30(r) < 0)
  const t = w[0].exp ? Math.round(((w[w.length - 1].exp - w[0].exp) / w[0].exp) * 100) : 0
  const L = [
    `Al ${fmt(today())} hay ${rs.length} riesgos abiertos en ${new Set(rs.map((r) => r.proyecto)).size} proyectos: ${crit.length} críticos y ${rs.filter((r) => sev(r) >= 10 && sev(r) < 17).length} altos.`,
  ]
  if (ex[0]) L.push(`Mayor exposición: ${ex[0].proyecto} (${ex[0].exp} pts, ${ex[0].crit} críticos).`)
  if (crit.length) L.push(`Críticos: ${crit.map((r) => `${r.nombre} [${r.proyecto}]`).join("; ")}.`)
  L.push(
    `Tendencia 6 semanas: exposición ${t >= 0 ? "+" : ""}${t}% (${w[0].exp} → ${w[w.length - 1].exp} pts). En 30 días ${up.length} riesgos subieron y ${down.length} bajaron.`,
  )
  L.push(
    `${rs.filter(isOverdue).length} riesgos vencidos y ${late.length} acciones retrasadas${late.length ? ` (mayor carga: ${topOwner(late)})` : ""}.`,
  )
  const dec = decisions(risks)
  if (dec.length) L.push("Decisiones requeridas:\n" + dec.map((d) => "• " + d).join("\n"))
  return L.join("\n")
}

export interface Alert {
  id: string
  t: string
}

export function alerts(risks: Risk[]): Alert[] {
  const out: Alert[] = []
  for (const r of risks.filter(isOpen)) {
    if (isOverdue(r)) out.push({ id: r.id, t: `⏰ Vencido: "${r.nombre}" (${r.proyecto}) debía resolverse el ${fmt(r.fechaObj)} · ${r.responsable}` })
    if (sev(r) >= 17 && !r.acciones.some((a) => a.estado !== "Completada"))
      out.push({ id: r.id, t: `🔴 Crítico sin plan de acción activo: "${r.nombre}" — abre el riesgo para generar un plan con IA` })
    if (delta30(r) >= 6) out.push({ id: r.id, t: `📈 Escalando: "${r.nombre}" subió ${delta30(r)} pts en 30 días` })
    const last = r.historial.at(-1)?.f
    if (last && last < addD(-14))
      out.push({ id: r.id, t: `💤 Sin seguimiento hace ${Math.round((new Date(today()).getTime() - new Date(last).getTime()) / 864e5)} días: "${r.nombre}"` })
  }
  for (const a of allActions(risks).filter(isLate))
    out.push({ id: a.r.id, t: `⚠️ Acción retrasada: "${a.accion}" · ${a.responsable} · compromiso ${fmt(a.fecha)}` })
  for (const [a, b] of simPairs(risks))
    out.push({ id: b.id, t: `🔗 Riesgo similar entre proyectos: "${a.nombre}" [${a.proyecto}] ↔ "${b.nombre}" [${b.proyecto}] — reutiliza lecciones aprendidas` })
  return out
}
