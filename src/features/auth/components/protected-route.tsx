import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuth } from "@/features/auth/auth-context"
import { isStaff } from "@/lib/access"

export function ProtectedRoute({ staff = false }: { staff?: boolean }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        Cargando sesión…
      </div>
    )
  }

  const next = `${location.pathname}${location.search}`
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />
  if (staff && !isStaff(user)) return <Navigate to="/account" replace />

  return <Outlet />
}
