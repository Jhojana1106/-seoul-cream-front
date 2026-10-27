import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"
import { getFlavor, getStoreSettings, listStoreToppings } from "@/features/store/api"
import { useCart } from "@/features/store/cart"
import { getApiMessage } from "@/lib/form-errors"
import { formatMoney, formatPortions } from "@/lib/money"
import { resolveMediaUrl } from "@/lib/media"
import type { Flavor, Topping } from "@/types/commerce"
import { Button } from "@/components/ui/button"
import { StateMessage } from "@/features/store/components"

const containers: Record<string, string> = {
  cone: "Cono",
  cup: "Vaso",
  pint: "Pinta",
  pack: "Empaque",
  other: "Otro",
}

export function ProductPage() {
  const { slug = "" } = useParams()
  const navigate = useNavigate()
  const cart = useCart()
  const [flavor, setFlavor] = useState<Flavor | null>(null)
  const [toppings, setToppings] = useState<Topping[]>([])
  const [currency, setCurrency] = useState("COP")
  const [variantId, setVariantId] = useState<number | null>(null)
  const [selected, setSelected] = useState<number[]>([])
  const [quantity, setQuantity] = useState(1)
  const [instructions, setInstructions] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([getFlavor(slug), listStoreToppings(), getStoreSettings()])
      .then(([nextFlavor, nextToppings, settings]) => {
        setFlavor(nextFlavor)
        setToppings(nextToppings)
        setCurrency(settings.currency)
        setVariantId(nextFlavor.variants?.[0]?.id ?? null)
      })
      .catch((reason) => setError(getApiMessage(reason, "No encontramos este sabor.")))
      .finally(() => setLoading(false))
  }, [slug])

  const variant = flavor?.variants?.find((item) => item.id === variantId)

  const payload = useMemo(() => {
    if (!flavor || !variant || flavor.is_demonstration) return null
    const unit = Number(variant.price) + selected.reduce((sum, id) => {
      const topping = toppings.find((item) => item.id === id)
      return sum + Number(topping?.price || 0)
    }, 0)
    return (unit * quantity).toFixed(2)
  }, [flavor, variant, quantity, selected, toppings])

  if (loading) return <div className="mx-auto max-w-6xl px-4 py-16"><StateMessage title="Cargando ficha" body="Consultando el sabor." /></div>
  if (error || !flavor) return <div className="mx-auto max-w-6xl px-4 py-16"><StateMessage title="Sabor no disponible" body={error || "No está publicado."} /></div>

  const image = resolveMediaUrl(flavor.image_url)
  const localTotal = payload

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 md:grid-cols-2 md:px-6">
      <div className="overflow-hidden rounded-[2rem] bg-accent min-h-96">
        {image ? <img src={image} alt={flavor.name} className="size-full object-cover" /> : (
          <div className="flex h-full min-h-96 items-end p-8">
            <p className="text-4xl font-semibold tracking-tight">{flavor.name}</p>
          </div>
        )}
      </div>
      <div>
        <p className="eyebrow">{flavor.category?.name || "Sabor"}</p>
        <h1 className="mt-2 text-5xl font-semibold tracking-tight">{flavor.name}</h1>
        <p className="mt-4 text-muted-foreground">{flavor.description || flavor.short_description || "Sin descripción publicada."}</p>
        {flavor.is_demonstration ? (
          <p className="mt-4 rounded-2xl bg-accent px-4 py-3 text-sm">Contenido de demostración. No está a la venta y no representa inventario.</p>
        ) : null}
        <p className="mt-6 text-3xl font-semibold">{localTotal ? formatMoney(localTotal, currency) : "Sin precio"}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {flavor.availability === "out" ? "Agotado" : flavor.availability === "low" ? "Nivel bajo" : "Disponible"} · {formatPortions(flavor.available_portions, flavor.portion_unit)}
        </p>

        <fieldset className="mt-8" disabled={flavor.is_demonstration}>
          <legend className="text-sm font-medium">Presentación</legend>
          <div className="mt-3 grid gap-2">
            {flavor.variants?.map((item) => (
              <label key={item.id} className={`flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 ${variantId === item.id ? "border-primary bg-white" : "bg-white"}`}>
                <span>
                  <input type="radio" name="variant" className="mr-2" checked={variantId === item.id} onChange={() => setVariantId(item.id)} />
                  {item.name} · {containers[item.container] || item.container}
                </span>
                <span>{formatMoney(item.price, currency)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {toppings.length > 0 && !flavor.is_demonstration ? (
          <fieldset className="mt-6">
            <legend className="text-sm font-medium">Toppings</legend>
            <div className="mt-3 grid gap-2">
              {toppings.map((topping) => (
                <label key={topping.id} className="flex items-center justify-between gap-3 rounded-2xl border bg-white px-4 py-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <input
                      type="checkbox"
                      className="size-4 shrink-0"
                      checked={selected.includes(topping.id)}
                      onChange={() => setSelected((current) => current.includes(topping.id) ? current.filter((id) => id !== topping.id) : [...current, topping.id])}
                    />
                    <span className="truncate">{topping.name}</span>
                  </span>
                  <span className="shrink-0 font-medium">{formatMoney(topping.price, currency)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        <div className="mt-6 flex items-center gap-3">
          <label className="text-sm" htmlFor="qty">Cantidad</label>
          <input id="qty" type="number" min={1} max={50} value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))} className="h-10 w-20 rounded-md border bg-white px-3" />
        </div>
        <label className="mt-4 block text-sm" htmlFor="notes">Instrucciones</label>
        <textarea id="notes" className="field-textarea mt-2 bg-white" maxLength={280} value={instructions} onChange={(event) => setInstructions(event.target.value)} />

        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            disabled={!variant || flavor.is_demonstration || flavor.availability === "out"}
            onClick={() => {
              if (!variant) return
              cart.add({
                productId: flavor.id,
                variantId: variant.id,
                toppings: selected.map((id) => ({ id, quantity: 1 })),
                quantity,
                instructions,
                label: flavor.name,
                variantLabel: variant.name,
              })
              toast.success("Agregado al carrito")
              navigate("/cart")
            }}
          >
            Agregar al carrito
          </Button>
          <Button variant="outline" asChild><Link to="/menu">Volver al menú</Link></Button>
        </div>

        <dl className="mt-10 grid gap-4 text-sm">
          <div>
            <dt className="eyebrow">Ingredientes</dt>
            <dd className="mt-1">{flavor.ingredients_text || "Sin ingredientes publicados."}</dd>
          </div>
          <div>
            <dt className="eyebrow">Alérgenos</dt>
            <dd className="mt-1">{flavor.allergens?.length ? flavor.allergens.map((item) => item.name).join(", ") : "Sin alérgenos registrados."}</dd>
          </div>
          <div>
            <dt className="eyebrow">Preferencias verificadas</dt>
            <dd className="mt-1">
              Vegano: {labelDiet(flavor.dietary_vegan)}. Sin gluten: {labelDiet(flavor.dietary_gluten_free)}.
            </dd>
          </div>
          {flavor.nutrition ? (
            <div>
              <dt className="eyebrow">Nutrición informada</dt>
              <dd className="mt-1">
                {[
                  flavor.nutrition.calories_kcal != null ? `${flavor.nutrition.calories_kcal} kcal` : null,
                  flavor.nutrition.fat_g != null ? `${flavor.nutrition.fat_g} g grasa` : null,
                  flavor.nutrition.sugar_g != null ? `${flavor.nutrition.sugar_g} g azúcar` : null,
                  flavor.nutrition.protein_g != null ? `${flavor.nutrition.protein_g} g proteína` : null,
                  flavor.nutrition.note,
                ].filter(Boolean).join(" · ")}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>
    </div>
  )
}

function labelDiet(value: boolean | null) {
  if (value === null) return "no verificado"
  return value ? "sí" : "no"
}
