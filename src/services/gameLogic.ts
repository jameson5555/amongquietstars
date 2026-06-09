import { encounters } from '../data/encounters';
import { getSystem, STARTING_SYSTEM_ID, systems } from '../data/systems';
import type { Encounter, EncounterChoice, PlayerState, Resources, StarSystem } from '../types/game';

const RESOURCE_LIMITS: Resources = {
  fuel: 100,
  supplies: 40,
  hull: 100,
  credits: 999
};

const clampResource = (key: keyof Resources, value: number) => Math.max(0, Math.min(RESOURCE_LIMITS[key], value));

export const applyResourceDelta = (resources: Resources, delta: EncounterChoice['resourceDelta'] = {}): Resources => ({
  fuel: clampResource('fuel', resources.fuel + (delta.fuel ?? 0)),
  supplies: clampResource('supplies', resources.supplies + (delta.supplies ?? 0)),
  hull: clampResource('hull', resources.hull + (delta.hull ?? 0)),
  credits: clampResource('credits', resources.credits + (delta.credits ?? 0))
});

const unique = <T>(items: T[]) => Array.from(new Set(items));

const PULSE_COMPARISON_ENTRY_ID = 'pulse-comparison';
const PULSE_COMPARISON_PREREQUISITES = ['pulse-at-vela', 'second-bluewake-pulse'];

export const getVisibleSystems = (state: PlayerState): StarSystem[] =>
  systems.map((system) => ({
    ...system,
    known: state.discoveredSystemIds.includes(system.id)
  }));

export const getTravelSpeedMultiplier = (state: PlayerState) => {
  void state;
  return 1;
};

export const getTravelDurationMs = (destination: StarSystem, state: PlayerState) => {
  const baseMs = 30_000 + destination.distance * 10_000;
  const cappedMs = Math.min(120_000, baseMs);
  return Math.round(cappedMs / getTravelSpeedMultiplier(state));
};

export const pickEncounterForSystem = (systemId: string, state: PlayerState): Encounter => {
  const system = getSystem(systemId);
  const firstUncompleted = system.encounterIds
    .map((encounterId) => encounters.find((encounter) => encounter.id === encounterId))
    .find((encounter) => encounter && !state.completedEncounterIds.includes(encounter.id));

  if (firstUncompleted) {
    return firstUncompleted;
  }

  return encounters.find((encounter) => encounter.systemId === systemId) ?? encounters[0]!;
};

export const beginTravel = (state: PlayerState, destination: StarSystem): PlayerState => {
  const fuelAfterTravel = state.resources.fuel - destination.travelCost;

  if (fuelAfterTravel < 5) {
    return {
      ...state,
      resources: {
        ...state.resources,
        fuel: 42,
        credits: Math.max(0, state.resources.credits - 20)
      },
      currentSystemId: STARTING_SYSTEM_ID,
      journalEntryIds: unique([...state.journalEntryIds, 'tow-note']),
      radioHistoryIds: unique([...state.radioHistoryIds, 'tow-safe']),
      emergencyTowUsed: true
    };
  }

  return {
    ...state,
    resources: {
      ...state.resources,
      fuel: fuelAfterTravel
    },
    currentSystemId: destination.id,
    discoveredSystemIds: unique([...state.discoveredSystemIds, destination.id])
  };
};

export const resolveChoice = (state: PlayerState, encounter: Encounter, choice: EncounterChoice): PlayerState => ({
  ...state,
  resources: applyResourceDelta(state.resources, choice.resourceDelta),
  completedEncounterIds: unique([...state.completedEncounterIds, encounter.id]),
  journalEntryIds: unique([...state.journalEntryIds, ...(choice.journalEntryIds ?? [])]),
  radioHistoryIds: unique([...state.radioHistoryIds, ...(choice.radioMessageIds ?? [])]),
  discoveredSystemIds: unique([...state.discoveredSystemIds, ...(choice.unlockSystemIds ?? [])]),
  mysteryProgress: Math.min(6, state.mysteryProgress + (choice.mysteryDelta ?? 0))
});

export const canComparePulseLogs = (state: PlayerState) =>
  !state.journalEntryIds.includes(PULSE_COMPARISON_ENTRY_ID) &&
  PULSE_COMPARISON_PREREQUISITES.every((entryId) => state.journalEntryIds.includes(entryId));

export const comparePulseLogs = (state: PlayerState): PlayerState => {
  if (!canComparePulseLogs(state)) {
    return state;
  }

  return {
    ...state,
    journalEntryIds: unique([...state.journalEntryIds, PULSE_COMPARISON_ENTRY_ID]),
    readJournalEntryIds: unique([...state.readJournalEntryIds, PULSE_COMPARISON_ENTRY_ID]),
    discoveredSystemIds: unique([...state.discoveredSystemIds, 'glass-harbor']),
    mysteryProgress: Math.min(6, state.mysteryProgress + 1)
  };
};
