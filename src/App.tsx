import { useEffect, useState } from "react"
import { answer, detect as parseRisks, type Detected } from "@/domain/ai"
import type { ChatMsg, DetItem, ReportKind, View, AppApi } from "@/components/api"
import { Header } from "@/components/Header"
import { PrintReport } from "@/components/PrintReport"
import { RiskDialog } from "@/components/RiskDialog"
import { Dashboard } from "@/views/Dashboard"
import { Risks } from "@/views/Risks"
import { Actions } from "@/views/Actions"
import { AI } from "@/views/AI"
import { Reports } from "@/views/Reports"
import type { Filters } from "@/domain/filters"
import { createDetected } from "@/domain/mutations"
import { teamsMsg } from "@/domain/exports"
import { uid } from "@/domain/model"
import { load, save } from "@/lib/storage"
import type { Data } from "@/domain/types"
import { roleViews } from "@/domain/roles"
import { LoginPage } from "@/components/LoginPage"
import { useLogout, useMe } from "@/lib/useAuth"
import { AuthLoader } from "@/components/AuthLoader"

const CHAT_INIT: ChatMsg[] = [
  {
    me: false,
    t: 'Hola 👋 Pregúntame sobre los riesgos en lenguaje natural.\nEj: "¿cuáles son críticos?", "acciones retrasadas de Carlos", "riesgos de Migración Cloud", "recomendaciones", "resumen ejecutivo".',
  },
]

const DET_INIT =
  "Acta comité semanal: El proveedor de pagos aún no entrega las credenciales del ambiente de pruebas, lo que bloquea la integración. Dos desarrolladores salen a vacaciones en diciembre. El área legal alerta sobre una nueva normativa de protección de datos personales que aplica antes de la salida a producción. El presupuesto de licencias podría superarse por el cambio de tarifa. El frente de reportes avanza según lo planeado."

export default function App() {
  const [data, setDataState] = useState<Data>(load)
  const me = useMe()
  const logout = useLogout()
  const [view, setView] = useState<View>("dash")
  const [filters, setFiltersState] = useState<Filters>({})
  const [modal, setModal] = useState<string | null>(null)
  const [printKind, setPrintKind] = useState<ReportKind | null>(null)
  const [chat, setChat] = useState<ChatMsg[]>(CHAT_INIT)
  const [detText, setDetText] = useState(DET_INIT)
  const [det, setDet] = useState<DetItem[]>([])

  useEffect(() => {
    save(data)
  }, [data])

  if (me.isLoading) return <div className="p-8 text-muted-foreground">Cargando sesión…</div>
  const user = me.data
  if (logout.isPending) return <AuthLoader text="Cerrando sesión…" />
  if (!user) return <LoginPage />
  const role = user.role

  const { risks } = data
  const views = roleViews(role)
  const current = views.includes(view) ? view : views[0]

  const api: AppApi = {
    data,
    risks,
    setRisks: (next) => setDataState({ ...data, risks: next }),
    setWebhook: (url) => setDataState({ ...data, webhook: url }),
    setData: setDataState,
    filters,
    setFilters: (patch) => setFiltersState((prev) => ({ ...prev, ...patch })),
    resetFilters: () => setFiltersState({}),
    go: (v, f = {}) => {
      setView(v)
      setFiltersState(f)
    },
    openRisk: (id) => setModal(id ?? uid()),
    print: setPrintKind,
    sendTeams: () => {
      if (!data.webhook) {
        setView("reports")
        alert('Configura primero el webhook de Teams en "Reportes y exportación".')
        return
      }
      const text = teamsMsg(risks).replace(/\n/g, "<br>")
      fetch(data.webhook, { method: "POST", mode: "no-cors", body: JSON.stringify({ text }) })
        .then(() => alert("Mensaje enviado a Teams."))
        .catch((e: unknown) => alert("No se pudo enviar: " + (e instanceof Error ? e.message : String(e))))
    },
    copyTeams: () => {
      navigator.clipboard
        .writeText(teamsMsg(risks))
        .then(() => alert("Mensaje copiado. Pégalo en tu canal de Teams."))
        .catch((e: unknown) => alert("No se pudo copiar: " + (e instanceof Error ? e.message : String(e))))
    },
    ai: {
      chat,
      ask: (q) => {
        if (!q.trim()) return
        setChat((c) => [...c, { me: true, t: q }, { me: false, t: answer(risks, q) }])
        setView("ai")
      },
      detText,
      setDetText,
      det,
      detect: () => {
        const found = parseRisks(detText)
        if (!found.length) {
          alert("No se detectaron riesgos en el texto.")
          return
        }
        setDet(found.map((d: Detected) => ({ ...d, on: true })))
      },
      toggleDet: (i) => setDet((list) => list.map((d, j) => (j === i ? { ...d, on: !d.on } : d))),
      createDet: (proyecto, responsable) => {
        if (!proyecto || !responsable) {
          alert("Indica proyecto y responsable.")
          return
        }
        setDataState({ ...data, risks: createDetected(risks, det.filter((d) => d.on), proyecto, responsable) })
        setDet([])
        setView("risks")
        setFiltersState({ proyecto })
      },
    },
  }


  return (
    <div className="min-h-screen bg-background text-foreground">
      <div>
        <Header view={current} go={(v) => api.go(v)} onNew={() => api.openRisk(null)} user={user} onLogout={() => logout.mutate()} />
        <main className="mx-auto max-w-7xl space-y-4 p-4">
          {current === "dash" && <Dashboard api={api} />}
          {current === "risks" && <Risks api={api} />}
          {current === "actions" && <Actions api={api} />}
          {current === "ai" && <AI api={api} />}
          {current === "reports" && <Reports api={api} />}
        </main>
      </div>
      {modal !== null && (
        <RiskDialog key={modal} api={api} id={modal} onClose={() => setModal(null)} />
      )}
      {printKind && <PrintReport kind={printKind} risks={risks} onDone={() => setPrintKind(null)} />}
    </div>
  )
}
