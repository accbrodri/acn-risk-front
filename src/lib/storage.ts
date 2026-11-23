import { seed } from "@/domain/seed"
import type { Data } from "@/domain/types"

const KEY = "radar-riesgos"

export function load(): Data {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const d = JSON.parse(raw) as Data
      if (Array.isArray(d.risks)) return d
    }
  } catch {
    // JSON inválido o localStorage no disponible: usar datos demo.
  }
  return seed()
}

export function save(d: Data) {
  localStorage.setItem(KEY, JSON.stringify(d))
}
