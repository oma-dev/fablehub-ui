# FableHub — Canon-First UGC Platform (Context Pack)

This document is a **single source of context** for AI copilots working on FableHub: product intent, architecture, MVP requirements, and the evolving “primitive mechanics” approach for Idle RPG.

---

## 0) One-liner

**FableHub is a canon-first UGC platform where creators build “Fables” (structured worlds with lore + entities + relationships + capabilities), and users experience those fables through multiple “Modes” (adapters).**  
Modes can be **games** (Idle RPG first; later card/roguelike/etc.) or **non-game activities** (narration-heavy FRP sessions, GM copilots, exports like D&D/Fate packs).

---

## 1) Product thesis

### 1.1 Core promise
> **Create a world once. Reuse it everywhere.**

A Fable is a portable source of truth (canon). Modes render that canon into different experiences and artifacts without rewriting the world.

### 1.2 Roblox-esque platform model
- Many Fables exist on the platform.
- Users discover fables via feeds (most played, trending, seasonal, new).
- Creators publish and maintain fables.
- Players join fables and participate in enabled modes.

**Important constraint:** successful long-run fables can be disintermediated (creators may ship standalone).  
**Platform moat direction:** emphasize platform-native advantages:
- seasonal cycles and resets
- discovery + distribution + growth loops
- integrity/anti-fraud infrastructure
- archives/chronicles (compounding content)
- multi-mode reuse + exports

---

## 2) Terminology

### 2.1 Fable
A **Fable** is a world/realm represented as structured **canon**:
- entities (characters, creatures, factions, locations, items, events, etc.)
- tags/ontology
- relationships
- capabilities (abstract verbs/powers)

### 2.2 Canon
**Canon** is mode-agnostic and must be portable across modes.

### 2.3 Mode (Adapter)
A **Mode** is a renderer/interpreter/export pipeline that consumes canon and produces:
- an interactive experience (game or non-game), and/or
- exported artifacts (packs, sheets, PDFs, etc.)

Examples:
- **Idle RPG Mode (MVP):** Shakes & Fidget-style quest loop with gear, boss, merchant, PvP, groups.
- **FRP Session Mode (future):** narration-heavy “session runner” with canon retrieval and consistency checks.
- **Export Modes (future):** D&D/Fate packs, markdown/PDF lore books.

### 2.4 Realm (Mode instance)
A **Realm** is a specific instance of a mode attached to a Fable (e.g., “this fable as an idle RPG realm”).  
A single Fable can have multiple realms over time (friends realm, public realm, seasonal realm, test realm).

### 2.5 Runtime
Runtime is mutable per-user/per-session state inside a specific realm:
- Idle RPG runtime: levels, inventory, balances, timers.
- FRP runtime: scene flags, transcripts, choice history.
- Export runtime: versions and diffs of generated artifacts.

### 2.6 Bounded creativity
FableHub prefers **bounded creativity** over freeform coding:
- creators combine templates/constraints and reflavor names/icons/VFX
- validators and simulation keep balance within bounds
- no arbitrary scripting in v1

---

## 3) Key design decisions

### 3.1 Canon vs Mode separation is non-negotiable
Canon is portable; mechanics are mode-scoped.

**Canon must NOT contain:**
- currencies
- XP curves
- combat numbers (HP/damage/armor)
- drop rates
- shop prices

Those live in the Mode Pack / Realm Pack.

### 3.2 Currency belongs to the mode
A Fable may have:
- multiple currencies in one game mode
- no currency in a non-game mode
- no economy at all (pure story/export)

Therefore currency is defined in the **Idle RPG realm pack**, never in canon.

**Platform credits** (Robux-like) are platform-level and separate from any fable/mode currency.

### 3.3 “No weapon” fantasies must still preserve gear chase
In S&F-likes, min-maxing gear is a major fun loop.  
So “unarmed” archetypes should NOT bypass gear. Instead:
- use functional slots: **Attack Source** and **Defense Layer**
- use different *item families* for flavor (beads/seals/wraps/aura shrouds), but the chase remains

### 3.4 No fixed “chassis”
We do not use “Fighter/Rogue/Sorcerer chassis” as a foundational concept.  
Creators define **Classes** by combining:
- equipment permissions (slot rules)
- scaling rules
- ability access (from primitive mechanics templates)
- resource type (optional)

---

## 4) Architecture overview

