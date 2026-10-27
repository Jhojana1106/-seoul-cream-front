import { Link, Navigate, useSearchParams } from "react-router-dom"
import { LoginForm } from "@/features/auth/components/login-form"
import { useAuth } from "@/features/auth/auth-context"
import { ModeToggle } from "@/components/mode-toggle"
import { firstStaffPath, isStaff } from "@/lib/access"

export function LoginPage() {
  const { user, loading } = useAuth()
  const [params] = useSearchParams()

  if (!loading && user) {
    const staff = isStaff(user)
    const next = params.get("next")
    if (next?.startsWith("/admin") && staff) return <Navigate to={next} replace />
    if (next?.startsWith("/account")) return <Navigate to={next} replace />
    return <Navigate to={staff ? firstStaffPath(user.permissions ?? []) : "/account"} replace />
  }

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center bg-[#F7F4F3] p-6 md:p-10">
      <div className="absolute right-4 top-4 flex items-center gap-3">
        <Link to="/registro" className="text-sm text-primary">Crear cuenta</Link>
        <ModeToggle />
      </div>
      <div className="w-full max-w-sm md:max-w-4xl">
        <LoginForm />
      </div>
    </div>
  )
}
