import { get, post, patch, del } from './webclient'

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

/** Optional weapon frame: pops at caster portrait center, fades in, then vanishes after lifetimeMs. */
export interface AnimationWeaponFrame {
  url?: string
  /** Optional sound URL played when this particle starts. */
  soundUrl?: string
  /** Optional sound volume in percent (0-100). Default 100. */
  soundVolumePercent?: number
  /** Optional sound fade-in duration in ms. */
  soundFadeInMs?: number
  /** Optional sound fade-out duration in ms. */
  soundFadeOutMs?: number
  imageSource?: AnimationFrameImageSource
  /** Delay in ms before this frame starts (allows staggering multiple weapon frames). */
  delayMs?: number
  /** Fade-in duration in ms. Default 200. */
  fadeInMs?: number
  /** Total lifetime in ms (post-delay): from appearance to fully gone. Default: fadeInMs + 600. */
  lifetimeMs?: number
  /** Display size in px (width & height). */
  sizePx?: number
  /** Start size in px; animates to endSizePx over fadeInMs. */
  startSizePx?: number
  /** End size in px. */
  endSizePx?: number
  /** Horizontal offset in px from caster portrait center (positive = right). */
  offsetX?: number
  /** Vertical offset in px from caster portrait center (positive = down). */
  offsetY?: number
  /** End horizontal offset in px at the end of this frame's lifetime (positive = right). */
  endOffsetX?: number
  /** End vertical offset in px at the end of this frame's lifetime (positive = down). */
  endOffsetY?: number
  /** Motion acceleration curve. 0 = linear, positive = accelerate, negative = decelerate. */
  acceleration?: number
  /** Rotation at frame start in degrees. */
  rotationStart?: number
  /** Rotation at frame end in degrees. */
  rotationEnd?: number
}

/** Optional projectile frame: flies from caster to target (straight or arc). */
export interface AnimationProjectileFrame {
  url?: string
  /** Optional sound URL played when this particle starts. */
  soundUrl?: string
  /** Optional sound volume in percent (0-100). Default 100. */
  soundVolumePercent?: number
  /** Optional sound fade-in duration in ms. */
  soundFadeInMs?: number
  /** Optional sound fade-out duration in ms. */
  soundFadeOutMs?: number
  imageSource?: AnimationFrameImageSource
  /** Delay in ms before this frame starts (allows staggering multiple projectiles). */
  delayMs?: number
  trajectory: 'straight' | 'arc'
  /** Flight duration in ms. Alias: lifetimeMs. */
  speedMs?: number
  /** Total lifetime of the particle in ms. Equivalent to speedMs; takes precedence if both set. */
  lifetimeMs?: number
  /** Display size in px (width & height). */
  sizePx?: number
  /** Start size in px; animates to endSizePx over flight. */
  startSizePx?: number
  /** End size in px. */
  endSizePx?: number
  /** Horizontal offset in px applied to the start (caster) position. Target stays fixed. */
  offsetX?: number
  /** Vertical offset in px applied to the start (caster) position. Target stays fixed. */
  offsetY?: number
  /** Motion acceleration curve. 0 = linear, positive = accelerate, negative = decelerate. */
  acceleration?: number
  /** Rotation at frame start in degrees. */
  rotationStart?: number
  /** Rotation at frame end in degrees. */
  rotationEnd?: number
}

