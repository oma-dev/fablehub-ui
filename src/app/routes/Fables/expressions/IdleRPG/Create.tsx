import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Checkbox from '@mui/material/Checkbox'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { createIdleRpgRealm, getFable } from '../../../../../services/api'
import type {
  Ability,
  ClassBlock,
  CreatureTemplate,
  Fable,
  IdleRpgPackV1,
  ItemTemplate,
  LootTable,
  MerchantListing,
  Quest,
} from '../../../../../services/api'
import { RARITY_NAME_TO_NUMBER } from '../../../../../services/api'
import { exampleFormState } from './examplePack'

// --- Helpers ---
function parseTags(s: string): string[] {
  return (s || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}
function parseKeyValueNumber(s: string): Record<string, number> {
  const out: Record<string, number> = {}
  ;(s || '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .forEach((p) => {
      const i = p.indexOf(':')
      if (i > 0) {
        const k = p.slice(0, i).trim()
        const v = Number(p.slice(i + 1).trim())
        if (k && !Number.isNaN(v)) out[k] = v
      }
    })
  return out
}

const STAT_IDS = ['STR', 'DEX', 'INT', 'LCK', 'HP', 'ARM'] as const
const DELIVERIES = ['melee', 'projectile_straight', 'projectile_arced', 'instant'] as const
const STYLE_IDS = ['melee_slash', 'melee_punch', 'projectile_arrow', 'projectile_bolt', 'instant_slash'] as const
const SLOTS = ['attack_source', 'defense_layer'] as const
const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const
const ABILITY_TYPES: Ability['abilityType'][] = ['primary', 'regular', 'passive', 'ultimate']

// --- Form state types ---
type XpEntry = { level: string; xp: string }
type AbilityForm = { id: string; name: string; abilityType: Ability['abilityType']; description: string; iconUrl: string; delivery: string; styleId: string }
type ClassForm = {
  id: string
  name: string
  description: string
  iconUrl: string
  damageMainStat: string
  primaryAttackAbilityId: string
  attackTags: string
  attackRequired: boolean
  attackAllowEmpty: boolean
  defenseTags: string
  defenseRequired: boolean
  defenseAllowEmpty: boolean
  regularAbilityIds: string
  ultimateAbilityId: string
}
type CreatureForm = { id: string; name: string; role: 'quest' | 'boss'; level: string; hp: string; ap: string; arm: string; iconUrl: string; tags: string }
type ItemForm = { id: string; name: string; rarity: string; slot: string; tags: string; stats: string; iconUrl: string; animationUrl: string; projectileUrl: string; impactUrl: string; priceCurrencyId: string; priceAmount: string }
type QuestForm = { id: string; name: string; creatureId: string; durationSec: string; iconUrl: string; rewardXp: string; rewardCurrency: string; lootTableId: string }
type LootEntryForm = { itemId: string; weight: string; classId: string }

const emptyXp = (): XpEntry => ({ level: '', xp: '' })
const emptyAbility = (): AbilityForm => ({ id: '', name: '', abilityType: 'regular', description: '', iconUrl: '', delivery: 'melee', styleId: 'melee_slash' })
const emptyClass = (): ClassForm => ({
  id: '', name: '', description: '', iconUrl: '',
  damageMainStat: 'STR', primaryAttackAbilityId: '',
  attackTags: '', attackRequired: true, attackAllowEmpty: false,
  defenseTags: '', defenseRequired: false, defenseAllowEmpty: true,
  regularAbilityIds: '', ultimateAbilityId: '',
})
const emptyCreature = (): CreatureForm => ({ id: '', name: '', role: 'quest', level: '1', hp: '10', ap: '2', arm: '0', iconUrl: '', tags: '' })
const emptyItem = (): ItemForm => ({ id: '', name: '', rarity: 'common', slot: 'attack_source', tags: '', stats: '', iconUrl: '', animationUrl: '', projectileUrl: '', impactUrl: '', priceCurrencyId: '', priceAmount: '' })
const emptyQuest = (): QuestForm => ({ id: '', name: '', creatureId: '', durationSec: '60', iconUrl: '', rewardXp: '10', rewardCurrency: '', lootTableId: '' })
const emptyLootEntry = (): LootEntryForm => ({ itemId: '', weight: '1', classId: '' })

