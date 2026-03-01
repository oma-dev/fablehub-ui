import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../../../contexts/AuthContext'
import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { getIdleRpgRealm, getFable, updateIdleRpgRealm } from '../../../../../services/api'
import type {
  Ability,
  AnimationFrameImageSource,
  ClassBlock,
  CreatureTemplate,
  Dungeon,
  IdleRpgPackV1,
  ItemTemplate,
  LootTable,
  MerchantListing,
  Raid,
} from '../../../../../services/api'
import { RARITY_NAMES, RARITY_NAME_TO_NUMBER } from '../../../../../services/api'
import type {
  Quest,
} from '../../../../../services/api'

// --- Helpers (same as Create) ---
function parseTags(s: string): string[] {
  return (s || '').split(',').map((t) => t.trim()).filter(Boolean)
}
function parseKeyValueNumber(s: string): Record<string, number> {
  const out: Record<string, number> = {}
  ;(s || '').split(',').map((p) => p.trim()).filter(Boolean).forEach((p) => {
    const i = p.indexOf(':')
    if (i > 0) {
      const k = p.slice(0, i).trim()
      const v = Number(p.slice(i + 1).trim())
      if (k && !Number.isNaN(v)) out[k] = v
    }
  })
  return out
}
function serializeKeyValueNumber(obj: Record<string, number> | undefined): string {
  if (!obj) return ''
  return Object.entries(obj).map(([k, v]) => `${k}:${v}`).join(', ')
}
function serializeStats(stats: Partial<Record<string, number>> | undefined): string {
  if (!stats) return ''
  return Object.entries(stats).filter(([, v]) => v != null && v !== 0).map(([k, v]) => `${k}:${v}`).join(', ')
}

const STAT_IDS = ['STR', 'DEX', 'INT', 'LCK', 'HP', 'ARM'] as const
const DELIVERIES = ['melee', 'projectile_straight', 'projectile_arced', 'instant'] as const
const STYLE_IDS = ['melee_slash', 'melee_punch', 'projectile_arrow', 'projectile_bolt', 'instant_slash'] as const

/** Coerce to a valid delivery so MUI Select never gets an out-of-range value (avoids console spam and lag). */
function normalizeDelivery(v: string): (typeof DELIVERIES)[number] {
  if (v && DELIVERIES.includes(v as (typeof DELIVERIES)[number])) return v as (typeof DELIVERIES)[number]
  if (v === 'ranged') return 'projectile_straight'
  return 'melee'
}

/** Coerce to a valid styleId so MUI Select never gets an out-of-range value (avoids console spam and lag). */
function normalizeStyleId(v: string): (typeof STYLE_IDS)[number] {
  if (v && STYLE_IDS.includes(v as (typeof STYLE_IDS)[number])) return v as (typeof STYLE_IDS)[number]
  if (v === 'melee_flail') return 'melee_slash'
  return 'melee_slash'
}
const SLOTS = ['attack_source', 'defense_layer'] as const
const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const
const ABILITY_TYPES: Ability['abilityType'][] = ['primary', 'regular', 'passive', 'ultimate']
const EFFECT_KINDS = ['damage', 'heal', 'apply_status', 'execute', 'lifesteal'] as const

// --- Form state types (same as Create) ---
type XpEntry = { level: string; xp: string }
type ResourceForm = { id: string; name: string; description: string; colorHex: string; isGenerative: boolean; max: string; regenPerTurn: string; gainOnHit: string }
type AbilityForm = {
  id: string; name: string; abilityType: Ability['abilityType']; description: string; iconUrl: string; delivery: string; styleId: string
  cooldownTurns: string; resourceCostId: string; resourceCostAmount: string; unlockCost: string; minLevel: string
  effectKind: string; effectAmount: string; effectPercentage: string; effectLifestealPct: string
  animWeaponSource: AnimationFrameImageSource; animWeaponUrl: string; animWeaponDelayMs: string
  animProjectileSource: AnimationFrameImageSource; animProjectileUrl: string; animProjectileTrajectory: 'straight' | 'arc'; animProjectileDelayMs: string
  animImpactSource: AnimationFrameImageSource; animImpactUrl: string; animImpactDelayMs: string
}
type ClassForm = {
  id: string; name: string; description: string; iconUrl: string
  damageMainStat: string; primaryAttackAbilityId: string
  attackTags: string; attackRequired: boolean; attackAllowEmpty: boolean
  defenseTags: string; defenseRequired: boolean; defenseAllowEmpty: boolean
  regularAbilityIds: string; ultimateAbilityId: string; resourceId: string
}
type CreatureForm = { id: string; name: string; role: 'quest' | 'boss'; level: string; hp: string; ap: string; arm: string; iconUrl: string; tags: string; abilityIds: string; resourceId: string; resourceMax: string }
type ItemForm = { id: string; name: string; rarity: string; slot: string; tags: string; stats: string; iconUrl: string; animationUrl: string; projectileUrl: string; impactUrl: string; priceCurrencyId: string; priceAmount: string }
type QuestForm = { id: string; name: string; creatureId: string; durationSec: string; iconUrl: string; rewardXp: string; rewardCurrency: string; lootTableId: string }
type DungeonForm = { id: string; name: string; description: string; imageUrl: string; requiredLevel: string; bossCreatureId: string }
type RaidForm = { id: string; name: string; description: string; imageUrl: string; requiredLevel: string; bossCreatureId: string; currencyId: string; costAmount: string }
type LootEntryForm = { itemId: string; weight: string; classId: string }

const emptyXp = (): XpEntry => ({ level: '', xp: '' })
const emptyResource = (): ResourceForm => ({ id: '', name: '', description: '', colorHex: '#3b82f6', isGenerative: false, max: '100', regenPerTurn: '5', gainOnHit: '0' })
const emptyAbility = (): AbilityForm => ({
  id: '', name: '', abilityType: 'regular', description: '', iconUrl: '', delivery: 'melee', styleId: 'melee_slash',
  cooldownTurns: '0', resourceCostId: '', resourceCostAmount: '0', unlockCost: '1', minLevel: '1',
  effectKind: 'damage', effectAmount: '0', effectPercentage: '0', effectLifestealPct: '0',
  animWeaponSource: 'url', animWeaponUrl: '', animWeaponDelayMs: '0',
  animProjectileSource: 'url', animProjectileUrl: '', animProjectileTrajectory: 'arc', animProjectileDelayMs: '0',
  animImpactSource: 'url', animImpactUrl: '', animImpactDelayMs: '0',
})
const emptyClass = (): ClassForm => ({
  id: '', name: '', description: '', iconUrl: '',
  damageMainStat: 'STR', primaryAttackAbilityId: '',
  attackTags: '', attackRequired: true, attackAllowEmpty: false,
  defenseTags: '', defenseRequired: false, defenseAllowEmpty: true,
  regularAbilityIds: '', ultimateAbilityId: '', resourceId: '',
})
const emptyCreature = (): CreatureForm => ({ id: '', name: '', role: 'quest', level: '1', hp: '10', ap: '2', arm: '0', iconUrl: '', tags: '', abilityIds: '', resourceId: '', resourceMax: '' })
const emptyItem = (): ItemForm => ({ id: '', name: '', rarity: 'common', slot: 'attack_source', tags: '', stats: '', iconUrl: '', animationUrl: '', projectileUrl: '', impactUrl: '', priceCurrencyId: '', priceAmount: '' })
const emptyQuest = (): QuestForm => ({ id: '', name: '', creatureId: '', durationSec: '60', iconUrl: '', rewardXp: '10', rewardCurrency: '', lootTableId: '' })
const emptyDungeon = (): DungeonForm => ({ id: '', name: '', description: '', imageUrl: '', requiredLevel: '1', bossCreatureId: '' })
const emptyRaid = (): RaidForm => ({ id: '', name: '', description: '', imageUrl: '', requiredLevel: '1', bossCreatureId: '', currencyId: '', costAmount: '0' })
const emptyLootEntry = (): LootEntryForm => ({ itemId: '', weight: '1', classId: '' })

// --- Hydrate form state from pack ---
const IMAGE_SOURCES: { value: AnimationFrameImageSource; label: string }[] = [
  { value: 'url', label: 'Custom URL' },
  { value: 'weaponIcon', label: 'Weapon icon' },
  { value: 'weaponAnimation', label: 'Weapon animation' },
  { value: 'weaponProjectile', label: 'Weapon projectile' },
  { value: 'weaponImpact', label: 'Weapon impact' },
]

function hydrateResources(pack: IdleRpgPackV1): ResourceForm[] {
  return (pack.resources ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
    description: r.description ?? '',
    colorHex: r.colorHex ?? '#3b82f6',
    isGenerative: r.isGenerative ?? false,
    max: String(r.max ?? 100),
    regenPerTurn: String(r.regenPerTurn ?? 5),
    gainOnHit: String(r.gainOnHit ?? 0),
  }))
}

