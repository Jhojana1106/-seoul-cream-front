import { useNavigate, useSearchParams } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useAuth } from "@/features/auth/auth-context"
import { loginSchema, type LoginValues } from "@/features/auth/schemas"
import { applyApiErrors } from "@/lib/form-errors"
import { firstStaffPath, isStaff } from "@/lib/access"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { FieldDescription, FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Mark } from "@/features/store/components"

function safeNext(value: string | null, staff: boolean) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null
  if (value.startsWith("/admin") && !staff) return "/account"
  if (value.startsWith("/login")) return null
  return value
}

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onTouched",
  })

  async function onSubmit(values: LoginValues) {
    try {
      const user = await login(values.email, values.password)
      toast.success("Sesión iniciada")
      const staff = isStaff(user)
      const next = safeNext(params.get("next"), staff)
      if (next) {
        navigate(next)
        return
      }
      navigate(staff ? firstStaffPath(user.permissions ?? []) : "/account")
    } catch (error) {
      const message = applyApiErrors(error, form.setError, "Credenciales inválidas")
      toast.error(message)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <Form {...form}>
            <form
              className="p-6 md:p-8"
              onSubmit={form.handleSubmit(onSubmit)}
              noValidate
            >
              <FieldGroup>
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-2xl font-semibold tracking-tight">Entrar a Seoul Cream</h1>
                  <p className="text-balance text-muted-foreground">
                    Clientes y personal usan la misma cuenta. El panel aparece solo si tu rol tiene permisos.
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="tu@correo.com"
                          autoComplete="username"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          autoComplete="current-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  className="w-full"
                >
                  {form.formState.isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Ingresando…
                    </>
                  ) : (
                    "Iniciar sesión"
                  )}
                </Button>

                <FieldDescription className="text-center">
                  La cuenta inicial del starter es de demostración: admin@example.com / password.
                  La recuperación de contraseña todavía no está conectada.
                </FieldDescription>
              </FieldGroup>
            </form>
          </Form>

          <div className="relative hidden overflow-hidden bg-[#FFF0D9] md:block">
            <div className="relative z-10 flex h-full flex-col justify-between p-8 text-[#454545]">
              <div className="flex items-center gap-2">
                <Mark />
                <p className="text-sm font-semibold">Seoul Cream</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9A8E91]">
                  Heladería
                </p>
                <h2 className="mt-3 max-w-xs text-3xl font-semibold tracking-tight">
                  Una carta suave, una operación precisa.
                </h2>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
