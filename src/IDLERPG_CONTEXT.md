# FableHub — Idle RPG: Complete Project Context

Browser-based idle RPG inspired by Shakes & Fidget. Built with **NestJS** (backend) + **React/Vite** (frontend), Prisma + Supabase Postgres, MUI + Framer Motion + TailwindCSS.

---

## 1. High-Level Architecture

```
fablehub-backend/          NestJS API server
  src/types/               Shared type definitions (pack, combat, runtime)
  src/idle-rpg/            All IdleRPG domain logic
    core/                  Realm CRUD (service, controller, module)
    character/             Character lifecycle, quests, PvP, dungeons, raids
    combat/                Combat engine (effects, abilities, status effects)
    groups/                Guilds: chat, roster, donations, raid calls
    dto/                   Request validation DTOs
    pack-cache.ts          In-memory TTL cache for realm packs
  prisma/schema.prisma     Database models

fablehub-ui/               React SPA (Vite)
  src/services/api.ts      All API types + fetch helpers
  src/app/routes/
    Fables/expressions/IdleRPG/
      Create.tsx            Create new realm + define pack data
      Edit.tsx              Edit existing realm pack
      Play.tsx              Main gameplay hub (tabs, character creation)
      tabs/                 7 gameplay tabs
      components/           Shared UI components
      components/vfx/       Animation/VFX system
      utils/                Combat stat helpers
    Dev/AnimationTest.tsx   Dev sandbox for VFX testing
  src/assets/backgrounds/   Background images (tavern, arena, dungeon, merchant, charBackground)
```

---

## 2. Core Concepts

### Realm & Pack

A **Realm** is an instance of the game, created by a "Fable" author. It stores an **IdleRpgPackV1** JSON blob containing all game data:

- `rules` — max level, XP table, combat preset, stat/ability points per level, ability slots by level
- `economy` — currencies (e.g. Gold)
- `resources` — mana/rage/stamina definitions (id, name, colorHex, isGenerative, max, regenPerTurn, gainOnHit)
- `classes` — each with primaryAttackId, scaling stat, equipment slots, resource, available abilities
- `abilities` — all abilities including primary attacks, with effects, cooldowns, costs, animation frames
- `creatures` — enemies for quests/bosses with stats, optional abilityIds, optional resourceId
- `items` — weapons/armor/accessories with stats, tags, rarity (1-5), slot, optional animation URLs
- `quests` — combat encounters with creatures, duration, XP/gold/loot rewards
- `dungeons` — single boss encounters requiring level, with dungeon imageUrl
- `raids` — guild-gated boss fights requiring currency donation
- `lootTables` — weighted drop tables with optional class conditions
- `merchant` — default shop listings

### Character (RealmCharacter)

A player character in a realm, stored in `IdleRpgCharacter` DB table with JSON fields:

- Identity: name, classId, level, xp, portraitUrl
- Stats: base stats + allocatedStats + equipment bonuses → computed HP/AP/ARM
- Equipment: attack_source and defense_layer slots → item IDs
- Inventory: array of {itemId, qty}
- Balances: currency amounts (e.g. {gold: 500})
- Abilities: unlockedAbilityIds, equippedAbilityIds, abilityPoints
- Quest state: active quest, completed history, cooldowns
- Progression: completedDungeonIds, dungeonBossCooldowns
- Merchant: per-character shop listings with 24h refresh

### Classes

Each class defines:
- `primaryAttackId` — references an Ability with abilityType 'primary'
- `scaling.damageMainStat` — STR, DEX, INT, etc.
- `slots` — equipment slot rules (attack_source, defense_layer) with allowed tags
- `resourceId` — optional resource for ability costs
- `abilities` — regular and ultimate ability IDs available to unlock
- `isHeroClass` — if true, only one player per realm can pick this class

### Abilities

Every action in combat is an Ability:
- **Primary** (abilityType: 'primary') — default attack, no cooldown, no cost
- **Regular** — has cooldown + resource cost, must be unlocked with ability points
- **Ultimate** — powerful, higher cost/cooldown
- **Passive** — always-active effects
- **Reactive** — triggers on enemy turn (e.g. Block), controlled by reactiveConfig (baseChance, scalingStat)

Each ability has:
- `effects: Effect[]` — what it does: damage, heal, lifesteal, execute, apply_status
- `cost` — resource cost and cooldown
- `animationFrames` — optional custom VFX (weapon, projectile, impact, block frames)
- `unlockCost` — ability points required
- `requirements` — min level, tag requirements

### Effect System

