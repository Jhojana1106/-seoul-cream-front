import type { ReactNode } from "react"
import { useAuth } from "@/features/auth"

export function Allowed({ permission, children }: { permission: string; children: ReactNode }) {
  const { hasPermission } = useAuth()
  if (hasPermission(permission)) return children

  return (
    <div className="px-4 lg:px-6">
      <h2 className="text-2xl font-semibold tracking-tight">Sin acceso</h2>
      <p className="mt-2 max-w-lg text-sm text-muted-foreground">
        Tu usuario no tiene el permiso necesario para esta sección. Si deberías verla, pide que te lo asignen en roles.
      </p>
    </div>
  )
}
