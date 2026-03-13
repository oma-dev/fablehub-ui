import { useCallback, useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import tavernBg from '../../../../../../assets/backgrounds/tavern.png'
import questGiverBg from '../../../../../../assets/backgrounds/questGiver.png'
import questRoadBg from '../../../../../../assets/backgrounds/questRoad.png'
import questCombatBg from '../../../../../../assets/backgrounds/questBackground.png'
import Button from '@mui/material/Button'
import LinearProgress from '@mui/material/LinearProgress'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium'
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn'
import ScheduleIcon from '@mui/icons-material/Schedule'
import BugReportIcon from '@mui/icons-material/BugReport'
import CombatReplay from '../components/CombatReplay'
import { resolveAnimationFrames } from '../components/vfx/animationConfig'
import { computePlayerCombatStats, resolveCharacterResource, resolveCreatureResource } from '../utils/combatStats'
import { startQuest, claimQuest } from '@features/idle-rpg/api'
import type { CharacterState, CombatResult, IdleRpgPackV1, Quest } from '@features/idle-rpg/api'

interface Props {
  fableId: string
  realmId: string
  character: CharacterState
  pack: IdleRpgPackV1
  onCharacterUpdate: (c: CharacterState) => void
}

type Phase = 'idle' | 'questPicker' | 'questActive' | 'combat' | 'result'

export default function TavernTab({ fableId, realmId, character, pack, onCharacterUpdate }: Props) {
  const [phase, setPhase] = useState<Phase>(() =>
    character.questState.activeQuest ? 'questActive' : 'idle',
  )
  const [randomQuests, setRandomQuests] = useState<Quest[]>([])
  const [error, setError] = useState<string | null>(null)
  const [startingQuestId, setStartingQuestId] = useState<string | null>(null)
  const [claiming, setClaiming] = useState(false)
  const [brokenQuestIcons, setBrokenQuestIcons] = useState<Record<string, true>>({})
  const [combatData, setCombatData] = useState<{ combat: CombatResult; victory: boolean; quest: Quest } | null>(null)

  const [now, setNow] = useState(Date.now())
  const activeQuest = character.questState.activeQuest
  const completesAt = activeQuest?.completesAt ?? 0
  const startedAt = activeQuest?.startedAt ?? 0
  const questDone = activeQuest && now >= completesAt

  useEffect(() => {
    if (phase !== 'questActive') return
    const timer = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(timer)
  }, [phase])

  const timerProgress = useMemo(() => {
    if (!activeQuest) return 0
    const total = completesAt - startedAt
    if (total <= 0) return 100
    const elapsed = Math.min(now - startedAt, total)
    return (elapsed / total) * 100
  }, [activeQuest, completesAt, startedAt, now])

  const timerText = useMemo(() => {
    if (!activeQuest || questDone) return 'Ready to claim!'
    const remaining = Math.max(0, Math.ceil((completesAt - now) / 1000))
    const m = Math.floor(remaining / 60)
    const s = remaining % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }, [activeQuest, questDone, completesAt, now])

  const activeQuestDef = useMemo(
    () => pack.quests.find((q) => q.id === activeQuest?.questId),
    [pack.quests, activeQuest],
  )

  const questOffersFromBackend = useMemo(() => {
    const offeredIds = character.questState.offeredQuestIds ?? []
    const seen = new Set<string>()
    const quests: Quest[] = []
    for (const questId of offeredIds) {
      if (!questId || seen.has(questId)) continue
      const quest = pack.quests.find((q) => q.id === questId)
      if (!quest) continue
      seen.add(questId)
      quests.push(quest)
    }
    return quests
  }, [character.questState.offeredQuestIds, pack.quests])

  const currencyMetaById = useMemo(
    () => new Map((pack.economy?.currencies ?? []).map((currency) => [currency.id, currency])),
    [pack.economy?.currencies],
  )

  const markQuestIconBroken = useCallback((questId: string) => {
    setBrokenQuestIcons((prev) => (prev[questId] ? prev : { ...prev, [questId]: true }))
  }, [])

  const getQuestIconUrl = useCallback((quest: Quest | undefined) => {
    if (!quest) return null
    const iconUrl = quest.iconUrl?.trim()
    if (!iconUrl || brokenQuestIcons[quest.id]) return null
    return iconUrl
  }, [brokenQuestIcons])

  const renderQuestIcon = useCallback((quest: Quest | undefined, size = 68) => {
    const iconUrl = getQuestIconUrl(quest)
    return (
      <Box
        sx={{
          width: size,
          height: size,
          borderRadius: 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'rgba(20,18,31,0.88)',
          border: '1px solid rgba(168,85,247,0.35)',
          boxShadow: '0 0 14px rgba(168,85,247,0.15)',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        {iconUrl ? (
          <Box
            component="img"
            src={iconUrl}
            alt={`${quest?.name ?? 'Quest'} icon`}
            onError={() => {
              if (quest) markQuestIconBroken(quest.id)
            }}
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <BugReportIcon
            sx={{
              fontSize: Math.max(28, Math.round(size * 0.58)),
              color: '#fbbf24',
              filter: 'drop-shadow(0 0 8px rgba(251,191,36,0.5))',
            }}
          />
        )}
      </Box>
    )
  }, [getQuestIconUrl, markQuestIconBroken])

  const openQuestPicker = useCallback(() => {
    setRandomQuests(questOffersFromBackend)
    setPhase('questPicker')
    setError(null)
  }, [questOffersFromBackend])

  const handleSelectQuest = async (quest: Quest) => {
    if (startingQuestId) return
    setError(null)
    setStartingQuestId(quest.id)
    try {
      const updated = await startQuest(fableId, realmId, character.id, quest.id)
      onCharacterUpdate(updated)
      setPhase('questActive')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start quest')
    } finally {
      setStartingQuestId(null)
    }
  }

  const handleClaim = async () => {
    if (claiming) return
    setError(null)
    setClaiming(true)
    try {
      const result = await claimQuest(fableId, realmId, character.id)
      onCharacterUpdate(result.character)
      const quest = pack.quests.find((q) => q.id === activeQuest?.questId) ?? pack.quests[0]
      setCombatData({ combat: result.combat, victory: result.victory, quest })
      setPhase('combat')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to claim quest')
    } finally {
      setClaiming(false)
    }
  }

  const creatureForQuest = (quest: Quest | undefined) => {
    if (!quest) return undefined
    const baseCreature = pack.creatures.find((c) => c.id === quest.creatureId)
    if (!baseCreature) return undefined
    const overrides = quest.creatureOverrides
    if (!overrides) return baseCreature
    const mergedMainStats = overrides.mainStats
      ? { ...(baseCreature.mainStats ?? {}), ...overrides.mainStats }
      : baseCreature.mainStats
    const mergedDerivedStatModifiers = overrides.derivedStatModifiers?.length
      ? [...(baseCreature.derivedStatModifiers ?? []), ...overrides.derivedStatModifiers]
      : baseCreature.derivedStatModifiers
    return {
      ...baseCreature,
      ...(overrides.hp != null ? { hp: overrides.hp } : {}),
      ...(overrides.ap != null ? { ap: overrides.ap } : {}),
      ...(overrides.arm != null ? { arm: overrides.arm } : {}),
      ...(overrides.weaponDamage != null ? { weaponDamage: overrides.weaponDamage } : {}),
      ...(overrides.protectiveArmor != null ? { protectiveArmor: overrides.protectiveArmor } : {}),
      ...(mergedMainStats ? { mainStats: mergedMainStats } : {}),
      ...(mergedDerivedStatModifiers ? { derivedStatModifiers: mergedDerivedStatModifiers } : {}),
    }
  }

  const handleCombatFinish = () => {
    setPhase('result')
  }

  const handleBackToTavern = () => {
    setCombatData(null)
    setPhase('idle')
  }

  const bgImage = phase === 'combat' ? questCombatBg : phase === 'questActive' ? questRoadBg : tavernBg
  const showQuestGiver = phase === 'idle' || phase === 'questPicker'
  const showQuestGiverCallout = phase === 'idle'

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative',
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {error && <Typography color="error" sx={{ mb: 1.5 }}>{error}</Typography>}

      {/* Idle: NPC */}
      {showQuestGiver && (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            px: { xs: 2, sm: 3 },
            pb: { xs: 0.5, sm: 1, md: 1.5 },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1.25,
              textAlign: 'center',
            }}
          >
            <Typography variant="h6" fontWeight={800} color="text.primary">Quest Giver</Typography>
            <Typography variant="body1" color="text.secondary">Tap to hear new contracts</Typography>
            <Box
              component="button"
              type="button"
              aria-label="Open quest board"
              onClick={openQuestPicker}
              sx={{
                position: 'relative',
                display: 'block',
                lineHeight: 0,
                fontSize: 0,
                top: { xs: 18, sm: 24, md: 36 },
                width: { xs: 'min(92vw, 630px)', sm: 'min(88vw, 780px)', md: 'min(74vw, 900px)' },
                p: 0,
                border: 0,
                outline: 0,
                cursor: 'pointer',
                bgcolor: 'transparent',
                WebkitTapHighlightColor: 'transparent',
                transition: 'transform 0.2s ease, filter 0.2s ease',
                '& img': {
                  width: '100%',
                  display: 'block',
                  userSelect: 'none',
                  pointerEvents: 'none',
                  filter: 'drop-shadow(0 0 8px rgba(251,191,36,0.75)) drop-shadow(0 0 24px rgba(168,85,247,0.4))',
                  animation: 'questGiverFloat 2.7s ease-in-out infinite',
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  inset: '8% 17% 12%',
                  borderRadius: '46% 46% 44% 44%',
                  border: '2px solid rgba(251,191,36,0.72)',
                  boxShadow: '0 0 14px rgba(251,191,36,0.75), inset 0 0 18px rgba(192,132,252,0.28)',
                  animation: 'questPulse 1.9s ease-in-out infinite',
                  opacity: showQuestGiverCallout ? 1 : 0,
                  transition: 'opacity 0.16s ease',
                  pointerEvents: 'none',
                },
                '&:hover': {
                  transform: 'translateY(-6px) scale(1.04)',
                  filter: 'brightness(1.08)',
                },
                '&:hover::before': {
                  boxShadow: showQuestGiverCallout
                    ? '0 0 22px rgba(251,191,36,0.95), inset 0 0 24px rgba(192,132,252,0.42)'
                    : '0 0 14px rgba(251,191,36,0.75), inset 0 0 18px rgba(192,132,252,0.28)',
                  borderColor: showQuestGiverCallout ? 'rgba(251,191,36,0.94)' : 'rgba(251,191,36,0.72)',
                },
                '&:active': {
                  transform: 'translateY(-1px) scale(0.97)',
                  filter: 'brightness(1.18)',
                },
                '&:active::before': {
                  transform: showQuestGiverCallout ? 'scale(0.96)' : 'scale(0.985)',
                  boxShadow: showQuestGiverCallout
                    ? '0 0 28px rgba(251,191,36,1), inset 0 0 26px rgba(192,132,252,0.55)'
                    : '0 0 14px rgba(251,191,36,0.75), inset 0 0 18px rgba(192,132,252,0.28)',
                },
                '&:focus-visible::before': {
                  borderColor: showQuestGiverCallout ? 'rgba(196,181,253,1)' : 'rgba(251,191,36,0.72)',
                  boxShadow: showQuestGiverCallout
                    ? '0 0 0 3px rgba(129,140,248,0.45), 0 0 24px rgba(251,191,36,0.85)'
                    : '0 0 14px rgba(251,191,36,0.75), inset 0 0 18px rgba(192,132,252,0.28)',
                },
                '@keyframes questPulse': {
                  '0%, 100%': { transform: 'scale(0.985)', opacity: 0.82 },
                  '50%': { transform: 'scale(1.03)', opacity: 1 },
                },
                '@keyframes questGiverFloat': {
                  '0%, 100%': { transform: 'translateY(0px)' },
                  '50%': { transform: 'translateY(-7px)' },
                },
                }}
              >
                <Box component="img" src={questGiverBg} alt="Quest giver in the tavern" />
                <Box
                  aria-hidden
                  sx={{
                    position: 'absolute',
                    top: { xs: 12, sm: 14 },
                    right: { xs: 10, sm: 16 },
                    width: { xs: 30, sm: 34 },
                    height: { xs: 30, sm: 34 },
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 900,
                    fontSize: { xs: '1rem', sm: '1.05rem' },
                    color: '#1f2937',
                    background: 'radial-gradient(circle at 35% 35%, #fde68a 5%, #f59e0b 70%)',
                    boxShadow: '0 0 20px rgba(251,191,36,0.85), 0 0 34px rgba(251,191,36,0.55)',
                    animation: showQuestGiverCallout ? 'questBadgePulse 1.4s ease-in-out infinite' : 'none',
                    opacity: showQuestGiverCallout ? 1 : 0,
                    transform: showQuestGiverCallout ? 'scale(1)' : 'scale(0.92)',
                    transition: 'opacity 0.16s ease, transform 0.16s ease',
                    pointerEvents: 'none',
                    '@keyframes questBadgePulse': {
                      '0%, 100%': { transform: 'scale(0.95)', opacity: 0.9 },
                      '50%': { transform: 'scale(1.12)', opacity: 1 },
                    },
                  }}
                >
                  !
                </Box>
              </Box>
          </Box>
        </Box>
      )}

      {/* Quest picker modal */}
      {phase === 'questPicker' && (
        <Box
          onClick={() => setPhase('idle')}
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: { xs: 1.25, sm: 2 },
            bgcolor: 'rgba(8,7,14,0.62)',
            backdropFilter: 'blur(2px)',
          }}
        >
          <Paper
            onClick={(event) => event.stopPropagation()}
            sx={{
              width: 'min(1120px, 96vw)',
              maxHeight: '92%',
              overflow: 'auto',
              p: { xs: 1.5, sm: 2 },
              bgcolor: 'rgba(20,18,31,0.96)',
              border: '1px solid rgba(168,85,247,0.26)',
            }}
          >
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: '1.45rem',
                background: 'linear-gradient(90deg, #e8e4f0, #c084fc)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 1,
              }}
            >
              Choose a Quest
            </Typography>

            <List sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, pt: 1 }}>
              {randomQuests.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ px: 1, py: 1 }}>
                  No quest offers available right now.
                </Typography>
              )}
              {randomQuests.map((q) => {
                const creature = creatureForQuest(q)
                return (
                  <ListItemButton
                    key={q.id}
                    disabled={startingQuestId !== null}
                    onClick={() => handleSelectQuest(q)}
                    sx={{
                      borderRadius: 2,
                      border: '1px solid rgba(168,85,247,0.2)',
                      py: 2,
                      px: 2.5,
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: 'rgba(168,85,247,0.4)',
                        boxShadow: '0 0 16px rgba(168,85,247,0.15)',
                        bgcolor: 'rgba(168,85,247,0.08)',
                      },
                    }}
                  >
                    <ListItemText
                      disableTypography
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.6 }}>
                          {renderQuestIcon(q, 74)}
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.4, minWidth: 0, flex: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap', alignItems: 'baseline' }}>
                              <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.1 }}>
                                {startingQuestId === q.id ? `${q.name}...` : q.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                                Creature: {creature?.name ?? q.creatureId} (Lv {creature?.level ?? '?'})
                              </Typography>
                            </Box>

                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.1 }}>
                              <Box
                                sx={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 0.75,
                                  px: 1.5,
                                  py: 0.85,
                                  borderRadius: 2,
                                  bgcolor: 'rgba(168,85,247,0.14)',
                                  border: '1px solid rgba(168,85,247,0.35)',
                                }}
                              >
                                <WorkspacePremiumIcon sx={{ color: '#c084fc', fontSize: 22 }} />
                                <Typography variant="body1" fontWeight={800} sx={{ color: '#e8e4f0' }}>
                                  +{q.rewards.xp} XP
                                </Typography>
                              </Box>

                              {Object.entries(q.rewards.currency ?? {}).map(([currencyId, amount]) => {
                                const currencyMeta = currencyMetaById.get(currencyId)
                                const currencyName = currencyMeta?.name ?? currencyId
                                const iconUrl = currencyMeta?.iconUrl?.trim()
                                return (
                                  <Box
                                    key={`${q.id}-reward-${currencyId}`}
                                    sx={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 0.75,
                                      px: 1.5,
                                      py: 0.85,
                                      borderRadius: 2,
                                      bgcolor: 'rgba(251,191,36,0.14)',
                                      border: '1px solid rgba(251,191,36,0.35)',
                                    }}
                                  >
                                    {iconUrl ? (
                                      <Box
                                        component="img"
                                        src={iconUrl}
                                        alt={currencyName}
                                        sx={{ width: 22, height: 22, objectFit: 'contain' }}
                                      />
                                    ) : (
                                      <MonetizationOnIcon sx={{ color: '#fbbf24', fontSize: 22 }} />
                                    )}
                                    <Typography variant="body1" fontWeight={800} sx={{ color: '#fbbf24' }}>
                                      +{amount} {currencyName}
                                    </Typography>
                                  </Box>
                                )
                              })}
                            </Box>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                              <ScheduleIcon sx={{ color: 'rgba(255,255,255,0.72)', fontSize: 18 }} />
                              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                                Duration: {q.durationSec}s
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      }
                    />
                  </ListItemButton>
                )
              })}
            </List>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1.5 }}>
              <Button onClick={() => setPhase('idle')} variant="outlined" color="primary" disabled={startingQuestId !== null}>
                Cancel
              </Button>
            </Box>
          </Paper>
        </Box>
      )}

      {/* Quest active: timer */}
      {phase === 'questActive' && (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            px: { xs: 1.5, sm: 2.5, md: 4 },
            py: { xs: 1.5, sm: 2.25, md: 3 },
            background: 'linear-gradient(180deg, rgba(9,8,16,0.18) 0%, rgba(9,8,16,0.56) 100%)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.4 }}>
            {renderQuestIcon(activeQuestDef, 88)}
            <Box>
              <Typography
                variant="h5"
                fontWeight={800}
                sx={{
                  background: 'linear-gradient(90deg, #ede9fe, #c084fc)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {activeQuestDef?.name ?? 'Quest in progress'}
              </Typography>
              <Typography variant="body1" sx={{ color: 'rgba(243,244,246,0.88)', fontWeight: 600 }}>
                Fighting {creatureForQuest(activeQuestDef)?.name ?? 'unknown creature'}...
              </Typography>
            </Box>
          </Box>

          <Box sx={{ width: 'min(1240px, 97%)', mx: 'auto', display: 'flex', flexDirection: 'column', gap: 1.2 }}>
            <LinearProgress
              variant="determinate"
              value={timerProgress}
              sx={{
                height: 22,
                borderRadius: 3,
                bgcolor: 'rgba(18,16,30,0.72)',
                border: '1px solid rgba(168,85,247,0.35)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                  background: questDone
                    ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
                    : 'linear-gradient(90deg, #c084fc, #a855f7)',
                  boxShadow: questDone
                    ? '0 0 14px rgba(251,191,36,0.45)'
                    : '0 0 14px rgba(168,85,247,0.45)',
                },
              }}
            />
            <Typography
              variant="h6"
              textAlign="center"
              sx={{ fontWeight: 800, color: questDone ? '#fbbf24' : '#f3f4f6' }}
            >
              {timerText}
            </Typography>
            <Button
              variant="contained"
              color={questDone ? 'warning' : 'primary'}
              disabled={!questDone || claiming}
              onClick={handleClaim}
              size="large"
              fullWidth
              sx={{ py: 1.2, fontSize: '1.02rem', fontWeight: 800 }}
            >
              {claiming ? 'Claiming...' : questDone ? 'Claim Reward' : 'Waiting...'}
            </Button>
          </Box>
        </Box>
      )}
      {/* Combat replay */}
      {phase === 'combat' && combatData && (() => {
        const creatureDef = creatureForQuest(combatData.quest)
        const cls = pack.classes.find((c) => c.id === character.classId)
        const weaponItemId = character.equipment?.['attack_source']
        const weaponDef = weaponItemId ? pack.items.find((i) => i.id === weaponItemId) : undefined
        const defenseItemId = character.equipment?.['defense_layer']
        const defenseDef = defenseItemId ? pack.items.find((i) => i.id === defenseItemId) : undefined
        const primaryAbility = pack.abilities?.find((a) => a.id === cls?.primaryAttackId && a.abilityType === 'primary')
        const resolvedFrames = resolveAnimationFrames(
          primaryAbility?.animationFrames,
          weaponDef?.iconUrl,
          weaponDef?.animationUrl,
          weaponDef?.projectileUrl,
          weaponDef?.impactUrl,
          defenseDef?.iconUrl,
          defenseDef?.animationUrl,
          defenseDef?.projectileUrl,
          defenseDef?.impactUrl,
        )
        const playerStats = computePlayerCombatStats(character, pack)
        const playerResource = resolveCharacterResource(pack, character.classId)
        const creatureResource = resolveCreatureResource(pack, creatureDef?.resourceId)
        const abilityAnimations: Record<string, any> = {}
        for (const ab of (pack.abilities ?? [])) {
          if (ab.animationFrames) {
            const resolvedWithDefense = resolveAnimationFrames(
              ab.animationFrames,
              weaponDef?.iconUrl,
              weaponDef?.animationUrl,
              weaponDef?.projectileUrl,
              weaponDef?.impactUrl,
              defenseDef?.iconUrl,
              defenseDef?.animationUrl,
              defenseDef?.projectileUrl,
              defenseDef?.impactUrl,
            )
            if (resolvedWithDefense) abilityAnimations[ab.id] = resolvedWithDefense
          }
        }
        const statusAnimations: Record<string, any> = {}
        const statusTransforms: Record<string, any> = {}
        for (const status of (pack.statusEffects ?? [])) {
          if (status.animation) statusAnimations[status.id] = status.animation
          if (status.transform) statusTransforms[status.id] = status.transform
        }
        return (
          <Box sx={{ flex: 1 }}>
            <CombatReplay
              combat={combatData.combat}
              leftCharacterId={character.id}
              arenaBackgroundImageUrl={questCombatBg}
              abilityAnimations={abilityAnimations}
              statusAnimations={statusAnimations}
              statusTransforms={statusTransforms}
              playerIntroSoundUrl={cls?.introSoundUrl}
              playerIntroSoundVolumePercent={cls?.introSoundVolumePercent}
              playerIntroSoundFadeInMs={cls?.introSoundFadeInMs}
              playerIntroSoundFadeOutMs={cls?.introSoundFadeOutMs}
              creatureIntroSoundUrl={creatureDef?.introSoundUrl}
              creatureIntroSoundVolumePercent={creatureDef?.introSoundVolumePercent}
              creatureIntroSoundFadeInMs={creatureDef?.introSoundFadeInMs}
              creatureIntroSoundFadeOutMs={creatureDef?.introSoundFadeOutMs}
              player={{
                name: character.name,
                level: character.level,
                maxHp: playerStats.maxHp,
                ap: playerStats.ap,
                arm: playerStats.arm,
                portraitUrl: character.portraitUrl ?? cls?.iconUrl,
                weaponUrl: weaponDef?.iconUrl,
                weaponAnimationUrl: weaponDef?.animationUrl,
                weaponProjectileUrl: weaponDef?.projectileUrl,
                weaponImpactUrl: weaponDef?.impactUrl,
                defenseUrl: defenseDef?.iconUrl,
                defenseAnimationUrl: defenseDef?.animationUrl,
                defenseProjectileUrl: defenseDef?.projectileUrl,
                defenseImpactUrl: defenseDef?.impactUrl,
                animationFrames: resolvedFrames ?? primaryAbility?.animationFrames,
                resource: playerResource,
              }}
              creature={{
                name: creatureDef?.name ?? 'Creature',
                level: creatureDef?.level ?? 1,
                maxHp: creatureDef?.hp ?? 10,
                ap: creatureDef?.ap ?? 1,
                arm: creatureDef?.arm ?? 0,
                portraitUrl: creatureDef?.iconUrl,
                resource: creatureResource,
              }}
              victory={combatData.victory}
              onFinish={handleCombatFinish}
            />
          </Box>
        )
      })()}

      {/* Result */}
      {phase === 'result' && combatData && (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
          <Typography
            variant="h3"
            fontWeight={900}
            sx={{
              background: combatData.victory
                ? 'linear-gradient(135deg, #4ade80, #22c55e)'
                : 'linear-gradient(135deg, #f87171, #ef4444)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: combatData.victory
                ? '0 0 30px rgba(34,197,94,0.3)'
                : '0 0 30px rgba(239,68,68,0.3)',
            }}
          >
            {combatData.victory ? 'Quest Complete!' : 'Quest Failed'}
          </Typography>
          {combatData.victory && combatData.quest && (
            <Paper
              variant="outlined"
              sx={{
                p: 3,
                textAlign: 'center',
                background: 'linear-gradient(135deg, rgba(168,85,247,0.08) 0%, rgba(20,18,31,0.9) 100%)',
                borderColor: 'rgba(168,85,247,0.2)',
                boxShadow: '0 0 20px rgba(168,85,247,0.1)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.2, mb: 1.1 }}>
                {renderQuestIcon(combatData.quest, 54)}
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#e8e4f0' }}>
                  {combatData.quest.name}
                </Typography>
              </Box>
              <Typography variant="h6" sx={{ color: '#c084fc', fontWeight: 700 }}>+{combatData.quest.rewards.xp} XP</Typography>
              {Object.entries(combatData.quest.rewards.currency).map(([cur, amt]) => (
                <Typography key={cur} variant="h6" sx={{ color: '#fbbf24', fontWeight: 700 }}>+{amt} {cur}</Typography>
              ))}
            </Paper>
          )}
          <Button
            variant="contained"
            color="primary"
            onClick={handleBackToTavern}
            size="large"
            sx={{ px: 5, py: 1.5, fontSize: '1.1rem' }}
          >
            Back to Tavern
          </Button>
        </Box>
      )}
    </Box>
  )
}

