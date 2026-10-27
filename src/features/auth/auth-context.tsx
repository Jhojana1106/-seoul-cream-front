import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  fetchMe,
  login as loginRequest,
  logout as logoutRequest,
  removeAvatar as removeAvatarRequest,
  updateProfile as updateProfileRequest,
  uploadAvatar as uploadAvatarRequest,
} from "@/features/auth/api"
import { tokenStorage } from "@/lib/api"
import type { User } from "@/types/api"

type ProfilePayload = {
  name?: string
  email?: string
  phone?: string | null
  document_number?: string | null
  current_password?: string
  password?: string
  password_confirmation?: string
}

type AuthContextValue = {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  updateProfile: (payload: ProfilePayload) => Promise<User>
  uploadAvatar: (file: File) => Promise<User>
  removeAvatar: () => Promise<User>
  hasPermission: (permission: string) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = tokenStorage.get()
    if (!token) {
      setLoading(false)
      return
    }

    fetchMe()
      .then(setUser)
      .catch(() => tokenStorage.clear())
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const payload = await loginRequest(email, password)
    setUser(payload.user)
    return payload.user
  }, [])

  const logout = useCallback(async () => {
    await logoutRequest()
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    const me = await fetchMe()
    setUser(me)
  }, [])

  const updateProfile = useCallback(async (payload: ProfilePayload) => {
    const updated = await updateProfileRequest(payload)
    setUser(updated)
    return updated
  }, [])

  const uploadAvatar = useCallback(async (file: File) => {
    const updated = await uploadAvatarRequest(file)
    setUser(updated)
    return updated
  }, [])

  const removeAvatar = useCallback(async () => {
    const updated = await removeAvatarRequest()
    setUser(updated)
    return updated
  }, [])

  const hasPermission = useCallback(
    (permission: string) => {
      if (!user?.permissions) return false
      return user.permissions.includes(permission)
    },
    [user]
  )

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      refreshUser,
      updateProfile,
      uploadAvatar,
      removeAvatar,
      hasPermission,
    }),
    [
      user,
      loading,
      login,
      logout,
      refreshUser,
      updateProfile,
      uploadAvatar,
      removeAvatar,
      hasPermission,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider")
  return ctx
}
