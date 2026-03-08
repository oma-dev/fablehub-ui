/** Backend URL + app environment are resolved from src/config/appEnvironment.ts. */
import { API_BASE_URL, APP_ENV } from '../config/appEnvironment'

export type RequestConfig = {
  headers?: Record<string, string>
  signal?: AbortSignal
}

export type RequestConfigWithBody = RequestConfig & {
  body?: unknown
}

function getHeaders(token?: string | null, custom?: Record<string, string>): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-App-Env': APP_ENV,
    ...custom,
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

let accessToken: string | null = null

/** Set the auth token (e.g. from Supabase session). Pass null to clear. */
export function setAccessToken(token: string | null) {
  accessToken = token
}

function getToken(): string | null {
  return accessToken
}

async function handleResponse<T>(response: Response): Promise<T> {
  const text = await response.text()
  const data = text ? (JSON.parse(text) as T) : (undefined as T)
  if (!response.ok) {
    const error = new Error(response.statusText) as Error & { status?: number; data?: unknown }
    error.status = response.status
    error.data = data
    throw error
  }
  return data
}

export async function get<T = unknown>(
  path: string,
  config?: RequestConfig & { token?: string | null }
): Promise<T> {
  const token = config?.token ?? getToken()
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'GET',
    headers: getHeaders(token, config?.headers),
    signal: config?.signal,
  })
  return handleResponse<T>(res)
}

export async function post<T = unknown>(
  path: string,
  config?: RequestConfigWithBody & { token?: string | null }
): Promise<T> {
  const token = config?.token ?? getToken()
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: getHeaders(token, config?.headers),
    body: config?.body !== undefined ? JSON.stringify(config.body) : undefined,
    signal: config?.signal,
  })
  return handleResponse<T>(res)
}

export async function put<T = unknown>(
  path: string,
  config?: RequestConfigWithBody & { token?: string | null }
): Promise<T> {
  const token = config?.token ?? getToken()
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'PUT',
    headers: getHeaders(token, config?.headers),
    body: config?.body !== undefined ? JSON.stringify(config.body) : undefined,
    signal: config?.signal,
  })
  return handleResponse<T>(res)
}

export async function patch<T = unknown>(
  path: string,
  config?: RequestConfigWithBody & { token?: string | null }
): Promise<T> {
  const token = config?.token ?? getToken()
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'PATCH',
    headers: getHeaders(token, config?.headers),
    body: config?.body !== undefined ? JSON.stringify(config.body) : undefined,
    signal: config?.signal,
  })
  return handleResponse<T>(res)
}

export async function del<T = unknown>(
  path: string,
  config?: RequestConfig & { token?: string | null }
): Promise<T> {
  const token = config?.token ?? getToken()
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'DELETE',
    headers: getHeaders(token, config?.headers),
    signal: config?.signal,
  })
  return handleResponse<T>(res)
}

export const webclient = {
  get,
  post,
  put,
  patch,
  delete: del,
}

