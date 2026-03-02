import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import CastleIcon from '@mui/icons-material/Castle'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import SportsKabaddiIcon from '@mui/icons-material/SportsKabaddi'
import PersonIcon from '@mui/icons-material/Person'
import { getDungeons, fightDungeonBoss } from '../../../../../../services/api'
import type {
  CharacterState,
  CombatResult,
  DungeonWithBoss,
  IdleRpgPackV1,
  ItemTemplate,
} from '../../../../../../services/api'
import { RARITY_NAMES } from '../../../../../../services/api'
import CombatReplay from '../components/CombatReplay'
import { resolveAnimationFrames } from '../components/vfx/animationConfig'
import { computePlayerCombatStats, resolveCharacterResource, resolveCreatureResource } from '../utils/combatStats'

import dungeonBg from '../../../../../../assets/backgrounds/dungeon.png'

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
  const boss = currentDungeon?.boss
  const bossReplayBackground = boss?.backgroundImageUrl?.trim() ? boss.backgroundImageUrl.trim() : undefined

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundImage: `url(${dungeonBg})`,
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
              <Typography color="text.secondary">Loading dungeons…</Typography>
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
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                px: 2,
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

              <Paper
                elevation={0}
                onClick={() => currentDungeon && setModalOpen(true)}
                sx={{
                  width: 380,
                  minHeight: 440,
                  borderRadius: 3,
                  overflow: 'hidden',
                  textAlign: 'center',
                  cursor: 'pointer',
                  bgcolor: '#0c0a14',
                  border: '3px solid transparent',
                  backgroundImage: 'linear-gradient(#0c0a14, #0c0a14), linear-gradient(135deg, #a855f7, #6366f1, #a855f7)',
                  backgroundOrigin: 'border-box',
                  backgroundClip: 'padding-box, border-box',
                  boxShadow: '0 0 40px 8px rgba(168,85,247,0.25), inset 0 0 24px rgba(0,0,0,0.3)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'scale(1.02)',
                    boxShadow: '0 0 56px 12px rgba(168,85,247,0.35), inset 0 0 24px rgba(0,0,0,0.3)',
                  },
                }}
              >
                {/* Dungeon image (door art) — large focal area */}
                <Box
                  sx={{
                    width: '100%',
                    height: 220,
                    bgcolor: 'rgba(20,18,31,0.95)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {currentDungeon?.imageUrl ? (
                    <Box
                      component="img"
                      src={currentDungeon.imageUrl}
                      alt={currentDungeon.name}
                      sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <CastleIcon sx={{ fontSize: 80, color: 'rgba(168,85,247,0.4)' }} />
                  )}
                </Box>
                <Box sx={{ p: 2.5 }}>
                  <Typography variant="overline" color="text.secondary" letterSpacing={1.5}>
                    Dungeon
                  </Typography>
                  <Typography
                    variant="h5"
                    fontWeight={800}
                    sx={{
                      mt: 0.5,
                      mb: 1,
                      background: 'linear-gradient(90deg, #e8e4f0, #c084fc)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    {currentDungeon?.name ?? '—'}
                  </Typography>
                  {currentDungeon?.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, minHeight: 40 }}>
                      {currentDungeon.description}
                    </Typography>
                  )}
                  <Typography variant="body2" color="text.secondary">
                    Required level: <strong>{currentDungeon?.requiredLevel ?? 1}</strong>
                  </Typography>
                  {currentDungeon?.completed && (
                    <Typography variant="body2" sx={{ mt: 1.5, color: 'success.main', fontWeight: 700 }}>
                      Completed
                    </Typography>
                  )}
                  <Typography variant="caption" display="block" sx={{ mt: 1.5, color: 'text.secondary' }}>
                    Click to view boss
                  </Typography>
                </Box>
              </Paper>

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

          <Dialog
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            maxWidth="sm"
            fullWidth
            PaperProps={{
              sx: {
                borderRadius: 3,
                bgcolor: '#0c0a14',
                border: '2px solid transparent',
                backgroundImage: 'linear-gradient(#0c0a14, #0c0a14), linear-gradient(135deg, #a855f7, #6366f1, #a855f7)',
                backgroundOrigin: 'border-box',
                backgroundClip: 'padding-box, border-box',
                boxShadow: '0 0 40px 8px rgba(168,85,247,0.2), inset 0 0 24px rgba(0,0,0,0.3)',
              },
            }}
          >
            <DialogContent sx={{ pt: 4, pb: 4, px: 4 }}>
              {currentDungeon && (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <Typography variant="overline" color="text.secondary" letterSpacing={2}>
                    {currentDungeon.name} — Boss
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
                      {/* Boss name — gradient like character card */}
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
                      {fighting ? 'Fighting…' : 'Fight'}
                    </Button>
                  )}
                  {!currentDungeon.completed && character.level < currentDungeon.requiredLevel && (
                    <Typography color="text.secondary" fontWeight={500}>
                      Level {currentDungeon.requiredLevel} required
                    </Typography>
                  )}
                </Box>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}

      {phase === 'combat' && combatResult && currentDungeon && boss && (
        <Box sx={{ flex: 1 }}>
          <CombatReplay
            combat={combatResult.combat}
            leftCharacterId={character.id}
            abilityAnimations={abilityAnimations}
            arenaBackgroundImageUrl={bossReplayBackground}
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
              maxHp: boss.hp,
              ap: boss.ap,
              arm: boss.arm,
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
