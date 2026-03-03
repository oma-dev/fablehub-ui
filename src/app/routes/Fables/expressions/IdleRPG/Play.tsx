import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Badge from '@mui/material/Badge'
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
import CastleIcon from '@mui/icons-material/Castle'
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech'
import PersonIcon from '@mui/icons-material/Person'
import FavoriteIcon from '@mui/icons-material/Favorite'
import ShieldIcon from '@mui/icons-material/Shield'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import LockIcon from '@mui/icons-material/Lock'
import MailOutlineIcon from '@mui/icons-material/MailOutline'
import StarIcon from '@mui/icons-material/Star'
import IconButton from '@mui/material/IconButton'
import {
  getIdleRpgRealms,
  getMailbox,
  markMailboxMailRead,
  getMyCharacters,
  getPlayState,
  createCharacter,
  getRealmRoster,
} from '@features/idle-rpg/api'
import type {
  CharacterState,
  IdleRpgPackV1,
  MailboxMail,
  IdleRpgRealm,
  PlayStateResponse,
} from '@features/idle-rpg/api'
import { RARITY_COLORS as RARITY_COLORS_MAP, RARITY_NAMES } from '@features/idle-rpg/api'
import TavernTab from './tabs/TavernTab'
import ShopTab from './tabs/ShopTab'
import GuildTab from './tabs/GuildTab'
import PvPTab from './tabs/PvPTab'
import DungeonsTab from './tabs/DungeonsTab'
import RaidsTab from './tabs/RaidsTab'
import AbilitiesTab from './tabs/AbilitiesTab'
import MailboxTab from './tabs/MailboxTab'
import { computePlayerCombatStats } from './utils/combatStats'
import charBackground from '../../../../../assets/backgrounds/charBackground.png'

/* ------------------------------------------------------------------ */
/*  Sidebar Character Card                                            */
/* ------------------------------------------------------------------ */

