import { useEffect, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"
import { listPermissions } from "@/features/permissions/api"
import type { Permission } from "@/types/api"
import { DataTable, SortableHeader } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function PermissionsPage() {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [moduleFilter, setModuleFilter] = useState("all")

  useEffect(() => {
    listPermissions()
      .then((res) => setPermissions(res.data))
      .catch(() => toast.error("No se pudo cargar el catálogo"))
      .finally(() => setLoading(false))
  }, [])

  const modules = useMemo(
    () =>
      Array.from(new Set(permissions.map((item) => item.module))).sort(
        (a, b) => a.localeCompare(b)
      ),
    [permissions]
  )

  const filteredData = useMemo(() => {
    if (moduleFilter === "all") return permissions
    return permissions.filter((item) => item.module === moduleFilter)
  }, [permissions, moduleFilter])

  const columns = useMemo<ColumnDef<Permission>[]>(
    () => [
      {
        accessorKey: "module",
        header: ({ column }) => (
          <SortableHeader
            label="Módulo"
            sorted={column.getIsSorted()}
            onSort={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        ),
        cell: ({ row }) => (
          <Badge variant="outline" className="capitalize">
            {row.original.module}
          </Badge>
        ),
      },
      {
        accessorKey: "label",
        header: ({ column }) => (
          <SortableHeader
            label="Permiso"
            sorted={column.getIsSorted()}
            onSort={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        ),
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.label}</p>
            <p className="text-xs text-muted-foreground">{row.original.name}</p>
          </div>
        ),
        filterFn: (row, _id, value: string) => {
          const query = value.toLowerCase()
          return (
            row.original.label.toLowerCase().includes(query) ||
            row.original.name.toLowerCase().includes(query) ||
            row.original.module.toLowerCase().includes(query)
          )
        },
      },
      {
        accessorKey: "name",
        header: ({ column }) => (
          <SortableHeader
            label="Clave"
            sorted={column.getIsSorted()}
            onSort={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        ),
        cell: ({ row }) => (
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
            {row.original.name}
          </code>
        ),
      },
      {
        accessorKey: "guard_name",
        header: "Guard",
        cell: ({ row }) => row.original.guard_name,
      },
    ],
    []
  )

  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Catálogo de permisos</CardTitle>
          <CardDescription>
            Filtra, ordena y pagina el inventario completo de permisos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredData}
            loading={loading}
            searchPlaceholder="Filtrar por módulo, etiqueta o clave…"
            emptyMessage="No hay permisos para mostrar"
            toolbar={
              <Select value={moduleFilter} onValueChange={setModuleFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Módulo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los módulos</SelectItem>
                  {modules.map((module) => (
                    <SelectItem key={module} value={module}>
                      {module}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          />
        </CardContent>
      </Card>
    </div>
  )
}
