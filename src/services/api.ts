import { get, post, patch } from './webclient'

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

// --- Combat types (from backend combat.types.ts) ---

export interface CombatTurnEvent {
  sourceId: string
  targetId: string
  type: 'damage' | 'heal'
  value: number
  targetHpAfter: number
}

export interface CombatTurn {
  turnIndex: number
  events: CombatTurnEvent[]
}

export interface CombatResult {
  turns: CombatTurn[]
  winnerId: string | null
  finalHp: Record<string, number>
  timeout?: boolean
}

// --- Character state (simplified from backend RealmCharacter) ---

export interface QuestProgress {
  questId: string
  startedAt: number
  completesAt: number
  status: 'active' | 'completed' | 'claimed'
  role?: 'quest' | 'boss'
}

export interface CharacterQuestState {
  activeQuest?: QuestProgress
  completed: { questId: string; completedAt: number }[]
  cooldowns?: Record<string, number>
}

export interface CharacterState {
  id: string
  name: string
  portraitUrl?: string
  classId: string
  level: number
  xp: number
  hp: number
  ap: number
  arm: number
  balances: Record<string, number>
  inventory: { itemId: string; qty: number }[]
  equipment: Record<string, string | undefined>
  questState: CharacterQuestState
  stats: Record<string, number>
  /** Unspent stat points from leveling up. */
  statPoints: number
  /** Player-allocated stat bonuses: { STR: 2, DEX: 1, ... } */
  allocatedStats: Record<string, number>
  /** Per-character shop (listings refresh every 24h). */
  merchant?: { listings: MerchantListing[]; lastUpdatedAt: number }
}

export interface QuestClaimResult {
  character: CharacterState
  combat: CombatResult
  victory: boolean
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

/** POST /fables/:fableId/idle-rpg/:realmId — update an Idle RPG realm (auth required). */
export function updateIdleRpgRealm(fableId: string, realmId: string, body: CreateIdleRpgBody) {
  return post<IdleRpgRealm>(`/fables/${fableId}/idle-rpg/${realmId}`, { body })
}

// --- Idle RPG Characters (play endpoints) ---

function charBase(fableId: string, realmId: string) {
  return `/fables/${fableId}/idle-rpg/${realmId}/characters`
}

export function getMyCharacters(fableId: string, realmId: string) {
  return get<CharacterState[]>(charBase(fableId, realmId))
}

export function createCharacter(fableId: string, realmId: string, body: { name: string; classId: string; portraitUrl?: string }) {
  return post<CharacterState>(charBase(fableId, realmId), { body })
}

export interface PlayStateResponse {
  character: CharacterState
  pack: IdleRpgPackV1
  className?: string
}

export function getPlayState(fableId: string, realmId: string, characterId: string) {
  return get<PlayStateResponse>(`${charBase(fableId, realmId)}/${characterId}/play-state`)
}

export function startQuest(fableId: string, realmId: string, characterId: string, questId: string) {
  return post<CharacterState>(`${charBase(fableId, realmId)}/${characterId}/quests/start`, { body: { questId } })
}

export function claimQuest(fableId: string, realmId: string, characterId: string) {
  return post<QuestClaimResult>(`${charBase(fableId, realmId)}/${characterId}/quests/claim`)
}

export function buyItem(fableId: string, realmId: string, characterId: string, itemId: string) {
  return post<CharacterState>(`${charBase(fableId, realmId)}/${characterId}/merchant/buy`, { body: { itemId } })
}

export function equipItem(fableId: string, realmId: string, characterId: string, slot: string, itemId?: string) {
  return patch<CharacterState>(`${charBase(fableId, realmId)}/${characterId}/equipment`, { body: { slot, itemId } })
}

export function allocateStat(fableId: string, realmId: string, characterId: string, stat: string, amount = 1) {
  return post<CharacterState>(`${charBase(fableId, realmId)}/${characterId}/stats/allocate`, { body: { stat, amount } })
}

// --- Grouped exports ---

export const api = {
  auth: { getMe },
  fables: { create: createFable, getAll: getFables, getOne: getFable },
  idleRpg: {
    createRealm: createIdleRpgRealm,
    updateRealm: updateIdleRpgRealm,
    getRealms: getIdleRpgRealms,
    getRealm: getIdleRpgRealm,
    getMyCharacters,
    createCharacter,
    getPlayState,
    startQuest,
    claimQuest,
    buyItem,
    equipItem,
    allocateStat,
  },
}
