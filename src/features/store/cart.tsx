import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { CartLine } from "@/types/commerce"

const KEY = "seoul-cream-cart"

type CartContextValue = {
  lines: CartLine[]
  count: number
  add: (line: Omit<CartLine, "key">) => void
  update: (key: string, quantity: number) => void
  remove: (key: string) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

function sameLine(a: Omit<CartLine, "key" | "quantity">, b: CartLine) {
  return (
    a.productId === b.productId &&
    a.variantId === b.variantId &&
    a.instructions === b.instructions &&
    JSON.stringify(a.toppings) === JSON.stringify(b.toppings)
  )
}

function readCart(): CartLine[] {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) as CartLine[] : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(readCart)

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(lines))
  }, [lines])

  const add = useCallback((line: Omit<CartLine, "key">) => {
    setLines((current) => {
      const existing = current.find((item) => sameLine(line, item))
      if (existing) {
        return current.map((item) =>
          item.key === existing.key
            ? { ...item, quantity: Math.min(50, item.quantity + line.quantity) }
            : item
        )
      }
      return [...current, { ...line, key: crypto.randomUUID() }]
    })
  }, [])

  const update = useCallback((key: string, quantity: number) => {
    setLines((current) =>
      current
        .map((item) => (item.key === key ? { ...item, quantity } : item))
        .filter((item) => item.quantity > 0)
    )
  }, [])

  const remove = useCallback((key: string) => {
    setLines((current) => current.filter((item) => item.key !== key))
  }, [])

  const clear = useCallback(() => setLines([]), [])

  const value = useMemo(
    () => ({
      lines,
      count: lines.reduce((sum, line) => sum + line.quantity, 0),
      add,
      update,
      remove,
      clear,
    }),
    [lines, add, update, remove, clear]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error("useCart debe usarse dentro de CartProvider")
  return context
}

export function toCheckoutItems(lines: CartLine[]) {
  return lines.map((line) => ({
    product_id: line.productId,
    variant_id: line.variantId,
    quantity: line.quantity,
    toppings: line.toppings,
    special_instructions: line.instructions || null,
  }))
}
