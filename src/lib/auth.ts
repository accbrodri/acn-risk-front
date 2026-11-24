import type { Role } from "@/domain/roles"

const TOKEN_KEY = "risk-krono-token"

export interface User {
  id: number
  full_name: string
  email: string
  role: Role
}

interface TokenResponse {
  access_token: string
  token_type: string
}

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body !== undefined) headers.set("Content-Type", "application/json")
  const token = getToken()
  if (token) headers.set("Authorization", `Bearer ${token}`)

  const res = await fetch(path, { ...init, headers })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: unknown } | null
    const detail = typeof body?.detail === "string" ? body.detail : res.statusText
    throw new ApiError(res.status, detail)
  }
  return (await res.json()) as T
}

export function login(email: string, password: string): Promise<TokenResponse> {
  return request<TokenResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
}

export async function getMe(): Promise<User> {
  try {
    return await request<User>("/auth/me")
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) clearToken()
    throw e
  }
}
