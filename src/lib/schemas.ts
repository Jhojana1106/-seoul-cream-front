import { z } from "zod"

export const requiredString = (label: string) =>
  z.string().trim().min(1, `${label} es obligatorio`)
