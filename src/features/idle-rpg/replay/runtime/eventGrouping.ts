import type { CombatTurnEvent } from '@features/idle-rpg/api'

export interface EventGroup {
  kind: 'cast' | 'ambient'
  key?: string
  events: CombatTurnEvent[]
}

/**
 * Groups turn events by cast (preferred) and falls back to legacy ability/source grouping.
 */
export function groupCombatTurnEvents(events: CombatTurnEvent[]): EventGroup[] {
  const groups: EventGroup[] = []

  for (const event of events) {
    const previousGroup = groups[groups.length - 1]
    const key =
      event.castId
        ? `cast:${event.castId}`
        : event.type === 'block' && previousGroup?.kind === 'cast'
          ? previousGroup.key
          : event.abilityId
            ? `legacy:${event.sourceId}:${event.abilityId}`
            : undefined

    if (!key) {
      groups.push({ kind: 'ambient', events: [event] })
      continue
    }

    if (previousGroup?.kind === 'cast' && previousGroup.key === key) {
      previousGroup.events.push(event)
      continue
    }

    groups.push({ kind: 'cast', key, events: [event] })
  }

  return groups
}

