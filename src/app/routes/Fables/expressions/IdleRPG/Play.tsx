import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import LinearProgress from '@mui/material/LinearProgress'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import LocalBarIcon from '@mui/icons-material/LocalBar'
import StorefrontIcon from '@mui/icons-material/Storefront'
import GroupsIcon from '@mui/icons-material/Groups'
import SportsKabaddiIcon from '@mui/icons-material/SportsKabaddi'
import PersonIcon from '@mui/icons-material/Person'
import FavoriteIcon from '@mui/icons-material/Favorite'
import BoltIcon from '@mui/icons-material/Bolt'
import ShieldIcon from '@mui/icons-material/Shield'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import IconButton from '@mui/material/IconButton'
import {
  getIdleRpgRealms,
  getMyCharacters,
  getPlayState,
  createCharacter,
} from '../../../../../services/api'
import type {
  CharacterState,
  IdleRpgPackV1,
  IdleRpgRealm,
} from '../../../../../services/api'
import { RARITY_COLORS as RARITY_COLORS_MAP, RARITY_NAMES } from '../../../../../services/api'
import TavernTab from './tabs/TavernTab'
import ShopTab from './tabs/ShopTab'
import GuildTab from './tabs/GuildTab'
import PvPTab from './tabs/PvPTab'

/* ------------------------------------------------------------------ */
/*  Sidebar Character Card                                            */
/* ------------------------------------------------------------------ */

