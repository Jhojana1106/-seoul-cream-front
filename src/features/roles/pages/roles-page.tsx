import { useCallback, useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { ColumnDef } from "@tanstack/react-table"
import { Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { getPermissionsCatalog } from "@/features/permissions/api"
import {
  createRole,
  deleteRole,
  listRoles,
  updateRole,
} from "@/features/roles/api"
import { roleSchema, type RoleValues } from "@/features/roles/schemas"
import { applyApiErrors } from "@/lib/form-errors"
import type { Permission, Role } from "@/types/api"
import { DataTable, SortableHeader } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"

const defaultValues: RoleValues = {
  name: "",
  permissions: [],
}

export function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [catalog, setCatalog] = useState<Record<string, Permission[]>>({})
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Role | null>(null)

  const form = useForm<RoleValues>({
    resolver: zodResolver(roleSchema),
    defaultValues,
    mode: "onTouched",
  })

  async function refresh() {
    setLoading(true)
    try {
      const [rolesRes, catalogRes] = await Promise.all([
        listRoles(),
        getPermissionsCatalog(),
      ])
      setRoles(rolesRes.data)
      setCatalog(catalogRes)
    } catch {
      toast.error("No se pudo cargar roles/permisos")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const modules = useMemo(() => Object.keys(catalog).sort(), [catalog])

  function openCreate() {
    setEditing(null)
    form.reset(defaultValues)
    setOpen(true)
  }

  const openEdit = useCallback(
    (role: Role) => {
      setEditing(role)
      form.reset({
        name: role.name,
        permissions: role.permissions?.map((p) => p.name) ?? [],
      })
      setOpen(true)
    },
    [form]
  )

  async function onSave(values: RoleValues) {
    try {
      if (editing) {
        await updateRole(editing.id, values)
        toast.success("Rol actualizado")
      } else {
        await createRole(values)
        toast.success("Rol creado")
      }
      setOpen(false)
      form.reset(defaultValues)
      await refresh()
    } catch (error) {
      const message = applyApiErrors(
        error,
        form.setError,
        "No se pudo guardar el rol"
      )
      toast.error(message)
    }
  }

  const onDelete = useCallback(async (role: Role) => {
    if (role.is_protected) {
      toast.error("Este rol del sistema está protegido")
      return
    }
    if (!confirm(`¿Eliminar el rol "${role.name}"?`)) return

    try {
      await deleteRole(role.id)
      toast.success("Rol eliminado")
      await refresh()
    } catch {
      toast.error("No se pudo eliminar el rol")
    }
  }, [])

  const columns = useMemo<ColumnDef<Role>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <SortableHeader
            label="Rol"
            sorted={column.getIsSorted()}
            onSort={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="font-medium">{row.original.name}</span>
            {row.original.is_protected ? (
              <Badge variant="outline">Protegido</Badge>
            ) : null}
          </div>
        ),
        filterFn: (row, _id, value: string) => {
          const query = value.toLowerCase()
          return (
            row.original.name.toLowerCase().includes(query) ||
            (row.original.permissions || []).some(
              (permission) =>
                permission.name.toLowerCase().includes(query) ||
                permission.label.toLowerCase().includes(query)
            )
          )
        },
      },
      {
        id: "permissions_count",
        accessorFn: (row) => row.permissions?.length ?? 0,
        header: ({ column }) => (
          <SortableHeader
            label="Permisos"
            sorted={column.getIsSorted()}
            onSort={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        ),
        cell: ({ row }) => (
          <Badge variant="secondary">
            {row.original.permissions?.length ?? 0} permisos
          </Badge>
        ),
      },
      {
        accessorKey: "users_count",
        header: ({ column }) => (
          <SortableHeader
            label="Usuarios"
            sorted={column.getIsSorted()}
            onSort={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        ),
        cell: ({ row }) => row.original.users_count ?? 0,
      },
      {
        id: "actions",
        header: () => <div className="text-right">Acciones</div>,
        cell: ({ row }) => (
          <div className="space-x-2 text-right">
            <Button
              size="sm"
              variant="outline"
              disabled={row.original.is_protected}
              onClick={() => openEdit(row.original)}
            >
              Editar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={row.original.is_protected}
              onClick={() => void onDelete(row.original)}
            >
              Eliminar
            </Button>
          </div>
        ),
        enableSorting: false,
      },
    ],
    [openEdit, onDelete]
  )

  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Roles del sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={roles}
            loading={loading}
            searchPlaceholder="Filtrar por rol o permiso…"
            emptyMessage="No hay roles para mostrar"
            toolbar={
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Nuevo rol
              </Button>
            }
          />
        </CardContent>
      </Card>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) {
            setEditing(null)
            form.reset(defaultValues)
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar rol" : "Crear rol"}
            </DialogTitle>
            <DialogDescription>
              El nombre debe ser un slug y debes elegir al menos un permiso.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit(onSave)}
              noValidate
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre (slug)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="ej: jefe-turno"
                        disabled={Boolean(editing?.is_protected)}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Solo minúsculas, números y guiones.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="permissions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Permisos</FormLabel>
                    <ScrollArea className="h-72 rounded-lg border border-border p-4">
                      <div className="space-y-5">
                        {modules.map((module) => (
                          <div key={module}>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              {module}
                            </p>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {catalog[module]?.map((permission) => {
                                const checked = field.value.includes(
                                  permission.name
                                )
                                return (
                                  <label
                                    key={permission.id}
                                    className="flex cursor-pointer items-start gap-2 rounded-md border border-transparent px-2 py-1.5 hover:border-border hover:bg-muted/40"
                                  >
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(value) => {
                                        const next = value
                                          ? [...field.value, permission.name]
                                          : field.value.filter(
                                              (item) => item !== permission.name
                                            )
                                        field.onChange(next)
                                      }}
                                      className="mt-0.5"
                                    />
                                    <span>
                                      <span className="block text-sm font-medium">
                                        {permission.label}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {permission.name}
                                      </span>
                                    </span>
                                  </label>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? (
                    <Loader2 className="animate-spin" />
                  ) : null}
                  Guardar
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
