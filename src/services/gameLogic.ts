import { encounters } from '../data/encounters';
import { getJobForEncounter, jobs } from '../data/jobs';
import { ambientRadioIds } from '../data/radio';
import { getSystem, STARTING_SYSTEM_ID, systems } from '../data/systems';
import type {
  Activity,
  Encounter,
  EncounterChoice,
  PlayerState,
  Resources,
  ServiceId,
  StarSystem
} from '../types/game';
import type { CurrentLead } from './leads';

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
const pickRandom = <T>(items: T[]) => items[Math.floor(Math.random() * items.length)];
export const MAX_ACTIVE_JOBS = 3;

export const serviceDefinitions: Record<
  ServiceId,
  { title: string; description: string; cost: number; resource: keyof Resources; amount: number }
> = {
  refuel: {
    title: 'Refuel',
    description: 'Transfer up to 20 fuel from the station reserve.',
    cost: 15,
    resource: 'fuel',
    amount: 20
  },
  resupply: {
    title: 'Resupply',
    description: 'Load up to 8 units of food, filters, and field materials.',
    cost: 12,
    resource: 'supplies',
    amount: 8
  },
  repair: {
    title: 'Repair Hull',
    description: 'Patch up to 15 points of hull damage.',
    cost: 18,
    resource: 'hull',
    amount: 15
  }
};

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

export const getAvailableJobs = (state: PlayerState) =>
  jobs.filter((job) => job.id === state.currentJobOfferId);

export const getAcceptedJobs = (state: PlayerState) =>
  jobs.filter((job) => state.acceptedJobIds.includes(job.id));

const maybeReceiveRadioTraffic = (state: PlayerState): PlayerState => {
  let nextState = state;
  const unseenAmbientIds = ambientRadioIds.filter((messageId) => !state.radioHistoryIds.includes(messageId));

  if (unseenAmbientIds.length > 0 && Math.random() < 0.42) {
    const ambientId = pickRandom(unseenAmbientIds);
    if (ambientId) {
      nextState = {
        ...nextState,
        radioHistoryIds: unique([...nextState.radioHistoryIds, ambientId])
      };
    }
  }

  if (!nextState.currentJobOfferId && nextState.acceptedJobIds.length < MAX_ACTIVE_JOBS && Math.random() < 0.62) {
    const eligibleJobs = jobs.filter(
      (job) =>
        job.revealAfterCompletedJobs <= nextState.completedJobIds.length &&
        !nextState.acceptedJobIds.includes(job.id) &&
        !nextState.completedJobIds.includes(job.id) &&
        !nextState.seenJobOfferIds.includes(job.id)
    );
    const job = pickRandom(eligibleJobs);
    if (job) {
      nextState = {
        ...nextState,
        currentJobOfferId: job.id,
        seenJobOfferIds: unique([...nextState.seenJobOfferIds, job.id])
      };
    }
  }

  return nextState;
};

export const acceptJob = (state: PlayerState, jobId: string): PlayerState => {
  if (
    state.acceptedJobIds.includes(jobId) ||
    state.completedJobIds.includes(jobId) ||
    state.acceptedJobIds.length >= MAX_ACTIVE_JOBS ||
    state.currentJobOfferId !== jobId
  ) {
    return state;
  }

  return {
    ...state,
    acceptedJobIds: [...state.acceptedJobIds, jobId],
    currentJobOfferId: undefined
  };
};