### 4.1 Three layers
1) **Fable Canon** (portable, mode-agnostic)
2) **Mode Catalog (Idle RPG primitives)** + **Realm Pack (realm-specific composition)**  
3) **Mode Runtime** (mutable per-user/per-session state)

---

## 5) Fable Canon (mode-agnostic)

### 5.1 Entities (minimum viable set)
Typical types:
- Character (templates, NPCs, archetypes)
- Creature (as lore entities)
- Item (as lore artifacts)
- Faction, Location, Event, Concept

### 5.2 Tags/ontology
Examples:
- `weapon:sword`, `weapon:bow`
- `element:fire`, `element:water`
- `theme:stealth`, `theme:holy`
- `species:vampire`, `species:werewolf`

### 5.3 Relationships
Examples:
- `member_of`, `enemy_of`, `ally_of`, `guards`, `located_in`, `wields`

### 5.4 Capabilities (abstract verbs)
Examples:
- `cut`, `strike`, `fire`, `invisibility`, `summon`, `domain`, `transform`, `dot`, `leech`, `teleport`

Adapters decide how to implement each capability.

---

## 6) Idle RPG Mode: newest “primitive mechanics” approach

We split Idle RPG into two sub-layers:

### 6.1 Idle RPG Catalog (mode-level primitives; reusable)
A global catalog defines **pure mechanics templates** and **presentation catalogs**.

**Catalog contains:**
- **Effect templates** (pure mechanics): `damage`, `heal`, `shield`, `buff`, `debuff`, `dot`, `hot`, `stun`, `silence`, `slow`, etc.
- **Delivery primitives**: target types + timing types (self/single/all; instant/duration/periodic)
- **Scaling models**: `flat`, `flat_plus_stat`, `ap_coeff`, `level_coeff`
- **Resource types**: `none`, `mana`, `rage`, `charges`
- **Slot types**: `attack_source`, `defense_layer` (later: relic/charm)
- **VFX/Icon catalogs**: reusable IDs (cosmetic only)
- **Validation rules**: guardrails (e.g., no stun with 0 cooldown)

**Important:** Catalog primitives are **raw**; they are not “fireball” or “sword slash.”  
“Fireball” is a *composition*: damage effect + projectile delivery + scaling + VFX.

### 6.2 Realm Pack (realm-specific composition)
A realm pack references the catalog and defines:
- realm rules (max level, XP table, combat preset)
- economy (currencies)
- **creator-defined abilities** (compositions of primitives)
- **classes** (which abilities are available, which slots are allowed, scaling defaults, loadout rules)
- items, creatures, quests, merchant, loot tables

---

## 7) Creator-defined Ability (composition format)

A custom ability is a mix of:
- **Effect template** + parameters
- **Delivery spec** (target + timing)
- **Scaling spec** (model + params; which stat)
- **Cost spec** (cooldown + resource cost)
- **Requirements** (equipped tags, stance, etc.)
- **Presentation** (VFX/icon + name/description)

Creators are free to label it as primary/regular/ultimate by placing it in different loadout slots.  
Mechanically it’s the same object.

---

## 8) Class definition in Idle RPG (using primitive abilities)

A class is defined by:
- **Slot rules** (equipment permissions)
- **Scaling defaults** (main stat, optional secondary benefits)
- **Loadout rules** (how many regular/passive/ultimate slots)
- **Ability access** (allowed ability IDs or tags)
- **Constraints/weaknesses** (optional)
- **Resource type** (optional)

Primary attack is not a special hardcoded move; it can be:
- an always-available “basic attack” ability composition, OR
- simply a default attack style + an implicit damage action (MVP choice)

---

## 9) MVP scope (Idle RPG, no LLM; creator provides data)

### 9.1 MVP goals
Deliver a friends-playtestable idle RPG realm with:
- complete gameplay loop
- persistence
- minimal but coherent creator setup
- architecture compatible with future modes and catalogs

### 9.2 MVP play loop
Player can:
- pick a fable → open an Idle RPG realm
- create a character: pick class, upload portrait, choose name
- do quests, earn XP/currency, buy/equip items
- attempt boss, earn legendary boss reward
- use merchant; optional lite PvP and group roster

### 9.3 MVP minimum content requirements (manual)
Per Idle RPG realm:
- at least 1 currency (if merchant exists)
- at least 3 classes (recommended)
- items:
  - common/rare progression + boss legendary rewards (counts flexible but must support gear chase)
