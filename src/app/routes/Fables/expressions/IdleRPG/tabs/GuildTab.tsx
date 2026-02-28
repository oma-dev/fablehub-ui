import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import { getGroups, getGroup, createGroup, joinGroup, getPlayState } from '../../../../../../services/api'
import type { CharacterState, IdleRpgGroup, IdleRpgPackV1, PlayStateResponse } from '../../../../../../services/api'
import GuildChat from '../components/GuildChat'
import GuildRoster from '../components/GuildRoster'
import GuildManagement from '../components/GuildManagement'

const GUILD_LABEL = 'Guild'

interface Props {
  fableId: string
  realmId: string
  character: CharacterState
  pack: IdleRpgPackV1
  onCharacterUpdate: (c: CharacterState) => void
  onRequestPvpFight?: (targetCharacterId: string, targetProfile: PlayStateResponse) => void
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

  const inGuild = !!character.groupId

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

  if (inGuild) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto', p: 3, gap: 2 }}>
        {guildLoading ? (
          <Typography color="text.secondary">Loading guild...</Typography>
        ) : group ? (
          <>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 2, alignItems: 'start' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <GuildChat
                  fableId={fableId}
                  realmId={realmId}
                  groupId={group.id}
                  character={character}
                />
                <GuildRoster
                  fableId={fableId}
                  realmId={realmId}
                  group={group}
                  pack={pack}
                  viewerCharacter={character}
                  onRequestPvpFight={onRequestPvpFight}
                />
              </Box>
              <GuildManagement group={group} />
            </Box>
          </>
        ) : (
          <Typography color="text.secondary">Could not load guild data.</Typography>
        )}
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto', p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5" fontWeight={600}>
          Guilds
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateOpen}>
          Create guild
        </Button>
      </Box>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {loading ? (
        <Typography color="text.secondary">Loading guilds...</Typography>
      ) : groups.length === 0 ? (
        <Typography color="text.secondary">No guilds yet. Create one to get started.</Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {groups.map((g) => (
            <Box
              key={g.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 2,
                borderRadius: 2,
                bgcolor: 'action.hover',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Box>
                <Typography fontWeight={600}>
                  {g.name} {g.label}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {g.members?.length ?? 0} member{(g.members?.length ?? 0) === 1 ? '' : 's'}
                </Typography>
              </Box>
              <Button
                variant="outlined"
                size="small"
                onClick={() => handleJoin(g.id)}
                disabled={!!joiningId}
              >
                {joiningId === g.id ? 'Joining...' : 'Join'}
              </Button>
            </Box>
          ))}
        </Box>
      )}

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
          <Button onClick={() => setCreateOpen(false)} disabled={creating}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleCreateSubmit} disabled={creating || !createName.trim()}>
            {creating ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
