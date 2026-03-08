import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import GroupsIcon from '@mui/icons-material/Groups'
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech'
import { getGroups, getGroup, getGuildChampion, createGroup, joinGroup, getPlayState, getGuildMemberPlayState } from '@features/idle-rpg/api'
import type { CharacterProfileResponse, CharacterState, GuildChampion, IdleRpgGroup, IdleRpgPackV1 } from '@features/idle-rpg/api'
import GuildChat from '../components/GuildChat'
import GuildRoster from '../components/GuildRoster'
import GuildManagement from '../components/GuildManagement'
import GuildRaids from '../components/GuildRaids'
import CharacterCardModal from '../components/CharacterCardModal'

const GUILD_LABEL = 'Guild'

function formatCooldownRemaining(durationMs: number): string {
  const remainingSeconds = Math.max(1, Math.ceil(durationMs / 1000))
  const hours = Math.floor(remainingSeconds / 3600)
  const minutes = Math.floor((remainingSeconds % 3600) / 60)
  const seconds = remainingSeconds % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

interface Props {
  fableId: string
  realmId: string
  character: CharacterState
  pack: IdleRpgPackV1
  onCharacterUpdate: (c: CharacterState) => void
  onRequestPvpFight?: (targetCharacterId: string, targetProfile: CharacterProfileResponse) => void
}

export default function GuildTab({ fableId, realmId, character, pack, onCharacterUpdate, onRequestPvpFight }: Props) {
  const [groups, setGroups] = useState<IdleRpgGroup[]>([])
  const [group, setGroup] = useState<IdleRpgGroup | null>(null)
  const [loading, setLoading] = useState(true)
  const [guildLoading, setGuildLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [joiningId, setJoiningId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [champion, setChampion] = useState<GuildChampion | null>(null)
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [selectedMemberProfile, setSelectedMemberProfile] = useState<CharacterProfileResponse | null>(null)
  const [selectedMemberLoading, setSelectedMemberLoading] = useState(false)
  const [selectedMemberError, setSelectedMemberError] = useState<string | null>(null)
  const [cooldownNowMs, setCooldownNowMs] = useState(() => Date.now())

  const inGuild = !!character.groupId
  const pvpCooldownUntil = Number(character.progression?.pvpAttackCooldownUntil ?? 0)
  const pvpCooldownRemainingMs = Math.max(0, pvpCooldownUntil - cooldownNowMs)
  const isPvpCooldownActive = pvpCooldownRemainingMs > 0
  const fightButtonLabel = isPvpCooldownActive
    ? `Cooldown: ${formatCooldownRemaining(pvpCooldownRemainingMs)}`
    : 'Fight'

  useEffect(() => {
    if (inGuild && character.groupId) {
      setGuildLoading(true)
      getGroup(fableId, realmId, character.groupId)
        .then(setGroup)
        .catch(() => setGroup(null))
        .finally(() => setGuildLoading(false))
      return
    }
    setGroup(null)
  }, [fableId, realmId, character.groupId, inGuild])

  useEffect(() => {
    if (!group?.id) {
      setChampion(null)
      return
    }
    let cancelled = false
    getGuildChampion(fableId, realmId, group.id)
      .then((c) => {
        if (!cancelled) setChampion(c ?? null)
      })
      .catch(() => {
        if (!cancelled) setChampion(null)
      })
    return () => {
      cancelled = true
    }
  }, [fableId, realmId, group?.id])

  useEffect(() => {
    if (!selectedMemberId && !isPvpCooldownActive) return
    setCooldownNowMs(Date.now())
    const intervalId = window.setInterval(() => setCooldownNowMs(Date.now()), 1000)
    return () => window.clearInterval(intervalId)
  }, [selectedMemberId, isPvpCooldownActive])

  useEffect(() => {
    if (!inGuild || !selectedMemberId) {
      setSelectedMemberProfile(null)
      setSelectedMemberError(null)
      setSelectedMemberLoading(false)
      return
    }
    let cancelled = false
    setSelectedMemberLoading(true)
    setSelectedMemberError(null)
    getGuildMemberPlayState(fableId, realmId, character.id, selectedMemberId)
      .then((data) => {
        if (!cancelled) setSelectedMemberProfile(data)
      })
      .catch((err: unknown) => {
        if (!cancelled) setSelectedMemberError(err instanceof Error ? err.message : 'Failed to load profile')
      })
      .finally(() => {
        if (!cancelled) setSelectedMemberLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [character.id, fableId, inGuild, realmId, selectedMemberId])

  useEffect(() => {
    setSelectedMemberId(null)
    setSelectedMemberProfile(null)
    setSelectedMemberError(null)
    setSelectedMemberLoading(false)
  }, [character.id, character.groupId])

  useEffect(() => {
    if (inGuild) {
      setLoading(false)
      return
    }
    let cancelled = false
    getGroups(fableId, realmId)
      .then((list: IdleRpgGroup[]) => {
        if (!cancelled) setGroups(list)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load guilds')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [fableId, realmId, inGuild])

  const handleJoin = async (groupId: string) => {
    setError(null)
    setJoiningId(groupId)
    try {
      await joinGroup(fableId, realmId, groupId, character.id)
      const playState = await getPlayState(fableId, realmId, character.id)
      onCharacterUpdate(playState.character)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to join guild')
    } finally {
      setJoiningId(null)
    }
  }

  const handleCreateOpen = () => {
    setCreateName('')
    setCreateError(null)
    setCreateOpen(true)
  }

  const handleCreateSubmit = async () => {
    const name = createName.trim()
    if (!name) return
    setCreateError(null)
    setCreating(true)
    try {
      await createGroup(fableId, realmId, {
        label: GUILD_LABEL,
        name,
        creatorCharacterId: character.id,
      })
      const playState = await getPlayState(fableId, realmId, character.id)
      onCharacterUpdate(playState.character)
      setCreateOpen(false)
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create guild')
    } finally {
      setCreating(false)
    }
  }

  const handleCloseSelectedMember = () => {
    setSelectedMemberId(null)
  }

  const handleFightSelectedMember = () => {
    if (!selectedMemberId || !selectedMemberProfile) return
    onRequestPvpFight?.(selectedMemberId, selectedMemberProfile)
    setSelectedMemberId(null)
  }

  const canFightSelectedMember = !!selectedMemberId
    && selectedMemberId !== character.id
    && !!selectedMemberProfile
    && !!onRequestPvpFight

  const panelSx = {
    bgcolor: 'rgba(18,16,30,0.9)',
    border: '1px solid rgba(168,85,247,0.2)',
    borderRadius: 2,
    boxShadow: 'inset 0 0 34px rgba(124,58,237,0.08), 0 12px 24px rgba(0,0,0,0.28)',
  } as const

  if (inGuild) {
    return (
      <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden', p: { xs: 1, sm: 1.5 }, gap: 1.5 }}>
        {guildLoading ? (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress size={28} />
          </Box>
        ) : group ? (
          <>
            <Paper variant="outlined" sx={{ ...panelSx, p: 1.25 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <GroupsIcon sx={{ color: '#c084fc' }} />
                  <Typography variant="h6" fontWeight={800}>{group.name} {group.label}</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
                  <Chip
                    label={`${group.members?.length ?? 0} Members`}
                    size="small"
                    sx={{ bgcolor: 'rgba(168,85,247,0.2)', color: '#e9d5ff', fontWeight: 700 }}
                  />
                  <Chip
                    icon={<MilitaryTechIcon sx={{ color: '#fbbf24 !important' }} />}
                    label={champion?.name ?? 'No Champion'}
                    size="small"
                    sx={{ bgcolor: 'rgba(245,158,11,0.18)', color: '#fbbf24', fontWeight: 700 }}
                  />
                </Box>
              </Box>
            </Paper>

            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                display: 'grid',
                gap: 1.5,
                gridTemplateColumns: { xs: '1fr', xl: 'minmax(520px, 1.25fr) minmax(340px, 0.9fr)' },
              }}
            >
              <Box sx={{ minHeight: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Paper variant="outlined" sx={{ ...panelSx, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <Box sx={{ px: 1.5, py: 1.1 }}>
                    <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#e8e4f0' }}>Guild Chat</Typography>
                  </Box>
                  <Divider />
                  <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                    <GuildChat fableId={fableId} realmId={realmId} groupId={group.id} character={character} />
                  </Box>
                </Paper>

                <Paper variant="outlined" sx={{ ...panelSx, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <Box sx={{ px: 1.5, py: 1.1 }}>
                    <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#e8e4f0' }}>Roster</Typography>
                  </Box>
                  <Divider />
                  <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                    <GuildRoster
                      group={group}
                      pack={pack}
                      selectedMemberId={selectedMemberId}
                      onSelectMember={setSelectedMemberId}
                    />
                  </Box>
                </Paper>
              </Box>

              <Box sx={{ minHeight: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Paper variant="outlined" sx={{ ...panelSx, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <Box sx={{ px: 1.5, py: 1.1 }}>
                    <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#e8e4f0' }}>Guild Management</Typography>
                  </Box>
                  <Divider />
                  <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                    <GuildManagement
                      group={group}
                      champion={champion}
                      character={character}
                      pack={pack}
                      fableId={fableId}
                      realmId={realmId}
                      onDonateSuccess={() => {
                        getGroup(fableId, realmId, group.id).then(setGroup)
                        getPlayState(fableId, realmId, character.id).then((ps) => onCharacterUpdate(ps.character))
                      }}
                    />
                  </Box>
                </Paper>

                <Paper variant="outlined" sx={{ ...panelSx, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <Box sx={{ px: 1.5, py: 1.1 }}>
                    <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#e8e4f0' }}>Raids</Typography>
                  </Box>
                  <Divider />
                  <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                    <GuildRaids
                      fableId={fableId}
                      realmId={realmId}
                      groupId={group.id}
                      group={group}
                      character={character}
                      pack={pack}
                      onUpdate={() => getGroup(fableId, realmId, group.id).then(setGroup)}
                    />
                  </Box>
                </Paper>
              </Box>
            </Box>
            <CharacterCardModal
              open={!!selectedMemberId}
              onClose={handleCloseSelectedMember}
              profile={selectedMemberProfile}
              pack={pack}
              loading={selectedMemberLoading}
              error={selectedMemberError}
              fableId={fableId}
              realmId={realmId}
              showFightButton={canFightSelectedMember}
              onFight={handleFightSelectedMember}
              fightButtonLabel={fightButtonLabel}
              fightButtonDisabled={isPvpCooldownActive}
            />
          </>
        ) : (
          <Paper variant="outlined" sx={{ ...panelSx, p: 2 }}>
            <Typography color="text.secondary">Could not load guild data.</Typography>
          </Paper>
        )}
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden', p: { xs: 1, sm: 1.5 }, gap: 1.5 }}>
      <Paper variant="outlined" sx={{ ...panelSx, p: 1.25 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GroupsIcon sx={{ color: '#c084fc' }} />
            <Typography variant="h6" fontWeight={800}>Guild Hall</Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateOpen} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Create Guild
          </Button>
        </Box>
      </Paper>

      {error && (
        <Typography color="error" sx={{ px: 0.5 }}>
          {error}
        </Typography>
      )}

      <Paper variant="outlined" sx={{ ...panelSx, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box sx={{ px: 1.5, py: 1.2 }}>
          <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#e8e4f0' }}>Available Guilds</Typography>
        </Box>
        <Divider />

        <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', p: 1.5 }}>
          {loading ? (
            <Box sx={{ minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress size={28} />
            </Box>
          ) : groups.length === 0 ? (
            <Typography color="text.secondary">No guilds yet. Create one to get started.</Typography>
          ) : (
            <Box sx={{ display: 'grid', gap: 1.1, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0,1fr))' } }}>
              {groups.map((g) => (
                <Paper
                  key={g.id}
                  variant="outlined"
                  sx={{
                    p: 1.1,
                    borderColor: 'rgba(168,85,247,0.3)',
                    bgcolor: 'rgba(24,21,36,0.88)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.85,
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                    <Typography fontWeight={800} sx={{ color: '#f3f4f6' }}>
                      {g.name} {g.label}
                    </Typography>
                    <Chip
                      size="small"
                      label={`${g.members?.length ?? 0} Members`}
                      sx={{ fontWeight: 700, bgcolor: 'rgba(168,85,247,0.18)', color: '#e9d5ff' }}
                    />
                  </Box>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => handleJoin(g.id)}
                    disabled={!!joiningId}
                    sx={{ textTransform: 'none', fontWeight: 700 }}
                  >
                    {joiningId === g.id ? 'Joining...' : 'Join Guild'}
                  </Button>
                </Paper>
              ))}
            </Box>
          )}
        </Box>
      </Paper>

      <Dialog open={createOpen} onClose={() => !creating && setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create guild</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            label="Guild name"
            placeholder="e.g. Jazzmasters"
            size="small"
            fullWidth
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            helperText={`Will be displayed as "${createName.trim() || 'Name'} ${GUILD_LABEL}"`}
            sx={{ mt: 1 }}
          />
          {createError && (
            <Typography color="error" sx={{ mt: 2 }}>
              {createError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateSubmit} disabled={creating || !createName.trim()}>
            {creating ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
