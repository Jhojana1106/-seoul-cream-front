import { useEffect, useState } from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { useAuth } from "@/features/auth"
import { getDashboard } from "@/features/admin/api"
import { getApiMessage } from "@/lib/form-errors"
import { formatMoney } from "@/lib/money"
import type { DashboardData } from "@/types/commerce"
import { PagedStack } from "@/components/list-pager"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Input } from "@/components/ui/input"

const chartConfig = {
  total: { label: "Ventas pagadas", color: "#FF6F9F" },
} satisfies ChartConfig

const caseLabels: Record<string, string> = {
  available: "Disponible",
  low: "Nivel bajo",
  empty: "Vacía",
  temperature: "Temperatura fuera de rango",
  cleaning: "Pendiente de limpieza",
  over_capacity: "Capacidad superada",
  out: "Agotado",
}

export function DashboardPage() {
  const { user } = useAuth()
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getDashboard(from || undefined, to || undefined)
      .then(setData)
      .catch((reason) => setError(getApiMessage(reason)))
      .finally(() => setLoading(false))
  }, [from, to])

  const currency = data?.currency || "COP"

  return (
    <div className="flex flex-col gap-4 px-4 md:gap-6 lg:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Hola, {user?.name}</h2>
          <p className="text-sm text-muted-foreground">Solo pedidos pagados y no cancelados. Si no hay ventas, las tarjetas quedan en cero.</p>
        </div>
        <div className="flex gap-2">
          <Input type="date" aria-label="Desde" value={from} onChange={(event) => setFrom(event.target.value)} />
          <Input type="date" aria-label="Hasta" value={to} onChange={(event) => setTo(event.target.value)} />
        </div>
      </div>
      {loading ? <p className="text-sm text-muted-foreground">Cargando indicadores…</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {data ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric label="Ventas de hoy" value={formatMoney(data.sales_today.total, currency)} hint={data.sales_today.orders === 0 ? "Sin ventas registradas hoy" : `${data.sales_today.orders} pedidos`} />
            <Metric label="Ventas del mes" value={formatMoney(data.sales_month.total, currency)} hint={data.sales_month.orders === 0 ? "Sin ventas este mes" : `${data.sales_month.orders} pedidos`} />
            <Metric label="Pedidos del periodo" value={String(data.period_sales.orders)} hint={data.period.from + " – " + data.period.to} />
            <Metric label="Ticket promedio" value={data.period_sales.average_ticket ? formatMoney(data.period_sales.average_ticket, currency) : "—"} hint={data.period_sales.orders === 0 ? "No hay ventas en el periodo" : "Sobre pedidos pagados"} />
          </div>
          <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
            <Card>
              <CardHeader>
                <CardTitle>Ventas por día</CardTitle>
                <CardDescription>Cada punto es la suma real del día. Un cero es un día sin ventas.</CardDescription>
              </CardHeader>
              <CardContent>
                {data.sales_series.every((point) => Number(point.total) === 0) ? (
                  <p className="text-sm text-muted-foreground">No hay ventas pagadas en este periodo.</p>
                ) : (
                  <ChartContainer config={chartConfig} className="h-64 w-full">
                    <AreaChart data={data.sales_series.map((point) => ({ ...point, total: Number(point.total) }))}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area dataKey="total" stroke="#FF6F9F" fill="#FFB6C1" fillOpacity={0.45} />
                    </AreaChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Sabores más vendidos</CardTitle>
                <CardDescription>{data.pending_orders} pedidos pendientes de cierre.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.top_products.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay ventas por sabor.</p> : null}
                {data.top_products.map((product) => (
                  <div key={`${product.product_id}-${product.name}`} className="flex justify-between text-sm">
                    <span>{product.name}</span>
                    <span>{product.quantity} · {formatMoney(product.revenue, currency)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader><CardTitle>Alertas de inventario</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {data.inventory_alerts.length === 0 ? <p className="text-muted-foreground">No hay ingredientes bajo el mínimo configurado.</p> : null}
                {data.inventory_alerts.map((item) => <p key={item.id}>{item.name}: {item.stock_quantity} / mín. {item.min_stock} {item.unit}</p>)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Agotados</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {data.out_of_stock.length === 0 ? <p className="text-muted-foreground">Ningún sabor activo está en cero.</p> : null}
                {data.out_of_stock.map((item) => <p key={item.id}>{item.name}</p>)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Vitrinas</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {data.display_cases.length === 0 ? <p className="text-muted-foreground">No hay vitrinas creadas.</p> : null}
                {data.display_cases.map((item) => (
                  <p key={item.id}>{item.name}: {caseLabels[item.status] || item.status}</p>
                ))}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle>Actividad reciente</CardTitle></CardHeader>
            <CardContent className="text-sm">
              <PagedStack
                items={data.recent_activity.map((item, index) => ({ ...item, index }))}
                size={5}
                className="grid gap-2"
                getKey={(item) => `${item.at}-${item.index}`}
                empty={<p className="text-muted-foreground">Sin movimientos ni pedidos.</p>}
                render={(item) => <p>{item.description}</p>}
              />
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl font-semibold tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{hint}</CardContent>
    </Card>
  )
}
