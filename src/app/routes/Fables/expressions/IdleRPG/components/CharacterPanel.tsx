import { useState } from 'react'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Paper from '@mui/material/Paper'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import PersonIcon from '@mui/icons-material/Person'
import ShieldIcon from '@mui/icons-material/Shield'
import SwordIcon from '@mui/icons-material/SportsMartialArts'
import type { CharacterState, IdleRpgPackV1, ItemTemplate } from '../../../../../../services/api'
import charBackground from '../../../../../../assets/backgrounds/charBackground.png'
import { allocateStat, equipItem } from '../../../../../../services/api'
import ItemView from './ItemView'

interface Props {
  fableId: string
  realmId: string
  character: CharacterState
  pack: IdleRpgPackV1
  onCharacterUpdate: (c: CharacterState) => void
  /** When true, hide stat allocation and equipment unequip (view-only, e.g. guild roster). */
  readOnly?: boolean
}

type StatId = 'STR' | 'DEX' | 'INT' | 'LCK' | 'HP' | 'ARM'

const STAT_ORDER: StatId[] = ['STR', 'DEX', 'INT', 'LCK', 'HP', 'ARM']

const STAT_INFO: Record<StatId, { label: string; description: string }> = {
  STR: { label: 'Strength', description: 'Increases damage for Strength-based classes. Each point adds +1 AP if STR is your main stat.' },
  DEX: { label: 'Dexterity', description: 'Increases damage for Dexterity-based classes. (Future: dodge chance).' },
  INT: { label: 'Intelligence', description: 'Increases damage for Intelligence/magic classes.' },
  LCK: { label: 'Luck', description: 'Increases critical hit chance (future update).' },
  HP: { label: 'Health', description: 'Directly adds maximum hit points (+1 HP per point).' },
  ARM: { label: 'Armor', description: 'Reduces incoming damage by a flat amount (-1 damage taken per point).' },
}

function computeTotalStats(
  character: CharacterState,
  pack: IdleRpgPackV1,
): Record<StatId, number> {
  const cls = pack.classes.find((c) => c.id === character.classId)
  const base: Record<StatId, number> = { STR: 0, DEX: 0, INT: 0, LCK: 0, HP: 0, ARM: 0 }

  if (cls?.starting?.stats) {
    for (const [k, v] of Object.entries(cls.starting.stats)) base[k as StatId] = (base[k as StatId] ?? 0) + (v ?? 0)
  }
  const itemMap = new Map(pack.items.map((it) => [it.id, it]))
  for (const itemId of Object.values(character.equipment)) {
    if (!itemId) continue
    const item = itemMap.get(itemId)
    if (!item?.stats) continue
    for (const [k, v] of Object.entries(item.stats)) base[k as StatId] = (base[k as StatId] ?? 0) + (v ?? 0)
  }
  for (const [k, v] of Object.entries(character.allocatedStats ?? {})) {
    base[k as StatId] = (base[k as StatId] ?? 0) + (v ?? 0)
  }
  return base
}

function XpBar({ xp, level, xpTable, maxLevel }: { xp: number; level: number; xpTable: Record<string, number>; maxLevel: number }) {
  const nextLevel = level + 1
  const nextXp = xpTable[String(nextLevel)] ?? null
  if (level >= maxLevel || nextXp === null) {
    return <Typography variant="caption" color="text.secondary" fontWeight={600}>Max level</Typography>
  }
  const prevXp = xpTable[String(level)] ?? 0
  const progress = Math.min(100, ((xp - prevXp) / (nextXp - prevXp)) * 100)
  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={700}>XP</Typography>
        <Typography variant="caption" color="text.secondary">{xp} / {nextXp}</Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          borderRadius: 5,
          height: 10,
          bgcolor: 'rgba(168,85,247,0.1)',
          border: '1px solid rgba(168,85,247,0.12)',
          '& .MuiLinearProgress-bar': {
            borderRadius: 5,
            background: 'linear-gradient(90deg, #c084fc, #a855f7)',
            boxShadow: '0 0 8px rgba(168,85,247,0.3)',
          },
        }}
      />
    </Box>
  )
}

