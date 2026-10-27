import { z } from "zod"
import { requiredString } from "@/lib/schemas"

export const loginSchema = z.object({
  email: requiredString("El correo").email("Ingresa un correo válido"),
  password: z
    .string()
    .min(1, "La contraseña es obligatoria")
    .min(6, "La contraseña debe tener al menos 6 caracteres"),
})

export const profileSchema = z.object({
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
})

export const changePasswordSchema = z
  .object({
    current_password: z
      .string()
      .min(1, "La contraseña actual es obligatoria"),
    password: z
      .string()
      .min(1, "La nueva contraseña es obligatoria")
      .min(8, "La nueva contraseña debe tener al menos 8 caracteres"),
    password_confirmation: z
      .string()
      .min(1, "Confirma la nueva contraseña"),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "Las contraseñas no coinciden",
    path: ["password_confirmation"],
  })

export type LoginValues = z.infer<typeof loginSchema>
export type ProfileValues = z.infer<typeof profileSchema>
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>
