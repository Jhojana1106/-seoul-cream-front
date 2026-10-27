import { useEffect, useState, type FormEvent } from "react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import { checkoutOrder, getOrder, getStoreSettings, listOnlinePayments, quoteOrder } from "@/features/store/api"
import { toCheckoutItems, useCart } from "@/features/store/cart"
import { StateMessage } from "@/features/store/components"
import { useAuth } from "@/features/auth"
import { getApiMessage } from "@/lib/form-errors"
import { formatMoney } from "@/lib/money"
import { OrderProgress } from "@/features/store/order-progress"
import type { PaymentMethod, Quote, ShopOrder, StoreSettings } from "@/types/commerce"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function CartPage() {
  const cart = useCart()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [currency, setCurrency] = useState("COP")
  const [error, setError] = useState<string | null>(null)
  const [payments, setPayments] = useState<PaymentMethod[]>([])

  useEffect(() => {
    getStoreSettings().then((settings) => setCurrency(settings.currency)).catch(() => undefined)
    listOnlinePayments().then(setPayments).catch(() => setPayments([]))
  }, [])

  useEffect(() => {
    if (cart.lines.length === 0 || payments.length === 0) {
      setQuote(null)
      return
    }
    quoteOrder({
      items: toCheckoutItems(cart.lines),
      fulfillment: "pickup",
      payment_method_id: payments[0].id,
      customer_name: "Carrito",
      customer_email: "cart@example.com",
      customer_phone: "3000000000",
    })
      .then((next) => {
        setQuote(next)
        setError(next.ready ? null : "Revisa las líneas: el servidor no puede vender alguna combinación.")
      })
      .catch((reason) => setError(getApiMessage(reason)))
  }, [cart.lines, payments])

  if (cart.lines.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <StateMessage title="El carrito está vacío" body="Cuando elijas un sabor, lo guardamos en este navegador." />
      </div>
    )
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 md:grid-cols-[1.3fr_0.7fr] md:px-6">
      <div className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight">Carrito</h1>
        {cart.lines.map((line) => (
          <div key={line.key} className="flex items-center justify-between gap-4 rounded-3xl border bg-white p-4">
            <div>
              <p className="font-medium">{line.label || `Sabor #${line.productId}`}{line.variantLabel ? ` · ${line.variantLabel}` : ""}</p>
              <p className="text-sm text-muted-foreground">{line.instructions || "Sin instrucciones"}</p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                aria-label="Cantidad"
                className="w-16"
                type="number"
                min={1}
                max={50}
                value={line.quantity}
                onChange={(event) => cart.update(line.key, Number(event.target.value) || 0)}
              />
              <Button variant="ghost" onClick={() => cart.remove(line.key)}>Quitar</Button>
            </div>
          </div>
        ))}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
      <aside className="h-fit rounded-3xl bg-white p-6">
        <p className="eyebrow">Resumen del servidor</p>
        <p className="mt-4 text-3xl font-semibold">{quote ? formatMoney(quote.total, currency) : "Calculando…"}</p>
        <p className="mt-2 text-sm text-muted-foreground">Cotización del servidor para ver el precio. No crea un cliente ni reserva inventario. El pedido guarda los datos que escribas en el siguiente paso.</p>
        <Button asChild className="mt-6 w-full"><Link to="/checkout">Continuar</Link></Button>
      </aside>
    </div>
  )
}

