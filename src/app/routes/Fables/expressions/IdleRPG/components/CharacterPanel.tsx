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
import type { CharacterState, IdleRpgPackV1, ItemTemplate } from '@features/idle-rpg/api'
import charBackground from '../../../../../../assets/backgrounds/charBackground.png'
import { allocateStat, equipItem } from '@features/idle-rpg/api'
import { computePlayerCombatStats } from '../utils/combatStats'
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

const DEFAULT_MAIN_STAT_INFO: Record<string, { label: string; description: string }> = {
  STR: { label: 'Strength', description: 'Main stat used by allocation and derived formulas.' },
  DEX: { label: 'Dexterity', description: 'Main stat used by allocation and derived formulas.' },
  INT: { label: 'Intelligence', description: 'Main stat used by allocation and derived formulas.' },
  LCK: { label: 'Luck', description: 'Main stat used by allocation and derived formulas.' },
}

function resolveMainStatRows(pack: IdleRpgPackV1): Array<{ id: string; label: string; description: string }> {
  const configured = (pack.mainStats ?? [])
    .map((s) => ({ id: s.id, label: s.name || s.id, description: s.description || 'Main stat.' }))
    .filter((s) => !!s.id)
  if (configured.length > 0) return configured
  return ['STR', 'DEX', 'INT', 'LCK'].map((id) => ({
    id,
    label: DEFAULT_MAIN_STAT_INFO[id]?.label ?? id,
    description: DEFAULT_MAIN_STAT_INFO[id]?.description ?? 'Main stat.',
  }))
}

function computeMainStatTotals(
  character: CharacterState,
  pack: IdleRpgPackV1,
): Record<string, number> {
  const cls = pack.classes.find((c) => c.id === character.classId)
  const rows = resolveMainStatRows(pack)
  const statIds = new Set(rows.map((r) => r.id))
  const base: Record<string, number> = {}

  for (const [k, v] of Object.entries(cls?.starting?.mainStats ?? {})) {
    base[k] = (base[k] ?? 0) + (v ?? 0)
  }
  if (cls?.starting?.stats) {
    for (const [k, v] of Object.entries(cls.starting.stats)) {
      if (!statIds.has(k)) continue
      base[k] = (base[k] ?? 0) + (v ?? 0)
    }
  }
  const itemMap = new Map(pack.items.map((it) => [it.id, it]))
  for (const itemId of Object.values(character.equipment)) {
    if (!itemId) continue
    const item = itemMap.get(itemId)
    if (!item) continue
    for (const [k, v] of Object.entries(item.mainStatBonuses ?? {})) {
      base[k] = (base[k] ?? 0) + (v ?? 0)
    }
    for (const [k, v] of Object.entries(item.stats ?? {})) {
      if (!statIds.has(k)) continue
      base[k] = (base[k] ?? 0) + (v ?? 0)
    }
  }
  for (const [k, v] of Object.entries(character.allocatedStats ?? {})) {
    if (!statIds.has(k)) continue
    base[k] = (base[k] ?? 0) + (v ?? 0)
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
  const itemMap = new Map(pack.items.map((it) => [it.id, it]))
  const totalStats = computeMainStatTotals(character, pack)
  const mainStatRows = resolveMainStatRows(pack)
  const combatStats = computePlayerCombatStats(character, pack)

  const xpTable = pack.rules.xpTable ?? {}
  const maxLevel = pack.rules.maxLevel ?? 10

  const equippedAttack = character.equipment.attack_source ? itemMap.get(character.equipment.attack_source) : undefined
  const equippedDefense = character.equipment.defense_layer ? itemMap.get(character.equipment.defense_layer) : undefined
  const primaryCurrency = pack.economy.currencies[0]

  const handleAllocate = async (stat: string) => {
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

  const baseHp = combatStats.maxHp
  const baseArm = combatStats.arm
  const displayHp = Math.max(0, Math.ceil(baseHp))

  const resourceDef = cls?.resourceId
    ? (pack.resources ?? []).find((r) => r.id === cls.resourceId) ?? null
    : null
  const displayResourceMax = resourceDef ? Math.max(0, Math.ceil(resourceDef.max)) : 0

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
            label={`HP ${displayHp}`}
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
          <Tooltip title={`${resourceDef.name}: ${resourceDef.isGenerative ? 'Generated by attacks, starts at 0' : `Starts at full (${displayResourceMax})`}`} arrow>
            <Chip
              label={`${resourceDef.name} ${displayResourceMax}`}
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
        {mainStatRows.map((row) => {
          const stat = row.id
          const total = totalStats[stat] ?? 0
          const allocated = (character.allocatedStats ?? {})[stat] ?? 0
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
                border: '1px solid transparent',
              }}
            >
              <Tooltip title={row.description} arrow placement="left">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1, cursor: 'help' }}>
                  <Typography
                    variant="body2"
                    fontWeight={500}
                    sx={{ width: 52, color: 'text.primary', fontSize: '0.9rem' }}
                  >
                    {stat}
                  </Typography>
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
                  <Tooltip title={`Spend 1 point on ${row.label}`} arrow>
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