/** Optional impact frame: pops at target center after projectile vanishes, then fades out. */
export interface AnimationImpactFrame {
  url?: string
  /** Optional sound URL played when this particle starts. */
  soundUrl?: string
  /** Optional sound volume in percent (0-100). Default 100. */
  soundVolumePercent?: number
  /** Optional sound fade-in duration in ms. */
  soundFadeInMs?: number
  /** Optional sound fade-out duration in ms. */
  soundFadeOutMs?: number
  imageSource?: AnimationFrameImageSource
  /** Delay in ms before this frame starts (allows staggering multiple impact frames). */
  delayMs?: number
  /** Hold time before fade-out. Used when lifetimeMs is not set. */
  showMs?: number
  /** Fade-out duration. Used when lifetimeMs is not set. */
  vanishMs?: number
  /** Total lifetime shorthand. Overrides showMs/vanishMs with 15%/85% split when both not explicitly set. */
  lifetimeMs?: number
  /** Display size in px (width & height). */
  sizePx?: number
  /** Start size in px; animates to endSizePx over show+vanish. */
  startSizePx?: number
  /** End size in px. */
  endSizePx?: number
  /** Horizontal offset in px from target portrait center (positive = right). */
  offsetX?: number
  /** Vertical offset in px from target portrait center (positive = down). */
  offsetY?: number
  /** End horizontal offset in px at the end of this frame's lifetime (positive = right). */
  endOffsetX?: number
  /** End vertical offset in px at the end of this frame's lifetime (positive = down). */
  endOffsetY?: number
  /** Motion acceleration curve. 0 = linear, positive = accelerate, negative = decelerate. */
  acceleration?: number
  /** Rotation at frame start in degrees. */
  rotationStart?: number
  /** Rotation at frame end in degrees. */
  rotationEnd?: number
}

/** Optional block frame: pops at defender portrait center when a reactive block triggers. */
export interface AnimationBlockFrame {
  url?: string
  /** Optional sound URL played when this particle starts. */
  soundUrl?: string
  /** Optional sound volume in percent (0-100). Default 100. */
  soundVolumePercent?: number
  /** Optional sound fade-in duration in ms. */
  soundFadeInMs?: number
  /** Optional sound fade-out duration in ms. */
  soundFadeOutMs?: number
  imageSource?: AnimationFrameImageSource
  delayMs?: number
  showMs?: number
  vanishMs?: number
  lifetimeMs?: number
  sizePx?: number
  startSizePx?: number
  endSizePx?: number
  offsetX?: number
  offsetY?: number
  /** Rotation at frame start in degrees. */
  rotationStart?: number
  /** Rotation at frame end in degrees. */
  rotationEnd?: number
}

/** Attack animation as arrays of optional PNG frames per phase. Multiple entries play concurrently. */
export type CardAttackerAnimation = 'none' | 'cast' | 'lunge'
export type CardTargetAnimation = 'none' | 'hit'

export interface CardAnimationConfig {
  attacker?: CardAttackerAnimation
  target?: CardTargetAnimation
  lungeGapPx?: number
  lungeDelayMs?: number
  lungeStartSpeed?: number
  accelerationLunge?: number
  accelerationReturn?: number
}

export interface AnimationFrames {
  weapon?: AnimationWeaponFrame[]
  projectile?: AnimationProjectileFrame[]
  impact?: AnimationImpactFrame[]
  avoid?: AnimationBlockFrame[]
  /** @deprecated Use avoid[] instead. */
  block?: AnimationBlockFrame[]
  card?: CardAnimationConfig
}

/** Status animation particle shown around the holder card center in replay. */
export interface StatusAnimationParticle {
  url?: string
  /** Optional sound URL played when this particle starts. */
  soundUrl?: string
  /** Optional sound volume in percent (0-100). Default 100. */
  soundVolumePercent?: number
  /** Optional sound fade-in duration in ms. */
  soundFadeInMs?: number
  /** Optional sound fade-out duration in ms. */
  soundFadeOutMs?: number
  imageSource?: AnimationFrameImageSource
  delayMs?: number
  lifetimeMs?: number
  sizePx?: number
  startSizePx?: number
  endSizePx?: number
  offsetX?: number
  offsetY?: number
  endOffsetX?: number
  endOffsetY?: number
  acceleration?: number
  rotationStart?: number
  rotationEnd?: number
  /** Loop continuously while status is active on target. */
  loop?: boolean
}

export interface StatusAnimation {
  particles?: StatusAnimationParticle[]
  /** Optional one-shot particles that only fire when transform status is applied. */
  preTransformParticles?: StatusAnimationParticle[]
}

