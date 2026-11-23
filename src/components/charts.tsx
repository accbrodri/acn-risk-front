import { Fragment } from "react"
import { exposure } from "@/domain/analytics"
import { COL, addD, fmt, isLate, isOpen, isOverdue, lvl, sev, today } from "@/domain/model"
import type { Risk } from "@/domain/types"
import { Bar } from "@/components/shared"

export interface Series<T> {
  key: keyof T & string
  label: string
  color: string
}

export function LineChart<T extends { label: string }>({
  data,
  series,
  W = 560,
  H = 190,
}: {
  data: T[]
  series: Series<T>[]
  W?: number
  H?: number
}) {
  const pad = 30
  const max = Math.max(1, ...data.flatMap((d) => series.map((s) => Number(d[s.key]))))
  const x = (i: number) => pad + (i * (W - 2 * pad)) / Math.max(1, data.length - 1)
  const y = (v: number) => H - pad - (v * (H - 2 * pad - 14)) / max
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W }} fontFamily="system-ui">
      {[0, 1, 2, 3, 4].map((g) => {
        const v = (max * g) / 4
        return (
          <g key={g}>
            <line x1={pad} x2={W - pad} y1={y(v)} y2={y(v)} stroke="#e3e6ee" />
            <text x={4} y={y(v) + 4} fontSize={10} fill="#6b7385">
              {Math.round(v)}
            </text>
          </g>
        )
      })}
      {data.map((d, i) => (
        <text key={i} x={x(i)} y={H - 8} fontSize={10} textAnchor="middle" fill="#6b7385">
          {d.label}
        </text>
      ))}
      {series.map((s, j) => (
        <g key={s.key}>
          <polyline
            fill="none"
            stroke={s.color}
            strokeWidth={2.5}
            points={data.map((d, i) => `${x(i)},${y(Number(d[s.key]))}`).join(" ")}
          />
          {data.map((d, i) => (
            <circle key={i} cx={x(i)} cy={y(Number(d[s.key]))} r={3.5} fill={s.color}>
              <title>{`${s.label}: ${d[s.key]}`}</title>
            </circle>
          ))}
          <rect x={pad + j * 130} y={2} width={10} height={10} fill={s.color} />
          <text x={pad + 14 + j * 130} y={11} fontSize={11} fill="#6b7385">
            {s.label}
          </text>
        </g>
      ))}
    </svg>
  )
}

