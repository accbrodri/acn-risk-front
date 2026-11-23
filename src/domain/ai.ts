import {
  allActions,
  delta30,
  fmt,
  isLate,
  isOpen,
  isOverdue,
  lvl,
  norm,
  peopleOf,
  projectsOf,
  sev,
  trend,
} from "./model"
import { exposure, execSummary, similar, simPairs, toks, weeks } from "./analytics"
import type { Risk } from "./types"

export const TPL: Record<string, string[]> = {
  "Proveedor/Terceros": [
    "Escalar con gerente de cuenta del proveedor y acordar fecha compromiso",
    "Definir plan B / mock del servicio para no bloquear pruebas",
    "Seguimiento contractual de SLA y penalidades",
  ],
  Recursos: [
    "Documentar conocimiento crítico y plan de transferencia",
    "Identificar backup para cada rol clave",
    "Activar proceso de contratación o staffing",
  ],
  Técnico: [
    "Prueba de concepto técnica temprana",
    "Revisión de arquitectura con experto",
    "Plan de pruebas de integración anticipado",
  ],
  Cronograma: [
    "Re-planificar la ruta crítica",
    "Asignar recursos adicionales a tareas críticas",
    "Acordar alcance mínimo viable con el sponsor",
  ],
  Presupuesto: [
    "Revisión semanal de consumo vs. presupuesto",
    "Configurar alertas de costo",
    "Optimizar recursos sobredimensionados",
  ],
  Seguridad: [
    "Escaneo de vulnerabilidades y parcheo de dependencias",
    "Revisión con el equipo de ciberseguridad",
    "Pentest antes de salida a producción",
  ],
  Regulatorio: [
    "Validación con área legal / cumplimiento",
    "Matriz de trazabilidad de requisitos regulatorios",
    "Mesa de trabajo con el regulador si aplica",
  ],
  Alcance: [
    "Comité de control de cambios",
    "Congelar alcance de la fase actual",
    "Priorización con el Product Owner",
  ],
}

export interface Suggestion {
  accion: string
  src: string
}

