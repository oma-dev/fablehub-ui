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

/** Source for frame image: custom URL or resolve from equipped weapon at runtime. */
export type AnimationFrameImageSource = 'url' | 'weaponIcon' | 'weaponAnimation' | 'weaponProjectile' | 'weaponImpact'

/** Optional weapon frame: pops at caster portrait center, fades in, stays until animation end. */
export interface AnimationWeaponFrame {
  /** When imageSource is 'url', use this; otherwise resolved from attacker's weapon. */
  url?: string
  imageSource?: AnimationFrameImageSource
  fadeInMs?: number
  /** Display size in px (width & height). */
  sizePx?: number
  /** Start size in px; animates to endSizePx over fadeInMs. */
  startSizePx?: number
  /** End size in px. */
  endSizePx?: number
}

/** Optional projectile frame: flies from caster to target (straight or arc). */
export interface AnimationProjectileFrame {
  url?: string
  imageSource?: AnimationFrameImageSource
  trajectory: 'straight' | 'arc'
  speedMs?: number
  /** Display size in px (width & height). */
  sizePx?: number
  /** Start size in px; animates to endSizePx over flight. */
  startSizePx?: number
  /** End size in px. */
  endSizePx?: number
}

/** Optional impact frame: pops at target center after projectile vanishes, then fades out. */
export interface AnimationImpactFrame {
  url?: string
  imageSource?: AnimationFrameImageSource
  showMs?: number
  vanishMs?: number
  /** Display size in px (width & height). */
  sizePx?: number
  /** Start size in px; animates to endSizePx over show+vanish. */
  startSizePx?: number
  /** End size in px. */
  endSizePx?: number
}

/** Attack animation as three optional PNG frames: weapon (caster), projectile, impact (target). */
export interface AnimationFrames {
  weapon?: AnimationWeaponFrame
  projectile?: AnimationProjectileFrame
  impact?: AnimationImpactFrame
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
  /** Optional animation frames (weapon / projectile / impact PNGs). */
  animationFrames?: AnimationFrames
}

