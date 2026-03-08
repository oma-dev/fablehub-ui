import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import SportsKabaddiIcon from '@mui/icons-material/SportsKabaddi'
import PersonIcon from '@mui/icons-material/Person'
import { getDungeons, fightDungeonBoss } from '@features/idle-rpg/api'
import type {
  CharacterState,
  CombatResult,
  DungeonWithBoss,
  IdleRpgPackV1,
  ItemTemplate,
} from '@features/idle-rpg/api'
import { RARITY_NAMES } from '@features/idle-rpg/api'
import CombatReplay from '../components/CombatReplay'
import { resolveAnimationFrames } from '../components/vfx/animationConfig'
import { computePlayerCombatStats, resolveCharacterResource, resolveCreatureResource } from '../utils/combatStats'

import dungeonTabBg from '../../../../../../assets/backgrounds/dungeonBackground.png'
import dungeonDoorImg from '../../../../../../assets/backgrounds/dungeonDoor.png'
import dungeonReplayBg from '../../../../../../assets/backgrounds/dungeon.png'

interface Props {
  fableId: string
  realmId: string
  character: CharacterState
  pack: IdleRpgPackV1
  onCharacterUpdate: (c: CharacterState) => void
}

type Phase = 'idle' | 'combat' | 'result'

export default function DungeonsTab({ fableId, realmId, character, pack, onCharacterUpdate }: Props) {
  const [dungeons, setDungeons] = useState<DungeonWithBoss[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dungeonIndex, setDungeonIndex] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [fighting, setFighting] = useState(false)
  const [combatResult, setCombatResult] = useState<{
    combat: CombatResult
    victory: boolean
    droppedItem?: ItemTemplate
  } | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')

  useEffect(() => {
    if (!fableId || !realmId || !character?.id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    getDungeons(fableId, realmId, character.id)
      .then((res) => {
        if (!cancelled) setDungeons(res.dungeons ?? [])
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load dungeons')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [fableId, realmId, character.id])

  const currentDungeon = dungeons[dungeonIndex] ?? null
  const canGoRight = currentDungeon?.completed === true && dungeonIndex < dungeons.length - 1
  const now = Date.now()
  const cooldownRemaining = currentDungeon?.cooldownUntil != null && currentDungeon.cooldownUntil > now
    ? Math.max(0, Math.ceil((currentDungeon.cooldownUntil - now) / 60000))
    : 0

  const handleFight = async () => {
    if (!currentDungeon || fighting) return
    if (currentDungeon.completed) return
    if (cooldownRemaining > 0) return
    if (character.level < currentDungeon.requiredLevel) {
      setError(`Level ${currentDungeon.requiredLevel} required`)
      return
    }
    setError(null)
    setFighting(true)
    setModalOpen(false)
    try {
      const result = await fightDungeonBoss(fableId, realmId, character.id, currentDungeon.id)
      onCharacterUpdate(result.character)
      setCombatResult({ combat: result.combat, victory: result.victory, droppedItem: result.droppedItem })
      setPhase('combat')
      getDungeons(fableId, realmId, character.id).then((res) => setDungeons(res.dungeons ?? []))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fight boss')
    } finally {
      setFighting(false)
    }
  }

  const handleCombatFinish = () => setPhase('result')

  const handleBackToDungeons = () => {
    setCombatResult(null)
    setPhase('idle')
    getDungeons(fableId, realmId, character.id).then((res) => setDungeons(res.dungeons ?? []))
  }

  const cls = pack.classes.find((c) => c.id === character.classId)
  const weaponItemId = character.equipment?.['attack_source']
  const weaponDef = weaponItemId ? pack.items.find((i) => i.id === weaponItemId) : undefined
  const primaryAbility = pack.abilities?.find((a) => a.id === cls?.primaryAttackId && a.abilityType === 'primary')
  const resolvedFrames = resolveAnimationFrames(
    primaryAbility?.animationFrames,
    weaponDef?.iconUrl,
    weaponDef?.animationUrl,
    weaponDef?.projectileUrl,
    weaponDef?.impactUrl,
  )
  const playerStats = computePlayerCombatStats(character, pack)
  const playerResource = resolveCharacterResource(pack, character.classId)
  const abilityAnimations: Record<string, any> = {}
  for (const ab of (pack.abilities ?? [])) {
    if (ab.animationFrames) {
      const r = resolveAnimationFrames(ab.animationFrames, weaponDef?.iconUrl, weaponDef?.animationUrl, weaponDef?.projectileUrl, weaponDef?.impactUrl)
      if (r) abilityAnimations[ab.id] = r
    }
  }
  const statusAnimations: Record<string, any> = {}
  const statusTransforms: Record<string, any> = {}
  for (const status of (pack.statusEffects ?? [])) {
    if (status.animation) statusAnimations[status.id] = status.animation
    if (status.transform) statusTransforms[status.id] = status.transform
  }
  const boss = currentDungeon?.boss
  const bossReplayBackground = boss?.backgroundImageUrl?.trim() ? boss.backgroundImageUrl.trim() : dungeonReplayBg

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative',
        backgroundImage: `url(${dungeonTabBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {error && (
        <Typography color="error" sx={{ mb: 1.5, px: 2 }}>
          {error}
        </Typography>
      )}

      {phase === 'idle' && (
        <>
          {loading && (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress size={28} />
            </Box>
          )}
          {!loading && dungeons.length === 0 && (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography color="text.secondary">No dungeons in this realm.</Typography>
            </Box>
          )}
          {!loading && dungeons.length > 0 && (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                gap: 2,
                px: 2,
                pb: { xs: 0, sm: 0.5, md: 1 },
              }}
            >
              <IconButton
                size="large"
                onClick={() => setDungeonIndex((i) => Math.max(0, i - 1))}
                disabled={dungeonIndex <= 0}
                sx={{ color: 'primary.main' }}
              >
                <ChevronLeftIcon />
              </IconButton>

              <Box
                sx={{
                  width: 'min(96vw, 680px)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  height: '100%',
                  gap: 1.1,
                }}
              >
                <Paper
                  variant="outlined"
                  sx={{
                    width: '100%',
                    px: 2,
                    py: 1.3,
                    textAlign: 'center',
                    bgcolor: 'rgba(12,10,20,0.74)',
                    borderColor: 'rgba(99,102,241,0.42)',
                    boxShadow: 'inset 0 0 24px rgba(30,64,175,0.12), 0 12px 24px rgba(0,0,0,0.3)',
                  }}
                >
                  <Typography variant="overline" color="text.secondary" letterSpacing={1.5}>
                    Dungeon Gate
                  </Typography>
                  <Typography
                    variant="h5"
                    fontWeight={800}
                    sx={{
                      mt: 0.2,
                      background: 'linear-gradient(90deg, #dbeafe, #93c5fd)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    {currentDungeon?.name ?? '-'}
                  </Typography>
                  {currentDungeon?.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.6, mb: 1 }}>
                      {currentDungeon.description}
                    </Typography>
                  )}
                  <Typography variant="body2" color="text.secondary">
                    Required level: <strong>{currentDungeon?.requiredLevel ?? 1}</strong>
                  </Typography>
                  {currentDungeon?.completed && (
                    <Typography variant="body2" sx={{ mt: 0.8, color: 'success.main', fontWeight: 700 }}>
                      Completed
                    </Typography>
                  )}
                  <Box sx={{ mt: 1.2, display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<ChevronLeftIcon />}
                      onClick={() => setDungeonIndex((i) => Math.max(0, i - 1))}
                      disabled={dungeonIndex <= 0}
                      sx={{ textTransform: 'none', fontWeight: 700 }}
                    >
                      Previous Dungeon
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      endIcon={<ChevronRightIcon />}
                      onClick={() => setDungeonIndex((i) => Math.min(dungeons.length - 1, i + 1))}
                      disabled={!canGoRight}
                      sx={{ textTransform: 'none', fontWeight: 700 }}
                    >
                      Next Dungeon
                    </Button>
                  </Box>
                  {!canGoRight && currentDungeon && !currentDungeon.completed && (
                    <Typography variant="caption" sx={{ mt: 0.8, display: 'block', color: 'text.secondary' }}>
                      Beat this dungeon to unlock the next one.
                    </Typography>
                  )}
                </Paper>

                <Box
                  component="button"
                  type="button"
                  aria-label={`Open ${currentDungeon?.name ?? 'dungeon'} details`}
                  onClick={() => currentDungeon && setModalOpen(true)}
                  disabled={!currentDungeon}
                  sx={{
                    position: 'relative',
                    width: { xs: 'min(84vw, 360px)', sm: '420px', md: '470px' },
                    transform: 'translateY(18px)',
                    p: 0,
                    border: 0,
                    outline: 0,
                    cursor: 'pointer',
                    bgcolor: 'transparent',
                    WebkitTapHighlightColor: 'transparent',
                    transition: 'filter 0.22s ease',
                    '& img': {
                      width: '100%',
                      display: 'block',
                      userSelect: 'none',
                      pointerEvents: 'none',
                      filter: 'drop-shadow(0 0 12px rgba(129,140,248,0.55)) drop-shadow(0 0 30px rgba(59,130,246,0.3))',
                      animation: 'dungeonDoorGlow 2.3s ease-in-out infinite',
                    },
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      inset: '7% 15% 13%',
                      borderRadius: '46% 46% 44% 44%',
                      border: '2px solid rgba(129,140,248,0.6)',
                      boxShadow: '0 0 18px rgba(129,140,248,0.6), inset 0 0 20px rgba(30,64,175,0.3)',
                      animation: 'dungeonAuraPulse 2.3s ease-in-out infinite',
                      pointerEvents: 'none',
                    },
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      left: '50%',
                      bottom: '6%',
                      width: '68%',
                      height: 20,
                      borderRadius: '999px',
                      background: 'radial-gradient(circle, rgba(0,0,0,0.58) 0%, rgba(0,0,0,0) 74%)',
                      transform: 'translateX(-50%)',
                      opacity: 0.9,
                      transition: 'transform 0.22s ease, opacity 0.22s ease',
                      pointerEvents: 'none',
                    },
                    '&:hover': {
                      transform: 'translateY(18px)',
                      filter: 'brightness(1.08)',
                    },
                    '&:hover::before': {
                      borderColor: 'rgba(191,219,254,0.95)',
                      boxShadow: '0 0 28px rgba(147,197,253,0.8), inset 0 0 30px rgba(37,99,235,0.36)',
                      animationDuration: '1.1s',
                    },
                    '&:hover::after': {
                      transform: 'translateX(-50%) scale(1.16)',
                      opacity: 1,
                    },
                    '&:active': {
                      transform: 'translateY(18px)',
                      filter: 'brightness(1.16)',
                    },
                    '&:focus-visible::before': {
                      boxShadow: '0 0 0 3px rgba(59,130,246,0.35), 0 0 26px rgba(191,219,254,0.9)',
                      borderColor: 'rgba(191,219,254,1)',
                    },
                    '@keyframes dungeonAuraPulse': {
                      '0%, 100%': {
                        boxShadow: '0 0 16px rgba(129,140,248,0.5), inset 0 0 18px rgba(30,64,175,0.25)',
                        opacity: 0.8,
                      },
                      '50%': {
                        boxShadow: '0 0 26px rgba(147,197,253,0.75), inset 0 0 24px rgba(59,130,246,0.34)',
                        opacity: 1,
                      },
                    },
                    '@keyframes dungeonDoorGlow': {
                      '0%, 100%': {
                        filter: 'drop-shadow(0 0 12px rgba(129,140,248,0.55)) drop-shadow(0 0 30px rgba(59,130,246,0.3))',
                      },
                      '50%': {
                        filter: 'drop-shadow(0 0 18px rgba(191,219,254,0.85)) drop-shadow(0 0 38px rgba(59,130,246,0.42))',
                      },
                    },
                  }}
                >
                  <Box component="img" src={dungeonDoorImg} alt={currentDungeon?.name ?? 'Dungeon entrance'} />
                  <Box
                    aria-hidden
                    sx={{
                      position: 'absolute',
                      right: { xs: 10, sm: 16 },
                      top: { xs: 12, sm: 18 },
                      px: 1.1,
                      py: 0.35,
                      borderRadius: 20,
                      fontWeight: 900,
                      fontSize: { xs: 11, sm: 12 },
                      letterSpacing: 1.1,
                      color: '#0f172a',
                      bgcolor: '#fde68a',
                      boxShadow: '0 0 16px rgba(253,224,71,0.75)',
                    }}
                  >
                    ENTER
                  </Box>
                </Box>
              </Box>

              <Tooltip title={!canGoRight && currentDungeon && !currentDungeon.completed ? 'Beat the current boss first' : ''}>
                <span>
                  <IconButton
                    size="large"
                    onClick={() => setDungeonIndex((i) => Math.min(dungeons.length - 1, i + 1))}
                    disabled={!canGoRight}
                    sx={{ color: 'primary.main' }}
                  >
                    <ChevronRightIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          )}
          {modalOpen && (
            <Box
              onClick={() => setModalOpen(false)}
              sx={{
                position: 'absolute',
                inset: 0,
                zIndex: 15,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: { xs: 1.5, sm: 2.5 },
                bgcolor: 'rgba(8,7,14,0.62)',
                backdropFilter: 'blur(2px)',
              }}
            >
              <Paper
                onClick={(event) => event.stopPropagation()}
                sx={{
                  width: 'min(640px, 94vw)',
                  maxHeight: '92%',
                  overflow: 'auto',
                  borderRadius: 3,
                  bgcolor: '#0c0a14',
                  border: '2px solid transparent',
                  backgroundImage: 'linear-gradient(#0c0a14, #0c0a14), linear-gradient(135deg, #a855f7, #6366f1, #a855f7)',
                  backgroundOrigin: 'border-box',
                  backgroundClip: 'padding-box, border-box',
                  boxShadow: '0 0 40px 8px rgba(168,85,247,0.2), inset 0 0 24px rgba(0,0,0,0.3)',
                  px: 4,
                  py: 4,
                }}
              >
                {currentDungeon && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <Typography variant="overline" color="text.secondary" letterSpacing={2}>
                      {currentDungeon.name} - Boss
                    </Typography>
                    {boss ? (
                      <>
                        {/* Large boss portrait (same style as CharacterPanel in Shop) */}
                        <Box
                          sx={{
                            width: 280,
                            height: 280,
                            borderRadius: '50%',
                            overflow: 'hidden',
                            border: '3px solid transparent',
                            background: 'linear-gradient(135deg, #a855f7, #6366f1, #a855f7) border-box',
                            boxShadow: '0 0 28px 6px rgba(168,85,247,0.3), inset 0 0 20px rgba(0,0,0,0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: '#0c0a14',
                            flexShrink: 0,
                          }}
                        >
                          {boss.iconUrl ? (
                            <Box component="img" src={boss.iconUrl} alt={boss.name} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <PersonIcon sx={{ fontSize: 80, color: 'rgba(168,85,247,0.4)' }} />
                          )}
                        </Box>
                        {/* Boss name - gradient like character card */}
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography
                            variant="h4"
                            fontWeight={800}
                            lineHeight={1.2}
                            sx={{
                              background: 'linear-gradient(90deg, #e8e4f0, #c084fc)',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                            }}
                          >
                            {boss.name}
                          </Typography>
                          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5, fontWeight: 500 }}>
                            Level {boss.level}
                          </Typography>
                        </Box>
                        {/* Combat stats as chips (like CharacterPanel HP/AP/ARM) */}
                        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', justifyContent: 'center' }}>
                          <Box
                            component="span"
                            sx={{
                              fontWeight: 700,
                              fontSize: 13,
                              height: 28,
                              px: 1.5,
                              py: 0.5,
                              borderRadius: 1,
                              display: 'inline-flex',
                              alignItems: 'center',
                              bgcolor: 'rgba(239,68,68,0.12)',
                              color: '#f87171',
                              border: '1px solid rgba(239,68,68,0.3)',
                            }}
                          >
                            HP {boss.hp}
                          </Box>
                          <Box
                            component="span"
                            sx={{
                              fontWeight: 700,
                              fontSize: 13,
                              height: 28,
                              px: 1.5,
                              py: 0.5,
                              borderRadius: 1,
                              display: 'inline-flex',
                              alignItems: 'center',
                              bgcolor: 'rgba(245,158,11,0.12)',
                              color: '#fbbf24',
                              border: '1px solid rgba(245,158,11,0.3)',
                            }}
                          >
                            AP {boss.ap}
                          </Box>
                          <Box
                            component="span"
                            sx={{
                              fontWeight: 700,
                              fontSize: 13,
                              height: 28,
                              px: 1.5,
                              py: 0.5,
                              borderRadius: 1,
                              display: 'inline-flex',
                              alignItems: 'center',
                              bgcolor: 'rgba(99,102,241,0.12)',
                              color: '#818cf8',
                              border: '1px solid rgba(99,102,241,0.3)',
                            }}
                          >
                            ARM {boss.arm}
                          </Box>
                        </Box>
                      </>
                    ) : (
                      <Typography color="text.secondary">Boss data missing</Typography>
                    )}
                    {/* Status and actions */}
                    {currentDungeon.completed && (
                      <Typography color="success.main" fontWeight={700} sx={{ fontSize: '1rem' }}>
                        Already completed
                      </Typography>
                    )}
                    {!currentDungeon.completed && cooldownRemaining > 0 && (
                      <Typography color="text.secondary" fontWeight={500}>
                        Available in {cooldownRemaining} min
                      </Typography>
                    )}
                    {!currentDungeon.completed && cooldownRemaining === 0 && character.level >= currentDungeon.requiredLevel && (
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<SportsKabaddiIcon />}
                        onClick={handleFight}
                        disabled={fighting}
                        size="large"
                        sx={{
                          px: 5,
                          py: 2,
                          fontSize: '1.1rem',
                          fontWeight: 700,
                          boxShadow: '0 0 20px rgba(168,85,247,0.4)',
                          '&:hover': { boxShadow: '0 0 28px rgba(168,85,247,0.5)' },
                        }}
                      >
                        {fighting ? 'Fighting...' : 'Fight'}
                      </Button>
                    )}
                    {!currentDungeon.completed && character.level < currentDungeon.requiredLevel && (
                      <Typography color="text.secondary" fontWeight={500}>
                        Level {currentDungeon.requiredLevel} required
                      </Typography>
                    )}
                  </Box>
                )}
              </Paper>
            </Box>
          )}
        </>
      )}

      {phase === 'combat' && combatResult && currentDungeon && boss && (
        <Box sx={{ flex: 1 }}>
          <CombatReplay
            combat={combatResult.combat}
            leftCharacterId={character.id}
            abilityAnimations={abilityAnimations}
            statusAnimations={statusAnimations}
            statusTransforms={statusTransforms}
            arenaBackgroundImageUrl={bossReplayBackground}
            playerIntroSoundUrl={cls?.introSoundUrl}
            playerIntroSoundVolumePercent={cls?.introSoundVolumePercent}
            playerIntroSoundFadeInMs={cls?.introSoundFadeInMs}
            playerIntroSoundFadeOutMs={cls?.introSoundFadeOutMs}
            creatureIntroSoundUrl={boss.introSoundUrl}
            creatureIntroSoundVolumePercent={boss.introSoundVolumePercent}
            creatureIntroSoundFadeInMs={boss.introSoundFadeInMs}
            creatureIntroSoundFadeOutMs={boss.introSoundFadeOutMs}
            bossBattleMusicUrl={boss.bossBattleMusicUrl}
            bossBattleMusicVolumePercent={boss.bossBattleMusicVolumePercent}
            bossBattleMusicFadeInMs={boss.bossBattleMusicFadeInMs}
            bossBattleMusicFadeOutMs={boss.bossBattleMusicFadeOutMs}
            player={{
              name: character.name,
              level: character.level,
              maxHp: playerStats.maxHp,
              ap: playerStats.ap,
              arm: playerStats.arm,
              portraitUrl: character.portraitUrl ?? cls?.iconUrl,
              weaponUrl: weaponDef?.iconUrl,
              animationFrames: resolvedFrames ?? primaryAbility?.animationFrames,
              resource: playerResource,
            }}
            creature={{
              name: boss.name,
              level: boss.level,
              maxHp: boss.hp ?? 0,
              ap: boss.ap ?? 0,
              arm: boss.arm ?? 0,
              portraitUrl: boss.iconUrl ?? undefined,
              resource: resolveCreatureResource(pack, boss.resourceId),
            }}
            victory={combatResult.victory}
            onFinish={handleCombatFinish}
          />
        </Box>
      )}

      {phase === 'result' && combatResult && (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
          <Typography
            variant="h3"
            fontWeight={900}
            sx={{
              background: combatResult.victory
                ? 'linear-gradient(135deg, #4ade80, #22c55e)'
                : 'linear-gradient(135deg, #f87171, #ef4444)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {combatResult.victory ? 'Victory!' : 'Defeat'}
          </Typography>
          {combatResult.victory && combatResult.droppedItem && (
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                textAlign: 'center',
                bgcolor: 'rgba(168,85,247,0.08)',
                borderColor: 'rgba(168,85,247,0.3)',
              }}
            >
              <Typography variant="body2" color="text.secondary">
                You received:
              </Typography>
              <Typography variant="h6" sx={{ color: '#c084fc', fontWeight: 700 }}>
                {combatResult.droppedItem.name}{' '}
                <Typography component="span" variant="body2" color="text.secondary">
                  ({RARITY_NAMES[combatResult.droppedItem.rarity] ?? 'epic/legendary'})
                </Typography>
              </Typography>
            </Paper>
          )}
          <Button
            variant="contained"
            color="primary"
            onClick={handleBackToDungeons}
            size="large"
            sx={{ px: 5, py: 1.5, fontSize: '1.1rem' }}
          >
            Back to Dungeons
          </Button>
        </Box>
      )}
    </Box>
  )
}