export function suggest(risks: Risk[], r: Risk): Suggestion[] {
  const learned: Suggestion[] = similar(risks, r, 5).flatMap(({ x }) =>
    x.acciones
      .filter((a) => a.estado === "Completada" || a.avance >= 50)
      .map((a) => ({ accion: a.accion, src: `funcionó en "${x.nombre}" (${x.proyecto})` })),
  )
  const tpl: Suggestion[] = (TPL[r.categoria] ?? []).map((accion) => ({
    accion,
    src: "buena práctica " + r.categoria,
  }))
  const seen = new Set(r.acciones.map((a) => norm(a.accion)))
  return [...learned, ...tpl].filter((s) => {
    const k = norm(s.accion)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

const KW: [RegExp, string, string][] = [
  [/proveedor|tercero|vendor|fabricante/, "Proveedor/Terceros", "Dependencia de proveedor externo"],
  [/retras|demora|atras|no entrega|aun no/, "Cronograma", "Retraso en el cronograma"],
  [/renunci|rotacion|vacacion|falta de personal|incapacidad|salen/, "Recursos", "Disponibilidad de recursos clave"],
  [/presupuest|costo|sobrecosto|tarifa/, "Presupuesto", "Desviación de presupuesto"],
  [/seguridad|vulnerab|ataque|hackeo|fuga/, "Seguridad", "Riesgo de seguridad de la información"],
  [/regulat|normativ|legal|cumplimiento|datos personales|ley /, "Regulatorio", "Incumplimiento regulatorio"],
  [/cambio de alcance|requisit|alcance/, "Alcance", "Cambios en el alcance"],
  [/integraci|api|interfaz|migraci|ambiente/, "Técnico", "Problemas de integración técnica"],
]

export interface Detected {
  on: boolean
  nombre: string
  categoria: string
  descripcion: string
  prob: number
  imp: number
}

export function detect(text: string): Detected[] {
  return text
    .split(/(?<=[.!?\n])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10)
    .flatMap((s): Detected[] => {
      const n = norm(s)
      if (/sin novedad|segun lo planeado|avanza bien/.test(n)) return []
      const k = KW.find(([re]) => re.test(n))
      if (!k) return []
      const prob = /bloque|urgent|aun no|todavia|no entrega|confirm/.test(n) ? 4 : 3
      const imp = /critic|produccion|cliente|regulador|multa|salida|datos personales/.test(n) ? 5 : 3
      return [{ on: true, nombre: k[2], categoria: k[1], descripcion: s, prob, imp }]
    })
}

export function answer(risks: Risk[], q: string): string {
  const n = norm(q)
  const W = new Set(n.split(/[^a-z0-9]+/))
  const proj = projectsOf(risks).find((p) => norm(p).split(/[^a-z0-9]+/).some((w) => w.length > 2 && W.has(w)))
  const per = peopleOf(risks).find((p) => norm(p).split(" ").some((w) => w.length > 2 && W.has(w)))
  const base = risks.filter((r) => (!proj || r.proyecto === proj) && (!per || r.responsable === per))
  const ab = base.filter(isOpen)
  const ctx = (proj ? " en " + proj : "") + (per ? " de " + per : "")
  const L = (a: Risk[]) =>
    a.length
      ? "\n" +
        [...a]
          .sort((x, y) => sev(y) - sev(x))
          .map(
            (r) =>
              `• ${r.nombre} [${r.proyecto}] — ${sev(r)} ${lvl(sev(r))} · ${r.estado} · ${r.responsable}${isOverdue(r) ? " · vencido " + fmt(r.fechaObj) : ""}`,
          )
          .join("\n")
      : ""

  if (/resumen|ejecutiv|informe/.test(n)) return execSummary(risks)

  if (/similar|parecid|duplic|repet/.test(n)) {
    const pr = simPairs(risks)
    return pr.length
      ? `Detecté ${pr.length} par(es) de riesgos similares entre proyectos:\n` +
          pr
            .map(([a, b, s]) => `• "${a.nombre}" [${a.proyecto}] ↔ "${b.nombre}" [${b.proyecto}] (${Math.round(s * 100)}% similitud)`)
            .join("\n") +
          "\nSugerencia: reutilizar las acciones que ya funcionaron en el otro proyecto."
      : "No encontré riesgos similares entre proyectos."
  }

  if (/accion|tarea|pendiente|quien/.test(n)) {
    const lt = /retras|atras|venc/.test(n)
    const as = allActions(risks).filter(
      (a) =>
        a.estado !== "Completada" &&
        (!proj || a.r.proyecto === proj) &&
        (!per || a.responsable === per) &&
        (!lt || isLate(a)),
    )
    if (/quien/.test(n) && !per) {
      const m: Record<string, [number, number]> = {}
      as.forEach((a) => {
        const o = (m[a.responsable] ??= [0, 0])
        o[0]++
        if (isLate(a)) o[1]++
      })
      return (
        `Acciones ${lt ? "retrasadas" : "pendientes"} por responsable${ctx}:\n` +
        Object.entries(m)
          .sort((a, b) => b[1][0] - a[1][0])
          .map(([k, [x, y]]) => `• ${k}: ${x}${lt ? "" : ` (${y} retrasadas)`}`)
          .join("\n")
      )
    }
    return (
      `${as.length} acciones ${lt ? "retrasadas" : "pendientes"}${ctx}:\n` +
      as
        .map(
          (a) =>
            `• ${a.accion} — ${a.responsable} · ${fmt(a.fecha)} · ${a.avance}%${isLate(a) ? " ⚠️ retrasada" : ""} [${a.r.nombre}]`,
        )
        .join("\n")
    )
  }

  if (/venc/.test(n)) {
    const v = ab.filter(isOverdue)
    return `${v.length} riesgos vencidos${ctx}.` + L(v)
  }

  if (/aument|subi|empeor|escal|crec/.test(n)) {
    const v = ab.filter((r) => delta30(r) > 0)
    return (
      `${v.length} riesgos aumentaron su severidad en 30 días${ctx}:` +
      v.map((r) => `\n• ${r.nombre} [${r.proyecto}] ${trend(r)} → ${sev(r)} ${lvl(sev(r))}`).join("")
    )
  }

  if (/dismin|mejor|redu|bajaron/.test(n)) {
    const v = base.filter((r) => delta30(r) < 0)
    return (
      `${v.length} riesgos disminuyeron su severidad en 30 días${ctx}:` +
      v
        .map((r) => `\n• ${r.nombre} [${r.proyecto}] ${trend(r)} → ${sev(r)} ${lvl(sev(r))} · ${r.estado}`)
        .join("")
    )
  }

  if (/exposic|expuest|mayor/.test(n)) {
    return (
      "Exposición por proyecto (Σ severidad de riesgos abiertos):\n" +
      exposure(risks)
        .map((x, i) => `${i + 1}. ${x.proyecto}: ${x.exp} pts · ${x.n} abiertos · ${x.crit} críticos`)
        .join("\n")
    )
  }

  if (/evoluc|tendenc|semana|histor/.test(n)) {
    const w = weeks(risks)
    const last = w[w.length - 1]
    return (
      "Evolución semanal (exposición / abiertos / críticos):\n" +
      w.map((x) => `${x.label}: ${x.exp} pts · ${x.cnt} abiertos · ${x.crit} críticos`).join("\n") +
      `\n\n${last.exp > w[0].exp ? "📈 La exposición aumentó" : "📉 La exposición disminuyó"} de ${w[0].exp} a ${last.exp} pts.`
    )
  }

  if (/mitig|plan|recomend|hacer|suger/.test(n)) {
    return (
      "Recomendaciones para los riesgos de mayor severidad" +
      ctx +
      ":" +
      [...ab]
        .sort((a, b) => sev(b) - sev(a))
        .slice(0, 3)
        .map(
          (r) =>
            `\n\n${r.nombre} (${sev(r)} ${lvl(sev(r))}):\n` +
            suggest(risks, r)
              .slice(0, 3)
              .map((s) => `  – ${s.accion} (${s.src})`)
              .join("\n"),
        )
        .join("")
    )
  }

  if (/critic/.test(n)) {
    const v = ab.filter((r) => sev(r) >= 17)
    return `${v.length} riesgos críticos${ctx}.` + L(v)
  }

  if (/alto/.test(n)) {
    const v = ab.filter((r) => sev(r) >= 10 && sev(r) < 17)
    return `${v.length} riesgos altos${ctx}.` + L(v)
  }

  if (/cuant|abierto|total/.test(n)) {
    const c = (l: string) => ab.filter((r) => lvl(sev(r)) === l).length
    return `${ab.length} riesgos abiertos${ctx}: 🔴 ${c("Crítico")} críticos · 🟠 ${c("Alto")} altos · 🟡 ${c("Medio")} medios · 🟢 ${c("Bajo")} bajos.`
  }

  if (proj || per) return `Riesgos abiertos${ctx}:` + (L(ab) || " ninguno.")

  const qt = toks(q)
  const m = risks.filter((r) => [...toks(r.nombre + " " + r.descripcion)].some((w) => qt.has(w)))
  if (m.length) return "Riesgos relacionados con tu consulta:" + L(m)

  return "No entendí la pregunta. Prueba con: críticos, vencidos, acciones retrasadas, exposición, evolución, aumentaron, disminuyeron, similares, recomendaciones, resumen ejecutivo, o el nombre de un proyecto o persona."
}