export function CheckoutPage() {
  const cart = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [settings, setSettings] = useState<StoreSettings | null>(null)
  const [payments, setPayments] = useState<PaymentMethod[]>([])
  const [quote, setQuote] = useState<Quote | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [fulfillment, setFulfillment] = useState<"pickup" | "delivery">("pickup")
  const [paymentId, setPaymentId] = useState<number | "">("")
  const [form, setForm] = useState({
    customer_name: user?.name || "",
    customer_email: user?.email || "",
    customer_phone: user?.phone || "",
    line1: "",
    city: "",
    coupon_code: "",
    notes: "",
  })

  useEffect(() => {
    Promise.all([getStoreSettings(), listOnlinePayments()])
      .then(([nextSettings, nextPayments]) => {
        setSettings(nextSettings)
        setPayments(nextPayments)
        setPaymentId(nextPayments[0]?.id ?? "")
        if (!nextSettings.pickup_enabled && nextSettings.delivery_enabled) setFulfillment("delivery")
      })
      .catch((reason) => setError(getApiMessage(reason)))
  }, [])

  useEffect(() => {
    const identityReady = form.customer_name.trim() && form.customer_email.trim() && form.customer_phone.trim()
    const addressReady = fulfillment !== "delivery" || (form.line1.trim() && form.city.trim())
    if (!paymentId || cart.lines.length === 0 || !identityReady || !addressReady) {
      setQuote(null)
      return
    }
    const timer = window.setTimeout(() => {
      quoteOrder({
        items: toCheckoutItems(cart.lines),
        fulfillment,
        payment_method_id: paymentId,
        coupon_code: form.coupon_code || null,
        customer_name: form.customer_name,
        customer_email: form.customer_email,
        customer_phone: form.customer_phone,
        address: { line1: form.line1, city: form.city },
      })
        .then(setQuote)
        .catch((reason) => setError(getApiMessage(reason)))
    }, 300)
    return () => window.clearTimeout(timer)
  }, [cart.lines, fulfillment, paymentId, form])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!paymentId) return
    setSubmitting(true)
    setError(null)
    try {
      const order = await checkoutOrder({
        items: toCheckoutItems(cart.lines),
        fulfillment,
        payment_method_id: paymentId,
        coupon_code: form.coupon_code || null,
        customer_name: form.customer_name,
        customer_email: form.customer_email,
        customer_phone: form.customer_phone,
        address: { line1: form.line1, city: form.city },
        notes: form.notes || null,
      }, crypto.randomUUID())
      sessionStorage.setItem(`order-email:${order.number}`, form.customer_email)
      cart.clear()
      navigate(`/pedido/${order.number}/confirmacion`)
    } catch (reason) {
      const message = getApiMessage(reason)
      setError(message)
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (cart.lines.length === 0) {
    return <div className="mx-auto max-w-3xl px-4 py-16"><StateMessage title="No hay nada para pagar" body="Vuelve al menú para elegir un sabor." /></div>
  }

  const currency = settings?.currency || "COP"

  return (
    <form onSubmit={submit} className="mx-auto grid max-w-5xl gap-8 px-4 py-10 md:grid-cols-[1.2fr_0.8fr] md:px-6">
      <div className="space-y-4">
        <h1 className="text-4xl font-semibold tracking-tight">Checkout</h1>
        <Field label="Nombre" value={form.customer_name} onChange={(value) => setForm({ ...form, customer_name: value })} />
        <Field label="Correo" type="email" value={form.customer_email} onChange={(value) => setForm({ ...form, customer_email: value })} />
        <Field label="Teléfono" value={form.customer_phone} onChange={(value) => setForm({ ...form, customer_phone: value })} />
        <fieldset>
          <legend className="text-sm font-medium">Entrega</legend>
          <div className="mt-2 flex gap-3">
            <label className="rounded-full border bg-white px-4 py-2"><input type="radio" className="mr-2" checked={fulfillment === "pickup"} onChange={() => setFulfillment("pickup")} disabled={!settings?.pickup_enabled} />Recoger</label>
            <label className="rounded-full border bg-white px-4 py-2"><input type="radio" className="mr-2" checked={fulfillment === "delivery"} onChange={() => setFulfillment("delivery")} disabled={!settings?.delivery_enabled} />Domicilio</label>
          </div>
        </fieldset>
        {fulfillment === "delivery" ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Dirección" value={form.line1} onChange={(value) => setForm({ ...form, line1: value })} />
            <Field label="Ciudad" value={form.city} onChange={(value) => setForm({ ...form, city: value })} />
          </div>
        ) : null}
        <Field label="Cupón" value={form.coupon_code} onChange={(value) => setForm({ ...form, coupon_code: value })} />
        <label className="block text-sm font-medium" htmlFor="order-notes">Notas</label>
        <textarea id="order-notes" className="field-textarea bg-white" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
        <fieldset>
          <legend className="text-sm font-medium">Pago</legend>
          <div className="mt-2 grid gap-2">
            {payments.length === 0 ? <p className="text-sm text-muted-foreground">No hay medios de pago activos para la tienda.</p> : null}
            {payments.map((method) => (
              <label key={method.id} className="rounded-2xl border bg-white p-4">
                <input type="radio" className="mr-2" name="pay" checked={paymentId === method.id} onChange={() => setPaymentId(method.id)} />
                <span className="font-medium">{method.name}</span>
                <p className="mt-1 text-sm text-muted-foreground">{method.description}</p>
              </label>
            ))}
          </div>
        </fieldset>
        {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
        <Button type="submit" disabled={submitting || !quote?.ready}>{submitting ? "Confirmando…" : "Confirmar pedido"}</Button>
      </div>
      <aside className="h-fit rounded-3xl bg-accent p-6">
        <p className="eyebrow">Total confirmado por el servidor</p>
        <p className="mt-3 text-4xl font-semibold">{quote ? formatMoney(quote.total, currency) : "—"}</p>
        {quote ? (
          <dl className="mt-4 space-y-1 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(quote.subtotal, currency)}</dd></div>
            <div className="flex justify-between"><dt>Descuento</dt><dd>{formatMoney(quote.discount_total, currency)}</dd></div>
            <div className="flex justify-between"><dt>Envío</dt><dd>{formatMoney(quote.shipping_total, currency)}</dd></div>
          </dl>
        ) : null}
        <p className="mt-4 text-sm text-muted-foreground">Ningún medio simula un cobro con tarjeta. Transferencia y pago al recoger quedan pendientes hasta que el personal los confirme.</p>
      </aside>
    </form>
  )
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  const id = label.toLowerCase()
  return (
    <label className="block text-sm font-medium" htmlFor={id}>
      {label}
      <Input id={id} className="mt-1 bg-white" type={type} required={label !== "Cupón"} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

export function ConfirmationPage() {
  const { number = "" } = useParams()
  const [order, setOrder] = useState<ShopOrder | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const email = sessionStorage.getItem(`order-email:${number}`) || undefined
    let active = true
    async function load() {
      try {
        const next = await getOrder(number, email)
        if (active) setOrder(next)
      } catch (reason) {
        if (active) setError(getApiMessage(reason))
      }
    }
    void load()
    const timer = window.setInterval(() => { void load() }, 8000)
    return () => { active = false; window.clearInterval(timer) }
  }, [number])

  if (error) return <div className="mx-auto max-w-3xl px-4 py-16"><StateMessage title="No pudimos mostrar el pedido" body={error} /></div>
  if (!order) return <div className="mx-auto max-w-3xl px-4 py-16"><StateMessage title="Confirmando" body="Buscando el pedido." /></div>

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <OrderProgress order={order} />
      <p className="mt-4 text-sm text-[#9a8e91]">Puedes dejar esta página abierta. Cuando la tienda lo marque listo, el paso cambia solo. Si dejaste tu celular, te llega el aviso por WhatsApp.</p>
      <Button asChild className="mt-6"><Link to="/account/orders">Ver mis pedidos</Link></Button>
    </div>
  )
}

