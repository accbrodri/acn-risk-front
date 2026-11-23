import { useState } from "react"
import type { CSSProperties } from "react"
import { filterActions } from "@/domain/filters"
import { AEST, COL, allActions, fmt, isLate, lvl, peopleOf, projectsOf, sev } from "@/domain/model"
import type { ActionRow } from "@/domain/types"
import type { AppApi } from "@/components/api"
import { Card } from "@/components/ui/card"
import { Bar, Pill, Tag, inputCls } from "@/components/shared"
import { ModeToggle } from "@/views/Risks"
import { cn } from "@/lib/utils"

type Mode = "lista" | "cards"

export function Actions({ api }: { api: AppApi }) {
  const { filters: f, setFilters, openRisk, risks } = api
  const [mode, setMode] = useState<Mode>("lista")
  const rows = filterActions(allActions(risks), f)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">Planes de acción ({rows.length})</h2>
        <ModeToggle mode={mode} onChange={setMode} />
      </div>

      <Card className="flex flex-row flex-wrap items-center gap-2 p-3">
        <select className={cn(inputCls, "w-auto")} value={f.owner ?? ""} onChange={(e) => setFilters({ owner: e.target.value || undefined })}>
          <option value="">Responsable</option>
          {peopleOf(risks).map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select className={cn(inputCls, "w-auto")} value={f.proyecto ?? ""} onChange={(e) => setFilters({ proyecto: e.target.value || undefined })}>
          <option value="">Proyecto</option>
          {projectsOf(risks).map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select className={cn(inputCls, "w-auto")} value={f.aest ?? ""} onChange={(e) => setFilters({ aest: e.target.value || undefined })}>
          <option value="">Estado</option>
          {AEST.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!f.late} onChange={(e) => setFilters({ late: e.target.checked || undefined })} />
          Solo retrasadas
        </label>
      </Card>

      {mode === "lista" ? (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-2">Acción</th>
                <th className="p-2">Riesgo / Proyecto</th>
                <th className="p-2">Responsable</th>
                <th className="p-2">Compromiso</th>
                <th className="p-2">Prioridad</th>
                <th className="p-2">Estado</th>
                <th className="p-2">Avance</th>
                <th className="p-2">Comentario</th>
                <th className="p-2">Actualizado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className="cursor-pointer border-t hover:bg-muted/50" onClick={() => openRisk(a.r.id)}>
                  <td className="p-2 font-medium">{a.accion}</td>
                  <td className="p-2">
                    {a.r.nombre}
                    <br />
                    <small className="text-muted-foreground">{a.r.proyecto}</small>
                    <br />
                    <Pill v={sev(a.r)} />
                  </td>
                  <td className="p-2">{a.responsable}</td>
                  <td className={cn("p-2", isLate(a) && "font-semibold text-red-600")}>
                    {fmt(a.fecha)}
                    {isLate(a) ? " ⚠️ Retrasada" : ""}
                  </td>
                  <td className="p-2">{a.prioridad}</td>
                  <td className="p-2">
                    <Tag>{a.estado}</Tag>
                  </td>
                  <td className="w-40 p-2">
                    <Bar pct={a.avance} />
                    <small>{a.avance}%</small>
                  </td>
                  <td className="p-2 text-muted-foreground">{a.comentario}</td>
                  <td className="p-2">{fmt(a.actualizado)}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={9} className="p-4 text-center text-muted-foreground">
                    Sin acciones
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((a) => (
            <ActionCard key={a.id} a={a} onOpen={() => openRisk(a.r.id)} />
          ))}
          {!rows.length && <p className="text-sm text-muted-foreground">Sin acciones</p>}
        </div>
      )}
    </div>
  )
}

function ActionCard({ a, onOpen }: { a: ActionRow; onOpen: () => void }) {
  const late = isLate(a)
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex flex-col gap-2 rounded-xl border border-l-4 border-l-[color:var(--sev)] bg-card p-4 text-left shadow-sm transition hover:border-[color:var(--sev)]"
      style={{ "--sev": COL[lvl(sev(a.r))] } as CSSProperties}
    >
      <div className="flex items-center justify-between gap-2">
        <Tag>{a.estado}</Tag>
        <Pill v={sev(a.r)} />
      </div>
      <h3 className="font-semibold">{a.accion}</h3>
      <p className="text-xs text-muted-foreground">
        {a.r.nombre} · {a.r.proyecto}
      </p>
      <p className="text-xs font-semibold">Avance {a.avance}%</p>
      <p className="text-xs">
        {a.responsable} · prioridad {a.prioridad}
      </p>
      <p className={cn("text-xs", late && "font-semibold text-red-600")}>
        Compromiso {fmt(a.fecha)}
        {late ? " ⚠️ Retrasada" : ""}
      </p>
      {a.comentario && <p className="text-sm text-muted-foreground">{a.comentario}</p>}
    </button>
  )
}
