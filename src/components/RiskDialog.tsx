import { useState } from "react"
import { addUpdate, addAction, addSuggested, blankRisk, deleteAction, deleteRisk, saveRisk, updateAction } from "@/domain/mutations"
import type { RiskForm, UpdateForm } from "@/domain/mutations"
import { addD, CATS, ESC, ESTADOS, fmt, isLate, prioOf, PRIOS, SC, today, peopleOf, projectsOf } from "@/domain/model"
import { similar } from "@/domain/analytics"
import { suggest } from "@/domain/ai"
import type { Accion, Risk } from "@/domain/types"
import type { AppApi } from "@/components/api"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, Pill, Tag, inputCls } from "@/components/shared"
import { LineChart } from "@/components/charts"
import { cn } from "@/lib/utils"

const toForm = (r: Risk): RiskForm => ({
  proyecto: r.proyecto,
  nombre: r.nombre,
  descripcion: r.descripcion,
  categoria: r.categoria,
  prob: r.prob,
  imp: r.imp,
  estado: r.estado,
  fechaId: r.fechaId,
  responsable: r.responsable,
  fechaObj: r.fechaObj,
})

const emptyUpdate = (): UpdateForm => ({ fecha: today(), nota: "", prob: "", imp: "", estado: "" })

export function RiskDialog({ api, id, onClose }: { api: AppApi; id: string; onClose: () => void }) {
  const { risks, filters, setRisks, openRisk } = api
  const current = risks.find((r) => r.id === id)
  const isNew = !current
  const [form, setForm] = useState<RiskForm>(() => toForm(current ?? blankRisk(id, filters.proyecto ?? "")))
  const [upd, setUpd] = useState<UpdateForm>(emptyUpdate)
  const [na, setNa] = useState({ accion: "", resp: current?.responsable ?? "", fecha: addD(14), prio: current ? prioOf(current) : "Media" })

  const set = <K extends keyof RiskForm>(k: K, v: RiskForm[K]) => setForm((f) => ({ ...f, [k]: v }))
  const projects = projectsOf(risks)
  const people = peopleOf(risks)

  function save() {
    const res = saveRisk(risks, id, isNew, form)
    if ("error" in res) return alert(res.error)
    setRisks(res.risks)
  }

  function registerUpdate() {
    const res = addUpdate(risks, id, upd)
    if ("error" in res) return alert(res.error)
    setRisks(res.risks)
    const next = res.risks.find((r) => r.id === id)
    if (next) setForm(toForm(next))
    setUpd(emptyUpdate())
  }

  function addPlan() {
    const res = addAction(risks, id, na.accion, na.resp, na.fecha, na.prio as Accion["prioridad"])
    if ("error" in res) return alert(res.error)
    setRisks(res.risks)
    setNa((n) => ({ ...n, accion: "" }))
  }

  function removeRisk() {
    if (!confirm("¿Eliminar este riesgo y todo su historial?")) return
    setRisks(deleteRisk(risks, id))
    onClose()
  }

  const formSev = form.prob * form.imp

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="thin-scrollbar max-h-[92vh] overflow-y-auto sm:max-w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle>{isNew ? "Nuevo riesgo" : current.nombre}</DialogTitle>
          <DialogDescription>
            {isNew ? "Completa los datos y guarda el riesgo." : `${current.proyecto} · ${current.categoria}`}
          </DialogDescription>
        </DialogHeader>

        <section className="grid gap-3 sm:grid-cols-2">
          <Field label="Proyecto / iniciativa *">
            <input className={inputCls} list="dlProj" value={form.proyecto} onChange={(e) => set("proyecto", e.target.value)} />
          </Field>
          <Field label="Nombre *">
            <input className={inputCls} value={form.nombre} onChange={(e) => set("nombre", e.target.value)} />
          </Field>
          <Field label="Categoría">
            <select className={inputCls} value={form.categoria} onChange={(e) => set("categoria", e.target.value)}>
              {CATS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Responsable *">
            <input className={inputCls} list="dlPeople" value={form.responsable} onChange={(e) => set("responsable", e.target.value)} />
          </Field>
          <Field label="Descripción" span>
            <textarea
              className={cn(inputCls, "h-auto py-2")}
              rows={3}
              value={form.descripcion}
              onChange={(e) => set("descripcion", e.target.value)}
            />
          </Field>
          <Field label="Probabilidad">
            <select className={inputCls} value={form.prob} onChange={(e) => set("prob", Number(e.target.value))}>
              {SC.map((v) => (
                <option key={v} value={v}>
                  {v} · {ESC[v]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Impacto">
            <select className={inputCls} value={form.imp} onChange={(e) => set("imp", Number(e.target.value))}>
              {SC.map((v) => (
                <option key={v} value={v}>
                  {v} · {ESC[v]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Severidad">
            <div className="flex h-9 items-center">
              <Pill v={formSev} />
            </div>
          </Field>
          <Field label="Estado">
            <select className={inputCls} value={form.estado} onChange={(e) => set("estado", e.target.value as RiskForm["estado"])}>
              {ESTADOS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Fecha identificación">
            <input type="date" className={inputCls} value={form.fechaId} onChange={(e) => set("fechaId", e.target.value)} />
          </Field>
          <Field label="Fecha objetivo">
            <input type="date" className={inputCls} value={form.fechaObj} onChange={(e) => set("fechaObj", e.target.value)} />
          </Field>
        </section>

        <DialogFooter>
          {!isNew && (
            <Button variant="destructive" onClick={removeRisk} className="mr-auto">
              Eliminar riesgo
            </Button>
          )}
          <Button onClick={save}>Guardar</Button>
        </DialogFooter>

        {isNew ? (
          <p className="text-sm text-muted-foreground">
            Guarda el riesgo para añadir planes de acción y notas de seguimiento.
          </p>
        ) : (
          <>
            <section className="space-y-2 rounded-lg border p-3">
              <h4 className="font-semibold">Nota de avance</h4>
              <div className="grid gap-2 sm:grid-cols-4">
                <Field label="Fecha">
                  <input
                    type="date"
                    max={today()}
                    className={inputCls}
                    value={upd.fecha}
                    onChange={(e) => setUpd({ ...upd, fecha: e.target.value })}
                  />
                </Field>
                <Field label="Probabilidad">
                  <select className={inputCls} value={upd.prob} onChange={(e) => setUpd({ ...upd, prob: e.target.value })}>
                    <option value="">Sin cambio</option>
                    {SC.map((v) => (
                      <option key={v} value={v}>
                        {v} · {ESC[v]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Impacto">
                  <select className={inputCls} value={upd.imp} onChange={(e) => setUpd({ ...upd, imp: e.target.value })}>
                    <option value="">Sin cambio</option>
                    {SC.map((v) => (
                      <option key={v} value={v}>
                        {v} · {ESC[v]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Estado">
                  <select className={inputCls} value={upd.estado} onChange={(e) => setUpd({ ...upd, estado: e.target.value })}>
                    <option value="">Sin cambio</option>
                    {ESTADOS.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Nota" span>
                  <textarea
                    className={cn(inputCls, "h-auto py-2")}
                    rows={2}
                    placeholder="Ej: Reunión realizada. API aún no disponible."
                    value={upd.nota}
                    onChange={(e) => setUpd({ ...upd, nota: e.target.value })}
                  />
                </Field>
              </div>
              <Button size="sm" onClick={registerUpdate}>
                Registrar avance
              </Button>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-semibold">Histórico</h4>
                <ul className="max-h-56 space-y-2 overflow-y-auto text-sm">
                  {[...current.historial].reverse().map((h, i) => (
                    <li key={i} className="rounded border-l-4 border-primary bg-muted/50 p-2">
                      <b>{fmt(h.f)}</b> · P{h.p}×I{h.i}={h.p * h.i} · {h.e}
                      <br />
                      <span className="text-muted-foreground">{h.nota}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <LineChart
                data={current.historial.map((h) => ({ label: fmt(h.f), sev: h.p * h.i }))}
                series={[{ key: "sev", label: "Severidad", color: "#e03131" }]}
                W={460}
                H={170}
              />
            </section>

            <section className="space-y-2">
              <h4 className="font-semibold">Planes de acción ({current.acciones.length})</h4>
              {current.acciones.map((a) => (
                <ActionRowCells key={a.id} api={api} riskId={id} a={a} late={isLate(a)} />
              ))}
              <div className="grid gap-3 rounded-lg border border-dashed bg-muted/40 p-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Nueva acción" span>
                  <input className={inputCls} placeholder="Nueva acción…" value={na.accion} onChange={(e) => setNa({ ...na, accion: e.target.value })} />
                </Field>
                <Field label="Responsable">
                  <input className={inputCls} list="dlPeople" value={na.resp} onChange={(e) => setNa({ ...na, resp: e.target.value })} />
                </Field>
                <Field label="Compromiso">
                  <input type="date" className={inputCls} value={na.fecha} onChange={(e) => setNa({ ...na, fecha: e.target.value })} />
                </Field>
                <Field label="Prioridad">
                  <select className={inputCls} value={na.prio} onChange={(e) => setNa({ ...na, prio: e.target.value })}>
                    {PRIOS.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </Field>
                <div className="flex items-end sm:col-span-2 lg:col-span-4 lg:justify-end">
                  <Button size="sm" onClick={addPlan}>
                    + Agregar acción
                  </Button>
                </div>
              </div>
            </section>

            <section className="space-y-2">
              <h4 className="font-semibold">Sugerencias</h4>
              <div className="flex flex-wrap gap-2">
                {suggest(risks, current)
                  .slice(0, 6)
                  .map((s) => (
                    <div key={s.accion} className="flex items-center gap-2 rounded-lg border p-2 text-sm">
                      <span>
                        {s.accion} <Tag>{s.src}</Tag>
                      </span>
                      <Button size="sm" variant="outline" onClick={() => setRisks(addSuggested(risks, id, s))}>
                        + Agregar
                      </Button>
                    </div>
                  ))}
              </div>
              {!suggest(risks, current).length && <p className="text-sm text-muted-foreground">Sin sugerencias nuevas.</p>}
            </section>

            <section className="space-y-2">
              <h4 className="font-semibold">Riesgos similares</h4>
              <div className="flex flex-col gap-1 text-sm">
                {similar(risks, current).map(({ x, s }) => (
                  <button
                    key={x.id}
                    type="button"
                    onClick={() => openRisk(x.id)}
                    className="rounded border p-2 text-left hover:border-primary"
                  >
                    <b>{x.nombre}</b> <span className="text-muted-foreground">[{x.proyecto}] · {x.estado} · {Math.round(s * 100)}% similitud</span>
                  </button>
                ))}
                {!similar(risks, current).length && (
                  <p className="text-muted-foreground">No se encontraron riesgos similares.</p>
                )}
              </div>
            </section>
          </>
        )}

        <datalist id="dlProj">
          {projects.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        <datalist id="dlPeople">
          {people.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </DialogContent>
    </Dialog>
  )
}

function ActionRowCells({ api, riskId, a, late }: { api: AppApi; riskId: string; a: Accion; late: boolean }) {
  const { risks, setRisks } = api
  const patch = (key: keyof Accion, value: string) => setRisks(updateAction(risks, riskId, a.id, key, value))
  const text = (key: keyof Accion) => (
    <input
      key={String(a[key])}
      className={inputCls}
      defaultValue={String(a[key] ?? "")}
      onBlur={(e) => e.target.value !== String(a[key] ?? "") && patch(key, e.target.value)}
    />
  )

  return (
    <div className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Acción" span>
        {text("accion")}
      </Field>
      <Field label="Responsable">{text("responsable")}</Field>
      <Field label="Compromiso">
        <input
          type="date"
          key={a.fecha}
          className={inputCls}
          defaultValue={a.fecha}
          onBlur={(e) => e.target.value && e.target.value !== a.fecha && patch("fecha", e.target.value)}
        />
        {late && <b className="text-xs text-red-600">⚠️ Retrasada</b>}
      </Field>
      <Field label="Prioridad">
        <select className={inputCls} value={a.prioridad} onChange={(e) => patch("prioridad", e.target.value)}>
          {PRIOS.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </Field>
      <Field label="Estado">
        <select className={inputCls} value={a.estado} onChange={(e) => patch("estado", e.target.value)}>
          {(["Pendiente", "En curso", "Completada"] as const).map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Field>
      <Field label="Avance %">
        <input
          type="number"
          min={0}
          max={100}
          key={a.avance}
          className={inputCls}
          defaultValue={a.avance}
          onBlur={(e) => e.target.value !== String(a.avance) && patch("avance", e.target.value)}
        />
      </Field>
      <div className="flex flex-col items-start justify-end gap-1 text-xs text-muted-foreground">
        <span>Actualizado {fmt(a.actualizado)}</span>
        <Button
          size="sm"
          variant="ghost"
          className="text-red-600"
          onClick={() => confirm("¿Eliminar esta acción?") && setRisks(deleteAction(risks, riskId, a.id))}
        >
          ✕ Eliminar
        </Button>
      </div>
      <Field label="Comentario" span>
        {text("comentario")}
      </Field>
    </div>
  )
}
