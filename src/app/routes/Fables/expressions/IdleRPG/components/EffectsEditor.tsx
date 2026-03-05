import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import FormControl from '@mui/material/FormControl'
import IconButton from '@mui/material/IconButton'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

type SourceKind = 'main_stat' | 'derived_stat' | 'equipped_weapon_damage' | 'equipped_protective_armor'
type EffectKind =
  | 'damage'
  | 'heal'
  | 'apply_status'
  | 'avoid'
  | 'execute'
  | 'lifesteal'
  | 'stun'
  | 'anti_heal'
  | 'barrier'
  | 'stat_modifiers'
  | 'derived_stat_modifiers'
  | 'dispel'

type EffectTarget = 'self' | 'enemy'
type DispelFilter = 'all' | 'buff' | 'debuff'

export type EffectScaleForm = {
  sourceKind: SourceKind
  sourceStatId: string
  percent: string
}

export type EffectFormRow = {
  kind: EffectKind
  target: EffectTarget
  amount: string
  percentage: string
  durationTurns: string
  lifestealPercent: string
  statusEffectId: string
  dispelFilter: DispelFilter
  statModifiers: string
  derivedStatModifiers: string
  scalingTerms: EffectScaleForm[]
}

export type StatusEffectOption = { id: string; name: string }

const EFFECT_KINDS: EffectKind[] = [
  'damage',
  'heal',
  'apply_status',
  'avoid',
  'execute',
  'lifesteal',
  'stun',
  'anti_heal',
  'barrier',
  'stat_modifiers',
  'derived_stat_modifiers',
  'dispel',
]

const DERIVED_STAT_SOURCE_IDS = [
  'max_resource_amount',
  'resource_regeneration',
  'max_hp',
  'hp_regeneration',
  'avoid_chance',
  'damage_resistance',
  'critical_hit_chance',
  'critical_hit_damage',
  'cooldown_reduction',
]

export function createEmptyScaleTerm(fallbackMainStatId = 'STR'): EffectScaleForm {
  return { sourceKind: 'main_stat', sourceStatId: fallbackMainStatId, percent: '' }
}

export function createEmptyEffectRow(fallbackMainStatId = 'STR'): EffectFormRow {
  return {
    kind: 'damage',
    target: 'enemy',
    amount: '',
    percentage: '',
    durationTurns: '',
    lifestealPercent: '',
    statusEffectId: '',
    dispelFilter: 'debuff',
    statModifiers: '',
    derivedStatModifiers: '',
    scalingTerms: [createEmptyScaleTerm(fallbackMainStatId)],
  }
}

function serializeNumberMap(input: Record<string, number> | undefined): string {
  if (!input) return ''
  return Object.entries(input)
    .filter(([, v]) => Number.isFinite(v) && v !== 0)
    .map(([k, v]) => `${k}:${v}`)
    .join(', ')
}

function parseNumberMap(input: string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const pair of (input || '').split(',').map((x) => x.trim()).filter(Boolean)) {
    const idx = pair.indexOf(':')
    if (idx <= 0) continue
    const key = pair.slice(0, idx).trim()
    const value = Number(pair.slice(idx + 1).trim())
    if (!key || Number.isNaN(value)) continue
    out[key] = value
  }
  return out
}

export function hydrateEffectRows(effects: any[] | undefined, fallbackMainStatId: string): EffectFormRow[] {
  const rows = (effects ?? []).map((effect) => ({
    kind: (effect?.kind ?? 'damage') as EffectKind,
    target: (effect?.target ?? 'enemy') as EffectTarget,
    amount: effect?.amount != null ? String(effect.amount) : '',
    percentage: effect?.percentage != null ? String(effect.percentage) : '',
    durationTurns: effect?.durationTurns != null ? String(effect.durationTurns) : '',
    lifestealPercent: effect?.lifestealPercent != null ? String(effect.lifestealPercent) : '',
    statusEffectId: effect?.statusEffectId ?? effect?.statusEffect?.id ?? '',
    dispelFilter: (effect?.dispelFilter ?? 'debuff') as DispelFilter,
    statModifiers: serializeNumberMap(effect?.statModifiers),
    derivedStatModifiers: serializeNumberMap(effect?.derivedStatModifiers),
    scalingTerms: (effect?.scalingTerms ?? []).map((term: any) => ({
      sourceKind: term.source.kind as SourceKind,
      sourceStatId:
        term.source.kind === 'main_stat' || term.source.kind === 'derived_stat'
          ? term.source.statId
          : fallbackMainStatId,
      percent: String(term.percent ?? 0),
    })),
  }))
  return rows.length > 0 ? rows : [createEmptyEffectRow(fallbackMainStatId)]
}

