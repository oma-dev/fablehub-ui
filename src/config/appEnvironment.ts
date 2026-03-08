export type AppEnvironment = 'dev' | 'prod'

function normalizeAppEnvironment(value: string | undefined): AppEnvironment | null {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  if (normalized === 'prod' || normalized === 'production') return 'prod'
  if (normalized === 'dev' || normalized === 'development') return 'dev'
  return null
}

export const APP_ENV: AppEnvironment =
  normalizeAppEnvironment(import.meta.env.VITE_APP_ENV)
  ?? (import.meta.env.PROD ? 'prod' : 'dev')

export const API_BASE_URL =
  import.meta.env.VITE_API_URL
  ?? 'http://localhost:3000'