function EquipmentSlot({
  slot,
  label,
  icon,
  equippedItem,
  currency,
  onUnequip,
  unequipping,
  readOnly,
}: {
  slot: string
  label: string
  icon: React.ReactNode
  equippedItem?: ItemTemplate
  currency?: { id: string; name: string; iconUrl?: string }
  onUnequip: (slot: string) => void
  unequipping: string | null
  readOnly?: boolean
}) {
  if (equippedItem) {
    return (
      <Tooltip title={readOnly ? undefined : 'Click to unequip'} arrow>
        <Box
          onClick={readOnly ? undefined : () => onUnequip(slot)}
          sx={{
            cursor: readOnly ? 'default' : unequipping ? 'default' : 'pointer',
            opacity: unequipping ? 0.5 : 1,
            transition: 'opacity 0.2s',
            pointerEvents: readOnly || unequipping ? 'none' : 'auto',
          }}
        >
          <ItemView item={equippedItem} currency={currency} size={84} />
        </Box>
      </Tooltip>
    )
  }

  return (
    <Tooltip title={`${label} slot — empty`} arrow>
      <Paper
        variant="outlined"
        sx={{
          width: 84,
          height: 84,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.5,
          bgcolor: 'rgba(168,85,247,0.04)',
          borderStyle: 'dashed',
          borderColor: 'rgba(168,85,247,0.15)',
          borderWidth: 2,
        }}
      >
        <Box sx={{ color: 'rgba(168,85,247,0.25)', opacity: 0.6 }}>{icon}</Box>
        <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled' }}>{label}</Typography>
      </Paper>
    </Tooltip>
  )
}

