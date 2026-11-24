import type { View } from "@/components/api"

export type Role = "project_leader" | "project_manager" | "executive_committee" | "project_team"

export const ROLES: { id: Role; label: string; views: View[] }[] = [
  { id: "project_manager", label: "Project Manager", views: ["dash", "risks", "actions", "ai", "reports"] },
  { id: "project_team", label: "Equipo del proyecto", views: ["actions"] },
  { id: "project_leader", label: "Líder de proyecto", views: ["risks", "actions", "ai"] },
  { id: "executive_committee", label: "Comité ejecutivo", views: ["dash", "reports"] },
]

export function roleViews(role: Role): View[] {
  return ROLES.find((r) => r.id === role)?.views ?? []
}

export function roleLabel(role: Role): string {
  return ROLES.find((r) => r.id === role)?.label ?? role
}
