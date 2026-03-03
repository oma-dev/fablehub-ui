import { useCallback, useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import tavernBg from '../../../../../../assets/backgrounds/tavern.png'
import arenaBg from '../../../../../../assets/backgrounds/arena.png'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import LinearProgress from '@mui/material/LinearProgress'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
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

function pickRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr]
  const result: T[] = []
  while (result.length < n && copy.length > 0) {
    const idx = Math.floor(Math.random() * copy.length)
    result.push(copy.splice(idx, 1)[0])
  }
  return result
}

export default function TavernTab({ fableId, realmId, character, pack, onCharacterUpdate }: Props) {
  const [phase, setPhase] = useState<Phase>(() =>
    character.questState.activeQuest ? 'questActive' : 'idle',
  )
  const [randomQuests, setRandomQuests] = useState<Quest[]>([])
  const [error, setError] = useState<string | null>(null)
  const [startingQuestId, setStartingQuestId] = useState<string | null>(null)
  const [claiming, setClaiming] = useState(false)
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

  const openQuestPicker = useCallback(() => {
    setRandomQuests(pickRandom(pack.quests, 3))
    setPhase('questPicker')
    setError(null)
  }, [pack.quests])

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

  const creatureForQuest = (quest: Quest | undefined) =>
    quest ? pack.creatures.find((c) => c.id === quest.creatureId) : undefined

  const handleCombatFinish = () => {
    setPhase('result')
  }

  const handleBackToTavern = () => {
    setCombatData(null)
    setPhase('idle')
  }

  const bgImage = phase === 'combat' ? arenaBg : tavernBg
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {error && <Typography color="error" sx={{ mb: 1.5 }}>{error}</Typography>}

      {/* Idle: NPC */}
      {phase === 'idle' && (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
          <Paper
            elevation={0}
            sx={{
              width: 140,
              height: 140,
              borderRadius: '50%',
              bgcolor: '#1e1d2e',
              border: '2px solid rgba(168,85,247,0.5)',
              boxShadow: '0 0 30px rgba(168,85,247,0.25), 0 0 60px rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'scale(1.08)',
                boxShadow: '0 0 40px rgba(168,85,247,0.4), 0 0 80px rgba(0,0,0,0.35)',
              },
            }}
            onClick={openQuestPicker}
          >
            <Typography
              variant="h2"
              sx={{
                fontWeight: 900,
                background: 'linear-gradient(135deg, #c084fc, #818cf8)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              T
            </Typography>
          </Paper>
          <Typography variant="h6" fontWeight={700} color="text.primary">Tavern Keeper</Typography>
          <Typography variant="body1" color="text.secondary">Click to view available quests</Typography>
        </Box>
      )}

      {/* Quest picker modal */}
      <Dialog open={phase === 'questPicker'} onClose={() => setPhase('idle')} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{
            fontWeight: 800,
            fontSize: '1.3rem',
            background: 'linear-gradient(90deg, #e8e4f0, #c084fc)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Choose a Quest
        </DialogTitle>
        <DialogContent>
          <List sx={{ display: 'flex', flexDirection: 'column', gap: 1, pt: 1 }}>
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
                    py: 1.5,
                    px: 2,
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: 'rgba(168,85,247,0.4)',
                      boxShadow: '0 0 16px rgba(168,85,247,0.15)',
                      bgcolor: 'rgba(168,85,247,0.08)',
                    },
                  }}
                >
                  <ListItemText
                    primary={<Typography variant="body1" fontWeight={700} sx={{ fontSize: '1.05rem' }}>{startingQuestId === q.id ? `${q.name} …` : q.name}</Typography>}
                    secondary={
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Creature: {creature?.name ?? q.creatureId} (Lv {creature?.level ?? '?'}) · Duration: {q.durationSec}s · XP: {q.rewards.xp} · Gold: {q.rewards.currency.gold ?? 0}
                      </Typography>
                    }
                  />
                </ListItemButton>
              )
            })}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPhase('idle')} variant="outlined" color="primary" disabled={startingQuestId !== null}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Quest active: timer */}
      {phase === 'questActive' && (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
          <Typography
            variant="h5"
            fontWeight={800}
            sx={{
              background: 'linear-gradient(90deg, #e8e4f0, #c084fc)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {activeQuestDef?.name ?? 'Quest in progress'}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Fighting {creatureForQuest(activeQuestDef)?.name ?? 'unknown creature'}...
          </Typography>

          <Box sx={{ width: '80%', maxWidth: 450 }}>
            <LinearProgress
              variant="determinate"
              value={timerProgress}
              sx={{
                height: 20,
                borderRadius: 2.5,
                bgcolor: 'rgba(168,85,247,0.1)',
                border: '1px solid rgba(168,85,247,0.15)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 2.5,
                  background: questDone
                    ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
                    : 'linear-gradient(90deg, #c084fc, #a855f7)',
                  boxShadow: questDone
                    ? '0 0 12px rgba(251,191,36,0.4)'
                    : '0 0 12px rgba(168,85,247,0.4)',
                },
              }}
            />
            <Typography
              variant="h6"
              textAlign="center"
              sx={{ mt: 1.5, fontWeight: 700, color: questDone ? '#fbbf24' : 'text.primary' }}
            >
              {timerText}
            </Typography>
          </Box>

          <Button
            variant="contained"
            color={questDone ? 'warning' : 'primary'}
            disabled={!questDone || claiming}
            onClick={handleClaim}
            size="large"
            sx={{ px: 5, py: 1.5, fontSize: '1.1rem' }}
          >
            {claiming ? 'Claiming…' : questDone ? 'Claim Reward' : 'Waiting...'}
          </Button>
        </Box>
      )}

      {/* Combat replay */}
      {phase === 'combat' && combatData && (() => {
        const creatureDef = creatureForQuest(combatData.quest)
        const cls = pack.classes.find((c) => c.id === character.classId)
        const weaponItemId = character.equipment?.['attack_source']
        const weaponDef = weaponItemId ? pack.items.find((i) => i.id === weaponItemId) : undefined
        const primaryAbility = pack.abilities?.find((a) => a.id === cls?.primaryAttackId && a.abilityType === 'primary')
        const resolvedFrames = resolveAnimationFrames(
          primaryAbility?.animationFrames,
          weaponDef?.iconUrl,
          weaponDef?.animationUrl,
          weaponDef?.projectileUrl,
          weaponDef?.impactUrl
        )
        const playerStats = computePlayerCombatStats(character, pack)
        const playerResource = resolveCharacterResource(pack, character.classId)
        const creatureResource = resolveCreatureResource(pack, creatureDef?.resourceId)
        const abilityAnimations: Record<string, any> = {}
        for (const ab of (pack.abilities ?? [])) {
          if (ab.animationFrames) {
            const resolved = resolveAnimationFrames(ab.animationFrames, weaponDef?.iconUrl, weaponDef?.animationUrl, weaponDef?.projectileUrl, weaponDef?.impactUrl)
            if (resolved) abilityAnimations[ab.id] = resolved
          }
        }
        const statusAnimations: Record<string, any> = {}
        for (const status of (pack.statusEffects ?? [])) {
          if (status.animation) statusAnimations[status.id] = status.animation
        }
        return (
          <Box sx={{ flex: 1 }}>
            <CombatReplay
              combat={combatData.combat}
              leftCharacterId={character.id}
              abilityAnimations={abilityAnimations}
              statusAnimations={statusAnimations}
              playerIntroSoundUrl={cls?.introSoundUrl}
              creatureIntroSoundUrl={creatureDef?.introSoundUrl}
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

