/**
 * Example Idle RPG pack form state for testing the Create Realm page.
 * Fill with example data via the modal; image URLs left blank for you to add.
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
  animationUrl: string
  projectileUrl: string
  impactUrl: string
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
export type ExampleDungeonForm = { id: string; name: string; description: string; imageUrl?: string; requiredLevel: string; bossCreatureId: string }
export type ExampleRaidForm = { id: string; name: string; description: string; imageUrl?: string; requiredLevel: string; bossCreatureId: string; requiredCurrencyCost?: { currencyId: string; amount: number } }

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
  dungeons: ExampleDungeonForm[]
  raids: ExampleRaidForm[]
  listings: { itemId: string; currencyId: string; price: number }[]
  lootTables: { id: string; entries: ExampleLootEntryForm[] }[]
}

// --- Abilities: 5 primary, 5 unique regular, 1 shared regular, 5 ultimates ---
const abilities: ExampleAbilityForm[] = [
  { id: 'warlord_slam', name: 'Flail Slam', abilityType: 'primary', description: 'Warlord primary attack.', iconUrl: '', delivery: 'melee', styleId: 'melee_slash' },
  { id: 'sorcerer_bolt', name: 'Arcane Bolt', abilityType: 'primary', description: 'Sorcerer primary attack.', iconUrl: '', delivery: 'projectile_straight', styleId: 'projectile_bolt' },
  { id: 'warrior_slash', name: 'Weapon Slash', abilityType: 'primary', description: 'Warrior primary attack.', iconUrl: '', delivery: 'melee', styleId: 'melee_slash' },
  { id: 'hunter_shot', name: 'Precise Shot', abilityType: 'primary', description: 'Hunter primary attack.', iconUrl: '', delivery: 'projectile_straight', styleId: 'projectile_arrow' },
  { id: 'knifeman_stab', name: 'Dual Stab', abilityType: 'primary', description: 'Knifeman primary attack.', iconUrl: '', delivery: 'melee', styleId: 'melee_slash' },
  { id: 'warlord_rally', name: 'Rally', abilityType: 'regular', description: 'Warlord rallies allies.', iconUrl: '', delivery: 'melee', styleId: 'melee_slash' },
  { id: 'sorcerer_fireball', name: 'Fireball', abilityType: 'regular', description: 'Sorcerer casts fireball.', iconUrl: '', delivery: 'melee', styleId: 'melee_slash' },
  { id: 'warrior_cleave', name: 'Cleave', abilityType: 'regular', description: 'Warrior cleaves multiple foes.', iconUrl: '', delivery: 'melee', styleId: 'melee_slash' },
  { id: 'hunter_trap', name: 'Trap', abilityType: 'regular', description: 'Hunter sets a trap.', iconUrl: '', delivery: 'instant', styleId: 'instant_slash' },
  { id: 'knifeman_evade', name: 'Evade', abilityType: 'regular', description: 'Knifeman evades and counterattacks.', iconUrl: '', delivery: 'instant', styleId: 'instant_slash' },
  { id: 'power_strike', name: 'Power Strike', abilityType: 'regular', description: 'Shared heavy strike. (Warlord, Warrior)', iconUrl: '', delivery: 'melee', styleId: 'melee_slash' },
  { id: 'warlord_rampage', name: 'Rampage', abilityType: 'ultimate', description: 'Warlord ultimate.', iconUrl: '', delivery: 'melee', styleId: 'melee_slash' },
  { id: 'sorcerer_meteor', name: 'Meteor', abilityType: 'ultimate', description: 'Sorcerer ultimate.', iconUrl: '', delivery: 'projectile_arced', styleId: 'projectile_bolt' },
  { id: 'warrior_whirlwind', name: 'Whirlwind', abilityType: 'ultimate', description: 'Warrior ultimate.', iconUrl: '', delivery: 'melee', styleId: 'melee_slash' },
  { id: 'hunter_barrage', name: 'Barrage', abilityType: 'ultimate', description: 'Hunter ultimate.', iconUrl: '', delivery: 'projectile_straight', styleId: 'projectile_arrow' },
  { id: 'knifeman_blur', name: 'Blur', abilityType: 'ultimate', description: 'Knifeman ultimate.', iconUrl: '', delivery: 'instant', styleId: 'instant_slash' },
]

// --- Classes: warlord (flail+shield), warrior (2h sword or sword+shield), hunter (2h bow or knife), knifeman (dual knives), sorcerer (2h staff or wand+shield) ---
const classes: ExampleClassForm[] = [
  {
    id: 'warlord',
    name: 'Warlord',
    description: 'Uses flail and shield. Heavy control.',
    iconUrl: '',
    damageMainStat: 'STR',
    primaryAttackAbilityId: 'warlord_slam',
    attackTags: 'weapon:flail',
    attackRequired: true,
    attackAllowEmpty: false,
    defenseTags: 'armor:shield',
    defenseRequired: true,
    defenseAllowEmpty: false,
    regularAbilityIds: 'warlord_rally, power_strike',
    ultimateAbilityId: 'warlord_rampage',
  },
  {
    id: 'sorcerer',
    name: 'Sorcerer',
    description: 'Uses 2h staff or wand and shield.',
    iconUrl: '',
    damageMainStat: 'INT',
    primaryAttackAbilityId: 'sorcerer_bolt',
    attackTags: 'weapon:2h_staff,weapon:wand',
    attackRequired: true,
    attackAllowEmpty: false,
    defenseTags: 'armor:shield',
    defenseRequired: false,
    defenseAllowEmpty: true,
    regularAbilityIds: 'sorcerer_fireball',
    ultimateAbilityId: 'sorcerer_meteor',
  },
  {
    id: 'warrior',
    name: 'Warrior',
    description: 'Uses 2h sword or sword and shield.',
    iconUrl: '',
    damageMainStat: 'STR',
    primaryAttackAbilityId: 'warrior_slash',
    attackTags: 'weapon:2h_sword,weapon:sword',
    attackRequired: true,
    attackAllowEmpty: false,
    defenseTags: 'armor:shield',
    defenseRequired: false,
    defenseAllowEmpty: true,
    regularAbilityIds: 'warrior_cleave, power_strike',
    ultimateAbilityId: 'warrior_whirlwind',
  },
  {
    id: 'hunter',
    name: 'Hunter',
    description: 'Uses 2h bow or 1h knife.',
    iconUrl: '',
    damageMainStat: 'DEX',
    primaryAttackAbilityId: 'hunter_shot',
    attackTags: 'weapon:2h_bow,weapon:knife',
    attackRequired: true,
    attackAllowEmpty: false,
    defenseTags: 'armor:light',
    defenseRequired: false,
    defenseAllowEmpty: true,
    regularAbilityIds: 'hunter_trap',
    ultimateAbilityId: 'hunter_barrage',
  },
  {
    id: 'knifeman',
    name: 'Knifeman',
    description: 'Uses dual knives.',
    iconUrl: '',
    damageMainStat: 'DEX',
    primaryAttackAbilityId: 'knifeman_stab',
    attackTags: 'weapon:dual_knives',
    attackRequired: true,
    attackAllowEmpty: false,
    defenseTags: 'armor:light',
    defenseRequired: false,
    defenseAllowEmpty: true,
    regularAbilityIds: 'knifeman_evade',
    ultimateAbilityId: 'knifeman_blur',
  },
]

// --- 50+ creatures ---
const creatureNames = [
  'Goblin', 'Wolf', 'Spider', 'Skeleton', 'Bat', 'Rat', 'Slime', 'Orc', 'Bandit', 'Wraith',
  'Bear', 'Boar', 'Scorpion', 'Zombie', 'Ghost', 'Imp', 'Kobold', 'Harpy', 'Troll', 'Ogre',
  'Giant Spider', 'Dire Wolf', 'Necromancer', 'Dark Knight', 'Vampire', 'Lich', 'Dragonling', 'Elemental', 'Golem', 'Serpent',
  'Forest Guardian', 'Cave Drake', 'Shadow Beast', 'Frost Wight', 'Flame Spirit', 'Thunder Bird', 'Stone Titan', 'Swamp Horror', 'Desert Stalker', 'Ice Wolf',
  'Chaos Spawn', 'Abyssal Horror', 'Corrupted Mage', 'Bone Dragon', 'Nightmare', 'Plague Bearer', 'Void Walker', 'Elder Beast', 'Ancient Guardian', 'World Eater',
]
const creatures: ExampleCreatureForm[] = creatureNames.map((name, i) => ({
  id: `creature_${i + 1}`,
  name,
  role: i >= 45 ? 'boss' : 'quest',
  level: String(Math.min(10, Math.floor(i / 5) + 1)),
  hp: String(20 + i * 8),
  ap: String(2 + Math.floor(i / 10)),
  arm: String(Math.floor(i / 8)),
  iconUrl: '',
  tags: i % 3 === 0 ? 'beast' : i % 3 === 1 ? 'undead' : 'humanoid',
}))

// --- 30+ items (mix of weapons and armor) ---
const itemDefs: { id: string; name: string; rarity: string; slot: string; tags: string; stats: string; price: number }[] = [
  { id: 'flail_1', name: 'Iron Flail', rarity: 'common', slot: 'attack_source', tags: 'weapon:flail', stats: 'STR:2', price: 50 },
  { id: 'flail_2', name: 'Steel Flail', rarity: 'rare', slot: 'attack_source', tags: 'weapon:flail', stats: 'STR:4', price: 200 },
  { id: 'shield_1', name: 'Wooden Shield', rarity: 'common', slot: 'defense_layer', tags: 'armor:shield', stats: 'ARM:3', price: 40 },
  { id: 'shield_2', name: 'Kite Shield', rarity: 'rare', slot: 'defense_layer', tags: 'armor:shield', stats: 'ARM:6', price: 180 },
  { id: '2h_sword_1', name: 'Greatsword', rarity: 'common', slot: 'attack_source', tags: 'weapon:2h_sword', stats: 'STR:3', price: 60 },
  { id: '2h_sword_2', name: 'Claymore', rarity: 'rare', slot: 'attack_source', tags: 'weapon:2h_sword', stats: 'STR:5', price: 250 },
  { id: 'sword_1', name: 'Longsword', rarity: 'common', slot: 'attack_source', tags: 'weapon:sword', stats: 'STR:2', price: 45 },
  { id: '2h_bow_1', name: 'Longbow', rarity: 'common', slot: 'attack_source', tags: 'weapon:2h_bow', stats: 'DEX:3', price: 55 },
  { id: '2h_bow_2', name: 'Hunters Bow', rarity: 'rare', slot: 'attack_source', tags: 'weapon:2h_bow', stats: 'DEX:5', price: 220 },
  { id: 'knife_1', name: 'Hunting Knife', rarity: 'common', slot: 'attack_source', tags: 'weapon:knife', stats: 'DEX:2', price: 30 },
  { id: 'dual_knives_1', name: 'Twin Daggers', rarity: 'common', slot: 'attack_source', tags: 'weapon:dual_knives', stats: 'DEX:3', price: 50 },
  { id: 'dual_knives_2', name: 'Shadow Blades', rarity: 'rare', slot: 'attack_source', tags: 'weapon:dual_knives', stats: 'DEX:5', price: 210 },
  { id: '2h_staff_1', name: 'Oak Staff', rarity: 'common', slot: 'attack_source', tags: 'weapon:2h_staff', stats: 'INT:3', price: 50 },
  { id: '2h_staff_2', name: 'Archmage Staff', rarity: 'rare', slot: 'attack_source', tags: 'weapon:2h_staff', stats: 'INT:5', price: 240 },
  { id: 'wand_1', name: 'Willow Wand', rarity: 'common', slot: 'attack_source', tags: 'weapon:wand', stats: 'INT:2', price: 40 },
  { id: 'wand_2', name: 'Sage Wand', rarity: 'rare', slot: 'attack_source', tags: 'weapon:wand', stats: 'INT:4', price: 190 },
  { id: 'armor_light_1', name: 'Leather Vest', rarity: 'common', slot: 'defense_layer', tags: 'armor:light', stats: 'ARM:2', price: 35 },
  { id: 'armor_light_2', name: 'Shadow Cloak', rarity: 'rare', slot: 'defense_layer', tags: 'armor:light', stats: 'ARM:4', price: 160 },
  { id: 'potion_hp_1', name: 'Health Potion', rarity: 'common', slot: 'attack_source', tags: 'consumable', stats: 'HP:10', price: 15 },
  { id: 'potion_hp_2', name: 'Greater Health Potion', rarity: 'rare', slot: 'attack_source', tags: 'consumable', stats: 'HP:25', price: 80 },
  { id: 'ring_str', name: 'Ring of Strength', rarity: 'rare', slot: 'defense_layer', tags: 'accessory', stats: 'STR:1', price: 100 },
  { id: 'ring_dex', name: 'Ring of Dexterity', rarity: 'rare', slot: 'defense_layer', tags: 'accessory', stats: 'DEX:1', price: 100 },
  { id: 'ring_int', name: 'Ring of Intellect', rarity: 'rare', slot: 'defense_layer', tags: 'accessory', stats: 'INT:1', price: 100 },
  { id: 'amulet_arm', name: 'Amulet of Warding', rarity: 'legendary', slot: 'defense_layer', tags: 'accessory', stats: 'ARM:5', price: 500 },
  { id: 'flail_3', name: 'Warlords Flail', rarity: 'legendary', slot: 'attack_source', tags: 'weapon:flail', stats: 'STR:8', price: 600 },
  { id: 'shield_3', name: 'Tower Shield', rarity: 'legendary', slot: 'defense_layer', tags: 'armor:shield', stats: 'ARM:10', price: 550 },
  { id: '2h_sword_3', name: 'Dragon Slayer', rarity: 'legendary', slot: 'attack_source', tags: 'weapon:2h_sword', stats: 'STR:9', price: 700 },
  { id: '2h_staff_3', name: 'Staff of the Void', rarity: 'legendary', slot: 'attack_source', tags: 'weapon:2h_staff', stats: 'INT:9', price: 680 },
  { id: '2h_bow_3', name: 'Windcaller', rarity: 'legendary', slot: 'attack_source', tags: 'weapon:2h_bow', stats: 'DEX:8', price: 650 },
  { id: 'dual_knives_3', name: 'Phantom Knives', rarity: 'legendary', slot: 'attack_source', tags: 'weapon:dual_knives', stats: 'DEX:9', price: 620 },
]
const items: ExampleItemForm[] = itemDefs.map((it) => ({
  ...it,
  iconUrl: '',
  animationUrl: '',
  projectileUrl: '',
  impactUrl: '',
  priceCurrencyId: 'gold',
  priceAmount: String(it.price),
}))

// --- 30 quests (each creature 1–30 gets a quest; rest are extra) ---
const quests: ExampleQuestForm[] = creatures.slice(0, 30).map((c, i) => ({
  id: `quest_${i + 1}`,
  name: `Slay ${c.name}`,
  creatureId: c.id,
  durationSec: String(45 + i * 5),
  iconUrl: '',
  rewardXp: String(15 + i * 3),
  rewardCurrency: `gold:${20 + i * 4}`,
  lootTableId: i % 5 === 0 ? 'loot_common' : '',
}))

// --- Merchant: sell first 20 items ---
const listings = items.slice(0, 20).map((it) => ({
  itemId: it.id,
  currencyId: 'gold',
  price: Number(it.priceAmount) || 0,
}))

// --- Loot tables ---
const lootTables: { id: string; entries: ExampleLootEntryForm[] }[] = [
  { id: 'loot_common', entries: [{ itemId: 'potion_hp_1', weight: '10', classId: '' }, { itemId: 'ring_str', weight: '2', classId: '' }, { itemId: 'ring_dex', weight: '2', classId: '' }] },
  { id: 'loot_rare', entries: [{ itemId: 'flail_2', weight: '5', classId: 'warlord' }, { itemId: '2h_sword_2', weight: '5', classId: 'warrior' }, { itemId: '2h_staff_2', weight: '5', classId: 'sorcerer' }] },
  { id: 'loot_boss', entries: [{ itemId: 'amulet_arm', weight: '1', classId: '' }, { itemId: '2h_sword_3', weight: '1', classId: 'warrior' }] },
]

export const exampleFormState: ExampleFormState = {
  visibility: 'private',
  joinCode: '',
  playerCap: 10,
  maxLevel: 10,
  combatPresetId: 'combat_v1_simple',
  statPointsPerLevel: 3,
  xpEntries: [
    { level: '2', xp: '100' },
    { level: '3', xp: '250' },
    { level: '4', xp: '500' },
    { level: '5', xp: '900' },
    { level: '6', xp: '1400' },
    { level: '7', xp: '2000' },
    { level: '8', xp: '2700' },
    { level: '9', xp: '3500' },
    { level: '10', xp: '4500' },
  ],
  currencies: [{ id: 'gold', name: 'Gold' }],
  abilities,
  classes,
  creatures,
  items,
  quests,
  dungeons: [],
  raids: [],
  listings,
  lootTables,
}
