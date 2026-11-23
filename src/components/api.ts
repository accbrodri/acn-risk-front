import type { Detected } from "@/domain/ai"
import type { Filters } from "@/domain/filters"
import type { Data, Risk } from "@/domain/types"

export type View = "dash" | "risks" | "actions" | "ai" | "reports"

export type ReportKind = "pm" | "equipo" | "lider" | "comite" | "proyecto" | "criticos" | "ppt"

export interface ChatMsg {
  me: boolean
  t: string
}

export type DetItem = Detected & { on: boolean }

export interface AppApi {
  data: Data
  risks: Risk[]
  setRisks: (risks: Risk[]) => void
  setWebhook: (url: string) => void
  setData: (d: Data) => void
  filters: Filters
  setFilters: (patch: Filters) => void
  resetFilters: () => void
  go: (view: View, f?: Filters) => void
  openRisk: (id: string | null) => void
  print: (k: ReportKind) => void
  sendTeams: () => void
  copyTeams: () => void
  ai: {
    chat: ChatMsg[]
    ask: (q: string) => void
    detText: string
    setDetText: (t: string) => void
    det: DetItem[]
    detect: () => void
    toggleDet: (i: number) => void
    createDet: (proyecto: string, responsable: string) => void
  }
}