export default function IdleRpgCreate() {
  const { fableId } = useParams<{ fableId: string }>()
  const navigate = useNavigate()
  const [fableName, setFableName] = useState<string | null>(null)
  const [visibility, setVisibility] = useState<'private' | 'public'>('private')
  const [joinCode, setJoinCode] = useState('')
  const [playerCap, setPlayerCap] = useState(10)
  // Rules
  const [maxLevel, setMaxLevel] = useState(10)
  const [statPointsPerLevel, setStatPointsPerLevel] = useState(3)
  const [combatPresetId, setCombatPresetId] = useState('combat_v1_simple')
  const [xpEntries, setXpEntries] = useState<XpEntry[]>([{ level: '2', xp: '100' }, { level: '3', xp: '250' }])
  // Economy
  const [currencies, setCurrencies] = useState<{ id: string; name: string; iconUrl?: string }[]>([{ id: 'gold', name: 'Gold' }])
  // Abilities (optional catalog; classes reference by id)
  const [abilities, setAbilities] = useState<AbilityForm[]>([])
  // Classes
  const [classes, setClasses] = useState<ClassForm[]>([emptyClass()])
  // Creatures, items, quests, merchant, loot tables
  const [creatures, setCreatures] = useState<CreatureForm[]>([])
  const [items, setItems] = useState<ItemForm[]>([])
  const [quests, setQuests] = useState<QuestForm[]>([])
  const [listings, setListings] = useState<MerchantListing[]>([])
  const [lootTables, setLootTables] = useState<{ id: string; entries: LootEntryForm[] }[]>([])

  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showExampleModal, setShowExampleModal] = useState(true)

  const fillWithExampleData = () => {
    const ex = exampleFormState
    setVisibility(ex.visibility)
    setJoinCode(ex.joinCode)
    setPlayerCap(ex.playerCap)
    setMaxLevel(ex.maxLevel)
    setStatPointsPerLevel(ex.statPointsPerLevel)
    setCombatPresetId(ex.combatPresetId)
    setXpEntries(ex.xpEntries)
    setCurrencies(ex.currencies)
    setAbilities(ex.abilities)
    setClasses(ex.classes)
    setCreatures(ex.creatures)
    setItems(ex.items)
    setQuests(ex.quests)
    setListings(ex.listings)
    setLootTables(ex.lootTables)
    setShowExampleModal(false)
  }

  useEffect(() => {
    if (!fableId) return
    getFable(fableId)
      .then((f: Fable) => setFableName(f.name))
      .catch(() => setFableName(null))
  }, [fableId])

  // --- Build pack from form ---
  function buildPack(): IdleRpgPackV1 {
    const xpTable: Record<string, number> = { '1': 0 }
    xpEntries.forEach((e) => {
      const l = e.level.trim()
      const x = Number(e.xp.trim())
      if (l && !Number.isNaN(x)) xpTable[l] = x
    })

    const abilityList: Ability[] = abilities
      .filter((a) => a.id.trim() && a.name.trim())
      .map((a) => {
        const def: Ability = {
          id: a.id.trim(),
          name: a.name.trim(),
          abilityType: a.abilityType,
          ...(a.description.trim() ? { description: a.description.trim() } : {}),
          ...(a.iconUrl.trim() ? { iconUrl: a.iconUrl.trim() } : {}),
        }
        if (a.abilityType === 'primary') {
          def.primaryAttack = {
            delivery: a.delivery || 'melee',
            styleId: a.styleId || 'melee_slash',
          }
        }
        return def
      })

    const primaryAbilities = abilityList.filter((a) => a.abilityType === 'primary')
    const classBlocks: ClassBlock[] = classes
      .filter((c) => c.id.trim() && c.name.trim())
      .map((c) => {
        const primaryAbility = c.primaryAttackAbilityId.trim()
          ? primaryAbilities.find((a) => a.id === c.primaryAttackAbilityId.trim())
          : null
        const delivery = primaryAbility?.primaryAttack?.delivery ?? 'melee'
        const styleId = primaryAbility?.primaryAttack?.styleId ?? 'melee_slash'
        return {
          id: c.id.trim(),
          name: c.name.trim(),
          ...(c.description.trim() ? { description: c.description.trim() } : {}),
          ...(c.iconUrl.trim() ? { iconUrl: c.iconUrl.trim() } : {}),
          scaling: { damageMainStat: c.damageMainStat },
          primaryAttack: { delivery, styleId },
        slots: {
          attack_source: {
            required: c.attackRequired,
            allowEmpty: c.attackAllowEmpty,
            allowedTagsAny: parseTags(c.attackTags),
          },
          defense_layer: {
            required: c.defenseRequired,
            allowEmpty: c.defenseAllowEmpty,
            allowedTagsAny: parseTags(c.defenseTags),
          },
        },
        ...(c.regularAbilityIds.trim() || c.ultimateAbilityId.trim()
          ? {
              abilities: {
                regular: parseTags(c.regularAbilityIds),
                ultimate: c.ultimateAbilityId.trim() || null,
              },
            }
          : {}),
        }
      })

    const creatureList: CreatureTemplate[] = creatures
      .filter((c) => c.id.trim() && c.name.trim())
      .map((c) => ({
        id: c.id.trim(),
        name: c.name.trim(),
        role: c.role,
        level: Number(c.level) || 1,
        hp: Number(c.hp) || 1,
        ap: Number(c.ap) || 0,
        arm: Number(c.arm) || 0,
        ...(c.iconUrl.trim() ? { iconUrl: c.iconUrl.trim() } : {}),
        ...(c.tags.trim() ? { tags: parseTags(c.tags) } : {}),
      }))

    const itemList: ItemTemplate[] = items
      .filter((i) => i.id.trim() && i.name.trim())
      .map((i) => ({
        id: i.id.trim(),
        name: i.name.trim(),
        rarity: RARITY_NAME_TO_NUMBER[i.rarity] ?? 1,
        slot: i.slot,
        tags: parseTags(i.tags),
        stats: parseKeyValueNumber(i.stats),
        ...(i.iconUrl.trim() ? { iconUrl: i.iconUrl.trim() } : {}),
        ...(i.animationUrl.trim() ? { animationUrl: i.animationUrl.trim() } : {}),
        ...(i.projectileUrl.trim() ? { projectileUrl: i.projectileUrl.trim() } : {}),
        ...(i.impactUrl.trim() ? { impactUrl: i.impactUrl.trim() } : {}),
        ...(i.priceCurrencyId.trim() && i.priceAmount.trim()
          ? { price: { currencyId: i.priceCurrencyId.trim(), amount: Number(i.priceAmount) || 0 } }
          : {}),
      }))

    const questList: Quest[] = quests
      .filter((q) => q.id.trim() && q.name.trim() && q.creatureId.trim())
      .map((q) => ({
        id: q.id.trim(),
        name: q.name.trim(),
        creatureId: q.creatureId.trim(),
        durationSec: Number(q.durationSec) || 60,
        ...(q.iconUrl.trim() ? { iconUrl: q.iconUrl.trim() } : {}),
        rewards: {
          xp: Number(q.rewardXp) || 0,
          currency: parseKeyValueNumber(q.rewardCurrency),
          ...(q.lootTableId.trim() ? { lootTableId: q.lootTableId.trim() } : {}),
        },
      }))

    const lootTableList: LootTable[] = lootTables
      .filter((t) => t.id.trim())
      .map((t) => ({
        id: t.id.trim(),
        entries: t.entries
          .filter((e) => e.itemId.trim())
          .map((e) => ({
            itemId: e.itemId.trim(),
            weight: Number(e.weight) || 1,
            ...(e.classId.trim() ? { conditions: { classId: e.classId.trim() } } : {}),
          })),
      }))

    const validCurrencies = currencies.filter((c) => c.id.trim() && c.name.trim()).map((c) => ({
      id: c.id.trim(),
      name: c.name.trim(),
      ...(c.iconUrl?.trim() ? { iconUrl: c.iconUrl.trim() } : {}),
    }))

    return {
      version: 1,
      rules: { maxLevel, xpTable, combatPresetId, statPointsPerLevel },
      economy: { currencies: validCurrencies },
      ...(abilityList.length > 0 ? { abilities: abilityList } : {}),
      classes: classBlocks,
      creatures: creatureList,
      items: itemList,
      quests: questList,
      merchant: { listings },
      lootTables: lootTableList,
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!fableId) return
    const validCurrencies = currencies.filter((c) => c.id.trim() && c.name.trim())
    if (validCurrencies.length === 0) {
      setError('Add at least one currency (id and name required).')
      return
    }
    const validClasses = classes.filter((c) => c.id.trim() && c.name.trim())
    if (validClasses.length === 0) {
      setError('Add at least one class (id and name required).')
      return
    }
    setSubmitting(true)
    try {
      const pack = buildPack()
      await createIdleRpgRealm(fableId, {
        visibility,
        joinCode: joinCode.trim() || undefined,
        playerCap: playerCap > 0 ? playerCap : undefined,
        pack,
      })
      navigate(`/fables/${fableId}`)
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'data' in err
          ? String((err as { data?: unknown }).data)
          : err instanceof Error ? err.message : 'Failed to create Idle RPG realm.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!fableId) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
        <Container maxWidth="sm">
          <Typography color="text.secondary" gutterBottom>Missing fable.</Typography>
          <Button component={Link} to="/fables" variant="contained" color="primary">Back to Fables</Button>
        </Container>
      </Box>
    )
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Dialog open={showExampleModal} onClose={() => setShowExampleModal(false)}>
        <DialogTitle>Fill with example data?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Load a full example pack (private realm, 5 classes, 16 abilities, 50 creatures, 30 items, 30 quests, merchant &amp; loot tables) so you can review and edit before creating. Image URLs are left blank for you to add.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowExampleModal(false)} color="primary">Start empty</Button>
          <Button onClick={fillWithExampleData} variant="contained" color="primary">Fill with example data</Button>
        </DialogActions>
      </Dialog>
      <Container maxWidth="md">
        <Typography component="h1" variant="h4" color="primary.dark" fontWeight={700} gutterBottom>
          Create Idle RPG Realm
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {fableName ? `Add an Idle RPG realm for “${fableName}”.` : 'Add an Idle RPG realm for this fable.'}
          {' '}Fill rules, economy, classes (required), and optionally creatures, items, quests, merchant, and loot tables.
        </Typography>

        <form onSubmit={handleSubmit}>
          {/* Realm */}
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>Realm</Typography>
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Visibility</InputLabel>
              <Select value={visibility} label="Visibility" onChange={(e) => setVisibility(e.target.value as 'private' | 'public')}>
                <MenuItem value="private">Private</MenuItem>
                <MenuItem value="public">Public</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Join code (optional)" fullWidth size="small" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} sx={{ mb: 2 }} />
            <TextField label="Player cap" type="number" fullWidth size="small" value={playerCap} onChange={(e) => setPlayerCap(Number(e.target.value) || 0)} inputProps={{ min: 1, max: 100 }} />
          </Paper>

          {/* Accordion sections */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight={600}>Rules</Typography></AccordionSummary>
            <AccordionDetails>
              <TextField label="Max level" type="number" size="small" value={maxLevel} onChange={(e) => setMaxLevel(Number(e.target.value) || 1)} sx={{ mr: 2, width: 120 }} inputProps={{ min: 1 }} />
              <TextField label="Stat points per level" type="number" size="small" value={statPointsPerLevel} onChange={(e) => setStatPointsPerLevel(Number(e.target.value) || 0)} sx={{ mr: 2, width: 140 }} inputProps={{ min: 0 }} />
              <TextField label="Combat preset ID" size="small" value={combatPresetId} onChange={(e) => setCombatPresetId(e.target.value)} sx={{ width: 220 }} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>XP table (level → xp required)</Typography>
              {xpEntries.map((e, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField size="small" placeholder="Level" value={e.level} onChange={(ev) => setXpEntries((prev) => prev.map((x, j) => j === i ? { ...x, level: ev.target.value } : x))} sx={{ width: 80 }} />
                  <TextField size="small" placeholder="XP" value={e.xp} onChange={(ev) => setXpEntries((prev) => prev.map((x, j) => j === i ? { ...x, xp: ev.target.value } : x))} sx={{ width: 100 }} />
                  <IconButton size="small" onClick={() => setXpEntries((prev) => prev.filter((_, j) => j !== i))}>−</IconButton>
                </Box>
              ))}
              <Button type="button" size="small" variant="outlined" onClick={() => setXpEntries((prev) => [...prev, emptyXp()])}>+ Add level</Button>
            </AccordionDetails>
          </Accordion>

          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight={600}>Currencies (at least one)</Typography></AccordionSummary>
            <AccordionDetails>
              {currencies.map((c, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                  <TextField size="small" label="ID" value={c.id} onChange={(e) => setCurrencies((p) => p.map((x, j) => j === i ? { ...x, id: e.target.value } : x))} sx={{ width: 100 }} />
                  <TextField size="small" label="Name" value={c.name} onChange={(e) => setCurrencies((p) => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} sx={{ width: 120 }} />
                  <TextField size="small" label="Icon URL" value={c.iconUrl ?? ''} onChange={(e) => setCurrencies((p) => p.map((x, j) => j === i ? { ...x, iconUrl: e.target.value } : x))} sx={{ flex: 1 }} />
                  <IconButton size="small" color="error" onClick={() => setCurrencies((p) => p.filter((_, j) => j !== i))} disabled={currencies.length <= 1}>−</IconButton>
                </Box>
              ))}
              <Button type="button" size="small" variant="outlined" onClick={() => setCurrencies((p) => [...p, { id: '', name: '' }])}>+ Add currency</Button>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight={600}>Abilities</Typography></AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Define abilities here. Use type <strong>primary</strong> for basic attacks (set delivery &amp; style); then in Classes assign only primary abilities as the class primary attack. Regular/ultimate IDs are assigned in the class ability access fields.
              </Typography>
              {abilities.map((a, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mb: 1 }}>
                  <TextField size="small" label="ID" value={a.id} onChange={(e) => setAbilities((p) => p.map((x, j) => j === i ? { ...x, id: e.target.value } : x))} sx={{ width: 100 }} placeholder="fireball" />
                  <TextField size="small" label="Name" value={a.name} onChange={(e) => setAbilities((p) => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} sx={{ width: 120 }} />
                  <FormControl size="small" sx={{ minWidth: 110 }}>
                    <InputLabel>Type</InputLabel>
                    <Select value={a.abilityType} label="Type" onChange={(e) => setAbilities((p) => p.map((x, j) => j === i ? { ...x, abilityType: e.target.value as Ability['abilityType'] } : x))}>
                      {ABILITY_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                    </Select>
                  </FormControl>
                  {a.abilityType === 'primary' && (
                    <>
                      <FormControl size="small" sx={{ minWidth: 140 }}>
                        <InputLabel>Delivery</InputLabel>
                        <Select value={a.delivery} label="Delivery" onChange={(e) => setAbilities((p) => p.map((x, j) => j === i ? { ...x, delivery: e.target.value } : x))}>
                          {DELIVERIES.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                        </Select>
                      </FormControl>
                      <FormControl size="small" sx={{ minWidth: 140 }}>
                        <InputLabel>Style</InputLabel>
                        <Select value={a.styleId} label="Style" onChange={(e) => setAbilities((p) => p.map((x, j) => j === i ? { ...x, styleId: e.target.value } : x))}>
                          {STYLE_IDS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </>
                  )}
                  <TextField size="small" label="Description" value={a.description} onChange={(e) => setAbilities((p) => p.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} sx={{ flex: 1, minWidth: 140 }} />
                  <TextField size="small" label="Icon URL" value={a.iconUrl} onChange={(e) => setAbilities((p) => p.map((x, j) => j === i ? { ...x, iconUrl: e.target.value } : x))} sx={{ width: 140 }} />
                  <IconButton size="small" color="error" onClick={() => setAbilities((p) => p.filter((_, j) => j !== i))}>−</IconButton>
                </Box>
              ))}
              <Button type="button" size="small" variant="outlined" onClick={() => setAbilities((p) => [...p, emptyAbility()])}>+ Add ability</Button>
            </AccordionDetails>
          </Accordion>

          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight={600}>Classes (at least one)</Typography></AccordionSummary>
            <AccordionDetails>
              {classes.map((c, i) => (
                <Paper key={i} variant="outlined" sx={{ p: 2, mb: 2 }}>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    <TextField size="small" label="Class ID" value={c.id} onChange={(e) => setClasses((p) => p.map((x, j) => j === i ? { ...x, id: e.target.value } : x))} sx={{ width: 100 }} />
                    <TextField size="small" label="Name" value={c.name} onChange={(e) => setClasses((p) => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} sx={{ width: 120 }} />
                    <TextField size="small" label="Description" value={c.description} onChange={(e) => setClasses((p) => p.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} sx={{ flex: 1 }} />
                    <TextField size="small" label="Icon URL" value={c.iconUrl} onChange={(e) => setClasses((p) => p.map((x, j) => j === i ? { ...x, iconUrl: e.target.value } : x))} sx={{ width: 180 }} />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 1 }}>
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                      <InputLabel>Damage stat</InputLabel>
                      <Select value={c.damageMainStat} label="Damage stat" onChange={(e) => setClasses((p) => p.map((x, j) => j === i ? { ...x, damageMainStat: e.target.value } : x))}>
                        {STAT_IDS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 220 }}>
                      <InputLabel>Primary attack ability</InputLabel>
                      <Select
                        value={c.primaryAttackAbilityId || ''}
                        label="Primary attack ability"
                        onChange={(e) => setClasses((p) => p.map((x, j) => j === i ? { ...x, primaryAttackAbilityId: e.target.value } : x))}
                        displayEmpty
                      >
                        <MenuItem value="">— None (default melee) —</MenuItem>
                        {abilities.filter((a) => a.abilityType === 'primary' && a.id.trim()).map((ab) => (
                          <MenuItem key={ab.id} value={ab.id}>{ab.name || ab.id}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>Only abilities of type &quot;primary&quot; from the Abilities section can be assigned as the primary attack.</Typography>
                  <Typography variant="caption" color="text.secondary">Attack slot</Typography>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                    <TextField size="small" label="Allowed tags (comma)" value={c.attackTags} onChange={(e) => setClasses((p) => p.map((x, j) => j === i ? { ...x, attackTags: e.target.value } : x))} placeholder="weapon:sword" sx={{ flex: 1 }} />
                    <FormControlLabel control={<Checkbox size="small" checked={c.attackRequired} onChange={(e) => setClasses((p) => p.map((x, j) => j === i ? { ...x, attackRequired: e.target.checked } : x))} />} label="Required" />
                    <FormControlLabel control={<Checkbox size="small" checked={c.attackAllowEmpty} onChange={(e) => setClasses((p) => p.map((x, j) => j === i ? { ...x, attackAllowEmpty: e.target.checked } : x))} />} label="Allow empty" />
                  </Box>
                  <Typography variant="caption" color="text.secondary">Defense slot</Typography>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
                    <TextField size="small" label="Allowed tags (comma)" value={c.defenseTags} onChange={(e) => setClasses((p) => p.map((x, j) => j === i ? { ...x, defenseTags: e.target.value } : x))} placeholder="armor:light" sx={{ flex: 1 }} />
                    <FormControlLabel control={<Checkbox size="small" checked={c.defenseRequired} onChange={(e) => setClasses((p) => p.map((x, j) => j === i ? { ...x, defenseRequired: e.target.checked } : x))} />} label="Required" />
                    <FormControlLabel control={<Checkbox size="small" checked={c.defenseAllowEmpty} onChange={(e) => setClasses((p) => p.map((x, j) => j === i ? { ...x, defenseAllowEmpty: e.target.checked } : x))} />} label="Allow empty" />
                  </Box>
                  <Typography variant="caption" color="text.secondary">Ability access (IDs from Abilities section)</Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                    <TextField size="small" label="Regular ability IDs (comma)" value={c.regularAbilityIds} onChange={(e) => setClasses((p) => p.map((x, j) => j === i ? { ...x, regularAbilityIds: e.target.value } : x))} placeholder="fireball, heal" sx={{ minWidth: 220 }} />
                    <TextField size="small" label="Ultimate ability ID" value={c.ultimateAbilityId} onChange={(e) => setClasses((p) => p.map((x, j) => j === i ? { ...x, ultimateAbilityId: e.target.value } : x))} placeholder="ultimate_slash" sx={{ width: 160 }} />
                  </Box>
                  <IconButton size="small" color="error" sx={{ mt: 1 }} onClick={() => setClasses((p) => p.filter((_, j) => j !== i))} disabled={classes.length <= 1}>Remove class</IconButton>
                </Paper>
              ))}
              <Button type="button" size="small" variant="outlined" onClick={() => setClasses((p) => [...p, emptyClass()])}>+ Add class</Button>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight={600}>Creatures</Typography></AccordionSummary>
            <AccordionDetails>
              {creatures.map((c, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  <TextField size="small" label="ID" value={c.id} onChange={(e) => setCreatures((p) => p.map((x, j) => j === i ? { ...x, id: e.target.value } : x))} sx={{ width: 90 }} />
                  <TextField size="small" label="Name" value={c.name} onChange={(e) => setCreatures((p) => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} sx={{ width: 100 }} />
                  <Select size="small" value={c.role} onChange={(e) => setCreatures((p) => p.map((x, j) => j === i ? { ...x, role: e.target.value as 'quest' | 'boss' } : x))} sx={{ width: 90 }}>
                    <MenuItem value="quest">quest</MenuItem>
                    <MenuItem value="boss">boss</MenuItem>
                  </Select>
                  <TextField size="small" label="Level" type="number" value={c.level} onChange={(e) => setCreatures((p) => p.map((x, j) => j === i ? { ...x, level: e.target.value } : x))} sx={{ width: 70 }} />
                  <TextField size="small" label="HP" type="number" value={c.hp} onChange={(e) => setCreatures((p) => p.map((x, j) => j === i ? { ...x, hp: e.target.value } : x))} sx={{ width: 70 }} />
                  <TextField size="small" label="AP" type="number" value={c.ap} onChange={(e) => setCreatures((p) => p.map((x, j) => j === i ? { ...x, ap: e.target.value } : x))} sx={{ width: 70 }} />
                  <TextField size="small" label="Armor" type="number" value={c.arm} onChange={(e) => setCreatures((p) => p.map((x, j) => j === i ? { ...x, arm: e.target.value } : x))} sx={{ width: 70 }} />
                  <TextField size="small" label="Icon URL" value={c.iconUrl} onChange={(e) => setCreatures((p) => p.map((x, j) => j === i ? { ...x, iconUrl: e.target.value } : x))} sx={{ width: 140 }} />
                  <TextField size="small" label="Tags (comma)" value={c.tags} onChange={(e) => setCreatures((p) => p.map((x, j) => j === i ? { ...x, tags: e.target.value } : x))} sx={{ flex: 1 }} />
                  <IconButton size="small" color="error" onClick={() => setCreatures((p) => p.filter((_, j) => j !== i))}>−</IconButton>
                </Box>
              ))}
              <Button type="button" size="small" variant="outlined" onClick={() => setCreatures((p) => [...p, emptyCreature()])}>+ Add creature</Button>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight={600}>Items</Typography></AccordionSummary>
            <AccordionDetails>
              {items.map((item, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  <TextField size="small" label="ID" value={item.id} onChange={(e) => setItems((p) => p.map((x, j) => j === i ? { ...x, id: e.target.value } : x))} sx={{ width: 90 }} />
                  <TextField size="small" label="Name" value={item.name} onChange={(e) => setItems((p) => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} sx={{ width: 100 }} />
                  <Select size="small" value={item.rarity} onChange={(e) => setItems((p) => p.map((x, j) => j === i ? { ...x, rarity: e.target.value } : x))} sx={{ width: 100 }}>
                    {RARITIES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                  </Select>
                  <Select size="small" value={item.slot} onChange={(e) => setItems((p) => p.map((x, j) => j === i ? { ...x, slot: e.target.value } : x))} sx={{ width: 120 }}>
                    {SLOTS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </Select>
                  <TextField size="small" label="Tags (comma)" value={item.tags} onChange={(e) => setItems((p) => p.map((x, j) => j === i ? { ...x, tags: e.target.value } : x))} placeholder="weapon:sword" sx={{ width: 140 }} />
                  <TextField size="small" label="Stats (STR:2, ARM:5)" value={item.stats} onChange={(e) => setItems((p) => p.map((x, j) => j === i ? { ...x, stats: e.target.value } : x))} sx={{ width: 140 }} />
                  <TextField size="small" label="Icon URL" value={item.iconUrl} onChange={(e) => setItems((p) => p.map((x, j) => j === i ? { ...x, iconUrl: e.target.value } : x))} sx={{ width: 120 }} />
                  <TextField size="small" label="Animation URL (weapon tip-up)" value={item.animationUrl} onChange={(e) => setItems((p) => p.map((x, j) => j === i ? { ...x, animationUrl: e.target.value } : x))} placeholder="for projectile frame" sx={{ width: 140 }} />
                  <TextField size="small" label="Projectile URL" value={item.projectileUrl} onChange={(e) => setItems((p) => p.map((x, j) => j === i ? { ...x, projectileUrl: e.target.value } : x))} placeholder="custom projectile" sx={{ width: 120 }} />
                  <TextField size="small" label="Impact URL" value={item.impactUrl} onChange={(e) => setItems((p) => p.map((x, j) => j === i ? { ...x, impactUrl: e.target.value } : x))} placeholder="custom impact" sx={{ width: 120 }} />
                  <TextField size="small" label="Price currency" value={item.priceCurrencyId} onChange={(e) => setItems((p) => p.map((x, j) => j === i ? { ...x, priceCurrencyId: e.target.value } : x))} placeholder="gold" sx={{ width: 90 }} />
                  <TextField size="small" label="Price" type="number" value={item.priceAmount} onChange={(e) => setItems((p) => p.map((x, j) => j === i ? { ...x, priceAmount: e.target.value } : x))} sx={{ width: 70 }} />
                  <IconButton size="small" color="error" onClick={() => setItems((p) => p.filter((_, j) => j !== i))}>−</IconButton>
                </Box>
              ))}
              <Button type="button" size="small" variant="outlined" onClick={() => setItems((p) => [...p, emptyItem()])}>+ Add item</Button>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight={600}>Quests</Typography></AccordionSummary>
            <AccordionDetails>
              {quests.map((q, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  <TextField size="small" label="ID" value={q.id} onChange={(e) => setQuests((p) => p.map((x, j) => j === i ? { ...x, id: e.target.value } : x))} sx={{ width: 90 }} />
                  <TextField size="small" label="Name" value={q.name} onChange={(e) => setQuests((p) => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} sx={{ width: 120 }} />
                  <TextField size="small" label="Creature ID" value={q.creatureId} onChange={(e) => setQuests((p) => p.map((x, j) => j === i ? { ...x, creatureId: e.target.value } : x))} sx={{ width: 100 }} />
                  <TextField size="small" label="Duration (sec)" type="number" value={q.durationSec} onChange={(e) => setQuests((p) => p.map((x, j) => j === i ? { ...x, durationSec: e.target.value } : x))} sx={{ width: 100 }} />
                  <TextField size="small" label="Reward XP" type="number" value={q.rewardXp} onChange={(e) => setQuests((p) => p.map((x, j) => j === i ? { ...x, rewardXp: e.target.value } : x))} sx={{ width: 90 }} />
                  <TextField size="small" label="Reward currency (gold:25)" value={q.rewardCurrency} onChange={(e) => setQuests((p) => p.map((x, j) => j === i ? { ...x, rewardCurrency: e.target.value } : x))} sx={{ width: 140 }} />
                  <TextField size="small" label="Loot table ID" value={q.lootTableId} onChange={(e) => setQuests((p) => p.map((x, j) => j === i ? { ...x, lootTableId: e.target.value } : x))} sx={{ width: 100 }} />
                  <TextField size="small" label="Icon URL" value={q.iconUrl} onChange={(e) => setQuests((p) => p.map((x, j) => j === i ? { ...x, iconUrl: e.target.value } : x))} sx={{ width: 120 }} />
                  <IconButton size="small" color="error" onClick={() => setQuests((p) => p.filter((_, j) => j !== i))}>−</IconButton>
                </Box>
              ))}
              <Button type="button" size="small" variant="outlined" onClick={() => setQuests((p) => [...p, emptyQuest()])}>+ Add quest</Button>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight={600}>Merchant listings</Typography></AccordionSummary>
            <AccordionDetails>
              {listings.map((l, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField size="small" label="Item ID" value={l.itemId} onChange={(e) => setListings((p) => p.map((x, j) => j === i ? { ...x, itemId: e.target.value } : x))} sx={{ width: 120 }} />
                  <TextField size="small" label="Currency ID" value={l.currencyId} onChange={(e) => setListings((p) => p.map((x, j) => j === i ? { ...x, currencyId: e.target.value } : x))} sx={{ width: 100 }} />
                  <TextField size="small" label="Price" type="number" value={l.price} onChange={(e) => setListings((p) => p.map((x, j) => j === i ? { ...x, price: Number(e.target.value) || 0 } : x))} sx={{ width: 90 }} />
                  <IconButton size="small" color="error" onClick={() => setListings((p) => p.filter((_, j) => j !== i))}>−</IconButton>
                </Box>
              ))}
              <Button type="button" size="small" variant="outlined" onClick={() => setListings((p) => [...p, { itemId: '', currencyId: '', price: 0 }])}>+ Add listing</Button>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight={600}>Loot tables</Typography></AccordionSummary>
            <AccordionDetails>
              {lootTables.map((t, ti) => (
                <Paper key={ti} variant="outlined" sx={{ p: 2, mb: 2 }}>
                  <TextField size="small" label="Loot table ID" value={t.id} onChange={(e) => setLootTables((p) => p.map((x, j) => j === ti ? { ...x, id: e.target.value } : x))} sx={{ width: 180, mr: 2 }} />
                  <IconButton size="small" color="error" onClick={() => setLootTables((p) => p.filter((_, j) => j !== ti))}>Remove table</IconButton>
                  {t.entries.map((e, ei) => (
                    <Box key={ei} sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <TextField size="small" label="Item ID" value={e.itemId} onChange={(ev) => setLootTables((p) => p.map((tbl, j) => j !== ti ? tbl : { ...tbl, entries: tbl.entries.map((ent, k) => k === ei ? { ...ent, itemId: ev.target.value } : ent) }))} sx={{ width: 120 }} />
                      <TextField size="small" label="Weight" type="number" value={e.weight} onChange={(ev) => setLootTables((p) => p.map((tbl, j) => j !== ti ? tbl : { ...tbl, entries: tbl.entries.map((ent, k) => k === ei ? { ...ent, weight: ev.target.value } : ent) }))} sx={{ width: 80 }} />
                      <TextField size="small" label="Class ID (optional)" value={e.classId} onChange={(ev) => setLootTables((p) => p.map((tbl, j) => j !== ti ? tbl : { ...tbl, entries: tbl.entries.map((ent, k) => k === ei ? { ...ent, classId: ev.target.value } : ent) }))} sx={{ width: 100 }} />
                      <IconButton size="small" onClick={() => setLootTables((p) => p.map((tbl, j) => j !== ti ? tbl : { ...tbl, entries: tbl.entries.filter((_, k) => k !== ei) }))}>−</IconButton>
                    </Box>
                  ))}
                  <Button type="button" size="small" onClick={() => setLootTables((p) => p.map((tbl, j) => j !== ti ? tbl : { ...tbl, entries: [...tbl.entries, emptyLootEntry()] }))}>+ Add entry</Button>
                  {ti === lootTables.length - 1 && (
                    <Button type="button" size="small" variant="outlined" sx={{ ml: 2 }} onClick={() => setLootTables((p) => [...p, { id: '', entries: [emptyLootEntry()] }])}>+ Add loot table</Button>
                  )}
                </Paper>
              ))}
              {lootTables.length === 0 && (
                <Button type="button" size="small" variant="outlined" onClick={() => setLootTables([{ id: '', entries: [emptyLootEntry()] }])}>+ Add loot table</Button>
              )}
            </AccordionDetails>
          </Accordion>

          {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
            <Button type="submit" variant="contained" color="primary" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create realm'}
            </Button>
            <Button component={Link} to={`/fables/${fableId}`} variant="outlined" color="primary" disabled={submitting}>Cancel</Button>
          </Box>
        </form>
      </Container>
    </Box>
  )
}
