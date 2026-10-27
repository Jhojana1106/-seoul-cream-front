import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useAuth } from "@/features/auth"
import { cancelMyOrder, deleteAddress, getOrder, myAddresses, myOrders, saveAddress } from "@/features/store/api"
import { getApiMessage } from "@/lib/form-errors"
import { formatMoney } from "@/lib/money"
import { OrderProgress, orderStatusLabel, paymentStatusLabel } from "@/features/store/order-progress"
import type { Address, ShopOrder } from "@/types/commerce"
import { ListPager } from "@/components/list-pager"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ProfilePage } from "@/features/auth/pages/profile-page"

const registerSchema = z.object({
  name: z.string().min(2, "Escribe tu nombre"),
  email: z.string().email("Correo no válido"),
  phone: z.string().optional(),
  password: z.string().min(8, "Mínimo 8 caracteres"),
  password_confirmation: z.string(),
}).refine((values) => values.password === values.password_confirmation, {
  path: ["password_confirmation"],
  message: "Las contraseñas no coinciden",
})

type RegisterValues = z.infer<typeof registerSchema>

export function RegisterPage() {
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", phone: "", password: "", password_confirmation: "" },
  })

  async function onSubmit(values: RegisterValues) {
    try {
      await loginAfterRegister(values)
      await refreshUser()
      toast.success("Cuenta creada")
      navigate("/account")
    } catch (error) {
      toast.error(getApiMessage(error))
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <p className="eyebrow">Cuenta</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Crear cuenta</h1>
      <form className="mt-8 grid gap-3" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        {(["name", "email", "phone", "password", "password_confirmation"] as const).map((field) => (
          <label key={field} className="text-sm font-medium">
            {field === "password_confirmation" ? "Confirmar contraseña" : field === "name" ? "Nombre" : field === "email" ? "Correo" : field === "phone" ? "Teléfono" : "Contraseña"}
            <Input className="mt-1 bg-white" type={field.includes("password") ? "password" : field === "email" ? "email" : "text"} {...form.register(field)} />
            <span className="text-destructive">{form.formState.errors[field]?.message}</span>
          </label>
        ))}
        <Button type="submit" disabled={form.formState.isSubmitting}>Crear cuenta</Button>
      </form>
      <p className="mt-4 text-sm text-muted-foreground">
        ¿Ya tienes cuenta? <Link to="/login" className="text-primary">Entra</Link>. La recuperación de contraseña no está conectada.
      </p>
    </div>
  )
}

async function loginAfterRegister(values: RegisterValues) {
  const { api, tokenStorage } = await import("@/lib/api")
  const { data } = await api.post("/auth/register", values)
  tokenStorage.set(data.data.access_token)
}

export function AccountPage() {
  const { user } = useAuth()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ recipient: user?.name || "", line1: "", city: "", phone: user?.phone || "" })

  useEffect(() => {
    myAddresses().then(setAddresses).catch((reason) => setError(getApiMessage(reason)))
  }, [])

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="eyebrow">Mi cuenta</p>
          <h1 className="text-4xl font-semibold tracking-tight">{user?.name}</h1>
        </div>
        <Button asChild variant="outline"><Link to="/account/orders">Mis pedidos</Link></Button>
      </div>
      <ProfilePage />
      <section className="mt-8 px-4 lg:px-6">
        <h2 className="text-2xl font-semibold">Direcciones</h2>
        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
        <div className="mt-4 grid gap-3">
          {addresses.length === 0 ? <p className="text-sm text-muted-foreground">No hay direcciones guardadas.</p> : null}
          {addresses.map((address) => (
            <div key={address.id} className="flex items-start justify-between rounded-2xl border bg-white p-4">
              <div>
                <p className="font-medium">{address.recipient}</p>
                <p className="text-sm text-muted-foreground">{address.line1}, {address.city}</p>
              </div>
              <Button variant="ghost" onClick={async () => {
                await deleteAddress(address.id)
                setAddresses((current) => current.filter((item) => item.id !== address.id))
              }}>Eliminar</Button>
            </div>
          ))}
        </div>
        <form
          className="mt-4 grid gap-3 md:grid-cols-2"
          onSubmit={async (event) => {
            event.preventDefault()
            try {
              const created = await saveAddress(form)
              setAddresses((current) => [created, ...current])
              toast.success("Dirección guardada")
            } catch (reason) {
              toast.error(getApiMessage(reason))
            }
          }}
        >
          <Input placeholder="Quién recibe" aria-label="Destinatario" value={form.recipient} onChange={(event) => setForm({ ...form, recipient: event.target.value })} required />
          <Input placeholder="Dirección" aria-label="Dirección" value={form.line1} onChange={(event) => setForm({ ...form, line1: event.target.value })} required />
          <Input placeholder="Ciudad" aria-label="Ciudad" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} required />
          <Input placeholder="Teléfono" aria-label="Teléfono" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          <Button type="submit">Guardar dirección</Button>
        </form>
      </section>
    </div>
  )
}

export function CustomerOrdersPage() {
  const [orders, setOrders] = useState<ShopOrder[]>([])
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    myOrders(page)
      .then((response) => {
        setOrders(response.data)
        setLastPage(response.meta?.last_page || 1)
        setTotal(response.meta?.total ?? response.data.length)
      })
      .catch((reason) => setError(getApiMessage(reason)))
  }, [page])

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-4xl font-semibold tracking-tight">Mis pedidos</h1>
      <p className="mt-2 text-sm text-[#9a8e91]">Abre uno para ver en qué va. La pantalla se actualiza sola.</p>
      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
      {orders.length === 0 && !error ? <p className="mt-6 text-sm text-muted-foreground">Todavía no tienes pedidos.</p> : null}
      <div className="mt-6 space-y-3">
        {orders.map((order) => (
          <Link key={order.number} to={`/account/orders/${order.number}`} className="block rounded-3xl border bg-white p-5">
            <div className="flex justify-between gap-3">
              <span className="font-medium">{order.number}</span>
              <span>{formatMoney(order.total)}</span>
            </div>
            <p className="mt-1 text-sm text-[#e23b78]">{orderStatusLabel(order.status)}</p>
            <p className="text-sm text-[#9a8e91]">{paymentStatusLabel(order.payment_status)}</p>
          </Link>
        ))}
      </div>
      <div className="mt-4">
        <ListPager page={page} lastPage={lastPage} total={total} onPage={setPage} />
      </div>
    </div>
  )
}

export function CustomerOrderPage() {
  const { number = "" } = useParams()
  const [order, setOrder] = useState<ShopOrder | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const next = await getOrder(number)
        if (active) setOrder(next)
      } catch (reason) {
        if (active) setError(getApiMessage(reason))
      }
    }
    void load()
    const timer = window.setInterval(() => { void load() }, 8000)
    return () => { active = false; window.clearInterval(timer) }
  }, [number])

  if (error) return <div className="px-4 py-10 text-sm text-destructive">{error}</div>
  if (!order) return <div className="px-4 py-10 text-sm text-muted-foreground">Cargando pedido…</div>

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <OrderProgress order={order} />
      {["pending", "confirmed"].includes(order.status) ? (
        <Button
          className="mt-6"
          variant="outline"
          onClick={async () => {
            if (!window.confirm("¿Cancelar este pedido? El inventario se devuelve.")) return
            try {
              setOrder(await cancelMyOrder(order.number))
              toast.success("Pedido cancelado")
            } catch (reason) {
              toast.error(getApiMessage(reason))
            }
          }}
        >
          Cancelar pedido
        </Button>
      ) : null}
    </div>
  )
}