`Effect` defines what an ability does:
- `kind` — damage | heal | apply_status | execute | lifesteal
- `amount` — flat value
- `percentage` — % of max HP
- `scalingStat` / `scalingCoeff` — stat-based scaling
- `lifestealPercent` — % of damage dealt returned as healing
- `statusEffect` — references a StatusEffectTemplate

`StatusEffectTemplate` supports: dot, hot, stun, slow, paralyze, freeze, sleep, confusion, buff, debuff, blind, vulnerability, anti_heal, thorns, barrier, evasion, haste, auto_revive.

### Resources

Each class can have a resource (mana, rage, stamina):
- `isGenerative: false` — starts full, spent on abilities, regens per turn (like mana)
- `isGenerative: true` — starts at 0, generated by attacks (like rage)
- Properties: max, regenPerTurn, gainOnHit, colorHex for UI

---

## 3. Combat System

### Engine (`combat-engine.ts`, ~1055 lines)

Turn-based automated combat. Each turn:
1. Process status effects (DoT, HoT, stun check)
2. Check action denial (stun, sleep, freeze, paralyze chance)
3. Resource regeneration + cooldown ticks
4. **Ability selection**: if any non-primary ability is off-cooldown AND has sufficient resource → pick one randomly. Otherwise use primary attack.
5. Execute ability: apply effects, compute damage (AP - ARM, modified by stat buffs/debuffs), apply status effects
6. Death check

Key functions:
- `runCombat(a, b, options)` — 1v1 combat, returns CombatResult with turn-by-turn events
- `runRaidCombat(players[], boss, options)` — multi-player sequential 1v1 vs boss
- `resolvePlayerToCombatant(player, pack)` — converts character data to combat-ready Combatant
- `resolveCreatureToCombatant(creature, pack)` — converts creature template to Combatant
- `computeDamage(ap, arm)` — base damage formula: `Math.max(1, ap - arm)`

### Combat Result Structure

```typescript
CombatResult {
  turns: CombatTurn[]     // each turn has events
  winnerId: string | null
  finalHp: Record<string, number>
  timeout: boolean
}

CombatTurn {
  turnIndex: number
  events: CombatTurnEvent[]
  activeStatusEffects?: Record<combatantId, ActiveStatusEffect[]>
  resources?: Record<combatantId, { current, max }>
}

CombatTurnEvent {
  sourceId, targetId, type, value, targetHpAfter
  abilityId?, abilityName?
  statusEffectId?, statusEffectName?
  resourceAfter?: { current, max }
  blocked?, blockAbilityId?, blockAnimationFrames?
}
```

### Combat Contexts

| Context | Trigger | Engine Function |
|---------|---------|-----------------|
| Quest | Player claims completed quest | `runCombat(player, creature)` |
| Dungeon Boss | Player clicks Fight in dungeon | `runCombat(player, boss)` |
| PvP | Player challenges another | `runCombat(challenger, target)` — challenger attacks first |
| Raid | Leader starts raid | `runRaidCombat(readyPlayers, boss)` — players ordered by level ascending |

---

## 4. Animation System

### Animation Frames

Each ability can define `AnimationFrames` with up to 4 phases, each supporting multiple particles:

```typescript
AnimationFrames {
  weapon?: AnimationWeaponFrame[]      // pops at caster portrait
  projectile?: AnimationProjectileFrame[]  // flies caster → target
  impact?: AnimationImpactFrame[]      // pops at target portrait
  block?: AnimationBlockFrame[]        // pops at defender on block
}
```

Each particle has: `url`, `delayMs`, `fadeInMs/showMs/vanishMs`, `lifetimeMs`, `startSizePx`, `endSizePx`, `offsetX`, `offsetY`. Projectiles additionally have `trajectory` (straight | arc) and `speedMs`.

### Image Sources

Frame URLs can be dynamic — `imageSource` field selects from:
- `url` — hardcoded URL
- `weaponIcon` — equipped weapon's icon URL
- `weaponAnimation` — equipped weapon's animation URL
- `weaponProjectile` — equipped weapon's projectile URL
- `weaponImpact` — equipped weapon's impact URL

`resolveAnimationFrames()` in `animationConfig.ts` resolves these at runtime based on the character's equipped weapon.

### Per-Ability Animation Resolution

`CombatReplay` accepts `abilityAnimations: Record<abilityId, AnimationFrames>` so each ability plays its own VFX. The calling tab builds this map from `pack.abilities`.

### Replay Flow (CombatReplay.tsx)

