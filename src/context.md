# FableHub — Canon‑First UGC Platform (Context Pack)

This document is written to give an AI copilot full context on the FableHub project: what the product is, why it exists, the architecture, current decisions, MVP scope, and the roadmap.

---

## 0) One‑liner

**FableHub is a canon‑first UGC platform where creators build “Fables” (structured worlds with lore + entities + relationships + capabilities), and users experience those fables through multiple “Modes” (adapters).**  
Modes can be **games** (Idle RPG first, later card/roguelike/etc.) or **non‑game activities** (narration‑heavy FRP sessions, GM copilots, exports like D&D/Fate packs).

---

## 1) Product thesis

### 1.1 The core promise
> **Create a world once. Reuse it everywhere.**

A Fable is the portable source of truth (canon). Modes render that same canon into different experiences without rewriting the world.

### 1.2 The “Roblox‑esque” platform model
- Many Fables exist on the platform.
- Users discover fables via feeds (most played, trending, seasonal, new).
- Creators publish and maintain fables.
- Players join fables and participate in the available modes.

**Important constraint:** If a single fable becomes extremely successful, the creator might be incentivized to launch a standalone version to avoid revenue sharing and gain freedom.  
Therefore, platform strategy should emphasize features that are hard to replicate standalone:
- seasonal cycles and resets
- discovery + distribution + growth loops
- integrity/anti‑fraud infrastructure
- archives/chronicles (compounding content)
- multi‑mode reuse and exports

---

## 2) Terminology

### 2.1 Fable
A **Fable** is a *world/realm* represented as structured canon:
- entities (characters, monsters, factions, locations, items, events, etc.)
- tags/ontology
- relationships
- capabilities (abstract verbs/abilities)

### 2.2 Canon
**Canon** is the mode‑agnostic source of truth. It must be portable.

### 2.3 Mode (Adapter)
A **Mode** is a renderer/interpreter/export pipeline that consumes the same canon and produces:
- an interactive experience (game or non‑game)
- and/or exported artifacts (packs, sheets, PDFs, etc.)

Examples:
- **Idle RPG Mode (MVP)**: Shakes & Fidget‑style questing loop with gear, boss, PvP, groups.
- **Card Mode (future)**: canon → cards (ATK/DEF, abilities, triggers).
- **FRP Session Mode (future)**: narration‑heavy sessions with canon retrieval and consistency checks.
- **Export Modes (future)**: D&D/Fate packs, markdown/PDF “lore books”.

### 2.4 Runtime
Runtime is mutable per‑user/per‑session state **inside a specific mode**:
- Idle RPG runtime: levels, inventory, balances, timers.
- FRP runtime: scene flags, transcripts, choice history.
- Export runtime: versions and diffs of generated artifacts.

### 2.5 Bounded creativity
The platform prefers **bounded creativity** over freeform coding:
- Creators combine modules/templates/slots and reflavor names/icons/VFX.
- Validators and simulation keep balance within acceptable bounds.
- No “arbitrary scripting” in v1.

---

## 3) Key design decisions

### 3.1 Canon vs Mode separation is non‑negotiable
Canon is portable; mode rules are mode‑scoped.

**Canon must NOT contain:**
- currencies
- XP curves
- combat numbers (HP/damage/armor)
- drop rates
- shop prices

Those belong to a mode config.

### 3.2 Currency belongs to the mode
A Fable can have:
- multiple currencies in one game mode,
- no currency in another mode,
- or no economy at all (pure narration/export).

Therefore **currency is defined in the Mode Config**, never in canon.

**Platform credits** (Robux‑like) are **platform‑level**, separate from any fable/mode currencies.

### 3.3 “No‑weapon” characters must still have gear chase
In S&F‑likes, min‑maxing weapon/armor is a major fun loop.

So “unarmed” archetypes (e.g., Netero) should NOT bypass gear.  
Instead:
- mechanical slot exists (Attack Source, Defense Layer)
- presentation differs (beads/seals/wraps/aura shrouds instead of swords/plate)
- the loot chase remains intact

---

## 4) Architecture overview

### 4.1 Three layers
1) **Fable Canon** (portable, mode‑agnostic)
2) **Mode Config** (rules/workflow schema per mode)
3) **Mode Runtime** (mutable per‑user/per‑session state per mode)

---

## 5) Fable Canon (mode‑agnostic) — what it contains

### 5.1 Entities (minimum viable set)
A canon pack contains entities with stable IDs.

Typical entity types:
- Character (templates, NPCs, archetypes)
- Creature (monsters, boss)
- Item (conceptual items; not necessarily statted)
- Faction
- Location
- Quest
- Event
- Concept (optional: abstract lore constraints, themes)

