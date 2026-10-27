import { useEffect, useState } from "react"
import { Link, Outlet, useLocation } from "react-router-dom"
import { Flame, Flower2, IceCreamCone, Leaf, MapPin, Sparkles, Wheat } from "lucide-react"
import { FlavorCard, StateMessage, StoreFooter, StoreHeader } from "@/features/store/components"
import { getStoreSettings, listFlavors } from "@/features/store/api"
import { getApiMessage } from "@/lib/form-errors"
import { formatMoney } from "@/lib/money"
import type { Flavor, StoreSettings } from "@/types/commerce"

export function StoreLayout() {
  const { hash } = useLocation()

  useEffect(() => {
    if (!hash) return
    document.querySelector(hash)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [hash])

  return (
    <div className="min-h-svh bg-[#fbf7f6] text-[#2b2426]">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2">
        Saltar al contenido
      </a>
      <StoreHeader />
      <main id="contenido">
        <Outlet />
      </main>
      <StoreFooterSlot />
    </div>
  )
}

function StoreFooterSlot() {
  const [settings, setSettings] = useState<StoreSettings | null>(null)
  useEffect(() => {
    getStoreSettings().then(setSettings).catch(() => setSettings(null))
  }, [])
  return <StoreFooter settings={settings} />
}

const promises = [
  { icon: Flame, title: "Recién horneados", body: "Calentitos al momento" },
  { icon: Leaf, title: "Matcha de la casa", body: "Base suave, ficha clara" },
  { icon: Sparkles, title: "Recetas de Seúl", body: "Auténtico ah-boong" },
]

const specialties = [
  {
    icon: Wheat,
    kicker: "El ícono supremo",
    title: "Ah-Boong clásico",
    body: "El cono caliente y crujiente de masa taiyaki, con el relleno que elijas y el soft-serve de la carta.",
    href: "/menu",
    link: "Relleno a tu elección",
  },
  {
    icon: IceCreamCone,
    kicker: "Textura crocante",
    title: "Conos artesanales",
    body: "Barquillo waffle horneado, para quien quiere el contraste entre lo crujiente y la crema fría.",
    href: "/menu?featured=1",
    link: "Barquillo crujiente",
  },
  {
    icon: Sparkles,
    kicker: "Doble sensación",
    title: "Swirl duo bicolor",
    body: "Dos sabores en un solo pedido. Combinas en la ficha lo que esté disponible hoy.",
    href: "/menu",
    link: "Espiral armonioso",
  },
  {
    icon: Flower2,
    kicker: "Tiempo limitado",
    title: "Ediciones de estación",
    body: "La rota de temporada aparece aquí cuando el equipo la publica. Si no hay estación, la carta sigue en el menú.",
    href: "/menu?seasonal=1",
    link: "Rota de la casa",
  },
]

export function HomePage() {
  const [settings, setSettings] = useState<StoreSettings | null>(null)
  const [flavors, setFlavors] = useState<Flavor[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getStoreSettings(),
      listFlavors({ per_page: 6, sort: "popular" }),
    ])
      .then(([nextSettings, menu]) => {
        setSettings(nextSettings)
        const published = menu.data.filter((flavor) => !flavor.is_demonstration)
        setFlavors(published)
      })
      .catch((reason) => setError(getApiMessage(reason)))
      .finally(() => setLoading(false))
  }, [])

  const currency = settings?.currency || "COP"
  const spotlight = flavors[0]
  const spotlightPrice = spotlight?.min_price ?? spotlight?.variants?.[0]?.price

  return (
    <div>
      <section className="bg-[linear-gradient(180deg,#ffe7f1_0%,#fff4f8_58%,#fbf7f6_100%)]">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 md:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white bg-white/80 px-3 py-1 text-xs text-[#8d6d78] shadow-sm">
              <Sparkles className="size-3.5 text-[#ff4d8d]" />
              서울 아이스크림 · 달콤한 순간 · Hongdae & Seongsu Style
            </p>
            <h1 className="mt-6 max-w-xl text-5xl font-extrabold leading-[1.05] tracking-[-0.045em] text-[#1d1719] md:text-6xl">
              Un pedacito de <span className="text-[#e23b78] underline decoration-[#ffb3cc] decoration-4 underline-offset-4">Corea</span> en cada bocado
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-[#6d5c62]">
              Descubre una experiencia única de sabor, dulzura y tradición coreana con nuestros conos de bungeoppang recién horneados y helado artesanal estilo soft-serve.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/menu" className="inline-flex items-center gap-2 rounded-full bg-[#ff4d8d] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(255,77,141,0.28)]">
                Descubre el menú <Sparkles className="size-4" />
              </Link>
              <a href="#sede" className="inline-flex items-center gap-2 rounded-full border border-[#f3d5e0] bg-white px-5 py-3 text-sm font-semibold text-[#3a2c31]">
                <MapPin className="size-4 text-[#ff4d8d]" /> Ver ubicación
              </a>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {promises.map((item) => (
                <div key={item.title} className="rounded-2xl border border-white bg-white/80 p-4 shadow-sm">
                  <item.icon className="size-4 text-[#ff4d8d]" />
                  <p className="mt-3 text-sm font-bold">{item.title}</p>
                  <p className="text-xs text-[#9a8e91]">{item.body}</p>
                </div>
              ))}
            </div>
          </div>

          <Link to={spotlight ? `/menu/${spotlight.slug}` : "/menu"} className="block rounded-[1.8rem] bg-white p-3 shadow-[0_24px_60px_rgba(255,120,160,0.18)]">
            <div className="relative overflow-hidden rounded-[1.3rem]">
              <img src="/brand/hero-taiyaki.jpg" alt="Conos taiyaki de la casa" className="aspect-[4/3] w-full object-cover" />
              <span className="absolute bottom-3 right-3 rounded-full bg-[#ff4d8d] px-3 py-1 text-xs font-semibold text-white">Fresh Taiyaki Cones</span>
            </div>
            <div className="flex items-end justify-between gap-4 px-3 py-4">
              <div>
                <p className="text-xs font-semibold text-[#ff4d8d]">봉</p>
                <p className="text-lg font-bold">{spotlight?.name || "La carta"}</p>
                <p className="text-sm text-[#9a8e91]">{spotlight?.short_description || "El primer sabor publicado aparece aquí."}</p>
              </div>
              <p className="shrink-0 text-sm font-bold text-[#2b2426]">
                {spotlightPrice ? formatMoney(spotlightPrice, currency) : "Ver carta"}
              </p>
            </div>
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="inline-flex rounded-full bg-[#ffe7f1] px-3 py-1 text-[11px] font-bold tracking-[0.14em] text-[#e23b78]">MENU DE ESPECIALIDADES</p>
            <h2 className="mt-4 text-4xl font-extrabold tracking-tight">Nuestros sabores icónicos</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#8d8084]">
              La carta que puedes pedir ahora. Si un sabor no tiene existencia, no se añade al carrito.
            </p>
          </div>
          <span className="rounded-full bg-[#fff0f6] px-3 py-1 text-xs font-semibold text-[#e23b78]">Cono taiyaki de la casa</span>
        </div>
        <div className="mt-8">
          {loading ? <StateMessage title="Cargando la carta" body="Estamos consultando el catálogo." /> : null}
          {error ? <StateMessage title="No pudimos cargar el menú" body={error} /> : null}
          {!loading && !error && flavors.length === 0 ? (
            <StateMessage title="La carta todavía está vacía" body="Cuando el equipo publique sabores, aparecen aquí con su precio y el botón de añadir." />
          ) : null}
          {!loading && !error && flavors.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {flavors.map((flavor) => <FlavorCard key={flavor.id} flavor={flavor} currency={currency} />)}
            </div>
          ) : null}
        </div>
      </section>

      <section id="experiencia" className="scroll-mt-24 bg-[#f7f3f2] py-16">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="inline-flex rounded-full bg-[#ffe7f1] px-3 py-1 text-xs font-semibold text-[#e23b78]">Experiencias de postre</p>
            <h2 className="mt-4 text-4xl font-extrabold tracking-tight">Especialidades de la casa</h2>
            <p className="mt-3 text-sm text-[#8d8084]">Más que un helado: el street food de Seúl, servido con lo que hoy está en carta.</p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {specialties.map((item) => (
              <Link key={item.title} to={item.href} className="rounded-[1.5rem] border border-[#f1e4e8] bg-white p-6 transition hover:-translate-y-0.5">
                <span className="grid size-11 place-items-center rounded-2xl bg-[#fff0f6] text-[#ff4d8d]">
                  <item.icon className="size-5" />
                </span>
                <p className="mt-5 text-sm font-semibold text-[#e23b78]">{item.kicker}</p>
                <h3 className="mt-1 text-xl font-bold tracking-tight">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#8d8084]">{item.body}</p>
                <p className="mt-5 text-sm font-semibold text-[#e23b78]">{item.link} →</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="nosotros" className="scroll-mt-24 mx-auto max-w-6xl px-4 py-16 md:px-6">
        <div className="grid items-center gap-10 rounded-[2rem] bg-white p-4 shadow-[0_20px_50px_rgba(80,40,55,0.04)] md:grid-cols-2 md:p-8">
          <div className="relative">
            <img src="/brand/story-cafe.jpg" alt="Preparación del cono en la casa" className="aspect-[4/3] w-full rounded-[1.4rem] object-cover" />
            <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-white/95 p-4 shadow-sm">
              <p className="text-xs font-bold tracking-[0.14em] text-[#e23b78]">TRADICIÓN DESDE SEÚL</p>
              <p className="mt-1 text-sm text-[#6d5c62]">De los carritos de Myeongdong a una carta que se pide aquí.</p>
            </div>
          </div>
          <div>
            <p className="inline-flex rounded-full bg-[#ffe7f1] px-3 py-1 text-xs font-semibold text-[#e23b78]">Nuestra historia</p>
            <h2 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight">El crujiente secreto del pez dorado que conquistó Seúl</h2>
            <p className="mt-4 text-sm leading-7 text-[#6d5c62]">
              Durante décadas, el <strong>bungeoppang (붕어빵)</strong> ha sido el alma del invierno en Corea: un waffle esponjoso con forma de pez. En la casa lo servimos con el helado que esté publicado hoy, caliente en la base y frío en la cúspide.
            </p>
            <blockquote className="mt-6 rounded-2xl border border-[#f6e3ea] bg-[#fffafb] px-5 py-4 text-sm leading-6 text-[#5c4a50]">
              “Masa crujiente por fuera, suave por dentro, y el helado más sedoso de la carta.”
              <footer className="mt-3 text-sm font-semibold text-[#e23b78]">La casa, sobre el ah-boong</footer>
            </blockquote>
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <article className="rounded-[1.5rem] border border-[#f1e4e8] bg-white p-6">
            <p className="text-xs font-bold tracking-[0.14em] text-[#e23b78]">MISIÓN</p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#5c4a50]">
              {settings?.mission || "La misión todavía no está publicada. Se escribe en la configuración del local."}
            </p>
          </article>
          <article className="rounded-[1.5rem] border border-[#f1e4e8] bg-white p-6">
            <p className="text-xs font-bold tracking-[0.14em] text-[#e23b78]">VISIÓN</p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#5c4a50]">
              {settings?.vision || "La visión todavía no está publicada. Se escribe en la configuración del local."}
            </p>
          </article>
        </div>
      </section>

      <section id="sede" className="scroll-mt-24 mx-auto max-w-6xl px-4 pb-16 md:px-6">
        <div className="rounded-[1.8rem] bg-[#2b2426] px-8 py-12 text-white">
          <p className="text-xs uppercase tracking-[0.16em] text-white/60">La sede</p>
          {settings?.location_configured ? (
            <>
              <h2 className="mt-3 text-4xl font-semibold tracking-tight">{settings.address}</h2>
              <p className="mt-2 text-white/70">{settings.city}</p>
            </>
          ) : (
            <h2 className="mt-3 max-w-xl text-4xl font-semibold tracking-tight">La dirección todavía no está publicada.</h2>
          )}
          <div className="mt-8 grid gap-2 text-sm text-white/80">
            {settings?.hours_configured ? settings.hours.map((hour) => (
              <p key={hour.day}>{hour.day}: {hour.closed ? "cerrado" : `${hour.opens} – ${hour.closes}`}</p>
            )) : <p>Los horarios se publican desde el panel. No hay un horario de muestra.</p>}
          </div>
        </div>
      </section>
    </div>
  )
}
