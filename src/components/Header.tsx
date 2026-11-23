import type { View } from "@/components/api"
import { ROLES, roleViews, type Role } from "@/domain/roles"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const NAV: { view: View; label: string }[] = [
  { view: "dash", label: "Dashboard" },
  { view: "risks", label: "Riesgos" },
  { view: "actions", label: "Planes de acción" },
  { view: "ai", label: "Asistente IA" },
  { view: "reports", label: "Reportes y exportación" },
]

export function Header({
  view,
  go,
  onNew,
  role,
  onRole,
}: {
  view: View
  go: (v: View) => void
  onNew: () => void
  role: Role
  onRole: (r: Role) => void
}) {
  const views = roleViews(role)
  return (
    <header className="border-b bg-card text-foreground">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <img src="/accenture-logo.png" alt="Accenture" className="h-6" />
          <b className="text-lg">Risk Krono</b>
        </div>
        <nav className="flex flex-1 flex-wrap gap-1">
          {NAV.filter((n) => views.includes(n.view)).map((n) => (
            <button
              key={n.view}
              type="button"
              onClick={() => go(n.view)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition",
                view === n.view ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {n.label}
            </button>
          ))}
        </nav>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Rol
          <select
            value={role}
            onChange={(e) => onRole(e.target.value as Role)}
            className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
          >
            {ROLES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        {views.includes("risks") && (
          <Button onClick={onNew}>
            + Nuevo riesgo
          </Button>
        )}
      </div>
    </header>
  )
}