### 5.2 Tags/ontology
Canon uses tags as a universal language:
- `weapon:sword`, `weapon:bow`
- `element:fire`, `element:water`
- `theme:stealth`, `theme:holy`
- `species:vampire`, `species:werewolf`
- `role:boss`, `tier:elite`

Tags are used by adapters to map to mechanics.

### 5.3 Relationships
Examples:
- `member_of`, `enemy_of`, `ally_of`, `guards`, `located_in`, `wields`

Relationships can be used for narrative or mechanics (e.g., boss guards dungeon).

### 5.4 Capabilities (abstract verbs)
Capabilities are system‑agnostic “verbs” like:
- `cut`, `strike`, `fire`, `invisibility`, `summon`, `domain`, `transform`, `dot`, `leech`, `teleport`

Capabilities can include:
- tier/intensity (1..n)
- shape keywords (single/aoe/zone/self)
- constraints/tags

Adapters decide how to implement each capability.

---

## 6) Mode Config — what it contains

Mode configs define how canon is expressed.

### 6.1 Game Mode Config (Idle RPG example)
Contains:
- level cap + XP curve
- stat schema and formulas
- chassis definitions
- slots and allowed item families
- loot tables and drop rates
- shop/merchant rules and prices
- economy currencies (0..n)
- mechanics overlays: numbers keyed by canon entity IDs (HP/damage/price/etc.)

### 6.2 Non‑game Mode Config (FRP session example)
Contains:
- session structure: acts/scenes/beats
- narrator/NPC prompt templates
- canon retrieval rules (RAG over canon)
- contradiction checks + “write‑back to canon” gates
- branching/flags mechanics
- output formats (transcript, chapter summary, export pack)

### 6.3 Export Mode Config (D&D/Fate packs)
Contains:
- mapping tables: canon tags/capabilities → target ruleset constructs
- formatting templates and constraints
- validation rules
- versioning policy

---

## 7) Runtime — what it contains

### 7.1 Idle RPG runtime
- character state: level, XP, stat allocations, derived stats
- balances per currency (map)
- inventory and equipment
- quest activity state/timers
- boss progress
- ledger entries (recommended)

### 7.2 FRP runtime
- current scene + flags
- choice history
- transcript + summaries
- updates proposed/applied to canon (events, relationship changes) behind review gates

### 7.3 Export runtime
- generated artifact versions
- diffs, publication history

---

## 8) The first Mode: Idle RPG (MVP)

### 8.1 MVP goals
Deliver a **friends‑playtestable** idle RPG with:
- complete gameplay loop
- persistence
- minimal creator setup
- clean architecture for future modes

### 8.2 MVP scope (as currently decided)
**Fable creation**
- name + short description
- Idle RPG mode enabled
- (currency defined in Idle RPG config)

**Autogenerated content**
- 20 quest creatures (no images required)
- 1 boss creature

**Progression**
- max level: 10
- balance target: boss kill at level 10 with reasonable gear

**Chassis**
- 3 chassis: Fighter, Rogue, Sorcerer
- each has a main stat and a secondary benefit

**Stats**
- primary: STR / DEX / INT
- common: Luck / HP / Armor
- main stat boosts damage; each main stat has a secondary benefit

**Items**
Per chassis:
- 10 common weapons + 10 common armors
- 3 rare weapons + 3 rare armors
- 1 legendary weapon (boss drop only; not sold in merchant)

**Menus**
- Questing
- Merchant
- Dungeon (boss)
- PvP (friends gimmick)
- Group (labelable as guild/clan/crew; lite roster ok)

**Customization**
- chassis selection
- custom character name
- portrait upload/URL (friends‑only playtest assumption)

### 8.3 The “gear chase” requirement for unarmed archetypes
Even “no weapon” fantasies must support min‑maxing.
Implementation approach:
- internally define functional slots (Attack Source, Defense Layer)
- expose as Weapon/Armor in MVP UI if desired
- provide item families:
  - weapon: sword/bow/staff
  - focus: beads/seal/orb
  - unarmed_focus: wraps/gauntlets
  - defense: armor/shroud/robe
So Netero‑like characters still chase optimal Attack Source and Defense items.

---

## 9) Creative depth strategy (post‑MVP)

### 9.1 Bounded combinatorics
To avoid “all fables feel the same,” creators need meaningful differentiation without bespoke coding.

Planned structure:
- chassis + slots + tag‑gated item pools
- ability/modules pool with tags
- templates with parameters (dot template, stun template, projectile template, etc.)
- validators enforce budgets and constraints
- creators can reflavor names/icons/VFX to match theme

### 9.2 VFX at scale
High polish only where it matters:
- primary attacks: small set of high‑quality “Attack Styles” + reskin packs
- status effects: shared mechanics + different skins (bleed/poison/burn)

---

## 10) Modes beyond games (future)

