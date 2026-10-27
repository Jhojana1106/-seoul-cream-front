import { useEffect, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"
import {
  createPurchase,
  getInventoryReport,
  getSalesReport,
  getSettings,
  listAdminPayments,
  listCoupons,
  listCustomers,
  listIngredients,
  listMovements,
  listPurchases,
  listRecipes,
  listSuppliers,
  listUnits,
  moveStock,
  orderPurchase,
  produce,
  receivePurchase,
  removeIngredient,
  removeRecipe,
  removeSupplier,
  saveCoupon,
  saveIngredient,
  saveRecipe,
  saveSupplier,
  updatePayment,
  updateSettings,
  type Coupon,
} from "@/features/admin/api"
import { listAdminProducts } from "@/features/admin/api"
import { fieldControlClass, FormField } from "@/components/form-field"
import { DataTable } from "@/components/data-table"
import { MoneyField } from "@/components/money-field"
import { getApiMessage } from "@/lib/form-errors"
import { formatMoney, formatPortions, parseMoney } from "@/lib/money"
import { api } from "@/lib/api"
import type { PaymentMethod } from "@/types/commerce"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

const purchaseStatus: Record<string, string> = {
  draft: "Borrador",
  ordered: "Pedida",
  partial: "Recibida en parte",
  received: "Recibida",
}

const channelLabel: Record<string, string> = {
  online: "Tienda web",
  pos: "Mostrador",
}

const movementLabel: Record<string, string> = {
  receipt: "Entrada",
  adjustment: "Salida manual",
  sale: "Venta",
  sale_reversal: "Devolución",
  waste: "Merma",
  transfer_in: "Llegó de otro lugar",
  transfer_out: "Salió hacia otro lugar",
  production_output: "Producción",
  production_consume: "Se usó en producción",
}

const locationLabel: Record<string, string> = {
  warehouse: "Almacén",
  display_case: "Vitrina",
}

function portions(value?: string | null) {
  const amount = Number(value)
  return formatPortions(value, amount === 1 ? "porción" : "porciones")
}

function parseQuantity(value: string) {
  const raw = value.trim().replace(/\s/g, "")
  if (!raw) return null
  const amount = Number(raw.replace(",", "."))
  return Number.isFinite(amount) && amount > 0 ? amount : null
}

export function InventoryAdminPage() {
  const [ingredients, setIngredients] = useState<Awaited<ReturnType<typeof listIngredients>>>([])
  const [products, setProducts] = useState<{ id: number; name: string; warehouse_portions?: string; case_portions?: string; is_active: boolean }[]>([])
  const [movements, setMovements] = useState<Awaited<ReturnType<typeof listMovements>>["data"]>([])
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ item_type: "finished", item_id: "", direction: "in", quantity: "", reason: "" })

  async function refresh() {
    try {
      const [nextIngredients, productRes, nextMovements] = await Promise.all([listIngredients(), listAdminProducts(), listMovements()])
      setIngredients(nextIngredients)
      setProducts(productRes.data.filter((product) => {
        if (product.is_demonstration) return false
        const hasStock = Number(product.warehouse_portions) > 0 || Number(product.case_portions) > 0
        return product.is_active || hasStock
      }).map((product) => ({
        id: product.id,
        name: product.name,
        warehouse_portions: product.warehouse_portions,
        case_portions: product.case_portions,
        is_active: product.is_active,
      })))
      setMovements(nextMovements.data)
    } catch (reason) { setError(getApiMessage(reason)) }
  }
  useEffect(() => { void refresh() }, [])

  const choices = form.item_type === "finished" ? products : ingredients
  const selectedProduct = products.find((item) => item.id === Number(form.item_id))
  const selectedIngredient = ingredients.find((item) => item.id === Number(form.item_id))
  const names = new Map<string, string>([
    ...products.map((item) => [`finished:${item.id}`, item.name] as const),
    ...ingredients.map((item) => [`ingredient:${item.id}`, item.name] as const),
  ])
  const productColumns: ColumnDef<(typeof products)[number]>[] = [
    { accessorKey: "name", header: "Sabor", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { id: "warehouse", accessorFn: (product) => product.warehouse_portions || "", header: "Almacén", cell: ({ row }) => portions(row.original.warehouse_portions) },
    { id: "case", accessorFn: (product) => product.case_portions || "", header: "Vitrina", cell: ({ row }) => portions(row.original.case_portions) },
  ]
  const ingredientColumns: ColumnDef<(typeof ingredients)[number]>[] = [
    { accessorKey: "name", header: "Ingrediente", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    {
      id: "minimum",
      accessorFn: (item) => item.min_stock,
      header: "Mínimo",
      cell: ({ row }) => formatPortions(row.original.min_stock, row.original.unit?.name || row.original.unit?.code || ""),
    },
    {
      id: "stock",
      accessorFn: (item) => item.stock_quantity,
      header: "Existencia",
      cell: ({ row }) => {
        const low = Number(row.original.min_stock) > 0 && Number(row.original.stock_quantity) <= Number(row.original.min_stock)
        const unit = row.original.unit?.name || row.original.unit?.code || ""
        return <span className={low ? "font-semibold text-destructive" : "font-semibold"}>{formatPortions(row.original.stock_quantity, unit)}{low ? " · bajo" : ""}</span>
      },
    },
  ]
  const movementColumns: ColumnDef<(typeof movements)[number]>[] = [
    { accessorKey: "movement_type", header: "Movimiento", cell: ({ row }) => movementLabel[row.original.movement_type] || row.original.movement_type },
    {
      id: "item",
      accessorFn: (movement) => names.get(`${movement.item_type}:${movement.item_id}`) || "",
      header: "Qué",
      cell: ({ row }) => names.get(`${row.original.item_type}:${row.original.item_id}`) || (row.original.item_type === "finished" ? "Helado" : "Ingrediente"),
    },
    {
      id: "quantity",
      accessorFn: (movement) => movement.quantity,
      header: "Cantidad",
      cell: ({ row }) => row.original.item_type === "finished"
        ? portions(row.original.quantity)
        : formatPortions(row.original.quantity, ingredients.find((item) => item.id === row.original.item_id)?.unit?.name || "unidades"),
    },
    { accessorKey: "location", header: "Lugar", cell: ({ row }) => locationLabel[row.original.location] || row.original.location },
    { accessorKey: "reason", header: "Motivo", cell: ({ row }) => row.original.reason || "—" },
    { accessorKey: "created_at", header: "Cuándo", cell: ({ row }) => row.original.created_at ? new Date(row.original.created_at).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" }) : "" },
  ]

  return (
    <div className="space-y-6 px-4 lg:px-6">
      <div>
        <h2 className="text-2xl font-semibold">Inventario</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Aquí se ve cuánto hay. El número no se cambia escribiendo encima: una venta, una compra, una producción o el formulario de abajo dejan un movimiento con motivo.</p>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border bg-white p-4">
          <h3 className="font-semibold">Helados</h3>
          <p className="mt-1 text-sm text-muted-foreground">El almacén es la reserva. La vitrina es lo que está a la vista. Se puede vender la suma de los dos.</p>
          <div className="mt-3">
            <DataTable columns={productColumns} data={products} searchPlaceholder="Buscar sabor" emptyMessage="No hay sabores publicados." />
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-4">
          <h3 className="font-semibold">Ingredientes</h3>
          <p className="mt-1 text-sm text-muted-foreground">Se usan para producir. Si la existencia está en el mínimo o por debajo, queda marcada.</p>
          <div className="mt-3">
            <DataTable columns={ingredientColumns} data={ingredients} searchPlaceholder="Buscar ingrediente" emptyMessage="No hay ingredientes. Se crean en la pantalla de ingredientes." />
          </div>
        </section>
      </div>

      <form className="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-2" onSubmit={async (event) => {
        event.preventDefault()
        const quantity = parseQuantity(form.quantity)
        if (!form.item_id || quantity === null) {
          toast.error("Elige qué mueves y escribe una cantidad mayor que cero. Puedes usar 2 o 1,5.")
          return
        }
        try {
          await moveStock({ ...form, item_id: Number(form.item_id), quantity })
          toast.success("Movimiento registrado")
          setForm({ ...form, quantity: "", reason: "" })
          await refresh()
        } catch (reason) { toast.error(getApiMessage(reason)) }
      }}>
        <div className="md:col-span-2">
          <h3 className="font-semibold">Registrar entrada o salida</h3>
          <p className="mt-1 text-sm text-muted-foreground">Para un conteo, una donación o una corrección. Las ventas y la producción ya descuentan solas.</p>
        </div>
        <label className="text-sm">Qué mueves
          <select aria-label="Qué mueves" className="mt-1 h-9 w-full rounded-md border px-2" value={form.item_type} onChange={(event) => setForm({ ...form, item_type: event.target.value, item_id: "" })}>
            <option value="finished">Helado terminado</option>
            <option value="ingredient">Ingrediente</option>
          </select>
        </label>
        <label className="text-sm">Cuál
          <select aria-label="Cuál" className="mt-1 h-9 w-full rounded-md border px-2" value={form.item_id} onChange={(event) => setForm({ ...form, item_id: event.target.value })} required>
            <option value="">Elegir</option>
            {choices.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label className="text-sm">Qué pasó
          <select aria-label="Qué pasó" className="mt-1 h-9 w-full rounded-md border px-2" value={form.direction} onChange={(event) => setForm({ ...form, direction: event.target.value })}>
            <option value="in">Entró al almacén</option>
            <option value="out">Salió del almacén</option>
          </select>
        </label>
        <label className="text-sm">Cantidad
          <Input className="mt-1" aria-label="Cantidad" placeholder={form.item_type === "finished" ? "Porciones, por ejemplo 2" : "Según la unidad del ingrediente"} value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} required />
        </label>
        <label className="text-sm md:col-span-2">Por qué
          <Input className="mt-1" aria-label="Motivo" placeholder="Por ejemplo: conteo de cierre o llegó un encargo" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} required />
        </label>
        <p className="text-sm text-muted-foreground md:col-span-2">
          {form.item_type === "finished" && selectedProduct
            ? `${selectedProduct.name} tiene ${portions(selectedProduct.warehouse_portions)} en almacén y ${portions(selectedProduct.case_portions)} en vitrina.`
            : null}
          {form.item_type === "ingredient" && selectedIngredient
            ? `${selectedIngredient.name} tiene ${formatPortions(selectedIngredient.stock_quantity, selectedIngredient.unit?.name || selectedIngredient.unit?.code || "")}.`
            : null}
        </p>
        <div>
          <Button type="submit">Registrar movimiento</Button>
        </div>
      </form>

      <section className="rounded-2xl border bg-white p-4">
        <h3 className="font-semibold">Últimos movimientos</h3>
        <p className="mt-1 text-sm text-muted-foreground">Lo más reciente primero. Incluye ventas, producción y lo que registres aquí.</p>
        <div className="mt-3">
          <DataTable columns={movementColumns} data={movements} searchPlaceholder="Buscar movimiento" emptyMessage="Todavía no hay movimientos." />
        </div>
      </section>
    </div>
  )
}

export function IngredientsAdminPage() {
  const [ingredients, setIngredients] = useState<Awaited<ReturnType<typeof listIngredients>>>([])
  const [units, setUnits] = useState<{ id: number; name: string }[]>([])
  const [editing, setEditing] = useState<number | "new" | null>(null)
  const [form, setForm] = useState({ name: "", unit_id: "", min_stock: "0", cost_per_unit: "" })

  async function refresh() {
    const [nextIngredients, nextUnits] = await Promise.all([listIngredients(), listUnits()])
    setIngredients(nextIngredients)
    setUnits(nextUnits)
    if (!form.unit_id && nextUnits[0]) setForm((current) => ({ ...current, unit_id: String(nextUnits[0].id) }))
  }
  useEffect(() => { void refresh() }, [])

  const columns: ColumnDef<(typeof ingredients)[number]>[] = [
    {
      accessorKey: "name",
      header: "Ingrediente",
      cell: ({ row }) => <span className="font-medium">{row.original.name}{row.original.is_active ? "" : " · inactivo"}</span>,
    },
    {
      id: "stock",
      accessorFn: (item) => item.stock_quantity,
      header: "Existencia",
      cell: ({ row }) => formatPortions(row.original.stock_quantity, row.original.unit?.name || row.original.unit?.code || ""),
    },
    {
      id: "minimum",
      accessorFn: (item) => item.min_stock,
      header: "Mínimo",
      cell: ({ row }) => formatPortions(row.original.min_stock, row.original.unit?.code || ""),
    },
    {
      id: "cost",
      accessorFn: (item) => item.cost_per_unit,
      header: "Costo",
      cell: ({ row }) => `${formatMoney(row.original.cost_per_unit)} por ${row.original.unit?.name || "unidad"}`,
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => {
        const item = row.original
        return (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => {
              setEditing(item.id)
              setForm({
                name: item.name,
                unit_id: String(item.unit_id || item.unit?.id || ""),
                min_stock: item.min_stock,
                cost_per_unit: item.cost_per_unit || "",
              })
            }}>Editar</Button>
            <Button size="sm" variant="ghost" onClick={async () => {
              if (!window.confirm(`¿Eliminar ${item.name}?`)) return
              try {
                await removeIngredient(item.id)
                toast.success("Ingrediente eliminado")
                await refresh()
              } catch (reason) { toast.error(getApiMessage(reason)) }
            }}>Eliminar</Button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-4 px-4 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Ingredientes</h2>
          <p className="text-sm text-muted-foreground">El costo es por unidad de medida, en pesos. La existencia no se edita aquí: entra por compras o por un movimiento de inventario. Si tiene stock o está en una receta, no se puede borrar.</p>
        </div>
        <Button onClick={() => {
          setForm({ name: "", unit_id: form.unit_id || (units[0] ? String(units[0].id) : ""), min_stock: "0", cost_per_unit: "" })
          setEditing("new")
        }}>Nuevo ingrediente</Button>
      </div>
      <Dialog open={editing !== null} onOpenChange={(open) => { if (!open) setEditing(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Nuevo ingrediente" : "Editar ingrediente"}</DialogTitle>
            <DialogDescription>La existencia no se cambia aquí. Entra por una compra o por un movimiento.</DialogDescription>
          </DialogHeader>
          <form className="grid gap-3" onSubmit={async (event) => {
            event.preventDefault()
            const cost = form.cost_per_unit.trim() === "" ? 0 : parseMoney(form.cost_per_unit)
            if (cost === null) {
              toast.error("Escribe el costo en pesos, por ejemplo 4.500")
              return
            }
            try {
              await saveIngredient({
                name: form.name,
                unit_id: Number(form.unit_id),
                min_stock: Number(form.min_stock),
                cost_per_unit: cost,
              }, editing === "new" ? undefined : editing ?? undefined)
              toast.success(editing === "new" ? "Ingrediente creado" : "Ingrediente actualizado")
              setForm({ name: "", unit_id: form.unit_id, min_stock: "0", cost_per_unit: "" })
              setEditing(null)
              await refresh()
            } catch (reason) { toast.error(getApiMessage(reason)) }
          }}>
            <Input aria-label="Nombre" placeholder="Nombre" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            <label className="text-sm">Unidad
              <select aria-label="Unidad" className="mt-1 h-9 w-full rounded-md border px-2" value={form.unit_id} onChange={(event) => setForm({ ...form, unit_id: event.target.value })}>
                {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
              </select>
            </label>
            <label className="text-sm">Existencia mínima
              <Input className="mt-1" aria-label="Stock mínimo" value={form.min_stock} onChange={(event) => setForm({ ...form, min_stock: event.target.value })} />
            </label>
            <MoneyField label="Costo por unidad" value={form.cost_per_unit} onChange={(cost_per_unit) => setForm({ ...form, cost_per_unit })} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button type="submit">{editing === "new" ? "Crear" : "Guardar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <DataTable columns={columns} data={ingredients} searchPlaceholder="Buscar ingrediente" emptyMessage="No hay ingredientes." />
    </div>
  )
}

export function RecipesAdminPage() {
  const [recipes, setRecipes] = useState<Awaited<ReturnType<typeof listRecipes>>>([])
  const [products, setProducts] = useState<{ id: number; name: string }[]>([])
  const [ingredients, setIngredients] = useState<{ id: number; name: string }[]>([])
  const [editing, setEditing] = useState<number | "new" | null>(null)
  const [form, setForm] = useState({ product_id: "", name: "", yield_quantity: "1", ingredient_id: "", quantity: "1", unit: "g", shelf_life_hours: "" })

  async function refresh() {
    const [nextRecipes, productRes, nextIngredients] = await Promise.all([listRecipes(), listAdminProducts(), listIngredients()])
    setRecipes(nextRecipes)
    setProducts(productRes.data.map((product) => ({ id: product.id, name: product.name })))
    setIngredients(nextIngredients)
  }
  useEffect(() => { void refresh() }, [])

  const columns: ColumnDef<(typeof recipes)[number]>[] = [
    { accessorKey: "name", header: "Receta", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { id: "product", accessorFn: (recipe) => recipe.product?.name || "", header: "Sabor", cell: ({ row }) => row.original.product?.name || "—" },
    { accessorKey: "yield_quantity", header: "Rinde", cell: ({ row }) => `${row.original.yield_quantity} porciones` },
    { id: "shelf", accessorFn: (recipe) => recipe.shelf_life_hours || "", header: "Vida útil", cell: ({ row }) => row.original.shelf_life_hours ? `${row.original.shelf_life_hours} horas` : "No configurada" },
    {
      id: "items",
      accessorFn: (recipe) => recipe.items.map((item) => item.ingredient?.name || "").join(" "),
      header: "Ingredientes",
      cell: ({ row }) => row.original.items.map((item) => `${item.ingredient?.name || "Ingrediente"}: ${item.quantity} ${item.unit}`).join(" · ") || "—",
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => {
        const recipe = row.original
        return (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => {
              const first = recipe.items[0]
              setEditing(recipe.id)
              setForm({
                product_id: String(recipe.product_id),
                name: recipe.name,
                yield_quantity: recipe.yield_quantity,
                ingredient_id: first ? String(first.ingredient_id) : "",
                quantity: first?.quantity || "1",
                unit: first?.unit || "g",
                shelf_life_hours: recipe.shelf_life_hours ? String(recipe.shelf_life_hours) : "",
              })
            }}>Editar</Button>
            <Button size="sm" variant="ghost" onClick={async () => {
              if (!window.confirm(`¿Eliminar ${recipe.name}? Si ya se produjo, solo quedará inactiva.`)) return
              try {
                const message = await removeRecipe(recipe.id)
                toast.success(message || "Receta eliminada")
                await refresh()
              } catch (reason) { toast.error(getApiMessage(reason)) }
            }}>Eliminar</Button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-4 px-4 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Recetas</h2>
          <p className="text-sm text-muted-foreground">La fecha de vencimiento solo se calcula si escribes horas de vida útil. Si lo dejas vacío, la producción no inventa una fecha.</p>
        </div>
        <Button onClick={() => {
          setForm({ product_id: "", name: "", yield_quantity: "1", ingredient_id: "", quantity: "1", unit: "g", shelf_life_hours: "" })
          setEditing("new")
        }}>Nueva receta</Button>
      </div>
      <Dialog open={editing !== null} onOpenChange={(open) => { if (!open) setEditing(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Nueva receta" : "Editar receta"}</DialogTitle>
            <DialogDescription>Une un sabor con el ingrediente que consume cada tanda.</DialogDescription>
          </DialogHeader>
          <form className="grid gap-3" onSubmit={async (event) => {
            event.preventDefault()
            try {
              await saveRecipe({
                product_id: Number(form.product_id),
                name: form.name,
                yield_quantity: Number(form.yield_quantity),
                yield_unit: "porcion",
                shelf_life_hours: form.shelf_life_hours ? Number(form.shelf_life_hours) : null,
                items: [{ ingredient_id: Number(form.ingredient_id), quantity: Number(form.quantity), unit: form.unit }],
              }, editing === "new" ? undefined : editing ?? undefined)
              toast.success(editing === "new" ? "Receta guardada" : "Receta actualizada")
              setEditing(null)
              setForm({ product_id: "", name: "", yield_quantity: "1", ingredient_id: "", quantity: "1", unit: "g", shelf_life_hours: "" })
              await refresh()
            } catch (reason) { toast.error(getApiMessage(reason)) }
          }}>
            <select aria-label="Sabor" className="h-9 rounded-md border px-2" value={form.product_id} onChange={(event) => setForm({ ...form, product_id: event.target.value })} required>
              <option value="">Sabor</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select>
            <Input aria-label="Nombre de receta" placeholder="Nombre" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            <Input aria-label="Rendimiento" placeholder="Rendimiento en porciones" value={form.yield_quantity} onChange={(event) => setForm({ ...form, yield_quantity: event.target.value })} />
            <select aria-label="Ingrediente" className="h-9 rounded-md border px-2" value={form.ingredient_id} onChange={(event) => setForm({ ...form, ingredient_id: event.target.value })} required>
              <option value="">Ingrediente</option>
              {ingredients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <Input aria-label="Cantidad de ingrediente" placeholder="Cantidad" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} />
            <Input aria-label="Unidad" placeholder="Unidad, por ejemplo g" value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} />
            <Input aria-label="Vida útil en horas" placeholder="Vida útil en horas, opcional" value={form.shelf_life_hours} onChange={(event) => setForm({ ...form, shelf_life_hours: event.target.value })} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button type="submit">{editing === "new" ? "Guardar receta" : "Guardar cambios"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <DataTable columns={columns} data={recipes} searchPlaceholder="Buscar receta" emptyMessage="No hay recetas." />
    </div>
  )
}

export function ProductionAdminPage() {
  const [recipes, setRecipes] = useState<Awaited<ReturnType<typeof listRecipes>>>([])
  const [recipeId, setRecipeId] = useState("")
  const [batches, setBatches] = useState("1")
  const [expiresOn, setExpiresOn] = useState("")

  useEffect(() => { listRecipes().then(setRecipes).catch((reason) => toast.error(getApiMessage(reason))) }, [])

  return (
    <div className="space-y-4 px-4 lg:px-6">
      <h2 className="text-2xl font-semibold">Producción</h2>
      <p className="text-sm text-muted-foreground">Descuenta ingredientes según la receta y entra el producto terminado al almacén.</p>
      <form className="grid gap-2 md:grid-cols-4" onSubmit={async (event) => {
        event.preventDefault()
        try {
          const result = await produce(Number(recipeId), { batches: Number(batches), expires_on: expiresOn || null })
          toast.success(result.costs_complete ? `Costo estimado ${formatMoney(result.estimated_cost)}` : "Producción registrada. Faltan costos de ingredientes para estimar el margen.")
        } catch (reason) { toast.error(getApiMessage(reason)) }
      }}>
        <select aria-label="Receta" className="h-9 rounded-md border px-2" value={recipeId} onChange={(event) => setRecipeId(event.target.value)} required>
          <option value="">Receta</option>
          {recipes.map((recipe) => <option key={recipe.id} value={recipe.id}>{recipe.name}</option>)}
        </select>
        <Input aria-label="Tandas" value={batches} onChange={(event) => setBatches(event.target.value)} />
        <Input aria-label="Vencimiento manual" type="datetime-local" value={expiresOn} onChange={(event) => setExpiresOn(event.target.value)} />
        <Button type="submit">Producir</Button>
      </form>
    </div>
  )
}

export function SuppliersAdminPage() {
  const [suppliers, setSuppliers] = useState<Awaited<ReturnType<typeof listSuppliers>>>([])
  const [editing, setEditing] = useState<number | "new" | null>(null)
  const [form, setForm] = useState({ name: "", contact_name: "", phone: "", email: "" })
  useEffect(() => { listSuppliers().then(setSuppliers).catch(() => undefined) }, [])

  function reset() {
    setEditing(null)
    setForm({ name: "", contact_name: "", phone: "", email: "" })
  }

  const columns: ColumnDef<(typeof suppliers)[number]>[] = [
    { accessorKey: "name", header: "Proveedor", cell: ({ row }) => <span className="font-medium">{row.original.name}{row.original.is_active ? "" : " · inactivo"}</span> },
    { accessorKey: "contact_name", header: "Contacto", cell: ({ row }) => row.original.contact_name || "—" },
    { accessorKey: "phone", header: "Teléfono", cell: ({ row }) => row.original.phone || "—" },
    { accessorKey: "email", header: "Correo", cell: ({ row }) => row.original.email || "—" },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => {
        const supplier = row.original
        return (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => {
              setEditing(supplier.id)
              setForm({
                name: supplier.name,
                contact_name: supplier.contact_name || "",
                phone: supplier.phone || "",
                email: supplier.email || "",
              })
            }}>Editar</Button>
            <Button size="sm" variant="ghost" onClick={async () => {
              if (!window.confirm(`¿Eliminar ${supplier.name}?`)) return
              try {
                await removeSupplier(supplier.id)
                toast.success("Proveedor eliminado")
                setSuppliers(await listSuppliers())
              } catch (reason) { toast.error(getApiMessage(reason)) }
            }}>Eliminar</Button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-4 px-4 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Proveedores</h2>
          <p className="text-sm text-muted-foreground">Si el proveedor ya tiene compras, no se puede eliminar. En ese caso edítalo y deja el nombre claro.</p>
        </div>
        <Button onClick={() => { reset(); setEditing("new") }}>Nuevo proveedor</Button>
      </div>
      <Dialog open={editing !== null} onOpenChange={(open) => { if (!open) reset() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Nuevo proveedor" : "Editar proveedor"}</DialogTitle>
            <DialogDescription>El contacto se usa al registrar una compra.</DialogDescription>
          </DialogHeader>
          <form className="grid gap-3" onSubmit={async (event) => {
            event.preventDefault()
            try {
              await saveSupplier({
                name: form.name,
                contact_name: form.contact_name || null,
                phone: form.phone || null,
                email: form.email || null,
              }, editing === "new" ? undefined : editing ?? undefined)
              toast.success(editing === "new" ? "Proveedor creado" : "Proveedor actualizado")
              reset()
              setSuppliers(await listSuppliers())
            } catch (reason) { toast.error(getApiMessage(reason)) }
          }}>
            <Input aria-label="Nombre del proveedor" placeholder="Nombre de la empresa" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            <Input aria-label="Persona de contacto" placeholder="Persona de contacto" value={form.contact_name} onChange={(event) => setForm({ ...form, contact_name: event.target.value })} />
            <Input aria-label="Teléfono" placeholder="Teléfono" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            <Input aria-label="Correo" type="email" placeholder="Correo" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={reset}>Cancelar</Button>
              <Button type="submit">{editing === "new" ? "Crear" : "Guardar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <DataTable columns={columns} data={suppliers} searchPlaceholder="Buscar proveedor" emptyMessage="No hay proveedores." />
    </div>
  )
}

export function PurchasesAdminPage() {
  const [orders, setOrders] = useState<Awaited<ReturnType<typeof listPurchases>>>([])
  const [suppliers, setSuppliers] = useState<Awaited<ReturnType<typeof listSuppliers>>>([])
  const [ingredients, setIngredients] = useState<{ id: number; name: string }[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ supplier_id: "", ingredient_id: "", quantity_ordered: "1", unit_cost: "" })

  async function refresh() {
    const [nextOrders, nextSuppliers, nextIngredients] = await Promise.all([listPurchases(), listSuppliers(), listIngredients()])
    setOrders(nextOrders)
    setSuppliers(nextSuppliers)
    setIngredients(nextIngredients)
  }
  useEffect(() => { void refresh().catch((reason) => toast.error(getApiMessage(reason))) }, [])

  const columns: ColumnDef<(typeof orders)[number]>[] = [
    { accessorKey: "number", header: "Compra", cell: ({ row }) => <span className="font-medium">{row.original.number}</span> },
    { id: "supplier", accessorFn: (order) => order.supplier?.name || "", header: "Proveedor", cell: ({ row }) => row.original.supplier?.name || "—" },
    { accessorKey: "status", header: "Estado", cell: ({ row }) => purchaseStatus[row.original.status] || row.original.status },
    {
      id: "items",
      accessorFn: (order) => order.items.map((item) => item.ingredient?.name || "").join(" "),
      header: "Detalle",
      cell: ({ row }) => row.original.items.map((item) => `${item.ingredient?.name || "Ingrediente"} · pedido ${item.quantity_ordered} · recibido ${item.quantity_received} · ${formatMoney(item.unit_cost)} c/u`).join(" · ") || "—",
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => {
        const order = row.original
        if (order.status === "received" || order.status === "draft") return "—"
        return (
          <div className="flex flex-wrap gap-2">
            {order.items.map((item) => (
              <Button key={item.id} size="sm" variant="outline" onClick={async () => {
                const quantity = window.prompt("Cantidad recibida", item.quantity_ordered)
                if (!quantity) return
                await receivePurchase(order.id, [{ id: item.id, quantity: Number(quantity) }])
                await refresh()
              }}>Recibir {item.ingredient?.name || "ítem"}</Button>
            ))}
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-4 px-4 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Compras</h2>
          <p className="text-sm text-muted-foreground">El pedido queda hecho al proveedor. Recibir la mercancía se hace en la lista.</p>
        </div>
        <Button onClick={() => setOpen(true)}>Nueva compra</Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva compra</DialogTitle>
            <DialogDescription>Pide un ingrediente a un proveedor. El costo es por unidad, en pesos.</DialogDescription>
          </DialogHeader>
          <form className="grid gap-3" onSubmit={async (event) => {
            event.preventDefault()
            const unitCost = form.unit_cost.trim() === "" ? 0 : parseMoney(form.unit_cost)
            if (unitCost === null) {
              toast.error("Escribe el costo en pesos, por ejemplo 8.000")
              return
            }
            try {
              const created = await createPurchase({
                supplier_id: Number(form.supplier_id),
                items: [{ ingredient_id: Number(form.ingredient_id), quantity_ordered: Number(form.quantity_ordered), unit_cost: unitCost }],
              })
              await orderPurchase(created.id)
              setForm({ supplier_id: "", ingredient_id: "", quantity_ordered: "1", unit_cost: "" })
              setOpen(false)
              toast.success("Compra pedida")
              await refresh()
            } catch (reason) { toast.error(getApiMessage(reason)) }
          }}>
            <select aria-label="Proveedor" className="h-9 rounded-md border px-2" value={form.supplier_id} onChange={(event) => setForm({ ...form, supplier_id: event.target.value })} required>
              <option value="">Proveedor</option>
              {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
            </select>
            <select aria-label="Ingrediente" className="h-9 rounded-md border px-2" value={form.ingredient_id} onChange={(event) => setForm({ ...form, ingredient_id: event.target.value })} required>
              <option value="">Ingrediente</option>
              {ingredients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <Input aria-label="Cantidad pedida" value={form.quantity_ordered} onChange={(event) => setForm({ ...form, quantity_ordered: event.target.value })} />
            <MoneyField label="Costo por unidad" value={form.unit_cost} onChange={(unit_cost) => setForm({ ...form, unit_cost })} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit">Pedir</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <DataTable columns={columns} data={orders} searchPlaceholder="Buscar compra" emptyMessage="Todavía no hay compras." />
    </div>
  )
}

export function CustomersAdminPage() {
  const [customers, setCustomers] = useState<Awaited<ReturnType<typeof listCustomers>>["data"]>([])

  useEffect(() => {
    listCustomers().then((response) => setCustomers(response.data)).catch((reason) => toast.error(getApiMessage(reason)))
  }, [])

  const columns: ColumnDef<(typeof customers)[number]>[] = [
    { accessorKey: "name", header: "Cliente", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { accessorKey: "email", header: "Correo" },
    { accessorKey: "phone", header: "Teléfono", cell: ({ row }) => row.original.phone || "Sin teléfono" },
    { accessorKey: "orders_count", header: "Pedidos" },
    { accessorKey: "spent", header: "Compró", cell: ({ row }) => formatMoney(row.original.spent) },
    { accessorKey: "last_order_at", header: "Última compra", cell: ({ row }) => row.original.last_order_at ? new Date(row.original.last_order_at).toLocaleDateString("es-CO") : "Sin compras" },
  ]

  return (
    <div className="space-y-4 px-4 lg:px-6">
      <h2 className="text-2xl font-semibold">Clientes</h2>
      <DataTable columns={columns} data={customers} searchPlaceholder="Buscar cliente" emptyMessage="No hay clientes registrados." />
    </div>
  )
}

type SalesReport = {
  summary?: { total: string; orders: number; average_ticket: string | null }
  by_product?: { name: string; quantity: number; revenue: string }[]
  by_channel?: { channel: string; orders: number; total: string }[]
}

type InventoryReport = {
  expiring_lots?: { id: number; ingredient?: string; quantity: string; expires_on?: string }[]
  waste?: unknown[]
}

export function ReportsAdminPage() {
  const [sales, setSales] = useState<SalesReport | null>(null)
  const [inventory, setInventory] = useState<InventoryReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    Promise.all([getSalesReport(), getInventoryReport()])
      .then(([nextSales, nextInventory]) => {
        setSales(nextSales as SalesReport)
        setInventory(nextInventory as InventoryReport)
      })
      .catch((reason) => setError(getApiMessage(reason)))
  }, [])

  async function downloadCsv() {
    const response = await api.get("/reports/sales.csv", { responseType: "blob" })
    const url = URL.createObjectURL(response.data)
    const link = document.createElement("a")
    link.href = url
    link.download = "ventas.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  const waste = Array.isArray(inventory?.waste) ? inventory.waste.length : 0

  return (
    <div className="space-y-4 px-4 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Reportes</h2>
          <p className="text-sm text-muted-foreground">Solo cuentan los pedidos pagados y no cancelados. Los valores están en pesos colombianos. Excel no está disponible; el CSV sí.</p>
        </div>
        <Button type="button" variant="outline" onClick={() => downloadCsv().catch((reason) => setError(getApiMessage(reason)))}>
          Descargar CSV de ventas
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="grid gap-3 md:grid-cols-3">
        <article className="rounded-2xl border bg-white p-4">
          <p className="text-sm text-muted-foreground">Ventas del periodo</p>
          <p className="text-2xl font-semibold">{formatMoney(sales?.summary?.total)}</p>
        </article>
        <article className="rounded-2xl border bg-white p-4">
          <p className="text-sm text-muted-foreground">Pedidos pagados</p>
          <p className="text-2xl font-semibold">{sales?.summary?.orders ?? "—"}</p>
        </article>
        <article className="rounded-2xl border bg-white p-4">
          <p className="text-sm text-muted-foreground">Ticket promedio</p>
          <p className="text-2xl font-semibold">{sales?.summary?.average_ticket ? formatMoney(sales.summary.average_ticket) : "—"}</p>
        </article>
      </div>
      <section className="rounded-2xl border bg-white p-4">
        <h3 className="font-medium">Por canal</h3>
        {(sales?.by_channel || []).length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Sin ventas en el periodo.</p> : null}
        {(sales?.by_channel || []).map((row) => (
          <p key={row.channel} className="mt-2 text-sm">{channelLabel[row.channel] || row.channel} · {row.orders} pedidos · {formatMoney(row.total)}</p>
        ))}
      </section>
      <section className="rounded-2xl border bg-white p-4">
        <h3 className="font-medium">Por sabor</h3>
        <div className="mt-2">
          <DataTable
            columns={[
              { accessorKey: "name", header: "Sabor" },
              { accessorKey: "quantity", header: "Cantidad" },
              { accessorKey: "revenue", header: "Ventas", cell: ({ row }) => formatMoney(row.original.revenue) },
            ] satisfies ColumnDef<NonNullable<SalesReport["by_product"]>[number]>[]}
            data={sales?.by_product || []}
            searchPlaceholder="Buscar sabor"
            emptyMessage="Sin productos vendidos en el periodo."
          />
        </div>
      </section>
      <p className="text-sm text-muted-foreground">Lotes por vencer: {inventory?.expiring_lots?.length ?? 0}. Mermas registradas: {waste}.</p>
    </div>
  )
}

const settingFields = [
  ["store_name", "Nombre de la tienda"],
  ["tagline", "Frase de la portada"],
  ["phone", "Teléfono"],
  ["email", "Correo"],
  ["address", "Dirección"],
  ["city", "Ciudad"],
  ["instagram", "Instagram"],
  ["policies", "Políticas para el cliente"],
] as const

export function SettingsAdminPage() {
  const [form, setForm] = useState<Record<string, unknown> | null>(null)
  const [payments, setPayments] = useState<PaymentMethod[]>([])
  useEffect(() => {
    getSettings().then(setForm).catch((reason) => toast.error(getApiMessage(reason)))
    listAdminPayments().then(setPayments).catch(() => undefined)
  }, [])
  if (!form) return <p className="px-4 text-sm text-muted-foreground">Cargando configuración…</p>
  return (
    <div className="grid max-w-2xl gap-6 px-4 lg:px-6">
      <form className="grid gap-3" onSubmit={async (event) => {
        event.preventDefault()
        const fee = form.delivery_fee === "" || form.delivery_fee == null ? null : parseMoney(String(form.delivery_fee))
        if (form.delivery_fee !== "" && form.delivery_fee != null && fee === null) {
          toast.error("El domicilio debe ir en pesos, por ejemplo 5.000")
          return
        }
        try {
          setForm(await updateSettings({
            store_name: form.store_name,
            tagline: form.tagline,
            phone: form.phone,
            email: form.email,
            address: form.address,
            city: form.city,
            instagram: form.instagram,
            pickup_enabled: Boolean(form.pickup_enabled),
            delivery_enabled: Boolean(form.delivery_enabled),
            delivery_fee: fee,
            policies: form.policies,
            mission: String(form.mission ?? "").trim() || null,
            vision: String(form.vision ?? "").trim() || null,
          }))
          toast.success("Configuración guardada")
        } catch (reason) { toast.error(getApiMessage(reason)) }
      }}>
        <div>
          <h2 className="text-2xl font-semibold">Configuración</h2>
          <p className="text-sm text-muted-foreground">Estos datos salen en la tienda. La moneda del sistema es el peso colombiano.</p>
        </div>
        {settingFields.map(([key, label]) => (
          <label key={key} className="text-sm">
            {label}
            <Input className="mt-1" value={form[key] == null ? "" : String(form[key])} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />
          </label>
        ))}
        <label className="text-sm">
          Misión
          <textarea rows={4} className="mt-1 w-full rounded-lg border px-2.5 py-2 text-sm" value={form.mission == null ? "" : String(form.mission)} onChange={(event) => setForm({ ...form, mission: event.target.value })} />
          <span className="mt-1 block text-muted-foreground">Sale en Sobre nosotros. Si lo dejas vacío, la tienda dice que aún no está publicada.</span>
        </label>
        <label className="text-sm">
          Visión
          <textarea rows={4} className="mt-1 w-full rounded-lg border px-2.5 py-2 text-sm" value={form.vision == null ? "" : String(form.vision)} onChange={(event) => setForm({ ...form, vision: event.target.value })} />
          <span className="mt-1 block text-muted-foreground">Sale al lado de la misión, en Sobre nosotros.</span>
        </label>
        <MoneyField label="Tarifa de domicilio" value={form.delivery_fee == null ? "" : String(form.delivery_fee)} onChange={(delivery_fee) => setForm({ ...form, delivery_fee })} />
        <label className="text-sm"><input type="checkbox" checked={Boolean(form.pickup_enabled)} onChange={(event) => setForm({ ...form, pickup_enabled: event.target.checked })} /> Recoger en tienda</label>
        <label className="text-sm"><input type="checkbox" checked={Boolean(form.delivery_enabled)} onChange={(event) => setForm({ ...form, delivery_enabled: event.target.checked })} /> Domicilio habilitado</label>
        <Button type="submit">Guardar</Button>
      </form>
      <section className="grid gap-2">
        <h3 className="text-lg font-semibold">Medios de pago</h3>
        <p className="text-sm text-muted-foreground">Se pueden renombrar y apagar. No se borran, porque los pedidos ya los usan. No hay pago con tarjeta.</p>
        {payments.map((method) => (
          <article key={method.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3 text-sm">
            <div>
              <p className="font-medium">{method.name}</p>
              <p className="text-muted-foreground">{method.records_as_paid ? "Queda pagado al usarse" : "Queda pendiente hasta que el personal lo confirme"} · {method.is_active ? "activo" : "apagado"}</p>
            </div>
            <Button size="sm" variant="outline" onClick={async () => {
              try {
                const updated = await updatePayment(method.id, { is_active: !method.is_active })
                setPayments((current) => current.map((item) => item.id === method.id ? updated : item))
                toast.success(updated.is_active ? "Medio activado" : "Medio apagado")
              } catch (reason) { toast.error(getApiMessage(reason)) }
            }}>{method.is_active ? "Apagar" : "Activar"}</Button>
          </article>
        ))}
      </section>
    </div>
  )
}

export function CouponsAdminPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ code: "", type: "fixed", value: "", min_subtotal: "" })

  async function refresh() {
    setCoupons(await listCoupons())
  }
  useEffect(() => { void refresh().catch((reason) => toast.error(getApiMessage(reason))) }, [])

  const columns: ColumnDef<Coupon>[] = [
    { accessorKey: "code", header: "Código", cell: ({ row }) => <span className="font-medium">{row.original.code}</span> },
    { accessorKey: "is_active", header: "Estado", cell: ({ row }) => row.original.is_active ? "Activo" : "Apagado" },
    {
      id: "value",
      accessorFn: (coupon) => coupon.value,
      header: "Descuento",
      cell: ({ row }) => row.original.type === "fixed" ? formatMoney(row.original.value) : `${row.original.value} %`,
    },
    { accessorKey: "min_subtotal", header: "Compra mínima", cell: ({ row }) => row.original.min_subtotal ? formatMoney(row.original.min_subtotal) : "—" },
    { accessorKey: "usage_limit", header: "Tope", cell: ({ row }) => row.original.usage_limit ? String(row.original.usage_limit) : "—" },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => (
        <Button size="sm" variant="outline" onClick={async () => {
          try {
            await saveCoupon({ is_active: !row.original.is_active }, row.original.id)
            toast.success(row.original.is_active ? "Cupón apagado" : "Cupón activado")
            await refresh()
          } catch (reason) { toast.error(getApiMessage(reason)) }
        }}>{row.original.is_active ? "Apagar" : "Activar"}</Button>
      ),
    },
  ]

  return (
    <div className="space-y-4 px-4 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Cupones</h2>
          <p className="text-sm text-muted-foreground">Un cupón fijo descuenta pesos. Uno de porcentaje descuenta sobre el subtotal. No se eliminan: se apagan para no perder el historial.</p>
        </div>
        <Button onClick={() => { setForm({ code: "", type: "fixed", value: "", min_subtotal: "" }); setOpen(true) }}>Nuevo cupón</Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo cupón</DialogTitle>
            <DialogDescription>Un descuento fijo resta pesos. Un porcentaje se aplica sobre el subtotal.</DialogDescription>
          </DialogHeader>
          <form className="grid items-start gap-4 sm:grid-cols-2" onSubmit={async (event) => {
            event.preventDefault()
            const value = form.type === "fixed" ? parseMoney(form.value) : Number(form.value)
            const minimum = form.min_subtotal.trim() === "" ? null : parseMoney(form.min_subtotal)
            if (value === null || Number.isNaN(value) || (form.min_subtotal.trim() !== "" && minimum === null)) {
              toast.error("Revisa el valor. En pesos usa 5.000; en porcentaje usa 10.")
              return
            }
            try {
              await saveCoupon({
                code: form.code.trim().toUpperCase(),
                type: form.type,
                value,
                min_subtotal: minimum,
                is_active: true,
              })
              setForm({ code: "", type: "fixed", value: "", min_subtotal: "" })
              setOpen(false)
              toast.success("Cupón creado")
              await refresh()
            } catch (reason) { toast.error(getApiMessage(reason)) }
          }}>
            <FormField label="Código">
              <Input aria-label="Código" placeholder="BIENVENIDA" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} required />
            </FormField>
            <FormField label="Tipo">
              <select aria-label="Tipo de cupón" className={fieldControlClass} value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
                <option value="fixed">Descuento en pesos</option>
                <option value="percent">Porcentaje</option>
              </select>
            </FormField>
            {form.type === "fixed"
              ? <MoneyField label="Descuento" value={form.value} onChange={(value) => setForm({ ...form, value })} required />
              : <FormField label="Porcentaje"><Input aria-label="Porcentaje" placeholder="10" value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} required /></FormField>}
            <MoneyField label="Compra mínima, opcional" value={form.min_subtotal} onChange={(min_subtotal) => setForm({ ...form, min_subtotal })} />
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit">Crear cupón</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <DataTable columns={columns} data={coupons} searchPlaceholder="Buscar cupón" emptyMessage="No hay cupones." />
    </div>
  )
}
