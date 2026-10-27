import { FormField } from "@/components/form-field"
import { Input } from "@/components/ui/input"
import { parseMoney } from "@/lib/money"

export function MoneyField({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
}) {
  return (
    <FormField label={label}>
      <Input
        inputMode="decimal"
        placeholder="12.000"
        aria-label={label}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => {
          const amount = parseMoney(value)
          if (amount === null) return
          onChange(new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(amount))
        }}
      />
      <span className="text-xs leading-4 text-muted-foreground">Pesos. Ejemplo: 12.000</span>
    </FormField>
  )
}
