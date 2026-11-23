import { useState } from "react"
import { csvAll, dl, teamsMsg } from "@/domain/exports"
import { today } from "@/domain/model"
import { seed } from "@/domain/seed"
import type { ReportKind } from "@/components/api"
import type { AppApi } from "@/components/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { AlertTriangle, Building2, FileJson, FileSpreadsheet, FolderKanban, FileText, Presentation, RotateCcw, TrendingUp, Users } from "lucide-react"
import type { LucideIcon } from "lucide-react"

const REPORTS: { kind: ReportKind; icon: LucideIcon; title: string; desc: string }[] = [
  { kind: "pm", icon: FileText, title: "PM — Detalle completo", desc: "Todos los riesgos con acciones, historial y trazabilidad." },
  { kind: "equipo", icon: Users, title: "Equipo — Acciones y responsables", desc: "Acciones pendientes agrupadas por responsable." },
  { kind: "lider", icon: TrendingUp, title: "Líder — Críticos y evolución", desc: "Riesgos críticos/altos, tendencias y evolución semanal." },
  { kind: "comite", icon: Building2, title: "Comité ejecutivo", desc: "Exposición, mapa de calor y decisiones necesarias." },
  { kind: "proyecto", icon: FolderKanban, title: "Resumen por proyecto", desc: "Una página por proyecto." },
  { kind: "criticos", icon: AlertTriangle, title: "Riesgos críticos", desc: "Solo críticos con su plan y decisiones." },
  { kind: "ppt", icon: Presentation, title: "Presentación", desc: "Diapositivas horizontales listas para presentar o guardar como PDF." },
]

export function Reports({ api }: { api: AppApi }) {
  const { data, risks, setData, setWebhook, resetFilters, print, sendTeams, copyTeams } = api
  const [webhook, setWebhookInput] = useState(data.webhook)

  function saveWebhook() {
    const u = webhook.trim()
    if (u && !/^https:\/\//.test(u)) return alert("El webhook debe ser una URL https.")
    setWebhook(u)
    alert("Webhook guardado.")
  }

  function restore() {
    if (!confirm("¿Restablecer los datos de demostración? Se perderán los cambios.")) return
    setData(seed())
    resetFilters()
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Reportes por audiencia (PDF / imprimir)</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {REPORTS.map((r) => (
            <button
              key={r.kind}
              type="button"
              onClick={() => print(r.kind)}
              className="group flex flex-col gap-4 rounded-xl border bg-card p-5 text-left shadow-sm transition hover:border-primary hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <r.icon className="size-5" />
                </div>
                <span className="text-sm font-medium text-primary">Generar PDF</span>
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="font-medium">{r.title}</h3>
                <p className="text-sm text-muted-foreground">{r.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Datos</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <button
            type="button"
            onClick={() => dl(`riesgos-${today()}.csv`, csvAll(risks), "text/csv")}
            className="group flex flex-col gap-4 rounded-xl border bg-card p-5 text-left shadow-sm transition hover:border-primary hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileSpreadsheet className="size-5" />
              </div>
              <span className="text-sm font-medium text-primary">Descargar CSV</span>
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="font-medium">CSV — Toda la información</h3>
              <p className="text-sm text-muted-foreground">Riesgos, acciones e historial en un solo archivo CSV.</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => dl(`riesgos-respaldo-${today()}.json`, JSON.stringify(data, null, 2), "application/json")}
            className="group flex flex-col gap-4 rounded-xl border bg-card p-5 text-left shadow-sm transition hover:border-primary hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileJson className="size-5" />
              </div>
              <span className="text-sm font-medium text-primary">Descargar JSON</span>
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="font-medium">JSON — Respaldo completo</h3>
              <p className="text-sm text-muted-foreground">Todos los datos de la aplicación, listos para importar.</p>
            </div>
          </button>
          <button
            type="button"
            onClick={restore}
            className="group flex flex-col gap-4 rounded-xl border bg-card p-5 text-left shadow-sm transition hover:border-destructive hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex size-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                <RotateCcw className="size-5" />
              </div>
              <span className="text-sm font-medium text-destructive">Restablecer</span>
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="font-medium">Restablecer demo</h3>
              <p className="text-sm text-muted-foreground">Vuelve a los datos de demostración. Se pierden los cambios.</p>
            </div>
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Microsoft Teams</h2>
        <Card className="space-y-3 p-4">
          <div className="flex flex-wrap gap-2">
            <Input
              className="min-w-72 flex-1"
              placeholder="https://… URL del webhook de Teams"
              value={webhook}
              onChange={(e) => setWebhookInput(e.target.value)}
            />
            <Button variant="outline" onClick={saveWebhook}>
              Guardar
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={sendTeams}>Enviar resumen + alertas</Button>
            <Button variant="outline" onClick={copyTeams}>
              Copiar mensaje
            </Button>
          </div>
          <pre className="whitespace-pre-wrap rounded-md border bg-muted p-3 font-mono text-xs">{teamsMsg(risks)}</pre>
        </Card>
      </section>
    </div>
  )
}
