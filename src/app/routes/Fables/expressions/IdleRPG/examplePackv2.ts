/**
 * REVISED ARCHITECTURE PACK: FableHub MVP (Level 1-20)
 * * Implements:
 * 1. Polynomial XP Curve (Level ^ 2.1)
 * 2. The "60/40" Idle/Active Split via Quest Durations
 * 3. Quadratic Economy Sinks (Item Costs)
 * 4. "Gear Check" Boss Scaling
 */

export type ExampleXpEntry = { level: string; xp: string }
export type ExampleAbilityForm = {
  id: string
  name: string
  abilityType: 'primary' | 'regular' | 'passive' | 'ultimate'
  description: string
  iconUrl: string
  delivery: string
  styleId: string
}
export type ExampleClassForm = {
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
export type ExampleCreatureForm = {
  id: string
  name: string
  role: 'quest' | 'boss'
  level: string
  hp: string
  ap: string
  arm: string
  iconUrl: string
  tags: string
}
export type ExampleItemForm = {
  id: string
  name: string
  rarity: string
  slot: string
  tags: string
  stats: string
  iconUrl: string
  priceCurrencyId: string
  priceAmount: string
}
export type ExampleQuestForm = {
  id: string
  name: string
  creatureId: string
  durationSec: string
  iconUrl: string
  rewardXp: string
  rewardCurrency: string
  lootTableId: string
}
export type ExampleLootEntryForm = { itemId: string; weight: string; classId: string }

export interface ExampleFormState {
  visibility: 'private' | 'public'
  joinCode: string
  playerCap: number
  maxLevel: number
  combatPresetId: string
  statPointsPerLevel: number
  xpEntries: ExampleXpEntry[]
  currencies: { id: string; name: string; iconUrl?: string }[]
  abilities: ExampleAbilityForm[]
  classes: ExampleClassForm[]
  creatures: ExampleCreatureForm[]
  items: ExampleItemForm[]
  quests: ExampleQuestForm[]
  listings: { itemId: string; currencyId: string; price: number }[]
  lootTables: { id: string; entries: ExampleLootEntryForm[] }[]
}

// --- 1. PROGRESSION CURVE (Matches Report Table) ---
const xpEntries: ExampleXpEntry[] = [
  { level: '2', xp: '100' },      // Tutorial Phase
  { level: '3', xp: '448' },
  { level: '4', xp: '1172' },
  { level: '5', xp: '2384' },     // 1st Pinch Point
  { level: '6', xp: '4195' },
  { level: '7', xp: '6705' },
  { level: '8', xp: '10008' },
  { level: '9', xp: '14193' },
  { level: '10', xp: '19345' },   // Mid-Game Grind
  { level: '11', xp: '25545' },
  { level: '12', xp: '32871' },
  { level: '13', xp: '41398' },
  { level: '14', xp: '51200' },
  { level: '15', xp: '62348' },   // Late Game Wall
  { level: '16', xp: '74911' },
  { level: '17', xp: '88958' },
  { level: '18', xp: '104555' },
  { level: '19', xp: '121768' },
  { level: '20', xp: '140662' },  // Level Cap
]

// --- 2. ABILITIES (Standardized for deterministic combat) ---
const abilities: ExampleAbilityForm[] = [
  { id: 'warlord_slam', name: 'Iron Judgment', abilityType: 'primary', description: 'Heavy physical damage based on STR.', iconUrl: '', delivery: 'melee', styleId: 'melee_slash' },
  { id: 'sorcerer_bolt', name: 'Aether Bolt', abilityType: 'primary', description: 'Bypasses 50% of Enemy Armor.', iconUrl: '', delivery: 'projectile_straight', styleId: 'projectile_bolt' },
  { id: 'warrior_slash', name: 'Vanguard Strike', abilityType: 'primary', description: 'Standard physical attack.', iconUrl: '', delivery: 'melee', styleId: 'melee_slash' },
  { id: 'hunter_shot', name: 'Heartseeker', abilityType: 'primary', description: 'High Crit Chance projectile.', iconUrl: '', delivery: 'projectile_straight', styleId: 'projectile_arrow' },
  { id: 'knifeman_stab', name: 'Kidney Shot', abilityType: 'primary', description: 'Fast attack scaling with DEX.', iconUrl: '', delivery: 'melee', styleId: 'melee_slash' },
  // Regulars
  { id: 'skill_rally', name: 'Commanding Shout', abilityType: 'regular', description: 'Boosts defense for next turn.', iconUrl: '', delivery: 'instant', styleId: 'instant_buff' },
  { id: 'skill_fireball', name: 'Pyroclasm', abilityType: 'regular', description: 'High damage, low accuracy.', iconUrl: '', delivery: 'projectile_arced', styleId: 'projectile_fireball' },
  { id: 'skill_trap', name: 'Snare', abilityType: 'regular', description: 'Lowers enemy AP.', iconUrl: '', delivery: 'instant', styleId: 'instant_debuff' },
  // Ultimates
  { id: 'ult_warlord', name: 'Total War', abilityType: 'ultimate', description: 'Massive Dmg + Self Heal.', iconUrl: '', delivery: 'melee', styleId: 'melee_heavy' },
  { id: 'ult_mage', name: 'Apocalypse', abilityType: 'ultimate', description: 'Deals 300% INT damage.', iconUrl: '', delivery: 'projectile_arced', styleId: 'projectile_meteor' },
]

// --- 3. CLASSES (Stat Weights & Archetypes) ---
const classes: ExampleClassForm[] = [
  {
    id: 'warlord',
    name: 'Warlord',
    description: 'Tank/DPS Hybrid. High HP multiplier. Uses Flails.',
    iconUrl: '',
    damageMainStat: 'STR',
    primaryAttackAbilityId: 'warlord_slam',
    attackTags: 'weapon:flail',
    attackRequired: true,
    attackAllowEmpty: false,
    defenseTags: 'armor:heavy,armor:shield',
    defenseRequired: true,
    defenseAllowEmpty: false,
    regularAbilityIds: 'skill_rally',
    ultimateAbilityId: 'ult_warlord',
  },
  {
    id: 'sorcerer',
    name: 'Sorcerer',
    description: 'Glass Cannon. Low HP, ignores Armor. Uses Staffs.',
    iconUrl: '',
    damageMainStat: 'INT',
    primaryAttackAbilityId: 'sorcerer_bolt',
    attackTags: 'weapon:staff,weapon:wand',
    attackRequired: true,
    attackAllowEmpty: false,
    defenseTags: 'armor:cloth',
    defenseRequired: false,
    defenseAllowEmpty: true,
    regularAbilityIds: 'skill_fireball',
    ultimateAbilityId: 'ult_mage',
  },
  {
    id: 'hunter',
    name: 'Hunter',
    description: 'Evasion Tank. Avoids damage rather than mitigating it.',
    iconUrl: '',
    damageMainStat: 'DEX',
    primaryAttackAbilityId: 'hunter_shot',
    attackTags: 'weapon:bow,weapon:dagger',
    attackRequired: true,
    attackAllowEmpty: false,
    defenseTags: 'armor:light',
    defenseRequired: false,
    defenseAllowEmpty: true,
    regularAbilityIds: 'skill_trap',
    ultimateAbilityId: 'ult_warlord', // Placeholder reuse
  },
]

// --- 4. ECONOMY & ITEMS (The "Sink" Logic) ---
// Tier 1 (Lvl 1-4) | Tier 2 (Lvl 5-9) | Tier 3 (Lvl 10-14) | Tier 4 (Lvl 15-19) | Tier 5 (Lvl 20)
const itemDefs = [
  // --- TIER 1: Rusty/Common (Entry Level) ---
  { id: 'wep_t1_flail', name: 'Rusted Flail', rarity: 'common', slot: 'attack_source', tags: 'weapon:flail', stats: 'STR:3', price: 50 },
  { id: 'wep_t1_staff', name: 'Gnarled Branch', rarity: 'common', slot: 'attack_source', tags: 'weapon:staff', stats: 'INT:3', price: 50 },
  { id: 'wep_t1_bow', name: 'Cracked Shortbow', rarity: 'common', slot: 'attack_source', tags: 'weapon:bow', stats: 'DEX:3', price: 50 },
  { id: 'arm_t1_shield', name: 'Pot Lid', rarity: 'common', slot: 'defense_layer', tags: 'armor:shield', stats: 'ARM:2', price: 40 },
  { id: 'arm_t1_cloth', name: 'Tatters', rarity: 'common', slot: 'defense_layer', tags: 'armor:cloth', stats: 'HP:10', price: 30 },

  // --- TIER 2: Iron/Uncommon (First Boss Prep) ---
  { id: 'wep_t2_flail', name: 'Iron Flail', rarity: 'uncommon', slot: 'attack_source', tags: 'weapon:flail', stats: 'STR:8', price: 350 },
  { id: 'wep_t2_staff', name: 'Apprentice Staff', rarity: 'uncommon', slot: 'attack_source', tags: 'weapon:staff', stats: 'INT:8', price: 350 },
  { id: 'arm_t2_plate', name: 'Iron Breastplate', rarity: 'uncommon', slot: 'defense_layer', tags: 'armor:heavy', stats: 'ARM:8', price: 400 },
  
  // --- TIER 3: Steel/Rare (Mid-Game Sink) ---
  { id: 'wep_t3_flail', name: 'Tempered Flail', rarity: 'rare', slot: 'attack_source', tags: 'weapon:flail', stats: 'STR:18', price: 1200 },
  { id: 'wep_t3_staff', name: 'Quartz Staff', rarity: 'rare', slot: 'attack_source', tags: 'weapon:staff', stats: 'INT:18', price: 1200 },
  { id: 'acc_t3_ring', name: 'Ring of Vigor', rarity: 'rare', slot: 'defense_layer', tags: 'accessory', stats: 'HP:100', price: 1500 },

  // --- TIER 4: Mithril/Epic (The Wall) ---
  { id: 'wep_t4_flail', name: 'Mithril Morningstar', rarity: 'epic', slot: 'attack_source', tags: 'weapon:flail', stats: 'STR:35', price: 5500 },
  { id: 'wep_t4_bow', name: 'Elven Recurve', rarity: 'epic', slot: 'attack_source', tags: 'weapon:bow', stats: 'DEX:35', price: 5500 },
  { id: 'arm_t4_plate', name: 'Mithril Cuirass', rarity: 'epic', slot: 'defense_layer', tags: 'armor:heavy', stats: 'ARM:25,HP:200', price: 6000 },

  // --- TIER 5: Dragon/Legendary (Endgame Chase) ---
  { id: 'wep_t5_legend', name: 'Breath of the Dragon', rarity: 'legendary', slot: 'attack_source', tags: 'weapon:staff', stats: 'INT:60,LCK:10', price: 25000 },
  { id: 'wep_t5_wep', name: 'Void Cleaver', rarity: 'legendary', slot: 'attack_source', tags: 'weapon:flail', stats: 'STR:65', price: 25000 },
  { id: 'acc_t5_amulet', name: 'Amulet of Kings', rarity: 'legendary', slot: 'defense_layer', tags: 'accessory', stats: 'ARM:15,HP:500', price: 30000 },
]

const items: ExampleItemForm[] = itemDefs.map((it) => ({
  ...it,
  iconUrl: '',
  priceCurrencyId: 'gold',
  priceAmount: String(it.price),
}))

// --- 5. CREATURES (Mathematical Scaling & Boss Checks) ---
// Formula: HP scales quadratically to prevent 1-shotting. AP scales linearly.
const creatures: ExampleCreatureForm[] = [
  // Lvl 1-4: Rats & Bandits
  { id: 'mob_01', name: 'Cellar Rat', role: 'quest', level: '1', hp: '45', ap: '3', arm: '0', iconUrl: '', tags: 'beast' },
  { id: 'mob_02', name: 'Starving Bandit', role: 'quest', level: '2', hp: '65', ap: '5', arm: '1', iconUrl: '', tags: 'humanoid' },
  { id: 'mob_03', name: 'Wolf', role: 'quest', level: '3', hp: '90', ap: '8', arm: '2', iconUrl: '', tags: 'beast' },
  
  // BOSS 1 (Level 5 Check)
  { id: 'boss_05', name: 'Broodmother', role: 'boss', level: '5', hp: '450', ap: '15', arm: '5', iconUrl: '', tags: 'beast' },

  // Lvl 6-9: Undead
  { id: 'mob_06', name: 'Skeleton Warrior', role: 'quest', level: '7', hp: '275', ap: '18', arm: '10', iconUrl: '', tags: 'undead' },
  { id: 'mob_08', name: 'Ghoul', role: 'quest', level: '9', hp: '425', ap: '25', arm: '12', iconUrl: '', tags: 'undead' },

  // BOSS 2 (Level 10 Check)
  { id: 'boss_10', name: 'The Necrolord', role: 'boss', level: '10', hp: '1500', ap: '40', arm: '20', iconUrl: '', tags: 'undead' },

  // Lvl 11-14: Elementals
  { id: 'mob_12', name: 'Earth Elemental', role: 'quest', level: '12', hp: '725', ap: '50', arm: '30', iconUrl: '', tags: 'elemental' },
  { id: 'mob_14', name: 'Flame Spirit', role: 'quest', level: '14', hp: '975', ap: '65', arm: '15', iconUrl: '', tags: 'elemental' },

  // BOSS 3 (Level 15 Check)
  { id: 'boss_15', name: 'Abyssal Titan', role: 'boss', level: '15', hp: '4000', ap: '90', arm: '50', iconUrl: '', tags: 'elemental' },

  // Lvl 16-19: Dragonsworn
  { id: 'mob_17', name: 'Dragon Cultist', role: 'quest', level: '17', hp: '1425', ap: '100', arm: '40', iconUrl: '', tags: 'humanoid' },
  { id: 'mob_19', name: 'Wyvern', role: 'quest', level: '19', hp: '1775', ap: '120', arm: '45', iconUrl: '', tags: 'dragon' },

  // BOSS 4 (Endgame)
  { id: 'boss_20', name: 'Void Dragon', role: 'boss', level: '20', hp: '12000', ap: '250', arm: '80', iconUrl: '', tags: 'dragon' },
]

// --- 6. QUESTS (Active vs Passive Split) ---
// Active: < 5 min, High Gold Ratio. Passive: > 20 min, High XP Ratio.
const quests: ExampleQuestForm[] = [
  // Lvl 1-2
  { id: 'q_01_fast', name: 'Rat Culling (Blitz)', creatureId: 'mob_01', durationSec: '60', iconUrl: '', rewardXp: '10', rewardCurrency: 'gold:15', lootTableId: 'loot_common' },
  { id: 'q_01_slow', name: 'Cellar Patrol', creatureId: 'mob_01', durationSec: '600', iconUrl: '', rewardXp: '150', rewardCurrency: 'gold:40', lootTableId: 'loot_common' },
  
  // Lvl 5 Boss
  { id: 'q_boss_05', name: 'Slay the Broodmother', creatureId: 'boss_05', durationSec: '300', iconUrl: '', rewardXp: '500', rewardCurrency: 'gold:300', lootTableId: 'loot_boss_t1' },

  // Lvl 10 Grind
  { id: 'q_10_fast', name: 'Bone Collecting', creatureId: 'mob_06', durationSec: '120', iconUrl: '', rewardXp: '50', rewardCurrency: 'gold:80', lootTableId: 'loot_uncommon' },
  { id: 'q_10_slow', name: 'Crypt Expedition', creatureId: 'mob_08', durationSec: '3600', iconUrl: '', rewardXp: '2500', rewardCurrency: 'gold:400', lootTableId: 'loot_uncommon' },

  // Lvl 20 Endgame
  { id: 'q_boss_20', name: 'The Void Raid', creatureId: 'boss_20', durationSec: '1800', iconUrl: '', rewardXp: '10000', rewardCurrency: 'gold:5000', lootTableId: 'loot_legendary' },
]

// --- 7. LOOT & SHOP ---
const listings = items.map((it) => ({
  itemId: it.id,
  currencyId: 'gold',
  price: Number(it.priceAmount) || 0,
}))

const lootTables: { id: string; entries: ExampleLootEntryForm[] }[] = [
  { id: 'loot_common', entries: [{ itemId: 'arm_t1_cloth', weight: '10', classId: '' }] },
  { id: 'loot_boss_t1', entries: [{ itemId: 'wep_t2_flail', weight: '5', classId: 'warlord' }, { itemId: 'wep_t2_staff', weight: '5', classId: 'sorcerer' }] },
  { id: 'loot_legendary', entries: [{ itemId: 'wep_t5_legend', weight: '1', classId: 'sorcerer' }, { itemId: 'wep_t5_wep', weight: '1', classId: 'warlord' }] },
]

export const exampleFormState: ExampleFormState = {
  visibility: 'private',
  joinCode: '',
  playerCap: 20,
  maxLevel: 20,
  combatPresetId: 'combat_v2_advanced',
  statPointsPerLevel: 5, // Increased to allow hybrid builds
  xpEntries,
  currencies: [{ id: 'gold', name: 'Gold Coins' }],
  abilities,
  classes,
  creatures,
  items,
  quests,
  listings,
  lootTables,
}