### 10.1 FRP session mode (narration‑heavy)
A structured narration experience:
- acts/scenes/beats
- canon retrieval and consistency checks
- branching flags + consequences
- transcript and chapter outputs
- review gates for canon updates

### 10.2 Export modes
- “Lore book” exports (markdown/PDF)
- TRPG exports (D&D/Fate)
- timeline/relationship graph exports

---

## 11) AI services (product + portfolio narrative)

AI is intended as applied AI engineering (structured generation + validation), not “chat and copy/paste.”

Phased AI services:
1) **Balancing assistant**
   - simulation / monte carlo over builds and loot curves
   - flag outliers
   - suggest safe knobs and parameter adjustments
2) **Lore copilot**
   - structured canon workspace
   - generate quests/NPCs/factions/events linked and searchable
   - contradiction checks and version history
3) **Describe‑a‑class builder**
   - natural language → valid build assembled from chassis/modules within constraints
   - offers multiple variants; user can edit
4) **Asset generation (later)**
   - items/monsters art with strong style consistency
5) **Chronicles generator**
   - turn season event logs into readable chapters (or comic scripts)
6) **FRP session copilot**
   - run sessions with canon retrieval + consistency + structured outputs

Guideline:
- LLMs propose structure/flavor.
- deterministic code validates rules, economy integrity, and balance budgets.

---

## 12) Monetization direction (long‑term)

Not needed for MVP, but shapes strategy.

- Friends realms: small subscription; private fables; player caps.
- Public fables: creator subscription + promos; player cosmetics/season pass.
- Platform credits wallet (cross‑fable) is platform‑level and separate from mode currencies.
- Creator payouts only after integrity controls (verification, holds, anti‑fraud).

---

## 13) Risks + mitigations

1) **Disintermediation** (creator launches standalone)
   - mitigate via seasonal fables, discovery, live‑ops tools, archives/chronicles, multi‑mode reuse

2) **UGC balance drift**
   - mitigate via bounded templates, validators, budgets, balancing simulations

3) **VFX scale explosion**
   - mitigate via few polished attack styles + skins; status skins for variety

4) **Content rights / moderation**
   - mitigate via opt‑in canonization, naming/content rules, moderation for public fables

5) **Economy fraud (if credits/payouts)**
   - mitigate via ledgers, integrity checks, delayed payouts, platform wallet separation

---

## 14) Tech stack (current plan)

- Frontend: **React**
- Backend: **NestJS**
- DB: **Postgres**
- ORM/migrations: **Prisma**
- Storage: MVP uses portrait URLs; later object storage

Persistence pattern:
- `fables` table contains:
  - `canon_json` (JSONB)
  - `idle_rpg_config_json` (JSONB)
- runtime uses normalized tables:
  - characters, inventory, equipment, balances, quest state, ledger/events

---

## 15) Roadmap (phased)

Phase 0 — Canon foundation  
- canon schema (entities/tags/capabilities) + storage as JSONB
- minimal create‑fable flow generating canon + idle config

Phase 1 — Idle RPG friend prototype  
- quest → rewards → merchant → boss loop
- deterministic combat sim

Phase 2 — Persistent MVP  
- auth/join links
- inventory/equip
- boss legendary drop
- lite PvP + group roster

Phase 3 — Expression quality  
- primary attack styles + reskin packs
- reflavor tooling

Phase 4 — Realm differentiation engine  
- slots + tag pools + param templates + validators
- traits/weaknesses
- themed constraints without bespoke modules

Phase 5 — Seasonal fables  
- resets, leaderboards/brackets, mutators
- cosmetics

Phase 6 — Chronicles  
- event logging → story chapters
- opt‑in canonization of top players
- import to sequels as NPC templates

Phase 7 — More modes + exports  
- game modes: card/roguelike/…
- non‑game modes: FRP session mode / GM copilot
- export modes: D&D/Fate packs + lore books

Phase 8 — Creator economy + platform credits  
- creator subs, promos
- wallet and integrity pipeline
- payouts later

---

## 16) Current MVP definition (short)

Build a playtestable idle RPG for friends where:
- a creator can create a fable (name/description)
- the server generates 20 quest monsters + 1 boss + starter item pools
- players create characters (fighter/rogue/sorcerer), level to 10 via quest loop
- players buy/equip gear, then beat the boss to earn a legendary
- PvP and group menu exist in a minimal form
- architecture remains canon‑first, mode‑scoped, runtime‑separate

---

## 17) Guidance to an AI copilot working on this project

When proposing features or implementations:
- maintain the canon/mode/runtime separation
- avoid hardcoding game‑specific fields into canon
- prefer bounded systems (templates, validators) over freeform scripting
- preserve gear chase even for “unarmed” fantasies by using item families and functional slots
- keep MVP small: ship a loop, then add depth

End of document.
