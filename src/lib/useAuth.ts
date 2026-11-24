import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { clearToken, getMe, getToken, login, setToken, type User } from "@/lib/auth"

export const ME_KEY = ["auth", "me"] as const

export function useMe() {
  return useQuery({
    queryKey: ME_KEY,
    queryFn: getMe,
    enabled: getToken() !== null,
    retry: false,
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const { access_token } = await login(credentials.email, credentials.password)
      setToken(access_token)
      return getMe()
    },
    onSuccess: (user) => {
      queryClient.setQueryData(ME_KEY, user)
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 3000))
      clearToken()
    },
    onSuccess: () => {
      queryClient.setQueryData<User | null>(ME_KEY, null)
    },
  })
}