/** Realm pack shape (backend IdleRpgPackV1). */
export interface IdleRpgPackV1 {
  version: 1
  rules: {
    maxLevel: number
    xpTable: Record<string, number>
    combatPresetId: string
    /** Stat points awarded per level gained. Defaults to 3. */
    statPointsPerLevel?: number
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

/** Backend sends rarity as number: 1=common, 2=uncommon, 3=rare, 4=epic, 5=legendary */
export interface ItemTemplate {
  id: string
  name: string
  rarity: number
  slot: string
  tags: string[]
  stats: Record<string, number>
  /** Icon for inventory, shop, item slot. */
  iconUrl?: string
  /** Animation image (weapon tip up for projectile); used when ability frame uses weapon animation. */
  animationUrl?: string
  /** Optional custom projectile image URL for this weapon. */
  projectileUrl?: string
  /** Optional custom impact image URL for this weapon. */
  impactUrl?: string
  price?: { currencyId: string; amount: number }
}

export const RARITY_NAMES: Record<number, string> = {
  1: 'common',
  2: 'uncommon',
  3: 'rare',
  4: 'epic',
  5: 'legendary',
}

export const RARITY_NAME_TO_NUMBER: Record<string, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 5,
}

/** Rarity number (1–5) to display color */
export const RARITY_COLORS: Record<number, string> = {
  1: '#9e9bab',
  2: '#22c55e',
  3: '#818cf8',
  4: '#a78bfa',
  5: '#fbbf24',
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
  /** Idle RPG group/guild (when in one). */
  groupId?: string | null
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

export function getRealmRoster(fableId: string, realmId: string) {
  return get<RealmRosterEntry[]>(`${charBase(fableId, realmId)}/realm-roster`)
}

export interface RealmRosterEntry {
  id: string
  name: string
  classId: string
  level: number
  portraitUrl?: string | null
  userId?: string | null
  groupId?: string | null
}

export function getRealmCharacterPlayState(
  fableId: string,
  realmId: string,
  viewerCharacterId: string,
  targetCharacterId: string,
) {
  return get<PlayStateResponse>(
    `${charBase(fableId, realmId)}/${targetCharacterId}/realm-profile?viewerCharacterId=${encodeURIComponent(viewerCharacterId)}`,
  )
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

export function getGuildMemberPlayState(
  fableId: string,
  realmId: string,
  viewerCharacterId: string,
  targetCharacterId: string,
) {
  return get<PlayStateResponse>(
    `${charBase(fableId, realmId)}/${targetCharacterId}/guild-profile?viewerCharacterId=${encodeURIComponent(viewerCharacterId)}`,
  )
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

export function pvpFight(fableId: string, realmId: string, characterId: string, targetCharacterId: string) {
  return post<CombatResult>(`${charBase(fableId, realmId)}/${characterId}/pvp/fight`, {
    body: { targetCharacterId },
  })
}

export interface PvpHistoryEntry {
  id: string
  challengerId: string
  challengerName: string
  challengerLevel: number
  challengerClassId: string
  targetId: string
  targetName: string
  targetLevel: number
  targetClassId: string
  winnerId: string | null
  createdAt: string
}

export function getPvpHistory(fableId: string, realmId: string, characterId: string, limit = 30) {
  return get<PvpHistoryEntry[]>(
    `${charBase(fableId, realmId)}/${characterId}/pvp/history?limit=${limit}`,
  )
}

// --- Idle RPG Groups (guilds) ---

function groupsBase(fableId: string, realmId: string) {
  return `/fables/${fableId}/idle-rpg/${realmId}/groups`
}

export interface IdleRpgGroupMember {
  id: string
  name: string
  level: number
  classId: string
}

export interface IdleRpgGroup {
  id: string
  realmId: string
  label: string
  name: string
  memberIds: string[]
  leaderId?: string | null
  memberRanks?: Record<string, number>
  createdAt: string
  members: IdleRpgGroupMember[]
}

export function getGroups(fableId: string, realmId: string) {
  return get<IdleRpgGroup[]>(groupsBase(fableId, realmId))
}

export function getGroup(fableId: string, realmId: string, groupId: string) {
  return get<IdleRpgGroup>(`${groupsBase(fableId, realmId)}/${groupId}`)
}

export interface GuildChampion {
  characterId: string
  name: string
  wins: number
}

export function getGuildChampion(fableId: string, realmId: string, groupId: string) {
  return get<GuildChampion | null>(`${groupsBase(fableId, realmId)}/${groupId}/champion`)
}

export function createGroup(
  fableId: string,
  realmId: string,
  body: { label: string; name: string; creatorCharacterId?: string },
) {
  return post<IdleRpgGroup>(groupsBase(fableId, realmId), { body })
}

export function joinGroup(fableId: string, realmId: string, groupId: string, characterId: string) {
  return post<IdleRpgGroup>(`${groupsBase(fableId, realmId)}/${groupId}/join`, {
    body: { characterId },
  })
}

export interface GroupMessage {
  id: string
  groupId: string
  characterId: string | null
  content: string
  createdAt: string
  character: { id: string; name: string } | null
}

export function getGroupMessages(fableId: string, realmId: string, groupId: string) {
  return get<GroupMessage[]>(`${groupsBase(fableId, realmId)}/${groupId}/messages`)
}

export function sendGroupMessage(
  fableId: string,
  realmId: string,
  groupId: string,
  body: { characterId: string; content: string },
) {
  return post<GroupMessage>(`${groupsBase(fableId, realmId)}/${groupId}/messages`, { body })
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
    getGroups,
    getGroup,
    createGroup,
    joinGroup,
    getGroupMessages,
    sendGroupMessage,
  },
}
