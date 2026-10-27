import { api } from "@/lib/api"
import type { ApiResponse, User } from "@/types/api"

export async function listUsers(search = "") {
  const { data } = await api.get<ApiResponse<User[]>>("/users", {
    params: { search, per_page: 200 },
  })
  return data
}

export async function createUser(payload: {
  name: string
  email: string
  password: string
  password_confirmation: string
  phone?: string
  document_number?: string
  is_active?: boolean
  roles?: string[]
}) {
  const { data } = await api.post<ApiResponse<User>>("/users", payload)
  return data.data
}

export async function deleteUser(id: number) {
  await api.delete(`/users/${id}`)
}

export async function updateUser(
  id: number,
  payload: {
    name?: string
    email?: string
    phone?: string | null
    document_number?: string | null
    password?: string
    password_confirmation?: string
    is_active?: boolean
    roles?: string[]
  }
) {
  const { data } = await api.put<ApiResponse<User>>(`/users/${id}`, payload)
  return data.data
}
