import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { ColumnDef } from "@tanstack/react-table"
import { Loader2, Plus } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/features/auth/auth-context"
import { listRoles } from "@/features/roles/api"
import { createUser, deleteUser, listUsers, updateUser } from "@/features/users/api"
import { createUserSchema, type CreateUserValues } from "@/features/users/schemas"
import { applyApiErrors } from "@/lib/form-errors"
import type { Role, User } from "@/types/api"
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"

const defaultValues: CreateUserValues = {
  name: "",
  email: "",
  phone: "",
  document_number: "",
  password: "",
  password_confirmation: "",
  is_active: true,
  roles: [],
}

export function UsersPage() {
  const { hasPermission } = useAuth()
  const canCreate = hasPermission("users.create")
  const canUpdate = hasPermission("users.update")
  const canDelete = hasPermission("users.delete")

  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)

  const form = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues,
    mode: "onTouched",
  })

  async function refresh() {
    setLoading(true)
    try {
      const res = await listUsers()
      setUsers(res.data)
    } catch {
      toast.error("No se pudieron cargar los usuarios")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  useEffect(() => {
    if (!open) return
    listRoles()
      .then((res) => setRoles(res.data))
      .catch(() => toast.error("No se pudieron cargar los roles"))
  }, [open])

  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <SortableHeader
            label="Usuario"
            sorted={column.getIsSorted()}
            onSort={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        ),
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">{row.original.email}</p>
          </div>
        ),
        filterFn: (row, _id, value: string) => {
          const query = value.toLowerCase()
          return (
            row.original.name.toLowerCase().includes(query) ||
            row.original.email.toLowerCase().includes(query) ||
            (row.original.document_number || "").toLowerCase().includes(query) ||
            (row.original.roles || []).some((role) =>
              role.name.toLowerCase().includes(query)
            )
          )
        },
      },
      {
        accessorKey: "document_number",
        header: ({ column }) => (
          <SortableHeader
            label="Documento"
            sorted={column.getIsSorted()}
            onSort={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        ),
        cell: ({ row }) => row.original.document_number || "—",
      },
      {
        id: "roles",
        accessorFn: (row) =>
          row.roles?.map((role) => role.name).join(", ") || "",
        header: "Roles",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.roles?.length
              ? row.original.roles.map((role) => (
                  <Badge key={role.id} variant="secondary">
                    {role.name}
                  </Badge>
                ))
              : "—"}
          </div>
        ),
      },
      {
        accessorKey: "is_active",
        header: ({ column }) => (
          <SortableHeader
            label="Estado"
            sorted={column.getIsSorted()}
            onSort={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        ),
        cell: ({ row }) => (
          <Badge variant={row.original.is_active ? "secondary" : "outline"}>
            {row.original.is_active ? "Activo" : "Inactivo"}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "Acciones",
        cell: ({ row }) => (
          <div className="flex gap-2">
            {canUpdate ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const person = row.original
                  setEditing(person)
                  form.reset({
                    name: person.name,
                    email: person.email,
                    phone: person.phone || "",
                    document_number: person.document_number || "",
                    password: "",
                    password_confirmation: "",
                    is_active: person.is_active,
                    roles: person.roles?.map((role) => role.name) || [],
                  })
                  setOpen(true)
                }}
              >
                Editar
              </Button>
            ) : null}
            {canDelete ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  if (!window.confirm(`¿Eliminar a ${row.original.name}?`)) return
                  try {
                    await deleteUser(row.original.id)
                    toast.success("Usuario eliminado")
                    await refresh()
                  } catch {
                    toast.error("No se pudo eliminar. Si es la cuenta con la que entraste, usa otra cuenta de administrador.")
                  }
                }}
              >
                Eliminar
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [canDelete, canUpdate, form]
  )

  async function onSubmit(values: CreateUserValues) {
    if (!editing && values.password.length < 8) {
      form.setError("password", { message: "La contraseña es obligatoria" })
      return
    }
    try {
      if (editing) {
        await updateUser(editing.id, {
          name: values.name,
          email: values.email,
          phone: values.phone || null,
          document_number: values.document_number || null,
          is_active: values.is_active,
          roles: values.roles,
          ...(values.password
            ? { password: values.password, password_confirmation: values.password_confirmation }
            : {}),
        })
        toast.success("Usuario actualizado")
      } else {
        await createUser({
          name: values.name,
          email: values.email,
          phone: values.phone || undefined,
          document_number: values.document_number || undefined,
          password: values.password,
          password_confirmation: values.password_confirmation,
          is_active: values.is_active,
          roles: values.roles,
        })
        toast.success("Usuario creado")
      }
      setOpen(false)
      setEditing(null)
      form.reset(defaultValues)
      await refresh()
    } catch (error) {
      const message = applyApiErrors(
        error,
        form.setError,
        editing ? "No se pudo actualizar el usuario" : "No se pudo crear el usuario"
      )
      toast.error(message)
    }
  }

  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Directorio de usuarios</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={users}
            loading={loading}
            searchPlaceholder="Filtrar por nombre, correo, documento o rol…"
            emptyMessage="No hay usuarios para mostrar"
            toolbar={
              canCreate ? (
                <Button
                  onClick={() => {
                    setEditing(null)
                    form.reset(defaultValues)
                    setOpen(true)
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Nuevo usuario
                </Button>
              ) : null
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar usuario" : "Crear usuario"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Deja la contraseña vacía si no quieres cambiarla."
                : "Completa los campos. La contraseña es obligatoria al crear."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              className="grid gap-4"
              onSubmit={form.handleSubmit(onSubmit)}
              noValidate
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="document_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Documento</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{editing ? "Nueva contraseña" : "Contraseña"}</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password_confirmation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmar</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                      <div>
                        <FormLabel>Usuario activo</FormLabel>
                        <p className="text-xs text-muted-foreground">
                          Puede iniciar sesión en el sistema
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="roles"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Roles</FormLabel>
                    <ScrollArea className="h-36 rounded-lg border p-3">
                      <div className="space-y-2">
                        {roles.map((role) => {
                          const checked = field.value.includes(role.name)
                          return (
                            <label
                              key={role.id}
                              className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 hover:bg-muted/50"
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(value) => {
                                  const next = value
                                    ? [...field.value, role.name]
                                    : field.value.filter(
                                        (item) => item !== role.name
                                      )
                                  field.onChange(next)
                                }}
                              />
                              <span className="text-sm">{role.name}</span>
                            </label>
                          )
                        })}
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
                  {editing ? "Guardar" : "Crear"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
