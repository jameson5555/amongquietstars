import { getSystem } from '../data/systems';
import type { PlayerState, ViewId } from '../types/game';

export interface CurrentLead {
  title: string;
  description: string;
  destinationId?: string;
  actionView: ViewId;
  ctaLabel: string;
}

export const getCurrentLead = (state: PlayerState): CurrentLead => {
  if (!state.journalEntryIds.includes('quiet-moon-shadow')) {
    return {
      title: 'A Soft Pulse from Tallow Star',
      description: 'Unusual readings have been reported near a quiet amber star at the sector edge.',
      destinationId: 'tallow-star',
      actionView: 'map',
      ctaLabel: 'Plot Course'
    };
  }

  if (!state.journalEntryIds.includes('pulse-at-vela')) {
    return {
      title: 'Vela Rest Logged a Brief Pulse',
      description: 'Survey crews keep comparing notes about one clean flash in otherwise calm instruments.',
      destinationId: 'vela-rest',
      actionView: 'map',
      ctaLabel: 'Plot Course'
    };
  }

  if (!state.discoveredSystemIds.includes('bluewake')) {
    return {
      title: "Kite's End Has a Rumor",
      description: 'A survey cook heard two labs argue about synchronized readings from distant stars.',
      destinationId: 'kites-end',
      actionView: 'map',
      ctaLabel: 'Follow Rumor'
    };
  }

  if (!state.journalEntryIds.includes('second-bluewake-pulse')) {
    return {
      title: 'Compare the Bluewake Reading',
      description: 'Glass Harbor wants confirmation that a second pulse matches the first impossible timestamp.',
      destinationId: 'bluewake',
      actionView: 'map',
      ctaLabel: 'Plot Course'
    };
  }

  return {
    title: 'Two Notes Want a Thread',
    description: 'Your journal has enough clues to compare the pulse events without forcing an answer.',
    actionView: 'journal',
    ctaLabel: 'Review Journal'
  };
};

export const getLeadDestinationName = (lead: CurrentLead) =>
  lead.destinationId ? getSystem(lead.destinationId).name : 'Journal';
