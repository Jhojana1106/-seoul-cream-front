import { resolveMediaUrl } from "@/lib/media"
import { formatMoney } from "@/lib/money"
import type { ShopOrder } from "@/types/commerce"

const statusLabel: Record<string, string> = {
  pending: "Recibido",
  confirmed: "Confirmado",
  preparing: "En preparación",
  ready: "Listo",
  dispatched: "En camino",
  completed: "Entregado",
  cancelled: "Cancelado",
}

const paymentLabel: Record<string, string> = {
  unpaid: "Pago pendiente",
  paid: "Pagado",
  refunded: "Devuelto",
}

export function orderStatusLabel(status: string) {
  return statusLabel[status] || status
}

export function paymentStatusLabel(status: string) {
  return paymentLabel[status] || status
}

function stepsFor(order: ShopOrder) {
  const base = ["pending", "confirmed", "preparing", "ready"]
  if (order.fulfillment === "delivery") base.push("dispatched")
  base.push("completed")
  return base
}

function guidance(order: ShopOrder) {
  if (order.status === "cancelled") return "Este pedido se canceló. Si ya habías pagado, el personal debe confirmar la devolución."
  if (order.status === "completed") return order.fulfillment === "delivery" ? "El pedido ya se entregó." : "Ya recogiste este pedido."
  if (order.status === "dispatched") return "Va en camino a tu dirección."
  if (order.status === "ready") return order.fulfillment === "delivery" ? "Ya está listo y sale para tu dirección." : "Ya está listo. Puedes pasar a recogerlo."
  if (order.status === "preparing") return "Lo están preparando. Esta pantalla se actualiza sola."
  if (order.status === "confirmed") return "La tienda ya lo vio. En un momento empiezan a prepararlo."
  return "Recibimos tu pedido. La tienda lo va a confirmar."
}

export function OrderProgress({ order }: { order: ShopOrder }) {
  const steps = stepsFor(order)
  const current = steps.indexOf(order.status)
  const cancelled = order.status === "cancelled"

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-[#e23b78]">{order.number}</p>
        <h1 className="mt-1 text-4xl font-semibold tracking-tight">{cancelled ? "Pedido cancelado" : orderStatusLabel(order.status)}</h1>
        <p className="mt-3 max-w-xl text-lg text-[#5c4048]">{guidance(order)}</p>
        <p className="mt-2 text-sm text-[#9a8e91]">{paymentStatusLabel(order.payment_status)}{order.payment_method?.name ? ` · ${order.payment_method.name}` : ""}</p>
      </div>

      {cancelled ? null : (
        <ol className="grid gap-2 sm:grid-cols-5">
          {steps.map((step, index) => {
            const done = current >= index
            const active = current === index
            return (
              <li key={step} className={`rounded-2xl border px-3 py-3 ${active ? "border-[#ff6f9f] bg-[#fff0f6]" : done ? "border-[#f3e4e8] bg-white" : "border-dashed border-[#eadfe3] bg-white/60"}`}>
                <p className="text-xs text-[#9a8e91]">{index + 1}</p>
                <p className={`text-sm font-semibold ${done ? "text-[#241c1e]" : "text-[#b09aa2]"}`}>{orderStatusLabel(step)}</p>
              </li>
            )
          })}
        </ol>
      )}

      <section className="rounded-[1.6rem] border border-[#f3e4e8] bg-white p-5">
        <h2 className="font-semibold">Tu pedido</h2>
        <ul className="mt-4 space-y-3">
          {order.items?.map((item) => {
            const photo = resolveMediaUrl(item.image_url)
            return (
              <li key={item.id} className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  {photo ? <img src={photo} alt="" className="size-16 shrink-0 rounded-2xl object-cover" /> : null}
                  <div className="min-w-0">
                    <p className="font-medium">{item.quantity} × {item.name}</p>
                    <p className="text-sm text-[#9a8e91]">{item.variant_name}{item.special_instructions ? ` · ${item.special_instructions}` : ""}</p>
                  </div>
                </div>
                <p className="shrink-0 font-semibold">{formatMoney(item.line_total)}</p>
              </li>
            )
          })}
        </ul>
        <p className="mt-5 text-right text-2xl font-semibold">{formatMoney(order.total)}</p>
      </section>
    </div>
  )
}
