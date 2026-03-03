import { useState } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Chip from '@mui/material/Chip'
import Avatar from '@mui/material/Avatar'
import CircularProgress from '@mui/material/CircularProgress'
import { alpha } from '@mui/material/styles'
import StarIcon from '@mui/icons-material/Star'
import LockIcon from '@mui/icons-material/Lock'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { unlockAbility, equipAbilities } from '@features/idle-rpg/api'
import type { CharacterState, IdleRpgPackV1, Ability, Effect } from '@features/idle-rpg/api'

interface Props {
  fableId: string
  realmId: string
  character: CharacterState
  pack: IdleRpgPackV1
  onCharacterUpdate: (c: CharacterState) => void
}

function describeEffect(effect: Effect): string {
  switch (effect.kind) {
    case 'damage':
      return `Deals ${effect.amount ?? '?'} damage`
    case 'heal':
      if (effect.percentage) return `Heals ${effect.percentage}% HP`
      return `Heals ${effect.amount ?? '?'} HP`
    case 'execute':
      return `Executes below ${effect.percentage ?? '?'}%`
    case 'lifesteal':
      return `Deals ${effect.amount ?? '?'} damage, heals ${effect.lifestealPercent ?? '?'}%`
    case 'apply_status':
      return `Applies ${effect.statusEffect?.name ?? 'status'}`
    default:
      return effect.kind
  }
}

