import { Loader2Icon } from "lucide-react"

export function AuthLoader({ text }: { text: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-[#1a0033] via-[#4b0082] to-[#a100ff] p-4 text-white">
      <div className="flex flex-col items-center gap-4">
        <Loader2Icon className="size-10 animate-spin" />
        <p className="text-sm text-white/80">{text}</p>
      </div>
    </div>
  )
}