function SidebarCharacterCard({ character, pack }: { character: CharacterState; pack: IdleRpgPackV1 }) {
  const cls = pack.classes.find((c) => c.id === character.classId)
  const combatStats = useMemo(() => computePlayerCombatStats(character, pack), [character, pack])
  const baseHp = combatStats.maxHp
  const baseArm = combatStats.arm

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
            border: '3px solid rgba(168,85,247,0.45)',
            boxShadow: '0 0 28px 6px rgba(168,85,247,0.3), inset 0 0 20px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundImage: `url(${charBackground})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            flexShrink: 0,
          }}
        >
          {(character.portraitUrl ?? cls?.iconUrl) ? (
            <Box
              component="img"
              src={character.portraitUrl ?? cls?.iconUrl}
              alt={character.name}
              sx={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'drop-shadow(0 0 6px rgba(168,85,247,0.6)) drop-shadow(0 0 14px rgba(168,85,247,0.3))' }}
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
        <StatBadge icon={<ShieldIcon sx={{ fontSize: 16 }} />} label="ARM" value={baseArm} color="#6366f1" tooltip="Armor" />
      </Box>

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

type Tab = 'tavern' | 'shop' | 'abilities' | 'guild' | 'dungeons' | 'raids' | 'mailbox' | 'pvp'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'tavern', label: 'Tavern', icon: <LocalBarIcon /> },
  { id: 'shop', label: 'Shop', icon: <StorefrontIcon /> },
  { id: 'abilities', label: 'Abilities', icon: <AutoFixHighIcon /> },
  { id: 'guild', label: 'Guild', icon: <GroupsIcon /> },
  { id: 'dungeons', label: 'Dungeons', icon: <CastleIcon /> },
  { id: 'raids', label: 'Raids', icon: <MilitaryTechIcon /> },
  { id: 'mailbox', label: 'Mailbox', icon: <MailOutlineIcon /> },
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
  const [pendingPvpFight, setPendingPvpFight] = useState<{
    targetCharacterId: string
    targetProfile: PlayStateResponse
  } | null>(null)
  const [mailboxUnreadCount, setMailboxUnreadCount] = useState(0)
  const [mailAlertQueue, setMailAlertQueue] = useState<MailboxMail[]>([])
  const [activeMailAlert, setActiveMailAlert] = useState<MailboxMail | null>(null)
  const [mailAlertActionLoading, setMailAlertActionLoading] = useState(false)
  const [mailboxAutoOpenMailId, setMailboxAutoOpenMailId] = useState<string | null>(null)
  const surfacedMailAlertIdsRef = useRef<Set<string>>(new Set())

  // Character creation
  const [showCreateChar, setShowCreateChar] = useState(false)
  const [charName, setCharName] = useState('')
  const [charClassIndex, setCharClassIndex] = useState(0)
  const [creating, setCreating] = useState(false)
  const [takenHeroClassIds, setTakenHeroClassIds] = useState<Set<string>>(new Set())

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
          const heroClassIds = new Set(
            (selectedRealm.pack?.classes ?? []).filter(c => c.isHeroClass).map(c => c.id),
          )
          if (heroClassIds.size > 0) {
            try {
              const roster = await getRealmRoster(fableId, selectedRealm.id)
              if (!cancelled) {
                const taken = new Set(roster.filter(r => heroClassIds.has(r.classId)).map(r => r.classId))
                setTakenHeroClassIds(taken)
              }
            } catch { /* roster fetch optional */ }
          }
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

  const handleRequestPvpFight = (targetCharacterId: string, targetProfile: PlayStateResponse) => {
    setPendingPvpFight({ targetCharacterId, targetProfile })
    setActiveTab('pvp')
  }

  const handleClearPendingPvpFight = () => setPendingPvpFight(null)

  const pollMailbox = useCallback(async () => {
    if (!fableId || !realm?.id || !displayCharacter?.id) return
    try {
      const response = await getMailbox(fableId, realm.id, displayCharacter.id, { limit: 20 })
      setMailboxUnreadCount(response.unreadCount)
      const unreadAlerts = response.mails
        .filter((mail) => !mail.isRead && (mail.alertKind === 'pvp_defense' || mail.alertKind === 'raid_finished'))
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      const unseenAlerts = unreadAlerts.filter((mail) => !surfacedMailAlertIdsRef.current.has(mail.id))
      if (unseenAlerts.length > 0) {
        unseenAlerts.forEach((mail) => surfacedMailAlertIdsRef.current.add(mail.id))
        setMailAlertQueue((prev) => {
          const existingIds = new Set(prev.map((mail) => mail.id))
          const additions = unseenAlerts.filter((mail) => !existingIds.has(mail.id))
          return additions.length > 0 ? [...prev, ...additions] : prev
        })
      }
    } catch {
      // mailbox polling should never break gameplay tabs
    }
  }, [displayCharacter?.id, fableId, realm?.id])

  useEffect(() => {
    if (!fableId || !realm?.id || !displayCharacter?.id) return
    surfacedMailAlertIdsRef.current.clear()
    setMailAlertQueue([])
    setActiveMailAlert(null)
    setMailboxUnreadCount(0)
    void pollMailbox()
    const intervalId = window.setInterval(() => {
      void pollMailbox()
    }, 10000)
    return () => window.clearInterval(intervalId)
  }, [displayCharacter?.id, fableId, pollMailbox, realm?.id])

  useEffect(() => {
    if (activeMailAlert || mailAlertQueue.length === 0) return
    setActiveMailAlert(mailAlertQueue[0])
    setMailAlertQueue((prev) => prev.slice(1))
  }, [activeMailAlert, mailAlertQueue])

  const handleMailAlertAction = useCallback(async (watchReplay: boolean) => {
    if (!activeMailAlert || !fableId || !realm?.id || !displayCharacter?.id || mailAlertActionLoading) return
    const selectedMail = activeMailAlert
    setMailAlertActionLoading(true)
    try {
      await markMailboxMailRead(fableId, realm.id, displayCharacter.id, selectedMail.id)
      if (watchReplay) {
        setMailboxAutoOpenMailId(selectedMail.id)
        setActiveTab('mailbox')
      }
    } catch {
      // keep flow smooth even if read action fails
    } finally {
      setMailAlertActionLoading(false)
      setActiveMailAlert(null)
      void pollMailbox()
    }
  }, [activeMailAlert, displayCharacter?.id, fableId, mailAlertActionLoading, pollMailbox, realm?.id])

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
      <Dialog open={showCreateChar} disableEscapeKeyDown maxWidth="sm" fullWidth PaperProps={{ sx: { minHeight: 420 } }}>
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
                {selectedClass && (() => {
                  const isHero = selectedClass.isHeroClass
                  const isTaken = isHero && takenHeroClassIds.has(selectedClass.id)
                  const borderColor = isHero
                    ? 'rgba(255,193,69,0.6)'
                    : 'rgba(168,85,247,0.35)'
                  const glowColor = isHero
                    ? '0 0 36px rgba(255,193,69,0.3), inset 0 0 24px rgba(0,0,0,0.3)'
                    : '0 0 36px rgba(168,85,247,0.2), inset 0 0 24px rgba(0,0,0,0.3)'
                  const dropShadow = isHero
                    ? 'drop-shadow(0 0 8px rgba(255,193,69,0.6)) drop-shadow(0 0 20px rgba(255,193,69,0.3))'
                    : 'drop-shadow(0 0 8px rgba(168,85,247,0.6)) drop-shadow(0 0 20px rgba(168,85,247,0.3))'
                  return (
                    <>
                      <Box sx={{ position: 'relative' }}>
                        <Box
                          sx={{
                            width: 300,
                            height: 300,
                            flexShrink: 0,
                            borderRadius: 2,
                            overflow: 'hidden',
                            bgcolor: '#14121f',
                            backgroundImage: `url(${charBackground})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: `3px solid ${borderColor}`,
                            boxShadow: glowColor,
                            ...(isTaken ? { opacity: 0.45, filter: 'grayscale(0.5)' } : {}),
                          }}
                        >
                          {selectedClass.iconUrl ? (
                            <Box
                              component="img"
                              src={selectedClass.iconUrl}
                              alt={selectedClass.name}
                              sx={{ width: '100%', height: '100%', objectFit: 'cover', filter: dropShadow }}
                            />
                          ) : (
                            <PersonIcon sx={{ fontSize: 64, color: isHero ? 'rgba(255,193,69,0.35)' : 'rgba(168,85,247,0.25)' }} />
                          )}
                        </Box>
                        {isTaken && (
                          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                            <LockIcon sx={{ fontSize: 64, color: 'rgba(255,193,69,0.8)' }} />
                          </Box>
                        )}
                      </Box>
                      {isHero && (
                        <Chip
                          icon={<StarIcon sx={{ color: '#ffc145 !important', fontSize: 16 }} />}
                          label={isTaken ? 'Hero Class — Taken' : 'Hero Class'}
                          size="small"
                          sx={{
                            mt: 1,
                            fontWeight: 700,
                            background: 'linear-gradient(135deg, #ffc145, #ff6b35)',
                            color: '#1b1b2f',
                            border: 'none',
                            ...(isTaken ? { opacity: 0.7 } : {}),
                          }}
                        />
                      )}
                      <Typography
                        variant="h6"
                        sx={{
                          mt: 1,
                          ...(isHero ? {
                            background: 'linear-gradient(135deg, #ffc145, #ff6b35)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            fontWeight: 800,
                          } : {}),
                        }}
                      >
                        {selectedClass.name}
                      </Typography>
                      {selectedClass.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 360 }}>
                          {selectedClass.description}
                        </Typography>
                      )}
                    </>
                  )
                })()}
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
          <Tooltip title={selectedClass?.isHeroClass && takenHeroClassIds.has(selectedClassId) ? 'This Hero Class is already taken by another player' : ''}>
            <span>
              <Button variant="contained" onClick={handleCreateCharacter} disabled={creating || !charName.trim() || !selectedClassId || (selectedClass?.isHeroClass === true && takenHeroClassIds.has(selectedClassId))}>
                {creating ? 'Creating...' : 'Create'}
              </Button>
            </span>
          </Tooltip>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!activeMailAlert}
        onClose={() => { void handleMailAlertAction(false) }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {activeMailAlert?.alertKind === 'pvp_defense' ? 'You were attacked!' : 'Raid battle finished!'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {activeMailAlert?.alertKind === 'pvp_defense'
              ? 'A PvP battle report is waiting in your mailbox.'
              : 'A raid battle report is waiting in your mailbox.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { void handleMailAlertAction(false) }} disabled={mailAlertActionLoading}>
            Close
          </Button>
          <Button
            variant="contained"
            onClick={() => { void handleMailAlertAction(true) }}
            disabled={mailAlertActionLoading || !activeMailAlert?.hasReplay}
          >
            Watch
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
          {TABS.map((tab) => {
            const isRaidsNoGuild = tab.id === 'raids' && !displayCharacter?.groupId
            const isMailbox = tab.id === 'mailbox'
            const iconNode = isMailbox && mailboxUnreadCount > 0 ? (
              <Badge
                color="error"
                badgeContent={mailboxUnreadCount > 99 ? '99+' : mailboxUnreadCount}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
              >
                {tab.icon}
              </Badge>
            ) : tab.icon
            return (
            <Tooltip key={tab.id} title={isRaidsNoGuild ? 'A guild is required' : ''}>
              <span>
            <ListItemButton
              selected={activeTab === tab.id}
              onClick={() => !isRaidsNoGuild && setActiveTab(tab.id)}
              disabled={isRaidsNoGuild}
              sx={{ mb: 0.5, py: 1.5 }}
            >
              <ListItemIcon sx={{ minWidth: 42, color: activeTab === tab.id ? 'primary.main' : 'text.secondary' }}>
                {iconNode}
              </ListItemIcon>
              <ListItemText
                primary={tab.label}
                primaryTypographyProps={{ fontWeight: activeTab === tab.id ? 700 : 500, fontSize: '1rem' }}
              />
            </ListItemButton>
              </span>
            </Tooltip>
          )})}
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
            {activeTab === 'abilities' && displayCharacter && realm && pack && (
              <AbilitiesTab
                fableId={fableId}
                realmId={realm.id}
                character={displayCharacter}
                pack={pack}
                onCharacterUpdate={handleCharacterUpdate}
              />
            )}
            {activeTab === 'guild' && pack && (
              <GuildTab
                fableId={fableId}
                realmId={realm.id}
                character={displayCharacter}
                pack={pack}
                onCharacterUpdate={handleCharacterUpdate}
                onRequestPvpFight={handleRequestPvpFight}
              />
            )}
            {activeTab === 'dungeons' && displayCharacter && realm && pack && (
              <DungeonsTab
                fableId={fableId}
                realmId={realm.id}
                character={displayCharacter}
                pack={pack}
                onCharacterUpdate={handleCharacterUpdate}
              />
            )}
            {activeTab === 'raids' && displayCharacter && realm && pack && displayCharacter.groupId && (
              <RaidsTab
                fableId={fableId}
                realmId={realm.id}
                character={displayCharacter}
                pack={pack}
                groupId={displayCharacter.groupId}
                onCharacterUpdate={handleCharacterUpdate}
              />
            )}
            {activeTab === 'mailbox' && displayCharacter && realm && pack && (
              <MailboxTab
                fableId={fableId}
                realmId={realm.id}
                character={displayCharacter}
                pack={pack}
                autoOpenMailId={mailboxAutoOpenMailId}
                onAutoOpenHandled={() => setMailboxAutoOpenMailId(null)}
                onMailboxChanged={() => { void pollMailbox() }}
              />
            )}
            {activeTab === 'pvp' && displayCharacter && realm && pack && (
              <PvPTab
                fableId={fableId}
                realmId={realm.id}
                character={displayCharacter}
                pack={pack}
                pendingPvpFight={pendingPvpFight}
                onClearPendingPvpFight={handleClearPendingPvpFight}
              />
            )}
          </Box>
        )}
      </Box>
    </Box>
  )
}