export function ContactPage() {
  const [settings, setSettings] = useState<StoreSettings | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getStoreSettings().then(setSettings).catch((reason) => setError(getApiMessage(reason)))
  }, [])

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <p className="eyebrow">Contacto</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Preguntas y sede</h1>
      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
      <div className="mt-8 rounded-3xl bg-white p-6">
        <p>{settings?.address || "Dirección sin publicar."}</p>
        <p className="text-muted-foreground">{settings?.city}</p>
        <p className="mt-3">{settings?.phone || "Teléfono sin configurar"}</p>
        <p>{settings?.email || "Correo sin configurar"}</p>
      </div>
      <div className="mt-8">
        <h2 className="text-2xl font-semibold">Preguntas frecuentes</h2>
        {settings && settings.faq.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Todavía no hay preguntas publicadas.</p> : null}
        <div className="mt-4 space-y-3">
          {settings?.faq.map((item) => (
            <details key={item.question} className="rounded-2xl border bg-white p-4">
              <summary className="cursor-pointer font-medium">{item.question}</summary>
              <p className="mt-2 text-sm text-muted-foreground">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
      <div id="politicas" className="mt-10">
        <h2 className="text-2xl font-semibold">Políticas</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{settings?.policies || "Las políticas se publican desde la configuración. No hay un texto legal de relleno."}</p>
      </div>
      <p className="mt-8 text-sm text-muted-foreground">
        La recuperación de contraseña no está disponible: el API no expone ese flujo. Puedes cambiarla desde tu perfil si ya iniciaste sesión.
      </p>
    </div>
  )
}

export function OrderLookup() {
  const [params] = useSearchParams()
  return <ConfirmationPage key={params.get("email") || "lookup"} />
}