export default function AbilitiesTab({ fableId, realmId, character, pack, onCharacterUpdate }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [unlockingId, setUnlockingId] = useState<string | null>(null)
  const [equipping, setEquipping] = useState(false)

  const abilityPoints = character.abilityPoints ?? 0
  const unlockedIds = new Set(character.unlockedAbilityIds ?? [])
  const equippedIds = character.equippedAbilityIds ?? []
  const equippedSet = new Set(equippedIds)
  const abilityMap = new Map((pack.abilities ?? []).map((a) => [a.id, a]))
  const resourceMap = new Map((pack.resources ?? []).map((r) => [r.id, r]))

  const cls = pack.classes.find((c) => c.id === character.classId)

  const primaryAbility =
    (pack.abilities ?? []).find(
      (a) => a.abilityType === 'primary' && a.id === cls?.primaryAttackId,
    ) ?? (pack.abilities ?? []).find((a) => a.abilityType === 'primary')

  // --- slot math ---
  const slotsMap = pack.rules.abilitySlotsByLevel ?? {}
  let currentSlotCount = 0
  for (const [lvlStr, count] of Object.entries(slotsMap)) {
    if (Number(lvlStr) <= character.level) currentSlotCount = Math.max(currentSlotCount, count as number)
  }
  const slotValues = Object.values(slotsMap).map((v) => v as number)
  const maxPossibleSlots = slotValues.length > 0 ? Math.max(currentSlotCount, ...slotValues) : currentSlotCount

  const sortedSlotLevels = Object.entries(slotsMap)
    .map(([lvl, count]) => ({ level: Number(lvl), count: count as number }))
    .sort((a, b) => a.level - b.level)

  function getUnlockLevelForSlot(slotIndex: number): number | undefined {
    const needed = slotIndex + 1
    for (const { level, count } of sortedSlotLevels) {
      if (count >= needed) return level
    }
    return undefined
  }

  // --- class abilities ---
  const regularAbilityIds = cls?.abilities?.regular ?? []
  const ultimateAbilityIds = cls?.abilities?.ultimate ? [cls.abilities.ultimate] : []
  const classAbilities = [...regularAbilityIds, ...ultimateAbilityIds]
    .map((id) => abilityMap.get(id))
    .filter((a): a is Ability => !!a)
    .sort((a, b) => (a.requirements?.minLevel ?? 0) - (b.requirements?.minLevel ?? 0))

  const unlockedNotEquipped = [...unlockedIds]
    .filter((id) => !equippedSet.has(id))
    .map((id) => abilityMap.get(id))
    .filter((a): a is Ability => !!a && a.abilityType !== 'primary')

  // --- handlers ---
  const handleUnlock = async (abilityId: string) => {
    setError(null)
    setUnlockingId(abilityId)
    try {
      const updated = await unlockAbility(fableId, realmId, character.id, abilityId)
      onCharacterUpdate(updated)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to unlock ability')
    } finally {
      setUnlockingId(null)
    }
  }

  const handleEquip = async (abilityId: string) => {
    if (equippedIds.length >= currentSlotCount) return
    setError(null)
    setEquipping(true)
    try {
      const updated = await equipAbilities(fableId, realmId, character.id, [...equippedIds, abilityId])
      onCharacterUpdate(updated)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to equip ability')
    } finally {
      setEquipping(false)
    }
  }

  const handleUnequip = async (abilityId: string) => {
    setError(null)
    setEquipping(true)
    try {
      const updated = await equipAbilities(
        fableId,
        realmId,
        character.id,
        equippedIds.filter((id) => id !== abilityId),
      )
      onCharacterUpdate(updated)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to unequip ability')
    } finally {
      setEquipping(false)
    }
  }

  // --- shared styles ---
  const sectionSx = {
    bgcolor: 'rgba(20,18,31,0.82)',
    borderRadius: 2,
    border: '1px solid rgba(168,85,247,0.15)',
    p: 2,
  } as const

  const gradientTitle = {
    background: 'linear-gradient(90deg, #e8e4f0, #c084fc)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    fontWeight: 700,
    fontSize: '1.1rem',
    mb: 1.5,
  } as const

  const slotsAvailable = equippedIds.length < currentSlotCount

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto', p: 2.5, gap: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Chip
          icon={<StarIcon sx={{ color: '#fbbf24 !important' }} />}
          label={`Ability Points: ${abilityPoints}`}
          sx={{
            bgcolor: alpha('#fbbf24', 0.15),
            color: '#fbbf24',
            fontWeight: 700,
            fontSize: '0.9rem',
            border: '1px solid',
            borderColor: alpha('#fbbf24', 0.3),
          }}
        />
        <Chip
          label={`Level ${character.level}`}
          size="small"
          sx={{ bgcolor: 'rgba(255,255,255,0.08)', color: '#e8e4f0', fontWeight: 600 }}
        />
      </Box>

      {error && (
        <Typography color="error" variant="body2">
          {error}
        </Typography>
      )}

      {/* Ability Slots */}
      <Paper variant="outlined" sx={sectionSx}>
        <Typography sx={gradientTitle}>Ability Slots</Typography>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          {/* Primary Attack */}
          <Tooltip
            title={
              primaryAbility?.effects?.[0]
                ? `${primaryAbility.name} — ${describeEffect(primaryAbility.effects[0])}`
                : 'Primary Attack'
            }
            arrow
          >
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: 1.5,
                border: '2px solid #d4a017',
                bgcolor: alpha('#d4a017', 0.1),
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {primaryAbility?.iconUrl ? (
                <Avatar src={primaryAbility.iconUrl} sx={{ width: 36, height: 36 }} variant="rounded" />
              ) : (
                <Typography sx={{ fontSize: 24, lineHeight: 1 }}>⚔️</Typography>
              )}
              <Typography sx={{ fontSize: 9, color: '#d4a017', fontWeight: 700, mt: 0.25 }}>Primary</Typography>
            </Box>
          </Tooltip>

          {/* Numbered Slots */}
          {Array.from({ length: maxPossibleSlots }, (_, i) => {
            const isSlotUnlocked = i < currentSlotCount
            const equipped = equippedIds[i] ? abilityMap.get(equippedIds[i]) : undefined
            const unlockLevel = getUnlockLevelForSlot(i)

            if (!isSlotUnlocked) {
              return (
                <Tooltip key={`slot-${i}`} title={`Unlocks at level ${unlockLevel ?? '?'}`} arrow>
                  <Box
                    sx={{
                      width: 72,
                      height: 72,
                      borderRadius: 1.5,
                      border: '2px dashed rgba(255,255,255,0.12)',
                      bgcolor: 'rgba(255,255,255,0.03)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0.5,
                    }}
                  >
                    <LockIcon sx={{ color: 'rgba(255,255,255,0.25)', fontSize: 20 }} />
                  </Box>
                </Tooltip>
              )
            }

            if (equipped) {
              return (
                <Box
                  key={`slot-${i}`}
                  sx={{
                    width: 72,
                    height: 72,
                    borderRadius: 1.5,
                    border: '2px solid rgba(168,85,247,0.5)',
                    bgcolor: alpha('#a855f7', 0.1),
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    '&:hover .unequip-btn': { opacity: 1 },
                  }}
                >
                  {equipped.iconUrl ? (
                    <Avatar src={equipped.iconUrl} sx={{ width: 32, height: 32 }} variant="rounded" />
                  ) : (
                    <Typography sx={{ fontSize: 20, lineHeight: 1 }}>✨</Typography>
                  )}
                  <Typography
                    sx={{
                      fontSize: 8,
                      color: '#e8e4f0',
                      mt: 0.25,
                      maxWidth: 64,
                      textAlign: 'center',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {equipped.name}
                  </Typography>
                  <IconButton
                    className="unequip-btn"
                    size="small"
                    onClick={() => handleUnequip(equipped.id)}
                    disabled={equipping}
                    sx={{
                      position: 'absolute',
                      top: -6,
                      right: -6,
                      width: 18,
                      height: 18,
                      bgcolor: 'rgba(239,68,68,0.85)',
                      opacity: 0,
                      transition: 'opacity 0.15s',
                      '&:hover': { bgcolor: 'rgba(239,68,68,1)' },
                    }}
                  >
                    <CloseIcon sx={{ fontSize: 12, color: '#fff' }} />
                  </IconButton>
                </Box>
              )
            }

            return (
              <Box
                key={`slot-${i}`}
                sx={{
                  width: 72,
                  height: 72,
                  borderRadius: 1.5,
                  border: '2px dashed rgba(168,85,247,0.25)',
                  bgcolor: 'rgba(168,85,247,0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AddIcon sx={{ color: 'rgba(168,85,247,0.35)', fontSize: 24 }} />
              </Box>
            )
          })}
        </Box>
      </Paper>

      {/* Unlocked Abilities (not equipped) */}
      {unlockedNotEquipped.length > 0 && (
        <Paper variant="outlined" sx={sectionSx}>
          <Typography sx={gradientTitle}>Unlocked Abilities</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {unlockedNotEquipped.map((ability) => {
              const effectText = ability.effects?.[0] ? describeEffect(ability.effects[0]) : ''
              return (
                <Tooltip key={ability.id} title={slotsAvailable ? 'Click to equip' : 'No empty slots'} arrow>
                  <Paper
                    variant="outlined"
                    onClick={() => !equipping && slotsAvailable && handleEquip(ability.id)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      p: 1,
                      cursor: slotsAvailable ? 'pointer' : 'default',
                      bgcolor: 'rgba(168,85,247,0.06)',
                      borderColor: 'rgba(168,85,247,0.2)',
                      transition: 'all 0.15s',
                      '&:hover': slotsAvailable
                        ? { bgcolor: 'rgba(168,85,247,0.12)', borderColor: 'rgba(168,85,247,0.4)' }
                        : {},
                    }}
                  >
                    {ability.iconUrl ? (
                      <Avatar src={ability.iconUrl} sx={{ width: 32, height: 32 }} variant="rounded" />
                    ) : (
                      <Avatar sx={{ width: 32, height: 32, bgcolor: 'rgba(168,85,247,0.2)' }} variant="rounded">
                        ✦
                      </Avatar>
                    )}
                    <Box>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#e8e4f0' }}>{ability.name}</Typography>
                      {effectText && (
                        <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{effectText}</Typography>
                      )}
                    </Box>
                    {equipping && <CircularProgress size={14} sx={{ color: '#c084fc', ml: 0.5 }} />}
                  </Paper>
                </Tooltip>
              )
            })}
          </Box>
        </Paper>
      )}

      {/* Available Abilities */}
      <Paper
        variant="outlined"
        sx={{ ...sectionSx, flex: 1, minHeight: 200, display: 'flex', flexDirection: 'column' }}
      >
        <Typography sx={gradientTitle}>Available Abilities</Typography>
        <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
          {classAbilities.length === 0 ? (
            <Typography color="text.secondary" variant="body2">
              No abilities defined for this class.
            </Typography>
          ) : (
            classAbilities.map((ability) => {
              const isUnlocked = unlockedIds.has(ability.id)
              const isEquipped = equippedSet.has(ability.id)
              const minLevel = ability.requirements?.minLevel ?? 0
              const levelMet = character.level >= minLevel
              const cost = ability.unlockCost ?? 1
              const canAfford = abilityPoints >= cost
              const effect = ability.effects?.[0]
              const resourceCost = ability.cost?.resourceCost
              const resource = resourceCost ? resourceMap.get(resourceCost.resourceId) : undefined
              const isUltimate = ability.abilityType === 'ultimate'

              let status: 'locked' | 'unlockable' | 'unlocked' | 'equipped'
              if (isEquipped) status = 'equipped'
              else if (isUnlocked) status = 'unlocked'
              else if (levelMet) status = 'unlockable'
              else status = 'locked'

              return (
                <Paper
                  key={ability.id}
                  variant="outlined"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    p: 1.5,
                    bgcolor: isEquipped ? alpha('#a855f7', 0.12) : 'rgba(255,255,255,0.02)',
                    borderColor: isEquipped
                      ? 'rgba(168,85,247,0.5)'
                      : isUltimate
                        ? alpha('#fbbf24', 0.3)
                        : 'rgba(255,255,255,0.08)',
                    opacity: status === 'locked' ? 0.5 : 1,
                    filter: status === 'locked' ? 'grayscale(0.6)' : 'none',
                    transition: 'all 0.15s',
                    '&:hover': status !== 'locked' ? { bgcolor: 'rgba(168,85,247,0.08)' } : {},
                  }}
                >
                  {ability.iconUrl ? (
                    <Avatar src={ability.iconUrl} sx={{ width: 40, height: 40 }} variant="rounded" />
                  ) : (
                    <Avatar
                      sx={{
                        width: 40,
                        height: 40,
                        bgcolor: isUltimate ? alpha('#fbbf24', 0.2) : 'rgba(168,85,247,0.15)',
                        fontSize: 18,
                      }}
                      variant="rounded"
                    >
                      {isUltimate ? '⭐' : '✦'}
                    </Avatar>
                  )}

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#e8e4f0' }}>{ability.name}</Typography>
                      {isUltimate && (
                        <Chip
                          label="Ultimate"
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: 9,
                            fontWeight: 700,
                            bgcolor: alpha('#fbbf24', 0.2),
                            color: '#fbbf24',
                          }}
                        />
                      )}
                    </Box>
                    {ability.description && (
                      <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', mt: 0.25 }}>
                        {ability.description}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                      {effect && (
                        <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                          {describeEffect(effect)}
                        </Typography>
                      )}
                      {ability.cooldownTurns > 0 && (
                        <Chip
                          label={`${ability.cooldownTurns}t CD`}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: 9,
                            bgcolor: 'rgba(255,255,255,0.06)',
                            color: 'rgba(255,255,255,0.5)',
                          }}
                        />
                      )}
                      {resource && resourceCost && (
                        <Chip
                          label={`${resourceCost.amount} ${resource.name}`}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: 9,
                            bgcolor: alpha(resource.colorHex, 0.15),
                            color: resource.colorHex,
                          }}
                        />
                      )}
                      {minLevel > 0 && (
                        <Chip
                          label={`Lv ${minLevel}`}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: 9,
                            bgcolor: 'rgba(255,255,255,0.06)',
                            color: 'rgba(255,255,255,0.5)',
                          }}
                        />
                      )}
                    </Box>
                  </Box>

                  <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                    {status === 'equipped' && (
                      <Chip
                        icon={<CheckCircleIcon sx={{ fontSize: 14, color: '#a855f7 !important' }} />}
                        label="Equipped"
                        size="small"
                        sx={{ bgcolor: alpha('#a855f7', 0.15), color: '#c084fc', fontWeight: 600, fontSize: 11 }}
                      />
                    )}
                    {status === 'unlocked' && (
                      <Chip
                        icon={<CheckCircleIcon sx={{ fontSize: 14, color: '#22c55e !important' }} />}
                        label="Unlocked"
                        size="small"
                        sx={{ bgcolor: alpha('#22c55e', 0.12), color: '#4ade80', fontWeight: 600, fontSize: 11 }}
                      />
                    )}
                    {status === 'unlockable' && (
                      <Button
                        size="small"
                        variant="contained"
                        disabled={!canAfford || unlockingId !== null}
                        onClick={() => handleUnlock(ability.id)}
                        sx={{
                          textTransform: 'none',
                          fontSize: 11,
                          fontWeight: 700,
                          minWidth: 0,
                          px: 1.5,
                          py: 0.5,
                          bgcolor: '#a855f7',
                          '&:hover': { bgcolor: '#9333ea' },
                        }}
                      >
                        {unlockingId === ability.id ? (
                          <CircularProgress size={14} sx={{ color: '#fff' }} />
                        ) : (
                          `Unlock (${cost} AP)`
                        )}
                      </Button>
                    )}
                    {status === 'locked' && (
                      <Tooltip title={`Requires level ${minLevel}`} arrow>
                        <LockIcon sx={{ color: 'rgba(255,255,255,0.25)', fontSize: 20 }} />
                      </Tooltip>
                    )}
                  </Box>
                </Paper>
              )
            })
          )}
        </Box>
      </Paper>
    </Box>
  )
}