export const getActivitiesForSystem = (
  systemId: string,
  state: PlayerState,
  currentLead: CurrentLead
): Activity[] => {
  const system = getSystem(systemId);
  const activities: Activity[] = [];
  const usedEncounterIds = new Set<string>();

  if (currentLead.destinationId === systemId && currentLead.encounterId) {
    activities.push({
      id: `lead:${currentLead.id}`,
      kind: 'lead',
      title: currentLead.title,
      description: currentLead.description,
      encounterId: currentLead.encounterId
    });
    usedEncounterIds.add(currentLead.encounterId);
  }

  state.acceptedJobIds.forEach((jobId) => {
    const job = jobs.find((candidate) => candidate.id === jobId);
    if (!job || job.destinationId !== systemId || state.completedJobIds.includes(job.id)) {
      return;
    }
    activities.push({
      id: `job:${job.id}`,
      kind: 'job',
      title: job.title,
      description: `Requested by ${job.source}.`,
      encounterId: job.encounterId
    });
    usedEncounterIds.add(job.encounterId);
  });

  system.encounterIds.forEach((encounterId) => {
    const encounter = encounters.find((candidate) => candidate.id === encounterId);
    if (
      !encounter ||
      usedEncounterIds.has(encounter.id) ||
      state.completedEncounterIds.includes(encounter.id)
    ) {
      return;
    }
    activities.push({
      id: `encounter:${encounter.id}`,
      kind: 'encounter',
      title: encounter.title,
      description: encounter.description,
      encounterId: encounter.id
    });
  });

  if (system.tags.includes('Station')) {
    (Object.keys(serviceDefinitions) as ServiceId[]).forEach((serviceId) => {
      const service = serviceDefinitions[serviceId];
      activities.push({
        id: `service:${serviceId}`,
        kind: 'service',
        title: service.title,
        description: `${service.description} Costs ${service.cost} credits.`,
        serviceId
      });
    });
  }

  return activities;
};

export const meetsResourceRequirements = (resources: Resources, choice: EncounterChoice) =>
  Object.entries(choice.resourceRequirements ?? {}).every(
    ([key, required]) => resources[key as keyof Resources] >= (required ?? 0)
  );

export const getMissingResourceRequirement = (resources: Resources, choice: EncounterChoice) => {
  const missing = Object.entries(choice.resourceRequirements ?? {}).find(
    ([key, required]) => resources[key as keyof Resources] < (required ?? 0)
  );
  return missing ? `Requires ${missing[1]} ${missing[0]}` : undefined;
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

  return maybeReceiveRadioTraffic({
    ...state,
    resources: {
      ...state.resources,
      fuel: fuelAfterTravel
    },
    currentSystemId: destination.id,
    discoveredSystemIds: unique([...state.discoveredSystemIds, destination.id])
  });
};

export const resolveChoice = (state: PlayerState, encounter: Encounter, choice: EncounterChoice): PlayerState => {
  if (!meetsResourceRequirements(state.resources, choice)) {
    return state;
  }

  const job = getJobForEncounter(encounter.id);
  return maybeReceiveRadioTraffic({
    ...state,
    resources: applyResourceDelta(state.resources, choice.resourceDelta),
    completedEncounterIds: unique([...state.completedEncounterIds, encounter.id]),
    completedJobIds: job ? unique([...state.completedJobIds, job.id]) : state.completedJobIds,
    acceptedJobIds: job ? state.acceptedJobIds.filter((jobId) => jobId !== job.id) : state.acceptedJobIds,
    journalEntryIds: unique([...state.journalEntryIds, ...(choice.journalEntryIds ?? [])]),
    radioHistoryIds: unique([...state.radioHistoryIds, ...(choice.radioMessageIds ?? [])]),
    discoveredSystemIds: unique([...state.discoveredSystemIds, ...(choice.unlockSystemIds ?? [])]),
    mysteryProgress: Math.min(6, state.mysteryProgress + (choice.mysteryDelta ?? 0))
  });
};

export const canUseService = (state: PlayerState, serviceId: ServiceId) => {
  const service = serviceDefinitions[serviceId];
  return state.resources.credits >= service.cost && state.resources[service.resource] < RESOURCE_LIMITS[service.resource];
};

export const applyService = (state: PlayerState, serviceId: ServiceId): PlayerState => {
  if (!canUseService(state, serviceId)) {
    return state;
  }

  const service = serviceDefinitions[serviceId];
  return {
    ...state,
    resources: applyResourceDelta(state.resources, {
      credits: -service.cost,
      [service.resource]: service.amount
    })
  };
};

export const getAppliedResourceDelta = (before: Resources, after: Resources) =>
  (Object.keys(before) as Array<keyof Resources>).reduce<Partial<Record<keyof Resources, number>>>(
    (delta, key) => {
      const change = after[key] - before[key];
      if (change !== 0) {
        delta[key] = change;
      }
      return delta;
    },
    {}
  );

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