export function RoadMap({ risks }: { risks: Risk[] }) {
  const rs = risks.filter(isOpen).sort((a, b) => a.proyecto.localeCompare(b.proyecto) || sev(b) - sev(a))
  if (!rs.length) return <p className="text-sm text-muted-foreground">Sin riesgos abiertos.</p>
  const DAY = 864e5
  const T = today()
  const D = (s: string) => new Date(s + "T00:00").getTime()
  const pts = [
    ...rs.flatMap((r) => [r.fechaId, r.fechaObj, ...r.acciones.map((a) => a.fecha)]).filter(Boolean).map(D),
    D(T),
  ]
  const min = Math.min(...pts) - 7 * DAY
  const max = Math.max(...pts) + 7 * DAY
  const W = 960
  const L = 290
  const R = 20
  const RH = 24
  const TOP = 28
  const X = (t: number) => L + ((t - min) / (max - min)) * (W - L - R)

  type Item = { head: string } | { r: Risk }
  const items: Item[] = []
  let proj = ""
  for (const r of rs) {
    if (r.proyecto !== proj) {
      proj = r.proyecto
      items.push({ head: proj })
    }
    items.push({ r })
  }
  const H = TOP + items.length * RH + 10
  const ticks: number[] = []
  for (let t = min; t <= max; t += 14 * DAY) ticks.push(t)

  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W }} fontFamily="system-ui" fontSize={11}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={X(t)} x2={X(t)} y1={TOP - 6} y2={H} stroke="#e3e6ee" />
            <text x={X(t)} y={TOP - 10} fill="#6b7385" textAnchor="middle">
              {new Date(t).toLocaleDateString("es", { day: "2-digit", month: "short" })}
            </text>
          </g>
        ))}
        {items.map((it, i) => {
          const y = TOP + i * RH
          if ("head" in it) {
            return (
              <text key={i} x={4} y={y + 16} fontWeight={700} fill="#1d2330">
                {it.head}
              </text>
            )
          }
          const { r } = it
          const x1 = X(D(r.fechaId || T))
          const x2 = Math.max(X(D(r.fechaObj || addD(14))), x1 + 4)
          const late = isOverdue(r)
          return (
            <g key={i}>
              <text x={16} y={y + 16} fill="#1d2330">
                {r.nombre.slice(0, 38)}
              </text>
              <rect
                x={x1}
                y={y + 6}
                width={x2 - x1}
                height={12}
                rx={3}
                fill={COL[lvl(sev(r))]}
                stroke={late ? "#e03131" : undefined}
                strokeWidth={late ? 2 : undefined}
                strokeDasharray={late ? "3 2" : undefined}
              >
                <title>{`${r.nombre} · ${r.proyecto} · Sev ${sev(r)} · ${r.fechaId || ""} → ${r.fechaObj || "sin fecha"}`}</title>
              </rect>
              {r.acciones
                .filter((a) => a.fecha)
                .map((a) => {
                  const cx = X(D(a.fecha))
                  const cy = y + 12
                  const c = a.estado === "Completada" ? "#868e96" : isLate(a) ? "#e03131" : "#1d2330"
                  return (
                    <path key={a.id} d={`M${cx} ${cy - 6}l6 6-6 6-6-6z`} fill={c} stroke="#fff">
                      <title>{`${a.accion} · ${a.responsable} · ${fmt(a.fecha)} · ${a.estado}`}</title>
                    </path>
                  )
                })}
            </g>
          )
        })}
        <line x1={X(D(T))} x2={X(D(T))} y1={TOP - 4} y2={H} stroke="#e03131" strokeDasharray="4 3" />
        <text x={X(D(T)) + 3} y={H - 2} fill="#e03131">
          Hoy
        </text>
      </svg>
      <p className="mt-1.5 text-xs text-muted-foreground">
        Barra = ventana de identificación a fecha objetivo (borde rojo si vencido). Rombo = compromiso de acción: negro pendiente, rojo retrasada, gris completada.
      </p>
    </>
  )
}

export function Heat({ risks, onPick }: { risks: Risk[]; onPick: (p: number, i: number) => void }) {
  const open = risks.filter(isOpen)
  const levels = [5, 4, 3, 2, 1]
  const cols = [1, 2, 3, 4, 5]
  return (
    <>
      <div className="grid grid-cols-6 gap-1 text-center text-xs">
        {levels.map((i) => (
          <Fragment key={i}>
            <div className="flex items-center justify-center text-muted-foreground">{i}</div>
            {cols.map((p) => {
              const n = open.filter((r) => r.prob === p && r.imp === i).length
              const l = lvl(p * i)
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPick(p, i)}
                  title={`P${p} × I${i} = ${p * i} (${l})`}
                  className="h-10 rounded font-semibold"
                  style={{ background: COL[l], opacity: n ? 1 : 0.3, color: l === "Medio" ? "#222" : "#fff" }}
                >
                  {n || ""}
                </button>
              )
            })}
          </Fragment>
        ))}
        <div />
        {cols.map((p) => (
          <div key={p} className="text-muted-foreground">
            {p}
          </div>
        ))}
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">Eje X: probabilidad · Eje Y: impacto · número = riesgos abiertos</p>
    </>
  )
}

export function ExpBars({ risks, onPick }: { risks: Risk[]; onPick: (proyecto: string) => void }) {
  const ex = exposure(risks)
  const mx = Math.max(1, ...ex.map((e) => e.exp))
  return (
    <>
      {ex.map((e) => (
        <button
          key={e.proyecto}
          type="button"
          onClick={() => onPick(e.proyecto)}
          className="mb-2.5 block w-full text-left"
        >
          <div className="flex justify-between text-sm">
            <b>{e.proyecto}</b>
            <span className="text-muted-foreground">
              {e.exp} pts · {e.n} riesgos · {e.crit} críticos
            </span>
          </div>
          <Bar pct={(e.exp / mx) * 100} color={COL[lvl(Math.round(e.exp / Math.max(1, e.n)))]} />
        </button>
      ))}
    </>
  )
}