function SidebarCharacterCard({ character, pack }: { character: CharacterState; pack: IdleRpgPackV1 }) {
  const cls = pack.classes.find((c) => c.id === character.classId)
  const mainStat = cls?.scaling?.damageMainStat ?? 'STR'

  const totalStats = useMemo(() => {
    const base: Record<string, number> = {}
    if (cls?.starting?.stats) {
      for (const [k, v] of Object.entries(cls.starting.stats)) base[k] = (base[k] ?? 0) + (v ?? 0)
    }
    const itemMap = new Map(pack.items.map((it) => [it.id, it]))
    for (const itemId of Object.values(character.equipment)) {
      if (!itemId) continue
      const item = itemMap.get(itemId)
      if (!item?.stats) continue
      for (const [k, v] of Object.entries(item.stats)) base[k] = (base[k] ?? 0) + (v ?? 0)
    }
    for (const [k, v] of Object.entries(character.allocatedStats ?? {})) {
      base[k] = (base[k] ?? 0) + (v ?? 0)
    }
    return base
  }, [character, pack, cls])

  const baseHp = 50 + character.level * 10 + (totalStats.HP ?? 0)
  const baseAp = Math.max(1, character.level * 2 + (totalStats[mainStat] ?? 0))
  const baseArm = Math.max(0, totalStats.ARM ?? 0)

  const xpTable = pack.rules.xpTable ?? {}
  const maxLevel = pack.rules.maxLevel ?? 10
  const nextXp = xpTable[String(character.level + 1)] ?? null
  const prevXp = xpTable[String(character.level)] ?? 0
  const xpProgress =
    character.level >= maxLevel || nextXp === null
      ? 100
      : Math.min(100, ((character.xp - prevXp) / (nextXp - prevXp)) * 100)
  const atMaxLevel = character.level >= maxLevel || nextXp === null

  const itemMap = new Map(pack.items.map((it) => [it.id, it]))
  const weapon = character.equipment.attack_source ? itemMap.get(character.equipment.attack_source) : undefined
  const armor = character.equipment.defense_layer ? itemMap.get(character.equipment.defense_layer) : undefined

  const inventoryCount = character.inventory.reduce((sum, i) => sum + i.qty, 0)

  return (
    <Box
      sx={{
        p: 3,
        borderBottom: '1px solid rgba(168,85,247,0.15)',
        background: 'linear-gradient(180deg, rgba(168,85,247,0.08) 0%, rgba(0,0,0,0.2) 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
      }}
    >
      {/* Portrait with decorative ring */}
      <Box sx={{ position: 'relative' }}>
        <Box
          sx={{
            width: 130,
            height: 130,
            borderRadius: '50%',
            overflow: 'hidden',
            border: '3px solid transparent',
            background: 'linear-gradient(135deg, #a855f7, #6366f1, #a855f7) border-box',
            boxShadow: '0 0 28px 6px rgba(168,85,247,0.3), inset 0 0 20px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#0c0a14',
            flexShrink: 0,
          }}
        >
          {character.portraitUrl ? (
            <Box
              component="img"
              src={character.portraitUrl}
              alt={character.name}
              sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <PersonIcon sx={{ fontSize: 72, color: 'rgba(168,85,247,0.35)' }} />
          )}
        </Box>
        {/* Level badge overlapping the portrait */}
        <Chip
          label={`Lv ${character.level}`}
          size="small"
          sx={{
            position: 'absolute',
            bottom: -6,
            left: '50%',
            transform: 'translateX(-50%)',
            fontWeight: 800,
            fontSize: 12,
            height: 26,
            background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
            color: '#fff',
            boxShadow: '0 0 12px rgba(168,85,247,0.5)',
            zIndex: 1,
          }}
        />
      </Box>

      {/* Name & Class */}
      <Box sx={{ textAlign: 'center', mt: 0.5 }}>
        <Typography
          variant="h5"
          fontWeight={800}
          lineHeight={1.2}
          noWrap
          sx={{
            letterSpacing: 0.5,
            background: 'linear-gradient(90deg, #e8e4f0, #c084fc)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {character.name}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5, fontWeight: 500 }}>
          Class: {cls?.name ?? character.classId}
        </Typography>
        {cls?.description && (
          <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic', display: 'block', mt: 0.5, lineHeight: 1.3, maxWidth: 280 }}>
            {cls.description}
          </Typography>
        )}
      </Box>

      {/* XP Bar */}
      <Box sx={{ width: '100%', maxWidth: 320 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={700}>
            XP
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {atMaxLevel ? 'MAX' : `${character.xp} / ${nextXp}`}
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={xpProgress}
          sx={{
            height: 10,
            borderRadius: 5,
            bgcolor: 'rgba(168,85,247,0.1)',
            border: '1px solid rgba(168,85,247,0.15)',
            '& .MuiLinearProgress-bar': {
              borderRadius: 5,
              background: atMaxLevel
                ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
                : 'linear-gradient(90deg, #c084fc, #a855f7)',
              boxShadow: atMaxLevel
                ? '0 0 10px rgba(251,191,36,0.4)'
                : '0 0 10px rgba(168,85,247,0.4)',
            },
          }}
        />
      </Box>

      {/* Stat points banner */}
      {(character.statPoints ?? 0) > 0 && (
        <Chip
          label={`${character.statPoints} unspent stat point${character.statPoints !== 1 ? 's' : ''}!`}
          size="small"
          sx={{
            fontWeight: 700,
            fontSize: 13,
            height: 28,
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            color: '#000',
            boxShadow: '0 0 14px rgba(245,158,11,0.4)',
            animation: 'glow-pulse 2s infinite',
            '@keyframes glow-pulse': {
              '0%,100%': { boxShadow: '0 0 14px rgba(245,158,11,0.4)' },
              '50%': { boxShadow: '0 0 22px rgba(245,158,11,0.7)' },
            },
          }}
        />
      )}

      {/* Combat stats row */}
      <Box sx={{ display: 'flex', gap: 1.5, width: '100%', maxWidth: 340, justifyContent: 'center' }}>
        <StatBadge icon={<FavoriteIcon sx={{ fontSize: 16 }} />} label="HP" value={baseHp} color="#ef4444" tooltip="Hit Points" />
        <StatBadge icon={<BoltIcon sx={{ fontSize: 16 }} />} label="AP" value={baseAp} color="#f59e0b" tooltip="Attack Power" />
        <StatBadge icon={<ShieldIcon sx={{ fontSize: 16 }} />} label="ARM" value={baseArm} color="#6366f1" tooltip="Armor" />
      </Box>

      {/* Primary stat indicator */}
      <Typography variant="caption" color="text.disabled" sx={{ fontSize: 11 }}>
        Main stat: <Box component="span" sx={{ color: '#fbbf24', fontWeight: 700 }}>{mainStat}</Box>
        {' · '}
        {(['STR', 'DEX', 'INT', 'LCK'] as const)
          .filter((s) => (totalStats[s] ?? 0) > 0)
          .map((s) => `${s} ${totalStats[s]}`)
          .join(' · ')}
      </Typography>

      {/* Equipment summary */}
      <Box sx={{ width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        <EquipRow label="Weapon" item={weapon} emptyText="bare-handed" />
        <EquipRow label="Armor" item={armor} emptyText="unarmored" />
      </Box>

      {/* Currency & Inventory */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
        {Object.entries(character.balances).map(([currency, amount]) => (
          <Chip
            key={currency}
            label={`${amount} ${currency}`}
            size="small"
            variant="outlined"
            sx={{
              fontWeight: 700,
              fontSize: 13,
              height: 28,
              borderColor: currency === 'gold' ? 'rgba(251,191,36,0.5)' : 'rgba(168,85,247,0.2)',
              color: currency === 'gold' ? '#fbbf24' : 'text.secondary',
              ...(currency === 'gold' && { boxShadow: '0 0 8px rgba(251,191,36,0.15)' }),
            }}
          />
        ))}
        {inventoryCount > 0 && (
          <Chip
            label={`${inventoryCount} item${inventoryCount !== 1 ? 's' : ''}`}
            size="small"
            variant="outlined"
            sx={{ fontWeight: 600, fontSize: 12, height: 28, borderColor: 'rgba(168,85,247,0.2)', color: 'text.secondary' }}
          />
        )}
      </Box>
    </Box>
  )
}

function StatBadge({ icon, label, value, color, tooltip }: { icon: React.ReactNode; label: string; value: number; color: string; tooltip: string }) {
  return (
    <Tooltip title={tooltip} arrow>
      <Paper
        variant="outlined"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          py: 1,
          borderColor: `${color}40`,
          borderRadius: 2.5,
          bgcolor: `${color}0D`,
          boxShadow: `0 0 12px ${color}15`,
          transition: 'box-shadow 0.2s',
          '&:hover': { boxShadow: `0 0 18px ${color}30` },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color }}>
          {icon}
          <Typography variant="caption" fontWeight={700} sx={{ color, fontSize: 12 }}>
            {label}
          </Typography>
        </Box>
        <Typography variant="h6" fontWeight={800} sx={{ color, lineHeight: 1.2 }}>
          {value}
        </Typography>
      </Paper>
    </Tooltip>
  )
}

function EquipRow({ label, item, emptyText }: { label: string; item?: { name: string; rarity: number } | undefined; emptyText: string }) {
  const rarityNum = item?.rarity ?? 1
  const color = item ? (RARITY_COLORS_MAP[rarityNum] ?? '#9e9bab') : undefined
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1.5,
        py: 0.5,
        borderRadius: 1.5,
        bgcolor: item ? 'rgba(168,85,247,0.06)' : 'transparent',
      }}
    >
      <Typography variant="caption" color="text.disabled" sx={{ width: 60, flexShrink: 0, textAlign: 'right', fontSize: 11, fontWeight: 600 }}>
        {label}
      </Typography>
      {item ? (
        <Typography variant="body2" fontWeight={600} sx={{ color, fontSize: 13 }} noWrap>
          {item.name}
          <Box component="span" sx={{ ml: 0.5, fontSize: 10, opacity: 0.6 }}>({RARITY_NAMES[rarityNum] ?? 'common'})</Box>
        </Typography>
      ) : (
        <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic', fontSize: 12 }}>
          {emptyText}
        </Typography>
      )}
    </Box>
  )
}

/* ------------------------------------------------------------------ */

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
  const [playState, setPlayState] = useState<{ character: CharacterState; pack: IdleRpgPackV1 } | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('tavern')

  // Character creation
  const [showCreateChar, setShowCreateChar] = useState(false)
  const [charName, setCharName] = useState('')
  const [charClassIndex, setCharClassIndex] = useState(0)
  const [creating, setCreating] = useState(false)

  const pack: IdleRpgPackV1 | null = playState?.pack ?? realm?.pack ?? null
  const displayCharacter = playState?.character ?? character

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
          setCharClassIndex(0)
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

  // Fetch play state (character + pack with fresh merchant) when we have a character
  useEffect(() => {
    if (!fableId || !realm || !character?.id) return
    let cancelled = false
    getPlayState(fableId, realm.id, character.id)
      .then((res) => {
        if (!cancelled) setPlayState({ character: res.character, pack: res.pack })
      })
      .catch(() => { /* keep existing character/pack */ })
    return () => { cancelled = true }
  }, [fableId, realm?.id, character?.id])

  const createPack = realm?.pack ?? pack
  const classes = createPack?.classes ?? []
  const selectedClass = classes[charClassIndex]
  const selectedClassId = selectedClass?.id ?? ''
  const handleCreateCharacter = async () => {
    if (!fableId || !realm || !charName.trim() || !selectedClassId) return
    setCreating(true)
    setError(null)
    try {
      const c = await createCharacter(fableId, realm.id, { name: charName.trim(), classId: selectedClassId })
      setCharacter(c)
      setShowCreateChar(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create character')
    } finally {
      setCreating(false)
    }
  }

  const handleCharacterUpdate = (c: CharacterState) => {
    setCharacter(c)
    setPlayState((prev) => (prev ? { ...prev, character: c } : null))
  }

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
    <Box sx={{ display: 'flex', height: '100vh', minHeight: 0, margin: '0 auto', bgcolor: 'background.default' }}>
      {/* Character creation dialog */}
      <Dialog open={!showCreateChar} disableEscapeKeyDown maxWidth="sm" fullWidth PaperProps={{ sx: { minHeight: 420 } }}>
        <DialogTitle sx={{ textAlign: 'center' }}>Create your character</DialogTitle>
        <DialogContent sx={{ pt: 1, pb: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 400 }}>
          <Box sx={{ width: '100%', maxWidth: 360 }}>
            <TextField
              label="Character name"
              size="small"
              fullWidth
              value={charName}
              onChange={(e) => setCharName(e.target.value)}
            />
          </Box>
          <Typography variant="subtitle2" color="text.secondary" sx={{ textAlign: 'center' }}>Choose a class</Typography>
          <Box sx={{ display: 'flex', alignItems: 'stretch', gap: 1, minHeight: 240 }}>
            <IconButton
              onClick={() => setCharClassIndex((i) => (i - 1 + classes.length) % Math.max(1, classes.length))}
              disabled={classes.length <= 1}
              sx={{ alignSelf: 'center' }}
              size="large"
            >
              <ChevronLeftIcon />
            </IconButton>
            <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', minWidth: 0 }}>
              <Box sx={{ width: 360, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', px: 2 }}>
                {selectedClass && (
                  <>
                    <Box
                      sx={{
                        width: 300,
                        height: 300,
                        flexShrink: 0,
                        borderRadius: 2,
                        overflow: 'hidden',
                        bgcolor: '#14121f',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '3px solid rgba(168,85,247,0.35)',
                        boxShadow: '0 0 36px rgba(168,85,247,0.2), inset 0 0 24px rgba(0,0,0,0.3)',
                      }}
                    >
                      {selectedClass.iconUrl ? (
                        <Box
                          component="img"
                          src={selectedClass.iconUrl}
                          alt={selectedClass.name}
                          sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <PersonIcon sx={{ fontSize: 64, color: 'rgba(168,85,247,0.25)' }} />
                      )}
                    </Box>
                    <Typography variant="h6" sx={{ mt: 1.5 }}>{selectedClass.name}</Typography>
                    {selectedClass.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 360 }}>
                        {selectedClass.description}
                      </Typography>
                    )}
                  </>
                )}
              </Box>
            </Box>
            <IconButton
              onClick={() => setCharClassIndex((i) => (i + 1) % Math.max(1, classes.length))}
              disabled={classes.length <= 1}
              sx={{ alignSelf: 'center' }}
              size="large"
            >
              <ChevronRightIcon />
            </IconButton>
          </Box>
          {error && <Typography color="error">{error}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button component={Link} to={`/fables/${fableId}`} disabled={creating}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateCharacter} disabled={creating || !charName.trim() || !selectedClassId}>
            {creating ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Left sidebar */}
      <Box
        sx={{
          width: 360, flexShrink: 0,
          display: 'flex', flexDirection: 'column',
          borderRight: '1px solid rgba(168,85,247,0.12)',
          background: 'linear-gradient(180deg, #14121f 0%, #0c0a14 100%)',
          overflow: 'auto',
        }}
      >
        {/* Character card */}
        {displayCharacter && pack && <SidebarCharacterCard character={displayCharacter} pack={pack} />}

        <List sx={{ flex: 1, pt: 2, px: 1 }}>
          {TABS.map((tab) => (
            <ListItemButton
              key={tab.id}
              selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              sx={{ mb: 0.5, py: 1.5 }}
            >
              <ListItemIcon sx={{ minWidth: 42, color: activeTab === tab.id ? 'primary.main' : 'text.secondary' }}>
                {tab.icon}
              </ListItemIcon>
              <ListItemText
                primary={tab.label}
                primaryTypographyProps={{ fontWeight: activeTab === tab.id ? 700 : 500, fontSize: '1rem' }}
              />
            </ListItemButton>
          ))}
        </List>

        <Box sx={{ p: 1.5, borderTop: '1px solid rgba(168,85,247,0.1)' }}>
          <Button component={Link} to={`/fables/${fableId}`} size="small" fullWidth variant="outlined" color="primary">
            Back to Fable
          </Button>
        </Box>
      </Box>

      {/* Right content */}
      <Box sx={{ flex: 1, minHeight: 0, p: 3, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {displayCharacter && realm && pack && (
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {activeTab === 'tavern' && (
              <TavernTab
                fableId={fableId}
                realmId={realm.id}
                character={displayCharacter}
                pack={pack}
                onCharacterUpdate={handleCharacterUpdate}
              />
            )}
            {activeTab === 'shop' && (
              <ShopTab
                fableId={fableId}
                realmId={realm.id}
                character={displayCharacter}
                pack={pack}
                onCharacterUpdate={handleCharacterUpdate}
              />
            )}
            {activeTab === 'guild' && <GuildTab />}
            {activeTab === 'pvp' && <PvPTab />}
          </Box>
        )}
      </Box>
    </Box>
  )
}