export function buildEffectPayload(rows: EffectFormRow[]): any[] {
  return rows
    .map((row) => {
      const out: any = { kind: row.kind, target: row.target }
      if (row.amount.trim() !== '' && !Number.isNaN(Number(row.amount))) out.amount = Number(row.amount)
      if (row.percentage.trim() !== '' && !Number.isNaN(Number(row.percentage))) out.percentage = Number(row.percentage)
      if (row.durationTurns.trim() !== '' && !Number.isNaN(Number(row.durationTurns))) out.durationTurns = Number(row.durationTurns)
      if (row.lifestealPercent.trim() !== '' && !Number.isNaN(Number(row.lifestealPercent))) out.lifestealPercent = Number(row.lifestealPercent)
      if (row.statusEffectId.trim()) out.statusEffectId = row.statusEffectId.trim()
      if (row.kind === 'dispel') out.dispelFilter = row.dispelFilter

      const scalingTerms = row.scalingTerms
        .filter((t) => t.percent.trim() !== '' && !Number.isNaN(Number(t.percent)))
        .map((t) => ({
          percent: Number(t.percent),
          source:
            t.sourceKind === 'main_stat'
              ? { kind: 'main_stat' as const, statId: t.sourceStatId.trim() || 'STR' }
              : t.sourceKind === 'derived_stat'
                ? { kind: 'derived_stat' as const, statId: t.sourceStatId.trim() || 'avoid_chance' }
                : t.sourceKind === 'equipped_weapon_damage'
                  ? { kind: 'equipped_weapon_damage' as const }
                  : { kind: 'equipped_protective_armor' as const },
        }))
      if (scalingTerms.length > 0) out.scalingTerms = scalingTerms

      if (row.kind === 'stat_modifiers') {
        const parsed = parseNumberMap(row.statModifiers)
        if (Object.keys(parsed).length > 0) out.statModifiers = parsed
      }
      if (row.kind === 'derived_stat_modifiers') {
        const parsed = parseNumberMap(row.derivedStatModifiers)
        if (Object.keys(parsed).length > 0) out.derivedStatModifiers = parsed
      }

      return out
    })
    .filter((effect) => !(effect.kind === 'apply_status' && !effect.statusEffectId))
}

type Props = {
  effects: EffectFormRow[]
  onChange: (next: EffectFormRow[]) => void
  mainStatIds: string[]
  fallbackMainStatId: string
  statusEffectOptions?: StatusEffectOption[]
  allowApplyStatus?: boolean
}