function hydrateAbilities(pack: IdleRpgPackV1): AbilityForm[] {
  return (pack.abilities ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    abilityType: a.abilityType,
    description: a.description ?? '',
    iconUrl: a.iconUrl ?? '',
    delivery: normalizeDelivery(a.primaryAttack?.delivery ?? 'melee'),
    styleId: normalizeStyleId(a.primaryAttack?.styleId ?? 'melee_slash'),
    cooldownTurns: String(a.cooldownTurns ?? 0),
    resourceCostId: (a as any).cost?.resourceCost?.resourceId ?? '',
    resourceCostAmount: String((a as any).cost?.resourceCost?.amount ?? 0),
    unlockCost: String((a as any).unlockCost ?? 1),
    minLevel: String((a as any).requirements?.minLevel ?? 1),
    effectKind: (a as any).effects?.[0]?.kind ?? 'damage',
    effectAmount: String((a as any).effects?.[0]?.amount ?? 0),
    effectPercentage: String((a as any).effects?.[0]?.percentage ?? 0),
    effectLifestealPct: String((a as any).effects?.[0]?.lifestealPercent ?? 0),
    animWeaponSource: (a.animationFrames?.weapon?.[0]?.imageSource ?? 'url') as AnimationFrameImageSource,
    animWeaponUrl: a.animationFrames?.weapon?.[0]?.url ?? '',
    animWeaponDelayMs: String(a.animationFrames?.weapon?.[0]?.delayMs ?? 0),
    animProjectileSource: (a.animationFrames?.projectile?.[0]?.imageSource ?? 'url') as AnimationFrameImageSource,
    animProjectileUrl: a.animationFrames?.projectile?.[0]?.url ?? '',
    animProjectileTrajectory: a.animationFrames?.projectile?.[0]?.trajectory ?? 'arc',
    animProjectileDelayMs: String(a.animationFrames?.projectile?.[0]?.delayMs ?? 0),
    animImpactSource: (a.animationFrames?.impact?.[0]?.imageSource ?? 'url') as AnimationFrameImageSource,
    animImpactUrl: a.animationFrames?.impact?.[0]?.url ?? '',
    animImpactDelayMs: String(a.animationFrames?.impact?.[0]?.delayMs ?? 0),
  }))
}

function hydrateClasses(pack: IdleRpgPackV1): ClassForm[] {
  return pack.classes.map((c) => {
    const primaryAbility = (pack.abilities ?? []).find(
      (a) => a.abilityType === 'primary' && normalizeDelivery(a.primaryAttack?.delivery ?? 'melee') === normalizeDelivery(c.primaryAttack.delivery) && normalizeStyleId(a.primaryAttack?.styleId ?? 'melee_slash') === normalizeStyleId(c.primaryAttack.styleId),
    )
    return {
      id: c.id,
      name: c.name,
      description: c.description ?? '',
      iconUrl: c.iconUrl ?? '',
      damageMainStat: c.scaling.damageMainStat ?? 'STR',
      primaryAttackAbilityId: primaryAbility?.id ?? '',
      attackTags: c.slots?.attack_source?.allowedTagsAny?.join(', ') ?? '',
      attackRequired: c.slots?.attack_source?.required ?? true,
      attackAllowEmpty: c.slots?.attack_source?.allowEmpty ?? false,
      defenseTags: c.slots?.defense_layer?.allowedTagsAny?.join(', ') ?? '',
      defenseRequired: c.slots?.defense_layer?.required ?? false,
      defenseAllowEmpty: c.slots?.defense_layer?.allowEmpty ?? true,
      regularAbilityIds: c.abilities?.regular?.join(', ') ?? '',
      ultimateAbilityId: c.abilities?.ultimate ?? '',
      resourceId: (c as any).resourceId ?? '',
    }
  })
}

function hydrateCreatures(pack: IdleRpgPackV1): CreatureForm[] {
  return pack.creatures.map((c) => ({
    id: c.id,
    name: c.name,
    role: c.role,
    level: String(c.level),
    hp: String(c.hp),
    ap: String(c.ap),
    arm: String(c.arm),
    iconUrl: c.iconUrl ?? '',
    tags: c.tags?.join(', ') ?? '',
    abilityIds: (c as any).abilityIds?.join(', ') ?? '',
    resourceId: (c as any).resourceId ?? '',
    resourceMax: (c as any).resourceMax != null ? String((c as any).resourceMax) : '',
  }))
}

function hydrateItems(pack: IdleRpgPackV1): ItemForm[] {
  return pack.items.map((i) => ({
    id: i.id,
    name: i.name,
    rarity: RARITY_NAMES[typeof i.rarity === 'number' ? i.rarity : 1] ?? 'common',
    slot: i.slot,
    tags: i.tags?.join(', ') ?? '',
    stats: serializeStats(i.stats),
    iconUrl: i.iconUrl ?? '',
    animationUrl: i.animationUrl ?? '',
    projectileUrl: i.projectileUrl ?? '',
    impactUrl: i.impactUrl ?? '',
    priceCurrencyId: i.price?.currencyId ?? '',
    priceAmount: i.price?.amount != null ? String(i.price.amount) : '',
  }))
}

function hydrateQuests(pack: IdleRpgPackV1): QuestForm[] {
  return pack.quests.map((q) => ({
    id: q.id,
    name: q.name,
    creatureId: q.creatureId,
    durationSec: String(q.durationSec),
    iconUrl: q.iconUrl ?? '',
    rewardXp: String(q.rewards.xp),
    rewardCurrency: serializeKeyValueNumber(q.rewards.currency),
    lootTableId: q.rewards.lootTableId ?? '',
  }))
}

function hydrateDungeons(pack: IdleRpgPackV1): DungeonForm[] {
  return (pack.dungeons ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    description: d.description ?? '',
    imageUrl: d.imageUrl ?? '',
    requiredLevel: String(d.requiredLevel),
    bossCreatureId: d.bossCreatureId ?? '',
  }))
}

function hydrateRaids(pack: IdleRpgPackV1): RaidForm[] {
  return (pack.raids ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description ?? '',
    imageUrl: r.imageUrl ?? '',
    requiredLevel: String(r.requiredLevel),
    bossCreatureId: r.bossCreatureId ?? '',
    currencyId: r.requiredCurrencyCost?.currencyId ?? '',
    costAmount: String(r.requiredCurrencyCost?.amount ?? 0),
  }))
}

function hydrateLootTables(pack: IdleRpgPackV1): { id: string; entries: LootEntryForm[] }[] {
  return pack.lootTables.map((t) => ({
    id: t.id,
    entries: t.entries.map((e) => ({
      itemId: e.itemId,
      weight: String(e.weight),
      classId: e.conditions?.classId ?? '',
    })),
  }))
}

