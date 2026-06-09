export type ViewId = 'cockpit' | 'map' | 'travel' | 'encounter' | 'journal' | 'ship' | 'radio';

export type ResourceKey = 'fuel' | 'supplies' | 'hull' | 'credits';

export type SystemTag = 'Station' | 'Signal' | 'Survey Site' | 'Anomaly' | 'Quiet Zone';

export type JournalCategory =
  | 'Stellar Phenomena'
  | 'Signals'
  | 'Planetary Notes'
  | 'Biological Oddities'
  | 'Traveler Reports'
  | 'Unresolved Patterns';

export type JournalStatus = 'New' | 'Under Review' | 'Connected' | 'Unresolved';

export interface StarSystem {
  id: string;
  name: string;
  distance: number;
  travelCost: number;
  tags: SystemTag[];
  known: boolean;
  description: string;
  encounterIds: string[];
  position: {
    x: number;
    y: number;
  };
}

export interface EncounterChoice {
  id: string;
  label: string;
  resultText: string;
  resourceDelta?: Partial<Record<ResourceKey, number>>;
  journalEntryIds?: string[];
  unlockSystemIds?: string[];
  radioMessageIds?: string[];
  mysteryDelta?: number;
}

export interface Encounter {
  id: string;
  title: string;
  systemId: string;
  description: string;
  choices: EncounterChoice[];
}

export interface JournalEntry {
  id: string;
  title: string;
  category: JournalCategory;
  observation: string;
  location: string;
  relatedDiscoveries: string[];
  status: JournalStatus;
}

export interface RadioMessage {
  id: string;
  source: string;
  text: string;
  tone: 'ambient' | 'job' | 'mystery' | 'safety';
}

export interface ShipUpgrade {
  id: string;
  name: string;
  description: string;
  cost: number;
  installed: boolean;
}

export interface Resources {
  fuel: number;
  supplies: number;
  hull: number;
  credits: number;
}

export interface PlayerState {
  resources: Resources;
  currentSystemId: string;
  activeTravel?: ActiveTravelState;
  discoveredSystemIds: string[];
  completedEncounterIds: string[];
  journalEntryIds: string[];
  readJournalEntryIds: string[];
  viewedLeadIds: string[];
  radioHistoryIds: string[];
  mysteryProgress: number;
  emergencyTowUsed: boolean;
}

export interface TravelState {
  fromSystemId: string;
  toSystemId: string;
  encounterId: string;
}

export interface ActiveTravelState extends TravelState {
  departedAt: number;
  arrivesAt: number;
  durationMs: number;
}
