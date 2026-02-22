import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import LocalBarIcon from '@mui/icons-material/LocalBar'
import StorefrontIcon from '@mui/icons-material/Storefront'
import GroupsIcon from '@mui/icons-material/Groups'
import SportsKabaddiIcon from '@mui/icons-material/SportsKabaddi'
import {
  getIdleRpgRealms,
  getMyCharacters,
  createCharacter,
} from '../../../../../services/api'
import type {
  CharacterState,
  IdleRpgPackV1,
  IdleRpgRealm,
} from '../../../../../services/api'
import TavernTab from './tabs/TavernTab'
import ShopTab from './tabs/ShopTab'
import GuildTab from './tabs/GuildTab'
import PvPTab from './tabs/PvPTab'

type Tab = 'tavern' | 'shop' | 'guild' | 'pvp'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'tavern', label: 'Tavern', icon: <LocalBarIcon /> },
  { id: 'shop', label: 'Shop', icon: <StorefrontIcon /> },
  { id: 'guild', label: 'Guild', icon: <GroupsIcon /> },
  { id: 'pvp', label: 'PvP', icon: <SportsKabaddiIcon /> },
]

export default function FableIdleRPG() {
  const { fableId } = useParams<{ fableId: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [realm, setRealm] = useState<IdleRpgRealm | null>(null)
  const [character, setCharacter] = useState<CharacterState | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('tavern')

  // Character creation
  const [showCreateChar, setShowCreateChar] = useState(false)
  const [charName, setCharName] = useState('')
  const [charClassId, setCharClassId] = useState('')
  const [creating, setCreating] = useState(false)

  const pack: IdleRpgPackV1 | null = realm?.pack ?? null

  useEffect(() => {
    if (!fableId) return
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const realms = await getIdleRpgRealms(fableId)
        if (cancelled) return
        if (realms.length === 0) {
          setError('No realms found for this fable.')
          setLoading(false)
          return
        }
        const selectedRealm = realms[0]
        setRealm(selectedRealm)

        const chars = await getMyCharacters(fableId, selectedRealm.id)
        if (cancelled) return
        if (chars.length > 0) {
          setCharacter(chars[0])
        } else {
          setCharClassId(selectedRealm.pack.classes[0]?.id ?? '')
          setShowCreateChar(true)
        }
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load realm')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [fableId])

  const handleCreateCharacter = async () => {
    if (!fableId || !realm || !charName.trim() || !charClassId) return
    setCreating(true)
    setError(null)
    try {
      const c = await createCharacter(fableId, realm.id, { name: charName.trim(), classId: charClassId })
      setCharacter(c)
      setShowCreateChar(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create character')
    } finally {
      setCreating(false)
    }
  }

  const handleCharacterUpdate = (c: CharacterState) => setCharacter(c)

  if (!fableId) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', p: 4 }}>
        <Typography color="text.secondary">Missing fable.</Typography>
        <Button component={Link} to="/fables" variant="contained">Back to Fables</Button>
      </Box>
    )
  }

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error && !realm) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', p: 4 }}>
        <Typography color="error" gutterBottom>{error}</Typography>
        <Button component={Link} to={`/fables/${fableId}`} variant="contained">Back to Fable</Button>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Character creation dialog */}
      <Dialog open={showCreateChar} disableEscapeKeyDown>
        <DialogTitle>Create your character</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 360, pt: '16px !important' }}>
          <TextField
            label="Character name"
            size="small"
            fullWidth
            value={charName}
            onChange={(e) => setCharName(e.target.value)}
          />
          <FormControl size="small" fullWidth>
            <InputLabel>Class</InputLabel>
            <Select value={charClassId} label="Class" onChange={(e) => setCharClassId(e.target.value)}>
              {pack?.classes.map((cls) => (
                <MenuItem key={cls.id} value={cls.id}>{cls.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {pack?.classes.find((c) => c.id === charClassId)?.description && (
            <Typography variant="body2" color="text.secondary">
              {pack.classes.find((c) => c.id === charClassId)!.description}
            </Typography>
          )}
          {error && <Typography color="error">{error}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button component={Link} to={`/fables/${fableId}`} disabled={creating}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateCharacter} disabled={creating || !charName.trim() || !charClassId}>
            {creating ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Left sidebar */}
      <Paper
        elevation={2}
        sx={{
          width: 220, flexShrink: 0,
          display: 'flex', flexDirection: 'column',
          borderRadius: 0,
        }}
      >
        {/* Character info header */}
        {character && (
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle1" fontWeight={700} noWrap>{character.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {pack?.classes.find((c) => c.id === character.classId)?.name ?? character.classId}
              {' '} Lv {character.level}
            </Typography>
            <Typography variant="caption" display="block" color="text.secondary">
              HP {character.hp} | AP {character.ap} | ARM {character.arm}
            </Typography>
            <Typography variant="caption" display="block" color="warning.main">
              Gold: {character.balances.gold ?? 0}
            </Typography>
          </Box>
        )}

        <List sx={{ flex: 1, pt: 1 }}>
          {TABS.map((tab) => (
            <ListItemButton
              key={tab.id}
              selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>{tab.icon}</ListItemIcon>
              <ListItemText primary={tab.label} />
            </ListItemButton>
          ))}
        </List>

        <Box sx={{ p: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button component={Link} to={`/fables/${fableId}`} size="small" fullWidth>Back to Fable</Button>
        </Box>
      </Paper>

      {/* Right content */}
      <Box sx={{ flex: 1, p: 3, overflow: 'auto' }}>
        {character && realm && pack && (
          <>
            {activeTab === 'tavern' && (
              <TavernTab
                fableId={fableId}
                realmId={realm.id}
                character={character}
                pack={pack}
                onCharacterUpdate={handleCharacterUpdate}
              />
            )}
            {activeTab === 'shop' && (
              <ShopTab
                fableId={fableId}
                realmId={realm.id}
                character={character}
                pack={pack}
                onCharacterUpdate={handleCharacterUpdate}
              />
            )}
            {activeTab === 'guild' && <GuildTab />}
            {activeTab === 'pvp' && <PvPTab />}
          </>
        )}
      </Box>
    </Box>
  )
}
