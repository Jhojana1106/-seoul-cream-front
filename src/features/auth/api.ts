import { api, tokenStorage } from "@/lib/api"
import type { ApiResponse, AuthPayload, User } from "@/types/api"

export async function login(email: string, password: string) {
  const { data } = await api.post<ApiResponse<AuthPayload>>("/auth/login", {
    email,
    password,
  })
  tokenStorage.set(data.data.access_token)
  return data.data
}

export async function fetchMe() {
  const { data } = await api.get<ApiResponse<User>>("/auth/me")
  return data.data
}

export async function updateProfile(payload: {
  name?: string
  email?: string
  phone?: string | null
  document_number?: string | null
  current_password?: string
  password?: string
  password_confirmation?: string
}) {
  const { data } = await api.put<ApiResponse<User>>("/auth/profile", payload)
  return data.data
}

export async function uploadAvatar(file: File) {
  const formData = new FormData()
  formData.append("avatar", file)

  const { data } = await api.post<ApiResponse<User>>("/auth/avatar", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return data.data
}

export async function removeAvatar() {
  const { data } = await api.delete<ApiResponse<User>>("/auth/avatar")
  return data.data
}

export async function logout() {
  try {
    await api.post("/auth/logout")
  } finally {
    tokenStorage.clear()
  }
}
