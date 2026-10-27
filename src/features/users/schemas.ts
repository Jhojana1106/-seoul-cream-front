import { z } from "zod"
import { requiredString } from "@/lib/schemas"

export const createUserSchema = z
  .object({
    name: requiredString("El nombre").max(255, "Máximo 255 caracteres"),
    email: requiredString("El correo").email("Ingresa un correo válido"),
    phone: z
      .string()
      .trim()
      .max(30, "Máximo 30 caracteres")
      .regex(/^[0-9+\-\s()]*$/, "Solo números y símbolos telefónicos")
      .optional()
      .or(z.literal("")),
    document_number: z
      .string()
      .trim()
      .max(50, "Máximo 50 caracteres")
      .optional()
      .or(z.literal("")),
    password: z.string(),
    password_confirmation: z.string(),
    is_active: z.boolean(),
    roles: z.array(z.string()),
  })
  .superRefine((data, ctx) => {
    if (!data.password && !data.password_confirmation) return
    if (data.password.length < 8) {
      ctx.addIssue({ code: "custom", message: "La contraseña debe tener al menos 8 caracteres", path: ["password"] })
    }
    if (data.password !== data.password_confirmation) {
      ctx.addIssue({ code: "custom", message: "Las contraseñas no coinciden", path: ["password_confirmation"] })
    }
  })

export type CreateUserValues = z.infer<typeof createUserSchema>
