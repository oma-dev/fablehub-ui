import type {
  Ability,
  CharacterState,
  DerivedStatDefinition,
  DerivedStatId,
  DerivedStatModifier,
  IdleRpgPackV1,
  ItemTemplate,
  ScalingSource,
} from '@features/idle-rpg/api'

export interface ResourceInfo {
  name: string
  colorHex: string
  max: number
  isGenerative: boolean
}

const DERIVED_STAT_IDS: DerivedStatId[] = [
  'max_resource_amount',
  'resource_regeneration',
  'max_hp',
  'hp_regeneration',
  'avoid_chance',
  'damage_resistance',
  'critical_hit_chance',
  'critical_hit_damage',
  'cooldown_reduction',
]

const LEGACY_DEFAULT_MAIN_STATS = ['STR', 'DEX', 'INT', 'LCK']

function getMainStatIds(pack: IdleRpgPackV1): string[] {
  const ids = (pack.mainStats ?? [])
    .map((s) => s.id?.trim())
    .filter((id): id is string => !!id)
  if (ids.length > 0) return Array.from(new Set(ids))
  return [...LEGACY_DEFAULT_MAIN_STATS]
}

function addToMap(target: Record<string, number>, key: string, value: number | undefined) {
  if (!Number.isFinite(value) || value === 0) return
  target[key] = (target[key] ?? 0) + Number(value)
}

function resolveSourceValue(source: ScalingSource, mainStats: Record<string, number>, weaponDamage: number, protectiveArmor: number): number {
  switch (source.kind) {
    case 'main_stat':
      return mainStats[source.statId] ?? 0
    case 'equipped_weapon_damage':
      return weaponDamage
    case 'equipped_protective_armor':
      return protectiveArmor
    default:
      return 0
  }
}

function computeDerivedBaseValue(
  statId: DerivedStatId,
  def: DerivedStatDefinition | undefined,
  level: number,
  mainStats: Record<string, number>,
  weaponDamage: number,
  protectiveArmor: number,
): number {
  if (!def) return statId === 'critical_hit_damage' ? 100 : 0
  let value = (def.base ?? 0) + (def.perLevel ?? 0) * level
  for (const term of def.scaling ?? []) {
    value += resolveSourceValue(term.source, mainStats, weaponDamage, protectiveArmor) * ((term.percent ?? 0) / 100)
  }
  if (def.floor !== undefined) value = Math.max(def.floor, value)
  if (def.cap !== undefined) value = Math.min(def.cap, value)
  return value
}

function applyDerivedModifiers(
  base: Partial<Record<DerivedStatId, number>>,
  mods: DerivedStatModifier[],
  defs: Partial<Record<DerivedStatId, DerivedStatDefinition>> | undefined,
): Partial<Record<DerivedStatId, number>> {
  const out: Partial<Record<DerivedStatId, number>> = { ...base }
  const flat: Partial<Record<DerivedStatId, number>> = {}
  const pct: Partial<Record<DerivedStatId, number>> = {}
  for (const mod of mods) {
    flat[mod.statId] = (flat[mod.statId] ?? 0) + (mod.flat ?? 0)
    pct[mod.statId] = (pct[mod.statId] ?? 0) + (mod.percent ?? 0)
  }
  for (const statId of DERIVED_STAT_IDS) {
    const start = out[statId] ?? (statId === 'critical_hit_damage' ? 100 : 0)
    let value = (start + (flat[statId] ?? 0)) * (1 + (pct[statId] ?? 0) / 100)
    const def = defs?.[statId]
    if (def?.floor !== undefined) value = Math.max(def.floor, value)
    if (def?.cap !== undefined) value = Math.min(def.cap, value)
    out[statId] = value
  }
  return out
}

function getPassiveAbilities(pack: IdleRpgPackV1, classPassiveIds: string[] | undefined, equippedIds: string[] | undefined): Ability[] {
  const byId = new Map((pack.abilities ?? []).map((a) => [a.id, a]))
  const classPassives = (classPassiveIds ?? [])
    .map((id) => byId.get(id))
    .filter((a): a is Ability => !!a)
  const equippedPassives = (equippedIds ?? [])
    .map((id) => byId.get(id))
    .filter((a): a is Ability => !!a && a.abilityType === 'passive')
  return [...classPassives, ...equippedPassives]
}

