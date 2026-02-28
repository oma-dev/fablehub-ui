import { useCallback, useRef, useState, forwardRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Select from '@mui/material/Select'
import Typography from '@mui/material/Typography'
import PersonIcon from '@mui/icons-material/Person'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import TextField from '@mui/material/TextField'
import {
  STYLE_IDS,
  getAttackAnimationConfig,
  type AttackAnimationConfig,
  type ImpactStyle,
  type AnimationFrameImageSource,
} from '../../routes/Fables/expressions/IdleRPG/components/vfx/animationConfig'
import DamageNumber from '../../routes/Fables/expressions/IdleRPG/components/vfx/DamageNumber'
import ImpactEffect from '../../routes/Fables/expressions/IdleRPG/components/vfx/ImpactEffect'
import ImpactFrame from '../../routes/Fables/expressions/IdleRPG/components/vfx/ImpactFrame'
import Projectile, { PROJECTILE_SPEED, type ProjectilePos } from '../../routes/Fables/expressions/IdleRPG/components/vfx/Projectile'
import WeaponFrame from '../../routes/Fables/expressions/IdleRPG/components/vfx/WeaponFrame'

const styleIds = [...STYLE_IDS]
const ALL_IMPACT_STYLES: ImpactStyle[] = ['slash', 'punch', 'flail', 'arrow', 'bolt', 'generic']

function getMotionVariants(_anim: AttackAnimationConfig, direction: 'left' | 'right') {
  const sign = direction === 'left' ? 1 : -1
  return {
    idle: { x: 0, scale: 1 },
    cast: { scale: 1.08, transition: { duration: 0.15 } },
    hit: { x: [0, sign * -6, sign * 6, sign * -4, 0], transition: { duration: 0.3 } },
    return: { x: 0, scale: 1, transition: { duration: 0.25, ease: [0.42, 0.0, 0.58, 1.0] as const } },
  }
}

const CombatantCard = forwardRef<HTMLDivElement, {
  label: string
  icon: React.ReactNode
  variant: string
  variants: ReturnType<typeof getMotionVariants>
  showImpact: boolean
  impactStyle: ImpactStyle
  impactColor: string
  impactKey: number
  dmg: { value: number; type: 'damage' | 'heal'; key: number } | null
  accentGradient: string
  showWeaponFrame?: boolean
  weaponFrameConfig?: { url: string; fadeInMs: number; sizePx?: number; startSizePx?: number; endSizePx?: number } | null
  impactFrameConfig?: { url: string; showMs: number; vanishMs: number; sizePx?: number; startSizePx?: number; endSizePx?: number } | null
}>(function CombatantCard({
  label,
  icon,
  variant,
  variants,
  showImpact,
  impactStyle,
  impactColor,
  impactKey,
  dmg,
  accentGradient,
  showWeaponFrame,
  weaponFrameConfig,
  impactFrameConfig,
}, ref) {
  return (
    <motion.div variants={variants} animate={variant} style={{ width: 220, position: 'relative' }}>
      <Paper
        variant="outlined"
        sx={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 1.5, p: 2.5, borderRadius: 2, background: accentGradient,
        }}
      >
        <Box ref={ref} sx={{ position: 'relative', width: 100, height: 100 }}>
          <Box
            sx={{
              width: 100, height: 100, borderRadius: 1.5, bgcolor: 'rgba(0,0,0,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid', borderColor: 'divider',
            }}
          >
            {icon}
          </Box>
          {showWeaponFrame && weaponFrameConfig && (
            <WeaponFrame show url={weaponFrameConfig.url} fadeInMs={weaponFrameConfig.fadeInMs} sizePx={weaponFrameConfig.sizePx} startSizePx={weaponFrameConfig.startSizePx} endSizePx={weaponFrameConfig.endSizePx} id={`weapon-${label}`} />
          )}
          {showImpact && impactFrameConfig ? (
            <ImpactFrame
              show
              url={impactFrameConfig.url}
              showMs={impactFrameConfig.showMs}
              vanishMs={impactFrameConfig.vanishMs}
              sizePx={impactFrameConfig.sizePx}
              startSizePx={impactFrameConfig.startSizePx}
              endSizePx={impactFrameConfig.endSizePx}
              id={`impact-frame-${impactKey}`}
            />
          ) : (
            <ImpactEffect show={showImpact} style={impactStyle} color={impactColor} id={`impact-${impactKey}`} />
          )}
          <AnimatePresence>
            {dmg && <DamageNumber value={dmg.value} type={dmg.type} id={dmg.key} />}
          </AnimatePresence>
        </Box>
        <Typography variant="subtitle1" fontWeight={700}>{label}</Typography>
      </Paper>
    </motion.div>
  )
})