export interface StatusTransformConfig {
  /** Portrait URL used while this transform status is active. */
  portraitUrl: string
  /** Optional accent color reserved for future transform visuals. */
  accentHex?: string
  /** Delay in ms before portrait is swapped after status application. */
  swapPortraitDelayMs?: number
  /** Optional one-shot sound played when transform swap happens. */
  soundUrl?: string
  /** Optional transform sound volume percent (0-100). Defaults to 100 when omitted. */
  soundVolumePercent?: number
  /** Optional transform sound fade-in duration in ms. */
  soundFadeInMs?: number
  /** Optional transform sound fade-out duration in ms. */
  soundFadeOutMs?: number
  /** Ability ids granted while the transform status is active. */
  grantedAbilityIds?: string[]
}

export type ReactiveTriggerTiming = 'on_incoming_cast' | 'on_hit_taken'

/** Reactive ability configuration. */
export interface ReactiveConfig {
  triggerTiming?: ReactiveTriggerTiming
  priority?: number
  maxTriggersPerTurn?: number
  /** @deprecated Legacy block chance support. Prefer avoid effects with kind='avoid'. */
  baseChance?: number
  /** @deprecated Legacy block chance support. Prefer avoid effects with kind='avoid'. */
  scalingTerms?: ScalingTerm[]
  /** @deprecated Legacy block chance support. Prefer avoid effects with kind='avoid'. */
  scalingStat?: StatId
  /** @deprecated Legacy block chance support. Prefer avoid effects with kind='avoid'. */
  scalingCoeff?: number
}

// ---------------------------------------------------------------------------
// Effect system (mirrors backend ability-catalog.types.ts)
// ---------------------------------------------------------------------------

export type MainStatId = string
/** @deprecated Legacy alias. */
export type StatId = MainStatId

export type DerivedStatId =
  | 'max_resource_amount'
  | 'resource_regeneration'
  | 'max_hp'
  | 'hp_regeneration'
  | 'avoid_chance'
  | 'damage_resistance'
  | 'critical_hit_chance'
  | 'critical_hit_damage'
  | 'cooldown_reduction'

export type ScalingSource =
  | { kind: 'main_stat'; statId: MainStatId }
  | { kind: 'derived_stat'; statId: DerivedStatId }
  | { kind: 'equipped_weapon_damage' }
  | { kind: 'equipped_protective_armor' }

export interface ScalingTerm {
  percent: number
  source: ScalingSource
}

export interface DerivedStatModifier {
  statId: DerivedStatId
  flat?: number
  percent?: number
}

export type EffectKind =
  | 'damage'
  | 'heal'
  | 'apply_status'
  | 'avoid'
  | 'execute'
  | 'lifesteal'
  | 'stun'
  | 'anti_heal'
  | 'barrier'
  | 'stat_modifiers'
  | 'derived_stat_modifiers'
  | 'dispel'

export type EffectTarget = 'self' | 'enemy'
export type DispelFilter = 'all' | 'buff' | 'debuff'

export interface Effect {
  kind: EffectKind
  target?: EffectTarget
  amount?: number
  percentage?: number
  durationTurns?: number
  scalingTerms?: ScalingTerm[]
  scalingStat?: StatId
  scalingCoeff?: number
  lifestealPercent?: number
  statusEffectId?: string
  statusEffect?: StatusEffectTemplate
  statModifiers?: Partial<Record<MainStatId, number>>
  derivedStatModifiers?: Partial<Record<DerivedStatId, number>>
  dispelFilter?: DispelFilter
}

export type StatusEffectKind =
  | 'dot' | 'hot' | 'stun' | 'slow' | 'paralyze' | 'freeze'
  | 'sleep' | 'confusion' | 'buff' | 'debuff' | 'blind'
  | 'vulnerability' | 'anti_heal' | 'thorns' | 'barrier'
  | 'evasion' | 'haste' | 'auto_revive'

