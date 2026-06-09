import { getSystem } from '../data/systems';
import type { PlayerState, ViewId } from '../types/game';

export interface CurrentLead {
  id: string;
  title: string;
  description: string;
  destinationId?: string;
  actionView: ViewId;
  ctaLabel: string;
  encounterId?: string;
}

export const getCurrentLead = (state: PlayerState): CurrentLead => {
  if (!state.journalEntryIds.includes('quiet-moon-shadow')) {
    return {
      id: 'tallow-star-pulse',
      title: 'A Soft Pulse from Tallow Star',
      description: 'Unusual readings have been reported near a quiet amber star at the sector edge.',
      destinationId: 'tallow-star',
      actionView: 'map',
      ctaLabel: 'Plot Course',
      encounterId: 'quiet-moon'
    };
  }

  if (!state.journalEntryIds.includes('pulse-at-vela')) {
    return {
      id: 'vela-rest-pulse',
      title: 'Vela Rest Logged a Brief Pulse',
      description: 'Survey crews keep comparing notes about one clean flash in otherwise calm instruments.',
      destinationId: 'vela-rest',
      actionView: 'map',
      ctaLabel: 'Plot Course',
      encounterId: 'brief-pulse'
    };
  }

  if (!state.discoveredSystemIds.includes('bluewake')) {
    return {
      id: 'kites-end-rumor',
      title: "Kite's End Has a Rumor",
      description: 'A survey cook heard two labs argue about synchronized readings from distant stars.',
      destinationId: 'kites-end',
      actionView: 'map',
      ctaLabel: 'Follow Rumor',
      encounterId: 'travelers-rumor'
    };
  }

  if (!state.journalEntryIds.includes('second-bluewake-pulse')) {
    return {
      id: 'bluewake-comparison',
      title: 'Compare the Bluewake Reading',
      description: 'Glass Harbor wants confirmation that a second pulse matches the first impossible timestamp.',
      destinationId: 'bluewake',
      actionView: 'map',
      ctaLabel: 'Plot Course',
      encounterId: 'second-pulse'
    };
  }

  if (!state.journalEntryIds.includes('pulse-comparison')) {
    return {
      id: 'journal-pulse-comparison',
      title: 'Two Notes Want a Thread',
      description: 'Your journal has enough clues to compare the pulse events without forcing an answer.',
      actionView: 'journal',
      ctaLabel: 'Review Journal'
    };
  }

  if (!state.journalEntryIds.includes('misplaced-star')) {
    return {
      id: 'glass-harbor-memory',
      title: 'Glass Harbor Remembers',
      description: 'The matched timestamps point toward an old listening post whose windows keep a different map.',
      destinationId: 'glass-harbor',
      actionView: 'map',
      ctaLabel: 'Plot Course',
      encounterId: 'out-of-place-star'
    };
  }

  return {
    id: 'prototype-complete',
    title: 'A Pattern, Not an Answer',
    description: 'The pulse logs and Glass Harbor observation now share a thread. The quiet mystery will continue beyond this prototype.',
    actionView: 'journal',
    ctaLabel: 'Review Journal'
  };
};

export const getLeadDestinationName = (lead: CurrentLead) =>
  lead.destinationId ? getSystem(lead.destinationId).name : 'Journal';
