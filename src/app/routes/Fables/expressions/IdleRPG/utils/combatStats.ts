import type { CharacterState, IdleRpgPackV1 } from '../../../../../../services/api'

export interface ResourceInfo {
  name: string
  colorHex: string
  max: number
  isGenerative: boolean
}

/** Compute player combat stats (max HP, AP, ARM) from character + pack. */
export function computePlayerCombatStats(
  character: CharacterState,
  pack: IdleRpgPackV1,
): { maxHp: number; ap: number; arm: number } {
  const cls = pack.classes.find((c) => c.id === character.classId)
  const mainStat = (cls?.scaling?.damageMainStat ?? 'STR') as keyof Record<string, number>
  const base: Record<string, number> = {}
  if (cls?.starting?.stats) {
    for (const [k, v] of Object.entries(cls.starting.stats)) base[k] = (base[k] ?? 0) + (v ?? 0)
  }
  const itemMap = new Map(pack.items.map((it) => [it.id, it]))
  for (const itemId of Object.values(character.equipment)) {
    if (!itemId) continue
    const item = itemMap.get(itemId)
    if (!item?.stats) continue
    for (const [k, v] of Object.entries(item.stats)) base[k] = (base[k] ?? 0) + (v ?? 0)
  }
  for (const [k, v] of Object.entries(character.allocatedStats ?? {})) {
    base[k] = (base[k] ?? 0) + (v ?? 0)
  }
  const maxHp = 50 + character.level * 10 + (base.HP ?? 0)
  const ap = Math.max(1, character.level * 2 + (base[mainStat] ?? 0))
  const arm = Math.max(0, base.ARM ?? 0)
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
