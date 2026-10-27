export type Permission = {
  id: number
  name: string
  module: string
  label: string
  guard_name: string
}

export type Role = {
  id: number
  name: string
  guard_name: string
  is_protected: boolean
  users_count?: number
  permissions?: Permission[]
}

export type User = {
  id: number
  name: string
  email: string
  phone?: string | null
  document_number?: string | null
  avatar?: string | null
  avatar_url?: string | null
  is_active: boolean
  last_login_at?: string | null
  roles?: Role[]
  permissions?: string[]
  created_at?: string
  updated_at?: string
}

export type ApiResponse<T> = {
  success: boolean
  message: string
  data: T
  meta?: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
  errors?: Record<string, string[]>
}

export type AuthPayload = {
  access_token: string
  token_type: string
  expires_in: number
  user: User
}
