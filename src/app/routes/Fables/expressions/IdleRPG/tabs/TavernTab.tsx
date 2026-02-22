import { useCallback, useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
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
import { startQuest, claimQuest } from '../../../../../../services/api'
import type { CharacterState, CombatResult, IdleRpgPackV1, Quest } from '../../../../../../services/api'

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
  const [combatData, setCombatData] = useState<{ combat: CombatResult; victory: boolean; quest: Quest } | null>(null)

  // Timer state
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
    setError(null)
    try {
      const updated = await startQuest(fableId, realmId, character.id, quest.id)
      onCharacterUpdate(updated)
      setPhase('questActive')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start quest')
    }
  }

  const handleClaim = async () => {
    setError(null)
    try {
      const result = await claimQuest(fableId, realmId, character.id)
      onCharacterUpdate(result.character)
      const quest = pack.quests.find((q) => q.id === activeQuest?.questId) ?? pack.quests[0]
      setCombatData({ combat: result.combat, victory: result.victory, quest })
      setPhase('combat')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to claim quest')
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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {error && <Typography color="error" sx={{ mb: 1 }}>{error}</Typography>}

      {/* Idle: NPC */}
      {phase === 'idle' && (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <Paper
            elevation={3}
            sx={{
              width: 120, height: 120, borderRadius: '50%', bgcolor: 'secondary.light',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.08)' },
            }}
            onClick={openQuestPicker}
          >
            <Typography variant="h3" color="secondary.contrastText">T</Typography>
          </Paper>
          <Typography variant="subtitle1" fontWeight={600}>Tavern Keeper</Typography>
          <Typography variant="body2" color="text.secondary">Click to view available quests</Typography>
        </Box>
      )}

      {/* Quest picker modal */}
      <Dialog open={phase === 'questPicker'} onClose={() => setPhase('idle')} maxWidth="sm" fullWidth>
        <DialogTitle>Choose a Quest</DialogTitle>
        <DialogContent>
          <List>
            {randomQuests.map((q) => {
              const creature = creatureForQuest(q)
              return (
                <ListItemButton key={q.id} onClick={() => handleSelectQuest(q)} sx={{ mb: 1, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                  <ListItemText
                    primary={q.name}
                    secondary={`Creature: ${creature?.name ?? q.creatureId} (Lv ${creature?.level ?? '?'})  |  Duration: ${q.durationSec}s  |  XP: ${q.rewards.xp}  |  Gold: ${q.rewards.currency.gold ?? 0}`}
                  />
                </ListItemButton>
              )
            })}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPhase('idle')}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Quest active: timer */}
      {phase === 'questActive' && (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
          <Typography variant="h6" fontWeight={600}>
            {activeQuestDef?.name ?? 'Quest in progress'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Fighting {creatureForQuest(activeQuestDef)?.name ?? 'unknown creature'}...
          </Typography>

          <Box sx={{ width: '80%', maxWidth: 400 }}>
            <LinearProgress variant="determinate" value={timerProgress} sx={{ height: 16, borderRadius: 2 }} />
            <Typography variant="body2" textAlign="center" sx={{ mt: 1 }} fontWeight={600}>{timerText}</Typography>
          </Box>

          <Button variant="contained" color="primary" disabled={!questDone} onClick={handleClaim} size="large">
            {questDone ? 'Claim reward' : 'Waiting...'}
          </Button>
        </Box>
      )}

      {/* Combat replay */}
      {phase === 'combat' && combatData && (() => {
        const creatureDef = creatureForQuest(combatData.quest)
        const cls = pack.classes.find((c) => c.id === character.classId)
        const weaponItemId = character.equipment?.['attack_source']
        const weaponDef = weaponItemId ? pack.items.find((i) => i.id === weaponItemId) : undefined
        return (
          <Box sx={{ flex: 1 }}>
            <CombatReplay
              combat={combatData.combat}
              player={{
                name: character.name,
                level: character.level,
                maxHp: character.hp,
                ap: character.ap,
                arm: character.arm,
                portraitUrl: character.portraitUrl,
                styleId: cls?.primaryAttack?.styleId,
                weaponUrl: weaponDef?.iconUrl,
              }}
              creature={{
                name: creatureDef?.name ?? 'Creature',
                level: creatureDef?.level ?? 1,
                maxHp: creatureDef?.hp ?? 10,
                ap: creatureDef?.ap ?? 1,
                arm: creatureDef?.arm ?? 0,
                portraitUrl: creatureDef?.iconUrl,
                styleId: 'melee_slash',
              }}
              victory={combatData.victory}
              onFinish={handleCombatFinish}
            />
          </Box>
        )
      })()}

      {/* Result */}
      {phase === 'result' && combatData && (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <Typography variant="h4" fontWeight={700} color={combatData.victory ? 'success.main' : 'error.main'}>
            {combatData.victory ? 'Quest Complete!' : 'Quest Failed'}
          </Typography>
          {combatData.victory && combatData.quest && (
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body1">+{combatData.quest.rewards.xp} XP</Typography>
              {Object.entries(combatData.quest.rewards.currency).map(([cur, amt]) => (
                <Typography key={cur} variant="body1">+{amt} {cur}</Typography>
              ))}
            </Paper>
          )}
          <Button variant="contained" color="primary" onClick={handleBackToTavern} size="large">Back to Tavern</Button>
        </Box>
      )}
    </Box>
  )
}
