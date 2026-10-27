import { useEffect, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"
import {
  acknowledgeAlert,
  closeCash,
  currentCash,
  listAdminProducts,
  listCases,
  listOrders,
  markOrderPaid,
  openCash,
  posPayments,
  posSale,
  recordCleaning,
  recordTemperature,
  recordWaste,
  removeCase,
  saveCase,
  transferStock,
  updateOrderStatus,
  type CaseView,
} from "@/features/admin/api"
import { getApiMessage } from "@/lib/form-errors"
import { resolveMediaUrl } from "@/lib/media"
import { formatMoney, formatPortions, parseMoney } from "@/lib/money"
import { readyNotice, whatsappChatUrl } from "@/lib/whatsapp"
import type { Flavor, PaymentMethod, ShopOrder } from "@/types/commerce"
import { DataTable } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

const statusLabel: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  preparing: "En preparación",
  ready: "Listo",
  dispatched: "Despachado",
  completed: "Completado",
  cancelled: "Cancelado",
}

const paymentLabel: Record<string, string> = {
  unpaid: "pendiente",
  paid: "pagado",
  refunded: "devuelto",
}

const channelLabel: Record<string, string> = {
  online: "Tienda web",
  pos: "Mostrador",
}

const caseStatus: Record<string, string> = {
  available: "Disponible",
  temperature: "Temperatura fuera de rango",
  cleaning: "Por limpiar",
  over_capacity: "Sobre la capacidad",
  empty: "Vacía",
  low: "Poca existencia",
}

const slotStatus: Record<string, string> = {
  available: "disponible",
  low: "bajo",
  out: "agotado",
}

function openReadyWhatsapp(order: ShopOrder) {
  const url = whatsappChatUrl(order.customer_phone || "", readyNotice(order.customer_name, order.number, order.fulfillment))
  if (!url) {
    toast.error("Este pedido no tiene un celular válido para WhatsApp.")
    return
  }
  window.open(url, "_blank", "noopener,noreferrer")
  toast.success("Se abrió WhatsApp con el aviso. Solo falta pulsar Enviar.")
}

