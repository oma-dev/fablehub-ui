import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead'
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline'
import type {
  CharacterState,
  IdleRpgPackV1,
  MailReplayPayload,
  MailboxListResponse,
  MailboxMail,
  PvpMailReplayPayload,
  DungeonMailReplayPayload,
} from '@features/idle-rpg/api'
import {
  deleteMailboxMail,
  getMailbox,
  getMailboxReplay,
  markMailboxMailRead,
} from '@features/idle-rpg/api'
import CombatReplay from '../components/CombatReplay'
import RaidReplayView from '../components/RaidReplayView'
import { resolveAnimationFrames } from '../components/vfx/animationConfig'
import { resolveCharacterResource, resolveCreatureResource } from '../utils/combatStats'
import arenaBg from '../../../../../../assets/backgrounds/arena.png'
import dungeonBg from '../../../../../../assets/backgrounds/dungeon.png'

interface Props {
  fableId: string
  realmId: string
  character: CharacterState
  pack: IdleRpgPackV1
  autoOpenMailId?: string | null
  onAutoOpenHandled?: () => void
  onMailboxChanged?: () => void
}

function formatMailDate(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function getPvpReplayParticipants(replay: PvpMailReplayPayload, characterId: string) {
  const byId = new Map(replay.participants.map((p) => [p.id, p]))
  const left = byId.get(characterId) ?? replay.participants[0]
  const right = replay.participants.find((p) => p.id !== left?.id) ?? replay.participants[1] ?? replay.participants[0]
  return { left, right }
}

function getPvpSettlementDialogData(replay: PvpMailReplayPayload, viewerCharacterId: string): { title: string; message: string } | null {
  const settlement = replay.settlement
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

export default function MailboxTab({
  fableId,
  realmId,
  character,
  pack,
  autoOpenMailId,
  onAutoOpenHandled,
  onMailboxChanged,
}: Props) {
  const [mails, setMails] = useState<MailboxMail[]>([])
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeReplay, setActiveReplay] = useState<MailReplayPayload | null>(null)
  const [activeReplayMailId, setActiveReplayMailId] = useState<string | null>(null)
  const [openingMailId, setOpeningMailId] = useState<string | null>(null)
  const [actionMailId, setActionMailId] = useState<string | null>(null)
  const [pvpSettlementDialog, setPvpSettlementDialog] = useState<{ title: string; message: string } | null>(null)
  const replayOpenInFlightRef = useRef<Set<string>>(new Set())
  const autoOpenInFlightMailIdRef = useRef<string | null>(null)
  const autoOpenHandledMailIdRef = useRef<string | null>(null)
  const activeReplayMail = activeReplayMailId ? mails.find((mail) => mail.id === activeReplayMailId) : null

  const statusAnimations = useMemo(() => {
    const map: Record<string, any> = {}
    for (const status of (pack.statusEffects ?? [])) {
      if (status.animation) map[status.id] = status.animation
    }
    return map
  }, [pack.statusEffects])
  const statusTransforms = useMemo(() => {
    const map: Record<string, any> = {}
    for (const status of (pack.statusEffects ?? [])) {
      if (status.transform) map[status.id] = status.transform
    }
    return map
  }, [pack.statusEffects])

  const loadMailbox = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response: MailboxListResponse = await getMailbox(fableId, realmId, character.id, { limit: 40 })
      setMails(response.mails)
      setNextCursor(response.nextCursor)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load mailbox')
    } finally {
      setLoading(false)
    }
  }, [character.id, fableId, realmId])

  useEffect(() => {
    void loadMailbox()
  }, [loadMailbox])

  const handleLoadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const response = await getMailbox(fableId, realmId, character.id, { limit: 40, cursor: nextCursor })
      setMails((prev) => [...prev, ...response.mails])
      setNextCursor(response.nextCursor)
    } catch {
      // keep current list
    } finally {
      setLoadingMore(false)
    }
  }, [nextCursor, loadingMore, fableId, realmId, character.id])

  const openReplayByMailId = useCallback(async (mailId: string) => {
    if (replayOpenInFlightRef.current.has(mailId)) return
    replayOpenInFlightRef.current.add(mailId)
    setError(null)
    setOpeningMailId(mailId)
    try {
      const replayResponse = await getMailboxReplay(fableId, realmId, character.id, mailId)
      if (!replayResponse.mail.isRead) {
        await markMailboxMailRead(fableId, realmId, character.id, mailId)
        setMails((prev) => prev.map((m) => (m.id === mailId ? { ...m, isRead: true, readAt: new Date().toISOString() } : m)))
        onMailboxChanged?.()
      }
      if (!replayResponse.replay) {
        setError('This mail has no replay payload.')
        return
      }
      setActiveReplay(replayResponse.replay)
      setActiveReplayMailId(mailId)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to open replay')
    } finally {
      replayOpenInFlightRef.current.delete(mailId)
      setOpeningMailId((prev) => (prev === mailId ? null : prev))
    }
  }, [character.id, fableId, onMailboxChanged, realmId])

  const openReplay = useCallback(async (mail: MailboxMail) => {
    if (!mail.hasReplay) return
    await openReplayByMailId(mail.id)
  }, [openReplayByMailId])

  const handleMarkRead = useCallback(async (mail: MailboxMail) => {
    if (mail.isRead) return
    setActionMailId(mail.id)
    try {
      await markMailboxMailRead(fableId, realmId, character.id, mail.id)
      setMails((prev) => prev.map((m) => (m.id === mail.id ? { ...m, isRead: true, readAt: new Date().toISOString() } : m)))
      onMailboxChanged?.()
    } catch {
      // no-op
    } finally {
      setActionMailId(null)
    }
  }, [character.id, fableId, onMailboxChanged, realmId])

  const handleDelete = useCallback(async (mail: MailboxMail) => {
    setActionMailId(mail.id)
    try {
      await deleteMailboxMail(fableId, realmId, character.id, mail.id)
      setMails((prev) => prev.filter((m) => m.id !== mail.id))
      onMailboxChanged?.()
    } catch {
      // no-op
    } finally {
      setActionMailId(null)
    }
  }, [character.id, fableId, onMailboxChanged, realmId])

  useEffect(() => {
    if (!autoOpenMailId) return
    if (autoOpenHandledMailIdRef.current === autoOpenMailId) return
    if (autoOpenInFlightMailIdRef.current === autoOpenMailId) return
    autoOpenInFlightMailIdRef.current = autoOpenMailId
    void openReplayByMailId(autoOpenMailId)
      .finally(() => {
        autoOpenHandledMailIdRef.current = autoOpenMailId
        autoOpenInFlightMailIdRef.current = null
        onAutoOpenHandled?.()
      })
  }, [autoOpenMailId, onAutoOpenHandled, openReplayByMailId])

  const renderCombatReplay = (replay: PvpMailReplayPayload | DungeonMailReplayPayload) => {
    if (replay.kind === 'pvp') {
      const { left, right } = getPvpReplayParticipants(replay, character.id)
      if (!left || !right) return null
      const leftWeapon = left.weaponItemId ? pack.items.find((i) => i.id === left.weaponItemId) : undefined
      const rightWeapon = right.weaponItemId ? pack.items.find((i) => i.id === right.weaponItemId) : undefined
      const leftDefense = left.defenseItemId ? pack.items.find((i) => i.id === left.defenseItemId) : undefined
      const rightDefense = right.defenseItemId ? pack.items.find((i) => i.id === right.defenseItemId) : undefined
      const leftClass = left.classId ? pack.classes.find((c) => c.id === left.classId) : undefined
      const rightClass = right.classId ? pack.classes.find((c) => c.id === right.classId) : undefined
      const leftPrimary = leftClass ? pack.abilities?.find((a) => a.id === leftClass.primaryAttackId && a.abilityType === 'primary') : undefined
      const rightPrimary = rightClass ? pack.abilities?.find((a) => a.id === rightClass.primaryAttackId && a.abilityType === 'primary') : undefined
      const abilityAnimations: Record<string, any> = {}
      for (const ability of (pack.abilities ?? [])) {
        if (!ability.animationFrames) continue
        const leftResolved = resolveAnimationFrames(
          ability.animationFrames,
          leftWeapon?.iconUrl,
          leftWeapon?.animationUrl,
          leftWeapon?.projectileUrl,
          leftWeapon?.impactUrl,
          leftDefense?.iconUrl,
          leftDefense?.animationUrl,
          leftDefense?.projectileUrl,
          leftDefense?.impactUrl,
        )
        const rightResolved = resolveAnimationFrames(
          ability.animationFrames,
          rightWeapon?.iconUrl,
          rightWeapon?.animationUrl,
          rightWeapon?.projectileUrl,
          rightWeapon?.impactUrl,
          rightDefense?.iconUrl,
          rightDefense?.animationUrl,
          rightDefense?.projectileUrl,
          rightDefense?.impactUrl,
        )
        if (leftResolved || rightResolved) abilityAnimations[ability.id] = leftResolved ?? rightResolved
      }
      return (
        <CombatReplay
          key={`mail-replay-${activeReplayMailId ?? replay.kind}`}
          combat={replay.combat}
          leftCharacterId={left.id}
          arenaBackgroundImageUrl={arenaBg}
          abilityAnimations={abilityAnimations}
          statusAnimations={statusAnimations}
          statusTransforms={statusTransforms}
          playerIntroSoundUrl={leftClass?.introSoundUrl}
          playerIntroSoundVolumePercent={leftClass?.introSoundVolumePercent}
          playerIntroSoundFadeInMs={leftClass?.introSoundFadeInMs}
          playerIntroSoundFadeOutMs={leftClass?.introSoundFadeOutMs}
          creatureIntroSoundUrl={rightClass?.introSoundUrl}
          creatureIntroSoundVolumePercent={rightClass?.introSoundVolumePercent}
          creatureIntroSoundFadeInMs={rightClass?.introSoundFadeInMs}
          creatureIntroSoundFadeOutMs={rightClass?.introSoundFadeOutMs}
          player={{
            name: left.name,
            level: left.level,
            maxHp: left.maxHp,
            ap: left.ap,
            arm: left.arm,
            portraitUrl: left.portraitUrl ?? leftClass?.iconUrl,
            weaponUrl: leftWeapon?.iconUrl,
            weaponColorHex: leftWeapon?.colorHex,
            weaponAnimationUrl: leftWeapon?.animationUrl,
            weaponProjectileUrl: leftWeapon?.projectileUrl,
            weaponImpactUrl: leftWeapon?.impactUrl,
            defenseUrl: leftDefense?.iconUrl,
            defenseColorHex: leftDefense?.colorHex,
            defenseAnimationUrl: leftDefense?.animationUrl,
            defenseProjectileUrl: leftDefense?.projectileUrl,
            defenseImpactUrl: leftDefense?.impactUrl,
            animationFrames: resolveAnimationFrames(
              leftPrimary?.animationFrames,
              leftWeapon?.iconUrl,
              leftWeapon?.animationUrl,
              leftWeapon?.projectileUrl,
              leftWeapon?.impactUrl,
              leftDefense?.iconUrl,
              leftDefense?.animationUrl,
              leftDefense?.projectileUrl,
              leftDefense?.impactUrl,
            ),
            resource: resolveCharacterResource(pack, left.classId),
          }}
          creature={{
            name: right.name,
            level: right.level,
            maxHp: right.maxHp,
            ap: right.ap,
            arm: right.arm,
            portraitUrl: right.portraitUrl ?? rightClass?.iconUrl,
            weaponUrl: rightWeapon?.iconUrl,
            weaponColorHex: rightWeapon?.colorHex,
            weaponAnimationUrl: rightWeapon?.animationUrl,
            weaponProjectileUrl: rightWeapon?.projectileUrl,
            weaponImpactUrl: rightWeapon?.impactUrl,
            defenseUrl: rightDefense?.iconUrl,
            defenseColorHex: rightDefense?.colorHex,
            defenseAnimationUrl: rightDefense?.animationUrl,
            defenseProjectileUrl: rightDefense?.projectileUrl,
            defenseImpactUrl: rightDefense?.impactUrl,
            animationFrames: resolveAnimationFrames(
              rightPrimary?.animationFrames,
              rightWeapon?.iconUrl,
              rightWeapon?.animationUrl,
              rightWeapon?.projectileUrl,
              rightWeapon?.impactUrl,
              rightDefense?.iconUrl,
              rightDefense?.animationUrl,
              rightDefense?.projectileUrl,
              rightDefense?.impactUrl,
            ),
            resource: resolveCharacterResource(pack, right.classId),
          }}
          victory={replay.combat.winnerId === left.id}
          onFinish={() => {
            const shouldShowSettlementDialog = activeReplayMail?.alertKind === 'pvp_defense'
            const settlementDialog = shouldShowSettlementDialog
              ? getPvpSettlementDialogData(replay, character.id)
              : null
            if (settlementDialog && shouldShowSettlementDialog) {
              setPvpSettlementDialog(settlementDialog)
              return
            }
            setActiveReplay(null)
            setActiveReplayMailId(null)
          }}
        />
      )
    }

    const player = replay.player
    const boss = replay.boss
    const playerWeapon = player.weaponItemId ? pack.items.find((i) => i.id === player.weaponItemId) : undefined
    const playerDefense = player.defenseItemId ? pack.items.find((i) => i.id === player.defenseItemId) : undefined
    const playerClass = player.classId ? pack.classes.find((c) => c.id === player.classId) : undefined
    const primary = playerClass ? pack.abilities?.find((a) => a.id === playerClass.primaryAttackId && a.abilityType === 'primary') : undefined
    const bossTemplate = boss.creatureId ? pack.creatures.find((c) => c.id === boss.creatureId) : undefined
    const abilityAnimations: Record<string, any> = {}
    for (const ability of (pack.abilities ?? [])) {
      if (!ability.animationFrames) continue
      const resolved = resolveAnimationFrames(
        ability.animationFrames,
        playerWeapon?.iconUrl,
        playerWeapon?.animationUrl,
        playerWeapon?.projectileUrl,
        playerWeapon?.impactUrl,
        playerDefense?.iconUrl,
        playerDefense?.animationUrl,
        playerDefense?.projectileUrl,
        playerDefense?.impactUrl,
      )
      if (resolved) abilityAnimations[ability.id] = resolved
    }
    return (
      <CombatReplay
        key={`mail-replay-${activeReplayMailId ?? replay.kind}`}
        combat={replay.combat}
        leftCharacterId={player.id}
        abilityAnimations={abilityAnimations}
        statusAnimations={statusAnimations}
        statusTransforms={statusTransforms}
        arenaBackgroundImageUrl={replay.bossBackgroundImageUrl ?? dungeonBg}
        playerIntroSoundUrl={playerClass?.introSoundUrl}
        playerIntroSoundVolumePercent={playerClass?.introSoundVolumePercent}
        playerIntroSoundFadeInMs={playerClass?.introSoundFadeInMs}
        playerIntroSoundFadeOutMs={playerClass?.introSoundFadeOutMs}
        creatureIntroSoundUrl={bossTemplate?.introSoundUrl}
        creatureIntroSoundVolumePercent={bossTemplate?.introSoundVolumePercent}
        creatureIntroSoundFadeInMs={bossTemplate?.introSoundFadeInMs}
        creatureIntroSoundFadeOutMs={bossTemplate?.introSoundFadeOutMs}
        bossBattleMusicUrl={bossTemplate?.bossBattleMusicUrl}
        bossBattleMusicVolumePercent={bossTemplate?.bossBattleMusicVolumePercent}
        bossBattleMusicFadeInMs={bossTemplate?.bossBattleMusicFadeInMs}
        bossBattleMusicFadeOutMs={bossTemplate?.bossBattleMusicFadeOutMs}
        player={{
          name: player.name,
          level: player.level,
          maxHp: player.maxHp,
          ap: player.ap,
          arm: player.arm,
          portraitUrl: player.portraitUrl ?? playerClass?.iconUrl,
          weaponUrl: playerWeapon?.iconUrl,
          weaponColorHex: playerWeapon?.colorHex,
          weaponAnimationUrl: playerWeapon?.animationUrl,
          weaponProjectileUrl: playerWeapon?.projectileUrl,
          weaponImpactUrl: playerWeapon?.impactUrl,
          defenseUrl: playerDefense?.iconUrl,
          defenseColorHex: playerDefense?.colorHex,
          defenseAnimationUrl: playerDefense?.animationUrl,
          defenseProjectileUrl: playerDefense?.projectileUrl,
          defenseImpactUrl: playerDefense?.impactUrl,
          animationFrames: resolveAnimationFrames(
            primary?.animationFrames,
            playerWeapon?.iconUrl,
            playerWeapon?.animationUrl,
            playerWeapon?.projectileUrl,
            playerWeapon?.impactUrl,
            playerDefense?.iconUrl,
            playerDefense?.animationUrl,
            playerDefense?.projectileUrl,
            playerDefense?.impactUrl,
          ),
          resource: resolveCharacterResource(pack, player.classId),
        }}
        creature={{
          name: boss.name,
          level: boss.level,
          maxHp: boss.maxHp,
          ap: boss.ap,
          arm: boss.arm,
          portraitUrl: boss.portraitUrl ?? bossTemplate?.iconUrl,
          resource: resolveCreatureResource(pack, bossTemplate?.resourceId),
        }}
        victory={replay.victory}
        onFinish={() => {
          setActiveReplay(null)
          setActiveReplayMailId(null)
        }}
      />
    )
  }

  const settlementDialogNode = (
    <Dialog
      open={!!pvpSettlementDialog}
      onClose={() => {
        setPvpSettlementDialog(null)
        setActiveReplay(null)
        setActiveReplayMailId(null)
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
            setActiveReplay(null)
            setActiveReplayMailId(null)
          }}
        >
          Continue
        </Button>
      </DialogActions>
    </Dialog>
  )

  if (activeReplay) {
    if (activeReplay.kind === 'raid') {
      return (
        <>
          {settlementDialogNode}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <RaidReplayView
              key={`mail-replay-${activeReplayMailId ?? activeReplay.kind}`}
              replay={activeReplay}
              group={null}
              pack={pack}
              onDone={() => {
                setActiveReplay(null)
                setActiveReplayMailId(null)
              }}
            />
          </Box>
        </>
      )
    }
    return (
      <>
        {settlementDialogNode}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {renderCombatReplay(activeReplay)}
        </Box>
      </>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto', p: 3, gap: 2 }}>
      {settlementDialogNode}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h5" fontWeight={700}>Mailbox</Typography>
        <Button variant="outlined" size="small" onClick={() => void loadMailbox()} disabled={loading}>
          Refresh
        </Button>
      </Box>

      {error && <Typography color="error">{error}</Typography>}
      {loading && (
        <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      )}

      {!loading && mails.length === 0 && (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography color="text.secondary">No mail yet.</Typography>
        </Paper>
      )}

      {!loading && mails.length > 0 && (
        <Stack spacing={1.25}>
          {mails.map((mail) => (
            <Paper
              key={mail.id}
              variant="outlined"
              sx={{
                p: 1.5,
                borderColor: mail.isRead ? 'divider' : 'primary.main',
                bgcolor: mail.isRead ? 'background.paper' : 'rgba(168,85,247,0.08)',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {!mail.isRead && <Chip size="small" color="primary" label="Unread" />}
                  <Chip size="small" variant="outlined" label={mail.kind.toUpperCase()} />
                  <Typography variant="caption" color="text.secondary">{formatMailDate(mail.createdAt)}</Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">From: {mail.sender}</Typography>
              </Box>

              <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 0.5 }}>{mail.subject}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>{mail.message}</Typography>

              <Box sx={{ mt: 1.2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                {mail.hasReplay && (
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<PlayCircleOutlineIcon />}
                    onClick={() => void openReplay(mail)}
                    disabled={openingMailId === mail.id}
                  >
                    {openingMailId === mail.id ? 'Opening…' : 'Watch Replay'}
                  </Button>
                )}
                {!mail.isRead && (
                  <IconButton
                    size="small"
                    onClick={() => void handleMarkRead(mail)}
                    disabled={actionMailId === mail.id}
                    title="Mark as read"
                  >
                    <MarkEmailReadIcon fontSize="small" />
                  </IconButton>
                )}
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => void handleDelete(mail)}
                  disabled={actionMailId === mail.id}
                  title="Delete mail"
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Box>
            </Paper>
          ))}
          {nextCursor && (
            <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1 }}>
              <Button variant="outlined" onClick={() => void handleLoadMore()} disabled={loadingMore}>
                {loadingMore ? <CircularProgress size={18} color="inherit" /> : 'Load more'}
              </Button>
            </Box>
          )}
        </Stack>
      )}
    </Box>
  )
}
