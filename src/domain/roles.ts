import type { View } from "@/components/api"

export type Role = "pm" | "equipo" | "lider" | "comite"

export const ROLES: { id: Role; label: string; views: View[] }[] = [
  { id: "pm", label: "PM", views: ["dash", "risks", "actions", "ai", "reports"] },
  { id: "equipo", label: "Equipo", views: ["actions"] },
  { id: "lider", label: "Líder", views: ["risks", "actions", "ai"] },
  { id: "comite", label: "Comité ejecutivo", views: ["dash", "reports"] },
]

export function roleViews(role: Role): View[] {
  return ROLES.find((r) => r.id === role)?.views ?? []
}
