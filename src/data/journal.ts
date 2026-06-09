import type { JournalEntry } from '../types/game';

export const journalEntries: JournalEntry[] = [
  {
    id: 'pulse-at-vela',
    title: 'Brief Pulse at Vela Rest',
    category: 'Stellar Phenomena',
    observation:
      'A narrow pulse crossed the instruments while the local star remained visually calm. The timestamp is exact enough to make the sensors worth checking twice.',
    location: 'Vela Rest',
    relatedDiscoveries: ['second-bluewake-pulse'],
    status: 'Under Review'
  },
  {
    id: 'dust-lanterns',
    title: 'Luminous Dust Lanterns',
    category: 'Planetary Notes',
    observation:
      'Microscopic dust clusters brightened around the ship wake, then dimmed in sequence like tiny porch lights answering one another.',
    location: 'Marrowlight',
    relatedDiscoveries: ['soft-wake'],
    status: 'New'
  },
  {
    id: 'buoy-repeat',
    title: 'Survey Buoy Repeat Packet',
    category: 'Signals',
    observation:
      'Buoy 12 returned the same packet three times with identical timing but slightly different background noise, as if the message crossed three different rooms.',
    location: 'Vela Rest',
    relatedDiscoveries: ['pulse-at-vela'],
    status: 'Unresolved'
  },
  {
    id: 'quiet-moon-shadow',
    title: 'Quiet Moon Shadow',
    category: 'Unresolved Patterns',
    observation:
      'A small moon held a perfect radio shadow even when the ship moved out of its line. The silence felt measured, not empty.',
    location: 'Tallow Star',
    relatedDiscoveries: ['radio-melody'],
    status: 'New'
  },
  {
    id: 'dock-list',
    title: 'Lumen Rest Errand List',
    category: 'Traveler Reports',
    observation:
      'Delivered tea, fuses, and a packet of star charts between docks. Small work has a way of making the map feel inhabited.',
    location: 'Lumen Rest',
    relatedDiscoveries: [],
    status: 'Connected'
  },
  {
    id: 'radio-melody',
    title: 'Three-Note Radio Melody',
    category: 'Signals',
    observation:
      'A repeating three-note phrase surfaced beneath normal chatter. It was too soft for a distress call and too orderly for static.',
    location: 'Orison Belt',
    relatedDiscoveries: ['buoy-repeat'],
    status: 'Under Review'
  },
  {
    id: 'misplaced-star',
    title: 'Out-of-Place Star',
    category: 'Stellar Phenomena',
    observation:
      'A background star appeared one chart-width to the left on old station glass, then matched the modern chart after the lights flickered.',
    location: 'Glass Harbor',
    relatedDiscoveries: ['second-bluewake-pulse'],
    status: 'Unresolved'
  },
  {
    id: 'soft-wake',
    title: 'Soft Wake',
    category: 'Biological Oddities',
    observation:
      'The wake behind the ship formed pale curls that drifted against local current. The pattern relaxed when the engine idled.',
    location: 'Pale Current',
    relatedDiscoveries: ['dust-lanterns'],
    status: 'New'
  },
  {
    id: 'kites-rumor',
    title: "Traveler's Rumor",
    category: 'Traveler Reports',
    observation:
      'A survey cook at Kite\'s End heard two scientists argue about simultaneous readings from stars too distant to share a cause.',
    location: "Kite's End",
    relatedDiscoveries: ['pulse-at-vela', 'second-bluewake-pulse'],
    status: 'Under Review'
  },
  {
    id: 'second-bluewake-pulse',
    title: 'Second Pulse at Bluewake',
    category: 'Unresolved Patterns',
    observation:
      'Bluewake produced a pulse matching Vela Rest within the margin of error. The log calls it impossible, then quietly saves the file anyway.',
    location: 'Bluewake',
    relatedDiscoveries: ['pulse-at-vela', 'kites-rumor'],
    status: 'Connected'
  },
  {
    id: 'pulse-comparison',
    title: 'Synchronized Pulse Comparison',
    category: 'Unresolved Patterns',
    observation:
      'The Vela Rest and Bluewake traces share the same shape and timestamp despite the distance between them. An old Glass Harbor catalog uses the same timing mark.',
    location: 'Ship Journal',
    relatedDiscoveries: ['pulse-at-vela', 'second-bluewake-pulse', 'misplaced-star'],
    status: 'Connected'
  },
  {
    id: 'tow-note',
    title: 'Emergency Tow Receipt',
    category: 'Traveler Reports',
    observation:
      'A tow beacon answered before the fuel readout finished flashing. Someone has kept the old safety network alive.',
    location: 'Lumen Rest',
    relatedDiscoveries: [],
    status: 'Connected'
  }
];

export const getJournalEntry = (entryId: string): JournalEntry | undefined =>
  journalEntries.find((entry) => entry.id === entryId);
