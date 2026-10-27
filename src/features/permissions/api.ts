import { api } from "@/lib/api"
import type { ApiResponse, Permission } from "@/types/api"

export async function getPermissionsCatalog() {
  const { data } = await api.get<ApiResponse<Record<string, Permission[]>>>(
    "/permissions/catalog"
  )
  return data.data
}

export async function listPermissions() {
  const { data } = await api.get<ApiResponse<Permission[]>>("/permissions", {
    params: { per_page: 200 },
  })
  return data
}