1. Group consecutive events by sourceId + abilityId
2. For each group, look up animation config (per-ability override or combatant default)
3. Animate: resource spend → cast (card scales up) → weapon frames → projectile flight → impact frames + damage numbers → target stagger → return to idle
4. Update HP bars, status effect icons, resource bars
5. Between turns: update status effect/resource snapshots from turn data

### Card Motion

- **Cast** (attacker): `scale: 1.08` over 0.15s, then returns to `scale: 1`
- **Stagger** (defender on hit): horizontal shake via x keyframes over 0.3s
- Driven by Framer Motion variants: `idle`, `cast`, `hit`, `return`

---

## 5. Backend File Map

### Types (`src/types/`)

| File | Purpose |
|------|---------|
| `idle-rpg.types.ts` | Pack config types: Ability, ClassBlock, ItemTemplate, CreatureTemplate, Dungeon, Raid, Quest, IdleRpgPackV1 |
| `ability-catalog.types.ts` | Effect system: Effect, EffectKind, StatusEffectTemplate, AnimationFrames, Resource, ReactiveConfig |
| `combat.types.ts` | Combat runtime: CombatAbility, Combatant, CombatResult, CombatTurn, CombatTurnEvent |
| `idle-rpg-runtime.types.ts` | Character runtime: RealmCharacter, CharacterQuestState, RealmGroup, ProgressionState |

### Services & Controllers (`src/idle-rpg/`)

| File | Role | Key Responsibilities |
|------|------|---------------------|
| `core/idle-rpg.service.ts` | Service | Realm CRUD, pack validation, default pack merge |
| `core/idle-rpg.controller.ts` | Controller | REST: `/fables/:fableId/idle-rpg` — create/update/list/get realms |
| `character/idle-rpg-characters.service.ts` | Service (~1092 lines) | Character lifecycle: create, play state, quests, PvP, dungeons, raids, shop, equipment, stats, abilities |
| `character/idle-rpg-characters.controller.ts` | Controller | REST: `/fables/:fableId/idle-rpg/:realmId/characters` — all character endpoints |
| `groups/idle-rpg-groups.service.ts` | Service (~664 lines) | Guilds: create/join/leave, chat, ranks, donations, raid call lifecycle |
| `groups/idle-rpg-groups.controller.ts` | Controller | REST: `/fables/:fableId/idle-rpg/:realmId/groups` — all group endpoints |
| `combat/combat-engine.ts` | Engine (~1055 lines) | Combat simulation: effects, status effects, resources, cooldowns, reactive abilities |
| `pack-cache.ts` | Utility | In-memory TTL cache for parsed pack JSON |

### DTOs (`src/idle-rpg/dto/`)

| File | DTOs |
|------|------|
| `create-idle-rpg.dto.ts` | CreateIdleRpgDto |
| `realm-character.dto.ts` | CreateRealmCharacterDto, StartQuestDto, BuyItemDto, EquipItemDto, PvpFightDto, AllocateStatDto, UnlockAbilityDto, EquipAbilitiesDto |
| `group.dto.ts` | CreateGroupDto, JoinGroupDto, SendGroupMessageDto, SetMemberRankDto, DonateCurrencyDto, PrepareRaidCallDto, etc. |

### Database Models (Prisma)

| Model | Purpose |
|-------|---------|
| `IdleRpgRealm` | Realm per fable: pack JSON, visibility, joinCode, playerCap |
| `IdleRpgCharacter` | Player character: class, level, xp, stats, equipment, inventory, abilities, quest state, merchant, group |
| `IdleRpgGroup` | Guild: name, members, leader, ranks, donations, raid call, raid replay |
| `IdleRpgGroupMessage` | Guild chat messages |
| `IdleRpgPvpFight` | PvP match record: challenger, target, winner |

---

## 6. Frontend File Map

### Pages (`src/app/routes/Fables/expressions/IdleRPG/`)

| File | Component | Purpose |
|------|-----------|---------|
| `Create.tsx` (~1081 lines) | IdleRpgCreate | Form to create a new realm: define classes, abilities, items, creatures, quests, dungeons, raids, resources, loot tables, rules. Supports JSON import/export. |
| `Edit.tsx` (~1109 lines) | IdleRpgEdit | Same form as Create but loads existing pack for editing. Supports JSON import/export. |
| `Play.tsx` (~776 lines) | FableIdleRPG | Main gameplay hub: realm selection, character creation screen (with hero class support), tabbed interface for all gameplay. |

### Tabs (`tabs/`)