export type StatusEffectCategory = 'buff' | 'debuff'

export interface StatusEffectTemplate {
  id: string
  name: string
  description?: string
  iconUrl?: string
  category?: StatusEffectCategory
  maxStacks?: number
  effects?: Effect[]
  /** Replay animation for this status effect. */
  animation?: StatusAnimation
  /** Optional transform metadata for this status. Used by replay to swap portrait while active. */
  transform?: StatusTransformConfig
  // Legacy fields kept for compatibility with older packs.
  kind?: StatusEffectKind
  durationTurns?: number
  tickAmount?: number
  tickPercentage?: number
  escalation?: number
  statModifiers?: Partial<Record<string, number>>
  chance?: number
  damageReduction?: number
  healReduction?: number
  reflectPercent?: number
  barrierAmount?: number
}

export interface Resource {
  id: string
  name: string
  description?: string
  colorHex: string
  isGenerative: boolean
  iconId?: string
  iconUrl?: string
  max: number
  regenPerTurn?: number
  gainOnHit?: number
  resetsEachFight?: boolean
}

// ---------------------------------------------------------------------------
// Ability
// ---------------------------------------------------------------------------

/** Ability (matches backend); optional fields allow minimal pack catalog entries from the create form. */
export interface Ability {
  id: string
  name: string
  description?: string
  abilityType: 'primary' | 'regular' | 'passive' | 'ultimate' | 'reactive'
  effects?: Effect[]
  /** @deprecated Use effects[] instead. */
  effect?: unknown
  cooldownTurns: number
  scaling?: unknown
  cost?: { cooldownTurns?: number; resourceCost?: { resourceId: string; amount: number }; usePerFight?: number }
  requirements?: { equippedTagsAny?: string[]; forbiddenTagsAny?: string[]; minLevel?: number }
  presentation?: { name?: string; description?: string; iconUrl?: string; colorHex?: string }
  iconUrl?: string
  /** Optional animation frames (weapon / projectile / impact / block PNGs). */
  animationFrames?: AnimationFrames
  /** Passive/item-like modifiers granted by this ability. */
  derivedStatModifiers?: DerivedStatModifier[]
  /** Ability points required to unlock this ability. */
  unlockCost?: number
  /** When abilityType is 'reactive': controls trigger chance and stat scaling. */
  reactiveConfig?: ReactiveConfig
}

/** Realm pack shape (backend IdleRpgPackV1). */
export interface IdleRpgPackV1 {
  version: 1
  mainStats?: MainStatDefinition[]
  derivedStats?: Partial<Record<DerivedStatId, DerivedStatDefinition>>
  rules: {
    maxLevel: number
    xpTable: Record<string, number>
    combatPresetId: string
    statPointsPerLevel?: number
    abilityPointsPerLevel?: number
    abilitySlotsByLevel?: Record<number, number>
    baseMaxHp?: number
    baseMaxHpPerLevel?: number
    pvp?: {
      attackerCooldownMs?: number
      transferCurrencyId?: string
      transferByLevelGap?: Array<{
        minGap: number
        maxGap?: number
        percentOfLoserBalance?: number
        flatAmount?: number
      }>
    }
    raidSchedule?: {
      startHourUtc: number
      startMinuteUtc?: number
      intervalDays?: number
      anchorDateUtc: string
    }
  }
  economy: {
    currencies: { id: string; name: string; iconUrl?: string }[]
  }
  resources?: Resource[]
  abilities?: Ability[]
  statusEffects?: StatusEffectTemplate[]
  classes: ClassBlock[]
  creatures: CreatureTemplate[]
  items: ItemTemplate[]
  quests: Quest[]
  dungeons?: Dungeon[]
  raids?: Raid[]
  merchant: { listings: MerchantListing[] }
  lootTables: LootTable[]
}

