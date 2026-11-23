import { useEffect, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { decisions, execSummary, weeks } from "@/domain/analytics"
import { projTable } from "@/domain/exports"
import { allActions, delta30, fmt, isLate, isOpen, isOverdue, projectsOf, sev, today, trend } from "@/domain/model"
import type { ActionRow, Risk } from "@/domain/types"
import type { ReportKind } from "@/components/api"
import { ExpBars, Heat, LineChart } from "@/components/charts"
import { Pill } from "@/components/shared"

const bySev = (rs: Risk[]) => [...rs].sort((x, y) => sev(y) - sev(x))

export function PrintReport({ kind, risks, onDone }: { kind: ReportKind; risks: Risk[]; onDone: () => void }) {
  useEffect(() => {
    const style = document.createElement("style")
    style.textContent = `@page{size:${kind === "ppt" ? "A4 landscape" : "A4"};margin:12mm}`
    document.head.append(style)
    const timer = window.setTimeout(() => {
      window.print()
      onDone()
    }, 0)
    return () => {
      window.clearTimeout(timer)
      style.remove()
    }
    // Se imprime una sola vez por apertura: onDone es estable en el padre.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind])

  return createPortal(<div className="print-only text-[#1d2330]">{body(kind, risks)}</div>, document.body)
}

function body(kind: ReportKind, risks: Risk[]): ReactNode {
  switch (kind) {
    case "pm":
      return <PmReport risks={risks} />
    case "equipo":
      return <EquipoReport risks={risks} />
    case "lider":
      return <LiderReport risks={risks} />
    case "comite":
      return <ComiteReport risks={risks} />
    case "proyecto":
      return <ProyectoReport risks={risks} />
    case "criticos":
      return <CriticosReport risks={risks} />
    case "ppt":
      return <PptReport risks={risks} />
  }
}

function Head({ title, sub }: { title: string; sub: string }) {
  return (
    <>
      <h1 className="m-0 text-2xl font-bold">{title}</h1>
      <p className="text-sm text-gray-500">
        {sub} · Generado el {fmt(today())} · Risk Krono
      </p>
    </>
  )
}

function Tbl({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <table className="my-2 w-full border-collapse text-xs">
      <thead>
        <tr>
          {head.map((h) => (
            <th key={h} className="border bg-gray-100 p-1 text-left">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j} className="border p-1 align-top">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Kpis({ risks }: { risks: Risk[] }) {
  const rs = risks.filter(isOpen)
  const kp = [
    [rs.length, "Abiertos"],
    [rs.filter((r) => sev(r) >= 17).length, "Críticos"],
    [rs.filter(isOverdue).length, "Vencidos"],
    [allActions(risks).filter(isLate).length, "Acciones retrasadas"],
    [rs.filter((r) => delta30(r) > 0).length, "Aumentaron"],
    [risks.filter((r) => delta30(r) < 0).length, "Disminuyeron"],
  ] as const
  return (
    <div className="my-3 grid grid-cols-6 gap-2">
      {kp.map(([n, label]) => (
        <div key={label} className="rounded-lg border p-2">
          <b className="text-2xl">{n}</b>
          <br />
          <span className="text-sm text-gray-500">{label}</span>
        </div>
      ))}
    </div>
  )
}

function Evo({ risks }: { risks: Risk[] }) {
  const wk = weeks(risks)
  return (
    <>
      <LineChart data={wk} series={[{ key: "exp", label: "Exposición total", color: "#A100FF" }]} />
      <LineChart
        data={wk}
        series={[
          { key: "cnt", label: "Abiertos", color: "#868e96" },
          { key: "crit", label: "Críticos", color: "#e03131" },
        ]}
      />
    </>
  )
}

function Decisions({ risks }: { risks: Risk[] }) {
  return (
    <ol>
      {decisions(risks).map((d) => (
        <li key={d}>{d}</li>
      ))}
    </ol>
  )
}

function ProjTable({ risks }: { risks: Risk[] }) {
  const [head, ...rows] = projTable(risks)
  return <Tbl head={head.map(String)} rows={rows.map((r) => r.map((c) => String(c)))} />
}

function RiskBlock({ r }: { r: Risk }) {
  return (
    <div className="my-2.5 break-inside-avoid rounded-lg border p-2.5">
      <h3 className="m-0 text-base font-semibold">
        <Pill v={sev(r)} /> {r.nombre}
      </h3>
      <p className="m-0 text-sm text-gray-600">
        {r.proyecto} · {r.categoria} · {r.estado} · Resp. {r.responsable} · Identificado {fmt(r.fechaId)} · Objetivo{" "}
        {fmt(r.fechaObj)}
        {isOverdue(r) ? " ⚠️ VENCIDO" : ""} · Tendencia {trend(r)}
      </p>
      <p>{r.descripcion}</p>
      {r.acciones.length ? (
        <Tbl
          head={["Acción", "Resp.", "Compromiso", "Prioridad", "Estado", "Avance", "Evidencia", "Actualizado"]}
          rows={r.acciones.map((a) => [
            a.accion,
            a.responsable,
            fmt(a.fecha) + (isLate(a) ? " ⚠️" : ""),
            a.prioridad,
            a.estado,
            a.avance + "%",
            a.comentario,
            fmt(a.actualizado),
          ])}
        />
      ) : (
        <p>
          <i>Sin plan de acción</i>
        </p>
      )}
      <div className="mt-2">
        {r.historial.map((x, i) => (
          <p key={i} className="m-0 text-sm">
            <small>
              {fmt(x.f)} · P{x.p}×I{x.i}={x.p * x.i}
            </small>{" "}
            {x.nota}
          </p>
        ))}
      </div>
    </div>
  )
}

function PmReport({ risks }: { risks: Risk[] }) {
  return (
    <>
      <Head title="Reporte detallado de riesgos" sub="Para PM: detalle completo" />
      <Kpis risks={risks} />
      <h2>Por proyecto</h2>
      <ProjTable risks={risks} />
      {projectsOf(risks).map((p) => (
        <section key={p} className="break-before-page">
          <h2>{p}</h2>
          {bySev(risks.filter((r) => r.proyecto === p)).map((r) => (
            <RiskBlock key={r.id} r={r} />
          ))}
        </section>
      ))}
    </>
  )
}

function EquipoReport({ risks }: { risks: Risk[] }) {
  const pend = allActions(risks).filter((a) => a.estado !== "Completada")
  const names = [...new Set(pend.map((a) => a.responsable))].sort()
  return (
    <>
      <Head title="Plan de acción del equipo" sub="Para el equipo: acciones y responsables" />
      {names.map((name) => {
        const as = pend
          .filter((a) => a.responsable === name)
          .sort((x, y) => x.fecha.localeCompare(y.fecha))
        const late = as.filter(isLate).length
        return (
          <section key={name} className="break-before-page">
            <h2>
              {name} — {as.length} pendientes{late ? `, ${late} retrasadas` : ""}
            </h2>
            <Tbl
              head={["Acción", "Riesgo", "Proyecto", "Compromiso", "Prioridad", "Estado", "Avance", "Comentario"]}
              rows={as.map((a: ActionRow) => [
                a.accion,
                a.r.nombre,
                a.r.proyecto,
                fmt(a.fecha) + (isLate(a) ? " ⚠️ RETRASADA" : ""),
                a.prioridad,
                a.estado,
                a.avance + "%",
                a.comentario,
              ])}
            />
          </section>
        )
      })}
    </>
  )
}

function LiderReport({ risks }: { risks: Risk[] }) {
  const changed = bySev(risks.filter((r) => delta30(r) !== 0))
  return (
    <>
      <Head title="Riesgos críticos y evolución" sub="Para líderes" />
      <Kpis risks={risks} />
      <h2>Evolución (6 semanas)</h2>
      <Evo risks={risks} />
      <h2>Cambios de severidad (30 días)</h2>
      <Tbl
        head={["Riesgo", "Proyecto", "Severidad", "Cambio", "Responsable"]}
        rows={changed.map((r) => [r.nombre, r.proyecto, <Pill v={sev(r)} />, trend(r), r.responsable])}
      />
      <h2>Riesgos críticos y altos</h2>
      {bySev(risks.filter((r) => isOpen(r) && sev(r) >= 10)).map((r) => (
        <RiskBlock key={r.id} r={r} />
      ))}
    </>
  )
}

function ComiteReport({ risks }: { risks: Risk[] }) {
  return (
    <>
      <Head title="Resumen para Comité Ejecutivo" sub="Exposición y decisiones necesarias" />
      <Kpis risks={risks} />
      <h2>Mensajes clave</h2>
      <p className="whitespace-pre-wrap">{execSummary(risks)}</p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h2>Mapa de calor</h2>
          <Heat risks={risks} onPick={() => undefined} />
        </div>
        <div>
          <h2>Evolución</h2>
          <LineChart data={weeks(risks)} series={[{ key: "exp", label: "Exposición total", color: "#A100FF" }]} />
        </div>
      </div>
      <h2>Exposición por proyecto</h2>
      <ProjTable risks={risks} />
      <h2>Decisiones necesarias</h2>
      <Decisions risks={risks} />
    </>
  )
}

function ProyectoReport({ risks }: { risks: Risk[] }) {
  const actions = allActions(risks)
  return (
    <>
      {projectsOf(risks).map((p) => {
        const rs = bySev(risks.filter((r) => r.proyecto === p && isOpen(r)))
        const la = actions.filter((a) => a.r.proyecto === p && isLate(a))
        return (
          <section key={p} className="break-before-page">
            <Head title={`Resumen: ${p}`} sub="Resumen por proyecto" />
            <p>
              <b>{rs.length}</b> riesgos abiertos · exposición <b>{rs.reduce((s, r) => s + sev(r), 0)}</b> pts ·{" "}
              <b>{rs.filter((r) => sev(r) >= 17).length}</b> críticos · <b>{rs.filter(isOverdue).length}</b> vencidos ·{" "}
              <b>{la.length}</b> acciones retrasadas
            </p>
            <Tbl
              head={["Severidad", "Riesgo", "Estado", "Responsable", "Objetivo", "Tendencia", "Acciones"]}
              rows={rs.map((r) => [
                <Pill v={sev(r)} />,
                r.nombre,
                r.estado,
                r.responsable,
                fmt(r.fechaObj) + (isOverdue(r) ? " ⚠️" : ""),
                trend(r),
                `${r.acciones.filter((a) => a.estado === "Completada").length}/${r.acciones.length}`,
              ])}
            />
            {la.length > 0 && (
              <>
                <h2>Acciones retrasadas</h2>
                <Tbl
                  head={["Acción", "Riesgo", "Responsable", "Compromiso", "Avance"]}
                  rows={la.map((a) => [a.accion, a.r.nombre, a.responsable, fmt(a.fecha), a.avance + "%"])}
                />
              </>
            )}
          </section>
        )
      })}
    </>
  )
}

function CriticosReport({ risks }: { risks: Risk[] }) {
  const crit = bySev(risks.filter((r) => isOpen(r) && sev(r) >= 17))
  return (
    <>
      <Head title="Riesgos críticos" sub="Severidad 17–25" />
      {crit.length ? crit.map((r) => <RiskBlock key={r.id} r={r} />) : <p>No hay riesgos críticos abiertos.</p>}
      <h2>Decisiones necesarias</h2>
      <Decisions risks={risks} />
    </>
  )
}

function PptReport({ risks }: { risks: Risk[] }) {
  const crit = bySev(risks.filter((r) => isOpen(r) && sev(r) >= 17))
  return (
    <>
      <section className="break-before-page">
        <h1 className="text-4xl font-bold">🛡️ Estado de riesgos del portafolio</h1>
        <p className="text-xl text-gray-500">{fmt(today())}</p>
        <Kpis risks={risks} />
      </section>
      <section className="break-before-page">
        <h1 className="text-3xl font-bold">Mensajes clave</h1>
        <p className="whitespace-pre-wrap text-lg">{execSummary(risks)}</p>
      </section>
      <section className="break-before-page">
        <h1 className="text-3xl font-bold">Mapa de calor y exposición</h1>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Heat risks={risks} onPick={() => undefined} />
          </div>
          <div>
            <ExpBars risks={risks} onPick={() => undefined} />
          </div>
        </div>
      </section>
      <section className="break-before-page">
        <h1 className="text-3xl font-bold">Evolución del riesgo (6 semanas)</h1>
        <Evo risks={risks} />
      </section>
      <section className="break-before-page">
        <h1 className="text-3xl font-bold">Riesgos críticos</h1>
        <Tbl
          head={["Riesgo", "Proyecto", "Sev.", "Tendencia", "Responsable", "Objetivo"]}
          rows={crit.map((r) => [r.nombre, r.proyecto, <Pill v={sev(r)} />, trend(r), r.responsable, fmt(r.fechaObj)])}
        />
      </section>
      <section className="break-before-page">
        <h1 className="text-3xl font-bold">Decisiones requeridas</h1>
        <div className="text-lg">
          <Decisions risks={risks} />
        </div>
      </section>
    </>
  )
}