| File | Component | Purpose |
|------|-----------|---------|
| `TavernTab.tsx` (~410 lines) | TavernTab | Quest board: browse quests, start/claim quests, combat replay with arena background |
| `ShopTab.tsx` (~329 lines) | ShopTab | Character card with equipment slots, merchant shop (per-character, 24h refresh), inventory grid with rarity-colored slots |
| `GuildTab.tsx` (~281 lines) | GuildTab | Guild list + join/create (if no guild), or guild chat + roster + management + raids (if in guild) |
| `PvPTab.tsx` (~391 lines) | PvPTab | Player roster, character inspection modal with Fight button, PvP combat replay, fight history |
| `DungeonsTab.tsx` (~531 lines) | DungeonsTab | Dungeon cards with navigation arrows, boss modal with fight button, combat replay, loot display, completion/cooldown tracking |
| `RaidsTab.tsx` (~320 lines) | RaidsTab | Raid card list, pending replay viewer, raid history. Guild-gated (tooltip if no guild). Leader sees PREPARE button. |
| `AbilitiesTab.tsx` (~575 lines) | AbilitiesTab | Character card + ability points, ability slots (locked/unlocked), ability pool by level, unlock/equip flow |

### Components (`components/`)

| File | Component | Purpose |
|------|-----------|---------|
| `CombatReplay.tsx` (~932 lines) | CombatReplay | Turn-by-turn 1v1 combat replay with full VFX pipeline (weapon/projectile/impact/block frames, damage numbers, HP/resource bars, status effects). Accepts per-ability animation overrides. |
| `RaidReplayView.tsx` (~850 lines) | RaidReplayView | Multi-player raid replay with card stacking (front = current player), death transitions (fade out + slide next), same VFX pipeline as CombatReplay. |
| `CharacterPanel.tsx` (~462 lines) | CharacterPanel | Character summary card: portrait with charBackground, stats, XP bar, equipment slots with ItemView, stat allocation, used in Shop tab and inspection modals. |
| `CharacterCardModal.tsx` (73 lines) | CharacterCardModal | Dialog wrapper around CharacterPanel, optional Fight button for PvP/Guild. |
| `ItemView.tsx` (~259 lines) | ItemView | Square item slot with rarity-colored background (grey/green/blue/purple/orange), hover tooltip with name, stats, cost. |
| `GuildChat.tsx` (~167 lines) | GuildChat | Chat panel with message polling, system announcement styling, auto-scroll. |
| `GuildRoster.tsx` (~141 lines) | GuildRoster | Member table (name, level, class icon, online status, contribution), clickable for profile modal. |
| `GuildManagement.tsx` (~154 lines) | GuildManagement | Guild info display: name, description, donations, guild champion (most PvP wins excluding leader). |
| `GuildRaids.tsx` (~159 lines) | GuildRaids | Raid call component in guild tab: "No raid call" or countdown timer + READY button + ready member list + boss info. |
| `AbilityAnimationEditor.tsx` (~275 lines) | AbilityAnimationEditor | Reusable editor for animation frames (weapon/projectile/impact/block particles with all properties). Used in Create.tsx and Edit.tsx. |

### VFX (`components/vfx/`)

| File | Component/Export | Purpose |
|------|-----------------|---------|
| `animationConfig.ts` (~261 lines) | getAttackAnimationConfig, resolveAnimationFrames | Resolves animation config from ability frames or styleId fallback. Resolves dynamic image sources (weaponIcon, weaponAnimation, etc.) |
| `WeaponFrame.tsx` (~104 lines) | WeaponFrame | Animated weapon PNG at caster portrait (fade in, optional lifetime, size transition) |
| `Projectile.tsx` (~216 lines) | Projectile | Animated projectile flight between portraits (straight or arc trajectory, size transition) |
| `ImpactFrame.tsx` (~80 lines) | ImpactFrame | Animated impact PNG at target portrait (show + vanish phases, size transition) |
| `ImpactEffect.tsx` (~199 lines) | ImpactEffect | SVG fallback impact effects when no custom impact frame (slash, punch, arrow, bolt, generic) |
| `BlockFrame.tsx` (~76 lines) | BlockFrame | Block animation at defender portrait on successful block |
| `DamageNumber.tsx` (~81 lines) | DamageNumber | Floating damage/heal/status text with color coding by event type |

### Utils

| File | Exports | Purpose |
|------|---------|---------|
| `utils/combatStats.ts` (53 lines) | computePlayerCombatStats, resolveCharacterResource, resolveCreatureResource | Compute HP/AP/ARM from character + pack data; resolve resource info for UI display |

### Dev Tools

