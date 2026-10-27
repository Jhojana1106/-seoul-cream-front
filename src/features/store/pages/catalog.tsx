import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { FlavorCard, StateMessage } from "@/features/store/components"
import { getStoreSettings, listFlavors, listStoreCategories } from "@/features/store/api"
import { getApiMessage } from "@/lib/form-errors"
import type { Flavor } from "@/types/commerce"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function CatalogPage() {
  const [params, setParams] = useSearchParams()
  const [flavors, setFlavors] = useState<Flavor[]>([])
  const [categories, setCategories] = useState<{ id: number; name: string; slug: string }[]>([])
  const [currency, setCurrency] = useState("COP")
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState(params.get("search") || "")

  useEffect(() => {
    listStoreCategories().then(setCategories).catch(() => setCategories([]))
    getStoreSettings().then((settings) => setCurrency(settings.currency)).catch(() => undefined)
  }, [])

  useEffect(() => {
    setLoading(true)
    setError(null)
    listFlavors({
      search: params.get("search") || undefined,
      category: params.get("category") || undefined,
      availability: params.get("availability") || undefined,
      sort: params.get("sort") || "newest",
      featured: params.get("featured") || undefined,
      seasonal: params.get("seasonal") || undefined,
      new: params.get("new") || undefined,
      vegan: params.get("vegan") || undefined,
      gluten_free: params.get("gluten_free") || undefined,
      page,
      per_page: 12,
    })
      .then((response) => {
        setFlavors(response.data)
        setLastPage(response.meta?.last_page || 1)
      })
      .catch((reason) => setError(getApiMessage(reason)))
      .finally(() => setLoading(false))
  }, [params, page])

  function update(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setPage(1)
    setParams(next)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-6">
      <p className="inline-flex rounded-full bg-[#ffe7f1] px-3 py-1 text-[11px] font-bold tracking-[0.14em] text-[#e23b78]">MENU DE ESPECIALIDADES</p>
      <h1 className="mt-4 text-4xl font-extrabold tracking-tight">Nuestros sabores icónicos</h1>
      <p className="mt-3 max-w-xl text-sm text-[#8d8084]">Busca, filtra y añade lo que tenga existencia. El precio es el de la carta.</p>
      <form
        className="mt-6 grid gap-3 md:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))]"
        onSubmit={(event) => {
          event.preventDefault()
          update("search", search)
        }}
      >
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar un sabor" aria-label="Buscar" />
        <select className="h-9 rounded-md border bg-white px-3 text-sm" value={params.get("category") || ""} onChange={(event) => update("category", event.target.value)} aria-label="Categoría">
          <option value="">Categoría</option>
          {categories.map((category) => <option key={category.id} value={category.slug}>{category.name}</option>)}
        </select>
        <select className="h-9 rounded-md border bg-white px-3 text-sm" value={params.get("availability") || ""} onChange={(event) => update("availability", event.target.value)} aria-label="Disponibilidad">
          <option value="">Disponibilidad</option>
          <option value="in_stock">Con existencia</option>
          <option value="out">Agotados</option>
        </select>
        <select className="h-9 rounded-md border bg-white px-3 text-sm" value={params.get("sort") || "newest"} onChange={(event) => update("sort", event.target.value)} aria-label="Orden">
          <option value="newest">Novedades</option>
          <option value="popular">Popularidad</option>
          <option value="price_asc">Precio menor</option>
          <option value="price_desc">Precio mayor</option>
        </select>
        <Button type="submit">Buscar</Button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <FilterChip label="Destacados" active={params.get("featured") === "1"} onClick={() => update("featured", params.get("featured") === "1" ? "" : "1")} />
        <FilterChip label="Temporada" active={params.get("seasonal") === "1"} onClick={() => update("seasonal", params.get("seasonal") === "1" ? "" : "1")} />
        <FilterChip label="Vegano verificado" active={params.get("vegan") === "1"} onClick={() => update("vegan", params.get("vegan") === "1" ? "" : "1")} />
        <FilterChip label="Sin gluten verificado" active={params.get("gluten_free") === "1"} onClick={() => update("gluten_free", params.get("gluten_free") === "1" ? "" : "1")} />
      </div>
      <div className="mt-8">
        {loading ? <StateMessage title="Cargando" body="Consultando el catálogo." /> : null}
        {error ? <StateMessage title="No se pudo cargar" body={error} /> : null}
        {!loading && !error && flavors.length === 0 ? (
          <StateMessage title="No hay sabores para esta búsqueda" body="El catálogo solo muestra productos publicados por el equipo." />
        ) : null}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {!loading && !error ? flavors.map((flavor) => <FlavorCard key={flavor.id} flavor={flavor} currency={currency} />) : null}
        </div>
        {lastPage > 1 ? (
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Anterior</Button>
            <span className="text-sm text-muted-foreground">{page} / {lastPage}</span>
            <Button variant="outline" disabled={page >= lastPage} onClick={() => setPage((current) => current + 1)}>Siguiente</Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-full border px-3 py-1 ${active ? "border-primary bg-primary text-primary-foreground" : "bg-white"}`}>
      {label}
    </button>
  )
}

export function CollectionsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-6">
      <p className="eyebrow">Colecciones</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Tres maneras de entrar</h1>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Link to="/menu?featured=1" className="rounded-[2rem] bg-accent p-8">
          <h2 className="text-2xl font-semibold">Firma</h2>
          <p className="mt-2 text-sm text-muted-foreground">Los sabores marcados como destacados.</p>
        </Link>
        <Link to="/menu?new=1" className="rounded-[2rem] bg-white p-8 border">
          <h2 className="text-2xl font-semibold">Novedades</h2>
          <p className="mt-2 text-sm text-muted-foreground">Lo que el equipo acaba de publicar.</p>
        </Link>
        <Link to="/menu?seasonal=1" className="rounded-[2rem] bg-[#454545] p-8 text-white">
          <h2 className="text-2xl font-semibold">Temporada</h2>
          <p className="mt-2 text-sm text-white/70">Solo si hay una estación configurada.</p>
        </Link>
      </div>
    </div>
  )
}
