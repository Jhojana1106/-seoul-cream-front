import type { FieldValues, Path, UseFormSetError } from "react-hook-form"

type ApiError = {
  response?: {
    data?: {
      message?: string
      errors?: Record<string, string[]>
    }
  }
}

export function applyApiErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fallbackMessage = "Revisa los datos del formulario"
) {
  const apiError = error as ApiError
  const fieldErrors = apiError.response?.data?.errors

  if (fieldErrors) {
    Object.entries(fieldErrors).forEach(([field, messages]) => {
      setError(field as Path<T>, {
        type: "server",
        message: messages[0] || fallbackMessage,
      })
    })
    return apiError.response?.data?.message || fallbackMessage
  }

  return apiError.response?.data?.message || fallbackMessage
}

export function getApiMessage(error: unknown, fallback = "No se pudo completar la operación") {
  const apiError = error as ApiError & { message?: string }
  if (!apiError.response) {
    return "No hay conexión con el servidor."
  }
  const errors = apiError.response.data?.errors
  if (errors) {
    const first = Object.values(errors)[0]?.[0]
    if (first) return first
  }
  return apiError.response.data?.message || fallback
}
