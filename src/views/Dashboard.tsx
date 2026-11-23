import { execSummary, weeks } from "@/domain/analytics"
import { allActions, fmt, isLate, isOpen, isOverdue, sev, trend } from "@/domain/model"
import type { AppApi } from "@/components/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ExpBars, Heat, LineChart, RoadMap } from "@/components/charts"
import { Bar, Kpi, Pill } from "@/components/shared"

export function Dashboard({ api }: { api: AppApi }) {
  const { risks, go, openRisk } = api
  const open = risks.filter(isOpen)
  const actions = allActions(risks)
  const late = actions.filter(isLate)
  const wk = weeks(risks)
  const crit = open.filter((r) => sev(r) >= 17).sort((a, b) => sev(b) - sev(a))

  const people = [...new Set(actions.map((a) => a.responsable))]
    .map((name) => {
      const pend = actions.filter((a) => a.responsable === name && a.estado !== "Completada")
      return { name, pend: pend.length, late: pend.filter(isLate).length }
    })
    .filter((p) => p.pend > 0)
    .sort((a, b) => b.late - a.late || b.pend - a.pend)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi n={open.length} label="Riesgos abiertos" onClick={() => go("risks", { special: "abiertos" })} />
        <Kpi
          n={open.filter((r) => sev(r) >= 17).length}
          label="Críticos"
          color="#e03131"
          onClick={() => go("risks", { special: "criticos" })}
        />
        <Kpi
          n={open.filter(isOverdue).length}
          label="Riesgos vencidos"
          onClick={() => go("risks", { special: "vencidos" })}
        />
        <Kpi n={late.length} label="Acciones retrasadas" color="#e03131" onClick={() => go("actions", { late: true })} />
      </div>

      <Card className="p-4">
        <h3 className="mb-2 font-semibold">Hoja de ruta de riesgos</h3>
        <RoadMap risks={risks} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">Resumen ejecutivo</h3>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={api.copyTeams}>
                Copiar
              </Button>
              <Button size="sm" variant="outline" onClick={api.sendTeams}>
                Enviar a Teams
              </Button>
              <Button size="sm" onClick={() => api.print("comite")}>
                PDF Comité
              </Button>
            </div>
          </div>
          <p className="whitespace-pre-line text-sm">{execSummary(risks)}</p>
        </Card>

        <Card className="p-4">
          <h3 className="mb-2 font-semibold">Mapa de calor</h3>
          <Heat risks={risks} onPick={(p, i) => go("risks", { p, i, special: "abiertos" })} />
        </Card>

        <Card className="p-4">
          <h3 className="mb-2 font-semibold">Exposición por proyecto</h3>
          <ExpBars risks={risks} onPick={(proyecto) => go("risks", { proyecto, special: "abiertos" })} />
        </Card>

        <Card className="p-4">
          <h3 className="mb-2 font-semibold">Evolución (6 semanas)</h3>
          <LineChart data={wk} series={[{ key: "exp", label: "Exposición total", color: "#A100FF" }]} />
          <LineChart
            data={wk}
            series={[
              { key: "cnt", label: "Abiertos", color: "#868e96" },
              { key: "crit", label: "Críticos", color: "#e03131" },
            ]}
          />
        </Card>

        <Card className="p-4">
          <h3 className="mb-2 font-semibold">Carga por responsable</h3>
          {people.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-1">Responsable</th>
                  <th>Pendientes</th>
                  <th>Retrasadas</th>
                </tr>
              </thead>
              <tbody>
                {people.map((p) => (
                  <tr
                    key={p.name}
                    className="cursor-pointer border-t hover:bg-muted"
                    onClick={() => go("actions", { owner: p.name })}
                  >
                    <td className="py-1.5">{p.name}</td>
                    <td>{p.pend}</td>
                    <td className={p.late ? "font-semibold text-red-600" : ""}>{p.late}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground">Sin acciones pendientes.</p>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="mb-2 font-semibold">Riesgos críticos</h3>
          {crit.length ? (
            <div className="space-y-2">
              {crit.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => openRisk(r.id)}
                  className="block w-full rounded-lg border p-3 text-left hover:border-primary"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <b>{r.nombre}</b>
                    <Pill v={sev(r)} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {r.proyecto} · {r.responsable} · objetivo {fmt(r.fechaObj)}
                    {isOverdue(r) ? " · VENCIDO" : ""} · {trend(r)}
                  </p>
                  <div className="mt-2">
                    <Bar pct={(sev(r) / 25) * 100} color="#e03131" />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No hay riesgos críticos abiertos.</p>
          )}
        </Card>
      </div>
    </div>
  )
}
