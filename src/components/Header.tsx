import type { View } from "@/components/api"
import { roleLabel, roleViews } from "@/domain/roles"
import type { User } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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
  user,
  onLogout,
}: {
  view: View
  go: (v: View) => void
  onNew: () => void
  user: User
  onLogout: () => void
}) {
  const views = roleViews(user.role)
  const initials = user.full_name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
  return (
    <header className="border-b bg-card text-foreground">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3">
        <img src="/accenture-logo.png" alt="Accenture" className="h-6" />
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
        {views.includes("risks") && (
          <Button onClick={onNew}>
            + Nuevo riesgo
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-full outline-none transition focus-visible:ring-2 focus-visible:ring-ring">
            <Avatar className="size-9">
              <AvatarFallback className="bg-linear-to-br from-[#4b0082] to-[#a100ff] font-semibold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex flex-col gap-0.5">
                <span className="font-medium text-foreground">{user.full_name}</span>
                <span className="text-xs font-normal text-muted-foreground">{roleLabel(user.role)}</span>
                <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onLogout}>
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