export default function AnimationTest() {
  const [attackerStyle, setAttackerStyle] = useState(styleIds[0])
  const [defenderStyle, setDefenderStyle] = useState(styleIds[0])
  const [weaponUrl, setWeaponUrl] = useState('https://bg3.wiki/w/images/c/ca/Flail_Unfaded.png')
  const [weaponAnimationUrl, setWeaponAnimationUrl] = useState('https://bg3.wiki/w/images/0/0f/Quarterstaff_Unfaded.png')
  const [weaponProjectileUrl, setWeaponProjectileUrl] = useState('')
  const [weaponImpactUrl, setWeaponImpactUrl] = useState('')
  const [trajectoryOverride, setTrajectoryOverride] = useState<'auto' | 'straight' | 'arc'>('auto')
  const [playing, setPlaying] = useState(false)
  const [logLines, setLogLines] = useState<string[]>([])

  // Animation frames (optional PNGs) — each frame: image source (custom / weapon icon / weapon animation) + URL when custom
  const [frameWeaponEnabled, setFrameWeaponEnabled] = useState(false)
  const [frameWeaponImageSource, setFrameWeaponImageSource] = useState<AnimationFrameImageSource>('url')
  const [frameWeaponUrl, setFrameWeaponUrl] = useState('https://bg3.wiki/w/images/0/0f/Quarterstaff_Unfaded.png')
  const [frameWeaponFadeInMs, setFrameWeaponFadeInMs] = useState(200)
  const [frameWeaponStartSizePx, setFrameWeaponStartSizePx] = useState(80)
  const [frameWeaponEndSizePx, setFrameWeaponEndSizePx] = useState(120)
  const [frameProjectileEnabled, setFrameProjectileEnabled] = useState(false)
  const [frameProjectileImageSource, setFrameProjectileImageSource] = useState<AnimationFrameImageSource>('url')
  const [frameProjectileUrl, setFrameProjectileUrl] = useState('https://bg3.wiki/w/images/2/2e/Fireball_Spell_Icon.png')
  const [frameProjectileSpeedMs, setFrameProjectileSpeedMs] = useState(400)
  const [frameProjectileTrajectory, setFrameProjectileTrajectory] = useState<'straight' | 'arc'>('arc')
  const [frameProjectileStartSizePx, setFrameProjectileStartSizePx] = useState(120)
  const [frameProjectileEndSizePx, setFrameProjectileEndSizePx] = useState(300)
  const [frameImpactEnabled, setFrameImpactEnabled] = useState(false)
  const [frameImpactImageSource, setFrameImpactImageSource] = useState<AnimationFrameImageSource>('url')
  const [frameImpactUrl, setFrameImpactUrl] = useState('https://bg3.wiki/w/images/4/4e/Smoke_Powder_Unfaded.png')
  const [frameImpactShowMs, setFrameImpactShowMs] = useState(100)
  const [frameImpactVanishMs, setFrameImpactVanishMs] = useState(500)
  const [frameImpactStartSizePx, setFrameImpactStartSizePx] = useState(60)
  const [frameImpactEndSizePx, setFrameImpactEndSizePx] = useState(140)

  const [showWeaponFrameSide, setShowWeaponFrameSide] = useState<'player' | 'creature' | null>(null)
  const [weaponFrameConfig, setWeaponFrameConfig] = useState<{ url: string; fadeInMs: number; sizePx?: number; startSizePx?: number; endSizePx?: number } | null>(null)
  const [projectileImageUrl, setProjectileImageUrl] = useState<string | null>(null)
  const [projectileDurationMs, setProjectileDurationMs] = useState<number | undefined>(undefined)
  const [projectileSizePx, setProjectileSizePx] = useState<number | undefined>(undefined)
  const [projectileStartSizePx, setProjectileStartSizePx] = useState<number | undefined>(undefined)
  const [projectileEndSizePx, setProjectileEndSizePx] = useState<number | undefined>(undefined)
  const [impactFrameConfig, setImpactFrameConfig] = useState<{ url: string; showMs: number; vanishMs: number; sizePx?: number; startSizePx?: number; endSizePx?: number } | null>(null)

  const [playerVariant, setPlayerVariant] = useState('idle')
  const [creatureVariant, setCreatureVariant] = useState('idle')
  const [showPlayerImpact, setShowPlayerImpact] = useState(false)
  const [showCreatureImpact, setShowCreatureImpact] = useState(false)
  const [showProjectile, setShowProjectile] = useState<'left-to-right' | 'right-to-left' | null>(null)
  const [projectileAttacker, setProjectileAttacker] = useState<'player' | 'creature'>('player')
  const [projFrom, setProjFrom] = useState<ProjectilePos>({ x: 0, y: 0 })
  const [projTo, setProjTo] = useState<ProjectilePos>({ x: 0, y: 0 })
  const [playerDmg, setPlayerDmg] = useState<{ value: number; type: 'damage' | 'heal'; key: number } | null>(null)
  const [creatureDmg, setCreatureDmg] = useState<{ value: number; type: 'damage' | 'heal'; key: number } | null>(null)
  const dmgKeyRef = useRef(0)
  const arenaRef = useRef<HTMLDivElement>(null)
  const playerPortraitRef = useRef<HTMLDivElement>(null)
  const creaturePortraitRef = useRef<HTMLDivElement>(null)

  // Impact gallery state
  const [galleryKey, setGalleryKey] = useState(0)
  const [galleryPlaying, setGalleryPlaying] = useState(false)

  const attackerAnim = getAttackAnimationConfig(attackerStyle)
  const defenderAnim = getAttackAnimationConfig(defenderStyle)
  const playerVariants = getMotionVariants(attackerAnim, 'left')
  const creatureVariants = getMotionVariants(defenderAnim, 'right')

  const getPortraitPos = useCallback((ref: React.RefObject<HTMLDivElement | null>): ProjectilePos => {
    const arena = arenaRef.current
    const el = ref.current
    if (!arena || !el) return { x: 0, y: 0 }
    const aRect = arena.getBoundingClientRect()
    const eRect = el.getBoundingClientRect()
    return {
      x: eRect.left + eRect.width / 2 - aRect.left,
      y: eRect.top + eRect.height / 2 - aRect.top,
    }
  }, [])

  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

  const resolveFrameUrl = useCallback((source: AnimationFrameImageSource, customUrl: string): string => {
    if (source === 'weaponIcon') return weaponUrl?.trim() || ''
    if (source === 'weaponAnimation') return weaponAnimationUrl?.trim() || ''
    if (source === 'weaponProjectile') return weaponProjectileUrl?.trim() || ''
    if (source === 'weaponImpact') return weaponImpactUrl?.trim() || ''
    return customUrl?.trim() || ''
  }, [weaponUrl, weaponAnimationUrl, weaponProjectileUrl, weaponImpactUrl])

  const log = useCallback((text: string) => {
    setLogLines((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${text}`])
  }, [])

  const runAttack = useCallback(async (
    side: 'player' | 'creature',
    anim: AttackAnimationConfig,
    styleId: string,
  ) => {
    const setAttVar = side === 'player' ? setPlayerVariant : setCreatureVariant
    const setTgtImpact = side === 'player' ? setShowCreatureImpact : setShowPlayerImpact
    const setTgtDmg = side === 'player' ? setCreatureDmg : setPlayerDmg
    const setTgtVar = side === 'player' ? setCreatureVariant : setPlayerVariant
    const sideLabel = side === 'player' ? 'Player' : 'Creature'

    log(`${sideLabel} attacks with "${styleId}" (cast)`)

    setAttVar('cast')
    await sleep(160)

    const weaponFrameResolvedUrl = resolveFrameUrl(frameWeaponImageSource, frameWeaponUrl)
    if (frameWeaponEnabled && weaponFrameResolvedUrl) {
      setWeaponFrameConfig({ url: weaponFrameResolvedUrl, fadeInMs: frameWeaponFadeInMs, startSizePx: frameWeaponStartSizePx, endSizePx: frameWeaponEndSizePx })
      setShowWeaponFrameSide(side)
      await sleep(frameWeaponFadeInMs)
    }

    const hasProjectile = frameProjectileEnabled ? true : anim.projectile
    if (hasProjectile) {
      const dir = side === 'player' ? 'left-to-right' as const : 'right-to-left' as const
      const traj = frameProjectileEnabled ? frameProjectileTrajectory : (trajectoryOverride === 'auto' ? anim.projectile : trajectoryOverride)
      if (traj == null) { setShowWeaponFrameSide(null); setWeaponFrameConfig(null); setImpactFrameConfig(null); return }
      const srcRef = side === 'player' ? playerPortraitRef : creaturePortraitRef
      const tgtRef = side === 'player' ? creaturePortraitRef : playerPortraitRef
      setProjFrom(getPortraitPos(srcRef))
      setProjTo(getPortraitPos(tgtRef))
      setProjectileAttacker(side)
      const projResolvedUrl = resolveFrameUrl(frameProjectileImageSource, frameProjectileUrl)
      if (frameProjectileEnabled && projResolvedUrl) {
        setProjectileImageUrl(projResolvedUrl)
        setProjectileDurationMs(frameProjectileSpeedMs)
        setProjectileSizePx(undefined)
        setProjectileStartSizePx(frameProjectileStartSizePx)
        setProjectileEndSizePx(frameProjectileEndSizePx)
      } else {
        setProjectileImageUrl(null)
        setProjectileDurationMs(undefined)
        setProjectileSizePx(undefined)
        setProjectileStartSizePx(undefined)
        setProjectileEndSizePx(undefined)
      }
      setShowProjectile(dir)
      const flightMs = frameProjectileEnabled ? frameProjectileSpeedMs : (traj === 'arc' ? PROJECTILE_SPEED * 1.25 : PROJECTILE_SPEED) * 1000 + 50
      log(`  Projectile (${traj}) ${frameProjectileEnabled ? '[frame]' : weaponUrl ? '[weapon img]' : ''} — ${Math.round(flightMs)}ms`)
      await sleep(flightMs)
      setShowProjectile(null)
    }

    const dmgValue = Math.floor(Math.random() * 30) + 5
    const impactResolvedUrl = resolveFrameUrl(frameImpactImageSource, frameImpactUrl)
    if (frameImpactEnabled && impactResolvedUrl) {
      setImpactFrameConfig({
        url: impactResolvedUrl,
        showMs: frameImpactShowMs,
        vanishMs: frameImpactVanishMs,
        startSizePx: frameImpactStartSizePx,
        endSizePx: frameImpactEndSizePx,
      })
    }
    setTgtImpact(true)
    setTgtVar('hit')
    dmgKeyRef.current++
    setTgtDmg({ value: dmgValue, type: 'damage', key: dmgKeyRef.current })
    log(`  Impact → ${dmgValue} damage`)
    const impactDuration = frameImpactEnabled ? frameImpactShowMs + frameImpactVanishMs : 350
    await sleep(impactDuration)

    setShowWeaponFrameSide(null)
    setWeaponFrameConfig(null)
    setImpactFrameConfig(null)
    setTgtImpact(false)
    setAttVar('return')
    setTgtVar('idle')
    await sleep(280)

    setAttVar('idle')
    setTgtDmg(null)
  }, [
    log,
    frameWeaponEnabled, frameWeaponImageSource, frameWeaponUrl, frameWeaponFadeInMs, frameWeaponStartSizePx, frameWeaponEndSizePx,
    frameProjectileEnabled, frameProjectileImageSource, frameProjectileUrl, frameProjectileSpeedMs, frameProjectileTrajectory, frameProjectileStartSizePx, frameProjectileEndSizePx,
    frameImpactEnabled, frameImpactImageSource, frameImpactUrl, frameImpactShowMs, frameImpactVanishMs, frameImpactStartSizePx, frameImpactEndSizePx,
    trajectoryOverride, weaponUrl, weaponAnimationUrl, weaponProjectileUrl, weaponImpactUrl, resolveFrameUrl,
  ])

  const handlePlay = useCallback(async () => {
    if (playing) return
    setPlaying(true)
    setLogLines([])

    await runAttack('player', attackerAnim, attackerStyle)
    await sleep(400)
    await runAttack('creature', defenderAnim, defenderStyle)

    log('Sequence complete.')
    setPlaying(false)
  }, [playing, attackerAnim, defenderAnim, attackerStyle, defenderStyle, runAttack, log])

  const handlePlayerAttack = useCallback(async () => {
    if (playing) return
    setPlaying(true)
    await runAttack('player', attackerAnim, attackerStyle)
    setPlaying(false)
  }, [playing, attackerAnim, attackerStyle, runAttack])

  const handleCreatureAttack = useCallback(async () => {
    if (playing) return
    setPlaying(true)
    await runAttack('creature', defenderAnim, defenderStyle)
    setPlaying(false)
  }, [playing, defenderAnim, defenderStyle, runAttack])

  const handleGalleryReplay = useCallback(() => {
    setGalleryPlaying(false)
    setTimeout(() => {
      setGalleryKey((k) => k + 1)
      setGalleryPlaying(true)
      setTimeout(() => setGalleryPlaying(false), 600)
    }, 50)
  }, [])

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', py: 4, px: 2, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Box>
        <Typography variant="h4" fontWeight={800}>Animation Test Bench</Typography>
        <Typography variant="body2" color="text.secondary">
          Pick attack styles, fire them, and preview every impact effect.
        </Typography>
      </Box>

      {/* Style selectors */}
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Attacker Style</InputLabel>
          <Select
            value={attackerStyle}
            label="Attacker Style"
            onChange={(e) => setAttackerStyle(e.target.value)}
          >
            {styleIds.map((id) => (
              <MenuItem key={id} value={id}>{id}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Defender Style</InputLabel>
          <Select
            value={defenderStyle}
            label="Defender Style"
            onChange={(e) => setDefenderStyle(e.target.value)}
          >
            {styleIds.map((id) => (
              <MenuItem key={id} value={id}>{id}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip size="small" label="motion: cast" color="info" variant="outlined" />
          <Chip
            size="small"
            label={`projectile: ${attackerAnim.projectile ?? 'none'}`}
            color={attackerAnim.projectile ? 'success' : 'default'}
            variant="outlined"
          />
          <Chip
            size="small"
            label="impact: generic"
            sx={{ borderColor: attackerAnim.impactColor, color: attackerAnim.impactColor }}
            variant="outlined"
          />
        </Box>
      </Paper>

      {/* Weapon URLs: icon (inventory/portrait) + animation (tip-up for projectile) */}
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <TextField
          size="small"
          label="Weapon icon URL"
          value={weaponUrl}
          onChange={(e) => setWeaponUrl(e.target.value)}
          sx={{ minWidth: 280, flex: 1 }}
          placeholder="Inventory, shop, portrait slot"
          helperText="Used in inventory/shop/portrait; also when frame uses &quot;Weapon icon&quot;."
        />
        <TextField
          size="small"
          label="Weapon animation URL"
          value={weaponAnimationUrl}
          onChange={(e) => setWeaponAnimationUrl(e.target.value)}
          sx={{ minWidth: 280, flex: 1 }}
          placeholder="Tip-up image for projectile frame"
          helperText="Used when frame uses &quot;Weapon animation&quot; (tip must face up)."
        />
        <TextField
          size="small"
          label="Weapon projectile URL"
          value={weaponProjectileUrl}
          onChange={(e) => setWeaponProjectileUrl(e.target.value)}
          sx={{ minWidth: 260, flex: 1 }}
          placeholder="Custom projectile image"
        />
        <TextField
          size="small"
          label="Weapon impact URL"
          value={weaponImpactUrl}
          onChange={(e) => setWeaponImpactUrl(e.target.value)}
          sx={{ minWidth: 260, flex: 1 }}
          placeholder="Custom impact image"
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Trajectory</InputLabel>
          <Select
            value={trajectoryOverride}
            label="Trajectory"
            onChange={(e) => setTrajectoryOverride(e.target.value as 'auto' | 'straight' | 'arc')}
          >
            <MenuItem value="auto">Auto (from style)</MenuItem>
            <MenuItem value="straight">Straight</MenuItem>
            <MenuItem value="arc">Arc</MenuItem>
          </Select>
        </FormControl>
        {(weaponUrl || weaponAnimationUrl || weaponProjectileUrl || weaponImpactUrl) && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, flexWrap: 'wrap' }}>
            {weaponUrl && <><img src={weaponUrl} alt="icon" style={{ width: 32, height: 32, objectFit: 'contain' }} /><Typography variant="caption" color="text.secondary">Icon</Typography></>}
            {weaponAnimationUrl && weaponAnimationUrl !== weaponUrl && <><img src={weaponAnimationUrl} alt="anim" style={{ width: 32, height: 32, objectFit: 'contain' }} /><Typography variant="caption" color="text.secondary">Anim</Typography></>}
            {weaponProjectileUrl && <><img src={weaponProjectileUrl} alt="proj" style={{ width: 32, height: 32, objectFit: 'contain' }} /><Typography variant="caption" color="text.secondary">Projectile</Typography></>}
            {weaponImpactUrl && <><img src={weaponImpactUrl} alt="impact" style={{ width: 32, height: 32, objectFit: 'contain' }} /><Typography variant="caption" color="text.secondary">Impact</Typography></>}
          </Box>
        )}
      </Paper>

      {/* Animation Frames: 3 optional PNGs + speeds */}
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Typography variant="subtitle1" fontWeight={700}>Animation Frames (optional PNGs)</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          Enable any combination: weapon (pops at caster), projectile (flies to target), impact (pops at target, then fades).
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Frame 1: Weapon */}
          <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
            <FormControlLabel
              control={<Checkbox checked={frameWeaponEnabled} onChange={(e) => setFrameWeaponEnabled(e.target.checked)} />}
              label={<Typography variant="subtitle2" fontWeight={600}>1. Weapon frame (caster center)</Typography>}
            />
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mt: 1, ml: 4 }}>
              <FormControl size="small" sx={{ minWidth: 140 }} disabled={!frameWeaponEnabled}>
                <InputLabel>Image</InputLabel>
                <Select value={frameWeaponImageSource} label="Image" onChange={(e) => setFrameWeaponImageSource(e.target.value as AnimationFrameImageSource)}>
                  <MenuItem value="url">Custom URL</MenuItem>
                  <MenuItem value="weaponIcon">Weapon icon</MenuItem>
                  <MenuItem value="weaponAnimation">Weapon animation</MenuItem>
                  <MenuItem value="weaponProjectile">Weapon projectile</MenuItem>
                  <MenuItem value="weaponImpact">Weapon impact</MenuItem>
                </Select>
              </FormControl>
              {frameWeaponImageSource === 'url' && (
                <TextField
                  size="small"
                  label="PNG URL"
                  value={frameWeaponUrl}
                  onChange={(e) => setFrameWeaponUrl(e.target.value)}
                  placeholder="https://..."
                  sx={{ minWidth: 280, flex: 1 }}
                  disabled={!frameWeaponEnabled}
                />
              )}
              <TextField
                size="small"
                type="number"
                label="Fade-in (ms)"
                value={frameWeaponFadeInMs}
                onChange={(e) => setFrameWeaponFadeInMs(Number(e.target.value) || 200)}
                inputProps={{ min: 50, max: 2000, step: 50 }}
                sx={{ width: 120 }}
                disabled={!frameWeaponEnabled}
              />
              <TextField
                size="small"
                type="number"
                label="Start size (px)"
                value={frameWeaponStartSizePx}
                onChange={(e) => setFrameWeaponStartSizePx(Number(e.target.value) || 80)}
                inputProps={{ min: 24, max: 400, step: 8 }}
                sx={{ width: 110 }}
                disabled={!frameWeaponEnabled}
              />
              <TextField
                size="small"
                type="number"
                label="End size (px)"
                value={frameWeaponEndSizePx}
                onChange={(e) => setFrameWeaponEndSizePx(Number(e.target.value) || 120)}
                inputProps={{ min: 24, max: 400, step: 8 }}
                sx={{ width: 100 }}
                disabled={!frameWeaponEnabled}
              />
            </Box>
          </Box>

          {/* Frame 2: Projectile */}
          <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
            <FormControlLabel
              control={<Checkbox checked={frameProjectileEnabled} onChange={(e) => setFrameProjectileEnabled(e.target.checked)} />}
              label={<Typography variant="subtitle2" fontWeight={600}>2. Projectile frame (caster → target)</Typography>}
            />
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mt: 1, ml: 4 }}>
              <FormControl size="small" sx={{ minWidth: 140 }} disabled={!frameProjectileEnabled}>
                <InputLabel>Image</InputLabel>
                <Select value={frameProjectileImageSource} label="Image" onChange={(e) => setFrameProjectileImageSource(e.target.value as AnimationFrameImageSource)}>
                  <MenuItem value="url">Custom URL</MenuItem>
                  <MenuItem value="weaponIcon">Weapon icon</MenuItem>
                  <MenuItem value="weaponAnimation">Weapon animation</MenuItem>
                  <MenuItem value="weaponProjectile">Weapon projectile</MenuItem>
                  <MenuItem value="weaponImpact">Weapon impact</MenuItem>
                </Select>
              </FormControl>
              {frameProjectileImageSource === 'url' && (
                <TextField
                  size="small"
                  label="PNG URL"
                  value={frameProjectileUrl}
                  onChange={(e) => setFrameProjectileUrl(e.target.value)}
                  placeholder="https://..."
                  sx={{ minWidth: 280, flex: 1 }}
                  disabled={!frameProjectileEnabled}
                />
              )}
              <TextField
                size="small"
                type="number"
                label="Speed (ms)"
                value={frameProjectileSpeedMs}
                onChange={(e) => setFrameProjectileSpeedMs(Number(e.target.value) || 400)}
                inputProps={{ min: 100, max: 2000, step: 50 }}
                sx={{ width: 120 }}
                disabled={!frameProjectileEnabled}
                helperText="Flight duration"
              />
              <FormControl size="small" sx={{ minWidth: 100 }} disabled={!frameProjectileEnabled}>
                <InputLabel>Path</InputLabel>
                <Select
                  value={frameProjectileTrajectory}
                  label="Path"
                  onChange={(e) => setFrameProjectileTrajectory(e.target.value as 'straight' | 'arc')}
                >
                  <MenuItem value="straight">Straight</MenuItem>
                  <MenuItem value="arc">Arc</MenuItem>
                </Select>
              </FormControl>
              <TextField
                size="small"
                type="number"
                label="Start size (px)"
                value={frameProjectileStartSizePx}
                onChange={(e) => setFrameProjectileStartSizePx(Number(e.target.value) || 120)}
                inputProps={{ min: 48, max: 600, step: 24 }}
                sx={{ width: 110 }}
                disabled={!frameProjectileEnabled}
              />
              <TextField
                size="small"
                type="number"
                label="End size (px)"
                value={frameProjectileEndSizePx}
                onChange={(e) => setFrameProjectileEndSizePx(Number(e.target.value) || 300)}
                inputProps={{ min: 48, max: 600, step: 24 }}
                sx={{ width: 100 }}
                disabled={!frameProjectileEnabled}
              />
            </Box>
          </Box>

          {/* Frame 3: Impact */}
          <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
            <FormControlLabel
              control={<Checkbox checked={frameImpactEnabled} onChange={(e) => setFrameImpactEnabled(e.target.checked)} />}
              label={<Typography variant="subtitle2" fontWeight={600}>3. Impact frame (target center, then fade out)</Typography>}
            />
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mt: 1, ml: 4 }}>
              <FormControl size="small" sx={{ minWidth: 140 }} disabled={!frameImpactEnabled}>
                <InputLabel>Image</InputLabel>
                <Select value={frameImpactImageSource} label="Image" onChange={(e) => setFrameImpactImageSource(e.target.value as AnimationFrameImageSource)}>
                  <MenuItem value="url">Custom URL</MenuItem>
                  <MenuItem value="weaponIcon">Weapon icon</MenuItem>
                  <MenuItem value="weaponAnimation">Weapon animation</MenuItem>
                  <MenuItem value="weaponProjectile">Weapon projectile</MenuItem>
                  <MenuItem value="weaponImpact">Weapon impact</MenuItem>
                </Select>
              </FormControl>
              {frameImpactImageSource === 'url' && (
                <TextField
                  size="small"
                  label="PNG URL"
                  value={frameImpactUrl}
                  onChange={(e) => setFrameImpactUrl(e.target.value)}
                  placeholder="https://..."
                  sx={{ minWidth: 280, flex: 1 }}
                  disabled={!frameImpactEnabled}
                />
              )}
              <TextField
                size="small"
                type="number"
                label="Show (ms)"
                value={frameImpactShowMs}
                onChange={(e) => setFrameImpactShowMs(Number(e.target.value) || 100)}
                inputProps={{ min: 0, max: 1000, step: 50 }}
                sx={{ width: 110 }}
                disabled={!frameImpactEnabled}
              />
              <TextField
                size="small"
                type="number"
                label="Vanish (ms)"
                value={frameImpactVanishMs}
                onChange={(e) => setFrameImpactVanishMs(Number(e.target.value) || 500)}
                inputProps={{ min: 100, max: 2000, step: 50 }}
                sx={{ width: 120 }}
                disabled={!frameImpactEnabled}
                helperText="Fade-out duration"
              />
              <TextField
                size="small"
                type="number"
                label="Start size (px)"
                value={frameImpactStartSizePx}
                onChange={(e) => setFrameImpactStartSizePx(Number(e.target.value) || 60)}
                inputProps={{ min: 48, max: 400, step: 8 }}
                sx={{ width: 110 }}
                disabled={!frameImpactEnabled}
              />
              <TextField
                size="small"
                type="number"
                label="End size (px)"
                value={frameImpactEndSizePx}
                onChange={(e) => setFrameImpactEndSizePx(Number(e.target.value) || 140)}
                inputProps={{ min: 48, max: 400, step: 8 }}
                sx={{ width: 100 }}
                disabled={!frameImpactEnabled}
              />
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Arena */}
      <Paper
        variant="outlined"
        sx={{ p: 3, borderRadius: 2, bgcolor: 'grey.50', display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        <Typography variant="subtitle2" fontWeight={700} color="text.secondary">Arena</Typography>

        <Box ref={arenaRef} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 3, py: 2, position: 'relative' }}>
          {/* Projectile layer (rendered at arena level so it flies across cards) */}
          <AnimatePresence>
            {showProjectile && (
              <Projectile
                show
                color={showProjectile === 'left-to-right' ? attackerAnim.impactColor : defenderAnim.impactColor}
                direction={showProjectile}
                id={`proj-${dmgKeyRef.current}`}
                weaponUrl={projectileImageUrl ?? (weaponUrl || undefined)}
                trajectory={(projectileImageUrl ? frameProjectileTrajectory : (trajectoryOverride === 'auto' ? (projectileAttacker === 'player' ? attackerAnim.projectile : defenderAnim.projectile) : trajectoryOverride)) ?? 'straight'}
                durationMs={projectileDurationMs}
                sizePx={projectileSizePx}
                startSizePx={projectileStartSizePx}
                endSizePx={projectileEndSizePx}
                from={projFrom}
                to={projTo}
              />
            )}
          </AnimatePresence>

          <CombatantCard
            ref={playerPortraitRef}
            label="Player"
            icon={<PersonIcon sx={{ fontSize: 48, color: 'rgba(33,150,243,0.5)' }} />}
            variant={playerVariant}
            variants={playerVariants}
            showImpact={showPlayerImpact}
            impactStyle="generic"
            impactColor={defenderAnim.impactColor}
            impactKey={dmgKeyRef.current}
            dmg={playerDmg}
            accentGradient="linear-gradient(135deg, rgba(33,150,243,0.08) 0%, rgba(33,150,243,0.02) 100%)"
            showWeaponFrame={showWeaponFrameSide === 'player'}
            weaponFrameConfig={weaponFrameConfig}
            impactFrameConfig={showPlayerImpact ? impactFrameConfig : null}
          />

          <Box sx={{ width: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Typography variant="h4" fontWeight={900} color="text.disabled" sx={{ userSelect: 'none' }}>VS</Typography>
          </Box>

          <CombatantCard
            ref={creaturePortraitRef}
            label="Creature"
            icon={<SmartToyIcon sx={{ fontSize: 48, color: 'rgba(244,67,54,0.5)' }} />}
            variant={creatureVariant}
            variants={creatureVariants}
            showImpact={showCreatureImpact}
            impactStyle="generic"
            impactColor={attackerAnim.impactColor}
            impactKey={dmgKeyRef.current}
            dmg={creatureDmg}
            accentGradient="linear-gradient(135deg, rgba(244,67,54,0.08) 0%, rgba(244,67,54,0.02) 100%)"
            showWeaponFrame={showWeaponFrameSide === 'creature'}
            weaponFrameConfig={weaponFrameConfig}
            impactFrameConfig={showCreatureImpact ? impactFrameConfig : null}
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={<PlayArrowIcon />}
            onClick={handlePlay}
            disabled={playing}
          >
            Play Both
          </Button>
          <Button variant="outlined" onClick={handlePlayerAttack} disabled={playing}>
            Player Attack
          </Button>
          <Button variant="outlined" color="error" onClick={handleCreatureAttack} disabled={playing}>
            Creature Attack
          </Button>
        </Box>
      </Paper>

      {/* Event log */}
      {logLines.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, maxHeight: 200, overflow: 'auto', bgcolor: '#1e1e1e' }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#888', mb: 0.5, fontSize: 11 }}>
            Event Log
          </Typography>
          {logLines.map((line, i) => (
            <Typography key={i} variant="body2" sx={{ fontFamily: 'monospace', fontSize: 11, color: '#ccc', lineHeight: 1.6 }}>
              {line}
            </Typography>
          ))}
        </Paper>
      )}

      <Divider />

      {/* Impact gallery */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Typography variant="h6" fontWeight={700}>Impact Gallery</Typography>
          <Button size="small" variant="outlined" onClick={handleGalleryReplay}>
            Replay All
          </Button>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {ALL_IMPACT_STYLES.map((style) => {
            const colorByStyle: Record<string, string> = {
              slash: '#ef5350', punch: '#ff9800', flail: '#b0bec5', arrow: '#8d6e63', bolt: '#7c4dff', generic: '#fff',
            }
            const color = colorByStyle[style] ?? '#fff'
            return (
              <Paper
                key={`${style}-${galleryKey}`}
                variant="outlined"
                sx={{
                  width: 120, height: 140, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 1, borderRadius: 2,
                  bgcolor: 'rgba(0,0,0,0.03)', position: 'relative',
                }}
              >
                <Box sx={{ position: 'relative', width: 64, height: 64 }}>
                  <ImpactEffect
                    show={galleryPlaying}
                    style={style}
                    color={color}
                    id={`gallery-${style}-${galleryKey}`}
                  />
                  {!galleryPlaying && (
                    <Box sx={{
                      width: 64, height: 64, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', opacity: 0.15,
                    }}>
                      <Typography variant="caption">click replay</Typography>
                    </Box>
                  )}
                </Box>
                <Typography variant="caption" fontWeight={600}>{style}</Typography>
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: color, border: '1px solid rgba(0,0,0,0.1)' }} />
              </Paper>
            )
          })}
        </Box>
      </Box>

      {/* Style reference table */}
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>Style Reference</Typography>
        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: 'monospace' }}>
          <thead>
            <tr>
              {['styleId', 'projectile', 'color', 'duration'].map((h) => (
                <Box component="th" key={h} sx={{ textAlign: 'left', pb: 1, pr: 2, borderBottom: '1px solid', borderColor: 'divider', fontWeight: 700 }}>
                  {h}
                </Box>
              ))}
            </tr>
          </thead>
          <tbody>
            {STYLE_IDS.map((id) => {
              const a = getAttackAnimationConfig(id)
              return (
              <tr key={id}>
                <Box component="td" sx={{ py: 0.5, pr: 2 }}>{id}</Box>
                <Box component="td" sx={{ py: 0.5, pr: 2 }}>{a.projectile ?? '—'}</Box>
                <Box component="td" sx={{ py: 0.5, pr: 2 }}>
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: a.impactColor }} />
                    {a.impactColor}
                  </Box>
                </Box>
                <Box component="td" sx={{ py: 0.5, pr: 2 }}>{a.sequenceDurationMs}ms</Box>
              </tr>
            )
            })}
          </tbody>
        </Box>
      </Paper>
    </Box>
  )
}