export default function IdleRpgEdit() {
  const { fableId, realmId } = useParams<{ fableId: string; realmId: string }>()
  const navigate = useNavigate()
  const { loading: authLoading } = useAuth()
  const [fableName, setFableName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [visibility, setVisibility] = useState<'private' | 'public'>('private')
  const [joinCode, setJoinCode] = useState('')
  const [playerCap, setPlayerCap] = useState(10)
  const [maxLevel, setMaxLevel] = useState(10)
  const [combatPresetId, setCombatPresetId] = useState('combat_v1_simple')
  const [xpEntries, setXpEntries] = useState<XpEntry[]>([])
  const [statPointsPerLevel, setStatPointsPerLevel] = useState(3)
  const [abilityPointsPerLevel, setAbilityPointsPerLevel] = useState('1')
  const [abilitySlotsByLevel, setAbilitySlotsByLevel] = useState('')
  const [currencies, setCurrencies] = useState<{ id: string; name: string; iconUrl?: string }[]>([])
  const [resources, setResources] = useState<ResourceForm[]>([])
  const [abilities, setAbilities] = useState<AbilityForm[]>([])
  const [classes, setClasses] = useState<ClassForm[]>([emptyClass()])
  const [creatures, setCreatures] = useState<CreatureForm[]>([])
  const [items, setItems] = useState<ItemForm[]>([])
  const [quests, setQuests] = useState<QuestForm[]>([])
  const [dungeons, setDungeons] = useState<DungeonForm[]>([])
  const [raids, setRaids] = useState<RaidForm[]>([])
  const [listings, setListings] = useState<MerchantListing[]>([])
  const [lootTables, setLootTables] = useState<{ id: string; entries: LootEntryForm[] }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!fableId || !realmId || authLoading) return
    setLoading(true)
    Promise.all([
      getFable(fableId).catch(() => null),
      getIdleRpgRealm(fableId, realmId),
    ]).then(([fable, realm]) => {
      if (fable) setFableName(fable.name)
      const pack = realm.pack
      setVisibility((realm.visibility as 'private' | 'public') ?? 'private')
      setJoinCode(realm.joinCode ?? '')
      setPlayerCap(realm.playerCap ?? 10)
      setMaxLevel(pack.rules.maxLevel ?? 10)
      setCombatPresetId(pack.rules.combatPresetId ?? 'combat_v1_simple')
      const xpTable = pack.rules.xpTable ?? {}
      setXpEntries(
        Object.entries(xpTable)
          .filter(([lvl]) => lvl !== '1')
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([level, xp]) => ({ level, xp: String(xp) })),
      )
      setStatPointsPerLevel((pack.rules as any).statPointsPerLevel ?? 3)
      setAbilityPointsPerLevel(String((pack.rules as any).abilityPointsPerLevel ?? 1))
      const absMap = (pack.rules as any).abilitySlotsByLevel as Record<number, number> | undefined
      setAbilitySlotsByLevel(absMap ? Object.entries(absMap).map(([k, v]) => `${k}:${v}`).join(',') : '')
      setCurrencies(pack.economy.currencies.map((c) => ({ id: c.id, name: c.name, iconUrl: c.iconUrl })))
      setResources(hydrateResources(pack))
      setAbilities(hydrateAbilities(pack))
      setClasses(hydrateClasses(pack).length > 0 ? hydrateClasses(pack) : [emptyClass()])
      setCreatures(hydrateCreatures(pack))
      setItems(hydrateItems(pack))
      setQuests(hydrateQuests(pack))
      setDungeons(hydrateDungeons(pack))
      setRaids(hydrateRaids(pack))
      setListings(pack.merchant?.listings ?? [])
      setLootTables(hydrateLootTables(pack))
    }).catch((err) => {
      setError(err instanceof Error ? err.message : 'Failed to load realm')
    }).finally(() => setLoading(false))
  }, [fableId, realmId, authLoading])

  // --- Build pack from form (same as Create) ---
  function buildPack(): IdleRpgPackV1 {
    const xpTable: Record<string, number> = { '1': 0 }
    xpEntries.forEach((e) => {
      const l = e.level.trim()
      const x = Number(e.xp.trim())
      if (l && !Number.isNaN(x)) xpTable[l] = x
    })

    const resourceList = resources.filter(r => r.id.trim() && r.name.trim()).map(r => ({
      id: r.id.trim(),
      name: r.name.trim(),
      ...(r.description.trim() ? { description: r.description.trim() } : {}),
      colorHex: r.colorHex.trim() || '#3b82f6',
      isGenerative: r.isGenerative,
      max: Math.max(1, Number(r.max) || 100),
      ...(Number(r.regenPerTurn) > 0 ? { regenPerTurn: Number(r.regenPerTurn) } : {}),
      ...(Number(r.gainOnHit) > 0 ? { gainOnHit: Number(r.gainOnHit) } : {}),
    }))

    const abilityList: Ability[] = abilities
      .filter((a) => a.id.trim() && a.name.trim())
      .map((a) => {
        const def: Ability = {
          id: a.id.trim(),
          name: a.name.trim(),
          abilityType: a.abilityType,
          cooldownTurns: Number(a.cooldownTurns) || 0,
          ...(a.description.trim() ? { description: a.description.trim() } : {}),
          ...(a.iconUrl.trim() ? { iconUrl: a.iconUrl.trim() } : {}),
          ...(a.resourceCostId.trim() && Number(a.resourceCostAmount) > 0 ? {
            cost: { cooldownTurns: Number(a.cooldownTurns) || 0, resourceCost: { resourceId: a.resourceCostId.trim(), amount: Number(a.resourceCostAmount) } }
          } : {}),
          ...(Number(a.unlockCost) > 0 ? { unlockCost: Number(a.unlockCost) } : {}),
          ...(Number(a.minLevel) > 1 ? { requirements: { minLevel: Number(a.minLevel) } } : {}),
          ...(a.effectKind ? { effects: [{
            kind: a.effectKind as any,
            ...(Number(a.effectAmount) > 0 ? { amount: Number(a.effectAmount) } : {}),
            ...(Number(a.effectPercentage) > 0 ? { percentage: Number(a.effectPercentage) } : {}),
            ...(a.effectKind === 'lifesteal' && Number(a.effectLifestealPct) > 0 ? { lifestealPercent: Number(a.effectLifestealPct) } : {}),
          }] } : {}),
        }
        if (a.abilityType === 'primary') {
          def.primaryAttack = {
            delivery: normalizeDelivery(a.delivery || 'melee'),
            styleId: normalizeStyleId(a.styleId || 'melee_slash'),
          }
        }
        const hasWeapon = a.animWeaponSource !== 'url' || (a.animWeaponUrl?.trim() ?? '') !== ''
        const hasProjectile = a.animProjectileSource !== 'url' || (a.animProjectileUrl?.trim() ?? '') !== ''
        const hasImpact = a.animImpactSource !== 'url' || (a.animImpactUrl?.trim() ?? '') !== ''
        if (hasWeapon || hasProjectile || hasImpact) {
          def.animationFrames = {}
          if (hasWeapon) {
            def.animationFrames.weapon = [{
              ...(a.animWeaponSource === 'url' && a.animWeaponUrl?.trim() ? { url: a.animWeaponUrl.trim() } : {}),
              ...(a.animWeaponSource !== 'url' ? { imageSource: a.animWeaponSource } : {}),
              ...(Math.max(0, Number(a.animWeaponDelayMs) || 0) > 0 ? { delayMs: Math.max(0, Number(a.animWeaponDelayMs) || 0) } : {}),
            }]
          }
          if (hasProjectile) {
            def.animationFrames.projectile = [{
              trajectory: a.animProjectileTrajectory as 'straight' | 'arc',
              ...(a.animProjectileSource === 'url' && a.animProjectileUrl?.trim() ? { url: a.animProjectileUrl.trim() } : {}),
              ...(a.animProjectileSource !== 'url' ? { imageSource: a.animProjectileSource } : {}),
              ...(Math.max(0, Number(a.animProjectileDelayMs) || 0) > 0 ? { delayMs: Math.max(0, Number(a.animProjectileDelayMs) || 0) } : {}),
            }]
          }
          if (hasImpact) {
            def.animationFrames.impact = [{
              ...(a.animImpactSource === 'url' && a.animImpactUrl?.trim() ? { url: a.animImpactUrl.trim() } : {}),
              ...(a.animImpactSource !== 'url' ? { imageSource: a.animImpactSource } : {}),
              ...(Math.max(0, Number(a.animImpactDelayMs) || 0) > 0 ? { delayMs: Math.max(0, Number(a.animImpactDelayMs) || 0) } : {}),
            }]
          }
        }
        return def
      })

    const primaryAbilities = abilityList.filter((a) => a.abilityType === 'primary')
    const classBlocks: ClassBlock[] = classes
      .filter((c) => c.id.trim() && c.name.trim())
      .map((c) => {
        const primaryAbility = c.primaryAttackAbilityId.trim()
          ? primaryAbilities.find((a) => a.id === c.primaryAttackAbilityId.trim())
          : null
        const delivery = normalizeDelivery(primaryAbility?.primaryAttack?.delivery ?? 'melee')
        const styleId = normalizeStyleId(primaryAbility?.primaryAttack?.styleId ?? 'melee_slash')
        return {
          id: c.id.trim(),
          name: c.name.trim(),
          ...(c.description.trim() ? { description: c.description.trim() } : {}),
          ...(c.iconUrl.trim() ? { iconUrl: c.iconUrl.trim() } : {}),
          scaling: { damageMainStat: c.damageMainStat },
          primaryAttack: { delivery, styleId },
          slots: {
            attack_source: {
              required: c.attackRequired,
              allowEmpty: c.attackAllowEmpty,
              allowedTagsAny: parseTags(c.attackTags),
            },
            defense_layer: {
              required: c.defenseRequired,
              allowEmpty: c.defenseAllowEmpty,
              allowedTagsAny: parseTags(c.defenseTags),
            },
          },
          ...(c.regularAbilityIds.trim() || c.ultimateAbilityId.trim()
            ? {
                abilities: {
                  regular: parseTags(c.regularAbilityIds),
                  ultimate: c.ultimateAbilityId.trim() || null,
                },
              }
            : {}),
          ...(c.resourceId.trim() ? { resourceId: c.resourceId.trim() } : {}),
        }
      })

    const creatureList: CreatureTemplate[] = creatures
      .filter((c) => c.id.trim() && c.name.trim())
      .map((c) => ({
        id: c.id.trim(),
        name: c.name.trim(),
        role: c.role,
        level: Number(c.level) || 1,
        hp: Number(c.hp) || 1,
        ap: Number(c.ap) || 0,
        arm: Number(c.arm) || 0,
        ...(c.iconUrl.trim() ? { iconUrl: c.iconUrl.trim() } : {}),
        ...(c.tags.trim() ? { tags: parseTags(c.tags) } : {}),
        ...(c.abilityIds.trim() ? { abilityIds: parseTags(c.abilityIds) } : {}),
        ...(c.resourceId.trim() ? { resourceId: c.resourceId.trim() } : {}),
        ...(c.resourceMax.trim() && Number(c.resourceMax) > 0 ? { resourceMax: Number(c.resourceMax) } : {}),
      }))

    const itemList: ItemTemplate[] = items
      .filter((i) => i.id.trim() && i.name.trim())
      .map((i) => ({
        id: i.id.trim(),
        name: i.name.trim(),
        rarity: RARITY_NAME_TO_NUMBER[i.rarity] ?? 1,
        slot: i.slot,
        tags: parseTags(i.tags),
        stats: parseKeyValueNumber(i.stats),
        ...(i.iconUrl.trim() ? { iconUrl: i.iconUrl.trim() } : {}),
        ...(i.animationUrl.trim() ? { animationUrl: i.animationUrl.trim() } : {}),
        ...(i.projectileUrl.trim() ? { projectileUrl: i.projectileUrl.trim() } : {}),
        ...(i.impactUrl.trim() ? { impactUrl: i.impactUrl.trim() } : {}),
        ...(i.priceCurrencyId.trim() && i.priceAmount.trim()
          ? { price: { currencyId: i.priceCurrencyId.trim(), amount: Number(i.priceAmount) || 0 } }
          : {}),
      }))

    const questList: Quest[] = quests
      .filter((q) => q.id.trim() && q.name.trim() && q.creatureId.trim())
      .map((q) => ({
        id: q.id.trim(),
        name: q.name.trim(),
        creatureId: q.creatureId.trim(),
        durationSec: Number(q.durationSec) || 60,
        ...(q.iconUrl.trim() ? { iconUrl: q.iconUrl.trim() } : {}),
        rewards: {
          xp: Number(q.rewardXp) || 0,
          currency: parseKeyValueNumber(q.rewardCurrency),
          ...(q.lootTableId.trim() ? { lootTableId: q.lootTableId.trim() } : {}),
        },
      }))

    const dungeonList: Dungeon[] = dungeons
      .filter((d) => d.id.trim() && d.name.trim() && d.bossCreatureId.trim())
      .map((d) => ({
        id: d.id.trim(),
        name: d.name.trim(),
        ...(d.description.trim() ? { description: d.description.trim() } : {}),
        ...(d.imageUrl?.trim() ? { imageUrl: d.imageUrl.trim() } : {}),
        requiredLevel: Number(d.requiredLevel) || 1,
        bossCreatureId: d.bossCreatureId.trim(),
      }))

    const raidList: Raid[] = raids
      .filter((r) => r.id.trim() && r.name.trim() && r.bossCreatureId.trim() && r.currencyId.trim())
      .map((r) => ({
        id: r.id.trim(),
        name: r.name.trim(),
        ...(r.description.trim() ? { description: r.description.trim() } : {}),
        ...(r.imageUrl?.trim() ? { imageUrl: r.imageUrl.trim() } : {}),
        requiredLevel: Number(r.requiredLevel) || 1,
        bossCreatureId: r.bossCreatureId.trim(),
        requiredCurrencyCost: { currencyId: r.currencyId.trim(), amount: Number(r.costAmount) || 0 },
      }))

    const lootTableList: LootTable[] = lootTables
      .filter((t) => t.id.trim())
      .map((t) => ({
        id: t.id.trim(),
        entries: t.entries
          .filter((e) => e.itemId.trim())
          .map((e) => ({
            itemId: e.itemId.trim(),
            weight: Number(e.weight) || 1,
            ...(e.classId.trim() ? { conditions: { classId: e.classId.trim() } } : {}),
          })),
      }))

    const validCurrencies = currencies.filter((c) => c.id.trim() && c.name.trim()).map((c) => ({
      id: c.id.trim(),
      name: c.name.trim(),
      ...(c.iconUrl?.trim() ? { iconUrl: c.iconUrl.trim() } : {}),
    }))

    const parsedAbilitySlots: Record<number, number> = {}
    ;(abilitySlotsByLevel || '').split(',').map(p => p.trim()).filter(Boolean).forEach(p => {
      const i = p.indexOf(':')
      if (i > 0) {
        const lvl = Number(p.slice(0, i).trim())
        const slots = Number(p.slice(i + 1).trim())
        if (!Number.isNaN(lvl) && !Number.isNaN(slots)) parsedAbilitySlots[lvl] = slots
      }
    })

    return {
      version: 1,
      rules: {
        maxLevel, xpTable, combatPresetId, statPointsPerLevel,
        ...(Number(abilityPointsPerLevel) > 0 ? { abilityPointsPerLevel: Number(abilityPointsPerLevel) } : {}),
        ...(Object.keys(parsedAbilitySlots).length > 0 ? { abilitySlotsByLevel: parsedAbilitySlots } : {}),
      },
      economy: { currencies: validCurrencies },
      ...(resourceList.length > 0 ? { resources: resourceList } : {}),
      ...(abilityList.length > 0 ? { abilities: abilityList } : {}),
      classes: classBlocks,
      creatures: creatureList,
      items: itemList,
      quests: questList,
      ...(dungeonList.length > 0 ? { dungeons: dungeonList } : {}),
      ...(raidList.length > 0 ? { raids: raidList } : {}),
      merchant: { listings },
      lootTables: lootTableList,
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!fableId || !realmId) return
    const validCurrencies = currencies.filter((c) => c.id.trim() && c.name.trim())
    if (validCurrencies.length === 0) {
      setError('Add at least one currency (id and name required).')
      return
    }
    const validClasses = classes.filter((c) => c.id.trim() && c.name.trim())
    if (validClasses.length === 0) {
      setError('Add at least one class (id and name required).')
      return
    }
    setSubmitting(true)
    try {
      const pack = buildPack()
      await updateIdleRpgRealm(fableId, realmId, {
        visibility,
        joinCode: joinCode.trim() || undefined,
        playerCap: playerCap > 0 ? playerCap : undefined,
        pack,
      })
      navigate(`/fables/${fableId}`)
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'data' in err
          ? String((err as { data?: unknown }).data)
          : err instanceof Error ? err.message : 'Failed to update realm.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!fableId || !realmId) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
        <Container maxWidth="sm">
          <Typography color="text.secondary" gutterBottom>Missing fable or realm.</Typography>
          <Button component={Link} to="/fables" variant="contained" color="primary">Back to Fables</Button>
        </Container>
      </Box>
    )
  }

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Container maxWidth="md">
        <Typography component="h1" variant="h4" color="primary.dark" fontWeight={700} gutterBottom>
          Edit Idle RPG Realm
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {fableName ? `Editing realm for "${fableName}".` : 'Editing realm.'}
          {' '}Modify rules, economy, classes, creatures, items, quests, merchant, and loot tables.
        </Typography>

        <form onSubmit={handleSubmit}>
          {/* Realm */}
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>Realm</Typography>
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Visibility</InputLabel>
              <Select value={visibility} label="Visibility" onChange={(e) => setVisibility(e.target.value as 'private' | 'public')}>
                <MenuItem value="private">Private</MenuItem>
                <MenuItem value="public">Public</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Join code (optional)" fullWidth size="small" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} sx={{ mb: 2 }} />
            <TextField label="Player cap" type="number" fullWidth size="small" value={playerCap} onChange={(e) => setPlayerCap(Number(e.target.value) || 0)} inputProps={{ min: 1, max: 100 }} />
          </Paper>

          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight={600}>Rules</Typography></AccordionSummary>
            <AccordionDetails>
              <TextField label="Max level" type="number" size="small" value={maxLevel} onChange={(e) => setMaxLevel(Number(e.target.value) || 1)} sx={{ mr: 2, width: 120 }} inputProps={{ min: 1 }} />
              <TextField label="Stat points per level" type="number" size="small" value={statPointsPerLevel} onChange={(e) => setStatPointsPerLevel(Number(e.target.value) || 0)} sx={{ mr: 2, width: 140 }} inputProps={{ min: 0 }} />
              <TextField label="Combat preset ID" size="small" value={combatPresetId} onChange={(e) => setCombatPresetId(e.target.value)} sx={{ width: 220 }} />
              <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
                <TextField label="Ability points/level" type="number" size="small" value={abilityPointsPerLevel} onChange={(e) => setAbilityPointsPerLevel(e.target.value)} sx={{ width: 160 }} inputProps={{ min: 0 }} />
                <TextField label="Ability slots by level" size="small" value={abilitySlotsByLevel} onChange={(e) => setAbilitySlotsByLevel(e.target.value)} placeholder="1:1,5:2,10:3" sx={{ width: 220 }} helperText="level:slots, comma-separated" />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>XP table (level → xp required)</Typography>
              {xpEntries.map((e, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField size="small" placeholder="Level" value={e.level} onChange={(ev) => setXpEntries((prev) => prev.map((x, j) => j === i ? { ...x, level: ev.target.value } : x))} sx={{ width: 80 }} />
                  <TextField size="small" placeholder="XP" value={e.xp} onChange={(ev) => setXpEntries((prev) => prev.map((x, j) => j === i ? { ...x, xp: ev.target.value } : x))} sx={{ width: 100 }} />
                  <IconButton size="small" onClick={() => setXpEntries((prev) => prev.filter((_, j) => j !== i))}>−</IconButton>
                </Box>
              ))}
              <Button type="button" size="small" variant="outlined" onClick={() => setXpEntries((prev) => [...prev, emptyXp()])}>+ Add level</Button>
            </AccordionDetails>
          </Accordion>

          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight={600}>Currencies (at least one)</Typography></AccordionSummary>
            <AccordionDetails>
              {currencies.map((c, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                  <TextField size="small" label="ID" value={c.id} onChange={(e) => setCurrencies((p) => p.map((x, j) => j === i ? { ...x, id: e.target.value } : x))} sx={{ width: 100 }} />
                  <TextField size="small" label="Name" value={c.name} onChange={(e) => setCurrencies((p) => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} sx={{ width: 120 }} />
                  <TextField size="small" label="Icon URL" value={c.iconUrl ?? ''} onChange={(e) => setCurrencies((p) => p.map((x, j) => j === i ? { ...x, iconUrl: e.target.value } : x))} sx={{ flex: 1 }} />
                  <IconButton size="small" color="error" onClick={() => setCurrencies((p) => p.filter((_, j) => j !== i))} disabled={currencies.length <= 1}>−</IconButton>
                </Box>
              ))}
              <Button type="button" size="small" variant="outlined" onClick={() => setCurrencies((p) => [...p, { id: '', name: '' }])}>+ Add currency</Button>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight={600}>Resources</Typography></AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Resources power abilities (e.g. mana, rage, energy). Generative resources regen each turn; non-generative are gained on hit.
              </Typography>
              {resources.map((r, i) => (
                <Paper key={i} variant="outlined" sx={{ p: 2, mb: 2 }}>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mb: 1 }}>
                    <TextField size="small" label="ID" value={r.id} onChange={(e) => setResources((p) => p.map((x, j) => j === i ? { ...x, id: e.target.value } : x))} sx={{ width: 100 }} placeholder="mana" />
                    <TextField size="small" label="Name" value={r.name} onChange={(e) => setResources((p) => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} sx={{ width: 120 }} />
                    <TextField size="small" label="Description" value={r.description} onChange={(e) => setResources((p) => p.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} sx={{ flex: 1, minWidth: 140 }} />
                    <TextField size="small" label="Color Hex" value={r.colorHex} onChange={(e) => setResources((p) => p.map((x, j) => j === i ? { ...x, colorHex: e.target.value } : x))} sx={{ width: 100 }} />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                    <FormControlLabel control={<Checkbox size="small" checked={r.isGenerative} onChange={(e) => setResources((p) => p.map((x, j) => j === i ? { ...x, isGenerative: e.target.checked } : x))} />} label="Generative" />
                    <TextField size="small" label="Max" type="number" value={r.max} onChange={(e) => setResources((p) => p.map((x, j) => j === i ? { ...x, max: e.target.value } : x))} sx={{ width: 80 }} />
                    <TextField size="small" label="Regen/Turn" type="number" value={r.regenPerTurn} onChange={(e) => setResources((p) => p.map((x, j) => j === i ? { ...x, regenPerTurn: e.target.value } : x))} sx={{ width: 100 }} />
                    <TextField size="small" label="Gain On Hit" type="number" value={r.gainOnHit} onChange={(e) => setResources((p) => p.map((x, j) => j === i ? { ...x, gainOnHit: e.target.value } : x))} sx={{ width: 100 }} />
                    <IconButton size="small" color="error" onClick={() => setResources((p) => p.filter((_, j) => j !== i))}>−</IconButton>
                  </Box>
                </Paper>
              ))}
              <Button type="button" size="small" variant="outlined" onClick={() => setResources((p) => [...p, emptyResource()])}>+ Add resource</Button>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight={600}>Abilities</Typography></AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Define abilities here. Use type <strong>primary</strong> for basic attacks (set delivery &amp; style); then in Classes assign only primary abilities as the class primary attack.
              </Typography>
              {abilities.map((a, i) => (
                <Box key={i} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mb: 1 }}>
                    <TextField size="small" label="ID" value={a.id} onChange={(e) => setAbilities((p) => p.map((x, j) => j === i ? { ...x, id: e.target.value } : x))} sx={{ width: 100 }} />
                    <TextField size="small" label="Name" value={a.name} onChange={(e) => setAbilities((p) => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} sx={{ width: 120 }} />
                    <FormControl size="small" sx={{ minWidth: 110 }}>
                      <InputLabel>Type</InputLabel>
                      <Select value={a.abilityType} label="Type" onChange={(e) => setAbilities((p) => p.map((x, j) => j === i ? { ...x, abilityType: e.target.value as Ability['abilityType'] } : x))}>
                        {ABILITY_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                      </Select>
                    </FormControl>
                    {a.abilityType === 'primary' && (
                      <>
                        <FormControl size="small" sx={{ minWidth: 140 }}>
                          <InputLabel>Delivery</InputLabel>
                          <Select value={normalizeDelivery(a.delivery)} label="Delivery" onChange={(e) => setAbilities((p) => p.map((x, j) => j === i ? { ...x, delivery: e.target.value } : x))}>
                            {DELIVERIES.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                          </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 140 }}>
                          <InputLabel>Style</InputLabel>
                          <Select value={normalizeStyleId(a.styleId)} label="Style" onChange={(e) => setAbilities((p) => p.map((x, j) => j === i ? { ...x, styleId: e.target.value } : x))}>
                            {STYLE_IDS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                          </Select>
                        </FormControl>
                      </>
                    )}
                    <TextField size="small" label="Description" value={a.description} onChange={(e) => setAbilities((p) => p.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} sx={{ flex: 1, minWidth: 140 }} />
                    <TextField size="small" label="Icon URL" value={a.iconUrl} onChange={(e) => setAbilities((p) => p.map((x, j) => j === i ? { ...x, iconUrl: e.target.value } : x))} sx={{ width: 140 }} />
                    <IconButton size="small" color="error" onClick={() => setAbilities((p) => p.filter((_, j) => j !== i))}>−</IconButton>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mb: 1.5, pl: 1 }}>
                  <Typography variant="caption" color="text.secondary">Animation frames:</Typography>
                  <FormControl size="small" sx={{ minWidth: 100 }}>
                    <InputLabel>Weapon</InputLabel>
                    <Select value={a.animWeaponSource} label="Weapon" onChange={(e) => setAbilities((p) => p.map((x, j) => j === i ? { ...x, animWeaponSource: e.target.value as AnimationFrameImageSource } : x))}>
                      {IMAGE_SOURCES.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
                    </Select>
                  </FormControl>
                  {a.animWeaponSource === 'url' && <TextField size="small" placeholder="Weapon URL" value={a.animWeaponUrl} onChange={(e) => setAbilities((p) => p.map((x, j) => j === i ? { ...x, animWeaponUrl: e.target.value } : x))} sx={{ width: 140 }} />}
                  <TextField size="small" type="number" label="W delay (ms)" value={a.animWeaponDelayMs} onChange={(e) => setAbilities((p) => p.map((x, j) => j === i ? { ...x, animWeaponDelayMs: e.target.value } : x))} inputProps={{ min: 0 }} sx={{ width: 90 }} />
                  <FormControl size="small" sx={{ minWidth: 100 }}>
                    <InputLabel>Projectile</InputLabel>
                    <Select value={a.animProjectileSource} label="Projectile" onChange={(e) => setAbilities((p) => p.map((x, j) => j === i ? { ...x, animProjectileSource: e.target.value as AnimationFrameImageSource } : x))}>
                      {IMAGE_SOURCES.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
                    </Select>
                  </FormControl>
                  {a.animProjectileSource === 'url' && <TextField size="small" placeholder="Projectile URL" value={a.animProjectileUrl} onChange={(e) => setAbilities((p) => p.map((x, j) => j === i ? { ...x, animProjectileUrl: e.target.value } : x))} sx={{ width: 140 }} />}
                  <Select size="small" value={a.animProjectileTrajectory} onChange={(e) => setAbilities((p) => p.map((x, j) => j === i ? { ...x, animProjectileTrajectory: e.target.value as 'straight' | 'arc' } : x))} sx={{ width: 90 }}>
                    <MenuItem value="straight">straight</MenuItem>
                    <MenuItem value="arc">arc</MenuItem>
                  </Select>
                  <TextField size="small" type="number" label="P delay (ms)" value={a.animProjectileDelayMs} onChange={(e) => setAbilities((p) => p.map((x, j) => j === i ? { ...x, animProjectileDelayMs: e.target.value } : x))} inputProps={{ min: 0 }} sx={{ width: 90 }} />
                  <FormControl size="small" sx={{ minWidth: 100 }}>
                    <InputLabel>Impact</InputLabel>
                    <Select value={a.animImpactSource} label="Impact" onChange={(e) => setAbilities((p) => p.map((x, j) => j === i ? { ...x, animImpactSource: e.target.value as AnimationFrameImageSource } : x))}>
                      {IMAGE_SOURCES.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
                    </Select>
                  </FormControl>
                  {a.animImpactSource === 'url' && <TextField size="small" placeholder="Impact URL" value={a.animImpactUrl} onChange={(e) => setAbilities((p) => p.map((x, j) => j === i ? { ...x, animImpactUrl: e.target.value } : x))} sx={{ width: 140 }} />}
                  <TextField size="small" type="number" label="I delay (ms)" value={a.animImpactDelayMs} onChange={(e) => setAbilities((p) => p.map((x, j) => j === i ? { ...x, animImpactDelayMs: e.target.value } : x))} inputProps={{ min: 0 }} sx={{ width: 90 }} />
                  </Box>
                  {a.abilityType !== 'primary' && (
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', width: '100%', mt: 1 }}>
                      <TextField size="small" label="Cooldown (turns)" type="number" value={a.cooldownTurns} onChange={(e) => setAbilities((p) => p.map((x, j) => j === i ? { ...x, cooldownTurns: e.target.value } : x))} sx={{ width: 120 }} />
                      <FormControl size="small" sx={{ minWidth: 130 }}>
                        <InputLabel>Resource cost</InputLabel>
                        <Select value={a.resourceCostId} label="Resource cost" onChange={(e) => setAbilities((p) => p.map((x, j) => j === i ? { ...x, resourceCostId: e.target.value } : x))} displayEmpty>
                          <MenuItem value="">— None —</MenuItem>
                          {resources.filter((r) => r.id.trim()).map((r) => (
                            <MenuItem key={r.id} value={r.id}>{r.name || r.id}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <TextField size="small" label="Cost amount" type="number" value={a.resourceCostAmount} onChange={(e) => setAbilities((p) => p.map((x, j) => j === i ? { ...x, resourceCostAmount: e.target.value } : x))} sx={{ width: 100 }} />
                      <TextField size="small" label="Unlock cost (AP)" type="number" value={a.unlockCost} onChange={(e) => setAbilities((p) => p.map((x, j) => j === i ? { ...x, unlockCost: e.target.value } : x))} sx={{ width: 120 }} />
                      <TextField size="small" label="Min level" type="number" value={a.minLevel} onChange={(e) => setAbilities((p) => p.map((x, j) => j === i ? { ...x, minLevel: e.target.value } : x))} sx={{ width: 90 }} />
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Effect kind</InputLabel>
                        <Select value={a.effectKind} label="Effect kind" onChange={(e) => setAbilities((p) => p.map((x, j) => j === i ? { ...x, effectKind: e.target.value } : x))}>
                          {EFFECT_KINDS.map((k) => <MenuItem key={k} value={k}>{k}</MenuItem>)}
                        </Select>
                      </FormControl>
                      <TextField size="small" label="Effect amount" type="number" value={a.effectAmount} onChange={(e) => setAbilities((p) => p.map((x, j) => j === i ? { ...x, effectAmount: e.target.value } : x))} sx={{ width: 110 }} />
                      <TextField size="small" label="Effect %" type="number" value={a.effectPercentage} onChange={(e) => setAbilities((p) => p.map((x, j) => j === i ? { ...x, effectPercentage: e.target.value } : x))} sx={{ width: 90 }} />
                      {a.effectKind === 'lifesteal' && (
                        <TextField size="small" label="Lifesteal %" type="number" value={a.effectLifestealPct} onChange={(e) => setAbilities((p) => p.map((x, j) => j === i ? { ...x, effectLifestealPct: e.target.value } : x))} sx={{ width: 100 }} />
                      )}
                    </Box>
                  )}
                </Box>
              ))}
              <Button type="button" size="small" variant="outlined" onClick={() => setAbilities((p) => [...p, emptyAbility()])}>+ Add ability</Button>
            </AccordionDetails>
          </Accordion>

          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight={600}>Classes (at least one)</Typography></AccordionSummary>
            <AccordionDetails>
              {classes.map((c, i) => (
                <Paper key={i} variant="outlined" sx={{ p: 2, mb: 2 }}>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    <TextField size="small" label="Class ID" value={c.id} onChange={(e) => setClasses((p) => p.map((x, j) => j === i ? { ...x, id: e.target.value } : x))} sx={{ width: 100 }} />
                    <TextField size="small" label="Name" value={c.name} onChange={(e) => setClasses((p) => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} sx={{ width: 120 }} />
                    <TextField size="small" label="Description" value={c.description} onChange={(e) => setClasses((p) => p.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} sx={{ flex: 1 }} />
                    <TextField size="small" label="Icon URL" value={c.iconUrl} onChange={(e) => setClasses((p) => p.map((x, j) => j === i ? { ...x, iconUrl: e.target.value } : x))} sx={{ width: 180 }} />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 1 }}>
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                      <InputLabel>Damage stat</InputLabel>
                      <Select value={c.damageMainStat} label="Damage stat" onChange={(e) => setClasses((p) => p.map((x, j) => j === i ? { ...x, damageMainStat: e.target.value } : x))}>
                        {STAT_IDS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 220 }}>
                      <InputLabel>Primary attack ability</InputLabel>
                      <Select
                        value={c.primaryAttackAbilityId || ''}
                        label="Primary attack ability"
                        onChange={(e) => setClasses((p) => p.map((x, j) => j === i ? { ...x, primaryAttackAbilityId: e.target.value } : x))}
                        displayEmpty
                      >
                        <MenuItem value="">— None (default melee) —</MenuItem>
                        {abilities.filter((a) => a.abilityType === 'primary' && a.id.trim()).map((ab) => (
                          <MenuItem key={ab.id} value={ab.id}>{ab.name || ab.id}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                  <Typography variant="caption" color="text.secondary">Attack slot</Typography>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                    <TextField size="small" label="Allowed tags (comma)" value={c.attackTags} onChange={(e) => setClasses((p) => p.map((x, j) => j === i ? { ...x, attackTags: e.target.value } : x))} placeholder="weapon:sword" sx={{ flex: 1 }} />
                    <FormControlLabel control={<Checkbox size="small" checked={c.attackRequired} onChange={(e) => setClasses((p) => p.map((x, j) => j === i ? { ...x, attackRequired: e.target.checked } : x))} />} label="Required" />
                    <FormControlLabel control={<Checkbox size="small" checked={c.attackAllowEmpty} onChange={(e) => setClasses((p) => p.map((x, j) => j === i ? { ...x, attackAllowEmpty: e.target.checked } : x))} />} label="Allow empty" />
                  </Box>
                  <Typography variant="caption" color="text.secondary">Defense slot</Typography>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
                    <TextField size="small" label="Allowed tags (comma)" value={c.defenseTags} onChange={(e) => setClasses((p) => p.map((x, j) => j === i ? { ...x, defenseTags: e.target.value } : x))} placeholder="armor:light" sx={{ flex: 1 }} />
                    <FormControlLabel control={<Checkbox size="small" checked={c.defenseRequired} onChange={(e) => setClasses((p) => p.map((x, j) => j === i ? { ...x, defenseRequired: e.target.checked } : x))} />} label="Required" />
                    <FormControlLabel control={<Checkbox size="small" checked={c.defenseAllowEmpty} onChange={(e) => setClasses((p) => p.map((x, j) => j === i ? { ...x, defenseAllowEmpty: e.target.checked } : x))} />} label="Allow empty" />
                  </Box>
                  <Typography variant="caption" color="text.secondary">Ability access (IDs from Abilities section)</Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 1 }}>
                    <TextField size="small" label="Regular ability IDs (comma)" value={c.regularAbilityIds} onChange={(e) => setClasses((p) => p.map((x, j) => j === i ? { ...x, regularAbilityIds: e.target.value } : x))} placeholder="fireball, heal" sx={{ minWidth: 220 }} />
                    <TextField size="small" label="Ultimate ability ID" value={c.ultimateAbilityId} onChange={(e) => setClasses((p) => p.map((x, j) => j === i ? { ...x, ultimateAbilityId: e.target.value } : x))} placeholder="ultimate_slash" sx={{ width: 160 }} />
                  </Box>
                  <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel>Resource</InputLabel>
                    <Select value={c.resourceId} label="Resource" onChange={(e) => setClasses((p) => p.map((x, j) => j === i ? { ...x, resourceId: e.target.value } : x))} displayEmpty>
                      <MenuItem value="">— None —</MenuItem>
                      {resources.filter((r) => r.id.trim()).map((r) => (
                        <MenuItem key={r.id} value={r.id}>{r.name || r.id}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <IconButton size="small" color="error" sx={{ mt: 1 }} onClick={() => setClasses((p) => p.filter((_, j) => j !== i))} disabled={classes.length <= 1}>Remove class</IconButton>
                </Paper>
              ))}
              <Button type="button" size="small" variant="outlined" onClick={() => setClasses((p) => [...p, emptyClass()])}>+ Add class</Button>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight={600}>Creatures</Typography></AccordionSummary>
            <AccordionDetails>
              {creatures.map((c, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  <TextField size="small" label="ID" value={c.id} onChange={(e) => setCreatures((p) => p.map((x, j) => j === i ? { ...x, id: e.target.value } : x))} sx={{ width: 90 }} />
                  <TextField size="small" label="Name" value={c.name} onChange={(e) => setCreatures((p) => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} sx={{ width: 100 }} />
                  <Select size="small" value={c.role} onChange={(e) => setCreatures((p) => p.map((x, j) => j === i ? { ...x, role: e.target.value as 'quest' | 'boss' } : x))} sx={{ width: 90 }}>
                    <MenuItem value="quest">quest</MenuItem>
                    <MenuItem value="boss">boss</MenuItem>
                  </Select>
                  <TextField size="small" label="Level" type="number" value={c.level} onChange={(e) => setCreatures((p) => p.map((x, j) => j === i ? { ...x, level: e.target.value } : x))} sx={{ width: 70 }} />
                  <TextField size="small" label="HP" type="number" value={c.hp} onChange={(e) => setCreatures((p) => p.map((x, j) => j === i ? { ...x, hp: e.target.value } : x))} sx={{ width: 70 }} />
                  <TextField size="small" label="AP" type="number" value={c.ap} onChange={(e) => setCreatures((p) => p.map((x, j) => j === i ? { ...x, ap: e.target.value } : x))} sx={{ width: 70 }} />
                  <TextField size="small" label="Armor" type="number" value={c.arm} onChange={(e) => setCreatures((p) => p.map((x, j) => j === i ? { ...x, arm: e.target.value } : x))} sx={{ width: 70 }} />
                  <TextField size="small" label="Icon URL" value={c.iconUrl} onChange={(e) => setCreatures((p) => p.map((x, j) => j === i ? { ...x, iconUrl: e.target.value } : x))} sx={{ width: 140 }} />
                  <TextField size="small" label="Tags (comma)" value={c.tags} onChange={(e) => setCreatures((p) => p.map((x, j) => j === i ? { ...x, tags: e.target.value } : x))} sx={{ flex: 1 }} />
                  <TextField size="small" label="Abilities (comma IDs)" value={c.abilityIds} onChange={(e) => setCreatures((p) => p.map((x, j) => j === i ? { ...x, abilityIds: e.target.value } : x))} placeholder="fireball, heal" sx={{ width: 160 }} />
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Resource</InputLabel>
                    <Select value={c.resourceId} label="Resource" onChange={(e) => setCreatures((p) => p.map((x, j) => j === i ? { ...x, resourceId: e.target.value } : x))} displayEmpty>
                      <MenuItem value="">— None —</MenuItem>
                      {resources.filter((r) => r.id.trim()).map((r) => (
                        <MenuItem key={r.id} value={r.id}>{r.name || r.id}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField size="small" label="Resource Max" type="number" value={c.resourceMax} onChange={(e) => setCreatures((p) => p.map((x, j) => j === i ? { ...x, resourceMax: e.target.value } : x))} sx={{ width: 100 }} />
                  <IconButton size="small" color="error" onClick={() => setCreatures((p) => p.filter((_, j) => j !== i))}>−</IconButton>
                </Box>
              ))}
              <Button type="button" size="small" variant="outlined" onClick={() => setCreatures((p) => [...p, emptyCreature()])}>+ Add creature</Button>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight={600}>Items</Typography></AccordionSummary>
            <AccordionDetails>
              {items.map((item, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  <TextField size="small" label="ID" value={item.id} onChange={(e) => setItems((p) => p.map((x, j) => j === i ? { ...x, id: e.target.value } : x))} sx={{ width: 90 }} />
                  <TextField size="small" label="Name" value={item.name} onChange={(e) => setItems((p) => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} sx={{ width: 100 }} />
                  <FormControl size="small" sx={{ width: 120 }}>
                    <InputLabel id={`item-rarity-${i}`}>Rarity</InputLabel>
                    <Select
                      labelId={`item-rarity-${i}`}
                      label="Rarity"
                      value={RARITIES.includes(item.rarity as typeof RARITIES[number]) ? item.rarity : 'common'}
                      onChange={(e) => setItems((p) => p.map((x, j) => j === i ? { ...x, rarity: e.target.value } : x))}
                    >
                      {RARITIES.map((r) => (
                        <MenuItem key={r} value={r}>{r}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ width: 120 }}>
                    <InputLabel id={`item-slot-${i}`}>Slot</InputLabel>
                    <Select
                      labelId={`item-slot-${i}`}
                      label="Slot"
                      value={item.slot}
                      onChange={(e) => setItems((p) => p.map((x, j) => j === i ? { ...x, slot: e.target.value } : x))}
                    >
                      {SLOTS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <TextField size="small" label="Tags (comma)" value={item.tags} onChange={(e) => setItems((p) => p.map((x, j) => j === i ? { ...x, tags: e.target.value } : x))} placeholder="weapon:sword" sx={{ width: 140 }} />
                  <TextField size="small" label="Stats (STR:2, ARM:5)" value={item.stats} onChange={(e) => setItems((p) => p.map((x, j) => j === i ? { ...x, stats: e.target.value } : x))} sx={{ width: 140 }} />
                  <TextField size="small" label="Icon URL" value={item.iconUrl} onChange={(e) => setItems((p) => p.map((x, j) => j === i ? { ...x, iconUrl: e.target.value } : x))} sx={{ width: 120 }} />
                  <TextField size="small" label="Animation URL (weapon tip-up)" value={item.animationUrl} onChange={(e) => setItems((p) => p.map((x, j) => j === i ? { ...x, animationUrl: e.target.value } : x))} placeholder="for projectile frame" sx={{ width: 140 }} />
                  <TextField size="small" label="Projectile URL" value={item.projectileUrl} onChange={(e) => setItems((p) => p.map((x, j) => j === i ? { ...x, projectileUrl: e.target.value } : x))} placeholder="custom projectile" sx={{ width: 120 }} />
                  <TextField size="small" label="Impact URL" value={item.impactUrl} onChange={(e) => setItems((p) => p.map((x, j) => j === i ? { ...x, impactUrl: e.target.value } : x))} placeholder="custom impact" sx={{ width: 120 }} />
                  <TextField size="small" label="Price currency" value={item.priceCurrencyId} onChange={(e) => setItems((p) => p.map((x, j) => j === i ? { ...x, priceCurrencyId: e.target.value } : x))} placeholder="gold" sx={{ width: 90 }} />
                  <TextField size="small" label="Price" type="number" value={item.priceAmount} onChange={(e) => setItems((p) => p.map((x, j) => j === i ? { ...x, priceAmount: e.target.value } : x))} sx={{ width: 70 }} />
                  <IconButton size="small" color="error" onClick={() => setItems((p) => p.filter((_, j) => j !== i))}>−</IconButton>
                </Box>
              ))}
              <Button type="button" size="small" variant="outlined" onClick={() => setItems((p) => [...p, emptyItem()])}>+ Add item</Button>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight={600}>Quests</Typography></AccordionSummary>
            <AccordionDetails>
              {quests.map((q, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  <TextField size="small" label="ID" value={q.id} onChange={(e) => setQuests((p) => p.map((x, j) => j === i ? { ...x, id: e.target.value } : x))} sx={{ width: 90 }} />
                  <TextField size="small" label="Name" value={q.name} onChange={(e) => setQuests((p) => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} sx={{ width: 120 }} />
                  <TextField size="small" label="Creature ID" value={q.creatureId} onChange={(e) => setQuests((p) => p.map((x, j) => j === i ? { ...x, creatureId: e.target.value } : x))} sx={{ width: 100 }} />
                  <TextField size="small" label="Duration (sec)" type="number" value={q.durationSec} onChange={(e) => setQuests((p) => p.map((x, j) => j === i ? { ...x, durationSec: e.target.value } : x))} sx={{ width: 100 }} />
                  <TextField size="small" label="Reward XP" type="number" value={q.rewardXp} onChange={(e) => setQuests((p) => p.map((x, j) => j === i ? { ...x, rewardXp: e.target.value } : x))} sx={{ width: 90 }} />
                  <TextField size="small" label="Reward currency (gold:25)" value={q.rewardCurrency} onChange={(e) => setQuests((p) => p.map((x, j) => j === i ? { ...x, rewardCurrency: e.target.value } : x))} sx={{ width: 140 }} />
                  <TextField size="small" label="Loot table ID" value={q.lootTableId} onChange={(e) => setQuests((p) => p.map((x, j) => j === i ? { ...x, lootTableId: e.target.value } : x))} sx={{ width: 100 }} />
                  <TextField size="small" label="Icon URL" value={q.iconUrl} onChange={(e) => setQuests((p) => p.map((x, j) => j === i ? { ...x, iconUrl: e.target.value } : x))} sx={{ width: 120 }} />
                  <IconButton size="small" color="error" onClick={() => setQuests((p) => p.filter((_, j) => j !== i))}>−</IconButton>
                </Box>
              ))}
              <Button type="button" size="small" variant="outlined" onClick={() => setQuests((p) => [...p, emptyQuest()])}>+ Add quest</Button>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight={600}>Dungeons</Typography></AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Each dungeon has a boss creature; select from your creatures (use role &quot;boss&quot; for bosses).
              </Typography>
              {dungeons.map((d, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
                  <TextField size="small" label="ID" value={d.id} onChange={(e) => setDungeons((p) => p.map((x, j) => j === i ? { ...x, id: e.target.value } : x))} sx={{ width: 100 }} />
                  <TextField size="small" label="Name" value={d.name} onChange={(e) => setDungeons((p) => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} sx={{ width: 120 }} />
                  <TextField size="small" label="Description" value={d.description} onChange={(e) => setDungeons((p) => p.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} placeholder="Optional" sx={{ width: 180 }} />
                  <TextField size="small" label="Image URL" value={d.imageUrl} onChange={(e) => setDungeons((p) => p.map((x, j) => j === i ? { ...x, imageUrl: e.target.value } : x))} placeholder="Dungeon card image" sx={{ width: 200 }} />
                  <TextField size="small" label="Required level" type="number" value={d.requiredLevel} onChange={(e) => setDungeons((p) => p.map((x, j) => j === i ? { ...x, requiredLevel: e.target.value } : x))} inputProps={{ min: 1 }} sx={{ width: 110 }} />
                  <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel>Boss creature</InputLabel>
                    <Select value={d.bossCreatureId} label="Boss creature" onChange={(e) => setDungeons((p) => p.map((x, j) => j === i ? { ...x, bossCreatureId: e.target.value } : x))} displayEmpty>
                      <MenuItem value="">— Select —</MenuItem>
                      {creatures.filter((c) => c.id.trim()).map((c) => (
                        <MenuItem key={c.id} value={c.id}>{c.name || c.id} {c.role === 'boss' ? '(boss)' : ''}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <IconButton size="small" color="error" onClick={() => setDungeons((p) => p.filter((_, j) => j !== i))}>−</IconButton>
                </Box>
              ))}
              <Button type="button" size="small" variant="outlined" onClick={() => setDungeons((p) => [...p, emptyDungeon()])}>+ Add dungeon</Button>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight={600}>Raids</Typography></AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Raids are guild encounters. Cost is paid from guild stock when the leader prepares the raid.
              </Typography>
              {raids.map((r, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
                  <TextField size="small" label="ID" value={r.id} onChange={(e) => setRaids((p) => p.map((x, j) => j === i ? { ...x, id: e.target.value } : x))} sx={{ width: 100 }} />
                  <TextField size="small" label="Name" value={r.name} onChange={(e) => setRaids((p) => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} sx={{ width: 120 }} />
                  <TextField size="small" label="Description" value={r.description} onChange={(e) => setRaids((p) => p.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} placeholder="Optional" sx={{ width: 180 }} />
                  <TextField size="small" label="Image URL" value={r.imageUrl} onChange={(e) => setRaids((p) => p.map((x, j) => j === i ? { ...x, imageUrl: e.target.value } : x))} placeholder="Raid card image" sx={{ width: 200 }} />
                  <TextField size="small" label="Required level" type="number" value={r.requiredLevel} onChange={(e) => setRaids((p) => p.map((x, j) => j === i ? { ...x, requiredLevel: e.target.value } : x))} inputProps={{ min: 1 }} sx={{ width: 110 }} />
                  <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel>Boss creature</InputLabel>
                    <Select value={r.bossCreatureId} label="Boss creature" onChange={(e) => setRaids((p) => p.map((x, j) => j === i ? { ...x, bossCreatureId: e.target.value } : x))} displayEmpty>
                      <MenuItem value="">— Select —</MenuItem>
                      {creatures.filter((c) => c.id.trim()).map((c) => (
                        <MenuItem key={c.id} value={c.id}>{c.name || c.id} {c.role === 'boss' ? '(boss)' : ''}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Cost currency</InputLabel>
                    <Select value={r.currencyId} label="Cost currency" onChange={(e) => setRaids((p) => p.map((x, j) => j === i ? { ...x, currencyId: e.target.value } : x))} displayEmpty>
                      <MenuItem value="">— Select —</MenuItem>
                      {currencies.filter((c) => c.id.trim()).map((c) => (
                        <MenuItem key={c.id} value={c.id}>{c.name || c.id}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField size="small" label="Cost amount" type="number" value={r.costAmount} onChange={(e) => setRaids((p) => p.map((x, j) => j === i ? { ...x, costAmount: e.target.value } : x))} inputProps={{ min: 0 }} sx={{ width: 100 }} />
                  <IconButton size="small" color="error" onClick={() => setRaids((p) => p.filter((_, j) => j !== i))}>−</IconButton>
                </Box>
              ))}
              <Button type="button" size="small" variant="outlined" onClick={() => setRaids((p) => [...p, emptyRaid()])}>+ Add raid</Button>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight={600}>Merchant listings</Typography></AccordionSummary>
            <AccordionDetails>
              {listings.map((l, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField size="small" label="Item ID" value={l.itemId} onChange={(e) => setListings((p) => p.map((x, j) => j === i ? { ...x, itemId: e.target.value } : x))} sx={{ width: 120 }} />
                  <TextField size="small" label="Currency ID" value={l.currencyId} onChange={(e) => setListings((p) => p.map((x, j) => j === i ? { ...x, currencyId: e.target.value } : x))} sx={{ width: 100 }} />
                  <TextField size="small" label="Price" type="number" value={l.price} onChange={(e) => setListings((p) => p.map((x, j) => j === i ? { ...x, price: Number(e.target.value) || 0 } : x))} sx={{ width: 90 }} />
                  <IconButton size="small" color="error" onClick={() => setListings((p) => p.filter((_, j) => j !== i))}>−</IconButton>
                </Box>
              ))}
              <Button type="button" size="small" variant="outlined" onClick={() => setListings((p) => [...p, { itemId: '', currencyId: '', price: 0 }])}>+ Add listing</Button>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight={600}>Loot tables</Typography></AccordionSummary>
            <AccordionDetails>
              {lootTables.map((t, ti) => (
                <Paper key={ti} variant="outlined" sx={{ p: 2, mb: 2 }}>
                  <TextField size="small" label="Loot table ID" value={t.id} onChange={(e) => setLootTables((p) => p.map((x, j) => j === ti ? { ...x, id: e.target.value } : x))} sx={{ width: 180, mr: 2 }} />
                  <IconButton size="small" color="error" onClick={() => setLootTables((p) => p.filter((_, j) => j !== ti))}>Remove table</IconButton>
                  {t.entries.map((e, ei) => (
                    <Box key={ei} sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <TextField size="small" label="Item ID" value={e.itemId} onChange={(ev) => setLootTables((p) => p.map((tbl, j) => j !== ti ? tbl : { ...tbl, entries: tbl.entries.map((ent, k) => k === ei ? { ...ent, itemId: ev.target.value } : ent) }))} sx={{ width: 120 }} />
                      <TextField size="small" label="Weight" type="number" value={e.weight} onChange={(ev) => setLootTables((p) => p.map((tbl, j) => j !== ti ? tbl : { ...tbl, entries: tbl.entries.map((ent, k) => k === ei ? { ...ent, weight: ev.target.value } : ent) }))} sx={{ width: 80 }} />
                      <TextField size="small" label="Class ID (optional)" value={e.classId} onChange={(ev) => setLootTables((p) => p.map((tbl, j) => j !== ti ? tbl : { ...tbl, entries: tbl.entries.map((ent, k) => k === ei ? { ...ent, classId: ev.target.value } : ent) }))} sx={{ width: 100 }} />
                      <IconButton size="small" onClick={() => setLootTables((p) => p.map((tbl, j) => j !== ti ? tbl : { ...tbl, entries: tbl.entries.filter((_, k) => k !== ei) }))}>−</IconButton>
                    </Box>
                  ))}
                  <Button type="button" size="small" onClick={() => setLootTables((p) => p.map((tbl, j) => j !== ti ? tbl : { ...tbl, entries: [...tbl.entries, emptyLootEntry()] }))}>+ Add entry</Button>
                  {ti === lootTables.length - 1 && (
                    <Button type="button" size="small" variant="outlined" sx={{ ml: 2 }} onClick={() => setLootTables((p) => [...p, { id: '', entries: [emptyLootEntry()] }])}>+ Add loot table</Button>
                  )}
                </Paper>
              ))}
              {lootTables.length === 0 && (
                <Button type="button" size="small" variant="outlined" onClick={() => setLootTables([{ id: '', entries: [emptyLootEntry()] }])}>+ Add loot table</Button>
              )}
            </AccordionDetails>
          </Accordion>

          {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
            <Button type="submit" variant="contained" color="primary" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save changes'}
            </Button>
            <Button component={Link} to={`/fables/${fableId}`} variant="outlined" color="primary" disabled={submitting}>Cancel</Button>
          </Box>
        </form>
      </Container>
    </Box>
  )
}