export function OrdersAdminPage() {
  const [orders, setOrders] = useState<ShopOrder[]>([])
  const [status, setStatus] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    try {
      const response = await listOrders({ per_page: "100" })
      setOrders(response.data)
      setError(null)
    } catch (reason) { setError(getApiMessage(reason)) }
  }

  useEffect(() => { void refresh() }, [])

  const visible = status ? orders.filter((order) => order.status === status) : orders
  const columns: ColumnDef<ShopOrder>[] = [
    { accessorKey: "number", header: "Pedido", cell: ({ row }) => <span className="font-medium">{row.original.number}</span> },
    { accessorKey: "customer_name", header: "Cliente" },
    {
      id: "items",
      accessorFn: (order) => order.items?.map((item) => item.name).join(" ") || "",
      header: "Detalle",
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.items?.map((item) => `${item.quantity} × ${item.name}`).join(", ") || "—"}</span>,
    },
    { accessorKey: "status", header: "Estado", cell: ({ row }) => statusLabel[row.original.status] || row.original.status },
    { accessorKey: "payment_status", header: "Pago", cell: ({ row }) => paymentLabel[row.original.payment_status] || row.original.payment_status },
    { accessorKey: "channel", header: "Canal", cell: ({ row }) => channelLabel[row.original.channel] || row.original.channel },
    { accessorKey: "total", header: "Total", cell: ({ row }) => formatMoney(row.original.total) },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => {
        const order = row.original
        return (
          <div className="flex flex-wrap gap-2">
            {order.allowed_transitions?.map((next) => (
              <Button key={next} size="sm" variant="outline" onClick={async () => {
                try {
                  await updateOrderStatus(order.id, next)
                  toast.success("Estado actualizado")
                  if (next === "ready") openReadyWhatsapp(order)
                  await refresh()
                }
                catch (reason) { toast.error(getApiMessage(reason)) }
              }}>{statusLabel[next] || next}</Button>
            ))}
            {order.payment_status === "unpaid" && order.status !== "cancelled" ? (
              <Button size="sm" onClick={async () => {
                try { await markOrderPaid(order.id); toast.success("Pago confirmado por el personal"); await refresh() }
                catch (reason) { toast.error(getApiMessage(reason)) }
              }}>Confirmar pago</Button>
            ) : null}
            {order.status === "ready" ? (
              <Button size="sm" variant="outline" onClick={() => openReadyWhatsapp(order)}>Avisar por WhatsApp</Button>
            ) : null}
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-4 px-4 lg:px-6">
      <h2 className="text-2xl font-semibold">Pedidos</h2>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <DataTable
        columns={columns}
        data={visible}
        searchPlaceholder="Buscar pedido o cliente"
        emptyMessage="No hay pedidos para este filtro."
        toolbar={(
          <select aria-label="Estado" className="h-8 rounded-lg border bg-white px-2.5 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">Todos los estados</option>
            {Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        )}
      />
    </div>
  )
}

export function CasesAdminPage() {
  const [cases, setCases] = useState<CaseView[]>([])
  const [products, setProducts] = useState<Flavor[]>([])
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<number | "new" | null>(null)
  const [form, setForm] = useState({ name: "", code: "", capacity_portions: "", min_threshold_portions: "", temp_min: "", temp_max: "" })

  async function refresh() {
    try {
      const [nextCases, productRes] = await Promise.all([listCases(), listAdminProducts()])
      setCases(nextCases)
      setProducts(productRes.data.filter((product) => !product.is_demonstration))
    } catch (reason) { setError(getApiMessage(reason)) }
  }
  useEffect(() => { void refresh() }, [])

  return (
    <div className="space-y-4 px-4 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Vitrinas</h2>
          <p className="text-sm text-muted-foreground">La capacidad libre no es lo mismo que el stock de un sabor. La temperatura que ves fue registrada a mano.</p>
        </div>
        <Button onClick={() => {
          setForm({ name: "", code: "", capacity_portions: "", min_threshold_portions: "", temp_min: "", temp_max: "" })
          setEditing("new")
        }}>Nueva vitrina</Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Dialog open={editing !== null} onOpenChange={(open) => { if (!open) setEditing(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Nueva vitrina" : "Editar vitrina"}</DialogTitle>
            <DialogDescription>La capacidad es el espacio de la vitrina. El stock de cada sabor se mueve aparte.</DialogDescription>
          </DialogHeader>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={async (event) => {
            event.preventDefault()
            try {
              await saveCase({
                name: form.name,
                code: form.code,
                capacity_portions: form.capacity_portions ? Number(form.capacity_portions) : null,
                min_threshold_portions: form.min_threshold_portions ? Number(form.min_threshold_portions) : 0,
                temp_min: form.temp_min === "" ? null : Number(form.temp_min),
                temp_max: form.temp_max === "" ? null : Number(form.temp_max),
              }, editing === "new" ? undefined : editing ?? undefined)
              toast.success(editing === "new" ? "Vitrina creada" : "Vitrina actualizada")
              setEditing(null)
              setForm({ name: "", code: "", capacity_portions: "", min_threshold_portions: "", temp_min: "", temp_max: "" })
              await refresh()
            } catch (reason) { toast.error(getApiMessage(reason)) }
          }}>
            <Input aria-label="Nombre" placeholder="Nombre" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            <Input aria-label="Código" placeholder="Código" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} required />
            <Input aria-label="Capacidad en porciones" placeholder="Capacidad en porciones" value={form.capacity_portions} onChange={(event) => setForm({ ...form, capacity_portions: event.target.value })} />
            <Input aria-label="Umbral mínimo" placeholder="Avisar cuando queden" value={form.min_threshold_portions} onChange={(event) => setForm({ ...form, min_threshold_portions: event.target.value })} />
            <Input aria-label="Temperatura mínima" placeholder="Mínima °C" value={form.temp_min} onChange={(event) => setForm({ ...form, temp_min: event.target.value })} />
            <Input aria-label="Temperatura máxima" placeholder="Máxima °C" value={form.temp_max} onChange={(event) => setForm({ ...form, temp_max: event.target.value })} />
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button type="submit">{editing === "new" ? "Crear" : "Guardar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <div className="grid gap-4 lg:grid-cols-2">
        {cases.map((item) => (
          <article key={item.id} className="rounded-3xl border bg-white p-5">
            <div className="flex justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold">{item.name}</h3>
                <p className="text-sm text-muted-foreground">{item.code} · {caseStatus[item.status] || item.status}</p>
              </div>
              <p className="text-sm">{item.used_portions} usadas{item.capacity_portions ? ` / ${item.capacity_portions}` : ""}</p>
            </div>
            <p className="mt-2 text-sm">
              {item.latest_temperature ? `Temperatura manual: ${item.latest_temperature.celsius} °C` : "Sin lectura de temperatura."}
              {!item.range_configured ? " Rango no configurado, no hay alerta automática." : ""}
            </p>
            <div className="mt-4 grid gap-2">
              {item.items.length === 0 ? <p className="text-sm text-muted-foreground">Sin sabores asignados. Puede haber espacio libre y, aun así, nada que vender de un sabor.</p> : null}
              {item.items.map((slot) => (
                <div key={slot.id} className="flex justify-between rounded-2xl bg-accent px-3 py-2 text-sm">
                  <span>{slot.product_name}</span>
                  <span>{slot.quantity} · {slotStatus[slot.status] || slot.status}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => {
                setEditing(item.id)
                setForm({
                  name: item.name,
                  code: item.code,
                  capacity_portions: item.capacity_portions || "",
                  min_threshold_portions: item.min_threshold_portions || "",
                  temp_min: item.temp_min || "",
                  temp_max: item.temp_max || "",
                })
              }}>Editar</Button>
              <Button size="sm" variant="ghost" onClick={async () => {
                if (!window.confirm(`¿Eliminar ${item.name}? Primero debe quedar sin producto.`)) return
                try {
                  await removeCase(item.id)
                  toast.success("Vitrina eliminada")
                  await refresh()
                } catch (reason) { toast.error(getApiMessage(reason)) }
              }}>Eliminar</Button>
            </div>
            <CaseActions item={item} products={products} onDone={refresh} />
          </article>
        ))}
      </div>
    </div>
  )
}

function CaseActions({ item, products, onDone }: { item: CaseView; products: Flavor[]; onDone: () => Promise<void> }) {
  const [productId, setProductId] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [celsius, setCelsius] = useState("")

  return (
    <div className="mt-4 grid gap-2">
      <div className="flex flex-wrap gap-2">
        <select aria-label="Sabor a reponer" className="h-9 rounded-md border px-2" value={productId} onChange={(event) => setProductId(event.target.value)}>
          <option value="">Sabor</option>
          {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
        </select>
        <Input aria-label="Cantidad" className="w-24" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
        <Button type="button" variant="outline" onClick={async () => {
          try {
            await transferStock({ product_id: Number(productId), quantity: Number(quantity), from: "warehouse", to: "display_case", to_id: item.id, reason: "Reposición de vitrina" })
            toast.success("Reposición registrada")
            await onDone()
          } catch (reason) { toast.error(getApiMessage(reason)) }
        }}>Reponer desde almacén</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Input aria-label="Temperatura manual" className="w-32" placeholder="°C" value={celsius} onChange={(event) => setCelsius(event.target.value)} />
        <Button type="button" variant="outline" onClick={async () => {
          try { await recordTemperature(item.id, Number(celsius)); toast.success("Lectura manual guardada"); await onDone() }
          catch (reason) { toast.error(getApiMessage(reason)) }
        }}>Registrar temperatura</Button>
        <Button type="button" variant="outline" onClick={async () => { await recordCleaning(item.id); await onDone() }}>Limpieza hecha</Button>
        <Button type="button" variant="outline" onClick={async () => {
          try {
            await recordWaste({ item_type: "finished", item_id: Number(productId), quantity: Number(quantity), display_case_id: item.id, reason: "Merma en vitrina" })
            await onDone()
          } catch (reason) { toast.error(getApiMessage(reason)) }
        }}>Merma</Button>
      </div>
      {item.open_alerts.map((alert) => (
        <button key={alert.id} className="text-left text-sm text-destructive" onClick={async () => { await acknowledgeAlert(alert.id); await onDone() }}>
          {alert.message} ({alert.celsius} °C). Marcar como revisada.
        </button>
      ))}
    </div>
  )
}

type PosLine = {
  productId: number
  variantId: number
  name: string
  quantity: number
  price: string
  image?: string
}

export function PosPage() {
  const [catalog, setCatalog] = useState<Flavor[]>([])
  const [payments, setPayments] = useState<PaymentMethod[]>([])
  const [session, setSession] = useState<Awaited<ReturnType<typeof currentCash>>>(null)
  const [lines, setLines] = useState<PosLine[]>([])
  const [tickets, setTickets] = useState<ShopOrder[]>([])
  const [paymentId, setPaymentId] = useState<number | "">("")
  const [opening, setOpening] = useState("0")
  const [closing, setClosing] = useState("0")
  const [customer, setCustomer] = useState({ name: "", email: "", phone: "" })
  const [error, setError] = useState<string | null>(null)
  const [charging, setCharging] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<{ number: string; total: string } | null>(null)
  const products = catalog.filter((product) => product.purchasable && !product.is_demonstration)
  const estimated = lines.reduce((sum, line) => sum + Number(line.price) * line.quantity, 0)

  function addProduct(product: Flavor) {
    const variant = product.variants?.[0]
    if (!variant) return
    setNotice(null)
    setReceipt(null)
    setLines((current) => {
      const existing = current.find((line) => line.variantId === variant.id)
      if (existing) {
        return current.map((line) => line.variantId === variant.id ? { ...line, quantity: line.quantity + 1 } : line)
      }
      return [...current, {
        productId: product.id,
        variantId: variant.id,
        name: product.name,
        quantity: 1,
        price: variant.price,
        image: resolveMediaUrl(product.image_url),
      }]
    })
  }

  async function refresh() {
    try {
      const [productRes, pays, cash] = await Promise.all([listAdminProducts(), posPayments(), currentCash()])
      setCatalog(productRes.data)
      setPayments(pays)
      setPaymentId((current) => current || pays[0]?.id || "")
      setSession(cash)
    } catch (reason) { setError(getApiMessage(reason)) }
  }

  async function refreshTickets() {
    try {
      const response = await listOrders({ per_page: "40" })
      setTickets(response.data.filter((order) => {
        if (order.status === "cancelled") return false
        if (["pending", "confirmed", "preparing", "ready"].includes(order.status)) return true
        return order.payment_status === "unpaid"
      }))
    } catch (reason) { setError(getApiMessage(reason)) }
  }

  useEffect(() => { void refresh() }, [])
  useEffect(() => {
    void refreshTickets()
    const timer = window.setInterval(() => { void refreshTickets() }, 4000)
    return () => window.clearInterval(timer)
  }, [])

  const quantityByProduct = new Map(lines.map((line) => [line.productId, line.quantity]))

  async function charge() {
    if (!session) {
      setNotice("Abre la caja antes de cobrar.")
      return
    }
    if (lines.length === 0) {
      setNotice("Toca un sabor en la carta. El ticket está vacío.")
      return
    }
    if (!customer.name.trim() || !customer.email.trim() || !customer.phone.trim()) {
      setNotice("Escribe nombre, correo y teléfono para el ticket.")
      return
    }
    if (!paymentId) {
      setNotice("Elige cómo paga.")
      return
    }
    setCharging(true)
    setNotice(null)
    try {
      const order = await posSale({
        items: lines.map((line) => ({ product_id: line.productId, variant_id: line.variantId, quantity: line.quantity })),
        fulfillment: "pickup",
        payment_method_id: paymentId,
        customer_name: customer.name.trim(),
        customer_email: customer.email.trim(),
        customer_phone: customer.phone.trim(),
      }, crypto.randomUUID())
      setLines([])
      setCustomer({ name: "", email: "", phone: "" })
      setReceipt({ number: order.number, total: order.total })
      toast.success(`Cobrado ${order.number}`)
      await refresh()
      await refreshTickets()
    } catch (reason) {
      const message = getApiMessage(reason)
      setNotice(message)
      toast.error(message)
    } finally {
      setCharging(false)
    }
  }

  const ticketColumns: ColumnDef<ShopOrder>[] = [
    { accessorKey: "number", header: "Ticket", cell: ({ row }) => <span className="font-medium">{row.original.number}</span> },
    {
      accessorKey: "customer_name",
      header: "Cliente",
      cell: ({ row }) => <span>{row.original.customer_name} · {row.original.channel === "online" ? "Tienda web" : "Mostrador"}</span>,
    },
    {
      id: "items",
      accessorFn: (order) => order.items?.map((item) => item.name).join(" ") || "",
      header: "Sabores",
      cell: ({ row }) => row.original.items?.map((item) => `${item.quantity} × ${item.name}`).join(", ") || "—",
    },
    { accessorKey: "status", header: "Estado", cell: ({ row }) => `${statusLabel[row.original.status] || row.original.status} · ${paymentLabel[row.original.payment_status] || row.original.payment_status}` },
    { accessorKey: "total", header: "Total", cell: ({ row }) => formatMoney(row.original.total) },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => {
        const order = row.original
        return (
          <div className="flex flex-wrap gap-2">
            {order.allowed_transitions?.map((next) => (
              <Button key={next} size="sm" variant="outline" onClick={async () => {
                try {
                  await updateOrderStatus(order.id, next)
                  toast.success("Ticket actualizado")
                  if (next === "ready") openReadyWhatsapp(order)
                  await refreshTickets()
                }
                catch (reason) { toast.error(getApiMessage(reason)) }
              }}>{statusLabel[next] || next}</Button>
            ))}
            {order.payment_status === "unpaid" && order.status !== "cancelled" ? (
              <Button size="sm" onClick={async () => {
                try { await markOrderPaid(order.id); toast.success("Pago confirmado"); await refreshTickets() }
                catch (reason) { toast.error(getApiMessage(reason)) }
              }}>Confirmar pago</Button>
            ) : null}
            {order.status === "ready" ? (
              <Button size="sm" variant="outline" onClick={() => openReadyWhatsapp(order)}>Avisar por WhatsApp</Button>
            ) : null}
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-8 px-4 lg:px-6">
      <section className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">Punto de venta</h2>
              <p className="text-sm text-muted-foreground">Toca un sabor para sumarlo. El precio sale de la carta y el cobro lo confirma el servidor.</p>
            </div>
          </div>
          {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
            {products.map((product) => {
              const photo = resolveMediaUrl(product.image_url)
              const price = product.variants?.[0]?.price
              const chosen = quantityByProduct.get(product.id) ?? 0
              return (
                <button key={product.id} type="button" className={`overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition hover:-translate-y-0.5 ${chosen ? "border-[#ff8eb3]" : "border-[#f3e4e8]"}`} onClick={() => addProduct(product)}>
                  <span className="relative block">
                    {photo ? (
                      <img src={photo} alt="" className="h-32 w-full object-cover sm:h-36" />
                    ) : (
                      <span className="flex h-32 items-end bg-[linear-gradient(160deg,#ffe3ee,#fff6ea)] p-3 text-sm font-semibold text-[#5c4048] sm:h-36">{product.name}</span>
                    )}
                    {chosen ? <span className="absolute top-2 right-2 grid size-7 place-items-center rounded-full bg-[#ff4d8d] text-xs font-semibold text-white">{chosen}</span> : null}
                  </span>
                  <span className="flex items-start justify-between gap-2 p-3">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{product.name}</span>
                      <span className="mt-1 block text-xs text-[#9a8e91]">{formatPortions(product.available_portions)}</span>
                    </span>
                    <span className="shrink-0 text-sm font-bold text-[#e23b78]">{price ? formatMoney(price) : "Sin precio"}</span>
                  </span>
                </button>
              )
            })}
          </div>
          {products.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">No hay sabores con existencia suficiente para vender.</p> : null}
        </div>

        <aside className="sticky top-4 overflow-hidden rounded-2xl border border-[#f3e4e8] bg-white shadow-sm">
          <div className="border-b bg-[#fff7f8] px-4 py-3">
            <p className="font-semibold">Pedido del mostrador</p>
            {session ? (
              <p className="mt-1 text-xs text-[#9a8e91]">Caja abierta · ventas {formatMoney(session.sales_total)} · efectivo esperado {formatMoney(session.expected_cash)}</p>
            ) : (
              <p className="mt-1 text-xs text-[#9a8e91]">La caja está cerrada. Ábrela para poder cobrar.</p>
            )}
            {session ? (
              <div className="mt-3 flex gap-2">
                <Input aria-label="Cierre contado en pesos" placeholder="Contado, ej. 80.000" value={closing} onChange={(event) => setClosing(event.target.value)} />
                <Button variant="outline" onClick={async () => {
                  const amount = parseMoney(closing)
                  if (amount === null) { toast.error("Escribe el efectivo contado en pesos"); return }
                  await closeCash(session.id, amount)
                  await refresh()
                }}>Cerrar</Button>
              </div>
            ) : (
              <div className="mt-3 flex gap-2">
                <Input aria-label="Fondo inicial en pesos" placeholder="Fondo, ej. 50.000" value={opening} onChange={(event) => setOpening(event.target.value)} />
                <Button onClick={async () => {
                  const amount = parseMoney(opening)
                  if (amount === null) { toast.error("Escribe el fondo en pesos, por ejemplo 50.000"); return }
                  try { await openCash(amount); await refresh() }
                  catch (reason) { toast.error(getApiMessage(reason)) }
                }}>Abrir</Button>
              </div>
            )}
          </div>

          <div className="space-y-2 px-4 py-3">
            {lines.length === 0 ? <p className="rounded-xl border border-dashed px-3 py-8 text-center text-sm text-muted-foreground">Todavía no hay sabores. Tócalos en la carta.</p> : null}
            {lines.map((line) => (
              <article key={line.variantId} className="flex items-center gap-3 rounded-xl bg-[#fff7f8] p-2">
                {line.image ? (
                  <img src={line.image} alt="" className="size-12 rounded-lg object-cover" />
                ) : (
                  <span className="flex size-12 items-center justify-center rounded-lg bg-[#ffe3ee] text-sm font-semibold text-[#e23b78]">{line.name.slice(0, 1)}</span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-medium">{line.name}</p>
                    <p className="shrink-0 text-sm font-semibold">{formatMoney(Number(line.price) * line.quantity)}</p>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <button type="button" className="size-7 rounded-full border bg-white" onClick={() => setLines((current) => current.flatMap((item) => {
                      if (item.variantId !== line.variantId) return [item]
                      return item.quantity > 1 ? [{ ...item, quantity: item.quantity - 1 }] : []
                    }))}>−</button>
                    <span className="w-4 text-center text-sm">{line.quantity}</span>
                    <button type="button" className="size-7 rounded-full border bg-white" onClick={() => setLines((current) => current.map((item) => item.variantId === line.variantId ? { ...item, quantity: item.quantity + 1 } : item))}>+</button>
                    <button type="button" className="ml-auto text-xs text-[#9a8e91]" onClick={() => setLines((current) => current.filter((item) => item.variantId !== line.variantId))}>Quitar</button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="space-y-3 border-t px-4 py-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{lines.reduce((sum, line) => sum + line.quantity, 0)} {lines.reduce((sum, line) => sum + line.quantity, 0) === 1 ? "helado" : "helados"}</p>
              <p className="text-lg font-semibold">{formatMoney(estimated)}</p>
            </div>
            <div className="grid gap-2">
              <Input aria-label="Nombre en el ticket" placeholder="Nombre" value={customer.name} onChange={(event) => setCustomer({ ...customer, name: event.target.value })} />
              <Input aria-label="Correo del cliente" placeholder="Correo" value={customer.email} onChange={(event) => setCustomer({ ...customer, email: event.target.value })} />
              <Input aria-label="Teléfono" placeholder="Teléfono" value={customer.phone} onChange={(event) => setCustomer({ ...customer, phone: event.target.value })} />
              <select aria-label="Medio de pago" className="h-8 w-full rounded-lg border px-2.5 text-sm" value={paymentId} onChange={(event) => setPaymentId(Number(event.target.value))}>
                {payments.map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}
              </select>
            </div>
            {receipt ? (
              <div className="rounded-xl bg-[#e9f9ef] px-3 py-3 text-sm">
                <p className="font-semibold text-[#146c43]">Cobrado {receipt.number}</p>
                <p className="mt-1 text-[#146c43]">Total {formatMoney(receipt.total)}. El ticket quedó limpio para la siguiente venta.</p>
              </div>
            ) : null}
            {notice ? <p className="rounded-xl bg-[#fff1f2] px-3 py-2 text-sm text-destructive">{notice}</p> : null}
            <Button className="w-full" disabled={charging} onClick={() => { void charge() }}>
              {charging ? "Cobrando…" : "Cobrar"}
            </Button>
          </div>
        </aside>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Tickets abiertos</h2>
            <p className="text-sm text-muted-foreground">Pedidos de la web y del mostrador que todavía hay que entregar. Se actualiza solo.</p>
          </div>
          <p className="text-sm text-muted-foreground">{tickets.length} en el tablero</p>
        </div>
        <div className="mt-3">
          <DataTable columns={ticketColumns} data={tickets} searchPlaceholder="Buscar ticket" emptyMessage="No hay pedidos abiertos." />
        </div>
      </section>
    </div>
  )
}
