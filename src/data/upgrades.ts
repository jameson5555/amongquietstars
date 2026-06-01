import type { ShipUpgrade } from '../types/game';

export const shipUpgrades: ShipUpgrade[] = [
  {
    id: 'expanded-sensors',
    name: 'Expanded Sensors',
    description: 'More patient instruments for small, unlikely readings.',
    cost: 120,
    installed: false
  },
  {
    id: 'long-range-antenna',
    name: 'Long-Range Antenna',
    description: 'A fold-out antenna for catching soft voices from far lanes.',
    cost: 150,
    installed: false
  },
  {
    id: 'sample-analyzer',
    name: 'Sample Analyzer',
    description: 'A tidy bench for dust, spores, frost, and things that pretend to be dust.',
    cost: 135,
    installed: false
  },
  {
    id: 'quiet-drive-tuning',
    name: 'Quiet Drive Tuning',
    description: 'A smoother field cycle for shorter waits between distant lights.',
    cost: 210,
    installed: false
  },
  {
    id: 'larger-fuel-tank',
    name: 'Larger Fuel Tank',
    description: 'A practical comfort: a little farther before the warning light.',
    cost: 180,
    installed: false
  },
  {
    id: 'cozy-cabin',
    name: 'Cozy Cabin Improvements',
    description: 'Better blankets, warmer lamps, and storage that stops rattling.',
    cost: 90,
    installed: false
  }
];
