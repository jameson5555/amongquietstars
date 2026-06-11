import { STARTING_SYSTEM_ID } from '../data/systems';
import { defaultRadioIds } from '../data/radio';
import { jobs } from '../data/jobs';
import type { PlayerState, Resources } from '../types/game';

const SAVE_KEY = 'among-quiet-stars.save.v1';

const unique = <T>(items: T[]) => Array.from(new Set(items));
const pickRandom = <T>(items: T[]) => items[Math.floor(Math.random() * items.length)];

const initialResources: Resources = {
  fuel: 72,
  supplies: 18,
  hull: 96,
  credits: 85
};

export const createInitialState = (): PlayerState => {
  const initialJobOffer = pickRandom(jobs.filter((job) => job.revealAfterCompletedJobs === 0));
  return {
    resources: { ...initialResources },
    currentSystemId: STARTING_SYSTEM_ID,
    discoveredSystemIds: ['lumen-rest', 'vela-rest', 'marrowlight', 'pale-current', 'kites-end', 'orison-belt', 'tallow-star'],
    completedEncounterIds: [],
    journalEntryIds: [],
    readJournalEntryIds: [],
    viewedLeadIds: [],
    actedLeadIds: [],
    radioHistoryIds: [...defaultRadioIds],
    acceptedJobIds: [],
    completedJobIds: [],
    currentJobOfferId: initialJobOffer?.id,
    seenJobOfferIds: initialJobOffer ? [initialJobOffer.id] : [],
    mysteryProgress: 0,
    emergencyTowUsed: false
  };
};

const isBrowser = () => typeof window !== 'undefined' && Boolean(window.localStorage);

export const loadPlayerState = (): PlayerState => {
  if (!isBrowser()) {
    return createInitialState();
  }

  const saved = window.localStorage.getItem(SAVE_KEY);
  if (!saved) {
    return createInitialState();
  }

  try {
    const parsed = JSON.parse(saved) as Partial<PlayerState>;
    const initial = createInitialState();

    const completedJobIds = parsed.completedJobIds ?? initial.completedJobIds;
    const acceptedJobIds = parsed.acceptedJobIds ?? initial.acceptedJobIds;
    const seenJobOfferIds = parsed.seenJobOfferIds ?? [
      ...acceptedJobIds,
      ...completedJobIds,
      ...(parsed.currentJobOfferId ? [parsed.currentJobOfferId] : [])
    ];
    const migratedOffer = parsed.currentJobOfferId ?? (
      acceptedJobIds.length < 3
        ? pickRandom(
          jobs.filter(
            (job) =>
              job.revealAfterCompletedJobs <= completedJobIds.length &&
              !acceptedJobIds.includes(job.id) &&
              !completedJobIds.includes(job.id) &&
              !seenJobOfferIds.includes(job.id)
          )
        )?.id
        : undefined
    );

    return {
      resources: { ...initial.resources, ...parsed.resources },
      currentSystemId: parsed.currentSystemId ?? initial.currentSystemId,
      activeTravel: parsed.activeTravel,
      discoveredSystemIds: unique([...initial.discoveredSystemIds, ...(parsed.discoveredSystemIds ?? [])]),
      completedEncounterIds: parsed.completedEncounterIds ?? initial.completedEncounterIds,
      journalEntryIds: parsed.journalEntryIds ?? initial.journalEntryIds,
      readJournalEntryIds: parsed.readJournalEntryIds ?? initial.readJournalEntryIds,
      viewedLeadIds: parsed.viewedLeadIds ?? initial.viewedLeadIds,
      actedLeadIds: parsed.actedLeadIds ?? initial.actedLeadIds,
      radioHistoryIds: parsed.radioHistoryIds ?? initial.radioHistoryIds,
      acceptedJobIds,
      completedJobIds,
      currentJobOfferId: migratedOffer,
      seenJobOfferIds: unique([...seenJobOfferIds, ...(migratedOffer ? [migratedOffer] : [])]),
      mysteryProgress: parsed.mysteryProgress ?? initial.mysteryProgress,
      emergencyTowUsed: parsed.emergencyTowUsed ?? initial.emergencyTowUsed
    };
  } catch {
    return createInitialState();
  }
};

export const savePlayerState = (state: PlayerState) => {
  if (isBrowser()) {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }
};

export const resetPlayerState = () => {
  if (isBrowser()) {
    window.localStorage.removeItem(SAVE_KEY);
  }
};