export default function CharacterPanel({ fableId, realmId, character, pack, onCharacterUpdate, readOnly = false }: Props) {
  const [allocating, setAllocating] = useState<string | null>(null)
  const [unequipping, setUnequipping] = useState<string | null>(null)

  const cls = pack.classes.find((c) => c.id === character.classId)
  const mainStat = cls?.scaling?.damageMainStat ?? 'STR'
  const itemMap = new Map(pack.items.map((it) => [it.id, it]))
  const totalStats = computeTotalStats(character, pack)

  const xpTable = pack.rules.xpTable ?? {}
  const maxLevel = pack.rules.maxLevel ?? 10

  const equippedAttack = character.equipment.attack_source ? itemMap.get(character.equipment.attack_source) : undefined
  const equippedDefense = character.equipment.defense_layer ? itemMap.get(character.equipment.defense_layer) : undefined
  const primaryCurrency = pack.economy.currencies[0]

  const handleAllocate = async (stat: StatId) => {
    if (allocating || (character.statPoints ?? 0) <= 0) return
    setAllocating(stat)
    try {
      const updated = await allocateStat(fableId, realmId, character.id, stat)
      onCharacterUpdate(updated)
    } finally {
      setAllocating(null)
    }
  }

  const handleUnequip = async (slot: string) => {
    if (unequipping) return
    setUnequipping(slot)
    try {
      const updated = await equipItem(fableId, realmId, character.id, slot, undefined)
      onCharacterUpdate(updated)
    } finally {
      setUnequipping(null)
    }
  }

  const baseHp = 50 + character.level * 10 + (totalStats.HP ?? 0)
  const baseAp = character.level * 2 + (totalStats[mainStat as StatId] ?? 0)
  const baseArm = totalStats.ARM ?? 0

  const resourceDef = cls?.resourceId
    ? (pack.resources ?? []).find((r) => r.id === cls.resourceId) ?? null
    : null

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, width: '100%' }}>

      {/* Portrait + equipment slots */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <EquipmentSlot
          slot="attack_source"
          label="Weapon"
          icon={<SwordIcon fontSize="small" />}
          equippedItem={equippedAttack}
          currency={primaryCurrency}
          onUnequip={handleUnequip}
          unequipping={unequipping}
          readOnly={readOnly}
        />

        {/* Portrait */}
        <Box
          sx={{
            width: 250,
            height: 250,
            borderRadius: '50%',
            overflow: 'hidden',
            border: '3px solid rgba(168,85,247,0.45)',
            boxShadow: '0 0 24px 4px rgba(168,85,247,0.25), inset 0 0 16px rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundImage: `url(${charBackground})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            flexShrink: 0,
          }}
        >
          {(character.portraitUrl ?? cls?.iconUrl) ? (
            <Box component="img" src={character.portraitUrl ?? cls?.iconUrl} alt={character.name} sx={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'drop-shadow(0 0 8px rgba(168,85,247,0.6)) drop-shadow(0 0 20px rgba(168,85,247,0.3))' }} />
          ) : (
            <PersonIcon sx={{ fontSize: 60, color: 'rgba(168,85,247,0.3)' }} />
          )}
        </Box>

        <EquipmentSlot
          slot="defense_layer"
          label="Armor"
          icon={<ShieldIcon fontSize="small" />}
          equippedItem={equippedDefense}
          currency={primaryCurrency}
          onUnequip={handleUnequip}
          unequipping={unequipping}
          readOnly={readOnly}
        />
      </Box>

      {/* Name, class, level */}
      <Box sx={{ textAlign: 'center' }}>
        <Typography
          variant="h5"
          fontWeight={800}
          lineHeight={1.2}
          sx={{
            background: 'linear-gradient(90deg, #e8e4f0, #c084fc)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {character.name}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 0.25, fontWeight: 500 }}>
          {cls?.name ?? character.classId} · Lv {character.level}
        </Typography>
      </Box>

      {/* XP bar */}
      <Box sx={{ width: '100%' }}>
        <XpBar xp={character.xp} level={character.level} xpTable={xpTable} maxLevel={maxLevel} />
      </Box>

      {/* Unspent stat points banner */}
      {!readOnly && (character.statPoints ?? 0) > 0 && (
        <Chip
          label={`${character.statPoints} unspent stat point${character.statPoints !== 1 ? 's' : ''}!`}
          size="small"
          sx={{
            fontWeight: 700,
            fontSize: 13,
            height: 28,
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            color: '#000',
            boxShadow: '0 0 14px rgba(245,158,11,0.4)',
            animation: 'glow-pulse 2s infinite',
            '@keyframes glow-pulse': {
              '0%,100%': { boxShadow: '0 0 14px rgba(245,158,11,0.4)' },
              '50%': { boxShadow: '0 0 22px rgba(245,158,11,0.7)' },
            },
          }}
        />
      )}

      <Divider sx={{ width: '100%', borderColor: 'rgba(168,85,247,0.12)' }} />

      {/* Combat stats summary */}
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Tooltip title="Max hit points in combat" arrow>
          <Chip
            label={`HP ${baseHp}`}
            size="small"
            sx={{
              fontWeight: 700,
              fontSize: 13,
              height: 28,
              bgcolor: 'rgba(239,68,68,0.12)',
              color: '#f87171',
              border: '1px solid rgba(239,68,68,0.3)',
            }}
          />
        </Tooltip>
        <Tooltip title="Attack power (damage per hit)" arrow>
          <Chip
            label={`AP ${Math.max(1, baseAp)}`}
            size="small"
            sx={{
              fontWeight: 700,
              fontSize: 13,
              height: 28,
              bgcolor: 'rgba(245,158,11,0.12)',
              color: '#fbbf24',
              border: '1px solid rgba(245,158,11,0.3)',
            }}
          />
        </Tooltip>
        <Tooltip title="Armor (damage reduction)" arrow>
          <Chip
            label={`ARM ${Math.max(0, baseArm)}`}
            size="small"
            sx={{
              fontWeight: 700,
              fontSize: 13,
              height: 28,
              bgcolor: 'rgba(99,102,241,0.12)',
              color: '#818cf8',
              border: '1px solid rgba(99,102,241,0.3)',
            }}
          />
        </Tooltip>
        {resourceDef && (
          <Tooltip title={`${resourceDef.name}: ${resourceDef.isGenerative ? 'Generated by attacks, starts at 0' : `Starts at full (${resourceDef.max})`}`} arrow>
            <Chip
              label={`${resourceDef.name} ${resourceDef.max}`}
              size="small"
              sx={{
                fontWeight: 700,
                fontSize: 13,
                height: 28,
                bgcolor: `${resourceDef.colorHex.startsWith('#') ? resourceDef.colorHex : '#' + resourceDef.colorHex}22`,
                color: resourceDef.colorHex.startsWith('#') ? resourceDef.colorHex : `#${resourceDef.colorHex}`,
                border: `1px solid ${resourceDef.colorHex.startsWith('#') ? resourceDef.colorHex : '#' + resourceDef.colorHex}55`,
              }}
            />
          </Tooltip>
        )}
      </Box>

      <Divider sx={{ width: '100%', borderColor: 'rgba(168,85,247,0.12)' }} />

      {/* Stat rows */}
      <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {STAT_ORDER.map((stat) => {
          const info = STAT_INFO[stat]
          const total = totalStats[stat] ?? 0
          const allocated = (character.allocatedStats ?? {})[stat] ?? 0
          const isMainStat = stat === mainStat
          const canAllocate = (character.statPoints ?? 0) > 0
          return (
            <Box
              key={stat}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1,
                py: 0.5,
                borderRadius: 1.5,
                bgcolor: isMainStat ? 'rgba(245,158,11,0.08)' : 'transparent',
                border: isMainStat ? '1px solid rgba(245,158,11,0.15)' : '1px solid transparent',
              }}
            >
              <Tooltip title={info.description} arrow placement="left">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1, cursor: 'help' }}>
                  <Typography
                    variant="body2"
                    fontWeight={isMainStat ? 800 : 500}
                    sx={{ width: 36, color: isMainStat ? '#fbbf24' : 'text.primary', fontSize: '0.9rem' }}
                  >
                    {stat}
                  </Typography>
                  {isMainStat && (
                    <Typography variant="caption" sx={{ color: '#fbbf24', fontSize: 12 }}>★</Typography>
                  )}
                </Box>
              </Tooltip>
              <Typography variant="body1" fontWeight={700} sx={{ width: 32, textAlign: 'right' }}>
                {total}
              </Typography>
              {allocated > 0 && (
                <Typography variant="caption" sx={{ fontSize: 11, color: '#4ade80', fontWeight: 700 }}>
                  +{allocated}
                </Typography>
              )}
              <Box sx={{ width: 32, display: 'flex', justifyContent: 'center' }}>
                {!readOnly && canAllocate && (
                  <Tooltip title={`Spend 1 point on ${info.label}`} arrow>
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => handleAllocate(stat)}
                        disabled={!!allocating}
                        sx={{
                          p: 0.25,
                          color: '#4ade80',
                          '&:hover': { bgcolor: 'rgba(34,197,94,0.12)' },
                        }}
                      >
                        <AddCircleOutlineIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                )}
              </Box>
            </Box>
          )
        })}
      </Box>

      {/* Gold */}
      <Divider sx={{ width: '100%', borderColor: 'rgba(168,85,247,0.12)' }} />
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
        {Object.entries(character.balances).map(([currency, amount]) => (
          <Chip
            key={currency}
            label={`${amount} ${currency}`}
            size="small"
            variant="outlined"
            sx={{
              fontWeight: 700,
              fontSize: 13,
              height: 28,
              borderColor: currency === 'gold' ? 'rgba(251,191,36,0.5)' : 'rgba(168,85,247,0.2)',
              color: currency === 'gold' ? '#fbbf24' : 'text.secondary',
              ...(currency === 'gold' && { boxShadow: '0 0 8px rgba(251,191,36,0.15)' }),
            }}
          />
        ))}
      </Box>
    </Box>
  )
}
