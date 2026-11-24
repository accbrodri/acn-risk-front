import { AuthLoader } from "@/components/AuthLoader"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useLogin } from "@/lib/useAuth"

export function LoginPage() {
  const login = useLogin()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  function onSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    login.mutate({ email, password })
  }

  if (login.isPending) return <AuthLoader text="Ingresando…" />

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-linear-to-br from-[#1a0033] via-[#4b0082] to-[#a100ff] p-4">
      <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-[#ff4fd8]/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-[28rem] w-[28rem] rounded-full bg-[#6ea8ff]/30 blur-3xl" />

      <div className="relative w-full max-w-md rounded-2xl border border-white/15 bg-white/10 p-8 text-white shadow-2xl backdrop-blur-xl">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex items-center gap-3">
            <img src="/accenture-logo.png" alt="Accenture" className="h-8" />
            <h1 className="text-2xl font-semibold tracking-tight">Risk Krono</h1>
          </div>
          <p className="text-sm text-white/70">Gestión y seguimiento de riesgos</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white/80">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@acn.com"
              className="h-11 border-white/20 bg-white/10 text-white placeholder:text-white/40 focus-visible:border-[#ff7cf5] focus-visible:ring-[#ff7cf5]/40"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-white/80">
              Contraseña
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-11 border-white/20 bg-white/10 text-white placeholder:text-white/40 focus-visible:border-[#ff7cf5] focus-visible:ring-[#ff7cf5]/40"
            />
          </div>

          {login.isError && (
            <p className="rounded-md border border-red-400/40 bg-red-500/20 px-3 py-2 text-sm text-red-100">
              {login.error.message}
            </p>
          )}

          <Button
            type="submit"
            disabled={login.isPending}
            className="h-11 w-full bg-white text-[#4b0082] shadow-lg hover:bg-white/90"
          >
            {login.isPending ? "Ingresando…" : "Ingresar"}
          </Button>
        </form>
      </div>
    </div>
  )
}
