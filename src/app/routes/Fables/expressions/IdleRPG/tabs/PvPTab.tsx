import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
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
  pvpFight,
} from '../../../../../../services/api'
import type {
  CharacterState,
  CombatResult,
  IdleRpgPackV1,
  PlayStateResponse,
  RealmRosterEntry,
} from '../../../../../../services/api'
import { computePlayerCombatStats } from '../utils/combatStats'
import CharacterCardModal from '../components/CharacterCardModal'
import CombatReplay from '../components/CombatReplay'
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
    let cancelled = false
    setFighting(true)
    pvpFight(fableId, realmId, character.id, pendingPvpFight.targetCharacterId)
      .then((combat) => {
        if (!cancelled) {
          const victory = combat.winnerId === character.id
          setCombatResult({ combat, victory, targetProfile: pendingPvpFight.targetProfile })
        }
      })
      .catch(() => { /* parent may show error */ })
      .finally(() => {
        if (!cancelled) {
          setFighting(false)
          onClearPendingPvpFight?.()
        }
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
  }

  const inCombat = !!combatResult

  const getClassName = (classId: string) => pack.classes.find((c) => c.id === classId)?.name ?? classId

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
      {inCombat && combatResult && targetStats ? (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 3, overflow: 'auto' }}>
          <CombatReplay
            combat={combatResult.combat}
            leftCharacterId={character.id}
            player={{
              name: character.name,
              level: character.level,
              maxHp: playerStats.maxHp,
              ap: playerStats.ap,
              arm: playerStats.arm,
              portraitUrl: character.portraitUrl,
              styleId: cls?.primaryAttack?.styleId,
              weaponUrl: weaponDef?.iconUrl,
            }}
            creature={{
              name: combatResult.targetProfile.character.name,
              level: combatResult.targetProfile.character.level,
              maxHp: targetStats.maxHp,
              ap: targetStats.ap,
              arm: targetStats.arm,
              portraitUrl: combatResult.targetProfile.character.portraitUrl,
              styleId: pack.classes.find((c) => c.id === combatResult.targetProfile.character.classId)?.primaryAttack?.styleId,
              weaponUrl: combatResult.targetProfile.character.equipment?.attack_source
                ? pack.items.find(
                    (i) => i.id === combatResult.targetProfile.character.equipment?.attack_source,
                  )?.iconUrl
                : undefined,
            }}
            victory={combatResult.victory}
            onFinish={handleCombatFinish}
          />
        </Box>
      ) : (
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
