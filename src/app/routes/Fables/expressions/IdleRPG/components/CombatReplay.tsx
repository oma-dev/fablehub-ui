import { useEffect, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import type { CombatResult } from '../../../../../../services/api'

interface Props {
  combat: CombatResult
  playerName: string
  playerMaxHp: number
  creatureName: string
  creatureMaxHp: number
  victory: boolean
  onFinish: () => void
}

interface LogEntry {
  turn: number
  text: string
}

export default function CombatReplay({ combat, playerName, playerMaxHp, creatureName, creatureMaxHp, victory, onFinish }: Props) {
  const [playerHp, setPlayerHp] = useState(playerMaxHp)
  const [creatureHp, setCreatureHp] = useState(creatureMaxHp)
  const [log, setLog] = useState<LogEntry[]>([])
  const [done, setDone] = useState(false)
  const [currentTurn, setCurrentTurn] = useState(-1)
  const logRef = useRef<HTMLDivElement>(null)
  const playerId = combat.turns[0]?.events[0]?.sourceId ?? 'player'
  const creatureId = Object.keys(combat.finalHp).find((k) => k !== playerId) ?? 'creature'

  const nameOf = (id: string) => (id === playerId ? playerName : creatureName)

  useEffect(() => {
    if (combat.turns.length === 0) {
      setDone(true)
      return
    }
    let turnIdx = 0
    const timer = setInterval(() => {
      if (turnIdx >= combat.turns.length) {
        clearInterval(timer)
        setDone(true)
        return
      }
      const turn = combat.turns[turnIdx]
      setCurrentTurn(turn.turnIndex)
      const newEntries: LogEntry[] = []
      for (const ev of turn.events) {
        if (ev.targetId === playerId) setPlayerHp(Math.max(0, ev.targetHpAfter))
        else setCreatureHp(Math.max(0, ev.targetHpAfter))
        const verb = ev.type === 'damage' ? 'deals' : 'heals'
        newEntries.push({
          turn: turn.turnIndex,
          text: `${nameOf(ev.sourceId)} ${verb} ${ev.value} to ${nameOf(ev.targetId)} (HP: ${Math.max(0, ev.targetHpAfter)})`,
        })
      }
      setLog((prev) => [...prev, ...newEntries])
      turnIdx++
    }, 1500)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [log])

  const hpPct = (hp: number, max: number) => Math.max(0, Math.min(100, (hp / max) * 100))
  const hpColor = (pct: number) => (pct > 50 ? 'success' : pct > 25 ? 'warning' : 'error')

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, height: '100%' }}>
      {currentTurn >= 0 && (
        <Typography variant="caption" color="text.secondary" textAlign="center">
          Turn {currentTurn + 1} / {combat.turns.length}
        </Typography>
      )}

      <Box sx={{ display: 'flex', gap: 4, justifyContent: 'center', alignItems: 'stretch' }}>
        {/* Player card */}
        <Paper variant="outlined" sx={{ p: 3, flex: 1, maxWidth: 280, textAlign: 'center' }}>
          <Box sx={{ width: 80, height: 80, mx: 'auto', mb: 1, bgcolor: 'primary.light', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="h4" color="primary.contrastText">P</Typography>
          </Box>
          <Typography variant="subtitle1" fontWeight={600}>{playerName}</Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">HP {playerHp} / {playerMaxHp}</Typography>
            <LinearProgress
              variant="determinate"
              value={hpPct(playerHp, playerMaxHp)}
              color={hpColor(hpPct(playerHp, playerMaxHp))}
              sx={{ height: 12, borderRadius: 1, mt: 0.5 }}
            />
          </Box>
        </Paper>

        <Typography variant="h4" color="text.disabled" sx={{ alignSelf: 'center' }}>VS</Typography>

        {/* Creature card */}
        <Paper variant="outlined" sx={{ p: 3, flex: 1, maxWidth: 280, textAlign: 'center' }}>
          <Box sx={{ width: 80, height: 80, mx: 'auto', mb: 1, bgcolor: 'error.light', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="h4" color="error.contrastText">E</Typography>
          </Box>
          <Typography variant="subtitle1" fontWeight={600}>{creatureName}</Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">HP {creatureHp} / {creatureMaxHp}</Typography>
            <LinearProgress
              variant="determinate"
              value={hpPct(creatureHp, creatureMaxHp)}
              color={hpColor(hpPct(creatureHp, creatureMaxHp))}
              sx={{ height: 12, borderRadius: 1, mt: 0.5 }}
            />
          </Box>
        </Paper>
      </Box>

      {/* Battle log */}
      <Paper variant="outlined" ref={logRef} sx={{ flex: 1, minHeight: 160, maxHeight: 260, overflow: 'auto', p: 2 }}>
        <Typography variant="subtitle2" fontWeight={600} gutterBottom>Battle Log</Typography>
        {log.length === 0 && <Typography variant="body2" color="text.disabled">Combat starting...</Typography>}
        {log.map((entry, i) => (
          <Typography key={i} variant="body2" sx={{ fontFamily: 'monospace', fontSize: 13, lineHeight: 1.6 }}>
            <strong>Turn {entry.turn + 1}:</strong> {entry.text}
          </Typography>
        ))}
      </Paper>

      {/* Result overlay */}
      {done && (
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <Typography variant="h5" fontWeight={700} color={victory ? 'success.main' : 'error.main'} gutterBottom>
            {victory ? 'Victory!' : 'Defeat'}
          </Typography>
          <Button variant="contained" color="primary" onClick={onFinish}>Continue</Button>
        </Box>
      )}
    </Box>
  )
}
