import { Link, NavLink, useLocation } from "react-router-dom"
import { IceCreamCone, Menu, Plus, UserRound } from "lucide-react"
import { useState, type MouseEvent } from "react"
import { toast } from "sonner"
import { useAuth } from "@/features/auth"
import { resolveMediaUrl } from "@/lib/media"
import { formatMoney } from "@/lib/money"
import { useCart } from "@/features/store/cart"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import type { Flavor } from "@/types/commerce"

const links = [
  { to: "/", label: "Inicio", end: true },
  { to: "/menu", label: "Menú" },
  { to: "/#nosotros", label: "Nosotros" },
  { to: "/#experiencia", label: "Experiencia" },
  { to: "/contacto", label: "Contacto" },
]

export function Mark({ className = "size-9" }: { className?: string }) {
  return (
    <span className={`grid place-items-center rounded-full bg-[#ffe3ee] ${className}`} aria-hidden="true">
      <IceCreamCone className="size-4 text-[#ff4d8d]" />
    </span>
  )
}

export function StoreHeader() {
  const { count } = useCart()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  return (
    <header className="sticky top-0 z-40 border-b border-white/70 bg-white/85 backdrop-blur-md">
      <div className="mx-auto grid h-[4.5rem] max-w-6xl grid-cols-[auto_1fr_auto] items-center gap-3 px-4 md:px-6">
        <div className="flex items-center gap-2">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menú">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetHeader>
                <SheetTitle>Seoul Ice Cream</SheetTitle>
              </SheetHeader>
              <nav className="mt-6 grid gap-1">
                {links.map((link) => (
                  <Link key={link.to} to={link.to} onClick={() => setOpen(false)} className="rounded-2xl px-3 py-3 text-sm hover:bg-[#fff0f5]">
                    {link.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
          <Link to="/" className="flex items-center gap-2">
            <Mark />
            <span className="leading-tight">
              <span className="block text-sm font-bold tracking-tight text-[#2b2426]">Seoul Ice Cream</span>
              <span className="hidden text-[11px] text-[#9a8e91] sm:block">서울 아이스크림 · Korean Dessert Cafe</span>
            </span>
          </Link>
        </div>

        <nav className="hidden justify-self-center rounded-full bg-[#fff7fa] p-1 shadow-[0_8px_24px_rgba(255,111,159,0.12)] lg:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={() => {
                const active = link.to === "/" ? pathname === "/" : link.to.startsWith("/#") ? false : pathname.startsWith(link.to)
                return `rounded-full px-4 py-2 text-sm ${active ? "bg-[#ff4d8d] font-semibold text-white" : "text-[#6d6266] hover:text-[#2b2426]"}`
              }}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center justify-end gap-2">
          <Link
            to="/cart"
            className="inline-flex items-center gap-2 rounded-full bg-[#ff4d8d] px-3 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(255,77,141,0.28)] sm:px-4"
          >
            <IceCreamCone className="size-4" />
            <span className="hidden sm:inline">Pide tu helado</span>
            {count > 0 ? <span className="grid size-5 place-items-center rounded-full bg-white text-[10px] text-[#ff4d8d]">{count}</span> : null}
          </Link>
          <Link
            to={user ? "/account" : "/login"}
            aria-label={user ? "Mi cuenta" : "Entrar"}
            className="grid size-10 place-items-center rounded-full border border-[#f3d5e0] bg-white text-[#6d6266]"
          >
            <UserRound className="size-4" />
          </Link>
        </div>
      </div>
    </header>
  )
}

export function StoreFooter({ settings }: { settings?: { phone?: string | null; email?: string | null; instagram?: string | null; policies?: string | null } | null }) {
  return (
    <footer className="mt-8 border-t border-[#f3e6ea] bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3 md:px-6">
        <div>
          <div className="flex items-center gap-2 font-semibold">
            <Mark className="size-8" /> Seoul Ice Cream
          </div>
          <p className="mt-3 max-w-xs text-sm text-[#9a8e91]">
            Heladería coreana contemporánea. Lo que se puede pedir sale de la carta publicada.
          </p>
        </div>
        <div className="text-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#c4a8b2]">Visita</p>
          <div className="mt-3 grid gap-2">
            <Link to="/#sede" className="hover:text-[#ff4d8d]">Ubicación</Link>
            <Link to="/menu" className="hover:text-[#ff4d8d]">Menú de sabores</Link>
            <Link to="/contacto" className="hover:text-[#ff4d8d]">Contacto y preguntas</Link>
            {settings?.policies ? <Link to="/contacto#politicas" className="hover:text-[#ff4d8d]">Políticas</Link> : null}
          </div>
        </div>
        <div className="text-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#c4a8b2]">Contacto</p>
          <div className="mt-3 grid gap-1 text-[#9a8e91]">
            <span>{settings?.phone || "Teléfono sin configurar"}</span>
            <span>{settings?.email || "Correo sin configurar"}</span>
            <span>{settings?.instagram ? `@${settings.instagram.replace("@", "")}` : "Redes sin configurar"}</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export function FlavorCard({ flavor, currency }: { flavor: Flavor; currency: string }) {
  const cart = useCart()
  const price = flavor.min_price ?? flavor.variants?.[0]?.price
  const variant = flavor.variants?.find((item) => item.is_active) ?? flavor.variants?.[0]
  const image = resolveMediaUrl(flavor.image_url)
  const badge = flavor.is_demonstration
    ? "Referencia"
    : flavor.is_featured
      ? "Top Flavor"
      : flavor.is_seasonal
        ? "Temporada"
        : flavor.is_new
          ? "Nuevo"
          : flavor.availability === "out"
            ? "Agotado"
            : null

  function add(event: MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    if (!variant || !flavor.purchasable) return
    cart.add({
      productId: flavor.id,
      variantId: variant.id,
      toppings: [],
      quantity: 1,
      instructions: "",
      label: flavor.name,
      variantLabel: variant.name,
    })
    toast.success(`${flavor.name} está en el carrito`)
  }

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[1.6rem] border border-[#f3e4e8] bg-white p-3 shadow-[0_16px_40px_rgba(80,40,55,0.05)]">
      <Link to={`/menu/${flavor.slug}`} className="relative block overflow-hidden rounded-[1.2rem] bg-[#fff0f5]">
        {image ? (
          <img src={image} alt="" className="aspect-[4/3] w-full object-cover" />
        ) : (
          <div className="flex aspect-[4/3] items-end bg-[linear-gradient(160deg,#ffe3ee,#fff6ea)] p-5">
            <span className="text-2xl font-semibold tracking-tight text-[#5c4048]">{flavor.name}</span>
          </div>
        )}
        {badge ? (
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-[#e23b78] shadow-sm">
            {badge}
          </span>
        ) : null}
      </Link>
      <div className="flex flex-1 flex-col px-2 pb-2 pt-4">
        <div className="flex items-start justify-between gap-3">
          <Link to={`/menu/${flavor.slug}`} className="text-lg font-bold tracking-tight text-[#241c1e]">{flavor.name}</Link>
          <span className="shrink-0 text-sm font-bold text-[#ff4d8d]">{price ? formatMoney(price, currency) : "Sin precio"}</span>
        </div>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#8d8084]">{flavor.short_description || flavor.description || "Sin descripción publicada."}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-xs text-[#b09aa2]">{flavor.availability === "out" ? "Agotado por ahora" : flavor.category?.name || "De la carta"}</span>
          {flavor.purchasable && variant ? (
            <button type="button" onClick={add} className="inline-flex items-center gap-1 rounded-full bg-[#fff0f6] px-3 py-1.5 text-sm font-semibold text-[#ff4d8d]">
              <Plus className="size-3.5" /> Añadir
            </button>
          ) : (
            <Link to={`/menu/${flavor.slug}`} className="text-sm font-semibold text-[#ff4d8d]">Ver ficha</Link>
          )}
        </div>
      </div>
    </article>
  )
}

export function StateMessage({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[1.6rem] border border-dashed border-[#f0d5df] bg-white px-6 py-16 text-center">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-[#9a8e91]">{body}</p>
    </div>
  )
}
