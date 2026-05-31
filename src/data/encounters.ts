import type { Encounter } from '../types/game';

export const encounters: Encounter[] = [
  {
    id: 'brief-pulse',
    title: 'Brief Pulse',
    systemId: 'vela-rest',
    description:
      'A clean line of light taps the sensor graph and vanishes. Outside the window, Vela Rest remains ordinary and gold.',
    choices: [
      {
        id: 'log-carefully',
        label: 'Log the timestamp',
        resultText: 'You mark the moment in your journal and save the raw instrument trace.',
        journalEntryIds: ['pulse-at-vela'],
        radioMessageIds: ['vela-pulse'],
        mysteryDelta: 1
      },
      {
        id: 'ask-radio',
        label: 'Ask the local channel',
        resultText: 'A researcher answers too quickly, then pretends not to be worried.',
        journalEntryIds: ['pulse-at-vela'],
        radioMessageIds: ['vela-pulse'],
        mysteryDelta: 1
      }
    ]
  },
  {
    id: 'luminous-dust',
    title: 'Luminous Dust',
    systemId: 'marrowlight',
    description:
      'Dust blooms around the ship in warm flecks. Each mote catches your cabin light and returns it a shade brighter.',
    choices: [
      {
        id: 'collect-sample',
        label: 'Collect a gentle sample',
        resultText: 'The sample jar glows softly enough to read beside.',
        resourceDelta: { supplies: -2, credits: 18 },
        journalEntryIds: ['dust-lanterns']
      },
      {
        id: 'sketch-cloud',
        label: 'Sketch the cloud',
        resultText: 'Your journal page looks like a field of tiny lanterns.',
        journalEntryIds: ['dust-lanterns']
      }
    ]
  },
  {
    id: 'research-buoy',
    title: 'Research Buoy',
    systemId: 'vela-rest',
    description:
      'Buoy 12 blinks beside the lane, patient and dented. It offers the same packet three times, each with a different silence behind it.',
    choices: [
      {
        id: 'repair-buoy',
        label: 'Patch the antenna',
        resultText: 'The buoy steadies, thanks you with a cheerful ping, and sends a cleaner copy.',
        resourceDelta: { supplies: -3, credits: 28 },
        journalEntryIds: ['buoy-repeat'],
        radioMessageIds: ['packet-three']
      },
      {
        id: 'copy-data',
        label: 'Copy the packet',
        resultText: 'You store all three copies and leave the buoy humming to itself.',
        journalEntryIds: ['buoy-repeat'],
        radioMessageIds: ['packet-three']
      }
    ]
  },
  {
    id: 'quiet-moon',
    title: 'Quiet Moon',
    systemId: 'tallow-star',
    description:
      'A moon the color of old candle wax blocks every channel as you pass, even the cabin clock tick.',
    choices: [
      {
        id: 'drift-silent',
        label: 'Drift through the hush',
        resultText: 'You let the ship coast. The silence ends all at once, like a held breath released.',
        journalEntryIds: ['quiet-moon-shadow'],
        radioMessageIds: ['soft-lanes']
      },
      {
        id: 'ping-moon',
        label: 'Send one soft ping',
        resultText: 'The ping returns folded around a sound you did not send.',
        journalEntryIds: ['quiet-moon-shadow'],
        mysteryDelta: 1
      }
    ]
  },
  {
    id: 'station-errand',
    title: 'Station Errand',
    systemId: 'lumen-rest',
    description:
      'Lumen Rest is short on small kindnesses: tea filters for Dock C, fuses for the greenhouse, and a chart packet for an old pilot.',
    choices: [
      {
        id: 'run-errands',
        label: 'Run the errands',
        resultText: 'By the end, three strangers know your ship by name.',
        resourceDelta: { supplies: -1, credits: 35 },
        journalEntryIds: ['dock-list'],
        radioMessageIds: ['tea-delivery']
      },
      {
        id: 'trade-stories',
        label: 'Trade stories instead',
        resultText: 'You leave with a lighter schedule and a better sense of the lanes.',
        resourceDelta: { credits: 12 },
        radioMessageIds: ['good-stars']
      }
    ]
  },
  {
    id: 'radio-melody',
    title: 'Radio Melody',
    systemId: 'orison-belt',
    description:
      'Under survey chatter, three notes repeat at the edge of hearing. The ship lights dim in time, then recover.',
    choices: [
      {
        id: 'record-melody',
        label: 'Record the phrase',
        resultText: 'The waveform looks plain until you turn it sideways.',
        journalEntryIds: ['radio-melody'],
        radioMessageIds: ['radio-hum'],
        mysteryDelta: 1
      },
      {
        id: 'filter-static',
        label: 'Filter the static',
        resultText: 'The melody almost disappears, then returns clearer than before.',
        journalEntryIds: ['radio-melody'],
        radioMessageIds: ['radio-hum']
      }
    ]
  },
  {
    id: 'out-of-place-star',
    title: 'Out-of-Place Star',
    systemId: 'glass-harbor',
    description:
      'A station window labels one star wrong. When you compare your chart, the mistake is yours for half a second.',
    choices: [
      {
        id: 'photograph-glass',
        label: 'Photograph the glass',
        resultText: 'The image catches the old label, the modern chart, and a small reflection of your face.',
        journalEntryIds: ['misplaced-star'],
        radioMessageIds: ['outer-lanes']
      },
      {
        id: 'ask-dockmaster',
        label: 'Ask the dockmaster',
        resultText: 'They say the harbor glass remembers weather. They do not laugh after saying it.',
        journalEntryIds: ['misplaced-star'],
        radioMessageIds: ['outer-lanes'],
        mysteryDelta: 1
      }
    ]
  },
  {
    id: 'soft-wake',
    title: 'Soft Wake',
    systemId: 'pale-current',
    description:
      'Your engine wake curls behind the ship in pale ribbons, moving against the current with unhurried grace.',
    choices: [
      {
        id: 'idle-engines',
        label: 'Idle the engines',
        resultText: 'The ribbons loosen, then settle into a shape like a question mark.',
        resourceDelta: { fuel: 2 },
        journalEntryIds: ['soft-wake']
      },
      {
        id: 'follow-curl',
        label: 'Follow the curl',
        resultText: 'The wake guides you through a smoother lane and saves a little fuel.',
        resourceDelta: { fuel: 4 },
        journalEntryIds: ['soft-wake'],
        unlockSystemIds: ['tallow-star']
      }
    ]
  },
  {
    id: 'travelers-rumor',
    title: "Traveler's Rumor",
    systemId: 'kites-end',
    description:
      'At the canteen, a survey cook swears two labs saw the same star-pulse from impossible distances.',
    choices: [
      {
        id: 'buy-soup',
        label: 'Buy soup and listen',
        resultText: 'The cook draws two circles on a napkin and taps them at the same time.',
        resourceDelta: { credits: -8, supplies: 3 },
        journalEntryIds: ['kites-rumor'],
        radioMessageIds: ['rumor-thread'],
        unlockSystemIds: ['bluewake']
      },
      {
        id: 'share-chart',
        label: 'Share your chart',
        resultText: 'Someone marks Bluewake for you, then asks you not to mention who did it.',
        journalEntryIds: ['kites-rumor'],
        radioMessageIds: ['rumor-thread'],
        unlockSystemIds: ['bluewake']
      }
    ]
  },
  {
    id: 'second-pulse',
    title: 'Second Pulse',
    systemId: 'bluewake',
    description:
      'Bluewake flashes across your instruments in the exact shape you saved at Vela Rest. The ship is very quiet afterward.',
    choices: [
      {
        id: 'compare-logs',
        label: 'Compare both logs',
        resultText: 'The timestamps align. The margin of error has nowhere comfortable to hide.',
        journalEntryIds: ['second-bluewake-pulse', 'pulse-at-vela'],
        radioMessageIds: ['bluewake-match'],
        mysteryDelta: 2
      },
      {
        id: 'send-anonymous',
        label: 'Send anonymous data',
        resultText: 'A lab replies with a single word: again?',
        journalEntryIds: ['second-bluewake-pulse'],
        radioMessageIds: ['bluewake-match'],
        mysteryDelta: 2
      }
    ]
  }
];

export const getEncounter = (encounterId: string): Encounter | undefined =>
  encounters.find((encounter) => encounter.id === encounterId);
