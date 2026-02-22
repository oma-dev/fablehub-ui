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
import { allocateStat, equipItem } from '../../../../../../services/api'

interface Props {
  fableId: string
  realmId: string
  character: CharacterState
  pack: IdleRpgPackV1
  onCharacterUpdate: (c: CharacterState) => void
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

const RARITY_COLORS: Record<string, string> = {
  common: '#9e9e9e',
  rare: '#1565c0',
  legendary: '#e65100',
}

function computeTotalStats(
  character: CharacterState,
  pack: IdleRpgPackV1,
): Record<StatId, number> {
  const cls = pack.classes.find((c) => c.id === character.classId)
  const base: Record<StatId, number> = { STR: 0, DEX: 0, INT: 0, LCK: 0, HP: 0, ARM: 0 }

  // Class starting stats
  if (cls?.starting?.stats) {
    for (const [k, v] of Object.entries(cls.starting.stats)) base[k as StatId] = (base[k as StatId] ?? 0) + (v ?? 0)
  }
  // Equipment bonuses
  const itemMap = new Map(pack.items.map((it) => [it.id, it]))
  for (const itemId of Object.values(character.equipment)) {
    if (!itemId) continue
    const item = itemMap.get(itemId)
    if (!item?.stats) continue
    for (const [k, v] of Object.entries(item.stats)) base[k as StatId] = (base[k as StatId] ?? 0) + (v ?? 0)
  }
  // Allocated stats
  for (const [k, v] of Object.entries(character.allocatedStats ?? {})) {
    base[k as StatId] = (base[k as StatId] ?? 0) + (v ?? 0)
  }
  return base
}

function XpBar({ xp, level, xpTable, maxLevel }: { xp: number; level: number; xpTable: Record<string, number>; maxLevel: number }) {
  const nextLevel = level + 1
  const nextXp = xpTable[String(nextLevel)] ?? null
  if (level >= maxLevel || nextXp === null) {
    return <Typography variant="caption" color="text.secondary">Max level</Typography>
  }
  const prevXp = xpTable[String(level)] ?? 0
  const progress = Math.min(100, ((xp - prevXp) / (nextXp - prevXp)) * 100)
  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
        <Typography variant="caption" color="text.secondary">XP</Typography>
        <Typography variant="caption" color="text.secondary">{xp} / {nextXp}</Typography>
      </Box>
      <LinearProgress variant="determinate" value={progress} sx={{ borderRadius: 4, height: 6 }} />
    </Box>
  )
}

function EquipmentSlot({
  slot,
  label,
  icon,
  equippedItem,
  onUnequip,
  unequipping,
}: {
  slot: string
  label: string
  icon: React.ReactNode
  equippedItem?: ItemTemplate
  onUnequip: (slot: string) => void
  unequipping: string | null
}) {
  const isEmpty = !equippedItem
  return (
    <Tooltip
      title={equippedItem
        ? `${equippedItem.name} (${equippedItem.rarity}) — click to unequip`
        : `${label} slot — empty`}
      arrow
    >
      <Paper
        variant="outlined"
        onClick={() => { if (equippedItem) onUnequip(slot) }}
        sx={{
          width: 72,
          height: 72,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.25,
          cursor: equippedItem ? 'pointer' : 'default',
          bgcolor: isEmpty ? 'action.hover' : 'background.paper',
          borderStyle: 'dashed',
          borderColor: isEmpty ? 'divider' : 'primary.main',
          transition: 'all 0.15s',
          opacity: unequipping === slot ? 0.5 : 1,
          '&:hover': equippedItem ? { borderColor: 'error.main', bgcolor: 'error.light' } : {},
          position: 'relative',
        }}
      >
        {equippedItem ? (
          <>
            <Box sx={{ color: RARITY_COLORS[equippedItem.rarity] ?? 'text.primary' }}>{icon}</Box>
            <Typography variant="caption" align="center" sx={{ fontSize: 9, lineHeight: 1.2, px: 0.5 }} noWrap>
              {equippedItem.name}
            </Typography>
          </>
        ) : (
          <>
            <Box sx={{ color: 'action.disabled', opacity: 0.4 }}>{icon}</Box>
            <Typography variant="caption" sx={{ fontSize: 9, color: 'text.disabled' }}>{label}</Typography>
          </>
        )}
      </Paper>
    </Tooltip>
  )
}

