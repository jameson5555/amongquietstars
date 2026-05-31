import type { StarSystem } from '../types/game';

export const STARTING_SYSTEM_ID = 'lumen-rest';

export const systems: StarSystem[] = [
  {
    id: 'lumen-rest',
    name: 'Lumen Rest',
    distance: 0,
    travelCost: 0,
    tags: ['Station', 'Quiet Zone'],
    known: true,
    description: 'A modest waystation with warm docks, patient mechanics, and windows full of slow sunrise.',
    encounterIds: ['station-errand'],
    position: { x: 48, y: 68 }
  },
  {
    id: 'vela-rest',
    name: 'Vela Rest',
    distance: 2,
    travelCost: 8,
    tags: ['Signal', 'Survey Site'],
    known: true,
    description: 'A gentle yellow star watched by old survey equipment and sleepy research crews.',
    encounterIds: ['brief-pulse', 'research-buoy'],
    position: { x: 34, y: 48 }
  },
  {
    id: 'marrowlight',
    name: 'Marrowlight',
    distance: 3,
    travelCost: 10,
    tags: ['Anomaly'],
    known: true,
    description: 'A coppery system where dust catches light in long, lantern-colored ribbons.',
    encounterIds: ['luminous-dust'],
    position: { x: 62, y: 38 }
  },
  {
    id: 'pale-current',
    name: 'Pale Current',
    distance: 4,
    travelCost: 12,
    tags: ['Quiet Zone'],
    known: true,
    description: 'A calm lane of thin plasma currents where engines sound softer than they should.',
    encounterIds: ['soft-wake'],
    position: { x: 22, y: 27 }
  },
  {
    id: 'kites-end',
    name: "Kite's End",
    distance: 5,
    travelCost: 15,
    tags: ['Station', 'Survey Site'],
    known: true,
    description: 'A little edge-station tied to its moon by cargo shuttles and old family stories.',
    encounterIds: ['travelers-rumor'],
    position: { x: 75, y: 60 }
  },
  {
    id: 'orison-belt',
    name: 'Orison Belt',
    distance: 6,
    travelCost: 16,
    tags: ['Signal'],
    known: true,
    description: 'A belt of soft ice and bright mineral seams where radio waves linger strangely.',
    encounterIds: ['radio-melody'],
    position: { x: 43, y: 18 }
  },
  {
    id: 'bluewake',
    name: 'Bluewake',
    distance: 7,
    travelCost: 18,
    tags: ['Anomaly', 'Survey Site'],
    known: false,
    description: 'A blue-white star behind a wavering veil, visible only after following local reports.',
    encounterIds: ['second-pulse'],
    position: { x: 83, y: 28 }
  },
  {
    id: 'tallow-star',
    name: 'Tallow Star',
    distance: 5,
    travelCost: 14,
    tags: ['Quiet Zone'],
    known: false,
    description: 'An amber star with a slow, waxy glow and almost no registered traffic.',
    encounterIds: ['quiet-moon'],
    position: { x: 58, y: 82 }
  },
  {
    id: 'glass-harbor',
    name: 'Glass Harbor',
    distance: 8,
    travelCost: 20,
    tags: ['Station', 'Signal'],
    known: false,
    description: 'A listening post built into transparent stone, rumored to sing during meteor showers.',
    encounterIds: ['out-of-place-star'],
    position: { x: 16, y: 77 }
  },
  {
    id: 'ember-shoal',
    name: 'Ember Shoal',
    distance: 9,
    travelCost: 22,
    tags: ['Anomaly'],
    known: false,
    description: 'A scattered nursery of red motes, half starfield and half campfire.',
    encounterIds: ['soft-wake', 'luminous-dust'],
    position: { x: 88, y: 76 }
  }
];

export const getSystem = (systemId: string): StarSystem =>
  systems.find((system) => system.id === systemId) ?? systems.find((system) => system.id === STARTING_SYSTEM_ID)!;
