import { STARTING_SYSTEM_ID } from '../data/systems';
import { defaultRadioIds } from '../data/radio';
import type { PlayerState, Resources } from '../types/game';

const SAVE_KEY = 'among-quiet-stars.save.v1';

const unique = <T>(items: T[]) => Array.from(new Set(items));

const initialResources: Resources = {
  fuel: 72,
  supplies: 18,
  hull: 96,
  credits: 85
};

export const createInitialState = (): PlayerState => ({
  resources: { ...initialResources },
  currentSystemId: STARTING_SYSTEM_ID,
  discoveredSystemIds: ['lumen-rest', 'vela-rest', 'marrowlight', 'pale-current', 'kites-end', 'orison-belt', 'tallow-star'],
  completedEncounterIds: [],
  journalEntryIds: [],
  readJournalEntryIds: [],
  radioHistoryIds: [...defaultRadioIds],
  mysteryProgress: 0,
  emergencyTowUsed: false
});

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

    return {
      resources: { ...initial.resources, ...parsed.resources },
      currentSystemId: parsed.currentSystemId ?? initial.currentSystemId,
      activeTravel: parsed.activeTravel,
      discoveredSystemIds: unique([...initial.discoveredSystemIds, ...(parsed.discoveredSystemIds ?? [])]),
      completedEncounterIds: parsed.completedEncounterIds ?? initial.completedEncounterIds,
      journalEntryIds: parsed.journalEntryIds ?? initial.journalEntryIds,
      readJournalEntryIds: parsed.readJournalEntryIds ?? initial.readJournalEntryIds,
      radioHistoryIds: parsed.radioHistoryIds ?? initial.radioHistoryIds,
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
