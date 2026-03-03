# Refactor Plan (Executed + Next)

## Executed Batches

### Batch 1
- Added architecture scaffolding for `features/shared` and alias-based import strategy.

### Batch 6
- Added split API boundaries:
  - `src/shared/api/httpClient.ts`
  - `src/features/idle-rpg/api/index.ts`
  - `src/features/fables/api/index.ts`
- Migrated IdleRPG and Fables route imports to feature API modules.

### Batch 8
- Consolidated replay card primitives into a shared UI module:
  - `src/features/idle-rpg/replay/ui/ReplayCardPrimitives.tsx`
- Rewired both combat and raid replay components to this shared module.

### Batch 9
- Added/used feature and shared barrel exports to reduce deep import coupling.

## Ongoing Follow-ups
- Extract `services/api.ts` internals into feature-specific endpoint/type files under `features/*/api/*`.
- Merge IdleRPG create/edit realm screens into a shared `IdleRpgRealmEditorScreen` and mode-specific shells.
- Add lint rule enforcement for boundary imports (`no-restricted-imports` across app/features/shared).

## Acceptance Status
- Build: passing.