export interface ClassBlock {
  id: string
  name: string
  description?: string
  iconUrl?: string
  /** Optional intro sound played when this class enters combat replay. */
  introSoundUrl?: string
  /** Optional intro sound volume in percent (0-100). Default 100. */
  introSoundVolumePercent?: number
  /** Optional intro sound fade-in duration in ms. */
  introSoundFadeInMs?: number
  /** Optional intro sound fade-out duration in ms. */
  introSoundFadeOutMs?: number
  /** When true, only one character per realm may pick this class. */
  isHeroClass?: boolean
  scaling?: { damageMainStat?: string; secondaryBenefits?: Record<string, string[]> }
  /** ID of the primary attack Ability from pack.abilities (abilityType 'primary'). */
  primaryAttackId: string
  slots: Record<string, { required: boolean; allowEmpty: boolean; allowedTagsAny: string[] }>
  resourceId?: string
  passives?: string[]
  abilities?: { regular?: string[]; ultimate?: string | null }
  /** Abilities auto-assigned on character creation and non-removable from equipped loadout. */
  defaultAbilityIds?: string[]
  starting?: {
    mainStats?: Record<string, number>
    derivedStatModifiers?: DerivedStatModifier[]
    stats?: Record<string, number>
    startingItemIds?: string[]
    startingBalances?: Record<string, number>
  }
}

export interface CreatureTemplate {
  id: string
  name: string
  role: 'quest' | 'boss'
  level: number
  hp?: number
  ap?: number
  arm?: number
  mainStats?: Record<string, number>
  derivedStatModifiers?: DerivedStatModifier[]
  weaponDamage?: number
  protectiveArmor?: number
  iconUrl?: string
  /** Optional intro sound played when this creature enters combat replay. */
  introSoundUrl?: string
  /** Optional intro sound volume in percent (0-100). Default 100. */
  introSoundVolumePercent?: number
  /** Optional intro sound fade-in duration in ms. */
  introSoundFadeInMs?: number
  /** Optional intro sound fade-out duration in ms. */
  introSoundFadeOutMs?: number
  /** Optional combat replay background image URL (typically used by bosses). */
  backgroundImageUrl?: string
  /** Optional looping boss battle music URL used during boss combat replay. */
  bossBattleMusicUrl?: string
  /** Optional boss music volume in percent (0-100). Default 100. */
  bossBattleMusicVolumePercent?: number
  /** Optional boss music fade-in duration in ms. */
  bossBattleMusicFadeInMs?: number
  /** Optional boss music fade-out duration in ms. */
  bossBattleMusicFadeOutMs?: number
  tags?: string[]
  abilityIds?: string[]
  resourceId?: string
  resourceMax?: number
}

/** Backend sends rarity as number: 1=common, 2=uncommon, 3=rare, 4=epic, 5=legendary */
export interface ItemTemplate {
  id: string
  name: string
  rarity: number
  slot: string
  tags: string[]
  mainStatBonuses?: Record<string, number>
  derivedStatModifiers?: DerivedStatModifier[]
  weaponDamage?: number
  protectiveArmor?: number
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
  /** Optional per-item sell value. Missing value is treated as 0 by backend. */
  sellValue?: number
}

export interface MainStatDefinition {
  id: MainStatId
  name: string
  description?: string
}

