import { useEffect, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"
import { listAdminProducts, listCategories, listToppings, loadExampleFlavors, removeCategory, removeProduct, removeTopping, saveCategory, saveProduct, saveTopping, uploadProductImage, type Topping } from "@/features/admin/api"
import { DataTable } from "@/components/data-table"
import { fieldControlClass, FormField } from "@/components/form-field"
import { MoneyField } from "@/components/money-field"
import { getApiMessage } from "@/lib/form-errors"
import { formatMoney, formatPortions, parseMoney } from "@/lib/money"
import type { Flavor } from "@/types/commerce"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

export function ProductsAdminPage() {
  const [products, setProducts] = useState<Flavor[]>([])
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<number | "new" | null>(null)
  const [form, setForm] = useState(emptyForm())

  async function refresh() {
    try {
      const [productRes, categoryRes] = await Promise.all([listAdminProducts("", 1, 100), listCategories()])
      setProducts(productRes.data)
      setCategories(categoryRes)
    } catch (reason) {
      setError(getApiMessage(reason))
    }
  }

  useEffect(() => { void refresh() }, [])

  const columns: ColumnDef<Flavor>[] = [
    {
      accessorKey: "name",
      header: "Sabor",
      cell: ({ row }) => <span className="font-medium">{row.original.name}{row.original.is_demonstration ? " · referencia" : ""}</span>,
    },
    {
      id: "price",
      accessorFn: (product) => product.variants?.[0]?.price || "",
      header: "Precio",
      cell: ({ row }) => row.original.variants?.[0] ? formatMoney(row.original.variants[0].price) : "Sin precio",
    },
    {
      accessorKey: "availability",
      header: "Estado",
      cell: ({ row }) => availabilityLabel[row.original.availability] || row.original.availability,
    },
    {
      id: "warehouse",
      accessorFn: (product) => product.warehouse_portions || "",
      header: "Almacén",
      cell: ({ row }) => formatPortions(row.original.warehouse_portions),
    },
    {
      id: "cases",
      accessorFn: (product) => product.case_portions || "",
      header: "Vitrinas",
      cell: ({ row }) => formatPortions(row.original.case_portions),
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => {
            const product = row.original
            setEditing(product.id)
            setForm({
              name: product.name,
              category_id: product.category_id ? String(product.category_id) : "",
              short_description: product.short_description || "",
              description: product.description || "",
              ingredients_text: product.ingredients_text || "",
              price: product.variants?.[0]?.price || "",
              portions: product.variants?.[0]?.portions || "1",
              container: product.variants?.[0]?.container || "cup",
              variant_id: product.variants?.[0]?.id,
              is_active: product.is_active,
              is_featured: product.is_featured,
              is_new: product.is_new,
              is_seasonal: product.is_seasonal,
            })
          }}>Editar</Button>
          <Button size="sm" variant="ghost" onClick={async () => {
            if (!window.confirm(`¿Eliminar ${row.original.name}?`)) return
            try {
              await removeProduct(row.original.id)
              toast.success("Sabor eliminado")
              await refresh()
            } catch (reason) { toast.error(getApiMessage(reason)) }
          }}>Eliminar</Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4 px-4 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Productos y sabores</h2>
          <p className="text-sm text-muted-foreground">El stock no se edita aquí. Entra solo por movimientos, producción o compras.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={async () => {
            if (!window.confirm("Esto crea sabores de referencia, sin inventario y sin venta. ¿Continuar?")) return
            try {
              const result = await loadExampleFlavors()
              toast.success(result.notice)
              await refresh()
            } catch (reason) { toast.error(getApiMessage(reason)) }
          }}>Cargar referencias</Button>
          <Button onClick={() => { setForm(emptyForm()); setEditing("new") }}>Nuevo sabor</Button>
        </div>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <DataTable columns={columns} data={products} searchPlaceholder="Buscar sabor" emptyMessage="No hay sabores. El catálogo público está vacío hasta que publiques uno real." />
      <Dialog open={editing !== null} onOpenChange={(open) => { if (!open) setEditing(null) }}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Nuevo sabor" : "Editar sabor"}</DialogTitle>
            <DialogDescription>El precio y las porciones los valida el servidor. El stock no se cambia desde aquí.</DialogDescription>
          </DialogHeader>
          <form className="grid items-start gap-4 md:grid-cols-2" onSubmit={async (event) => {
            event.preventDefault()
            const file = (event.currentTarget.elements.namedItem("image") as HTMLInputElement | null)?.files?.[0]
            try {
              const price = parseMoney(form.price)
              if (price === null) {
                toast.error("Escribe el precio en pesos, por ejemplo 12.000")
                return
              }
              const saved = await saveProduct({
                name: form.name,
                category_id: form.category_id ? Number(form.category_id) : null,
                short_description: form.short_description,
                description: form.description,
                ingredients_text: form.ingredients_text,
                is_active: form.is_active,
                is_featured: form.is_featured,
                is_new: form.is_new,
                is_seasonal: form.is_seasonal,
                variants: [{
                  id: form.variant_id,
                  name: "Copa",
                  price,
                  portions: Number(form.portions),
                  container: form.container,
                  is_active: true,
                }],
              }, editing === "new" ? undefined : editing ?? undefined)
              if (file) await uploadProductImage(saved.id, file)
              toast.success("Sabor guardado")
              setEditing(null)
              await refresh()
            } catch (reason) { toast.error(getApiMessage(reason)) }
          }}>
            <FormField label="Nombre">
              <Input aria-label="Nombre" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            </FormField>
            <FormField label="Categoría">
              <select aria-label="Categoría" className={fieldControlClass} value={form.category_id} onChange={(event) => setForm({ ...form, category_id: event.target.value })}>
                <option value="">Sin categoría</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </FormField>
            <FormField label="Descripción breve">
              <Input aria-label="Descripción breve" value={form.short_description} onChange={(event) => setForm({ ...form, short_description: event.target.value })} />
            </FormField>
            <MoneyField label="Precio de la copa" value={form.price} onChange={(price) => setForm({ ...form, price })} required />
            <FormField label="Porciones que consume">
              <Input aria-label="Porciones que consume" type="number" min="0.001" step="0.001" value={form.portions} onChange={(event) => setForm({ ...form, portions: event.target.value })} />
            </FormField>
            <FormField label="Envase">
              <select aria-label="Envase" className={fieldControlClass} value={form.container} onChange={(event) => setForm({ ...form, container: event.target.value })}>
                <option value="cup">Vaso</option>
                <option value="cone">Cono</option>
                <option value="pint">Pinta</option>
                <option value="pack">Empaque</option>
              </select>
            </FormField>
            <FormField label="Descripción" className="md:col-span-2">
              <textarea aria-label="Descripción" className="field-textarea" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            </FormField>
            <FormField label="Ingredientes publicados" className="md:col-span-2">
              <textarea aria-label="Ingredientes" className="field-textarea" value={form.ingredients_text} onChange={(event) => setForm({ ...form, ingredients_text: event.target.value })} />
            </FormField>
            <FormField label="Fotografía" className="md:col-span-2">
              <input name="image" type="file" accept="image/*" className="text-sm" />
            </FormField>
            <div className="flex flex-wrap items-center gap-4 text-sm md:col-span-2">
              <label><input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} /> Activo</label>
              <label><input type="checkbox" checked={form.is_featured} onChange={(event) => setForm({ ...form, is_featured: event.target.checked })} /> Destacado</label>
              <label><input type="checkbox" checked={form.is_new} onChange={(event) => setForm({ ...form, is_new: event.target.checked })} /> Nuevo</label>
              <label><input type="checkbox" checked={form.is_seasonal} onChange={(event) => setForm({ ...form, is_seasonal: event.target.checked })} /> Temporada</label>
            </div>
            <DialogFooter className="md:col-span-2">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button type="submit">Guardar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

const availabilityLabel: Record<string, string> = {
  in_stock: "Disponible",
  low: "Pocas porciones",
  out: "Agotado",
  unavailable: "No publicado",
}

function emptyForm() {
  return {
    name: "",
    category_id: "",
    short_description: "",
    description: "",
    ingredients_text: "",
    price: "",
    portions: "1",
    container: "cup",
    variant_id: undefined as number | undefined,
    is_active: true,
    is_featured: false,
    is_new: false,
    is_seasonal: false,
  }
}

export function CategoriesAdminPage() {
  const [categories, setCategories] = useState<{ id: number; name: string; is_demonstration: boolean; is_active: boolean }[]>([])
  const [name, setName] = useState("")
  const [editing, setEditing] = useState<number | "new" | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    try { setCategories(await listCategories()) } catch (reason) { setError(getApiMessage(reason)) }
  }
  useEffect(() => { void refresh() }, [])

  const columns: ColumnDef<{ id: number; name: string; is_demonstration: boolean; is_active: boolean }>[] = [
    {
      accessorKey: "name",
      header: "Categoría",
      cell: ({ row }) => <span className="font-medium">{row.original.name}{row.original.is_demonstration ? " · demostración" : ""}</span>,
    },
    {
      accessorKey: "is_active",
      header: "Estado",
      cell: ({ row }) => row.original.is_active ? "Activa" : "Inactiva",
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { setEditing(row.original.id); setName(row.original.name) }}>Editar</Button>
          <Button size="sm" variant="ghost" onClick={async () => {
            if (!window.confirm(`¿Eliminar ${row.original.name}?`)) return
            try {
              await removeCategory(row.original.id)
              toast.success("Categoría eliminada")
              await refresh()
            } catch (reason) { toast.error(getApiMessage(reason)) }
          }}>Eliminar</Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4 px-4 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Categorías</h2>
          <p className="text-sm text-muted-foreground">Agrupan la carta. No se puede borrar una categoría que todavía tiene sabores.</p>
        </div>
        <Button onClick={() => { setName(""); setEditing("new") }}>Nueva categoría</Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Dialog open={editing !== null} onOpenChange={(open) => { if (!open) { setEditing(null); setName("") } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Nueva categoría" : "Editar categoría"}</DialogTitle>
            <DialogDescription>El nombre es el que ve el cliente al filtrar la carta.</DialogDescription>
          </DialogHeader>
          <form className="grid gap-3" onSubmit={async (event) => {
            event.preventDefault()
            try {
              await saveCategory({ name }, editing === "new" ? undefined : editing ?? undefined)
              toast.success(editing === "new" ? "Categoría creada" : "Categoría actualizada")
              setName("")
              setEditing(null)
              await refresh()
            } catch (reason) { toast.error(getApiMessage(reason)) }
          }}>
            <Input aria-label="Nombre de categoría" placeholder="Nombre, por ejemplo Copas" value={name} onChange={(event) => setName(event.target.value)} required />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setEditing(null); setName("") }}>Cancelar</Button>
              <Button type="submit">{editing === "new" ? "Crear" : "Guardar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <DataTable columns={columns} data={categories} searchPlaceholder="Buscar categoría" emptyMessage="Todavía no hay categorías." />
    </div>
  )
}

export function ToppingsAdminPage() {
  const [toppings, setToppings] = useState<Topping[]>([])
  const [editing, setEditing] = useState<number | "new" | null>(null)
  const [form, setForm] = useState({ name: "", price: "", is_active: true })

  async function refresh() {
    setToppings(await listToppings())
  }
  useEffect(() => { void refresh().catch((reason) => toast.error(getApiMessage(reason))) }, [])

  const columns: ColumnDef<Topping>[] = [
    { accessorKey: "name", header: "Extra", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { accessorKey: "price", header: "Precio", cell: ({ row }) => formatMoney(row.original.price) },
    { accessorKey: "is_active", header: "Estado", cell: ({ row }) => row.original.is_active ? "Activo" : "Inactivo" },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { setEditing(row.original.id); setForm({ name: row.original.name, price: row.original.price, is_active: row.original.is_active }) }}>Editar</Button>
          <Button size="sm" variant="ghost" onClick={async () => {
            if (!window.confirm(`¿Eliminar ${row.original.name}?`)) return
            try {
              await removeTopping(row.original.id)
              toast.success("Extra eliminado")
              await refresh()
            } catch (reason) { toast.error(getApiMessage(reason)) }
          }}>Eliminar</Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4 px-4 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Extras</h2>
          <p className="text-sm text-muted-foreground">Toppings que el cliente puede sumar al helado. El precio se cobra en pesos y lo calcula el servidor.</p>
        </div>
        <Button onClick={() => { setForm({ name: "", price: "", is_active: true }); setEditing("new") }}>Nuevo extra</Button>
      </div>
      <Dialog open={editing !== null} onOpenChange={(open) => { if (!open) { setEditing(null); setForm({ name: "", price: "", is_active: true }) } }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Nuevo extra" : "Editar extra"}</DialogTitle>
            <DialogDescription>El precio se suma al helado. El total lo calcula el servidor.</DialogDescription>
          </DialogHeader>
          <form className="grid items-start gap-4 sm:grid-cols-2" onSubmit={async (event) => {
            event.preventDefault()
            const price = parseMoney(form.price)
            if (price === null) {
              toast.error("Escribe el precio en pesos, por ejemplo 2.000")
              return
            }
            try {
              await saveTopping({ name: form.name, price, is_active: form.is_active }, editing === "new" ? undefined : editing ?? undefined)
              toast.success(editing === "new" ? "Extra creado" : "Extra actualizado")
              setForm({ name: "", price: "", is_active: true })
              setEditing(null)
              await refresh()
            } catch (reason) { toast.error(getApiMessage(reason)) }
          }}>
            <FormField label="Nombre">
              <Input aria-label="Nombre del extra" placeholder="Perlas de tapioca" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            </FormField>
            <MoneyField label="Precio" value={form.price} onChange={(price) => setForm({ ...form, price })} required />
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" className="size-4" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} />
              Activo, se ofrece al armar el helado
            </label>
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => { setEditing(null); setForm({ name: "", price: "", is_active: true }) }}>Cancelar</Button>
              <Button type="submit">{editing === "new" ? "Crear" : "Guardar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <DataTable columns={columns} data={toppings} searchPlaceholder="Buscar extra" emptyMessage="No hay extras. La ficha del sabor no ofrecerá toppings hasta que crees uno." />
    </div>
  )
}
