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
  coverImageUrl?: string | null
  canon: Record<string, unknown>
  creatorId: string | null
  /** Idle RPG realms for this fable (backend returns idleRealms). */
  idleRealms?: IdleRpgRealm[]
  /** @deprecated Use idleRealms; kept for compatibility. */
  idleRpg?: IdleRpgFable | null
}

export interface CreateFableBody {
  name: string
  description?: string
  coverImageUrl?: string
  canon?: Record<string, unknown>
}

/** One Idle RPG realm (mode instance) for a fable. */
export interface IdleRpgRealm {
  id: string
  fableId: string
  status: string
  visibility: string
  joinCode: string | null
  playerCap: number
  pack: IdleRpgPackV1
  createdAt: string
  updatedAt: string
}

/** Ability (matches backend); optional fields allow minimal pack catalog entries from the create form. */
export interface Ability {
  id: string
  name: string
  description?: string
  abilityType: 'primary' | 'regular' | 'passive' | 'ultimate'
  effect?: unknown
  delivery?: unknown
  scaling?: unknown
  cost?: unknown
  requirements?: unknown
  presentation?: unknown
  /** When abilityType is 'primary': defines the class primary attack. */
  primaryAttack?: { delivery: string; styleId: string }
  iconUrl?: string
}

/** Realm pack shape (backend IdleRpgPackV1). */
export interface IdleRpgPackV1 {
  version: 1
  rules: {
    maxLevel: number
    xpTable: Record<string, number>
    combatPresetId: string
  }
  economy: {
    currencies: { id: string; name: string; iconUrl?: string }[]
  }
  /** Optional catalog of abilities; classes reference by id for primary attack and abilities.regular / ultimate. */
  abilities?: Ability[]
  classes: ClassBlock[]
  creatures: CreatureTemplate[]
  items: ItemTemplate[]
  quests: Quest[]
  merchant: { listings: MerchantListing[] }
  lootTables: LootTable[]
}

export interface ClassBlock {
  id: string
  name: string
  description?: string
  iconUrl?: string
  scaling: { damageMainStat: string; secondaryBenefits?: Record<string, string[]> }
  primaryAttack: { delivery: string; styleId: string }
  slots: Record<string, { required: boolean; allowEmpty: boolean; allowedTagsAny: string[] }>
  passives?: string[]
  abilities?: { regular?: string[]; ultimate?: string | null }
  starting?: { stats?: Record<string, number>; startingItemIds?: string[]; startingBalances?: Record<string, number> }
}

export interface CreatureTemplate {
  id: string
  name: string
  role: 'quest' | 'boss'
  level: number
  hp: number
  ap: number
  arm: number
  iconUrl?: string
  tags?: string[]
}

export interface ItemTemplate {
  id: string
  name: string
  rarity: string
  slot: string
  tags: string[]
  stats: Record<string, number>
  iconUrl?: string
  price?: { currencyId: string; amount: number }
}

export interface Quest {
  id: string
  name: string
  creatureId: string
  durationSec: number
  iconUrl?: string
  rewards: { xp: number; currency: Record<string, number>; lootTableId?: string }
}

export interface MerchantListing {
  itemId: string
  currencyId: string
  price: number
}

export interface LootTableEntry {
  itemId: string
  weight: number
  conditions?: { classId?: string }
}

export interface LootTable {
  id: string
  entries: LootTableEntry[]
}

export interface CreateIdleRpgBody {
  visibility?: 'private' | 'public'
  joinCode?: string
  playerCap?: number
  pack: IdleRpgPackV1
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

/** POST /fables/:fableId/idle-rpg — create an Idle RPG realm (auth required). */
export function createIdleRpgRealm(fableId: string, body: CreateIdleRpgBody) {
  return post<IdleRpgRealm>(`/fables/${fableId}/idle-rpg`, { body })
}

/** GET /fables/:fableId/idle-rpg — list realms for a fable. */
export function getIdleRpgRealms(fableId: string) {
  return get<IdleRpgRealm[]>(`/fables/${fableId}/idle-rpg`)
}

/** GET /fables/:fableId/idle-rpg/:realmId — get one realm. */
export function getIdleRpgRealm(fableId: string, realmId: string) {
  return get<IdleRpgRealm>(`/fables/${fableId}/idle-rpg/${realmId}`)
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
    createRealm: createIdleRpgRealm,
    getRealms: getIdleRpgRealms,
    getRealm: getIdleRpgRealm,
  },
}
