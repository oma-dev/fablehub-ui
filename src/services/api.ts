import { get, post } from './webclient'

// --- Types (aligned with backend) ---

export interface AuthMe {
  sub: string
  email?: string
  role?: string
}

export interface IdleRpgFable {
  id: string
  fableId: string
  classes: unknown
  monsters: unknown
  items: unknown
  xpTable: unknown
  settings: unknown
  fable?: Fable
}

export interface Fable {
  id: string
  name: string
  description: string | null
  canon: Record<string, unknown>
  creatorId: string | null
  idleRpg?: IdleRpgFable | null
}

export interface CreateFableBody {
  name: string
  description?: string
  canon?: Record<string, unknown>
}

export interface CreateIdleRpgBody {
  classes?: unknown
  monsters?: unknown
  items?: unknown
  xpTable?: unknown
  settings?: unknown
}

// --- Auth ---

/** GET /auth/me — current user from JWT (auth required). */
export function getMe() {
  return get<AuthMe>('/auth/me')
}

// --- Fables ---

/** POST /fables — create a fable (auth required). */
export function createFable(body: CreateFableBody) {
  return post<Fable>('/fables', { body })
}

/** GET /fables — list all fables (public). */
export function getFables() {
  return get<Fable[]>('/fables')
}

/** GET /fables/:id — get one fable by id (public). */
export function getFable(id: string) {
  return get<Fable>(`/fables/${id}`)
}

// --- Idle RPG ---

/** POST /fables/:fableId/idle-rpg — enable Idle RPG for a fable (auth required). */
export function createIdleRpg(fableId: string, body?: CreateIdleRpgBody) {
  return post<IdleRpgFable>(`/fables/${fableId}/idle-rpg`, { body: body ?? {} })
}

/** GET /fables/:fableId/idle-rpg — get Idle RPG config for a fable (auth required). */
export function getIdleRpgByFableId(fableId: string) {
  return get<IdleRpgFable>(`/fables/${fableId}/idle-rpg`)
}

// --- Grouped exports ---

export const api = {
  auth: {
    getMe,
  },
  fables: {
    create: createFable,
    getAll: getFables,
    getOne: getFable,
  },
  idleRpg: {
    create: createIdleRpg,
    getByFableId: getIdleRpgByFableId,
  },
}
