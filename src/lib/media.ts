/**
 * Convierte avatar_url absoluto del API a ruta usable vía proxy de Vite en local.
 */
export function resolveMediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined

  try {
    const parsed = new URL(url)
    if (parsed.pathname.startsWith("/storage/")) {
      return parsed.pathname
    }
  } catch {
    // relative path
  }

  return url
}
