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
import Divider from '@mui/material/Divider'
import { alpha } from '@mui/material/styles'
import StarIcon from '@mui/icons-material/Star'
import LockIcon from '@mui/icons-material/Lock'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import FlashOnIcon from '@mui/icons-material/FlashOn'
import SportsMmaIcon from '@mui/icons-material/SportsMma'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import TuneIcon from '@mui/icons-material/Tune'
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
    case 'summon':
      return `Summons ${effect.summonCreatureId ?? 'creature'}`
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
  const classDefaultAbilityIds = (cls?.defaultAbilityIds ?? []).filter((id) => !!abilityMap.get(id))
  const classDefaultAbilitySet = new Set(classDefaultAbilityIds)

  const primaryAbility =
    (pack.abilities ?? []).find((a) => a.abilityType === 'primary' && a.id === cls?.primaryAttackId)
    ?? (pack.abilities ?? []).find((a) => a.abilityType === 'primary')

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

  const regularAbilityIds = cls?.abilities?.regular ?? []
  const ultimateAbilityIds = cls?.abilities?.ultimate ? [cls.abilities.ultimate] : []
  const classAbilities = [...regularAbilityIds, ...ultimateAbilityIds]
    .map((id) => abilityMap.get(id))
    .filter((a): a is Ability => !!a)
    .sort((a, b) => (a.requirements?.minLevel ?? 0) - (b.requirements?.minLevel ?? 0))

  const removableEquippedIds = equippedIds.filter((id) => !classDefaultAbilitySet.has(id))
  const unlockedNotEquipped = [...unlockedIds]
    .filter((id) => !equippedSet.has(id))
    .map((id) => abilityMap.get(id))
    .filter((a): a is Ability => !!a && a.abilityType !== 'primary')

  const slotsAvailable = removableEquippedIds.length < currentSlotCount

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
    if (removableEquippedIds.length >= currentSlotCount) return
    setError(null)
    setEquipping(true)
    try {
      const updated = await equipAbilities(fableId, realmId, character.id, [...removableEquippedIds, abilityId])
      onCharacterUpdate(updated)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to equip ability')
    } finally {
      setEquipping(false)
    }
  }

  const handleUnequip = async (abilityId: string) => {
    if (classDefaultAbilitySet.has(abilityId)) return
    setError(null)
    setEquipping(true)
    try {
      const updated = await equipAbilities(
        fableId,
        realmId,
        character.id,
        removableEquippedIds.filter((id) => id !== abilityId),
      )
      onCharacterUpdate(updated)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to unequip ability')
    } finally {
      setEquipping(false)
    }
  }

  const panelSx = {
    bgcolor: 'rgba(18,16,30,0.9)',
    border: '1px solid rgba(168,85,247,0.2)',
    borderRadius: 2,
    boxShadow: 'inset 0 0 36px rgba(124,58,237,0.08), 0 10px 24px rgba(0,0,0,0.28)',
  } as const

  const renderAbilityAvatar = (ability: Ability | undefined, size: number, mode: 'primary' | 'regular' | 'ultimate') => {
    const icon = mode === 'primary'
      ? <SportsMmaIcon sx={{ fontSize: size * 0.5 }} />
      : mode === 'ultimate'
        ? <AutoAwesomeIcon sx={{ fontSize: size * 0.48 }} />
        : <FlashOnIcon sx={{ fontSize: size * 0.48 }} />

    if (ability?.iconUrl) {
      return <Avatar src={ability.iconUrl} variant="rounded" sx={{ width: size, height: size }} />
    }

    return (
      <Avatar
        variant="rounded"
        sx={{
          width: size,
          height: size,
          bgcolor: mode === 'ultimate' ? alpha('#fbbf24', 0.2) : alpha('#a855f7', 0.2),
          color: mode === 'ultimate' ? '#fbbf24' : '#c084fc',
        }}
      >
        {icon}
      </Avatar>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden', p: { xs: 1, sm: 1.5 }, gap: 1.5 }}>
      <Paper
        variant="outlined"
        sx={{
          ...panelSx,
          p: 1.25,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            icon={<StarIcon sx={{ color: '#fbbf24 !important' }} />}
            label={`${abilityPoints} Ability Points`}
            sx={{
              bgcolor: alpha('#fbbf24', 0.15),
              color: '#fbbf24',
              fontWeight: 800,
              border: '1px solid',
              borderColor: alpha('#fbbf24', 0.35),
            }}
          />
          <Chip
            icon={<TuneIcon sx={{ color: '#c084fc !important' }} />}
            label={`${removableEquippedIds.length}/${currentSlotCount} Slots Used`}
            sx={{
              bgcolor: alpha('#a855f7', 0.16),
              color: '#e9d5ff',
              fontWeight: 700,
              border: '1px solid rgba(168,85,247,0.35)',
            }}
          />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
          <Chip label={cls?.name ?? character.classId} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.08)', color: '#e8e4f0', fontWeight: 700 }} />
          <Chip label={`Level ${character.level}`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.08)', color: '#e8e4f0', fontWeight: 700 }} />
        </Box>
      </Paper>

      {error && (
        <Typography color="error" variant="body2" sx={{ px: 0.5 }}>
          {error}
        </Typography>
      )}

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(360px, 0.9fr) minmax(540px, 1.2fr)' },
        }}
      >
        <Paper variant="outlined" sx={{ ...panelSx, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Box sx={{ px: 1.5, py: 1.2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: '1.06rem',
                background: 'linear-gradient(90deg, #efe9ff, #c084fc)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Loadout
            </Typography>
            <Chip label={slotsAvailable ? 'Slot Available' : 'All Slots Filled'} size="small" sx={{ fontWeight: 700 }} />
          </Box>
          <Divider />

          <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.4 }}>
            <Paper
              variant="outlined"
              sx={{
                p: 1,
                borderColor: 'rgba(245,158,11,0.5)',
                bgcolor: alpha('#f59e0b', 0.07),
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              {renderAbilityAvatar(primaryAbility, 52, 'primary')}
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#fbbf24', fontWeight: 800 }}>
                  Primary Attack
                </Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', lineHeight: 1.2 }}>
                  {primaryAbility?.name ?? 'Primary'}
                </Typography>
                {primaryAbility?.effects?.[0] && (
                  <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.58)' }}>
                    {describeEffect(primaryAbility.effects[0])}
                  </Typography>
                )}
              </Box>
            </Paper>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))', gap: 1 }}>
              {Array.from({ length: maxPossibleSlots }, (_, i) => {
                const isSlotUnlocked = i < currentSlotCount
                const equipped = removableEquippedIds[i] ? abilityMap.get(removableEquippedIds[i]) : undefined
                const unlockLevel = getUnlockLevelForSlot(i)

                if (!isSlotUnlocked) {
                  return (
                    <Tooltip key={`slot-${i}`} title={`Unlocks at level ${unlockLevel ?? '?'}`} arrow>
                      <Paper
                        variant="outlined"
                        sx={{
                          minHeight: 118,
                          p: 0.8,
                          borderStyle: 'dashed',
                          borderColor: 'rgba(255,255,255,0.2)',
                          bgcolor: 'rgba(255,255,255,0.03)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: 0.65,
                          gap: 0.5,
                        }}
                      >
                        <LockIcon sx={{ fontSize: 20, color: 'rgba(255,255,255,0.35)' }} />
                        <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>Lv {unlockLevel ?? '?'}</Typography>
                      </Paper>
                    </Tooltip>
                  )
                }

                if (equipped) {
                  return (
                    <Paper
                      key={`slot-${i}`}
                      variant="outlined"
                      sx={{
                        minHeight: 118,
                        p: 0.8,
                        borderColor: 'rgba(168,85,247,0.55)',
                        bgcolor: alpha('#a855f7', 0.12),
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 0.55,
                        position: 'relative',
                      }}
                    >
                      <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.68)', letterSpacing: '0.06em' }}>SLOT {i + 1}</Typography>
                      {renderAbilityAvatar(equipped, 38, equipped.abilityType === 'ultimate' ? 'ultimate' : 'regular')}
                      <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: '#f8fafc', lineHeight: 1.1, textAlign: 'center' }}>
                        {equipped.name}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => handleUnequip(equipped.id)}
                        disabled={equipping}
                        sx={{
                          position: 'absolute',
                          top: 2,
                          right: 2,
                          width: 20,
                          height: 20,
                          bgcolor: 'rgba(239,68,68,0.82)',
                          '&:hover': { bgcolor: 'rgba(239,68,68,0.95)' },
                        }}
                      >
                        <CloseIcon sx={{ fontSize: 12, color: '#fff' }} />
                      </IconButton>
                    </Paper>
                  )
                }

                return (
                  <Paper
                    key={`slot-${i}`}
                    variant="outlined"
                    sx={{
                      minHeight: 118,
                      p: 0.8,
                      borderStyle: 'dashed',
                      borderColor: 'rgba(168,85,247,0.35)',
                      bgcolor: alpha('#a855f7', 0.05),
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 0.5,
                    }}
                  >
                    <AddIcon sx={{ color: 'rgba(168,85,247,0.52)', fontSize: 24 }} />
                    <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.52)' }}>Empty Slot</Typography>
                  </Paper>
                )
              })}
            </Box>

            {classDefaultAbilityIds.length > 0 && (
              <Box>
                <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.62)', mb: 0.6, letterSpacing: '0.04em' }}>
                  CLASS DEFAULTS
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.65, flexWrap: 'wrap' }}>
                  {classDefaultAbilityIds.map((id) => {
                    const ability = abilityMap.get(id)
                    if (!ability) return null
                    return (
                      <Chip
                        key={id}
                        label={ability.name}
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: 10,
                          fontWeight: 700,
                          bgcolor: alpha('#f59e0b', 0.16),
                          color: '#fbbf24',
                          border: '1px solid rgba(245,158,11,0.34)',
                        }}
                      />
                    )
                  })}
                </Box>
              </Box>
            )}

            {unlockedNotEquipped.length > 0 && (
              <Box>
                <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.62)', mb: 0.6, letterSpacing: '0.04em' }}>
                  RESERVE
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.7 }}>
                  {unlockedNotEquipped.map((ability) => {
                    const isUltimate = ability.abilityType === 'ultimate'
                    const effectText = ability.effects?.[0] ? describeEffect(ability.effects[0]) : ''
                    return (
                      <Paper
                        key={ability.id}
                        variant="outlined"
                        sx={{
                          p: 0.8,
                          borderColor: 'rgba(168,85,247,0.28)',
                          bgcolor: alpha('#a855f7', 0.06),
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.85,
                        }}
                      >
                        {renderAbilityAvatar(ability, 36, isUltimate ? 'ultimate' : 'regular')}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#f3f4f6', lineHeight: 1.2 }}>
                            {ability.name}
                          </Typography>
                          {effectText && (
                            <Typography sx={{ fontSize: 10.5, color: 'rgba(255,255,255,0.54)', lineHeight: 1.2 }}>
                              {effectText}
                            </Typography>
                          )}
                        </Box>
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => handleEquip(ability.id)}
                          disabled={!slotsAvailable || equipping}
                          sx={{ textTransform: 'none', minWidth: 64, fontSize: 11, fontWeight: 700 }}
                        >
                          {equipping ? '...' : 'Equip'}
                        </Button>
                      </Paper>
                    )
                  })}
                </Box>
              </Box>
            )}
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ ...panelSx, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Box sx={{ px: 1.5, py: 1.2 }}>
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: '1.06rem',
                background: 'linear-gradient(90deg, #efe9ff, #c084fc)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Ability Codex
            </Typography>
          </Box>
          <Divider />

          <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', p: 1.5, display: 'flex', flexDirection: 'column', gap: 0.85 }}>
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
                      p: 1,
                      display: 'grid',
                      gridTemplateColumns: 'auto minmax(0,1fr) auto',
                      gap: 1,
                      alignItems: 'center',
                      borderColor: isEquipped
                        ? 'rgba(168,85,247,0.55)'
                        : isUltimate
                          ? alpha('#fbbf24', 0.36)
                          : 'rgba(148,163,184,0.24)',
                      bgcolor: isEquipped
                        ? alpha('#a855f7', 0.13)
                        : status === 'locked'
                          ? 'rgba(255,255,255,0.03)'
                          : 'rgba(255,255,255,0.045)',
                      opacity: status === 'locked' ? 0.62 : 1,
                    }}
                  >
                    {renderAbilityAvatar(ability, 44, isUltimate ? 'ultimate' : 'regular')}

                    <Box sx={{ minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, flexWrap: 'wrap' }}>
                        <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', lineHeight: 1.15 }}>
                          {ability.name}
                        </Typography>
                        {isUltimate && (
                          <Chip
                            label="ULT"
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: 9,
                              fontWeight: 800,
                              bgcolor: alpha('#fbbf24', 0.2),
                              color: '#fbbf24',
                            }}
                          />
                        )}
                        {status === 'equipped' && (
                          <Chip
                            icon={<CheckCircleIcon sx={{ fontSize: 13, color: '#a855f7 !important' }} />}
                            label="Equipped"
                            size="small"
                            sx={{ height: 18, fontSize: 9, fontWeight: 700, bgcolor: alpha('#a855f7', 0.2), color: '#d8b4fe' }}
                          />
                        )}
                      </Box>

                      {ability.description && (
                        <Typography sx={{ mt: 0.25, fontSize: 11, color: 'rgba(255,255,255,0.52)', lineHeight: 1.22 }}>
                          {ability.description}
                        </Typography>
                      )}

                      <Box sx={{ mt: 0.45, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {effect && (
                          <Chip
                            label={describeEffect(effect)}
                            size="small"
                            sx={{ height: 20, fontSize: 10, color: '#cbd5e1', bgcolor: 'rgba(71,85,105,0.25)' }}
                          />
                        )}
                        {ability.cooldownTurns > 0 && (
                          <Chip
                            label={`${ability.cooldownTurns}t CD`}
                            size="small"
                            sx={{ height: 20, fontSize: 10, color: '#cbd5e1', bgcolor: 'rgba(71,85,105,0.25)' }}
                          />
                        )}
                        {resource && resourceCost && (
                          <Chip
                            label={`${resourceCost.amount} ${resource.name}`}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: 10,
                              bgcolor: alpha(resource.colorHex, 0.16),
                              color: resource.colorHex,
                            }}
                          />
                        )}
                        {minLevel > 0 && (
                          <Chip
                            label={`Lv ${minLevel}`}
                            size="small"
                            sx={{ height: 20, fontSize: 10, color: '#cbd5e1', bgcolor: 'rgba(71,85,105,0.25)' }}
                          />
                        )}
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                      {status === 'unlockable' && (
                        <Button
                          size="small"
                          variant="contained"
                          disabled={!canAfford || unlockingId !== null}
                          onClick={() => handleUnlock(ability.id)}
                          sx={{ textTransform: 'none', fontSize: 11, fontWeight: 800, minWidth: 104 }}
                        >
                          {unlockingId === ability.id ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : `Unlock ${cost} AP`}
                        </Button>
                      )}

                      {status === 'unlocked' && (
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={!slotsAvailable || equipping}
                          onClick={() => handleEquip(ability.id)}
                          sx={{ textTransform: 'none', fontSize: 11, fontWeight: 700, minWidth: 82 }}
                        >
                          Equip
                        </Button>
                      )}

                      {status === 'locked' && (
                        <Tooltip title={`Requires level ${minLevel}`} arrow>
                          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: 'rgba(255,255,255,0.42)' }}>
                            <LockIcon sx={{ fontSize: 18 }} />
                            <Typography sx={{ fontSize: 11 }}>Locked</Typography>
                          </Box>
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
    </Box>
  )
}