export default function CharacterPanel({ fableId, realmId, character, pack, onCharacterUpdate }: Props) {
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

  // Compute derived combat stats for display
  const baseHp = 50 + character.level * 10 + (totalStats.HP ?? 0)
  const baseAp = character.level * 2 + (totalStats[mainStat as StatId] ?? 0)
  const baseArm = totalStats.ARM ?? 0

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, width: '100%' }}>

      {/* Portrait + equipment slots */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <EquipmentSlot
          slot="attack_source"
          label="Weapon"
          icon={<SwordIcon fontSize="small" />}
          equippedItem={equippedAttack}
          onUnequip={handleUnequip}
          unequipping={unequipping}
        />

        {/* Portrait */}
        <Box
          sx={{
            width: 96,
            height: 96,
            borderRadius: '50%',
            overflow: 'hidden',
            border: '3px solid',
            borderColor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'action.hover',
            flexShrink: 0,
          }}
        >
          {character.portraitUrl ? (
            <Box component="img" src={character.portraitUrl} alt={character.name} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <PersonIcon sx={{ fontSize: 56, color: 'text.disabled' }} />
          )}
        </Box>

        <EquipmentSlot
          slot="defense_layer"
          label="Armor"
          icon={<ShieldIcon fontSize="small" />}
          equippedItem={equippedDefense}
          onUnequip={handleUnequip}
          unequipping={unequipping}
        />
      </Box>

      {/* Name, class, level */}
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="h6" fontWeight={700} lineHeight={1.2}>{character.name}</Typography>
        <Typography variant="body2" color="text.secondary">{cls?.name ?? character.classId} · Lv {character.level}</Typography>
      </Box>

      {/* XP bar */}
      <Box sx={{ width: '100%' }}>
        <XpBar xp={character.xp} level={character.level} xpTable={xpTable} maxLevel={maxLevel} />
      </Box>

      {/* Unspent stat points banner */}
      {(character.statPoints ?? 0) > 0 && (
        <Chip
          label={`${character.statPoints} unspent stat point${character.statPoints !== 1 ? 's' : ''}!`}
          color="warning"
          size="small"
          sx={{ fontWeight: 600, animation: 'pulse 1.5s infinite', '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.6 } } }}
        />
      )}

      <Divider sx={{ width: '100%' }} />

      {/* Combat stats summary */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Tooltip title="Max hit points in combat" arrow>
          <Chip label={`HP ${baseHp}`} size="small" color="error" variant="outlined" />
        </Tooltip>
        <Tooltip title="Attack power (damage per hit)" arrow>
          <Chip label={`AP ${Math.max(1, baseAp)}`} size="small" color="warning" variant="outlined" />
        </Tooltip>
        <Tooltip title="Armor (damage reduction)" arrow>
          <Chip label={`ARM ${Math.max(0, baseArm)}`} size="small" color="info" variant="outlined" />
        </Tooltip>
      </Box>

      <Divider sx={{ width: '100%' }} />

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
                gap: 0.75,
                px: 0.5,
                py: 0.25,
                borderRadius: 1,
                bgcolor: isMainStat ? 'warning.light' : 'transparent',
                opacity: isMainStat ? 1 : undefined,
              }}
            >
              <Tooltip title={info.description} arrow placement="left">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1, cursor: 'help' }}>
                  <Typography variant="body2" fontWeight={isMainStat ? 700 : 400} sx={{ width: 32, color: isMainStat ? 'warning.dark' : 'text.primary' }}>
                    {stat}
                  </Typography>
                  {isMainStat && (
                    <Typography variant="caption" sx={{ color: 'warning.dark', fontSize: 10 }}>★</Typography>
                  )}
                </Box>
              </Tooltip>
              <Typography variant="body2" fontWeight={600} sx={{ width: 28, textAlign: 'right' }}>
                {total}
              </Typography>
              {allocated > 0 && (
                <Typography variant="caption" color="success.main" sx={{ fontSize: 10 }}>
                  +{allocated}
                </Typography>
              )}
              <Box sx={{ width: 28, display: 'flex', justifyContent: 'center' }}>
                {canAllocate && (
                  <Tooltip title={`Spend 1 point on ${info.label}`} arrow>
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => handleAllocate(stat)}
                        disabled={!!allocating}
                        sx={{ p: 0.25, color: 'success.main' }}
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
      <Divider sx={{ width: '100%' }} />
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
        {Object.entries(character.balances).map(([currency, amount]) => (
          <Chip key={currency} label={`${amount} ${currency}`} size="small" color="warning" variant="outlined" />
        ))}
      </Box>
    </Box>
  )
}
