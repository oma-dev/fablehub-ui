import { useCallback, useRef, useState, forwardRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
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
  STYLE_ANIMATIONS,
  DEFAULT_ANIMATION,
  getAttackAnimation,
  type AttackAnimation,
  type ImpactStyle,
} from '../../routes/Fables/expressions/IdleRPG/components/vfx/animationConfig'
import ImpactEffect from '../../routes/Fables/expressions/IdleRPG/components/vfx/ImpactEffect'
import DamageNumber from '../../routes/Fables/expressions/IdleRPG/components/vfx/DamageNumber'
import Projectile, { PROJECTILE_SPEED, type ProjectilePos } from '../../routes/Fables/expressions/IdleRPG/components/vfx/Projectile'

const styleIds = Object.keys(STYLE_ANIMATIONS)
const ALL_IMPACT_STYLES: ImpactStyle[] = ['slash', 'punch', 'flail', 'arrow', 'bolt', 'generic']

function getMotionVariants(anim: AttackAnimation, direction: 'left' | 'right') {
  const sign = direction === 'left' ? 1 : -1
  return {
    idle: { x: 0, scale: 1 },
    lunge: { x: sign * anim.lungeDistance, scale: 1.05, transition: { duration: 0.2, ease: [0.0, 0.0, 0.58, 1.0] as const } },
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
          <ImpactEffect show={showImpact} style={impactStyle} color={impactColor} id={`impact-${impactKey}`} />
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
  const [trajectoryOverride, setTrajectoryOverride] = useState<'auto' | 'straight' | 'arc'>('auto')
  const [playing, setPlaying] = useState(false)
  const [logLines, setLogLines] = useState<string[]>([])

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

  const attackerAnim = getAttackAnimation(attackerStyle)
  const defenderAnim = getAttackAnimation(defenderStyle)
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

  const log = useCallback((text: string) => {
    setLogLines((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${text}`])
  }, [])

  const runAttack = useCallback(async (
    side: 'player' | 'creature',
    anim: AttackAnimation,
    styleId: string,
  ) => {
    const setAttVar = side === 'player' ? setPlayerVariant : setCreatureVariant
    const setTgtImpact = side === 'player' ? setShowCreatureImpact : setShowPlayerImpact
    const setTgtDmg = side === 'player' ? setCreatureDmg : setPlayerDmg
    const setTgtVar = side === 'player' ? setCreatureVariant : setPlayerVariant
    const sideLabel = side === 'player' ? 'Player' : 'Creature'

    log(`${sideLabel} attacks with "${styleId}" (motion: ${anim.casterMotion})`)

    if (anim.casterMotion === 'lunge') {
      setAttVar('lunge')
      await sleep(220)
    } else if (anim.casterMotion === 'cast') {
      setAttVar('cast')
      await sleep(160)
    }

    if (anim.projectile) {
      const dir = side === 'player' ? 'left-to-right' as const : 'right-to-left' as const
      const traj = trajectoryOverride === 'auto' ? anim.projectile : trajectoryOverride
      const srcRef = side === 'player' ? playerPortraitRef : creaturePortraitRef
      const tgtRef = side === 'player' ? creaturePortraitRef : playerPortraitRef
      setProjFrom(getPortraitPos(srcRef))
      setProjTo(getPortraitPos(tgtRef))
      setProjectileAttacker(side)
      setShowProjectile(dir)
      const flightMs = (traj === 'arc' ? PROJECTILE_SPEED * 1.25 : PROJECTILE_SPEED) * 1000 + 50
      log(`  Projectile (${traj}) traveling ${dir}${weaponUrl ? ' [weapon img]' : ''} — ${Math.round(flightMs)}ms`)
      await sleep(flightMs)
      setShowProjectile(null)
    }

    const dmgValue = Math.floor(Math.random() * 30) + 5
    setTgtImpact(true)
    setTgtVar('hit')
    dmgKeyRef.current++
    setTgtDmg({ value: dmgValue, type: 'damage', key: dmgKeyRef.current })
    log(`  Impact: "${anim.impactStyle}" → ${dmgValue} damage`)
    await sleep(350)

    setTgtImpact(false)
    setAttVar('return')
    setTgtVar('idle')
    await sleep(280)

    setAttVar('idle')
    setTgtDmg(null)
  }, [log])

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
          <Chip
            size="small"
            label={`motion: ${attackerAnim.casterMotion}`}
            color="info"
            variant="outlined"
          />
          <Chip
            size="small"
            label={`projectile: ${attackerAnim.projectile ?? 'none'}`}
            color={attackerAnim.projectile ? 'success' : 'default'}
            variant="outlined"
          />
          <Chip
            size="small"
            label={`impact: ${attackerAnim.impactStyle}`}
            sx={{ borderColor: attackerAnim.impactColor, color: attackerAnim.impactColor }}
            variant="outlined"
          />
        </Box>
      </Paper>

      {/* Weapon projectile config */}
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          label="Weapon Image URL"
          value={weaponUrl}
          onChange={(e) => setWeaponUrl(e.target.value)}
          sx={{ minWidth: 320, flex: 1 }}
          placeholder="https://example.com/sword.png"
          helperText="Tip must face up, centered. Leave empty for default orb."
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
        {weaponUrl && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
            <img src={weaponUrl} alt="preview" style={{ width: 32, height: 32, objectFit: 'contain' }} />
            <Typography variant="caption" color="text.secondary">Preview</Typography>
          </Box>
        )}
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
                weaponUrl={weaponUrl || undefined}
                trajectory={trajectoryOverride === 'auto'
                  ? (projectileAttacker === 'player' ? attackerAnim.projectile : defenderAnim.projectile)
                  : trajectoryOverride}
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
            impactStyle={defenderAnim.impactStyle}
            impactColor={defenderAnim.impactColor}
            impactKey={dmgKeyRef.current}
            dmg={playerDmg}
            accentGradient="linear-gradient(135deg, rgba(33,150,243,0.08) 0%, rgba(33,150,243,0.02) 100%)"
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
            impactStyle={attackerAnim.impactStyle}
            impactColor={attackerAnim.impactColor}
            impactKey={dmgKeyRef.current}
            dmg={creatureDmg}
            accentGradient="linear-gradient(135deg, rgba(244,67,54,0.08) 0%, rgba(244,67,54,0.02) 100%)"
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
            const matching = Object.entries(STYLE_ANIMATIONS).find(([, a]) => a.impactStyle === style)
            const color = matching ? matching[1].impactColor : DEFAULT_ANIMATION.impactColor
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
              {['styleId', 'motion', 'projectile', 'impact', 'color', 'lunge', 'duration'].map((h) => (
                <Box component="th" key={h} sx={{ textAlign: 'left', pb: 1, pr: 2, borderBottom: '1px solid', borderColor: 'divider', fontWeight: 700 }}>
                  {h}
                </Box>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(STYLE_ANIMATIONS).map(([id, a]) => (
              <tr key={id}>
                <Box component="td" sx={{ py: 0.5, pr: 2 }}>{id}</Box>
                <Box component="td" sx={{ py: 0.5, pr: 2 }}>{a.casterMotion}</Box>
                <Box component="td" sx={{ py: 0.5, pr: 2 }}>{a.projectile ?? '—'}</Box>
                <Box component="td" sx={{ py: 0.5, pr: 2 }}>{a.impactStyle}</Box>
                <Box component="td" sx={{ py: 0.5, pr: 2 }}>
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: a.impactColor }} />
                    {a.impactColor}
                  </Box>
                </Box>
                <Box component="td" sx={{ py: 0.5, pr: 2 }}>{a.lungeDistance}px</Box>
                <Box component="td" sx={{ py: 0.5, pr: 2 }}>{a.sequenceDurationMs}ms</Box>
              </tr>
            ))}
          </tbody>
        </Box>
      </Paper>
    </Box>
  )
}
