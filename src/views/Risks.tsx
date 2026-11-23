import { useState } from "react"
import type { CSSProperties } from "react"
import { SPECIAL, filterRisks } from "@/domain/filters"
import { COL, ESTADOS, NIVELES, fmt, isLate, isOverdue, lvl, peopleOf, projectsOf, sev, trend } from "@/domain/model"
import type { Risk } from "@/domain/types"
import type { AppApi } from "@/components/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Pill, Tag, inputCls } from "@/components/shared"
import { cn } from "@/lib/utils"

type Mode = "lista" | "cards"

export function Risks({ api }: { api: AppApi }) {
  const { filters: f, setFilters, resetFilters, openRisk, risks } = api
  const [mode, setMode] = useState<Mode>("lista")
  const rs = filterRisks(risks, f)
  const chips = [f.special && SPECIAL[f.special].label, f.p && `P${f.p} × I${f.i}`].filter(Boolean)
  const active = Object.values(f).some(Boolean)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">Riesgos ({rs.length})</h2>
        <ModeToggle mode={mode} onChange={setMode} />
      </div>

      <Card className="flex flex-row flex-wrap items-center gap-2 p-3">
        <input
          className={cn(inputCls, "w-56")}
          placeholder="Buscar…"
          value={f.q ?? ""}
          onChange={(e) => setFilters({ q: e.target.value || undefined })}
        />
        <Select value={f.proyecto} onChange={(v) => setFilters({ proyecto: v })} placeholder="Proyecto" options={projectsOf(risks)} />
        <Select value={f.nivel} onChange={(v) => setFilters({ nivel: v })} placeholder="Nivel" options={NIVELES} />
        <Select value={f.estado} onChange={(v) => setFilters({ estado: v })} placeholder="Estado" options={ESTADOS} />
        <Select value={f.resp} onChange={(v) => setFilters({ resp: v })} placeholder="Responsable" options={peopleOf(risks)} />
        {chips.map((c) => (
          <Tag key={String(c)}>{c}</Tag>
        ))}
        {active && (
          <Button variant="outline" size="sm" onClick={resetFilters}>
            Limpiar filtros
          </Button>
        )}
      </Card>

      {mode === "lista" ? (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-2">Severidad</th>
                <th className="p-2">Riesgo</th>
                <th className="p-2">Proyecto</th>
                <th className="p-2">Categoría</th>
                <th className="p-2">P</th>
                <th className="p-2">I</th>
                <th className="p-2">Estado</th>
                <th className="p-2">Responsable</th>
                <th className="p-2">Identificado</th>
                <th className="p-2">Objetivo</th>
                <th className="p-2">Tendencia 30d</th>
                <th className="p-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rs.map((r) => (
                <tr key={r.id} className="cursor-pointer border-t hover:bg-muted/50" onClick={() => openRisk(r.id)}>
                  <td className="p-2">
                    <Pill v={sev(r)} />
                  </td>
                  <td className="p-2">
                    <b>{r.nombre}</b>
                    <br />
                    <small className="text-muted-foreground">{r.descripcion.slice(0, 90)}</small>
                  </td>
                  <td className="p-2">{r.proyecto}</td>
                  <td className="p-2">
                    <Tag>{r.categoria}</Tag>
                  </td>
                  <td className="p-2">{r.prob}</td>
                  <td className="p-2">{r.imp}</td>
                  <td className="p-2">{r.estado}</td>
                  <td className="p-2">{r.responsable}</td>
                  <td className="p-2">{fmt(r.fechaId)}</td>
                  <td className={cn("p-2", isOverdue(r) && "font-semibold text-red-600")}>
                    {fmt(r.fechaObj)}
                    {isOverdue(r) ? " ⚠️" : ""}
                  </td>
                  <td className="p-2">{trend(r)}</td>
                  <td className="p-2">
                    {r.acciones.filter((a) => a.estado === "Completada").length}/{r.acciones.length}
                    {r.acciones.some(isLate) ? " ⚠️" : ""}
                  </td>
                </tr>
              ))}
              {!rs.length && (
                <tr>
                  <td colSpan={12} className="p-4 text-center text-muted-foreground">
                    Sin resultados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rs.map((r) => (
            <RiskCard key={r.id} r={r} onOpen={() => openRisk(r.id)} />
          ))}
          {!rs.length && <p className="text-sm text-muted-foreground">Sin resultados</p>}
        </div>
      )}
    </div>
  )
}

export function ModeToggle({ mode, onChange }: { mode: "lista" | "cards"; onChange: (m: "lista" | "cards") => void }) {
  return (
    <Tabs value={mode} onValueChange={(v) => onChange(v as "lista" | "cards")}>
      <TabsList>
        <TabsTrigger value="lista" className="data-active:bg-transparent data-active:text-primary data-active:shadow-none hover:text-foreground/60 data-active:hover:text-primary">Lista</TabsTrigger>
        <TabsTrigger value="cards" className="data-active:bg-transparent data-active:text-primary data-active:shadow-none hover:text-foreground/60 data-active:hover:text-primary">Cards</TabsTrigger>
      </TabsList>
    </Tabs>
  )
}

function Select({
  value,
  onChange,
  placeholder,
  options,
}: {
  value?: string
  onChange: (v: string | undefined) => void
  placeholder: string
  options: readonly string[]
}) {
  return (
    <select className={cn(inputCls, "w-auto")} value={value ?? ""} onChange={(e) => onChange(e.target.value || undefined)}>
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  )
}


function RiskCard({ r, onOpen }: { r: Risk; onOpen: () => void }) {
  const done = r.acciones.filter((a) => a.estado === "Completada").length
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex flex-col gap-2 rounded-xl border bg-card p-4 text-left shadow-sm transition hover:border-[color:var(--sev)]"
      style={{ "--sev": COL[lvl(sev(r))] } as CSSProperties}
    >
      <div className="flex items-center justify-between gap-2">
        <Pill v={sev(r)} />
        <Tag>{r.estado}</Tag>
      </div>
      <h3 className="font-semibold">{r.nombre}</h3>
      <p className="text-xs text-muted-foreground">
        {r.proyecto} · {r.categoria}
      </p>
      <p className="text-sm text-muted-foreground line-clamp-2">{r.descripcion}</p>
      <div className="mt-auto flex flex-wrap justify-between gap-1 text-xs">
        <span>
          {r.responsable} · objetivo <span className={isOverdue(r) ? "font-semibold text-red-600" : ""}>{fmt(r.fechaObj)}</span>
        </span>
        <span>
          {trend(r)} · {done}/{r.acciones.length} acc.
        </span>
      </div>
    </button>
  )
}
