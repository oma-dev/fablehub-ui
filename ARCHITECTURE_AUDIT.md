# Architecture Audit (Post Hard-Cutover)

## Scope
This audit captures the frontend architecture after the IdleRPG-first refactor pass.

## Current Topology
- `src/app`: routing and application composition.
- `src/features`: feature-level public APIs and replay/editor domains.
- `src/shared`: cross-feature shared infrastructure (`shared/api`).

## Key Improvements
- Added path aliases: `@app`, `@features`, `@shared`.
- Added feature API modules:
  - `features/idle-rpg/api`
  - `features/fables/api`
- Migrated route/component imports away from deep `services/api` imports to feature public APIs.
- Added shared replay card primitives (`ReplayPortrait`, `ReplayHpBar`, `ReplayResourceBar`, `ReplayStatusEffectIcons`) and reused them in:
  - `CombatReplay.tsx`
  - `RaidReplayView.tsx`
- Added barrel exports for feature/shared replay modules.

## Remaining Risks / Debt
- `services/api.ts` is still the underlying source of endpoint/type definitions; feature API wrappers are established and can be split further without call-site churn.
- Create/Edit realm screens are still large and should be unified behind a shared editor screen in the next pass.

## Validation
- `npm run build` passes.