export interface DerivedStatDefinition {
  base?: number
  perLevel?: number
  scaling?: ScalingTerm[]
  floor?: number
  cap?: number
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

/** Dungeon: boss encounter with level requirement. bossCreatureId references pack.creatures (e.g. role 'boss'). */
export interface Dungeon {
  id: string
  name: string
  description?: string
  imageUrl?: string
  requiredLevel: number
  bossCreatureId: string
}

/** Raid: dungeon-like guild encounter; cost paid from guild stock. */
export interface Raid extends Dungeon {
  requiredCurrencyCost: { currencyId: string; amount: number }
}

/** Dungeon with resolved boss and per-character completion/cooldown (from getDungeons). */
export interface DungeonWithBoss {
  id: string
  name: string
  description?: string
  imageUrl?: string
  requiredLevel: number
  bossCreatureId: string
  boss: CreatureTemplate | null
  completed: boolean
  cooldownUntil?: number
}

/** Raid with resolved boss and guild stock/canAfford (from getRaids). */
export interface RaidWithBoss {
  id: string
  name: string
  description?: string
  imageUrl?: string
  requiredLevel: number
  bossCreatureId: string
  requiredCurrencyCost: { currencyId: string; amount: number }
  boss: CreatureTemplate | null
  guildStock: number
  canAfford: boolean
}

/** Pending raid replay payload (unviewed last raid result for this character). */
export interface RaidReplayPayload {
  combat: CombatResult
  raidId: string
  raidName: string
  bossCreatureId: string
  bossBackgroundImageUrl?: string
  partyOrder: string[]
  victory: boolean
  partyMaxHp?: Record<string, number>
  bossMaxHp?: number
  partyMembers?: { id: string; name: string; level: number; classId: string; portraitUrl?: string | null }[]
  initiatorCharacterId?: string
}

export type MailKind = 'pvp' | 'dungeon' | 'raid'
export type MailAlertKind = 'pvp_defense' | 'raid_finished'

export interface ReplayCombatantSnapshot {
  id: string
  name: string
  level: number
  maxHp: number
  ap: number
  arm: number
  classId?: string
  creatureId?: string
  portraitUrl?: string | null
  weaponItemId?: string | null
}

export interface PvpMailReplayPayload {
  kind: 'pvp'
  combat: CombatResult
  challengerId: string
  targetId: string
  participants: ReplayCombatantSnapshot[]
  settlement?: {
    currencyId: string
    currencyName: string
    amount: number
    winnerId: string
    loserId: string
  }
}

export interface DungeonMailReplayPayload {
  kind: 'dungeon'
  combat: CombatResult
  dungeonId: string
  dungeonName: string
  victory: boolean
  player: ReplayCombatantSnapshot
  boss: ReplayCombatantSnapshot
  bossBackgroundImageUrl?: string
}

export interface RaidMailReplayPayload extends RaidReplayPayload {
  kind: 'raid'
  partyMembers: { id: string; name: string; level: number; classId: string; portraitUrl?: string | null }[]
  initiatorCharacterId: string
}

export type MailReplayPayload = PvpMailReplayPayload | DungeonMailReplayPayload | RaidMailReplayPayload

export interface MailboxMail {
  id: string
  sender: string
  subject: string
  message: string
  kind: MailKind
  alertKind?: MailAlertKind
  hasReplay: boolean
  replayId?: string
  createdAt: string
  readAt?: string
  isRead: boolean
}

export interface MailboxListResponse {
  mails: MailboxMail[]
  unreadCount: number
  nextCursor?: string
}

export interface MailboxReplayResponse {
  mail: MailboxMail
  replay: MailReplayPayload | null
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

export type CombatEventType =
  | 'damage' | 'heal' | 'dot_tick' | 'hot_tick'
  | 'status_applied' | 'status_expired' | 'status_dispelled' | 'stun_skip'
  | 'execute' | 'resource_change' | 'block' | 'avoid'

export interface ActiveStatusEffect {
  id: string
  templateId: string
  sourceAbilityId: string
  name: string
  description?: string
  iconUrl?: string
  category: StatusEffectCategory
  stacks: number
  maxStacks: number
  remainingTurns: number
}

export interface CombatTurnEvent {
  sourceId: string
  targetId: string
  type: CombatEventType
  value: number
  targetHpAfter: number
  castId?: string
  abilityId?: string
  abilityName?: string
  statusEffectId?: string
  statusTemplateId?: string
  resourceAfter?: { current: number; max: number }
  statusEffectName?: string
  avoided?: boolean
  avoidAbilityId?: string
  avoidAnimationFrames?: AnimationFrames
  /** @deprecated Legacy block compatibility. */
  blocked?: boolean
  /** @deprecated Legacy block compatibility. */
  blockAbilityId?: string
  /** @deprecated Legacy block compatibility. */
  blockAnimationFrames?: AnimationFrames
  /** Present on damage events when the hit crits. */
  isCritical?: boolean
}

export interface CombatTurn {
  turnIndex: number
  events: CombatTurnEvent[]
  activeStatusEffects?: Record<string, ActiveStatusEffect[]>
  resources?: Record<string, { current: number; max: number }>
}

export interface CombatResult {
  turns: CombatTurn[]
  winnerId: string | null
  finalHp: Record<string, number>
  timeout?: boolean
  pvpSettlement?: {
    currencyId: string
    currencyName: string
    amount: number
    winnerId: string
    loserId: string
  }
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
  /** Progression: completed dungeons, boss cooldowns, and PvP attack cooldown. */
  progression?: { completedDungeonIds?: string[]; dungeonBossCooldowns?: Record<string, number>; pvpAttackCooldownUntil?: number }
  /** Ability IDs unlocked with ability points. */
  unlockedAbilityIds?: string[]
  /** Ability IDs equipped in slots (ordered; index = slot). */
  equippedAbilityIds?: string[]
  /** Unspent ability points. */
  abilityPoints?: number
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

export function getDungeons(fableId: string, realmId: string, characterId: string) {
  return get<{ dungeons: DungeonWithBoss[] }>(`${charBase(fableId, realmId)}/${characterId}/dungeons`)
}

export interface DungeonFightResult {
  character: CharacterState
  combat: CombatResult
  victory: boolean
  droppedItem?: ItemTemplate
}

export function fightDungeonBoss(fableId: string, realmId: string, characterId: string, dungeonId: string) {
  return post<DungeonFightResult>(
    `${charBase(fableId, realmId)}/${characterId}/dungeons/${encodeURIComponent(dungeonId)}/fight`,
  )
}

export function getRaids(fableId: string, realmId: string, characterId: string) {
  return get<{ raids: RaidWithBoss[]; pendingReplay?: RaidReplayPayload }>(
    `${charBase(fableId, realmId)}/${characterId}/raids`,
  )
}

export function getMailbox(
  fableId: string,
  realmId: string,
  characterId: string,
  options?: { limit?: number; cursor?: string },
) {
  const query = new URLSearchParams()
  if (options?.limit != null) query.set('limit', String(options.limit))
  if (options?.cursor) query.set('cursor', options.cursor)
  const suffix = query.toString() ? `?${query.toString()}` : ''
  return get<MailboxListResponse>(`${charBase(fableId, realmId)}/${characterId}/mailbox${suffix}`)
}

export function getMailboxReplay(
  fableId: string,
  realmId: string,
  characterId: string,
  mailId: string,
) {
  return get<MailboxReplayResponse>(
    `${charBase(fableId, realmId)}/${characterId}/mailbox/${encodeURIComponent(mailId)}/replay`,
  )
}

export function markMailboxMailRead(
  fableId: string,
  realmId: string,
  characterId: string,
  mailId: string,
) {
  return post<{ ok: boolean }>(
    `${charBase(fableId, realmId)}/${characterId}/mailbox/${encodeURIComponent(mailId)}/read`,
  )
}

export function deleteMailboxMail(
  fableId: string,
  realmId: string,
  characterId: string,
  mailId: string,
) {
  return del<{ ok: boolean }>(
    `${charBase(fableId, realmId)}/${characterId}/mailbox/${encodeURIComponent(mailId)}`,
  )
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

export function sellItem(
  fableId: string,
  realmId: string,
  characterId: string,
  itemId: string,
  quantity = 1,
) {
  return post<CharacterState>(`${charBase(fableId, realmId)}/${characterId}/inventory/sell`, {
    body: { itemId, quantity },
  })
}

export function equipItem(fableId: string, realmId: string, characterId: string, slot: string, itemId?: string) {
  return patch<CharacterState>(`${charBase(fableId, realmId)}/${characterId}/equipment`, { body: { slot, itemId } })
}

export function allocateStat(fableId: string, realmId: string, characterId: string, stat: string, amount = 1) {
  return post<CharacterState>(`${charBase(fableId, realmId)}/${characterId}/stats/allocate`, { body: { stat, amount } })
}

export function unlockAbility(fableId: string, realmId: string, characterId: string, abilityId: string) {
  return post<CharacterState>(`${charBase(fableId, realmId)}/${characterId}/abilities/unlock`, { body: { abilityId } })
}

export function equipAbilities(fableId: string, realmId: string, characterId: string, abilityIds: string[]) {
  return post<CharacterState>(`${charBase(fableId, realmId)}/${characterId}/abilities/equip`, { body: { abilityIds } })
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
  /** Character portrait; use class icon as fallback when not set. */
  portraitUrl?: string | null
}

export interface IdleRpgGroup {
  id: string
  realmId: string
  label: string
  name: string
  memberIds: string[]
  leaderId?: string | null
  memberRanks?: Record<string, number>
  stockBalances?: Record<string, number>
  memberDonations?: Record<string, Record<string, number>>
  currentRaidCall?: { raidId: string; preparedAt: number; readyCharacterIds: string[] } | null
  /** Last raid combat result (for replay history). Present when the guild has completed at least one raid. */
  lastRaidCombatResult?: RaidReplayPayload | null
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

export function donateToGuild(
  fableId: string,
  realmId: string,
  groupId: string,
  body: { characterId: string; currencyId: string; amount: number },
) {
  return post<IdleRpgGroup>(`${groupsBase(fableId, realmId)}/${groupId}/donate`, { body })
}

export interface RaidCallResponse {
  raidId: string
  preparedAt: number
  readyCharacterIds: string[]
  raid: Raid | null
  boss: CreatureTemplate | null
  nextScheduledStartAt: number
  raidSchedule?: {
    startHourUtc: number
    startMinuteUtc: number
    intervalDays: number
    anchorDateUtc: string
  }
}

export function getRaidCall(fableId: string, realmId: string, groupId: string) {
  return get<RaidCallResponse | null>(`${groupsBase(fableId, realmId)}/${groupId}/raid-call`)
}

export function prepareRaidCall(
  fableId: string,
  realmId: string,
  groupId: string,
  body: { raidId: string; characterId: string },
) {
  return post<RaidCallResponse>(`${groupsBase(fableId, realmId)}/${groupId}/raid-call/prepare`, { body })
}

export function setRaidReady(
  fableId: string,
  realmId: string,
  groupId: string,
  body: { characterId: string },
) {
  return post<RaidCallResponse>(`${groupsBase(fableId, realmId)}/${groupId}/raid-call/ready`, { body })
}

export interface StartRaidResult {
  combat: CombatResult
  victory: boolean
  partyOrder: string[]
}

export function startRaid(
  fableId: string,
  realmId: string,
  groupId: string,
  body: { characterId: string },
) {
  return post<StartRaidResult>(`${groupsBase(fableId, realmId)}/${groupId}/raid-call/start`, { body })
}

export function markRaidReplayViewed(
  fableId: string,
  realmId: string,
  groupId: string,
  body: { characterId: string },
) {
  return post<{ ok: boolean }>(`${groupsBase(fableId, realmId)}/${groupId}/raid-call/mark-viewed`, { body })
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
    sellItem,
    equipItem,
    allocateStat,
    getGroups,
    getGroup,
    createGroup,
    joinGroup,
    getGroupMessages,
    sendGroupMessage,
    donateToGuild,
    getRaidCall,
    prepareRaidCall,
    setRaidReady,
    startRaid,
    markRaidReplayViewed,
    getMailbox,
    getMailboxReplay,
    markMailboxMailRead,
    deleteMailboxMail,
  },
  getRaids,
}
