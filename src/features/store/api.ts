import { api } from "@/lib/api"
import type { ApiResponse } from "@/types/api"
import type {
  Address,
  Flavor,
  PaymentMethod,
  Quote,
  ShopOrder,
  StoreSettings,
  Topping,
} from "@/types/commerce"

export async function getStoreSettings() {
  const { data } = await api.get<ApiResponse<StoreSettings>>("/store/settings")
  return data.data
}

export async function listFlavors(params: Record<string, string | number | undefined>) {
  const { data } = await api.get<ApiResponse<Flavor[]>>("/store/products", { params })
  return data
}

export async function getFlavor(slug: string) {
  const { data } = await api.get<ApiResponse<Flavor>>(`/store/products/${slug}`)
  return data.data
}

export async function listStoreCategories() {
  const { data } = await api.get<ApiResponse<{ id: number; name: string; slug: string }[]>>("/store/categories")
  return data.data
}

export async function listStoreToppings() {
  const { data } = await api.get<ApiResponse<Topping[]>>("/store/toppings")
  return data.data
}

export async function listOnlinePayments() {
  const { data } = await api.get<ApiResponse<PaymentMethod[]>>("/store/payment-methods")
  return data.data
}

export async function quoteOrder(payload: unknown) {
  const { data } = await api.post<ApiResponse<Quote>>("/store/quote", payload)
  return data.data
}

export async function checkoutOrder(payload: unknown, idempotencyKey: string) {
  const { data } = await api.post<ApiResponse<ShopOrder>>("/store/checkout", payload, {
    headers: { "Idempotency-Key": idempotencyKey },
  })
  return data.data
}

export async function getOrder(number: string, email?: string) {
  const { data } = await api.get<ApiResponse<ShopOrder>>(`/store/orders/${number}`, {
    params: email ? { email } : undefined,
  })
  return data.data
}

export async function myOrders(page = 1) {
  const { data } = await api.get<ApiResponse<ShopOrder[]>>("/store/orders", { params: { page, per_page: 6 } })
  return data
}

export async function cancelMyOrder(number: string) {
  const { data } = await api.post<ApiResponse<ShopOrder>>(`/store/orders/${number}/cancel`)
  return data.data
}

export async function myAddresses() {
  const { data } = await api.get<ApiResponse<Address[]>>("/store/addresses")
  return data.data
}

export async function saveAddress(payload: Partial<Address>, id?: number) {
  const response = id
    ? await api.put<ApiResponse<Address>>(`/store/addresses/${id}`, payload)
    : await api.post<ApiResponse<Address>>("/store/addresses", payload)
  return response.data.data
}

export async function deleteAddress(id: number) {
  await api.delete(`/store/addresses/${id}`)
}
