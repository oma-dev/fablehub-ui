import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import SportsKabaddiIcon from '@mui/icons-material/SportsKabaddi'
import {
  getRealmRoster,
  getRealmCharacterPlayState,
  getPvpHistory,
  pvpFight,
} from '../../../../../../services/api'
import type {
  CharacterState,
  CombatResult,
  IdleRpgPackV1,
  PlayStateResponse,
  PvpHistoryEntry,
  RealmRosterEntry,
} from '../../../../../../services/api'
import { computePlayerCombatStats, resolveCharacterResource } from '../utils/combatStats'
import CharacterCardModal from '../components/CharacterCardModal'
import CombatReplay from '../components/CombatReplay'
import { resolveAnimationFrames } from '../components/vfx/animationConfig'
import arenaBg from '../../../../../../assets/backgrounds/arena.png'

interface Props {
  fableId: string
  realmId: string
  character: CharacterState
  pack: IdleRpgPackV1
  /** When set from parent (e.g. Guild Fight), run this fight and show in arena. Parent clears when consumed. */
  pendingPvpFight?: { targetCharacterId: string; targetProfile: PlayStateResponse } | null
  onClearPendingPvpFight?: () => void
}

export default function PvPTab({ fableId, realmId, character, pack, pendingPvpFight, onClearPendingPvpFight }: Props) {
  const [roster, setRoster] = useState<RealmRosterEntry[]>([])
  const [rosterLoading, setRosterLoading] = useState(true)
  const [rosterError, setRosterError] = useState<string | null>(null)
  const [history, setHistory] = useState<PvpHistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null)
  const [profile, setProfile] = useState<PlayStateResponse | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [fighting, setFighting] = useState(false)
  const [combatResult, setCombatResult] = useState<{
    combat: CombatResult
    victory: boolean
    targetProfile: PlayStateResponse
  } | null>(null)

  const otherCharacters = roster.filter((r) => r.id !== character.id)

  useEffect(() => {
    let cancelled = false
    setRosterLoading(true)
    setRosterError(null)
    getRealmRoster(fableId, realmId)
      .then((list) => {
        if (!cancelled) setRoster(list)
      })
      .catch((err: unknown) => {
        if (!cancelled) setRosterError(err instanceof Error ? err.message : 'Failed to load roster')
      })
      .finally(() => {
        if (!cancelled) setRosterLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [fableId, realmId])

  useEffect(() => {
    let cancelled = false
    getPvpHistory(fableId, realmId, character.id)
      .then((list) => {
        if (!cancelled) setHistory(list)
      })
      .catch(() => { /* ignore */ })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false)
      })
    return () => { cancelled = true }
  }, [fableId, realmId, character.id])

  useEffect(() => {
    if (!selectedCharacterId) {
      setProfile(null)
      setProfileError(null)
      return
    }
    let cancelled = false
    setProfileLoading(true)
    setProfileError(null)
    getRealmCharacterPlayState(fableId, realmId, character.id, selectedCharacterId)
      .then((data) => {
        if (!cancelled) setProfile(data)
      })
      .catch((err: unknown) => {
        if (!cancelled) setProfileError(err instanceof Error ? err.message : 'Failed to load profile')
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [fableId, realmId, character.id, selectedCharacterId])

  // Consume pending fight from parent (e.g. Guild Fight button)
  useEffect(() => {
    if (!pendingPvpFight || fighting || combatResult) return
    const { targetCharacterId, targetProfile } = pendingPvpFight
    onClearPendingPvpFight?.() // Clear immediately to prevent double-invocation (e.g. StrictMode)
    let cancelled = false
    setFighting(true)
    pvpFight(fableId, realmId, character.id, targetCharacterId)
      .then((combat) => {
        if (!cancelled) {
          const victory = combat.winnerId === character.id
          setCombatResult({ combat, victory, targetProfile })
        }
      })
      .catch(() => { /* parent may show error */ })
      .finally(() => {
        if (!cancelled) setFighting(false)
      })
    return () => { cancelled = true }
  }, [pendingPvpFight, fableId, realmId, character.id, onClearPendingPvpFight])

  const handleCloseCard = () => {
    setSelectedCharacterId(null)
  }

  const handleFight = async () => {
    if (!selectedCharacterId || !profile) return
    setFighting(true)
    try {
      const combat = await pvpFight(fableId, realmId, character.id, selectedCharacterId)
      const victory = combat.winnerId === character.id
      setCombatResult({ combat, victory, targetProfile: profile })
      setSelectedCharacterId(null)
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : 'Failed to fight')
    } finally {
      setFighting(false)
    }
  }

  const handleCombatFinish = () => {
    setCombatResult(null)
    onClearPendingPvpFight?.()
    // Refresh history
    getPvpHistory(fableId, realmId, character.id).then(setHistory)
  }

  const inCombat = !!combatResult

  const getClassName = (classId: string) => pack.classes.find((c) => c.id === classId)?.name ?? classId

  const formatHistoryDate = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  const getHistoryOpponent = (entry: PvpHistoryEntry) =>
    entry.challengerId === character.id ? entry.targetName : entry.challengerName
  const getHistoryVictory = (entry: PvpHistoryEntry) =>
    entry.winnerId === character.id

  const playerStats = computePlayerCombatStats(character, pack)
  const targetStats = combatResult
    ? computePlayerCombatStats(combatResult.targetProfile.character, pack)
    : profile
      ? computePlayerCombatStats(profile.character, pack)
      : null
  const cls = pack.classes.find((c) => c.id === character.classId)
  const weaponItemId = character.equipment?.['attack_source']
  const weaponDef = weaponItemId ? pack.items.find((i) => i.id === weaponItemId) : undefined

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'auto',
        backgroundImage: inCombat ? `url(${arenaBg})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        p: inCombat ? 0 : 3,
        gap: inCombat ? 0 : 2,
      }}
    >
      {inCombat && combatResult && targetStats ? (() => {
        const targetCls = pack.classes.find((c) => c.id === combatResult!.targetProfile.character.classId)
        const targetWeaponId = combatResult!.targetProfile.character.equipment?.attack_source
        const targetWeaponDef = targetWeaponId ? pack.items.find((i) => i.id === targetWeaponId) : undefined
        const playerAbility = pack.abilities?.find((a) => a.id === cls?.primaryAttackId && a.abilityType === 'primary')
        const targetAbility = pack.abilities?.find((a) => a.id === targetCls?.primaryAttackId && a.abilityType === 'primary')
        const playerResolvedFrames = resolveAnimationFrames(playerAbility?.animationFrames, weaponDef?.iconUrl, weaponDef?.animationUrl, weaponDef?.projectileUrl, weaponDef?.impactUrl)
        const creatureResolvedFrames = resolveAnimationFrames(targetAbility?.animationFrames, targetWeaponDef?.iconUrl, targetWeaponDef?.animationUrl, targetWeaponDef?.projectileUrl, targetWeaponDef?.impactUrl)
        const playerResource = resolveCharacterResource(pack, character.classId)
        const targetResource = resolveCharacterResource(pack, combatResult.targetProfile.character.classId)
        const abilityAnimations: Record<string, any> = {}
        for (const ab of (pack.abilities ?? [])) {
          if (ab.animationFrames) {
            const r1 = resolveAnimationFrames(ab.animationFrames, weaponDef?.iconUrl, weaponDef?.animationUrl, weaponDef?.projectileUrl, weaponDef?.impactUrl)
            const r2 = resolveAnimationFrames(ab.animationFrames, targetWeaponDef?.iconUrl, targetWeaponDef?.animationUrl, targetWeaponDef?.projectileUrl, targetWeaponDef?.impactUrl)
            if (r1 || r2) abilityAnimations[ab.id] = r1 ?? r2
          }
        }
        const statusAnimations: Record<string, any> = {}
        for (const status of (pack.statusEffects ?? [])) {
          if (status.animation) statusAnimations[status.id] = status.animation
        }
        return (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 3, overflow: 'auto' }}>
            <CombatReplay
              combat={combatResult.combat}
              leftCharacterId={character.id}
              abilityAnimations={abilityAnimations}
              statusAnimations={statusAnimations}
              player={{
                name: character.name,
                level: character.level,
                maxHp: playerStats.maxHp,
                ap: playerStats.ap,
                arm: playerStats.arm,
                portraitUrl: character.portraitUrl ?? cls?.iconUrl,
                weaponUrl: weaponDef?.iconUrl,
                animationFrames: playerResolvedFrames ?? playerAbility?.animationFrames,
                resource: playerResource,
              }}
              creature={{
                name: combatResult.targetProfile.character.name,
                level: combatResult.targetProfile.character.level,
                maxHp: targetStats.maxHp,
                ap: targetStats.ap,
                arm: targetStats.arm,
                portraitUrl: combatResult.targetProfile.character.portraitUrl ?? targetCls?.iconUrl,
                weaponUrl: targetWeaponDef?.iconUrl,
                animationFrames: creatureResolvedFrames ?? targetAbility?.animationFrames,
                resource: targetResource,
              }}
              victory={combatResult.victory}
              onFinish={handleCombatFinish}
            />
          </Box>
        )
      })() : (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SportsKabaddiIcon sx={{ fontSize: 32, color: 'primary.main' }} />
            <Typography variant="h5" fontWeight={600}>
              PvP Arena
            </Typography>
          </Box>

          {rosterError && (
            <Typography color="error">{rosterError}</Typography>
          )}

          {rosterLoading ? (
            <Typography color="text.secondary">Loading arena roster...</Typography>
          ) : otherCharacters.length === 0 ? (
            <Typography color="text.secondary">No other players in this realm yet.</Typography>
          ) : (
            <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
              <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Realm Champions
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Click a player to view their profile and challenge them to a duel.
                </Typography>
              </Box>
              <TableContainer>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell align="right">Level</TableCell>
                      <TableCell>Class</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {otherCharacters.map((r) => (
                      <TableRow
                        key={r.id}
                        hover
                        onClick={() => setSelectedCharacterId(r.id)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>{r.name}</TableCell>
                        <TableCell align="right">{r.level}</TableCell>
                        <TableCell>{getClassName(r.classId)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}

          <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
            <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle1" fontWeight={600}>
                Fight History
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Your recent PvP duels.
              </Typography>
            </Box>
            <TableContainer>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Opponent</TableCell>
                    <TableCell align="center">Result</TableCell>
                    <TableCell align="right">When</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {historyLoading ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ color: 'text.secondary', py: 3 }}>
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : history.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ color: 'text.secondary', py: 3 }}>
                        No fights yet. Challenge someone above!
                      </TableCell>
                    </TableRow>
                  ) : (
                    history.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{getHistoryOpponent(entry)}</TableCell>
                        <TableCell align="center">
                          <Chip
                            label={entry.winnerId ? (getHistoryVictory(entry) ? 'Victory' : 'Defeat') : 'Draw'}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              fontSize: 11,
                              ...(entry.winnerId
                                ? getHistoryVictory(entry)
                                  ? { bgcolor: 'rgba(34,197,94,0.2)', color: '#22c55e' }
                                  : { bgcolor: 'rgba(239,68,68,0.2)', color: '#ef4444' }
                                : { bgcolor: 'rgba(156,163,175,0.2)', color: '#9ca3af' }),
                            }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ color: 'text.secondary', fontSize: 13 }}>
                          {formatHistoryDate(entry.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          <CharacterCardModal
            open={!!selectedCharacterId}
            onClose={handleCloseCard}
            profile={profile}
            loading={profileLoading}
            error={profileError}
            fableId={fableId}
            realmId={realmId}
            showFightButton={!!selectedCharacterId && !!profile}
            onFight={handleFight}
            fighting={fighting}
          />
        </>
      )}
    </Box>
  )
}
