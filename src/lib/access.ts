import type { User } from "@/types/api"

export function isStaff(user: Pick<User, "permissions"> | null | undefined) {
  return (user?.permissions?.length ?? 0) > 0
}

export function firstStaffPath(permissions: string[] = []) {
  const match = adminNavigation
    .flatMap((group) => group.items)
    .find((item) => permissions.includes(item.permission))
  return match?.url ?? "/account"
}

export const adminNavigation: { label: string; items: { title: string; url: string; permission: string }[] }[] = [
  {
    label: "Operación",
    items: [
      { title: "Tablero", url: "/admin", permission: "dashboard.view" },
      { title: "Pedidos", url: "/admin/orders", permission: "orders.view" },
      { title: "Punto de venta", url: "/admin/pos", permission: "pos.access" },
    ],
  },
  {
    label: "Carta",
    items: [
      { title: "Productos y sabores", url: "/admin/products", permission: "products.view" },
      { title: "Categorías", url: "/admin/categories", permission: "categories.view" },
      { title: "Extras", url: "/admin/toppings", permission: "toppings.view" },
    ],
  },
  {
    label: "Producción",
    items: [
      { title: "Vitrinas", url: "/admin/cases", permission: "display-cases.view" },
      { title: "Inventario", url: "/admin/inventory", permission: "inventory.view" },
      { title: "Ingredientes", url: "/admin/ingredients", permission: "ingredients.view" },
      { title: "Recetas", url: "/admin/recipes", permission: "recipes.view" },
      { title: "Producción", url: "/admin/production", permission: "production.view" },
    ],
  },
  {
    label: "Abastecimiento",
    items: [
      { title: "Compras", url: "/admin/purchases", permission: "purchases.view" },
      { title: "Proveedores", url: "/admin/suppliers", permission: "suppliers.view" },
    ],
  },
  {
    label: "Personas",
    items: [
      { title: "Clientes", url: "/admin/customers", permission: "customers.view" },
      { title: "Usuarios", url: "/admin/users", permission: "users.view" },
      { title: "Roles", url: "/admin/roles", permission: "roles.view" },
      { title: "Permisos", url: "/admin/permissions", permission: "permissions.view" },
    ],
  },
  {
    label: "Sistema",
    items: [
      { title: "Reportes", url: "/admin/reports", permission: "reports.view" },
      { title: "Cupones", url: "/admin/coupons", permission: "coupons.view" },
      { title: "Configuración", url: "/admin/settings", permission: "settings.view" },
    ],
  },
]
