export type StoreSettings = {
  store_name: string
  tagline: string | null
  currency: string
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  hours: { day: string; opens?: string | null; closes?: string | null; closed?: boolean }[]
  instagram: string | null
  whatsapp: string | null
  pickup_enabled: boolean
  delivery_enabled: boolean
  delivery_fee: string | number | null
  faq: { question: string; answer: string }[]
  policies: string | null
  about: string | null
  mission: string | null
  vision: string | null
  hours_configured: boolean
  location_configured: boolean
}

export type Variant = {
  id: number
  name: string
  sku?: string | null
  price: string
  portions: string
  container: string
  is_active: boolean
  sort_order: number
}

export type Flavor = {
  id: number
  category_id?: number | null
  category?: { id: number; name: string; slug: string; is_demonstration?: boolean } | null
  name: string
  slug: string
  short_description?: string | null
  description?: string | null
  ingredients_text?: string | null
  image_url?: string | null
  is_active: boolean
  is_featured: boolean
  is_new: boolean
  is_seasonal: boolean
  season_label?: string | null
  is_demonstration: boolean
  dietary_vegan: boolean | null
  dietary_gluten_free: boolean | null
  nutrition?: {
    calories_kcal?: number | string | null
    fat_g?: number | string | null
    sugar_g?: number | string | null
    protein_g?: number | string | null
    note?: string | null
  } | null
  portion_unit: string
  available_portions: string
  availability: "in_stock" | "low" | "out"
  purchasable: boolean
  min_price?: string | null
  variants?: Variant[]
  allergens?: { id: number; name: string; slug: string }[]
  warehouse_portions?: string
  case_portions?: string
  low_stock_portions?: string | null
  audits?: { id: number; action: string; changes: Record<string, unknown> | null; user?: string | null; created_at?: string }[]
}

export type Topping = {
  id: number
  name: string
  price: string
  is_active: boolean
}

export type PaymentMethod = {
  id: number
  code: string
  name: string
  description?: string | null
  channels: string[]
  is_active: boolean
  records_as_paid: boolean
}

export type QuoteLine = {
  name: string
  variant_name: string
  quantity: number
  unit_price: string
  line_total: string
  portions: string
}

export type Quote = {
  ready: boolean
  errors: Record<string, string[]>
  currency: string
  items: QuoteLine[]
  subtotal: string
  discount_total: string
  shipping_total: string
  total: string
}

export type CartLine = {
  key: string
  productId: number
  variantId: number
  toppings: { id: number; quantity: number }[]
  quantity: number
  instructions: string
  label?: string
  variantLabel?: string
}

export type ShopOrder = {
  id: number
  number: string
  channel: string
  fulfillment: string
  status: string
  payment_status: string
  customer_name: string
  customer_email?: string
  customer_phone?: string
  address?: Record<string, string | null> | null
  subtotal: string
  discount_total: string
  shipping_total: string
  total: string
  notes?: string | null
  payment_method?: { id: number; code: string; name: string; records_as_paid: boolean } | null
  items?: {
    id: number
    name: string
    variant_name: string
    image_url?: string | null
    quantity: number
    unit_price: string
    line_total: string
    toppings?: { name: string; quantity: number }[]
    special_instructions?: string | null
  }[]
  history?: { from_status: string | null; to_status: string; note?: string | null; user?: string | null; created_at?: string }[]
  allowed_transitions?: string[]
  created_at?: string
}

export type Address = {
  id: number
  label?: string | null
  recipient: string
  line1: string
  line2?: string | null
  city: string
  phone?: string | null
  notes?: string | null
  is_default: boolean
}

export type DashboardData = {
  currency: string
  period: { from: string; to: string }
  sales_today: { total: string; orders: number; average_ticket: string | null }
  sales_month: { total: string; orders: number; average_ticket: string | null }
  period_sales: { total: string; orders: number; average_ticket: string | null }
  pending_orders: number
  top_products: { product_id: number | null; name: string; quantity: number; portions: string; revenue: string }[]
  sales_by_channel: { channel: string; orders: number; total: string }[]
  sales_series: { date: string; total: string; orders: number }[]
  inventory_alerts: { id: number; name: string; stock_quantity: string; min_stock: string; unit?: string | null }[]
  out_of_stock: { id: number; name: string; available_portions: string }[]
  display_cases: {
    id: number
    name: string
    code: string
    status: string
    used_portions: string
    capacity_portions: string | null
    needs_cleaning: boolean
    open_alerts: number
    latest_temperature: { celsius: string; recorded_at: string; source: string } | null
    range_configured: boolean
  }[]
  recent_activity: { type: string; at: string; description: string }[]
  employees: { employee_id: number; name: string; orders: number; total: string }[] | null
}