- creatures:
  - quest creatures + boss creature
- quests:
  - quest list referencing creatures, with durations and rewards
- merchant:
  - listings referencing item templates; no legendary
- loot tables:
  - boss loot table that awards legendary appropriately

**Note:** Abilities can be minimal (or omitted) in the earliest MVP.  
But the catalog + composition model should exist even if you only define “damage” and “heal” at first.

---

## 10) Future “Culling Games” format (planned)

A flagship fable concept: **Culling Games** (JJK-inspired).

Mechanic format:
- players are assigned a random build at entry (“wake up with a cursed technique”)
- build is formed by random selection of primitive compositions (passive/ability/weakness/slot rules/etc.)
- later, an LLM can reflavor/rename the mechanics as:
  - Cursed Technique
  - Reversal
  - Maximum
  - Domain Expansion + random hand sign
MVP can run without LLM: random mechanics only + generic labels.

---

## 11) Modes beyond games (future)

### 11.1 FRP session mode (narration-heavy)
A structured narration experience:
- acts/scenes/beats
- canon retrieval and consistency checks
- branching flags + consequences
- transcripts and chapter outputs
- review gates for canon updates

### 11.2 Export modes
- lore book exports (markdown/PDF)
- TRPG exports (D&D/Fate)
- timeline/relationship graph exports

---

## 12) AI services (future phases; not required for MVP)

AI is positioned as applied AI engineering (structured generation + validation), not “chat and copy/paste.”

Planned services:
1) balancing assistant (simulation + validators)
2) lore copilot (structured canon + contradiction checks)
3) describe-a-class builder (NL → valid class built from primitives)
4) asset generation (style-consistent item/monster images)
5) chronicles generator (season logs → chapters/comic scripts)
6) FRP session copilot (narration + canon retrieval + write-back gating)

---

## 13) Risks + mitigations

- disintermediation → seasonal focus + discovery + live-ops + archives
- UGC balance drift → bounded primitives + validators + simulation
- VFX scale → few attack styles + skins; status skins for variety
- content rights → opt-in canonization for chronicles, naming rules, moderation
- economy fraud → ledgers, holds, integrity checks

---

## 14) Tech stack (current plan)

- Frontend: **React**
- Backend: **NestJS**
- DB: **Postgres**
- ORM/migrations: **Prisma**
- Storage: MVP uses portrait URLs; later object storage

Persistence pattern:
- `fables` store canon JSON
- `idle_rpg_catalog` stores mode-level primitive templates + VFX/icon catalogs (versioned)
- `idle_rpg_realms` store realm pack JSON (versioned) referencing a catalog version
- runtime is stored separately (characters, inventory/equipment, balances, quest state; plus optional ledger)

---

## 15) Roadmap (phased)

Phase 0 — Canon + Idle RPG Catalog foundation  
- canon schema + storage
- seed Idle RPG Catalog v1 (effect templates, scaling models, delivery options, vfx/icon list, basic validations)

Phase 1 — Idle RPG friend prototype  
- realm creation + character creation + quest loop + merchant + boss

Phase 2 — Persistent MVP + editors  
- per-realm editor forms (abilities/classes/items/creatures/quests/merchant/loot)

Phase 3 — Expression quality  
- expand VFX packs and attack styles; reflavor tooling

Phase 4 — Realm differentiation engine  
- validators, budgets, constraints, traits/weaknesses

Phase 5 — Seasonal fables  
- resets, leaderboards/brackets, mutators, cosmetics

Phase 6 — Chronicles  
- event logging → story chapters; opt-in canon characters; import NPC templates into sequels

Phase 7 — More modes + exports  
- game modes + FRP session mode + export modes

Phase 8 — Creator economy + platform credits  
- promos, wallet, integrity pipeline, payouts later

---

## 16) Guidance to AI copilots

When proposing features/implementations:
- maintain canon/mode/runtime separation
- don’t put game/economy fields into canon
- treat Idle RPG catalog as versioned JSON and realm packs as compositions referencing it
- keep primitives raw (damage/heal/stun/etc.); “fireball/slash” should be an ability composition + VFX, not a primitive
- preserve gear chase even for “unarmed” fantasies via slot rules and item families
- keep MVP small: ship loop first, then add depth
