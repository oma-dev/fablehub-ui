import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import SportsKabaddiIcon from '@mui/icons-material/SportsKabaddi'
import AccessTimeFilledIcon from '@mui/icons-material/AccessTimeFilled'
import HistoryIcon from '@mui/icons-material/History'
import GroupsIcon from '@mui/icons-material/Groups'
import {
  getRealmRoster,
  getRealmCharacterPlayState,
  getPvpHistory,
  pvpFight,
} from '@features/idle-rpg/api'
import type {
  CharacterState,
  CombatResult,
  IdleRpgPackV1,
  PlayStateResponse,
  PvpHistoryEntry,
  RealmRosterEntry,
} from '@features/idle-rpg/api'
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
  pendingPvpFight?: { targetCharacterId: string; targetProfile: PlayStateResponse } | null
  onClearPendingPvpFight?: () => void
}

function formatCooldownRemaining(durationMs: number): string {
  const remainingSeconds = Math.max(1, Math.ceil(durationMs / 1000))
  const hours = Math.floor(remainingSeconds / 3600)
  const minutes = Math.floor((remainingSeconds % 3600) / 60)
  const seconds = remainingSeconds % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

function getPvpSettlementDialogData(
  combat: CombatResult | null,
  viewerCharacterId: string,
): { title: string; message: string } | null {
  const settlement = combat?.pvpSettlement
  if (!settlement) return null
  const normalizedAmount = Math.max(0, Math.floor(Number(settlement.amount) || 0))
  const won = settlement.winnerId === viewerCharacterId
  return {
    title: won ? 'PvP Reward' : 'PvP Penalty',
    message: won
      ? `You won ${normalizedAmount} ${settlement.currencyName}.`
      : `You lost ${normalizedAmount} ${settlement.currencyName}.`,
  }
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
  const [pvpSettlementDialog, setPvpSettlementDialog] = useState<{ title: string; message: string } | null>(null)
  const [cooldownNowMs, setCooldownNowMs] = useState(() => Date.now())

  const otherCharacters = roster.filter((r) => r.id !== character.id)
  const pvpCooldownUntil = Number(character.progression?.pvpAttackCooldownUntil ?? 0)
  const pvpCooldownRemainingMs = Math.max(0, pvpCooldownUntil - cooldownNowMs)
  const isPvpCooldownActive = pvpCooldownRemainingMs > 0
  const fightButtonLabel = isPvpCooldownActive
    ? `Cooldown: ${formatCooldownRemaining(pvpCooldownRemainingMs)}`
    : 'Fight'

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
    if (!selectedCharacterId && !isPvpCooldownActive) return
    setCooldownNowMs(Date.now())
    const intervalId = window.setInterval(() => setCooldownNowMs(Date.now()), 1000)
    return () => window.clearInterval(intervalId)
  }, [selectedCharacterId, isPvpCooldownActive])

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

  useEffect(() => {
    if (!pendingPvpFight || fighting || combatResult) return
    const { targetCharacterId, targetProfile } = pendingPvpFight
    if (isPvpCooldownActive) {
      onClearPendingPvpFight?.()
      setSelectedCharacterId(targetCharacterId)
      setProfile(targetProfile)
      setProfileError(`PvP cooldown active: ${formatCooldownRemaining(pvpCooldownRemainingMs)} remaining.`)
      return
    }
    onClearPendingPvpFight?.()
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
  }, [
    pendingPvpFight,
    fighting,
    combatResult,
    isPvpCooldownActive,
    pvpCooldownRemainingMs,
    fableId,
    realmId,
    character.id,
    onClearPendingPvpFight,
  ])

  const handleCloseCard = () => {
    setSelectedCharacterId(null)
  }

  const handleFight = async () => {
    if (!selectedCharacterId || !profile) return
    if (isPvpCooldownActive) {
      setProfileError(`PvP cooldown active: ${formatCooldownRemaining(pvpCooldownRemainingMs)} remaining.`)
      return
    }
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

  const finalizeCombatReplay = () => {
    setCombatResult(null)
    onClearPendingPvpFight?.()
    getPvpHistory(fableId, realmId, character.id).then(setHistory)
  }

  const handleCombatFinish = () => {
    const settlementDialog = getPvpSettlementDialogData(combatResult?.combat ?? null, character.id)
    if (settlementDialog) {
      setPvpSettlementDialog(settlementDialog)
      return
    }
    finalizeCombatReplay()
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

  const panelSx = {
    bgcolor: 'rgba(18,16,30,0.9)',
    border: '1px solid rgba(168,85,247,0.2)',
    borderRadius: 2,
    boxShadow: 'inset 0 0 34px rgba(124,58,237,0.08), 0 12px 24px rgba(0,0,0,0.28)',
  } as const

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
        backgroundImage: inCombat ? `url(${arenaBg})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        p: inCombat ? 0 : { xs: 1, sm: 1.5 },
        gap: inCombat ? 0 : 1.5,
      }}
    >
      <Dialog
        open={!!pvpSettlementDialog}
        onClose={() => {
          setPvpSettlementDialog(null)
          finalizeCombatReplay()
        }}
      >
        <DialogTitle>{pvpSettlementDialog?.title ?? 'PvP Settlement'}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">{pvpSettlementDialog?.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            onClick={() => {
              setPvpSettlementDialog(null)
              finalizeCombatReplay()
            }}
          >
            Continue
          </Button>
        </DialogActions>
      </Dialog>

      {inCombat && combatResult && targetStats ? (() => {
        const targetCls = pack.classes.find((c) => c.id === combatResult.targetProfile.character.classId)
        const targetWeaponId = combatResult.targetProfile.character.equipment?.attack_source
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
        const statusTransforms: Record<string, any> = {}
        for (const status of (pack.statusEffects ?? [])) {
          if (status.animation) statusAnimations[status.id] = status.animation
          if (status.transform) statusTransforms[status.id] = status.transform
        }
        return (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 3, overflow: 'auto' }}>
            <CombatReplay
              combat={combatResult.combat}
              leftCharacterId={character.id}
              arenaBackgroundImageUrl={arenaBg}
              abilityAnimations={abilityAnimations}
              statusAnimations={statusAnimations}
              statusTransforms={statusTransforms}
              playerIntroSoundUrl={cls?.introSoundUrl}
              playerIntroSoundVolumePercent={cls?.introSoundVolumePercent}
              playerIntroSoundFadeInMs={cls?.introSoundFadeInMs}
              playerIntroSoundFadeOutMs={cls?.introSoundFadeOutMs}
              creatureIntroSoundUrl={targetCls?.introSoundUrl}
              creatureIntroSoundVolumePercent={targetCls?.introSoundVolumePercent}
              creatureIntroSoundFadeInMs={targetCls?.introSoundFadeInMs}
              creatureIntroSoundFadeOutMs={targetCls?.introSoundFadeOutMs}
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
          <Paper variant="outlined" sx={{ ...panelSx, p: 1.2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SportsKabaddiIcon sx={{ fontSize: 30, color: '#c084fc' }} />
                <Typography variant="h6" fontWeight={800}>PvP Arena</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.7, flexWrap: 'wrap' }}>
                <Chip
                  icon={<AccessTimeFilledIcon sx={{ color: '#fbbf24 !important' }} />}
                  label={isPvpCooldownActive ? `Cooldown ${formatCooldownRemaining(pvpCooldownRemainingMs)}` : 'Ready to fight'}
                  size="small"
                  sx={{
                    bgcolor: isPvpCooldownActive ? 'rgba(245,158,11,0.16)' : 'rgba(34,197,94,0.16)',
                    color: isPvpCooldownActive ? '#fbbf24' : '#4ade80',
                    fontWeight: 700,
                  }}
                />
                <Chip
                  icon={<GroupsIcon sx={{ color: '#c084fc !important' }} />}
                  label={`${otherCharacters.length} Opponents`}
                  size="small"
                  sx={{ bgcolor: 'rgba(168,85,247,0.18)', color: '#e9d5ff', fontWeight: 700 }}
                />
              </Box>
            </Box>
          </Paper>

          {rosterError && <Typography color="error" sx={{ px: 0.5 }}>{rosterError}</Typography>}

          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: { xs: '1fr', xl: 'minmax(520px,1.2fr) minmax(380px,0.9fr)' },
            }}
          >
            <Paper variant="outlined" sx={{ ...panelSx, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Box sx={{ px: 1.5, py: 1.1 }}>
                <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#e8e4f0' }}>Realm Champions</Typography>
                <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
                  Select a target to inspect and challenge.
                </Typography>
              </Box>
              <Divider />

              <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                {rosterLoading ? (
                  <Box sx={{ p: 2 }}>
                    <Typography color="text.secondary">Loading arena roster...</Typography>
                  </Box>
                ) : otherCharacters.length === 0 ? (
                  <Box sx={{ p: 2 }}>
                    <Typography color="text.secondary">No other players in this realm yet.</Typography>
                  </Box>
                ) : (
                  <TableContainer sx={{ maxHeight: '100%' }}>
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
                            sx={{
                              cursor: 'pointer',
                              bgcolor: selectedCharacterId === r.id ? 'rgba(168,85,247,0.16)' : undefined,
                            }}
                          >
                            <TableCell sx={{ fontWeight: 700 }}>{r.name}</TableCell>
                            <TableCell align="right">{r.level}</TableCell>
                            <TableCell>{getClassName(r.classId)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            </Paper>

            <Paper variant="outlined" sx={{ ...panelSx, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Box sx={{ px: 1.5, py: 1.1, display: 'flex', alignItems: 'center', gap: 0.8 }}>
                <HistoryIcon sx={{ fontSize: 20, color: '#c084fc' }} />
                <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#e8e4f0' }}>Fight History</Typography>
              </Box>
              <Divider />
              <TableContainer sx={{ flex: 1, minHeight: 0 }}>
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
                          Loading...
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
          </Box>

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
            fightButtonLabel={fightButtonLabel}
            fightButtonDisabled={isPvpCooldownActive}
          />
        </>
      )}
    </Box>
  )
}
