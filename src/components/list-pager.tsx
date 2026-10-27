import { Fragment, useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"

export function pageOf<T>(items: T[], page: number, size: number) {
  const total = items.length
  const lastPage = Math.max(1, Math.ceil(total / size) || 1)
  const current = Math.min(Math.max(1, page), lastPage)
  const start = (current - 1) * size
  return { items: items.slice(start, start + size), page: current, lastPage, total }
}

export function ListPager({
  page,
  lastPage,
  total,
  onPage,
}: {
  page: number
  lastPage: number
  total?: number
  onPage: (page: number) => void
}) {
  if (lastPage <= 1) return null
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
      <p className="text-sm text-muted-foreground">
        {total != null ? `${total} en total · ` : ""}Página {page} de {lastPage}
      </p>
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>Anterior</Button>
        <Button type="button" size="sm" variant="outline" disabled={page >= lastPage} onClick={() => onPage(page + 1)}>Siguiente</Button>
      </div>
    </div>
  )
}

export function PagedStack<T>({
  items,
  size = 6,
  className = "grid gap-3",
  empty,
  getKey,
  render,
}: {
  items: T[]
  size?: number
  className?: string
  empty?: ReactNode
  getKey: (item: T) => string | number
  render: (item: T) => ReactNode
}) {
  const [page, setPage] = useState(1)
  const view = pageOf(items, page, size)
  return (
    <div className={className}>
      {view.total === 0 ? empty : null}
      {view.items.map((item) => (
        <Fragment key={getKey(item)}>{render(item)}</Fragment>
      ))}
      {view.lastPage > 1 ? (
        <div className={className.includes("grid-cols") ? "col-span-full" : undefined}>
          <ListPager page={view.page} lastPage={view.lastPage} total={view.total} onPage={setPage} />
        </div>
      ) : null}
    </div>
  )
}