| File | Purpose |
|------|---------|
| `src/app/routes/Dev/AnimationTest.tsx` (~1406 lines) | Sandbox for testing ability animations. Full ability property editor, import/export JSON, portrait URL inputs, live preview with same layout as CombatReplay. |

### API Layer (`src/services/api.ts`, ~896 lines)

All IdleRPG types mirrored from backend, plus ~30 API helper functions under `api.idleRpg`:

**Realm:** createIdleRpgRealm, getIdleRpgRealms, getIdleRpgRealm, updateIdleRpgRealm
**Characters:** getMyCharacters, createCharacter, getRealmRoster, getPlayState, getGuildMemberPlayState
**Quests:** startQuest, claimQuest
**Shop:** buyItem, equipItem
**Stats/Abilities:** allocateStat, unlockAbility, equipAbilities
**PvP:** pvpFight, getPvpHistory
**Dungeons:** getDungeons, fightDungeonBoss
**Raids:** getRaids, getRaidCall, prepareRaidCall, setRaidReady, startRaid, markRaidReplayViewed
**Guilds:** getGroups, getGroup, createGroup, joinGroup, getGroupMessages, sendGroupMessage, donateToGuild

---

## 7. Key Data Flows

### Character Creation
1. UI (`Play.tsx`): user picks class, enters name → `createCharacter` API call
2. Backend: validates class exists, checks hero class availability, initializes stats/equipment/balances from pack defaults
3. Returns new character → UI loads play state

### Quest Flow
1. `TavernTab`: user picks quest → `startQuest` (sets timer)
2. Timer expires → `claimQuest` → backend runs `runCombat(player, creature)` → returns combat result + rewards
3. UI shows `CombatReplay` with full animation → on finish shows rewards

### PvP Flow
1. `PvPTab`: user clicks player → inspects via `CharacterCardModal` → clicks Fight
2. `pvpFight` → backend resolves both players to Combatants, runs `runCombat` (challenger attacks first)
3. Stores fight in `IdleRpgPvpFight`, announces to guild chat if applicable
4. UI shows `CombatReplay`

### Dungeon Flow
1. `DungeonsTab`: user navigates to dungeon → clicks boss card → clicks Fight
2. `fightDungeonBoss` → backend checks level req, cooldown, completion → runs `runCombat(player, boss)`
3. On victory: marks dungeon completed, sets 1h cooldown, rolls epic/legendary loot
4. UI shows `CombatReplay` → result screen with dropped item

### Raid Flow
1. Leader clicks PREPARE in `RaidsTab` → `prepareRaidCall` (deducts guild currency, sets timer)
2. Members see call in `GuildRaids` → click READY → `setRaidReady`
3. Leader (or timer expiry) → `startRaid` → backend runs `runRaidCombat(readyPlayers, boss)`
4. Stores replay in group data → members see `RaidReplayView` on next visit
5. `RaidReplayView`: card stacking with death transitions, same VFX as CombatReplay

### Ability System Flow
1. Each level-up grants ability points (configurable per pack)
2. `AbilitiesTab`: user browses available abilities by level → unlocks with AP
3. Equips abilities into slots (slots unlock at configured levels)
4. In combat: engine checks equipped abilities each turn → uses ready ability instead of primary if available
5. UI: `CombatReplay` resolves per-ability animation frames → plays correct VFX per action

---

## 8. Styling & Theming

- **MUI** for layout components (Box, Paper, Typography, TextField, Select, etc.)
- **TailwindCSS** with fantasy palettes: dragonfire, library, medieval
- **Custom CSS**: `.comic-border` for hand-drawn panel borders, `.noise-overlay` for paper texture
- **Framer Motion** for all animations: card movement, VFX, tab transitions, hover/tap effects
- **Background images**: tavern.png (Tavern), merchant.png (Shop), arena.png (combat), dungeon.png (Dungeons/Raids), charBackground.png (all portraits)
- **Item rarity colors**: common (grey), uncommon (green), rare (blue), epic (purple), legendary (orange)
- **Character portraits**: CSS `drop-shadow` for PNG glow, `charBackground.png` behind all portraits
- **Hero classes**: golden gradient borders, glow effects, lock icon when taken

---

## 9. Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Backend framework | NestJS (TypeScript) |
| Database | PostgreSQL via Supabase |
| ORM | Prisma |
| Frontend framework | React 18 + TypeScript |
| Build tool | Vite |
| UI library | MUI (Material UI) |
| CSS | TailwindCSS + MUI sx prop |
| Animations | Framer Motion |
| State management | React useState/useEffect (no global store) |
| API communication | Fetch-based helpers in api.ts |
| Auth | JWT-based (AuthModule in backend) |