export default function EffectsEditor({
  effects,
  onChange,
  mainStatIds,
  fallbackMainStatId,
  statusEffectOptions = [],
  allowApplyStatus = true,
}: Props) {
  const kinds = allowApplyStatus ? EFFECT_KINDS : EFFECT_KINDS.filter((k) => k !== 'apply_status')
  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Typography variant="caption" color="text.secondary">Effects (multi-row)</Typography>
      {effects.map((effect, effectIndex) => (
        <Paper key={effectIndex} variant="outlined" sx={{ p: 1, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Kind</InputLabel>
            <Select
              value={effect.kind}
              label="Kind"
              onChange={(e) => onChange(effects.map((x, j) => j === effectIndex ? { ...x, kind: e.target.value as EffectKind } : x))}
            >
              {kinds.map((kind) => <MenuItem key={kind} value={kind}>{kind}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Target</InputLabel>
            <Select
              value={effect.target}
              label="Target"
              onChange={(e) => onChange(effects.map((x, j) => j === effectIndex ? { ...x, target: e.target.value as EffectTarget } : x))}
            >
              <MenuItem value="enemy">enemy</MenuItem>
              <MenuItem value="self">self</MenuItem>
            </Select>
          </FormControl>
          <TextField size="small" label="Amount" type="number" value={effect.amount} onChange={(e) => onChange(effects.map((x, j) => j === effectIndex ? { ...x, amount: e.target.value } : x))} sx={{ width: 100 }} />
          <TextField size="small" label="%" type="number" value={effect.percentage} onChange={(e) => onChange(effects.map((x, j) => j === effectIndex ? { ...x, percentage: e.target.value } : x))} sx={{ width: 90 }} />
          <TextField size="small" label="Duration turns" type="number" value={effect.durationTurns} onChange={(e) => onChange(effects.map((x, j) => j === effectIndex ? { ...x, durationTurns: e.target.value } : x))} sx={{ width: 130 }} />
          {effect.kind === 'lifesteal' && (
            <TextField size="small" label="Lifesteal %" type="number" value={effect.lifestealPercent} onChange={(e) => onChange(effects.map((x, j) => j === effectIndex ? { ...x, lifestealPercent: e.target.value } : x))} sx={{ width: 110 }} />
          )}
          {effect.kind === 'apply_status' && (
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Status effect</InputLabel>
              <Select
                value={effect.statusEffectId}
                label="Status effect"
                onChange={(e) => onChange(effects.map((x, j) => j === effectIndex ? { ...x, statusEffectId: e.target.value } : x))}
                displayEmpty
              >
                <MenuItem value="">-- Select --</MenuItem>
                {statusEffectOptions.map((opt) => (
                  <MenuItem key={opt.id} value={opt.id}>{opt.name || opt.id}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          {effect.kind === 'dispel' && (
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Filter</InputLabel>
              <Select
                value={effect.dispelFilter}
                label="Filter"
                onChange={(e) => onChange(effects.map((x, j) => j === effectIndex ? { ...x, dispelFilter: e.target.value as DispelFilter } : x))}
              >
                <MenuItem value="debuff">debuff</MenuItem>
                <MenuItem value="buff">buff</MenuItem>
                <MenuItem value="all">all</MenuItem>
              </Select>
            </FormControl>
          )}
          {effect.kind === 'stat_modifiers' && (
            <TextField
              size="small"
              label="Stat modifiers (STR:10, DEX:-5)"
              value={effect.statModifiers}
              onChange={(e) => onChange(effects.map((x, j) => j === effectIndex ? { ...x, statModifiers: e.target.value } : x))}
              sx={{ minWidth: 260, flex: 1 }}
            />
          )}
          {effect.kind === 'derived_stat_modifiers' && (
            <TextField
              size="small"
              label="Derived modifiers (critical_hit_chance:10)"
              value={effect.derivedStatModifiers}
              onChange={(e) => onChange(effects.map((x, j) => j === effectIndex ? { ...x, derivedStatModifiers: e.target.value } : x))}
              sx={{ minWidth: 300, flex: 1 }}
            />
          )}
          <IconButton size="small" color="error" onClick={() => onChange(effects.filter((_, j) => j !== effectIndex))}>-</IconButton>
          <Typography variant="caption" color="text.secondary" sx={{ width: '100%' }}>Scaling terms</Typography>
          {effect.scalingTerms.map((term, termIndex) => (
            <Box key={termIndex} sx={{ width: '100%', display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Source</InputLabel>
                <Select
                  value={term.sourceKind}
                  label="Source"
                  onChange={(e) => onChange(effects.map((x, j) => j !== effectIndex ? x : ({
                    ...x,
                    scalingTerms: x.scalingTerms.map((sx, sj) => sj === termIndex ? { ...sx, sourceKind: e.target.value as SourceKind } : sx),
                  })))}
                >
                  <MenuItem value="main_stat">Main stat</MenuItem>
                  <MenuItem value="derived_stat">Derived stat</MenuItem>
                  <MenuItem value="equipped_weapon_damage">Equipped weapon damage</MenuItem>
                  <MenuItem value="equipped_protective_armor">Equipped protective armor</MenuItem>
                </Select>
              </FormControl>
              {term.sourceKind === 'main_stat' && (
                <FormControl size="small" sx={{ minWidth: 130 }}>
                  <InputLabel>Main stat</InputLabel>
                  <Select
                    value={term.sourceStatId}
                    label="Main stat"
                    onChange={(e) => onChange(effects.map((x, j) => j !== effectIndex ? x : ({
                      ...x,
                      scalingTerms: x.scalingTerms.map((sx, sj) => sj === termIndex ? { ...sx, sourceStatId: e.target.value } : sx),
                    })))}
                  >
                    {mainStatIds.map((statId) => <MenuItem key={statId} value={statId}>{statId}</MenuItem>)}
                  </Select>
                </FormControl>
              )}
              {term.sourceKind === 'derived_stat' && (
                <FormControl size="small" sx={{ minWidth: 190 }}>
                  <InputLabel>Derived stat</InputLabel>
                  <Select
                    value={term.sourceStatId}
                    label="Derived stat"
                    onChange={(e) => onChange(effects.map((x, j) => j !== effectIndex ? x : ({
                      ...x,
                      scalingTerms: x.scalingTerms.map((sx, sj) => sj === termIndex ? { ...sx, sourceStatId: e.target.value } : sx),
                    })))}
                  >
                    {DERIVED_STAT_SOURCE_IDS.map((statId) => <MenuItem key={statId} value={statId}>{statId}</MenuItem>)}
                  </Select>
                </FormControl>
              )}
              <TextField size="small" label="Percent" type="number" value={term.percent} onChange={(e) => onChange(effects.map((x, j) => j !== effectIndex ? x : ({
                ...x,
                scalingTerms: x.scalingTerms.map((sx, sj) => sj === termIndex ? { ...sx, percent: e.target.value } : sx),
              })))} sx={{ width: 120 }} />
              <IconButton size="small" color="error" onClick={() => onChange(effects.map((x, j) => j !== effectIndex ? x : { ...x, scalingTerms: x.scalingTerms.filter((_, sj) => sj !== termIndex) }))}>-</IconButton>
            </Box>
          ))}
          <Button type="button" size="small" variant="outlined" onClick={() => onChange(effects.map((x, j) => j !== effectIndex ? x : { ...x, scalingTerms: [...x.scalingTerms, createEmptyScaleTerm(fallbackMainStatId)] }))}>+ Add scaling term</Button>
        </Paper>
      ))}
      <Button type="button" size="small" variant="outlined" onClick={() => onChange([...(effects ?? []), createEmptyEffectRow(fallbackMainStatId)])}>+ Add effect</Button>
    </Box>
  )
}
