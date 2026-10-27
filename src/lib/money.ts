export function formatMoney(value: string | number | null | undefined, currency = "COP") {
  if (value === null || value === undefined || value === "") return "—"
  const amount = Number(value)
  if (Number.isNaN(amount)) return "—"
  const hasCents = Math.abs(amount % 1) > 0.001
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "COP" && !hasCents ? 0 : 2,
  }).format(amount)
}

/** Acepta 12000, 12.000, $12.000 y 12.000,50. El punto agrupa miles; la coma es decimal. */
export function parseMoney(value: string | number | null | undefined): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (value == null) return null
  const raw = value.trim().replace(/\$/g, "").replace(/cop/gi, "").replace(/\s/g, "")
  if (!raw) return null
  let normalized = raw
  if (raw.includes(",") && raw.includes(".")) {
    normalized = raw.replace(/\./g, "").replace(",", ".")
  } else if (raw.includes(",")) {
    normalized = raw.replace(",", ".")
  } else if (/^\d{1,3}(\.\d{3})+$/.test(raw)) {
    normalized = raw.replace(/\./g, "")
  }
  const amount = Number(normalized)
  return Number.isFinite(amount) ? amount : null
}

export function formatPortions(value: string | number | null | undefined, unit = "porciones") {
  if (value === null || value === undefined || value === "") return "—"
  const amount = Number(value)
  if (Number.isNaN(amount)) return "—"
  return `${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 }).format(amount)} ${unit}`
}
