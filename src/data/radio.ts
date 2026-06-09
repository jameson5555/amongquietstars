import type { RadioMessage } from '../types/game';

export const radioMessages: RadioMessage[] = [
  {
    id: 'good-stars',
    source: 'Route Tender Mallow',
    text: 'Quiet route tonight. Good stars.',
    tone: 'ambient'
  },
  {
    id: 'vela-pulse',
    source: 'Survey Team Aster',
    text: 'Anyone else catch that pulse near Vela Rest?',
    tone: 'mystery'
  },
  {
    id: 'packet-three',
    source: 'Research Buoy Relay',
    text: 'Survey buoy 12 just sent the same packet three times.',
    tone: 'mystery'
  },
  {
    id: 'outer-lanes',
    source: 'Glass Harbor Dockmaster',
    text: 'Dockmaster says the outer lanes have been shimmering again.',
    tone: 'ambient'
  },
  {
    id: 'tea-delivery',
    source: 'Lumen Rest Galley',
    text: 'Bless whoever brought the tea filters. Dock C owes you a pastry.',
    tone: 'job'
  },
  {
    id: 'radio-hum',
    source: 'Orison Listening Crew',
    text: 'There is a tune under the static. Nobody whistle it back yet.',
    tone: 'mystery'
  },
  {
    id: 'tow-safe',
    source: 'Emergency Tow Net',
    text: 'Beacon received. Sit tight, traveler. We have you.',
    tone: 'safety'
  },
  {
    id: 'bluewake-match',
    source: 'Bluewake Lab Annex',
    text: 'The timestamp matches Vela Rest. That cannot be right.',
    tone: 'mystery'
  },
  {
    id: 'soft-lanes',
    source: 'Freighter Keepsake',
    text: 'Engines sound softer out here. Like the dark has curtains.',
    tone: 'ambient'
  },
  {
    id: 'rumor-thread',
    source: 'Kite\'s End Canteen',
    text: 'Two readings, same shape, same breath. That is what the cook says, anyway.',
    tone: 'mystery'
  },
  {
    id: 'lantern-shift',
    source: 'Marrowlight Cargo Skiff',
    text: 'Lantern dust is bright tonight. Keep your intake filters closed and enjoy the view.',
    tone: 'ambient'
  },
  {
    id: 'late-tea',
    source: 'Lumen Rest Night Galley',
    text: 'Last kettle is on until the morning shift. Dock quietly and there may still be a cup.',
    tone: 'ambient'
  },
  {
    id: 'current-weather',
    source: 'Pale Current Lane Keeper',
    text: 'Lane weather is gentle, with a little silver wake along the western markers.',
    tone: 'ambient'
  },
  {
    id: 'kite-post',
    source: 'Kite\'s End Shuttle',
    text: 'Cargo is light, letters are heavy, and we are somehow late in both directions.',
    tone: 'ambient'
  },
  {
    id: 'orison-ice',
    source: 'Orison Survey Tender',
    text: 'Ice is singing near marker six. Probably thermal stress. Probably.',
    tone: 'ambient'
  }
];

export const defaultRadioIds = ['good-stars', 'outer-lanes', 'soft-lanes'];
export const ambientRadioIds = ['lantern-shift', 'late-tea', 'current-weather', 'kite-post', 'orison-ice'];

export const getRadioMessage = (messageId: string): RadioMessage | undefined =>
  radioMessages.find((message) => message.id === messageId);
