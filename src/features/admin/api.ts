import { api } from "@/lib/api"
import type { ApiResponse } from "@/types/api"
import type { DashboardData, Flavor, PaymentMethod, ShopOrder } from "@/types/commerce"

export async function getDashboard(from?: string, to?: string) {
  const { data } = await api.get<ApiResponse<DashboardData>>("/reports/dashboard", { params: { from, to } })
  return data.data
}

export async function listAdminProducts(search = "", page = 1, perPage = 100) {
  const { data } = await api.get<ApiResponse<Flavor[]>>("/products", { params: { search, page, per_page: perPage } })
  return data
}

export async function saveProduct(payload: unknown, id?: number) {
  const response = id
    ? await api.put<ApiResponse<Flavor>>(`/products/${id}`, payload)
    : await api.post<ApiResponse<Flavor>>("/products", payload)
  return response.data.data
}

export async function removeProduct(id: number) {
  await api.delete(`/products/${id}`)
}

export async function uploadProductImage(id: number, file: File) {
  const body = new FormData()
  body.append("image", file)
  const { data } = await api.post<ApiResponse<Flavor>>(`/products/${id}/image`, body, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return data.data
}

export async function loadExampleFlavors() {
  const { data } = await api.post<ApiResponse<{ created: number; notice: string }>>("/products/examples")
  return data.data
}

export async function listCategories() {
  const { data } = await api.get<ApiResponse<{ id: number; name: string; slug: string; is_active: boolean; is_demonstration: boolean }[]>>("/categories")
  return data.data
}

export async function saveCategory(payload: { name: string; description?: string; is_active?: boolean }, id?: number) {
  const response = id
    ? await api.put(`/categories/${id}`, payload)
    : await api.post("/categories", payload)
  return response.data.data
}

export async function removeCategory(id: number) {
  await api.delete(`/categories/${id}`)
}

export type Topping = { id: number; name: string; price: string; is_active: boolean }

export async function listToppings() {
  const { data } = await api.get<ApiResponse<Topping[]>>("/toppings")
  return data.data
}

export async function saveTopping(payload: { name: string; price: number; is_active?: boolean }, id?: number) {
  const response = id
    ? await api.put<ApiResponse<Topping>>(`/toppings/${id}`, payload)
    : await api.post<ApiResponse<Topping>>("/toppings", payload)
  return response.data.data
}

export async function removeTopping(id: number) {
  await api.delete(`/toppings/${id}`)
}

export async function listOrders(params: Record<string, string>) {
  const { data } = await api.get<ApiResponse<ShopOrder[]>>("/orders", { params })
  return data
}

export async function updateOrderStatus(id: number, status: string) {
  const { data } = await api.post<ApiResponse<ShopOrder>>(`/orders/${id}/status`, { status })
  return data.data
}

export async function markOrderPaid(id: number) {
  const { data } = await api.post<ApiResponse<ShopOrder>>(`/orders/${id}/payment`, { payment_status: "paid" })
  return data.data
}

export async function listCases() {
  const { data } = await api.get<ApiResponse<CaseView[]>>("/display-cases")
  return data.data
}

export type CaseView = {
  id: number
  name: string
  code: string
  location?: string | null
  status: string
  used_portions: string
  capacity_portions?: string | null
  min_threshold_portions?: string | null
  temp_min?: string | null
  temp_max?: string | null
  free_portions?: string | null
  needs_cleaning: boolean
  range_configured: boolean
  is_active?: boolean
  latest_temperature?: { celsius: string; source: string; recorded_at: string } | null
  open_alerts: { id: number; message: string; celsius: string; recorded_at: string }[]
  items: { id: number; product_id: number; product_name?: string; quantity: string; status: string }[]
}

export async function saveCase(payload: unknown, id?: number) {
  const response = id ? await api.put(`/display-cases/${id}`, payload) : await api.post("/display-cases", payload)
  return response.data.data
}

export async function removeCase(id: number) {
  await api.delete(`/display-cases/${id}`)
}

export async function recordTemperature(id: number, celsius: number) {
  const { data } = await api.post(`/display-cases/${id}/temperature`, { celsius })
  return data.data
}

export async function recordCleaning(id: number) {
  await api.post(`/display-cases/${id}/events`, { type: "cleaning" })
}

export async function acknowledgeAlert(id: number) {
  await api.post(`/temperature-alerts/${id}/acknowledge`)
}

export async function transferStock(payload: unknown) {
  await api.post("/inventory/transfers", payload)
}

export async function moveStock(payload: unknown) {
  await api.post("/inventory/movements", payload)
}

export type StockMovementRow = {
  id: number
  item_type: string
  item_id: number
  movement_type: string
  quantity: string
  location: string
  reason?: string | null
  created_at?: string
  user?: { name?: string | null } | null
}

export async function listMovements(page = 1) {
  const { data } = await api.get<ApiResponse<StockMovementRow[]>>("/inventory/movements", { params: { page, per_page: 100 } })
  return data
}

export async function recordWaste(payload: unknown) {
  await api.post("/inventory/waste", payload)
}

export async function listIngredients() {
  const { data } = await api.get<ApiResponse<{
    id: number
    name: string
    unit_id: number
    stock_quantity: string
    min_stock: string
    cost_per_unit: string | null
    is_active: boolean
    unit?: { id: number; code: string; name: string }
  }[]>>("/ingredients")
  return data.data
}

export async function listUnits() {
  const { data } = await api.get<ApiResponse<{ id: number; code: string; name: string }[]>>("/units")
  return data.data
}

export async function saveIngredient(payload: unknown, id?: number) {
  const response = id ? await api.put(`/ingredients/${id}`, payload) : await api.post("/ingredients", payload)
  return response.data.data
}

export async function removeIngredient(id: number) {
  await api.delete(`/ingredients/${id}`)
}

export async function listRecipes() {
  const { data } = await api.get("/recipes")
  return data.data as {
    id: number
    name: string
    product_id: number
    yield_quantity: string
    yield_unit: string
    shelf_life_hours: number | null
    instructions?: string | null
    is_active?: boolean
    product?: { name: string }
    items: { ingredient_id: number; quantity: string; unit: string; ingredient?: { name: string } }[]
  }[]
}

export async function saveRecipe(payload: unknown, id?: number) {
  const response = id ? await api.put(`/recipes/${id}`, payload) : await api.post("/recipes", payload)
  return response.data.data
}

export async function removeRecipe(id: number) {
  const { data } = await api.delete<ApiResponse<{ is_active?: boolean } | null>>(`/recipes/${id}`)
  return data.message
}

export async function produce(recipeId: number, payload: unknown) {
  const { data } = await api.post(`/recipes/${recipeId}/produce`, payload)
  return data.data
}

export async function listSuppliers() {
  const { data } = await api.get<ApiResponse<{
    id: number
    name: string
    contact_name?: string | null
    email?: string | null
    phone?: string | null
    is_active: boolean
  }[]>>("/suppliers")
  return data.data
}

export async function saveSupplier(payload: unknown, id?: number) {
  const response = id ? await api.put(`/suppliers/${id}`, payload) : await api.post("/suppliers", payload)
  return response.data.data
}

export async function removeSupplier(id: number) {
  await api.delete(`/suppliers/${id}`)
}

export async function listPurchases() {
  const { data } = await api.get("/purchase-orders")
  return data.data as {
    id: number
    number: string
    status: string
    supplier?: { name: string }
    items: {
      id: number
      ingredient_id: number
      quantity_ordered: string
      quantity_received: string
      unit_cost?: string
      ingredient?: { name: string }
    }[]
  }[]
}

export async function createPurchase(payload: unknown) {
  const { data } = await api.post("/purchase-orders", payload)
  return data.data
}

export async function orderPurchase(id: number) {
  await api.post(`/purchase-orders/${id}/order`)
}

export async function receivePurchase(id: number, items: unknown) {
  await api.post(`/purchase-orders/${id}/receive`, { items })
}

export type CustomerRow = { id: number; name: string; email: string; phone?: string | null; orders_count: number; spent: string; last_order_at?: string | null }

export async function listCustomers(search = "", page = 1) {
  const { data } = await api.get<ApiResponse<CustomerRow[]>>("/customers", { params: { search, page, per_page: 100 } })
  return data
}

export async function getSalesReport(from?: string, to?: string) {
  const { data } = await api.get("/reports/sales", { params: { from, to } })
  return data.data
}

export async function getInventoryReport() {
  const { data } = await api.get("/reports/inventory")
  return data.data
}

export async function getSettings() {
  const { data } = await api.get("/settings")
  return data.data
}

export async function updateSettings(payload: unknown) {
  const { data } = await api.put("/settings", payload)
  return data.data
}

export async function listAdminPayments() {
  const { data } = await api.get<ApiResponse<PaymentMethod[]>>("/payment-methods")
  return data.data
}

export async function updatePayment(id: number, payload: unknown) {
  const { data } = await api.put<ApiResponse<PaymentMethod>>(`/payment-methods/${id}`, payload)
  return data.data
}

export type Coupon = {
  id: number
  code: string
  type: "percent" | "fixed"
  value: string
  min_subtotal: string | null
  is_active: boolean
  usage_limit: number | null
  used_count?: number
}

export async function listCoupons() {
  const { data } = await api.get<ApiResponse<Coupon[]>>("/coupons")
  return data.data
}

export async function saveCoupon(payload: unknown, id?: number) {
  const response = id
    ? await api.put<ApiResponse<Coupon>>(`/coupons/${id}`, payload)
    : await api.post<ApiResponse<Coupon>>("/coupons", payload)
  return response.data.data
}

export async function currentCash() {
  const { data } = await api.get("/cash-sessions/current")
  return data.data as { id: number; status: string; opening_amount: string; sales_total: string; expected_cash: string; orders: number } | null
}

export async function openCash(opening_amount: number) {
  const { data } = await api.post("/cash-sessions", { opening_amount })
  return data.data
}

export async function closeCash(id: number, closing_amount: number) {
  const { data } = await api.post(`/cash-sessions/${id}/close`, { closing_amount })
  return data.data
}

export async function posPayments() {
  const { data } = await api.get<ApiResponse<PaymentMethod[]>>("/pos/payment-methods")
  return data.data
}

export async function posSale(payload: unknown, key: string) {
  const { data } = await api.post<ApiResponse<ShopOrder>>("/pos/sales", payload, {
    headers: { "Idempotency-Key": key },
  })
  return data.data
}
