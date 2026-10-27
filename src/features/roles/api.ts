import { api } from "@/lib/api"
import type { ApiResponse, Role } from "@/types/api"

export async function listRoles(search = "") {
  const { data } = await api.get<ApiResponse<Role[]>>("/roles", {
    params: { search, per_page: 200 },
  })
  return data
}

export async function createRole(payload: {
  name: string
  permissions: string[]
}) {
  const { data } = await api.post<ApiResponse<Role>>("/roles", payload)
  return data.data
}

export async function updateRole(
  id: number,
  payload: { name?: string; permissions?: string[] }
) {
  const { data } = await api.put<ApiResponse<Role>>(`/roles/${id}`, payload)
  return data.data
}

export async function deleteRole(id: number) {
  await api.delete(`/roles/${id}`)
}

export async function syncRolePermissions(id: number, permissions: string[]) {
  const { data } = await api.post<ApiResponse<Role>>(
    `/roles/${id}/permissions`,
    { permissions }
  )
  return data.data
}