/** Compute player combat stats (max HP, AP, ARM) from character + pack. */
export function computePlayerCombatStats(
  character: CharacterState,
  pack: IdleRpgPackV1,
): { maxHp: number; ap: number; arm: number } {
  const cls = pack.classes.find((c) => c.id === character.classId)
  const mainStatIds = getMainStatIds(pack)
  const itemMap = new Map(pack.items.map((it) => [it.id, it]))
  const equippedItems = Object.values(character.equipment)
    .map((id) => (id ? itemMap.get(id) : undefined))
    .filter((i): i is ItemTemplate => !!i)
  const attackItemId = character.equipment.attack_source
  const defenseItemId = character.equipment.defense_layer
  const attackItem = attackItemId ? itemMap.get(attackItemId) : undefined
  const defenseItem = defenseItemId ? itemMap.get(defenseItemId) : undefined
  const weaponDamage = attackItem?.weaponDamage ?? 0
  const protectiveArmor = defenseItem?.protectiveArmor ?? 0

  const mainStats: Record<string, number> = {}
  const legacy: Record<string, number> = {}

  for (const id of mainStatIds) addToMap(mainStats, id, cls?.starting?.mainStats?.[id])
  for (const [k, v] of Object.entries(cls?.starting?.stats ?? {})) {
    addToMap(legacy, k, v)
    if (mainStatIds.includes(k)) addToMap(mainStats, k, v)
  }
  for (const item of equippedItems) {
    for (const [k, v] of Object.entries(item.mainStatBonuses ?? {})) {
      addToMap(mainStats, k, v)
      addToMap(legacy, k, v)
    }
    for (const [k, v] of Object.entries(item.stats ?? {})) {
      addToMap(legacy, k, v)
      if (mainStatIds.includes(k)) addToMap(mainStats, k, v)
    }
  }
  for (const [k, v] of Object.entries(character.allocatedStats ?? {})) {
    addToMap(mainStats, k, v)
    addToMap(legacy, k, v)
  }

  const passiveAbilities = getPassiveAbilities(pack, cls?.passives, character.equippedAbilityIds)
  const derivedBase: Partial<Record<DerivedStatId, number>> = {}
  for (const statId of DERIVED_STAT_IDS) {
    derivedBase[statId] = computeDerivedBaseValue(
      statId,
      pack.derivedStats?.[statId],
      character.level,
      mainStats,
      weaponDamage,
      protectiveArmor,
    )
  }
  derivedBase.max_hp = (derivedBase.max_hp ?? 0) + (legacy.HP ?? 0)

  const derivedModifiers: DerivedStatModifier[] = [
    ...(cls?.starting?.derivedStatModifiers ?? []),
    ...equippedItems.flatMap((it) => it.derivedStatModifiers ?? []),
    ...passiveAbilities.flatMap((a) => a.derivedStatModifiers ?? []),
  ]
  const derivedStats = applyDerivedModifiers(derivedBase, derivedModifiers, pack.derivedStats)

  const baseHp = pack.rules.baseMaxHp ?? 50
  const perLevelHp = pack.rules.baseMaxHpPerLevel ?? 10
  const maxHp = Math.max(1, Math.floor(baseHp + character.level * perLevelHp + (derivedStats.max_hp ?? 0)))
  const ap = Math.max(1, Math.floor(character.level * 2 + weaponDamage))
  const arm = Math.max(0, Math.floor(protectiveArmor + (legacy.ARM ?? 0)))
  return { maxHp, ap, arm }
}

/** Resolve resource info for a character's class (returns null if class has no resource). */
export function resolveCharacterResource(pack: IdleRpgPackV1, classId?: string | null): ResourceInfo | null {
  if (!classId) return null
  const cls = pack.classes?.find((c) => c.id === classId)
  if (!cls?.resourceId) return null
  const res = (pack.resources ?? []).find((r) => r.id === cls.resourceId)
  if (!res) return null
  return { name: res.name, colorHex: res.colorHex, max: res.max, isGenerative: res.isGenerative }
}

/** Resolve resource info for a creature by its resourceId (returns null if none). */
export function resolveCreatureResource(pack: IdleRpgPackV1, resourceId?: string | null): ResourceInfo | null {
  if (!resourceId) return null
  const res = (pack.resources ?? []).find((r) => r.id === resourceId)
  if (!res) return null
  return { name: res.name, colorHex: res.colorHex, max: res.max, isGenerative: res.isGenerative }
}

