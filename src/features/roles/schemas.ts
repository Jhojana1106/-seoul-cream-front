import { z } from "zod"
import { requiredString } from "@/lib/schemas"

export const roleSchema = z.object({
  name: requiredString("El nombre del rol")
    .max(125, "Máximo 125 caracteres")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Usa slug en minúsculas (ej: jefe-turno)"
    ),
  permissions: z.array(z.string()).min(1, "Selecciona al menos un permiso"),
})

export type RoleValues = z.infer<typeof roleSchema>
